import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYearStatus,
  addHoliday,
  deleteHoliday,
  addTerm,
  deleteTerm,
  getClassesSections,
  upsertClassSection,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getTeacherAssignments,
  createTeacherAssignment,
  deleteTeacherAssignment,
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  createClass,
  updateClass
} from "../../controllers/principal/academicsController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal", "admin"));

router.get("/academics/academic-years", getAcademicYears);
router.post("/academics/academic-years", createAcademicYear);
router.patch("/academics/academic-years/:id/status", updateAcademicYearStatus);
router.post("/academics/academic-years/:id/holidays", addHoliday);
router.delete("/academics/holidays/:holidayId", deleteHoliday);
router.post("/academics/academic-years/:id/terms", addTerm);
router.delete("/academics/terms/:termId", deleteTerm);

router.get("/academics/classes-sections", getClassesSections);
router.post("/academics/classes", createClass);
router.put("/academics/classes/:id", updateClass);
router.post("/academics/classes-sections/upsert", upsertClassSection);

router.get("/academics/subjects", getSubjects);
router.post("/academics/subjects", createSubject);
router.put("/academics/subjects/:id", updateSubject);
router.delete("/academics/subjects/:id", deleteSubject);

router.get("/academics/teacher-assignments", getTeacherAssignments);
router.post("/academics/teacher-assignments", createTeacherAssignment);
router.delete("/academics/teacher-assignments/:id", deleteTeacherAssignment);

router.get("/academics/timetables", getTimetables);
router.post("/academics/timetables", createTimetable);
router.put("/academics/timetables/:id", updateTimetable);
router.delete("/academics/timetables/:id", deleteTimetable);

export default router;