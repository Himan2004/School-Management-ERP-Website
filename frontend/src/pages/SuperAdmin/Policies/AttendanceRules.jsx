import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart3,
  Users,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Save,
  CheckCircle,
  X,
  ChevronRight,
  Download,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  List,
  RefreshCcw,
  AlertCircle,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";
import {
  getAcademicConfig,
  updateRules,
} from "../../../services/api/academicConfigApi";
import api from "../../../services/api";

const AttendanceGovernance = () => {
  const authUser = useSelector(selectSuperAdmin);
  const [activeTab, setActiveTab] = useState("rules");
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [configId, setConfigId] = useState("");
  const [rulesPayload, setRulesPayload] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState("");

  // Attendance Rules Form State
  const [minPercentage, setMinPercentage] = useState(75);
  const [lateMarkGracePeriodMinutes, setLateMarkGracePeriodMinutes] = useState(15);
  const [halfDayThresholdHours, setHalfDayThresholdHours] = useState(4);
  const [autoAbsentAfterMinutes, setAutoAbsentAfterMinutes] = useState(60);
  const [lowAttendanceAlertPercent, setLowAttendanceAlertPercent] = useState(80);

  const [minPercentageEnabled, setMinPercentageEnabled] = useState(true);
  const [lateMarkGracePeriodMinutesEnabled, setLateMarkGracePeriodMinutesEnabled] = useState(true);
  const [halfDayThresholdHoursEnabled, setHalfDayThresholdHoursEnabled] = useState(true);
  const [autoAbsentAfterMinutesEnabled, setAutoAbsentAfterMinutesEnabled] = useState(true);
  const [lowAttendanceAlertPercentEnabled, setLowAttendanceAlertPercentEnabled] = useState(true);

  const [branchData, setBranchData] = useState([]);
  const [selectedBranchForModal, setSelectedBranchForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenDetails = (branch) => {
    setSelectedBranchForModal(branch);
    setIsModalOpen(true);
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  // Notifications
  const notify = useCallback((msg, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      4000,
    );
  }, []);

  useEffect(() => {
    const fromStorage = localStorage.getItem("organizationId");
    const fromOrgIdStorage = localStorage.getItem("orgId");
    const fromOrganizationStorage = localStorage.getItem("organization");
    const fromAuth =
      authUser?.organization?._id ||
      authUser?.organization?.organizationId ||
      authUser?.superAdmin?.organization ||
      authUser?.superAdmin?.organizationId ||
      authUser?.organizationId ||
      authUser?._id ||
      "";
    setResolvedOrganizationId(
      fromStorage ||
        fromOrgIdStorage ||
        fromOrganizationStorage ||
        fromAuth ||
        "",
    );
  }, [authUser]);

  const loadRulesFromBackend = useCallback(async () => {
    let orgIdToUse = resolvedOrganizationId;
    if (!orgIdToUse) {
      try {
        const meResponse = await api.get("/auth/super-admin/me");
        const org = meResponse?.data?.data?.organization;
        orgIdToUse = org?.organizationId || org?._id || "";
        if (orgIdToUse) {
          setResolvedOrganizationId(orgIdToUse);
          localStorage.setItem("organizationId", orgIdToUse);
        }
      } catch (e) {
        // no-op; handled below
      }
    }
    if (!orgIdToUse) {
      notify("Organization context is missing. Please login again.", "error");
      return;
    }
    try {
      setIsRefreshing(true);
      const response = await getAcademicConfig(orgIdToUse);
      const config = response?.data;
      if (!config?._id) {
        notify("Could not load attendance policies", "error");
        return;
      }
      setConfigId(config._id);
      setRulesPayload(config.rules);

      const att = config.rules?.attendance || {};
      const enabled = att.enabled || {};

      setMinPercentage(att.minPercentage ?? 75);
      setLateMarkGracePeriodMinutes(att.lateMarkGracePeriodMinutes ?? 15);
      setHalfDayThresholdHours(att.halfDayThresholdHours ?? 4);
      setAutoAbsentAfterMinutes(att.autoAbsentAfterMinutes ?? 60);
      setLowAttendanceAlertPercent(att.lowAttendanceAlertPercent ?? 80);

      setMinPercentageEnabled(enabled.minPercentage !== false);
      setLateMarkGracePeriodMinutesEnabled(enabled.lateMarkGracePeriodMinutes !== false);
      setHalfDayThresholdHoursEnabled(enabled.halfDayThresholdHours !== false);
      setAutoAbsentAfterMinutesEnabled(enabled.autoAbsentAfterMinutes !== false);
      setLowAttendanceAlertPercentEnabled(enabled.lowAttendanceAlertPercent !== false);

      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (error) {
      toast.error(error?.message || "Failed to load attendance rules");
      notify("Failed to load attendance rules from server", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [notify, resolvedOrganizationId]);

  const loadBranchAnalytics = useCallback(async () => {
    try {
      const response = await api.get("/superadmin/analytics/branches/all");
      const branches = (response?.data?.data || []).map((b) => ({
        id: b.id,
        name: b.branchName,
        attendance: Number.isFinite(b.attendance) ? b.attendance : 0,
        trend: b.trend === "down" ? "down" : "up",
        students: Number.isFinite(b.students) ? b.students : 0,
        status:
          b.status === "Underperforming"
            ? "Critical"
            : b.status === "Average"
              ? "Warning"
              : "Healthy",
        head: b.principalName || "Fr. Sebastian",
        principalName: b.principalName || "Fr. Sebastian",
        officialEmail: b.officialEmail || "N/A",
        officialPhone: b.officialPhone || "N/A",
        address: b.address || "N/A",
        branchCode: b.branchCode || "N/A",
      }));
      setBranchData(branches);
    } catch (error) {
      notify("Failed to load behavioral insights from server", "error");
    }
  }, [notify]);
  useEffect(() => {
    loadRulesFromBackend();
  }, [loadRulesFromBackend]);

  useEffect(() => {
    loadBranchAnalytics();
  }, [loadBranchAnalytics]);

  const refreshData = async () => {
    await loadRulesFromBackend();
    await loadBranchAnalytics();
    notify("Attendance rules synchronized successfully");
  };

  const handleSaveRules = async (e) => {
    e.preventDefault();
    if (!configId) {
      toast.error("No active configuration found");
      return;
    }

    const nextRules = {
      ...rulesPayload,
      attendance: {
        minPercentage: Number(minPercentage),
        lateMarkGracePeriodMinutes: Number(lateMarkGracePeriodMinutes),
        halfDayThresholdHours: Number(halfDayThresholdHours),
        autoAbsentAfterMinutes: Number(autoAbsentAfterMinutes),
        lowAttendanceAlertPercent: Number(lowAttendanceAlertPercent),
        enabled: {
          minPercentage: minPercentageEnabled,
          lateMarkGracePeriodMinutes: lateMarkGracePeriodMinutesEnabled,
          halfDayThresholdHours: halfDayThresholdHoursEnabled,
          autoAbsentAfterMinutes: autoAbsentAfterMinutesEnabled,
          lowAttendanceAlertPercent: lowAttendanceAlertPercentEnabled,
        }
      }
    };

    setIsRefreshing(true);
    try {
      await updateRules(configId, nextRules);
      notify("Attendance rules updated successfully");
      await loadRulesFromBackend();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update attendance rules");
      notify("Failed to update attendance rules", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportBranchDataToCSV = () => {
    if (!branchData || branchData.length === 0) {
      notify("No branch data available to export", "error");
      return;
    }
    const headers = [
      "Branch Name",
      "Branch ID",
      "Attendance %",
      "Status",
      "Head",
      "Trend",
      "Students",
    ];
    const csvRows = branchData.map((b) =>
      [
        `"${b.name}"`,
        `"${b.id}"`,
        b.attendance,
        b.status,
        `"${b.head}"`,
        b.trend,
        b.students,
      ].join(","),
    );

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `branch_performance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Branch data exported as CSV successfully");
  };

  const STATUS_COLORS = {
    Healthy: "bg-green-100 text-green-700 border-green-200",
    Warning: "bg-amber-100 text-amber-700 border-amber-200",
    Critical: "bg-red-100 text-red-700 border-red-200",
    Excellent: "bg-blue-100 text-blue-700 border-blue-200",
    Improving: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };

  const analyticsSummary = useMemo(() => {
    const totalBranches = branchData.length;
    const totalStudents = branchData.reduce(
      (sum, b) => sum + (b.students || 0),
      0,
    );
    const avgAttendance =
      totalBranches > 0
        ? branchData.reduce((sum, b) => sum + (b.attendance || 0), 0) /
          totalBranches
        : 0;
    const criticalCount = branchData.filter(
      (b) => (b.attendance || 0) < 75,
    ).length;
    const healthyCount = branchData.filter(
      (b) => (b.attendance || 0) >= 85,
    ).length;
    const complianceRate =
      totalBranches > 0 ? (healthyCount / totalBranches) * 100 : 0;

    return {
      avgAttendance: avgAttendance.toFixed(1),
      totalStudents: totalStudents.toLocaleString(),
      criticalCount: String(criticalCount),
      complianceRate: complianceRate.toFixed(1),
    };
  }, [branchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Loading Attendance Rules...
          </p>
        </div>
      </div>
    );
  }

  if (!configId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-3xl max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Attendance Rules Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            We couldn't retrieve the attendance configuration for your organization. Please ensure your organization is set up properly.
          </p>
          <button
            onClick={refreshData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 font-sans pb-20 overflow-x-hidden">
      {/* Notifications */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[200] space-y-3 sm:w-full sm:max-w-[380px] pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 backdrop-blur-xl text-xs sm:text-sm ${n.type === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white"}`}
          >
            <div className="mt-0.5 shrink-0">
              {n.type === "success" ? (
                <ShieldCheck
                  size={20}
                  className="text-blue-400 sm:w-[22px] sm:h-[22px]"
                />
              ) : (
                <AlertCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
              )}
            </div>
            <div className="flex-1 pr-2">
              <p className="font-medium leading-snug">{n.msg}</p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((item) => item.id !== n.id),
                )
              }
              className="text-white/60 hover:text-white flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="space-y-2 w-full lg:w-auto min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 text-blue-600 font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest">
                <Activity size={18} className="shrink-0 sm:w-5 sm:h-5" />
                <span className="truncate">
                  Centralized Attendance Governance v2.0
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter truncate">
                Strategic Oversight
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-2 truncate">
                <Globe size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />{" "}
                Monitoring {branchData.length} branches in real time
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Last synced: {lastSyncedAt || "never"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={refreshData}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-3.5 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl font-semibold text-sm hover:border-blue-200 transition-all ${isRefreshing ? "animate-pulse" : ""}`}
                >
                  <RefreshCcw
                    size={18}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <span className="sm:hidden lg:inline">Sync All</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        {/* Tabs */}
        <nav className="flex border-b border-slate-200 mb-6 sm:mb-8 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: "rules", label: "Attendance Rules", icon: Clock },
            { id: "analytics", label: "Behavioral Insights", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon size={18} className="sm:w-5 sm:h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-slate-100 p-6 sm:p-8 lg:p-10 shadow-sm max-w-4xl">
            <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-4">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">
                Attendance Rules Configuration
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Configure timing limits, minimum percentages, and trigger thresholds for the organization.
              </p>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                
                {/* Min Percentage */}
                <div className="bg-slate-50 hover:bg-slate-100/50 p-5 rounded-2xl border border-slate-100 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">
                        Minimum Attendance
                      </label>
                      <button
                        type="button"
                        onClick={() => setMinPercentageEnabled(!minPercentageEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-all focus:outline-none ${minPercentageEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${minPercentageEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      Required attendance percentage students must maintain to avoid compliance alerts.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={minPercentage}
                      onChange={(e) => setMinPercentage(e.target.value)}
                      disabled={!minPercentageEnabled}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                {/* Late Entry Grace Period */}
                <div className="bg-slate-50 hover:bg-slate-100/50 p-5 rounded-2xl border border-slate-100 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">
                        Late Entry Grace Period
                      </label>
                      <button
                        type="button"
                        onClick={() => setLateMarkGracePeriodMinutesEnabled(!lateMarkGracePeriodMinutesEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-all focus:outline-none ${lateMarkGracePeriodMinutesEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${lateMarkGracePeriodMinutesEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      Number of minutes after the session start time before a student is marked late.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={lateMarkGracePeriodMinutes}
                      onChange={(e) => setLateMarkGracePeriodMinutes(e.target.value)}
                      disabled={!lateMarkGracePeriodMinutesEnabled}
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">mins</span>
                  </div>
                </div>

                {/* Low Attendance Alert */}
                <div className="bg-slate-50 hover:bg-slate-100/50 p-5 rounded-2xl border border-slate-100 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">
                        Low Attendance Alert Trigger
                      </label>
                      <button
                        type="button"
                        onClick={() => setLowAttendanceAlertPercentEnabled(!lowAttendanceAlertPercentEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-all focus:outline-none ${lowAttendanceAlertPercentEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${lowAttendanceAlertPercentEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      Threshold percentage to trigger automatic email/system alerts to parents and teachers.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={lowAttendanceAlertPercent}
                      onChange={(e) => setLowAttendanceAlertPercent(e.target.value)}
                      disabled={!lowAttendanceAlertPercentEnabled}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                {/* Half Day Threshold */}
                <div className="bg-slate-50 hover:bg-slate-100/50 p-5 rounded-2xl border border-slate-100 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">
                        Half-Day Threshold
                      </label>
                      <button
                        type="button"
                        onClick={() => setHalfDayThresholdHoursEnabled(!halfDayThresholdHoursEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-all focus:outline-none ${halfDayThresholdHoursEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${halfDayThresholdHoursEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      Minimum hours a student must be present on campus to be marked present for a half-day.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={halfDayThresholdHours}
                      onChange={(e) => setHalfDayThresholdHours(e.target.value)}
                      disabled={!halfDayThresholdHoursEnabled}
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">hours</span>
                  </div>
                </div>

                {/* Auto Absent After */}
                <div className="bg-slate-50 hover:bg-slate-100/50 p-5 rounded-2xl border border-slate-100 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-800">
                        Auto-Absent After
                      </label>
                      <button
                        type="button"
                        onClick={() => setAutoAbsentAfterMinutesEnabled(!autoAbsentAfterMinutesEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-all focus:outline-none ${autoAbsentAfterMinutesEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${autoAbsentAfterMinutesEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      Time in minutes after the session start after which absent status is locked.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={autoAbsentAfterMinutes}
                      onChange={(e) => setAutoAbsentAfterMinutes(e.target.value)}
                      disabled={!autoAbsentAfterMinutesEnabled}
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">mins</span>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isRefreshing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl sm:rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={18} />
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6 sm:space-y-10 min-w-0">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
              {[
                {
                  label: "Global Attendance",
                  value: `${analyticsSummary.avgAttendance}%`,
                  sub: "Average across branches",
                  icon: Users,
                  color: "blue",
                  trend: "up",
                },
                {
                  label: "Active Students",
                  value: analyticsSummary.totalStudents,
                  sub: "Total across branches",
                  icon: CheckCircle,
                  color: "green",
                  trend: "up",
                },
                {
                  label: "Critical Alerts",
                  value: analyticsSummary.criticalCount,
                  sub: "Branches below 75%",
                  icon: AlertTriangle,
                  color: "red",
                  trend: "down",
                },
                {
                  label: "Compliance Rate",
                  value: `${analyticsSummary.complianceRate}%`,
                  sub: "Branches with 85%+ attendance",
                  icon: ShieldCheck,
                  color: "indigo",
                  trend: "neutral",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-slate-100 hover:shadow-xl transition-all min-w-0 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-${item.color}-50 text-${item.color}-600 shrink-0`}
                    >
                      <item.icon
                        size={24}
                        className="sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                        item.trend === "up"
                          ? "bg-green-100 text-green-700"
                          : item.trend === "down"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.trend === "up" && <ArrowUpRight size={14} />}
                      {item.trend === "down" && <ArrowDownRight size={14} />}
                    </div>
                  </div>
                  <div>
                    <h3
                      className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums truncate"
                      title={item.value}
                    >
                      {item.value}
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 truncate">
                      {item.label}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-2 sm:mt-4 truncate">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Branch Performance */}
            <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-slate-100 p-4 sm:p-6 lg:p-8 xl:p-10 min-w-0 overflow-hidden">
              <div className="flex flex-col gap-1 mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl sm:text-2xl font-black truncate">
                    Branch Performance Matrix
                  </h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === "table" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
                      >
                        <List size={18} />
                      </button>
                    </div>

                    {/* Export Data */}
                    <button
                      onClick={exportBranchDataToCSV}
                      className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-50 text-xs sm:text-sm font-bold whitespace-nowrap shadow-sm"
                    >
                      <Download size={16} className="sm:w-[18px] sm:h-[18px]" />{" "}
                      Export Data
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm truncate">
                  Live attendance telemetry
                </p>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 min-w-0">
                  {branchData.map((branch) => {
                    const offset =
                      circumference - (branch.attendance / 100) * circumference;
                    const isCritical = branch.attendance < 75;

                    return (
                      <div
                        key={branch.id}
                        onClick={() => handleOpenDetails(branch)}
                        className="bg-slate-50 hover:bg-white border border-transparent hover:border-blue-100 rounded-[1.5rem] sm:rounded-3xl p-5 sm:p-6 transition-all group min-w-0 flex flex-col cursor-pointer"
                      >
                        <div className="flex justify-end mb-4">
                          <span
                            className={`px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-bold rounded-full border ${STATUS_COLORS[branch.status]}`}
                          >
                            {branch.status}
                          </span>
                        </div>

                        <div className="flex justify-center mb-6">
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
                            <svg
                              className="w-full h-full -rotate-90"
                              viewBox="0 0 128 128"
                            >
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="11"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="none"
                                stroke={
                                  isCritical
                                    ? "#ef4444"
                                    : branch.attendance < 90
                                      ? "#f59e0b"
                                      : "#2563eb"
                                }
                                strokeWidth="11"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums">
                                {branch.attendance}
                              </span>
                              <span className="text-[10px] sm:text-xs -mt-1 text-slate-400">
                                %
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-center px-2 min-w-0">
                          <p
                            className="font-bold text-sm sm:text-base md:text-lg leading-tight truncate"
                            title={branch.name}
                          >
                            {branch.name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
                            Principal: {branch.head}
                          </p>
                        </div>

                        <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4 text-[10px] sm:text-xs">
                          <div>
                            <p className="text-slate-400">Trend</p>
                            <div
                              className={`flex items-center gap-1 font-bold ${branch.trend === "up" ? "text-green-600" : "text-red-600"}`}
                            >
                              {branch.trend === "up" ? (
                                <TrendingUp
                                  size={14}
                                  className="sm:w-4 sm:h-4"
                                />
                              ) : (
                                <TrendingDown
                                  size={14}
                                  className="sm:w-4 sm:h-4"
                                />
                              )}
                              {branch.trend.toUpperCase()}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400">Students</p>
                            <p
                              className="font-bold truncate"
                              title={branch.students.toLocaleString()}
                            >
                              {branch.students.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full block md:table">
                    <thead className="hidden md:table-header-group bg-white sticky top-0 z-10 border-b">
                      <tr>
                        <th className="text-left py-4 px-4 sm:px-6 font-bold text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest">
                          Branch
                        </th>
                        <th className="text-left py-4 px-4 sm:px-6 font-bold text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest">
                          Attendance
                        </th>
                        <th className="text-left py-4 px-4 sm:px-6 font-bold text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest">
                          Status
                        </th>
                        <th className="text-left py-4 px-4 sm:px-6 font-bold text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest">
                          Principal
                        </th>
                        <th className="w-12 sm:w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group divide-y divide-slate-100 md:divide-slate-200">
                      {branchData.map((branch) => (
                        <tr
                          key={branch.id}
                          className="block md:table-row hover:bg-slate-50 bg-white border border-slate-100 md:border-none rounded-2xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 transition-colors shadow-sm md:shadow-none"
                        >
                          <td className="flex justify-between items-center md:table-cell py-2 px-0 md:py-5 md:px-6 border-b border-slate-50 md:border-none min-w-0">
                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Branch
                            </span>
                            <div className="text-right md:text-left min-w-0 pl-4 md:pl-0">
                              <div
                                className="font-semibold text-sm sm:text-base text-slate-800 truncate"
                                title={branch.name}
                              >
                                {branch.name}
                              </div>
                              {/* Internal DB ID hidden from UI */}
                            </div>
                          </td>
                          <td className="flex flex-col sm:flex-row sm:justify-between sm:items-center md:table-cell py-3 px-0 md:py-5 md:px-6 border-b border-slate-50 md:border-none w-full">
                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 sm:mb-0">
                              Attendance
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="flex-1 sm:w-24 md:w-32 lg:w-40 h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${branch.attendance}%` }}
                                />
                              </div>
                              <span className="font-bold tabular-nums w-10 sm:w-12 text-sm sm:text-base text-right sm:text-left">
                                {branch.attendance}%
                              </span>
                            </div>
                          </td>
                          <td className="flex justify-between items-center md:table-cell py-2 px-0 md:py-5 md:px-6 border-b border-slate-50 md:border-none">
                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Status
                            </span>
                            <span
                              className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full border ${STATUS_COLORS[branch.status]}`}
                            >
                              {branch.status}
                            </span>
                          </td>
                          <td className="flex justify-between items-center md:table-cell py-2 px-0 md:py-5 md:px-6 text-sm text-slate-600 border-b border-slate-50 md:border-none min-w-0">
                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Principal
                            </span>
                            <span className="truncate max-w-[150px]">
                              {branch.head}
                            </span>
                          </td>
                          <td className="flex justify-end items-center md:table-cell py-2 px-0 md:py-5 md:px-6 text-right mt-2 md:mt-0">
                            <button 
                              onClick={() => handleOpenDetails(branch)}
                              className="flex items-center justify-center p-2 rounded-lg bg-slate-50 md:bg-transparent text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors w-full md:w-auto"
                            >
                              <span className="md:hidden text-xs font-bold mr-2">
                                View Details
                              </span>
                              <ChevronRight
                                size={18}
                                className="sm:w-5 sm:h-5"
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {branchData.length === 0 && (
                <div className="p-6 sm:p-8 text-center text-slate-500 font-semibold text-sm sm:text-base">
                  No branch analytics available yet. Add schools and attendance
                  records, then click Sync All.
                </div>
              )}
            </div>
          </div>
        )}


      {/* Detail Modal */}
      {isModalOpen && selectedBranchForModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Content */}
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border mb-3 ${STATUS_COLORS[selectedBranchForModal.status]}`}>
                {selectedBranchForModal.status}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
                {selectedBranchForModal.name}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Branch Details Overview
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Principal Name</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBranchForModal.principalName || "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Branch Code</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBranchForModal.branchCode || "N/A"}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Official Email</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedBranchForModal.officialEmail || "N/A"}</p>
                </div>
                <div className="border-t border-slate-200/60 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Official Phone</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedBranchForModal.officialPhone || "N/A"}</p>
                </div>
                <div className="border-t border-slate-200/60 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">{selectedBranchForModal.address || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Students</p>
                  <p className="text-lg font-black text-slate-800 tabular-nums">{selectedBranchForModal.students?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendance Rate</p>
                  <p className="text-lg font-black text-blue-600 tabular-nums">{selectedBranchForModal.attendance}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default AttendanceGovernance;
