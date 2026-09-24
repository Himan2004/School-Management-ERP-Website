import express from "express";
import {
    getPTMFeedbacks,
    updatePTMFeedbackStatus,
    sendParentMessage
} from "../../controllers/principal/ptmFeedbackController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Require authenticated principal role
router.use(protect);
router.use(authorize("principal", "admin"));

router.get("/", getPTMFeedbacks);
router.put("/:id", updatePTMFeedbackStatus);
router.post("/:id/message", sendParentMessage);

export default router;
