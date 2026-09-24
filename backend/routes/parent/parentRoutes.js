import express from "express";
import {
    getLinkedStudents,
    getStudentSchedules,
    getStudentResults,
    getStudentPerformanceTrend,
    getStudentSubjectAnalysis
} from "../../controllers/parent/parentExamController.js";
import {
    getAttendanceSummary,
    getAttendanceCalendar,
    getLeaveRequests,
    getAttendanceList
} from "../../controllers/parent/attendanceController.js";
import {
    getHomeworkStats,
    getHomeworkList,
    getSyllabusList
} from "../../controllers/parent/homeworkController.js";
import {
    createTicket,
    getAllTickets,
    getTicketById,
    addResponse,
    getTicketStats,
    closeTicket,
    uploadTicketAttachment,
    getStudentClassTeacher,
    getStudentSubjectTeachers,
    createComplaint
} from "../../controllers/parent/ticketController.js";
import {
    getParentStudentIdCard,
    requestParentIdCardReissue,
} from "../../controllers/parent/parentIdCardController.js";
import {
    getStudentProfileForParent,
    updateStudentProfileForParent,
} from "../../controllers/parent/studentProfileController.js";
import {
    getParentNotifications,
    markNotificationRead,
    clearReadNotifications
} from "../../controllers/parent/parentNotificationController.js";
import { getParentDashboardStats } from "../../controllers/parent/dashboardController.js";
import upload from "../../middleware/upload.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply protection to all parent routes
router.use(protect);
router.use(authorize("parent"));

// Dashboard Stats
router.get("/dashboard/stats", getParentDashboardStats);

// Notifications
router.get("/notifications", getParentNotifications);
router.put("/notifications/read", markNotificationRead);
router.post("/notifications/clear-read", clearReadNotifications);

// Student links
router.get("/students", getLinkedStudents);

// Exam Routes for linked students
router.get("/exams/schedules/:studentId", getStudentSchedules);
router.get("/exams/results/:studentId", getStudentResults);
router.get("/exams/performance-trend/:studentId", getStudentPerformanceTrend);
router.get("/exams/subject-analysis/:studentId", getStudentSubjectAnalysis);

// Attendance
router.get("/attendance/summary", getAttendanceSummary);
router.get("/attendance/calendar", getAttendanceCalendar);
router.get("/attendance/leaves", getLeaveRequests);
router.get("/attendance/list", getAttendanceList);

// Homework
router.get("/homework/stats", getHomeworkStats);
router.get("/homework/list", getHomeworkList);
router.get("/homework/syllabus", getSyllabusList);

// Ticket System
router.get("/tickets/stats", getTicketStats);
router.post("/tickets", createTicket);
router.get("/tickets", getAllTickets);
router.get("/tickets/:id", getTicketById);
router.post("/tickets/:id/response", addResponse);
router.patch("/tickets/:id/close", closeTicket);
router.post("/tickets/:id/attachment", upload.array("attachments", 3), uploadTicketAttachment);

// Dynamic Teacher selectors and Parent Complaints
router.get("/teachers/class-teacher", getStudentClassTeacher);
router.get("/teachers/subject-teachers", getStudentSubjectTeachers);
router.post("/complaints", createComplaint);

// Student Profile
router.get("/student/profile", getStudentProfileForParent);
router.put("/student/profile", updateStudentProfileForParent);

// Student ID Card
router.get("/student/idcard", getParentStudentIdCard);
router.post("/student/idcard/reissue", requestParentIdCardReissue);

export default router;
