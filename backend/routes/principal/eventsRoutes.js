import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventStats,
  uploadEventPhotos,
} from "../../controllers/principal/eventsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal"));

router.get("/stats", getEventStats);
router.post("/", createEvent);
router.get("/", getAllEvents);
router.post("/:id/photos", upload.array("photos", 10), uploadEventPhotos);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;
