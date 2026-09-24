import api from '../api';

/**
 * Fetches the health record of the student linked to the parent
 */
export const getStudentHealthApi = async () => {
    try {
        const studentId = localStorage.getItem("studentId");
        const config = studentId ? { params: { student_id: studentId } } : {};
        const response = await api.get('/parent/health', config);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch student health data" };
    }
};
