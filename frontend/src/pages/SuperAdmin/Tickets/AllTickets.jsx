import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  MessageSquare,
  MoreVertical,
  Clock,
  Tag,
  AlertCircle,
  Eye,
  X,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  getSuperAdminTickets,
  getSuperAdminTicketDetails,
  resolveSuperAdminTicket,
  updateSuperAdminTicketStatus,
} from "../../../services/api/ticketApi";

const AllTickets = () => {
  // 1. Initial State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // Modal States
  const [viewingTicket, setViewingTicket] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetailsLoading, setViewDetailsLoading] = useState(false);

  const handleViewDetails = async (ticket) => {
    const targetId = ticket._id || ticket.id;
    try {
      setViewDetailsLoading(true);
      setViewModalOpen(true);
      setViewingTicket(null); // Clear previous details

      const response = await getSuperAdminTicketDetails(targetId);
      if (response && response.success) {
        setViewingTicket(response.data);
      } else {
        toast.error("Failed to load ticket details");
        setViewModalOpen(false);
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load ticket details");
      setViewModalOpen(false);
    } finally {
      setViewDetailsLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const statusFilter =
        filter === "ALL"
          ? "all"
          : filter === "PENDING"
            ? "in_progress"
            : filter.toLowerCase();
      const response = await getSuperAdminTickets({
        search: search.trim() || undefined,
        status: statusFilter,
        limit: 100,
      });
      setTickets(response?.data?.tickets || []);
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
  }, [search, filter]);

  // Handle ESC key close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && viewModalOpen) {
        setViewModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewModalOpen]);

  // 2. Robust Local Filtering
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchTerm = search.toLowerCase().trim();
      const matchesSearch =
        !searchTerm ||
        (ticket.id && String(ticket.id).toLowerCase().includes(searchTerm)) ||
        (ticket.branch && ticket.branch.toLowerCase().includes(searchTerm)) ||
        (ticket.subject && ticket.subject.toLowerCase().includes(searchTerm));

      const tStatus = (ticket.status || "").toLowerCase();
      const matchesFilter =
        filter === "ALL" ||
        (filter === "PENDING" && tStatus === "in_progress") ||
        (filter === "OPEN" && tStatus === "open") ||
        (filter === "RESOLVED" && tStatus === "resolved") ||
        tStatus === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [tickets, search, filter]);

  // 3. Handlers
  const handleStatusChange = async (ticket, newStatus) => {
    const targetId = ticket._id || ticket.id;

    try {
      setActionLoadingId(targetId);
      if (newStatus === "RESOLVED") {
        await resolveSuperAdminTicket(targetId);
      } else {
        const mappedStatus =
          newStatus === "PENDING" ? "in_progress" : newStatus.toLowerCase();
        await updateSuperAdminTicketStatus(targetId, mappedStatus);
      }
      toast.success(`Ticket ${ticket.id || targetId} marked as ${newStatus}`);
      await loadTickets();
    } catch (error) {
      toast.error(error?.message || "Failed to update ticket");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#f8faff] min-h-screen font-sans overflow-x-hidden">
      <Toaster />

      {/* Header Section */}
      <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div className="w-full md:w-auto min-w-0">
          <p className="text-[10px] md:text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <Tag size={14} className="shrink-0" /> Support Management
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight truncate">
            All <span className="text-blue-600">Tickets</span>
          </h2>
        </div>

        {/* Quick Stats */}
        <div className="flex w-full md:w-auto shrink-0">
          <div className="px-5 py-3.5 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full justify-center md:justify-start">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0"></div>
            <span className="text-xs sm:text-sm font-bold text-slate-600">
              {
                tickets.filter(
                  (t) => t.status !== "RESOLVED" && t.status !== "resolved",
                ).length
              }{" "}
              Active Issues
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[45px] shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 min-w-0">
        {/* Search & Filter Bar */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center mb-6 md:mb-10 gap-4 sm:gap-6">
          <div className="relative flex-1 w-full xl:max-w-md group min-w-0">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <input
              type="text"
              placeholder="Search by Branch, Subject or Ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-3.5 md:py-4 bg-gray-50 rounded-xl sm:rounded-2xl outline-none text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all border-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto shrink-0">
            {["ALL", "OPEN", "PENDING", "RESOLVED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 xl:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  filter === status
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                    : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {!loading &&
            filteredTickets.map((ticket) => {
              const targetId = ticket._id || ticket.id;
              const displayStatus =
                ticket.status === "in_progress"
                  ? "PENDING"
                  : (ticket.status || "").toUpperCase();

              return (
                <div
                  key={targetId}
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 sm:p-6 md:p-8 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl md:rounded-[35px] hover:border-blue-200 hover:shadow-lg transition-all group relative gap-4 md:gap-6 min-w-0"
                >
                  <div className="flex flex-col sm:flex-row md:items-center gap-4 sm:gap-6 flex-1 min-w-0">
                    {/* Ticket ID & Branch */}
                    <div className="w-full sm:w-1/3 md:w-1/4 shrink-0 min-w-0">
                      <div
                        className="text-sm sm:text-base font-black text-slate-800 truncate"
                        title={ticket.id || targetId}
                      >
                        {ticket.id || targetId}
                      </div>
                      <div
                        className="text-[10px] sm:text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tighter truncate"
                        title={ticket.branch}
                      >
                        {ticket.branch || "Unknown Branch"}
                      </div>
                    </div>

                    {/* Subject & Category */}
                    <div className="w-full sm:flex-1 min-w-0">
                      <p
                        className="text-sm sm:text-base font-bold text-slate-700 break-words"
                        title={ticket.subject}
                      >
                        {ticket.subject}
                      </p>
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-500/80 uppercase tracking-widest block mt-1.5 truncate">
                        {ticket.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 border-t md:border-none border-gray-50 pt-4 md:pt-0 w-full md:w-auto shrink-0">
                    {/* Priority & Status */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${
                          (ticket.priority || "").toUpperCase() === "CRITICAL"
                            ? "bg-red-50 text-red-600 border-red-100"
                            : (ticket.priority || "").toUpperCase() === "HIGH"
                              ? "bg-orange-50 text-orange-600 border-orange-100"
                              : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        {ticket.priority || "NORMAL"}
                      </span>
                      <div
                        className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest md:hidden ${displayStatus === "RESOLVED" ? "text-green-500" : displayStatus === "PENDING" ? "text-orange-500" : "text-blue-500"}`}
                      >
                        {displayStatus}
                      </div>
                    </div>

                    {/* Status (desktop only) & Time & Actions */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <div className="text-right">
                        <div
                          className={`hidden md:block text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${displayStatus === "RESOLVED" ? "text-green-500" : displayStatus === "PENDING" ? "text-orange-500" : "text-blue-500"}`}
                        >
                          {displayStatus}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1 justify-end italic whitespace-nowrap">
                          <Clock size={12} className="shrink-0" />{" "}
                          {ticket.time ||
                            new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* ✅ HOVER GAP FIX APPLIED HERE */}
                      <div className="relative group/menu">
                        <button className="p-2 sm:p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-100">
                          <MoreVertical size={18} className="sm:w-5 sm:h-5" />
                        </button>

                        {/* Invisible wrapper with pt-2 (padding-top) creates the hover bridge */}
                        <div className="absolute right-0 top-full pt-2 w-44 z-20 hidden group-hover/menu:block focus-within:block animate-in fade-in zoom-in-95 duration-200">
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-2">
                            <button
                              onClick={() => handleViewDetails(ticket)}
                              className="w-full text-left px-4 py-3 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-xl uppercase transition-colors flex items-center gap-2 mb-1"
                            >
                              <Eye size={12} /> View Details
                            </button>
                            <button
                              disabled={actionLoadingId === targetId}
                              onClick={() =>
                                handleStatusChange(ticket, "RESOLVED")
                              }
                              className="w-full text-left px-4 py-3 text-[10px] font-black text-green-600 hover:bg-green-50 rounded-xl uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Mark Resolved
                            </button>
                            <button
                              disabled={actionLoadingId === targetId}
                              onClick={() =>
                                handleStatusChange(ticket, "PENDING")
                              }
                              className="w-full text-left px-4 py-3 text-[10px] font-black text-orange-600 hover:bg-orange-50 rounded-xl uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                            >
                              Move to Pending
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {!loading && filteredTickets.length === 0 && (
            <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[40px] bg-slate-50/50">
              <MessageSquare
                size={48}
                className="mx-auto text-gray-300 mb-4 sm:w-[56px] sm:h-[56px]"
              />
              <p className="text-gray-500 font-bold italic text-sm sm:text-base">
                No support tickets found matching your criteria.
              </p>
            </div>
          )}
          {loading && (
            <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[40px] bg-slate-50/50 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-bold italic text-sm sm:text-base mt-2">
                Loading tickets...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {viewModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewModalOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white w-full max-w-[92vw] md:max-w-[85vw] lg:max-w-[75vw] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 z-10"
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Support Ticket Details</p>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
                      {viewingTicket ? viewingTicket.ticket?.id : "Loading..."}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 shrink-0 transition-colors ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto custom-scrollbar flex-1 px-6 sm:px-8 py-6 sm:py-8">
                {viewDetailsLoading ? (
                  <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-250 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 font-bold italic text-sm mt-2">
                      Retrieving ticket details...
                    </p>
                  </div>
                ) : viewingTicket ? (
                  <div className="space-y-8">
                    {/* Status and Priority Summary Banner */}
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          viewingTicket.ticket?.status === "resolved" || viewingTicket.ticket?.status === "RESOLVED"
                            ? "bg-green-50 text-green-600 border border-green-100"
                            : viewingTicket.ticket?.status === "in_progress" || viewingTicket.ticket?.status === "IN_PROGRESS" || viewingTicket.ticket?.status === "PENDING"
                            ? "bg-orange-50 text-orange-600 border border-orange-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}>
                          {viewingTicket.ticket?.status || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority:</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          viewingTicket.ticket?.priority === "critical" || viewingTicket.ticket?.priority === "CRITICAL"
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : viewingTicket.ticket?.priority === "high" || viewingTicket.ticket?.priority === "HIGH"
                            ? "bg-orange-50 text-orange-600 border border-orange-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}>
                          {viewingTicket.ticket?.priority || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category:</span>
                        <span className="px-3 py-1 bg-slate-200/50 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {viewingTicket.ticket?.category || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Grid Layout for Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* 1. TICKET INFORMATION */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          Ticket Information
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                            <p className="text-sm font-semibold text-slate-800">{viewingTicket.ticket?.title || viewingTicket.ticket?.subject || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                              {viewingTicket.ticket?.description || "N/A"}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {viewingTicket.ticket?.raisedBy?.name || "N/A"}
                                <span className="text-[9px] text-gray-400 block uppercase">
                                  {viewingTicket.ticket?.raisedByRole || "N/A"}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {viewingTicket.ticket?.assignedTo?.name || "Unassigned"}
                                {viewingTicket.ticket?.assignedToRole && (
                                  <span className="text-[9px] text-gray-400 block uppercase">
                                    {viewingTicket.ticket?.assignedToRole}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. STUDENT INFORMATION */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          Student Information
                        </h3>
                        {viewingTicket.studentDetails ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</p>
                              <p className="text-sm font-semibold text-slate-800">{viewingTicket.studentDetails.studentName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admission Number</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.admissionNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.rollNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.class}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.section}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father's Name</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.fatherName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother's Name</p>
                              <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.motherName}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400 italic">
                            No student linked to this ticket
                          </div>
                        )}
                      </div>

                      {/* 3. SCHOOL INFORMATION */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          School & Branch Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School / Branch Name</p>
                            <p className="text-sm font-semibold text-slate-800">
                              {viewingTicket.ticket?.school?.schoolName || viewingTicket.ticket?.branch || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Code</p>
                            <p className="text-xs font-semibold text-slate-800">
                              {viewingTicket.ticket?.school?.branchId || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Principal Name</p>
                            <p className="text-xs font-semibold text-slate-800">
                              {viewingTicket.ticket?.school?.principalName || "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Address</p>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              {viewingTicket.ticket?.school?.address || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 4. CONTACT INFORMATION */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          Contact Information
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {viewingTicket.studentDetails ? (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent Mobile</p>
                                  <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.parentMobile}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent Email</p>
                                  <p className="text-xs font-semibold text-slate-800 truncate" title={viewingTicket.studentDetails.parentEmail}>
                                    {viewingTicket.studentDetails.parentEmail}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Mobile</p>
                                  <p className="text-xs font-semibold text-slate-800">{viewingTicket.studentDetails.studentMobile}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Email</p>
                                  <p className="text-xs font-semibold text-slate-800 truncate" title={viewingTicket.studentDetails.studentEmail}>
                                    {viewingTicket.studentDetails.studentEmail}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitter Email</p>
                                <p className="text-xs font-semibold text-slate-800">
                                  {viewingTicket.ticket?.raisedBy?.email || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitter Contact</p>
                                <p className="text-xs font-semibold text-slate-800">
                                  {viewingTicket.ticket?.raisedBy?.phone || "N/A"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. ISSUE DETAILS & RESOLUTION */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          Issue Details & Resolution
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Details</p>
                            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl mt-1 leading-relaxed min-h-[60px] whitespace-pre-wrap">
                              {viewingTicket.ticket?.resolutionNote || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Date</p>
                            <p className="text-xs font-semibold text-slate-800 mt-2">
                              {viewingTicket.ticket?.resolvedAt
                                ? new Date(viewingTicket.ticket.resolvedAt).toLocaleString("en-IN")
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments</p>
                            <div className="mt-2 space-y-1">
                              {viewingTicket.ticket?.attachments && viewingTicket.ticket.attachments.length > 0 ? (
                                viewingTicket.ticket.attachments.map((file, i) => (
                                  <a
                                    key={i}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                                  >
                                    <FileText size={14} />
                                    {file.name || `Attachment ${i + 1}`}
                                  </a>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">No attachments provided</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 6. CONVERSATION MESSAGES TIMELINE */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                          Ticket Message History
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {viewingTicket.ticket?.responses && viewingTicket.ticket.responses.length > 0 ? (
                            viewingTicket.ticket.responses.map((resp, i) => {
                              const isSubmitter = resp.user?._id === viewingTicket.ticket.raisedBy?._id;
                              return (
                                <div
                                  key={resp._id || i}
                                  className={`flex flex-col ${isSubmitter ? "items-start" : "items-end"}`}
                                >
                                  <div className="max-w-[80%] space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 px-1">
                                      <span className="font-bold text-slate-600">{resp.user?.name || "Staff"}</span>
                                      <span className="uppercase">({resp.user?.role || "Staff"})</span>
                                      <span>•</span>
                                      <span>{new Date(resp.createdAt).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                      isSubmitter
                                        ? "bg-slate-100 text-slate-800 rounded-tl-none"
                                        : "bg-blue-600 text-white rounded-tr-none"
                                    }`}>
                                      <p className="whitespace-pre-wrap">{resp.message}</p>
                                      {resp.attachments && resp.attachments.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                                          {resp.attachments.map((file, j) => (
                                            <a
                                              key={j}
                                              href={file.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                                isSubmitter ? "text-blue-600 hover:text-blue-800" : "text-white/90 hover:text-white"
                                              }`}
                                            >
                                              <FileText size={12} />
                                              {file.name || `Attachment ${j + 1}`}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 text-center text-xs text-slate-400 italic">
                              No responses logged for this ticket
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 7. AUDIT INFORMATION */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">
                          Audit Log
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Created At</span>
                            <span className="font-semibold text-slate-700">
                              {viewingTicket.ticket?.createdAt
                                ? new Date(viewingTicket.ticket.createdAt).toLocaleString("en-IN")
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Last Updated At</span>
                            <span className="font-semibold text-slate-700">
                              {viewingTicket.ticket?.updatedAt
                                ? new Date(viewingTicket.ticket.updatedAt).toLocaleString("en-IN")
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Closed At</span>
                            <span className="font-semibold text-slate-700">
                              {viewingTicket.ticket?.closedAt
                                ? new Date(viewingTicket.ticket.closedAt).toLocaleString("en-IN")
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-red-500 font-bold">
                    Failed to load ticket details.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 py-4 sm:py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AllTickets;
