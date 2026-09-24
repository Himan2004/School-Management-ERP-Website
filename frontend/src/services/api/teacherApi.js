import api from "../api";

export const getTeacherDashboardStatsApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/stats");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch dashboard stats" };
  }
};

export const getTeacherDashboardScheduleApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/schedule");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch schedule" };
  }
};

export const getTeacherDashboardAttendanceApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/attendance");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch attendance overview" };
  }
};

export const getTeacherDashboardActivitiesApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/activities");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch recent activities" };
  }
};

export const getTeacherWeeklyAttendanceApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/weekly-chart");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch weekly attendance" };
  }
};

export const getTeacherAttendanceClassesApi = async () => {
  try {
    const response = await api.get("/teacher/attendance/classes");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch attendance classes" };
  }
};

export const getTeacherAttendanceStudentsApi = async (params = {}) => {
  try {
    const response = await api.get("/teacher/attendance/students", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch attendance students" };
  }
};

export const markTeacherAttendanceApi = async (payload) => {
  try {
    const response = await api.post("/teacher/attendance/mark", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark attendance" };
  }
};

export const updateTeacherAttendanceApi = async (payload) => {
  try {
    const response = await api.put("/teacher/attendance/update", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update attendance" };
  }
};

export const getTeacherAttendanceStatsApi = async (params = {}) => {
  try {
    const response = await api.get("/teacher/attendance/stats", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch attendance stats" };
  }
};

export const getTeacherAttendanceReportApi = async (params = {}) => {
  try {
    const response = await api.get("/teacher/attendance/report", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch attendance report" };
  }
};

export const getTeacherClassesApi = async () => {
  try {
    const response = await api.get("/teacher/classes");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch classes" };
  }
};

export const getTeacherClassByIdApi = async (id) => {
  try {
    const response = await api.get(`/teacher/classes/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch class details" };
  }
};

export const getTeacherClassStatsApi = async (id) => {
  try {
    const response = await api.get(`/teacher/classes/${id}/stats`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch class stats" };
  }
};

export const getTeacherSubjectsApi = async () => {
  try {
    const response = await api.get("/teacher/classes/subjects");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch subjects" };
  }
};

export const getTeacherStudentsApi = async (params = {}) => {
  try {
    const response = await api.get("/teacher/students", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch students" };
  }
};

export const getTeacherStudentByIdApi = async (studentId) => {
  try {
    const response = await api.get(`/teacher/students/${studentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch student details" };
  }
};

export const getTeacherStudentStatsApi = async () => {
  try {
    const response = await api.get("/teacher/students/stats");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch student stats" };
  }
};

export const getTeacherStudentAttendanceApi = async (studentId, params = {}) => {
  try {
    const response = await api.get(`/teacher/students/${studentId}/attendance`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch student attendance" };
  }
};

export const getTeacherStudentPerformanceApi = async (studentId) => {
  try {
    const response = await api.get(`/teacher/students/${studentId}/performance`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch student performance" };
  }
};

export const getTeacherDashboardPerformanceApi = async () => {
  try {
    const response = await api.get("/teacher/dashboard/performance");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch performance metrics" };
  }
};

export const getTeacherNotificationsApi = async () => {
  try {
    const response = await api.get("/teacher/notifications");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch notifications" };
  }
};

export const markTeacherNotificationReadApi = async (id) => {
  try {
    const response = await api.patch(`/teacher/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark notification as read" };
  }
};

export const markAllTeacherNotificationsReadApi = async () => {
  try {
    const response = await api.post("/teacher/notifications/mark-all-read");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark all notifications as read" };
  }
};

export const getTeacherPtmClassesSectionsApi = async () => {
  try {
    const response = await api.get("/subject-teacher/ptms/classes-sections");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch classes and sections" };
  }
};
