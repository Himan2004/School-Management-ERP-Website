import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// 1. Existing fetch thunk (Keep this exactly as is)
export const fetchTeacherEvents = createAsyncThunk(
  "teacherCalendar/fetchEvents",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/teacher/calendar/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch calendar events",
      );
    }
  },
);

// 2. NEW: Add Event Thunk
export const addTeacherEvent = createAsyncThunk(
  "teacherCalendar/addEvent",
  async (eventData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      // POST request to create the new event
      const response = await api.post("/teacher/calendar/events", eventData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Return the newly created event object from the backend
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add event",
      );
    }
  },
);

// 1. Add this NEW thunk below your addTeacherEvent thunk
export const deleteTeacherEvent = createAsyncThunk(
  "teacherCalendar/deleteEvent",
  async (eventId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/teacher/calendar/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return eventId; // Return the ID so the reducer knows which one to remove
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete event",
      );
    }
  },
);

const teacherCalendarSlice = createSlice({
  name: "teacherCalendar",
  initialState: {
    events: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Events Cases
      .addCase(fetchTeacherEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeacherEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
        state.error = null;
      })
      .addCase(fetchTeacherEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // NEW: Add Event Cases
      .addCase(addTeacherEvent.fulfilled, (state, action) => {
        // Automatically push the newly created event into the UI array!
        // This makes the UI feel instantly responsive.
        state.events.push(action.payload);
      })
      .addCase(addTeacherEvent.rejected, (state, action) => {
        state.error = action.payload;
      })

      // NEW: Delete Event Cases
      .addCase(deleteTeacherEvent.fulfilled, (state, action) => {
        // Instantly filter out the deleted event from the UI!
        state.events = state.events.filter(
          (event) => event.id !== action.payload,
        );
      })
      .addCase(deleteTeacherEvent.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default teacherCalendarSlice.reducer;
