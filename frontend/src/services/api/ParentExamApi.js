
import api from "../api";
const ParentExamApi = {

    getLinkedStudents: async () => {
        const response = await api.get(`/parent/students`);
        return response.data;
    },

    getStudentSchedules: async (studentId) => {
        const response = await api.get(`/parent/exams/schedules/${studentId}`);
        return response.data;
    },

    getStudentResults: async (studentId) => {
        const response = await api.get(`/parent/exams/results/${studentId}`);
        return response.data;
    },

    getPerformanceTrend: async (studentId) => {
        const response = await api.get(`/parent/exams/performance-trend/${studentId}`);
        return response.data;
    },

    getSubjectAnalysis: async (studentId) => {
        const response = await api.get(`/parent/exams/subject-analysis/${studentId}`);
        return response.data;
    },
};

export default ParentExamApi;
