import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    getSalaryDetails,
    getSalarySlips,
    getAttendanceLogs,
    getAttendanceStats,
    getLeaveHistory,
    applyLeave,
    getLeaveBalance,
    getResignation,
    applyResignation,
    withdrawResignation
} from '../../controllers/admin/adminHrmController.js';

const router = express.Router();

// Apply auth protection & restrict strictly to admin
router.use(protect, authorize('admin'));

router.get('/salary-details', getSalaryDetails);
router.get('/salary-slips', getSalarySlips);
router.get('/attendance/logs', getAttendanceLogs);
router.get('/attendance/stats', getAttendanceStats);
router.get('/leaves', getLeaveHistory);
router.post('/leaves', applyLeave);
router.get('/leaves/balance', getLeaveBalance);
router.get('/resignation', getResignation);
router.post('/resignation', applyResignation);
router.post('/resignation/withdraw', withdrawResignation);

export default router;
