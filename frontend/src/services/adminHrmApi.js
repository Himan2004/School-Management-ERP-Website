import api from "./api";

export const getSalaryDetails = () => api.get("/admin/hrm/salary-details").then(res => res.data);

export const getSalarySlips = () => api.get("/admin/hrm/salary-slips").then(res => res.data);

export const getAttendanceLogs = (params) => api.get("/admin/hrm/attendance/logs", { params }).then(res => res.data);

export const getAttendanceStats = (params) => api.get("/admin/hrm/attendance/stats", { params }).then(res => res.data);

export const getLeaveHistory = () => api.get("/admin/hrm/leaves").then(res => res.data);

export const applyLeave = (data) => api.post("/admin/hrm/leaves", data).then(res => res.data);

export const getLeaveBalance = () => api.get("/admin/hrm/leaves/balance").then(res => res.data);

export const getResignation = () => api.get("/admin/hrm/resignation").then(res => res.data);

export const applyResignation = (data) => api.post("/admin/hrm/resignation", data).then(res => res.data);

export const withdrawResignation = () => api.post("/admin/hrm/resignation/withdraw").then(res => res.data);
