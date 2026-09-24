import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  Share2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Eye,
} from "lucide-react";
import {
  Button,
  DashGrid,
  Grid,
  DataTable,
  EnhancedDashCard,
  GColumnChart,
  GLineChart,
  Heading,
  Option,
  SelectField,
  PanelModal,
  ModalGrid,
  ModalData,
} from "../../../components/shared/Common_Components.jsx";
import { fetchPrincipalStaffPerformance } from "../../../services/api/principalApi";

const FILTER_KEY = "principal_staff_performance_filters";
const sessions = ["2026-27", "2025-26", "2024-25", "2023-24"];
const roleOptions = ["All", "Teacher", "Class Teacher", "Subject Teacher", "Admin Department", "Accountant"];

const monthOptions = [
  { value: "January", label: "January" }, { value: "February", label: "February" },
  { value: "March", label: "March" }, { value: "April", label: "April" },
  { value: "May", label: "May" }, { value: "June", label: "June" },
  { value: "July", label: "July" }, { value: "August", label: "August" },
  { value: "September", label: "September" }, { value: "October", label: "October" },
  { value: "November", label: "November" }, { value: "December", label: "December" },
];

const fmt = (v) => new Intl.NumberFormat("en-IN").format(v || 0);

const loadFilters = () => {
  try { const s = localStorage.getItem(FILTER_KEY); return s ? JSON.parse(s) : DEFAULT_FILTERS; }
  catch { return DEFAULT_FILTERS; }
};

const DEFAULT_FILTERS = { dateFrom: "April", dateTo: "September", academicSession: "2026-27", role: "All" };

const StaffPerformanceReport = () => {
  const [filters, setFilters] = useState(loadFilters);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError("");
        const queryParams = `?dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}&academicSession=${filters.academicSession}&role=${filters.role}`;
        const res = await fetchPrincipalStaffPerformance(queryParams);
        if (res.success) {
          setPerformanceData(res.data);
        } else {
          setError(res.message || "Failed to load staff performance data");
        }
      } catch (e) {
        setError(e.message || "Failed to load staff performance data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.dateFrom, filters.dateTo, filters.academicSession, filters.role]);

  useEffect(() => { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); }, [filters]);

  const staffRows = useMemo(() => performanceData?.staffRows || [], [performanceData]);

  const visible = useMemo(() =>
    staffRows.filter((s) => (filters.role === "All" || s.role === filters.role)),
    [staffRows, filters.role],
  );

  // Department aggregates
  const departmentMetrics = useMemo(() => {
    const map = new Map();
    const allDepartments = performanceData?.departments || ["Teaching", "Administration", "Accountant", "Support"];
    allDepartments.forEach((d) => map.set(d, []));

    visible.forEach((s) => {
      if (!map.has(s.department)) map.set(s.department, []);
      map.get(s.department).push(s);
    });
    
    return Array.from(map.entries()).map(([department, rows]) => {
      const count = rows.length;
      const avg = (arr, key) => arr.length ? arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length : 0;
      return {
        department,
        staffCount: count,
        attendance: Number(avg(rows, "attendance").toFixed(1)),
        performance: Number(avg(rows, "score").toFixed(1)),
        resignationRate: Number(avg(rows, "resignationRisk").toFixed(1)),
        retention: Number(avg(rows, "retention").toFixed(1)),
      };
    });
  }, [visible, performanceData]);

  const departmentLines = useMemo(() =>
    departmentMetrics.map((d, i) => ({
      key: d.department, label: d.department,
      color: ["#223F74", "#5B9A6A", "#E0A04B"][i % 3], 
    })),
    [departmentMetrics]
  );

  const totalStaff = visible.length;
  const activeStaff = visible.filter((s) => s.active).length;
  const openResigns = performanceData?.openResigns || 0;
  
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

  const SENTINEL_KEY = "__placeholder__";

  const retentionTrends = useMemo(() => {
    const apiData = performanceData?.retentionTrends;
    if (apiData && apiData.length > 0) return apiData.map(pt => ({ ...pt, [SENTINEL_KEY]: 0.001 }));
    return [];
  }, [performanceData]);

  const resignationRiskTrends = useMemo(() => {
    const apiData = performanceData?.resignationRiskTrends;
    if (apiData && apiData.length > 0) return apiData.map(pt => ({ ...pt, [SENTINEL_KEY]: 0.001 }));
    return [];
  }, [performanceData]);

  const trendLines = useMemo(() => {
    const COLORS = ["#223F74", "#5B9A6A", "#E0A04B"];
    const sample = retentionTrends[0] || resignationRiskTrends[0] || {};
    return Object.keys(sample)
      .filter(k => k !== "name" && k !== SENTINEL_KEY)
      .map((k, i) => ({ key: k, label: k, color: COLORS[i % COLORS.length] }));
  }, [retentionTrends, resignationRiskTrends]);

  const staffPerformanceRows = useMemo(() =>
    visible
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 15)
      .map((t, i) => ({
        rank: i + 1,
        name: t.name,
        role: t.role,
        department: t.department || "N/A",
        score: t.score != null ? `${t.score.toFixed(1)}%` : "N/A",
        attendance: t.attendance != null ? `${t.attendance.toFixed(1)}%` : "N/A",
        engagement: t.classEngagement != null ? `${t.classEngagement.toFixed(1)}%` : "N/A",
        studentImpact: t.studentImpact != null ? `${t.studentImpact.toFixed(1)}%` : "N/A",
        taskCompletion: t.taskCompletion != null ? `${t.taskCompletion.toFixed(1)}%` : "N/A",
        grade: t.grade || "N/A",
        trend: t.trend || "N/A",
        _original: t,
      })),
    [visible],
  );

  const underperformRows = useMemo(() =>
    visible
      .filter((s) => (s.score != null && s.score < 74) || (s.attendance != null && s.attendance < 76) || (s.complaintRatio != null && s.complaintRatio > 1.8) || (s.resignationRisk != null && s.resignationRisk > 24))
      .slice(0, 15)
      .map((s) => ({
        name: s.name,
        role: s.role,
        department: s.department,
        issue: s.attendance != null && s.attendance < 76 ? "Low Attendance"
          : s.complaintRatio != null && s.complaintRatio > 1.8 ? "High Complaints"
            : s.resignationRisk != null && s.resignationRisk > 24 ? "Resignation Risk"
              : s.score != null && s.score < 74 ? "Low Performance"
                : "N/A",
        score: s.score != null ? `${s.score.toFixed(1)}%` : "N/A",
        trend: s.trend || "N/A",
        action: s.attendance != null && s.attendance < 76 ? "Attendance counselling"
          : s.complaintRatio != null && s.complaintRatio > 1.8 ? "Complaint resolution coaching"
            : s.resignationRisk != null && s.resignationRisk > 24 ? "Retention check-in"
              : "30-day improvement plan",
        _original: s,
      })),
    [visible],
  );

  const handleViewStaff = (row) => {
    setSelectedStaff(row._original);
    setShowStaffModal(true);
  };

  const shareReport = async () => {
    const text = `Staff Performance · ${totalStaff} staff · avg attendance ${avgAttendance} · avg retention ${avgRetention}`;
    if (navigator.share) { await navigator.share({ title: "Staff Performance", text }); return; }
    await navigator.clipboard?.writeText(text);
  };

  const hasData = (performanceData?.departments || []).length > 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-12 overflow-x-hidden">
      <Heading 
        primaryText="Staff" 
        secondaryText="Performance" 
        size={12} 
        action={<Button text="Share" variant="secondary" icon={<Share2 size={14} />} onClick={shareReport} size={3} />}
      />

      {!!error && (
        <div className="mt-4 p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-2 text-red-700 text-sm font-semibold">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 min-h-[320px] flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-bold text-slate-400">Loading staff data…</p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {[
                { title: "Total Staff", value: fmt(totalStaff), icon: <Users size={22} />, accentColor: "#38bdf8", size: 3 },
                { title: "Active Staff", value: fmt(activeStaff), icon: <UserCheck size={22} />, accentColor: "#22c55e", size: 3 },
                { title: "Average Attendance", value: avgAttendance, icon: <CalendarDays size={22} />, accentColor: "#38bdf8", size: 3 },
                { title: "Average Review Score", value: avgReviewScore, icon: <TrendingUp size={22} />, accentColor: "#22c55e", size: 3 },
              ].map((c) => (
                <EnhancedDashCard key={c.title} title={c.title} value={c.value} icon={c.icon} accentColor={c.accentColor} size={c.size} />
              ))}
            </DashGrid>
          </div>

          {/* Global Filters */}
          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-5 mt-6 mb-6 z-30 relative">
            <Grid cols={12} gap={4}>
              <div className="col-span-12 md:col-span-3">
                <SelectField label="Month From" id="sb_from" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} searchable={false} size={12}>
                  {monthOptions.map((m) => <Option key={m.value} value={m.value} label={m.label} />)}
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-3">
                <SelectField label="Month To" id="sb_to" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} searchable={false} size={12}>
                  {monthOptions.map((m) => <Option key={m.value} value={m.value} label={m.label} />)}
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-3">
                <SelectField label="Academic Session" id="sb_session" value={filters.academicSession} onChange={(e) => set("academicSession", e.target.value)} searchable={false} size={12}>
                  {sessions.map((s) => <Option key={s} value={s} label={s} />)}
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-3">
                <SelectField label="Role" id="sb_role" value={filters.role} onChange={(e) => set("role", e.target.value)} searchable={false} size={12}>
                  {roleOptions.map((r) => <Option key={r} value={r} label={r} />)}
                </SelectField>
              </div>
            </Grid>
          </div>

          <div className="mt-6">
            <DashGrid cols={12} gap={4}>
              {hasData ? (
                <>
                  <GColumnChart
                    title="Department-wise Staff Performance"
                    subtitle="Attendance, performance score, resignation rate, and retention per department."
                    data={departmentMetrics.map((d) => ({
                      name: d.department,
                      Attendance: d.attendance,
                      Performance: d.performance,
                      Resignation: d.resignationRate,
                      Retention: d.retention,
                      __placeholder__: 0.001,
                    }))}
                    bars={[
                      { key: "Attendance", label: "Attendance %", color: "#38bdf8" },
                      { key: "Performance", label: "Performance Score", color: "#8b5cf6" },
                      { key: "Resignation", label: "Resignation Risk %", color: "#D66B5F" },
                      { key: "Retention", label: "Retention %", color: "#5B9A6A" },
                    ]}
                    size={12} height={300}
                  />
                  <GLineChart
                    title="Retention Trends"
                    subtitle="Monthly staff retention movement by department."
                    data={retentionTrends}
                    lines={trendLines}
                    size={6} height={260}
                  />
                  <GLineChart
                    title="Resignation Risk Trends"
                    subtitle="Resignation risk proxy across departments over the selected period."
                    data={resignationRiskTrends}
                    lines={trendLines}
                    size={6} height={260}
                  />
                </>
              ) : (
                <div className="col-span-12 bg-white border border-[#E7E2DB] rounded-[28px] p-6 shadow-sm flex flex-col justify-center items-center min-h-[300px]">
                  <p className="text-sm font-black text-slate-800">Department Performance</p>
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BriefcaseBusiness className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-400">No Performance Data Available</p>
                  </div>
                </div>
              )}
            </DashGrid>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <DataTable
              title="Overall Staff Performance"
              columns={[
                { key: "rank", label: "#" },
                { key: "name", label: "Name" },
                { key: "role", label: "Role" },
                { key: "department", label: "Department" },
                { key: "score", label: "Score" },
                { key: "attendance", label: "Attendance" },
                { key: "grade", label: "Grade" },
                { key: "trend", label: "Trend" },
              ]}
              rows={staffPerformanceRows}
              actions={[{ icon: <Eye size={18} />, tooltip: "View Staff Details", variant: "ghost", onClick: handleViewStaff }]}
              pageSize={5}
              searchable
              exportable
              exportFileName="overall_staff_performance"
              defaultSortKey="rank"
              size={12}
            />
            <DataTable
              title="Underperformance Watch List"
              columns={[
                { key: "name", label: "Staff" },
                { key: "department", label: "Department" },
                { key: "role", label: "Role" },
                { key: "issue", label: "Issue" },
                { key: "score", label: "Score" },
                { key: "action", label: "Action" },
              ]}
              rows={underperformRows}
              actions={[{ icon: <Eye size={18} />, tooltip: "View Staff Details", variant: "ghost", onClick: handleViewStaff }]}
              pageSize={5}
              searchable
              exportable
              exportFileName="underperformance_watch"
              size={12}
            />
          </div>

          <PanelModal
            id="staff-details-modal"
            title="Staff Performance Details"
            isVisible={showStaffModal}
            onClose={() => setShowStaffModal(false)}
            size="md"
          >
            {selectedStaff && (
              <ModalGrid cols={2}>
                <ModalData label="Name" value={selectedStaff.name || "N/A"} />
                <ModalData label="Role" value={selectedStaff.role || "N/A"} />
                <ModalData label="Department" value={selectedStaff.department || "N/A"} />
                <ModalData label="Performance Score" value={selectedStaff.score != null ? `${selectedStaff.score.toFixed(1)}%` : "N/A"} />
                <ModalData label="Attendance" value={selectedStaff.attendance != null ? `${selectedStaff.attendance.toFixed(1)}%` : "N/A"} />
                <ModalData label="Class Engagement" value={selectedStaff.classEngagement != null ? `${selectedStaff.classEngagement.toFixed(1)}%` : "N/A"} />
                <ModalData label="Student Impact" value={selectedStaff.studentImpact != null ? `${selectedStaff.studentImpact.toFixed(1)}%` : "N/A"} />
                <ModalData label="Task Completion" value={selectedStaff.taskCompletion != null ? `${selectedStaff.taskCompletion.toFixed(1)}%` : "N/A"} />
                <ModalData label="Complaint Ratio" value={selectedStaff.complaintRatio != null ? selectedStaff.complaintRatio.toFixed(1) : "N/A"} />
                <ModalData label="Resignation Risk" value={selectedStaff.resignationRisk != null ? `${selectedStaff.resignationRisk.toFixed(1)}%` : "N/A"} />
                <ModalData label="Grade" value={selectedStaff.grade || "N/A"} />
                <ModalData label="Trend" value={selectedStaff.trend || "N/A"} />
              </ModalGrid>
            )}
          </PanelModal>
        </>
      )}
    </div>
  );
};

export default StaffPerformanceReport;