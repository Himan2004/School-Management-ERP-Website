import express from "express";
import {
  createMeeting,
  getAllMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  cancelMeeting,
  getMeetingStats,
} from "../../controllers/principal/meetingsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal", "admin"));

router.get("/stats", getMeetingStats);
router.post("/", createMeeting);
router.get("/", getAllMeetings);
router.get("/:id", getMeetingById);
router.put("/:id", updateMeeting);
router.patch("/:id/cancel", cancelMeeting);
router.delete("/:id", deleteMeeting);

export default router;
