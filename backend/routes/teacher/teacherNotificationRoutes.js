import express from 'express';
import {
    syncAndGetTeacherNotifications,
    markTeacherNotificationRead,
    markAllTeacherNotificationsRead
} from '../../controllers/teacher/teacherNotificationController.js';

const router = express.Router();

router.get('/', syncAndGetTeacherNotifications);
router.patch('/:id/read', markTeacherNotificationRead);
router.post('/mark-all-read', markAllTeacherNotificationsRead);

export default router;
