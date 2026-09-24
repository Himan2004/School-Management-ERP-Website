// src/services/staffApi.js

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:5001";
const BASE_URL = API_ORIGIN.endsWith("/api") ? API_ORIGIN : `${API_ORIGIN}/api`;

const apiFetch = (url, options = {}) =>
  fetch(url, {
    credentials: "include",
    ...options,
  });

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

// Get all staff members
export const fetchAllStaff = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/staff${query}`, {
    headers: { "Content-Type": "application/json" },
  }).then(handleResponse);

// Get staff by ID
export const fetchStaffById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/staff/${id}`).then(handleResponse);

// Create staff member
export const createStaffMember = (staffData) =>
  apiFetch(`${BASE_URL}/super-admin/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(staffData),
  }).then(handleResponse);

// Update staff member
export const updateStaffMember = (id, updates) =>
  apiFetch(`${BASE_URL}/super-admin/staff/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).then(handleResponse);

// Delete staff member
export const deleteStaffMember = (id) =>
  apiFetch(`${BASE_URL}/super-admin/staff/${id}`, {
    method: "DELETE",
  }).then(handleResponse);

// Search staff
export const searchStaff = (query, school = "") => {
  let url = `${BASE_URL}/super-admin/staff/search?query=${encodeURIComponent(query)}`;
  if (school) url += `&school=${school}`;
  return apiFetch(url).then(handleResponse);
};

// Get staff statistics
export const getStaffStats = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/staff/stats${query}`).then(handleResponse);

// Get staff benchmarking analytics
export const fetchStaffBenchmarking = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/staff/benchmarking${query}`).then(handleResponse);
