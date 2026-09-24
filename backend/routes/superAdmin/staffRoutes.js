import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  searchStaff,
  getStaffStats,
  getStaffBenchmarking
} from "../../controllers/superAdmin/staffController.js";

const router = express.Router();

// Get staff benchmarking statistics
router.get("/benchmarking", protect, authorize("superadmin"), getStaffBenchmarking);

// Get all staff members
router.get("/", protect, authorize("superadmin"), getAllStaff);

// Search staff
router.get("/search", protect, authorize("superadmin"), searchStaff);

// Get staff statistics
router.get("/stats", protect, authorize("superadmin"), getStaffStats);

// Get single staff member
router.get("/:id", protect, authorize("superadmin"), getStaffById);

// Create new staff member
router.post("/", protect, authorize("superadmin"), createStaff);

// Update staff member
router.patch("/:id", protect, authorize("superadmin"), updateStaff);

// Delete staff member (soft delete)
router.delete("/:id", protect, authorize("superadmin"), deleteStaff);

export default router;
