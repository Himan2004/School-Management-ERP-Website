import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Eye,
  CheckCircle,
  Loader2,
  UserRound,
  ArrowUpRight,
  AlertTriangle,
  Plus,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

// API Imports
import {
  getMyTickets,
  getHelpDeskTickets,
  getTicketDetails,
  createTicket,
  updateTicket,
  escalateTicket,
  getAdminStaffList,
  assignComplaint,
  closeComplaint,
  returnBackComplaint,
} from "../../services/api/commonTicketApi";

// Custom UI Components
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  Grid,
  Button,
  UserChat,
  PanelModal,
  DataField,
  SelectField,
  Option,
} from "../../components/shared/Common_Components";

// ─── ✨ COOL SKELETON LOADERS ✨ ───────────────────────────────────────────

const StatsSkeleton = () => (
  <DashGrid cols={12} gap={4}>
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center gap-4"
      >
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 z-10"></div>
        {/* Icon placeholder */}
        <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse"></div>
        {/* Text placeholders */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-20 h-3 bg-slate-100 rounded-md animate-pulse"></div>
          <div className="w-12 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    ))}
  </DashGrid>
);

const TableSkeleton = () => (
  <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 z-10 pointer-events-none"></div>
    {/* Fake Table Header Area */}
    <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
      <div className="w-40 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
      <div className="flex gap-3">
        <div className="w-32 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
        <div className="w-64 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    </div>
    {/* Fake Table Rows */}
    <div className="p-4">
      <div className="flex justify-between p-4 border-b border-slate-100 bg-slate-50/30 rounded-xl mb-3">
        <div className="w-16 h-3 bg-slate-200 rounded animate-pulse"></div>
        <div className="w-32 h-3 bg-slate-200 rounded animate-pulse"></div>
        <div className="w-20 h-3 bg-slate-200 rounded animate-pulse"></div>
        <div className="w-20 h-3 bg-slate-200 rounded animate-pulse"></div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"
        >
          <div className="flex flex-col gap-2">
            <div className="w-20 h-4 bg-slate-200 rounded-md animate-pulse"></div>
            <div className="w-14 h-2 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-48 h-4 bg-slate-200 rounded-md animate-pulse"></div>
            <div className="w-24 h-2 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
          <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
          <div className="w-24 h-6 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

// ───────────────────────────────────────────────────────────────────────────

const AdminSupport = () => {
  const currentUser = useSelector((state) => state.auth?.user);
  const location = useLocation();

  // Tab State
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const queryTab = params.get("tab");
    if (queryTab === "helpdesk") return "helpdesk";
    if (queryTab === "mytickets") return "mytickets";
    return location.pathname.endsWith("/tickets") ? "mytickets" : "helpdesk";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTab = params.get("tab");
    if (queryTab === "helpdesk") {
      setActiveTab("helpdesk");
    } else if (queryTab === "mytickets") {
      setActiveTab("mytickets");
    } else {
      setActiveTab(location.pathname.endsWith("/tickets") ? "mytickets" : "helpdesk");
    }
  }, [location.pathname, location.search]);

  // Load ticket specified in query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTicketId = params.get("ticketId") || params.get("ticket");
    if (queryTicketId) {
      fetchTickets();
      
      const loadTicketFromQuery = async () => {
        try {
          setIsDetailsLoading(true);
          setSelectedTicketId(queryTicketId);
          const response = await getTicketDetails(queryTicketId);
          if (response.success) {
            setTicketDetails(response.data);
          }
        } catch (error) {
          console.error("Failed to load ticket from query param:", error);
          setSelectedTicketId(null);
        } finally {
          setIsDetailsLoading(false);
        }
      };
      loadTicketFromQuery();
    }
  }, [location.search]);

  // List States
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  // Detail View States
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Create Ticket Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    category: "general",
    priority: "medium",
    description: "",
    assignedToRole: "super_admin",
  });

  // Escalation Modal States
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  // Admin complaint states
  const [staffList, setStaffList] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignRemarks, setAssignRemarks] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const response = await getAdminStaffList();
        if (response.success) {
          setStaffList(response.data || []);
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      }
    };
    if (currentUser?.role === "admin") {
      loadStaff();
    }
  }, [currentUser]);

  const handleCloseComplaint = async () => {
    try {
      const response = await closeComplaint(selectedTicketId, { remarks: "Closed by Admin" });
      if (response.success) {
        toast.success("Complaint closed successfully");
        setTicketDetails(response.data);
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.message || "Failed to close complaint");
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) return toast.error("Please select a staff member");
    try {
      setIsAssigning(true);
      const response = await assignComplaint(selectedTicketId, {
        staffId: selectedStaffId,
        remarks: assignRemarks
      });
      if (response.success) {
        toast.success("Complaint assigned successfully");
        setIsAssignModalOpen(false);
        setSelectedStaffId("");
        setAssignRemarks("");
        setTicketDetails(response.data);
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.message || "Failed to assign complaint");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReturnBack = async (e) => {
    e.preventDefault();
    try {
      setIsReturning(true);
      const response = await returnBackComplaint(selectedTicketId, { remarks: returnRemarks });
      if (response.success) {
        toast.success("Complaint returned back to teacher successfully");
        setIsReturnModalOpen(false);
        setReturnRemarks("");
        setTicketDetails(response.data);
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.message || "Failed to return complaint");
    } finally {
      setIsReturning(false);
    }
  };

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response =
        activeTab === "mytickets"
          ? await getMyTickets({})
          : await getHelpDeskTickets({});

      if (response.success) {
        setTickets(response.data.tickets);
        setStats({
          total: response.data.stats.total || 0,
          open: response.data.stats.open || 0,
          inProgress: response.data.stats.inProgress || 0,
          resolved: response.data.stats.resolved || 0,
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTicketId) fetchTickets();
  }, [activeTab, selectedTicketId]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description) {
      return toast.error("Subject and description are required");
    }

    try {
      setIsSubmitting(true);
      const response = await createTicket(newTicket);
      if (response.success) {
        toast.success("Ticket raised successfully");
        setIsCreateModalOpen(false);
        setNewTicket({
          title: "",
          category: "general",
          priority: "medium",
          description: "",
          assignedToRole: "super_admin",
        });
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = async (row) => {
    try {
      setIsDetailsLoading(true);
      setSelectedTicketId(row._id);
      const response = await getTicketDetails(row._id);
      if (response.success) setTicketDetails(response.data);
    } catch (error) {
      toast.error("Failed to load ticket details");
      setSelectedTicketId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await updateTicket(selectedTicketId, {
        message: msgObj.text,
      });
      if (response.success) setTicketDetails(response.data);
    } catch (error) {
      toast.error(error.message || "Failed to send reply");
    }
  };

  const handleResolve = async () => {
    try {
      const response = await updateTicket(selectedTicketId, {
        status: "resolved",
        resolutionNote: "Resolved by Admin",
      });
      if (response.success) {
        toast.success("Ticket marked as resolved");
        setTicketDetails(response.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) return toast.error("Reason required");

    try {
      setIsEscalating(true);
      const response = await escalateTicket(selectedTicketId, {
        reason: escalationReason.trim(),
        escalatedToRole: "super_admin",
      });

      if (response.success) {
        toast.success("Ticket escalated successfully");
        setTicketDetails(response.data);
        setIsEscalationModalOpen(false);
        setEscalationReason("");
      }
    } catch (error) {
      toast.error(error.message || "Failed to escalate");
    } finally {
      setIsEscalating(false);
    }
  };

  // ── Style Helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (p) => {
    switch (p?.toLowerCase()) {
      case "critical":
        return "bg-rose-50 text-rose-600 border-rose-200";
      case "high":
        return "bg-amber-50 text-amber-600 border-amber-200";
      case "low":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      default:
        return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  const getStatusStyle = (s) => {
    switch (s?.toLowerCase()) {
      case "resolved":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "in_progress":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "closed":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "escalated":
        return "bg-purple-50 text-purple-600 border-purple-200";
      default:
        return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  const getColumns = () => {
    const baseColumns = [
      {
        key: "id",
        label: "Ticket",
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-black text-[#223F74]">
              ...{row._id.slice(-6).toUpperCase()}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {new Date(row.createdAt).toLocaleDateString()}
            </span>
          </div>
        ),
      },
      {
        key: "title",
        label: "Subject",
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 line-clamp-1">{val}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
              {row.category}
            </span>
          </div>
        ),
      },
      {
        key: "priority",
        label: "Priority",
        align: "center",
        render: (val) => (
          <span
            className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getPriorityStyle(val)}`}
          >
            {val}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        align: "right",
        render: (val) => (
          <span
            className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getStatusStyle(val)}`}
          >
            {val.replace("_", " ")}
          </span>
        ),
      },
    ];

    if (activeTab === "helpdesk") {
      baseColumns.splice(1, 0, {
        key: "raisedBy",
        label: "Reporter",
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">
              {row.raisedBy?.name || "Unknown"}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {row.raisedByRole?.replace("_", " ")}
            </span>
          </div>
        ),
      });
    }

    return baseColumns;
  };

  // ── Render: Ticket Detail View ────────────────────────────────────────────
  if (selectedTicketId) {
    if (isDetailsLoading || !ticketDetails) {
      return (
        <div className="w-full max-w-[1600px] mx-auto py-20 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#223F74]" size={32} />
          <p className="text-[#223F74] font-bold tracking-widest uppercase text-xs">
            Loading Ticket Data...
          </p>
        </div>
      );
    }

    const isCreatorMe = ticketDetails.raisedBy?._id === currentUser?._id;
    const initialMessage = {
      sender: isCreatorMe ? "Me" : ticketDetails.raisedBy?.name || "User",
      time: new Date(ticketDetails.createdAt).toLocaleString(),
      text: ticketDetails.description,
    };

    const threadMessages = (ticketDetails.responses || []).map((res) => ({
      sender:
        res.user?._id === currentUser?._id ? "Me" : res.user?.name || "Support",
      time: new Date(res.createdAt).toLocaleString(),
      text: res.message,
    }));

    const chatMessages = [initialMessage, ...threadMessages];
    const isClosed = ["resolved", "closed"].includes(
      ticketDetails.status?.toLowerCase(),
    );

    const canEscalate =
      activeTab === "helpdesk" &&
      !isClosed &&
      ticketDetails.assignedToRole === currentUser?.role;

    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
        <Toaster />

        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>

          <div className="flex gap-3">
            {ticketDetails.isComplaint ? (
              <>
                {!isClosed && ticketDetails.status?.toLowerCase() !== "resolved" && (
                  <>
                    <Button
                      text="Return Back"
                      variant="secondary"
                      icon={<ArrowLeft size={16} />}
                      size={3}
                      onClick={() => setIsReturnModalOpen(true)}
                    />
                    <Button
                      text="Mark Resolved"
                      variant="success"
                      icon={<CheckCircle2 size={16} />}
                      size={3}
                      onClick={handleResolve}
                    />
                  </>
                )}
                {ticketDetails.status?.toLowerCase() === "resolved" && (
                  <Button
                    text="Close Complaint"
                    variant="secondary"
                    icon={<CheckCircle size={16} />}
                    size={3}
                    onClick={handleCloseComplaint}
                  />
                )}
              </>
            ) : (
              <>
                {canEscalate && (
                  <Button
                    text="Escalate"
                    variant="danger"
                    icon={<ArrowUpRight size={16} />}
                    size={3}
                    onClick={() => setIsEscalationModalOpen(true)}
                  />
                )}
                {!isClosed && (
                  <Button
                    text="Mark Resolved"
                    variant="success"
                    icon={<CheckCircle2 size={16} />}
                    size={3}
                    onClick={handleResolve}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <Grid cols={12} gap={6}>
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {ticketDetails.title}
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  Ticket ID: {ticketDetails._id}
                </p>
              </div>
              <span
                className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${getStatusStyle(ticketDetails.status)}`}
              >
                {ticketDetails.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex-1 p-6 bg-slate-50/30 overflow-hidden">
              <UserChat
                messages={chatMessages}
                onSend={handleReply}
                currentUser="Me"
                maxHeight="h-[520px]"
                readOnly={isClosed}
                showAttach={false}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit space-y-5">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-2 border-b border-slate-100 pb-4">
                Ticket Details
              </h3>

              {activeTab === "helpdesk" && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <UserRound size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Raised By
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {ticketDetails.raisedBy?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {ticketDetails.raisedByRole?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Category
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {ticketDetails.category.replace("_", " ")}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                    Priority
                  </p>
                  <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full border inline-block uppercase tracking-widest ${getPriorityStyle(ticketDetails.priority)}`}
                  >
                    {ticketDetails.priority}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Timeline
                </p>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Opened:</span>
                    <span className="text-slate-700">
                      {new Date(ticketDetails.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Last Active:</span>
                    <span className="text-slate-700">
                      {new Date(ticketDetails.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {ticketDetails.escalationLevel > 0 && (
              <div className="bg-purple-50 rounded-3xl border border-purple-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-900 uppercase tracking-widest">
                      Escalation Log
                    </h4>
                    <p className="text-xs text-purple-600 font-bold">
                      Level {ticketDetails.escalationLevel} Escalation
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {ticketDetails.escalationLog?.map((log, i) => (
                    <div
                      key={i}
                      className="text-sm bg-white p-3 rounded-xl border border-purple-100 shadow-sm"
                    >
                      <p className="text-slate-700 font-medium italic">
                        "{log.reason}"
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                        {new Date(log.escalatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Grid>

        <PanelModal
          id="escalation-modal"
          title="Escalate Ticket"
          isVisible={isEscalationModalOpen}
          onClose={() => setIsEscalationModalOpen(false)}
          size="md"
        >
          <form onSubmit={handleEscalate} className="space-y-6">
            <Grid cols={1} gap={4}>
              <DataField
                id="escalationReason"
                type="textarea"
                label="Reason for Escalation *"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={4}
              />
            </Grid>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => setIsEscalationModalOpen(false)}
                size={4}
              />
              <Button
                text={isEscalating ? "Escalating..." : "Confirm"}
                icon={
                  isEscalating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowUpRight size={16} />
                  )
                }
                variant="danger"
                type="submit"
                disabled={isEscalating || !escalationReason.trim()}
                size={6}
              />
            </div>
          </form>
        </PanelModal>
      </div>
    );
  }

  // ── Render: Main Dashboard List View ──────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      <Toaster />

      <Heading
        primaryText="Support Desk"
        secondaryText="Issue Tracker"
        size={12}
        action={
          <Button
            text="Raise New Ticket"
            icon={<Plus size={16} />}
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          />
        }
      />

      <div className="flex bg-white p-1.5 rounded-xl w-full max-w-sm shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveTab("helpdesk")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "helpdesk"
              ? "bg-[#223F74] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Help Desk Queue
        </button>
        <button
          onClick={() => setActiveTab("mytickets")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "mytickets"
              ? "bg-[#223F74] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          My Tickets
        </button>
      </div>

      <div className="mt-6 mb-8">
        {loading ? (
          <StatsSkeleton />
        ) : (
          <DashGrid cols={12} gap={4}>
            <DashCard
              icon={<ShieldAlert size={22} />}
              title="Open Tickets"
              value={stats.open}
              accentColor="#ef4444"
              size={3}
            />
            <DashCard
              icon={<Clock size={22} />}
              title="In Progress"
              value={stats.inProgress}
              accentColor="#f59e0b"
              size={3}
            />
            <DashCard
              icon={<CheckCircle size={22} />}
              title="Resolved"
              value={stats.resolved}
              accentColor="#10b981"
              size={3}
            />
            <DashCard
              icon={<MessageSquare size={22} />}
              title="Total Handled"
              value={stats.total}
              accentColor="#3b82f6"
              size={3}
            />
          </DashGrid>
        )}
      </div>

      <div className="mb-8">
        {loading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            title={
              activeTab === "helpdesk"
                ? "Incoming Staff Tickets"
                : "My Raised Tickets"
            }
            columns={getColumns()}
            rows={tickets}
            actions={[
              {
                icon: <Eye size={16} />,
                tooltip: "View Ticket",
                variant: "primary",
                onClick: (row) => handleViewTicket(row),
              },
            ]}
            filters={[
              {
                title: "Category",
                type: "select",
                key: "category",
                options: [
                  "academic",
                  "fee",
                  "discipline",
                  "transport",
                  "general",
                  "complaint",
                  "query",
                ],
              },
              {
                title: "Status",
                type: "select",
                key: "status",
                options: [
                  "open",
                  "in_progress",
                  "escalated",
                  "resolved",
                  "closed",
                ],
              },
            ]}
            searchable={true}
            size={12}
            pageSize={10}
          />
        )}
      </div>

      <PanelModal
        id="create-ticket-modal"
        title="Raise a Support Ticket"
        isVisible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewTicket({
            title: "",
            category: "general",
            priority: "medium",
            description: "",
            assignedToRole: "super_admin",
          });
        }}
        size="md"
      >
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <Grid cols={1} gap={4}>
            <DataField
              id="title"
              label="Subject *"
              value={newTicket.title}
              onChange={(e) =>
                setNewTicket({ ...newTicket, title: e.target.value })
              }
              placeholder="Brief summary of the issue"
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="category"
                label="Category"
                value={newTicket.category}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, category: e.target.value })
                }
              >
                <Option value="academic" label="Academic" />
                <Option value="fee" label="Finance & Fee" />
                <Option value="discipline" label="Discipline" />
                <Option value="transport" label="Transport" />
                <Option value="general" label="General" />
                <Option value="complaint" label="Complaint" />
                <Option value="query" label="Query" />
              </SelectField>

              <SelectField
                id="priority"
                label="Priority"
                value={newTicket.priority}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, priority: e.target.value })
                }
              >
                <Option value="low" label="Low" />
                <Option value="medium" label="Medium" />
                <Option value="high" label="High" />
                <Option value="critical" label="Critical" />
              </SelectField>
            </div>

            <SelectField
              id="assignedToRole"
              label="Assign To *"
              value={newTicket.assignedToRole}
              onChange={(e) =>
                setNewTicket({ ...newTicket, assignedToRole: e.target.value })
              }
            >
              <Option value="principal" label="Principal" />
              <Option value="super_admin" label="Super Admin / HQ" />
              <Option value="graphura_admin" label="Graphura Support" />
            </SelectField>

            <DataField
              id="description"
              type="textarea"
              label="Description *"
              value={newTicket.description}
              onChange={(e) =>
                setNewTicket({ ...newTicket, description: e.target.value })
              }
              placeholder="Provide detailed information about your request..."
              rows={4}
            />
          </Grid>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              size={4}
            />
            <Button
              text={isSubmitting ? "Submitting..." : "Submit Ticket"}
              type="submit"
              variant="primary"
              disabled={
                isSubmitting || !newTicket.title || !newTicket.description
              }
              loading={isSubmitting}
              size={6}
            />
          </div>
        </form>
      </PanelModal>

      {/* Assign Complaint Modal */}
      <PanelModal
        id="assign-complaint-modal"
        title="Assign Complaint to Staff"
        isVisible={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedStaffId("");
          setAssignRemarks("");
        }}
        size="md"
      >
        <form onSubmit={handleAssign} className="space-y-6">
          <Grid cols={1} gap={4}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Select Staff Member *
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white"
                required
              >
                <option value="">-- Select Staff --</option>
                {staffList.map(staff => (
                  <option key={staff._id} value={staff._id}>{staff.name} ({staff.role})</option>
                ))}
              </select>
            </div>

            <DataField
              id="assignRemarks"
              type="textarea"
              label="Assignment Remarks / Instructions"
              value={assignRemarks}
              onChange={(e) => setAssignRemarks(e.target.value)}
              placeholder="Provide instructions to the assigned staff member..."
              rows={3}
            />
          </Grid>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
              size={4}
            />
            <Button
              text={isAssigning ? "Assigning..." : "Assign"}
              type="submit"
              variant="primary"
              disabled={isAssigning || !selectedStaffId}
              loading={isAssigning}
              size={6}
            />
          </div>
        </form>
      </PanelModal>

      {/* Return back / De-escalate Modal */}
      <PanelModal
        id="return-complaint-modal"
        title="Return Complaint to Subject Teacher"
        isVisible={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnRemarks("");
        }}
        size="md"
      >
        <form onSubmit={handleReturnBack} className="space-y-6">
          <Grid cols={1} gap={4}>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-700">
                This will send the complaint back to the Subject Teacher who raised/escalated it.
              </p>
            </div>
            <DataField
              id="returnRemarks"
              type="textarea"
              label="Feedback / Reasons *"
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              placeholder="Provide instructions or feedback to the teacher..."
              rows={4}
              required
            />
          </Grid>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => setIsReturnModalOpen(false)}
              size={4}
            />
            <Button
              text={isReturning ? "Returning..." : "Confirm Return"}
              type="submit"
              variant="danger"
              disabled={isReturning || !returnRemarks.trim()}
              loading={isReturning}
              size={6}
            />
          </div>
        </form>
      </PanelModal>
    </div>
  );
};

export default AdminSupport;
