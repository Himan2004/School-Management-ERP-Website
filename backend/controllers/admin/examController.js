import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import ExamStructure from "../../models/academic/examStructure.model.js";
import Exam from "../../models/academic/exam.model.js";
import Period from "../../models/modules/Period.js";
import Subject from "../../models/modules/Subject.js";
import AcademicConfig from "../../models/organization/AcademicConfig.js";

/**
 * @desc    Create a new exam schedule (Admin)
 * @route   POST /api/admin/exam/create-schedule
 * @access  Private (Admin)
 */
export const createExamSchedule = async (req, res) => {
    try {
        const { 
            examStructure, 
            academicYear, 
            class: classId, 
            section, 
            slots 
        } = req.body;

        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        const newSchedule = await ExamSchedule.create({
            organization: organizationId,
            school: schoolId,
            examStructure,
            academicYear,
            class: classId,
            section,
            slots,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Exam schedule created successfully",
            data: newSchedule
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update an exam schedule
 * @route   PUT /api/admin/exams/schedule/:id
 * @access  Private (Admin)
 */
export const updateExamSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSchedule = await ExamSchedule.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedSchedule) return res.status(404).json({ success: false, message: "Schedule not found" });
        res.status(200).json({ success: true, data: updatedSchedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete an exam schedule
 * @route   DELETE /api/admin/exams/schedule/:id
 * @access  Private (Admin)
 */
export const deleteExamSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ExamSchedule.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "Schedule not found" });
        res.status(200).json({ success: true, message: "Schedule deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all exam schedules for the school
 * @route   GET /api/admin/exam/schedules
 * @access  Private (Admin)
 */
export const getAdminExamSchedules = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const schedules = await ExamSchedule.find({ school: schoolId })
            .populate("class", "name")
            .populate("examStructure", "examName examType")
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
 * @desc    Get marksheets pending verification
 * @route   GET /api/admin/exam/pending-verification
 * @access  Private (Admin)
 */
export const getPendingVerifications = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const pending = await Marksheet.find({
            school: schoolId,
            status: "submitted"
        })
        .populate("student", "name rollNumber")
        .populate("class", "name")
        .populate({
            path: "examSchedule",
            populate: { path: "examStructure", select: "examName" }
        })
        .sort({ submittedAt: 1 });

        res.status(200).json({
            success: true,
            count: pending.length,
            data: pending
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get full marksheet details for verification
 * @route   GET /api/admin/exams/verify/:marksheetId
 * @access  Private (Admin)
 */
export const getMarksheetForVerification = async (req, res) => {
    try {
        const { marksheetId } = req.params;
        const marksheet = await Marksheet.findById(marksheetId)
            .populate("student", "name rollNumber")
            .populate({
                path: "examSchedule",
                populate: { 
                    path: "examStructure",
                    populate: { path: "subjectMarkings.subject", select: "subjectName" }
                }
            });

        if (!marksheet) return res.status(404).json({ success: false, message: "Marksheet not found" });
        res.status(200).json({ success: true, data: marksheet });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Verify and approve a marksheet
 * @route   PUT /api/admin/exam/verify/:marksheetId
 * @access  Private (Admin)
 */
export const verifyMarksheet = async (req, res) => {
    try {
        const { marksheetId } = req.params;

        const marksheet = await Marksheet.findByIdAndUpdate(
            marksheetId,
            {
                status: "verified",
                verifiedBy: req.user._id,
                verifiedAt: new Date()
            },
            { new: true }
        );

        if (!marksheet) {
            return res.status(404).json({ success: false, message: "Marksheet not found" });
        }

        res.status(200).json({
            success: true,
            message: "Marksheet verified successfully",
            data: marksheet
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * @desc    Get exam dashboard statistics for Admin
 * @route   GET /api/admin/exam/stats
 * @access  Private (Admin)
 */
export const getAdminExamStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const [totalSchedules, pendingVerifications, publishedResults] = await Promise.all([
            ExamSchedule.countDocuments({ school: schoolId }),
            Marksheet.countDocuments({ school: schoolId, status: "submitted" }),
            Marksheet.countDocuments({ school: schoolId, status: "published" })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalSchedules,
                pendingVerifications,
                publishedResults
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Publish results
 * @route   PUT /api/admin/exam/publish
 * @access  Private (Admin)
 */
export const publishResults = async (req, res) => {
    try {
        const { scheduleId, section } = req.body;

        const updateResult = await Marksheet.updateMany(
            { 
                examSchedule: scheduleId, 
                ...(section ? { section } : {}),
                status: "verified" 
            },
            { 
                status: "published",
                publishedAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            message: `${updateResult.modifiedCount} results published successfully`,
            data: updateResult
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create a new exam structure
 * @route   POST /api/admin/exams/structure
 * @access  Private (Admin)
 */
export const createExamStructure = async (req, res) => {
    try {
        const { 
            examName, examType, academicYear, term, 
            applicableClasses, subjectMarkings, gradingConfigRef,
            weightagePercentage, allowGraceMarks, graceMarksLimit 
        } = req.body;

        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        let resolvedGradingConfigRef = gradingConfigRef;
        if (!resolvedGradingConfigRef) {
            let gradingConfig = await AcademicConfig.findOne({ organization: organizationId });
            if (!gradingConfig) {
                gradingConfig = await AcademicConfig.create({
                    organization: organizationId,
                    academicYear: {
                        label: academicYear || "2025-26",
                        startDate: new Date("2025-04-01"),
                        endDate: new Date("2026-03-31"),
                        isActive: true
                    },
                    classes: [],
                    subjects: [],
                    holidays: [],
                    examPattern: []
                });
            }
            resolvedGradingConfigRef = gradingConfig._id;
        }

        const newStructure = await ExamStructure.create({
            organization: organizationId,
            school: schoolId,
            academicYear,
            examName,
            examType,
            term,
            applicableClasses,
            subjectMarkings,
            gradingConfigRef: resolvedGradingConfigRef,
            weightagePercentage,
            allowGraceMarks,
            graceMarksLimit,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Exam structure created successfully",
            data: newStructure
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all exam structures
 * @route   GET /api/admin/exams/structures
 * @access  Private (Admin)
 */
export const getAdminExamStructures = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const structures = await ExamStructure.find({ school: schoolId })
            .populate("applicableClasses", "name")
            .populate("subjectMarkings.subject", "subjectName");

        res.status(200).json({
            success: true,
            data: structures
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update an exam structure
 * @route   PUT /api/admin/exams/structure/:id
 * @access  Private (Admin)
 */
export const updateExamStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        if (req.body.hasOwnProperty('gradingConfigRef') && !req.body.gradingConfigRef) {
            let gradingConfig = await AcademicConfig.findOne({ organization: organizationId });
            if (!gradingConfig) {
                gradingConfig = await AcademicConfig.create({
                    organization: organizationId,
                    academicYear: {
                        label: req.body.academicYear || "2025-26",
                        startDate: new Date("2025-04-01"),
                        endDate: new Date("2026-03-31"),
                        isActive: true
                    },
                    classes: [],
                    subjects: [],
                    holidays: [],
                    examPattern: []
                });
            }
            req.body.gradingConfigRef = gradingConfig._id;
        }

        const updated = await ExamStructure.findOneAndUpdate({ _id: id, school: schoolId }, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Structure not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete an exam structure
 * @route   DELETE /api/admin/exams/structure/:id
 * @access  Private (Admin)
 */
export const deleteExamStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;
        const deleted = await ExamStructure.findOneAndDelete({ _id: id, school: schoolId });
        if (!deleted) return res.status(404).json({ success: false, message: "Structure not found" });
        res.status(200).json({ success: true, message: "Structure deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get marksheets by schedule (Bulk View)
 * @route   GET /api/admin/exams/schedule/:scheduleId/marksheets
 * @access  Private (Admin)
 */
export const getMarksheetsBySchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { section } = req.query;

        const marksheets = await Marksheet.find({ 
            examSchedule: scheduleId,
            ...(section ? { section } : {})
        })
        .populate("student", "name rollNumber")
        .sort({ "student.rollNumber": 1 });

        res.status(200).json({
            success: true,
            count: marksheets.length,
            data: marksheets
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk verify marksheets
 * @route   PUT /api/admin/exams/bulk-verify
 * @access  Private (Admin)
 */
export const bulkVerifyMarksheets = async (req, res) => {
    try {
        const { marksheetIds } = req.body;

        if (!marksheetIds || !Array.isArray(marksheetIds)) {
            return res.status(400).json({ success: false, message: "Invalid marksheet IDs" });
        }

        const result = await Marksheet.updateMany(
            { _id: { $in: marksheetIds }, status: "submitted" },
            { 
                status: "verified",
                verifiedBy: req.user._id,
                verifiedAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} marksheets verified successfully`,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExamDropdownOptions = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school || req.user._id;

        // Fetch periods (classes) with populated active subjects
        const periods = await Period.find({ schoolId, status: 'active' })
            .populate('subjects', 'subjectName subjectCode')
            .lean();

        // Fetch all active subjects for this school as fallback
        const allSubjects = await Subject.find({ schoolId, status: 'active' }).lean();

        // Format classes as { _id, className, subjects }
        const formattedClasses = periods.map(p => {
            let subjectsList = [];
            if (p.subjects && p.subjects.length > 0) {
                subjectsList = p.subjects.map(s => s.subjectName);
            } else {
                // Fallback: match by gradeLevel
                const normGrade = p.gradeLevel;
                const formattedNormGrade = normGrade && !normGrade.toLowerCase().startsWith('class') ? `Class ${normGrade}` : normGrade;

                const matched = allSubjects.filter(s => {
                    if (!s.gradeLevel) return false;
                    const sGrade = s.gradeLevel.trim().toLowerCase();
                    return sGrade === normGrade?.trim().toLowerCase() || sGrade === formattedNormGrade?.trim().toLowerCase();
                });
                subjectsList = matched.map(s => s.subjectName);
            }

            // Remove duplicates and sort
            subjectsList = Array.from(new Set(subjectsList)).sort();

            return {
                _id: p._id,
                className: `${p.periodName}${p.section ? ` - ${p.section}` : ''}`,
                subjects: subjectsList
            };
        });

        res.status(200).json({
            success: true,
            data: formattedClasses
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createSimpleExam = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization || req.user.organization;
        const payload = {
            ...req.body,
            school: schoolId,
            organization: organizationId,
            createdBy: req.user._id
        };
        const exam = await Exam.create(payload);
        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllSimpleExams = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        let query = { school: schoolId };
        if (req.query.className) query.className = req.query.className;
        if (req.query.search) {
            query.$or = [
                { examName: { $regex: req.query.search, $options: 'i' } },
                { subject: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        const exams = await Exam.find(query).populate("createdBy", "name").sort({ examDate: 1 });
        res.status(200).json({ success: true, data: exams, meta: { page: 1, limit: 100, totalPages: 1, total: exams.length } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSimpleExam = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school?._id || req.user.school;
        const exam = await Exam.findOneAndUpdate({ _id: id, school: schoolId }, { ...req.body, updatedBy: req.user._id }, { new: true });
        if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSimpleExam = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school?._id || req.user.school;
        const exam = await Exam.findOneAndDelete({ _id: id, school: schoolId });
        if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
        res.status(200).json({ success: true, message: "Exam deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};