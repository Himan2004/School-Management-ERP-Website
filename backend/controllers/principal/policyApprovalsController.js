import Policy from "../../models/common/Policy.js";
import School from "../../models/school/School.js";
import Principal from "../../models/users/principal.model.js";

/**
 * Helper to get organizationId from principal's school
 */
const getOrganizationIdForPrincipal = async (req) => {
  // req.user.school is the school ID in the principal token
  const schoolIdRaw = req.user?.school?._id || req.user?.school;
  if (!schoolIdRaw) return null;

  const school = await School.findById(schoolIdRaw).select("organization").lean();
  return school?.organization || null;
};

/**
 * @desc    Get all policies visible to the principal (from their organization)
 * @route   GET /api/principal/settings/policies
 * @access  Private (Principal)
 */
export const getPrincipalPolicies = async (req, res) => {
  try {
    const organizationId = await getOrganizationIdForPrincipal(req);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Unable to determine organization. Please contact your administrator.",
      });
    }

    const policies = await Policy.find({ organizationId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: policies });
  } catch (error) {
    console.error("Error in getPrincipalPolicies:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single policy by ID (read-only for principal)
 * @route   GET /api/principal/settings/policies/:id
 * @access  Private (Principal)
 */
export const getPrincipalPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = await getOrganizationIdForPrincipal(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Unable to determine organization." });
    }

    const policy = await Policy.findOne({ _id: id, organizationId }).lean();
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }

    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error("Error in getPrincipalPolicyById:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
