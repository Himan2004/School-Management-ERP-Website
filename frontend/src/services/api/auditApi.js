import api from "../api";

export const getAuditBranches = async ({ search = "", page = 1, limit = 50 } = {}) => {
    try {
        const response = await api.get("/superadmin/audit/branches", {
            params: { search, page, limit },
        });

        return response.data.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch audit branches" };
    }
};

export const getBranchAuditDetails = async (schoolId) => {
    try {
        const response = await api.get(`/superadmin/audit/branches/${schoolId}`);
        return response.data.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch branch audit details" };
    }
};

export const deactivateBranch = async (schoolId) => {
    try {
        const response = await api.delete(`/superadmin/audit/branches/${schoolId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to deactivate branch" };
    }
};

export const getAuditStats = async () => {
    try {
        const response = await api.get("/superadmin/audit/branches/stats");
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch audit stats" };
    }
};

export const getStudentChanges = async ({ search = "", page = 1, limit = 50 } = {}) => {
    try {
        const response = await api.get("/superadmin/audit/student-changes", {
            params: { search, page, limit },
        });

        return response.data.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch student changes" };
    }
};

export const deleteStudentChangeLog = async (logId) => {
    try {
        const response = await api.delete(`/superadmin/audit/student-changes/${logId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to delete student change log" };
    }
};

export const getStudentChangeStats = async () => {
    try {
        const response = await api.get("/superadmin/audit/student-changes/stats");
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch student change stats" };
    }
};

export const getFinancialAnomalies = async ({ search = "", severity = "All", page = 1, limit = 50 } = {}) => {
    try {
        const response = await api.get("/superadmin/audit/financial/anomalies", {
            params: { search, severity, page, limit },
        });

        return response.data.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch financial anomalies" };
    }
};

export const resolveFinancialAnomaly = async (anomalyId, resolutionNotes = "") => {
    try {
        const response = await api.post(`/superadmin/audit/financial/anomalies/${anomalyId}/resolve`, {
            resolutionNotes,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to resolve financial anomaly" };
    }
};

export const getFinancialAnomalyStats = async () => {
    try {
        const response = await api.get("/superadmin/audit/financial/anomalies/stats");
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: "Failed to fetch financial anomaly stats" };
    }
};