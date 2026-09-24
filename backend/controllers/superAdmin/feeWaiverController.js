import mongoose from "mongoose";
import WaiverPolicy from "../../models/finance/FeeWavier.policy.js";
import FeeWaiver from "../../models/finance/FeeWavier.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import FeeStructure from "../../models/finance/FeeStructure.model.js";
import Organization from "../../models/organization/Organization.js";

import User from "../../models/users/user.model.js";
import School from "../../models/school/School.js";

export const getStudentsByOrganization = async (req, res) => {
  try {
    const organizationId = req.user._id; // superadmin = organization

    // Get all schools under this org
    const schools = await School.find({
      organization: organizationId,
    })
      .select("_id name")
      .lean();

    if (!schools.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const schoolIds = schools.map((s) => s._id);

    // Get all active students
    const students = await User.find({
      school: { $in: schoolIds },
      role: "student",
      status: "active",
    })
      .select("_id name school")
      .populate("school", "name")
      .lean();

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCurrentAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};

export const createWaiverPolicy = async (req, res) => {
  try {
    const {
      name,
      category,
      discountType,
      maxDiscountValue,
      approvalRequiredFrom,
    } = req.body;

    // ✅ For superadmin: req.user IS the Organization document
    // For other roles: req.user.organization or req.user.school?.organization
    let organizationId;

    if (req.role === "superadmin") {
      organizationId = req.user._id; // req.user = Organization doc
    } else if (req.role === "graphura_admin") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to create waiver policies",
        });
    } else {
      organizationId = req.user?.organization || req.user?.school?.organization;
    }

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Could not resolve organization from session.",
      });
    }

    const existingPolicy = await WaiverPolicy.findOne({ organizationId, name });
    if (existingPolicy) {
      return res.status(400).json({
        success: false,
        message: "A waiver policy with this name already exists.",
      });
    }

    const waiverPolicy = new WaiverPolicy({
      ...req.body,
      organizationId, // ✅ from session, never from client
      createdBy: req.superAdminProfile?._id || req.user._id,
    });

    await waiverPolicy.save();
    res.status(201).json({ success: true, data: waiverPolicy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllWaiverPolicies = async (req, res) => {
  try {
    // ✅ Scope to the logged-in org
    const organizationId =
      req.role === "superadmin" ? req.user._id : req.user?.organization;

    const policies = await WaiverPolicy.find({ organizationId })
      .populate("organizationId", "name")
      .populate("applicableFeeHeads", "name")
      .populate("applicableClasses", "className");

    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// UPDATE WAIVER POLICY
// =======================
export const updateWaiverPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Resolve Organization ID based on role
    let organizationId;
    if (req.role === "superadmin") {
      organizationId = req.user._id;
    } else if (req.role === "graphura_admin") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to update waiver policies",
        });
    } else {
      organizationId = req.user?.organization || req.user?.school?.organization;
    }

    if (!organizationId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Could not resolve organization from session.",
        });
    }

    // 2. Check for name conflicts if the name is being updated
    if (req.body.name) {
      const existingPolicy = await WaiverPolicy.findOne({
        organizationId,
        name: req.body.name,
        _id: { $ne: id }, // Exclude the current policy being updated
      });

      if (existingPolicy) {
        return res.status(400).json({
          success: false,
          message: "Another waiver policy with this name already exists.",
        });
      }
    }

    // 3. Update the policy
    const updatedPolicy = await WaiverPolicy.findOneAndUpdate(
      { _id: id, organizationId }, // Ensure they only update their own org's policy
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!updatedPolicy) {
      return res
        .status(404)
        .json({ success: false, message: "Waiver policy not found" });
    }

    res.status(200).json({ success: true, data: updatedPolicy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// =======================
// DELETE WAIVER POLICY
// =======================
export const deleteWaiverPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Resolve Organization ID based on role
    let organizationId;
    if (req.role === "superadmin") {
      organizationId = req.user._id;
    } else if (req.role === "graphura_admin") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to delete waiver policies",
        });
    } else {
      organizationId = req.user?.organization || req.user?.school?.organization;
    }

    if (!organizationId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Could not resolve organization from session.",
        });
    }

    // 2. SAFETY CHECK: Ensure the policy hasn't been assigned to students yet
    const inUse = await FeeWaiver.findOne({
      waiverPolicyId: id,
      organization: organizationId,
    });

    if (inUse) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete this policy because it has already been assigned to students. Please edit the policy and set it to 'Inactive' instead.",
      });
    }

    // 3. Delete the policy
    const deletedPolicy = await WaiverPolicy.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!deletedPolicy) {
      return res
        .status(404)
        .json({ success: false, message: "Waiver policy not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Waiver policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
