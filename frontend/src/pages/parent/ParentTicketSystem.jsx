import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Clock, CheckCircle, 
  AlertCircle, MessageSquare, ChevronRight, X, Loader2,
  TicketCheck, CircleDot, Loader, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getTicketsApi, createTicketApi, getClassTeacherApi, getSubjectTeachersApi, createComplaintApi } from '../../services/api/parentTicketApi';
import {
  Heading, DashGrid, EnhancedDashCard, PanelModal
} from '../../components/shared/Common_Components';

const CARD = 'rounded-[28px] border border-[#E7E2DB] bg-white shadow-sm';

const parseDescription = (desc) => {
  let sendTo = '';
  let customReason = '';
  let cleanDesc = desc || '';

  // Extract Send To if present at the start
  const sendToMatch = cleanDesc.match(/^\[Send To:\s*([^\]]+)\]/);
  if (sendToMatch) {
    sendTo = sendToMatch[1].trim();
    cleanDesc = cleanDesc.replace(sendToMatch[0], '').trim();
  }

  // Extract Custom Category / Reason if present
  const customReasonMatch = cleanDesc.match(/^\[Custom Category:\s*([^\]]+)\]/);
  if (customReasonMatch) {
    customReason = customReasonMatch[1].trim();
    cleanDesc = cleanDesc.replace(customReasonMatch[0], '').trim();
  }

  return { sendTo, customReason, cleanDesc };
};

const getDisplaySendTo = (sendToVal) => {
  if (!sendToVal) return "";
  const s = sendToVal.trim().toLowerCase();
  if (s === 'teacher' || s === 'classteacher' || s === 'class teacher') {
    return 'Class Teacher';
  }
  return sendToVal;
};

const ParentTicketSystem = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const [newTicket, setNewTicket] = useState({
    category: 'general',
    customReason: '',
    sendTo: 'Admin',
    subject: '',
    details: '',
    requestType: 'Lost Card',
    assignedTeacherId: '',
    assignedSubject: ''
  });

  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [isTeachersLoading, setIsTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState("");

  useEffect(() => {
    if (isModalOpen && newTicket.category === 'academic' && newTicket.sendTo === 'Subject Teacher') {
      const currentStudentId = localStorage.getItem("studentId");
      if (currentStudentId) {
        const fetchSubjectTeachers = async () => {
          try {
            setIsTeachersLoading(true);
            setTeachersError("");
            const res = await getSubjectTeachersApi(currentStudentId);
            if (res.success) {
              setSubjectTeachers(res.data || []);
              if ((res.data || []).length === 0) {
                setTeachersError("No Subject Teacher assigned for your class.");
              }
            } else {
              setTeachersError("Failed to load subject teachers.");
            }
          } catch (err) {
            setTeachersError(err.message || "No Subject Teacher assigned for your class.");
          } finally {
            setIsTeachersLoading(false);
          }
        };
        fetchSubjectTeachers();
      }
    }
  }, [isModalOpen, newTicket.category, newTicket.sendTo]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const response = await getTicketsApi();
      if (response.success) {
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load complaints & queries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getMappedStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'open';
      case 'in_progress': return 'in progress';
      case 'resolved': return 'resolved';
      case 'closed': return 'resolved';
      default: return 'open';
    }
  };

  const handleSubmitTicket = async () => {
    const isIdCard = newTicket.category === 'id_card';
    const subject = isIdCard ? `ID Card - ${newTicket.requestType || 'Lost Card'}` : newTicket.subject;
    const details = newTicket.details;

    if ((!isIdCard && !subject.trim()) || !details.trim()) {
      toast.error(isIdCard ? "Details are required." : "Subject and details are required.");
      return;
    }

    if (newTicket.category === 'academic') {
      if (newTicket.sendTo === 'Subject Teacher') {
        if (!newTicket.assignedTeacherId) {
          toast.error("Please select a Subject Teacher.");
          return;
        }
        if (subjectTeachers.length === 0) {
          toast.error("No Subject Teacher assigned for your class. Cannot submit complaint.");
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);

      const schoolId = localStorage.getItem("schoolId");
      const currentStudentId = localStorage.getItem("studentId");

      let descriptionPayload = '';
      if (isIdCard) {
        descriptionPayload = details;
      } else {
        if (newTicket.sendTo) {
          descriptionPayload += `[Send To: ${newTicket.sendTo}] `;
        }
        if (newTicket.customReason.trim()) {
          descriptionPayload += `[Custom Category: ${newTicket.customReason.trim()}]`;
        }
        if (descriptionPayload) {
          descriptionPayload += `\n\n`;
        }
        descriptionPayload += details;
      }

      let response;
      if (newTicket.category === 'academic') {
        response = await createComplaintApi({
          title: subject,
          description: descriptionPayload,
          category: newTicket.category,
          priority: 'medium',
          school_id: schoolId,
          student_id: currentStudentId,
          sendTo: newTicket.sendTo,
          assignedTeacherId: newTicket.assignedTeacherId,
          assignedSubject: newTicket.assignedSubject
        });
      } else {
        response = await createTicketApi({
          title: subject,
          description: descriptionPayload,
          category: newTicket.category,
          priority: 'medium',
          school_id: schoolId,
          student_id: currentStudentId,
          customReason: isIdCard ? (newTicket.requestType || 'Lost Card') : newTicket.customReason,
          customCategory: isIdCard ? (newTicket.requestType || 'Lost Card') : newTicket.customReason,
          sendTo: isIdCard ? 'Admin' : newTicket.sendTo,
          ticketType: isIdCard ? 'ID_CARD_REQUEST' : 'standard',
        });
      }

      if (response.success) {
        toast.success(isIdCard ? "Your ID Card request has been submitted successfully." : "Complaint / Query submitted successfully!");
        setIsModalOpen(false);
        setNewTicket({
          category: 'general',
          customReason: '',
          sendTo: 'Admin',
          subject: '',
          details: '',
          requestType: 'Lost Card',
          assignedTeacherId: '',
          assignedSubject: ''
        });
        fetchTickets(); 
      }
    } catch (error) {
      const isNoTeacherError = error.message && (error.message.includes("No class teacher has been assigned") || error.message.includes("homeroomTeacher"));
      if (isNoTeacherError) {
        setIsWarningModalOpen(true);
      } else {
        toast.error(error.message || "Failed to submit complaint / query.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTicketChat = (ticketId) => {
    // Find the full ticket data from your list
    const ticket = tickets.find(t => t._id === ticketId);
    setSelectedTicket(ticket);
    setIsChatOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed': return 'bg-emerald-100 text-emerald-700';
      case 'in_progress':
      case 'escalated': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  // --- FILTER & SEARCH LOGIC ---
  const displayedTickets = tickets.filter(ticket => {
    // 1. Check if it matches the active tab (All, Open, In Progress, Resolved)
    const matchesTab = activeFilter === 'All' || ticket.status?.toLowerCase() === activeFilter.toLowerCase().replace(' ', '_');
    
    // 2. Check if it matches the search bar text
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      ticket.title?.toLowerCase().includes(searchLower) || 
      ticket.category?.toLowerCase().includes(searchLower) ||
      ticket._id?.toLowerCase().includes(searchLower); // Lets them search by TKT ID!

    return matchesTab && matchesSearch;
  });

  // --- STATS ---
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status?.toLowerCase() === 'open').length;
  const inProgressCount = tickets.filter(t => t.status?.toLowerCase() === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status?.toLowerCase() === 'resolved' || t.status?.toLowerCase() === 'closed').length;

  const filterTabs = [
    { key: 'All', label: 'All', count: totalCount, icon: <TicketCheck size={16} /> },
    { key: 'Open', label: 'Open', count: openCount, icon: <CircleDot size={16} /> },
    { key: 'In Progress', label: 'In Progress', count: inProgressCount, icon: <Loader size={16} /> },
    { key: 'Resolved', label: 'Resolved', count: resolvedCount, icon: <ShieldCheck size={16} /> },
  ];

  return (
    <div className="w-full space-y-6 pb-10 text-left min-h-screen">

      {/* ── Page Heading ── */}
      <Heading
        primaryText="Complaint &"
        secondaryText="Query"
        size={12}
        showAnimations={true}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-[#223F74] font-black text-sm rounded-2xl transition-all shadow-sm border border-[#E7E2DB] hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            New Complaint / Query
          </button>
        }
      />

      {/* ── Summary Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Tickets"
          value={String(totalCount)}
          icon={<TicketCheck size={22} />}
          size={3}
          accentColor="#3B82F6"
          onClick={() => setActiveFilter('All')}
        />
        <EnhancedDashCard
          title="Open"
          value={String(openCount)}
          icon={<CircleDot size={22} />}
          size={3}
          accentColor="#F59E0B"
          onClick={() => setActiveFilter('Open')}
        />
        <EnhancedDashCard
          title="In Progress"
          value={String(inProgressCount)}
          icon={<Loader size={22} />}
          size={3}
          accentColor="#8B5CF6"
          onClick={() => setActiveFilter('In Progress')}
        />
        <EnhancedDashCard
          title="Resolved"
          value={String(resolvedCount)}
          icon={<ShieldCheck size={22} />}
          size={3}
          accentColor="#10B981"
          onClick={() => setActiveFilter('Resolved')}
        />
      </DashGrid>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeFilter === tab.key
                ? 'bg-[#223F74] text-white border-[#223F74] shadow-sm'
                : 'bg-white border-[#E7E2DB] text-slate-500 hover:border-[#223F74] hover:text-[#223F74]'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeFilter === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Ticket List Card ── */}
      <div className={`${CARD} overflow-hidden`}>
        
        {/* Search Bar Area */}
        <div className="p-5 border-b border-[#E7E2DB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
            <h3 className="text-lg font-black text-slate-800">Your Complaints & Queries</h3>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, category, or ID..." 
              className="pl-10 pr-4 py-2.5 border border-[#E7E2DB] rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none bg-white w-full transition-colors"
            />
          </div>
        </div>

        <div className="divide-y divide-[#E7E2DB]/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-[#F8EEE9] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#223F74]" />
              </div>
              <p className="font-bold text-sm text-slate-400">Loading complaints & queries...</p>
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-[#F8EEE9] flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-[#223F74]/40" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-700 text-sm">
                  {searchQuery ? "No results found" : "No complaints or queries yet"}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {searchQuery
                    ? "Try a different search term or clear the filter."
                    : "Click \"New Complaint / Query\" to raise your first ticket."}
                </p>
              </div>
            </div>
          ) : displayedTickets.map((ticket) => {
            const { sendTo: parsedSendTo, customReason: parsedCustomReason } = parseDescription(ticket.description);
            const displayCategory = ticket.customReason || ticket.customCategory || parsedCustomReason || ticket.category;
            const displaySendTo = ticket.sendTo || parsedSendTo;

            return (
              <div 
                key={ticket._id} 
                onClick={() => openTicketChat(ticket._id)}
                className="p-5 hover:bg-[#F8EEE9]/40 transition-all group cursor-pointer flex flex-col md:flex-row gap-4 md:items-center justify-between"
              >
                
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#223F74]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#223F74] group-hover:text-white transition-all">
                    <MessageSquare className="w-5 h-5 text-[#223F74] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CQ-{ticket._id.substring(ticket._id.length - 6).toUpperCase()}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 group-hover:text-[#223F74] transition-colors">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 capitalize">
                        <MessageSquare className="w-3.5 h-3.5" /> 
                        {displayCategory}
                      </span>
                      {displaySendTo && (
                        <span className="flex items-center gap-1.5 bg-[#F8EEE9] text-[#223F74] px-2 py-0.5 rounded-md text-[10px] font-black">
                          To: {getDisplaySendTo(displaySendTo)}
                        </span>
                      )}
                      {/* Priority tag removed from parent UI */}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex-shrink-0">
                  <span>📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#223F74] transition-colors" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* --- NEW TICKET MODAL (CREATE FORM) --- */}
      <PanelModal
        id="create-ticket-modal"
        title="Create Complaint / Query"
        size="xl"
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-400 -mt-2 mb-4">We will get back to you within 24 hours.</p>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <select 
              value={newTicket.category}
              onChange={(e) => {
                const cat = e.target.value;
                setNewTicket({
                  ...newTicket,
                  category: cat,
                  sendTo: cat === 'academic' ? 'Class Teacher' : 'Admin',
                  assignedTeacherId: '',
                  assignedSubject: ''
                });
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm font-medium text-slate-700"
            >
              <option value="academic">Academics &amp; Teachers</option>
              <option value="transport">Transport &amp; Bus</option>
              <option value="fee">Finance &amp; Fees</option>
              <option value="general">Technical Issue</option>
              <option value="id_card">ID Card</option>
              <option value="query">Other Support</option>
            </select>
          </div>

          {newTicket.category !== 'id_card' ? (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Custom Reason / Category</label>
                <input 
                  type="text" 
                  value={newTicket.customReason}
                  onChange={(e) => setNewTicket({...newTicket, customReason: e.target.value})}
                  placeholder="e.g. Fee issue, Bus complaint, Teacher behaviour"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Send To</label>
                <select 
                  value={newTicket.sendTo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTicket({
                      ...newTicket,
                      sendTo: val,
                      assignedTeacherId: "",
                      assignedSubject: ""
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm font-medium text-slate-700"
                >
                  {newTicket.category === 'academic' ? (
                    <>
                      <option value="Class Teacher">Class Teacher</option>
                      <option value="Subject Teacher">Subject Teacher</option>
                    </>
                  ) : (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Class Teacher">Class Teacher</option>
                    </>
                  )}
                </select>
              </div>

              {newTicket.category === 'academic' && newTicket.sendTo === 'Subject Teacher' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Subject Teacher</label>
                  {isTeachersLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading subject teachers...
                    </div>
                  ) : teachersError ? (
                    <div className="text-xs font-bold text-red-500 py-1">{teachersError}</div>
                  ) : (
                    <select
                      value={newTicket.assignedTeacherId ? `${newTicket.assignedTeacherId}|${newTicket.assignedSubject}` : ""}
                      onChange={(e) => {
                        const [tId, tSubject] = e.target.value.split('|');
                        setNewTicket({
                          ...newTicket,
                          assignedTeacherId: tId || "",
                          assignedSubject: tSubject || ""
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm font-medium text-slate-700"
                    >
                      <option value="">-- Select Subject Teacher --</option>
                      {subjectTeachers.map((t, idx) => (
                        <option key={idx} value={`${t._id}|${t.subjectName}`}>
                          {t.subjectName} - {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                <input 
                  type="text" 
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="Brief description of the complaint or query"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Details</label>
                <textarea 
                  rows="4"
                  value={newTicket.details}
                  onChange={(e) => setNewTicket({...newTicket, details: e.target.value})}
                  placeholder="Please provide as much detail as possible..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors resize-none text-sm"
                ></textarea>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Request Type</label>
                <select 
                  value={newTicket.requestType}
                  onChange={(e) => setNewTicket({...newTicket, requestType: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors text-sm font-medium text-slate-700"
                >
                  <option value="Lost Card">Lost Card</option>
                  <option value="Damaged Card">Damaged Card</option>
                  <option value="Name Correction">Name Correction</option>
                  <option value="Photo Update">Photo Update</option>
                  <option value="Card Not Received">Card Not Received</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  rows="4"
                  value={newTicket.details}
                  onChange={(e) => setNewTicket({...newTicket, details: e.target.value})}
                  placeholder="Please describe your ID Card issue..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E7E2DB] bg-white focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-colors resize-none text-sm"
                ></textarea>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 border border-[#E7E2DB]"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmitTicket}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#223F74] hover:bg-[#1a3360] text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Complaint / Query
            </button>
          </div>
        </div>
      </PanelModal>

      {/* --- TICKET DETAILS MODAL (READ-ONLY) --- */}
      <PanelModal
        id="ticket-details-modal"
        title={selectedTicket ? selectedTicket.title : 'Ticket Details'}
        size="2xl"
        isVisible={isChatOpen && !!selectedTicket}
        onClose={() => setIsChatOpen(false)}
      >
        {selectedTicket && (
          <div className="space-y-6">
            
            {/* Ticket ID & Status */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CQ-{selectedTicket._id.substring(selectedTicket._id.length - 6).toUpperCase()}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status.replace('_', ' ')}
              </span>
            </div>

            {/* Meta details (Category, Custom Reason, Send To) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#F8EEE9] p-4 rounded-2xl text-sm border border-[#E7E2DB]">
              <div>
                <span className="text-[10px] font-black text-slate-400 block mb-0.5 uppercase tracking-wider">Category</span>
                <span className="font-bold text-[#223F74] capitalize">
                  {selectedTicket.category === 'id_card' ? 'ID Card' : selectedTicket.category}
                </span>
              </div>
              {(selectedTicket.customReason || selectedTicket.customCategory || parseDescription(selectedTicket.description).customReason) && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-0.5 uppercase tracking-wider">Custom Reason</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedTicket.customReason || selectedTicket.customCategory || parseDescription(selectedTicket.description).customReason}
                  </span>
                </div>
              )}
              {(selectedTicket.sendTo || parseDescription(selectedTicket.description).sendTo) && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-0.5 uppercase tracking-wider">Send To</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {getDisplaySendTo(selectedTicket.sendTo || parseDescription(selectedTicket.description).sendTo)}
                  </span>
                </div>
              )}
            </div>

            {/* Original Ticket Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Original Complaint / Query</span>
              <div className="bg-[#223F74]/5 text-slate-800 p-4 rounded-2xl rounded-tl-sm text-sm border border-[#223F74]/10 leading-relaxed">
                {parseDescription(selectedTicket.description).cleanDesc}
              </div>
              <span className="text-[10px] text-slate-400 font-bold">📅 {new Date(selectedTicket.createdAt).toLocaleString()}</span>
            </div>

            {/* Map through staff responses */}
            {(selectedTicket.responses || []).map((reply, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Staff Reply</span>
                <div className="bg-[#F8EEE9] text-slate-800 p-4 rounded-2xl rounded-tr-sm text-sm border border-[#E7E2DB] max-w-[80%] leading-relaxed">
                  {reply.message}
                </div>
              </div>
            ))}

            {/* Footer / Read-Only Status */}
            <div className="p-4 bg-[#F8EEE9] rounded-2xl border border-[#E7E2DB] text-center">
              {selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' ? (
                <p className="text-sm text-emerald-600 font-black">✅ This complaint / query has been marked as resolved.</p>
              ) : (
                <p className="text-sm text-[#223F74] font-bold">We have received your complaint / query and are currently reviewing it.</p>
              )}
            </div>

          </div>
        )}
      </PanelModal>

      {/* --- CLASS TEACHER NOT ASSIGNED WARNING DIALOG --- */}
      <PanelModal
        id="no-teacher-warning-modal"
        title="Class Teacher Not Assigned"
        size="md"
        isVisible={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
      >
        <div className="flex flex-col items-center text-center p-5 space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-10 h-10 animate-bounce" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800">⚠️ Class Teacher Not Assigned</h3>
            <p className="text-sm text-slate-700 font-bold leading-relaxed">
              No Class Teacher has been assigned to your class yet.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your complaint cannot be sent to a Class Teacher at this moment.
            </p>
            <p className="text-xs text-slate-400 italic">
              Please contact the school administration or choose "Admin" as the recipient.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <button
              onClick={() => {
                setNewTicket(prev => ({ ...prev, sendTo: "Admin" }));
                setIsWarningModalOpen(false);
              }}
              className="flex-1 px-5 py-3 bg-[#223F74] hover:bg-[#1a3360] text-white font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              Send to Admin
            </button>
            <button
              onClick={() => setIsWarningModalOpen(false)}
              className="flex-1 px-5 py-3 border border-[#E7E2DB] hover:bg-slate-50 text-slate-500 font-bold text-sm rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </PanelModal>

    </div>
  );
};

export default ParentTicketSystem;
