import api from './api';

export const fetchParentProfile = async () => {
    const response = await api.get('/auth/parent/me');
    return response.data;
};

export const fetchParentDashboardStats = async (studentId) => {
    const response = await api.get('/parent/dashboard/stats', {
        params: { studentId }
    });
    return response.data;
};

export const fetchParentNotices = async () => {
    const response = await api.get('/parent/notice-page/notices');
    return response.data;
};

export const markParentNoticeAsRead = async (noticeId) => {
    const response = await api.put(`/parent/notice-page/notices/${noticeId}/read`);
    return response.data;
};

export const fetchParentEvents = async () => {
    const response = await api.get('/parent/notice-page/events');
    return response.data;
};

export const respondToParentEvent = async (eventId, responseValue) => {
    const response = await api.post('/parent/notice-page/events/rsvp', {
        eventId,
        response: responseValue,
    });
    return response.data;
};

export const fetchParentActivities = async (studentId) => {
    const response = await api.get('/parent/notice-page/activities', {
        params: { student_id: studentId },
    });
    return response.data;
};

export const fetchParentCommunityFeed = async (filter = 'all') => {
    const response = await api.get('/parent/community/feed', {
        params: { filter },
    });
    return response.data;
};

export const toggleParentCommunityLike = async (postId) => {
    const response = await api.post(`/parent/community/posts/${postId}/like`);
    return response.data;
};

export const submitParentCommunityComment = async (postId, text) => {
    const response = await api.post(`/parent/community/posts/${postId}/comment`, { text });
    return response.data;
};

export const voteParentCommunityPoll = async (postId, optionId) => {
    const response = await api.post(`/parent/community/posts/${postId}/poll-vote`, { optionId });
    return response.data;
};

export const respondToParentCommunityEvent = async (postId, responseValue) => {
    const response = await api.post(`/parent/community/posts/${postId}/event-rsvp`, { response: responseValue });
    return response.data;
};

export const fetchParentMeetings = async (studentId) => {
    const response = await api.get('/parent/meetings', {
        params: { student_id: studentId },
    });
    return response.data;
};

export const respondToParentMeeting = async (meetingId, responseValue) => {
    const response = await api.patch(`/parent/meetings/${meetingId}/respond`, {
        response: responseValue,
    });
    return response.data;
};

export const bookParentMeetingSlot = async (meetingId, slotTime) => {
    const response = await api.post(`/parent/meetings/${meetingId}/book-slot`, {
        slotTime,
    });
    return response.data;
};

export const fetchParentIdCard = async () => {
    const response = await api.get('/parent/student/idcard');
    return response.data;
};

export const createParentTicket = async (payload) => {
    const safePayload = { ...(payload || {}) };
    if (Object.prototype.hasOwnProperty.call(safePayload, 'assignedToRole')) {
        if (safePayload.assignedToRole === null || safePayload.assignedToRole === "") {
            delete safePayload.assignedToRole;
        }
    }

    const response = await api.post('/parent/tickets', safePayload);
    return response.data;
};

export const fetchParentNotifications = async () => {
    const response = await api.get('/parent/notifications');
    return response.data;
};

export const markNotificationReadApi = async (notificationId) => {
    const response = await api.put('/parent/notifications/read', { notificationId });
    return response.data;
};

export const markMultipleNotificationsReadApi = async (notificationIds) => {
    const response = await api.put('/parent/notifications/read', { notificationIds });
    return response.data;
};

export const clearReadNotificationsApi = async (notificationIds) => {
    const response = await api.post('/parent/notifications/clear-read', { notificationIds });
    return response.data;
};
