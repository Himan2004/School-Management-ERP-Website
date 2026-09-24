import Parent from '../../models/users/parent.model.js';
import Student from '../../models/users/student.model.js';
import HealthRecord from '../../models/school/HealthRecord.model.js';
import mongoose from 'mongoose';

/**
 * GET /api/parent/health
 * Fetches the health record for the student associated with the logged-in parent.
 */
export const getStudentHealth = async (req, res) => {
    try {
        const parentUserId = req.user.id;

        // Find the parent profile
        const parent = await Parent.findOne({ user: parentUserId });
        if (!parent || !parent.students || parent.students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No students associated with this parent profile."
            });
        }

        // Get the student with validation & fallback
        let resolvedStudentId = req.query.student_id || parent.students[0];
        if (req.query.student_id) {
            const isChild = parent.students.some((id) => id.toString() === req.query.student_id.toString());
            if (!isChild) {
                resolvedStudentId = parent.students[0];
            }
        }

        const student = await Student.findById(resolvedStudentId)
            .populate('user', 'name')
            .populate('class', 'name')
            .select('bloodGroup health rollNo class section school dateOfBirth');

        if (student && student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate('section', 'name');
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found."
            });
        }

        const healthRecord = await HealthRecord.findOne({
            school: student.school,
            $or: [
                { student: student.user?._id },
                { student: student._id },
            ],
        });

        const checkupHistory = student.health?.checkupHistory || [];
        const visits = healthRecord?.visits || [];
        const latestVisit = [...visits].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;

        return res.status(200).json({
            success: true,
            data: {
                studentInfo: {
                    id: student._id,
                    name: student.user?.name || 'Not Available',
                    rollNo: student.rollNo,
                    class: student.class?.name || '',
                    section: student.section?.name || student.section || '',
                },
                bloodGroup: healthRecord?.bloodGroup || student.bloodGroup || 'Not Recorded',
                health: {
                    notes: healthRecord?.notes || student.health?.notes || '',
                    checkupHistory,
                },
                profile: {
                    bloodGroup: healthRecord?.bloodGroup || student.bloodGroup || '',
                    height: healthRecord?.height || '',
                    weight: healthRecord?.weight || '',
                    bmi: healthRecord?.bmi || '',
                    allergies: healthRecord?.allergies || [],
                    chronicConditions: healthRecord?.chronicConditions || [],
                    vaccinations: healthRecord?.vaccinations || [],
                    medications: healthRecord?.medications || [],
                    lastCheckup: latestVisit?.date || (checkupHistory.length ? checkupHistory[checkupHistory.length - 1].date : null),
                },
                visits: visits.map((visit) => ({
                    id: visit._id,
                    date: visit.date || null,
                    reason: visit.reason || 'Medical Checkup',
                    diagnosis: visit.nurseNote || visit.symptoms || '',
                    actionTaken: visit.treatment || 'N/A',
                    nurseName: 'School Nurse',
                    followUpRequired: Boolean(visit.followUpRequired),
                    followUpDate: visit.followUpDate || null,
                })),
            }
        });

    } catch (error) {
        console.error("Error fetching student health:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching health details."
        });
    }
};
