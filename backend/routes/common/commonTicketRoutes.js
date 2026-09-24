import express from 'express';
import { 
    createTicket, 
    getMyTickets, 
    getHelpDeskTickets, 
    getTicketDetails, 
    handleTicketAction,
    escalateUniversalTicket
} from '../../controllers/common/commonTicket.controller.js';
import { protect } from "../../middleware/authMiddleware.js"; // Use your standard user auth middleware

const router = express.Router();

// Ensure the user is logged in
router.use(protect);

// Routes for tickets the user raised
router.route('/my-tickets')
    .get(getMyTickets)
    .post(createTicket);

// Routes for tickets assigned to the user's role to solve
router.get('/helpdesk', getHelpDeskTickets);

// Shared specific ticket actions
router.get('/:id', getTicketDetails);
router.patch('/:id/action', handleTicketAction); // Handles both replies and status updates
router.patch('/:id/escalate', escalateUniversalTicket);

export default router;