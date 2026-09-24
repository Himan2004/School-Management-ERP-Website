// parentAuth.routes.js
import express from "express";
const router = express.Router();

import {
    loginParent,
    logoutParent,
    getParent,
    updateParentPassword
} from "../../controllers/auth/parentAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

router.post('/login', loginParent);
router.post('/logout', logoutParent);
router.get('/me', protect, authorize("parent"), getParent);
router.put('/change-password', protect, authorize("parent"), updateParentPassword);

export default router;