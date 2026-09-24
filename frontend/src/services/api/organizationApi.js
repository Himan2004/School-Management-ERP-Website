import api from '../api';

// ==================== CLASSES APIS ====================

// Get all classes for an organization
export const getOrganizationClasses = async (organizationId) => {
  try {
    const response = await api.get('/superadmin/organization-classes', {
      params: { organizationId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch classes' };
  }
};

// Get class by ID
export const getClassById = async (classId) => {
  try {
    const response = await api.get(`/superadmin/organization-classes/${classId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch class details' };
  }
};

// Create a new class
export const createClass = async (classData) => {
  try {
    const response = await api.post('/superadmin/organization-classes', classData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create class' };
  }
};

// Update a class
export const updateClass = async (classId, classData) => {
  try {
    const response = await api.put(`/superadmin/organization-classes/${classId}`, classData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update class' };
  }
};

// Delete a class
export const deleteClass = async (classId) => {
  try {
    const response = await api.delete(`/superadmin/organization-classes/${classId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete class' };
  }
};

// Get class statistics
export const getClassStatistics = async (organizationId) => {
  try {
    const response = await api.get('/superadmin/organization-classes/statistics', {
      params: { organizationId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch class statistics' };
  }
};

// Bulk create classes
export const bulkCreateClasses = async (organizationId, classes) => {
  try {
    const response = await api.post('/superadmin/organization-classes/bulk', {
      organizationId,
      classes
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk create classes' };
  }
};

// Bulk delete classes
export const bulkDeleteClasses = async (classIds) => {
  try {
    const response = await api.delete('/superadmin/organization-classes/bulk', {
      data: { classIds }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk delete classes' };
  }
};

// ==================== ORGANIZATION SUBJECTS APIS ====================

// Get all organization subjects
export const getOrganizationSubjects = async (organizationId, classId = null) => {
  try {
    const params = { organizationId };
    if (classId) {
      params.classId = classId;
    }
    const response = await api.get('/superadmin/organization-subjects', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch subjects' };
  }
};

// Get organization subject by ID
export const getOrganizationSubjectById = async (id) => {
  try {
    const response = await api.get(`/superadmin/organization-subjects/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch subject details' };
  }
};

// Get organization subjects by class
export const getOrganizationSubjectsByClass = async (classId, organizationId) => {
  console.log("Class Id",classId)
  console.log("Organisation Id", organizationId)

  try {
    const response = await api.get(`/superadmin/organization-subjects/class/${classId}`, {
      params: { organizationId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch subjects by class' };
  }
};

// Get organization subject statistics
export const getOrganizationSubjectStatistics = async (organizationId) => {
  try {
    const response = await api.get('/superadmin/organization-subjects/statistics', {
      params: { organizationId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch statistics' };
  }
};

// Create a new organization subject
export const createOrganizationSubject = async (subjectData) => {
  try {
    const response = await api.post('/superadmin/organization-subjects', subjectData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create subject' };
  }
};

// Update an organization subject
export const updateOrganizationSubject = async (id, subjectData) => {
  try {
    const response = await api.put(`/superadmin/organization-subjects/${id}`, subjectData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update subject' };
  }
};

// Delete an organization subject
export const deleteOrganizationSubject = async ({ id, organizationId }) => {
  const response = await api.delete(`/superadmin/organization-subjects/${id}`, {
    data: { organizationId }
  });
  return response.data;
};

// Bulk create organization subjects
export const bulkCreateOrganizationSubjects = async (organizationId, classId, subjects) => {
  try {
    const response = await api.post('/superadmin/organization-subjects/bulk', {
      organizationId,
      classId,
      subjects
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk create subjects' };
  }
};

// Bulk delete organization subjects
export const bulkDeleteOrganizationSubjects = async (subjectIds) => {
  try {
    const response = await api.delete('/superadmin/organization-subjects/bulk', {
      data: { subjectIds }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk delete subjects' };
  }
};

// Get all branches/schools for the organization
export const getOrganizationBranches = async () => {
  try {
    const response = await api.get('/superadmin/analytics/branches/all');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch branches' };
  }
};
