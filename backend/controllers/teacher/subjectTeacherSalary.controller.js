import SalarySlip from "../../models/finance/Salaryslip.model.js";
import Payroll from "../../models/finance/Payroll.model.js";
import User from "../../models/users/user.model.js";
import mongoose from "mongoose";

/**
 * Helper to retrieve all matching User ObjectIds for the logged-in teacher
 * supporting name variations (e.g., hyphenated vs space-separated names).
 */
const getMatchingUserIds = async (user) => {
    if (!user) return [];
    
    const ids = [new mongoose.Types.ObjectId(user._id)];
    
    if (user.name) {
        const nameQuery = user.name.replace("-", " ").trim();
        const nameRegex = new RegExp(`^${nameQuery.replace(/\s+/g, "[- ]")}$`, "i");
        const matchingUsers = await User.find({ name: nameRegex });
        
        matchingUsers.forEach(u => {
            const idStr = u._id.toString();
            if (!ids.some(existingId => existingId.toString() === idStr)) {
                ids.push(new mongoose.Types.ObjectId(u._id));
            }
        });
    }
    return ids;
};

/**
 * @desc    Get Salary Summary for the logged-in subject teacher
 * @route   GET /api/subject-teacher/salary/summary
 * @access  Private (Teacher)
 */
export const getSalarySummary = async (req, res) => {
    try {
        const userIds = await getMatchingUserIds(req.user);
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({
                success: false,
                message: "School or Organization information is missing from session"
            });
        }

        // Find the active payroll configuration (isolated by organization and school)
        const payroll = await Payroll.findOne({
            organization: new mongoose.Types.ObjectId(organizationId),
            school: new mongoose.Types.ObjectId(schoolId),
            staffId: { $in: userIds },
            isActive: true
        });
        const currentSalary = payroll ? payroll.netSalary : 0;

        // Fetch all salary slips (isolated by organization and school)
        const slips = await SalarySlip.find({
            organization: new mongoose.Types.ObjectId(organizationId),
            school: new mongoose.Types.ObjectId(schoolId),
            staffId: { $in: userIds }
        }).sort({ year: 1, month: 1 });

        let totalEarned = 0;
        let totalPaid = 0;
        let pendingPayments = 0;
        let totalDeductions = 0;
        let paymentCount = 0;
        let upcomingPayments = 0;

        slips.forEach(slip => {
            if (['paid', 'approved', 'draft'].includes(slip.paymentStatus)) {
                totalEarned += Number(slip.netSalary);
            }
            if (slip.paymentStatus === 'paid') {
                totalPaid += Number(slip.netSalary);
                paymentCount++;
            }
            if (['draft', 'approved', 'held'].includes(slip.paymentStatus)) {
                pendingPayments += Number(slip.netSalary);
                upcomingPayments++;
            }
            totalDeductions += Number(slip.totalDeductions || 0);
        });

        // Construct breakdown
        let breakdown = {
            basic: 0,
            hra: 0,
            da: 0,
            ta: 0,
            medical: 0,
            education: 0,
            special: 0,
            bonus: 0,
            incentives: 0,
            overtime: 0,
            pf: 0,
            tax: 0,
            insurance: 0,
            others: 0
        };

        if (payroll) {
            breakdown.basic = Number(payroll.basicSalary);
            payroll.allowances.forEach(allowance => {
                const name = allowance.name.toLowerCase();
                const amount = Number(allowance.amount);
                if (name.includes('hra') || name.includes('rent')) breakdown.hra += amount;
                else if (name.includes('da') || name.includes('dearness')) breakdown.da += amount;
                else if (name.includes('ta') || name.includes('travel') || name.includes('transport')) breakdown.ta += amount;
                else if (name.includes('medical') || name.includes('health')) breakdown.medical += amount;
                else if (name.includes('education')) breakdown.education += amount;
                else breakdown.special += amount;
            });

            payroll.deductions.forEach(deduction => {
                const name = deduction.name.toLowerCase();
                let amount = 0;
                if (deduction.deductionType === 'percentage') {
                    const base = deduction.appliesOn === 'basic' ? Number(payroll.basicSalary) : Number(payroll.grossSalary);
                    amount = (base * Number(deduction.value)) / 100;
                } else {
                    amount = Number(deduction.value);
                }

                if (name.includes('pf') || name.includes('provident')) breakdown.pf += amount;
                else if (name.includes('tax') || name.includes('tds')) breakdown.tax += amount;
                else if (name.includes('insurance') || name.includes('mediclaim')) breakdown.insurance += amount;
                else breakdown.others += amount;
            });
        }

        const lastSlip = slips.length > 0 ? slips[slips.length - 1] : null;
        if (!payroll && lastSlip) {
            breakdown.basic = Number(lastSlip.basicSalary);
            lastSlip.allowances.forEach(allowance => {
                const name = allowance.name.toLowerCase();
                const amount = Number(allowance.amount);
                if (name.includes('hra') || name.includes('rent')) breakdown.hra += amount;
                else if (name.includes('da') || name.includes('dearness')) breakdown.da += amount;
                else if (name.includes('ta') || name.includes('travel') || name.includes('transport')) breakdown.ta += amount;
                else if (name.includes('medical') || name.includes('health')) breakdown.medical += amount;
                else if (name.includes('education')) breakdown.education += amount;
                else breakdown.special += amount;
            });
            breakdown.bonus = Number(lastSlip.bonusAmount || 0);
            breakdown.overtime = Number(lastSlip.overtimeAmount || 0);

            lastSlip.deductions.forEach(deduction => {
                const name = deduction.name.toLowerCase();
                const amount = Number(deduction.amount);
                if (name.includes('pf') || name.includes('provident')) breakdown.pf += amount;
                else if (name.includes('tax') || name.includes('tds')) breakdown.tax += amount;
                else if (name.includes('insurance') || name.includes('mediclaim')) breakdown.insurance += amount;
                else breakdown.others += amount;
            });
        }

        res.status(200).json({
            success: true,
            data: {
                currentSalary,
                totalEarned,
                totalPaid,
                pendingPayments,
                netPayable: pendingPayments,
                totalDeductions,
                paymentCount,
                upcomingPayments,
                breakdown
            }
        });
    } catch (error) {
        console.error('getSalarySummary:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch salary summary",
            error: error.message
        });
    }
};

/**
 * @desc    Get complete payout history of logged in teacher
 * @route   GET /api/subject-teacher/salary/history
 * @access  Private (Teacher)
 */
export const getSalaryHistory = async (req, res) => {
    try {
        const userIds = await getMatchingUserIds(req.user);
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({
                success: false,
                message: "School or Organization information is missing from session"
            });
        }

        const { page = 1, limit = 10, search, month, year, status } = req.query;

        // Apply strict organization & school filters
        const query = {
            organization: new mongoose.Types.ObjectId(organizationId),
            school: new mongoose.Types.ObjectId(schoolId),
            staffId: { $in: userIds }
        };

        if (month) query.month = parseInt(month, 10);
        if (year) query.year = parseInt(year, 10);
        if (status) query.paymentStatus = status;

        if (search) {
            query.$or = [
                { paymentReference: { $regex: search, $options: 'i' } },
                { remarks: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const limitNum = parseInt(limit, 10);

        const slips = await SalarySlip.find(query)
            .sort({ year: -1, month: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('approvedBy', 'name');

        const total = await SalarySlip.countDocuments(query);

        // Map database schema to frontend expected fields
        const data = slips.map(slip => {
            const taxDeduction = slip.deductions.find(d => d.name.toLowerCase() === 'tax' || d.name.toLowerCase() === 'tds' || d.name.toLowerCase() === 'professional tax');
            
            return {
                id: slip._id,
                _id: slip._id,
                paymentDate: slip.paymentDate || slip.createdAt,
                month: slip.month,
                year: slip.year,
                grossSalary: Number(slip.grossEarnings || 0),
                basicSalary: Number(slip.basicSalary || 0),
                allowances: slip.allowances,
                bonus: Number(slip.bonusAmount || 0),
                overtime: Number(slip.overtimeAmount || 0),
                incentives: 0,
                deductions: slip.deductions,
                tax: taxDeduction ? Number(taxDeduction.amount || 0) : 0,
                netSalary: Number(slip.netSalary || 0),
                paymentStatus: slip.paymentStatus,
                transactionId: slip.paymentReference || '—',
                paymentMethod: slip.paymentMode || '—',
                remarks: slip.remarks || '',
                processedBy: slip.approvedBy?.name || 'Accountant',
                createdAt: slip.createdAt,
                updatedAt: slip.updatedAt,
                slipUrl: slip.slipUrl || ''
            };
        });

        res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('getSalaryHistory:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch salary history",
            error: error.message
        });
    }
};

/**
 * @desc    Get salary analytics for logged-in teacher
 * @route   GET /api/subject-teacher/salary/analytics
 * @access  Private (Teacher)
 */
export const getSalaryAnalytics = async (req, res) => {
    try {
        const userIds = await getMatchingUserIds(req.user);
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({
                success: false,
                message: "School or Organization information is missing from session"
            });
        }

        const matchStage = {
            organization: new mongoose.Types.ObjectId(organizationId),
            school: new mongoose.Types.ObjectId(schoolId),
            staffId: { $in: userIds },
            paymentStatus: { $in: ['paid', 'approved', 'draft'] }
        };

        const monthlyStats = await SalarySlip.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { month: "$month", year: "$year" },
                    earnings: { $sum: "$grossEarnings" },
                    deductions: { $sum: "$totalDeductions" },
                    payouts: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$netSalary", 0] } }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const yearlyStats = await SalarySlip.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$year",
                    earnings: { $sum: "$grossEarnings" },
                    deductions: { $sum: "$totalDeductions" },
                    payouts: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$netSalary", 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const trends = monthlyStats.map(item => ({
            name: `${monthsName[item._id.month - 1]} ${item._id.year}`,
            label: `${monthsName[item._id.month - 1]} ${item._id.year}`,
            earnings: Number(item.earnings || 0),
            deductions: Number(item.deductions || 0),
            payouts: Number(item.payouts || 0),
            monthNum: item._id.month,
            year: item._id.year
        }));

        res.status(200).json({
            success: true,
            data: {
                trends,
                yearlySummary: yearlyStats.map(item => ({
                    year: item._id,
                    earnings: Number(item.earnings || 0),
                    deductions: Number(item.deductions || 0),
                    payouts: Number(item.payouts || 0)
                }))
            }
        });
    } catch (error) {
        console.error('getSalaryAnalytics:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch salary analytics",
            error: error.message
        });
    }
};
