import express from "express";
import {
    loginGraphuraAdmin,
    logoutGraphuraAdmin,
    getGraphuraAdminProfile,
    updateGraphuraProfile,
    updateGraphuraPassword,
    forgotPasswordGraphuraAdmin, // ADD THIS
    resetPasswordGraphuraAdmin
} from "../../controllers/auth/graphuraAuth.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();

// Public
router.post("/login", loginGraphuraAdmin);
router.post("/logout", logoutGraphuraAdmin);
router.post("/forgot-password", forgotPasswordGraphuraAdmin);
router.post("/reset-password", resetPasswordGraphuraAdmin);

// Protected
router.get("/me", protect, authorize("graphura_admin"), getGraphuraAdminProfile);
router.put("/update-profile", protect, authorize("graphura_admin"), upload.single("avatar"), updateGraphuraProfile);
router.put("/update-password", protect, authorize("graphura_admin"), updateGraphuraPassword);

export default router;
