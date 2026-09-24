import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  acknowledgeMeeting,
  completeMeeting,
  cancelMeeting,
  getMeetingAcknowledgements,
  getUpcomingMeetings
} from "../../controllers/superAdmin/staffMeetingController.js";

const router = express.Router();

// Get all meetings
router.get("/", protect, authorize("superadmin"), getAllMeetings);

// Get upcoming meetings for staff
router.get("/upcoming", protect, getUpcomingMeetings);

// Get single meeting
router.get("/:id", protect, getMeetingById);

// Get meeting acknowledgements
router.get("/:id/acknowledgements", protect, getMeetingAcknowledgements);

// Create meeting
router.post("/", protect, authorize("superadmin"), createMeeting);

// Update meeting
router.patch("/:id", protect, authorize("superadmin"), updateMeeting);

// Acknowledge meeting
router.post("/:id/acknowledge", protect, acknowledgeMeeting);

// Complete meeting
router.post("/:id/complete", protect, authorize("superadmin"), completeMeeting);

// Cancel meeting
router.post("/:id/cancel", protect, authorize("superadmin"), cancelMeeting);

export default router;
