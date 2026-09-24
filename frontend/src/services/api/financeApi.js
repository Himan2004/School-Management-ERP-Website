import api from "../api";

// Waiver Policies
export const getWaiverPolicies = (params) => api.get("/super-admin/finance/waiver-policies", { params });
export const createWaiverPolicy = (data) => api.post("/super-admin/finance/waiver-policies", data);
export const updateWaiverPolicy = (id, data) => api.put(`/super-admin/finance/waiver-policies/${id}`, data);
export const deleteWaiverPolicy = (id) => api.delete(`/super-admin/finance/waiver-policies/${id}`);
export const assignWaiverToStudent = (data) => api.post("/super-admin/finance/waiver-policies/assign", data);
// financeApi.js
export const getOrganizationStudents = () =>
    api.get("/super-admin/finance/students");
// Pending Dues
export const getPendingDues = (params) => api.get("/super-admin/finance/pending-dues", { params });
export const exportPendingDues = (params) =>
    api.get("/super-admin/finance/pending-dues/export", { params });

// Fee Structures - CRUD Operations
export const getFeeStructures = (params) => api.get("/super-admin/finance/fee-structures", { params });
export const getFeeStructureById = (id) => api.get(`/super-admin/finance/fee-structures/${id}`);
export const createFeeStructure = (data) => api.post("/super-admin/finance/fee-structures", data);
export const updateFeeStructure = (id, data) => api.put(`/super-admin/finance/fee-structures/${id}`, data);
export const deleteFeeStructure = (id) => api.delete(`/super-admin/finance/fee-structures/${id}`);

// Finance Analytics
export const getFinanceAnalytics = (params) => api.get("/super-admin/finance/analytics", { params });

// Fee Payments
export const getFeePayments = (params) => api.get("/super-admin/finance/fee-payments", { params });

// Fetch Fee Heads (Fee Types)
export const getFeeHeads = (params) => api.get("/super-admin/finance/fee-heads", { params });
export const createFeeHead = (data) => api.post("/super-admin/finance/fee-heads", data);

// Fetch Organization Classes
export const getOrganizationClasses = (organizationId, params) =>
    api.get(`/super-admin/finance/organization/${organizationId}/classes`, { params });

// Export Financial Report
export const exportFinancialReport = (payload) =>
    api.post('/superadmin/reports/export', {
        reportType: 'financial',
        format: 'Excel',
        ...payload,
    });