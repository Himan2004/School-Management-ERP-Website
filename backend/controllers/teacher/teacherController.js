import SalarySlip from "../../models/finance/Salaryslip.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get all salary slips for the logged-in teacher
 * @route   GET /api/teacher/finance/salaries
 * @access  Private (Teacher)
 */
export const getTeacherSalaries = async (req, res) => {
    try {
        const teacherId = req.user._id;

        const salaries = await SalarySlip.find({ staffId: teacherId })
            .select("month year netSalary paymentStatus paymentDate paymentMode")
            .sort({ year: -1, month: -1 });

        res.status(200).json({
            success: true,
            count: salaries.length,
            data: salaries,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching salary history",
            error: error.message,
        });
    }
};

/**
 * @desc    Get detailed salary slip by ID
 * @route   GET /api/teacher/finance/salary/:id
 * @access  Private (Teacher)
 */
export const getDetailedSalarySlip = async (req, res) => {
    try {
        const salaryId = req.params.id;
        const teacherId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(salaryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid salary slip ID",
            });
        }

        const salarySlip = await SalarySlip.findOne({
            _id: salaryId,
            staffId: teacherId,
        }).populate("school", "name address logo");

        if (!salarySlip) {
            return res.status(404).json({
                success: false,
                message: "Salary slip not found or access denied",
            });
        }

        res.status(200).json({
            success: true,
            data: salarySlip,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching salary slip details",
            error: error.message,
        });
    }
};

/**
 * @desc    Get financial summary for the teacher dashboard
 * @route   GET /api/teacher/finance/summary
 * @access  Private (Teacher)
 */
export const getTeacherFinanceSummary = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const currentYear = new Date().getFullYear();

        // 1. Fetch all salary slips for the current year for total earnings
        const yearSlips = await SalarySlip.find({
            staffId: teacherId,
            year: currentYear,
            paymentStatus: "paid",
        });

        const totalEarningsYear = yearSlips.reduce((acc, slip) => acc + slip.netSalary, 0);

        // 2. Fetch the most recent paid salary slip
        const lastPaidSlip = await SalarySlip.findOne({
            staffId: teacherId,
            paymentStatus: "paid",
        }).sort({ year: -1, month: -1 });

        // 3. Last 6 months trend for chart visualization
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const trendData = await SalarySlip.aggregate([
            {
                $match: {
                    staffId: new mongoose.Types.ObjectId(teacherId),
                    paymentStatus: "paid",
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { month: "$month", year: "$year" },
                    amount: { $sum: "$netSalary" },
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalEarningsYear,
                lastMonthPaid: lastPaidSlip ? lastPaidSlip.netSalary : 0,
                lastMonthDate: lastPaidSlip ? { month: lastPaidSlip.month, year: lastPaidSlip.year } : null,
                paymentStatus: lastPaidSlip ? lastPaidSlip.paymentStatus : 'none',
                monthlyTrend: trendData.map(item => ({
                    month: item._id.month,
                    year: item._id.year,
                    amount: item.amount
                }))
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching financial summary",
            error: error.message,
        });
    }
};
