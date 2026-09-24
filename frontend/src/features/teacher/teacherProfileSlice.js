import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from "../../services/api.js"

// 1. Fetch Profile Thunk
export const fetchTeacherProfile = createAsyncThunk(
  'teacherProfile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/subject-teacher/profile');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'teacherProfile/updateProfile',
  async (profileData, { dispatch, rejectWithValue }) => {
    try {
      await api.put('/subject-teacher/profile', profileData);
      
      // Refresh the profile data instantly after a successful update
      dispatch(fetchTeacherProfile());
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

const teacherProfileSlice = createSlice({
  name: 'teacherProfile',
  initialState: {
    profile: null,
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearProfileMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchTeacherProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeacherProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchTeacherProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.successMessage = 'Profile updated successfully!';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearProfileMessages } = teacherProfileSlice.actions;
export default teacherProfileSlice.reducer;