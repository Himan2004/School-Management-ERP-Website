import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getPrincipalPolicies,
  getPrincipalPolicyById,
} from "../../controllers/principal/policyApprovalsController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal", "admin"));

// GET /api/principal/settings/policies - list all policies for the school's org
router.get("/settings/policies", getPrincipalPolicies);

// GET /api/principal/settings/policies/:id - get a single policy
router.get("/settings/policies/:id", getPrincipalPolicyById);

export default router;
