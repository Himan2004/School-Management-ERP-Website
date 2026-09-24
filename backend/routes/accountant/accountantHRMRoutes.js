import express from 'express';
import {
    getHRMDashboardStats,
    toggleAttendance,
    applyLeaveRequest,
    submitComplaint
} from '../../controllers/accountant/accountantHRMController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('accountant', 'admin'));

router.get('/hrm/dashboard', getHRMDashboardStats);
router.post('/hrm/attendance/toggle', toggleAttendance);
router.post('/hrm/leave', applyLeaveRequest);
router.post('/hrm/complaint', submitComplaint);

export default router;
