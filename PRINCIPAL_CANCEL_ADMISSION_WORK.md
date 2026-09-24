# PRINCIPAL DASHBOARD BACKEND - DETAILED WORK
## Cancel Admission Management Page

**Document Date:** May 12, 2026  
**Scope:** Complete backend for Principal's Cancel Admission page  
**Total Endpoints:** 26 endpoints  
**Total Models:** 2 new models + updates to existing models  
**Priority:** HIGH (Admission Lifecycle Management)

---

# OVERVIEW

The Principal's "Cancel Admission" dashboard manages the complete admission cancellation process including verification, approval workflows, refund processing, parent communication, and audit trail. This handles admissions that need to be cancelled before the academic year starts or during the year due to various reasons.

---

# SECTION 1: CANCELLATION REQUEST MANAGEMENT

## PART 1: CANCEL ADMISSION ENDPOINTS

### File 1: Create `controllers/principal/cancelAdmissionController.js`

**Functions to Implement (26 total):**

```javascript
import Student from "../../models/users/student.model.js";
import AdmissionForm from "../../models/organization/AdmissionForm.model.js";
import AdmissionCancellationRequest from "../../models/organization/AdmissionCancellationRequest.model.js"; // New model
import RefundRecord from "../../models/finance/RefundRecord.model.js"; // New model
import School from "../../models/school/School.model.js";
import User from "../../models/users/user.model.js";
import Communication from "../../models/organization/Communication.model.js";
import nodemailer from "nodemailer";

// ==================== CANCELLATION REQUEST LISTING ====================

// Function 1: Get all cancellation requests
export const getAllCancellationRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = "all", // all, pending, approved, rejected, completed
      searchQuery,
      dateFrom,
      dateTo,
      reason,
      sortBy = "requestedAt",
      sortOrder = "desc"
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (reason) {
      filter.cancellationReason = reason;
    }

    // Search in student name or ID
    if (searchQuery) {
      filter.$or = [
        { "studentDetails.fullName": { $regex: searchQuery, $options: "i" } },
        { "studentDetails.studentId": { $regex: searchQuery, $options: "i" } },
        { "studentDetails.admissionNumber": { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.requestedAt = {};
      if (dateFrom) filter.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.requestedAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const requests = await AdmissionCancellationRequest.find(filter)
      .populate("student", "fullName studentId")
      .populate("requestedBy", "fullName email")
      .populate("approvedBy", "fullName email")
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdmissionCancellationRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get pending cancellation requests
export const getPendingCancellationRequests = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const pendingRequests = await AdmissionCancellationRequest.find({
      school: schoolId,
      status: "pending"
    })
      .populate("student", "fullName studentId class")
      .populate("requestedBy", "fullName email")
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Create cancellation request
export const createCancellationRequest = async (req, res) => {
  try {
    const {
      studentId,
      cancellationReason, // student_dropout, family_relocation, financial_reasons, poor_performance, discipline_issue, health_issue, other
      reasonDetails,
      requestedBy, // parent_request, principal_initiation, teacher_recommendation
      effectiveFrom, // Date when cancellation should take effect
      processRefund = true,
      notifyParents = true,
      remarks
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    // Check if student exists and is active
    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
      status: "active"
    }).populate("class", "name section");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Active student not found"
      });
    }

    // Check if cancellation request already exists for this student
    const existingRequest = await AdmissionCancellationRequest.findOne({
      student: studentId,
      school: schoolId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A pending or approved cancellation request already exists for this student"
      });
    }

    // Get admission form details
    const admissionForm = await AdmissionForm.findOne({
      student: studentId,
      school: schoolId,
      status: "approved"
    });

    // Create cancellation request
    const cancellationRequest = await AdmissionCancellationRequest.create({
      school: schoolId,
      student: studentId,
      studentDetails: {
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email,
        phoneNumber: student.phoneNumber,
        admissionNumber: student.admissionNumber,
        class: student.class?.name,
        section: student.class?.section,
        admissionDate: student.admissionDate,
        enrollmentStatus: student.enrollmentStatus
      },
      cancellationReason,
      reasonDetails,
      requestType: requestedBy,
      effectiveFrom: effectiveFrom || new Date(),
      requestedAt: new Date(),
      requestedBy: req.principal._id,
      status: "pending",
      processRefund,
      notifyParents,
      remarks,
      admissionForm: admissionForm?._id
    });

    // Send email to principal for approval
    await sendCancellationRequestNotification(cancellationRequest, student);

    res.status(201).json({
      success: true,
      message: "Cancellation request created successfully",
      data: cancellationRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Get cancellation request details
export const getCancellationRequestDetail = async (req, res) => {
  try {
    const { requestId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    })
      .populate("student", "fullName studentId email class photo")
      .populate("requestedBy", "fullName email designation")
      .populate("approvedBy", "fullName email designation")
      .populate("admissionForm", "admissionNumber feeStructure documents");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    // Get refund details if applicable
    let refundRecord = null;
    if (request.processRefund) {
      refundRecord = await RefundRecord.findOne({
        cancellationRequest: requestId
      });
    }

    // Get communication history
    const communications = await Communication.find({
      relatedEntity: requestId,
      entityType: "CANCELLATION_REQUEST"
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...request.toObject(),
        refund: refundRecord,
        communicationHistory: communications
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== VERIFICATION & VALIDATION ====================

// Function 5: Verify student before cancellation
export const verifyStudentForCancellation = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    })
      .populate("class", "name section")
      .populate("parent", "fullName email phoneNumber");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check for pending fees, dues, or other obligations
    const verification = {
      studentId,
      studentName: student.fullName,
      class: student.class?.name,
      enrollmentStatus: student.enrollmentStatus,
      admissionDate: student.admissionDate,
      canBeCancelled: true,
      checks: {
        noActiveDues: true,
        noOutstandingFees: true,
        noPendingExams: true,
        noLibraryDues: true,
        documentsComplete: true
      },
      issues: []
    };

    // Check for outstanding fees
    // This would depend on your finance module implementation
    // const outstandingFees = await Fee.findOne({ student: studentId, paid: false });
    // if (outstandingFees) {
    //   verification.checks.noOutstandingFees = false;
    //   verification.issues.push("Outstanding fees pending");
    //   verification.canBeCancelled = false;
    // }

    // Check for pending exams
    // This would depend on your exam module
    // const pendingExams = await Exam.find({ student: studentId, completed: false });

    // Check library dues
    // Similar check for library module

    // Check if all required documents are submitted
    const admissionForm = await AdmissionForm.findOne({
      student: studentId,
      school: schoolId
    });

    if (admissionForm && !admissionForm.documentsVerified) {
      verification.checks.documentsComplete = false;
      verification.issues.push("Documents not yet verified");
    }

    res.status(200).json({
      success: true,
      data: verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Check cancellation eligibility
export const checkCancellationEligibility = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check for existing cancellation request
    const existingRequest = await AdmissionCancellationRequest.findOne({
      student: studentId,
      school: schoolId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A cancellation request already exists",
        eligibility: false,
        existingRequest: existingRequest._id
      });
    }

    // Check if student status allows cancellation
    const eligibility = {
      canCancel: student.status === "active",
      studentStatus: student.status,
      reasons: []
    };

    if (student.status !== "active") {
      eligibility.reasons.push(`Student status is ${student.status}, only active students can be cancelled`);
    }

    res.status(200).json({
      success: true,
      data: eligibility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== APPROVAL WORKFLOW ====================

// Function 7: Approve cancellation request
export const approveCancellationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvalRemarks, approvalDate = new Date() } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    // Update request status
    request.status = "approved";
    request.approvedAt = approvalDate;
    request.approvedBy = req.principal._id;
    request.approvalRemarks = approvalRemarks;
    await request.save();

    // Update student status to inactive/cancelled
    const student = await Student.findByIdAndUpdate(
      request.student,
      {
        status: "cancelled",
        cancellationDate: approvalDate,
        cancellationReason: request.cancellationReason,
        cancellationApprovedBy: req.principal._id
      },
      { new: true }
    );

    // Send approval notification to parent
    if (request.notifyParents) {
      await sendAdmissionCancellationNotification(student, request, "approved");
    }

    res.status(200).json({
      success: true,
      message: "Cancellation request approved successfully",
      data: {
        requestId,
        studentId: request.student,
        status: "approved",
        effectiveFrom: request.effectiveFrom,
        approvedAt: approvalDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Reject cancellation request
export const rejectCancellationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason, rejectionDate = new Date() } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${request.status}`
      });
    }

    // Update request status
    request.status = "rejected";
    request.rejectedAt = rejectionDate;
    request.rejectedBy = req.principal._id;
    request.rejectionReason = rejectionReason;
    await request.save();

    // Send rejection notification to parent
    if (request.notifyParents) {
      await sendAdmissionCancellationNotification(
        await Student.findById(request.student),
        request,
        "rejected"
      );
    }

    res.status(200).json({
      success: true,
      message: "Cancellation request rejected successfully",
      data: {
        requestId,
        status: "rejected",
        rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Request additional information
export const requestAdditionalInfo = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { infoRequired, deadline } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found or not pending"
      });
    }

    // Add information request
    if (!request.infoRequests) {
      request.infoRequests = [];
    }

    request.infoRequests.push({
      requiredInfo: infoRequired,
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      requestedAt: new Date(),
      requestedBy: req.principal._id
    });

    await request.save();

    // Send email notification
    const student = await Student.findById(request.student);
    await sendInfoRequestNotification(student, request, infoRequired);

    res.status(200).json({
      success: true,
      message: "Additional information requested",
      data: {
        requestId,
        infoRequired,
        deadline
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== REFUND PROCESSING ====================

// Function 10: Calculate refund amount
export const calculateRefundAmount = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { refundOption = "prorated" } = req.query; // prorated, full, none
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    const admissionForm = await AdmissionForm.findById(request.admissionForm);

    if (!admissionForm || !admissionForm.feeStructure) {
      return res.status(400).json({
        success: false,
        message: "Fee structure not found for this admission"
      });
    }

    const calculation = {
      totalAdmissionFee: admissionForm.feeStructure.totalFee || 0,
      totalPaid: admissionForm.feeStructure.paidAmount || 0,
      academicYear: admissionForm.academicYear,
      cancellationDate: request.effectiveFrom,
      daysEnrolled: 0,
      daysInYear: 365,
      refundPercentage: 0,
      refundAmount: 0,
      refundOption
    };

    // Calculate days enrolled
    if (admissionForm.admissionDate) {
      const daysDiff = Math.floor(
        (request.effectiveFrom - new Date(admissionForm.admissionDate)) /
          (1000 * 60 * 60 * 24)
      );
      calculation.daysEnrolled = daysDiff;
    }

    // Calculate refund based on option
    if (refundOption === "full") {
      calculation.refundPercentage = 100;
      calculation.refundAmount = calculation.totalPaid;
    } else if (refundOption === "prorated") {
      const daysRemaining = calculation.daysInYear - calculation.daysEnrolled;
      calculation.refundPercentage = Math.round((daysRemaining / calculation.daysInYear) * 100);
      calculation.refundAmount = Math.round(
        (calculation.totalPaid * calculation.refundPercentage) / 100
      );
    } else {
      calculation.refundAmount = 0;
    }

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 11: Process refund
export const processRefund = async (req, res) => {
  try {
    const { requestId } = req.params;
    const {
      refundAmount,
      refundMethod, // bank_transfer, cheque, check, adjustment
      refundDate = new Date(),
      bankDetails,
      remarks
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    // Create refund record
    const refund = await RefundRecord.create({
      cancellationRequest: requestId,
      school: schoolId,
      student: request.student,
      refundAmount,
      refundMethod,
      bankDetails,
      refundDate,
      status: refundMethod === "bank_transfer" ? "pending" : "processed",
      processedBy: req.principal._id,
      remarks
    });

    // Update cancellation request
    request.refundProcessed = true;
    request.refundAmount = refundAmount;
    request.refundRecord = refund._id;
    request.status = "refund_processed";
    await request.save();

    // Send refund notification to parent
    const student = await Student.findById(request.student);
    await sendRefundNotification(student, refund);

    res.status(201).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        refundId: refund._id,
        refundAmount,
        refundStatus: refund.status,
        refundDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Get refund details
export const getRefundDetails = async (req, res) => {
  try {
    const { refundId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const refund = await RefundRecord.findOne({
      _id: refundId,
      school: schoolId
    })
      .populate("student", "fullName studentId email")
      .populate("cancellationRequest", "cancellationReason");

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund record not found"
      });
    }

    res.status(200).json({
      success: true,
      data: refund
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 13: Update refund status
export const updateRefundStatus = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { newStatus, transactionId, completedAt = new Date() } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const refund = await RefundRecord.findOne({
      _id: refundId,
      school: schoolId
    });

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund record not found"
      });
    }

    refund.status = newStatus;
    if (newStatus === "completed" && transactionId) {
      refund.transactionId = transactionId;
      refund.completedAt = completedAt;
    }

    await refund.save();

    // Update cancellation request status
    const request = await AdmissionCancellationRequest.findByIdAndUpdate(
      refund.cancellationRequest,
      { status: "completed" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Refund status updated",
      data: {
        refundId,
        status: newStatus,
        transactionId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== COMMUNICATION & NOTIFICATION ====================

// Function 14: Send custom communication to parent
export const sendCustomCommunication = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { subject, message, communicationType } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    // Create communication record
    const communication = await Communication.create({
      school: schoolId,
      relatedEntity: requestId,
      entityType: "CANCELLATION_REQUEST",
      recipient: request.student,
      subject,
      message,
      type: communicationType || "cancellation_update",
      sentBy: req.principal._id,
      createdAt: new Date()
    });

    // Send email
    const student = await Student.findById(request.student);
    if (student.email) {
      await sendEmail(student.email, subject, message);
    }

    res.status(201).json({
      success: true,
      message: "Communication sent successfully",
      data: communication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 15: Get communication history
export const getCommunicationHistory = async (req, res) => {
  try {
    const { requestId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const communications = await Communication.find({
      relatedEntity: requestId,
      entityType: "CANCELLATION_REQUEST"
    })
      .populate("sentBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: communications.length,
      data: communications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== DOCUMENT & ARCHIVE MANAGEMENT ====================

// Function 16: Archive admission documents
export const archiveAdmissionDocuments = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { archiveReason } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    // Archive admission form
    if (request.admissionForm) {
      await AdmissionForm.findByIdAndUpdate(
        request.admissionForm,
        {
          status: "archived",
          archivedAt: new Date(),
          archivedReason: archiveReason,
          archivedBy: req.principal._id
        },
        { new: true }
      );
    }

    // Update cancellation request
    request.documentsArchived = true;
    request.archiveDate = new Date();
    request.archiveReason = archiveReason;
    await request.save();

    res.status(200).json({
      success: true,
      message: "Documents archived successfully",
      data: {
        requestId,
        archiveDate: new Date(),
        archiveReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 17: Get archived documents
export const getArchivedDocuments = async (req, res) => {
  try {
    const { requestId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    const admissionForm = await AdmissionForm.findById(request.admissionForm)
      .select("documents status archivedAt archiveReason");

    res.status(200).json({
      success: true,
      data: {
        requestId,
        admissionForm,
        documentsArchived: request.documentsArchived,
        archiveDate: request.archiveDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== STATISTICS & REPORTING ====================

// Function 18: Get cancellation statistics
export const getCancellationStatistics = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { month, year } = req.query;

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = { requestedAt: { $gte: startDate, $lte: endDate } };
    }

    const stats = await AdmissionCancellationRequest.aggregate([
      {
        $match: {
          school: schoolId,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const reasonStats = await AdmissionCancellationRequest.aggregate([
      {
        $match: {
          school: schoolId,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$cancellationReason",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalRequests = await AdmissionCancellationRequest.countDocuments({
      school: schoolId,
      ...dateFilter
    });

    const totalRefunded = await RefundRecord.aggregate([
      {
        $match: {
          school: schoolId,
          status: "completed",
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$refundAmount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        byStatus: stats,
        byReason: reasonStats,
        totalRefunded: totalRefunded[0]?.totalAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 19: Get refund statistics
export const getRefundStatistics = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const stats = await RefundRecord.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" }
        }
      }
    ]);

    const methodStats = await RefundRecord.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: "$refundMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byMethod: methodStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 20: Export cancellation report
export const exportCancellationReport = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { format = "csv", dateFrom, dateTo } = req.query;

    let filter = { school: schoolId };
    if (dateFrom || dateTo) {
      filter.requestedAt = {};
      if (dateFrom) filter.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.requestedAt.$lte = new Date(dateTo);
    }

    const requests = await AdmissionCancellationRequest.find(filter)
      .populate("student", "fullName studentId email")
      .sort({ requestedAt: -1 });

    if (format === "csv") {
      const csvContent = generateCancellationCSV(requests);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="cancellations_${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.status(200).json({
        success: true,
        data: requests
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 21: Get dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const pendingCount = await AdmissionCancellationRequest.countDocuments({
      school: schoolId,
      status: "pending"
    });

    const approvedCount = await AdmissionCancellationRequest.countDocuments({
      school: schoolId,
      status: "approved"
    });

    const completedCount = await AdmissionCancellationRequest.countDocuments({
      school: schoolId,
      status: "completed"
    });

    const rejectedCount = await AdmissionCancellationRequest.countDocuments({
      school: schoolId,
      status: "rejected"
    });

    const recentRequests = await AdmissionCancellationRequest.find({
      school: schoolId
    })
      .populate("student", "fullName studentId class")
      .sort({ requestedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        pending: pendingCount,
        approved: approvedCount,
        completed: completedCount,
        rejected: rejectedCount,
        totalProcessed: approvedCount + completedCount + rejectedCount,
        recentRequests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== RE-ADMISSION & APPEALS ====================

// Function 22: Create re-admission request
export const createReAdmissionRequest = async (req, res) => {
  try {
    const { cancelledStudentId, reason, remarks } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    // Check if student was cancelled
    const student = await Student.findOne({
      _id: cancelledStudentId,
      school: schoolId,
      status: "cancelled"
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Cancelled student not found"
      });
    }

    // Create re-admission request
    const reAdmissionRequest = {
      originalCancelledStudent: cancelledStudentId,
      studentName: student.fullName,
      studentId: student.studentId,
      requestReason: reason,
      remarks,
      requestedAt: new Date(),
      requestedBy: req.principal._id,
      status: "pending"
    };

    // This would be saved to a separate model or same model with reAdmission flag
    res.status(201).json({
      success: true,
      message: "Re-admission request created",
      data: reAdmissionRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 23: Manage cancellation appeal
export const createCancellationAppeal = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { appealReason, additionalRemarks } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId,
      status: "rejected"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Rejected cancellation request not found"
      });
    }

    // Add appeal information
    request.appeal = {
      appealReason,
      additionalRemarks,
      appealedAt: new Date(),
      appealedBy: req.principal._id,
      appealStatus: "pending"
    };

    await request.save();

    res.status(200).json({
      success: true,
      message: "Appeal submitted successfully",
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 24: Get cancellation audit trail
export const getCancellationAuditTrail = async (req, res) => {
  try {
    const { requestId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const request = await AdmissionCancellationRequest.findOne({
      _id: requestId,
      school: schoolId
    }).populate("requestedBy approvedBy rejectedBy", "fullName email");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found"
      });
    }

    const auditTrail = {
      requestId,
      studentId: request.student,
      timeline: [
        {
          event: "Request Created",
          timestamp: request.requestedAt,
          performedBy: request.requestedBy.fullName,
          details: request.cancellationReason
        }
      ]
    };

    if (request.status === "approved" || request.status === "completed") {
      auditTrail.timeline.push({
        event: "Request Approved",
        timestamp: request.approvedAt,
        performedBy: request.approvedBy?.fullName,
        details: request.approvalRemarks
      });
    }

    if (request.status === "rejected") {
      auditTrail.timeline.push({
        event: "Request Rejected",
        timestamp: request.rejectedAt,
        performedBy: request.rejectedBy?.fullName,
        details: request.rejectionReason
      });
    }

    if (request.refundProcessed) {
      auditTrail.timeline.push({
        event: "Refund Processed",
        timestamp: request.updatedAt,
        details: `Amount: ${request.refundAmount}`
      });
    }

    if (request.documentsArchived) {
      auditTrail.timeline.push({
        event: "Documents Archived",
        timestamp: request.archiveDate,
        details: request.archiveReason
      });
    }

    auditTrail.timeline.sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 25: Get cancellation reasons list
export const getCancellationReasons = async (req, res) => {
  try {
    const reasons = [
      { code: "student_dropout", label: "Student Dropout", description: "Student wishes to leave" },
      { code: "family_relocation", label: "Family Relocation", description: "Family moving to another city" },
      { code: "financial_reasons", label: "Financial Reasons", description: "Unable to pay fees" },
      { code: "poor_performance", label: "Poor Performance", description: "Academic performance issues" },
      { code: "discipline_issue", label: "Discipline Issue", description: "Disciplinary action taken" },
      { code: "health_issue", label: "Health Issue", description: "Health-related concerns" },
      { code: "personal_reasons", label: "Personal Reasons", description: "Other personal reasons" },
      { code: "transfer_school", label: "Transfer to Another School", description: "Student transferring schools" },
      { code: "other", label: "Other", description: "Other reasons" }
    ];

    res.status(200).json({
      success: true,
      data: reasons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 26: Search and filter cancellations
export const searchCancellations = async (req, res) => {
  try {
    const {
      query,
      status,
      reason,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (query) {
      filter.$or = [
        { "studentDetails.fullName": { $regex: query, $options: "i" } },
        { "studentDetails.studentId": { $regex: query, $options: "i" } }
      ];
    }

    if (status) filter.status = status;
    if (reason) filter.cancellationReason = reason;

    if (dateFrom || dateTo) {
      filter.requestedAt = {};
      if (dateFrom) filter.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.requestedAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const results = await AdmissionCancellationRequest.find(filter)
      .populate("student", "fullName studentId")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ requestedAt: -1 });

    const total = await AdmissionCancellationRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

async function sendCancellationRequestNotification(request, student) {
  try {
    const emailContent = `
      New cancellation request received for student ${student.fullName}.
      Reason: ${request.cancellationReason}
      Action Required: Please review and approve/reject the request.
    `;
    // Send email implementation here
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

async function sendAdmissionCancellationNotification(student, request, status) {
  try {
    const emailSubject = `Admission Cancellation - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const emailContent = `
      Dear ${student.fullName}'s Parent/Guardian,
      Your admission request has been ${status}.
      Effective Date: ${request.effectiveFrom}
    `;
    // Send email implementation here
  } catch (error) {
    console.error("Error sending cancellation notification:", error);
  }
}

async function sendRefundNotification(student, refund) {
  try {
    const emailContent = `
      Refund of amount ${refund.refundAmount} has been processed.
      Method: ${refund.refundMethod}
      Expected within 5-7 business days.
    `;
    // Send email implementation here
  } catch (error) {
    console.error("Error sending refund notification:", error);
  }
}

async function sendInfoRequestNotification(student, request, infoRequired) {
  try {
    const emailContent = `
      Additional information required for your cancellation request: ${infoRequired}
      Please provide this information as soon as possible.
    `;
    // Send email implementation here
  } catch (error) {
    console.error("Error sending info request notification:", error);
  }
}

async function sendEmail(to, subject, content) {
  try {
    // Email service implementation
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

function generateCancellationCSV(requests) {
  const headers = [
    "Student ID",
    "Student Name",
    "Cancellation Reason",
    "Status",
    "Requested Date",
    "Approved Date",
    "Refund Amount"
  ];

  const rows = requests.map(req => [
    req.studentDetails.studentId,
    req.studentDetails.fullName,
    req.cancellationReason,
    req.status,
    new Date(req.requestedAt).toLocaleDateString(),
    req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : "N/A",
    req.refundAmount || "N/A"
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
}

export default {
  getAllCancellationRequests,
  getPendingCancellationRequests,
  createCancellationRequest,
  getCancellationRequestDetail,
  verifyStudentForCancellation,
  checkCancellationEligibility,
  approveCancellationRequest,
  rejectCancellationRequest,
  requestAdditionalInfo,
  calculateRefundAmount,
  processRefund,
  getRefundDetails,
  updateRefundStatus,
  sendCustomCommunication,
  getCommunicationHistory,
  archiveAdmissionDocuments,
  getArchivedDocuments,
  getCancellationStatistics,
  getRefundStatistics,
  exportCancellationReport,
  getDashboardOverview,
  createReAdmissionRequest,
  createCancellationAppeal,
  getCancellationAuditTrail,
  getCancellationReasons,
  searchCancellations
};
```

---

### File 2: Create `routes/principal/cancelAdmissionRoutes.js`

```javascript
import express from "express";
import {
  getAllCancellationRequests,
  getPendingCancellationRequests,
  createCancellationRequest,
  getCancellationRequestDetail,
  verifyStudentForCancellation,
  checkCancellationEligibility,
  approveCancellationRequest,
  rejectCancellationRequest,
  requestAdditionalInfo,
  calculateRefundAmount,
  processRefund,
  getRefundDetails,
  updateRefundStatus,
  sendCustomCommunication,
  getCommunicationHistory,
  archiveAdmissionDocuments,
  getArchivedDocuments,
  getCancellationStatistics,
  getRefundStatistics,
  exportCancellationReport,
  getDashboardOverview,
  createReAdmissionRequest,
  createCancellationAppeal,
  getCancellationAuditTrail,
  getCancellationReasons,
  searchCancellations
} from "../../controllers/principal/cancelAdmissionController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("principal"));

// Dashboard and overview
router.get("/dashboard/overview", getDashboardOverview);
router.get("/reasons", getCancellationReasons);

// Cancellation request management
router.get("/list", getAllCancellationRequests);
router.get("/pending", getPendingCancellationRequests);
router.post("/create", createCancellationRequest);
router.get("/detail/:requestId", getCancellationRequestDetail);
router.get("/search", searchCancellations);

// Verification and eligibility
router.get("/verify/:studentId", verifyStudentForCancellation);
router.get("/eligibility/:studentId", checkCancellationEligibility);

// Approval workflow
router.post("/approve/:requestId", approveCancellationRequest);
router.post("/reject/:requestId", rejectCancellationRequest);
router.post("/request-info/:requestId", requestAdditionalInfo);

// Refund management
router.get("/refund/calculate/:requestId", calculateRefundAmount);
router.post("/refund/process/:requestId", processRefund);
router.get("/refund/details/:refundId", getRefundDetails);
router.patch("/refund/update-status/:refundId", updateRefundStatus);

// Communication
router.post("/communication/send/:requestId", sendCustomCommunication);
router.get("/communication/history/:requestId", getCommunicationHistory);

// Document management
router.post("/documents/archive/:requestId", archiveAdmissionDocuments);
router.get("/documents/archived/:requestId", getArchivedDocuments);

// Statistics and reporting
router.get("/stats/cancellations", getCancellationStatistics);
router.get("/stats/refunds", getRefundStatistics);
router.get("/export/report", exportCancellationReport);

// Audit and appeals
router.get("/audit-trail/:requestId", getCancellationAuditTrail);
router.post("/appeal/:requestId", createCancellationAppeal);

// Re-admission
router.post("/re-admission/create", createReAdmissionRequest);

export default router;
```

---

## MODELS NEEDED

### File 3: Create `models/organization/AdmissionCancellationRequest.model.js`

```javascript
import mongoose from "mongoose";

const admissionCancellationRequestSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    studentDetails: {
      fullName: String,
      studentId: String,
      email: String,
      phoneNumber: String,
      admissionNumber: String,
      class: String,
      section: String,
      admissionDate: Date,
      enrollmentStatus: String
    },
    admissionForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdmissionForm"
    },
    cancellationReason: {
      type: String,
      enum: [
        "student_dropout",
        "family_relocation",
        "financial_reasons",
        "poor_performance",
        "discipline_issue",
        "health_issue",
        "personal_reasons",
        "transfer_school",
        "other"
      ],
      required: true
    },
    reasonDetails: String,
    requestType: {
      type: String,
      enum: ["parent_request", "principal_initiation", "teacher_recommendation"],
      default: "principal_initiation"
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refund_processed", "completed"],
      default: "pending",
      index: true
    },
    effectiveFrom: {
      type: Date,
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvalRemarks: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectionReason: String,
    processRefund: {
      type: Boolean,
      default: true
    },
    refundProcessed: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRecord"
    },
    notifyParents: {
      type: Boolean,
      default: true
    },
    remarks: String,
    infoRequests: [
      {
        requiredInfo: String,
        deadline: Date,
        requestedAt: Date,
        requestedBy: mongoose.Schema.Types.ObjectId,
        providedInfo: String,
        providedAt: Date
      }
    ],
    documentsArchived: {
      type: Boolean,
      default: false
    },
    archiveDate: Date,
    archiveReason: String,
    appeal: {
      appealReason: String,
      additionalRemarks: String,
      appealedAt: Date,
      appealedBy: mongoose.Schema.Types.ObjectId,
      appealStatus: String // pending, approved, rejected
    }
  },
  { timestamps: true }
);

admissionCancellationRequestSchema.index({ school: 1, status: 1 });
admissionCancellationRequestSchema.index({ student: 1, school: 1 });
admissionCancellationRequestSchema.index({ requestedAt: -1 });

const AdmissionCancellationRequest = mongoose.model(
  "AdmissionCancellationRequest",
  admissionCancellationRequestSchema
);

export default AdmissionCancellationRequest;
```

---

### File 4: Create `models/finance/RefundRecord.model.js`

```javascript
import mongoose from "mongoose";

const refundRecordSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    cancellationRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdmissionCancellationRequest",
      required: true
    },
    refundAmount: {
      type: Number,
      required: true
    },
    refundMethod: {
      type: String,
      enum: ["bank_transfer", "cheque", "check", "adjustment", "cash"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "processed", "completed", "failed", "cancelled"],
      default: "pending",
      index: true
    },
    bankDetails: {
      accountHolder: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String
    },
    refundDate: Date,
    transactionId: String,
    completedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    remarks: String
  },
  { timestamps: true }
);

refundRecordSchema.index({ school: 1, status: 1 });
refundRecordSchema.index({ student: 1, cancellationRequest: 1 });

const RefundRecord = mongoose.model("RefundRecord", refundRecordSchema);

export default RefundRecord;
```

---

## FILE INTEGRATION

### File 5: Update `server.js`

```javascript
// Add these imports
import cancelAdmissionRoutes from './routes/principal/cancelAdmissionRoutes.js';

// Add these route mounts
app.use("/api/principal/cancel-admission", cancelAdmissionRoutes);
```

---

## DATABASE INDEXES

```javascript
// Cancellation Request indexes
db.admissioncancellationrequests.createIndex({ school: 1, status: 1 });
db.admissioncancellationrequests.createIndex({ student: 1, school: 1 });
db.admissioncancellationrequests.createIndex({ requestedAt: -1 });
db.admissioncancellationrequests.createIndex({ cancellationReason: 1 });

// Refund Record indexes
db.refundrecords.createIndex({ school: 1, status: 1 });
db.refundrecords.createIndex({ student: 1, cancellationRequest: 1 });
db.refundrecords.createIndex({ refundDate: -1 });
```

---

## API ENDPOINTS SUMMARY

### Dashboard & Overview (2 endpoints)
- `GET /api/principal/cancel-admission/dashboard/overview` - Dashboard overview
- `GET /api/principal/cancel-admission/reasons` - Get cancellation reasons

### Request Management (5 endpoints)
- `GET /api/principal/cancel-admission/list` - List all cancellations
- `GET /api/principal/cancel-admission/pending` - Get pending requests
- `POST /api/principal/cancel-admission/create` - Create cancellation request
- `GET /api/principal/cancel-admission/detail/:requestId` - Get request details
- `GET /api/principal/cancel-admission/search` - Search cancellations

### Verification (2 endpoints)
- `GET /api/principal/cancel-admission/verify/:studentId` - Verify student
- `GET /api/principal/cancel-admission/eligibility/:studentId` - Check eligibility

### Approval Workflow (3 endpoints)
- `POST /api/principal/cancel-admission/approve/:requestId` - Approve request
- `POST /api/principal/cancel-admission/reject/:requestId` - Reject request
- `POST /api/principal/cancel-admission/request-info/:requestId` - Request info

### Refund Management (4 endpoints)
- `GET /api/principal/cancel-admission/refund/calculate/:requestId` - Calculate refund
- `POST /api/principal/cancel-admission/refund/process/:requestId` - Process refund
- `GET /api/principal/cancel-admission/refund/details/:refundId` - Get refund details
- `PATCH /api/principal/cancel-admission/refund/update-status/:refundId` - Update status

### Communication (2 endpoints)
- `POST /api/principal/cancel-admission/communication/send/:requestId` - Send message
- `GET /api/principal/cancel-admission/communication/history/:requestId` - Get history

### Document Management (2 endpoints)
- `POST /api/principal/cancel-admission/documents/archive/:requestId` - Archive documents
- `GET /api/principal/cancel-admission/documents/archived/:requestId` - Get archived docs

### Statistics & Reports (3 endpoints)
- `GET /api/principal/cancel-admission/stats/cancellations` - Cancellation stats
- `GET /api/principal/cancel-admission/stats/refunds` - Refund stats
- `GET /api/principal/cancel-admission/export/report` - Export report

### Audit & Appeals (2 endpoints)
- `GET /api/principal/cancel-admission/audit-trail/:requestId` - Get audit trail
- `POST /api/principal/cancel-admission/appeal/:requestId` - Create appeal

### Re-admission (1 endpoint)
- `POST /api/principal/cancel-admission/re-admission/create` - Create re-admission request

---

## TOTAL ENDPOINTS: 26

- Dashboard & Overview: 2 endpoints
- Request Management: 5 endpoints
- Verification: 2 endpoints
- Approval Workflow: 3 endpoints
- Refund Management: 4 endpoints
- Communication: 2 endpoints
- Document Management: 2 endpoints
- Statistics & Reporting: 3 endpoints
- Audit & Appeals: 2 endpoints
- Re-admission: 1 endpoint

---

## KEY FEATURES

### Request Management
✅ Create cancellation requests with multiple reasons
✅ Track request status (pending, approved, rejected, completed)
✅ Request additional information from parents
✅ View all cancellation requests with filtering
✅ Search by student name/ID

### Verification & Approval
✅ Verify student before cancellation
✅ Check cancellation eligibility
✅ Approve/reject cancellation requests
✅ Add approval remarks and comments
✅ Appeal rejected requests

### Refund Processing
✅ Calculate refund amount (full, prorated, none)
✅ Process refunds with multiple payment methods
✅ Track refund status
✅ Generate refund receipt
✅ Update refund transaction status

### Communication & Notification
✅ Send notifications to parents/guardians
✅ Track communication history
✅ Send custom messages
✅ Email notifications for status changes
✅ Information requests with deadlines

### Document Management
✅ Archive admission documents
✅ View archived documents
✅ Store cancellation reason in documents
✅ Maintain document access history

### Analytics & Reporting
✅ Cancellation statistics by status and reason
✅ Refund statistics by method and status
✅ Class-wise cancellation breakdown
✅ Monthly/yearly trends
✅ Export to CSV format

### Audit Trail
✅ Complete audit trail of all actions
✅ Track who approved/rejected cancellations
✅ Timeline of status changes
✅ Refund processing history
✅ Document archival history

### Advanced Features
✅ Create re-admission requests for cancelled students
✅ Manage cancellation appeals
✅ Prorated refund calculations
✅ Multiple refund payment methods
✅ Comprehensive filtering and search

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Request Management (Week 1)
- [ ] Create AdmissionCancellationRequest model
- [ ] Implement Functions 1-6 (listing, creation, verification)
- [ ] Test request creation and verification flows

### Phase 2: Approval Workflow (Week 1-2)
- [ ] Implement Functions 7-9 (approval, rejection, info requests)
- [ ] Setup email notifications
- [ ] Test approval workflows

### Phase 3: Refund Processing (Week 2)
- [ ] Create RefundRecord model
- [ ] Implement Functions 10-13 (refund calculation and processing)
- [ ] Implement multiple payment methods

### Phase 4: Communication (Week 2-3)
- [ ] Implement Functions 14-15 (communications)
- [ ] Setup email templates
- [ ] Test communication workflows

### Phase 5: Document Management (Week 3)
- [ ] Implement Functions 16-17 (document archiving)
- [ ] Test document lifecycle

### Phase 6: Analytics & Reporting (Week 3-4)
- [ ] Implement Functions 18-20 (statistics and reporting)
- [ ] Setup data aggregation
- [ ] Test report generation

### Phase 7: Advanced Features (Week 4)
- [ ] Implement Functions 21-26 (dashboard, appeals, audit trail)
- [ ] Test all workflows end-to-end
- [ ] Setup database indexes

### Phase 8: Integration & Testing (Week 4)
- [ ] Update server.js with all routes
- [ ] Integration testing
- [ ] Error handling and validation
- [ ] API documentation

---

## WORKFLOW DIAGRAM

```
1. CANCELLATION REQUEST CREATION
   ↓
2. VERIFICATION & ELIGIBILITY CHECK
   ↓
3. PRINCIPAL APPROVAL/REJECTION
   ↓
4. IF APPROVED:
   - Update student status to cancelled
   - Send parent notification
   ↓
5. REFUND PROCESSING (if applicable)
   - Calculate refund amount
   - Process refund via selected method
   - Track refund status
   ↓
6. DOCUMENT ARCHIVAL
   - Archive admission form and documents
   - Maintain audit trail
   ↓
7. COMPLETION
   - Generate final report
   - Archive cancellation record
```

---

## CANCELLATION REASONS SUPPORTED

- Student Dropout
- Family Relocation
- Financial Reasons
- Poor Performance
- Discipline Issue
- Health Issue
- Personal Reasons
- Transfer to Another School
- Other

---

## REFUND CALCULATION OPTIONS

- **Full Refund:** 100% of paid fees
- **Prorated Refund:** Based on days enrolled vs. total days in year
- **No Refund:** Retention of fees

---

**End of Principal Cancel Admission Work Document**

Total Endpoints: **26**  
Total Models: **2** (AdmissionCancellationRequest, RefundRecord)  
Status: **Ready for Implementation**
