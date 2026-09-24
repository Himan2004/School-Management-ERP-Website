import express from "express";
import {
    getMyStudents,
    getStudentById,
    getStudentStats,
    getStudentAttendance,
    getStudentPerformance,
    getBehaviourLogs,
    createBehaviourLog,
    getCommunicationLogs,
    sendParentMessage,
    scheduleParentMeeting,
    getStudentDocuments,
    uploadStudentDocument
} from "../../controllers/teacher/teacherStudentsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload, { memoryUpload } from "../../middleware/upload.js";

const router = express.Router();

// Apply protection to all teacher routes
router.use(protect);
router.use(authorize("teacher"));

// Students Routes — ORDER MATTERS
router.get("/stats", getStudentStats);
router.get("/behaviour", getBehaviourLogs);
router.post("/behaviour", createBehaviourLog);
router.get("/communication", getCommunicationLogs);
router.post("/communication/message", sendParentMessage);
router.post("/communication/meeting", scheduleParentMeeting);
router.get("/documents", getStudentDocuments);
router.post("/documents/upload", memoryUpload.single("file"), uploadStudentDocument);

router.get("/", getMyStudents);
router.get("/:studentId", getStudentById);
router.get("/:studentId/attendance", getStudentAttendance);
router.get("/:studentId/performance", getStudentPerformance);

export default router;
