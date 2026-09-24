// src/services/meetingApi.js

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

// Get all meetings
export const fetchMeetings = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/meetings${query}`).then(handleResponse);

// Get meeting by ID
export const fetchMeetingById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}`).then(handleResponse);

// Create meeting
export const createMeeting = (meetingData) =>
  apiFetch(`${BASE_URL}/super-admin/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meetingData),
  }).then(handleResponse);

// Update meeting
export const updateMeeting = (id, updates) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).then(handleResponse);

// Acknowledge meeting
export const acknowledgeMeeting = (id, staffId) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId }),
  }).then(handleResponse);

// Complete meeting
export const completeMeeting = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Cancel meeting
export const cancelMeeting = (id, reason) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }).then(handleResponse);

// Get meeting acknowledgements
export const fetchMeetingAcknowledgements = (id) =>
  apiFetch(`${BASE_URL}/super-admin/meetings/${id}/acknowledgements`).then(handleResponse);

// Get upcoming meetings
export const fetchUpcomingMeetings = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/meetings/upcoming${query}`).then(handleResponse);
