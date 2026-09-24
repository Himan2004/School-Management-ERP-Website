import api from '../api';

export const getSubjectWiseAttendance = async (schoolId, params) => {
  return await api.get(`/subject-teacher/attendance`, { params });
};

export const markAttendance = async (schoolId, data) => {
  return await api.post(`/subject-teacher/attendance/mark`, data);
};

export const editAttendance = async (schoolId, data) => {
  return await api.put(`/subject-teacher/attendance/edit`, data);
};

export const applyLeave = async (schoolId, data) => {
  return await api.post(`/subject-teacher/attendance/leave`, data);
};

export const getLowAttendanceAlerts = async (schoolId) => {
  return await api.get(`/subject-teacher/attendance/low-alerts`);
};

export const getMyAttendance = async (schoolId, params) => {
  return await api.get(`/subject-teacher/attendance/my-attendance`, { params });
};

export const clockIn = async (schoolId, data) => {
  return await api.post(`/subject-teacher/attendance/my-attendance/clock-in`, data);
};

export const clockOut = async (schoolId, data) => {
  return await api.post(`/subject-teacher/attendance/my-attendance/clock-out`, data);
};

export const getMyLeaves = async (schoolId, params) => {
  return await api.get(`/subject-teacher/attendance/my-leaves`, { params });
};

export const applyMyLeave = async (schoolId, data) => {
  return await api.post(`/subject-teacher/attendance/my-leaves/apply`, data);
};
