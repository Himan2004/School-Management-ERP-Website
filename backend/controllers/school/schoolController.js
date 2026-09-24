import Organization from "../../models/organization/Organization.js";
import School from "../../models/school/School.js";
import SchoolRequest from "../../models/superAdmin/SchoolRequest.js";
import User from "../../models/users/user.model.js";
import Principal from "../../models/users/principal.model.js";
import AdmissionRequest from "../../models/school/admissionRequest.js";
import Class from "../../models/organization/organizationClass.js";
import { mongoose } from "mongoose";
import { generateBranchId } from "../../utils/generateBranchId.js";
import { generatePrincipalCredentials } from "../../utils/generateCredentials.js";
import {
  sendAdmissionRequestReceivedEmail,
  sendContactEnquiryEmail,
  sendPrincipalCredentialsEmail,
} from "../../services/emailService.js";

// ==================== CREATE NEW SCHOOL REQUEST (Landing Page Register) ====================
export const createSchool = async (req, res) => {
  try {
    const {
      organizationId,
      branchCreationId,
      schoolName,
      officialEmail,
      officialPhone,
      address,
      principalName,
      principalEmail,
      principalPhone,
      ...otherDetails // Catches yearOfEstablishment, board, gradesOffered, etc.
    } = req.body;

    // 1. Core Validation
    if (
      !organizationId ||
      !branchCreationId ||
      !schoolName ||
      !officialEmail ||
      !address ||
      !principalName ||
      !principalEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Organization ID, Branch Creation ID, School Name, Address, Official Email, Principal Name, and Principal Email are required.",
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

    // Validate Branch Creation ID
    if (org.branchCreationId !== branchCreationId) {
      return res.status(400).json({
        success: false,
        message: "Branch Creation ID is Invalid!",
      });
    }



    // 2. Duplicate Branch Check (Active Schools)
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

    // 2b. Duplicate Request Check (Pending Requests)
    const existingRequest = await SchoolRequest.findOne({
      schoolName: schoolName,
      organization: organizationId,
      status: "pending",
    });
    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: `A registration request for "${schoolName}" is already pending review.`,
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

    // 4. Create SchoolRequest Document
    const request = await SchoolRequest.create({
      organization: organizationId,
      branchCreationId,
      schoolName,
      officialEmail,
      officialPhone,
      address,
      principalName,
      principalEmail,
      principalPhone,
      yearOfEstablishment: otherDetails.yearOfEstablishment,
      board: otherDetails.board,
      schoolRanking: otherDetails.schoolRanking,
      country: otherDetails.country,
      state: otherDetails.state,
      city: otherDetails.city,
      pinCode: otherDetails.pinCode,
      website: otherDetails.website,
      totalStudents: otherDetails.totalStudents || otherDetails.enrollmentCapacity,
      totalTeachers: otherDetails.totalTeachers,
      gradesOffered: otherDetails.gradesOffered,
      mediumOfInstruction: otherDetails.mediumOfInstruction,
      schoolType: otherDetails.schoolType,
      totalTeachingStaff: otherDetails.totalTeachingStaff,
      totalNonTeachingStaff: otherDetails.totalNonTeachingStaff,
      totalStaff: otherDetails.totalStaff,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Your school registration request has been submitted successfully.",
      data: request,
    });
  } catch (err) {
    console.error("createSchool Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ─── Get All Organizations ────────────────────────────────────────────────────
export const getAllOrganizations = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    // Filter by status if provided
    if (status) {
      filter.status = status;
    }

    // Search by name or organizationId
    if (search) {
      filter.$or = [
        { organizationName: { $regex: search, $options: "i" } },
        { organizationId: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch all organizations matching the filter without skip/limit
    const organizations = await Organization.find(filter)
      .select("-password -__v")
      .populate("superAdminProfile", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Organizations fetched successfully",
      data: {
        organizations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizations",
      error: error.message,
    });
  }
};

// ─── Get All Branches (Schools) by Organization ───────────────────────────────
export const getBranchesByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { page = 1, limit = 10, isActive, search } = req.query;

    // Verify the organization exists
    const organization = await Organization.findById(organizationId)
      .select("organizationName organizationId status")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const filter = { organization: organizationId };

    // Filter by active status if provided
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Search by school name or branchId
    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: "i" } },
        { branchId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [branches, total] = await Promise.all([
      School.find(filter)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      School.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Branches fetched successfully",
      data: {
        organization,
        branches,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch branches",
      error: error.message,
    });
  }
};

// ==================== SUBMIT ADMISSION APPLICATION ====================
export const submitAdmissionApplication = async (req, res) => {
  try {
    console.log("[Admission] Admission request received");
    const {
      organizationId,
      branchId,
      organizationAddress,
      parentFullName,
      parentEmail,
      parentPhone,
      parentAlternatePhone,
      parentRelation,
      parentAddress,
      parentAadhar,
      parentNotifications,
      declarationAccepted,
    } = req.body;

    const requestSummary = {
      organizationId,
      branchId,
      parentFullName,
      parentEmail,
      parentPhone,
      declarationAccepted,
    };
    console.log("[Admission] Request body summary:", requestSummary);

    // ── Validate IDs ──────────────────────────────────────────────────────
    if (
      !mongoose.Types.ObjectId.isValid(organizationId) ||
      !mongoose.Types.ObjectId.isValid(branchId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid organization or branch ID" });
    }

    // ── Verify organization & branch ──────────────────────────────────────
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const school = await School.findOne({
      _id: branchId,
      organization: organizationId,
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    // ── Parse JSON string fields ──────────────────────────────────────────
    const parsedParentAddress =
      typeof parentAddress === "string"
        ? JSON.parse(parentAddress)
        : parentAddress;

    const parsedParentNotifications =
      typeof parentNotifications === "string"
        ? JSON.parse(parentNotifications)
        : parentNotifications;

    // ── Build parent object ───────────────────────────────────────────────
    const parentData = {
      fullName: parentFullName,
      email: parentEmail,
      primaryContact: parentPhone,
      alternateContact: parentAlternatePhone || null,
      relation: parentRelation,
      address: parsedParentAddress,
      aadharNumber: parentAadhar || null,
      notifications: parsedParentNotifications,
    };

    // ── Build students array ──────────────────────────────────────────────
    const files = req.files || [];
    const filesSummary = files.map((f) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      size: f.size,
    }));
    console.log("[Admission] Uploaded files summary:", filesSummary);

    const cloudinaryResults = files.map((f) => ({
      fieldname: f.fieldname,
      url: f.path,
    }));
    console.log("[Admission] Cloudinary upload results:", cloudinaryResults);

    // Handle multipart nested array parsing manually
    let parsedStudents = [];
    if (
      req.body.students &&
      (Array.isArray(req.body.students) ||
        typeof req.body.students === "object")
    ) {
      parsedStudents = Array.isArray(req.body.students)
        ? req.body.students
        : [req.body.students];
    } else {
      const indexSet = new Set();
      Object.keys(req.body).forEach((key) => {
        const match = key.match(/^students\[(\d+)\]/);
        if (match) {
          indexSet.add(parseInt(match[1], 10));
        }
      });
      const indices = Array.from(indexSet).sort((a, b) => a - b);
      parsedStudents = indices.map((index) => {
        const student = {};
        Object.keys(req.body).forEach((key) => {
          const prefix = `students[${index}][`;
          if (key.startsWith(prefix)) {
            const fieldName = key.slice(prefix.length, -1);
            if (fieldName.includes("][")) {
              const parts = fieldName.split("][");
              let current = student;
              for (let idx = 0; idx < parts.length - 1; idx++) {
                current[parts[idx]] = current[parts[idx]] || {};
                current = current[parts[idx]];
              }
              current[parts[parts.length - 1]] = req.body[key];
            } else {
              student[fieldName] = req.body[key];
            }
          }
        });
        return student;
      });
    }

    if (parsedStudents.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No student details provided" });
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startYear = currentMonth < 5 ? currentYear - 1 : currentYear;
    const endYear = (startYear + 1) % 100;
    const dynamicAcademicYear = `${startYear}-${endYear.toString().padStart(2, "0")}`;

    const studentsData = parsedStudents.map((student, i) => {
      if (!student) {
        throw new Error(`Student record at index ${i} is missing`);
      }
      if (!student.fullName) {
        throw new Error("Student full name is required");
      }
      if (!student.dob) {
        throw new Error(
          `Date of birth is required for student: ${student.fullName}`,
        );
      }

      const studentData = {
        fullName: student.fullName,
        gender: student.gender || null,
        dob: new Date(student.dob),
        bloodGroup: student.bloodGroup || null,
        class:
          student.classId && mongoose.Types.ObjectId.isValid(student.classId)
            ? new mongoose.Types.ObjectId(student.classId)
            : null,
        section: student.section || null,
        academicYear: student.academicYear || dynamicAcademicYear,
        rollNumber: student.rollNumber || null,
        enrollmentNumber: "PENDING",
        admissionDate: new Date(),
        transport: {
          required:
            student.transportRequired === "Yes" ||
            student.transportRequired === "true" ||
            student.transportRequired === true,
          busRoute: student.busRoute || null,
        },
        healthNotes: student.healthNotes || null,
        previousSchool: student.previousSchool || null,
        tc: { tcNumber: null, tcDate: null },
        photo: null,
        documents: {
          studentAadhaar: null,
          parentAadhaar: null,
          previousYearMarksheet: null,
          transferCertificate: null,
          birthCertificate: null,
        },
      };

      const photo = files.find((f) => f.fieldname === `students[${i}][photo]`);
      if (photo) studentData.photo = photo.path;

      for (const docType of ["studentAadhaar", "parentAadhaar", "previousYearMarksheet", "transferCertificate", "birthCertificate"]) {
        const doc = files.find(
          (f) => f.fieldname === `students[${i}][documents][${docType}]`,
        );
        if (doc) {
          studentData.documents[docType] = {
            url: doc.path,
            status: "submitted",
            remarks: "",
          };
        }
      }

      return studentData;
    });

    // ── Duplicate check — prevent same parent+student from submitting twice ─
    const firstStudentName = studentsData[0]?.fullName?.trim();
    const existingApplication = await AdmissionRequest.findOne({
      organization: organizationId,
      branch: branchId,
      "parent.email": parentData.email,
      "students.fullName": firstStudentName,
      status: { $in: ["pending", "under_review"] },
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: `A pending application for "${firstStudentName}" from this parent already exists (ID: ${existingApplication.applicationNumber}). Please wait for the school to review it.`,
      });
    }
    // ── Create admission request ──────────────────────────────────────────
    const admissionRequest = await AdmissionRequest.create({
      organization: organizationId,
      branch: branchId,
      organizationName: organization.organizationName,
      branchName: school.schoolName,
      parent: parentData,
      students: studentsData,
      declarationAccepted:
        declarationAccepted === "true" || declarationAccepted === true,
      status: "pending",
      submittedAt: new Date(),
    });

    console.log("[Admission] Database save success");
    console.log(
      "[Admission] Generated application ID:",
      admissionRequest.applicationNumber,
    );

    // ── Send acknowledgment email (non-critical) ──────────────────────────
    sendAdmissionRequestReceivedEmail(admissionRequest).catch((err) =>
      console.error("Email failed:", err.message),
    );

    return res.status(201).json({
      success: true,
      message: "Admission application submitted successfully",
      applicationId: admissionRequest.applicationNumber,
      data: admissionRequest,
    });
  } catch (error) {
    console.error("[Admission] Error submitting admission application:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message,
      );
      return res.status(400).json({
        success: false,
        errorType: "validation_failure",
        message: "Validation failed: " + validationErrors.join(", "),
        details: error.errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        errorType: "invalid_id_format",
        message: `Invalid format for field ${error.path}: ${error.value}`,
      });
    }

    return res.status(500).json({
      success: false,
      errorType:
        error.message?.includes("database") ||
        error.message?.includes("validation")
          ? "database_failure"
          : "server_error",
      message:
        error.message ||
        "An unexpected server error occurred during admission submission",
    });
  }
};

export const getOrganizationAddress = async (req, res) => {
  try {
    const { organizationId, branchId } = req.params;

    const school = await School.findOne({
      _id: branchId,
      organization: organizationId,
    }).select("address schoolName");

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        address: school.address,
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid organization or branch ID",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getClassesOfOrganization = async (req, res) => {
  try {
    const organizationId =
      req.user?.organizationId || req.params.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const classes = await Class.find({ organization: organizationId })
      .sort({ numericLevel: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("Error fetching organization classes:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getOrganizationDetailsPublic
export const getOrganizationDetailsPublic = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const organization = await Organization.findById(organizationId)
      .select("-password -__v")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// submitContactEnquiry
export const submitContactEnquiry = async (req, res) => {
  try {
    const {
      fullName,
      schoolName,
      workEmail,
      phoneNumber,
      enquiryType,
      requirements,
    } = req.body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Full Name is required" });
    }
    if (!schoolName || !schoolName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "School Name is required" });
    }
    if (!workEmail || !workEmail.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number",
      });
    }
    if (!enquiryType || !enquiryType.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Enquiry Type is required" });
    }
    const validEnquiryTypes = [
      "Product Demo",
      "Implementation Guidance",
      "Support",
      "Pricing",
    ];
    if (!validEnquiryTypes.includes(enquiryType)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Enquiry Type" });
    }
    if (!requirements || !requirements.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Requirements details are required" });
    }

    const emailResult = await sendContactEnquiryEmail({
      fullName,
      schoolName,
      workEmail,
      phoneNumber,
      enquiryType,
      requirements,
    });

    return res.status(200).json({
      success: true,
      message:
        "Your message has been captured and our team will reach out shortly.",
      data: emailResult,
    });
  } catch (error) {
    console.error("Error in submitContactEnquiry controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send enquiry. Please try again later.",
      error: error.message,
    });
  }
};
