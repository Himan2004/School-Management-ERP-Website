import express from "express";
const router = express.Router();

import { getAdmin, loginAdmin, logoutAdmin } from "../../controllers/auth/adminAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

router.post("/login", loginAdmin);
router.post("/logout", logoutAdmin);
router.get("/me", protect, authorize("admin"), getAdmin);

export default router;