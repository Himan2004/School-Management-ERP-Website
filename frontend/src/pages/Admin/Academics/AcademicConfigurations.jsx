import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Layers,
  Gift,
  FileText,
  Award,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Eye,
  Info,
  BookOpen,
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getSchoolAcademicConfigs,
  createSchoolAcademicConfig,
  updateSchoolAcademicConfig,
  deleteSchoolAcademicConfig,
  getAdminAcademicConfig,
  getAdminClassesSections,
  getAdminSubjects
} from "../../../services/api/adminAcademicsApi";
import {
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Modal,
  openModal,
  closeModal,
  Button,
  Grid,
  DataField,
  SelectField,
  Option
} from "../../../components/shared/Common_Components";

const PEACH = "#F59B87";

const steps = [
  { id: "academic-year",    name: "Academic Year",      icon: Calendar  },
  { id: "classes-subjects", name: "Classes & Subjects", icon: Layers    },
  { id: "holidays",         name: "Holidays",           icon: Gift      },
  { id: "exam-patterns",    name: "Exam Patterns",      icon: FileText  },
  { id: "grading",          name: "Grading System",     icon: Award     },
];

const holidayTypes = [
  { value: "holiday",  label: "Holiday",  color: "bg-rose-50 text-rose-600 border-rose-200"         },
  { value: "event",    label: "Event",    color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { value: "ptm",      label: "PTM",      color: "bg-blue-50 text-blue-600 border-blue-200"          },
  { value: "vacation", label: "Vacation", color: "bg-purple-50 text-purple-600 border-purple-200"    },
  { value: "exam",     label: "Exam",     color: "bg-amber-50 text-amber-600 border-amber-200"       },
  { value: "other",    label: "Other",    color: "bg-slate-100 text-slate-600 border-slate-200"      },
];

export default function AcademicConfigurations({ cache, refreshCache }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Organization Config State (For comparison modal)
  const [orgConfig, setOrgConfig] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingConfigId, setEditingConfigId] = useState(null);

  // Wizard Form Fields
  const [academicYear, setAcademicYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [status, setStatus] = useState("Active");

  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ title: "", date: "", type: "holiday" });

  const [examPatterns, setExamPatterns] = useState([]);
  const [patternForm, setPatternForm] = useState({
    name: "", classRef: "", totalMarks: 100, passingMarks: 33, weightage: 100
  });
  const [patternComponents, setPatternComponents] = useState([]);
  const [componentForm, setComponentForm] = useState({ subjectRef: "", maxMarks: 100, weightage: 100 });

  const [gradingSystem, setGradingSystem] = useState({
    type: "percentage", passingMarks: 33, slabs: []
  });
  const [slabForm, setSlabForm] = useState({ grade: "", min: 0, max: 100, gradePoint: 0, remarks: "" });

  // View Modals Targets
  const [viewingConfig, setViewingConfig] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle");

  // Helper to render names safely without rendering raw objects in React
  const renderClassName = (c) => {
    if (!c) return "N/A";
    if (typeof c === "string") {
      const found = classes.find(item => item._id === c || item.id === c);
      return found ? found.name : c;
    }
    return c.name || c._id || "Class";
  };

  const renderSubjectName = (s) => {
    if (!s) return "N/A";
    if (typeof s === "string") {
      const found = subjects.find(item => item._id === s);
      return found ? found.subjectName : s;
    }
    return s.subjectName || s._id || "Subject";
  };

  // Fetch initial data
  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true);
        if (refreshCache) {
          await refreshCache();
        }
        return;
      }

      if (cache && !cache.classesLoading && !cache.subjectsLoading && !cache.configLoading && cache.schoolConfigs && cache.classes && cache.subjects) {
        setConfigs(cache.schoolConfigs);
        setClasses(cache.classes);
        setSubjects(cache.subjects);
        setLoading(false);
      } else {
        setLoading(true);
        const [configsRes, classesRes, subjectsRes] = await Promise.all([
          getSchoolAcademicConfigs(),
          getAdminClassesSections(),
          getAdminSubjects()
        ]);

        const fetchedConfigs = configsRes?.data || [];
        const fetchedClasses = classesRes?.data?.data || classesRes?.data || classesRes || [];
        const fetchedSubjects = subjectsRes?.data || subjectsRes || [];

        setConfigs(fetchedConfigs);
        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);
        setLoading(false);
      }
    } catch (err) {
      console.error("[ERROR] Failed loading academic configs:", err);
      toast.error("Failed to load academic configurations");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cache && !cache.classesLoading && !cache.subjectsLoading && !cache.configLoading && cache.schoolConfigs && cache.classes && cache.subjects) {
      setConfigs(cache.schoolConfigs);
      setClasses(cache.classes);
      setSubjects(cache.subjects);
      setLoading(false);
    } else {
      loadData();
    }
  }, [cache]);

  // Fetch Organization configuration for template viewing
  const loadOrgConfig = async () => {
    try {
      setLoadingOrg(true);
      const res = await getAdminAcademicConfig();
      setOrgConfig(res?.data || res || null);
      openModal("view-org-config-modal");
    } catch (err) {
      toast.error("Failed to load organization academic configuration template");
    } finally {
      setLoadingOrg(false);
    }
  };

  // Derive stats based on current config
  const currentConfig = useMemo(() => {
    return configs.find(c => c.isCurrent) || configs[0] || null;
  }, [configs]);

  const stats = useMemo(() => {
    if (!currentConfig) return { year: "None", classes: 0, subjects: 0, holidays: 0, exams: 0, slabs: 0 };
    return {
      year: currentConfig.academicYear || "None",
      classes: currentConfig.classes?.length || 0,
      subjects: currentConfig.subjects?.length || 0,
      holidays: currentConfig.holidays?.length || 0,
      exams: currentConfig.examPatterns?.length || 0,
      slabs: currentConfig.gradingSystem?.slabs?.length || 0
    };
  }, [currentConfig]);

  // Form Initializations
  const handleOpenCreate = () => {
    setEditingConfigId(null);
    setAcademicYear("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(configs.length === 0);
    setStatus("Active");
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setHolidays([]);
    setExamPatterns([]);
    setGradingSystem({ type: "percentage", passingMarks: 33, slabs: [] });
    setErrors({});
    setCurrentStep(0);
    setShowWizard(true);
    openModal("school-config-wizard-modal");
  };

  const handleOpenEdit = (cfg) => {
    setEditingConfigId(cfg._id);
    setAcademicYear(cfg.academicYear);
    setStartDate(cfg.startDate?.split("T")[0] || "");
    setEndDate(cfg.endDate?.split("T")[0] || "");
    setIsCurrent(!!cfg.isCurrent);
    setStatus(cfg.status || "Active");
    setSelectedClasses(cfg.classes?.map(c => c._id || c) || []);
    setSelectedSubjects(cfg.subjects?.map(s => s._id || s) || []);
    setHolidays(cfg.holidays || []);
    setExamPatterns(cfg.examPatterns || []);
    setGradingSystem(cfg.gradingSystem || { type: "percentage", passingMarks: 33, slabs: [] });
    setErrors({});
    setCurrentStep(0);
    setShowWizard(true);
    openModal("school-config-wizard-modal");
  };

  const handleDeleteConfig = async (id) => {
    if (!window.confirm("Are you sure you want to delete this school academic configuration?")) return;
    try {
      await deleteSchoolAcademicConfig(id);
      toast.success("Configuration deleted successfully");
      if (refreshCache) {
        refreshCache();
      } else {
        loadData();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to delete configuration");
    }
  };

  // Stepper Handlers
  const handleNextStep = () => {
    const newErrors = {};
    if (currentStep === 0) {
      if (!academicYear) newErrors.academicYear = "Academic Year is required";
      if (!startDate) newErrors.startDate = "Start Date is required";
      if (!endDate) newErrors.endDate = "End Date is required";
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        newErrors.endDate = "End Date cannot be before Start Date";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Focus first invalid field
        const firstInvalid = Object.keys(newErrors)[0];
        setTimeout(() => {
          const el = document.getElementById(firstInvalid);
          if (el) el.focus();
        }, 50);
        return;
      }
    } else if (currentStep === 1) {
      if (selectedClasses.length === 0) newErrors.classes = "Please select at least one Class";
      if (selectedSubjects.length === 0) newErrors.subjects = "Please select at least one Subject";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    setErrors({});
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Holiday handlers
  const handleAddHoliday = () => {
    if (!holidayForm.title || !holidayForm.date) {
      toast.error("Holiday Title and Date are required");
      return;
    }
    setHolidays(prev => [...prev, { ...holidayForm }]);
    setHolidayForm({ title: "", date: "", type: "holiday" });
  };

  const handleRemoveHoliday = (idx) => {
    setHolidays(prev => prev.filter((_, i) => i !== idx));
  };

  // Exam patterns handlers
  const handleAddComponent = () => {
    if (!componentForm.subjectRef) {
      toast.error("Please select a subject");
      return;
    }
    setPatternComponents(prev => [...prev, { ...componentForm }]);
    setComponentForm({ subjectRef: "", maxMarks: 100, weightage: 100 });
  };

  const handleRemoveComponent = (idx) => {
    setPatternComponents(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddPattern = () => {
    if (!patternForm.name || !patternForm.classRef) {
      toast.error("Exam Pattern name and Class Reference are required");
      return;
    }
    setExamPatterns(prev => [...prev, { ...patternForm, components: patternComponents }]);
    setPatternForm({ name: "", classRef: "", totalMarks: 100, passingMarks: 33, weightage: 100 });
    setPatternComponents([]);
  };

  const handleRemovePattern = (idx) => {
    setExamPatterns(prev => prev.filter((_, i) => i !== idx));
  };

  // Grading slabs handlers
  const handleAddSlab = () => {
    if (!slabForm.grade || slabForm.min === "" || slabForm.max === "") {
      toast.error("Grade, Min, and Max are required");
      return;
    }
    setGradingSystem(prev => ({
      ...prev,
      slabs: [...prev.slabs, { ...slabForm }]
    }));
    setSlabForm({ grade: "", min: 0, max: 100, gradePoint: 0, remarks: "" });
  };

  const handleRemoveSlab = (idx) => {
    setGradingSystem(prev => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== idx)
    }));
  };

  const prefillDefaultSlabs = () => {
    const defaultSlabs = [
      { grade: "A1", min: 91, max: 100, gradePoint: 10, remarks: "Outstanding" },
      { grade: "A2", min: 81, max: 90, gradePoint: 9, remarks: "Excellent" },
      { grade: "B1", min: 71, max: 80, gradePoint: 8, remarks: "Very Good" },
      { grade: "B2", min: 61, max: 70, gradePoint: 7, remarks: "Good" },
      { grade: "C1", min: 51, max: 60, gradePoint: 6, remarks: "Above Average" },
      { grade: "C2", min: 41, max: 50, gradePoint: 5, remarks: "Average" },
      { grade: "D", min: 33, max: 40, gradePoint: 4, remarks: "Pass" },
      { grade: "E", min: 0, max: 32, gradePoint: 0, remarks: "Needs Improvement" }
    ];
    setGradingSystem(prev => ({
      ...prev,
      slabs: defaultSlabs
    }));
  };

  // Save Config Handler
  const handleSaveConfig = async () => {
    const payload = {
      academicYear,
      startDate,
      endDate,
      classes: selectedClasses,
      subjects: selectedSubjects,
      holidays,
      examPatterns,
      gradingSystem,
      isCurrent,
      status
    };

    try {
      setSaveStatus("saving");
      if (editingConfigId) {
        await updateSchoolAcademicConfig(editingConfigId, payload);
        toast.success("School academic configuration updated successfully!");
      } else {
        await createSchoolAcademicConfig(payload);
        toast.success("School academic configuration created successfully!");
      }
      setSaveStatus("saved");
      setTimeout(() => {
        closeModal("school-config-wizard-modal");
        setShowWizard(false);
        setSaveStatus("idle");
        if (refreshCache) {
          refreshCache();
        } else {
          loadData();
        }
      }, 1500);
    } catch (err) {
      setSaveStatus("idle");
      toast.error(err?.message || "Failed to save configuration");
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const columns = [
    { label: "Academic Year", key: "academicYear", sortable: true },
    {
      label: "Start Date",
      key: "startDate",
      render: (val) => formatDate(val),
      sortable: true
    },
    {
      label: "End Date",
      key: "endDate",
      render: (val) => formatDate(val),
      sortable: true
    },
    {
      label: "Classes",
      key: "classes",
      render: (val) => {
        const classesArr = val ?? [];
        return `${classesArr.length} Classes`;
      }
    },
    {
      label: "Subjects",
      key: "subjects",
      render: (val) => {
        const subjectsArr = val ?? [];
        return `${subjectsArr.length} Subjects`;
      }
    },
    {
      label: "Current Session",
      key: "isCurrent",
      render: (val) => {
        const isCurrentVal = !!val;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isCurrentVal ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
            {isCurrentVal ? "Active" : "No"}
          </span>
        );
      }
    },
    {
      label: "Status",
      key: "status",
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${val === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
          {val}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#223F74] animate-spin mb-2" />
        <span className="text-sm font-semibold text-slate-500">Loading academic configurations...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left animate-in fade-in duration-300">
      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-3 bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
        <button
          onClick={loadOrgConfig}
          disabled={loadingOrg}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 text-[#223F74] hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition shadow-sm"
        >
          {loadingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye size={15} />}
          View Organization Configuration
        </button>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs uppercase tracking-wider transition shadow-md"
          style={{ background: PEACH, boxShadow: `0 4px 14px ${PEACH}55` }}
        >
          <Plus size={15} /> Create Configuration
        </button>
      </div>

      {/* Stats Cards (Rearranged to size 4 -> 3 cards per row on desktop) */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Active Year"
          value={stats.year}
          icon={<Calendar size={20} />}
          accentColor="#7A8FC6"
          size={4}
          showAnimations
        />
        <EnhancedDashCard
          title="Classes Configured"
          value={String(stats.classes)}
          icon={<Layers size={20} />}
          accentColor="#E88F80"
          size={4}
          showAnimations
        />
        <EnhancedDashCard
          title="Subjects Configured"
          value={String(stats.subjects)}
          icon={<BookOpen size={20} />}
          accentColor="#7FC7B9"
          size={4}
          showAnimations
        />
        <EnhancedDashCard
          title="Holidays Configured"
          value={String(stats.holidays)}
          icon={<Gift size={20} />}
          accentColor="#8BB8E8"
          size={4}
          showAnimations
        />
        <EnhancedDashCard
          title="Exam Patterns"
          value={String(stats.exams)}
          icon={<FileText size={20} />}
          accentColor="#B596C8"
          size={4}
          showAnimations
        />
        <EnhancedDashCard
          title="Grading Scales"
          value={String(stats.slabs)}
          icon={<Award size={20} />}
          accentColor="#E5B25D"
          size={4}
          showAnimations
        />
      </DashGrid>

      {/* configurations list table */}
      <DataTable
        title="School Academic Setups"
        columns={columns}
        rows={configs}
        actions={[
          {
            tooltip: "View Configuration Summary",
            icon: <Eye size={14} className="text-slate-600" />,
            onClick: (row) => {
              setViewingConfig(row);
              openModal("view-school-config-modal");
            }
          },
          {
            tooltip: "Edit Configuration",
            icon: <Edit2 size={14} className="text-blue-600" />,
            onClick: (row) => handleOpenEdit(row)
          },
          {
            tooltip: "Delete Configuration",
            icon: <Trash2 size={14} className="text-rose-600" />,
            onClick: (row) => handleDeleteConfig(row._id)
          }
        ]}
        pageSize={5}
        searchable={true}
      />

      {/* ── CREATE / EDIT STEPPER WIZARD MODAL (USING PROJECT COMMON MODAL) ── */}
      <Modal
        id="school-config-wizard-modal"
        title={editingConfigId ? "Edit School Configuration" : "New School Configuration"}
        size="xl"
        onClose={() => {
          setShowWizard(false);
        }}
      >
        {showWizard && (
          <div className="flex flex-col text-left">
            {/* Stepper Steps Row */}
            <div className="py-2 pb-4 border-b border-slate-100 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none mb-5">
              {steps.map((st, idx) => {
                const active = currentStep === idx;
                const completed = currentStep > idx;
                return (
                  <div key={st.id} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${active ? "bg-[#223F74] text-white" : completed ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-500"}`}>
                      {completed ? <CheckCircle size={16} /> : idx + 1}
                    </div>
                    <span className={`text-xs font-bold transition whitespace-nowrap ${active ? "text-[#223F74]" : completed ? "text-emerald-700" : "text-slate-400"}`}>
                      {st.name}
                    </span>
                    {idx < steps.length - 1 && <ArrowRight size={14} className="text-slate-300" />}
                  </div>
                );
              })}
            </div>

            {/* Stepper Content Body */}
            <div className="space-y-6 pb-6">
              {/* STEP 1: ACADEMIC YEAR */}
              {currentStep === 0 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Step 1: Academic Session Details</h4>
                  <Grid cols={12} gap={4}>
                    <DataField
                      label="Academic Year Label *"
                      id="academicYear"
                      placeholder="e.g. 2026-2027"
                      value={academicYear}
                      onChange={(e) => {
                        setAcademicYear(e.target.value);
                        if (errors.academicYear) setErrors(prev => ({ ...prev, academicYear: "" }));
                      }}
                      error={errors.academicYear}
                      size={6}
                    />
                    <DataField
                      label="Start Date *"
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (errors.startDate) setErrors(prev => ({ ...prev, startDate: "" }));
                      }}
                      error={errors.startDate}
                      size={3}
                    />
                    <DataField
                      label="End Date *"
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (errors.endDate) setErrors(prev => ({ ...prev, endDate: "" }));
                      }}
                      error={errors.endDate}
                      size={3}
                    />
                    <div className="col-span-12 md:col-span-6 mt-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isCurrentToggle"
                          checked={isCurrent}
                          onChange={(e) => setIsCurrent(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-[#223F74] focus:ring-[#223F74]"
                        />
                        <label htmlFor="isCurrentToggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
                          Set as Current Active Session
                        </label>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <SelectField
                        label="Status"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        size={12}
                      >
                        <Option value="Active" label="Active" />
                        <Option value="Inactive" label="Inactive" />
                        <Option value="Archived" label="Archived" />
                      </SelectField>
                    </div>
                  </Grid>
                </div>
              )}

              {/* STEP 2: CLASSES & SUBJECTS */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Step 2: Map Classes & Subjects</h4>
                  
                  {/* Classes multi-select */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Available Classes *</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {classes.map(c => {
                        const classId = c.id || c._id;
                        const checked = selectedClasses.includes(classId);
                        return (
                          <label key={classId} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition hover:bg-slate-50 ${checked ? "bg-slate-50 border-[#223F74] text-[#223F74]" : "border-slate-200 text-slate-600"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                let updatedClasses = [];
                                if (e.target.checked) {
                                  updatedClasses = [...selectedClasses, classId];
                                } else {
                                  updatedClasses = selectedClasses.filter(id => id !== classId);
                                }
                                setSelectedClasses(updatedClasses);
                                if (errors.classes && updatedClasses.length > 0) {
                                  setErrors(prev => ({ ...prev, classes: "" }));
                                }
                              }}
                              className="rounded text-[#223F74]"
                            />
                            {c.name}
                          </label>
                        );
                      })}
                    </div>
                    {errors.classes && (
                      <span className="text-xs font-semibold text-rose-500 mt-1 ml-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {errors.classes}
                      </span>
                    )}
                  </div>

                  {/* Subjects selection (filtered by selected classes) */}
                  {selectedClasses.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure Subjects mapping</p>
                      <div className="space-y-3">
                        {classes.filter(c => selectedClasses.includes(c.id || c._id)).map(cls => {
                          const classId = cls.id || cls._id;
                          const classSubjects = subjects.filter(s => {
                            const rawAssigned = s.assignedClasses || [];
                            return rawAssigned.some(c => {
                              const cIdStr = String(c._id || c);
                              return cIdStr === String(classId);
                            });
                          });
                          return (
                            <div key={classId} className="border border-slate-150 rounded-2xl p-4 bg-slate-50/40">
                              <div className="flex items-center justify-between border-b pb-2 mb-3">
                                <h5 className="text-xs font-bold text-[#223F74] uppercase tracking-wider">{cls.name} Subjects</h5>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allSubIds = classSubjects.map(s => s._id);
                                    const allSelected = allSubIds.every(id => selectedSubjects.includes(id));
                                    let updatedSubjects = [];
                                    if (allSelected) {
                                      updatedSubjects = selectedSubjects.filter(id => !allSubIds.includes(id));
                                    } else {
                                      updatedSubjects = Array.from(new Set([...selectedSubjects, ...allSubIds]));
                                    }
                                    setSelectedSubjects(updatedSubjects);
                                    if (errors.subjects && updatedSubjects.length > 0) {
                                      setErrors(prev => ({ ...prev, subjects: "" }));
                                    }
                                  }}
                                  className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition"
                                >
                                  Toggle All
                                </button>
                              </div>
                              {classSubjects.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {classSubjects.map(sub => (
                                    <label key={sub._id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedSubjects.includes(sub._id)}
                                        onChange={(e) => {
                                          let updatedSubjects = [];
                                          if (e.target.checked) {
                                            updatedSubjects = [...selectedSubjects, sub._id];
                                          } else {
                                            updatedSubjects = selectedSubjects.filter(id => id !== sub._id);
                                          }
                                          setSelectedSubjects(updatedSubjects);
                                          if (errors.subjects && updatedSubjects.length > 0) {
                                            setErrors(prev => ({ ...prev, subjects: "" }));
                                          }
                                        }}
                                        className="rounded text-[#223F74]"
                                      />
                                      {sub.subjectName}
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 font-medium">No subjects available for this class.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {errors.subjects && (
                        <span className="text-xs font-semibold text-rose-500 mt-1 ml-1 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.subjects}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: HOLIDAYS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Step 3: Holiday Calendar & Events</h4>
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-4">
                    <p className="text-xs font-bold text-[#223F74] uppercase tracking-wider">Add Holiday/Event Slot</p>
                    <Grid cols={12} gap={3}>
                      <div className="col-span-12 sm:col-span-5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Summer Vacation"
                          value={holidayForm.title}
                          onChange={(e) => setHolidayForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date *</label>
                        <input
                          type="date"
                          value={holidayForm.date}
                          onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
                        <select
                          value={holidayForm.type}
                          onChange={(e) => setHolidayForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        >
                          {holidayTypes.map(h => (
                            <option key={h.value} value={h.value}>{h.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddHoliday}
                          className="w-full py-2.5 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl text-xs font-black uppercase transition flex items-center justify-center"
                        >
                          Add
                        </button>
                      </div>
                    </Grid>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Holidays List ({holidays.length})</p>
                    {holidays.length > 0 ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                              <th className="px-4 py-2 text-left">Title</th>
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Type</th>
                              <th className="px-4 py-2 text-center w-16">Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {holidays.map((h, idx) => (
                              <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-bold text-slate-800">{h.title}</td>
                                <td className="px-4 py-2.5 font-semibold text-slate-500">{new Date(h.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${holidayTypes.find(t => t.value === h.type)?.color || "bg-slate-100 text-slate-600"}`}>
                                    {h.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={() => handleRemoveHoliday(idx)} className="text-rose-500 hover:text-rose-700 transition">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No holidays configured yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: EXAM PATTERNS */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Step 4: Configure Exam Patterns</h4>
                  
                  {/* Create Pattern Form */}
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-4">
                    <p className="text-xs font-bold text-[#223F74] uppercase tracking-wider">Define Exam Pattern template</p>
                    <Grid cols={12} gap={3}>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pattern Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Midterm / Term 1"
                          value={patternForm.name}
                          onChange={(e) => setPatternForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Applicable Class *</label>
                        <select
                          value={patternForm.classRef}
                          onChange={(e) => {
                            const newClassRef = e.target.value;
                            setPatternForm(prev => ({ ...prev, classRef: newClassRef }));
                            setComponentForm(prev => ({ ...prev, subjectRef: "" }));
                          }}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        >
                          <option value="">Select Class</option>
                          {classes.filter(c => selectedClasses.includes(c.id || c._id)).map(c => (
                            <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-12 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Total Marks</label>
                        <input
                          type="number"
                          value={patternForm.totalMarks}
                          onChange={(e) => setPatternForm(prev => ({ ...prev, totalMarks: Number(e.target.value) }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Passing Marks</label>
                        <input
                          type="number"
                          value={patternForm.passingMarks}
                          onChange={(e) => setPatternForm(prev => ({ ...prev, passingMarks: Number(e.target.value) }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </Grid>

                    {/* Component subject adder */}
                    {patternForm.classRef && (
                      <div className="pt-3 border-t border-slate-200 space-y-3 bg-white p-3.5 rounded-xl border">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Add Subject Component</p>
                        <Grid cols={12} gap={3}>
                          <div className="col-span-12 sm:col-span-6">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Subject</label>
                            {(() => {
                              const classPatternSubjects = subjects.filter(s => {
                                const rawAssigned = s.assignedClasses || [];
                                const matchesClass = rawAssigned.some(c => String(c._id || c) === String(patternForm.classRef));
                                return matchesClass && selectedSubjects.includes(s._id);
                              });
                              return (
                                <select
                                  value={componentForm.subjectRef}
                                  onChange={(e) => setComponentForm(prev => ({ ...prev, subjectRef: e.target.value }))}
                                  disabled={classPatternSubjects.length === 0}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {classPatternSubjects.length === 0 ? (
                                    <option value="">No subjects available for this class</option>
                                  ) : (
                                    <>
                                      <option value="">Select Subject</option>
                                      {classPatternSubjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.subjectName}</option>
                                      ))}
                                    </>
                                  )}
                                </select>
                              );
                            })()}
                          </div>
                          <div className="col-span-12 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Marks</label>
                            <input
                              type="number"
                              value={componentForm.maxMarks}
                              onChange={(e) => setComponentForm(prev => ({ ...prev, maxMarks: Number(e.target.value) }))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Weightage %</label>
                            <input
                              type="number"
                              value={componentForm.weightage}
                              onChange={(e) => setComponentForm(prev => ({ ...prev, weightage: Number(e.target.value) }))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={handleAddComponent}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition"
                            >
                              Add
                            </button>
                          </div>
                        </Grid>

                        {/* List of components */}
                        {patternComponents.length > 0 && (
                          <div className="mt-2 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 p-2 space-y-1 max-h-32 overflow-y-auto">
                            {patternComponents.map((c, idx) => {
                              const subObj = subjects.find(s => s._id === c.subjectRef);
                              return (
                                <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-white border rounded">
                                  <span className="font-bold text-slate-800">{subObj?.subjectName || "Subject"}</span>
                                  <span className="text-slate-500 font-semibold">Max: {c.maxMarks} | Weightage: {c.weightage}%</span>
                                  <button onClick={() => handleRemoveComponent(idx)} className="text-rose-500 hover:text-rose-700 font-bold transition">Delete</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddPattern}
                        className="px-6 py-2 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl text-xs font-black uppercase transition"
                      >
                        Save Exam Pattern
                      </button>
                    </div>
                  </div>

                  {/* List of Patterns */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Patterns configured ({examPatterns.length})</p>
                    {examPatterns.length > 0 ? (
                      <div className="space-y-3">
                        {examPatterns.map((p, idx) => {
                          const clsObj = classes.find(c => (c.id || c._id) === p.classRef);
                          return (
                            <div key={idx} className="border border-slate-200 bg-white rounded-2xl p-4 flex justify-between items-center">
                              <div className="space-y-1">
                                <h5 className="text-sm font-black text-slate-800 uppercase tracking-wide">{p.name}</h5>
                                <p className="text-xs text-slate-500 font-semibold">Class: {clsObj?.name || "Class"} | Total Marks: {p.totalMarks} | Passing: {p.passingMarks}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{p.components?.length || 0} Subject components configured</p>
                              </div>
                              <button onClick={() => handleRemovePattern(idx)} className="text-rose-500 hover:text-rose-700 transition">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No exam patterns defined yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: GRADING & REVIEW */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Step 5: Grading Scales & Final Review</h4>
                  
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-4">
                    <p className="text-xs font-bold text-[#223F74] uppercase tracking-wider">Setup Grading Slabs</p>
                    <Grid cols={12} gap={3}>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Grading Metric</label>
                        <select
                          value={gradingSystem.type}
                          onChange={(e) => setGradingSystem(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                        >
                          <option value="percentage">Percentage (0 - 100%)</option>
                          <option value="cgpa">CGPA Scale (0 - 10.0)</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Default Passing Marks</label>
                        <input
                          type="number"
                          value={gradingSystem.passingMarks}
                          onChange={(e) => setGradingSystem(prev => ({ ...prev, passingMarks: Number(e.target.value) }))}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4 flex items-end">
                        <button
                          type="button"
                          onClick={prefillDefaultSlabs}
                          className="w-full py-2.5 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl text-xs font-bold uppercase transition shadow-sm"
                        >
                          Auto-fill Default Slabs
                        </button>
                      </div>
                    </Grid>

                    {/* Add Slab Form */}
                    <div className="pt-3 border-t border-slate-200 space-y-3 bg-white p-3.5 rounded-xl border">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Add Slab Range</p>
                      <Grid cols={12} gap={3}>
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Grade</label>
                          <input
                            type="text"
                            placeholder="A+"
                            value={slabForm.grade}
                            onChange={(e) => setSlabForm(prev => ({ ...prev, grade: e.target.value }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Min Limit</label>
                          <input
                            type="number"
                            value={slabForm.min}
                            onChange={(e) => setSlabForm(prev => ({ ...prev, min: Number(e.target.value) }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Limit</label>
                          <input
                            type="number"
                            value={slabForm.max}
                            onChange={(e) => setSlabForm(prev => ({ ...prev, max: Number(e.target.value) }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Points</label>
                          <input
                            type="number"
                            value={slabForm.gradePoint}
                            onChange={(e) => setSlabForm(prev => ({ ...prev, gradePoint: Number(e.target.value) }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-3">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Remarks</label>
                          <input
                            type="text"
                            placeholder="Excellent"
                            value={slabForm.remarks}
                            onChange={(e) => setSlabForm(prev => ({ ...prev, remarks: e.target.value }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={handleAddSlab}
                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition"
                          >
                            Add
                          </button>
                        </div>
                      </Grid>
                    </div>
                  </div>

                  {/* Slabs list */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grading Slabs ({gradingSystem.slabs.length})</p>
                    {gradingSystem.slabs.length > 0 ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                              <th className="px-4 py-2 text-left">Grade</th>
                              <th className="px-4 py-2 text-left">Range</th>
                              <th className="px-4 py-2 text-left">Grade Points</th>
                              <th className="px-4 py-2 text-left">Remarks</th>
                              <th className="px-4 py-2 text-center w-16">Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gradingSystem.slabs.map((slab, idx) => (
                              <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-bold text-slate-800">{slab.grade}</td>
                                <td className="px-4 py-2.5 font-semibold text-slate-500">{slab.min} - {slab.max}%</td>
                                <td className="px-4 py-2.5 font-bold text-[#223F74]">{slab.gradePoint}</td>
                                <td className="px-4 py-2.5 text-slate-500">{slab.remarks}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={() => handleRemoveSlab(idx)} className="text-rose-500 hover:text-rose-700 transition">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No grading slabs defined yet.</p>
                    )}
                  </div>

                  {/* Summary / Review */}
                  <div className="pt-4 border-t border-slate-100 space-y-3 bg-[#EEF2FB] p-4.5 rounded-[18px] border border-[#D8E0F0]">
                    <h5 className="text-xs font-black text-[#223F74] uppercase tracking-wider">Final Configuration Checklist</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-semibold">Academic Year</p>
                        <p className="font-bold text-slate-800">{academicYear}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Configured Classes</p>
                        <p className="font-bold text-slate-800">{selectedClasses.length} Classes</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Configured Subjects</p>
                        <p className="font-bold text-slate-800">{selectedSubjects.length} Subjects</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Holidays List</p>
                        <p className="font-bold text-slate-800">{holidays.length} Holidays</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Exam Patterns</p>
                        <p className="font-bold text-slate-800">{examPatterns.length} Patterns</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Grading Slabs</p>
                        <p className="font-bold text-slate-800">{gradingSystem.slabs.length} Slabs</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
              <div className="w-full sm:w-auto">
                {currentStep > 0 ? (
                  <Button
                    variant="secondary"
                    text="Back"
                    onClick={handlePrevStep}
                    icon={<ArrowLeft size={16} />}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    text="Cancel"
                    onClick={() => {
                      closeModal("school-config-wizard-modal");
                      setShowWizard(false);
                    }}
                  />
                )}
              </div>

              <div className="w-full sm:w-auto">
                {currentStep < steps.length - 1 ? (
                  <Button
                    variant="primary"
                    text="Save & Continue"
                    onClick={handleNextStep}
                    icon={<ArrowRight size={16} />}
                  />
                ) : (
                   <Button
                    variant="success"
                    text={saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Configuration"}
                    onClick={handleSaveConfig}
                    loading={saveStatus === "saving"}
                    disabled={saveStatus === "saved"}
                    icon={saveStatus === "saved" ? <CheckCircle size={16} /> : <Save size={16} />}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── READ ONLY: VIEW SCHOOL CONFIGURATION SUMMARY MODAL ──────────────── */}
      <Modal id="view-school-config-modal" title="Academic Configuration Summary" size="xl">
        {viewingConfig && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#EEF2FB] border border-[#D8E0F0] p-4.5 rounded-[18px]">
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Academic Year</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{viewingConfig.academicYear}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Start & End Dates</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {new Date(viewingConfig.startDate).toLocaleDateString()} – {new Date(viewingConfig.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Session Active Status</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 ${viewingConfig.isCurrent ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-200 text-slate-800 border border-slate-300"}`}>
                  {viewingConfig.isCurrent ? "Active Session" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Classes & Subjects */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Classes & Subjects</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mapped Classes ({viewingConfig.classes?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingConfig.classes?.map((c) => (
                      <span key={c._id || c} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {renderClassName(c)}
                      </span>
                    )) || <span className="text-xs text-slate-400">None</span>}
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mapped Subjects ({viewingConfig.subjects?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingConfig.subjects?.map((s) => (
                      <span key={s._id || s} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {renderSubjectName(s)}
                      </span>
                    )) || <span className="text-xs text-slate-400">None</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Holiday Calendar List */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Holidays List ({viewingConfig.holidays?.length || 0})</h5>
              {viewingConfig.holidays?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto">
                  {viewingConfig.holidays.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50/50">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{h.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${holidayTypes.find(t => t.value === h.type)?.color || "bg-slate-100 text-slate-600"}`}>
                        {h.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No holidays configured.</p>
              )}
            </div>

            {/* Exam Patterns */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Exam Patterns ({viewingConfig.examPatterns?.length || 0})</h5>
              {viewingConfig.examPatterns?.length > 0 ? (
                <div className="space-y-3">
                  {viewingConfig.examPatterns.map((p, idx) => {
                    const classId = p.classRef?._id || p.classRef;
                    const clsObj = classes.find(c => (c.id || c._id) === classId);
                    const className = clsObj?.name || p.classRef?.name || (typeof p.classRef === 'string' ? p.classRef : "Class");
                    return (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-white">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <h6 className="text-xs font-black text-slate-800 uppercase">{p.name}</h6>
                          <span className="text-[10px] text-slate-500 font-bold">Class: {className}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mb-2">Total Marks: {p.totalMarks} | Passing Marks: {p.passingMarks} | Weightage: {p.weightage}%</p>
                        {p.components?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {p.components.map((comp, ci) => {
                              const subObj = subjects.find(s => s._id === (comp.subjectRef?._id || comp.subjectRef));
                              const subName = subObj?.subjectName || comp.subjectRef?.subjectName || (typeof comp.subjectRef === 'string' ? comp.subjectRef : 'Subject');
                              return (
                                <span key={ci} className="px-2 py-0.5 bg-slate-50 border rounded text-[10px] font-semibold text-slate-600">
                                  {subName}: Max {comp.maxMarks} (wt. {comp.weightage}%)
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No exam patterns defined.</p>
              )}
            </div>

            {/* Grading System Slabs */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Grading System ({viewingConfig.gradingSystem?.type})</h5>
              <div className="border rounded-2xl overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b font-bold text-slate-500">
                      <th className="px-4 py-2 text-left">Grade</th>
                      <th className="px-4 py-2 text-left">Range</th>
                      <th className="px-4 py-2 text-left">Points</th>
                      <th className="px-4 py-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingConfig.gradingSystem?.slabs?.map((slab, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-bold text-slate-800">{slab.grade}</td>
                        <td className="px-4 py-2 text-slate-500 font-semibold">{slab.min} - {slab.max}%</td>
                        <td className="px-4 py-2 font-bold text-[#223F74]">{slab.gradePoint}</td>
                        <td className="px-4 py-2 text-slate-400">{slab.remarks}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-400">No slabs configured.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <div className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  text="Close"
                  onClick={() => closeModal("view-school-config-modal")}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── READ ONLY: VIEW ORGANIZATION CONFIGURATION TEMPLATE MODAL ──────── */}
      <Modal id="view-org-config-modal" title="Organization Template" size="xl" onClose={() => {}}>
        {orgConfig ? (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <h4 className="text-sm font-black text-[#223F74] uppercase tracking-wider border-b pb-2">Organization Academic Configuration</h4>
            <div className="flex gap-2.5 p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <p className="font-semibold">
                This is a read-only view of the Organization template configuration. School configurations are maintained independently.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#EEF2FB] border border-[#D8E0F0] p-4.5 rounded-[18px]">
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Template Academic Year</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{orgConfig.academicYear?.label || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Start & End Dates</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {orgConfig.academicYear?.startDate ? new Date(orgConfig.academicYear.startDate).toLocaleDateString() : "N/A"} – {orgConfig.academicYear?.endDate ? new Date(orgConfig.academicYear.endDate).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#223F74] uppercase tracking-wider">Template Status</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 ${orgConfig.academicYear?.isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-200 text-slate-800 border border-slate-300"}`}>
                  {orgConfig.academicYear?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Classes & Subjects */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Classes & Subjects Template</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Classes ({orgConfig.classes?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {orgConfig.classes?.map((c) => (
                      <span key={c._id || c} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {renderClassName(c)}
                      </span>
                    )) || <span className="text-xs text-slate-400">None</span>}
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Subjects ({orgConfig.subjects?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {orgConfig.subjects?.map((s) => (
                      <span key={s._id || s} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {renderSubjectName(s)}
                      </span>
                    )) || <span className="text-xs text-slate-400">None</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Holidays */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Template Holidays ({orgConfig.holidays?.length || 0})</h5>
              {orgConfig.holidays?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto">
                  {orgConfig.holidays.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50/50">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{h.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{h.date ? new Date(h.date).toLocaleDateString() : ""}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${holidayTypes.find(t => t.value === h.type)?.color || "bg-slate-100 text-slate-600"}`}>
                        {h.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No holidays configured.</p>
              )}
            </div>

            {/* Exam Pattern */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">Template Exam Patterns ({orgConfig.examPattern?.length || 0})</h5>
              {orgConfig.examPattern?.length > 0 ? (
                <div className="space-y-3">
                  {orgConfig.examPattern.map((p, idx) => {
                    const classId = p.classRef?._id || p.classRef;
                    const clsObj = classes.find(c => (c.id || c._id) === classId);
                    const className = clsObj?.name || p.classRef?.name || (typeof p.classRef === 'string' ? p.classRef : "Class");
                    return (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-white">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <h6 className="text-xs font-black text-slate-800 uppercase">{p.name}</h6>
                          <span className="text-[10px] text-slate-500 font-bold">Class: {className}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mb-2">Total Marks: {p.totalMarks} | Passing Marks: {p.passingMarks} | Weightage: {p.weightage}%</p>
                        {p.components?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {p.components.map((comp, ci) => {
                              const subObj = subjects.find(s => s._id === (comp.subjectRef?._id || comp.subjectRef));
                              const subName = subObj?.subjectName || comp.subjectRef?.subjectName || (typeof comp.subjectRef === 'string' ? comp.subjectRef : 'Subject');
                              return (
                                <span key={ci} className="px-2 py-0.5 bg-slate-50 border rounded text-[10px] font-semibold text-slate-600">
                                  {subName}: Max {comp.maxMarks} (wt. {comp.weightage}%)
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No exam patterns defined.</p>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <div className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  text="Close"
                  onClick={() => closeModal("view-org-config-modal")}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 font-semibold">
            No Organization configuration exists as a template template.
            <div className="flex justify-center mt-6">
              <Button
                variant="secondary"
                text="Close"
                onClick={() => closeModal("view-org-config-modal")}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}