import api from "../api";

const parseError = (error, message) => {
  throw error.response?.data || { message };
};

export const getPrincipalNoticesApi = async (params = {}) => {
  try {
    const response = await api.get("/principal/notices", { params });
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch notices");
  }
};

export const getPrincipalNoticeStatsApi = async () => {
  try {
    const response = await api.get("/principal/notices/stats");
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch notice stats");
  }
};

export const createPrincipalNoticeApi = async (data) => {
  try {
    const response = await api.post("/principal/notices", data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to create notice");
  }
};

export const updatePrincipalNoticeApi = async (id, data) => {
  try {
    const response = await api.put(`/principal/notices/${id}`, data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to update notice");
  }
};

export const deletePrincipalNoticeApi = async (id) => {
  try {
    const response = await api.delete(`/principal/notices/${id}`);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to delete notice");
  }
};

export const togglePinPrincipalNoticeApi = async (id) => {
  try {
    const response = await api.patch(`/principal/notices/${id}/pin`);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to toggle notice pin");
  }
};

export const uploadNoticeAttachmentsApi = async (noticeId, files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("attachments", file));
    const response = await api.post(`/principal/notices/${noticeId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    parseError(error, "Failed to upload notice attachments");
  }
};

export const getPrincipalEventsApi = async (params = {}) => {
  try {
    const response = await api.get("/principal/events", { params });
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch events");
  }
};

export const getPrincipalEventStatsApi = async () => {
  try {
    const response = await api.get("/principal/events/stats");
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch event stats");
  }
};

export const createPrincipalEventApi = async (data) => {
  try {
    const response = await api.post("/principal/events", data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to create event");
  }
};

export const updatePrincipalEventApi = async (id, data) => {
  try {
    const response = await api.put(`/principal/events/${id}`, data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to update event");
  }
};

export const deletePrincipalEventApi = async (id) => {
  try {
    const response = await api.delete(`/principal/events/${id}`);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to delete event");
  }
};

export const uploadEventPhotosApi = async (eventId, files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));
    const response = await api.post(`/principal/events/${eventId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    parseError(error, "Failed to upload event photos");
  }
};

export const getPrincipalMeetingsApi = async (params = {}) => {
  try {
    const response = await api.get("/principal/meetings", { params });
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch meetings");
  }
};

export const getPrincipalMeetingStatsApi = async () => {
  try {
    const response = await api.get("/principal/meetings/stats");
    return response.data;
  } catch (error) {
    parseError(error, "Failed to fetch meeting stats");
  }
};

export const createPrincipalMeetingApi = async (data) => {
  try {
    const response = await api.post("/principal/meetings", data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to create meeting");
  }
};

export const updatePrincipalMeetingApi = async (id, data) => {
  try {
    const response = await api.put(`/principal/meetings/${id}`, data);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to update meeting");
  }
};

export const cancelPrincipalMeetingApi = async (id) => {
  try {
    const response = await api.patch(`/principal/meetings/${id}/cancel`);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to cancel meeting");
  }
};

export const deletePrincipalMeetingApi = async (id) => {
  try {
    const response = await api.delete(`/principal/meetings/${id}`);
    return response.data;
  } catch (error) {
    parseError(error, "Failed to delete meeting");
  }
};

export const getPTMFeedbackData = async (params = {}) => {
  try {
    const response = await api.get('/principal/ptm-feedback', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getPTMFeedbackData:', error);
    return { success: false, data: [], message: error.message };
  }
};

export const updatePTMFeedback = async (id, data) => {
  try {
    const response = await api.put(`/principal/ptm-feedback/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error in updatePTMFeedback:', error);
    return { success: false, message: error.message };
  }
};

export const sendParentDirectMessage = async (id, data) => {
  try {
    const response = await api.post(`/principal/ptm-feedback/${id}/message`, data);
    return response.data;
  } catch (error) {
    console.error('Error in sendParentDirectMessage:', error);
    return { success: false, message: error.message };
  }
};
