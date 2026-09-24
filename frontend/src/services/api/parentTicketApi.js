import api from '../api';

/**
 * Creates a new support ticket
 * @param {Object} ticketData - { title, description, category, priority }
 */
export const createTicketApi = async (ticketData) => {
    try {
        const response = await api.post('/parent/tickets', ticketData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to create ticket" };
    }
};

/**
 * Fetches all tickets raised by the logged-in parent
 * @param {Object} filters - { status, category }
 */
export const getTicketsApi = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.category) queryParams.append('category', filters.category);
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const response = await api.get(`/parent/tickets${queryString}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch tickets" };
    }
};

/**
 * Fetches full details and response thread for a specific ticket
 * @param {String} ticketId 
 */
export const getTicketDetailsApi = async (ticketId) => {
    try {
        const response = await api.get(`/parent/tickets/${ticketId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch ticket details" };
    }
};

/**
 * Adds a new response/message to an existing ticket
 * @param {String} ticketId 
 * @param {String} message 
 */
export const addTicketResponseApi = async (ticketId, message) => {
    try {
        const response = await api.post(`/parent/tickets/${ticketId}/responses`, { message });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to add response" };
    }
};

export const getClassTeacherApi = async (studentId) => {
    try {
        const response = await api.get(`/parent/teachers/class-teacher?studentId=${studentId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch class teacher details" };
    }
};

export const getSubjectTeachersApi = async (studentId) => {
    try {
        const response = await api.get(`/parent/teachers/subject-teachers?studentId=${studentId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch subject teachers details" };
    }
};

export const createComplaintApi = async (complaintData) => {
    try {
        const response = await api.post('/parent/complaints', complaintData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to create complaint" };
    }
};
