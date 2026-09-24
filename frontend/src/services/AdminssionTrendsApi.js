import api from './api';

/**
 * Get the full admission trends dashboard data for the signed-in organization.
 */
export const getAdmissionDashboardData = async (academicSession) => {
  try {
    const response = await api.get('/superadmin/analytics/admissions/dashboard', {
      params: { academicSession }
    });
    // Normalise: backend returns { success, data } — pass it straight through
    return response.data;
  } catch (error) {
    console.error('AdmissionTrends API error:', error?.response?.data || error.message);
    return { success: false, data: null };
  }
};

export default { getAdmissionDashboardData };
