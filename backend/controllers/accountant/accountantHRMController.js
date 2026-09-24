import StaffLeave from '../../models/HRM/Staffleave.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import Ticket from '../../models/common/Ticket.js';

/**
 * GET /api/accountant/hrm/dashboard
 * Fetch Accountant self-attendance today, leave balances, leave history, salary slips, and tickets.
 */
export const getHRMDashboardStats = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        const orgId = req.user.organization || req.user.school?.organization || req.user.school?.organization?._id;

        if (!schoolId || !orgId) {
            return res.status(400).json({ success: false, message: "Missing school or organization context." });
        }

        // 1. Fetch Today's Attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendanceToday = await StaffAttendance.findOne({ staffId, date: today, school: schoolId, organization: orgId });

        // 2. Fetch Leave Balance & History
        const leaveHistory = await StaffLeave.find({ staffId, school: schoolId, organization: orgId })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate leave counts
        const approvedLeaves = leaveHistory.filter(l => l.status === 'approved');
        const usedLeaves = {
            casual: 0,
            sick: 0,
            earned: 0,
            unpaid: 0
        };
        approvedLeaves.forEach(l => {
            if (usedLeaves[l.leaveType] !== undefined) {
                usedLeaves[l.leaveType] += l.totalDays;
            } else if (l.leaveType === 'unpaid') {
                usedLeaves.unpaid += l.totalDays;
            }
        });

        // Predefined limits
        const leaveBalance = [
            { l: 'Casual Leave (CL)', v: `${15 - usedLeaves.casual}`, c: 'text-blue-600' },
            { l: 'Sick Leave (SL)', v: `${10 - usedLeaves.sick}`, c: 'text-orange-600' },
            { l: 'Earned Leave (EL)', v: `${25 - usedLeaves.earned}`, c: 'text-emerald-600' },
            { l: 'Leave Without Pay (LWP)', v: `${usedLeaves.unpaid}`, c: 'text-slate-600' }
        ];

        const totalLeaveAvailable = (15 - usedLeaves.casual) + (10 - usedLeaves.sick) + (25 - usedLeaves.earned);

        // 3. Fetch Salary slips
        const slips = await SalarySlip.find({ staffId, school: schoolId, organization: orgId })
            .sort({ year: -1, month: -1 })
            .lean();

        const formattedPayouts = slips.map(slip => {
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            return {
                id: slip._id,
                month: `${monthNames[slip.month - 1]} ${slip.year}`,
                basicSalary: `₹${(slip.basicSalary || 0).toLocaleString('en-IN')}`,
                allowances: `₹${((slip.allowances || []).reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('en-IN')}`,
                deductions: `₹${(slip.totalDeductions || 0).toLocaleString('en-IN')}`,
                netSalary: `₹${(slip.netSalary || 0).toLocaleString('en-IN')}`,
                amount: `₹${(slip.netSalary || 0).toLocaleString('en-IN')}`,
                date: slip.paymentDate ? new Date(slip.paymentDate).toLocaleDateString('en-GB') : 'N/A',
                status: (slip.paymentStatus || 'draft').charAt(0).toUpperCase() + (slip.paymentStatus || 'draft').slice(1),
                slipUrl: slip.slipUrl || ''
            };
        });

        // 4. Fetch Support Tickets
        const supportTickets = await Ticket.find({ raisedBy: staffId, school: schoolId, organization: orgId })
            .sort({ createdAt: -1 })
            .lean();

        const formattedTickets = supportTickets.map(t => ({
            id: t._id,
            _id: t._id,
            ticketId: `TCK-${t._id.toString().slice(-6).toUpperCase()}`,
            date: new Date(t.createdAt).toISOString().split('T')[0],
            subject: t.title,
            category: t.category.charAt(0).toUpperCase() + t.category.slice(1),
            priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
            status: t.status === 'in_progress' ? 'In Progress' : t.status.charAt(0).toUpperCase() + t.status.slice(1)
        }));

        const activeTicketsCount = supportTickets.filter(t => ['open', 'in_progress', 'escalated'].includes(t.status)).length;

        // 5. Fetch Attendance History for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        
        const attendanceRecords = await StaffAttendance.find({
            staffId,
            school: schoolId,
            organization: orgId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 }).lean();

        const formattedAttendance = attendanceRecords.map(att => ({
            id: att._id,
            date: att.date,
            clockIn: att.clockIn || null,
            clockOut: att.clockOut || null,
            totalHours: att.totalHours || null,
            isLate: att.isLate || false,
            lateByMinutes: att.lateByMinutes || 0,
            status: att.status === 'half_day' ? 'Half Day' : att.status === 'on_leave' ? 'On Leave' : att.status.charAt(0).toUpperCase() + att.status.slice(1),
            remarks: att.remarks || ''
        }));

        // 6. Calculate Attendance Rate
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyAttendance = await StaffAttendance.find({
            staffId,
            school: schoolId,
            organization: orgId,
            date: { $gte: startOfMonth }
        }).lean();

        let presentWeight = 0;
        let totalCount = monthlyAttendance.length;
        monthlyAttendance.forEach(r => {
            if (r.status === 'present' || r.status === 'late' || r.status === 'on_leave') {
                presentWeight += 1;
            } else if (r.status === 'half_day') {
                presentWeight += 0.5;
            }
        });
        const attendanceRate = totalCount > 0 ? ((presentWeight / totalCount) * 100).toFixed(1) : "100.0";

        res.status(200).json({
            success: true,
            data: {
                isClockedIn: !!(attendanceToday && attendanceToday.clockIn && !attendanceToday.clockOut),
                clockInTime: attendanceToday?.clockIn || null,
                clockOutTime: attendanceToday?.clockOut || null,
                leaveBalance,
                totalLeaveAvailable,
                attendanceRate: `${attendanceRate}%`,
                leaveHistory: leaveHistory.map(item => ({
                    id: item._id,
                    type: item.leaveType.charAt(0).toUpperCase() + item.leaveType.slice(1) + ' Leave',
                    start: new Date(item.fromDate).toISOString().split('T')[0],
                    end: new Date(item.toDate).toISOString().split('T')[0],
                    totalDays: item.totalDays,
                    reason: item.reason,
                    status: item.status.charAt(0).toUpperCase() + item.status.slice(1)
                })),
                payoutHistory: formattedPayouts,
                supportTickets: formattedTickets,
                activeTicketsCount,
                attendanceHistory: formattedAttendance
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/hrm/attendance/toggle
 * Clock in / Clock out today for Accountant
 */
export const toggleAttendance = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        const orgId = req.user.organization || req.user.school?.organization || req.user.school?.organization?._id;

        if (!schoolId || !orgId) {
            return res.status(400).json({ success: false, message: "Missing school or organization context." });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await StaffAttendance.findOne({ staffId, date: today, school: schoolId, organization: orgId });

        if (!attendance) {
            // Clock In
            attendance = await StaffAttendance.create({
                organization: orgId,
                school: schoolId,
                staffId,
                staffRole: req.user.role,
                date: today,
                clockIn: new Date(),
                status: 'present',
                markedBy: req.user._id
            });
            return res.status(200).json({
                success: true,
                message: 'Clocked in successfully',
                data: attendance
            });
        } else {
            // Clock Out
            if (attendance.clockOut) {
                return res.status(400).json({
                    success: false,
                    message: 'Already clocked out for today'
                });
            }
            attendance.clockOut = new Date();
            await attendance.save();
            return res.status(200).json({
                success: true,
                message: 'Clocked out successfully',
                data: attendance
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/hrm/leave
 * Submit leave application
 */
export const applyLeaveRequest = async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        const orgId = req.user.organization || req.user.school?.organization || req.user.school?.organization?._id;

        if (!schoolId || !orgId) {
            return res.status(400).json({ success: false, message: "Missing school or organization context." });
        }

        if (!leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);
        if (end < start) {
            return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Clean dbLeaveType mapping
        let dbLeaveType = 'unpaid';
        const typeLower = leaveType.toLowerCase();
        if (typeLower.includes('casual')) dbLeaveType = 'casual';
        else if (typeLower.includes('sick')) dbLeaveType = 'sick';
        else if (typeLower.includes('earned')) dbLeaveType = 'earned';
        else if (typeLower.includes('unpaid') || typeLower.includes('lwp')) dbLeaveType = 'unpaid';

        const leave = await StaffLeave.create({
            organization: orgId,
            school: schoolId,
            staffId,
            staffRole: req.user.role,
            leaveType: dbLeaveType,
            fromDate: start,
            toDate: end,
            totalDays: diffDays,
            reason,
            approvalLevel: 'branch_admin',
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully',
            data: leave
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/hrm/complaint
 * Raise a complaint/support ticket (Legacy fallback, prefer commonTicketApi)
 */
export const submitComplaint = async (req, res) => {
    try {
        const { complaint } = req.body;
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        const orgId = req.user.organization || req.user.school?.organization || req.user.school?.organization?._id;

        if (!schoolId || !orgId) {
            return res.status(400).json({ success: false, message: "Missing school or organization context." });
        }

        if (!complaint) {
            return res.status(400).json({ success: false, message: 'Complaint description is required' });
        }

        const ticket = await Ticket.create({
            organization: orgId,
            school: schoolId,
            title: 'Accountant Support Ticket',
            description: complaint,
            category: 'complaint',
            raisedBy: staffId,
            raisedByRole: req.user.role,
            priority: 'medium',
            status: 'open'
        });

        res.status(201).json({
            success: true,
            message: 'Complaint registered successfully',
            ticketId: ticket._id
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
