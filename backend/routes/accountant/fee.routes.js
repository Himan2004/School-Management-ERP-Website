import express from 'express';
import {
    getStudentsWithFees,
    getStudentFeeProfile,
    processPayment,
    getPaymentHistory,
    getLateFeeSetting,
    saveLateFeeSetting,
    getFeeSummary,
} from '../../controllers/accountant/fee.controller.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Students & fees ──────────────────────────────────────
// GET  /api/accountant/fees/students          — list all students with fee summary
// GET  /api/accountant/fees/students/:id      — single student full profile
router.get('/students', authorize('accountant', 'admin', 'principal', 'teacher'), getStudentsWithFees);
router.get('/students/:studentId', authorize('accountant', 'admin', 'principal', 'teacher'), getStudentFeeProfile);

// ── Payments ─────────────────────────────────────────────
// POST /api/accountant/fees/pay               — process a payment
// GET  /api/accountant/fees/payments/:id      — payment history for student
router.post('/pay', authorize('accountant', 'admin', 'principal'), processPayment);
router.get('/payments/:studentId', authorize('accountant', 'admin', 'principal', 'teacher'), getPaymentHistory);

// ── Late fee setting ──────────────────────────────────────
// GET  /api/accountant/fees/late-fee-setting
// POST /api/accountant/fees/late-fee-setting
router.get('/late-fee-setting', authorize('accountant', 'admin', 'principal', 'teacher'), getLateFeeSetting);
router.post('/late-fee-setting', authorize('accountant', 'admin', 'principal'), saveLateFeeSetting);

// ── Summary / Dashboard ───────────────────────────────────
// GET  /api/accountant/fees/summary
router.get('/summary', authorize('accountant', 'admin', 'principal', 'teacher'), getFeeSummary);

export default router;
