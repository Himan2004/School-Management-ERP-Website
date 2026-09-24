import express from "express";
import {
    getAvailableSchools,
    getEligibleStudents,
    getPendingRequests,
    getTransferHistory,
    generateTC,
    approveRequest,
    rejectRequest,
    transferStudent,
    getTransferDetails,
    getTransferStats
} from "../../controllers/admin/AdminTransferController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/available-schools", getAvailableSchools);
router.get("/eligible-students", getEligibleStudents);
router.get("/pending-requests", getPendingRequests);
router.get("/history", getTransferHistory);
router.post("/generate-tc", generateTC);
router.post("/requests/:id/approve", approveRequest);
router.post("/requests/:id/reject", rejectRequest);
router.post("/student", transferStudent);
router.get("/details/:id", getTransferDetails);
router.get("/stats", getTransferStats);

export default router;
