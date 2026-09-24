import SchoolAcademicConfiguration from "../../models/school/SchoolAcademicConfiguration.js";

/**
 * @desc    Get all academic configurations for the logged-in school
 * @route   GET /api/admin/academic-configurations
 * @access  Private (Admin, Principal)
 */
export const getAcademicConfigurations = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const configs = await SchoolAcademicConfiguration.find({ schoolId })
      .populate("classes", "name")
      .populate("subjects", "subjectName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: configs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new academic configuration for the logged-in school
 * @route   POST /api/admin/academic-configurations
 * @access  Private (Admin)
 */
export const createAcademicConfiguration = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const organizationId = req.user.school.organization || req.user.organization;

    const {
      academicYear,
      startDate,
      endDate,
      classes,
      subjects,
      holidays,
      examPatterns,
      gradingSystem,
      isCurrent,
      status,
    } = req.body;

    if (!academicYear || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Academic Year, Start Date, and End Date are required",
      });
    }

    // Check duplicate academic year
    const existing = await SchoolAcademicConfiguration.findOne({ schoolId, academicYear });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Academic configuration for year ${academicYear} already exists`,
      });
    }

    // If marked current, unset other current configurations
    if (isCurrent) {
      await SchoolAcademicConfiguration.updateMany(
        { schoolId },
        { $set: { isCurrent: false } }
      );
    }

    const config = await SchoolAcademicConfiguration.create({
      organizationId,
      schoolId,
      academicYear,
      startDate,
      endDate,
      classes: classes || [],
      subjects: subjects || [],
      holidays: holidays || [],
      examPatterns: examPatterns || [],
      gradingSystem: gradingSystem || {
        type: "percentage",
        passingMarks: 33,
        slabs: [],
      },
      isCurrent: !!isCurrent,
      status: status || "Active",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Academic configuration created successfully",
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update an academic configuration for the logged-in school
 * @route   PUT /api/admin/academic-configurations/:id
 * @access  Private (Admin)
 */
export const updateAcademicConfiguration = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const { id } = req.params;

    const { isCurrent } = req.body;

    // Check configuration existence and ownership
    const configExists = await SchoolAcademicConfiguration.findOne({ _id: id, schoolId });
    if (!configExists) {
      return res.status(404).json({
        success: false,
        message: "Academic configuration not found or unauthorized",
      });
    }

    // If marked current, unset other current configurations
    if (isCurrent) {
      await SchoolAcademicConfiguration.updateMany(
        { schoolId, _id: { $ne: id } },
        { $set: { isCurrent: false } }
      );
    }

    const updated = await SchoolAcademicConfiguration.findOneAndUpdate(
      { _id: id, schoolId },
      {
        ...req.body,
        updatedBy: req.user._id,
      },
      { new: true }
    )
      .populate("classes", "name")
      .populate("subjects", "subjectName");

    res.status(200).json({
      success: true,
      message: "Academic configuration updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete an academic configuration for the logged-in school
 * @route   DELETE /api/admin/academic-configurations/:id
 * @access  Private (Admin)
 */
export const deleteAcademicConfiguration = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const { id } = req.params;

    const deleted = await SchoolAcademicConfiguration.findOneAndDelete({ _id: id, schoolId });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Academic configuration not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Academic configuration deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get the current active configuration for the logged-in school
 * @route   GET /api/admin/academic-configurations/current
 * @access  Private (Admin, Principal)
 */
export const getCurrentAcademicConfiguration = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const config = await SchoolAcademicConfiguration.findOne({ schoolId, isCurrent: true })
      .populate("classes", "name")
      .populate("subjects", "subjectName");

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Current active academic configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
