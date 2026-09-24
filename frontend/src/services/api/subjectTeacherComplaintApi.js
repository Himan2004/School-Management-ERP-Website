import api from "../api";

const BASE_URL = "/subject-teacher/complaints";

// Get dashboard stats
export const getComplaintDashboard = async () => {
  const response = await api.get(`${BASE_URL}/dashboard`);
  return response.data;
};

// Get list of students
export const getStudentsList = async () => {
  const response = await api.get(`${BASE_URL}/students`);
  return response.data;
};

// Get list of parents
export const getParentsList = async () => {
  const response = await api.get(`${BASE_URL}/parents`);
  return response.data;
};

// Get list of classes (displays className (sectionName))
export const getClassesList = async () => {
  const response = await api.get(`${BASE_URL}/classes`);
  return response.data;
};

// Get list of students filtered by classId and sectionId
export const getStudentsByClass = async (classId, sectionId) => {
  const response = await api.get(`${BASE_URL}/students-by-class`, {
    params: { classId, sectionId }
  });
  return response.data;
};

// Get complaints list
export const getComplaints = async (params = {}) => {
  const response = await api.get(`${BASE_URL}`, { params });
  return response.data;
};

// Raise complaint
export const createComplaint = async (data) => {
  const response = await api.post(`${BASE_URL}`, data);
  return response.data;
};

// Get complaint details
export const getComplaintDetails = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// Update complaint details
export const updateComplaint = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

// Update complaint status
export const updateComplaintStatus = async (complaintId, status, remarks = "") => {
  const response = await api.patch(`${BASE_URL}/status`, { complaintId, status, remarks });
  return response.data;
};

// Escalate complaint to admin
export const escalateComplaint = async (complaintId, reason) => {
  const response = await api.patch(`${BASE_URL}/escalate`, { complaintId, reason });
  return response.data;
};

// Reply to complaint
export const replyComplaint = async (complaintId, message, attachments = []) => {
  const response = await api.post(`${BASE_URL}/reply`, { complaintId, message, attachments });
  return response.data;
};
