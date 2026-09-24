import mongoose from 'mongoose';
import Attendance from '../../models/academic/attendance.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import User from '../../models/users/user.model.js';

// ==================== SECURITY & CONTEXT HELPER ====================

const getSchoolContext = async (req) => {
    let schoolId = req.user?.schoolId || req.user?.school?._id || req.user?.school;
    if (!schoolId && req.user?.id) {
        const user = await User.findById(req.user.id);
        schoolId = user?.school;
    }
    return schoolId ? schoolId.toString() : null;
};

// ==================== UTILITY FUNCTIONS ====================

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

const calculatePercentage = (present, total) => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
};

const getDepartmentFromRole = (role) => {
    const departments = {
        teacher: 'Teaching',
        admin: 'Administration',
        accountant: 'Finance',
        principal: 'Leadership',
        support_staff: 'Support'
    };
    return departments[role] || 'General';
};

const parseDateRange = (query) => {
    const { quickFilter, startDate, endDate, month, year } = query;
    let start = new Date();
    let end = new Date();

    if (quickFilter === "Today") {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (quickFilter === "This Week") {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(start.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (quickFilter === "This Month") {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    } else if (month !== undefined && year !== undefined) {
        const m = parseInt(month);
        const y = parseInt(year);
        start = new Date(y, m, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(y, m + 1, 0);
        end.setHours(23, 59, 59, 999);
    } else {
        // Default to current month
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
};

const getStudentCumulativeAttendance = async (studentIds, schoolId, startDate, endDate) => {
    if (!studentIds || studentIds.length === 0) return {};

    const attendanceStats = await Attendance.aggregate([
        {
            $match: {
                school: new mongoose.Types.ObjectId(schoolId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        { $unwind: "$entries" },
        {
            $match: {
                "entries.student": { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }
            }
        },
        {
            $group: {
                _id: "$entries.student",
                total: { $sum: 1 },
                present: {
                    $sum: {
                        $cond: [
                            { $eq: ["$entries.status", "present"] }, 1,
                            {
                                $cond: [
                                    { $eq: ["$entries.status", "late"] }, 1,
                                    {
                                        $cond: [
                                            { $eq: ["$entries.status", "half_day"] }, 0.5, 0
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
    ]);

    const percentageMap = {};
    attendanceStats.forEach(stat => {
        const percentage = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 100;
        percentageMap[stat._id.toString()] = percentage;
    });

    return percentageMap;
};

// ==================== STUDENT REPORTS ENDPOINTS ====================

/**
 * @desc    Get student attendance reports list
 * @route   GET /api/principal/attendance-reports/students
 */
export const getStudentReports = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);
        const { class: classId, section, search, status, page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitVal = parseInt(limit);

        const matchQuery = {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: start, $lte: end }
        };
        if (classId && classId !== 'All') {
            matchQuery.class = new mongoose.Types.ObjectId(classId);
        }
        if (section && section !== 'All') {
            matchQuery.section = section;
        }

        const aggregate = [
            { $match: matchQuery },
            { $unwind: "$entries" },
            {
                $lookup: {
                    from: "users",
                    localField: "entries.student",
                    foreignField: "_id",
                    as: "studentUser"
                }
            },
            { $unwind: "$studentUser" },
            {
                $lookup: {
                    from: "students",
                    localField: "studentUser._id",
                    foreignField: "user",
                    as: "studentProfile"
                }
            },
            { $unwind: { path: "$studentProfile", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "classes",
                    localField: "class",
                    foreignField: "_id",
                    as: "classDetails"
                }
            },
            { $unwind: { path: "$classDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "markedBy",
                    foreignField: "_id",
                    as: "markedByDetails"
                }
            },
            { $unwind: { path: "$markedByDetails", preserveNullAndEmptyArrays: true } }
        ];

        const postFilters = [];
        if (search) {
            postFilters.push({
                $or: [
                    { "studentUser.name": { $regex: search, $options: "i" } },
                    { "studentProfile.rollNo": { $regex: search, $options: "i" } }
                ]
            });
        }
        if (status && status !== 'All') {
            postFilters.push({ "entries.status": status.toLowerCase() });
        }

        if (postFilters.length > 0) {
            aggregate.push({ $match: { $and: postFilters } });
        }

        aggregate.push({
            $facet: {
                totalCount: [{ $count: "count" }],
                paginatedResults: [
                    { $sort: { date: -1, "studentUser.name": 1 } },
                    { $skip: skip },
                    { $limit: limitVal },
                    {
                        $project: {
                            id: "$_id",
                            studentId: "$studentUser._id",
                            name: "$studentUser.name",
                            rollNo: { $ifNull: ["$studentProfile.rollNo", "—"] },
                            class: { $ifNull: ["$classDetails.name", "—"] },
                            section: { $ifNull: ["$section", "—"] },
                            date: "$date",
                            status: "$entries.status",
                            remarks: { $ifNull: ["$entries.remarks", "—"] },
                            markedBy: { $ifNull: ["$markedByDetails.name", "—"] }
                        }
                    }
                ]
            }
        });

        const result = await Attendance.aggregate(aggregate);
        const total = result[0].totalCount[0]?.count || 0;
        const studentList = result[0].paginatedResults || [];

        const studentIds = studentList.map(s => s.studentId);
        const percentageMap = await getStudentCumulativeAttendance(studentIds, schoolId, start, end);

        const updatedStudentList = studentList.map(s => ({
            ...s,
            percentage: percentageMap[s.studentId.toString()] !== undefined ? percentageMap[s.studentId.toString()] : 100
        }));

        return res.status(200).json({
            success: true,
            data: updatedStudentList,
            total,
            page: parseInt(page),
            limit: limitVal
        });

    } catch (error) {
        console.error('Error in getStudentReports:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student attendance reports stats
 * @route   GET /api/principal/attendance-reports/students/stats
 */
export const getStudentStats = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);

        const totalStudents = await User.countDocuments({
            school: schoolId,
            role: 'student',
            status: 'active'
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayRecords = await Attendance.find({
            school: schoolId,
            date: { $gte: todayStart, $lte: todayEnd }
        }).lean();

        let presentToday = 0;
        let absentToday = 0;
        let onLeaveToday = 0;

        todayRecords.forEach(record => {
            record.entries.forEach(entry => {
                if (entry.status === 'present' || entry.status === 'late') presentToday++;
                else if (entry.status === 'absent') absentToday++;
                else if (entry.status === 'on_leave') onLeaveToday++;
                else if (entry.status === 'half_day') {
                    presentToday += 0.5;
                    absentToday += 0.5;
                }
            });
        });

        const rangeRecords = await Attendance.find({
            school: schoolId,
            date: { $gte: start, $lte: end }
        }).lean();

        let totalEntries = 0;
        let totalPresent = 0;

        rangeRecords.forEach(record => {
            record.entries.forEach(entry => {
                totalEntries++;
                if (entry.status === 'present' || entry.status === 'late') {
                    totalPresent++;
                } else if (entry.status === 'half_day') {
                    totalPresent += 0.5;
                }
            });
        });

        const avgAttendancePercentage = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 100;

        return res.status(200).json({
            success: true,
            data: {
                totalStudents,
                presentToday,
                absentToday,
                onLeaveToday,
                avgAttendancePercentage
            }
        });
    } catch (error) {
        console.error('Error in getStudentStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * @desc    Export student attendance to CSV
 * @route   GET /api/principal/attendance-reports/students/export
 */
export const exportStudentAttendance = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);
        const { class: classId, section, search, status } = req.query;

        const matchQuery = {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: start, $lte: end }
        };
        if (classId && classId !== 'All') {
            matchQuery.class = new mongoose.Types.ObjectId(classId);
        }
        if (section && section !== 'All') {
            matchQuery.section = section;
        }

        const aggregate = [
            { $match: matchQuery },
            { $unwind: "$entries" },
            {
                $lookup: {
                    from: "users",
                    localField: "entries.student",
                    foreignField: "_id",
                    as: "studentUser"
                }
            },
            { $unwind: "$studentUser" },
            {
                $lookup: {
                    from: "students",
                    localField: "studentUser._id",
                    foreignField: "user",
                    as: "studentProfile"
                }
            },
            { $unwind: { path: "$studentProfile", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "classes",
                    localField: "class",
                    foreignField: "_id",
                    as: "classDetails"
                }
            },
            { $unwind: { path: "$classDetails", preserveNullAndEmptyArrays: true } }
        ];

        const postFilters = [];
        if (search) {
            postFilters.push({
                $or: [
                    { "studentUser.name": { $regex: search, $options: "i" } },
                    { "studentProfile.rollNo": { $regex: search, $options: "i" } }
                ]
            });
        }
        if (status && status !== 'All') {
            postFilters.push({ "entries.status": status.toLowerCase() });
        }
        if (postFilters.length > 0) {
            aggregate.push({ $match: { $and: postFilters } });
        }

        aggregate.push({
            $project: {
                studentName: "$studentUser.name",
                rollNo: { $ifNull: ["$studentProfile.rollNo", "—"] },
                className: { $ifNull: ["$classDetails.name", "—"] },
                section: { $ifNull: ["$section", "—"] },
                date: "$date",
                status: "$entries.status",
                remarks: { $ifNull: ["$entries.remarks", "—"] }
            }
        });

        const data = await Attendance.aggregate(aggregate);

        let csv = "Student Name,Roll Number,Class,Section,Date,Status,Remarks\n";
        data.forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString();
            const statusStr = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " ") : "—";
            
            const nameEscaped = `"${item.studentName.replace(/"/g, '""')}"`;
            const remarksEscaped = `"${item.remarks.replace(/"/g, '""')}"`;
            
            csv += `${nameEscaped},${item.rollNo},${item.className},${item.section},${dateStr},${statusStr},${remarksEscaped}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=student_attendance_report.csv");
        return res.status(200).send(csv);

    } catch (error) {
        console.error('Error in exportStudentAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== STAFF REPORTS ENDPOINTS ====================

/**
 * @desc    Get staff attendance reports list
 * @route   GET /api/principal/attendance-reports/staff
 */
export const getStaffReports = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);
        const { search, role, status, page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitVal = parseInt(limit);

        const matchQuery = {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: start, $lte: end }
        };

        if (status && status !== 'All') {
            matchQuery.status = status.toLowerCase();
        }

        const aggregate = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "users",
                    localField: "staffId",
                    foreignField: "_id",
                    as: "staffUser"
                }
            },
            { $unwind: "$staffUser" },
            {
                $lookup: {
                    from: "users",
                    localField: "markedBy",
                    foreignField: "_id",
                    as: "markedByDetails"
                }
            },
            { $unwind: { path: "$markedByDetails", preserveNullAndEmptyArrays: true } }
        ];

        const postFilters = [];
        postFilters.push({ "staffUser.role": { $in: ['teacher', 'admin', 'accountant', 'support_staff'] } });

        if (role && role !== 'All') {
            postFilters.push({ "staffUser.role": role.toLowerCase() });
        }
        if (search) {
            postFilters.push({
                $or: [
                    { "staffUser.name": { $regex: search, $options: "i" } },
                    { "staffUser.loginId": { $regex: search, $options: "i" } }
                ]
            });
        }

        if (postFilters.length > 0) {
            aggregate.push({ $match: { $and: postFilters } });
        }

        aggregate.push({
            $facet: {
                totalCount: [{ $count: "count" }],
                paginatedResults: [
                    { $sort: { date: -1, "staffUser.name": 1 } },
                    { $skip: skip },
                    { $limit: limitVal },
                    {
                        $project: {
                            id: "$_id",
                            staffId: "$staffUser._id",
                            name: "$staffUser.name",
                            loginId: { $ifNull: ["$staffUser.loginId", "—"] },
                            role: "$staffUser.role",
                            contact: { $ifNull: ["$staffUser.phone", "—"] },
                            date: "$date",
                            status: "$status",
                            remarks: { $ifNull: ["$remarks", "—"] },
                            markedBy: { $ifNull: ["$markedByDetails.name", "—"] },
                            updatedAt: "$updatedAt"
                        }
                    }
                ]
            }
        });

        const result = await StaffAttendance.aggregate(aggregate);
        const total = result[0].totalCount[0]?.count || 0;
        const staffList = result[0].paginatedResults || [];

        return res.status(200).json({
            success: true,
            data: staffList,
            total,
            page: parseInt(page),
            limit: limitVal
        });

    } catch (error) {
        console.error('Error in getStaffReports:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff attendance reports stats
 * @route   GET /api/principal/attendance-reports/staff/stats
 */
export const getStaffStats = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);

        const totalStaff = await User.countDocuments({
            school: schoolId,
            role: { $in: ['teacher', 'admin', 'accountant', 'support_staff'] },
            status: 'active'
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayRecords = await StaffAttendance.find({
            school: schoolId,
            date: { $gte: todayStart, $lte: todayEnd },
            staffRole: { $in: ['teacher', 'admin', 'accountant', 'support_staff'] }
        }).lean();

        let presentToday = 0;
        let absentToday = 0;
        let onLeaveToday = 0;
        let halfDayToday = 0;

        todayRecords.forEach(record => {
            if (record.status === 'present' || record.status === 'late') presentToday++;
            else if (record.status === 'absent') absentToday++;
            else if (record.status === 'on_leave') onLeaveToday++;
            else if (record.status === 'half_day') halfDayToday++;
        });

        const rangeRecords = await StaffAttendance.find({
            school: schoolId,
            date: { $gte: start, $lte: end },
            staffRole: { $in: ['teacher', 'admin', 'accountant', 'support_staff'] }
        }).lean();

        let totalEntries = rangeRecords.length;
        let totalPresent = 0;

        rangeRecords.forEach(record => {
            if (record.status === 'present' || record.status === 'late') {
                totalPresent++;
            } else if (record.status === 'half_day') {
                totalPresent += 0.5;
            }
        });

        const avgAttendancePercentage = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 100;

        return res.status(200).json({
            success: true,
            data: {
                totalStaff,
                presentToday,
                absentToday,
                onLeaveToday,
                halfDayToday,
                avgAttendancePercentage
            }
        });
    } catch (error) {
        console.error('Error in getStaffStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * @desc    Export staff attendance to CSV
 * @route   GET /api/principal/attendance-reports/staff/export
 */
export const exportStaffAttendance = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School context not found.' });
        }

        const { start, end } = parseDateRange(req.query);
        const { search, role, status } = req.query;

        const matchQuery = {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: start, $lte: end }
        };

        if (status && status !== 'All') {
            matchQuery.status = status.toLowerCase();
        }

        const aggregate = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "users",
                    localField: "staffId",
                    foreignField: "_id",
                    as: "staffUser"
                }
            },
            { $unwind: "$staffUser" },
            {
                $lookup: {
                    from: "users",
                    localField: "markedBy",
                    foreignField: "_id",
                    as: "markedByDetails"
                }
            },
            { $unwind: { path: "$markedByDetails", preserveNullAndEmptyArrays: true } }
        ];

        const postFilters = [];
        postFilters.push({ "staffUser.role": { $in: ['teacher', 'admin', 'accountant', 'support_staff'] } });

        if (role && role !== 'All') {
            postFilters.push({ "staffUser.role": role.toLowerCase() });
        }
        if (search) {
            postFilters.push({
                $or: [
                    { "staffUser.name": { $regex: search, $options: "i" } },
                    { "staffUser.loginId": { $regex: search, $options: "i" } }
                ]
            });
        }

        if (postFilters.length > 0) {
            aggregate.push({ $match: { $and: postFilters } });
        }

        aggregate.push({
            $project: {
                staffName: "$staffUser.name",
                loginId: { $ifNull: ["$staffUser.loginId", "—"] },
                role: "$staffUser.role",
                contact: { $ifNull: ["$staffUser.phone", "—"] },
                date: "$date",
                status: "$status",
                remarks: { $ifNull: ["$remarks", "—"] },
                markedBy: { $ifNull: ["$markedByDetails.name", "—"] }
            }
        });

        const data = await StaffAttendance.aggregate(aggregate);

        let csv = "Staff Name,Login ID,Role,Contact Number,Date,Status,Remarks,Marked By\n";
        data.forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString();
            const statusStr = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " ") : "—";
            const roleStr = item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1).replace("_", " ") : "—";
            
            const nameEscaped = `"${item.staffName.replace(/"/g, '""')}"`;
            const remarksEscaped = `"${item.remarks.replace(/"/g, '""')}"`;
            const markedByEscaped = `"${item.markedBy.replace(/"/g, '""')}"`;
            
            csv += `${nameEscaped},${item.loginId},${roleStr},${item.contact},${dateStr},${statusStr},${remarksEscaped},${markedByEscaped}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=staff_attendance_report.csv");
        return res.status(200).send(csv);

    } catch (error) {
        console.error('Error in exportStaffAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
