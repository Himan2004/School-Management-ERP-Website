import express from "express";

// 1. Import Controllers (Using the exact function names from the controller we just built)
import { 
    getMeetings, 
    respondToMeeting, 
    bookSlot 
} from "../../controllers/parent/meetingsController.js";

// 2. Import Authentication Middleware
// Adjust the path to wherever your actual auth middleware is stored
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------------
// GLOBAL MIDDLEWARE FOR THIS ROUTE FILE
// Ensures only logged-in parents can access the meeting endpoints
// --------------------------------------------------------
router.use(protect);
router.use(authorize('parent')); 

// --------------------------------------------------------
// GET /api/parent/meetings?student_id=...
// Fetches upcoming, past, responses, and booked slots
// --------------------------------------------------------
router.get("/", getMeetings);

// --------------------------------------------------------
// PATCH /api/parent/meetings/:id/respond
// Allows parent to click "Will Attend" or "Cannot Attend"
// Expects body: { "response": "yes" | "no" }
// --------------------------------------------------------
router.patch("/:id/respond", respondToMeeting);

// --------------------------------------------------------
// POST /api/parent/meetings/:id/book-slot
// Locks in a 15-minute time slot for the parent
// Expects body: { "slotTime": "9:15 AM" }
// --------------------------------------------------------
router.post("/:id/book-slot", bookSlot);

export default router;