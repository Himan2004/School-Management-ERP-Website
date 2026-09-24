import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';

// Import all controllers
import {
    getAdmissionStats,
    getAdmissionTrend,
    getBranchAdmissions,
    getClassStrength,
    getEnquiryFunnel,
    getDropoutAnalysis,
    getAdmissionDashboardData
} from '../../controllers/superAdmin/analytics/admissionTrendsController.js';

import {
    getAllBranches,
    getLowPerformingBranches,
    compareBranches,
    getBranchDetails
} from '../../controllers/superAdmin/analytics/branchComparisonController.js';

import {
    getEnrollmentTrend,
    getAttendanceTrend,
    getRevenueTrend,
    getPassPercentageTrend,
    getGrowthMetrics,
    getPerformanceTrendsData
} from '../../controllers/superAdmin/analytics/performanceTrendsController.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// ==================== Admission Trends Routes ====================
router.get('/analytics/admissions/dashboard', getAdmissionDashboardData);
router.get('/analytics/admissions/stats', getAdmissionStats);
router.get('/analytics/admissions/trend', getAdmissionTrend);
router.get('/analytics/admissions/branches', getBranchAdmissions);
router.get('/analytics/admissions/class-strength', getClassStrength);
router.get('/analytics/admissions/enquiry-funnel', getEnquiryFunnel);
router.get('/analytics/admissions/dropout-analysis', getDropoutAnalysis);

// ==================== Branch Comparison Routes ====================
router.get('/analytics/branches/all', getAllBranches);
router.get('/analytics/branches/low-performing', getLowPerformingBranches);
router.get('/analytics/branches/compare', compareBranches);
router.get('/analytics/branches/:branchId/details', getBranchDetails);

// ==================== Performance Trends Routes ====================
router.get('/analytics/trends/enrollment', getEnrollmentTrend);
router.get('/analytics/trends/attendance', getAttendanceTrend);
router.get('/analytics/trends/revenue', getRevenueTrend);
router.get('/analytics/trends/pass-percentage', getPassPercentageTrend);
router.get('/analytics/trends/growth', getGrowthMetrics);
router.get('/analytics/trends/performance', getPerformanceTrendsData);

export default router;