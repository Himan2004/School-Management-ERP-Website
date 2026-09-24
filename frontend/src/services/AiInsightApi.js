import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api/superadmin',
  withCredentials: true,
});

export const getRiskAnalysis = () => API.get('/analytics/ai/risk-analysis');
export const getPredictions = () => API.get('/analytics/ai/predictions');
export const getRecommendations = () => API.get('/analytics/ai/recommendations');
export const getHeatmapData = () => API.get('/analytics/ai/heatmap');

export default API;