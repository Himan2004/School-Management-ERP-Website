import { sseClients } from "../../utils/sseManager.js";

export const streamNotifications = (req, res) => {
  // Set required SSE headers to keep the connection open
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Assuming req.user is populated by your auth middleware
  const userId = req.user._id.toString();

  // Add this user's response object to our active clients map
  sseClients.set(userId, res);

  // Send an initial heartbeat to confirm connection
  res.write(
    `data: ${JSON.stringify({ type: "connection", message: "SSE Connected" })}\n\n`,
  );

  // Clean up if the user closes the browser or logs out
  req.on("close", () => {
    sseClients.delete(userId);
    res.end();
  });
};
