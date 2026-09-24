import express from "express";
import {
    createStaff,
    getAllStaff,
    getStaffById,
    updateStaffProfile,
    updateStaffStatus,
    deleteStaff,
    bulkImportStaff,
    getStaffStats,
    markStaffAttendance,
    getStaffAttendanceReport,
    requestLeave,
    processLeaveRequest,
    getPendingLeaves,
    getLeaveBalance,
    requestTransfer,
    processTransfer,
    promoteStaff,
    getStaffHistory,
    getAllPromotions
} from "../../controllers/admin/staffController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

// Part 1: CRUD
router.post("/", createStaff);
router.get("/", getAllStaff);
router.get("/stats", getStaffStats);
router.get("/:id", getStaffById);
router.put("/:id", updateStaffProfile);
router.patch("/:id/status", updateStaffStatus);
router.delete("/:id", deleteStaff);
router.post("/bulk-import", bulkImportStaff);

// Part 2: Attendance & Leave
router.post("/attendance", markStaffAttendance);
router.get("/attendance/report", getStaffAttendanceReport);
router.post("/leave/request", requestLeave);
router.patch("/leave/:id/process", processLeaveRequest);
router.get("/leaves/pending", getPendingLeaves);
router.get("/leaves/balance/:staffId", getLeaveBalance);

// Part 3: Transfer & Promotion
router.post("/transfer", requestTransfer);
router.patch("/transfer/:id/process", processTransfer);
router.post("/promote", promoteStaff);
router.get("/history/:staffId", getStaffHistory);
router.get("/promotions/all", getAllPromotions);

export default router;
