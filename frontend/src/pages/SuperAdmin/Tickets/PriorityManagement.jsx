import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  SlidersHorizontal,
  AlertCircle,
  Trash2,
  Zap,
  ShieldCheck,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  escalateSuperAdminTicket,
  getSuperAdminTickets,
  resolveSuperAdminTicket,
  updateSuperAdminTicketPriority,
} from "../../../services/api/ticketApi";

const PriorityManagement = () => {
  // 1. Core Data State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // 2. Control States
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterImpact, setFilterImpact] = useState("All");
  const [activeMenu, setActiveMenu] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const menuRef = useRef(null);
  const filterRef = useRef(null);

  // Click Outside Handler for Menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Logic Handlers ---

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await getSuperAdminTickets({
        search: search.trim() || undefined,
        limit: 100,
      });
      const mapped = (response?.data?.tickets || []).map((ticket) => {
        const hoursOld = Math.floor(
          (Date.now() - new Date(ticket.createdAt).getTime()) /
            (1000 * 60 * 60),
        );
        const slaPercent = Math.min(
          95,
          Math.max(10, Math.floor((hoursOld / 24) * 100)),
        );
        return {
          ...ticket,
          impact:
            ticket.priority === "CRITICAL"
              ? "High"
              : ticket.priority === "HIGH"
                ? "Medium"
                : "Low",
          slaPercent,
          slaTime:
            hoursOld < 1
              ? "1h left"
              : `${Math.max(1, 24 - (hoursOld % 24))}h left`,
          priority:
            ticket.priority === "CRITICAL"
              ? "C"
              : ticket.priority === "HIGH"
                ? "H"
                : "M",
          type:
            ticket.category?.charAt(0).toUpperCase() +
            ticket.category?.slice(1),
        };
      });
      setTickets(mapped);
    } catch (error) {
      toast.error(error?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePriorityChange = async (ticket, newPriority) => {
    try {
      setActionLoadingId(ticket._id);
      const backendPriority =
        newPriority === "C"
          ? "critical"
          : newPriority === "H"
            ? "high"
            : "medium";
      await updateSuperAdminTicketPriority(ticket._id, backendPriority);
      toast.success(`SLA Priority Re-routed for ${ticket.id}`);
      await loadTickets();
    } catch (error) {
      toast.error(error?.message || "Failed to update priority");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (ticket) => {
    try {
      setActionLoadingId(ticket._id);
      await resolveSuperAdminTicket(ticket._id);
      toast.success(`Ticket ${ticket.id} resolved!`, { icon: "✅" });
      await loadTickets();
    } catch (error) {
      toast.error(error?.message || "Failed to resolve ticket");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEscalate = async (ticket) => {
    try {
      setActionLoadingId(ticket._id);
      await escalateSuperAdminTicket(
        ticket._id,
        "Escalated from priority management",
      );
      toast.success(`${ticket.id} escalated`);
      setActiveMenu(null);
      await loadTickets();
    } catch (error) {
      toast.error(error?.message || "Failed to escalate ticket");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Combined Search, Filter, and Sort Logic
  const filteredAndSortedTickets = useMemo(() => {
    let result = tickets.filter((t) => {
      const matchesSearch =
        (t.branch || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.id || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterImpact === "All" || t.impact === filterImpact;
      return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
      const timeA = parseInt(a.slaTime);
      const timeB = parseInt(b.slaTime);
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [tickets, search, filterImpact, sortOrder]);

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    toast.success(
      `Sorted by SLA (${sortOrder === "asc" ? "Descending" : "Ascending"})`,
    );
  };

  const handleExportAudit = () => {
    if (tickets.length === 0) {
      toast.error("No tickets in queue to export.");
      return;
    }

    const headers = [
      "Ticket ID",
      "Branch/School",
      "Category",
      "Subject",
      "Priority Level",
      "Current Status",
      "SLA Progress (%)",
      "SLA Time Left",
      "Date Raised",
    ];

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return "";
      const stringified = String(field);
      if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const rows = tickets.map((t) => [
      t.id,
      t.branch,
      t.type,
      t.subject || t.title,
      t.priority === "C" ? "Critical" : t.priority === "H" ? "High" : "Medium",
      t.status,
      `${t.slaPercent}%`,
      t.slaTime,
      new Date(t.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `SLA_Audit_Report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("SLA Audit exported successfully!", { icon: "📊" });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 bg-[#fbfcfd] min-h-screen font-sans selection:bg-blue-100 overflow-x-hidden">
      <Toaster position="top-right" />

      {/* Modern Header Section */}
      <div className="mb-8 md:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span className="px-3 py-1 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-blue-200 shrink-0">
              System Live
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Clock size={12} /> Updated 1m ago
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            Priority{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              Management
            </span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-white p-2 sm:p-2.5 rounded-[1.5rem] sm:rounded-[30px] shadow-sm border border-gray-100 w-full lg:w-auto shrink-0">
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-gray-50 text-center flex flex-row sm:flex-col justify-between sm:justify-center items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase sm:mb-1">
              Queue
            </p>
            <p className="text-lg sm:text-xl font-black text-slate-800">
              {tickets.length}
            </p>
          </div>
          <button
            onClick={handleExportAudit}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all text-sm sm:text-base active:scale-95"
          >
            <Download size={16} className="shrink-0" /> Export SLA Audit
          </button>
        </div>
      </div>

      {/* Premium Search & Controls Bar */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] sm:rounded-[45px] shadow-xl shadow-blue-50/50 border border-white p-5 sm:p-6 md:p-10 mb-8 md:mb-10 min-w-0">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 lg:gap-8">
          <div className="relative flex-1 w-full lg:max-w-2xl group min-w-0">
            <Search className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-all w-5 h-5 sm:w-[22px] sm:h-[22px]" />
            <input
              type="text"
              placeholder="Search student, branch or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 sm:pl-16 pr-5 sm:pr-8 py-3.5 sm:py-5 bg-gray-50/50 rounded-[1.5rem] sm:rounded-[30px] border-2 border-transparent focus:border-blue-100 focus:bg-white outline-none text-sm sm:text-base font-semibold text-slate-700 transition-all shadow-inner"
            />
          </div>

          <div className="flex gap-2 sm:gap-3 shrink-0">
            {/* Functional Filter Button */}
            <div className="relative flex-1 sm:flex-none" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-full sm:w-auto flex items-center justify-center p-3.5 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all ${filterImpact !== "All" ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-white text-slate-400 border-gray-100 hover:text-blue-600 hover:shadow-md"}`}
              >
                <Filter size={20} className="sm:w-[22px] sm:h-[22px]" />
                <span className="sm:hidden ml-2 text-sm font-bold">Filter</span>
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 sm:mt-4 w-48 bg-white shadow-2xl border border-gray-50 rounded-[20px] sm:rounded-[25px] z-[110] p-2 animate-in fade-in slide-in-from-top-2">
                  {["All", "High", "Medium", "Low"].map((impact) => (
                    <button
                      key={impact}
                      onClick={() => {
                        setFilterImpact(impact);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-bold rounded-xl transition-all ${filterImpact === impact ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-gray-50"}`}
                    >
                      {impact} Impact
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Functional Sort Button */}
            <button
              onClick={toggleSort}
              className="flex-1 sm:flex-none flex items-center justify-center p-3.5 sm:p-5 bg-white border border-gray-100 rounded-[1.5rem] sm:rounded-3xl text-slate-400 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
            >
              <ArrowUpDown size={20} className="sm:w-[22px] sm:h-[22px]" />
              <span className="sm:hidden ml-2 text-sm font-bold">Sort</span>
            </button>
          </div>
        </div>

        {/* List Header (Desktop Only) */}
        <div className="hidden lg:grid grid-cols-5 px-12 mt-12 mb-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
          <div>Ticket Detail</div>
          <div>Branch</div>
          <div>Severity</div>
          <div className="text-center">SLA Health</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Dynamic Ticket Rows */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAndSortedTickets.map((ticket) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={ticket.id}
                className={`flex flex-col lg:grid lg:grid-cols-5 items-start lg:items-center p-5 sm:p-6 lg:px-10 lg:py-8 bg-white border border-gray-100 lg:border-gray-50 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[40px] hover:border-blue-200 hover:shadow-xl lg:hover:shadow-2xl transition-all group relative overflow-visible gap-4 lg:gap-0 ${activeMenu === ticket.id ? 'z-50' : 'z-10'}`}
              >
                {/* Mobile Top Row: ID, Branch & Impact */}
                <div className="flex lg:hidden justify-between items-start w-full mb-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-[11px] font-black text-blue-600 mb-0.5">
                      {ticket.id}
                    </span>
                    <span className="font-bold text-slate-500 text-xs sm:text-sm">
                      {ticket.branch}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                      ticket.impact === "High"
                        ? "bg-red-50 text-red-500 border-red-100"
                        : "bg-blue-50 text-blue-500 border-blue-100"
                    }`}
                  >
                    {ticket.impact} Impact
                  </span>
                </div>

                {/* ID & Type (Desktop left, Mobile title) */}
                <div className="flex flex-col w-full lg:w-auto">
                  <span className="hidden lg:block text-[11px] font-black text-blue-600 mb-1">
                    {ticket.id}
                  </span>
                  <h4 className="font-bold text-slate-800 text-base sm:text-lg">
                    {ticket.type} Issue
                  </h4>
                </div>

                {/* Branch (Desktop) */}
                <div className="hidden lg:block font-bold text-slate-500 text-sm">
                  {ticket.branch}
                </div>

                {/* Impact Badge (Desktop) */}
                <div className="hidden lg:block w-full lg:w-auto">
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      ticket.impact === "High"
                        ? "bg-red-50 text-red-500 border-red-100"
                        : "bg-blue-50 text-blue-500 border-blue-100"
                    }`}
                  >
                    {ticket.impact} Impact
                  </span>
                </div>

                {/* SLA Progress Bar */}
                <div className="flex flex-row lg:flex-col justify-between lg:justify-center items-center gap-2 w-full lg:w-auto">
                  <span className="lg:hidden text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">
                    SLA Health
                  </span>
                  <div className="flex flex-col items-end lg:items-center gap-1 sm:gap-2 w-1/2 lg:w-full">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ticket.slaPercent}%` }}
                        className={`h-full ${ticket.slaPercent > 80 ? "bg-red-500" : "bg-blue-500"}`}
                      ></motion.div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black text-orange-500 italic flex items-center gap-1">
                      <Clock size={10} className="sm:w-3 sm:h-3" />{" "}
                      {ticket.slaTime}
                    </span>
                  </div>
                </div>

                {/* Priority Switcher removed to enforce SLA derived priorities */}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 sm:gap-3 w-full lg:w-auto border-t border-slate-50 pt-4 lg:pt-0 lg:border-none relative mt-2 lg:mt-0">
                  <button
                    disabled={actionLoadingId === ticket._id}
                    onClick={() => handleResolve(ticket)}
                    className="flex-1 lg:flex-none p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                    aria-label="Resolve Ticket"
                  >
                    <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                    <span className="lg:hidden ml-2 text-xs font-bold">
                      Resolve
                    </span>
                  </button>

                  <div className="relative flex-1 lg:flex-none flex" ref={activeMenu === ticket.id ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === ticket.id ? null : ticket.id);
                      }}
                      className={`w-full lg:w-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center ${activeMenu === ticket.id ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-200"}`}
                    >
                      <MoreHorizontal size={18} className="sm:w-5 sm:h-5" />
                      <span className="lg:hidden ml-2 text-xs font-bold">
                        Options
                      </span>
                    </button>

                    {/* Action Dropdown Menu */}
                    {activeMenu === ticket.id && (
                      <div
                        className="absolute right-0 bottom-full mb-2 lg:bottom-auto lg:mb-0 lg:top-full lg:mt-4 w-48 sm:w-56 bg-white rounded-[20px] sm:rounded-[30px] shadow-2xl z-[100] p-2 sm:p-3 border border-gray-50 animate-in fade-in zoom-in-95 duration-200"
                      >
                        <button
                          onClick={() => handleEscalate(ticket)}
                          className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] font-black text-red-600 uppercase tracking-[0.2em] hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all"
                        >
                          Escalate L3
                        </button>
                        <button className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] hover:bg-blue-50 rounded-xl sm:rounded-2xl transition-all">
                          Verify Audit
                        </button>
                        <div className="h-[1px] bg-gray-50 my-1 sm:my-2 mx-2 sm:mx-3"></div>
                        <button
                          onClick={() => {
                            handleResolve(ticket);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-gray-50 rounded-xl sm:rounded-2xl transition-all"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="text-center py-12 sm:py-16 text-gray-400 font-bold italic border-2 border-dashed border-gray-200 rounded-3xl">
              Loading tickets...
            </div>
          )}
          {!loading && filteredAndSortedTickets.length === 0 && (
            <div className="text-center py-12 sm:py-16 text-gray-400 font-bold italic border-2 border-dashed border-gray-200 rounded-3xl">
              No tickets found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriorityManagement;
