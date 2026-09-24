import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/graphura";

export const graphuraAdminLogin = createAsyncThunk(
    "graphuraAuth/login",
    async ({ email, password, graphuraKey }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, { email, password, graphuraKey });
            return data.admin;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed.");
        }
    }
);

export const graphuraAdminLogout = createAsyncThunk(
    "graphuraAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed.");
        }
    }
);

export const getGraphuraAdminProfile = createAsyncThunk(
    "graphuraAuth/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`${BASE_URL}/me`);
            return data.admin;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
        }
    }
);

export const updateGraphuraProfile = createAsyncThunk(
    "graphuraAuth/updateProfile",
    async (formData, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`${BASE_URL}/update-profile`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return data.admin;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to update profile.");
        }
    }
);

export const updateGraphuraPassword = createAsyncThunk(
    "graphuraAuth/updatePassword",
    async (passwordData, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`${BASE_URL}/update-password`, passwordData);
            return data.message;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to update password.");
        }
    }
);

// ── NEW: Forgot Password Thunk ──────────────────────────────────────────
export const forgotGraphuraPassword = createAsyncThunk(
    "graphuraAuth/forgotPassword",
    async (email, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/forgot-password`, { email });
            return data.message;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to process request.");
        }
    }
);

// ── NEW: Reset Password Thunk ──────────────────────────────────────────
export const resetGraphuraPassword = createAsyncThunk(
    "graphuraAuth/resetPassword",
    async (resetData, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/reset-password`, resetData);
            return data.message;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to reset password.");
        }
    }
);

const initialState = {
    admin: null,
    isAuthenticated: false,
    unreadNotificationsCount: 0,
    usersList: null,
    usersStats: null,

    loading: {
        login: false,
        logout: false,
        profile: true,
        update: false,
        forgot: false,
        reset: false,
    },

    error: {
        login: null,
        logout: null,
        profile: null,
        update: null,
        forgot: null,
        reset: null,
    },
};

const graphuraAuthSlice = createSlice({
    name: "graphuraAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = { login: null, logout: null, profile: null, update: null, forgot: null, reset: null };
        },
        setUnreadNotificationsCount(state, action) {
            state.unreadNotificationsCount = action.payload;
        },
        setUsersList(state, action) {
            state.usersList = action.payload;
        },
        setUsersStats(state, action) {
            state.usersStats = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(graphuraAdminLogin.pending, (state) => { state.loading.login = true; state.error.login = null; })
            .addCase(graphuraAdminLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.admin = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(graphuraAdminLogin.rejected, (state, action) => { state.loading.login = false; state.error.login = action.payload; });

        // Logout
        builder
            .addCase(graphuraAdminLogout.pending, (state) => { state.loading.logout = true; state.error.logout = null; })
            .addCase(graphuraAdminLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.admin = null;
                state.isAuthenticated = false;
            })
            .addCase(graphuraAdminLogout.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload;
                state.admin = null;
                state.isAuthenticated = false;
            });

        // Get Profile
        builder
            .addCase(getGraphuraAdminProfile.pending, (state) => { state.loading.profile = true; state.error.profile = null; })
            .addCase(getGraphuraAdminProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.admin = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(getGraphuraAdminProfile.rejected, (state, action) => {
                state.loading.profile = false;
                state.error.profile = action.payload;
                state.admin = null;
                state.isAuthenticated = false;
            });

        // Update Profile & Password
        builder
            .addCase(updateGraphuraProfile.pending, (state) => { state.loading.update = true; state.error.update = null; })
            .addCase(updateGraphuraProfile.fulfilled, (state, action) => { state.loading.update = false; state.admin = action.payload; })
            .addCase(updateGraphuraProfile.rejected, (state, action) => { state.loading.update = false; state.error.update = action.payload; })
            .addCase(updateGraphuraPassword.pending, (state) => { state.loading.update = true; state.error.update = null; })
            .addCase(updateGraphuraPassword.fulfilled, (state) => { state.loading.update = false; })
            .addCase(updateGraphuraPassword.rejected, (state, action) => { state.loading.update = false; state.error.update = action.payload; });

        // Forgot & Reset Password
        builder
            .addCase(forgotGraphuraPassword.pending, (state) => { state.loading.forgot = true; state.error.forgot = null; })
            .addCase(forgotGraphuraPassword.fulfilled, (state) => { state.loading.forgot = false; })
            .addCase(forgotGraphuraPassword.rejected, (state, action) => { state.loading.forgot = false; state.error.forgot = action.payload; })
            
            .addCase(resetGraphuraPassword.pending, (state) => { state.loading.reset = true; state.error.reset = null; })
            .addCase(resetGraphuraPassword.fulfilled, (state) => { state.loading.reset = false; })
            .addCase(resetGraphuraPassword.rejected, (state, action) => { state.loading.reset = false; state.error.reset = action.payload; });
    },
});

export const {
  clearErrors,
  setUnreadNotificationsCount,
  setUsersList,
  setUsersStats,
} = graphuraAuthSlice.actions;

export const selectUnreadNotificationsCount = (state) => state.graphuraAuth.unreadNotificationsCount;
export const selectUsersList = (state) => state.graphuraAuth.usersList;
export const selectUsersStats = (state) => state.graphuraAuth.usersStats;

export const selectGraphuraAdmin = (state) => state.graphuraAuth.admin;
export const selectIsGraphuraAuth = (state) => state.graphuraAuth.isAuthenticated;
export const selectGraphuraLoading = (state) => state.graphuraAuth.loading;
export const selectGraphuraLoginError = (state) => state.graphuraAuth.error.login;
export const selectGraphuraLoginLoading = (state) => state.graphuraAuth.loading.login;

// 🔥 ADD THESE BACK: Other components in your app are crashing because these went missing!
export const selectGraphuraUpdateLoading = (state) => state.graphuraAuth.loading.update;
export const selectGraphuraError = (state) => state.graphuraAuth.error;
export const selectGraphuraUpdateError = (state) => state.graphuraAuth.error.update;
export const selectGraphuraForgotLoading = (state) => state.graphuraAuth.loading.forgot;
export const selectGraphuraResetLoading = (state) => state.graphuraAuth.loading.reset;

export default graphuraAuthSlice.reducer;