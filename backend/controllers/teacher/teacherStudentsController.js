import mongoose from "mongoose";
import fs from "fs";
import Student from "../../models/users/student.model.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import User from "../../models/users/user.model.js";
import Parent from "../../models/users/parent.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import StudentLeave from "../../models/academic/StudentLeave.model.js";
import Notice from "../../models/common/Notice.js";
import StaffMeeting from "../../models/HRM/StaffMeeting.model.js";
import Event from "../../models/common/Event.js";
import Announcement from "../../models/academic/Announcement.model.js";
import HomeworkSubmission from "../../models/academic/HomeworkSubmission.model.js";
import BehaviourLog from "../../models/common/BehaviousLog.js";
import StudentDocument from "../../models/common/StudentDocument.js";
import Notification from "../../models/common/Notification.js";
import cloudinary from "../../config/cloudinary.js";
import { Readable } from "stream";


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

const getMarksheetModel = async () =>
    loadOptionalModel(
        ["Marksheet", "marksheet"],
        [
            "../../models/academic/marksheet.model.js",
            "../../models/academic/Marksheet.model.js",
        ]
    );

const gradeFromPercent = (percent) => {
    if (percent >= 90) return "A";
    if (percent >= 80) return "B";
    if (percent >= 70) return "C";
    if (percent >= 60) return "D";
    return "E";
};

const getStudentSectionLabel = (student) => {
    if (!student?.section) return "";
    if (typeof student.section === "string") return student.section;
    return student.section?.name || student.section?._id?.toString() || "";
};

const matchSection = (student, sectionValue) => {
    if (!sectionValue) return true;
    const label = getStudentSectionLabel(student);
    return label === sectionValue || label.toString() === sectionValue.toString();
};

const formatAddress = (addressObj) => {
    if (!addressObj || typeof addressObj !== "object") return "";
    const parts = [addressObj.street, addressObj.city, addressObj.state, addressObj.pincode].filter(Boolean);
    return parts.join(", ");
};

const getTeacherClasses = async (teacherId, schoolId) => {
    const assignments = await SubjectAssignment.find({
        teacherUser: teacherId,
        school: schoolId,
    }).select("class section academicYear");
    return assignments;
};

const buildHomeworkClassConditions = (classId) => ([
    { class: classId },
    { classId: classId },
    { assignedClass: classId },
    { classes: classId },
    { "target.class": classId },
]);

const buildAttendanceMap = (records) => {
    const map = new Map();
    records.forEach((record) => {
        (record.entries || []).forEach((entry) => {
            const studentId = entry.student?.toString();
            if (!studentId) return;
            const current = map.get(studentId) || { present: 0, total: 0, late: 0, absent: 0, leave: 0 };
            current.total += 1;
            if (entry.status === "present") current.present += 1;
            if (entry.status === "late") current.late += 1;
            if (entry.status === "absent") current.absent += 1;
            if (entry.status === "on_leave") current.leave += 1;
            map.set(studentId, current);
        });
    });
    return map;
};

const getLatestMarksheets = (marksheets) => {
    const latestByStudent = new Map();
    marksheets.forEach((sheet) => {
        const studentId = sheet.student?.toString();
        if (!studentId) return;
        if (!latestByStudent.has(studentId)) {
            latestByStudent.set(studentId, sheet);
        }
    });
    return latestByStudent;
};

export const getMyStudents = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const { class: classFilter, section: sectionFilter, search, sortBy, status } = req.query;

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                teacherId,
                schoolId,
                reqUser: { _id: req.user?._id, name: req.user?.name, role: req.user?.role },
                query: req.query
            };
            fs.appendFileSync('c:/schoolgraphura-code/Graphura-School-Management-ERP/backend/scratch/request_logs.txt', JSON.stringify(logEntry, null, 2) + '\n');
        } catch (e) {}

        const assignments = await SubjectAssignment.find({ teacherUser: teacherId, school: schoolId })
            .populate("class", "name")
            .lean();

        if (!assignments.length) {
            return res.status(200).json({
                success: true,
                data: { students: [], total: 0, classes: [] },
                message: "No class assignments found",
            });
        }

        const matchesClass = (assignment) => {
            if (!classFilter) return true;
            const classId = assignment.class?._id?.toString() || assignment.class?.toString();
            const className = assignment.class?.name || "";
            return classId === classFilter || className === classFilter;
        };

        const matchesSectionValue = (assignment) => {
            if (!sectionFilter) return true;
            return String(assignment.section) === String(sectionFilter);
        };

        const filteredAssignments = assignments.filter((assignment) => matchesClass(assignment) && matchesSectionValue(assignment));

        if ((classFilter || sectionFilter) && filteredAssignments.length === 0) {
            return res.status(403).json({
                success: false,
                data: null,
                message: "Access denied for the selected class/section",
            });
        }

        const classIds = [...new Set(filteredAssignments.map((a) => a.class?._id?.toString() || a.class?.toString()).filter(id => id && mongoose.Types.ObjectId.isValid(id)))]
            .map((id) => new mongoose.Types.ObjectId(id));

        let students = await Student.find({
            school: schoolId,
            class: { $in: classIds },
            ...(status ? { status } : {}),
        })
            .populate("user", "name email photo")
            .populate("class", "name")
            .populate("section", "name")
            .populate({
                path: "parent",
                populate: {
                    path: "user",
                    select: "name email"
                }
            })
            .lean();

        students = students.filter((student) => {
            const classId = student.class?._id?.toString() || student.class?.toString();
            const assignmentMatch = filteredAssignments.find((assignment) => {
                const assignClassId = assignment.class?._id?.toString() || assignment.class?.toString();
                if (assignClassId !== classId) return false;
                return matchSection(student, assignment.section);
            });
            return Boolean(assignmentMatch);
        });

        if (search) {
            const lowered = String(search).toLowerCase();
            students = students.filter((student) => {
                const name = student.user?.name?.toLowerCase() || "";
                const email = student.user?.email?.toLowerCase() || "";
                const rollNo = String(student.rollNo || "").toLowerCase();
                return name.includes(lowered) || email.includes(lowered) || rollNo.includes(lowered);
            });
        }

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date();
        monthEnd.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            school: schoolId,
            class: { $in: classIds },
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();
        const attendanceMap = buildAttendanceMap(attendanceRecords);

        const HomeworkModel = await getHomeworkModel();
        let homeworkSubmissionsMap = new Map();
        if (HomeworkModel) {
            const classConditions = classIds.flatMap((id) => buildHomeworkClassConditions(id));
            const homeworkDocs = await HomeworkModel.find({
                createdBy: teacherId,
                $and: [
                    {
                        $or: [
                            { school: schoolId },
                            { schoolId },
                        ],
                    },
                    { $or: classConditions },
                ],
            }).lean();

            homeworkDocs.forEach((hw) => {
                const submissions = Array.isArray(hw.submissions) ? hw.submissions : [];
                submissions.forEach((submission) => {
                    const studentId = submission?.student?.toString();
                    if (!studentId) return;
                    homeworkSubmissionsMap.set(studentId, (homeworkSubmissionsMap.get(studentId) || 0) + 1);
                });
            });
        }

        const MarksheetModel = await getMarksheetModel();
        let latestMarksheetsMap = new Map();
        if (MarksheetModel) {
            const studentUserIds = students.map((student) => student.user?._id).filter(Boolean);
            const marksheets = await MarksheetModel.find({
                school: schoolId,
                student: { $in: studentUserIds },
                status: "published",
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean();
            latestMarksheetsMap = getLatestMarksheets(marksheets);
        }

        const responseRows = students.map((student) => {
            const studentUserId = student.user?._id?.toString() || "";
            const attendanceData = attendanceMap.get(studentUserId) || { present: 0, total: 0 };
            const attendancePercent = attendanceData.total
                ? Number(((attendanceData.present / attendanceData.total) * 100).toFixed(2))
                : 0;

            const latestSheet = latestMarksheetsMap.get(studentUserId);
            const performancePercent = latestSheet?.percentage ?? null;
            const performanceGrade = latestSheet?.overallGrade || (typeof performancePercent === "number" ? gradeFromPercent(performancePercent) : "N/A");

            return {
                id: student._id,
                userId: student.user?._id || "",
                parentUserId: student.parent?.user?._id || "",
                parentName: student.parent?.user?.name || student.parentName || "",
                parentEmail: student.parent?.user?.email || student.parentEmail || "",
                name: student.user?.name || "",
                email: student.user?.email || "",
                photo: student.user?.photo || "",
                rollNo: student.rollNo || "",
                class: student.class?.name || "",
                section: getStudentSectionLabel(student),
                status: student.status || "",
                attendance: attendancePercent,
                assignments: homeworkSubmissionsMap.get(studentUserId) || 0,
                performance: performanceGrade,
                performanceScore: typeof performancePercent === "number" ? performancePercent : 0,
                parentContact: student.parent?.primaryContact || "",
            };
        });

        if (sortBy) {
            responseRows.sort((a, b) => {
                if (sortBy === "name") return a.name.localeCompare(b.name);
                if (sortBy === "rollNo") return String(a.rollNo).localeCompare(String(b.rollNo));
                if (sortBy === "attendance") return (b.attendance || 0) - (a.attendance || 0);
                if (sortBy === "performance") {
                    return (b.performanceScore || 0) - (a.performanceScore || 0);
                }
                return 0;
            });
        }

        const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
        const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : responseRows.length || 1;
        const startIndex = (page - 1) * limit;
        const pagedStudents = responseRows.slice(startIndex, startIndex + limit)
            .map(({ performanceScore, ...rest }) => rest);

        const classMap = new Map();
        assignments.forEach((assignment) => {
            const classId = assignment.class?._id?.toString() || assignment.class?.toString() || "";
            const section = assignment.section || "";
            const key = `${classId}_${section}`;
            if (!classMap.has(key)) {
                classMap.set(key, {
                    id: assignment.class?._id || assignment.class,
                    name: assignment.class?.name || "",
                    section,
                });
            }
        });
        const classes = Array.from(classMap.values());

        try {
            const logData = {
                timestamp: new Date().toISOString(),
                teacherId: req.user?._id,
                teacherName: req.user?.name,
                query: req.query,
                assignmentsCount: assignments.length,
                studentsCount: responseRows.length,
                pagedStudentsCount: pagedStudents.length
            };
            fs.appendFileSync('c:/schoolgraphura-code/Graphura-School-Management-ERP/backend/scratch/request_logs.txt', JSON.stringify(logData, null, 2) + '\n');
        } catch (e) {
            // ignore logging error
        }

        return res.status(200).json({
            success: true,
            data: {
                students: pagedStudents,
                total: responseRows.length,
                classes,
            },
            message: "Students fetched successfully",
        });
    } catch (error) {
        try {
            const logError = {
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            };
            fs.appendFileSync('c:/schoolgraphura-code/Graphura-School-Management-ERP/backend/scratch/request_logs.txt', JSON.stringify(logError, null, 2) + '\n');
        } catch (e) {
            // ignore logging error
        }
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getStudentById = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, data: null, message: "Invalid student ID" });
        }

        const assignments = await getTeacherClasses(teacherId, schoolId);
        if (!assignments.length) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        const student = await Student.findById(studentId)
            .populate("user", "name email photo")
            .populate("class", "name")
            .populate("section", "name")
            .populate({ path: "parent", populate: { path: "user", select: "name email" } })
            .lean();

        if (!student) {
            return res.status(404).json({ success: false, data: null, message: "Student not found" });
        }

        const classId = student.class?._id?.toString() || student.class?.toString();
        const hasAccess = assignments.some((assignment) => {
            const assignClassId = assignment.class?.toString();
            if (assignClassId !== classId) return false;
            return matchSection(student, assignment.section);
        });

        if (!hasAccess) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        // Attendance Calculations
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            school: schoolId,
            class: student.class?._id || student.class,
            ...(student.section ? { section: getStudentSectionLabel(student) } : {}),
            date: { $gte: thirtyDaysAgo, $lte: todayEnd },
        }).lean();

        const attendanceMap = buildAttendanceMap(attendanceRecords);
        const studentUserId = student.user?._id?.toString() || "";
        const attendanceData = attendanceMap.get(studentUserId) || { present: 0, absent: 0, late: 0, total: 0 };
        const attendancePercent = attendanceData.total
            ? Number(((attendanceData.present / attendanceData.total) * 100).toFixed(2))
            : 0;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date();
        monthEnd.setHours(23, 59, 59, 999);

        const monthlyAttendanceRecords = await Attendance.find({
            school: schoolId,
            class: student.class?._id || student.class,
            ...(student.section ? { section: getStudentSectionLabel(student) } : {}),
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();
        const monthlyMap = buildAttendanceMap(monthlyAttendanceRecords);
        const monthlyData = monthlyMap.get(studentUserId) || { present: 0, absent: 0, late: 0, total: 0 };

        const sixMonthsAgo = new Date(monthStart);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

        const monthlyTrendRecords = await Attendance.find({
            school: schoolId,
            class: student.class?._id || student.class,
            ...(student.section ? { section: getStudentSectionLabel(student) } : {}),
            date: { $gte: sixMonthsAgo, $lte: monthEnd },
        }).lean();

        const monthlyTrendMap = new Map();
        monthlyTrendRecords.forEach((record) => {
            (record.entries || []).forEach((entry) => {
                const entryStudentId = entry.student?.toString();
                if (entryStudentId !== studentUserId) return;
                const date = new Date(record.date);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                const current = monthlyTrendMap.get(key) || { present: 0, total: 0, month: date.toLocaleDateString("en-US", { month: "short" }) };
                current.total += 1;
                if (entry.status === "present") current.present += 1;
                monthlyTrendMap.set(key, current);
            });
        });

        const monthlyTrend = Array.from(monthlyTrendMap.values()).map((item) => ({
            month: item.month,
            percentage: item.total ? Number(((item.present / item.total) * 100).toFixed(2)) : 0,
        }));

        // YTD Attendance Totals
        const ytdAttendanceRecords = await Attendance.find({
            school: schoolId,
            class: student.class?._id || student.class,
            "entries.student": studentUserId
        }).lean();

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let totalLeave = 0;

        ytdAttendanceRecords.forEach(record => {
            const entry = record.entries.find(e => e.student?.toString() === studentUserId);
            if (entry) {
                if (entry.status === 'present') totalPresent++;
                else if (entry.status === 'absent') totalAbsent++;
                else if (entry.status === 'late') totalLate++;
                else if (entry.status === 'on_leave') totalLeave++;
            }
        });

        // Subjects Assignment
        const classSubjectAssignments = await SubjectAssignment.find({
            school: schoolId,
            class: student.class?._id || student.class
        }).populate("subject", "subjectName name").lean();
        const currentSubjects = [...new Set(classSubjectAssignments.map(s => s.subject?.subjectName || s.subject?.name).filter(Boolean))];

        // Performance & Exam History
        const MarksheetModel = await getMarksheetModel();
        let performanceData = {
            latestGrade: "N/A",
            overallPercentage: 0,
            subjectWise: [],
            examSubjectHistory: [],
        };

        if (MarksheetModel) {
            const marksheets = await MarksheetModel.find({
                school: schoolId,
                student: student.user?._id,
                status: "published",
            })
                .populate("subjectMarks.subject", "subjectName name")
                .populate("examStructure", "examName")
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean();

            if (marksheets.length) {
                const latest = marksheets[0];
                const overallPercentage = marksheets.reduce((sum, sheet) => sum + (sheet.percentage || 0), 0) / marksheets.length;
                const latestGrade = latest.overallGrade || gradeFromPercent(latest.percentage || 0);

                const subjectWise = (latest.subjectMarks || []).map((mark) => {
                    const subjectName = mark.subject?.subjectName || mark.subject?.name || "Subject";
                    const score = mark.maxMarks ? Number(((mark.totalMarks || 0) / mark.maxMarks) * 100).toFixed(2) : 0;
                    return {
                        subject: subjectName,
                        score: Number(score),
                        grade: mark.grade || gradeFromPercent(Number(score)),
                    };
                });

                const examSubjectHistory = [];
                marksheets.forEach((sheet) => {
                    const examName = sheet.examStructure?.examName || "Exam";
                    (sheet.subjectMarks || []).forEach((mark) => {
                        const subjectName = mark.subject?.subjectName || mark.subject?.name || "Subject";
                        const scoreObtained = mark.totalMarks || 0;
                        const maxMarks = mark.maxMarks || 100;
                        const percentage = maxMarks ? Number(((scoreObtained / maxMarks) * 100).toFixed(2)) : 0;
                        const grade = mark.grade || gradeFromPercent(percentage);
                        examSubjectHistory.push({
                            examName,
                            subject: subjectName,
                            marksObtained: scoreObtained,
                            totalMarks: maxMarks,
                            percentage,
                            grade,
                        });
                    });
                });

                performanceData = {
                    latestGrade,
                    overallPercentage: Number(overallPercentage.toFixed(2)),
                    subjectWise,
                    examSubjectHistory,
                };
            }
        }

        // Homework History and Stats using separate HomeworkSubmission model
        const HomeworkModel = await getHomeworkModel();
        let homeworkStats = { submitted: 0, pending: 0, notSubmitted: 0, lateSubmission: 0, total: 0 };
        let homeworkHistory = [];

        if (HomeworkModel) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const homeworkDocs = await HomeworkModel.find({
                school: schoolId,
                class: student.class?._id || student.class
            }).populate("subject", "subjectName name").lean();

            const submissions = await HomeworkSubmission.find({
                student: student.user?._id || student.user
            }).lean();

            homeworkDocs.forEach((hw) => {
                const submission = submissions.find(s => s.homework?.toString() === hw._id?.toString());
                const dueDate = hw.dueDate ? new Date(hw.dueDate) : null;
                
                let status = "pending";
                let submittedAt = null;
                let grade = null;
                let feedback = null;

                if (submission) {
                    submittedAt = submission.submittedAt;
                    grade = submission.grade;
                    feedback = submission.teacherFeedback;
                    const subDate = new Date(submission.submittedAt);
                    if (submission.status === 'late' || (dueDate && subDate > dueDate)) {
                        status = "late";
                        homeworkStats.lateSubmission += 1;
                    } else {
                        status = "submitted";
                    }
                    homeworkStats.submitted += 1;
                } else {
                    if (dueDate && dueDate < todayStart) {
                        status = "notSubmitted";
                        homeworkStats.notSubmitted += 1;
                        homeworkStats.lateSubmission += 1;
                    } else {
                        status = "pending";
                        homeworkStats.pending += 1;
                    }
                }

                homeworkHistory.push({
                    id: hw._id,
                    title: hw.title,
                    subject: hw.subject?.subjectName || hw.subject?.name || "Subject",
                    assignedDate: hw.createdAt,
                    dueDate: hw.dueDate,
                    status,
                    submittedAt,
                    grade,
                    feedback
                });
            });
            homeworkStats.total = homeworkDocs.length;
        }

        // Aggregated Notifications & Notices
        const aggregatedNotifications = [];

        // 1. Announcements (Teacher notices / School-wide announcements)
        try {
            const announcements = await Announcement.find({ school: schoolId, isActive: true })
                .populate("author", "name role")
                .lean();
            announcements.forEach((ann) => {
                const role = ann.author?.role === 'principal' ? 'Principal' : 'Teacher';
                aggregatedNotifications.push({
                    title: ann.title || "Announcement",
                    message: ann.description || "",
                    createdBy: ann.authorNameLabel || ann.author?.name || "Teacher",
                    source: role,
                    date: ann.createdAt || new Date()
                });
            });
        } catch (err) {
            console.error("Error fetching announcements in getStudentById:", err);
        }

        // 2. Notices (Principal / Super Admin notices)
        try {
            const notices = await Notice.find({
                school: schoolId,
                status: "published",
                targetAudience: { $in: ["all", "students"] }
            }).populate("createdBy", "name role").lean();
            notices.forEach((notice) => {
                const isSuperAdmin = notice.createdBy?.role === "superadmin";
                aggregatedNotifications.push({
                    title: notice.title || "Notice",
                    message: notice.content || "",
                    createdBy: notice.createdBy?.name || (isSuperAdmin ? "Super Admin" : "Principal"),
                    source: isSuperAdmin ? "Super Admin" : "Principal",
                    date: notice.createdAt || new Date()
                });
            });
        } catch (err) {
            console.error("Error fetching notices in getStudentById:", err);
        }

        // 3. Meetings (Principal meetings)
        try {
            const meetings = await StaffMeeting.find({
                school: schoolId,
                status: { $in: ["scheduled", "ongoing"] },
                targetRoles: { $in: ["all", "students"] }
            }).populate("createdBy", "name role").lean();
            meetings.forEach((meeting) => {
                const agenda = meeting.agenda || "No agenda provided";
                const venue = meeting.venue || "School Campus";
                const timeStr = new Date(meeting.scheduledAt).toLocaleString();
                aggregatedNotifications.push({
                    title: meeting.title || "Meeting",
                    message: `Meeting Agenda: ${agenda}. Scheduled time: ${timeStr}. Venue: ${venue}.`,
                    createdBy: meeting.createdBy?.name || "Principal",
                    source: "Principal",
                    date: meeting.createdAt || new Date()
                });
            });
        } catch (err) {
            console.error("Error fetching meetings in getStudentById:", err);
        }

        // 4. Events (Principal events)
        try {
            const events = await Event.find({
                school: schoolId,
                status: { $in: ["Scheduled", "Ongoing", "Mandatory"] }
            }).lean();
            events.forEach((event) => {
                const desc = event.description || "No description provided";
                const dateStr = new Date(event.eventDate).toLocaleDateString();
                const venue = event.venue || "School Campus";
                aggregatedNotifications.push({
                    title: event.title || "Event",
                    message: `Event: ${desc}. Date: ${dateStr} at ${event.startTime || '09:00'}. Venue: ${venue}.`,
                    createdBy: event.createdBy || "Principal",
                    source: "Principal",
                    date: event.createdAt || new Date()
                });
            });
        } catch (err) {
            console.error("Error fetching events in getStudentById:", err);
        }

        aggregatedNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));

        const recentLeaves = await StudentLeave.find({ student: student.user?._id, school: schoolId })
            .select("leaveType fromDate toDate status reason")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                id: student._id,
                name: student.user?.name || "",
                email: student.user?.email || "",
                photo: student.user?.photo || student.photo || "",
                rollNo: student.rollNo || "",
                enrollmentNo: student.enrollmentNo || "",
                class: student.class?.name || "",
                section: getStudentSectionLabel(student),
                dateOfBirth: student.dateOfBirth || null,
                gender: student.gender || "",
                bloodGroup: student.bloodGroup || "",
                address: formatAddress(student.parent?.address),
                status: student.status || "",
                fatherName: student.parent?.fatherName || "",
                motherName: student.parent?.motherName || "",
                guardianName: student.parent?.profileExtras?.guardianName || "",
                parent: {
                    name: student.parent?.user?.name || student.parent?.fatherName || "",
                    phone: student.parent?.primaryContact || "",
                    email: student.parent?.user?.email || "",
                },
                attendance: {
                    percentage: attendancePercent,
                    totalPresent,
                    totalAbsent,
                    totalLate,
                    totalLeave,
                    thisMonth: {
                        present: monthlyData.present || 0,
                        absent: monthlyData.absent || 0,
                        late: monthlyData.late || 0,
                        total: monthlyData.total || 0,
                    },
                    monthlyTrend,
                },
                performance: performanceData,
                homework: homeworkStats,
                homeworkHistory,
                notifications: aggregatedNotifications,
                subjects: currentSubjects,
                recentLeaves: recentLeaves.map((leave) => ({
                    type: leave.leaveType,
                    fromDate: leave.fromDate,
                    toDate: leave.toDate,
                    status: leave.status,
                    reason: leave.reason,
                })),
            },
            message: "Student details fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getStudentStats = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);

        const assignments = await getTeacherClasses(teacherId, schoolId);
        if (!assignments.length) {
            return res.status(200).json({
                success: true,
                data: {
                    totalStudents: 0,
                    activeStudents: 0,
                    inactiveStudents: 0,
                    lowAttendanceStudents: 0,
                    topPerformers: 0,
                    classWiseCount: [],
                },
                message: "No class assignments found",
            });
        }

        const classIds = [...new Set(assignments.map((a) => a.class?.toString()).filter(id => id && mongoose.Types.ObjectId.isValid(id)))]
            .map((id) => new mongoose.Types.ObjectId(id));

        let students = await Student.find({ school: schoolId, class: { $in: classIds } })
            .populate("class", "name")
            .populate("section", "name")
            .lean();

        students = students.filter((student) => assignments.some((assignment) => {
            if (assignment.class?.toString() !== (student.class?._id?.toString() || student.class?.toString())) return false;
            return matchSection(student, assignment.section);
        }));

        const totalStudents = students.length;
        const activeStudents = students.filter((student) => student.status === "active").length;
        const inactiveStudents = totalStudents - activeStudents;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date();
        monthEnd.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            school: schoolId,
            class: { $in: classIds },
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();
        const attendanceMap = buildAttendanceMap(attendanceRecords);

        const lowAttendanceStudents = students.filter((student) => {
            const studentUserId = student.user?.toString();
            const entry = attendanceMap.get(studentUserId);
            if (!entry || !entry.total) return false;
            const percent = (entry.present / entry.total) * 100;
            return percent < 75;
        }).length;

        let topPerformers = 0;
        const MarksheetModel = await getMarksheetModel();
        if (MarksheetModel) {
            const studentUserIds = students.map((student) => student.user).filter(Boolean);
            const marksheets = await MarksheetModel.find({
                school: schoolId,
                student: { $in: studentUserIds },
                status: "published",
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean();

            const latestMap = getLatestMarksheets(marksheets);
            topPerformers = Array.from(latestMap.values()).filter((sheet) => (sheet.percentage || 0) >= 90).length;
        }

        const classWiseCountMap = new Map();
        students.forEach((student) => {
            const className = student.class?.name || "";
            const section = getStudentSectionLabel(student);
            const key = `${className}_${section}`;
            classWiseCountMap.set(key, {
                className,
                section,
                count: (classWiseCountMap.get(key)?.count || 0) + 1,
            });
        });

        return res.status(200).json({
            success: true,
            data: {
                totalStudents,
                activeStudents,
                inactiveStudents,
                lowAttendanceStudents,
                topPerformers,
                classWiseCount: Array.from(classWiseCountMap.values()),
            },
            message: "Student stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getStudentAttendance = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, data: null, message: "Invalid student ID" });
        }

        const assignments = await getTeacherClasses(teacherId, schoolId);
        if (!assignments.length) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        const student = await Student.findById(studentId)
            .populate("section", "name")
            .lean();
        if (!student) {
            return res.status(404).json({ success: false, data: null, message: "Student not found" });
        }

        const hasAccess = assignments.some((assignment) => {
            if (assignment.class?.toString() !== (student.class?.toString() || "")) return false;
            return matchSection(student, assignment.section);
        });
        if (!hasAccess) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        const month = Number(req.query.month) || new Date().getMonth() + 1;
        const year = Number(req.query.year) || new Date().getFullYear();
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            school: schoolId,
            class: student.class,
            ...(student.section ? { section: getStudentSectionLabel(student) } : {}),
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();

        const attendanceMap = buildAttendanceMap(attendanceRecords);
        const studentUserId = student.user?.toString() || "";
        const entry = attendanceMap.get(studentUserId) || { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

        const calendar = {};
        attendanceRecords.forEach((record) => {
            const entryForStudent = (record.entries || []).find((e) => e.student?.toString() === studentUserId);
            if (!entryForStudent) return;
            const dateKey = new Date(record.date).toISOString().split("T")[0];
            calendar[dateKey] = entryForStudent.status;
        });

        const percentage = entry.total ? Number(((entry.present / entry.total) * 100).toFixed(2)) : 0;

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    present: entry.present || 0,
                    absent: entry.absent || 0,
                    late: entry.late || 0,
                    leave: entry.leave || 0,
                    total: entry.total || 0,
                    percentage,
                },
                calendar,
            },
            message: "Student attendance fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getStudentPerformance = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const schoolId = getSchoolId(req.user);
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, data: null, message: "Invalid student ID" });
        }

        const assignments = await getTeacherClasses(teacherId, schoolId);
        if (!assignments.length) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        const student = await Student.findById(studentId)
            .populate("section", "name")
            .lean();
        if (!student) {
            return res.status(404).json({ success: false, data: null, message: "Student not found" });
        }

        const hasAccess = assignments.some((assignment) => {
            if (assignment.class?.toString() !== (student.class?.toString() || "")) return false;
            return matchSection(student, assignment.section);
        });
        if (!hasAccess) {
            return res.status(403).json({ success: false, data: null, message: "Access denied" });
        }

        const MarksheetModel = await getMarksheetModel();
        if (!MarksheetModel) {
            return res.status(200).json({
                success: true,
                data: {
                    overallPercentage: 0,
                    grade: "N/A",
                    classRank: null,
                    totalStudents: 0,
                    subjectWise: [],
                    examHistory: [],
                },
                message: "Exam data not available",
            });
        }

        const marksheets = await MarksheetModel.find({
            school: schoolId,
            student: student.user,
            status: "published",
        })
            .populate("subjectMarks.subject", "subjectName name")
            .populate("examStructure", "examName")
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();

        if (!marksheets.length) {
            return res.status(200).json({
                success: true,
                data: {
                    overallPercentage: 0,
                    grade: "N/A",
                    classRank: null,
                    totalStudents: 0,
                    subjectWise: [],
                    examHistory: [],
                },
                message: "No exam data found",
            });
        }

        const overallPercentage = Number((marksheets.reduce((sum, sheet) => sum + (sheet.percentage || 0), 0) / marksheets.length).toFixed(2));
        const grade = gradeFromPercent(overallPercentage);
        const latest = marksheets[0];

        let classRank = latest.classRank || null;
        if (!classRank && latest.examSchedule) {
            const classMarksheets = await MarksheetModel.find({
                school: schoolId,
                class: latest.class,
                examSchedule: latest.examSchedule,
                status: "published",
            }).sort({ percentage: -1 }).lean();
            const index = classMarksheets.findIndex((sheet) => sheet.student?.toString() === student.user?.toString());
            classRank = index >= 0 ? index + 1 : null;
        }

        const totalStudents = await Student.countDocuments({ school: schoolId, class: student.class });

        const latestSubjectMarks = latest.subjectMarks || [];
        let classAverageMap = new Map();
        if (latest.examSchedule) {
            const classSheets = await MarksheetModel.find({
                school: schoolId,
                class: latest.class,
                examSchedule: latest.examSchedule,
                status: "published",
            }).lean();
            const subjectTotals = new Map();
            classSheets.forEach((sheet) => {
                (sheet.subjectMarks || []).forEach((mark) => {
                    const subjectId = mark.subject?.toString();
                    if (!subjectId || !mark.maxMarks) return;
                    const current = subjectTotals.get(subjectId) || { total: 0, count: 0 };
                    current.total += (mark.totalMarks || 0) / mark.maxMarks * 100;
                    current.count += 1;
                    subjectTotals.set(subjectId, current);
                });
            });
            classAverageMap = new Map(
                Array.from(subjectTotals.entries()).map(([key, value]) => [
                    key,
                    value.count ? Number((value.total / value.count).toFixed(2)) : 0,
                ])
            );
        }

        const subjectPerformanceHistory = new Map();
        marksheets.forEach((sheet) => {
            (sheet.subjectMarks || []).forEach((mark) => {
                const subjectId = mark.subject?.toString();
                if (!subjectId || !mark.maxMarks) return;
                if (!subjectPerformanceHistory.has(subjectId)) {
                    subjectPerformanceHistory.set(subjectId, []);
                }
                subjectPerformanceHistory.get(subjectId).push({
                    date: sheet.publishedAt || sheet.createdAt,
                    score: (mark.totalMarks || 0) / mark.maxMarks * 100,
                });
            });
        });

        const subjectWise = latestSubjectMarks.map((mark) => {
            const subjectName = mark.subject?.subjectName || mark.subject?.name || "Subject";
            const score = mark.maxMarks ? Number(((mark.totalMarks || 0) / mark.maxMarks) * 100).toFixed(2) : 0;
            const subjectId = mark.subject?._id?.toString() || mark.subject?.toString();
            const history = subjectId ? subjectPerformanceHistory.get(subjectId) || [] : [];
            const trend = history.length > 1
                ? history[0].score > history[1].score ? "up" : history[0].score < history[1].score ? "down" : "steady"
                : "steady";
            return {
                subject: subjectName,
                score: Number(score),
                classAverage: subjectId ? classAverageMap.get(subjectId) || null : null,
                trend,
            };
        });

        const examHistory = marksheets.map((sheet) => ({
            examName: sheet.examStructure?.examName || "Exam",
            date: sheet.publishedAt || sheet.createdAt,
            percentage: sheet.percentage || 0,
            grade: sheet.overallGrade || gradeFromPercent(sheet.percentage || 0),
        }));

        const examSubjectHistory = [];
        marksheets.forEach((sheet) => {
            const examName = sheet.examStructure?.examName || "Exam";
            (sheet.subjectMarks || []).forEach((mark) => {
                const subjectName = mark.subject?.subjectName || mark.subject?.name || "Subject";
                const scoreObtained = mark.totalMarks || 0;
                const maxMarks = mark.maxMarks || 100;
                const percentage = maxMarks ? Number(((scoreObtained / maxMarks) * 100).toFixed(2)) : 0;
                const grade = mark.grade || gradeFromPercent(percentage);
                examSubjectHistory.push({
                    examName,
                    subject: subjectName,
                    marksObtained: scoreObtained,
                    totalMarks: maxMarks,
                    percentage,
                    grade,
                });
            });
        });

        return res.status(200).json({
            success: true,
            data: {
                overallPercentage,
                grade,
                classRank,
                totalStudents,
                subjectWise,
                examHistory,
                examSubjectHistory,
            },
            message: "Student performance fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOUR LOGS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export const getBehaviourLogs = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const logs = await BehaviourLog.find({ school: schoolId })
            .populate("student", "name")
            .populate("raisedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const formatted = logs.map(log => {
            let severityLabel = "Warning";
            if (log.severity === "low") severityLabel = "Positive";
            else if (log.severity === "medium") severityLabel = "Warning";
            else if (log.severity === "high") severityLabel = "Complaint";

            return {
                id: log._id,
                date: log.createdAt.toISOString().slice(0, 10),
                student: log.student?.name || "Unknown Student",
                studentUserId: log.student?._id,
                type: severityLabel,
                description: log.remark || "",
                actionTaken: log.action || "Recorded",
                reportedBy: log.raisedBy?.name || "Faculty Reporter"
            };
        });

        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBehaviourLog = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { studentId, type, description, actionTaken } = req.body;

        if (!studentId || !description) {
            return res.status(400).json({ success: false, message: "Student and description are required." });
        }

        let severity = "medium";
        if (type === "Positive" || type === "Reward") severity = "low";
        else if (type === "Warning" || type === "Counselling") severity = "medium";
        else if (type === "Complaint") severity = "high";

        const newLog = await BehaviourLog.create({
            student: studentId,
            raisedBy: req.user._id,
            remark: description,
            action: actionTaken || "Recorded in file",
            severity,
            school: schoolId
        });

        res.status(201).json({ success: true, data: newLog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNICATION HUB ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export const getCommunicationLogs = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const teacherId = req.user._id;

        // Fetch sent parent notifications
        const messages = await Notification.find({
            school: schoolId,
            "metadata.senderId": teacherId,
            type: "message"
        })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .lean();

        // Fetch scheduled PTMs (StaffMeeting where meetingType is general and createdBy is the teacher)
        const meetings = await StaffMeeting.find({
            school: schoolId,
            createdBy: teacherId,
            meetingType: "general"
        })
        .sort({ createdAt: -1 })
        .lean();

        const formattedLogs = [];

        messages.forEach(msg => {
            formattedLogs.push({
                id: msg._id,
                recipient: msg.user?.name || "Parent",
                subject: msg.title || "Message from Class Teacher",
                message: msg.message || "",
                date: msg.createdAt.toISOString().slice(0, 16).replace("T", " "),
                status: "Sent"
            });
        });

        meetings.forEach(mt => {
            const formattedDate = new Date(mt.scheduledAt).toISOString().slice(0, 10);
            formattedLogs.push({
                id: mt._id,
                recipient: `${mt.className || "All Classes"} Parents`,
                subject: mt.title || "PTM Schedule Confirmation",
                message: `Scheduled PTM on ${formattedDate}. Agenda: ${mt.agenda || "General Academic performance review."}`,
                date: mt.createdAt.toISOString().slice(0, 16).replace("T", " "),
                status: "Scheduled"
            });
        });

        // Sort both combined by timestamp descending
        formattedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({ success: true, data: formattedLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendParentMessage = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { studentId, subject, body } = req.body;

        if (!studentId || !body) {
            return res.status(400).json({ success: false, message: "Student recipient and message body are required." });
        }

        // Find the student's parent user ID
        const studentProfile = await Student.findOne({ user: studentId }).populate("parent").lean();
        if (!studentProfile || !studentProfile.parent) {
            return res.status(404).json({ success: false, message: "Parent not found for this student." });
        }

        const parentUserId = studentProfile.parent.user || studentProfile.parent;

        const notif = await Notification.create({
            user: parentUserId,
            title: subject || "Message from Class Teacher",
            message: body,
            type: "message",
            school: schoolId,
            senderName: req.user.name,
            senderRole: "teacher",
            metadata: {
                student: studentProfile._id,
                senderId: req.user._id,
                subject: subject || "Message from Class Teacher"
            }
        });

        res.status(201).json({ success: true, data: notif });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const scheduleParentMeeting = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;
        const { studentId, date, time, agenda } = req.body;

        if (!studentId || !date) {
            return res.status(400).json({ success: false, message: "Student and date are required." });
        }

        const studentProfile = await Student.findOne({ user: studentId }).populate("class").lean();
        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student profile not found." });
        }

        const className = studentProfile.class?.name || "Class";
        const sectionName = studentProfile.section?.name || "A";

        // Parse scheduled time
        const startTimeStr = time || "10:00";
        const scheduledAt = new Date(`${date}T${startTimeStr}`);

        const newMeeting = await StaffMeeting.create({
            organization: organizationId,
            school: schoolId,
            title: `PTM Meeting - ${studentProfile.name || "Student"}`,
            agenda: agenda || "General Academic performance review.",
            meetingType: "general",
            scheduledAt,
            durationMinutes: 30,
            venue: "School Campus",
            isOnline: false,
            targetRoles: ["parents", "students"],
            className,
            sectionName,
            status: "scheduled",
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: newMeeting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS CENTER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export const getStudentDocuments = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const docs = await StudentDocument.find({ school: schoolId })
            .populate("student", "name")
            .sort({ createdAt: -1 })
            .lean();

        const formatted = docs.map(d => ({
            id: d._id,
            name: d.name,
            type: d.type,
            uploadDate: d.createdAt.toISOString().slice(0, 10),
            size: d.size || "1.2 MB",
            status: d.status,
            url: d.url
        }));

        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const streamToCloudinary = (buffer, folderName, isImage) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folderName,
                resource_type: isImage ? "image" : "raw",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
};

export const uploadStudentDocument = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;
        
        const { studentId, category, customFileName } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        if (!studentId || !category) {
            return res.status(400).json({ success: false, message: "Student and Category are required." });
        }

        const sizeInMb = (req.file.size / (1024 * 1024)).toFixed(2) + " MB";

        // Upload buffer directly to Cloudinary using stream
        const isImage = req.file.mimetype.startsWith("image/");
        const folderName = isImage ? "uploads/images" : "uploads/documents";
        const uploadResult = await streamToCloudinary(req.file.buffer, folderName, isImage);

        const newDoc = await StudentDocument.create({
            organization: organizationId,
            school: schoolId,
            student: studentId,
            name: customFileName || req.file.originalname,
            type: category,
            url: uploadResult.secure_url || uploadResult.url,
            size: sizeInMb,
            uploadedBy: req.user._id,
            status: "Pending Verification"
        });

        res.status(201).json({ success: true, data: newDoc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
