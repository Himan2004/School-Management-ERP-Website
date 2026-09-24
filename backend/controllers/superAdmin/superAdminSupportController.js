import SuperAdminSupportTicket from "../../models/superAdmin/SuperAdminSupportTicket.js";

// ─── Create a new support ticket (SuperAdmin → Graphura) ─────────────────────
export const createSupportTicket = async (req, res) => {
    try {
        const { subject, category, priority, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ success: false, message: "Subject and description are required." });
        }

        const superAdminProfile = req.superAdmin; // SuperAdmin profile doc
        const organization = req.user;              // Organization doc (set by authMiddleware for superadmin)

        if (!superAdminProfile || !organization) {
            return res.status(403).json({ success: false, message: "SuperAdmin profile not found." });
        }

        const ticket = await SuperAdminSupportTicket.create({
            superAdmin: superAdminProfile._id,
            organization: organization._id,
            subject,
            category: category || "other",
            priority: priority || "medium",
            description,
            status: "open",
            messages: [
                {
                    sender: superAdminProfile.name || "Super Admin",
                    senderId: superAdminProfile._id,
                    role: "superadmin",
                    message: description,
                    timestamp: new Date()
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: "Support ticket submitted to Graphura successfully.",
            data: ticket
        });
    } catch (error) {
        console.error("[createSupportTicket]", error);
        return res.status(500).json({ success: false, message: "Failed to create support ticket." });
    }
};

// ─── Get all tickets raised by this SuperAdmin ────────────────────────────────
export const getMyTickets = async (req, res) => {
    try {
        const superAdminProfile = req.superAdmin;
        const { status, category, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { superAdmin: superAdminProfile._id };
        if (status && status !== "all") filter.status = status;
        if (category && category !== "all") filter.category = category;

        const [tickets, total] = await Promise.all([
            SuperAdminSupportTicket.find(filter)
                .sort({ lastActivityAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SuperAdminSupportTicket.countDocuments(filter)
        ]);

        // Stats
        const allTickets = await SuperAdminSupportTicket.find({ superAdmin: superAdminProfile._id }).lean();
        const stats = {
            total: allTickets.length,
            open: allTickets.filter(t => t.status === "open").length,
            inProgress: allTickets.filter(t => t.status === "in-progress").length,
            resolved: allTickets.filter(t => t.status === "resolved").length,
        };

        return res.status(200).json({
            success: true,
            data: {
                tickets,
                stats,
                pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
            }
        });
    } catch (error) {
        console.error("[getMyTickets]", error);
        return res.status(500).json({ success: false, message: "Failed to fetch support tickets." });
    }
};

// ─── Get a single ticket with full conversation ───────────────────────────────
export const getTicketById = async (req, res) => {
    try {
        const superAdminProfile = req.superAdmin;
        const ticket = await SuperAdminSupportTicket.findOne({
            _id: req.params.id,
            superAdmin: superAdminProfile._id
        }).lean();

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        return res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        console.error("[getTicketById]", error);
        return res.status(500).json({ success: false, message: "Failed to fetch ticket details." });
    }
};

// ─── Add a follow-up message to a ticket ─────────────────────────────────────
export const addMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const superAdminProfile = req.superAdmin;

        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }

        const ticket = await SuperAdminSupportTicket.findOne({
            _id: req.params.id,
            superAdmin: superAdminProfile._id
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        ticket.messages.push({
            sender: superAdminProfile.name || "Super Admin",
            senderId: superAdminProfile._id,
            role: "superadmin",
            message: message.trim(),
            timestamp: new Date()
        });

        // Re-open if resolved/closed
        if (ticket.status === "resolved" || ticket.status === "closed") {
            ticket.status = "open";
        }

        await ticket.save();

        return res.status(200).json({
            success: true,
            message: "Message sent successfully.",
            data: ticket.messages[ticket.messages.length - 1]
        });
    } catch (error) {
        console.error("[addMessage]", error);
        return res.status(500).json({ success: false, message: "Failed to send message." });
    }
};

// ─── Close a ticket (by SuperAdmin) ──────────────────────────────────────────
export const closeTicket = async (req, res) => {
    try {
        const superAdminProfile = req.superAdmin;

        const ticket = await SuperAdminSupportTicket.findOneAndUpdate(
            { _id: req.params.id, superAdmin: superAdminProfile._id },
            { status: "closed" },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        return res.status(200).json({ success: true, message: "Ticket closed.", data: ticket });
    } catch (error) {
        console.error("[closeTicket]", error);
        return res.status(500).json({ success: false, message: "Failed to close ticket." });
    }
};
