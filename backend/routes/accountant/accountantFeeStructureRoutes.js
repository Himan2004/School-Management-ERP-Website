import express from 'express';
import {
    getAccountantFeeStructures,
    createAccountantFeeStructure,
    updateAccountantFeeStructure,
    deleteAccountantFeeStructure,
    toggleAccountantFeeStructureStatus,
} from '../../controllers/accountant/accountantFeeStructureController.js';
import { getClassesSections } from '../../controllers/principal/academicsController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('accountant', 'admin'));

// ── CRITICAL FIX: /classes MUST be registered before /:id ──
// Without this, GET /fee-structure/classes matches /:id with id="classes"
// and Express calls updateAccountantFeeStructure instead. Instant 404/500.
router.get('/fee-structure/classes', getClassesSections);

// ── Collection routes ──
router.get('/fee-structure',  getAccountantFeeStructures);
router.post('/fee-structure', createAccountantFeeStructure);

// ── Resource routes (/:id must come AFTER all literal paths) ──
// /:id/toggle is a literal suffix on top of :id, so it's fine to keep
// here as long as it's declared before any catch-all — Express matches
// the more specific path first regardless of order in this case, but
// keeping it grouped with the other /:id routes for readability.
router.patch('/fee-structure/:id/toggle', toggleAccountantFeeStructureStatus);
router.put('/fee-structure/:id',    updateAccountantFeeStructure);
router.delete('/fee-structure/:id', deleteAccountantFeeStructure);

export default router;
