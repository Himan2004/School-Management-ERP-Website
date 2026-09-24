import express from "express";
const router = express.Router();

import { getTeacher, loginTeacher, logoutTeacher } from "../../controllers/auth/teacherAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

router.post("/login", loginTeacher);
router.post("/logout", logoutTeacher);
router.get("/me", protect, authorize("teacher"), getTeacher);

export default router;