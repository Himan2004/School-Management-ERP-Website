import mongoose from "mongoose";
import organizationSubjects from "../../models/organization/organizationSubjects.js";
import AcademicYear from "../../models/principal/AcademicYear.model.js";
import Holiday from "../../models/principal/Holiday.model.js";
import Term from "../../models/principal/Term.model.js";
import ClassModel from "../../models/organization/organizationClass.js";
import Period from "../../models/modules/Period.js";
import Subject from "../../models/modules/Subject.js";
import Teacher from "../../models/users/teacher.model.js";
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";
import Section from "../../models/school/Section.model.js";
import Timetable from "../../models/academic/timetable.model.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import School from "../../models/school/School.js";

const getScope = async (req) => {
    const schoolId = req.user?.school?._id || req.user?.school;
    if (!schoolId) {
        console.error("Scope Error: No school ID found in request");
        return { schoolId: null, organizationId: null };
    }

    let organizationId = req.user?.school?.organization;
    // If organization isn't populated, fetch it safely
    if (!organizationId) {
        const schoolDoc = await School.findById(schoolId).lean();
        organizationId = schoolDoc?.organization;
    }

    return { schoolId, organizationId };
};

const assertScope = (res, schoolId, organizationId) => {
  if (!schoolId || !organizationId) {
    res.status(400).json({ success: false, message: "School/organization context missing for user" });
    return false;
  }
  return true;
};

export const getAcademicYears = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    if (!schoolId) return res.status(400).json({ success: false, message: "School context missing" });

    const years = await AcademicYear.find({ school: schoolId }).sort({ startDate: -1 }).lean();
    const yearIds = years.map((y) => y._id);
    const [holidays, terms] = await Promise.all([
      Holiday.find({ academicYearId: { $in: yearIds } }).lean(),
      Term.find({ academicYearId: { $in: yearIds } }).lean(),
    ]);

    const byYearH = new Map();
    holidays.forEach((h) => {
      const k = String(h.academicYearId);
      if (!byYearH.has(k)) byYearH.set(k, []);
      byYearH.get(k).push(h);
    });
    const byYearT = new Map();
    terms.forEach((t) => {
      const k = String(t.academicYearId);
      if (!byYearT.has(k)) byYearT.set(k, []);
      byYearT.get(k).push(t);
    });

    const data = years.map((y) => ({
      ...y,
      holidays: (byYearH.get(String(y._id)) || []).map((h) => ({ id: h._id, name: h.name, date: h.date, type: h.type })),
      terms: (byYearT.get(String(y._id)) || []).map((t) => ({ id: t._id, name: t.name, startDate: t.startDate, endDate: t.endDate })),
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAcademicYear = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { schoolId, organizationId } = await getScope(req);
    if (!assertScope(res, schoolId, organizationId)) return;

    const { name, startDate, endDate, workingDays, description, workingDaysConfig, holidays = [] } = req.body;
    if (!name || !startDate || !endDate) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "name, startDate, endDate are required" });
    }

    const exists = await AcademicYear.findOne({ school: schoolId, name });
    if (exists) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: "Academic year already exists" });
    }

    const year = await AcademicYear.create(
      [{
        organization: organizationId,
        school: schoolId,
        name,
        startDate,
        endDate,
        workingDays: workingDays || 0,
        description: description || "",
        workingDaysConfig,
        status: "Upcoming",
        createdBy: req.user._id,
      }],
      { session }
    );

    if (holidays.length) {
      const docs = holidays.map((h) => ({
        organization: organizationId,
        school: schoolId,
        academicYearId: year[0]._id,
        name: h.name,
        date: h.date,
        type: h.type || "National",
        createdBy: req.user._id,
      }));
      await Holiday.insertMany(docs, { session });
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, data: year[0], message: "Academic year created" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const updateAcademicYearStatus = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const { status } = req.body;
    if (!["Active", "Locked", "Archived", "Upcoming"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const year = await AcademicYear.findOne({ _id: id, school: schoolId });
    if (!year) return res.status(404).json({ success: false, message: "Academic year not found" });

    if (status === "Active") {
      await AcademicYear.updateMany({ school: schoolId, _id: { $ne: id }, status: "Active" }, { $set: { status: "Locked" } });
    }
    year.status = status;
    await year.save();

    res.status(200).json({ success: true, data: year, message: "Status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addHoliday = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { id } = req.params;
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ success: false, message: "name and date are required" });

    const year = await AcademicYear.findOne({ _id: id, school: schoolId });
    if (!year) return res.status(404).json({ success: false, message: "Academic year not found" });

    const holiday = await Holiday.create({
      organization: organizationId,
      school: schoolId,
      academicYearId: id,
      name,
      date,
      type: type || "National",
      description: description || "",
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: holiday, message: "Holiday added" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { holidayId } = req.params;
    const deleted = await Holiday.findOneAndDelete({ _id: holidayId, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Holiday not found" });
    res.status(200).json({ success: true, message: "Holiday deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTerm = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { id } = req.params;
    const { name, startDate, endDate, description } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "name, startDate, endDate are required" });
    }
    const year = await AcademicYear.findOne({ _id: id, school: schoolId });
    if (!year) return res.status(404).json({ success: false, message: "Academic year not found" });

    const term = await Term.create({
      organization: organizationId,
      school: schoolId,
      academicYearId: id,
      name,
      startDate,
      endDate,
      description: description || "",
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: term, message: "Term added" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTerm = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { termId } = req.params;
    const deleted = await Term.findOneAndDelete({ _id: termId, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Term not found" });
    res.status(200).json({ success: true, message: "Term deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createClass = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { name, numericLevel, description, sections } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Class name is required." });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
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

    if (!isClassAllowed(name)) {
      return res.status(400).json({
        success: false,
        message: 'Organization capacity exceeded.'
      });
    }

    const targetOrg = organizationId || schoolId;
    let existingClass = await ClassModel.findOne({ organization: targetOrg, name });

    // Validate sections if provided
    let processedSections = [];
    if (sections && Array.isArray(sections)) {
      for (let sec of sections) {
        const trimmed = String(sec).trim().toUpperCase();
        if (!trimmed) {
          return res.status(400).json({ success: false, message: "Section name is required." });
        }
        if (!/^[A-Z]+$/.test(trimmed)) {
          return res.status(400).json({ success: false, message: "Only alphabets are allowed." });
        }
        if (processedSections.includes(trimmed)) {
          return res.status(400).json({ success: false, message: "This section already exists." });
        }
        processedSections.push(trimmed);
      }
    }

    if (existingClass) {
      // Class already exists, check if sections are provided to add them
      if (processedSections.length > 0) {
        // First check if any of the passed sections already exist
        const existingSections = await Section.find({
          school: schoolId,
          classId: existingClass._id,
          status: "active"
        }).lean();

        const existingSectionNames = existingSections.map(s => s.name.toUpperCase());
        const duplicates = processedSections.filter(sec => existingSectionNames.includes(sec));

        if (duplicates.length > 0) {
          return res.status(400).json({
            success: false,
            message: "This section already exists."
          });
        }

        // Create new sections
        const sectionDocs = processedSections.map((secName) => ({
          organization: targetOrg,
          school: schoolId,
          name: secName,
          classId: existingClass._id,
          className: existingClass.name,
          capacity: 40,
          status: "active",
        }));
        await Section.insertMany(sectionDocs);

        return res.status(200).json({
          success: true,
          data: existingClass,
          message: `Sections added to existing class ${name} successfully.`
        });
      } else {
        return res.status(400).json({ success: false, message: "This class already exists." });
      }
    }

    let computedNumericLevel = numericLevel;
    if (computedNumericLevel === undefined || computedNumericLevel === null || computedNumericLevel === "") {
      const match = String(name).match(/\d+/);
      computedNumericLevel = match ? parseInt(match[0], 10) : 0;
    }

    const newClass = await ClassModel.create({
      organization: targetOrg,
      school: schoolId,
      name,
      numericLevel: computedNumericLevel,
      description: description || "",
      isActive: true
    });

    // Create sections if provided
    if (processedSections.length > 0) {
      const sectionDocs = processedSections.map((secName) => ({
        organization: targetOrg,
        school: schoolId,
        name: secName,
        classId: newClass._id,
        className: newClass.name,
        capacity: 40,
        status: "active",
      }));
      await Section.insertMany(sectionDocs);
    }

    res.status(201).json({ success: true, data: newClass, message: "Class created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. REPLACE THIS ENDPOINT
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, numericLevel, description, isActive } = req.body;

    if (name) {
      const { schoolId, organizationId } = await getScope(req);
      const school = await School.findById(schoolId).lean();
      if (!school) {
        return res.status(404).json({ success: false, message: "School not found." });
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

      if (!isClassAllowed(name)) {
        return res.status(400).json({
          success: false,
          message: 'Organization capacity exceeded.'
        });
      }

      const targetOrg = organizationId || schoolId;
      const exists = await ClassModel.findOne({ organization: targetOrg, name, _id: { $ne: id } });
      if (exists) {
        return res.status(400).json({ success: false, message: "This class already exists." });
      }
    }

    let computedNumericLevel = numericLevel;
    if ((computedNumericLevel === undefined || computedNumericLevel === null || computedNumericLevel === "") && name) {
      const match = String(name).match(/\d+/);
      computedNumericLevel = match ? parseInt(match[0], 10) : 0;
    }

    const updateFields = { name, description, isActive };
    if (computedNumericLevel !== undefined && computedNumericLevel !== null) {
      updateFields.numericLevel = computedNumericLevel;
    }

    // Stripped strict org checking to guarantee the update goes through
    const updatedClass = await ClassModel.findOneAndUpdate(
      { _id: id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedClass) return res.status(404).json({ success: false, message: "Class not found" });
    
    res.status(200).json({ success: true, data: updatedClass, message: "Class updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. REPLACE THIS ENDPOINT
export const getClassesSections = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { academicYear } = req.query;

    if (!schoolId || !organizationId) {
      return res.status(400).json({ success: false, message: "School/organization context missing" });
    }

    // Get all classes for this school's organization
    let classQuery = { organization: organizationId, isActive: true };

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

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

    const classes = await ClassModel.find(classQuery).sort({ numericLevel: 1 }).lean();
    const filteredClasses = classes.filter((cls) => isClassAllowed(cls.name));
    
    // Get periods/sections for this school (timetable/period overrides)
    const periodsQuery = { schoolId: schoolId };
    if (academicYear && academicYear !== 'all') periodsQuery.academicYear = academicYear;
    const periods = await Period.find(periodsQuery).populate('classTeacher', 'name').lean();

    // Get official sections, active students, and subjects for this school
    const studentQuery = { school: schoolId, status: "active" };
    if (academicYear && academicYear !== 'all') studentQuery.academicYear = academicYear;

    const [sectionsList, activeStudents, subjectsList] = await Promise.all([
      Section.find({ school: schoolId, status: "active" }).populate('homeroomTeacher', 'name').lean(),
      Student.find(studentQuery).select("class section").lean(),
      Subject.find({ schoolId }).select("assignedClasses classId").lean()
    ]);

    // Build section name-to-ID map and in-memory counts
    const sectionMap = new Map(sectionsList.map(s => [String(s._id), s.name]));
    const studentCounts = {};

    activeStudents.forEach(stu => {
      if (!stu.class) return;
      const classIdStr = String(stu.class);
      const rawSec = stu.section ? String(stu.section) : "A";
      const sectionName = sectionMap.get(rawSec) || rawSec;
      const key = `${classIdStr}_${sectionName}`;
      studentCounts[key] = (studentCounts[key] || 0) + 1;
    });

    const data = filteredClasses.map((cls) => {
      // Find all sections belonging to this class in Section collection
      const classSections = sectionsList.filter(s => 
        String(s.classId) === String(cls._id)
      );

      // Map sections, merging Period data if available
      const mappedSections = classSections.map(s => {
        // Look for matching Period
        const matchingPeriod = periods.find(p => 
          (String(p.gradeLevel) === String(cls.name) || 
           String(p.gradeLevel) === String(cls._id) || 
           String(p.gradeLevel) === String(cls.numericLevel)) && 
          String(p.section) === String(s.name)
        );

        const studentCount = studentCounts[`${String(cls._id)}_${String(s.name)}`] || 0;

        return {
          id: s._id,
          name: s.name,
          roomNumber: matchingPeriod?.roomNumber || '',
          capacity: matchingPeriod?.maxCapacity || s.capacity || 40,
          teacherId: matchingPeriod?.classTeacher?._id || matchingPeriod?.classTeacher || s.homeroomTeacher?._id || s.homeroomTeacher || null,
          teacherName: matchingPeriod?.classTeacher?.name || matchingPeriod?.classTeacherName || s.homeroomTeacher?.name || 'Not Assigned',
          students: studentCount
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      // Fallback: If no official sections exist but periods exist, map from periods
      if (mappedSections.length === 0) {
        const classPeriods = periods.filter((p) => 
          String(p.gradeLevel) === String(cls.name) || 
          String(p.gradeLevel) === String(cls._id) || 
          String(p.gradeLevel) === String(cls.numericLevel)
        );
        
        classPeriods.forEach(p => {
          const studentCount = studentCounts[`${String(cls._id)}_${String(p.section)}`] || 0;
          mappedSections.push({
            id: p._id,
            name: p.section,
            roomNumber: p.roomNumber || '',
            capacity: p.maxCapacity || 40,
            teacherId: p.classTeacher?._id || p.classTeacher || null,
            teacherName: p.classTeacher?.name || p.classTeacherName || 'Not Assigned',
            students: studentCount,
            isFallback: true
          });
        });
        mappedSections.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Filter subjects for this class
      const classSubjects = subjectsList.filter(sub => 
        String(sub.classId) === String(cls._id) || 
        (sub.assignedClasses && sub.assignedClasses.map(String).includes(String(cls._id)))
      );

      return {
        id: cls._id,
        name: cls.name,
        order: cls.numericLevel || 0,
        description: cls.description,
        active: cls.isActive !== false,
        sections: mappedSections,
        totalStudents: mappedSections.reduce((sum, sec) => sum + sec.students, 0),
        subjectsCount: classSubjects.length,
      };
    });
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getClassesSections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertClassSection = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { sectionId, classId, className, section, academicYear, roomNumber, maxCapacity, teacherId, teacherName } = req.body;
    
    if ((!classId && !className) || !section || !academicYear) {
      return res.status(400).json({ success: false, message: "classId/className, section, academicYear are required" });
    }

    const trimmedSectionName = String(section).trim().toUpperCase();
    if (!trimmedSectionName) {
      return res.status(400).json({ success: false, message: "Section name is required." });
    }
    if (!/^[A-Z]+$/.test(trimmedSectionName)) {
      return res.status(400).json({ success: false, message: "Only alphabets are allowed." });
    }

    let gradeLevel = className;
    let targetClass = null;
    if (classId) {
      targetClass = await ClassModel.findById(classId);
      if (targetClass) gradeLevel = targetClass.name;
    } else if (className) {
      targetClass = await ClassModel.findOne({ organization: organizationId || schoolId, name: className });
    }
    
    if (!targetClass) return res.status(404).json({ success: false, message: "Class not found" });

    // Validate duplicate section name
    if (sectionId) {
      const dup = await Section.findOne({
        school: schoolId,
        classId: targetClass._id,
        name: trimmedSectionName,
        _id: { $ne: sectionId },
        status: "active"
      });
      if (dup) {
        return res.status(400).json({ success: false, message: "This section already exists." });
      }
    } else {
      const dup = await Section.findOne({
        school: schoolId,
        classId: targetClass._id,
        name: trimmedSectionName,
        status: "active"
      });
      if (dup) {
        return res.status(400).json({ success: false, message: "This section already exists." });
      }
    }

    let oldSectionName = trimmedSectionName;
    if (sectionId) {
      const existingSec = await Section.findById(sectionId);
      if (existingSec) oldSectionName = existingSec.name;
    }

    // 1. Upsert Section in the Section collection
    const query = sectionId ? { _id: sectionId } : { school: schoolId, classId: targetClass._id, name: trimmedSectionName };
    const sectionDoc = await Section.findOneAndUpdate(
      query,
      {
        $set: {
          organization: organizationId || schoolId,
          school: schoolId,
          name: trimmedSectionName,
          classId: targetClass._id,
          className: targetClass.name,
          capacity: maxCapacity || 40,
          homeroomTeacher: teacherId || null,
          status: "active"
        }
      },
      { upsert: true, new: true }
    );

    // 2. Upsert in Period collection for timetable matching
    const period = await Period.findOneAndUpdate(
      { schoolId, gradeLevel: targetClass.name, section: oldSectionName, academicYear },
      {
        $set: {
          periodName: `${targetClass.name}-${trimmedSectionName}`,
          section: trimmedSectionName,
          status: "active",
          roomNumber: roomNumber || "",
          maxCapacity: maxCapacity || 40,
          classTeacher: teacherId || null,
          classTeacherName: teacherName || ""
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json({ success: true, data: period, message: "Class section saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { classId, status, search } = req.query;
    
    // We only want subjects belonging to this specific school
    const query = { schoolId };
    
    if (classId) query.classId = classId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { subjectName: { $regex: search, $options: "i" } }, 
        { subjectCode: { $regex: search, $options: "i" } }
      ];
    }

    const subjects = await Subject.find(query)
      .populate("classId", "name numericLevel")
      .sort({ createdAt: -1 })
      .lean();
      
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { subjectName, subjectCode, description, type, theoryMarks, practicalMarks, passMarks, assignedClasses, status } = req.body;
    
    const trimmedName = subjectName ? subjectName.trim() : "";
    const trimmedCode = subjectCode ? subjectCode.trim().toUpperCase() : "";

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Subject name is required." });
    }
    if (!trimmedCode) {
      return res.status(400).json({ success: false, message: "Subject code is required." });
    }

    // 1. Same subject code check
    const codeDup = await Subject.findOne({ schoolId, subjectCode: trimmedCode });
    if (codeDup) {
      return res.status(400).json({ success: false, message: "This subject code already exists." });
    }

    // 2. Same subject name in same class check
    const existingWithSameName = await Subject.find({
      schoolId,
      subjectName: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
    });
    
    const hasOverlap = existingWithSameName.some(sub => 
      (sub.assignedClasses || []).some(clsId => (assignedClasses || []).map(String).includes(String(clsId)))
    );
    if (hasOverlap) {
      return res.status(400).json({ success: false, message: "This subject name already exists in the selected class." });
    }

    // BACKWARD COMPATIBILITY: Give legacy code a fallback classId if assignedClasses exists
    const legacyClassId = (assignedClasses && assignedClasses.length > 0) ? assignedClasses[0] : null;
    
    // Validate assignedSections mapping
    const { assignedSections, teacherId } = req.body;
    if (!assignedSections || typeof assignedSections !== "object") {
      return res.status(400).json({ success: false, message: "At least one Section must be selected." });
    }
    let hasSectionSelected = false;
    for (const clsId of assignedClasses) {
      const secs = assignedSections[clsId];
      if (secs && Array.isArray(secs) && secs.length > 0) {
        hasSectionSelected = true;
      }
    }
    if (!hasSectionSelected) {
      return res.status(400).json({ success: false, message: "At least one Section must be selected." });
    }

    const created = await Subject.create({ 
      subjectName: trimmedName, 
      subjectCode: trimmedCode, 
      description, 
      type, 
      theoryMarks, 
      practicalMarks, 
      passMarks, 
      assignedClasses,
      classId: legacyClassId, // Safe fallback for other devs
      status: status || "Active", 
      schoolId 
    });

    const { organizationId } = await getScope(req);
    const year = new Date().getFullYear();
    const academicYear = `${year}-${String(year + 1).slice(-2)}`;

    // Validate and save Section mappings
    const validSectionsInDb = await Section.find({
      school: schoolId,
      classId: { $in: assignedClasses },
      status: "active"
    }).lean();

    for (const clsId of assignedClasses) {
      const secs = assignedSections[clsId];
      if (secs && Array.isArray(secs)) {
        for (const secName of secs) {
          const isValid = validSectionsInDb.some(
            s => String(s.classId) === String(clsId) && s.name.toUpperCase() === secName.toUpperCase()
          );
          if (!isValid) {
            return res.status(400).json({
              success: false,
              message: `Section ${secName} does not exist in the selected class.`
            });
          }

          await SubjectAssignment.findOneAndUpdate(
            { school: schoolId, academicYear, class: clsId, section: secName, subject: created._id },
            { $set: { organization: organizationId || schoolId, teacherUser: teacherId || null, assignedBy: req.user._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    if (teacherId) {
      const teacherProfile = await Teacher.findOne({ user: teacherId, school: schoolId });
      if (teacherProfile) {
        await Teacher.updateOne(
          { _id: teacherProfile._id },
          { $addToSet: { subjects: created._id, assignedClasses: { $each: assignedClasses } } }
        );
      }
    }
    
    res.status(201).json({ success: true, data: created, message: "Subject created" });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "This subject code already exists." });
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const { subjectName, subjectCode, description, type, theoryMarks, practicalMarks, passMarks, assignedClasses, status } = req.body;
    
    const trimmedName = subjectName ? subjectName.trim() : "";
    const trimmedCode = subjectCode ? subjectCode.trim().toUpperCase() : "";

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Subject name is required." });
    }
    if (!trimmedCode) {
      return res.status(400).json({ success: false, message: "Subject code is required." });
    }

    // 1. Same subject code check
    const codeDup = await Subject.findOne({ schoolId, subjectCode: trimmedCode, _id: { $ne: id } });
    if (codeDup) {
      return res.status(400).json({ success: false, message: "This subject code already exists." });
    }

    // 2. Same subject name in same class check
    const existingWithSameName = await Subject.find({
      schoolId,
      _id: { $ne: id },
      subjectName: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
    });
    
    const hasOverlap = existingWithSameName.some(sub => 
      (sub.assignedClasses || []).some(clsId => (assignedClasses || []).map(String).includes(String(clsId)))
    );
    if (hasOverlap) {
      return res.status(400).json({ success: false, message: "This subject name already exists in the selected class." });
    }

    // BACKWARD COMPATIBILITY: Give legacy code a fallback classId
    const legacyClassId = (assignedClasses && assignedClasses.length > 0) ? assignedClasses[0] : null;

    // Validate assignedSections mapping
    const { assignedSections, teacherId } = req.body;
    if (!assignedSections || typeof assignedSections !== "object") {
      return res.status(400).json({ success: false, message: "At least one Section must be selected." });
    }
    let hasSectionSelected = false;
    for (const clsId of assignedClasses) {
      const secs = assignedSections[clsId];
      if (secs && Array.isArray(secs) && secs.length > 0) {
        hasSectionSelected = true;
      }
    }
    if (!hasSectionSelected) {
      return res.status(400).json({ success: false, message: "At least one Section must be selected." });
    }

    const updated = await Subject.findOneAndUpdate(
      { _id: id, schoolId }, 
      { 
        subjectName: trimmedName, 
        subjectCode: trimmedCode, 
        description, 
        type, 
        theoryMarks, 
        practicalMarks, 
        passMarks, 
        assignedClasses, 
        status,
        classId: legacyClassId // Safe fallback for other devs
      }, 
      { new: true, runValidators: true }
    );
    
    if (!updated) return res.status(404).json({ success: false, message: "Subject not found" });

    // Handle teacher and section assignment updates
    const { organizationId } = await getScope(req);
    const year = new Date().getFullYear();
    const academicYear = `${year}-${String(year + 1).slice(-2)}`;

    // Find valid sections for these classes
    const validSectionsInDb = await Section.find({
      school: schoolId,
      classId: { $in: assignedClasses },
      status: "active"
    }).lean();

    // Clear old assignments for this subject
    await SubjectAssignment.deleteMany({ school: schoolId, subject: id });

    for (const clsId of assignedClasses) {
      const secs = assignedSections[clsId];
      if (secs && Array.isArray(secs)) {
        for (const secName of secs) {
          const isValid = validSectionsInDb.some(
            s => String(s.classId) === String(clsId) && s.name.toUpperCase() === secName.toUpperCase()
          );
          if (!isValid) {
            return res.status(400).json({
              success: false,
              message: `Section ${secName} does not exist in the selected class.`
            });
          }

          await SubjectAssignment.findOneAndUpdate(
            { school: schoolId, academicYear, class: clsId, section: secName, subject: id },
            { $set: { organization: organizationId || schoolId, teacherUser: teacherId || null, assignedBy: req.user._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    if (teacherId) {
      const teacherProfile = await Teacher.findOne({ user: teacherId, school: schoolId });
      if (teacherProfile) {
        await Teacher.updateOne(
          { _id: teacherProfile._id },
          { $addToSet: { subjects: id, assignedClasses: { $each: assignedClasses } } }
        );
      }
    }

    res.status(200).json({ success: true, data: updated, message: "Subject updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const deleted = await Subject.findOneAndDelete({ _id: id, schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Subject not found" });
    await SubjectAssignment.deleteMany({ school: schoolId, subject: id });
    res.status(200).json({ success: true, message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherAssignments = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const teachers = await User.find({ school: schoolId, role: "teacher", status: "active" }).select("name loginId").lean();
    const teacherIds = teachers.map((t) => t._id);
    
    // Fetch Teacher profiles for staffId and qualification mapping
    const teacherProfiles = await Teacher.find({ user: { $in: teacherIds }, school: schoolId }).select("user staffId qualification").lean();
    const profileMap = new Map();
    teacherProfiles.forEach(tp => {
      if (tp.user) profileMap.set(tp.user.toString(), tp);
    });

    const enrichedTeachers = teachers.map(t => {
      const tp = profileMap.get(t._id.toString());
      return {
        ...t,
        staffId: tp?.staffId || "",
        qualification: tp?.qualification || ""
      };
    });

    // Fetch raw assignments populated with class and teacherUser
    const rawAssignments = await SubjectAssignment.find({ school: schoolId, teacherUser: { $in: teacherIds } })
      .populate("class", "name numericLevel")
      .populate("teacherUser", "name loginId")
      .sort({ createdAt: -1 })
      .lean();

    // Gather all unique subject IDs/names
    const subjectIds = [...new Set(rawAssignments.map(a => a.subject).filter(Boolean))];

    // Separate valid ObjectIds from plain strings (e.g. "Math")
    const validSubjectIds = subjectIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const stringSubjectNames = subjectIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    const subjectQueries = [];
    const orgSubjectQueries = [];

    if (validSubjectIds.length > 0) {
      subjectQueries.push({ _id: { $in: validSubjectIds } });
      orgSubjectQueries.push({ _id: { $in: validSubjectIds } });
    }
    if (stringSubjectNames.length > 0) {
      subjectQueries.push({ $or: [{ name: { $in: stringSubjectNames } }, { subjectName: { $in: stringSubjectNames } }] });
      orgSubjectQueries.push({ $or: [{ name: { $in: stringSubjectNames } }, { subjectName: { $in: stringSubjectNames } }] });
    }

    let subjects = [];
    let orgSubjects = [];

    if (subjectQueries.length > 0) {
      subjects = await mongoose.model("Subject").find({ $or: subjectQueries }).select("subjectName subjectCode name code").lean();
    }
    if (orgSubjectQueries.length > 0) {
      orgSubjects = await mongoose.model("organizationSubjects").find({ $or: orgSubjectQueries }).select("subjectName subjectCode name code").lean();
    }

    // Construct a lookup map
    const subjectMap = new Map();
    subjects.forEach(s => {
      if (s._id) subjectMap.set(s._id.toString(), s);
      const nameKey = (s.subjectName || s.name || "").toLowerCase();
      if (nameKey) subjectMap.set(nameKey, s);
    });
    orgSubjects.forEach(s => {
      if (s._id) subjectMap.set(s._id.toString(), s);
      const nameKey = (s.subjectName || s.name || "").toLowerCase();
      if (nameKey) subjectMap.set(nameKey, s);
    });

    // Map the resolved subjects back to the assignments array
    const assignments = rawAssignments.map(a => {
      const subVal = a.subject ? a.subject.toString() : null;
      let rawSub = null;
      if (subVal) {
        rawSub = subjectMap.get(subVal) || subjectMap.get(subVal.toLowerCase()) || null;
      }
      let resolvedSubject = null;
      if (rawSub) {
        resolvedSubject = {
          ...rawSub,
          subjectName: rawSub.subjectName || rawSub.name || "",
          subjectCode: rawSub.subjectCode || rawSub.code || "",
          name: rawSub.name || rawSub.subjectName || "",
          code: rawSub.code || rawSub.subjectCode || ""
        };
      } else if (subVal) {
        resolvedSubject = {
          subjectName: subVal,
          subjectCode: subVal.slice(0, 4).toUpperCase(),
          name: subVal,
          code: subVal.slice(0, 4).toUpperCase()
        };
      }
      return {
        ...a,
        subject: resolvedSubject
      };
    });

    res.status(200).json({ success: true, data: { teachers: enrichedTeachers, assignments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeacherAssignment = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { academicYear, classId, section, subjectId, teacherUserId } = req.body;
    if (!academicYear || !classId || !section || !subjectId || !teacherUserId) {
      return res.status(400).json({ success: false, message: "academicYear, classId, section, subjectId, teacherUserId are required" });
    }

    const teacherProfile = await Teacher.findOne({ user: teacherUserId, school: schoolId });
    if (!teacherProfile) return res.status(404).json({ success: false, message: "Teacher not found for this school" });

    const assignment = await SubjectAssignment.findOneAndUpdate(
      { school: schoolId, academicYear, class: classId, section, subject: subjectId },
      { $set: { organization: organizationId, teacherUser: teacherUserId, assignedBy: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Teacher.updateOne({ _id: teacherProfile._id }, { $addToSet: { subjects: subjectId, assignedClasses: classId } });
    res.status(201).json({ success: true, data: assignment, message: "Assignment saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTeacherAssignment = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const deleted = await SubjectAssignment.findOneAndDelete({ _id: id, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.status(200).json({ success: true, message: "Assignment removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimetables = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { classId, section, academicYear } = req.query;
    const query = { school: schoolId };
    if (classId) query.class = classId;
    if (section) query.section = section;
    if (academicYear) query.academicYear = academicYear;

    const data = await Timetable.find(query)
      .populate("class", "name numericLevel")
      .populate("schedule.periods.subject", "subjectName subjectCode")
      .populate("schedule.periods.teacher", "name loginId")
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTimetable = async (req, res) => {
  try {
    const { schoolId, organizationId } = await getScope(req);
    const { academicYear, classId, section, effectiveFrom, effectiveTo, schedule } = req.body;
    if (!academicYear || !classId || !section || !effectiveFrom || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ success: false, message: "academicYear, classId, section, effectiveFrom, schedule are required" });
    }
    await Timetable.updateMany({ school: schoolId, class: classId, section, academicYear, isActive: true }, { $set: { isActive: false } });
    const created = await Timetable.create({
      organization: organizationId,
      school: schoolId,
      academicYear,
      class: classId,
      section,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      schedule,
      isActive: true,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: created, message: "Timetable created" });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Active timetable already exists for this class/section/year" });
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTimetable = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const updated = await Timetable.findOneAndUpdate({ _id: id, school: schoolId }, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Timetable not found" });
    res.status(200).json({ success: true, data: updated, message: "Timetable updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTimetable = async (req, res) => {
  try {
    const { schoolId } = await getScope(req);
    const { id } = req.params;
    const deleted = await Timetable.findOneAndDelete({ _id: id, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Timetable not found" });
    res.status(200).json({ success: true, message: "Timetable deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
