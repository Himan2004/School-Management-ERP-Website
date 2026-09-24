import FeePayment from "../../models/finance/FeePayment.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import mongoose from "mongoose";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

/**
 * @desc    Get finance dashboard statistics for school admin
 * @route   GET /api/admin/finance/dashboard-stats
 * @access  Private (Admin)
 */
export const getFinanceDashboardStats = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        
        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: "School context not found for admin"
            });
        }

        let now = new Date();
        const { month, year } = req.query;
        if (month && year) {
            const parsedMonth = parseInt(month);
            const parsedYear = parseInt(year);
            if (!isNaN(parsedMonth) && !isNaN(parsedYear) && parsedMonth >= 1 && parsedMonth <= 12) {
                now = new Date(parsedYear, parsedMonth - 1, 15);
            }
        }
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const previousMonthStart = startOfMonth(subMonths(now, 1));
        const previousMonthEnd = endOfMonth(subMonths(now, 1));

        const schoolFilter = { school: new mongoose.Types.ObjectId(schoolId) };

        // 1. Calculate KPIs for Current and Previous Months for Trends
        const [currentStats, previousStats, outstandingStats, studentCountStats, paymentMethodsAggr] = await Promise.all([
            // Current Month Fees & Fines
            FeePayment.aggregate([
                { 
                    $match: { 
                        ...schoolFilter, 
                        paymentStatus: 'success',
                        paymentDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        totalFees: { $sum: "$amountPaid" },
                        totalFines: { $sum: "$lateFeePaid" }
                    } 
                }
            ]),
            // Previous Month Fees & Fines
            FeePayment.aggregate([
                { 
                    $match: { 
                        ...schoolFilter, 
                        paymentStatus: 'success',
                        paymentDate: { $gte: previousMonthStart, $lte: previousMonthEnd }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        totalFees: { $sum: "$amountPaid" },
                        totalFines: { $sum: "$lateFeePaid" }
                    } 
                }
            ]),
            // Total Outstanding & Student Count with Dues (Static snapshots for now as per common dashboard pattern)
            FeeInstallment.aggregate([
                { $match: { ...schoolFilter, status: { $in: ['active', 'defaulted'] } } },
                { 
                    $group: { 
                        _id: null, 
                        totalOutstanding: { $sum: "$totalDue" },
                        studentsWithDues: { $addToSet: "$studentId" }
                    } 
                }
            ]),
            // Helper for "Students Not Paid" count specifically
            FeeInstallment.countDocuments({ ...schoolFilter, totalDue: { $gt: 0 } }),
            // Payment Methods Breakdown (All time or recent? Usually all successful for the school context)
            FeePayment.aggregate([
                { $match: { ...schoolFilter, paymentStatus: 'success' } },
                { $group: { _id: "$paymentMode", count: { $sum: 1 } } }
            ])
        ]);

        const curr = currentStats[0] || { totalFees: 0, totalFines: 0 };
        const prev = previousStats[0] || { totalFees: 0, totalFines: 0 };
        const outstanding = outstandingStats[0] || { totalOutstanding: 0 };
        const totalStudentsWithDues = studentCountStats;

        // Calculate Trends
        const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? "+100%" : "0%";
            const diff = ((current - previous) / previous) * 100;
            return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
        };

        // Payment Methods Normalization (Online vs Cash vs Cheque)
        const onlineModes = ['upi', 'net_banking', 'card', 'online_portal'];
        let paymentBreakdown = { online: 0, cash: 0, cheque: 0, other: 0 };
        let totalPayments = 0;

        paymentMethodsAggr.forEach(item => {
            totalPayments += item.count;
            if (item._id === 'cash') paymentBreakdown.cash += item.count;
            else if (item._id === 'cheque' || item._id === 'demand_draft') paymentBreakdown.cheque += item.count;
            else if (onlineModes.includes(item._id)) paymentBreakdown.online += item.count;
            else paymentBreakdown.other += item.count;
        });

        const paymentMethodsPercentages = {
            online: totalPayments ? Math.round((paymentBreakdown.online / totalPayments) * 100) : 0,
            cash: totalPayments ? Math.round((paymentBreakdown.cash / totalPayments) * 100) : 0,
            cheque: totalPayments ? Math.round((paymentBreakdown.cheque / totalPayments) * 100) : 0
        };

        // Monthly Income Trend (Last 6 Months)
        const sixMonthsAgo = startOfMonth(subMonths(now, 5));
        const monthlyTrendAggr = await FeePayment.aggregate([
            { 
                $match: { 
                    ...schoolFilter, 
                    paymentStatus: 'success',
                    paymentDate: { $gte: sixMonthsAgo }
                } 
            },
            {
                $group: {
                    _id: { 
                        month: { $month: "$paymentDate" }, 
                        year: { $year: "$paymentDate" } 
                    },
                    amount: { $sum: { $add: ["$amountPaid", "$lateFeePaid"] } }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthNum = date.getMonth() + 1;
            const yearNum = date.getFullYear();
            const match = monthlyTrendAggr.find(m => m._id.month === monthNum && m._id.year === yearNum);
            monthlyTrend.push({
                month: format(date, "MMM"),
                amount: match ? match.amount : 0
            });
        }

        res.status(200).json({
            success: true,
            data: {
                kpis: {
                    totalFees: {
                        value: curr.totalFees,
                        trend: calculateTrend(curr.totalFees, prev.totalFees),
                        label: "Total Fees Collected"
                    },
                    fineCollected: {
                        value: curr.totalFines,
                        trend: calculateTrend(curr.totalFines, prev.totalFines),
                        label: "Fine Collected"
                    },
                    studentsNotPaid: {
                        value: totalStudentsWithDues,
                        trend: "0%", // Trend for count is complex, keeping neutral or comparing month-over-month active installments
                        label: "Students Not Paid"
                    },
                    totalOutstanding: {
                        value: outstanding.totalOutstanding,
                        trend: "0%", // Snapshot value
                        label: "Total Outstanding"
                    }
                },
                paymentMethods: paymentMethodsPercentages,
                monthlyTrend
            }
        });

    } catch (error) {
        console.error("Finance Dashboard Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


/**
 * @desc    Get fee records (pending/paid) for the table
 * @route   GET /api/admin/finance/fee-records
 * @access  Private (Admin)
 */
export const getFeeRecords = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        if (!schoolId) return res.status(400).json({ success: false, message: "School context not found" });

        const { type = 'pending', month, year, period = 'monthly' } = req.query;
        const schoolObjId = new mongoose.Types.ObjectId(schoolId);

        // Build date range based on period + month/year filters
        let dateFrom, dateTo;
        const now = new Date();
        const targetYear  = year  ? parseInt(year)  : now.getFullYear();
        const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

        if (period === 'yearly') {
            dateFrom = new Date(targetYear, 0, 1);        // Jan 1st of selected year
            dateTo   = new Date(targetYear, 11, 31, 23, 59, 59);  // Dec 31st
        } else if (period === '6months') {
            dateTo   = new Date(targetYear, targetMonth - 1, 31, 23, 59, 59);
            dateFrom = new Date(dateTo);
            dateFrom.setMonth(dateFrom.getMonth() - 5);
            dateFrom.setDate(1);
        } else {
            // monthly (default)
            dateFrom = new Date(targetYear, targetMonth - 1, 1);
            dateTo   = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        }

        if (type === 'pending') {
            // Students with pending dues
            const installments = await FeeInstallment.find({
                school: schoolObjId,
                totalDue: { $gt: 0 }
            })
            .populate({ path: 'studentId', model: 'User', select: 'name' })
            .lean();

            // Get student profiles for class/section
            const userIds = installments.map(i => i.studentId?._id).filter(Boolean);
            
            // Import StudentProfile at top of file if not already imported
            const StudentProfile = mongoose.model('Student');
            const profiles = await StudentProfile.find({ user: { $in: userIds } })
                .populate('class', 'name')
                .populate('section', 'name')
                .lean();
            
            const profileMap = {};
            profiles.forEach(p => { if (p.user) profileMap[String(p.user)] = p; });

            const records = installments.map((inst, i) => {
                const student = inst.studentId;
                if (!student) return null;
                const profile = profileMap[String(student._id)];
                
                // Find first overdue/due slot for due date
                const dueSlot = inst.installments?.find(s => s.status === 'due' || s.status === 'overdue')
                    || inst.installments?.[0];

                return {
                    id: String(student._id),
                    studentName: student.name || 'Unknown',
                    rollNo: profile?.rollNo || profile?.rollNumber || `STU${i+1}`,
                    class: profile?.class?.name || 'N/A',
                    section: profile?.section?.name || 'N/A',
                    feeType: inst.feeStructureId?.name || 'Tuition Fee',
                    dueDate: dueSlot?.dueDate
                        ? new Date(dueSlot.dueDate).toLocaleDateString('en-IN')
                        : 'N/A',
                    pendingAmount: inst.totalDue || 0,
                    status: 'Pending'
                };
            }).filter(Boolean);

            return res.status(200).json({ success: true, data: records });
        }

        if (type === 'paid') {
            // Students who paid in the date range
            const payments = await FeePayment.find({
                school: schoolObjId,
                paymentStatus: 'success',
                paymentDate: { $gte: dateFrom, $lte: dateTo }
            })
            .populate({ path: 'studentId', model: 'User', select: 'name' })
            .lean();

            const userIds = payments.map(p => p.studentId?._id).filter(Boolean);
            const StudentProfile = mongoose.model('Student');
            const profiles = await StudentProfile.find({ user: { $in: userIds } })
                .populate('class', 'name')
                .populate('section', 'name')
                .lean();
            
            const profileMap = {};
            profiles.forEach(p => { if (p.user) profileMap[String(p.user)] = p; });

            const records = payments.map(pay => {
                const student = pay.studentId;
                if (!student) return null;
                const profile = profileMap[String(student._id)];
                return {
                    id: String(student._id),
                    studentName: student.name || 'Unknown',
                    receiptNo: pay.receiptNumber || `RCP${String(pay._id).slice(-6)}`,
                    class: profile?.class?.name || 'N/A',
                    section: profile?.section?.name || 'N/A',
                    amount: pay.amountPaid || 0,
                    paymentDate: new Date(pay.paymentDate).toLocaleDateString('en-IN'),
                    paymentMethod: pay.paymentMode
                        ? pay.paymentMode.charAt(0).toUpperCase() + pay.paymentMode.slice(1)
                        : 'Cash',
                    status: 'Paid'
                };
            }).filter(Boolean);

            return res.status(200).json({ success: true, data: records });
        }

        return res.status(400).json({ success: false, message: 'Invalid type. Use pending or paid.' });

    } catch (error) {
        console.error("getFeeRecords Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
