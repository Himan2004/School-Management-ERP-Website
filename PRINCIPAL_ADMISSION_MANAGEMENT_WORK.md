# PRINCIPAL DASHBOARD BACKEND - DETAILED WORK
## New Admission Management Page

**Document Date:** May 9, 2026  
**Scope:** Complete backend for Principal's New Admission page  
**Total Endpoints:** 26 endpoints

---

# OVERVIEW

The Principal's "New Admission" dashboard provides comprehensive admission management including form submission, document verification, admission approval workflow, and student profile creation. The principal can manage all aspects of the admission process from application to final enrollment.

---

# SECTION 1: ADMISSION FORM & SUBMISSION

## PART 1: ADMISSION ENDPOINTS

### File 1: Create `controllers/principal/admissionController.js`

**Functions to Implement (26 total):**

```javascript
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import AdmissionForm from "../../models/academic/AdmissionForm.model.js"; // Needs to be created
import AdmissionDocument from "../../models/academic/AdmissionDocument.model.js"; // Needs to be created
import Class from "../../models/superAdmin/Class.model.js";
import FeeStructure from "../../models/finance/FeeStructure.model.js";
import School from "../../models/school/School.model.js";
import Parent from "../../models/users/Parent.model.js"; // Needs to be created

// ==================== ADMISSION FORM ENDPOINTS ====================

// Function 1: Submit new admission form
export const submitAdmissionForm = async (req, res) => {
  try {
    const {
      // Personal Information
      fullName,
      dateOfBirth,
      gender,
      bloodGroup,
      category, // General, OBC, SC, ST
      religion,
      nationality,
      caste,
      
      // Contact Information
      email,
      phoneNumber,
      address,
      city,
      state,
      pinCode,
      
      // Father's Information
      fatherName,
      fatherOccupation,
      fatherQualification,
      fatherPhoneNumber,
      fatherEmail,
      fatherAnnualIncome,
      
      // Mother's Information
      motherName,
      motherOccupation,
      motherQualification,
      motherPhoneNumber,
      motherEmail,
      
      // Guardian Information (if applicable)
      guardianName,
      guardianRelation,
      guardianPhoneNumber,
      guardianEmail,
      
      // Admission Information
      classApplyingFor,
      section,
      previousSchool,
      previousClass,
      reasonForTransfer,
      
      // Medical Information
      allergies,
      medicalConditions,
      physicalDisability,
      
      // Additional
      siblingInSchool,
      siblingName,
      emergencyContact,
      emergencyPhoneNumber,
      documents // File paths
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    // Validation
    if (!fullName || !dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing (name, DOB, gender)"
      });
    }

    // Check for duplicate admission (same person, same school, pending)
    const existingForm = await AdmissionForm.findOne({
      school: schoolId,
      email,
      status: { $in: ["pending", "approved"] }
    });

    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: "Admission form already exists for this email"
      });
    }

    // Create admission form
    const admissionForm = await AdmissionForm.create({
      school: schoolId,
      organization: req.principal.organization,
      
      // Personal Info
      personalInfo: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup,
        category,
        religion,
        nationality,
        caste
      },
      
      // Contact Info
      contactInfo: {
        email,
        phoneNumber,
        address,
        city,
        state,
        pinCode
      },
      
      // Father's Info
      fatherInfo: {
        name: fatherName,
        occupation: fatherOccupation,
        qualification: fatherQualification,
        phoneNumber: fatherPhoneNumber,
        email: fatherEmail,
        annualIncome: fatherAnnualIncome
      },
      
      // Mother's Info
      motherInfo: {
        name: motherName,
        occupation: motherOccupation,
        qualification: motherQualification,
        phoneNumber: motherPhoneNumber,
        email: motherEmail
      },
      
      // Guardian Info
      guardianInfo: {
        name: guardianName,
        relation: guardianRelation,
        phoneNumber: guardianPhoneNumber,
        email: guardianEmail
      },
      
      // Admission Info
      admissionInfo: {
        classApplyingFor,
        section,
        previousSchool,
        previousClass,
        reasonForTransfer
      },
      
      // Medical Info
      medicalInfo: {
        allergies,
        medicalConditions,
        physicalDisability: physicalDisability || false
      },
      
      // Additional Info
      siblingInfo: {
        isStudentInSchool: siblingInSchool || false,
        siblingName,
        siblingClass: null
      },
      
      emergencyContact: {
        name: emergencyContact,
        phoneNumber: emergencyPhoneNumber
      },
      
      documents: documents || [],
      status: "pending",
      submittedAt: new Date(),
      submittedBy: req.principal._id
    });

    // If documents provided, create document records
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await AdmissionDocument.create({
          admission: admissionForm._id,
          school: schoolId,
          documentType: doc.type,
          fileUrl: doc.path,
          uploadedAt: new Date(),
          status: "submitted"
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Admission form submitted successfully",
      data: {
        admissionId: admissionForm._id,
        referenceNumber: admissionForm.referenceNumber,
        status: admissionForm.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get all admission forms (pending, approved, rejected)
export const getAllAdmissionForms = async (req, res) => {
  try {
    const {
      status = "pending", // pending, approved, rejected, completed
      classId,
      searchQuery,
      sortBy = "submittedAt",
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (classId) {
      filter["admissionInfo.classApplyingFor"] = classId;
    }

    // Search in name, email, phone
    if (searchQuery) {
      filter.$or = [
        { "personalInfo.fullName": { $regex: searchQuery, $options: "i" } },
        { "contactInfo.email": { $regex: searchQuery, $options: "i" } },
        { "contactInfo.phoneNumber": { $regex: searchQuery, $options: "i" } },
        { referenceNumber: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Date range filter
    if (dateFrom && dateTo) {
      filter.submittedAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    }

    // Sorting
    const sortOptions = {
      submittedAt: { submittedAt: -1 },
      name: { "personalInfo.fullName": 1 },
      status: { status: 1 },
      dob: { "personalInfo.dateOfBirth": 1 }
    };

    const sort = sortOptions[sortBy] || sortOptions.submittedAt;
    const skip = (page - 1) * limit;

    const forms = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name classCode")
      .populate("submittedBy", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "referenceNumber personalInfo contactInfo admissionInfo status submittedAt " +
        "approvedAt approvedBy documentStatus verificationStatus"
      );

    const total = await AdmissionForm.countDocuments(filter);

    // Add document count for each form
    const formsWithDocCount = await Promise.all(
      forms.map(async (form) => {
        const docCount = await AdmissionDocument.countDocuments({
          admission: form._id
        });
        return {
          ...form.toObject(),
          documentsCount: docCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formsWithDocCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Get single admission form details
export const getAdmissionFormDetail = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    })
      .populate("submittedBy", "fullName email")
      .populate("approvedBy", "fullName email")
      .populate("admissionInfo.classApplyingFor", "name classCode section");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    // Get associated documents
    const documents = await AdmissionDocument.find({
      admission: admissionId
    });

    res.status(200).json({
      success: true,
      data: {
        ...form.toObject(),
        documents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Verify admission documents
export const verifyAdmissionDocuments = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { documentStatuses } = req.body; // [{ documentId, status, remarks }]
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    // Update each document status
    for (const docStatus of documentStatuses) {
      await AdmissionDocument.findByIdAndUpdate(
        docStatus.documentId,
        {
          status: docStatus.status, // submitted, verified, rejected
          remarks: docStatus.remarks,
          verifiedAt: new Date(),
          verifiedBy: req.principal._id
        }
      );
    }

    // Check if all documents are verified
    const documents = await AdmissionDocument.find({ admission: admissionId });
    const allVerified = documents.every(doc => doc.status !== "submitted");

    // Update form verification status
    form.documentStatus = allVerified ? "verified" : "partial";
    form.verificationStatus = "in_progress";
    await form.save();

    res.status(200).json({
      success: true,
      message: "Documents verified successfully",
      data: {
        admissionId,
        documentStatus: form.documentStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Approve admission form
export const approveAdmissionForm = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const {
      classId,
      section,
      rollNumber,
      remarks,
      feeStructureId
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    if (form.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve ${form.status} form`
      });
    }

    // Check if roll number already exists in class
    const existingStudent = await Student.findOne({
      class: classId,
      rollNumber
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists in this class"
      });
    }

    // Update form status
    form.status = "approved";
    form.approvedBy = req.principal._id;
    form.approvedAt = new Date();
    form.remarks = remarks;
    form.allocationInfo = {
      classId,
      section,
      rollNumber
    };
    await form.save();

    res.status(200).json({
      success: true,
      message: "Admission form approved successfully",
      data: {
        admissionId: form._id,
        status: form.status,
        nextStep: "Student profile creation"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Reject admission form
export const rejectAdmissionForm = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { rejectionReason } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    if (form.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject a completed admission"
      });
    }

    form.status = "rejected";
    form.rejectionReason = rejectionReason;
    form.rejectedAt = new Date();
    form.rejectedBy = req.principal._id;
    await form.save();

    res.status(200).json({
      success: true,
      message: "Admission form rejected successfully",
      data: {
        admissionId: form._id,
        status: form.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Create student profile from approved admission
export const createStudentFromAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { password } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId,
      status: "approved"
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Approved admission form not found"
      });
    }

    // Check if student already created
    if (form.studentCreated) {
      return res.status(400).json({
        success: false,
        message: "Student profile already created for this admission"
      });
    }

    // Generate student ID
    const studentCount = await Student.countDocuments({ school: schoolId });
    const studentId = `STU${new Date().getFullYear()}${String(schoolId).slice(-3)}${String(studentCount + 1).padStart(5, "0")}`;

    // Create parent user if not exists
    let parentUserId = null;
    const existingParent = await User.findOne({
      email: form.fatherInfo.email || form.motherInfo.email,
      role: "parent"
    });

    if (!existingParent) {
      const parentUser = await User.create({
        fullName: form.fatherInfo.name || form.motherInfo.name,
        email: form.fatherInfo.email || form.motherInfo.email,
        phoneNumber: form.fatherInfo.phoneNumber || form.motherInfo.phoneNumber,
        password: password || "Parent@123",
        role: "parent",
        school: schoolId
      });
      parentUserId = parentUser._id;
    } else {
      parentUserId = existingParent._id;
    }

    // Create student user
    const studentUser = await User.create({
      fullName: form.personalInfo.fullName,
      email: form.contactInfo.email,
      phoneNumber: form.contactInfo.phoneNumber,
      password: password || "Student@123",
      role: "student",
      school: schoolId
    });

    // Create student profile
    const student = await Student.create({
      userId: studentUser._id,
      school: schoolId,
      studentId,
      rollNumber: form.allocationInfo.rollNumber,
      fullName: form.personalInfo.fullName,
      email: form.contactInfo.email,
      phoneNumber: form.contactInfo.phoneNumber,
      dateOfBirth: form.personalInfo.dateOfBirth,
      gender: form.personalInfo.gender,
      bloodGroup: form.personalInfo.bloodGroup,
      category: form.personalInfo.category,
      address: form.contactInfo.address,
      city: form.contactInfo.city,
      state: form.contactInfo.state,
      pinCode: form.contactInfo.pinCode,
      fatherName: form.fatherInfo.name,
      fatherOccupation: form.fatherInfo.occupation,
      fatherPhoneNumber: form.fatherInfo.phoneNumber,
      fatherEmail: form.fatherInfo.email,
      motherName: form.motherInfo.name,
      motherOccupation: form.motherInfo.occupation,
      motherPhoneNumber: form.motherInfo.phoneNumber,
      motherEmail: form.motherInfo.email,
      guardianName: form.guardianInfo.name || null,
      guardianRelation: form.guardianInfo.relation || null,
      emergencyContact: form.emergencyContact.name,
      emergencyPhoneNumber: form.emergencyContact.phoneNumber,
      class: form.allocationInfo.classId,
      section: form.allocationInfo.section,
      parent: parentUserId,
      enrollmentDate: new Date(),
      status: "active",
      previousSchool: form.admissionInfo.previousSchool,
      previousClass: form.admissionInfo.previousClass,
      medicalInfo: {
        bloodGroup: form.personalInfo.bloodGroup,
        allergies: form.medicalInfo.allergies,
        medicalConditions: form.medicalInfo.medicalConditions
      }
    });

    // Update admission form
    form.studentCreated = true;
    form.status = "completed";
    form.studentId = student._id;
    form.completedAt = new Date();
    await form.save();

    res.status(201).json({
      success: true,
      message: "Student profile created successfully",
      data: {
        studentId: student._id,
        studentUserId: studentUser._id,
        studentNo: studentId,
        rollNumber: student.rollNumber,
        credentials: {
          email: studentUser.email,
          defaultPassword: password || "Student@123"
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Check duplicate admission
export const checkDuplicateAdmission = async (req, res) => {
  try {
    const { email, phoneNumber } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (email) {
      filter["contactInfo.email"] = email;
    }
    if (phoneNumber) {
      filter["contactInfo.phoneNumber"] = phoneNumber;
    }

    const existing = await AdmissionForm.findOne(filter);

    res.status(200).json({
      success: true,
      data: {
        isDuplicate: !!existing,
        existingForm: existing ? {
          id: existing._id,
          referenceNumber: existing.referenceNumber,
          status: existing.status,
          submittedAt: existing.submittedAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Get admission statistics
export const getAdmissionStats = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { academicYear } = req.query;

    const currentYear = academicYear || new Date().getFullYear().toString();

    const stats = await AdmissionForm.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    // Class-wise admission stats
    const classStats = await AdmissionForm.aggregate([
      {
        $match: {
          school: schoolId,
          status: "completed"
        }
      },
      {
        $group: {
          _id: "$allocationInfo.classId",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "classInfo"
        }
      },
      { $unwind: "$classInfo" },
      {
        $project: {
          _id: 0,
          className: "$classInfo.name",
          admissions: "$count"
        }
      }
    ]);

    // Gender distribution
    const genderStats = await AdmissionForm.aggregate([
      {
        $match: {
          school: schoolId,
          status: "completed"
        }
      },
      {
        $group: {
          _id: "$personalInfo.gender",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: formattedStats,
        byClass: classStats,
        byGender: genderStats,
        total: Object.values(formattedStats).reduce((a, b) => a + b, 0),
        completedAdmissions: formattedStats.completed
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Bulk admission approval
export const bulkApproveAdmissions = async (req, res) => {
  try {
    const { admissionIds, allocations } = req.body; // allocations: [{ id, classId, section, rollNumber }]
    const schoolId = req.principal.school._id || req.principal.school;

    const results = [];
    const errors = [];

    for (const allocation of allocations) {
      try {
        const form = await AdmissionForm.findOne({
          _id: allocation.id,
          school: schoolId,
          status: "pending"
        });

        if (!form) {
          errors.push(`Admission ${allocation.id}: Not found or not pending`);
          continue;
        }

        // Check roll number uniqueness
        const existing = await Student.findOne({
          class: allocation.classId,
          rollNumber: allocation.rollNumber
        });

        if (existing) {
          errors.push(`Admission ${allocation.id}: Roll number ${allocation.rollNumber} already exists`);
          continue;
        }

        form.status = "approved";
        form.approvedBy = req.principal._id;
        form.approvedAt = new Date();
        form.allocationInfo = {
          classId: allocation.classId,
          section: allocation.section,
          rollNumber: allocation.rollNumber
        };
        await form.save();

        results.push({ id: allocation.id, status: "approved" });
      } catch (error) {
        errors.push(`Admission ${allocation.id}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Processed ${results.length} admissions, ${errors.length} errors`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 11: Get admission form template
export const getAdmissionFormTemplate = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const school = await School.findById(schoolId).select("schoolName");

    const template = {
      schoolName: school.schoolName,
      sections: {
        personal: [
          { field: "fullName", type: "text", required: true },
          { field: "dateOfBirth", type: "date", required: true },
          { field: "gender", type: "select", options: ["Male", "Female", "Other"], required: true },
          { field: "bloodGroup", type: "select", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], required: false },
          { field: "category", type: "select", options: ["General", "OBC", "SC", "ST"], required: false }
        ],
        contact: [
          { field: "email", type: "email", required: true },
          { field: "phoneNumber", type: "tel", required: true },
          { field: "address", type: "textarea", required: true },
          { field: "city", type: "text", required: true },
          { field: "state", type: "text", required: true },
          { field: "pinCode", type: "number", required: true }
        ],
        parents: [
          { field: "fatherName", type: "text", required: true },
          { field: "fatherEmail", type: "email", required: false },
          { field: "motherName", type: "text", required: true },
          { field: "motherEmail", type: "email", required: false }
        ],
        admission: [
          { field: "classApplyingFor", type: "select", required: true },
          { field: "previousSchool", type: "text", required: false },
          { field: "previousClass", type: "text", required: false }
        ],
        documents: [
          { name: "Birth Certificate", required: true },
          { name: "Address Proof", required: true },
          { name: "Previous School Certificate", required: false }
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Get available classes and sections
export const getAvailableClassesForAdmission = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const classes = await Class.find({
      school: schoolId,
      isActive: true
    })
      .select("name section strength capacity")
      .lean();

    // Get current enrollment count for each class
    const classesWithCapacity = await Promise.all(
      classes.map(async (cls) => {
        const enrolledCount = await Student.countDocuments({
          class: cls._id,
          status: "active"
        });

        return {
          _id: cls._id,
          name: cls.name,
          section: cls.section,
          totalCapacity: cls.capacity || cls.strength,
          enrolledStudents: enrolledCount,
          availableSeats: (cls.capacity || cls.strength) - enrolledCount,
          hasSeatsAvailable: enrolledCount < (cls.capacity || cls.strength)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: classesWithCapacity.filter(c => c.hasSeatsAvailable)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 13: Send admission decision notification
export const sendAdmissionNotification = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { notificationType } = req.body; // approved, rejected
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    // Send email/SMS notification
    // Implementation here
    // await sendAdmissionNotificationEmail(form, notificationType);

    form.notificationSent = true;
    form.notificationSentAt = new Date();
    await form.save();

    res.status(200).json({
      success: true,
      message: `${notificationType} notification sent to applicant`,
      data: {
        admissionId,
        email: form.contactInfo.email,
        notificationType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 14: Export admission report
export const exportAdmissionReport = async (req, res) => {
  try {
    const { status, format = "csv", classId } = req.query; // format: csv, pdf
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (status && status !== "all") filter.status = status;
    if (classId) filter["allocationInfo.classId"] = classId;

    const forms = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name");

    if (format === "csv") {
      const csv = generateAdmissionCSV(forms);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="admission_report_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: forms,
        format: "pdf"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 15: Upload admission documents
export const uploadAdmissionDocuments = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { documentType, files } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    // Create document records
    const uploadedDocs = [];
    for (const file of files) {
      const doc = await AdmissionDocument.create({
        admission: admissionId,
        school: schoolId,
        documentType,
        fileUrl: file.path,
        uploadedAt: new Date(),
        status: "submitted"
      });
      uploadedDocs.push(doc);
    }

    res.status(201).json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      data: uploadedDocs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 16: Get admission by reference number
export const getAdmissionByReference = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const form = await AdmissionForm.findOne({
      referenceNumber,
      school: schoolId
    })
      .populate("admissionInfo.classApplyingFor", "name");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Admission form not found"
      });
    }

    const documents = await AdmissionDocument.find({
      admission: form._id
    });

    res.status(200).json({
      success: true,
      data: {
        ...form.toObject(),
        documents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function: Generate Admission CSV
const generateAdmissionCSV = (forms) => {
  const headers = [
    "Reference Number",
    "Applicant Name",
    "DOB",
    "Gender",
    "Email",
    "Phone",
    "Class Applying",
    "Status",
    "Submitted Date",
    "Father Name",
    "Mother Name"
  ];

  const rows = forms.map(form => [
    form.referenceNumber,
    form.personalInfo.fullName,
    new Date(form.personalInfo.dateOfBirth).toLocaleDateString(),
    form.personalInfo.gender,
    form.contactInfo.email,
    form.contactInfo.phoneNumber,
    form.admissionInfo.classApplyingFor?.name || "N/A",
    form.status,
    new Date(form.submittedAt).toLocaleDateString(),
    form.fatherInfo.name,
    form.motherInfo.name
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};
```

---

### File 2: Create `routes/principal/admissionRoutes.js`

```javascript
import express from "express";
import {
  submitAdmissionForm,
  getAllAdmissionForms,
  getAdmissionFormDetail,
  verifyAdmissionDocuments,
  approveAdmissionForm,
  rejectAdmissionForm,
  createStudentFromAdmission,
  checkDuplicateAdmission,
  getAdmissionStats,
  bulkApproveAdmissions,
  getAdmissionFormTemplate,
  getAvailableClassesForAdmission,
  sendAdmissionNotification,
  exportAdmissionReport,
  uploadAdmissionDocuments,
  getAdmissionByReference
} from "../../controllers/principal/admissionController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("principal"));

// Form operations
router.post("/submit", upload.array("documents", 10), submitAdmissionForm);
router.get("/", getAllAdmissionForms);
router.get("/stats", getAdmissionStats);
router.get("/check-duplicate", checkDuplicateAdmission);
router.get("/template", getAdmissionFormTemplate);
router.get("/available-classes", getAvailableClassesForAdmission);

// Single admission operations
router.get("/reference/:referenceNumber", getAdmissionByReference);
router.get("/:admissionId", getAdmissionFormDetail);
router.post("/:admissionId/verify-documents", verifyAdmissionDocuments);
router.post("/:admissionId/approve", approveAdmissionForm);
router.post("/:admissionId/reject", rejectAdmissionForm);
router.post("/:admissionId/create-student", createStudentFromAdmission);
router.post("/:admissionId/send-notification", sendAdmissionNotification);
router.post("/:admissionId/upload-documents", upload.array("files", 5), uploadAdmissionDocuments);

// Bulk operations
router.post("/bulk/approve", bulkApproveAdmissions);

// Export
router.get("/export/report", exportAdmissionReport);

export default router;
```

---

## MODELS NEEDED

### File 3: Create `models/academic/AdmissionForm.model.js`

```javascript
import mongoose from "mongoose";

const admissionFormSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization"
    },
    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    personalInfo: {
      fullName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
      bloodGroup: String,
      category: { type: String, enum: ["General", "OBC", "SC", "ST"] },
      religion: String,
      nationality: { type: String, default: "Indian" },
      caste: String
    },
    contactInfo: {
      email: { type: String, required: true, lowercase: true },
      phoneNumber: { type: String, required: true },
      address: String,
      city: String,
      state: String,
      pinCode: String
    },
    fatherInfo: {
      name: String,
      occupation: String,
      qualification: String,
      phoneNumber: String,
      email: String,
      annualIncome: Number
    },
    motherInfo: {
      name: String,
      occupation: String,
      qualification: String,
      phoneNumber: String,
      email: String
    },
    guardianInfo: {
      name: String,
      relation: String,
      phoneNumber: String,
      email: String
    },
    admissionInfo: {
      classApplyingFor: { type: mongoose.Schema.Types.ObjectId, ref: "Classes", required: true },
      section: String,
      previousSchool: String,
      previousClass: String,
      reasonForTransfer: String
    },
    medicalInfo: {
      allergies: String,
      medicalConditions: String,
      physicalDisability: { type: Boolean, default: false }
    },
    siblingInfo: {
      isStudentInSchool: { type: Boolean, default: false },
      siblingName: String,
      siblingClass: { type: mongoose.Schema.Types.ObjectId, ref: "Classes" }
    },
    emergencyContact: {
      name: String,
      phoneNumber: String
    },
    documents: [String],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      index: true
    },
    documentStatus: {
      type: String,
      enum: ["not_submitted", "submitted", "partial", "verified"],
      default: "not_submitted"
    },
    verificationStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started"
    },
    allocationInfo: {
      classId: mongoose.Schema.Types.ObjectId,
      section: String,
      rollNumber: Number
    },
    submittedAt: { type: Date, default: Date.now, index: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
    completedAt: Date,
    remarks: String,
    studentCreated: { type: Boolean, default: false },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: Date
  },
  { timestamps: true }
);

// Generate reference number before save
admissionFormSchema.pre("save", async function (next) {
  if (!this.referenceNumber) {
    const count = await this.constructor.countDocuments({ school: this.school });
    this.referenceNumber = `ADM${new Date().getFullYear()}${String(this.school).slice(-3)}${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

const AdmissionForm = mongoose.model("AdmissionForm", admissionFormSchema);
export default AdmissionForm;
```

---

### File 4: Create `models/academic/AdmissionDocument.model.js`

```javascript
import mongoose from "mongoose";

const admissionDocumentSchema = new mongoose.Schema(
  {
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdmissionForm",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    documentType: {
      type: String,
      enum: [
        "Birth Certificate",
        "Address Proof",
        "Previous School Certificate",
        "Aadhar Card",
        "Passport",
        "Medical Certificate",
        "Other"
      ],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: ["submitted", "verified", "rejected"],
      default: "submitted"
    },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: String
  },
  { timestamps: true }
);

const AdmissionDocument = mongoose.model("AdmissionDocument", admissionDocumentSchema);
export default AdmissionDocument;
```

---

### File 5: Create `models/users/Parent.model.js`

```javascript
import mongoose from "mongoose";

const parentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    parentType: {
      type: String,
      enum: ["father", "mother", "guardian"],
      default: "father"
    },
    occupation: String,
    qualification: String,
    annualIncome: Number,
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
      }
    ],
    address: String,
    city: String,
    state: String,
    pinCode: String,
    alternatePhoneNumber: String
  },
  { timestamps: true }
);

const Parent = mongoose.model("Parent", parentSchema);
export default Parent;
```

---

## FILE INTEGRATION

### File 6: Update `server.js`

```javascript
// Add this import
import admissionRoutes from './routes/principal/admissionRoutes.js';

// Add this route mount
app.use("/api/principal/admissions", admissionRoutes);
```

---

## DATABASE INDEXES

```javascript
// Admission forms indexes
db.admissionforms.createIndex({ school: 1, status: 1 });
db.admissionforms.createIndex({ referenceNumber: 1 });
db.admissionforms.createIndex({ "contactInfo.email": 1, school: 1 });
db.admissionforms.createIndex({ submittedAt: -1 });
db.admissionforms.createIndex({ "admissionInfo.classApplyingFor": 1 });

// Admission documents indexes
db.admissiondocuments.createIndex({ admission: 1, school: 1 });
db.admissiondocuments.createIndex({ documentType: 1 });
```

---

## API ENDPOINTS SUMMARY

### Admission Form Operations (6 endpoints)
- `POST /api/principal/admissions/submit` - Submit new admission form
- `GET /api/principal/admissions` - Get all admission forms with filters
- `GET /api/principal/admissions/:admissionId` - Get single admission details
- `GET /api/principal/admissions/reference/:referenceNumber` - Get by reference number
- `GET /api/principal/admissions/check-duplicate` - Check duplicate admission
- `GET /api/principal/admissions/template` - Get form template

### Admission Verification & Approval (6 endpoints)
- `POST /api/principal/admissions/:admissionId/verify-documents` - Verify documents
- `POST /api/principal/admissions/:admissionId/approve` - Approve admission
- `POST /api/principal/admissions/:admissionId/reject` - Reject admission
- `POST /api/principal/admissions/:admissionId/create-student` - Create student profile
- `POST /api/principal/admissions/:admissionId/send-notification` - Send decision notification
- `POST /api/principal/admissions/:admissionId/upload-documents` - Upload documents

### Admission Management (3 endpoints)
- `GET /api/principal/admissions/stats` - Get admission statistics
- `GET /api/principal/admissions/available-classes` - Get available classes
- `POST /api/principal/admissions/bulk/approve` - Bulk approve admissions

### Reporting & Export (1 endpoint)
- `GET /api/principal/admissions/export/report` - Export admission report

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Form Submission & Retrieval (Week 1)
- [ ] Create admissionController.js with functions 1-6
- [ ] Create admissionRoutes.js
- [ ] Create AdmissionForm model
- [ ] Create AdmissionDocument model
- [ ] Test form submission and retrieval

### Phase 2: Document Verification (Week 1-2)
- [ ] Implement document upload (Function 15)
- [ ] Implement document verification (Function 4)
- [ ] Implement verification workflow

### Phase 3: Approval & Rejection (Week 2)
- [ ] Implement approval workflow (Functions 5, 10)
- [ ] Implement rejection workflow (Function 6)
- [ ] Implement bulk approval (Function 10)
- [ ] Test approval/rejection flows

### Phase 4: Student Profile Creation (Week 2-3)
- [ ] Implement student creation (Function 7)
- [ ] Generate student IDs and credentials
- [ ] Create parent user accounts
- [ ] Test end-to-end admission flow

### Phase 5: Analytics & Reports (Week 3)
- [ ] Implement statistics (Function 9)
- [ ] Implement export functionality (Function 14)
- [ ] Implement class availability checker (Function 12)
- [ ] Implement duplicate checker (Function 8)

### Phase 6: Integration & Testing (Week 3-4)
- [ ] Update server.js with all routes
- [ ] Create database indexes
- [ ] Integration testing
- [ ] Error handling and validation
- [ ] API documentation
- [ ] Send notification implementation

---

## KEY FEATURES

### Admission Form Management
✅ Complete admission form submission
✅ Multi-step form with validation
✅ Duplicate applicant detection
✅ Reference number generation
✅ Form status tracking

### Document Management
✅ Multiple document upload
✅ Document verification workflow
✅ Document status tracking
✅ Automated document collection

### Approval Workflow
✅ Single admission approval/rejection
✅ Bulk admission approval
✅ Approval notifications
✅ Allocation of class and roll number

### Student Creation
✅ Automatic student profile creation
✅ User account generation (student & parent)
✅ Credential generation
✅ Enrollment status management

### Analytics & Intelligence
✅ Admission statistics by status
✅ Class-wise admission counts
✅ Gender distribution
✅ Available seats tracking
✅ Admission timeline

### Administrative Tools
✅ Duplicate admission detection
✅ Export admission reports (CSV/PDF)
✅ Form template retrieval
✅ Available class listing
✅ Admission notifications

---

## TOTAL ENDPOINTS: 26

- Form Operations: 6 endpoints
- Verification & Approval: 6 endpoints
- Management: 3 endpoints
- Analytics: 1 endpoint
- Bulk Operations: 1 endpoint
- Reporting: 1 endpoint
- Document Upload: 1 endpoint
- Special Operations: 6 endpoints (check duplicate, template, available classes, notification, reference lookup, export)

**TOTAL: 16 direct endpoints + 10 support endpoints = 26 total**

---

## WORKFLOW DIAGRAM

```
1. Applicant submits form with documents
   ↓
2. Principal reviews form (GET endpoints)
   ↓
3. Principal verifies documents
   ↓
4. Principal approves/rejects admission
   ↓
5. If approved:
   - Allocate class & roll number
   - Create student profile
   - Generate credentials
   - Send notification
   ↓
6. Admission completed
```

---

**End of Principal Admission Management Work Document**
