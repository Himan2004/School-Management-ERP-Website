import express from "express";
import {
    getAllStudents,
    getStudentStats,
    searchStudents,
    getStudentsByMultiFilter,
    getStudentProfile,
    getStudentsByClass,
    getStudentAttendance,
    getStudentPerformance,
    getStudentDocuments,
    getGuardianInfo,
    getEditHistory,
    getPromotionHistory,
    getReportCards,
    getCommunicationHistory,
    getClassPerformance,
    getLowPerformers,
    getPromotionReadiness,
    getLowAttendanceStudents,
    getClasses,
    exportStudentList,
    getTransferRequests,
    sendStudentNotice
} from "../../controllers/principal/studentController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and restricted to Principal
router.use(protect);
router.use(authorize("principal"));

// Phase 1 Routes: Main Viewing
router.get("/all", getAllStudents);
router.get("/stats", getStudentStats);
router.get("/classes", getClasses);
router.get("/search", searchStudents);
router.get("/search/filters", getStudentsByMultiFilter);
router.get("/class/:classId", getStudentsByClass);

// Phase 2 Routes: Student Details
router.get("/:id", getStudentProfile);
router.get("/:id/attendance", getStudentAttendance);
router.get("/:id/performance", getStudentPerformance);
router.get("/:id/documents", getStudentDocuments);
router.get("/:id/guardian", getGuardianInfo);
router.get("/:id/edit-history", getEditHistory);
router.get("/:id/promotion-history", getPromotionHistory);
router.get("/:id/report-cards", getReportCards);
router.get("/:id/communication", getCommunicationHistory);

// Phase 3 Routes: Analytics & Reports
router.get("/analytics/class-performance", getClassPerformance);
router.get("/analytics/low-performers", getLowPerformers);
router.get("/analytics/promotion-ready", getPromotionReadiness);
router.get("/analytics/low-attendance", getLowAttendanceStudents);

// Phase 4 Routes: Management Operations
router.get("/operations/export", exportStudentList);
router.get("/operations/transfer-requests", getTransferRequests);
router.post("/operations/send-notice", sendStudentNotice);

export default router;
