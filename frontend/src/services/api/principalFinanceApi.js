import api from "../api";

const buildParams = (schoolId, extra = {}) => ({
    school_id: schoolId,
    ...extra,
});

export const getPrincipalFeeStructures = async (schoolId, params = {}) => {
    const response = await api.get("/principal/fees/structure", {
        params: buildParams(schoolId, params),
    });
    return response.data;
};

export const createPrincipalFeeStructure = async (schoolId, payload) => {
    const response = await api.post("/principal/fees/structure", payload, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const updatePrincipalFeeStructure = async (schoolId, id, payload) => {
    const response = await api.put(`/principal/fees/structure/${id}`, payload, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const deletePrincipalFeeStructure = async (schoolId, id) => {
    const response = await api.delete(`/principal/fees/structure/${id}`, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const getPrincipalFeeCollections = async (schoolId, params = {}) => {
    const response = await api.get("/principal/fees/collection", {
        params: buildParams(schoolId, params),
    });
    return response.data;
};

export const collectPrincipalFeePayment = async (schoolId, payload) => {
    const response = await api.post("/principal/fees/collect", payload, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const getPrincipalFeePaymentHistory = async (schoolId, studentId) => {
    const response = await api.get(`/principal/fees/payment-history/${studentId}`, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const getPrincipalFeeDueReports = async (schoolId, params = {}) => {
    const response = await api.get("/principal/fees/due", {
        params: buildParams(schoolId, params),
    });
    return response.data;
};

export const sendPrincipalFeeReminder = async (schoolId, payload) => {
    const response = await api.post("/principal/fees/send-reminder", payload, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const sendPrincipalBulkReminder = async (schoolId, payload) => {
    const response = await api.post("/principal/fees/send-bulk-reminder", payload, {
        params: buildParams(schoolId),
    });
    return response.data;
};

export const getPrincipalTransactions = async (schoolId, params = {}) => {
    const response = await api.get("/principal/fees/transactions", {
        params: buildParams(schoolId, params),
    });
    return response.data;
};

export const getPrincipalFeeStatement = async (schoolId, studentId) => {
    const response = await api.get(`/principal/fees/statement/${studentId}`, {
        params: buildParams(schoolId),
    });
    return response.data;
};