import express from "express";
import {
    loginUnified,
    forgotPasswordUnified,
    verifyOtpUnified,
    resetPasswordUnified
} from "../../controllers/auth/commonAuth.js";

const router = express.Router();

router.post("/login", loginUnified);
router.post("/forgot-password", forgotPasswordUnified);
router.post("/verify-otp", verifyOtpUnified);
router.post("/reset-password", resetPasswordUnified);

export default router;
