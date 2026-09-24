// studentAuth.routes.js
import express from "express";
const router = express.Router();

import {
    loginStudent,
    logoutStudent,
    getStudent
} from "../../controllers/auth/studentAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

router.post('/login', loginStudent);
router.post('/logout', logoutStudent);
router.get('/me', protect, authorize("student"), getStudent);

export default router;