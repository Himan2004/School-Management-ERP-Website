import api from "../api";

export const getAdmissionRequests = async (params = {}) => {
  const response = await api.get('/principal/admission-requests', { params });
  return response.data;
};

export const getAdmissionRequestById = async (id) => {
  const response = await api.get(`/principal/admission-requests/${id}`);
  return response.data;
};

export const getAdmissionStatistics = async () => {
  const response = await api.get('/principal/admission-statistics');
  return response.data;
};

export const approveAdmissionRequest = async (id, remarks = '') => {
  const response = await api.put(`/principal/admission-requests/${id}/approve`, { remarks });
  return response.data;
};

export const rejectAdmissionRequest = async (id, reason) => {
  const response = await api.put(`/principal/admission-requests/${id}/reject`, { reason });
  return response.data;
};

export const bulkUpdateAdmissionStatus = async (ids, status, remarks = '') => {
  const response = await api.put('/principal/admission-requests/bulk-update', { ids, status, remarks });
  return response.data;
};

// Add this to your API service file
export const getDashboardOverviewStats = async () => {
  try {
    // Adjust the URL to match your backend routing
    const response = await api.get('/principal/dashboard-overview');
    return response.data;
  } catch (error) {
    return { success: false, data: null };
  }
};

// --- Principal Resignation Endpoints ---

export const fetchPrincipalResignations = async () => {
  const response = await api.get('/principal/resignations');
  return response.data;
};

export const approvePrincipalResignation = async (id, data = {}) => {
  const response = await api.post(`/principal/resignations/${id}/approve`, data);
  return response.data;
};

export const rejectPrincipalResignation = async (id, data) => {
  const response = await api.post(`/principal/resignations/${id}/reject`, data);
  return response.data;
};


// --- Principal Payroll Endpoints ---

export const fetchPrincipalPayroll = async (params = {}) => {
  const response = await api.get('/principal/payroll', { params });
  return response.data;
};

export const approvePrincipalPayroll = async (id, data = {}) => {
  const response = await api.post(`/principal/payroll/${id}/approve`, data);
  return response.data;
};

export const rejectPrincipalPayroll = async (id, data) => {
  const response = await api.post(`/principal/payroll/${id}/reject`, data);
  return response.data;
};

// --- Principal Staff Performance Endpoints ---

export const fetchPrincipalStaffPerformance = async (queryParams = "") => {
  const response = await api.get(`/principal/staff-performance${queryParams}`);
  return response.data;
};