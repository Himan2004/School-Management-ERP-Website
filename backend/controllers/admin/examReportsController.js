import Exam from "../../models/academic/exam.model.js";
import ExamSchedule from "../../models/academic/examSchedule.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Subject from "../../models/modules/Subject.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get filter options (classes, sections, academic years, exam types) for the school
 * @route   GET /api/admin/reports/exam-reports/filters
 * @access  Private - Admin only
 */
export const getExamReportFilters = async (req, res) => {
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

        // Extract academic years from existing exams and schedules
        const schedules = await ExamSchedule.find({ school: schoolOId }).select("academicYear").lean();
        const existingYears = schedules.map(s => s.academicYear).filter(Boolean);
        
        const currentYear = new Date().getFullYear();
        const allYears = new Set([
            `${currentYear + 1}-${currentYear + 2}`,
            `${currentYear}-${currentYear + 1}`,
            `${currentYear - 1}-${currentYear}`,
            ...existingYears
        ]);
        
        const academicYears = Array.from(allYears)
            .sort((a, b) => b.localeCompare(a))
            .map(y => ({ value: y, label: y }));

        // Exam types can be derived or static (for now static common types as fallback + dynamic if needed)
        const examTypes = [
            { value: "Unit Exam", label: "Unit Exam" },
            { value: "Term 1", label: "Term 1" },
            { value: "Term 2", label: "Term 2" },
            { value: "Final Exam", label: "Final Exam" },
            { value: "Mid Term", label: "Mid Term" }
        ];

        return res.status(200).json({
            success: true,
            data: {
                classes: classes.map(c => ({ value: c.name, label: c.name, id: c._id.toString() })),
                sections: sections.map(s => ({ value: s.name, label: s.name, classId: s.classId?.toString() })),
                academicYears,
                examTypes
            }
        });
    } catch (error) {
        console.error("Error in getExamReportFilters:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get exam reports dashboard data (school-scoped)
 * @route   GET /api/admin/reports/exam-reports?academicYear=2025-2026&examType=All%20Exams&classFilter=All%20Classes&sectionFilter=All%20Sections
 * @access  Private – Admin only
 */
export const getExamReportsDashboard = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { academicYear, examType, classFilter, sectionFilter } = req.query;

        const schoolOId = new mongoose.Types.ObjectId(schoolId);

        // ── 1. Fetch simple Exams (used for KPI totals) ──────────────────────────
        let examQuery = { school: schoolOId };
        if (examType && examType !== "All Exams") {
            examQuery.examName = new RegExp(examType, "i");
        }
        if (classFilter && classFilter !== "All Classes") {
            examQuery.className = classFilter;
        }
        const exams = await Exam.find(examQuery).lean();

        // ── 2. Fetch ExamSchedules (the real linkage to Marksheets) ──────────────
        let scheduleQuery = { school: schoolOId };
        // Only filter by academicYear if explicitly set (not "All Years")
        if (academicYear && academicYear !== "All Years") scheduleQuery.academicYear = academicYear;
        const schedules = await ExamSchedule.find(scheduleQuery)
            .populate("examStructure", "examName examType")
            .lean();
        const scheduleIds = schedules.map(s => s._id);

        // ── 3. Fetch Marksheets for this school/academicYear ─────────────────────
        let markQuery = { school: schoolOId };
        if (academicYear && academicYear !== "All Years") markQuery.academicYear = academicYear;
        if (sectionFilter && sectionFilter !== "All Sections") markQuery.section = sectionFilter;

        const marksheets = await Marksheet.find(markQuery)
            .populate({ path: "student", select: "name" })
            .lean();

        // ── 4. Fetch all org subjects for name lookup ────────────────────────────
        // Gather all unique subject IDs used across all marksheet subjectMarks
        const allSubjectIds = [
            ...new Set(
                marksheets.flatMap(m =>
                    (m.subjectMarks || []).map(sm => sm.subject?.toString())
                ).filter(Boolean)
            )
        ].map(id => new mongoose.Types.ObjectId(id));

        const subjects = await Subject.find({ _id: { $in: allSubjectIds } })
            .select("subjectName")
            .lean();
        const subjectNameMap = new Map(subjects.map(s => [s._id.toString(), s.subjectName]));

        // ── 5. Build KPI counts from Exam model ──────────────────────────────────
        let totalCompleted = 0;
        let totalUpcoming = 0;
        exams.forEach(e => {
            if (e.status === "completed") totalCompleted++;
            else if (e.status === "scheduled") totalUpcoming++;
        });

        // ── 6. Build Exam Result Summary Table ───────────────────────────────────
        // Map each ExamSchedule → group marksheets by schedule → compute stats
        const examData = [];

        schedules.forEach(schedule => {
            const schedMarksheets = marksheets.filter(m =>
                m.examSchedule?.toString() === schedule._id.toString()
            );
            const appeared = schedMarksheets.length;
            const passed = schedMarksheets.filter(m => m.isPass).length;
            const failed = appeared - passed;
            const passPct = appeared > 0 ? `${Math.round((passed / appeared) * 100)}%` : "0%";
            const examName = schedule.examStructure?.examName || schedule.name || "Exam";
            const examType = schedule.examStructure?.examType || "General";

            examData.push({
                examName,
                type: examType,
                className: schedule.section ? `Section ${schedule.section}` : "All Classes",
                appeared,
                passed,
                failed,
                passPct,
                date: schedule.slots?.[0]?.examDate
                    ? new Date(schedule.slots[0].examDate).toLocaleDateString("en-IN")
                    : "—",
                duration: schedule.slots?.[0]
                    ? `${schedule.slots[0].startTime} - ${schedule.slots[0].endTime}`
                    : "—",
                totalMarks: schedule.slots?.[0]?.maxMarks || 100,
                passingMarks: 35,
                remarks: schedule.status || "—",
                status: schedule.status
            });
        });

        // Also include standalone exams not linked to schedules (legacy)
        exams.forEach(exam => {
            const linked = schedules.find(s =>
                s.examStructure?.examName?.toLowerCase() === exam.examName?.toLowerCase()
            );
            if (!linked) {
                examData.push({
                    examName: exam.examName,
                    type: exam.examName.toLowerCase().includes("term") ? "Term Exam" : "Unit Exam",
                    className: exam.className || "—",
                    appeared: 0,
                    passed: 0,
                    failed: 0,
                    passPct: "0%",
                    date: exam.examDate ? new Date(exam.examDate).toLocaleDateString("en-IN") : "—",
                    duration: `${exam.startTime || "09:00"} - ${exam.endTime || "12:00"}`,
                    totalMarks: exam.maxMarks || 100,
                    passingMarks: exam.passingMarks || 35,
                    remarks: exam.description || "—",
                    status: exam.status
                });
            }
        });

        // ── 7. Build Subject Performance ─────────────────────────────────────────
        const subjectAgg = {};

        marksheets.forEach(m => {
            if (!m.subjectMarks) return;
            m.subjectMarks.forEach(sm => {
                if (!sm.subject) return;
                const sName = subjectNameMap.get(sm.subject.toString()) || `Subject (${sm.subject.toString().slice(-4)})`;

                if (!subjectAgg[sName]) {
                    subjectAgg[sName] = { totalObtained: 0, count: 0, highest: 0, passCount: 0, topper: "—", topperMarks: 0 };
                }

                subjectAgg[sName].count += 1;
                subjectAgg[sName].totalObtained += sm.totalMarks || 0;

                if (sm.isPass) {
                    subjectAgg[sName].passCount += 1;
                }

                if ((sm.totalMarks || 0) > subjectAgg[sName].highest) {
                    subjectAgg[sName].highest = sm.totalMarks;
                    subjectAgg[sName].topper = m.student?.name || "Unknown";
                    subjectAgg[sName].topperMarks = sm.totalMarks;
                }
            });
        });

        const subjectData = [];
        const subjectChartData = [];

        Object.keys(subjectAgg).forEach(sName => {
            const agg = subjectAgg[sName];
            const avg = agg.count > 0 ? Math.round(agg.totalObtained / agg.count) : 0;
            const passPct = agg.count > 0 ? Math.round((agg.passCount / agg.count) * 100) : 0;

            subjectData.push({
                subject: sName,
                highest: agg.highest,
                average: avg,
                passPct: `${passPct}%`,
                topper: agg.topper,
                topperMarks: agg.topperMarks,
                topperRank: 1
            });

            subjectChartData.push({
                subject: sName,
                passPct
            });
        });

        // ── 8. Trend Chart Data ───────────────────────────────────────────────────
        const trendChartData = examData
            .filter(e => e.appeared > 0)
            .map(e => ({
                term: e.examName,
                passed: Math.round((e.passed / e.appeared) * 100)
            }));

        // ── 9. Overall KPI ────────────────────────────────────────────────────────
        const totalExamsCount = exams.length + schedules.length;
        const overallPassPct = marksheets.length > 0
            ? Math.round((marksheets.filter(m => m.isPass).length / marksheets.length) * 100)
            : 0;

        const kpiData = {
            total: totalExamsCount,
            completed: totalCompleted,
            upcoming: totalUpcoming,
            passPct: overallPassPct
        };

        return res.status(200).json({
            success: true,
            data: {
                kpiData,
                trendChartData,
                subjectChartData,
                examData,
                subjectData
            }
        });

    } catch (error) {
        console.error("Error in getExamReportsDashboard:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
