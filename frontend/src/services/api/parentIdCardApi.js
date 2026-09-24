import api from "../api";

const BASE_URL = "/parent/student/idcard";

export const getParentStudentIdCardApi = async () => {
  try {
    const studentId = localStorage.getItem("studentId");
    const config = studentId ? { params: { student_id: studentId } } : {};
    const response = await api.get(BASE_URL, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch ID card" };
  }
};

export const requestParentIdCardReissueApi = async (payload) => {
  try {
    const studentId = localStorage.getItem("studentId");
    const config = studentId ? { params: { student_id: studentId } } : {};
    const response = await api.post(`${BASE_URL}/reissue`, payload, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to submit reissue request" };
  }
};
