import express from 'express';
import {
    getAccountantDashboardStats,
    getAccountantRecentTransactions,
    getAccountantMonthlyData,
    getAccountantAllTransactions,
    getAccountantCommunications,
    markAccountantNoticeRead,
    getStudentTransactionReport
} from '../../controllers/accountant/accountantDashboardController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and accountant role
router.use(protect);
router.use(authorize('accountant'));

// Dashboard stats
router.get('/dashboard/stats', getAccountantDashboardStats);

// Recent transactions
router.get('/dashboard/recent-transactions', getAccountantRecentTransactions);

// Monthly chart data
router.get('/dashboard/monthly-data', getAccountantMonthlyData);

// All transactions with pagination
router.get('/dashboard/all-transactions', getAccountantAllTransactions);

// Student transaction report - NEW ROUTE
router.get('/dashboard/student-report/:studentId', getStudentTransactionReport);

// Communications
router.get('/dashboard/communications', getAccountantCommunications);
router.post('/dashboard/communications/notices/:id/view', markAccountantNoticeRead);

export default router;