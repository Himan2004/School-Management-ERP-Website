import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import { checkMaintenanceMode } from "./middleware/maintenanceMiddleware.js";

import GraphuraAdmin from "./models/graphura/GraphuraAdmin.js";

import superAdminRoutes from "./routes/superAdmin/superAdminRoutes.js";
import organizationClassRoutes from "./routes/superAdmin/organizationClassRoutes.js";
import financeRoutes from "./routes/superAdmin/financeRoutes.js";
import pendingDuesRoutes from "./routes/superAdmin/pendingDuesRoutes.js";
import feeStructureRoutes from "./routes/superAdmin/feeStructureRoutes.js";
import feeWaiverRoutes from "./routes/superAdmin/feeWaiverRoutes.js";
import feeRuleRoutes from "./routes/superAdmin/feeRuleRoutes.js";
import superAdminExamRoutes from "./routes/superAdmin/examRoutes.js";

import schoolRequestRoutes from "./routes/school/schoolRoutes.js";
import adminRoutes from "./routes/admin/adminRoutes.js";
import adminFinanceRoutes from "./routes/admin/financeRoutes.js";
import examRoutes from "./routes/admin/examRoutes.js";
import classRoutes from "./routes/admin/periodRoutes.js";
import teacherRoutes from "./routes/teacher/teacherRoutes.js";

import messageRoutes from "./routes/teacher/messageRoutes.js";
import testRoutes from "./test/testMailRoute.js";
import noticeRoutes from "./routes/admin/noticeRoutes.js";
import taskRoutes from "./routes/admin/taskRoutes.js";
import timetableRoutes from "./routes/admin/timetableRoutes.js";
import attendanceRoutes from "./routes/admin/attendanceRoutes.js";
import academicAdminRoutes from "./routes/admin/academicRoutes.js";
import schoolAcademicConfigRoutes from "./routes/admin/schoolAcademicConfigRoutes.js";
import bulkRoutes from "./routes/admin/bulkRoutes.js";
import staffAdminRoutes from "./routes/admin/staffRoutes.js";
import studentAdminRoutes from "./routes/admin/studentAdminRoutes.js";
import adminTransferRoutes from "./routes/admin/adminTransferRoutes.js";
import leaveRoutes from "./routes/admin/leaveRequestRoutes.js";
import adminHrmRoutes from "./routes/admin/adminHrmRoutes.js";
import adminSettingsRoutes from "./routes/admin/adminSettingsRoutes.js";
import adminIdCardRoutes from "./routes/admin/idCardRoutes.js";
import adminPolicyRoutes from "./routes/admin/schoolPolicyRoutes.js";
import adminReportRoutes from "./routes/admin/reportRoutes.js";
import eventRoutes from "./routes/admin/eventRoutes.js";
import principalRoutes from "./routes/principal/principalRoutes.js";
import principalTicket from "./routes/principal/principalTicketRoutes.js"
import principalNoticeRoutes from "./routes/principal/noticeRoutes.js";
import principalEventRoutes from "./routes/principal/eventsRoutes.js";
import principalMeetingRoutes from "./routes/principal/meetingsRoutes.js";
import principalResignationRoutes from './routes/principal/resignationRoutes.js';
import principalPayrollRoutes from './routes/principal/principalPayrollRoutes.js';
import principalStaffPerformanceRoutes from "./routes/principal/staffPerformanceRoutes.js";
import graphuraRoutes from "./routes/graphura/graphuraRoute.js";
import { verifyIdCardPublic } from "./controllers/common/verificationController.js";

import razorpayWebhookRoutes from "./routes/finance/webhookRoutes.js";
//importing student routes
import studentRoutes from "./routes/student/studentRoutes.js";
import studentResultsRoutes from "./routes/student/resultsRoutes.js";
import studentTimetableRoutes from "./routes/student/timetableRoutes.js";
import studentAttendanceRoutes from "./routes/student/attendanceRoutes.js";
import studentHomeworkRoutes from "./routes/student/homeworkRoutes.js";

//importing auth routers
import commonAuthRoutes from "./routes/auth/commonRoute.js";
import superAuthRoutes from "./routes/auth/superRoute.js";
import adminAuthRoutes from "./routes/auth/adminRoute.js";
import principalAuthRoutes from "./routes/auth/principalRoute.js";
import teacherAuthRoutes from "./routes/auth/teacherRoute.js";
import accountantAuthRoutes from "./routes/auth/accountantRoute.js";
import graphuraAuthRoutes from "./routes/auth/graphuraRoute.js";
import parentAuthRoutes from "./routes/auth/parentRoute.js";
import studentAuthRoutes from "./routes/auth/studentRoute.js";

//organizationROutes
import organizationSubjectRoutes from "./routes/superAdmin/organizationSubjectRoutes.js";
import academicConfigRoutes from "./routes/superAdmin/academicConfigRoutes.js";

import parentRoutes from "./routes/parent/parentRoutes.js";

// HRM & Staff Routes
import staffRoutes from "./routes/superAdmin/staffRoutes.js";
import hrmRoutes from "./routes/superAdmin/hrmRoutes.js";
import superadminAttendanceRoutes from "./routes/superAdmin/superadminAttendanceRoutes.js";
import meetingRoutes from "./routes/superAdmin/meetingRoutes.js";
import payrollRoutes from "./routes/superAdmin/payrollRoutes.js";
//accountant routes
import accountantRoutes from "./routes/accountant/index.js";
// Superadmin analytics routes
import analyticsRoutes from "./routes/superAdmin/analyticsRoutes.js";
// super admin communication routes
import communicationRoutes from "./routes/superAdmin/communicationRoutes.js";
//superadmin report routes
import reportsRoutes from "./routes/superAdmin/reportsRoutes.js";
import ticketRoutes from "./routes/superAdmin/ticketRoutes.js";
import notificationsRoutes from "./routes/superAdmin/notificationsRoutes.js";
import eventsRoutes from "./routes/superAdmin/eventsRoutes.js";
//PRincipal finance routes
import principalFinanceRoutes from "./routes/principal/principalFinanceRoutes.js";
// Parent finance routes
import parentFinanceRoutes from "./routes/parent/feeRoutes.js";
//import superadmin audit routes
// Import audit routes
import auditRoutes from "./routes/superAdmin/auditRoutes.js";
// Import support and settings routes of superadmin
import supportRoutes from "./routes/superAdmin/supportRoutes.js";
import settingsRoutes from "./routes/superAdmin/settingsRoutes.js";
// Import profile routes
import profileRoutes from "./routes/superAdmin/profileRoutes.js";
import policiesRoutes from "./routes/superAdmin/policiesRoutes.js";
import { testPolicyPdf, viewPolicyProxy } from "./controllers/superAdmin/policiesController.js";
// Import admin task routes
import adminTaskRoutes from "./routes/admin/adminTaskRoutes.js";
// Import admin ticket routes
import adminTicketRoutes from "./routes/admin/adminTicketRoutes.js";
// Import admin profile routes
import adminProfileRoutes from "./routes/admin/adminProfileRoutes.js";
import principalStudentRoutes from "./routes/principal/principalStudentRoutes.js";
import principalAdmissionRoutes from "./routes/principal/principalAdmissionRoutes.js";
import principalAdmissionListRoutes from "./routes/principal/principalAdmissionListRoutes.js";
// Import principal attendance routes
import principalAttendanceRoutes from "./routes/principal/attendanceRoutes.js";
// Import principal reports routes
import principalReportsRoutes from "./routes/principal/reportsRoutes.js";
// Import principal settings routes
import principalSettingsRoutes from "./routes/principal/settingsRoutes.js";
import principalAcademicsRoutes from "./routes/principal/academicsRoutes.js";
import principalTeachersRoutes from "./routes/principal/teachersRoutes.js";
import principalIdCardRoutes from "./routes/principal/idCardRoutes.js";
import principalAdmitCardRoutes from "./routes/principal/principalAdmitCardRoute.js";
import principalPromotionsRoutes from "./routes/principal/promotionRoutes.js";
import principalPtmFeedbackRoutes from "./routes/principal/ptmFeedbackRoutes.js";
import principalPolicyApprovalsRoutes from "./routes/principal/policyApprovalsRoutes.js";

//import parent routes
import NoticePageRoutes from "./routes/parent/NoticePageRoutes.js";
//import parent community routes
import parentCommunityRoutes from "./routes/parent/communityRoutes.js";
//import parent meetings routes
import parentMeetingsRoutes from "./routes/parent/meetingsRoutes.js";
import parentTicketRoutes from "./routes/parent/ticketRoutes.js";
import parentHealthRoutes from "./routes/parent/healthRoutes.js";
import organisationSubscription from "./routes/superAdmin/subscriptionRoute.js";

// Import teacher routes
import teacherAnnouncementRoutes from "./routes/teacher/announcementRoutes.js"; //announcement
import teacherAssignmentRoutes from "./routes/teacher/assignmentRoutes.js"; //assignment
import teacherLeaveRoutes from "./routes/teacher/leaveRoutes.js"; //leave
import teacherExamRoutes from "./routes/teacher/examRoutes.js"; //exam
import teacherAttendance from "./routes/teacher/teacherAttendanceRoutes.js"//attendance
import onlineTestRoutes from "./routes/teacher/onlineTestRoutes.js"; //online tests
import subjectTeacherDashboardRoutes from "./routes/subjectTeacher/subjectTeacherDashboardRoutes.js"; // subject teacher
import subjectTeacherAttendanceRoutes from "./routes/subjectTeacher/subjectTeacherAttendanceRoutes.js"; //attendance
// Principal Routes
import studAttendanceRoutes from './routes/principal/studentAttendance.js';
//accountant fee routes 
import feeRoutes from './routes/accountant/fee.routes.js';


import commonTicketRoutes from './routes/common/commonTicketRoutes.js'
import subjectTeacherComplaintRoutes from "./routes/teacher/subjectTeacherComplaintRoutes.js";
import subjectTeacherProfileRoutes from "./routes/teacher/subjectTeacherProfileRoutes.js";
import subjectTeacherSalaryRoutes from "./routes/teacher/subjectTeacherSalaryRoutes.js";
import subjectTeacherPTMRoutes from "./routes/teacher/subjectTeacherPTMRoutes.js";
import subjectTeacherNotificationRoutes from "./routes/teacher/subjectTeacherNotificationRoutes.js";
import adminComplaintRoutes from "./routes/admin/adminComplaintRoutes.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(cookieParser());

app.use('/api/tickets', commonTicketRoutes);

//principal finance
app.use("/api/principal", principalFinanceRoutes);
// Parent Finance Routes

app.use("/api/parent/tickets", parentTicketRoutes);
app.use("/api/parent/health", parentHealthRoutes);
app.use("/api/parent", parentFinanceRoutes);
app.use("/api/parent", parentRoutes);
// Global system maintenance check (blocks non-admin traffic if maintenance is actively engaged via Graphura Admin System Settings)
// app.use(checkMaintenanceMode);

//public routes
app.use("/api/school", schoolRequestRoutes);
app.get("/api/id-card/verify/:token", verifyIdCardPublic);

// auth routers
app.use("/api/auth", commonAuthRoutes);
app.use("/api/auth/super-admin", superAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/auth/teacher", teacherAuthRoutes);
app.use("/api/auth/principal", principalAuthRoutes);
app.use("/api/auth/accountant", accountantAuthRoutes);
app.use("/api/auth/graphura", graphuraAuthRoutes);
app.use("/api/auth/parent", parentAuthRoutes);
app.use("/api/auth/student", studentAuthRoutes);

app.use("/api/super-admin", superAdminRoutes);

// Super Admin HRM & Staff Routes
app.use("/api/super-admin/staff", staffRoutes);
app.use("/api/super-admin/hrm", hrmRoutes);
app.use("/api/super-admin/attendance", superadminAttendanceRoutes);
app.use("/api/super-admin/meetings", meetingRoutes);
app.use("/api/super-admin/payroll", payrollRoutes);

// Super Admin Explicit Finance Routes
app.use("/api/super-admin/finance/pending-dues", pendingDuesRoutes);
app.use("/api/super-admin/finance", feeStructureRoutes);
app.use("/api/super-admin/finance", financeRoutes); // ✅ ADD IT HERE
app.use("/api/super-admin/finance/waiver-policies", feeWaiverRoutes);
app.use("/api/super-admin/finance/fee-rules", feeRuleRoutes);
app.use("/api/super-admin/exams", superAdminExamRoutes);
// Mount class and subject routes BEFORE admin routes to ensure they take precedence
app.use("/api/admin/classes", classRoutes);
app.use("/api/admin/exams", examRoutes);
app.use("/api/admin/finance", adminFinanceRoutes);
app.use("/api/admin/timetable", timetableRoutes);
app.use("/api/admin/attendance", attendanceRoutes);
app.use("/api/admin/academic", academicAdminRoutes);
app.use("/api/admin/academic-configurations", schoolAcademicConfigRoutes);
app.use("/api/admin/events", eventRoutes);
app.use("/api/admin/bulk", bulkRoutes);
app.use("/api/admin/staff", staffAdminRoutes);
app.use("/api/admin/students", studentAdminRoutes);
app.use("/api/admin/transfers", adminTransferRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/notice", noticeRoutes);
app.use("/api/admin/task", taskRoutes);
app.use("/api/admin/leave", leaveRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/id-cards", adminIdCardRoutes);
app.use("/api/admin/policies", adminPolicyRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/hrm", adminHrmRoutes);

app.use("/api/principal/students", principalStudentRoutes);
app.use("/api/principal/admissions", principalAdmissionRoutes);
app.use("/api/principal/admissions-list", principalAdmissionListRoutes);
app.use("/api/principal/id-cards", principalIdCardRoutes);
app.use('/api/principal/resignations', principalResignationRoutes);
app.use('/api/principal/payroll', principalPayrollRoutes);
app.use("/api/principal/staff-performance", principalStaffPerformanceRoutes);
app.use("/api/principal/ptm-feedback", principalPtmFeedbackRoutes);
app.use("/api/principal/notices", principalNoticeRoutes);
app.use("/api/principal/tickets",principalTicket)
app.use("/api/principal/events", principalEventRoutes);
app.use("/api/principal/meetings", principalMeetingRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/messages", messageRoutes);

app.use("/api/student", studentRoutes);
app.use("/api/test", testRoutes);

app.use("/api/graphura", graphuraRoutes);
app.use("/api/finance/webhooks", razorpayWebhookRoutes);

app.use("/api/superadmin/organization-classes", organizationClassRoutes);

// app.use('/api/superadmin', organizationRoutes);
app.use("/api/superadmin/organization-subjects", organizationSubjectRoutes);
app.use("/api/superadmin/academic-config", academicConfigRoutes);


// Parent Finance Routes
//app.use('/api/parent', parentFinanceRoutes);

// Global system maintenance check (blocks non-admin traffic if maintenance is actively engaged via Graphura Admin System Settings)
app.use(checkMaintenanceMode);


// accountant routes
app.use('/api/accountant/fees', feeRoutes);
app.use("/api/accountant", accountantRoutes);
//analytes routes
app.use("/api/superadmin", analyticsRoutes);
// superadmin communication
app.use("/api/superadmin", communicationRoutes);
// superadmin report routes
app.use("/api/superadmin", reportsRoutes);
// superadmin ticket system routes
app.use("/api/superadmin", ticketRoutes);
// superadmin notifications routes
app.use("/api/superadmin", notificationsRoutes);
// superadmin events routes
app.use("/api/superadmin", eventsRoutes);
//Superadmin audit routes
app.use("/api/superadmin", auditRoutes);
//support and settings for superadmin
app.use("/api/superadmin", supportRoutes);
app.use("/api/superadmin", settingsRoutes);
// Import profile routes of the superadmin
app.use("/api/superadmin", profileRoutes);
app.use("/api/superadmin", policiesRoutes);
app.get("/api/test-policy-pdf/:id", testPolicyPdf);
app.get("/api/policies/:id/view", viewPolicyProxy);

app.use("/api/organization", organisationSubscription);

// Admin Tasks Routes
app.use("/api/admin", adminTaskRoutes);
// Admin Tickets Routes
app.use("/api/admin/tickets", adminTicketRoutes);
// Admin Complaints Routes
app.use("/api/admin/complaints", adminComplaintRoutes);
//Admin Profile routes
app.use("/api/admin", adminProfileRoutes);
// PRincipal Attandence routes
app.use("/api/principal", principalAttendanceRoutes);
//principal report routes
app.use("/api/principal", principalReportsRoutes);
// Principal Settings Routes
app.use("/api/principal", principalSettingsRoutes);
// Principal Academics Routes
app.use("/api/principal", principalAcademicsRoutes);
// Principal Teachers Routes
app.use("/api/principal", principalTeachersRoutes);
app.use("/api/principal", principalAdmitCardRoutes);
app.use("/api/principal", principalPromotionsRoutes);
// Principal Policy Approvals Routes
app.use("/api/principal", principalPolicyApprovalsRoutes);

//parent routes
app.use("/api/parent/notice-page", NoticePageRoutes); // Handles parent notice page (notices, events, activities)
//parent community routes
app.use("/api/parent/community", parentCommunityRoutes); // Handles events & notices
//parent meetings routes
app.use("/api/parent/meetings", parentMeetingsRoutes); // Handles PTMs
// Note: parent fee routes already mounted at line 194 via parentFinanceRoutes

//student routes
app.use("/api/student/results", studentResultsRoutes); //results
app.use("/api/student/timetable", studentTimetableRoutes); //timetable
app.use("/api/student/attendance", studentAttendanceRoutes); //attendance
app.use("/api/student/homework", studentHomeworkRoutes); //homework student

//teacher routes
app.use("/api/teacher/announcements", teacherAnnouncementRoutes); //announcement
app.use("/api/teacher/assignments", teacherAssignmentRoutes); //assignment
app.use("/api/teacher/leave", teacherLeaveRoutes); //leave
app.use("/api/teacher/exams", teacherExamRoutes); //exam
app.use("/api/teacher/attendance",teacherAttendance)
app.use("/api/subject-teacher/online-tests", onlineTestRoutes); //online tests
app.use("/api/subject-teacher/dashboard", subjectTeacherDashboardRoutes); // subject teacher dashboard
app.use("/api/subject-teacher/attendance", subjectTeacherAttendanceRoutes); // subject teacher attendance
app.use("/api/subject-teacher/complaints", subjectTeacherComplaintRoutes);
app.use("/api/subject-teacher", subjectTeacherProfileRoutes);
app.use("/api/subject-teacher/salary", subjectTeacherSalaryRoutes);
app.use("/api/subject-teacher/ptms", subjectTeacherPTMRoutes);
app.use("/api/subject-teacher/notifications", subjectTeacherNotificationRoutes);
// Principal Routes - STUDENT ATTENDANCE
app.use('/api/principal', studAttendanceRoutes);
//accountant routes

// Nurse APIs
import nurseRoutes from "./routes/nurse/nurseRoutes.js";
app.use("/api/nurse", nurseRoutes);

// Legal APIs (Terms & Privacy Policy)
import legalRoutes from "./routes/legal/legalRoutes.js";
app.use("/api/v1", legalRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "School Management System API",
    version: "1.0.0",
    endpoints: {
      register: "/api/superadmin/register",
      login: "/api/superadmin/login",
      logout: "/api/superadmin/logout",
      profile: "/api/superadmin/me",
      updatePassword: "/api/superadmin/updatepassword",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


const seedGraphuraAdmin = async () => {
  try {
    const adminExists = await GraphuraAdmin.findOne({ email: process.env.GRAPHURA_ADMIN_EMAIL });
    if (!adminExists) {
      await GraphuraAdmin.create({
        email: process.env.GRAPHURA_ADMIN_EMAIL,
        password: process.env.GRAPHURA_ADMIN_PASSWORD,
        graphuraKey: process.env.GRAPHURA_ADMIN_KEY,
        fullName: "System Sovereign Admin",
      });
      console.log("✅ Graphura Admin successfully seeded to database.");
    }
  } catch (error) {
    console.error("❌ Failed to seed Graphura Admin:", error.message);
  }
};

import net from "net";

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5001;

const findAvailablePort = (startPort, maxAttempts = 50) =>
  new Promise((resolve, reject) => {
    let port = startPort;
    const tryPort = () => {
      if (port > startPort + maxAttempts) return reject(new Error("No available ports"));
      const tester = net.createServer()
        .once("error", (err) => {
          tester.close?.();
          if (err.code === "EADDRINUSE") {
            port += 1;
            tryPort();
          } else {
            reject(err);
          }
        })
        .once("listening", () => {
          tester.close(() => resolve(port));
        })
        .listen(port, "0.0.0.0");
    };
    tryPort();
  });

let server;

(async () => {
  try {
    const PORT = await findAvailablePort(DEFAULT_PORT);
    server = app.listen(PORT, async () => {
      await connectDB();
      await seedGraphuraAdmin(); // 🔥 Added seeder here
      console.log(`Server running on port ${PORT}`);
    });

    server.on("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        console.error(`Error: Port ${PORT} is already in use (EADDRINUSE).`);
        console.error("Tip: stop the other process using this port or set a different PORT in backend/.env");
        process.exit(1);
      }
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to find/start server on a free port:", err.message || err);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err, promise) => {
  console.log(`Unhandled Rejection: ${err && err.message ? err.message : err}`);
  if (server && server.close) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle nodemon restarts and OS signals gracefully so port is freed
process.once("SIGUSR2", function () {
  console.log("Received SIGUSR2 - shutting down gracefully for nodemon restart");
  if (server && server.close) {
    server.close(() => process.kill(process.pid, "SIGUSR2"));
  } else {
    process.kill(process.pid, "SIGUSR2");
  }
});

process.on("SIGINT", function () {
  console.log("Received SIGINT - shutting down gracefully");
  if (server && server.close) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", function () {
  console.log("Received SIGTERM - shutting down gracefully");
  if (server && server.close) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});
