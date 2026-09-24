import api from "../api";

export const getSubjectTeacherNotificationsApi = async () => {
  try {
    const response = await api.get("/subject-teacher/notifications");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch notifications" };
  }
};

export const markSubjectTeacherNotificationReadApi = async (id) => {
  try {
    const response = await api.patch(`/subject-teacher/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark notification as read" };
  }
};

export const markAllSubjectTeacherNotificationsReadApi = async () => {
  try {
    const response = await api.post("/subject-teacher/notifications/mark-all-read");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark all notifications as read" };
  }
};
