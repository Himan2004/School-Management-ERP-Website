import api from "./api";

export const getPayrollStaff = (schoolId, params) => api.get(`/accountant/payroll/staff`, {
    params: { school_id: schoolId, ...params }
});
export const processPayroll = (schoolId, data) => api.post(`/accountant/payroll/process?school_id=${schoolId}`, data);
export const updateSalarySlip = (id, data) => api.put(`/accountant/payroll/salary-slip/${id}`, data);
export const getSalarySlips = (schoolId, params) => api.get(`/accountant/payroll/salary-slips`, {
    params: { school_id: schoolId, ...params }
});
export const generateBankTransferReport = (schoolId, data) => api.post(`/accountant/payroll/bank-transfer-report`, {
    school_id: schoolId, ...data
});
