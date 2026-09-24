import express from 'express';
import {
    getAccountantFinancialSummary,
    getAccountantMonthlyTrend,
    getAccountantPayrollSummary,
    getAccountantTopDues,
    getAccountantClassWiseDues,
    exportAccountantFinancialReport
} from '../../controllers/accountant/accountantReportsController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('accountant', 'admin'));

router.get('/reports/summary', getAccountantFinancialSummary);
router.get('/reports/monthly-trend', getAccountantMonthlyTrend);
router.get('/reports/payroll-summary', getAccountantPayrollSummary);
router.get('/reports/top-dues', getAccountantTopDues);
router.get('/reports/class-wise-dues', getAccountantClassWiseDues);
router.post('/reports/export', exportAccountantFinancialReport);

export default router;