import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import {
    getSystemSettings,
    updateSystemSettings,
    toggleModule,
    updateDefaultRules,
    getSettingsAuditLog,
} from '../../controllers/superAdmin/settingsController.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// Settings Routes
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.put('/settings/modules/:moduleName/toggle', toggleModule);
router.put('/settings/rules', updateDefaultRules);
router.get('/settings/audit-log', getSettingsAuditLog);

export default router;