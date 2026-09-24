import mongoose from 'mongoose';
import Attendance from '../../models/academic/attendance.model.js';
import User from '../../models/users/user.model.js';

const getSecureSchoolId = (req) => {
    console.log("===== ATTENDANCE DEBUG =====");
    console.log("req.user =", req.user);
    console.log("req.user.school =", req.user?.school);
    console.log("===========================");
console.log("===============");
console.log("USER ID:", req.user?._id);
console.log("ROLE:", req.user?.role);
console.log("SCHOOL:", req.user?.school);
console.log("===============");
    const realSchoolId =
        req.user?.school?._id ||
        req.user?.school;

    if (!realSchoolId) {
        throw new Error("School ID not found");
    }

    return new mongoose.Types.ObjectId(realSchoolId);
};
// --- HELPER: Get week number ---
const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// --- HELPER: Get month string ---
const getMonthString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- HELPER: Get date string ---
const getDateString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * GET /api/principal/attendance/students
 * Get all students with attendance data for the selected period
 */
export const getStudentAttendance = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const {
            class: classFilter,
            section: sectionFilter,
            status: statusFilter,
            period = 'Daily',
            date,
            week,
            month,
            search,
            page = 1,
            limit = 50
        } = req.query;

        // Build query for students
        const studentQuery = {
            school: secureSchoolId,
            role: 'student',
            status: true
        };

        // Apply class and section filters
        if (classFilter && classFilter !== 'All Classes' && classFilter !== '') {
            studentQuery.class = classFilter;
        }

        if (sectionFilter && sectionFilter !== 'All Sections' && sectionFilter !== '') {
            studentQuery.section = sectionFilter;
        }

        // Get all students
        const students = await User.find(studentQuery)
            .select('name email phone class section admissionNo rollNo')
            .lean();

        if (!students || students.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    students: [],
                    summary: {
                        totalStudents: 0,
                        presentAgg: 0,
                        absentAgg: 0,
                        percentage: 0
                    },
                    filters: {
                        classes: [],
                        sections: []
                    },
                    pagination: {
                        total: 0,
                        page: parseInt(page),
                        pages: 0
                    }
                }
            });
        }

        // Determine date range
        let startDate, endDate;
        const today = new Date();
        
        if (period === 'Daily') {
            const selectedDate = date || getDateString(today);
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'Weekly') {
            const weekStr = week || getWeekNumber(today);
            const year = parseInt(weekStr.split('-W')[0]);
            const weekNum = parseInt(weekStr.split('-W')[1]);
            
            const firstDayOfYear = new Date(year, 0, 1);
            const daysOffset = (weekNum - 1) * 7;
            startDate = new Date(firstDayOfYear);
            startDate.setDate(firstDayOfYear.getDate() + daysOffset);
            while (startDate.getDay() !== 1) {
                startDate.setDate(startDate.getDate() - 1);
            }
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const monthStr = month || getMonthString(today);
            const [year, monthNum] = monthStr.split('-').map(Number);
            startDate = new Date(year, monthNum - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, monthNum, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        // Get attendance records
        const studentIds = students.map(s => s._id);
        const attendanceRecords = await Attendance.find({
            school: secureSchoolId,
            studentId: { $in: studentIds },
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        // Map attendance by student
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const key = record.studentId.toString();
            if (!attendanceMap[key]) {
                attendanceMap[key] = [];
            }
            attendanceMap[key].push(record);
        });

        // Process each student
        let processedStudents = students.map(student => {
            const records = attendanceMap[student._id.toString()] || [];
            const totalDays = records.length;
            const present = records.filter(r => r.status === 'present' || r.status === 'Present').length;
            const late = records.filter(r => r.status === 'late' || r.status === 'Late').length;
            const absent = records.filter(r => r.status === 'absent' || r.status === 'Absent').length;
            const holiday = records.filter(r => r.status === 'holiday' || r.status === 'Holiday').length;
            
            const effectiveTotal = totalDays - holiday;
            const presentCount = present + late;
            const percentage = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 0;

            let displayStatus = 'N/A';
            if (period === 'Daily') {
                if (records.length > 0) {
                    const status = records[0].status;
                    displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
                }
            } else {
                if (percentage >= 90) displayStatus = 'High Attendance';
                else if (percentage >= 75) displayStatus = 'Average Attendance';
                else if (percentage > 0) displayStatus = 'Low Attendance';
                else displayStatus = 'N/A';
            }

            return {
                id: student._id,
                name: student.name || 'Unknown',
                rollNo: student.rollNo || 0,
                class: student.class || 'N/A',
                section: student.section || 'N/A',
                admissionNo: student.admissionNo || 'N/A',
                totalDays: effectiveTotal,
                present,
                late,
                absent,
                holiday,
                percentage,
                displayStatus
            };
        });

        // Apply status filter
        if (statusFilter && statusFilter !== 'All' && statusFilter !== '') {
            processedStudents = processedStudents.filter(s => s.displayStatus === statusFilter);
        }

        // Apply search filter
        if (search) {
            processedStudents = processedStudents.filter(s => 
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.admissionNo.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Calculate KPI stats
        let totalWorking = 0;
        let totalPresent = 0;
        let totalLate = 0;

        processedStudents.forEach(s => {
            totalWorking += s.totalDays;
            totalPresent += s.present;
            totalLate += s.late;
        });

        const totalStudentsCount = processedStudents.length;
        const presentSum = totalPresent + totalLate;
        const absentSum = totalWorking - presentSum;
        const aggregatedPercentage = totalWorking > 0 ? Math.round((presentSum / totalWorking) * 100) : 0;

        let presentAgg = presentSum;
        let absentAgg = absentSum;

        if (period === 'Weekly' && totalStudentsCount > 0) {
            presentAgg = Math.round((presentSum / totalStudentsCount) * 10) / 10;
            absentAgg = Math.round((absentSum / totalStudentsCount) * 10) / 10;
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedStudents = processedStudents.slice(skip, skip + parseInt(limit));

        // Get unique classes and sections for filters
        const allStudents = await User.find({
            school: secureSchoolId,
            role: 'student',
            isActive: true
        }).select('class section').lean();

        const classSet = new Set();
        const sectionSet = new Set();

        allStudents.forEach(s => {
            if (s.class) classSet.add(String(s.class));
            if (s.section) sectionSet.add(String(s.section));
        });

        return res.status(200).json({
            success: true,
            data: {
                students: paginatedStudents,
                summary: {
                    totalStudents: totalStudentsCount,
                    presentAgg,
                    absentAgg,
                    percentage: aggregatedPercentage
                },
                filters: {
                    classes: Array.from(classSet).sort((a, b) => Number(a) - Number(b)),
                    sections: Array.from(sectionSet).sort()
                },
                pagination: {
                    total: processedStudents.length,
                    page: parseInt(page),
                    pages: Math.ceil(processedStudents.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getStudentAttendance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/principal/attendance/student/:studentId
 * Get detailed attendance for a specific student
 */
export const getStudentAttendanceDetails = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const { studentId } = req.params;
        const { period = 'Monthly', date, week, month } = req.query;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required' });
        }

        const student = await User.findById(studentId)
            .select('name email phone class section admissionNo rollNo')
            .lean();

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Determine date range
        let startDate, endDate;
        const today = new Date();
        
        if (period === 'Daily') {
            const selectedDate = date || getDateString(today);
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'Weekly') {
            const weekStr = week || getWeekNumber(today);
            const year = parseInt(weekStr.split('-W')[0]);
            const weekNum = parseInt(weekStr.split('-W')[1]);
            
            const firstDayOfYear = new Date(year, 0, 1);
            const daysOffset = (weekNum - 1) * 7;
            startDate = new Date(firstDayOfYear);
            startDate.setDate(firstDayOfYear.getDate() + daysOffset);
            while (startDate.getDay() !== 1) {
                startDate.setDate(startDate.getDate() - 1);
            }
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const monthStr = month || getMonthString(today);
            const [year, monthNum] = monthStr.split('-').map(Number);
            startDate = new Date(year, monthNum - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, monthNum, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        const records = await Attendance.find({
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId),
            date: { $gte: startDate, $lte: endDate }
        })
        .sort({ date: 1 })
        .lean();

        const totalDays = records.length;
        const present = records.filter(r => r.status === 'present' || r.status === 'Present').length;
        const late = records.filter(r => r.status === 'late' || r.status === 'Late').length;
        const absent = records.filter(r => r.status === 'absent' || r.status === 'Absent').length;
        const holiday = records.filter(r => r.status === 'holiday' || r.status === 'Holiday').length;
        
        const effectiveTotal = totalDays - holiday;
        const presentCount = present + late;
        const percentage = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 0;

        return res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    name: student.name,
                    rollNo: student.rollNo || 0,
                    class: student.class || 'N/A',
                    section: student.section || 'N/A',
                    admissionNo: student.admissionNo || 'N/A'
                },
                summary: {
                    totalDays: effectiveTotal,
                    present,
                    late,
                    absent,
                    holiday,
                    percentage
                },
                records: records.map(r => ({
                    date: r.date,
                    status: r.status.charAt(0).toUpperCase() + r.status.slice(1)
                }))
            }
        });

    } catch (error) {
        console.error('Error in getStudentAttendanceDetails:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};