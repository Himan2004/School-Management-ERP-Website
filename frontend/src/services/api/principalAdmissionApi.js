import api from '../api';

const BASE_URL = '/principal/admissions';

// Form Submission
export const submitAdmission = async (admissionData) => {
  const response = await api.post(BASE_URL, admissionData);
  return response.data;
};

export const getAllAdmissions = async (params) => {
  const response = await api.get(BASE_URL, { params });
  return response.data;
};

export const getAdmissionById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// Approval Workflow
export const approveAdmission = async (id, data) => {
  const response = await api.post(`${BASE_URL}/${id}/approve`, data);
  return response.data;
};

export const rejectAdmission = async (id, remarks) => {
  const response = await api.post(`${BASE_URL}/${id}/reject`, { remarks });
  return response.data;
};

export const markAdmissionInReview = async (id) => {
  const response = await api.post(`${BASE_URL}/${id}/review`);
  return response.data;
};

export const sendAdmissionEmail = async (id, subject, message) => {
  const response = await api.post(`${BASE_URL}/${id}/send-email`, { subject, message });
  return response.data;
};

// Analytics & Intelligence
export const getAvailableClasses = async () => {
  const response = await api.get(`${BASE_URL}/analytics/classes`);
  return response.data;
};

export const getAdmissionStats = async (params) => {
  const response = await api.get(`${BASE_URL}/analytics/stats`, { params });
  return response.data;
};

export const generateReferenceId = async () => {
  const response = await api.get(`${BASE_URL}/intelligence/generate-ref`);
  return response.data;
};

export const checkDuplicateContact = async (email, phone) => {
  const response = await api.post(`${BASE_URL}/intelligence/check-contact`, { email, phone });
  return response.data;
};

// Documents — send as FormData for Cloudinary processing
export const uploadAdmissionDocuments = async (admissionId, studentId, files) => {
  const formData = new FormData();
  formData.append('studentId', studentId);

  // files is an object: { aadhar: File, birthCertificate: File, ... }
  Object.entries(files).forEach(([docType, file]) => {
    if (file) formData.append(docType, file);
  });

  const response = await api.post(`${BASE_URL}/${admissionId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const verifyDocument = async (id, docType, studentId, status, remarks) => {
  const response = await api.put(`${BASE_URL}/${id}/documents/${docType}/verify`, { studentId, status, remarks });
  return response.data;
};

export const cancelAdmission = async (studentId, cancellationData) => {
  const response = await api.post(`${BASE_URL}/${studentId}/cancel`, cancellationData);
  return response.data;
};

export const transferStudent = async (studentId, transferData) => {
  const response = await api.post(`${BASE_URL}/${studentId}/transfer`, transferData);
  return response.data;
};

export const getTCData = async (studentId) => {
  const response = await api.get(`${BASE_URL}/${studentId}/tc`);
  return response.data;
};

export const getAllTransferRequests = async () => {
  const response = await api.get(`${BASE_URL}/transfer-requests`);
  return response.data;
};

export const getAllTCs = async () => {
  const response = await api.get(`${BASE_URL}/all-tcs`);
  return response.data;
};
