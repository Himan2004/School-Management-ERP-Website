import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceSummary,
  markAttendance,
  createLeaveRequest,
  getLeaveRequests,
  getLeaveBalance
} from "../../controllers/superAdmin/staffAttendanceController.js";

const router = express.Router();

// ════════════════════════ ATTENDANCE ════════════════════════

// Clock in
router.post("/clock-in", protect, clockIn);

// Clock out
router.post("/clock-out", protect, clockOut);

// Get attendance records
router.get("/records", protect, authorize("superadmin"), getAttendance);

// Get attendance summary
router.get("/summary", protect, authorize("superadmin"), getAttendanceSummary);

// Mark attendance manually (admin only)
router.post("/mark", protect, authorize("superadmin"), markAttendance);

// ════════════════════════ LEAVES ════════════════════════

// Create leave request
router.post("/leaves", protect, createLeaveRequest);

// Get leave requests
router.get("/leaves", protect, getLeaveRequests);

// Get leave balance
router.get("/leaves/balance/:staffId", protect, getLeaveBalance);

export default router;
