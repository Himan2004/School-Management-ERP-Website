import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getPrincipalStaffPerformance } from "../../controllers/principal/staffPerformanceController.js";

const router = express.Router();

// Apply protection to all principal staff performance routes
router.use(protect);
router.use(authorize("principal"));

// Get staff performance records for the principal's specific school
router.get("/", getPrincipalStaffPerformance);

export default router;