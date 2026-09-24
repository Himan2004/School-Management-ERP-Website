import express from "express";
import { getStudentHomework, submitHomework } from "../../controllers/student/studentHomeworkController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { memoryUpload } from "../../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

router.get("/", getStudentHomework);

// multer stores file in memory buffer → controller uploads to Cloudinary
router.post("/:id/submit", memoryUpload.single("file"), submitHomework);

export default router;