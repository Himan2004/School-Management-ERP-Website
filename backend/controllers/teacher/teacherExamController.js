import mongoose from "mongoose";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Student from "../../models/users/student.model.js";
import Class from "../../models/organization/organizationClass.js";
import Subject from "../../models/modules/Subject.js";
import Teacher from "../../models/users/teacher.model.js";
import Section from "../../models/school/Section.model.js";

const calculateGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  if (percentage >= 30) return "D";
  return "E";
};

// @desc    Get comprehensive stats for the Analytics & Dashboard tab
export const getResultStats = async (req, res) => {
  try {
    const schoolId = req.user.school;

    // Find Teacher's assigned classes/sections
    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    const validClassIds = (teacherProfile?.assignedClasses || []).filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    const marksheets = await Marksheet.find({
      school: schoolId,
      class: { $in: validClassIds },
    }).populate("examSchedule");

    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;
    let passCount = 0;
    let totalToppers = 0;
    const examStatuses = { pending: 0, generated: 0, published: 0 };

    // Group by exam to count statuses
    const uniqueExams = new Set();

    marksheets.forEach((marksheet) => {
      if (
        marksheet.examSchedule &&
        !uniqueExams.has(marksheet.examSchedule._id.toString())
      ) {
        uniqueExams.add(marksheet.examSchedule._id.toString());
        examStatuses[marksheet.status || "pending"]++;
      }

      let studentTotal = 0;
      let studentMax = 0;
      let passedAll = true;

      (marksheet.subjectMarks || []).forEach((sm) => {
        const marks = Number(sm.theoryMarks || 0);
        const max = Number(sm.maxMarks || 100);
        const pass = Number(sm.passingMarks || 33);

        studentTotal += marks;
        studentMax += max;
        if (marks < pass) passedAll = false;
      });

      totalScoreSum += studentTotal;
      totalMaxScoreSum += studentMax;

      if (passedAll && studentTotal > 0) passCount++;

      const percentage = studentMax > 0 ? (studentTotal / studentMax) * 100 : 0;
      if (percentage >= 90) totalToppers++;
    });

    const totalStudents = marksheets.length;
    const averagePercentage =
      totalMaxScoreSum > 0
        ? Math.round((totalScoreSum / totalMaxScoreSum) * 100)
        : 0;
    const passPercentage =
      totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        total: uniqueExams.size,
        pending: examStatuses.pending || 0,
        generated: examStatuses.generated || 0,
        published: examStatuses.published || 0,
        totalStudents,
        averagePercentage,
        passPercentage,
        totalToppers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get aggregated results list for the Data Table
export const getResultsList = async (req, res) => {
  try {
    const schoolId = req.user.school;

    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    const validClassIds = (teacherProfile?.assignedClasses || []).filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    // Group marksheets by Exam to create "Results"
    const exams = await ExamSchedule.find({
      school: schoolId,
      class: { $in: validClassIds },
    })
      .populate("class", "name")
      .lean();

    const formattedResults = await Promise.all(
      exams.map(async (exam) => {
        const marksheets = await Marksheet.find({ examSchedule: exam._id });

        if (marksheets.length === 0) return null;

        let passCount = 0;
        let totalPercentSum = 0;
        let status = "pending";

        marksheets.forEach((m) => {
          if (m.status === "published") status = "published";
          else if (m.status === "generated" && status !== "published")
            status = "generated";

          let studentTotal = 0;
          let studentMax = 0;
          let passed = true;

          (m.subjectMarks || []).forEach((sm) => {
            studentTotal += Number(sm.theoryMarks || 0);
            studentMax += Number(sm.maxMarks || 100);
            if (Number(sm.theoryMarks || 0) < Number(sm.passingMarks || 33))
              passed = false;
          });

          if (passed && studentTotal > 0) passCount++;
          if (studentMax > 0)
            totalPercentSum += (studentTotal / studentMax) * 100;
        });

        return {
          id: exam._id,
          class: exam.class?.name || "N/A",
          section: "A",
          examType: exam.name || "board_practice",
          term: "Annual",
          academicYear: parseInt(
            exam.academicYear?.split("-")[0] || new Date().getFullYear(),
          ),
          students: marksheets.length,
          passCount: passCount,
          averagePercentage:
            marksheets.length > 0
              ? Math.round(totalPercentSum / marksheets.length)
              : 0,
          status: status,
          generatedAt: exam.createdAt,
          publishedAt: status === "published" ? new Date() : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: formattedResults.filter((r) => r !== null),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Result (Compiles marks and changes status to 'generated')
export const generateResult = async (req, res) => {
  try {
    const { examId } = req.body;

    await Marksheet.updateMany(
      { examSchedule: examId },
      { $set: { status: "generated" } },
    );

    res
      .status(200)
      .json({ success: true, message: "Result generated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish Result
export const publishResult = async (req, res) => {
  try {
    const { id } = req.params; // examId

    await Marksheet.updateMany(
      { examSchedule: id },
      { $set: { status: "published", publishedAt: new Date() } },
    );

    res
      .status(200)
      .json({ success: true, message: "Result published successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed marksheets for a specific Result/Exam (FIXED FOR CORRECT STUDENT MAPPING)
export const getStudentMarksheets = async (req, res) => {
  try {
    const { id } = req.params; // examId

    // 1. Fetch marksheets
    const marksheets = await Marksheet.find({ examSchedule: id })
      .populate("subjectMarks.subject", "subjectName")
      .lean();

    if (!marksheets || marksheets.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Extract User IDs
    const userIds = marksheets.map((m) => m.student).filter(Boolean);

    // 3. Fetch corresponding Student profiles (to get rollNo, section, name)
    const students = await Student.find({ user: { $in: userIds } })
      .populate("user", "name email")
      .lean();

    // 4. Map the data safely
    const formatted = marksheets.map((m) => {
      // Match the marksheet's user ID with the student profile's user ID
      const studentDoc = students.find(
        (s) => s.user?._id?.toString() === m.student?.toString(),
      );

      let totalObtained = 0;
      let totalMax = 0;

      const results = (m.subjectMarks || []).map((sm) => {
        const marks = Number(sm.theoryMarks || 0);
        const max = Number(sm.maxMarks || 100);
        totalObtained += marks;
        totalMax += max;

        return {
          subject: sm.subject?.subjectName || "Unknown",
          marks: marks,
          total: max,
          grade: calculateGrade((marks / max) * 100),
        };
      });

      const percentage =
        totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

      return {
        id: m.student?.toString(),
        name: studentDoc?.user?.name || "Unknown Student",
        rollNo: studentDoc?.rollNo || "N/A",
        class: m.class,
        section: studentDoc?.section || "A",
        results,
        totalMarks: totalMax,
        totalObtained,
        percentage,
        grade: calculateGrade(percentage),
        status: m.status,
      };
    });

    // 5. Calculate Ranks based on percentage
    formatted.sort((a, b) => b.percentage - a.percentage);
    formatted.forEach((f, i) => (f.rank = i + 1));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Marksheet Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Dashboard Stats & Charts Data
export const getExamDashboardStats = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const now = new Date();

    const teacherProfile = await Teacher.findOne({
      user: req.user._id,
    }).populate("subjects", "subjectName");
    const assignedClassIds = teacherProfile
      ? teacherProfile.assignedClasses
      : [];
    const teacherSubjects = teacherProfile ? teacherProfile.subjects : [];

    const allExams = await ExamSchedule.find({
      school: schoolId,
      class: { $in: assignedClassIds },
    });
    let completedExamsCount = 0;
    allExams.forEach((exam) => {
      const examDate =
        exam.slots && exam.slots[0]
          ? new Date(exam.slots[0].examDate)
          : new Date(exam.createdAt);
      if (examDate < now) completedExamsCount++;
    });

    const marksheets = await Marksheet.find({
      school: schoolId,
      class: { $in: assignedClassIds },
    });
    let totalScoreSum = 0;
    let totalEntries = 0;
    const subjectStatsMap = {};
    const trendMap = {};

    marksheets.forEach((marksheet) => {
      const submitDate = marksheet.submittedAt
        ? new Date(marksheet.submittedAt)
        : new Date();
      const monthName = submitDate.toLocaleString("default", {
        month: "short",
      });

      if (marksheet.subjectMarks) {
        marksheet.subjectMarks.forEach((sm) => {
          if (sm.theoryMarks !== undefined && sm.theoryMarks !== null) {
            const mark = Number(sm.theoryMarks);
            totalScoreSum += mark;
            totalEntries++;

            if (!trendMap[monthName])
              trendMap[monthName] = { sum: 0, count: 0 };
            trendMap[monthName].sum += mark;
            trendMap[monthName].count++;

            const subIdStr = sm.subject.toString();
            if (!subjectStatsMap[subIdStr])
              subjectStatsMap[subIdStr] = { sum: 0, count: 0, highest: 0 };
            subjectStatsMap[subIdStr].sum += mark;
            subjectStatsMap[subIdStr].count++;
            if (mark > subjectStatsMap[subIdStr].highest)
              subjectStatsMap[subIdStr].highest = mark;
          }
        });
      }
    });

    const avgScore =
      totalEntries > 0 ? Math.round(totalScoreSum / totalEntries) : 0;
    const validClassIds = (assignedClassIds || []).filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id),
    );
    const totalStudents =
      validClassIds.length > 0
        ? await Student.countDocuments({
            class: { $in: validClassIds },
            status: "active",
          })
        : 0;

    const subjectPerformance = [];
    for (const [subId, stats] of Object.entries(subjectStatsMap)) {
      const subjObj = teacherSubjects.find((s) => s._id.toString() === subId);
      const subName = subjObj ? subjObj.subjectName : "Subject";
      subjectPerformance.push({
        subject: subName,
        average: Math.round(stats.sum / stats.count),
        highest: stats.highest,
      });
    }

    const trendData = [];
    for (const [month, stats] of Object.entries(trendMap)) {
      trendData.push({
        month: month,
        score: Math.round(stats.sum / stats.count),
      });
    }
    if (trendData.length === 1) trendData.unshift({ month: "Start", score: 0 });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalExams: allExams.length,
          completed: completedExamsCount,
          avgScore,
          totalStudents,
        },
        charts: { subjectPerformance, trendData },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get paginated & filtered Exams list
export const getExamsList = async (req, res) => {
    try {
        const { search, page = 1, limit = 4 } = req.query;
        const skip = (page - 1) * limit;
        const now = new Date();

        const teacherProfile = await Teacher.findOne({ user: req.user._id });
        const assignedClassIds = teacherProfile ? teacherProfile.assignedClasses : [];

        const validClassIds = (assignedClassIds || []).map(c => c?._id || c).filter(id => id && mongoose.Types.ObjectId.isValid(id));
        let query = { school: req.user.school, class: { $in: validClassIds } };

        const exams = await ExamSchedule.find(query)
            .populate('class', 'name')
            .populate('slots.subject', 'subjectName') 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalExams = await ExamSchedule.countDocuments(query);

        const formattedExams = await Promise.all(exams.map(async (exam) => {
            const examClassId = exam.class?._id;
            const totalStudents = (examClassId && mongoose.Types.ObjectId.isValid(examClassId))
                ? await Student.countDocuments({ class: examClassId, status: 'active' })
                : 0;
            const marksheets = await Marksheet.find({ examSchedule: exam._id });
            const submitted = marksheets.length;
            const avgMarks = submitted > 0 ? Math.round(marksheets.reduce((acc, m) => acc + m.percentage, 0) / submitted) : 0;

            let status = 'upcoming';
            const examDate = exam.slots && exam.slots[0] ? new Date(exam.slots[0].examDate) : new Date(exam.createdAt);
            if (examDate < now) status = 'completed';
            else if (examDate.toDateString() === now.toDateString()) status = 'ongoing';

            const subjectName = exam.slots && exam.slots.length > 0 && exam.slots[0].subject ? exam.slots[0].subject.subjectName : "General";
            const examName = exam.name || `${subjectName} Assessment`;
            const maxMarks = exam.slots && exam.slots.length > 0 ? exam.slots[0].maxMarks : 100;
            const passingMarks = exam.slots && exam.slots.length > 0 ? (exam.slots[0].passingMarks || 33) : 33;

            return { id: exam._id, name: examName, subject: subjectName, subjectId: exam.slots?.[0]?.subject?._id, class: exam.class?.name || "N/A", classId: exam.class?._id, date: examDate, totalStudents, submitted, averageMarks: avgMarks, status, totalMarks: maxMarks, passingMarks };
        }));

        res.status(200).json({ success: true, data: formattedExams, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalExams / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Dropdown Options
export const getQuickEntryFilters = async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({ user: req.user._id })
      .populate("assignedClasses", "name")
      .populate("subjects", "subjectName");
    const classes = teacherProfile ? teacherProfile.assignedClasses : [];
    const rawSubjects = teacherProfile ? teacherProfile.subjects : [];

    const uniqueSubjects = [];
    const subjectSet = new Set();
    for (const sub of rawSubjects) {
      if (sub?.subjectName) {
        const nameLower = sub.subjectName.toLowerCase().trim();
        if (!subjectSet.has(nameLower)) {
          subjectSet.add(nameLower);
          uniqueSubjects.push(sub);
        }
      }
    }

    const validClasses = (classes || [])
      .map((c) => c?._id || c)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
    const examsQuery =
      validClasses.length > 0
        ? await ExamSchedule.find({
            school: req.user.school,
            class: { $in: validClasses },
          })
            .populate("class", "name")
            .populate("slots.subject", "subjectName")
        : [];
    const exams = examsQuery.map((e) => ({
      _id: e._id,
      name: `${e.name || e.class?.name + " - " + (e.slots?.[0]?.subject?.subjectName || "Exam")} (${e.status})`,
    }));

    res.status(200).json({
      success: true,
      data: { classes, subjects: uniqueSubjects, exams },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Students for Marks Entry
export const getMarksEntryTable = async (req, res) => {
    try {
        let { examId, classId, subjectId } = req.query;
        if (!examId) return res.status(400).json({ success: false, message: "Exam ID is required" });

        const exam = await ExamSchedule.findById(examId);
        if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

        if (!classId) {
            classId = exam.class?.toString();
        }
        if (!subjectId) {
            subjectId = exam.slots?.[0]?.subject?.toString();
        }

        if (!classId) return res.status(400).json({ success: false, message: "Class ID is required" });

        const isValidClassId = classId && mongoose.Types.ObjectId.isValid(classId);
        const students = isValidClassId
            ? await Student.find({ class: classId, status: 'active' }).populate('user', 'name')
            : [];
            
        const marksheets = await Marksheet.find({ examSchedule: examId });
        
        const tableData = students
            .filter(student => student.user)
            .map(student => {
                const marksheet = marksheets.find(m => m.student && m.student.toString() === student.user._id.toString());
                const subjectMark = (subjectId && marksheet?.subjectMarks)
                    ? marksheet.subjectMarks.find(sm => sm.subject && sm.subject.toString() === subjectId.toString())
                    : null;
                return {
                    studentId: student.user._id,
                    rollNo: student.rollNo || '',
                    studentName: student.user.name || 'Unknown Student',
                    marks: subjectMark ? subjectMark.theoryMarks : '',
                    grade: subjectMark ? subjectMark.grade : 'A',
                    remarks: subjectMark ? subjectMark.remarks : ''
                };
            });

        res.status(200).json({ success: true, data: tableData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Save Marks
export const bulkSaveMarks = async (req, res) => {
    try {
        let { examId, classId, subjectId, marksData } = req.body;
        if (!examId) return res.status(400).json({ success: false, message: "Exam ID is required" });

        const exam = await ExamSchedule.findById(examId);
        if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

        if (!classId) {
            classId = exam.class?.toString();
        }
        if (!subjectId) {
            subjectId = exam.slots?.[0]?.subject?.toString();
        }

        if (!classId) return res.status(400).json({ success: false, message: "Class ID is required" });

        for (const data of marksData) {
            await Marksheet.updateOne(
                { student: data.studentId, examSchedule: examId },
                { 
                    $set: { 
                        organization: req.user.organization, 
                        school: req.user.school, 
                        class: classId, 
                        academicYear: "2024-2025", 
                        status: "published", 
                        submittedBy: req.user._id, 
                        submittedAt: new Date(),
                        examStructure: exam.examStructure || new mongoose.Types.ObjectId()
                    } 
                }, 
                { upsert: true }
            );
            await Marksheet.updateOne({ student: data.studentId, examSchedule: examId }, { $pull: { subjectMarks: { subject: subjectId } } });
            await Marksheet.updateOne({ student: data.studentId, examSchedule: examId }, { $push: { subjectMarks: { subject: subjectId, theoryMarks: data.marks, grade: data.grade, remarks: data.remarks, maxMarks: 100, passingMarks: 33 } } });
        }
        res.status(200).json({ success: true, message: "Marks saved successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Exam
export const createExam = async (req, res) => {
  try {
    const newExam = new ExamSchedule({
      organization: req.user.organization || req.user.school?.organization,
      school: req.user.school?._id || req.user.school,
      class: req.body.classId,
      name: req.body.name,
      academicYear: "2024-2025",
      status: "draft",
      createdBy: req.user._id,
      examStructure: new mongoose.Types.ObjectId(), // FIXED CRASH
      slots: [
        {
          subject: req.body.subjectId,
          examDate: req.body.date,
          startTime: "09:00",
          endTime: "12:00",
          maxMarks: 100,
          durationMinutes: 180,
        },
      ],
    });
    await newExam.save();
    res
      .status(201)
      .json({ success: true, message: "Exam Created", data: newExam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Exam
export const deleteExam = async (req, res) => {
  try {
    await ExamSchedule.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
