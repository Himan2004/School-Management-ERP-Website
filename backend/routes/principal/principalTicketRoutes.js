import express from "express";
import {
  createTicket,
  getMyTickets,
  getTicketDetails,
  addTicketResponse,
  updateTicketStatus,
} from "../../controllers/principal/principalTicket.controller.js"; // Adjust path
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal", "admin"));

router.route("/").post(createTicket).get(getMyTickets);

router.get("/:id", getTicketDetails);
router.post("/:id/response", addTicketResponse);
router.patch("/:id/status", updateTicketStatus);

export default router;
