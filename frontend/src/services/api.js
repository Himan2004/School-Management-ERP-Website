import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
const baseUrl = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

// Remove null/undefined values from request data/params to avoid sending invalid enums
const cleanData = (value) => {
  if (value === null || value === undefined) return undefined;
  if (value instanceof FormData) return value;
  if (Array.isArray(value)) return value.map(cleanData);
  if (typeof value !== "object") return value;
  const out = {};
  Object.keys(value).forEach((k) => {
    const v = value[k];
    if (v === null || v === undefined) return;
    const cleaned = cleanData(v);
    if (cleaned === undefined) return;
    out[k] = cleaned;
  });
  return out;
};

api.interceptors.request.use(
  (config) => {
    // sanitize params and body to avoid sending null enum values
    try {
      if (config.params) config.params = cleanData(config.params);
      // Don't clean FormData — it breaks multipart/form-data uploads
      if (config.data && !(config.data instanceof FormData)) {
        config.data = cleanData(config.data);
      }
      // If FormData, remove Content-Type so Axios sets the correct multipart boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (e) {
      // if cleaning fails, continue with original data
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Skip redirection if already on login page, requesting login, or doing PIN verification
      if (
        error.config?.url?.includes("/login") ||
        error.config?.url?.includes("/verify-pin") ||
        window.location.pathname.includes("/login")
      ) {
        return Promise.reject(error);
      }

      // 🔥 1. Clear local storage tokens immediately
      localStorage.removeItem("token");
      localStorage.removeItem("studentId");
      
      // 🔥 2. Redirect the user back to their specific login page
      const currentPath = window.location.pathname;
      
      if (currentPath.includes('/student')) {
        window.location.href = "/student-login";
      } else if (currentPath.includes('/teacher')) {
        window.location.href = "/teacher-login";
      } else if (currentPath.includes('/parent')) {
        window.location.href = "/parent-login";
      } else if (currentPath.includes('/principal')) {
        window.location.href = "/principal-login";
      } else {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;