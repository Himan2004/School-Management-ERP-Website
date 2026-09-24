// src/services/hrmApi.js

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

// ════════════════════════ PROMOTIONS ════════════════════════

export const fetchPromotions = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/hrm/promotions${query}`).then(handleResponse);

export const fetchPromotionById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/promotions/${id}`).then(handleResponse);

export const createPromotion = (promotionData) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(promotionData),
  }).then(handleResponse);

export const approvePromotion = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/promotions/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const rejectPromotion = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/promotions/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// ════════════════════════ RESIGNATIONS ════════════════════════

export const fetchResignations = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/hrm/resignations${query}`).then(handleResponse);

export const fetchResignationById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/resignations/${id}`).then(handleResponse);

export const createResignation = (resignationData) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/resignations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resignationData),
  }).then(handleResponse);

export const approveResignation = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/resignations/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const rejectResignation = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/resignations/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// ════════════════════════ TRANSFERS ════════════════════════

export const fetchTransfers = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers${query}`).then(handleResponse);

export const fetchTransferById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers/${id}`).then(handleResponse);

export const createTransfer = (transferData) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transferData),
  }).then(handleResponse);

export const approveTransfer = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const rejectTransfer = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const completeTransfer = (id) =>
  apiFetch(`${BASE_URL}/super-admin/hrm/transfers/${id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).then(handleResponse);

// ════════════════════════ STAFF ATTENDANCE ════════════════════════

export const fetchStaffAttendanceRecords = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  // 🔥 Added /hrm to the URL
  return apiFetch(`${BASE_URL}/super-admin/hrm/attendance/records?${query}`).then(handleResponse);
};

export const fetchStaffAttendanceSummary = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  // 🔥 Added /hrm to the URL
  return apiFetch(`${BASE_URL}/super-admin/hrm/attendance/summary?${query}`).then(handleResponse);
};

// ════════════════════════ ATTENDANCE & LEAVES ════════════════════════

export const markAttendanceApi = (data) =>
  // 🔥 Added /hrm to the URL
  apiFetch(`${BASE_URL}/super-admin/hrm/attendance/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const fetchLeaveRequestsApi = (query = "") =>
  // 🔥 Added /hrm to the URL
  apiFetch(`${BASE_URL}/super-admin/hrm/attendance/leaves${query}`).then(handleResponse);

export const approveLeaveApi = (id, data = {}) =>
  // 🔥 Added /hrm to the URL
  apiFetch(`${BASE_URL}/super-admin/hrm/attendance/leaves/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const rejectLeaveApi = (id, data) =>
  // 🔥 Added /hrm to the URL
  apiFetch(`${BASE_URL}/super-admin/hrm/attendance/leaves/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Fetch all users to get the Principals list
export const fetchPrincipalsApi = () =>
  apiFetch(`${BASE_URL}/super-admin/users?role=principal`).then(handleResponse);