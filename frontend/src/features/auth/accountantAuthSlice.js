import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE_URL = "/auth/accountant";

// ─── ASYNC THUNKS ────────────────────────────────────────────────────────────

export const accountantLogin = createAsyncThunk(
    "accountantAuth/login",
    async ({ loginId, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/login`, { loginId, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed.");
        }
    }
);

export const accountantLogout = createAsyncThunk(
    "accountantAuth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post(`${BASE_URL}/logout`);
            return true;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed.");
        }
    }
);

export const getAccountantProfile = createAsyncThunk(
    "accountantAuth/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`${BASE_URL}/me`);
            return data.data || data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
        }
    }
);

export const changeAccountantPassword = createAsyncThunk(
    "accountantAuth/changePassword",
    async (passwordData, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`${BASE_URL}/change-password`, passwordData);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to change password.");
        }
    }
);

export const uploadAccountantAvatarAction = createAsyncThunk(
    "accountantAuth/uploadAvatar",
    async (formData, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`${BASE_URL}/profile/avatar`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to upload avatar.");
        }
    }
);

// ─── HELPER FUNCTION TO EXTRACT ID ──────────────────────────────────────────
// Yeh function check karega ki school ID hai ya Object
const saveSchoolId = (schoolData) => {
    if (!schoolData) return;
    
    // Agar school pehle se string hai toh wahi save karein, 
    // agar object hai toh uski id nikaalein
    const id = typeof schoolData === 'object' 
        ? (schoolData._id || schoolData.id) 
        : schoolData;

    if (id && typeof id === 'string') {
        localStorage.setItem('schoolId', id);
    }
};

// ─── INITIAL STATE ───────────────────────────────────────────────────────────

const initialState = {
    accountant: null,
    isAuthenticated: false,
    loading: {
        login: false,
        logout: false,
        profile: true,
        avatar: false,
    },
    error: {
        login: null,
        logout: null,
        profile: null,
    },
};

// ─── SLICE ────────────────────────────────────────────────────────────────────

const accountantAuthSlice = createSlice({
    name: "accountantAuth",
    initialState,
    reducers: {
        clearErrors(state) {
            state.error = { login: null, logout: null, profile: null };
        },
        setAccountantAuth(state, action) {
            state.accountant = action.payload;
            state.isAuthenticated = true;
            if (action.payload && action.payload.school) {
                saveSchoolId(action.payload.school);
            }
        },
    },
    extraReducers: (builder) => {
        // ── Login ──────────────────────────────────────────────────────────────
        builder
            .addCase(accountantLogin.pending, (state) => {
                state.loading.login = true;
                state.error.login = null;
            })
            .addCase(accountantLogin.fulfilled, (state, action) => {
                state.loading.login = false;
                state.accountant = action.payload;
                state.isAuthenticated = true;

                // FIXED: Use helper to extract string ID
                if (action.payload && action.payload.school) {
                    saveSchoolId(action.payload.school);
                }
            })
            .addCase(accountantLogin.rejected, (state, action) => {
                state.loading.login = false;
                state.error.login = action.payload;
            });

        // ── Logout ─────────────────────────────────────────────────────────────
        builder
            .addCase(accountantLogout.fulfilled, (state) => {
                state.loading.logout = false;
                state.accountant = null;
                state.isAuthenticated = false;
                localStorage.removeItem('schoolId');
            })
            .addCase(accountantLogout.rejected, (state) => {
                state.accountant = null;
                state.isAuthenticated = false;
                localStorage.removeItem('schoolId');
            });

        // ── Get Profile ────────────────────────────────────────────────────────
        builder
            .addCase(getAccountantProfile.fulfilled, (state, action) => {
                state.loading.profile = false;
                state.accountant = action.payload;
                state.isAuthenticated = true;

                // FIXED: Use helper to extract string ID
                if (action.payload && action.payload.school) {
                    saveSchoolId(action.payload.school);
                }
            })
            .addCase(getAccountantProfile.rejected, (state) => {
                state.loading.profile = false;
                state.accountant = null;
                state.isAuthenticated = false;
                localStorage.removeItem('schoolId');
            })
            .addCase(uploadAccountantAvatarAction.pending, (state) => {
                state.loading.avatar = true;
            })
            .addCase(uploadAccountantAvatarAction.fulfilled, (state, action) => {
                state.loading.avatar = false;
                state.accountant = action.payload;
            })
            .addCase(uploadAccountantAvatarAction.rejected, (state) => {
                state.loading.avatar = false;
            });
    },
});

export const { clearErrors, setAccountantAuth } = accountantAuthSlice.actions;

export const selectAccountant = (state) => state.accountantAuth.accountant;
export const selectIsAccountantAuth = (state) => state.accountantAuth.isAuthenticated;
export const selectAccountantLoading = (state) => state.accountantAuth.loading;
export const selectAccountantError = (state) => state.accountantAuth.error;

export default accountantAuthSlice.reducer;




// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import api from "../../services/api";

// const BASE_URL = "/auth/accountant";

// export const accountantLogin = createAsyncThunk(
//     "accountantAuth/login",
//     async ({ loginId, password }, { rejectWithValue }) => {
//         try {
//             const { data } = await api.post(`${BASE_URL}/login`, { loginId, password });
//             return data.user;
//         } catch (err) {
//             return rejectWithValue(err.response?.data?.message || "Login failed.");
//         }
//     }
// );

// export const accountantLogout = createAsyncThunk(
//     "accountantAuth/logout",
//     async (_, { rejectWithValue }) => {
//         try {
//             await api.post(`${BASE_URL}/logout`);
//         } catch (err) {
//             return rejectWithValue(err.response?.data?.message || "Logout failed.");
//         }
//     }
// );

// export const getAccountantProfile = createAsyncThunk(
//     "accountantAuth/getProfile",
//     async (_, { rejectWithValue }) => {
//         try {
//             const { data } = await api.get(`${BASE_URL}/me`);
//             return data.data;
//         } catch (err) {
//             return rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
//         }
//     }
// );

// const initialState = {
//     accountant: null,
//     isAuthenticated: false,

//     loading: {
//         login: false,
//         logout: false,
//         profile: true,
//     },

//     error: {
//         login: null,
//         logout: null,
//         profile: null,
//     },
// };

// const accountantAuthSlice = createSlice({
//     name: "accountantAuth",
//     initialState,
//     reducers: {
//         clearErrors(state) {
//             state.error = { login: null, logout: null, profile: null };
//         },
//     },
//     extraReducers: (builder) => {

//         // ── Login ──────────────────────────────────────────────────────────────
//         builder
//             .addCase(accountantLogin.pending, (state) => {
//                 state.loading.login = true;
//                 state.error.login = null;
//             })
//             .addCase(accountantLogin.fulfilled, (state, action) => {
//                 state.loading.login = false;
//                 state.accountant = action.payload;
//                 state.isAuthenticated = true;
//             })
//             .addCase(accountantLogin.rejected, (state, action) => {
//                 state.loading.login = false;
//                 state.error.login = action.payload;
//             });

//         // ── Logout ─────────────────────────────────────────────────────────────
//         builder
//             .addCase(accountantLogout.pending, (state) => {
//                 state.loading.logout = true;
//                 state.error.logout = null;
//             })
//             .addCase(accountantLogout.fulfilled, (state) => {
//                 state.loading.logout = false;
//                 state.accountant = null;
//                 state.isAuthenticated = false;
//             })
//             .addCase(accountantLogout.rejected, (state, action) => {
//                 state.loading.logout = false;
//                 state.error.logout = action.payload;
//                 state.accountant = null;
//                 state.isAuthenticated = false;
//             });

//         // ── Get Profile ────────────────────────────────────────────────────────
//         builder
//             .addCase(getAccountantProfile.pending, (state) => {
//                 state.loading.profile = true;
//                 state.error.profile = null;
//             })
//             .addCase(getAccountantProfile.fulfilled, (state, action) => {
//                 state.loading.profile = false;
//                 state.accountant = action.payload;
//                 state.isAuthenticated = true;
//             })
//             .addCase(getAccountantProfile.rejected, (state, action) => {
//                 state.loading.profile = false;
//                 state.error.profile = action.payload;
//                 state.accountant = null;
//                 state.isAuthenticated = false;
//             });
//     },
// });

// export const { clearErrors } = accountantAuthSlice.actions;

// export const selectAccountant = (state) => state.accountantAuth.accountant;
// export const selectIsAccountantAuth = (state) => state.accountantAuth.isAuthenticated;
// export const selectAccountantLoading = (state) => state.accountantAuth.loading;
// export const selectAccountantError = (state) => state.accountantAuth.error;

// export default accountantAuthSlice.reducer;