import express from "express";
import {
    getAttendanceClasses,
    getStudentsForAttendance,
    markAttendance,
    updateAttendance,
    getAttendanceReport,
    getAttendanceStats,
    getTeacherHomeroom
} from "../../controllers/teacher/teacherAttendanceController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply protection to all teacher routes
router.use(protect);
router.use(authorize("teacher"));

// Attendance Routes — ORDER MATTERS
router.get("/classes", getAttendanceClasses);
router.get("/stats", getAttendanceStats);
router.get("/students", getStudentsForAttendance);
router.get("/report", getAttendanceReport);
router.post("/mark", markAttendance);
router.put("/update", updateAttendance);
router.get("/homeroom", getTeacherHomeroom);

export default router;
