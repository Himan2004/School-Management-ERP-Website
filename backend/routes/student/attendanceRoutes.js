import express from "express";
import { getStudentAttendance } from "../../controllers/student/studentAttendanceController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize('student'), getStudentAttendance);

export default router;