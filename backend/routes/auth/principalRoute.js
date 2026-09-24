import express from "express";
import { principalLogin, principalLogout, getMe } from "../../controllers/auth/principalAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", principalLogin);
router.post("/logout", protect, principalLogout);
router.get("/me", protect, authorize("principal"), getMe);

export default router;