import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import Homework from "../../models/academic/homework.model.js";
import HomeworkSubmission from "../../models/academic/HomeworkSubmission.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get dashboard statistics for parent
 * @route   GET /api/parent/dashboard/stats
 * @access  Private (Parent)
 */
export const getParentDashboardStats = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
    const parentId = req.user._id || req.user.id;
    const schoolId = userData.school?._id || userData.school || userData.schoolId;

    // Fetch parent profile with linked students
    const parentProfile = await Parent.findOne({ user: parentId }).populate({
      path: "students",
      populate: [
        { path: "user", select: "name" },
        { path: "class", select: "name" },
      ],
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, message: "Parent profile not found" });
    }

    if (parentProfile.students) {
      for (const student of parentProfile.students) {
        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
          await student.populate("section", "name");
        }
      }
    }

    // 1. Fetch linked students
    const rawStudents = parentProfile.students || [];

    const formattedStudents = rawStudents.map((student) => ({
      _id: student._id,
      name: student.user ? student.user.name : "Student Name Unavailable",
      class: student.class?.name || student.class || "N/A",
      section: student.section?.name || student.section || "N/A",
      admissionNo: student.enrollmentNo || "N/A",
      school: student.school,
    }));

    // Resolve display name for parent
    let parentDisplayName = userData.name;
    if (parentDisplayName === "Parent" || parentDisplayName === "Parent Name" || !parentDisplayName) {
      if (parentProfile.fatherName) {
        parentDisplayName = parentProfile.fatherName;
      } else if (parentProfile.motherName) {
        parentDisplayName = parentProfile.motherName;
      }
    }

    // Initialize stats
    const dashboardStats = {
      name: parentDisplayName,
      students: formattedStudents,
      attendance: { percentage: 0 },
      homework: { pending: 0 },
      fees: { due: 0 },
      exams: { upcoming: 0 }
    };

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

      // Prepare query conditions for homework section matching
      const studentSectionId = studentSection?._id?.toString() || studentSection?.toString();
      const studentSectionName = typeof studentSection === 'object' ? studentSection?.name : null;

      const sectionOrConditions = [
        { section: { $exists: false } },
        { section: null },
        { section: "" }
      ];
      if (studentSectionId && mongoose.Types.ObjectId.isValid(studentSectionId)) {
        sectionOrConditions.push({ section: studentSectionId });
      } else if (studentSectionId) {
        sectionOrConditions.push({ section: studentSectionId });
      }
      if (studentSectionName) {
        sectionOrConditions.push({ section: studentSectionName });
      }

      // Run operations concurrently
      const [upcomingExamsCount, feeData, attendanceRecord, homeworkList, submissions] = await Promise.all([
        // A. Count upcoming exams
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

        // D. Fetch all active homework for student's class & matching section
        Homework.find({
          class: studentClassId,
          school: studentSchoolId,
          isActive: true,
          $or: sectionOrConditions
        }).lean(),

        // E. Fetch submissions by this student
        HomeworkSubmission.find({
          student: studentUserId
        }).lean()
      ]);

      // Assign Exam Data
      dashboardStats.exams.upcoming = upcomingExamsCount || 0;

      // Assign Fee Data
      let totalDue = 0;
      if (feeData && feeData.length > 0) {
        totalDue = feeData.reduce((sum, inst) => sum + (inst.totalDue || 0), 0);
      }
      dashboardStats.fees.due = totalDue;

      // Assign Attendance Data
      if (attendanceRecord && attendanceRecord.length > 0) {
        const { totalDays, presentDays } = attendanceRecord[0];
        if (totalDays > 0) {
          dashboardStats.attendance.percentage = Math.round(
            (presentDays / totalDays) * 100
          );
        }
      }

      // Assign Homework Data (calculate pending homeworks)
      const submissionMap = new Map(submissions.map(sub => [sub.homework.toString(), sub]));
      let pendingHomeworkCount = 0;

      for (const hw of homeworkList) {
        const submission = submissionMap.get(hw._id.toString());
        if (!submission) {
          pendingHomeworkCount++;
        }
      }
      dashboardStats.homework.pending = pendingHomeworkCount;
    }

    res.status(200).json({ success: true, data: dashboardStats });
  } catch (error) {
    console.error("Error in getParentDashboardStats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
