import express from "express";
import { getStudentTimetable } from "../../controllers/student/studentTimetableController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

router.get("/", getStudentTimetable);

export default router;