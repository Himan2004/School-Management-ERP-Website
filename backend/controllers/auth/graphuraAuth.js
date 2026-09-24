import jwt from "jsonwebtoken";
import GraphuraAdmin from "../../models/graphura/GraphuraAdmin.js";
import crypto from "crypto";
import { sendAdminPasswordResetEmail } from "../../services/emailService.js";

// Replace generateRefreshToken + sendTokens with this:
const generateToken = (id) =>
    jwt.sign({ id, role: "graphura_admin" }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "7d",
    });

const sendToken = (res, admin, statusCode) => {
    const token = generateToken(admin._id);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(statusCode).json({
        success: true,
        token,
        admin: {
            id: admin._id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
            avatarUrl: admin.avatarUrl,
        },
    });
};

// ── Controllers ────────────────────────────────────────────────────────────────

export const loginGraphuraAdmin = async (req, res) => {
    try {
        const { email, password, graphuraKey } = req.body;

        if (!email || !password || !graphuraKey) {
            return res.status(400).json({ success: false, message: "Email, password and Graphura key are required." });
        }

        // 🔥 NO MORE .ENV CHECKS! Straight to the database.
        const admin = await GraphuraAdmin.findOne({ email }).select("+password +graphuraKey");

        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (!admin.isActive) return res.status(403).json({ success: false, message: "Account is deactivated." });

        if (admin.isLocked()) {
            const minutesLeft = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
            return res.status(429).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minute(s).` });
        }

        const isPasswordValid = await admin.comparePassword(password);
        const isKeyValid = await admin.compareAdminKey(graphuraKey);

        if (!isPasswordValid || !isKeyValid) {
            await admin.incrementLoginAttempts();
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        await admin.resetLoginAttempts();

        admin.recentActions.push({ action: "LOGIN", description: `Login from IP: ${req.ip}` });
        await admin.save();

        return sendToken(res, admin, 200);
    } catch (error) {
        console.error("loginGraphuraAdmin error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

export const logoutGraphuraAdmin = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        console.error("logoutGraphuraAdmin error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};


export const getGraphuraAdminProfile = async (req, res) => {
    try {
        if (!req?.user) {
            return res.status(404).json({
                success: false,
                message: "Graphura admin not found.",
            });
        }

        return res.status(200).json({
            success: true,
            admin: req?.user
        });
    } catch (error) {
        console.error("getGraphuraAdminProfile error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

/**
 * @desc    Update Graphura Admin Profile
 * @route   PUT /api/auth/graphura/update-profile
 * @access  Private/GraphuraAdmin
 */
export const updateGraphuraProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body;
        const admin = await GraphuraAdmin.findById(req.user._id);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Update fields
        if (fullName) admin.fullName = fullName;
        if (email) admin.email = email;
        
        // Handle avatar if uploaded via cloudinary
        if (req.file) {
            admin.avatarUrl = req.file.path; 
        }

        // Log action
        admin.recentActions.push({
            action: "UPDATE_PROFILE",
            description: `Profile details updated from IP: ${req.ip}`,
        });

        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            admin: {
                id: admin._id,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
                avatarUrl: admin.avatarUrl
            }
        });
    } catch (error) {
        console.error("updateGraphuraProfile error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * @desc    Update Graphura Admin Password
 * @route   PUT /api/auth/graphura/update-password
 * @access  Private/GraphuraAdmin
 */
export const updateGraphuraPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Fetch admin with password
        const admin = await GraphuraAdmin.findById(req.user._id).select("+password");

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Verify current password
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid current password" });
        }

        // Set new password (will be hashed by pre-save hook)
        admin.password = newPassword;

        // Log action
        admin.recentActions.push({
            action: "UPDATE_PASSWORD",
            description: "Password changed successfully",
        });

        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.error("updateGraphuraPassword error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const forgotPasswordGraphuraAdmin = async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await GraphuraAdmin.findOne({ email });

        if (!admin) {
            // We return 200 even if it fails so hackers can't guess emails
            return res.status(200).json({ success: true, message: "If the email exists, an OTP will be sent." });
        }

        // Generate a 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash the OTP before saving to DB
        admin.resetPasswordOtp = crypto.createHash("sha256").update(otp).digest("hex");
        admin.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await admin.save();

        await sendAdminPasswordResetEmail(admin.email, otp);

        res.status(200).json({ success: true, message: "OTP sent to email successfully." });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ success: false, message: "Email could not be sent." });
    }
};

// ── NEW: Reset Password API ──────────────────────────────────────────

export const resetPasswordGraphuraAdmin = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Hash the incoming OTP to compare with DB
        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

        const admin = await GraphuraAdmin.findOne({
            email,
            resetPasswordOtp: hashedOtp,
            resetPasswordOtpExpire: { $gt: Date.now() } // Ensure it hasn't expired
        });

        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        // Set new password
        admin.password = newPassword;
        admin.resetPasswordOtp = undefined;
        admin.resetPasswordOtpExpire = undefined;
        
        admin.recentActions.push({ action: "PASSWORD_RESET", description: `Password reset via OTP` });
        await admin.save();

        res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};