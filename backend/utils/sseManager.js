// Map to store active user connections: Map<UserId, ResponseObject>
export const sseClients = new Map();

/**
 * Sends a real-time notification to a specific user if they are online.
 * @param {String|ObjectId} userId - The ID of the user to notify
 * @param {Object} notificationData - The notification payload to send
 */
export const sendRealTimeNotification = (userId, notificationData) => {
    const client = sseClients.get(userId.toString());
    
    if (client) {
        // SSE standard format requires data to be prefixed with "data: " and end with "\n\n"
        client.write(`data: ${JSON.stringify(notificationData)}\n\n`);
    }
};