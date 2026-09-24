import express from "express";
const router = express.Router();

import {
    loginAccountant,
    logoutAccountant,
    getAccountant,
    updateAccountantPassword,
    uploadAccountantAvatar
} from "../../controllers/auth/accountantAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

router.post('/login', loginAccountant);
router.post('/logout', logoutAccountant);
router.get('/me', protect, authorize("accountant"), getAccountant);
router.put('/change-password', protect, authorize("accountant"), updateAccountantPassword);
router.post('/profile/avatar', protect, authorize("accountant"), upload.single('avatar'), uploadAccountantAvatar);

export default router;