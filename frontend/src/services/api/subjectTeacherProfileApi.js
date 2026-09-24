import api from "../api";

const BASE_URL = "/subject-teacher";

// Get teacher profile
export const getTeacherProfile = async () => {
  const response = await api.get(`${BASE_URL}/profile`);
  return response.data;
};

// Update teacher profile details
export const updateTeacherProfile = async (data) => {
  const response = await api.put(`${BASE_URL}/profile`, data);
  return response.data;
};

// Upload profile avatar/image
export const uploadProfileImage = async (formData) => {
  const response = await api.patch(`${BASE_URL}/profile/image`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Change teacher password
export const changeTeacherPassword = async (data) => {
  const response = await api.patch(`${BASE_URL}/change-password`, data);
  return response.data;
};
