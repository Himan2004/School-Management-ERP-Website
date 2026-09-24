import express from "express";
import {
    createFeeStructure,
    deleteFeeStructure,
    getFeeStructures,
    updateFeeStructure,
} from "../../controllers/superAdmin/feeStructureController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and restricted to superadmin
router.use(protect, authorize("superadmin"));

router.get("/fee-structures", getFeeStructures);
router.post("/fee-structures", createFeeStructure);
router.put("/fee-structures/:id", updateFeeStructure);
router.delete("/fee-structures/:id", deleteFeeStructure);

export default router;
