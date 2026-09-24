import Student from "../../models/users/student.model.js";
import Class from "../../models/organization/organizationClass.js";
import Attendance from "../../models/academic/attendance.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import mongoose from "mongoose";

// Map student.status → UI-friendly label and reason
const STATUS_LABEL_MAP = {
    inactive:    { label: "Medical Leave",   reason: "Extended Sick Leave" },
    dropped:     { label: "Withdrawn",       reason: "Fees Defaulting" },
    dropout:     { label: "Withdrawn",       reason: "Unexcused Absences" },
    transferred: { label: "Transferred",     reason: "Migration / Relocation" },
    tc_issued:   { label: "Transferred",     reason: "Migration / Relocation" },
};

/**
 * @desc    Get dropout/passout tracking dashboard for admin (school-scoped)
 * @route   GET /api/admin/reports/dropout-tracking?academicYear=2025-2026
 * @access  Private – Admin only
 *
 * Note: KPI cards and tables are scoped to the SCHOOL only (not academicYear)
 * so they always show real counts even if students span multiple years.
 * The academicYear filter is applied only to the trend charts.
 */
export const getDropoutTrackingDashboard = async (req, res) => {
    try {
        const schoolId     = req.user.school?._id || req.user.school;
        const orgId        = req.user.school?.organization || req.user.organization;
        const { academicYear } = req.query;

        const schoolOId = new mongoose.Types.ObjectId(schoolId);

        // ── 1. KPI Stats (school-scoped, no academicYear filter) ──────────────
        const activeStudents   = await Student.countDocuments({ school: schoolOId, status: "active" });
        const inactiveStudents = await Student.countDocuments({
            school: schoolOId, status: { $in: ["inactive", "dropped", "dropout"] }
        });
        const passoutStudents  = await Student.countDocuments({
            school: schoolOId, status: { $in: ["passout", "tc_issued", "transferred"] }
        });
        const totalStudents = activeStudents + inactiveStudents + passoutStudents;
        const retentionRate = totalStudents > 0
            ? Math.round((activeStudents / totalStudents) * 100)
            : 0;

        // ── 2. Monthly Trend (filtered by academicYear via updatedAt) ─────────
        const orderedMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
        const monthLabels   = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

        // Derive a date range from the selected academic year for chart filtering
        let trendMatch = { school: schoolOId, status: { $in: ["inactive","dropped","dropout","passout","tc_issued","transferred"] } };
        if (academicYear) {
            const [startYr] = academicYear.split("-").map(Number);
            if (startYr) {
                trendMatch.updatedAt = {
                    $gte: new Date(startYr, 3, 1),          // 1 April of start year
                    $lte: new Date(startYr + 1, 2, 31, 23, 59, 59) // 31 March of end year
                };
            }
        }

        const monthlyRaw = await Student.aggregate([
            { $match: trendMatch },
            {
                $group: {
                    _id: { month: { $month: "$updatedAt" }, status: "$status" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const inactiveMonthMap = {};
        const passoutMonthMap  = {};
        monthlyRaw.forEach(({ _id: { month, status }, count }) => {
            if (["inactive", "dropped", "dropout"].includes(status))
                inactiveMonthMap[month] = (inactiveMonthMap[month] || 0) + count;
            else
                passoutMonthMap[month]  = (passoutMonthMap[month]  || 0) + count;
        });

        const monthlyTrend = orderedMonths.map((m, i) => ({
            name:     monthLabels[i],
            inactive: inactiveMonthMap[m] || 0,
            passouts: passoutMonthMap[m]  || 0,
        }));

        // ── 3. Class-wise Distribution (school-scoped) ─────────────────────────
        const orgOId = orgId ? new mongoose.Types.ObjectId(orgId) : null;
        const classes = orgOId
            ? await Class.find({ organization: orgOId, isActive: true }).select("_id name").lean()
            : [];

        const classDistRaw = await Student.aggregate([
            {
                $match: {
                    school: schoolOId,
                    status: { $in: ["inactive","dropped","dropout","passout","tc_issued","transferred"] }
                }
            },
            { $group: { _id: { class: "$class", status: "$status" }, count: { $sum: 1 } } }
        ]);

        const classInactiveMap = {};
        const classPassoutMap  = {};
        classDistRaw.forEach(({ _id: { class: cls, status }, count }) => {
            const id = cls?.toString();
            if (["inactive", "dropped", "dropout"].includes(status))
                classInactiveMap[id] = (classInactiveMap[id] || 0) + count;
            else
                classPassoutMap[id]  = (classPassoutMap[id]  || 0) + count;
        });

        const classWiseDistribution = classes
            .map(cls => ({
                name:     cls.name,
                inactive: classInactiveMap[cls._id.toString()] || 0,
                passouts: classPassoutMap[cls._id.toString()]  || 0,
            }))
            .filter(c => c.inactive > 0 || c.passouts > 0);

        // ── 4. Reason Distribution (school-scoped) ────────────────────────────
        const reasonCountMap = {};
        const inactiveRaw = await Student.find({
            school: schoolOId,
            status: { $in: ["inactive", "dropped", "dropout", "transferred", "tc_issued"] }
        }).select("status").lean();

        inactiveRaw.forEach(s => {
            const reason = (STATUS_LABEL_MAP[s.status] || {}).reason || "Other";
            reasonCountMap[reason] = (reasonCountMap[reason] || 0) + 1;
        });
        const reasonData = Object.entries(reasonCountMap).map(([name, value]) => ({ name, value }));

        // ── 5. Inactive Students Registry (school-scoped, all years) ─────────
        const inactiveStudentDocs = await Student.find({
            school: schoolOId,
            status: { $in: ["inactive", "dropped", "dropout"] }
        })
        .populate({ path: "user",   select: "name" })
        .populate({ path: "class",  select: "name" })
        .populate({ path: "parent", select: "fatherName primaryContact address" })
        .lean();

        const inactiveStudentIds = inactiveStudentDocs
            .map((s) => s.user?._id)
            .filter(Boolean);

        const inactiveAttendanceAgg = inactiveStudentIds.length > 0
            ? await Attendance.aggregate([
                { $match: { school: schoolOId, "entries.student": { $in: inactiveStudentIds } } },
                { $unwind: "$entries" },
                { $match: { "entries.student": { $in: inactiveStudentIds } } },
                { $group: {
                    _id: { student: "$entries.student", status: "$entries.status" },
                    count: { $sum: 1 }
                }}
            ])
            : [];

        const attendanceMap = inactiveAttendanceAgg.reduce((acc, item) => {
            const studentId = item._id.student.toString();
            if (!acc[studentId]) acc[studentId] = { present: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 };
            const status = item._id.status;
            const count = item.count;
            if (status === "present" || status === "late") acc[studentId].present += count;
            else if (status === "absent") acc[studentId].absent += count;
            else if (status === "half_day") acc[studentId].halfDay += count;
            else if (status === "on_leave") acc[studentId].onLeave += count;
            acc[studentId].total += count;
            return acc;
        }, {});

        const inactiveList = inactiveStudentDocs.map(s => {
            const studentId = s.user?._id?.toString();
            const stats = attendanceMap[studentId] || { present: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 };
            const attendancePct = stats.total > 0
                ? Math.round(((stats.present + stats.halfDay * 0.5 + stats.onLeave * 0.25) / stats.total) * 100)
                : 0;

            return {
                _id:           s._id,
                name:          s.user?.name || "—",
                className:     s.class?.name || "—",
                rollNo:        s.rollNo || "—",
                attendancePct,
                reason:        (STATUS_LABEL_MAP[s.status] || {}).reason || s.status,
                status:        (STATUS_LABEL_MAP[s.status] || {}).label  || s.status,
                fatherName:    s.parent?.fatherName || "—",
                parentContact: s.parent?.primaryContact || "—",
                address:       s.parent?.address
                    ? [s.parent.address.street, s.parent.address.city, s.parent.address.state]
                        .filter(Boolean).join(", ")
                    : "—",
                lastPresent:   s.updatedAt
                    ? new Date(s.updatedAt).toLocaleDateString("en-IN")
                    : "—",
                actionTaken:   "Under review by admin."
            };
        });

        // ── 6. Passout / Alumni Registry (school-scoped, all years) ──────────
        const passoutDocs = await Student.find({
            school: schoolOId,
            status: { $in: ["passout", "tc_issued", "transferred"] }
        })
        .populate({ path: "user",   select: "name" })
        .populate({ path: "class",  select: "name" })
        .populate({ path: "parent", select: "fatherName primaryContact address" })
        .lean();

        const passoutStudentIds = passoutDocs
            .map((s) => s.user?._id)
            .filter(Boolean);

        const passoutMarksheets = passoutStudentIds.length > 0
            ? await Marksheet.find({
                school: schoolOId,
                student: { $in: passoutStudentIds },
                status: "published"
            })
            .select("student percentage totalMarksObtained")
            .lean()
            : [];

        const passoutScoreMap = passoutMarksheets.reduce((acc, sheet) => {
            const studentId = sheet.student?.toString();
            if (!studentId) return acc;
            if (!acc[studentId]) acc[studentId] = { total: 0, count: 0 };
            acc[studentId].total += sheet.percentage || 0;
            acc[studentId].count += 1;
            return acc;
        }, {});

        const passoutList = passoutDocs.map(s => {
            const studentId = s.user?._id?.toString();
            const scoreData = passoutScoreMap[studentId];
            const finalScore = scoreData && scoreData.count > 0
                ? `${Math.round(scoreData.total / scoreData.count)}%`
                : "—";

            return {
                _id:           s._id,
                name:          s.user?.name || "—",
                batch:         s.academicYear || academicYear || "—",
                lastClass:     s.class?.name || "—",
                finalScore,
                destination:   s.previousSchool?.name || "—",
                status:        s.status === "passout" ? "Graduated" : "Transferred",
                fatherName:    s.parent?.fatherName || "—",
                parentContact: s.parent?.primaryContact || "—",
                address:       s.parent?.address
                    ? [s.parent.address.street, s.parent.address.city, s.parent.address.state]
                        .filter(Boolean).join(", ")
                    : "—",
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                stats: { activeStudents, inactiveStudents, passoutStudents, retentionRate },
                monthlyTrend,
                classWiseDistribution,
                reasonData,
                inactiveStudents: inactiveList,
                passoutStudents:  passoutList,
            }
        });

    } catch (error) {
        console.error("Error in getDropoutTrackingDashboard:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
