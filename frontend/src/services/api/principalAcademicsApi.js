import api from "../api";


// Classes & Sections
export const getPrincipalClassesSections = async (params = {}) => {
    try {
        const response = await api.get('/principal/academics/classes-sections', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPrincipalClassesSections:', error);
        return { success: false, data: [] };
    }
};

// Subjects
export const getPrincipalSubjects = async (params = {}) => {
    try {
        const response = await api.get('/principal/academics/subjects', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPrincipalSubjects:', error);
        return { success: false, data: [] };
    }
};

// Teacher Assignments
export const getPrincipalTeacherAssignments = async (params = {}) => {
    try {
        const response = await api.get('/principal/academics/teacher-assignments', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPrincipalTeacherAssignments:', error);
        return { success: false, data: { teachers: [], assignments: [] } };
    }
};

// Timetable
export const getPrincipalTimetables = async (params = {}) => {
    try {
        const response = await api.get('/principal/academics/timetables', { params });
        return response.data;
    } catch (error) {
        console.error('Error in getPrincipalTimetables:', error);
        return { success: false, data: [] };
    }
};

export const createPrincipalTimetable = async (data) => {
    try {
        const response = await api.post('/principal/academics/timetables', data);
        return response.data;
    } catch (error) {
        console.error('Error in createPrincipalTimetable:', error);
        throw error;
    }
};

export const updatePrincipalTimetable = async (id, data) => {
    try {
        const response = await api.put(`/principal/academics/timetables/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error in updatePrincipalTimetable:', error);
        throw error;
    }
};

export const deletePrincipalTimetable = async (id) => {
    try {
        const response = await api.delete(`/principal/academics/timetables/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error in deletePrincipalTimetable:', error);
        throw error;
    }
};



// ADDED: Create a new class
export const createPrincipalClass = async (payload) => {
  const response = await api.post("/principal/academics/classes", payload);
  return response.data;
};

// Add this with your other class functions
export const updatePrincipalClass = async (id, payload) => {
  const response = await api.put(`/principal/academics/classes/${id}`, payload);
  return response.data;
};
// ADDED: Upsert a section 
export const upsertPrincipalClassSection = async (payload) => {
  const response = await api.post("/principal/academics/classes-sections/upsert", payload);
  return response.data;
};


export const createTeacherAssignment = async (payload) => {
  const response = await api.post("/principal/academics/teacher-assignments", payload);
  return response.data;
};

export const deleteTeacherAssignment = async (id) => {
  const response = await api.delete(`/principal/academics/teacher-assignments/${id}`);
  return response.data;
};

// ADD THESE TO THE BOTTOM OF YOUR API FILE
export const createPrincipalSubject = async (payload) => {
  const response = await api.post("/principal/academics/subjects", payload);
  return response.data;
};

export const updatePrincipalSubject = async (id, payload) => {
  const response = await api.put(`/principal/academics/subjects/${id}`, payload);
  return response.data;
};

export const deletePrincipalSubject = async (id) => {
  const response = await api.delete(`/principal/academics/subjects/${id}`);
  return response.data;
};

// Clean service layer for Timetable consumption
export const getClasses = async () => {
    return getPrincipalClassesSections();
};

export const getSectionsByClass = async (classId) => {
    const res = await getPrincipalClassesSections();
    const classItem = (res?.data || []).find(c => String(c.id || c._id) === String(classId));
    return { success: true, data: classItem?.sections || [] };
};

export const getTeachers = async () => {
    const res = await getPrincipalTeacherAssignments();
    return { success: true, data: res?.data?.teachers || [] };
};

export const getClassTimetable = async (classId, section) => {
    return getPrincipalTimetables({ classId, section });
};

export const getTeacherTimetable = async (teacherId) => {
    return getPrincipalTimetables({ teacherId });
};