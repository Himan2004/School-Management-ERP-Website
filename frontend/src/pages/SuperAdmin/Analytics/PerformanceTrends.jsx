import React, { useState, useMemo, useEffect, useRef } from "react";
import { Users, AlertCircle, CheckCircle, Award, TrendingUp, CalendarDays, Loader2 } from "lucide-react";
import {
  DashGrid,
  Grid,
  Heading,
  Select,
  Option,
  EnhancedDashCard,
  GLineChart,
  GColumnChart,
  DataTable
} from "../../../components/shared/Common_Components";
import { getPerformanceTrendsDataAPI } from "../../../services/PerformanceApi";

const PerformanceTrends = () => {
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const lastFetchedYear = useRef(null);

  useEffect(() => {
    if (academicYear === lastFetchedYear.current) return;

    setLoading(true);
    setError(null);
    getPerformanceTrendsDataAPI(academicYear)
      .then((res) => {
        const payload = res?.data?.data || null;
        setData(payload);

        const fetchedYear = payload?.activeSession || academicYear;
        lastFetchedYear.current = fetchedYear;

        if (payload?.activeSession && academicYear !== payload.activeSession) {
          setAcademicYear(payload.activeSession);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch performance trends:", err);
        setError("Failed to load performance trends. Please check connection and try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [academicYear]);

  // Safe fallback mappings supporting both old and new backend API response keys
  const growthMetrics = useMemo(() => {
    const raw = data?.growthMetrics || {};
    return {
      studentGrowth: data?.studentGrowth ?? raw.studentGrowth ?? 0,
      weakStudents: data?.weakStudents ?? raw.weakStudents ?? 0,
      attendanceGrowth: data?.attendanceGrowth ?? raw.attendanceGrowth ?? 0,
      passGrowth: data?.passTrend ?? raw.passGrowth ?? 0
    };
  }, [data]);

  const enrollmentTrend = data?.enrollmentTrend || [];
  const attendanceTrend = data?.attendanceTrend || [];
  const classComparisonData = data?.classComparisonData || data?.classComparison || [];
  const passTrend = data?.passTrend || data?.passTrendData || [];
  const topStudents = data?.topStudents || [];
  const topTeachers = data?.topTeachers || [];
  const weakBranches = data?.weakBranches || [];

  // Academic sessions list from backend
  const availableSessions = useMemo(() => {
    return data?.availableSessions || ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];
  }, [data]);

  // Dynamic lines/bars for charts
  const enrollmentTrendLines = useMemo(() => {
    const keys = new Set();
    enrollmentTrend.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== "name" && k !== "__placeholder__") {
          keys.add(k);
        }
      });
    });
    const COLORS = ["#4361ee", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#ec4899"];
    return Array.from(keys).map((key, i) => ({
      key,
      label: key,
      color: COLORS[i % COLORS.length]
    }));
  }, [enrollmentTrend]);

  const passTrendBars = useMemo(() => {
    const keys = new Set();
    passTrend.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== "name" && k !== "__placeholder__") {
          keys.add(k);
        }
      });
    });
    const COLORS = ["#4361ee", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#ec4899"];
    return Array.from(keys).map((key, i) => ({
      key,
      label: key,
      color: COLORS[i % COLORS.length]
    }));
  }, [passTrend]);

  // Unique lists for table filters
  const uniqueBranches = useMemo(() => {
    const branches = new Set();
    topStudents.forEach(s => branches.add(s.branch));
    topTeachers.forEach(t => branches.add(t.branch));
    weakBranches.forEach(b => branches.add(b.branch));
    return Array.from(branches).filter(Boolean);
  }, [topStudents, topTeachers, weakBranches]);

  const uniqueClasses = useMemo(() => {
    const grades = new Set();
    topStudents.forEach(s => grades.add(s.grade));
    return Array.from(grades).filter(Boolean);
  }, [topStudents]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set();
    topTeachers.forEach(t => subjects.add(t.subject));
    return Array.from(subjects).filter(Boolean);
  }, [topTeachers]);

  // Tables Columns
  const topStudentsCols = [
    { key: "rank", label: "Rank" },
    { key: "name", label: "Student Name" },
    { key: "branch", label: "Branch" },
    { key: "grade", label: "Grade" },
    { key: "score", label: "Score" }
  ];

  const topTeachersCols = [
    { key: "id", label: "ID" },
    { key: "name", label: "Teacher Name" },
    { key: "branch", label: "Branch" },
    { key: "subject", label: "Subject" },
    { key: "classesHandled", label: "Classes Handled" },
    { key: "rating", label: "Rating (/5)", align: "center" }
  ];

  const weakBranchesCols = [
    { key: "branch", label: "Branch Name" },
    { key: "metric", label: "Weak Metric" },
    { key: "currentValue", label: "Current Value" },
    { key: "targetValue", label: "Target" },
    { 
      key: "severity", 
      label: "Severity Level",
      render: (val) => {
        let colors = "bg-slate-100 text-slate-600";
        if (val === "High Risk") colors = "bg-rose-100 text-rose-700";
        else if (val === "Medium Risk") colors = "bg-amber-100 text-amber-700";
        else if (val === "Low Risk") colors = "bg-emerald-100 text-emerald-700";
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors}`}>
            {val}
          </span>
        );
      }
    },
    { key: "action", label: "Recommended Action" }
  ];

  // Table Filters
  const studentsTableFilters = useMemo(() => [
    { title: "Branch", type: "toggle", key: "branch", options: uniqueBranches.length > 0 ? uniqueBranches : ["All"] },
    { title: "Class / Grade", type: "toggle", key: "grade", options: uniqueClasses.length > 0 ? uniqueClasses : ["All"] }
  ], [uniqueBranches, uniqueClasses]);

  const teachersTableFilters = useMemo(() => [
    { title: "Branch", type: "toggle", key: "branch", options: uniqueBranches.length > 0 ? uniqueBranches : ["All"] },
    { title: "Subject", type: "toggle", key: "subject", options: uniqueSubjects.length > 0 ? uniqueSubjects : ["All"] }
  ], [uniqueBranches, uniqueSubjects]);

  const weakBranchesFilters = useMemo(() => [
    { 
      title: "Branch", type: "toggle", key: "branch", 
      options: uniqueBranches.length > 0 ? ["All Branches", ...uniqueBranches] : ["All Branches"],
      fn: (row, selected) => {
        if (selected.includes("All Branches")) return true;
        return selected.includes(row.branch);
      }
    },
    { 
      title: "Weak Metric", type: "toggle", key: "metric", 
      options: ["All Metrics", "Attendance", "Academic Performance", "Fee Collection"],
      fn: (row, selected) => {
        if (selected.includes("All Metrics")) return true;
        return selected.includes(row.metric);
      }
    },
    { title: "Severity Level", type: "toggle", key: "severity", options: ["High Risk", "Medium Risk", "Low Risk"] }
  ], [uniqueBranches]);

  // Fallbacks for charts if empty
  const monthsShort = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  // Workaround: Inject a tiny non-zero `__placeholder__: 0.001` value to bypass `isEmpty` (allNums.every(n => n === 0)) check in Common_Components
  const safeEnrollmentTrend = useMemo(() => {
    const base = enrollmentTrend.length > 0
      ? enrollmentTrend
      : monthsShort.map(m => {
          const row = { name: m };
          if (enrollmentTrendLines.length > 0) {
            enrollmentTrendLines.forEach(l => { row[l.key] = 0; });
          } else {
            row["Enrollment"] = 0;
          }
          return row;
        });
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [enrollmentTrend, enrollmentTrendLines]);

  const safeAttendanceTrend = useMemo(() => {
    const base = attendanceTrend.length > 0 ? attendanceTrend : monthsShort.map(m => ({ name: m, attendance: 0 }));
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [attendanceTrend]);

  const safeClassComparisonData = useMemo(() => {
    const base = classComparisonData.length > 0
      ? classComparisonData
      : ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].map(c => ({ name: c, score: 0 }));
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [classComparisonData]);

  const safePassTrend = useMemo(() => {
    const base = passTrend.length > 0
      ? passTrend
      : ["UT1", "UT2", "Half Yearly", "UT3", "Annual"].map(e => {
          const row = { name: e };
          if (passTrendBars.length > 0) {
            passTrendBars.forEach(b => { row[b.key] = 0; });
          } else {
            row["Pass %"] = 0;
          }
          return row;
        });
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [passTrend, passTrendBars]);

  // Formatter for growth metrics to cleanly display 0% instead of +0% or -0%
  const fmtGrowth = (val) => {
    const num = Number(val) || 0;
    if (num > 0) return `+${num}%`;
    if (num < 0) return `${num}%`;
    return `0%`;
  };

  return (
    <div className="custom-dashboard-styles w-full max-w-[1600px] mx-auto space-y-6">

      {/* ── CSS TWEAKS INJECTED ── */}
      <style>{`
        /* Global override for DataTable search visibility and active state */
        .custom-dashboard-styles input[placeholder="Search…"] {
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .custom-dashboard-styles input[placeholder="Search…"]:focus {
          border-color: #223F74 !important;
          box-shadow: 0 0 0 2px rgba(34, 63, 116, 0.2) !important;
        }
        
        /* Make the unselected toggle round indicator darker for filter visibility */
        div[class*="z-[9999]"] button > span.w-4.h-4.border-\\[\\#E2E8F0\\] {
          border-color: #94a3b8 !important;
        }

        /* Hide the native border of Select inside our premium wrapper */
        .premium-select-wrapper select {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding-left: 0.5rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
        }
        .premium-select-wrapper select:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .premium-select-wrapper button {
          background-color: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
        }
        .premium-select-wrapper button span {
          color: #1e293b !important;
          font-weight: 700 !important;
        }
        .premium-select-wrapper button svg {
          color: #94a3b8 !important;
        }

        /* ----- STUDENTS TABLE ALIGNMENT & COLUMN SPACING FIXES ----- */
        .students-table-section {
          width: 100%;
          max-width: 100%;
        }
        .students-table-section .overflow-x-auto {
          margin-left: 0 !important;
          margin-right: 0 !important;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          width: 100%;
          overflow-x: hidden !important;
        }
        
        .students-table-section table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        .students-table-section th, 
        .students-table-section td {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left !important;
        }
        .students-table-section th:nth-child(1), .students-table-section td:nth-child(1) { width: 10%; }
        .students-table-section th:nth-child(2), .students-table-section td:nth-child(2) { width: 20%; }
        .students-table-section th:nth-child(3), .students-table-section td:nth-child(3) { width: 20%; }
        .students-table-section th:nth-child(4), .students-table-section td:nth-child(4) { width: 20%; }
        .students-table-section th:nth-child(5), .students-table-section td:nth-child(5) { width: 15%; text-align: left !important; }

        /* ----- TEACHERS TABLE ALIGNMENT & COLUMN SPACING FIXES ----- */
        .teachers-table-section {
          width: 100%;
          max-width: 100%;
        }
        .teachers-table-section .overflow-x-auto {
          margin-left: 0 !important;
          margin-right: 0 !important;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          width: 100%;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        
        .teachers-table-section .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
          display: block !important;
        }
        .teachers-table-section .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 0 0 12px 12px;
        }
        .teachers-table-section .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .teachers-table-section .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .teachers-table-section table {
          width: 100% !important;
          min-width: 1000px !important;
          table-layout: fixed !important;
        }
        .teachers-table-section th, 
        .teachers-table-section td {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left !important;
        }
        .teachers-table-section th:nth-child(1),
        .teachers-table-section td:nth-child(1) { width: 13%; text-align: left !important; }
        .teachers-table-section th:nth-child(2),
        .teachers-table-section td:nth-child(2) { width: 21%; }
        .teachers-table-section th:nth-child(3),
        .teachers-table-section td:nth-child(3) { width: 16%; }
        .teachers-table-section th:nth-child(4),
        .teachers-table-section td:nth-child(4) { width: 18%; }
        .teachers-table-section th:nth-child(5),
        .teachers-table-section td:nth-child(5) { width: 18%; }
        .teachers-table-section th:nth-child(6),
        .teachers-table-section td:nth-child(6) { width: 14%; text-align: center !important; }

        /* ----- WEAK BRANCHES TABLE ALIGNMENT & COLUMN SPACING FIXES ----- */
        .weak-branches-table-section {
          width: 100%;
          max-width: 100%;
        }
        .weak-branches-table-section .overflow-x-auto {
          margin-left: 0 !important;
          margin-right: 0 !important;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          width: 100%;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        
        .weak-branches-table-section .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
          display: block !important;
        }
        .weak-branches-table-section .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 0 0 12px 12px;
        }
        .weak-branches-table-section .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .weak-branches-table-section .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .weak-branches-table-section table {
          width: 100% !important;
          min-width: 1000px !important;
          table-layout: fixed !important;
        }
        .weak-branches-table-section th, 
        .weak-branches-table-section td {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left !important;
        }
        .weak-branches-table-section th:nth-child(1),
        .weak-branches-table-section td:nth-child(1) { width: 16%; }
        .weak-branches-table-section th:nth-child(2),
        .weak-branches-table-section td:nth-child(2) { width: 18%; }
        .weak-branches-table-section th:nth-child(3),
        .weak-branches-table-section td:nth-child(3) { width: 16%; }
        .weak-branches-table-section th:nth-child(4),
        .weak-branches-table-section td:nth-child(4) { width: 14%; }
        .weak-branches-table-section th:nth-child(5),
        .weak-branches-table-section td:nth-child(5) { width: 16%; }
        .weak-branches-table-section th:nth-child(6),
        .weak-branches-table-section td:nth-child(6) { width: 20%; }
      `}</style>

      {/* Page Heading */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText={
            <span className="inline-flex items-center gap-2">
              <span className="flex items-center cursor-help px-1 -mx-1" title="Displays historical performance, attendance, and comparisons across the organization.">
                <TrendingUp size={22} className="text-[#0ea5e9] hover:opacity-80 transition-opacity" />
              </span>
              <span>Performance</span>
            </span>
          }
          secondaryText="Trends"
          size={12}
          fontSize="2xl"
        />
      </Grid>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-bold text-slate-400">Loading performance trends data…</p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm text-rose-500">
          <AlertCircle className="w-8 h-8" />
          <p className="mt-3 text-sm font-bold">{error}</p>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <DashGrid cols={12} gap={3}>
            <EnhancedDashCard
              title="Student Growth % "
              value={fmtGrowth(growthMetrics.studentGrowth)}
              icon={<Users size={22} />}
              size={3}
              accentColor="#0ea5e9"
            />
            <EnhancedDashCard
              title="Weak Students"
              value={growthMetrics.weakStudents || 0}
              icon={<AlertCircle size={22} />}
              size={3}
              accentColor="#ef4444"
            />
            <EnhancedDashCard
              title="Attendance Trend%"
              value={fmtGrowth(growthMetrics.attendanceGrowth)}
              icon={<CheckCircle size={22} />}
              size={3}
              accentColor={growthMetrics.attendanceGrowth < 0 ? "#ef4444" : "#22c55e"}
            />
            <EnhancedDashCard
              title="Pass Trend %"
              value={fmtGrowth(growthMetrics.passGrowth)}
              icon={<Award size={22} />}
              size={3}
              accentColor={growthMetrics.passGrowth < 0 ? "#ef4444" : "#22c55e"}
            />
          </DashGrid>

          {/* Academic Year Filter */}
          <div className="flex justify-end w-full relative z-30">
            <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
                <CalendarDays size={18} />
              </div>
              <div className="flex-1">
                <Select
                  id="academicYear"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  size={12}
                  searchable={false}
                >
                  {availableSessions.map(s => (
                    <Option key={s} value={s} label={s} />
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Charts */}
          <DashGrid cols={12} gap={4}>
            <GLineChart
              title="Enrollment Trend"
              subtitle="Branch wise monthly enrollment"
              data={safeEnrollmentTrend}
              lines={enrollmentTrendLines.length > 0 ? enrollmentTrendLines : [{ key: "Enrollment", label: "Enrollment", color: "#4361ee" }]}
              size={6}
            />

            <GColumnChart
              title="School wide Attendance"
              subtitle="Percentage over time"
              data={safeAttendanceTrend}
              bars={[
                { key: "attendance", label: "Attendance", color: "#0ea5e9" }
              ]}
              size={6}
            />

            <GColumnChart
              title="Class vs Class Comparison"
              subtitle="Average performance score by class"
              data={safeClassComparisonData}
              bars={[
                { key: "score", label: "Average Score (%)", color: "#8b5cf6" }
              ]}
              size={6}
            />

            <GColumnChart
              title="Pass % Trend"
              subtitle="Performance across exams"
              data={safePassTrend}
              bars={passTrendBars.length > 0 ? passTrendBars : [{ key: "Pass %", label: "Pass %", color: "#4361ee" }]}
              size={6}
            />
          </DashGrid>

          {/* Data Tables */}
          <div className="students-table-section relative z-10">
            <DataTable
              title="Top Performing Students"
              columns={topStudentsCols}
              rows={topStudents}
              size={12}
              pageSize={5}
              searchable={true}
              filters={studentsTableFilters}
              exportable={true}
            />
          </div>

          <div className="teachers-table-section relative z-10 mt-6">
            <DataTable
              title="Top Performing Teachers"
              columns={topTeachersCols}
              rows={topTeachers}
              size={12}
              pageSize={5}
              searchable={true}
              filters={teachersTableFilters}
              exportable={true}
            />
          </div>

          <div className="weak-branches-table-section relative z-10 mt-6">
            <DataTable
              title="Weak Branches"
              columns={weakBranchesCols}
              rows={weakBranches}
              size={12}
              pageSize={5}
              searchable={true}
              filters={weakBranchesFilters}
              exportable={true}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceTrends;
