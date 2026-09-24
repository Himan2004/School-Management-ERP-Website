import express from 'express';
import {
    getDuesList,
    sendDuesReminder,
    sendBulkDuesReminder,
    updateStudentStatus,
} from '../../controllers/accountant/accountantDuesController.js';

// import { verifyToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// router.use(verifyToken, requireRole('accountant'));

// GET  /accountant/dues/list          — fetch all defaulters
router.get('/list',                    getDuesList);

// POST /accountant/dues/remind/:id    — single reminder
router.post('/remind/:studentId',      sendDuesReminder);

// POST /accountant/dues/remind-bulk   — bulk reminder
router.post('/remind-bulk',            sendBulkDuesReminder);

// PATCH /accountant/dues/status/:id   — update active/inactive
router.patch('/status/:studentId',     updateStudentStatus);

export default router;
