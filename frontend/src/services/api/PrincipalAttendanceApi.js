import api from "../api";

export const getStudentAttendanceReports = async (params = {}) => {
    const response = await api.get("/principal/attendance/student-reports", { params });
    return response.data;
};

export const getStudentCalendar = async (params = {}) => {
    const response = await api.get("/principal/attendance/student-calendar", { params });
    return response.data;
};

export const getStaffAttendanceReports = async (params = {}) => {
    const response = await api.get("/principal/attendance/staff-reports", { params });
    return response.data;
};

export const getStaffAttendance = async (params = {}) => {
    const response = await api.get("/principal/attendance/staff-attendance", { params });
    return response.data;
};

export const markStaffAttendance = async (params = {}, payload = {}) => {
    const response = await api.post("/principal/attendance/mark-staff", payload, { params });
    return response.data;
};

export const getAvailableClassesList = async () => {
    const response = await api.get("/principal/admissions/analytics/classes");
    return response.data;
};


export const getAdminLeaves = async () => {
    const response = await api.get("/principal/attendance/admin-leaves");
    return response.data;
};

export const approveAdminLeave = async (id) => {
    const response = await api.post(`/principal/attendance/admin-leaves/${id}/approve`);
    return response.data;
};

export const rejectAdminLeave = async (id, rejectionReason) => {
    const response = await api.post(`/principal/attendance/admin-leaves/${id}/reject`, { rejectionReason });
    return response.data;
};

export const getOtherStaffAttendance = async (params = {}) => {
    const response = await api.get("/principal/attendance/other-staff-attendance", { params });
    return response.data;
};

export const getStudentReportsApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/students", { params });
    return response.data;
};

export const getStudentReportsStatsApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/students/stats", { params });
    return response.data;
};

export const exportStudentAttendanceApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/students/export", {
        params,
        responseType: 'blob'
    });
    return response.data;
};

export const getStaffReportsApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/staff", { params });
    return response.data;
};

export const getStaffReportsStatsApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/staff/stats", { params });
    return response.data;
};

export const exportStaffAttendanceApi = async (params = {}) => {
    const response = await api.get("/principal/attendance-reports/staff/export", {
        params,
        responseType: 'blob'
    });
    return response.data;
};

export const getStudentAttendance = async( params ={}) => {
    const response = await api.get("/principal/attendance/", {
        params, 
    });
    return response.data
}

export const getStudentAttendanceDetails = async( params ={}) => {
    const response = await api.get("/principal/attendance/", {
        params, 
    });
    return response.data
}