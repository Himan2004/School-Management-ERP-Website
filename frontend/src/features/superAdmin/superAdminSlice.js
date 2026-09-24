import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// Fetch All Schools (Direct Collection Query)
export const getAllSchools = createAsyncThunk(
  "superAdmin/getAllSchools",
  async ({ status = "all", organizationId } = {}, thunkAPI) => {
    try {
      let query = `?status=${status}`;

      if (organizationId) {
        query += `&organizationId=${organizationId}`;
      }

      const res = await api.get(`/super-admin/schools${query}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Fetch School Requests (Pending / Rejected)
export const getSchoolRequests = createAsyncThunk(
  "superAdmin/getSchoolRequests",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/super-admin/requests");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Approve School Request
export const acceptSchoolRequest = createAsyncThunk(
  "superAdmin/acceptSchoolRequest",
  async ({ id, maxStaffLimit, maxStudentLimit }, thunkAPI) => {
    try {
      const res = await api.post(`/super-admin/requests/${id}/accept`, {
        maxStaffLimit,
        maxStudentLimit,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Decline/Reject School Request
export const rejectSchoolRequest = createAsyncThunk(
  "superAdmin/rejectSchoolRequest",
  async ({ id, reason }, thunkAPI) => {
    try {
      const res = await api.post(`/super-admin/requests/${id}/reject`, {
        reason,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Update / Edit School Details
export const updateSchool = createAsyncThunk(
  "superAdmin/updateSchool",
  async ({ id, formData }, thunkAPI) => {
    try {
      const res = await api.put(`/super-admin/schools/${id}`, formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Toggle School Activation Status (Active/Inactive)
export const toggleSchoolStatus = createAsyncThunk(
  "superAdmin/toggleSchoolStatus",
  async ({ id, status }, thunkAPI) => {
    try {
      const res = await api.patch(`/super-admin/schools/${id}/status`, {
        status,
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Permanently Delete School from Registry
export const deleteSchool = createAsyncThunk(
  "superAdmin/deleteSchool",
  async (id, thunkAPI) => {
    try {
      const res = await api.delete(`/super-admin/schools/${id}`);
      return { id, message: res.data.message };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Update Super Admin Profile (name + photo)
export const updateSuperAdminProfile = createAsyncThunk(
  "superAdmin/updateProfile",
  async (formData, thunkAPI) => {
    try {
      const res = await api.patch("/super-admin/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// Get Dashboard Analytics
export const getDashboardAnalytics = createAsyncThunk(
  "superAdmin/getDashboardAnalytics",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/super-admin/dashboard");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data);
    }
  },
);

// -------------------- SLICE -------------------- //

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState: {
    schools: [], // Cleaned up state naming from 'requests' to 'schools'
    requests: [], // List of pending/rejected onboarding requests
    loading: false,
    error: null,
    message: null,
    dashboard: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // -------- GET ALL SCHOOLS --------
      .addCase(getAllSchools.fulfilled, (state, action) => {
        state.schools = action.payload.data;
      })

      // -------- GET SCHOOL REQUESTS --------
      .addCase(getSchoolRequests.fulfilled, (state, action) => {
        state.requests = action.payload.data;
      })

      // -------- ACCEPT SCHOOL REQUEST --------
      .addCase(acceptSchoolRequest.fulfilled, (state, action) => {
        const { id } = action.meta.arg;
        state.requests = state.requests.filter((r) => r._id !== id);
        state.message = action.payload.message || "School request approved successfully";
      })

      // -------- REJECT SCHOOL REQUEST --------
      .addCase(rejectSchoolRequest.fulfilled, (state, action) => {
        const { id } = action.meta.arg;
        state.requests = state.requests.map((r) =>
          r._id === id ? { ...r, status: "rejected" } : r
        );
        state.message = action.payload.message || "School request rejected successfully";
      })

      // -------- UPDATE SCHOOL --------
      .addCase(updateSchool.fulfilled, (state, action) => {
        const updatedSchool = action.payload.data;
        state.schools = state.schools.map((s) =>
          s._id === updatedSchool._id ? updatedSchool : s,
        );
        state.message = action.payload.message || "School updated successfully";
      })

      // -------- TOGGLE STATUS --------
      .addCase(toggleSchoolStatus.fulfilled, (state, action) => {
        const { id } = action.meta.arg;
        state.schools = state.schools.map((s) =>
          s._id === id ? { ...s, isActive: !s.isActive } : s,
        );
        state.message = action.payload.message || "Status updated successfully";
      })

      // -------- DELETE SCHOOL --------
      .addCase(deleteSchool.fulfilled, (state, action) => {
        state.schools = state.schools.filter(
          (s) => s._id !== action.payload.id,
        );
        state.message = action.payload.message || "School removed successfully";
      })

      // -------- UPDATE PROFILE --------
      .addCase(updateSuperAdminProfile.fulfilled, (state, action) => {
        state.message = action.payload.message;
      })

      // -------- GET DASHBOARD ANALYTICS --------
      .addCase(getDashboardAnalytics.fulfilled, (state, action) => {
        state.dashboard = action.payload.data;
      })

      // -------- GLOBAL LOADING --------
      .addMatcher(
        (action) =>
          action.type.startsWith("superAdmin/") &&
          action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
          state.message = null;
        },
      )

      // -------- GLOBAL ERROR --------
      .addMatcher(
        (action) =>
          action.type.startsWith("superAdmin/") &&
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload?.message || "Something went wrong";
        },
      )

      // -------- GLOBAL FULFILLED --------
      .addMatcher(
        (action) =>
          action.type.startsWith("superAdmin/") &&
          action.type.endsWith("/fulfilled"),
        (state) => {
          state.loading = false;
        },
      );
  },
});

export const { clearError, clearMessage } = superAdminSlice.actions;
export default superAdminSlice.reducer;
