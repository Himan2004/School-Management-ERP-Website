import express from "express";
import {
  getMyExamSchedules,
  getMyResults,
  getMarksheetDetails,
  getPerformanceTrends,
  getStudentExams,
} from "../../controllers/student/studentExamController.js";
import upload from "../../middleware/upload.js";
import {
    getLeaveHistory,
    submitLeaveApplication,
    cancelLeave,
    getLeaveStats,
    getLeaveById
} from "../../controllers/student/studentLeaveController.js";
import {
    getPerformanceOverview,
    getSubjectWisePerformance,
    getExamWisePerformance,
    getPerformanceTrend,
    getClassRanking,
    getAttendanceImpact
} from "../../controllers/student/studentPerformanceController.js";
import {
    getStudentEvents,
    getEventById,
    getEventStats,
    getUpcomingEvents,
    unregisterFromEvent,
    getEventCalendar,
    registerForEvent
} from "../../controllers/student/studentEventsController.js";
import {
    getStudentIdCard,
    downloadIdCard,
    regenerateIdCard,
    getIdCardHistory,
    getIdCardStats
} from "../../controllers/student/studentIdCardController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getStudentBusTiming } from "../../controllers/student/studentTransportController.js";
import {
  getStudentStudyMaterials,
  trackMaterialInteraction,
} from "../../controllers/student/studyMaterialController.js";
import { getConsolidatedMarksheet } from "../../controllers/student/marksheetController.js";
import { getStudentResults } from "../../controllers/student/studentResultsController.js";
import { getStudentNotices } from '../../controllers/student/studentNoticeController.js';

const router = express.Router();

// Apply protection to all student routes
router.use(protect);
router.use(authorize("student"));

import {
    getStudentAdmitCard,
    regenerateAdmitCard,
    verifyAdmitCard,
    downloadAdmitCard
} from "../../controllers/student/studentAdmitCardController.js";

import {
    getStudentHealthCheckup,
    applyForHealthCheckup
} from "../../controllers/student/studentHealthController.js";

import {
    getStudentDashboard
} from "../../controllers/student/studentDashboardController.js";

// Dashboard Route
router.get("/dashboard", getStudentDashboard);

// ✅ ADD THIS RESULTS ROUTE (BEFORE OTHER EXAM ROUTES)
router.get("/results", getStudentResults);

// Exam Routes
router.get("/exams", getStudentExams);
router.get("/exams/schedules", getMyExamSchedules);
router.get("/exams/results", getMyResults);
router.get("/exams/results/:marksheetId", getMarksheetDetails);
router.get("/exams/performance", getPerformanceTrends);

// Marksheet route
router.get("/marksheet/consolidated", getConsolidatedMarksheet);

// Study Material routes
router.get("/study-materials", getStudentStudyMaterials);
router.patch("/study-materials/:id/interact", trackMaterialInteraction);

// Transport route
router.get("/transport/bus-timing", getStudentBusTiming);

// Leave Routes
router.get("/leave/stats", getLeaveStats);
router.get("/leave", getLeaveHistory);
router.post("/leave", upload.single("supportingDocument"), submitLeaveApplication);
router.get("/leave/:id", getLeaveById);
router.patch("/leave/:id/cancel", cancelLeave);

// Performance Routes
router.get("/performance", getPerformanceOverview);
router.get("/performance/subjects", getSubjectWisePerformance);
router.get("/performance/exams", getExamWisePerformance);
router.get("/performance/trend", getPerformanceTrend);
router.get("/performance/ranking", getClassRanking);
router.get("/performance/attendance-impact", getAttendanceImpact);

// Events Routes — ORDER MATTERS
router.get("/events/stats", getEventStats);
router.get("/events/upcoming", getUpcomingEvents);
router.get("/events/calendar", getEventCalendar);
router.get("/events", getStudentEvents);
router.get("/events/:id", getEventById);
router.post("/events/:id/register", registerForEvent);
router.delete("/events/:id/register", unregisterFromEvent);
router.delete("/events/:id/unregister", unregisterFromEvent);

// ID Card Routes — ORDER MATTERS
router.get("/id-card/stats", getIdCardStats);
router.get("/id-card/history", getIdCardHistory);
router.get("/id-card/download", downloadIdCard);
router.post("/id-card/regenerate", regenerateIdCard);
router.get("/id-card", getStudentIdCard);

// Admit Card Routes
router.get("/admit-card", getStudentAdmitCard);
router.post("/admit-card/regenerate", regenerateAdmitCard);
router.post("/admit-card/verify", verifyAdmitCard);
router.post("/admit-card/download", downloadAdmitCard);

// Health Checkup Routes
router.get("/health-checkup", getStudentHealthCheckup);
router.post("/health-checkup/apply", applyForHealthCheckup);

import {
    getSupportTickets,
    createSupportTicket,
    addTicketMessage
} from "../../controllers/student/studentSupportTicketController.js";

// Support Tickets Routes
router.get("/support-tickets", getSupportTickets);
router.post("/support-tickets", createSupportTicket);
router.post("/support-tickets/:ticketId/messages", addTicketMessage);

import {
    getStudentSettings,
    updateStudentSettings,
    updateStudentPassword,
    getStudentProfile
} from "../../controllers/student/studentSettingsController.js";

// Settings Routes
router.get("/settings", getStudentSettings);
router.put("/settings", updateStudentSettings);
router.put("/settings/password", updateStudentPassword);

// ----------------------------------------------------------------------
// ADDITIONAL FIXES FOR FRONTEND COMPATIBILITY
// ----------------------------------------------------------------------

import { getStudentAttendance } from "../../controllers/student/studentAttendanceController.js";
import { getStudentHomework, submitHomework } from "../../controllers/student/studentHomeworkController.js";
import { getStudentTimetable } from "../../controllers/student/studentTimetableController.js";
import {
    syncAndGetNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from "../../controllers/student/studentNotificationController.js";

// Notifications
router.get("/notifications", syncAndGetNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.post("/notifications/mark-all-read", markAllNotificationsRead);

// Exams
router.get("/exams", getStudentExams);

const dummyEmptyArray = (req, res) => res.status(200).json({ success: true, data: [] });
const dummyEmptyObject = (req, res) => res.status(200).json({ success: true, data: {} });

// Profile
router.get("/profile", getStudentProfile);

// Attendance, Homework, Timetable
router.get("/attendance", getStudentAttendance);
router.get("/homework", getStudentHomework);
router.post("/homework/:id/submit", upload.single("file"), submitHomework);
router.get("/timetable", getStudentTimetable);

// Alerts, Achievements, Recommendations
router.get("/alerts", dummyEmptyArray);
router.get("/achievements", dummyEmptyArray);
router.get("/recommendations", dummyEmptyArray);

// Aliases for mismatched routes
router.get("/bus-timing", getStudentBusTiming);
router.get("/study-material", getStudentStudyMaterials);
router.get("/marksheet", getConsolidatedMarksheet);

// Missing ID Card routes
router.post("/id-card/report-lost", dummyEmptyObject);
router.put("/id-card/preferences", dummyEmptyObject);

//notice route
router.get("/notices", getStudentNotices);

export default router;