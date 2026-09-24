import express from "express";
import { streamNotifications } from "../../controllers/common/notification.controller.js";
import { protect } from "../../middleware/authMiddleware.js"; // Use your standard user auth middleware

const router = express.Router();

// Ensure the user is logged in
router.use(protect);

router.get('/stream',streamNotifications)