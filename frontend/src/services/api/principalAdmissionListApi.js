import api from "../api";

const BASE = "/principal/admissions-list";

// ─── Main List ────────────────────────────────────────────────────────────────
export const fetchAdmissionList = (params = {}) =>
  api.get(BASE, { params }).then((r) => r.data);

export const fetchDashboardStats = () =>
  api.get(`${BASE}/dashboard-stats`).then((r) => r.data);

export const fetchStatusCounts = () =>
  api.get(`${BASE}/status-counts`).then((r) => r.data);

// ─── Search & Filter ──────────────────────────────────────────────────────────
export const searchAdmissions = (q) =>
  api.get(`${BASE}/search`, { params: { q } }).then((r) => r.data);

export const fetchFilterMetadata = () =>
  api.get(`${BASE}/filter-metadata`).then((r) => r.data);

// ─── Single Admission ─────────────────────────────────────────────────────────
export const fetchAdmissionDetail = (id) =>
  api.get(`${BASE}/${id}`).then((r) => r.data);

export const fetchAdmissionTimeline = (id) =>
  api.get(`${BASE}/${id}/timeline`).then((r) => r.data);

// ─── Quick Actions ────────────────────────────────────────────────────────────
export const changeAdmissionStatus = (id, status, remarks = "") =>
  api.patch(`${BASE}/${id}/status`, { status, remarks }).then((r) => r.data);

export const toggleFlag = (id) =>
  api.patch(`${BASE}/${id}/flag`).then((r) => r.data);

// ─── Notes ────────────────────────────────────────────────────────────────────
export const addNote = (id, note) =>
  api.post(`${BASE}/${id}/notes`, { note }).then((r) => r.data);

// ─── Bulk ─────────────────────────────────────────────────────────────────────
export const bulkUpdateAdmissions = (ids, updates) =>
  api.patch(`${BASE}/bulk`, { ids, updates }).then((r) => r.data);

// ─── Reports ─────────────────────────────────────────────────────────────────
export const fetchPendingAdmissions = () =>
  api.get(`${BASE}/reports/pending`).then((r) => r.data);

export const fetchPerformanceMetrics = () =>
  api.get(`${BASE}/reports/metrics`).then((r) => r.data);

export const exportAdmissionsCSV = async (params = {}) => {
  const response = await api.get(`${BASE}/reports/export`, {
    params: { format: "csv", ...params },
    responseType: "blob",
  });
  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "admissions_export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ─── Support ─────────────────────────────────────────────────────────────────
export const fetchPendingActions = () =>
  api.get(`${BASE}/pending-actions`).then((r) => r.data);

export const fetchComparisonCharts = () =>
  api.get(`${BASE}/charts/comparison`).then((r) => r.data);

// ─── Transfer Certificate ────────────────────────────────────────────────────

// Fetch all schools within the same organization (excluding the current one)
export const fetchOrganizationSchools = () =>
  api.get(`${BASE}/organization-schools`).then((r) => r.data);

// Process the student transfer
// In principalAdmissionListApi.js
export const transferStudent = (data) =>
  api.post(`${BASE}/transfer`, data).then((r) => r.data);

