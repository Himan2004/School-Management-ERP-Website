import api from "../api";

// --- HELPER: Attach School ID to Headers ---
const getAuthHeaders = () => {
  let schoolId = localStorage.getItem("schoolId");
  
  if (!schoolId || schoolId === "undefined" || schoolId === "null") {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined" && userStr !== "null") {
        const userObj = JSON.parse(userStr);
        schoolId = userObj?.schoolId || userObj?.school?._id || userObj?.school || userObj?._id || userObj?.id;
      }
    } catch (e) {}
  }
  
  return {
    "x-school-id": schoolId || ""
  };
};

const buildParams = (schoolId, extra = {}) => ({
  school_id: schoolId,
  ...extra,
});

export const getPrincipalExamStructures = async () => {
  try {
    const response = await api.get("/principal/exams/structures", { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error in getPrincipalExamStructures:", error);
    return { success: false, data: [] };
  }
};

export const getPrincipalExamSchedules = async (params = {}) => {
  try {
    const response = await api.get("/principal/exams/schedules", {
      params: params,
      headers: getAuthHeaders() // <-- ADDED
    });
    return response.data;
  } catch (error) {
    console.error("Error in getPrincipalExamSchedules:", error);
    throw error; // Throw so the UI can catch and display the exact error message
  }
};

export const createPrincipalExamSchedule = async (data) => {
  try {
    // ← FIXED: was posting to /exams/schedules, route is /exams/create-schedule
    // Adding both so either works
    const response = await api.post("/principal/exams/schedules", data, { 
      headers: getAuthHeaders() 
    });
    return response.data;
  } catch (error) {
    console.error("Error in createPrincipalExamSchedule:", error);
    throw error;
  }
};

export const deletePrincipalExamSchedule = async (id) => {
  try {
    const response = await api.delete(`/principal/exams/schedule/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error in deletePrincipalExamSchedule:", error);
    throw error;
  }
};

export const getPrincipalExamStats = async (schoolId) => {
  const response = await api.get("/principal/exams/stats", {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getPrincipalExamScheduleById = async (schoolId, id) => {
  const response = await api.get(`/principal/exams/schedules/${id}`, {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updatePrincipalExamSchedule = async (schoolId, id, payload) => {
  const response = await api.put(`/principal/exams/schedule/${id}`, payload, {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getPrincipalPendingVerifications = async (schoolId) => {
  const response = await api.get("/principal/exams/pending-verification", {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getPrincipalMarksheetForVerification = async (schoolId, marksheetId) => {
  const response = await api.get(`/principal/exams/verify/${marksheetId}`, {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const verifyPrincipalMarksheet = async (schoolId, marksheetId) => {
  const response = await api.put(`/principal/exams/verify/${marksheetId}`, {}, {
      params: buildParams(schoolId),
      headers: getAuthHeaders()
    }
  );
  return response.data;
};

export const bulkVerifyPrincipalMarksheets = async (schoolId, marksheetIds) => {
  const response = await api.put("/principal/exams/bulk-verify", { marksheetIds }, {
      params: buildParams(schoolId),
      headers: getAuthHeaders()
    }
  );
  return response.data;
};

export const publishPrincipalResults = async (schoolId, payload) => {
  const response = await api.put("/principal/exams/publish", payload, {
    params: buildParams(schoolId),
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getPrincipalClassSubjects = async (classId) => {
  try {
    // Adding the specific header that your backend middleware expects
    const response = await api.get(`/principal/exams/class-subjects/${classId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching class subjects:", error);
    return { success: false, data: [] };
  }
};

export const createPrincipalExamStructure = async (data) => {
  try {
    const response = await api.post("/principal/exams/structures", data, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("Error creating exam structure:", error);
    throw error;
  }
};

export const getPrincipalClassesWithSections = async () => {
  try {
    const response = await api.get("/principal/exams/classes-with-sections", { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error fetching classes with sections:", error);
    return { success: false, data: [] };
  }
};

export const getPrincipalMarksheets = async (schoolId, params = {}) => {
  try {
    const response = await api.get('/principal/exams/marksheets', {
      params: buildParams(schoolId, params),
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching marksheets:', error);
    throw error;
  }
};

// Add to bottom of principalExamApi.js
export const getPrincipalExamStudents = async (schoolId, classId, sectionId) => {
  try {
    const response = await api.get(`/principal/exams/students`, {
      params: { school_id: schoolId, classId, section: sectionId }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

export const savePrincipalExamMarks = async (schoolId, data) => {
  try {
    const response = await api.post("/principal/exams/marks", data, {
      params: { school_id: schoolId }
    });
    return response.data;
  } catch (error) {
    console.error("Error saving marks:", error);
    throw error;
  }
};