import api from "../api";

export const getPrincipalTeachers = async (params = {}) => {
  const response = await api.get("/principal/teachers", { params });
  return response.data;
};

export const getPrincipalTeacherById = async (id) => {
  const response = await api.get(`/principal/teachers/${id}`);
  return response.data;
};

export const createPrincipalTeacher = async (payload) => {
  const response = await api.post("/principal/teachers", payload);
  return response.data;
};

export const updatePrincipalTeacher = async (id, payload) => {
  const response = await api.put(`/principal/teachers/${id}`, payload);
  return response.data;
};

export const updatePrincipalTeacherStatus = async (id, status) => {
  const response = await api.patch(`/principal/teachers/${id}/status`, { status });
  return response.data;
};

export const deletePrincipalTeacher = async (id) => {
  const response = await api.delete(`/principal/teachers/${id}`);
  return response.data;
};

export const getPrincipalTeacherSchedule = async (params = {}) => {
  const response = await api.get("/principal/teachers/schedule", { params });
  return response.data;
};
