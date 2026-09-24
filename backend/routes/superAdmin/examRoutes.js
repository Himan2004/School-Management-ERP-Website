import express from "express";
import {
    // ==================== COMMON / DASHBOARD ====================
    getExamDashboardStats,
    getOrganizationExams,
    getGlobalPerformanceAnalytics,
    
    // ==================== EXAM CONFIG PAGE (Wizard/Create Exam) ====================
    getExamStructures,
    getExamStructureById,
    createExamStructure,
    updateExamStructure,
    deleteExamStructure,
    
    // ==================== EXAM SCHEDULE PAGE (Calendar/Table View) ====================
    getAllExamSchedules,
    getExamScheduleById,
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    updateExamScheduleStatus,
    getScheduleMarksheets,
    bulkUpdateMarksheetsStatus,
} from "../../controllers/superAdmin/examController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// MIDDLEWARE - All routes require Super Admin authentication
// =====================================================
router.use(protect);
router.use(authorize("superadmin"));

// =====================================================
// SECTION 1: DASHBOARD & ANALYTICS (Shared across all pages)
// =====================================================
// These endpoints provide data for the dashboard cards and analytics

// Get statistics for dashboard cards
// Used by: ExamSchedule page, ExamStructure page, Config page
router.get("/exams/stats", getExamDashboardStats);

// Get all exam schedules across all schools (with filters)
// Used by: ExamSchedule page (table view, calendar view)
router.get("/exams/all-schedules", getOrganizationExams);

// Get cross-school performance analytics
// Used by: ExamSchedule page (analytics charts)
router.get("/exams/analytics", getGlobalPerformanceAnalytics);

// =====================================================
// SECTION 2: EXAM CONFIG PAGE (Exam Setup Wizard)
// =====================================================
// This handles the 4-step wizard for creating/editing exam structures:
// Step 1: General Info (Exam Name, Academic Year, Class)
// Step 2: Subject Mapping (Theory marks, Practical marks, Passing marks)
// Step 3: Grading Logic (Grade matrix, Min pass percentage)
// Step 4: Result Rules (Grace marks, Weightage)

// Get all exam structures (templates/configurations)
// Used by: Config page list view, dropdown in schedule creation
router.get("/exams/structures", getExamStructures);

// Get single exam structure by ID (for editing)
// Used by: Config page edit mode (load existing config into wizard)
router.get("/exams/structures/:id", getExamStructureById);

// Create new exam structure (save wizard data)
// Used by: Config page - Submit button after Step 4
// Body: { examName, academicYear, examType, applicableClasses, subjectMarkings, gradingConfigRef, allowGraceMarks, graceMarksLimit }
router.post("/exams/structures", createExamStructure);

// Update existing exam structure
// Used by: Config page edit mode - Save changes
router.put("/exams/structures/:id", updateExamStructure);

// Delete exam structure
// Used by: Config page - Delete button on structure list
router.delete("/exams/structures/:id", deleteExamStructure);

// =====================================================
// SECTION 3: EXAM SCHEDULE PAGE (Timetable Management)
// =====================================================
// This handles the exam schedule (calendar/table view):
// - Creating exam schedules from structures
// - Managing dates, times, venues, invigilators
// - Publishing/unpublishing schedules

// Get all exam schedules (with pagination and filters)
// Used by: Schedule page - Table view, Calendar view, Filter sidebar
// Query params: schoolId, status, academicYear, page, limit
router.get("/exams/schedules", getAllExamSchedules);

// Get single exam schedule by ID (for viewing/edit)
// Used by: Schedule page - Modal view, Edit form
router.get("/exams/schedules/:id", getExamScheduleById);

// Create new exam schedule (from structure)
// Used by: Schedule page - "Add New Schedule" button
// Body: { school, examStructure, academicYear, class, section, slots, status }
router.post("/exams/schedules", createExamSchedule);

// Update exam schedule (dates, venue, invigilator)
// Used by: Schedule page - Edit schedule modal
router.put("/exams/schedules/:id", updateExamSchedule);

// Delete exam schedule
// Used by: Schedule page - Delete button on schedule card/row
router.delete("/exams/schedules/:id", deleteExamSchedule);

// Update exam schedule status (publish/draft/cancel)
// Used by: Schedule page - Publish button, Status toggle
// Body: { status: "published" | "draft" | "cancelled" }
router.patch("/exams/schedules/:id/status", updateExamScheduleStatus);

// Get marksheets for an exam schedule
router.get("/exams/schedules/:id/marksheets", getScheduleMarksheets);

// Bulk update marksheets status
router.put("/exams/marksheets/status", bulkUpdateMarksheetsStatus);

// =====================================================
// SECTION 4: EXAM STRUCTURE PAGE (Template Library)
// =====================================================
// Note: This page reuses the same endpoints as SECTION 2
// The exam structure page displays all saved templates/configurations
// It uses:
// - GET /exams/structures (to list all structures)
// - GET /exams/structures/:id (to view structure details)
// - DELETE /exams/structures/:id (to delete structure)
// - PUT /exams/structures/:id (to edit structure)

// =====================================================
// API ENDPOINTS SUMMARY TABLE
// =====================================================
/*
| Page                    | Method | Endpoint                          | Description                          |
|-------------------------|--------|-----------------------------------|--------------------------------------|
| Dashboard (All)         | GET    | /exams/stats                      | Get dashboard statistics             |
| Dashboard (All)         | GET    | /exams/all-schedules               | Get all schedules                    |
| Dashboard (All)         | GET    | /exams/analytics                  | Get performance analytics            |
|-------------------------|--------|-----------------------------------|--------------------------------------|
| Config Page             | GET    | /exams/structures                 | List all exam structures             |
| Config Page             | GET    | /exams/structures/:id             | Get single structure                 |
| Config Page             | POST   | /exams/structures                 | Create new structure (wizard)        |
| Config Page             | PUT    | /exams/structures/:id             | Update structure                     |
| Config Page             | DELETE | /exams/structures/:id             | Delete structure                     |
|-------------------------|--------|-----------------------------------|--------------------------------------|
| Schedule Page           | GET    | /exams/schedules                  | List all schedules                   |
| Schedule Page           | GET    | /exams/schedules/:id              | Get single schedule                  |
| Schedule Page           | POST   | /exams/schedules                  | Create schedule                      |
| Schedule Page           | PUT    | /exams/schedules/:id              | Update schedule                      |
| Schedule Page           | DELETE | /exams/schedules/:id              | Delete schedule                      |
| Schedule Page           | PATCH  | /exams/schedules/:id/status       | Update schedule status               |
|-------------------------|--------|-----------------------------------|--------------------------------------|
| Structure Page          | GET    | /exams/structures                 | List all structures (same as Config) |
| Structure Page          | GET    | /exams/structures/:id             | View structure details               |
| Structure Page          | DELETE | /exams/structures/:id             | Delete structure                     |
*/
export default router;