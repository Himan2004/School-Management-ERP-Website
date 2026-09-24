import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getAllTickets,
  getTicketDetails,
  updateTicketStatus,
  updateTicketPriority,
  escalateTicket,
  resolveTicket,
  addTicketResponse
} from "../../controllers/superAdmin/ticketController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin"));

router.post("/tickets/:id/response", addTicketResponse);
router.get("/tickets", getAllTickets);
router.get("/tickets/:id", getTicketDetails);
router.patch("/tickets/:id/status", updateTicketStatus);
router.patch("/tickets/:id/priority", updateTicketPriority);
router.patch("/tickets/:id/escalate", escalateTicket);
router.patch("/tickets/:id/resolve", resolveTicket);

export default router;
