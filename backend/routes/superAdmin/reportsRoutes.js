import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';

// Academic Reports
import {
    getBranchWiseResults,
    getSubjectWiseAnalysis,
    getTopStudents,
    getGradeDistribution,
    getBranchComparisonChart,
    getReportFilters,
    getKPISummary,
    getPassPercentageByBranch,
    getBranchHQComparison,
    getClassPerformance
} from '../../controllers/superAdmin/reports/academicReportsController.js';

// Financial Reports (module removed)
// import {
//     getBranchWiseCollection,
//     getCategoryBreakdown,
//     getRevenueTrend,
//     getPendingDuesAlerts
// } from '../../controllers/superAdmin/reports/financialReportsController.js';

// Staff Reports
import {
    getBranchWiseStaffOverview,
    getDepartmentWiseStaff,
    getStaffTransfersAndExits,
    getStaffAttendanceTrend
} from '../../controllers/superAdmin/reports/staffReportsController.js';

// Export Reports
import {
    exportReport,
    bulkExportReports,
    getExportHistory
} from '../../controllers/superAdmin/reports/reportsExportController.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// ==================== Academic Reports Routes ====================
router.get('/reports/filters', getReportFilters);
router.get('/reports/academic/branch-results', getBranchWiseResults);
router.get('/reports/academic/subject-analysis', getSubjectWiseAnalysis);
router.get('/reports/academic/top-students', getTopStudents);
router.get('/reports/academic/grade-distribution', getGradeDistribution);
router.get('/reports/academic/branch-comparison', getBranchComparisonChart);
router.get('/reports/academic/kpi-summary', getKPISummary);
router.get('/reports/academic/pass-percentage-by-branch', getPassPercentageByBranch);
router.get('/reports/academic/branch-hq-comparison', getBranchHQComparison);
router.get('/reports/academic/class-performance', getClassPerformance);

// ==================== Financial Reports Routes (module removed) ====================
// router.get('/reports/financial/branch-collection', getBranchWiseCollection);
// router.get('/reports/financial/category-breakdown', getCategoryBreakdown);
// router.get('/reports/financial/revenue-trend', getRevenueTrend);
// router.get('/reports/financial/pending-alerts', getPendingDuesAlerts);

// ==================== Staff Reports Routes ====================
router.get('/reports/staff/branch-overview', getBranchWiseStaffOverview);
router.get('/reports/staff/department-wise', getDepartmentWiseStaff);
router.get('/reports/staff/transfers-exits', getStaffTransfersAndExits);
router.get('/reports/staff/attendance-trend', getStaffAttendanceTrend);

// ==================== Export Routes ====================
router.post('/reports/export', exportReport);
router.post('/reports/export/bulk', bulkExportReports);
router.get('/reports/export/history', getExportHistory);

export default router;