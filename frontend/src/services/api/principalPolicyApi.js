import api from "../api";

/**
 * Get all policies for the principal's school organization (read-only view)
 * @route GET /api/principal/settings/policies
 */
export const getPrincipalPolicies = async () => {
  try {
    const response = await api.get("/principal/settings/policies");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch policies" };
  }
};

/**
 * Get a single policy by ID
 * @route GET /api/principal/settings/policies/:id
 */
export const getPrincipalPolicyById = async (id) => {
  try {
    const response = await api.get(`/principal/settings/policies/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch policy" };
  }
};
