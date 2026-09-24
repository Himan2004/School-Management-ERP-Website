import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    cloneTemplate
} from '../../controllers/principal/idCardTemplateController.js';
import {
    generateBatch,
    updateCardStatus,
    getCardStats,
    verifyCard
} from '../../controllers/principal/idCardController.js';
import { getStudentsForIDCard } from '../../controllers/admin/idCardController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Template Management
router.get('/templates', authorize('principal', 'admin'), getTemplates);
router.post('/templates', authorize('principal'), createTemplate);

router.route('/templates/:id')
    .put(authorize('principal'), updateTemplate)
    .delete(authorize('principal'), deleteTemplate);

router.post('/templates/:id/clone', authorize('principal'), cloneTemplate);

// Card Management
router.get('/students', authorize('principal'), getStudentsForIDCard);
router.post('/generate', authorize('principal'), generateBatch);
router.patch('/status', authorize('principal'), updateCardStatus);
router.get('/stats', authorize('principal'), getCardStats);

// Verification (Could be public if needed)
router.get('/verify/:qrData', verifyCard);

export default router;
