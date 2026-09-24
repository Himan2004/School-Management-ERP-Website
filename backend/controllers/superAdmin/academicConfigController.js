import mongoose from "mongoose";
import AcademicConfig from "../../models/organization/AcademicConfig.js";
import Organization from "../../models/organization/Organization.js";
import Class from "../../models/organization/organizationClass.js";
import Subject from "../../models/organization/organizationSubjects.js";

// Helper function to get Organization ObjectId from custom ID
const getOrganizationObjectId = async (customOrgId) => {
  try {
    if (mongoose.Types.ObjectId.isValid(customOrgId)) {
      return customOrgId;
    }
    const organization = await Organization.findOne({
      organizationId: customOrgId,
    });
    if (organization) {
      return organization._id;
    }
    return null;
  } catch (error) {
    console.error("Error finding organization:", error);
    return null;
  }
};

// ─── MAGIC POPULATION HELPER ──────────────────────────────────────────────
// Ensures every API response contains the full nested objects, not just raw IDs
const populateConfig = (query) => {
  return query
    .populate("classes", "name numericLevel")
    .populate("subjects", "name code type")
    .populate("examPattern.classRef", "name numericLevel")
    .populate(
      "examPattern.components.subjectRef",
      "name code type subjectName",
    );
};
// ──────────────────────────────────────────────────────────────────────────

// Get academic config by organization
export const getAcademicConfig = async (req, res) => {
  try {
    let { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const orgObjectId = await getOrganizationObjectId(organizationId);
    if (!orgObjectId) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Use the deep population wrapper
    let config = await populateConfig(
      AcademicConfig.findOne({ organization: orgObjectId }),
    ).lean();

    if (!config) {
      // Create default config if not exists
      config = await AcademicConfig.create({
        organization: orgObjectId,
        academicYear: {
          label:
            new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
          startDate: new Date(new Date().getFullYear(), 3, 1),
          endDate: new Date(new Date().getFullYear() + 1, 2, 31),
          isActive: true,
        },
        classes: [],
        subjects: [],
        holidays: [],
        examPattern: [],
        gradingSystem: {
          type: "percentage",
          passingMarks: 33,
          slabs: [
            {
              grade: "A+",
              min: 90,
              max: 100,
              gradePoint: 10,
              remarks: "Outstanding",
            },
            {
              grade: "A",
              min: 80,
              max: 89,
              gradePoint: 9,
              remarks: "Excellent",
            },
            {
              grade: "B+",
              min: 70,
              max: 79,
              gradePoint: 8,
              remarks: "Very Good",
            },
            { grade: "B", min: 60, max: 69, gradePoint: 7, remarks: "Good" },
            {
              grade: "C+",
              min: 50,
              max: 59,
              gradePoint: 6,
              remarks: "Average",
            },
            { grade: "C", min: 40, max: 49, gradePoint: 5, remarks: "Pass" },
            {
              grade: "D",
              min: 33,
              max: 39,
              gradePoint: 4,
              remarks: "Just Pass",
            },
            { grade: "F", min: 0, max: 32, gradePoint: 0, remarks: "Fail" },
          ],
        },
        rules: {
          attendance: {
            minPercentage: 75,
            lateMarkGracePeriodMinutes: 15,
            halfDayThresholdHours: 4,
            autoAbsentAfterMinutes: 60,
            lowAttendanceAlertPercent: 80,
            enabled: {
              minPercentage: true,
              lateMarkGracePeriodMinutes: true,
              halfDayThresholdHours: true,
              autoAbsentAfterMinutes: true,
              lowAttendanceAlertPercent: true,
            },
          },
          exam: {
            passingCriteria: "33% in each subject",
            allowGraceMarks: false,
            graceMarksLimit: 0,
            reExamAllowed: false,
          },
          fee: {
            lateFineType: "flat",
            lateFineValue: 0,
            graceDaysBeforeLateFee: 5,
            dueDateReminderDays: [7, 3, 1],
          },
          discipline: {
            maxWarningsBeforeSuspension: 3,
            autoEscalateToHQ: false,
          },
        },
      });
      // Fetch it again to ensure it populates properly after creation
      config = await populateConfig(AcademicConfig.findById(config._id)).lean();
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error fetching academic config:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update academic config
export const updateAcademicConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { ...updateData, updatedBy: req.user?.id },
        { new: true, runValidators: true },
      ),
    );

    if (!config) {
      return res.status(403).json({
        success: false,
        message: "Academic config not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
      message: "Academic configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating academic config:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update academic year
export const updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, startDate, endDate, isActive } = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        {
          academicYear: { label, startDate, endDate, isActive },
          updatedBy: req.user?.id,
        },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Academic year updated successfully",
    });
  } catch (error) {
    console.error("Error updating academic year:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add holiday
export const addHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holidayData = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { $push: { holidays: holidayData } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Holiday added successfully",
    });
  } catch (error) {
    console.error("Error adding holiday:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update holiday
export const updateHoliday = async (req, res) => {
  try {
    const { id, holidayId } = req.params;
    const updateData = req.body;

    const config = await populateConfig(
      AcademicConfig.findOneAndUpdate(
        { _id: id, "holidays._id": holidayId },
        { $set: { "holidays.$": updateData } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Holiday updated successfully",
    });
  } catch (error) {
    console.error("Error updating holiday:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete holiday
export const deleteHoliday = async (req, res) => {
  try {
    const { id, holidayId } = req.params;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { $pull: { holidays: { _id: holidayId } } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add exam pattern
export const addExamPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const patternData = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { $push: { examPattern: patternData } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Exam pattern added successfully",
    });
  } catch (error) {
    console.error("Error adding exam pattern:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update exam pattern
export const updateExamPattern = async (req, res) => {
  try {
    const { id, patternId } = req.params;
    const updateData = req.body;

    const config = await populateConfig(
      AcademicConfig.findOneAndUpdate(
        { _id: id, "examPattern._id": patternId },
        { $set: { "examPattern.$": updateData } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Exam pattern updated successfully",
    });
  } catch (error) {
    console.error("Error updating exam pattern:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete exam pattern
export const deleteExamPattern = async (req, res) => {
  try {
    const { id, patternId } = req.params;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { $pull: { examPattern: { _id: patternId } } },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Exam pattern deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exam pattern:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update grading system
export const updateGradingSystem = async (req, res) => {
  try {
    const { id } = req.params;
    const gradingData = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { gradingSystem: gradingData },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Grading system updated successfully",
    });
  } catch (error) {
    console.error("Error updating grading system:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update rules
export const updateRules = async (req, res) => {
  try {
    const { id } = req.params;
    const rulesData = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(id, { rules: rulesData }, { new: true }),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Rules updated successfully",
    });
  } catch (error) {
    console.error("Error updating rules:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk assign classes
export const assignClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const { classIds } = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { classes: classIds },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Classes assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning classes:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk assign subjects
export const assignSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;

    const config = await populateConfig(
      AcademicConfig.findByIdAndUpdate(
        id,
        { subjects: subjectIds },
        { new: true },
      ),
    );

    res.status(200).json({
      success: true,
      data: config,
      message: "Subjects assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
