import api from "../api";

export const getPrincipalProfileApi = () =>
  api.get("/principal/profile").then((r) => r.data);

export const updatePrincipalProfileApi = (data) =>
  api.put("/principal/profile", data).then((r) => r.data);

export const uploadPrincipalAvatarApi = (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return api
    .post("/principal/profile/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const removePrincipalAvatarApi = () =>
  api.delete("/principal/profile/avatar").then((r) => r.data);

export const changePrincipalPasswordApi = (data) =>
  api.post("/principal/profile/change-password", data).then((r) => r.data);
