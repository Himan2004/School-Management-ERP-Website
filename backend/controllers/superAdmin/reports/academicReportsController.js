import mongoose from "mongoose";
import Marksheet from "../../../models/academic/marksheet.model.js";
import ExamStructure from "../../../models/academic/examStructure.model.js";
import ReportCard from "../../../models/academic/reportCard.model.js";
import School from "../../../models/school/School.js";
import AcademicConfig from "../../../models/organization/AcademicConfig.js";
import Class from "../../../models/organization/organizationClass.js";

// Helper functions
const getCurrentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

/**
 * GET /api/superadmin/reports/filters
 * Get filter options (branches, classes, academicYears, exams) for reports
 */
export const getReportFilters = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));

    // 1. Fetch branches safely
    const schools = await School.find({ organization: orgId })
      .select("schoolName name")
      .lean();
    const branches = [
      "All Branches",
      ...schools.map((s) => s.schoolName || s.name || "Unknown"),
    ];

    // 2. Fetch classes safely
    let classes = ["All Classes"];
    try {
      const classesDocs = await Class.find({ organization: orgId })
        .select("name numericLevel")
        .sort({ numericLevel: 1 })
        .lean();
      if (classesDocs && classesDocs.length > 0) {
        classes = ["All Classes", ...classesDocs.map((c) => c.name)];
      }
    } catch (e) {
      console.error("Error fetching Class filters:", e);
    }

    // 3. Fetch academic years and exams safely
    const configs = await AcademicConfig.find({ organization: orgId }).lean();
    const uniqueYears = new Set();
    const uniqueExams = new Set();

    const normalizeYear = (y) => {
      if (!y) return null;
      const match = y.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        return `${match[1]}-${match[2].slice(-2)}`;
      }
      return y;
    };

    configs.forEach((config) => {
      if (config.academicYear && config.academicYear.label) {
        const normalized = normalizeYear(config.academicYear.label);
        if (normalized) uniqueYears.add(normalized);
      }
      if (config.examPattern && Array.isArray(config.examPattern)) {
        config.examPattern.forEach((exam) => {
          if (exam.name) uniqueExams.add(exam.name);
        });
      }
    });

    // Populate with all available years descending
    const currentYear = new Date().getFullYear();
    const toShortYear = (year) => `${year}-${String(year + 1).slice(-2)}`;
    uniqueYears.add(toShortYear(currentYear));     // "2026-27"
    uniqueYears.add(toShortYear(currentYear - 1)); // "2025-26"
    uniqueYears.add(toShortYear(currentYear - 2)); // "2024-25"
    uniqueYears.add(toShortYear(currentYear - 3)); // "2023-24"
    uniqueYears.add(toShortYear(currentYear - 4)); // "2022-23"

    const academicYears = Array.from(uniqueYears).sort((a, b) => {
      const aStart = parseInt(a.split("-")[0]) || 0;
      const bStart = parseInt(b.split("-")[0]) || 0;
      return bStart - aStart; // Descending order
    });

    const exams =
      uniqueExams.size > 0
        ? Array.from(uniqueExams)
        : ["Annual", "Half Yearly", "Unit Test 1", "Unit Test 2"];

    const reportTypes = [
      { value: "academic", label: "Academic" },
      { value: "attendance", label: "Attendance" },
      { value: "staff", label: "Staff" },
      { value: "payroll", label: "HR" },
      { value: "financial", label: "Finance" },
      { value: "compliance", label: "Compliance" },
      { value: "audit", label: "Audit Logs" },
      { value: "admission", label: "Admissions" }
    ];

    return res.status(200).json({
      success: true,
      data: {
        branches,
        classes,
        academicYears,
        exams,
        reportTypes
      },
    });
  } catch (error) {
    console.error("Error in getReportFilters:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/kpi-summary
 */
export const getKPISummary = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();
    const schoolIds = schools.map(s => s._id);

    let query = {
      organization: orgId,
      academicYear: currentYear,
      status: "published",
      school: { $in: schoolIds }
    };

    if (selectedBranch && selectedBranch !== "All Branches") {
      const matchSchool = schools.find(s => s.schoolName === selectedBranch);
      if (matchSchool) {
        query.school = matchSchool._id;
      } else {
        query.school = new mongoose.Types.ObjectId();
      }
    }

    const marksheets = await Marksheet.find(query).select('isPass percentage school').lean();

    const totalAppeared = marksheets.length;
    const totalPass = marksheets.filter(m => m.isPass).length;
    const overallPassPercent = totalAppeared > 0 ? (totalPass / totalAppeared) * 100 : 0;

    let totalPercentage = 0;
    marksheets.forEach(m => {
      totalPercentage += m.percentage || 0;
    });
    const schoolAvg = totalAppeared > 0 ? totalPercentage / totalAppeared : 0;

    let topPerformingBranch = "-";
    if (schools.length > 0 && marksheets.length > 0) {
      const branchStats = schools.map(school => {
        const schoolMarksheets = marksheets.filter(m => String(m.school) === String(school._id));
        const appeared = schoolMarksheets.length;
        const passed = schoolMarksheets.filter(m => m.isPass).length;
        const passPercent = appeared > 0 ? (passed / appeared) * 100 : 0;
        return { name: school.schoolName, passPercent };
      });
      branchStats.sort((a, b) => b.passPercent - a.passPercent);
      if (branchStats[0] && branchStats[0].passPercent > 0) {
        topPerformingBranch = branchStats[0].name;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalAppeared,
        overallPassPercent: parseFloat(overallPassPercent.toFixed(1)),
        schoolAvg: parseFloat(schoolAvg.toFixed(1)),
        topPerformingBranch
      }
    });
  } catch (error) {
    console.error("Error in getKPISummary:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/pass-percentage-by-branch
 */
export const getPassPercentageByBranch = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();

    if (selectedBranch && selectedBranch !== "All Branches") {
      const targetSchool = schools.find(s => s.schoolName === selectedBranch);
      if (!targetSchool) {
        return res.status(200).json({ success: true, data: [] });
      }

      const years = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
      const trendData = await Promise.all(years.map(async (yr) => {
        const total = await Marksheet.countDocuments({
          organization: orgId,
          school: targetSchool._id,
          academicYear: yr,
          status: "published"
        });
        const passed = await Marksheet.countDocuments({
          organization: orgId,
          school: targetSchool._id,
          academicYear: yr,
          status: "published",
          isPass: true
        });
        const passPercent = total > 0 ? (passed / total) * 100 : 0;
        return {
          branch: yr,
          passPercent: parseFloat(passPercent.toFixed(1))
        };
      }));

      return res.status(200).json({ success: true, data: trendData });
    } else {
      const branchData = await Promise.all(schools.map(async (school) => {
        const total = await Marksheet.countDocuments({
          organization: orgId,
          school: school._id,
          academicYear: currentYear,
          status: "published"
        });
        const passed = await Marksheet.countDocuments({
          organization: orgId,
          school: school._id,
          academicYear: currentYear,
          status: "published",
          isPass: true
        });
        const passPercent = total > 0 ? (passed / total) * 100 : 0;
        return {
          branch: school.schoolName.replace("DPS ", ""),
          passPercent: parseFloat(passPercent.toFixed(1))
        };
      }));

      return res.status(200).json({ success: true, data: branchData });
    }
  } catch (error) {
    console.error("Error in getPassPercentageByBranch:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/grade-distribution
 */
export const getGradeDistribution = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();
    const schoolIds = schools.map(s => s._id);

    let query = {
      organization: orgId,
      academicYear: currentYear,
      status: "published",
      school: { $in: schoolIds }
    };

    if (selectedBranch && selectedBranch !== "All Branches") {
      const matchSchool = schools.find(s => s.schoolName === selectedBranch);
      if (matchSchool) {
        query.school = matchSchool._id;
      } else {
        query.school = new mongoose.Types.ObjectId();
      }
    }

    const marksheets = await Marksheet.find(query).select('percentage').lean();

    const counts = { "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "D": 0, "F": 0 };
    marksheets.forEach(m => {
      const pct = m.percentage || 0;
      if (pct >= 90) counts["A+"]++;
      else if (pct >= 80) counts["A"]++;
      else if (pct >= 70) counts["B+"]++;
      else if (pct >= 60) counts["B"]++;
      else if (pct >= 50) counts["C"]++;
      else if (pct >= 40) counts["D"]++;
      else counts["F"]++;
    });

    const colors = {
      "A+": "#2563eb",
      "A": "#10b981",
      "B+": "#8b5cf6",
      "B": "#f59e0b",
      "C": "#f43f5e",
      "D": "#06b6d4",
      "F": "#ef4444"
    };

    const chartData = Object.keys(counts).map(grade => ({
      name: grade,
      value: counts[grade],
      color: colors[grade] || "#cbd5e1"
    }));

    return res.status(200).json({ success: true, data: chartData });
  } catch (error) {
    console.error("Error in getGradeDistribution:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/branch-hq-comparison
 */
export const getBranchHQComparison = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();
    const schoolIds = schools.map(s => s._id);

    if (selectedBranch && selectedBranch !== "All Branches") {
      const targetSchool = schools.find(s => s.schoolName === selectedBranch);
      if (!targetSchool) {
        return res.status(200).json({ success: true, data: [] });
      }

      const years = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
      const trendData = await Promise.all(years.map(async (yr) => {
        const branchSheets = await Marksheet.find({
          organization: orgId,
          school: targetSchool._id,
          academicYear: yr,
          status: "published"
        }).select('percentage').lean();
        const branchAvg = branchSheets.length > 0
          ? branchSheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / branchSheets.length
          : 0;

        const hqSheets = await Marksheet.find({
          organization: orgId,
          school: { $in: schoolIds },
          academicYear: yr,
          status: "published"
        }).select('percentage').lean();
        const hqAvg = hqSheets.length > 0
          ? hqSheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / hqSheets.length
          : 0;

        return {
          branch: yr,
          branchAvg: parseFloat(branchAvg.toFixed(1)),
          hqAvg: parseFloat(hqAvg.toFixed(1))
        };
      }));

      return res.status(200).json({ success: true, data: trendData });
    } else {
      const branchAvgs = await Promise.all(schools.map(async (school) => {
        const sheets = await Marksheet.find({
          organization: orgId,
          school: school._id,
          academicYear: currentYear,
          status: "published"
        }).select('percentage').lean();
        const branchAvg = sheets.length > 0
          ? sheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / sheets.length
          : 0;
        return {
          branch: school.schoolName.replace("DPS ", ""),
          branchAvg: parseFloat(branchAvg.toFixed(1))
        };
      }));

      const totalAvgSum = branchAvgs.reduce((sum, b) => sum + b.branchAvg, 0);
      const hqAvg = branchAvgs.length > 0 ? totalAvgSum / branchAvgs.length : 0;

      const chartData = branchAvgs.map(b => ({
        branch: b.branch,
        branchAvg: b.branchAvg,
        hqAvg: parseFloat(hqAvg.toFixed(1))
      }));

      return res.status(200).json({ success: true, data: chartData });
    }
  } catch (error) {
    console.error("Error in getBranchHQComparison:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/class-performance
 */
export const getClassPerformance = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();
    const schoolIds = schools.map(s => s._id);

    let schoolFilter = { $in: schoolIds };
    if (selectedBranch && selectedBranch !== "All Branches") {
      const matchSchool = schools.find(s => s.schoolName === selectedBranch);
      if (matchSchool) {
        schoolFilter = matchSchool._id;
      } else {
        schoolFilter = new mongoose.Types.ObjectId();
      }
    }

    const classes = await Class.find({ organization: orgId, isActive: true }).select('name').lean();
    const classData = await Promise.all(classes.map(async (cls) => {
      const sheets = await Marksheet.find({
        organization: orgId,
        school: schoolFilter,
        academicYear: currentYear,
        class: cls._id,
        status: "published"
      }).select('percentage isPass').lean();

      const total = sheets.length;
      const passed = sheets.filter(m => m.isPass).length;
      const passPercent = total > 0 ? (passed / total) * 100 : 0;
      const avgMarks = total > 0 ? (sheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / total) : 0;

      return {
        className: cls.name,
        averagePercentage: parseFloat(avgMarks.toFixed(1)),
        passPercentage: parseFloat(passPercent.toFixed(1))
      };
    }));

    return res.status(200).json({ success: true, data: classData });
  } catch (error) {
    console.error("Error in getClassPerformance:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/branch-results
 */
export const getBranchWiseResults = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch, search, page = 1, limit = 5 } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let schoolQuery = { organization: orgId };
    if (selectedBranch && selectedBranch !== "All Branches") {
      schoolQuery.schoolName = selectedBranch;
    }
    if (search) {
      schoolQuery.schoolName = { $regex: search, $options: "i" };
    }

    const allMatchingSchools = await School.find(schoolQuery).select('_id schoolName').lean();
    const totalRecords = allMatchingSchools.length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const paginatedSchools = allMatchingSchools.slice(skip, skip + limitNum);

    const branchResults = await Promise.all(
      paginatedSchools.map(async (school) => {
        const marksheets = await Marksheet.find({
          organization: orgId,
          school: school._id,
          status: "published",
          academicYear: currentYear
        })
          .populate("student", "name")
          .lean();

        const appeared = marksheets.length;
        const passed = marksheets.filter((m) => m.isPass).length;
        const fail = appeared - passed;
        const passPercent = appeared > 0 ? (passed / appeared) * 100 : 0;
        const totalPercentage = marksheets.reduce((sum, m) => sum + (m.percentage || 0), 0);
        const averageMarks = appeared > 0 ? totalPercentage / appeared : 0;

        const sorted = [...marksheets].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        let topScorer = "-";
        if (sorted[0] && sorted[0].student) {
          topScorer = `${sorted[0].student.name} (${(sorted[0].percentage || 0).toFixed(1)}%)`;
        }

        let topGrade = "F";
        if (passPercent >= 90) topGrade = "A+";
        else if (passPercent >= 80) topGrade = "A";
        else if (passPercent >= 70) topGrade = "B+";
        else if (passPercent >= 60) topGrade = "B";
        else if (passPercent >= 50) topGrade = "C";
        else if (passPercent >= 40) topGrade = "D";

        return {
          branch: school.schoolName,
          appeared,
          pass: passed,
          fail,
          passPercent: parseFloat(passPercent.toFixed(1)),
          averageMarks: parseFloat(averageMarks.toFixed(1)),
          topScorer,
          topGrade
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        branchResults,
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    console.error("Error in getBranchWiseResults:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/academic/subject-analysis
 */
export const getSubjectWiseAnalysis = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const { academicYear, selectedBranch, search, page = 1, limit = 5 } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const schools = await School.find({ organization: orgId }).select('_id schoolName').lean();
    const schoolIds = schools.map(s => s._id);

    let schoolFilter = { $in: schoolIds };
    if (selectedBranch && selectedBranch !== "All Branches") {
      const matchSchool = schools.find(s => s.schoolName === selectedBranch);
      if (matchSchool) {
        schoolFilter = matchSchool._id;
      } else {
        schoolFilter = new mongoose.Types.ObjectId();
      }
    }

    const marksheets = await Marksheet.find({
      organization: orgId,
      school: schoolFilter,
      academicYear: currentYear,
      status: "published"
    })
      .populate("subjectMarks.subject", "name subjectName code")
      .populate("school", "schoolName")
      .lean();

    const subjectStats = {};
    marksheets.forEach((m) => {
      const branchName = m.school?.schoolName || "Unknown Branch";

      m.subjectMarks.forEach((sm) => {
        const subjId = sm.subject?._id?.toString();
        if (!subjId) return;

        const subjName = sm.subject?.name || sm.subject?.subjectName || sm.subject?.code || "Unknown Subject";

        if (!subjectStats[subjId]) {
          subjectStats[subjId] = {
            subject: subjName,
            totalObtained: 0,
            totalMax: 0,
            totalStudents: 0,
            passedStudents: 0,
            branchData: {}
          };
        }

        subjectStats[subjId].totalObtained += sm.totalMarks || 0;
        subjectStats[subjId].totalMax += sm.maxMarks || 0;
        subjectStats[subjId].totalStudents += 1;
        if (sm.isPass) subjectStats[subjId].passedStudents += 1;

        if (!subjectStats[subjId].branchData[branchName]) {
          subjectStats[subjId].branchData[branchName] = {
            totalObtained: 0,
            totalMax: 0
          };
        }
        subjectStats[subjId].branchData[branchName].totalObtained += sm.totalMarks || 0;
        subjectStats[subjId].branchData[branchName].totalMax += sm.maxMarks || 0;
      });
    });

    let allSubjects = Object.values(subjectStats);

    if (search) {
      const searchRegex = new RegExp(search, "i");
      allSubjects = allSubjects.filter(s => searchRegex.test(s.subject));
    }

    const totalRecords = allSubjects.length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const paginatedSubjects = allSubjects.slice(skip, skip + limitNum);

    const result = paginatedSubjects.map((stat) => {
      const hqAverage = stat.totalMax > 0 ? (stat.totalObtained / stat.totalMax) * 100 : 0;
      const passPercent = stat.totalStudents > 0 ? (stat.passedStudents / stat.totalStudents) * 100 : 0;

      let bestBranch = "N/A";
      let highestAvg = -1;

      Object.entries(stat.branchData).forEach(([bName, bData]) => {
        const bAvg = bData.totalMax > 0 ? (bData.totalObtained / bData.totalMax) * 100 : 0;
        if (bAvg > highestAvg) {
          highestAvg = bAvg;
          bestBranch = bName;
        }
      });

      let difficultyLevel = "Moderate";
      if (hqAverage >= 85) difficultyLevel = "Easy";
      else if (hqAverage < 60) difficultyLevel = "Difficult";

      return {
        subject: stat.subject,
        hqAverage: parseFloat(hqAverage.toFixed(1)),
        passPercent: parseFloat(passPercent.toFixed(1)),
        failCount: stat.totalStudents - stat.passedStudents,
        studentsAppeared: stat.totalStudents,
        best: bestBranch,
        difficultyLevel
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        subjectAnalysis: result,
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    console.error("Error in getSubjectWiseAnalysis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getGradeFromPercentage = (percentage) => {
  if (percentage >= 85) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 55) return "B";
  if (percentage >= 40) return "C";
  return "D";
};

export const getTopStudents = async (req, res) => {
  try {
    const orgId = req.user?.organization || req.user?._id;
    const { academicYear, limit = 10 } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const reportCards = await ReportCard.find({
      organization: orgId,
      academicYear: currentYear,
      status: "published",
    })
      .populate("student", "name")
      .populate("school", "schoolName name")
      .populate("class", "name numericLevel")
      .sort({ finalPercentage: -1 })
      .limit(parseInt(limit))
      .lean();

    const topStudents = reportCards.map((card, index) => ({
      rank: index + 1,
      name: card.student?.name || "Unknown",
      branch: card.school?.schoolName || card.school?.name || "Unknown",
      className: card.class?.name || "N/A",
      percentage: parseFloat((card.finalPercentage || 0).toFixed(1)),
      grade:
        card.finalGrade || getGradeFromPercentage(card.finalPercentage || 0),
    }));

    return res.status(200).json({
      success: true,
      data: topStudents,
    });
  } catch (error) {
    console.error("Error in getTopStudents:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBranchComparisonChart = async (req, res) => {
  try {
    const orgId = req.user?.organization || req.user?._id;
    const { academicYear } = req.query;
    const currentYear = academicYear || getCurrentAcademicYear();

    const schools = await School.find({ organization: orgId })
      .select("schoolName name")
      .lean();

    const branchData = await Promise.all(
      schools.map(async (school) => {
        const marksheets = await Marksheet.find({
          school: school._id,
          academicYear: currentYear,
          status: "published",
        })
          .select("percentage")
          .lean();

        let totalPercentage = 0;
        marksheets.forEach((m) => {
          totalPercentage += m.percentage || 0;
        });
        const averageMarks =
          marksheets.length > 0 ? totalPercentage / marksheets.length : 0;

        const safeSchoolName = school.schoolName || school.name || "Unknown";

        return {
          branch: safeSchoolName.replace("DPS ", ""),
          branchAvg: parseFloat(averageMarks.toFixed(1)),
        };
      }),
    );

    const hqAverage =
      branchData.length > 0
        ? branchData.reduce((sum, b) => sum + b.branchAvg, 0) /
          branchData.length
        : 0;

    const chartData = branchData.map((b) => ({
      branch: b.branch,
      branchAvg: b.branchAvg,
      hqAvg: parseFloat(hqAverage.toFixed(1)),
    }));

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("Error in getBranchComparisonChart:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
