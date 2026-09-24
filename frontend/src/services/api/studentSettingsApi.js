import api from '../api';

/**
 * Fetch all settings for the logged-in student
 */
export const getStudentSettings = async () => {
    try {
        const response = await api.get('/student/settings');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch settings' };
    }
};

/**
 * Update student settings (profile, notifications, privacy, appearance, security, language, downloads)
 * @param {Object} settingsData - partial or full settings object
 */
export const updateStudentSettings = async (settingsData) => {
    try {
        const response = await api.put('/student/settings', settingsData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update settings' };
    }
};

/**
 * Change password for the logged-in student
 * @param {Object} passwordData - { currentPassword, newPassword }
 */
export const changeStudentPassword = async (passwordData) => {
    try {
        const response = await api.put('/student/settings/password', passwordData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to change password' };
    }
};
