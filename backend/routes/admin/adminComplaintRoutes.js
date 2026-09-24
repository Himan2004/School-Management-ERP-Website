import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
    getEscalatedComplaints,
    resolveEscalatedComplaint,
    replyEscalatedComplaint,
    assignEscalatedComplaint,
    closeEscalatedComplaint,
    returnBackComplaint
} from "../../controllers/admin/adminComplaint.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/escalated", getEscalatedComplaints);
router.patch("/:id/resolve", resolveEscalatedComplaint);
router.post("/:id/reply", replyEscalatedComplaint);
router.patch("/:id/assign", assignEscalatedComplaint);
router.patch("/:id/close", closeEscalatedComplaint);
router.patch("/:id/return-back", returnBackComplaint);

export default router;
