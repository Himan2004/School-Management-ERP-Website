import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";
import {
  Plus,
  Calendar,
  BookOpen,
  CheckCircle2,
  Settings2,
  ChevronRight,
  LayoutGrid,
  Trash2,
  Edit2,
  Edit3,
  Save,
  AlertCircle,
  Clock,
  View,
  X,
  FileText,
  Eye,
} from "lucide-react";
import {
  getExamStructures,
  deleteExamStructure,
  getExamDashboardStats,
  createExamStructure,
  getExamStructureById,
  updateExamStructure,
} from "../../../services/api/superAdminExamApi";
import {
  getOrganizationClasses,
  getOrganizationSubjectsByClass,
} from "../../../services/api/organizationApi";
import toast from "react-hot-toast";
import { Heading, DashGrid, DashCard, DataTable, PanelModal } from "../../../components/shared/Common_Components";

function DeleteConfirm({ structure, loading, onConfirm, onCancel }) {
  if (!structure) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertCircle size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">Delete Exam Structure?</p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-700">{structure.examName || structure.name}</span>? This
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

const ExamStructurePage = ({ hideHeader = false }) => {
  const [activeTab, setActiveTab] = useState("list");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [examStructures, setExamStructures] = useState([]);
  const [stats, setStats] = useState({
    totalStructures: 0,
    totalSchedules: 0,
    participatingSchools: 0,
  });

  const [viewingExam, setViewingExam] = useState(false);
  const [viewingExamDetails, setViewingExamDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [editingExam, setEditingExam] = useState(null);
  const [selectedStructureToDelete, setSelectedStructureToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    session: "",
    examType: "",
    term: "",
    isActive: true,
  });
  const [editSelectedClassId, setEditSelectedClassId] = useState("");
  const [editSubjectList, setEditSubjectList] = useState([]);
  const [editSubjectMappings, setEditSubjectMappings] = useState({});
  const [loadingEditSubjects, setLoadingEditSubjects] = useState(false);

  const handleView = async (examId) => {
    try {
      setViewingExam(true);
      setLoadingDetails(true);
      const response = await getExamStructureById(examId);
      if (response.success) {
        setViewingExamDetails(response.data);
      } else {
        toast.error("Failed to load exam details");
        setViewingExam(false);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load exam details");
      setViewingExam(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditClick = async (examId) => {
    try {
      setLoading(true);
      const response = await getExamStructureById(examId);
      if (response.success) {
        const struct = response.data;
        setEditingExam(struct);
        setEditFormData({
          name: struct.examName,
          session: struct.academicYear,
          examType: struct.examType,
          term: struct.term || "",
          isActive: struct.isActive,
        });
        
        const targetClassId = struct.applicableClasses?.[0]?._id || struct.applicableClasses?.[0] || "";
        setEditSelectedClassId(targetClassId);

        if (targetClassId) {
          setLoadingEditSubjects(true);
          const orgId = organizationId || localStorage.getItem("organizationId");
          const subjectsResponse = await getOrganizationSubjectsByClass(targetClassId, orgId);
          if (subjectsResponse.success) {
            const subjects = subjectsResponse.data || [];
            setEditSubjectList(subjects);
            
            const mappings = {};
            subjects.forEach((sub) => {
              mappings[sub._id] = {
                subjectId: sub._id,
                theoryMaxMarks: "",
                practicalMaxMarks: "",
                totalMaxMarks: "",
                passingMarks: "",
                examDate: "",
              };
            });
            struct.subjectMarkings?.forEach((marking) => {
              const subId = marking.subject?._id || marking.subject;
              if (subId) {
                mappings[subId] = {
                  subjectId: subId,
                  theoryMaxMarks: marking.theoryMaxMarks !== undefined ? marking.theoryMaxMarks : "",
                  practicalMaxMarks: marking.practicalMaxMarks !== undefined ? marking.practicalMaxMarks : "",
                  totalMaxMarks: marking.totalMaxMarks !== undefined ? marking.totalMaxMarks : "",
                  passingMarks: marking.passingMarks !== undefined ? marking.passingMarks : "",
                  examDate: marking.examDate ? new Date(marking.examDate).toISOString().split("T")[0] : "",
                };
              }
            });
            setEditSubjectMappings(mappings);
          } else {
            setEditSubjectList([]);
            setEditSubjectMappings({});
          }
          setLoadingEditSubjects(false);
        } else {
          setEditSubjectList([]);
          setEditSubjectMappings({});
        }
      } else {
        toast.error("Failed to load exam structure details");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load exam structure details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClassChange = async (classId) => {
    setEditSelectedClassId(classId);
    if (!classId) {
      setEditSubjectList([]);
      setEditSubjectMappings({});
      return;
    }
    
    setLoadingEditSubjects(true);
    try {
      const orgId = organizationId || localStorage.getItem("organizationId");
      const response = await getOrganizationSubjectsByClass(classId, orgId);
      if (response.success) {
        const subjects = response.data || [];
        setEditSubjectList(subjects);
        
        const initialMappings = {};
        subjects.forEach((sub) => {
          initialMappings[sub._id] = {
            subjectId: sub._id,
            theoryMaxMarks: "",
            practicalMaxMarks: "",
            totalMaxMarks: "",
            passingMarks: "",
            examDate: "",
          };
        });
        setEditSubjectMappings(initialMappings);
      } else {
        setEditSubjectList([]);
        setEditSubjectMappings({});
      }
    } catch (error) {
      console.error("Error loading subjects for edit class:", error);
      toast.error(error.message || "Failed to load subjects");
      setEditSubjectList([]);
      setEditSubjectMappings({});
    } finally {
      setLoadingEditSubjects(false);
    }
  };

  const handleEditMappingChange = (subjectId, field, value) => {
    setEditSubjectMappings((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.session || !editSelectedClassId) {
      toast.error("Please fill in Exam Title, Session, and Target Class.");
      return;
    }
    
    const mappingsArray = Object.values(editSubjectMappings);
    if (mappingsArray.length === 0) {
      toast.error("At least one subject mapping is required.");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        academicYear: editFormData.session,
        examName: editFormData.name,
        examType: editFormData.examType,
        term: editFormData.term || null,
        applicableClasses: [editSelectedClassId],
        subjectMarkings: mappingsArray.map((mapping) => ({
          subject: mapping.subjectId,
          maxMarks: mapping.totalMaxMarks ? Number(mapping.totalMaxMarks) : (mapping.theoryMaxMarks ? Number(mapping.theoryMaxMarks) : null),
          theoryMaxMarks: mapping.totalMaxMarks ? Number(mapping.totalMaxMarks) : (mapping.theoryMaxMarks ? Number(mapping.theoryMaxMarks) : 0),
          totalMaxMarks: mapping.totalMaxMarks ? Number(mapping.totalMaxMarks) : (mapping.theoryMaxMarks ? Number(mapping.theoryMaxMarks) : 0),
          passingMarks: mapping.passingMarks ? Number(mapping.passingMarks) : 0,
          examDate: mapping.examDate || null,
        })),
        isActive: editFormData.isActive,
      };

      const response = await updateExamStructure(editingExam._id, payload);
      if (response.success) {
        toast.success("Exam structure updated successfully!");
        setEditingExam(null);
        fetchStructures();
      } else {
        toast.error(response.message || "Failed to update exam structure");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update exam structure");
    } finally {
      setLoading(false);
    }
  };

  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjectList, setSubjectList] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // --- FORM STATE ---
  const [examFormData, setExamFormData] = useState({
    name: "",
    session: "",
    examType: "Unit Test",
    resultDate: "",
  });
  const [subjectMappings, setSubjectMappings] = useState({});

  const organizationId =
    useSelector(selectSuperAdmin)?.superAdmin?.organization;

  useEffect(() => {
    fetchStructures();
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadSubjectsForClass(selectedClassId);
    } else {
      setSubjectList([]);
      setSubjectMappings({});
    }
  }, [selectedClassId]);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const params = {
        organizationId:
          organizationId || localStorage.getItem("organizationId"),
      };
      const [structuresRes, statsRes] = await Promise.all([
        getExamStructures(params),
        getExamDashboardStats(),
      ]);

      if (structuresRes.success) {
        setExamStructures(structuresRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch exam structures");
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const orgId = organizationId || localStorage.getItem("organizationId");
      if (!orgId) return;

      const response = await getOrganizationClasses(orgId);
      if (response.success) {
        setClassesList(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error(error.message || "Failed to load classes");
    }
  };

  const loadSubjectsForClass = async (classId) => {
    setLoadingSubjects(true);
    try {
      const orgId = organizationId || localStorage.getItem("organizationId");
      if (!orgId) {
        toast.error("Organization not found. Please login again.");
        return;
      }

      const response = await getOrganizationSubjectsByClass(classId, orgId);

      if (response.success) {
        const subjects = response.data || [];
        setSubjectList(subjects);

        const initialMappings = {};
        subjects.forEach((sub) => {
          initialMappings[sub._id] = {
            subjectId: sub._id,
            maxMarks: "",
            passMarks: "",
            examDate: "",
          };
        });
        setSubjectMappings(initialMappings);
      } else {
        setSubjectList([]);
        setSubjectMappings({});
      }
    } catch (error) {
      console.error("Error fetching subjects for class:", error);
      toast.error(
        error.message || "Failed to load subjects for the selected class",
      );
      setSubjectList([]);
      setSubjectMappings({});
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleMappingChange = (subjectId, field, value) => {
    setSubjectMappings((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const confirmDelete = async () => {
    if (!selectedStructureToDelete) return;
    setDeleteConfirmLoading(true);
    try {
      const response = await deleteExamStructure(selectedStructureToDelete._id || selectedStructureToDelete.id);
      if (response.success) {
        toast.success("Exam structure deleted successfully");
        fetchStructures();
        setShowDeleteConfirm(false);
        setSelectedStructureToDelete(null);
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete exam structure");
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  // --- CORRECTED PUBLISH HANDLER ---
  const handlePublish = async (status = "Published") => {
    if (!examFormData.name || !examFormData.session || !selectedClassId) {
      toast.error("Please fill in Exam Title, Session, and Target Class.");
      setStep(1);
      return;
    }

    setPublishLoading(true);
    try {
      // Build payload exactly as backend controller expects
      const payload = {
        academicYear: examFormData.session,
        examName: examFormData.name,
        examType: examFormData.examType,
        applicableClasses: [selectedClassId],

        // Ensure keys map perfectly to Mongoose Schema
        subjectMarkings: Object.values(subjectMappings).map((mapping) => ({
          subject: mapping.subjectId,
          maxMarks: mapping.maxMarks ? Number(mapping.maxMarks) : null,
          passingMarks: mapping.passMarks ? Number(mapping.passMarks) : null,
          examDate: mapping.examDate || null,
        })),
        isActive: status === "Published",
      };

      const response = await createExamStructure(payload);

      if (response.success || response) {
        toast.success(
          `Exam structure ${status === "Draft" ? "saved as draft" : "published"} successfully!`,
        );

        setExamFormData({
          name: "",
          session: "",
          examType: "Regular",
          resultDate: "",
        });
        setSelectedClassId("");
        setSubjectMappings({});
        setActiveTab("list");
        setStep(1);
        fetchStructures();
      }
    } catch (error) {
      toast.error(error.message || "Failed to save exam structure");
    } finally {
      setPublishLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "examNameSession",
        label: "Exam Name & Session",
        render: (val, row) => (
          <>
            <p className="font-bold text-slate-700 text-sm">{row.name}</p>
            <p className="text-[10px] text-slate-400 font-medium">{row.session}</p>
          </>
        ),
        searchValue: (row) => `${row.name || ""} ${row.session || ""}`,
      },
      {
        key: "targetClass",
        label: "Target Class",
        render: (val, row) => <span className="font-semibold text-slate-600">{row.class}</span>,
        searchValue: (row) => row.class || "",
      },
      {
        key: "subjects",
        label: "Subjects",
        render: (val, row) => (
          <span className="bg-[#223F74]/5 text-[#223F74] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#223F74]/10">
            {row.subjects}
          </span>
        ),
        searchValue: (row) => String(row.subjects || ""),
      },
      {
        key: "statusDisplay",
        label: "Status",
        render: (val, row) => (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
              row.status === "Published"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : row.status === "Draft"
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
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
        tooltip: "View Details",
        variant: "ghost",
        onClick: (row) => handleView(row._id || row.id),
      },
      {
        icon: <Edit2 size={14} />,
        tooltip: "Edit",
        variant: "ghost",
        onClick: (row) => handleEditClick(row._id || row.id),
      },
      {
        icon: <Trash2 size={14} />,
        tooltip: "Delete",
        variant: "danger",
        onClick: (row) => {
          setSelectedStructureToDelete(row);
          setShowDeleteConfirm(true);
        },
      },
    ],
    []
  );

  return (
    <div className="min-h-screen font-sans w-full overflow-x-hidden">
      {/* Top Header */}
      {!hideHeader ? (
        <div className="max-w-7xl mx-auto mb-6 px-4 sm:px-0">
          <Heading
            primaryText="Exam Structure Manager"
            secondaryText="SuperAdmin"
            size={12}
            showAnimations
            action={
              <button
                onClick={() =>
                  setActiveTab(activeTab === "list" ? "create" : "list")
                }
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#EC856D] text-white px-5 py-2.5 text-sm rounded-full font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 border border-white/10"
              >
                {activeTab === "list" ? (
                  <>
                    <Plus size={16} /> Create New Structure
                  </>
                ) : (
                  <>
                    <LayoutGrid size={16} /> View All Templates
                  </>
                )}
              </button>
            }
          />
        </div>
      ) : (
        /* Embedded button bar */
        <div className="flex justify-end mb-6">
          <button
            onClick={() =>
              setActiveTab(activeTab === "list" ? "create" : "list")
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#EC856D] text-white px-5 py-2.5 text-sm rounded-full font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
          >
            {activeTab === "list" ? (
              <>
                <Plus size={16} /> Create New Structure
              </>
            ) : (
              <>
                <LayoutGrid size={16} /> View All Templates
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === "list" ? (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Quick Stats Summary - only visible when not embedded */}
          {!hideHeader && (
            <div className="mb-6">
              <DashGrid cols={12}>
                <DashCard
                  title="Active Exams"
                  value={stats.totalSchedules.toString()}
                  icon={<Clock className="text-orange-500" />}
                  size={4}
                  accentColor="#F59E0B"
                />
                <DashCard
                  title="Participating Branches"
                  value={stats.participatingSchools.toString()}
                  icon={<CheckCircle2 className="text-green-500" />}
                  size={4}
                  accentColor="#10B981"
                />
                <DashCard
                  title="Total Templates"
                  value={stats.totalStructures.toString()}
                  icon={<BookOpen className="text-blue-500" />}
                  size={4}
                  accentColor="#223F74"
                />
              </DashGrid>
            </div>
          )}

          {/* Table Section */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 text-center text-slate-400 font-medium italic text-sm shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
              Loading exam structures...
            </div>
          ) : (
            <DataTable
              title="Recent Exam Structures"
              columns={columns}
              rows={examStructures}
              actions={tableActions}
              pageSize={5}
              size={12}
              searchable={true}
            />
          )}
        </div>
      ) : (
        /* Wizard Form for Creating Exam */
        <div className="max-w-4xl w-full mx-auto bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          {/* Stepper Header */}
          <div className="flex items-center gap-3 bg-[#F8FAFC] p-6 border-b border-[#E2E8F0] overflow-x-auto scrollbar-thin">
            <StepIndicator
              stepNumber={1}
              active={step >= 1}
              label="General Info"
            />
            <div className="hidden sm:flex flex-1 items-center justify-center">
              <ChevronRight className="text-slate-300" />
            </div>
            <StepIndicator
              stepNumber={2}
              active={step >= 2}
              label="Subject Mapping"
            />
            <div className="hidden sm:flex flex-1 items-center justify-center">
              <ChevronRight className="text-slate-300" />
            </div>
            <StepIndicator
              stepNumber={3}
              active={step >= 3}
              label="Marking & Finalize"
            />
          </div>

          <div className="p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InputGroup
                    label="Exam Title"
                    placeholder="e.g. Sessional Test 1"
                    value={examFormData.name}
                    onChange={(e) =>
                      setExamFormData({ ...examFormData, name: e.target.value })
                    }
                  />
                  <InputGroup
                    label="Academic Session"
                    placeholder="e.g. 2025-26"
                    value={examFormData.session}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        session: e.target.value,
                      })
                    }
                  />

                  {/* DYNAMIC CLASS DROPDOWN */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                      Target Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                    >
                      <option value="">Select Class</option>
                      {classesList.map((cls) => (
                        <option
                          key={cls._id || cls.id}
                          value={cls._id || cls.id}
                        >
                          {cls.name || cls.className}{" "}
                          {cls.section ? `- ${cls.section}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* NEW EXAM TYPE DROPDOWN */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                      Exam Type
                    </label>
                    <select
                      value={examFormData.examType}
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          examType: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                    >
                      <option value="Unit Test">Unit Test</option>
                      <option value="Class Test">Class Test</option>
                      <option value="Mid Term">Mid-Year (Half Yearly)</option>
                      <option value="Term Exam">Term Exam</option>
                      <option value="Final Term">Terminal (Annual)</option>
                      <option value="Pre Board">Pre-Board</option>
                      <option value="Board">Board Exam</option>
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 flex gap-3.5 items-start">
                  <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                  <p className="text-sm text-blue-700 leading-relaxed font-semibold">
                    Setting the <b>Target Class</b> will automatically fetch all
                    registered subjects for mapping in the next step.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h4 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-[0.15em] mb-4">
                  Map Marks & Dates for Subjects
                </h4>

                {/* DYNAMIC SUBJECT MAPPING */}
                {loadingSubjects ? (
                  <div className="p-8 text-center text-slate-500 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm font-semibold">
                    Loading subjects for selected class...
                  </div>
                ) : subjectList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm font-semibold">
                    {selectedClassId
                      ? "No subjects found for this class."
                      : "Please select a class in Step 1 first."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjectList.map((sub, i) => {
                      const mapping = subjectMappings[sub._id] || {};
                      return (
                        <div
                          key={sub._id || i}
                          className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]"
                        >
                          <div className="w-full sm:w-1/3 font-bold text-slate-700 text-sm">
                            {sub.name || sub.subjectName || sub}
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="number"
                              placeholder="Max Marks"
                              value={mapping.maxMarks || ""}
                              onChange={(e) =>
                                handleMappingChange(
                                  sub._id,
                                  "maxMarks",
                                  e.target.value,
                                )
                              }
                              className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                            />
                            <input
                              type="number"
                              placeholder="Pass Marks"
                              value={mapping.passMarks || ""}
                              onChange={(e) =>
                                handleMappingChange(
                                  sub._id,
                                  "passMarks",
                                  e.target.value,
                                )
                              }
                              className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                            />
                            <input
                              type="date"
                              value={mapping.examDate || ""}
                              onChange={(e) =>
                                handleMappingChange(
                                  sub._id,
                                  "examDate",
                                  e.target.value,
                                )
                              }
                              className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="text-center space-y-4 py-10 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-[#1D1D1F]">
                  Ready to Publish?
                </h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Review all the exam timings and subject mapping. Once
                  published, students and teachers will see this in their
                  portals.
                </p>

                <div className="pt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setStep(step - 1)}
                    disabled={publishLoading}
                    className="bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 hover:-translate-y-0.5"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePublish("Draft")}
                    disabled={publishLoading}
                    className="bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 hover:-translate-y-0.5"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handlePublish("Published")}
                    disabled={publishLoading}
                    className="bg-[#F59B87] hover:bg-[#EC856D] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {publishLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      "Publish Exam Structure"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            {step < 3 && (
              <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row gap-3 sm:justify-between">
                <button
                  disabled={step === 1}
                  onClick={() => setStep(step - 1)}
                  className={`w-full sm:w-auto px-6 py-3 border rounded-2xl font-bold transition-all text-sm active:scale-95 hover:-translate-y-0.5 ${
                    step === 1 ? "text-slate-300 border-slate-100 bg-slate-50 pointer-events-none opacity-50" : "text-[#223F74] border-[#E7E2DB] bg-white hover:bg-[#F8EEE9]"
                  }`}
                >
                  Previous Step
                </button>
                <button
                  disabled={step === 3}
                  onClick={() => {
                    // Validation before going to step 2
                    if (
                      step === 1 &&
                      (!selectedClassId ||
                        !examFormData.name ||
                        !examFormData.session)
                    ) {
                      toast.error(
                        "Please fill in Exam Title, Session, and Target Class.",
                      );
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F59B87] hover:bg-[#EC856D] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 text-sm"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- POPUP MODAL FOR VIEWING DETAILS (READ ONLY) --- */}
      <PanelModal
        id="view-exam-modal"
        title="Exam Structure Details"
        size="2xl"
        isVisible={Boolean(viewingExam)}
        onClose={() => {
          setViewingExam(false);
          setViewingExamDetails(null);
        }}
      >
        {loadingDetails || !viewingExamDetails ? (
          <div className="p-12 text-center text-slate-400 font-medium italic">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
              <span>Loading exam details...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailCard label="Exam Name" value={viewingExamDetails.examName} />
              <DetailCard label="Session" value={viewingExamDetails.academicYear} />
              <DetailCard
                label="Class"
                value={viewingExamDetails.applicableClasses?.map((c) => c.name || c.className).join(", ") || "N/A"}
              />
              <DetailCard label="Total Subjects" value={viewingExamDetails.subjectMarkings?.length || 0} />
              <DetailCard
                label="Status"
                value={
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      viewingExamDetails.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {viewingExamDetails.isActive ? "Published" : "Draft"}
                  </span>
                }
              />
              <DetailCard
                label="Created Date"
                value={viewingExamDetails.createdAt ? new Date(viewingExamDetails.createdAt).toLocaleDateString() : "N/A"}
              />
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                Subjects Marks & Dates Configuration
              </h4>
              <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-[#E2E8F0] uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-5">Subject</th>
                      <th className="p-3 text-center">Max Marks</th>
                      <th className="p-3 text-center">Pass Marks</th>
                      <th className="p-3 pr-5 text-center">Exam Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {viewingExamDetails.subjectMarkings?.map((sub, idx) => {
                      const maxMarksVal = sub.totalMaxMarks !== undefined ? sub.totalMaxMarks : (sub.theoryMaxMarks || 0);
                      return (
                        <tr key={idx} className="hover:bg-[#F8FAFC]/55 transition-colors">
                          <td className="p-3 pl-5 font-bold text-slate-700">
                            {sub.subject?.name || sub.subject?.subjectName || sub.subject?.title || (typeof sub.subject === "string" ? sub.subject : null) || sub.subjectName || "N/A"}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-600">
                            {maxMarksVal}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-600">
                            {sub.passingMarks}
                          </td>
                          <td className="p-3 pr-5 text-center font-medium text-slate-500">
                            {sub.examDate ? new Date(sub.examDate).toLocaleDateString() : "TBD"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  setViewingExam(false);
                  setViewingExamDetails(null);
                }}
                className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 hover:-translate-y-0.5"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </PanelModal>

      {/* --- POPUP MODAL FOR EDITING DETAILS --- */}
      <PanelModal
        id="edit-exam-modal"
        title="Edit Exam Structure"
        size="2xl"
        isVisible={Boolean(editingExam)}
        onClose={() => setEditingExam(null)}
      >
        <div className="space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-b border-[#E2E8F0] pb-6">
            <InputGroup
              label="Exam Title"
              placeholder="e.g. Sessional Test 1"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />

            <InputGroup
              label="Academic Session"
              placeholder="e.g. 2025-26"
              value={editFormData.session}
              onChange={(e) => setEditFormData({ ...editFormData, session: e.target.value })}
            />

            {/* Target Class Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                Target Class
              </label>
              <select
                value={editSelectedClassId}
                onChange={(e) => handleEditClassChange(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
              >
                <option value="">Select Class</option>
                {classesList.map((cls) => (
                  <option key={cls._id || cls.id} value={cls._id || cls.id}>
                    {cls.name || cls.className} {cls.section ? `- ${cls.section}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Type Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                Exam Type
              </label>
              <select
                value={editFormData.examType}
                onChange={(e) => setEditFormData({ ...editFormData, examType: e.target.value })}
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
              >
                <option value="Unit Test">Unit Test</option>
                <option value="Class Test">Class Test</option>
                <option value="Mid Term">Mid-Year (Half Yearly)</option>
                <option value="Term Exam">Term Exam</option>
                <option value="Final Term">Terminal (Annual)</option>
                <option value="Pre Board">Pre-Board</option>
                <option value="Board">Board Exam</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                Status
              </label>
              <select
                value={editFormData.isActive ? "Published" : "Draft"}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.value === "Published" })}
                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
              >
                <option value="Published">Published (Active)</option>
                <option value="Draft">Draft (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Subject Mapping Configurations */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-[0.15em] mb-4">
              Map Marks & Dates for Subjects
            </h4>

            {loadingEditSubjects ? (
              <div className="p-8 text-center text-slate-500 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm font-semibold">
                Loading subjects for selected class...
              </div>
            ) : editSubjectList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm font-semibold">
                {editSelectedClassId
                  ? "No subjects found for this class."
                  : "Please select a target class first."}
              </div>
            ) : (
              <div className="space-y-3">
                {editSubjectList.map((sub, i) => {
                  const mapping = editSubjectMappings[sub._id] || {};
                  const maxMarksVal = mapping.totalMaxMarks !== undefined && mapping.totalMaxMarks !== "" ? mapping.totalMaxMarks : (mapping.theoryMaxMarks || "");
                  return (
                    <div
                      key={sub._id || i}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]"
                    >
                      <div className="w-full sm:w-1/3 font-bold text-slate-700 text-sm">
                        {sub.name || sub.subjectName || sub}
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="number"
                          placeholder="Max Marks"
                          value={maxMarksVal}
                          onChange={(e) =>
                            handleEditMappingChange(
                              sub._id,
                              "totalMaxMarks",
                              e.target.value,
                            )
                          }
                          className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                        />
                        <input
                          type="number"
                          placeholder="Pass Marks"
                          value={mapping.passingMarks || ""}
                          onChange={(e) =>
                            handleEditMappingChange(
                              sub._id,
                              "passingMarks",
                              e.target.value,
                            )
                          }
                          className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                        />
                        <input
                          type="date"
                          value={mapping.examDate || ""}
                          onChange={(e) =>
                            handleEditMappingChange(
                              sub._id,
                              "examDate",
                              e.target.value,
                            )
                          }
                          className="border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#223F74] bg-white text-center"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer / Submit Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setEditingExam(null)}
              className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-sm transition-all active:scale-95 hover:-translate-y-0.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-6 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white rounded-full font-bold text-sm shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </PanelModal>
      {showDeleteConfirm && (
        <DeleteConfirm
          structure={selectedStructureToDelete}
          loading={deleteConfirmLoading}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedStructureToDelete(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-components
const DetailCard = ({ label, value }) => (
  <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
      {label}
    </p>
    <p className="font-semibold text-[#1D1D1F] text-sm">{value}</p>
  </div>
);

const SummaryCard = ({ label, value, icon, color }) => (
  <div
    className={`p-4 sm:p-6 md:p-8 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 w-full min-w-0 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
        {label}
      </p>
      <h3 className="text-2xl sm:text-4xl font-black text-slate-800 mt-1 truncate">
        {value}
      </h3>
    </div>
    <div className={`p-3 rounded-xl shrink-0 ${color}`}>{icon}</div>
  </div>
);

const StepIndicator = ({ stepNumber, active, label }) => (
  <div
    className={`flex items-center gap-3 shrink-0 ${active ? "opacity-100" : "opacity-40"}`}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${active ? "bg-[#223F74] text-white shadow-lg shadow-[#223F74]/20" : "bg-slate-200 text-slate-500"}`}
    >
      {stepNumber}
    </div>
    <span className="hidden md:inline font-bold text-slate-700 text-sm whitespace-nowrap">
      {label}
    </span>
  </div>
);

const InputGroup = ({ label, type = "text", placeholder, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74] transition-all placeholder:text-[#A0AEC0]"
    />
  </div>
);

export default ExamStructurePage;
