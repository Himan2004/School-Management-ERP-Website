import express from "express";
import {
    getPendingDues,
    exportPendingDues,
} from "../../controllers/superAdmin/pendingDuesController.js";
import { protect } from "../../middleware/authMiddleware.js"; // ← import your auth middleware

const router = express.Router();

router.get("/", protect, getPendingDues);           // ← add protect
router.get("/export", protect, exportPendingDues);  // ← add protect

export default router;