import api from "../api";

// ==================== ACADEMIC YEAR ====================

// Get all academic years
export const getAcademicYears = async (schoolId) => {
    const response = await api.get(
        `/principal/settings/academic-years?school_id=${schoolId}`
    );
    return response.data;
};

// Get single academic year
export const getAcademicYearById = async (id) => {
    const response = await api.get(
        `/principal/settings/academic-years/${id}`
    );
    return response.data;
};

// Create academic year
export const createAcademicYear = async (schoolId, data) => {
    const response = await api.post(
        `/principal/settings/academic-years?school_id=${schoolId}`,
        data
    );
    return response.data;
};

// Update academic year status
export const updateAcademicYearStatus = async (id, status) => {
    const response = await api.patch(
        `/principal/settings/academic-years/${id}/status`,
        { status }
    );
    return response.data;
};

// NEW: Update an entire academic year (for the Edit button)
export const updateAcademicYear = async (id, payload) => {
    // FIXED: Removed the extra /api from the beginning
    const response = await api.put(`/principal/settings/academic-years/${id}`, payload);
    return response.data;
};

// NEW: Delete an academic year
export const deleteAcademicYear = async (id) => {
    // FIXED: Removed the extra /api from the beginning
    const response = await api.delete(`/principal/settings/academic-years/${id}`);
    return response.data;
};

// ==================== HOLIDAYS ====================

// Add holiday
export const addHoliday = async (academicYearId, data) => {
    const response = await api.post(
        `/principal/settings/academic-years/${academicYearId}/holidays`,
        data
    );
    return response.data;
};

// Delete holiday
export const deleteHoliday = async (holidayId) => {
    const response = await api.delete(
        `/principal/settings/holidays/${holidayId}`
    );
    return response.data;
};

// ==================== TERMS ====================

// Add term
export const addTerm = async (academicYearId, data) => {
    const response = await api.post(
        `/principal/settings/academic-years/${academicYearId}/terms`,
        data
    );
    return response.data;
};

// Delete term
export const deleteTerm = async (termId) => {
    const response = await api.delete(
        `/principal/settings/terms/${termId}`
    );
    return response.data;
};

// ==================== PROMOTION ====================

// Get promotion rules
export const getPromotionRules = async (schoolId, academicYearId) => {
    const response = await api.get(
        `/principal/settings/promotion/rules?school_id=${schoolId}&academicYearId=${academicYearId}`
    );
    return response.data;
};

// Update promotion rules
export const updatePromotionRules = async (
    schoolId,
    academicYearId,
    data
) => {
    const response = await api.put(
        `/principal/settings/promotion/rules?school_id=${schoolId}&academicYearId=${academicYearId}`,
        data
    );
    return response.data;
};

// Get class mapping
export const getClassMapping = async (schoolId) => {
    const response = await api.get(
        `/principal/settings/promotion/class-mapping?school_id=${schoolId}`
    );
    return response.data;
};

// Update class mapping
export const updateClassMapping = async (schoolId, mappings) => {
    const response = await api.put(
        `/principal/settings/promotion/class-mapping?school_id=${schoolId}`,
        { mappings }
    );
    return response.data;
};

// Get promotion preview
export const getPromotionPreview = async (schoolId, academicYearId, currentClass, section) => {
    // Build query string dynamically based on what is selected
    let url = `/principal/settings/promotion/preview?school_id=${schoolId}&academicYearId=${academicYearId}`;
    if (currentClass) url += `&currentClass=${encodeURIComponent(currentClass)}`;
    if (section) url += `&section=${encodeURIComponent(section)}`;
    
    const response = await api.get(url);
    return response.data;
};

// Run promotion
export const runPromotion = async (data) => {
    const response = await api.post(`/principal/settings/promotion/run`, data);
    return response.data;
};

// Get promotion history
export const getPromotionHistory = async (schoolId) => {
    const response = await api.get(
        `/principal/settings/promotion/history?school_id=${schoolId}`
    );
    return response.data;
};