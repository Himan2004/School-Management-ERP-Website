import mongoose from "mongoose";
import Ticket from "../../models/common/Ticket.js";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";
import User from "../../models/users/user.model.js";
import Section from "../../models/school/Section.model.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";
import Complaint from "../../models/common/Complaint.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";

const dispatchNotification = async (notificationPayload) => {
  try {
    const newNotification = await Notification.create(notificationPayload);
    sendRealTimeNotification(notificationPayload.user, newNotification);
  } catch (error) {
    console.error("Failed to dispatch notification", error);
  }
};

/**
 * Helper function to verify student belongs to parent
 */
const verifyStudentAccess = async (userId, studentId) => {
    const parent = await Parent.findOne({ user: userId });
    if (!parent) return false;
    
    const student = await Student.findOne({
        $or: [{ _id: studentId }, { user: studentId }]
    });
    if (!student) return false;

    return parent.students.some((id) => id.toString() === student._id.toString());
};

const resolveSchoolId = (req, schoolIdFromBodyOrQuery, studentProfile = null) => {
    if (studentProfile?.school) {
        return studentProfile.school.toString();
    }
    const userSchool = req.user?.school;
    if (!schoolIdFromBodyOrQuery && !userSchool) return null;
    if (typeof schoolIdFromBodyOrQuery === "string") return schoolIdFromBodyOrQuery;
    if (typeof userSchool === "string") return userSchool;
    return userSchool?._id?.toString() || null;
};

const findOwnedTicket = (ticketId, userId) => Ticket.findOne({ _id: ticketId, raisedBy: userId });

export const createTicket = async (req, res) => {
    try {
        const { title, description, category, priority, student_id, school_id, sendTo, ticketType } = req.body;
        const parentId = req.user?._id;

        if (!title || !description || !category) {
            return res.status(400).json({ success: false, data: null, message: "title, description, and category are required" });
        }

        // --- 1. STUDENT LINKAGE ---
        let studentProfile = null;
        if (student_id) {
            if (!mongoose.Types.ObjectId.isValid(student_id)) {
                return res.status(400).json({ success: false, data: null, message: "Invalid student_id" });
            }

            const hasAccess = await verifyStudentAccess(parentId, student_id);
            if (!hasAccess) {
                return res.status(403).json({ success: false, data: null, message: "Unauthorized access" });
            }

            studentProfile = await Student.findOne({
                $or: [{ _id: student_id }, { user: student_id }]
            }).populate("class").populate("section");
        } else {
            // Auto-Fallback: If frontend forgot student_id, just grab the parent's first child
            const parent = await Parent.findOne({ user: parentId });
            if (parent && parent.students.length > 0) {
                studentProfile = await Student.findById(parent.students[0]).populate("class").populate("section");
            }
        }

        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student not found" });
        }

        // --- 2. SCHOOL LINKAGE ---
        const resolvedSchoolId = resolveSchoolId(req, school_id, studentProfile);
        if (!resolvedSchoolId || !mongoose.Types.ObjectId.isValid(resolvedSchoolId)) {
            return res.status(400).json({ success: false, data: null, message: "Valid school_id is required" });
        }

        const school = await School.findById(resolvedSchoolId).select("organization");
        if (!school) {
            return res.status(404).json({ success: false, data: null, message: "School not found" });
        }

        // --- 3. AUTO-ROUTER LOGIC & RECEIVER MAPPING ---
        let targetReceiverId = null;
        let targetReceiverType = "";
        let targetRole = "";

        let targetSendTo = sendTo || "Admin";
        if (category === "id_card") {
            targetSendTo = "Admin";
        }

        if (targetSendTo === "Class Teacher" || targetSendTo === "ClassTeacher" || targetSendTo === "Teacher") {
            if (!studentProfile.section) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: "Student is not assigned to a section. Unable to determine class teacher."
                });
            }

            const sectionDoc = await Section.findById(studentProfile.section);
            const teacherId = sectionDoc?.homeroomTeacher;
            
            if (!teacherId) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: "No class teacher has been assigned for your class. Please contact school administration."
                });
            }

            // Verify teacher user exists
            const teacherUser = await User.findOne({ _id: teacherId, role: "teacher" });
            if (!teacherUser) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: "No class teacher has been assigned for your class. Please contact school administration."
                });
            }

            targetReceiverId = teacherUser._id;
            targetReceiverType = "ClassTeacher";
            targetRole = "teacher";
        } else {
            // Admin
            const adminUser = await User.findOne({ school: resolvedSchoolId, role: "admin", status: "active" });
            if (!adminUser) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: "No active admin found for this school."
                });
            }
            targetReceiverId = adminUser._id;
            targetReceiverType = "Admin";
            targetRole = "admin";
        }

        // --- 4. CREATE TICKET ---
        const ticket = await Ticket.create({
            organization: school.organization,
            school: resolvedSchoolId,
            title,
            subject: title,
            description,
            category,
            priority: priority || "medium",
            ticketType: ticketType || "standard",
            
            raisedBy: req.user._id,
            raisedByRole: "parent",
            relatedStudent: studentProfile.user,

            // Explicit database fields as per Part 4
            parentId: req.user._id,
            studentId: studentProfile.user,
            admissionId: studentProfile.admissionNo || studentProfile.enrollmentNo || "",
            class: studentProfile.class?.name || studentProfile.class?._id?.toString() || "",
            section: studentProfile.section?.name || studentProfile.section?._id?.toString() || "",
            
            receiverId: targetReceiverId,
            receiverType: targetReceiverType,
            
            assignedTo: targetReceiverId,
            assignedToRole: targetRole,
            
            status: "open",
            history: [{
                status: "open",
                updatedBy: req.user._id,
                updatedAt: new Date(),
                comment: "Ticket created by parent"
            }]
        });

        // --- 5. NOTIFICATION DISPATCH ---
        let sourceName = "Parent Query";
        if (category === "complaint") {
            sourceName = "Parent Complaint";
        } else if (category === "transport") {
            sourceName = "Parent Transport";
        } else if (category === "fee") {
            sourceName = "Parent Fee Query";
        } else if (category === "id_card") {
            sourceName = "ID Card Request";
        }

        const notificationPayload = {
            user: targetReceiverId,
            school: resolvedSchoolId,
            title: `[${sourceName}] ${title}`,
            message: description,
            type: "ticket",
            metadata: {
                ticketId: ticket._id,
                senderId: req.user._id,
                link: `?ticketId=${ticket._id}`
            },
            senderName: req.user.name,
            senderRole: "Parent",
            source: sourceName
        };

        await dispatchNotification(notificationPayload);

        return res.status(201).json({
            success: true,
            data: { ticket },
            message: "Ticket raised successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getAllTickets = async (req, res) => {
    try {
        const { status, category, priority } = req.query;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 1000;
        const skip = (page - 1) * limit;

        const ticketQuery = { raisedBy: req.user._id };
        if (status) ticketQuery.status = status;
        if (category) ticketQuery.category = category;
        if (priority) ticketQuery.priority = priority;

        const complaintQuery = { parent: req.user._id };
        if (status) complaintQuery.status = status;
        if (category) complaintQuery.category = category;
        if (priority) complaintQuery.priority = priority;

        const [tickets, complaints] = await Promise.all([
            Ticket.find(ticketQuery)
                .populate("relatedStudent", "name")
                .populate("assignedTo", "name")
                .sort({ createdAt: -1 })
                .lean(),
            Complaint.find(complaintQuery)
                .populate("student", "name")
                .populate("assignedTo", "name")
                .sort({ createdAt: -1 })
                .lean()
        ]);

        const mappedComplaints = complaints.map(c => ({
            _id: c._id,
            title: c.title,
            description: c.description,
            category: c.category,
            priority: c.priority,
            status: c.status,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            raisedBy: c.raisedBy,
            relatedStudent: c.student,
            assignedTo: c.assignedTo,
            isComplaint: true,
            ticketType: "standard"
        }));

        const merged = [...tickets, ...mappedComplaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const paginated = merged.slice(skip, skip + limit);

        return res.status(200).json({
            success: true,
            data: {
                tickets: paginated,
                totalTickets: merged.length,
                currentPage: page,
                totalPages: Math.ceil(merged.length / limit),
            },
            message: "Tickets & Complaints fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getTicketById = async (req, res) => {
    try {
        let ticket = await Ticket.findOne({ _id: req.params.id, raisedBy: req.user._id })
            .populate("relatedStudent", "name photo")
            .populate("assignedTo", "name role")
            .populate("responses.user", "name role")
            .lean();

        if (!ticket) {
            const complaint = await Complaint.findOne({ _id: req.params.id, parent: req.user._id })
                .populate("student", "name photo")
                .populate("assignedTo", "name role")
                .populate("conversation.sender", "name role")
                .lean();

            if (!complaint) {
                return res.status(404).json({ success: false, data: null, message: "Ticket/Complaint not found" });
            }

            const mappedResponses = (complaint.conversation || []).map(r => ({
                _id: r._id,
                user: r.sender,
                message: r.message,
                createdAt: r.createdAt
            }));

            ticket = {
                _id: complaint._id,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                createdAt: complaint.createdAt,
                updatedAt: complaint.updatedAt,
                relatedStudent: complaint.student,
                assignedTo: complaint.assignedTo,
                responses: mappedResponses,
                isComplaint: true
            };
        }

        return res.status(200).json({
            success: true,
            data: { ticket },
            message: "Ticket/Complaint fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const addResponse = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, data: null, message: "message is required" });
        }

        let ticket = await Ticket.findOne({ _id: req.params.id, raisedBy: req.user._id });
        if (ticket) {
            if (ticket.status === "closed" || ticket.status === "resolved") {
                return res.status(400).json({ success: false, data: null, message: "Cannot reply to a closed/resolved ticket" });
            }

            ticket.responses.push({
                user: req.user._id,
                message,
                attachments: [],
            });

            if (ticket.status === "open") {
                ticket.status = "in_progress";
                ticket.history.push({
                    status: "in_progress",
                    updatedBy: req.user._id,
                    updatedAt: new Date(),
                    comment: "Parent added response, status auto-updated to in_progress"
                });
            } else {
                ticket.history.push({
                    status: ticket.status,
                    updatedBy: req.user._id,
                    updatedAt: new Date(),
                    comment: "Parent added response"
                });
            }

            await ticket.save();

            const updated = await Ticket.findById(ticket._id)
                .populate("relatedStudent", "name photo")
                .populate("assignedTo", "name role")
                .populate("responses.user", "name role");

            return res.status(200).json({
                success: true,
                data: { ticket: updated },
                message: "Response added successfully",
            });
        } else {
            const complaint = await Complaint.findOne({ _id: req.params.id, parent: req.user._id });
            if (!complaint) {
                return res.status(404).json({ success: false, message: "Ticket/Complaint not found" });
            }

            if (complaint.status === "closed" || complaint.status === "resolved") {
                return res.status(400).json({ success: false, message: "Cannot reply to a closed/resolved complaint" });
            }

            complaint.conversation.push({
                sender: req.user._id,
                message
            });

            if (complaint.status === "open") {
                complaint.status = "in_progress";
            }
            complaint.history.push({
                action: "Response Added",
                performedBy: req.user._id,
                timestamp: new Date(),
                remarks: "Parent added response"
            });

            await complaint.save();

            const updatedComplaint = await Complaint.findById(complaint._id)
                .populate("student", "name photo")
                .populate("assignedTo", "name role")
                .populate("conversation.sender", "name role")
                .lean();

            const mappedResponses = (updatedComplaint.conversation || []).map(r => ({
                _id: r._id,
                user: r.sender,
                message: r.message,
                createdAt: r.createdAt
            }));

            const mappedTicket = {
                _id: updatedComplaint._id,
                title: updatedComplaint.title,
                description: updatedComplaint.description,
                category: updatedComplaint.category,
                priority: updatedComplaint.priority,
                status: updatedComplaint.status,
                createdAt: updatedComplaint.createdAt,
                updatedAt: updatedComplaint.updatedAt,
                relatedStudent: updatedComplaint.student,
                assignedTo: updatedComplaint.assignedTo,
                responses: mappedResponses,
                isComplaint: true
            };

            return res.status(200).json({
                success: true,
                data: { ticket: mappedTicket },
                message: "Response added successfully",
            });
        }
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getTicketStats = async (req, res) => {
    try {
        const baseQuery = { raisedBy: req.user._id };
        const compBaseQuery = { parent: req.user._id };

        const [
            totalTickets, openTickets, inProgressTickets, resolvedTickets, closedTickets, escalatedTickets,
            totalComplaints, openComplaints, inProgressComplaints, resolvedComplaints, closedComplaints, escalatedComplaints
        ] = await Promise.all([
            Ticket.countDocuments(baseQuery),
            Ticket.countDocuments({ ...baseQuery, status: "open" }),
            Ticket.countDocuments({ ...baseQuery, status: "in_progress" }),
            Ticket.countDocuments({ ...baseQuery, status: "resolved" }),
            Ticket.countDocuments({ ...baseQuery, status: "closed" }),
            Ticket.countDocuments({ ...baseQuery, status: "escalated" }),
            Complaint.countDocuments(compBaseQuery),
            Complaint.countDocuments({ ...compBaseQuery, status: "open" }),
            Complaint.countDocuments({ ...compBaseQuery, status: "in_progress" }),
            Complaint.countDocuments({ ...compBaseQuery, status: "resolved" }),
            Complaint.countDocuments({ ...compBaseQuery, status: "closed" }),
            Complaint.countDocuments({ ...compBaseQuery, status: "escalated" }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalTickets: totalTickets + totalComplaints,
                openTickets: openTickets + openComplaints,
                inProgressTickets: inProgressTickets + inProgressComplaints,
                resolvedTickets: resolvedTickets + resolvedComplaints,
                closedTickets: closedTickets + closedComplaints,
                escalatedTickets: escalatedTickets + escalatedComplaints,
            },
            message: "Ticket & Complaint stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const closeTicket = async (req, res) => {
    try {
        let ticket = await Ticket.findOne({ _id: req.params.id, raisedBy: req.user._id });
        if (ticket) {
            if (ticket.status === "closed") {
                return res.status(400).json({ success: false, data: null, message: "Ticket already closed" });
            }

            ticket.status = "closed";
            ticket.closedAt = new Date();
            ticket.resolutionNote = "Closed by parent";
            ticket.history.push({
                status: "closed",
                updatedBy: req.user._id,
                updatedAt: new Date(),
                comment: "Ticket closed by parent"
            });
            await ticket.save();
        } else {
            const complaint = await Complaint.findOne({ _id: req.params.id, parent: req.user._id });
            if (!complaint) {
                return res.status(404).json({ success: false, data: null, message: "Ticket/Complaint not found" });
            }

            if (complaint.status === "closed") {
                return res.status(400).json({ success: false, message: "Complaint already closed" });
            }

            complaint.status = "closed";
            complaint.closedAt = new Date();
            complaint.history.push({
                action: "Closed",
                performedBy: req.user._id,
                timestamp: new Date(),
                remarks: "Closed by parent"
            });
            await complaint.save();
            ticket = { _id: complaint._id, status: "closed" };
        }

        return res.status(200).json({
            success: true,
            data: { ticket },
            message: "Closed successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const uploadTicketAttachment = async (req, res) => {
    try {
        const ticket = await findOwnedTicket(req.params.id, req.user._id);
        if (!ticket) {
            return res.status(404).json({ success: false, data: null, message: "Ticket not found" });
        }

        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ success: false, data: null, message: "No attachments uploaded" });
        }

        const attachments = files.map((file) => ({
            name: file.originalname,
            url: file.path,
            uploadedAt: new Date(),
        }));

        ticket.attachments.push(...attachments);
        await ticket.save();

        return res.status(200).json({
            success: true,
            data: { attachments: ticket.attachments },
            message: "Attachments uploaded successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

/**
 * GET student's class teacher details
 */
export const getStudentClassTeacher = async (req, res) => {
    try {
        const parentId = req.user?._id;
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "studentId query parameter is required" });
        }

        const hasAccess = await verifyStudentAccess(parentId, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Unauthorized access to this student" });
        }

        const student = await Student.findOne({
            $or: [{ _id: studentId }, { user: studentId }]
        });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        if (!student.section) {
            return res.status(400).json({ success: false, message: "Student is not assigned to a section" });
        }

        const sectionDoc = await Section.findById(student.section);
        if (!sectionDoc || !sectionDoc.homeroomTeacher) {
            return res.status(404).json({ success: false, message: "No class teacher assigned for this student's class/section" });
        }

        const teacherUser = await User.findOne({ _id: sectionDoc.homeroomTeacher, role: "teacher" }).select("name email photo");
        if (!teacherUser) {
            return res.status(404).json({ success: false, message: "Assigned class teacher user not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                _id: teacherUser._id,
                name: teacherUser.name,
                email: teacherUser.email,
                photo: teacherUser.photo
            }
        });
    } catch (error) {
        console.error("Error in getStudentClassTeacher:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET subject teachers assigned to student's class & section
 */
export const getStudentSubjectTeachers = async (req, res) => {
    try {
        const parentId = req.user?._id;
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "studentId query parameter is required" });
        }

        const hasAccess = await verifyStudentAccess(parentId, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Unauthorized access to this student" });
        }

        const student = await Student.findOne({
            $or: [{ _id: studentId }, { user: studentId }]
        });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        if (!student.section) {
            return res.status(400).json({ success: false, message: "Student is not assigned to a section" });
        }

        const sectionDoc = await Section.findById(student.section);
        if (!sectionDoc) {
            return res.status(404).json({ success: false, message: "Student section details not found" });
        }

        // Fetch subject assignments matching student's class and section name
        const assignments = await SubjectAssignment.find({
            school: student.school,
            class: student.class,
            section: sectionDoc.name
        })
        .populate("teacherUser", "name email photo")
        .lean();

        // Gather unique subject details across collections
        const subjectIds = [...new Set(assignments.map(a => a.subject).filter(Boolean))];
        const [subjectsList, orgSubjectsList] = await Promise.all([
            mongoose.model("Subject").find({ _id: { $in: subjectIds } }).select("subjectName name").lean(),
            mongoose.model("organizationSubjects").find({ _id: { $in: subjectIds } }).select("subjectName name").lean()
        ]);

        const subjectMap = new Map();
        subjectsList.forEach(s => subjectMap.set(s._id.toString(), s));
        orgSubjectsList.forEach(s => subjectMap.set(s._id.toString(), s));

        const formattedTeachers = assignments.map(a => {
            if (!a.teacherUser) return null;
            const subId = a.subject ? a.subject.toString() : null;
            const rawSub = subId ? (subjectMap.get(subId) || null) : null;
            const subjectName = rawSub ? (rawSub.subjectName || rawSub.name) : "General";
            return {
                _id: a.teacherUser._id,
                name: a.teacherUser.name,
                email: a.teacherUser.email,
                photo: a.teacherUser.photo,
                subjectId: subId,
                subjectName: subjectName
            };
        }).filter(Boolean);

        return res.status(200).json({
            success: true,
            data: formattedTeachers
        });
    } catch (error) {
        console.error("Error in getStudentSubjectTeachers:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST a new complaint directed to Class Teacher or Subject Teacher
 */
export const createComplaint = async (req, res) => {
    try {
        const { title, description, category, priority, student_id, school_id, sendTo, assignedTeacherId, assignedSubject } = req.body;
        const parentId = req.user?._id;

        if (!title || !description || !category) {
            return res.status(400).json({ success: false, message: "title, description, and category are required" });
        }

        // --- 1. STUDENT LINKAGE ---
        let studentProfile = null;
        if (student_id) {
            const hasAccess = await verifyStudentAccess(parentId, student_id);
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            studentProfile = await Student.findOne({
                $or: [{ _id: student_id }, { user: student_id }]
            }).populate("class").populate("section");
        } else {
            const parent = await Parent.findOne({ user: parentId });
            if (parent && parent.students.length > 0) {
                studentProfile = await Student.findById(parent.students[0]).populate("class").populate("section");
            }
        }

        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // --- 2. SCHOOL LINKAGE ---
        const resolvedSchoolId = resolveSchoolId(req, school_id, studentProfile);
        if (!resolvedSchoolId) {
            return res.status(400).json({ success: false, message: "Valid school_id is required" });
        }

        const school = await School.findById(resolvedSchoolId).select("organization");
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        // --- 3. AUTO-ROUTER LOGIC & RECEIVER MAPPING ---
        let targetReceiverId = null;
        let targetReceiverType = "";

        if (sendTo === "Class Teacher" || sendTo === "ClassTeacher") {
            if (!studentProfile.section) {
                return res.status(400).json({
                    success: false,
                    message: "Student is not assigned to a section. Unable to determine class teacher."
                });
            }

            const sectionDoc = await Section.findById(studentProfile.section);
            const teacherId = sectionDoc?.homeroomTeacher;
            
            if (!teacherId) {
                return res.status(400).json({
                    success: false,
                    message: "No class teacher has been assigned for your class. Please contact school administration."
                });
            }

            const teacherUser = await User.findOne({ _id: teacherId, role: "teacher" });
            if (!teacherUser) {
                return res.status(400).json({
                    success: false,
                    message: "No class teacher has been assigned for your class. Please contact school administration."
                });
            }

            targetReceiverId = teacherUser._id;
            targetReceiverType = "ClassTeacher";
        } else if (sendTo === "Subject Teacher" || sendTo === "SubjectTeacher") {
            if (!assignedTeacherId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a Subject Teacher."
                });
            }

            const teacherUser = await User.findOne({ _id: assignedTeacherId, role: "teacher" });
            if (!teacherUser) {
                return res.status(400).json({
                    success: false,
                    message: "Selected Subject Teacher not found."
                });
            }

            targetReceiverId = teacherUser._id;
            targetReceiverType = "SubjectTeacher";
        } else if (sendTo === "Admin" || sendTo === "admin") {
            const adminUser = await User.findOne({ school: resolvedSchoolId, role: "admin", status: "active" });
            if (!adminUser) {
                return res.status(400).json({
                    success: false,
                    message: "No active admin found for this school."
                });
            }

            targetReceiverId = adminUser._id;
            targetReceiverType = "Admin";
        } else {
            return res.status(400).json({ success: false, message: "Invalid recipient role selection." });
        }

        // Auto-generate Complaint ID
        const count = await Complaint.countDocuments();
        const complaintId = `COMP-${Date.now().toString().slice(-4)}-${count + 1}`;

        // Create the Complaint document in MongoDB
        const complaint = await Complaint.create({
            school: resolvedSchoolId,
            complaintId,
            title: title.trim(),
            description: description.trim(),
            category: category || "other",
            priority: priority || "medium",
            status: "open",
            raisedByType: "parent",
            raisedBy: req.user._id,
            student: studentProfile.user?._id || studentProfile.user,
            parent: req.user._id,
            
            subjectTeacher: targetReceiverType === "SubjectTeacher" ? targetReceiverId : null,
            assignedTo: targetReceiverId,

            // Explicit routing mapping fields for the parent complaint requirements
            assignedTeacherId: targetReceiverId,
            assignedTeacherType: targetReceiverType,
            assignedSubject: targetReceiverType === "SubjectTeacher" ? assignedSubject : "",
            assignedClass: studentProfile.class?.name || studentProfile.class?._id?.toString() || "",
            assignedSection: studentProfile.section?.name || studentProfile.section?._id?.toString() || "",
            
            history: [{
                action: "Complaint Created",
                performedBy: req.user._id,
                timestamp: new Date(),
                remarks: "Complaint raised by parent"
            }]
        });

        // --- 4. NOTIFICATION DISPATCH (Notify ONLY the targeted teacher!) ---
        const notificationPayload = {
            user: targetReceiverId,
            school: resolvedSchoolId,
            title: `[Parent Complaint] ${title}`,
            message: description,
            type: "ticket",
            metadata: {
                complaintId: complaint._id,
                senderId: req.user._id,
                link: `?complaintId=${complaint._id}`
            },
            senderName: req.user.name,
            senderRole: "Parent",
            source: "Complaints"
        };

        await dispatchNotification(notificationPayload);

        return res.status(201).json({
            success: true,
            message: "Complaint raised successfully",
            data: complaint
        });
    } catch (error) {
        console.error("Error in createComplaint (Parent):", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
