import express from "express";
import {
  getExamDashboardStats,
  getExamsList,
  getQuickEntryFilters,
  getMarksEntryTable,
  bulkSaveMarks,
  createExam,
  deleteExam, // <-- ADDED THIS
  getResultStats,
  getResultsList,
  generateResult,
  publishResult,
  getStudentMarksheets,
} from "../../controllers/teacher/teacherExamController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher", "principal", "admin"));

router.get("/dashboard", getExamDashboardStats);
router.get("/list", getExamsList);
router.get("/filters", getQuickEntryFilters);
router.get("/marks-entry", getMarksEntryTable);
router.post("/marks/bulk", bulkSaveMarks);
router.post("/", createExam);
router.delete("/:id", deleteExam); // <-- ADDED THIS

router.get("/stats", getResultStats); // Used in Analytics Tab
router.get("/result", getResultsList); // Used in Results Table
router.post("/generate", generateResult); // Used to compile marks into a result
router.put("/:id/publish", publishResult); // Used to publish a result
router.get("/:id/marksheets", getStudentMarksheets); // Used to view/download individual marksheets

export default router;
