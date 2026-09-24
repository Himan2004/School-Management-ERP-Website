// ComplaintManagement.jsx - Subject Teacher Complaints Module
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Filter,
  Search,
  ChevronDown,
  X,
  Send,
  AlertCircle,
  User,
  Calendar,
  Tag,
  Flag,
  MoreVertical,
  FileText,
  Users,
  TrendingUp,
  BookOpen,
  Coins,
  Truck,
  GraduationCap,
  Mail,
  Phone,
  Paperclip,
  Image,
  RefreshCw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";

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
} from "../../../components/shared/Common_Components";

import {
  getComplaintDashboard,
  getComplaints,
  createComplaint,
  getComplaintDetails,
  updateComplaintStatus,
  escalateComplaint,
  replyComplaint,
  getClassesList,
  getStudentsByClass
} from "../../../services/api/subjectTeacherComplaintApi";

// Global module-level cache for Complaints Management
let cachedAssignedComplaints = null;
let cachedRaisedComplaints = null;
let cachedStats = null;
let cachedClassesList = null;
let cachedFilters = {
  status: "all",
  category: "all",
  priority: "all",
  source: "all",
  search: "",
  startDate: "",
  endDate: "",
  sort: "newest"
};
let cachedActiveTab = "all";
let cachedPage = 1;
let cachedUserId = "";
let cachedSchoolId = "";
let cachedOrgId = "";
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache duration

const ComplaintManagement = () => {
  const authUser = useSelector((state) => state.teacherAuth?.teacher || state.auth?.user);
  const userId = authUser?._id || authUser?.id || "";
  const schoolId = authUser?.school?._id || authUser?.school || "";
  const orgId = authUser?.school?.organization?._id || authUser?.school?.organization || authUser?.organization || "";

  const contextChanged = userId !== cachedUserId || schoolId !== cachedSchoolId || orgId !== cachedOrgId;

  if (contextChanged) {
    cachedAssignedComplaints = null;
    cachedRaisedComplaints = null;
    cachedStats = null;
    cachedClassesList = null;
    cachedFilters = {
      status: "all",
      category: "all",
      priority: "all",
      source: "all",
      search: "",
      startDate: "",
      endDate: "",
      sort: "newest"
    };
    cachedActiveTab = "all";
    cachedPage = 1;
    cachedUserId = userId;
    cachedSchoolId = schoolId;
    cachedOrgId = orgId;
    lastFetchTime = 0;
  }

  const [activeTab, setActiveTab] = useState(cachedActiveTab); // 'all' (assigned to me) or 'my' (raised by me)
  const [page, setPage] = useState(cachedPage);

  const [assignedComplaints, setAssignedComplaints] = useState(cachedAssignedComplaints || []);
  const [raisedComplaints, setRaisedComplaints] = useState(cachedRaisedComplaints || []);

  const [stats, setStats] = useState(cachedStats || { 
    total: 0, 
    open: 0, 
    inProgress: 0, 
    resolved: 0,
    escalated: 0,
    myComplaints: 0,
    resolutionRate: 0
  });

  const [loading, setLoading] = useState(!cachedAssignedComplaints);

  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [complaintDetails, setComplaintDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [classesList, setClassesList] = useState(cachedClassesList || []);
  const [studentsList, setStudentsList] = useState([]);
  const [isClassesLoading, setIsClassesLoading] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  const [newComplaint, setNewComplaint] = useState({
    title: "",
    category: "academic",
    priority: "medium",
    description: "",
    classId: "",
    sectionId: "",
    studentId: "",
    remark: "",
    attachments: []
  });

  const isFirstLoad = !cachedAssignedComplaints;

  const [formErrors, setFormErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validateForm = (data) => {
    const errors = {};
    if (!data.title?.trim()) {
      errors.title = "Subject is required.";
    }
    if (!data.category) {
      errors.category = "Please select a category.";
    }
    if (!data.priority) {
      errors.priority = "Please select a priority.";
    }
    if (!data.classId) {
      errors.class = "Please select a class.";
    }
    if (!data.description?.trim()) {
      errors.description = "Description is required.";
    } else if (data.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters.";
    }
    return errors;
  };

  useEffect(() => {
    if (hasSubmitted) {
      setFormErrors(validateForm(newComplaint));
    }
  }, [newComplaint, hasSubmitted]);

  const lastFiltersRef = useRef({
    page: 1,
    status: "all",
    category: "all",
    priority: "all",
    source: "all",
    search: "",
    startDate: "",
    endDate: "",
    sort: "newest"
  });

  const resetForm = () => {
    setNewComplaint({
      title: "",
      category: "academic",
      priority: "medium",
      description: "",
      classId: "",
      sectionId: "",
      studentId: "",
      remark: "",
      attachments: []
    });
    setStudentsList([]);
    setFormErrors({});
    setHasSubmitted(false);
  };

  const [filters, setFilters] = useState(cachedFilters);

  // Sync state changes back to cache
  useEffect(() => {
    cachedActiveTab = activeTab;
    cachedPage = page;
    cachedFilters = filters;
  }, [activeTab, page, filters]);

  // Sync classesList back to cache
  useEffect(() => {
    if (classesList.length > 0) {
      cachedClassesList = classesList;
    }
  }, [classesList]);

  const currentUser = useSelector((state) => state.auth?.user);

  // Get active dataset
  const activeDataset = activeTab === 'all' ? assignedComplaints : raisedComplaints;

  // ── Client-Side Filtering, Searching, Sorting ──
  const filteredAndSortedComplaints = useMemo(() => {
    let result = [...activeDataset];

    // 1. Status Filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter(c => c.status === filters.status);
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'all') {
      result = result.filter(c => c.category === filters.category);
    }

    // 3. Priority Filter
    if (filters.priority && filters.priority !== 'all') {
      result = result.filter(c => c.priority === filters.priority);
    }

    // 4. Source Filter
    if (filters.source && filters.source !== 'all') {
      result = result.filter(c => c.raisedByType === filters.source);
    }

    // 5. Date Range Filter
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0,0,0,0);
      result = result.filter(c => new Date(c.createdAt) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23,59,59,999);
      result = result.filter(c => new Date(c.createdAt) <= end);
    }

    // 6. Search Filter
    if (filters.search?.trim()) {
      const s = filters.search.trim().toLowerCase();
      result = result.filter(c => {
        const idMatch = c.complaintId?.toLowerCase()?.includes(s);
        const titleMatch = c.title?.toLowerCase()?.includes(s);
        const descMatch = c.description?.toLowerCase()?.includes(s);
        const studentMatch = c.student?.name?.toLowerCase()?.includes(s);
        const parentMatch = c.parent?.name?.toLowerCase()?.includes(s);
        const raisedByMatch = c.raisedBy?.name?.toLowerCase()?.includes(s);
        return idMatch || titleMatch || descMatch || studentMatch || parentMatch || raisedByMatch;
      });
    }

    // 7. Sort Filter
    result.sort((a, b) => {
      if (filters.sort === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (filters.sort === 'recently_updated') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (filters.sort === 'priority') {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const wA = priorityWeight[a.priority?.toLowerCase()] || 0;
        const wB = priorityWeight[b.priority?.toLowerCase()] || 0;
        return wB - wA;
      }
      if (filters.sort === 'status') {
        return a.status.localeCompare(b.status);
      }
      // default: newest
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [activeDataset, filters]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAndSortedComplaints.length / itemsPerPage) || 1;

  const paginatedComplaints = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredAndSortedComplaints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedComplaints, page]);

  // ── Fetch Selection Data for Modal ───────────────────────────────────────
  useEffect(() => {
    if (isCreateModalOpen && classesList.length === 0) {
      const loadClasses = async () => {
        try {
          setIsClassesLoading(true);
          const res = await getClassesList();
          if (res.success) {
            const data = res.data || [];
            const getClassSortValue = (name) => {
              const clean = name.trim().toLowerCase();
              if (clean === "nursery") return 0;
              if (clean === "junior kg" || clean === "jr. kg" || clean === "jr kg" || clean === "lkg") return 1;
              if (clean === "senior kg" || clean === "sr. kg" || clean === "sr kg" || clean === "ukg") return 2;
              
              const match = clean.match(/(?:class\s+)?(\d+)/);
              if (match) {
                return 3 + parseInt(match[1], 10) - 1;
              }
              return 100;
            };
            data.sort((a, b) => {
              const valA = getClassSortValue(a.className);
              const valB = getClassSortValue(b.className);
              if (valA !== valB) return valA - valB;
              return a.sectionName.localeCompare(b.sectionName);
            });
            setClassesList(data);
          }
        } catch (error) {
          console.error("Failed to load classes:", error);
          toast.error("Failed to load classes list");
        } finally {
          setIsClassesLoading(false);
        }
      };
      loadClasses();
    }
  }, [isCreateModalOpen, classesList.length]);

  const handleClassChange = async (classVal) => {
    if (!classVal) {
      setNewComplaint(prev => ({
        ...prev,
        classId: "",
        sectionId: "",
        studentId: ""
      }));
      setStudentsList([]);
      return;
    }

    const [classId, sectionId] = classVal.split("|");
    setNewComplaint(prev => ({
      ...prev,
      classId,
      sectionId,
      studentId: ""
    }));

    try {
      setIsStudentsLoading(true);
      const res = await getStudentsByClass(classId, sectionId);
      if (res.success) {
        setStudentsList(res.data || []);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
      toast.error("Failed to load student list for selected class");
    } finally {
      setIsStudentsLoading(false);
    }
  };

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchComplaints = async (forceRefetch = false) => {
    const now = Date.now();
    const isFirstLoad = !cachedAssignedComplaints;

    if (!forceRefetch && !isFirstLoad && (now - lastFetchTime < CACHE_DURATION)) {
      return;
    }

    try {
      if (isFirstLoad || forceRefetch) {
        setLoading(true);
      }

      // Fetch Dashboard stats and both tabs in parallel
      const [dashboardStats, assignedRes, raisedRes] = await Promise.all([
        getComplaintDashboard(),
        getComplaints({ tab: 'all', limit: 1000 }),
        getComplaints({ tab: 'my', limit: 1000 })
      ]);

      if (dashboardStats.success) {
        setStats(dashboardStats.data);
        cachedStats = dashboardStats.data;
      }

      if (assignedRes.success && raisedRes.success) {
        let assignedList = assignedRes.data.complaints || [];
        let raisedList = raisedRes.data.complaints || [];

        const currentUserId = currentUser?._id || currentUser?.id;
        assignedList = assignedList.filter(complaint => {
          const raisedById = complaint.raisedBy?._id || complaint.raisedBy;
          const isRaisedByMe = String(raisedById) === String(currentUserId);
          
          if (isRaisedByMe) {
            const assignedBack = complaint.history?.some(h => 
              h.performedBy && String(h.performedBy?._id || h.performedBy) !== String(currentUserId)
            );
            return !!assignedBack;
          }
          return true;
        });

        setAssignedComplaints(assignedList);
        setRaisedComplaints(raisedList);
        cachedAssignedComplaints = assignedList;
        cachedRaisedComplaints = raisedList;
        lastFetchTime = now;
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters]);

  const handleViewComplaint = async (row) => {
    try {
      setIsDetailsLoading(true);
      setSelectedComplaintId(row._id);
      const response = await getComplaintDetails(row._id);
      if (response.success) setComplaintDetails(response.data);
    } catch (error) {
      toast.error("Failed to load complaint details");
      setSelectedComplaintId(null);
    } finally { 
      setIsDetailsLoading(false); 
    }
  };

  const handleReply = async (msgObj) => {
    if (!msgObj.text?.trim()) return;
    try {
      const response = await replyComplaint(selectedComplaintId, msgObj.text);
      if (response.success) {
        setComplaintDetails(response.data);
        toast.success("Reply sent successfully");
      }
    } catch (error) { 
      toast.error(error.message || "Failed to send reply"); 
    }
  };

  const handleResolve = async () => {
    try {
      const response = await updateComplaintStatus(selectedComplaintId, "resolved", "Resolved by Subject Teacher");
      if (response.success) {
        toast.success("Complaint marked as resolved");
        setComplaintDetails(response.data);
        fetchComplaints(true);
      }
    } catch (error) { 
      toast.error(error.message || "Failed to update status"); 
    }
  };

  const handleClose = async () => {
    try {
      const response = await updateComplaintStatus(selectedComplaintId, "closed", "Closed by Subject Teacher");
      if (response.success) {
        toast.success("Complaint closed successfully");
        setComplaintDetails(response.data);
        fetchComplaints(true);
      }
    } catch (error) { 
      toast.error(error.message || "Failed to close complaint"); 
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) {
      toast.error("Reason is required for escalation");
      return;
    }

    try {
      setIsEscalating(true);
      const response = await escalateComplaint(selectedComplaintId, escalationReason.trim());

      if (response.success) {
        toast.success("Complaint escalated to Admin successfully");
        setComplaintDetails(response.data);
        setIsEscalationModalOpen(false);
        setEscalationReason("");
        fetchComplaints(true);
      }
    } catch (error) { 
      toast.error(error.message || "Failed to escalate complaint"); 
    } finally { 
      setIsEscalating(false); 
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    
    setHasSubmitted(true);
    const errors = validateForm(newComplaint);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createComplaint({
        title: newComplaint.title.trim(),
        category: newComplaint.category,
        priority: newComplaint.priority,
        classId: newComplaint.classId,
        sectionId: newComplaint.sectionId,
        studentId: newComplaint.studentId || null,
        description: newComplaint.description.trim(),
        remark: newComplaint.remark?.trim(),
        attachments: newComplaint.attachments
      });
      
      if (response.success) {
        toast.success("Complaint raised successfully!");
        setIsCreateModalOpen(false);
        resetForm();
        fetchComplaints(true);
      }
    } catch (error) {
      toast.error(error.message || "Failed to raise complaint");
    } finally {
      setIsSubmitting(false);
    }
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

  const getCategoryIcon = (category) => {
    const icons = {
      academic: <BookOpen size={14} />,
      homework: <FileText size={14} />,
      attendance: <Clock size={14} />,
      behaviour: <AlertTriangle size={14} />,
      examination: <ShieldAlert size={14} />,
      marks: <Coins size={14} />,
      discipline: <AlertTriangle size={14} />,
      technical: <Tag size={14} />,
      other: <FileText size={14} />,
    };
    return icons[category] || <FileText size={14} />;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      academic: "Academic",
      homework: "Homework",
      attendance: "Attendance",
      behaviour: "Behaviour",
      examination: "Examination",
      marks: "Marks",
      discipline: "Discipline",
      technical: "Technical",
      other: "Other"
    };
    return labels[category] || category;
  };

  // ── Complaint Detail View ──────────────────────────────────────────────
  if (selectedComplaintId) {
    if (isDetailsLoading || !complaintDetails) {
      return (
        <div className="w-full max-w-[1600px] mx-auto py-20 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#223F74]" size={32} />
          <p className="text-[#223F74] font-bold tracking-widest uppercase text-xs">
            Loading Complaint Details...
          </p>
        </div>
      );
    }

    const initialMessage = {
      sender: complaintDetails.raisedBy?.name || "Unknown",
      time: new Date(complaintDetails.createdAt).toLocaleString(),
      text: complaintDetails.description,
    };

    const threadMessages = (complaintDetails.conversation || []).map((res) => ({
      sender: res.sender?._id === currentUser?._id ? "Me" : (res.sender?.name || "Support"),
      time: new Date(res.createdAt).toLocaleString(),
      text: res.message,
    }));

    const chatMessages = [initialMessage, ...threadMessages];
    const isClosed = complaintDetails.status?.toLowerCase() === "closed";
    const canEscalate = (complaintDetails.status?.toLowerCase() === "open" || complaintDetails.status?.toLowerCase() === "in_progress");

    return (
      <div className="w-full space-y-8 pb-10 text-left">
        <Toaster />

        <div className="flex items-center justify-between mb-6 pt-4">
          <button 
            onClick={() => {
              setSelectedComplaintId(null);
              setComplaintDetails(null);
              fetchComplaints(true);
            }} 
            className="flex items-center gap-2 text-slate-500 hover:text-[#223F74] font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>

          <div className="flex gap-3">
            {canEscalate && (
              <Button 
                text="Escalate to Admin" 
                variant="danger" 
                icon={<ArrowUpRight size={16} />} 
                size={3} 
                onClick={() => setIsEscalationModalOpen(true)} 
              />
            )}
            {complaintDetails.status?.toLowerCase() !== "resolved" && !isClosed && (
              <Button 
                text="Mark Resolved" 
                variant="success" 
                icon={<CheckCircle2 size={16} />} 
                size={3} 
                onClick={handleResolve} 
              />
            )}
            {complaintDetails.status?.toLowerCase() === "resolved" && (
              <Button 
                text="Close Complaint" 
                variant="secondary" 
                icon={<CheckCircle size={16} />} 
                size={3} 
                onClick={handleClose} 
              />
            )}
          </div>
        </div>

        <Grid cols={12} gap={6}>
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">{complaintDetails.title}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs font-bold text-slate-400">
                    ID: {complaintDetails.complaintId || complaintDetails._id}
                  </p>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-400">
                    {new Date(complaintDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${getStatusStyle(complaintDetails.status)}`}>
                  {complaintDetails.status?.replace("_", " ")}
                </span>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-widest ${getPriorityStyle(complaintDetails.priority)}`}>
                  {complaintDetails.priority}
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 bg-slate-50/30 overflow-hidden">
              <UserChat
                messages={chatMessages}
                onSend={handleReply}
                currentUser="Me"
                maxHeight="h-[520px]"
                readOnly={isClosed}
                showAttach={false}
                placeholder={isClosed ? "This complaint is closed" : "Type your reply..."}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-fit space-y-5">
              <h3 className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-2 border-b border-slate-100 pb-4">
                Complaint Information
              </h3>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <UserRound size={20} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                  <p className="text-sm font-bold text-slate-700">{complaintDetails.raisedBy?.name || "Unknown"}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {complaintDetails.raisedByType || complaintDetails.raisedBy?.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Category</p>
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(complaintDetails.category)}
                    <p className="text-xs font-bold text-slate-700 capitalize">
                      {getCategoryLabel(complaintDetails.category)}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Priority</p>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border inline-block uppercase tracking-widest ${getPriorityStyle(complaintDetails.priority)}`}>
                    {complaintDetails.priority}
                  </span>
                </div>
              </div>

              {/* Related Parties */}
              {(complaintDetails.student || complaintDetails.parent) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Related Parties</p>
                  {complaintDetails.student && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <GraduationCap size={14} className="text-slate-400" />
                      <span>Student: <strong>{complaintDetails.student.name}</strong></span>
                    </div>
                  )}
                  {complaintDetails.parent && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <Users size={14} className="text-slate-400" />
                      <span>Parent: <strong>{complaintDetails.parent.name}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Timeline */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Activity Timeline</p>
                <div className="space-y-3 mt-2 max-h-[160px] overflow-y-auto">
                  {(complaintDetails.history || []).map((h, index) => (
                    <div key={index} className="flex gap-2.5 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#223F74] mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{h.action}</p>
                        {h.remarks && <p className="text-[10px] text-slate-500 mt-0.5 italic">"{h.remarks}"</p>}
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(h.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!complaintDetails.history || complaintDetails.history.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No activity logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            {complaintDetails.escalated && (
              <div className="bg-purple-50 rounded-3xl border border-purple-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-900 uppercase tracking-widest">
                      Escalated to Admin
                    </h4>
                    <p className="text-xs text-purple-600 font-bold">
                      Pending Admin Higher Review
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                  <p className="text-xs text-slate-700 font-medium italic">"{complaintDetails.escalationReason}"</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                    Escalated At: {new Date(complaintDetails.escalatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Grid>

        <PanelModal 
          id="escalation-modal" 
          title="Escalate to Admin" 
          isVisible={isEscalationModalOpen} 
          onClose={() => setIsEscalationModalOpen(false)} 
          size="md"
        >
          <form onSubmit={handleEscalate} className="space-y-6">
            <Grid cols={1} gap={4}>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Escalating this complaint will send it to the Admin for review.
                    Please provide a detailed reason for escalation.
                  </p>
                </div>
              </div>
              <DataField
                id="escalationReason"
                type="textarea"
                label="Reason for Escalation *"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Provide detailed reason for escalating this complaint..."
                rows={4}
                required
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
                text={isEscalating ? "Escalating..." : "Confirm Escalation"} 
                icon={isEscalating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />} 
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

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      <Toaster />

      <Heading
        primaryText="Complaints "
        secondaryText="Queue"
        size={12}
        showAnimations={true}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 font-sans">
          <h2 className="text-xl sm:text-2xl font-black text-[#223F74] tracking-tight">
            Manage Student & Parent Complaints
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor, review and resolve complaints raised by students and parents.
          </p>
        </div>
        <Button
          text="Raise Complaint"
          icon={<Plus size={16} />}
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Complaints</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{stats.open}</p>
                <p className="text-xs text-slate-400 mt-0.5">Awaiting reply</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <ShieldAlert size={22} className="text-rose-500" />
              </div>
            </div>
            <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.open / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.inProgress}</p>
                <p className="text-xs text-slate-400 mt-0.5">Being reviewed</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <Clock size={22} className="text-amber-500" />
              </div>
            </div>
            <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escalated</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{stats.escalated}</p>
                <p className="text-xs text-slate-400 mt-0.5">With Admin</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <ArrowUpRight size={22} className="text-purple-500" />
              </div>
            </div>
            <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.escalated / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.resolved}</p>
                <p className="text-xs text-slate-400 mt-0.5">Solved complaints</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <CheckCircle size={22} className="text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </DashGrid>

      {/* Quick Stats Row */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total School Complaints</p>
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-xs opacity-70 mt-1">All complaints in school</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">My Created Complaints</p>
            <p className="text-2xl font-black">{stats.myComplaints}</p>
            <p className="text-xs opacity-70 mt-1">Complaints raised by you</p>
          </div>
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Resolution Rate</p>
            <p className="text-2xl font-black">
              {stats.resolutionRate}%
            </p>
            <p className="text-xs opacity-70 mt-1">Performance indicator</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm font-sans">
          <button
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#223F74] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Complaints (Assigned to Me)
          </button>
          <button
            onClick={() => { setActiveTab('my'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-[#223F74] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            My Complaints (Raised by Me)
          </button>
        </div>
      </div>

      {/* Server Filter Toolbar */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] flex flex-wrap gap-4 items-center justify-between font-sans">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">From:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">To:</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Sort:</span>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="recently_updated">Recently Updated</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setFilters({
            status: "all",
            category: "all",
            priority: "all",
            source: "all",
            search: "",
            startDate: "",
            endDate: "",
            sort: "newest"
          })}
          className="text-xs font-bold text-slate-400 hover:text-[#223F74] flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} /> Reset Filters
        </button>
      </div>

      {/* DataTable */}
      <div className="mb-8">
        {isFirstLoad && loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm font-sans">
            <Loader2 className="w-8 h-8 text-[#223F74] animate-spin mb-2" />
            <span className="text-sm font-bold text-slate-500">Loading Complaints...</span>
          </div>
        ) : (
          <>
            <DataTable
              title={`${activeTab === 'all' ? 'Assigned' : 'Raised'} Complaints (${filteredAndSortedComplaints.length})`}
              columns={[
                {
                  key: "id",
                  label: "Complaint",
                  render: (val, row) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-[#223F74]">
                        #{row.complaintId || row._id.slice(-6).toUpperCase()}
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getCategoryIcon(row.category)}
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {getCategoryLabel(row.category)}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "raisedBy",
                  label: "Reporter",
                  render: (val, row) => (
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">
                        {row.raisedBy?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">
                        {row.raisedByType || row.raisedBy?.role}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "priority",
                  label: "Priority",
                  align: "center",
                  render: (val) => (
                    <span className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getPriorityStyle(val)}`}>
                      {val}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  align: "center",
                  render: (val) => (
                    <span className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-widest ${getStatusStyle(val)}`}>
                      {val?.replace("_", " ")}
                    </span>
                  ),
                },
                {
                  key: "responses",
                  label: "Replies",
                  align: "center",
                  render: (val, row) => (
                    <span className="text-sm font-bold text-slate-500">
                      {row.conversation?.length || 0}
                    </span>
                  ),
                },
              ]}
              rows={paginatedComplaints}
              actions={[
                {
                  icon: <Eye size={16} />,
                  tooltip: "View Complaint Details",
                  variant: "primary",
                  onClick: (row) => handleViewComplaint(row),
                },
              ]}
              filters={[
                {
                  title: "Category",
                  type: "select",
                  key: "category",
                  options: [
                    { value: "all", label: "All Categories" },
                    { value: "academic", label: "Academic" },
                    { value: "homework", label: "Homework" },
                    { value: "attendance", label: "Attendance" },
                    { value: "behaviour", label: "Behaviour" },
                    { value: "examination", label: "Examination" },
                    { value: "marks", label: "Marks" },
                    { value: "discipline", label: "Discipline" },
                    { value: "technical", label: "Technical" },
                    { value: "other", label: "Other" }
                  ],
                  value: filters.category,
                  onChange: (value) => setFilters({ ...filters, category: value })
                },
                {
                  title: "Status",
                  type: "select",
                  key: "status",
                  options: [
                    { value: "all", label: "All Status" },
                    { value: "open", label: "Open" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "pending", label: "Pending" },
                    { value: "escalated", label: "Escalated" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" }
                  ],
                  value: filters.status,
                  onChange: (value) => setFilters({ ...filters, status: value })
                },
                {
                  title: "Priority",
                  type: "select",
                  key: "priority",
                  options: [
                    { value: "all", label: "All Priorities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" }
                  ],
                  value: filters.priority,
                  onChange: (value) => setFilters({ ...filters, priority: value })
                },
                {
                  title: "Source",
                  type: "select",
                  key: "source",
                  options: [
                    { value: "all", label: "All Sources" },
                    { value: "parent", label: "Parent" },
                    { value: "student", label: "Student" },
                    { value: "teacher", label: "Teacher" }
                  ],
                  value: filters.source,
                  onChange: (value) => setFilters({ ...filters, source: value })
                }
              ]}
              searchable={true}
              searchValue={filters.search}
              onSearchChange={(value) => setFilters({ ...filters, search: value })}
              size={12}
              pageSize={10}
              loading={isFirstLoad && loading}
              hidePagination={true}
              emptyMessage="No complaints found in this view."
            />

            {/* Client side pagination helper if totalPages > 1 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-4 font-sans text-sm">
                <Button
                  text="Prev"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  size={1}
                />
                <span className="text-slate-500 font-semibold">Page {page} of {totalPages}</span>
                <Button
                  text="Next"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  size={1}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── RAISE COMPLAINT MODAL ── */}
      <PanelModal 
        id="create-complaint-modal" 
        title="Raise a Complaint" 
        isVisible={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }} 
        size="lg"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-6 font-sans">
          {/* Modal Header */}
          <div className="mb-6 pb-5 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-black text-[#223F74]">Raise a Student Complaint</h3>
              <p className="text-sm text-slate-500">
                Submit a new academic or behavioral complaint to track resolution.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Subject / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newComplaint.title}
                onChange={(e) =>
                  setNewComplaint({ ...newComplaint, title: e.target.value })
                }
                placeholder="Brief summary of the issue"
                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white placeholder:text-slate-400 ${
                  formErrors.title ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200'
                }`}
              />
              {formErrors.title && (
                <p className="text-rose-500 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  ❌ {formErrors.title}
                </p>
              )}
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newComplaint.category}
                  onChange={(e) =>
                    setNewComplaint({ ...newComplaint, category: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white ${
                    formErrors.category ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200'
                  }`}
                >
                  <option value="academic">Academic</option>
                  <option value="homework">Homework</option>
                  <option value="attendance">Attendance</option>
                  <option value="behaviour">Behaviour</option>
                  <option value="examination">Examination</option>
                  <option value="marks">Marks</option>
                  <option value="discipline">Discipline</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
                {formErrors.category && (
                  <p className="text-rose-500 text-xs font-semibold mt-1.5 flex items-center gap-1">
                    ❌ {formErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newComplaint.priority}
                  onChange={(e) =>
                    setNewComplaint({ ...newComplaint, priority: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Class & Student */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Class <span className="text-rose-500">*</span>
                </label>
                {isClassesLoading ? (
                  <div className="text-xs text-slate-400 py-3">Loading classes...</div>
                ) : (
                  <select
                    value={newComplaint.classId ? `${newComplaint.classId}|${newComplaint.sectionId}` : ""}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white ${
                      formErrors.class ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Select Class</option>
                    {classesList.map((c, idx) => (
                      <option key={idx} value={`${c.classId}|${c.sectionId}`}>{c.displayName}</option>
                    ))}
                  </select>
                )}
                {formErrors.class && (
                  <p className="text-rose-500 text-xs font-semibold mt-1.5 flex items-center gap-1">
                    ❌ {formErrors.class}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Student
                </label>
                <select
                  value={newComplaint.studentId}
                  onChange={(e) =>
                    setNewComplaint({ ...newComplaint, studentId: e.target.value })
                  }
                  disabled={!newComplaint.classId || isStudentsLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!newComplaint.classId ? (
                    <option value="">Please select a class first</option>
                  ) : isStudentsLoading ? (
                    <option value="">Loading students...</option>
                  ) : (
                    <>
                      <option value="">Select Student</option>
                      {studentsList.map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.loginId})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Description / Complaint Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={newComplaint.description}
                onChange={(e) =>
                  setNewComplaint({ ...newComplaint, description: e.target.value })
                }
                placeholder="Provide details about the issue..."
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white placeholder:text-slate-400 resize-none ${
                  formErrors.description ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200'
                }`}
              />
              {formErrors.description && (
                <p className="text-rose-500 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  ❌ {formErrors.description}
                </p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Remarks / Actionable Notes
              </label>
              <textarea
                value={newComplaint.remark}
                onChange={(e) =>
                  setNewComplaint({ ...newComplaint, remark: e.target.value })
                }
                placeholder="Internal notes or actionable steps..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all bg-white placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Attachment (Optional)
              </label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setNewComplaint(prev => ({
                      ...prev,
                      attachments: [{
                        name: file.name,
                        url: "https://school-erp.s3.amazonaws.com/uploads/" + file.name
                      }]
                    }));
                    toast.success(`Attached ${file.name}`);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none bg-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#223F74]/10 file:text-[#223F74] hover:file:bg-[#223F74]/20"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-5 border-t border-slate-200">
            <Button
              text={isSubmitting ? "Submitting..." : "Submit Complaint"}
              type="submit"
              variant="primary"
              disabled={isSubmitting || !newComplaint.classId}
              loading={isSubmitting}
              icon={!isSubmitting && <Send size={16} />}
              size={6}
              className="flex-1 min-w-[140px]"
            />
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              size={4}
              className="min-w-[100px]"
            />
          </div>
        </form>
      </PanelModal>
    </div>
  );
};

export default ComplaintManagement;