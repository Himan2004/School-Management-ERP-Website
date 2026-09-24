import Teacher from '../../models/users/teacher.model.js';
import StudentLeave from '../../models/academic/StudentLeave.model.js';
import Homework from '../../models/academic/homework.model.js';
import HomeworkSubmission from '../../models/academic/HomeworkSubmission.model.js';
import Notice from '../../models/common/Notice.js';
import Message from '../../models/communication/Message.model.js';
import Notification from '../../models/common/Notification.js';
import Student from '../../models/users/student.model.js';
import Parent from '../../models/users/parent.model.js';
import Ticket from '../../models/common/Ticket.js';

/**
 * @desc    Sync notifications from all sources and get them for the teacher
 * @route   GET /api/teacher/notifications
 * @access  Private (Teacher)
 */
export const syncAndGetTeacherNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school;

        // 1. Fetch teacher profile to get assigned classes
        const teacherProfile = await Teacher.findOne({ user: userId }).lean();
        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        const assignedClassIds = teacherProfile.assignedClasses || [];
        const newNotifications = [];

        // --- 1. STUDENT LEAVE REQUESTS ---
        if (assignedClassIds.length > 0) {
            try {
                const leaves = await StudentLeave.find({
                    class: { $in: assignedClassIds },
                    school: schoolId
                }).populate('student', 'name').lean();

                const studentUserIds = leaves.map(r => r.student?._id).filter(Boolean);
                const studentProfiles = await Student.find({ user: { $in: studentUserIds } })
                    .populate('parent', 'fatherName motherName')
                    .lean();

                const studentMap = new Map(studentProfiles.map(s => [s.user?.toString(), s]));

                for (const leave of leaves) {
                    const profile = studentMap.get(leave.student?._id?.toString());
                    const parentName = profile?.parent?.fatherName || profile?.parent?.motherName || "Parent/Guardian";

                    const title = `Leave Request: ${leave.status.toUpperCase()}`;
                    const message = `Student: ${leave.student?.name || 'Unknown'} • Parent: ${parentName} • Reason: ${leave.reason}`;
                    
                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        message
                    });

                    if (!existing) {
                        newNotifications.push({
                            user: userId,
                            title,
                            message,
                            type: 'leave',
                            metadata: { student: leave.student?._id, class: leave.class, leaveId: leave._id },
                            school: schoolId,
                            senderName: leave.student?.name || 'Student',
                            senderRole: 'Student',
                            source: 'Leave Request',
                            createdAt: leave.updatedAt || leave.createdAt || new Date()
                        });
                    }
                }
            } catch (err) {
                console.error("Error syncing student leave for teacher notifications:", err);
            }
        }

        // --- 2. ASSIGNMENT SUBMISSIONS ---
        try {
            const teacherHomeworks = await Homework.find({ teacher: userId, isActive: true }).lean();
            const homeworkIds = teacherHomeworks.map(h => h._id);

            if (homeworkIds.length > 0) {
                const submissions = await HomeworkSubmission.find({
                    homework: { $in: homeworkIds }
                }).populate('student', 'name').lean();

                const hwMap = new Map(teacherHomeworks.map(h => [h._id.toString(), h]));

                for (const sub of submissions) {
                    const hw = hwMap.get(sub.homework.toString());
                    if (!hw) continue;

                    if (sub.status === 'graded') continue;

                    const isLate = sub.status === 'late' || new Date(sub.submittedAt) > new Date(hw.dueDate);
                    const title = isLate ? 'Late Assignment Submission' : 'Assignment Submission Received';
                    const message = `Student ${sub.student?.name || 'Unknown'} submitted "${hw.title}".`;

                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        message
                    });

                    if (!existing) {
                        newNotifications.push({
                            user: userId,
                            title,
                            message,
                            type: 'notice',
                            metadata: { student: sub.student?._id, class: hw.class, homeworkId: hw._id },
                            school: schoolId,
                            senderName: sub.student?.name || 'Student',
                            senderRole: 'Student',
                            source: 'Assignment Activity',
                            createdAt: sub.submittedAt || sub.createdAt || new Date()
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing assignment submission teacher notifications:", err);
        }

        // --- 3. OFFICIAL NOTICES & ANNOUNCEMENTS ---
        try {
            const notices = await Notice.find({
                $or: [{ school: schoolId }, { branch: schoolId }],
                status: { $regex: /^(published|active)$/i }
            }).populate('createdBy', 'name role').lean();

            for (const notice of notices) {
                const aud = notice.audience || notice.targetAudience || notice.target || [];
                const audString = (Array.isArray(aud) ? aud.join(',') : String(aud)).toLowerCase();

                const isTarget = audString.includes('teacher') || 
                                 audString.includes('everyone') || 
                                 audString.includes('all') || 
                                 audString.includes('staff') ||
                                 audString === '' || 
                                 audString === 'undefined';

                if (isTarget) {
                    const title = `Official Notice: ${notice.title}`;
                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        message: notice.content
                    });

                    if (!existing) {
                        const isSuperAdmin = notice.createdBy?.role === 'superadmin';
                        newNotifications.push({
                            user: userId,
                            title,
                            message: notice.content,
                            type: 'notice',
                            school: schoolId,
                            senderName: notice.createdBy?.name || (isSuperAdmin ? 'Super Admin' : 'Principal'),
                            senderRole: isSuperAdmin ? 'Super Admin' : 'Principal',
                            source: isSuperAdmin ? 'Super Admin' : 'Principal',
                            createdAt: notice.createdAt || new Date()
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing official notices teacher notifications:", err);
        }

        // --- 4. MESSAGES FROM PRINCIPAL / ADMIN / PARENT ---
        try {
            const unreadMessages = await Message.find({
                receiver: userId,
                status: { $ne: 'read' }
            }).populate('sender', 'name role').lean();

            for (const msg of unreadMessages) {
                const senderRole = msg.sender?.role || '';
                if (senderRole === 'principal' || senderRole === 'admin' || senderRole === 'parent') {
                    const defaultSenderName = senderRole === 'parent' ? 'Parent' : 'Administrator';
                    const senderName = msg.sender?.name || defaultSenderName;
                    const title = `New Message from ${senderName}`;
                    const message = msg.text;

                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        message
                    });

                    if (!existing) {
                        newNotifications.push({
                            user: userId,
                            title,
                            message,
                            type: 'notice',
                            school: schoolId,
                            senderName,
                            senderRole: senderRole.charAt(0).toUpperCase() + senderRole.slice(1),
                            source: 'Messages',
                            createdAt: msg.createdAt || new Date()
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing message teacher notifications:", err);
        }

        // --- 5. SUPPORT TICKETS / COMPLAINTS ---
        try {
            const tickets = await Ticket.find({ 
                school: schoolId,
                $or: [
                    { receiverId: userId },
                    { assignedTo: userId }
                ]
            }).populate('raisedBy', 'name').lean();

            for (const ticket of tickets) {
                const creatorId = ticket.raisedBy?._id || ticket.raisedBy;
                
                let source = 'Parent Query';
                let type = 'ticket';

                if (ticket.raisedByRole === 'student') {
                    source = 'Student Support';
                } else if (ticket.raisedByRole === 'parent') {
                    if (ticket.category === 'complaint') source = 'Parent Complaint';
                    else source = 'Parent Query';
                }

                const title = `[${source}] ${ticket.title}`;
                const message = ticket.description;
                const existing = await Notification.findOne({ user: userId, title, message });

                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message,
                        type: 'ticket',
                        school: schoolId,
                        senderName: ticket.raisedBy?.name || 'Parent',
                        senderRole: ticket.raisedByRole ? (ticket.raisedByRole.charAt(0).toUpperCase() + ticket.raisedByRole.slice(1)) : 'Parent',
                        source: source,
                        metadata: {
                            ticketId: ticket._id,
                            senderId: creatorId
                        },
                        createdAt: ticket.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing tickets for teacher notifications:", err);
        }

        // Bulk insert new notifications
        if (newNotifications.length > 0) {
            await Notification.insertMany(newNotifications);
        }

        // Fetch all notifications for the teacher
        const dbNotifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: dbNotifications });

    } catch (error) {
        console.error("Error in syncAndGetTeacherNotifications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark a single teacher notification as read
 * @route   PATCH /api/teacher/notifications/:id/read
 * @access  Private (Teacher)
 */
export const markTeacherNotificationRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark all unread teacher notifications as read
 * @route   POST /api/teacher/notifications/mark-all-read
 * @access  Private (Teacher)
 */
export const markAllTeacherNotificationsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
