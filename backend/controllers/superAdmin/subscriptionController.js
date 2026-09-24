// controllers/organization/subscriptionController.js
import Organization from "../../models/organization/Organization.js";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * GET /api/organization/my-subscription
 * Fetch the subscription details for the currently logged-in organization
 */
export const getMySubscription = async (req, res) => {
  try {
    // Safely extract the organization ID from the authenticated user
    const orgId =
      req.user?.organization?._id || req.user?.organization || req.user?._id;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Organization ID missing",
      });
    }

    // ✅ FIX: Added organizationId, contactNumber, subscriptionAmount, and paymentDetails
    const organization = await Organization.findById(orgId)
      .select(
        "organizationName organizationId officialEmail contactNumber billing quotas createdAt",
      )
      .lean();

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("[getMySubscription] Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription details",
    });
  }
};

/**
 * PUT or PATCH /api/organization/my-subscription/auto-renew
 * Toggles the auto-renew status for the currently logged-in organization
 */
export const toggleAutoRenew = async (req, res) => {
  try {
    // Safely extract the organization ID from the authenticated user
    const orgId =
      req.user?.organization?._id || req.user?.organization || req.user?._id;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Organization ID missing",
      });
    }

    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // Flip the current boolean value
    organization.autoRenew = !organization.autoRenew;
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Auto-renewal has been ${organization.autoRenew ? "enabled" : "disabled"}.`,
      data: {
        autoRenew: organization.autoRenew,
      },
    });
  } catch (error) {
    console.error("[toggleAutoRenew] Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle auto-renewal status",
    });
  }
};
export const createUpgradeOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    let amountInINR = 0;
    if (planId === "Basic") amountInINR = 3999;
    if (planId === "Standard") amountInINR = 14999;
    // Premium is Custom, so it bypasses gateway

    if (amountInINR === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Custom plan selected." });
    }

    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amountInINR * 100, // Convert to paise
      currency: "INR",
      receipt: `upg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const order = await razorpayInstance.orders.create(options);

    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("[createUpgradeOrder] Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to initialize upgrade payment",
      });
  }
};

/**
 * POST /api/organization/my-subscription/verify-upgrade
 * Verifies Razorpay signature and updates the organization database
 */
export const verifyUpgradeAndUpdatePlan = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, newPlan } =
      req.body;
    const orgId =
      req.user?.organization?._id || req.user?.organization || req.user?._id;

    // 1. Verify Mathematical Signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Payment verification failed. Invalid signature.",
        });
    }

    // 2. Fetch Organization and Apply Upgrades
    const organization = await Organization.findById(orgId);
    if (!organization)
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });

    organization.subscriptionPlan = newPlan;
    organization.subscriptionAmount = newPlan === "Standard" ? 14999 : 3999;

    // Save the new payment details
    organization.paymentDetails = {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      status: "paid",
    };

    // Extend the expiry date by 1 Year from today
    organization.subscriptionExpiryDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    );

    await organization.save();

    return res.status(200).json({
      success: true,
      message: "Plan upgraded successfully!",
      data: organization,
    });
  } catch (error) {
    console.error("[verifyUpgradeAndUpdatePlan] Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to apply upgrade to database" });
  }
};
