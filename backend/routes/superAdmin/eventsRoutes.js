import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  createGlobalEvent,
  deleteGlobalEvent,
  getGlobalEvents,
  getSchoolsForDropdown,
  updateGlobalEvent,
} from "../../controllers/superAdmin/eventsController.js";

const router = express.Router();
router.use(protect);
router.use(authorize("superadmin"));

// Schools dropdown (for event creation form)
router.get("/events/schools", getSchoolsForDropdown);

router.get("/events/global", getGlobalEvents);
router.post("/events/global", createGlobalEvent);
router.put("/events/global/:id", updateGlobalEvent);
router.delete("/events/global/:id", deleteGlobalEvent);

export default router;
