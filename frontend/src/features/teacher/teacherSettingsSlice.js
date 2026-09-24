import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from "../../services/api.js"

// Fetch current settings
export const fetchTeacherSettings = createAsyncThunk(
  'teacherSettings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/teacher/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

// Update settings
export const updateTeacherSettings = createAsyncThunk(
  'teacherSettings/updateSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/teacher/settings', settingsData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

const teacherSettingsSlice = createSlice({
  name: 'teacherSettings',
  initialState: {
    settings: null,
    loading: false,
    saveLoading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearSettingsMessages: (state) => {
      state.successMessage = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTeacherSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeacherSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchTeacherSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateTeacherSettings.pending, (state) => {
        state.saveLoading = true;
        state.successMessage = null;
      })
      .addCase(updateTeacherSettings.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.settings = action.payload;
        state.successMessage = 'Settings saved successfully!';
      })
      .addCase(updateTeacherSettings.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSettingsMessages } = teacherSettingsSlice.actions;
export default teacherSettingsSlice.reducer;