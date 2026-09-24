import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";
import {
    getTeacherProfile,
    updateTeacherProfile,
    uploadProfileImage,
    changeTeacherPassword
} from "../../controllers/teacher/subjectTeacherProfile.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/profile", getTeacherProfile);
router.put("/profile", updateTeacherProfile);
router.patch("/profile/image", upload.single("avatar"), uploadProfileImage);
router.patch("/change-password", changeTeacherPassword);

export default router;
