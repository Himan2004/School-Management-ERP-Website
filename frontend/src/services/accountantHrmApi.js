import api from "./api";

export const getHRMDashboardStats = () => api.get('/accountant/hrm/dashboard');
export const toggleAttendance = () => api.post('/accountant/hrm/attendance/toggle');
export const applyLeaveRequest = (data) => api.post('/accountant/hrm/leave', data);
export const submitComplaint = (data) => api.post('/accountant/hrm/complaint', data);
