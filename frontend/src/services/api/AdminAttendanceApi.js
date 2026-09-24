import api from "../api";

export const getAdminStaffList = async () => {
  const response = await api.get("/admin/staff");
  return response.data;
};

export const getAdminStaffAttendanceReport = async (params = {}) => {
  const response = await api.get("/admin/staff/attendance/report", { params });
  return response.data;
};

export const saveAdminStaffAttendance = async (payload = {}) => {
  const response = await api.post("/admin/staff/attendance", payload);
  return response.data;
};

export const getAdminStaffPendingLeaves = async () => {
  const response = await api.get("/admin/staff/leaves/pending");
  return response.data;
};

export const processAdminStaffLeave = async (id, payload = {}) => {
  const response = await api.patch(`/admin/staff/leave/${id}/process`, payload);
  return response.data;
};
