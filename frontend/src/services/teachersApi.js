import api from './api';

const BASE_URL = '/admin/teachers';

/**
 * Fetch all teachers with optional filtering
 * @param {Object} params - Query parameters (search, subjectId, classId, status)
 * @returns {Promise} Response with teachers data and stats
 */
export const fetchTeachers = (params = {}) => {
  return api.get(BASE_URL, { params });
};

/**
 * Fetch a single teacher by ID
 * @param {string} teacherId - The teacher ID
 * @returns {Promise} Response with teacher data
 */
export const fetchTeacherById = (teacherId) => {
  return api.get(`${BASE_URL}/${teacherId}`);
};

/**
 * Create a new teacher
 * @param {Object} teacherData - Teacher data
 * @returns {Promise} Response with created teacher
 */
export const createTeacher = (teacherData) => {
  return api.post(BASE_URL, teacherData);
};

/**
 * Update a teacher
 * @param {string} teacherId - The teacher ID
 * @param {Object} teacherData - Updated teacher data
 * @returns {Promise} Response with updated teacher
 */
export const updateTeacher = (teacherId, teacherData) => {
  return api.put(`${BASE_URL}/${teacherId}`, teacherData);
};

/**
 * Update teacher status (active/inactive)
 * @param {string} teacherId - The teacher ID
 * @param {Object} statusData - Status update data {status: 'active' | 'inactive'}
 * @returns {Promise} Response with updated teacher
 */
export const updateTeacherStatus = (teacherId, statusData) => {
  return api.patch(`${BASE_URL}/${teacherId}/status`, statusData);
};

/**
 * Delete a teacher
 * @param {string} teacherId - The teacher ID
 * @returns {Promise} Response confirming deletion
 */
export const deleteTeacher = (teacherId) => {
  return api.delete(`${BASE_URL}/${teacherId}`);
};
