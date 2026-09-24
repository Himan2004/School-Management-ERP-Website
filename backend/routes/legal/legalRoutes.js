import { Router } from 'express';
import { getTermsAndConditions, getPrivacyPolicy, getOfficialPolicies } from '../../controllers/legal/legalController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/terms-and-conditions', protect, getTermsAndConditions);
router.get('/privacy-policy', protect, getPrivacyPolicy);
router.get('/policies', protect, getOfficialPolicies);

export default router;
