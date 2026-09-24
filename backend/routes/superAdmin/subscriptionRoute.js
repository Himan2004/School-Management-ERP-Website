import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getMySubscription,toggleAutoRenew,createUpgradeOrder,verifyUpgradeAndUpdatePlan } from "../../controllers/superAdmin/subscriptionController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin"));

router.get("/my-subscription", getMySubscription);
router.patch('/my-subscription/auto-renew', toggleAutoRenew);
router.post('/my-subscription/upgrade-order', createUpgradeOrder);
router.post('/my-subscription/verify-upgrade', verifyUpgradeAndUpdatePlan);

export default router;