import api from '../api';

/**
 * Fetch dashboard stats (attendance, total students, pending tasks, PTM)
 */
export const getTeacherDashboardStats = async (timeRange = 'week') => {
  const response = await api.get(`/subject-teacher/dashboard/stats?timeRange=${timeRange}`);
  return response;
};

/**
 * Fetch weak students for the subject teacher's subjects
 */
export const getWeakStudents = async (timeRange = 'week') => {
  const response = await api.get(`/subject-teacher/dashboard/weak-students?timeRange=${timeRange}`);
  return response;
};

/**
 * Fetch recent activity log
 */
export const getRecentActivity = async (timeRange = 'week') => {
  const response = await api.get(`/subject-teacher/dashboard/activity?timeRange=${timeRange}`);
  return response;
};

/**
 * Fetch assigned tasks
 */
export const getTasks = async () => {
  const response = await api.get(`/subject-teacher/dashboard/tasks`);
  return response;
};

/**
 * Fetch notifications targeting the teacher
 */
export const getNotifications = async () => {
  const response = await api.get(`/subject-teacher/dashboard/notifications`);
  return response;
};

/**
 * Mark a single notification as read
 * @param {string} id - Notification ID
 */
export const markNotificationRead = async (id) => {
  const response = await api.put(`/subject-teacher/dashboard/notifications/${id}/read`);
  return response;
};

/**
 * Mark all notifications as read for the teacher
 */
export const markAllNotificationsRead = async () => {
  const response = await api.put(`/subject-teacher/dashboard/notifications/read-all`);
  return response;
};
