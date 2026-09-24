import mongoose from "mongoose";
import User from "../../models/users/user.model.js";
import Teacher from "../../models/users/teacher.model.js";
import Subject from "../../models/modules/Subject.js";
import ClassModel from "../../models/organization/organizationClass.js";
import Timetable from "../../models/academic/timetable.model.js";
import School from "../../models/school/School.js";
import { generateTeacherCredentials } from "../../utils/generateCredentials.js";

const getScope = (req) => {
  const school = req.user?.school;
  const schoolId = school?._id || school;
  const organizationId = school?.organization?._id || school?.organization;
  return { schoolId, organizationId, school };
};

const teacherCard = (u, t, classMap, subjectMap) => {
  const classes = (t?.assignedClasses || []).map((cid) => classMap.get(String(cid))).filter(Boolean);
  const subjects = (t?.subjects || []).map((sid) => subjectMap.get(String(sid))).filter(Boolean);
  return {
    id: u._id,
    empId: t?.staffId || u.loginId,
    name: u.name,
    designation: t?.designation || "Subject Teacher",
    qualification: t?.qualification || "",
    experience: t?.experience || 0,
    subjects,
    classes,
    contact: t?.phone || "",
    email: u.email,
    dob: t?.dateOfBirth || null,
    joiningDate: t?.joiningDate || null,
    gender: t?.gender || "",
    bloodGroup: t?.bloodGroup || "",
    address: t?.address?.city || "",
    photo: t?.photo || null,
    status: u.status === "inactive" ? "Inactive" : "Active",
  };
};

export const getTeachers = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { search, subjectId, classId, status } = req.query;

    // Hide archived teachers completely from all views
    const userQuery = { school: schoolId, role: "teacher", status: { $ne: "archived" } }; 
    
    // Apply specific Active/Inactive filters if requested
    if (status && status !== "All") {
        userQuery.status = status.toLowerCase() === "inactive" ? "inactive" : "active";
    }
    if (search) userQuery.$or = [{ name: { $regex: search, $options: "i" } }, { loginId: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];

    const users = await User.find(userQuery).lean();
    const userIds = users.map((u) => u._id);
    const teachers = await Teacher.find({ user: { $in: userIds }, school: schoolId }).lean();

    const classIds = [...new Set(teachers.flatMap((t) => (t.assignedClasses || []).map((id) => String(id))))];
    const subjectIds = [...new Set(teachers.flatMap((t) => (t.subjects || []).map((id) => String(id))))];

    const [classes, subjects] = await Promise.all([
      ClassModel.find({ _id: { $in: classIds } }).select("name numericLevel").lean(),
      Subject.find({ _id: { $in: subjectIds } }).select("subjectName subjectCode").lean(),
    ]);

    const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
    const subjectMap = new Map(subjects.map((s) => [String(s._id), s.subjectName]));
    const teacherMap = new Map(teachers.map((t) => [String(t.user), t]));

    let data = users.map((u) => teacherCard(u, teacherMap.get(String(u._id)), classMap, subjectMap));

    if (subjectId) data = data.filter((d) => (teacherMap.get(String(d.id))?.subjects || []).some((id) => String(id) === String(subjectId)));
    if (classId) data = data.filter((d) => (teacherMap.get(String(d.id))?.assignedClasses || []).some((id) => String(id) === String(classId)));

    const stats = {
      totalTeachers: data.length,
      activeTeachers: data.filter((d) => d.status === "Active").length,
      inactiveTeachers: data.filter((d) => d.status === "Inactive").length,
    };

    res.status(200).json({ success: true, data, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherById = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { id } = req.params;
    const user = await User.findOne({ _id: id, school: schoolId, role: "teacher" }).lean();
    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });
    const teacher = await Teacher.findOne({ user: id, school: schoolId }).lean();

    const classIds = (teacher?.assignedClasses || []).map((cid) => String(cid));
    const subjectIds = (teacher?.subjects || []).map((sid) => String(sid));
    const [classes, subjects] = await Promise.all([
      ClassModel.find({ _id: { $in: classIds } }).select("name").lean(),
      Subject.find({ _id: { $in: subjectIds } }).select("subjectName").lean(),
    ]);
    const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
    const subjectMap = new Map(subjects.map((s) => [String(s._id), s.subjectName]));

    res.status(200).json({ success: true, data: teacherCard(user, teacher, classMap, subjectMap) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeacher = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { schoolId } = getScope(req);
    const school = await School.findById(schoolId).lean();
    if (!school) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "School not found" });
    }

    // Validate staff allocation capacity
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
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Maximum staff allocation of ${maxStaff} has been reached.`
        });
      }
    }

    const {
      name,
      email,
      phone,
      designation,
      qualification,
      experience,
      dateOfBirth,
      gender,
      joiningDate,
      assignedClasses = [],
      subjects = [],
      salary,
      staffId,
    } = req.body;

    if (!name || !email || !phone) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "name, email, phone are required" });
    }

    const existing = await User.findOne({ email }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const { loginId, plainPassword } = await generateTeacherCredentials(school.schoolName);
    const user = await User.create(
      [{
        name,
        email,
        loginId,
        password: plainPassword,
        role: "teacher",
        school: schoolId,
        status: "active",
      }],
      { session }
    );

    const profile = await Teacher.create(
      [{
        user: user[0]._id,
        school: schoolId,
        phone,
        staffId: staffId || loginId,
        designation: designation || "Subject Teacher",
        qualification: qualification || "",
        experience: Number(experience || 0),
        dateOfBirth: dateOfBirth || null,
        gender: gender || "Male",
        joiningDate: joiningDate || new Date(),
        assignedClasses,
        subjects,
        salary: Number(salary || 0),
      }],
      { session }
    );

    user[0].profileId = profile[0]._id;
    user[0].profileModel = "Teacher";
    await user[0].save({ session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "Teacher created",
      credentials: { loginId, password: plainPassword },
      data: { teacherUserId: user[0]._id, loginId, password: plainPassword },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { id } = req.params;
    const user = await User.findOne({ _id: id, school: schoolId, role: "teacher" });
    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });

    const {
      name,
      email,
      phone,
      designation,
      qualification,
      experience,
      dateOfBirth,
      gender,
      joiningDate,
      assignedClasses,
      subjects,
      salary,
      status,
    } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (status !== undefined) user.status = status.toLowerCase() === "inactive" ? "inactive" : "active";
    await user.save();

    const profileUpdate = {};
    if (phone !== undefined) profileUpdate.phone = phone;
    if (designation !== undefined) profileUpdate.designation = designation;
    if (qualification !== undefined) profileUpdate.qualification = qualification;
    if (experience !== undefined) profileUpdate.experience = Number(experience || 0);
    if (dateOfBirth !== undefined) profileUpdate.dateOfBirth = dateOfBirth || null;
    if (gender !== undefined) profileUpdate.gender = gender;
    if (joiningDate !== undefined) profileUpdate.joiningDate = joiningDate || null;
    if (assignedClasses !== undefined) profileUpdate.assignedClasses = assignedClasses;
    if (subjects !== undefined) profileUpdate.subjects = subjects;
    if (salary !== undefined) profileUpdate.salary = Number(salary || 0);

    await Teacher.findOneAndUpdate({ user: id, school: schoolId }, { $set: profileUpdate }, { new: true });
    res.status(200).json({ success: true, message: "Teacher updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTeacherStatus = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { id } = req.params;
    const { status } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: id, school: schoolId, role: "teacher" },
      { $set: { status: status?.toLowerCase() === "inactive" ? "inactive" : "active" } },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });
    res.status(200).json({ success: true, message: "Status updated", data: { id: user._id, status: user.status } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { id } = req.params;
    
    // Set User status to "archived"
    const user = await User.findOneAndUpdate(
      { _id: id, school: schoolId, role: "teacher" },
      { $set: { status: "archived" } },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });
    
    // Set Teacher profile status to "archived"
    await Teacher.findOneAndUpdate(
      { user: id, school: schoolId }, 
      { $set: { status: "archived" } }
    );
    
    res.status(200).json({ success: true, message: "Teacher archived successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherSchedule = async (req, res) => {
  try {
    const { schoolId } = getScope(req);
    const { teacherId, week } = req.query;
    if (!teacherId) return res.status(400).json({ success: false, message: "teacherId is required" });

    const teacherUser = await User.findOne({ _id: teacherId, school: schoolId, role: "teacher" }).select("_id name loginId").lean();
    if (!teacherUser) return res.status(404).json({ success: false, message: "Teacher not found" });

    const timetables = await Timetable.find({
      school: schoolId,
      isActive: true,
      "schedule.periods.teacher": new mongoose.Types.ObjectId(teacherId),
    })
      .populate("class", "name")
      .populate("schedule.periods.subject", "subjectName subjectCode")
      .lean();

    const rows = [];
    timetables.forEach((tt) => {
      (tt.schedule || []).forEach((d) => {
        (d.periods || []).forEach((p) => {
          const pid = typeof p.teacher === "object" ? String(p.teacher?._id || p.teacher) : String(p.teacher || "");
          if (pid === String(teacherId) && !p.isBreak) {
            rows.push({
              day: d.day,
              periodNumber: p.periodNumber,
              startTime: p.startTime,
              endTime: p.endTime,
              class: tt.class?.name || "",
              section: tt.section || "",
              subject: p.subject?.subjectName || "",
              subjectCode: p.subject?.subjectCode || "",
              timetableId: tt._id,
            });
          }
        });
      });
    });

    const totalPeriods = rows.length;
    const dayCount = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].length;
    const maxSlots = 8;
    const freePeriods = Math.max(0, dayCount * maxSlots - totalPeriods);

    res.status(200).json({
      success: true,
      data: {
        teacher: teacherUser,
        week: week || null,
        totalPeriods,
        freePeriods,
        schedule: rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

