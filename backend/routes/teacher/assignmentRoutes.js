import express from "express";
import { 
    getAssignments, 
    createAssignment, 
    updateAssignment, 
    deleteAssignment,
    getTeacherClasses,
    getAssignmentSubmissions,
    saveGrades
} from "../../controllers/teacher/teacherAssignmentController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'principal', 'admin'));

// Dynamic class dropdown route
router.get("/classes", getTeacherClasses);

// Core CRUD
router.route("/")
    .get(getAssignments)
    .post(createAssignment);

router.route("/:id")
    .put(updateAssignment)
    .delete(deleteAssignment);

// Submissions & Grading
router.route("/:id/submissions")
    .get(getAssignmentSubmissions);
    
router.route("/:id/grades")
    .put(saveGrades);

export default router;