import mongoose from "mongoose";
import Subject from "../../models/organization/organizationSubjects.js";
import Class from "../../models/organization/organizationClass.js";
import Organization from "../../models/organization/Organization.js";
import organizationSubjects from "../../models/organization/organizationSubjects.js";

// Helper function to get Organization ObjectId from custom ID
const getOrganizationObjectId = async (customOrgId) => {
  try {
    if (!customOrgId) return null;
    if (mongoose.Types.ObjectId.isValid(customOrgId)) {
      return new mongoose.Types.ObjectId(customOrgId);
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

export const getSubjects = async (req, res) => {
  try {
    let { organizationId, classId } = req.query;
    
    // Override organizationId with logged-in superadmin's org if applicable
    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

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

    let query = { organization: orgObjectId };

    // Filter by class if provided
    if (classId) {
      // PRO TIP: If you want classes to also see "global" subjects, 
      // you could change this to: query.classRef = { $in: [classId, null] }
      query.classRef = classId;
    }

    const subjects = await organizationSubjects.find(query)
      .populate("classRef", "name numericLevel")
      .populate("organization", "organizationName organizationId")
      .sort({ createdAt: -1 })
      .lean(); 

    // FILTER FIX: Allow both 'description' and 'classRef' to be null
    const validSubjects = subjects.filter((subject) => {
      for (const key in subject) {
        // Skip the null check for fields that are legally allowed to be null
        if (key !== "description" && key !== "classRef" && subject[key] == null) {
          return false; // Toss this subject out
        }
      }
      return true; // Keep this subject
    });

    res.status(200).json({
      success: true,
      data: validSubjects, // Send the filtered list
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    let { organizationId } = req.query;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

    // ✅ Step 1: Check organizationId
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // ✅ Step 2: Convert to Mongo ObjectId
    const orgObjectId = await getOrganizationObjectId(organizationId);

    if (!orgObjectId) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // ✅ Step 3: Fetch subject WITH organization filter
    const subject = await Subject.findOne({
      _id: id,
      organization: orgObjectId,
    })
      .populate("classRef", "name numericLevel")
      .populate("organization", "organizationName organizationId")
      .lean();

    // ✅ Step 4: Handle not found
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found for this organization",
      });
    }

    // ✅ Step 5: Success response
    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subjects by class
export const getSubjectsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    let { organizationId } = req.query;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

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

    const subjects = await Subject.find({
      organization: orgObjectId,
      classRef: classId,
      isActive: true,
    })
      .populate("classRef", "name numericLevel")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects by class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new subject
export const createSubject = async (req, res) => {
  try {
    let { organizationId, classId, name, code, type, isActive, createdBy } = req.body;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

    if (!organizationId || !classId || !name) {
      return res.status(400).json({
        success: false,
        message: "Organization ID, Class ID, and Subject name are required",
      });
    }

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const orgObjectId = await getOrganizationObjectId(organizationId);
    if (!orgObjectId) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check for duplicate subject in same class and organization
    const existingSubject = await Subject.findOne({
      organization: orgObjectId,
      classRef: classId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: "Subject with this name already exists in the selected class",
      });
    }

    // Generate subject code if not provided
    let subjectCode = code;
    if (!subjectCode) {
      subjectCode =
        `${classExists.name.substring(0, 3)}_${name.substring(0, 3)}_${Date.now()}`.toUpperCase();
    }

    const newSubject = await Subject.create({
      organization: orgObjectId,
      classRef: classId,
      name,
      code: subjectCode,
      type: type || "core",
      isActive: isActive !== undefined ? isActive : true,
      createdBy: createdBy || req.user?.id,
    });

    const populatedSubject = await Subject.findById(newSubject._id)
      .populate("classRef", "name numericLevel")
      .populate("organization", "organizationName organizationId");

    res.status(201).json({
      success: true,
      data: populatedSubject,
      message: "Subject created successfully",
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a subject
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, type, isActive } = req.body;

    let { organizationId } = req.body;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

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

    const existingSubject = await Subject.findOne({
      _id: id,
      organization: orgObjectId,
    });
    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Check for duplicate name in same class and organization (excluding current subject)
    if (name && name !== existingSubject.name) {
      const duplicateSubject = await Subject.findOne({
        organization: existingSubject.organization,
        classRef: existingSubject.classRef,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      });

      if (duplicateSubject) {
        return res.status(400).json({
          success: false,
          message:
            "Subject with this name already exists in the selected class",
        });
      }
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        name: name || existingSubject.name,
        code: code || existingSubject.code,
        type: type || existingSubject.type,
        isActive: isActive !== undefined ? isActive : existingSubject.isActive,
      },
      { new: true, runValidators: true },
    )
      .populate("classRef", "name numericLevel")
      .populate("organization", "organizationName organizationId");

    res.status(200).json({
      success: true,
      data: updatedSubject,
      message: "Subject updated successfully",
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a subject
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    let { organizationId } = req.body;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

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

    const deletedSubject = await Subject.findOneAndDelete({
      _id: id,
      organization: orgObjectId,
    });
    if (!deletedSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subject statistics
export const getSubjectStatistics = async (req, res) => {
  try {
    let { organizationId } = req.query;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // Convert custom organization ID to ObjectId
    const orgObjectId = await getOrganizationObjectId(organizationId);
    if (!orgObjectId) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // 1. Fetch all subjects for the organization and populate classRef
    const allSubjects = await Subject.find({ organization: orgObjectId })
      .populate("classRef", "name numericLevel")
      .lean(); // Use .lean() to get plain JS objects

    // 2. Apply the exact same filter to strip out invalid subjects
    const validSubjects = allSubjects.filter((subject) => {
      for (const key in subject) {
        if (key !== "description" && subject[key] == null) {
          return false;
        }
      }
      return true;
    });

    // 3. Calculate basic statistics using ONLY the filtered array
    const total = validSubjects.length;
    const active = validSubjects.filter((s) => s.isActive === true).length;
    const inactive = validSubjects.filter((s) => s.isActive === false).length;
    const core = validSubjects.filter((s) => s.type === "core").length;
    const optional = validSubjects.filter((s) => s.type === "optional").length;
    const practical = validSubjects.filter(
      (s) => s.type === "practical",
    ).length;

    // 4. Group subjects by class manually to replace the aggregate pipeline
    const classStatsMap = {};

    validSubjects.forEach((subject) => {
      // Safely extract the ID from the populated classRef object
      const classIdStr = subject.classRef._id.toString();

      // Initialize the class group if it doesn't exist yet
      if (!classStatsMap[classIdStr]) {
        classStatsMap[classIdStr] = {
          _id: subject.classRef._id,
          className: subject.classRef.name,
          level: subject.classRef.numericLevel,
          count: 0,
        };
      }

      // Increment the count for this specific class
      classStatsMap[classIdStr].count += 1;
    });

    // Convert the dictionary map back into an array for the response
    const subjectsByClass = Object.values(classStatsMap);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        core,
        optional,
        practical,
        subjectsByClass,
      },
    });
  } catch (error) {
    console.error("Error fetching subject statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk create subjects
export const bulkCreateSubjects = async (req, res) => {
  try {
    let { organizationId, classId, subjects } = req.body;

    if (req.role === 'superadmin' && req.user) {
      organizationId = req.user._id.toString();
    }

    if (!organizationId || !classId || !subjects || !subjects.length) {
      return res.status(400).json({
        success: false,
        message: "Organization ID, Class ID, and subjects array are required",
      });
    }

    // Convert custom organization ID to ObjectId
    const orgObjectId = await getOrganizationObjectId(organizationId);
    if (!orgObjectId) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const createdSubjects = [];
    const errors = [];

    for (const subjectData of subjects) {
      try {
        const existingSubject = await Subject.findOne({
          organization: orgObjectId,
          classRef: classId,
          name: { $regex: new RegExp(`^${subjectData.name}$`, "i") },
        });

        if (existingSubject) {
          errors.push(`Subject "${subjectData.name}" already exists`);
          continue;
        }

        const newSubject = await Subject.create({
          organization: orgObjectId,
          classRef: classId,
          name: subjectData.name,
          code:
            subjectData.code ||
            `${classExists.name.substring(0, 3)}_${subjectData.name.substring(0, 3)}_${Date.now()}`.toUpperCase(),
          type: subjectData.type || "core",
          isActive:
            subjectData.isActive !== undefined ? subjectData.isActive : true,
        });

        createdSubjects.push(newSubject);
      } catch (err) {
        errors.push(err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: createdSubjects,
      errors: errors.length > 0 ? errors : undefined,
      message: `${createdSubjects.length} subjects created successfully`,
    });
  } catch (error) {
    console.error("Error bulk creating subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk delete subjects
export const bulkDeleteSubjects = async (req, res) => {
  try {
    const { subjectIds } = req.body;

    if (!subjectIds || !subjectIds.length) {
      return res.status(400).json({
        success: false,
        message: "Subject IDs array is required",
      });
    }

    const result = await Subject.deleteMany({ _id: { $in: subjectIds } });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
      message: `${result.deletedCount} subjects deleted successfully`,
    });
  } catch (error) {
    console.error("Error bulk deleting subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
