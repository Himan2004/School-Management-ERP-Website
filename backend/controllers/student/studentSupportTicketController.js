import Ticket from "../../models/common/Ticket.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";
import "../../models/organization/organizationClass.js";
import "../../models/school/Section.model.js";

/**
 * Helper to map DB Ticket to frontend expected format
 */
const mapTicketToFrontend = (ticket, userId) => {
    const messages = [
        {
            type: "user",
            text: ticket.description,
            timestamp: ticket.createdAt
        },
        ...(ticket.responses || []).map(res => ({
            type: res.user?.toString() === userId.toString() ? "user" : "admin",
            text: res.message,
            timestamp: res.createdAt
        }))
    ];

    let category = "Other";
    if (ticket.category === "fee") category = "Fees";
    else if (ticket.category === "academic") category = "Academic";
    else if (ticket.category === "general") category = "Technical";
    else if (ticket.category === "transport") category = "Other";

    if (ticket.category && ["Technical", "Library", "Fees", "Other", "Academic"].includes(ticket.category)) {
        category = ticket.category;
    }

    return {
        id: ticket._id.toString(),
        subject: ticket.title,
        description: ticket.description,
        category,
        priority: ticket.priority || "medium",
        status: ticket.status || "open",
        createdAt: ticket.createdAt,
        messages
    };
};

/**
 * @desc    Get support tickets for logged-in student
 * @route   GET /api/student/support-tickets
 * @access  Private (Student)
 */
export const getSupportTickets = async (req, res) => {
    try {
        const userId = req.user._id;
        const tickets = await Ticket.find({ raisedBy: userId, raisedByRole: "student" })
            .sort({ createdAt: -1 });

        const data = tickets.map(ticket => mapTicketToFrontend(ticket, userId));

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getSupportTickets:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create new support ticket
 * @route   POST /api/student/support-tickets
 * @access  Private (Student)
 */
export const createSupportTicket = async (req, res) => {
    try {
        const userId = req.user._id;
        const { subject, category, priority, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ success: false, message: "subject and description are required" });
        }

        let schoolId = req.user.school?._id || req.user.school;
        let organizationId = req.user.organization;
        let className = "";
        let sectionName = "";

        const studentProfile = await Student.findOne({ user: userId }).populate("class section");
        if (studentProfile) {
            schoolId = studentProfile.school;
            className = studentProfile.class?.name || "";
            sectionName = studentProfile.section?.name || "";
        }

        if (schoolId) {
            const school = await School.findById(schoolId);
            if (school) {
                organizationId = school.organization;
            }
        }

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "School or organization context not found for user" });
        }

        // Map frontend categories to Mongoose Ticket categories
        let dbCategory = "general";
        if (category === "Fees") dbCategory = "fee";
        else if (category === "Technical") dbCategory = "general";
        else if (category === "Library") dbCategory = "general";
        else if (category === "Other") dbCategory = "general";
        else if (category) {
            const lowerCat = category.toLowerCase();
            const allowed = ["academic", "fee", "discipline", "transport", "general", "complaint", "query"];
            if (allowed.includes(lowerCat)) {
                dbCategory = lowerCat;
            }
        }

        // Route academic tickets to teacher, all others to admin
        const assignedToRole = dbCategory === "academic" ? "teacher" : "admin";

        const ticket = await Ticket.create({
            organization: organizationId,
            school: schoolId,
            title: subject,
            description,
            category: dbCategory,
            priority: priority || "medium",
            raisedBy: userId,
            raisedByRole: "student",
            assignedToRole,
            class: className,
            section: sectionName,
            status: "open"
        });

        return res.status(201).json({
            success: true,
            data: mapTicketToFrontend(ticket, userId)
        });
    } catch (error) {
        console.error("Error in createSupportTicket:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Add reply message to support ticket
 * @route   POST /api/student/support-tickets/:ticketId/messages
 * @access  Private (Student)
 */
export const addTicketMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        const ticket = await Ticket.findOne({ _id: ticketId, raisedBy: userId, raisedByRole: "student" });
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found or access denied" });
        }

        ticket.responses.push({
            user: userId,
            message,
            createdAt: new Date()
        });

        await ticket.save();

        return res.status(200).json({
            success: true,
            data: mapTicketToFrontend(ticket, userId)
        });
    } catch (error) {
        console.error("Error in addTicketMessage:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
