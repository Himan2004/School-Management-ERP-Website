// services/accountantFeesApi.js
// Centralised API layer for the Fee Entry / Management page.
// Uses your existing axios instance (assumed to be at ../../utils/axios or similar).
// Replace the import path if yours differs.

import axios from 'axios'; // or: import api from '../../utils/axiosInstance';

// ── Base URL — adjust to match your env setup ──────────────────────────────────
const BASE = '/api/accountant/fees';

// Helper: unwrap axios response or throw a friendly error
const handle = async (promise) => {
    try {
        const { data } = await promise;
        return data;
    } catch (err) {
        const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Something went wrong';
        throw new Error(msg);
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// STUDENTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all students with their fee summary.
 * @param {object} params - { classId, sectionId, status, search, page, limit, academicYear }
 */
export const fetchStudentsWithFees = (params = {}) =>
    handle(axios.get(`${BASE}/students`, { params }));

/**
 * Fetch a single student's full fee profile (slots, payments, etc).
 * @param {string} studentId - Student._id
 * @param {string} [academicYear]
 */
export const fetchStudentFeeProfile = (studentId, academicYear) =>
    handle(axios.get(`${BASE}/students/${studentId}`, { params: { academicYear } }));

// ════════════════════════════════════════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Process a fee payment.
 * @param {object} payload
 * @param {string} payload.studentId          - Student._id
 * @param {string} [payload.installmentId]    - FeeInstallment._id (optional; resolved server-side)
 * @param {string} [payload.installmentSlotId]- specific slot _id (optional)
 * @param {number} payload.amount             - base amount in rupees
 * @param {string} payload.mode              - 'Cash'|'UPI'|'Online'|'Cheque'
 * @param {string} [payload.reference]        - ref/cheque no (required for non-cash)
 * @param {string} [payload.remarks]
 * @param {boolean} [payload.applyLateFee]
 * @param {boolean} [payload.includeGST]
 * @param {boolean} [payload.isAdvance]
 * @param {boolean} [payload.isPartial]
 * @param {string} [payload.academicYear]
 */
export const processPayment = (payload) =>
    handle(axios.post(`${BASE}/pay`, payload));

/**
 * Fetch payment history for a student.
 * @param {string} studentId
 * @param {object} [params] - { page, limit }
 */
export const fetchPaymentHistory = (studentId, params = {}) =>
    handle(axios.get(`${BASE}/payments/${studentId}`, { params }));

// ════════════════════════════════════════════════════════════════════════════════
// LATE FEE SETTINGS
// ════════════════════════════════════════════════════════════════════════════════

/** Get the current late fee setting for this school. */
export const fetchLateFeeSetting = () =>
    handle(axios.get(`${BASE}/late-fee-setting`));

/**
 * Save (create or update) the late fee setting.
 * @param {object} payload - { dueDay, penaltyPerDay, gracePeriod, maxPenalty, isActive, applicableClasses }
 */
export const saveLateFeeSetting = (payload) =>
    handle(axios.post(`${BASE}/late-fee-setting`, payload));

// ════════════════════════════════════════════════════════════════════════════════
// SUMMARY / DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Fetch fee collection summary / dashboard stats.
 * @param {string} [academicYear]
 */
export const fetchFeeSummary = (academicYear) =>
    handle(axios.get(`${BASE}/summary`, { params: { academicYear } }));
