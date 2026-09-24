import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// 1. Fetch Inbox (List of conversations)
export const fetchConversations = createAsyncThunk(
  "teacherMessage/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load inbox",
      );
    }
  },
);

// 1.5. Fetch Categorized Contacts (Students, Parents, Staff)
export const fetchContacts = createAsyncThunk(
  "teacherMessage/fetchContacts",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/messages/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load contacts",
      );
    }
  },
);

// 2. Fetch Chat History with a specific user
export const fetchChatHistory = createAsyncThunk(
  "teacherMessage/fetchChatHistory",
  async (userId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { userId, messages: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load chat history",
      );
    }
  },
);

// 3. Send a Message
export const sendMessage = createAsyncThunk(
  "teacherMessage/sendMessage",
  async ({ receiverId, text }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        `/messages/${receiverId}`,
        { text },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send message",
      );
    }
  },
);

const teacherMessageSlice = createSlice({
  name: "teacherMessage",
  initialState: {
    conversations: [], // Array of inbox items
    contacts: {
      students: [],
      parents: [],
      staff: []
    },
    activeChat: [], // Array of messages for the currently open chat
    activeUserId: null, // Who we are currently talking to
    loading: false,
    chatLoading: false,
    error: null,
  },
  reducers: {
    setActiveUser: (state, action) => {
      state.activeUserId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload || [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload || { students: [], parents: [], staff: [] };
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Chat History
      .addCase(fetchChatHistory.pending, (state) => {
        state.chatLoading = true;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.chatLoading = false;
        state.activeChat = action.payload.messages || [];
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.chatLoading = false;
        state.error = action.payload;
      })

      // Send Message
      .addCase(sendMessage.fulfilled, (state, action) => {
        // Push the new message instantly into the chat window
        state.activeChat.push(action.payload);
      });
  },
});

export const { setActiveUser } = teacherMessageSlice.actions;
export default teacherMessageSlice.reducer;
