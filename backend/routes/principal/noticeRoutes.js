import express from "express";
import {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  togglePinNotice,
  getNoticeStats,
  trackNoticeView,
  bulkNoticeAction,
  uploadNoticeAttachments,
} from "../../controllers/principal/noticeController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal"));

router.get("/stats", getNoticeStats);
router.post("/bulk-action", bulkNoticeAction);
router.post("/:id/view", trackNoticeView);
router.post("/:id/attachments", upload.array("attachments", 5), uploadNoticeAttachments);
router.post("/", createNotice);
router.get("/", getAllNotices);
router.get("/:id", getNoticeById);
router.put("/:id", updateNotice);
router.delete("/:id", deleteNotice);
router.patch("/:id/pin", togglePinNotice);

export default router;
