import mongoose from 'mongoose';
import Attendance from '../../models/academic/attendance.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import StaffLeave from '../../models/HRM/Staffleave.model.js';
import User from '../../models/users/user.model.js';
import Notification from '../../models/common/Notification.js';
import School from '../../models/school/School.js';
import Period from '../../models/modules/Period.js';

// ==================== SECURITY & CONTEXT HELPER ====================

/**
 * Extracts the School ID securely from the authenticated user token
 */
const getSchoolContext = async (req) => {
    let schoolId = req.user?.schoolId || req.user?.school?._id || req.user?.school;
    if (!schoolId && req.user?.id) {
        const user = await User.findById(req.user.id);
        schoolId = user?.school;
    }
    return schoolId ? schoolId.toString() : null;
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get working days count for a given month/year
 */
const getWorkingDaysCount = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayOfWeek = date.getDay();
        // Exclude Sundays (0) and Saturdays (6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
    }
    return workingDays;
};

/**
 * Send notification to user
 */
const sendAttendanceNotification = async (userId, title, message, type, schoolId) => {
    try {
        const notification = new Notification({
            user: userId,
            title,
            message,
            type: type || 'attendance',
            read: false,
            school: schoolId,
        });
        await notification.save();
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
};

/**
 * Calculate attendance percentage
 */
const calculatePercentage = (present, total) => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
};

/**
 * Get attendance status based on percentage
 */
const getAttendanceStatus = (percentage) => {
    if (percentage >= 90) return { label: 'Regular', color: 'bg-green-100 text-green-700', badge: 'bg-green-100' };
    if (percentage >= 75) return { label: 'Irregular', color: 'bg-yellow-100 text-yellow-700', badge: 'bg-yellow-100' };
    return { label: 'Critical', color: 'bg-red-100 text-red-700', badge: 'bg-red-100' };
};

// ==================== STUDENT ATTENDANCE REPORTS ====================

/**
 * @desc    Get student attendance reports
 * @route   GET /api/principal/attendance/student-reports
 * @access  Private (Principal)
 */
export const getStudentAttendanceReports = async (req, res) => {
    try {
        const { month, year, class: className, section } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'Authentication error: School context not found.' });
        }
        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        const selectedMonth = parseInt(month) || new Date().getMonth();
        const selectedYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);

        const periodQuery = { schoolId: new mongoose.Types.ObjectId(school_id), status: 'active' };
        if (className && className !== 'All') periodQuery._id = className; // Adjusted to match frontend passing _id
        if (section && section !== 'All') periodQuery.section = section;

        const periods = await Period.find(periodQuery).select('gradeLevel section _id');

        const studentIds = await User.find({
            school: new mongoose.Types.ObjectId(school_id),
            role: 'student',
            periodId: { $in: periods.map(p => p._id) }
        }).select('_id name class section periodId');

        const attendanceRecords = await Attendance.find({
            school: new mongoose.Types.ObjectId(school_id),
            date: { $gte: startDate, $lte: endDate },
            attendanceType: 'class'
        }).lean();

        const workingDays = getWorkingDaysCount(selectedYear, selectedMonth);

        const studentAttendance = studentIds.map(student => {
            let present = 0;
            let absent = 0;
            let leave = 0;
            let late = 0;

            attendanceRecords.forEach(record => {
                const entry = record.entries?.find(e => e.student.toString() === student._id.toString());
                if (entry) {
                    switch (entry.status) {
                        case 'present': present++; break;
                        case 'absent': absent++; break;
                        case 'on_leave': leave++; break;
                        case 'late': late++; break;
                        case 'half_day': present += 0.5; break;
                    }
                }
            });

            const percentage = calculatePercentage(present, workingDays);
            const status = getAttendanceStatus(percentage);
            const period = periods.find(p => p._id.toString() === student.periodId?.toString());

            return {
                id: student._id,
                name: student.name,
                class: period?.gradeLevel || student.class || 'N/A',
                section: period?.section || student.section || 'N/A',
                present: Math.floor(present),
                absent,
                leave,
                late,
                percentage,
                status: status.label,
                statusColor: status.color,
                statusBadge: status.badge
            };
        });

        const avgPercentage = studentAttendance.length > 0
            ? Math.round(studentAttendance.reduce((sum, s) => sum + s.percentage, 0) / studentAttendance.length)
            : 0;

        const below75Count = studentAttendance.filter(s => s.percentage < 75).length;

        const dailyTrend = [];
        for (let day = 1; day <= workingDays; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            if (date.getDay() !== 0) {
                const dayRecords = attendanceRecords.filter(r => new Date(r.date).getDate() === day);
                const totalPresent = dayRecords.reduce((sum, r) => sum + (r.totalPresent || 0), 0);
                const totalStudents = studentIds.length;
                dailyTrend.push({
                    day,
                    students: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
                });
            }
        }

        const classWiseData = [];
        for (const period of periods) {
            const classStudents = studentAttendance.filter(s => s.class === period.gradeLevel && s.section === period.section);
            const classAvg = classStudents.length > 0
                ? Math.round(classStudents.reduce((sum, s) => sum + s.percentage, 0) / classStudents.length)
                : 0;
            classWiseData.push({
                name: `${period.gradeLevel}${period.section}`,
                attendance: classAvg
            });
        }

        const monthNames = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
        const monthwiseData = [];

        for (const period of periods) {
            const classData = { class: `${period.gradeLevel}${period.section}` };
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(selectedYear, selectedMonth - i, 1);
                const monthIdx = monthDate.getMonth();
                const monthStart = new Date(selectedYear, monthIdx, 1);
                const monthEnd = new Date(selectedYear, monthIdx + 1, 0);
                const monthWorkingDays = getWorkingDaysCount(selectedYear, monthIdx);

                const monthRecords = await Attendance.find({
                    school: new mongoose.Types.ObjectId(school_id),
                    date: { $gte: monthStart, $lte: monthEnd },
                    attendanceType: 'class'
                }).lean();

                const periodStudents = await User.find({
                    school: new mongoose.Types.ObjectId(school_id),
                    role: 'student',
                    periodId: period._id
                }).select('_id');

                const periodStudentIds = periodStudents.map(s => s._id);

                let totalPresent = 0;
                monthRecords.forEach(record => {
                    periodStudentIds.forEach(studentId => {
                        const entry = record.entries?.find(e => e.student.toString() === studentId.toString());
                        if (entry && entry.status === 'present') totalPresent++;
                    });
                });

                const attendancePercent = periodStudentIds.length > 0 && monthWorkingDays > 0
                    ? Math.round((totalPresent / (periodStudentIds.length * monthWorkingDays)) * 100)
                    : 0;

                classData[monthNames[5 - i]] = attendancePercent;
            }
            monthwiseData.push(classData);
        }

        return res.status(200).json({
            success: true,
            data: {
                students: studentAttendance,
                summary: {
                    avgAttendance: avgPercentage,
                    workingDays,
                    below75Count,
                    criticalStaffCount: 0
                },
                dailyTrend,
                classWiseData,
                monthwiseData
            }
        });

    } catch (error) {
        console.error('Error in getStudentAttendanceReports:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student monthly calendar view
 * @route   GET /api/principal/attendance/student-calendar
 * @access  Private (Principal)
 */
export const getStudentCalendar = async (req, res) => {
    try {
        const { student_id, month, year } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id || !student_id) {
            return res.status(400).json({ success: false, message: 'Authentication error or missing student ID.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        const selectedMonth = parseInt(month) || new Date().getMonth();
        const selectedYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);

        const attendanceRecords = await Attendance.find({
            school: new mongoose.Types.ObjectId(school_id),
            date: { $gte: startDate, $lte: endDate },
            'entries.student': new mongoose.Types.ObjectId(student_id)
        }).lean();

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const entry = record.entries?.find(e => e.student.toString() === student_id);
            if (entry) {
                const dateKey = new Date(record.date).getDate();
                attendanceMap[dateKey] = entry.status;
            }
        });

        const daysInMonth = endDate.getDate();
        const calendarData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayOfWeek = date.getDay();
            const status = attendanceMap[day] || (dayOfWeek === 0 ? 'holiday' : 'pending');

            calendarData.push({
                day,
                status,
                isPresent: status === 'present',
                isAbsent: status === 'absent',
                isLeave: status === 'on_leave',
                isLate: status === 'late',
                isHalfDay: status === 'half_day',
                isHoliday: dayOfWeek === 0
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                student_id,
                month: selectedMonth,
                year: selectedYear,
                daysInMonth,
                calendar: calendarData
            }
        });

    } catch (error) {
        console.error('Error in getStudentCalendar:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== STAFF ATTENDANCE ====================

/**
 * @desc    Get staff list for attendance marking
 * @route   GET /api/principal/attendance/staff-list
 * @access  Private (Principal)
 */
export const getStaffList = async (req, res) => {
    try {
        const { search, role } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        const query = {
            school: new mongoose.Types.ObjectId(school_id),
            role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] }
        };

        if (search) query.name = { $regex: search, $options: 'i' };
        if (role && role !== 'All') query.role = role.toLowerCase();

        const staff = await User.find(query).select('name email phone role').lean();

        const formattedStaff = staff.map(s => ({
            id: s._id,
            name: s.name,
            role: s.role,
            contact: s.phone || 'N/A',
            department: getDepartmentFromRole(s.role)
        }));

        return res.status(200).json({
            success: true,
            data: formattedStaff,
            total: formattedStaff.length
        });

    } catch (error) {
        console.error('Error in getStaffList:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff attendance for a specific date
 * @route   GET /api/principal/attendance/staff-attendance
 * @access  Private (Principal)
 */
export const getStaffAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id || !date) {
            return res.status(400).json({ success: false, message: 'School ID and date are required.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        // Verify Principal cannot access attendance records of Admins from another school (Req 7)
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = req.user?.schoolId || req.user?.school?._id?.toString() || req.user?.school?.toString() || principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            return res.status(403).json({ success: false, message: 'Access denied: Principal cannot access attendance records of another school.' });
        }

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        // Fetch only admin users belonging to this school (Req 1)
        const staff = await User.find({
            school: new mongoose.Types.ObjectId(school_id),
            role: 'admin'
        })
        .select('_id name role email loginId profileId profileModel school')
        .populate('profileId')
        .lean();

        // Extra verification filter layer (Req 3, 5 & 6)
        const filteredStaff = staff.filter(s => {
            const staffSchoolId = s.school?.toString() || s.schoolId?.toString();
            return staffSchoolId === principalSchoolId;
        });

        const attendanceRecords = await StaffAttendance.find({
            school: new mongoose.Types.ObjectId(school_id),
            date: selectedDate
        }).populate('markedBy', 'name').lean();

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.staffId.toString()] = record;
        });

        const attendanceData = filteredStaff.map(s => {
            const existing = attendanceMap[s._id.toString()];
            
            // Phase 3: Fetch contact dynamically from the profile
            let contact = 'N/A';
            if (s.profileId) {
                contact = s.profileId.phoneNumber || s.profileId.phone || 'N/A';
            }

            return {
                id: s._id,
                name: s.name,
                loginId: s.loginId || 'N/A',
                role: s.role,
                contact: contact,
                status: existing ? existing.status : 'present',
                remarks: existing?.remarks || '',
                isSaved: !!existing,
                markedBy: existing?.markedBy?.name || '—',
                isSelf: s._id.toString() === req.user?._id?.toString()
            };
        });

        const total = attendanceData.length;
        const present = attendanceData.filter(a => a.status === 'present').length;
        const absent = attendanceData.filter(a => a.status === 'absent').length;
        const onLeave = attendanceData.filter(a => a.status === 'on_leave').length;
        const halfDay = attendanceData.filter(a => a.status === 'half_day').length;
        const late = attendanceData.filter(a => a.status === 'late').length;

        return res.status(200).json({
            success: true,
            data: {
                staff: attendanceData,
                stats: { total, present, absent, onLeave, halfDay, late },
                isAlreadyMarked: attendanceRecords.length > 0
            }
        });

    } catch (error) {
        console.error('Error in getStaffAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark staff attendance
 * @route   POST /api/principal/attendance/mark-staff
 * @access  Private (Principal)
 */
export const markStaffAttendance = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { date, attendance } = req.body;
        const school_id = await getSchoolContext(req);

        if (!school_id || !date || !attendance || !Array.isArray(attendance)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Missing required fields or school context.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        // Verify Principal cannot mark attendance for another school (Req 7 & 8)
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = req.user?.schoolId || req.user?.school?._id?.toString() || req.user?.school?.toString() || principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Access denied: Principal cannot mark attendance records for another school.' });
        }

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        // Phase 6: 48 hour edit window backend validation
        const now = new Date();
        const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
        const timeDiff = now.getTime() - selectedDate.getTime();
        if (timeDiff > fortyEightHoursInMs) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Attendance can no longer be modified. Edit window expired.' });
        }

        let organizationId = req.user?.organizationId || req.user?.organization || req.user?.school?.organization;
        if (!organizationId && school_id) {
            const school = await School.findById(school_id).select('organization');
            organizationId = school?.organization;
        }

        if (!organizationId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Organization not found for attendance' });
        }

        // Validate payload records for Principal role and school scoping (Req 7 & 8)
        for (const item of attendance) {
            if (!item.id) continue;

            if (item.id === req.user?._id?.toString() || item.id === req.user?.id?.toString()) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Self attendance cannot be marked by Principal.' });
            }

            const staff = await User.findById(item.id).session(session);
            if (!staff) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: `Staff user not found: ${item.id}` });
            }

            const staffSchoolId = staff.school?.toString() || staff.schoolId?.toString();
            if (staffSchoolId !== principalSchoolId) {
                await session.abortTransaction();
                return res.status(403).json({ success: false, message: 'Access denied: Principal cannot mark attendance for staff of another school.' });
            }

            if (staff.role !== 'admin') {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Principal can only mark attendance for Admin users.' });
            }
        }

        const staffRecords = [];
        const notifications = [];

        // Phase 5: Unique date-wise storage using findOneAndUpdate upserts instead of deleteMany
        for (const item of attendance) {
            if (!item.id || !item.status) continue;

            // Phase 4: Validate attendance status enhancement (including half_day)
            const validStatuses = ['present', 'absent', 'half_day', 'on_leave', 'holiday', 'late'];
            if (!validStatuses.includes(item.status)) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Invalid status: ${item.status}` });
            }

            const staff = await User.findById(item.id).session(session);
            if (!staff) continue;

            const record = await StaffAttendance.findOneAndUpdate(
                {
                    school: new mongoose.Types.ObjectId(school_id),
                    staffId: item.id,
                    date: selectedDate
                },
                {
                    $set: {
                        organization: organizationId,
                        staffRole: staff.role,
                        status: item.status,
                        remarks: item.remarks || '',
                        markedBy: req.user._id,
                        markedByRole: 'principal'
                    }
                },
                {
                    upsert: true,
                    new: true,
                    session
                }
            );

            staffRecords.push(record);

            const statusText = getStatusText(item.status);
            notifications.push({
                userId: item.id,
                title: 'Attendance Marked',
                message: `Your attendance has been marked as ${statusText} for ${selectedDate.toLocaleDateString()}`,
                type: 'attendance',
                schoolId: school_id
            });
        }

        for (const notif of notifications) {
            await sendAttendanceNotification(notif.userId, notif.title, notif.message, notif.type, notif.schoolId);
        }

        await session.commitTransaction();

        const stats = {
            total: staffRecords.length,
            present: staffRecords.filter(r => r.status === 'present').length,
            absent: staffRecords.filter(r => r.status === 'absent').length,
            onLeave: staffRecords.filter(r => r.status === 'on_leave').length,
            halfDay: staffRecords.filter(r => r.status === 'half_day').length,
            late: staffRecords.filter(r => r.status === 'late').length
        };

        return res.status(200).json({
            success: true,
            message: `Attendance saved for ${selectedDate.toLocaleDateString()}. ${stats.present} Present, ${stats.absent} Absent, ${stats.halfDay} Half Day`,
            data: { stats }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in markStaffAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get staff attendance reports
 * @route   GET /api/principal/attendance/staff-reports
 * @access  Private (Principal)
 */
export const getStaffAttendanceReports = async (req, res) => {
    try {
        const { month, year, role, search } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        // Verify Principal cannot access reports of another school (Req 7)
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            return res.status(403).json({ success: false, message: 'Principal cannot access attendance records/reports of another school.' });
        }

        const selectedMonth = parseInt(month) || new Date().getMonth();
        const selectedYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        const workingDays = getWorkingDaysCount(selectedYear, selectedMonth);

        const staffQuery = {
            school: new mongoose.Types.ObjectId(school_id),
            role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] }
        };
        if (role && role !== 'All') staffQuery.role = role.toLowerCase();
        if (search) staffQuery.name = { $regex: search, $options: 'i' };

        const staff = await User.find(staffQuery).select('_id name role email phone');

        const attendanceRecords = await StaffAttendance.find({
            school: new mongoose.Types.ObjectId(school_id),
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        const staffAttendance = staff.map(s => {
            const staffRecords = attendanceRecords.filter(r => r.staffId.toString() === s._id.toString());
            const present = staffRecords.filter(r => r.status === 'present').length;
            const absent = staffRecords.filter(r => r.status === 'absent').length;
            const onLeave = staffRecords.filter(r => r.status === 'on_leave').length;
            const late = staffRecords.filter(r => r.status === 'late').length;

            const percentage = calculatePercentage(present, workingDays);
            const status = getAttendanceStatus(percentage);

            return {
                id: s._id,
                name: s.name,
                role: s.role,
                contact: s.phone || 'N/A',
                present,
                absent,
                leave: onLeave,
                late,
                percentage,
                status: status.label,
                statusColor: status.color,
                statusBadge: status.badge
            };
        });

        const avgPercentage = staffAttendance.length > 0
            ? Math.round(staffAttendance.reduce((sum, s) => sum + s.percentage, 0) / staffAttendance.length)
            : 0;
        const below75Count = staffAttendance.filter(s => s.percentage < 75).length;

        return res.status(200).json({
            success: true,
            data: {
                staff: staffAttendance,
                stats: {
                    total: staff.length,
                    avgAttendance: avgPercentage,
                    workingDays,
                    below75Count
                }
            }
        });

    } catch (error) {
        console.error('Error in getStaffAttendanceReports:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== HELPER FUNCTIONS ====================

function getDepartmentFromRole(role) {
    const departments = {
        teacher: 'Teaching',
        admin: 'Administration',
        accountant: 'Finance',
        principal: 'Leadership',
        support_staff: 'Support'
    };
    return departments[role] || 'General';
}

function getStatusText(status) {
    const statusMap = {
        present: 'Present',
        absent: 'Absent',
        on_leave: 'On Leave',
        late: 'Late',
        half_day: 'Half Day'
    };
    return statusMap[status] || status;
}

// ==================== ADMIN LEAVE APPROVAL FLOW (Phase 9) ====================

/**
 * @desc    Get Admin leave requests for Principal approval
 * @route   GET /api/principal/attendance/admin-leaves
 * @access  Private (Principal)
 */
export const getAdminLeaveRequests = async (req, res) => {
    try {
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        // Verify Principal cannot access leave requests of another school (Req 7)
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            return res.status(403).json({ success: false, message: 'Principal cannot access leave records of another school.' });
        }

        // Fetch leaves where role is 'admin' and school matches (Req 7 & 8)
        const leaves = await StaffLeave.find({
            school: new mongoose.Types.ObjectId(school_id),
            staffRole: 'admin'
        })
        .populate('staffId', 'name loginId email school')
        .sort({ appliedAt: -1 })
        .lean();

        // Extra verification step (Req 7 & 8)
        const filteredLeaves = leaves.filter(l => l.staffId && l.staffId.school && l.staffId.school.toString() === principalSchoolId);

        return res.status(200).json({
            success: true,
            data: filteredLeaves
        });
    } catch (error) {
        console.error('Error in getAdminLeaveRequests:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Approve Admin leave request
 * @route   POST /api/principal/attendance/admin-leaves/:id/approve
 * @access  Private (Principal)
 */
export const approveAdminLeave = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        // Verify Principal own school context matching
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal cannot approve leaves for another school.' });
        }

        const leave = await StaffLeave.findById(id).populate('staffId').session(session);

        if (!leave) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Leave request not found.' });
        }

        if (leave.school.toString() !== principalSchoolId || leave.staffId?.school?.toString() !== principalSchoolId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal cannot approve leaves of Admins from another school.' });
        }

        if (leave.staffRole !== 'admin') {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal can only approve Admin leaves.' });
        }

        if (leave.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: `Leave is already ${leave.status}` });
        }

        leave.status = 'approved';
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        await leave.save({ session });

        // Update user status to 'on_leave' if leave is currently active
        const today = new Date().setHours(0, 0, 0, 0);
        if (new Date(leave.fromDate).setHours(0, 0, 0, 0) <= today && new Date(leave.toDate).setHours(0, 0, 0, 0) >= today) {
            await User.findByIdAndUpdate(leave.staffId, { status: "on_leave" }, { session });
        }

        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            message: 'Admin leave request approved successfully.',
            data: leave
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in approveAdminLeave:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Reject Admin leave request
 * @route   POST /api/principal/attendance/admin-leaves/:id/reject
 * @access  Private (Principal)
 */
export const rejectAdminLeave = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const school_id = await getSchoolContext(req);

        if (!school_id) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        // Verify Principal own school context matching
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal cannot reject leaves for another school.' });
        }

        const leave = await StaffLeave.findById(id).populate('staffId').session(session);

        if (!leave) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Leave request not found.' });
        }

        if (leave.school.toString() !== principalSchoolId || leave.staffId?.school?.toString() !== principalSchoolId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal cannot reject leaves of Admins from another school.' });
        }

        if (leave.staffRole !== 'admin') {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Principal can only reject Admin leaves.' });
        }

        if (leave.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: `Leave is already ${leave.status}` });
        }

        leave.status = 'rejected';
        leave.rejectionReason = rejectionReason || 'Rejected by Principal';
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        await leave.save({ session });

        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            message: 'Admin leave request rejected successfully.',
            data: leave
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in rejectAdminLeave:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get other staff attendance for a specific date (Principal View Only)
 * @route   GET /api/principal/attendance/other-staff-attendance
 * @access  Private (Principal)
 */
export const getOtherStaffAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const school_id = await getSchoolContext(req);

        if (!school_id || !date) {
            return res.status(400).json({ success: false, message: 'School ID and date are required.' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID format.' });
        }

        // Verify Principal school access
        const principalUser = await User.findById(req.user._id || req.user.id);
        const principalSchoolId = req.user?.schoolId || req.user?.school?._id?.toString() || req.user?.school?.toString() || principalUser?.school?.toString();
        if (principalSchoolId !== school_id) {
            return res.status(403).json({ success: false, message: 'Access denied: Principal cannot access attendance records of another school.' });
        }

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        // Fetch non-admin, non-principal, non-student, non-parent users (teachers, accountants, support_staff) belonging to this school
        const staff = await User.find({
            school: new mongoose.Types.ObjectId(school_id),
            role: { $in: ['teacher', 'accountant', 'support_staff'] }
        })
        .select('_id name role email loginId phone profileId profileModel school')
        .populate('profileId')
        .lean();

        // Extra verification filter layer
        const filteredStaff = staff.filter(s => {
            const staffSchoolId = s.school?.toString() || s.schoolId?.toString();
            return staffSchoolId === principalSchoolId;
        });

        const attendanceRecords = await StaffAttendance.find({
            school: new mongoose.Types.ObjectId(school_id),
            date: selectedDate
        }).populate('markedBy', 'name').lean();

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.staffId.toString()] = record;
        });

        const attendanceData = filteredStaff.map(s => {
            const existing = attendanceMap[s._id.toString()];
            
            let contact = s.phone || 'N/A';
            if (s.profileId) {
                contact = s.profileId.phoneNumber || s.profileId.phone || contact || 'N/A';
            }

            let displayRole = s.role;
            if (s.role === 'support_staff' && s.profileId?.designation) {
                displayRole = s.profileId.designation;
            } else if (s.role) {
                displayRole = s.role.charAt(0).toUpperCase() + s.role.slice(1);
            }

            return {
                id: s._id,
                name: s.name,
                loginId: s.loginId || 'N/A',
                role: displayRole,
                contact: contact,
                status: existing ? existing.status : 'present',
                remarks: existing?.remarks || '',
                isSaved: !!existing,
                markedBy: existing?.markedBy?.name || '—',
                updatedAt: existing?.updatedAt || null
            };
        });

        const total = attendanceData.length;
        const present = attendanceData.filter(a => a.status === 'present').length;
        const absent = attendanceData.filter(a => a.status === 'absent').length;
        const onLeave = attendanceData.filter(a => a.status === 'on_leave').length;
        const halfDay = attendanceData.filter(a => a.status === 'half_day').length;
        const late = attendanceData.filter(a => a.status === 'late').length;

        return res.status(200).json({
            success: true,
            data: {
                staff: attendanceData,
                stats: { total, present, absent, onLeave, halfDay, late }
            }
        });

    } catch (error) {
        console.error('Error in getOtherStaffAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};