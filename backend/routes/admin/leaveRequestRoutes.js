import express from 'express';
import {
    getStaffLeaves,
    getStaffLeaveById,
    updateStaffLeaveStatus,
    cancelStaffLeave,
    getStaffLeaveSummary,
    getStudentLeaves,
    updateStudentLeaveStatus,
    getLeaveStats,
    bulkLeaveAction,
    exportLeaveData
} from '../../controllers/admin/leaveRequestController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection and admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// Stats
router.get('/stats', getLeaveStats);

// Bulk Actions
router.post('/bulk-action', bulkLeaveAction);

// Export
router.get('/export', exportLeaveData);

// Staff Routes
router.get('/staff', getStaffLeaves);
router.get('/staff/:id', getStaffLeaveById);
router.put('/staff/:id/status', updateStaffLeaveStatus);
router.put('/staff/:id/cancel', cancelStaffLeave);
router.get('/staff/balance/:staffId', getStaffLeaveSummary);

// Student Routes
router.get('/student', getStudentLeaves);
router.put('/student/:id/status', updateStudentLeaveStatus);

export default router;
