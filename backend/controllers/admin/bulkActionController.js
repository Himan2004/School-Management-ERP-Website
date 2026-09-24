import Marksheet from "../../models/academic/marksheet.model.js";
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";

/**
 * @desc    Bulk import marks from JSON
 * @route   POST /api/admin/bulk/import-marks
 * @access  Private (Admin)
 */
export const bulkImportMarks = async (req, res) => {
    try {
        const { scheduleId, classId, section, academicYear, marksData } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        if (!Array.isArray(marksData)) {
            return res.status(400).json({ success: false, message: "marksData must be an array" });
        }

        const operations = marksData.map(item => ({
            updateOne: {
                filter: { 
                    school: schoolId, 
                    student: item.studentId, 
                    examSchedule: scheduleId 
                },
                update: {
                    $set: {
                        organization: organizationId,
                        examStructure: item.examStructureId,
                        academicYear,
                        class: classId,
                        section,
                        subjectMarks: item.subjectMarks,
                        status: "submitted",
                        submittedBy: req.user._id,
                        submittedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        const result = await Marksheet.bulkWrite(operations);

        res.status(200).json({
            success: true,
            message: "Marks imported successfully",
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Promote students to next class
 * @route   POST /api/admin/bulk/promote-students
 * @access  Private (Admin)
 */
export const promoteStudents = async (req, res) => {
    try {
        const { studentIds, nextClassId, nextAcademicYear } = req.body;
        const schoolId = req.user.school._id || req.user.school;

        if (!studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json({ success: false, message: "Invalid student IDs" });
        }

        // Update student profile in Student model
        const result = await Student.updateMany(
            { user: { $in: studentIds }, school: schoolId },
            { 
                $set: { 
                    class: nextClassId,
                    academicYear: nextAcademicYear
                }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} students promoted successfully`,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
