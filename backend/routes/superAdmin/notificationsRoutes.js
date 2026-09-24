import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  createGlobalAlert,
  deleteGlobalAlert,
  getAcademicAlerts,
  getComplianceAlerts,
  getGlobalAlerts,
} from "../../controllers/superAdmin/notificationsController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin"));

router.get("/notifications/global", getGlobalAlerts);
router.post("/notifications/global", createGlobalAlert);
router.delete("/notifications/global/:id", deleteGlobalAlert);
router.get("/notifications/academic", getAcademicAlerts);
router.get("/notifications/compliance", getComplianceAlerts);

export default router;
