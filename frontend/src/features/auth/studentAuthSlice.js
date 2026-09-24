// studentAuthSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/student";

export const studentLogin = createAsyncThunk(
    "studentAuth/login",
    async ({ loginId, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, { loginId, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed.");
        }
    }
);

export const studentLogout = createAsyncThunk(
    "studentAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed.");
        }
    }
);

export const getStudentProfile = createAsyncThunk(
    "studentAuth/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get("/student/profile");
            return data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
        }
    }
);

const initialState = {
    student: null,
    isAuthenticated: false,

    loading: {
        login: false,
        logout: false,
        profile: true,
    },

    error: {
        login: null,
        logout: null,
        profile: null,
    },
};

const studentAuthSlice = createSlice({
    name: "studentAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = { login: null, logout: null, profile: null };
        },
        setStudentAuth(state, action) {
            state.student = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {

        // ── Login ──────────────────────────────────────────────────────────────
        builder
            .addCase(studentLogin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(studentLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.student = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(studentLogin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload;
            });

        // ── Logout ─────────────────────────────────────────────────────────────
        builder
            .addCase(studentLogout.pending, (state) => {
                state.loading.logout = true;
                state.error.logout = null;
            })
            .addCase(studentLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.student = null;
                state.isAuthenticated = false;
            })
            .addCase(studentLogout.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload;
                state.student = null;
                state.isAuthenticated = false;
            });

        // ── Get Profile ────────────────────────────────────────────────────────
        builder
            .addCase(getStudentProfile.pending, (state) => {
                state.loading.profile = true;
                state.error.profile = null;
            })
            .addCase(getStudentProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.student = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(getStudentProfile.rejected, (state, action) => {
                state.loading.profile = false;
                state.error.profile = action.payload;
                state.student = null;
                state.isAuthenticated = false;
            });
    },
});

export const { clearErrors, setStudentAuth } = studentAuthSlice.actions;

export const selectStudent = (state) => state.studentAuth.student;
export const selectIsStudentAuth = (state) => state.studentAuth.isAuthenticated;
export const selectStudentLoading = (state) => state.studentAuth.loading;
export const selectStudentError = (state) => state.studentAuth.error;

export default studentAuthSlice.reducer;