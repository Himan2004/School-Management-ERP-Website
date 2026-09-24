import express from "express";
import { 
    getTeacherSalaries, 
    getDetailedSalarySlip, 
    getTeacherFinanceSummary 
} from "../../controllers/teacher/teacherController.js";
// import {
//     getMarksBySchedule,
//     enterMarks,
//     submitMarksheet
// } from "../../controllers/teacher/teacherExamController.js";
import { getTeacherEvents,createTeacherEvent, deleteTeacherEvent } from "../../controllers/teacher/teacherCalendarController.js";
import { getSchedulesByClass, getExamScheduleDetails } from "../../controllers/academic/examController.js";
import { getTeacherProfile,updateTeacherProfile } from "../../controllers/teacher/teacherProfileController.js";
import { getTeacherSettings,updateTeacherSettings,changeTeacherPassword } from "../../controllers/teacher/teacherSettingsController.js";
import {
    getResignation,
    applyResignation,
    withdrawResignation
} from "../../controllers/admin/adminHrmController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";
import teacherDashboardRoutes from "./teacherDashboardRoutes.js";
import teacherAttendanceRoutes from "./teacherAttendanceRoutes.js";
import teacherClassesRoutes from "./teacherClassesRoutes.js";
import teacherStudentsRoutes from "./teacherStudentsRoutes.js";
import teacherNotificationRoutes from "./teacherNotificationRoutes.js";
import marksEntryRoutes from "./marksEntryRoutes.js";
import resultsRoutes from "./resultsRoutes.js";
import leaveRoutes from "./leaveRoutes.js";
import announcementRoutes from "./announcementRoutes.js";

const router = express.Router();

// Apply protection to all teacher routes
router.use(protect);
router.use(authorize("teacher"));

// Finance Routes
router.get("/finance/salaries", getTeacherSalaries);
router.get("/finance/salary/:id", getDetailedSalarySlip);
router.get("/finance/summary", getTeacherFinanceSummary);



//Calender Routes
router.route('/calendar/events')
    .get(getTeacherEvents)
    .post(createTeacherEvent);
router.route('/calendar/events/:id')
    .delete(deleteTeacherEvent);

//Profile Routes
router.route('/profile')
    .get(getTeacherProfile)
    .put(updateTeacherProfile);

//Settings Routes
router.route('/settings')
    .get(getTeacherSettings)
    .put(updateTeacherSettings);

router.put('/settings/change-password', changeTeacherPassword);

// Resignation Routes
router.get('/resignation', getResignation);
router.post('/resignation', applyResignation);
router.post('/resignation/withdraw', withdrawResignation);

// Teacher Modules
router.use('/dashboard', teacherDashboardRoutes);
router.use('/attendance', teacherAttendanceRoutes);
router.use('/classes', teacherClassesRoutes);
router.use('/students', teacherStudentsRoutes);
router.use('/notifications', teacherNotificationRoutes);
router.use('/marks-entry', marksEntryRoutes);
router.use('/results', resultsRoutes);
router.use('/leave', leaveRoutes);
router.use('/announcements', announcementRoutes);
export default router;
