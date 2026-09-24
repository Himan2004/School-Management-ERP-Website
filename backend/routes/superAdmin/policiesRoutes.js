import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
// 🔥 CHANGED: Import memoryUpload alongside the default upload engine
import upload, { memoryUpload } from "../../middleware/upload.js";
import {
  uploadPolicy,
  getPolicies,
  updatePolicyStatus,
  deletePolicy,
  getPolicy,
  getDashboardData,
  getAuditLogs,
  getGovernanceTickets,
  resolveGovernanceTicket,
  testPolicyPdf,
  viewPolicyProxy,
} from "../../controllers/superAdmin/policiesController.js";

const router = express.Router();

// Allow query parameter token validation inside the controller
router.get("/policies/:id/view", viewPolicyProxy);

router.use(protect);
router.use(authorize("superadmin"));

router.get("/policies/dashboard", getDashboardData);
router.get("/policies/tickets", getGovernanceTickets);
router.post("/policies/tickets/:id/resolve", resolveGovernanceTicket);
router.get("/policies/audit-logs", getAuditLogs);
router.get("/policies/test-policy-pdf/:id", testPolicyPdf);
router.get("/policies", getPolicies);

// 🔥 CHANGED: Swapped upload.single with memoryUpload.single so req.file.buffer is populated
router.post("/policies", memoryUpload.single("pdfFile"), uploadPolicy);

router.get("/policies/:id", getPolicy);
router.patch("/policies/:id/status", updatePolicyStatus);
router.delete("/policies/:id", deletePolicy);

export default router;