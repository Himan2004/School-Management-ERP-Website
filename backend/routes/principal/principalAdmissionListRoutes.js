import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    // Section 1: Main List Display
    getAllAdmissionsList,
    getAdmissionsSummaryCards,
    getAdmissionsByStatusTab,
    getSingleAdmissionDetail,
    getAdmissionDashboardStats,
    getQuickStatusCounts,

    // Section 2: Search & Filtering
    searchAdmissions,
    filterAdmissions,
    getAdmissionsByDateRange,
    getFilterMetadata,

    // Section 3: Details & Timeline
    getAdmissionTimeline,
    getSimilarAdmissions,
    getAdmissionNotes,
    addAdmissionNote,

    // Section 4: Quick Actions
    changeAdmissionStatus,
    toggleAdmissionFlag,

    // Section 5: Bulk Operations
    bulkUpdateAdmissions,

    // Section 6: Reports & Analytics
    getPendingAdmissions,
    getPerformanceMetrics,
    getPrintableReport,
    exportAdmissionsReport,

    // Section 7: Support Features
    getComparisonCharts,
    getFilterOptions,
    getPendingActions,
    getOrganizationSchools,
    transferStudent,

    getSectionsByClass
} from '../../controllers/principal/admissionListController.js';

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'principal'));

// ─── SECTION 1: Main List Display ────────────────────────────────────────────
router.get('/', getAllAdmissionsList);
router.get('/summary', getAdmissionsSummaryCards);
router.get('/by-status', getAdmissionsByStatusTab);
router.get('/dashboard-stats', getAdmissionDashboardStats);
router.get('/status-counts', getQuickStatusCounts);

// ─── SECTION 2: Search & Filtering ───────────────────────────────────────────
router.get('/search', searchAdmissions);
router.get('/filter', filterAdmissions);
router.get('/date-range', getAdmissionsByDateRange);
router.get('/filter-metadata', getFilterMetadata);

// ─── SECTION 5: Bulk Operations ───────────────────────────────────────────────
router.patch('/bulk', authorize('admin'), bulkUpdateAdmissions);

// ─── SECTION 6: Reports ───────────────────────────────────────────────────────
router.get('/reports/pending', getPendingAdmissions);
router.get('/reports/metrics', getPerformanceMetrics);
router.get('/reports/printable', getPrintableReport);
router.get('/reports/export', exportAdmissionsReport);

// ─── SECTION 7: Support Features ──────────────────────────────────────────────
router.get('/charts/comparison', getComparisonCharts);
router.get('/meta/filter-options', getFilterOptions);
router.get('/pending-actions', getPendingActions);

router.get('/organization-schools', getOrganizationSchools);
router.post('/transfer', authorize('admin'), transferStudent);

// ─── SECTION 1 (continued): Single detail — MUST BE LAST OF THE GET ROUTES ──
router.get('/:id', getSingleAdmissionDetail);

// ─── SECTION 3: Details & Timeline ───────────────────────────────────────────
router.get('/:id/timeline', getAdmissionTimeline);
router.get('/:id/similar', getSimilarAdmissions);
router.get('/:id/notes', getAdmissionNotes);
router.post('/:id/notes', authorize('admin'), addAdmissionNote);

// ─── SECTION 4: Quick Actions ─────────────────────────────────────────────────
router.patch('/:id/status', authorize('admin'), changeAdmissionStatus);
router.patch('/:id/flag', authorize('admin'), toggleAdmissionFlag);

router.get("/sections/:classId", getSectionsByClass);

export default router;