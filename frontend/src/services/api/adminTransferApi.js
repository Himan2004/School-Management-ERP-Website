import api from "../api";

export const getEligibleStudents = async (params) => {
    try {
        const response = await api.get('/admin/transfers/eligible-students', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getEligibleStudents:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const getPendingRequests = async (params) => {
    try {
        const response = await api.get('/admin/transfers/pending-requests', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPendingRequests:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const getTransferHistory = async (params) => {
    try {
        const response = await api.get('/admin/transfers/history', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getTransferHistory:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const generateTC = async (data) => {
    try {
        const response = await api.post('/admin/transfers/generate-tc', data);
        return response.data;
    } catch (error) {
        console.error('Error in generateTC:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const approveRequest = async (id, data) => {
    try {
        const response = await api.post(`/admin/transfers/requests/${id}/approve`, data);
        return response.data;
    } catch (error) {
        console.error('Error in approveRequest:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const rejectRequest = async (id, data) => {
    try {
        const response = await api.post(`/admin/transfers/requests/${id}/reject`, data);
        return response.data;
    } catch (error) {
        console.error('Error in rejectRequest:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const transferStudent = async (data) => {
    try {
        const response = await api.post('/admin/transfers/student', data);
        return response.data;
    } catch (error) {
        console.error('Error in transferStudent:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const getTransferDetails = async (id) => {
    try {
        const response = await api.get(`/admin/transfers/details/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error in getTransferDetails:', error);
        return { success: false, message: error.message };
    }
};

export const getTransferStats = async () => {
    try {
        const response = await api.get('/admin/transfers/stats');
        return response.data;
    } catch (error) {
        console.error('Error in getTransferStats:', error);
        return { success: false, message: error.message };
    }
};

export const getAvailableSchools = async () => {
    try {
        const response = await api.get('/admin/transfers/available-schools');
        return response.data;
    } catch (error) {
        console.error('Error in getAvailableSchools:', error);
        return { success: false, message: error.message };
    }
};

export const getClassesAndSections = async () => {
    try {
        const response = await api.get('/admin/academic/classes-sections');
        return response.data;
    } catch (error) {
        console.error('Error in getClassesAndSections:', error);
        return { success: false, data: [], message: error.message };
    }
};
