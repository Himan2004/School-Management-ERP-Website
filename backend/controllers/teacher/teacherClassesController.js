import mongoose from "mongoose";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import Timetable from "../../models/academic/timetable.model.js";
import Student from "../../models/users/student.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import Notice from "../../models/common/Notice.js";

const getSchoolId = (user) => user?.school?._id || user?.school;

const loadOptionalModel = async (modelNames, importPaths) => {
    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    for (const filePath of importPaths) {
        try {
            await import(filePath);
        } catch (error) {
            // Model file may not exist; ignore and continue.
        }
    }

    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    return null;
};

const getHomeworkModel = async () =>
    loadOptionalModel(
        ["Homework", "homework"],
        [
            "../../models/academic/homework.model.js",
            "../../models/academic/homework.model.js",
            "../../models/academic/homeworkModel.js",
        ]
    );

const getExamModel = async () =>
    loadOptionalModel(
        ["Exam", "exam", "ExamResult", "examResult"],
        [
            "../../models/academic/exam.model.js",
            "../../models/academic/Exam.model.js",
            "../../models/academic/examResult.model.js",
        ]
    );

const parseTimeToDate = (baseDate, timeString) => {
    if (!timeString) return null;
    const raw = String(timeString).trim();
    if (!raw) return null;

    let meridian = "";
    let timePart = raw;
    const meridianMatch = raw.match(/\s*(AM|PM)$/i);
    if (meridianMatch) {
        meridian = meridianMatch[1].toUpperCase();
        timePart = raw.replace(/\s*(AM|PM)$/i, "").trim();
    }

    const [hourStr, minuteStr] = timePart.split(":");
    const hours = Number.parseInt(hourStr, 10);
    const minutes = Number.parseInt(minuteStr || "0", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    let adjustedHours = hours;
    if (meridian) {
        if (meridian === "PM" && adjustedHours < 12) adjustedHours += 12;
        if (meridian === "AM" && adjustedHours === 12) adjustedHours = 0;
    }

    const result = new Date(baseDate);
    result.setHours(adjustedHours, minutes, 0, 0);
    return result;
};

const formatNextClassLabel = (date, timeString) => {
    if (!date) return "N/A";
    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];
    const targetKey = date.toISOString().split("T")[0];

    let label = date.toLocaleDateString("en-US", { weekday: "short" });
    if (targetKey === todayKey) label = "Today";
    else {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        if (tomorrow.toISOString().split("T")[0] === targetKey) label = "Tomorrow";
    }

    let formattedTime = timeString ? String(timeString).trim() : "";
    if (!formattedTime || !/(AM|PM)$/i.test(formattedTime)) {
        formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    return `${label} ${formattedTime}`;
};

const getDayIndex = (dayName) => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days.indexOf(dayName);
};

const buildHomeworkClassQuery = (classId) => ({
    $or: [
        { class: classId },
        { classId: classId },
        { assignedClass: classId },
        { classes: classId },
        { "target.class": classId },
    ],
});

const collectTeacherPeriods = (timetables, teacherId) => {
    const teacherKey = teacherId.toString();
    const periods = [];

    timetables.forEach((timetable) => {
        (timetable.schedule || []).forEach((daySchedule) => {
            (daySchedule.periods || []).forEach((period) => {
                const teacherField = period.teacher?._id || period.teacher;
                if (!teacherField || teacherField.toString() !== teacherKey) return;
                periods.push({ day: daySchedule.day, period });
            });
        });
    });

    return periods;
};

const findNextClass = (timetables, teacherId) => {
    const now = new Date();
    const todayIndex = now.getDay();
    const periods = collectTeacherPeriods(timetables, teacherId);

    let nextItem = null;
    periods.forEach(({ day, period }) => {
        const dayIndex = getDayIndex(day);
        if (dayIndex < 0) return;
        let daysAhead = (dayIndex - todayIndex + 7) % 7;
        const baseDate = new Date(now);
        baseDate.setDate(now.getDate() + daysAhead);
        let startDate = parseTimeToDate(baseDate, period.startTime);
        if (!startDate) return;
        if (startDate <= now) {
            startDate = new Date(startDate);
            startDate.setDate(startDate.getDate() + 7);
            daysAhead += 7;
        }

        if (!nextItem || startDate < nextItem.startDate) {
            nextItem = { startDate, startTime: period.startTime };
        }
    });

    return nextItem;
};

const extractAttendanceCounts = (records) => records.reduce(
    (acc, record) => {
        const present = record.totalPresent ?? (record.entries || []).filter((e) => e.status === "present").length;
        const absent = record.totalAbsent ?? (record.entries || []).filter((e) => e.status === "absent").length;
        const late = record.totalLate ?? (record.entries || []).filter((e) => e.status === "late").length;
        return {
            present: acc.present + present,
            absent: acc.absent + absent,
            late: acc.late + late,
            total: acc.total + present + absent + late,
        };
    },
    { present: 0, absent: 0, late: 0, total: 0 }
);

const filterStudentsBySection = (students, sectionValue) => {
    if (!sectionValue) return students;
    return students.filter((student) => {
        const section = student.section;
        if (!section) return false;
        if (typeof section === "string") return section === sectionValue;
        if (section.name) return section.name === sectionValue;
        return section._id?.toString() === sectionValue.toString();
    });
};

export const getMyClasses = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);

        const assignments = await SubjectAssignment.find({ teacherUser: teacherId, school: schoolId })
            .populate("class", "name")
            .populate("subject", "subjectName name")
            .populate("assignedBy", "role")
            .lean();

        if (!assignments.length) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                message: "No class assignments found",
            });
        }

        // Group assignments by class + section to unify multiple subjects
        const grouped = [];
        assignments.forEach(assign => {
            const classId = assign.class?._id?.toString() || assign.class?.toString() || "";
            const className = assign.class?.name || "";
            const section = assign.section || "";
            const key = `${classId}_${section}`;

            let existing = grouped.find(g => g.key === key);
            if (!existing) {
                existing = {
                    key,
                    classId,
                    className,
                    section,
                    subjects: [],
                    sources: [],
                    originalIds: [],
                    academicYear: assign.academicYear || ""
                };
                grouped.push(existing);
            }

            const subjectName = assign.subject?.subjectName || assign.subject?.name || "";
            const subjectId = assign.subject?._id || assign.subject;
            if (subjectName && !existing.subjects.some(s => s.name === subjectName)) {
                existing.subjects.push({ id: subjectId, name: subjectName });
            }

            const role = assign.assignedBy?.role || "";
            let source = "Principal";
            if (role === "admin") {
                source = "Admin";
            }
            if (source && !existing.sources.includes(source)) {
                existing.sources.push(source);
            }

            existing.originalIds.push(assign._id);
        });

        const HomeworkModel = await getHomeworkModel();
        const ExamModel = await getExamModel();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const data = await Promise.all(grouped.map(async (group) => {
            const classId = group.classId;
            const className = group.className;
            const subjectLabel = group.subjects.map(s => s.name).join(", ");
            const subjectId = group.subjects[0]?.id || null;
            const sourceBadge = group.sources.join(" / ") || "Principal";

            const isValidClassId = classId && mongoose.Types.ObjectId.isValid(classId);

            const students = isValidClassId
                ? await Student.countDocuments({ class: classId, school: schoolId })
                : 0;

            let timetables = [];
            if (isValidClassId) {
                const timetableQuery = {
                    school: schoolId,
                    class: classId,
                    isActive: true,
                };
                if (group.section) {
                    timetableQuery.section = group.section;
                }
                timetables = await Timetable.find(timetableQuery).lean();
            }
            const nextClassInfo = findNextClass(timetables, teacherId);
            const nextClass = nextClassInfo
                ? formatNextClassLabel(nextClassInfo.startDate, nextClassInfo.startTime)
                : "N/A";

            let pendingAssignments = 0;
            if (HomeworkModel && isValidClassId) {
                pendingAssignments = await HomeworkModel.countDocuments({
                    createdBy: teacherId,
                    $and: [
                        {
                            $or: [
                                { school: schoolId },
                                { schoolId },
                            ],
                        },
                        buildHomeworkClassQuery(classId),
                        {
                            $or: [
                                { dueDate: { $gte: todayStart } },
                                { deadline: { $gte: todayStart } },
                            ],
                        },
                    ],
                    status: { $ne: "closed" },
                });
            }

            let averageGrade = "N/A";

            return {
                id: group.originalIds[0],
                classId,
                className,
                section: group.section || "",
                subject: subjectLabel,
                subjects: group.subjects,
                subjectId,
                students,
                nextClass,
                pendingAssignments,
                averageGrade,
                source: sourceBadge
            };
        }));

        return res.status(200).json({
            success: true,
            data,
            total: data.length,
            message: "Teacher classes fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getClassById = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const assignmentId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
            return res.status(400).json({ success: false, data: null, message: "Invalid class assignment ID" });
        }

        const assignment = await SubjectAssignment.findOne({ _id: assignmentId, teacherUser: teacherId, school: schoolId })
            .populate("class", "name")
            .populate("subject", "subjectName name")
            .populate("school", "schoolName")
            .lean();

        if (!assignment) {
            return res.status(404).json({ success: false, data: null, message: "Class assignment not found" });
        }

        const classId = assignment.class?._id || assignment.class;
        const isValidClassId = classId && mongoose.Types.ObjectId.isValid(classId);

        // Find all assignments for this teacher + school + class + section to get all subjects and sources
        let allAssignments = [];
        if (isValidClassId) {
            allAssignments = await SubjectAssignment.find({
                teacherUser: teacherId,
                school: schoolId,
                class: classId,
                section: assignment.section || ""
            })
                .populate("subject", "subjectName name")
                .populate("assignedBy", "role")
                .lean();
        }

        const subjectsListFromAssignments = [];
        const sourcesListFromAssignments = [];
        allAssignments.forEach(a => {
            const subjectName = a.subject?.subjectName || a.subject?.name || "";
            if (subjectName && !subjectsListFromAssignments.includes(subjectName)) {
                subjectsListFromAssignments.push(subjectName);
            }
            const role = a.assignedBy?.role || "";
            let source = "Principal";
            if (role === "admin") {
                source = "Admin";
            }
            if (source && !sourcesListFromAssignments.includes(source)) {
                sourcesListFromAssignments.push(source);
            }
        });

        const subjectLabel = subjectsListFromAssignments.join(", ");
        const sourceBadge = sourcesListFromAssignments.join(" / ") || "Principal";

        let students = [];
        if (isValidClassId) {
            students = await Student.find({ class: classId, school: schoolId })
                .populate("user", "name email")
                .populate("section", "name")
                .lean();
        }

        students = filterStudentsBySection(students, assignment.section);
        const totalStudents = students.length;

        let timetables = [];
        if (isValidClassId) {
            const timetableQuery = {
                school: schoolId,
                class: classId,
                isActive: true,
            };
            if (assignment.section) {
                timetableQuery.section = assignment.section;
            }
            timetables = await Timetable.find(timetableQuery).lean();
        }
        const schedule = collectTeacherPeriods(timetables, teacherId).map((item) => ({
            day: item.day ? `${item.day.charAt(0).toUpperCase()}${item.day.slice(1)}` : "",
            startTime: item.period.startTime || "",
            endTime: item.period.endTime || "",
        }));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let attendanceRecords = [];
        if (isValidClassId) {
            const attendanceQuery = {
                school: schoolId,
                class: classId,
                date: { $gte: thirtyDaysAgo, $lte: todayEnd },
            };
            if (assignment.section) attendanceQuery.section = assignment.section;
            attendanceRecords = await Attendance.find(attendanceQuery).lean();
        }
        const attendanceCounts = extractAttendanceCounts(attendanceRecords);
        const attendanceRate = attendanceCounts.total
            ? Number(((attendanceCounts.present / attendanceCounts.total) * 100).toFixed(2))
            : 0;

        const HomeworkModel = await getHomeworkModel();
        let pendingAssignments = 0;
        if (HomeworkModel && isValidClassId) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            pendingAssignments = await HomeworkModel.countDocuments({
                createdBy: teacherId,
                $and: [
                    {
                        $or: [
                            { school: schoolId },
                            { schoolId },
                        ],
                    },
                    buildHomeworkClassQuery(classId),
                    {
                        $or: [
                            { dueDate: { $gte: todayStart } },
                            { deadline: { $gte: todayStart } },
                        ],
                    },
                ],
                status: { $ne: "closed" },
            });
        }

        const averageGrade = "N/A";

        const studentUserIds = students.map((student) => student.user?._id || student.user).filter(Boolean);
        const attendanceByStudent = new Map();
        attendanceRecords.forEach((record) => {
            (record.entries || []).forEach((entry) => {
                const studentId = entry.student?.toString();
                if (!studentId) return;
                if (!studentUserIds.find((id) => id.toString() === studentId)) return;
                const current = attendanceByStudent.get(studentId) || { present: 0, total: 0 };
                const isPresent = entry.status === "present";
                attendanceByStudent.set(studentId, {
                    present: current.present + (isPresent ? 1 : 0),
                    total: current.total + 1,
                });
            });
        });

        const studentsList = students.map((student) => {
            const studentUserId = (student.user?._id || student.user || "").toString();
            const attendance = attendanceByStudent.get(studentUserId) || { present: 0, total: 0 };
            const attendancePercent = attendance.total
                ? Number(((attendance.present / attendance.total) * 100).toFixed(2))
                : 0;

            return {
                id: student._id,
                name: student.user?.name || "",
                rollNo: student.rollNo || "",
                photo: student.photo || "",
                email: student.user?.email || "",
                attendance: attendancePercent,
                performance: "N/A",
            };
        });

        const notices = await Notice.find({
            school: schoolId,
            createdBy: teacherId,
            targetAudience: { $in: ["students", "all"] },
        })
            .select("title content createdAt")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentAnnouncements = notices.map((notice) => ({
            id: notice._id,
            title: notice.title,
            description: notice.content,
            date: notice.createdAt,
        }));

        return res.status(200).json({
            success: true,
            data: {
                id: assignment._id,
                className: assignment.class?.name || "",
                section: assignment.section || "",
                subject: subjectLabel,
                academicYear: assignment.academicYear || "",
                room: null,
                totalStudents,
                attendanceRate,
                pendingAssignments,
                averageGrade,
                schedule,
                students: studentsList,
                recentAnnouncements,
                source: sourceBadge
            },
            message: "Class details fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getClassStats = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const assignmentId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
            return res.status(400).json({ success: false, data: null, message: "Invalid class assignment ID" });
        }

        const assignment = await SubjectAssignment.findOne({ _id: assignmentId, teacherUser: teacherId, school: schoolId })
            .select("class section")
            .lean();

        if (!assignment) {
            return res.status(404).json({ success: false, data: null, message: "Class assignment not found" });
        }

        const classId = assignment.class;
        const isValidClassId = classId && mongoose.Types.ObjectId.isValid(classId);

        let students = [];
        if (isValidClassId) {
            students = await Student.find({ class: classId, school: schoolId })
                .populate("section", "name")
                .lean();
        }
        const filteredStudents = filterStudentsBySection(students, assignment.section);
        const totalStudents = filteredStudents.length;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date();
        monthEnd.setHours(23, 59, 59, 999);

        let attendanceRecords = [];
        if (isValidClassId) {
            const attendanceQuery = {
                school: schoolId,
                class: classId,
                date: { $gte: monthStart, $lte: monthEnd },
            };
            if (assignment.section) attendanceQuery.section = assignment.section;

            attendanceRecords = await Attendance.find(attendanceQuery).lean();
        }
        const attendanceCounts = extractAttendanceCounts(attendanceRecords);
        const presentPercentage = attendanceCounts.total
            ? Number(((attendanceCounts.present / attendanceCounts.total) * 100).toFixed(2))
            : 0;

        const HomeworkModel = await getHomeworkModel();
        let totalHomework = 0;
        let pendingHomework = 0;
        let submittedHomework = 0;

        if (HomeworkModel && isValidClassId) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const homeworkQuery = {
                createdBy: teacherId,
                $and: [
                    {
                        $or: [
                            { school: schoolId },
                            { schoolId },
                        ],
                    },
                    buildHomeworkClassQuery(classId),
                ],
            };

            const homeworkDocs = await HomeworkModel.find(homeworkQuery).lean();
            totalHomework = homeworkDocs.length;
            pendingHomework = homeworkDocs.filter((hw) => {
                const dueDate = hw?.dueDate || hw?.deadline;
                const due = dueDate ? new Date(dueDate) : null;
                return due ? due >= todayStart : false;
            }).length;
            submittedHomework = homeworkDocs.reduce((sum, hw) => {
                const submissions = Array.isArray(hw.submissions) ? hw.submissions : [];
                return sum + submissions.length;
            }, 0);
        }

        const averageScore = null;
        const topStudent = null;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const attendanceByStudent = new Map();
        const studentUserIds = filteredStudents.map((student) => student.user?.toString()).filter(Boolean);

        let recentAttendance = [];
        if (isValidClassId) {
            recentAttendance = await Attendance.find({
                school: schoolId,
                class: classId,
                date: { $gte: thirtyDaysAgo, $lte: monthEnd },
                ...(assignment.section ? { section: assignment.section } : {}),
            }).lean();
        }

        recentAttendance.forEach((record) => {
            (record.entries || []).forEach((entry) => {
                const studentId = entry.student?.toString();
                if (!studentId) return;
                if (!studentUserIds.includes(studentId)) return;
                const current = attendanceByStudent.get(studentId) || { present: 0, total: 0 };
                attendanceByStudent.set(studentId, {
                    present: current.present + (entry.status === "present" ? 1 : 0),
                    total: current.total + 1,
                });
            });
        });

        const lowAttendanceStudents = filteredStudents.filter((student) => {
            const studentId = student.user?.toString();
            if (!studentId) return false;
            const data = attendanceByStudent.get(studentId) || { present: 0, total: 0 };
            if (!data.total) return false;
            const percent = (data.present / data.total) * 100;
            return percent < 75;
        }).length;

        return res.status(200).json({
            success: true,
            data: {
                attendanceThisMonth: attendanceRecords.length,
                presentPercentage,
                totalHomework,
                pendingHomework,
                averageScore,
                topStudent,
                lowAttendanceStudents,
                totalStudents,
            },
            message: "Class stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getMySubjects = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);

        const assignments = await SubjectAssignment.find({ teacherUser: teacherId, school: schoolId })
            .populate("subject", "subjectName name")
            .select("subject class")
            .lean();

        if (!assignments.length) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No subjects found for teacher",
            });
        }

        const subjectMap = new Map();
        const classIds = new Set();

        assignments.forEach((assignment) => {
            const subjectId = assignment.subject?._id?.toString() || assignment.subject?.toString();
            if (!subjectId) return;
            if (!subjectMap.has(subjectId)) {
                subjectMap.set(subjectId, {
                    id: assignment.subject?._id || assignment.subject,
                    name: assignment.subject?.subjectName || assignment.subject?.name || "",
                    classIds: new Set(),
                });
            }
            if (assignment.class && mongoose.Types.ObjectId.isValid(assignment.class)) {
                subjectMap.get(subjectId).classIds.add(assignment.class.toString());
                classIds.add(assignment.class.toString());
            }
        });

        let students = [];
        if (classIds.size > 0) {
            students = await Student.find({ class: { $in: [...classIds] }, school: schoolId })
                .select("class")
                .lean();
        }

        const studentCountByClass = students.reduce((acc, student) => {
            const classKey = student.class?.toString();
            if (!classKey) return acc;
            acc[classKey] = (acc[classKey] || 0) + 1;
            return acc;
        }, {});

        const data = Array.from(subjectMap.values()).map((item) => {
            const classCount = item.classIds.size;
            const studentCount = [...item.classIds].reduce((sum, classId) => sum + (studentCountByClass[classId] || 0), 0);
            return {
                id: item.id,
                name: item.name,
                classCount,
                studentCount,
            };
        });

        return res.status(200).json({
            success: true,
            data,
            message: "Teacher subjects fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
