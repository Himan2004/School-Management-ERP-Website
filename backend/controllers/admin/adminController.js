import mongoose from "mongoose";
import organizationSubjects from "../../models/organization/organizationSubjects.js";
import School from "../../models/school/School.js";
import User from "../../models/users/user.model.js";
import Teacher from "../../models/users/teacher.model.js"
import Subject from "../../models/modules/Subject.js";
import { sendTeacherCredentialsEmail, sendAccountantCredentialsEmail } from "../../services/emailService.js";
import { generateTeacherCredentials, generateAccountantCredentials } from "../../utils/generateCredentials.js";
import AccountantProfile from "../../models/users/accountant.model.js";
import Admin from "../../models/users/admin.model.js";
import Leave from "../../models/common/Leave.js";
import FeePayment from "../../models/finance/FeePayment.model.js";
import StudentActivity from "../../models/academic/studentActivity.model.js";
import Class from "../../models/organization/organizationClass.js";
import Student from "../../models/users/student.model.js";


import Period from "../../models/modules/Period.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Get school ID from the authenticated admin
    const schoolId = req.user.school?._id || req.user.school || req.user._id;

    // Get school data
    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    // Calculate student statistics from User collection
    const totalStudents = await User.countDocuments({ school: schoolId, role: "student" });
    const activeStudents = await User.countDocuments({ school: schoolId, role: "student", status: "active" });
    const inactiveStudents = await User.countDocuments({ school: schoolId, role: "student", status: "inactive" });

    // Calculate subject statistics from Subject collection
    const totalSubjects = await Subject.countDocuments({ schoolId });
    const activeSubjects = await Subject.countDocuments({ schoolId, status: 'active' });
    const inactiveSubjects = await Subject.countDocuments({ schoolId, status: 'inactive' });

    // Calculate class statistics
    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
      : [];
    const isClassAllowed = (clsName) => {
      if (!clsName) return false;
      let cleanName = clsName.trim().toLowerCase();
      if (allocatedGrades.includes(cleanName)) return true;
      if (cleanName.startsWith("class ")) {
        cleanName = cleanName.substring(6).trim();
      }
      return allocatedGrades.includes(cleanName);
    };

    const organizationId = school.organization?._id || school.organization;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization context missing for school" });
    }
    const classes = await Class.find({ organization: organizationId, isActive: true }).lean();
    const filteredClasses = classes.filter((cls) => isClassAllowed(cls.name));

    const totalClasses = filteredClasses.length;
    const activeClasses = totalClasses;
    const inactiveClasses = classes.length - totalClasses;

    // Calculate staff statistics (Teacher + Accountant + Admin + Support Staff) from User collection
    const totalStaffCombined = await User.countDocuments({ school: schoolId, role: { $in: ["teacher", "accountant", "admin", "support_staff"] } });
    const activeStaffCombined = await User.countDocuments({ school: schoolId, role: { $in: ["teacher", "accountant", "admin", "support_staff"] }, status: 'active' });
    const inactiveStaffCombined = await User.countDocuments({ school: schoolId, role: { $in: ["teacher", "accountant", "admin", "support_staff"] }, status: 'inactive' });

    // Calculate teacher statistics from User collection
    const totalTeachers = await User.countDocuments({ school: schoolId, role: "teacher" });
    const activeTeachers = await User.countDocuments({ school: schoolId, role: "teacher", status: 'active' });
    const inactiveTeachers = await User.countDocuments({ school: schoolId, role: "teacher", status: 'inactive' });

    // Get previous stats
    const previousStats = school.previousStats || {
      students: 0,
      teachers: 0,
      staff: 0,
      subjects: 0
    };

    // Calculate trends based on previous stats
    const calculateTrend = (current, previous) => {
      if (previous === 0) return '+0%'; // No previous data, show 0%
      const change = ((current - previous) / previous) * 100;
      return (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
    };

    // Update previous stats if it's been more than a day since last update
    const lastUpdated = school.previousStats?.updatedAt ? new Date(school.previousStats.updatedAt) : null;
    const shouldUpdatePrevious = !lastUpdated || (new Date() - lastUpdated) > 24 * 60 * 60 * 1000; // More than 24 hours

    if (shouldUpdatePrevious && (totalStudents > 0 || totalTeachers > 0 || totalStaffCombined > 0 || totalSubjects > 0)) {
      const newPreviousStats = {
        students: totalStudents,
        teachers: totalTeachers,
        staff: totalStaffCombined,
        subjects: totalSubjects,
        updatedAt: new Date()
      };
      await School.updateOne({ _id: schoolId }, { $set: { previousStats: newPreviousStats } });
    }

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: inactiveStudents,
          trend: calculateTrend(totalStudents, previousStats.students),
          previous: previousStats.students
        },
        teachers: {
          total: totalTeachers,
          active: activeTeachers,
          inactive: inactiveTeachers,
          trend: calculateTrend(totalTeachers, previousStats.teachers),
          previous: previousStats.teachers
        },
        staff: {
          total: totalStaffCombined,
          active: activeStaffCombined,
          inactive: inactiveStaffCombined,
          trend: calculateTrend(totalStaffCombined, previousStats.staff),
          previous: previousStats.staff
        },
        staffCombined: {
          total: totalStaffCombined,
          active: activeStaffCombined,
          inactive: inactiveStaffCombined,
          trend: '+0%'
        },
        classes: {
          total: totalClasses,
          active: activeClasses,
          inactive: inactiveClasses,
          trend: '+0%'
        },
        subjects: {
          total: totalSubjects,
          active: activeSubjects,
          inactive: inactiveSubjects,
          trend: calculateTrend(totalSubjects, previousStats.subjects),
          previous: previousStats.subjects
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a student
export const addStudent = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;
    const { studentId, name, email, phone, class: studentClass } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    // Check if student ID already exists
    const existingStudent = school.students.find(s => s.studentId === studentId);
    if (existingStudent) {
      return res.status(400).json({ success: false, message: "Student ID already exists" });
    }

    school.students.push({
      studentId,
      name,
      email,
      phone,
      class: studentClass,
      status: 'active'
    });

    await school.save();

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: school.students[school.students.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a subject
export const addSubject = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;
    const { subjectCode, subjectName, class: subjectClass } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    // Check if subject code already exists
    const existingSubject = school.subjects.find(s => s.subjectCode === subjectCode);
    if (existingSubject) {
      return res.status(400).json({ success: false, message: "Subject code already exists" });
    }

    school.subjects.push({
      subjectCode,
      subjectName,
      class: subjectClass,
      status: 'active'
    });

    await school.save();

    res.status(201).json({
      success: true,
      message: "Subject added successfully",
      data: school.subjects[school.subjects.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a staff member
export const addStaff = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;
    const { staffId, name, email, phone, department, position } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    // Check if staff ID already exists
    const existingStaff = school.staff.find(s => s.staffId === staffId);
    if (existingStaff) {
      return res.status(400).json({ success: false, message: "Staff ID already exists" });
    }

    school.staff.push({
      staffId,
      name,
      email,
      phone,
      department,
      position,
      status: 'active'
    });

    await school.save();

    res.status(201).json({
      success: true,
      message: "Staff added successfully",
      data: school.staff[school.staff.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update previous stats for trend calculation
export const updatePreviousStats = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;
    const { students, teachers, subjects, staff } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    school.previousStats = {
      students: students || school.students.length,
      teachers: teachers || 0, // Teachers are stored in separate collection
      subjects: subjects || school.subjects.length,
      staff: staff || school.staff.length,
      updatedAt: new Date()
    };

    await school.save();

    res.status(200).json({
      success: true,
      message: "Previous stats updated successfully",
      data: school.previousStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;
    const adminId = req.user._id;
    const { name, email, phone } = req.body;

    // Update User model
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Update admin user record
    if (name) admin.name = name;
    if (email) admin.email = email;

    await admin.save();

    // Also update Admin profile model
    const adminProfileUpdate = {};
    if (phone) adminProfileUpdate.phoneNumber = phone;
    if (req.file) adminProfileUpdate.photo = req.file.path;
    if (schoolId) adminProfileUpdate.school = schoolId;

    const updatedAdminProfile = await Admin.findOneAndUpdate(
      { user: adminId },
      { ...adminProfileUpdate },
      { upsert: true, new: true }
    );

    // Also update school profile if needed
    const school = await School.findById(admin.school);
    if (school && name) {
      school.principalName = name;
    }
    if (school && email) {
      school.officialEmail = email;
    }
    if (school && phone) {
      school.officialPhone = phone;
    }
    if (school && req.file) {
      school.adminProfile = {
        ...school.adminProfile,
        avatarUrl: req.file.path
      };
    }
    if (school) await school.save();

    const avatarPath = updatedAdminProfile?.photo || school?.adminProfile?.avatarUrl || "";

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        avatarUrl: avatarPath,
        profileImage: avatarPath,
        name: admin.name || "Admin",
        email: admin.email || "",
        phone: phone || updatedAdminProfile?.phoneNumber || "",
        role: "Admin",
        schoolName: school?.schoolName || "",
        address: updatedAdminProfile?.address || "",
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match',
      });
    }

    const admin = await User.findById(adminId).select('+password');
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Use model method to compare password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Use model method to change password
    await admin.changePassword(newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        school: {
          schoolName: school.settings?.school?.schoolName || school.schoolName || '',
          address: school.settings?.school?.address || school.address || '',
          contactNumber: school.settings?.school?.contactNumber || school.officialPhone || '',
          logoUrl: school.settings?.school?.logoUrl || '',
        },
        notifications: {
          emailNotifications: school.settings?.notifications?.emailNotifications ?? true,
          smsAlerts: school.settings?.notifications?.smsAlerts ?? false,
          appNotifications: school.settings?.notifications?.appNotifications ?? true,
        },
        uiPreferences: {
          darkMode: school.settings?.uiPreferences?.darkMode ?? false,
          language: school.settings?.uiPreferences?.language || 'en',
          accentColor: school.settings?.uiPreferences?.accentColor || '#2563eb',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const { school: schoolSettings = {}, notifications = {}, uiPreferences = {} } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    school.settings = {
      ...school.settings,
      school: {
        ...school.settings?.school,
        ...schoolSettings,
      },
      notifications: {
        ...school.settings?.notifications,
        ...notifications,
      },
      uiPreferences: {
        ...school.settings?.uiPreferences,
        ...uiPreferences,
      },
    };

    if (schoolSettings.schoolName !== undefined) {
      school.schoolName = schoolSettings.schoolName;
    }
    if (schoolSettings.address !== undefined) {
      school.address = schoolSettings.address;
    }
    if (schoolSettings.contactNumber !== undefined) {
      school.officialPhone = schoolSettings.contactNumber;
    }

    await school.save();

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        school: {
          schoolName: school.settings?.school?.schoolName || school.schoolName || '',
          address: school.settings?.school?.address || school.address || '',
          contactNumber: school.settings?.school?.contactNumber || school.officialPhone || '',
          logoUrl: school.settings?.school?.logoUrl || '',
        },
        notifications: {
          emailNotifications: school.settings?.notifications?.emailNotifications ?? true,
          smsAlerts: school.settings?.notifications?.smsAlerts ?? false,
          appNotifications: school.settings?.notifications?.appNotifications ?? true,
        },
        uiPreferences: {
          darkMode: school.settings?.uiPreferences?.darkMode ?? false,
          language: school.settings?.uiPreferences?.language || 'en',
          accentColor: school.settings?.uiPreferences?.accentColor || '#2563eb',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllTeachers = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school;

    const teachers = await Teacher.find({ school: schoolId })
      .populate("user")
      .populate("assignedClasses")
      .populate("subjects")
      .populate("school")
      .sort({ createdAt: -1 });

    res.json({ success: true, teachers });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTeacher = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school;
    const schoolName = req.user.school.schoolName || "SCH";

    // Validate staff allocation capacity
    const school = await School.findById(schoolId).lean();
    if (school) {
      const maxStaff = school.maxStaffLimit !== undefined && school.maxStaffLimit !== null && school.maxStaffLimit > 0
        ? Number(school.maxStaffLimit)
        : (school.totalStaff !== undefined && school.totalStaff !== ""
          ? Number(school.totalStaff) || 0
          : (Number(school.totalTeachingStaff) || 0) + (Number(school.totalNonTeachingStaff) || 0));

      if (maxStaff > 0) {
        const currentStaff = await User.countDocuments({
          school: schoolId,
          role: { $in: ["teacher", "accountant", "admin", "support_staff"] }
        });

        if (currentStaff >= maxStaff) {
          return res.status(400).json({
            success: false,
            message: "Maximum staff allocation reached."
          });
        }
      }
    }

    const {
      name,
      email,
      phone,
      gender,
      qualification,
      experience,
      joiningDate,
      salary,
      staffId,
      designation,
      department
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone are required"
      });
    }

    const existingTeacherUser = await User.findOne({
      email,
      role: "teacher"
    });

    if (existingTeacherUser) {
      return res.status(400).json({
        success: false,
        message: "Teacher with this email already exists"
      });
    }

    const { loginId, plainPassword } = await generateTeacherCredentials(schoolName);

    const user = await User.create({
      name,
      loginId,
      email,
      password: plainPassword,
      role: "teacher",
      school: schoolId
    });

    const teacher = await Teacher.create({
      user: user._id,
      phone,
      staffId: staffId || loginId,
      gender: gender || "Male",
      qualification,
      experience: experience || 0,
      joiningDate,
      salary,
      school: schoolId,
      designation: designation || "Subject Teacher",
      department
    });

    // 🔗 Link profile
    await user.updateProfileLink(teacher._id, "Teacher");

    // 📧 Send credentials
    try {
      await sendTeacherCredentialsEmail(
        user,
        loginId,
        plainPassword,
        schoolName
      );
    } catch (err) {
      console.error("Mail error:", err.message);
    }

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      credentials: { loginId, password: plainPassword },
      data: { loginId, password: plainPassword },
      teacher
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assignTeacher = async (req, res) => {
  try {
    const { assignedClasses, subjects } = req.body;

    let teacherProfile = await Teacher.findById(req.params.id);
    if (!teacherProfile) {
      teacherProfile = await Teacher.findOne({ user: req.params.id });
    }
    if (!teacherProfile) {
      const possibleUser = await mongoose.model("User").findById(req.params.id);
      if (possibleUser) {
        teacherProfile = await Teacher.findOne({ user: possibleUser._id });
      }
    }

    if (!teacherProfile) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }
    const teacherUserId = teacherProfile.user;

    const userDoc = await mongoose.model("User").findById(teacherUserId);
    if (!userDoc || userDoc.role !== "teacher") {
      return res.status(400).json({
        success: false,
        message: "Only teaching staff can be assigned to classes and subjects"
      });
    }

    let resolvedClassIds = [];
    let classSectionPairs = [];
    if (assignedClasses && Array.isArray(assignedClasses)) {
      for (const cls of assignedClasses) {
        if (mongoose.Types.ObjectId.isValid(cls)) {
          resolvedClassIds.push(cls);
          const classDoc = await mongoose.model("Class").findById(cls);
          if (classDoc) {
            classSectionPairs.push({ classId: classDoc._id, className: classDoc.name, section: "A" });
          }
        } else {
          const parts = cls.split(" - ");
          const classNameOnly = parts[0]?.trim();
          const sectionName = parts[1]?.trim() || "A";
          const classDoc = await mongoose.model("Class").findOne({ name: classNameOnly });
          if (classDoc) {
            resolvedClassIds.push(classDoc._id);
            classSectionPairs.push({ classId: classDoc._id, className: classDoc.name, section: sectionName });
          } else {
            const periodDoc = await mongoose.model("Period").findOne({ periodName: cls });
            if (periodDoc) {
              resolvedClassIds.push(periodDoc._id);
              classSectionPairs.push({ classId: periodDoc._id, className: periodDoc.periodName, section: "A" });
            }
          }
        }
      }
    }

    let resolvedSubjectIds = [];
    if (subjects && Array.isArray(subjects)) {
      for (const subj of subjects) {
        if (mongoose.Types.ObjectId.isValid(subj)) {
          resolvedSubjectIds.push(subj);
        } else {
          const subjectDoc = await mongoose.model("Subject").findOne({ subjectName: subj });
          if (subjectDoc) {
            resolvedSubjectIds.push(subjectDoc._id);
          } else {
            const orgSubjectDoc = await mongoose.model("organizationSubjects").findOne({ name: subj });
            if (orgSubjectDoc) {
              resolvedSubjectIds.push(orgSubjectDoc._id);
            }
          }
        }
      }
    }

    const schoolId = req.user.school?._id || req.user.school;
    let organizationId = req.user.school?.organization;
    if (!organizationId) {
      const schoolDoc = await mongoose.model("School").findById(schoolId).lean();
      organizationId = schoolDoc?.organization;
    }
    const config = await mongoose.model("AcademicConfig").findOne({ organization: organizationId }).lean();
    const academicYear = config?.academicYear?.label || "2026-2027";

    // Find admin users to clean up old admin-created assignments
    const adminUsers = await mongoose.model("User").find({ school: schoolId, role: "admin" }).select("_id").lean();
    const adminUserIds = adminUsers.map(u => u._id);

    // Delete old Admin SubjectAssignments for this teacher
    await mongoose.model("SubjectAssignment").deleteMany({
      school: schoolId,
      teacherUser: teacherUserId,
      assignedBy: { $in: adminUserIds }
    });

    // Create new Admin SubjectAssignments
    for (const pair of classSectionPairs) {
      for (const subjId of resolvedSubjectIds) {
        await mongoose.model("SubjectAssignment").findOneAndUpdate(
          {
            school: schoolId,
            academicYear,
            class: pair.classId,
            section: pair.section,
            subject: subjId
          },
          {
            $set: {
              organization: organizationId,
              teacherUser: teacherUserId,
              assignedBy: req.user._id
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    // Get subject names for the notification
    const subjectNames = [];
    for (const subjId of resolvedSubjectIds) {
      const sub = await mongoose.model("Subject").findById(subjId).select("subjectName").lean() 
        || await mongoose.model("organizationSubjects").findById(subjId).select("name").lean();
      if (sub) {
        subjectNames.push(sub.subjectName || sub.name);
      }
    }

    let subjectListString = "";
    if (subjectNames.length === 1) {
      subjectListString = subjectNames[0];
    } else if (subjectNames.length > 1) {
      subjectListString = subjectNames.slice(0, -1).join(", ") + " and " + subjectNames[subjectNames.length - 1];
    }

    // Create a notification for each class
    for (const pair of classSectionPairs) {
      let classLabel = pair.section ? `${pair.className}-${pair.section}` : pair.className;
      if (classLabel.toLowerCase().startsWith("class ")) {
        classLabel = classLabel.substring(6);
      }
      await mongoose.model("Notification").create({
        user: teacherUserId,
        title: "New Class Assignment",
        message: `You have been assigned Class ${classLabel} with subjects ${subjectListString} by Admin.`,
        type: "system",
        school: schoolId,
        senderName: req.user.name || "Admin",
        senderRole: "admin",
        source: "Admin Assignment"
      });
    }

    // Fetch all active SubjectAssignment documents for this teacher to compute the union
    const allAssignments = await mongoose.model("SubjectAssignment").find({
      teacherUser: teacherUserId,
      school: schoolId
    }).lean();

    const unionClassIds = [...new Set(allAssignments.map(a => a.class?.toString()).filter(Boolean))];
    const unionSubjectIds = [...new Set(allAssignments.map(a => a.subject?.toString()).filter(Boolean))];

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      {
        assignedClasses: unionClassIds,
        subjects: unionSubjectIds
      },
      { new: true }
    )
      .populate("assignedClasses")
      .populate("subjects");

    res.json({
      success: true,
      message: "Assignment updated",
      teacher
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const allowedUpdates = [
      "phone",
      "gender",
      "qualification",
      "experience",
      "joiningDate",
      "salary",
      "status",
      "designation",
      "department"
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    res.json({
      success: true,
      message: "Teacher updated",
      teacher
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Delete linked user
    await User.findByIdAndDelete(teacher.user);

    // Delete teacher profile
    await teacher.deleteOne();

    res.json({
      success: true,
      message: "Teacher deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAccountant = async (req, res) => {
  try {
    const {
      name, email, phone, gender, dob,
      address, qualification, experience, joiningDate, salary,
    } = req.body;

    const schoolId = req.user.school;

    // Validate staff allocation capacity
    const school = await School.findById(schoolId).lean();
    if (school) {
      const maxStaff = school.totalStaff !== undefined && school.totalStaff !== ""
        ? Number(school.totalStaff) || 0
        : (Number(school.totalTeachingStaff) || 0) + (Number(school.totalNonTeachingStaff) || 0);

      if (maxStaff > 0) {
        const currentStaff = await User.countDocuments({
          school: schoolId,
          role: { $in: ["teacher", "accountant", "admin", "support_staff"] }
        });

        if (currentStaff >= maxStaff) {
          return res.status(400).json({
            success: false,
            message: "Maximum staff allocation reached."
          });
        }
      }
    }

    // ── 1. Validation ─────────────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required.",
      });
    }

    // ── 2. Duplicate email check ──────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ── 3. Generate credentials ───────────────────────────────────────────
    const { loginId, plainPassword } = await generateAccountantCredentials(name);

    // ── 4. Photo ──────────────────────────────────────────────────────────
    const photoUrl = req.file ? req.file.path : null;

    // ── 5. Create User ────────────────────────────────────────────────────
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      loginId,
      password: plainPassword,
      role: "accountant",
      school: schoolId,
      status: "active",
    });

    // ── 6. Create Accountant profile ──────────────────────────────────────
    const accountantProfile = await AccountantProfile.create({
      user: newUser._id,
      school: schoolId,
      gender: gender || undefined,
      dob: dob || undefined,
      address: address?.trim() || undefined,
      photo: photoUrl,
      qualification: qualification || undefined,
      experience: experience !== "" ? Number(experience) : undefined,
      joiningDate: joiningDate || undefined,
      salary: salary !== "" ? Number(salary) : undefined,
    });

    // ── 7. Link profile to User ───────────────────────────────────────────
    await User.findByIdAndUpdate(newUser._id, {
      profileId: accountantProfile._id,
      profileModel: "Accountant",
    });

    // ── 8. Send credentials email ─────────────────────────────────────────
    try {
      await sendAccountantCredentialsEmail(
        { name: name.trim(), email: email.toLowerCase().trim() },
        loginId,
        plainPassword,
        req.user.schoolName
      );
    } catch (mailErr) {
      console.error("Accountant credentials email failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Accountant added successfully. Credentials sent to their email.",
      data: {
        userId: newUser._id,
        loginId: newUser.loginId,
        name: newUser.name,
        email: newUser.email,
        profileId: accountantProfile._id,
      },
    });

  } catch (error) {
    console.error("addAccountant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add accountant. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getDashboardActivities = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school || req.user._id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Calculate dashboard activity stats (student enrollments today, fee payments today, pending approvals)
    const newStudentsToday = await User.countDocuments({ school: schoolId, role: "student", createdAt: { $gte: startOfDay } });
    const paymentsToday = await FeePayment.countDocuments({ school: schoolId, paymentStatus: 'success', paymentDate: { $gte: startOfDay } });
    const pendingLeaves = await Leave.countDocuments({ school: schoolId, status: 'pending' });

    // 2. Fetch recent student activities from StudentActivity collection
    const studentActivities = await StudentActivity.find({ school: schoolId })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name' }
      })
      .sort({ activityDate: -1 })
      .limit(10)
      .lean();

    const formattedActivities = studentActivities.map(act => ({
      id: act._id,
      student: act.student?.user?.name || act.name || 'Unknown Student',
      achievement: act.achievementText || `${act.status === 'Winner' ? '🏆 Winner' : act.status} in ${act.name} (${act.description})`,
      time: act.activityDate ? new Date(act.activityDate).toLocaleDateString() : 'Recent',
      likes: Math.floor(Math.random() * 50) + 10,
      comments: Math.floor(Math.random() * 10) + 2
    }));

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
      : [];
    const isClassAllowed = (clsName) => {
      if (!clsName) return false;
      let cleanName = clsName.trim().toLowerCase();
      if (allocatedGrades.includes(cleanName)) return true;
      if (cleanName.startsWith("class ")) {
        cleanName = cleanName.substring(6).trim();
      }
      return allocatedGrades.includes(cleanName);
    };

    const organizationId = school.organization?._id || school.organization;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization context missing for school" });
    }

    const classesRaw = await Class.find({ organization: organizationId, isActive: true }).lean();
    const classes = classesRaw.filter((cls) => isClassAllowed(cls.name));
    const totalClassesCount = classes.length;
    
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const progressData = [];
    let completedClassesCount = 0;
    
    if (classes.length > 0) {
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        const studentCount = await Student.countDocuments({ class: cls._id, school: schoolId });
        const progress = Math.min(100, Math.max(30, (cls.numericLevel || 1) * 7 + 40));
        const completed = Math.round(studentCount * (progress / 100));
        
        if (progress >= 80) {
          completedClassesCount++;
        }
        
        progressData.push({
          label: cls.name,
          progress,
          color: colors[i % colors.length],
          students: studentCount,
          completed: completed
        });
      }
    } else {
      progressData.push(
        { label: 'Class X', progress: 75, color: 'bg-blue-500', students: 120, completed: 90 },
        { label: 'Class XI', progress: 60, color: 'bg-green-500', students: 98, completed: 59 },
        { label: 'Class XII', progress: 90, color: 'bg-purple-500', students: 85, completed: 76 }
      );
      completedClassesCount = 2;
    }
    
    const finalTotalClasses = classes.length > 0 ? totalClassesCount : 3;
    const finalCompleted = classes.length > 0 ? completedClassesCount : 2;
    const finalRemaining = finalTotalClasses - finalCompleted;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          newStudents: newStudentsToday,
          feePayments: paymentsToday,
          pendingLeaves: pendingLeaves
        },
        feed: formattedActivities,
        progressData,
        totalClassesCount: finalTotalClasses,
        completedClassesCount: finalCompleted,
        remainingClassesCount: finalRemaining
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};