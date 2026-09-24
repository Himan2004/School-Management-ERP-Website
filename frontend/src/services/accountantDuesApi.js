import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: `${BASE_URL}/accountant/dues`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/**
 * getDuesList(schoolId, params)
 *   params: { search, status, periodId, academicYear, page, limit }
 *   Returns: { students, periods, summary, pagination }
 *
 * NOTE: schoolId is kept as a param for backward-compatibility with the
 * existing frontend call signature — the backend reads school from req.user.
 */
export const getDuesList = (schoolId, params = {}) =>
    api.get('/list', { params });

/**
 * sendDuesReminder(studentId, body)
 *   body: { subject?, message? }
 */
export const sendDuesReminder = (studentId, body = {}) =>
    api.post(`/remind/${studentId}`, body);

/**
 * sendBulkDuesReminder(body)
 *   body: { studentIds?, academicYear?, subject?, message? }
 */
export const sendBulkDuesReminder = (body = {}) =>
    api.post('/remind-bulk', body);

/**
 * updateStudentStatus(studentId, status)
 *   status: 'Active' | 'Inactive'
 */
export const updateStudentStatus = (studentId, status) =>
    api.patch(`/status/${studentId}`, { status });

const accountantDuesApi = {
    getDuesList,
    sendDuesReminder,
    sendBulkDuesReminder,
    updateStudentStatus,
};

export default accountantDuesApi;
