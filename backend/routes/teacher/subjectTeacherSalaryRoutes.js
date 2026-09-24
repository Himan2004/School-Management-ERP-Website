import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    getSalarySummary,
    getSalaryHistory,
    getSalaryAnalytics
} from "../../controllers/teacher/subjectTeacherSalary.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/summary", getSalarySummary);
router.get("/history", getSalaryHistory);
router.get("/analytics", getSalaryAnalytics);

export default router;
