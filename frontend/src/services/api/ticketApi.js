import api from "../api";

export const getSuperAdminTickets = async (params = {}) => {
  try {
    const response = await api.get("/superadmin/tickets", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch tickets" };
  }
};

export const getSuperAdminTicketDetails = async (ticketId) => {
  try {
    const response = await api.get(`/superadmin/tickets/${ticketId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch ticket details" };
  }
};

export const updateSuperAdminTicketStatus = async (ticketId, status) => {
  try {
    const response = await api.patch(`/superadmin/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update ticket status" };
  }
};

export const resolveSuperAdminTicket = async (
  ticketId,
  resolutionNote = "",
) => {
  try {
    const response = await api.patch(
      `/superadmin/tickets/${ticketId}/resolve`,
      { resolutionNote },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to resolve ticket" };
  }
};

export const updateSuperAdminTicketPriority = async (ticketId, priority) => {
  try {
    const response = await api.patch(
      `/superadmin/tickets/${ticketId}/priority`,
      { priority },
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Failed to update ticket priority" }
    );
  }
};

// ✅ Updated to explicitly target super_admin
export const escalateSuperAdminTicket = async (
  ticketId,
  reason = "Escalated from priority panel",
) => {
  try {
    const response = await api.patch(
      `/superadmin/tickets/${ticketId}/escalate`,
      {
        reason,
        escalatedToRole: "super_admin",
      },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to escalate ticket" };
  }
};

export const replyToSuperAdminTicket = async (ticketId, message) => {
  try {
    // Make sure this route matches your backend controller for adding responses
    const response = await api.post(`/superadmin/tickets/${ticketId}/response`, {
      message,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send reply" };
  }
};