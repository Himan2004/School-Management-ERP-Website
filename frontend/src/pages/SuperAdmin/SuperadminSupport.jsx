import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Plus,
  Eye,
  CheckCircle,
  Loader
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import superAdminSupportService from "../../services/api/superAdminSupportService.js";

// ── Shared Component Imports ───────────────────────────────────────────────
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  PanelModal,
  Grid,
  DataField,
  SelectField,
  Option,
  Button,
  UserChat,
} from "../../components/shared/Common_Components";

const SuperadminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // New ticket state
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "technical",
    priority: "medium",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View ticket state
  const [ticketDetails, setTicketDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await superAdminSupportService.getGraphuraTickets({
        category: "",
      });
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

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.description) {
      toast.error("Subject and description are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response =
        await superAdminSupportService.createGraphuraTicket(newTicket);
      if (response.success) {
        toast.success("Support ticket sent to Graphura Admin");
        setIsCreateModalOpen(false);
        setNewTicket({
          subject: "",
          category: "technical",
          priority: "medium",
          description: "",
        });
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = async (id) => {
    setSelectedTicketId(id);
    setLoadingDetails(true);
    try {
      const response = await superAdminSupportService.getGraphuraTicketById(id);
      if (response.success) setTicketDetails(response.data);
    } catch (error) {
      toast.error("Failed to load ticket details");
      setSelectedTicketId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Uses the callback from the UserChat component
  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await superAdminSupportService.addGraphuraTicketMessage(
        selectedTicketId,
        msgObj.text,
      );
      if (response.success) {
        toast.success("Reply sent");
        setTicketDetails((prev) => ({
          ...prev,
          messages: [...prev.messages, response.data],
          status: "open",
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm("Are you sure you want to close this ticket?")) return;
    try {
      const response =
        await superAdminSupportService.closeGraphuraTicket(selectedTicketId);
      if (response.success) {
        toast.success("Ticket closed");
        setTicketDetails((prev) => ({ ...prev, status: "closed" }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close ticket");
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
    // Map ticket messages for the Common UserChat Component
    const chatMessages =
      ticketDetails?.messages.map((msg) => ({
        sender: msg.role === "superadmin" ? "Me" : msg.sender,
        time: new Date(msg.timestamp).toLocaleString(),
        text: msg.message,
      })) || [];

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
            <ArrowLeft size={20} /> Back to Tickets
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
                    Ticket ID: {ticketDetails._id}
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
                  currentUser="Me"
                  maxHeight="h-[520px]"
                  readOnly={ticketDetails.status === "closed"}
                  showAttach={false}
                />
              </div>
            </div>

            {/* Right: Info Sidebar */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-6 border-b border-slate-100 pb-4">
                Ticket Metadeta
              </h3>

              <div className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Category
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {ticketDetails.category.replace("-", " ")}
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
                    {new Date(ticketDetails.lastActivityAt).toLocaleString()}
                  </p>
                </div>

                {ticketDetails.status !== "closed" && (
                  <div className="pt-4 mt-6">
                    <Button
                      text="Close Ticket"
                      variant="danger"
                      onClick={handleCloseTicket}
                      icon={<CheckCircle2 size={16} />}
                    />
                  </div>
                )}
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
        primaryText="Help Desk"
        secondaryText="Graphura Support"
        size={12}
        action={
          <Button
            text="New Ticket"
            icon={<Plus size={16} />}
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
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
            title="Total Raised"
            value={stats.total}
            accentColor="#3b82f6"
            size={3}
          />
        </DashGrid>
      </div>

      {/* Tickets DataTable */}
      <div className="mb-8">
        <DataTable
          title="Support History"
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
                    {row.description}
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
              tooltip: "View Thread",
              variant: "ghost",
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
          ]}
          searchable={true}
          size={12}
          pageSize={10}
        />
      </div>

      {/* Create Ticket Modal using Common PanelModal */}
      <PanelModal
        isVisible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Contact Graphura Support"
        size="md"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Grid cols={12} gap={4}>
            <DataField
              label="Subject"
              value={newTicket.subject}
              onChange={(e) =>
                setNewTicket({ ...newTicket, subject: e.target.value })
              }
              placeholder="Brief description of the issue"
              size={12}
            />

            <SelectField
              label="Category"
              value={newTicket.category}
              onChange={(e) =>
                setNewTicket({ ...newTicket, category: e.target.value })
              }
              size={6}
            >
              <Option value="technical" label="Technical Issue" />
              <Option value="billing" label="Billing" />
              <Option value="school-management" label="School Management" />
              <Option value="feature-request" label="Feature Request" />
              <Option value="other" label="Other" />
            </SelectField>

            <SelectField
              label="Priority"
              value={newTicket.priority}
              onChange={(e) =>
                setNewTicket({ ...newTicket, priority: e.target.value })
              }
              size={6}
            >
              <Option value="low" label="Low" />
              <Option value="medium" label="Medium" />
              <Option value="high" label="High" />
              <Option value="critical" label="Critical" />
            </SelectField>

            <DataField
              type="textarea"
              label="Description"
              value={newTicket.description}
              onChange={(e) =>
                setNewTicket({ ...newTicket, description: e.target.value })
              }
              placeholder="Provide detailed information..."
              rows={4}
              size={12}
            />
          </Grid>

          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              size={3}
            />
            <Button
              text="Submit Ticket"
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              size={4}
            />
          </div>
        </form>
      </PanelModal>
    </div>
  );
};

export default SuperadminSupport;
