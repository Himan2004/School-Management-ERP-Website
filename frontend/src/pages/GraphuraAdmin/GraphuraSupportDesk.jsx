import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Eye,
  CheckCircle,
  Loader,
  RefreshCw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ── Shared Component Imports ───────────────────────────────────────────────
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  Grid,
  SelectField,
  Option,
  Button,
  UserChat,
} from "../../components/shared/Common_Components";

// ── REAL API IMPORTS ───────────────────────────────────────────────────────
import {
  getAllSupportTickets,
  getSupportTicketById,
  replyToSupportTicket,
  updateSupportTicketStatus,
} from "../../services/api/graphuraApi";

const GraphuraSupportDesk = () => {
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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await getAllSupportTickets(filters);
      if (response.success && response.data) {
        setTickets(response.data.tickets || []);
        setStats({
          total: response.data.stats?.total || 0,
          open: response.data.stats?.open || 0,
          inProgress: response.data.stats?.inProgress || 0,
          resolved: response.data.stats?.resolved || 0,
        });
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch support tickets",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTicketId) fetchTickets();
  }, [selectedTicketId]);

  const handleApplyFilters = (appliedFilters) => {
    fetchTickets(appliedFilters);
  };

  const handleViewTicket = async (id) => {
    if (!id) return;
    setSelectedTicketId(id);
    setLoadingDetails(true);
    try {
      const response = await getSupportTicketById(id);
      if (response.success && response.data) {
        setTicketDetails(response.data);
      } else {
        throw new Error("Invalid ticket data received");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load ticket details");
      setSelectedTicketId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await replyToSupportTicket(
        selectedTicketId,
        msgObj.text,
      );
      if (response.success) {
        toast.success("Reply sent to client");
        const newMsg = response.data;
        setTicketDetails((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), newMsg],
          lastActivityAt: new Date().toISOString(), // Matches schema
          status: prev.status === "open" ? "in-progress" : prev.status,
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdateLoading(true);
    try {
      const response = await updateSupportTicketStatus(
        selectedTicketId,
        newStatus,
      );
      if (response.success) {
        toast.success(`Ticket marked as ${newStatus.replace("-", " ")}`);
        setTicketDetails((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // ── Style Helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-rose-50 text-rose-600 border-rose-200";
      case "medium":
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
      case "in-progress":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "closed":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-amber-50 text-amber-600 border-amber-200"; // open
    }
  };

  // ── Ticket Detail View Render ──────────────────────────────────────────────
  if (selectedTicketId) {
    const chatMessages = [];

    // Initial message from the client (description field)
    if (ticketDetails?.description) {
      chatMessages.push({
        sender: ticketDetails.superAdmin?.name || "Client",
        time: new Date(ticketDetails.createdAt).toLocaleString(),
        text: ticketDetails.description, // Matches new schema
      });
    }

    // Subsequent replies
    if (ticketDetails?.messages?.length > 0) {
      ticketDetails.messages.forEach((msg) => {
        chatMessages.push({
          sender:
            msg.role === "graphura_support"
              ? "Support"
              : msg.sender || "Client", // Matches new enum
          time: new Date(msg.timestamp).toLocaleString(),
          text: msg.message,
        });
      });
    }

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
            <ArrowLeft size={20} /> Back to Support Desk
          </button>
        </div>

        {loadingDetails ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <Loader className="animate-spin text-[#223F74]" size={32} />
            <span className="text-[#223F74] font-bold tracking-widest uppercase text-xs">
              Loading Secure Thread...
            </span>
          </div>
        ) : ticketDetails ? (
          <Grid cols={12} gap={6}>
            {/* Left: Chat Thread */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    {ticketDetails.subject}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Ticket ID: {ticketDetails._id} | Client:{" "}
                    {ticketDetails.superAdmin?.name || "Unknown"}
                    {ticketDetails.organization?.name
                      ? ` (${ticketDetails.organization.name})`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${getStatusStyle(ticketDetails.status)}`}
                >
                  {ticketDetails.status.replace("-", " ")}
                </span>
              </div>

              <div className="flex-1 p-6 bg-slate-50/30 overflow-hidden">
                <UserChat
                  messages={chatMessages}
                  onSend={handleReply}
                  currentUser="Support"
                  maxHeight="h-[520px]"
                  readOnly={ticketDetails.status === "closed"}
                  showAttach={false}
                  placeholder="Type your reply to the client..."
                />
              </div>
            </div>

            {/* Right: Info & Controls Sidebar */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-6 border-b border-slate-100 pb-4">
                Ticket Administration
              </h3>

              <div className="space-y-5 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Category
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {ticketDetails.category.replace("-", " ")}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
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
                    Created At
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {new Date(ticketDetails.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Last Activity
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {new Date(
                      ticketDetails.lastActivityAt || ticketDetails.updatedAt,
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status Control */}
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Update Status
                </p>
                <div className="flex gap-2">
                  <SelectField
                    id="ticketStatus"
                    value={ticketDetails.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusUpdateLoading}
                    searchable={false}
                    size={12}
                  >
                    <Option value="open" label="Open" />
                    <Option value="in-progress" label="In Progress" />
                    <Option value="resolved" label="Resolved" />
                    <Option value="closed" label="Closed" />
                  </SelectField>
                </div>
              </div>
            </div>
          </Grid>
        ) : null}
      </div>
    );
  }

  // ── Main List View Render ──────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      <Toaster />

      {/* Page Header */}
      <Heading
        primaryText="Graphura Support Desk"
        secondaryText="Manage Client Issues"
        size={12}
        action={
          <Button
            text="Refresh"
            icon={
              loading ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )
            }
            variant="secondary"
            onClick={() => fetchTickets()}
            disabled={loading}
          />
        }
      />

      {/* Header Stats */}
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

      {/* Tickets DataTable */}
      <div className="mb-8">
        <DataTable
          title="Active Support Queue"
          onApplyFilters={handleApplyFilters}
          columns={[
            {
              key: "id",
              label: "Ticket ID",
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
              key: "subject",
              label: "Subject",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">{val}</span>
                  <span className="text-xs text-slate-500 line-clamp-1">
                    {row.superAdmin?.name || "Client"} - {row.description}
                  </span>
                </div>
              ),
            },
            {
              key: "category",
              label: "Category",
              render: (val) => (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {val.replace("-", " ")}
                </span>
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
                  {val.replace("-", " ")}
                </span>
              ),
            },
          ]}
          rows={tickets}
          actions={[
            {
              icon: <Eye size={16} />,
              tooltip: "Manage Ticket",
              variant: "primary",
              onClick: (row) => handleViewTicket(row._id),
            },
          ]}
          filters={[
            {
              title: "Category",
              type: "select",
              key: "category",
              options: [
                "technical",
                "billing",
                "school-management",
                "feature-request",
                "other",
              ],
            },
            {
              title: "Status",
              type: "select",
              key: "status",
              options: ["open", "in-progress", "resolved", "closed"],
            },
            {
              title: "Priority",
              type: "select",
              key: "priority",
              options: ["low", "medium", "high", "critical"],
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

export default GraphuraSupportDesk;
