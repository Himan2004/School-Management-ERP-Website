import api from "../api";


export const getAllStudents = async (params) => {
    try {
        const response = await api.get('/principal/students/all', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getAllStudents:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const getClasses = async () => {
    try {
        const response = await api.get('/principal/students/classes');
        console.log(response)
        return response.data;
    } catch (error) {
        console.error('Error in getClasses:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const getStudentStats = async () => {
    try {
        const response = await api.get('/principal/students/stats');
        return response.data;
    } catch (error) {
        console.error('Error in getStudentStats:', error);
        return { success: false, data: {} };
    }
};

// --- PHASE 1: MAIN VIEWING ---

export const searchStudents = async (query) => {
  // This endpoint should look at both collections
  const response = await api.get('/principal/students/search', { params: { query } });
  return response.data;
};

export const getStudentsByMultiFilter = async (params = {}) => {
  const response = await api.get('/principal/students/search/filters', { params });
  return response.data;
};

export const getStudentsByClass = async (classId, sectionId = '') => {
  const response = await api.get(`/principal/students/class/${classId}`, { params: { sectionId } });
  return response.data;
};

export const getStudentProfile = async (id) => {
  const response = await api.get(`/principal/students/${id}`);
  return response.data;
};

// --- PHASE 2: STUDENT DETAILS ---

export const getStudentAttendance = async (id, params = {}) => {
  const response = await api.get(`/principal/students/${id}/attendance`, { params });
  return response.data;
};

export const getStudentPerformance = async (id) => {
  const response = await api.get(`/principal/students/${id}/performance`);
  return response.data;
};

export const getStudentDocuments = async (id) => {
  const response = await api.get(`/principal/students/${id}/documents`);
  return response.data;
};

export const getGuardianInfo = async (id) => {
  const response = await api.get(`/principal/students/${id}/guardian`);
  return response.data;
};

export const getEditHistory = async (id) => {
  const response = await api.get(`/principal/students/${id}/edit-history`);
  return response.data;
};

export const getPromotionHistory = async (id) => {
  const response = await api.get(`/principal/students/${id}/promotion-history`);
  return response.data;
};

export const getReportCards = async (id) => {
  const response = await api.get(`/principal/students/${id}/report-cards`);
  return response.data;
};

export const getCommunicationHistory = async (id) => {
  const response = await api.get(`/principal/students/${id}/communication`);
  return response.data;
};

// --- PHASE 3: ANALYTICS & REPORTS ---

export const getClassPerformance = async (params = {}) => {
  const response = await api.get('/principal/students/analytics/class-performance', { params });
  return response.data;
};

export const getLowPerformers = async (params = {}) => {
  const response = await api.get('/principal/students/analytics/low-performers', { params });
  return response.data;
};

export const getPromotionReadiness = async (params = {}) => {
  const response = await api.get('/principal/students/analytics/promotion-ready', { params });
  return response.data;
};

export const getLowAttendance = async (params = {}) => {
  const response = await api.get('/principal/students/analytics/low-attendance', { params });
  return response.data;
};

// --- PHASE 4: MANAGEMENT OPERATIONS ---

export const exportStudentList = async (params = {}) => {
  const response = await api.get('/principal/students/operations/export', {
    params,
    responseType: 'blob' // Important for file downloads
  });
  return response;
};

export const getTransferRequests = async () => {
  const response = await api.get('/principal/students/operations/transfer-requests');
  return response.data;
};

export const sendStudentNotice = async (data) => {
  const response = await api.post('/principal/students/operations/send-notice', data);
  return response.data;
};

// Fetch sections dynamically based on the selected Class ID
export const fetchSectionsForClass = (classId) => 
  api.get(`/principal/admissions-list/sections/${classId}`).then((r) => r.data);
