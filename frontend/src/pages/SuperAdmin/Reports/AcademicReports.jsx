import React, { useState, useMemo, useEffect } from "react";
import { BookOpen, Users, TrendingUp, Award, BarChart2, Search, ChevronLeft, ChevronRight, Download, CalendarDays } from "lucide-react";
import { DashGrid, Grid, EnhancedDashCard, Heading, Select, Option, DataTable } from "../../../components/shared/Common_Components";
import { Toaster } from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getAcademicKPISummaryApi,
  getAcademicPassPercentageByBranchApi,
  getAcademicGradeDistributionApi,
  getAcademicBranchHQComparisonApi,
  getAcademicClassPerformanceApi,
  getAcademicBranchResultsApi,
  getAcademicSubjectAnalysisApi,
  getReportFiltersApi
} from "../../../services/api/reportsApi";

// Reusable Shared Chart Component
const GColumnChart = ({ title, data, keys, colors }) => (
  <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-100 p-4 sm:p-6 shadow-sm min-w-0 flex flex-col h-full min-h-[350px]">
    <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4">{title}</h3>
    <div className="w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip wrapperClassName="text-xs font-bold rounded-xl shadow-lg border-none" />
          {keys.length > 1 && <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "bold" }} iconType="circle" />}
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={colors[i]} radius={[6, 6, 0, 0]} barSize={20} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Reusable Server-Side Pagination and Search Table Wrapper
const TableWithServerPagination = ({
  title,
  columns,
  rows,
  page,
  limit,
  totalRecords,
  totalPages,
  search,
  onSearchChange,
  onPageChange,
  onLimitChange,
  onExport,
  loading
}) => {
  return (
    <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4">
      {/* Header toolbar */}
      {title && (
        <div className="mb-4">
          <h2 className="text-[20px] font-black text-[#1D1D1F] tracking-tight">{title}</h2>
        </div>
      )}

      {/* Search + page size + export */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between sm:gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 whitespace-nowrap sm:flex-none sm:ml-auto">
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#223F74] hover:bg-[#F4F7FB] transition"
            >
              <Download size={14} />
              Export
            </button>
          )}

          <Select
            value={limit}
            searchable={false}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            size={3}
          >
            {[5, 10, 20, 50].map((sz) => (
              <Option key={sz} value={sz} label={String(sz)} />
            ))}
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="relative">
        <DataTable
          columns={columns}
          rows={rows}
          pageSize={limit}
          searchable={false}
          hidePagination={true}
          hideRecordSummary={true}
        />
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <p className="text-slate-500 text-xs sm:text-sm">
          Showing{" "}
          <span className="text-[#223F74] font-bold">
            {totalRecords === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, totalRecords)}
          </span>{" "}
          of <span className="text-[#223F74] font-bold">{totalRecords}</span> records
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-300 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition ${p === page
                      ? "bg-[#223F74] text-white shadow"
                      : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AcademicReports = () => {
  const [academicYear, setAcademicYear] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  // Filters State
  const [filterOptions, setFilterOptions] = useState({
    branches: ["All Branches"],
    classes: ["All Classes"],
    academicYears: [],
    exams: []
  });

  // KPI summary state
  const [kpiSummary, setKpiSummary] = useState({
    totalAppeared: 0,
    overallPassPercent: 0,
    schoolAvg: 0,
    topPerformingBranch: "-"
  });

  // Charts data states
  const [passPercentageByBranch, setPassPercentageByBranch] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [branchComparison, setBranchComparison] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);

  // Branch results table state
  const [branchResults, setBranchResults] = useState([]);

  // Table Data States (Subject)
  const [subjectAnalysis, setSubjectAnalysis] = useState([]);

  // Fetch filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await getReportFiltersApi();
        if (res.success && res.data) {
          setFilterOptions(res.data);
          if (res.data.academicYears?.length > 0) {
            setAcademicYear(res.data.academicYears[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load report filters:", err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch KPI statistics and chart metrics when global filters change
  useEffect(() => {
    if (!academicYear) return;

    const fetchKPIsAndCharts = async () => {
      try {
        const params = { academicYear, selectedBranch };

        // KPI Summary
        const kpiRes = await getAcademicKPISummaryApi(params);
        if (kpiRes.success && kpiRes.data) {
          setKpiSummary(kpiRes.data);
        }

        // Pass Percentage by Branch
        const passRes = await getAcademicPassPercentageByBranchApi(params);
        if (passRes.success && passRes.data) {
          setPassPercentageByBranch(passRes.data);
        }

        // Grade Distribution
        const gradeRes = await getAcademicGradeDistributionApi(params);
        if (gradeRes.success && gradeRes.data) {
          setGradeDistribution(gradeRes.data);
        }

        // Branch comparison avg vs hq
        const compRes = await getAcademicBranchHQComparisonApi(params);
        if (compRes.success && compRes.data) {
          setBranchComparison(compRes.data);
        }

        // Class performance comparison
        const classRes = await getAcademicClassPerformanceApi(params);
        if (classRes.success && classRes.data) {
          setClassPerformance(classRes.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard KPIs/charts:", err);
      }
    };

    fetchKPIsAndCharts();
  }, [academicYear, selectedBranch]);

  // Fetch Branch results table data
  useEffect(() => {
    if (!academicYear) return;

    const fetchBranchResultsTable = async () => {
      try {
        const res = await getAcademicBranchResultsApi({
          academicYear,
          selectedBranch,
          search: "",
          page: 1,
          limit: 1000
        });
        if (res.success && res.data) {
          setBranchResults(res.data.branchResults || []);
        }
      } catch (err) {
        console.error("Failed to load branch wise results table:", err);
      }
    };

    fetchBranchResultsTable();
  }, [academicYear, selectedBranch]);

  // Fetch Subject analysis table data
  useEffect(() => {
    if (!academicYear) return;

    const fetchSubjectAnalysisTable = async () => {
      try {
        const res = await getAcademicSubjectAnalysisApi({
          academicYear,
          selectedBranch,
          search: "",
          page: 1,
          limit: 1000
        });
        if (res.success && res.data) {
          setSubjectAnalysis(res.data.subjectAnalysis || []);
        }
      } catch (err) {
        console.error("Failed to load subject wise analysis table:", err);
      }
    };

    fetchSubjectAnalysisTable();
  }, [academicYear, selectedBranch]);

  // Chart datasets with proper placeholders to avoid empty states
  const passByBranchChart = useMemo(() => {
    const rawData = passPercentageByBranch || [];
    if (rawData.length > 0) {
      return rawData.map(item => ({ ...item, __placeholder__: 0.001 }));
    }
    const cleanBranches = filterOptions.branches.filter(b => b !== "All Branches");
    const fallback = cleanBranches.length > 0
      ? cleanBranches.map(b => ({ branch: b.replace("DPS ", ""), passPercent: 0 }))
      : [{ branch: "No Branches", passPercent: 0 }];
    return fallback.map(item => ({ ...item, __placeholder__: 0.001 }));
  }, [passPercentageByBranch, filterOptions.branches]);

  const gradeDistributionChart = useMemo(() => {
    const rawData = gradeDistribution || [];
    const hasValues = rawData.some(entry => entry.value > 0);
    if (hasValues) {
      return rawData;
    }
    return [
      { name: "A+", value: 0, color: "#2563eb" },
      { name: "A", value: 0, color: "#10b981" },
      { name: "B+", value: 0, color: "#8b5cf6" },
      { name: "B", value: 0, color: "#f59e0b" },
      { name: "C", value: 0, color: "#f43f5e" },
      { name: "D", value: 0, color: "#06b6d4" },
      { name: "F", value: 0, color: "#ef4444" }
    ];
  }, [gradeDistribution]);

  const branchComparisonChart = useMemo(() => {
    const rawData = branchComparison || [];
    if (rawData.length > 0) {
      return rawData.map(item => ({
        name: item.branch.replace("DPS ", ""),
        "Branch Average": parseFloat(item.branchAvg) || 0,
        "HQ Average": parseFloat(item.hqAvg) || 0,
        __placeholder__: 0.001
      }));
    }
    const cleanBranches = filterOptions.branches.filter(b => b !== "All Branches");
    const fallback = cleanBranches.length > 0
      ? cleanBranches.map(b => ({ branch: b.replace("DPS ", ""), branchAvg: 0, hqAvg: 0 }))
      : [{ branch: "No Branches", branchAvg: 0, hqAvg: 0 }];
    return fallback.map(item => ({
      name: item.branch,
      "Branch Average": item.branchAvg,
      "HQ Average": item.hqAvg,
      __placeholder__: 0.001
    }));
  }, [branchComparison, filterOptions.branches]);

  const classComparisonChart = useMemo(() => {
    const rawData = classPerformance || [];
    if (rawData.length > 0) {
      return rawData.map(item => ({
        name: item.className,
        "Pass %": parseFloat(item.passPercentage) || 0,
        "Avg Marks": parseFloat(item.averagePercentage) || 0,
        __placeholder__: 0.001
      }));
    }
    const cleanClasses = filterOptions.classes.filter(c => c !== "All Classes");
    const fallback = cleanClasses.length > 0
      ? cleanClasses.map(c => ({ className: c, passPercentage: 0, averagePercentage: 0 }))
      : [{ className: "No Classes", passPercentage: 0, averagePercentage: 0 }];
    return fallback.map(item => ({
      name: item.className,
      "Pass %": item.passPercentage,
      "Avg Marks": item.averagePercentage,
      __placeholder__: 0.001
    }));
  }, [classPerformance, filterOptions.classes]);

  return (
    <div className="custom-dashboard-styles w-full max-w-[1600px] mx-auto space-y-6">
      <Toaster />

      {/* ── CSS TWEAKS INJECTED ── */}
      <style>{`
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
      `}</style>

      {/* Page Heading */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText={
            <span className="inline-flex items-center gap-2">
              <span className="flex items-center cursor-help px-1 -mx-1" title="Academic reports across all branches.">
                <BookOpen size={22} className="text-[#0ea5e9] hover:opacity-80 transition-opacity" />
              </span>
              <span>Academic</span>
            </span>
          }
          secondaryText="Reports"
          size={12}
          fontSize="2xl"
        />
      </Grid>

      {/* KPI Cards */}
      <DashGrid cols={12} gap={3}>
          <EnhancedDashCard title="Students Appeared" value={kpiSummary.totalAppeared} icon={<Users size={22} />} accentColor="#3b82f6" size={3} />
          <EnhancedDashCard title="Overall Pass %" value={`${kpiSummary.overallPassPercent}%`} icon={<TrendingUp size={22} />} accentColor="#10b981" size={3} />
          <EnhancedDashCard title="School Average %" value={`${kpiSummary.schoolAvg}%`} icon={<Award size={22} />} accentColor="#8b5cf6" size={3} />
          <EnhancedDashCard title="Top Performing Branch" value={kpiSummary.topPerformingBranch} icon={<BarChart2 size={22} />} accentColor="#223F74" size={3} />
      </DashGrid>

      {/* Global Filters */}
      <div className="flex flex-wrap items-center justify-end gap-3 w-full relative z-30">
        {/* Academic Year Filter */}
        <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
          <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
            <CalendarDays size={18} />
          </div>
          <div className="flex-1">
            <Select
              id="year-global"
              size={12}
              value={academicYear || ""}
              onChange={(e) => {
                setAcademicYear(e.target.value);
              }}
              placeholder="Academic Year"
              searchable={false}
            >
              {filterOptions.academicYears.map((year) => (
                <Option key={year} value={year} label={year} />
              ))}
            </Select>
          </div>
        </div>

        {/* Branch Filter */}
        <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
          <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
            <Users size={18} />
          </div>
          <div className="flex-1">
            <Select
              id="branch-global"
              size={12}
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
              }}
              placeholder="Select Branch"
              searchable={false}
            >
              {filterOptions.branches.map((b) => (
                <Option key={b} value={b} label={b} />
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <DashGrid cols={12} gap={4}>
        <div className="col-span-12 lg:col-span-6 bg-white rounded-[24px] sm:rounded-[28px] border border-slate-100 p-4 sm:p-6 shadow-sm min-w-0 flex flex-col h-full min-h-[350px]">
          <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4">Pass % by Branch</h3>
          <div className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={passByBranchChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} wrapperClassName="text-xs font-bold rounded-xl shadow-lg border-none" />
                <Bar dataKey="passPercent" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-white rounded-[24px] sm:rounded-[28px] border border-slate-100 p-4 sm:p-6 shadow-sm min-w-0 flex flex-col h-full min-h-[350px]">
          <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4">Grade Distribution</h3>
          <div className="w-full flex-1 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gradeDistributionChart} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" paddingAngle={4} dataKey="value" stroke="none">
                    {gradeDistributionChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#cbd5e1"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}`} wrapperClassName="text-xs font-bold rounded-xl shadow-lg border-none" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800">{kpiSummary.overallPassPercent}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pass</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-1 min-w-[120px]">
              {gradeDistributionChart.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || "#cbd5e1" }}></span>
                    <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                  </div>
                  <span className="font-black text-slate-800">{entry.value} students</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 h-full min-h-[350px]">
          <GColumnChart title="Branch vs HQ Average" data={branchComparisonChart} keys={["Branch Average", "HQ Average"]} colors={["#3b82f6", "#f59e0b"]} />
        </div>

        <div className="col-span-12 lg:col-span-6 h-full min-h-[350px]">
          <GColumnChart title="Class-wise Performance Comparison" data={classComparisonChart} keys={["Pass %", "Avg Marks"]} colors={["#10b981", "#8b5cf6"]} />
        </div>
      </DashGrid>

      {/* Data Tables Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#1D1D1F]">Branch wise Results</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable
              title=""
              columns={[
                { key: "branch", label: "Branch Name", width: "160px" },
                { key: "appeared", label: "Total Appeared", width: "120px", align: "center" },
                { key: "pass", label: "Pass", width: "100px", align: "center" },
                { key: "fail", label: "Fail", width: "100px", align: "center" },
                { key: "passPercent", label: "Pass %", width: "100px", align: "center", render: (val) => `${val}%` },
                { key: "averageMarks", label: "Average Marks", width: "140px", align: "center" },
                { key: "topScorer", label: "Top Scorer", width: "160px" },
                { key: "topGrade", label: "Top Grade", width: "120px", align: "center", render: (val) => <span className="font-bold text-[#223F74]">{val}</span> },
              ]}
              rows={branchResults}
              searchable={true}
              exportable={true}
              exportFileName="Branch_Wise_Results"
              pageSize={5}
            />
          </div>
        </div>
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#1D1D1F]">Subject wise Analysis</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable
              title=""
              columns={[
                { key: "subject", label: "Subject", width: "160px" },
                { key: "hqAverage", label: "HQ Average", width: "120px", align: "center", render: (val) => `${val}%` },
                { key: "passPercent", label: "Pass %", width: "100px", align: "center", render: (val) => `${val}%` },
                { key: "failCount", label: "Fail Count", width: "100px", align: "center" },
                { key: "studentsAppeared", label: "Students Appeared", width: "160px", align: "center" },
                { key: "best", label: "Best Performing Branch", width: "160px" },
                { 
                  key: "difficultyLevel", 
                  label: "Difficulty Level", 
                  width: "160px",
                  render: (val) => {
                    const colors = {
                      "Difficult": "bg-rose-100 text-rose-700",
                      "Moderate": "bg-amber-100 text-amber-700",
                      "Easy": "bg-emerald-100 text-emerald-700",
                    };
                    const cls = colors[val] || "bg-slate-100 text-slate-700";
                    return <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${cls}`}>{val}</span>;
                  }
                },
              ]}
              rows={subjectAnalysis}
              searchable={true}
              exportable={true}
              exportFileName="Subject_Wise_Analysis"
              pageSize={5}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicReports;
