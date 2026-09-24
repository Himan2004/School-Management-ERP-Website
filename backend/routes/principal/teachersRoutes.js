import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeacherSchedule,
  getTeachers,
  updateTeacher,
  updateTeacherStatus,
} from "../../controllers/principal/teachersController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal", "admin"));

router.get("/teachers", getTeachers);
router.post("/teachers", createTeacher);
router.get("/teachers/schedule", getTeacherSchedule);
router.get("/teachers/:id", getTeacherById);
router.put("/teachers/:id", updateTeacher);
router.patch("/teachers/:id/status", updateTeacherStatus);
router.delete("/teachers/:id", deleteTeacher);

export default router;

