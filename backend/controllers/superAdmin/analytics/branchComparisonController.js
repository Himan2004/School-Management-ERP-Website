import mongoose from 'mongoose';
import User from '../../../models/users/user.model.js';
import School from '../../../models/school/School.js';
import Attendance from '../../../models/academic/attendance.model.js';
import Marksheet from '../../../models/academic/marksheet.model.js';
import FeePayment from '../../../models/finance/FeePayment.model.js';
import FeeInstallment from '../../../models/finance/FeeInstallment.model.js';
import Period from '../../../models/modules/Period.js';

// ─── Month name → index map ───────────────────────────────────────────────────
const MONTH_MAP = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

/**
 * Parse filter params into a { startDate, endDate } range.
 * Academic session format: "2025-26" → start year = 2025, end year = 2026.
 * Month range wraps across years when dateFrom > dateTo (e.g. Oct → Mar).
 */
const parseDateRange = (dateFrom, dateTo, academicSession) => {
    const session = String(academicSession || '2025-26');
    const startYear = parseInt(session.split('-')[0]) || new Date().getFullYear();
    const endYear = startYear + 1;

    const fromMonthIdx = MONTH_MAP[dateFrom] ?? 3; // default April
    const toMonthIdx   = MONTH_MAP[dateTo]   ?? 8; // default September

    // If session-start month is before April, start is in endYear; else startYear
    const fromYear = fromMonthIdx >= 3 ? startYear : endYear;
    const toYear   = toMonthIdx   >= 3 ? startYear : endYear;

    const startDate = new Date(fromYear, fromMonthIdx, 1);
    const endDate   = new Date(toYear,   toMonthIdx + 1, 0, 23, 59, 59, 999);

    // Guard: if endDate before startDate (e.g. user selected To before From), flip
    if (endDate < startDate) endDate.setFullYear(endDate.getFullYear() + 1);

    return { startDate, endDate };
};

/**
 * Core metrics fetcher for a single school.
 * Accepts optional { dateFrom, dateTo, academicSession } filter params.
 */
const getBranchMetrics = async (schoolId, filters = {}) => {
    const { dateFrom, dateTo, academicSession } = filters;
    const { startDate, endDate } = parseDateRange(dateFrom, dateTo, academicSession);

    const students = await User.countDocuments({ role: 'student', school: schoolId });
    const staff = await User.countDocuments({
        role: { $in: ['teacher', 'admin', 'accountant', 'support_staff'] },
        school: schoolId
    });

    // Attendance — filtered to selected date range
    const attendanceRecords = await Attendance.find({
        school: schoolId,
        date: { $gte: startDate, $lte: endDate }
    });

    let totalPresent = 0;
    let totalRecords = 0;
    attendanceRecords.forEach(record => {
        totalPresent += record.totalPresent || 0;
        totalRecords += record.entries?.length || 0;
    });
    const attendance = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Pass percentage — marksheets in date range (use updatedAt as proxy for exam date)
    const marksheets = await Marksheet.find({
        school: schoolId,
        status: 'published',
        updatedAt: { $gte: startDate, $lte: endDate }
    });
    // Fall back to all published marksheets if none in range
    const marksheetPool = marksheets.length > 0
        ? marksheets
        : await Marksheet.find({ school: schoolId, status: 'published' });
    const totalPass = marksheetPool.filter(m => m.isPass).length;
    const passPercent = marksheetPool.length > 0 ? (totalPass / marksheetPool.length) * 100 : 0;

    // Fee collection — payments within date range
    const feePayments = await FeePayment.aggregate([
        { $match: { school: new mongoose.Types.ObjectId(schoolId), paymentStatus: 'success', createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    const feeInstallments = await FeeInstallment.aggregate([
        { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]);

    const expectedFee = feeInstallments[0]?.total || students * 50000;
    const feeCollected = feePayments[0]?.total || 0;
    const feePercentage = expectedFee > 0 ? (feeCollected / expectedFee) * 100 : 0;

    // Score (average of key metrics)
    const score = (attendance + passPercent + feePercentage) / 3;

    // Trend — compare attendance in selected range vs. previous same-length period
    const rangeDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const prevEnd   = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    const prevAttendanceRecords = await Attendance.find({
        school: schoolId,
        date: { $gte: prevStart, $lte: prevEnd }
    });

    let prevTotalPresent = 0;
    let prevTotalRecords = 0;
    prevAttendanceRecords.forEach(record => {
        prevTotalPresent += record.totalPresent || 0;
        prevTotalRecords += record.entries?.length || 0;
    });
    const prevAttendance = prevTotalRecords > 0 ? (prevTotalPresent / prevTotalRecords) * 100 : 0;
    const trend = attendance >= prevAttendance ? 'up' : 'down';

    return { students, staff, attendance, passPercent, feePercentage, score: score / 10, trend };
};

/**
 * GET /api/superadmin/analytics/branches/all
 * Get all branches with metrics filtered by dateFrom/dateTo/academicSession
 */
export const getAllBranches = async (req, res) => {
    try {
        const { dateFrom, dateTo, academicSession, isClassWise, selectedClass } = req.query;
        const filters = { dateFrom, dateTo, academicSession, isClassWise, selectedClass };

        const schools = await School.find({ organization: req.user._id })
            .select('schoolName principalName officialEmail officialPhone address branchId');

        const branchData = await Promise.all(schools.map(async (school) => {
            const metrics = await getBranchMetrics(school._id, filters);

            const score10 = metrics.score * 10;
            const status = score10 >= 80 ? 'Active' : score10 < 70 ? 'Underperforming' : 'Average';

            return {
                id: school._id,
                branchName: school.schoolName,
                principalName: school.principalName || 'N/A',
                officialEmail: school.officialEmail || 'N/A',
                officialPhone: school.officialPhone || 'N/A',
                address: school.address || 'N/A',
                branchCode: school.branchId || 'N/A',
                students: metrics.students,
                staff: metrics.staff,
                attendance: Number(metrics.attendance.toFixed(1)),
                passPercent: Number(metrics.passPercent.toFixed(1)),
                feeCollection: Number(metrics.feePercentage.toFixed(1)),
                score: metrics.score,
                trend: metrics.trend,
                status
            };
        }));

        branchData.sort((a, b) => b.score - a.score);

        return res.status(200).json({ success: true, data: branchData });

    } catch (error) {
        console.error('Error in getAllBranches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/branches/low-performing
 * Get branches needing attention (score < 70)
 */
export const getLowPerformingBranches = async (req, res) => {
    try {
        const filters = req.query;
        const schools = await School.find({ organization: req.user._id }).select('schoolName');

        const lowPerforming = [];

        for (const school of schools) {
            const metrics = await getBranchMetrics(school._id, filters);

            if (metrics.score * 10 < 70) {
                const issues = [];
                if (metrics.attendance < 80)    issues.push('Low attendance');
                if (metrics.passPercent < 85)   issues.push('Low pass percentage');
                if (metrics.feePercentage < 70) issues.push('Fee collection issues');

                lowPerforming.push({
                    branch: school.schoolName,
                    score: Math.round(metrics.score * 10),
                    mainIssue: issues[0] || 'Multiple issues',
                    issues
                });
            }
        }

        return res.status(200).json({ success: true, data: lowPerforming });

    } catch (error) {
        console.error('Error in getLowPerformingBranches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/branches/compare
 * Compare two branches using the same date/session filter
 */
export const compareBranches = async (req, res) => {
    try {
        const { leftBranchId, rightBranchId, dateFrom, dateTo, academicSession, isClassWise, selectedClass } = req.query;
        const filters = { dateFrom, dateTo, academicSession, isClassWise, selectedClass };

        if (!leftBranchId || !rightBranchId) {
            return res.status(400).json({ success: false, message: 'Both branch IDs are required' });
        }

        const leftSchool  = await School.findOne({ _id: leftBranchId,  organization: req.user._id });
        const rightSchool = await School.findOne({ _id: rightBranchId, organization: req.user._id });

        if (!leftSchool || !rightSchool) {
            return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
        }

        const [leftMetrics, rightMetrics] = await Promise.all([
            getBranchMetrics(leftBranchId,  filters),
            getBranchMetrics(rightBranchId, filters),
        ]);

        const comparisonData = {
            left: {
                id: leftSchool._id,
                name: leftSchool.schoolName,
                students: leftMetrics.students,
                staff: leftMetrics.staff,
                attendance: Number(leftMetrics.attendance.toFixed(1)),
                passPercent: Number(leftMetrics.passPercent.toFixed(1)),
                feeCollection: Number(leftMetrics.feePercentage.toFixed(1)),
                score: leftMetrics.score
            },
            right: {
                id: rightSchool._id,
                name: rightSchool.schoolName,
                students: rightMetrics.students,
                staff: rightMetrics.staff,
                attendance: Number(rightMetrics.attendance.toFixed(1)),
                passPercent: Number(rightMetrics.passPercent.toFixed(1)),
                feeCollection: Number(rightMetrics.feePercentage.toFixed(1)),
                score: rightMetrics.score
            }
        };

        return res.status(200).json({ success: true, data: comparisonData });

    } catch (error) {
        console.error('Error in compareBranches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/branches/:branchId/details
 * Get detailed information about a specific branch
 */
export const getBranchDetails = async (req, res) => {
    try {
        const { branchId } = req.params;
        const filters = req.query;

        const school = await School.findOne({ _id: branchId, organization: req.user._id });
        if (!school) {
            return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
        }

        const metrics = await getBranchMetrics(branchId, filters);

        // Get class-wise strength
        const periods = await Period.find({
            schoolId: new mongoose.Types.ObjectId(branchId),
            status: 'active'
        }).select('gradeLevel section periodName maxCapacity');

        const classStrength = await Promise.all(periods.map(async (period) => {
            const students = await User.countDocuments({
                role: 'student',
                school: branchId,
                periodId: period._id
            });
            return { className: period.gradeLevel, strength: students };
        }));

        const groupedStrength = [
            { className: 'Class 1-2', strength: classStrength.filter(c => c.className?.includes('1') || c.className?.includes('2')).reduce((s, c) => s + c.strength, 0) },
            { className: 'Class 3-5', strength: classStrength.filter(c => ['3','4','5'].some(n => c.className?.includes(n))).reduce((s, c) => s + c.strength, 0) },
            { className: 'Class 6-8', strength: classStrength.filter(c => ['6','7','8'].some(n => c.className?.includes(n))).reduce((s, c) => s + c.strength, 0) },
            { className: 'Class 9-10', strength: classStrength.filter(c => c.className?.includes('9') || c.className?.includes('10')).reduce((s, c) => s + c.strength, 0) }
        ];

        // Monthly trends within the filter period
        const { startDate, endDate } = parseDateRange(filters.dateFrom, filters.dateTo, filters.academicSession);
        const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthlyAttendance = [];
        const monthlyFee = [];

        let cur = new Date(startDate);
        while (cur <= endDate) {
            const mStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
            const mEnd   = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
            const mLabel = `${MONTH_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}`;

            const mAttRecords = await Attendance.find({ school: branchId, date: { $gte: mStart, $lte: mEnd } });
            let mPresent = 0, mTotal = 0;
            mAttRecords.forEach(r => { mPresent += r.totalPresent || 0; mTotal += r.entries?.length || 0; });
            monthlyAttendance.push({ month: mLabel, value: mTotal > 0 ? Number(((mPresent / mTotal) * 100).toFixed(1)) : 0 });

            const mFeePayments = await FeePayment.aggregate([
                { $match: { school: new mongoose.Types.ObjectId(branchId), paymentStatus: 'success', createdAt: { $gte: mStart, $lte: mEnd } } },
                { $group: { _id: null, total: { $sum: '$amountPaid' } } }
            ]);
            const mFeeInstallments = await FeeInstallment.aggregate([
                { $match: { school: new mongoose.Types.ObjectId(branchId) } },
                { $group: { _id: null, total: { $sum: '$netAmount' } } }
            ]);
            const mExpected = mFeeInstallments[0]?.total || metrics.students * 50000;
            const mCollected = mFeePayments[0]?.total || 0;
            monthlyFee.push({ month: mLabel, value: mExpected > 0 ? Number(((mCollected / mExpected) * 100).toFixed(1)) : 0 });

            cur.setMonth(cur.getMonth() + 1);
        }

        // Top due students
        const topDueStudents = await FeeInstallment.find({ school: branchId, totalDue: { $gt: 0 } })
            .populate('studentId', 'name class section')
            .sort({ totalDue: -1 })
            .limit(3)
            .lean();

        const formattedDueStudents = topDueStudents.map(s => ({
            name: s.studentId?.name || 'Unknown',
            className: `${s.studentId?.class || ''} ${s.studentId?.section || ''}`.trim(),
            due: s.totalDue
        }));

        // Staff breakdown
        const [teachingStaff, adminStaff, supportStaff, accountsStaff] = await Promise.all([
            User.countDocuments({ role: 'teacher',       school: branchId }),
            User.countDocuments({ role: 'admin',         school: branchId }),
            User.countDocuments({ role: 'support_staff', school: branchId }),
            User.countDocuments({ role: 'accountant',    school: branchId }),
        ]);

        // Fee totals
        const feePaymentsTotal = await FeePayment.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(branchId), paymentStatus: 'success' } },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);
        const feeInstallmentsTotal = await FeeInstallment.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(branchId) } },
            { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]);

        const feeExpected  = feeInstallmentsTotal[0]?.total || metrics.students * 50000;
        const feeCollected = feePaymentsTotal[0]?.total || 0;
        const feePending   = feeExpected - feeCollected;

        return res.status(200).json({
            success: true,
            data: {
                branchName: school.schoolName,
                students: metrics.students,
                staff: metrics.staff,
                attendance: Number(metrics.attendance.toFixed(1)),
                passPercent: Number(metrics.passPercent.toFixed(1)),
                feeCollection: Number(metrics.feePercentage.toFixed(1)),
                score: Math.round(metrics.score * 10),
                classStrength: groupedStrength,
                monthlyAttendanceTrend: monthlyAttendance,
                feeCollectionTrend: monthlyFee,
                staffDetail: {
                    teaching: teachingStaff,
                    admin: adminStaff,
                    accounts: accountsStaff,
                    support: supportStaff,
                    attendanceRate: Number(metrics.attendance.toFixed(1)),
                    resignationsThisYear: 0
                },
                financeDetail: {
                    feeExpected,
                    feeCollected,
                    feePending,
                    topDueStudents: formattedDueStudents
                }
            }
        });

    } catch (error) {
        console.error('Error in getBranchDetails:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

