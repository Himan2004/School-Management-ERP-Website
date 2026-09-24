import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";
import mongoose from "mongoose";

/**
 * @desc    Get admit cards for a specific class, section, and exam schedule
 * @route   GET /api/principal/admit-cards
 * @access  Private (Principal/Admin)
 */
export const getBulkAdmitCards = async (req, res) => {
  try {
    const { classId, sectionId, scheduleId } = req.query;
    const schoolId = req.user.school._id || req.user.school;

    if (!classId || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: "Class ID and Schedule ID are required.",
      });
    }

    // 1. Fetch Exam Schedule
    const schedule = await ExamSchedule.findOne({
      _id: scheduleId,
      school: schoolId,
    })
      .populate("examStructure", "examName examType term academicYear")
      .populate("slots.subject", "subjectName subjectCode");

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Exam schedule not found.",
      });
    }

    // 2. Build Student Query Safely
    const studentQuery = { class: classId, school: schoolId, status: "active" };
    let isStringSection = false;

    if (sectionId) {
      // Check if sectionId is a valid 24-char hex ObjectId
      if (
        mongoose.Types.ObjectId.isValid(sectionId) &&
        String(new mongoose.Types.ObjectId(sectionId)) === sectionId
      ) {
        studentQuery.section = sectionId; // Let MongoDB filter it
      } else {
        isStringSection = true; // It's a string like "A", filter it after fetching
      }
    }

    // 3. Fetch Students
    let students = await Student.find(studentQuery)
      .populate("user", "name email loginId")
      .populate("class", "name className")
      .populate("section", "name")
      .populate("parent");

    // 4. In-memory fallback filter if sectionId was just a name (e.g., "A")
    if (isStringSection) {
      students = students.filter(
        (student) =>
          student.section?.name === sectionId || student.section === sectionId,
      );
    }

    // 5. Generate Admit Card Payload
    const admitCards = students.map((student) => {
      const studentName = student.user?.name || "Student Name";
      const rollNumber = student.rollNo;
      const enrollmentNo = student.enrollmentNo || "N/A";
      const sectionName =
        student.section?.name ||
        (typeof student.section === "string" ? student.section : "A");

      // Generate a unique code using Schedule ID and Academic Year
      const examCode = `EC-${schedule.academicYear}-${schedule._id.toString().slice(-6).toUpperCase()}`;

      return {
        studentId: student._id,
        studentName,
        rollNumber,
        enrollmentNo,
        className: student.class?.name || student.class?.className,
        section: sectionName,
        examName:
          schedule.name ||
          schedule.examStructure?.examName ||
          "Term Examination",
        examCode,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`CONFIRMED|${rollNumber}|${examCode}|${studentName}`)}`,
        status: schedule.admitCardGenerated ? "Generated" : "Pending",
      };
    });

    return res.status(200).json({
      success: true,
      count: admitCards.length,
      data: admitCards,
    });
  } catch (error) {
    console.error("Error in getBulkAdmitCards:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admit cards.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get detailed Admit Card for a specific student
 * @route   GET /api/principal/admit-card/:studentId
 * @access  Private (Principal/Admin)
 */
export const getSpecificStudentAdmitCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.school._id || req.user.school;

    // 1. Fetch Student Profile
    const student = await Student.findOne({ _id: studentId, school: schoolId })
      .populate("user", "name email loginId")
      .populate("class", "name className")
      .populate("section", "name")
      .populate("parent");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found." });
    }

    // 2. Fetch School Details
    const school = await School.findById(schoolId).populate("organization");

    // 3. Match ExamSchedule (Student section is ObjectId ref, Schedule section is String)
    const sectionNameString = student.section?.name || "";

    const schedule = await ExamSchedule.findOne({
      school: schoolId,
      class: student.class?._id,
      $or: [{ section: null }, { section: "" }, { section: sectionNameString }],
      status: { $in: ["published", "ongoing"] },
    })
      .populate("examStructure", "examName examType term")
      .populate("slots.subject", "subjectName subjectCode")
      .sort({ createdAt: -1 });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message:
          "No active exam schedule found for this student's class/section.",
      });
    }

    // 4. Map Slots/Subjects using examSlotSchema fields
    const subjects = schedule.slots.map((slot, index) => ({
      id: slot._id || index + 1,
      name: slot.subject?.subjectName || "General Subject",
      code: slot.subject?.subjectCode || `SUB-${index + 1}`,
      date: slot.examDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
      maxMarks: slot.maxMarks,
      venue: slot.venue || "Main Hall",
    }));

    const examCode = `EC-${schedule.academicYear}-${schedule._id.toString().slice(-6).toUpperCase()}`;

    // 5. Construct highly detailed Payload
    const admitCardData = {
      id: schedule._id,
      examName: schedule.name || schedule.examStructure?.examName,
      academicYear: schedule.academicYear,
      examCode,
      student: {
        id: student._id,
        name: student.user?.name,
        rollNumber: student.rollNo,
        enrollmentNo: student.enrollmentNo,
        class: student.class?.name || student.class?.className,
        section: student.section?.name,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        fatherName: student.parent?.fatherName,
        motherName: student.parent?.motherName,
        photo: student.photo,
      },
      school: {
        name: school.schoolName,
        email: school.officialEmail,
        phone: school.officialPhone,
        address: school.address,
        board: school.board,
        principal: school.principalName,
      },
      subjects,
      status: schedule.status,
      issuedDate: schedule.publishedAt || schedule.createdAt,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`CONFIRMED|${student.rollNo}|${examCode}|${student.user?.name}`)}`,
    };

    return res.status(200).json({ success: true, data: admitCardData });
  } catch (error) {
    console.error("Error in getSpecificStudentAdmitCard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student admit card.",
      error: error.message,
    });
  }
};

/**
 * @desc    Verify Admit Card via QR/Code scan (Principal/Invigilator)
 * @route   POST /api/principal/admit-card/verify
 * @access  Private (Principal/Admin)
 */
export const verifyAdmitCardAdmin = async (req, res) => {
  try {
    const { admitCardCode, rollNumber } = req.body;
    const schoolId = req.user.school._id || req.user.school;

    if (!admitCardCode || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: "Admit card code and Roll Number are required.",
      });
    }

    // Validate Student Identity strictly matching rollNo and school
    const student = await Student.findOne({
      rollNo: rollNumber,
      school: schoolId,
    })
      .populate("user", "name loginId photo")
      .populate("class", "name")
      .populate("section", "name");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or does not belong to this school.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admit card verified successfully.",
      data: {
        verified: true,
        studentId: student._id,
        studentName: student.user?.name,
        rollNumber: student.rollNo,
        enrollmentNo: student.enrollmentNo,
        class: student.class?.name,
        section: student.section?.name,
        photo: student.photo || student.user?.photo,
        status: student.status,
        examCode: admitCardCode,
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
      },
    });
  } catch (error) {
    console.error("Error in verifyAdmitCardAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify admit card.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get admit card KPI statistics
 * @route   GET /api/principal/admit-cards/stats
 * @access  Private (Principal)
 */
export const getAdmitCardStats = async (req, res) => {
  try {
    const { classId, sectionId, scheduleId } = req.query;
    const schoolId = req.user.school._id || req.user.school;

    // Build student query
    const studentQuery = { school: schoolId, status: "active" };
    if (classId) studentQuery.class = classId;

    let isStringSection = false;
    if (sectionId) {
      if (
        mongoose.Types.ObjectId.isValid(sectionId) &&
        String(new mongoose.Types.ObjectId(sectionId)) === sectionId
      ) {
        studentQuery.section = sectionId;
      } else {
        isStringSection = true;
      }
    }

    let students = await Student.find(studentQuery).populate("section");

    if (isStringSection) {
      students = students.filter(
        (student) =>
          student.section?.name === sectionId || student.section === sectionId,
      );
    }

    const totalStudents = students.length;

    let generatedCards = 0;
    let pendingCards = 0;

    if (scheduleId) {
      const schedule = await ExamSchedule.findOne({ _id: scheduleId, school: schoolId });
      if (schedule && (schedule.admitCardGenerated || schedule.status === "published" || schedule.status === "ongoing")) {
        generatedCards = totalStudents;
        pendingCards = 0;
      } else {
        generatedCards = 0;
        pendingCards = totalStudents;
      }
    } else {
      // Overall school stats
      const activeSchedules = await ExamSchedule.find({
        school: schoolId,
        $or: [{ admitCardGenerated: true }, { status: { $in: ["published", "ongoing"] } }]
      });
      
      const activeScheduleClassIds = activeSchedules.map(s => String(s.class));
      
      students.forEach(student => {
        if (activeScheduleClassIds.includes(String(student.class))) {
          generatedCards++;
        } else {
          pendingCards++;
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        generatedCards,
        pendingCards
      }
    });
  } catch (error) {
    console.error("Error in getAdmitCardStats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admit card stats.",
      error: error.message
    });
  }
};
