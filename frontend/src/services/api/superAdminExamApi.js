import api from '../api';

/**
 * Super Admin Exam API Service
 */

// --- Dashboard & Analytics ---
export const getExamDashboardStats = async () => {
    try {
        const response = await api.get('/super-admin/exams/exams/stats');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch exam stats' };
    }
};

export const getOrganizationExams = async (params) => {
    try {
        const response = await api.get('/super-admin/exams/exams/all-schedules', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch organization exams' };
    }
};

export const getGlobalPerformanceAnalytics = async () => {
    try {
        const response = await api.get('/super-admin/exams/exams/analytics');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch performance analytics' };
    }
};

// --- Exam Structure (Templates) ---
export const getExamStructures = async (params) => {
    try {
        const response = await api.get('/super-admin/exams/exams/structures', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch exam structures' };
    }
};

export const getExamStructureById = async (id) => {
    try {
        const response = await api.get(`/super-admin/exams/exams/structures/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch structure details' };
    }
};

export const createExamStructure = async (data) => {
    try {
        const response = await api.post('/super-admin/exams/exams/structures', data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to create exam structure' };
    }
};

export const updateExamStructure = async (id, data) => {
    try {
        const response = await api.put(`/super-admin/exams/exams/structures/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update exam structure' };
    }
};

export const deleteExamStructure = async (id) => {
    try {
        const response = await api.delete(`/super-admin/exams/exams/structures/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to delete exam structure' };
    }
};

// --- Exam Schedule ---
export const getAllExamSchedules = async (params) => {
    try {
        const response = await api.get('/super-admin/exams/exams/schedules', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch exam schedules' };
    }
};

export const createExamSchedule = async (data) => {
    try {
        const response = await api.post('/super-admin/exams/exams/schedules', data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to create exam schedule' };
    }
};

export const updateExamSchedule = async (id, data) => {
    try {
        const response = await api.put(`/super-admin/exams/exams/schedules/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update exam schedule' };
    }
};

export const deleteExamSchedule = async (id) => {
    try {
        const response = await api.delete(`/super-admin/exams/exams/schedules/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to delete exam schedule' };
    }
};

export const updateExamScheduleStatus = async (id, status) => {
    try {
        const response = await api.patch(`/super-admin/exams/exams/schedules/${id}/status`, { status });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update schedule status' };
    }
};

export const getScheduleMarksheets = async (id) => {
    try {
        const response = await api.get(`/super-admin/exams/exams/schedules/${id}/marksheets`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch schedule marksheets' };
    }
};

export const updateMarksheetsStatus = async (marksheetIds, status) => {
    try {
        const response = await api.put('/super-admin/exams/exams/marksheets/status', { marksheetIds, status });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update marksheets status' };
    }
};
