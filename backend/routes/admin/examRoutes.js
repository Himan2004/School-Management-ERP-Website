import express from "express";
import {
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    getAdminExamSchedules,
    getPendingVerifications,
    getMarksheetForVerification,
    verifyMarksheet,
    getAdminExamStats,
    publishResults,
    createExamStructure,
    getAdminExamStructures,
    updateExamStructure,
    deleteExamStructure,
    getMarksheetsBySchedule,
    bulkVerifyMarksheets,
    getExamDropdownOptions,
    createSimpleExam,
    getAllSimpleExams,
    updateSimpleExam,
    deleteSimpleExam
} from "../../controllers/admin/examController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply protection and authorization to all admin exam routes
router.use(protect);
router.use(authorize("admin"));

// Dashboard & Stats
router.get("/stats", getAdminExamStats);

// Simple Exams (Legacy Frontend Support)
router.get("/dropdown-options", getExamDropdownOptions);
router.post("/create", createSimpleExam);
router.get("/all", getAllSimpleExams);
router.put("/update/:id", updateSimpleExam);
router.delete("/delete/:id", deleteSimpleExam);

// Exam Structures
router.get("/structures", getAdminExamStructures);
router.post("/structure", createExamStructure);
router.put("/structure/:id", updateExamStructure);
router.delete("/structure/:id", deleteExamStructure);

// Exam Schedules
router.get("/schedules", getAdminExamSchedules);
router.post("/create-schedule", createExamSchedule);
router.get("/schedule/:scheduleId/marksheets", getMarksheetsBySchedule);
router.put("/schedule/:id", updateExamSchedule);
router.delete("/schedule/:id", deleteExamSchedule);

// Verification & Publishing
router.get("/pending-verification", getPendingVerifications);
router.get("/verify/:marksheetId", getMarksheetForVerification);
router.put("/verify/:marksheetId", verifyMarksheet);
router.put("/bulk-verify", bulkVerifyMarksheets);
router.put("/publish", publishResults);

export default router;