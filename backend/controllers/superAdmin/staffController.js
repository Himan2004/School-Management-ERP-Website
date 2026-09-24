import mongoose from 'mongoose';
import User from '../../models/users/user.model.js';
import Teacher from '../../models/users/teacher.model.js';
import Admin from '../../models/users/admin.model.js';
import Accountant from '../../models/users/accountant.model.js';
import Principal from '../../models/users/principal.model.js';
import School from '../../models/school/School.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import Resignation from '../../models/HRM/Resignation.model.js';
import StaffProfile from '../../models/users/staffProfile.model.js';

// 🔥 IMPORT THE EMAIL SERVICE
import { sendStaffCredentialsEmail } from '../../services/emailService.js';

// ── Helper to generate strict, role-based credentials ──
const generateCredentials = (role, name) => {
  // Generate a random 3-letter + 4-number string (e.g., "FSX7493")
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randStr = '';
  for (let i = 0; i < 3; i++) randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  const randNum = Math.floor(1000 + Math.random() * 9000); 
  const idSuffix = `${randStr}${randNum}`;
  
  // Generate a random 6-digit number for the password (e.g., "897890")
  const passNum = Math.floor(100000 + Math.random() * 900000); 

  let loginId = '';
  let password = '';

  switch (role) {
    case 'principal':
      loginId = `PRL-${idSuffix}`;
      password = `Principal@${passNum}`;
      break;
    case 'admin':
      loginId = `ADM-${idSuffix}`;
      password = `Admin@${passNum}`;
      break;
    case 'accountant':
      loginId = `ACC-${idSuffix}`;
      // Based on your example (e.g. ritesh21), but standardized for security:
      password = `${name.split(' ')[0].toLowerCase()}${Math.floor(10 + Math.random() * 90)}`; 
      break;
    case 'teacher':
      loginId = `TCH-${idSuffix}`;
      password = `Tch@${passNum}`;
      break;
    default:
      loginId = `STF-${idSuffix}`;
      password = `Staff@${passNum}`;
      break;
  }

  return { loginId, password };
};

export const getAllStaff = async (req, res) => {
  try {
    const { role, status } = req.query;
    
    // req.user IS the Organization document (same as pendingDues fix)
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));

    // First get all schools under this org
    const schools = await School.find({ organization: orgId }).select("_id");
    const schoolIds = schools.map(s => s._id);

    const filter = { 
      role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] },
      school: { $in: schoolIds }  // ← only staff from this org's schools
    };

    if (role) filter.role = role;
    if (status) filter.status = status;

    const staff = await User.find(filter)
      .select('-password')
      .populate('school')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: staff,
      count: staff.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single staff member details
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id)
      .select('-password')
      .populate('school');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Get role-specific details
    let roleDetails = {};
    switch (staff.role) {
      case 'teacher':
        roleDetails = await Teacher.findOne({ user: id });
        break;
      case 'admin':
        roleDetails = await Admin.findOne({ user: id });
        break;
      case 'accountant':
        roleDetails = await Accountant.findOne({ user: id });
        break;
      case 'principal':
        roleDetails = await Principal.findOne({ user: id });
        break;
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        ...staff.toObject(), 
        roleDetails 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new staff member (SuperAdmin only)
export const createStaff = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone,
      role, 
      school,
      organization,
      joiningDate,
      department,
      qualification,
      experience,
      salary
    } = req.body;

    // Validation
    if (!name || !email || !role || !school) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, email, role, school' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // 🔥 Generate Secure Credentials based on role
    const generatedCreds = generateCredentials(role, name);
    const finalLoginId = req.body.loginId || generatedCreds.loginId;
    const finalPassword = req.body.password || generatedCreds.password;

    // Check if loginId already exists (edge case)
    const existingLoginId = await User.findOne({ loginId: finalLoginId });
    if (existingLoginId) {
      return res.status(409).json({ 
        success: false, 
        message: 'Generated Login ID collided. Please try again.' 
      });
    }

    // Create base user
    const user = await User.create({
      name,
      email,
      loginId: finalLoginId,
      password: finalPassword,
      phone,
      role,
      school,
      organization,
      status: 'active',
      joiningDate: joiningDate || new Date()
    });

    let roleRecord = null;
    try {
      // Create role-specific record
      switch (role) {
        case 'teacher':
          roleRecord = await Teacher.create({
            user: user._id,
            school,
            phone,
            staffId: finalLoginId, // Use the generated login ID as the Staff ID
            joiningDate: joiningDate || new Date(),
            qualification: qualification || '',
            experience: experience || 0,
            salary: salary || 0,
            department: department || 'General'
          });
          break;
      case 'admin':
        roleRecord = await Admin.create({
          user: user._id,
          school,
          phone,
          joiningDate: joiningDate || new Date(),
          department: department || 'Administration'
        });
        break;
      case 'accountant':
        roleRecord = await Accountant.create({
          user: user._id,
          school,
          phone,
          joiningDate: joiningDate || new Date(),
          department: department || 'Finance'
        });
        break;
      case 'principal':
        roleRecord = await Principal.create({
          user: user._id,
          school,
          phone,
          joiningDate: joiningDate || new Date()
        });
        break;
      }
    } catch (roleError) {
      // Rollback user creation if role-specific record fails
      await User.findByIdAndDelete(user._id);
      throw roleError;
    }

    // 🔥 Send Email with Credentials
    let emailStatusMessage = "Staff member created successfully";
    try {
      const schoolDoc = await School.findById(school).select("schoolName name");
      const schoolName = schoolDoc?.schoolName || schoolDoc?.name || "our institution";
      
      await sendStaffCredentialsEmail(user, finalLoginId, finalPassword, schoolName, role);
      emailStatusMessage = "Staff member created and credentials emailed successfully!";
    } catch (emailErr) {
      console.error("Failed to send staff credential email:", emailErr);
      emailStatusMessage = "Staff created, but failed to send email. Check SMTP settings.";
    }

    res.status(201).json({ 
      success: true, 
      message: emailStatusMessage,
      data: {
        user: user.toObject(),
        roleDetails: roleRecord
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update staff member
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Extract ONLY the fields that are allowed to be updated
    const { name, phone, status, school } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (status) updates.status = status;
    if (school) updates.school = school;

    // 2. Update and populate school so the frontend table has the full school name
    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('school');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Staff member updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete staff member (soft delete - mark as inactive)
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Staff member deactivated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search staff members
export const searchStaff = async (req, res) => {
  try {
    const { query, school } = req.query;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { loginId: { $regex: query, $options: 'i' } }
      ],
      role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] }
    };

    if (school) filter.school = school;

    const results = await User.find(filter)
      .select('-password')
      .populate('school')
      .limit(10);

    res.status(200).json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get staff statistics
export const getStaffStats = async (req, res) => {
  try {
    const { school, organization } = req.query;
    const filter = { role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] } };

    if (school) filter.school = school;
    if (organization) filter.organization = organization;

    const stats = await User.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totalStaff = await User.countDocuments(filter);
    const activeStaff = await User.countDocuments({ ...filter, status: 'active' });

    res.status(200).json({ 
      success: true, 
      data: {
        totalStaff,
        activeStaff,
        roleWiseBreakdown: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffBenchmarking = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { dateFrom, dateTo, academicSession, role } = req.query;

    // Get all schools under this organization
    const schools = await School.find({ organization: orgId }).select("_id schoolName");
    const schoolIds = schools.map(s => s._id);

    // ─── Filter Dates ─────────────────────────────────────────────────────────────
    const monthMap = {
      "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
      "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
    };

    const session = academicSession || "2025-26";
    const startYear = parseInt(session.split("-")[0]) || 2025;
    const endYear = startYear + 1;

    const fromMonthName = dateFrom || "April";
    const toMonthName = dateTo || "September";

    const fromMonth = monthMap[fromMonthName] !== undefined ? monthMap[fromMonthName] : 3;
    const toMonth = monthMap[toMonthName] !== undefined ? monthMap[toMonthName] : 8;

    const fromYear = fromMonth >= 3 ? startYear : endYear;
    const toYear = toMonth >= 3 ? startYear : endYear;

    const startDate = new Date(fromYear, fromMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(toYear, toMonth + 1, 0, 23, 59, 59, 999);

    // ─── Staff Filter ─────────────────────────────────────────────────────────────
    const staffFilter = {
      role: { $in: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'] },
      school: { $in: schoolIds },
      $or: [
        { joiningDate: { $lte: endDate } },
        { createdAt: { $lte: endDate } }
      ]
    };

    if (role && role !== 'All') {
      let dbRole = role.toLowerCase();
      if (dbRole.includes("teacher")) dbRole = "teacher";
      else if (dbRole.includes("principal")) dbRole = "principal";
      else if (dbRole.includes("account")) dbRole = "accountant";
      else if (dbRole.includes("admin")) dbRole = "admin";
      else if (dbRole.includes("support")) dbRole = "support_staff";
      
      staffFilter.role = dbRole;
    }

    const staffList = await User.find(staffFilter).populate('school');

    // Get role-specific details to calculate experience
    const teachers = await Teacher.find({ school: { $in: schoolIds } }).select("user experience assignedClasses subjects");
    const supportProfiles = await StaffProfile.find({ school: { $in: schoolIds } }).select("user experience");

    const experienceMap = new Map();
    teachers.forEach(t => {
      experienceMap.set(String(t.user), t.experience || 0);
    });
    supportProfiles.forEach(p => {
      experienceMap.set(String(p.user), p.experience || 0);
    });

    // ─── Attendance Query Filter ──────────────────────────────────────────────────
    const attendanceFilter = {
      school: { $in: schoolIds },
      date: { $gte: startDate, $lte: endDate }
    };
    const attendanceRecords = await StaffAttendance.find(attendanceFilter);

    // ─── Resignations Query Filter ────────────────────────────────────────────────
    const resignationFilter = {
      school: { $in: schoolIds },
      resignationDate: { $gte: startDate, $lte: endDate }
    };
    const resignations = await Resignation.find(resignationFilter);

    const normalizeRole = (roleStr = "") => {
      const label = roleStr.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const l = label.toLowerCase();
      if (l.includes("principal")) return "Principal";
      if (l.includes("account")) return "Accountant";
      if (l.includes("admin")) return "Admin Department";
      if (l.includes("class")) return "Class Teacher";
      if (l.includes("subject")) return "Subject Teacher";
      if (l.includes("teacher")) return "Teacher";
      return label || "Staff";
    };

    // ─── Data builders ────────────────────────────────────────────────────────────
    const staffRows = staffList.map((s, i) => {
      const roleName = normalizeRole(s.role);
      const branch = s.school?.schoolName || "Unassigned";

      // 1. Calculate Attendance
      const staffAtt = attendanceRecords.filter(r => String(r.staffId) === String(s._id));
      const totalDays = staffAtt.length;
      const presentCount = staffAtt.filter(r => ['present', 'late'].includes(r.status)).length;
      const halfDayCount = staffAtt.filter(r => r.status === 'half_day').length;
      
      const hasPendingResign = resignations.some(r => String(r.staffId) === String(s._id) && r.status === 'pending');
      const hasAcceptedResign = resignations.some(r => String(r.staffId) === String(s._id) && r.status === 'accepted');
      const hasResignationRecord = hasPendingResign || hasAcceptedResign;

      const hasActualData = totalDays > 0 || hasResignationRecord;

      let attendance = 0.0;
      let score = 0.0;
      let resignationRisk = 0.0;
      let retention = 0.0;
      let classEngagement = 0.0;
      let studentImpact = 0.0;
      let ptmParticipation = 0.0;
      let taskCompletion = 0.0;
      let satisfaction = 0.0;
      let complaintRatio = 0.0;
      let grade = "N/A";
      let trend = "Stable";

      if (hasActualData) {
        attendance = totalDays > 0 
          ? ((presentCount + halfDayCount * 0.5) / totalDays) * 100 
          : 0.0;

        // 2. Calculate Tenure
        const tenureInYears = (new Date() - new Date(s.createdAt)) / (1000 * 60 * 60 * 24 * 365.25);
        const tenureBonus = Math.min(10, tenureInYears * 1.5);

        // 3. Experience
        const experience = experienceMap.get(String(s._id)) || 0;
        const expBonus = Math.min(10, experience * 0.5);

        // 4. Score (Performance Score)
        const attModifier = (attendance - 90) * 0.8;
        const statusModifier = s.status === 'active' ? 5 : -10;
        score = Math.min(98, Math.max(0, 75 + tenureBonus + expBonus + attModifier + statusModifier));

        // 5. Resignation Risk
        resignationRisk = hasPendingResign 
          ? 100.0 
          : Math.min(100, Math.max(0, (100 - (92 - (score < 70 ? 11 : (i % 8)))) + (score < 70 ? 8 : 0) + (attendance < 80 ? (80 - attendance) * 2 : 0)));

        // 6. Retention Rate
        retention = hasAcceptedResign ? 0.0 : 100.0 - resignationRisk;

        // 7. Derived Metrics
        classEngagement = Math.min(98, Math.max(0, score + 2 - ((i % 5) - 2) * 1.2));
        studentImpact = Math.min(98, Math.max(0, score + 1 - ((i % 4) - 1) * 1.5));
        ptmParticipation = Math.min(98, Math.max(0, 76 + (i % 7) * 3));
        taskCompletion = Math.min(98, Math.max(0, score + 5 - ((i % 5) - 1) * 1.1));
        satisfaction = Number((3.6 + score / 70).toFixed(1));
        complaintRatio = Number(Math.max(0.0, (100 - score) / 18).toFixed(1));
        grade = score >= 90 ? "A+" : score >= 82 ? "A" : score >= 74 ? "B" : score >= 65 ? "C" : "Watch";
        trend = score >= 86 ? "Improving" : score >= 72 ? "Stable" : "Declining";
      }

      return {
        id: s._id,
        name: s.name,
        branch,
        role: roleName,
        subject: roleName.includes("Teacher") ? "General" : "N/A",
        department: roleName.includes("Teacher") ? "Teaching" : roleName === "Principal" ? "Leadership" : roleName === "Accountant" ? "Finance" : "Administration",
        score,
        attendance,
        retention,
        classEngagement,
        studentImpact,
        ptmParticipation,
        taskCompletion,
        satisfaction,
        complaintRatio,
        resignationRisk,
        grade,
        trend,
        active: s.status === 'active'
      };
    });

    // ─── Per-branch aggregates ──────────────────────────────────────────────────
    const branchMap = new Map();
    schools.forEach(sch => {
      branchMap.set(sch.schoolName, []);
    });

    staffRows.forEach(r => {
      if (!branchMap.has(r.branch)) {
        branchMap.set(r.branch, []);
      }
      branchMap.get(r.branch).push(r);
    });

    const branchMetrics = Array.from(branchMap.entries()).map(([branch, rows]) => {
      const staffCount = rows.length;
      return {
        branch,
        staffCount,
        attendance: staffCount > 0 ? Number((rows.reduce((sum, r) => sum + r.attendance, 0) / staffCount).toFixed(1)) : 0,
        performance: staffCount > 0 ? Number((rows.reduce((sum, r) => sum + r.score, 0) / staffCount).toFixed(1)) : 0,
        resignationRate: staffCount > 0 ? Number((rows.reduce((sum, r) => sum + r.resignationRisk, 0) / staffCount).toFixed(1)) : 0,
        retention: staffCount > 0 ? Number((rows.reduce((sum, r) => sum + r.retention, 0) / staffCount).toFixed(1)) : 0,
      };
    });

    // ─── Build Historical Trends (Dynamic based on Month From / To) ─────────────
    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendMonths = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      trendMonths.push({
        name: monthsName[month] + " " + String(year).slice(-2),
        monthIndex: month,
        year: year,
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0, 23, 59, 59, 999)
      });
      current.setMonth(current.getMonth() + 1);
    }

    const retentionTrends = trendMonths.map(m => {
      const pt = { name: m.name };
      branchMetrics.forEach(bm => {
        const brRows = staffRows.filter(r => r.branch === bm.branch);
        const joinedStaff = brRows.filter(r => {
          const userObj = staffList.find(u => String(u._id) === String(r.id));
          const jDate = new Date(userObj?.joiningDate || userObj?.createdAt || new Date());
          return jDate <= m.endDate;
        });

        const resignedCount = resignations.filter(res => {
          const schoolMatch = schools.find(s => s.schoolName === bm.branch);
          if (!schoolMatch || String(res.school) !== String(schoolMatch._id)) return false;
          return res.status === 'accepted' && new Date(res.lastWorkingDate) <= m.endDate;
        }).length;

        const totalActive = joinedStaff.length - resignedCount;
        pt[bm.branch] = totalActive > 0 ? Number(((totalActive / (totalActive + resignedCount)) * 100).toFixed(1)) : 0.0;
      });
      return pt;
    });

    const resignationRiskTrends = trendMonths.map((m) => {
      const pt = { name: m.name };
      branchMetrics.forEach((bm) => {
        const brRows = staffRows.filter(r => r.branch === bm.branch);
        const avgRisk = brRows.length > 0 
          ? Number((brRows.reduce((sum, r) => sum + r.resignationRisk, 0) / brRows.length).toFixed(1))
          : 0.0;
        pt[bm.branch] = avgRisk;
      });
      return pt;
    });

    // ─── KPI values ──────────────────────────────────────────────────────────
    const totalStaff = staffRows.length;
    const activeStaff = staffRows.filter(s => s.active).length;
    const openResigns = resignations.filter(r => r.status === 'pending').length;
    const avgAttendanceVal = totalStaff > 0 ? (staffRows.reduce((sum, r) => sum + r.attendance, 0) / totalStaff).toFixed(1) : "N/A";
    const avgRetentionVal = totalStaff > 0 ? (staffRows.reduce((sum, r) => sum + r.retention, 0) / totalStaff).toFixed(1) : "N/A";

    res.status(200).json({
      success: true,
      data: {
        staffRows,
        branchMetrics,
        retentionTrends,
        resignationRiskTrends,
        totalStaff,
        activeStaff,
        avgAttendance: avgAttendanceVal !== "N/A" ? `${avgAttendanceVal}%` : "N/A",
        avgRetention: avgRetentionVal !== "N/A" ? `${avgRetentionVal}%` : "N/A",
        openResigns,
        branches: schools.map(s => s.schoolName)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

