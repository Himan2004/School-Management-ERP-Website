import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/teacher";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const teacherLogin = createAsyncThunk(
    "teacherAuth/login",
    async ({ loginId, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, {
                loginId,
                password,
            });
            return data.user;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Login failed."
            );
        }
    }
);

export const teacherLogout = createAsyncThunk(
    "teacherAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
            return true;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Logout failed."
            );
        }
    }
);

export const getTeacherProfile = createAsyncThunk(
    "teacherAuth/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`${BASE_URL}/me`);
            return data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Failed to fetch profile."
            );
        }
    }
);

export const updateTeacherPassword = createAsyncThunk(
    "teacherAuth/updatePassword",
    async ({ currentPassword, newPassword }, { rejectWithValue }) => {
        try {
            const { data } = await api.patch(`${BASE_URL}/update-password`, {
                currentPassword,
                newPassword,
            });
            return data.message;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Password update failed."
            );
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
    teacher: null,
    isAuthenticated: false,

    loading: {
        login: false,
        logout: false,
        profile: true,
        updatePassword: false,
    },

    error: {
        login: null,
        logout: null,
        profile: null,
        updatePassword: null,
    },

    passwordUpdateSuccess: false,
};

const teacherAuthSlice = createSlice({
    name: "teacherAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = {
                login: null,
                logout: null,
                profile: null,
                updatePassword: null,
            };
        },
        clearPasswordUpdateSuccess(state) {
            state.passwordUpdateSuccess = false;
        },
        setTeacherAuth(state, action) {
            state.teacher = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        // ── Login ──────────────────────────────────────────────────────────────
        builder
            .addCase(teacherLogin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(teacherLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.teacher = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(teacherLogin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload;
            });

        // ── Logout ─────────────────────────────────────────────────────────────
        builder
            .addCase(teacherLogout.pending, (state) => {
                state.loading.logout = true;
                state.error.logout = null;
            })
            .addCase(teacherLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.teacher = null;
                state.isAuthenticated = false;
            })
            .addCase(teacherLogout.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload;
                // clear local state even if server call failed
                state.teacher = null;
                state.isAuthenticated = false;
            });

        // ── Get Profile ────────────────────────────────────────────────────────
        builder
            .addCase(getTeacherProfile.pending, (state) => {
                state.loading.profile = true;
                state.error.profile = null;
            })
            .addCase(getTeacherProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.teacher = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(getTeacherProfile.rejected, (state, action) => {
                state.loading.profile = false;
                state.error.profile = action.payload;
                // expired / invalid cookie → treat as logged out
                state.teacher = null;
                state.isAuthenticated = false;
            });

        // ── Update Password ────────────────────────────────────────────────────
        builder
            .addCase(updateTeacherPassword.pending, (state) => {
                state.loading.updatePassword = true;
                state.error.updatePassword = null;
                state.passwordUpdateSuccess = false;
            })
            .addCase(updateTeacherPassword.fulfilled, (state) => {
                state.loading.updatePassword = false;
                state.passwordUpdateSuccess = true;
            })
            .addCase(updateTeacherPassword.rejected, (state, action) => {
                state.loading.updatePassword = false;
                state.error.updatePassword = action.payload;
            });
    },
});

export const { clearErrors, clearPasswordUpdateSuccess, setTeacherAuth } =
    teacherAuthSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectTeacher = (state) => state.teacherAuth.teacher;
export const selectIsTeacherAuth = (state) => state.teacherAuth.isAuthenticated;
export const selectTeacherLoading = (state) => state.teacherAuth.loading;
export const selectTeacherError = (state) => state.teacherAuth.error;
export const selectPasswordUpdateSuccess = (state) => state.teacherAuth.passwordUpdateSuccess;

export default teacherAuthSlice.reducer;