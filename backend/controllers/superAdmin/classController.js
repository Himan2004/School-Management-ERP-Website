import Class from "../../models/organization/organizationClass.js";
import Organization from "../../models/organization/Organization.js";
import Subject from "../../models/organization/organizationSubjects.js";
import mongoose from "mongoose";

// Helper function to get Organization ObjectId from custom ID
const getOrganizationObjectId = async (customOrgId) => {
  try {
    if (!customOrgId) return null;
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

// Get all classes
export const getClasses = async (req, res) => {
  try {
    const { organizationId } = req.query;
    let query = {};

    if (req.role === 'superadmin') {
      query.organization = req.user._id;
    } else if (organizationId) {
      const orgObjectId = await getOrganizationObjectId(organizationId);
      if (orgObjectId) {
        query.organization = orgObjectId;
      }
    }

    // Sort alphabetically by name instead of numericLevel
    const classes = await Class.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get class statistics
export const getClassStatistics = async (req, res) => {
  try {
    let query = {};
    if (req.role === 'superadmin') {
      query.organization = req.user._id;
    }

    const total = await Class.countDocuments(query);
    const active = await Class.countDocuments({ ...query, isActive: true });
    const inactive = await Class.countDocuments({ ...query, isActive: false });

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new class
export const createClass = async (req, res) => {
  try {
    const { name, description, isActive, organization } = req.body;
    const targetOrgId = req.role === 'superadmin' ? req.user._id : organization;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Class name is required",
      });
    }

    const existingOrganization = await Organization.findById(targetOrgId);
    if (!existingOrganization) {
      return res.status(400).json({
        success: false,
        message: "Organization doesn't exist!!",
      });
    }

    // Check for duplicate name in the same org
    const existingClass = await Class.findOne({
      organization: targetOrgId,
      name: { $regex: new RegExp(`^${name}$`, "i") }, // case-insensitive check
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: `Class "${name}" already exists`,
      });
    }

    const newClass = await Class.create({
      organization: targetOrgId,
      name: name.trim(),
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: newClass,
      message: "Class created successfully",
    });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a class
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (req.role === 'superadmin' && String(existingClass.organization) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this class",
      });
    }

    // Check for duplicate name (excluding current class)
    if (name && name !== existingClass.name) {
      const duplicateClass = await Class.findOne({
        organization: existingClass.organization,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      });
      if (duplicateClass) {
        return res.status(400).json({
          success: false,
          message: `Class "${name}" already exists`,
        });
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      {
        name: name ? name.trim() : existingClass.name,
        description:
          description !== undefined ? description : existingClass.description,
        isActive: isActive !== undefined ? isActive : existingClass.isActive,
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: "Class updated successfully",
    });
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. First find the class to check authorization
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (req.role === 'superadmin' && String(existingClass.organization) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this class",
      });
    }

    // 2. Attempt to delete the class
    const deletedClass = await Class.findByIdAndDelete(id);

    // 2. If the class was successfully deleted, delete all subjects referencing it
    const deletedSubjects = await Subject.deleteMany({ classRef: id });

    res.status(200).json({
      success: true,
      message: "Class and associated subjects deleted successfully",
      meta: {
        subjectsDeleted: deletedSubjects.deletedCount,
      },
    });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get class by ID
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id).lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (req.role === 'superadmin' && String(classData.organization) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this class",
      });
    }

    res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk create classes
export const bulkCreateClasses = async (req, res) => {
  try {
    const { classes } = req.body;

    if (!classes || !classes.length) {
      return res.status(400).json({
        success: false,
        message: "Classes array is required",
      });
    }

    const createdClasses = [];
    const errors = [];

    // Note: To properly bulk create with organization scoping, you'd ideally pass the organization ID from the req.user or request body root. Assuming it's in the classData for now if required.
    for (const classData of classes) {
      try {
        const targetOrgId = req.role === 'superadmin' ? req.user._id : classData.organization;
        const existingClass = await Class.findOne({
          name: { $regex: new RegExp(`^${classData.name}$`, "i") },
          organization: targetOrgId,
        });
        if (existingClass) {
          errors.push(`Class "${classData.name}" already exists`);
          continue;
        }

        const newClass = await Class.create({
          organization: targetOrgId,
          name: classData.name.trim(),
          description: classData.description || "",
          isActive:
            classData.isActive !== undefined ? classData.isActive : true,
        });

        createdClasses.push(newClass);
      } catch (err) {
        errors.push(err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: createdClasses,
      errors: errors.length > 0 ? errors : undefined,
      message: `${createdClasses.length} classes created successfully`,
    });
  } catch (error) {
    console.error("Error bulk creating classes:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk delete classes
export const bulkDeleteClasses = async (req, res) => {
  try {
    const { classIds } = req.body;

    if (!classIds || !classIds.length) {
      return res.status(400).json({
        success: false,
        message: "Class IDs array is required",
      });
    }

    const result = await Class.deleteMany({ _id: { $in: classIds } });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
      message: `${result.deletedCount} classes deleted successfully`,
    });
  } catch (error) {
    console.error("Error bulk deleting classes:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
