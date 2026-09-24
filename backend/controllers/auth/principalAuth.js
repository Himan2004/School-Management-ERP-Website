import User from "../../models/users/user.model.js";
import Principal from "../../models/users/principal.model.js";
import AuditLog from "../../models/common/AuditLog.js";

export const principalLogin = async (req, res) => {
    try {
        const { loginId, password } = req.body;

        if (!loginId || !password)
            return res.status(400).json({ success: false, message: "loginId and password are required" });

        const user = await User.findByLogin(loginId);

        if (!user || user.role !== "principal")
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        if (!user.isActiveUser())
            return res.status(403).json({ success: false, message: "Account is inactive" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials" });

        const token = user.generateToken();

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Log the login for Audit Logs
        await AuditLog.create({
            school: user.school._id || user.school,
            user: user._id,
            action: "login",
            module: "auth",
            details: { role: "principal" },
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || "Unknown",
            userAgent: req.headers["user-agent"] || "Unknown"
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                loginId: user.loginId,
                email: user.email,
                role: user.role,
                school: user.school,
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const principalLogout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({ success: true, message: "Logged out successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("school", "schoolName branchId officialEmail officialPhone address settings");

        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        const profile = await Principal.findOne({ user: user._id });

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                loginId: user.loginId,
                email: user.email,
                role: user.role,
                status: user.status,
                school: user.school,
                profile: profile || null,
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};