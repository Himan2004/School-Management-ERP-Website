import api from "../api";

export const getGlobalEventsApi = async (params = {}) => {
  try {
    const response = await api.get("/superadmin/events/global", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch global events" };
  }
};

export const getSchoolsForEventDropdown = async () => {
  try {
    const response = await api.get("/superadmin/events/schools");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch schools" };
  }
};

export const createGlobalEventApi = async (payload) => {
  try {
    const response = await api.post("/superadmin/events/global", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to create global event" };
  }
};

export const updateGlobalEventApi = async (id, payload) => {
  try {
    const response = await api.put(`/superadmin/events/global/${id}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update global event" };
  }
};

export const deleteGlobalEventApi = async (id) => {
  try {
    const response = await api.delete(`/superadmin/events/global/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete global event" };
  }
};
