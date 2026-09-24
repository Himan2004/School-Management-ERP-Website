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
  AlertTriangle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";

import {
  getHelpDeskTickets,
  getTicketDetails,
  updateTicket,
  escalateTicket 
} from "../../services/api/commonTicketApi";

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Grid,
  Button,
  UserChat,
  PanelModal,
  DataField
} from "../../components/shared/Common_Components";

const PrincipalSupportDesk = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  
  // Escalation state
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  const currentUser = useSelector((state) => state.auth?.user);

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await getHelpDeskTickets({});
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
  }, [selectedTicketId]);

  const handleViewTicket = async (row) => {
    try {
      setIsDetailsLoading(true);
      setSelectedTicketId(row._id);
      const response = await getTicketDetails(row._id);
      if (response.success) setTicketDetails(response.data);
    } catch (error) {
      toast.error("Failed to load ticket details");
      setSelectedTicketId(null);
    } finally { setIsDetailsLoading(false); }
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await updateTicket(selectedTicketId, { message: msgObj.text });
      if (response.success) setTicketDetails(response.data);
    } catch (error) { toast.error(error.message); }
  };

  const handleResolve = async () => {
    try {
      const response = await updateTicket(selectedTicketId, { status: "resolved", resolutionNote: "Resolved by Principal" });
      if (response.success) {
        toast.success("Ticket marked as resolved");
        setTicketDetails(response.data);
      }
    } catch (error) { toast.error(error.message); }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) return toast.error("Reason required");

    try {
      setIsEscalating(true);
      // Principal always escalates to HQ/super_admin
      const response = await escalateTicket(selectedTicketId, { 
        reason: escalationReason.trim(),
        escalatedToRole: "super_admin" 
      });

      if (response.success) {
        toast.success("Ticket escalated to HQ successfully");
        setTicketDetails(response.data);
        setIsEscalationModalOpen(false);
        setEscalationReason("");
      }
    } catch (error) { toast.error(error.message || "Failed to escalate"); } finally { setIsEscalating(false); }
  };

  // ── Style Helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (p) => {
    switch (p?.toLowerCase()) {
      case "critical": return "bg-rose-50 text-rose-600 border-rose-200";
      case "high": return "bg-amber-50 text-amber-600 border-amber-200";
      case "low": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      default: return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  const getStatusStyle = (s) => {
    switch (s?.toLowerCase()) {
      case "resolved": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "in_progress": return "bg-blue-50 text-blue-600 border-blue-200";
      case "closed": return "bg-slate-100 text-slate-500 border-slate-200";
      case "escalated": return "bg-purple-50 text-purple-600 border-purple-200";
      default: return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  if (selectedTicketId) {
    if (isDetailsLoading || !ticketDetails) {
      return (
        <div className="w-full max-w-[1600px] mx-auto py-20 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#223F74]" size={32} />
          <p className="text-[#223F74] font-bold tracking-widest uppercase text-xs">Loading Ticket Data...</p>
        </div>
      );
    }

    const initialMessage = {
      sender: ticketDetails.raisedBy?.name || "Unknown",
      time: new Date(ticketDetails.createdAt).toLocaleString(),
      text: ticketDetails.description,
    };

    const threadMessages = (ticketDetails.responses || []).map((res) => ({
      sender: res.user?._id === currentUser?._id ? "Me" : (res.user?.name || "Support"),
      time: new Date(res.createdAt).toLocaleString(),
      text: res.message,
    }));

    const chatMessages = [initialMessage, ...threadMessages];
    const isClosed = ["resolved", "closed"].includes(ticketDetails.status?.toLowerCase());
    
    // Principal can only escalate if the ticket is currently assigned to them
    const canEscalate = !isClosed && ticketDetails.assignedToRole === "principal";

    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
        <Toaster />

        <div className="flex items-center justify-between mb-6 pt-4">
          <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold">
            <ArrowLeft size={20} /> Back to Dashboard
          </button>

          <div className="flex gap-3">
            {canEscalate && (
              <Button text="Escalate to HQ" variant="danger" icon={<ArrowUpRight size={16} />} size={3} onClick={() => setIsEscalationModalOpen(true)} />
            )}
            {!isClosed && (
              <Button text="Mark Resolved" variant="success" icon={<CheckCircle2 size={16} />} size={3} onClick={handleResolve} />
            )}
          </div>
        </div>

        <Grid cols={12} gap={6}>
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">{ticketDetails.title}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">Ticket ID: {ticketDetails._id}</p>
              </div>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${getStatusStyle(ticketDetails.status)}`}>
                {ticketDetails.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex-1 p-6 bg-slate-50/30 overflow-hidden">
              <UserChat messages={chatMessages} onSend={handleReply} currentUser="Me" maxHeight="h-[520px]" readOnly={isClosed} showAttach={false} />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit space-y-5">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-2 border-b border-slate-100 pb-4">Ticket Details</h3>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm"><UserRound size={20} className="text-slate-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                  <p className="text-sm font-bold text-slate-700">{ticketDetails.raisedBy?.name || "Unknown"}</p>
                  <p className="text-xs text-slate-500 capitalize">{ticketDetails.raisedByRole?.replace("_", " ")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Category</p>
                  <p className="text-sm font-bold text-slate-700 capitalize">{ticketDetails.category}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Priority</p>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border inline-block uppercase tracking-widest ${getPriorityStyle(ticketDetails.priority)}`}>{ticketDetails.priority}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Timeline</p>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Opened:</span>
                    <span className="text-slate-700">{new Date(ticketDetails.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Last Active:</span>
                    <span className="text-slate-700">{new Date(ticketDetails.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {ticketDetails.escalationLevel > 0 && (
              <div className="bg-purple-50 rounded-3xl border border-purple-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><AlertTriangle size={20} /></div>
                  <div>
                    <h4 className="text-sm font-black text-purple-900 uppercase tracking-widest">Escalation Log</h4>
                    <p className="text-xs text-purple-600 font-bold">Level {ticketDetails.escalationLevel} Escalation</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {ticketDetails.escalationLog?.map((log, i) => (
                    <div key={i} className="text-sm bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                      <p className="text-slate-700 font-medium italic">"{log.reason}"</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{new Date(log.escalatedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Grid>

        {/* ESCALATION MODAL */}
        <PanelModal id="escalation-modal" title="Escalate to HQ" isVisible={isEscalationModalOpen} onClose={() => setIsEscalationModalOpen(false)} size="md">
          <form onSubmit={handleEscalate} className="space-y-6">
            <Grid cols={1} gap={4}>
              <DataField id="escalationReason" type="textarea" label="Reason for HQ Escalation *" value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} rows={4} />
            </Grid>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button text="Cancel" variant="secondary" onClick={() => setIsEscalationModalOpen(false)} size={4} />
              <Button text={isEscalating ? "Escalating..." : "Confirm"} icon={isEscalating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />} variant="danger" type="submit" disabled={isEscalating || !escalationReason.trim()} size={6} />
            </div>
          </form>
        </PanelModal>
      </div>
    );
  }

  // ── Main List View Render ──────────────────────────────────────────────────
  return (
    <>
      <Toaster />
      <div className="w-full space-y-6 text-left pb-10">
        <Heading primaryText="Support Desk" secondaryText="Issue Tracker" size={12} />

      <div className="mt-6 mb-8">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard icon={<ShieldAlert size={22} />} title="Open Tickets" value={stats.open} accentColor="#ef4444" size={3} showAnimations={true} />
          <EnhancedDashCard icon={<Clock size={22} />} title="In Progress" value={stats.inProgress} accentColor="#f59e0b" size={3} showAnimations={true} />
          <EnhancedDashCard icon={<CheckCircle size={22} />} title="Resolved" value={stats.resolved} accentColor="#10b981" size={3} showAnimations={true} />
          <EnhancedDashCard icon={<MessageSquare size={22} />} title="Total Shown" value={stats.total} accentColor="#3b82f6" size={3} showAnimations={true} />
        </DashGrid>
      </div>

      <div className="mb-8">
        <DataTable
          title="Incoming Staff Tickets"
          columns={[
            { key: "id", label: "Ticket", render: (val, row) => (<div className="flex flex-col"><span className="font-black text-[#223F74]">...{row._id.slice(-6).toUpperCase()}</span><span className="text-[10px] text-slate-400 font-bold">{new Date(row.createdAt).toLocaleDateString()}</span></div>) },
            { key: "raisedBy", label: "Reporter", render: (val, row) => (<div className="flex flex-col"><span className="font-bold text-slate-800">{row.raisedBy?.name || "Unknown"}</span><span className="text-xs text-slate-500 capitalize">{row.raisedByRole?.replace("_", " ")}</span></div>) },
            { key: "title", label: "Subject", render: (val, row) => (<div className="flex flex-col"><span className="font-bold text-slate-800 line-clamp-1">{val}</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{row.category}</span></div>) },
            { key: "priority", label: "Priority", align: "center", render: (val) => <span className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getPriorityStyle(val)}`}>{val}</span> },
            { key: "status", label: "Status", align: "right", render: (val) => <span className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getStatusStyle(val)}`}>{val.replace("_", " ")}</span> },
          ]}
          rows={tickets}
          actions={[{ icon: <Eye size={16} />, tooltip: "View Ticket", variant: "primary", onClick: (row) => handleViewTicket(row) }]}
          filters={[
            { title: "Category", type: "select", key: "category", options: ["academic", "fee", "discipline", "transport", "general", "complaint", "query"] },
            { title: "Status", type: "select", key: "status", options: ["open", "in_progress", "escalated", "resolved", "closed"] },
          ]}
          searchable={true}
          size={12}
          pageSize={10}
        />
      </div>
    </div>
    </>
  );
};

export default PrincipalSupportDesk;