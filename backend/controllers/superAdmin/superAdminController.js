import SchoolRequest from "../../models/superAdmin/SchoolRequest.js";
import {
  sendSchoolRejectionEmail,
  sendSchoolApprovalOfficialNotificationEmail,
  sendPrincipalCredentialsEmail,
} from "../../services/emailService.js";
import {
  generateCredentials,
  generatePrincipalCredentials,
} from "../../utils/generateCredentials.js";
import School from "../../models/school/School.js";
import SuperAdmin from "../../models/superAdmin/SuperAdmin.js";
import { generateBranchId } from "../../utils/generateBranchId.js";
import User from "../../models/users/user.model.js";
import Principal from "../../models/users/principal.model.js";
import Organization from "../../models/organization/Organization.js";
import Student from "../../models/users/student.model.js";
import SuperAdminSupportTicket from "../../models/superAdmin/SuperAdminSupportTicket.js";
import FeePayment from "../../models/finance/FeePayment.model.js";

export const getAllSchools = async (req, res) => {
  try {
    const { status, organizationId, search } = req.query;
    const filter = {};

    // Filter by isActive (we map 'accepted' to active=true, 'rejected' to active=false)
    if (status === "accepted") filter.isActive = true;
    else if (status === "rejected") filter.isActive = false;

    if (organizationId) filter.organization = organizationId;

    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: "i" } },
        { branchId: { $regex: search, $options: "i" } },
      ];
    }

    const schools = await School.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: schools });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptSchoolRequest = async (req, res) => {
  try {
    const { maxStaffLimit, maxStudentLimit } = req.body;

    const request = await SchoolRequest.findById(req.params.id).populate(
      "organization",
    );

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Already processed" });

    // Validate principalEmail existence and format
    if (!request.principalEmail || !request.principalEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Principal email is missing on request. Approval cannot proceed.",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.principalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Principal email format is invalid. Approval cannot proceed.",
      });
    }

    if (request?.organization?.branchCreationId !== request?.branchCreationId) {
      return res
        .status(404)
        .json({ success: false, message: "Branch Creation Id is Invalid!" });
    }

    // ── Subscription capacity validation ───────────────────────────────────
    const org = request.organization;
    if (!org) {
      return res.status(400).json({ success: false, message: "Organization link missing on request" });
    }

    const maxSchools = org.quotas?.maxSchools || 1;
    const maxStudents = org.quotas?.maxStudents || 500;
    const maxStaff = org.quotas?.maxStaff !== undefined
      ? org.quotas.maxStaff
      : (org.quotas?.maxTeachingStaff || 0) + (org.quotas?.maxNonTeachingStaff || 0) || 70;

    const currentSchoolsCount = await School.countDocuments({ organization: org._id });
    
    const orgSchools = await School.find({ organization: org._id });
    const currentStudentCapacityUsed = orgSchools.reduce((sum, s) => sum + (Number(s.enrollmentCapacity) || 0), 0);
    const currentStaffCapacityUsed = orgSchools.reduce((sum, s) => {
      const staffCount = s.totalStaff !== undefined && s.totalStaff !== ""
        ? Number(s.totalStaff) || 0
        : (Number(s.totalTeachingStaff) || 0) + (Number(s.totalNonTeachingStaff) || 0);
      return sum + staffCount;
    }, 0);

    const requestedStudents = Number(request.totalStudents) || 0;
    const requestedStaff = request.totalStaff !== undefined && request.totalStaff !== ""
      ? Number(request.totalStaff) || 0
      : (Number(request.totalTeachingStaff) || 0) + (Number(request.totalNonTeachingStaff) || 0);

    const afterApprovalSchools = currentSchoolsCount + 1;
    const afterApprovalStudents = currentStudentCapacityUsed + requestedStudents;
    const afterApprovalStaff = currentStaffCapacityUsed + requestedStaff;

    const isSchoolExceeded = afterApprovalSchools > maxSchools;
    const isStudentExceeded = afterApprovalStudents > maxStudents;
    const isStaffExceeded = afterApprovalStaff > maxStaff;

    if (isSchoolExceeded || isStudentExceeded || isStaffExceeded) {
      return res.status(400).json({
        success: false,
        reason: "subscription_limit_exceeded",
        message: "This organization has reached one or more subscription limits.",
        validation: {
          schoolLimit: {
            allocated: maxSchools,
            currentlyUsed: currentSchoolsCount,
            afterApproval: afterApprovalSchools,
            exceeded: isSchoolExceeded,
          },
          studentLimit: {
            allocated: maxStudents,
            currentlyUsed: currentStudentCapacityUsed,
            requested: requestedStudents,
            afterApproval: afterApprovalStudents,
            exceeded: isStudentExceeded,
            exceededBy: isStudentExceeded ? afterApprovalStudents - maxStudents : 0,
          },
          staffLimit: {
            allocated: maxStaff,
            currentlyUsed: currentStaffCapacityUsed,
            requested: requestedStaff,
            afterApproval: afterApprovalStaff,
            exceeded: isStaffExceeded,
            exceededBy: isStaffExceeded ? afterApprovalStaff - maxStaff : 0,
          },
        },
      });
    }
    // ──────────────────────────────────────────────────────────────────────

    // ── Duplicate branch check ─────────────────────────────────────────────
    const existingSchool = await School.findOne({
      schoolName: request.schoolName,
      organization: request.organization._id,
    });
    if (existingSchool) {
      return res.status(409).json({
        success: false,
        message: `Branch "${request.schoolName}" already exists for this organization`,
      });
    }

    // ── Duplicate principal email check ────────────────────────────────────
    const existingUser = await User.findOne({ email: request.principalEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user with email "${request.principalEmail}" already exists`,
      });
    }
    // ──────────────────────────────────────────────────────────────────────

    const { loginId, plainPassword } = generateCredentials(request.schoolName);

    const existingBranchIds = await School.distinct("branchId");
    const branchId = await generateBranchId(
      request.schoolName,
      existingBranchIds,
    );

    const school = await School.create({
      schoolName: request.schoolName,
      officialEmail: request.officialEmail,
      officialPhone: request.officialPhone,
      address: request.address,
      board: request.board,
      principalName: request.principalName,
      principalEmail: request.principalEmail,
      principalPhone: request.principalPhone,
      yearOfEstablishment: request.yearOfEstablishment,
      mediumOfInstruction: request.mediumOfInstruction,
      gradesOffered: request.gradesOffered,
      schoolType: request.schoolType,
      schoolRanking: request.schoolRanking,
      country: request.country,
      state: request.state,
      city: request.city,
      pinCode: request.pinCode,
      enrollmentCapacity: request.totalStudents,
      totalTeachingStaff: request.totalTeachingStaff,
      totalNonTeachingStaff: request.totalNonTeachingStaff,
      totalStaff: request.totalStaff,
      requestId: request._id,
      branchId,
      organization: request?.organization,
      maxStaffLimit: maxStaffLimit ? Number(maxStaffLimit) : 0,
      maxStudentLimit: maxStudentLimit ? Number(maxStudentLimit) : 0,
    });

    const { loginId: principalLoginId, plainPassword: principalPassword } =
      generatePrincipalCredentials(request.principalName);

    const principalUser = await User.create({
      name: request.principalName,
      loginId: principalLoginId,
      email: request.principalEmail,
      password: principalPassword,
      role: "principal",
      school: school._id,
    });

    await Principal.create({
      user: principalUser._id,
      school: school._id,
      phone: request.principalPhone ?? null,
      joiningDate: new Date(),
    });

    request.status = "accepted";
    request.loginId = loginId;
    await request.save();

    await sendPrincipalCredentialsEmail(
      request,
      principalLoginId,
      principalPassword,
    );

    if (request.officialEmail && request.officialEmail.trim()) {
      try {
        await sendSchoolApprovalOfficialNotificationEmail(request);
      } catch (officialMailErr) {
        console.error(
          "[acceptSchoolRequest] Official Email notification could not be sent:",
          officialMailErr.message
        );
      }
    } else {
      console.log("[acceptSchoolRequest] Official Email is missing. Official notification email could not be sent.");
    }

    res.status(200).json({
      success: true,
      message: `Accepted. Credentials sent to ${request.principalEmail}`,
      loginId,
      branchId,
      principalLoginId,
    });
  } catch (error) {
    console.error("acceptSchoolRequest error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectSchoolRequest = async (req, res) => {
  try {
    const request = await SchoolRequest.findById(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Already processed" });

    request.status = "rejected";
    request.rejectionReason = req.body.reason || "";
    await request.save();

    await sendSchoolRejectionEmail(request, req.body.reason);

    res
      .status(200)
      .json({ success: true, message: "Rejected. Admin notified." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Dashboard Analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const organizationId = req.user.id;

    // Get all schools under this organization
    const schools = await School.find({ organization: organizationId });
    const schoolIds = schools.map((s) => s._id);

    // Total schools count
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s) => s.isActive !== false).length;
    const inactiveSchools = totalSchools - activeSchools;

    // Total students count
    const totalStudents = await Student.countDocuments({
      school: { $in: schoolIds },
    });
    const activeStudents = await Student.countDocuments({
      school: { $in: schoolIds },
      status: "active",
    });
    const inactiveStudents = totalStudents - activeStudents;

    // Support tickets count
    const totalTickets = await SuperAdminSupportTicket.countDocuments({
      organization: organizationId,
    });
    const openTickets = await SuperAdminSupportTicket.countDocuments({
      organization: organizationId,
      status: { $in: ["open", "in_progress"] },
    });
    const resolvedTickets = await SuperAdminSupportTicket.countDocuments({
      organization: organizationId,
      status: { $in: ["resolved", "closed"] },
    });

    // Monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const monthlyPayments = await FeePayment.aggregate([
      {
        $match: {
          organization: organizationId,
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
          paymentStatus: "success",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalCollected" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyRevenue =
      monthlyPayments.length > 0 ? monthlyPayments[0].totalAmount : 0;
    const paidCount = monthlyPayments.length > 0 ? monthlyPayments[0].count : 0;
    const pendingCount = await FeePayment.countDocuments({
      organization: organizationId,
      paymentStatus: "pending",
    });

    // School growth data (last 6 months)
    const schoolGrowthData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const monthName = monthDate.toLocaleString("en-US", { month: "short" });

      const count = await School.countDocuments({
        organization: organizationId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      schoolGrowthData.push({ month: monthName, schools: count });
    }

    // Revenue data (last 6 months)
    const revenueData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const monthName = monthDate.toLocaleString("en-US", { month: "short" });

      const payments = await FeePayment.aggregate([
        {
          $match: {
            organization: organizationId,
            paymentDate: { $gte: monthStart, $lte: monthEnd },
            paymentStatus: "success",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalCollected" },
          },
        },
      ]);

      revenueData.push({
        month: monthName,
        revenue: payments.length > 0 ? payments[0].totalAmount : 0,
      });
    }

    // Recent schools
    const recentSchools = await School.find({ organization: organizationId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get student counts for each recent school
    const recentSchoolsWithData = await Promise.all(
      recentSchools.map(async (school) => {
        const studentCount = await Student.countDocuments({
          school: school._id,
        });
        return {
          _id: school._id,
          name: school.schoolName,
          students: studentCount,
          status: school.isActive !== false ? "active" : "inactive",
          email: school.officialEmail,
          createdAt: school.createdAt,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalSchools,
          activeSchools,
          inactiveSchools,
          totalStudents,
          activeStudents,
          inactiveStudents,
          monthlyRevenue,
          paidCount,
          pendingCount,
          totalTickets,
          openTickets,
          resolvedTickets,
        },
        quotas: req.user?.quotas || {
          maxSchools: 1,
          maxStudents: 500,
          maxStaff: 70,
        },
        usage: {
          schools: totalSchools,
          students: totalStudents,
        },
        schoolGrowthData,
        revenueData,
        recentSchools: recentSchoolsWithData,
      },
    });
  } catch (error) {
    console.error("getDashboardAnalytics error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const photo = req.file?.path;

    const updates = {};
    if (name) updates.name = name;
    if (photo) updates.photo = photo;

    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });

    const updated = await SuperAdmin.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW CRUD CONTROLLERS ─────────────────────────────────────────────

// Edit/Update a School Request
export const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findById(id);
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const orgId = school.organization;
    const org = await Organization.findById(orgId);
    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // Query other branches to calculate already allocated capacity
    const otherSchools = await School.find({
      organization: orgId,
      _id: { $ne: school._id },
    });

    const otherUsage = otherSchools.reduce(
      (acc, s) => {
        acc.students += Number(s.enrollmentCapacity) || 0;
        if (s.totalStaff !== undefined && s.totalStaff !== null && s.totalStaff !== "") {
          acc.staff += Number(s.totalStaff) || 0;
        } else {
          acc.staff += (Number(s.totalTeachingStaff) || 0) + (Number(s.totalNonTeachingStaff) || 0);
        }
        return acc;
      },
      { students: 0, staff: 0 }
    );

    const reqStudents = req.body.enrollmentCapacity !== undefined ? Number(req.body.enrollmentCapacity) || 0 : Number(school.enrollmentCapacity) || 0;
    const reqStaff = req.body.totalStaff !== undefined ? Number(req.body.totalStaff) || 0 : (school.totalStaff !== undefined && school.totalStaff !== "" ? Number(school.totalStaff) || 0 : (Number(school.totalTeachingStaff) || 0) + (Number(school.totalNonTeachingStaff) || 0));

    const remainingStudents = (org.quotas?.maxStudents || 0) - otherUsage.students;
    const maxStaffQuota = org.quotas?.maxStaff !== undefined ? org.quotas.maxStaff : ((org.quotas?.maxTeachingStaff || 0) + (org.quotas?.maxNonTeachingStaff || 0));
    const remainingStaff = maxStaffQuota - otherUsage.staff;

    if (reqStudents > remainingStudents) {
      return res.status(400).json({
        success: false,
        message: "Organization capacity exceeded.",
      });
    }

    if (reqStaff > remainingStaff) {
      return res.status(400).json({
        success: false,
        message: "Organization capacity exceeded.",
      });
    }

    const updatedSchool = await School.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res
      .status(200)
      .json({ success: true, message: "School updated", data: updatedSchool });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TOGGLE STATUS (Uses isActive now) ──────────────────────────────────────
export const toggleSchoolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findById(id);

    if (!school)
      return res
        .status(404)
        .json({ success: false, message: "School not found" });

    school.isActive = !school.isActive;
    await school.save();

    res
      .status(200)
      .json({
        success: true,
        message: `School is now ${school.isActive ? "Active" : "Inactive"}`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE SCHOOL (Replaces deleteSchoolRequest) ─────────────────────────
export const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    await School.findByIdAndDelete(id);
    // Optional: Add logic here to also delete associated Users/Principals if necessary
    res
      .status(200)
      .json({ success: true, message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL SCHOOL REQUESTS FOR ORGANIZATION ─────────────────────────────
export const getSchoolRequests = async (req, res) => {
  try {
    const orgId = req.user._id;
    const requests = await SchoolRequest.find({ organization: orgId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DIRECT SCHOOL CREATION BY ORG ADMIN (BYPASS REQUEST QUEUE) ────────────
export const createSchoolDirect = async (req, res) => {
  try {
    const {
      schoolName,
      officialEmail,
      officialPhone,
      address,
      principalName,
      principalEmail,
      principalPhone,
      enrollmentCapacity,
      totalStaff,
      ...otherDetails // board, gradesOffered, etc.
    } = req.body;

    const organizationId = req.user._id; // Enforce organization scope

    // 1. Core Validation
    if (
      !schoolName ||
      !officialEmail ||
      !address ||
      !principalName ||
      !principalEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "School Name, Address, Official Email, Principal Name, and Principal Email are required.",
      });
    }

    // 1b. Organization validation
    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const existingSchools = await School.find({ organization: organizationId });
    
    // 1c. School Count Capacity Validation
    const maxSchools = org.quotas?.maxSchools || 1;
    if (existingSchools.length >= maxSchools) {
      return res.status(400).json({
        success: false,
        message: "Organization capacity for new schools exceeded.",
      });
    }

    // 2. Duplicate Branch Check
    const existingSchool = await School.findOne({
      schoolName: schoolName,
      organization: organizationId,
    });

    if (existingSchool) {
      return res.status(409).json({
        success: false,
        message: `Branch "${schoolName}" already exists for this organization.`,
      });
    }

    // 3. Duplicate Principal Email Check
    const existingUser = await User.findOne({ email: principalEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user with the email "${principalEmail}" already exists.`,
      });
    }

    // 4. Generate Identifiers & Credentials
    const existingBranchIds = await School.distinct("branchId");
    const branchId = await generateBranchId(schoolName, existingBranchIds);
    const { loginId: principalLoginId, plainPassword: principalPassword } =
      generatePrincipalCredentials(principalName);

    // 5. Create School Document
    const school = await School.create({
      organization: organizationId,
      schoolName,
      officialEmail,
      officialPhone,
      address,
      principalName,
      principalEmail,
      principalPhone,
      branchId,
      loginId: principalLoginId,
      isActive: true, // Instantly active
      enrollmentCapacity,
      totalStaff,
      maxStudentLimit: enrollmentCapacity ? Number(enrollmentCapacity) : 0,
      maxStaffLimit: totalStaff ? Number(totalStaff) : 0,
      ...otherDetails,
    });

    // 6. Provision Principal User Account
    const principalUser = await User.create({
      name: principalName,
      loginId: principalLoginId,
      email: principalEmail,
      password: principalPassword,
      role: "principal",
      school: school._id,
    });

    // 7. Provision Principal Profile
    await Principal.create({
      user: principalUser._id,
      school: school._id,
      phone: principalPhone || null,
      joiningDate: new Date(),
    });

    // 8. Dispatch Welcome Email
    try {
      await sendPrincipalCredentialsEmail(
        school,
        principalLoginId,
        principalPassword,
      );
    } catch (emailError) {
      console.error(
        "Failed to send principal email, but school was created:",
        emailError,
      );
    }

    res.status(201).json({
      success: true,
      message: "School created successfully. Credentials dispatched to the principal.",
      data: school,
    });
  } catch (err) {
    console.error("createSchoolDirect Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
