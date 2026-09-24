import express from "express";
import { getAdmissionDashboard } from "../../controllers/admin/admissionTrendsController.js";
import { getDropoutTrackingDashboard } from "../../controllers/admin/dropoutTrackingController.js";
import { getAcademicReportsDashboard, getAcademicReportFilters } from "../../controllers/admin/academicReportsController.js";
import { getStaffPerformanceDashboard } from "../../controllers/admin/staffPerformanceController.js";
import { getExamReportsDashboard, getExamReportFilters } from "../../controllers/admin/examReportsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

// GET /api/admin/reports/admission-trends?academicYear=2025-2026
router.get("/admission-trends", getAdmissionDashboard);

// GET /api/admin/reports/dropout-tracking?academicYear=2025-2026
router.get("/dropout-tracking", getDropoutTrackingDashboard);

// GET /api/admin/reports/academic-reports/filters  → Real classes, sections, academic years
router.get("/academic-reports/filters", getAcademicReportFilters);

// GET /api/admin/reports/academic-reports?academicYear=2025-2026&classId=All&sectionId=All
router.get("/academic-reports", getAcademicReportsDashboard);

// GET /api/admin/reports/staff-performance?academicYear=2025-2026&department=All&staffType=All%20Staff
router.get("/staff-performance", getStaffPerformanceDashboard);

// GET /api/admin/reports/exam-reports/filters
router.get("/exam-reports/filters", getExamReportFilters);

// GET /api/admin/reports/exam-reports?academicYear=2025-2026&examType=All%20Exams&classFilter=All%20Classes&sectionFilter=All%20Sections
router.get("/exam-reports", getExamReportsDashboard);

export default router;

