import api from "../api";

export const addAccountant = async (formData) => {
    const response = await api.post("/admin/add-accountant", formData);
    return response.data;
};