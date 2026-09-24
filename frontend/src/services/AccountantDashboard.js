import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
const baseUrl = rawBaseUrl.endsWith("/api")
    ? `${rawBaseUrl}/accountant`
    : `${rawBaseUrl.replace(/\/$/, "")}/api/accountant`;

const API = axios.create({
    baseURL: baseUrl,
    withCredentials: true 
});

API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Dashboard stats ──────────────────────────────────────────
export const getDashboardStats = (schoolId) =>
    API.get(`/dashboard/stats?school_id=${schoolId}`);

// ── Recent transactions (last 20, for the live panel) ────────
export const getRecentTransactions = (schoolId) =>
    API.get(`/dashboard/recent-transactions?school_id=${schoolId}`);

// ── Monthly chart data ───────────────────────────────────────
export const getMonthlyChartData = (schoolId) =>
    API.get(`/dashboard/monthly-data?school_id=${schoolId}`);

// ── All transactions (for the ledger modal) ──────────────────
// Backend returns { success, data: { transactions: [], pagination: {} } }
export const getAllTransactions = (schoolId, params = {}) =>
    API.get(`/dashboard/all-transactions`, {
        params: { school_id: schoolId, ...params }
    });

// ── Student transaction report ───────────────────────────────
// FIX: always coerce studentId to String — rows from the transaction
// list carry an ObjectId object, not a plain string.
export const getStudentTransactionReport = (schoolId, studentId) =>
    API.get(`/dashboard/student-report/${String(studentId)}`, {
        params: { school_id: schoolId }
    });

// ── Communications ───────────────────────────────────────────
export const getAccountantCommunications = () =>
    API.get('/dashboard/communications');

export const markAccountantNoticeRead = (noticeId) =>
    API.post(`/dashboard/communications/notices/${noticeId}/view`);
