import express from "express";
import {
    getMyClasses,
    getClassById,
    getClassStats,
    getMySubjects
} from "../../controllers/teacher/teacherClassesController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply protection to all teacher routes
router.use(protect);
router.use(authorize("teacher"));

// Classes Routes — ORDER MATTERS
router.get("/subjects", getMySubjects);
router.get("/", getMyClasses);
router.get("/:id", getClassById);
router.get("/:id/stats", getClassStats);

export default router;
