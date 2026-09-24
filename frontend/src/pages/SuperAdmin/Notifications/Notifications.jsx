import React, { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Globe, Send, Clock, Search, Filter, Eye, Trash2, CheckCircle2, X, Plus, Calendar, BellRing, PieChart, Users,
  BookOpen, TrendingDown, Award, AlertTriangle, BarChart3, BookMarked, GraduationCap, Mail
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  createGlobalAlertApi,
  deleteGlobalAlertApi,
  getGlobalAlertsApi,
  getAcademicAlertsApi
} from "../../../services/api/notificationsApi";
import { getOrganizationBranches } from "../../../services/api/organizationApi";

const Notifications = () => {
  const [viewType, setViewType] = useState("Global Alerts"); // "Global Alerts" or "Academic Alerts"
  
  // --- Global Alerts States ---
  const [globalActiveTab, setGlobalActiveTab] = useState("All");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNetworkMap, setShowNetworkMap] = useState(false);
  const [selectedGlobalAlert, setSelectedGlobalAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [globalStats, setGlobalStats] = useState({ live: 0, total: 0, critical: 0 });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    category: "General Circular",
    priority: "Normal",
    date: "",
    time: "",
    message: "",
    targetBranchId: "", // empty means Network
    targetRole: "", // empty means All Roles
  });

  // --- Academic Alerts States ---
  const [academicActiveTab, setAcademicActiveTab] = useState("All");
  const [academicSearchQuery, setAcademicSearchQuery] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedAcademicAlert, setSelectedAcademicAlert] = useState(null);
  const [academicAlerts, setAcademicAlerts] = useState([]);
  const [academicLoading, setAcademicLoading] = useState(true);

  useEffect(() => {
    // Fetch branches for the dropdown — API returns { success, data: [ {id, branchName, ...} ] }
    getOrganizationBranches().then(res => {
      setBranches(Array.isArray(res.data) ? res.data : []);
    }).catch(err => console.error("Failed to fetch branches", err));
  }, []);

  const loadGlobalAlerts = async () => {
    try {
      setGlobalLoading(true);
      const response = await getGlobalAlertsApi({
        status: globalActiveTab,
        search: globalSearchQuery || undefined,
      });
      setGlobalAlerts(response?.data?.alerts || []);
      setGlobalStats(response?.data?.stats || { live: 0, total: 0, critical: 0 });
    } catch (error) {
      toast.error(error?.message || "Failed to load global alerts");
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    if (viewType === "Global Alerts") {
      const timer = setTimeout(() => {
        loadGlobalAlerts();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [globalActiveTab, globalSearchQuery, viewType]);

  const loadAcademicAlerts = async () => {
    try {
      setAcademicLoading(true);
      const response = await getAcademicAlertsApi({
        search: academicSearchQuery || undefined,
      });
      setAcademicAlerts(response?.data?.alerts || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load academic alerts");
    } finally {
      setAcademicLoading(false);
    }
  };

  useEffect(() => {
    if (viewType === "Academic Alerts") {
      const timer = setTimeout(() => {
        loadAcademicAlerts();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [academicSearchQuery, viewType]);

  // --- Global Handlers ---
  const handleGlobalDelete = async (id) => {
    if (window.confirm("Are you sure you want to dismiss this broadcast alert?")) {
      try {
        await deleteGlobalAlertApi(id);
        toast.success("Alert deleted");
        await loadGlobalAlerts();
      } catch (error) {
        toast.error(error?.message || "Failed to delete alert");
      }
    }
  };

  const filteredGlobalAlerts = useMemo(() => globalAlerts, [globalAlerts]);

  const networkMapData = useMemo(() => {
    const counts = globalAlerts.reduce((acc, alert) => {
      const key = alert.school || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([school, count]) => ({ school, count }))
      .sort((a, b) => b.count - a.count);
  }, [globalAlerts]);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.title || !formData.message) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setIsSubmitting(true);
      let targetRoles = [];
      if (formData.targetRole === "Teachers") targetRoles = ["teacher"];
      if (formData.targetRole === "Principals") targetRoles = ["principal"];
      
      await createGlobalAlertApi({
        title: formData.title,
        message: formData.message,
        category: formData.category,
        visibleToParents: true,
        targetBranchIds: formData.targetBranchId ? [formData.targetBranchId] : [],
        targetRoles: targetRoles
      });
      toast.success("Broadcast alert created successfully");
      setShowCreateModal(false);
      setFormData({
        title: "",
        category: "General Circular",
        priority: "Normal",
        date: "",
        time: "",
        message: "",
        targetBranchId: "",
        targetRole: "",
      });
      await loadGlobalAlerts();
    } catch (error) {
      toast.error(error?.message || "Failed to create alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Academic Handlers ---
  const filteredAcademicAlerts = useMemo(() => {
    return academicAlerts.filter(
      (alert) =>
        academicActiveTab === "All" ||
        alert.category?.toLowerCase() === academicActiveTab.toLowerCase(),
    );
  }, [academicAlerts, academicActiveTab]);

  const heatmapStats = useMemo(() => {
    if (!academicAlerts || academicAlerts.length === 0) return [];
    const maxDuplicates = Math.max(...academicAlerts.map((a) => a.duplicateCount || 1));
    return academicAlerts
      .map((alert) => {
        const duplicates = alert.duplicateCount || 1;
        const heatRatio = duplicates / maxDuplicates;
        let heatColor = "bg-emerald-400";
        let textColor = "text-emerald-600";
        if (heatRatio > 0.6) {
          heatColor = "bg-red-500";
          textColor = "text-red-600";
        } else if (heatRatio > 0.2) {
          heatColor = "bg-amber-400";
          textColor = "text-amber-600";
        }
        return {
          id: alert._id,
          type: alert.type.replace("Notice: ", "").substring(0, 45) + (alert.type.length > 45 ? "..." : ""),
          category: alert.category || "General",
          duplicates: duplicates,
          branches: alert.branchCount || 1,
          heatColor,
          textColor,
          ratio: heatRatio * 100,
        };
      })
      .sort((a, b) => b.duplicates - a.duplicates);
  }, [academicAlerts]);

  // --- UI Parts ---
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-10 bg-[#f8faff] font-sans overflow-x-hidden">
      <Toaster />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-5">
        <div className="w-full lg:w-auto min-w-0">
          <p className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <Globe size={14} className="shrink-0" /> Notifications Network
          </p>
          <div className="flex items-center gap-1">
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight leading-tight bg-transparent border-none outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-auto pr-2"
            >
              <option value="Global Alerts">Global Alerts</option>
              <option value="Academic Alerts">Academic Alerts</option>
            </select>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-1 truncate">
            {viewType === "Global Alerts" 
              ? "Manage network-wide announcements and emergency protocols." 
              : "Real-time tracking of student performance and curriculum."}
          </p>
        </div>

        {viewType === "Global Alerts" ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <Plus size={18} className="shrink-0" /> <span className="whitespace-nowrap">Create Broadcast</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={() => setShowHeatmap(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <PieChart size={18} className="shrink-0" /> <span className="whitespace-nowrap">View Heatmaps</span>
            </button>
          </div>
        )}
      </div>

      {viewType === "Global Alerts" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <StatCard label="Live Broadcasts" value={String(globalStats.live || 0)} icon={<Globe size={20} />} color="green" />
            <StatCard label="Audience Reach" value="Network" icon={<Users size={20} />} color="blue" />
            <StatCard label="Critical Alerts" value={String(globalStats.critical || 0)} icon={<BellRing size={20} />} color="red" />
            <StatCard label="Total Alerts" value={String(globalStats.total || 0)} icon={<Clock size={20} />} color="orange" />
          </div>

          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-w-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl sm:rounded-2xl overflow-x-auto hide-scrollbar w-full xl:w-auto">
                {["All", "Live", "Scheduled", "Completed", "Draft"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGlobalActiveTab(tab)}
                    className={`flex-1 xl:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${globalActiveTab === tab ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-indigo-600"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative w-full xl:w-80 group min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border-2 border-transparent rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-100 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="w-full p-4 md:p-0 overflow-x-hidden md:overflow-x-auto">
              <table className="w-full block md:table">
                <thead className="hidden md:table-header-group bg-slate-50 text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] sm:text-[11px] uppercase tracking-widest text-left">Announcement</th>
                    <th className="px-6 py-5 text-[10px] sm:text-[11px] uppercase tracking-widest text-left">Reach / Target</th>
                    <th className="px-6 py-5 text-[10px] sm:text-[11px] uppercase tracking-widest text-left">Date & Time</th>
                    <th className="px-6 py-5 text-[10px] sm:text-[11px] uppercase tracking-widest text-left">Status</th>
                    <th className="px-6 py-5 text-[10px] sm:text-[11px] uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y divide-slate-100 md:divide-slate-50">
                  {!globalLoading && filteredGlobalAlerts.map((alert) => (
                      <tr key={alert._id} className="block md:table-row bg-white border border-slate-100 md:border-none rounded-2xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 hover:bg-indigo-50/30 transition-all shadow-sm md:shadow-none group">
                        <td className="flex flex-col sm:flex-row sm:items-center md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none min-w-0">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 sm:mb-0">Announcement</span>
                          <div className="flex items-center gap-3 sm:gap-4 w-full">
                            <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${alert.status === "Live" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"}`}>
                              <Megaphone size={18} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm sm:text-base text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight truncate mb-1" title={alert.title}>{alert.title}</p>
                              <span className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate block">{alert.type} • {alert.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="flex justify-between items-center md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none min-w-0">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Reach / Target</span>
                          <div className="text-right md:text-left min-w-0 pl-4 md:pl-0">
                            <p className="font-bold text-xs sm:text-sm text-slate-800 truncate" title={alert.reach}>{alert.reach}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{alert.target}</p>
                          </div>
                        </td>
                        <td className="flex justify-between items-center md:table-cell px-0 py-2 md:px-6 md:py-5 text-xs sm:text-sm font-bold border-b border-slate-50 md:border-none">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</span>
                          <div className="text-right md:text-left">
                            <div className="text-slate-600">{alert.date}</div>
                            <div className="text-indigo-600">{alert.time}</div>
                          </div>
                        </td>
                        <td className="flex justify-between items-center md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest w-fit ${alert.status === "Live" ? "bg-red-50 text-red-600 border border-red-100" : alert.status === "Scheduled" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>{alert.status}</span>
                        </td>
                        <td className="flex justify-end items-center md:table-cell px-0 py-3 md:px-6 md:py-5 mt-2 md:mt-0 text-right">
                          <div className="flex justify-end gap-2 w-full md:w-auto">
                            <button onClick={() => setSelectedGlobalAlert(alert)} className="flex-1 md:flex-none flex items-center justify-center gap-2 p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                              <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                              <span className="md:hidden text-xs font-bold">View</span>
                            </button>
                            <button onClick={() => handleGlobalDelete(alert._id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-lg sm:rounded-xl hover:bg-red-600 hover:text-white transition-all">
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                              <span className="md:hidden text-xs font-bold">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!globalLoading && filteredGlobalAlerts.length === 0 && (
                    <tr className="block md:table-row">
                      <td colSpan={5} className="block md:table-cell py-12 sm:py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl md:border-none">
                        <p className="font-bold text-slate-400 text-sm sm:text-base">No announcements found in this category.</p>
                      </td>
                    </tr>
                  )}
                  {globalLoading && (
                    <tr className="block md:table-row">
                      <td colSpan={5} className="block md:table-cell py-12 sm:py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl md:border-none">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="font-bold text-slate-400 text-sm sm:text-base">Loading announcements...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <StatCard label="Critical Risks" value={String(academicAlerts.filter((a) => a.severity === "Critical").length)} icon={<TrendingDown size={20} />} color="red" />
            <StatCard label="Syllabus Lags" value={String(academicAlerts.filter((a) => a.category === "result").length)} icon={<BookMarked size={20} />} color="orange" />
            <StatCard label="Pending Review" value={String(academicAlerts.filter((a) => !a.read).length)} icon={<Users size={20} />} color="blue" />
            <StatCard label="Total Alerts" value={String(academicAlerts.length)} icon={<Award size={20} />} color="green" />
          </div>

          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-w-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-5">
              <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-slate-50 p-1.5 rounded-xl sm:rounded-2xl w-full xl:w-auto">
                {["All", "Performance", "Attendance", "Submission", "AI Insight"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAcademicActiveTab(tab)}
                    className={`flex-1 xl:flex-none px-4 sm:px-5 py-2.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${academicActiveTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-indigo-500"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 w-full xl:w-auto">
                <div className="relative flex-1 xl:w-72 group min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  <input
                    type="text"
                    value={academicSearchQuery}
                    onChange={(e) => setAcademicSearchQuery(e.target.value)}
                    placeholder="Search alerts..."
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-transparent rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-100 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="w-full p-4 md:p-0 overflow-x-hidden md:overflow-x-auto">
              <table className="w-full block md:table">
                <thead className="hidden md:table-header-group bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Alert & Subject</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Impact / Action</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y divide-slate-100 md:divide-slate-50">
                  {!academicLoading && filteredAcademicAlerts.map((alert) => (
                    <tr key={alert._id} className="block md:table-row bg-white border border-slate-100 md:border-none rounded-2xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 hover:bg-slate-50/70 transition-all shadow-sm md:shadow-none group">
                      <td className="flex flex-col sm:flex-row sm:items-center md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none gap-4">
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Alert & Subject</span>
                        <div className="flex items-center gap-4 w-full">
                          <div className={`p-3 rounded-xl shrink-0 ${alert.severity === "Critical" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"}`}>
                            {alert.category === "Award" ? <Award size={20} /> : <BookOpen size={20} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm sm:text-base text-slate-800 flex flex-wrap items-center gap-2 leading-tight mb-1">
                              <span className="truncate">{alert.type}</span>
                              {alert.duplicateCount > 1 && <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-700 shrink-0">x{alert.duplicateCount}</span>}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide truncate">
                              <span className="text-indigo-600">{alert.student || "Global Event"}</span> • {alert.class || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none">
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Severity</span>
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${alert.severity === "Critical" ? "bg-red-50 text-red-600 border border-red-100" : alert.severity === "High" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                          <AlertTriangle size={12} className="shrink-0" /> {alert.severity || "Info"}
                        </span>
                      </td>
                      <td className="flex flex-col md:table-cell px-0 py-2 md:px-6 md:py-5 border-b border-slate-50 md:border-none">
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Impact / Action</span>
                        <div className="flex items-start gap-2 text-xs sm:text-sm font-bold text-slate-600">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{alert.action || "Pending Review"}</span>
                        </div>
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-0 py-2 md:px-6 md:py-5 text-slate-400 font-bold text-xs sm:text-sm border-b border-slate-50 md:border-none">
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Date</span>
                        {alert.date || "Just now"}
                      </td>
                      <td className="flex justify-end items-center md:table-cell px-0 py-3 md:px-6 md:py-5 mt-2 md:mt-0 text-right">
                        <button onClick={() => setSelectedAcademicAlert(alert)} className="w-full md:w-auto p-2 sm:p-2.5 bg-slate-50 md:bg-transparent text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center gap-2">
                          <Eye size={18} />
                          <span className="md:hidden text-xs font-bold text-slate-600">View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!academicLoading && filteredAcademicAlerts.length === 0 && (
                    <tr className="block md:table-row">
                      <td colSpan={5} className="block md:table-cell py-12 sm:py-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300 mb-4"><Search size={32} /></div>
                        <p className="text-slate-400 font-bold text-sm sm:text-base">No academic alerts found for this filter.</p>
                      </td>
                    </tr>
                  )}
                  {academicLoading && (
                    <tr className="block md:table-row">
                      <td colSpan={5} className="block md:table-cell py-16 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold text-sm sm:text-base">Loading insights...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- Global Alert Modals --- */}
      {selectedGlobalAlert && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg md:max-w-xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 md:p-8 bg-indigo-600 text-white flex justify-between items-start sm:items-center shrink-0 rounded-t-[2rem] sm:rounded-t-3xl">
              <div className="min-w-0 pr-4">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Broadcast Details</p>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black leading-tight truncate whitespace-normal line-clamp-2">{selectedGlobalAlert.title}</h3>
              </div>
              <button onClick={() => setSelectedGlobalAlert(null)} className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
            <div className="p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Priority" value={selectedGlobalAlert.priority} />
                <DetailItem label="Target" value={selectedGlobalAlert.target} />
                <DetailItem label="Scheduled" value={`${selectedGlobalAlert.date} ${selectedGlobalAlert.time}`} />
                <DetailItem label="Reached" value={selectedGlobalAlert.reach} />
              </div>
              <div className="p-4 sm:p-5 md:p-6 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 space-y-3">
                <h5 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Content</h5>
                <p className="text-sm sm:text-base font-bold text-slate-700 leading-relaxed border-l-4 border-indigo-600 pl-4 italic">"{selectedGlobalAlert.message}"</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button className="w-full sm:flex-1 py-3.5 sm:py-4 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 sm:border-none">Save as Draft</button>
                <button onClick={() => setSelectedGlobalAlert(null)} className="w-full sm:flex-[2] py-3.5 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all">Close Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg md:max-w-xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 rounded-t-[2rem] sm:rounded-t-3xl">
              <div>
                <h3 className="font-black text-lg sm:text-xl md:text-2xl text-slate-800 leading-tight">Create Broadcast</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Network/Targeted Broadcast</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 rounded-full sm:rounded-xl text-slate-400 transition-all shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
            <form onSubmit={handleCreateAlert} className="p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Announcement Header</label>
                  <input required type="text" placeholder="Main title..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all" />
                </div>
                
                {/* Target Branch and Target Role */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Target School</label>
                  <select value={formData.targetBranchId} onChange={(e) => setFormData({ ...formData, targetBranchId: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option value="">All Schools (Network)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branchName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Target Audience</label>
                  <select value={formData.targetRole} onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option value="">All Roles</option>
                    <option value="Teachers">Teachers</option>
                    <option value="Principals">Principals</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option>General Circular</option>
                    <option>Emergency Alert</option>
                    <option>Academic Notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option>Normal</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div className="sm:col-span-2 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 sm:mb-2 ml-1">Message Body</label>
                  <textarea rows="4" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Write content here..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 resize-none transition-all"></textarea>
                </div>
              </div>
              <div className="pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0">
                <button type="button" onClick={() => setShowCreateModal(false)} className="w-full sm:flex-1 px-4 sm:px-6 py-4 sm:py-4 bg-white border-2 border-slate-100 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl sm:rounded-2xl transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`w-full sm:flex-[2] flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-4 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${isSubmitting ? "bg-indigo-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-200"} text-white`}>
                  <Send size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                  <span className="truncate">{isSubmitting ? "Processing..." : "Save & Broadcast"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNetworkMap && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-lg md:max-w-xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 rounded-t-[2rem] sm:rounded-t-3xl">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-none mb-1">Network Map</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch-wise distribution</p>
              </div>
              <button onClick={() => setShowNetworkMap(false)} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 rounded-full sm:rounded-xl text-slate-400 transition-all shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
            <div className="p-5 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              {networkMapData.length === 0 ? (
                <div className="text-center py-10 sm:py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <p className="text-sm sm:text-base font-bold text-slate-400">No branch activity available yet.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {networkMapData.map((item) => (
                    <div key={item.school} className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-5 bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                      <p className="text-sm sm:text-base font-bold text-slate-800 truncate pr-4">{item.school}</p>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 shrink-0">{item.count} broadcast{item.count > 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 shrink-0 bg-white">
              <button onClick={() => setShowNetworkMap(false)} className="w-full py-4 sm:py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Close Map</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Academic Alert Modals --- */}
      {showHeatmap && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] sm:text-xs font-black text-indigo-200 uppercase tracking-widest mb-1 flex items-center gap-2"><BarChart3 size={14} /> AI Heatmap Analysis</p>
                <h3 className="text-xl sm:text-3xl font-black leading-tight">Alert Intensity Matrix</h3>
              </div>
              <button onClick={() => setShowHeatmap(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shrink-0"><X size={24} /></button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
                <p className="text-sm font-bold text-slate-500">Overview of alert volume and intensity across the organization.</p>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> High Volume</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400"></span> Medium</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400"></span> Low</div>
                </div>
              </div>
              <div className="overflow-x-auto bg-white p-2 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-left border-separate border-spacing-y-4 min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="pb-2 px-2 font-black text-slate-400 uppercase tracking-widest text-xs">Alert Subject</th>
                      <th className="pb-2 px-2 font-black text-slate-400 uppercase tracking-widest text-xs">Category</th>
                      <th className="pb-2 px-2 font-black text-slate-400 uppercase tracking-widest text-xs">Impacted</th>
                      <th className="pb-2 px-2 font-black text-slate-400 uppercase tracking-widest text-xs">Intensity (Volume)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapStats.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 px-2 font-bold text-slate-700 text-sm w-1/3 truncate max-w-[200px]" title={row.type}>{row.type}</td>
                        <td className="py-2 px-2"><span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{row.category}</span></td>
                        <td className="py-2 px-2 font-bold text-slate-600 text-sm">{row.branches} {row.branches > 1 ? "Branches" : "Branch"}</td>
                        <td className="py-2 px-2 w-1/3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                              <div className={`h-full rounded-full ${row.heatColor} transition-all duration-500`} style={{ width: `${Math.max(row.ratio, 5)}%` }} />
                            </div>
                            <span className={`text-xs font-black w-10 text-right ${row.textColor}`}>{row.duplicates}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {heatmapStats.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-400 font-bold">No data available for heatmap analysis</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowHeatmap(false)} className="px-8 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all">Close View</button>
            </div>
          </div>
        </div>
      )}

      {selectedAcademicAlert && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="p-5 sm:p-6 md:p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0 rounded-t-[2rem] sm:rounded-none">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Diagnostic Report</p>
                <h3 className="text-xl sm:text-2xl font-black leading-tight">{selectedAcademicAlert.type}</h3>
              </div>
              <button onClick={() => setSelectedAcademicAlert(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shrink-0"><X size={20} className="sm:w-6 sm:h-6" /></button>
            </div>
            <div className="p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <DetailItem label="Student" value={selectedAcademicAlert.student || "N/A"} />
                <DetailItem label="Class" value={selectedAcademicAlert.class || "N/A"} />
                <DetailItem label="Category" value={selectedAcademicAlert.category} />
                <DetailItem label="Status" value={selectedAcademicAlert.severity || "Info"} />
                <DetailItem label="Occurrences" value={String(selectedAcademicAlert.duplicateCount || 1)} />
                <DetailItem label="Branches Impacted" value={String(selectedAcademicAlert.branchCount || 1)} />
              </div>
              <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">AI Analysis</label>
                  <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed">{selectedAcademicAlert.description}</p>
                </div>
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">System Action Taken:</span>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg w-fit">{selectedAcademicAlert.action || "Pending"}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};



const StatCard = ({ label, value, icon, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-[1.25rem] sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-100 transition-all min-w-0">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className={`p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border ${colors[color]} group-hover:scale-110 transition-transform shrink-0`}>
          {React.cloneElement(icon, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
        </div>
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight truncate mb-1">{value}</h2>
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex flex-col bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm">
    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{label}</span>
    <span className="text-sm sm:text-base font-bold text-slate-800 truncate">{value}</span>
  </div>
);

export default Notifications;
