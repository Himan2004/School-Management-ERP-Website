import express from "express";
const router = express.Router();

import {
  getOrganizationRequests,
  getOrganizationRequestById,
  getOrganizationRequestStats,
  acceptOrganizationRequest,
  rejectOrganizationRequest,
  getPlatformAnalytics,
  getOrganizationsList,
  getOrganizationById,
  updateOrganizationDetails,
  updateOrganizationStatus,
  getAllSuperAdmins as getAllUsers,
  getGraphuraNotifications,
  markNotificationRead,
  deleteNotification,
  getAllSubscriptions,
  updateSubscription,
  getOrganizationPayments,
  updateOrganizationBillingAndQuotas,
  sendOrganizationNotification,
  verifyAdminPin,
  getAllExpenses,
  createGraphuraExpense,
  updatePaymentLogRemark,
  getGraphuraEscalations,
  resolveGraphuraEscalation,
  getAllSupportTickets,
  getSupportTicketById,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateUserStatus,
} from "../../controllers/graphura/graphuraController.js";
import {
  getSupportTickets,
  createSupportTicket,
  addTicketMessage,
  getSupportFAQs,
  submitFaqFeedback,
  getSupportVideos,
  getSupportResources,
} from "../../controllers/graphura/supportController.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../../controllers/graphura/systemSettingsController.js";
import { exportDatabaseBackup } from "../../controllers/graphura/backupController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { checkIpWhitelist } from "../../middleware/ipWhitelistMiddleware.js";

router.use(protect, authorize("graphura_admin"), checkIpWhitelist);

router.get("/organization-requests/stats", getOrganizationRequestStats);
router.get("/organization-requests", getOrganizationRequests);
router.get("/organization-requests/:id", getOrganizationRequestById);
router.patch(
  "/organization-requests/:requestId/accept",
  acceptOrganizationRequest,
);
router.patch(
  "/organization-requests/:requestId/reject",
  rejectOrganizationRequest,
);

// ─── Platform Management ──────────────────────────────────────────────────────

router.get("/analytics", getPlatformAnalytics);
router.get("/expenses", getAllExpenses);
router.post("/expenses", createGraphuraExpense);
router.get("/organizations", getOrganizationsList);
router.get("/organizations/:id", getOrganizationById);
router.patch("/organizations/:id", updateOrganizationDetails);
router.patch("/organizations/:id/status", updateOrganizationStatus);

// Route for Sales team to update billing renewals and custom quotas
router.patch(
  "/organizations/:id/billing-and-quotas",
  updateOrganizationBillingAndQuotas,
);
router.post("/verify-pin", verifyAdminPin);
router.get("/organizations/:id/payments", getOrganizationPayments);

router.put("/payment-logs/:logId/remark", updatePaymentLogRemark);
// Add this right next to your billing-and-quotas route
router.post(
  "/organizations/:id/send-notification",
  sendOrganizationNotification,
);

router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);

router.get("/notifications", getGraphuraNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.delete("/notifications/:id", deleteNotification);

// Legacy subscription routes (Optional: you might replace these with the new billing logic eventually)
router.get("/subscriptions", getAllSubscriptions);
router.patch("/subscriptions/:id", updateSubscription);

// ─── Support Management ──────────────────────────────────────────────────────

router.get("/support/tickets", getSupportTickets);
router.post("/support/tickets", createSupportTicket);
router.post("/support/tickets/:ticketId/messages", addTicketMessage);

router.get("/support/faqs", getSupportFAQs);
router.patch("/support/faqs/:faqId/feedback", submitFaqFeedback);

router.get("/support/videos", getSupportVideos);
router.get("/support/resources", getSupportResources);

// ─── Settings Management ──────────────────────────────────────────────────────

router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSettings);
router.post("/settings/backup", exportDatabaseBackup);

// GET all escalated tickets
router.get("/tickets/escalations", getGraphuraEscalations);

// PATCH to resolve an escalated ticket
router.patch(
  "/tickets/escalations/:ticketId/resolve",
  resolveGraphuraEscalation,
);

// ─── Super Admin Support Desk Routes ──────────────────────────────────────
router.get("/support-desk/tickets", getAllSupportTickets);
router.get("/support-desk/tickets/:id", getSupportTicketById);
router.post("/support-desk/tickets/:id/reply", replyToSupportTicket);
router.patch("/support-desk/tickets/:id/status", updateSupportTicketStatus);

export default router;
