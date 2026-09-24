import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    getPrincipalPayroll,
    approvePrincipalPayroll,
    rejectPrincipalPayroll
} from "../../controllers/principal/principalPayrollController.js";

const router = express.Router();

// Apply protection to all principal payroll routes
router.use(protect);
router.use(authorize("principal"));

// Get all payroll records for the principal's specific school
router.get("/", getPrincipalPayroll);

// Approve a payroll record
router.post("/:id/approve", approvePrincipalPayroll);

// Reject a payroll record
router.post("/:id/reject", rejectPrincipalPayroll);

export default router;