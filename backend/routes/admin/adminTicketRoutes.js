import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getAdminTickets, updateAdminTicketStatus } from "../../controllers/admin/adminTicketController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/", getAdminTickets);
router.patch("/:id/status", updateAdminTicketStatus);

export default router;
