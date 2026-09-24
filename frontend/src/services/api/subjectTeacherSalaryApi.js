import api from "../api";

const BASE_URL = "/subject-teacher/salary";

// Get salary summary
export const getSalarySummary = async () => {
  const response = await api.get(`${BASE_URL}/summary`);
  return response.data;
};

// Get complete payout history
export const getSalaryHistory = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/history`, { params });
  return response.data;
};

// Get salary analytics
export const getSalaryAnalytics = async () => {
  const response = await api.get(`${BASE_URL}/analytics`);
  return response.data;
};
