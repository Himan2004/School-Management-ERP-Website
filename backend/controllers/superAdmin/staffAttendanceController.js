import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import StaffLeave from "../../models/HRM/Staffleave.model.js";
import User from "../../models/users/user.model.js";

// ════════════════════════ ATTENDANCE ════════════════════════

// Clock in
export const clockIn = async (req, res) => {
  try {
    const { staffId, school, organization } = req.body;

    if (!staffId || !school) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: staffId, school",
      });
    }

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await StaffAttendance.findOne({
      staffId,
      school,
      date: { $gte: today },
    });

    if (existingAttendance && existingAttendance.clockIn) {
      return res.status(409).json({
        success: false,
        message: "Already clocked in today",
      });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    const now = new Date();
    const earlyHour = 7; // Define as per your requirement

    let isLate = false;
    let lateByMinutes = 0;

    if (now.getHours() > earlyHour) {
      isLate = true;
      lateByMinutes = (now.getHours() - earlyHour) * 60 + now.getMinutes();
    }

    const attendance = await StaffAttendance.create({
      staffId,
      school,
      organization,
      date: today,
      clockIn: now,
      staffRole: staff.role,
      status: isLate ? "late" : "present",
      isLate,
      lateByMinutes,
    });

    res.status(201).json({
      success: true,
      message: isLate ? "Clocked in - You are late" : "Clocked in successfully",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clock out
export const clockOut = async (req, res) => {
  try {
    const { staffId, school } = req.body;

    if (!staffId || !school) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await StaffAttendance.findOne({
      staffId,
      school,
      date: { $gte: today },
      clockIn: { $exists: true },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No clock-in record found for today",
      });
    }

    if (attendance.clockOut) {
      return res.status(409).json({
        success: false,
        message: "Already clocked out",
      });
    }

    const now = new Date();
    const totalHours =
      (now.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60);
    const standardHours = 8;
    const overtimeHours =
      totalHours > standardHours ? totalHours - standardHours : 0;

    attendance.clockOut = now;
    attendance.totalHours = Math.round(totalHours * 100) / 100;
    attendance.overtimeHours = Math.round(overtimeHours * 100) / 100;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Clocked out successfully",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance record
export const getAttendance = async (req, res) => {
  try {
    const { staffId, school, startDate, endDate } = req.query;

    const filter = {};
    if (req.role === 'superadmin' && req.user) {
      filter.organization = req.user._id;
    }
    
    if (staffId) filter.staffId = staffId;
    if (school) filter.school = school;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await StaffAttendance.find(filter)
      .populate("staffId", "name email role")
      .populate("school", "schoolName")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance summary for school/organization
export const getAttendanceSummary = async (req, res) => {
  try {
    const { school, organization, date } = req.query;
    const filter = {};
    if (req.role === 'superadmin' && req.user) {
      filter.organization = req.user._id;
    } else if (organization) {
      filter.organization = organization;
    }

    if (school) filter.school = school;
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(queryDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter.date = { $gte: queryDate, $lt: nextDate };
    }

    const summary = await StaffAttendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await StaffAttendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        total,
        breakdown: summary,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark attendance manually (for admin)
export const markAttendance = async (req, res) => {
  try {
    const { staffId, school, organization, date, status, remarks } = req.body;

    if (!staffId || !school || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    let attendance = await StaffAttendance.findOne({
      staffId,
      school,
      date: queryDate,
    });

    if (attendance) {
      attendance.status = status;
      attendance.remarks = remarks;
      await attendance.save();
    } else {
      attendance = await StaffAttendance.create({
        staffId,
        school,
        organization,
        date: queryDate,
        status,
        staffRole: staff.role,
        remarks,
        markedBy: req.user?._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════ LEAVES ════════════════════════

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const {
      staffId,
      school,
      organization,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      isHalfDay,
      reason,
      remarks,
    } = req.body;

    if (!staffId || !leaveType || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    // Check for overlapping leaves
    const overlappingLeave = await StaffLeave.findOne({
      staffId,
      status: { $in: ["pending", "approved"] },
      fromDate: { $lte: new Date(toDate) },
      toDate: { $gte: new Date(fromDate) },
    });

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message: "Leave already exists for selected dates",
      });
    }

    const leave = await StaffLeave.create({
      staffId,
      school,
      organization,
      leaveType,
      fromDate,
      toDate,
      totalDays: totalDays || 1,
      isHalfDay: isHalfDay || false,
      reason,
      remarks,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Leave request created successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave requests
export const getLeaveRequests = async (req, res) => {
  try {
    const { staffId, school, organization, status } = req.query;
    const filter = {};
    if (req.role === 'superadmin' && req.user) {
      filter.organization = req.user._id;
    } else if (organization) {
      filter.organization = organization;
    }

    if (staffId) filter.staffId = staffId;
    if (school) filter.school = school;
    if (status) filter.status = status;

    const leaves = await StaffLeave.find(filter)
      .populate("staffId", "name email role")
      .populate("school", "schoolName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leaves,
      count: leaves.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve leave
export const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, remarks } = req.body;

    // 1. Fetch the leave first to check its current state
    const existingLeave = await StaffLeave.findById(id);

    if (!existingLeave) {
      return res
        .status(404)
        .json({ success: false, message: "Leave request not found" });
    }

    // 2. Now perform the update, safely accessing existingLeave.remarks
    const leave = await StaffLeave.findByIdAndUpdate(
      id,
      {
        status: "approved",
        approvedBy,
        remarks: remarks || existingLeave.remarks, // Now this is safe
      },
      { new: true },
    ).populate("staffId");

    // Mark attendance as on_leave for approved dates
    const startDate = new Date(leave.fromDate);
    const endDate = new Date(leave.toDate);

    for (
      let currentLoopDate = startDate;
      currentLoopDate <= endDate;
      currentLoopDate.setDate(currentLoopDate.getDate() + 1)
    ) {
      await StaffAttendance.findOneAndUpdate(
        {
          staffId: leave.staffId._id,
          school: leave.school,
          date: new Date(currentLoopDate),
        },
        {
          status: "on_leave",
          leaveRef: leave._id,
        },
        { upsert: true },
      );
    }

    res.status(200).json({
      success: true,
      message: "Leave approved successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject leave
export const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const leave = await StaffLeave.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        rejectionReason,
      },
      { new: true },
    ).populate("staffId");

    if (!leave) {
      return res
        .status(404)
        .json({ success: false, message: "Leave request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Leave rejected successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave balance
export const getLeaveBalance = async (req, res) => {
  try {
    const { staffId, school } = req.query;

    if (!staffId || !school) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: staffId, school",
      });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const leaveStats = await StaffLeave.aggregate([
      {
        $match: {
          staffId: staffId,
          school: school,
          fromDate: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: "$leaveType",
          totalDays: { $sum: "$totalDays" },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, "$totalDays", 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$totalDays", 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: leaveStats,
      year: currentYear,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
