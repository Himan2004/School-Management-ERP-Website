import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import {
    getProfile,
    updateProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    changePassword,
    updateEmail,
    getActivityLog,
    getProfileStats,
} from '../../controllers/superAdmin/profileController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

// Profile CRUD
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.patch('/profile', updateProfile); // Also accept PATCH (used by frontend slice)

// Profile Photo
router.post('/profile/photo', upload.single('photo'), uploadProfilePhoto);
router.delete('/profile/photo', removeProfilePhoto);

// Security
router.post('/profile/change-password', changePassword);
router.put('/profile/email', updateEmail);

// Activity & Stats
router.get('/profile/activity-log', getActivityLog);
router.get('/profile/stats', getProfileStats);

export default router;