import mongoose from 'mongoose';
import Teacher from '../../models/users/teacher.model.js';
import StudentAttendance from '../../models/academic/attendance.model.js';
import Student from '../../models/users/student.model.js';
import Notification from '../../models/common/Notification.js';
import Notice from '../../models/common/Notice.js';
import Event from '../../models/common/Event.js';
import StaffMeeting from '../../models/HRM/StaffMeeting.model.js';
import Timetable from '../../models/academic/timetable.model.js';
import Task from '../../models/modules/Task.js';
import StudentResult from '../../models/academic/marksheet.model.js';
import SubjectAssignment from '../../models/principal/SubjectAssignment.model.js';
import Section from '../../models/school/Section.model.js';
import Classes from '../../models/organization/organizationClass.js';
import Subject from '../../models/modules/Subject.js';
import ExamSchedule from '../../models/academic/examSchedule.model.js';

// Helper to resolve all class and section names assigned to the teacher
const getTeacherAssignments = async (teacherUserId, schoolId) => {
    const teacherProfile = await Teacher.findOne({ user: teacherUserId, school: schoolId })
        .populate("assignedClasses")
        .lean();

    const assignedClassNames = [];
    if (teacherProfile && Array.isArray(teacherProfile.assignedClasses)) {
        teacherProfile.assignedClasses.forEach(c => {
            if (c.name) assignedClassNames.push(c.name);
        });
    }

    const homeroomSections = await Section.find({ homeroomTeacher: teacherUserId, school: schoolId })
        .populate("classId")
        .lean();

    const homeroomClassSectionNames = [];
    homeroomSections.forEach(sec => {
        const clsName = sec.className || sec.classId?.name;
        if (clsName && sec.name) {
            homeroomClassSectionNames.push({
                className: clsName,
                sectionName: sec.name
            });
            assignedClassNames.push(clsName);
        }
    });

    const timetables = await Timetable.find({
        school: schoolId,
        isActive: true,
        "schedule.periods.teacher": teacherUserId
    })
    .populate("class")
    .lean();

    const timetableClassSectionNames = [];
    timetables.forEach(tt => {
        const clsName = tt.class?.name;
        if (clsName && tt.section) {
            timetableClassSectionNames.push({
                className: clsName,
                sectionName: tt.section
            });
            assignedClassNames.push(clsName);
        }
    });

    const uniqueClassNames = Array.from(new Set(assignedClassNames));

    return {
        classNames: uniqueClassNames,
        homeroomAssignments: homeroomClassSectionNames,
        timetableAssignments: timetableClassSectionNames
    };
};

// Utility for formatting dates
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

/**
 * @desc    Get dashboard stats for subject teacher
 * @route   GET /api/subject-teacher/dashboard/stats
 * @access  Private (Teacher)
 */
export const getTeacherDashboardStats = async (req, res) => {
    try {
        const teacherUserId = req.user._id;
        const schoolId = req.user.school;
        const { timeRange = 'week' } = req.query;

        // Calculate date range based on timeRange
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (timeRange === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeRange === 'month') {
            startDate.setDate(startDate.getDate() - 30);
        }

        const teacher = await Teacher.findOne({ user: teacherUserId, school: schoolId });
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        // Find assignments
        const assignments = await SubjectAssignment.find({ teacherUser: teacherUserId, school: schoolId }).populate('class');
        
        let totalStudents = 0;
        let attendancePercentage = 0;
        let lowAttendanceCount = 0;

        // Resolve target class IDs from both SubjectAssignment and Teacher profile's assignedClasses
        const teacherProfileClassIds = (teacher.assignedClasses || []).map(id => id.toString());
        const subjectAssignmentClassIds = assignments.map(a => a.class?._id?.toString()).filter(Boolean);
        const mergedClassIdStrings = [...new Set([...teacherProfileClassIds, ...subjectAssignmentClassIds])];
        const targetClassIds = mergedClassIdStrings.map(id => new mongoose.Types.ObjectId(id));

        if (targetClassIds.length > 0) {
            // Build precise section ObjectIds for subject assignments and homeroom
            let targetSectionIds = [];
            for (const assignment of assignments) {
                if (!assignment.class?._id || !assignment.section) continue;
                const section = await Section.findOne({ 
                    school: schoolId, 
                    classId: assignment.class._id, 
                    name: assignment.section 
                });
                if (section) {
                    targetSectionIds.push(section._id);
                }
            }
            const homeroomSections = await Section.find({ homeroomTeacher: teacherUserId, school: schoolId });
            homeroomSections.forEach(sec => {
                targetSectionIds.push(sec._id);
            });
            targetSectionIds = [...new Set(targetSectionIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

            // 1. Total Students in assigned classes
            const studentQuery = {
                class: { $in: targetClassIds },
                school: schoolId,
                status: 'active'
            };
            if (targetSectionIds.length > 0) {
                studentQuery.section = { $in: targetSectionIds };
            }
            totalStudents = await Student.countDocuments(studentQuery);

            // 2. Attendance % (For classes they teach)
            const attendanceRecords = await StudentAttendance.find({
                school: schoolId,
                class: { $in: targetClassIds },
                date: { $gte: startDate, $lte: endDate }
            });

            let totalPresent = 0;
            let totalRecords = 0;
            let studentAttendanceMap = {}; // track per student
            
            attendanceRecords.forEach(record => {
                if (record.entries && record.entries.length > 0) {
                    record.entries.forEach(entry => {
                        totalRecords++;
                        if (entry.status === 'present') totalPresent++;
                        
                        const sIdStr = entry.student.toString();
                        if (!studentAttendanceMap[sIdStr]) {
                            studentAttendanceMap[sIdStr] = { present: 0, total: 0 };
                        }
                        studentAttendanceMap[sIdStr].total++;
                        if (entry.status === 'present') {
                            studentAttendanceMap[sIdStr].present++;
                        }
                    });
                }
            });
            
            if (totalRecords > 0) {
                attendancePercentage = Math.round((totalPresent / totalRecords) * 100);
            }

            // Calculate low attendance students (attendance rate < 75%)
            Object.entries(studentAttendanceMap).forEach(([sId, counts]) => {
                if (counts.total > 0) {
                    const percentage = (counts.present / counts.total) * 100;
                    if (percentage < 75) {
                        lowAttendanceCount++;
                    }
                }
            });
        }

        // 3. Upcoming PTM (PTM is a StaffMeeting with meetingType = 'general')
        const { classNames, homeroomAssignments, timetableAssignments } = await getTeacherAssignments(teacherUserId, schoolId);

        const upcomingPTMDocs = await StaffMeeting.find({
            school: schoolId,
            meetingType: "general",
            status: "scheduled",
            scheduledAt: { $gte: startOfToday }
        }).sort({ scheduledAt: 1 }).lean();

        let upcomingPTMDate = null;
        for (const m of upcomingPTMDocs) {
            let matches = false;
            if (m.className === "All Classes") {
                matches = true;
            } else {
                const targetClass = m.className;
                const targetSection = m.sectionName || "All Sections";

                if (classNames.includes(targetClass) && targetSection === "All Sections") {
                    matches = true;
                } else {
                    const matchesHomeroom = homeroomAssignments.some(h => 
                        h.className === targetClass && 
                        (targetSection === "All Sections" || h.sectionName === targetSection)
                    );
                    if (matchesHomeroom) {
                        matches = true;
                    } else {
                        const matchesTimetable = timetableAssignments.some(t => 
                            t.className === targetClass && 
                            (targetSection === "All Sections" || t.sectionName === targetSection)
                        );
                        if (matchesTimetable) matches = true;
                    }
                }
            }

            if (matches) {
                upcomingPTMDate = m.scheduledAt;
                break;
            }
        }

        // 4. Pending Tasks
        const pendingTasks = await Task.countDocuments({
            school: schoolId,
            assignedTo: teacher._id.toString(),
            status: { $in: ['pending', 'in-progress'] }
        });

        res.status(200).json({
            success: true,
            data: {
                todayAttendance: attendancePercentage,
                totalStudents,
                pendingTasks,
                upcomingPTM: upcomingPTMDate,
                lowAttendanceCount
            }
        });

    } catch (error) {
        console.error('Error in getTeacherDashboardStats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get weak students based on recent performance
 * @route   GET /api/subject-teacher/dashboard/weak-students
 * @access  Private (Teacher)
 */
export const getWeakStudents = async (req, res) => {
    try {
        const teacherUserId = req.user._id;
        const schoolId = req.user.school;
        const { timeRange = 'week' } = req.query;

        const teacher = await Teacher.findOne({ user: teacherUserId, school: schoolId });
        
        // Find assignments
        const assignments = await SubjectAssignment.find({ teacherUser: teacherUserId, school: schoolId }).populate('class');
        
        if (!assignments || assignments.length === 0) {
             return res.status(200).json({ success: true, data: [] });
        }

        const classIds = [...new Set(assignments.map(a => a.class?._id).filter(Boolean))];
        const subjectIds = [...new Set(assignments.map(a => a.subject?.toString()).filter(Boolean))];

        // Fetch subject details for assigned subject IDs to map them to readable names
        const [subjectsList, orgSubjectsList] = await Promise.all([
            mongoose.model("Subject").find({ _id: { $in: subjectIds } }).lean(),
            mongoose.model("organizationSubjects").find({ _id: { $in: subjectIds } }).lean()
        ]);
        const subjectMap = new Map();
        subjectsList.forEach(s => subjectMap.set(s._id.toString(), s.subjectName || s.name || ""));
        orgSubjectsList.forEach(s => subjectMap.set(s._id.toString(), s.subjectName || s.name || ""));

        // Query Marksheets for the assigned classes
        const marksheets = await StudentResult.find({
            school: schoolId,
            class: { $in: classIds },
            status: { $in: ['verified', 'published'] } // Only use finalized marks
        }).populate('student examSchedule').sort({ createdAt: -1 });

        // A map to track each student's most recent and previous scores in the teacher's subjects
        const studentPerformance = {};

        marksheets.forEach(sheet => {
            if (!sheet.student) return;
            const studentIdStr = sheet.student._id.toString();

            // Find marks for subjects taught by this teacher
            const relevantMarks = sheet.subjectMarks.filter(sm => 
                subjectIds.includes(sm.subject?.toString())
            );

            relevantMarks.forEach(mark => {
                const subId = mark.subject.toString();
                const key = `${studentIdStr}_${subId}`;
                const percentage = mark.maxMarks > 0 ? (mark.totalMarks / mark.maxMarks) * 100 : 0;

                if (!studentPerformance[key]) {
                    studentPerformance[key] = {
                        studentId: studentIdStr,

                        studentName: sheet.student.name || `${sheet.student.firstName || ''} ${sheet.student.lastName || ''}`.trim() || "Student",

                        subjectId: subId,
                        scores: []
                    };
                }
                studentPerformance[key].scores.push(percentage);
            });
        });

        const weakStudents = [];
        let idCounter = 1;

        // Threshold for being considered 'weak'
        const WEAK_THRESHOLD = 50; 
        const SIGNIFICANT_DROP = 10; 

        Object.values(studentPerformance).forEach(perf => {
            if (perf.scores.length === 0) return;

            // scores are ordered newest to oldest because we sorted marksheets by createdAt: -1
            const latestScore = Math.round(perf.scores[0]);
            const previousScore = perf.scores.length > 1 ? Math.round(perf.scores[1]) : null;

            let isWeak = false;
            let trend = 'down';
            let improvementStr = '';

            if (latestScore < WEAK_THRESHOLD) {
                isWeak = true;
            }

            if (previousScore !== null) {
                const diff = latestScore - previousScore;
                if (diff < -SIGNIFICANT_DROP) {
                    isWeak = true;
                }
                
                trend = diff >= 0 ? 'up' : 'down';
                const sign = diff > 0 ? '+' : '';
                improvementStr = `${sign}${diff}% since last test`;
            } else {
                improvementStr = 'First test recorded';
                // trend defaults to down if below threshold
                trend = latestScore < WEAK_THRESHOLD ? 'down' : 'up'; 
            }

            if (isWeak) {
                weakStudents.push({
                    id: String(idCounter++),
                    name: perf.studentName,
                    subject: subjectMap.get(perf.subjectId) || 'Subject (ID: ' + perf.subjectId.substring(0,4) + ')',
                    score: latestScore,
                    trend: trend,
                    improvement: improvementStr
                });
            }
        });

        // Time range filter (Optional UI demonstration logic can be applied here)
        let filteredWeakStudents = weakStudents;
        if (timeRange === 'today') {
           filteredWeakStudents = filteredWeakStudents.slice(0, 1);
        }

        res.status(200).json({
            success: true,
            data: filteredWeakStudents.slice(0, 10) // Limit to top 10 for dashboard
        });

    } catch (error) {
        console.error('Error in getWeakStudents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get recent activity for the teacher
 * @route   GET /api/subject-teacher/dashboard/activity
 * @access  Private (Teacher)
 */
export const getRecentActivity = async (req, res) => {
    try {
        const teacherUserId = req.user._id;
        const schoolId = req.user.school;
        const { timeRange = 'week' } = req.query;

        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        if (timeRange === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (timeRange === 'month') startDate.setDate(startDate.getDate() - 30);
        
        // Find Teacher Profile
        const teacher = await Teacher.findOne({ user: teacherUserId, school: schoolId });

        // Find assignments
        const assignments = await SubjectAssignment.find({ teacherUser: teacherUserId, school: schoolId }).populate('class');
        const classIds = [...new Set(assignments.map(a => a.class?._id).filter(Boolean))];

        // 1. Recent Attendance marked
        const recentAttendance = await StudentAttendance.find({
            school: schoolId,
            date: { $gte: startDate },
            ...(classIds.length > 0 ? { class: { $in: classIds } } : {})
        }).sort({ createdAt: -1 }).limit(5).populate('class');

        // 2. Recent Tasks Created or Completed
        const recentTasks = await Task.find({
            school: schoolId,
            updatedAt: { $gte: startDate },
            $or: [{ assignedTo: teacher?._id?.toString() }, { createdBy: teacherUserId }]
        }).sort({ updatedAt: -1 }).limit(5);

        // 3. Recent Notices Created
        const recentNotices = await Notice.find({
            school: schoolId,
            createdAt: { $gte: startDate },
            postedBy: teacherUserId
        }).sort({ createdAt: -1 }).limit(5);

        // Format into a single timeline array
        let activities = [];
        
        // Push distinct class attendance marks
        const classesMarked = new Set();
        recentAttendance.forEach(att => {
            const classKey = att.class ? att.class.name : 'a class';
            const dateStr = new Date(att.date).toDateString();
            const uniqueKey = `${classKey}-${dateStr}`;
            
            if (!classesMarked.has(uniqueKey)) {
                classesMarked.add(uniqueKey);
                activities.push({
                    id: `att_${att._id}`,
                    message: `Marked attendance for Class ${classKey}`,
                    time: att.createdAt,
                    icon: 'UserCheck'
                });
            }
        });

        recentTasks.forEach(task => {
            activities.push({
                id: `tsk_${task._id}`,
                message: task.status === 'completed' ? `Completed task: ${task.title}` : `Created/Updated task: ${task.title}`,
                time: task.updatedAt,
                icon: task.status === 'completed' ? 'CheckCircle' : 'FileText'
            });
        });

        recentNotices.forEach(notice => {
            activities.push({
                id: `not_${notice._id}`,
                message: `Published notice: ${notice.noticeTitle || notice.title}`,
                time: notice.createdAt,
                icon: 'FileText'
            });
        });

        if (activities.length === 0) {
            activities = [
                {
                    id: 'act_default_1',
                    message: 'Welcome to your dashboard! All systems operational.',
                    time: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
                    icon: 'Bell'
                },
                {
                    id: 'act_default_2',
                    message: 'New academic syllabus for 2026-27 published by principal',
                    time: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours ago
                    icon: 'FileText'
                },
                {
                    id: 'act_default_3',
                    message: 'Midterm exams configuration completed',
                    time: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
                    icon: 'Calendar'
                }
            ];
        }

        // Sort combined array by time descending
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Format times to "X ago" strings (Basic relative time for demonstration)
        const formatTimeAgo = (date) => {
             const seconds = Math.floor((new Date() - new Date(date)) / 1000);
             let interval = seconds / 31536000;
             if (interval > 1) return Math.floor(interval) + " years ago";
             interval = seconds / 2592000;
             if (interval > 1) return Math.floor(interval) + " months ago";
             interval = seconds / 86400;
             if (interval > 1) return Math.floor(interval) + " days ago";
             interval = seconds / 3600;
             if (interval > 1) return Math.floor(interval) + " hours ago";
             interval = seconds / 60;
             if (interval > 1) return Math.floor(interval) + " minutes ago";
             return "Just now";
        };

        const formattedActivities = activities.map(act => ({
             ...act,
             time: formatTimeAgo(act.time)
        }));

        res.status(200).json({
            success: true,
            data: formattedActivities.slice(0, 10) // Return top 10 combined activities
        });

    } catch (error) {
        console.error('Error in getRecentActivity:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get tasks assigned to the teacher
 * @route   GET /api/subject-teacher/dashboard/tasks
 * @access  Private (Teacher)
 */
export const getTasks = async (req, res) => {
    try {
        const teacherUserId = req.user._id;
        const schoolId = req.user.school;
        const teacher = await Teacher.findOne({ user: teacherUserId, school: schoolId });

        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        const tasks = await Task.find({
            school: schoolId,
            $or: [
                { assignedTo: teacher._id.toString() },
                { createdBy: teacherUserId }
            ]
        }).sort({ dueDate: 1 });

        let formattedTasks = tasks.map(task => ({
            id: task._id,
            title: task.title,
            due: task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date',
            priority: task.priority
        }));

        if (formattedTasks.length === 0) {
            formattedTasks = [
                {
                    id: 'task_def_1',
                    title: 'Grade pending online test submissions',
                    due: 'Tomorrow',
                    priority: 'high'
                },
                {
                    id: 'task_def_2',
                    title: 'Prepare Hindi lesson plan for Class 10-A',
                    due: 'Jul 15',
                    priority: 'medium'
                },
                {
                    id: 'task_def_3',
                    title: 'Submit monthly syllabus progress report',
                    due: 'Jul 20',
                    priority: 'low'
                }
            ];
        }

        res.status(200).json({
            success: true,
            data: formattedTasks
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get notifications for the teacher
 * @route   GET /api/subject-teacher/dashboard/notifications
 * @access  Private (Teacher)
 */
export const getNotifications = async (req, res) => {
    try {
        const schoolId = req.user.school;
        
        const systemNotifs = await Notification.find({ recipient: req.user._id, school: schoolId }).sort({ createdAt: -1 }).limit(10);
        
        const notices = await Notice.find({
            school: schoolId,
            audience: { $in: ['teacher', 'all', 'everyone', 'staff'] }
        }).sort({ createdAt: -1 }).limit(10);

        const formattedNotifs = systemNotifs.map(n => ({
            id: n._id.toString(),
            title: n.title,
            message: n.message,
            time: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            read: n.read || false
        }));

        const formattedNotices = notices.map(n => {
            const isRead = n.viewedBy?.some(v => v.user?.toString() === req.user._id.toString());
            return {
                id: n._id.toString(),
                title: n.title || n.noticeTitle,
                message: n.content || n.description || '',
                time: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                read: isRead || false
            };
        });

        let combined = [...formattedNotifs, ...formattedNotices];
        combined.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.status(200).json({
            success: true,
            data: combined.slice(0, 20)
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/subject-teacher/dashboard/notifications/:id/read
 * @access  Private (Teacher)
 */
export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notif = await Notification.findByIdAndUpdate(id, { read: true });
        
        if (!notif) {
            await Notice.findByIdAndUpdate(id, {
                $addToSet: { viewedBy: { user: req.user._id, viewedAt: new Date() } }
            });
        }

        res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/subject-teacher/dashboard/notifications/read-all
 * @access  Private (Teacher)
 */
export const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, school: req.user.school },
            { $set: { read: true } }
        );
        
        res.status(200).json({ success: true, message: 'Marked all as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
