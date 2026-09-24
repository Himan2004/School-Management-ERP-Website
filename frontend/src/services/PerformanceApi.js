// src/api/performanceTrendsApi.js

import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001/api",
  withCredentials: true,
});

export const getEnrollmentTrendApi = (academicYear) =>
  API.get(`/superadmin/analytics/trends/enrollment?academicYear=${academicYear}`);

export const getAttendanceTrendApi = () =>
  API.get(`/superadmin/analytics/trends/attendance`);

export const getRevenueTrendApi = () =>
  API.get(`/superadmin/analytics/trends/revenue`);

export const getPassTrendApi = () =>
  API.get(`/superadmin/analytics/trends/pass-percentage`);

export const getDropoutTrendApi = () =>
  API.get(`/superadmin/analytics/trends/dropout`);

export const getGrowthMetricsApi = () =>
  API.get(`/superadmin/analytics/trends/growth`);

export const getPerformanceTrendsDataAPI = (academicSession) =>
  API.get(`/superadmin/analytics/trends/performance`, { params: { academicSession } });