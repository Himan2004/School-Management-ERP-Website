import express from "express";

// 1. Import Controllers
import { 
    getNotices, 
    markNoticeAsRead 
} from "../../controllers/parent/parentNoticeController.js";

import { 
    getEvents, 
    rsvpToEvent 
} from "../../controllers/parent/parentEventController.js";

import { 
    getStudentActivities 
} from "../../controllers/parent/parentActivityController.js";

// 2. Import Middleware (Adjust paths/names based on your actual Graphura auth setup)
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------------
// GLOBAL MIDDLEWARE FOR THIS ROUTE FILE
// Ensures only logged-in parents can access these endpoints
// --------------------------------------------------------
router.use(protect);
router.use(authorize('parent')); 

// --------------------------------------------------------
// TAB 1: NOTICES
// --------------------------------------------------------
// GET /api/parent/notice-page/notices
router.get("/notices", getNotices);

// PUT /api/parent/notice-page/notices/:id/read
router.put("/notices/:id/read", markNoticeAsRead);

// --------------------------------------------------------
// TAB 2: EVENTS
// --------------------------------------------------------
// GET /api/parent/notice-page/events
router.get("/events", getEvents);

// POST /api/parent/notice-page/events/rsvp
// Expects body: { "eventId": "...", "response": "yes/no" }
router.post("/events/rsvp", rsvpToEvent);

// --------------------------------------------------------
// TAB 3: ACTIVITIES & ACHIEVEMENTS
// --------------------------------------------------------
// GET /api/parent/notice-page/activities?student_id=...
router.get("/activities", getStudentActivities);

export default router;