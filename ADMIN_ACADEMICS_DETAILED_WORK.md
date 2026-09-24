# ADMIN ACADEMICS BACKEND - DETAILED IMPLEMENTATION WORK
## Complete Task Breakdown with Code Structure

**Document Date:** April 30, 2026  
**Total Phases:** 6 Major Implementation Phases  
**Estimated Duration:** 4 weeks

---

## PART 1: ATTENDANCE MANAGEMENT SYSTEM

### File 1: Create `controllers/admin/attendanceController.js`

**Functions to Implement (6 total):**

```javascript
1. markAttendance(req, res)
   Purpose: Record attendance for a class/subject
   Request:
   {
     classId: ObjectId,
     section: string,
     date: Date,
     attendanceType: "class" | "subject",
     subject: ObjectId (optional, required if type="subject"),
     entries: [
       { studentId: ObjectId, status: "present"|"absent"|"late"|"half_day"|"on_leave", remarks: string }
     ]
   }
   Response: { success, message, data: attendanceRecord }
   Validation:
   - Date cannot be in future
   - All student IDs must exist and belong to this class
   - At least one entry required
   - Prevent duplicate entries for same date/class
   
   Database:
   - Save to Attendance model
   - Calculate totalPresent, totalAbsent automatically
   - Store markedBy: req.admin._id, markedByRole: "admin"

2. updateAttendance(req, res)
   Purpose: Modify existing attendance records
   Route: PATCH /api/admin/attendance/:attendanceId
   Request: { entries: [{ studentId, status, remarks }] }
   Response: { success, message, data: updatedRecord }
   Validation:
   - Only admin who created it or principal can update
   - Cannot update attendance older than 7 days (configurable)
   - Recalculate totals after update

3. getAttendanceReport(req, res)
   Purpose: Generate class/student attendance report
   Route: GET /api/admin/attendance/report
   Query:
   {
     classId: ObjectId,
     section: string (optional),
     studentId: ObjectId (optional),
     fromDate: Date,
     toDate: Date,
     sortBy: "name"|"attendance"|"percentage"
   }
   Response: {
     success,
     data: {
       classInfo: { className, section, totalStudents },
       totalClassesHeld: number,
       students: [
         {
           studentId, name, rollNumber,
           presentDays, absentDays, lateDays, halfDayDays, leaveDays,
           totalPresent, totalMarked,
           attendancePercentage,
           statusFlag: "normal"|"low" (< 75%)
         }
       ],
       reportPeriod: { from, to }
     }
   }
   Logic:
   - Fetch all attendance records for class in date range
   - Count days for each student
   - Calculate percentage: (presentDays + 0.5*halfDayDays) / totalClassesHeld
   - Sort by requested field

4. getStudentAttendanceHistory(req, res)
   Purpose: Get attendance history for individual student
   Route: GET /api/admin/attendance/student/:studentId
   Query: { academicYear, fromDate, toDate, groupBy: "daily"|"weekly"|"monthly" }
   Response: {
     success,
     data: {
       studentInfo: { studentId, name, rollNumber, class, section },
       history: [
         {
           date, status, subject (if subject-wise),
           markedBy: { name, role },
           remarks
         }
       ],
       summary: {
         totalDaysMarked, presentDays, absentDays,
         percentage, trend: "improving"|"declining"|"stable"
       }
     }
   }

5. deleteAttendance(req, res)
   Purpose: Remove attendance record (admin only)
   Route: DELETE /api/admin/attendance/:attendanceId
   Validation:
   - Only admin who created or super admin can delete
   - Log deletion for audit
   Response: { success, message }

6. getAttendanceAnalytics(req, res)
   Purpose: Analytics dashboard for attendance
   Route: GET /api/admin/attendance/analytics
   Query: { classId, section, month, year }
   Response: {
     success,
     data: {
       averageAttendance: percentage,
       lowAttendanceStudents: [{ studentId, name, percentage }],
       byStatus: { present: %, absent: %, late: %, halfDay: %, onLeave: % },
       bySection: { sectionA: %, sectionB: % },
       trends: { lastWeek: %, lastMonth: % },
       alerts: [
         { message: "10 students below 75%", severity: "warning" }
       ]
     }
   }
```

---

### File 2: Create `routes/admin/attendanceRoutes.js`

```javascript
import express from "express";
import {
  markAttendance,
  updateAttendance,
  getAttendanceReport,
  getStudentAttendanceHistory,
  deleteAttendance,
  getAttendanceAnalytics
} from "../../controllers/admin/attendanceController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected - admin only
router.use(protect, authorize("admin"));

// Attendance Recording
router.post("/mark", markAttendance);
router.patch("/:attendanceId", updateAttendance);

// Attendance Reporting
router.get("/report", getAttendanceReport);
router.get("/student/:studentId", getStudentAttendanceHistory);
router.get("/analytics", getAttendanceAnalytics);

// Deletion
router.delete("/:attendanceId", deleteAttendance);

export default router;
```

---

### File 3: Add to `utils/academicsUtils.js` (Create if not exists)

**Helper Functions for Attendance:**

```javascript
// Calculate attendance percentage
export const calculateAttendancePercentage = (presentDays, halfDayDays, totalClassesHeld) => {
  if (totalClassesHeld === 0) return 0;
  const effectiveDays = presentDays + (halfDayDays * 0.5);
  return (effectiveDays / totalClassesHeld) * 100;
};

// Check if attendance is low
export const isLowAttendance = (percentage, threshold = 75) => {
  return percentage < threshold;
};

// Get attendance status label
export const getAttendanceStatus = (percentage) => {
  if (percentage >= 90) return "excellent";
  if (percentage >= 75) return "good";
  if (percentage >= 60) return "fair";
  return "poor";
};

// Calculate working days in a month
export const getWorkingDaysInMonth = (year, month, workingDaysConfig) => {
  // workingDaysConfig = { workingDaysPerWeek, holidays: [dates] }
  // Implementation: Count Mon-Sat for month, exclude holidays
};
```

---

## PART 2: TIMETABLE MANAGEMENT SYSTEM

### File 4: Create `controllers/admin/timetableController.js`

**Functions to Implement (6 total):**

```javascript
1. createTimetable(req, res)
   Purpose: Create new class timetable
   Request:
   {
     classId: ObjectId,
     section: string,
     academicYear: string,
     effectiveFrom: Date,
     effectiveTo: Date (optional),
     schedule: [
       {
         day: "monday"|"tuesday"|...|"sunday",
         isWorkingDay: boolean,
         periods: [
           {
             periodNumber: number,
             startTime: "HH:MM",
             endTime: "HH:MM",
             subject: ObjectId (optional),
             teacher: ObjectId (optional),
             isBreak: boolean,
             breakLabel: string (optional)
           }
         ]
       }
     ]
   }
   Response: { success, message, data: timetable }
   Validation:
   - Check no time overlaps in a day
   - Verify teacher and subject IDs exist
   - Deactivate existing timetable for same class
   - effectiveFrom must be >= today
   - Each period: startTime < endTime
   
   Database:
   - Create Timetable record
   - Set isActive: true
   - Store createdBy: req.admin._id

2. getTimetable(req, res)
   Purpose: Get timetable for a class
   Route: GET /api/admin/timetable/:classId/:section
   Query: { academicYear, date (optional) }
   Response: {
     success,
     data: {
       timetableId, classInfo, section, academicYear,
       schedule: [{ day, periods: [{ period details with teacher/subject names }] }],
       effectiveFrom, effectiveTo, isActive
     }
   }
   Logic:
   - If date provided, return schedule for that specific day
   - Populate teacher and subject details

3. updateTimetable(req, res)
   Purpose: Modify timetable
   Route: PUT /api/admin/timetable/:timetableId
   Request: { schedule (partial update allowed), effectiveTo }
   Response: { success, message, data: updatedTimetable }
   Validation:
   - Cannot modify past dates
   - Re-validate all time slots
   - If effectiveFrom < today, only allow minor changes

4. listTimetables(req, res)
   Purpose: List all timetables with filters
   Route: GET /api/admin/timetables
   Query: { academicYear, classId, section, status: "active"|"archived", page, limit }
   Response: {
     success,
     data: [{ timetableId, class, section, effectiveFrom, effectiveTo, isActive }],
     pagination: { total, page, pages }
   }

5. deactivateTimetable(req, res)
   Purpose: Archive a timetable
   Route: PATCH /api/admin/timetable/:timetableId/deactivate
   Response: { success, message }
   Logic:
   - Set isActive: false
   - Keep for historical records

6. validateTimetable(req, res)
   Purpose: Check timetable validity
   Route: GET /api/admin/timetable/:timetableId/validate
   Response: {
     success,
     data: {
       isValid: boolean,
       issues: [
         { type: "error"|"warning", message: "..." }
       ],
       report: {
         conflictingPeriods: [...],
         unassignedTeachers: [...],
         unassignedSubjects: [...],
         recommendations: [...]
       }
     }
   }
   Checks:
   - No time overlaps
   - All teachers available (not in multiple classes)
   - All mandatory subjects covered
   - Proper break distribution
   - Teacher maximum periods per day
```

---

### File 5: Create `routes/admin/timetableRoutes.js`

```javascript
import express from "express";
import {
  createTimetable,
  getTimetable,
  updateTimetable,
  listTimetables,
  deactivateTimetable,
  validateTimetable
} from "../../controllers/admin/timetableController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.post("/", createTimetable);
router.get("/", listTimetables);
router.get("/:classId/:section", getTimetable);
router.put("/:timetableId", updateTimetable);
router.patch("/:timetableId/deactivate", deactivateTimetable);
router.get("/:timetableId/validate", validateTimetable);

export default router;
```

---

### File 6: Add to `utils/academicsUtils.js`

**Helper Functions for Timetable:**

```javascript
// Check time conflict
export const checkTimeConflict = (periods) => {
  const conflicts = [];
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const p1 = periods[i];
      const p2 = periods[j];
      
      if (timeRangesOverlap(p1.startTime, p1.endTime, p2.startTime, p2.endTime)) {
        conflicts.push({
          period1: p1.periodNumber,
          period2: p2.periodNumber,
          message: `Periods ${p1.periodNumber} and ${p2.periodNumber} overlap`
        });
      }
    }
  }
  return conflicts;
};

// Helper: Check if two time ranges overlap
const timeRangesOverlap = (start1, end1, start2, end2) => {
  return timeToMinutes(start1) < timeToMinutes(end2) &&
         timeToMinutes(start2) < timeToMinutes(end1);
};

// Convert HH:MM to minutes
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Get working days count in a month
export const getWorkingDaysInMonth = (year, month, holidays = []) => {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const holidayDates = holidays.map(h => h.getTime());
  
  for (let day = 1; day <= lastDay; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && !holidayDates.includes(date.getTime())) {
      count++;
    }
  }
  return count;
};
```

---

## PART 3: EXAM STRUCTURE & CONFIGURATION

### File 7: Extend `controllers/admin/examController.js`

**Add 3 New Functions:**

```javascript
// Function 1: Get all exam structures
export const getExamStructures = async (req, res) => {
  try {
    const { academicYear, examType, classId } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    let filter = { school: schoolId };
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;
    if (classId) filter.applicableClasses = classId;

    const structures = await ExamStructure.find(filter)
      .populate("applicableClasses", "name")
      .populate({
        path: "subjectMarkings.subject",
        select: "subjectName code"
      })
      .populate("gradingConfigRef", "gradingSystem passingMarksPercentage")
      .sort({ academicYear: -1, examName: 1 });

    res.status(200).json({
      success: true,
      count: structures.length,
      data: structures
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 2: Get exam structure by ID
export const getExamStructureById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const structure = await ExamStructure.findById(id)
      .populate("applicableClasses", "name section")
      .populate({
        path: "subjectMarkings.subject",
        select: "subjectName code maxMarks"
      })
      .populate("gradingConfigRef");

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: "Exam structure not found"
      });
    }

    res.status(200).json({
      success: true,
      data: structure
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 3: Validate exam structure
export const validateExamStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const structure = await ExamStructure.findById(id);

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: "Exam structure not found"
      });
    }

    const issues = [];
    const warnings = [];

    // Check mandatory subjects
    if (structure.subjectMarkings.length === 0) {
      issues.push("No subjects defined in exam structure");
    }

    // Check mark distribution
    structure.subjectMarkings.forEach((marking, index) => {
      if (marking.totalMaxMarks === 0) {
        issues.push(`Subject ${index + 1}: Total max marks is 0`);
      }
      if (marking.passingMarks >= marking.totalMaxMarks) {
        warnings.push(`Subject ${index + 1}: Passing marks equal to or greater than max marks`);
      }
    });

    // Check grading config exists
    const gradingConfig = await mongoose.model('AcademicConfig').findById(structure.gradingConfigRef);
    if (!gradingConfig) {
      issues.push("Associated grading configuration not found");
    } else if (gradingConfig.gradingRules.length === 0) {
      issues.push("Grading configuration has no grading rules");
    }

    res.status(200).json({
      success: true,
      data: {
        isValid: issues.length === 0,
        issues,
        warnings,
        totalSubjects: structure.subjectMarkings.length,
        totalMaxMarks: structure.subjectMarkings.reduce((sum, s) => sum + s.totalMaxMarks, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### File 8: Extend `routes/admin/examRoutes.js`

**Add Routes:**

```javascript
// Add these imports at top
import {
  // ... existing imports
  getExamStructures,
  getExamStructureById,
  validateExamStructure
} from "../../controllers/admin/examController.js";

// Add these routes
router.get("/structure", getExamStructures);
router.get("/structure/:id", getExamStructureById);
router.get("/structure/:id/validate", validateExamStructure);
```

---

## PART 4: MARKSHEET MANAGEMENT (Enhanced)

### File 9: Extend `controllers/admin/examController.js`

**Add 7 New Functions:**

```javascript
// Function 1: Create marksheets for exam
export const createMarksheets = async (req, res) => {
  try {
    const { scheduleId, classId, section, academicYear } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    // Fetch exam schedule
    const schedule = await ExamSchedule.findById(scheduleId)
      .populate("examStructure");

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Exam schedule not found"
      });
    }

    // Get all students in this class
    const Class = mongoose.model('Classes');
    const classData = await Class.findById(classId);
    const students = classData.students || [];

    // Create marksheet for each student
    const marksheets = await Promise.all(
      students.map(studentId =>
        Marksheet.create({
          organization: req.admin.organization,
          school: schoolId,
          student: studentId,
          examSchedule: scheduleId,
          examStructure: schedule.examStructure._id,
          academicYear,
          class: classId,
          section,
          rollNumber: "", // Will be populated later
          subjectMarks: schedule.examStructure.subjectMarkings.map(marking => ({
            subject: marking.subject,
            maxMarks: marking.totalMaxMarks,
            passingMarks: marking.passingMarks
          })),
          status: "draft",
          createdBy: req.admin._id
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${marksheets.length} marksheets created successfully`,
      data: marksheets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 2: Enter/update marks
export const updateMarksEntry = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    const { subjectMarks, remarks } = req.body;

    const marksheet = await Marksheet.findById(marksheetId);
    if (!marksheet) {
      return res.status(404).json({
        success: false,
        message: "Marksheet not found"
      });
    }

    // Validate and update marks
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let failedSubjects = 0;

    marksheet.subjectMarks = subjectMarks.map(entry => {
      const existingEntry = marksheet.subjectMarks.find(
        e => e.subject.toString() === entry.subject
      );

      // Validate marks
      if (entry.theoryMarks && entry.theoryMarks < 0) {
        throw new Error(`Invalid theory marks for subject ${entry.subject}`);
      }

      // Calculate total
      const total = (entry.theoryMarks || 0) +
                   (entry.practicalMarks || 0) +
                   (entry.internalMarks || 0) +
                   (entry.graceMarksApplied || 0);

      const isPass = total >= entry.passingMarks && !entry.isAbsent;
      if (!isPass && !entry.isAbsent) failedSubjects++;

      totalMarksObtained += total;
      totalMaxMarks += entry.maxMarks;

      return {
        ...entry,
        totalMarks: total,
        isPass,
        grade: calculateGrade(total, entry.maxMarks),
        gradePoint: calculateGradePoint(total, entry.maxMarks)
      };
    });

    // Update marksheet totals
    marksheet.totalMarksObtained = totalMarksObtained;
    marksheet.totalMaxMarks = totalMaxMarks;
    marksheet.percentage = (totalMarksObtained / totalMaxMarks) * 100;
    marksheet.isPass = failedSubjects === 0;
    marksheet.status = "submitted";
    marksheet.submittedBy = req.admin._id;
    marksheet.submittedAt = new Date();

    await marksheet.save();

    res.status(200).json({
      success: true,
      message: "Marks updated successfully",
      data: marksheet
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Function 3: Bulk mark upload (CSV)
export const bulkMarkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Parse CSV
    const csv = require('csv-parse/sync');
    const fileContent = req.file.buffer.toString();
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const results = [];
    const errors = [];

    for (const [index, record] of records.entries()) {
      try {
        // Find marksheet
        const marksheet = await Marksheet.findOne({
          $or: [
            { _id: record.marksheetId },
            { student: record.studentId, examSchedule: record.examScheduleId }
          ]
        });

        if (!marksheet) {
          errors.push(`Row ${index + 1}: Marksheet not found`);
          continue;
        }

        // Update marks (similar to function 2)
        // ... mark entry logic ...

        results.push({
          rowNumber: index + 1,
          studentId: record.studentId,
          status: "success"
        });
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Processed ${results.length} records, ${errors.length} errors`,
      data: {
        successful: results.length,
        failed: errors.length,
        errors,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 4: Get marksheet statistics
export const getMarksheetStats = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schoolId = req.admin.school._id || req.admin.school;

    const marksheets = await Marksheet.find({
      examSchedule: scheduleId,
      school: schoolId,
      status: { $in: ["submitted", "verified", "published"] }
    });

    if (marksheets.length === 0) {
      return res.status(200).json({
        success: true,
        data: { message: "No marksheets found" }
      });
    }

    // Calculate statistics
    const stats = {
      totalMarksheets: marksheets.length,
      averagePercentage: 0,
      toppers: [],
      failedStudents: [],
      passFailRatio: { pass: 0, fail: 0 },
      subjectWiseStats: {}
    };

    // Average percentage
    const totalPercentage = marksheets.reduce((sum, m) => sum + m.percentage, 0);
    stats.averagePercentage = (totalPercentage / marksheets.length).toFixed(2);

    // Toppers
    stats.toppers = marksheets
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5)
      .map(m => ({
        studentId: m.student,
        percentage: m.percentage,
        grade: m.overallGrade
      }));

    // Failed students
    stats.failedStudents = marksheets
      .filter(m => !m.isPass)
      .map(m => ({
        studentId: m.student,
        percentage: m.percentage,
        failedSubjects: m.subjectMarks.filter(s => !s.isPass).length
      }));

    stats.passFailRatio = {
      pass: marksheets.filter(m => m.isPass).length,
      fail: marksheets.filter(m => !m.isPass).length
    };

    // Subject-wise stats
    const subjectMap = new Map();
    marksheets.forEach(marksheet => {
      marksheet.subjectMarks.forEach(subMark => {
        if (!subjectMap.has(subMark.subject.toString())) {
          subjectMap.set(subMark.subject.toString(), {
            subject: subMark.subject,
            marks: [],
            passCount: 0
          });
        }
        const subStat = subjectMap.get(subMark.subject.toString());
        subStat.marks.push(subMark.totalMarks);
        if (subMark.isPass) subStat.passCount++;
      });
    });

    subjectMap.forEach((value, key) => {
      const marks = value.marks;
      stats.subjectWiseStats[key] = {
        average: (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2),
        highest: Math.max(...marks),
        lowest: Math.min(...marks),
        passPercentage: (value.passCount / marks.length) * 100
      };
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 5: Subject-wise performance
export const getSubjectPerformance = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { subjectId } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const filter = {
      examSchedule: scheduleId,
      school: schoolId,
      status: { $in: ["submitted", "verified", "published"] }
    };

    const marksheets = await Marksheet.find(filter)
      .populate("subjectMarks.subject");

    const performance = [];

    if (subjectId) {
      // Single subject analysis
      const subjectMarks = [];
      marksheets.forEach(m => {
        const subMark = m.subjectMarks.find(s => s.subject._id.toString() === subjectId);
        if (subMark) subjectMarks.push(subMark);
      });

      const passCount = subjectMarks.filter(s => s.isPass).length;
      const failCount = subjectMarks.filter(s => !s.isPass).length;

      return res.status(200).json({
        success: true,
        data: {
          subject: subjectId,
          totalStudents: subjectMarks.length,
          average: (subjectMarks.reduce((sum, s) => sum + s.totalMarks, 0) / subjectMarks.length).toFixed(2),
          highest: Math.max(...subjectMarks.map(s => s.totalMarks)),
          lowest: Math.min(...subjectMarks.map(s => s.totalMarks)),
          passCount,
          failCount,
          passPercentage: ((passCount / subjectMarks.length) * 100).toFixed(2)
        }
      });
    }

    // All subjects
    const subjectStats = new Map();
    marksheets.forEach(marksheet => {
      marksheet.subjectMarks.forEach(subMark => {
        const key = subMark.subject._id.toString();
        if (!subjectStats.has(key)) {
          subjectStats.set(key, {
            subjectId: subMark.subject._id,
            subjectName: subMark.subject.subjectName,
            marks: [],
            passCount: 0
          });
        }
        const stat = subjectStats.get(key);
        stat.marks.push(subMark.totalMarks);
        if (subMark.isPass) stat.passCount++;
      });
    });

    subjectStats.forEach((stat, key) => {
      performance.push({
        subject: stat.subjectName,
        totalStudents: stat.marks.length,
        average: (stat.marks.reduce((a, b) => a + b) / stat.marks.length).toFixed(2),
        highest: Math.max(...stat.marks),
        lowest: Math.min(...stat.marks),
        passPercentage: ((stat.passCount / stat.marks.length) * 100).toFixed(2)
      });
    });

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 6: Student progress report
export const getStudentProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const marksheets = await Marksheet.find({
      student: studentId,
      school: schoolId,
      academicYear,
      status: "published"
    })
      .populate("examSchedule", "examStructure")
      .populate({
        path: "examSchedule",
        populate: { path: "examStructure", select: "examName examType" }
      })
      .sort({ createdAt: 1 });

    const progressData = marksheets.map(m => ({
      exam: m.examSchedule.examStructure.examName,
      examType: m.examSchedule.examStructure.examType,
      percentage: m.percentage,
      grade: m.overallGrade,
      isPass: m.isPass,
      date: m.submittedAt
    }));

    // Calculate trend
    let trend = "stable";
    if (progressData.length >= 2) {
      const recent = progressData[progressData.length - 1].percentage;
      const previous = progressData[progressData.length - 2].percentage;
      if (recent > previous + 5) trend = "improving";
      else if (recent < previous - 5) trend = "declining";
    }

    res.status(200).json({
      success: true,
      data: {
        studentId,
        academicYear,
        progress: progressData,
        trend,
        overallAverage: (progressData.reduce((sum, p) => sum + p.percentage, 0) / progressData.length).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 7: Recheck request management
export const createRecheckRequest = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    const { reason } = req.body;

    const marksheet = await Marksheet.findById(marksheetId);
    if (!marksheet) {
      return res.status(404).json({
        success: false,
        message: "Marksheet not found"
      });
    }

    // Create recheck request (need RecheckRequest model)
    // For now, add to marksheet
    marksheet.recheckRequested = true;
    marksheet.recheckReason = reason;
    marksheet.recheckRequestedAt = new Date();
    await marksheet.save();

    res.status(201).json({
      success: true,
      message: "Recheck request submitted successfully",
      data: marksheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### File 10: Update `routes/admin/examRoutes.js`

**Add New Routes:**

```javascript
// Add routes for marksheet functions
router.post("/marksheet/create", createMarksheets);
router.put("/marksheet/:marksheetId", updateMarksEntry);
router.post("/marksheet/bulk-upload", upload.single("file"), bulkMarkUpload);

router.get("/marksheet/stats/:scheduleId", getMarksheetStats);
router.get("/subject-performance/:scheduleId", getSubjectPerformance);
router.get("/student-progress/:studentId", getStudentProgress);

router.post("/marksheet/:marksheetId/recheck-request", createRecheckRequest);
```

---

## PART 5: REPORT CARD GENERATION

### File 11: Create `controllers/admin/reportCardController.js`

**Functions to Implement (5 total):**

```javascript
import ReportCard from "../../models/academic/reportCard.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import { calculateGrade, calculateCGPA, calculateRanking } from "../../utils/academicsUtils.js";

// Function 1: Generate report card
export const generateReportCard = async (req, res) => {
  try {
    const { studentId, academicYear, term, examScheduleIds } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    // Fetch marksheets for all exams
    const marksheets = await Marksheet.find({
      _id: { $in: examScheduleIds },
      student: studentId,
      school: schoolId,
      status: "published"
    });

    if (marksheets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No published marksheets found for this student"
      });
    }

    // Calculate weighted scores
    const examSummaries = marksheets.map(m => ({
      examStructure: m.examStructure,
      marksheet: m._id,
      examName: m.examName || "Exam",
      totalMarksObtained: m.totalMarksObtained,
      totalMaxMarks: m.totalMaxMarks,
      percentage: m.percentage,
      weightagePercentage: 100 / marksheets.length,
      weightedScore: (m.percentage * (100 / marksheets.length)) / 100,
      isPass: m.isPass
    }));

    // Calculate final aggregates
    const finalPercentage = examSummaries.reduce((sum, e) => sum + e.percentage, 0) / examSummaries.length;
    const finalCGPA = calculateCGPA(finalPercentage);
    const finalGrade = calculateGrade(finalPercentage * 10, 1000);

    // Calculate ranking
    const allReportCards = await ReportCard.find({
      school: schoolId,
      academicYear,
      term,
      status: "published"
    }).sort({ finalPercentage: -1 });

    const classRank = allReportCards.findIndex(r => r.student.toString() === studentId) + 1;

    // Create report card
    const reportCard = await ReportCard.create({
      organization: req.admin.organization,
      school: schoolId,
      student: studentId,
      academicYear,
      term,
      examSummaries,
      finalPercentage: finalPercentage.toFixed(2),
      finalCGPA: finalCGPA.toFixed(2),
      finalGrade,
      classRank,
      status: "draft",
      createdBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: "Report card generated successfully",
      data: reportCard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 2: Get report card
export const getReportCard = async (req, res) => {
  try {
    const { studentId, academicYear } = req.params;
    const { term } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const filter = {
      student: studentId,
      school: schoolId,
      academicYear
    };

    if (term) filter.term = term;

    const reportCards = await ReportCard.find(filter)
      .populate("student", "name rollNumber")
      .populate("examSummaries.marksheet")
      .sort({ term: 1 });

    res.status(200).json({
      success: true,
      data: reportCards
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 3: Download report card (PDF)
export const downloadReportCard = async (req, res) => {
  try {
    const { reportCardId } = req.params;
    const { format } = req.query; // pdf, html

    const reportCard = await ReportCard.findById(reportCardId)
      .populate("student")
      .populate("examSummaries.marksheet");

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        message: "Report card not found"
      });
    }

    if (format === "pdf") {
      const PDFDocument = require("pdfkit");
      const fs = require("fs");

      const doc = new PDFDocument();
      const filename = `reportcard-${reportCard.student.name}-${Date.now()}.pdf`;

      // Generate PDF content
      doc.fontSize(20).text("Report Card", { align: "center" });
      doc.fontSize(12).text(`Student: ${reportCard.student.name}`);
      doc.text(`Academic Year: ${reportCard.academicYear}`);
      // ... add more content ...

      doc.pipe(res);
      doc.end();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      // Return HTML
      res.status(200).json({
        success: true,
        data: reportCard,
        message: "Report card data fetched for HTML rendering"
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 4: Class analytics
export const getClassReportCardAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, term } = req.query;
    const schoolId = req.admin.school._id || req.admin.school;

    const reportCards = await ReportCard.find({
      school: schoolId,
      academicYear,
      term,
      status: "published"
    });

    if (reportCards.length === 0) {
      return res.status(200).json({
        success: true,
        data: { message: "No report cards found" }
      });
    }

    // Analytics
    const analytics = {
      totalStudents: reportCards.length,
      classAverage: (reportCards.reduce((sum, r) => sum + parseFloat(r.finalPercentage), 0) / reportCards.length).toFixed(2),
      toppers: reportCards
        .sort((a, b) => parseFloat(b.finalPercentage) - parseFloat(a.finalPercentage))
        .slice(0, 5),
      failedStudents: reportCards.filter(r => !r.examSummaries.some(e => !e.isPass)),
      gradeDistribution: {
        "A+": reportCards.filter(r => r.finalGrade === "A+").length,
        "A": reportCards.filter(r => r.finalGrade === "A").length,
        "B": reportCards.filter(r => r.finalGrade === "B").length,
        "C": reportCards.filter(r => r.finalGrade === "C").length,
        "D": reportCards.filter(r => r.finalGrade === "D").length,
        "F": reportCards.filter(r => r.finalGrade === "F").length
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function 5: Bulk report card generation
export const bulkGenerateReportCards = async (req, res) => {
  try {
    const { classId, academicYear, term, examScheduleIds } = req.body;
    const schoolId = req.admin.school._id || req.admin.school;

    const Class = mongoose.model('Classes');
    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const students = classData.students || [];
    const results = [];
    const errors = [];

    for (const studentId of students) {
      try {
        const marksheets = await Marksheet.find({
          _id: { $in: examScheduleIds },
          student: studentId,
          status: "published"
        });

        if (marksheets.length === 0) {
          errors.push(`Student ${studentId}: No published marksheets found`);
          continue;
        }

        // Generate report card (simplified)
        const examSummaries = marksheets.map(m => ({
          examStructure: m.examStructure,
          marksheet: m._id,
          percentage: m.percentage,
          isPass: m.isPass
        }));

        const finalPercentage = examSummaries.reduce((sum, e) => sum + e.percentage, 0) / examSummaries.length;

        const reportCard = await ReportCard.create({
          organization: req.admin.organization,
          school: schoolId,
          student: studentId,
          academicYear,
          term,
          examSummaries,
          finalPercentage: finalPercentage.toFixed(2),
          status: "draft",
          createdBy: req.admin._id
        });

        results.push({
          studentId,
          reportCardId: reportCard._id,
          status: "success"
        });
      } catch (error) {
        errors.push(`Student ${studentId}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Generated ${results.length} report cards, ${errors.length} errors`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### File 12: Create `routes/admin/reportCardRoutes.js`

```javascript
import express from "express";
import {
  generateReportCard,
  getReportCard,
  downloadReportCard,
  getClassReportCardAnalytics,
  bulkGenerateReportCards
} from "../../controllers/admin/reportCardController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("admin"));

router.post("/generate", generateReportCard);
router.post("/bulk-generate", bulkGenerateReportCards);

router.get("/:studentId/:academicYear", getReportCard);
router.get("/:reportCardId/download", downloadReportCard);

router.get("/class/:classId/analytics", getClassReportCardAnalytics);

export default router;
```

---

## PART 6: HELPER FUNCTIONS & UTILITIES

### File 13: Update/Create `utils/academicsUtils.js`

**Add Calculation Functions:**

```javascript
// Grade calculation based on percentage
export const calculateGrade = (percentage, maxScore = 100) => {
  const scorePercentage = (percentage / maxScore) * 100;

  if (scorePercentage >= 90) return "A+";
  if (scorePercentage >= 80) return "A";
  if (scorePercentage >= 70) return "B";
  if (scorePercentage >= 60) return "C";
  if (scorePercentage >= 50) return "D";
  return "F";
};

// CGPA calculation
export const calculateCGPA = (percentage) => {
  // Convert percentage to CGPA (0-4 scale)
  return (percentage / 25).toFixed(2);
};

// Grade point calculation
export const calculateGradePoint = (marks, maxMarks) => {
  const percentage = (marks / maxMarks) * 100;
  const grade = calculateGrade(percentage);

  const gradePoints = {
    "A+": 4.0,
    "A": 3.7,
    "B": 3.0,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0
  };

  return gradePoints[grade] || 0;
};

// Calculate ranking
export const calculateRanking = (percentage, allPercentages) => {
  const sortedPercentages = allPercentages.sort((a, b) => b - a);
  return sortedPercentages.indexOf(percentage) + 1;
};

// Validate marks
export const validateMarks = (marks, maxMarks, passingMarks) => {
  const errors = [];

  if (marks < 0 || marks > maxMarks) {
    errors.push(`Marks must be between 0 and ${maxMarks}`);
  }

  if (passingMarks >= maxMarks) {
    errors.push("Passing marks cannot be greater than or equal to max marks");
  }

  return errors;
};

// Check time overlap
export const timeRangesOverlap = (start1, end1, start2, end2) => {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  return toMinutes(start1) < toMinutes(end2) &&
         toMinutes(start2) < toMinutes(end1);
};

// Generate admit card number
export const generateAdmitCardNumber = (examCode, studentRollNumber) => {
  return `${examCode}-${String(studentRollNumber).padStart(4, '0')}-${Date.now()}`;
};
```

---

## PART 7: ROUTE INTEGRATION

### File 14: Update `server.js`

**Add New Routes:**

```javascript
// Add these imports
import attendanceRoutes from './routes/admin/attendanceRoutes.js';
import timetableRoutes from './routes/admin/timetableRoutes.js';
import reportCardRoutes from './routes/admin/reportCardRoutes.js';

// Add these route mounts (after existing admin routes)
app.use("/api/admin/attendance", attendanceRoutes);
app.use("/api/admin/timetable", timetableRoutes);
app.use("/api/admin/report-card", reportCardRoutes);
```

---

## IMPLEMENTATION SEQUENCE & CHECKLIST

### Week 1: Foundational APIs
- [ ] Create `attendanceController.js` (6 functions)
- [ ] Create `attendanceRoutes.js`
- [ ] Add attendance utilities
- [ ] Test all 6 endpoints

### Week 2: Infrastructure APIs
- [ ] Create `timetableController.js` (6 functions)
- [ ] Create `timetableRoutes.js`
- [ ] Add timetable utilities
- [ ] Test all 6 endpoints

### Week 3: Academic Entry APIs
- [ ] Extend `examController.js` (add 10 functions)
- [ ] Update `examRoutes.js`
- [ ] Create `reportCardController.js` (5 functions)
- [ ] Create `reportCardRoutes.js`
- [ ] Test all new endpoints

### Week 4: Polish & Testing
- [ ] Add error handling globally
- [ ] Add validation middleware
- [ ] Test bulk operations
- [ ] Test data export
- [ ] API documentation

---

## VALIDATION CHECKLIST

### Before Marking Complete
- [ ] All endpoints return proper status codes
- [ ] All inputs validated
- [ ] All responses follow standard format
- [ ] Error messages are descriptive
- [ ] Database queries optimized
- [ ] Authorization checks in place
- [ ] Edge cases handled
- [ ] Bulk operations tested
- [ ] CSV upload tested
- [ ] PDF generation working

---

## DATABASE INDEXES NEEDED

```javascript
// Attendance indexes
db.attendances.createIndex({ school: 1, date: -1 });
db.attendances.createIndex({ class: 1, date: -1, section: 1 });
db.attendances.createIndex({ student: 1, date: -1 });

// Marksheet indexes
db.marksheets.createIndex({ student: 1, academicYear: 1 });
db.marksheets.createIndex({ examSchedule: 1, status: 1 });
db.marksheets.createIndex({ school: 1, academicYear: 1, status: 1 });

// Report card indexes
db.reportcards.createIndex({ student: 1, academicYear: 1, term: 1 });
db.reportcards.createIndex({ school: 1, academicYear: 1, term: 1 });

// Timetable indexes
db.timetables.createIndex({ class: 1, section: 1, isActive: 1 });
db.timetables.createIndex({ school: 1, academicYear: 1 });
```

---

## TESTING CURL COMMANDS (Examples)

```bash
# Mark attendance
curl -X POST http://localhost:5000/api/admin/attendance/mark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "classId": "CLASS_ID",
    "date": "2026-04-30",
    "entries": [
      {"studentId": "STU_1", "status": "present"},
      {"studentId": "STU_2", "status": "absent"}
    ]
  }'

# Get attendance report
curl -X GET 'http://localhost:5000/api/admin/attendance/report?classId=CLASS_ID&fromDate=2026-04-01&toDate=2026-04-30' \
  -H "Authorization: Bearer TOKEN"

# Update marks
curl -X PUT http://localhost:5000/api/admin/exams/marksheet/MARKSHEET_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "subjectMarks": [
      {
        "subject": "SUBJECT_ID",
        "theoryMarks": 80,
        "practicalMarks": 10,
        "internalMarks": 5
      }
    ]
  }'

# Generate report card
curl -X POST http://localhost:5000/api/admin/report-card/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "studentId": "STU_1",
    "academicYear": "2025-2026",
    "term": "term1",
    "examScheduleIds": ["EXAM_ID_1", "EXAM_ID_2"]
  }'
```

---

## NOTES
- All timestamps use Date.now()
- All IDs are MongoDB ObjectIds
- Populate relations for better response
- Implement pagination for list endpoints
- Add sorting options
- Log all sensitive operations for audit
- Consider caching for frequently accessed data

---

**End of Detailed Work Document**
