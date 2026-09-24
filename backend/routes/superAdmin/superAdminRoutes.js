import {
  getAllSchools,
  acceptSchoolRequest,
  rejectSchoolRequest,
  updateSchool,
  toggleSchoolStatus,
  deleteSchool,
  updateSuperAdminProfile,
  getDashboardAnalytics,
  getSchoolRequests,
  createSchoolDirect,
} from "../../controllers/superAdmin/superAdminController.js";
import express from "express";
import upload from "../../middleware/upload.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// ─── SCHOOL REQUESTS ROUTES ─────────────────────────────────────────────

router.get("/schools", protect, authorize("superadmin"), getAllSchools);
router.post("/schools", protect, authorize("superadmin"), createSchoolDirect);
router.get("/requests", protect, authorize("superadmin"), getSchoolRequests);

router.post(
  "/requests/:id/accept",
  protect,
  authorize("superadmin"),
  acceptSchoolRequest,
);

router.post(
  "/requests/:id/reject",
  protect,
  authorize("superadmin"),
  rejectSchoolRequest,
);

// ─── NEW CRUD ROUTES FOR SCHOOLS ────────────────────────────────────────

router.put("/schools/:id", protect, authorize("superadmin"), updateSchool);
router.patch(
  "/schools/:id/status",
  protect,
  authorize("superadmin"),
  toggleSchoolStatus,
);
router.delete("/schools/:id", protect, authorize("superadmin"), deleteSchool);

// ─── PROFILE & DASHBOARD ROUTES ─────────────────────────────────────────

router.patch(
  "/profile",
  protect,
  authorize("superadmin"),
  upload.single("photo"),
  updateSuperAdminProfile,
);

router.get(
  "/dashboard",
  protect,
  authorize("superadmin"),
  getDashboardAnalytics,
);

export default router;
