import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit2,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";
import api from "../../../services/api";
import {
  createPrincipalExamSchedule,
  deletePrincipalExamSchedule,
  getPrincipalExamSchedules,
  getPrincipalExamStructures,
  getPrincipalClassesWithSections
} from "../../../services/api/principalExamApi";
import toast, { Toaster } from "react-hot-toast";
import CreateExamStructureModal from "./CreateExamStructureModal";
import { Heading, Modal, openModal, closeModal, DataField, Button as CButton } from "../../../components/shared/Common_Components";

// Safe Date Parser to prevent RangeError crashes
const safeFormatDate = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
};

const CreateExam = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStructures, setAvailableStructures] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [editingExamId, setEditingExamId] = useState(null);
  const [viewExamData, setViewExamData] = useState(null);
  const [examModalMode, setExamModalMode] = useState("view");
  const [activeTab, setActiveTab] = useState("existing");
  const [editFormData, setEditFormData] = useState({});
  const [expandedClass, setExpandedClass] = useState(null);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);

  const [formData, setFormData] = useState({
    examName: "",
    examType: "",
    description: "",
    startDate: "",
    endDate: "",
    resultDate: "",
    startTime: "08:00",
    endTime: "11:00",
    selectedClasses: {},
    allowMarksEdit: false,
    autoCalculateGrades: true,
    sendNotification: true,
    admitCardRequired: true,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoadingPage(true);

      try {
        // 1. Fetch perfectly structured classes & sections from our new route
        let classList = [];
        try {
          const classRes = await getPrincipalClassesWithSections();
          if (classRes.success && classRes.data) {
            classList = classRes.data;
          }
        } catch (e) {
          console.error("Failed to fetch classes:", e);
        }
        
        setAvailableClasses(classList);

        // 2. Set academic year
        const year = new Date().getFullYear();
        const derivedAcademicYear = `${year}-${String(year + 1).slice(-2)}`;
        setAcademicYear(derivedAcademicYear);

        // 3. Fetch exam structures
        let structures = [];
        try {
          const structuresResponse = await getPrincipalExamStructures();
          if (
            structuresResponse?.data &&
            Array.isArray(structuresResponse.data)
          ) {
            structures = structuresResponse.data;
          } else if (
            structuresResponse?.data?.data &&
            Array.isArray(structuresResponse.data.data)
          ) {
            structures = structuresResponse.data.data;
          }
        } catch (err) {
          console.error("Error fetching structures:", err);
        }
        setAvailableStructures(structures);

        // 4. Fetch all existing exams ONCE
        try {
          const response = await getPrincipalExamSchedules({
            academicYear: derivedAcademicYear,
          });

          let examsData = [];
          if (response?.data && Array.isArray(response.data)) {
            examsData = response.data;
          } else if (response?.data?.data && Array.isArray(response.data.data)) {
            examsData = response.data.data;
          }
          
          setExams(examsData);
        } catch (err) {
          console.error("Error fetching exams:", err);
        }
      } catch (loadError) {
        console.error("Load error:", loadError);
        setError(loadError.message || "Failed to load data");
        toast.error("Failed to load exam data");
      } finally {
        setLoadingPage(false);
      }
    };

    loadData();
  }, []);

  const getExamTypeColor = (type) => {
    switch (type) {
      case "Unit Test": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Half Yearly": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Annual": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Practical": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Upcoming": return "bg-amber-100 text-amber-700";
      case "Ongoing": return "bg-blue-100 text-blue-700";
      case "Completed": return "bg-emerald-100 text-emerald-700";
      case "Draft": return "bg-slate-100 text-slate-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const handleClassToggle = (className) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: {
        ...prev.selectedClasses,
        [className]: {
          ...(prev.selectedClasses[className] || {}),
          selected: !prev.selectedClasses[className]?.selected,
        },
      },
    }));
  };

  const handleSectionToggle = (className, sectionName) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: {
        ...prev.selectedClasses,
        [className]: {
          ...prev.selectedClasses[className],
          sections: {
            ...(prev.selectedClasses[className]?.sections || {}),
            [sectionName]: !prev.selectedClasses[className]?.sections?.[sectionName],
          },
        },
      },
    }));
  };

  const refreshSchedules = async () => {
    try {
      const response = await getPrincipalExamSchedules({ academicYear });
      let examsData = [];
      if (response?.data && Array.isArray(response.data)) {
        examsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        examsData = response.data.data;
      }
      setExams(examsData);
    } catch (err) {
      console.error("Error refreshing schedules:", err);
    }
  };

  const refreshStructures = async () => {
    try {
      const response = await getPrincipalExamStructures();
      let structuresData = [];
      if (response?.data && Array.isArray(response.data)) {
        structuresData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        structuresData = response.data.data;
      }
      setAvailableStructures(structuresData);
    } catch (err) {
      console.error("Error refreshing structures:", err);
    }
  };

  const handleCreateExam = async () => {
    if (!formData.examName || !formData.startDate || !formData.endDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const selectedStructure = availableStructures.find(
      (structure) => String(structure._id) === String(formData.examName),
    );
    const selectedClassEntries = Object.entries(
      formData.selectedClasses,
    ).filter(([, details]) => details.selected);

    if (!selectedStructure || selectedClassEntries.length === 0) {
      toast.error("Please select an exam structure and at least one class");
      return;
    }

    const buildSlots = () => {
      const startDate = new Date(formData.startDate);
      const endTimeParts = formData.endTime.split(":").map(Number);
      const startTimeParts = formData.startTime.split(":").map(Number);
      const durationMinutes = Math.max(
        30,
        endTimeParts[0] * 60 + endTimeParts[1] - (startTimeParts[0] * 60 + startTimeParts[1]),
      );

      return (selectedStructure.subjectMarkings || []).map(
        (subjectMarking, index) => {
          const slotDate = new Date(startDate);
          slotDate.setDate(startDate.getDate() + index);
          return {
            subject: subjectMarking.subject?._id || subjectMarking.subject,
            examDate: slotDate.toISOString(),
            startTime: formData.startTime,
            endTime: formData.endTime,
            venue: "Exam Hall",
            maxMarks: subjectMarking.totalMaxMarks || 100,
            durationMinutes,
          };
        },
      );
    };

    setLoadingSave(true);
    try {
      const basePayload = {
        examStructure: selectedStructure._id,
        academicYear,
        slots: buildSlots(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: "Upcoming",
      };

      if (editingExamId) {
        const [className, details] = selectedClassEntries[0];
        const classItem = availableClasses.find((item) => item.name === className);
        const section = Object.keys(details.sections || {}).find((key) => details.sections[key]) || "A";

        await api.put(`/principal/exams/schedule/${editingExamId}`, {
          ...basePayload,
          class: classItem?._id || classItem?.id,
          section: section,
        });
        toast.success("Exam schedule updated successfully");
      } else {
        for (const [className, details] of selectedClassEntries) {
          const classItem = availableClasses.find((item) => item.name === className);
          const selectedSections = Object.entries(details.sections || {}).filter(([, isSelected]) => isSelected);
          
          let sectionList = [""]; 
          if (selectedSections.length > 0) {
            sectionList = selectedSections.map(([section]) => section);
          } else if (classItem?.sections && classItem.sections.length > 0) {
            sectionList = classItem.sections.map(s => typeof s === 'object' ? s.name || s.sectionName || s.section : s);
          }

          for (const section of sectionList) {
            await createPrincipalExamSchedule({
              ...basePayload,
              class: classItem?._id || classItem?.id,
              section: section, 
            });
          }
        }
        toast.success("Exam schedule created successfully");
      }

      await refreshSchedules();
      setActiveTab("existing");
      setFormData({
        examName: "",
        examType: "",
        description: "",
        startDate: "",
        endDate: "",
        resultDate: "",
        startTime: "08:00",
        endTime: "11:00",
        selectedClasses: {},
        allowMarksEdit: false,
        autoCalculateGrades: true,
        sendNotification: true,
        admitCardRequired: true,
      });
      setEditingExamId(null);
    } catch (saveError) {
      console.error("Save error:", saveError);
      toast.error("Failed to save exam schedule");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleSaveModalEdit = async () => {
    if (!editingExamId || !viewExamData) return;
    setLoadingSave(true);
    try {
      const basePayload = {
        examStructure: viewExamData.examStructure?._id || viewExamData.examStructure,
        examType: editFormData.examType || viewExamData.examStructure?.examType || viewExamData.type,
        academicYear: viewExamData.academicYear,
        slots: editFormData.slots || viewExamData.slots,
        class: viewExamData.class?._id || viewExamData.class,
        section: viewExamData.section,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
        resultDate: editFormData.resultDate,
        description: editFormData.description,
        status: editFormData.status,
      };

      await api.put(`/principal/exams/schedule/${editingExamId}`, basePayload);
      toast.success("Exam schedule updated successfully");
      
      const response = await getPrincipalExamSchedules({
        academicYear: viewExamData.academicYear,
      });
      let examsData = [];
      if (response?.data && Array.isArray(response.data)) {
        examsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        examsData = response.data.data;
      }
      setExams(examsData);
      
      closeModal("viewEditExamModal");
      setEditingExamId(null);
      setViewExamData(null);
    } catch (err) {
      console.error("Error updating exam via modal:", err);
      toast.error("Failed to update exam");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleEditExam = (exam) => {
    setViewExamData(exam);
    setEditingExamId(exam._id || exam.id);
    setEditFormData({
      startDate: safeFormatDate(exam.startDate || exam.slots?.[0]?.examDate),
      endDate: safeFormatDate(exam.endDate || exam.slots?.[(exam.slots?.length || 1) - 1]?.examDate),
      resultDate: safeFormatDate(exam.resultDate),
      description: exam.description || "",
      status: exam.status || "Upcoming",
      examType: exam.examStructure?.examType || exam.type || "General",
      slots: exam.slots ? JSON.parse(JSON.stringify(exam.slots)) : [],
    });
    setExamModalMode("edit");
    openModal("viewEditExamModal");
  };

  const handleViewExam = (exam) => {
    setViewExamData(exam);
    setExamModalMode("view");
    openModal("viewEditExamModal");
  };

  const handleDeleteExam = async (examId) => {
    try {
      await deletePrincipalExamSchedule(examId);
      setExams((prev) => prev.filter((exam) => String(exam._id || exam.id) !== String(examId)));
      toast.success("Exam deleted successfully");
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || deleteError.message || "Failed to delete exam");
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-10 h-10 text-blue-600 mb-4" />
        <span className="text-slate-500 font-medium">Loading exam schedules...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
        {/* Page Header */}
        <div className="mb-6 space-y-4">
          <Heading
            primaryText="Create"
            secondaryText="Exam"
            size={12}
            showAnimations
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 mt-6 gap-4 sm:gap-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab("existing")}
                className={`pb-3 text-sm font-bold border-b-2 px-6 transition-all ${
                  activeTab === "existing"
                    ? "border-[#223F74] text-[#223F74]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Existing Exams
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`pb-3 text-sm font-bold border-b-2 px-6 transition-all ${
                  activeTab === "create"
                    ? "border-[#223F74] text-[#223F74]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Create Exam Schedule
              </button>
            </div>
            
            {activeTab === "existing" && (
              <div className="pb-3 flex justify-end">
                <button
                  onClick={() => setShowCreateStructureModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#e08976] text-white px-6 py-2.5 text-sm rounded-xl font-bold shadow-md shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
                >
                  + Create Exam Structure
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Existing Exams Grid */}
        {activeTab === "existing" && (
          exams.length > 0 ? (
          <div className="mb-12" id="existing-exams">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-[#F59B87]" />
              <h2 className="text-lg font-black text-[#223F74]">Existing Exams</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {exams.map((exam) => (
                <div
                  key={exam._id || exam.id}
                  className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 hover:shadow-md hover:border-[#F59B87]/50 transition-all flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <h3 className="font-bold text-[#223F74] leading-tight line-clamp-2 group-hover:text-[#F59B87] transition-colors">
                      {exam.examStructure?.examName || exam.name || "Exam"}
                    </h3>
                    <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getExamTypeColor(exam.examStructure?.examType || exam.type)}`}>
                      {exam.examStructure?.examType || exam.type || "General"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : "Dates Scheduled"} - {exam.endDate ? new Date(exam.endDate).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">
                        {exam.class?.name || exam.class} - {exam.section || "A"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${getStatusColor(exam.status || "Upcoming")}`}>
                      {exam.status || "Upcoming"}
                    </span>

                    <div className="flex flex-wrap sm:flex-nowrap gap-1.5 justify-end">
                      <button onClick={() => handleEditExam(exam)} className="p-2 text-[#223F74] bg-[#223F74]/5 hover:bg-[#223F74]/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleViewExam(exam)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteExam(exam._id || exam.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm mt-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <BookOpen className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">No Exams Found</h3>
              <p className="text-slate-500 font-medium">Click "+ Create Exam Structure" to start building your exam schedules.</p>
            </div>
          )
        )}

        {/* Create Exam Form Container */}
        {activeTab === "create" && (
          availableClasses.length > 0 ? (
            <div id="exam-form-container" className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 lg:p-10 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-[#223F74]/5 to-[#F59B87]/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Section 1 — Basic Info */}
            <section className="relative z-10">
              <div className="mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#223F74] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#223F74] text-white flex items-center justify-center text-sm shadow-md shadow-[#223F74]/20">1</span>
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Exam Structure <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <select
                    value={formData.examName}
                    onChange={(e) => {
                      const structure = availableStructures.find((item) => String(item._id) === String(e.target.value));
                      setFormData({
                        ...formData,
                        examName: e.target.value,
                        examType: structure?.examType || "",
                      });
                    }}
                    className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none cursor-pointer"
                  >
                    <option value="">Select Structure...</option>
                    {availableStructures.map((structure) => (
                      <option key={structure._id} value={structure._id}>{structure.examName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic Year</label>
                  <input type="text" value={academicYear || "-"} disabled className="w-full px-4 py-3.5 text-sm font-bold text-slate-500 bg-slate-100/50 border border-slate-200 rounded-xl cursor-not-allowed" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    placeholder="Enter any additional details about this exam..."
                    className="w-full px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Section 2 — Schedule */}
            <section className="relative z-10">
              <div className="mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#223F74] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#223F74] text-white flex items-center justify-center text-sm shadow-md shadow-[#223F74]/20">2</span>
                  Exam Schedule
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date *</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date *</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Result Date</label>
                  <input type="date" value={formData.resultDate} onChange={(e) => setFormData({ ...formData, resultDate: e.target.value })} className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exam Timing</label>
                  <div className="flex items-center gap-2">
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-2 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none" />
                    <span className="text-slate-400 text-xs font-bold">TO</span>
                    <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-2 py-3.5 text-sm font-medium text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] transition-all outline-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 — Applicable Classes */}
            <section className="relative z-10">
              <div className="mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#223F74] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#223F74] text-white flex items-center justify-center text-sm shadow-md shadow-[#223F74]/20">3</span>
                  Applicable Classes
                </h3>
              </div>

              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 max-h-[350px] overflow-y-auto custom-scrollbar space-y-3">
                {availableClasses.map((cls) => {
                  const classId = cls._id || cls.id;
                  return (
                    <div key={classId} className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${formData.selectedClasses[cls.name]?.selected ? "border-[#F59B87] ring-1 ring-[#F59B87]/20" : "border-slate-200 hover:border-[#223F74]/30"}`}>
                      <button onClick={() => setExpandedClass(expandedClass === classId ? null : classId)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={formData.selectedClasses[cls.name]?.selected || false} onChange={() => handleClassToggle(cls.name)} onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded border-slate-300 text-[#F59B87] focus:ring-[#F59B87]/50 cursor-pointer" />
                        <span className={`flex-1 font-bold text-sm ${formData.selectedClasses[cls.name]?.selected ? 'text-[#223F74]' : 'text-slate-700'}`}>{cls.name}</span>
                        {formData.selectedClasses[cls.name]?.selected && (
                          <span className="p-1.5 rounded-lg bg-[#223F74]/5 text-[#223F74]">
                            {expandedClass === classId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        )}
                      </button>

                      {/* Sections block */}
                      {expandedClass === classId && formData.selectedClasses[cls.name]?.selected && (
                        <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex gap-4 flex-wrap">
                          {cls.sections && cls.sections.length > 0 ? (
                            cls.sections.map((sectionItem, idx) => {
                              const sectionName = typeof sectionItem === 'object' 
                                ? sectionItem.name || sectionItem.sectionName || sectionItem.section || `Section ${idx + 1}`
                                : String(sectionItem);
                              
                              return (
                                <label key={sectionName} className={`flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border shadow-sm transition-all ${formData.selectedClasses[cls.name]?.sections?.[sectionName] ? "border-[#223F74] ring-1 ring-[#223F74]/20" : "border-slate-200 hover:border-slate-300"}`}>
                                  <input type="checkbox" checked={formData.selectedClasses[cls.name]?.sections?.[sectionName] || false} onChange={() => handleSectionToggle(cls.name, sectionName)} className="w-4 h-4 rounded border-slate-300 text-[#223F74] focus:ring-[#223F74]/50" />
                                  <span className="text-xs font-bold text-slate-700">Section {sectionName}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="text-sm font-semibold text-slate-500 italic py-2">No sections defined for this class.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 4 — Settings */}
            <section className="relative z-10">
              <div className="mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#223F74] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#223F74] text-white flex items-center justify-center text-sm shadow-md shadow-[#223F74]/20">4</span>
                  Exam Settings
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.allowMarksEdit} onChange={(e) => setFormData({ ...formData, allowMarksEdit: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#F59B87] focus:ring-[#F59B87] cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Allow marks edit after result lock</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.autoCalculateGrades} onChange={(e) => setFormData({ ...formData, autoCalculateGrades: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#F59B87] focus:ring-[#F59B87] cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Auto calculate grades</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.sendNotification} onChange={(e) => setFormData({ ...formData, sendNotification: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#F59B87] focus:ring-[#F59B87] cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Notify parents on result declaration</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.admitCardRequired} onChange={(e) => setFormData({ ...formData, admitCardRequired: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#F59B87] focus:ring-[#F59B87] cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Admit card required for entry</span>
                </label>
              </div>
            </section>

            {/* Form Actions */}
            <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3 relative z-10">
              <button onClick={handleCreateExam} disabled={loadingSave} className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${loadingSave ? "bg-slate-400 cursor-not-allowed shadow-none" : "bg-[#223F74] hover:bg-[#1b325c] shadow-[#223F74]/20"}`}>
                {loadingSave && <Loader2 className="w-5 h-5 animate-spin" />}
                {loadingSave ? editingExamId ? "Updating..." : "Creating..." : editingExamId ? "Update Exam Schedule" : "Create Exam Schedule"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm p-8 sm:p-16 text-center border border-slate-200">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-3">No Classes Found</h3>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
              You need to have at least one active class registered in the system before you can create and schedule an examination.
            </p>
          </div>
          )
        )}

        {/* View/Edit Exam Modal */}
        <Modal
          id="viewEditExamModal"
          title={examModalMode === "edit" ? "Edit Exam Details" : "View Exam Details"}
          size="md"
          onClose={() => setViewExamData(null)}
        >
          {viewExamData && (
            <div className="space-y-6">
              {/* Type and Status */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</p>
                  {examModalMode === "edit" ? (
                    <select
                      value={editFormData.examType}
                      onChange={(e) => setEditFormData({ ...editFormData, examType: e.target.value })}
                      className="text-xs font-bold bg-white border border-slate-200 rounded-md px-2 py-1 outline-none w-full"
                    >
                      <option value="Unit Test">Unit Test</option>
                      <option value="Half Yearly">Half Yearly</option>
                      <option value="Annual">Annual</option>
                      <option value="Practical">Practical</option>
                      <option value="General">General</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md border ${getExamTypeColor(viewExamData.examStructure?.examType || viewExamData.type)}`}>
                      {viewExamData.examStructure?.examType || viewExamData.type || "General"}
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                  {examModalMode === "edit" ? (
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="text-xs font-bold bg-white border border-slate-200 rounded-md px-2 py-1 outline-none w-full"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md ${getStatusColor(viewExamData.status || "Upcoming")}`}>
                      {viewExamData.status || "Upcoming"}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Fields if in edit mode, else static view */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Academic Year</p>
                  <p className="font-bold text-slate-800">{viewExamData.academicYear || "Not Set"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Exam Timing</p>
                  <p className="font-bold text-slate-800">
                    {viewExamData.slots?.[0]?.startTime || "00:00"} - {viewExamData.slots?.[0]?.endTime || "00:00"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</p>
                  {examModalMode === "edit" ? (
                    <DataField
                      type="textarea"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Add a description..."
                    />
                  ) : (
                    <p className="font-bold text-slate-800 text-sm">
                      {viewExamData.description || "No description provided for this exam."}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</p>
                  {examModalMode === "edit" ? (
                    <DataField
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    />
                  ) : (
                    <p className="font-bold text-slate-800">
                      {viewExamData.startDate ? new Date(viewExamData.startDate).toLocaleDateString() : viewExamData.slots?.[0]?.examDate ? new Date(viewExamData.slots[0].examDate).toLocaleDateString() : "Not Set"}
                    </p>
                  )}
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End Date</p>
                  {examModalMode === "edit" ? (
                    <DataField
                      type="date"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    />
                  ) : (
                    <p className="font-bold text-slate-800">
                      {viewExamData.endDate ? new Date(viewExamData.endDate).toLocaleDateString() : viewExamData.slots?.[viewExamData.slots.length - 1]?.examDate ? new Date(viewExamData.slots[viewExamData.slots.length - 1].examDate).toLocaleDateString() : "Not Set"}
                    </p>
                  )}
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Result Date</p>
                  {examModalMode === "edit" ? (
                    <DataField
                      type="date"
                      value={editFormData.resultDate}
                      onChange={(e) => setEditFormData({ ...editFormData, resultDate: e.target.value })}
                    />
                  ) : (
                    <p className="font-bold text-slate-800">
                      {viewExamData.resultDate ? new Date(viewExamData.resultDate).toLocaleDateString() : "Not Set"}
                    </p>
                  )}
                </div>
                <div className="col-span-3 bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Target Class & Section</p>
                  <p className="font-black text-indigo-900 text-lg">
                    Class {viewExamData.class?.name || viewExamData.class} - Section {viewExamData.section || "A"}
                  </p>
                </div>
              </div>

              {(examModalMode === "edit" ? editFormData.slots : viewExamData.slots) && (examModalMode === "edit" ? editFormData.slots : viewExamData.slots).length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Subject Slots ({(examModalMode === "edit" ? editFormData.slots : viewExamData.slots).length})</p>
                  <div className="space-y-3">
                    {(examModalMode === "edit" ? editFormData.slots : viewExamData.slots).map((s, i) => (
                      <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-slate-100 rounded-xl bg-white shadow-sm gap-3">
                        <div className="flex-1 min-w-[150px]">
                          <span className="font-bold text-sm text-slate-700">
                            {s.subject?.subjectName || s.subject || `Subject ${i + 1}`}
                          </span>
                        </div>
                        {examModalMode === "edit" ? (
                          <div className="flex gap-2 items-center w-full sm:w-auto">
                            <input
                              type="date"
                              value={safeFormatDate(s.examDate)}
                              onChange={(e) => {
                                const newSlots = [...editFormData.slots];
                                newSlots[i].examDate = e.target.value;
                                setEditFormData({ ...editFormData, slots: newSlots });
                              }}
                              className="text-xs font-bold border border-slate-200 rounded p-1.5 outline-none flex-1"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={s.maxMarks || 100}
                                onChange={(e) => {
                                  const newSlots = [...editFormData.slots];
                                  newSlots[i].maxMarks = e.target.value;
                                  setEditFormData({ ...editFormData, slots: newSlots });
                                }}
                                className="w-16 text-xs font-bold border border-slate-200 rounded p-1.5 outline-none text-center"
                              />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Marks</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-center text-xs">
                            <span className="font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              {s.examDate ? new Date(s.examDate).toLocaleDateString() : "No Date"}
                            </span>
                            <span className="font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {s.maxMarks || 100} Marks
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                {examModalMode === "edit" && (
                  <CButton text="Cancel" variant="secondary" onClick={() => closeModal("viewEditExamModal")} />
                )}
                {examModalMode === "edit" ? (
                  <CButton
                    text={loadingSave ? "Saving..." : "Save Changes"}
                    variant="primary"
                    onClick={handleSaveModalEdit}
                    disabled={loadingSave}
                  />
                ) : (
                  <CButton
                    text="Close"
                    variant="secondary"
                    onClick={() => closeModal("viewEditExamModal")}
                  />
                )}
              </div>
            </div>
          )}
        </Modal>
        
        <CreateExamStructureModal
          isOpen={showCreateStructureModal}
          onClose={() => setShowCreateStructureModal(false)}
          availableClasses={availableClasses}
          onSuccess={refreshStructures}
        />
        <Toaster containerStyle={{ zIndex: 99999 }} />
    </div>
  );
};

export default CreateExam;