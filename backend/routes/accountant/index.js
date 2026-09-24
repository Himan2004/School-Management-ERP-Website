import express from 'express';
import dashboardRoutes      from './accountantDashboardRoutes.js';
import expensesRoutes       from './accountantExpensesRoutes.js';
import feeStructureRoutes   from './accountantFeeStructureRoutes.js';
import payrollRoutes        from './accountantPayrollRoutes.js';
import duesRoutes           from './accountantDuesRoutes.js';
import reportsRoutes        from './accountantReportsRoutes.js';
import hrmRoutes            from './accountantHRMRoutes.js';

const router = express.Router();

router.use(dashboardRoutes);
router.use(expensesRoutes);
router.use(feeStructureRoutes);
router.use(payrollRoutes);
router.use(reportsRoutes);
router.use(hrmRoutes);

// ✅ ONE mount, with the /dues prefix
//    Full path: /api/accountant/dues/list  ← matches frontend baseURL
router.use('/dues', duesRoutes);

export default router;
