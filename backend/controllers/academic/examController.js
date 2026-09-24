import ExamStructure from "../../models/academic/examStructure.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";

/**
 * @desc    Get exam schedules for a specific class/section
 * @route   GET /api/academic/exams/schedules
 * @access  Private (Principal, Teacher)
 */
export const getSchedulesByClass = async (req, res) => {
    try {
        const { classId, section, academicYear } = req.query;
        const schoolId = req.user?.school?._id || req.user?.school || req.user?.id;

        const query = {
            school: schoolId
        };
        if (classId) query.class = classId;
        if (academicYear) query.academicYear = academicYear;
        if (section) query.section = section;

        const schedules = await ExamSchedule.find(query)
            .populate("examStructure", "examName examType")
            .populate("class", "name")
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
 * @desc    Get full details of an exam schedule including subject markings
 * @route   GET /api/academic/exams/schedules/:id
 * @access  Private (Principal, Teacher)
 */
export const getExamScheduleDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await ExamSchedule.findById(id)
            .populate({
                path: "examStructure",
                populate: {
                    path: "subjectMarkings.subject",
                    select: "subjectName subjectCode"
                }
            })
            .populate("class", "name")
            .populate("school", "schoolName branchId");

        if (!schedule) {
            return res.status(404).json({ success: false, message: "Exam schedule not found" });
        }

        res.status(200).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
