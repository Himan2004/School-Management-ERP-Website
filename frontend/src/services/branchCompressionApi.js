import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/superadmin",
  withCredentials: true,
});



export const getAllBranchesAPI = async (params) => {
  const response = await API.get("/analytics/branches/all", { params });
  return response.data;
};

export const getLowPerformingBranchesAPI = async () => {
  const response = await API.get("/analytics/branches/low-performing");
  return response.data;
};

export const compareBranchesAPI = async (leftBranchId, rightBranchId, params) => {
  const response = await API.get(
    `/analytics/branches/compare?leftBranchId=${leftBranchId}&rightBranchId=${rightBranchId}`,
    { params }
  );

  return response.data;
};

export const getBranchDetailsAPI = async (branchId) => {
  const response = await API.get(`/analytics/branches/${branchId}/details`);
  return response.data;
};