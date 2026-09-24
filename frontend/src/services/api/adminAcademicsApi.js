import api from "../api";

// Fetch all classes & sections for Admin
export const getAdminClassesSections = async (params = {}) => {
  try {
    const response = await api.get("/admin/academic/classes-sections", { params });
    return response.data;
  } catch (error) {
    console.error("Error in getAdminClassesSections:", error);
    return { success: false, data: [] };
  }
};

// Fetch teacher assignments for dropdown selection
export const getAdminTeacherAssignments = async (params = {}) => {
  try {
    const response = await api.get("/admin/academic/teacher-assignments", { params });
    return response.data;
  } catch (error) {
    console.error("Error in getAdminTeacherAssignments:", error);
    return { success: false, data: { teachers: [], assignments: [] } };
  }
};

// Create a new class (supports sending dynamic sections array)
export const createAdminClass = async (payload) => {
  const response = await api.post("/admin/academic/classes", payload);
  return response.data;
};

// Update an existing class profile
export const updateAdminClass = async (id, payload) => {
  const response = await api.put(`/admin/academic/classes/${id}`, payload);
  return response.data;
};

// Upsert a section inside a class
export const upsertAdminClassSection = async (payload) => {
  const response = await api.post("/admin/academic/classes-sections/upsert", payload);
  return response.data;
};

// Fetch all subjects for Admin
export const getAdminSubjects = async (params = {}) => {
  try {
    const response = await api.get("/admin/academic/subjects", { params });
    return response.data;
  } catch (error) {
    console.error("Error in getAdminSubjects:", error);
    return { success: false, data: [] };
  }
};

// Create a new subject
export const createAdminSubject = async (payload) => {
  const response = await api.post("/admin/academic/subjects", payload);
  return response.data;
};

// Update an existing subject
export const updateAdminSubject = async (id, payload) => {
  const response = await api.put(`/admin/academic/subjects/${id}`, payload);
  return response.data;
};

// Delete a subject
export const deleteAdminSubject = async (id) => {
  const response = await api.delete(`/admin/academic/subjects/${id}`);
  return response.data;
};

// Assign teacher to subject
export const createAdminTeacherAssignment = async (payload) => {
  const response = await api.post("/admin/academic/teacher-assignments", payload);
  return response.data;
};

// Remove teacher assignment
export const deleteAdminTeacherAssignment = async (id) => {
  const response = await api.delete(`/admin/academic/teacher-assignments/${id}`);
  return response.data;
};

// ==========================================
// LECTURE MODULE APIs
// ==========================================

export const getAdminLectures = async (params = {}) => {
  const response = await api.get("/admin/academic/lectures", { params });
  return response.data;
};

export const getAdminLectureById = async (id) => {
  const response = await api.get(`/admin/academic/lectures/${id}`);
  return response.data;
};

export const createAdminLecture = async (payload) => {
  const response = await api.post("/admin/academic/lectures", payload);
  return response.data;
};

export const updateAdminLecture = async (id, payload) => {
  const response = await api.put(`/admin/academic/lectures/${id}`, payload);
  return response.data;
};

export const deleteAdminLecture = async (id) => {
  const response = await api.delete(`/admin/academic/lectures/${id}`);
  return response.data;
};

export const getAdminLectureDashboard = async () => {
  const response = await api.get("/admin/academic/lectures/dashboard");
  return response.data;
};

export const getAdminLectureFilterData = async () => {
  const response = await api.get("/admin/academic/lectures/filter-data");
  return response.data;
};

// Admin Academic Config
export const getAdminAcademicConfig = async () => {
  const response = await api.get("/admin/academic/config");
  return response.data;
};

export const getAdminTimetableAcademicYears = async () => {
  const response = await api.get("/admin/timetable/academic-years");
  return response.data;
};

export const getAdminTimetables = async (params = {}) => {
  const response = await api.get("/admin/timetable", { params });
  return response.data;
};

export const getAdminPublishedTimetables = async () => {
  const response = await api.get("/admin/timetable/published");
  return response.data;
};

export const getAdminTimetableById = async (id) => {
  const response = await api.get(`/admin/timetable/${id}`);
  return response.data;
};

export const createAdminTimetable = async (payload) => {
  const response = await api.post("/admin/timetable", payload);
  return response.data;
};

export const updateAdminTimetable = async (id, payload) => {
  const response = await api.put(`/admin/timetable/${id}`, payload);
  return response.data;
};

export const toggleAdminTimetableStatus = async (id, isActive) => {
  const response = await api.put(`/admin/timetable/${id}/toggle-active`, { isActive });
  return response.data;
};

export const updateAdminTimetableAcademicYear = async (id, academicYear) => {
  const response = await api.patch(`/admin/timetable/${id}/academic-year`, { academicYear });
  return response.data;
};

export const deleteAdminTimetable = async (id) => {
  const response = await api.delete(`/admin/timetable/${id}`);
  return response.data;
};

export const deleteAdminTimetableTemplate = async (params = {}) => {
  const response = await api.delete("/admin/timetable/template", { params });
  return response.data;
};

export const copyAdminTimetable = async (payload) => {
  const response = await api.post("/admin/timetable/copy", payload);
  return response.data;
};

export const generateAdminTimetableDraft = async (params = {}) => {
  const response = await api.get("/admin/timetable/draft", { params });
  return response.data;
};

export const checkAdminTimetableConflicts = async (payload) => {
  const response = await api.post("/admin/timetable/check-conflicts", payload);
  return response.data;
};

export const getAdminTeacherTimetable = async (teacherId) => {
  const response = await api.get(`/admin/timetable/teacher/${teacherId}`);
  return response.data;
};

// Period Management APIs
export const getAdminPeriods = async () => {
  const response = await api.get("/admin/timetable/periods/all");
  return response.data;
};

export const createAdminPeriod = async (payload) => {
  const response = await api.post("/admin/timetable/periods", payload);
  return response.data;
};

export const updateAdminPeriod = async (id, payload) => {
  const response = await api.put(`/admin/timetable/periods/${id}`, payload);
  return response.data;
};

export const deleteAdminPeriod = async (id) => {
  const response = await api.delete(`/admin/timetable/periods/${id}`);
  return response.data;
};

export const reorderAdminPeriods = async (orders) => {
  const response = await api.post("/admin/timetable/periods/reorder", { orders });
  return response.data;
};

export const duplicateAdminPeriod = async (id) => {
  const response = await api.post(`/admin/timetable/periods/${id}/duplicate`);
  return response.data;
};

// School Academic Configurations CRUD
export const getSchoolAcademicConfigs = async () => {
  const response = await api.get("/admin/academic-configurations");
  return response.data;
};

export const createSchoolAcademicConfig = async (data) => {
  const response = await api.post("/admin/academic-configurations", data);
  return response.data;
};

export const updateSchoolAcademicConfig = async (id, data) => {
  const response = await api.put(`/admin/academic-configurations/${id}`, data);
  return response.data;
};

export const deleteSchoolAcademicConfig = async (id) => {
  const response = await api.delete(`/admin/academic-configurations/${id}`);
  return response.data;
};

export const getSchoolCurrentAcademicConfig = async () => {
  const response = await api.get("/admin/academic-configurations/current");
  return response.data;
};
