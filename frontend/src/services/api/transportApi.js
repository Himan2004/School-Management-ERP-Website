import api from '../api';

/**
 * Fetches driver and vehicle details for the parent's child.
 */
export const getDriverDetailsApi = async (params = {}) => {
    try {
        const response = await api.get('/parent/transport/driver', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch driver details" };
    }
};
