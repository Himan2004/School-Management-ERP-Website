import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';

// Broadcast Notices Controllers
import {
    getAllNotices,
    createNotice,
    createBulkNotice,
    deleteNotice,
    getNoticeById,
    getNoticeStats
} from '../../controllers/superAdmin/communication/broadcastNoticesController.js';



const router = express.Router();

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// ==================== Broadcast Notices Routes ====================
router.get('/communication/notices', getAllNotices);
router.get('/communication/notices/stats', getNoticeStats);
router.get('/communication/notices/:id', getNoticeById);
router.post('/communication/notices', createNotice);
router.post('/communication/notices/bulk', createBulkNotice);
router.delete('/communication/notices/:id', deleteNotice);



export default router;