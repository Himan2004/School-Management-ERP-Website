import express from "express";
import {
  getBulkAdmitCards,
  getSpecificStudentAdmitCard,
  verifyAdmitCardAdmin,
  getAdmitCardStats,
} from "../../controllers/principal/principalAdmitController.js";

// Import your authentication middlewares (adjust paths/names as per your project)
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal"));

/**
 * @route   GET /api/principal/admit-cards
 * @desc    Get bulk admit cards (requires ?classId=... & ?scheduleId=...)
 * @access  Private (Principal/Admin)
 */
router.get("/admit-cards", getBulkAdmitCards);
router.get("/admit-cards/stats", getAdmitCardStats);

/**
 * @route   POST /api/principal/admit-card/verify
 * @desc    Verify a student's admit card via QR scan
 * @access  Private (Principal/Admin/Invigilator)
 */
router.post("/admit-card/verify", verifyAdmitCardAdmin);

/**
 * @route   GET /api/principal/admit-card/:studentId
 * @desc    Get a detailed admit card for a specific student
 * @access  Private (Principal/Admin)
 */
router.get("/admit-card/:studentId", getSpecificStudentAdmitCard);

export default router;
