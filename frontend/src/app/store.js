import { configureStore } from "@reduxjs/toolkit";

import superAuthReducer from "../features/auth/superAuthSlice.js";
import adminAuthReducer from "../features/auth/adminAuthSlice.js";
import teacherAuthReducer from "../features/auth/teacherAuthSlice.js";
import principalAuthReducer from "../features/auth/principalAuthSlice.js";
import accountantAuthReducer from "../features/auth/accountantAuthSlice.js";
import graphuraAuthReducer from "../features/auth/graphuraAuthSlice.js";
import parentAuthReducer from "../features/auth/parentAuthSlice.js";
import studentAuthReducer from "../features/auth/studentAuthSlice.js";
import teacherProfileReducer from "../features/teacher/teacherProfileSlice.js";

import teacherSettingsReducer from "../features/teacher/teacherSettingsSlice.js";
import teacherCalendarReducer from "../features/teacher/teacherCalendarSlice.js"; 
import teacherMessageReducer from "../features/teacher/teacherMessageSlice.js";

import superAdminReducer from "../features/superAdmin/superAdminSlice.js";
import adminReducer from "../features/admin/adminSlice.js";
import studentReducer from "../features/student/studentSlice.js";
import themeReducer from "../features/theme/themeSlice.js";

// Store for Redux Toolkit
export const store = configureStore({
  reducer: {
    superAuth: superAuthReducer,
    adminAuth: adminAuthReducer,
    teacherAuth: teacherAuthReducer,
    principalAuth: principalAuthReducer,
    accountantAuth: accountantAuthReducer,
    graphuraAuth: graphuraAuthReducer,
    parentAuth: parentAuthReducer,
    studentAuth: studentAuthReducer,
    teacherProfile: teacherProfileReducer,
    teacherCalendar: teacherCalendarReducer,
    teacherSettings: teacherSettingsReducer,
    teacherMessage: teacherMessageReducer,
    
    superAdmin: superAdminReducer,
    student: studentReducer,
    admin: adminReducer,
    theme: themeReducer,
  },
});