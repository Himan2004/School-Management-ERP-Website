import mongoose from "mongoose";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Attendance from "../../models/academic/attendance.model.js";

const round2 = (value) => Number((value || 0).toFixed(2));

/**
 * Helper function to verify student belongs to parent
 */
const verifyStudentAccess = async (userId, studentId) => {
    const parent = await Parent.findOne({ user: userId });
    if (!parent) return false;
    return parent.students.some((id) => id.toString() === studentId.toString());
};

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

const getAttendanceCounts = async (schoolId, studentUserId) => {
    const aggregate = await Attendance.aggregate([
        { $match: { school: schoolId } },
        { $unwind: "$entries" },
        { $match: { "entries.student": studentUserId } },
        {
            $group: {
                _id: "$entries.status",
                count: { $sum: 1 },
            },
        },
    ]);

    const counts = {
        present: 0,
        absent: 0,
        on_leave: 0,
        late: 0,
        half_day: 0,
        total: 0,
    };

    aggregate.forEach((item) => {
        const status = item._id;
        counts[status] = item.count || 0;
        counts.total += item.count || 0;
    });

    return counts;
};

const loadStudentContext = async (req, res) => {
    const { student_id } = req.query;
    const parent = await Parent.findOne({ user: req.user?._id });

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

export const getAISummary = async (req, res) => {
    try {
        const context = await loadStudentContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const marksheets = await fetchStudentPublishedMarksheets(schoolObjectId, studentProfile.user);

        if (!marksheets.length) {
            const attendanceCounts = await getAttendanceCounts(schoolObjectId, studentProfile.user);
            const attendancePercentage = attendanceCounts.total
                ? round2((attendanceCounts.present / attendanceCounts.total) * 100)
                : 0;

            return res.status(200).json({
                success: true,
                data: {
                    overallScore: 0,
                    strongestSubject: "",
                    weakestSubject: "",
                    attendanceImpact: attendancePercentage >= 85 ? "Positive" : attendancePercentage >= 75 ? "Neutral" : "Negative",
                    predictedGrade: "D",
                    attendancePercentage,
                },
                message: "No exam data found",
            });
        }

        const latestByType = new Map();
        marksheets.forEach((m) => {
            const examType = m.examSchedule?.examStructure?.examType || "unknown";
            const date = getScheduleDate(m.examSchedule);
            const existing = latestByType.get(examType);
            if (!existing || date > existing.date) {
                latestByType.set(examType, { marksheet: m, date });
            }
        });

        const candidateLatest = Array.from(latestByType.values())
            .sort((a, b) => b.date - a.date)[0]?.marksheet || marksheets[0];

        const subjectRows = candidateLatest.subjectMarks || [];
        const subjectScores = subjectRows.map((s) => ({
            name: getSubjectName(s),
            score: getMarkPercent(s),
        }));

        const overallScore = subjectScores.length
            ? round2(subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length)
            : 0;

        const strongest = [...subjectScores].sort((a, b) => b.score - a.score)[0];
        const weakest = [...subjectScores].sort((a, b) => a.score - b.score)[0];

        const attendanceCounts = await getAttendanceCounts(schoolObjectId, studentProfile.user);
        const attendancePercentage = attendanceCounts.total
            ? round2((attendanceCounts.present / attendanceCounts.total) * 100)
            : 0;

        const attendanceImpact = attendancePercentage >= 85 ? "Positive" : attendancePercentage >= 75 ? "Neutral" : "Negative";
        const predictedGrade = overallScore >= 90 ? "A+" : overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D";

        return res.status(200).json({
            success: true,
            data: {
                overallScore,
                strongestSubject: strongest?.name || "",
                weakestSubject: weakest?.name || "",
                attendanceImpact,
                predictedGrade,
                attendancePercentage,
            },
            message: "AI summary fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getPerformanceTrend = async (req, res) => {
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

export const getSubjectAnalysis = async (req, res) => {
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

const calculateRankForMarksheet = async (schoolObjectId, classId, examScheduleId, studentUserId) => {
    const classMarksheets = await Marksheet.find({
        school: schoolObjectId,
        class: classId,
        examSchedule: examScheduleId,
        status: "published",
    }).select("student percentage totalMarksObtained totalMaxMarks");

    if (!classMarksheets.length) {
        return {
            rank: 0,
            totalStudents: 0,
            overallScore: 0,
            classAverage: 0,
            topperScore: 0,
        };
    }

    const rows = classMarksheets.map((m) => {
        const percent = typeof m.percentage === "number" && m.percentage > 0
            ? m.percentage
            : (m.totalMaxMarks || 0) > 0
                ? (m.totalMarksObtained / m.totalMaxMarks) * 100
                : 0;

        return {
            student: m.student?.toString(),
            percentage: percent,
        };
    }).sort((a, b) => b.percentage - a.percentage);

    const rankIndex = rows.findIndex((r) => r.student === studentUserId.toString());
    const rank = rankIndex >= 0 ? rankIndex + 1 : 0;
    const totalStudents = rows.length;
    const overallScore = rankIndex >= 0 ? round2(rows[rankIndex].percentage) : 0;
    const classAverage = round2(rows.reduce((sum, r) => sum + r.percentage, 0) / totalStudents);
    const topperScore = rows.length ? round2(rows[0].percentage) : 0;

    return { rank, totalStudents, overallScore, classAverage, topperScore };
};

export const getClassRanking = async (req, res) => {
    try {
        const context = await loadStudentContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const marksheets = await fetchStudentPublishedMarksheets(schoolObjectId, studentProfile.user);

        if (!marksheets.length) {
            return res.status(200).json({
                success: true,
                data: {
                    rank: 0,
                    totalStudents: 0,
                    percentile: 0,
                    overallScore: 0,
                    classAverage: 0,
                    topperScore: 0,
                    previousRank: 0,
                    improved: false,
                },
                message: "No exam data found",
            });
        }

        const sortedDesc = marksheets.sort((a, b) => getScheduleDate(b.examSchedule) - getScheduleDate(a.examSchedule));
        const latest = sortedDesc[0];
        const previous = sortedDesc[1];

        const latestRankData = await calculateRankForMarksheet(
            schoolObjectId,
            latest.class,
            latest.examSchedule?._id,
            studentProfile.user
        );

        let previousRank = 0;
        if (previous?.examSchedule?._id) {
            const previousRankData = await calculateRankForMarksheet(
                schoolObjectId,
                previous.class,
                previous.examSchedule?._id,
                studentProfile.user
            );
            previousRank = previousRankData.rank || 0;
        }

        const percentile = latestRankData.totalStudents > 0 && latestRankData.rank > 0
            ? round2(((latestRankData.totalStudents - latestRankData.rank) / latestRankData.totalStudents) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                rank: latestRankData.rank,
                totalStudents: latestRankData.totalStudents,
                percentile,
                overallScore: latestRankData.overallScore,
                classAverage: latestRankData.classAverage,
                topperScore: latestRankData.topperScore,
                previousRank,
                improved: previousRank > 0 ? latestRankData.rank < previousRank : false,
            },
            message: "Class ranking fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getAttendanceImpact = async (req, res) => {
    try {
        const context = await loadStudentContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const attendanceCounts = await getAttendanceCounts(schoolObjectId, studentProfile.user);
        const presentDays = attendanceCounts.present;
        const absentDays = attendanceCounts.absent;
        const leaveDays = attendanceCounts.on_leave;
        const attendancePercentage = attendanceCounts.total
            ? round2((presentDays / attendanceCounts.total) * 100)
            : 0;

        const schoolAggregate = await Attendance.aggregate([
            { $match: { school: schoolObjectId } },
            { $unwind: "$entries" },
            {
                $group: {
                    _id: "$entries.status",
                    count: { $sum: 1 },
                },
            },
        ]);

        let schoolPresent = 0;
        let schoolTotal = 0;
        schoolAggregate.forEach((item) => {
            schoolTotal += item.count || 0;
            if (item._id === "present") schoolPresent += item.count || 0;
        });

        const schoolAveragePercentage = schoolTotal ? round2((schoolPresent / schoolTotal) * 100) : 0;
        const isAboveAverage = attendancePercentage >= schoolAveragePercentage;

        const attendanceDocs = await Attendance.find({ school: schoolObjectId })
            .select("date entries.student entries.status")
            .sort({ date: 1 });

        const monthlyAttendance = {};
        attendanceDocs.forEach((doc) => {
            const monthKey = new Date(doc.date).toISOString().slice(0, 7);
            if (!monthlyAttendance[monthKey]) {
                monthlyAttendance[monthKey] = { total: 0, absent: 0, present: 0 };
            }
            (doc.entries || []).forEach((entry) => {
                if (entry.student?.toString() === studentProfile.user.toString()) {
                    monthlyAttendance[monthKey].total += 1;
                    if (entry.status === "absent") monthlyAttendance[monthKey].absent += 1;
                    if (entry.status === "present") monthlyAttendance[monthKey].present += 1;
                }
            });
        });

        const marksheets = await fetchStudentPublishedMarksheets(schoolObjectId, studentProfile.user);
        const monthlyScores = {};
        marksheets.forEach((m) => {
            const monthKey = getScheduleDate(m.examSchedule).toISOString().slice(0, 7);
            if (!monthlyScores[monthKey]) {
                monthlyScores[monthKey] = [];
            }
            monthlyScores[monthKey].push(typeof m.percentage === "number"
                ? m.percentage
                : (m.totalMaxMarks || 0) > 0
                    ? (m.totalMarksObtained / m.totalMaxMarks) * 100
                    : 0);
        });

        const avgScoreByMonth = {};
        Object.entries(monthlyScores).forEach(([month, values]) => {
            avgScoreByMonth[month] = values.length
                ? round2(values.reduce((sum, v) => sum + v, 0) / values.length)
                : 0;
        });

        const correlations = [];
        const months = Object.keys(monthlyAttendance).sort();

        for (let i = 1; i < months.length; i += 1) {
            const currentMonth = months[i];
            const previousMonth = months[i - 1];
            const currentAttendance = monthlyAttendance[currentMonth];
            const absenceRate = currentAttendance.total
                ? currentAttendance.absent / currentAttendance.total
                : 0;

            const prevScore = avgScoreByMonth[previousMonth];
            const currentScore = avgScoreByMonth[currentMonth];

            if (
                absenceRate >= 0.2 &&
                typeof prevScore === "number" &&
                typeof currentScore === "number" &&
                currentScore < prevScore
            ) {
                correlations.push({
                    type: "warning",
                    message: `Higher absences in ${currentMonth} aligned with a ${round2(prevScore - currentScore)}% score drop.`,
                });
            }
        }

        const highAttendanceScores = [];
        const lowAttendanceScores = [];
        Object.keys(monthlyAttendance).forEach((month) => {
            const attendance = monthlyAttendance[month];
            const score = avgScoreByMonth[month];
            if (typeof score !== "number") return;

            const presentRate = attendance.total ? attendance.present / attendance.total : 0;
            if (presentRate >= 0.85) highAttendanceScores.push(score);
            if (presentRate < 0.75) lowAttendanceScores.push(score);
        });

        if (highAttendanceScores.length && lowAttendanceScores.length) {
            const highAvg = highAttendanceScores.reduce((sum, v) => sum + v, 0) / highAttendanceScores.length;
            const lowAvg = lowAttendanceScores.reduce((sum, v) => sum + v, 0) / lowAttendanceScores.length;
            const diff = round2(highAvg - lowAvg);
            correlations.push({
                type: diff >= 0 ? "positive" : "info",
                message: `High attendance months show ${Math.abs(diff)}% ${diff >= 0 ? "better" : "lower"} scores.`,
            });
        }

        if (!correlations.length) {
            correlations.push({
                type: "info",
                message: "Not enough month-wise data to infer strong attendance-performance correlation.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                presentDays,
                absentDays,
                leaveDays,
                attendancePercentage,
                schoolAveragePercentage,
                isAboveAverage,
                correlations,
            },
            message: "Attendance impact fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
