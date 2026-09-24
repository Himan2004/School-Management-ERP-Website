import mongoose from 'mongoose';
import Student from '../../models/users/student.model.js';
import ExamSchedule from '../../models/academic/examSchedule.model.js';
import Marksheet from '../../models/academic/marksheet.model.js';

/**
 * @desc    Get exam schedules for the logged-in student
 * @route   GET /api/student/exams/schedules
 * @access  Private (Student)
 */
export const getMyExamSchedules = async (req, res) => {
    try {
        const user = req.user;
        const schoolId = user.school._id || user.school;

        // Fetch student profile to get class and section
        const studentProfile = await Student.findOne({ user: user._id });
        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        // Fetch published exam schedules for the student's class and section
        const schedules = await ExamSchedule.find({
            school: schoolId,
            class: studentProfile.class,
            $or: [
                { section: null },
                { section: studentProfile.section }
            ],
            status: { $in: ["published", "ongoing", "completed"] }
        })
        .populate({
            path: "examStructure",
            select: "examName examType subjectMarkings"
        })
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: schedules.length,
            data: schedules
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get published results/marksheets for the logged-in student
 * @route   GET /api/student/exams/results
 * @access  Private (Student)
 */
export const getMyResults = async (req, res) => {
    try {
        const studentId = req.user._id;

        const results = await Marksheet.find({
            student: studentId,
            status: "published"
        })
        .populate({
            path: "examSchedule",
            populate: { path: "examStructure", select: "examName examType" }
        })
        .populate("class", "name")
        .sort({ publishedAt: -1 });

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get details of a specific marksheet
 * @route   GET /api/student/exams/results/:marksheetId
 * @access  Private (Student)
 */
export const getMarksheetDetails = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { marksheetId } = req.params;

        const marksheet = await Marksheet.findOne({
            _id: marksheetId,
            student: studentId,
            status: "published"
        })
        .populate({
            path: "examSchedule",
            populate: { 
                path: "examStructure",
                populate: { path: "subjectMarkings.subject", select: "subjectName" }
            }
        })
        .populate("class", "name");

        if (!marksheet) {
            return res.status(404).json({ success: false, message: "Marksheet not found or not yet published" });
        }

        res.status(200).json({
            success: true,
            data: marksheet
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get performance trends (CGPA/Percentage over time)
 * @route   GET /api/student/exams/performance
 * @access  Private (Student)
 */
export const getPerformanceTrends = async (req, res) => {
    try {
        const studentId = req.user._id;

        const performance = await Marksheet.find({
            student: studentId,
            status: "published"
        })
        .select("percentage cgpa academicYear createdAt")
        .populate({
            path: "examSchedule",
            populate: { path: "examStructure", select: "examName" }
        })
        .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all exams (upcoming, completed, results) for logged-in student
 * @route   GET /api/student/exams
 * @access  Private (Student)
 */
export const getStudentExams = async (req, res) => {
    try {
        // 1. Get the logged-in student's profile to know their class/section
        const studentId = req.user._id; // Assuming auth middleware sets req.user
        
        const student = await Student.findOne({ user: studentId });
        if (student && student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate('section');
        }
        if (student && student.class && mongoose.Types.ObjectId.isValid(student.class)) {
            await student.populate('class');
        }
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        const studentSectionStr = typeof student.section === 'string'
            ? student.section
            : (student.section?.name || null);
            
        const studentClassStr = typeof student.class === 'string'
            ? student.class
            : (student.class?.name || null);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 2. Fetch all published Exam Schedules for the student's class & section
        const schedules = await ExamSchedule.find({
            school: student.school,
            class: student.class,
            $or: [{ section: null }, { section: studentSectionStr }],
            status: { $in: ['published', 'ongoing', 'completed'] }
        })
        .populate({
            path: 'slots.subject',
            model: 'Subject',
            select: 'subjectName subjectCode'
        })
        .populate({
            path: 'examStructure',
            select: 'examName examType subjectMarkings'
        })
        .lean();
            
        // 2.5. Fetch Online Tests (created by Subject Teachers) for the student's class & section
        let onlineTests = [];
        try {
            const OnlineTestModel = mongoose.model('OnlineTest');
            onlineTests = await OnlineTestModel.find({
                school: student.school,
                class: studentClassStr,
                section: studentSectionStr,
                status: { $in: ['published', 'scheduled', 'completed'] }
            }).lean();
        } catch (err) {
            console.error('OnlineTest model may not be registered yet or error fetching:', err);
        }

        // 3. Fetch all published Marksheets/Results for this specific student
        const results = await Marksheet.find({
            student: studentId,
            status: 'published'
        })
        .populate({
            path: 'examSchedule',
            populate: {
                path: 'slots.subject',
                model: 'Subject',
                select: 'subjectName subjectCode'
            }
        })
        .populate({
            path: 'subjectMarks.subject',
            select: 'subjectName subjectCode'
        })
        .sort({ publishedAt: -1 })
        .lean();

        // 4. Initialize the arrays expected by the frontend
        const upcoming = [];
        const completed = [];
        const detailedResults = [];

        // --- Categorize Schedules (Upcoming vs Completed) ---
        schedules.forEach((sch) => {
            const instructions = sch.instructions || ['Bring ID Card', 'Report 15 mins early', 'No electronic devices allowed'];
            const admitCardAvailable = sch.admitCardGenerated || false;
            
            (sch.slots || []).forEach((slot) => {
                if (!slot.subject) return; // Skip if subject info is missing
                
                const examDate = new Date(slot.examDate);
                const isUpcoming = examDate >= today;
                
                // Look up passing marks and max marks from the structure
                const subjectIdStr = (slot.subject._id || slot.subject).toString();
                const marking = sch.examStructure?.subjectMarkings?.find(
                    m => (m.subject._id || m.subject).toString() === subjectIdStr
                );
                const passingMarks = marking ? marking.passingMarks : 35;
                const totalMaxMarks = marking ? marking.totalMaxMarks : (slot.maxMarks || 100);

                const timeString = `${slot.startTime || 'TBA'} - ${slot.endTime || 'TBA'}`;
                const durationString = slot.durationMinutes 
                    ? (slot.durationMinutes >= 60 
                        ? `${Math.floor(slot.durationMinutes / 60)} hours` 
                        : `${slot.durationMinutes} mins`)
                    : '3 hours';

                const dateStr = slot.examDate ? new Date(slot.examDate).toISOString().split('T')[0] : '';

                if (isUpcoming) {
                    upcoming.push({
                        id: `${sch._id}_${slot._id || slot.subject._id}`,
                        subject: slot.subject.subjectName || 'Unknown Subject',
                        date: dateStr,
                        time: timeString,
                        duration: durationString,
                        room: slot.venue || 'TBA',
                        hall: slot.venue || 'TBA',
                        seat: 'Assigned on Admit Card',
                        seatNumber: 'Assigned on Admit Card',
                        syllabus: sch.examStructure?.examName || 'As per curriculum',
                        marks: totalMaxMarks,
                        passingMarks: passingMarks,
                        instructions: instructions,
                        admitCardAvailable: admitCardAvailable
                    });
                } else {
                    completed.push({
                        id: `${sch._id}_${slot._id || slot.subject._id}`,
                        scheduleId: sch._id.toString(),
                        subjectId: subjectIdStr,
                        subject: slot.subject.subjectName || 'Unknown Subject',
                        date: dateStr,
                        time: timeString,
                        duration: durationString,
                        room: slot.venue || 'TBA',
                        hall: slot.venue || 'TBA',
                        seat: 'Assigned on Admit Card',
                        status: 'Completed',
                        maxMarks: totalMaxMarks,
                        result: 'pending', // Default until result is published
                    });
                }
            });
        });
        
        // --- Process Online Tests ---
        onlineTests.forEach((test) => {
            const isUpcoming = test.status === 'published' || test.status === 'scheduled';
            const testDate = test.startDate || test.createdAt.toISOString().split('T')[0];
            const testTime = test.startTime ? `${test.startTime} - ${test.endTime || 'TBA'}` : 'TBA';
            
            if (isUpcoming) {
                upcoming.push({
                    id: test._id.toString(),
                    subject: test.subject || 'Online Test',
                    date: testDate,
                    time: testTime,
                    duration: `${test.duration || 60} mins`,
                    room: 'Online Portal',
                    seatNumber: 'N/A',
                    syllabus: test.title || 'Online Test',
                    marks: test.totalMarks || 100,
                    passingMarks: test.passingMarks || 40,
                    instructions: test.instructions ? [test.instructions] : ['Online Test. Please ensure stable internet connection.'],
                    admitCardAvailable: false
                });
            } else {
                completed.push({
                    id: test._id.toString(),
                    scheduleId: test._id.toString(),
                    subjectId: test._id.toString(),
                    subject: test.subject || 'Online Test',
                    date: testDate,
                    maxMarks: test.totalMarks || 100,
                    result: 'pending',
                });
            }
        });

        // --- Process Results ---
        results.forEach((result) => {
            const sched = result.examSchedule;
            
            (result.subjectMarks || []).forEach((subMark) => {
                if (!subMark.subject) return;
                
                const subjectIdStr = (subMark.subject._id || subMark.subject).toString();
                const totalMarks = subMark.totalMarks || 0;
                const maxMarks = subMark.maxMarks || 100;
                const percentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
                
                // Try to find the exact examDate from the exam schedule slots
                const matchingSlot = sched?.slots?.find(
                    s => s && s.subject && (s.subject._id || s.subject).toString() === subjectIdStr
                );
                const examDate = matchingSlot?.examDate || result.publishedAt;

                // 1. Add to Detailed Results Tab
                detailedResults.push({
                    id: `${result._id}_${subMark.subject._id || subMark.subject}`,
                    subject: subMark.subject.subjectName || 'Unknown Subject',
                    examDate: examDate,
                    marksObtained: totalMarks,
                    maxMarks: maxMarks,
                    percentage: percentage,
                    grade: subMark.grade || calculateGrade(percentage),
                    rank: result.classRank || 'N/A',
                    totalStudents: 120, // Mock class size
                    teacherRemarks: subMark.remarks || result.remarks || 'Result published'
                });

                // 2. Update the "Completed" tab to show actual marks instead of 'pending'
                const completedIndex = completed.findIndex(
                    c => c.scheduleId === sched?._id?.toString() && c.subjectId === subjectIdStr
                );
                if (completedIndex !== -1) {
                    completed[completedIndex] = {
                        ...completed[completedIndex],
                        marksObtained: totalMarks,
                        percentage: percentage,
                        grade: subMark.grade || calculateGrade(percentage),
                        result: subMark.isPass ? 'passed' : 'failed',
                        resultDate: result.publishedAt
                    };
                }
            });
        });

        // Sort arrays logically for clean presentation
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        completed.sort((a, b) => new Date(b.date) - new Date(a.date));
        detailedResults.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));

        // Return exactly the structure the React component expects
        return res.status(200).json({
            success: true,
            data: {
                upcoming,
                completed,
                results: detailedResults
            }
        });

    } catch (error) {
        console.error('Error in getStudentExams:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Helper function to calculate grades if not stored directly in DB
 */
const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};