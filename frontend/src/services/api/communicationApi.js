import api from "../api";

const unwrap = (response) => response.data;

const getError = (error, fallbackMessage) => {
    const payload = error.response?.data;
    if (payload?.message) return payload;
    return { message: fallbackMessage };
};

export const getNoticesApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/communication/notices", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to fetch notices");
    }
};

export const createNoticeApi = async (payload) => {
    try {
        const response = await api.post("/superadmin/communication/notices", payload);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to create notice");
    }
};

export const deleteNoticeApi = async (id) => {
    try {
        const response = await api.delete(`/superadmin/communication/notices/${id}`);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to delete notice");
    }
};

export const getNoticeByIdApi = async (id) => {
    try {
        const response = await api.get(`/superadmin/communication/notices/${id}`);
        return response.data;
    } catch (error) {
        throw getError(error, "Failed to fetch notice details");
    }
};

export const getNoticeStatsApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/communication/notices/stats", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to fetch notice stats");
    }
};

export const getPoliciesApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/communication/policies", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to fetch policies");
    }
};

export const createPolicyApi = async (payload) => {
    try {
        const response = await api.post("/superadmin/communication/policies", payload);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to create policy");
    }
};

export const deletePolicyApi = async (id) => {
    try {
        const response = await api.delete(`/superadmin/communication/policies/${id}`);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to delete policy");
    }
};

export const getBranchesApi = async () => {
    try {
        const response = await api.get("/superadmin/events/schools");
        return response.data;
    } catch (error) {
        throw getError(error, "Failed to fetch branches");
    }
};

// export const getEmergencyAlertsApi = async (params = {}) => {
//     try {
//         const response = await api.get("/superadmin/communication/emergency/alerts", { params });
//         return unwrap(response);
//     } catch (error) {
//         throw getError(error, "Failed to fetch emergency alerts");
//     }
// };

// export const createEmergencyAlertApi = async (payload) => {
//     try {
//         const response = await api.post("/superadmin/communication/emergency/alerts", payload);
//         return unwrap(response);
//     } catch (error) {
//         throw getError(error, "Failed to create emergency alert");
//     }
// };

// export const resolveEmergencyAlertApi = async (id, payload = {}) => {
//     try {
//         const response = await api.put(`/superadmin/communication/emergency/alerts/${id}/resolve`, payload);
//         return unwrap(response);
//     } catch (error) {
//         throw getError(error, "Failed to resolve emergency alert");
//     }
// };

// export const deleteEmergencyAlertApi = async (id) => {
//     try {
//         const response = await api.delete(`/superadmin/communication/emergency/alerts/${id}`);
//         return unwrap(response);
//     } catch (error) {
//         throw getError(error, "Failed to delete emergency alert");
//     }
// };

// export const getEmergencyStatsApi = async (params = {}) => {
//     try {
//         const response = await api.get("/superadmin/communication/emergency/stats", { params });
//         return unwrap(response);
//     } catch (error) {
//         throw getError(error, "Failed to fetch emergency stats");
//     }
// };