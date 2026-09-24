import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignatureLoader from "./components/shared/SignatureLoader"; // ðŸŒŸ NEW: Custom Branded Loader
import { Salad } from "lucide-react";

// --- STATIC PAGES ---
const LegacyLandingWrapper = lazy(() => import("./LegacyLandingWrapper"));
const Contact = lazy(() => import("./pages/Landing/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/Landing/PrivacyPolicy"));
const TermsAndConditions = lazy(
  () => import("./pages/Landing/TermsAndConditions"),
);
const NotFound = lazy(() => import("./pages/common/NotFound"));
const StudentVerification = lazy(() => import("./pages/Verification/StudentVerification"));
const StudentAdmissionForm = lazy(
  () => import("./pages/Landing/StudentAdmissionForm"),
);

// --- ALL LAYOUTS ---
const SuperAdminLayout = lazy(() => import("./layouts/SuperAdminLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const TeacherLayout = lazy(() => import("./layouts/TeacherLayout"));
const PrincipalLayout = lazy(() => import("./layouts/PrincipalLayout"));
const ParentLayout = lazy(() => import("./layouts/ParentLayout"));
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));
const GraphuraLayout = lazy(() => import("./layouts/GraphuraLayout.jsx"));

// --- SUPER ADMIN PAGES ---
const AddSchool = lazy(() => import("./components/superAdmin/AddSchool"));
const Reports = lazy(() => import("./components/superAdmin/Reports"));
const Analytics = lazy(() => import("./components/superAdmin/Analytics"));
const SuperAdminDashboard = lazy(
  () => import("./pages/SuperAdmin/SuperAdminDashboard"),
);
const SuperAdminProfile = lazy(() => import("./pages/SuperAdmin/Profile"));
const SchoolAllPage = lazy(() => import("./pages/SuperAdmin/SchoolAllPage"));
const OrganizationClasses = lazy(
  () => import("./pages/SuperAdmin/Academic/OrganizationClasses"),
);
const OrganizationSubjects = lazy(
  () => import("./pages/SuperAdmin/Academic/OrganizationSubjects"),
);
const OrganizationConfig = lazy(
  () => import("./pages/SuperAdmin/Academic/OrganizationConfig"),
);
const ExamConfig = lazy(() => import("./pages/SuperAdmin/Exam/ExamConfig"));
const ExamSchedule = lazy(() => import("./pages/SuperAdmin/Exam/ExamSchedule"));
const ExamStructure = lazy(
  () => import("./pages/SuperAdmin/Exam/ExamStructure"),
);
const SuperadminSupport = lazy(
  () => import("./pages/SuperAdmin/SuperadminSupport"),
);
const SuperadminSettings = lazy(
  () => import("./pages/SuperAdmin/SuperadminSettings"),
);
const FeesStructure = lazy(
  () => import("./pages/SuperAdmin/Finance/Structure"),
);
const FeeWaivers = lazy(() => import("./pages/SuperAdmin/Finance/FeeWaivers"));
const PendingDues = lazy(
  () => import("./pages/SuperAdmin/Finance/PendingDues"),
);
const FinancialAnalytics = lazy(
  () => import("./pages/SuperAdmin/Finance/FinancialAnalytics"),
);
const AllStaff = lazy(() => import("./pages/SuperAdmin/Staff/AllStaff"));
const StaffTransfers = lazy(
  () => import("./pages/SuperAdmin/Staff/StaffTransfers"),
);
const PayrollSummary = lazy(
  () => import("./pages/SuperAdmin/Hrm/PayrollSummary"),
);
const Resignations = lazy(() => import("./pages/SuperAdmin/Hrm/Resignations"));
const Benchmarking = lazy(() => import("./pages/SuperAdmin/Hrm/Benchmarking"));
const StaffAttendance = lazy(
  () => import("./pages/SuperAdmin/Hrm/StaffAttendance"),
);
const BranchComparison = lazy(
  () => import("./pages/SuperAdmin/Analytics/BranchComparison"),
);
const PerformanceTrends = lazy(
  () => import("./pages/SuperAdmin/Analytics/PerformanceTrends"),
);
const AdmissionTrends = lazy(
  () => import("./pages/SuperAdmin/Analytics/AdmissionTrends"),
);
const AcademicReports = lazy(
  () => import("./pages/SuperAdmin/Reports/AcademicReports"),
);
const ReportsExport = lazy(
  () => import("./pages/SuperAdmin/Reports/ReportsExport"),
);
const StaffReports = lazy(
  () => import("./pages/SuperAdmin/Reports/StaffReports"),
);
const Broadcast = lazy(
  () => import("./pages/SuperAdmin/Communication/Broadcast"),
);
const DisciplinePolicy = lazy(
  () => import("./pages/SuperAdmin/Policies/DisciplinePolicy"),
);
const AttendanceRules = lazy(
  () => import("./pages/SuperAdmin/Policies/AttendanceRules"),
);
const AllTickets = lazy(() => import("./pages/SuperAdmin/Tickets/AllTickets"));
const Escalations = lazy(() => import("./pages/SuperAdmin/Escalations.jsx"));
const PriorityManagement = lazy(
  () => import("./pages/SuperAdmin/Tickets/PriorityManagement"),
);
const AuditLogs = lazy(() => import("./pages/SuperAdmin/Audit/AuditLogs"));
const StudentChanges = lazy(
  () => import("./pages/SuperAdmin/Audit/StudentChanges"),
);

// --- ADMIN PAGES ---
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard/Dashboard"));
const AddClasses = lazy(() => import("./pages/Admin/Dashboard/AddClasses"));
const AddTeachers = lazy(() => import("./pages/Admin/Dashboard/AddTeachers"));
const Task = lazy(() => import("./pages/Admin/Dashboard/Task.jsx"));
const ManageTeachers = lazy(
  () => import("./pages/Admin/Dashboard/ManageTeachers"),
);
const AdminStaffIDCardGeneration = lazy(
  () => import("./pages/Admin/UserManagement/StaffIDCardGeneration.jsx"),
);
const AdminStaffPromotionsDemotions = lazy(
  () => import("./pages/Admin/UserManagement/StaffPromotionsDemotions.jsx"),
);
const AdminEvents = lazy(() => import("./pages/Admin/Events.jsx"));
const AdminFinancialAnalytics = lazy(
  () => import("./pages/Admin/Finance/FinancialAnalytics.jsx"),
);
const AdminPayrollSummary = lazy(
  () => import("./pages/Admin/Finance/PayrollSummary.jsx"),
);
const AcademicsPage = lazy(
  () => import("./pages/Admin/Academics/AcademicsPage.jsx"),
);
const AdminSupport = lazy(() => import("./pages/Admin/Support.jsx"));
const AdminProfile = lazy(() => import("./pages/Admin/Profile"));
const AdminSettings = lazy(() => import("./pages/Admin/Settings"));
const AdminExams = lazy(() => import("./pages/Admin/Exams.jsx"));
const AdminFinance = lazy(() => import("./pages/Admin/Finance"));
const Leaves = lazy(() => import("./pages/Admin/Dashboard/Leaves"));
const NoticePage = lazy(
  () => import("./pages/Admin/NoticesPage.jsx"),
);
const PrincipalMarkAttendance = lazy(
  () => import("./pages/Principal/SubPages/MarkAttendance"),
);

// --- TEACHER PAGES ---
const TeacherDashboard = lazy(() => import("./pages/Teacher/Dashboard"));
const ClassDetails = lazy(() => import("./pages/Teacher/ClassDetails"));
const Students = lazy(() => import("./pages/Teacher/Students"));
const StudentProfile = lazy(() => import("./pages/Teacher/StudentProfile"));
const TeacherComplaints = lazy(() => import("./pages/Teacher/complaints"));
const Attendance = lazy(() => import("./pages/Teacher/Attendance"));
const Leave = lazy(() => import("./pages/Teacher/Leave"));
const Assignments = lazy(() => import("./pages/Teacher/Assignments"));
const AssignmentSubmissions = lazy(
  () => import("./pages/Teacher/AssignmentSubmissions"),
);
const Exams = lazy(() => import("./pages/Teacher/Exams"));
const Announcements = lazy(() => import("./pages/Teacher/Announcements"));
const Messages = lazy(() => import("./pages/Teacher/Messages"));
const Calendar = lazy(() => import("./pages/Teacher/Calendar"));
const TeacherEvents = lazy(() => import("./pages/Teacher/Events"));
const TeacherProfile = lazy(() => import("./pages/Teacher/Profile"));
const Settings = lazy(() => import("./pages/Teacher/Settings"));
const TeacherClasses = lazy(() => import("./pages/Teacher/Classes"));
const TeacherHRMSalary = lazy(() => import("./pages/Teacher/HRMSalary"));
const TeacherHRMAttendance = lazy(() => import("./pages/Teacher/HRMAttendance"));
const TeacherMarksheet = lazy(() => import("./pages/Teacher/Marksheet"));
const TeacherComplaintAndQuery = lazy(() => import("./pages/Teacher/complaints.jsx"))
const TeacherPTM = lazy(() => import("./pages/Teacher/PTM"));
const TeacherFeeDue = lazy(() => import("./pages/Teacher/feedue"));

// --- PRINCIPAL PAGES ---
const PrincipalDashboard = lazy(() => import("./pages/Principal/Dashboard"));
const Support = lazy(() => import("./pages/Principal/Support.jsx"));
const PrincipalStudents = lazy(() => import("./pages/Principal/Students"));
const PrincipalStudentAttendance = lazy(
  () => import("./pages/Principal/SubPages/StudentAttendance"),
);
const PrincipalIDCards = lazy(
  () => import("./pages/Principal/SubPages/IDCards"),
);
const PrincipalNewAdmission = lazy(
  () => import("./pages/Admin/UserManagement/NewAdmission"),
);
const PrincipalAdmissionRequest = lazy(
  () => import("./pages/Principal/SubPages/AdmissionRequest"),
);
const PrincipalAdmissionList = lazy(
  () => import("./pages/Principal/SubPages/AdmissionList"),
);
const PrincipalSupportDesk = lazy(
  () => import("./pages/Principal/SupportDesk.jsx"),
);
const PrincipalAdmissionDetails = lazy(
  () => import("./pages/Principal/SubPages/AdmissionDetails"),
);
const PrincipalCancelAdmission = lazy(
  () => import("./pages/Principal/SubPages/CancelAdmission"),
);
const PrincipalTransfer = lazy(
  () => import("./pages/Principal/SubPages/Transfer"),
);
const PrincipalClasses = lazy(
  () => import("./pages/Principal/SubPages/Classes"),
);
const PrincipalClassesSections = lazy(
  () => import("./pages/Principal/SubPages/ClassesSections"),
);
const PrincipalSubjects = lazy(
  () => import("./pages/Principal/SubPages/Subjects"),
);
const PrincipalTimetable = lazy(
  () => import("./pages/Principal/SubPages/Timetable"),
);
const PrincipalClassComparison = lazy(
  () => import("./pages/Principal/SubPages/ClassComparison"),
);
const PrincipalAttendanceReport = lazy(
  () => import("./pages/Principal/SubPages/AttendanceReports"),
);
const PrincipalCreateExam = lazy(
  () => import("./pages/Principal/SubPages/CreateExam"),
);
const PrincipalMarksEntry = lazy(
  () => import("./pages/Principal/SubPages/MarksEntry"),
);
const PrincipalResults = lazy(
  () => import("./pages/Principal/SubPages/Results"),
);
const PrincipalMarksheet = lazy(
  () => import("./pages/Principal/SubPages/Marksheet"),
);
const PrincipalAdmitCard = lazy(
  () => import("./pages/Principal/SubPages/AdmitCard"),
);
const PrincipalFeeStructure = lazy(
  () => import("./pages/Principal/SubPages/FeeStructure"),
);
const PrincipalFeeCollection = lazy(
  () => import("./pages/Principal/SubPages/FeeCollection"),
);
const PrincipalDueReports = lazy(
  () => import("./pages/Principal/SubPages/DueReports"),
);
const PrincipalTransactions = lazy(
  () => import("./pages/Principal/SubPages/Transactions"),
);
const PrincipalAllTeachers = lazy(
  () => import("./pages/Principal/SubPages/AllTeachers"),
);
const PrincipalAssignSubjects = lazy(
  () => import("./pages/Principal/SubPages/AssignSubjects"),
);
const PrincipalTeacherSchedule = lazy(
  () => import("./pages/Principal/SubPages/TeacherSchedule"),
);
const PrincipalNotices = lazy(
  () => import("./pages/Principal/SubPages/Notices"),
);
const PrincipalPTMFeedback = lazy(
  () => import("./pages/Principal/SubPages/PTMFeedback"),
);
const PrincipalEvents = lazy(() => import("./pages/Principal/SubPages/Events"));
const PrincipalMeetings = lazy(
  () => import("./pages/Principal/SubPages/Meetings"),
);
const PrincipalAcademicReports = lazy(
  () => import("./pages/Principal/SubPages/AcademicReports"),
);
const PrincipalFinancialReports = lazy(
  () => import("./pages/Principal/SubPages/FinancialReports"),
);
const PrincipalAcademicYear = lazy(
  () => import("./pages/Principal/SubPages/AcademicYear"),
);
const PrincipalPromotionSettings = lazy(
  () => import("./pages/Principal/SubPages/PromotionSettings"),
);
const PrincipalPromotionsDemotions = lazy(
  () => import("./pages/Principal/SubPages/PromotionsDemotions"),
);
const PrincipalPolicyApprovals = lazy(
  () => import("./pages/Principal/SubPages/PolicyApprovals"),
);
const PrincipalAcademicSetup = lazy(
  () => import("./pages/Principal/AcademicSetup"),
);
const PrincipalAttendance = lazy(() => import("./pages/Principal/Attendance"));
const PrincipalExaminations = lazy(
  () => import("./pages/Principal/Examinations"),
);
const PrincipalStaffManagement = lazy(
  () => import("./pages/Principal/StaffManagement"),
);
const PrincipalCommunication = lazy(
  () => import("./pages/Principal/Communication"),
);
const PrincipalReports = lazy(() => import("./pages/Principal/Reports"));
const PrincipalComplaints = lazy(() => import("./pages/Principal/Complaints"));
const PrincipalProfile = lazy(() => import("./pages/Principal/Profile"));
const PrincipalResignations = lazy(
  () => import("./pages/Principal/SubPages/PrincipalResignations"),
);
const PrincipalPayroll = lazy(
  () => import("./pages/Principal/SubPages/PayrollSummary"),
);
const PrincipalStaffPerformance = lazy(
  () => import("./pages/Principal/SubPages/StaffPerformanceReports"),
);

// --- ACCOUNTANT PAGES ---
const AccountantLayout = lazy(() => import("./layouts/AccountantLayout"));
const AccountantDashboard = lazy(() => import("./pages/Accountant/Dashboard"));
const Fees = lazy(() => import("./pages/Accountant/Fees"));
const StudentDuesList = lazy(
  () => import("./pages/Accountant/StudentDuesList"),
);
const Expenses = lazy(() => import("./pages/Accountant/Expenses"));
const Payroll = lazy(() => import("./pages/Accountant/Payroll"));
const HRM = lazy(() => import("./pages/Accountant/HRM"));
const FeeStructures = lazy(() => import("./pages/Accountant/FeeStructures"));
const CollectionReports = lazy(
  () => import("./pages/Accountant/CollectionReports"),
);
const AccountantProfile = lazy(() => import("./pages/Accountant/Profile"));

// --- STUDENT PAGES ---
const StudentDashboard = lazy(() => import("./pages/Student/StudentDashboard"));
const StudentAttendance = lazy(
  () => import("./pages/Student/StudentAttendance"),
);
const StudentPerformance = lazy(
  () => import("./pages/Student/StudentPerformance"),
);
const StudentHomework = lazy(() => import("./pages/Student/StudentHomework"));
const StudentExams = lazy(() => import("./pages/Student/StudentExams"));
const StudentEvents = lazy(() => import("./pages/Student/StudentEvents"));
const StudentStudyMaterial = lazy(
  () => import("./pages/Student/StudentStudyMaterial"),
);
const StudentSupportTicket = lazy(
  () => import("./pages/Student/StudentSupportTicket"),
);
const StudentIdCard = lazy(() => import("./pages/Student/StudentIdCard"));
const StudentAdmitCard = lazy(() => import("./pages/Student/StudentAdmitCard"));
const StudentResults = lazy(() => import("./pages/Student/StudentResults"));
const StudentTimetable = lazy(() => import("./pages/Student/StudentTimetable"));
const StudentMarksheet = lazy(() => import("./pages/Student/StudentMarkSheet"));
const StudentLeave = lazy(() => import("./pages/Student/StudentLeave"));
const StudentSettings = lazy(() => import("./pages/Student/StudentSettings"));
const StudentsProfile = lazy(() => import("./pages/Student/StudentProfile"));
const StudentNotices = lazy(() => import("./pages/Student/StudentNotices"));
const StudentNotifications = lazy(
  () => import("./pages/Student/StudentNotifications"),
);
const StudentMessages = lazy(() => import("./pages/Student/StudentMessages"));

// --- PARENT PAGES ---
const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard"));
const ParentAttendance = lazy(() => import("./pages/parent/ParentAttendance"));
const ParentHomework = lazy(() => import("./pages/parent/ParentHomework"));
const ParentMeetings = lazy(() => import("./pages/parent/ParentMeetings"));
const ParentFeeStatus = lazy(() => import("./pages/parent/ParentFeeStatus"));
const ParentPayFee = lazy(() => import("./pages/parent/ParentPayFee"));
const ParentNotices = lazy(() => import("./pages/parent/ParentNotices"));
const ParentNotifications = lazy(
  () => import("./pages/parent/ParentNotifications"),
);
const ParentIDCard = lazy(() => import("./pages/parent/ParentIDCard"));
const ParentExam = lazy(() => import("./pages/parent/ParentExam"));
const ParentProfile = lazy(() => import("./pages/parent/ParentProfile"));
const ParentTerm = lazy(() => import("./pages/parent/Term"));
const ParentPolicy = lazy(() => import("./pages/parent/Policy"));
const ParentCommunity = lazy(() => import("./pages/parent/ParentCommunity"));
const ParentTicketSystem = lazy(
  () => import("./pages/parent/ParentTicketSystem"),
);
const ParentSettings = lazy(() => import("./pages/parent/Settings"));
const ParentHealth = lazy(() => import("./pages/parent/ParentHealth"));
const ParentEvents = lazy(() => import("./pages/parent/ParentEvents.jsx"));

// Admin UserManagement pages
const AdminAdmissionRequest = lazy(
  () => import("./pages/Admin/UserManagement/AdmissionRequests"),
);
const AdminAdmissionList = lazy(
  () => import("./pages/Admin/UserManagement/AdmissionList"),
);
const AdminAdmissionDetails = lazy(
  () => import("./pages/Admin/UserManagement/AdmissionDetails"),
);
const AdminNewAdmission = lazy(
  () => import("./pages/Admin/UserManagement/NewAdmission"),
);
const AdminCancelAdmission = lazy(
  () => import("./pages/Admin/UserManagement/CancelAdmission"),
);
const AdminManageStudents = lazy(
  () => import("./pages/Admin/UserManagement/ManageStudents"),
);
const AdminTransfer = lazy(
  () => import("./pages/Admin/UserManagement/Transfer"),
);
const AdminIDCardGeneration = lazy(
  () => import("./pages/Admin/UserManagement/IDCardGeneration"),
);
// Admin Report pages
const AdminAcademicReports = lazy(
  () => import("./pages/Admin/Reports/AcademicReports"),
);
const AdminStaffPerformance = lazy(
  () => import("./pages/Admin/Reports/StaffPerformance"),
);
const AdminAttendanceReports = lazy(
  () => import("./pages/Admin/Reports/AttendanceReports"),
);
const AdminExamReports = lazy(
  () => import("./pages/Admin/Reports/ExamReports"),
);
const AdminAdmissionTrends = lazy(
  () => import("./pages/Admin/Reports/AdmissionTrends"),
);
const AdminDropoutTracking = lazy(
  () => import("./pages/Admin/Reports/DropoutTracking"),
);

// Admin misc pages
const AdminScheduleMeeting = lazy(
  () => import("./pages/Admin/ScheduleMeeting"),
);
const AdminMyAttendance = lazy(() => import("./pages/Admin/MyAttendance"));
const AccountantNotifications = lazy(
  () => import("./pages/Accountant/Notifications"),
);
const AdminStaffAttendance = lazy(
  () => import("./pages/Admin/UserManagement/StaffAttendance"),
);
// const AccountantSettings = lazy(() => import("./pages/Accountant/Settings"));
const AdminMarkAttendance = lazy(
  () => import("./pages/Admin/UserManagement/MarkAttendance"),
);
const AdminHRM = lazy(() => import("./pages/Admin/HRM"));
const AdminNotifications = lazy(() => import("./pages/Admin/Notifications"));

// All GraphuraAdmin pages and routes
const GraphuraDashboard = lazy(
  () => import("./pages/GraphuraAdmin/GraphuraDashboard"),
);
const SchoolRequests = lazy(
  () => import("./pages/GraphuraAdmin/SchoolRequests"),
);
const SchoolsManagement = lazy(
  () => import("./pages/GraphuraAdmin/SchoolsManagement"),
);
const SchoolDetails = lazy(
  () => import("./pages/GraphuraAdmin/SchoolDetails.jsx"),
);
const UsersManagement = lazy(
  () => import("./pages/GraphuraAdmin/UsersManagement"),
);
const Subscriptions = lazy(() => import("./pages/GraphuraAdmin/Subscriptions"));
const SuperAdminSubscriptions = lazy(
  () => import("./components/superAdmin/Subscriptions.jsx"),
);
const SuperAdminEscalations = lazy(
  () => import("./pages/GraphuraAdmin/SuperAdminEscalations.jsx"),
);
const SystemSettings = lazy(
  () => import("./pages/GraphuraAdmin/SystemSettings"),
);
const Notifications = lazy(() => import("./pages/GraphuraAdmin/Notifications"));
const GraphuraProfile = lazy(
  () => import("./pages/GraphuraAdmin/GraphuraProfile"),
);
const GraphuraAdminLogin = lazy(
  () => import("./pages/GraphuraAdmin/GraphuraAdminLogin.jsx"),
);
const GraphuraSupportDesk = lazy(
  () => import("./pages/GraphuraAdmin/GraphuraSupportDesk.jsx"),
);
// --- MISSING GRAPHURA ADMIN PAGES ---
const GraphuraSupport = lazy(
  () => import("./pages/GraphuraAdmin/GraphuraSupport.jsx"),
);

//Subject Teacher
const SubjectTeacherLayout = lazy(() => import("./layouts/SubjectTeacherLayout.jsx"))
const SubjectTeacherDashboard = lazy(
  () => import("./pages/SubjectTeacher/Dashboard.jsx"),
);
const SubjectWiseAttendance = lazy(() => import('./pages/SubjectTeacher/Attendance/SubjectWiseAttendance.jsx'))
const StaffWiselyAttendance = lazy(() => import("./pages/SubjectTeacher/Attendance/StaffAttendance.jsx"))
const OnlineTestCreation = lazy(() => import("./pages/SubjectTeacher/Examinations/OnlineTestCreation.jsx"))
const SubjectMarksEntry = lazy(() => import("./pages/SubjectTeacher/Examinations/MarksEntry.jsx"))
const ResultsAndMarksheet = lazy(() => import("./pages/SubjectTeacher/Examinations/ResultsMarksheet.jsx"))
const ClassStudentData = lazy(() => import("./pages/SubjectTeacher/Students/ClassStudentData.jsx"))
const PreformanceAnalysis = lazy(() => import("./pages/SubjectTeacher/Students/PerformanceAnalysis.jsx"))
const SalaryAndPayout = lazy(() => import("./pages/SubjectTeacher/HRM/SalaryPayout.jsx"))
const PTMSchedule = lazy(() => import("./pages/SubjectTeacher/PTMSchedule.jsx"))
const SubjectTeacherNotifications = lazy(() => import("./pages/SubjectTeacher/Notifications.jsx"))
const ComplaintManagement = lazy(() => import("./pages/SubjectTeacher/Complaints/ComplaintsManagement.jsx"))
const SubjectTeacherProfile = lazy(() => import("./pages/SubjectTeacher/Profile.jsx"));


function App() {
  return (
    <BrowserRouter>
      {/* ðŸŒŸ Suspense wraps the entire routing tree and displays the high-fidelity Framer Motion loader */}
      <Suspense fallback={<SignatureLoader />}>
        <Routes>
          <Route path="/" element={<LegacyLandingWrapper initialPage="landing" />} />
          <Route path="/contact-us" element={<Contact />} />

          <Route path="/organization/signup" element={<LegacyLandingWrapper initialPage="register" />} />
          <Route path="/organization/login" element={<LegacyLandingWrapper initialPage="login" />} />
          <Route
            path="/graphura-admin/login"
            element={<GraphuraAdminLogin />}
          />
          <Route path="/verify/card/:token" element={<StudentVerification />} />

          {/* Graphura Admin Routes */}
          <Route path="/graphura-admin" element={<GraphuraLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<GraphuraDashboard />} />
            <Route path="organization-requests" element={<SchoolRequests />} />
            <Route path="schools" element={<SchoolsManagement />} />
            <Route path="school-details/:id?" element={<SchoolDetails />} />
            <Route path="users" element={<UsersManagement />} />
            <Route
              path="users/students"
              element={<UsersManagement type="student" />}
            />
            <Route
              path="users/teachers"
              element={<UsersManagement type="teacher" />}
            />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="escalations" element={<SuperAdminEscalations />} />
            <Route path="settings/:section" element={<SystemSettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<GraphuraProfile />} />
            <Route path="support" element={<GraphuraSupportDesk />} />
          </Route>

          {/* Super admin routes */}
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="add-school" element={<AddSchool />} />
            <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="support-desk" element={<Escalations />} />
            <Route path="all-school" element={<SchoolAllPage />} />
            <Route path="profile" element={<SuperAdminProfile />} />
            <Route path="support" element={<SuperadminSupport />} />
            <Route path="settings" element={<SuperadminSettings />} />

            <Route path="academic/classes" element={<OrganizationClasses />} />
            <Route
              path="academic/subjects"
              element={<OrganizationSubjects />}
            />
            <Route path="academic/config" element={<OrganizationConfig />} />
            <Route path="academic/examination" element={<ExamConfig />} />
            <Route path="exam/structure" element={<ExamStructure />} />
            <Route path="exam/schedule" element={<ExamSchedule />} />
            <Route path="exam/config" element={<ExamConfig />} />
            <Route path="finance/waivers" element={<FeeWaivers />} />
            <Route path="finance/dues" element={<PendingDues />} />
            <Route path="finance/fees" element={<FeesStructure />} />
            <Route path="finance/analytics" element={<FinancialAnalytics />} />
            <Route path="staff/all" element={<AllStaff />} />
            <Route path="staff/transfers" element={<StaffTransfers />} />
            <Route path="hrm/payroll" element={<PayrollSummary />} />
            <Route path="hrm/resignations" element={<Resignations />} />
            <Route path="hrm/benchmarking" element={<Benchmarking />} />
            <Route path="hrm/attendance" element={<StaffAttendance />} />
            <Route path="analytics/branch" element={<BranchComparison />} />
            <Route path="analytics/trends" element={<PerformanceTrends />} />
            <Route path="analytics/admissions" element={<AdmissionTrends />} />
            <Route path="reports/academic" element={<AcademicReports />} />
            <Route path="reports/export" element={<ReportsExport />} />
            <Route path="reports/staff" element={<StaffReports />} />
            <Route path="communication/broadcast" element={<Broadcast />} />
            <Route path="policies/discipline" element={<DisciplinePolicy />} />
            <Route path="policies/attendance" element={<AttendanceRules />} />
            {/* <Route path="policies/fees" element={<FeeRules />} /> */}
            <Route path="tickets/all" element={<AllTickets />} />
            <Route path="tickets/escalations" element={<Escalations />} />
            <Route path="tickets/priority" element={<PriorityManagement />} />
            <Route path="audit/logs" element={<AuditLogs />} />
            <Route path="audit/students" element={<StudentChanges />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="classes" element={<AddClasses />} />
            {/* <Route path="subjects" element={<AddSubjects />} /> */}
            <Route path="teachers" element={<AddTeachers />} />
            <Route path="teachers/manage" element={<ManageTeachers />} />
            <Route
              path="teachers/id-cards"
              element={<AdminStaffIDCardGeneration />}
            />
            <Route
              path="teachers/promotions"
              element={<AdminStaffPromotionsDemotions />}
            />
            <Route path="leaves" element={<Leaves />} />
            <Route path="tasks" element={<Task />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="exam" element={<AdminExams />} />
            <Route path="notice" element={<NoticePage />} />
            <Route path="events" element={<AdminEvents />} />
            <Route
              path="finance"
              element={<Navigate to="analytics" replace />}
            />
            <Route
              path="finance/analytics"
              element={<AdminFinancialAnalytics />}
            />
            <Route path="finance/payroll" element={<AdminPayrollSummary />} />

            {/* Academics Page (tabbed) */}
            <Route path="academics" element={<AcademicsPage />} />

            {/* Migrated Pages */}
            <Route path="admissions/list" element={<AdminAdmissionList />} />
            <Route path="admissions/new" element={<AdminNewAdmission />} />
            <Route
              path="admissions/request"
              element={<AdminAdmissionRequest />}
            />
            <Route path="admissions/:id" element={<AdminAdmissionDetails />} />
            <Route
              path="admissions/cancel"
              element={<AdminCancelAdmission />}
            />
            <Route path="students/manage" element={<AdminManageStudents />} />
            <Route
              path="students/id-cards"
              element={<AdminIDCardGeneration />}
            />
            <Route
              path="students/manage/:studentId"
              element={<AdminAdmissionDetails />}
            />
            <Route path="admissions/transfer" element={<AdminTransfer />} />
            <Route
              path="attendance/manage"
              element={<AdminStaffAttendance />}
            />
            <Route path="attendance/manage" element={<AdminMarkAttendance />} />
            <Route
              path="report/academic-reports"
              element={<AdminAcademicReports />}
            />
            <Route
              path="report/staff-performance"
              element={<AdminStaffPerformance />}
            />
            <Route
              path="report/attendance-reports"
              element={<AdminAttendanceReports />}
            />
            <Route path="report/exam-reports" element={<AdminExamReports />} />
            <Route path="admission-trends" element={<AdminAdmissionTrends />} />
            <Route path="dropout-tracking" element={<AdminDropoutTracking />} />
            <Route path="schedule-meeting" element={<AdminScheduleMeeting />} />
            <Route path="hrm" element={<AdminHRM />} />
            <Route
              path="attendance"
              element={<Navigate to="/admin/hrm" replace />}
            />
            <Route path="support" element={<AdminSupport />} />
            <Route path="support/tickets" element={<AdminSupport />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* Teacher Routes */}
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="my-classes" element={<TeacherClasses />} />
            <Route path="class/:id" element={<ClassDetails />} />
            <Route path="students" element={<Students />} />
            <Route path="student/:id" element={<StudentProfile />} />
            <Route path="student/:studentId" element={<StudentProfile />} />
            <Route path="complaints" element={<TeacherComplaints />} />
            <Route path="hrm/salary" element={<TeacherHRMSalary />} />
            <Route path="hrm/attendance" element={<TeacherHRMAttendance />} />
            <Route path="marksheet" element={<TeacherMarksheet />} />
            <Route path="complaints" element={<TeacherComplaintAndQuery />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="assignments" element={<Assignments />} />
            <Route
              path="assignments/:id/submissions"
              element={<AssignmentSubmissions />}
            />
            <Route path="exams-grades" element={<Exams />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="events" element={<TeacherEvents />} />
            <Route path="messages" element={<Messages />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="PTM" element={<TeacherPTM />} />
            <Route path="feedue" element={<TeacherFeeDue />} />
          </Route>

          {/* Principal Routes */}
          <Route path="/principal" element={<PrincipalLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PrincipalDashboard />} />
            <Route path="students" element={<PrincipalStudents />} />
            <Route
              path="students/attendance"
              element={<PrincipalStudentAttendance />}
            />
            <Route path="admissions/id-cards" element={<PrincipalIDCards />} />
            <Route path="admissions/new" element={<PrincipalNewAdmission />} />
            <Route
              path="admissions/request"
              element={<PrincipalAdmissionRequest />}
            />
            <Route
              path="admissions/list"
              element={<PrincipalAdmissionList />}
            />
            <Route
              path="admissions/:id"
              element={<PrincipalAdmissionDetails />}
            />
            <Route
              path="admissions/cancel"
              element={<PrincipalCancelAdmission />}
            />
            <Route path="admissions/transfer" element={<PrincipalTransfer />} />
            <Route path="academic/classes" element={<PrincipalClasses />} />
            <Route
              path="academic/classes-sections"
              element={<PrincipalClassesSections />}
            />
            <Route path="academic/subjects" element={<PrincipalSubjects />} />
            <Route path="academic/timetable" element={<PrincipalTimetable />} />
            <Route
              path="academic/class-comparison"
              element={<PrincipalClassComparison />}
            />
            <Route
              path="attendance/mark"
              element={<PrincipalMarkAttendance />}
            />
            <Route
              path="reports/attendance"
              element={<PrincipalAttendanceReport />}
            />
            <Route
              path="examinations/create"
              element={<PrincipalCreateExam />}
            />
            <Route
              path="examinations/marks-entry"
              element={<PrincipalMarksEntry />}
            />
            <Route path="examinations/results" element={<PrincipalResults />} />
            <Route
              path="examinations/marksheet"
              element={<PrincipalMarksheet />}
            />
            <Route
              path="examinations/admit-card"
              element={<PrincipalAdmitCard />}
            />
            <Route path="fees/structure" element={<PrincipalFeeStructure />} />
            <Route
              path="fees/collection"
              element={<PrincipalFeeCollection />}
            />
            <Route path="fees/due-reports" element={<PrincipalDueReports />} />
            <Route
              path="fees/transactions"
              element={<PrincipalTransactions />}
            />
            <Route path="teachers/all" element={<PrincipalAllTeachers />} />
            <Route
              path="teachers/assign-subjects"
              element={<PrincipalAssignSubjects />}
            />
            <Route
              path="teachers/schedule"
              element={<PrincipalTeacherSchedule />}
            />
            <Route
              path="communication/notices"
              element={<PrincipalNotices />}
            />
            <Route path="communication/events" element={<PrincipalEvents />} />
            <Route
              path="communication/meetings"
              element={<PrincipalMeetings />}
            />
            <Route
              path="communication/ptm-feedback"
              element={<PrincipalPTMFeedback />}
            />
            <Route
              path="reports/academic"
              element={<PrincipalAcademicReports />}
            />
            <Route
              path="reports/financial"
              element={<PrincipalFinancialReports />}
            />
            <Route
              path="settings/academic-year"
              element={<PrincipalAcademicYear />}
            />
            <Route
              path="settings/promotion"
              element={<PrincipalPromotionSettings />}
            />
            <Route
              path="hrm/promotions"
              element={<PrincipalPromotionsDemotions />}
            />
            <Route
              path="settings/policy-approvals"
              element={<PrincipalPolicyApprovals />}
            />
            <Route path="academic-setup" element={<PrincipalAcademicSetup />} />
            <Route path="attendance" element={<PrincipalAttendance />} />
            <Route path="examinations" element={<PrincipalExaminations />} />
            <Route
              path="staff-management"
              element={<PrincipalStaffManagement />}
            />
            <Route path="communication" element={<PrincipalCommunication />} />
            <Route path="reports" element={<PrincipalReports />} />
            <Route path="complaints" element={<PrincipalComplaints />} />
            <Route path="profile" element={<PrincipalProfile />} />
            <Route
              path="admission-requests"
              element={<PrincipalAdmissionRequest />}
            />
            <Route
              path="students/manage/:studentId"
              element={<AdminAdmissionDetails />}
            />
            <Route
              path="/principal/hrm/resignations"
              element={<PrincipalResignations />}
            />
            <Route
              path="/principal/hrm/payroll"
              element={<PrincipalPayroll />}
            />
            <Route
              path="/principal/staff-performance"
              element={<PrincipalStaffPerformance />}
            />
            <Route path="/principal/support" element={<Support />} />
            <Route
              path="/principal/support-desk"
              element={<PrincipalSupportDesk />}
            />
          </Route>

          {/* Accountant Routes */}
          <Route path="/accountant" element={<AccountantLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AccountantDashboard />} />
            <Route path="fees" element={<Fees />} />
            <Route path="students" element={<StudentDuesList />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="hrm" element={<HRM />} />
            <Route path="structure" element={<FeeStructures />} />
            <Route path="reports" element={<CollectionReports />} />
            <Route path="profile" element={<AccountantProfile />} />
            <Route path="notifications" element={<AccountantNotifications />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="profile" element={<StudentsProfile />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="homework" element={<StudentHomework />} />
            <Route path="results" element={<StudentResults />} />
            <Route path="leave" element={<StudentLeave />} />
            <Route path="support-ticket" element={<StudentSupportTicket />} />
            <Route path="timetable" element={<StudentTimetable />} />
            <Route path="exams" element={<StudentExams />} />
            <Route path="study-material" element={<StudentStudyMaterial />} />
            <Route path="performance" element={<StudentPerformance />} />
            <Route path="events" element={<StudentEvents />} />
            <Route path="id-card" element={<StudentIdCard />} />
            <Route path="admit-card" element={<StudentAdmitCard />} />
            <Route path="marksheet" element={<StudentMarksheet />} />
            <Route path="notices" element={<StudentNotices />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="messages" element={<StudentMessages />} />
          </Route>

          {/* Parent Routes */}
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="homework" element={<ParentHomework />} />
            <Route path="exam" element={<ParentExam />} />
            <Route path="fee-status" element={<ParentFeeStatus />} />
            <Route path="pay-fee" element={<ParentPayFee />} />
            <Route path="meetings" element={<ParentMeetings />} />
            <Route path="notices" element={<ParentNotices />} />
            <Route path="notifications" element={<ParentNotifications />} />
            <Route path="events" element={<ParentEvents />} />
            <Route path="community" element={<ParentCommunity />} />
            <Route path="results" element={<ParentExam />} />
            <Route path="id-card" element={<ParentIDCard />} />
            <Route path="transport" element={<ParentDashboard />} />
            <Route path="profile" element={<ParentProfile />} />
            <Route path="term" element={<ParentTerm />} />
            <Route path="policy" element={<ParentPolicy />} />
            <Route path="settings" element={<ParentSettings />} />
            <Route path="ticket-system" element={<ParentTicketSystem />} />
          </Route>
          {/* Subject Teacher Dashboard Routes */}
          <Route path="/subject-teacher" element={<SubjectTeacherLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SubjectTeacherDashboard />} />
            <Route path="attendance/subject-wise" element={<SubjectWiseAttendance />} />
            <Route path="attendance/staff" element={<StaffWiselyAttendance />} />
            <Route path="examinations/create-test" element={<OnlineTestCreation />} />
            <Route path="examinations/marks-entry" element={<SubjectMarksEntry />} />
            <Route path="examinations/results" element={<ResultsAndMarksheet />} />
            <Route path="students/class-data" element={<ClassStudentData />} />
            <Route path="students/performance" element={<PreformanceAnalysis />} />
            <Route path="hrm/salary" element={<SalaryAndPayout />} />
            <Route path="ptm/schedule" element={<PTMSchedule />} />
            <Route path="notifications" element={<SubjectTeacherNotifications />} />
            <Route path="complaints/manage" element={<ComplaintManagement />} />
            <Route path="profile" element={<SubjectTeacherProfile />} />
          </Route>

          {/* Static pages */}
          <Route path="/student-admission" element={<StudentAdmissionForm />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="/terms-and-conditions"
            element={<TermsAndConditions />}
          />
          <Route path="/login" element={<Navigate to="/organization/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;