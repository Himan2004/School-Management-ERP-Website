import mongoose from 'mongoose';
import Marksheet from '../../models/academic/marksheet.model.js';
import Student from '../../models/users/student.model.js';
import ExamSchedule from '../../models/academic/examSchedule.model.js';

// Explicitly import schemas to ensure registration prior to populating
import '../../models/school/School.js';
import '../../models/organization/organizationClass.js';
import '../../models/school/Section.model.js';
import '../../models/users/parent.model.js';
import '../../models/modules/Subject.js';

/**
 * @desc    Get consolidated annual marksheet (Mid, Final, Annual stats)
 * @route   GET /api/student/marksheet/consolidated
 * @access  Private (Student)
 */
export const getConsolidatedMarksheet = async (req, res) => {
    try {
        const studentUserId = req.user._id;

        // 1. Fetch Student Profile with School, Class, Section and Parent Info
        const student = await Student.findOne({ user: studentUserId })
            .populate('school', 'schoolName')
            .populate('class', 'name')
            .populate('section', 'name')
            .populate('parent');
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        // Dynamically fetch academic session of the student
        const currentAcademicYear = student.academicYear || '2024-2025';

        // 2. Fetch all published marksheets for the student for the current year
        const marksheets = await Marksheet.find({
            student: studentUserId,
            academicYear: currentAcademicYear,
            status: 'published'
        })
        .populate({
            path: 'examSchedule',
            populate: { path: 'examStructure', select: 'examName examType' }
        })
        .populate({
            path: 'subjectMarks.subject',
            select: 'subjectName subjectCode credits'
        });

        // 3. Setup the base response structure expected by the React UI
        const responseData = {
            student: {
                name: req.user.name,
                rollNo: student.rollNo || 'N/A',
                class: `${student.class?.name || student.class || 'N/A'} - ${student.section?.name ? `Section ${student.section.name}` : (student.section || 'A')}`,
                admissionNo: student.enrollmentNo || student.admissionNo || 'N/A',
                fatherName: student.parent?.fatherName || 'N/A',
                motherName: student.parent?.motherName || 'N/A',
                dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
                schoolName: student.school?.schoolName || 'School Name',
                academicYear: currentAcademicYear
            },
            terms: {
                mid: null,
                final: null,
                annual: null
            },
            // Fallbacks for school-wide stats
            classAverage: 75, 
            highestScore: 95,
            schoolTopper: 98
        };

        // Variables to calculate the annual average
        let totalYearPercentage = 0;
        let termsCount = 0;

        // 4. Map the database marksheets into 'mid' and 'final' terms
        marksheets.forEach((sheet) => {
            const examType = sheet.examSchedule?.examStructure?.examType?.toLowerCase();
            
            // Format subjects array from subjectMarks schema
            const formattedSubjects = sheet.subjectMarks.map(m => {
                const obtainedMarks = m.totalMarks !== undefined && m.totalMarks !== null ? m.totalMarks : ((m.theoryMarks || 0) + (m.practicalMarks || 0) + (m.internalMarks || 0));
                const percentageValue = m.maxMarks > 0 ? Math.round((obtainedMarks / m.maxMarks) * 100) : 0;
                return {
                    code: m.subject?.subjectCode || 'SUB101',
                    credits: m.subject?.credits || 4,
                    name: m.subject?.subjectName || m.subjectName || 'Subject',
                    marks: obtainedMarks,
                    maxMarks: m.maxMarks,
                    percentage: percentageValue,
                    grade: m.grade || calculateGrade(percentageValue),
                    teacherRemarks: m.remarks || '-',
                    rank: '-'
                };
            });

            const termData = {
                name: sheet.examSchedule?.examStructure?.examName || 'Examination',
                month: new Date(sheet.publishedAt || sheet.createdAt).toLocaleString('default', { month: 'long' }),
                year: new Date(sheet.publishedAt || sheet.createdAt).getFullYear().toString(),
                overallPercentage: sheet.percentage,
                cgpa: sheet.cgpa || (sheet.percentage / 9.5).toFixed(1),
                rank: sheet.classRank || sheet.sectionRank || '-',
                totalStudents: sheet.totalStudentsInClass || 40,
                grade: sheet.overallGrade || calculateGrade(sheet.percentage),
                remarks: sheet.remarks || 'Result Published',
                subjects: formattedSubjects
            };

            // Assign to the correct term bucket based on examType enum
            if (examType === 'half_yearly' || examType === 'mid_term') {
                responseData.terms.mid = termData;
                totalYearPercentage += sheet.percentage;
                termsCount++;
            } else if (examType === 'annual' || examType === 'final') {
                responseData.terms.final = termData;
                totalYearPercentage += sheet.percentage;
                termsCount++;
            }
        });

        // 5. Generate Annual Summary if both terms exist
        if (responseData.terms.mid || responseData.terms.final) {
            const avgPercentage = termsCount > 0 ? (totalYearPercentage / termsCount).toFixed(1) : 0;
            
            // Map final term subjects as annual scores
            const baseTerm = responseData.terms.final || responseData.terms.mid;
            
            responseData.terms.annual = {
                name: 'Annual Summary',
                overallPercentage: Number(avgPercentage),
                cgpa: (avgPercentage / 9.5).toFixed(1),
                rank: responseData.terms.final?.rank || responseData.terms.mid?.rank || '-',
                totalStudents: responseData.terms.final?.totalStudents || responseData.terms.mid?.totalStudents || '-',
                grade: calculateGrade(avgPercentage),
                remarks: 'Overall Academic Year Summary',
                subjects: baseTerm.subjects.map(s => ({
                    name: s.name,
                    annualScore: s.marks,
                    grade: s.grade,
                    trend: '+0%'
                })),
                monthlyPerformance: [75, 78, 80, 82, 85, 88, 87, 85, 89, 90, 92, Number(avgPercentage)]
            };
        }

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in getConsolidatedMarksheet:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper
const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};