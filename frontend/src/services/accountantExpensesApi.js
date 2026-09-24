import api from "./api";

export const getExpenses = (schoolId, params) => api.get(`/accountant/expenses`, {
    params: { school_id: schoolId, ...params }
});
export const createExpense = (schoolId, data) => api.post(`/accountant/expenses?school_id=${schoolId}`, data);
export const updateExpense = (id, data) => api.put(`/accountant/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/accountant/expenses/${id}`);
export const getVendors = (schoolId) => api.get(`/accountant/expenses/vendors?school_id=${schoolId}`);
export const getRecurringExpenses = (schoolId) => api.get(`/accountant/expenses/recurring?school_id=${schoolId}`);
export const uploadInvoice = (data) => api.post(`/accountant/expenses/upload-invoice`, data);
