import api from "../api";

export const getEligibleStudents = async (params) => {
    try {
        const response = await api.get('/admin/students/promotion/eligible', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getEligibleStudents:', error);
        return { success: false, data: [], message: error.response?.data?.message || error.message };
    }
};

export const getPromotionStats = async () => {
    try {
        const response = await api.get('/admin/students/promotion/stats');
        return response.data;
    } catch (error) {
        console.error('Error in getPromotionStats:', error);
        return { success: false, data: {}, message: error.response?.data?.message || error.message };
    }
};

export const promoteSingleStudent = async (data) => {
    try {
        const response = await api.post('/admin/students/promotion/single', data);
        return response.data;
    } catch (error) {
        console.error('Error in promoteSingleStudent:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const promoteBulkStudents = async (data) => {
    try {
        const response = await api.post('/admin/students/promotion/bulk', data);
        return response.data;
    } catch (error) {
        console.error('Error in promoteBulkStudents:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const markPassOut = async (data) => {
    try {
        const response = await api.post('/admin/students/promotion/passout', data);
        return response.data;
    } catch (error) {
        console.error('Error in markPassOut:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const markDropout = async (data) => {
    try {
        const response = await api.post('/admin/students/promotion/dropout', data);
        return response.data;
    } catch (error) {
        console.error('Error in markDropout:', error);
        return { success: false, message: error.response?.data?.message || error.message };
    }
};

export const getPromotionHistory = async (params) => {
    try {
        const response = await api.get('/admin/students/promotion/history', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPromotionHistory:', error);
        return { success: false, data: [], message: error.response?.data?.message || error.message };
    }
};
