import api from "../api";

export const getAllOrganizations = async ({
    page = 1,
    limit = 10,
    status = "",
    search = ""
} = {}) => {
    const params = new URLSearchParams();

    if (page) params.append("page", page);
    if (limit) params.append("limit", limit);
    if (status) params.append("status", status);
    if (search) params.append("search", search);

    const response = await api.get(`/school/organizations?${params.toString()}`);
    return response.data;
};

export const getBranchesByOrganization = async (organizationId, {
    page = 1,
    limit = 10,
    isActive,
    search = ""
} = {}) => {
    const params = new URLSearchParams();

    if (page) params.append("page", page);
    if (limit) params.append("limit", limit);
    if (isActive !== undefined) params.append("isActive", isActive);
    if (search) params.append("search", search);

    const response = await api.get(`/school/organizations/${organizationId}/branches?${params.toString()}`);
    return response.data;
};

export const submitAdmissionApplication = async (formData) => {
    const response = await api.post(
        "/school/submit-admission",
        formData
    );
    return response.data;
};

export const getOrganizationAddress = async (orgId, branchId) => {
    const response = await api.get(`/school/organizations/${orgId}/branches/${branchId}`);
    return response.data;
};

export const getClassesByOrganization = async (organizationId) => {
    const response = await api.get(`/school/organizations/${organizationId}/classes`);
    return response.data;
};