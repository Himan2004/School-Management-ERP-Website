import mongoose from 'mongoose';
import User from '../../../models/users/user.model.js';
import School from '../../../models/school/School.js';
import AdmissionRequest from '../../../models/school/admissionRequest.js';
import Period from '../../../models/modules/Period.js';
import AcademicConfig from '../../../models/organization/AcademicConfig.js';
import Class from '../../../models/organization/organizationClass.js';

/**
 * GET /api/superadmin/analytics/admissions/stats
 * Get admission statistics for current month/year
 */
export const getAdmissionStats = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const schools = await School.find({ organization: orgId }).select('_id');
    const schoolIds = schools.map(s => s._id);  // ✅ only this org's school IDs

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    const startOfYear = new Date(currentYear, 0, 1);

    const monthlyAdmissions = await User.countDocuments({
      role: 'student', school: { $in: schoolIds },  // ✅ scoped
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const yearlyAdmissions = await User.countDocuments({
      role: 'student', school: { $in: schoolIds },  // ✅ scoped
      createdAt: { $gte: startOfYear }
    });
    const cancellations = await AdmissionRequest.countDocuments({
      branch: { $in: schoolIds }, status: 'rejected',  // ✅ scoped
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const transfers = await User.countDocuments({
      role: 'student', school: { $in: schoolIds },  // ✅ scoped
      'transferDetails.isTransfer': true,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    return res.status(200).json({
      success: true,
      data: { monthlyAdmissions, yearlyAdmissions, cancellations, transfers }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * GET /api/superadmin/analytics/admissions/trend
 * Get admission trend over months (new admissions, cancellations, transfers)
 */
export const getAdmissionTrend = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const schools = await School.find({ organization: orgId }).select('_id');
    const schoolIds = schools.map(s => s._id);  // ✅ scoped

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentYear = new Date().getFullYear();
    const trendData = [];

    for (let i = 0; i < 12; i++) {
      const startDate = new Date(currentYear, i, 1);
      const endDate = new Date(currentYear, i + 1, 0);

      const newAdmissions = await User.countDocuments({
        role: 'student', school: { $in: schoolIds },
        createdAt: { $gte: startDate, $lte: endDate }
      });
      const cancelled = await AdmissionRequest.countDocuments({
        branch: { $in: schoolIds }, status: 'rejected',
        createdAt: { $gte: startDate, $lte: endDate }
      });
      const transfer = await User.countDocuments({
        role: 'student', school: { $in: schoolIds },
        'transferDetails.isTransfer': true,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      trendData.push({ month: months[i], newAdmissions, cancelled, transfer });
    }

    return res.status(200).json({ success: true, data: trendData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * GET /api/superadmin/analytics/admissions/branches
 * Get branch-wise admission data
 */
export const getBranchAdmissions = async (req, res) => {
  try {
    // ✅ req.user IS the Organization document
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    
    // ✅ Only schools under this org
    const schools = await School.find({ organization: orgId }).select('schoolName');

    const branchData = await Promise.all(schools.map(async (school) => {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      
      const newAdmissions = await User.countDocuments({
        role: 'student', school: school._id, createdAt: { $gte: startOfYear }
      });
      const cancellations = await AdmissionRequest.countDocuments({
        branch: school._id, status: 'rejected'
      });
      const transfers = await User.countDocuments({
        role: 'student', school: school._id, 'transferDetails.isTransfer': true
      });
      const totalStudents = await User.countDocuments({
        role: 'student', school: school._id
      });
      const capacity = 4000;
      const occupancy = Math.round((totalStudents / capacity) * 100);

      return {
        branch: school.schoolName,
        newAdmissions, cancellations, transfers,
        netGrowth: newAdmissions - cancellations - transfers,
        occupancy: Math.min(occupancy, 100)
      };
    }));

    return res.status(200).json({ success: true, data: branchData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/analytics/admissions/class-strength
 * Get class-wise admission strength for a specific branch
 */
export const getClassStrength = async (req, res) => {
    try {
        const { schoolId } = req.query;

        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'schoolId is required' });
        }

        // Get all periods/classes for this school
        const periods = await Period.find({
            schoolId: new mongoose.Types.ObjectId(schoolId),
            status: 'active'
        }).select('gradeLevel section periodName maxCapacity currentStrength');

        // Get students grouped by period
        const classStrength = await Promise.all(periods.map(async (period) => {
            const students = await User.countDocuments({
                role: 'student',
                school: new mongoose.Types.ObjectId(schoolId),
                periodId: period._id
            });

            const sections = 1; // You can calculate based on actual sections
            const seats = period.maxCapacity || 40;
            const filled = students;
            const vacant = Math.max(0, seats - filled);
            const occupancy = seats > 0 ? (filled / seats) * 100 : 0;

            return {
                className: period.gradeLevel,
                sections,
                seats,
                filled,
                vacant,
                occupancy: Math.round(occupancy)
            };
        }));

        return res.status(200).json({
            success: true,
            data: classStrength
        });

    } catch (error) {
        console.error('Error in getClassStrength:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/analytics/admissions/enquiry-funnel
 * Get enquiry to admission conversion funnel
 */
export const getEnquiryFunnel = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    const schools = await School.find({ organization: orgId }).select('_id');
    const schoolIds = schools.map(s => s._id);

    const { schoolId } = req.query;
    // If filtering by specific school, verify it belongs to this org
    const branchFilter = schoolId 
      ? { branch: new mongoose.Types.ObjectId(schoolId) }
      : { branch: { $in: schoolIds } };  // ✅ scoped to org's schools

    const studentFilter = schoolId
      ? { school: new mongoose.Types.ObjectId(schoolId) }
      : { school: { $in: schoolIds } };

    const totalEnquiries = await AdmissionRequest.countDocuments(branchFilter);
    const visitsScheduled = await AdmissionRequest.countDocuments({
      ...branchFilter, status: { $in: ['under_review', 'approved'] }
    });
    const formsSubmitted = visitsScheduled;
    const documentsVerified = await AdmissionRequest.countDocuments({
      ...branchFilter, status: 'approved'
    });
    const admitted = await User.countDocuments({ role: 'student', ...studentFilter });

    const funnel = [
      { label: 'Enquiry Received', count: totalEnquiries, width: 100 },
      { label: 'Visit Scheduled', count: visitsScheduled, width: totalEnquiries > 0 ? Math.round((visitsScheduled/totalEnquiries)*100) : 0 },
      { label: 'Form Submitted', count: formsSubmitted, width: totalEnquiries > 0 ? Math.round((formsSubmitted/totalEnquiries)*100) : 0 },
      { label: 'Documents Verified', count: documentsVerified, width: totalEnquiries > 0 ? Math.round((documentsVerified/totalEnquiries)*100) : 0 },
      { label: 'Admitted', count: admitted, width: totalEnquiries > 0 ? Math.round((admitted/totalEnquiries)*100) : 0 }
    ];

    return res.status(200).json({
      success: true,
      data: { funnel, conversionRate: funnel[4].width }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/analytics/admissions/dropout-analysis
 * Get dropout and TC analysis
 */
export const getDropoutAnalysis = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
    
    // ✅ Only this org's schools
    const schools = await School.find({ organization: orgId }).select('schoolName');

    const dropoutData = await Promise.all(schools.map(async (school) => {
      const totalTc = await User.countDocuments({
        role: 'student', school: school._id, status: 'inactive'
      });
      const dropouts = totalTc;
      const topReason = 'Relocation';

      return {
        branch: school.schoolName, totalTc, dropouts,
        dropoutPercentage: totalTc > 0 ? Math.round((dropouts / totalTc) * 100) : 0,
        reason: topReason
      };
    }));

    return res.status(200).json({ success: true, data: dropoutData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to extract number from class string
const extractClassNum = (str) => {
    const m = str.match(/\d+/);
    return m ? parseInt(m[0]) : 999;
};

// ─── CONSOLIDATED ADMISSION TRENDS DASHBOARD DATA ENDPOINT ──────────────────
export const getAdmissionDashboardData = async (req, res) => {
    try {
        const orgId = new mongoose.Types.ObjectId(String(req.user?._id));
        const schools = await School.find({ organization: orgId }).select('_id schoolName');
        const schoolIds = schools.map(s => s._id);

        // Get active academic year label from config
        const config = await AcademicConfig.findOne({ organization: orgId });
        const activeYearLabel = config?.academicYear?.label || '2026-2027';

        // Get unique academic years from Marksheet or AdmissionRequest
        const markssYears = await AdmissionRequest.distinct('students.academicYear', { branch: { $in: schoolIds } });

        // Normalize format: "YYYY-YYYY"
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
        if (formattedActive) sessionSet.add(formattedActive);
        markssYears.forEach(y => {
            const formatted = formatSession(y);
            if (formatted) sessionSet.add(formatted);
        });

        // Default years fallback
        const currentYear = new Date().getFullYear();
        sessionSet.add(`${currentYear}-${currentYear + 1}`);
        sessionSet.add(`${currentYear - 1}-${currentYear}`);
        sessionSet.add(`${currentYear - 2}-${currentYear - 1}`);

        // Sort latest first
        const availableSessions = Array.from(sessionSet).sort((a, b) => {
            const aStart = parseInt(a.split('-')[0]) || 0;
            const bStart = parseInt(b.split('-')[0]) || 0;
            return bStart - aStart;
        });

        const { academicSession } = req.query;
        const session = String(academicSession || formattedActive || '2026-2027');
        const parts = session.split('-');
        const startYear = parseInt(parts[0]) || new Date().getFullYear();
        const endYear = parseInt(parts[1]) || (startYear + 1);

        const startDate = new Date(startYear, 3, 1);
        const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999);

        // 1. KPI Cards Summary
        // Total Admissions (Year)
        const totalAdmissions = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Growth %
        const prevStartDate = new Date(startYear - 1, 3, 1);
        const prevEndDate = new Date(startYear, 2, 31, 23, 59, 59, 999);
        const prevAdmissions = await User.countDocuments({
            role: 'student',
            school: { $in: schoolIds },
            createdAt: { $gte: prevStartDate, $lte: prevEndDate }
        });
        const growth = prevAdmissions > 0
            ? Number((((totalAdmissions - prevAdmissions) / prevAdmissions) * 100).toFixed(1))
            : 0;

        // Conversion Rate % (Admissions / Enquiries)
        const enquiriesCount = await AdmissionRequest.countDocuments({
            branch: { $in: schoolIds },
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const conversionRate = enquiriesCount > 0
            ? Math.round((totalAdmissions / enquiriesCount) * 100)
            : 0;

        // Low Admission Branches
        const branchAdmissionsList = await Promise.all(schoolIds.map(async (schoolId) => {
            return await User.countDocuments({
                role: 'student',
                school: schoolId,
                createdAt: { $gte: startDate, $lte: endDate }
            });
        }));
        const totalAdms = branchAdmissionsList.reduce((a, b) => a + b, 0);
        const avgAdms = schoolIds.length > 0 ? totalAdms / schoolIds.length : 0;
        const lowBranches = avgAdms > 0
            ? branchAdmissionsList.filter(c => c < avgAdms * 0.75).length
            : 0;

        const stats = {
            totalAdmissions,
            growth,
            conversionRate,
            lowBranches
        };

        // 2. Monthly Admission Trends
        const monthsShort = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const admissionTrend = [];
        for (let i = 0; i < 12; i++) {
            const monthIdx = (3 + i) % 12;
            const yr = monthIdx >= 3 ? startYear : endYear;
            const mStart = new Date(yr, monthIdx, 1);
            const mEnd = new Date(yr, monthIdx + 1, 0, 23, 59, 59, 999);

            const newCount = await User.countDocuments({
                role: 'student',
                school: { $in: schoolIds },
                createdAt: { $gte: mStart, $lte: mEnd }
            });
            const cancelledCount = await AdmissionRequest.countDocuments({
                branch: { $in: schoolIds },
                status: { $in: ['cancelled', 'rejected'] },
                createdAt: { $gte: mStart, $lte: mEnd }
            });
            const transferCount = await User.countDocuments({
                role: 'student',
                school: { $in: schoolIds },
                'transferDetails.isTransfer': true,
                createdAt: { $gte: mStart, $lte: mEnd }
            });

            admissionTrend.push({
                name: monthsShort[i],
                new: newCount,
                cancelled: cancelledCount,
                transfer: transferCount
            });
        }

        // 3. Branch Comparison (Branch Admissions Chart)
        const branchComparison = await Promise.all(schools.map(async (school) => {
            const enquiries = await AdmissionRequest.countDocuments({
                branch: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const actual = await User.countDocuments({
                role: 'student',
                school: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const target = 300; // standard default target

            return {
                name: school.schoolName,
                enquiries,
                target,
                actual
            };
        }));

        // 4. Enquiry Funnel
        const visits = await AdmissionRequest.countDocuments({
            branch: { $in: schoolIds },
            status: { $in: ['under_review', 'approved'] },
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const forms = visits;
        const verified = await AdmissionRequest.countDocuments({
            branch: { $in: schoolIds },
            status: 'approved',
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const funnel = {};
        funnel["All Branches"] = {
            enquiries: enquiriesCount,
            visits,
            forms,
            verified,
            admissions: totalAdmissions
        };

        for (const school of schools) {
            const schoolEnquiries = await AdmissionRequest.countDocuments({
                branch: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const schoolVisits = await AdmissionRequest.countDocuments({
                branch: school._id,
                status: { $in: ['under_review', 'approved'] },
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const schoolForms = schoolVisits;
            const schoolVerified = await AdmissionRequest.countDocuments({
                branch: school._id,
                status: 'approved',
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const schoolAdmissions = await User.countDocuments({
                role: 'student',
                school: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });

            funnel[school.schoolName] = {
                enquiries: schoolEnquiries,
                visits: schoolVisits,
                forms: schoolForms,
                verified: schoolVerified,
                admissions: schoolAdmissions
            };
        }

        // 5. Branch Performance Table
        const branchPerformance = await Promise.all(schools.map(async (school) => {
            const newAdms = await User.countDocuments({
                role: 'student',
                school: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const cancelled = await AdmissionRequest.countDocuments({
                branch: school._id,
                status: { $in: ['cancelled', 'rejected'] },
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const transfers = await User.countDocuments({
                role: 'student',
                school: school._id,
                'transferDetails.isTransfer': true,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const enquiries = await AdmissionRequest.countDocuments({
                branch: school._id,
                createdAt: { $gte: startDate, $lte: endDate }
            });

            const net = newAdms - cancelled - transfers;
            const conversion = enquiries > 0 ? Math.round((newAdms / enquiries) * 100) : 0;

            return {
                branch: school.schoolName,
                new: newAdms,
                cancelled,
                transfer: transfers,
                net,
                conversion
            };
        }));

        // 6. Class-wise Admission Strength Table
        const classes = await Class.find({ organization: orgId, isActive: true });
        const classStrength = [];
        for (const cls of classes) {
            if (schools.length === 0) {
                classStrength.push({
                    branch: "N/A",
                    class: cls.name,
                    classNum: extractClassNum(cls.name),
                    group: cls.name.includes("Class 11") || cls.name.includes("Class 12") ? "Higher Secondary (11–12)" : cls.name.includes("Class 9") || cls.name.includes("Class 10") ? "Secondary (9–10)" : cls.name.includes("Class 6") || cls.name.includes("Class 7") || cls.name.includes("Class 8") ? "Middle (6–8)" : "Primary (1–5)",
                    seats: 0,
                    filled: 0,
                    vacant: 0,
                    occupancy: 0,
                    growth: 0
                });
            } else {
                for (const school of schools) {
                    const classPeriods = await Period.find({
                        schoolId: school._id,
                        status: 'active',
                        gradeLevel: cls.name
                    });
                    const seats = classPeriods.reduce((sum, p) => sum + (p.maxCapacity || 40), 0) || 40;

                    const filled = await User.countDocuments({
                        role: 'student',
                        school: school._id,
                        class: cls._id,
                        createdAt: { $gte: startDate, $lte: endDate }
                    });
                    const prevFilled = await User.countDocuments({
                        role: 'student',
                        school: school._id,
                        class: cls._id,
                        createdAt: { $gte: prevStartDate, $lte: prevEndDate }
                    });

                    const vacant = Math.max(0, seats - filled);
                    const occupancy = seats > 0 ? Math.round((filled / seats) * 100) : 0;
                    const growthVal = prevFilled > 0 ? ((filled - prevFilled) / prevFilled) * 100 : 0;

                    classStrength.push({
                        branch: school.schoolName,
                        class: cls.name,
                        classNum: extractClassNum(cls.name),
                        group: cls.name.includes("Class 11") || cls.name.includes("Class 12") ? "Higher Secondary (11–12)" : cls.name.includes("Class 9") || cls.name.includes("Class 10") ? "Secondary (9–10)" : cls.name.includes("Class 6") || cls.name.includes("Class 7") || cls.name.includes("Class 8") ? "Middle (6–8)" : "Primary (1–5)",
                        seats,
                        filled,
                        vacant,
                        occupancy,
                        growth: Number(growthVal.toFixed(1))
                    });
                }
            }
        }
        classStrength.sort((a, b) => a.classNum - b.classNum);

        // 7. Student Dropout & TC Analysis Table
        const dropoutTable = await Promise.all(schools.map(async (school) => {
            const totalStudents = await User.countDocuments({
                role: 'student',
                school: school._id
            });
            const tc = await User.countDocuments({
                role: 'student',
                school: school._id,
                status: 'inactive',
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const dropouts = tc;

            const dropoutPct = totalStudents > 0 ? (dropouts / totalStudents) * 100 : 0;

            let severity = "Low Risk";
            if (dropoutPct >= 5.0) severity = "High Risk";
            else if (dropoutPct >= 2.0) severity = "Medium Risk";

            return {
                branch: school.schoolName,
                tc,
                dropouts,
                dropoutPct: dropoutPct.toFixed(1),
                severity,
                reason: tc > 0 ? "Relocation" : "N/A"
            };
        }));

        return res.status(200).json({
            success: true,
            data: {
                activeSession: session,
                availableSessions,
                stats,
                admissionTrend,
                branchComparison,
                funnel,
                branchPerformance,
                classStrength,
                dropoutTable
            }
        });

    } catch (error) {
        console.error('Error in getAdmissionDashboardData:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};