import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  approvePromotion,
  rejectPromotion,
  getAllResignations,
  getResignationById,
  createResignation,
  approveResignation,
  rejectResignation,
  getAllTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  completeTransfer
} from "../../controllers/superAdmin/hrmController.js";

// 🔥 Added Imports from your Staff Attendance Controller
import {
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  getAttendance,
  getAttendanceSummary,
  markAttendance,
  clockIn,
  clockOut
} from "../../controllers/superAdmin/staffAttendanceController.js"; // Verify this path matches your folder structure!

const router = express.Router();

// ════════════════════════ ATTENDANCE & LEAVES ════════════════════════

// Get attendance records
router.get("/attendance/records", protect, authorize("superadmin"), getAttendance);

// Get attendance summary
router.get("/attendance/summary", protect, authorize("superadmin"), getAttendanceSummary);

// Mark manual attendance
router.post("/attendance/mark", protect, authorize("superadmin"), markAttendance);

// Clock In/Out (If needed by staff directly later)
router.post("/attendance/clock-in", protect, clockIn);
router.post("/attendance/clock-out", protect, clockOut);

// Get leave requests
router.get("/attendance/leaves", protect, authorize("superadmin"), getLeaveRequests);

// Approve leave (Fixes the 404 Route Not Found error!)
router.post("/attendance/leaves/:id/approve", protect, authorize("superadmin"), approveLeave);

// Reject leave (Fixes the 404 Route Not Found error!)
router.post("/attendance/leaves/:id/reject", protect, authorize("superadmin"), rejectLeave);


// ════════════════════════ PROMOTIONS ════════════════════════

// Get all promotions
router.get("/promotions", protect, authorize("superadmin"), getAllPromotions);

// Get single promotion
router.get("/promotions/:id", protect, authorize("superadmin"), getPromotionById);

// Create promotion
router.post("/promotions", protect, authorize("superadmin"), createPromotion);

// Approve promotion
router.post("/promotions/:id/approve", protect, authorize("superadmin"), approvePromotion);

// Reject promotion
router.post("/promotions/:id/reject", protect, authorize("superadmin"), rejectPromotion);

// ════════════════════════ RESIGNATIONS ════════════════════════

// Get all resignations
router.get("/resignations", protect, authorize("superadmin"), getAllResignations);

// Get single resignation
router.get("/resignations/:id", protect, authorize("superadmin"), getResignationById);

// Create resignation
router.post("/resignations", protect, authorize("superadmin"), createResignation);

// Approve resignation
router.post("/resignations/:id/approve", protect, authorize("superadmin"), approveResignation);

// Reject resignation
router.post("/resignations/:id/reject", protect, authorize("superadmin"), rejectResignation);

// ════════════════════════ TRANSFERS ════════════════════════

// Get all transfers
router.get("/transfers", protect, authorize("superadmin"), getAllTransfers);

// Get single transfer
router.get("/transfers/:id", protect, authorize("superadmin"), getTransferById);

// Create transfer
router.post("/transfers", protect, authorize("superadmin"), createTransfer);

// Approve transfer
router.post("/transfers/:id/approve", protect, authorize("superadmin"), approveTransfer);

// Reject transfer
router.post("/transfers/:id/reject", protect, authorize("superadmin"), rejectTransfer);

// Complete transfer
router.post("/transfers/:id/complete", protect, authorize("superadmin"), completeTransfer);

export default router;