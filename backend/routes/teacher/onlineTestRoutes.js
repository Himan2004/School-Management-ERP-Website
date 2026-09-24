import express from 'express';
import {
    getMyTests,
    getTestStats,
    createTest,
    getTestById,
    updateTest,
    deleteTest,
    duplicateTest,
    getFilters,
} from '../../controllers/teacher/onlineTestController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require a logged-in teacher
router.use(protect);
router.use(authorize('teacher'));

// Listing & creation
router.get('/stats',    getTestStats);  // Must be before /:id to avoid conflict
router.get('/filters',  getFilters);
router.get('/',         getMyTests);
router.post('/',        createTest);

// Single-item operations
router.get('/:id',             getTestById);
router.put('/:id',             updateTest);
router.delete('/:id',          deleteTest);
router.post('/:id/duplicate',  duplicateTest);

export default router;
