import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  X,
  Info,
  Loader2,
  FileText,
  UserCog,
  Building2,
  Filter,
  SlidersHorizontal,
  Layers,
  Activity,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  fetchGraphuraEscalations,
  resolveGraphuraEscalation,
} from "../../services/api/graphuraApi.js";

// Helper to format ISO dates into readable relative time
const getTimeAgo = (dateString) => {
  if (!dateString) return "Unknown";
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const SuperAdminEscalations = () => {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [resolutionNote, setResolutionNote] = useState("");

  const loadEscalations = async () => {
    try {
      setLoading(true);
      const response = await fetchGraphuraEscalations({
        status: "escalated",
        search: searchQuery.trim() || undefined,
        limit: 100,
      });

      const rawTickets =
        response?.data?.tickets || response?.data?.data?.tickets || [];

      const superAdminTickets = rawTickets.filter((t) =>
        t.escalationLog?.some((log) => log.escalatedToRole === "super_admin"),
      );

      const tickets = superAdminTickets.map((t) => {
        const superAdminLog = t.escalationLog?.find(
          (log) => log.escalatedToRole === "super_admin",
        );

        return {
          ...t,
          level: `L${Math.max(t.escalationLevel || 1, 1)}`,
          escalationReason:
            superAdminLog?.reason ||
            "Critical issue requiring Super Admin intervention.",
          escalatedByRole: superAdminLog?.escalatedByRole || "hq_admin",
          severity:
            t.priority === "CRITICAL"
              ? "CRITICAL"
              : t.priority === "HIGH"
                ? "HIGH"
                : "MEDIUM",
          timeFormatted: getTimeAgo(t.time || t.updatedAt || t.createdAt),
        };
      });

      setEscalations(tickets);
    } catch (error) {
      toast.error(error?.message || "Failed to load escalations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEscalations();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResolve = async (ticket) => {
    if (!resolutionNote.trim()) {
      toast.error("A resolution note is required to close this ticket.");
      return;
    }

    try {
      setActionLoadingId(ticket._id);

      await resolveGraphuraEscalation(ticket._id, {
        resolutionNote: resolutionNote.trim(),
      });

      toast.success(`Ticket ${ticket.id} successfully resolved.`);

      setSelectedTicket(null);
      setResolutionNote("");

      await loadEscalations();
    } catch (error) {
      toast.error(error?.message || "Failed to resolve ticket");
    } finally {
      setActionLoadingId(null);
    }
  };

  const statsMetrics = useMemo(() => {
    const total = escalations.length;
    const critical = escalations.filter(
      (t) => t.severity === "CRITICAL",
    ).length;
    const high = escalations.filter((t) => t.severity === "HIGH").length;
    return { total, critical, high };
  }, [escalations]);

  const filteredData = useMemo(() => escalations, [escalations]);

  // Framer motion variants for list items
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 font-sans selection:bg-rose-100 p-4 sm:p-6 lg:p-8 xl:p-10">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "font-semibold text-sm rounded-xl shadow-lg border border-slate-100",
        }}
      />

      {/* ── HEADER & KPI METRICS ── */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-600">
              <Zap size={14} className="fill-rose-600" />
            </div>
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Pending Interventions
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
            Critical system breaches, unresolved client anomalies, and
            multi-tier SLA bypass loops requiring immediate root-level
            clearance.
          </p>
        </div>

        {/* Dynamic Metric Counter Panels */}
        <div className="flex gap-3 sm:gap-4 w-full xl:w-auto">
          <div className="flex-1 xl:w-32 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {statsMetrics.total}
            </p>
          </div>
          <div className="flex-1 xl:w-32 bg-white border border-rose-100 p-4 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">
              Critical
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {statsMetrics.critical}
            </p>
          </div>
          <div className="flex-1 xl:w-32 bg-white border border-amber-100 p-4 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
              High
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {statsMetrics.high}
            </p>
          </div>
        </div>
      </div>

      {/* ── FILTER & DATA GRID CONTAINER ── */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8">
          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center mb-6 pb-6 border-b border-slate-100">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search escalations by ID, branch, or issue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            <button className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold text-sm flex items-center justify-center gap-2 transition-all shrink-0">
              <SlidersHorizontal size={16} /> Filters
            </button>
          </div>

          {/* Escalation Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">
                Syncing active interventions...
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Queue Clear
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                No active system escalations require your attention at this
                time.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {filteredData.map((ticket) => {
                const isCritical = ticket.severity === "CRITICAL";

                return (
                  <motion.div
                    variants={itemVariants}
                    key={ticket.id}
                    className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCritical
                            ? "bg-rose-50 border-rose-100 text-rose-600"
                            : "bg-amber-50 border-amber-100 text-amber-600"
                        }`}
                      >
                        <ShieldAlert size={22} />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ticket.level}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {ticket.id}
                          </span>
                        </div>
                        <h4
                          className="text-base font-bold text-slate-900 truncate mb-1"
                          title={ticket.subject}
                        >
                          {ticket.subject}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5 truncate">
                            <Building2
                              size={14}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="truncate">
                              {ticket.organizationName
                                ? `${ticket.organizationName} - `
                                : ""}
                              {ticket.branch}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-6 border-t border-slate-100 lg:border-t-0 pt-4 lg:pt-0 shrink-0">
                      {/* Meta stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Escalated By
                          </p>
                          <p className="font-semibold text-slate-700 flex items-center gap-1.5 capitalize">
                            <UserCog size={14} className="text-indigo-400" />
                            {ticket.escalatedByRole.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            SLA Threshold
                          </p>
                          <p
                            className={`font-semibold flex items-center gap-1.5 ${isCritical ? "text-rose-600" : "text-amber-600"}`}
                          >
                            <Clock size={14} />
                            {ticket.timeFormatted}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setResolutionNote("");
                        }}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        Resolve <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── RESOLUTION MODAL ── */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 shadow-sm">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      Resolve Escalation
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {selectedTicket.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setResolutionNote("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* Meta Row */}
                <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Organization
                    </span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      {selectedTicket.organizationName
                        ? `${selectedTicket.organizationName} - `
                        : ""}
                      {selectedTicket.branch}
                    </span>
                  </div>
                  <div className="w-px bg-slate-200 hidden sm:block"></div>
                  <div className="flex-1 min-w-[150px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Escalated By
                    </span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 capitalize">
                      <UserCog size={14} className="text-indigo-400" />
                      {selectedTicket.escalatedByRole?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Original Issue */}
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    <Info size={14} /> Original Report
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="font-bold text-slate-900 mb-2">
                      {selectedTicket.subject}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Escalation Justification */}
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">
                    <Layers size={14} /> Escalation Justification
                  </h4>
                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-amber-900">
                    <p className="text-sm font-medium leading-relaxed italic">
                      "{selectedTicket.escalationReason}"
                    </p>
                  </div>
                </div>

                {/* Resolution Input */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    <span className="flex items-center gap-2">
                      <FileText size={14} className="text-emerald-500" />{" "}
                      Official Resolution Note{" "}
                      <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Document the administrative actions or systemic overrides applied to resolve this issue..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none min-h-[120px]"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setResolutionNote("");
                  }}
                  className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoadingId === selectedTicket._id}
                  onClick={() => handleResolve(selectedTicket)}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoadingId === selectedTicket._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>
                    {actionLoadingId === selectedTicket._id
                      ? "Processing..."
                      : "Resolve & Close"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminEscalations;
