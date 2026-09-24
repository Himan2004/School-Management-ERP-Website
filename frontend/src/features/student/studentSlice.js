import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api`;

// ========== Async Thunks ==========
export const fetchStudentDashboard = createAsyncThunk(
  'student/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/dashboard`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

export const fetchStudentAttendance = createAsyncThunk(
  'student/fetchAttendance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/attendance`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance');
    }
  }
);

export const fetchStudentPerformance = createAsyncThunk(
  'student/fetchPerformance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/performance`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch performance');
    }
  }
);

export const fetchStudentHomework = createAsyncThunk(
  'student/fetchHomework',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/homework`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch homework');
    }
  }
);

export const fetchStudentExams = createAsyncThunk(
  'student/fetchExams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/exams`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch exams');
    }
  }
);

export const fetchStudentBusTiming = createAsyncThunk(
  'student/fetchBusTiming',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/bus-timing`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bus timing');
    }
  }
);

export const fetchStudentAlerts = createAsyncThunk(
  'student/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/alerts`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch alerts');
    }
  }
);

export const fetchStudentEvents = createAsyncThunk(
  'student/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/events`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch events');
    }
  }
);

export const registerForEvent = createAsyncThunk(
  'student/registerForEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/events/${eventId}/register`, {}, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to register for event');
    }
  }
);

export const unregisterFromEvent = createAsyncThunk(
  'student/unregisterFromEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_URL}/student/events/${eventId}/register`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unregister from event');
    }
  }
);

export const fetchStudentStudyMaterial = createAsyncThunk(
  'student/fetchStudyMaterial',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/study-material`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch study material');
    }
  }
);

export const fetchStudentAchievements = createAsyncThunk(
  'student/fetchAchievements',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/achievements`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch achievements');
    }
  }
);

export const fetchStudentRecommendations = createAsyncThunk(
  'student/fetchRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/recommendations`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommendations');
    }
  }
);

export const fetchStudentTimetable = createAsyncThunk(
  'student/fetchTimetable',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/timetable`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch timetable');
    }
  }
);

export const fetchStudentMarksheet = createAsyncThunk(
  'student/fetchMarksheet',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/marksheet`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch marksheet');
    }
  }
);

export const fetchStudentHealthCheckup = createAsyncThunk(
  'student/fetchHealthCheckup',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/health-checkup`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch health checkup');
    }
  }
);

export const applyForHealthCheckup = createAsyncThunk(
  'student/applyForHealthCheckup',
  async (applicationData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/health-checkup/apply`, applicationData, { 
        withCredentials: true 
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply for health checkup');
    }
  }
);

export const fetchStudentIdCard = createAsyncThunk(
  'student/fetchIdCard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/id-card`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch ID card');
    }
  }
);

export const downloadIdCard = createAsyncThunk(
  'student/downloadIdCard',
  async ({ format = 'png', cardData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/id-card/download`, 
        { format, cardData }, 
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download ID card');
    }
  }
);

export const regenerateIdCard = createAsyncThunk(
  'student/regenerateIdCard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/id-card/regenerate`, {}, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to regenerate ID card');
    }
  }
);

export const reportLostIdCard = createAsyncThunk(
  'student/reportLostIdCard',
  async (reportData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/id-card/report-lost`, reportData, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to report lost ID card');
    }
  }
);

export const updateIdCardPreferences = createAsyncThunk(
  'student/updateIdCardPreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/student/id-card/preferences`, preferences, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preferences');
    }
  }
);

export const fetchStudentAdmitCard = createAsyncThunk(
  'student/fetchAdmitCard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/admit-card`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch admit card');
    }
  }
);

export const downloadAdmitCard = createAsyncThunk(
  'student/downloadAdmitCard',
  async ({ format = 'png', admitCardData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/admit-card/download`, 
        { format, admitCardData }, 
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download admit card');
    }
  }
);

export const regenerateAdmitCard = createAsyncThunk(
  'student/regenerateAdmitCard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/admit-card/regenerate`, {}, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to regenerate admit card');
    }
  }
);

export const verifyAdmitCard = createAsyncThunk(
  'student/verifyAdmitCard',
  async (admitCardCode, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/admit-card/verify`, 
        { admitCardCode }, 
        { withCredentials: true }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify admit card');
    }
  }
);

export const fetchStudentProfile = createAsyncThunk(
  'student/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/profile`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const fetchLeaveHistory = createAsyncThunk(
  'student/fetchLeaveHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/leave`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave history');
    }
  }
);

export const submitLeaveApplication = createAsyncThunk(
  'student/submitLeave',
  async (leaveData, { rejectWithValue }) => {
    try {
      const config = { withCredentials: true };
      if (leaveData instanceof FormData) {
        config.headers = { 'Content-Type': 'multipart/form-data' };
      }
      const response = await axios.post(`${API_URL}/student/leave`, leaveData, config);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit leave');
    }
  }
);

export const submitHomework = createAsyncThunk(
  'student/submitHomework',
  async ({ homeworkId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_URL}/student/homework/${homeworkId}/submit`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit homework');
    }
  }
);

export const fetchStudentResults = createAsyncThunk(
  'student/fetchResults',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/results`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch results');
    }
  }
);

export const fetchSupportTickets = createAsyncThunk(
  'student/fetchSupportTickets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/student/support-tickets`, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch support tickets');
    }
  }
);

export const createSupportTicket = createAsyncThunk(
  'student/createSupportTicket',
  async (ticketData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/support-tickets`, ticketData, { withCredentials: true });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create ticket');
    }
  }
);

export const addTicketMessage = createAsyncThunk(
  'student/addTicketMessage',
  async ({ ticketId, message }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/student/support-tickets/${ticketId}/messages`, 
        { message }, 
        { withCredentials: true }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add message');
    }
  }
);

export const updateTimetablePreference = createAsyncThunk(
  'student/updateTimetablePreference',
  async ({ viewType, filter }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/student/timetable/preferences`, 
        { viewType, filter }, 
        { withCredentials: true }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preferences');
    }
  }
);



// ========== Initial State ==========
const initialState = {
  profile: null,
  dashboard: null,
  attendance: null,
  performance: null,
  homework: [],
  exams: [],
  busTiming: null,
  alerts: { unread: [], read: [] },
  events: [],
  studyMaterial: [],
  achievements: [],
  recommendations: [],
  timetable: [],
  timetablePreferences: {
    viewType: 'day',
    filter: 'all'
  },
  marksheet: null,
  healthCheckup: null,
  healthData: null,
  idCard: null,
  idCardPreferences: {
    cardStyle: 'modern',
    cardSize: 'standard',
    showQrCode: true,
    showPhoto: true,
    showSignature: true
  },
  admitCard: null,
  leaveHistory: [],
  results: null,
  supportTickets: [],
  loading: {
    profile: false,
    dashboard: false,
    attendance: false,
    performance: false,
    homework: false,
    exams: false,
    busTiming: false,
    alerts: false,
    events: false,
    studyMaterial: false,
    achievements: false,
    recommendations: false,
    timetable: false,
    marksheet: false,
    healthCheckup: false,
    idCard: false,
    downloadIdCard: false,
    regenerateIdCard: false,
    reportLostIdCard: false,
    updateIdCardPreferences: false,
    admitCard: false,
    downloadAdmitCard: false,
    regenerateAdmitCard: false,
    verifyAdmitCard: false,
    leaveHistory: false,
    submitLeave: false,
    submitHomework: false,
    results: false,
    supportTickets: false,
    createTicket: false,
    addMessage: false,
    updatePreferences: false,
    applyHealthCheckup: false,
    registerEvent: false,
    unregisterEvent: false
  },
  error: null
};

// ========== Slice ==========
const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetStudentState: () => initialState,
    updateIdCardLocalPreferences: (state, action) => {
      state.idCardPreferences = { ...state.idCardPreferences, ...action.payload };
    },
    clearAdmitCard: (state) => {
      state.admitCard = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
      .addCase(fetchStudentDashboard.pending, (state) => { state.loading.dashboard = true; })
      .addCase(fetchStudentDashboard.fulfilled, (state, action) => {
        state.loading.dashboard = false;
        state.dashboard = action.payload;
        if (action.payload?.profile) state.profile = action.payload.profile;
      })
      .addCase(fetchStudentDashboard.rejected, (state, action) => {
        state.loading.dashboard = false;
        state.error = action.payload;
      })

      // Profile
      .addCase(fetchStudentProfile.pending, (state) => { state.loading.profile = true; })
      .addCase(fetchStudentProfile.fulfilled, (state, action) => {
        state.loading.profile = false;
        state.profile = action.payload;
      })
      .addCase(fetchStudentProfile.rejected, (state, action) => {
        state.loading.profile = false;
        state.error = action.payload;
      })

      // Attendance
      .addCase(fetchStudentAttendance.pending, (state) => { state.loading.attendance = true; })
      .addCase(fetchStudentAttendance.fulfilled, (state, action) => {
        state.loading.attendance = false;
        state.attendance = action.payload;
      })
      .addCase(fetchStudentAttendance.rejected, (state, action) => {
        state.loading.attendance = false;
        state.error = action.payload;
      })

      // Performance
      .addCase(fetchStudentPerformance.pending, (state) => { state.loading.performance = true; })
      .addCase(fetchStudentPerformance.fulfilled, (state, action) => {
        state.loading.performance = false;
        state.performance = action.payload;
      })
      .addCase(fetchStudentPerformance.rejected, (state, action) => {
        state.loading.performance = false;
        state.error = action.payload;
      })

      // Homework
      .addCase(fetchStudentHomework.pending, (state) => { state.loading.homework = true; })
      .addCase(fetchStudentHomework.fulfilled, (state, action) => {
        state.loading.homework = false;
        state.homework = action.payload;
      })
      .addCase(fetchStudentHomework.rejected, (state, action) => {
        state.loading.homework = false;
        state.error = action.payload;
      })

      // Submit Homework
      .addCase(submitHomework.pending, (state) => { state.loading.submitHomework = true; })
      .addCase(submitHomework.fulfilled, (state, action) => {
        state.loading.submitHomework = false;
        if (action.payload) {
          const updatedHomework = state.homework.map(hw =>
            hw.id === action.payload.id ? { ...hw, status: 'submitted' } : hw
          );
          state.homework = updatedHomework;
        }
      })
      .addCase(submitHomework.rejected, (state, action) => {
        state.loading.submitHomework = false;
        state.error = action.payload;
      })

      // Exams
      .addCase(fetchStudentExams.pending, (state) => { state.loading.exams = true; })
      .addCase(fetchStudentExams.fulfilled, (state, action) => {
        state.loading.exams = false;
        state.exams = action.payload;
      })
      .addCase(fetchStudentExams.rejected, (state, action) => {
        state.loading.exams = false;
        state.error = action.payload;
      })

      // Bus Timing
      .addCase(fetchStudentBusTiming.pending, (state) => { state.loading.busTiming = true; })
      .addCase(fetchStudentBusTiming.fulfilled, (state, action) => {
        state.loading.busTiming = false;
        state.busTiming = action.payload;
      })
      .addCase(fetchStudentBusTiming.rejected, (state, action) => {
        state.loading.busTiming = false;
        state.error = action.payload;
      })

      // Alerts
      .addCase(fetchStudentAlerts.pending, (state) => { state.loading.alerts = true; })
      .addCase(fetchStudentAlerts.fulfilled, (state, action) => {
        state.loading.alerts = false;
        state.alerts = action.payload;
      })
      .addCase(fetchStudentAlerts.rejected, (state, action) => {
        state.loading.alerts = false;
        state.error = action.payload;
      })

      // Events
      .addCase(fetchStudentEvents.pending, (state) => { state.loading.events = true; })
      .addCase(fetchStudentEvents.fulfilled, (state, action) => {
        state.loading.events = false;
        state.events = action.payload;
      })
      .addCase(fetchStudentEvents.rejected, (state, action) => {
        state.loading.events = false;
        state.error = action.payload;
      })

      // Register for Event
      .addCase(registerForEvent.pending, (state) => { state.loading.registerEvent = true; })
      .addCase(registerForEvent.fulfilled, (state, action) => {
        state.loading.registerEvent = false;
        const updatedEvent = action.payload;
        const index = state.events.findIndex(e => e.id === updatedEvent.id);
        if (index !== -1) {
          state.events[index] = updatedEvent;
        }
      })
      .addCase(registerForEvent.rejected, (state, action) => {
        state.loading.registerEvent = false;
        state.error = action.payload;
      })

      // Unregister from Event
      .addCase(unregisterFromEvent.pending, (state) => { state.loading.unregisterEvent = true; })
      .addCase(unregisterFromEvent.fulfilled, (state, action) => {
        state.loading.unregisterEvent = false;
        const updatedEvent = action.payload;
        const index = state.events.findIndex(e => e.id === updatedEvent.id);
        if (index !== -1) {
          state.events[index] = updatedEvent;
        }
      })
      .addCase(unregisterFromEvent.rejected, (state, action) => {
        state.loading.unregisterEvent = false;
        state.error = action.payload;
      })

      // Study Material
      .addCase(fetchStudentStudyMaterial.pending, (state) => { state.loading.studyMaterial = true; })
      .addCase(fetchStudentStudyMaterial.fulfilled, (state, action) => {
        state.loading.studyMaterial = false;
        state.studyMaterial = action.payload;
      })
      .addCase(fetchStudentStudyMaterial.rejected, (state, action) => {
        state.loading.studyMaterial = false;
        state.error = action.payload;
      })

      // Achievements
      .addCase(fetchStudentAchievements.pending, (state) => { state.loading.achievements = true; })
      .addCase(fetchStudentAchievements.fulfilled, (state, action) => {
        state.loading.achievements = false;
        state.achievements = action.payload;
      })
      .addCase(fetchStudentAchievements.rejected, (state, action) => {
        state.loading.achievements = false;
        state.error = action.payload;
      })

      // Recommendations
      .addCase(fetchStudentRecommendations.pending, (state) => { state.loading.recommendations = true; })
      .addCase(fetchStudentRecommendations.fulfilled, (state, action) => {
        state.loading.recommendations = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchStudentRecommendations.rejected, (state, action) => {
        state.loading.recommendations = false;
        state.error = action.payload;
      })

      // Timetable
      .addCase(fetchStudentTimetable.pending, (state) => { state.loading.timetable = true; })
      .addCase(fetchStudentTimetable.fulfilled, (state, action) => {
        state.loading.timetable = false;
        state.timetable = action.payload;
      })
      .addCase(fetchStudentTimetable.rejected, (state, action) => {
        state.loading.timetable = false;
        state.error = action.payload;
      })

      // Update Timetable Preference
      .addCase(updateTimetablePreference.pending, (state) => { state.loading.updatePreferences = true; })
      .addCase(updateTimetablePreference.fulfilled, (state, action) => {
        state.loading.updatePreferences = false;
        state.timetablePreferences = action.payload;
      })
      .addCase(updateTimetablePreference.rejected, (state, action) => {
        state.loading.updatePreferences = false;
        state.error = action.payload;
      })

      // Marksheet
      .addCase(fetchStudentMarksheet.pending, (state) => { state.loading.marksheet = true; })
      .addCase(fetchStudentMarksheet.fulfilled, (state, action) => {
        state.loading.marksheet = false;
        state.marksheet = action.payload;
      })
      .addCase(fetchStudentMarksheet.rejected, (state, action) => {
        state.loading.marksheet = false;
        state.error = action.payload;
      })

      // Health Checkup
      .addCase(fetchStudentHealthCheckup.pending, (state) => { state.loading.healthCheckup = true; })
      .addCase(fetchStudentHealthCheckup.fulfilled, (state, action) => {
        state.loading.healthCheckup = false;
        state.healthCheckup = action.payload;
        state.healthData = action.payload;
      })
      .addCase(fetchStudentHealthCheckup.rejected, (state, action) => {
        state.loading.healthCheckup = false;
        state.error = action.payload;
      })

      // Apply for Health Checkup
      .addCase(applyForHealthCheckup.pending, (state) => { 
        state.loading.applyHealthCheckup = true; 
        state.error = null;
      })
      .addCase(applyForHealthCheckup.fulfilled, (state, action) => {
        state.loading.applyHealthCheckup = false;
        if (state.healthCheckup) {
          if (!state.healthCheckup.pendingApplications) {
            state.healthCheckup.pendingApplications = [];
          }
          state.healthCheckup.pendingApplications.unshift(action.payload);
        }
        if (state.healthData) {
          if (!state.healthData.pendingApplications) {
            state.healthData.pendingApplications = [];
          }
          state.healthData.pendingApplications.unshift(action.payload);
        }
      })
      .addCase(applyForHealthCheckup.rejected, (state, action) => {
        state.loading.applyHealthCheckup = false;
        state.error = action.payload;
      })

      // ID Card
      .addCase(fetchStudentIdCard.pending, (state) => { state.loading.idCard = true; })
      .addCase(fetchStudentIdCard.fulfilled, (state, action) => {
        state.loading.idCard = false;
        state.idCard = action.payload;
      })
      .addCase(fetchStudentIdCard.rejected, (state, action) => {
        state.loading.idCard = false;
        state.error = action.payload;
      })

      // Download ID Card
      .addCase(downloadIdCard.pending, (state) => { state.loading.downloadIdCard = true; })
      .addCase(downloadIdCard.fulfilled, (state, action) => {
        state.loading.downloadIdCard = false;
        const url = window.URL.createObjectURL(new Blob([action.payload]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'id-card.png');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .addCase(downloadIdCard.rejected, (state, action) => {
        state.loading.downloadIdCard = false;
        state.error = action.payload;
      })

      // Regenerate ID Card
      .addCase(regenerateIdCard.pending, (state) => { state.loading.regenerateIdCard = true; })
      .addCase(regenerateIdCard.fulfilled, (state, action) => {
        state.loading.regenerateIdCard = false;
        state.idCard = action.payload;
      })
      .addCase(regenerateIdCard.rejected, (state, action) => {
        state.loading.regenerateIdCard = false;
        state.error = action.payload;
      })

      // Report Lost ID Card
      .addCase(reportLostIdCard.pending, (state) => { state.loading.reportLostIdCard = true; })
      .addCase(reportLostIdCard.fulfilled, (state, action) => {
        state.loading.reportLostIdCard = false;
        state.idCard = action.payload;
      })
      .addCase(reportLostIdCard.rejected, (state, action) => {
        state.loading.reportLostIdCard = false;
        state.error = action.payload;
      })

      // Update ID Card Preferences
      .addCase(updateIdCardPreferences.pending, (state) => { state.loading.updateIdCardPreferences = true; })
      .addCase(updateIdCardPreferences.fulfilled, (state, action) => {
        state.loading.updateIdCardPreferences = false;
        state.idCardPreferences = action.payload;
      })
      .addCase(updateIdCardPreferences.rejected, (state, action) => {
        state.loading.updateIdCardPreferences = false;
        state.error = action.payload;
      })

      // Admit Card
      .addCase(fetchStudentAdmitCard.pending, (state) => { state.loading.admitCard = true; })
      .addCase(fetchStudentAdmitCard.fulfilled, (state, action) => {
        state.loading.admitCard = false;
        state.admitCard = action.payload;
      })
      .addCase(fetchStudentAdmitCard.rejected, (state, action) => {
        state.loading.admitCard = false;
        state.error = action.payload;
      })

      // Download Admit Card
      .addCase(downloadAdmitCard.pending, (state) => { state.loading.downloadAdmitCard = true; })
      .addCase(downloadAdmitCard.fulfilled, (state, action) => {
        state.loading.downloadAdmitCard = false;
        const url = window.URL.createObjectURL(new Blob([action.payload]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'admit-card.png');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .addCase(downloadAdmitCard.rejected, (state, action) => {
        state.loading.downloadAdmitCard = false;
        state.error = action.payload;
      })

      // Regenerate Admit Card
      .addCase(regenerateAdmitCard.pending, (state) => { state.loading.regenerateAdmitCard = true; })
      .addCase(regenerateAdmitCard.fulfilled, (state, action) => {
        state.loading.regenerateAdmitCard = false;
        state.admitCard = action.payload;
      })
      .addCase(regenerateAdmitCard.rejected, (state, action) => {
        state.loading.regenerateAdmitCard = false;
        state.error = action.payload;
      })

      // Verify Admit Card
      .addCase(verifyAdmitCard.pending, (state) => { state.loading.verifyAdmitCard = true; })
      .addCase(verifyAdmitCard.fulfilled, (state) => {
        state.loading.verifyAdmitCard = false;
        // Handle verification result
      })
      .addCase(verifyAdmitCard.rejected, (state, action) => {
        state.loading.verifyAdmitCard = false;
        state.error = action.payload;
      })

      // Leave History
      .addCase(fetchLeaveHistory.pending, (state) => { state.loading.leaveHistory = true; })
      .addCase(fetchLeaveHistory.fulfilled, (state, action) => {
        state.loading.leaveHistory = false;
        state.leaveHistory = action.payload;
      })
      .addCase(fetchLeaveHistory.rejected, (state, action) => {
        state.loading.leaveHistory = false;
        state.error = action.payload;
      })

      // Submit Leave
      .addCase(submitLeaveApplication.pending, (state) => { state.loading.submitLeave = true; })
      .addCase(submitLeaveApplication.fulfilled, (state, action) => {
        state.loading.submitLeave = false;
        if (action.payload) {
          state.leaveHistory = [action.payload, ...state.leaveHistory];
        }
      })
      .addCase(submitLeaveApplication.rejected, (state, action) => {
        state.loading.submitLeave = false;
        state.error = action.payload;
      })

      // Results
      .addCase(fetchStudentResults.pending, (state) => { state.loading.results = true; })
      .addCase(fetchStudentResults.fulfilled, (state, action) => {
        state.loading.results = false;
        state.results = action.payload;
      })
      .addCase(fetchStudentResults.rejected, (state, action) => {
        state.loading.results = false;
        state.error = action.payload;
      })

      // Support Tickets
      .addCase(fetchSupportTickets.pending, (state) => { state.loading.supportTickets = true; })
      .addCase(fetchSupportTickets.fulfilled, (state, action) => {
        state.loading.supportTickets = false;
        state.supportTickets = action.payload;
      })
      .addCase(fetchSupportTickets.rejected, (state, action) => {
        state.loading.supportTickets = false;
        state.error = action.payload;
      })

      // Create Support Ticket
      .addCase(createSupportTicket.pending, (state) => { state.loading.createTicket = true; })
      .addCase(createSupportTicket.fulfilled, (state, action) => {
        state.loading.createTicket = false;
        state.supportTickets = [action.payload, ...state.supportTickets];
      })
      .addCase(createSupportTicket.rejected, (state, action) => {
        state.loading.createTicket = false;
        state.error = action.payload;
      })

      // Add Ticket Message
      .addCase(addTicketMessage.pending, (state) => { state.loading.addMessage = true; })
      .addCase(addTicketMessage.fulfilled, (state, action) => {
        state.loading.addMessage = false;
        const updatedTicket = action.payload;
        const index = state.supportTickets.findIndex(t => t.id === updatedTicket.id);
        if (index !== -1) {
          state.supportTickets[index] = updatedTicket;
        }
      })
      .addCase(addTicketMessage.rejected, (state, action) => {
        state.loading.addMessage = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, resetStudentState, updateIdCardLocalPreferences, clearAdmitCard } = studentSlice.actions;
export default studentSlice.reducer;