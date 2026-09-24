import express from 'express';
import {
    getStudentAttendance,
    getStudentAttendanceDetails
} from '../../controllers/principal/studentAttendance.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and principal role
router.use(protect);
router.use(authorize('principal'));

// Get all students with attendance data
router.get('/attendance/students', getStudentAttendance);

// Get detailed attendance for a specific student
router.get('/attendance/student/:studentId', getStudentAttendanceDetails);

export default router;