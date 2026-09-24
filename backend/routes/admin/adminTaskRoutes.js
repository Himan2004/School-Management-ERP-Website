import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import {
    createAdminTask,
    getAllAdminTasks,
    getAdminTaskById,
    updateAdminTask,
    deleteAdminTask,
    updateAdminTaskStatus,
    getAdminTaskStats,
    bulkDeleteAdminTasks,
} from '../../controllers/admin/adminTaskController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Stats route (must be before :id route)
router.get('/tasks/stats', getAdminTaskStats);

// Bulk operations
router.delete('/tasks/bulk', bulkDeleteAdminTasks);

// Main CRUD routes
router.get('/tasks', getAllAdminTasks);
router.get('/tasks/:id', getAdminTaskById);

router.post('/tasks', upload.single('file'), (req, res, next) => {
    if (req.file) {
        req.body.attachment = req.file.path;
    }
    next();
}, createAdminTask);

router.put('/tasks/:id', upload.single('file'), (req, res, next) => {
    if (req.file) {
        req.body.attachment = req.file.path;
    }
    next();
}, updateAdminTask);

router.delete('/tasks/:id', deleteAdminTask);

// Status update route
router.patch('/tasks/:id/status', updateAdminTaskStatus);

export default router;