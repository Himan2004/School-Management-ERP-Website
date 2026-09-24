import User from "../../models/users/user.model.js";
import AuditLog from "../../models/common/AuditLog.js";
import SystemSettings from "../../models/graphura/SystemSettings.js";

export const loginTeacher = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    // 🔥 CHECK SYSTEM SETTINGS FIRST
    const systemSettings = await SystemSettings.findOne();
    if (systemSettings && systemSettings.school && systemSettings.school.enableTeacherPortal === false) {
        return res.status(403).json({ 
            success: false, 
            message: "The Teacher Portal is temporarily disabled for maintenance. Please try again later." 
        });
    }

    const user = await User.findByLogin(loginId.toUpperCase());

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Login ID" });
    }

    if (user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Access denied. Not a teacher." });
    }

    if (!user.isActiveUser()) {
      return res.status(403).json({ success: false, message: "Account is inactive. Contact your administrator." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    const token = user.generateToken();

    // Populate school details and teacher profile upon login
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

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Log the login for Audit Logs
    await AuditLog.create({
      school: user.school._id || user.school,
      user: user._id,
      action: "login",
      module: "auth",
      details: { role: "teacher" },
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || "Unknown",
      userAgent: req.headers["user-agent"] || "Unknown"
    });

    res.status(200).json({
      success: true,
      role: "teacher",
      token,
      user: {
        id: user._id,
        name: user.name,
        loginId: user.loginId,
        role: user.role,
        school: user.school,
        profileId: user.profileId
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutTeacher = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getTeacher = async (req, res) => {
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