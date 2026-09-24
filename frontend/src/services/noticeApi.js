import api from './api';

// Get all notices
export const fetchNotices = async (params = {}) => {
  const response = await api.get('/admin/notice', { params });
  return response.data;
};

// Get single notice details
export const fetchNoticeById = async (id) => {
  const response = await api.get(`/admin/notice/${id}`);
  return response.data;
};

// Create new notice
export const createNotice = async (payload) => {
  const response = await api.post('/admin/notice', payload);
  return response.data;
};

// Update notice
export const updateNotice = async (id, payload) => {
  const response = await api.put(`/admin/notice/${id}`, payload);
  return response.data;
};

// Delete notice
export const deleteNotice = async (id) => {
  const response = await api.delete(`/admin/notice/${id}`);
  return response.data;
};

// Track notice view
export const trackNoticeView = async (id) => {
  const response = await api.post(`/admin/notice/${id}/view`);
  return response.data;
};

// Get notice statistics
export const fetchNoticeStats = async () => {
  const response = await api.get('/admin/notice/stats');
  return response.data;
};

// Bulk notice actions
export const bulkNoticeAction = async (noticeIds, action) => {
  const response = await api.post('/admin/notice/bulk-action', { noticeIds, action });
  return response.data;
};
