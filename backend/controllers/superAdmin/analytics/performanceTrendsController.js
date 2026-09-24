import mongoose from 'mongoose';
import User from '../../../models/users/user.model.js';
import School from '../../../models/school/School.js';
import Attendance from '../../../models/academic/attendance.model.js';
import Marksheet from '../../../models/academic/marksheet.model.js';
import FeePayment from '../../../models/finance/FeePayment.model.js';
import AdmissionRequest from '../../../models/school/admissionRequest.js';
import FeeInstallment from '../../../models/finance/FeeInstallment.model.js';
import Class from '../../../models/organization/organizationClass.js';
import StaffAttendance from '../../../models/HRM/Staffattendance.model.js';
import Teacher from '../../../models/users/teacher.model.js';
import AcademicConfig from '../../../models/organization/AcademicConfig.js';

/**
 * SAFE KEY GENERATOR
 */
const getSchoolKey = (schoolName = '') => {
    if (!schoolName) return 'unknown';

    return schoolName
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim();
};

/**
 * GET /api/superadmin/analytics/trends/enrollment
 * Get enrollment trend over months (branch-wise)
 */
export const getEnrollmentTrend = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const months = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];

        // ✅ FIX: filter by org
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('schoolName');

        const trendData = [];

        for (let i = 0; i < 12; i++) {
            const monthIndex = (4 + i) % 12;
            const year = monthIndex >= 4 ? currentYear - 1 : currentYear;
            const endDate = new Date(year, monthIndex + 1, 0);

            const monthData = { month: months[i] };

            for (const school of schools) {
                const count = await User.countDocuments({
                    role: 'student',
                    school: school._id,
                    createdAt: { $lte: endDate },
                });
                const key = getSchoolKey(school?.schoolName);
                monthData[key] = count;
            }

            trendData.push(monthData);
        }

        return res.status(200).json({ success: true, data: trendData });
    } catch (error) {
        console.error('Error in getEnrollmentTrend:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * GET /api/superadmin/analytics/trends/attendance
 */
export const getAttendanceTrend = async (req, res) => {
    try {
        const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
        const currentYear = new Date().getFullYear();

        // ✅ FIX: get org's schools first
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('_id');
        const schoolIds = schools.map(s => s._id);

        const attendanceData = [];

        for (let i = 0; i < 6; i++) {
            const monthIndex = (10 + i) % 12;
            const year = monthIndex >= 10 ? currentYear - 1 : currentYear;
            const startDate = new Date(year, monthIndex, 1);
            const endDate = new Date(year, monthIndex + 1, 0);

            // ✅ FIX: added school filter
            const records = await Attendance.find({
                school: { $in: schoolIds },
                date: { $gte: startDate, $lte: endDate },
            });

            let totalPresent = 0;
            let totalRecords = 0;

            records.forEach((record) => {
                totalPresent += record.totalPresent || 0;
                totalRecords += record.entries?.length || 0;
            });

            const attendance = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

            attendanceData.push({
                month: months[i],
                attendance: Math.round(attendance * 10) / 10,
            });
        }

        return res.status(200).json({ success: true, data: attendanceData });
    } catch (error) {
        console.error('Error in getAttendanceTrend:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/trends/revenue
 */
export const getRevenueTrend = async (req, res) => {
    try {
        const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
        const currentYear = new Date().getFullYear();

        // ✅ FIX: filter by org
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('schoolName');

        const revenueData = [];

        for (let i = 0; i < 6; i++) {
            const monthIndex = (10 + i) % 12;
            const year = monthIndex >= 10 ? currentYear - 1 : currentYear;
            const startDate = new Date(year, monthIndex, 1);
            const endDate = new Date(year, monthIndex + 1, 0);

            const monthData = { month: months[i] };

            for (const school of schools) {
                const payments = await FeePayment.aggregate([
                    {
                        $match: {
                            school: school._id,
                            paymentDate: { $gte: startDate, $lte: endDate },
                            paymentStatus: 'success',
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amountPaid' } } },
                ]);

                const key = getSchoolKey(school?.schoolName);
                monthData[key] = payments[0]?.total || 0;
            }

            revenueData.push(monthData);
        }

        return res.status(200).json({ success: true, data: revenueData });
    } catch (error) {
        console.error('Error in getRevenueTrend:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/trends/pass-percentage
 */
export const getPassPercentageTrend = async (req, res) => {
    try {
        const exams = ['UT1', 'UT2', 'Half Yearly', 'UT3', 'Annual'];

        // ✅ FIX: filter by org
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('schoolName');

        const passData = [];

        for (const exam of exams) {
            const examData = { exam };

            for (const school of schools) {
                const marksheets = await Marksheet.find({
                    school: school._id,
                    status: 'published',
                }).populate('examStructure');

                let totalStudents = 0;
                let totalPass = 0;

                for (const marksheet of marksheets) {
                    if (marksheet?.examStructure?.examName === exam) {
                        totalStudents++;
                        if (marksheet?.isPass) totalPass++;
                    }
                }

                const passPercent = totalStudents > 0 ? (totalPass / totalStudents) * 100 : 0;
                const key = getSchoolKey(school?.schoolName);
                examData[key] = Math.round(passPercent);
            }

            passData.push(examData);
        }

        return res.status(200).json({ success: true, data: passData });
    } catch (error) {
        console.error('Error in getPassPercentageTrend:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/trends/growth
 */
export const getGrowthMetrics = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        // ✅ Org scoping (from previous fix)
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('_id');
        const schoolIds = schools.map(s => s._id);

        // --- Student Growth (already existed) ---
        const currentYearStudents = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: { $gte: new Date(currentYear, 0, 1) },
        });
        const lastYearStudents = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: {
                $gte: new Date(lastYear, 0, 1),
                $lt: new Date(currentYear, 0, 1),
            },
        });
        const studentGrowth = lastYearStudents > 0
            ? ((currentYearStudents - lastYearStudents) / lastYearStudents) * 100
            : 0;

        // --- Revenue Growth (already existed) ---
        const currentYearRevenue = await FeePayment.aggregate([
            {
                $match: {
                    school: { $in: schoolIds },
                    paymentDate: { $gte: new Date(currentYear, 0, 1) },
                    paymentStatus: 'success',
                },
            },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } },
        ]);
        const lastYearRevenue = await FeePayment.aggregate([
            {
                $match: {
                    school: { $in: schoolIds },
                    paymentDate: {
                        $gte: new Date(lastYear, 0, 1),
                        $lt: new Date(currentYear, 0, 1),
                    },
                    paymentStatus: 'success',
                },
            },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } },
        ]);
        const currentRevenue = currentYearRevenue[0]?.total || 0;
        const lastRevenue = lastYearRevenue[0]?.total || 0;
        const revenueGrowth = lastRevenue > 0
            ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
            : 0;

        // --- ✅ Attendance Change (NOW DYNAMIC) ---
        // Compare current month attendance vs previous month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentAttRecs = await Attendance.find({
            school: { $in: schoolIds },
            date: { $gte: currentMonthStart, $lte: currentMonthEnd },
        });
        const prevAttRecs = await Attendance.find({
            school: { $in: schoolIds },
            date: { $gte: prevMonthStart, $lte: prevMonthEnd },
        });

        const calcAttendance = (records) => {
            let totalPresent = 0, totalRecords = 0;
            records.forEach(r => {
                totalPresent += r.totalPresent || 0;
                totalRecords += r.entries?.length || 0;
            });
            return totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;
        };

        const currentAttendance = calcAttendance(currentAttRecs);
        const prevAttendance = calcAttendance(prevAttRecs);
        const attendanceChange = Math.round((currentAttendance - prevAttendance) * 10) / 10;

        // --- ✅ Pass % Change (NOW DYNAMIC) ---
        // Compare pass % of last published exam vs the one before it
        const exams = ['UT1', 'UT2', 'Half Yearly', 'UT3', 'Annual'];

        const getPassPercent = async (examName) => {
            const marksheets = await Marksheet.find({
                school: { $in: schoolIds },
                status: 'published',
            }).populate('examStructure');

            const relevant = marksheets.filter(
                m => m?.examStructure?.examName === examName
            );
            if (relevant.length === 0) return null;

            const passed = relevant.filter(m => m.isPass).length;
            return (passed / relevant.length) * 100;
        };

        // Find the two most recent exams that have data
        let passChange = 0;
        let latestPassPct = null;
        let prevPassPct = null;

        for (let i = exams.length - 1; i >= 0; i--) {
            const pct = await getPassPercent(exams[i]);
            if (pct !== null) {
                if (latestPassPct === null) {
                    latestPassPct = pct;
                } else {
                    prevPassPct = pct;
                    break;
                }
            }
        }

        if (latestPassPct !== null && prevPassPct !== null) {
            passChange = Math.round((latestPassPct - prevPassPct) * 10) / 10;
        } else if (latestPassPct !== null) {
            passChange = Math.round(latestPassPct * 10) / 10; // only one exam has data
        }

        return res.status(200).json({
            success: true,
            data: {
                studentGrowth: Math.round(studentGrowth * 10) / 10,
                revenueGrowth: Math.round(revenueGrowth * 10) / 10,
                attendanceChange,   // ✅ now dynamic
                passChange,         // ✅ now dynamic
            },
        });

    } catch (error) {
        console.error('Error in getGrowthMetrics:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── MONTH MAP FOR CONSOLIDATION ──────────────────────────────────────────────
const CONSOLIDATED_MONTH_MAP = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

// ─── DATE RANGE HELPER FOR PERFORMANCE TRENDS ───────────────────────────────
const parsePerformanceDateRange = (dateFrom, dateTo, academicSession) => {
    const session = String(academicSession || '2025-2026');
    const startYear = parseInt(session.split('-')[0]) || new Date().getFullYear();
    const endYear = startYear + 1;

    const fromMonthIdx = CONSOLIDATED_MONTH_MAP[dateFrom] ?? 3; // default April
    const toMonthIdx   = CONSOLIDATED_MONTH_MAP[dateTo]   ?? 2; // default March

    const fromYear = fromMonthIdx >= 3 ? startYear : endYear;
    const toYear   = toMonthIdx   >= 3 ? startYear : endYear;

    const startDate = new Date(fromYear, fromMonthIdx, 1);
    const endDate   = new Date(toYear,   toMonthIdx + 1, 0, 23, 59, 59, 999);

    if (endDate < startDate) endDate.setFullYear(endDate.getFullYear() + 1);

    return { startDate, endDate };
};

// ─── BRANCH METRICS HELPER FOR WEAK BRANCHES ─────────────────────────────────
const getBranchMetricsHelper = async (schoolId, startDate, endDate, academicSession) => {
    const session = String(academicSession || '2025-2026');
    const parts = session.split('-');
    const startYear = parseInt(parts[0]) || new Date().getFullYear();
    const endYear = parseInt(parts[1]) || (startYear + 1);

    const students = await User.countDocuments({ role: 'student', school: schoolId });

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

    // Pass percentage
    const marksheets = await Marksheet.find({
        school: schoolId,
        academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
        status: 'published'
    });
    const totalPass = marksheets.filter(m => m.isPass).length;
    const passPercent = marksheets.length > 0 ? (totalPass / marksheets.length) * 100 : 0;

    // Fee collection
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

    const score = (attendance + passPercent + feePercentage) / 3;

    return { students, attendance, passPercent, feePercentage, score };
};

// ─── CONSOLIDATED PERFORMANCE TRENDS DATA ENDPOINT ───────────────────────────
export const getPerformanceTrendsData = async (req, res) => {
    try {
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('_id schoolName');
        const schoolIds = schools.map(s => s._id);
        const schoolIdObjs = schoolIds.map(id => new mongoose.Types.ObjectId(id));

        // Get active academic year label from config
        const config = await AcademicConfig.findOne({ organization: orgId });
        const activeYearLabel = config?.academicYear?.label || '2026-2027';

        // Get unique academic years from Marksheet
        const markssYears = await Marksheet.distinct('academicYear', { school: { $in: schoolIds } });

        // Normalize format: we want them in "YYYY-YYYY" format (e.g. "2025-2026")
        const formatSession = (sessionStr) => {
            if (!sessionStr) return null;
            const parts = sessionStr.split(/[-/]/);
            if (parts.length === 2) {
                const start = parseInt(parts[0]);
                let end = parseInt(parts[1]);
                if (end < 100) {
                    end = Math.floor(start / 100) * 100 + end;
                }
                return `${start}-${end}`;
            }
            return sessionStr;
        };

        const sessionSet = new Set();
        const formattedActive = formatSession(activeYearLabel);
        if (formattedActive) {
            sessionSet.add(formattedActive);
        }
        markssYears.forEach(y => {
            const formatted = formatSession(y);
            if (formatted) sessionSet.add(formatted);
        });

        // Add default years just in case
        const currentYear = new Date().getFullYear();
        sessionSet.add(`${currentYear}-${currentYear + 1}`);
        sessionSet.add(`${currentYear - 1}-${currentYear}`);
        sessionSet.add(`${currentYear - 2}-${currentYear - 1}`);

        // Sort latest first
        const availableSessions = Array.from(sessionSet).sort((a, b) => {
            const aStart = parseInt(a.split('-')[0]) || 0;
            const bStart = parseInt(b.split('-')[0]) || 0;
            return bStart - aStart; // latest year first
        });

        const { academicSession } = req.query;
        // Automatically default to the active session label if none provided
        const session = String(academicSession || formattedActive || '2026-2027');
        const parts = session.split('-');
        const startYear = parseInt(parts[0]) || new Date().getFullYear();
        const endYear = parseInt(parts[1]) || (startYear + 1);

        const startDate = new Date(startYear, 3, 1);
        const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999);

        // 1. KPI / Growth Metrics
        // Student Growth
        const currentYearStudents = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: { $lte: endDate }
        });
        const lastYearStudents = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: { $lte: new Date(startYear, 2, 31, 23, 59, 59, 999) }
        });
        const studentGrowth = lastYearStudents > 0
            ? ((currentYearStudents - lastYearStudents) / lastYearStudents) * 100
            : 0;

        // Weak Students count
        const weakStudentsResult = await Marksheet.aggregate([
            {
                $match: {
                    school: { $in: schoolIdObjs },
                    academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: '$student',
                    avgPercentage: { $avg: '$percentage' },
                    anyFail: { $max: { $cond: [{ $eq: ['$isPass', false] }, 1, 0] } }
                }
            },
            {
                $match: {
                    $or: [
                        { avgPercentage: { $lt: 60 } },
                        { anyFail: 1 }
                    ]
                }
            },
            {
                $count: 'count'
            }
        ]);
        const weakStudents = weakStudentsResult[0]?.count || 0;

        // Attendance Change (this academic session vs previous)
        const currentAttRecs = await Attendance.find({
            school: { $in: schoolIds },
            date: { $gte: startDate, $lte: endDate }
        });
        const prevAttRecs = await Attendance.find({
            school: { $in: schoolIds },
            date: { $gte: new Date(startYear - 1, 3, 1), $lte: new Date(startYear, 2, 31, 23, 59, 59, 999) }
        });

        const calcAvgAttendance = (records) => {
            let totalPresent = 0, totalRecords = 0;
            records.forEach(r => {
                totalPresent += r.totalPresent || 0;
                totalRecords += r.entries?.length || 0;
            });
            return totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;
        };
        const currentAttendance = calcAvgAttendance(currentAttRecs);
        const prevAttendance = calcAvgAttendance(prevAttRecs);
        const attendanceGrowth = prevAttendance > 0 ? (currentAttendance - prevAttendance) : currentAttendance;

        // Pass rate Change (this academic session vs previous)
        const currentMarkss = await Marksheet.find({
            school: { $in: schoolIds },
            academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
            status: 'published'
        });
        const prevMarkss = await Marksheet.find({
            school: { $in: schoolIds },
            academicYear: { $in: [`${startYear - 1}-${startYear}`, `${startYear - 1}-${String(startYear).slice(-2)}`] },
            status: 'published'
        });

        const calcPassRate = (marksheets) => {
            if (marksheets.length === 0) return 0;
            const passed = marksheets.filter(m => m.isPass).length;
            return (passed / marksheets.length) * 100;
        };
        const currentPassRate = calcPassRate(currentMarkss);
        const prevPassRate = calcPassRate(prevMarkss);
        const passGrowth = prevPassRate > 0 ? (currentPassRate - prevPassRate) : currentPassRate;

        const growthMetrics = {
            studentGrowth: Math.round(studentGrowth * 10) / 10,
            weakStudents,
            attendanceGrowth: Math.round(attendanceGrowth * 10) / 10,
            passGrowth: Math.round(passGrowth * 10) / 10
        };

        // 2. Enrollment Trend
        const monthsShort = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const enrollmentTrend = [];
        for (let i = 0; i < 12; i++) {
            const monthIndex = (3 + i) % 12;
            const year = monthIndex >= 3 ? startYear : endYear;
            const mEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

            const pt = { name: monthsShort[i] };
            for (const school of schools) {
                const count = await User.countDocuments({
                    role: 'student',
                    school: school._id,
                    createdAt: { $lte: mEnd }
                });
                pt[school.schoolName] = count;
            }
            enrollmentTrend.push(pt);
        }

        // 3. Attendance Trend
        const attendanceTrend = [];
        for (let i = 0; i < 12; i++) {
            const monthIndex = (3 + i) % 12;
            const year = monthIndex >= 3 ? startYear : endYear;
            const mStart = new Date(year, monthIndex, 1);
            const mEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

            const mAttRecs = await Attendance.find({
                school: { $in: schoolIds },
                date: { $gte: mStart, $lte: mEnd }
            });

            const attVal = calcAvgAttendance(mAttRecs);
            attendanceTrend.push({
                name: monthsShort[i],
                attendance: Math.round(attVal * 10) / 10
            });
        }

        // 4. Class Comparison
        const classScoresResult = await Marksheet.aggregate([
            {
                $match: {
                    school: { $in: schoolIdObjs },
                    academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
                    status: 'published'
                }
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: 'class',
                    foreignField: '_id',
                    as: 'classDoc'
                }
            },
            {
                $unwind: '$classDoc'
            },
            {
                $group: {
                    _id: '$classDoc.name',
                    avgScore: { $avg: '$percentage' }
                }
            }
        ]);

        const organizationClasses = await Class.find({ organization: orgId, isActive: true }).select('name');
        const classComparisonData = organizationClasses.map(cls => {
            const match = classScoresResult.find(r => r._id === cls.name);
            return {
                name: cls.name,
                score: match ? Math.round(match.avgScore * 10) / 10 : 0
            };
        });
        const extractClassNum = (str) => {
            const m = str.match(/\d+/);
            return m ? parseInt(m[0]) : 999;
        };
        classComparisonData.sort((a, b) => extractClassNum(a.name) - extractClassNum(b.name));

        // 5. Pass Trend
        const marksheetsForExams = await Marksheet.find({
            school: { $in: schoolIds },
            academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
            status: 'published'
        }).populate('examStructure', 'examName');

        const examNames = Array.from(new Set(marksheetsForExams.map(m => m.examStructure?.examName).filter(Boolean)));
        const defaultExams = ['UT1', 'UT2', 'Half Yearly', 'UT3', 'Annual'];
        const finalExams = examNames.length > 0 ? examNames : defaultExams;

        const passTrend = [];
        for (const exam of finalExams) {
            const pt = { name: exam };
            for (const school of schools) {
                const relevant = marksheetsForExams.filter(
                    m => String(m.school) === String(school._id) && m.examStructure?.examName === exam
                );
                const passCount = relevant.filter(m => m.isPass).length;
                const passRate = relevant.length > 0 ? (passCount / relevant.length) * 100 : 0;
                pt[school.schoolName] = Math.round(passRate * 10) / 10;
            }
            passTrend.push(pt);
        }

        // 6. Top Performing Students
        const topStudentsResult = await Marksheet.aggregate([
            {
                $match: {
                    school: { $in: schoolIdObjs },
                    academicYear: { $in: [session, `${startYear}-${String(endYear).slice(-2)}`] },
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: '$student',
                    avgPercentage: { $avg: '$percentage' },
                    schoolId: { $first: '$school' },
                    classId: { $first: '$class' }
                }
            },
            {
                $sort: { avgPercentage: -1 }
            },
            {
                $limit: 15
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'studentDoc'
                }
            },
            {
                $unwind: '$studentDoc'
            },
            {
                $lookup: {
                    from: 'schools',
                    localField: 'schoolId',
                    foreignField: '_id',
                    as: 'schoolDoc'
                }
            },
            {
                $unwind: '$schoolDoc'
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: 'classId',
                    foreignField: '_id',
                    as: 'classDoc'
                }
            },
            {
                $unwind: { path: '$classDoc', preserveNullAndEmptyArrays: true }
            }
        ]);

        const topStudents = topStudentsResult.map((s, idx) => ({
            rank: idx + 1,
            name: s.studentDoc.name || 'Unknown',
            branch: s.schoolDoc.schoolName || 'N/A',
            grade: s.classDoc?.name || 'N/A',
            score: `${Math.round(s.avgPercentage * 10) / 10}%`
        }));

        // 7. Top Performing Teachers
        const staffList = await User.find({
            role: { $in: ['teacher', 'class_teacher', 'subject_teacher'] },
            school: { $in: schoolIds },
            status: 'active'
        }).populate('school', 'schoolName');

        const teacherProfiles = await Teacher.find({ school: { $in: schoolIds } }).populate('assignedClasses subjects');
        const teacherProfileMap = new Map();
        teacherProfiles.forEach(p => {
            teacherProfileMap.set(String(p.user), p);
        });

        const staffAttendanceRecords = await StaffAttendance.find({
            school: { $in: schoolIds },
            date: { $gte: startDate, $lte: endDate }
        });

        const teachersData = staffList.map(s => {
            const profile = teacherProfileMap.get(String(s._id));
            const experience = profile?.experience || 0;
            const subjectsStr = profile?.subjects?.map(sub => sub.subjectName).join(', ') || 'General';
            const classesHandled = profile?.assignedClasses?.map(cls => cls.name).join(', ') || 'N/A';

            const staffAtt = staffAttendanceRecords.filter(r => String(r.staffId) === String(s._id));
            const totalDays = staffAtt.length;
            const presentCount = staffAtt.filter(r => ['present', 'late'].includes(r.status)).length;
            const halfDayCount = staffAtt.filter(r => r.status === 'half_day').length;

            const attendance = totalDays > 0 
                ? ((presentCount + halfDayCount * 0.5) / totalDays) * 100 
                : 90.0;

            const tenureInYears = (new Date() - new Date(s.createdAt)) / (1000 * 60 * 60 * 24 * 365.25);
            const tenureBonus = Math.min(10, tenureInYears * 1.5);
            const expBonus = Math.min(10, experience * 0.5);
            const attModifier = (attendance - 90) * 0.8;
            
            const score = Math.min(98, Math.max(0, 75 + tenureBonus + expBonus + attModifier + 5));
            const rating = Number((3.6 + score / 70).toFixed(1));

            return {
                id: s.branchId || `TCH-${String(s._id).slice(-3).toUpperCase()}`,
                name: s.name,
                branch: s.school?.schoolName || 'N/A',
                subject: subjectsStr,
                classesHandled,
                rating: String(Math.min(5.0, rating).toFixed(1))
            };
        });

        teachersData.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        const topTeachers = teachersData.slice(0, 15);

        // 8. Weak Branches
        const weakBranches = [];
        for (const school of schools) {
            const metrics = await getBranchMetricsHelper(school._id, startDate, endDate, academicSession);
            const attendance = metrics.attendance;
            const passPercent = metrics.passPercent;
            const feeCollection = metrics.feePercentage;

            if (attendance < 90) {
                weakBranches.push({
                    branch: school.schoolName,
                    metric: "Attendance",
                    currentValue: `${Math.round(attendance)}%`,
                    targetValue: "90%",
                    severity: attendance < 80 ? "High Risk" : "Medium Risk",
                    action: "Parent Check-ins"
                });
            }
            if (passPercent < 85) {
                weakBranches.push({
                    branch: school.schoolName,
                    metric: "Academic Performance",
                    currentValue: `${Math.round(passPercent)}%`,
                    targetValue: "85%",
                    severity: passPercent < 70 ? "High Risk" : "Medium Risk",
                    action: "Remedial Classes"
                });
            }
            if (feeCollection < 80) {
                weakBranches.push({
                    branch: school.schoolName,
                    metric: "Fee Collection",
                    currentValue: `${Math.round(feeCollection)}%`,
                    targetValue: "90%",
                    severity: feeCollection < 60 ? "High Risk" : "Medium Risk",
                    action: "Follow-up Reminders"
                });
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                activeSession: session,
                availableSessions: availableSessions || [],
                studentGrowth: growthMetrics.studentGrowth || 0,
                weakStudents: growthMetrics.weakStudents || 0,
                attendanceGrowth: growthMetrics.attendanceGrowth || 0,
                passTrend: growthMetrics.passGrowth || 0,
                growthMetrics,
                enrollmentTrend: enrollmentTrend || [],
                attendanceTrend: attendanceTrend || [],
                classComparison: classComparisonData || [],
                classComparisonData: classComparisonData || [],
                passTrendData: passTrend || [],
                passTrend: passTrend || [],
                topStudents: topStudents || [],
                topTeachers: topTeachers || [],
                weakBranches: weakBranches || []
            }
        });

    } catch (error) {
        console.error('Error in getPerformanceTrendsData:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};