import api from './api';

// Get all staff leave requests
export const fetchStaffLeaves = async (params = {}) => {
  const response = await api.get('/admin/leave/staff', { params });
  return response.data;
};

// Get single staff leave details
export const fetchStaffLeaveById = async (id) => {
  const response = await api.get(`/admin/leave/staff/${id}`);
  return response.data;
};

// Update staff leave status
export const updateStaffLeaveStatus = async (id, { status, rejectionReason }) => {
  const response = await api.put(`/admin/leave/staff/${id}/status`, { status, rejectionReason });
  return response.data;
};

// Cancel staff leave
export const cancelStaffLeave = async (id) => {
  const response = await api.put(`/admin/leave/staff/${id}/cancel`);
  return response.data;
};

// Get staff leave summary/balance
export const fetchStaffLeaveSummary = async (staffId) => {
  const response = await api.get(`/admin/leave/staff/balance/${staffId}`);
  return response.data;
};

// Get all student leave requests
export const fetchStudentLeaves = async (params = {}) => {
  const response = await api.get('/admin/leave/student', { params });
  return response.data;
};

// Update student leave status
export const updateStudentLeaveStatus = async (id, { status, rejectionReason }) => {
  const response = await api.put(`/admin/leave/student/${id}/status`, { status, rejectionReason });
  return response.data;
};

// Get leave statistics
export const fetchLeaveStats = async () => {
  const response = await api.get('/admin/leave/stats');
  return response.data;
};

// Perform bulk leave actions
export const bulkLeaveAction = async (leaveIds, action) => {
  const response = await api.post('/admin/leave/bulk-action', { leaveIds, action });
  return response.data;
};

// Export leave data
export const exportLeaveData = async (params = {}) => {
  const response = await api.get('/admin/leave/export', { 
    params,
    responseType: 'blob'
  });
  return response.data;
};
