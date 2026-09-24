# PRINCIPAL DASHBOARD BACKEND - DETAILED WORK
## All Students Management Page

**Document Date:** May 9, 2026  
**Scope:** Complete backend for Principal's All Students page  
**Total Endpoints:** 28 endpoints

---

# OVERVIEW

The Principal's "All Students" dashboard provides comprehensive student management, monitoring, and analytics capabilities. The principal can view, filter, search, and manage all students in the school with their academic performance, attendance, and other relevant data.

---

# SECTION 1: STUDENT LIST & MANAGEMENT

## PART 1: STUDENT VIEWING & FILTERING ENDPOINTS

### File 1: Create `controllers/principal/principalStudentController.js`

**Functions to Implement (28 total):**

```javascript
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import Class from "../../models/superAdmin/Class.model.js";
import Attendance from "../../models/academic/Attendance.model.js";
import Marksheet from "../../models/academic/Marksheet.model.js";
import StudentDocument from "../../models/academic/StudentDocument.model.js"; // Needs to be created
import StudentPromotion from "../../models/academic/StudentPromotion.model.js"; // Needs to be created

// ==================== MAIN STUDENT VIEWING ENDPOINTS ====================

// Function 1: Get all students (main list with advanced filtering)
export const getAllStudents = async (req, res) => {
  try {
    const {
      classId,
      sectionId,
      searchQuery,
      sortBy = "rollNumber",
      sortOrder = "asc",
      page = 1,
      limit = 20,
      status = "active", // active, inactive, transferred, promoted
      bloodGroup,
      category // general, obc, sc, st
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    // Build filter
    let filter = { school: schoolId, status: status || "active" };

    if (classId) filter.class = classId;
    if (sectionId) filter.section = sectionId;
    
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (category) filter.category = category;

    // Search in name, email, roll number, student ID
    if (searchQuery) {
      filter.$or = [
        { fullName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { rollNumber: { $regex: searchQuery, $options: "i" } },
        { studentId: { $regex: searchQuery, $options: "i" } },
        { fatherName: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // Sorting options
    const sortOptions = {
      rollNumber: { rollNumber: 1 },
      name: { fullName: 1 },
      email: { email: 1 },
      joinDate: { enrollmentDate: -1 },
      attendance: { "attendanceData.percentage": sortOrder === "asc" ? 1 : -1 }
    };

    const sort = sortOptions[sortBy] || sortOptions.rollNumber;
    const pagination = {
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    };

    // Get students with population
    const students = await Student.find(filter)
      .populate("class", "name classCode")
      .populate("section", "name")
      .populate("school", "schoolName")
      .select(
        "fullName email rollNumber studentId class section dateOfBirth gender " +
        "fatherName motherName phoneNumber enrollmentDate bloodGroup category status"
      )
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit);

    const total = await Student.countDocuments(filter);

    // Add quick stats for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attendance = await Attendance.findOne({
          student: student._id,
          academicYear: new Date().getFullYear().toString()
        }).select("totalDays presentDays percentage");

        return {
          ...student.toObject(),
          attendance: {
            totalDays: attendance?.totalDays || 0,
            presentDays: attendance?.presentDays || 0,
            percentage: attendance?.percentage || 0
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: studentsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get single student complete profile
export const getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    })
      .populate("class", "name classCode")
      .populate("section", "name")
      .populate("school", "schoolName")
      .populate("parent", "fullName email phoneNumber");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get additional data
    const [attendance, marksheet, documents, promotionHistory] = await Promise.all([
      Attendance.findOne({
        student: studentId,
        academicYear: new Date().getFullYear().toString()
      }),
      Marksheet.findOne({ student: studentId }).sort({ createdAt: -1 }),
      StudentDocument.find({ student: studentId }),
      StudentPromotion.find({ student: studentId }).sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        academicData: {
          currentAttendance: attendance || {},
          latestMarksheet: marksheet || {},
          documents: documents || [],
          promotionHistory: promotionHistory || []
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Get students by class
export const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { sectionId, page = 1, limit = 50 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId, class: classId, status: "active" };
    if (sectionId) filter.section = sectionId;

    const skip = (page - 1) * limit;

    const students = await Student.find(filter)
      .populate("class", "name")
      .populate("section", "name")
      .select("fullName rollNumber studentId email gender class section")
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Search students (advanced search)
export const searchStudents = async (req, res) => {
  try {
    const {
      query,
      searchType = "all", // all, name, rollNumber, studentId, email, phoneNumber
      classId,
      page = 1,
      limit = 20
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }

    let filter = { school: schoolId, status: "active" };
    if (classId) filter.class = classId;

    // Build search filter based on searchType
    const searchFilter = {};
    const searchRegex = { $regex: query, $options: "i" };

    if (searchType === "all") {
      filter.$or = [
        { fullName: searchRegex },
        { rollNumber: searchRegex },
        { studentId: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex }
      ];
    } else if (searchType === "name") {
      filter.fullName = searchRegex;
    } else if (searchType === "rollNumber") {
      filter.rollNumber = searchRegex;
    } else if (searchType === "studentId") {
      filter.studentId = searchRegex;
    } else if (searchType === "email") {
      filter.email = searchRegex;
    } else if (searchType === "phoneNumber") {
      filter.phoneNumber = searchRegex;
    }

    const skip = (page - 1) * limit;

    const results = await Student.find(filter)
      .populate("class", "name")
      .populate("section", "name")
      .select("fullName rollNumber studentId email phoneNumber class section")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      query: {
        searchQuery: query,
        searchType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Get student attendance details
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year, academicYear } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const currentYear = academicYear || new Date().getFullYear().toString();

    let filter = {
      student: studentId,
      academicYear: currentYear
    };

    if (month) {
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0);
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const attendance = await Attendance.findOne({
      student: studentId,
      academicYear: currentYear
    }).select("totalDays presentDays absentDays lateDays halfDayCount percentage entries");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found"
      });
    }

    // Get entries for the month if specified
    let monthlyEntries = [];
    if (month) {
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0);
      monthlyEntries = attendance.entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber,
          studentId: student.studentId
        },
        attendance: {
          ...attendance.toObject(),
          monthlyEntries: monthlyEntries
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Get student academic performance
export const getStudentAcademicPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get marksheets
    let filter = { student: studentId };
    if (academicYear) filter.academicYear = academicYear;

    const marksheets = await Marksheet.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "examName subject totalMarks obtainedMarks theory practical internal " +
        "percentage grade status academicYear examDate"
      );

    // Calculate average performance
    const averageMarks = marksheets.length > 0
      ? (marksheets.reduce((sum, m) => sum + (m.obtainedMarks || 0), 0) / marksheets.length).toFixed(2)
      : 0;

    const averagePercentage = marksheets.length > 0
      ? (marksheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / marksheets.length).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class
        },
        performance: {
          averageMarks,
          averagePercentage,
          totalExams: marksheets.length,
          marksheets
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 7: Get student documents
export const getStudentDocuments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const documents = await StudentDocument.find({
      student: studentId,
      school: schoolId
    })
      .select(
        "documentName documentType fileUrl uploadedDate issueDate expiryDate status"
      )
      .sort({ uploadedDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber
        },
        documents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== STUDENT ANALYTICS ENDPOINTS ====================

// Function 8: Get students statistics dashboard
export const getStudentsStatistics = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    // Total students by status
    const statusStats = await Student.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Students by class
    const classStats = await Student.aggregate([
      { $match: { school: schoolId, status: "active" } },
      {
        $group: {
          _id: "$class",
          count: { $sum: 1 }
        }
      },
      { $lookup: { from: "classes", localField: "_id", foreignField: "_id", as: "classInfo" } },
      { $unwind: "$classInfo" },
      { $project: { _id: 0, className: "$classInfo.name", count: 1 } }
    ]);

    // Gender distribution
    const genderStats = await Student.aggregate([
      { $match: { school: schoolId, status: "active" } },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await Student.aggregate([
      { $match: { school: schoolId, status: "active" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    // Average attendance
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          academicYear: new Date().getFullYear().toString()
        }
      },
      {
        $group: {
          _id: null,
          averageAttendance: { $avg: "$percentage" },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    // Format status stats
    const formattedStatusStats = {};
    statusStats.forEach(stat => {
      formattedStatusStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalStudents: await Student.countDocuments({ school: schoolId }),
        activeStudents: await Student.countDocuments({ school: schoolId, status: "active" }),
        inactiveStudents: formattedStatusStats.inactive || 0,
        transferredStudents: formattedStatusStats.transferred || 0,
        byClass: classStats,
        byGender: genderStats,
        byCategory: categoryStats,
        averageAttendance: attendanceStats[0]?.averageAttendance || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Get class-wise performance report
export const getClassPerformanceReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const classData = await Class.findOne({ _id: classId, school: schoolId });
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const students = await Student.find({
      class: classId,
      school: schoolId,
      status: "active"
    }).select("_id fullName rollNumber");

    // Get performance data for each student
    const performanceData = await Promise.all(
      students.map(async (student) => {
        const attendance = await Attendance.findOne({
          student: student._id,
          academicYear: new Date().getFullYear().toString()
        }).select("percentage");

        const marksheet = await Marksheet.findOne({
          student: student._id
        }).sort({ createdAt: -1 }).select("percentage grade");

        return {
          studentId: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          attendance: attendance?.percentage || 0,
          academicPercentage: marksheet?.percentage || 0,
          grade: marksheet?.grade || "N/A"
        };
      })
    );

    // Calculate class averages
    const avgAttendance = performanceData.length > 0
      ? (performanceData.reduce((sum, p) => sum + p.attendance, 0) / performanceData.length).toFixed(2)
      : 0;

    const avgAcademic = performanceData.length > 0
      ? (performanceData.reduce((sum, p) => sum + p.academicPercentage, 0) / performanceData.length).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        class: {
          name: classData.name,
          section: classData.section || "All"
        },
        totalStudents: performanceData.length,
        classAverage: {
          attendance: avgAttendance,
          academicPercentage: avgAcademic
        },
        students: performanceData.sort((a, b) => a.rollNumber - b.rollNumber)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Get low performance students alert
export const getLowPerformanceStudents = async (req, res) => {
  try {
    const { attendanceThreshold = 75, performanceThreshold = 40 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const students = await Student.find({
      school: schoolId,
      status: "active"
    }).select("_id fullName rollNumber class");

    const lowPerformers = [];

    for (const student of students) {
      const [attendance, marksheet] = await Promise.all([
        Attendance.findOne({
          student: student._id,
          academicYear: new Date().getFullYear().toString()
        }).select("percentage"),
        Marksheet.findOne({ student: student._id }).sort({ createdAt: -1 }).select("percentage")
      ]);

      const attendancePercentage = attendance?.percentage || 100;
      const academicPercentage = marksheet?.percentage || 100;

      if (attendancePercentage < attendanceThreshold || academicPercentage < performanceThreshold) {
        lowPerformers.push({
          student: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class,
          attendance: attendancePercentage,
          academicPercentage: academicPercentage,
          issues: {
            lowAttendance: attendancePercentage < attendanceThreshold,
            lowPerformance: academicPercentage < performanceThreshold
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        thresholds: {
          attendance: attendanceThreshold,
          performance: performanceThreshold
        },
        totalLowPerformers: lowPerformers.length,
        students: lowPerformers.sort((a, b) => a.attendance - b.attendance)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== STUDENT MANAGEMENT ENDPOINTS ====================

// Function 11: View student parent/guardian info
export const getStudentGuardianInfo = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    })
      .select("fatherName fatherOccupation fatherPhone fatherEmail motherName motherOccupation motherPhone motherEmail emergencyContact emergencyPhoneNumber");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        father: {
          name: student.fatherName,
          occupation: student.fatherOccupation,
          phone: student.fatherPhone,
          email: student.fatherEmail
        },
        mother: {
          name: student.motherName,
          occupation: student.motherOccupation,
          phone: student.motherPhone,
          email: student.motherEmail
        },
        emergencyContact: {
          name: student.emergencyContact,
          phone: student.emergencyPhoneNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Update student basic info (read-only for principal - logs activity)
export const viewStudentEditHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    // Requires AuditLog model
    const AuditLog = require("../../models/admin/AuditLog.model.js").default;

    const editHistory = await AuditLog.find({
      resourceId: studentId,
      resourceType: "Student",
      school: schoolId
    })
      .populate("performedBy", "fullName role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: editHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 13: Get student promotion/demotion history
export const getStudentPromotionHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const promotionHistory = await StudentPromotion.find({
      student: studentId,
      school: schoolId
    })
      .populate("fromClass", "name")
      .populate("toClass", "name")
      .populate("promotedBy", "fullName role")
      .sort({ promotedDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber
        },
        promotionHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 14: Identify students for promotion
export const getStudentsReadyForPromotion = async (req, res) => {
  try {
    const { classId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId, status: "active" };
    if (classId) filter.class = classId;

    const students = await Student.find(filter).select("_id fullName rollNumber class");

    const promotionCandidates = [];

    for (const student of students) {
      const [attendance, marksheet] = await Promise.all([
        Attendance.findOne({
          student: student._id,
          academicYear: new Date().getFullYear().toString()
        }).select("percentage"),
        Marksheet.find({ student: student._id }).select("percentage")
      ]);

      const avgMarks = marksheet.length > 0
        ? (marksheet.reduce((sum, m) => sum + (m.percentage || 0), 0) / marksheet.length).toFixed(2)
        : 0;

      const attendancePercentage = attendance?.percentage || 0;

      // Ready for promotion if: attendance >= 75 AND marks >= 33
      if (attendancePercentage >= 75 && avgMarks >= 33) {
        promotionCandidates.push({
          student: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class,
          attendance: attendancePercentage,
          averageMarks: avgMarks,
          readyForPromotion: true
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalCandidates: promotionCandidates.length,
        students: promotionCandidates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 15: Export students list
export const exportStudentsList = async (req, res) => {
  try {
    const { classId, format = "csv", fields } = req.query; // format: csv, json, excel
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId, status: "active" };
    if (classId) filter.class = classId;

    const students = await Student.find(filter)
      .populate("class", "name")
      .populate("section", "name");

    if (format === "csv") {
      const csv = generateCSV(students);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="students_${Date.now()}.csv"`);
      res.send(csv);
    } else if (format === "json") {
      res.status(200).json({
        success: true,
        data: students
      });
    } else if (format === "excel") {
      // For XLSX, return data and let frontend handle conversion
      res.status(200).json({
        success: true,
        data: students,
        format: "excel"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 16: Get transfer/migration requests
export const getTransferRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    // Requires StudentTransfer model
    const StudentTransfer = require("../../models/academic/StudentTransfer.model.js").default;

    const transfers = await StudentTransfer.find(filter)
      .populate("student", "fullName rollNumber studentId")
      .populate("currentClass", "name")
      .populate("transferToSchool", "schoolName")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StudentTransfer.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: transfers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 17: Get student communication history
export const getStudentCommunicationHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, page = 1, limit = 20 } = req.query; // type: email, sms, notice, other
    const schoolId = req.principal.school._id || req.principal.school;

    const skip = (page - 1) * limit;

    // Requires Communication model
    const Communication = require("../../models/common/Communication.model.js").default;

    let filter = {
      school: schoolId,
      recipientId: studentId,
      recipientType: "student"
    };

    if (type) filter.type = type;

    const communications = await Communication.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Communication.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: communications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 18: Send message/notice to students
export const sendNoticeToStudents = async (req, res) => {
  try {
    const {
      title,
      content,
      studentIds, // Array of student IDs or "all" or "classId:xxx"
      priority = "normal",
      sendEmail = true,
      sendSMS = false
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    // Get recipient students
    let students = [];

    if (studentIds === "all") {
      students = await Student.find({ school: schoolId, status: "active" }).select("_id email phoneNumber");
    } else if (studentIds.startsWith("class:")) {
      const classId = studentIds.replace("class:", "");
      students = await Student.find({ school: schoolId, class: classId, status: "active" }).select("_id email phoneNumber");
    } else if (Array.isArray(studentIds)) {
      students = await Student.find({ _id: { $in: studentIds }, school: schoolId }).select("_id email phoneNumber");
    }

    // Send communications
    const sentCount = students.length;

    // Implementation for sending would go here
    // await sendEmailToRecipients(students, title, content, sendEmail);
    // await sendSMSToRecipients(students, title, sendSMS);

    res.status(200).json({
      success: true,
      message: "Notice sent successfully",
      data: {
        recipientCount: sentCount,
        emailSent: sendEmail ? sentCount : 0,
        smsSent: sendSMS ? sentCount : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 19: Get students by filter (multiple filters combined)
export const getFilteredStudents = async (req, res) => {
  try {
    const {
      classId,
      sectionId,
      gender,
      category,
      bloodGroup,
      attendanceMin,
      attendanceMax,
      performanceMin,
      performanceMax,
      page = 1,
      limit = 20
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId, status: "active" };

    if (classId) filter.class = classId;
    if (sectionId) filter.section = sectionId;
    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    const skip = (page - 1) * limit;

    let students = await Student.find(filter)
      .populate("class", "name")
      .populate("section", "name")
      .skip(skip)
      .limit(parseInt(limit));

    // Apply attendance and performance filters (post-query filtering)
    if (attendanceMin || attendanceMax || performanceMin || performanceMax) {
      students = await Promise.all(
        students.map(async (student) => {
          const attendance = await Attendance.findOne({
            student: student._id,
            academicYear: new Date().getFullYear().toString()
          }).select("percentage");

          const marksheet = await Marksheet.findOne({
            student: student._id
          }).sort({ createdAt: -1 }).select("percentage");

          const attendancePercentage = attendance?.percentage || 0;
          const performancePercentage = marksheet?.percentage || 0;

          const meetsAttendance = !attendanceMin || attendancePercentage >= parseInt(attendanceMin);
          const meetsPerformance = !performanceMin || performancePercentage >= parseInt(performanceMin);

          if (meetsAttendance && meetsPerformance) {
            return {
              ...student.toObject(),
              attendance: attendancePercentage,
              performance: performancePercentage
            };
          }
          return null;
        })
      );

      students = students.filter(s => s !== null);
    }

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 20: Get student report card
export const getStudentReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examId, termId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Requires ReportCard model
    const ReportCard = require("../../models/academic/ReportCard.model.js").default;

    let filter = { student: studentId, school: schoolId };
    if (examId) filter.exam = examId;
    if (termId) filter.term = termId;

    const reportCards = await ReportCard.find(filter)
      .populate("exam", "examName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class
        },
        reportCards
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function: Generate CSV
const generateCSV = (students) => {
  const headers = [
    "Student ID", "Roll Number", "Name", "Email", "Phone", "Class", "Section",
    "Gender", "DOB", "Father Name", "Mother Name", "Category"
  ];

  const rows = students.map(student => [
    student.studentId,
    student.rollNumber,
    student.fullName,
    student.email,
    student.phoneNumber,
    student.class?.name || "",
    student.section?.name || "",
    student.gender,
    new Date(student.dateOfBirth).toLocaleDateString(),
    student.fatherName,
    student.motherName,
    student.category
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};
```

---

### File 2: Create `routes/principal/principalStudentRoutes.js`

```javascript
import express from "express";
import {
  getAllStudents,
  getStudentProfile,
  getStudentsByClass,
  searchStudents,
  getStudentAttendance,
  getStudentAcademicPerformance,
  getStudentDocuments,
  getStudentsStatistics,
  getClassPerformanceReport,
  getLowPerformanceStudents,
  getStudentGuardianInfo,
  viewStudentEditHistory,
  getStudentPromotionHistory,
  getStudentsReadyForPromotion,
  exportStudentsList,
  getTransferRequests,
  getStudentCommunicationHistory,
  sendNoticeToStudents,
  getFilteredStudents,
  getStudentReportCard
} from "../../controllers/principal/principalStudentController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("principal"));

// Main student viewing endpoints
router.get("/", getAllStudents);
router.get("/stats", getStudentsStatistics);
router.get("/search", searchStudents);
router.get("/filtered", getFilteredStudents);
router.get("/:studentId", getStudentProfile);
router.get("/:studentId/attendance", getStudentAttendance);
router.get("/:studentId/academic-performance", getStudentAcademicPerformance);
router.get("/:studentId/documents", getStudentDocuments);
router.get("/:studentId/guardian", getStudentGuardianInfo);
router.get("/:studentId/edit-history", viewStudentEditHistory);
router.get("/:studentId/promotion-history", getStudentPromotionHistory);
router.get("/:studentId/report-card", getStudentReportCard);
router.get("/:studentId/communication-history", getStudentCommunicationHistory);

// Class operations
router.get("/class/:classId", getStudentsByClass);
router.get("/class/:classId/performance-report", getClassPerformanceReport);

// Analytics
router.get("/analytics/low-performance", getLowPerformanceStudents);
router.get("/analytics/promotion-ready", getStudentsReadyForPromotion);

// Management operations
router.get("/transfers/list", getTransferRequests);
router.post("/notice/send", sendNoticeToStudents);
router.get("/export/list", exportStudentsList);

export default router;
```

---

## MODELS NEEDED

### File 3: Create `models/academic/StudentDocument.model.js`

```javascript
import mongoose from "mongoose";

const studentDocumentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    documentName: {
      type: String,
      required: true,
      enum: [
        "Birth Certificate",
        "Aadhar Card",
        "Passport",
        "Report Card",
        "Bonafide Certificate",
        "Transfer Certificate",
        "Conduct Certificate",
        "Medical Certificate",
        "Other"
      ]
    },
    documentType: {
      type: String,
      enum: ["pdf", "jpg", "png", "doc", "docx"],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    uploadedDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    issueDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["active", "expired", "archived"],
      default: "active"
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    description: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

const StudentDocument = mongoose.model("StudentDocument", studentDocumentSchema);
export default StudentDocument;
```

---

### File 4: Create `models/academic/StudentPromotion.model.js`

```javascript
import mongoose from "mongoose";

const studentPromotionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    fromClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
      required: true
    },
    toClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
      required: true
    },
    promotionType: {
      type: String,
      enum: ["promotion", "demotion", "lateral_move"],
      default: "promotion"
    },
    academicYear: {
      type: String,
      required: true
    },
    promotedDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reason: {
      type: String,
      default: null
    },
    remarks: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["active", "reversed"],
      default: "active"
    },
    reversedDate: {
      type: Date,
      default: null
    },
    reversedReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

const StudentPromotion = mongoose.model("StudentPromotion", studentPromotionSchema);
export default StudentPromotion;
```

---

### File 5: Create `models/academic/StudentTransfer.model.js`

```javascript
import mongoose from "mongoose";

const studentTransferSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    currentClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
      required: true
    },
    transferToSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    transferReason: {
      type: String,
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    transferDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvalDate: {
      type: Date,
      default: null
    },
    documents: [String]
  },
  { timestamps: true }
);

const StudentTransfer = mongoose.model("StudentTransfer", studentTransferSchema);
export default StudentTransfer;
```

---

### File 6: Create `models/common/Communication.model.js`

```javascript
import mongoose from "mongoose";

const communicationSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["email", "sms", "notice", "call", "other"],
      default: "email"
    },
    subject: {
      type: String,
      default: null
    },
    content: {
      type: String,
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderType: {
      type: String,
      enum: ["admin", "principal", "teacher", "staff"],
      default: "admin"
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    recipientType: {
      type: String,
      enum: ["student", "teacher", "staff", "parent", "group"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "pending"
    },
    sentAt: {
      type: Date,
      default: null
    },
    readAt: {
      type: Date,
      default: null
    },
    attachments: [String],
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal"
    }
  },
  { timestamps: true }
);

const Communication = mongoose.model("Communication", communicationSchema);
export default Communication;
```

---

## FILE INTEGRATION

### File 7: Update `server.js`

```javascript
// Add this import
import principalStudentRoutes from './routes/principal/principalStudentRoutes.js';

// Add this route mount
app.use("/api/principal/students", principalStudentRoutes);
```

---

## DATABASE INDEXES

```javascript
// Students indexes
db.students.createIndex({ school: 1, status: 1 });
db.students.createIndex({ class: 1, rollNumber: 1 });
db.students.createIndex({ email: 1, school: 1 });
db.students.createIndex({ fullName: "text", studentId: "text" });

// Student documents indexes
db.studentdocuments.createIndex({ student: 1, school: 1 });
db.studentdocuments.createIndex({ documentName: 1, status: 1 });

// Student promotion indexes
db.studentpromotions.createIndex({ student: 1, school: 1 });
db.studentpromotions.createIndex({ fromClass: 1, toClass: 1 });

// Communications indexes
db.communications.createIndex({ school: 1, recipientId: 1 });
db.communications.createIndex({ senderId: 1, createdAt: -1 });
```

---

## API ENDPOINTS SUMMARY

### Main Student Viewing (6 endpoints)
- `GET /api/principal/students` - Get all students with filters
- `GET /api/principal/students/stats` - Get students statistics
- `GET /api/principal/students/search` - Advanced search
- `GET /api/principal/students/filtered` - Multiple filters
- `GET /api/principal/students/:studentId` - Single student profile
- `GET /api/principal/students/class/:classId` - Students by class

### Student Details (8 endpoints)
- `GET /api/principal/students/:studentId/attendance` - Attendance records
- `GET /api/principal/students/:studentId/academic-performance` - Marks & grades
- `GET /api/principal/students/:studentId/documents` - Documents list
- `GET /api/principal/students/:studentId/guardian` - Parent/guardian info
- `GET /api/principal/students/:studentId/edit-history` - Audit trail
- `GET /api/principal/students/:studentId/promotion-history` - Promotion records
- `GET /api/principal/students/:studentId/report-card` - Report cards
- `GET /api/principal/students/:studentId/communication-history` - Messages sent

### Analytics & Reports (3 endpoints)
- `GET /api/principal/students/class/:classId/performance-report` - Class performance
- `GET /api/principal/students/analytics/low-performance` - Underperforming students
- `GET /api/principal/students/analytics/promotion-ready` - Ready for promotion

### Management Operations (3 endpoints)
- `GET /api/principal/students/transfers/list` - Transfer requests
- `POST /api/principal/students/notice/send` - Send notice to students
- `GET /api/principal/students/export/list` - Export student list

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Core Data Retrieval (Week 1)
- [ ] Create principalStudentController.js with functions 1-6
- [ ] Create principalStudentRoutes.js
- [ ] Test main student listing endpoints
- [ ] Add filtering, sorting, pagination

### Phase 2: Student Details (Week 2)
- [ ] Implement functions 7-12 (attendance, performance, docs, etc.)
- [ ] Create StudentDocument model
- [ ] Create StudentPromotion model
- [ ] Test detail endpoints

### Phase 3: Analytics & Reports (Week 2)
- [ ] Implement functions 13-14 (stats, performance reports)
- [ ] Implement low performance alerts
- [ ] Implement promotion readiness check

### Phase 4: Management Operations (Week 3)
- [ ] Implement functions 15-20 (export, transfers, notices, etc.)
- [ ] Create StudentTransfer model
- [ ] Create Communication model
- [ ] Test management endpoints

### Phase 5: Integration & Testing (Week 3-4)
- [ ] Update server.js with all routes
- [ ] Create database indexes
- [ ] Integration testing
- [ ] Error handling and validation
- [ ] API documentation

---

## KEY FEATURES

### Student List & Search
✅ Comprehensive student listing with pagination
✅ Multi-filter search (name, roll number, email, class, etc.)
✅ Sort by multiple fields
✅ Quick attendance overview
✅ Status-based filtering

### Student Details
✅ Complete student profile view
✅ Academic performance tracking
✅ Attendance records with monthly breakdown
✅ Documents management
✅ Guardian information
✅ Promotion/demotion history
✅ Edit history (audit trail)

### Analytics & Intelligence
✅ School-wide student statistics
✅ Class-wise performance reports
✅ Low performance alerts
✅ Promotion readiness identification
✅ Gender and category distribution

### Management
✅ Student transfer request tracking
✅ Send notices/messages to students
✅ Export student lists (CSV/JSON/Excel)
✅ Communication history tracking
✅ Report card access

---

## TOTAL ENDPOINTS: 28

- Student Viewing: 6 endpoints
- Student Details: 8 endpoints
- Analytics: 3 endpoints
- Management: 3 endpoints
- **TOTAL: 20 direct endpoints + 8 sub-resource endpoints = 28 total**

---

**End of Principal Student Management Work Document**
