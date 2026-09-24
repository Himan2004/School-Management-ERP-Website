import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    getAllTickets,
    updateTicketStatus,
    getTicketDetails,
    addTicketResponse,
} from '../../controllers/superAdmin/supportTicketsController.js';
import {
    createSupportTicket,
    getMyTickets,
    getTicketById,
    addMessage,
    closeTicket,
} from '../../controllers/superAdmin/superAdminSupportController.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// ─── Existing: Tickets from schools to SuperAdmin ────────────────────────────
router.get('/support/tickets', getAllTickets);
router.get('/support/tickets/:id', getTicketDetails);
router.put('/support/tickets/:id/status', updateTicketStatus);
router.post('/support/tickets/:id/response', addTicketResponse);

// ─── New: SuperAdmin → Graphura Support Tickets ──────────────────────────────
router.get('/support/graphura-tickets', getMyTickets);
router.post('/support/graphura-tickets', createSupportTicket);
router.get('/support/graphura-tickets/:id', getTicketById);
router.post('/support/graphura-tickets/:id/message', addMessage);
router.patch('/support/graphura-tickets/:id/close', closeTicket);

export default router;