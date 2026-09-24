import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/principal";

export const principalLogin = createAsyncThunk(
    "principalAuth/login",
    async ({ loginId, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, { loginId, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed.");
        }
    }
);

export const principalLogout = createAsyncThunk(
    "principalAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed.");
        }
    }
);

export const getPrincipalProfile = createAsyncThunk(
    "principalAuth/getProfile",
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
    principal: null,
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

const principalAuthSlice = createSlice({
    name: "principalAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = { login: null, logout: null, profile: null };
        },
        setPrincipalAuth(state, action) {
            state.principal = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {

        // ── Login ──────────────────────────────────────────────────────────────
        builder
            .addCase(principalLogin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(principalLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.principal = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(principalLogin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload;
            });

        // ── Logout ─────────────────────────────────────────────────────────────
        builder
            .addCase(principalLogout.pending, (state) => {
                state.loading.logout = true;
                state.error.logout = null;
            })
            .addCase(principalLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.principal = null;
                state.isAuthenticated = false;
            })
            .addCase(principalLogout.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload;
                state.principal = null;
                state.isAuthenticated = false;
            });

        // ── Get Profile ────────────────────────────────────────────────────────
        builder
            .addCase(getPrincipalProfile.pending, (state) => {
                state.loading.profile = true;
                state.error.profile = null;
            })
            .addCase(getPrincipalProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.principal = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(getPrincipalProfile.rejected, (state, action) => {
                state.loading.profile = false;
                state.error.profile = action.payload;
                state.principal = null;
                state.isAuthenticated = false;
            });
    },
});

export const { clearErrors, setPrincipalAuth } = principalAuthSlice.actions;

export const selectPrincipal = (state) => state.principalAuth.principal;
export const selectIsPrincipalAuth = (state) => state.principalAuth.isAuthenticated;
export const selectPrincipalLoading = (state) => state.principalAuth.loading;
export const selectPrincipalError = (state) => state.principalAuth.error;

export default principalAuthSlice.reducer;