import mongoose from 'mongoose';
import FeePayment from '../../models/finance/FeePayment.model.js';
import FeeInstallment from '../../models/finance/FeeInstallment.model.js';
import Expense from '../../models/finance/Expense.model.js';
import SalarySlip from '../../models/finance/Salaryslip.model.js';
import User from '../../models/users/user.model.js';
import Student from '../../models/users/student.model.js';
import Notice from '../../models/common/Notice.js';
import StaffMeeting from '../../models/HRM/StaffMeeting.model.js';
import SchoolEvent from '../../models/common/schoolEvent.model.js';

// ── helpers ──────────────────────────────────────────────────

/**
 * Safely create a Mongoose ObjectId.
 * Returns null if the string is not a valid 24-char hex id.
 */
const toObjectId = (str) => {
    if (!str || !mongoose.Types.ObjectId.isValid(str)) return null;
    return new mongoose.Types.ObjectId(str);
};

/**
 * Format a FeePayment document into the shape the frontend expects.
 */
const formatTransaction = (t) => ({
    id        : t.receiptNumber || t._id.toString().slice(-6),
    student   : t.studentId?.name  || 'Unknown',
    class     : 'N/A',
    mode      : t.paymentMode,
    amount    : t.amountPaid,
    status    : t.paymentStatus === 'success' ? 'Success' : 'Failed',
    timestamp : t.paymentDate,
    studentId : t.studentId?._id?.toString() || null,
});

const populateTransactionsStudentInfo = async (payments) => {
    const userIds = payments.map(p => p.studentId?._id || p.studentId).filter(Boolean);
    const studentProfiles = await Student.find({ user: { $in: userIds } })
        .populate('class', 'gradeLevel section')
        .lean();

    const profileMap = {};
    studentProfiles.forEach(sp => {
        if (sp.user) {
            profileMap[String(sp.user)] = sp;
        }
    });

    return payments.map(t => {
        const sName = t.studentId?.name || (typeof t.studentId === 'object' && t.studentId !== null ? t.studentId.name : 'Unknown');
        const sId = t.studentId?._id?.toString() || (typeof t.studentId === 'string' ? t.studentId : null);
        const profile = profileMap[String(sId)];
        
        return {
            id        : t.receiptNumber || t._id.toString().slice(-6),
            student   : sName,
            class     : profile?.class ? `${profile.class.gradeLevel}-${profile.class.section}` : 'N/A',
            mode      : t.paymentMode,
            amount    : t.amountPaid,
            status    : t.paymentStatus === 'success' ? 'Success' : 'Failed',
            timestamp : t.paymentDate,
            studentId : sId,
        };
    });
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/stats
// ─────────────────────────────────────────────────────────────
export const getAccountantDashboardStats = async (req, res) => {
    try {
        const { school_id } = req.query;
        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = toObjectId(school_id);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [todayRes, monthlyRes, pendingRes, activeInstalments, failedTransactions] =
            await Promise.all([
                FeePayment.aggregate([
                    { $match: { school: schoolId, paymentDate: { $gte: today, $lt: tomorrow }, paymentStatus: 'success' } },
                    { $group: { _id: null, total: { $sum: '$totalCollected' } } }
                ]),
                FeePayment.aggregate([
                    { $match: { school: schoolId, paymentDate: { $gte: startOfMonth }, paymentStatus: 'success' } },
                    { $group: { _id: null, total: { $sum: '$totalCollected' } } }
                ]),
                FeeInstallment.aggregate([
                    { $match: { school: schoolId, status: 'active', totalDue: { $gt: 0 } } },
                    { $group: { _id: null, total: { $sum: '$totalDue' } } }
                ]),
                FeeInstallment.countDocuments({ school: schoolId, status: 'active' }),
                FeePayment.countDocuments({ school: schoolId, paymentStatus: 'failed' }),
            ]);

        return res.status(200).json({
            success: true,
            data: {
                todayCollection    : todayRes[0]?.total    || 0,
                monthlyCollection  : monthlyRes[0]?.total  || 0,
                pendingDues        : pendingRes[0]?.total   || 0,
                activeInstalments  : activeInstalments      || 0,
                failedTransactions : failedTransactions     || 0,
            },
        });
    } catch (error) {
        console.error('getAccountantDashboardStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/recent-transactions
// ─────────────────────────────────────────────────────────────
export const getAccountantRecentTransactions = async (req, res) => {
    try {
        const { school_id, limit = 20 } = req.query;
        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = toObjectId(school_id);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        const transactions = await FeePayment.find({ school: schoolId })
            .populate('studentId', 'name')
            .sort({ paymentDate: -1 })
            .limit(parseInt(limit))
            .lean();

        const formatted = await populateTransactionsStudentInfo(transactions);

        return res.status(200).json({
            success: true,
            data   : formatted,
        });
    } catch (error) {
        console.error('getAccountantRecentTransactions:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/monthly-data
// ─────────────────────────────────────────────────────────────
export const getAccountantMonthlyData = async (req, res) => {
    try {
        const { school_id, year = new Date().getFullYear() } = req.query;
        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = toObjectId(school_id);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();

        // Build all 6 month ranges first, then run ONE aggregate
        const ranges = Array.from({ length: 6 }, (_, i) => {
            const monthIndex = (now.getMonth() - 5 + i + 12) % 12;
            const y = monthIndex > now.getMonth() ? Number(year) - 1 : Number(year);
            return {
                label     : months[monthIndex],
                startDate : new Date(y, monthIndex, 1),
                endDate   : new Date(y, monthIndex + 1, 0, 23, 59, 59),
            };
        });

        // Single aggregate with $facet — one round-trip instead of 6
        const facetStages = {};
        ranges.forEach(({ label, startDate, endDate }) => {
            facetStages[label] = [
                { $match: { school: schoolId, paymentDate: { $gte: startDate, $lte: endDate }, paymentStatus: 'success' } },
                { $group: { _id: null, total: { $sum: '$totalCollected' } } },
            ];
        });

        const [facetResult] = await FeePayment.aggregate([{ $facet: facetStages }]);

        const monthlyData = ranges.map(({ label }) => ({
            month      : label,
            collection : facetResult[label][0]?.total || 0,
            // NOTE: 'target' is intentionally omitted — the frontend manages
            // the target via localStorage and overlays it via mappedChartData.
            // Sending a hardcoded 500000 here would conflict with user overrides.
        }));

        return res.status(200).json({ success: true, data: monthlyData });
    } catch (error) {
        console.error('getAccountantMonthlyData:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/all-transactions
// FIX: search is applied via MongoDB regex BEFORE pagination,
//      so results are correct regardless of page size.
// ─────────────────────────────────────────────────────────────
export const getAccountantAllTransactions = async (req, res) => {
    try {
        const { school_id, page = 1, limit = 50, search, status } = req.query;
        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const schoolId = toObjectId(school_id);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        // Build base match
        const matchStage = { school: schoolId };
        if (status && status !== 'All') {
            matchStage.paymentStatus = status.toLowerCase();
        }

        const skip  = (parseInt(page) - 1) * parseInt(limit);
        const lim   = parseInt(limit);

        let payments, total;

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');

            // Aggregate: lookup student, filter by name or receiptNumber, paginate
            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from         : 'users',
                        localField   : 'studentId',
                        foreignField : '_id',
                        as           : 'studentData',
                    },
                },
                { $unwind: { path: '$studentData', preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: [
                            { 'studentData.name': regex },
                            { receiptNumber: regex },
                        ],
                    },
                },
            ];

            // Count before pagination
            const [countResult] = await FeePayment.aggregate([
                ...pipeline,
                { $count: 'total' },
            ]);
            total = countResult?.total || 0;

            // Paginate and get rows
            payments = await FeePayment.aggregate([
                ...pipeline,
                { $sort: { paymentDate: -1 } },
                { $skip: skip },
                { $limit: lim },
                {
                    $project: {
                        receiptNumber : 1,
                        paymentMode   : 1,
                        amountPaid    : 1,
                        paymentStatus : 1,
                        paymentDate   : 1,
                        studentId     : {
                            _id     : '$studentData._id',
                            name    : '$studentData.name'
                        },
                    },
                },
            ]);
        } else {
            // No search — simple find with populate
            [payments, total] = await Promise.all([
                FeePayment.find(matchStage)
                    .populate('studentId', 'name')
                    .sort({ paymentDate: -1 })
                    .skip(skip)
                    .limit(lim)
                    .lean(),
                FeePayment.countDocuments(matchStage),
            ]);
        }

        const transactions = await populateTransactionsStudentInfo(payments);

        // FIX: always return { data: { transactions, pagination } }
        // so the frontend can reliably do res.data.data.transactions
        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total : total,
                    page  : parseInt(page),
                    limit : lim,
                    pages : Math.ceil(total / lim),
                },
            },
        });
    } catch (error) {
        console.error('getAccountantAllTransactions:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/student-report/:studentId
// FIX: validate ObjectId before casting (avoids CastError 500s)
// ─────────────────────────────────────────────────────────────
export const getStudentTransactionReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { school_id }  = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId is required' });
        }

        // FIX: guard invalid ObjectIds — returns 400 instead of a CastError 500
        const schoolId        = toObjectId(school_id);
        const studentObjectId = toObjectId(studentId);
        if (!schoolId || !studentObjectId) {
            return res.status(400).json({ success: false, message: 'Invalid school_id or studentId' });
        }

        // Fetch student + all their payments in parallel
        const [student, transactions, installment] = await Promise.all([
            User.findById(studentObjectId)
                .select('name email phone class section admissionNo rollNo fatherName motherName parentPhone parentEmail')
                .lean(),

            FeePayment.find({ school: schoolId, studentId: studentObjectId })
                .sort({ paymentDate: -1 })
                .lean(),

            FeeInstallment.findOne({ school: schoolId, studentId: studentObjectId, status: 'active' }).lean(),
        ]);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const totalPaid   = transactions.reduce((s, t) => s + (t.amountPaid   || 0), 0);
        const totalLateFee = transactions.reduce((s, t) => s + (t.lateFeePaid || 0), 0);
        const totalDue    = installment?.totalDue || 0;

        return res.status(200).json({
            success: true,
            data: {
                student: {
                    id          : student._id.toString(),
                    name        : student.name        || 'Unknown',
                    rollNo      : student.rollNo      || 0,
                    class       : student.class       || 'N/A',
                    section     : student.section     || 'N/A',
                    admissionNo : student.admissionNo || 'N/A',
                    email       : student.email       || 'N/A',
                    phone       : student.phone       || 'N/A',
                    fatherName  : student.fatherName  || 'N/A',
                    motherName  : student.motherName  || 'N/A',
                    parentPhone : student.parentPhone || student.phone || 'N/A',
                    parentEmail : student.parentEmail || student.email || 'N/A',
                },
                summary: {
                    totalPaid,
                    totalLateFee,
                    totalDue,
                    totalTransactions : transactions.length,
                    averagePayment    : transactions.length > 0
                        ? Math.round(totalPaid / transactions.length)
                        : 0,
                },
                // FIX: only include success transactions in the report
                transactions: transactions
                    .filter(t => t.paymentStatus === 'success')
                    .map(t => ({
                        date          : t.paymentDate,
                        amount        : t.amountPaid     || 0,
                        lateFee       : t.lateFeePaid    || 0,
                        total         : t.totalCollected || 0,
                        mode          : t.paymentMode    || 'Cash',
                        receiptNumber : t.receiptNumber  || 'N/A',
                        status        : 'Success',
                        remarks       : t.remarks        || '',
                    })),
            },
        });
    } catch (error) {
        console.error('getStudentTransactionReport:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard/communications
// ─────────────────────────────────────────────────────────────
export const getAccountantCommunications = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School ID not found in user session' });
        }

        const [notices, meetings, events] = await Promise.all([
            Notice.find({
                school: schoolId,
                status: 'published',
                targetAudience: { $in: ['all', 'accountants'] },
            }).populate('createdBy', 'name role').sort({ createdAt: -1 }).lean(),

            StaffMeeting.find({
                school: schoolId,
                status: { $in: ['scheduled', 'ongoing', 'completed'] },
                $or: [
                    { targetRoles: { $in: ['all', 'accountant'] } },
                    { 'targetRoles.targetRoles': { $in: ['all', 'accountant'] } },
                    { 'attendees.staffId': req.user._id },
                ],
            }).populate('createdBy', 'name role').sort({ scheduledAt: -1 }).lean(),

            SchoolEvent.find({
                school: schoolId,
                targetRoles: { $in: ['all', 'accountant'] },
            }).populate('createdBy', 'name role').sort({ eventDate: -1 }).lean(),
        ]);

        const formattedNotices = notices.map(n => {
            const isRead       = n.viewedBy?.some(v => v.user?.toString() === req.user._id.toString());
            const creatorRole  = n.createdBy?.role?.toUpperCase() === 'PRINCIPAL' ? 'PRINCIPAL' : 'ADMIN';
            return {
                id         : n._id,
                type       : 'notice',
                title      : n.title,
                content    : n.content ? n.content.replace(/<[^>]*>/g, '') : '',
                category   : n.category,
                isPinned   : n.isPinned,
                isRead     : !!isRead,
                date       : n.createdAt,
                createdBy  : n.createdBy?.name || 'Admin',
                source     : creatorRole,
            };
        });

        const formattedMeetings = meetings.map(m => {
            const attendee = m.attendees?.find(a => a.staffId?.toString() === req.user._id.toString());
            return {
                id          : m._id,
                type        : 'meeting',
                title       : m.title,
                content     : m.agenda || `Staff Meeting at ${m.venue || 'Campus'}`,
                category    : m.meetingType,
                isRead      : !!attendee?.hasAcknowledged,
                date        : m.scheduledAt,
                duration    : m.durationMinutes,
                venue       : m.venue,
                isOnline    : m.isOnline,
                meetingLink : m.meetingLink,
                createdBy   : m.createdBy?.name || 'Principal',
                source      : 'PRINCIPAL',
            };
        });

        const formattedEvents = events.map(e => {
            const creatorRole = e.createdBy?.role?.toUpperCase() === 'PRINCIPAL' ? 'PRINCIPAL' : 'ADMIN';
            return {
                id        : e._id,
                type      : 'event',
                title     : e.title,
                content   : e.description || `School event under category ${e.category} at ${e.location}`,
                category  : e.category,
                isRead    : true,
                date      : e.eventDate,
                startTime : e.startTime,
                endTime   : e.endTime,
                location  : e.location,
                createdBy : e.createdBy?.name || 'School Admin',
                source    : creatorRole,
            };
        });

        const allCommunications = [
            ...formattedNotices,
            ...formattedMeetings,
            ...formattedEvents,
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            success: true,
            data: {
                communications : allCommunications,
                unreadCount    : allCommunications.filter(c => !c.isRead).length,
            },
        });
    } catch (error) {
        console.error('getAccountantCommunications:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/accountant/dashboard/communications/notices/:id/view
// ─────────────────────────────────────────────────────────────
export const markAccountantNoticeRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notice  = await Notice.findById(id);
        if (!notice) {
            return res.status(404).json({ success: false, message: 'Notice not found' });
        }

        const alreadyViewed = notice.viewedBy?.some(
            v => v.user.toString() === req.user._id.toString()
        );
        if (!alreadyViewed) {
            notice.viewedBy.push({ user: req.user._id, viewedAt: new Date() });
            await notice.save();
        }

        return res.status(200).json({ success: true, message: 'Notice marked as read' });
    } catch (error) {
        console.error('markAccountantNoticeRead:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
