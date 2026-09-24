import api from "../api";

const BASE_URL = "/tickets";

// Fetch tickets raised by the current user
export const getMyTickets = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/my-tickets`, { params });
  return response.data;
};

// Create a new ticket
export const createTicket = async (data) => {
  const response = await api.post(`${BASE_URL}/my-tickets`, data);
  return response.data;
};

// Fetch tickets assigned to the current user's role (Help Desk view)
export const getHelpDeskTickets = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/helpdesk`, { params });
  return response.data;
};

// Get details for any ticket they have access to
export const getTicketDetails = async (ticketId) => {
  const response = await api.get(`${BASE_URL}/${ticketId}`);
  return response.data;
};

// Universal action for adding a reply OR changing status
export const updateTicket = async (ticketId, actionData) => {
  // actionData can be { message: "Hello" } OR { status: "resolved", resolutionNote: "Done" }
  const response = await api.patch(`${BASE_URL}/${ticketId}/action`, actionData);
  return response.data;
};

export const escalateTicket = async (ticketId, escalationData) => {
  const response = await api.patch(`${BASE_URL}/${ticketId}/escalate`, escalationData);
  return response.data;
};

// Admin complaints operations
export const getAdminStaffList = async () => {
  const response = await api.get("/admin/staff");
  return response.data;
};

export const assignComplaint = async (complaintId, data) => {
  const response = await api.patch(`/admin/complaints/${complaintId}/assign`, data);
  return response.data;
};

export const closeComplaint = async (complaintId, data) => {
  const response = await api.patch(`/admin/complaints/${complaintId}/close`, data);
  return response.data;
};

export const returnBackComplaint = async (complaintId, data) => {
  const response = await api.patch(`/admin/complaints/${complaintId}/return-back`, data);
  return response.data;
};