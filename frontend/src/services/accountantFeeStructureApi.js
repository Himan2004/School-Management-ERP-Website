import api from './api';

// ── No school_id params — the backend reads school from req.user.school (JWT) ──
// This also closes the security hole where any user could pass any school's ID.

export const getFeeStructures = (params = {}) =>
    api.get('/accountant/fee-structure', { params });

export const createFeeStructure = (data) =>
    api.post('/accountant/fee-structure', data);

export const updateFeeStructure = (id, data) =>
    api.put(`/accountant/fee-structure/${id}`, data);

export const deleteFeeStructure = (id) =>
    api.delete(`/accountant/fee-structure/${id}`);

export const toggleFeeStructureStatus = (id) =>
    api.patch(`/accountant/fee-structure/${id}/toggle`);

// CRITICAL: /classes must be a distinct path — see route order fix in routes file
export const getFeeStructureClasses = (params = {}) =>
    api.get('/accountant/fee-structure/classes', { params });

export const getCurrentAcademicConfig = () =>
    api.get('/admin/academic-configurations/current');
