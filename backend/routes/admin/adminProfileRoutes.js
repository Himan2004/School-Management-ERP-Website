import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import {
    getAdminProfile,
    updateAdminProfile,
    uploadProfileAvatar,
    removeProfileAvatar,
    changeAdminPassword,
} from '../../controllers/admin/adminProfileController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Profile CRUD
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);

// Avatar upload/remove
router.post('/profile/upload-avatar', upload.single('avatar'), uploadProfileAvatar);
router.delete('/profile/avatar', removeProfileAvatar);

// Password change
router.post('/profile/change-password', changeAdminPassword);

export default router;