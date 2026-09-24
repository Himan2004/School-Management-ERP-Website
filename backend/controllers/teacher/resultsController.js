import mongoose from 'mongoose';
import ClassResult from '../../models/academic/ClassResult.model.js';
import SubjectMarksEntry from '../../models/academic/SubjectMarksEntry.model.js';

const getSchoolId = (user) => user?.school?._id || user?.school;

const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 30) return 'D';
    return 'E';
};

export const getResults = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        
        // Find teacher's assigned classes/sections from SubjectAssignment
        const SubjectAssignment = mongoose.models.SubjectAssignment || mongoose.model("SubjectAssignment");
        const assignments = await SubjectAssignment.find({ teacherUser: req.user._id, school: schoolId })
            .populate("class", "name")
            .lean();

        const classSectionQueries = assignments.map(a => ({
            class: a.class?.name,
            section: a.section
        })).filter(q => q.class && q.section);

        if (classSectionQueries.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                stats: {
                    total: 0,
                    pending: 0,
                    generated: 0,
                    published: 0,
                    totalStudents: 0,
                    averagePercentage: 0,
                    passPercentage: 0,
                    totalToppers: 0
                }
            });
        }

        const results = await ClassResult.find({ school: schoolId, $or: classSectionQueries }).lean();
        
        const total = results.length;
        const pending = results.filter(r => r.status === 'pending').length;
        const generated = results.filter(r => r.status === 'generated').length;
        const published = results.filter(r => r.status === 'published').length;
        
        let totalStudents = 0;
        let passCountSum = 0;
        let totalScoreSum = 0;
        let validScoresCount = 0;
        let topGradeCount = 0;

        results.forEach(r => {
            totalStudents += (r.studentsCount || 0);
            passCountSum += (r.passCount || 0);
            if (r.averagePercentage > 0) {
                totalScoreSum += (r.averagePercentage * (r.studentsCount || 0));
                validScoresCount += (r.studentsCount || 0);
            }
            if (r.studentMarksheets) {
                topGradeCount += r.studentMarksheets.filter(m => m.grade === 'A+').length;
            }
        });

        const averagePercentage = validScoresCount > 0 ? Math.round(totalScoreSum / validScoresCount) : 0;
        const passPercentage = totalStudents > 0 ? Math.round((passCountSum / totalStudents) * 100) : 0;

        const formattedResults = results.map(r => ({
            id: r._id,
            class: r.class,
            section: r.section,
            examType: r.examType,
            academicYear: r.academicYear,
            term: r.term,
            status: r.status,
            students: r.studentsCount,
            passCount: r.passCount,
            averagePercentage: r.averagePercentage,
            generatedAt: r.generatedAt,
            publishedAt: r.publishedAt
        }));

        res.status(200).json({
            success: true,
            data: formattedResults,
            stats: {
                total,
                pending,
                generated,
                published,
                totalStudents,
                averagePercentage,
                passPercentage,
                totalToppers: topGradeCount
            }
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generateResult = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { class: cls, section, examType, academicYear, term } = req.body;

        if (!cls || !section || !examType) {
            return res.status(400).json({ success: false, message: 'Class, section, and exam type are required' });
        }

        // Verify that this teacher is assigned to this class and section
        const SubjectAssignment = mongoose.models.SubjectAssignment || mongoose.model("SubjectAssignment");
        const ClassModel = mongoose.models.Class || mongoose.model("Class");
        
        const targetClassDoc = await ClassModel.findOne({ organization: req.user.organization, name: cls });
        if (!targetClassDoc) {
            return res.status(404).json({ success: false, message: `Class ${cls} not found` });
        }

        const isAssigned = await SubjectAssignment.exists({
            teacherUser: req.user._id,
            school: schoolId,
            class: targetClassDoc._id,
            section: section
        });

        if (!isAssigned) {
            return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this class and section' });
        }

        // Fetch WITHOUT .lean() so we can use Mongoose Map's .forEach()
        const subjectEntries = await SubjectMarksEntry.find({
            school: schoolId,
            class: cls,
            section,
            examType
        });

        if (subjectEntries.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No marks entries found for Class ${cls} ${section} (${examType}). Please save marks first.` 
            });
        }

        const studentDataMap = {};

        subjectEntries.forEach(entry => {
            if (!entry.marksData || entry.marksData.size === 0) return;

            // Mongoose Map type — iterate using .forEach()
            entry.marksData.forEach((studentObj, studentId) => {
                if (!studentObj || !studentObj.name) return; // skip invalid entries

                if (!studentDataMap[studentId]) {
                    studentDataMap[studentId] = {
                        studentId: studentObj.studentId,
                        name: studentObj.name,
                        rollNo: studentObj.rollNo || 'N/A',
                        class: cls,
                        section: section,
                        subjectMarks: [],
                        totalMarks: 0,
                        totalObtained: 0
                    };
                }

                const obtained = Number(studentObj.marks) || 0;
                const total = Number(entry.totalMarks) || 100;

                studentDataMap[studentId].subjectMarks.push({
                    subject: entry.subject,
                    marks: obtained,
                    total: total,
                    grade: calculateGrade(total > 0 ? (obtained / total) * 100 : 0)
                });

                studentDataMap[studentId].totalMarks += total;
                studentDataMap[studentId].totalObtained += obtained;
            });
        });

        if (Object.keys(studentDataMap).length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No student marks data found. Make sure marks are saved before generating results.' 
            });
        }

        const studentMarksheets = Object.values(studentDataMap).map(student => {
            const percentage = student.totalMarks > 0
                ? Math.round((student.totalObtained / student.totalMarks) * 100)
                : 0;
            return {
                ...student,
                percentage,
                grade: calculateGrade(percentage)
            };
        });

        // Sort by percentage descending to assign rank
        studentMarksheets.sort((a, b) => b.percentage - a.percentage);

        let passCount = 0;
        let totalPercentSum = 0;

        studentMarksheets.forEach((student, index) => {
            student.rank = index + 1;
            totalPercentSum += student.percentage;
            if (student.percentage >= 40) passCount++;
        });

        const studentsCount = studentMarksheets.length;
        const averagePercentage = studentsCount > 0 ? Math.round(totalPercentSum / studentsCount) : 0;

        const resultDoc = await ClassResult.findOneAndUpdate(
            { school: schoolId, class: cls, section, examType },
            {
                $set: {
                    school: schoolId,
                    createdBy: req.user._id,
                    term: term || 'annual',
                    academicYear: academicYear || new Date().getFullYear(),
                    status: 'generated',
                    generatedAt: new Date(),
                    studentsCount,
                    passCount,
                    averagePercentage,
                    studentMarksheets
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ 
            success: true, 
            message: `Result generated for ${studentsCount} students successfully!`, 
            data: { id: resultDoc._id } 
        });
    } catch (error) {
        console.error('Error generating result:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const publishResult = async (req, res) => {
    try {
        const { id } = req.params;
        const resultDoc = await ClassResult.findByIdAndUpdate(
            id,
            { status: 'published', publishedAt: new Date() },
            { new: true }
        );

        if (!resultDoc) return res.status(404).json({ success: false, message: 'Result not found' });

        res.status(200).json({ success: true, message: 'Result published successfully' });
    } catch (error) {
        console.error('Error publishing result:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getStudentMarksheets = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { class: cls, section } = req.query;

        // Find teacher's assigned classes/sections from SubjectAssignment
        const SubjectAssignment = mongoose.models.SubjectAssignment || mongoose.model("SubjectAssignment");
        const assignments = await SubjectAssignment.find({ teacherUser: req.user._id, school: schoolId })
            .populate("class", "name")
            .lean();

        const classSectionQueries = assignments.map(a => ({
            class: a.class?.name,
            section: a.section
        })).filter(q => q.class && q.section);

        if (classSectionQueries.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const query = { school: schoolId, status: 'published' };

        if (cls || section) {
            const targetClass = cls || "";
            const targetSection = section || "";

            const isAssigned = classSectionQueries.some(q =>
                (!targetClass || q.class === targetClass) &&
                (!targetSection || q.section === targetSection)
            );

            if (!isAssigned) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this class and section' });
            }

            let classIdObj = null;
            if (cls) {
                const ClassModel = mongoose.models.Class || mongoose.model("Class") || mongoose.models.Classes || mongoose.model("Classes");
                const classDoc = await ClassModel.findOne({ name: cls });
                if (classDoc) {
                    classIdObj = classDoc._id;
                    query.class = classDoc._id;
                } else {
                    query.class = new mongoose.Types.ObjectId();
                }
            }

            if (classIdObj) {
                const StudentModel = mongoose.models.Student || mongoose.model("Student");
                const classStudents = await StudentModel.find({
                    school: schoolId,
                    class: classIdObj,
                    status: "active"
                }).populate("section", "name").lean();

                const studentUserIds = classStudents
                    .filter(s => {
                        if (targetSection) {
                            const label = s.section?.name || s.section?.toString() || "";
                            return label === targetSection;
                        }
                        return true;
                    })
                    .map(s => s.user?._id || s.user);

                query.student = { $in: studentUserIds };
            }
        } else {
            const ClassModel = mongoose.models.Class || mongoose.model("Class") || mongoose.models.Classes || mongoose.model("Classes");
            const StudentModel = mongoose.models.Student || mongoose.model("Student");
            
            const allowedStudentUserIds = [];
            for (const q of classSectionQueries) {
                const classDoc = await ClassModel.findOne({ name: q.class });
                if (classDoc) {
                    const classStudents = await StudentModel.find({
                        school: schoolId,
                        class: classDoc._id,
                        status: "active"
                    }).populate("section", "name").lean();

                    const matchedUserIds = classStudents
                        .filter(s => {
                            const label = s.section?.name || s.section?.toString() || "";
                            return label === q.section;
                        })
                        .map(s => s.user?._id || s.user);
                    allowedStudentUserIds.push(...matchedUserIds);
                }
            }
            query.student = { $in: allowedStudentUserIds };
        }

        const MarksheetModel = mongoose.models.Marksheet || mongoose.model("Marksheet");
        const marksheets = await MarksheetModel.find(query)
            .populate("student", "name rollNo")
            .populate("class", "name")
            .populate("subjectMarks.subject", "subjectName name")
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();

        const latestMarksheetsMap = new Map();

        marksheets.forEach(m => {
            const studentKey = m.student?._id?.toString() || m.student?.toString();
            if (!studentKey) return;
            if (!latestMarksheetsMap.has(studentKey)) {
                const subjectMarks = (m.subjectMarks || []).map(sm => ({
                    subject: sm.subject?.subjectName || sm.subject?.name || "Subject",
                    marksObtained: sm.totalMarks || 0,
                    maxMarks: sm.maxMarks || 100,
                    percentage: sm.maxMarks ? Math.round((sm.totalMarks / sm.maxMarks) * 100) : 0,
                    grade: sm.grade || "N/A"
                }));

                latestMarksheetsMap.set(studentKey, {
                    student: {
                        id: studentKey,
                        name: m.student?.name || "Unknown",
                        rollNo: m.rollNumber || "—",
                        class: m.class?.name || "N/A",
                        section: m.section || "—"
                    },
                    results: subjectMarks,
                    totalMarks: m.totalMaxMarks || 100,
                    totalObtained: m.totalMarksObtained || 0,
                    percentage: m.percentage || 0,
                    grade: m.overallGrade || "N/A",
                    rank: m.classRank || m.sectionRank || "—"
                });
            }
        });

        res.status(200).json({ success: true, data: Array.from(latestMarksheetsMap.values()) });
    } catch (error) {
        console.error('Error fetching marksheets:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
