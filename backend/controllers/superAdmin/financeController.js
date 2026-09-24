import Expense from "../../models/finance/Expense.model.js";
import FeePayment from "../../models/finance/FeePayment.model.js";
import Payroll from "../../models/finance/Payroll.model.js";
import SalarySlip from "../../models/finance/Salaryslip.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import FeeHead from "../../models/finance/FeeHead.model.js";
import Organization from "../../models/organization/Organization.js";
import Class from "../../models/organization/organizationClass.js";
import School from "../../models/school/School.js"; // 🔥 Added missing import
import mongoose from "mongoose";

// =======================
// EXPENSE OVERSIGHT (CRUD)
// =======================

export const createExpense = async (req, res) => {
    try {
        const expense = new Expense({ ...req.body, recordedBy: req.user._id });
        await expense.save();
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllExpenses = async (req, res) => {
    try {
        const filter = req.query.school ? { school: req.query.school } : {};
        const expenses = await Expense.find(filter)
            .populate("school", "name")
            .populate("recordedBy", "name");
        res.status(200).json({ success: true, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id)
            .populate("school", "name")
            .populate("recordedBy", "name");
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        res.status(200).json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        res.status(200).json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        res.status(200).json({ success: true, message: "Expense deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// =======================
// FEE PAYMENT OVERSIGHT
// =======================

export const getAllFeePayments = async (req, res) => {
    try {
        const filter = req.query.school ? { school: req.query.school } : {};
        const payments = await FeePayment.find(filter)
            .populate("school", "name")
            .populate("studentId", "name rollNumber")
            .populate("collectedBy", "name");
        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// =======================
// FEE HEADS AND CLASSES
// =======================

export const getFeeHeads = async (req, res) => {
    try {
        const queryOrgId = req.query.organizationId;
        const userOrgId = req.user?.organization?._id || req.user?.organization;
        const fallbackOrgId = req.user?.organizationId;
        const organizationId = [queryOrgId, userOrgId, fallbackOrgId].find(
            (id) => id && mongoose.Types.ObjectId.isValid(id)
        );

        if (queryOrgId && !mongoose.Types.ObjectId.isValid(queryOrgId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid organizationId",
            });
        }

        const filter = organizationId
            ? { organization: organizationId, isActive: true }
            : { isActive: true };

        const feeHeads = await FeeHead.find(filter)
            .sort({ name: 1 })
            .lean();

        res.status(200).json({ success: true, data: feeHeads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createFeeHead = async (req, res) => {
    try {
        const { name, description, feeType, isOptional, isInstallmentable, organization } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Fee head name is required" });
        }

        const bodyOrgId = organization && mongoose.Types.ObjectId.isValid(organization)
            ? organization
            : null;
        const userOrgId = req.user?._id || (req.user?.organization?._id || req.user?.organization);
        const organizationId = bodyOrgId || (mongoose.Types.ObjectId.isValid(userOrgId) ? userOrgId : null);

        if (!organizationId) {
            return res.status(400).json({ success: false, message: "Valid organizationId is required" });
        }

        const orgExists = await Organization.findById(organizationId);
        if (!orgExists) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        const existing = await FeeHead.findOne({ organization: organizationId, name: name.trim() });
        if (existing) {
            return res.status(409).json({ success: false, message: "Fee head already exists" });
        }

        const feeHead = new FeeHead({
            organization: organizationId,
            name: name.trim(),
            description,
            feeType,
            isOptional,
            isInstallmentable,
            createdBy: req.user?._id,
        });

        await feeHead.save();
        res.status(201).json({ success: true, data: feeHead });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOrganizationClasses = async (req, res) => {
    try {
        let { organizationId } = req.params;

        if (!organizationId || organizationId === "undefined") {
            organizationId = req.user?.organization || req.user?._id;
        }

        let classes = [];

        if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
            classes = await Class.find({
                $or: [
                    { organization: organizationId },
                    { organization: { $exists: false } },
                    { organization: null }
                ]
            }).sort({ numericLevel: 1 }).lean();
        }

        if (!classes || classes.length === 0) {
            classes = await Class.find({}).sort({ numericLevel: 1 }).lean();
        }

        const formattedClasses = classes.map(c => ({
            ...c,
            name: c.className || c.name || "Unknown Class"
        }));

        res.status(200).json({ success: true, data: formattedClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// =======================
// PAYROLL OVERSIGHT (CRUD)
// =======================

export const createPayroll = async (req, res) => {
    try {
        const payroll = new Payroll(req.body);
        await payroll.save();
        res.status(201).json({ success: true, data: payroll });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllPayrolls = async (req, res) => {
    try {
        const filter = req.query.school ? { school: req.query.school } : {};
        const payrolls = await Payroll.find(filter).populate("school", "name");
        res.status(200).json({ success: true, data: payrolls });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id).populate("school", "name");
        if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
        res.status(200).json({ success: true, data: payroll });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
        res.status(200).json({ success: true, data: payroll });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findByIdAndDelete(req.params.id);
        if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
        res.status(200).json({ success: true, message: "Payroll deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// =======================
// SALARY SLIP OVERSIGHT (CRUD)
// =======================

export const createSalarySlip = async (req, res) => {
    try {
        const salarySlip = new SalarySlip(req.body);
        await salarySlip.save();
        res.status(201).json({ success: true, data: salarySlip });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllSalarySlips = async (req, res) => {
    try {
        const filter = req.query.school ? { school: req.query.school } : {};
        const salarySlips = await SalarySlip.find(filter)
            .populate("school", "name")
            .populate("employee", "name employeeId");
        res.status(200).json({ success: true, data: salarySlips });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSalarySlipById = async (req, res) => {
    try {
        const salarySlip = await SalarySlip.findById(req.params.id)
            .populate("school", "name")
            .populate("employee", "name employeeId");
        if (!salarySlip) return res.status(404).json({ success: false, message: "Salary Slip not found" });
        res.status(200).json({ success: true, data: salarySlip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSalarySlip = async (req, res) => {
    try {
        const salarySlip = await SalarySlip.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!salarySlip) return res.status(404).json({ success: false, message: "Salary Slip not found" });
        res.status(200).json({ success: true, data: salarySlip });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteSalarySlip = async (req, res) => {
    try {
        const salarySlip = await SalarySlip.findByIdAndDelete(req.params.id);
        if (!salarySlip) return res.status(404).json({ success: false, message: "Salary Slip not found" });
        res.status(200).json({ success: true, message: "Salary Slip deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// =======================
// SYSTEM FULL FINANCE ANALYTICS
// =======================

export const getFinanceAnalytics = async (req, res) => {
    try {
        // ✅ Same fix as pendingDues — req.user IS the Organization document
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));

        const filter = { organization: orgId };

        // ✅ Only schools under this org
        const orgSchools = await School.find({ organization: orgId }).select("schoolName name _id");
        const allSchools = orgSchools.map(s => s.schoolName || s.name).filter(Boolean);

        let selectedSchoolId = null;
        if (req.query.school && req.query.school !== "All Schools") {
        const schoolObj = orgSchools.find(s => 
            s.name === req.query.school || s.schoolName === req.query.school
        );
        if (schoolObj) {
            selectedSchoolId = schoolObj._id;
            filter.school = selectedSchoolId;
        }
        }

        // ✅ Only classes under this org — no bad fallback
        const classesObj = await Class.find({ organization: orgId }).select("className name");
        const allClasses = classesObj.map(c => c.className || c.name).filter(Boolean);


        // ════════ EVERYTHING BELOW THIS LINE IS UNTOUCHED ════════
        
        const [totalExpensesAggr, totalFeePaymentsAggr, totalDuesAggr] = await Promise.all([
            Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            FeePayment.aggregate([{ $match: { ...filter, paymentStatus: 'success' } }, { $group: { _id: null, total: { $sum: "$amountPaid" } } }]),
            FeeInstallment.aggregate([{ $match: { ...filter, status: { $in: ['active', 'defaulted'] } } }, { $group: { _id: null, totalDue: { $sum: "$totalDue" } } }])
        ]);

        const totalExpense = totalExpensesAggr.length > 0 ? totalExpensesAggr[0].total : 0;
        const totalRevenue = totalFeePaymentsAggr.length > 0 ? totalFeePaymentsAggr[0].total : 0;
        const outstandingDues = totalDuesAggr.length > 0 ? totalDuesAggr[0].totalDue : 0;
        
        const expectedRevenue = totalRevenue + outstandingDues;
        const netProfit = totalRevenue - totalExpense;

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [cmExp, lmExp, cmRev, lmRev, cmDues, lmDues] = await Promise.all([
            Expense.aggregate([{ $match: { ...filter, expenseDate: { $gte: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$amount" } } }]),
            Expense.aggregate([{ $match: { ...filter, expenseDate: { $gte: lastMonthStart, $lt: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$amount" } } }]),
            FeePayment.aggregate([{ $match: { ...filter, paymentStatus: 'success', paymentDate: { $gte: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$amountPaid" } } }]),
            FeePayment.aggregate([{ $match: { ...filter, paymentStatus: 'success', paymentDate: { $gte: lastMonthStart, $lt: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$amountPaid" } } }]),
            FeeInstallment.aggregate([{ $match: { ...filter, status: { $in: ['active', 'defaulted'] }, createdAt: { $gte: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$totalDue" } } }]),
            FeeInstallment.aggregate([{ $match: { ...filter, status: { $in: ['active', 'defaulted'] }, createdAt: { $gte: lastMonthStart, $lt: currentMonthStart } } }, { $group: { _id: null, t: { $sum: "$totalDue" } } }])
        ]);

        const calcGrowth = (cm, lm) => {
            const c = cm[0]?.t || 0;
            const l = lm[0]?.t || 0;
            if (l === 0) return c > 0 ? 100 : 0;
            return ((c - l) / l) * 100;
        };

        const cmExpected = (cmRev[0]?.t || 0) + (cmDues[0]?.t || 0);
        const lmExpected = (lmRev[0]?.t || 0) + (lmDues[0]?.t || 0);
        const expectedGrowth = lmExpected === 0 ? (cmExpected > 0 ? 100 : 0) : ((cmExpected - lmExpected) / lmExpected) * 100;

        const cmProfit = (cmRev[0]?.t || 0) - (cmExp[0]?.t || 0);
        const lmProfit = (lmRev[0]?.t || 0) - (lmExp[0]?.t || 0);
        const profitGrowth = lmProfit === 0 ? (cmProfit > 0 ? 100 : (cmProfit < 0 ? -100 : 0)) : ((cmProfit - lmProfit) / Math.abs(lmProfit)) * 100;

        const growth = {
            totalExpense: calcGrowth(cmExp, lmExp),
            totalRevenue: calcGrowth(cmRev, lmRev),
            outstandingDues: calcGrowth(cmDues, lmDues),
            expectedRevenue: expectedGrowth,
            netProfit: profitGrowth
        };

        const incomeByMonth = await FeePayment.aggregate([
            { $match: { ...filter, paymentStatus: 'success' } },
            { $group: { _id: { $month: "$paymentDate" }, income: { $sum: "$amountPaid" } } }
        ]);

        const expenseByMonth = await Expense.aggregate([
            { $match: filter },
            { $group: { _id: { $month: "$expenseDate" }, expense: { $sum: "$amount" } } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = months.map((month, index) => {
            const inc = incomeByMonth.find(i => i._id === index + 1);
            const exp = expenseByMonth.find(e => e._id === index + 1);
            return { name: month, income: inc ? inc.income : 0, expense: exp ? exp.expense : 0 };
        });

        const expenseCategoryAggr = await Expense.aggregate([
            { $match: filter },
            { $group: { _id: "$category", value: { $sum: "$amount" } } }
        ]);
        const expenseBreakdown = expenseCategoryAggr.map(item => ({
            name: item._id, amount: item.value
        }));

        const dynamicFeeBreakdownAggr = await FeePayment.aggregate([
            { $match: { ...filter, paymentStatus: 'success' } },
            { $lookup: { from: "feeinstallments", localField: "feeInstallmentId", foreignField: "_id", as: "installment" } },
            { $unwind: "$installment" },
            { $lookup: { from: "feestructures", localField: "installment.feeStructureId", foreignField: "_id", as: "structure" } },
            { $unwind: "$structure" },
            { $unwind: "$structure.feeLines" },
            { $lookup: { from: "feeheads", localField: "structure.feeLines.feeHeadId", foreignField: "_id", as: "head" } },
            { $unwind: "$head" },
            {
                $project: {
                    headName: "$head.name",
                    amountAllocated: {
                        $cond: [
                            { $gt: ["$structure.totalAmount", 0] },
                            { $multiply: [ "$amountPaid", { $divide: ["$structure.feeLines.amount", "$structure.totalAmount"] } ] },
                            0
                        ]
                    }
                }
            },
            { $group: { _id: "$headName", value: { $sum: "$amountAllocated" } } },
            { $project: { _id: 1, value: { $round: ["$value", 2] } } }
        ]);

        const standardColors = ['#4F46E5', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6', '#8B5CF6'];
        const feeBreakdown = dynamicFeeBreakdownAggr.map((item, idx) => ({
            name: item._id, value: item.value, color: standardColors[idx % standardColors.length]
        }));

        // 1. Calculate school-specific metrics (branchData)
        const branchData = [];
        for (const school of orgSchools) {
            const schoolId = school._id;
            const schoolFilter = { ...filter, school: schoolId };

            const [schoolRevAggr, schoolExpAggr, schoolDuesAggr] = await Promise.all([
                FeePayment.aggregate([{ $match: { ...schoolFilter, paymentStatus: 'success' } }, { $group: { _id: null, total: { $sum: "$amountPaid" } } }]),
                Expense.aggregate([{ $match: schoolFilter }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
                FeeInstallment.aggregate([{ $match: { ...schoolFilter, status: { $in: ['active', 'defaulted'] } } }, { $group: { _id: null, totalDue: { $sum: "$totalDue" } } }])
            ]);

            const schoolRev = schoolRevAggr[0]?.total || 0;
            const schoolExp = schoolExpAggr[0]?.total || 0;
            const schoolDues = schoolDuesAggr[0]?.totalDue || 0;
            const schoolProfit = schoolRev - schoolExp;
            const expected = schoolRev + schoolDues;
            const colRate = expected > 0 ? Math.round((schoolRev / expected) * 100) : 0;

            branchData.push({
                name: school.schoolName || school.name || "Unknown Branch",
                revenue: schoolRev,
                expenses: schoolExp,
                profit: schoolProfit,
                colRate: colRate,
                outDues: schoolDues
            });
        }

        // 2. Calculate paymentMode distribution (paymentDistribution)
        const paymentModeAggr = await FeePayment.aggregate([
            { $match: { ...filter, paymentStatus: 'success' } },
            { $group: { _id: "$paymentMode", value: { $sum: "$amountPaid" } } }
        ]);

        const modeLabels = {
            cash: "Cash",
            upi: "UPI",
            net_banking: "Bank Transfer",
            card: "Card",
            cheque: "Cheque",
            demand_draft: "Demand Draft",
            online_portal: "Gateway"
        };

        const paymentDistribution = paymentModeAggr.map(item => ({
            name: modeLabels[item._id] || item._id,
            value: item.value || 0
        }));

        // 3. Get recent activities (recentActivity)
        const [recentPayments, recentExpenses] = await Promise.all([
            FeePayment.find({ ...filter, paymentStatus: 'success' })
                .sort({ paymentDate: -1 })
                .limit(5)
                .populate("studentId", "name"),
            Expense.find(filter)
                .sort({ expenseDate: -1 })
                .limit(5)
        ]);

        const activities = [
            ...recentPayments.map(p => ({
                date: p.paymentDate,
                type: "Fee Collected",
                amount: `₹${p.amountPaid.toLocaleString("en-IN")}`,
                desc: `Fees collected for ${p.studentId?.name || "Student"} via ${modeLabels[p.paymentMode] || p.paymentMode}`,
                rawDate: p.paymentDate
            })),
            ...recentExpenses.map(e => ({
                date: e.expenseDate,
                type: "Expense Recorded",
                amount: `₹${e.amount.toLocaleString("en-IN")}`,
                desc: `${e.title} (${e.category})`,
                rawDate: e.expenseDate
            }))
        ];

        const recentActivity = activities
            .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
            .slice(0, 5)
            .map(act => {
                const actDate = new Date(act.date);
                const today = new Date();
                const diffTime = Math.abs(today - actDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let dateStr = "";
                if (actDate.toDateString() === today.toDateString()) {
                    dateStr = `Today ${actDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else if (diffDays <= 1) {
                    dateStr = "Yesterday";
                } else {
                    dateStr = `${diffDays} days ago`;
                }

                return {
                    date: dateStr,
                    type: act.type,
                    amount: act.amount,
                    desc: act.desc
                };
            });

        res.status(200).json({
            success: true,
            data: {
                totals: { expectedRevenue, totalRevenue, totalExpense, outstandingDues, netProfit },
                growth, monthlyData, expenseBreakdown, feeBreakdown, branchData, paymentDistribution, recentActivity,
                filters: { schools: allSchools.sort(), classes: allClasses.sort() }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};