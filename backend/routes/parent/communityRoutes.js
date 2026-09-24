import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { 
    getCommunityFeed, 
    togglePostLike, 
    addComment, 
    voteOnPoll, 
    rsvpToCommunityEvent 
} from "../../controllers/parent/communityController.js";

const router = express.Router();

router.use(protect);
router.use(authorize('parent')); 

// Main Feed Route (Handles ?filter=photos etc.)
router.get("/feed", getCommunityFeed);

// Interaction Routes
router.post("/posts/:id/like", togglePostLike);
router.post("/posts/:id/comment", addComment);
router.post("/posts/:id/poll-vote", voteOnPoll);
router.post("/posts/:id/event-rsvp", rsvpToCommunityEvent);

export default router;