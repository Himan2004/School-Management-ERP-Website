import express from 'express';
import {
  getFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
} from '../../controllers/superAdmin/feeRuleController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.route('/')
  .get(getFeeRules)
  .post(createFeeRule);

router.route('/:id')
  .put(updateFeeRule)
  .delete(deleteFeeRule);

export default router;
