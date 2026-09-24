import api from "../api";

const unwrap = (response) => response.data;

const getError = (error, fallbackMessage) => {
    const payload = error.response?.data;
    if (payload?.message) return payload;
    return { message: fallbackMessage };
};

export const getAcademicBranchResultsApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/branch-results", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load academic branch results");
    }
};

export const getAcademicSubjectAnalysisApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/subject-analysis", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load subject analysis");
    }
};

export const getAcademicTopStudentsApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/top-students", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load top students");
    }
};

export const getAcademicGradeDistributionApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/grade-distribution", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load grade distribution");
    }
};

export const getAcademicBranchComparisonApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/branch-comparison", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load branch comparison");
    }
};

export const getFinancialBranchCollectionApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/financial/branch-collection", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load financial branch collection");
    }
};

export const getFinancialCategoryBreakdownApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/financial/category-breakdown", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load category breakdown");
    }
};

export const getFinancialRevenueTrendApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/financial/revenue-trend", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load revenue trend");
    }
};

export const getFinancialPendingAlertsApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/financial/pending-alerts", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load pending alerts");
    }
};

export const getStaffBranchOverviewApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/staff/branch-overview", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load staff branch overview");
    }
};

export const getStaffDepartmentWiseApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/staff/department-wise", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load department-wise staff");
    }
};

export const getStaffTransfersExitsApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/staff/transfers-exits", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load staff transfers and exits");
    }
};

export const getStaffAttendanceTrendApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/staff/attendance-trend", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load staff attendance trend");
    }
};

export const exportReportApi = async (payload) => {
    try {
        const response = await api.post("/superadmin/reports/export", payload);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to export report");
    }
};

export const bulkExportReportsApi = async (payload) => {
    try {
        const response = await api.post("/superadmin/reports/export/bulk", payload);
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to bulk export reports");
    }
};

export const getExportHistoryApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/export/history", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load export history");
    }
};

export const getReportFiltersApi = async () => {
    try {
        const response = await api.get("/superadmin/reports/filters");
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load report filters");
    }
};

export const getAcademicKPISummaryApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/kpi-summary", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load KPI summary");
    }
};

export const getAcademicPassPercentageByBranchApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/pass-percentage-by-branch", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load pass percentage by branch");
    }
};

export const getAcademicBranchHQComparisonApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/branch-hq-comparison", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load branch HQ comparison");
    }
};

export const getAcademicClassPerformanceApi = async (params = {}) => {
    try {
        const response = await api.get("/superadmin/reports/academic/class-performance", { params });
        return unwrap(response);
    } catch (error) {
        throw getError(error, "Failed to load class performance");
    }
};