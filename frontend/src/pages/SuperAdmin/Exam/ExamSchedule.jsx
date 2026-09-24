import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Trash2,
  FileText,
  Search,
  Filter,
  Printer,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Edit,
  Edit2,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import {
  getAllExamSchedules,
  createExamSchedule,
  deleteExamSchedule,
  getExamDashboardStats,
  getExamStructures,
  getScheduleMarksheets,
  updateMarksheetsStatus,
} from "../../../services/api/superAdminExamApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getOrganizationClasses,
  getOrganizationBranches,
  getOrganizationSubjects,
} from "../../../services/api/organizationApi";
import toast from "react-hot-toast";
import { Heading, DashGrid, DashCard, DataTable, PanelModal, openModal, closeModal } from "../../../components/shared/Common_Components";

function DeleteConfirm({ schedule, loading, onConfirm, onCancel }) {
  if (!schedule) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertCircle size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">Delete Exam Schedule?</p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to delete the schedule for{" "}
            <span className="font-bold text-slate-700">{schedule.examStructure?.examName || "this exam"}</span>? This
            action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition active:scale-95 shadow-md shadow-rose-500/20 disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const SuperAdminExamSchedule = ({ hideHeader = false }) => {
  const [activeTab, setActiveTab] = useState("table");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data States
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    published: 0,
    upcoming: 0,
    drafts: 0,
  });
  const [classes, setClasses] = useState([]);
  const [structures, setStructures] = useState([]);
  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Modal States
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [selectedScheduleToDelete, setSelectedScheduleToDelete] = useState(null);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // Results Management Modal States
  const [viewingResultsSchedule, setViewingResultsSchedule] = useState(null);
  const [marksheetList, setMarksheetList] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [updatingResultsStatus, setUpdatingResultsStatus] = useState(false);

  const handleDownloadReport = (schedule) => {
    if (!schedule) return;
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(34, 63, 116); // Deep Navy #223F74
      doc.text("Exam Timetable Schedule Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Draw a line separator
      doc.setDrawColor(226, 232, 240); // border-[#E2E8F0]
      doc.line(14, 32, 196, 32);

      // Section 1: Metadata Card info
      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.text("Schedule Overview", 14, 40);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Exam Name: ${schedule.examStructure?.examName || "N/A"}`, 14, 48);
      doc.text(`Academic Session: ${schedule.academicYear || "N/A"}`, 14, 54);
      doc.text(`Target Class: ${schedule.class?.name || "N/A"}`, 14, 60);

      doc.text(`Target School/Branch: ${schedule.school?.schoolName || "N/A"}`, 110, 48);
      doc.text(`Status: ${(schedule.status || "draft").toUpperCase()}`, 110, 54);
      doc.text(`Total Slots: ${schedule.slots?.length || 0}`, 110, 60);

      // Section 2: Timetable slots table
      const tableColumn = ["#", "Subject Name", "Exam Date", "Timings", "Venue / Room", "Max Marks"];
      const tableRows = (schedule.slots || []).map((slot, index) => [
        index + 1,
        slot.subject?.name || slot.subject || "N/A",
        slot.examDate ? new Date(slot.examDate).toLocaleDateString() : "N/A",
        `${slot.startTime || ""} - ${slot.endTime || ""}`,
        slot.venue || "N/A",
        slot.maxMarks || 100
      ]);

      autoTable(doc, {
        startY: 68,
        head: [tableColumn],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [34, 63, 116] }, // #223F74
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Exam_Schedule_${schedule.examStructure?.examName || "Report"}.pdf`);
      toast.success("Exam schedule report downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF report.");
    }
  };

  const handleManageResults = async (schedule) => {
    if (!schedule) return;
    setViewingSchedule(null);
    closeModal("view-schedule-modal");
    openModal("manage-results-modal");
    setViewingResultsSchedule(schedule);
    setLoadingResults(true);
    try {
      const response = await getScheduleMarksheets(schedule._id);
      if (response.success) {
        setMarksheetList(response.data || []);
      } else {
        toast.error("Failed to load marksheet results");
        setViewingResultsSchedule(null);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load marksheet results");
      setViewingResultsSchedule(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleBulkStatusChange = async (targetStatus) => {
    if (marksheetList.length === 0) return;
    
    const eligibleMarksheets = marksheetList.filter((m) => {
      if (targetStatus === "verified") return m.status === "submitted";
      if (targetStatus === "published") return m.status === "verified" || m.status === "submitted";
      return false;
    });

    if (eligibleMarksheets.length === 0) {
      toast.error(`No marksheets are eligible for ${targetStatus === "verified" ? "verification" : "publishing"}.`);
      return;
    }

    const marksheetIds = eligibleMarksheets.map((m) => m._id);
    setUpdatingResultsStatus(true);
    try {
      const response = await updateMarksheetsStatus(marksheetIds, targetStatus);
      if (response.success) {
        toast.success(response.message || `Successfully updated ${eligibleMarksheets.length} marksheets to ${targetStatus}!`);
        const freshResponse = await getScheduleMarksheets(viewingResultsSchedule._id);
        if (freshResponse.success) {
          setMarksheetList(freshResponse.data || []);
        }
      } else {
        toast.error(response.message || "Failed to update marksheets status");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update marksheets status");
    } finally {
      setUpdatingResultsStatus(false);
    }
  };

  const handleSingleStatusChange = async (marksheetId, targetStatus) => {
    setUpdatingResultsStatus(true);
    try {
      const response = await updateMarksheetsStatus([marksheetId], targetStatus);
      if (response.success) {
        toast.success(`Marksheet status updated to ${targetStatus}`);
        const freshResponse = await getScheduleMarksheets(viewingResultsSchedule._id);
        if (freshResponse.success) {
          setMarksheetList(freshResponse.data || []);
        }
      } else {
        toast.error(response.message || "Failed to update marksheet status");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update marksheet status");
    } finally {
      setUpdatingResultsStatus(false);
    }
  };

  const initialSlotState = {
    examDate: "",
    startTime: "",
    endTime: "",
    venue: "",
    subject: "",
    maxMarks: 100,
  };

  const [newSchedule, setNewSchedule] = useState({
    examStructure: "",
    class: "",
    academicYear:
      new Date().getFullYear().toString() +
      "-" +
      (new Date().getFullYear() + 1).toString().slice(-2),
    school: "",
    slots: [{ ...initialSlotState }],
    status: "draft",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem("organizationId");
      const params = { organizationId: orgId };

      const [schedulesRes, statsRes, classesRes, structuresRes, branchesRes] =
        await Promise.all([
          getAllExamSchedules(params),
          getExamDashboardStats(params),
          getOrganizationClasses(orgId),
          getExamStructures(params),
          getOrganizationBranches(),
        ]);

        console.log(schedulesRes)

      if (schedulesRes.success) setSchedules(schedulesRes.data);
      if (statsRes.success) {
        setStats({
          totalExams: statsRes.data.totalSchedules,
          published: statsRes.data.publishedSchedules || 0,
          upcoming: 0,
          drafts: statsRes.data.draftSchedules || 0,
        });
      }
      if (classesRes.success) setClasses(classesRes.data);
      if (structuresRes.success) setStructures(structuresRes.data);
      if (branchesRes.success) setBranches(branchesRes.data);
    } catch (error) {
      console.error("fetchInitialData error:", error);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (classId) => {
    try {
      const orgId = localStorage.getItem("organizationId");
      const response = await getOrganizationSubjects(orgId, classId);
      if (response.success) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const handleClassChange = (classId) => {
    setNewSchedule({ ...newSchedule, class: classId });
    if (classId) {
      fetchSubjects(classId);
    } else {
      setSubjects([]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedScheduleToDelete) return;
    setDeleteConfirmLoading(true);
    try {
      const response = await deleteExamSchedule(selectedScheduleToDelete._id);
      if (response.success) {
        toast.success("Schedule deleted successfully");
        setSelectedScheduleToDelete(null);
        fetchInitialData();
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete schedule");
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  // --- SLOT MANAGEMENT HANDLERS ---
  const handleAddSlot = () => {
    setNewSchedule({
      ...newSchedule,
      slots: [...newSchedule.slots, { ...initialSlotState }],
    });
  };

  const handleRemoveSlot = (indexToRemove) => {
    setNewSchedule({
      ...newSchedule,
      slots: newSchedule.slots.filter((_, index) => index !== indexToRemove),
    });
  };

  const handleSlotChange = (index, field, value) => {
    const updatedSlots = [...newSchedule.slots];
    updatedSlots[index][field] = value;
    setNewSchedule({ ...newSchedule, slots: updatedSlots });
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (newSchedule.slots.length === 0) {
      return toast.error("Please add at least one exam slot.");
    }

    try {
      setLoading(true);
      const orgId = localStorage.getItem("organizationId");
      const payload = { ...newSchedule, organizationId: orgId };
      const response = await createExamSchedule(payload);
      
      if (response.success) {
        toast.success(`Exam schedule ${newSchedule.status === "draft" ? "saved as draft" : "created"}!`);
        closeModal("add-schedule-modal");
        setNewSchedule({
          examStructure: "",
          class: "",
          academicYear:
            new Date().getFullYear().toString() + "-" + (new Date().getFullYear() + 1).toString().slice(-2),
          school: "",
          slots: [{ ...initialSlotState }],
          status: "draft",
        });
        fetchInitialData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredSchedules = schedules.filter(
    (s) =>
      s.examStructure?.examName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.school?.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns = useMemo(
    () => [
      {
        key: "examName",
        label: "Exam Name",
        render: (val, row) => (
          <>
            <div className="font-bold text-[#1D1D1F] text-sm leading-snug">{row.examStructure?.examName || "N/A"}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{row.school?.schoolName || "N/A"}</div>
          </>
        ),
        searchValue: (row) => `${row.examStructure?.examName || ""} ${row.school?.schoolName || ""}`,
      },
      {
        key: "classYear",
        label: "Class & Year",
        render: (val, row) => (
          <>
            <div className="font-semibold text-slate-700 text-sm">{row.class?.name || "N/A"}</div>
            <div className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">{row.academicYear}</div>
          </>
        ),
        searchValue: (row) => `${row.class?.name || ""} ${row.academicYear || ""}`,
      },
      {
        key: "firstDateTime",
        label: "First Date & Time",
        render: (val, row) => (
          <>
            <div className="font-semibold text-[#223F74] text-sm">
              {row.slots?.[0]?.examDate ? new Date(row.slots[0].examDate).toLocaleDateString() : "N/A"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {row.slots?.[0]?.startTime || ""} - {row.slots?.[0]?.endTime || ""}
            </div>
          </>
        ),
        searchValue: (row) => row.slots?.[0]?.examDate ? new Date(row.slots[0].examDate).toLocaleDateString() : "",
      },
      {
        key: "statusDisplay",
        label: "Status",
        render: (val, row) => (
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadgeColor(row.status)}`}>
            {row.status}
          </span>
        ),
        searchValue: (row) => row.status || "",
      },
    ],
    []
  );

  const tableActions = useMemo(
    () => [
      {
        icon: <Eye size={14} />,
        tooltip: "View details",
        variant: "ghost",
        onClick: (row) => { setViewingSchedule(row); openModal("view-schedule-modal"); },
      },
      {
        icon: <Trash2 size={14} />,
        tooltip: "Delete schedule",
        variant: "danger",
        onClick: (row) => setSelectedScheduleToDelete(row),
      },
    ],
    []
  );

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-700";
      case "ongoing": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-emerald-100 text-emerald-800";
      case "cancelled": return "bg-red-100 text-red-700";
      case "draft":
      default: return "bg-amber-100 text-amber-700";
    }
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const totalDays = daysInMonth(year, month);
  const startGap = firstDayOfMonth(year, month);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="min-h-screen font-sans w-full pb-10">
      {/* Header Section */}
      {!hideHeader ? (
        <div className="mb-6">
          <Heading
            primaryText="Exam Schedules"
            secondaryText="SuperAdmin"
            size={12}
            showAnimations
            action={
              <button
                onClick={() => openModal("add-schedule-modal")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#EC856D] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 flex-shrink-0 border border-white/10"
              >
                <Plus size={16} /> Add New Schedule
              </button>
            }
          />
        </div>
      ) : (
        /* Embedded button bar */
        <div className="flex justify-end mb-6">
          <button
            onClick={() => openModal("add-schedule-modal")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#EC856D] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 flex-shrink-0"
          >
            <Plus size={16} /> Add New Schedule
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!hideHeader && (
        <div className="mb-6">
          <DashGrid cols={12} gap={4}>
            <DashCard
              title="Total Exams"
              value={String(stats.totalExams || 0).padStart(2, "0")}
              icon={<CalendarIcon size={20} />}
              size={4}
              accentColor="#223F74"
            />
            <DashCard
              title="Published"
              value={String(stats.published || 0).padStart(2, "0")}
              icon={<FileText size={20} />}
              size={4}
              accentColor="#5B9A6A"
            />
            <DashCard
              title="Upcoming"
              value={String(stats.upcoming || 0).padStart(2, "0")}
              icon={<Clock size={20} />}
              size={4}
              accentColor="#E0A04B"
            />
            <DashCard
              title="Drafts"
              value={String(stats.drafts || 0).padStart(2, "0")}
              icon={<Edit size={20} />}
              size={4}
              accentColor="#D66B5F"
            />
          </DashGrid>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[#F8FAFC]/40">
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "table"
                  ? "bg-white text-[#223F74] shadow-sm border border-[#E2E8F0]/80"
                  : "text-slate-500 hover:text-[#1D1D1F]"
              }`}
            >
              <List size={14} /> LIST
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "calendar"
                  ? "bg-white text-[#223F74] shadow-sm border border-[#E2E8F0]/80"
                  : "text-slate-500 hover:text-[#1D1D1F]"
              }`}
            >
              <LayoutGrid size={14} /> CALENDAR
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={16} />
              <input
                type="text"
                placeholder="Search schedules by exam, class, branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#223F74] focus:ring-2 focus:ring-[#223F74]/10 transition-all placeholder:text-[#A0AEC0] text-[#1D1D1F]"
              />
            </div>
          </div>
        </div>

        {activeTab === "table" ? (
          loading ? (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 text-center text-slate-400 font-medium italic text-sm shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
              <span className="animate-pulse">Loading schedules...</span>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredSchedules}
              actions={tableActions}
              pageSize={5}
              size={12}
              searchable={false}
            />
          )
        ) : (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h4 className="font-bold text-[#1D1D1F] text-lg uppercase tracking-wider">
                {monthName} <span className="text-[#223F74] font-black">{year}</span>
              </h4>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#223F74] rounded-xl transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())} 
                  className="flex-1 sm:flex-initial px-4 py-2 border border-[#E2E8F0] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] text-slate-600 transition-all uppercase tracking-wider text-center"
                >
                  Today
                </button>
                <button 
                  onClick={handleNextMonth} 
                  className="p-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#223F74] rounded-xl transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.2em] border-b border-[#E2E8F0]/60 mb-2">{d}</div>
              ))}
              {Array.from({ length: startGap }).map((_, i) => (
                <div key={`gap-${i}`} className="min-h-[90px] sm:min-h-[120px] bg-[#F8FAFC]/40 rounded-2xl border border-transparent"></div>
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const hasExams = filteredSchedules.filter((s) => {
                  if (!s.slots?.[0]?.examDate) return false;
                  return new Date(s.slots[0].examDate).toISOString().split("T")[0] === dateStr;
                });

                return (
                  <div 
                    key={dayNum} 
                    className={`min-h-[90px] sm:min-h-[120px] border border-[#E2E8F0]/60 rounded-2xl p-2.5 transition-all flex flex-col justify-between hover:border-[#223F74] hover:shadow-md cursor-default ${
                      hasExams.length > 0 ? "bg-[#223F74]/5 border-[#223F74]/20" : "bg-white"
                    }`}
                  >
                    <span className={`text-xs font-bold ${hasExams.length > 0 ? "text-[#223F74]" : "text-slate-400"}`}>{dayNum}</span>
                    <div className="space-y-1 mt-1.5 overflow-y-auto max-h-[70px] pr-0.5 custom-scrollbar flex-1">
                      {hasExams.map((exam) => (
                        <div 
                          key={exam._id} 
                          onClick={() => { setViewingSchedule(exam); openModal("view-schedule-modal"); }} 
                          className="p-1 bg-white border border-[#E2E8F0] hover:border-[#223F74] rounded-lg shadow-xs cursor-pointer overflow-hidden transition-all duration-150"
                        >
                          <p className="text-[9px] font-bold text-[#223F74] truncate leading-tight">{exam.examStructure?.examName || "N/A"}</p>
                          <p className="text-[8px] text-[#6B7280] font-semibold truncate mt-0.5">{exam.class?.name || "N/A"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- ADD NEW SCHEDULE MODAL --- */}
      <PanelModal id="add-schedule-modal" title="Add New Exam Schedule" size="2xl">
        <form onSubmit={handleCreateSchedule} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-[#E2E8F0] pb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">Exam Structure</label>
              <select 
                required 
                value={newSchedule.examStructure} 
                onChange={(e) => setNewSchedule({ ...newSchedule, examStructure: e.target.value })} 
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0] cursor-pointer"
              >
                <option value="">-- Choose Structure --</option>
                {structures.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.examName} ({s.session || s.academicYear})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">Target School / Branch</label>
              <select 
                required 
                value={newSchedule.school} 
                onChange={(e) => setNewSchedule({ ...newSchedule, school: e.target.value })} 
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0] cursor-pointer"
              >
                <option value="">-- Choose School --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">Target Class</label>
              <select 
                required 
                value={newSchedule.class} 
                onChange={(e) => handleClassChange(e.target.value)} 
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0] cursor-pointer"
              >
                <option value="">-- Choose Class --</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <InputGroup
              label="Academic Year"
              value={newSchedule.academicYear}
              readOnly
            />

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">Schedule Status</label>
              <select 
                required 
                value={newSchedule.status} 
                onChange={(e) => setNewSchedule({ ...newSchedule, status: e.target.value })} 
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0] cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-[#1D1D1F] text-sm">Exam Slots</h4>
              <span className="text-xs font-bold text-[#223F74] bg-[#223F74]/5 px-2.5 py-1 rounded-lg">{newSchedule.slots.length} Slots</span>
            </div>

            {newSchedule.slots.map((slot, index) => (
              <div key={index} className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl relative shadow-xs">
                {/* Delete Slot Button */}
                {newSchedule.slots.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSlot(index)} 
                    className="absolute top-4 right-4 text-[#D66B5F] hover:bg-[#D66B5F]/5 p-2 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <p className="text-[10px] font-black text-[#223F74]/40 uppercase tracking-widest mb-4">Slot #{index + 1}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <InputGroup
                      label="Venue / Room"
                      placeholder="e.g. Hall-A"
                      value={slot.venue}
                      onChange={(e) => handleSlotChange(index, "venue", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">Subject</label>
                    <select 
                      required 
                      value={slot.subject} 
                      onChange={(e) => handleSlotChange(index, "subject", e.target.value)} 
                      className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Subject --</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <InputGroup
                    label="Max Marks"
                    type="number"
                    value={slot.maxMarks}
                    onChange={(e) => handleSlotChange(index, "maxMarks", e.target.value)}
                  />
                  
                  <div className="sm:col-span-2">
                    <InputGroup
                      label="Exam Date"
                      type="date"
                      value={slot.examDate}
                      onChange={(e) => handleSlotChange(index, "examDate", e.target.value)}
                    />
                  </div>
                  
                  <InputGroup
                    label="Start Time"
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleSlotChange(index, "startTime", e.target.value)}
                  />
                  
                  <InputGroup
                    label="End Time"
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleSlotChange(index, "endTime", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={handleAddSlot} 
              className="w-full py-3.5 border-2 border-dashed border-[#223F74]/20 hover:border-[#223F74]/50 rounded-2xl text-[#223F74] hover:bg-[#223F74]/5 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} /> Add Another Slot
            </button>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[#E2E8F0]">
            <button 
              type="button" 
              onClick={() => closeModal("add-schedule-modal")} 
              className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-sm transition-all active:scale-95 hover:-translate-y-0.5"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white rounded-full font-bold text-sm shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Scheduling..." : "Confirm Schedule"}
            </button>
          </div>
        </form>
      </PanelModal>

      {/* --- VIEW DETAILS MODAL --- */}
      <PanelModal id="view-schedule-modal" title="Schedule Details" size="lg">
        {viewingSchedule && (
          <div className="flex flex-col h-full">
            <div className="pb-3 shrink-0">
              <div className="grid grid-cols-2 gap-4">
                <DetailCard label="Branch / School" value={viewingSchedule.school?.schoolName || "N/A"} />
                <DetailCard label="Class Name" value={viewingSchedule.class?.name || "N/A"} />
                <DetailCard label="Academic Year" value={viewingSchedule.academicYear} />
                <DetailCard label="Status" value={
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadgeColor(viewingSchedule.status)}`}>
                    {viewingSchedule.status}
                  </span>
                } />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pb-6 pt-3 custom-scrollbar flex flex-col">
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3 shrink-0">
                Scheduled Slots ({viewingSchedule.slots?.length || 0})
              </h4>
              <div className="space-y-3 pr-1.5">
                {viewingSchedule.slots?.map((slot, i) => (
                  <div key={i} className="border border-[#E2E8F0] bg-[#F8FAFC]/30 rounded-2xl p-4 transition-all hover:border-[#223F74]/30 hover:bg-[#F8FAFC]/55">
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-sm font-bold text-[#223F74]">{slot.subject?.name || "Subject N/A"}</span>
                      <span className="text-[10px] font-bold bg-[#223F74]/5 border border-[#223F74]/10 px-2.5 py-0.5 rounded-lg text-[#223F74]">{slot.maxMarks} Marks</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium flex justify-between">
                      <span>Date: <strong className="text-slate-800">{slot.examDate ? new Date(slot.examDate).toLocaleDateString() : "N/A"}</strong></span>
                      <span>Time: <strong className="text-slate-800">{slot.startTime} - {slot.endTime}</strong></span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1.5">
                      Venue: <strong className="text-slate-700">{slot.venue || "N/A"}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-[#E2E8F0] flex gap-3 shrink-0">
              <button
                onClick={() => handleDownloadReport(viewingSchedule)}
                className="flex-1 py-3 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl text-xs font-bold transition-all active:scale-95 hover:-translate-y-0.5"
              >
                Download Report
              </button>
              <button
                onClick={() => {
                  handleManageResults(viewingSchedule);
                }}
                className="flex-1 py-3 bg-[#F59B87] hover:bg-[#EC856D] text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-[#F59B87]/30 hover:-translate-y-0.5 active:scale-95"
              >
                Manage Results
              </button>
            </div>
          </div>
        )}
      </PanelModal>      {/* --- RESULTS MANAGEMENT MODAL --- */}
      <PanelModal id="manage-results-modal" title={`Manage Exam Results: ${viewingResultsSchedule?.examStructure?.examName || "N/A"}`} size="4xl">
        {viewingResultsSchedule && (
          <div className="flex flex-col h-full">
            {loadingResults ? (
              <div className="flex-1 p-12 text-center text-slate-400 font-medium italic flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
                <span>Loading marksheet results...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <DetailCard label="Class Name" value={viewingResultsSchedule.class?.name || "N/A"} />
                  <DetailCard label="Academic Session" value={viewingResultsSchedule.academicYear || "N/A"} />
                  <DetailCard label="School Branch" value={viewingResultsSchedule.school?.schoolName || "N/A"} />
                  <DetailCard label="Total Students" value={marksheetList.length} />
                </div>

                {marksheetList.length > 0 && (
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex flex-wrap gap-3 items-center justify-between shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bulk Verification & Publishing</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Approve submitted marks or publish verified scores to student portals.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleBulkStatusChange("verified")}
                        disabled={updatingResultsStatus || !marksheetList.some((m) => m.status === "submitted")}
                        className="px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all"
                      >
                        Verify All Submitted
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange("published")}
                        disabled={updatingResultsStatus || !marksheetList.some((m) => m.status === "verified")}
                        className="px-4 py-2 bg-[#F59B87] hover:bg-[#EC856D] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-xs font-bold transition-all shadow-lg shadow-[#F59B87]/30 hover:-translate-y-0.5 active:scale-95"
                      >
                        Publish All Verified
                      </button>
                    </div>
                  </div>
                )}

                {marksheetList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm font-semibold">
                    No student marksheet records found for this schedule. Marks may not be entered yet by the teachers.
                  </div>
                ) : (
                  <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-[#E2E8F0] uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5 pl-5">Roll No</th>
                          <th className="p-3.5">Student Name</th>
                          <th className="p-3.5 text-center">Marks Obtained</th>
                          <th className="p-3.5 text-center">Percentage</th>
                          <th className="p-3.5 text-center">Grade</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 pr-5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {marksheetList.map((marksheet, idx) => {
                          const percentage = marksheet.percentage || 0;
                          return (
                            <tr key={marksheet._id || idx} className="hover:bg-[#F8FAFC]/55 transition-colors">
                              <td className="p-3.5 pl-5 font-bold text-slate-700">
                                {marksheet.student?.rollNumber || marksheet.rollNumber || idx + 1}
                              </td>
                              <td className="p-3.5 font-bold text-slate-800">
                                {marksheet.student?.name || "Student"}
                              </td>
                              <td className="p-3.5 text-center font-semibold text-slate-600">
                                {marksheet.totalMarksObtained} / {marksheet.totalMaxMarks}
                              </td>
                              <td className="p-3.5 text-center font-bold text-[#223F74]">
                                {percentage.toFixed(1)}%
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {marksheet.overallGrade || "N/A"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                    marksheet.status === "published"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : marksheet.status === "verified"
                                        ? "bg-blue-50 text-blue-700 border-blue-100"
                                        : marksheet.status === "submitted"
                                          ? "bg-amber-50 text-amber-700 border-amber-100"
                                          : "bg-slate-50 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {marksheet.status}
                                </span>
                              </td>
                              <td className="p-3.5 pr-5 text-center">
                                <div className="flex gap-2 justify-center">
                                  {marksheet.status === "submitted" && (
                                    <button
                                      disabled={updatingResultsStatus}
                                      onClick={() => handleSingleStatusChange(marksheet._id, "verified")}
                                      className="px-2.5 py-1 text-[10px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  {marksheet.status === "verified" && (
                                    <button
                                      disabled={updatingResultsStatus}
                                      onClick={() => handleSingleStatusChange(marksheet._id, "published")}
                                      className="px-2.5 py-1 text-[10px] font-bold bg-[#223F74] text-white hover:bg-[#1B325F] rounded-lg transition-all"
                                    >
                                      Publish
                                    </button>
                                  )}
                                  {(marksheet.status === "published" || marksheet.status === "draft") && (
                                    <span className="text-[10px] text-slate-400 font-medium italic select-none">No actions</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="pt-5 border-t border-[#E2E8F0] flex justify-end shrink-0">
              <button
                onClick={() => {
                  setViewingResultsSchedule(null);
                  setMarksheetList([]);
                  closeModal("manage-results-modal");
                }}
                className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 hover:-translate-y-0.5"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </PanelModal>

      {selectedScheduleToDelete && (
        <DeleteConfirm
          schedule={selectedScheduleToDelete}
          loading={deleteConfirmLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setSelectedScheduleToDelete(null)}
        />
      )}
    </div>
  );
};

const DetailCard = ({ label, value }) => (
  <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
      {label}
    </p>
    <div className="font-semibold text-[#1D1D1F] text-sm break-words">{value}</div>
  </div>
);

const InputGroup = ({ label, type = "text", placeholder, value, onChange, readOnly = false }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className={`w-full px-4 py-3.5 border border-[#E2E8F0] rounded-2xl text-sm font-medium focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0] ${
        readOnly 
          ? "bg-[#F8FAFC] text-slate-500 cursor-not-allowed outline-none" 
          : "bg-white text-[#1D1D1F]"
      }`}
    />
  </div>
);

export default SuperAdminExamSchedule;
