import User from "../../models/users/user.model.js";
import Organization from "../../models/organization/Organization.js";
import SuperAdmin from "../../models/superAdmin/SuperAdmin.js";
import AdminProfile from "../../models/users/admin.model.js";
import otpService from "../../services/otpService.js";
import jwt from "jsonwebtoken";

// ─── Token Generators ────────────────────────────────────────────────────────
const generateSuperAdminToken = (organizationId, superAdminId) => {
    return jwt.sign(
        { id: organizationId, superAdminId, role: "superadmin" },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
};

// ─── Controller Methods ──────────────────────────────────────────────────────

/**
 * Unified login endpoint supporting all roles:
 * Student, Parent, Teacher, Subject Teacher, Admin, Accountant, Principal, Organization
 */
export const loginUnified = async (req, res) => {
    try {
        const { loginId, password } = req.body;
        if (!loginId) {
            return res.status(400).json({ success: false, field: "loginId", message: "Please provide Login ID." });
        }
        if (!password) {
            return res.status(400).json({ success: false, field: "password", message: "Please provide password." });
        }

        const normalizedLoginId = loginId.trim().toUpperCase();

        // 1. Try to authenticate as Organization / SuperAdmin
        const organization = await Organization.findOne({ organizationId: normalizedLoginId }).select("+password");

        if (organization) {
            if (organization.status !== "active") {
                return res.status(403).json({
                    success: false,
                    field: "loginId",
                    message: `Your organization account is ${organization.status}`
                });
            }

            const isPasswordMatch = await organization.comparePassword(password);
            if (!isPasswordMatch) {
                return res.status(401).json({ success: false, field: "password", message: "Incorrect password." });
            }

            const superAdmin = await SuperAdmin.findById(organization.superAdminProfile);
            if (!superAdmin) {
                return res.status(404).json({
                    success: false,
                    field: "loginId",
                    message: "SuperAdmin profile not found for this organization"
                });
            }

            const token = generateSuperAdminToken(organization._id, superAdmin._id);

            // Set cookie
            res.cookie("token", token, {
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict"
            });

            return res.status(200).json({
                success: true,
                message: "Login successful",
                token,
                role: "superadmin",
                data: {
                    id: organization._id,
                    organizationId: organization.organizationId,
                    organizationName: organization.organizationName,
                    superAdminId: superAdmin._id,
                    superAdminName: superAdmin.name,
                    role: "superadmin"
                }
            });
        }

        // 2. Try to authenticate as User (Principal, Admin, Teacher, Accountant, Parent, Student)
        const user = await User.findByLogin(normalizedLoginId);

        if (!user) {
            return res.status(401).json({ success: false, field: "loginId", message: "Invalid Login ID." });
        }

        if (!user.isActiveUser()) {
            return res.status(403).json({ success: false, field: "loginId", message: "Account is inactive. Contact your administrator." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, field: "password", message: "Incorrect password." });
        }

        const token = user.generateToken();

        // Cookie expiry: 1 day
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        // Structure the response payload based on the user's role
        const role = user.role;
        let responseUser = {
            id: user._id,
            name: user.name,
            loginId: user.loginId,
            email: user.email,
            role: user.role,
            school: user.school
        };

        if (role === "admin") {
            const adminProfile = await AdminProfile.findOne({ user: user._id })
                .populate("school", "schoolName")
                .lean();

            responseUser.adminProfile = adminProfile ? {
                name: user.name,
                email: user.email,
                phone: adminProfile.phoneNumber || user.phone || '',
                avatarUrl: adminProfile.photo || null,
                role: user.role,
                schoolName: adminProfile.school?.schoolName || '',
                schoolId: adminProfile.school?._id || user.school,
                address: adminProfile.address || '',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            } : {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                avatarUrl: null,
                role: user.role,
                schoolName: '',
                schoolId: user.school,
                address: '',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        } else if (role === "teacher") {
            await user.populate([
                {
                    path: "school",
                    populate: {
                        path: "organization",
                        select: "organizationName organizationLogo"
                    }
                },
                {
                    path: "profileId"
                }
            ]);
            responseUser.school = user.school;
            responseUser.profileId = user.profileId;
        } else if (role === "student") {
            await user.populate({
                path: "school",
                populate: {
                    path: "organization",
                    select: "organizationName organizationLogo"
                }
            });
            responseUser.school = user.school;
        } else if (role === "accountant") {
            await user.populate("school");
            responseUser.school = user.school;
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            role,
            user: responseUser
        });

    } catch (error) {
        console.error("loginUnified error:", error);
        return res.status(500).json({ success: false, message: error.message || "Server error during login" });
    }
};

/**
 * Step 1: Request OTP for Forgot Password.
 * Accepts loginId or email, checks both collections, and sends OTP via Brevo.
 */
export const forgotPasswordUnified = async (req, res) => {
    try {
        const { loginId } = req.body;
        if (!loginId) {
            return res.status(400).json({ success: false, message: "Please provide your Login ID" });
        }

        let email = "";
        let entityType = "";

        const identifier = loginId.trim().toUpperCase();

        // 1. Search in User model by loginId only
        const user = await User.findOne({ loginId: identifier });

        if (user) {
            email = user.email;
            entityType = "user";
        } else {
            // 2. Search in Organization model by organizationId only
            const org = await Organization.findOne({ organizationId: identifier });
            if (org) {
                email = org.officialEmail;
                entityType = "organization";
            }
        }

        if (!email) {
            return res.status(404).json({ success: false, message: "No registered user or organization found with that Login ID" });
        }

        // Send OTP using otpService with a common secret key
        const result = await otpService.createOTP(
            email,
            "COMMON_PASSWORD_RESET",
            "password_reset"
        );

        // Mask email for display security (first 3 and last 2 digits, middle blurred)
        const [localPart, domainPart] = email.split("@");
        let maskedEmail = "";
        if (localPart.length <= 5) {
            if (localPart.length <= 2) {
                maskedEmail = localPart + "***" + "@" + domainPart;
            } else {
                maskedEmail = localPart.substring(0, 1) + "***" + localPart.substring(localPart.length - 1) + "@" + domainPart;
            }
        } else {
            const first3 = localPart.substring(0, 3);
            const last2 = localPart.substring(localPart.length - 2);
            maskedEmail = first3 + "*****" + last2 + "@" + domainPart;
        }

        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to your registered email (${maskedEmail})`,
            data: {
                maskedEmail: maskedEmail,
                loginId: identifier,
                entityType: entityType,
                expiresAt: result.expiresAt
            }
        });

    } catch (error) {
        console.error("forgotPasswordUnified error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to process request. Please try again." });
    }
};

/**
 * Step 2: Verify OTP.
 * Verifies the OTP sent to email and returns a signed short-lived reset token on success.
 */
export const verifyOtpUnified = async (req, res) => {
    try {
        const { loginId, otp } = req.body;

        if (!loginId || !otp) {
            return res.status(400).json({ success: false, message: "Login ID and OTP are required" });
        }

        const normalizedLoginId = loginId.trim().toUpperCase();

        // Find the user or organization to retrieve their email
        let user = await User.findOne({ loginId: normalizedLoginId });
        let organization = null;
        let email = "";

        if (user) {
            email = user.email;
        } else {
            organization = await Organization.findOne({ organizationId: normalizedLoginId });
            if (organization) {
                email = organization.officialEmail;
            }
        }

        if (!email) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        // Verify the OTP (this marks the OTP as used in db)
        const verification = await otpService.verifyOTP(
            email,
            otp,
            "COMMON_PASSWORD_RESET",
            "password_reset"
        );

        if (!verification.success) {
            return res.status(400).json({ success: false, message: verification.message });
        }

        // Generate a short-lived reset token (valid for 10 minutes)
        const resetToken = jwt.sign(
            { loginId: normalizedLoginId, purpose: "reset_password" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. Please enter your new password.",
            resetToken
        });

    } catch (error) {
        console.error("verifyOtpUnified error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to verify OTP." });
    }
};

/**
 * Step 3: Reset Password.
 * Decodes the resetToken and saves the newPassword.
 */
export const resetPasswordUnified = async (req, res) => {
    try {
        const { resetToken, newPassword, confirmNewPassword } = req.body;

        if (!resetToken || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        // Decode and verify the reset token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset session. Please request a new OTP." });
        }

        if (decoded.purpose !== "reset_password" || !decoded.loginId) {
            return res.status(400).json({ success: false, message: "Invalid reset token structure" });
        }

        const normalizedLoginId = decoded.loginId;

        // Find the user or organization
        let user = await User.findOne({ loginId: normalizedLoginId }).select("+password");
        let organization = null;

        if (user) {
            user.password = newPassword;
            await user.save();
        } else {
            organization = await Organization.findOne({ organizationId: normalizedLoginId }).select("+password");
            if (organization) {
                organization.password = newPassword;
                await organization.save();
            }
        }

        if (!user && !organization) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password."
        });

    } catch (error) {
        console.error("resetPasswordUnified error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to reset password. Please try again." });
    }
};
