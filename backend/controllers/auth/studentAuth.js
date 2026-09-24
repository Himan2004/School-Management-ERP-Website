// studentAuth.controller.js
import User from "../../models/users/user.model.js";
import SystemSettings from "../../models/graphura/SystemSettings.js";
import Student from "../../models/users/student.model.js";

export const loginStudent = async (req, res) => {
    try {
        const { loginId, password } = req.body;

        // 🔥 CHECK SYSTEM SETTINGS FIRST
        const systemSettings = await SystemSettings.findOne();
        if (systemSettings && systemSettings.school && systemSettings.school.enableStudentPortal === false) {
            return res.status(403).json({ 
                success: false, 
                message: "The Student Portal is temporarily disabled for maintenance. Please try again later." 
            });
        }

        const user = await User.findByLogin(loginId);

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid Login ID" });
        }

        if (user.role !== "student") {
            return res.status(403).json({ success: false, message: "Access denied. Not a student." });
        }

        if (!user.isActiveUser()) {
            return res.status(403).json({ success: false, message: "Account is inactive. Contact your administrator." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Password" });
        }

        // Validate student status is Active
        const studentProfile = await Student.findOne({ user: user._id });
        if (!studentProfile || studentProfile.status?.toLowerCase() !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is currently inactive. Please contact your school administration."
            });
        }

        const token = user.generateToken();

        // Populate school details for dynamic frontend branding upon login
        await user.populate({
            path: "school",
            populate: {
                path: "organization",
                select: "organizationName organizationLogo"
            }
        });

        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({
            success: true,
            role: "student",
            token,
            user: {
                id: user._id,
                name: user.name,
                loginId: user.loginId,
                role: user.role,
                school: user.school
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const logoutStudent = async (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getStudent = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
        delete userData.password;

        res.status(200).json({ success: true, data: userData });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};