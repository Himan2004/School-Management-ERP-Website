import axios from 'axios';
import api from '../api';

export const studentApi = {


    // Get results
    getResults: async () => {
        try {
            const response = await api.get('/student/results');
            return response.data;
        } catch (error) {
            console.error('Error fetching results:', error);
            throw error;
        }
    },

    // Get subjects
    getSubjects: async () => {
        try {
            const response = await api.get('/student/performance/subjects');
            return response.data;
        } catch (error) {
            console.error('Error fetching subjects:', error);
            return { data: [] };
        }
    },

    getNotices: async () => {
        const response = await api.get('/student/notices');
        return response.data;
    },
  getDashboard: () => api.get('/student/dashboard').then(res => res.data),
  getAttendance: () => api.get('/student/attendance').then(res => res.data),
  getPerformance: () => api.get('/student/performance').then(res => res.data),
  getHomework: () => api.get('/student/homework').then(res => res.data),
  getExams: () => api.get('/student/exams').then(res => res.data),
  getBusTiming: () => api.get('/student/bus-timing').then(res => res.data),
  getAlerts: () => api.get('/student/alerts').then(res => res.data),
  getEvents: () => api.get('/student/events').then(res => res.data),
  registerForEvent: (eventId) => api.post(`/student/events/${eventId}/register`).then(res => res.data),
  unregisterFromEvent: (eventId) => api.delete(`/student/events/${eventId}/register`).then(res => res.data),
  getStudyMaterial: () => api.get('/student/study-material').then(res => res.data),
  trackStudyMaterialInteraction: (id, action) => api.patch(`/student/study-materials/${id}/interact`, { action }).then(res => res.data),
  getAchievements: () => api.get('/student/achievements').then(res => res.data),
  getRecommendations: () => api.get('/student/recommendations').then(res => res.data),
  getTimetable: () => api.get('/student/timetable').then(res => res.data),
  getMarksheet: () => api.get('/student/marksheet').then(res => res.data),
  getHealthCheckup: () => api.get('/student/health-checkup').then(res => res.data),
  applyForHealthCheckup: (data) => api.post('/student/health-checkup/apply', data).then(res => res.data),
  getIdCard: () => api.get('/student/id-card').then(res => res.data),
  getIdCardHistory: () => api.get('/student/id-card/history').then(res => res.data),
  downloadIdCard: (data) => api.post('/student/id-card/download', data, { responseType: 'blob' }).then(res => res.data),
  regenerateIdCard: () => api.post('/student/id-card/regenerate').then(res => res.data),
  reportLostIdCard: (data) => api.post('/student/id-card/report-lost', data).then(res => res.data),
  updateIdCardPreferences: (data) => api.put('/student/id-card/preferences', data).then(res => res.data),
  getAdmitCard: () => api.get('/student/admit-card').then(res => res.data),
  downloadAdmitCard: (data) => api.post('/student/admit-card/download', data, { responseType: 'blob' }).then(res => res.data),
  regenerateAdmitCard: () => api.post('/student/admit-card/regenerate').then(res => res.data),
  verifyAdmitCard: (data) => api.post('/student/admit-card/verify', data).then(res => res.data),
  getProfile: () => api.get('/student/profile').then(res => res.data),
  updateProfile: (profileData) => api.put('/student/settings', { profile: profileData }).then(res => res.data),
  // getSubjects: () => api.get('/student/performance/subjects').then(res => res.data),
  getLeaveHistory: () => api.get('/student/leave').then(res => res.data),
  getLeaveStats: () => api.get('/student/leave/stats').then(res => res.data),
  submitLeave: (data) => api.post('/student/leave', data).then(res => res.data),
  cancelLeave: (id) => api.patch(`/student/leave/${id}/cancel`).then(res => res.data),
  submitHomework: async (homeworkId, formData) => {
    const token = localStorage.getItem('token');
    // Build base URL without trailing /api
    const raw = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const base = raw.endsWith('/api') ? raw.slice(0, -4) : raw.replace(/\/$/, '');
    const url = `${base}/api/student/homework/${homeworkId}/submit`;

    // Use native fetch — it automatically sets multipart/form-data + boundary
    // when body is FormData and you do NOT set Content-Type manually
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // ⚠️ Do NOT set Content-Type here — browser sets it with boundary
      },
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data?.message || 'Failed to submit homework');
      err.response = { data };
      throw err;
    }
    return data;
  },
  // getResults: () => api.get('/student/results').then(res => res.data),
  getSupportTickets: () => api.get('/student/support-tickets').then(res => res.data),
  createSupportTicket: (data) => api.post('/student/support-tickets', data).then(res => res.data),
  addTicketMessage: (ticketId, data) => api.post(`/student/support-tickets/${ticketId}/messages`, data).then(res => res.data),
  getNotifications: () => api.get('/student/notifications').then(res => res.data),
  markNotificationRead: (id) => api.patch(`/student/notifications/${id}/read`).then(res => res.data),
  markAllNotificationsRead: () => api.post('/student/notifications/mark-all-read').then(res => res.data)
};
