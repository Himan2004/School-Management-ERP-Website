import express from "express";
import {
    createNotice,
    getAllNotices,
    getNoticeById,
    updateNotice,
    deleteNotice,
    trackNoticeView,
    getNoticeStats,
    bulkNoticeAction
} from "../../controllers/admin/noticeController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// Stats
router.get("/stats", getNoticeStats);

// Bulk Actions
router.post("/bulk-action", bulkNoticeAction);

// Tracking
router.post("/:id/view", trackNoticeView);

// CRUD
router.post("/", createNotice);
router.get("/", getAllNotices);
router.get("/:id", getNoticeById);
router.put("/:id", updateNotice);
router.delete("/:id", deleteNotice);

export default router;
