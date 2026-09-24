import express from "express";
import {
    createPolicy,
    getAllPolicies,
    updatePolicy,
    deletePolicy,
    getPolicyStats
} from "../../controllers/admin/schoolPolicyController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// Stats
router.get("/stats", getPolicyStats);

// CRUD
router.post("/", createPolicy);
router.get("/", getAllPolicies);
router.put("/:id", updatePolicy);
router.delete("/:id", deletePolicy);

export default router;
