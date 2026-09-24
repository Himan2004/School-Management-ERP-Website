import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    // Academic Year CRUD
    getAcademicYears,
    getAcademicYearById,
    createAcademicYear,
    updateAcademicYearStatus,
    addHoliday,
    deleteHoliday,
    addTerm,
    deleteTerm,
    updateAcademicYear,
    deleteAcademicYear,
    
    // Promotion Settings
    getPromotionRules,
    updatePromotionRules,
    getClassMapping,
    updateClassMapping,
    runPromotion,
    getPromotionHistory,
    getPromotionPreview,
} from '../../controllers/principal/settingsController.js';

const router = express.Router();

// All routes require authentication and principal role
router.use(protect);
router.use(authorize('principal', 'admin'));

// ==================== ACADEMIC YEAR ROUTES ====================
router.get('/settings/academic-years', getAcademicYears);
router.get('/settings/academic-years/:id', getAcademicYearById);
router.post('/settings/academic-years', createAcademicYear);
router.patch('/settings/academic-years/:id/status', updateAcademicYearStatus);
// Add these with your other academic-year routes
router.put('/settings/academic-years/:id', updateAcademicYear);
router.delete('/settings/academic-years/:id', deleteAcademicYear);
// Holidays
router.post('/settings/academic-years/:id/holidays', addHoliday);
router.delete('/settings/holidays/:id', deleteHoliday);

// Terms
router.post('/settings/academic-years/:id/terms', addTerm);
router.delete('/settings/terms/:id', deleteTerm);

// ==================== PROMOTION SETTINGS ROUTES ====================
router.get('/settings/promotion/rules', getPromotionRules);
router.put('/settings/promotion/rules', updatePromotionRules);
router.get('/settings/promotion/class-mapping', getClassMapping);
router.put('/settings/promotion/class-mapping', updateClassMapping);
router.get('/settings/promotion/preview', getPromotionPreview);
router.post('/settings/promotion/run', runPromotion);
router.get('/settings/promotion/history', getPromotionHistory);

export default router;