import User from "../../models/users/user.model.js";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import SystemSettings from "../../models/graphura/SystemSettings.js";
import mongoose from "mongoose";

export const loginParent = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    // 🔥 CHECK SYSTEM SETTINGS FIRST
    const systemSettings = await SystemSettings.findOne();
    if (systemSettings && systemSettings.school && systemSettings.school.enableParentPortal === false) {
        return res.status(403).json({ 
            success: false, 
            message: "The Parent Portal is temporarily disabled for maintenance. Please try again later." 
        });
    }

    const user = await User.findByLogin(loginId);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Login ID" });
    }

    if (user.role !== "parent") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Not a parent." });
    }

    if (!user.isActiveUser()) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Contact your administrator.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password" });
    }

    const token = user.generateToken();

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      role: "parent",
      token,
      user: {
        id: user._id,
        name: user.name,
        loginId: user.loginId,
        role: user.role,
        school: user.school,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutParent = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// THE FIXED PROFILE ROUTE
export const getParent = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
    const parentId = req.user._id || req.user.id;
    const schoolId = userData.school?._id || userData.school || userData.schoolId;
    const parentProfile = await Parent.findOne({ user: parentId }).populate({
      path: "students",
      populate: [
        { path: "user", select: "name" },
        { path: "class", select: "name" },
      ],
    });

    if (parentProfile && parentProfile.students) {
      for (const student of parentProfile.students) {
        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
          await student.populate("section", "name");
        }
      }
    }

    // 1. Fetch linked students
    const rawStudents = parentProfile?.students || [];

    const formattedStudents = rawStudents.map((student) => ({
      _id: student._id,
      name: student.user ? student.user.name : "Student Name Unavailable",
      class: student.class?.name || student.class || "N/A",
      section: student.section?.name || student.section || "N/A",
      admissionNo: student.enrollmentNo || "N/A",
      school: student.school,
    }));

    delete userData.password;
    userData.students = formattedStudents;

    // 2. FETCH DASHBOARD SUMMARY STATISTICS

    // Default stats if no students are linked
    userData.attendance = { percentage: 0 };
    userData.fees = { due: 0 };
    userData.exams = { upcoming: 0 };
    userData.homework = { pending: 0 }; // Left as 0 so your frontend doesn't crash
    userData.notifications = [];

    // If the parent has at least one student, calculate stats for the requested or primary student
    if (rawStudents.length > 0) {
      const requestedStudentId = req.query.studentId || req.query.student_id;
      let targetStudent = rawStudents[0];
      if (requestedStudentId) {
        const found = rawStudents.find(s => s._id.toString() === requestedStudentId.toString());
        if (found) targetStudent = found;
      }

      const studentUserId = targetStudent.user?._id || targetStudent.user;
      const studentClassId = targetStudent.class?._id || targetStudent.class;
      const studentSection = targetStudent.section?._id || targetStudent.section;
      const studentSchoolId = targetStudent.school || schoolId;

      // Use Promise.all to fetch all stats concurrently for maximum speed
      const [upcomingExamsCount, feeData, attendanceRecord] = await Promise.all(
        [
          // A. Count upcoming exams for this student's class, section, and school
          ExamSchedule.countDocuments({
            school: studentSchoolId,
            class: studentClassId,
            $or: [{ section: null }, { section: studentSection }],
            status: { $in: ["published", "ongoing"] },
          }),

          // B. Calculate total fees due
          FeeInstallment.find({
            studentId: studentUserId, // FeeInstallment references User ID
            status: "active",
          }),

          // C. Calculate Attendance Percentage
          // We unwind the entries array and match only this specific student's records

          Attendance.aggregate([
            { $match: { "entries.student": studentUserId } },
            { $unwind: "$entries" },
            { $match: { "entries.student": studentUserId } },
            {
              $group: {
                _id: null,
                totalDays: { $sum: 1 },
                presentDays: {
                  $sum: {
                    $cond: [{ $eq: ["$entries.status", "present"] }, 1, 0],
                  },
                },
              },
            },
          ]),
        ],
      );

      // Assign Exam Data
      userData.exams.upcoming = upcomingExamsCount || 0;

      // Assign Fee Data
      let totalDue = 0;
      if (feeData && feeData.length > 0) {
        // Sums up the 'totalDue' field from all active installments
        totalDue = feeData.reduce((sum, inst) => sum + (inst.totalDue || 0), 0);
      }
      userData.fees.due = totalDue;

      // Assign Attendance Data
      if (attendanceRecord && attendanceRecord.length > 0) {
        const { totalDays, presentDays } = attendanceRecord[0];
        if (totalDays > 0) {
          userData.attendance.percentage = Math.round(
            (presentDays / totalDays) * 100,
          );
        }
      }
    }

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("Error in getParent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateParentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};