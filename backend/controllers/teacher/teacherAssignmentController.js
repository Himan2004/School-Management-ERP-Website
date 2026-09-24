import mongoose from "mongoose";
import Homework from "../../models/academic/homework.model.js";
import HomeworkSubmission from "../../models/academic/HomeworkSubmission.model.js";
import Class from "../../models/organization/organizationClass.js";
import Student from "../../models/users/student.model.js";
import Teacher from "../../models/users/teacher.model.js";

// @desc    Get assignments with Pagination, Search, Filters, and Dynamic Stats
// @route   GET /api/teacher/assignments
export const getAssignments = async (req, res) => {
    try {
        const { search, priority, status, targetClass, sortDate, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        const now = new Date();

        // 1. Build the dynamic query filter
        let query = { teacher: req.user._id, isActive: true };

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (priority && priority !== 'all') {
            query.priority = priority.toLowerCase();
        }
        if (targetClass && targetClass !== 'All Classes') {
            query.class = targetClass; // targetClass is passed as the Class ID from frontend
        }
        if (status === 'active') {
            query.dueDate = { $gte: now };
        } else if (status === 'completed') {
            query.dueDate = { $lt: now };
        }

        // Sorting logic
        let sortOptions = { dueDate: -1 }; // Newest first by default
        if (sortDate === 'earliest') {
            sortOptions.dueDate = 1; // Oldest first
        }

        // 2. Fetch Assignments with Pagination
        const totalAssignmentsCount = await Homework.countDocuments(query);
        const assignments = await Homework.find(query)
            .populate('class', 'name numericLevel')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // 3. Calculate dynamic Submissions & Status for the table
        const formattedAssignments = await Promise.all(assignments.map(async (assignment) => {
            const classId = assignment.class?._id;
            const totalStudents = (classId && mongoose.Types.ObjectId.isValid(classId))
                ? await Student.countDocuments({ class: classId, status: 'active' })
                : 0;
            const submittedCount = await HomeworkSubmission.countDocuments({ homework: assignment._id });
            
            let calculatedStatus = 'active';
            if (new Date(assignment.dueDate) < now) calculatedStatus = 'completed';
            
            if (status && status !== 'all' && status !== calculatedStatus) return null;

            return {
                id: assignment._id,
                title: assignment.title,
                description: assignment.description, // <-- ADDED THIS
                classId: assignment.class?._id,      // <-- ADDED THIS
                class: assignment.class?.name || 'Class',
                dueDate: assignment.dueDate,
                submissions: submittedCount,
                totalStudents: totalStudents,
                status: calculatedStatus,
                priority: assignment.priority,
                attachments: assignment.attachments
            };
        }));

        // 4. Calculate Accurate Dynamic Top Stats Cards
        const allTeacherAssignments = await Homework.find({ teacher: req.user._id, isActive: true });
        let activeCount = 0;
        let pendingCount = 0; 
        let gradedCount = 0; 

        for (let hw of allTeacherAssignments) {
            if (new Date(hw.dueDate) >= now) activeCount++;
            
            // Accurately count the statuses of all submissions for these assignments
            const subs = await HomeworkSubmission.find({ homework: hw._id });
            for (let sub of subs) {
                if (sub.status === 'submitted' || sub.status === 'late') pendingCount++;
                if (sub.status === 'graded') gradedCount++;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                assignments: formattedAssignments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalAssignmentsCount / limit),
                    totalItems: totalAssignmentsCount
                },
                stats: {
                    total: allTeacherAssignments.length,
                    active: activeCount,
                    pending: pendingCount,
                    graded: gradedCount 
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assigned classes for the logged-in teacher
// @route   GET /api/teacher/assignments/classes
export const getTeacherClasses = async (req, res) => {
    try {
        const teacherProfile = await Teacher.findOne({ user: req.user._id })
            .populate('assignedClasses', 'name numericLevel');

        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        res.status(200).json({ success: true, data: teacherProfile.assignedClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Assignment 
// @route   POST /api/teacher/assignments
export const createAssignment = async (req, res) => {
    try {
        const { title, description, classId, dueDate, priority, attachments } = req.body;
        
        let orgId = req.user.organization;
        if (!orgId && req.user.school && req.user.school.organization) {
            orgId = req.user.school.organization;
        }
        if (!orgId) {
            orgId = req.user.school?._id || req.user.school; 
        }

        let subjectId = req.user.subject;
        if (!subjectId) {
            const teacherProfile = await Teacher.findOne({ user: req.user._id });
            if (teacherProfile && teacherProfile.subjects && teacherProfile.subjects.length > 0) {
                subjectId = teacherProfile.subjects[0]; 
            }
        }

        if (!subjectId) {
            return res.status(400).json({ 
                success: false, 
                message: "Validation Error: You must be assigned to at least one subject." 
            });
        }

        const newAssignment = new Homework({
            organization: orgId,
            school: req.user.school?._id || req.user.school,
            teacher: req.user._id,
            title,
            description,
            class: classId,
            subject: subjectId,
            dueDate,
            priority,
            attachments: attachments || []
        });

        await newAssignment.save();
        res.status(201).json({ success: true, message: "Assignment created", data: newAssignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Submissions for grading page
// @route   GET /api/teacher/assignments/:id/submissions
export const getAssignmentSubmissions = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const assignment = await Homework.findById(assignmentId);
        if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

        const students = (assignment.class && mongoose.Types.ObjectId.isValid(assignment.class))
            ? await Student.find({ class: assignment.class, status: 'active' }).populate('user', 'name')
            : [];
        const submissions = await HomeworkSubmission.find({ homework: assignmentId });
        const subMap = new Map(submissions.map(s => [s.student.toString(), s]));

        const studentSubmissions = students.map(student => {
            const sub = subMap.get(student.user._id.toString());
            return {
                studentId: student.user._id,
                rollNo: student.rollNo,
                student: student.user.name,
                submittedDate: sub ? sub.submittedAt : null,
                status: sub ? sub.status : 'pending',
                grade: sub ? sub.grade : '',
                feedback: sub ? sub.teacherFeedback : '',
                fileUrl: sub ? sub.fileUrl : null
            };
        });

        res.status(200).json({ success: true, data: studentSubmissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Save Grades
// @route   PUT /api/teacher/assignments/:id/grades
export const saveGrades = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { gradesData } = req.body; 

        const bulkOps = gradesData.map(data => ({
            updateOne: {
                filter: { homework: assignmentId, student: data.studentId },
                update: { 
                    $set: { 
                        grade: data.grade, 
                        teacherFeedback: data.feedback, 
                        status: 'graded',
                        gradedAt: new Date()
                    } 
                },
                upsert: true // Added upsert just in case the student hasn't officially uploaded a file but teacher wants to grade
            }
        }));

        if (bulkOps.length > 0) {
            await HomeworkSubmission.bulkWrite(bulkOps);
        }

        res.status(200).json({ success: true, message: "Grades saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Assignment
// @route   PUT /api/teacher/assignments/:id
export const updateAssignment = async (req, res) => {
    try {
        const updated = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete Assignment
// @route   DELETE /api/teacher/assignments/:id
export const deleteAssignment = async (req, res) => {
    try {
        await Homework.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Assignment deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};