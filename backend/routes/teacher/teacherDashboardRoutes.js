import express from "express";
import {
    getDashboardStats,
    getTodaySchedule,
    getAttendanceOverview,
    getRecentActivities,
    getWeeklyAttendanceChart,
    getPerformanceMetrics
} from "../../controllers/teacher/teacherDashboardController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply protection to all teacher routes
router.use(protect);
router.use(authorize("teacher"));

// Dashboard Routes
router.get("/stats", getDashboardStats);
router.get("/schedule", getTodaySchedule);
router.get("/attendance", getAttendanceOverview);
router.get("/activities", getRecentActivities);
router.get("/weekly-chart", getWeeklyAttendanceChart);
router.get("/performance", getPerformanceMetrics);

export default router;
