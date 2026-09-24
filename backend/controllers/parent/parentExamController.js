import mongoose from "mongoose";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";

/**
 * @desc    Get linked students for the logged-in parent
 * @route   GET /api/parent/students
 * @access  Private (Parent)
 */
export const getLinkedStudents = async (req, res) => {
    try {
        const parent = await Parent.findOne({ user: req.user._id }).populate({
            path: "students",
            populate: { path: "user", select: "name" },
            select: "rollNo class section"
        });

        if (!parent) {
            return res.status(404).json({ success: false, message: "Parent profile not found" });
        }

        res.status(200).json({
            success: true,
            data: parent.students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get exam schedules for a specific linked student
 * @route   GET /api/parent/exams/schedules/:studentId
 * @access  Private (Parent)
 */
export const getStudentSchedules = async (req, res) => {
    try {
        const { studentId } = req.params;
        const loggedInUserId = req.user._id || req.user.id; // Safely get the logged-in user's ID

        const parent = await Parent.findOne({ user: loggedInUserId });
        if (!parent || !parent.students?.length) {
            return res.status(404).json({ success: false, message: "Parent profile not found" });
        }

        let resolvedStudentId = studentId;
        const isChild = parent.students.some((id) => id.toString() === studentId.toString());
        if (!isChild) {
            resolvedStudentId = parent.students[0];
        }

        // 1. Find the student first
        const studentProfile = await Student.findById(resolvedStudentId);
        
        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }
        
        const schedules = await ExamSchedule.find({
            school: studentProfile.school, // Safely use the student's school
            class: studentProfile.class,
            $or: [
                { section: null },
                { section: studentProfile.section }
            ],
            status: { $in: ["published", "ongoing", "completed"] }
        })
        .populate("examStructure", "examName examType")
        .populate("class", "className name")
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: schedules
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get published results for a specific linked student
 * @route   GET /api/parent/exams/results/:studentId
 * @access  Private (Parent)
 */
export const getStudentResults = async (req, res) => {
    try {
        const { studentId } = req.params;
        const loggedInUserId = req.user._id || req.user.id;

        const parent = await Parent.findOne({ user: loggedInUserId });
        if (!parent || !parent.students?.length) {
            return res.status(404).json({ success: false, message: "Parent profile not found" });
        }

        let resolvedStudentId = studentId;
        const isChild = parent.students.some((id) => id.toString() === studentId.toString());
        if (!isChild) {
            resolvedStudentId = parent.students[0];
        }

        // 1. Find the student first
        const studentProfile = await Student.findById(resolvedStudentId);
        
        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        // 3. Fetch the results using the student's USER reference (as per your DB schema)
        const results = await Marksheet.find({
            student: studentProfile.user, // The DB uses the 'user' ObjectId for the marksheet
            status: "published"
        })
        .populate({
            path: "examSchedule",
            populate: [
                { path: "examStructure", select: "examName examType" },
                { path: "class", select: "className name" }
            ]
        })
        .populate({
            path: "subjectMarks.subject",
            select: "subjectName subjectCode"
        })
        .sort({ publishedAt: -1 });

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const round2 = (value) => Number((value || 0).toFixed(2));

const toObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
};

const getScheduleDate = (examSchedule) => {
    const slotDate = examSchedule?.slots?.[0]?.examDate;
    if (slotDate) return new Date(slotDate);
    return examSchedule?.createdAt ? new Date(examSchedule.createdAt) : new Date(0);
};

const getMarkPercent = (subjectMark) => {
    const max = subjectMark?.maxMarks || 0;
    const obtained = subjectMark?.totalMarks || 0;
    if (max <= 0) return 0;
    return (obtained / max) * 100;
};

const getSubjectName = (subjectMark) => {
    const subject = subjectMark?.subject;
    if (typeof subject === "string") return subject;
    if (subject?.name) return subject.name;
    if (subject?.subjectName) return subject.subjectName;
    if (subject?._id) return subject._id.toString();
    return "Unknown Subject";
};

const loadStudentContext = async (req, res) => {
    const student_id = req.params.studentId || req.query.student_id;
    const loggedInUserId = req.user._id || req.user.id;
    const parent = await Parent.findOne({ user: loggedInUserId });

    if (!parent || !parent.students?.length) {
        res.status(404).json({ success: false, data: null, message: "Parent profile not found" });
        return null;
    }

    let resolvedStudentId = student_id || parent.students[0];
    if (student_id) {
        const isChild = parent.students.some((id) => id.toString() === student_id.toString());
        if (!isChild) {
            resolvedStudentId = parent.students[0];
        }
    }

    const studentObjectId = toObjectId(resolvedStudentId);
    const studentProfile = await Student.findById(studentObjectId);
    if (!studentProfile) {
        res.status(200).json({ success: true, data: {}, message: "Student not found" });
        return null;
    }

    const studentSchoolId = studentProfile.school;
    if (!studentSchoolId) {
        res.status(400).json({ success: false, data: null, message: "Student has no school assigned" });
        return null;
    }

    const schoolObjectId = toObjectId(studentSchoolId);

    return { studentProfile, schoolObjectId };
};

const fetchStudentPublishedMarksheets = async (schoolObjectId, studentUserId) =>
    Marksheet.find({
        school: schoolObjectId,
        student: studentUserId,
        status: "published",
    })
        .populate({
            path: "examSchedule",
            select: "examStructure class slots createdAt",
            populate: {
                path: "examStructure",
                select: "examName examType",
            },
        })
        .populate({ path: "subjectMarks.subject", select: "name subjectName" });

export const getStudentPerformanceTrend = async (req, res) => {
    try {
        const context = await loadStudentContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const marksheets = await fetchStudentPublishedMarksheets(schoolObjectId, studentProfile.user);

        if (!marksheets.length) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No exam data found",
            });
        }

        const sorted = marksheets.sort((a, b) => getScheduleDate(a.examSchedule) - getScheduleDate(b.examSchedule));
        const grouped = new Map();

        sorted.forEach((m) => {
            const examName = m.examSchedule?.examStructure?.examName;
            const examType = m.examSchedule?.examStructure?.examType;
            const label = examName || examType || "Exam";
            const date = getScheduleDate(m.examSchedule);

            if (!grouped.has(label)) {
                grouped.set(label, {
                    name: label,
                    __date: date,
                    __subjects: {},
                });
            }

            const entry = grouped.get(label);
            if (date > entry.__date) {
                entry.__date = date;
            }

            (m.subjectMarks || []).forEach((s) => {
                const subjectName = getSubjectName(s);
                const percent = getMarkPercent(s);
                if (!entry.__subjects[subjectName]) {
                    entry.__subjects[subjectName] = { sum: 0, count: 0 };
                }
                entry.__subjects[subjectName].sum += percent;
                entry.__subjects[subjectName].count += 1;
            });
        });

        const trend = Array.from(grouped.values())
            .sort((a, b) => a.__date - b.__date)
            .map((entry) => {
                const row = { name: entry.name };
                Object.entries(entry.__subjects).forEach(([subject, agg]) => {
                    row[subject] = round2(agg.sum / agg.count);
                });
                return row;
            });

        return res.status(200).json({
            success: true,
            data: trend,
            message: "Performance trend fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getStudentSubjectAnalysis = async (req, res) => {
    try {
        const context = await loadStudentContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const marksheets = await fetchStudentPublishedMarksheets(schoolObjectId, studentProfile.user);

        if (!marksheets.length) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No exam data found",
            });
        }

        const sortedDesc = marksheets.sort((a, b) => getScheduleDate(b.examSchedule) - getScheduleDate(a.examSchedule));
        const latest = sortedDesc[0];

        const classMarksheets = await Marksheet.find({
            school: schoolObjectId,
            examSchedule: latest.examSchedule?._id,
            class: latest.class,
            status: "published",
        }).populate({ path: "subjectMarks.subject", select: "name subjectName" });

        const analysis = (latest.subjectMarks || []).map((s) => {
            const subjectName = getSubjectName(s);
            const studentScore = round2(getMarkPercent(s));
            const subjectId = s?.subject?._id ? s.subject._id.toString() : subjectName;

            const classSubjectScores = [];
            classMarksheets.forEach((m) => {
                (m.subjectMarks || []).forEach((item) => {
                    const itemId = item?.subject?._id ? item.subject._id.toString() : getSubjectName(item);
                    if (itemId === subjectId) {
                        classSubjectScores.push(getMarkPercent(item));
                    }
                });
            });

            const classAverage = classSubjectScores.length
                ? round2(classSubjectScores.reduce((sum, v) => sum + v, 0) / classSubjectScores.length)
                : 0;

            const subjectHistory = [];
            sortedDesc.forEach((m) => {
                const match = (m.subjectMarks || []).find((item) => {
                    const itemId = item?.subject?._id ? item.subject._id.toString() : getSubjectName(item);
                    return itemId === subjectId;
                });
                if (match) subjectHistory.push(getMarkPercent(match));
            });

            const latestScore = subjectHistory[0] || 0;
            const prevScore = subjectHistory[1] ?? latestScore;
            const difference = latestScore - prevScore;
            const trend = difference > 3 ? "improving" : difference < -3 ? "declining" : "stable";

            return {
                name: subjectName,
                score: studentScore,
                average: classAverage,
                trend,
            };
        });

        return res.status(200).json({
            success: true,
            data: analysis,
            message: "Subject analysis fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
