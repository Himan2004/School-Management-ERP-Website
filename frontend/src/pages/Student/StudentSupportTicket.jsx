import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MessageSquare,
  Clock,
  ArrowLeft,
  Eye,
  CheckCircle,
  Loader2,
  Plus,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { studentApi } from '../../services/api/studentApi';


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
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 z-10"></div>
        <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse"></div>
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
    <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
      <div className="w-40 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
      <div className="flex gap-3">
        <div className="w-32 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
        <div className="w-64 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    </div>
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

const StudentSupportTicket = () => {
  const currentUser = useSelector((state) => state.auth?.user);

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
    assignedToRole: "super_admin", // Defaulting to super_admin or admin as per reference
  });

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getSupportTickets();
      const rawTickets = response?.data || response || [];
      
      const adaptedTickets = rawTickets.map(t => ({
        _id: t.id || t._id || Math.random().toString(),
        title: t.subject || t.title || "No Subject",
        category: t.category || "general",
        priority: t.priority || "medium",
        status: t.status || "open",
        description: t.description || "",
        createdAt: t.createdAt || new Date(),
        updatedAt: t.updatedAt || t.createdAt || new Date(),
        raisedBy: { name: currentUser?.name || "Student", _id: currentUser?._id },
        responses: (t.messages || t.responses || []).map(m => ({
          _id: m.id || m._id || Math.random().toString(),
          message: m.text || m.message || "",
          createdAt: m.timestamp || m.createdAt || new Date(),
          user: {
            _id: m.type === 'user' ? currentUser?._id : 'admin',
            name: m.type === 'user' ? (currentUser?.name || "Me") : "Support",
          }
        }))
      }));

      setTickets(adaptedTickets);
      setStats({
        total: adaptedTickets.length,
        open: adaptedTickets.filter(t => t.status === 'open').length,
        inProgress: adaptedTickets.filter(t => ['in-progress', 'in_progress'].includes(t.status)).length,
        resolved: adaptedTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
      });

      if (selectedTicketId) {
        const updatedSelected = adaptedTickets.find(t => t._id === selectedTicketId);
        if (updatedSelected) setTicketDetails(updatedSelected);
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description) {
      return toast.error("Subject and description are required");
    }

    try {
      setIsSubmitting(true);
      await studentApi.createSupportTicket({
        subject: newTicket.title,
        category: newTicket.category,
        priority: newTicket.priority,
        description: newTicket.description
      });
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
    } catch (error) {
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = async (row) => {
    setIsDetailsLoading(true);
    setSelectedTicketId(row._id);
    setTicketDetails(row);
    setIsDetailsLoading(false);
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      await studentApi.addTicketMessage(selectedTicketId, { message: msgObj.text });
      await fetchTickets();
    } catch (error) {
      toast.error(error.message || "Failed to send reply");
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
    return [
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

    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
        <Toaster />

        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Tickets
          </button>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Category
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {(ticketDetails.category || "general").replace("_", " ")}
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
          </div>
        </Grid>
      </div>
    );
  }

  // ── Render: Main Dashboard List View ──────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      <Toaster />

      <Heading
        primaryText="Support"
        secondaryText="Tickets"
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
              title="Total Raised"
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
            title="My Tickets"
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

            <DataField
              id="description"
              type="textarea"
              label="Description *"
              value={newTicket.description}
              onChange={(e) =>
                setNewTicket({ ...newTicket, description: e.target.value })
              }
              rows={4}
              placeholder="Detailed description of your problem..."
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
              icon={
                isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )
              }
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              size={6}
            />
          </div>
        </form>
      </PanelModal>
    </div>
  );
};

export default StudentSupportTicket;