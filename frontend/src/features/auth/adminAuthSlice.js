import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// Login
export const loginAdmin = createAsyncThunk(
    "adminAuth/login",
    async (data, thunkAPI) => {
        try {
            const res = await api.post("/auth/admin/login", data);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// Logout (client-side only since no backend logout route)
export const logoutAdmin = createAsyncThunk(
    "adminAuth/logout",
    async (_, thunkAPI) => {
        try {
            const res = await api.post("/auth/admin/logout");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const getAdmin = createAsyncThunk(
    "adminAuth/getAdmin",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/auth/admin/me");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// -------------------- SLICE -------------------- //

const adminAuthSlice = createSlice({
    name: "adminAuth",
    initialState: {
        authUser: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        message: null,
    },
    reducers: {
        clearError: (state) => { state.error = null; },
        clearMessage: (state) => { state.message = null; },
        updateAuthProfile: (state, action) => {
            if (state.authUser) {
                state.authUser.adminProfile = action.payload;
            }
        },
        setAdminAuth: (state, action) => {
            state.authUser = action.payload;
            state.isAuthenticated = true;
        }
    },
    extraReducers: (builder) => {
        builder
            // -------- LOGIN --------
            .addCase(loginAdmin.fulfilled, (state, action) => {
                state.token = action.payload.token;
                state.authUser = action.payload.user;
                state.isAuthenticated = true;
                state.message = action.payload?.message || "Login successful";
                // Store token in localStorage for API interceptor
                localStorage.setItem('token', action.payload.token);
            })
            .addCase(loginAdmin.rejected, (state, action) => {
                state.error = action.payload?.message || "Login failed";
                state.isAuthenticated = false;
            })

            // -------- LOGOUT --------
            .addCase(logoutAdmin.fulfilled, (state) => {
                state.authUser = null;
                state.isAuthenticated = false;
                state.message = "Logged out successfully";
                // Clear token from localStorage
                localStorage.removeItem('token');
            })
            .addCase(logoutAdmin.rejected, (state, action) => {
                state.authUser = null;
                state.isAuthenticated = false;
                state.error = action.payload?.message || "Logout failed";
            })

            .addCase(getAdmin.fulfilled, (state, action) => {
                const data = action.payload.data;
                state.authUser = {
                    _id: data._id || data.id,
                    name: data.name,
                    loginId: data.loginId,
                    email: data.email,
                    role: data.role,
                    school: data.school,
                    status: data.status,
                    profileId: data.profileId,
                    profileModel: data.profileModel,
                    adminProfile: data.adminProfile
                };
                state.isAuthenticated = true;
            })
            .addCase(getAdmin.rejected, (state) => {
                state.authUser = null;
                state.isAuthenticated = false;
            })
            .addCase("admin/updateSettings/fulfilled", (state, action) => {
                if (state.authUser) {
                    const newSchoolName = action.payload.data?.school?.schoolName;
                    if (newSchoolName) {
                        if (state.authUser.school && typeof state.authUser.school === 'object') {
                            state.authUser.school.schoolName = newSchoolName;
                        } else if (!state.authUser.school) {
                            state.authUser.school = { schoolName: newSchoolName };
                        }
                        if (state.authUser.adminProfile) {
                            state.authUser.adminProfile.schoolName = newSchoolName;
                        } else {
                            state.authUser.adminProfile = { schoolName: newSchoolName };
                        }
                    }
                }
            })

            // -------- GLOBAL LOADING --------
            .addMatcher(
                (action) => action.type.startsWith("adminAuth/") && action.type.endsWith("/pending"),
                (state) => {
                    state.loading = true;
                    state.error = null;
                    state.message = null;
                }
            )

            // -------- GLOBAL ERROR --------
            .addMatcher(
                (action) => action.type.startsWith("adminAuth/") && action.type.endsWith("/rejected"),
                (state, action) => {
                    state.loading = false;
                    state.error = action.payload?.message || "Something went wrong";
                }
            )

            // -------- GLOBAL FULFILLED --------
            .addMatcher(
                (action) => action.type.startsWith("adminAuth/") && action.type.endsWith("/fulfilled"),
                (state) => { state.loading = false; }
            );
    },
});

export const { clearError, clearMessage, updateAuthProfile, setAdminAuth } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;