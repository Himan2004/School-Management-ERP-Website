import mongoose from 'mongoose';
import User from '../../models/users/user.model.js';
import Student from '../../models/users/student.model.js';
import FeePayment from '../../models/finance/FeePayment.model.js';
import FeeInstallment from '../../models/finance/FeeInstallment.model.js';
import Expense from '../../models/finance/Expense.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import Period from '../../models/modules/Period.js';
import SchoolAcademicConfiguration from '../../models/school/SchoolAcademicConfiguration.js';
import { getAcademicYearQuery, normalizeClassDisplay } from '../../utils/autoAssignFeeStructure.js';

/**
 * GET /api/accountant/reports/summary
 * Get financial summary report
 */
export const getAccountantFinancialSummary = async (req, res) => {
    try {
        const { school_id, year = new Date().getFullYear() } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = new mongoose.Types.ObjectId(school_id);
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Total revenue from fees
        const revenue = await FeePayment.aggregate([
            {
                $match: {
                    school: schoolId,
                    paymentDate: { $gte: startOfYear, $lte: endOfYear },
                    paymentStatus: 'success'
                }
            },
            { $group: { _id: null, total: { $sum: '$totalCollected' } } }
        ]);

        // Total expenses
        const expenses = await Expense.aggregate([
            {
                $match: {
                    school: schoolId,
                    expenseDate: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Total payroll
        const payroll = await SalarySlip.aggregate([
            {
                $match: {
                    school: schoolId,
                    createdAt: { $gte: startOfYear, $lte: endOfYear },
                    paymentStatus: 'paid'
                }
            },
            { $group: { _id: null, total: { $sum: '$netSalary' } } }
        ]);

        // Outstanding fees
        const outstanding = await FeeInstallment.aggregate([
            { $match: { school: schoolId, status: 'active', totalDue: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } }
        ]);

        const totalRevenue = revenue[0]?.total || 0;
        const totalExpenses = (expenses[0]?.total || 0) + (payroll[0]?.total || 0);
        const profit = totalRevenue - totalExpenses;

        // Transaction count
        const transactionCount = await FeePayment.countDocuments({
            school: schoolId,
            paymentDate: { $gte: startOfYear, $lte: endOfYear },
            paymentStatus: 'success'
        });

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalExpenses,
                profit,
                outstandingFees: outstanding[0]?.total || 0,
                payrollTotal: payroll[0]?.total || 0,
                transactions: transactionCount
            }
        });

    } catch (error) {
        console.error('Error in getAccountantFinancialSummary:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/reports/class-wise-dues
 * Get class-wise due report using Student and Period models
 */
export const getAccountantClassWiseDues = async (req, res) => {
    try {
        const { school_id } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = new mongoose.Types.ObjectId(school_id);

        const activeConfig = await SchoolAcademicConfiguration.findOne({ schoolId, isCurrent: true }).lean();
        const currentYear = activeConfig ? activeConfig.academicYear : null;

        const matchQuery = {
            school: schoolId,
            status: 'active',
            totalDue: { $gt: 0 }
        };
        if (currentYear) {
            matchQuery.academicYear = getAcademicYearQuery(currentYear);
        }

        // Get dues aggregated by class & section on the Student profile
        const duesByClass = await FeeInstallment.aggregate([
            {
                $match: matchQuery
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: 'user',
                    as: 'studentProfile'
                }
            },
            { $unwind: '$studentProfile' },
            {
                $match: {
                    'studentProfile.school': schoolId,
                    'studentProfile.status': 'active'
                }
            },
            {
                $group: {
                    _id: {
                        classId: '$studentProfile.class',
                        sectionId: '$studentProfile.section'
                    },
                    totalDue: { $sum: '$totalDue' },
                    studentCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: '_id.classId',
                    foreignField: '_id',
                    as: 'classDetails'
                }
            },
            { $unwind: '$classDetails' },
            {
                $lookup: {
                    from: 'sections',
                    localField: '_id.sectionId',
                    foreignField: '_id',
                    as: 'sectionDetails'
                }
            },
            { $unwind: '$sectionDetails' }
        ]);

        const classWiseDues = duesByClass.map(d => {
            const className = d.classDetails?.name || '';
            const sectionName = d.sectionDetails?.name || '';
            const totalDue = d.totalDue;
            
            let status = 'Moderate';
            if (totalDue > 500000) status = 'Critical';
            else if (totalDue > 100000) status = 'High';

            const classLabel = normalizeClassDisplay(className, sectionName);

            return {
                class: classLabel,
                classId: String(d._id.classId),
                sectionId: String(d._id.sectionId),
                amount: totalDue,
                status,
                studentCount: d.studentCount
            };
        }).sort((a, b) => b.amount - a.amount);

        return res.status(200).json({
            success: true,
            data: classWiseDues
        });

    } catch (error) {
        console.error('Error in getAccountantClassWiseDues:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/reports/monthly-trend
 * Get monthly profit trend
 */
export const getAccountantMonthlyTrend = async (req, res) => {
    try {
        const { school_id, year = new Date().getFullYear() } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const monthlyData = [];

        for (let i = 0; i < 12; i++) {
            const startDate = new Date(year, (3 + i) % 12, 1);
            const endDate = new Date(year, (3 + i) % 12 + 1, 0);

            const revenue = await FeePayment.aggregate([
                {
                    $match: {
                        school: new mongoose.Types.ObjectId(school_id),
                        paymentDate: { $gte: startDate, $lte: endDate },
                        paymentStatus: 'success'
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalCollected' } } }
            ]);

            const expenses = await Expense.aggregate([
                {
                    $match: {
                        school: new mongoose.Types.ObjectId(school_id),
                        expenseDate: { $gte: startDate, $lte: endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const payroll = await SalarySlip.aggregate([
                {
                    $match: {
                        school: new mongoose.Types.ObjectId(school_id),
                        createdAt: { $gte: startDate, $lte: endDate },
                        paymentStatus: 'paid'
                    }
                },
                { $group: { _id: null, total: { $sum: '$netSalary' } } }
            ]);

            const totalRevenue = revenue[0]?.total || 0;
            const totalExpenses = (expenses[0]?.total || 0) + (payroll[0]?.total || 0);
            const profit = totalRevenue - totalExpenses;

            monthlyData.push({
                month: months[i],
                revenue: totalRevenue,
                profit
            });
        }

        return res.status(200).json({
            success: true,
            data: monthlyData
        });

    } catch (error) {
        console.error('Error in getAccountantMonthlyTrend:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/reports/payroll-summary
 * Get payroll summary by department
 */
export const getAccountantPayrollSummary = async (req, res) => {
    try {
        const { school_id, month, year } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const matchQuery = { school: new mongoose.Types.ObjectId(school_id) };
        
        if (month && year) {
            matchQuery.month = parseInt(month);
            matchQuery.year = parseInt(year);
        }

        const payrollSummary = await SalarySlip.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'users',
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staff'
                }
            },
            { $unwind: '$staff' },
            {
                $group: {
                    _id: '$staff.role',
                    totalAmount: { $sum: '$netSalary' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedSummary = payrollSummary.map(p => ({
            dept: p._id === 'teacher' ? 'Teachers' : p._id === 'admin' ? 'Admin' : 'Support Staff',
            amount: p.totalAmount,
            count: p.count
        }));

        return res.status(200).json({
            success: true,
            data: formattedSummary
        });

    } catch (error) {
        console.error('Error in getAccountantPayrollSummary:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/reports/top-dues
 * Get classes with highest dues mapping correctly to Period/Student profiles
 */
export const getAccountantTopDues = async (req, res) => {
    try {
        const { school_id } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const topDues = await FeeInstallment.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(school_id), totalDue: { $gt: 0 } } },
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: 'user',
                    as: 'studentProfile'
                }
            },
            { $unwind: '$studentProfile' },
            {
                $lookup: {
                    from: 'periods',
                    localField: 'studentProfile.class',
                    foreignField: '_id',
                    as: 'classPeriod'
                }
            },
            { $unwind: '$classPeriod' },
            {
                $group: {
                    _id: {
                        classId: '$studentProfile.class',
                        gradeLevel: '$classPeriod.gradeLevel',
                        section: '$classPeriod.section'
                    },
                    totalDue: { $sum: '$totalDue' }
                }
            },
            { $sort: { totalDue: -1 } },
            { $limit: 5 }
        ]);

        const formattedDues = topDues.map(d => {
            const totalDue = d.totalDue;
            let status = 'Low';
            if (totalDue > 500000) status = 'Critical';
            else if (totalDue > 300000) status = 'High';
            else if (totalDue > 100000) status = 'Medium';
            
            return {
                class: `Class ${d._id.gradeLevel} - ${d._id.section}`,
                amount: totalDue,
                status
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedDues
        });

    } catch (error) {
        console.error('Error in getAccountantTopDues:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/reports/export
 * Export financial report
 */
export const exportAccountantFinancialReport = async (req, res) => {
    try {
        const { school_id, startDate, endDate, reportType } = req.body;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const query = { school: new mongoose.Types.ObjectId(school_id) };
        
        if (startDate && endDate) {
            const dateField = reportType === 'fees' ? 'paymentDate' : reportType === 'expenses' ? 'expenseDate' : 'createdAt';
            query[dateField] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        let data = [];

        if (reportType === 'fees') {
            const payments = await FeePayment.find(query)
                .populate('studentId', 'name')
                .lean();

            const userIds = payments.map(p => p.studentId?._id).filter(Boolean);
            const studentProfiles = await Student.find({ user: { $in: userIds } })
                .populate('class', 'gradeLevel section')
                .lean();

            const profileMap = {};
            studentProfiles.forEach(sp => {
                if (sp.user) {
                    profileMap[String(sp.user)] = sp;
                }
            });

            data = payments.map(p => {
                const profile = profileMap[String(p.studentId?._id)];
                return {
                    'Receipt Number': p.receiptNumber || 'N/A',
                    'Student Name': p.studentId?.name || 'Unknown',
                    'Class': profile?.class ? `Class ${profile.class.gradeLevel} - ${profile.class.section}` : 'N/A',
                    'Academic Year': p.academicYear || 'N/A',
                    'Payment Mode': p.paymentMode ? p.paymentMode.toUpperCase() : 'N/A',
                    'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : 'N/A',
                    'Amount Paid (₹)': p.amountPaid || 0,
                    'Late Fee Paid (₹)': p.lateFeePaid || 0,
                    'GST Paid (₹)': p.gstAmount || 0,
                    'Total Collected (₹)': p.totalCollected || 0,
                    'Status': p.paymentStatus ? p.paymentStatus.toUpperCase() : 'SUCCESS'
                };
            });
        } else if (reportType === 'expenses') {
            const expenses = await Expense.find(query).lean();
            data = expenses.map(e => ({
                'Expense Date': e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-GB') : 'N/A',
                'Title/Name': e.title || 'N/A',
                'Category': e.category || 'N/A',
                'Amount (₹)': e.amount || 0,
                'Payment Method': e.paymentMethod ? e.paymentMethod.toUpperCase() : 'N/A',
                'Reference/Invoice': e.referenceNumber || 'N/A',
                'Description': e.description || ''
            }));
        } else if (reportType === 'payroll') {
            const slips = await SalarySlip.find(query)
                .populate('staffId', 'name email role')
                .lean();
            data = slips.map(s => ({
                'Payslip Number': s.payslipNumber || 'N/A',
                'Staff Name': s.staffId?.name || 'Unknown',
                'Role': s.staffId?.role ? s.staffId.role.toUpperCase() : 'N/A',
                'Month/Year': `${s.month}/${s.year}`,
                'Basic Salary (₹)': s.basicSalary || 0,
                'Allowances (₹)': s.allowances || 0,
                'Deductions (₹)': s.deductions || 0,
                'Net Salary (₹)': s.netSalary || 0,
                'Payment Date': s.paymentDate ? new Date(s.paymentDate).toLocaleDateString('en-GB') : 'N/A',
                'Payment Mode': s.paymentMode ? s.paymentMode.toUpperCase() : 'N/A',
                'Status': s.paymentStatus ? s.paymentStatus.toUpperCase() : 'PAID'
            }));
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error in exportAccountantFinancialReport:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};