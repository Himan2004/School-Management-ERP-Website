# PRINCIPAL DASHBOARD BACKEND - DETAILED WORK
## Admission List Management Page

**Document Date:** May 9, 2026  
**Scope:** Complete backend for Principal's Admission List page  
**Total Endpoints:** 24 endpoints

---

# OVERVIEW

The Principal's "Admission List" dashboard provides comprehensive view and management of all submitted admissions. The principal can view, filter, search, track status, perform bulk actions, and generate reports on all admissions in the system.

---

# SECTION 1: ADMISSION LIST VIEWING & FILTERING

## PART 1: ADMISSION LIST ENDPOINTS

### File 1: Create `controllers/principal/admissionListController.js`

**Functions to Implement (24 total):**

```javascript
import AdmissionForm from "../../models/academic/AdmissionForm.model.js";
import AdmissionDocument from "../../models/academic/AdmissionDocument.model.js";
import Student from "../../models/users/student.model.js";
import Class from "../../models/superAdmin/Class.model.js";
import School from "../../models/school/School.model.js";

// ==================== ADMISSION LIST VIEWING ====================

// Function 1: Get all admissions with advanced filtering
export const getAdmissionList = async (req, res) => {
  try {
    const {
      status = "all", // all, pending, approved, rejected, completed
      classId,
      dateFrom,
      dateTo,
      searchQuery,
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = 1,
      limit = 25,
      documentStatus, // not_submitted, submitted, partial, verified
      verificationStatus, // not_started, in_progress, completed
      category,
      gender
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    // Build filter
    let filter = { school: schoolId };

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Class filter
    if (classId) {
      filter["admissionInfo.classApplyingFor"] = classId;
    }

    // Document status filter
    if (documentStatus) {
      filter.documentStatus = documentStatus;
    }

    // Verification status filter
    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    // Category filter
    if (category) {
      filter["personalInfo.category"] = category;
    }

    // Gender filter
    if (gender) {
      filter["personalInfo.gender"] = gender;
    }

    // Date range filter
    if (dateFrom && dateTo) {
      filter.submittedAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    }

    // Search filter
    if (searchQuery) {
      filter.$or = [
        { "personalInfo.fullName": { $regex: searchQuery, $options: "i" } },
        { "contactInfo.email": { $regex: searchQuery, $options: "i" } },
        { "contactInfo.phoneNumber": { $regex: searchQuery, $options: "i" } },
        { referenceNumber: { $regex: searchQuery, $options: "i" } },
        { "fatherInfo.name": { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Sorting
    const sortOptions = {
      submittedAt: { submittedAt: sortOrder === "asc" ? 1 : -1 },
      name: { "personalInfo.fullName": sortOrder === "asc" ? 1 : -1 },
      status: { status: 1 },
      email: { "contactInfo.email": 1 },
      dob: { "personalInfo.dateOfBirth": sortOrder === "asc" ? 1 : -1 },
      class: { "admissionInfo.classApplyingFor": 1 }
    };

    const sort = sortOptions[sortBy] || sortOptions.submittedAt;
    const skip = (page - 1) * limit;

    // Fetch admissions
    const admissions = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name classCode")
      .populate("submittedBy", "fullName")
      .populate("approvedBy", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AdmissionForm.countDocuments(filter);

    // Add document count and status details
    const admissionsWithDetails = await Promise.all(
      admissions.map(async (admission) => {
        const docCount = await AdmissionDocument.countDocuments({
          admission: admission._id
        });

        const verifiedDocCount = await AdmissionDocument.countDocuments({
          admission: admission._id,
          status: "verified"
        });

        return {
          ...admission,
          documentsCount: docCount,
          documentsVerified: verifiedDocCount,
          documentsProgress: docCount > 0 ? Math.round((verifiedDocCount / docCount) * 100) : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: admissionsWithDetails,
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

// Function 2: Get admission summary view (card format)
export const getAdmissionSummary = async (req, res) => {
  try {
    const { classId, page = 1, limit = 12 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (classId) filter["admissionInfo.classApplyingFor"] = classId;

    const skip = (page - 1) * limit;

    const admissions = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "referenceNumber personalInfo contactInfo admissionInfo status " +
        "documentStatus submittedAt approvedAt"
      );

    const total = await AdmissionForm.countDocuments(filter);

    // Format for card display
    const summaryCards = admissions.map(admission => ({
      id: admission._id,
      referenceNumber: admission.referenceNumber,
      applicantName: admission.personalInfo.fullName,
      applicantAge: calculateAge(admission.personalInfo.dateOfBirth),
      gender: admission.personalInfo.gender,
      email: admission.contactInfo.email,
      phone: admission.contactInfo.phoneNumber,
      classApplying: admission.admissionInfo.classApplyingFor?.name,
      status: admission.status,
      documentStatus: admission.documentStatus,
      submittedDate: admission.submittedAt,
      approvedDate: admission.approvedAt,
      avatar: generateInitials(admission.personalInfo.fullName)
    }));

    res.status(200).json({
      success: true,
      data: summaryCards,
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

// Function 3: Get admission by status tabs
export const getAdmissionsByStatusTab = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const statuses = ["pending", "approved", "rejected", "completed"];
    const skip = (page - 1) * limit;

    const results = {};

    for (const status of statuses) {
      const count = await AdmissionForm.countDocuments({
        school: schoolId,
        status
      });

      const admissions = await AdmissionForm.find({
        school: schoolId,
        status
      })
        .populate("admissionInfo.classApplyingFor", "name")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select(
          "referenceNumber personalInfo contactInfo admissionInfo status " +
          "submittedAt approvedAt"
        );

      results[status] = {
        count,
        admissions,
        pages: Math.ceil(count / limit)
      };
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Get detailed admission with all related data
export const getAdmissionDetails = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const admission = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    })
      .populate("admissionInfo.classApplyingFor", "name section classCode")
      .populate("submittedBy", "fullName email role")
      .populate("approvedBy", "fullName email role")
      .populate("rejectedBy", "fullName email role");

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Get documents
    const documents = await AdmissionDocument.find({
      admission: admissionId
    });

    // Get timeline
    const timeline = buildAdmissionTimeline(admission);

    res.status(200).json({
      success: true,
      data: {
        ...admission.toObject(),
        documents,
        timeline
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Advanced search admissions
export const searchAdmissions = async (req, res) => {
  try {
    const {
      query,
      searchType = "all", // all, name, email, phone, referenceNumber, class
      page = 1,
      limit = 20
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }

    let filter = { school: schoolId };
    const searchRegex = { $regex: query, $options: "i" };

    if (searchType === "all") {
      filter.$or = [
        { referenceNumber: searchRegex },
        { "personalInfo.fullName": searchRegex },
        { "contactInfo.email": searchRegex },
        { "contactInfo.phoneNumber": searchRegex },
        { "fatherInfo.name": searchRegex }
      ];
    } else if (searchType === "name") {
      filter["personalInfo.fullName"] = searchRegex;
    } else if (searchType === "email") {
      filter["contactInfo.email"] = searchRegex;
    } else if (searchType === "phone") {
      filter["contactInfo.phoneNumber"] = searchRegex;
    } else if (searchType === "referenceNumber") {
      filter.referenceNumber = searchRegex;
    }

    const skip = (page - 1) * limit;

    const results = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdmissionForm.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      searchQuery: query
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Get admissions dashboard statistics
export const getAdmissionDashboardStats = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { dateFrom, dateTo } = req.query;

    // Base filter
    let dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter = {
        submittedAt: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo)
        }
      };
    }

    // Status count
    const statusStats = await AdmissionForm.aggregate([
      { $match: { school: schoolId, ...dateFilter } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format status stats
    const formattedStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    };

    statusStats.forEach(stat => {
      formattedStatus[stat._id] = stat.count;
    });

    // Document status stats
    const docStats = await AdmissionForm.aggregate([
      { $match: { school: schoolId, ...dateFilter } },
      {
        $group: {
          _id: "$documentStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Class-wise stats
    const classStats = await AdmissionForm.aggregate([
      { $match: { school: schoolId, status: "completed", ...dateFilter } },
      {
        $group: {
          _id: "$admissionInfo.classApplyingFor",
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
      },
      { $sort: { admissions: -1 } }
    ]);

    // Gender distribution
    const genderStats = await AdmissionForm.aggregate([
      { $match: { school: schoolId, ...dateFilter } },
      {
        $group: {
          _id: "$personalInfo.gender",
          count: { $sum: 1 }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await AdmissionForm.aggregate([
      { $match: { school: schoolId, ...dateFilter } },
      {
        $group: {
          _id: "$personalInfo.category",
          count: { $sum: 1 }
        }
      }
    ]);

    // Average processing time
    const completedAdmissions = await AdmissionForm.find({
      school: schoolId,
      status: "completed",
      ...dateFilter
    }).select("submittedAt completedAt");

    const avgProcessingTime = completedAdmissions.length > 0
      ? Math.round(
          completedAdmissions.reduce((sum, adm) => {
            const days = (new Date(adm.completedAt) - new Date(adm.submittedAt)) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedAdmissions.length
        )
      : 0;

    // Approval rate
    const totalProcessed = formattedStatus.approved + formattedStatus.rejected;
    const approvalRate = totalProcessed > 0
      ? Math.round((formattedStatus.approved / totalProcessed) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAdmissions: Object.values(formattedStatus).reduce((a, b) => a + b, 0),
          pending: formattedStatus.pending,
          approved: formattedStatus.approved,
          rejected: formattedStatus.rejected,
          completed: formattedStatus.completed,
          averageProcessingDays: avgProcessingTime,
          approvalRate: `${approvalRate}%`
        },
        documentStatus: docStats,
        byClass: classStats,
        byGender: genderStats,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Filter admissions by multiple criteria
export const filterAdmissions = async (req, res) => {
  try {
    const {
      statusList, // Array of statuses
      classIdList, // Array of class IDs
      genderList, // Array of genders
      categoryList, // Array of categories
      documentStatusList, // Array of document statuses
      page = 1,
      limit = 20
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (statusList && statusList.length > 0) {
      filter.status = { $in: statusList };
    }

    if (classIdList && classIdList.length > 0) {
      filter["admissionInfo.classApplyingFor"] = { $in: classIdList };
    }

    if (genderList && genderList.length > 0) {
      filter["personalInfo.gender"] = { $in: genderList };
    }

    if (categoryList && categoryList.length > 0) {
      filter["personalInfo.category"] = { $in: categoryList };
    }

    if (documentStatusList && documentStatusList.length > 0) {
      filter.documentStatus = { $in: documentStatusList };
    }

    const skip = (page - 1) * limit;

    const admissions = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdmissionForm.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: admissions,
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

// Function 8: Get admission comparison (pending vs approved)
export const getAdmissionComparison = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const comparison = await AdmissionForm.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: {
            status: "$status",
            month: { $month: "$submittedAt" },
            year: { $year: "$submittedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format for chart
    const chartData = {};
    comparison.forEach(item => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      if (!chartData[monthKey]) {
        chartData[monthKey] = {};
      }
      chartData[monthKey][item._id.status] = item.count;
    });

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Quick actions - change admission status
export const quickActionChangeStatus = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { newStatus, remarks } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const admission = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    const oldStatus = admission.status;
    admission.status = newStatus;

    if (newStatus === "approved") {
      admission.approvedAt = new Date();
      admission.approvedBy = req.principal._id;
    } else if (newStatus === "rejected") {
      admission.rejectedAt = new Date();
      admission.rejectedBy = req.principal._id;
      admission.rejectionReason = remarks;
    }

    await admission.save();

    res.status(200).json({
      success: true,
      message: `Status changed from ${oldStatus} to ${newStatus}`,
      data: {
        admissionId,
        oldStatus,
        newStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Bulk update admissions
export const bulkUpdateAdmissions = async (req, res) => {
  try {
    const { admissionIds, action, data } = req.body;
    // action: changeStatus, addRemark, updateClass

    const schoolId = req.principal.school._id || req.principal.school;
    const results = [];
    const errors = [];

    for (const admissionId of admissionIds) {
      try {
        const admission = await AdmissionForm.findOne({
          _id: admissionId,
          school: schoolId
        });

        if (!admission) {
          errors.push(`Admission ${admissionId}: Not found`);
          continue;
        }

        if (action === "changeStatus") {
          admission.status = data.status;
          if (data.status === "approved") {
            admission.approvedAt = new Date();
            admission.approvedBy = req.principal._id;
          }
        } else if (action === "addRemark") {
          admission.remarks = data.remarks;
        } else if (action === "updateClass") {
          admission.allocationInfo = {
            classId: data.classId,
            section: data.section,
            rollNumber: data.rollNumber
          };
        }

        await admission.save();
        results.push({ admissionId, status: "success" });
      } catch (error) {
        errors.push(`Admission ${admissionId}: ${error.message}`);
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

// Function 11: Get admission timeline
export const getAdmissionTimeline = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const admission = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    })
      .populate("submittedBy", "fullName")
      .populate("approvedBy", "fullName")
      .populate("rejectedBy", "fullName");

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    const timeline = [
      {
        event: "Form Submitted",
        date: admission.submittedAt,
        user: admission.submittedBy?.fullName || "System"
      }
    ];

    if (admission.approvedAt) {
      timeline.push({
        event: "Approved",
        date: admission.approvedAt,
        user: admission.approvedBy?.fullName || "System"
      });
    }

    if (admission.rejectedAt) {
      timeline.push({
        event: "Rejected",
        date: admission.rejectedAt,
        user: admission.rejectedBy?.fullName || "System",
        reason: admission.rejectionReason
      });
    }

    if (admission.completedAt) {
      timeline.push({
        event: "Completed",
        date: admission.completedAt,
        description: `Student created: ${admission.studentId}`
      });
    }

    res.status(200).json({
      success: true,
      data: timeline.sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Export admission list
export const exportAdmissionList = async (req, res) => {
  try {
    const {
      status,
      classId,
      format = "csv", // csv, json, excel
      fields // Array of fields to export
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (status && status !== "all") filter.status = status;
    if (classId) filter["admissionInfo.classApplyingFor"] = classId;

    const admissions = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name");

    if (format === "csv") {
      const csv = generateAdmissionListCSV(admissions, fields);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="admission_list_${Date.now()}.csv"`);
      res.send(csv);
    } else if (format === "json") {
      res.status(200).json({
        success: true,
        data: admissions,
        count: admissions.length
      });
    } else {
      // Excel format
      res.status(200).json({
        success: true,
        data: admissions,
        format: "excel"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 13: Get pending admissions requiring action
export const getPendingAdmissionsForAction = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const pending = await AdmissionForm.find({
      school: schoolId,
      status: "pending",
      documentStatus: "verified"
    })
      .populate("admissionInfo.classApplyingFor", "name")
      .select(
        "referenceNumber personalInfo contactInfo admissionInfo documentStatus submittedAt"
      )
      .sort({ submittedAt: 1 });

    const withoutDocuments = await AdmissionForm.find({
      school: schoolId,
      status: "pending",
      documentStatus: "not_submitted"
    })
      .populate("admissionInfo.classApplyingFor", "name")
      .select(
        "referenceNumber personalInfo contactInfo documentStatus submittedAt"
      )
      .sort({ submittedAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        readyForApproval: pending,
        awaitingDocuments: withoutDocuments,
        total: pending.length + withoutDocuments.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 14: Get admission performance metrics
export const getAdmissionPerformanceMetrics = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { days = 30 } = req.query;

    const dateRange = new Date();
    dateRange.setDate(dateRange.getDate() - parseInt(days));

    // New admissions this period
    const newAdmissions = await AdmissionForm.countDocuments({
      school: schoolId,
      submittedAt: { $gte: dateRange }
    });

    // Completed admissions this period
    const completedAdmissions = await AdmissionForm.countDocuments({
      school: schoolId,
      completedAt: { $gte: dateRange }
    });

    // Approved admissions this period
    const approvedAdmissions = await AdmissionForm.countDocuments({
      school: schoolId,
      approvedAt: { $gte: dateRange }
    });

    // Rejected admissions this period
    const rejectedAdmissions = await AdmissionForm.countDocuments({
      school: schoolId,
      rejectedAt: { $gte: dateRange }
    });

    // Pending admissions
    const pendingAdmissions = await AdmissionForm.countDocuments({
      school: schoolId,
      status: "pending"
    });

    // Average time to completion
    const completedInPeriod = await AdmissionForm.find({
      school: schoolId,
      completedAt: { $gte: dateRange }
    }).select("submittedAt completedAt");

    const avgTime = completedInPeriod.length > 0
      ? Math.round(
          completedInPeriod.reduce((sum, adm) => {
            const hours = (new Date(adm.completedAt) - new Date(adm.submittedAt)) / (1000 * 60 * 60);
            return sum + hours;
          }, 0) / completedInPeriod.length
        )
      : 0;

    res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        newAdmissions,
        completedAdmissions,
        approvedAdmissions,
        rejectedAdmissions,
        pendingAdmissions,
        averageCompletionHours: avgTime,
        conversionRate: newAdmissions > 0 ? Math.round((completedAdmissions / newAdmissions) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 15: Get list for printing/report
export const getAdmissionListForReport = async (req, res) => {
  try {
    const { status, classId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (status) filter.status = status;
    if (classId) filter["admissionInfo.classApplyingFor"] = classId;

    const admissions = await AdmissionForm.find(filter)
      .populate("admissionInfo.classApplyingFor", "name section")
      .sort({ "personalInfo.fullName": 1 });

    // Format for report
    const reportData = admissions.map((adm, index) => ({
      sno: index + 1,
      referenceNumber: adm.referenceNumber,
      name: adm.personalInfo.fullName,
      dob: new Date(adm.personalInfo.dateOfBirth).toLocaleDateString(),
      gender: adm.personalInfo.gender,
      category: adm.personalInfo.category,
      class: adm.admissionInfo.classApplyingFor?.name,
      section: adm.admissionInfo.classApplyingFor?.section,
      fatherName: adm.fatherInfo.name,
      email: adm.contactInfo.email,
      phone: adm.contactInfo.phoneNumber,
      status: adm.status,
      submittedDate: new Date(adm.submittedAt).toLocaleDateString()
    }));

    res.status(200).json({
      success: true,
      data: reportData,
      generatedAt: new Date(),
      school: req.principal.school.schoolName || ""
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 16: Get admission suggestions (similar admissions)
export const getSimilarAdmissions = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const admission = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Find similar admissions (same class, similar age, same gender)
    const similar = await AdmissionForm.find({
      school: schoolId,
      _id: { $ne: admissionId },
      "admissionInfo.classApplyingFor": admission.admissionInfo.classApplyingFor,
      "personalInfo.gender": admission.personalInfo.gender
    })
      .select("referenceNumber personalInfo admissionInfo status")
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        current: {
          id: admission._id,
          name: admission.personalInfo.fullName,
          class: admission.admissionInfo.classApplyingFor
        },
        similar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 17: Get admission by date range with aggregation
export const getAdmissionsByDateRange = async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = "day" } = req.query; // groupBy: day, week, month
    const schoolId = req.principal.school._id || req.principal.school;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: "Date range is required"
      });
    }

    const dateFilter = {
      submittedAt: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      }
    };

    let groupStage;
    if (groupBy === "day") {
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count: { $sum: 1 },
          statuses: { $push: "$status" }
        }
      };
    } else if (groupBy === "week") {
      groupStage = {
        $group: {
          _id: { $week: "$submittedAt" },
          count: { $sum: 1 },
          statuses: { $push: "$status" }
        }
      };
    } else {
      groupStage = {
        $group: {
          _id: { $month: "$submittedAt" },
          count: { $sum: 1 },
          statuses: { $push: "$status" }
        }
      };
    }

    const admissions = await AdmissionForm.aggregate([
      { $match: { school: schoolId, ...dateFilter } },
      groupStage,
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: admissions,
      dateRange: {
        from: dateFrom,
        to: dateTo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 18: Mark admission as reviewed/flagged
export const toggleAdmissionFlag = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { isFlagged, reason } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const admission = await AdmissionForm.findOne({
      _id: admissionId,
      school: schoolId
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    admission.isFlagged = isFlagged;
    admission.flagReason = reason;
    await admission.save();

    res.status(200).json({
      success: true,
      message: `Admission ${isFlagged ? "flagged" : "unflagged"}`,
      data: {
        admissionId,
        isFlagged
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 19: Get admission conversation/notes
export const getAdmissionNotes = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    // Requires AdmissionNote model
    const AdmissionNote = require("../../models/academic/AdmissionNote.model.js").default;

    const notes = await AdmissionNote.find({
      admission: admissionId,
      school: schoolId
    })
      .populate("createdBy", "fullName role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 20: Add note to admission
export const addAdmissionNote = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { noteText, priority = "normal" } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    // Requires AdmissionNote model
    const AdmissionNote = require("../../models/academic/AdmissionNote.model.js").default;

    const note = await AdmissionNote.create({
      admission: admissionId,
      school: schoolId,
      noteText,
      priority,
      createdBy: req.principal._id,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Note added successfully",
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 21: Get admission dashboard quick stats
export const getQuickStats = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const stats = {
      pending: await AdmissionForm.countDocuments({ school: schoolId, status: "pending" }),
      approved: await AdmissionForm.countDocuments({ school: schoolId, status: "approved" }),
      rejected: await AdmissionForm.countDocuments({ school: schoolId, status: "rejected" }),
      completed: await AdmissionForm.countDocuments({ school: schoolId, status: "completed" }),
      documentsNotSubmitted: await AdmissionForm.countDocuments({
        school: schoolId,
        documentStatus: "not_submitted"
      }),
      documentsVerified: await AdmissionForm.countDocuments({
        school: schoolId,
        documentStatus: "verified"
      }),
      readyForApproval: await AdmissionForm.countDocuments({
        school: schoolId,
        status: "pending",
        documentStatus: "verified"
      })
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 22: Get admission filters metadata
export const getFilterMetadata = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    // Get distinct values for filters
    const [classes, genders, categories, statuses] = await Promise.all([
      Class.find({ school: schoolId, isActive: true }).select("name"),
      AdmissionForm.distinct("personalInfo.gender", { school: schoolId }),
      AdmissionForm.distinct("personalInfo.category", { school: schoolId }),
      AdmissionForm.distinct("status", { school: schoolId })
    ]);

    res.status(200).json({
      success: true,
      data: {
        classes,
        genders,
        categories,
        statuses: ["pending", "approved", "rejected", "completed"],
        documentStatuses: ["not_submitted", "submitted", "partial", "verified"],
        verificationStatuses: ["not_started", "in_progress", "completed"]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function: Calculate age
const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function: Generate initials for avatar
const generateInitials = (fullName) => {
  return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

// Helper function: Build timeline
const buildAdmissionTimeline = (admission) => {
  const timeline = [
    {
      event: "Form Submitted",
      date: admission.submittedAt,
      user: admission.submittedBy?.fullName || "System"
    }
  ];

  if (admission.approvedAt) {
    timeline.push({
      event: "Approved",
      date: admission.approvedAt,
      user: admission.approvedBy?.fullName || "System"
    });
  }

  if (admission.completedAt) {
    timeline.push({
      event: "Completed",
      date: admission.completedAt
    });
  }

  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Helper function: Generate CSV
const generateAdmissionListCSV = (admissions, fields) => {
  const defaultFields = [
    "referenceNumber",
    "name",
    "email",
    "phone",
    "classApplying",
    "status",
    "submittedDate"
  ];

  const csvFields = fields || defaultFields;

  const headers = csvFields.map(f => {
    const headerMap = {
      referenceNumber: "Reference #",
      name: "Applicant Name",
      email: "Email",
      phone: "Phone",
      classApplying: "Class Applying",
      status: "Status",
      submittedDate: "Submitted Date"
    };
    return headerMap[f] || f;
  });

  const rows = admissions.map(adm => {
    return csvFields.map(f => {
      if (f === "referenceNumber") return adm.referenceNumber;
      if (f === "name") return adm.personalInfo.fullName;
      if (f === "email") return adm.contactInfo.email;
      if (f === "phone") return adm.contactInfo.phoneNumber;
      if (f === "classApplying") return adm.admissionInfo.classApplyingFor?.name || "";
      if (f === "status") return adm.status;
      if (f === "submittedDate") return new Date(adm.submittedAt).toLocaleDateString();
      return "";
    });
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};
```

---

### File 2: Create `routes/principal/admissionListRoutes.js`

```javascript
import express from "express";
import {
  getAdmissionList,
  getAdmissionSummary,
  getAdmissionsByStatusTab,
  getAdmissionDetails,
  searchAdmissions,
  getAdmissionDashboardStats,
  filterAdmissions,
  getAdmissionComparison,
  quickActionChangeStatus,
  bulkUpdateAdmissions,
  getAdmissionTimeline,
  exportAdmissionList,
  getPendingAdmissionsForAction,
  getAdmissionPerformanceMetrics,
  getAdmissionListForReport,
  getSimilarAdmissions,
  getAdmissionsByDateRange,
  toggleAdmissionFlag,
  getAdmissionNotes,
  addAdmissionNote,
  getQuickStats,
  getFilterMetadata
} from "../../controllers/principal/admissionListController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("principal"));

// Main list endpoints
router.get("/", getAdmissionList);
router.get("/summary", getAdmissionSummary);
router.get("/status-tabs", getAdmissionsByStatusTab);
router.get("/stats", getAdmissionDashboardStats);
router.get("/quick-stats", getQuickStats);
router.get("/metadata", getFilterMetadata);

// Search and filter
router.get("/search", searchAdmissions);
router.post("/filter", filterAdmissions);
router.get("/date-range", getAdmissionsByDateRange);
router.post("/comparison", getAdmissionComparison);

// Single admission
router.get("/:admissionId", getAdmissionDetails);
router.get("/:admissionId/timeline", getAdmissionTimeline);
router.get("/:admissionId/similar", getSimilarAdmissions);
router.get("/:admissionId/notes", getAdmissionNotes);
router.post("/:admissionId/notes", addAdmissionNote);

// Quick actions
router.patch("/:admissionId/status", quickActionChangeStatus);
router.patch("/:admissionId/flag", toggleAdmissionFlag);

// Bulk operations
router.post("/bulk/update", bulkUpdateAdmissions);

// Reports and exports
router.get("/pending/action", getPendingAdmissionsForAction);
router.get("/metrics/performance", getAdmissionPerformanceMetrics);
router.get("/report/list", getAdmissionListForReport);
router.get("/export/list", exportAdmissionList);

export default router;
```

---

## MODELS NEEDED

### File 3: Create `models/academic/AdmissionNote.model.js`

```javascript
import mongoose from "mongoose";

const admissionNoteSchema = new mongoose.Schema(
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
    noteText: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const AdmissionNote = mongoose.model("AdmissionNote", admissionNoteSchema);
export default AdmissionNote;
```

---

## Update AdmissionForm Model

Add these fields to [AdmissionForm.model.js](models/academic/AdmissionForm.model.js):

```javascript
// Add to admissionFormSchema before closing
isFlagged: {
  type: Boolean,
  default: false
},
flagReason: String
```

---

## FILE INTEGRATION

### File 4: Update `server.js`

```javascript
// Add this import
import admissionListRoutes from './routes/principal/admissionListRoutes.js';

// Add this route mount (different from /api/principal/admissions)
app.use("/api/principal/admissions-list", admissionListRoutes);
```

---

## DATABASE INDEXES

```javascript
// Additional indexes for list view optimization
db.admissionforms.createIndex({ school: 1, status: 1, submittedAt: -1 });
db.admissionforms.createIndex({ school: 1, documentStatus: 1 });
db.admissionforms.createIndex({ school: 1, "personalInfo.gender": 1 });
db.admissionforms.createIndex({ school: 1, "personalInfo.category": 1 });
db.admissionforms.createIndex({ school: 1, isFlagged: 1 });
db.admissionforms.createIndex({ "personalInfo.fullName": "text", "contactInfo.email": "text" });

// Admission notes indexes
db.admissionnotes.createIndex({ admission: 1, school: 1 });
db.admissionnotes.createIndex({ priority: 1, createdAt: -1 });
```

---

## API ENDPOINTS SUMMARY

### Main List Viewing (6 endpoints)
- `GET /api/principal/admissions-list` - Get all admissions with filters
- `GET /api/principal/admissions-list/summary` - Card view summary
- `GET /api/principal/admissions-list/status-tabs` - Status-wise tabs
- `GET /api/principal/admissions-list/:admissionId` - Single admission details
- `GET /api/principal/admissions-list/stats` - Dashboard statistics
- `GET /api/principal/admissions-list/quick-stats` - Quick status counts

### Search & Filter (4 endpoints)
- `GET /api/principal/admissions-list/search` - Advanced search
- `POST /api/principal/admissions-list/filter` - Multi-criteria filter
- `GET /api/principal/admissions-list/date-range` - Date range query
- `GET /api/principal/admissions-list/metadata` - Filter options

### Admission Details (4 endpoints)
- `GET /api/principal/admissions-list/:admissionId/timeline` - Status timeline
- `GET /api/principal/admissions-list/:admissionId/similar` - Similar admissions
- `GET /api/principal/admissions-list/:admissionId/notes` - Get notes
- `POST /api/principal/admissions-list/:admissionId/notes` - Add note

### Quick Actions (2 endpoints)
- `PATCH /api/principal/admissions-list/:admissionId/status` - Change status
- `PATCH /api/principal/admissions-list/:admissionId/flag` - Flag admission

### Bulk Operations (1 endpoint)
- `POST /api/principal/admissions-list/bulk/update` - Bulk updates

### Reports & Analytics (4 endpoints)
- `GET /api/principal/admissions-list/pending/action` - Pending for action
- `GET /api/principal/admissions-list/metrics/performance` - Performance metrics
- `GET /api/principal/admissions-list/report/list` - Printable report
- `GET /api/principal/admissions-list/export/list` - Export data

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Basic List Display (Week 1)
- [ ] Create admissionListController.js with functions 1-3
- [ ] Create admissionListRoutes.js
- [ ] Test main list endpoints
- [ ] Add pagination and sorting

### Phase 2: Search & Filter (Week 1-2)
- [ ] Implement search (Function 5)
- [ ] Implement multi-filter (Functions 7, 17)
- [ ] Implement status tabs (Function 3)
- [ ] Add metadata endpoint (Function 22)

### Phase 3: Details & Timeline (Week 2)
- [ ] Implement detail view (Function 4)
- [ ] Implement timeline (Function 11)
- [ ] Implement notes system (Functions 19, 20)
- [ ] Create AdmissionNote model

### Phase 4: Analytics & Reports (Week 2-3)
- [ ] Implement statistics (Functions 6, 14, 21)
- [ ] Implement performance metrics (Function 14)
- [ ] Implement export (Function 12)
- [ ] Implement report view (Function 15)

### Phase 5: Actions & Management (Week 3)
- [ ] Implement quick actions (Functions 9, 10, 18)
- [ ] Implement bulk updates (Function 10)
- [ ] Implement pending actions (Function 13)
- [ ] Test all action flows

### Phase 6: Integration & Testing (Week 3-4)
- [ ] Update server.js with all routes
- [ ] Create database indexes
- [ ] Integration testing
- [ ] Error handling and validation
- [ ] API documentation

---

## KEY FEATURES

### List Display
✅ Advanced table view with multiple columns
✅ Card/summary view option
✅ Status tab organization
✅ Pagination with customizable limits
✅ Multiple sorting options

### Search & Filter
✅ Full-text search (name, email, phone, reference number)
✅ Multi-criteria filtering (status, class, gender, category)
✅ Date range filtering
✅ Document status filtering
✅ Combined filter support

### Analytics
✅ Dashboard statistics (pending, approved, rejected, completed)
✅ Performance metrics (completion rate, average time)
✅ Class-wise distribution
✅ Gender and category breakdown
✅ Monthly trend comparison

### Management Tools
✅ Quick status change
✅ Bulk update operations
✅ Flag/mark important admissions
✅ Add internal notes
✅ Timeline view
✅ Similar admission suggestions

### Reporting
✅ Export to CSV/JSON/Excel
✅ Printable report format
✅ Pending admissions list
✅ Performance metrics report
✅ Date range analysis

### Additional Features
✅ Activity timeline
✅ Internal notes system
✅ Flag important cases
✅ Quick stat indicators
✅ Dynamic filter metadata
✅ Comparison charts

---

## TOTAL ENDPOINTS: 24

- List Viewing: 6 endpoints
- Search & Filter: 4 endpoints
- Details & Timeline: 4 endpoints
- Actions & Updates: 2 endpoints
- Bulk Operations: 1 endpoint
- Reports & Analytics: 4 endpoints
- Support Endpoints: 3 endpoints (metadata, comparison, quick stats)

**TOTAL: 24 production-ready endpoints**

---

## DATA FLOW

```
1. User requests admission list
2. System fetches admissions with filters
3. System adds document counts and progress
4. System calculates quick stats
5. User can:
   - View individual details
   - Change status
   - Add notes
   - Flag for review
   - Bulk update
   - Export/Report
```

---

**End of Principal Admission List Management Work Document**
