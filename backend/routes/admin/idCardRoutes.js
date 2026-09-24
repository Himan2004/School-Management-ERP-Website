import express from 'express';
import {
    getStudentsForIDCard,
    generateIDCard,
    markAsPrinted,
    bulkMarkPrinted,
    deactivateIDCard,
    getStaffForIDCard,
    generateStaffIDCard,
    markStaffAsPrinted,
    bulkMarkStaffPrinted
} from '../../controllers/admin/idCardController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// Student routes
router.get('/students', getStudentsForIDCard);
router.post('/generate', generateIDCard);
router.patch('/print', markAsPrinted);
router.patch('/bulk-print', bulkMarkPrinted);
router.patch('/deactivate', deactivateIDCard);

// Staff routes
router.get('/staff', getStaffForIDCard);
router.post('/staff/generate', generateStaffIDCard);
router.patch('/staff/print', markStaffAsPrinted);
router.patch('/staff/bulk-print', bulkMarkStaffPrinted);

export default router;
