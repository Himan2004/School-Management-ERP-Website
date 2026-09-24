import mongoose from 'mongoose';
import Payroll from '../../models/finance/Payroll.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import User from '../../models/users/user.model.js';

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/payroll/staff?school_id=&month=&year=
// FIX: month arrives zero-padded ("07") — parseInt handles it fine.
// FIX: net for staff without a slip should never be negative.
// ─────────────────────────────────────────────────────────────
export const getAccountantPayrollStaff = async (req, res) => {
    try {
        const { school_id, month, year } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }
        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        const staff = await User.find({
            school: new mongoose.Types.ObjectId(school_id),
            role: { $in: ['teacher', 'admin', 'accountant', 'support_staff'] },
        }).select('name employeeId role');

        const staffWithPayroll = await Promise.all(
            staff.map(async (s) => {
                const payroll = await Payroll.findOne({ staffId: s._id, isActive: true });
                const baseSalary = payroll?.basicSalary || 0;
                const defaultPF = baseSalary * 0.12;

                let salarySlip = null;
                if (month && year) {
                    salarySlip = await SalarySlip.findOne({
                        staffId: s._id,
                        month: parseInt(month, 10),
                        year: parseInt(year, 10),
                    });
                }

                return {
                    id          : s.employeeId || s._id.toString().slice(-6),
                    rawId       : s._id,
                    name        : s.name,
                    role        : s.role,
                    base        : salarySlip ? salarySlip.basicSalary   : baseSalary,
                    ot          : salarySlip ? salarySlip.overtimeHours : 0,
                    otAmount    : salarySlip ? salarySlip.overtimeAmount : 0,
                    bonus       : salarySlip ? salarySlip.bonusAmount    : 0,
                    deductions  : salarySlip ? salarySlip.totalDeductions : defaultPF,
                    net         : salarySlip
                        ? salarySlip.netSalary
                        : Math.max(0, baseSalary - defaultPF),  // never negative
                    hasSlip     : !!salarySlip,
                    slipId      : salarySlip?._id || null,
                    paymentStatus: salarySlip?.paymentStatus || 'none',
                    date        : salarySlip?.createdAt || new Date(),
                };
            })
        );

        return res.status(200).json({ success: true, data: staffWithPayroll });
    } catch (error) {
        console.error('getAccountantPayrollStaff:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/accountant/payroll/process
// FIX: school comes from req.user.school, not query param.
// FIX: upsert — if a slip already exists for same staff/month/year,
//      replace it so "recalculate" works instead of failing with a
//      duplicate-key error.
// ─────────────────────────────────────────────────────────────
export const processAccountantPayroll = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // FIX: prefer req.user.school so the route doesn't need school_id in body/query
        const schoolObjectId = req.user?.school?._id || req.user?.school
            || (req.query.school_id ? new mongoose.Types.ObjectId(req.query.school_id) : null);

        if (!schoolObjectId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'School could not be determined from session' });
        }

        const {
            staffId, month, year,
            totalWorkingDays = 26,
            daysPresent = 26,
            overtimeHours = 0,
            bonusAmount = 0,
            paymentMode = 'bank_transfer',
            remarks,
        } = req.body;

        if (!staffId || !month || !year) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'staffId, month, year are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid staffId' });
        }

        // ── Payroll config (auto-seed if missing) ─────────────
        let payrollConfig = await Payroll.findOne({
            staffId: new mongoose.Types.ObjectId(staffId),
            isActive: true,
        }).session(session);

        if (!payrollConfig) {
            const staffUser = await User.findById(staffId).session(session);
            if (!staffUser) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Staff user not found' });
            }

            const school = await mongoose.model('School').findById(schoolObjectId).session(session);
            const organizationId = school?.organization || req.user?.school?.organization;
            if (!organizationId) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Organization could not be determined' });
            }

            const created = await Payroll.create([{
                organization   : organizationId,
                school         : schoolObjectId,
                staffId        : new mongoose.Types.ObjectId(staffId),
                staffRole      : staffUser.role,
                basicSalary    : 45000,
                allowances     : [
                    { name: 'HRA', amount: 5000, isTaxable: true },
                    { name: 'TA',  amount: 2000, isTaxable: true },
                ],
                deductions     : [{
                    name: 'PF', deductionType: 'percentage',
                    value: 12, appliesOn: 'basic', isEmployerContribution: false,
                }],
                paymentMode    : 'bank_transfer',
                effectiveFrom  : new Date(),
                isActive       : true,
                createdBy      : req.user?._id,
            }], { session });
            payrollConfig = created[0];
        }

        // ── Calculations ──────────────────────────────────────
        const daysAbsent       = Math.max(0, totalWorkingDays - daysPresent);
        const absentDeduction  = (payrollConfig.basicSalary / totalWorkingDays) * daysAbsent;
        const overtimeAmount   = overtimeHours * (payrollConfig.overtimeRatePerHour || 300);
        const totalAllowances  = (payrollConfig.allowances || []).reduce((s, a) => s + a.amount, 0);
        const payableBasic     = payrollConfig.basicSalary - absentDeduction;
        const grossEarnings    = payrollConfig.basicSalary + totalAllowances + overtimeAmount + Number(bonusAmount);

        const finalizedDeductions = (payrollConfig.deductions || [])
            .filter((d) => !d.isEmployerContribution)
            .map((d) => {
                const base   = d.appliesOn === 'basic' ? payableBasic : grossEarnings;
                const amount = d.deductionType === 'percentage' ? (base * d.value) / 100 : d.value;
                return { name: d.name, amount: amount || 0, isEmployerContribution: false };
            });

        const statutoryDeductions = finalizedDeductions.reduce((s, d) => s + d.amount, 0);
        const totalDeductions     = statutoryDeductions + absentDeduction;
        const netSalary           = Math.max(0, grossEarnings - totalDeductions);

        // ── Upsert slip (prevents duplicate-key on recalculate) ─
        const slipFilter = {
            school  : schoolObjectId,
            staffId : new mongoose.Types.ObjectId(staffId),
            month   : parseInt(month, 10),
            year    : parseInt(year, 10),
        };

        const salarySlip = await SalarySlip.findOneAndUpdate(
            slipFilter,
            {
                $set: {
                    organization   : payrollConfig.organization,
                    payrollId      : payrollConfig._id,
                    totalWorkingDays,
                    daysPresent,
                    daysAbsent,
                    overtimeHours  : overtimeHours || 0,
                    basicSalary    : payrollConfig.basicSalary,
                    payableBasic,
                    allowances     : payrollConfig.allowances,
                    overtimeAmount,
                    bonusAmount    : Number(bonusAmount) || 0,
                    grossEarnings,
                    deductions     : finalizedDeductions,
                    absentDeduction,
                    totalDeductions,
                    netSalary,
                    paymentStatus  : 'draft',
                    paymentMode    : paymentMode || 'bank_transfer',
                    generatedBy    : req.user?._id,
                    remarks        : remarks || null,
                    updatedAt      : new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, session }
        );

        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            message: 'Salary slip generated successfully',
            data   : salarySlip,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('processAccountantPayroll:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/accountant/payroll/salary-slip/:id
// Supports paymentStatus updates AND advance salary fields.
// ─────────────────────────────────────────────────────────────
export const updateAccountantSalarySlip = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid salary slip id' });
        }

        const {
            paymentStatus, paymentDate, paymentReference,
            // advance salary fields
            advanceAmount, advanceReason, repaymentMonths, remarks,
        } = req.body;

        const updatePayload = {
            updatedAt: new Date(),
        };

        if (paymentStatus) {
            updatePayload.paymentStatus   = paymentStatus;
            updatePayload.paymentDate     = paymentDate ? new Date(paymentDate) : new Date();
            updatePayload.paymentReference = paymentReference || null;
            updatePayload.approvedBy      = req.user?._id;
            updatePayload.approvedAt      = new Date();
        }

        // ── Advance salary: record on slip as an extra deduction ─
        if (advanceAmount && Number(advanceAmount) > 0) {
            updatePayload.advanceAmount    = Number(advanceAmount);
            updatePayload.advanceReason    = advanceReason || null;
            updatePayload.repaymentMonths  = Number(repaymentMonths) || 1;
            updatePayload.remarks          = remarks || null;
        }

        if (remarks && !advanceAmount) {
            updatePayload.remarks = remarks;
        }

        const salarySlip = await SalarySlip.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            { new: true }
        );

        if (!salarySlip) {
            return res.status(404).json({ success: false, message: 'Salary slip not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Salary slip updated successfully',
            data   : salarySlip,
        });
    } catch (error) {
        console.error('updateAccountantSalarySlip:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/payroll/salary-slips
// FIX: school from req.user.school (no school_id query needed if
//      auth middleware already attaches school).
//      Still supports school_id param for backward compat.
// ─────────────────────────────────────────────────────────────
export const getAccountantSalarySlips = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school || req.query.school_id;
        const { month, year, page = 1, limit = 50 } = req.query;

        if (!schoolId || !month || !year) {
            return res.status(400).json({ success: false, message: 'school, month, year are required' });
        }

        const query = {
            school: new mongoose.Types.ObjectId(String(schoolId)),
            month : parseInt(month, 10),
            year  : parseInt(year, 10),
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [salarySlips, total] = await Promise.all([
            SalarySlip.find(query)
                .populate('staffId', 'name employeeId role')
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SalarySlip.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                salarySlips,
                pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
            },
        });
    } catch (error) {
        console.error('getAccountantSalarySlips:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/accountant/payroll/bank-transfer-report
// FIX: school from req.user.school; still reads body.school_id
//      as fallback so existing clients keep working.
// ─────────────────────────────────────────────────────────────
export const generateAccountantBankTransferReport = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school || req.body.school_id;
        const { month, year } = req.body;

        if (!schoolId || !month || !year) {
            return res.status(400).json({ success: false, message: 'school, month, and year are required' });
        }

        const salarySlips = await SalarySlip.find({
            school       : new mongoose.Types.ObjectId(String(schoolId)),
            month        : parseInt(month, 10),
            year         : parseInt(year, 10),
            paymentStatus: 'approved',
        }).populate('staffId', 'name employeeId');

        if (!salarySlips?.length) {
            return res.status(200).json({
                success: false,
                message : 'No approved salary slips found for this period',
                data    : [],
            });
        }

        const report = salarySlips.map((slip) => ({
            'Account Name'        : slip.staffId?.name || 'Unknown',
            'Employee ID'         : slip.staffId?.employeeId || 'N/A',
            'Bank Account'        : 'XXXXXXXXXXXX',
            'Branch Code'         : 'SBIN0001',
            'Disbursement Amount' : Math.round(slip.netSalary),
        }));

        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error('generateAccountantBankTransferReport:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
