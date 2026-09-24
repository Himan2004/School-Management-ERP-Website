import mongoose from "mongoose";
import Attendance from "../../models/academic/attendance.model.js";
import Student from "../../models/users/student.model.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import Section from "../../models/school/Section.model.js";

const ALLOWED_STATUSES = new Set([
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
]);

export const getTeacherHomeroom = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId } = getSchoolScope(req.user);

    // Find the active section where this user is the homeroom teacher
    const section = await Section.findOne({
      homeroomTeacher: teacherId,
      school: schoolId,
      status: "active",
    })
      .populate("classId", "name")
      .lean();

    if (!section) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No homeroom assigned to this teacher.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        classId: section.classId?._id?.toString(),
        className: section.classId?.name,
        sectionId: section._id?.toString(),
        sectionName: section.name,
      },
      message: "Homeroom details fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const getSchoolScope = (user) => {
  const school = user?.school;
  const schoolId = school?._id || school;
  const organizationId = school?.organization?._id || school?.organization;
  return { schoolId, organizationId };
};

const normalizeSection = (section) => (section ?? "").toString().trim();

const parseDateOnly = (value) => {
  if (!value) return null;
  const raw = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(raw.getTime())) return null;
  const date = new Date(raw);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateRange = (value) => {
  const start = parseDateOnly(value);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
};

const formatDateKey = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-CA");
};

const formatTimeLabel = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStudentSectionLabel = (student) => {
  if (!student?.section) return "";
  if (typeof student.section === "string") return student.section;
  return student.section?.name || student.section?._id?.toString() || "";
};

const matchSection = (student, sectionValue) => {
  if (!sectionValue) return true;
  const label = getStudentSectionLabel(student);
  return label === sectionValue || label.toString() === sectionValue.toString();
};

const buildStudentMaps = (students) => {
  const byStudentId = new Map();
  const byUserId = new Map();
  students.forEach((student) => {
    const studentId = student?._id?.toString();
    const userId = student?.user?._id?.toString() || student?.user?.toString();
    if (studentId) byStudentId.set(studentId, student);
    if (userId) byUserId.set(userId, student);
  });
  return { byStudentId, byUserId };
};

const getStudentUserId = (student) => student?.user?._id || student?.user;

const summarizeEntries = (entries = []) =>
  entries.reduce(
    (acc, entry) => {
      if (entry.status === "present") acc.present += 1;
      if (entry.status === "absent") acc.absent += 1;
      if (entry.status === "late") acc.late += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

// Verify teacher teaches this class
const verifyTeacherClass = async (teacherId, schoolId, classId, section) => {
  const assignment = await SubjectAssignment.findOne({
    teacherUser: teacherId,
    school: schoolId,
    class: classId,
    section: section,
  });
  return assignment;
};

const resolveClassName = (classDoc) =>
  classDoc?.name || classDoc?.className || classDoc?.periodName || "";

const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
};

const ensureValidClassId = (classId) =>
  mongoose.Types.ObjectId.isValid(classId);

export const getAttendanceClasses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId } = getSchoolScope(req.user);

    const assignments = await SubjectAssignment.find({
      teacherUser: teacherId,
      school: schoolId,
    })
      .populate("class", "name")
      .populate("subject", "subjectName name")
      .lean();

    if (!assignments.length) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No class assignments found",
      });
    }

    const classIds = [
      ...new Set(
        assignments
          .map((a) => a.class?._id?.toString() || a.class?.toString())
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const todayRange = getDateRange(new Date());
    const attendanceDocs = todayRange
      ? await Attendance.find({
          school: schoolId,
          class: { $in: classIds },
          date: { $gte: todayRange.start, $lt: todayRange.end },
        })
          .select("class section createdAt date")
          .lean()
      : [];

    const attendanceMap = new Map();
    attendanceDocs.forEach((doc) => {
      const key = `${doc.class?.toString()}_${doc.section || ""}`;
      if (!attendanceMap.has(key)) attendanceMap.set(key, doc);
    });

    const students = await Student.find({
      school: schoolId,
      class: { $in: classIds },
      status: "active",
    })
      .select("class section")
      .populate("section", "name")
      .lean();

    const seenKeys = new Set();
    const data = assignments.reduce((acc, assignment) => {
      const classId =
        assignment.class?._id?.toString() || assignment.class?.toString();
      if (!classId) return acc;
      const section = normalizeSection(assignment.section);
      const key = `${classId}_${section}`;
      if (seenKeys.has(key)) return acc;
      seenKeys.add(key);

      const className = resolveClassName(assignment.class);
      const subjectName =
        assignment.subject?.subjectName || assignment.subject?.name || "";
      const totalStudents = students.filter((student) => {
        const studentClassId =
          student.class?._id?.toString() || student.class?.toString();
        return studentClassId === classId && matchSection(student, section);
      }).length;

      const markedDoc = attendanceMap.get(key);
      acc.push({
        classId,
        className,
        section,
        subject: subjectName,
        totalStudents,
        todayMarked: Boolean(markedDoc),
        markedAt: markedDoc
          ? formatTimeLabel(markedDoc.createdAt || markedDoc.date)
          : null,
      });
      return acc;
    }, []);

    return res.status(200).json({
      success: true,
      data,
      message: "Attendance classes fetched successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

export const getStudentsForAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId } = getSchoolScope(req.user);
    const classId = req.query.class_id || req.query.classId;
    const section = normalizeSection(req.query.section);
    const dateInput = req.query.date;

    if (!classId || !ensureValidClassId(classId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid class id",
      });
    }

    const assignment = await verifyTeacherClass(
      teacherId,
      schoolId,
      classId,
      section,
    );
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        message: "Access denied for the selected class/section",
      });
    }

    const range = getDateRange(dateInput || new Date());
    if (!range) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid date format",
      });
    }

    const attendanceDoc = await Attendance.findOne({
      school: schoolId,
      class: classId,
      section,
      date: { $gte: range.start, $lt: range.end },
    }).lean();

    const entryMap = new Map();
    if (attendanceDoc?.entries?.length) {
      attendanceDoc.entries.forEach((entry) => {
        const userId = entry.student?.toString();
        if (userId) entryMap.set(userId, entry);
      });
    }

    let students = await Student.find({
      school: schoolId,
      class: classId,
      status: "active",
    })
      .populate("user", "name photo")
      .populate("section", "name")
      .lean();

    students = students.filter((student) => matchSection(student, section));

    const assignmentDetails = await SubjectAssignment.findOne({
      teacherUser: teacherId,
      school: schoolId,
      class: classId,
      section,
    })
      .populate("class", "name")
      .lean();

    const className = resolveClassName(assignmentDetails?.class);

    const studentsPayload = students.map((student) => {
      const userId = student.user?._id?.toString() || student.user?.toString();
      const entry = userId ? entryMap.get(userId) : null;
      return {
        id: student._id,
        userId: userId || null,
        name: student.user?.name || "",
        photo: student.user?.photo || student.photo || null,
        rollNo: student.rollNo || "",
        status: entry ? entry.status : null,
        attendanceId: entry ? attendanceDoc?._id || null : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        classId,
        className,
        section,
        date: formatDateKey(range.start),
        alreadyMarked: Boolean(attendanceDoc),
        students: studentsPayload,
      },
      message: "Students fetched for attendance",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId, organizationId } = getSchoolScope(req.user);
    const {
      classId,
      section: rawSection,
      date,
      subject,
      attendance,
    } = req.body;
    const section = normalizeSection(rawSection);

    if (!classId || !ensureValidClassId(classId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Invalid class id" });
    }
    if (rawSection === undefined || rawSection === null) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Section is required" });
    }
    if (!date) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Date is required" });
    }
    if (!Array.isArray(attendance) || attendance.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "Attendance entries are required",
        });
    }

    const assignment = await verifyTeacherClass(
      teacherId,
      schoolId,
      classId,
      section,
    );
    if (!assignment) {
      return res
        .status(403)
        .json({
          success: false,
          data: null,
          message: "Access denied for the selected class/section",
        });
    }

    const range = getDateRange(date);
    if (!range) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Invalid date format" });
    }
    const today = parseDateOnly(new Date());
    if (today && range.start > today) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "Cannot mark attendance for future dates",
        });
    }

    const invalidStatuses = attendance.filter(
      (entry) => !ALLOWED_STATUSES.has(entry?.status),
    );
    if (invalidStatuses.length) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "Invalid attendance status value",
        });
    }

    const existing = await Attendance.findOne({
      school: schoolId,
      class: classId,
      section,
      date: { $gte: range.start, $lt: range.end },
    }).lean();

    if (existing) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Attendance already marked for this date. Use edit instead.",
      });
    }

    let students = await Student.find({
      school: schoolId,
      class: classId,
      status: "active",
    })
      .populate("section", "name")
      .select("user class section")
      .lean();
    students = students.filter((student) => matchSection(student, section));

    const { byStudentId, byUserId } = buildStudentMaps(students);
    const invalidStudents = [];
    const entryMap = new Map();
    attendance.forEach((entry) => {
      const lookupId = entry?.studentId?.toString();
      if (!lookupId) return;
      const studentDoc = byStudentId.get(lookupId) || byUserId.get(lookupId);
      if (!studentDoc) {
        invalidStudents.push(lookupId);
        return;
      }
      const userId = getStudentUserId(studentDoc);
      if (!userId) {
        invalidStudents.push(lookupId);
        return;
      }
      entryMap.set(userId.toString(), {
        student: userId,
        status: entry.status,
      });
    });
    const entries = [...entryMap.values()];

    if (invalidStudents.length) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid student selection: ${invalidStudents.join(", ")}`,
      });
    }
    if (!entries.length) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "No valid attendance entries provided",
      });
    }

    const assignmentDetails = await SubjectAssignment.findOne({
      teacherUser: teacherId,
      school: schoolId,
      class: classId,
      section,
    })
      .populate("class", "name")
      .lean();

    const attendanceDoc = await Attendance.create({
      organization: organizationId,
      school: schoolId,
      academicYear: assignment?.academicYear,
      class: classId,
      section,
      subject: subject || null,
      attendanceType: subject ? "subject" : "class",
      date: range.start,
      markedBy: teacherId,
      markedByRole: "teacher",
      entries,
    });

    const summary = summarizeEntries(attendanceDoc.entries);

    return res.status(201).json({
      success: true,
      data: {
        date: formatDateKey(range.start),
        className: resolveClassName(assignmentDetails?.class),
        section,
        totalMarked: entries.length,
        summary,
      },
      message: "Attendance marked successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId, organizationId } = getSchoolScope(req.user);
    const { classId, section: rawSection, date, attendance } = req.body;
    const section = normalizeSection(rawSection);

    if (!classId || !ensureValidClassId(classId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Invalid class id" });
    }
    if (rawSection === undefined || rawSection === null) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Section is required" });
    }
    if (!date) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Date is required" });
    }
    if (!Array.isArray(attendance) || attendance.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "Attendance entries are required",
        });
    }

    const assignment = await verifyTeacherClass(
      teacherId,
      schoolId,
      classId,
      section,
    );
    if (!assignment) {
      return res
        .status(403)
        .json({
          success: false,
          data: null,
          message: "Access denied for the selected class/section",
        });
    }

    const range = getDateRange(date);
    if (!range) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Invalid date format" });
    }

    const today = parseDateOnly(new Date());
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 7);
    if (range.start < minDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Cannot edit attendance older than 7 days",
      });
    }

    const invalidStatuses = attendance.filter(
      (entry) => !ALLOWED_STATUSES.has(entry?.status),
    );
    if (invalidStatuses.length) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "Invalid attendance status value",
        });
    }

    let students = await Student.find({
      school: schoolId,
      class: classId,
      status: "active",
    })
      .populate("section", "name")
      .select("user class section")
      .lean();
    students = students.filter((student) => matchSection(student, section));

    const { byStudentId, byUserId } = buildStudentMaps(students);
    const invalidStudents = [];

    let attendanceDoc = await Attendance.findOne({
      school: schoolId,
      class: classId,
      section,
      date: { $gte: range.start, $lt: range.end },
    });

    if (!attendanceDoc) {
      let validEntriesCount = 0;
      const entries = attendance.reduce((acc, entry) => {
        const lookupId = entry?.studentId?.toString();
        if (!lookupId) return acc;
        const studentDoc = byStudentId.get(lookupId) || byUserId.get(lookupId);
        if (!studentDoc) {
          invalidStudents.push(lookupId);
          return acc;
        }
        const userId = getStudentUserId(studentDoc);
        if (!userId) {
          invalidStudents.push(lookupId);
          return acc;
        }
        validEntriesCount += 1;
        acc.push({
          student: userId,
          status: entry.status,
        });
        return acc;
      }, []);

      if (invalidStudents.length) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid student selection: ${invalidStudents.join(", ")}`,
        });
      }
      if (!validEntriesCount) {
        return res.status(400).json({
          success: false,
          data: null,
          message: "No valid attendance entries provided",
        });
      }

      attendanceDoc = await Attendance.create({
        organization: organizationId,
        school: schoolId,
        academicYear: assignment?.academicYear,
        class: classId,
        section,
        subject: null,
        attendanceType: "class",
        date: range.start,
        markedBy: teacherId,
        markedByRole: "teacher",
        entries,
        isEdited: true,
        editedBy: teacherId,
        editedAt: new Date(),
      });
    } else {
      const entryMap = new Map(
        (attendanceDoc.entries || []).map((entry) => [
          entry.student?.toString(),
          entry,
        ]),
      );
      let updatedCount = 0;
      attendance.forEach((entry) => {
        const lookupId = entry?.studentId?.toString();
        if (!lookupId) return;
        const studentDoc = byStudentId.get(lookupId) || byUserId.get(lookupId);
        if (!studentDoc) {
          invalidStudents.push(lookupId);
          return;
        }
        const userId = getStudentUserId(studentDoc)?.toString();
        if (!userId) {
          invalidStudents.push(lookupId);
          return;
        }
        const existingEntry = entryMap.get(userId);
        if (existingEntry) {
          existingEntry.status = entry.status;
          updatedCount += 1;
        } else {
          attendanceDoc.entries.push({ student: userId, status: entry.status });
          updatedCount += 1;
        }
      });

      if (invalidStudents.length) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid student selection: ${invalidStudents.join(", ")}`,
        });
      }
      if (!updatedCount) {
        return res.status(400).json({
          success: false,
          data: null,
          message: "No valid attendance entries provided",
        });
      }

      attendanceDoc.isEdited = true;
      attendanceDoc.editedBy = teacherId;
      attendanceDoc.editedAt = new Date();
      await attendanceDoc.save();
    }

    const summary = summarizeEntries(attendanceDoc.entries);

    return res.status(200).json({
      success: true,
      data: {
        date: formatDateKey(range.start),
        totalUpdated: attendance.length,
        summary,
      },
      message: "Attendance updated successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

export const getAttendanceReport = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId } = getSchoolScope(req.user);
    const classId = req.query.class_id || req.query.classId;
    const section = normalizeSection(req.query.section);

    if (!classId || !ensureValidClassId(classId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "Invalid class id" });
    }

    const assignment = await verifyTeacherClass(
      teacherId,
      schoolId,
      classId,
      section,
    );
    if (!assignment) {
      return res
        .status(403)
        .json({
          success: false,
          data: null,
          message: "Access denied for the selected class/section",
        });
    }

    const now = new Date();
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());
    const validMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const validYear = Number.isFinite(year) ? year : now.getFullYear();
    const { start, end } = getMonthRange(validMonth, validYear);

    const records = await Attendance.find({
      school: schoolId,
      class: classId,
      section,
      date: { $gte: start, $lt: end },
    }).lean();

    let students = await Student.find({
      school: schoolId,
      class: classId,
      status: "active",
    })
      .populate("user", "name photo")
      .populate("section", "name")
      .lean();
    students = students.filter((student) => matchSection(student, section));

    const studentStats = new Map();
    students.forEach((student) => {
      const userId = student.user?._id?.toString() || student.user?.toString();
      if (!userId) return;
      studentStats.set(userId, { present: 0, absent: 0, late: 0 });
    });

    const dayWiseMap = new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    records.forEach((record) => {
      const dateKey = formatDateKey(record.date);
      const dayBucket = dayWiseMap.get(dateKey) || {
        present: 0,
        absent: 0,
        late: 0,
      };
      (record.entries || []).forEach((entry) => {
        const userId = entry.student?.toString();
        if (!userId) return;
        const stats = studentStats.get(userId);
        if (entry.status === "present") {
          totalPresent += 1;
          dayBucket.present += 1;
          if (stats) stats.present += 1;
        }
        if (entry.status === "absent") {
          totalAbsent += 1;
          dayBucket.absent += 1;
          if (stats) stats.absent += 1;
        }
        if (entry.status === "late") {
          totalLate += 1;
          dayBucket.late += 1;
          if (stats) stats.late += 1;
        }
      });
      dayWiseMap.set(dateKey, dayBucket);
    });

    const dayWise = [...dayWiseMap.entries()]
      .map(([date, counts]) => {
        const total = counts.present + counts.absent + counts.late;
        const percentage = total
          ? Number(((counts.present / total) * 100).toFixed(2))
          : 0;
        return {
          date,
          present: counts.present,
          absent: counts.absent,
          late: counts.late,
          total,
          percentage,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const workingDays = dayWise.length;
    const overallTotal = totalPresent + totalAbsent + totalLate;
    const classPercentage = overallTotal
      ? Number(((totalPresent / overallTotal) * 100).toFixed(2))
      : 0;

    const studentWise = students.map((student) => {
      const userId = student.user?._id?.toString() || student.user?.toString();
      const stats = userId
        ? studentStats.get(userId) || { present: 0, absent: 0, late: 0 }
        : { present: 0, absent: 0, late: 0 };
      const total = stats.present + stats.absent + stats.late;
      const percentage = total
        ? Number(((stats.present / total) * 100).toFixed(2))
        : 0;
      return {
        id: student._id,
        name: student.user?.name || "",
        rollNo: student.rollNo || "",
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        total,
        percentage,
        isLowAttendance: percentage < 75,
      };
    });

    const assignmentDetails = await SubjectAssignment.findOne({
      teacherUser: teacherId,
      school: schoolId,
      class: classId,
      section,
    })
      .populate("class", "name")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        month: validMonth,
        year: validYear,
        className: resolveClassName(assignmentDetails?.class),
        section,
        workingDays,
        classPercentage,
        studentWise,
        dayWise,
      },
      message: "Attendance report fetched successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { schoolId } = getSchoolScope(req.user);
    const classId = req.query.class_id || req.query.classId;
    const section = normalizeSection(req.query.section);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start: monthStart, end: monthEnd } = getMonthRange(month, year);
    const todayRange = getDateRange(now);

    let assignments = [];
    if (classId) {
      if (!ensureValidClassId(classId)) {
        return res
          .status(400)
          .json({ success: false, data: null, message: "Invalid class id" });
      }
      const assignment = await verifyTeacherClass(
        teacherId,
        schoolId,
        classId,
        section,
      );
      if (!assignment) {
        return res
          .status(403)
          .json({
            success: false,
            data: null,
            message: "Access denied for the selected class/section",
          });
      }
      assignments = [assignment];
    } else {
      assignments = await SubjectAssignment.find({
        teacherUser: teacherId,
        school: schoolId,
      })
        .select("class section")
        .lean();
    }

    if (!assignments.length) {
      return res.status(200).json({
        success: true,
        data: {
          todayMarked: false,
          thisMonthAverage: 0,
          lowAttendanceStudents: 0,
          perfectAttendanceStudents: 0,
          totalStudents: 0,
          mostAbsentDay: "N/A",
          classWise: [],
        },
        message: "No class assignments found",
      });
    }

    const assignmentKeys = new Set();
    const assignmentFilters = [];
    const classIds = [];
    assignments.forEach((assignment) => {
      const classKey = assignment.class?.toString();
      if (!classKey) return;
      const sectionValue = normalizeSection(assignment.section);
      const key = `${classKey}_${sectionValue}`;
      if (!assignmentKeys.has(key)) {
        assignmentKeys.add(key);
        assignmentFilters.push({
          class: assignment.class,
          section: sectionValue,
        });
      }
      if (!classIds.includes(classKey)) classIds.push(classKey);
    });

    const attendanceRecords = await Attendance.find({
      school: schoolId,
      date: { $gte: monthStart, $lt: monthEnd },
      $or: assignmentFilters,
    }).lean();

    const todayRecords = todayRange
      ? await Attendance.find({
          school: schoolId,
          date: { $gte: todayRange.start, $lt: todayRange.end },
          $or: assignmentFilters,
        }).lean()
      : [];

    const todayMarked = todayRecords.length > 0;

    const totals = attendanceRecords.reduce(
      (acc, record) => {
        const current = summarizeEntries(record.entries || []);
        acc.present += current.present;
        acc.absent += current.absent;
        acc.late += current.late;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
    const totalEntries = totals.present + totals.absent + totals.late;
    const thisMonthAverage = totalEntries
      ? Number(((totals.present / totalEntries) * 100).toFixed(2))
      : 0;

    let students = await Student.find({
      school: schoolId,
      class: {
        $in: classIds
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      },
      status: "active",
    })
      .populate("user", "name")
      .populate("section", "name")
      .lean();

    students = students.filter((student) => {
      const studentClassId =
        student.class?._id?.toString() || student.class?.toString();
      if (!studentClassId) return false;
      return assignments.some((assignment) => {
        const assignClassId = assignment.class?.toString();
        if (assignClassId !== studentClassId) return false;
        return matchSection(student, normalizeSection(assignment.section));
      });
    });

    const studentStats = new Map();
    students.forEach((student) => {
      const userId = student.user?._id?.toString() || student.user?.toString();
      if (userId) studentStats.set(userId, { present: 0, absent: 0, late: 0 });
    });

    const absentByDay = new Map();
    attendanceRecords.forEach((record) => {
      const dayName = new Date(record.date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      const dayCount = absentByDay.get(dayName) || 0;
      let added = 0;
      (record.entries || []).forEach((entry) => {
        const userId = entry.student?.toString();
        if (!userId) return;
        const stats = studentStats.get(userId);
        if (entry.status === "present" && stats) stats.present += 1;
        if (entry.status === "absent") {
          added += 1;
          if (stats) stats.absent += 1;
        }
        if (entry.status === "late" && stats) stats.late += 1;
      });
      absentByDay.set(dayName, dayCount + added);
    });

    let lowAttendanceStudents = 0;
    let perfectAttendanceStudents = 0;
    studentStats.forEach((stats) => {
      const total = stats.present + stats.absent + stats.late;
      if (!total) return;
      const percentage = (stats.present / total) * 100;
      if (percentage < 75) lowAttendanceStudents += 1;
      if (percentage === 100) perfectAttendanceStudents += 1;
    });

    let mostAbsentDay = "N/A";
    let maxAbsences = -1;
    absentByDay.forEach((count, day) => {
      if (count > maxAbsences) {
        maxAbsences = count;
        mostAbsentDay = day;
      }
    });

    let classWise = [];
    if (!classId) {
      const classWiseMap = new Map();
      const classRecordsMap = new Map();
      attendanceRecords.forEach((record) => {
        const key = `${record.class?.toString()}_${record.section || ""}`;
        const current = classRecordsMap.get(key) || [];
        current.push(record);
        classRecordsMap.set(key, current);
      });

      assignments.forEach((assignment) => {
        const classKey = assignment.class?.toString();
        if (!classKey) return;
        const sectionValue = normalizeSection(assignment.section);
        const key = `${classKey}_${sectionValue}`;
        if (classWiseMap.has(key)) return;
        const classRecords = classRecordsMap.get(key) || [];
        const counts = classRecords.reduce(
          (acc, record) => {
            const current = summarizeEntries(record.entries || []);
            acc.present += current.present;
            acc.absent += current.absent;
            acc.late += current.late;
            return acc;
          },
          { present: 0, absent: 0, late: 0 },
        );
        const total = counts.present + counts.absent + counts.late;
        const monthlyAverage = total
          ? Number(((counts.present / total) * 100).toFixed(2))
          : 0;

        const classTodayMarked = todayRecords.some(
          (record) =>
            record.class?.toString() === classKey &&
            normalizeSection(record.section) === sectionValue,
        );

        classWiseMap.set(key, {
          className: classKey,
          section: sectionValue,
          todayMarked: classTodayMarked,
          monthlyAverage,
        });
      });

      const assignmentDetails = await SubjectAssignment.find({
        teacherUser: teacherId,
        school: schoolId,
        class: {
          $in: classIds
            .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        },
      })
        .populate("class", "name")
        .lean();

      classWise = [...classWiseMap.entries()].map(([key, item]) => {
        const [classKey] = key.split("_");
        const detail = assignmentDetails.find(
          (assignment) => assignment.class?._id?.toString() === classKey,
        );
        return {
          ...item,
          className: resolveClassName(detail?.class) || item.className,
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        todayMarked,
        thisMonthAverage,
        lowAttendanceStudents,
        perfectAttendanceStudents,
        totalStudents: students.length,
        mostAbsentDay,
        classWise,
      },
      message: "Attendance stats fetched successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};
