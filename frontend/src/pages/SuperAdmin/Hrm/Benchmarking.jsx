import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  FileSpreadsheet,
  Loader2,
  Share2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Button,
  DashGrid,
  DataTable,
  EnhancedDashCard,
  GColumnChart,
  GLineChart,
  Heading,
  Option,
  SelectField,
} from "../../../components/shared/Common_Components.jsx";
import { fetchStaffBenchmarking } from "../../../services/staffApi";

// TODO: Backend Integration Audit Notes:
// A. Month From / Month To / Academic Session filters: Pending backend database filter integration in query params. Currently the backend aggregates overall results and returns last 6 months trend dynamically based on database state.
// B. Role filter: Handled dynamically on the frontend across all aggregated metrics, staff tables, and KPI cards.

const FILTER_KEY = "superadmin_staff_benchmark_filters";
const sessions = ["2026-27", "2025-26", "2024-25", "2023-24"];
const roleOptions = [
  "All",
  "Teacher",
  "Class Teacher",
  "Subject Teacher",
  "Principal",
  "Admin Department",
  "Accountant",
];

const monthOptions = [
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

const fmt = (v) => new Intl.NumberFormat("en-IN").format(v || 0);

const csvEscape = (v) => {
  if (v == null) return "";
  const t = String(v);
  return t.includes(",") || t.includes("\n") || t.includes('"')
    ? `"${t.replace(/"/g, '""')}"`
    : t;
};

const downloadCsv = (fileName, rows) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const content = [
    keys.map(csvEscape).join(","),
    ...rows.map((r) => keys.map((k) => csvEscape(r[k])).join(",")),
  ].join("\n");
  const blob = new Blob(["\ufeff" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const loadFilters = () => {
  try {
    const s = localStorage.getItem(FILTER_KEY);
    return s ? JSON.parse(s) : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
};

const DEFAULT_FILTERS = {
  dateFrom: "April",
  dateTo: "September",
  academicSession: "2026-27",
  role: "All",
};

const TONE = {
  blue: "border-blue-100 bg-blue-50/60",
  green: "border-emerald-100 bg-emerald-50/60",
  amber: "border-amber-100 bg-amber-50/60",
  rose: "border-rose-100 bg-rose-50/60",
};

const InsightCard = ({ icon, title, text, tone = "blue" }) => (
  <div className={`rounded-[22px] border p-4 ${TONE[tone]}`}>
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div>
      <div>
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
          {text}
        </p>
      </div>
    </div>
  </div>
);

const Benchmarking = () => {
  const [filters, setFilters] = useState(loadFilters);
  const [benchmarkingData, setBenchmarkingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  // ── Fetch ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const queryParams = `?dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}&academicSession=${filters.academicSession}&role=${filters.role}`;
        const res = await fetchStaffBenchmarking(queryParams);
        if (res.success) {
          setBenchmarkingData(res.data);
        } else {
          setError(res.message || "Failed to load benchmarking data");
        }
      } catch (e) {
        setError(e.message || "Failed to load staff benchmarking data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.dateFrom, filters.dateTo, filters.academicSession, filters.role]);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  }, [filters]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const staffRows = useMemo(
    () => benchmarkingData?.staffRows || [],
    [benchmarkingData],
  );

  const visible = useMemo(
    () =>
      staffRows.filter(
        (s) => filters.role === "All" || s.role === filters.role,
      ),
    [staffRows, filters.role],
  );

  // Per-branch aggregates based on visible role selection
  const branchMetrics = useMemo(() => {
    const map = new Map();

    // Initialize map with all organization branches so they are never hidden
    const allBranches = benchmarkingData?.branches || [];
    allBranches.forEach((b) => {
      map.set(b, []);
    });

    // Populate with visible staff rows
    visible.forEach((s) => {
      if (!map.has(s.branch)) {
        map.set(s.branch, []);
      }
      map.get(s.branch).push(s);
    });

    return Array.from(map.entries()).map(([branch, rows]) => {
      const count = rows.length;
      const avg = (arr, key) =>
        arr.length
          ? arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length
          : 0;
      return {
        branch,
        staffCount: count,
        attendance: Number(avg(rows, "attendance").toFixed(1)),
        performance: Number(avg(rows, "score").toFixed(1)),
        resignationRate: Number(avg(rows, "resignationRisk").toFixed(1)),
        retention: Number(avg(rows, "retention").toFixed(1)),
      };
    });
  }, [visible, benchmarkingData]);

  const branchLines = useMemo(
    () =>
      branchMetrics.map((b, i) => ({
        key: b.branch,
        label: b.branch,
        color: [
          "#223F74",
          "#5B9A6A",
          "#E0A04B",
          "#D66B5F",
          "#8B5CF6",
          "#EC4899",
          "#3B82F6",
        ][i % 7],
      })),
    [branchMetrics],
  );

  // KPI values
  const totalStaff = visible.length;
  const activeStaff = visible.filter((s) => s.active).length;
  const openResigns = benchmarkingData?.openResigns || 0;

  const avgAttendance = useMemo(() => {
    if (visible.length === 0) return "0.0%";
    const sum = visible.reduce((acc, s) => acc + (s.attendance || 0), 0);
    return `${(sum / visible.length).toFixed(1)}%`;
  }, [visible]);

  const avgRetention = useMemo(() => {
    if (visible.length === 0) return "0.0%";
    const sum = visible.reduce((acc, s) => acc + (s.retention || 0), 0);
    return `${(sum / visible.length).toFixed(1)}%`;
  }, [visible]);

  const avgReviewScore = useMemo(() => {
    if (visible.length === 0) return "0.0";
    const sum = visible.reduce((acc, s) => acc + (s.score || 0), 0);
    return (sum / (visible.length * 10)).toFixed(1);
  }, [visible]);

  // ── Month range from filters ──────────────────────────────────────────────
  const MONTH_ORDER = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Build the ordered list of month labels covered by the selected filter range
  const filterMonthLabels = useMemo(() => {
    const fromIdx = MONTH_ORDER.indexOf(filters.dateFrom);
    const toIdx = MONTH_ORDER.indexOf(filters.dateTo);
    const session = filters.academicSession || "2026-27";
    const startYear = parseInt(session.split("-")[0]) || 2026;
    const endYear = startYear + 1;
    const labels = [];
    let idx = fromIdx < 0 ? 3 : fromIdx;
    const end = toIdx < 0 ? 8 : toIdx;
    for (let steps = 0; steps <= 11; steps++) {
      const mIdx = idx % 12;
      const yr = mIdx >= 3 ? startYear : endYear;
      labels.push(`${MONTH_SHORT[mIdx]} ${String(yr).slice(-2)}`);
      if (mIdx === end) break;
      idx++;
    }
    return labels;
  }, [filters.dateFrom, filters.dateTo, filters.academicSession]);

  // ── Trends — API data with guaranteed-render fallback ────────────────────
  // ChartCard fires "No Records Found" when ALL numeric values across ALL rows are 0.
  // We inject a near-zero sentinel (0.001) under a hidden key so ChartCard always
  // renders the chart. The sentinel key is excluded from trendLines so no legend
  // entry or line is drawn for it.
  const SENTINEL_KEY = "__placeholder__";

  const retentionTrends = useMemo(() => {
    const apiData = benchmarkingData?.retentionTrends;
    const branches = benchmarkingData?.branches || [];
    console.log("Retention API", apiData);
    if (apiData && apiData.length > 0) {
      const out = apiData.map((pt) => ({ ...pt, [SENTINEL_KEY]: 0.001 }));
      console.log("Retention Chart", out);
      return out;
    }
    const fallback = filterMonthLabels.map((name) => {
      const pt = { name, [SENTINEL_KEY]: 0.001 };
      branches.forEach((b) => {
        pt[b] = 0;
      });
      return pt;
    });
    console.log("Retention Chart (fallback)", fallback);
    return fallback;
  }, [benchmarkingData, filterMonthLabels]);

  const resignationRiskTrends = useMemo(() => {
    const apiData = benchmarkingData?.resignationRiskTrends;
    const branches = benchmarkingData?.branches || [];
    console.log("Resignation API", apiData);
    if (apiData && apiData.length > 0) {
      const out = apiData.map((pt) => ({ ...pt, [SENTINEL_KEY]: 0.001 }));
      console.log("Resignation Chart", out);
      return out;
    }
    const fallback = filterMonthLabels.map((name) => {
      const pt = { name, [SENTINEL_KEY]: 0.001 };
      branches.forEach((b) => {
        pt[b] = 0;
      });
      return pt;
    });
    console.log("Resignation Chart (fallback)", fallback);
    return fallback;
  }, [benchmarkingData, filterMonthLabels]);

  // Build line series from API response keys — exclude sentinel and "name"
  const trendLines = useMemo(() => {
    const COLORS = [
      "#223F74",
      "#5B9A6A",
      "#E0A04B",
      "#D66B5F",
      "#8B5CF6",
      "#EC4899",
      "#3B82F6",
    ];
    const sample = retentionTrends[0] || resignationRiskTrends[0] || {};
    return Object.keys(sample)
      .filter((k) => k !== "name" && k !== SENTINEL_KEY)
      .map((k, i) => ({ key: k, label: k, color: COLORS[i % COLORS.length] }));
  }, [retentionTrends, resignationRiskTrends]);

  // Table rows
  const teacherRows = useMemo(
    () =>
      visible
        .filter((s) => s.role.includes("Teacher"))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 15)
        .map((t, i) => ({
          rank: i + 1,
          name: t.name,
          branch: t.branch,
          role: t.role,
          subject: t.subject || "N/A",
          score: t.score != null ? `${t.score.toFixed(1)}%` : "N/A",
          attendance:
            t.attendance != null ? `${t.attendance.toFixed(1)}%` : "N/A",
          engagement:
            t.classEngagement != null
              ? `${t.classEngagement.toFixed(1)}%`
              : "N/A",
          studentImpact:
            t.studentImpact != null ? `${t.studentImpact.toFixed(1)}%` : "N/A",
          taskCompletion:
            t.taskCompletion != null
              ? `${t.taskCompletion.toFixed(1)}%`
              : "N/A",
          grade: t.grade || "N/A",
          trend: t.trend || "N/A",
        })),
    [visible],
  );

  const underperformRows = useMemo(
    () =>
      visible
        .filter(
          (s) =>
            (s.score != null && s.score < 74) ||
            (s.attendance != null && s.attendance < 76) ||
            (s.complaintRatio != null && s.complaintRatio > 1.8) ||
            (s.resignationRisk != null && s.resignationRisk > 24),
        )
        .slice(0, 15)
        .map((s) => ({
          name: s.name,
          branch: s.branch,
          role: s.role,
          issue:
            s.attendance != null && s.attendance < 76
              ? "Low Attendance"
              : s.complaintRatio != null && s.complaintRatio > 1.8
                ? "High Complaints"
                : s.resignationRisk != null && s.resignationRisk > 24
                  ? "Resignation Risk"
                  : s.score != null && s.score < 74
                    ? "Low Performance"
                    : "N/A",
          score: s.score != null ? `${s.score.toFixed(1)}%` : "N/A",
          trend: s.trend || "N/A",
          action:
            s.attendance != null && s.attendance < 76
              ? "Attendance counselling"
              : s.complaintRatio != null && s.complaintRatio > 1.8
                ? "Complaint resolution coaching"
                : s.resignationRisk != null && s.resignationRisk > 24
                  ? "Retention check-in"
                  : "30-day improvement plan",
        })),
    [visible],
  );

  // Insight helpers
  const topBranch =
    branchMetrics.length && branchMetrics.some((b) => b.performance > 0)
      ? [...branchMetrics].sort((a, b) => b.performance - a.performance)[0]
      : null;
  const lowAttBranch =
    branchMetrics.length && branchMetrics.some((b) => b.attendance > 0)
      ? [...branchMetrics].sort((a, b) => a.attendance - b.attendance)[0]
      : null;
  const topTeacher =
    teacherRows.length && teacherRows.some((t) => t.score !== "N/A")
      ? teacherRows[0]
      : null;

  // Export
  const exportCsv = () =>
    downloadCsv(
      "staff_benchmark_report.csv",
      teacherRows.map((r) => ({ type: "Teacher", ...r })),
    );

  const shareReport = async () => {
    const text = `Staff Benchmarking · ${totalStaff} staff · avg attendance ${avgAttendance} · avg retention ${avgRetention}`;
    if (navigator.share) {
      await navigator.share({ title: "Staff Benchmarking", text });
      return;
    }
    await navigator.clipboard?.writeText(text);
  };

  const hasData = (benchmarkingData?.branches || []).length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-12 overflow-x-hidden">
      {/* Heading */}
      <Heading primaryText="Staff" secondaryText="Benchmarking" size={12} />

      {/* Filters */}
      <div className="mt-6">
        <DashGrid cols={12} gap={4}>
          <SelectField
            label="Month From"
            id="sb_from"
            value={filters.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
            searchable={false}
            size={3}
          >
            {monthOptions.map((m) => (
              <Option key={m.value} value={m.value} label={m.label} />
            ))}
          </SelectField>
          <SelectField
            label="Month To"
            id="sb_to"
            value={filters.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
            searchable={false}
            size={3}
          >
            {monthOptions.map((m) => (
              <Option key={m.value} value={m.value} label={m.label} />
            ))}
          </SelectField>
          <SelectField
            label="Academic Session"
            id="sb_session"
            value={filters.academicSession}
            onChange={(e) => set("academicSession", e.target.value)}
            searchable={false}
            size={3}
          >
            {sessions.map((s) => (
              <Option key={s} value={s} label={s} />
            ))}
          </SelectField>
          <SelectField
            label="Role"
            id="sb_role"
            value={filters.role}
            onChange={(e) => set("role", e.target.value)}
            searchable={false}
            size={3}
          >
            {roleOptions.map((r) => (
              <Option key={r} value={r} label={r} />
            ))}
          </SelectField>
        </DashGrid>
      </div>

      {/* Error banner */}
      {!!error && (
        <div className="mt-4 p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-2 text-red-700 text-sm font-semibold">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="mt-6 min-h-[320px] flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-bold text-slate-400">
            Loading staff data…
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {[
                {
                  title: "Total Staff",
                  value: fmt(totalStaff),
                  icon: <Users size={22} />,
                  accentColor: "#38bdf8",
                  size: 6,
                },
                {
                  title: "Active Staff",
                  value: fmt(activeStaff),
                  icon: <UserCheck size={22} />,
                  accentColor: "#22c55e",
                  size: 6,
                },
                {
                  title: "Average Attendance",
                  value: avgAttendance,
                  icon: <CalendarDays size={22} />,
                  accentColor: "#38bdf8",
                  size: 4,
                },
                {
                  title: "Average Review Score",
                  value: avgReviewScore,
                  icon: <TrendingUp size={22} />,
                  accentColor: "#22c55e",
                  size: 4,
                },
                {
                  title: "Open Resignations",
                  value: fmt(openResigns),
                  icon: <TrendingDown size={22} />,
                  accentColor: "#ef4444",
                  size: 4,
                },
              ].map((c) => (
                <EnhancedDashCard
                  key={c.title}
                  title={c.title}
                  value={c.value}
                  icon={c.icon}
                  accentColor={c.accentColor}
                  size={c.size}
                />
              ))}
            </DashGrid>
          </div>

          {/* Charts */}
          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {hasData ? (
                <>
                  {/* Debug logs — remove before production */}
                  {(() => {
                    const organizationSchools =
                      benchmarkingData?.branches || [];
                    const chartData = branchMetrics.map((b) => ({
                      name: b.branch,
                      Attendance: b.attendance,
                      Performance: b.performance,
                      Resignation: b.resignationRate,
                      Retention: b.retention,
                      __placeholder__: 0.001, // sentinel: prevents ChartCard all-zero isEmpty guard
                    }));
                    console.log("Organization Schools", organizationSchools);
                    console.log("Branch Performance API", branchMetrics);
                    console.log("Final Chart Data", chartData);
                    return null;
                  })()}
                  <GColumnChart
                    title="Branch-wise Staff Performance"
                    subtitle="Attendance, performance score, resignation rate, and retention per branch."
                    data={branchMetrics.map((b) => ({
                      name: b.branch,
                      Attendance: b.attendance,
                      Performance: b.performance,
                      Resignation: b.resignationRate,
                      Retention: b.retention,
                      __placeholder__: 0.001, // sentinel: bypasses ChartCard isEmpty for all-zero branches
                    }))}
                    bars={[
                      {
                        key: "Attendance",
                        label: "Attendance %",
                        color: "#38bdf8",
                      },
                      {
                        key: "Performance",
                        label: "Performance Score",
                        color: "#8b5cf6",
                      },
                      {
                        key: "Resignation",
                        label: "Resignation Risk %",
                        color: "#D66B5F",
                      },
                      {
                        key: "Retention",
                        label: "Retention %",
                        color: "#5B9A6A",
                      },
                    ]}
                    size={12}
                    height={300}
                  />
                  <GLineChart
                    title="Retention Trends"
                    subtitle="Monthly staff retention movement by branch."
                    data={retentionTrends}
                    lines={trendLines}
                    size={6}
                    height={260}
                  />
                  <GLineChart
                    title="Resignation Risk Trends"
                    subtitle="Resignation risk proxy across branches over the selected period."
                    data={resignationRiskTrends}
                    lines={trendLines}
                    size={6}
                    height={260}
                  />
                </>
              ) : (
                <>
                  {/* Branch-wise Staff Performance - Empty State */}
                  <div className="col-span-12 bg-white border border-[#E7E2DB] rounded-[28px] p-6 shadow-sm flex flex-col justify-center items-center min-h-[300px]">
                    <p className="text-sm font-black text-slate-800">
                      Branch-wise Staff Performance
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1 mb-6 text-center">
                      Attendance, performance score, resignation rate, and
                      retention per branch.
                    </p>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <BriefcaseBusiness className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-400">
                        No Branch-wise Performance Data Available
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Staff performance scores and branch-wise metrics are not
                        currently tracked.
                      </p>
                    </div>
                  </div>

                  {/* Retention Trends - Empty State */}
                  <div className="col-span-12 lg:col-span-6 bg-white border border-[#E7E2DB] rounded-[28px] p-6 shadow-sm flex flex-col justify-center items-center min-h-[280px]">
                    <p className="text-sm font-black text-slate-800">
                      Retention Trends
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1 mb-6 text-center">
                      Monthly staff retention movement by branch.
                    </p>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-400">
                        No Historical Retention Trend Available
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Monthly retention rates are not tracked in the current
                        analytics scope.
                      </p>
                    </div>
                  </div>

                  {/* Resignation Risk Trends - Empty State */}
                  <div className="col-span-12 lg:col-span-6 bg-white border border-[#E7E2DB] rounded-[28px] p-6 shadow-sm flex flex-col justify-center items-center min-h-[280px]">
                    <p className="text-sm font-black text-slate-800">
                      Resignation Risk Trends
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1 mb-6 text-center">
                      Resignation risk proxy across branches over the selected
                      period.
                    </p>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <TrendingDown className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-400">
                        No Resignation Risk Trend Available
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Workforce resignation risk indicators are not currently
                        tracked.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </DashGrid>
          </div>

          {/* DataTables */}
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <DataTable
              title="Teacher Performance"
              columns={[
                { key: "rank", label: "#" },
                { key: "name", label: "Name" },
                { key: "branch", label: "Branch" },
                { key: "subject", label: "Subject" },
                { key: "score", label: "Score" },
                { key: "attendance", label: "Attendance" },
                { key: "grade", label: "Grade" },
                { key: "trend", label: "Trend" },
              ]}
              rows={teacherRows}
              pageSize={5}
              searchable
              exportable
              exportFileName="teacher_performance"
              defaultSortKey="rank"
              size={12}
              filters={[
                {
                  title: "Branch",
                  key: "branch",
                  type: "select",
                  options: benchmarkingData?.branches || [],
                },
                {
                  title: "Subject",
                  key: "subject",
                  type: "select",
                  options: [...new Set(teacherRows.map((r) => r.subject))],
                },
                {
                  title: "Grade",
                  key: "grade",
                  type: "toggle",
                  options: ["A+", "A", "B", "C", "Watch"],
                },
                {
                  title: "Trend",
                  key: "trend",
                  type: "toggle",
                  options: ["Improving", "Stable", "Declining"],
                },
              ]}
            />
            <DataTable
              title="Underperformance Watch List"
              columns={[
                { key: "name", label: "Staff" },
                { key: "branch", label: "Branch" },
                { key: "role", label: "Role" },
                { key: "issue", label: "Issue" },
                { key: "score", label: "Score" },
                { key: "trend", label: "Trend" },
                { key: "action", label: "Action" },
              ]}
              rows={underperformRows}
              pageSize={5}
              searchable
              exportable
              exportFileName="underperformance_watch"
              size={12}
              filters={[
                {
                  title: "Issue",
                  key: "issue",
                  type: "toggle",
                  options: [
                    "Low Attendance",
                    "High Complaints",
                    "Resignation Risk",
                    "Low Performance",
                  ],
                },
                {
                  title: "Trend",
                  key: "trend",
                  type: "toggle",
                  options: ["Improving", "Stable", "Declining"],
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Benchmarking;
