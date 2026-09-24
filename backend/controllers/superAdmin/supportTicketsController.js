import mongoose from 'mongoose';
import Ticket from '../../models/common/Ticket.js';
import School from '../../models/school/School.js';
import User from '../../models/users/user.model.js';

/**
 * GET /api/superadmin/support/tickets
 * Get all support tickets
 */
export const getAllTickets = async (req, res) => {
    try {
        const { search, category, status, priority, page = 1, limit = 50 } = req.query;

        const query = {};

        if (category && category !== 'ALL') {
            query.category = category;
        }
        if (status && status !== 'ALL') {
            query.status = status;
        }
        if (priority && priority !== 'ALL') {
            query.priority = priority;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let tickets = await Ticket.find(query)
            .populate('school', 'name')
            .populate('raisedBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        if (search) {
            tickets = tickets.filter(t => 
                t.school?.name?.toLowerCase().includes(search.toLowerCase()) ||
                t.title?.toLowerCase().includes(search.toLowerCase())
            );
        }

        const totalTickets = await Ticket.countDocuments(query);
        const criticalTickets = await Ticket.countDocuments({ ...query, priority: 'critical', status: { $ne: 'resolved' } });
        const openTickets = await Ticket.countDocuments({ ...query, status: 'open' });
        const resolvedTickets = await Ticket.countDocuments({ ...query, status: 'resolved' });

        const formattedTickets = tickets.map(t => ({
            id: t._id.toString().slice(-8).toUpperCase(),
            branch: t.school?.name || 'Unknown',
            subject: t.title,
            priority: t.priority?.toUpperCase() || 'MEDIUM',
            status: t.status?.toUpperCase() || 'OPEN',
            category: t.category?.toUpperCase() || 'GENERAL',
            time: getTimeAgo(t.createdAt),
            createdAt: t.createdAt,
            raisedBy: t.raisedBy?.name,
        }));

        return res.status(200).json({
            success: true,
            data: {
                tickets: formattedTickets,
                stats: {
                    total: totalTickets,
                    critical: criticalTickets,
                    open: openTickets,
                    resolved: resolvedTickets,
                },
                pagination: {
                    total: tickets.length,
                    page: parseInt(page),
                    pages: Math.ceil(totalTickets / parseInt(limit)),
                },
            },
        });

    } catch (error) {
        console.error('Error in getAllTickets:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/support/tickets/:id/status
 * Update ticket status
 */
export const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionNote } = req.body;

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        ticket.status = status;
        
        if (status === 'resolved') {
            ticket.resolvedAt = new Date();
            ticket.resolvedBy = req.user?._id;
            ticket.resolutionNote = resolutionNote || 'Resolved by super admin';
        }

        if (status === 'closed') {
            ticket.closedAt = new Date();
        }

        await ticket.save();

        return res.status(200).json({
            success: true,
            message: `Ticket marked as ${status}`,
            data: {
                id: ticket._id,
                status: ticket.status,
            },
        });

    } catch (error) {
        console.error('Error in updateTicketStatus:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/support/tickets/:id
 * Get single ticket details
 */
export const getTicketDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const ticket = await Ticket.findById(id)
            .populate('school', 'name address city')
            .populate('raisedBy', 'name email phone')
            .populate('assignedTo', 'name email')
            .populate('resolvedBy', 'name')
            .populate('responses.user', 'name role')
            .lean();

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        return res.status(200).json({
            success: true,
            data: ticket,
        });

    } catch (error) {
        console.error('Error in getTicketDetails:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/superadmin/support/tickets/:id/response
 * Add response to a ticket
 */
export const addTicketResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, attachments } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        ticket.responses.push({
            user: req.user?._id,
            message,
            attachments: attachments || [],
            createdAt: new Date(),
        });

        if (ticket.status === 'open') {
            ticket.status = 'in_progress';
        }

        await ticket.save();

        return res.status(200).json({
            success: true,
            message: 'Response added successfully',
            data: ticket.responses[ticket.responses.length - 1],
        });

    } catch (error) {
        console.error('Error in addTicketResponse:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
}