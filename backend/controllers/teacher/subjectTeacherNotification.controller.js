import mongoose from "mongoose";
import Notification from "../../models/common/Notification.js";
import Teacher from "../../models/users/teacher.model.js";
import Section from "../../models/school/Section.model.js";
import Notice from "../../models/common/Notice.js";
import Ticket from "../../models/common/Ticket.js";
import StaffMeeting from "../../models/HRM/StaffMeeting.model.js";
import StudentLeave from "../../models/academic/StudentLeave.model.js";
import Homework from "../../models/academic/homework.model.js";
import HomeworkSubmission from "../../models/academic/HomeworkSubmission.model.js";
import Student from "../../models/users/student.model.js";

// Helper to resolve teacher assignments
const getTeacherAssignments = async (teacherUserId, schoolId) => {
    const teacherProfile = await Teacher.findOne({ user: teacherUserId, school: schoolId })
        .populate("assignedClasses")
        .lean();

    const assignedClassNames = [];
    const assignedClassIds = [];
    if (teacherProfile && Array.isArray(teacherProfile.assignedClasses)) {
        teacherProfile.assignedClasses.forEach(c => {
            if (c.name) assignedClassNames.push(c.name);
            if (c._id) assignedClassIds.push(c._id);
        });
    }

    const homeroomSections = await Section.find({ homeroomTeacher: teacherUserId, school: schoolId })
        .populate("classId")
        .lean();

    const homeroomClassSectionNames = [];
    homeroomSections.forEach(sec => {
        const clsName = sec.className || sec.classId?.name;
        const clsId = sec.classId?._id || sec.classId;
        if (clsName && sec.name) {
            homeroomClassSectionNames.push({
                className: clsName,
                sectionName: sec.name
            });
            assignedClassNames.push(clsName);
            if (clsId) assignedClassIds.push(clsId);
        }
    });

    const uniqueClassNames = Array.from(new Set(assignedClassNames));
    const uniqueClassIds = Array.from(new Set(assignedClassIds.map(id => id.toString()))).map(id => new mongoose.Types.ObjectId(id));

    return {
        classNames: uniqueClassNames,
        classIds: uniqueClassIds,
        homeroomAssignments: homeroomClassSectionNames
    };
};

export const getSubjectTeacherNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        // Fetch teacher profile to get joining date and assigned classes
        const teacherProfile = await Teacher.findOne({ user: userId, school: schoolId }).lean();
        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: "Subject Teacher profile not found." });
        }

        // Resolve joiningDate: 1) joiningDate 2) Teacher document createdAt 3) User account createdAt 4) epoch
        const joiningDate = teacherProfile.joiningDate || teacherProfile.createdAt || req.user.createdAt || new Date(0);

        const { classNames, classIds } = await getTeacherAssignments(userId, schoolId);
        const newNotifications = [];

        // 1. PTM Meetings
        try {
            const ptmMeetings = await StaffMeeting.find({
                school: schoolId,
                meetingType: "general",
                createdAt: { $gte: joiningDate }
            }).lean();

            for (const ptm of ptmMeetings) {
                const targetsAll = ptm.className === "All Classes";
                const isTargetClass = classNames.includes(ptm.className);
                
                if (targetsAll || isTargetClass) {
                    const title = `PTM Scheduled: ${ptm.title}`;
                    const message = `Class: ${ptm.className} • Date: ${new Date(ptm.scheduledAt).toLocaleDateString()} • Venue: ${ptm.venue || 'School Campus'}`;
                    
                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        school: schoolId
                    });

                    if (!existing) {
                        newNotifications.push({
                            user: userId,
                            title,
                            message,
                            type: 'notice',
                            school: schoolId,
                            senderName: 'Admin',
                            senderRole: 'Admin',
                            source: 'PTM Schedule',
                            createdAt: ptm.createdAt || new Date()
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing PTM notifications:", err);
        }

        // 2. Student Leave Requests
        if (classIds.length > 0) {
            try {
                const leaves = await StudentLeave.find({
                    class: { $in: classIds },
                    school: schoolId,
                    createdAt: { $gte: joiningDate }
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
                        message,
                        school: schoolId
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
                console.error("Error syncing leaves:", err);
            }
        }

        // 3. Homework / Assignment Submissions
        try {
            const teacherHomeworks = await Homework.find({ 
                teacher: userId, 
                isActive: true,
                createdAt: { $gte: joiningDate }
            }).lean();
            const homeworkIds = teacherHomeworks.map(h => h._id);

            if (homeworkIds.length > 0) {
                const submissions = await HomeworkSubmission.find({
                    homework: { $in: homeworkIds },
                    createdAt: { $gte: joiningDate }
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
                        message,
                        school: schoolId
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
            console.error("Error syncing submissions:", err);
        }

        // 4. Official Notices
        try {
            const notices = await Notice.find({
                $or: [{ school: schoolId }, { branch: schoolId }],
                status: { $regex: /^(published|active)$/i },
                createdAt: { $gte: joiningDate }
            }).lean();

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
                    const message = notice.content;

                    const existing = await Notification.findOne({
                        user: userId,
                        title,
                        message,
                        school: schoolId
                    });

                    if (!existing) {
                        newNotifications.push({
                            user: userId,
                            title,
                            message,
                            type: 'notice',
                            school: schoolId,
                            senderName: 'Principal',
                            senderRole: 'Principal',
                            source: 'Notices',
                            createdAt: notice.createdAt || new Date()
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing notices:", err);
        }

        // 5. Complaints / Support Tickets
        try {
            const tickets = await Ticket.find({
                school: schoolId,
                createdAt: { $gte: joiningDate },
                $or: [
                    { receiverId: userId },
                    { assignedTo: userId }
                ]
            }).populate('raisedBy', 'name').lean();

            for (const ticket of tickets) {
                let source = 'Parent Query';
                if (ticket.raisedByRole === 'student') {
                    source = 'Student Support';
                } else if (ticket.raisedByRole === 'parent') {
                    if (ticket.category === 'complaint') source = 'Parent Complaint';
                    else source = 'Parent Query';
                }

                const title = `[${source}] ${ticket.title}`;
                const message = ticket.description;

                const existing = await Notification.findOne({
                    user: userId,
                    title,
                    message,
                    school: schoolId
                });

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
                        metadata: { ticketId: ticket._id, senderId: ticket.raisedBy?._id },
                        createdAt: ticket.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing tickets:", err);
        }

        // 6. Events
        try {
            const EventModel = mongoose.model("Event");
            const events = await EventModel.find({
                school: schoolId,
                status: { $in: ["Scheduled", "Ongoing", "Mandatory"] },
                createdAt: { $gte: joiningDate }
            }).lean();

            for (const ev of events) {
                const title = `Event Scheduled: ${ev.title}`;
                const message = `${ev.description || ''} • Date: ${new Date(ev.startDate).toLocaleDateString()} • Venue: ${ev.venue || 'School Campus'}`;

                const existing = await Notification.findOne({
                    user: userId,
                    title,
                    school: schoolId
                });

                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message,
                        type: 'event',
                        school: schoolId,
                        senderName: ev.createdBy || 'Admin',
                        senderRole: 'Admin',
                        source: 'Events',
                        createdAt: ev.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing events:", err);
        }

        // 7. Salary Slips
        try {
            const SalarySlipModel = mongoose.model("SalarySlip");
            const slips = await SalarySlipModel.find({
                employee: userId,
                status: "Paid",
                createdAt: { $gte: joiningDate }
            }).lean();

            for (const slip of slips) {
                const monthName = slip.month || 'Month';
                const yearVal = slip.year || '';
                const title = `Salary Disbursed: ${monthName} ${yearVal}`;
                const message = `Your net salary of ${slip.netSalary} has been marked as paid.`;

                const existing = await Notification.findOne({
                    user: userId,
                    title,
                    school: schoolId
                });

                if (!existing) {
                    newNotifications.push({
                        user: userId,
                        title,
                        message,
                        type: 'notice',
                        school: schoolId,
                        senderName: 'Accounts',
                        senderRole: 'Accounts',
                        source: 'Salary Slip',
                        createdAt: slip.updatedAt || slip.createdAt || new Date()
                    });
                }
            }
        } catch (err) {
            console.error("Error syncing salary slips:", err);
        }

        // Bulk insert
        if (newNotifications.length > 0) {
            await Notification.insertMany(newNotifications);
        }

        // Fetch notifications for the Subject Teacher created after they joined
        const dbNotifications = await Notification.find({
            user: userId,
            school: schoolId,
            createdAt: { $gte: joiningDate }
        })
        .sort({ createdAt: -1 })
        .lean();

        return res.status(200).json({
            success: true,
            data: dbNotifications
        });

    } catch (error) {
        console.error("Error in getSubjectTeacherNotifications:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markSubjectTeacherNotificationRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: userId, school: schoolId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({ success: true, data: notification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllSubjectTeacherNotificationsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;

        await Notification.updateMany(
            { user: userId, school: schoolId, read: false },
            { read: true }
        );

        return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
