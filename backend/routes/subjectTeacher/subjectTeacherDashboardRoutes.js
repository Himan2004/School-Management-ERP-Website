import express from 'express';
import {
    getTeacherDashboardStats,
    getWeakStudents,
    getRecentActivity,
    getNotifications,
    getTasks,
    markNotificationRead,
    markAllNotificationsRead
} from '../../controllers/subjectTeacher/subjectTeacherDashboardController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher'));

router.get('/stats', getTeacherDashboardStats);
router.get('/weak-students', getWeakStudents);
router.get('/activity', getRecentActivity);
router.get('/tasks', getTasks);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

export default router;
