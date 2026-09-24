import mongoose from 'mongoose';
import Notification from '../../models/common/Notification.js';
import Homework from '../../models/academic/homework.model.js';
import Announcement from '../../models/academic/Announcement.model.js';
import ExamSchedule from '../../models/academic/examSchedule.model.js';
import Marksheet from '../../models/academic/marksheet.model.js';
import StudentLeave from '../../models/academic/StudentLeave.model.js';
import Student from '../../models/users/student.model.js';
import Attendance from '../../models/academic/attendance.model.js';
import Notice from '../../models/common/Notice.js';
import StaffMeeting from '../../models/HRM/StaffMeeting.model.js';
import Event from '../../models/common/Event.js';
import Teacher from '../../models/users/teacher.model.js';

// Explicitly register any schemas if needed
import '../../models/modules/Subject.js';

/**
 * @desc    Get student notifications, dynamically syncing from database sources
 * @route   GET /api/student/notifications
 * @access  Private (Student)
 */
export const syncAndGetNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;

        const student = await Student.findOne({ user: userId }).populate('class').populate('section');
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        const newNotifications = [];

        // 1. HOMEWORK
        try {
            const homeworkList = await Homework.find({ class: student.class, isActive: true })
                .populate('subject')
                .populate('teacher', 'name')
                .lean();
            for (const hw of homeworkList) {
                const title = `New Homework: ${hw.title}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `New homework has been assigned for ${hw.subject?.subjectName || hw.subject?.name || 'Subject'}. Due on ${new Date(hw.dueDate).toLocaleDateString()}.`,
                        type: 'notice',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: hw.teacher?.name || 'Teacher',
                        senderRole: 'Teacher',
                        source: 'Teacher',
                        createdAt: hw.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing homework notifications:", err);
        }

        // 2. ANNOUNCEMENTS
        try {
            const announcements = await Announcement.find({ school: schoolId, isActive: true })
                .populate('author', 'name role')
                .lean();
            for (const ann of announcements) {
                // Check class visibility
                if (ann.targetAudience && ann.targetAudience !== "All Classes") {
                    const studentClassName = student.class?.name;
                    if (!studentClassName || !ann.targetAudience.toLowerCase().includes(studentClassName.toLowerCase())) {
                        continue;
                    }
                }

                const title = `Announcement: ${ann.title}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    const role = ann.author?.role === 'principal' ? 'Principal' : 'Teacher';
                    newNotifications.push({
                        user: userId,
                        title,
                        message: ann.description,
                        type: 'notice',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: ann.authorNameLabel || ann.author?.name || 'Teacher',
                        senderRole: role,
                        source: role,
                        createdAt: ann.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing announcements notifications:", err);
        }

        // 3. EXAMS
        try {
            const exams = await ExamSchedule.find({ class: student.class }).populate('examStructure').lean();
            for (const exam of exams) {
                const examName = exam.examStructure?.examName || 'Examination';
                const title = `Exam Scheduled: ${examName}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `The schedule for ${examName} has been published. Check your exams page for details.`,
                        type: 'notice',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: 'School Administration',
                        senderRole: 'Staff',
                        source: 'School',
                        createdAt: exam.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing exams notifications:", err);
        }

        // 4. RESULTS
        try {
            const marksheets = await Marksheet.find({ student: userId, status: 'published' }).populate({ path: 'examSchedule', populate: { path: 'examStructure' } }).lean();
            for (const sheet of marksheets) {
                const examName = sheet.examSchedule?.examStructure?.examName || 'Annual';
                const title = `Result Published: ${examName}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `Your marksheet for ${examName} has been published. Overall Score: ${sheet.percentage}%, Grade: ${sheet.overallGrade || 'N/A'}.`,
                        type: 'result',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: 'Academic Office',
                        senderRole: 'Staff',
                        source: 'School',
                        createdAt: sheet.publishedAt || sheet.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing results notifications:", err);
        }

        // 5. LEAVE STATUS
        try {
            const leaves = await StudentLeave.find({ student: student._id }).lean();
            for (const leave of leaves) {
                const title = `Leave Request: ${leave.status.toUpperCase()}`;
                const existing = await Notification.findOne({ user: userId, title, message: new RegExp(leave._id.toString()) });
                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `Your leave request for ${new Date(leave.startDate).toLocaleDateString()} (${leave.reason}) has been ${leave.status}. [ID: ${leave._id}]`,
                        type: 'leave',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: 'Leave Department',
                        senderRole: 'System',
                        source: 'System',
                        createdAt: leave.updatedAt || leave.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing leave notifications:", err);
        }

        // 6. LOW ATTENDANCE ALERTS
        try {
            const rawRecords = await Attendance.find({
                school: schoolId,
                academicYear: student.academicYear,
                class: student.class?._id,
                "entries.student": userId
            }).lean();
            let totalDays = 0, presentCount = 0;
            rawRecords.forEach(record => {
                const entry = record.entries.find(e => e.student.toString() === userId.toString());
                if (entry) {
                    totalDays++;
                    if (entry.status === 'present' || entry.status === 'half_day' || entry.status === 'on_leave' || entry.status === 'late') {
                        presentCount++;
                    }
                }
            });
            const attendancePercentage = totalDays > 0 ? (presentCount / totalDays) * 100 : 100;
            if (attendancePercentage < 75 && totalDays >= 5) {
                const title = `Low Attendance Alert`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `Warning: Your current attendance is ${attendancePercentage.toFixed(1)}%, which is below the required 75%. Please attend classes regularly.`,
                        type: 'attendance',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: 'Attendance System',
                        senderRole: 'System',
                        source: 'System',
                        createdAt: new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing attendance notifications:", err);
        }

        // 7. PRINCIPAL / SUPER ADMIN NOTICES
        try {
            const notices = await Notice.find({
                school: schoolId,
                status: 'published',
                targetAudience: { $in: ['all', 'students'] }
            }).populate('createdBy', 'name role').lean();
            
            for (const notice of notices) {
                const title = `Notice: ${notice.title}`;
                const existing = await Notification.findOne({ user: userId, title, message: notice.content });
                if (!existing) {
                    const isSuperAdmin = notice.createdBy?.role === 'superadmin';
                    newNotifications.push({
                        user: userId,
                        title,
                        message: notice.content,
                        type: 'notice',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: notice.createdBy?.name || (isSuperAdmin ? 'Super Admin' : 'Principal'),
                        senderRole: isSuperAdmin ? 'Super Admin' : 'Principal',
                        source: isSuperAdmin ? 'Super Admin' : 'Principal',
                        createdAt: notice.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing notice notifications:", err);
        }

        // 8. PRINCIPAL MEETINGS
        try {
            const meetings = await StaffMeeting.find({
                school: schoolId,
                status: { $in: ['scheduled', 'ongoing'] },
                targetRoles: { $in: ['all', 'students'] }
            }).populate('createdBy', 'name role').lean();

            for (const meeting of meetings) {
                // Check class & section visibility
                if (meeting.className && meeting.className !== "All Classes") {
                    const studentClassName = student.class?.name;
                    if (!studentClassName || studentClassName.toLowerCase() !== meeting.className.toLowerCase()) {
                        continue;
                    }
                    if (meeting.sectionName && meeting.sectionName !== "All Sections") {
                        const studentSectionName = student.section?.name;
                        if (!studentSectionName || studentSectionName.toLowerCase() !== meeting.sectionName.toLowerCase()) {
                            continue;
                        }
                    }
                }

                const title = `Meeting: ${meeting.title}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    const agenda = meeting.agenda || 'No agenda provided';
                    const venue = meeting.venue || 'School Campus';
                    const timeStr = new Date(meeting.scheduledAt).toLocaleString();
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `Meeting Agenda: ${agenda}. Scheduled time: ${timeStr}. Venue: ${venue}.`,
                        type: 'notice',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: meeting.createdBy?.name || 'Principal',
                        senderRole: 'Principal',
                        source: 'Principal',
                        createdAt: meeting.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing meeting notifications:", err);
        }

        // 9. PRINCIPAL EVENTS
        try {
            const events = await Event.find({
                school: schoolId,
                status: { $in: ['Scheduled', 'Ongoing', 'Mandatory'] }
            }).lean();

            for (const event of events) {
                const title = `Event: ${event.title}`;
                const existing = await Notification.findOne({ user: userId, title });
                if (!existing) {
                    const desc = event.description || 'No description provided';
                    const dateStr = new Date(event.eventDate).toLocaleDateString();
                    const venue = event.venue || 'School Campus';
                    newNotifications.push({
                        user: userId,
                        title,
                        message: `Event: ${desc}. Date: ${dateStr} at ${event.startTime || '09:00'}. Venue: ${venue}.`,
                        type: 'event',
                        metadata: { student: student._id, class: student.class },
                        school: schoolId,
                        senderName: event.createdBy || 'Principal',
                        senderRole: 'Principal',
                        source: 'Principal',
                        createdAt: event.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing event notifications:", err);
        }

        // 10. INCOMING MESSAGES FROM TEACHERS
        try {
            const Message = mongoose.model('Message');
            const messages = await Message.find({ receiver: userId })
                .populate('sender', 'name role avatar')
                .sort({ createdAt: -1 })
                .lean();

            const teacherUserIds = messages.map(m => m.sender?._id).filter(Boolean);
            const teacherProfiles = await Teacher.find({ user: { $in: teacherUserIds } })
                .populate('subjects', 'name')
                .lean();
            
            const teacherProfileMap = new Map(teacherProfiles.map(t => [t.user?.toString(), t]));

            for (const msg of messages) {
                const title = 'New Message';
                const existing = await Notification.findOne({ user: userId, "metadata.messageId": msg._id });
                if (!existing) {
                    const teacherProfile = teacherProfileMap.get(msg.sender?._id?.toString());
                    const subjectName = teacherProfile?.subjects?.[0]?.name || 'General';
                    
                    newNotifications.push({
                        user: userId,
                        title,
                        message: msg.text,
                        type: 'message',
                        metadata: { 
                            student: student._id, 
                            class: student.class, 
                            messageId: msg._id, 
                            senderId: msg.sender?._id,
                            subject: subjectName,
                            photo: teacherProfile?.photo || msg.sender?.avatar || ''
                        },
                        school: schoolId,
                        senderName: msg.sender?.name || 'Teacher',
                        senderRole: 'Teacher',
                        source: 'Teacher Message',
                        createdAt: msg.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing message notifications:", err);
        }

        // Insert new notifications into DB
        if (newNotifications.length > 0) {
            await Notification.insertMany(newNotifications);
        }

        // Fetch all notifications sorted newest first
        const dbNotifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        const notifications = dbNotifications.map(n => {
            let senderName = n.senderName || '';
            let senderRole = n.senderRole || '';
            let source = n.source || '';

            if (!senderRole) {
                const titleLower = (n.title || '').toLowerCase();
                if (titleLower.startsWith('new homework:') || titleLower.startsWith('announcement:')) {
                    senderName = senderName || 'Teacher';
                    senderRole = 'Teacher';
                    source = 'Teacher';
                } else if (titleLower.startsWith('notice:')) {
                    senderName = senderName || 'Principal';
                    senderRole = 'Principal';
                    source = 'Principal';
                } else if (titleLower.startsWith('meeting:')) {
                    senderName = senderName || 'Principal';
                    senderRole = 'Principal';
                    source = 'Principal';
                } else if (titleLower.startsWith('event:')) {
                    senderName = senderName || 'Principal';
                    senderRole = 'Principal';
                    source = 'Principal';
                } else if (n.type === 'attendance' || n.type === 'leave') {
                    senderName = senderName || 'System';
                    senderRole = 'System';
                    source = 'System';
                } else {
                    senderName = senderName || 'School Administration';
                    senderRole = 'Staff';
                    source = 'School';
                }
            }

            return {
                ...n,
                senderName,
                senderRole,
                source
            };
        });

        return res.status(200).json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error("Error in syncAndGetNotifications:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/student/notifications/:id/read
 * @access  Private (Student)
 */
export const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationId = req.params.id;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({ success: true, data: notification });
    } catch (error) {
        console.error("Error in markNotificationRead:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark all unread notifications for student as read
 * @route   POST /api/student/notifications/mark-all-read
 * @access  Private (Student)
 */
export const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );

        return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error("Error in markAllNotificationsRead:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
