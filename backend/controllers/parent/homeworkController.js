import mongoose from "mongoose";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";

const loadOptionalModel = async (modelNames, importPaths) => {
    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    for (const filePath of importPaths) {
        try {
            await import(filePath);
        } catch (error) {
            // Model file may not exist; skip silently and continue fallback checks.
        }
    }

    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    return null;
};

const resolveContext = async (req, res) => {
    const { student_id } = req.query;
    const parent = await Parent.findOne({ user: req.user?._id });

    if (!parent || !parent.students?.length) {
        res.status(403).json({ success: false, data: null, message: "No students associated with this parent" });
        return null;
    }

    let resolvedStudentId = student_id || parent.students[0];
    if (student_id) {
        const isChild = parent.students.some((id) => id.toString() === student_id.toString());
        if (!isChild) {
            resolvedStudentId = parent.students[0];
        }
    }

    const studentProfile = await Student.findById(resolvedStudentId);
    if (!studentProfile) {
        res.status(200).json({ success: true, data: {}, message: "Student not found" });
        return null;
    }

    const studentSchoolId = studentProfile.school;
    if (!studentSchoolId) {
        res.status(400).json({ success: false, data: null, message: "Student has no school assigned" });
        return null;
    }

    return {
        studentProfile,
        schoolObjectId: new mongoose.Types.ObjectId(studentSchoolId),
    };
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

const getSyllabusModel = async () =>
    loadOptionalModel(
        ["Syllabus", "syllabus"],
        [
            "../../models/academic/syllabus.model.js",
            "../../models/academic/Syllabus.model.js",
            "../../models/academic/syllabusModel.js",
        ]
    );

const buildHomeworkQuery = (schoolObjectId, classId) => ({
    $and: [
        {
            $or: [
                { school: schoolObjectId },
                { schoolId: schoolObjectId },
            ],
        },
        {
            $or: [
                { class: classId },
                { classId: classId },
                { assignedClass: classId },
                { classes: classId },
                { "target.class": classId },
            ],
        },
    ],
});

const getHomeworkStatusForStudent = (homework, studentUserId) => {
    const rawStatus = String(homework?.status || "").toLowerCase();
    if (rawStatus === "completed") return "completed";
    if (rawStatus === "pending") return "pending";

    const submissions = Array.isArray(homework?.submissions) ? homework.submissions : [];
    const studentSubmission = submissions.find((sub) => sub?.student?.toString() === studentUserId.toString());
    const submissionStatus = String(studentSubmission?.status || "").toLowerCase();

    if (["submitted", "completed", "graded", "done"].includes(submissionStatus)) return "completed";
    if (studentSubmission) return "pending";

    return "pending";
};

const getSubjectValue = (homework) => {
    if (typeof homework?.subject === "string") return homework.subject;
    if (homework?.subject?.subjectName) return homework.subject.subjectName;
    if (homework?.subject?.name) return homework.subject.name;
    if (homework?.subjectName) return homework.subjectName;
    return "N/A";
};

const getHomeworkRows = (homeworkDocs, studentUserId) => {
    const now = new Date();
    return homeworkDocs.map((item) => {
        const status = getHomeworkStatusForStudent(item, studentUserId);
        const dueDate = item?.dueDate || item?.deadline || null;
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        const isPastDue = dueDateObj ? dueDateObj < now : false;
        const notSubmitted = status !== "completed" && isPastDue;

        const marksValue = item?.marks ?? item?.score ?? item?.grade ?? null;
        const marks = marksValue === null || marksValue === undefined ? "N/A" : marksValue;

        let result = "In Progress";
        if (status === "completed") {
            result = "Excellent";
        } else if (notSubmitted) {
            result = "Awaiting Submission";
        }

        return {
            id: item._id,
            subject: getSubjectValue(item),
            title: item?.title || item?.homeworkTitle || item?.topic || "Homework",
            dueDate,
            status,
            marks,
            improvement: item?.feedback || item?.teacherNote || item?.improvement || item?.remarks || "",
            result,
            __notSubmitted: notSubmitted,
        };
    });
};

export const getHomeworkStats = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const HomeworkModel = await getHomeworkModel();

        if (!HomeworkModel) {
            return res.status(200).json({
                success: true,
                data: {
                    totalHomework: 0,
                    completedHomework: 0,
                    pendingHomework: 0,
                    notSubmitted: 0,
                },
                message: "Homework model not found",
            });
        }

        const homeworkDocs = await HomeworkModel.find(buildHomeworkQuery(schoolObjectId, studentProfile.class))
            .populate("subject")
            .sort({ dueDate: -1, createdAt: -1 });

        const rows = getHomeworkRows(homeworkDocs, studentProfile.user);
        const totalHomework = rows.length;
        const completedHomework = rows.filter((row) => row.status === "completed").length;
        const pendingHomework = rows.filter((row) => row.status === "pending").length;
        const notSubmitted = rows.filter((row) => row.__notSubmitted).length;

        return res.status(200).json({
            success: true,
            data: {
                totalHomework,
                completedHomework,
                pendingHomework,
                notSubmitted,
            },
            message: "Homework stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getHomeworkList = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const HomeworkModel = await getHomeworkModel();

        if (!HomeworkModel) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "Homework model not found",
            });
        }

        const { status, subject } = req.query;
        const homeworkDocs = await HomeworkModel.find(buildHomeworkQuery(schoolObjectId, studentProfile.class))
            .populate("subject")
            .sort({ dueDate: -1, createdAt: -1 });

        let rows = getHomeworkRows(homeworkDocs, studentProfile.user).map(({ __notSubmitted, ...rest }) => rest);

        if (status) {
            const statusFilter = String(status).toLowerCase();
            rows = rows.filter((row) => row.status.toLowerCase() === statusFilter);
        }

        if (subject) {
            const subjectFilter = String(subject).toLowerCase();
            rows = rows.filter((row) => String(row.subject || "").toLowerCase().includes(subjectFilter));
        }

        return res.status(200).json({
            success: true,
            data: rows,
            message: "Homework list fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getSyllabusList = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const SyllabusModel = await getSyllabusModel();

        if (!SyllabusModel) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "Syllabus model not found",
            });
        }

        const query = {
            $and: [
                {
                    $or: [
                        { school: schoolObjectId },
                        { schoolId: schoolObjectId },
                    ],
                },
                {
                    $or: [
                        { class: studentProfile.class },
                        { classId: studentProfile.class },
                        { assignedClass: studentProfile.class },
                        { classes: studentProfile.class },
                        { "target.class": studentProfile.class },
                    ],
                },
            ],
        };

        if (studentProfile.academicYear) {
            query.$and.push({
                $or: [
                    { academicYear: studentProfile.academicYear },
                    { session: studentProfile.academicYear },
                    { year: studentProfile.academicYear },
                ],
            });
        }

        const syllabusDocs = await SyllabusModel.find(query).sort({ updatedAt: -1, createdAt: -1 });

        const data = syllabusDocs.map((item) => ({
            id: item._id,
            subject: typeof item?.subject === "string"
                ? item.subject
                : item?.subject?.name || item?.subjectName || "N/A",
            term: item?.term || item?.semester || item?.unit || "N/A",
            lastUpdated: item?.updatedAt || item?.createdAt || null,
            fileUrl: item?.fileUrl || item?.file || item?.documentUrl || null,
        }));

        return res.status(200).json({
            success: true,
            data,
            message: "Syllabus list fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
