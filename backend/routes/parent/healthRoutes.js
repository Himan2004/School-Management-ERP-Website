import express from 'express';
import { getStudentHealth } from '../../controllers/parent/healthController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('parent'));

router.get('/', getStudentHealth);

export default router;
