# ADMIN STAFF & STUDENT BACKEND - DETAILED IMPLEMENTATION WORK
## Complete Task Breakdown with Code Structure

**Document Date:** April 30, 2026  
**Total Modules:** Staff & Student Management  
**Estimated Duration:** 5 weeks

---

# SECTION A: STAFF MANAGEMENT SYSTEM

## PART 1: BASIC STAFF CRUD OPERATIONS

### File 1: Create `controllers/admin/staffController.js`

**Functions to Implement (8 total):**

```javascript
import Teacher from "../../models/users/teacher.model.js";
import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import mongoose from "mongoose";
import { generateStaffCredentials, sendStaffCredentialsEmail } from "../../utils/generateCredentials.js";

// Function 1: Add/Create new staff member
export const addStaff = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      department,
      designation,
      employmentType, // permanent, contractual, temporary
      joiningDate,
      salary,
      qualifications, // Array of qualification objects
      experience, // Array of experience objects
      emergencyContact,
      aadharNumber,
      panNumber,
      bankDetails
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;
    const organizationId = req.admin.organization;

    // Validation
    if (!firstName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "First name, email, and phone are required"
      });
    }

    // Check if email already exists
    const existingStaff = await Teacher.findOne({ email, school: schoolId });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    // Generate credentials
    const credentials = generateStaffCredentials(firstName, lastName);

    // Create staff record (using Teacher model or new Staff model)
    const newStaff = await Teacher.create({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      password: credentials.hashedPassword, // Will be hashed by schema
      dateOfBirth,
      gender,
      address,
      school: schoolId,
      organization: organizationId,
      role: "staff", // or specific role: "teacher", "admin_staff", etc.
      department,
      designation,
      employmentType,
      joiningDate: new Date(joiningDate),
      salary,
      qualifications,
      experience,
      emergencyContact,
      aadharNumber,
      panNumber,
      bankDetails,
      status: "active",
      createdBy: req.admin._id,
      profilePhoto: req.file ? req.file.path : null
    });

    // Send credentials email
    await sendStaffCredentialsEmail(
      email,
      firstName,
      credentials.username,
      credentials.password
    );

    res.status(201).json({
      success: true,
      message: "Staff member added successfully",
      data: {
        staffId: newStaff._id,
        name: newStaff.fullName,
        email: newStaff.email,
        designation: newStaff.designation,
        message: "Credentials sent to email"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get all staff members
export const getAllStaff = async (req, res) => {
  try {
    const {
      department,
      designation,
      status,
      employmentType,
      searchQuery,
      sortBy,
      page = 1,
      limit = 10
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    // Build filter
    let filter = { school: schoolId, role: "staff" };

    if (department) filter.department = department;
    if (designation) filter.designation = designation;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;

    // Search query (name, email, phone)
    if (searchQuery) {
      filter.$or = [
        { firstName: { $regex: searchQuery, $options: "i" } },
        { lastName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sortBy === "name") sortOption = { firstName: 1 };
    if (sortBy === "date") sortOption = { joiningDate: -1 };
    if (sortBy === "designation") sortOption = { designation: 1 };

    // Pagination
    const skip = (page - 1) * limit;

    const staff = await Teacher.find(filter)
      .select("-password")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Teacher.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: staff,
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

// Function 3: Get staff member by ID
export const getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const staff = await Teacher.findOne({
      _id: staffId,
      school: schoolId,
      role: "staff"
    })
      .select("-password")
      .populate("department", "departmentName")
      .populate("designation", "designationName");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Update staff profile
export const updateStaffProfile = async (req, res) => {
  try {
    const { staffId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;
    const updateData = req.body;

    // Fields that cannot be updated directly
    const restrictedFields = ["password", "email", "role", "school"];
    restrictedFields.forEach(field => delete updateData[field]);

    // Update profile photo if provided
    if (req.file) {
      updateData.profilePhoto = req.file.path;
    }

    const updatedStaff = await Teacher.findOneAndUpdate(
      { _id: staffId, school: schoolId },
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff profile updated successfully",
      data: updatedStaff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Update staff status
export const updateStaffStatus = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status, reason } = req.body; // status: active, inactive, on_leave, suspended
    const schoolId = req.admin.school._id || req.admin.school;

    const validStatuses = ["active", "inactive", "on_leave", "suspended"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided"
      });
    }

    const updatedStaff = await Teacher.findOneAndUpdate(
      { _id: staffId, school: schoolId },
      {
        status,
        statusReason: reason,
        statusChangedAt: new Date(),
        statusChangedBy: req.admin._id
      },
      { new: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Staff status changed to ${status}`,
      data: updatedStaff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Delete/Archive staff
export const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    // Archive instead of delete (soft delete)
    const deletedStaff = await Teacher.findOneAndUpdate(
      { _id: staffId, school: schoolId },
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.admin._id,
        status: "inactive"
      },
      { new: true }
    );

    if (!deletedStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff member archived successfully",
      data: { staffId: deletedStaff._id, name: deletedStaff.fullName }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Bulk staff import (CSV)
export const bulkStaffImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const csv = require("csv-parse/sync");
    const fileContent = req.file.buffer.toString();
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const results = [];
    const errors = [];

    for (const [index, record] of records.entries()) {
      try {
        // Validate required fields
        if (!record.firstName || !record.email || !record.phone) {
          errors.push(`Row ${index + 1}: Missing required fields`);
          continue;
        }

        // Check if email exists
        const existingStaff = await Teacher.findOne({ email: record.email });
        if (existingStaff) {
          errors.push(`Row ${index + 1}: Email already exists`);
          continue;
        }

        // Generate credentials
        const credentials = generateStaffCredentials(record.firstName, record.lastName);

        // Create staff
        const newStaff = await Teacher.create({
          firstName: record.firstName,
          lastName: record.lastName || "",
          fullName: `${record.firstName} ${record.lastName || ""}`,
          email: record.email,
          phone: record.phone,
          password: credentials.hashedPassword,
          department: record.department || null,
          designation: record.designation || null,
          employmentType: record.employmentType || "permanent",
          joiningDate: new Date(record.joiningDate),
          school: req.admin.school._id || req.admin.school,
          organization: req.admin.organization,
          role: "staff",
          status: "active",
          createdBy: req.admin._id
        });

        results.push({
          rowNumber: index + 1,
          staffId: newStaff._id,
          name: newStaff.fullName,
          status: "success"
        });
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Imported ${results.length} staff members, ${errors.length} errors`,
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

// Function 8: Get staff dashboard stats
export const getStaffStats = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    const stats = await Promise.all([
      Teacher.countDocuments({ school: schoolId, role: "staff" }),
      Teacher.countDocuments({ school: schoolId, role: "staff", status: "active" }),
      Teacher.countDocuments({ school: schoolId, role: "staff", status: "inactive" }),
      Teacher.countDocuments({ school: schoolId, role: "staff", employmentType: "permanent" }),
      Teacher.countDocuments({ school: schoolId, role: "staff", employmentType: "contractual" })
    ]);

    const [total, active, inactive, permanent, contractual] = stats;

    res.status(200).json({
      success: true,
      data: {
        totalStaff: total,
        activeStaff: active,
        inactiveStaff: inactive,
        permanentStaff: permanent,
        contractualStaff: contractual,
        trends: {
          activePercentage: ((active / total) * 100).toFixed(2),
          permanentPercentage: ((permanent / total) * 100).toFixed(2)
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
```

---

### File 2: Create `routes/admin/staffRoutes.js`

```javascript
import express from "express";
import {
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaffProfile,
  updateStaffStatus,
  deleteStaff,
  bulkStaffImport,
  getStaffStats
} from "../../controllers/admin/staffController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// Staff CRUD
router.post("/", upload.single("profilePhoto"), addStaff);
router.get("/stats", getStaffStats);
router.get("/", getAllStaff);
router.get("/:staffId", getStaffById);
router.put("/:staffId", upload.single("profilePhoto"), updateStaffProfile);
router.patch("/:staffId/status", updateStaffStatus);
router.delete("/:staffId", deleteStaff);

// Bulk operations
router.post("/bulk/import", upload.single("file"), bulkStaffImport);

export default router;
```

---

## PART 2: STAFF ATTENDANCE & LEAVE MANAGEMENT

### File 3: Create `controllers/admin/staffAttendanceController.js`

**Functions to Implement (6 total):**

```javascript
import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import StaffLeave from "../../models/HRM/Staffleave.model.js";
import Teacher from "../../models/users/teacher.model.js";

// Function 1: Mark staff attendance
export const markStaffAttendance = async (req, res) => {
  try {
    const {
      date,
      entries, // [{ staffId, status, remarks }]
      attendanceType // "office" or "work_from_home"
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    // Validate date not in future
    if (new Date(date) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark attendance for future dates"
      });
    }

    // Check if attendance already marked for this date
    const existing = await StaffAttendance.findOne({
      school: schoolId,
      date: new Date(date)
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this date"
      });
    }

    // Create attendance record
    const attendance = await StaffAttendance.create({
      school: schoolId,
      organization: req.admin.organization,
      date: new Date(date),
      attendanceType,
      entries: entries.map(entry => ({
        staff: entry.staffId,
        status: entry.status, // present, absent, on_leave, half_day, sick_leave
        remarks: entry.remarks,
        markedAt: new Date()
      })),
      markedBy: req.admin._id,
      markedByRole: "admin",
      totalPresent: entries.filter(e => e.status === "present").length,
      totalAbsent: entries.filter(e => e.status === "absent").length
    });

    res.status(201).json({
      success: true,
      message: "Staff attendance marked successfully",
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get staff attendance report
export const getStaffAttendanceReport = async (req, res) => {
  try {
    const {
      staffId,
      fromDate,
      toDate,
      month,
      year
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        date: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate)
        }
      };
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Get attendance records
    const attendance = await StaffAttendance.find({
      school: schoolId,
      ...dateFilter
    })
      .populate({
        path: "entries.staff",
        select: "fullName email designation"
      });

    // Calculate report
    const reportData = new Map();

    attendance.forEach(record => {
      record.entries.forEach(entry => {
        const key = entry.staff._id.toString();
        if (!reportData.has(key)) {
          reportData.set(key, {
            staffId: entry.staff._id,
            name: entry.staff.fullName,
            designation: entry.staff.designation,
            present: 0,
            absent: 0,
            halfDay: 0,
            onLeave: 0,
            sickLeave: 0,
            totalDaysMarked: 0,
            percentage: 0
          });
        }

        const data = reportData.get(key);
        data.totalDaysMarked++;

        if (entry.status === "present") data.present++;
        if (entry.status === "absent") data.absent++;
        if (entry.status === "half_day") data.halfDay++;
        if (entry.status === "on_leave") data.onLeave++;
        if (entry.status === "sick_leave") data.sickLeave++;

        data.percentage = ((data.present + data.halfDay * 0.5) / data.totalDaysMarked) * 100;
      });
    });

    const report = Array.from(reportData.values());

    res.status(200).json({
      success: true,
      data: {
        reportPeriod: {
          from: fromDate || `${year}-${month}`,
          to: toDate || `${year}-${month}`
        },
        totalStaffMarked: report.length,
        staffReport: report
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Request staff leave
export const requestStaffLeave = async (req, res) => {
  try {
    const {
      staffId,
      fromDate,
      toDate,
      leaveType, // casual, medical, earned, unpaid
      reason,
      documents // Array of file paths
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    // Validate dates
    if (new Date(fromDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot request leave for past dates"
      });
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Check existing leave conflict
    const conflictingLeave = await StaffLeave.findOne({
      staff: staffId,
      school: schoolId,
      status: { $in: ["approved", "pending"] },
      $or: [
        { fromDate: { $lte: toDate }, toDate: { $gte: fromDate } }
      ]
    });

    if (conflictingLeave) {
      return res.status(409).json({
        success: false,
        message: "Staff already has overlapping leave"
      });
    }

    // Calculate days
    const daysDiff = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;

    // Create leave request
    const leaveRequest = await StaffLeave.create({
      staff: staffId,
      school: schoolId,
      organization: req.admin.organization,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      leaveType,
      reason,
      numberOfDays: daysDiff,
      documents,
      status: "pending",
      requestedAt: new Date(),
      requestedBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      data: {
        leaveId: leaveRequest._id,
        numberOfDays: daysDiff,
        status: "pending"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Approve/Reject leave request
export const approveStaffLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, remarks } = req.body; // status: approved, rejected

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const leaveRequest = await StaffLeave.findByIdAndUpdate(
      leaveId,
      {
        status,
        approvedBy: req.admin._id,
        approvedAt: new Date(),
        remarks
      },
      { new: true }
    );

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Get pending leave requests
export const getPendingLeaveRequests = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    const pendingLeaves = await StaffLeave.find({
      school: schoolId,
      status: "pending"
    })
      .populate("staff", "fullName designation email")
      .sort({ requestedAt: 1 });

    res.status(200).json({
      success: true,
      count: pendingLeaves.length,
      data: pendingLeaves
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Get staff leave balance
export const getStaffLeaveBalance = async (req, res) => {
  try {
    const { staffId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    // Get approved leaves for current year
    const currentYear = new Date().getFullYear();
    const approvedLeaves = await StaffLeave.find({
      staff: staffId,
      school: schoolId,
      status: "approved",
      fromDate: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1)
      }
    });

    const totalLeavesTaken = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
    const leaveBalance = {
      casual: { allotted: 10, taken: 0, balance: 10 },
      medical: { allotted: 5, taken: 0, balance: 5 },
      earned: { allotted: 0, taken: 0, balance: 0 },
      total: { allotted: 15, taken: totalLeavesTaken, balance: 15 - totalLeavesTaken }
    };

    // Count by type
    approvedLeaves.forEach(leave => {
      if (leaveBalance[leave.leaveType]) {
        leaveBalance[leave.leaveType].taken += leave.numberOfDays;
        leaveBalance[leave.leaveType].balance -= leave.numberOfDays;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        staffId,
        year: currentYear,
        leaveBalance
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

### File 4: Create `routes/admin/staffAttendanceRoutes.js`

```javascript
import express from "express";
import {
  markStaffAttendance,
  getStaffAttendanceReport,
  requestStaffLeave,
  approveStaffLeave,
  getPendingLeaveRequests,
  getStaffLeaveBalance
} from "../../controllers/admin/staffAttendanceController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// Attendance
router.post("/mark", markStaffAttendance);
router.get("/report", getStaffAttendanceReport);

// Leave management
router.post("/leave/request", requestStaffLeave);
router.patch("/leave/:leaveId/approve", approveStaffLeave);
router.get("/leave/pending", getPendingLeaveRequests);
router.get("/leave/balance/:staffId", getStaffLeaveBalance);

export default router;
```

---

## PART 3: STAFF TRANSFER & PROMOTION

### File 5: Create `controllers/admin/staffManagementController.js`

**Functions to Implement (4 total):**

```javascript
import StaffTransfer from "../../models/HRM/StaffTransfer.model.js";
import Promotion from "../../models/HRM/Promotion.model.js";
import Teacher from "../../models/users/teacher.model.js";

// Function 1: Create transfer request
export const createTransferRequest = async (req, res) => {
  try {
    const {
      staffId,
      currentDepartment,
      newDepartment,
      reason,
      proposedDate,
      documents
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    // Validate staff exists
    const staff = await Teacher.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    // Create transfer request
    const transfer = await StaffTransfer.create({
      staff: staffId,
      school: schoolId,
      organization: req.admin.organization,
      currentDepartment,
      newDepartment,
      reason,
      proposedDate: new Date(proposedDate),
      documents,
      status: "pending",
      initiatedBy: req.admin._id,
      initiatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Transfer request created successfully",
      data: transfer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Approve/Reject transfer
export const approveTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { status, remarks, effectiveDate } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const transfer = await StaffTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer request not found"
      });
    }

    if (status === "approved") {
      // Update staff department
      await Teacher.findByIdAndUpdate(transfer.staff, {
        department: transfer.newDepartment,
        transferredAt: effectiveDate || new Date()
      });
    }

    transfer.status = status;
    transfer.approvedBy = req.admin._id;
    transfer.approvedAt = new Date();
    transfer.remarks = remarks;
    transfer.effectiveDate = effectiveDate || null;

    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Transfer ${status} successfully`,
      data: transfer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Create promotion
export const createPromotion = async (req, res) => {
  try {
    const {
      staffId,
      currentDesignation,
      newDesignation,
      currentSalary,
      newSalary,
      reason,
      effectiveDate,
      documents
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;

    // Validate staff
    const staff = await Teacher.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    const promotion = await Promotion.create({
      staff: staffId,
      school: schoolId,
      organization: req.admin.organization,
      currentDesignation,
      newDesignation,
      currentSalary,
      newSalary,
      salaryIncrease: newSalary - currentSalary,
      reason,
      effectiveDate: new Date(effectiveDate),
      documents,
      status: "approved",
      approvedBy: req.admin._id,
      approvedAt: new Date()
    });

    // Update staff designation and salary
    await Teacher.findByIdAndUpdate(staffId, {
      designation: newDesignation,
      salary: newSalary,
      promotedAt: new Date(effectiveDate)
    });

    res.status(201).json({
      success: true,
      message: "Promotion created and applied successfully",
      data: {
        promotionId: promotion._id,
        previousDesignation: currentDesignation,
        newDesignation,
        salaryIncrease: newSalary - currentSalary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Get staff transfer/promotion history
export const getStaffManagementHistory = async (req, res) => {
  try {
    const { staffId } = req.params;

    const transfers = await StaffTransfer.find({ staff: staffId })
      .sort({ initiatedAt: -1 });

    const promotions = await Promotion.find({ staff: staffId })
      .sort({ approvedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        transfers,
        promotions
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

### File 6: Create `routes/admin/staffManagementRoutes.js`

```javascript
import express from "express";
import {
  createTransferRequest,
  approveTransfer,
  createPromotion,
  getStaffManagementHistory
} from "../../controllers/admin/staffManagementController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// Transfers
router.post("/transfer/create", createTransferRequest);
router.patch("/transfer/:transferId/approve", approveTransfer);

// Promotions
router.post("/promotion/create", createPromotion);

// History
router.get("/:staffId/history", getStaffManagementHistory);

export default router;
```

---

# SECTION B: STUDENT MANAGEMENT SYSTEM

## PART 4: BASIC STUDENT CRUD OPERATIONS

### File 7: Create `controllers/admin/studentController.js`

**Functions to Implement (8 total):**

```javascript
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";
import Class from "../../models/superAdmin/Class.model.js";
import { generateStudentCredentials, sendStudentCredentialsEmail } from "../../utils/generateCredentials.js";

// Function 1: Add/Create new student
export const addStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      classId,
      section,
      rollNumber,
      parentContact,
      aadharNumber,
      medicalHistory,
      previousSchool,
      admissionDate
    } = req.body;

    const schoolId = req.admin.school._id || req.admin.school;
    const organizationId = req.admin.organization;

    // Validation
    if (!firstName || !email || !classId) {
      return res.status(400).json({
        success: false,
        message: "First name, email, and class are required"
      });
    }

    // Check if email already exists
    const existingStudent = await User.findOne({ email, school: schoolId });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    // Generate credentials
    const credentials = generateStudentCredentials(firstName, lastName);

    // Create student record
    const newStudent = await Student.create({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      password: credentials.hashedPassword,
      dateOfBirth,
      gender,
      address,
      school: schoolId,
      organization: organizationId,
      role: "student",
      class: classId,
      section,
      rollNumber,
      parentContact,
      aadharNumber,
      medicalHistory,
      previousSchool,
      admissionDate: new Date(admissionDate),
      status: "active",
      createdBy: req.admin._id,
      profilePhoto: req.file ? req.file.path : null
    });

    // Add student to class
    await Class.findByIdAndUpdate(
      classId,
      { $push: { students: newStudent._id } },
      { new: true }
    );

    // Send credentials email
    await sendStudentCredentialsEmail(
      email,
      firstName,
      credentials.username,
      credentials.password
    );

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: {
        studentId: newStudent._id,
        name: newStudent.fullName,
        email: newStudent.email,
        rollNumber: newStudent.rollNumber,
        message: "Credentials sent to email"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get all students
export const getAllStudents = async (req, res) => {
  try {
    const {
      classId,
      section,
      status,
      searchQuery,
      sortBy,
      page = 1,
      limit = 10
    } = req.query;

    const schoolId = req.admin.school._id || req.admin.school;

    // Build filter
    let filter = { school: schoolId, role: "student" };

    if (classId) filter.class = classId;
    if (section) filter.section = section;
    if (status) filter.status = status;

    // Search query (name, email, roll number)
    if (searchQuery) {
      filter.$or = [
        { firstName: { $regex: searchQuery, $options: "i" } },
        { lastName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { rollNumber: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sortBy === "name") sortOption = { firstName: 1 };
    if (sortBy === "rollNumber") sortOption = { rollNumber: 1 };

    // Pagination
    const skip = (page - 1) * limit;

    const students = await Student.find(filter)
      .select("-password")
      .populate("class", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: students,
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

// Function 3: Get student by ID
export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
      role: "student"
    })
      .select("-password")
      .populate("class", "name")
      .populate("parentContact");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Update student profile
export const updateStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;
    const updateData = req.body;

    // Fields that cannot be updated
    const restrictedFields = ["password", "email", "role", "school", "admissionDate"];
    restrictedFields.forEach(field => delete updateData[field]);

    // Update profile photo if provided
    if (req.file) {
      updateData.profilePhoto = req.file.path;
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: studentId, school: schoolId },
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Student profile updated successfully",
      data: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Update student status
export const updateStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, reason } = req.body; // status: active, inactive, transferred, left
    const schoolId = req.admin.school._id || req.admin.school;

    const validStatuses = ["active", "inactive", "transferred", "left"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided"
      });
    }

    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // If status is transferred or left, remove from current class
    if (["transferred", "left"].includes(status)) {
      await Class.findByIdAndUpdate(
        student.class,
        { $pull: { students: studentId } }
      );
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        status,
        statusReason: reason,
        statusChangedAt: new Date(),
        statusChangedBy: req.admin._id
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Student status changed to ${status}`,
      data: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Transfer student to different class
export const transferStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { newClassId, newSection, reason } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const previousClass = student.class;

    // Remove from current class
    await Class.findByIdAndUpdate(
      previousClass,
      { $pull: { students: studentId } }
    );

    // Add to new class
    await Class.findByIdAndUpdate(
      newClassId,
      { $push: { students: studentId } }
    );

    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        class: newClassId,
        section: newSection,
        transferredAt: new Date(),
        transferReason: reason,
        status: "active"
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Student transferred successfully",
      data: {
        studentId: updatedStudent._id,
        previousClass,
        newClass: newClassId,
        newSection
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Delete/Archive student
export const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Remove from class
    await Class.findByIdAndUpdate(
      student.class,
      { $pull: { students: studentId } }
    );

    // Archive student
    const deletedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.admin._id,
        status: "inactive"
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Student archived successfully",
      data: { studentId: deletedStudent._id, name: deletedStudent.fullName }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Bulk student import (CSV)
export const bulkStudentImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const csv = require("csv-parse/sync");
    const fileContent = req.file.buffer.toString();
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const results = [];
    const errors = [];
    const schoolId = req.admin.school._id || req.admin.school;

    for (const [index, record] of records.entries()) {
      try {
        // Validate required fields
        if (!record.firstName || !record.email || !record.classId) {
          errors.push(`Row ${index + 1}: Missing required fields`);
          continue;
        }

        // Check if email exists
        const existingStudent = await User.findOne({ email: record.email });
        if (existingStudent) {
          errors.push(`Row ${index + 1}: Email already exists`);
          continue;
        }

        // Generate credentials
        const credentials = generateStudentCredentials(record.firstName, record.lastName || "");

        // Create student
        const newStudent = await Student.create({
          firstName: record.firstName,
          lastName: record.lastName || "",
          fullName: `${record.firstName} ${record.lastName || ""}`,
          email: record.email,
          phone: record.phone || "",
          password: credentials.hashedPassword,
          school: schoolId,
          organization: req.admin.organization,
          role: "student",
          class: record.classId,
          section: record.section || "",
          rollNumber: record.rollNumber || "",
          dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth) : null,
          gender: record.gender || "",
          status: "active",
          admissionDate: new Date(),
          createdBy: req.admin._id
        });

        // Add to class
        await Class.findByIdAndUpdate(
          record.classId,
          { $push: { students: newStudent._id } }
        );

        results.push({
          rowNumber: index + 1,
          studentId: newStudent._id,
          name: newStudent.fullName,
          status: "success"
        });
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Imported ${results.length} students, ${errors.length} errors`,
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

### File 8: Create `routes/admin/studentRoutes.js`

```javascript
import express from "express";
import {
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudentProfile,
  updateStudentStatus,
  transferStudent,
  deleteStudent,
  bulkStudentImport
} from "../../controllers/admin/studentController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// Student CRUD
router.post("/", upload.single("profilePhoto"), addStudent);
router.get("/", getAllStudents);
router.get("/:studentId", getStudentById);
router.put("/:studentId", upload.single("profilePhoto"), updateStudentProfile);
router.patch("/:studentId/status", updateStudentStatus);
router.patch("/:studentId/transfer", transferStudent);
router.delete("/:studentId", deleteStudent);

// Bulk operations
router.post("/bulk/import", upload.single("file"), bulkStudentImport);

export default router;
```

---

## PART 5: STUDENT DOCUMENTS & REGISTRATION

### File 9: Create `controllers/admin/studentDocumentsController.js`

**Functions to Implement (4 total):**

```javascript
import Student from "../../models/users/student.model.js";
import StudentDocument from "../../models/common/StudentDocument.model.js"; // Needs to be created

// Function 1: Upload student documents
export const uploadStudentDocuments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { documentType } = req.body; // photo, certificate, transfer_cert, etc.
    const schoolId = req.admin.school._id || req.admin.school;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const document = await StudentDocument.create({
      student: studentId,
      school: schoolId,
      documentType,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.admin._id,
      uploadedAt: new Date()
    });

    // Update student profile photo if document is photo
    if (documentType === "photo") {
      await Student.findByIdAndUpdate(studentId, {
        profilePhoto: req.file.path
      });
    }

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get student documents
export const getStudentDocuments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { documentType } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    let filter = { student: studentId, school: schoolId };
    if (documentType) filter.documentType = documentType;

    const documents = await StudentDocument.find(filter)
      .sort({ uploadedAt: -1 });

    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Delete student document
export const deleteStudentDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await StudentDocument.findByIdAndDelete(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Get student admission details
export const getStudentAdmissionDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findOne({ _id: studentId, school: schoolId })
      .populate("class", "name")
      .select("firstName lastName email phone dateOfBirth gender address class section rollNumber admissionDate previousSchool medicalHistory");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get documents
    const documents = await StudentDocument.find({ student: studentId });

    res.status(200).json({
      success: true,
      data: {
        admissionDetails: student,
        documents,
        admissionNumber: `${student._id.toString().slice(-8).toUpperCase()}`,
        admissionStatus: "completed"
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

### File 10: Create `routes/admin/studentDocumentsRoutes.js`

```javascript
import express from "express";
import {
  uploadStudentDocuments,
  getStudentDocuments,
  deleteStudentDocument,
  getStudentAdmissionDetails
} from "../../controllers/admin/studentDocumentsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.post("/:studentId/documents/upload", upload.single("document"), uploadStudentDocuments);
router.get("/:studentId/documents", getStudentDocuments);
router.delete("/document/:documentId", deleteStudentDocument);

router.get("/:studentId/admission-details", getStudentAdmissionDetails);

export default router;
```

---

## PART 6: STUDENT ATTENDANCE & ACADEMIC HISTORY

### File 11: Create `controllers/admin/studentAcademicController.js`

**Functions to Implement (5 total):**

```javascript
import Student from "../../models/users/student.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import ReportCard from "../../models/academic/reportCard.model.js";

// Function 1: Get student academic history
export const getStudentAcademicHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get all marksheets
    const marksheets = await Marksheet.find({
      student: studentId,
      school: schoolId,
      ...(academicYear && { academicYear })
    })
      .populate("examSchedule", "examName")
      .sort({ createdAt: -1 });

    // Get report cards
    const reportCards = await ReportCard.find({
      student: studentId,
      school: schoolId,
      ...(academicYear && { academicYear })
    });

    res.status(200).json({
      success: true,
      data: {
        studentInfo: {
          studentId: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class
        },
        marksheets,
        reportCards,
        totalExams: marksheets.length,
        averagePercentage: marksheets.length > 0
          ? (marksheets.reduce((sum, m) => sum + m.percentage, 0) / marksheets.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get student attendance records
export const getStudentAttendanceRecords = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { fromDate, toDate, month, year } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        date: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate)
        }
      };
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      school: schoolId,
      ...dateFilter
    }).populate({
      path: "entries",
      match: { student: studentId },
      select: "status remarks"
    });

    // Filter and process
    const studentAttendance = [];
    let presentDays = 0,
      absentDays = 0,
      lateDays = 0;

    attendanceRecords.forEach(record => {
      record.entries.forEach(entry => {
        studentAttendance.push({
          date: record.date,
          status: entry.status,
          remarks: entry.remarks
        });

        if (entry.status === "present") presentDays++;
        if (entry.status === "absent") absentDays++;
        if (entry.status === "late") lateDays++;
      });
    });

    const totalDays = studentAttendance.length;
    const attendancePercentage = totalDays > 0
      ? ((presentDays / totalDays) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        studentId,
        attendanceRecords: studentAttendance,
        summary: {
          totalDaysMarked: totalDays,
          presentDays,
          absentDays,
          lateDays,
          attendancePercentage,
          status: attendancePercentage >= 75 ? "satisfactory" : "low"
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

// Function 3: Get student marks/results
export const getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examScheduleId, academicYear } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    let filter = { student: studentId, school: schoolId };
    if (examScheduleId) filter.examSchedule = examScheduleId;
    if (academicYear) filter.academicYear = academicYear;

    const marksheets = await Marksheet.find(filter)
      .populate("examSchedule", "examStructure academicYear")
      .populate({
        path: "examSchedule",
        populate: { path: "examStructure", select: "examName" }
      });

    res.status(200).json({
      success: true,
      data: {
        studentId,
        marksheets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Get student progress report
export const getStudentProgressReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const marksheets = await Marksheet.find({
      student: studentId,
      school: schoolId,
      status: "published"
    })
      .populate("examSchedule", "examStructure")
      .populate({
        path: "examSchedule",
        populate: { path: "examStructure", select: "examName examType" }
      })
      .sort({ createdAt: 1 });

    const progressData = marksheets.map(m => ({
      exam: m.examSchedule.examStructure.examName,
      examType: m.examSchedule.examStructure.examType,
      percentage: m.percentage,
      grade: m.overallGrade,
      isPass: m.isPass,
      date: m.submittedAt
    }));

    // Calculate trend
    let trend = "stable";
    if (progressData.length >= 2) {
      const recent = progressData[progressData.length - 1].percentage;
      const previous = progressData[progressData.length - 2].percentage;
      if (recent > previous + 5) trend = "improving";
      else if (recent < previous - 5) trend = "declining";
    }

    res.status(200).json({
      success: true,
      data: {
        studentId,
        progress: progressData,
        trend,
        overallAverage: (progressData.reduce((sum, p) => sum + p.percentage, 0) / progressData.length).toFixed(2),
        totalExams: progressData.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Get student class ranking
export const getStudentClassRanking = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get all report cards for the class
    const classReportCards = await ReportCard.find({
      school: schoolId,
      class: student.class,
      academicYear,
      ...(term && { term }),
      status: "published"
    })
      .populate("student", "fullName rollNumber")
      .sort({ finalPercentage: -1 });

    // Find student's ranking
    const studentRanking = classReportCards.findIndex(
      r => r.student._id.toString() === studentId
    ) + 1;

    const studentReport = classReportCards.find(
      r => r.student._id.toString() === studentId
    );

    res.status(200).json({
      success: true,
      data: {
        studentId,
        name: student.fullName,
        class: student.class,
        classRank: studentRanking,
        totalStudentsInClass: classReportCards.length,
        percentage: studentReport?.finalPercentage || 0,
        toppers: classReportCards.slice(0, 5).map(r => ({
          rank: classReportCards.indexOf(r) + 1,
          name: r.student.fullName,
          percentage: r.finalPercentage
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
```

---

### File 12: Create `routes/admin/studentAcademicRoutes.js`

```javascript
import express from "express";
import {
  getStudentAcademicHistory,
  getStudentAttendanceRecords,
  getStudentMarks,
  getStudentProgressReport,
  getStudentClassRanking
} from "../../controllers/admin/studentAcademicController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/:studentId/academic-history", getStudentAcademicHistory);
router.get("/:studentId/attendance", getStudentAttendanceRecords);
router.get("/:studentId/marks", getStudentMarks);
router.get("/:studentId/progress", getStudentProgressReport);
router.get("/:studentId/class-ranking", getStudentClassRanking);

export default router;
```

---

## PART 7: STUDENT STATISTICS & DASHBOARD

### File 13: Create `controllers/admin/studentStatsController.js`

**Functions to Implement (3 total):**

```javascript
import Student from "../../models/users/student.model.js";
import Class from "../../models/superAdmin/Class.model.js";
import ReportCard from "../../models/academic/reportCard.model.js";
import Attendance from "../../models/academic/attendance.model.js";

// Function 1: Student enrollment statistics
export const getStudentEnrollmentStats = async (req, res) => {
  try {
    const schoolId = req.admin.school._id || req.admin.school;

    const stats = await Promise.all([
      Student.countDocuments({ school: schoolId, status: "active" }),
      Student.countDocuments({ school: schoolId, status: "inactive" }),
      Student.countDocuments({ school: schoolId, status: "transferred" }),
      Student.countDocuments({ school: schoolId, status: "left" })
    ]);

    const [active, inactive, transferred, left] = stats;
    const total = active + inactive + transferred + left;

    // Get by class
    const classList = await Class.find({ school: schoolId })
      .select("name section students");

    const classwiseEnrollment = classList.map(c => ({
      class: c.name,
      section: c.section,
      studentCount: c.students?.length || 0
    }));

    // Get by gender
    const genderStats = await Student.aggregate([
      { $match: { school: schoolId, status: "active" } },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents: total,
        active,
        inactive,
        transferred,
        left,
        percentages: {
          active: ((active / total) * 100).toFixed(2),
          inactive: ((inactive / total) * 100).toFixed(2),
          transferred: ((transferred / total) * 100).toFixed(2),
          left: ((left / total) * 100).toFixed(2)
        },
        classwiseEnrollment,
        genderDistribution: genderStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Class-wise student performance
export const getClassWisePerformance = async (req, res) => {
  try {
    const { classId, academicYear, term } = req.query;
    const schoolId = req.admin.school._json || req.admin.school;

    let filter = { school: schoolId, academicYear };
    if (classId) filter.class = classId;
    if (term) filter.term = term;

    const reportCards = await ReportCard.find(filter)
      .populate("class", "name")
      .populate("student", "fullName");

    if (reportCards.length === 0) {
      return res.status(200).json({
        success: true,
        data: { message: "No report cards found" }
      });
    }

    // Calculate stats
    const classPerformance = new Map();

    reportCards.forEach(rc => {
      const classKey = rc.class._id.toString();
      if (!classPerformance.has(classKey)) {
        classPerformance.set(classKey, {
          className: rc.class.name,
          classId: rc.class._id,
          students: [],
          averagePercentage: 0,
          passCount: 0,
          failCount: 0
        });
      }

      const classData = classPerformance.get(classKey);
      classData.students.push({
        studentName: rc.student.fullName,
        percentage: rc.finalPercentage,
        grade: rc.finalGrade,
        isPass: !rc.examSummaries.some(e => !e.isPass)
      });

      if (classData.students.every(s => s.isPass)) classData.passCount++;
      else classData.failCount++;
    });

    const result = Array.from(classPerformance.values()).map(data => ({
      ...data,
      averagePercentage: (
        data.students.reduce((sum, s) => sum + s.percentage, 0) / data.students.length
      ).toFixed(2),
      passPercentage: ((data.passCount / data.students.length) * 100).toFixed(2)
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Student attendance vs performance correlation
export const getAttendancePerformanceCorrelation = async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    // Get all students in class
    const students = await Student.find({
      school: schoolId,
      ...(classId && { class: classId }),
      status: "active"
    });

    const correlationData = [];

    for (const student of students) {
      // Get attendance percentage
      const attendanceRecords = await Attendance.find({
        school: schoolId,
        entries: { $elemMatch: { student: student._id } }
      });

      let presentDays = 0,
        totalDays = 0;
      attendanceRecords.forEach(record => {
        record.entries.forEach(entry => {
          if (entry.student.toString() === student._id.toString()) {
            totalDays++;
            if (entry.status === "present") presentDays++;
          }
        });
      });

      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Get academic performance
      const reportCard = await ReportCard.findOne({
        student: student._id,
        school: schoolId,
        academicYear
      });

      const academicPercentage = reportCard?.finalPercentage || 0;

      correlationData.push({
        studentId: student._id,
        studentName: student.fullName,
        rollNumber: student.rollNumber,
        attendancePercentage: attendancePercentage.toFixed(2),
        academicPercentage: academicPercentage.toFixed(2),
        correlation: attendancePercentage >= 75 && academicPercentage >= 75
          ? "positive"
          : attendancePercentage < 75 && academicPercentage < 75
            ? "negative"
            : "mixed"
      });
    }

    res.status(200).json({
      success: true,
      data: correlationData
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

### File 14: Create `routes/admin/studentStatsRoutes.js`

```javascript
import express from "express";
import {
  getStudentEnrollmentStats,
  getClassWisePerformance,
  getAttendancePerformanceCorrelation
} from "../../controllers/admin/studentStatsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/enrollment-stats", getStudentEnrollmentStats);
router.get("/class-performance", getClassWisePerformance);
router.get("/attendance-performance-correlation", getAttendancePerformanceCorrelation);

export default router;
```

---

## PART 8: HELPER FUNCTIONS & UTILITIES

### File 15: Update `utils/generateCredentials.js`

**Add New Functions:**

```javascript
// Generate staff credentials
export const generateStaffCredentials = (firstName, lastName) => {
  const username = `STAFF_${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}_${Date.now()}`;
  const password = generateRandomPassword(12);

  return {
    username,
    password,
    hashedPassword: hashPassword(password) // Use bcrypt
  };
};

// Generate student credentials
export const generateStudentCredentials = (firstName, lastName) => {
  const username = `STU_${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}_${Date.now()}`;
  const password = generateRandomPassword(12);

  return {
    username,
    password,
    hashedPassword: hashPassword(password)
  };
};

// Send staff credentials email
export const sendStaffCredentialsEmail = async (email, name, username, password) => {
  const emailService = require('../services/emailService.js');
  // Send email with credentials
};

// Send student credentials email
export const sendStudentCredentialsEmail = async (email, name, username, password) => {
  const emailService = require('../services/emailService.js');
  // Send email with credentials
};

// Helper function
const generateRandomPassword = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
```

---

## PART 9: ROUTE INTEGRATION

### File 16: Update `server.js`

**Add New Routes:**

```javascript
// Add these imports
import staffRoutes from './routes/admin/staffRoutes.js';
import staffAttendanceRoutes from './routes/admin/staffAttendanceRoutes.js';
import staffManagementRoutes from './routes/admin/staffManagementRoutes.js';
import studentRoutes from './routes/admin/studentRoutes.js';
import studentDocumentsRoutes from './routes/admin/studentDocumentsRoutes.js';
import studentAcademicRoutes from './routes/admin/studentAcademicRoutes.js';
import studentStatsRoutes from './routes/admin/studentStatsRoutes.js';

// Add these route mounts (after existing admin routes)
app.use("/api/admin/staff", staffRoutes);
app.use("/api/admin/staff/attendance", staffAttendanceRoutes);
app.use("/api/admin/staff/management", staffManagementRoutes);
app.use("/api/admin/students", studentRoutes);
app.use("/api/admin/students/documents", studentDocumentsRoutes);
app.use("/api/admin/students/academic", studentAcademicRoutes);
app.use("/api/admin/students/stats", studentStatsRoutes);
```

---

## MODELS NEEDED (Create if not exists)

### File 17: Create `models/common/StudentDocument.model.js`

```javascript
import mongoose from "mongoose";

const studentDocumentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    documentType: {
      type: String,
      enum: ["photo", "certificate", "transfer_cert", "medical_report", "other"],
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const StudentDocument = mongoose.model("StudentDocument", studentDocumentSchema);
export default StudentDocument;
```

---

## IMPLEMENTATION CHECKLIST

### Week 1: Staff CRUD & Attendance
- [ ] Create `staffController.js` (8 functions)
- [ ] Create `staffRoutes.js`
- [ ] Create `staffAttendanceController.js` (6 functions)
- [ ] Create `staffAttendanceRoutes.js`
- [ ] Test all 14 endpoints

### Week 2: Staff Management & Student CRUD
- [ ] Create `staffManagementController.js` (4 functions)
- [ ] Create `staffManagementRoutes.js`
- [ ] Create `studentController.js` (8 functions)
- [ ] Create `studentRoutes.js`
- [ ] Test all 12 endpoints

### Week 3: Student Documents & Academic
- [ ] Create `studentDocumentsController.js` (4 functions)
- [ ] Create `studentDocumentsRoutes.js`
- [ ] Create `studentAcademicController.js` (5 functions)
- [ ] Create `studentAcademicRoutes.js`
- [ ] Test all 9 endpoints

### Week 4: Statistics & Integration
- [ ] Create `studentStatsController.js` (3 functions)
- [ ] Create `studentStatsRoutes.js`
- [ ] Update `generateCredentials.js`
- [ ] Update `server.js` with all routes
- [ ] Create `StudentDocument.model.js`
- [ ] Test all endpoints
- [ ] Add database indexes

### Week 5: Testing & Polish
- [ ] Bulk operations testing
- [ ] CSV import validation
- [ ] Error handling
- [ ] API documentation
- [ ] Performance optimization

---

## DATABASE INDEXES NEEDED

```javascript
// Staff indexes
db.teachers.createIndex({ school: 1, role: 1 });
db.teachers.createIndex({ email: 1, school: 1 });
db.teachers.createIndex({ designation: 1, school: 1 });
db.staffattendances.createIndex({ school: 1, date: -1 });
db.staffleaves.createIndex({ staff: 1, status: 1 });

// Student indexes
db.students.createIndex({ school: 1, role: 1 });
db.students.createIndex({ email: 1, school: 1 });
db.students.createIndex({ class: 1, section: 1 });
db.students.createIndex({ rollNumber: 1, class: 1 });
db.studentdocuments.createIndex({ student: 1, documentType: 1 });
db.studentdocuments.createIndex({ school: 1, uploadedAt: -1 });
```

---

## TOTAL DELIVERABLES

**Staff Management:** 18 endpoints
- CRUD: 8
- Attendance & Leave: 6
- Transfer & Promotion: 4

**Student Management:** 20 endpoints
- CRUD: 8
- Documents: 4
- Academic History: 5
- Statistics: 3

**Total:** 38 endpoints across 7 controllers

**Estimated Timeline:** 5 weeks  
**Team Size:** 2-3 developers

---

**End of Detailed Work Document**
