import express from "express";
import { getLeaveRequests, updateLeaveStatus, exportLeaveReport } from "../../controllers/teacher/teacherLeaveController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'principal', 'admin'));

router.get("/", getLeaveRequests);
router.get("/export", exportLeaveReport);
router.patch("/:id", updateLeaveStatus);

export default router;