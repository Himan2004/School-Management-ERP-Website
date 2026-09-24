import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  Download,
  FileSpreadsheet,
  GitBranch,
  GraduationCap,
  IndianRupee,
  Loader2,
  Share2,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";
import { getOrganizationClasses } from "../../../services/api/organizationApi.js";
import {
  Button,
  DataTable,
  DashGrid,
  EnhancedDashCard,
  GColumnChart,
  GLineChart,
  Heading,
  Option,
  Select,
  SelectField,
} from "../../../components/shared/Common_Components.jsx";
import {
  getAllBranchesAPI,
  compareBranchesAPI,
} from "../../../services/branchCompressionApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_STORAGE_KEY = "superadmin_branch_comparison_filters";
const sessions = ["2026-27", "2025-26", "2024-25", "2023-24"];

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

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v) => new Intl.NumberFormat("en-IN").format(v || 0);
const fmtCur = (a) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(a || 0);
const fmtCompact = (a) => {
  const v = Number(a) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return fmtCur(v);
};
const avg = (rows, key) =>
  rows.length
    ? rows.reduce((s, r) => s + (Number(r[key]) || 0), 0) / rows.length
    : 0;
const clamp = (v, lo = 0, hi = 100) =>
  Math.min(hi, Math.max(lo, Number(v) || 0));

// ─── Branch ID / Name helpers ─────────────────────────────────────────────────

const getId = (b, i) => String(b?.id || b?._id || b?.schoolId || `branch-${i}`);
const getName = (b, i) =>
  b?.branchName || b?.schoolName || b?.name || b?.branch || `Branch ${i + 1}`;

// ─── Filter persistence ───────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  dateFrom: "April",
  dateTo: "September",
  academicSession: "2025-26",
  branchA: "",
  branchB: "",
  isClassWise: false,
  selectedClass: "1",
};

const loadFilters = () => {
  try {
    const s = localStorage.getItem(FILTER_STORAGE_KEY);
    return s ? JSON.parse(s) : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
};

// ─── Data derivation ──────────────────────────────────────────────────────────

const deriveRows = (branches, filters) =>
  branches.map((b, i) => {
    const id = getId(b, i);
    const name = getName(b, i);
    const students = Number(
      b.students || b.studentStrength || b.totalStudents || 0,
    );
    const staff = Number(b.staff || b.totalStaff || b.teachers || 0);
    const attendance = clamp(b.attendance ?? b.attendanceRate ?? 0);
    const passPercent = clamp(b.passPercent ?? b.academicScore ?? 0);
    const feeCollection = clamp(b.feeCollection ?? b.collectionRate ?? 0);
    const score = Number(b.score ?? 0);
    return {
      id,
      branchName: name,
      students,
      staff,
      attendance,
      passPercent,
      feeCollection,
      score,
      status: b.status || "inactive",
    };
  });

// ─── Snapshot table columns ───────────────────────────────────────────────────

const makeDiffCell = (diff, invertDiff, rawValue) => {
  const d = Number(diff);
  const better = invertDiff ? d < 0 : d > 0;
  if (d === 0)
    return <span className="text-xs font-black text-slate-400">—</span>;
  const label = `${d > 0 ? "+" : ""}${rawValue > 1000 ? fmt(Math.round(d)) : Number(d).toFixed(1)}`;
  return (
    <span
      className={`text-xs font-black px-2.5 py-1 rounded-full ${better ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}
    >
      {label}
    </span>
  );
};

const snapshotColumns = (aName, bName) => [
  { key: "metric", label: "Metric" },
  { key: "branchA", label: aName, align: "center" },
  { key: "branchB", label: bName, align: "center" },
  {
    key: "diff",
    label: "Difference",
    align: "center",
    render: (_, row) => makeDiffCell(row.rawDiff, row.invertDiff, row.rawA),
  },
];

// ─── BranchComparisons ────────────────────────────────────────────────────────

const BranchComparisons = () => {
  // 🔥 OPTIMIZED: Reads from localStorage only once on mount.
  const organizationId = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("organizationId");
    }
    return null;
  }, []);

  const [branchData, setBranchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(loadFilters);
  const [classList, setClassList] = useState([]);

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  // 1. Fetch Classes for the organization
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await getOrganizationClasses({ organizationId });

        const classesData = res?.data?.data || res?.data || [];
        setClassList(classesData);

        if (classesData.length > 0) {
          setFilters((prev) => {
            if (prev.selectedClass === "1") {
              return { ...prev, selectedClass: classesData[0]._id };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };

    if (organizationId) {
      loadClasses();
    }
  }, [organizationId]);

  // 2. Fetch branches data whenever filter options change
  useEffect(() => {
    setLoading(true);
    getAllBranchesAPI({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      academicSession: filters.academicSession,
      isClassWise: filters.isClassWise,
      selectedClass: filters.selectedClass,
    })
      .then((res) => {
        setBranchData(res?.data || []);
      })
      .catch((err) => console.error("branches fetch failed:", err))
      .finally(() => setLoading(false));
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.academicSession,
    filters.isClassWise,
    filters.selectedClass,
  ]);

  // Persist filters
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const rows = useMemo(
    () => deriveRows(branchData, filters),
    [branchData, filters.isClassWise, filters.selectedClass],
  );

  const branchA = useMemo(
    () => rows.find((b) => b.id === filters.branchA) || rows[0] || null,
    [rows, filters.branchA],
  );
  const branchB = useMemo(
    () => rows.find((b) => b.id === filters.branchB) || rows[1] || null,
    [rows, filters.branchB],
  );

  const aName = branchA?.branchName || "Branch A";
  const bName = branchB?.branchName || "Branch B";

  const kpiRows = branchA && branchB ? [branchA, branchB] : rows;
  const totalStudents = kpiRows.reduce((s, r) => s + r.students, 0);
  const totalStaff = kpiRows.reduce((s, r) => s + r.staff, 0);

  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Fetch branch comparisons dynamically from backend API
  useEffect(() => {
    if (!branchA?.id || !branchB?.id) {
      setComparison(null);
      return;
    }

    setComparisonLoading(true);
    compareBranchesAPI(branchA.id, branchB.id, {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      academicSession: filters.academicSession,
      isClassWise: filters.isClassWise,
      selectedClass: filters.selectedClass,
    })
      .then((res) => {
        setComparison(res?.data || null);
      })
      .catch((err) => console.error("Comparison fetch failed:", err))
      .finally(() => setComparisonLoading(false));
  }, [
    branchA?.id,
    branchB?.id,
    filters.dateFrom,
    filters.dateTo,
    filters.academicSession,
    filters.isClassWise,
    filters.selectedClass,
  ]);

  // Snapshot table rows
  const snapshotRows = useMemo(() => {
    const left = comparison?.left || branchA;
    const right = comparison?.right || branchB;
    if (!left || !right) return [];
    return [
      {
        metric: "Students",
        branchA: fmt(left.students),
        branchB: fmt(right.students),
        rawDiff: left.students - right.students,
        rawA: left.students,
        invertDiff: false,
      },
      {
        metric: "Staff",
        branchA: fmt(left.staff),
        branchB: fmt(right.staff),
        rawDiff: left.staff - right.staff,
        rawA: left.staff,
        invertDiff: false,
      },
      {
        metric: "Attendance",
        branchA: `${left.attendance.toFixed(1)}%`,
        branchB: `${right.attendance.toFixed(1)}%`,
        rawDiff: left.attendance - right.attendance,
        rawA: left.attendance,
        invertDiff: false,
      },
      {
        metric: "Pass Percentage",
        branchA: `${left.passPercent.toFixed(1)}%`,
        branchB: `${right.passPercent.toFixed(1)}%`,
        rawDiff: left.passPercent - right.passPercent,
        rawA: left.passPercent,
        invertDiff: false,
      },
      {
        metric: "Fee Collection",
        branchA: `${left.feeCollection.toFixed(1)}%`,
        branchB: `${right.feeCollection.toFixed(1)}%`,
        rawDiff: left.feeCollection - right.feeCollection,
        rawA: left.feeCollection,
        invertDiff: false,
      },
    ];
  }, [comparison, branchA, branchB]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!rows.length) return;
    const headers = [
      "Branch",
      "Students",
      "Staff",
      "Attendance %",
      "Pass Percentage %",
      "Fee Collection %",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.branchName}"`,
          r.students,
          r.staff,
          r.attendance.toFixed(1),
          r.passPercent.toFixed(1),
          r.feeCollection.toFixed(1),
        ].join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branch_comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareReport = async () => {
    const text = `Branch Comparisons · ${rows.length} branches · avg attendance ${avg(rows, "attendance").toFixed(1)}% · total students ${totalStudents}`;
    if (navigator.share) {
      await navigator.share({ title: "Comparisons", text });
      return;
    }
    await navigator.clipboard?.writeText(text);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-12 overflow-x-hidden">
      <Heading primaryText="Comparisons" secondaryText="Analytics" size={12} />

      <div className="mt-6 flex flex-col gap-4">
        <DashGrid cols={12} gap={4}>
          <SelectField
            label="Month From"
            id="cmp_from"
            value={filters.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
            searchable={false}
            size={2}
          >
            {monthOptions.map((m) => (
              <Option key={m.value} value={m.value} label={m.label} />
            ))}
          </SelectField>
          <SelectField
            label="Month To"
            id="cmp_to"
            value={filters.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
            searchable={false}
            size={2}
          >
            {monthOptions.map((m) => (
              <Option key={m.value} value={m.value} label={m.label} />
            ))}
          </SelectField>
          <SelectField
            label="Academic Session"
            id="cmp_session"
            value={filters.academicSession}
            onChange={(e) => set("academicSession", e.target.value)}
            searchable={false}
            size={2}
          >
            {sessions.map((s) => (
              <Option key={s} value={s} label={s} />
            ))}
          </SelectField>
          <SelectField
            label="Branch A"
            id="cmp_a"
            value={filters.branchA}
            onChange={(e) => set("branchA", e.target.value)}
            searchable={false}
            size={3}
          >
            <Option value="" label="Select Branch A…" />
            {rows.map((b) => (
              <Option key={b.id} value={b.id} label={b.branchName} />
            ))}
          </SelectField>
          <SelectField
            label="Branch B"
            id="cmp_b"
            value={filters.branchB}
            onChange={(e) => set("branchB", e.target.value)}
            searchable={false}
            size={3}
          >
            <Option value="" label="Select Branch B…" />
            {rows.map((b) => (
              <Option key={b.id} value={b.id} label={b.branchName} />
            ))}
          </SelectField>
        </DashGrid>

        {/* Class-Wise View Toggle */}
        <div className="flex items-center gap-4 w-fit">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={filters.isClassWise}
                onChange={(e) => set("isClassWise", e.target.checked)}
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors duration-200 ${filters.isClassWise ? "bg-[#223F74]" : "bg-slate-300"}`}
              ></div>
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${filters.isClassWise ? "translate-x-4" : ""}`}
              ></div>
            </div>
            <span className="text-sm font-bold text-slate-700">
              Class-Wise View
            </span>
          </label>

          {/* Dynamic Class Options mapped here */}
          {filters.isClassWise && (
            <div className="w-32">
              <Select
                id="cmp_class"
                value={filters.selectedClass}
                onChange={(e) => set("selectedClass", e.target.value)}
                searchable={false}
              >
                {classList.length > 0 ? (
                  classList.map((c) => (
                    <Option
                      key={c._id}
                      value={c._id}
                      label={c.className || c.name || `Class ${c}`}
                    />
                  ))
                ) : (
                  <Option value="" label="Loading..." />
                )}
              </Select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 min-h-[320px] flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-bold text-slate-400">
            Loading branch data…
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {[
                {
                  title: "Total Branches",
                  value: String(rows.length),
                  icon: <GitBranch size={22} />,
                  accentColor: "#223F74",
                },
                {
                  title: "Total Students",
                  value: fmt(totalStudents),
                  icon: <Users size={22} />,
                  accentColor: "#7A8FC6",
                },
                {
                  title: "Total Staff",
                  value: fmt(totalStaff),
                  icon: <BriefcaseBusiness size={22} />,
                  accentColor: "#7A8FC6",
                },
                {
                  title: "Avg Attendance",
                  value: `${avg(kpiRows, "attendance").toFixed(1)}%`,
                  icon: <Activity size={22} />,
                  accentColor: "#38bdf8",
                },
                {
                  title: "Avg Pass Percentage",
                  value: `${avg(kpiRows, "passPercent").toFixed(1)}%`,
                  icon: <GraduationCap size={22} />,
                  accentColor: "#8b5cf6",
                },
                {
                  title: "Avg Fee Collection Rate",
                  value: `${avg(kpiRows, "feeCollection").toFixed(1)}%`,
                  icon: <IndianRupee size={22} />,
                  accentColor: "#E0A04B",
                },
              ].map((c) => (
                <EnhancedDashCard
                  key={c.title}
                  title={c.title}
                  value={c.value}
                  icon={c.icon}
                  accentColor={c.accentColor}
                  size={4}
                />
              ))}
            </DashGrid>
          </div>

          <div className="mt-6">
            <DataTable
              title={
                branchA && branchB
                  ? `${aName} vs ${bName}${filters.isClassWise ? ` (Class ${filters.selectedClass})` : ""}`
                  : "Branch A vs Branch B Snapshot"
              }
              columns={snapshotColumns(aName, bName)}
              rows={snapshotRows}
              searchable={false}
              hidePagination
              hideRecordSummary
              exportable
              exportFileName="branch_comparison_snapshot"
              size={12}
              pageSize={10}
            />
          </div>

          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {(() => {
                const COLORS = [
                  "#223F74",
                  "#5B9A6A",
                  "#E0A04B",
                  "#D66B5F",
                  "#8B5CF6",
                  "#EC4899",
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
                const fromIdx = MONTH_ORDER.indexOf(filters.dateFrom);
                const toIdx = MONTH_ORDER.indexOf(filters.dateTo);
                const sessionStart =
                  parseInt(
                    (filters.academicSession || "2025-26").split("-")[0],
                  ) || 2025;

                const monthLabels = [];
                let idx = fromIdx < 0 ? 3 : fromIdx;
                const end = toIdx < 0 ? 8 : toIdx;
                for (let steps = 0; steps <= 11; steps++) {
                  const mIdx = idx % 12;
                  const yr = mIdx >= 3 ? sessionStart : sessionStart + 1;
                  monthLabels.push(
                    `${MONTH_SHORT[mIdx]} ${String(yr).slice(-2)}`,
                  );
                  if (mIdx === end) break;
                  idx++;
                }

                const displayRows =
                  branchA && branchB ? [branchA, branchB] : rows.slice(0, 4);
                const attLines = displayRows.map((b, i) => ({
                  key: b.branchName,
                  label: b.branchName,
                  color: COLORS[i % COLORS.length],
                }));
                const attData = monthLabels.map((name) => {
                  const pt = { name, __placeholder__: 0.001 };
                  displayRows.forEach((b) => {
                    pt[b.branchName] = b.attendance ?? 0;
                  });
                  return pt;
                });

                return (
                  <GLineChart
                    title="Attendance Comparison"
                    subtitle="Monthly attendance trends across selected branches."
                    data={attData}
                    lines={attLines}
                    size={6}
                    height={280}
                  />
                );
              })()}

              <GColumnChart
                title="Academic & Fee Comparison"
                subtitle="Pass % and Fee Collection % across branches."
                data={(branchA && branchB ? [branchA, branchB] : rows).map(
                  (b) => ({
                    name: b.branchName,
                    "Pass %": Number(b.passPercent || 0),
                    "Fee Collection %": Number(b.feeCollection || 0),
                    __placeholder__: 0.001,
                  }),
                )}
                bars={[
                  { key: "Pass %", label: "Pass %", color: "#223F74" },
                  {
                    key: "Fee Collection %",
                    label: "Fee Collection %",
                    color: "#E0A04B",
                  },
                ]}
                size={6}
                height={280}
              />

              <GColumnChart
                title="Students & Staff Comparison"
                subtitle="Student strength and staff count across selected branches."
                data={(branchA && branchB ? [branchA, branchB] : rows).map(
                  (b) => ({
                    name: b.branchName,
                    Students: Number(b.students || 0),
                    Staff: Number(b.staff || 0),
                    __placeholder__: 0.001,
                  }),
                )}
                bars={[
                  { key: "Students", label: "Students", color: "#7A8FC6" },
                  { key: "Staff", label: "Staff", color: "#5B9A6A" },
                ]}
                size={12}
                height={280}
              />
            </DashGrid>
          </div>
        </>
      )}
    </div>
  );
};

export default BranchComparisons;
