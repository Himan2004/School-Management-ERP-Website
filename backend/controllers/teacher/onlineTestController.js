import mongoose from 'mongoose';
import OnlineTest from '../../models/academic/OnlineTest.model.js';
import Teacher from '../../models/users/teacher.model.js';
import Notice from '../../models/common/Notice.js';
import Notification from '../../models/common/Notification.js';
import Class from '../../models/organization/organizationClass.js';
import Section from '../../models/school/Section.model.js';
import Student from '../../models/users/student.model.js';
import School from '../../models/school/School.js';
import Subject from '../../models/modules/Subject.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const getSchoolId = (user) => user?.school?._id || user?.school;

// ── @desc  Get all tests created by this teacher ─────────────────────────────
// GET /api/subject-teacher/online-tests
export const getMyTests = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const teacherId = req.user._id;

        const { status, subject, examType, search, page = 1, limit = 50 } = req.query;

        const query = { school: schoolId, createdBy: teacherId };
        if (status)   query.status   = status;
        if (subject)  query.subject  = { $regex: subject, $options: 'i' };
        if (examType) query.examType = examType;
        if (search)   query.title    = { $regex: search, $options: 'i' };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [tests, total] = await Promise.all([
            OnlineTest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean({ virtuals: true }),
            OnlineTest.countDocuments(query),
        ]);

        // Compute averageScore for lean docs (virtuals not available in lean)
        const testsWithAvg = tests.map(t => ({
            ...t,
            averageScore: t.attempts > 0 ? Math.round(t.totalScoreSum / t.attempts) : 0,
        }));

        return res.status(200).json({
            success: true,
            data: testsWithAvg,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('getMyTests error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Get stats cards + analytics ───────────────────────────────────────
// GET /api/subject-teacher/online-tests/stats
export const getTestStats = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const teacherId = req.user._id;

        const tests = await OnlineTest.find({ school: schoolId, createdBy: teacherId })
            .lean({ virtuals: false });

        const total       = tests.length;
        const published   = tests.filter(t => t.status === 'published').length;
        const draft       = tests.filter(t => t.status === 'draft').length;
        const scheduled   = tests.filter(t => t.status === 'scheduled').length;
        const completed   = tests.filter(t => t.status === 'completed').length;
        const active      = tests.filter(t => ['published', 'scheduled'].includes(t.status)).length;

        const totalAttempts   = tests.reduce((acc, t) => acc + (t.attempts || 0), 0);
        const totalScoreSum   = tests.reduce((acc, t) => acc + (t.totalScoreSum || 0), 0);
        const averageScore    = totalAttempts > 0 ? Math.round(totalScoreSum / totalAttempts) : 0;

        const testsWithAttempts = tests.filter(t => t.attempts > 0);
        const avgScorePerTest   = tests.map(t => (
            t.attempts > 0 ? Math.round(t.totalScoreSum / t.attempts) : 0
        ));
        const passingTests      = tests.filter((t, i) => avgScorePerTest[i] >= ((t.passingMarks / t.totalMarks) * 100));
        const passingRate       = total > 0 ? Math.round((passingTests.length / total) * 100) : 0;

        // Recent activity (last 5 non-draft tests)
        const recentActivity = tests
            .filter(t => t.status !== 'draft')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(t => ({
                _id: t._id,
                title: t.title,
                subject: t.subject,
                class: t.class,
                section: t.section,
                attempts: t.attempts || 0,
                averageScore: t.attempts > 0 ? Math.round(t.totalScoreSum / t.attempts) : 0,
                status: t.status,
            }));

        // Subject breakdown
        const subjectMap = {};
        tests.forEach(t => {
            if (!subjectMap[t.subject]) subjectMap[t.subject] = { count: 0, totalAttempts: 0, totalScoreSum: 0 };
            subjectMap[t.subject].count++;
            subjectMap[t.subject].totalAttempts += t.attempts || 0;
            subjectMap[t.subject].totalScoreSum  += t.totalScoreSum || 0;
        });
        const subjectBreakdown = Object.entries(subjectMap).map(([subject, d]) => ({
            name: subject,
            tests: d.count,
            attempts: d.totalAttempts,
            avgScore: d.totalAttempts > 0 ? Math.round(d.totalScoreSum / d.totalAttempts) : 0,
        }));

        // Status breakdown for doughnut
        const statusBreakdown = [
            { name: 'Draft',     value: draft,     status: 'draft' },
            { name: 'Published', value: published,  status: 'published' },
            { name: 'Scheduled', value: scheduled,  status: 'scheduled' },
            { name: 'Completed', value: completed,  status: 'completed' },
        ].filter(s => s.value > 0);

        // Monthly trend (tests created per month in last 6 months)
        const monthlyTrend = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthTests = tests.filter(t => {
                const testDate = new Date(t.createdAt);
                return testDate.getMonth() === d.getMonth() && testDate.getFullYear() === d.getFullYear();
            });
            monthlyTrend.push({
                name: monthNames[d.getMonth()],
                tests: monthTests.length,
                attempts: monthTests.reduce((acc, t) => acc + (t.attempts || 0), 0)
            });
        }

        // Top Performers (Needs submissions data, returning empty for now to match UI schema)
        const topPerformers = [];

        return res.status(200).json({
            success: true,
            data: {
                stats: { total, published, draft, scheduled, completed, active },
                analytics: {
                    totalAttempts,
                    averageScore,
                    passingRate,
                    recentActivity,
                    subjectBreakdown,
                    statusBreakdown,
                    monthlyTrend,
                    topPerformers,
                },
            },
        });
    } catch (error) {
        console.error('getTestStats error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Create a new test ─────────────────────────────────────────────────
// POST /api/subject-teacher/online-tests
export const createTest = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);

        const {
            title, description, examType, subject, class: cls, section,
            duration, totalMarks, passingMarks, startDate, startTime,
            endDate, endTime, status, instructions, randomizeQuestions,
            showResults, allowReview, allowRetake, maxAttempts, questions,
        } = req.body;

        if (!title?.trim())  return res.status(400).json({ success: false, message: 'Title is required' });
        if (!examType)       return res.status(400).json({ success: false, message: 'Exam type is required' });
        if (!subject?.trim()) return res.status(400).json({ success: false, message: 'Subject is required' });
        if (!cls?.trim())    return res.status(400).json({ success: false, message: 'Class is required' });
        if (!section?.trim()) return res.status(400).json({ success: false, message: 'Section is required' });
        if (!questions || questions.length === 0)
            return res.status(400).json({ success: false, message: 'At least one question is required' });

        const test = await OnlineTest.create({
            school: schoolId,
            createdBy: req.user._id,
            title, description, examType, subject, class: cls, section,
            duration, totalMarks, passingMarks, startDate, startTime,
            endDate, endTime, status: status || 'draft', instructions,
            randomizeQuestions, showResults, allowReview, allowRetake, maxAttempts,
            questions,
        });

        // Create Notice and Notifications if published or scheduled
        if (['published', 'scheduled'].includes(test.status)) {
            try {
                const schoolDoc = await School.findById(schoolId).lean();
                const orgId = schoolDoc?.organization || req.user.school?.organization?._id;
                
                const classDoc = await Class.findOne({ name: cls, organization: orgId }).lean();
                if (classDoc) {
                    let studentQuery = { class: classDoc._id, school: schoolId };
                    if (section && section !== 'All Sections') {
                        const sectionDoc = await Section.findOne({ name: section, classId: classDoc._id, school: schoolId }).lean();
                        if (sectionDoc) {
                            studentQuery.section = sectionDoc._id;
                        }
                    }
                    
                    const students = await Student.find(studentQuery).select('user').lean();
                    
                    if (orgId) {
                        await Notice.create({
                            organization: orgId,
                            school: schoolId,
                            title: `New Online Test: ${title}`,
                            content: `A new online test for ${subject} has been ${test.status === 'scheduled' ? 'scheduled for ' + startDate + ' at ' + startTime : 'published'}.`,
                            category: 'exam',
                            targetAudience: ['student'],
                            targetClass: cls,
                            targetSection: section,
                            status: 'published',
                            createdBy: req.user._id,
                        });
                    }

                    if (students.length > 0) {
                        const notifications = students.map(student => ({
                            user: student.user,
                            school: schoolId,
                            title: `New Online Test: ${title}`,
                            message: `A new online test for ${subject} has been ${test.status === 'scheduled' ? 'scheduled' : 'published'}.`,
                            type: 'event',
                            senderName: req.user.name || 'Subject Teacher',
                            senderRole: 'teacher',
                        }));
                        await Notification.insertMany(notifications);
                    }
                }
            } catch (notifyErr) {
                console.error('Error creating test notifications:', notifyErr);
                // Do not block test creation on notification failure
            }
        }

        return res.status(201).json({ success: true, message: 'Test created successfully', data: test });
    } catch (error) {
        console.error('createTest error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Get single test by id ─────────────────────────────────────────────
// GET /api/subject-teacher/online-tests/:id
export const getTestById = async (req, res) => {
    try {
        const test = await OnlineTest.findOne({
            _id: req.params.id,
            school: getSchoolId(req.user),
            createdBy: req.user._id,
        }).lean({ virtuals: false });

        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        return res.status(200).json({
            success: true,
            data: {
                ...test,
                averageScore: test.attempts > 0 ? Math.round(test.totalScoreSum / test.attempts) : 0,
            },
        });
    } catch (error) {
        console.error('getTestById error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Update a test (only allowed for draft/scheduled) ──────────────────
// PUT /api/subject-teacher/online-tests/:id
export const updateTest = async (req, res) => {
    try {
        const test = await OnlineTest.findOne({
            _id: req.params.id,
            school: getSchoolId(req.user),
            createdBy: req.user._id,
        });

        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        // Only allow editing draft or scheduled tests
        if (!['draft', 'scheduled'].includes(test.status)) {
            return res.status(400).json({ success: false, message: 'Only draft or scheduled tests can be edited' });
        }

        const allowedFields = [
            'title', 'description', 'examType', 'subject', 'class', 'section',
            'duration', 'totalMarks', 'passingMarks', 'startDate', 'startTime',
            'endDate', 'endTime', 'status', 'instructions', 'randomizeQuestions',
            'showResults', 'allowReview', 'allowRetake', 'maxAttempts', 'questions',
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                test[field] = req.body[field];
            }
        });

        await test.save();
        const testObj = test.toObject({ virtuals: true });
        return res.status(200).json({ success: true, message: 'Test updated successfully', data: testObj });
    } catch (error) {
        console.error('updateTest error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Delete a test ─────────────────────────────────────────────────────
// DELETE /api/subject-teacher/online-tests/:id
export const deleteTest = async (req, res) => {
    try {
        const test = await OnlineTest.findOneAndDelete({
            _id: req.params.id,
            school: getSchoolId(req.user),
            createdBy: req.user._id,
        });

        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        return res.status(200).json({ success: true, message: 'Test deleted successfully' });
    } catch (error) {
        console.error('deleteTest error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Duplicate a test ───────────────────────────────────────────────────
// POST /api/subject-teacher/online-tests/:id/duplicate
export const duplicateTest = async (req, res) => {
    try {
        const original = await OnlineTest.findOne({
            _id: req.params.id,
            school: getSchoolId(req.user),
            createdBy: req.user._id,
        }).lean();

        if (!original) return res.status(404).json({ success: false, message: 'Test not found' });

        const { _id, createdAt, updatedAt, attempts, totalScoreSum, passingCount, ...rest } = original;

        const duplicate = await OnlineTest.create({
            ...rest,
            title: `${original.title} (Copy)`,
            status: 'draft',
            attempts: 0,
            totalScoreSum: 0,
            passingCount: 0,
        });

        return res.status(201).json({ success: true, message: 'Test duplicated', data: duplicate });
    } catch (error) {
        console.error('duplicateTest error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── @desc  Get classes & subjects assigned to teacher (for dropdown filters) ─
// GET /api/subject-teacher/online-tests/filters
export const getFilters = async (req, res) => {
    try {
        const teacherProfile = await Teacher.findOne({ user: req.user._id })
            .populate('assignedClasses', 'name')
            .populate('subjects', 'subjectName')
            .lean();

        const classes  = (teacherProfile?.assignedClasses || []).map(c => ({ _id: c._id, name: c.name }));
        const subjects = (teacherProfile?.subjects || []).map(s => ({ _id: s._id, name: s.subjectName }));

        return res.status(200).json({ success: true, data: { classes, subjects } });
    } catch (error) {
        console.error('getFilters error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
