import api from "./api";

export const getFinancialSummary = (schoolId, params) => api.get(`/accountant/reports/summary`, {
    params: { school_id: schoolId, ...params }
});
export const getMonthlyTrend = (schoolId, params) => api.get(`/accountant/reports/monthly-trend`, {
    params: { school_id: schoolId, ...params }
});
export const getPayrollSummary = (schoolId, params) => api.get(`/accountant/reports/payroll-summary`, {
    params: { school_id: schoolId, ...params }
});
export const getTopDues = (schoolId, params) => api.get(`/accountant/reports/top-dues`, {
    params: { school_id: schoolId, ...params }
});
export const getClassWiseDues = (schoolId, params) => api.get(`/accountant/reports/class-wise-dues`, {
    params: { school_id: schoolId, ...params }
});
export const exportFinancialReport = (schoolId, data) => api.post(`/accountant/reports/export`, {
    school_id: schoolId, ...data
});
