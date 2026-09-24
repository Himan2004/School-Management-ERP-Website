import api from "../api";

const BASE_URL = "/parent/student/profile";

export const getParentStudentProfileApi = async () => {
  try {
    const studentId = localStorage.getItem("studentId");
    const config = studentId ? { params: { student_id: studentId } } : {};
    const response = await api.get(BASE_URL, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch student profile" };
  }
};

export const updateParentStudentProfileApi = async (payload) => {
  try {
    const studentId = localStorage.getItem("studentId");
    const config = studentId ? { params: { student_id: studentId } } : {};
    const response = await api.put(BASE_URL, payload, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update student profile" };
  }
};
