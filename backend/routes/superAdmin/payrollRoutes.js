import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAllPayroll,
  getPayrollById,
  createPayroll,
  updatePayroll,
  approvePayroll,
  rejectPayroll,
  generateSalarySlip,
  getSalarySlip,
  getStaffSalarySlips,
  // getPayrollSummary
} from "../../controllers/superAdmin/payrollController.js";

const router = express.Router();

// ════════════════════════ PAYROLL ════════════════════════

// Get all payroll records
router.get("/", protect, authorize("superadmin"), getAllPayroll);

// Get payroll summary
// router.get("/summary", protect, authorize("superadmin"), getPayrollSummary);

// Get single payroll
router.get("/:id", protect, authorize("superadmin"), getPayrollById);

// Create payroll
router.post("/", protect, authorize("superadmin"), createPayroll);

// Update payroll
router.patch("/:id", protect, authorize("superadmin"), updatePayroll);

// Approve payroll
router.post("/:id/approve", protect, authorize("superadmin"), approvePayroll);

// Reject payroll
router.post("/:id/reject", protect, authorize("superadmin"), rejectPayroll);

// ════════════════════════ SALARY SLIPS ════════════════════════

// Generate salary slip from payroll
router.post("/:payrollId/salary-slip", protect, authorize("superadmin"), generateSalarySlip);

// Get salary slip
router.get("/salary-slip/:id", protect, getSalarySlip);

// Get staff salary slips
router.get("/staff/:staffId/salary-slips", protect, getStaffSalarySlips);

export default router;
