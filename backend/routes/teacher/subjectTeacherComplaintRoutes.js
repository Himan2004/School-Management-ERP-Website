import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    createComplaint,
    getComplaints,
    getComplaintDetails,
    updateComplaintDetails,
    updateComplaintStatus,
    escalateComplaint,
    replyComplaint,
    getDashboardStats,
    getStudentsList,
    getParentsList,
    getClassesList,
    getStudentsByClass
} from "../../controllers/teacher/subjectTeacherComplaint.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher"));

router.get("/dashboard", getDashboardStats);
router.get("/students", getStudentsList);
router.get("/parents", getParentsList);
router.get("/classes", getClassesList);
router.get("/students-by-class", getStudentsByClass);

router.route("/")
    .post(createComplaint)
    .get(getComplaints);

router.route("/:id")
    .get(getComplaintDetails)
    .put(updateComplaintDetails);

router.patch("/status", updateComplaintStatus);
router.patch("/escalate", escalateComplaint);
router.post("/reply", replyComplaint);

export default router;
