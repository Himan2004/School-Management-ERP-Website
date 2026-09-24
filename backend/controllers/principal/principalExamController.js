import organizationSubjects from "../../models/organization/organizationSubjects.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import ExamStructure from "../../models/academic/examStructure.model.js";
import School from "../../models/school/School.js";
import Student from "../../models/users/student.model.js";
import Subject from "../../models/modules/Subject.js";
import ClassModel from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import AcademicConfig from "../../models/organization/AcademicConfig.js";
import mongoose from "mongoose";

// --- HELPER: Bulletproof Scope Fetcher ---
const getScope = async (req) => {
  // 1. Check req.user
  let schoolId = req.user?.school?._id || req.user?.school;

  // 2. Check Custom Headers
  if (!schoolId && req.headers["x-school-id"]) {
    schoolId = req.headers["x-school-id"];
  }

  // 3. Check Query Params
  if (!schoolId && req.query?.school_id) {
    schoolId = req.query.school_id;
  }

  if (!schoolId) {
    throw new Error(
      "School ID not found in request. Please clear cache and login again.",
    );
  }

  let organizationId = req.user?.school?.organization;
  if (!organizationId) {
    const schoolDoc = await School.findById(schoolId).lean();
    organizationId = schoolDoc?.organization;
  }

  return { schoolId, organizationId };
};

// --- HELPER: Grading Scale ---
const GRADE_SCALE = [
  { range: [90, 100], grade: "A+" },
  { range: [80, 89.99], grade: "A" },
  { range: [70, 79.99], grade: "B+" },
  { range: [60, 69.99], grade: "B" },
  { range: [50, 59.99], grade: "C" },
  { range: [40, 49.99], grade: "D" },
  { range: [0, 39.99], grade: "F" },
];

const getGradeFromPct = (pct) => {
  if (pct == null || isNaN(pct)) return "—";
  return (
    GRADE_SCALE.find((e) => pct >= e.range[0] && pct <= e.range[1]) ?? {
      grade: "F",
    }
  ).grade;
};

/**
 * @desc    Get students for Marks Entry
 * @route   GET /api/principal/exams/students
 */
export const getStudentsForMarksEntry = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { classId, section } = req.query;

    const StudentModel = mongoose.model("Student");

    let query = { school: schoolId };
    if (classId) {
      query.$or = [{ class: classId }, { currentClass: classId }];
    }

    let students = await StudentModel.find(query)
      .populate("user", "name")
      .populate("section", "name")
      .lean();

    if (section) {
      students = students.filter((s) => {
        const sectionValue =
          s.section?.name ||
          s.section?.sectionName ||
          s.sectionName ||
          s.section;
        return String(sectionValue).trim() === String(section).trim();
      });
    }

    const formattedStudents = students.map((s) => ({
      _id: s.user?._id || s._id,
      name: s.user?.name || s.name || "Unknown",
      rollNo: s.rollNo || s.rollNumber || "N/A",
    }));

    res.status(200).json({ success: true, data: formattedStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Save Marks to Database
 * @route   POST /api/principal/exams/marks
 */
export const saveExamMarks = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { examScheduleId, classId, section, subjectId, marks } = req.body;

    let updatedCount = 0;

    for (const markEntry of marks) {
      const { studentId, theoryMarks, practicalMarks } = markEntry;

      let marksheet = await Marksheet.findOne({
        school: schoolId,
        examSchedule: examScheduleId,
        student: studentId,
      });

      if (!marksheet) {
        marksheet = new Marksheet({
          organization: organizationId,
          school: schoolId,
          student: studentId,
          class: classId,
          section: section,
          examSchedule: examScheduleId,
          subjectMarks: [],
          status: "draft",
        });
      }

      const subjectIndex = marksheet.subjectMarks.findIndex(
        (sm) => String(sm.subject) === String(subjectId),
      );
      const total = (Number(theoryMarks) || 0) + (Number(practicalMarks) || 0);

      if (subjectIndex !== -1) {
        marksheet.subjectMarks[subjectIndex].theoryMarks = theoryMarks;
        marksheet.subjectMarks[subjectIndex].practicalMarks = practicalMarks;
        marksheet.subjectMarks[subjectIndex].totalMarks = total;
      } else {
        marksheet.subjectMarks.push({
          subject: subjectId,
          theoryMarks,
          practicalMarks,
          totalMarks: total,
        });
      }

      marksheet.totalMarksObtained = marksheet.subjectMarks.reduce(
        (sum, sm) => sum + (sm.totalMarks || 0),
        0,
      );
      await marksheet.save();
      updatedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Marks saved for ${updatedCount} students.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all exam schedules for the school
 * @route   GET /api/principal/exams/schedules
 */
export const getExamSchedules = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { academicYear } = req.query;

    let query = { school: schoolId };
    if (academicYear) query.academicYear = academicYear;

    const schedules = await ExamSchedule.find(query)
      .populate("class", "name className")
      .populate("examStructure", "examName examType")
      .populate("slots.subject", "subjectName name subjectCode")
      .sort({ createdAt: -1 })
      .lean();

    const subjectIds = [];
    schedules.forEach((s) => {
      s.slots?.forEach((slot) => {
        if (slot.subject) {
          const id = slot.subject._id || slot.subject;
          subjectIds.push(String(id));
        }
      });
    });

    const uniqueSubIds = [...new Set(subjectIds)];

    const [localSubjects, orgSubjects] = await Promise.all([
      mongoose
        .model("Subject")
        .find({ _id: { $in: uniqueSubIds } })
        .select("subjectName subjectCode name code")
        .lean(),
      mongoose
        .model("organizationSubjects")
        .find({ _id: { $in: uniqueSubIds } })
        .select("subjectName subjectCode name code")
        .lean(),
    ]);

    const subjectMap = new Map();
    localSubjects.forEach((s) => subjectMap.set(String(s._id), s));
    orgSubjects.forEach((s) => subjectMap.set(String(s._id), s));

    const populatedSchedules = schedules.map((schedule) => {
      const mappedSlots = (schedule.slots || []).map((slot) => {
        const subId = String(slot.subject?._id || slot.subject);
        const foundSub = subjectMap.get(subId);

        let finalName = "Unknown Subject";
        let finalCode = "";

        if (foundSub) {
          finalName =
            foundSub.subjectName || foundSub.name || "Unknown Subject";
          finalCode = foundSub.subjectCode || foundSub.code || "";
        } else if (slot.subject?.subjectName || slot.subject?.name) {
          finalName = slot.subject.subjectName || slot.subject.name;
          finalCode = slot.subject.subjectCode || slot.subject.code || "";
        } else {
          finalName = `Subject (${subId.slice(-4)})`;
        }

        return {
          ...slot,
          subject: {
            _id: subId,
            subjectName: finalName,
            subjectCode: finalCode,
          },
        };
      });
      return { ...schedule, slots: mappedSlots };
    });

    res.status(200).json({ success: true, data: populatedSchedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all classes with their actual sections
 * @route   GET /api/principal/exams/classes-with-sections
 */
export const getClassesWithSectionsForExams = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);

    const school = await School.findById(schoolId).lean();
    if (!school)
      return res
        .status(404)
        .json({ success: false, message: "School not found" });

    const classes = await ClassModel.find({
      organization: organizationId,
      isActive: true,
    })
      .sort({ numericLevel: 1 })
      .lean();

    const sections = await Section.find({
      school: schoolId,
      status: "active",
    }).lean();

    const Period = mongoose.model("Period");
    let periods = [];
    try {
      periods = await Period.find({
        schoolId: schoolId,
        status: "active",
      }).lean();
    } catch (e) {
      console.log("No periods found, bypassing.");
    }

    const mappedClasses = classes.map((cls) => {
      const secFromSections = sections
        .filter((sec) => String(sec.classId) === String(cls._id))
        .map((s) => s.name);
      const secFromPeriods = periods
        .filter(
          (p) =>
            String(p.gradeLevel) === String(cls.name) ||
            String(p.gradeLevel) === String(cls.numericLevel),
        )
        .map((p) => p.section);

      const allSections = [...new Set([...secFromSections, ...secFromPeriods])]
        .filter(Boolean)
        .sort();

      return {
        ...cls,
        sections: allSections,
      };
    });

    res.status(200).json({ success: true, data: mappedClasses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new exam schedule
 * @route   POST /api/principal/exams/create-schedule
 */
export const createExamSchedule = async (req, res) => {
  try {
    const {
      examStructure,
      academicYear,
      class: classId,
      section,
      slots,
    } = req.body;
    const { schoolId, organizationId } = await getScope(req);

    const newSchedule = await ExamSchedule.create({
      organization: organizationId,
      school: schoolId,
      examStructure,
      academicYear,
      class: classId,
      section,
      slots,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Exam schedule created successfully",
      data: newSchedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update an exam schedule
 * @route   PUT /api/principal/exams/schedule/:id
 */
export const updateExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSchedule = await ExamSchedule.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedSchedule)
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    res.status(200).json({ success: true, data: updatedSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete an exam schedule
 * @route   DELETE /api/principal/exams/schedule/:id
 */
export const deleteExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ExamSchedule.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    res
      .status(200)
      .json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new exam structure
 * @route   POST /api/principal/exams/structures
 */
export const createExamStructure = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const {
      examName,
      academicSession,
      examType,
      applicableClasses,
      subjectMarkings,
    } = req.body;

    if (!examName || !examType)
      return res
        .status(400)
        .json({
          success: false,
          message: "examName and examType are required",
        });
    if (!academicSession)
      return res
        .status(400)
        .json({
          success: false,
          message: "academicSession (academic year) is required",
        });
    if (!subjectMarkings || subjectMarkings.length === 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one subject marking is required",
        });

    let gradingConfig = await AcademicConfig.findOne({
      organization: organizationId,
    });
    if (!gradingConfig) {
      gradingConfig = await AcademicConfig.create({
        organization: organizationId,
        createdBy: req.user._id,
      });
    }

    const safeSubjectMarkings = subjectMarkings
      .filter((sm) => sm.subject && mongoose.Types.ObjectId.isValid(sm.subject))
      .map((sm) => ({
        subject: sm.subject,
        totalMaxMarks: Number(sm.totalMaxMarks) || 100,
        passingMarks: Number(sm.passMarks ?? sm.passingMarks) || 33,
        theoryMaxMarks: Number(sm.theoryMaxMarks) || 0,
        practicalMaxMarks: Number(sm.practicalMaxMarks) || 0,
        internalMaxMarks: Number(sm.internalMaxMarks) || 0,
        isOptional: !!sm.isOptional,
      }));

    if (safeSubjectMarkings.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No valid subject markings provided",
        });
    }

    const newStructure = await ExamStructure.create({
      organization: organizationId,
      school: schoolId || null,
      academicYear: academicSession,
      examName,
      examType,
      applicableClasses: applicableClasses || [],
      subjectMarkings: safeSubjectMarkings,
      gradingConfigRef: gradingConfig._id,
      isActive: true,
      createdBy: req.user._id,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Exam structure created successfully",
        data: newStructure,
      });
  } catch (error) {
    console.error("createExamStructure error:", error);
    let detail = error.message;
    if (error.code === 11000)
      detail =
        "An exam structure with this name already exists for this academic year.";
    res.status(500).json({ success: false, message: detail });
  }
};

/**
 * @desc    Get subjects mapped to a specific class
 * @route   GET /api/principal/exams/class-subjects/:classId
 */
export const getClassSubjectsForExams = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { classId } = req.params;

    const subjects = await Subject.find({
      schoolId: schoolId,
      status: { $in: ["active", "Active"] },
      $or: [
        { assignedClasses: classId },
        { classId: classId },
        { assignedClasses: { $exists: true, $size: 0 } },
      ],
    })
      .select(
        "subjectName subjectCode type theoryMarks practicalMarks passMarks",
      )
      .lean();

    if (subjects.length === 0) {
      const allSchoolSubjects = await Subject.find({
        schoolId: schoolId,
        status: { $in: ["active", "Active"] },
      })
        .select(
          "subjectName subjectCode type theoryMarks practicalMarks passMarks",
        )
        .lean();
      return res.status(200).json({ success: true, data: allSchoolSubjects });
    }

    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get marksheets pending verification
 * @route   GET /api/principal/exams/pending-verification
 */
export const getPendingVerifications = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const pending = await Marksheet.find({
      school: schoolId,
      status: "submitted",
    })
      .populate("student", "name rollNumber")
      .populate("class", "name")
      .populate("examSchedule", "examStructure")
      .populate({
        path: "examSchedule",
        populate: { path: "examStructure", select: "examName" },
      })
      .sort({ submittedAt: 1 });

    res
      .status(200)
      .json({ success: true, count: pending.length, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get full marksheet details for verification
 * @route   GET /api/principal/exams/verify/:marksheetId
 */
export const getMarksheetForVerification = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    const marksheet = await Marksheet.findById(marksheetId)
      .populate("student", "name rollNumber")
      .populate({
        path: "examSchedule",
        populate: {
          path: "examStructure",
          populate: { path: "subjectMarkings.subject", select: "subjectName" },
        },
      });

    if (!marksheet)
      return res
        .status(404)
        .json({ success: false, message: "Marksheet not found" });
    res.status(200).json({ success: true, data: marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Verify and approve a marksheet
 * @route   PUT /api/principal/exams/verify/:marksheetId
 */
export const verifyMarksheet = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    const marksheet = await Marksheet.findByIdAndUpdate(
      marksheetId,
      { status: "verified", verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true },
    );

    if (!marksheet)
      return res
        .status(404)
        .json({ success: false, message: "Marksheet not found" });
    res
      .status(200)
      .json({
        success: true,
        message: "Marksheet verified successfully",
        data: marksheet,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam dashboard statistics for Principal
 * @route   GET /api/principal/exams/stats
 */
export const getPrincipalExamStats = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const [totalSchedules, pendingVerifications, publishedResults] =
      await Promise.all([
        ExamSchedule.countDocuments({ school: schoolId }),
        Marksheet.countDocuments({ school: schoolId, status: "submitted" }),
        Marksheet.countDocuments({ school: schoolId, status: "published" }),
      ]);

    res
      .status(200)
      .json({
        success: true,
        data: { totalSchedules, pendingVerifications, publishedResults },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get available exam structures for the school
 * @route   GET /api/principal/exams/structures
 */
export const getAvailableExamStructures = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const structures = await ExamStructure.find({
      $or: [{ organization: organizationId }, { school: schoolId }],
    })
      .sort({ examName: 1 })
      .lean();

    res.status(200).json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Bulk verify marksheets
 * @route   PUT /api/principal/exams/bulk-verify
 */
export const bulkVerifyMarksheets = async (req, res) => {
  try {
    const { marksheetIds } = req.body;
    const updateResult = await Marksheet.updateMany(
      { _id: { $in: marksheetIds }, status: "submitted" },
      { status: "verified", verifiedBy: req.user._id, verifiedAt: new Date() },
    );

    res
      .status(200)
      .json({
        success: true,
        message: `${updateResult.modifiedCount} marksheets verified successfully`,
        data: updateResult,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Publish results for an entire exam/class
 * @route   PUT /api/principal/exams/publish
 */
export const publishResults = async (req, res) => {
  try {
    const { scheduleId, section } = req.body;
    const updateResult = await Marksheet.updateMany(
      {
        examSchedule: scheduleId,
        ...(section ? { section } : {}),
        status: "verified",
      },
      { status: "published", publishedAt: new Date() },
    );

    res
      .status(200)
      .json({
        success: true,
        message: `${updateResult.modifiedCount} results published successfully`,
        data: updateResult,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get marksheet records with filters
 * @route   GET /api/principal/exams/marksheets
 */
export const getPrincipalMarksheets = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { examScheduleId, classId, section } = req.query;

    const query = { school: schoolId };
    if (examScheduleId) query.examSchedule = examScheduleId;
    if (classId) query.class = classId;
    if (section) query.section = section;

    const marksheets = await Marksheet.find(query)
      .populate("student", "name rollNumber")
      .populate("class", "name")
      .populate({
        path: "examSchedule",
        populate: { path: "examStructure", select: "examName examType" },
      });

    const mappedData = await Promise.all(
      marksheets.map(async (m) => {
        const pct = m.percentage || 0;
        let roll = m.rollNumber;
        if (!roll && m.student) {
          const studentProfile = await Student.findOne({
            user: m.student._id,
          }).lean();
          roll = studentProfile?.rollNo;
        }
        return {
          _id: m._id,
          student: {
            _id: m.student?._id,
            name: m.student?.name || "Student Name",
            rollNumber: roll || "N/A",
          },
          class: {
            _id: m.class?._id,
            name: m.class?.name || "N/A",
          },
          section: m.section || "A",
          examSchedule: {
            _id: m.examSchedule?._id,
            name:
              m.examSchedule?.name ||
              m.examSchedule?.examStructure?.examName ||
              "Term Exam",
          },
          totalMarksObtained: m.totalMarksObtained || 0,
          totalMaxMarks: m.totalMaxMarks || 100,
          percentage: pct,
          overallGrade: m.overallGrade || getGradeFromPct(pct),
          status: m.status
            ? m.status.charAt(0).toUpperCase() + m.status.slice(1)
            : "Draft",
        };
      }),
    );

    res.status(200).json({ success: true, data: mappedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get marksheet KPI statistics
 * @route   GET /api/principal/exams/marksheets/stats
 */
export const getPrincipalMarksheetStats = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { examScheduleId, classId, section } = req.query;

    const query = { school: schoolId };
    if (examScheduleId) query.examSchedule = examScheduleId;
    if (classId) query.class = classId;
    if (section) query.section = section;

    const marksheets = await Marksheet.find(query);

    const total = marksheets.length;
    const published = marksheets.filter(
      (m) => m.status === "published" || m.status === "Published",
    ).length;
    const pending = total - published;

    let avgGrade = "—";
    if (total > 0) {
      const avgPct =
        marksheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / total;
      avgGrade = getGradeFromPct(avgPct);
    }

    res.status(200).json({
      success: true,
      data: { total, published, pending, avgGrade },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompletedPrincipalExams = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { academicYear } = req.query;

    const query = { school: schoolId, status: { $regex: /^completed$/i } };
    if (academicYear) query.academicYear = academicYear;

    const schedules = await ExamSchedule.find(query)
      .populate("examStructure", "examName examType")
      .populate("class", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdmitCardEligibleExams = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const query = { school: schoolId, status: { $regex: /^published$/i } };

    const schedules = await ExamSchedule.find(query)
      .populate("examStructure", "examName examType")
      .populate("class", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
