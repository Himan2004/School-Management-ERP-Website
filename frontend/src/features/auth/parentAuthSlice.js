// parentAuthSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/parent";

export const parentLogin = createAsyncThunk(
    "parentAuth/login",
    async ({ loginId, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, { loginId, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed.");
        }
    }
);

export const parentLogout = createAsyncThunk(
    "parentAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed.");
        }
    }
);

export const getParentProfile = createAsyncThunk(
    "parentAuth/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`${BASE_URL}/me`);
            return data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
        }
    }
);

const initialState = {
    parent: null,
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

const parentAuthSlice = createSlice({
    name: "parentAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = { login: null, logout: null, profile: null };
        },
        setParentAuth(state, action) {
            state.parent = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {

        // ── Login ──────────────────────────────────────────────────────────────
        builder
            .addCase(parentLogin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(parentLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.parent = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(parentLogin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload;
            });

        // ── Logout ─────────────────────────────────────────────────────────────
        builder
            .addCase(parentLogout.pending, (state) => {
                state.loading.logout = true;
                state.error.logout = null;
            })
            .addCase(parentLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.parent = null;
                state.isAuthenticated = false;
            })
            .addCase(parentLogout.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload;
                state.parent = null;
                state.isAuthenticated = false;
            });

        // ── Get Profile ────────────────────────────────────────────────────────
        builder
            .addCase(getParentProfile.pending, (state) => {
                state.loading.profile = true;
                state.error.profile = null;
            })
            .addCase(getParentProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.parent = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(getParentProfile.rejected, (state, action) => {
                state.loading.profile = false;
                state.error.profile = action.payload;
                state.parent = null;
                state.isAuthenticated = false;
            });
    },
});

export const { clearErrors, setParentAuth } = parentAuthSlice.actions;

export const selectParent = (state) => state.parentAuth.parent;
export const selectIsParentAuth = (state) => state.parentAuth.isAuthenticated;
export const selectParentLoading = (state) => state.parentAuth.loading;
export const selectParentError = (state) => state.parentAuth.error;

export default parentAuthSlice.reducer;