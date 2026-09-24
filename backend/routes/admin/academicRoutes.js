import express from "express";
import {
    getAcademicConfig,
    updateAcademicConfig,
    addCalendarEvent
} from "../../controllers/admin/academicConfigController.js";
import {
    getClassPerformanceTrends,
    getSubjectAverages,
    getAttendanceTrends,
    getDashboardPerformance
} from "../../controllers/admin/academicAnalyticsController.js";
import {
    getClassesSections,
    getTeacherAssignments,
    getSubjects,
    createClass,
    updateClass,
    upsertClassSection,
    createSubject,
    updateSubject,
    deleteSubject,
    createTeacherAssignment,
    deleteTeacherAssignment
} from "../../controllers/principal/academicsController.js";
import {
    getLectures,
    getLectureById,
    createLecture,
    updateLecture,
    deleteLecture,
    getLectureDashboard,
    getLectureFilterData
} from "../../controllers/admin/lectureController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Classes & Assignments (readable by both admin and accountant)
router.get("/classes-sections", authorize("admin", "accountant"), getClassesSections);

// Academic Configuration (read-only for accountant)
router.get("/config", authorize("admin", "accountant"), getAcademicConfig);

router.use(authorize("admin"));

// Config
router.put("/config", updateAcademicConfig);
router.post("/config/calendar", addCalendarEvent);

// Lectures
router.get("/lectures/dashboard", getLectureDashboard);
router.get("/lectures/filter-data", getLectureFilterData);
router.get("/lectures", getLectures);
router.get("/lectures/:id", getLectureById);
router.post("/lectures", createLecture);
router.put("/lectures/:id", updateLecture);
router.delete("/lectures/:id", deleteLecture);
router.post("/classes", createClass);
router.put("/classes/:id", updateClass);
router.post("/classes-sections/upsert", upsertClassSection);
router.get("/teacher-assignments", getTeacherAssignments);
router.get("/subjects", getSubjects);
router.post("/subjects", createSubject);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);
router.post("/teacher-assignments", createTeacherAssignment);
router.delete("/teacher-assignments/:id", deleteTeacherAssignment);

// Analytics
router.get("/analytics/dashboard-performance", getDashboardPerformance);
router.get("/analytics/performance/:classId", getClassPerformanceTrends);
router.get("/analytics/subject-averages/:classId", getSubjectAverages);
router.get("/analytics/attendance", getAttendanceTrends);

export default router;
