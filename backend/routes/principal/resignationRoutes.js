import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js"; // <-- Fixed path!
import {
  getSchoolResignations,
  approveSchoolResignation,
  rejectSchoolResignation
} from "../../controllers/principal/resignationController.js"; // <-- Fixed path!

const router = express.Router();

// Only allow principals and admins to hit these routes
router.use(protect, authorize("principal", "admin"));

router.get("/", getSchoolResignations);
router.post("/:id/approve", approveSchoolResignation);
router.post("/:id/reject", rejectSchoolResignation);

export default router;