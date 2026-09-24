import Ticket from "../../models/common/Ticket.js";
import mongoose from "mongoose";

// Helper function to resolve school ID from req
const getSchoolId = (req) => {
    return req.user?.school?._id || req.user?.school;
};

/**
 * @desc    Get all tickets for the admin's school
 * @route   GET /api/admin/tickets
 * @access  Private (Admin)
 */
export const getAdminTickets = async (req, res) => {
    try {
        const schoolId = getSchoolId(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School context missing" });
        }

        const tickets = await Ticket.find({ 
            school: schoolId,
            receiverType: { $nin: ["Teacher", "ClassTeacher"] },
            assignedToRole: { $ne: "teacher" },
            $or: [
                { receiverId: req.user._id },
                { receiverId: { $exists: false } },
                { receiverId: null }
            ]
        })
            .populate("raisedBy", "name email role")
            .sort({ createdAt: -1 })
            .lean();

        // Format for frontend
        const formattedTickets = tickets.map(ticket => ({
            id: ticket._id,
            ticketNo: ticket._id.toString().substring(18).toUpperCase(), // last 6 chars as human readable ticket number
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            sender: ticket.raisedBy?.name || "Unknown",
            senderRole: ticket.raisedByRole || ticket.raisedBy?.role || "user",
            createdDate: ticket.createdAt,
            time: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""
        }));

        return res.status(200).json({ success: true, data: formattedTickets });
    } catch (error) {
        console.error("Error in getAdminTickets:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update ticket status
 * @route   PATCH /api/admin/tickets/:id/status
 * @access  Private (Admin)
 */
export const updateAdminTicketStatus = async (req, res) => {
    try {
        const schoolId = getSchoolId(req);
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !["open", "in_progress", "closed"].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Valid status is required (open, in_progress, closed)" 
            });
        }

        const ticket = await Ticket.findOneAndUpdate(
            { _id: id, school: schoolId },
            { status },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Ticket status updated successfully",
            data: ticket
        });
    } catch (error) {
        console.error("Error in updateAdminTicketStatus:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
