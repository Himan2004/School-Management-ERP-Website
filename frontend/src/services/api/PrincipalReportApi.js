import api from "../api";

// ====================== ACADEMIC REPORTS ======================

/**
 * Get Academic Reports
 */
export const getAcademicReports = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/academic",
        { params }
    );

    return response.data;
};

/**
 * Get Subject Deep Dive Report
 */
export const getSubjectDeepDive = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/academic/subject-deepdive",
        { params }
    );

    return response.data;
};

/**
 * Get Exam Comparison Report
 */
export const getExamComparison = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/academic/exam-comparison",
        { params }
    );

    return response.data;
};

// Add this exported function so AcademicReports.jsx can find it
export const getAcademicFiltersApi = async () => {
  const response = await api.get('/api/principal/reports/academic/filters');
  return response.data;
};

// ====================== FINANCIAL REPORTS ======================

/**
 * Get Financial Reports
 */
export const getFinancialReports = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial",
        { params }
    );

    return response.data;
};

/**
 * Get Revenue Trend
 */
export const getRevenueTrend = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/revenue-trend",
        { params }
    );

    return response.data;
};

/**
 * Get Fee Collection Data
 */
export const getFeeCollectionData = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/fee-collection",
        { params }
    );

    return response.data;
};

/**
 * Get Revenue vs Expense
 */
export const getRevenueExpense = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/revenue-expense",
        { params }
    );

    return response.data;
};

/**
 * Get Collection By Category
 */
export const getCollectionByCategory = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/collection-category",
        { params }
    );

    return response.data;
};

/**
 * Get Class Wise Collection
 */
export const getClassWiseCollection = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/class-wise-collection",
        { params }
    );

    return response.data;
};

/**
 * Get Expense Summary
 */
export const getExpenseSummary = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/expense-summary",
        { params }
    );

    return response.data;
};

/**
 * Get Expense Pie Chart Data
 */
export const getExpensePieData = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/expense-pie",
        { params }
    );

    return response.data;
};

/**
 * Get Due Analysis
 */
export const getDueAnalysis = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/due-analysis",
        { params }
    );

    return response.data;
};

/**
 * Get Due Students List
 */
export const getDueStudents = async (params = {}) => {
    const response = await api.get(
        "/principal/reports/financial/due-students",
        { params }
    );

    return response.data;
};