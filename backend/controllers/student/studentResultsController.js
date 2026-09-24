import mongoose from 'mongoose';
import ReportCard from "../../models/academic/reportCard.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";

// @desc    Get student's complete academic results (100% Database - No Mock Data)
// @route   GET /api/student/results
export const getStudentResults = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Find the Student Profile
        const student = await Student.findOne({ user: userId }).populate('class section');
        
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                message: "Student profile not found. Please contact administration." 
            });
        }

        // Get user details
        const user = await User.findById(userId);
        
        // Use the student's own academicYear from their profile
        // Fallback to current-year derived value if not set
        const currentYear = new Date().getFullYear();
        const academicYear = student.academicYear || `${currentYear-1}-${currentYear}`;

        // 2. Fetch Report Cards
        let reportCards = await ReportCard.find({ 
            student: userId, 
            academicYear 
        }).sort({ createdAt: 1 });

        // 3. Fetch Marksheets
        let allMarksheets = await Marksheet.find({ 
            student: userId, 
            academicYear,
            status: 'published'
        })
        .populate('examStructure', 'examName examType')
        .populate('subjectMarks.subject', 'name subjectName code')
        .populate('class', 'name')
        .sort({ createdAt: 1 });

        // Check if there's any actual data
        let hasData = allMarksheets.length > 0 || reportCards.length > 0;
        let finalAcademicYear = academicYear;

        if (!hasData) {
            // Fallback: Find the latest academic year with data for this student
            const latestMarksheet = await Marksheet.findOne({ student: userId, status: 'published' }).sort({ createdAt: -1 });
            const latestReportCard = await ReportCard.findOne({ student: userId }).sort({ createdAt: -1 });
            
            let fallbackYear = null;
            if (latestMarksheet && latestReportCard) {
                fallbackYear = latestMarksheet.createdAt > latestReportCard.createdAt ? latestMarksheet.academicYear : latestReportCard.academicYear;
            } else if (latestMarksheet) {
                fallbackYear = latestMarksheet.academicYear;
            } else if (latestReportCard) {
                fallbackYear = latestReportCard.academicYear;
            }

            if (fallbackYear) {
                finalAcademicYear = fallbackYear;
                reportCards = await ReportCard.find({ 
                    student: userId, 
                    academicYear: fallbackYear 
                }).sort({ createdAt: 1 });

                allMarksheets = await Marksheet.find({ 
                    student: userId, 
                    academicYear: fallbackYear,
                    status: 'published'
                })
                .populate('examStructure', 'examName examType')
                .populate('subjectMarks.subject', 'name subjectName code')
                .populate('class', 'name')
                .sort({ createdAt: 1 });

                hasData = allMarksheets.length > 0 || reportCards.length > 0;
            }
        }

        if (!hasData) {
            return res.status(200).json({ 
                success: true, 
                data: null,
                message: "No academic results published yet." 
            });
        }

        const term1Report = reportCards.find(r => r.term === 'term1');
        const finalReport = reportCards.find(r => r.term === 'term2' || r.term === 'annual') || reportCards[reportCards.length - 1];


        // 4. Calculate Performance Metrics
        let improvementStr = "N/A";
        let trendData = [];
        let formattedSubjects = [];
        let monthlyPerformance = [];
        let termPerformance = { midTerm: 0, finalTerm: 0 };
        let classAverage = 0;
        let highestScore = 0;
        let overallData = {
            cgpa: 0,
            percentage: 0,
            rank: 0,
            totalStudents: 0,
            grade: 'N/A',
            remarks: ''
        };

        // Process marksheets if available
        if (allMarksheets.length > 0) {
            // Calculate improvement
            trendData = allMarksheets.map(m => m.percentage || 0);
            if (trendData.length >= 2) {
                const diff = trendData[trendData.length - 1] - trendData[trendData.length - 2];
                improvementStr = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
            }

            // Get the latest marksheet
            const latestMarksheet = allMarksheets[allMarksheets.length - 1];

            // Calculate class averages if we have class info
            if (student.class && latestMarksheet.examSchedule) {
                const classMarksheets = await Marksheet.find({
                    examSchedule: latestMarksheet.examSchedule,
                    class: student.class._id,
                    status: 'published'
                }).populate('subjectMarks.subject');

                const subjectStats = {};

                classMarksheets.forEach(sheet => {
                    sheet.subjectMarks.forEach(sm => {
                        if (!sm.subject) return;
                        const subId = sm.subject._id.toString();
                        if (!subjectStats[subId]) {
                            subjectStats[subId] = { 
                                totalScores: 0, 
                                count: 0, 
                                allScores: [],
                                maxMarks: sm.maxMarks || 100
                            };
                        }
                        subjectStats[subId].totalScores += sm.totalMarks || 0;
                        subjectStats[subId].count += 1;
                        subjectStats[subId].allScores.push(sm.totalMarks || 0);
                    });
                });

                // Format subjects with real data
                formattedSubjects = latestMarksheet.subjectMarks
                    .filter(sm => sm.subject)
                    .map(sm => {
                        const subId = sm.subject._id.toString();
                        const stats = subjectStats[subId];
                        const maxMarks = sm.maxMarks || 100;
                        const studentScore = sm.totalMarks || 0;
                        const studentPercentage = maxMarks > 0 ? (studentScore / maxMarks) * 100 : 0;
                        
                        let classAvgMarks = 0;
                        let avgPercentage = 0;
                        if (stats && stats.count > 0) {
                            classAvgMarks = stats.totalScores / stats.count;
                            avgPercentage = maxMarks > 0 ? (classAvgMarks / maxMarks) * 100 : 0;
                        }
                        
                        const highestMarks = stats && stats.allScores.length > 0 ? Math.max(...stats.allScores) : studentScore;
                        const highestPercentage = maxMarks > 0 ? (highestMarks / maxMarks) * 100 : 0;

                        let subjectRank = 1;
                        if (stats && stats.allScores.length > 0) {
                            const sortedScores = [...stats.allScores].sort((a, b) => b - a);
                            subjectRank = sortedScores.indexOf(studentScore) + 1;
                        }

                        return {
                            name: sm.subject.subjectName || sm.subject.name || "Subject",
                            score: studentScore,
                            maxScore: maxMarks,
                            percentage: Number(studentPercentage.toFixed(1)),
                            grade: sm.grade || calculateGrade(studentPercentage),
                            rank: subjectRank,
                            classAverage: Number(avgPercentage.toFixed(1)),
                            highest: Number(highestPercentage.toFixed(1)),
                            examName: latestMarksheet.examStructure?.examName || "Annual Examination",
                            examType: latestMarksheet.examStructure?.examType || "Annual",
                            teacher: "Teacher",
                            status: "Published",
                            publishDate: latestMarksheet.publishedAt
                                ? new Date(latestMarksheet.publishedAt).toISOString().split('T')[0]
                                : new Date().toISOString().split('T')[0],
                        };
                    });

                // Calculate class average across all subjects
                if (formattedSubjects.length > 0) {
                    classAverage = Number((formattedSubjects.reduce((acc, curr) => acc + curr.classAverage, 0) / formattedSubjects.length).toFixed(1));
                    highestScore = Math.max(...formattedSubjects.map(s => s.highest));
                }
            }

            // Monthly performance (last 12 months from marksheets)
            monthlyPerformance = allMarksheets.slice(-12).map(m => m.percentage || 0);
        }

        // Process report cards if available
        if (reportCards.length > 0) {
            termPerformance = {
                midTerm: term1Report ? term1Report.finalPercentage : 0,
                finalTerm: finalReport ? finalReport.finalPercentage : 0
            };
            
            overallData = {
                cgpa: finalReport?.finalCgpa || 0,
                percentage: finalReport?.finalPercentage || 0,
                rank: finalReport?.classRank || 0,
                totalStudents: finalReport?.totalStudentsInClass || 0,
                grade: finalReport?.finalGrade || calculateGrade(finalReport?.finalPercentage || 0),
                remarks: finalReport?.teacherRemarks || "Performance recorded."
            };
        } else if (allMarksheets.length > 0) {
            // Calculate overall from marksheets if no report cards
            const avgPercentage = allMarksheets.reduce((sum, m) => sum + (m.percentage || 0), 0) / allMarksheets.length;
            overallData = {
                cgpa: (avgPercentage / 10).toFixed(1),
                percentage: Number(avgPercentage.toFixed(1)),
                rank: 0,
                totalStudents: 0,
                grade: calculateGrade(avgPercentage),
                remarks: "Results from examinations."
            };
        }

        // Build final response with ONLY real data
        const responseData = {
            student: {
                name: user?.name || student.name,
                class: `${student.class?.name || 'N/A'} - ${student.section?.name || 'N/A'}`,
                rollNo: student.rollNo || 'N/A'
            },
            overall: overallData,
            subjects: formattedSubjects,
            monthlyPerformance: monthlyPerformance,
            termPerformance: termPerformance,
            classAverage: classAverage,
            highestScore: highestScore,
            improvement: improvementStr
        };

        res.status(200).json({ 
            success: true, 
            data: { ...responseData, academicYear: finalAcademicYear },
            hasData: true
        });

    } catch (error) {
        console.error('Error in getStudentResults:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Helper function
function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}