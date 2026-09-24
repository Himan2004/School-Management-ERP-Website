import mongoose from 'mongoose';
import User from '../../models/users/user.model.js';
import Payroll from '../../models/finance/Payroll.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import StaffLeave from '../../models/HRM/Staffleave.model.js';
import Resignation from '../../models/HRM/Resignation.model.js';

// Helper to resolve school and organization IDs
const getHrmContext = (req) => {
    const schoolId = req.user.school?._id || req.user.school;
    const organizationId = req.user.school?.organization?._id || req.user.school?.organization || req.user.organization;
    return { schoolId, organizationId };
};

// 1. Get salary structure/details for current admin
export const getSalaryDetails = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const payroll = await Payroll.findOne({ staffId: req.user._id, school: schoolId });
        if (!payroll) {
            // Return zeroed out config to prevent UI crashes if accountant hasn't configured payroll yet
            return res.status(200).json({
                success: true,
                data: {
                    basic: 0,
                    allowances: [],
                    deductions: [],
                    gross: 0,
                    totalDeduction: 0,
                    netPay: 0
                }
            });
        }

        const basic = payroll.basicSalary || 0;
        const grossAllowances = (payroll.allowances || []).reduce((sum, a) => sum + a.amount, 0);

        let totalDeduction = 0;
        if (payroll.deductions) {
            for (const d of payroll.deductions) {
                if (d.deductionType === 'percentage') {
                    const base = d.appliesOn === 'gross' ? (basic + grossAllowances) : basic;
                    totalDeduction += (base * d.value) / 100;
                } else {
                    totalDeduction += d.value;
                }
            }
        }

        const netPay = payroll.netSalary || Math.max(0, basic + grossAllowances - totalDeduction);

        return res.status(200).json({
            success: true,
            data: {
                basic,
                allowances: payroll.allowances || [],
                deductions: payroll.deductions || [],
                gross: basic + grossAllowances,
                totalDeduction,
                netPay
            }
        });
    } catch (error) {
        console.error('Error in getSalaryDetails:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get past salary slips
export const getSalarySlips = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const slips = await SalarySlip.find({ staffId: req.user._id, school: schoolId })
            .sort({ year: -1, month: -1 })
            .lean();

        const MONTH_NAMES = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const mappedSlips = slips.map(s => {
            const allowancesSum = (s.allowances || []).reduce((sum, a) => sum + a.amount, 0);
            const deductionsSum = s.totalDeductions || (s.deductions || []).reduce((sum, d) => sum + d.amount, 0);
            return {
                _id: s._id,
                month: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
                basic: s.payableBasic || s.basicSalary || 0,
                allowance: allowancesSum,
                deduction: deductionsSum,
                netSalary: s.netSalary || 0,
                status: s.paymentStatus === 'paid' ? 'Paid' : (s.paymentStatus === 'approved' ? 'Approved' : (s.paymentStatus === 'held' ? 'Held' : 'Draft')),
                date: s.paymentDate ? s.paymentDate.toISOString().split('T')[0] : s.updatedAt.toISOString().split('T')[0],
                method: s.paymentMode === 'bank_transfer' ? 'Bank Transfer' : (s.paymentMode === 'cash' ? 'Cash' : (s.paymentMode === 'cheque' ? 'Cheque' : 'Razorpay')),
                paymentReference: s.paymentReference || 'N/A',
                allowances: s.allowances || [],
                deductions: s.deductions || []
            };
        });

        return res.status(200).json({ success: true, data: mappedSlips });
    } catch (error) {
        console.error('Error in getSalarySlips:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get attendance logs
export const getAttendanceLogs = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { year, month, status, page = 1, limit = 50 } = req.query;

        const query = {
            staffId: req.user._id,
            school: schoolId
        };

        if (year && month) {
            const start = new Date(parseInt(year), parseInt(month) - 1, 1);
            const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        if (status && status !== 'All') {
            if (status === 'Present') {
                query.status = { $in: ['present', 'late'] };
            } else if (status === 'Absent') {
                query.status = 'absent';
            } else if (status === 'Leave') {
                query.status = 'on_leave';
            } else if (status === 'Half Day') {
                query.status = 'half_day';
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await StaffAttendance.countDocuments(query);
        const records = await StaffAttendance.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('leaveRef')
            .lean();

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const mapped = records.map(r => {
            const d = new Date(r.date);
            let attStatus = 'Absent';
            if (r.status === 'present' || r.status === 'late') attStatus = 'Present';
            else if (r.status === 'on_leave') attStatus = 'Leave';
            else if (r.status === 'half_day') attStatus = 'Half Day';

            let typeStr = 'Unexcused';
            if (r.status === 'present') typeStr = 'Regular';
            else if (r.status === 'late') typeStr = 'Late';
            else if (r.status === 'on_leave') typeStr = r.leaveRef?.leaveType || 'On Leave';
            else if (r.status === 'half_day') typeStr = 'Half Day';

            return {
                _id: r._id,
                date: d.toISOString().split('T')[0],
                day: dayNames[d.getDay()],
                attendance: attStatus,
                type: typeStr,
                hours: r.totalHours ? `${r.totalHours} hrs` : (r.status === 'present' || r.status === 'late' ? '8.0 hrs' : '0 hrs'),
                status: 'Approved',
                reason: r.remarks || r.leaveRef?.reason || ''
            };
        });

        return res.status(200).json({
            success: true,
            data: mapped,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getAttendanceLogs:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get attendance summary stats & chart data
export const getAttendanceStats = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { year, month } = req.query;

        const query = {
            staffId: req.user._id,
            school: schoolId
        };

        if (year && month) {
            const start = new Date(parseInt(year), parseInt(month) - 1, 1);
            const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        const records = await StaffAttendance.find(query).populate('leaveRef').lean();

        const totalDays = records.length;
        const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const absentDays = records.filter(r => r.status === 'absent').length;
        const leaveDays = records.filter(r => r.status === 'on_leave').length;
        const halfDays = records.filter(r => r.status === 'half_day').length;
        const presentFullDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        const chartData = [1, 2, 3, 4, 5].map(week => {
            const weekRecords = records.filter(r => {
                const day = new Date(r.date).getDate();
                return Math.ceil(day / 7) === week;
            });
            return {
                name: `Week ${week}`,
                Present: weekRecords.filter(r => r.status === 'present' || r.status === 'late').length,
                "Half Day": weekRecords.filter(r => r.status === 'half_day').length,
                Leave: weekRecords.filter(r => r.status === 'on_leave').length,
                Absent: weekRecords.filter(r => r.status === 'absent').length
            };
        }).filter(weekData => weekData.name === 'Week 1' || weekData.Present > 0 || weekData["Half Day"] > 0 || weekData.Leave > 0 || weekData.Absent > 0);

        const pieData = [
            { name: "Present", value: presentFullDays },
            { name: "Absent", value: absentDays },
            { name: "Leave", value: leaveDays },
            { name: "Half Day", value: halfDays }
        ];

        return res.status(200).json({
            success: true,
            data: {
                presentDays,
                absentDays,
                leaveDays,
                halfDays,
                attendancePercentage,
                chartData,
                pieData
            }
        });
    } catch (error) {
        console.error('Error in getAttendanceStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get leave history for current admin
export const getLeaveHistory = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const leaves = await StaffLeave.find({ staffId: req.user._id, school: schoolId })
            .sort({ createdAt: -1 })
            .lean();

        const LEAVE_TYPES = {
            'casual': 'Casual Leave (CL)',
            'sick': 'Sick Leave (SL)',
            'earned': 'Earned Leave (EL)',
            'maternity': 'Maternity Leave',
            'paternity': 'Paternity Leave',
            'unpaid': 'Emergency Leave',
            'half_day': 'Half Day Leave',
            'full_day': 'Full Day Leave'
        };

        const STATUS_LABELS = {
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'cancelled': 'Cancelled'
        };

        const mappedLeaves = leaves.map(l => ({
            id: l._id,
            appliedDate: l.appliedAt ? l.appliedAt.toISOString().split('T')[0] : l.createdAt.toISOString().split('T')[0],
            leaveType: LEAVE_TYPES[l.leaveType] || l.leaveType,
            fromDate: l.fromDate.toISOString().split('T')[0],
            toDate: l.toDate.toISOString().split('T')[0],
            totalDays: l.totalDays,
            status: STATUS_LABELS[l.status] || l.status,
            reason: l.reason,
            remarks: l.rejectionReason || 'Under review by Principal'
        }));

        return res.status(200).json({ success: true, data: mappedLeaves });
    } catch (error) {
        console.error('Error in getLeaveHistory:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Apply leave
export const applyLeave = async (req, res) => {
    try {
        const { schoolId, organizationId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { leaveType, fromDate, toDate, reason } = req.body;

        if (!leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);
        if (end < start) {
            return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
        }

        const diffTime = Math.abs(end - start);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const typeMap = {
            'Casual Leave (CL)': 'casual',
            'Sick Leave (SL)': 'sick',
            'Earned Leave (EL)': 'earned',
            'Maternity Leave': 'maternity',
            'Paternity Leave': 'paternity',
            'Emergency Leave': 'unpaid'
        };

        const mappedType = typeMap[leaveType] || 'casual';

        const leaveRequest = await StaffLeave.create({
            organization: organizationId,
            school: schoolId,
            staffId: req.user._id,
            staffRole: req.user.role,
            leaveType: mappedType,
            fromDate: start,
            toDate: end,
            totalDays,
            reason,
            approvalLevel: 'principal',
            status: 'pending'
        });

        return res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully!',
            data: leaveRequest
        });
    } catch (error) {
        console.error('Error in applyLeave:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Get leave balance
export const getLeaveBalance = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const leaves = await StaffLeave.find({
            staffId: req.user._id,
            school: schoolId
        }).lean();

        let approvedLeaves = 0;
        let pendingRequests = 0;
        let rejectedRequests = 0;

        leaves.forEach(l => {
            const status = (l.status || '').toLowerCase().trim();
            if (status === 'approved') {
                approvedLeaves++;
            } else if (status === 'pending') {
                pendingRequests++;
            } else if (status === 'rejected') {
                rejectedRequests++;
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                approvedLeaves,
                pendingRequests,
                rejectedRequests
            }
        });
    } catch (error) {
        console.error('Error in getLeaveBalance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Get latest resignation request
export const getResignation = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const resign = await Resignation.findOne({ staffId: req.user._id, school: schoolId })
            .sort({ createdAt: -1 })
            .lean();

        if (!resign) {
            return res.status(200).json({ success: true, data: null });
        }

        // Map status
        const statusMap = {
            'pending': 'Pending',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'withdrawn': 'Withdrawn'
        };

        return res.status(200).json({
            success: true,
            data: {
                _id: resign._id,
                date: resign.resignationDate ? resign.resignationDate.toISOString().split('T')[0] : resign.createdAt.toISOString().split('T')[0],
                lastDay: resign.lastWorkingDate.toISOString().split('T')[0],
                reason: resign.reason,
                status: statusMap[resign.status] || resign.status,
                remarks: resign.reviewRemarks || 'Under review by Principal'
            }
        });
    } catch (error) {
        console.error('Error in getResignation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Apply resignation
export const applyResignation = async (req, res) => {
    try {
        const { schoolId, organizationId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { lastDay, reason } = req.body;

        if (!lastDay || !reason) {
            return res.status(400).json({ success: false, message: 'Please specify last day and reason.' });
        }

        // Check if there is an active pending/accepted resignation
        const existing = await Resignation.findOne({
            staffId: req.user._id,
            school: schoolId,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'An active resignation request already exists.' });
        }

        const resign = await Resignation.create({
            organization: organizationId,
            school: schoolId,
            staffId: req.user._id,
            staffRole: req.user.role,
            resignationDate: new Date(),
            lastWorkingDate: new Date(lastDay),
            noticePeriodDays: 30, // standard
            reason,
            approvalLevel: 'principal',
            status: 'pending'
        });

        return res.status(201).json({
            success: true,
            message: 'Resignation request submitted successfully.',
            data: resign
        });
    } catch (error) {
        console.error('Error in applyResignation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Withdraw resignation
export const withdrawResignation = async (req, res) => {
    try {
        const { schoolId } = getHrmContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const resign = await Resignation.findOne({
            staffId: req.user._id,
            school: schoolId,
            status: 'pending'
        });

        if (!resign) {
            return res.status(400).json({ success: false, message: 'No pending resignation request found.' });
        }

        resign.status = 'withdrawn';
        await resign.save();

        return res.status(200).json({
            success: true,
            message: 'Resignation request withdrawn successfully.',
            data: resign
        });
    } catch (error) {
        console.error('Error in withdrawResignation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
