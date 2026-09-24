import api from "../api";

const BASE_URL = "/principal/tickets"; // Adjust to match your Express router path

export const getPrincipalTickets = async (params = {}) => {
  const response = await api.get(BASE_URL, { params });
  return response.data;
};

export const getPrincipalTicketDetails = async (ticketId) => {
  const response = await api.get(`${BASE_URL}/${ticketId}`);
  return response.data;
};

export const createPrincipalTicket = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

export const replyToPrincipalTicket = async (ticketId, message) => {
  const response = await api.post(`${BASE_URL}/${ticketId}/response`, { message });
  return response.data;
};

export const resolvePrincipalTicket = async (ticketId, resolutionNote = "") => {
  const response = await api.patch(`${BASE_URL}/${ticketId}/status`, { 
    status: "resolved", 
    resolutionNote 
  });
  return response.data;
};