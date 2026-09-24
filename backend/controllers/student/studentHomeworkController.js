import Homework from "../../models/academic/homework.model.js";
import HomeworkSubmission from "../../models/academic/HomeworkSubmission.model.js";
import Student from "../../models/users/student.model.js";
import Section from "../../models/school/Section.model.js"; // Ensure Section model is registered
import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { Readable } from "stream";

// ─── Helper: stream buffer → Cloudinary ──────────────────────────────────────
const streamToCloudinary = (buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "uploads/homework",
                resource_type: "auto",
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

// @desc    Get all homework for the logged-in student
// @route   GET /api/student/homework
export const getStudentHomework = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get the student's class, school, and section details
        const student = await Student.findOne({ user: userId });
        if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate('section');
        } else if (student.section) {
            student.section = { _id: null, name: student.section };
        }

        // 2. Fetch all active homework assigned to this class, school, and matching section
        const query = {
            class: student.class,
            isActive: true
        };

        if (student.school) {
            query.school = student.school;
        }

        const studentSectionId = student.section?._id?.toString() || student.section?.toString();
        const studentSectionName = typeof student.section === 'object' ? student.section?.name : null;

        const sectionOrConditions = [
            { section: { $exists: false } },
            { section: null },
            { section: "" }
        ];

        if (studentSectionId) sectionOrConditions.push({ section: studentSectionId });
        if (studentSectionName) sectionOrConditions.push({ section: studentSectionName });

        query.$or = sectionOrConditions;

        const homeworkList = await Homework.find(query)
            .populate('subject', 'name subjectName')
            .sort({ dueDate: 1 })
            .lean();

        const submissions = await HomeworkSubmission.find({ student: userId }).lean();
        const submissionMap = new Map(submissions.map(sub => [sub.homework.toString(), sub]));

        const now = new Date();

        const formattedHomework = homeworkList.map(hw => {
            const submission = submissionMap.get(hw._id.toString());

            let currentStatus = 'pending';
            if (submission) {
                currentStatus = 'submitted';
            } else if (new Date(hw.dueDate) < now) {
                currentStatus = 'overdue';
            }

            return {
                id: hw._id,
                title: hw.title,
                description: hw.description,
                subject: hw.subject?.subjectName || hw.subject?.name || "Subject",
                dueDate: hw.dueDate,
                priority: hw.priority,
                status: currentStatus,
                fileUrl: submission ? submission.fileUrl : null,
                grade: submission ? submission.grade : null,
                feedback: submission ? submission.teacherFeedback : null,
                attachments: hw.attachments || []
            };
        });

        res.status(200).json({ success: true, data: formattedHomework });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit a homework assignment (with file upload to Cloudinary)
// @route   POST /api/student/homework/:id/submit
// @access  Student
export const submitHomework = async (req, res) => {
    try {
        const homeworkId = req.params.id;
        const userId = req.user._id;

        // ── 1. Validate file exists in memory (multer already parsed it) ───────
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file received. Please select a PDF or DOC file and try again."
            });
        }

        // ── 2. Upload directly from memory buffer to Cloudinary ───────────────
        let cloudinaryResult;
        try {
            cloudinaryResult = await streamToCloudinary(req.file.buffer, req.file.mimetype);
        } catch (uploadErr) {
            console.error("Cloudinary upload failed:", uploadErr);
            return res.status(500).json({
                success: false,
                message: "Failed to upload file to cloud. Please try again."
            });
        }

        const fileUrl = cloudinaryResult.secure_url;
        const fileName = req.file.originalname;

        // ── 3. Validate homework exists ────────────────────────────────────────
        const homework = await Homework.findById(homeworkId);
        if (!homework) {
            return res.status(404).json({ success: false, message: "Homework not found" });
        }

        // ── 4. Upsert submission ───────────────────────────────────────────────
        const isLate = new Date() > new Date(homework.dueDate);

        await HomeworkSubmission.findOneAndUpdate(
            { homework: homeworkId, student: userId },
            {
                fileUrl,
                fileName,
                status: isLate ? 'late' : 'submitted',
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Homework submitted successfully!",
            data: { fileUrl, fileName }
        });

    } catch (error) {
        console.error("submitHomework error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};