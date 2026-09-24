import express from "express";
import {
  createAdmin,
  getRegisteredOrganizations,
  getOrganizationBranches,
  getAdmissionRequests,
  getAdmissionRequestById,
  approveAdmissionRequest,
  rejectAdmissionRequest,
  getAdmissionStatistics,
  bulkUpdateAdmissionStatus,
  getDashboardOverview,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../controllers/principal/principalController.js";
import {
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
  getPendingVerifications,
  getMarksheetForVerification,
  verifyMarksheet,
  publishResults,
  getPrincipalExamStats,
  getAvailableExamStructures,
  bulkVerifyMarksheets,
  getPrincipalMarksheets,
  getPrincipalMarksheetStats,
  getCompletedPrincipalExams,
  getAdmitCardEligibleExams,
  getClassesWithSectionsForExams,
  getExamSchedules,
  getStudentsForMarksEntry, // <-- ADD THIS
  saveExamMarks,
  getClassSubjectsForExams, // <-- ADD THIS
  createExamStructure,
} from "../../controllers/principal/principalExamController.js";
import upload from "../../middleware/upload.js";
import {
  getPrincipalProfile,
  updatePrincipalProfile,
  uploadPrincipalAvatar,
  removePrincipalAvatar,
  changePrincipalPassword,
} from "../../controllers/principal/principalProfileController.js";
import { getExamScheduleDetails } from "../../controllers/academic/examController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/organizations", getRegisteredOrganizations);
router.get("/organizations/:organizationName/branches", getOrganizationBranches);

router.use(protect);
router.use(authorize("principal"));

router.post("/add-admin", createAdmin);

router.get("/dashboard-overview",getDashboardOverview);

router.get("/profile", getPrincipalProfile);
router.put("/profile", updatePrincipalProfile);
router.post("/profile/upload-avatar", upload.single("avatar"), uploadPrincipalAvatar);
router.delete("/profile/avatar", removePrincipalAvatar);
router.post("/profile/change-password", changePrincipalPassword);

router.get("/admission-requests", getAdmissionRequests);
router.get("/admission-requests/:id", getAdmissionRequestById);
router.get("/admission-statistics", getAdmissionStatistics);
router.put("/admission-requests/:id/approve", approveAdmissionRequest);
router.put("/admission-requests/:id/reject", rejectAdmissionRequest);
router.put("/admission-requests/bulk-update", bulkUpdateAdmissionStatus);

// Exam Management
router.get("/exams/stats", getPrincipalExamStats);
router.get("/exams/structures", getAvailableExamStructures);
router.get("/exams/schedules", getExamSchedules); // This is the ONLY schedules route now
router.get("/exams/schedules/:id", getExamScheduleDetails);
router.post("/exams/structures", createExamStructure);
router.post("/exams/create-schedule", createExamSchedule);
router.post("/exams/schedules", createExamSchedule); 
router.put("/exams/schedule/:id", updateExamSchedule);
router.delete("/exams/schedule/:id", deleteExamSchedule);
router.get("/exams/pending-verification", getPendingVerifications);
router.get("/exams/verify/:marksheetId", getMarksheetForVerification);
router.put("/exams/verify/:marksheetId", verifyMarksheet);
router.put("/exams/bulk-verify", bulkVerifyMarksheets);
router.put("/exams/publish", publishResults);
router.get("/exams/marksheets/stats", getPrincipalMarksheetStats);
router.get("/exams/marksheets", getPrincipalMarksheets);
router.get("/exams/completed", getCompletedPrincipalExams);
router.get("/exams/admit-card-eligible", getAdmitCardEligibleExams);
router.get("/exams/classes-with-sections", getClassesWithSectionsForExams);
router.get("/exams/students", getStudentsForMarksEntry);
router.post("/exams/marks", saveExamMarks);

router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsAsRead);
router.patch("/notifications/:id/read", markNotificationAsRead);
// Add this under the "Exam Management" section in principalRoutes.js
router.get("/exams/class-subjects/:classId", getClassSubjectsForExams);

export default router;