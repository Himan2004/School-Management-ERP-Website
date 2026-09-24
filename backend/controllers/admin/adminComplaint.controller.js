import Complaint from "../../models/common/Complaint.js";
import User from "../../models/users/user.model.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";

// Helper to notify a user
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

/**
 * @desc    Get escalated complaints for the admin's school
 * @route   GET /api/admin/complaints/escalated
 * @access  Private (Admin)
 */
export const getEscalatedComplaints = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;

        const complaints = await Complaint.find({
            school: schoolId,
            $or: [
                { status: "escalated", escalated: true },
                { raisedByType: "parent" }
            ]
        })
            .populate("student", "name email role")
            .populate("parent", "name email role")
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role")
            .sort({ escalatedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: complaints
        });
    } catch (error) {
        console.error("Error in getEscalatedComplaints:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Resolve escalated complaint
 * @route   PATCH /api/admin/complaints/:id/resolve
 * @access  Private (Admin)
 */
export const resolveEscalatedComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { remarks } = req.body;

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        complaint.status = "resolved";
        complaint.resolvedBy = req.user._id;
        complaint.resolvedAt = new Date();

        complaint.history.push({
            action: "Resolved",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: remarks || "Resolved by Admin"
        });

        await complaint.save();

        // Notify teacher and other participants
        const participants = [complaint.raisedBy, complaint.student, complaint.parent].filter(
            uid => uid && uid.toString() !== req.user._id.toString()
        );

        for (const user of participants) {
            await notifyUser(
                user,
                schoolId,
                "Complaint Resolved by Admin",
                `Complaint #${complaint.complaintId} has been resolved by Admin.`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: "Complaint resolved successfully",
            data: complaint
        });
    } catch (error) {
        console.error("Error in resolveEscalatedComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Reply to escalated complaint
 * @route   POST /api/admin/complaints/:id/reply
 * @access  Private (Admin)
 */
export const replyEscalatedComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { message, attachments } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        if (complaint.status === "closed") {
            return res.status(400).json({ success: false, message: "Cannot reply to a closed complaint." });
        }

        complaint.conversation.push({
            sender: req.user._id,
            message: message.trim(),
            attachments: attachments || [],
            createdAt: new Date()
        });

        complaint.history.push({
            action: "Admin Replied",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: "Admin added a reply"
        });

        await complaint.save();

        // Populate sender before returning
        const updated = await Complaint.findById(complaint._id)
            .populate("student", "name email role")
            .populate("parent", "name email role")
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role")
            .populate("conversation.sender", "name email role")
            .populate("history.performedBy", "name email role");

        // Notify participants
        const participants = [complaint.raisedBy, complaint.student, complaint.parent].filter(
            uid => uid && uid.toString() !== req.user._id.toString()
        );

        for (const user of participants) {
            await notifyUser(
                user,
                schoolId,
                "Admin Replied to Complaint",
                `Admin replied to Complaint #${complaint.complaintId}`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: "Reply sent successfully",
            data: updated
        });
    } catch (error) {
        console.error("Error in replyEscalatedComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Assign escalated complaint to a teacher or staff member
 * @route   PATCH /api/admin/complaints/:id/assign
 * @access  Private (Admin)
 */
export const assignEscalatedComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { staffId, remarks } = req.body;

        if (!staffId) {
            return res.status(400).json({ success: false, message: "Staff ID is required." });
        }

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        const staffUser = await User.findOne({ _id: staffId, school: schoolId, status: "active" });
        if (!staffUser) {
            return res.status(404).json({ success: false, message: "Staff user not found or inactive." });
        }

        complaint.assignedTo = staffUser._id;
        // Keep status escalated or change to in_progress based on preference. Let's make it in_progress if assigned, but keep escalated flag
        complaint.status = "in_progress";

        complaint.history.push({
            action: "Admin Assigned",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: remarks || `Assigned to ${staffUser.name} (${staffUser.role})`
        });

        await complaint.save();

        // Notify assigned staff
        await notifyUser(
            staffUser._id,
            schoolId,
            "Complaint Assigned to You",
            `Admin has assigned Complaint #${complaint.complaintId} to you.`,
            complaint._id
        );

        // Notify teacher who raised
        if (complaint.raisedBy.toString() !== staffUser._id.toString()) {
            await notifyUser(
                complaint.raisedBy,
                schoolId,
                "Complaint Assigned",
                `Complaint #${complaint.complaintId} has been assigned to ${staffUser.name}`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: `Complaint successfully assigned to ${staffUser.name}`,
            data: complaint
        });
    } catch (error) {
        console.error("Error in assignEscalatedComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Close escalated complaint
 * @route   PATCH /api/admin/complaints/:id/close
 * @access  Private (Admin)
 */
export const closeEscalatedComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { remarks } = req.body;

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        if (complaint.status !== "resolved") {
            return res.status(400).json({ success: false, message: "Cannot close an unresolved complaint. Mark it as resolved first." });
        }

        complaint.status = "closed";
        complaint.closedAt = new Date();

        complaint.history.push({
            action: "Closed",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: remarks || "Closed by Admin"
        });

        await complaint.save();

        // Notify participants
        const participants = [complaint.raisedBy, complaint.student, complaint.parent].filter(
            uid => uid && uid.toString() !== req.user._id.toString()
        );

        for (const user of participants) {
            await notifyUser(
                user,
                schoolId,
                "Complaint Closed",
                `Complaint #${complaint.complaintId} has been closed.`,
                complaint._id
            );
        }

        return res.status(200).json({
            success: true,
            message: "Complaint closed successfully",
            data: complaint
        });
    } catch (error) {
        console.error("Error in closeEscalatedComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Return back / De-escalate complaint to teacher
 * @route   PATCH /api/admin/complaints/:id/return-back
 * @access  Private (Admin)
 */
export const returnBackComplaint = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { id } = req.params;
        const { remarks } = req.body;

        const complaint = await Complaint.findOne({ _id: id, school: schoolId });
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found." });
        }

        complaint.status = "in_progress";
        complaint.escalated = false;
        complaint.assignedTo = complaint.subjectTeacher || complaint.raisedBy; // return to teacher

        complaint.history.push({
            action: "Status Changed",
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: remarks || "Returned back to Subject Teacher"
        });

        await complaint.save();

        // Notify teacher
        const teacherId = complaint.subjectTeacher || complaint.raisedBy;
        await notifyUser(
            teacherId,
            schoolId,
            "Complaint Returned to You",
            `Complaint #${complaint.complaintId} has been returned back to you by Admin.`,
            complaint._id
        );

        return res.status(200).json({
            success: true,
            message: "Complaint returned back to Subject Teacher.",
            data: complaint
        });
    } catch (error) {
        console.error("Error in returnBackComplaint:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
