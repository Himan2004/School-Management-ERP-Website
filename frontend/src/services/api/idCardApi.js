import api from '../api';

const API_URL = '/principal/id-cards';

const idCardApi = {
    // Template Management
    getTemplates: async () => {
        const response = await api.get(`${API_URL}/templates`);
        return response.data;
    },
    createTemplate: async (templateData) => {
        const response = await api.post(`${API_URL}/templates`, templateData);
        return response.data;
    },
    updateTemplate: async (id, templateData) => {
        const response = await api.put(`${API_URL}/templates/${id}`, templateData);
        return response.data;
    },
    deleteTemplate: async (id) => {
        const response = await api.delete(`${API_URL}/templates/${id}`);
        return response.data;
    },
    cloneTemplate: async (id) => {
        const response = await api.post(`${API_URL}/templates/${id}/clone`);
        return response.data;
    },

    // Card Management
    generateCards: async (entityIds, entityType, templateId) => {
        const endpoint = `${API_URL}/generate`;
        const payload = { entityIds, entityType, templateId };
        const response = await api.post(endpoint, payload);
        return response.data;
    },
    updateCardStatus: async (recordIds, status, note) => {
        const response = await api.patch(`${API_URL}/status`, { recordIds, status, note });
        return response.data;
    },
    getCardStats: async () => {
        const response = await api.get(`${API_URL}/stats`);
        return response.data;
    },
    verifyCard: async (qrData) => {
        const response = await api.get(`${API_URL}/verify/${qrData}`);
        return response.data;
    }
};

export default idCardApi;
