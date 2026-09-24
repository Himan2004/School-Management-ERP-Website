import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const registerSuperAdmin = createAsyncThunk(
    "auth/registerSuperAdmin",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/create-request", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const loginSuperAdmin = createAsyncThunk(
    "auth/loginSuperAdmin",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/login", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const logoutSuperAdmin = createAsyncThunk(
    "auth/logoutSuperAdmin",
    async (_, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/logout");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const getSuperAdmin = createAsyncThunk(
    "auth/getSuperAdmin",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/auth/super-admin/me");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updatePassword = createAsyncThunk(
    "auth/updatePassword",
    async (data, thunkAPI) => {
        try {
            const res = await api.put("/auth/super-admin/updatepassword", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const forgotPassword = createAsyncThunk(
    "auth/forgotPassword",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/forgot-password", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const verifyOTPAndResetPassword = createAsyncThunk(
    "auth/verifyOTPAndResetPassword",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/verify-otp-and-reset", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const resendOTP = createAsyncThunk(
    "auth/resendOTP",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/super-admin/resend-otp", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    authUser: null,
    isAuthenticated: false,
    otpSent: false,
    passwordResetSuccess: false,
    message: null,

    loading: {
        register: false,
        login: false,
        logout: false,
        getMe: false,
        updatePassword: false,
        forgotPassword: false,
        verifyOTP: false,
        resendOTP: false,
    },

    error: {
        register: null,
        login: null,
        logout: null,
        getMe: null,
        updatePassword: null,
        forgotPassword: null,
        verifyOTP: null,
        resendOTP: null,
    },
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = { ...initialState.error };
        },
        clearMessage: (state) => {
            state.message = null;
        },
        resetFlags: (state) => {
            state.otpSent = false;
            state.passwordResetSuccess = false;
        },
        setSuperAdminAuth: (state, action) => {
            state.authUser = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        builder

            // ── Register ──────────────────────────────────────────────────
            .addCase(registerSuperAdmin.pending, (state) => {
                state.loading.register = true;
                state.error.register = null;
            })
            .addCase(registerSuperAdmin.fulfilled, (state, action) => {
                state.loading.register = false;
                state.message = action.payload.message;
            })
            .addCase(registerSuperAdmin.rejected, (state, action) => {
                state.loading.register = false;
                state.error.register = action.payload?.message || "Registration failed";
            })

            // ── Login ─────────────────────────────────────────────────────
            .addCase(loginSuperAdmin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(loginSuperAdmin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.authUser = action.payload.data;
                state.isAuthenticated = true;
                state.message = action.payload.message || "Login successful";
            })
            .addCase(loginSuperAdmin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload?.message || "Login failed";
            })

            // ── Logout ────────────────────────────────────────────────────
            .addCase(logoutSuperAdmin.pending, (state) => {
                state.loading.logout = true;
                state.error.logout = null;
            })
            .addCase(logoutSuperAdmin.fulfilled, (state) => {
                state.loading.logout = false;
                state.authUser = null;
                state.isAuthenticated = false;
            })
            .addCase(logoutSuperAdmin.rejected, (state, action) => {
                state.loading.logout = false;
                state.error.logout = action.payload?.message;
                // still clear local state even if server call failed
                state.authUser = null;
                state.isAuthenticated = false;
            })

            // ── Get Me ────────────────────────────────────────────────────
            .addCase(getSuperAdmin.pending, (state) => {
                state.loading.getMe = true;
                state.error.getMe = null;
            })
            .addCase(getSuperAdmin.fulfilled, (state, action) => {
                state.loading.getMe = false;
                state.authUser = action.payload.data;
                state.isAuthenticated = true;
            })
            .addCase(getSuperAdmin.rejected, (state, action) => {
                state.loading.getMe = false;
                state.error.getMe = action.payload?.message;
                state.authUser = null;
                state.isAuthenticated = false;
            })

            // ── Update Password ───────────────────────────────────────────
            .addCase(updatePassword.pending, (state) => {
                state.loading.updatePassword = true;
                state.error.updatePassword = null;
            })
            .addCase(updatePassword.fulfilled, (state, action) => {
                state.loading.updatePassword = false;
                state.message = action.payload.message;
            })
            .addCase(updatePassword.rejected, (state, action) => {
                state.loading.updatePassword = false;
                state.error.updatePassword = action.payload?.message;
            })

            // ── Forgot Password ───────────────────────────────────────────
            .addCase(forgotPassword.pending, (state) => {
                state.loading.forgotPassword = true;
                state.error.forgotPassword = null;
            })
            .addCase(forgotPassword.fulfilled, (state, action) => {
                state.loading.forgotPassword = false;
                state.otpSent = true;
                state.message = action.payload.message;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.loading.forgotPassword = false;
                state.error.forgotPassword = action.payload?.message;
            })

            // ── Verify OTP + Reset Password ───────────────────────────────
            .addCase(verifyOTPAndResetPassword.pending, (state) => {
                state.loading.verifyOTP = true;
                state.error.verifyOTP = null;
            })
            .addCase(verifyOTPAndResetPassword.fulfilled, (state, action) => {
                state.loading.verifyOTP = false;
                state.passwordResetSuccess = true;
                state.authUser = action.payload.data;  // ← add
                state.isAuthenticated = true;           // ← add
                state.message = action.payload.message;
            })
            .addCase(verifyOTPAndResetPassword.rejected, (state, action) => {
                state.loading.verifyOTP = false;
                state.error.verifyOTP = action.payload?.message;
            })

            // ── Resend OTP ────────────────────────────────────────────────
            .addCase(resendOTP.pending, (state) => {
                state.loading.resendOTP = true;
                state.error.resendOTP = null;
            })
            .addCase(resendOTP.fulfilled, (state, action) => {
                state.loading.resendOTP = false;
                state.message = action.payload.message;
            })
            .addCase(resendOTP.rejected, (state, action) => {
                state.loading.resendOTP = false;
                state.error.resendOTP = action.payload?.message;
            });
    },
});

export const { clearError, clearMessage, resetFlags, setSuperAdminAuth } = authSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSuperAdmin = (state) => state.superAuth.authUser;
export const selectIsSuperAuthenticated = (state) => state.superAuth.isAuthenticated;
export const selectSuperLoading = (state) => state.superAuth.loading;
export const selectSuperError = (state) => state.superAuth.error;
export const selectSuperMessage = (state) => state.superAuth.message;
export const selectOtpSent = (state) => state.superAuth.otpSent;
export const selectPasswordResetSuccess = (state) => state.superAuth.passwordResetSuccess;

export default authSlice.reducer;