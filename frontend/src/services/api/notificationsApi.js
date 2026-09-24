import api from "../api";

export const getGlobalAlertsApi = async (params = {}) => {
  try {
    const response = await api.get("/superadmin/notifications/global", {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch global alerts" };
  }
};

export const createGlobalAlertApi = async (payload) => {
  try {
    const response = await api.post(
      "/superadmin/notifications/global",
      payload,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to create global alert" };
  }
};

export const deleteGlobalAlertApi = async (id) => {
  try {
    const response = await api.delete(`/superadmin/notifications/global/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete global alert" };
  }
};

export const getAcademicAlertsApi = async (params = {}) => {
  try {
    const response = await api.get("/superadmin/notifications/academic", {
      params,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Failed to fetch academic alerts" }
    );
  }
};

export const getComplianceAlertsApi = async (params = {}) => {
  try {
    const response = await api.get("/superadmin/notifications/compliance", {
      params,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Failed to fetch compliance alerts" }
    );
  }
};
export const fetchPrincipalNotifications = async () => {
  try {
    // Assuming backend sorts by { createdAt: -1 } and limits to ~20-50
    const response = await api.get("/principal/notifications");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markNotificationAsRead = async (id) => {
  try {
    const response = await api.patch(`/principal/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.patch("/principal/notifications/read-all");
    return response.data;
  } catch (error) {
    throw error;
  }
};
