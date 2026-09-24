import express from "express";
import {
    createTimetable,
    getTimetables,
    getTimetableById,
    updateTimetable,
    deleteTimetable,
    deleteDraftTemplate,
    getTeacherTimetable,
    getPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
    reorderPeriods,
    duplicatePeriod,
    generateDraft,
    copyTimetable,
    checkConflicts,
    getTimetableAcademicYears,
    getPublishedTimetables,
    toggleTimetableStatus,
    updateTimetableAcademicYear
} from "../../controllers/admin/timetableController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/academic-years", getTimetableAcademicYears);
router.get("/published", getPublishedTimetables);

// Timetable Core CRUD
router.post("/", createTimetable);
router.get("/", getTimetables);
router.get("/draft", generateDraft);
router.post("/copy", copyTimetable);
router.post("/check-conflicts", checkConflicts);
router.delete("/template", deleteDraftTemplate);
router.get("/:id", getTimetableById);
router.put("/:id/toggle-active", toggleTimetableStatus);
router.patch("/:id/academic-year", updateTimetableAcademicYear);
router.put("/:id", updateTimetable);
router.delete("/:id", deleteTimetable);
router.get("/teacher/:teacherId", getTeacherTimetable);

// Period Settings CRUD
router.get("/periods/all", getPeriods);
router.post("/periods", createPeriod);
router.post("/periods/reorder", reorderPeriods);
router.post("/periods/:id/duplicate", duplicatePeriod);
router.put("/periods/:id", updatePeriod);
router.delete("/periods/:id", deletePeriod);

export default router;
