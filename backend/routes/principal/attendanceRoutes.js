import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    // Student Attendance
    getStudentAttendanceReports,
    getStudentCalendar,
    
    // Staff Attendance
    getStaffList,
    getStaffAttendance,
    markStaffAttendance,
    getStaffAttendanceReports,
    
    // Leave requests approval (Phase 9)
    getAdminLeaveRequests,
    approveAdminLeave,
    rejectAdminLeave,
    getOtherStaffAttendance,
} from '../../controllers/principal/attendanceController.js';

const router = express.Router();

// All routes require authentication and principal role
router.use(protect);
router.use(authorize('principal', 'admin'));

// ==================== STUDENT ATTENDANCE ROUTES ====================
// Get student attendance reports with filters
router.get('/attendance/student-reports', getStudentAttendanceReports);

// Get student monthly calendar view
router.get('/attendance/student-calendar', getStudentCalendar);

// ==================== STAFF ATTENDANCE ROUTES ====================
// Get staff list for attendance marking
router.get('/attendance/staff-list', getStaffList);

// Get staff attendance for a specific date
router.get('/attendance/staff-attendance', getStaffAttendance);

// Mark staff attendance (POST)
router.post('/attendance/mark-staff', markStaffAttendance);

// Get staff attendance reports
router.get('/attendance/staff-reports', getStaffAttendanceReports);

// Get other staff attendance (view-only)
router.get('/attendance/other-staff-attendance', getOtherStaffAttendance);

// ==================== LEAVE APPROVAL ROUTES (Phase 9) ====================
router.get('/attendance/admin-leaves', getAdminLeaveRequests);
router.post('/attendance/admin-leaves/:id/approve', approveAdminLeave);
router.post('/attendance/admin-leaves/:id/reject', rejectAdminLeave);

export default router;