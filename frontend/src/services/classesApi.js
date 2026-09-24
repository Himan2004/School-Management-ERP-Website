import api from './api';

const BASE_URL = '/admin/classes';

/**
 * Fetch all classes with optional filtering
 * @param {Object} params - Query parameters (gradeLevel, academicYear, status, search, page, limit)
 * @returns {Promise} Response with classes data
 */
export const fetchClasses = async(params = {}) => {
  const res = await api.get(BASE_URL, { params });
  console.log(res)
  return res;
};

/**
 * Fetch a single class by ID
 * @param {string} classId - The class ID
 * @returns {Promise} Response with class data
 */
export const fetchClassById = async(classId) => {
  const res = await api.get(`${BASE_URL}/${classId}`);
  console.log(res)
  return res;
};

/**
 * Create a new class
 * @param {Object} classData - Class data (className, gradeLevel, section, academicYear, etc.)
 * @returns {Promise} Response with created class
 */
export const createClass = (classData) => {
  return api.post(BASE_URL, classData);
};

/**
 * Update a class
 * @param {string} classId - The class ID
 * @param {Object} classData - Updated class data
 * @returns {Promise} Response with updated class
 */
export const updateClass = (classId, classData) => {
  return api.put(`${BASE_URL}/${classId}`, classData);
};

/**
 * Delete a class
 * @param {string} classId - The class ID
 * @returns {Promise} Response confirming deletion
 */
export const deleteClass = (classId) => {
  return api.delete(`${BASE_URL}/${classId}`);
};

/**
 * Get classes by academic year
 * @param {string} academicYear - The academic year (e.g., "2024-2025")
 * @returns {Promise} Response with classes for that year
 */
export const fetchClassesByYear = (academicYear) => {
  return api.get(`${BASE_URL}/by-year/${academicYear}`);
};

/**
 * Get all available academic years
 * @returns {Promise} Response with list of academic years
 */
export const fetchAcademicYears = () => {
  return api.get(`${BASE_URL}/academic-years`);
};

/**
 * Associate subjects with a class
 * @param {string} classId - The class ID
 * @param {Object} data - { subjectIds: [], action: 'add' or 'remove' }
 * @returns {Promise} Response with updated class
 */
export const associateSubjectsWithClass = (classId, data) => {
  return api.post(`${BASE_URL}/${classId}/subjects`, data);
};
