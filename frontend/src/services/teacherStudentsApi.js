// src/services/teacherStudentsApi.js
import api from './api.js';

// Get student statistics (total, active, low attendance, etc.)
export const getStudentStats = async () => {
  const response = await api.get('/teacher/students/stats');
  return response.data;
};

// Get all students with optional filters (class, section, search, sortBy, status)
export const getStudents = async (filters = {}) => {
  const response = await api.get('/teacher/students', { params: filters });
  return response.data;
};

// Get student by ID with detailed information
export const getStudentById = async (studentId) => {
  const response = await api.get(`/teacher/students/${studentId}`);
  return response.data;
};

// Get student attendance data
export const getStudentAttendance = async (studentId) => {
  const response = await api.get(`/teacher/students/${studentId}/attendance`);
  return response.data;
};

// Get student performance data
export const getStudentPerformance = async (studentId) => {
  const response = await api.get(`/teacher/students/${studentId}/performance`);
  return response.data;
};

// Get teacher attendance classes
export const getTeacherAttendanceClasses = async () => {
  const response = await api.get('/teacher/attendance/classes');
  return response.data;
};

// Get students for attendance marking
export const getTeacherAttendanceStudents = async (params = {}) => {
  const response = await api.get('/teacher/attendance/students', { params });
  return response.data;
};

// Mark class attendance
export const markTeacherAttendance = async (payload) => {
  const response = await api.post('/teacher/attendance/mark', payload);
  return response.data;
};

// Update class attendance
export const updateTeacherAttendance = async (payload) => {
  const response = await api.put('/teacher/attendance/update', payload);
  return response.data;
};

// Get attendance stats
export const getTeacherAttendanceStats = async (params = {}) => {
  const response = await api.get('/teacher/attendance/stats', { params });
  return response.data;
};

// Get attendance report
export const getTeacherAttendanceReport = async (params = {}) => {
  const response = await api.get('/teacher/attendance/report', { params });
  return response.data;
};

// Get student leave requests for teacher
export const getTeacherLeaveRequests = async (params = {}) => {
  const response = await api.get('/teacher/leave', { params });
  return response.data;
};

// Update student leave status
export const updateTeacherLeaveRequest = async (id, payload) => {
  const response = await api.patch(`/teacher/leave/${id}`, payload);
  return response.data;
};

// Get term results for teacher classes
export const getTeacherResults = async (params = {}) => {
  const response = await api.get('/teacher/results', { params });
  return response.data;
};

// Get student marksheets for teacher classes
export const getTeacherStudentMarksheets = async (params = {}) => {
  const response = await api.get('/teacher/results/marksheets', { params });
  return response.data;
};

// Get teacher dashboard performance metrics
export const getTeacherDashboardPerformance = async () => {
  const response = await api.get('/teacher/dashboard/performance');
  return response.data;
};

// Get behaviour logs
export const getStudentBehaviourLogs = async () => {
  const response = await api.get('/teacher/students/behaviour');
  return response.data;
};

// Create behaviour log
export const createStudentBehaviourLog = async (payload) => {
  const response = await api.post('/teacher/students/behaviour', payload);
  return response.data;
};

// Get communication outbox logs
export const getCommunicationLogs = async () => {
  const response = await api.get('/teacher/students/communication');
  return response.data;
};

// Send message to parent
export const sendParentMessage = async (payload) => {
  const response = await api.post('/teacher/students/communication/message', payload);
  return response.data;
};

// Schedule PTM meeting
export const scheduleParentMeeting = async (payload) => {
  const response = await api.post('/teacher/students/communication/meeting', payload);
  return response.data;
};

// Get student documents list
export const getStudentDocuments = async () => {
  const response = await api.get('/teacher/students/documents');
  return response.data;
};

// Upload student document (multipart/form-data)
export const uploadStudentDocument = async (formData) => {
  const response = await api.post('/teacher/students/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Get teacher system notifications/alerts
export const getTeacherNotifications = async () => {
  const response = await api.get('/teacher/notifications');
  return response.data;
};
