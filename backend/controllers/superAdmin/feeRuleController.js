import FeeRule from "../../models/finance/FeeRule.js";

// Get all fee rules for the logged-in organization
export const getFeeRules = async (req, res) => {
  try {
    const rules = await FeeRule.find({ organization: req.user._id })
      .populate("selectedBranches", "schoolName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error("Error in getFeeRules:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new fee rule
export const createFeeRule = async (req, res) => {
  try {
    const { name, type, calcType, value, gracePeriod, scope, selectedBranches } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Rule designation and financial metric value are required",
      });
    }

    // --- Negative value guards ---
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Financial Metric cannot be negative.",
      });
    }

    const numericGrace = parseFloat(gracePeriod);
    if (gracePeriod !== undefined && !isNaN(numericGrace) && numericGrace < 0) {
      return res.status(400).json({
        success: false,
        message: "Grace Window cannot be negative.",
      });
    }

    if (scope === "Selected Branches" && (!selectedBranches || selectedBranches.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one branch.",
      });
    }

    const newRule = await FeeRule.create({
      organization: req.user._id,
      name,
      type,
      calcType,
      value,
      gracePeriod: gracePeriod || 0,
      scope,
      selectedBranches: scope === "Selected Branches" ? selectedBranches : [],
      status: "Active",
      updatedBy: req.user._id,
    });

    const ruleWithBranches = await FeeRule.findById(newRule._id).populate("selectedBranches", "schoolName");

    return res.status(201).json({
      success: true,
      data: ruleWithBranches,
      message: "Rule deployed successfully",
    });
  } catch (error) {
    console.error("Error in createFeeRule:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update an existing fee rule
export const updateFeeRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, calcType, value, gracePeriod, scope, selectedBranches, status } = req.body;

    // Only validate value/gracePeriod when they are being explicitly updated
    if (value !== undefined) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue < 0) {
        return res.status(400).json({
          success: false,
          message: "Financial Metric cannot be negative.",
        });
      }
    }

    if (gracePeriod !== undefined) {
      const numericGrace = parseFloat(gracePeriod);
      if (!isNaN(numericGrace) && numericGrace < 0) {
        return res.status(400).json({
          success: false,
          message: "Grace Window cannot be negative.",
        });
      }
    }

    if (scope === "Selected Branches" && (!selectedBranches || selectedBranches.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one branch.",
      });
    }

    const rule = await FeeRule.findOneAndUpdate(
      { _id: id, organization: req.user._id },
      {
        name,
        type,
        calcType,
        value,
        gracePeriod: gracePeriod || 0,
        scope,
        selectedBranches: scope === "Selected Branches" ? selectedBranches : [],
        status,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    ).populate("selectedBranches", "schoolName");

    if (!rule) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Fee rule not found or unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      data: rule,
      message: "Rule updated successfully",
    });
  } catch (error) {
    console.error("Error in updateFeeRule:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a fee rule
export const deleteFeeRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await FeeRule.findOneAndDelete({ _id: id, organization: req.user._id });

    if (!rule) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Fee rule not found or unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteFeeRule:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
