import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    getPTMs,
    getPTMDetails,
    getPTMSummary,
    getPTMCalendar,
    getTeacherClassesSections,
    createPTM
} from "../../controllers/teacher/subjectTeacherPTM.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/classes-sections", getTeacherClassesSections);
router.get("/", getPTMs);
router.post("/", createPTM);
router.get("/summary", getPTMSummary);
router.get("/calendar", getPTMCalendar);
router.get("/:id", getPTMDetails);

export default router;
