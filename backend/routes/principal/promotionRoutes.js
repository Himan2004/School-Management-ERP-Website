import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import {
  getPromotionStaff,
  getPromotionHistory,
  promoteTeacher,
  demoteTeacher,
  getPromotionStats,
  exportPromotionHistory
} from "../../controllers/principal/promotionController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("principal"));

router.get("/promotions/staff", getPromotionStaff);
router.get("/promotions/history", getPromotionHistory);
router.post("/promotions/promote", promoteTeacher);
router.post("/promotions/demote", demoteTeacher);
router.get("/promotions/stats", getPromotionStats);
router.get("/promotions/export", exportPromotionHistory);

export default router;
