import OrganizationRequest from "../../models/graphura/OrganizationRequest.js";
import mongoose from "mongoose";
import Organization from "../../models/organization/Organization.js";
import { sendOrganizationRenewalEmail } from "../../services/emailService.js"; // Adjust filepath relative to project layout
import SuperAdmin from "../../models/superAdmin/SuperAdmin.js";
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import SchoolRequest from "../../models/superAdmin/SchoolRequest.js";
import Expense from "../../models/finance/Expense.model.js";
import GraphuraNotification from "../../models/graphura/GraphuraNotification.js";
import School from "../../models/school/School.js";
import PaymentLog from "../../models/graphura/PaymentLog.js"; // adjust path as needed
import GraphuraAdmin from "../../models/graphura/GraphuraAdmin.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import Parent from "../../models/users/parent.model.js";
import Principal from "../../models/users/principal.model.js";
import Admin from "../../models/users/admin.model.js";
import Teacher from "../../models/users/teacher.model.js";
import Accountant from "../../models/users/accountant.model.js";
import StaffProfile from "../../models/users/staffProfile.model.js";
import Ticket from "../../models/common/Ticket.js";
import {
  generateBranchCreationId,
  generateOrganizationCredentials,
} from "../../utils/organizationCredentials.js";
import {
  sendOrganizationCredentialsEmail as sendAcceptanceEmail,
  sendOrganizationRejectionEmail as sendRejectionEmail,
  sendOrganizationDeactivatedEmail,
  sendOrganizationExpiredEmail,
} from "../../services/emailService.js";
import SuperAdminSupportTicket from "../../models/superAdmin/SuperAdminSupportTicket.js";

const STANDARD_BOARDS = [
  "CBSE",
  "ICSE",
  "State Board",
  "Gujarat State Board",
  "Maharashtra State Board",
  "IB (International Baccalaureate)",
  "IGCSE (Cambridge)",
  "NIOS",
];
const getMaxBranches = (numStr) => {
  if (!numStr) return 1;
  if (numStr === "1") return 1;
  if (numStr === "2-5") return 5;
  if (numStr === "5-10") return 10;
  if (numStr === "10+") return 10;
  return 1;
};

const buildFilter = (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.organizationType) {
    filter.organizationType = query.organizationType;
  }

  if (query.numberOfBranches) {
    filter.numberOfBranches = query.numberOfBranches;
  }

  if (query.country) {
    filter.country = query.country;
  }

  if (query.search) {
    const regex = new RegExp(query.search, "i");
    filter.$or = [
      { organizationName: regex },
      { officialEmail: regex },
      { adminEmail: regex },
      { adminName: regex },
      { city: regex },
      { state: regex },
    ];
  }

  // Date-range filter on createdAt  e.g. ?from=2024-01-01&to=2024-12-31
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  return filter;
};

/**
 * Controller used by your team to alter billing setups and scale resource allocations
 * PATCH /api/v1/admin/organizations/:id/billing-and-quotas
 */
export const updateOrganizationBillingAndQuotas = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action,
      billingCycle,
      targetAmount,
      batchPayments,
      customExpiryDate,
      maxSchools,
      maxStudents,
      maxTeachingStaff,
      maxNonTeachingStaff,
      maxStaff,
    } = req.body;

    const org = await Organization.findById(id);
    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization record not tracked." });
    }

    if (action === "renew") {
      const paymentsArray = Array.isArray(batchPayments) ? batchPayments : [];
      const totalPaidNow = paymentsArray.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );

      if (!org.billing) org.billing = {};

      // ─── 🚨 NEW STRICT OVERPAYMENT GUARD ───
      const maxAllowed =
        billingCycle === "None"
          ? org.billing.outstandingBalance || 0
          : (org.billing.outstandingBalance || 0) + Number(targetAmount);

      if (totalPaidNow > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `Payment of ₹${totalPaidNow} exceeds the maximum allowed due of ₹${maxAllowed}.`,
        });
      }
      // ────────────────────────────────────────

      let isFullPayment = false;

      if (billingCycle === "None") {
        org.billing.outstandingBalance = Math.max(
          0,
          (org.billing.outstandingBalance || 0) - totalPaidNow,
        );
        if (org.billing.outstandingBalance === 0) isFullPayment = true;
      } else {
        const totalDebt =
          (org.billing.outstandingBalance || 0) + Number(targetAmount);
        org.billing.outstandingBalance = Math.max(0, totalDebt - totalPaidNow);
        org.billing.cycle = billingCycle;
        org.billing.customAmount = Number(targetAmount);

        if (org.billing.outstandingBalance === 0) isFullPayment = true;
      }

      if (isFullPayment) {
        let calculatedExpiry = new Date(
          org.billing?.expiryDate > new Date()
            ? org.billing.expiryDate
            : new Date(),
        );
        const cycleToApply =
          billingCycle === "None" ? org.billing.cycle : billingCycle;

        if (cycleToApply === "Monthly")
          calculatedExpiry.setDate(calculatedExpiry.getDate() + 30);
        else if (cycleToApply === "Yearly")
          calculatedExpiry.setDate(calculatedExpiry.getDate() + 365);
        else if (cycleToApply === "Custom" && customExpiryDate)
          calculatedExpiry = new Date(customExpiryDate);

        org.billing.expiryDate = calculatedExpiry;
      }

      org.billing.status = "active";
      org.status = "active";
      org.billing.lastPaymentDate = new Date();

      await org.save();

      if (paymentsArray.length > 0) {
        const mongoose = await import("mongoose");
        const PaymentLog = mongoose.model("PaymentLog");

        const logsToInsert = paymentsArray.map((p) => ({
          organization: org._id,
          amountPaid: Number(p.amount),
          method: p.method || "Online Transfer",
          remark: p.remark || "",
          billingCycle: billingCycle === "None" ? "Dues Cleared" : billingCycle,
          paymentDate: new Date(),
          status: "successful",
        }));
        await PaymentLog.insertMany(logsToInsert);
      }

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully.",
        data: org,
      });
    }

    if (action === "update_quotas") {
      if (!org.quotas) {
        org.quotas = {
          maxSchools: 1,
          maxStudents: 500,
          maxTeachingStaff: 50,
          maxNonTeachingStaff: 20,
          maxStaff: 70,
        };
      }
      if (maxSchools !== undefined) org.quotas.maxSchools = Number(maxSchools);
      if (maxStudents !== undefined)
        org.quotas.maxStudents = Number(maxStudents);
      if (maxTeachingStaff !== undefined)
        org.quotas.maxTeachingStaff = Number(maxTeachingStaff);
      if (maxNonTeachingStaff !== undefined)
        org.quotas.maxNonTeachingStaff = Number(maxNonTeachingStaff);
      if (maxStaff !== undefined) org.quotas.maxStaff = Number(maxStaff);

      await org.save();
      return res.status(200).json({
        success: true,
        message: "Resource metrics updated.",
        data: org.quotas,
      });
    }

    return res.status(400).json({ success: false, message: "Invalid action." });
  } catch (error) {
    console.error("Admin modification failure:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal update routine failure." });
  }
};

export const verifyAdminPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res
        .status(400)
        .json({ success: false, message: "PIN is required." });
    }

    // Verify against your secure .env master PIN
    // Add GRAPHURA_MASTER_PIN=your_secure_pin_here to your .env file
    if (pin === process.env.GRAPHURA_MASTER_PIN) {
      return res.status(200).json({ success: true, message: "Authorized." });
    }

    /* Optional: If you want to check against the specific admin's hashed PIN in the DB:
        const admin = await GraphuraAdmin.findById(req.user._id).select("+securityPin");
        const isMatch = await bcrypt.compare(pin, admin.securityPin);
        if (isMatch) return res.status(200).json({ success: true, message: "Authorized." });
        */

    return res
      .status(401)
      .json({ success: false, message: "Invalid Authorization PIN." });
  } catch (error) {
    console.error("verifyAdminPin error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const getOrganizationPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await PaymentLog.find({ organization: id }).sort({
      paymentDate: -1,
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch payment logs." });
  }
};

export const updatePaymentLogRemark = async (req, res) => {
  try {
    const { logId } = req.params;
    const { remark } = req.body;

    const mongoose = await import("mongoose");
    const PaymentLog = mongoose.model("PaymentLog");

    const log = await PaymentLog.findByIdAndUpdate(
      logId,
      { remark },
      { new: true },
    );

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Payment log not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Remark updated successfully.",
      data: log,
    });
  } catch (error) {
    console.error("Update remark error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── Manual Email Notifications ───────────────────────────────────────────────

export const sendOrganizationNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const org = await Organization.findById(id).populate("superAdminProfile");
    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found." });
    }

    if (type === "deactivation") {
      await sendOrganizationDeactivatedEmail(org);
      return res.status(200).json({
        success: true,
        message: "Deactivation notice sent successfully.",
      });
    } else if (type === "expiry") {
      await sendOrganizationExpiredEmail(org);
      return res
        .status(200)
        .json({ success: true, message: "Expiry notice sent successfully." });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type specified.",
      });
    }
  } catch (error) {
    console.error("Failed to send notification email:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while sending email.",
    });
  }
};

export const getOrganizationRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };

    const filter = buildFilter(req.query);

    // Run count + data fetch in parallel
    const [total, requests] = await Promise.all([
      OrganizationRequest.countDocuments(filter),
      OrganizationRequest.find(filter)
        .select("-generatedPassword") // never expose generated passwords
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Fetch related Organizations and School counts to avoid N+1 queries
    const requestIds = requests.map((r) => r._id);
    const orgs = await Organization.find({ requestId: { $in: requestIds } })
      .select("_id requestId")
      .lean();

    const reqIdToOrgId = {};
    const orgIds = [];
    orgs.forEach((o) => {
      if (o.requestId) {
        reqIdToOrgId[o.requestId.toString()] = o._id;
        orgIds.push(o._id);
      }
    });

    // Fetch all schools for these organizations
    const schools = await School.find({ organization: { $in: orgIds } })
      .select(
        "_id organization isActive totalTeachingStaff totalTeachers totalNonTeachingStaff enrollmentCapacity requestId",
      )
      .lean();

    // Fetch all accepted school requests for these organizations to get the onboarding capacities
    const schoolRequests = await SchoolRequest.find({
      organization: { $in: orgIds },
      status: "accepted",
    }).lean();

    const schoolRequestIdToRequest = {};
    schoolRequests.forEach((sr) => {
      schoolRequestIdToRequest[sr._id.toString()] = sr;
    });

    // Group schools by organization
    const orgIdToSchools = {};
    const allSchoolIds = [];
    schools.forEach((school) => {
      const orgIdStr = school.organization.toString();
      if (!orgIdToSchools[orgIdStr]) {
        orgIdToSchools[orgIdStr] = [];
      }
      orgIdToSchools[orgIdStr].push(school);
      allSchoolIds.push(school._id);
    });

    // Query active student counts grouped by school
    const studentCounts = await User.aggregate([
      {
        $match: {
          school: { $in: allSchoolIds },
          role: "student",
          status: "active",
        },
      },
      { $group: { _id: "$school", count: { $sum: 1 } } },
    ]);

    const schoolIdToStudentCount = {};
    studentCounts.forEach((sc) => {
      schoolIdToStudentCount[sc._id.toString()] = sc.count;
    });

    // Query active staff counts grouped by school
    const staffCounts = await User.aggregate([
      {
        $match: {
          school: { $in: allSchoolIds },
          role: {
            $in: [
              "principal",
              "admin",
              "teacher",
              "accountant",
              "support_staff",
            ],
          },
          status: "active",
        },
      },
      { $group: { _id: "$school", count: { $sum: 1 } } },
    ]);

    const schoolIdToStaffCount = {};
    staffCounts.forEach((sc) => {
      schoolIdToStaffCount[sc._id.toString()] = sc.count;
    });

    const enrichedRequests = requests.map((request) => {
      const orgId = reqIdToOrgId[request._id.toString()];
      const orgIdStr = orgId ? orgId.toString() : null;
      const orgSchools = orgIdStr ? orgIdToSchools[orgIdStr] || [] : [];

      let currentSchoolsRegistered = 0;
      let currentStaff = 0;
      let maxStaffAllocated = 0;
      let currentStudents = 0;
      let maxStudentsAllocated = 0;

      orgSchools.forEach((school) => {
        if (school.isActive) {
          currentSchoolsRegistered++;
        }

        currentStaff += schoolIdToStaffCount[school._id.toString()] || 0;
        currentStudents += schoolIdToStudentCount[school._id.toString()] || 0;

        // Retrieve capacity values from the original school registration request
        const sr = school.requestId
          ? schoolRequestIdToRequest[school.requestId.toString()]
          : null;
        if (sr) {
          maxStudentsAllocated += parseInt(sr.totalStudents) || 0;
          const teaching =
            parseInt(sr.totalTeachingStaff) || parseInt(sr.totalTeachers) || 0;
          const nonTeaching = parseInt(sr.totalNonTeachingStaff) || 0;
          maxStaffAllocated += teaching + nonTeaching;
        } else {
          // Fallback to School model fields
          maxStudentsAllocated += parseInt(school.enrollmentCapacity) || 0;
          const teaching =
            parseInt(school.totalTeachingStaff) ||
            parseInt(school.totalTeachers) ||
            0;
          const nonTeaching = parseInt(school.totalNonTeachingStaff) || 0;
          maxStaffAllocated += teaching + nonTeaching;
        }
      });

      const maxSchoolsAllocated = getMaxBranches(request.numberOfBranches);

      return {
        ...request,
        currentBranches: currentSchoolsRegistered,
        maxBranches: maxSchoolsAllocated,
        currentSchoolsRegistered,
        maxSchoolsAllocated,
        currentStaff,
        maxStaffAllocated,
        currentStudents,
        maxStudentsAllocated,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        requests: enrichedRequests,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("getOrganizationRequests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization requests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getOrganizationRequestById = async (req, res) => {
  try {
    const request = await OrganizationRequest.findById(req.params.id)
      .select("-generatedPassword")
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Organization request not found",
      });
    }

    const org = await Organization.findOne({ requestId: request._id })
      .select("_id")
      .lean();

    let currentSchoolsRegistered = 0;
    let currentStaff = 0;
    let maxStaffAllocated = 0;
    let currentStudents = 0;
    let maxStudentsAllocated = 0;

    if (org) {
      const schools = await School.find({ organization: org._id })
        .select(
          "_id isActive totalTeachingStaff totalTeachers totalNonTeachingStaff enrollmentCapacity requestId",
        )
        .lean();

      const schoolIds = schools.map((s) => s._id);

      const [studentCounts, staffCounts, schoolRequests] = await Promise.all([
        User.aggregate([
          {
            $match: {
              school: { $in: schoolIds },
              role: "student",
              status: "active",
            },
          },
          { $group: { _id: "$school", count: { $sum: 1 } } },
        ]),
        User.aggregate([
          {
            $match: {
              school: { $in: schoolIds },
              role: {
                $in: [
                  "principal",
                  "admin",
                  "teacher",
                  "accountant",
                  "support_staff",
                ],
              },
              status: "active",
            },
          },
          { $group: { _id: "$school", count: { $sum: 1 } } },
        ]),
        SchoolRequest.find({
          organization: org._id,
          status: "accepted",
        }).lean(),
      ]);

      const schoolIdToStudentCount = {};
      studentCounts.forEach((sc) => {
        schoolIdToStudentCount[sc._id.toString()] = sc.count;
      });

      const schoolIdToStaffCount = {};
      staffCounts.forEach((sc) => {
        schoolIdToStaffCount[sc._id.toString()] = sc.count;
      });

      const schoolRequestIdToRequest = {};
      schoolRequests.forEach((sr) => {
        schoolRequestIdToRequest[sr._id.toString()] = sr;
      });

      schools.forEach((school) => {
        if (school.isActive) {
          currentSchoolsRegistered++;
        }
        currentStaff += schoolIdToStaffCount[school._id.toString()] || 0;
        currentStudents += schoolIdToStudentCount[school._id.toString()] || 0;

        const sr = school.requestId
          ? schoolRequestIdToRequest[school.requestId.toString()]
          : null;
        if (sr) {
          maxStudentsAllocated += parseInt(sr.totalStudents) || 0;
          const teaching =
            parseInt(sr.totalTeachingStaff) || parseInt(sr.totalTeachers) || 0;
          const nonTeaching = parseInt(sr.totalNonTeachingStaff) || 0;
          maxStaffAllocated += teaching + nonTeaching;
        } else {
          maxStudentsAllocated += parseInt(school.enrollmentCapacity) || 0;
          const teaching =
            parseInt(school.totalTeachingStaff) ||
            parseInt(school.totalTeachers) ||
            0;
          const nonTeaching = parseInt(school.totalNonTeachingStaff) || 0;
          maxStaffAllocated += teaching + nonTeaching;
        }
      });
    }

    const maxSchoolsAllocated = getMaxBranches(request.numberOfBranches);

    return res.status(200).json({
      success: true,
      data: {
        request: {
          ...request,
          currentBranches: currentSchoolsRegistered,
          maxBranches: maxSchoolsAllocated,
          currentSchoolsRegistered,
          maxSchoolsAllocated,
          currentStaff,
          maxStaffAllocated,
          currentStudents,
          maxStudentsAllocated,
        },
      },
    });
  } catch (error) {
    // Malformed ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID format",
      });
    }

    console.error("getOrganizationRequestById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getOrganizationRequestStats = async (_req, res) => {
  try {
    const [statusCounts, typeCounts, recentRequests, pendingOrganizationRequests, pendingSchoolRequests] = await Promise.all([
      // Count per status
      OrganizationRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Count per organization type
      OrganizationRequest.aggregate([
        { $group: { _id: "$organizationType", count: { $sum: 1 } } },
      ]),

      // 5 most recent pending requests
      OrganizationRequest.find({ status: "pending" })
        .select("organizationName officialEmail createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Count only pending organization registration requests
      OrganizationRequest.countDocuments({ status: "pending" }),

      // Count only pending school registration requests
      SchoolRequest.countDocuments({ status: "pending" }),
    ]);

    // Shape the status breakdown into a plain object { pending: N, approved: N, rejected: N }
    const statusBreakdown = statusCounts.reduce(
      (acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );

    return res.status(200).json({
      success: true,
      data: {
        statusBreakdown,
        totalRequests: Object.values(statusBreakdown).reduce(
          (a, b) => a + b,
          0,
        ),
        typeBreakdown: typeCounts.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {}),
        recentPendingRequests: recentRequests,
        pendingOrganizationRequests,
        pendingSchoolRequests,
      },
    });
  } catch (error) {
    console.error("getOrganizationRequestStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization request stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const acceptOrganizationRequest = async (req, res) => {
  const { requestId } = req.params;
  const { targetAmount, billingCycle, customExpiryDate, batchPayments } = req.body;

  try {
    const { default: SystemSettings } =
      await import("../../models/graphura/SystemSettings.js");
    const settings = await SystemSettings.findOne();

    if (
      settings &&
      settings.school &&
      settings.school.allowSchoolRegistration === false
    ) {
      return res.status(403).json({
        success: false,
        message:
          "School Registration is currently disabled in System Settings.",
      });
    }

    const request = await OrganizationRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Organization request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}.`,
      });
    }

    // Validate Subscription Amount
    const targetAmountNum = Number(targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Subscription amount cannot be negative.",
      });
    }

    const paymentsArray = Array.isArray(batchPayments) ? batchPayments : [];
    for (const p of paymentsArray) {
      if (isNaN(Number(p.amount)) || Number(p.amount) < 0) {
        return res.status(400).json({
          success: false,
          message: "Payment amount cannot be negative.",
        });
      }
    }

    const totalPaidNow = paymentsArray.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const maxAllowed = billingCycle === "None" ? 0 : Number(targetAmountNum);

    if (totalPaidNow > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Payment of ₹${totalPaidNow} exceeds the maximum allowed due of ₹${maxAllowed}.`,
      });
    }

    if (billingCycle !== "None" && totalPaidNow < maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Payment of ₹${totalPaidNow} is less than the total due of ₹${maxAllowed}. You must clear the full balance to activate the cycle.`,
      });
    }

    let outstandingBalance = 0;
    let isFullPayment = false;

    if (billingCycle === "None") {
      outstandingBalance = Math.max(0, 0 - totalPaidNow);
      if (outstandingBalance === 0) isFullPayment = true;
    } else {
      outstandingBalance = Math.max(0, Number(targetAmountNum) - totalPaidNow);
      if (outstandingBalance === 0) isFullPayment = true;
    }

    let calculatedExpiry = null;
    if (isFullPayment) {
      if (billingCycle === "Monthly") {
        calculatedExpiry = new Date();
        calculatedExpiry.setDate(calculatedExpiry.getDate() + 30);
      } else if (billingCycle === "Yearly") {
        calculatedExpiry = new Date();
        calculatedExpiry.setDate(calculatedExpiry.getDate() + 365);
      } else if (billingCycle === "Custom" && customExpiryDate) {
        calculatedExpiry = new Date(customExpiryDate);
      }
    }

    const { organizationId, plainPassword } =
      await generateOrganizationCredentials(request.organizationName);
    const branchCreationId = await generateBranchCreationId();

    // ── 1. Create Organization ────────────────────────────────────────────
    const organization = await Organization.create({
      organizationName: request.organizationName,
      organizationId,
      password: plainPassword,
      organizationType: request.organizationType,
      numberOfBranches: request.numberOfBranches,
      organizationAcademic: {
        organizationBoard: request.organizationBoard ?? "CBSE",
        organizationSections: request.organizationSections ?? 1,
      },
      yearEstablished: request.yearEstablished ?? "",
      organizationLogo: request.organizationLogo ?? null,
      address: {
        line1: request.address ?? "",
        city: request.city,
        state: request.state,
        country: request.country ?? "India",
        pincode: request.pincode,
      },
      officialEmail: request.officialEmail,
      contactNumber: request.contactNumber,
      status: "active",
      requestId: request._id,
      branchCreationId,

      subscriptionPlan: request.subscriptionPlan || "Standard",
      paymentDetails: request.paymentDetails,

      billing: {
        status: "active",
        cycle: billingCycle,
        customAmount: targetAmountNum,
        outstandingBalance: outstandingBalance,
        expiryDate: calculatedExpiry,
        gracePeriodDays: 7,
        deactivationThresholdDays: 30,
        lastPaymentDate: totalPaidNow > 0 ? new Date() : null,
      },

      superAdminProfile: new mongoose.Types.ObjectId(),
    });

    // ── 2. Create SuperAdmin profile ──────────────────────────────────────
    const superAdmin = await SuperAdmin.create({
      organization: organization._id,
      name: request.adminName,
      email: request.adminEmail,
      phoneNumber: request.adminPhone,
      photo: null,
    });

    // ── 3. Patch org with real superAdmin _id ─────────────────────────────
    await Organization.findByIdAndUpdate(organization._id, {
      superAdminProfile: superAdmin._id,
    });

    // ── 4. Mark request as approved ───────────────────────────────────────
    request.status = "approved";
    request.generatedPassword = plainPassword;
    request.processedAt = new Date();
    await request.save();

    // ── 5. Log Initial Billing Payment in PaymentLog ──────────────────────
    if (paymentsArray.length > 0) {
      const logsToInsert = paymentsArray.map((p) => ({
        organization: organization._id,
        amountPaid: Number(p.amount),
        method: p.method || "Online Transfer",
        remark: p.remark || "Initial Subscription",
        billingCycle: billingCycle === "None" ? "Dues Cleared" : billingCycle,
        paymentDate: new Date(),
        status: "successful",
      }));
      await PaymentLog.insertMany(logsToInsert);
    }

    // ── 6. Send email (non-critical) ──────────────────────────────────────
    try {
      await sendAcceptanceEmail(
        request,
        organizationId,
        plainPassword,
        branchCreationId,
      );
    } catch (mailErr) {
      console.error(
        "[acceptOrganizationRequest] Email send failed:",
        mailErr.message,
      );
    }

    // ── 7. Respond ────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Organization request accepted. Credentials sent via email.",
      data: {
        organization: {
          _id: organization._id,
          organizationId,
          organizationName: organization.organizationName,
          officialEmail: organization.officialEmail,
          status: organization.status,
          branchCreationId,
        },
        superAdmin: {
          _id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
        },
      },
    });
  } catch (err) {
    console.error("[acceptOrganizationRequest] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create organization. Please try again.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const rejectOrganizationRequest = async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body ?? {};

  // ── 1. Fetch request ────────────────────────────────────────────────────────
  const request = await OrganizationRequest.findById(requestId);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Organization request not found.",
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Request has already been ${request.status}.`,
    });
  }

  // ── 2. Update request status ────────────────────────────────────────────────
  request.status = "deactivated";
  request.rejectionReason = reason?.trim() ?? null;
  request.processedAt = new Date();
  await request.save();

  // ── 3. Send rejection e-mail (non-critical) ─────────────────────────────────
  try {
    await sendRejectionEmail(request, reason);
  } catch (mailErr) {
    console.error(
      "[rejectOrganizationRequest] Email send failed:",
      mailErr.message,
    );
  }

  // ── 4. Respond ──────────────────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    message: "Organization request rejected. Notification sent via email.",
    data: {
      requestId: request._id,
      organizationName: request.organizationName,
      status: request.status,
      rejectionReason: request.rejectionReason,
      processedAt: request.processedAt,
    },
  });
};

// ─── Platform Analytics ───────────────────────────────────────────────────────

// ─── Platform Analytics ───────────────────────────────────────────────────────

export const getPlatformAnalytics = async (req, res) => {
  try {
    // Automatically deactivate expired organizations before retrieving analytics
    await autoDeactivateExpiredOrgs();

    let daysLimit = 7;
    if (req.query.range === "month") daysLimit = 30;
    else if (req.query.range === "quarter") daysLimit = 90;
    else if (req.query.range === "year") daysLimit = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 🔥 Date boundaries for Trend Charts
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);
    const startOf5YearsAgo = new Date(`${currentYear - 4}-01-01`);

    const [
      totalOrganizations,
      activeOrganizations,
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      recentRequests,
      boardCounts,
      last7DaysUsers,
      latestOrgs,
      latestUsers,
      allOrgs,
      schoolStudents,
      // 🔥 Monthly Trend Raw Data
      orgTrendRaw,
      studentTrendRaw,
      revenueTrendRaw,
      // 🔥 Yearly Trend Raw Data
      orgYearlyRaw,
      studentYearlyRaw,
      revenueYearlyRaw,
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: "active" }),
      School.countDocuments(),
      School.countDocuments({ isActive: true }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      OrganizationRequest.find({ status: "pending" })
        .select("organizationName officialEmail createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Organization.aggregate([
        {
          $group: {
            _id: "$organizationAcademic.organizationBoard",
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Organization.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("organizationName createdAt status")
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt status school")
        .populate({
          path: "school",
          select: "schoolName organization",
          populate: {
            path: "organization",
            select: "organizationName",
          },
        })
        .lean(),
      Organization.find().select("subscriptionPlan status createdAt billing").lean(),
      User.aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$school", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // ── MONTHLY AGGREGATIONS ──
      Organization.aggregate([
        { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        {
          $match: {
            role: "student",
            createdAt: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      ]),
      mongoose.model("PaymentLog").aggregate([
        { $match: { paymentDate: { $gte: startOfYear, $lte: endOfYear } } },
        {
          $group: {
            _id: { $month: "$paymentDate" },
            total: { $sum: "$amountPaid" },
          },
        },
      ]),

      // ── YEARLY AGGREGATIONS (Last 5 Years) ──
      Organization.aggregate([
        { $match: { createdAt: { $gte: startOf5YearsAgo } } },
        { $group: { _id: { $year: "$createdAt" }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: "student", createdAt: { $gte: startOf5YearsAgo } } },
        { $group: { _id: { $year: "$createdAt" }, count: { $sum: 1 } } },
      ]),
      mongoose.model("PaymentLog").aggregate([
        { $match: { paymentDate: { $gte: startOf5YearsAgo } } },
        {
          $group: {
            _id: { $year: "$paymentDate" },
            total: { $sum: "$amountPaid" },
          },
        },
      ]),
    ]);

    // Calculate actual revenue
    let totalRevenue = 0;
    allOrgs.forEach((org) => {
      if (org.status === "active") {
        totalRevenue += (Number(org.billing?.customAmount) || 0);
      }
    });

    // Calculate growth rate of organizations
    const oldOrgs = allOrgs.filter(
      (org) => org.createdAt < thirtyDaysAgo,
    ).length;
    const newOrgs = allOrgs.length;
    const growth =
      oldOrgs > 0
        ? (((newOrgs - oldOrgs) / oldOrgs) * 100).toFixed(1)
        : (newOrgs * 100).toFixed(1);

    // Fetch top performing schools
    const topSchoolIds = schoolStudents.map((s) => s._id);
    const schoolsInfo = await School.find({ _id: { $in: topSchoolIds } })
      .populate("organization")
      .lean();

    const topSchools = schoolStudents.map((ss) => {
      const sch = schoolsInfo.find(
        (s) => s._id.toString() === ss._id.toString(),
      );
      const org = sch?.organization;
      let revenue = 0;
      if (org?.subscriptionPlan === "Premium") revenue = 49990;
      else if (org?.subscriptionPlan === "Standard") revenue = 29990;
      else if (org?.subscriptionPlan === "Basic") revenue = 9990;
      return {
        name: org?.organizationName || sch?.schoolName || "School",
        students: ss.count,
        revenue,
        growth: org?.status === "active" ? 12 : 0,
      };
    });

    // Build a unified activity feed
    const feed = [
      ...recentRequests.map((r) => ({
        id: r._id,
        type: "school",
        action: "New registration request",
        name: r.organizationName,
        email: r.officialEmail,
        location: r.city ? `${r.city}` : "Unknown Location",
        time: r.createdAt,
        status: "pending",
      })),
      ...latestOrgs.map((o) => ({
        id: o._id,
        type: "subscription",
        action: "Organization onboarded",
        name: o.organizationName,
        email: o.officialEmail,
        location: o.address?.city || "HQ",
        time: o.createdAt,
        status: o.status === "active" ? "success" : "pending",
      })),
      ...latestUsers.map((u) => ({
        id: u._id,
        type: "user",
        action: `New ${u.role} joined`,
        name: u.name,
        email: u.email,
        location: u.school?.schoolName || "System Admin",
        time: u.createdAt,
        status: u.status,
      })),
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);

    // Dynamic Board Distribution Calculation
    const boardMap = new Map();
    STANDARD_BOARDS.forEach((board) => boardMap.set(board, 0));
    boardMap.set("Unknown", 0);

    boardCounts.forEach((b) => {
      const name = b._id || "Unknown";
      boardMap.set(name, (boardMap.get(name) || 0) + b.count);
    });

    const colors = [
      "#4F46E5",
      "#F59E0B",
      "#10B981",
      "#EC4899",
      "#8B5CF6",
      "#06B6D4",
      "#F43F5E",
      "#84CC16",
      "#14B8A6",
      "#64748B",
    ];

    const completeBoardDistribution = Array.from(boardMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    // Fill missing days for User Engagement
    const days = [];
    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const existing = last7DaysUsers.find((u) => u._id === dateStr);
      days.push({
        day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        active: existing?.count || 0,
        new: existing?.count || 0,
        returning: 0,
      });
    }

    // ── FORMAT MONTHLY TREND DATA ──
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyTrendData = monthNames.map((month, index) => {
      const monthNum = index + 1;
      const orgData = orgTrendRaw.find((item) => item._id === monthNum);
      const studentData = studentTrendRaw.find((item) => item._id === monthNum);
      const revData = revenueTrendRaw.find((item) => item._id === monthNum);

      return {
        month,
        schools: orgData ? orgData.count : 0,
        students: studentData ? studentData.count : 0,
        revenue: revData ? revData.total : 0,
      };
    });

    // ── FORMAT YEARLY TREND DATA ──
    const yearlyTrendData = [];
    for (let i = currentYear - 4; i <= currentYear; i++) {
      const orgData = orgYearlyRaw.find((item) => item._id === i);
      const studentData = studentYearlyRaw.find((item) => item._id === i);
      const revData = revenueYearlyRaw.find((item) => item._id === i);

      yearlyTrendData.push({
        year: i.toString(),
        schools: orgData ? orgData.count : 0,
        students: studentData ? studentData.count : 0,
        revenue: revData ? revData.total : 0,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        metricsSnapshot: {
          totalOrganizations,
          activeOrganizations,
          totalSchools,
          activeSchools,
          totalStudents,
          totalTeachers,
          totalUsers: totalStudents + totalTeachers,
          totalRevenue,
          growth,
        },
        topSchools,
        recentPendingRequests: recentRequests,
        schoolDistribution: completeBoardDistribution,
        userActivity7Days: days,
        recentActivitiesFeed: feed,
        monthlyTrendData, // Data for Monthly Chart
        yearlyTrendData, // Data for Yearly Chart
      },
    });
  } catch (error) {
    console.error("[getPlatformAnalytics] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch platform analytics",
    });
  }
};

const autoDeactivateExpiredOrgs = async () => {
  try {
    const now = new Date();
    const activeOrgs = await Organization.find({ status: "active" });
    let modifiedCount = 0;
    for (const org of activeOrgs) {
      if (org.billing?.expiryDate) {
        const expiry = new Date(org.billing.expiryDate);
        const graceEnd = new Date(expiry);
        graceEnd.setDate(graceEnd.getDate() + (org.billing.gracePeriodDays || 7));
        if (now > graceEnd) {
          org.status = "deactivated";
          org.billing.status = "deactivated";
          await org.save();
          modifiedCount++;
        }
      }
    }
    if (modifiedCount > 0) {
      console.log(
        `[autoDeactivate] Automatically deactivated ${modifiedCount} expired organizations.`,
      );
    }
  } catch (error) {
    console.error("Error in autoDeactivateExpiredOrgs:", error);
  }
};

// ─── Organizations List ───────────────────────────────────────────────────────

export const getOrganizationsList = async (req, res) => {
  try {
    // 1. Automatically deactivate expired organizations before fetching
    await autoDeactivateExpiredOrgs();

    const page = req.query.page ? Math.max(1, parseInt(req.query.page)) : null;
    const limit = req.query.limit
      ? Math.min(100, Math.max(1, parseInt(req.query.limit)))
      : null;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.organizationName = { $regex: req.query.search, $options: "i" };
    }

    let query = Organization.find(filter)
      .select("-password -__v")
      .populate("superAdminProfile", "name email phoneNumber")
      .sort({ createdAt: -1 });

    if (page && limit) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }

    const [total, organizationsLean] = await Promise.all([
      Organization.countDocuments(filter),
      query.lean(),
    ]);

    // Create a mutable copy of organizations
    const organizations = organizationsLean.map((org) => ({ ...org }));

    // 2. Fetch and aggregate school and student counts
    if (organizations.length > 0) {
      const orgIds = organizations.map((org) => org._id);

      // ✅ Fetch ALL schools belonging to these orgs (removed isActive: true filter)
      const schools = await School.find({
        organization: { $in: orgIds },
      })
        .select("_id organization isActive")
        .lean();

      const schoolIds = schools.map((s) => s._id);

      // ✅ Track both Total and Active schools per Organization
      const orgIdToTotalSchools = {};
      const orgIdToActiveSchools = {};

      schools.forEach((school) => {
        const orgIdStr = school.organization.toString();

        // Increment Total Count
        orgIdToTotalSchools[orgIdStr] =
          (orgIdToTotalSchools[orgIdStr] || 0) + 1;

        // Increment Active Count if applicable
        if (school.isActive) {
          orgIdToActiveSchools[orgIdStr] =
            (orgIdToActiveSchools[orgIdStr] || 0) + 1;
        }
      });

      // 1. Fetch student counts grouped by school from Student model (matching getOrganizationById)
      const studentCounts = await Student.aggregate([
        {
          $match: {
            school: { $in: schoolIds },
          },
        },
        { $group: { _id: "$school", count: { $sum: 1 } } },
      ]);

      // 2. Fetch teacher counts grouped by school from User model
      const teacherCounts = await User.aggregate([
        {
          $match: {
            school: { $in: schoolIds },
            role: "teacher",
          },
        },
        { $group: { _id: "$school", count: { $sum: 1 } } },
      ]);

      // 3. Fetch non-teaching staff counts grouped by school from User model
      const nonTeacherCounts = await User.aggregate([
        {
          $match: {
            school: { $in: schoolIds },
            role: {
              $in: ["admin", "accountant", "support_staff", "principal"],
            },
          },
        },
        { $group: { _id: "$school", count: { $sum: 1 } } },
      ]);

      const schoolIdToStudentCount = {};
      studentCounts.forEach((sc) => {
        schoolIdToStudentCount[sc._id.toString()] = sc.count;
      });

      const schoolIdToTeacherCount = {};
      teacherCounts.forEach((tc) => {
        schoolIdToTeacherCount[tc._id.toString()] = tc.count;
      });

      const schoolIdToNonTeacherCount = {};
      nonTeacherCounts.forEach((ntc) => {
        schoolIdToNonTeacherCount[ntc._id.toString()] = ntc.count;
      });

      // Group counts by organization (matching getOrganizationById lookup)
      const orgIdToStudentCount = {};
      const orgIdToTeacherCount = {};
      const orgIdToNonTeacherCount = {};

      schools.forEach((school) => {
        const orgIdStr = school.organization.toString();
        const schoolIdStr = school._id.toString();

        const sCount = schoolIdToStudentCount[schoolIdStr] || 0;
        const tCount = schoolIdToTeacherCount[schoolIdStr] || 0;
        const ntCount = schoolIdToNonTeacherCount[schoolIdStr] || 0;

        orgIdToStudentCount[orgIdStr] =
          (orgIdToStudentCount[orgIdStr] || 0) + sCount;
        orgIdToTeacherCount[orgIdStr] =
          (orgIdToTeacherCount[orgIdStr] || 0) + tCount;
        orgIdToNonTeacherCount[orgIdStr] =
          (orgIdToNonTeacherCount[orgIdStr] || 0) + ntCount;
      });

      // Attach all computed data to each organization
      organizations.forEach((org) => {
        const orgIdStr = org._id.toString();

        org.studentCount = orgIdToStudentCount[orgIdStr] || 0;

        // ✅ Attach usage metrics for the frontend Dashboard
        if (!org.usage) org.usage = {};
        org.usage.schools = orgIdToTotalSchools[orgIdStr] || 0;
        org.usage.activeSchools = orgIdToActiveSchools[orgIdStr] || 0;
        org.usage.students = orgIdToStudentCount[orgIdStr] || 0;
        org.usage.teachers = orgIdToTeacherCount[orgIdStr] || 0;
        org.usage.nonTeachers = orgIdToNonTeacherCount[orgIdStr] || 0;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        organizations,
        pagination: {
          total,
          page: page || 1,
          limit: limit || total || 10,
          totalPages: limit ? Math.ceil(total / limit) : 1,
        },
      },
    });
  } catch (error) {
    console.error("[getOrganizationsList] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organizations list",
    });
  }
};

// ─── Update Organization Status ───────────────────────────────────────────────

export const updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended", "deactivated"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).select("organizationName organizationId status");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Organization status updated to ${status}`,
      data: { organization },
    });
  } catch (error) {
    console.error("[updateOrganizationStatus] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update organization status",
    });
  }
};

export const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch core organization details (Do not use .lean() yet)
    let organizationDoc = await Organization.findById(id)
      .select("-password -__v")
      .populate("superAdminProfile", "name email phoneNumber");

    if (!organizationDoc) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // ✅ FIX: Instantly evaluate and update the billing lifecycle based on today's date
    await organizationDoc.updateBillingLifecycle();

    // Convert document to a plain object for the rest of the controller operations
    const organization = organizationDoc.toObject();

    // 2. Fetch all Schools mapped to this Organization
    const schools = await School.find({ organization: id })
      .select("_id schoolName createdAt isActive")
      .sort({ createdAt: -1 })
      .lean();

    // Extract an array of just the school ObjectIds
    const schoolIds = schools.map((school) => school._id);
    const schoolsCount = schoolIds.length;

    // ... [The rest of your controller remains exactly the same] ...

    // 3. Fetch Actual Usage Statistics using the mapped schoolIds
    const [studentsCount, teachersCount, staffCount] = await Promise.all([
      Student.countDocuments({ school: { $in: schoolIds } }),
      User.countDocuments({ school: { $in: schoolIds }, role: "teacher" }),
      User.countDocuments({
        school: { $in: schoolIds },
        role: { $in: ["admin", "accountant", "support_staff", "principal"] },
      }),
    ]);

    // 4. Fetch Real Recent Activities
    let latestUsers = [];
    if (schoolIds.length > 0) {
      latestUsers = await User.find({ school: { $in: schoolIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name role createdAt status")
        .lean();
    }

    // 5. Build Unified Activity Feed
    const feed = [
      ...schools.slice(0, 5).map((s) => ({
        id: s._id,
        type: "school",
        action: "New branch provisioned",
        name: s.schoolName,
        time: s.createdAt,
        status: s.isActive ? "active" : "inactive",
      })),
      ...latestUsers.map((u) => ({
        id: u._id,
        type: "user",
        action: `New ${u.role} joined`,
        name: u.name,
        time: u.createdAt,
        status: u.status || "active",
      })),
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);

    // 6. Attach dynamic usage and feed to the payload
    organization.usage = {
      schools: schoolsCount,
      students: studentsCount,
      teachers: teachersCount,
      nonTeachers: staffCount,
    };

    organization.recentActivities = feed;
    organization.performanceData = [];

    return res.status(200).json({
      success: true,
      data: {
        ...organization,
        schools,
      },
    });
  } catch (error) {
    console.error("[getOrganizationById] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization details",
    });
  }
};

export const updateOrganizationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Map frontend fields (schoolName, email, etc.) to backend Organization model fields
    const allowedUpdates = {};

    // Handle name mapping
    const orgName = updateData.schoolName || updateData.organizationName;
    if (orgName) allowedUpdates.organizationName = orgName;

    // Handle email mapping
    const email = updateData.email || updateData.officialEmail;
    if (email) allowedUpdates.officialEmail = email;

    // Handle phone mapping
    const phone = updateData.phone || updateData.contactNumber;
    if (phone) allowedUpdates.contactNumber = phone;

    // Handle board
    const board = updateData.board || updateData.organizationBoard;
    if (board) allowedUpdates["organizationAcademic.organizationBoard"] = board;

    // Handle address fields
    if (updateData.address) {
      if (typeof updateData.address === "object") {
        if (updateData.address.line1 !== undefined)
          allowedUpdates["address.line1"] = updateData.address.line1;
        if (updateData.address.line2 !== undefined)
          allowedUpdates["address.line2"] = updateData.address.line2;
        if (updateData.address.city !== undefined)
          allowedUpdates["address.city"] = updateData.address.city;
        if (updateData.address.state !== undefined)
          allowedUpdates["address.state"] = updateData.address.state;
        if (updateData.address.pincode !== undefined)
          allowedUpdates["address.pincode"] = updateData.address.pincode;
        if (updateData.address.country !== undefined)
          allowedUpdates["address.country"] = updateData.address.country;
      } else {
        allowedUpdates["address.line1"] = updateData.address;
      }
    }

    // Support direct individual fields too
    if (updateData.city) allowedUpdates["address.city"] = updateData.city;
    if (updateData.state) allowedUpdates["address.state"] = updateData.state;
    if (updateData.pincode)
      allowedUpdates["address.pincode"] = updateData.pincode;
    if (updateData.expiryOverride !== undefined) {
      allowedUpdates.expiryOverride = updateData.expiryOverride;
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true },
    ).select("-password -__v");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Organization details updated successfully",
      data: organization,
    });
  } catch (error) {
    console.error("[updateOrganizationDetails] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update organization details",
    });
  }
};

// ─── Users List ───────────────────────────────────────────────────────

export const getAllSuperAdmins = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(req.query.limit) || 1000),
    );
    const skip = (page - 1) * limit;

    // ─── Build User Filter ────────────────────────────────────────
    const userFilter = {};

    if (req.query.status && req.query.status !== "all") {
      userFilter.status = req.query.status;
    }

    if (req.query.role && req.query.role !== "all") {
      userFilter.role = req.query.role;
    }

    if (req.query.search) {
      const matchingSchools = await School.find({
        schoolName: { $regex: req.query.search, $options: "i" },
      })
        .select("_id")
        .lean();
      const schoolIds = matchingSchools.map((s) => s._id);
      userFilter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { loginId: { $regex: req.query.search, $options: "i" } },
        { school: { $in: schoolIds } },
      ];
    }

    // ─── Query + Populate ─────────────────────────────────────────────────
    const [total, active, students, teachers, admins, rawUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: "active" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "teacher" }),
        User.countDocuments({ role: "admin" }),
        User.find(userFilter)
          .populate("school", "schoolName principalName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

    // Group and populate profileId based on actual schema structure (resolving StrictPopulateError strictly)
    const studentUsers = rawUsers.filter((u) => u.profileModel === "Student");
    const teacherUsers = rawUsers.filter((u) => u.profileModel === "Teacher");
    const otherUsers = rawUsers.filter(
      (u) => u.profileModel !== "Student" && u.profileModel !== "Teacher",
    );

    if (studentUsers.length > 0) {
      await User.populate(studentUsers, {
        path: "profileId",
        model: "Student",
        populate: [
          { path: "class", select: "name", model: "Class" },
          { path: "section", select: "name", model: "Section" },
          {
            path: "parent",
            model: "Parent",
            populate: {
              path: "user",
              select: "name email loginId",
              model: "User",
            },
          },
        ],
      });
    }

    if (teacherUsers.length > 0) {
      await User.populate(teacherUsers, {
        path: "profileId",
        model: "Teacher",
      });
    }

    if (otherUsers.length > 0 && otherUsers.some((u) => u.profileId)) {
      await User.populate(otherUsers, {
        path: "profileId",
      });
    }

    const users = rawUsers;

    return res.status(200).json({
      success: true,
      data: {
        users,
        stats: {
          total,
          active,
          students,
          teachers,
          admins,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("[getAllUsers] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users list",
    });
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getGraphuraNotifications = async (req, res) => {
  try {
    const notifications = await GraphuraNotification.find().sort({
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("[getGraphuraNotifications] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await GraphuraNotification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true },
    );
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("[markNotificationRead] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await GraphuraNotification.findByIdAndDelete(id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("[deleteNotification] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const getAllSubscriptions = async (req, res) => {
  try {
    const organizations = await Organization.find()
      .select(
        "organizationName officialEmail contactNumber status subscriptionPlan subscriptionStatus subscriptionExpiryDate autoRenew createdAt",
      )
      .sort({ subscriptionExpiryDate: 1 });

    return res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error("[getAllSubscriptions] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
    });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subscriptionPlan,
      subscriptionStatus,
      subscriptionExpiryDate,
      autoRenew,
    } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      id,
      {
        $set: {
          subscriptionPlan,
          subscriptionStatus,
          subscriptionExpiryDate,
          autoRenew,
        },
      },
      { new: true, runValidators: true },
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: organization,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    console.error("[updateSubscription] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};

export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate("organization", "organizationName")
      .populate("school", "schoolName")
      .sort({ expenseDate: -1 })
      .lean();

    // Manually populate recordedBy from either User or GraphuraAdmin collection
    const userIds = [
      ...new Set(expenses.map((e) => e.recordedBy?.toString()).filter(Boolean)),
    ];
    const [users, admins] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select("name fullName email")
        .lean(),
      GraphuraAdmin.find({ _id: { $in: userIds } })
        .select("fullName email")
        .lean(),
    ]);

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = {
        name: u.name || u.fullName,
        email: u.email,
        role: "user",
      };
    });
    admins.forEach((a) => {
      userMap[a._id.toString()] = {
        name: a.fullName || "Graphura Admin",
        email: a.email,
        role: "graphuraAdmin",
      };
    });

    expenses.forEach((e) => {
      if (e.recordedBy) {
        e.recordedBy = userMap[e.recordedBy.toString()] || {
          name: "System User",
          role: "system",
        };
      }
    });

    return res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error("Error in getAllExpenses:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createGraphuraExpense = async (req, res) => {
  try {
    const { title, amount, expenseDate, paymentMode, paymentStatus, remarks } =
      req.body;

    if (!title || !amount || !expenseDate || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    let organization = req.body.organization || req.body.organizationId;
    let school = req.body.school;
    let category = req.body.category || "miscellaneous";

    if (!organization) {
      const defaultOrg = await Organization.findOne().select("_id");
      if (!defaultOrg) {
        return res.status(400).json({
          success: false,
          message: "No organization found in database to assign as default.",
        });
      }
      organization = defaultOrg._id;
    }

    if (!school) {
      const defaultSchool = await School.findOne({ organization }).select(
        "_id",
      );
      if (!defaultSchool) {
        const anySchool = await School.findOne().select("_id");
        if (!anySchool) {
          return res.status(400).json({
            success: false,
            message: "No school branch found in database to assign as default.",
          });
        }
        school = anySchool._id;
      } else {
        school = defaultSchool._id;
      }
    }

    const expense = new Expense({
      organization,
      school,
      title,
      category,
      amount,
      expenseDate: new Date(expenseDate),
      paymentMode,
      paymentStatus: paymentStatus || "paid",
      remarks,
      recordedBy: req.user._id,
    });

    await expense.save();
    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Error in createGraphuraExpense:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getGraphuraEscalations = async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;

    const query = { status: "escalated" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const limitNum = parseInt(limit, 10);

    // Fetch tickets globally, ignoring the organization boundary
    const tickets = await Ticket.find(query)
      .populate("school", "schoolName")
      .populate("organization", "organizationName")
      .sort({ updatedAt: -1 })
      .limit(limitNum)
      .lean();

    // Map to the format the UI expects
    const formattedTickets = tickets.map((ticket) => ({
      _id: ticket._id,
      id: `TKT-${ticket._id.toString().slice(-6).toUpperCase()}`,
      branch: ticket.school?.schoolName || "Unknown Branch",
      organizationName: ticket.organization?.organizationName || "Unknown Org",
      subject: ticket.title,
      description: ticket.description,
      priority: ticket.priority?.toUpperCase(),
      status: ticket.status?.toUpperCase(),
      category: ticket.category,
      time: ticket.updatedAt || ticket.createdAt, // Frontend formats this
      escalationLevel: ticket.escalationLevel || 0,
      escalationLog: ticket.escalationLog || [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        tickets: formattedTickets,
      },
    });
  } catch (error) {
    console.error("Error in getGraphuraEscalations:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve an escalated ticket as the Graphura Admin
export const resolveGraphuraEscalation = async (req, res) => {
  try {
    const adminId = req.user?._id; // The logged-in Graphura Admin
    const { ticketId } = req.params;
    const { resolutionNote } = req.body;

    if (!resolutionNote) {
      return res
        .status(400)
        .json({ success: false, message: "Resolution note is required." });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    if (ticket.status !== "escalated") {
      return res.status(400).json({
        success: false,
        message: "Ticket is not currently escalated.",
      });
    }

    // Update ticket status
    ticket.status = "resolved";
    ticket.resolvedBy = adminId;
    ticket.resolvedAt = new Date();

    // Append the final resolution note
    ticket.resolutionNote = `[Graphura Admin Resolution]: ${resolutionNote}`;

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket resolved successfully by Graphura Admin.",
      data: { id: ticket._id, status: "RESOLVED" },
    });
  } catch (error) {
    console.error("Error in resolveGraphuraEscalation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all support tickets with statistics
// @route   GET /api/v1/graphura/support-desk/tickets
// @access  Private (Graphura Admin)
export const getAllSupportTickets = async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }, // Changed from message
      ];
    }

    // Fetch tickets and populate the super admin and org who raised it
    const tickets = await SuperAdminSupportTicket.find(query)
      .populate("superAdmin", "name email")
      .populate("organization", "name")
      .sort({ lastActivityAt: -1, createdAt: -1 }) // Changed from lastUpdatedAt
      .lean();

    // Calculate Stats
    const stats = {
      total: await SuperAdminSupportTicket.countDocuments(),
      open: await SuperAdminSupportTicket.countDocuments({ status: "open" }),
      inProgress: await SuperAdminSupportTicket.countDocuments({
        status: "in-progress",
      }),
      resolved: await SuperAdminSupportTicket.countDocuments({
        status: "resolved",
      }),
    };

    res.status(200).json({
      success: true,
      data: {
        tickets,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch tickets" });
  }
};

// @desc    Get single ticket by ID
// @route   GET /api/v1/graphura/support-desk/tickets/:id
// @access  Private (Graphura Admin)
export const getSupportTicketById = async (req, res) => {
  try {
    const ticket = await SuperAdminSupportTicket.findById(req.params.id)
      .populate("superAdmin", "name email")
      .populate("organization", "name");

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
};

// @desc    Reply to a support ticket
// @route   POST /api/v1/graphura/support-desk/tickets/:id/reply
// @access  Private (Graphura Admin)
export const replyToSupportTicket = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const ticket = await SuperAdminSupportTicket.findById(req.params.id);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    const newMessage = {
      sender: req.user?.name || "Graphura Support",
      senderId: req.user._id,
      role: "graphura_support", // Changed from "support" to match your Enum
      message: message,
      timestamp: new Date(),
    };

    ticket.messages.push(newMessage);

    // Automatically change status to 'in-progress' if it was 'open'
    if (ticket.status === "open") {
      ticket.status = "in-progress";
    }

    await ticket.save();

    res.status(200).json({ success: true, data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send reply" });
  }
};

// @desc    Update ticket status
// @route   PATCH /api/v1/graphura/support-desk/tickets/:id/status
// @access  Private (Graphura Admin)
export const updateSupportTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["open", "in-progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // Handled mostly by the pre-save hook in the schema, but we can do a direct update
    // If setting to resolved, we might want to attach resolvedAt manually if using findByIdAndUpdate
    const updateData = { status };
    if (status === "resolved") updateData.resolvedAt = new Date();

    const ticket = await SuperAdminSupportTicket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
};

// @desc    Update user status
// @route   PATCH /api/v1/graphura/users/:id/status
// @access  Private (Graphura Admin)
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status. Allowed values are active and inactive." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ success: true, message: `User status updated to ${status}.`, data: user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update user status." });
  }
};
