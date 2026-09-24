// src/services/teacherApi.js

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// Fetch all teachers
export const fetchTeachers = () =>
  fetch(`${BASE_URL}/teachers`).then(handleResponse);

// Generate next available teacher ID from backend
export const generateTeacherId = () =>
  fetch(`${BASE_URL}/teachers/generate-id`).then(handleResponse);

// Add a new teacher — backend sends Brevo email automatically
export const addTeacher = (teacherData) =>
  fetch(`${BASE_URL}/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teacherData),
  }).then(handleResponse);

// Assign class + subjects (from Add Teachers page → Assign modal)
export const assignTeacher = (mongoId, { assignedClass, subjects }) =>
  fetch(`${BASE_URL}/teachers/${mongoId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedClass, subjects }),
  }).then(handleResponse);

// Edit class/subjects (from Manage Teachers page → Edit modal)
export const updateTeacher = (mongoId, updates) =>
  fetch(`${BASE_URL}/teachers/${mongoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  }).then(handleResponse);

// Delete a teacher
export const deleteTeacher = (mongoId) =>
  fetch(`${BASE_URL}/teachers/${mongoId}`, {
    method: 'DELETE',
  }).then(handleResponse);