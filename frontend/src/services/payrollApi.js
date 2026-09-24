// src/services/payrollApi.js

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

// ════════════════════════ PAYROLL ════════════════════════

// Get all payroll records
export const fetchPayroll = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/payroll${query}`).then(handleResponse);

// Get payroll by ID
export const fetchPayrollById = (id) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/${id}`).then(handleResponse);

// Create payroll
export const createPayroll = (payrollData) =>
  apiFetch(`${BASE_URL}/super-admin/payroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payrollData),
  }).then(handleResponse);

// Update payroll
export const updatePayroll = (id, updates) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).then(handleResponse);

// Approve payroll
export const approvePayroll = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Reject payroll
export const rejectPayroll = (id, data) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

// Get payroll summary
export const fetchPayrollSummary = (query = "") =>
  apiFetch(`${BASE_URL}/super-admin/payroll/summary${query}`).then(handleResponse);

// ════════════════════════ SALARY SLIPS ════════════════════════

// Generate salary slip
export const generateSalarySlip = (payrollId) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/${payrollId}/salary-slip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).then(handleResponse);

// Get salary slip
export const fetchSalarySlip = (id) =>
  apiFetch(`${BASE_URL}/super-admin/payroll/salary-slip/${id}`).then(handleResponse);

// Get staff salary slips
export const fetchStaffSalarySlips = (staffId, query = "") => {
  let url = `${BASE_URL}/super-admin/payroll/staff/${staffId}/salary-slips`;
  if (query) url += query;
  return apiFetch(url).then(handleResponse);
};
