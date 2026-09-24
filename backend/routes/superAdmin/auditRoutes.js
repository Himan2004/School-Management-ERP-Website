import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';

import {
    getAuditBranches,
    getBranchAuditDetails,
    deactivateBranch,
    getAuditStats
} from '../../controllers/superAdmin/audit/auditLogsController.js';

import {
    getFinancialAnomalies,
    resolveFinancialAnomaly,
    getFinancialAnomalyStats
} from '../../controllers/superAdmin/audit/financialAnomaliesController.js';

import {
    getStudentChanges,
    deleteStudentChangeLog,
    getStudentChangeStats
} from '../../controllers/superAdmin/audit/studentChangesController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

// ==================== Audit Logs Routes (Branch Audit) ====================
router.get('/audit/branches', getAuditBranches);
router.get('/audit/branches/stats', getAuditStats);
router.get('/audit/branches/:id', getBranchAuditDetails);
router.delete('/audit/branches/:id', deactivateBranch);

// ==================== Financial Anomalies Routes ====================
router.get('/audit/financial/anomalies', getFinancialAnomalies);
router.get('/audit/financial/anomalies/stats', getFinancialAnomalyStats);
router.post('/audit/financial/anomalies/:id/resolve', resolveFinancialAnomaly);

// ==================== Student Changes Routes ====================
router.get('/audit/student-changes', getStudentChanges);
router.get('/audit/student-changes/stats', getStudentChangeStats);
router.delete('/audit/student-changes/:id', deleteStudentChangeLog);

export default router;