import express from "express";
import {
  createWaiverPolicy,
  getAllWaiverPolicies,
  updateWaiverPolicy,
  deleteWaiverPolicy,
} from "../../controllers/superAdmin/feeWaiverController.js";

const router = express.Router();

// General routes for getting all and creating new policies
router.route("/").get(getAllWaiverPolicies).post(createWaiverPolicy);

// Specific routes for updating and deleting a policy by ID
router.route("/:id").put(updateWaiverPolicy).delete(deleteWaiverPolicy);

export default router;
