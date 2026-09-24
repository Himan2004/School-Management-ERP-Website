import GraphuraSupportTicket from "../../models/graphura/GraphuraSupportTicket.js";
import GraphuraFAQ from "../../models/graphura/GraphuraFAQ.js";
import GraphuraVideo from "../../models/graphura/GraphuraVideo.js";
import GraphuraResource from "../../models/graphura/GraphuraResource.js";
import mongoose from "mongoose";

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const getSupportTickets = async (req, res) => {
    try {
        // Tickets for the logged-in admin
        const tickets = await GraphuraSupportTicket.find({ admin: req.user._id })
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        console.error("[getSupportTickets] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch support tickets",
        });
    }
};

export const createSupportTicket = async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Subject and message are required",
            });
        }

        const newTicket = await GraphuraSupportTicket.create({
            admin: req.user._id,
            subject,
            category,
            priority,
            message,
            status: "open",
            messages: [
                {
                    sender: req.user.fullName || "Graphura Admin",
                    senderId: req.user._id,
                    role: "admin",
                    message,
                    timestamp: new Date(),
                    isStaff: false,
                },
            ],
        });

        return res.status(201).json({
            success: true,
            message: "Support ticket created successfully",
            data: newTicket,
        });
    } catch (error) {
        console.error("[createSupportTicket] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create support ticket",
        });
    }
};

export const addTicketMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message content is required",
            });
        }

        const ticket = await GraphuraSupportTicket.findOne({
            _id: ticketId,
            admin: req.user._id,
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Support ticket not found or access denied",
            });
        }

        const newMessage = {
            sender: req.user.fullName || "Graphura Admin",
            senderId: req.user._id,
            role: "admin",
            message,
            timestamp: new Date(),
            isStaff: false,
        };

        ticket.messages.push(newMessage);
        ticket.status = "open"; // Re-open or keep open on new message
        await ticket.save();

        return res.status(200).json({
            success: true,
            message: "Message added successfully",
            data: { 
                ticketId: ticket._id, 
                message: ticket.messages[ticket.messages.length - 1] 
            },
        });
    } catch (error) {
        console.error("[addTicketMessage] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add message to ticket",
        });
    }
};

// ─── FAQs ────────────────────────────────────────────────────────────────────

export const getSupportFAQs = async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = { isActive: true };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: 'i' } },
                { answer: { $regex: search, $options: 'i' } }
            ];
        }

        const faqs = await GraphuraFAQ.find(filter).sort({ category: 1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: faqs,
        });
    } catch (error) {
        console.error("[getSupportFAQs] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs",
        });
    }
};

export const submitFaqFeedback = async (req, res) => {
    try {
        const { faqId } = req.params;
        const { isHelpful } = req.body;

        const update = isHelpful 
            ? { $inc: { helpfulCount: 1 } } 
            : { $inc: { notHelpfulCount: 1 } };

        const faq = await GraphuraFAQ.findByIdAndUpdate(faqId, update, { new: true });

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Feedback submitted successfully"
        });
    } catch (error) {
        console.error("[submitFaqFeedback] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit feedback"
        });
    }
};

// ─── Video Tutorials ─────────────────────────────────────────────────────────

export const getSupportVideos = async (req, res) => {
    try {
        const videos = await GraphuraVideo.find({ isActive: true }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: videos,
        });
    } catch (error) {
        console.error("[getSupportVideos] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch video tutorials",
        });
    }
};

// ─── Resources ───────────────────────────────────────────────────────────────

export const getSupportResources = async (req, res) => {
    try {
        const resources = await GraphuraResource.find({ isActive: true }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: resources,
        });
    } catch (error) {
        console.error("[getSupportResources] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch resources",
        });
    }
};
