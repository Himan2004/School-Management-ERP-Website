import api from '../api';

// Get academic config
export const getAcademicConfig = async (organizationId) => {
  try {
    const response = await api.get('/superadmin/academic-config', {
      params: { organizationId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch academic config' };
  }
};

// Update academic config
export const updateAcademicConfig = async (id, configData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}`, configData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update academic config' };
  }
};

// Update academic year
export const updateAcademicYear = async (id, yearData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/academic-year`, yearData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update academic year' };
  }
};

// Holidays
export const addHoliday = async (id, holidayData) => {
  try {
    const response = await api.post(`/superadmin/academic-config/${id}/holidays`, holidayData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to add holiday' };
  }
};

export const updateHoliday = async (id, holidayId, holidayData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/holidays/${holidayId}`, holidayData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update holiday' };
  }
};

export const deleteHoliday = async (id, holidayId) => {
  try {
    const response = await api.delete(`/superadmin/academic-config/${id}/holidays/${holidayId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete holiday' };
  }
};

// Exam Patterns
export const addExamPattern = async (id, patternData) => {
  try {
    const response = await api.post(`/superadmin/academic-config/${id}/exam-patterns`, patternData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to add exam pattern' };
  }
};

export const updateExamPattern = async (id, patternId, patternData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/exam-patterns/${patternId}`, patternData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update exam pattern' };
  }
};

export const deleteExamPattern = async (id, patternId) => {
  try {
    const response = await api.delete(`/superadmin/academic-config/${id}/exam-patterns/${patternId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete exam pattern' };
  }
};

// Grading System
export const updateGradingSystem = async (id, gradingData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/grading-system`, gradingData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update grading system' };
  }
};

// Rules
export const updateRules = async (id, rulesData) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/rules`, rulesData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update rules' };
  }
};

// Assign Classes & Subjects
export const assignClasses = async (id, classIds) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/assign-classes`, { classIds });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to assign classes' };
  }
};

export const assignSubjects = async (id, subjectIds) => {
  try {
    const response = await api.put(`/superadmin/academic-config/${id}/assign-subjects`, { subjectIds });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to assign subjects' };
  }
};
export * from './academicConfigApi';