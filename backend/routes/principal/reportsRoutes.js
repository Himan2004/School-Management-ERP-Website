import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    // Academic Reports
    getAcademicReports,
    getSubjectDeepDive,
    getExamComparison,
    
    // Financial Reports
    getFinancialReports,
    getDueStudents,
} from '../../controllers/principal/reportsController.js';

import { getAcademicFilters } from '../../controllers/principal/reportsController.js';

import {
    getStudentReports,
    getStudentStats,
    exportStudentAttendance,
    getStaffReports,
    getStaffStats,
    exportStaffAttendance
} from '../../controllers/principal/attendanceReportsController.js';

const router = express.Router();

// All routes require authentication and principal role
router.use(protect);
router.use(authorize('principal', 'admin'));

// ==================== ACADEMIC REPORTS ====================
// Get academic performance reports
router.get('/reports/academic', getAcademicReports);
router.get('/academic/filters', getAcademicFilters);

// Get subject-wise deep dive analysis
router.get('/reports/academic/subject-deepdive', getSubjectDeepDive);

// Get exam comparison data
router.get('/reports/academic/exam-comparison', getExamComparison);

// ==================== FINANCIAL REPORTS ====================
// Get financial reports (revenue, collection, expenses)
router.get('/reports/financial', getFinancialReports);

// Get due students list for a specific class
router.get('/reports/financial/due-students', getDueStudents);

// ==================== ATTENDANCE REPORTS ====================
router.get('/attendance-reports/students', getStudentReports);
router.get('/attendance-reports/students/stats', getStudentStats);
router.get('/attendance-reports/students/export', exportStudentAttendance);

router.get('/attendance-reports/staff', getStaffReports);
router.get('/attendance-reports/staff/stats', getStaffStats);
router.get('/attendance-reports/staff/export', exportStaffAttendance);

export default router;