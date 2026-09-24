import express from 'express';
import { getConversations, getContacts, getChatHistory, sendMessage } from '../../controllers/teacher/messageController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Make sure user is logged in

router.get('/conversations', getConversations);
router.get('/contacts', getContacts);
router.route('/:receiverId')
    .get(getChatHistory)
    .post(sendMessage);

export default router;