import api from './api';

const BASE_URL = '/admin/task';

/**
 * Fetch all tasks with optional filtering
 * @param {Object} params - Query parameters (status, priority, search, page, limit)
 * @returns {Promise} Response with tasks data and metadata
 */
export const fetchTasks = (params = {}) => {
  return api.get(BASE_URL, { params });
};

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise} Response with created task
 */
export const createTask = (taskData) => {
  return api.post(BASE_URL, taskData);
};

/**
 * Update a task
 * @param {string} taskId - The task ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise} Response with updated task
 */
export const updateTask = (taskId, taskData) => {
  return api.put(`${BASE_URL}/${taskId}`, taskData);
};

/**
 * Delete a task
 * @param {string} taskId - The task ID
 * @returns {Promise} Response confirming deletion
 */
export const deleteTask = (taskId) => {
  return api.delete(`${BASE_URL}/${taskId}`);
};
