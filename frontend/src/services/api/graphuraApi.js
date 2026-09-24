import api from "../api";

// ─── Organization Requests ────────────────────────────────────────────────────

export const fetchOrganizationRequests = (params = {}) =>
  api.get("/graphura/organization-requests", { params });

export const fetchOrganizationRequestById = (id) =>
  api.get(`/graphura/organization-requests/${id}`);

export const fetchOrganizationRequestStats = () =>
  api.get("/graphura/organization-requests/stats");

export const fetchPlatformAnalytics = (params = {}) =>
  api.get("/graphura/analytics", { params });

export const approveOrganizationRequest = (id, payload = {}) =>
  api.patch(`/graphura/organization-requests/${id}/accept`, payload);

export const rejectOrganizationRequest = (id, reason) =>
  api.patch(`/graphura/organization-requests/${id}/reject`, { reason });

// ─── Organizations List ───────────────────────────────────────────────────────

export const fetchAllOrganizations = (params = {}) =>
  api.get("/graphura/organizations", { params });

export const fetchOrganizationById = (id) =>
  api.get(`/graphura/organizations/${id}`);

export const updateOrganizationDetails = (id, data) =>
  api.patch(`/graphura/organizations/${id}`, data);

export const updateOrganizationStatus = (id, statusData) => {
  const status = typeof statusData === "string" ? statusData : statusData?.status;
  return api.patch(`/graphura/organizations/${id}/status`, { status });
};

// ─── Users List ───────────────────────────────────────────────────────────────

export const fetchAllUsers = (params = {}) =>
  api.get("/graphura/users", { params });

export const updateUserStatus = (id, status) =>
  api.patch(`/graphura/users/${id}/status`, { status });

// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchSystemNotifications = () =>
  api.get("/graphura/notifications");

export const markNotificationRead = (id) =>
  api.patch(`/graphura/notifications/${id}/read`);

export const deleteNotification = (id) =>
  api.delete(`/graphura/notifications/${id}`);

// ─── Subscriptions ────────────────────────────────────────────────────────────

// api/graphuraApi.js
export const updatePaymentLogRemark = (logId, data) =>
  api.put(`/graphura/payment-logs/${logId}/remark`, data);

export const fetchAllSubscriptions = async () => {
  try {
    const response = await api.get("/graphura/subscriptions");
    return response;
  } catch (error) {
    console.error("API Error [fetchAllSubscriptions]:", error);
    throw error; // Throw so the UI can catch it and show a Toast
  }
};

export const updateSubscription = (id, data) =>
  api.patch(`/graphura/subscriptions/${id}`, data);

export const updateOrganizationBillingAndQuotas = (id, data) =>
  api.patch(`/graphura/organizations/${id}/billing-and-quotas`, data);
// Add this under the Organizations List section
export const fetchOrganizationPayments = (id) =>
  api.get(`/graphura/organizations/${id}/payments`);
// Add this under your Organizations List section
export const sendOrganizationNotification = (id, data) =>
  api.post(`/graphura/organizations/${id}/send-notification`, data);

// Add this to your API exports
export const verifyAdminPin = (data) => api.post("/graphura/verify-pin", data);

// ─── Support ────────────────────────────────────────────────────────────

export const fetchSupportTickets = () => api.get("/graphura/support/tickets");

export const createSupportTicket = (data) =>
  api.post("/graphura/support/tickets", data);

export const addTicketMessage = (ticketId, data) =>
  api.post(`/graphura/support/tickets/${ticketId}/messages`, data);

export const fetchSupportFAQs = () => api.get("/graphura/support/faqs");

export const submitFAQFeedback = (faqId, data) =>
  api.patch(`/graphura/support/faqs/${faqId}/feedback`, data);

export const fetchSupportVideos = () => api.get("/graphura/support/videos");

export const fetchSupportResources = () =>
  api.get("/graphura/support/resources");

// ─── Settings ─────────────────────────────────────────────────────────────────

export const fetchSystemSettings = () => api.get("/graphura/settings");

export const updateSystemSettings = (data) =>
  api.patch("/graphura/settings", data);

export const exportDatabaseBackup = () =>
  api.post("/graphura/settings/backup", {}, { responseType: "blob" });

export const fetchAllExpenses = () => api.get("/graphura/expenses");

export const createExpense = (data) => api.post("/graphura/expenses", data);

// Add to your graphuraApi.js file

// ─── Escalations & Critical Tickets ──────────────────────────────────────────

export const fetchGraphuraEscalations = (params = {}) =>
  api.get("/graphura/tickets/escalations", { params });

export const resolveGraphuraEscalation = (ticketId, data) =>
  api.patch(`/graphura/tickets/escalations/${ticketId}/resolve`, data);


// ─── Super Admin Support Desk Routes ──────────────────────────────────────
export const getAllSupportTickets = async (params = {}) => {
  const response = await api.get("/graphura/support-desk/tickets", { params });
  return response.data; // Unwraps axios data { success, data: { tickets, stats } }
};

export const getSupportTicketById = async (id) => {
  const response = await api.get(`/graphura/support-desk/tickets/${id}`);
  return response.data;
};

export const replyToSupportTicket = async (id, message) => {
  const response = await api.post(`/graphura/support-desk/tickets/${id}/reply`, { message });
  return response.data;
};

export const updateSupportTicketStatus = async (id, status) => {
  const response = await api.patch(`/graphura/support-desk/tickets/${id}/status`, { status });
  return response.data;
};
