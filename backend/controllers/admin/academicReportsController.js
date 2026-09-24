import Student from "../../models/users/student.model.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import Ticket from "../../models/common/Ticket.js";
import mongoose from "mongoose";

/**
 * @desc    Get filter options (classes, sections, academic years) scoped to the school
 * @route   GET /api/admin/reports/academic-reports/filters
 * @access  Private – Admin only
 */
export const getAcademicReportFilters = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const orgId    = req.user.school?.organization || req.user.organization;

        const schoolOId = new mongoose.Types.ObjectId(schoolId);
        const orgOId    = orgId ? new mongoose.Types.ObjectId(orgId) : null;

        // Fetch all active classes scoped to this organization
        const classes = orgOId
            ? await Class.find({ organization: orgOId, isActive: true })
                .select("_id name")
                .sort({ numericLevel: 1, name: 1 })
                .lean()
            : [];

        // Fetch all sections scoped to this school
        const sections = await Section.find({ school: schoolOId, status: "active" })
            .select("_id name classId")
            .sort({ name: 1 })
            .lean();

        // Derive academic years from student admission dates
        const yearAgg = await Student.aggregate([
            { $match: { school: schoolOId, admissionDate: { $exists: true, $ne: null } } },
            { $group: { _id: { year: { $year: "$admissionDate" } } } },
            { $sort: { "_id.year": -1 } }
        ]);

        const currentYear = new Date().getFullYear();
        const yearsFromDb = yearAgg.map(y => y._id.year).filter(Boolean);
        const allYears = new Set([currentYear + 1, currentYear, currentYear - 1, ...yearsFromDb]);
        const academicYears = Array.from(allYears)
            .sort((a, b) => b - a)
            .slice(0, 6)
            .map(y => ({ value: `${y}-${y + 1}`, label: `${y}-${y + 1}` }));

        return res.status(200).json({
            success: true,
            data: {
                classes: classes.map(c => ({ value: c._id.toString(), label: c.name })),
                sections: sections.map(s => ({
                    value: s._id.toString(),
                    label: s.name,
                    classId: s.classId?.toString()
                })),
                academicYears
            }
        });
    } catch (error) {
        console.error("Error in getAcademicReportFilters:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get academic reports dashboard data (school-scoped)
 * @route   GET /api/admin/reports/academic-reports?academicYear=2025-2026&classId=All&sectionId=All
 * @access  Private – Admin only
 */
export const getAcademicReportsDashboard = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const orgId    = req.user.school?.organization || req.user.organization;
        const { academicYear, classId, sectionId } = req.query;

        const schoolOId = new mongoose.Types.ObjectId(schoolId);
        const orgOId    = orgId ? new mongoose.Types.ObjectId(orgId) : null;

        // ── Build filter match ────────────────────────────────────────────────────
        let filterMatch = { school: schoolOId };

        let classObjectId = null;
        if (classId && classId !== "All") {
            if (mongoose.Types.ObjectId.isValid(classId)) {
                classObjectId = new mongoose.Types.ObjectId(classId);
            } else {
                const clsNameMatch = new RegExp(`^${classId}$|^Class ${classId}$`, "i");
                const foundClass = await Class.findOne({ organization: orgOId, name: clsNameMatch }).lean();
                if (foundClass) classObjectId = foundClass._id;
            }
            if (classObjectId) filterMatch["class"] = classObjectId;
        }

        let sectionObjectId = null;
        let sectionName = null;
        if (sectionId && sectionId !== "All") {
            if (mongoose.Types.ObjectId.isValid(sectionId)) {
                sectionObjectId = new mongoose.Types.ObjectId(sectionId);
            } else {
                const sectionQuery = { school: schoolOId, name: sectionId };
                if (classObjectId) sectionQuery.classId = classObjectId;
                const foundSection = await Section.findOne(sectionQuery).lean();
                if (foundSection) {
                    sectionObjectId = foundSection._id;
                    sectionName = foundSection.name;
                }
            }
            if (sectionObjectId) {
                filterMatch["section"] = sectionObjectId;
                if (!sectionName) {
                    const foundSection = await Section.findById(sectionObjectId).select("name").lean();
                    sectionName = foundSection?.name || null;
                }
            }
        }

        // ── Build date range for the academic year ────────────────────────────────
        let academicYearDateRange = null;
        if (academicYear) {
            const [startYrStr] = academicYear.split("-").map(Number);
            if (startYrStr) {
                academicYearDateRange = {
                    $gte: new Date(startYrStr, 3, 1),            // Apr 1 of start year
                    $lte: new Date(startYrStr + 1, 2, 31, 23, 59, 59)  // Mar 31 of end year
                };
            }
        }

        // ── 1. KPI Stats ──────────────────────────────────────────────────────────
        const activeStudentsCount = await Student.countDocuments({ ...filterMatch, status: "active" });

        let newAdmissionsMatch = { ...filterMatch };
        if (academicYearDateRange) {
            newAdmissionsMatch.admissionDate = academicYearDateRange;
        }
        const newAdmissionsCount = await Student.countDocuments(newAdmissionsMatch);

        const dropoutsCount = await Student.countDocuments({
            ...filterMatch,
            status: { $in: ["dropped", "dropout"] }
        });

        // Attendance match: filter by date range (not academicYear field)
        const attendanceMatch = { school: schoolOId };
        if (academicYearDateRange) attendanceMatch.date = academicYearDateRange;
        if (classObjectId) attendanceMatch.class = classObjectId;
        if (sectionName) attendanceMatch.section = sectionName;

        const attendanceTotals = await Attendance.aggregate([
            { $match: attendanceMatch },
            {
                $group: {
                    _id: null,
                    totalPresent: { $sum: "$totalPresent" },
                    totalAbsent:  { $sum: "$totalAbsent" },
                    totalLate:    { $sum: "$totalLate" },
                    totalHalfDay: { $sum: { $size: { $filter: { input: "$entries", as: "entry", cond: { $eq: ["$$entry.status", "half_day"] } } } } },
                    totalOnLeave: { $sum: { $size: { $filter: { input: "$entries", as: "entry", cond: { $eq: ["$$entry.status", "on_leave"] } } } } }
                }
            }
        ]);

        const attRow  = attendanceTotals[0] || { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalHalfDay: 0, totalOnLeave: 0 };
        const attTotal = attRow.totalPresent + attRow.totalAbsent + attRow.totalLate + attRow.totalHalfDay + attRow.totalOnLeave;
        const avgAttendance = attTotal > 0 ? Math.round((attRow.totalPresent / attTotal) * 100) : 0;

        const kpiData = {
            totalStudents: activeStudentsCount,
            newAdmissions: newAdmissionsCount,
            dropouts: dropoutsCount,
            avgAttendance
        };

        // ── 2. Student Strength ───────────────────────────────────────────────────
        let classesQuery = orgOId ? { organization: orgOId, isActive: true } : {};
        if (classObjectId) classesQuery._id = classObjectId;

        const classes  = orgOId ? await Class.find(classesQuery).select("_id name").lean() : [];

        const strengthAgg = await Student.aggregate([
            {
                $match: {
                    school: schoolOId,
                    status: "active",
                    ...(classObjectId  ? { class:   classObjectId   } : {}),
                    ...(sectionObjectId ? { section: sectionObjectId } : {})
                }
            },
            {
                $group: {
                    _id: { class: "$class", section: "$section", gender: "$gender" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const sectionIdsStrength = [...new Set(strengthAgg.map(i => i._id.section?.toString()).filter(Boolean))]
            .map(id => new mongoose.Types.ObjectId(id));
        const sectionDocsStrength = sectionIdsStrength.length > 0
            ? await Section.find({ _id: { $in: sectionIdsStrength } }).select("name").lean()
            : [];
        const sectionMapStrength = sectionDocsStrength.reduce((acc, s) => {
            acc[s._id.toString()] = s.name;
            return acc;
        }, {});

        const classMap       = {};
        const sectionByClass = {};

        strengthAgg.forEach(item => {
            const cKey = item._id.class?.toString();
            const sKey = item._id.section?.toString();
            if (!cKey) return;
            if (!classMap[cKey])       classMap[cKey] = { boys: 0, girls: 0, total: 0 };
            if (!sectionByClass[cKey]) sectionByClass[cKey] = {};

            const gender = item._id.gender;
            const count  = item.count;
            if (gender === "male")   classMap[cKey].boys  += count;
            else if (gender === "female") classMap[cKey].girls += count;
            else classMap[cKey].boys += count;
            classMap[cKey].total += count;

            const sName = sectionMapStrength[sKey] || "All";
            sectionByClass[cKey][sName] = (sectionByClass[cKey][sName] || 0) + count;
        });

        const studentStrengthData = classes.map(c => {
            const data  = classMap[c._id.toString()] || { boys: 0, girls: 0, total: 0 };
            const sName = Object.keys(sectionByClass[c._id.toString()] || {})[0] || "All";
            return { class: c.name, section: sName, boys: data.boys, girls: data.girls, total: data.total };
        });

        // ── 3. Admission Trends (monthly) ─────────────────────────────────────────
        const orderedMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
        const monthLabels   = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

        const admissionAgg = await Student.aggregate([
            { $match: { ...newAdmissionsMatch, admissionDate: { $exists: true, $ne: null } } },
            { $group: { _id: { month: { $month: "$admissionDate" } }, count: { $sum: 1 } } }
        ]);

        const admissionMonthMap = {};
        admissionAgg.forEach(item => { admissionMonthMap[item._id.month] = item.count; });

        const admissionData = orderedMonths.map((m, i) => ({
            month: monthLabels[i],
            admissions: admissionMonthMap[m] || 0
        }));

        // ── 4. Dropout Data ───────────────────────────────────────────────────────
        const dropoutsDocs = await Student.find({ ...filterMatch, status: { $in: ["dropped", "dropout"] } })
            .populate({ path: "user",    select: "name" })
            .populate({ path: "class",   select: "name" })
            .populate({ path: "section", select: "name" })
            .populate({ path: "parent",  select: "fatherName primaryContact" })
            .lean();

        const dropoutData = dropoutsDocs.map(s => ({
            id:          s._id,
            name:        s.user?.name || "—",
            admissionNo: s.admissionNo || "—",
            class:       s.class?.name || "—",
            section:     s.section?.name || "—",
            date:        s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("en-IN") : "—",
            reason:      s.status === "dropped" ? "Fees Defaulting" : "Unexcused Absences",
            status:      "Approved",
            parentName:  s.parent?.fatherName || "—",
            contact:     s.parent?.primaryContact || "—",
            remarks:     "Dropout processed by administration.",
            tcIssued:    "Yes"
        }));

        // ── 5. Attendance Summary (per class-section) ─────────────────────────────
        const attendanceAgg = await Attendance.aggregate([
            { $match: attendanceMatch },
            {
                $group: {
                    _id: { class: "$class", section: "$section" },
                    present: { $sum: "$totalPresent" },
                    absent:  { $sum: "$totalAbsent" },
                    halfDay: { $sum: { $size: { $filter: { input: "$entries", as: "entry", cond: { $eq: ["$$entry.status", "half_day"]  } } } } },
                    onLeave: { $sum: { $size: { $filter: { input: "$entries", as: "entry", cond: { $eq: ["$$entry.status", "on_leave"] } } } } }
                }
            }
        ]);

        // Resolve class names
        const attClassIds = attendanceAgg
            .map(item => item._id.class?.toString())
            .filter(Boolean)
            .map(id => new mongoose.Types.ObjectId(id));
        const attClassDocs = attClassIds.length > 0
            ? await Class.find({ _id: { $in: attClassIds } }).select("name").lean()
            : [];
        const attClassMap = attClassDocs.reduce((acc, c) => {
            acc[c._id.toString()] = c.name;
            return acc;
        }, {});

        // Resolve section names (could be ObjectId or plain string in DB)
        const attSectionIds = attendanceAgg
            .map(item => item._id.section)
            .filter(id => id && mongoose.Types.ObjectId.isValid(String(id)))
            .map(id => new mongoose.Types.ObjectId(String(id)));
        const attSectionDocs = attSectionIds.length > 0
            ? await Section.find({ _id: { $in: attSectionIds } }).select("_id name").lean()
            : [];
        const attSectionMap = attSectionDocs.reduce((acc, s) => {
            acc[s._id.toString()] = s.name;
            return acc;
        }, {});

        // Get real student counts per class for "Total Students" column
        const studentCountMap = {};
        if (attClassIds.length > 0) {
            const studentCounts = await Student.aggregate([
                { $match: { school: schoolOId, class: { $in: attClassIds }, status: "active" } },
                { $group: { _id: "$class", count: { $sum: 1 } } }
            ]);
            studentCounts.forEach(sc => { studentCountMap[sc._id.toString()] = sc.count; });
        }

        const attendanceData = attendanceAgg.map(row => {
            const cKey     = row._id.class?.toString();
            const sRaw     = row._id.section;
            let sectionLabel = "—";
            if (sRaw) {
                sectionLabel = mongoose.Types.ObjectId.isValid(String(sRaw))
                    ? (attSectionMap[String(sRaw)] || String(sRaw))
                    : String(sRaw);
            }
            const totalStudents  = studentCountMap[cKey] || 0;
            const attendanceTotal = row.present + row.absent + row.halfDay + row.onLeave;
            const percentage     = attendanceTotal > 0 ? Math.round((row.present / attendanceTotal) * 100) : 0;
            return {
                class:      attClassMap[cKey] || "—",
                section:    sectionLabel,
                total:      totalStudents,
                present:    row.present,
                absent:     row.absent,
                leave:      row.halfDay + row.onLeave,
                percentage
            };
        });

        // ── 6. Complaint Reports ──────────────────────────────────────────────────
        const complaintsDocs = await Ticket.find({ school: schoolOId, category: "complaint" })
            .populate({ path: "raisedBy",       select: "name role" })
            .populate({ path: "assignedTo",     select: "name" })
            .populate({ path: "relatedStudent", select: "name" })
            .lean()
            .limit(20);

        const complaintData = complaintsDocs.map(c => ({
            id:         c.ticketNumber || c._id.toString().substring(0, 8),
            student:    c.relatedStudent?.name || c.raisedBy?.name || "—",
            type:       c.category || "General",
            raisedBy:   c.raisedBy?.name || "Unknown",
            date:       c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—",
            status:     c.status,
            details:    c.description || "—",
            assignedTo: c.assignedTo?.name || "Unassigned",
            closedBy:   c.status === "closed" ? "Admin" : "—",
            resolution: c.status === "closed" ? "Resolved successfully." : "Pending review."
        }));

        return res.status(200).json({
            success: true,
            data: {
                kpiData,
                studentStrengthData,
                admissionData,
                attendanceData,
                complaintData
            }
        });

    } catch (error) {
        console.error("Error in getAcademicReportsDashboard:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
