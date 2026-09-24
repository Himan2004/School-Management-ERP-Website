import express from 'express';
import { 
    createTicket, 
    getAllTickets, 
    getTicketById, 
    addResponse,
    getTicketStats,
    closeTicket
} from '../../controllers/parent/ticketController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected and for parents only
router.use(protect);
router.use(authorize('parent'));

router.post('/', createTicket);
router.get('/', getAllTickets);
router.get('/stats', getTicketStats);
router.get('/:id', getTicketById);
router.post('/:id/responses', addResponse);
router.patch('/:id/close', closeTicket);

export default router;
