import express from "express";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeachers,
  updateTeacher,
  updateTeacherStatus,
} from "../../controllers/principal/teachersController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(authorize("admin"));

// CRUD Routes
router.get("/", getTeachers);
router.post("/", createTeacher);
router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);
router.patch("/:id/status", updateTeacherStatus);
router.delete("/:id", deleteTeacher);

export default router;
