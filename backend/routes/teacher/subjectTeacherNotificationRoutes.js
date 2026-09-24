import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    getSubjectTeacherNotifications,
    markSubjectTeacherNotificationRead,
    markAllSubjectTeacherNotificationsRead
} from "../../controllers/teacher/subjectTeacherNotification.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/", getSubjectTeacherNotifications);
router.patch("/:id/read", markSubjectTeacherNotificationRead);
router.post("/mark-all-read", markAllSubjectTeacherNotificationsRead);

export default router;
