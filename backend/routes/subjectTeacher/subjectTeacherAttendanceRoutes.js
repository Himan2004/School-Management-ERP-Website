import express from 'express';
import {
    getSubjectWiseAttendance,
    markAttendance,
    editAttendance,
    applyLeave,
    getMyAttendance,
    clockIn,
    clockOut,
    getMyLeaves,
    applyMyLeave
} from '../../controllers/subjectTeacher/subjectTeacherAttendanceController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/', getSubjectWiseAttendance);
router.post('/mark', markAttendance);
router.put('/edit', editAttendance);
router.post('/leave', applyLeave);

// Subject Teacher's own attendance and leaves
router.get('/my-attendance', getMyAttendance);
router.post('/my-attendance/clock-in', clockIn);
router.post('/my-attendance/clock-out', clockOut);

router.get('/my-leaves', getMyLeaves);
router.post('/my-leaves/apply', applyMyLeave);

export default router;
