import mongoose from "mongoose";
import School from "../../../models/school/School.js";
import User from "../../../models/users/user.model.js";
import FeePayment from "../../../models/finance/FeePayment.model.js";
import Expense from "../../../models/finance/Expense.model.js";
import StaffAttendance from "../../../models/HRM/Staffattendance.model.js";
import Attendance from "../../../models/academic/attendance.model.js";
import AuditLog from "../../../models/common/AuditLog.js";
import Payroll from "../../../models/finance/Payroll.model.js";
import "../../../models/users/staffProfile.model.js";

/**
 * POST /api/superadmin/reports/export
 * Generate and export a single report
 */
export const exportReport = async (req, res) => {
  try {
    const { reportType, format, branchId, dateFrom, dateTo, academicYear } =
      req.body;

    // Safely extract the organization ID as a Mongoose ObjectId
    const orgId = new mongoose.Types.ObjectId(
      String(req.user?.organization?._id || req.user?.organization || req.user?._id)
    );
    if (!orgId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Organization ID missing",
      });
    }

    let reportData = [];
    let fileName = `${reportType}_report_${new Date().toISOString().split("T")[0]}`;

    switch (reportType) {
      case "academic":
        reportData = await generateAcademicReport(
          orgId,
          branchId,
          academicYear,
        );
        fileName =
          !branchId || branchId === "all"
            ? `Org_Academic_Overview_${new Date().toISOString().split("T")[0]}`
            : `Branch_Academic_Roster_${new Date().toISOString().split("T")[0]}`;
        break;
      case "financial":
        reportData = await generateFinancialReport(
          orgId,
          branchId,
          dateFrom,
          dateTo,
        );
        fileName =
          !branchId || branchId === "all"
            ? `Org_Financial_Overview_${dateFrom || "All"}_to_${dateTo || "All"}`
            : `Branch_Audit_Ledger_${dateFrom || "All"}_to_${dateTo || "All"}`;
        break;
      case "staff":
        reportData = await generateStaffReport(orgId, branchId);
        fileName =
          !branchId || branchId === "all"
            ? `Org_HR_Overview_${new Date().toISOString().split("T")[0]}`
            : `Branch_Staff_Roster_${new Date().toISOString().split("T")[0]}`;
        break;
      case "admission":
        reportData = await generateAdmissionReport(
          orgId,
          branchId,
          academicYear,
        );
        fileName =
          !branchId || branchId === "all"
            ? `Org_Admission_Overview_${academicYear || "All"}`
            : `Branch_Admission_Ledger_${academicYear || "All"}`;
        break;
      case "branch":
        reportData = await generateBranchOverviewReport(orgId, branchId);
        fileName = `Branch_Performance_Overview_${new Date().toISOString().split("T")[0]}`;
        break;
      case "attendance":
        reportData = await generateAttendanceReport(orgId, branchId, dateFrom, dateTo, academicYear);
        fileName = !branchId || branchId === "all"
          ? `Org_Attendance_Overview_${new Date().toISOString().split("T")[0]}`
          : `Branch_Attendance_Roster_${new Date().toISOString().split("T")[0]}`;
        break;
      case "compliance":
      case "audit":
      case "audit_log":
        reportData = await generateComplianceReport(orgId, branchId, dateFrom, dateTo, academicYear);
        fileName = !branchId || branchId === "all"
          ? `Org_Compliance_Overview_${new Date().toISOString().split("T")[0]}`
          : `Branch_Compliance_Roster_${new Date().toISOString().split("T")[0]}`;
        break;
      case "payroll":
      case "hr":
        reportData = await generatePayrollReport(orgId, branchId);
        fileName = !branchId || branchId === "all"
          ? `Org_Payroll_Overview_${new Date().toISOString().split("T")[0]}`
          : `Branch_Payroll_Roster_${new Date().toISOString().split("T")[0]}`;
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid report type requested" });
    }

    // Graceful handling of empty data
    if (!reportData || reportData.length === 0) {
      return res.status(200).json({
        success: true,
        data:
          format === "Excel"
            ? "No data available for the selected filters"
            : [],
        fileName,
        format,
      });
    }

    // Return format
    return res.status(200).json({
      success: true,
      data: format === "Excel" ? convertToCSV(reportData) : reportData,
      fileName,
      format,
    });
  } catch (error) {
    console.error(`[Export Error - ${req.body.reportType}]:`, error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate report" });
  }
};

/**
 * POST /api/superadmin/reports/export/bulk
 * Bulk export multiple reports safely
 */
export const bulkExportReports = async (req, res) => {
  try {
    const { reportTypes, format, branchId, dateFrom, dateTo, academicYear } =
      req.body;

    const orgId = new mongoose.Types.ObjectId(
      String(req.user?.organization?._id || req.user?.organization || req.user?._id)
    );
    if (!orgId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Organization ID missing",
      });
    }

    if (
      !reportTypes ||
      !Array.isArray(reportTypes) ||
      reportTypes.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "No valid report types selected" });
    }

    const exportedReports = [];

    // Loop through requested reports
    for (const reportType of reportTypes) {
      try {
        let reportData = [];
        let fileName = `${reportType}_report_${new Date().toISOString().split("T")[0]}`;

        switch (reportType) {
          case "academic":
            reportData = await generateAcademicReport(
              orgId,
              branchId,
              academicYear,
            );
            fileName =
              !branchId || branchId === "all"
                ? `Org_Academic_Overview`
                : `Branch_Academic_Roster`;
            break;
          case "financial":
            reportData = await generateFinancialReport(
              orgId,
              branchId,
              dateFrom,
              dateTo,
            );
            fileName =
              !branchId || branchId === "all"
                ? `Org_Financial_Overview`
                : `Branch_Audit_Ledger`;
            break;
          case "staff":
            reportData = await generateStaffReport(orgId, branchId);
            fileName =
              !branchId || branchId === "all"
                ? `Org_HR_Overview`
                : `Branch_Staff_Roster`;
            break;
          case "admission":
            reportData = await generateAdmissionReport(
              orgId,
              branchId,
              academicYear,
            );
            fileName =
              !branchId || branchId === "all"
                ? `Org_Admission_Overview`
                : `Branch_Admission_Ledger`;
            break;
          case "branch":
            reportData = await generateBranchOverviewReport(orgId, branchId);
            fileName = `Branch_Performance_Overview`;
            break;
          case "attendance":
            reportData = await generateAttendanceReport(orgId, branchId, dateFrom, dateTo, academicYear);
            fileName = !branchId || branchId === "all"
              ? `Org_Attendance_Overview`
              : `Branch_Attendance_Roster`;
            break;
          case "compliance":
          case "audit":
          case "audit_log":
            reportData = await generateComplianceReport(orgId, branchId, dateFrom, dateTo, academicYear);
            fileName = !branchId || branchId === "all"
              ? `Org_Compliance_Overview`
              : `Branch_Compliance_Roster`;
            break;
          case "payroll":
          case "hr":
            reportData = await generatePayrollReport(orgId, branchId);
            fileName = !branchId || branchId === "all"
              ? `Org_Payroll_Overview`
              : `Branch_Payroll_Roster`;
            break;
          default:
            continue;
        }

        exportedReports.push({
          name: reportType,
          data: format === "Excel" ? convertToCSV(reportData) : reportData,
          fileName,
        });
      } catch (innerError) {
        console.error(
          `[Bulk Export Warning] Failed to generate ${reportType}:`,
          innerError.message,
        );
      }
    }

    if (exportedReports.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to generate any of the requested reports.",
      });
    }

    return res.status(200).json({
      success: true,
      data: exportedReports,
      message: `${exportedReports.length} out of ${reportTypes.length} reports exported successfully`,
    });
  } catch (error) {
    console.error("Error in bulkExportReports:", error);
    return res.status(500).json({
      success: false,
      message: "A critical error occurred during bulk export",
    });
  }
};

/**
 * GET /api/superadmin/reports/export/history
 */
export const getExportHistory = async (req, res) => {
  try {
    const recentExports = [
      {
        name: "Academic Roster",
        format: "Excel (CSV)",
        branch: "All Branches",
        range: "Current",
        on: new Date().toLocaleDateString(),
        by: "System Admin",
      },
    ];
    return res.status(200).json({ success: true, data: recentExports });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch export history" });
  }
};

// ============================================================================
// BULLETPROOF REPORT GENERATORS
// ============================================================================

async function generateAcademicReport(orgId, branchId, academicYear) {
  // ─── MACRO VIEW: All Branches ───
  if (!branchId || branchId === "all") {
    const schools = await School.find({ organization: orgId })
      .populate("organization", "organizationName")
      .sort({ schoolName: 1 })
      .lean();

    const schoolIds = schools.map((s) => s._id);

    // Count active students per school
    const studentAgg = await User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: "student",
          status: { $in: ["active", "Active", null, undefined] },
        },
      },
      {
        $group: {
          _id: "$school",
          enrolledCount: { $sum: 1 },
        },
      },
    ]);

    return schools.map((school) => {
      const teaching =
        parseInt(school.totalTeachingStaff) ||
        parseInt(school.totalTeachers) ||
        0;
      const nonTeaching = parseInt(school.totalNonTeachingStaff) || 0;

      const studentStats = studentAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { enrolledCount: 0 };

      return {
        "Branch ID": school.branchId || "N/A",
        "School Name": school.schoolName || "N/A",
        Organization: school.organization?.organizationName || "N/A",
        "System Status": school.isActive ? "Active" : "Inactive",
        "Date Registered": new Date(school.createdAt).toLocaleDateString(
          "en-IN",
        ),
        Board: school.board || "N/A",
        "School Type": school.schoolType || "N/A",
        "Medium of Instruction": school.mediumOfInstruction || "N/A",
        "Grades Offered": school.gradesOffered || "N/A",
        "Established Year": school.yearOfEstablishment || "N/A",
        "Enrollment Capacity": parseInt(school.enrollmentCapacity) || 0,
        "Enrolled Students": studentStats.enrolledCount,
        "Teaching Staff": teaching,
        "Non-Teaching Staff": nonTeaching,
        "Total Staff": teaching + nonTeaching,
        "Principal Name": school.principalName || "N/A",
        "Official Email": school.officialEmail || "N/A",
        "Official Phone": school.officialPhone || "N/A",
        City: school.city || "N/A",
        State: school.state || "N/A",
      };
    });
  }

  // ─── MICRO VIEW: Specific Branch Student Roster ───
  const students = await User.find({ role: "student", school: branchId })
    .populate("school", "schoolName")
    .populate({
      path: "profileId",
      select: "rollNo gender section class parent subjects",
      populate: [
        {
          path: "class",
          select: "name gradeLevel section classTeacher assignedSubjects",
        },
        {
          path: "parent",
          select: "primaryContact user",
          populate: { path: "user", select: "name" },
        },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  if (students.length === 0) return [];

  return students.map((student) => {
    const profile = student.profileId || {};
    const classData = profile.class || {};
    const parentData = profile.parent || {};
    const parentUser = parentData.user || {};

    const grade = classData.name || classData.gradeLevel || "N/A";
    const section = classData.section || profile.section || "N/A";
    const teacher = classData.classTeacher?.name || "Unassigned";

    let subjects = "N/A";
    if (Array.isArray(profile.subjects)) {
      subjects = profile.subjects.join(", ");
    } else if (Array.isArray(classData.assignedSubjects)) {
      subjects = classData.assignedSubjects
        .map((s) => s.subjectName || s)
        .join(", ");
    }

    const formattedGender = profile.gender
      ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
      : "N/A";

    return {
      "School Name": student.school?.schoolName || "Unknown",
      "Enrollment No": student.loginId || "N/A",
      "Roll No": profile.rollNo || profile.rollNumber || "N/A",
      "Student Name": student.name || "N/A",
      Gender: formattedGender,
      Class: grade,
      Section: section,
      "Class Teacher": teacher,
      Subjects: subjects,
      "Parent/Guardian": parentUser.name || "N/A",
      "Parent Contact": parentData.primaryContact || "N/A",
      "Admission Date": student.createdAt
        ? new Date(student.createdAt).toLocaleDateString("en-IN")
        : "N/A",
      Status: student.status ? student.status.toUpperCase() : "ACTIVE",
    };
  });
}

async function generateFinancialReport(orgId, branchId, dateFrom, dateTo) {
  const paymentDateQuery = {};
  const expenseDateQuery = {};

  if (dateFrom || dateTo) {
    if (dateFrom && !isNaN(new Date(dateFrom).getTime())) {
      const fromDate = new Date(dateFrom);
      paymentDateQuery.$gte = fromDate;
      expenseDateQuery.$gte = fromDate;
    }
    if (dateTo && !isNaN(new Date(dateTo).getTime())) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      paymentDateQuery.$lte = to;
      expenseDateQuery.$lte = to;
    }
  }

  // ─── MACRO VIEW: All Branches Revenue vs Expenses ───
  if (!branchId || branchId === "all") {
    const schools = await School.find({ organization: orgId })
      .sort({ schoolName: 1 })
      .lean();
    const schoolIds = schools.map((s) => s._id);

    const paymentMatchStage = {
      school: { $in: schoolIds },
      paymentStatus: "success",
    };
    const expenseMatchStage = {
      school: { $in: schoolIds },
      paymentStatus: "paid",
    };

    if (Object.keys(paymentDateQuery).length > 0) {
      paymentMatchStage.paymentDate = paymentDateQuery;
      expenseMatchStage.expenseDate = expenseDateQuery;
    }

    const [revenueAgg, expenseAgg] = await Promise.all([
      FeePayment.aggregate([
        { $match: paymentMatchStage },
        {
          $group: {
            _id: "$school",
            totalRevenue: { $sum: "$amountPaid" },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        { $match: expenseMatchStage },
        { $group: { _id: "$school", totalExpense: { $sum: "$amount" } } },
      ]),
    ]);

    return schools.map((school) => {
      const schoolRevenue = revenueAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { totalRevenue: 0, totalTransactions: 0 };
      const schoolExpense = expenseAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { totalExpense: 0 };

      const revenue = parseFloat(schoolRevenue.totalRevenue) || 0;
      const expenses = parseFloat(schoolExpense.totalExpense) || 0;
      const profitLoss = revenue - expenses;

      return {
        "Branch ID": school.branchId || "N/A",
        "School Name": school.schoolName || "N/A",
        "City / Location": school.city || "N/A",
        "Report Period Start": dateFrom || "All Time",
        "Report Period End": dateTo || "All Time",
        "Total Income Transactions": schoolRevenue.totalTransactions,
        "Total Revenue (INR)": revenue,
        "Total Expenses (INR)": expenses,
        "Profit / Loss (INR)": profitLoss,
        "Branch Status": school.isActive ? "Active" : "Inactive",
      };
    });
  }

  // ─── MICRO VIEW: Specific Branch Income Ledger ───
  const query = { school: new mongoose.Types.ObjectId(branchId) };
  if (Object.keys(paymentDateQuery).length > 0)
    query.paymentDate = paymentDateQuery;

  const payments = await FeePayment.find(query)
    .populate({
      path: "studentId",
      select: "name fullName loginId enrollmentNumber rollNumber profileId",
      populate: {
        path: "profileId",
        select: "class rollNo",
        populate: { path: "class", select: "name gradeLevel section" },
      },
    })
    .sort({ paymentDate: -1 })
    .lean();

  if (payments.length === 0) return [];

  return payments.map((payment) => {
    const student = payment.studentId || {};
    const profile = student.profileId || {};
    const studentClass = profile.class || {};

    const grade = studentClass.name || studentClass.gradeLevel || "N/A";
    const section = studentClass.section ? ` - ${studentClass.section}` : "";

    return {
      "Receipt Number": payment.receiptNumber || payment.transactionId || "N/A",
      "Payment Date": payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleString("en-IN")
        : "N/A",
      "Student Name": student.name || student.fullName || "Walk-in / Unknown",
      "Enrollment / Roll No":
        student.loginId || student.enrollmentNumber || profile.rollNo || "N/A",
      Class: grade !== "N/A" ? `${grade}${section}` : "N/A",
      "Fee Category / Purpose":
        payment.feeType || payment.description || "General Fee",
      "Payment Mode": payment.paymentMode
        ? payment.paymentMode.toUpperCase()
        : "N/A",
      "Amount Due (INR)":
        parseFloat(payment.amountDue) || parseFloat(payment.amountPaid) || 0,
      "Discount / Waiver (INR)": parseFloat(payment.discount) || 0,
      "Amount Paid (INR)": parseFloat(payment.amountPaid) || 0,
      Status: payment.paymentStatus
        ? payment.paymentStatus.toUpperCase()
        : "UNKNOWN",
      "Collected By / Gateway":
        payment.collectedBy || payment.gatewayName || "System / Auto",
      Remarks: payment.remarks || "",
    };
  });
}

async function generateStaffReport(orgId, branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // ─── MACRO VIEW: All Branches ───
  if (!branchId || branchId === "all") {
    const schools = await School.find({ organization: orgId })
      .sort({ schoolName: 1 })
      .lean();
    const schoolIds = schools.map((s) => s._id);

    const staffAgg = await User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: { $nin: ["student", "parent"] },
        },
      },
      {
        $group: {
          _id: "$school",
          totalStaff: { $sum: 1 },
          teachingStaff: {
            $sum: { $cond: [{ $eq: ["$role", "teacher"] }, 1, 0] },
          },
          adminStaff: {
            $sum: {
              $cond: [
                { $in: ["$role", ["admin", "principal", "accountant"]] },
                1,
                0,
              ],
            },
          },
          supportStaff: {
            $sum: { $cond: [{ $in: ["$role", ["support_staff"]] }, 1, 0] },
          },
        },
      },
    ]);

    const attendanceAgg = await StaffAttendance.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          date: { $gte: today, $lt: tomorrow },
          status: "present",
        },
      },
      { $group: { _id: "$school", presentCount: { $sum: 1 } } },
    ]);

    return schools.map((school) => {
      const staffStats = staffAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { totalStaff: 0, teachingStaff: 0, adminStaff: 0, supportStaff: 0 };
      const attendanceStats = attendanceAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { presentCount: 0 };

      const presentPercent =
        staffStats.totalStaff > 0
          ? Math.round(
              (attendanceStats.presentCount / staffStats.totalStaff) * 100,
            )
          : 0;

      return {
        "Branch ID": school.branchId || "N/A",
        "School Name": school.schoolName || "N/A",
        City: school.city || "N/A",
        "Total Staff": parseInt(staffStats.totalStaff),
        "Teaching Staff": parseInt(staffStats.teachingStaff),
        "Admin & Leadership": parseInt(staffStats.adminStaff),
        "Support Staff": parseInt(staffStats.supportStaff),
        "Present Today": parseInt(attendanceStats.presentCount),
        "Attendance Rate (%)": presentPercent,
        "System Status": school.isActive ? "Active" : "Inactive",
      };
    });
  }

  // ─── MICRO VIEW: Specific Branch Staff Roster ───
  const staffMembers = await User.find({
    school: branchId,
    role: { $nin: ["student", "parent"] },
  })
    .populate("school", "schoolName")
    .populate("profileId")
    .sort({ role: 1, name: 1 })
    .lean();

  if (staffMembers.length === 0) return [];

  return staffMembers.map((staff) => {
    const profile = staff.profileId || {};
    const formattedRole = staff.role
      ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1)
      : "Unknown";

    return {
      "Employee ID": profile.staffId || staff.loginId || "N/A",
      "Full Name": staff.name || "N/A",
      "System Role": formattedRole,
      Designation: profile.designation || "N/A",
      Department: profile.department || "General",
      Gender: profile.gender || "N/A",
      "Contact Email": staff.email || "N/A",
      "Contact Phone": profile.phone || "N/A",
      "Joined Date": profile.joiningDate
        ? new Date(profile.joiningDate).toLocaleDateString("en-IN")
        : staff.createdAt
          ? new Date(staff.createdAt).toLocaleDateString("en-IN")
          : "N/A",
      "Account Status": staff.status ? staff.status.toUpperCase() : "ACTIVE",
    };
  });
}
async function generateAdmissionReport(orgId, branchId, academicYear) {
  // ─── MACRO VIEW: All Branches ───
  if (!branchId || branchId === "all") {
    const schools = await School.find({ organization: orgId })
      .sort({ schoolName: 1 })
      .lean();
    const schoolIds = schools.map((s) => s._id);

    const matchStage = { school: { $in: schoolIds }, role: "student" };
    if (academicYear) {
      let alternateYear = academicYear;
      const match = academicYear.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        alternateYear = `${match[1]}-${match[2].slice(-2)}`;
      } else {
        const shortMatch = academicYear.match(/^(\d{4})-(\d{2})$/);
        if (shortMatch) {
          const prefix = shortMatch[1].slice(0, 2);
          alternateYear = `${shortMatch[1]}-${prefix}${shortMatch[2]}`;
        }
      }
      matchStage.academicYear = { $in: [academicYear, alternateYear] };
    }

    const admissionAgg = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$school",
          totalAdmissions: { $sum: 1 },
          activeStudents: {
            $sum: {
              $cond: [
                { $in: ["$status", ["active", "Active", null, undefined]] },
                1,
                0,
              ],
            },
          },
          inactiveStudents: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["inactive", "Inactive", "alumni", "dropped"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return schools.map((school) => {
      const stats = admissionAgg.find(
        (agg) => agg._id && agg._id.toString() === school._id.toString(),
      ) || { totalAdmissions: 0, activeStudents: 0, inactiveStudents: 0 };
      const capacity = parseInt(school.enrollmentCapacity) || 0;
      const active = parseInt(stats.activeStudents);

      return {
        "Branch ID": school.branchId || "N/A",
        "School Name": school.schoolName || "N/A",
        City: school.city || "N/A",
        "Max Capacity": capacity,
        "Total Historical Admissions": parseInt(stats.totalAdmissions),
        "Currently Active Students": active,
        "Enrolled Students": active,
        "Inactive / Left": parseInt(stats.inactiveStudents),
        "Available Seats": capacity > 0 ? capacity - active : 0,
        "System Status": school.isActive ? "Active" : "Inactive",
      };
    });
  }

  // ─── MICRO VIEW: Specific Branch ───
  const query = { role: "student", school: branchId };
  if (academicYear) {
    let alternateYear = academicYear;
    const match = academicYear.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      alternateYear = `${match[1]}-${match[2].slice(-2)}`;
    } else {
      const shortMatch = academicYear.match(/^(\d{4})-(\d{2})$/);
      if (shortMatch) {
        const prefix = shortMatch[1].slice(0, 2);
        alternateYear = `${shortMatch[1]}-${prefix}${shortMatch[2]}`;
      }
    }
    query.academicYear = { $in: [academicYear, alternateYear] };
  }

  const students = await User.find(query)
    .populate("school", "schoolName")
    .populate({
      path: "profileId",
      populate: { path: "class", select: "name gradeLevel section" },
    })
    .sort({ createdAt: -1 })
    .lean();

  if (students.length === 0) return [];

  return students.map((student) => {
    const profile = student.profileId || {};
    const classData = profile.class || {};

    const grade = classData.name || classData.gradeLevel || "N/A";
    const section = classData.section ? ` - ${classData.section}` : "";
    const fullClass = grade !== "N/A" ? `${grade}${section}` : "N/A";

    return {
      "Admission / Enroll No": student.loginId || "N/A",
      "Roll No": profile.rollNo || "N/A",
      "Student Name": student.name || "N/A",
      Gender: profile.gender
        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
        : "N/A",
      "Class Enrolled": fullClass,
      "Admission Date": student.createdAt
        ? new Date(student.createdAt).toLocaleDateString("en-IN")
        : "N/A",
      "Account Status": student.status
        ? student.status.toUpperCase()
        : "ACTIVE",
    };
  });
}

async function generateBranchOverviewReport(orgId, branchId) {
  const schoolQuery = { organization: orgId };
  if (branchId && branchId !== "all") {
    schoolQuery._id = new mongoose.Types.ObjectId(branchId);
  }

  const schools = await School.find(schoolQuery).sort({ schoolName: 1 }).lean();
  if (schools.length === 0) return [];

  const schoolIds = schools.map((school) => school._id);

  // Fire massive parallel aggregations mapping solely on schoolIds
  const [studentAgg, staffAgg, revenueAgg] = await Promise.all([
    User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: "student",
          status: { $in: ["active", "Active", null, undefined] },
        },
      },
      { $group: { _id: "$school", activeStudents: { $sum: 1 } } },
    ]),
    User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: { $nin: ["student", "parent"] },
        },
      },
      {
        $group: {
          _id: "$school",
          totalStaff: { $sum: 1 },
          teachingStaff: {
            $sum: { $cond: [{ $eq: ["$role", "teacher"] }, 1, 0] },
          },
        },
      },
    ]),
    FeePayment.aggregate([
      { $match: { school: { $in: schoolIds }, paymentStatus: "success" } },
      {
        $group: {
          _id: "$school",
          totalRevenue: { $sum: "$amountPaid" },
          txCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  return schools.map((school) => {
    const studentStats = studentAgg.find(
      (a) => a._id && a._id.toString() === school._id.toString(),
    ) || { activeStudents: 0 };
    const staffStats = staffAgg.find(
      (a) => a._id && a._id.toString() === school._id.toString(),
    ) || { totalStaff: 0, teachingStaff: 0 };
    const revStats = revenueAgg.find(
      (a) => a._id && a._id.toString() === school._id.toString(),
    ) || { totalRevenue: 0, txCount: 0 };

    const capacity = parseInt(school.enrollmentCapacity) || 0;
    const activeStudents = parseInt(studentStats.activeStudents);
    const utilization =
      capacity > 0 ? Math.round((activeStudents / capacity) * 100) : 0;
    const ptr =
      staffStats.teachingStaff > 0
        ? Math.round(activeStudents / staffStats.teachingStaff)
        : activeStudents;

    return {
      "Branch ID": school.branchId || "N/A",
      "School Name": school.schoolName || "Unknown",
      City: school.city || "N/A",
      "System Status": school.isActive ? "Active" : "Inactive",
      "Max Capacity": capacity,
      "Active Students": activeStudents,
      "Enrolled Students": activeStudents,
      "Available Seats": capacity > 0 ? capacity - activeStudents : 0,
      "Capacity Utilization (%)": utilization,
      "Total Staff": parseInt(staffStats.totalStaff),
      "Teaching Staff": parseInt(staffStats.teachingStaff),
      "Student-to-Teacher Ratio":
        staffStats.teachingStaff > 0 ? `1 : ${ptr}` : "N/A",
      "Total Transactions": parseInt(revStats.txCount),
      "Total Revenue (INR)": parseFloat(revStats.totalRevenue) || 0,
      "Principal Name": school.principalName || "N/A",
      "Official Contact": school.officialPhone || "N/A",
    };
  });
}

const getMonthRange = (dateFrom, dateTo, academicYear) => {
  const query = {};
  let startYear = new Date().getFullYear();
  let endYear = startYear;

  if (academicYear) {
    const match = academicYear.match(/^(\d{4})/);
    if (match) {
      startYear = parseInt(match[1]);
      endYear = startYear + 1;
    }
  }

  const monthIndices = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const getMonthDate = (monthName, isEnd) => {
    if (!monthName) return null;
    const name = monthName.trim().toLowerCase();
    const index = monthIndices[name];
    if (index === undefined) return null;
    
    const year = (index >= 3) ? startYear : endYear;
    if (isEnd) {
      return new Date(Date.UTC(year, index + 1, 0, 23, 59, 59, 999));
    }
    return new Date(Date.UTC(year, index, 1, 0, 0, 0, 0));
  };

  const fromDate = getMonthDate(dateFrom, false);
  const toDate = getMonthDate(dateTo, true);

  if (fromDate) {
    query.$gte = fromDate;
  } else if (dateFrom && !isNaN(new Date(dateFrom).getTime())) {
    query.$gte = new Date(dateFrom);
  }

  if (toDate) {
    query.$lte = toDate;
  } else if (dateTo && !isNaN(new Date(dateTo).getTime())) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    query.$lte = to;
  }

  return query;
};

async function generateAttendanceReport(orgId, branchId, dateFrom, dateTo, academicYear) {
  const studentQuery = { organization: orgId };
  const staffQuery = { organization: orgId };

  if (branchId && branchId !== "all") {
    const sId = new mongoose.Types.ObjectId(branchId);
    studentQuery.school = sId;
    staffQuery.school = sId;
  }

  if (academicYear) {
    let alternateYear = academicYear;
    const match = academicYear.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      alternateYear = `${match[1]}-${match[2].slice(-2)}`;
    } else {
      const shortMatch = academicYear.match(/^(\d{4})-(\d{2})$/);
      if (shortMatch) {
        const prefix = shortMatch[1].slice(0, 2);
        alternateYear = `${shortMatch[1]}-${prefix}${shortMatch[2]}`;
      }
    }
    studentQuery.academicYear = { $in: [academicYear, alternateYear] };
  }

  const dateRange = getMonthRange(dateFrom, dateTo, academicYear);
  if (Object.keys(dateRange).length > 0) {
    studentQuery.date = dateRange;
    staffQuery.date = dateRange;
  }

  const [studentAttendance, staffAttendance] = await Promise.all([
    Attendance.find(studentQuery)
      .populate("entries.student", "name loginId")
      .populate("class", "name")
      .populate("school", "schoolName")
      .populate("markedBy", "name")
      .lean(),
    StaffAttendance.find(staffQuery)
      .populate("staffId", "name loginId")
      .populate("school", "schoolName")
      .populate("markedBy", "name")
      .lean()
  ]);

  const rows = [];

  // Flatten Student Attendance Entries
  for (const record of studentAttendance) {
    const sName = record.school?.schoolName || "N/A";
    const className = record.class?.name || "N/A";
    const secName = record.section || "N/A";
    const dateStr = record.date ? new Date(record.date).toLocaleDateString("en-IN") : "N/A";
    const marker = record.markedBy?.name || "System";

    for (const entry of record.entries) {
      if (!entry.student) continue;
      rows.push({
        Type: "Student",
        "School Name": sName,
        "Name": entry.student.name || "N/A",
        "ID": entry.student.loginId || "N/A",
        "Class/Role": `${className} - ${secName}`,
        "Date": dateStr,
        "Status": entry.status ? entry.status.toUpperCase() : "N/A",
        "Marked By": marker,
        "Remarks": entry.remarks || "—",
        _rawDate: record.date ? new Date(record.date) : new Date(0)
      });
    }
  }

  // Flatten Staff Attendance Entries
  for (const record of staffAttendance) {
    if (!record.staffId) continue;
    const sName = record.school?.schoolName || "N/A";
    const dateStr = record.date ? new Date(record.date).toLocaleDateString("en-IN") : "N/A";
    const marker = record.markedBy?.name || "System";

    rows.push({
      Type: "Staff",
      "School Name": sName,
      "Name": record.staffId.name || "N/A",
      "ID": record.staffId.loginId || "N/A",
      "Class/Role": record.staffRole ? record.staffRole.toUpperCase() : "STAFF",
      "Date": dateStr,
      "Status": record.status ? record.status.toUpperCase() : "N/A",
      "Marked By": marker,
      "Remarks": record.remarks || "—",
      _rawDate: record.date ? new Date(record.date) : new Date(0)
    });
  }

  // Sort by date descending
  rows.sort((a, b) => b._rawDate - a._rawDate);
  // Clean up rawDate fields
  rows.forEach(r => delete r._rawDate);
  return rows;
}

async function generateComplianceReport(orgId, branchId, dateFrom, dateTo, academicYear) {
  const query = {};

  if (branchId && branchId !== "all") {
    query.school = new mongoose.Types.ObjectId(branchId);
  } else {
    const schools = await School.find({ organization: orgId }).select("_id").lean();
    query.school = { $in: schools.map(s => s._id) };
  }

  const dateRange = getMonthRange(dateFrom, dateTo, academicYear);
  if (Object.keys(dateRange).length > 0) {
    query.timestamp = dateRange;
  }

  const logs = await AuditLog.find(query)
    .populate("user", "name role")
    .populate("school", "schoolName")
    .sort({ timestamp: -1 })
    .limit(1000)
    .lean();

  return logs.map(log => ({
    "Timestamp": log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-IN") : "N/A",
    "School Name": log.school?.schoolName || "N/A",
    "User Name": log.user?.name || "System/Unknown",
    "Role": log.user?.role || "System",
    "Action": log.action || "N/A",
    "Module": log.module || "N/A",
    "IP Address": log.ipAddress || log.details?.ipAddress || "—",
    "User Agent": log.userAgent || log.details?.userAgent || "—"
  }));
}

async function generatePayrollReport(orgId, branchId) {
  const query = { organization: orgId };
  if (branchId && branchId !== "all") {
    query.school = new mongoose.Types.ObjectId(branchId);
  }

  const payrolls = await Payroll.find(query)
    .populate("staffId", "name loginId")
    .populate("school", "schoolName")
    .lean();

  return payrolls.map(p => ({
    "Staff Name": p.staffId?.name || "N/A",
    "Staff ID": p.staffId?.loginId || "N/A",
    "Role": p.staffRole ? p.staffRole.toUpperCase() : "N/A",
    "Basic Salary (INR)": p.basicSalary || 0,
    "Gross Salary (INR)": p.grossSalary || 0,
    "Net Salary (INR)": p.netSalary || 0,
    "Branch": p.school?.schoolName || "N/A"
  }));
}

// ============================================================================
// UTILITIES
// ============================================================================

function convertToCSV(data) {
  if (!data || data.length === 0)
    return "No data available matching your criteria";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value =
        row[header] === null || row[header] === undefined ? "" : row[header];
      // Escape double quotes inside values by doubling them, wrap entirely in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  // BOM helps excel read the utf-8 file properly
  return csvRows.join("\r\n");
}
