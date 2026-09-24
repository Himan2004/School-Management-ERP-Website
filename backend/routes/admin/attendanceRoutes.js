import express from "express";
import {
    markStudentAttendance,
    getStudentAttendance,
    updateAttendance,
    getStudentAttendanceReport,
    getAttendanceDashboardStats,
    getAttendanceReportsStats
} from "../../controllers/admin/attendanceController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/dashboard-stats", getAttendanceDashboardStats);
router.get("/reports/stats", getAttendanceReportsStats);
router.post("/mark", markStudentAttendance);
router.get("/", getStudentAttendance);
router.put("/:id", updateAttendance);
router.get("/report/student/:studentId", getStudentAttendanceReport);

export default router;
