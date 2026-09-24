import express from "express";
import { getStudentResults } from "../../controllers/student/studentResultsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

router.get("/", getStudentResults);

export default router;