import api from "../api";

export const parentAttendanceApi = {
    // Get attendance summary
    getSummary: async (studentId, schoolId) => {
        const response = await api.get("/parent/attendance/summary", {
            params: { student_id: studentId, school_id: schoolId }
        });
        return response.data;
    },

    // Get attendance calendar for a month
    getCalendar: async (studentId, schoolId, month, year) => {
        const response = await api.get("/parent/attendance/calendar", {
            params: {
                student_id: studentId,
                school_id: schoolId,
                month,
                year
            }
        });
        return response.data;
    },

    // Get leave requests
    getLeaves: async (studentId, schoolId) => {
        const response = await api.get("/parent/attendance/leaves", {
            params: { student_id: studentId, school_id: schoolId }
        });
        return response.data;
    },

    // Get detailed attendance list
    getList: async (studentId, schoolId) => {
        const response = await api.get("/parent/attendance/list", {
            params: { student_id: studentId, school_id: schoolId }
        });
        return response.data;
    }
};