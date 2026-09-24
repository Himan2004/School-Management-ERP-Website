import api from "../api";

export const getPoliciesApi = async () => {
  try {
    const response = await api.get("/superadmin/policies");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch policies" };
  }
};

export const uploadPolicyApi = async (formData) => {
  try {
    const response = await api.post("/superadmin/policies", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to upload policy" };
  }
};

export const updatePolicyStatusApi = async (id, status) => {
  try {
    const response = await api.patch(`/superadmin/policies/${id}/status`, { status });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update policy status" };
  }
};

export const deletePolicyApi = async (id) => {
  try {
    const response = await api.delete(`/superadmin/policies/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete policy" };
  }
};



export const getGovernanceAuditLogsApi = async () => {
  try {
    const response = await api.get("/superadmin/policies/audit-logs");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch audit logs" };
  }
};
