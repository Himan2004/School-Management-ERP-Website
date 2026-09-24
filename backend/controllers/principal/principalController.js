import mongoose from "mongoose";
import AdminProfile from "../../models/users/admin.model.js";
import { generateAdminCredentials } from "../../utils/generateCredentials.js";
import {
  sendAdminCredentialsEmail,
  sendApprovalEmailWithCredentials,
  sendRejectionEmail,
} from "../../services/emailService.js";
import User from "../../models/users/user.model.js";
import School from "../../models/school/School.js";
import AdmissionRequest from "../../models/school/admissionRequest.js";
import StudentProfile from "../../models/users/student.model.js";
import ParentProfile from "../../models/users/parent.model.js";
import {
  generateParentCredentials,
  generateStudentCredentials,
} from "../../utils/generateCredentials.js";
import Event from "../../models/common/Event.js";
import Attendance from "../../models/academic/attendance.model.js";
import Notification from "../../models/common/Notification.js";
// ==================== EXISTING FUNCTION: CREATE ADMIN ====================
export const createAdmin = async (req, res) => {
  try {
    const { name, email, gender, dob, address, status } = req.body;

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Name and Email are required" });
    }

    const principal = await User.findById(req.user.id).populate("school");
    if (!principal || !principal.school) {
      return res
        .status(404)
        .json({ success: false, message: "Principal's school not found" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A user with this email already exists",
        });
    }

    const { loginId, plainPassword } = generateAdminCredentials(name);

    const adminUser = await User.create({
      name,
      email,
      loginId,
      password: plainPassword,
      role: "admin",
      school: principal.school._id,
      status: status || "active",
    });

    const adminProfile = await AdminProfile.create({
      user: adminUser._id,
      gender,
      dob,
      address,
      school: principal.school._id,
    });

    await adminUser.updateProfileLink(adminProfile._id, "Admin");

    sendAdminCredentialsEmail(
      adminUser,
      loginId,
      plainPassword,
      principal.school.schoolName,
    ).catch((err) => console.error("Admin Email Error:", err.message));

    res.status(201).json({
      success: true,
      message: "Admin created successfully and credentials sent.",
      data: {
        id: adminUser._id,
        name: adminUser.name,
        loginId: adminUser.loginId,
        role: adminUser.role,
        status: adminUser.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ADMISSION REQUEST FUNCTIONS ====================

// Helper function to generate random password
const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ==================== GET ORGANIZATIONS FOR ADMISSION FORM ====================
export const getRegisteredOrganizations = async (req, res) => {
  try {
    // Get approved organizations from OrganizationRequest or School model
    // Adjust based on your actual model structure
    const organizations = await School.find({ status: "active" })
      .select("schoolName")
      .distinct("schoolName");

    const organizationList = organizations.map((org) => ({
      id: org,
      name: org,
    }));

    res.status(200).json({
      success: true,
      data: organizationList,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET BRANCHES FOR ORGANIZATION ====================
export const getOrganizationBranches = async (req, res) => {
  try {
    const { organizationName } = req.params;

    const schools = await School.find({
      schoolName: organizationName,
      status: "active",
    }).select("branchName address");

    const branches = schools.map((school) => ({
      id: school._id,
      name: school.branchName,
      address: school.address,
    }));

    res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET ALL ADMISSION REQUESTS FOR PRINCIPAL ====================
export const getAdmissionRequests = async (req, res) => {
  try {
    const principal = await User.findById(req.user.id).populate("school");

    if (!principal || !principal.school) {
      return res.status(404).json({
        success: false,
        message: "Principal's school not found",
      });
    }

    const school = await School.findById(principal.school._id).populate(
      "organization",
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const query = {
      branch: school._id,
      organization: school.organization._id,
    };

    // Count ALL admission requests to check if data exists at all
    const totalInDB = await AdmissionRequest.countDocuments({});

    // Count with query
    const totalMatching = await AdmissionRequest.countDocuments(query);

    // Sample one document to see what fields it has
    const sample = await AdmissionRequest.findOne({});

    const { status, search, page = 1, limit = 10 } = req.query;

    if (status && status !== "all") query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await AdmissionRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("students.class", "name numericLevel");

    const total = await AdmissionRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("CRITICAL ERROR in getAdmissionRequests:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET SINGLE ADMISSION REQUEST ====================
export const getAdmissionRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await AdmissionRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Admission request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching admission request:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== APPROVE ADMISSION REQUEST ====================
export const approveAdmissionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request ID" });
    }

    // ✅ Populate branch so we have the full school ObjectId
    const request = await AdmissionRequest.findById(id).populate("branch");
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Admission request not found" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: `Request already ${request.status}` });
    }

    request.status = "approved";
    request.reviewedAt = new Date();
    request.remarks = remarks || null;
    await request.save();

    // ✅ Use request.branch._id explicitly
    const schoolId = request.branch._id || request.branch;

    // Create Parent User
    const parentLoginId = generateParentCredentials(request.parent.fullName);
    const parentPassword = generateRandomPassword();

    const parentUser = await User.create({
      name: request.parent.fullName,
      email: request.parent.email,
      // phone: request.parent.primaryContact,
      loginId: parentLoginId.loginId,
      password: parentPassword,
      role: "parent",
      school: schoolId, // ✅ guaranteed to be set
    });
    const parentProfile = await ParentProfile.create({
      user: parentUser._id,
      primaryContact: request.parent.primaryContact, // ✅ correct field name
      alternateContact: request.parent.alternateContact || null,
      relation: request.parent.relation.toLowerCase(), // ✅ "Father" → "father"
      address: request.parent.address,
      aadharCard: request.parent.aadharNumber || null, // ✅ correct field name
      fatherName: request.parent.fatherName || null,
      motherName: request.parent.motherName || null,
      notifications: {
        sms: request.parent.notifications?.sms || false,
        email: request.parent.notifications?.email || false,
        push: request.parent.notifications?.push || false,
      },
      school: schoolId,
    });

    await parentUser.updateProfileLink(parentProfile._id, "Parent");

    // Create Student Users
    const createdStudents = [];
    for (const studentData of request.students) {
      const studentLoginId = generateStudentCredentials(studentData.fullName);
      const studentPassword = generateRandomPassword();

      const studentUser = await User.create({
        name: studentData.fullName,
        email: request.parent.email,
        loginId: studentLoginId.loginId,
        password: studentPassword,
        role: "student",
        school: schoolId,
        parent: parentUser._id,
      });

      const studentProfile = await StudentProfile.create({
        user: studentUser._id,
        rollNo: studentData.rollNumber,
        class: studentData.class || null,
        enrollmentNo: `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        academicYear: studentData.academicYear || "2024-25",
        dateOfBirth: studentData.dob,
        gender: studentData.gender?.toLowerCase() || undefined,
        bloodGroup: studentData.bloodGroup || null,
        transport: {
          enrolled: studentData.transport?.required || false,
        },
        health: {
          notes: studentData.healthNotes || null,
        },
        previousSchool: {
          name: studentData.previousSchool || null,
        },
        admissionDate: studentData.admissionDate || new Date(),
        school: schoolId,
        parent: parentUser._id,
      });

      await studentUser.updateProfileLink(studentProfile._id, "Student");

      createdStudents.push({
        name: studentData.fullName,
        loginId: studentLoginId.loginId,
        password: studentPassword,
      });
    }

    // Send approval email
    sendApprovalEmailWithCredentials(request, {
      parent: { loginId: parentLoginId.loginId, password: parentPassword },
      students: createdStudents,
    });

    res.status(200).json({
      success: true,
      message: "Admission request approved successfully",
      data: {
        request,
        parent: { loginId: parentLoginId.loginId, name: parentUser.name },
        students: createdStudents.map((s) => ({
          name: s.name,
          loginId: s.loginId,
        })),
      },
    });
  } catch (error) {
    console.error("Error approving admission request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REJECT ADMISSION REQUEST ====================
export const rejectAdmissionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const request = await AdmissionRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Admission request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request already ${request.status}`,
      });
    }

    request.status = "rejected";
    request.reviewedAt = new Date();
    request.remarks = reason;
    await request.save();

    // Send rejection email
    await sendRejectionEmail(request, reason);

    res.status(200).json({
      success: true,
      message: "Admission request rejected successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error rejecting admission request:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET ADMISSION STATISTICS ====================
export const getAdmissionStatistics = async (req, res) => {
  try {
    const principal = await User.findById(req.user.id).populate("school");

    if (!principal || !principal.school) {
      return res
        .status(404)
        .json({ success: false, message: "Principal's school not found" });
    }

    const school = await School.findById(principal.school._id).populate(
      "organization",
    );
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // ✅ ID-based query
    const query = {
      branch: school._id,
      organization: school.organization._id,
    };

    const [total, pending, approved, rejected] = await Promise.all([
      AdmissionRequest.countDocuments(query),
      AdmissionRequest.countDocuments({ ...query, status: "pending" }),
      AdmissionRequest.countDocuments({ ...query, status: "approved" }),
      AdmissionRequest.countDocuments({ ...query, status: "rejected" }),
    ]);

    const recentRequests = await AdmissionRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: { total, pending, approved, rejected, recentRequests },
    });
  } catch (error) {
    console.error("Error fetching admission statistics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== BULK ACTION ON ADMISSION REQUESTS ====================
export const bulkUpdateAdmissionStatus = async (req, res) => {
  try {
    const { ids, status, remarks } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({
        success: false,
        message: "No request IDs provided",
      });
    }

    const validStatuses = ["approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: approved, rejected",
      });
    }

    const results = [];

    for (const id of ids) {
      const request = await AdmissionRequest.findById(id);

      if (request && request.status === "pending") {
        if (status === "approved") {
          request.status = "approved";
          request.reviewedAt = new Date();
          request.remarks = remarks || null;
          await request.save();
          results.push({ id, success: true, status: "approved" });
        } else {
          request.status = "rejected";
          request.reviewedAt = new Date();
          request.remarks = remarks || null;
          await request.save();
          results.push({ id, success: true, status: "rejected" });
        }
      } else {
        results.push({
          id,
          success: false,
          message: "Request not found or already processed",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed`,
      data: results,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== DASHBOARD OVERVIEW ====================
export const getDashboardOverview = async (req, res) => {
  try {
    const principal = await User.findById(req.user.id).populate("school");

    if (!principal || !principal.school) {
      return res.status(404).json({
        success: false,
        message: "Principal's school not found",
      });
    }

    const schoolId = principal.school._id;
    const school = await School.findById(schoolId).populate("organization");

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const organizationId = school.organization?._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const now = new Date();

    const [
      totalStudents,
      totalTeachers,
      activeClasses,
      pendingApprovals,
      attendanceAgg,
      upcomingEvents,
    ] = await Promise.all([
      StudentProfile.countDocuments({ school: schoolId, status: "active" }),
      User.countDocuments({
        school: schoolId,
        role: "teacher",
        status: "active",
      }),
      StudentProfile.distinct("class", {
        school: schoolId,
        status: "active",
        class: { $ne: null },
      }).then((rows) => rows.length),
      AdmissionRequest.countDocuments({
        branch: schoolId,
        organization: organizationId,
        status: "pending",
      }),
      Attendance.aggregate([
        {
          $match: {
            school: schoolId,
            date: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        {
          $project: {
            totalPresent: 1,
            entryCount: { $size: { $ifNull: ["$entries", []] } },
          },
        },
        {
          $group: {
            _id: null,
            present: { $sum: "$totalPresent" },
            total: { $sum: "$entryCount" },
          },
        },
      ]),
      Event.countDocuments({
        school: schoolId,
        eventDate: { $gte: now },
        status: { $in: ["Scheduled", "Ongoing", "Mandatory"] },
      }),
    ]);

    const present = attendanceAgg?.[0]?.present || 0;
    const total = attendanceAgg?.[0]?.total || 0;
    const attendancePercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        activeClasses,
        pendingApprovals,
        attendancePercentage,
        upcomingEvents,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardOverview:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get notifications for the logged-in principal
// @route   GET /api/v1/principal/notifications
// @access  Private (Principal)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/v1/principal/notifications/:id/read
// @access  Private (Principal)
export const markNotificationAsRead = async (req, res) => {
  try {
    // We check `user: req.user._id` to ensure a user can only read their own notifications
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

// @desc    Mark all unread notifications as read
// @route   PATCH /api/v1/principal/notifications/read-all
// @access  Private (Principal)
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
      error: error.message,
    });
  }
};
