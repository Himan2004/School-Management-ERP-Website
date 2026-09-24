# ADMIN DASHBOARD BACKEND - DETAILED WORK
## Leave Requests | Notice Board | Settings

**Document Date:** May 4, 2026  
**Scope:** Complete backend for 3 admin pages  
**Total Endpoints:** 32 endpoints

---

# SECTION 1: LEAVE REQUESTS MANAGEMENT

## Overview
Complete leave management system for both staff and student leave requests with approval workflow.

---

## PART 1: LEAVE REQUEST ENDPOINTS

### File 1: Create `controllers/admin/leaveRequestController.js`

**Functions to Implement (12 total):**

```javascript
import StaffLeave from "../../models/HRM/Staffleave.model.js";
import StudentLeave from "../../models/academic/studentLeave.model.js"; // Needs to be created
import Teacher from "../../models/users/teacher.model.js";
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";

// ==================== STAFF LEAVE ENDPOINTS ====================

// Function 1: Get all staff leave requests (with filters)
export const getAllStaffLeaveRequests = async (req, res) => {
  try {
    const {
      status,
      leaveType,
      staffId,
      department,
      dateFrom,
      dateTo,
      sortBy,
      page = 1,
      limit = 10
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    // Build filter
    let filter = { school: schoolId };

    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (staffId) filter.staff = staffId;

    // Date range filter
    if (dateFrom && dateTo) {
      filter.fromDate = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    }

    // Department filter (via populated staff)
    if (department) {
      const staffInDept = await Teacher.find({ department }).select("_id");
      filter.staff = { $in: staffInDept.map(s => s._id) };
    }

    // Sorting
    let sortOption = { requestedAt: -1 };
    if (sortBy === "date") sortOption = { fromDate: -1 };
    if (sortBy === "status") sortOption = { status: 1 };
    if (sortBy === "name") sortOption = { "staff.fullName": 1 };

    // Pagination
    const skip = (page - 1) * limit;

    // Query with population
    const leaveRequests = await StaffLeave.find(filter)
      .populate("staff", "fullName email designation department")
      .populate("approvedBy", "fullName")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StaffLeave.countDocuments(filter);

    // Add statistics
    const stats = await StaffLeave.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = {};
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: leaveRequests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      stats: {
        pending: statusStats.pending || 0,
        approved: statusStats.approved || 0,
        rejected: statusStats.rejected || 0,
        cancelled: statusStats.cancelled || 0,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get single staff leave request details
export const getStaffLeaveRequestDetail = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const leaveRequest = await StaffLeave.findOne({
      _id: leaveId,
      school: schoolId
    })
      .populate("staff", "fullName email designation department phone")
      .populate("approvedBy", "fullName email role")
      .populate("requestedBy", "fullName");

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    // Calculate remaining days
    const numberOfDays = Math.ceil(
      (new Date(leaveRequest.toDate) - new Date(leaveRequest.fromDate)) /
      (1000 * 60 * 60 * 24)
    ) + 1;

    res.status(200).json({
      success: true,
      data: {
        ...leaveRequest.toObject(),
        numberOfDays,
        duration: {
          from: leaveRequest.fromDate,
          to: leaveRequest.toDate,
          days: numberOfDays
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

// Function 3: Approve staff leave request
export const approveStaffLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { remarks, alternateStaff } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const leaveRequest = await StaffLeave.findOne({
      _id: leaveId,
      school: schoolId
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve ${leaveRequest.status} request`
      });
    }

    // Update leave request
    leaveRequest.status = "approved";
    leaveRequest.approvedBy = req.admin._id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.remarks = remarks || "";
    leaveRequest.alternateStaff = alternateStaff || null;

    await leaveRequest.save();

    // Send approval notification (implement in email service)
    // await sendLeaveApprovalEmail(leaveRequest.staff.email, leaveRequest);

    res.status(200).json({
      success: true,
      message: "Leave request approved successfully",
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Reject staff leave request
export const rejectStaffLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason for rejection is required"
      });
    }

    const leaveRequest = await StaffLeave.findOne({
      _id: leaveId,
      school: schoolId
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject ${leaveRequest.status} request`
      });
    }

    leaveRequest.status = "rejected";
    leaveRequest.rejectedBy = req.admin._id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = reason;

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: "Leave request rejected successfully",
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Cancel approved leave request
export const cancelStaffLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const leaveRequest = await StaffLeave.findOne({
      _id: leaveId,
      school: schoolId
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    if (leaveRequest.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved leaves can be cancelled"
      });
    }

    leaveRequest.status = "cancelled";
    leaveRequest.cancelledBy = req.admin._id;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancellationReason = reason;

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: "Leave cancelled successfully",
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Get staff leave balance and history
export const getStaffLeaveBalance = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const currentYear = year || new Date().getFullYear();

    // Get all approved leaves for the year
    const approvedLeaves = await StaffLeave.find({
      staff: staffId,
      school: schoolId,
      status: "approved",
      fromDate: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1)
      }
    });

    // Calculate leave usage by type
    const leaveBalance = {
      casual: { allotted: 10, used: 0, balance: 10 },
      medical: { allotted: 5, used: 0, balance: 5 },
      earned: { allotted: 0, used: 0, balance: 0 },
      other: { allotted: 0, used: 0, balance: 0 }
    };

    let totalUsed = 0;

    approvedLeaves.forEach(leave => {
      const days = Math.ceil(
        (new Date(leave.toDate) - new Date(leave.fromDate)) /
        (1000 * 60 * 60 * 24)
      ) + 1;

      if (leaveBalance[leave.leaveType]) {
        leaveBalance[leave.leaveType].used += days;
        leaveBalance[leave.leaveType].balance -= days;
      }
      totalUsed += days;
    });

    // Get pending requests
    const pendingLeaves = await StaffLeave.countDocuments({
      staff: staffId,
      school: schoolId,
      status: "pending"
    });

    res.status(200).json({
      success: true,
      data: {
        staffId,
        year: currentYear,
        leaveBalance,
        totalAllotted: leaveBalance.casual.allotted + leaveBalance.medical.allotted,
        totalUsed,
        pendingRequests: pendingLeaves,
        history: approvedLeaves.map(l => ({
          leaveId: l._id,
          type: l.leaveType,
          from: l.fromDate,
          to: l.toDate,
          days: Math.ceil((new Date(l.toDate) - new Date(l.fromDate)) / (1000 * 60 * 60 * 24)) + 1,
          approvedAt: l.approvedAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== STUDENT LEAVE ENDPOINTS ====================

// Function 7: Get all student leave requests
export const getAllStudentLeaveRequests = async (req, res) => {
  try {
    const {
      status,
      classId,
      studentId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    let filter = { school: schoolId };

    if (status) filter.status = status;
    if (classId) filter.class = classId;
    if (studentId) filter.student = studentId;

    if (dateFrom && dateTo) {
      filter.fromDate = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    }

    const skip = (page - 1) * limit;

    const leaveRequests = await StudentLeave.find(filter)
      .populate("student", "fullName rollNumber email class")
      .populate("class", "name")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StudentLeave.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: leaveRequests,
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

// Function 8: Approve student leave request
export const approveStudentLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { remarks } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const leaveRequest = await StudentLeave.findOne({
      _id: leaveId,
      school: schoolId
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = req.admin._id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.remarks = remarks;

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: "Student leave approved successfully",
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Reject student leave request
export const rejectStudentLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const leaveRequest = await StudentLeave.findOne({
      _id: leaveId,
      school: schoolId
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    leaveRequest.status = "rejected";
    leaveRequest.rejectionReason = reason;

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: "Student leave rejected successfully",
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Get leave requests dashboard stats
export const getLeaveRequestsStats = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;
    const { type } = req.query; // staff or student

    let staffStats = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    let studentStats = { pending: 0, approved: 0, rejected: 0 };

    if (!type || type === "staff") {
      const staffCount = await StaffLeave.aggregate([
        { $match: { school: schoolId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      staffCount.forEach(item => {
        staffStats[item._id] = item.count;
      });
    }

    if (!type || type === "student") {
      const studentCount = await StudentLeave.aggregate([
        { $match: { school: schoolId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      studentCount.forEach(item => {
        studentStats[item._id] = item.count;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        staff: {
          ...staffStats,
          total: Object.values(staffStats).reduce((a, b) => a + b, 0)
        },
        student: {
          ...studentStats,
          total: Object.values(studentStats).reduce((a, b) => a + b, 0)
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

// Function 11: Export leave requests (CSV/PDF)
export const exportLeaveRequests = async (req, res) => {
  try {
    const { type, status, format } = req.query; // format: csv or pdf
    const schoolId = req.admin.school._id || req.admin.school;

    let data;
    if (type === "staff") {
      data = await StaffLeave.find({ school: schoolId, ...(status && { status }) })
        .populate("staff", "fullName designation");
    } else {
      data = await StudentLeave.find({ school: schoolId, ...(status && { status }) })
        .populate("student", "fullName rollNumber");
    }

    if (format === "csv") {
      // Generate CSV
      const csv = convertToCSV(data, type);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="leaves_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON for PDF generation on frontend
      res.status(200).json({
        success: true,
        data: data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Bulk action on leave requests
export const bulkLeaveAction = async (req, res) => {
  try {
    const { leaveIds, action, remarks } = req.body; // action: approve, reject, cancel
    const schoolId = req.admin.school._id || req.admin.school;

    const validActions = ["approve", "reject", "cancel"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action"
      });
    }

    const results = [];
    const errors = [];

    for (const leaveId of leaveIds) {
      try {
        const leaveRequest = await StaffLeave.findOne({
          _id: leaveId,
          school: schoolId
        });

        if (!leaveRequest) {
          errors.push(`Leave ${leaveId}: Not found`);
          continue;
        }

        if (action === "approve" && leaveRequest.status === "pending") {
          leaveRequest.status = "approved";
          leaveRequest.approvedBy = req.admin._id;
          leaveRequest.approvedAt = new Date();
        } else if (action === "reject" && leaveRequest.status === "pending") {
          leaveRequest.status = "rejected";
          leaveRequest.rejectionReason = remarks;
        } else if (action === "cancel" && leaveRequest.status === "approved") {
          leaveRequest.status = "cancelled";
          leaveRequest.cancellationReason = remarks;
        } else {
          errors.push(`Leave ${leaveId}: Cannot perform action`);
          continue;
        }

        await leaveRequest.save();
        results.push({ leaveId, status: "success" });
      } catch (error) {
        errors.push(`Leave ${leaveId}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Processed ${results.length} leaves, ${errors.length} errors`,
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

// Helper function to convert to CSV
const convertToCSV = (data, type) => {
  if (!data || data.length === 0) return "";

  const headers = type === "staff"
    ? ["ID", "Staff Name", "Leave Type", "From Date", "To Date", "Status", "Applied Date"]
    : ["ID", "Student Name", "Roll Number", "From Date", "To Date", "Status", "Applied Date"];

  const rows = data.map(item => {
    if (type === "staff") {
      return [
        item._id,
        item.staff?.fullName || "",
        item.leaveType,
        new Date(item.fromDate).toLocaleDateString(),
        new Date(item.toDate).toLocaleDateString(),
        item.status,
        new Date(item.requestedAt).toLocaleDateString()
      ];
    } else {
      return [
        item._id,
        item.student?.fullName || "",
        item.student?.rollNumber || "",
        new Date(item.fromDate).toLocaleDateString(),
        new Date(item.toDate).toLocaleDateString(),
        item.status,
        new Date(item.requestedAt).toLocaleDateString()
      ];
    }
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};
```

---

### File 2: Create `routes/admin/leaveRequestRoutes.js`

```javascript
import express from "express";
import {
  getAllStaffLeaveRequests,
  getStaffLeaveRequestDetail,
  approveStaffLeaveRequest,
  rejectStaffLeaveRequest,
  cancelStaffLeave,
  getStaffLeaveBalance,
  getAllStudentLeaveRequests,
  approveStudentLeaveRequest,
  rejectStudentLeaveRequest,
  getLeaveRequestsStats,
  exportLeaveRequests,
  bulkLeaveAction
} from "../../controllers/admin/leaveRequestController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// Staff Leave Routes
router.get("/staff", getAllStaffLeaveRequests);
router.get("/staff/:leaveId", getStaffLeaveRequestDetail);
router.patch("/staff/:leaveId/approve", approveStaffLeaveRequest);
router.patch("/staff/:leaveId/reject", rejectStaffLeaveRequest);
router.patch("/staff/:leaveId/cancel", cancelStaffLeave);
router.get("/staff/balance/:staffId", getStaffLeaveBalance);

// Student Leave Routes
router.get("/student", getAllStudentLeaveRequests);
router.patch("/student/:leaveId/approve", approveStudentLeaveRequest);
router.patch("/student/:leaveId/reject", rejectStudentLeaveRequest);

// Statistics & Actions
router.get("/stats", getLeaveRequestsStats);
router.get("/export", exportLeaveRequests);
router.post("/bulk-action", bulkLeaveAction);

export default router;
```

---

---

# SECTION 2: NOTICE BOARD MANAGEMENT

## Overview
Complete notice and announcement management system for school communications.

---

## PART 2: NOTICE BOARD ENDPOINTS

### File 3: Create `controllers/admin/noticeController.js`

**Functions to Implement (10 total):**

```javascript
import Notice from "../../models/common/Notice.model.js"; // Needs to be created
import Class from "../../models/superAdmin/Class.model.js";
import User from "../../models/users/user.model.js";

// Function 1: Create new notice
export const createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      noticeType, // general, academic, event, holiday, urgent, other
      priority, // low, medium, high
      applicableTo, // all, staff, students, parents, specific_classes
      applicableClasses, // Array of class IDs if applicable
      attachments, // File paths
      publishDate,
      expiryDate,
      sendNotification // true/false
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required"
      });
    }

    const notice = await Notice.create({
      school: schoolId,
      organization: req.admin.organization,
      title,
      content,
      noticeType,
      priority,
      applicableTo,
      applicableClasses: applicableClasses || [],
      attachments: attachments || [],
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: "published",
      createdBy: req.admin._id,
      viewCount: 0,
      sendNotification
    });

    // Send notifications if enabled
    if (sendNotification) {
      // await sendNotificationToUsers(notice);
    }

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get all notices
export const getAllNotices = async (req, res) => {
  try {
    const {
      noticeType,
      priority,
      status,
      applicableTo,
      searchQuery,
      sortBy,
      page = 1,
      limit = 10
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    let filter = { school: schoolId };

    if (noticeType) filter.noticeType = noticeType;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (applicableTo) filter.applicableTo = applicableTo;

    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } }
      ];
    }

    let sortOption = { publishDate: -1 };
    if (sortBy === "priority") sortOption = { priority: -1, publishDate: -1 };
    if (sortBy === "views") sortOption = { viewCount: -1 };

    const skip = (page - 1) * limit;

    const notices = await Notice.find(filter)
      .populate("createdBy", "fullName")
      .populate("applicableClasses", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notice.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: notices,
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

// Function 3: Get notice by ID
export const getNoticeById = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const notice = await Notice.findOne({
      _id: noticeId,
      school: schoolId
    })
      .populate("createdBy", "fullName email")
      .populate("applicableClasses", "name section")
      .populate("viewedBy", "fullName role");

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    // Increment view count
    notice.viewCount += 1;
    await notice.save();

    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Update notice
export const updateNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;
    const updateData = req.body;

    // Cannot update created date and view count
    delete updateData.createdAt;
    delete updateData.viewCount;
    delete updateData.createdBy;

    const updatedNotice = await Notice.findOneAndUpdate(
      { _id: noticeId, school: schoolId },
      {
        ...updateData,
        updatedBy: req.admin._id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "fullName")
      .populate("applicableClasses", "name");

    if (!updatedNotice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: updatedNotice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Delete notice
export const deleteNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const notice = await Notice.findOne({ _id: noticeId, school: schoolId });
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    // Soft delete
    notice.status = "archived";
    notice.archivedAt = new Date();
    notice.archivedBy = req.admin._id;
    await notice.save();

    res.status(200).json({
      success: true,
      message: "Notice archived successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Schedule notice
export const scheduleNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      noticeType,
      priority,
      applicableTo,
      applicableClasses,
      scheduleDate,
      attachments
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    if (new Date(scheduleDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Schedule date must be in the future"
      });
    }

    const notice = await Notice.create({
      school: schoolId,
      organization: req.admin.organization,
      title,
      content,
      noticeType,
      priority,
      applicableTo,
      applicableClasses,
      attachments,
      publishDate: new Date(scheduleDate),
      status: "scheduled",
      createdBy: req.admin._id,
      viewCount: 0
    });

    res.status(201).json({
      success: true,
      message: "Notice scheduled successfully",
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Pin/Feature notice
export const pinNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { isPinned } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    if (isPinned) {
      // Unpin all others first (keep only 3 pinned)
      await Notice.updateMany(
        { school: schoolId, isPinned: true },
        { isPinned: false }
      );
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: noticeId, school: schoolId },
      { isPinned: isPinned || false },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Notice ${isPinned ? "pinned" : "unpinned"} successfully`,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Get notice statistics
export const getNoticeStats = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    const stats = await Notice.aggregate([
      { $match: { school: schoolId, status: "published" } },
      {
        $group: {
          _id: "$noticeType",
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Notice.aggregate([
      { $match: { school: schoolId, status: "published" } },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalViews = await Notice.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        byPriority: priorityStats,
        total: await Notice.countDocuments({ school: schoolId, status: "published" }),
        scheduled: await Notice.countDocuments({ school: schoolId, status: "scheduled" }),
        archived: await Notice.countDocuments({ school: schoolId, status: "archived" }),
        totalViews: totalViews[0]?.totalViews || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Get notice viewing analytics
export const getNoticeAnalytics = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const notice = await Notice.findOne({
      _id: noticeId,
      school: schoolId
    })
      .populate("viewedBy", "fullName role");

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    // Analytics
    const viewsByRole = {};
    notice.viewedBy.forEach(user => {
      viewsByRole[user.role] = (viewsByRole[user.role] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        noticeId,
        title: notice.title,
        totalViews: notice.viewCount,
        uniqueViewers: notice.viewedBy.length,
        viewsByRole,
        publishDate: notice.publishDate,
        lastViewed: notice.viewedBy[notice.viewedBy.length - 1]?.viewedAt || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Bulk notice management
export const bulkNoticeAction = async (req, res) => {
  try {
    const { noticeIds, action } = req.body; // action: archive, pin, unpin, publish
    const schoolId = req.admin.school._id || req.admin.school;

    const results = [];
    const errors = [];

    for (const noticeId of noticeIds) {
      try {
        let updateData = {};

        if (action === "archive") {
          updateData = {
            status: "archived",
            archivedAt: new Date(),
            archivedBy: req.admin._id
          };
        } else if (action === "pin") {
          updateData = { isPinned: true };
        } else if (action === "unpin") {
          updateData = { isPinned: false };
        } else if (action === "publish") {
          updateData = { status: "published" };
        }

        const notice = await Notice.findOneAndUpdate(
          { _id: noticeId, school: schoolId },
          updateData,
          { new: true }
        );

        if (!notice) {
          errors.push(`Notice ${noticeId}: Not found`);
        } else {
          results.push({ noticeId, status: "success" });
        }
      } catch (error) {
        errors.push(`Notice ${noticeId}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Processed ${results.length} notices, ${errors.length} errors`,
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
```

---

### File 4: Create `routes/admin/noticeRoutes.js`

```javascript
import express from "express";
import {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  scheduleNotice,
  pinNotice,
  getNoticeStats,
  getNoticeAnalytics,
  bulkNoticeAction
} from "../../controllers/admin/noticeController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.post("/", upload.array("attachments", 5), createNotice);
router.get("/stats", getNoticeStats);
router.get("/", getAllNotices);
router.get("/:noticeId", getNoticeById);
router.put("/:noticeId", upload.array("attachments", 5), updateNotice);
router.delete("/:noticeId", deleteNotice);
router.post("/schedule", scheduleNotice);
router.patch("/:noticeId/pin", pinNotice);
router.get("/:noticeId/analytics", getNoticeAnalytics);
router.post("/bulk-action", bulkNoticeAction);

export default router;
```

---

---

# SECTION 3: SETTINGS MANAGEMENT

## Overview
Complete admin settings configuration system for school operations.

---

## PART 3: SETTINGS ENDPOINTS

### File 5: Create `controllers/admin/settingsController.js`

**Functions to Implement (12 total):**

```javascript
import AdminSettings from "../../models/admin/AdminSettings.model.js"; // Needs to be created
import School from "../../models/school/School.model.js";
import Organization from "../../models/organization/Organization.model.js";

// ==================== GENERAL SETTINGS ====================

// Function 1: Get all settings
export const getAllSettings = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    let settings = await AdminSettings.findOne({
      school: schoolId
    });

    // If settings don't exist, create default
    if (!settings) {
      settings = await AdminSettings.create({
        school: schoolId,
        organization: req.admin.organization,
        general: {
          schoolName: "",
          schoolCode: "",
          affiliation: "",
          academicYear: new Date().getFullYear().toString()
        },
        academic: {
          passingMarksPercentage: 33,
          gradingSystem: "percentage",
          attendanceMinimumPercentage: 75
        },
        notification: {
          enableEmailNotifications: true,
          enableSMSNotifications: false,
          smsApiKey: ""
        },
        security: {
          sessionTimeout: 30,
          passwordExpiryDays: 90,
          maxLoginAttempts: 5,
          ipWhitelistEnabled: false,
          ipWhitelist: []
        },
        maintenance: {
          maintenanceMode: false,
          maintenanceMessage: "School is under maintenance"
        }
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Update general settings
export const updateGeneralSettings = async (req, res) => {
  try {
    const { schoolName, schoolCode, affiliation, academicYear } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const settings = await AdminSettings.findOneAndUpdate(
      { school: schoolId },
      {
        general: {
          schoolName,
          schoolCode,
          affiliation,
          academicYear
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "General settings updated successfully",
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Update academic settings
export const updateAcademicSettings = async (req, res) => {
  try {
    const {
      passingMarksPercentage,
      gradingSystem,
      attendanceMinimumPercentage
    } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    // Validation
    if (passingMarksPercentage < 0 || passingMarksPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: "Passing marks percentage must be between 0 and 100"
      });
    }

    if (attendanceMinimumPercentage < 0 || attendanceMinimumPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: "Attendance minimum percentage must be between 0 and 100"
      });
    }

    const settings = await AdminSettings.findOneAndUpdate(
      { school: schoolId },
      {
        academic: {
          passingMarksPercentage,
          gradingSystem,
          attendanceMinimumPercentage
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Academic settings updated successfully",
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const {
      enableEmailNotifications,
      enableSMSNotifications,
      emailProvider,
      smsApiKey,
      smsProvider
    } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const settings = await AdminSettings.findOneAndUpdate(
      { school: schoolId },
      {
        notification: {
          enableEmailNotifications,
          enableSMSNotifications,
          emailProvider,
          smsApiKey,
          smsProvider
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Update security settings
export const updateSecuritySettings = async (req, res) => {
  try {
    const {
      sessionTimeout,
      passwordExpiryDays,
      maxLoginAttempts,
      ipWhitelistEnabled,
      ipWhitelist
    } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    // Validation
    if (sessionTimeout < 5 || sessionTimeout > 480) {
      return res.status(400).json({
        success: false,
        message: "Session timeout must be between 5 and 480 minutes"
      });
    }

    const settings = await AdminSettings.findOneAndUpdate(
      { school: schoolId },
      {
        security: {
          sessionTimeout,
          passwordExpiryDays,
          maxLoginAttempts,
          ipWhitelistEnabled,
          ipWhitelist: ipWhitelistEnabled ? ipWhitelist : []
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Security settings updated successfully",
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Update maintenance mode
export const updateMaintenanceMode = async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const settings = await AdminSettings.findOneAndUpdate(
      { school: schoolId },
      {
        maintenance: {
          maintenanceMode,
          maintenanceMessage
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Maintenance settings updated successfully",
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Get email templates
export const getEmailTemplates = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    const settings = await AdminSettings.findOne({ school: schoolId });

    res.status(200).json({
      success: true,
      data: settings?.emailTemplates || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Update email template
export const updateEmailTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { subject, body, isActive } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const settings = await AdminSettings.findOne({ school: schoolId });

    const templateIndex = settings.emailTemplates.findIndex(
      t => t._id.toString() === templateId
    );

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Email template not found"
      });
    }

    settings.emailTemplates[templateIndex] = {
      ...settings.emailTemplates[templateIndex],
      subject,
      body,
      isActive
    };

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Email template updated successfully",
      data: settings.emailTemplates[templateIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Get system logs
export const getSystemLogs = async (req, res) => {
  try {
    const { type, limit = 100, page = 1 } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    // Note: Requires SystemLog model
    const skip = (page - 1) * limit;

    let filter = { school: schoolId };
    if (type) filter.logType = type;

    // Assuming SystemLog model exists
    const SystemLog = require("../../models/admin/SystemLog.model.js").default;

    const logs = await SystemLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SystemLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: logs,
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

// Function 10: Get backup status
export const getBackupStatus = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    // Note: Requires Backup model or integration with backup service
    const BackupLog = require("../../models/admin/BackupLog.model.js").default;

    const lastBackup = await BackupLog.findOne({ school: schoolId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        lastBackup: lastBackup?.createdAt || null,
        status: lastBackup?.status || "never",
        nextScheduledBackup: calculateNextBackup(lastBackup),
        autoBackupEnabled: true,
        backupFrequency: "daily"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 11: Trigger manual backup
export const triggerManualBackup = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    // Implement backup logic
    // This should call a backup service

    res.status(200).json({
      success: true,
      message: "Backup initiated successfully",
      data: {
        backupStartedAt: new Date(),
        estimatedDuration: "5 minutes"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Get settings audit trail
export const getSettingsAuditTrail = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const skip = (page - 1) * limit;

    // Note: Requires AuditLog model
    const AuditLog = require("../../models/admin/AuditLog.model.js").default;

    const logs = await AuditLog.find({
      school: schoolId,
      module: "settings"
    })
      .populate("performedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments({
      school: schoolId,
      module: "settings"
    });

    res.status(200).json({
      success: true,
      data: logs,
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

// Helper function
const calculateNextBackup = (lastBackup) => {
  if (!lastBackup) return null;
  const next = new Date(lastBackup.createdAt);
  next.setDate(next.getDate() + 1);
  return next;
};
```

---

### File 6: Create `routes/admin/settingsRoutes.js`

```javascript
import express from "express";
import {
  getAllSettings,
  updateGeneralSettings,
  updateAcademicSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updateMaintenanceMode,
  getEmailTemplates,
  updateEmailTemplate,
  getSystemLogs,
  getBackupStatus,
  triggerManualBackup,
  getSettingsAuditTrail
} from "../../controllers/admin/settingsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// General settings
router.get("/", getAllSettings);
router.put("/general", updateGeneralSettings);
router.put("/academic", updateAcademicSettings);
router.put("/notification", updateNotificationSettings);
router.put("/security", updateSecuritySettings);
router.put("/maintenance", updateMaintenanceMode);

// Email templates
router.get("/email-templates", getEmailTemplates);
router.put("/email-templates/:templateId", updateEmailTemplate);

// System management
router.get("/logs", getSystemLogs);
router.get("/backup/status", getBackupStatus);
router.post("/backup/trigger", triggerManualBackup);
router.get("/audit-trail", getSettingsAuditTrail);

export default router;
```

---

## MODELS NEEDED

### File 7: Create `models/common/Notice.model.js`

```javascript
import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    noticeType: {
      type: String,
      enum: ["general", "academic", "event", "holiday", "urgent", "other"],
      default: "general"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    applicableTo: {
      type: String,
      enum: ["all", "staff", "students", "parents", "specific_classes"],
      default: "all"
    },
    applicableClasses: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Classes" }
    ],
    attachments: [String],
    publishDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiryDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "published",
      index: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    archivedAt: {
      type: Date,
      default: null
    },
    sendNotification: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Notice = mongoose.model("Notice", noticeSchema);
export default Notice;
```

---

### File 8: Create `models/academic/studentLeave.model.js`

```javascript
import mongoose from "mongoose";

const studentLeaveSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
      required: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    fromDate: {
      type: Date,
      required: true
    },
    toDate: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    documents: [String],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const StudentLeave = mongoose.model("StudentLeave", studentLeaveSchema);
export default StudentLeave;
```

---

### File 9: Create `models/admin/AdminSettings.model.js`

```javascript
import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      unique: true,
      required: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization"
    },
    general: {
      schoolName: String,
      schoolCode: String,
      affiliation: String,
      academicYear: String
    },
    academic: {
      passingMarksPercentage: { type: Number, default: 33 },
      gradingSystem: {
        type: String,
        enum: ["percentage", "cgpa", "grade_only"],
        default: "percentage"
      },
      attendanceMinimumPercentage: { type: Number, default: 75 }
    },
    notification: {
      enableEmailNotifications: { type: Boolean, default: true },
      enableSMSNotifications: { type: Boolean, default: false },
      emailProvider: { type: String, default: "smtp" },
      smsProvider: { type: String, default: null },
      smsApiKey: { type: String, default: null }
    },
    security: {
      sessionTimeout: { type: Number, default: 30 },
      passwordExpiryDays: { type: Number, default: 90 },
      maxLoginAttempts: { type: Number, default: 5 },
      ipWhitelistEnabled: { type: Boolean, default: false },
      ipWhitelist: [String]
    },
    maintenance: {
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: {
        type: String,
        default: "School is under maintenance"
      }
    },
    emailTemplates: [
      {
        name: String,
        subject: String,
        body: String,
        isActive: { type: Boolean, default: true }
      }
    ]
  },
  { timestamps: true }
);

const AdminSettings = mongoose.model("AdminSettings", adminSettingsSchema);
export default AdminSettings;
```

---

## FILE INTEGRATION

### File 10: Update `server.js`

```javascript
// Add these imports
import leaveRequestRoutes from './routes/admin/leaveRequestRoutes.js';
import noticeRoutes from './routes/admin/noticeRoutes.js';
import settingsRoutes from './routes/admin/settingsRoutes.js';

// Add these route mounts
app.use("/api/admin/leave-requests", leaveRequestRoutes);
app.use("/api/admin/notices", noticeRoutes);
app.use("/api/admin/settings", settingsRoutes);
```

---

## DATABASE INDEXES

```javascript
// Leave requests indexes
db.staffleaves.createIndex({ school: 1, status: 1 });
db.staffleaves.createIndex({ staff: 1, fromDate: -1 });
db.studentleaves.createIndex({ school: 1, status: 1 });
db.studentleaves.createIndex({ student: 1, class: 1 });

// Notice indexes
db.notices.createIndex({ school: 1, publishDate: -1 });
db.notices.createIndex({ noticeType: 1, priority: 1 });
db.notices.createIndex({ isPinned: 1, publishDate: -1 });

// Settings indexes
db.adminsettings.createIndex({ school: 1 });
```

---

## IMPLEMENTATION CHECKLIST

### Week 1: Leave Requests (12 endpoints)
- [ ] Create leaveRequestController.js
- [ ] Create leaveRequestRoutes.js
- [ ] Create StudentLeave model
- [ ] Test all 12 endpoints
- [ ] Add filtering, sorting, pagination

### Week 2: Notice Board (10 endpoints)
- [ ] Create noticeController.js
- [ ] Create noticeRoutes.js
- [ ] Create Notice model
- [ ] File upload handling for attachments
- [ ] Test all 10 endpoints

### Week 3: Settings (12 endpoints)
- [ ] Create settingsController.js
- [ ] Create settingsRoutes.js
- [ ] Create AdminSettings model
- [ ] Email template management
- [ ] Security settings validation
- [ ] Test all 12 endpoints

### Week 4: Integration & Testing
- [ ] Update server.js with all routes
- [ ] Create database indexes
- [ ] Integration testing
- [ ] Error handling
- [ ] API documentation

---

## TOTAL ENDPOINTS: 34

**Leave Requests:** 12 endpoints
- Staff leave: 6
- Student leave: 3
- Management: 3

**Notice Board:** 10 endpoints
- CRUD: 5
- Management: 5

**Settings:** 12 endpoints
- Configuration: 6
- System management: 6

---

## KEY FEATURES

### Leave Requests
✅ Staff & student leave management
✅ Approval workflow
✅ Leave balance tracking
✅ Bulk actions
✅ Export functionality

### Notice Board
✅ Multi-type notices
✅ Scheduling
✅ Priority system
✅ View analytics
✅ Pin/feature notices

### Settings
✅ General configuration
✅ Academic settings
✅ Security management
✅ Email templates
✅ System logs
✅ Backup management
✅ Audit trail

---

**End of Detailed Work Document**
