import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Eye,
  LoaderCircle,
  Plus,
  Send,
  Ticket,
  Search,
  CheckCheck,
  MessageSquare,
  Users,
  User,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ── COMPLAINTS API ──
import {
  getMyTickets,
  getTicketDetails,
  createTicket,
  updateTicket,
} from "../../services/api/commonTicketApi";

// ── MESSAGES REDUX ──
import {
  fetchContacts,
  fetchChatHistory,
  sendMessage,
  setActiveUser,
} from "../../features/teacher/teacherMessageSlice";

// ── COMMON COMPONENTS ──
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

const TeacherCommunicationHub = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const currentUser = useSelector((state) => state.auth?.user);

  // ── GLOBAL TAB STATE ──
  // Auto-switch to messages if a 'to' parameter is present in the URL
  const initialTab = searchParams.get("to") ? "messages" : "complaints";
  const [globalTab, setGlobalTab] = useState(initialTab);

  // =======================================================================
  // 1. COMPLAINTS & QUERIES (TICKET SYSTEM) STATES & LOGIC
  // =======================================================================
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [ticketLoading, setTicketLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    category: "general",
    priority: "medium",
    description: "",
    assignedToRole: "admin",
  });

  const fetchTickets = async () => {
    try {
      setTicketLoading(true);
      const response = await getMyTickets({});
      if (response.success) {
        setTickets(response.data.tickets);
        setStats(
          response.data.stats || {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
          },
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to load complaints");
    } finally {
      setTicketLoading(false);
    }
  };

  // Fetch tickets only when on the complaints tab
  useEffect(() => {
    if (globalTab === "complaints" && !selectedTicketId) fetchTickets();
  }, [globalTab, selectedTicketId]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description)
      return toast.error("Subject and description required");

    try {
      setIsSubmitting(true);
      const response = await createTicket(newTicket);
      if (response.success) {
        toast.success("Complaint raised successfully to Admin");
        setIsCreateModalOpen(false);
        setNewTicket({
          title: "",
          category: "general",
          priority: "medium",
          description: "",
          assignedToRole: "admin",
        });
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit request");
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
      toast.error("Failed to load details");
      setSelectedTicketId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleTicketReply = async (msgObj) => {
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

  const handleResolveTicket = async () => {
    try {
      const response = await updateTicket(selectedTicketId, {
        status: "resolved",
        resolutionNote: "Resolved by Teacher",
      });
      if (response.success) {
        toast.success("Ticket marked as resolved");
        setTicketDetails(response.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // =======================================================================
  // 2. DIRECT MESSAGES STATES & LOGIC (STUDENTS ONLY)
  // =======================================================================
  const messagesEndRef = useRef(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    contacts,
    activeChat,
    activeUserId,
    loading: messageLoading,
    chatLoading,
  } = useSelector((state) => state.teacherMessage || {});

  // Handle URL Param for Direct Messages
  useEffect(() => {
    const toUserId = searchParams.get("to");
    if (toUserId && globalTab === "messages") {
      dispatch(setActiveUser(toUserId));
    }
  }, [searchParams, dispatch, globalTab]);

  // Polling Contacts
  useEffect(() => {
    if (globalTab !== "messages") return;
    dispatch(fetchContacts());
    const interval = setInterval(() => dispatch(fetchContacts()), 4000);
    return () => clearInterval(interval);
  }, [dispatch, globalTab]);

  // Polling Active Chat
  useEffect(() => {
    if (globalTab !== "messages" || !activeUserId) return;
    dispatch(fetchChatHistory(activeUserId));
    const interval = setInterval(
      () => dispatch(fetchChatHistory(activeUserId)),
      4000,
    );
    return () => clearInterval(interval);
  }, [activeUserId, dispatch, globalTab]);

  // Auto-scroll Direct Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat]);

  const handleSendDM = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUserId) return;
    await dispatch(sendMessage({ receiverId: activeUserId, text: inputText }));
    setInputText("");
    dispatch(fetchContacts());
  };

  // Contact Filtering Logic (Strictly Students)
  const safeStudents = contacts?.students || [];

  const filteredContacts = safeStudents.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.rollNo?.toLowerCase().includes(query) ||
      c.className?.toLowerCase().includes(query)
    );
  });

  const activeUser = activeUserId
    ? safeStudents.find((c) => c.id === activeUserId)
    : null;

  // ── Style Helpers ──
  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U";

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

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
      default:
        return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  // =======================================================================
  // RENDER: COMPLAINTS DETAIL VIEW
  // =======================================================================
  const renderComplaintDetails = () => {
    if (isDetailsLoading || !ticketDetails) {
      return (
        <div className="w-full py-20 flex flex-col items-center gap-4">
          <LoaderCircle className="animate-spin text-[#223F74]" size={32} />
          <p className="text-[#223F74] font-bold tracking-widest uppercase text-xs">
            Loading Details...
          </p>
        </div>
      );
    }

    const initialMessage = {
      sender: "Me",
      time: new Date(ticketDetails.createdAt).toLocaleString(),
      text: ticketDetails.description,
    };
    const threadMessages = (ticketDetails.responses || []).map((res) => ({
      sender:
        res.user?._id === currentUser?._id
          ? "Me"
          : res.user?.name || "Admin Support",
      time: new Date(res.createdAt).toLocaleString(),
      text: res.message,
    }));
    const chatMessages = [initialMessage, ...threadMessages];
    const isClosed = ["resolved", "closed"].includes(
      ticketDetails.status?.toLowerCase(),
    );

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to List
          </button>
          {!isClosed && (
            <Button
              text="Mark as Resolved"
              variant="success"
              icon={<CheckCircle2 size={16} />}
              size={3}
              onClick={handleResolveTicket}
            />
          )}
        </div>
        <Grid cols={12} gap={6}>
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
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
                onSend={handleTicketReply}
                currentUser="Me"
                maxHeight="h-[500px]"
                readOnly={isClosed}
                showAttach={false}
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit space-y-5">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-2 border-b border-slate-100 pb-4">
                Complaint Details
              </h3>
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
                  Assigned To
                </p>
                <p className="text-sm font-bold text-slate-800 capitalize">
                  Administration
                </p>
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
  };

  // =======================================================================
  // RENDER: DIRECT MESSAGES UI (STUDENTS ONLY)
  // =======================================================================
  const renderDirectMessages = () => (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row border border-slate-200 shadow-sm rounded-3xl bg-white h-[750px] animate-in fade-in zoom-in-95 duration-200 mt-6">
      {/* LEFT SIDEBAR: CONVERSATION LIST */}
      <div
        className={`w-full lg:w-80 xl:w-96 border-r border-slate-100 flex-col h-full ${activeUserId ? "hidden lg:flex" : "flex"}`}
      >
        {/* SEARCH BAR */}
        <div className="p-4 border-b border-slate-50 shrink-0 bg-slate-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#223F74]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
              My Students
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all"
            />
          </div>
        </div>

        {/* CONTACTS LIST */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {messageLoading && filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Loading students...
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => dispatch(setActiveUser(contact.id))}
                className={`w-full text-left p-4 border-b border-slate-50 transition-all hover:bg-slate-50/80 flex items-start gap-3 relative ${activeUserId === contact.id ? "bg-blue-50/50" : ""}`}
              >
                {activeUserId === contact.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#223F74] rounded-r-md" />
                )}
                <div className="relative shrink-0 mt-0.5">
                  {contact.photo ? (
                    <img
                      src={contact.photo}
                      alt={contact.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-200 shadow-sm">
                      {getInitials(contact.name)}
                    </div>
                  )}
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate pr-2 flex-1 min-w-0">
                      {contact.name}
                    </p>
                    {contact.lastMessageTime && (
                      <p className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatTime(contact.lastMessageTime)}
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium truncate mb-1">
                    Class: {contact.className} • Roll: {contact.rollNo}
                  </p>

                  <p
                    className={`text-xs truncate ${contact.unread > 0 ? "text-slate-800 font-bold" : "text-slate-400"}`}
                  >
                    {contact.lastMessage || (
                      <span className="italic text-slate-300">
                        No messages yet
                      </span>
                    )}
                  </p>
                </div>
                {contact.unread > 0 && (
                  <div className="shrink-0 h-5 w-5 rounded-full bg-[#223F74] flex items-center justify-center shadow-sm self-center">
                    <span className="text-[9px] font-bold text-white">
                      {contact.unread}
                    </span>
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center">
              <User className="h-8 w-8 text-slate-200 mb-2" />
              <p>No students found.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: ACTIVE CHAT */}
      <div
        className={`flex-1 flex-col bg-slate-50/30 ${!activeUserId ? "hidden lg:flex" : "flex"}`}
      >
        {activeUserId && activeUser ? (
          <>
            <div className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm shadow-slate-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dispatch(setActiveUser(null))}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full mr-1 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activeUser.photo ? (
                  <img
                    src={activeUser.photo}
                    alt={activeUser.name}
                    className="h-9 w-9 rounded-full object-cover border border-slate-100"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
                    {getInitials(activeUser.name)}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">
                    {activeUser.name}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#223F74] mt-0.5">
                    Student ({activeUser.className})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatLoading && activeChat.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-10">
                  Loading message log...
                </div>
              ) : activeChat.length > 0 ? (
                activeChat.map((msg, index) => {
                  const isMe = msg.sender === "me";
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${isMe ? "bg-[#223F74] text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"}`}
                      >
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[9px] font-medium text-slate-400">
                          {msg.time}
                        </span>
                        {isMe && (
                          <CheckCheck
                            className={`h-3.5 w-3.5 ${msg.status === "read" ? "text-emerald-500" : "text-slate-300"}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-slate-400 py-16 flex flex-col items-center">
                  <MessageSquare className="h-12 w-12 text-slate-200 mb-3" />
                  <p className="font-bold">No messages here yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Send a message to kickstart the conversation.
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleSendDM} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 bg-[#223F74] text-white rounded-full hover:bg-blue-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                  <Send className="h-4.5 w-4.5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
            <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-[#223F74]">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Select a Student
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
              Choose a student from the left pane to view history and start
              sending real-time messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10 px-4 sm:px-6">
      <Toaster />

      {/* HEADER & TABS */}
      <Heading
        primaryText="Communication Hub"
        secondaryText="Raise support tickets to admin or chat directly with students"
        size={12}
        action={
          globalTab === "complaints" &&
          !selectedTicketId && (
            <Button
              text="Raise Admin Request"
              icon={<Plus size={16} />}
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            />
          )
        }
      />

      {/* TAB SWITCHER */}
      {!selectedTicketId && (
        <div className="flex bg-white p-1.5 rounded-xl w-full max-w-sm shadow-sm border border-slate-200">
          <button
            onClick={() => setGlobalTab("complaints")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${globalTab === "complaints" ? "bg-[#223F74] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Admin Support
          </button>
          <button
            onClick={() => setGlobalTab("messages")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${globalTab === "messages" ? "bg-[#223F74] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Direct Messages
          </button>
        </div>
      )}

      {/* VIEW RENDER LOGIC */}
      {globalTab === "complaints" ? (
        selectedTicketId ? (
          renderComplaintDetails()
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-200 mt-6">
            <div className="mb-8">
              <DashGrid cols={12} gap={4}>
                <DashCard
                  icon={<AlertCircle size={22} />}
                  title="Open"
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
                  icon={<CheckCircle2 size={22} />}
                  title="Resolved"
                  value={stats.resolved}
                  accentColor="#10b981"
                  size={3}
                />
                <DashCard
                  icon={<Ticket size={22} />}
                  title="Total Raised"
                  value={stats.total}
                  accentColor="#3b82f6"
                  size={3}
                />
              </DashGrid>
            </div>
            <div className="mb-8">
              <DataTable
                title="My Active Requests"
                columns={[
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
                        <span className="font-bold text-slate-800 line-clamp-1">
                          {val}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                          {row.category.replace("_", " ")}
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
                    tooltip: "View Thread",
                    variant: "primary",
                    onClick: (row) => handleViewTicket(row),
                  },
                ]}
                filters={[
                  {
                    title: "Status",
                    type: "select",
                    key: "status",
                    options: ["open", "in_progress", "resolved", "closed"],
                  },
                ]}
                searchable={true}
                size={12}
                pageSize={10}
              />
            </div>
          </div>
        )
      ) : (
        renderDirectMessages()
      )}

      {/* ── Create Ticket Modal ── */}
      <PanelModal
        id="create-complaint-modal"
        title="Raise Admin Request"
        isVisible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewTicket({
            title: "",
            category: "general",
            priority: "medium",
            description: "",
            assignedToRole: "admin",
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
              placeholder="Brief summary of the issue or request"
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
                <Option value="academic" label="Academic / Curriculum" />
                <Option value="infrastructure" label="Infrastructure / IT" />
                <Option value="payroll" label="Payroll / HR" />
                <Option value="disciplinary" label="Disciplinary Issue" />
                <Option value="general" label="General Query" />
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
              placeholder="Provide detailed information..."
              rows={5}
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
              text={isSubmitting ? "Submitting..." : "Submit to Admin"}
              icon={!isSubmitting && <Send size={14} />}
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
    </div>
  );
};

export default TeacherCommunicationHub;
