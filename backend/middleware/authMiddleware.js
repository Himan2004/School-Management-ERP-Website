import jwt from "jsonwebtoken";
import User from "../models/users/user.model.js";
import Organization from "../models/organization/Organization.js";
import GraphuraAdmin from "../models/graphura/GraphuraAdmin.js";
import SuperAdmin from "../models/superAdmin/SuperAdmin.js";
// 🔥 1. IMPORT SYSTEM SETTINGS
import SystemSettings from "../models/graphura/SystemSettings.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.role = decoded?.role;

    // 🔥 2. CHECK SYSTEM SETTINGS TO FORCE LOGOUT IF PORTAL IS DISABLED
    if (["student", "teacher", "parent"].includes(req.role)) {
      const systemSettings = await SystemSettings.findOne().lean();

      if (systemSettings && systemSettings.school) {
        let isLockedOut = false;
        let message = "";

        if (
          req.role === "student" &&
          systemSettings.school.enableStudentPortal === false
        ) {
          isLockedOut = true;
          message =
            "The Student Portal is temporarily disabled for maintenance.";
        } else if (
          req.role === "teacher" &&
          systemSettings.school.enableTeacherPortal === false
        ) {
          isLockedOut = true;
          message =
            "The Teacher Portal is temporarily disabled for maintenance.";
        } else if (
          req.role === "parent" &&
          systemSettings.school.enableParentPortal === false
        ) {
          isLockedOut = true;
          message =
            "The Parent Portal is temporarily disabled for maintenance.";
        }

        if (isLockedOut) {
          // Clear the cookie to forcefully destroy the session
          res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
          });
          // Send 401 Unauthorized so the frontend knows to redirect to login
          return res.status(401).json({
            success: false,
            message: message,
            isMaintenance: true,
          });
        }
      }
    }

    let user;

    if (decoded.role === "graphura_admin") {
      user = await GraphuraAdmin.findById(decoded.id);
    } else if (decoded.role === "superadmin") {
      user = await Organization.findById(decoded.id);
      if (user) {
        req.superAdminProfile = await SuperAdmin.findById(decoded.superAdminId);
        req.superAdmin = req.superAdminProfile;
      }
    } else {
      user = await User.findById(decoded.id)
        .populate({
          path: "school",
          populate: {
            path: "organization",
            select: "organizationName organizationLogo _id",
          },
        })
        .populate("profileId");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if graphura_admin is active
    if (decoded.role === "graphura_admin" && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Check if superadmin is active
    if (decoded.role === "superadmin" && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Organization account is ${user.status}`,
      });
    }

    // Check if user/admin account is active
    if (
      decoded.role !== "superadmin" &&
      decoded.role !== "graphura_admin" &&
      user.status !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.role || req.user?.role;

    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};
