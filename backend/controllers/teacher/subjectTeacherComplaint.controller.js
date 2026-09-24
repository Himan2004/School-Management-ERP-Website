import mongoose from "mongoose";
import Complaint from "../../models/common/Complaint.js";
import User from "../../models/users/user.model.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";

// Helper to send notifications
const notifyUser = async (userId, schoolId, title, message, complaintId) => {
    try {
        const payload = {
            user: userId,
            school: schoolId,
            title,
            message,
            type: "ticket",
            metadata: {
                link: `?complaintId=${complaintId}`
            },
            source: "Complaints"
        };
        const newNotification = await Notification.create(payload);
        sendRealTimeNotification(userId, newNotification);
    } catch (err) {
        console.error("Error creating/sending notification:", err);
    }
};

// Helper to notify all admins of a school
const notifyAdmins = async (schoolId, title, message, complaintId) => {
    try {
        const admins = await User.find({ school: schoolId, role: "admin", status: "active" });
        for (const admin of admins) {
            await notifyUser(admin._id, schoolId, title, message, complaintId);
        }
    } catch (err) {
        console.error("Error notifying admins:", err);
    }
};

/**
 * @desc    Create a new complaint
 * @route   POST /api/subject-teacher/complaints
 * @access  Private (Teacher)
 */
export const createComplaint = async (req, res) => {
    try {
        const { title, description, category, priority, studentId, classId, sectionId, remark } = req.body;
        const schoolId = req.user.school?._id || req.user.school;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: "Title and Description are required." });
        }

        if (!classId) {
            return res.status(400).json({ success: false, message: "Please select a class." });
        }

        // Verify class section belongs to this school
        if (sectionId) {
            const sectionDoc = await Section.findOne({ _id: sectionId, school: schoolId, classId: classId }).lean();
            if (!sectionDoc) {
                return res.status(403).json({ success: false, message: "Access denied. Selected class/section does not belong to your school." });
            }
        }

        // Verify student belongs to this school and is assigned to this class and section (if studentId is provided)
        if (studentId) {
            const studentDoc = await Student.findOne({ user: studentId, school: schoolId, class: classId, section: sectionId }).lean();
            if (!studentDoc) {
                return res.status(403).json({ success: false, message: "Access denied. Selected student does not belong to this class/section in your school." });
            }
        }

        // Auto-generate Complaint ID
        const count = await Complaint.countDocuments();
        const complaintId = `COMP-${Date.now().toString().slice(-4)}-${count + 1}`;

        // Find school admin to assign complaint to
        const adminUser = await User.findOne({ school: schoolId, role: "admin" }).lean();

        const complaint = new Complaint({
            school: schoolId,
            complaintId,
            title: title.trim(),
            description: description.trim(),
            category: category || "other",
            priority: priority || "medium",
            status: "open",
            raisedByType: req.user.role,
            raisedBy: req.user._id,
            student: studentId || null,
            parent: null, // No parentId stored
            classId: classId,
            sectionId: sectionId || null,
            subjectTeacher: req.user._id,
            assignedTo: adminUser?._id || req.user._id, // Assign to school Admin by default
            history: [{
                action: "Complaint Created",
                performedBy: req.user._id,
                timestamp: new Date(),
                remarks: remark || "Complaint raised by subject teacher"
            }]
        });

        // Add initial message to conversation if remarks are provided
        if (remark?.trim()) {
            complaint.conversation.push({
                sender: req.user._id,
                message: remark.trim(),
                createdAt: new Date()
            });
        }

        await complaint.save();

        // Populate references before returning
        const populatedComplaint = await Complaint.findById(complaint._id)
            .populate("student", "name email role")
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role");

        // Notify Student if linked
        if (studentId) {
            await notifyUser(studentId, schoolId, "New Complaint Raised", `A complaint has been raised: "${title}"`, complaint._id);
        }

        // Proactively notify parent if found in Student model
        if (studentId) {
            try {
                const studentDoc = await Student.findOne({ user: studentId }).populate("parent");
                const parentUserId = studentDoc?.parent?.user || studentDoc?.parent;
                if (parentUserId) {
                    await notifyUser(parentUserId, schoolId, "New Complaint Raised", `A complaint has been raised regarding your child: "${title}"`, complaint._id);
                }
            } catch (err) {
                console.error("Failed to notify student parent", err);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Complaint raised successfully",
            data: populatedComplaint
        });

    } catch (error) {
        console.error("Error in createComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get complaints list with search, sorting, filtering, and pagination
 * @route   GET /api/subject-teacher/complaints
 * @access  Private (Teacher)
 */
export const getComplaints = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const {
            tab = "all", // "all" or "my"
            page = 1,
            limit = 10,
            search = "",
            status,
            priority,
            category,
            source,
            startDate,
            endDate,
            sort = "newest"
        } = req.query;

        const query = { school: schoolId };

        // Tab logic: "all" means assigned to this teacher, "my" means raised by this teacher
        if (tab === "my") {
            query.raisedBy = req.user._id;
        } else {
            query.$or = [
                { assignedTo: req.user._id },
                { subjectTeacher: req.user._id }
            ];
        }

        // Apply filters
        if (status && status !== "all") query.status = status;
        if (priority && priority !== "all") query.priority = priority;
        if (category && category !== "all") query.category = category;
        if (source && source !== "all") query.raisedByType = source;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Search logic
        if (search?.trim()) {
            const searchRegex = { $regex: search.trim(), $options: "i" };
            
            // Find users matching search for student/parent mapping
            const matchingUsers = await User.find({
                school: schoolId,
                name: searchRegex
            }).select("_id");
            const userIds = matchingUsers.map(u => u._id);

            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { complaintId: searchRegex },
                    { title: searchRegex },
                    { description: searchRegex },
                    ...(userIds.length > 0 ? [
                        { student: { $in: userIds } },
                        { parent: { $in: userIds } },
                        { raisedBy: { $in: userIds } }
                    ] : [])
                ]
            });
        }

        // Sort logic
        let sortObj = { createdAt: -1 };
        if (sort === "oldest") sortObj = { createdAt: 1 };
        else if (sort === "recently_updated") sortObj = { updatedAt: -1 };
        else if (sort === "priority") {
            // High/critical first (we can use custom sort logic, but standard sort on priority string works fine)
            sortObj = { priority: -1 };
        } else if (sort === "status") {
            sortObj = { status: 1 };
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const total = await Complaint.countDocuments(query);
        const complaints = await Complaint.find(query)
            .populate("student", "name email role")
            .populate("parent", "name email role")
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role")
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum)
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                complaints,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error("Error in getComplaints:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get complaint details by ID
 * @route   GET /api/subject-teacher/complaints/:id
 * @access  Private (Teacher, Admin)
 */
export const getComplaintDetails = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;

        const complaint = await Complaint.findOne({ _id: id, school: schoolId })
            .populate("student", "name email role profileId")
            .populate("parent", "name email role profileId")
            .populate("raisedBy", "name email role profileId")
            .populate("assignedTo", "name email role profileId")
            .populate("subjectTeacher", "name email role profileId")
            .populate("conversation.sender", "name email role")
            .populate("history.performedBy", "name email role");

        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found or access denied." });
        }

        // Authorization check: User must be admin OR the creator OR assigned teacher OR subject teacher
        if (req.user.role !== "admin" &&
            complaint.raisedBy?._id.toString() !== req.user._id.toString() &&
            complaint.assignedTo?._id.toString() !== req.user._id.toString() &&
            complaint.subjectTeacher?._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. You do not own or participate in this complaint." });
        }

        return res.status(200).json({
            success: true,
            data: complaint
        });

    } catch (error) {
        console.error("Error in getComplaintDetails:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update complaint details (general info)
 * @route   PUT /api/subject-teacher/complaints/:id
 * @access  Private (Teacher)
 */
export const updateComplaintDetails = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { title, description, category, priority, studentId, parentId } = req.body;

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        if (complaint.raisedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only the creator or admin can update complaint details." });
        }

        if (title) complaint.title = title;
        if (description) complaint.description = description;
        if (category) complaint.category = category;
        if (priority) complaint.priority = priority;
        if (studentId) complaint.student = studentId;
        if (parentId) complaint.parent = parentId;

        complaint.history.push({
            action: "Complaint Updated",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: "Complaint details updated"
        });

        await complaint.save();

        const populated = await complaint.populate([
            { path: "student", select: "name email role" },
            { path: "parent", select: "name email role" },
            { path: "raisedBy", select: "name email role" },
            { path: "assignedTo", select: "name email role" }
        ]);

        return res.status(200).json({
            success: true,
            message: "Complaint details updated",
            data: populated
        });

    } catch (error) {
        console.error("Error in updateComplaintDetails:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update complaint status (Open -> In Progress -> Resolved -> Closed)
 * @route   PATCH /api/subject-teacher/complaints/status
 * @access  Private (Teacher, Admin)
 */
export const updateComplaintStatus = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { complaintId, status, remarks } = req.body;

        if (!complaintId || !status) {
            return res.status(400).json({ success: false, message: "Complaint ID and Status are required." });
        }

        const complaint = await Complaint.findOne({ _id: complaintId, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        // Validate status transition: cannot directly close unresolved complaint
        if (status === "closed" && complaint.status !== "resolved") {
            return res.status(400).json({
                success: false,
                message: "Cannot close an unresolved complaint. Mark it as 'resolved' first."
            });
        }

        const oldStatus = complaint.status;
        complaint.status = status;

        if (status === "resolved") {
            complaint.resolvedBy = req.user._id;
            complaint.resolvedAt = new Date();
        } else if (status === "closed") {
            complaint.closedAt = new Date();
        }

        complaint.history.push({
            action: "Status Changed",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: remarks || `Status changed from ${oldStatus} to ${status}`
        });

        await complaint.save();

        // Notify participants
        const recipients = [complaint.raisedBy, complaint.student, complaint.parent].filter(
            id => id && id.toString() !== req.user._id.toString()
        );

        for (const recipient of recipients) {
            await notifyUser(
                recipient,
                schoolId,
                "Complaint Status Updated",
                `Complaint #${complaint.complaintId} status updated to ${status.replace("_", " ")}`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: `Status updated to ${status}`,
            data: complaint
        });

    } catch (error) {
        console.error("Error in updateComplaintStatus:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Escalate complaint to Admin
 * @route   PATCH /api/subject-teacher/complaints/escalate
 * @access  Private (Teacher)
 */
export const escalateComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { complaintId, reason } = req.body;

        if (!complaintId || !reason?.trim()) {
            return res.status(400).json({ success: false, message: "Complaint ID and Escalation Reason are required." });
        }

        const complaint = await Complaint.findOne({ _id: complaintId, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        // Only open or in_progress can be escalated
        if (complaint.status !== "open" && complaint.status !== "in_progress") {
            return res.status(400).json({
                success: false,
                message: "Only 'open' or 'in_progress' complaints can be escalated."
            });
        }

        complaint.status = "escalated";
        complaint.escalated = true;
        complaint.escalatedAt = new Date();
        complaint.escalatedBy = req.user._id;
        complaint.escalationReason = reason.trim();

        complaint.history.push({
            action: "Escalated",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: `Escalated to admin: ${reason.trim()}`
        });

        await complaint.save();

        // Notify admins of escalated complaint
        await notifyAdmins(
            schoolId,
            "Complaint Escalated",
            `Complaint #${complaint.complaintId} escalated by teacher: ${reason.trim()}`,
            complaint._id
        );

        return res.status(200).json({
            success: true,
            message: "Complaint escalated to Admin successfully.",
            data: complaint
        });

    } catch (error) {
        console.error("Error in escalateComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Reply to complaint conversation
 * @route   POST /api/subject-teacher/complaints/reply
 * @access  Private (Teacher, Admin, Parent, Student)
 */
export const replyComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { complaintId, message, attachments } = req.body;

        if (!complaintId || !message?.trim()) {
            return res.status(400).json({ success: false, message: "Complaint ID and message are required." });
        }

        const complaint = await Complaint.findOne({ _id: complaintId, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        // Can't reply to resolved or closed unless reopened or allowed.
        if (complaint.status === "closed") {
            return res.status(400).json({ success: false, message: "Cannot reply to a closed complaint." });
        }

        // Auto-progress from open to in_progress on teacher reply
        let statusUpdated = false;
        if (complaint.status === "open" && req.user.role === "teacher") {
            complaint.status = "in_progress";
            statusUpdated = true;
        }

        // Push conversation message
        complaint.conversation.push({
            sender: req.user._id,
            message: message.trim(),
            attachments: attachments || [],
            createdAt: new Date()
        });

        // Add history entry
        let actionStr = "Replied";
        if (req.user.role === "teacher") actionStr = "Teacher Replied";
        else if (req.user.role === "admin") actionStr = "Admin Replied";
        else if (req.user.role === "student") actionStr = "Student Replied";
        else if (req.user.role === "parent") actionStr = "Parent Replied";

        complaint.history.push({
            action: actionStr,
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: statusUpdated ? "Status changed to in_progress on reply" : "Reply added"
        });

        await complaint.save();

        // Populate sender before returning
        const updatedComplaint = await Complaint.findById(complaint._id)
            .populate("student", "name email role")
            .populate("parent", "name email role")
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role")
            .populate("subjectTeacher", "name email role")
            .populate("conversation.sender", "name email role")
            .populate("history.performedBy", "name email role");

        // Notify participants (anyone other than sender)
        const participants = [
            complaint.raisedBy,
            complaint.student,
            complaint.parent,
            complaint.assignedTo,
            complaint.subjectTeacher
        ].filter((id, index, self) => id && id.toString() !== req.user._id.toString() && self.indexOf(id) === index);

        for (const user of participants) {
            await notifyUser(
                user,
                schoolId,
                "New Reply on Complaint",
                `${req.user.name} (${req.user.role}) left a message on Complaint #${complaint.complaintId}`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: "Reply sent successfully",
            data: updatedComplaint
        });

    } catch (error) {
        console.error("Error in replyComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get dashboard metrics dynamically via Mongo aggregation
 * @route   GET /api/subject-teacher/complaints/dashboard
 * @access  Private (Teacher)
 */
export const getDashboardStats = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const teacherId = req.user._id;

        const schoolFilter = { school: schoolId };

        const stats = await Complaint.aggregate([
            { $match: schoolFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
                    escalated: { $sum: { $cond: [{ $eq: ["$status", "escalated"] }, 1, 0] } },
                    resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
                    myComplaints: {
                        $sum: {
                            $cond: [{ $eq: ["$raisedBy", teacherId] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const defaultStats = {
            total: 0,
            open: 0,
            inProgress: 0,
            escalated: 0,
            resolved: 0,
            myComplaints: 0,
            resolutionRate: 0
        };

        if (stats.length > 0) {
            const data = stats[0];
            const resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
            return res.status(200).json({
                success: true,
                data: {
                    total: data.total,
                    open: data.open,
                    inProgress: data.inProgress,
                    escalated: data.escalated,
                    resolved: data.resolved,
                    myComplaints: data.myComplaints,
                    resolutionRate
                }
            });
        }

        return res.status(200).json({ success: true, data: defaultStats });

    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student list for modal selection
 * @route   GET /api/subject-teacher/complaints/students
 * @access  Private (Teacher)
 */
export const getStudentsList = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const students = await User.find({ school: schoolId, role: "student", status: "active" })
            .select("name email loginId")
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({ success: true, data: students });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get parent list for modal selection
 * @route   GET /api/subject-teacher/complaints/parents
 * @access  Private (Teacher)
 */
export const getParentsList = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const parents = await User.find({ school: schoolId, role: "parent", status: "active" })
            .select("name email loginId")
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({ success: true, data: parents });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET all classes and sections in the subject teacher's school
 */
export const getClassesList = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        
        // Find teacher's school to get gradesOffered (like Admin Classes module)
        const school = await School.findById(schoolId).lean();
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }
        
        const organizationId = school.organization;
        if (!organizationId) {
            return res.status(400).json({ success: false, message: "Organization context missing for school" });
        }

        const allocatedGrades = school.gradesOffered
            ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
            : [];

        const isClassAllowed = (clsName) => {
            let cleanName = clsName.trim().toLowerCase();
            if (cleanName.startsWith("class ")) {
                cleanName = cleanName.substring(6).trim();
            }
            return allocatedGrades.includes(cleanName);
        };

        // Fetch classes belonging to the school's organization
        const ClassModel = mongoose.models.Class || mongoose.models.Classes || mongoose.model("Class");
        const classes = await ClassModel.find({ organization: organizationId, isActive: true })
            .sort({ numericLevel: 1 })
            .lean();

        // Filter organization classes to match school's gradesOffered
        const filteredClasses = classes.filter((cls) => isClassAllowed(cls.name));

        // Get all active sections for this school
        const sectionsList = await Section.find({ school: schoolId, status: "active" }).lean();

        // Build list of classes and sections
        const classesList = [];
        filteredClasses.forEach((cls) => {
            const classSections = sectionsList.filter(s => String(s.classId) === String(cls._id));
            classSections.forEach((sec) => {
                classesList.push({
                    classId: cls._id,
                    className: cls.name,
                    sectionId: sec._id,
                    sectionName: sec.name,
                    displayName: `${cls.name} (${sec.name})`
                });
            });
        });

        // Helper to determine the academic priority value of a class name
        const getClassSortValue = (name) => {
            const clean = name.trim().toLowerCase();
            if (clean === "nursery") return 0;
            if (clean === "junior kg" || clean === "jr. kg" || clean === "jr kg" || clean === "lkg") return 1;
            if (clean === "senior kg" || clean === "sr. kg" || clean === "sr kg" || clean === "ukg") return 2;
            
            const match = clean.match(/(?:class\s+)?(\d+)/);
            if (match) {
                return 3 + parseInt(match[1], 10) - 1;
            }
            return 100;
        };

        // Ensure display order follows Class custom academic level, then Section name ascending
        classesList.sort((a, b) => {
            const valA = getClassSortValue(a.className);
            const valB = getClassSortValue(b.className);
            if (valA !== valB) return valA - valB;
            return a.sectionName.localeCompare(b.sectionName);
        });

        return res.status(200).json({ success: true, data: classesList });
    } catch (error) {
        console.error("Error in getClassesList:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET students filtering by classId and sectionId
 */
export const getStudentsByClass = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { classId, sectionId } = req.query;

        if (!classId || !sectionId) {
            return res.status(400).json({ success: false, message: "classId and sectionId are required" });
        }

        // Verify that the requested class/section belongs to the teacher's schoolId
        const sectionDoc = await Section.findOne({ _id: sectionId, school: schoolId, classId: classId }).lean();
        if (!sectionDoc) {
            return res.status(403).json({ success: false, message: "Access denied. Class/section does not belong to your school." });
        }

        const students = await Student.find({
            school: schoolId,
            class: classId,
            section: sectionId
        })
        .populate("user", "name email loginId")
        .lean();

        const formattedStudents = students.map(s => ({
            _id: s.user?._id || s._id,
            studentId: s._id,
            name: s.user?.name || "Unknown Student",
            loginId: s.user?.loginId || ""
        }));

        formattedStudents.sort((a, b) => a.name.localeCompare(b.name));

        return res.status(200).json({ success: true, data: formattedStudents });
    } catch (error) {
        console.error("Error in getStudentsByClass:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
