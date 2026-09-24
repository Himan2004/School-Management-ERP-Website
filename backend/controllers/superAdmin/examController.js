import ExamStructure from "../../models/academic/examStructure.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import School from "../../models/school/School.js";
import AcademicConfig from "../../models/organization/AcademicConfig.js";
import mongoose from "mongoose";

// ==================== Helper Functions ====================
import Organization from "../../models/organization/Organization.js";

const getOrganizationId = (req) => req.user?.organizationId || req.user?.id;

const resolveOrgObjectId = async (orgId) => {
  if (!orgId) return null;

  // If it's already a valid ObjectId hex string
  if (mongoose.Types.ObjectId.isValid(orgId)) {
    return new mongoose.Types.ObjectId(orgId);
  }

  // Otherwise, it's a custom ID like "ORG-DSX8572"
  const org = await Organization.findOne({ organizationId: orgId });
  return org ? org._id : null;
};

// ==================== Dashboard & Analytics ====================

/**
 * @desc    Get global exam dashboard statistics
 * @route   GET /api/super-admin/exams/stats
 * @access  Private (Super Admin)
 */
export const getExamDashboardStats = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const [
      totalStructures,
      totalSchedules,
      publishedSchedules,
      draftSchedules,
      schoolStats,
      performanceData,
    ] = await Promise.all([
      ExamStructure.countDocuments({ organization: orgObjectId }),
      ExamSchedule.countDocuments({ organization: orgObjectId }),
      ExamSchedule.countDocuments({
        organization: orgObjectId,
        status: "published",
      }),
      ExamSchedule.countDocuments({
        organization: orgObjectId,
        status: "draft",
      }),
      ExamSchedule.distinct("school", { organization: orgObjectId }),
      Marksheet.aggregate([
        { $match: { organization: orgObjectId, status: "published" } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            passed: { $sum: { $cond: [{ $eq: ["$isPass", true] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$isPass", false] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const passFail = performanceData[0] || {
      totalStudents: 0,
      passed: 0,
      failed: 0,
    };
    const passPercentage =
      passFail.totalStudents > 0
        ? ((passFail.passed / passFail.totalStudents) * 100).toFixed(2)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalStructures,
        totalSchedules,
        publishedSchedules,
        draftSchedules,
        participatingSchools: schoolStats.length,
        performance: {
          totalStudents: passFail.totalStudents,
          passed: passFail.passed,
          failed: passFail.failed,
          passPercentage,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all exam schedules across all schools
 * @route   GET /api/super-admin/exams/all-schedules
 * @access  Private (Super Admin)
 */
export const getOrganizationExams = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const {
      schoolId,
      status,
      academicYear,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { organization: orgObjectId };
    if (schoolId) query.school = schoolId;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let schedules = await ExamSchedule.find(query)
      .populate("school", "schoolName branchId")
      .populate("examStructure", "examName examType")
      .populate("class", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Apply search filter
    if (search) {
      schedules = schedules.filter(
        (s) =>
          s.examStructure?.examName
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          s.class?.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = await ExamSchedule.countDocuments(query);

    // Format for frontend
    const formattedSchedules = schedules.map((s) => ({
      id: s._id,
      name: s.examStructure?.examName || "N/A",
      class: s.class?.name || "N/A",
      startDate: s.slots?.[0]?.examDate
        ? new Date(s.slots[0].examDate).toISOString().split("T")[0]
        : "N/A",
      status:
        s.status === "published"
          ? "Published"
          : s.status === "draft"
            ? "Draft"
            : "Scheduled",
      room: s.slots?.[0]?.venue || "TBD",
      time: s.slots?.[0]?.startTime
        ? `${s.slots[0].startTime} - ${s.slots[0].endTime}`
        : "TBD",
      supervisor: s.slots?.[0]?.invigilator?.name || "Not Assigned",
      totalStudents: 0,
      academicYear: s.academicYear,
      schoolName: s.school?.schoolName,
    }));

    res.status(200).json({
      success: true,
      data: formattedSchedules,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get performance analytics comparing schools
 * @route   GET /api/super-admin/exams/analytics
 * @access  Private (Super Admin)
 */
export const getGlobalPerformanceAnalytics = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const schoolComparison = await Marksheet.aggregate([
      { $match: { organization: orgObjectId, status: "published" } },
      {
        $group: {
          _id: "$school",
          totalStudents: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$isPass", true] }, 1, 0] } },
          averagePercentage: { $avg: "$percentage" },
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "_id",
          foreignField: "_id",
          as: "schoolInfo",
        },
      },
      { $unwind: "$schoolInfo" },
      {
        $project: {
          schoolName: "$schoolInfo.schoolName",
          branchId: "$schoolInfo.branchId",
          totalStudents: 1,
          passed: 1,
          passPercentage: {
            $cond: [
              { $gt: ["$totalStudents", 0] },
              { $multiply: [{ $divide: ["$passed", "$totalStudents"] }, 100] },
              0,
            ],
          },
          averagePercentage: { $round: ["$averagePercentage", 2] },
        },
      },
      { $sort: { passPercentage: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: schoolComparison,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== Exam Structure CRUD ====================

/**
 * @desc    Get all exam structures
 * @route   GET /api/super-admin/exams/structures
 * @access  Private (Super Admin)
 */
export const getExamStructures = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const { schoolId, academicYear, page = 1, limit = 10 } = req.query;

    const query = { organization: orgObjectId };
    if (schoolId) query.school = schoolId;
    if (academicYear) query.academicYear = academicYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const structures = await ExamStructure.find(query)
      .populate("school", "schoolName")
      .populate("applicableClasses", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ExamStructure.countDocuments(query);

    // Format for frontend
    const formattedStructures = structures.map((s) => ({
      id: s._id,
      name: s.examName,
      session: s.academicYear,
      class:
        s.applicableClasses?.map((c) => c.name).join(", ") || "All Classes",
      subjects: s.subjectMarkings?.length || 0,
      status: s.isActive ? "Published" : "Draft",
      date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A",
    }));

    res.status(200).json({
      success: true,
      data: formattedStructures,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam structure by ID
 * @route   GET /api/super-admin/exams/structures/:id
 * @access  Private (Super Admin)
 */
export const getExamStructureById = async (req, res) => {
  try {
    const { id } = req.params;
    const structure = await ExamStructure.findById(id)
      .populate("school", "schoolName")
      .populate("applicableClasses", "name")
      .populate({
        path: "subjectMarkings.subject",
        model: "organizationSubjects",
        select: "name"
      })
      .lean();

    if (!structure) {
      return res
        .status(404)
        .json({ success: false, message: "Structure not found" });
    }

    res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create exam structure
 * @route   POST /api/super-admin/exams/structures
 * @access  Private (Super Admin)
 */
export const createExamStructure = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const {
      school,
      academicYear,
      examName,
      examType,
      term,
      applicableClasses,
      subjectMarkings,
      weightagePercentage,
      isActive,
    } = req.body;

    // 1. Validate required fields from frontend
    if (!academicYear || !examName || !examType || !subjectMarkings?.length) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: academicYear, examName, examType, subjectMarkings",
      });
    }

    // 2. Fetch the Academic Config for this organization to apply global rules
    const academicConfig = await AcademicConfig.findOne({
      organization: orgObjectId,
    });

    if (!academicConfig) {
      return res.status(404).json({
        success: false,
        message:
          "Academic Configuration not found for this organization. Please set up organization rules first.",
      });
    }

    // 3. Resolve fallbacks: Use frontend values if provided, otherwise use AcademicConfig defaults
    const finalGradingConfigRef =
      req.body.gradingConfigRef || academicConfig._id;

    const finalAllowGraceMarks =
      req.body.allowGraceMarks !== undefined
        ? req.body.allowGraceMarks
        : academicConfig.rules?.exam?.allowGraceMarks || false;

    const finalGraceMarksLimit =
      req.body.graceMarksLimit !== undefined
        ? req.body.graceMarksLimit
        : academicConfig.rules?.exam?.graceMarksLimit || 0;

    // 4. Create the structure
    const newStructure = await ExamStructure.create({
      organization: orgObjectId,
      school: school || null,
      academicYear,
      examName,
      examType,
      term: term || null,
      applicableClasses: applicableClasses || [],
      subjectMarkings,
      gradingConfigRef: finalGradingConfigRef,
      weightagePercentage: weightagePercentage || 100,
      allowGraceMarks: finalAllowGraceMarks,
      graceMarksLimit: finalGraceMarksLimit,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Exam structure created successfully",
      data: newStructure,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "An exam structure with this name already exists for the given academic year.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update exam structure
 * @route   PUT /api/super-admin/exams/structures/:id
 * @access  Private (Super Admin)
 */
export const updateExamStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStructure = await ExamStructure.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!updatedStructure) {
      return res
        .status(404)
        .json({ success: false, message: "Structure not found" });
    }

    res.status(200).json({
      success: true,
      message: "Exam structure updated successfully",
      data: updatedStructure,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An exam structure with this name already exists.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete exam structure
 * @route   DELETE /api/super-admin/exams/structures/:id
 * @access  Private (Super Admin)
 */
export const deleteExamStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ExamStructure.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Structure not found" });
    }

    res.status(200).json({
      success: true,
      message: "Exam structure deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== Exam Schedule CRUD ====================

/**
 * @desc    Get all exam schedules
 * @route   GET /api/super-admin/exams/schedules
 * @access  Private (Super Admin)
 */
export const getAllExamSchedules = async (req, res) => {
  try {
    const orgId = getOrganizationId(req);
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const { schoolId, status, academicYear, page = 1, limit = 10 } = req.query;

    const query = { organization: orgObjectId };
    if (schoolId) query.school = schoolId;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const schedules = await ExamSchedule.find(query)
      .populate("school", "schoolName")
      .populate("examStructure", "examName examType")
      .populate("class", "name")
      .populate("slots.subject", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ExamSchedule.countDocuments(query);

    res.status(200).json({
      success: true,
      data: schedules,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam schedule by ID
 * @route   GET /api/super-admin/exams/schedules/:id
 * @access  Private (Super Admin)
 */
export const getExamScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ExamSchedule.findById(id)
      .populate("school", "schoolName branchId")
      .populate("examStructure", "examName examType subjectMarkings")
      .populate("slots.subject", "subjectName name subjectCode")
      .populate("class", "name")
      .lean();

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create exam schedule
 * @route   POST /api/super-admin/exams/schedules
 * @access  Private (Super Admin)
 */
export const createExamSchedule = async (req, res) => {
  try {
    const orgId = getOrganizationId(req) || req.body.organizationId;
    const orgObjectId = await resolveOrgObjectId(orgId);

    if (!orgObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid Organization context not found",
      });
    }

    const {
      school,
      examStructure,
      academicYear,
      class: classId,
      section,
      slots,
      status,
    } = req.body;

    const isMissingFields =
      !school || !examStructure || !academicYear || !classId || !slots?.length;
    const finalStatus = isMissingFields ? "draft" : status || "draft";

    // 1. Process and format the slots
    const processedSlots = (slots || []).map((slot) => {
      let durationMinutes = slot.durationMinutes;
      if (!durationMinutes && slot.startTime && slot.endTime) {
        const start = new Date(`2000-01-01T${slot.startTime}`);
        const end = new Date(`2000-01-01T${slot.endTime}`);
        durationMinutes = Math.round((end - start) / 60000);
      }

      return {
        ...slot,
        durationMinutes: durationMinutes || 60,
        maxMarks: slot.maxMarks || 100,
        subject: slot.subject || null,
      };
    });

    // 2. Prevent duplicate subjects WITHIN the new incoming slots array
    const incomingSubjectIds = processedSlots
      .filter((s) => s.subject)
      .map((s) => s.subject.toString());
    const hasInternalDuplicates =
      new Set(incomingSubjectIds).size !== incomingSubjectIds.length;

    if (hasInternalDuplicates) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot add multiple slots for the same subject in one request.",
      });
    }

    // 3. Find if an existing schedule exists for this specific class and exam
    let existingSchedule = null;
    if (school && examStructure && academicYear && classId) {
      const query = {
        organization: orgObjectId,
        school,
        examStructure,
        academicYear,
        class: classId,
      };

      if (section) query.section = section;
      else query.section = null;

      existingSchedule = await ExamSchedule.findOne(query);
    }

    // 4. If schedule EXISTS, check for duplicates and append
    if (existingSchedule) {
      const existingSubjects = existingSchedule.slots
        .filter((s) => s.subject)
        .map((s) => s.subject.toString());

      for (const newSlot of processedSlots) {
        if (
          newSlot.subject &&
          existingSubjects.includes(newSlot.subject.toString())
        ) {
          return res.status(400).json({
            success: false,
            message: `A slot for one or more of these subjects already exists in the current exam schedule.`,
          });
        }
      }

      existingSchedule.slots.push(...processedSlots);

      if (finalStatus !== "draft") {
        existingSchedule.status = finalStatus;
      }

      await existingSchedule.save();

      return res.status(200).json({
        success: true,
        message: "Slots successfully added to the existing exam schedule",
        data: existingSchedule,
      });
    }

    // 5. If schedule DOES NOT EXIST, create a new one
    const newSchedule = await ExamSchedule.create({
      organization: orgObjectId,
      school: school || null,
      examStructure: examStructure || null,
      academicYear: academicYear || null,
      class: classId || null,
      section: section || null,
      slots: processedSlots,
      status: finalStatus,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: isMissingFields
        ? "Exam schedule saved as draft due to missing fields"
        : "Exam schedule created successfully",
      data: newSchedule,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "An exam schedule already exists for this class/section and exam structure.",
      });
    }
    console.error("Error in createExamSchedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update exam schedule
 * @route   PUT /api/super-admin/exams/schedules/:id
 * @access  Private (Super Admin)
 */
export const updateExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSchedule = await ExamSchedule.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!updatedSchedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    res.status(200).json({
      success: true,
      message: "Exam schedule updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete exam schedule
 * @route   DELETE /api/super-admin/exams/schedules/:id
 * @access  Private (Super Admin)
 */
export const deleteExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ExamSchedule.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    res.status(200).json({
      success: true,
      message: "Exam schedule deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update exam schedule status (publish/draft)
 * @route   PATCH /api/super-admin/exams/schedules/:id/status
 * @access  Private (Super Admin)
 */
export const updateExamScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !["draft", "published", "ongoing", "completed", "cancelled"].includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid status is required (draft, published, ongoing, completed, cancelled)",
      });
    }

    const schedule = await ExamSchedule.findByIdAndUpdate(
      id,
      { status, publishedAt: status === "published" ? new Date() : undefined },
      { new: true },
    );

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    res.status(200).json({
      success: true,
      message: `Exam schedule ${status === "published" ? "published" : "updated to " + status} successfully`,
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get marksheets by schedule (Super Admin)
 * @route   GET /api/super-admin/exams/exams/schedules/:id/marksheets
 * @access  Private (Super Admin)
 */
export const getScheduleMarksheets = async (req, res) => {
  try {
    const { id } = req.params;
    const marksheets = await Marksheet.find({ examSchedule: id })
      .populate("student", "name rollNumber email")
      .populate("class", "name")
      .sort({ rollNumber: 1, "student.name": 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: marksheets.length,
      data: marksheets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Bulk update marksheets status (Super Admin verify/publish)
 * @route   PUT /api/super-admin/exams/exams/marksheets/status
 * @access  Private (Super Admin)
 */
export const bulkUpdateMarksheetsStatus = async (req, res) => {
  try {
    const { marksheetIds, status } = req.body;

    if (!marksheetIds || !Array.isArray(marksheetIds) || marksheetIds.length === 0) {
      return res.status(400).json({ success: false, message: "Valid marksheet IDs are required" });
    }

    if (!status || !["draft", "submitted", "verified", "published"].includes(status)) {
      return res.status(400).json({ success: false, message: "Valid status is required" });
    }

    const updateFields = { status };
    if (status === "verified") {
      updateFields.verifiedBy = req.user._id;
      updateFields.verifiedAt = new Date();
    } else if (status === "published") {
      updateFields.publishedAt = new Date();
    }

    const result = await Marksheet.updateMany(
      { _id: { $in: marksheetIds } },
      { $set: updateFields }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} marksheets updated to ${status} successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
