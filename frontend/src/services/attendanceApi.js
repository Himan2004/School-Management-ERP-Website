// src/services/attendanceApi.js

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

// ════════════════════════ ATTENDANCE ════════════════════════

// Clock in
export const clockIn = (staffId, school, organization) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/clock-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, school, organization }),
  }).then(handleResponse);

// Clock out
export const clockOut = (staffId, school) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/clock-out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, school }),
  }).then(handleResponse);

// Get attendance records
export const fetchAttendance = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/attendance/records${query}`).then(handleResponse);

// Get attendance summary
export const fetchAttendanceSummary = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/attendance/summary${query}`).then(handleResponse);

// Mark attendance manually
export const markAttendance = (attendanceData) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attendanceData),
  }).then(handleResponse);

// ════════════════════════ LEAVES ════════════════════════

// Create leave request
export const createLeaveRequest = (leaveData) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/leaves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leaveData),
  }).then(handleResponse);

// Get leave requests
export const fetchLeaveRequests = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/attendance/leaves${query}`).then(handleResponse);

// Approve leave
export const approveLeave = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/leaves/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Reject leave
export const rejectLeave = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/leaves/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Get leave balance
export const fetchLeaveBalance = (staffId) =>
  apiFetch(`${BASE_URL}/super-admin/attendance/leaves/balance/${staffId}`).then(handleResponse);
