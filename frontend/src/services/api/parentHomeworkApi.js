import api from "../api";

export const parentHomeworkApi = {
    getStats: async (studentId, schoolId) => {
        try {
            const response = await api.get("/parent/homework/stats", {
                params: { student_id: studentId, school_id: schoolId }
            });
            return response.data;
        } catch (error) {
            console.error("Homework Stats Error:", error.response?.data || error.message);
            throw error;
        }
    },

    getList: async (studentId, schoolId, filters = {}) => {
        try {
            const params = { student_id: studentId, school_id: schoolId, ...filters };
            const response = await api.get("/parent/homework/list", { params });
            return response.data;
        } catch (error) {
            console.error("Homework List Error:", error.response?.data || error.message);
            throw error;
        }
    },

    getSyllabus: async (studentId, schoolId) => {
        try {
            const response = await api.get("/parent/homework/syllabus", {
                params: { student_id: studentId, school_id: schoolId }
            });
            return response.data;
        } catch (error) {
            console.error("Syllabus Error:", error.response?.data || error.message);
            throw error;
        }
    }
};