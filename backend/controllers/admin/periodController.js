// backend/controllers/class/classController.js

import Period from '../../models/modules/Period.js';
import Subject from '../../models/modules/Subject.js';
import School from '../../models/school/School.js';

// @desc    Create a new class
// @route   POST /api/admin/classes
// @access  Private (Admin)
export const createClass = async (req, res) => {
  try {
    const { 
      periodName, 
      gradeLevel, 
      section, 
      academicYear, 
      homeroomTeacher, 
      maxCapacity, 
      roomNumber, 
      schedule,
      status 
    } = req.body;

    // Get school ID from authenticated user
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    // Validate required fields
    if (!periodName || !periodName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Period name is required'
      });
    }

    if (!gradeLevel || !gradeLevel.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Grade level is required'
      });
    }

    if (!academicYear || !academicYear.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found.'
      });
    }

    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(',').map(g => g.trim().toLowerCase())
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

    if (!isClassAllowed(gradeLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Organization capacity exceeded.'
      });
    }

    // Check if class with same gradeLevel, section, and academicYear already exists
    const existingClass = await Period.findOne({
      schoolId,
      gradeLevel,
      section: section || '',
      academicYear
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class with this grade level, section, and academic year already exists'
      });
    }

    const classData = {
      periodName: periodName.trim(),
      gradeLevel: gradeLevel.trim(),
      section: section ? section.trim() : '',
      academicYear: academicYear.trim(),
      schoolId,
      maxCapacity: maxCapacity || 40,
      currentStrength: 0
    };

    // Add optional fields if provided
    if (homeroomTeacher) classData.homeroomTeacher = homeroomTeacher;
    if (roomNumber) classData.roomNumber = roomNumber;
    if (schedule) classData.schedule = schedule;
    if (status) classData.status = status;

    const classRecord = await Period.create(classData);

    const populatedRecord = await Period.findById(classRecord._id)
      .populate({
        path: 'homeroomTeacher',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode credits');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: populatedRecord
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create class'
    });
  }
};

// @desc    Get all classes with optional filtering
// @route   GET /api/admin/classes
// @access  Private (Admin)
export const getAllClasses = async (req, res) => {
  try {
    const { gradeLevel, academicYear, status, search, page = 1, limit = 50 } = req.query;

    // Get school ID from authenticated user
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found.'
      });
    }

    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(',').map(g => g.trim().toLowerCase())
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

    // Build query
    const query = { schoolId };

    if (gradeLevel) {
      query.gradeLevel = gradeLevel;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { className: { $regex: search, $options: 'i' } },
        { gradeLevel: { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } },
        { roomNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const allMatchingClasses = await Period.find(query)
      .populate({
        path: 'homeroomTeacher',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode credits')
      .sort({ gradeLevel: 1, section: 1 });

    const filteredClasses = allMatchingClasses.filter(cls => isClassAllowed(cls.gradeLevel));
    const paginatedClasses = filteredClasses.slice(skip, skip + parseInt(limit));
    const total = filteredClasses.length;

    res.status(200).json({
      success: true,
      data: paginatedClasses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch classes'
    });
  }
};

// @desc    Get a single class by ID
// @route   GET /api/admin/classes/:id
// @access  Private (Admin)
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const classRecord = await Period.findOne({
      _id: id,
      schoolId
    })
      .populate({
        path: 'homeroomTeacher',
        select: 'phone staffId',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode description credits gradeLevel');

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch class'
    });
  }
};

// @desc    Update class information
// @route   PUT /api/admin/classes/:id
// @access  Private (Admin)
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      className, 
      gradeLevel, 
      section, 
      academicYear, 
      homeroomTeacher, 
      maxCapacity, 
      roomNumber, 
      schedule,
      status 
    } = req.body;
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const classRecord = await Period.findOne({
      _id: id,
      schoolId
    });

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (gradeLevel) {
      const school = await School.findById(schoolId).lean();
      if (!school) {
        return res.status(404).json({
          success: false,
          message: 'School not found.'
        });
      }

      const allocatedGrades = school.gradesOffered
        ? school.gradesOffered.split(',').map(g => g.trim().toLowerCase())
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

      if (!isClassAllowed(gradeLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Organization capacity exceeded.'
        });
      }
    }

    // Check if changing gradeLevel, section, or academicYear would create duplicate
    const newGradeLevel = gradeLevel || classRecord.gradeLevel;
    const newSection = section !== undefined ? section : classRecord.section;
    const newAcademicYear = academicYear || classRecord.academicYear;

    if (gradeLevel || section || academicYear) {
      const existingClass = await Period.findOne({
        schoolId,
        gradeLevel: newGradeLevel,
        section: newSection,
        academicYear: newAcademicYear,
        _id: { $ne: id }
      });

      if (existingClass) {
        return res.status(400).json({
          success: false,
          message: 'Class with this grade level, section, and academic year already exists'
        });
      }
    }

    // Update fields
    if (className) classRecord.className = className;
    if (gradeLevel) classRecord.gradeLevel = gradeLevel;
    if (section !== undefined) classRecord.section = section;
    if (academicYear) classRecord.academicYear = academicYear;
    if (homeroomTeacher !== undefined) classRecord.homeroomTeacher = homeroomTeacher;
    if (maxCapacity) classRecord.maxCapacity = maxCapacity;
    if (roomNumber !== undefined) classRecord.roomNumber = roomNumber;
    if (schedule !== undefined) classRecord.schedule = schedule;
    if (status) classRecord.status = status;

    await classRecord.save();

    // Populate the updated class to return full details
    const updatedClass = await Period.findById(id)
      .populate({
        path: 'homeroomTeacher',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode credits');

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update class'
    });
  }
};

// @desc    Delete a class
// @route   DELETE /api/admin/classes/:id
// @access  Private (Admin)
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const classRecord = await Period.findOneAndDelete({
      _id: id,
      schoolId
    });

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Update subjects that were associated with this class
    await Subject.updateMany(
      { schoolId, classId: id },
      { $unset: { classId: 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete class'
    });
  }
};

// @desc    Associate subjects with a class
// @route   POST /api/admin/classes/:id/subjects
// @access  Private (Admin)
export const associateSubjectsWithClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectIds, action = 'add' } = req.body; // action can be 'add' or 'remove'
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const classRecord = await Period.findOne({
      _id: id,
      schoolId
    });

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Subject IDs array is required'
      });
    }

    // Verify all subjects belong to this school
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      schoolId
    });

    if (subjects.length !== subjectIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more subjects not found or do not belong to this school'
      });
    }

    if (action === 'add') {
      // Add subjects that are not already associated
      const newSubjects = subjectIds.filter(
        sid => !classRecord.subjects.includes(sid)
      );
      classRecord.subjects.push(...newSubjects);
    } else if (action === 'remove') {
      // Remove specified subjects
      classRecord.subjects = classRecord.subjects.filter(
        sid => !subjectIds.includes(sid.toString())
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "add" or "remove"'
      });
    }

    await classRecord.save();

    // Populate and return updated class
    const updatedClass = await Period.findById(id)
      .populate({
        path: 'homeroomTeacher',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode credits');

    res.status(200).json({
      success: true,
      message: action === 'add' ? 'Subjects associated successfully' : 'Subjects removed successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Error associating subjects:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to associate subjects'
    });
  }
};

// @desc    Get classes by academic year
// @route   GET /api/admin/classes/by-year/:academicYear
// @access  Private (Admin)
export const getClassesByYear = async (req, res) => {
  try {
    const { academicYear } = req.params;
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const classes = await Period.find({
      schoolId,
      academicYear,
      status: 'active'
    })
      .populate({
        path: 'homeroomTeacher',
        populate: {
          path: 'user',
          select: 'name email loginId'
        }
      })
      .populate('subjects', 'subjectName subjectCode')
      .sort({ gradeLevel: 1, section: 1 });

    res.status(200).json({
      success: true,
      data: classes,
      count: classes.length
    });
  } catch (error) {
    console.error('Error fetching classes by year:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch classes'
    });
  }
};

// @desc    Get available academic years
// @route   GET /api/admin/classes/academic-years
// @access  Private (Admin)
export const getAcademicYears = async (req, res) => {
  try {
    const schoolId = req.user?.school?._id || req.user?.school || req.user?._id;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: 'School not identified. Authentication required.'
      });
    }

    const academicYears = await Period.distinct('academicYear', { schoolId });

    res.status(200).json({
      success: true,
      data: academicYears.sort().reverse() // Most recent first
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch academic years'
    });
  }
};
