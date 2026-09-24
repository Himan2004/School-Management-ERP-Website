import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const getDashboardStats = createAsyncThunk(
    "admin/getDashboardStats",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/dashboard-stats");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const fetchDashboardStats = getDashboardStats;

export const addStudent = createAsyncThunk(
    "admin/addStudent",
    async (studentData, thunkAPI) => {
        try {
            const res = await api.post("/admin/students", studentData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const addSubject = createAsyncThunk(
    "admin/addSubject",
    async (subjectData, thunkAPI) => {
        try {
            const res = await api.post("/admin/subjects", subjectData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const addStaff = createAsyncThunk(
    "admin/addStaff",
    async (staffData, thunkAPI) => {
        try {
            const res = await api.post("/admin/staff", staffData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updatePreviousStats = createAsyncThunk(
    "admin/updatePreviousStats",
    async (statsData, thunkAPI) => {
        try {
            const res = await api.put("/admin/previous-stats", statsData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updateAdminProfile = createAsyncThunk(
    "admin/updateProfile",
    async (profileData, thunkAPI) => {
        try {
            const res = await api.put("/admin/profile/update", profileData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const changeAdminPassword = createAsyncThunk(
    "admin/changePassword",
    async (passwordData, thunkAPI) => {
        try {
            const res = await api.put("/admin/change-password", passwordData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const getAdminSettings = createAsyncThunk(
    "admin/getSettings",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/settings");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updateAdminSettings = createAsyncThunk(
    "admin/updateSettings",
    async (settingsData, thunkAPI) => {
        try {
            const res = await api.put("/admin/settings/update", settingsData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const fetchDashboardEvents = createAsyncThunk(
    "admin/fetchDashboardEvents",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/events/upcoming");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const fetchDashboardActivities = createAsyncThunk(
    "admin/fetchDashboardActivities",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/dashboard/activities");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const fetchAttendanceAnalytics = createAsyncThunk(
    "admin/fetchAttendanceAnalytics",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/attendance/dashboard-stats");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const getAllTeachers = createAsyncThunk(
    "admin/getAllTeachers",
    async (_, thunkAPI) => {
        try {
            const res = await api.get("/admin/staff");
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const createTeacher = createAsyncThunk(
    "admin/createTeacher",
    async (teacherData, thunkAPI) => {
        try {
            const res = await api.post("/admin/teachers", teacherData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const assignTeacher = createAsyncThunk(
    "admin/assignTeacher",
    async ({ id, assignedClass, subjects }, thunkAPI) => {
        try {
            const res = await api.patch(`/admin/teachers/${id}/assign`, { assignedClasses: assignedClass ? [assignedClass] : [], subjects });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updateTeacher = createAsyncThunk(
    "admin/updateTeacher",
    async ({ id, ...updates }, thunkAPI) => {
        try {
            const res = await api.patch(`/admin/teachers/${id}`, updates);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const deleteTeacher = createAsyncThunk(
    "admin/deleteTeacher",
    async (id, thunkAPI) => {
        try {
            const res = await api.delete(`/admin/teachers/${id}`);
            return { ...res.data, id };
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ─── Task Thunks ──────────────────────────────────────────────────────────────

export const getAllTasks = createAsyncThunk(
    "admin/getAllTasks",
    async (params = {}, thunkAPI) => {
        try {
            const res = await api.get("/admin/tasks", { params });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const createTaskThunk = createAsyncThunk(
    "admin/createTask",
    async (taskData, thunkAPI) => {
        try {
            const res = await api.post("/admin/tasks", taskData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const updateTaskThunk = createAsyncThunk(
    "admin/updateTask",
    async ({ id, ...taskData }, thunkAPI) => {
        try {
            const res = await api.put(`/admin/tasks/${id}`, taskData);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

export const deleteTaskThunk = createAsyncThunk(
    "admin/deleteTask",
    async (id, thunkAPI) => {
        try {
            const res = await api.delete(`/admin/tasks/${id}`);
            return { ...res.data, id };
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    dashboardStats: null,
    stats: {},
    events: [],
    activities: [],
    attendance: {},
    students: [],
    subjects: [],
    staff: [],
    previousStats: null,
    profile: null,
    settings: null,
    teachers: [],
    tasks: [],
    message: null,
    financeStats: null,
    notices: [],
    leaveRequests: [],
    pendingApprovalsCount: null,
    dashboardLoaded: false,

    loading: {
        dashboardStats: false,
        fetchDashboardStats: false,
        fetchDashboardEvents: false,
        fetchDashboardActivities: false,
        fetchAttendanceAnalytics: false,
        addStudent: false,
        addSubject: false,
        addStaff: false,
        previousStats: false,
        updateProfile: false,
        changePassword: false,
        settings: false,
        updateSettings: false,
        getAllTeachers: false,
        createTeacher: false,
        assignTeacher: false,
        updateTeacher: false,
        deleteTeacher: false,
        getAllTasks: false,
        createTask: false,
        updateTask: false,
        deleteTask: false,
    },

    error: {
        dashboardStats: null,
        fetchDashboardStats: null,
        fetchDashboardEvents: null,
        fetchDashboardActivities: null,
        fetchAttendanceAnalytics: null,
        addStudent: null,
        addSubject: null,
        addStaff: null,
        previousStats: null,
        updateProfile: null,
        changePassword: null,
        settings: null,
        updateSettings: null,
        getAllTeachers: null,
        createTeacher: null,
        assignTeacher: null,
        updateTeacher: null,
        deleteTeacher: null,
        getAllTasks: null,
        createTask: null,
        updateTask: null,
        deleteTask: null,
    },
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
    name: "admin",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = { ...initialState.error };
        },
        clearMessage: (state) => {
            state.message = null;
        },
        setFinanceStats: (state, action) => {
            state.financeStats = action.payload;
        },
        setNotices: (state, action) => {
            state.notices = action.payload;
        },
        setLeaveRequests: (state, action) => {
            state.leaveRequests = action.payload;
        },
        setPendingApprovalsCount: (state, action) => {
            state.pendingApprovalsCount = action.payload;
        },
        setDashboardLoaded: (state, action) => {
            state.dashboardLoaded = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder

            // ── Dashboard Stats ───────────────────────────────────────────
            .addCase(getDashboardStats.pending, (state) => {
                state.loading.dashboardStats = true;
                state.loading.fetchDashboardStats = true;
                state.error.dashboardStats = null;
                state.error.fetchDashboardStats = null;
            })
            .addCase(getDashboardStats.fulfilled, (state, action) => {
                state.loading.dashboardStats = false;
                state.loading.fetchDashboardStats = false;
                state.dashboardStats = action.payload.data;
                state.stats = action.payload.data || {};
            })
            .addCase(getDashboardStats.rejected, (state, action) => {
                state.loading.dashboardStats = false;
                state.loading.fetchDashboardStats = false;
                state.error.dashboardStats = action.payload?.message;
                state.error.fetchDashboardStats = action.payload?.message;
            })

            // ── Fetch Dashboard Events ─────────────────────────────────────
            .addCase(fetchDashboardEvents.pending, (state) => {
                state.loading.fetchDashboardEvents = true;
                state.error.fetchDashboardEvents = null;
            })
            .addCase(fetchDashboardEvents.fulfilled, (state, action) => {
                state.loading.fetchDashboardEvents = false;
                state.events = action.payload.data || [];
            })
            .addCase(fetchDashboardEvents.rejected, (state, action) => {
                state.loading.fetchDashboardEvents = false;
                state.error.fetchDashboardEvents = action.payload?.message;
            })

            // ── Fetch Dashboard Activities ─────────────────────────────────
            .addCase(fetchDashboardActivities.pending, (state) => {
                state.loading.fetchDashboardActivities = true;
                state.error.fetchDashboardActivities = null;
            })
            .addCase(fetchDashboardActivities.fulfilled, (state, action) => {
                state.loading.fetchDashboardActivities = false;
                state.activities = action.payload.data || [];
            })
            .addCase(fetchDashboardActivities.rejected, (state, action) => {
                state.loading.fetchDashboardActivities = false;
                state.error.fetchDashboardActivities = action.payload?.message;
            })

            // ── Fetch Attendance Analytics ──────────────────────────────────
            .addCase(fetchAttendanceAnalytics.pending, (state) => {
                state.loading.fetchAttendanceAnalytics = true;
                state.error.fetchAttendanceAnalytics = null;
            })
            .addCase(fetchAttendanceAnalytics.fulfilled, (state, action) => {
                state.loading.fetchAttendanceAnalytics = false;
                state.attendance = action.payload.data || {};
            })
            .addCase(fetchAttendanceAnalytics.rejected, (state, action) => {
                state.loading.fetchAttendanceAnalytics = false;
                state.error.fetchAttendanceAnalytics = action.payload?.message;
            })

            // ── Add Student ───────────────────────────────────────────────
            .addCase(addStudent.pending, (state) => {
                state.loading.addStudent = true;
                state.error.addStudent = null;
            })
            .addCase(addStudent.fulfilled, (state, action) => {
                state.loading.addStudent = false;
                if (action.payload.data) state.students.push(action.payload.data);
                state.message = action.payload.message;
            })
            .addCase(addStudent.rejected, (state, action) => {
                state.loading.addStudent = false;
                state.error.addStudent = action.payload?.message;
            })

            // ── Add Subject ───────────────────────────────────────────────
            .addCase(addSubject.pending, (state) => {
                state.loading.addSubject = true;
                state.error.addSubject = null;
            })
            .addCase(addSubject.fulfilled, (state, action) => {
                state.loading.addSubject = false;
                if (action.payload.data) state.subjects.push(action.payload.data);
                state.message = action.payload.message;
            })
            .addCase(addSubject.rejected, (state, action) => {
                state.loading.addSubject = false;
                state.error.addSubject = action.payload?.message;
            })

            // ── Add Staff ─────────────────────────────────────────────────
            .addCase(addStaff.pending, (state) => {
                state.loading.addStaff = true;
                state.error.addStaff = null;
            })
            .addCase(addStaff.fulfilled, (state, action) => {
                state.loading.addStaff = false;
                if (action.payload.data) state.staff.push(action.payload.data);
                state.message = action.payload.message;
            })
            .addCase(addStaff.rejected, (state, action) => {
                state.loading.addStaff = false;
                state.error.addStaff = action.payload?.message;
            })

            // ── Update Previous Stats ─────────────────────────────────────
            .addCase(updatePreviousStats.pending, (state) => {
                state.loading.previousStats = true;
                state.error.previousStats = null;
            })
            .addCase(updatePreviousStats.fulfilled, (state, action) => {
                state.loading.previousStats = false;
                state.previousStats = action.payload.data;
                state.message = action.payload.message;
            })
            .addCase(updatePreviousStats.rejected, (state, action) => {
                state.loading.previousStats = false;
                state.error.previousStats = action.payload?.message;
            })

            // ── Update Profile ────────────────────────────────────────────
            .addCase(updateAdminProfile.pending, (state) => {
                state.loading.updateProfile = true;
                state.error.updateProfile = null;
            })
            .addCase(updateAdminProfile.fulfilled, (state, action) => {
                state.loading.updateProfile = false;
                state.profile = action.payload.data;
                state.message = action.payload.message;
            })
            .addCase(updateAdminProfile.rejected, (state, action) => {
                state.loading.updateProfile = false;
                state.error.updateProfile = action.payload?.message;
            })

            // ── Change Password ───────────────────────────────────────────
            .addCase(changeAdminPassword.pending, (state) => {
                state.loading.changePassword = true;
                state.error.changePassword = null;
            })
            .addCase(changeAdminPassword.fulfilled, (state, action) => {
                state.loading.changePassword = false;
                state.message = action.payload.message;
            })
            .addCase(changeAdminPassword.rejected, (state, action) => {
                state.loading.changePassword = false;
                state.error.changePassword = action.payload?.message;
            })

            // ── Get Settings ──────────────────────────────────────────────
            .addCase(getAdminSettings.pending, (state) => {
                state.loading.settings = true;
                state.error.settings = null;
            })
            .addCase(getAdminSettings.fulfilled, (state, action) => {
                state.loading.settings = false;
                state.settings = action.payload.data;
            })
            .addCase(getAdminSettings.rejected, (state, action) => {
                state.loading.settings = false;
                state.error.settings = action.payload?.message;
            })

            // ── Update Settings ───────────────────────────────────────────
            .addCase(updateAdminSettings.pending, (state) => {
                state.loading.updateSettings = true;
                state.error.updateSettings = null;
            })
            .addCase(updateAdminSettings.fulfilled, (state, action) => {
                state.loading.updateSettings = false;
                state.settings = action.payload.data;
                state.message = action.payload.message;
            })
            .addCase(updateAdminSettings.rejected, (state, action) => {
                state.loading.updateSettings = false;
                state.error.updateSettings = action.payload?.message;
            })

            // ── Get All Teachers ──────────────────────────────────────────
            .addCase(getAllTeachers.pending, (state) => {
                state.loading.getAllTeachers = true;
                state.error.getAllTeachers = null;
            })
            .addCase(getAllTeachers.fulfilled, (state, action) => {
                state.loading.getAllTeachers = false;
                const rawStaff = Array.isArray(action.payload.data) ? action.payload.data : [];
                // Only keep teachers and accountants (which matches StaffAttendance filter)
                const filteredStaff = rawStaff.filter(item =>
                    item && ["teacher", "accountant"].includes((item.role || '').toLowerCase())
                );
                state.teachers = filteredStaff.map(t => {
                    const profile = t.profileId || {};
                    const classes = (profile.assignedClasses || []).map(c => typeof c === 'string' ? c : (c.name || c.periodName || ''));
                    const subjects = (profile.subjects || []).map(s => typeof s === 'string' ? s : (s.subjectName || s.name || ''));
                    return {
                        ...t,
                        ...profile,
                        _id: t._id,
                        id: t._id,
                        name: t.name || '',
                        email: t.email || '',
                        role: t.role || 'Staff',
                        designation: profile.designation || (t.role === 'teacher' ? 'Teacher' : t.role === 'accountant' ? 'Accountant' : 'Staff'),
                        teacherId: t.loginId || '',
                        staffId: profile.staffId || t.loginId || '',
                        classes,
                        assignedClass: classes[0] || '',
                        subjects,
                        phone: profile.phone || t.phone || '',
                        status: t.status || profile.status || 'active',
                    };
                });
            })
            .addCase(getAllTeachers.rejected, (state, action) => {
                state.loading.getAllTeachers = false;
                state.error.getAllTeachers = action.payload?.message;
            })

            // ── Create Teacher ────────────────────────────────────────────
            .addCase(createTeacher.pending, (state) => {
                state.loading.createTeacher = true;
                state.error.createTeacher = null;
            })
            .addCase(createTeacher.fulfilled, (state, action) => {
                state.loading.createTeacher = false;
                // the new teacher might not be populated from the backend, so we will refetch or add what we have
                if (action.payload.teacher) {
                    const t = action.payload.teacher;
                    // the component dispatches getAllTeachers on mount, but if we need immediate update:
                    // Note: Since user is not populated, name/email would be empty. 
                    // Let's rely on the user reloading or we can trigger fetch in the component.
                    state.teachers.unshift({
                        ...t,
                        id: t._id,
                    });
                }
                state.message = action.payload.message;
            })
            .addCase(createTeacher.rejected, (state, action) => {
                state.loading.createTeacher = false;
                state.error.createTeacher = action.payload?.message;
            })

            // ── Assign Teacher ────────────────────────────────────────────
            .addCase(assignTeacher.pending, (state) => {
                state.loading.assignTeacher = true;
                state.error.assignTeacher = null;
            })
            .addCase(assignTeacher.fulfilled, (state, action) => {
                state.loading.assignTeacher = false;
                const updated = action.payload.teacher;
                if (updated) {
                    const index = state.teachers.findIndex(t => t._id === updated._id);
                    if (index !== -1) {
                        const classes = (updated.assignedClasses || []).map(c => typeof c === 'string' ? c : (c.name || c.periodName || ''));
                        state.teachers[index] = {
                            ...state.teachers[index],
                            ...updated,
                            classes,
                            assignedClass: classes[0] || '',
                            subjects: (updated.subjects || []).map(s => typeof s === 'string' ? s : (s.subjectName || s.name || '')),
                        };
                    }
                }
                state.message = action.payload.message;
            })
            .addCase(assignTeacher.rejected, (state, action) => {
                state.loading.assignTeacher = false;
                state.error.assignTeacher = action.payload?.message;
            })

            // ── Update Teacher ────────────────────────────────────────────
            .addCase(updateTeacher.pending, (state) => {
                state.loading.updateTeacher = true;
                state.error.updateTeacher = null;
            })
            .addCase(updateTeacher.fulfilled, (state, action) => {
                state.loading.updateTeacher = false;
                const updated = action.payload.teacher;
                if (updated) {
                    const index = state.teachers.findIndex(t => t._id === updated._id);
                    if (index !== -1) {
                        const classes = (updated.assignedClasses || []).map(c => typeof c === 'string' ? c : (c.name || c.periodName || ''));
                        state.teachers[index] = {
                            ...state.teachers[index],
                            ...updated,
                            classes,
                            assignedClass: classes[0] || '',
                            subjects: (updated.subjects || []).map(s => typeof s === 'string' ? s : (s.subjectName || s.name || '')),
                        };
                    }
                }
                state.message = action.payload.message;
            })
            .addCase(updateTeacher.rejected, (state, action) => {
                state.loading.updateTeacher = false;
                state.error.updateTeacher = action.payload?.message;
            })

            // ── Delete Teacher ────────────────────────────────────────────
            .addCase(deleteTeacher.pending, (state) => {
                state.loading.deleteTeacher = true;
                state.error.deleteTeacher = null;
            })
            .addCase(deleteTeacher.fulfilled, (state, action) => {
                state.loading.deleteTeacher = false;
                state.teachers = state.teachers.filter(t => t._id !== action.payload.id);
                state.message = action.payload.message;
            })
            .addCase(deleteTeacher.rejected, (state, action) => {
                state.loading.deleteTeacher = false;
                state.error.deleteTeacher = action.payload?.message;
            })

            // ── Get All Tasks ─────────────────────────────────────────────
            .addCase(getAllTasks.pending, (state) => {
                state.loading.getAllTasks = true;
                state.error.getAllTasks = null;
            })
            .addCase(getAllTasks.fulfilled, (state, action) => {
                state.loading.getAllTasks = false;
                let fetchedTasks = Array.isArray(action.payload.data?.tasks) ? action.payload.data.tasks : (Array.isArray(action.payload.data) ? action.payload.data : []);
                // Ensure frontend required fields match backend format
                state.tasks = fetchedTasks.map(t => ({
                    ...t,
                    due: t.dueDate || t.due || 'No date',
                    category: t.category || (t.tags && t.tags[0]) || 'General'
                }));
            })
            .addCase(getAllTasks.rejected, (state, action) => {
                state.loading.getAllTasks = false;
                state.error.getAllTasks = action.payload?.message;
            })

            // ── Create Task ───────────────────────────────────────────────
            .addCase(createTaskThunk.pending, (state) => {
                state.loading.createTask = true;
                state.error.createTask = null;
            })
            .addCase(createTaskThunk.fulfilled, (state, action) => {
                state.loading.createTask = false;
                if (action.payload.data) {
                    const t = action.payload.data;
                    state.tasks.unshift({
                        ...t,
                        due: t.dueDate || t.due || 'No date',
                        category: t.category || (t.tags && t.tags[0]) || 'General'
                    });
                }
                state.message = action.payload.message;
            })
            .addCase(createTaskThunk.rejected, (state, action) => {
                state.loading.createTask = false;
                state.error.createTask = action.payload?.message;
            })

            // ── Update Task ───────────────────────────────────────────────
            .addCase(updateTaskThunk.pending, (state) => {
                state.loading.updateTask = true;
                state.error.updateTask = null;
            })
            .addCase(updateTaskThunk.fulfilled, (state, action) => {
                state.loading.updateTask = false;
                if (action.payload.data) {
                    const updated = {
                        ...action.payload.data,
                        due: action.payload.data.dueDate || action.payload.data.due || 'No date',
                        category: action.payload.data.category || (action.payload.data.tags && action.payload.data.tags[0]) || 'General'
                    };
                    const idx = state.tasks.findIndex(t => t.id === updated.id || t._id === (updated.id || updated._id));
                    if (idx >= 0) state.tasks[idx] = updated;
                }
                state.message = action.payload?.message;
            })
            .addCase(updateTaskThunk.rejected, (state, action) => {
                state.loading.updateTask = false;
                state.error.updateTask = action.payload?.message;
            })

            // ── Delete Task ───────────────────────────────────────────────
            .addCase(deleteTaskThunk.pending, (state) => {
                state.loading.deleteTask = true;
                state.error.deleteTask = null;
            })
            .addCase(deleteTaskThunk.fulfilled, (state, action) => {
                state.loading.deleteTask = false;
                state.tasks = state.tasks.filter(t => t.id !== action.payload.id && t._id !== action.payload.id);
                state.message = action.payload?.message;
            })
            .addCase(deleteTaskThunk.rejected, (state, action) => {
                state.loading.deleteTask = false;
                state.error.deleteTask = action.payload?.message;
            });
    },
});

export const { 
    clearError, 
    clearMessage,
    setFinanceStats,
    setNotices,
    setLeaveRequests,
    setPendingApprovalsCount,
    setDashboardLoaded
} = adminSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAdminLoading = (state) => state.admin.loading;
export const selectAdminError = (state) => state.admin.error;
export const selectAdminMessage = (state) => state.admin.message;
export const selectDashboardStats = (state) => state.admin.dashboardStats;
export const selectTeachers = (state) => state.admin.teachers;
export const selectTasks = (state) => state.admin.tasks;
export const selectAdminProfile = (state) => state.admin.profile;
export const selectAdminSettings = (state) => state.admin.settings;
export const selectStudents = (state) => state.admin.students;
export const selectSubjects = (state) => state.admin.subjects;
export const selectStaff = (state) => state.admin.staff;

export const selectStats = (state) => state.admin.stats;
export const selectDashboardEvents = (state) => state.admin.events;
export const selectDashboardActivities = (state) => state.admin.activities;
export const selectAttendanceAnalytics = (state) => state.admin.attendance;

export const selectFinanceStats = (state) => state.admin.financeStats;
export const selectNotices = (state) => state.admin.notices;
export const selectLeaveRequests = (state) => state.admin.leaveRequests;
export const selectPendingApprovalsCount = (state) => state.admin.pendingApprovalsCount;
export const selectDashboardLoaded = (state) => state.admin.dashboardLoaded;

export default adminSlice.reducer;