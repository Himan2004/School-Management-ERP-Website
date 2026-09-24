import api from '../api';

const SUPERADMIN_SUPPORT_URL = '/superadmin/support/tickets';
const GRAPHURA_SUPPORT_URL = '/superadmin/support/graphura-tickets';

const superAdminSupportService = {
    /**
     * Fetch all tickets with optional filters
     * @param {Object} params - { search, category, status, priority, page, limit }
     */
    getAllTickets: async (params) => {
        const response = await api.get(SUPERADMIN_SUPPORT_URL, { params });
        return response.data;
    },

    /**
     * Get full details of a single ticket including responses
     * @param {string} id - The Ticket ID
     */
    getTicketDetails: async (id) => {
        const response = await api.get(`${SUPERADMIN_SUPPORT_URL}/${id}`);
        return response.data;
    },

    /**
     * Update the status of a ticket (e.g., to 'resolved' or 'in_progress')
     * @param {string} id - Ticket ID
     * @param {string} status - New status
     * @param {string} resolutionNote - (Optional) Note if status is 'resolved'
     */
    updateTicketStatus: async (id, status, resolutionNote = "") => {
        const response = await api.put(`${SUPERADMIN_SUPPORT_URL}/${id}/status`, {
            status,
            resolutionNote,
        });
        return response.data;
    },

    /**
     * Add a message/response to a ticket
     * @param {string} id - Ticket ID
     * @param {string} message - The response text
     * @param {Array} attachments - Array of { name, url }
     */
    addTicketResponse: async (id, message, attachments = []) => {
        const response = await api.post(`${SUPERADMIN_SUPPORT_URL}/${id}/response`, {
            message,
            attachments,
        });
        return response.data;
    },

    // ─── SuperAdmin → Graphura Support ───────────────────────────────────────────

    getGraphuraTickets: async (params) => {
        const response = await api.get(GRAPHURA_SUPPORT_URL, { params });
        return response.data;
    },

    createGraphuraTicket: async (ticketData) => {
        const response = await api.post(GRAPHURA_SUPPORT_URL, ticketData);
        return response.data;
    },

    getGraphuraTicketById: async (id) => {
        const response = await api.get(`${GRAPHURA_SUPPORT_URL}/${id}`);
        return response.data;
    },

    addGraphuraTicketMessage: async (id, message) => {
        const response = await api.post(`${GRAPHURA_SUPPORT_URL}/${id}/message`, { message });
        return response.data;
    },

    closeGraphuraTicket: async (id) => {
        const response = await api.patch(`${GRAPHURA_SUPPORT_URL}/${id}/close`);
        return response.data;
    }
};

export default superAdminSupportService;