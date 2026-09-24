import api from "../api";

export const getAllStudents = async (params) => {
    try {
        const response = await api.get('/admin/students', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getAllStudents:', error);
        return { success: false, data: [], message: error.message };
    }
};

export const getStudentById = async (id) => {
    try {
        const response = await api.get(`/admin/students/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error in getStudentById:', error);
        return { success: false, message: error.message };
    }
};

export const updateStudentProfile = async (id, data) => {
    try {
        const response = await api.put(`/admin/students/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error in updateStudentProfile:', error);
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

export const uploadStudentDocuments = async (studentId, files) => {
    try {
        const formData = new FormData();
        Object.entries(files).forEach(([docType, file]) => {
            if (file) formData.append(docType, file);
        });
        const response = await api.post(`/admin/students/${studentId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error in uploadStudentDocuments:', error);
        return { success: false, message: error.message };
    }
};
