import User from '../../models/users/user.model.js';
import Teacher from '../../models/users/teacher.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import Resignation from '../../models/HRM/Resignation.model.js';
import StaffProfile from '../../models/users/staffProfile.model.js';

// Helper to reliably extract schoolId
const getSchoolId = (req) => {
    let schoolId = req.user?.school?._id || req.user?.school;
    if (!schoolId) throw new Error("School ID not found in request");
    return schoolId;
};

export const getPrincipalStaffPerformance = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { dateFrom, dateTo, academicSession, role } = req.query;

    const monthMap = {
      "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
      "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
    };

    const session = academicSession || "2026-27";
    const startYear = parseInt(session.split("-")[0]) || 2026;
    const endYear = startYear + 1;

    const fromMonthName = dateFrom || "April";
    const toMonthName = dateTo || "September";

    const fromMonth = monthMap[fromMonthName] !== undefined ? monthMap[fromMonthName] : 3;
    const toMonth = monthMap[toMonthName] !== undefined ? monthMap[toMonthName] : 8;

    const fromYear = fromMonth >= 3 ? startYear : endYear;
    const toYear = toMonth >= 3 ? startYear : endYear;

    const startDate = new Date(fromYear, fromMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(toYear, toMonth + 1, 0, 23, 59, 59, 999);

    const staffFilter = {
      role: { $in: ['teacher', 'admin', 'accountant'] },
      school: schoolId,
      $or: [
        { joiningDate: { $lte: endDate } },
        { createdAt: { $lte: endDate } }
      ]
    };

    if (role && role !== 'All') {
      let dbRole = role.toLowerCase();
      if (dbRole.includes("teacher")) dbRole = "teacher";
      else if (dbRole.includes("account")) dbRole = "accountant";
      else if (dbRole.includes("admin")) dbRole = "admin";
      staffFilter.role = dbRole;
    }

    const staffList = await User.find(staffFilter);

    const teachers = await Teacher.find({ school: schoolId }).select("user experience assignedClasses subjects");
    const supportProfiles = await StaffProfile.find({ school: schoolId }).select("user experience");

    const experienceMap = new Map();
    teachers.forEach(t => experienceMap.set(String(t.user), t.experience || 0));
    supportProfiles.forEach(p => experienceMap.set(String(p.user), p.experience || 0));

    const attendanceRecords = await StaffAttendance.find({ school: schoolId, date: { $gte: startDate, $lte: endDate } });
    const resignations = await Resignation.find({ school: schoolId, resignationDate: { $gte: startDate, $lte: endDate } });

    const normalizeRole = (roleStr = "") => {
      const label = roleStr.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const l = label.toLowerCase();
      if (l.includes("account")) return "Accountant";
      if (l.includes("admin")) return "Admin Department";
      if (l.includes("class")) return "Class Teacher";
      if (l.includes("subject")) return "Subject Teacher";
      if (l.includes("teacher")) return "Teacher";
      return label || "Staff";
    };

    const getDepartment = (roleName) => {
        if (roleName.includes("Teacher")) return "Teaching";
        if (roleName === "Accountant") return "Accountant";
        if (roleName === "Admin Department") return "Administration";
        return "Administration"
    };

    const departmentsList = ["Teaching", "Administration", "Accountant"];

    const staffRows = staffList.map((s, i) => {
      const roleName = normalizeRole(s.role);
      const department = getDepartment(roleName);

      const staffAtt = attendanceRecords.filter(r => String(r.staffId) === String(s._id));
      const totalDays = staffAtt.length;
      const presentCount = staffAtt.filter(r => ['present', 'late'].includes(r.status)).length;
      const halfDayCount = staffAtt.filter(r => r.status === 'half_day').length;
      
      const hasPendingResign = resignations.some(r => String(r.staffId) === String(s._id) && r.status === 'pending');
      const hasAcceptedResign = resignations.some(r => String(r.staffId) === String(s._id) && r.status === 'accepted');
      const hasResignationRecord = hasPendingResign || hasAcceptedResign;

      const hasActualData = totalDays > 0 || hasResignationRecord;

      let attendance = 0.0, score = 0.0, resignationRisk = 0.0, retention = 0.0;
      let classEngagement = 0.0, studentImpact = 0.0, taskCompletion = 0.0, complaintRatio = 0.0;
      let grade = "N/A", trend = "Stable";

      if (hasActualData) {
        attendance = totalDays > 0 ? ((presentCount + halfDayCount * 0.5) / totalDays) * 100 : 0.0;
        const tenureInYears = (new Date() - new Date(s.createdAt)) / (1000 * 60 * 60 * 24 * 365.25);
        const tenureBonus = Math.min(10, tenureInYears * 1.5);
        const experience = experienceMap.get(String(s._id)) || 0;
        const expBonus = Math.min(10, experience * 0.5);

        const attModifier = (attendance - 90) * 0.8;
        const statusModifier = s.status === 'active' ? 5 : -10;
        score = Math.min(98, Math.max(0, 75 + tenureBonus + expBonus + attModifier + statusModifier));

        resignationRisk = hasPendingResign ? 100.0 : Math.min(100, Math.max(0, (100 - (92 - (score < 70 ? 11 : (i % 8)))) + (score < 70 ? 8 : 0) + (attendance < 80 ? (80 - attendance) * 2 : 0)));
        retention = hasAcceptedResign ? 0.0 : 100.0 - resignationRisk;

        classEngagement = Math.min(98, Math.max(0, score + 2 - ((i % 5) - 2) * 1.2));
        studentImpact = Math.min(98, Math.max(0, score + 1 - ((i % 4) - 1) * 1.5));
        taskCompletion = Math.min(98, Math.max(0, score + 5 - ((i % 5) - 1) * 1.1));
        complaintRatio = Number(Math.max(0.0, (100 - score) / 18).toFixed(1));
        grade = score >= 90 ? "A+" : score >= 82 ? "A" : score >= 74 ? "B" : score >= 65 ? "C" : "Watch";
        trend = score >= 86 ? "Improving" : score >= 72 ? "Stable" : "Declining";
      }

      return {
        id: s._id,
        name: s.name,
        role: roleName,
        department,
        subject: roleName.includes("Teacher") ? "General" : "N/A",
        score, attendance, retention, classEngagement, studentImpact,
        taskCompletion, complaintRatio, resignationRisk, grade, trend,
        active: s.status === 'active'
      };
    });

    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendMonths = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      trendMonths.push({
        name: monthsName[month] + " " + String(year).slice(-2),
        endDate: new Date(year, month + 1, 0, 23, 59, 59, 999)
      });
      current.setMonth(current.getMonth() + 1);
    }

    const retentionTrends = trendMonths.map(m => {
      const pt = { name: m.name };
      departmentsList.forEach(dept => {
        const dRows = staffRows.filter(r => r.department === dept);
        const joinedStaff = dRows.filter(r => {
          const userObj = staffList.find(u => String(u._id) === String(r.id));
          return new Date(userObj?.joiningDate || userObj?.createdAt || new Date()) <= m.endDate;
        });

        const resignedCount = resignations.filter(res => {
          const userObj = staffList.find(u => String(u._id) === String(res.staffId));
          const uDept = userObj ? getDepartment(normalizeRole(userObj.role)) : "";
          return uDept === dept && res.status === 'accepted' && new Date(res.lastWorkingDate) <= m.endDate;
        }).length;

        const totalActive = joinedStaff.length - resignedCount;
        pt[dept] = totalActive > 0 ? Number(((totalActive / (totalActive + resignedCount)) * 100).toFixed(1)) : 0.0;
      });
      return pt;
    });

    const resignationRiskTrends = trendMonths.map((m) => {
      const pt = { name: m.name };
      departmentsList.forEach((dept) => {
        const dRows = staffRows.filter(r => r.department === dept);
        pt[dept] = dRows.length > 0 ? Number((dRows.reduce((sum, r) => sum + r.resignationRisk, 0) / dRows.length).toFixed(1)) : 0.0;
      });
      return pt;
    });

    res.status(200).json({
      success: true,
      data: {
        staffRows,
        departments: departmentsList,
        retentionTrends,
        resignationRiskTrends,
        openResigns: resignations.filter(r => r.status === 'pending').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};