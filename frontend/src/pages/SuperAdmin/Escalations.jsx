import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Eye,
  CheckCircle,
  Building2,
  UserRound,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";


import {
  getSuperAdminTickets,
  getSuperAdminTicketDetails,
  updateSuperAdminTicketStatus,
  resolveSuperAdminTicket,
  escalateSuperAdminTicket,
  replyToSuperAdminTicket,
} from "../../services/api/ticketApi.js";

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
} from "../../components/shared/Common_Components.jsx";

const HQSupportDesk = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  // View ticket state
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Escalation state
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  const currentUser = useSelector((state) => state.superAdmin?.superAdmin);

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await getSuperAdminTickets({});
      if (response.success) {
        setTickets(response.data.tickets);
        setStats({
          total: response.data.stats.total || 0,
          open: response.data.stats.open || 0,
          inProgress: response.data.stats.pending || 0, // Maps to 'pending' from your stats controller
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
  }, [selectedTicketId]);

  // Fetch full details including responses when a ticket is clicked
  const handleViewTicket = async (row) => {
    try {
      setIsDetailsLoading(true);
      setSelectedTicketId(row._id);

      const response = await getSuperAdminTicketDetails(row._id);
      if (response.success) {
        setTicketDetails(response.data.ticket);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load ticket details");
      setSelectedTicketId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await replyToSuperAdminTicket(
        selectedTicketId,
        msgObj.text,
      );
      if (response.success) {
        toast.success("Reply sent");
        setTicketDetails((prev) => ({
          ...prev,
          responses: [...prev.responses, response.data],
          status: prev.status === "open" ? "in_progress" : prev.status,
        }));
      }
    } catch (error) {
      toast.error(error.message || "Failed to send reply");
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      let response;
      if (status === "resolved") {
        response = await resolveSuperAdminTicket(
          selectedTicketId,
          "Resolved via HQ Help Desk",
        );
      } else {
        response = await updateSuperAdminTicketStatus(selectedTicketId, status);
      }

      if (response.success) {
        toast.success(`Ticket marked as ${status.replace("_", " ")}`);
        setTicketDetails((prev) => ({ ...prev, status }));
      }
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) {
      toast.error("An escalation reason is required.");
      return;
    }

    try {
      setIsEscalating(true);
      await escalateSuperAdminTicket(selectedTicketId, escalationReason.trim());
      toast.success(`Ticket escalated to Super Admin successfully.`);

      setTicketDetails((prev) => ({
        ...prev,
        status: "escalated",
        escalationLevel: (prev.escalationLevel || 0) + 1,
      }));

      setIsEscalationModalOpen(false);
      setEscalationReason("");
    } catch (error) {
      toast.error(error?.message || "Failed to escalate ticket");
    } finally {
      setIsEscalating(false);
    }
  };

  // ── Style Helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
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

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "in_progress":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "closed":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "escalated":
        return "bg-purple-50 text-purple-600 border-purple-200";
      default:
        return "bg-amber-50 text-amber-600 border-amber-200"; // open
    }
  };

  // ── Ticket Detail View Render ──────────────────────────────────────────────
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

    const initialMessage = {
      sender: ticketDetails.raisedBy?.name || "Unknown",
      time: new Date(ticketDetails.createdAt).toLocaleString(),
      text: ticketDetails.description,
    };

    const threadMessages = (ticketDetails.responses || []).map((res) => {
      const isMe = res.user?._id === currentUser?._id;
      return {
        sender: isMe ? "Me" : res.user?.name || "Support",
        time: new Date(res.createdAt).toLocaleString(),
        text: res.message,
      };
    });

    const chatMessages = [initialMessage, ...threadMessages];
    const isClosed = ["resolved", "closed"].includes(
      ticketDetails.status?.toLowerCase(),
    );
    const isAlreadyEscalated =
      ticketDetails.status?.toLowerCase() === "escalated" ||
      ticketDetails.escalationLevel >= 2;

    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
        <Toaster />

        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => {
              setSelectedTicketId(null);
              setTicketDetails(null);
            }}
            className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Help Desk
          </button>

          <div className="flex gap-3">
            {!isClosed && !isAlreadyEscalated && (
              <Button
                text="Escalate to Super Admin"
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
                onClick={() => handleUpdateStatus("resolved")}
              />
            )}
          </div>
        </div>

        <Grid cols={12} gap={6}>
          {/* Left: Chat Thread */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {ticketDetails.title}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-400">
                  <span>ID: {ticketDetails._id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#223F74]">
                    <Building2 size={12} />{" "}
                    {ticketDetails.school?.schoolName ||
                      ticketDetails.school?.name ||
                      "Unknown"}
                  </span>
                </div>
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

          {/* Right: Info Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit space-y-5">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-2 border-b border-slate-100 pb-4">
                Ticket Metadata
              </h3>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Category
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {ticketDetails.category}
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

            {/* Escalation Notice */}
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

        {/* ESCALATION MODAL */}
        <PanelModal
          id="escalation-modal"
          title="Escalate to Super Admin"
          isVisible={isEscalationModalOpen}
          onClose={() => {
            setIsEscalationModalOpen(false);
            setEscalationReason("");
          }}
          size="md"
        >
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                Incident Report
              </p>
              <p className="text-lg font-black text-slate-800 leading-snug">
                {ticketDetails.title}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-slate-600 italic leading-relaxed text-sm">
                "{ticketDetails.description}"
              </p>
            </div>

            <form onSubmit={handleEscalate}>
              <Grid cols={1} gap={4}>
                <DataField
                  id="escalationReason"
                  type="textarea"
                  label="Escalation Reason *"
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Detail why this ticket requires Super Admin intervention..."
                  rows={4}
                />
              </Grid>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                <Button
                  text="Cancel"
                  variant="secondary"
                  onClick={() => {
                    setIsEscalationModalOpen(false);
                    setEscalationReason("");
                  }}
                  size={4}
                />
                <Button
                  text={isEscalating ? "Escalating..." : "Confirm Escalation"}
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
          </div>
        </PanelModal>
      </div>
    );
  }

  // ── Main List View Render ──────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      <Toaster />

      <Heading
        primaryText="HQ Support Desk"
        secondaryText="Command Center"
        size={12}
      />

      <div className="mt-6 mb-8">
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
      </div>

      <div className="mb-8">
        <DataTable
          title="Organization Support Queue"
          columns={[
            {
              key: "id",
              label: "Ticket",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-black text-[#223F74]">
                    {row.id || `...${row._id.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ),
            },
            {
              key: "school",
              label: "Branch & Reporter",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">
                    {row.branch || "Unknown Branch"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {row.raisedBy} (
                    {row.raisedByRole?.replace("_", " ") || "Staff"})
                  </span>
                </div>
              ),
            },
            {
              key: "title",
              label: "Subject",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 line-clamp-1">
                    {row.subject}
                  </span>
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
          ]}
          rows={tickets}
          actions={[
            {
              icon: <Eye size={16} />,
              tooltip: "View & Respond",
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
      </div>
    </div>
  );
};

export default HQSupportDesk;
