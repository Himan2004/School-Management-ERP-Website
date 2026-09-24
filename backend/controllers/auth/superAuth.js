import SuperAdmin from "../../models/superAdmin/SuperAdmin.js";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import OTP from "../../models/common/OTP.js";
import otpService from "../../services/otpService.js";
import OrganizationRequest from "../../models/graphura/OrganizationRequest.js";
import Organization from "../../models/organization/Organization.js";
import GraphuraNotification from "../../models/graphura/GraphuraNotification.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const generateToken = (organizationId, superAdminId) => {
  return jwt.sign(
    { id: organizationId, superAdminId, role: "superadmin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE },
  );
};

const sendTokenResponse = (organization, superAdmin, res) => {
  const token = generateToken(organization._id, superAdmin._id);

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res
    .status(200)
    .cookie("token", token, options)
    .json({
      success: true,
      message: "Login successful",
      data: {
        id: organization._id,
        organizationId: organization.organizationId,
        organizationName: organization.organizationName,
        superAdminId: superAdmin._id,
        superAdminName: superAdmin.name,
        role: "superadmin",
      },
    });
};

export const createOrganizationRequest = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      organizationName,
      organizationType,
      numberOfBranches,
      yearEstablished,
      address,
      city,
      state,
      country,
      pincode,
      officialEmail,
      contactNumber,
      adminName,
      adminEmail,
      adminPhone,
      registrationNumber,
      panNumber,
      gstNumber,
      subscriptionPlan,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // --- SECURE PAYMENT VERIFICATION ---
    if (
      subscriptionPlan !== "Premium" &&
      razorpayOrderId &&
      razorpayPaymentId &&
      razorpaySignature
    ) {
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          message:
            "Payment verification failed. Invalid signature. Please contact support.",
        });
      }
    } else if (
      subscriptionPlan !== "Premium" &&
      (!razorpayOrderId || !razorpayPaymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing for the selected plan.",
      });
    }

    // 🔥 LOGO REMOVED: Extract remaining file URLs from req.files
    const registrationCertificate = req.files["registrationCertificate"]?.[0]?.path;
    const adminIdProof = req.files["adminIdProof"]?.[0]?.path;
    const addressProof = req.files["addressProof"]?.[0]?.path;
    const affiliationCertificate = req.files["affiliationCertificate"]?.[0]?.path;

    if (
      !registrationCertificate ||
      !adminIdProof ||
      !addressProof ||
      !affiliationCertificate
    ) {
      return res.status(400).json({
        success: false,
        message: "All document uploads are required",
      });
    }

    // Check if an organization with this email already exists
    const existingRequest = await OrganizationRequest.findOne({
      $or: [{ officialEmail }, { adminEmail }],
    });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A registration request with this organization or admin email already exists",
      });
    }

    // Check if super admin already exists with this email
    const existingAdmin = await SuperAdmin.findOne({
      $or: [{ email: officialEmail }, { email: adminEmail }],
    });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "This email is already associated with a registered organization",
      });
    }

    // 🔥 LOGO REMOVED: Saving without the logo field
    const organizationRequest = await OrganizationRequest.create({
      organizationName,
      organizationType,
      numberOfBranches,
      yearEstablished,
      address,
      city,
      state,
      country,
      pincode,
      officialEmail,
      contactNumber,
      adminName,
      adminEmail,
      adminPhone,
      registrationNumber,
      panNumber,
      gstNumber,
      registrationCertificate,
      adminIdProof,
      addressProof,
      affiliationCertificate,
      subscriptionPlan: subscriptionPlan || "Standard",
      paymentDetails: {
        orderId: razorpayOrderId || null,
        paymentId: razorpayPaymentId || null,
        signature: razorpaySignature || null,
        status: razorpayPaymentId ? "paid" : "pending", 
      },
    });

    try {
      await GraphuraNotification.create({
        title: "New Organization Registration",
        message: `${organizationName} has submitted a new registration request for the ${subscriptionPlan || "Standard"} plan.`,
        type: "info",
        category: "school",
        priority: "high",
        actionUrl: "/graphura-admin/organization-requests",
        sender: "System",
      });
    } catch (notifError) {
      console.error("Failed to create Graphura notification:", notifError);
    }

    res.status(201).json({
      success: true,
      message:
        "Registration request submitted successfully! Our Graphura Super Admin will review your request and send credentials via email upon approval.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting registration request",
      error: error.message,
    });
  }
};

// Add/update this in your backend authController.js

export const createSubscriptionOrder = async (req, res) => {
  try {
    // 👇 Destructure the emails from the request body
    const { plan, officialEmail, adminEmail } = req.body;

    // ====================================================================
    // PRE-FLIGHT CHECK: PREVENT ORPHANED PAYMENTS
    // ====================================================================
    if (officialEmail || adminEmail) {
      // 1. Check if an approved organization already uses these emails
      const existingOrg = await Organization.findOne({
        $or: [{ officialEmail: officialEmail }, { officialEmail: adminEmail }],
      });
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          message:
            "An organization with this email already exists. Payment aborted.",
        });
      }

      // 2. Check if a pending/rejected request uses these emails
      const existingRequest = await OrganizationRequest.findOne({
        $or: [
          { officialEmail: officialEmail },
          { adminEmail: adminEmail },
          { officialEmail: adminEmail },
          { adminEmail: officialEmail },
        ],
      });
      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message:
            "A registration request with this email is already in the system. Payment aborted.",
        });
      }
    }
    // ====================================================================

    // 1. Map plans to real INR amounts (in paise: 1 INR = 100 paise)
    let amountInINR = 0;
    if (plan === "Basic") amountInINR = 3999;
    if (plan === "Standard") amountInINR = 14999;
    if (plan === "Premium") amountInINR = 0; // Custom pricing

    // If Premium/Custom, we don't need a Razorpay order yet
    if (amountInINR === 0) {
      return res.status(200).json({
        success: true,
        message: "Custom plan selected. No payment required upfront.",
      });
    }

    // 2. Initialize Razorpay
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 3. Create the Order
    const options = {
      amount: amountInINR * 100, // Convert to paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const order = await razorpayInstance.orders.create(options);

    if (!order) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to generate Razorpay order" });
    }

    // 4. Send Order ID back to React
    res.status(200).json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Payment initialization failed",
      error: error.message,
    });
  }
};

export const loginSuperAdmin = async (req, res) => {
  try {
    const { organizationId, password } = req.body;

    if (!organizationId || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide organization ID and password",
      });
    }

    // Find organization (password is select:false so must explicitly select it)
    const organization = await Organization.findOne({ organizationId }).select(
      "+password",
    );
    if (!organization) {
      return res.status(401).json({
        field: "organizationId",
        success: false,
        message: "No organization found with this ID",
      });
    }

    if (organization.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your organization account is ${organization.status}`,
      });
    }

    const isPasswordMatch = await organization.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        field: "password",
        success: false,
        message: "Password does not match",
      });
    }

    // Load the linked SuperAdmin profile
    const superAdmin = await SuperAdmin.findById(
      organization.superAdminProfile,
    );
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "SuperAdmin profile not found for this organization",
      });
    }

    sendTokenResponse(organization, superAdmin, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

export const logoutSuperAdmin = async (req, res) => {
  try {
    // Clear the cookie
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // Always fetch fresh data from DB, not just from middleware
    const organization = await Organization.findById(req.user._id).lean();
    const superAdmin = await SuperAdmin.findById(req.superAdminProfile?._id || req.user?.superAdminId).lean();

    if (!organization || !superAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        organization: {
          _id: organization._id,
          organizationId: organization.organizationId,
          organizationName: organization.organizationName,
          branchCreationId: organization.branchCreationId,
          officialEmail: organization.officialEmail,
          contactNumber: organization.contactNumber,
          status: organization.status,
          organizationType: organization.organizationType,
          organizationLogo: organization.organizationLogo,
          billing: organization.billing,
          createdAt: organization.createdAt,
        },
        superAdmin: {
          _id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          phoneNumber: superAdmin.phoneNumber,
          photo: superAdmin.photo,
          dob: superAdmin.dob,
          gender: superAdmin.gender,
          address: superAdmin.address,
          role: 'superadmin',
          createdAt: superAdmin.createdAt,
          updatedAt: superAdmin.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        field: "newPassword",
        message: "New passwords do not match",
      });
    }

    const organization = await Organization.findById(req.user.id).select(
      "+password",
    );
    const superAdmin = await SuperAdmin.findById(req.user.superAdminId);

    const isMatch = await organization.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        field: "currentPassword",
        message: "Current password is incorrect",
      });
    }

    organization.password = newPassword;
    await organization.save(); // pre-save hook rehashes automatically

    sendTokenResponse(organization, superAdmin, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Please provide your official email",
      });
    }

    // Find organization by official email
    const organization = await Organization.findOne({ officialEmail: email });
    if (!organization) {
      return res.status(404).json({
        success: false,
        field: "email",
        message: "No organization found with this email",
      });
    }

    if (organization.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your organization account is ${organization.status}`,
      });
    }

    // Send OTP to the official email
    const result = await otpService.createOTP(
      email,
      "ORG_PASSWORD_RESET",
      "password_reset",
    );

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your registered email",
      data: {
        email: result.email,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing forgot password request",
      error: error.message,
    });
  }
};

export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    // Validate all fields present
    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        field: !email
          ? "email"
          : !otp
            ? "otp"
            : !newPassword
              ? "newPassword"
              : "confirmNewPassword",
        message: "Please provide all required fields",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        field: "confirmNewPassword",
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        field: "newPassword",
        message: "Password must be at least 6 characters long",
      });
    }

    // Verify OTP
    const result = await otpService.verifyOTP(
      email,
      otp,
      "ORG_PASSWORD_RESET",
      "password_reset",
    );
    if (!result.success) {
      return res.status(400).json({
        success: false,
        field: "otp",
        message: result.message,
      });
    }

    // Find organization by official email
    const organization = await Organization.findOne({
      officialEmail: email,
    }).select("+password");
    if (!organization) {
      return res.status(404).json({
        success: false,
        field: "email",
        message: "No organization found with this email",
      });
    }

    // Load linked SuperAdmin for token response
    const superAdmin = await SuperAdmin.findById(
      organization.superAdminProfile,
    );
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "SuperAdmin profile not found for this organization",
      });
    }

    // Update password — pre-save hook will hash it automatically
    organization.password = newPassword;
    organization.passwordChangedAt = Date.now();
    await organization.save();

    // Clean up used OTPs
    await OTP.deleteMany({ email, purpose: "password_reset" });

    // Return fresh token so user is logged in immediately after reset
    sendTokenResponse(organization, superAdmin, res);
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Please provide your official email",
      });
    }

    // Verify organization exists with this email
    const organization = await Organization.findOne({ officialEmail: email });
    if (!organization) {
      return res.status(404).json({
        success: false,
        field: "email",
        message: "No organization found with this email",
      });
    }

    if (organization.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your organization account is ${organization.status}`,
      });
    }

    const result = await otpService.createOTP(
      email,
      "ORG_PASSWORD_RESET",
      "password_reset",
    );

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
      data: {
        email: result.email,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Error resending OTP",
      error: error.message,
    });
  }
};

export const sendSignupOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // Check if an approved organization already uses this email
    const existingOrg = await Organization.findOne({ officialEmail: email });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already associated with a registered organization",
      });
    }

    // Check if a pending/rejected request already uses this email
    const existingRequest = await OrganizationRequest.findOne({
      $or: [{ officialEmail: email }, { adminEmail: email }],
    });
    if (existingRequest) {
      // Give a more specific message based on request status
      if (existingRequest.status === "pending") {
        return res.status(400).json({
          success: false,
          message:
            "A registration request with this email is already under review",
        });
      }
      if (existingRequest.status === "rejected") {
        return res.status(400).json({
          success: false,
          message:
            "A previous request with this email was rejected. Please contact support.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "A registration request with this email already exists",
      });
    }

    const result = await otpService.createOTP(
      email,
      "SIGNUP_VERIFICATION",
      "signup_verification",
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Send Signup OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Re-check org existence in case they verified after another org got approved with same email
    const existingOrg = await Organization.findOne({ officialEmail: email });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already associated with a registered organization",
      });
    }

    const result = await otpService.verifyOTP(
      email,
      otp,
      "SIGNUP_VERIFICATION",
      "signup_verification",
    );
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Verify Signup OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
