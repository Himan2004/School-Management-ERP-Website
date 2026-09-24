import mongoose from "mongoose";
import Lecture from "../../models/modules/Lecture.js";
import ClassModel from "../../models/organization/organizationClass.js";
import Period from "../../models/modules/Period.js";
import Subject from "../../models/modules/Subject.js";
import Teacher from "../../models/users/teacher.model.js";
import User from "../../models/users/user.model.js";
import School from "../../models/school/School.js";

// Scope helper matching academicsController
const getScope = async (req) => {
  const schoolId = req.user?.school?._id || req.user?.school;
  if (!schoolId) {
    throw new Error("No school ID associated with this user.");
  }
  const school = await School.findById(schoolId).lean();
  return {
    schoolId,
    organizationId: school?.organization || req.user?.school?.organization || req.user?.organization,
  };
};

// Helper: Convert "HH:MM" to minutes for overlap checks
const timeToMins = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Conflict Checking logic
const findScheduleConflict = async ({ schoolId, teacher, room, date, startTime, endTime, classId, section, excludeId }) => {
  const ss = timeToMins(startTime);
  const se = timeToMins(endTime);
  if (ss >= se) {
    return "End time must be strictly after start time.";
  }

  // Find all active/scheduled lectures on that school, date, and time slot
  const potentialConflicts = await Lecture.find({
    school: schoolId,
    date,
    status: { $ne: "Cancelled" },
    _id: excludeId ? { $ne: excludeId } : { $exists: true }
  }).lean();

  for (const lec of potentialConflicts) {
    const ls = timeToMins(lec.startTime);
    const le = timeToMins(lec.endTime);
    
    // Check if times overlap
    const overlaps = ss < le && se > ls;
    if (!overlaps) continue;

    // 1. Teacher occupied conflict
    if (String(lec.teacher) === String(teacher)) {
      const teacherUser = await User.findById(teacher).select("name").lean();
      return `Teacher ${teacherUser?.name || "assigned"} already has a lecture scheduled during this time slot.`;
    }

    // 2. Room occupied conflict
    if (lec.room.toLowerCase() === room.toLowerCase()) {
      return `Room ${room} is already occupied by another lecture during this time slot.`;
    }

    // 3. Class + Section conflict
    if (String(lec.class) === String(classId) && lec.section.toLowerCase() === section.toLowerCase()) {
      return `Class and Section are already occupied by another lecture during this time slot.`;
    }
  }
  return null;
};

// 1. Get Lectures List
export const getLectures = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { search, classId, section, subjectId, teacherId, room, date, status, sortBy, sortDir, page, pageSize } = req.query;

    const query = { school: schoolId };

    if (classId) query.class = classId;
    if (section) query.section = section;
    if (subjectId) query.subject = subjectId;
    if (teacherId) query.teacher = teacherId;
    if (room) query.room = room;
    if (date) query.date = date;
    if (status) query.status = status;

    // Search filter: search in lectureTitle, status, room
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { lectureTitle: searchRegex },
        { room: searchRegex },
        { status: searchRegex }
      ];
    }

    // Pagination
    const pg = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 10;
    const skip = (pg - 1) * limit;

    // Sorting
    const sortField = sortBy || "createdAt";
    const sortDirection = sortDir === "desc" ? -1 : 1;

    const [lectures, totalCount] = await Promise.all([
      Lecture.find(query)
        .populate("class", "name")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email")
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lecture.countDocuments(query)
    ]);

    const formattedLectures = lectures.map(l => ({
      id: l._id,
      lectureId: `LEC-${String(l._id).slice(-4).toUpperCase()}`,
      lectureTitle: l.lectureTitle || "",
      subject: l.subject?.subjectName || "Unnamed Subject",
      subjectId: l.subject?._id || "",
      teacher: l.teacher?.name || "Not Assigned",
      teacherId: l.teacher?._id || "",
      class: l.class?.name || "Unknown Class",
      classId: l.class?._id || "",
      section: l.section || "A",
      room: l.room || "N/A",
      day: new Date(l.date).toLocaleDateString("en-US", { weekday: "long" }) || "Monday",
      date: l.date,
      startTime: l.startTime,
      endTime: l.endTime,
      type: l.type || "Theory",
      status: l.status || "Scheduled",
      description: l.description || "",
      createdBy: l.createdBy || null,
      createdAt: l.createdAt
    }));

    res.status(200).json({
      success: true,
      data: formattedLectures,
      totalCount,
      page: pg,
      pageSize: limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Lecture by ID
export const getLectureById = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;

    const lecture = await Lecture.findOne({ _id: id, school: schoolId })
      .populate("class", "name")
      .populate("subject", "subjectName subjectCode")
      .populate("teacher", "name email")
      .lean();

    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    res.status(200).json({ success: true, data: lecture });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Create Lecture
export const createLecture = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const {
      academicYear,
      class: classId,
      section,
      subject: subjectId,
      teacher: teacherUserId,
      room,
      lectureTitle,
      type,
      date,
      startTime,
      endTime,
      status,
      description,
    } = req.body;

    if (!classId || !section || !subjectId || !teacherUserId || !room || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "All required fields must be supplied." });
    }

    // Check conflicts
    const conflict = await findScheduleConflict({
      schoolId,
      teacher: teacherUserId,
      room,
      date,
      startTime,
      endTime,
      classId,
      section,
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    const newLecture = await Lecture.create({
      organization: organizationId,
      school: schoolId,
      academicYear: academicYear || "2026-27",
      class: classId,
      section,
      subject: subjectId,
      teacher: teacherUserId,
      room,
      lectureTitle: lectureTitle || "",
      type: type || "Theory",
      date,
      startTime,
      endTime,
      status: status || "Scheduled",
      description: description || "",
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: newLecture, message: "Lecture scheduled successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Lecture
export const updateLecture = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const {
      class: classId,
      section,
      subject: subjectId,
      teacher: teacherUserId,
      room,
      lectureTitle,
      type,
      date,
      startTime,
      endTime,
      status,
      description,
    } = req.body;

    const lecture = await Lecture.findOne({ _id: id, school: schoolId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    // If active check conflict
    const conflict = await findScheduleConflict({
      schoolId,
      teacher: teacherUserId || lecture.teacher,
      room: room || lecture.room,
      date: date || lecture.date,
      startTime: startTime || lecture.startTime,
      endTime: endTime || lecture.endTime,
      classId: classId || lecture.class,
      section: section || lecture.section,
      excludeId: id,
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    const updated = await Lecture.findByIdAndUpdate(
      id,
      {
        $set: {
          class: classId,
          section,
          subject: subjectId,
          teacher: teacherUserId,
          room,
          lectureTitle,
          type,
          date,
          startTime,
          endTime,
          status,
          description,
          updatedBy: req.user._id,
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updated, message: "Lecture updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Lecture (Hard Delete)
export const deleteLecture = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;

    const deleted = await Lecture.findOneAndDelete({ _id: id, school: schoolId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    res.status(200).json({ success: true, message: "Lecture deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Lecture Dashboard Stats
export const getLectureDashboard = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const todayStr = new Date().toISOString().split("T")[0];

    const [totalLectures, todayLectures, activeLectures] = await Promise.all([
      Lecture.countDocuments({ school: schoolId }),
      Lecture.countDocuments({ school: schoolId, date: todayStr }),
      Lecture.find({ school: schoolId, date: todayStr, status: "Scheduled" }).lean()
    ]);

    const uniqueTeachers = [...new Set(activeLectures.map(l => String(l.teacher)))].length;
    const uniqueRooms = [...new Set(activeLectures.map(l => l.room.toLowerCase()))].length;

    res.status(200).json({
      success: true,
      data: {
        total: totalLectures,
        today: todayLectures,
        teachersOccupied: uniqueTeachers,
        roomsOccupied: uniqueRooms
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Get Filter Metadata (Dynamic Dropdowns)
export const getLectureFilterData = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const school = await School.findById(schoolId).lean();
    if (!school) return res.status(404).json({ success: false, message: "School not found" });

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

    // Fetch unique active classes, sections, subjects, teachers, rooms belonging to school
    const [classesRaw, periods, subjects, teachers] = await Promise.all([
      ClassModel.find({ organization: school.organization, isActive: true }).select("name").lean(),
      Period.find({ schoolId, status: "active" }).select("gradeLevel section roomNumber").lean(),
      Subject.find({ schoolId, status: { $in: ["Active", "active"] } }).select("subjectName subjectCode").lean(),
      Teacher.find({ school: schoolId }).populate("user", "name").lean()
    ]);

    // Format classes filtered by school offered grades
    const filteredClasses = classesRaw.filter((cls) => isClassAllowed(cls.name));
    const classesList = filteredClasses.map(c => ({ id: c._id, name: c.name }));

    // Extract unique rooms from Period roomNumbers + mock defaults
    const roomNumbers = periods
      .map(p => p.roomNumber)
      .filter(r => r && r.trim() !== "");
    const uniqueRooms = [...new Set(roomNumbers)];
    if (uniqueRooms.length === 0) {
      uniqueRooms.push("Room 101", "Room 102", "Room 103", "Lab A", "Lab B", "Gym", "Library");
    }

    // Format teachers
    const teachersList = teachers
      .filter(t => t.user)
      .map(t => ({ id: t.user._id, name: t.user.name, staffId: t.staffId }));

    res.status(200).json({
      success: true,
      data: {
        classes: classesList,
        rooms: uniqueRooms,
        subjects: subjects.map(s => ({ id: s._id, name: s.subjectName, code: s.subjectCode })),
        teachers: teachersList
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
