import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  BookOpen,
  Users,
  Award,
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Layers,
  FileText,
  Gift,
  ArrowRight,
  ArrowLeft,
  Save,
  CalendarDays,
  Percent,
  AlertCircle,
  Eye,
  ToggleLeft,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import {
  getAcademicConfig,
  updateAcademicYear,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  addExamPattern,
  updateExamPattern,
  deleteExamPattern,
  updateGradingSystem,
  assignClasses,
  assignSubjects,
} from "../../../services/api/academicConfigApi";
import {
  getOrganizationClasses,
  getOrganizationSubjects,
} from "../../../services/api/organizationApi";
import {
  DashGrid,
  DashCard,
  ToggleButton,
  Heading,
  DataTable,
  Modal,
  openModal,
  closeModal,
  Button,
  Grid,
  DataField,
  Select,
  Option,
} from "../../../components/shared/Common_Components";

const steps = [
  { id: "academic-year", name: "Academic Year", icon: Calendar },
  { id: "classes-subjects", name: "Classes & Subjects", icon: Layers },
  { id: "holidays", name: "Holidays", icon: Gift },
  { id: "exam-patterns", name: "Exam Patterns", icon: FileText },
  { id: "grading", name: "Grading System", icon: Award },
];

const holidayTypes = [
  {
    value: "holiday",
    label: "Holiday",
    color: "bg-rose-50 text-rose-600 border-rose-200",
  },
  {
    value: "event",
    label: "Event",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    value: "ptm",
    label: "PTM",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "vacation",
    label: "Vacation",
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    value: "exam",
    label: "Exam",
    color: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    value: "other",
    label: "Other",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
];

const OrganizationConfig = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState({ text: "", type: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [organizationId, setOrganizationId] = useState("");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Config wizard modal state
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [viewingConfig, setViewingConfig] = useState(null);

  // Modal states for Lists
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showExamPatternModal, setShowExamPatternModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingExamPattern, setEditingExamPattern] = useState(null);
  const [modalError, setModalError] = useState("");

  // Form states
  const [academicYearForm, setAcademicYearForm] = useState({
    label: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const [holidayForm, setHolidayForm] = useState({
    title: "",
    date: "",
    type: "holiday",
    isGlobal: true,
    applicableBranches: [],
  });

  const [examPatternForm, setExamPatternForm] = useState({
    name: "",
    classRef: "",
    totalMarks: 0,
    passingMarks: 0,
    weightage: 0,
    components: [],
    resultApprovalRequired: true,
  });

  const [componentForm, setComponentForm] = useState({
    subjectRef: "",
    subjectName: "",
    maxMarks: "",
    weightage: "",
  });

  const [gradingForm, setGradingForm] = useState({
    type: "percentage",
    passingMarks: 33,
    slabs: [],
  });

  // Get organization ID & Initial Data
  useEffect(() => {
    const orgId =
      localStorage.getItem("organizationMongoId") ||
      localStorage.getItem("organizationId");
    if (orgId) {
      setOrganizationId(orgId);
    } else {
      toast.error("Organization not found. Please login again.");
    }
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchConfig();
      fetchClasses();
      fetchSubjects();
    }
  }, [organizationId]);

  useEffect(() => {
    document.body.style.overflow = (showConfigWizard || showHolidayModal || showExamPatternModal) ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showConfigWizard, showHolidayModal, showExamPatternModal]);

  useEffect(() => {
    if (academicYearForm.startDate && academicYearForm.endDate) {
      const startYear = new Date(academicYearForm.startDate).getFullYear();
      const endYear = new Date(academicYearForm.endDate).getFullYear();
      if (!isNaN(startYear) && !isNaN(endYear)) {
        const label = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
        if (academicYearForm.label !== label) {
          setAcademicYearForm(prev => ({ ...prev, label }));
        }
      }
    }
  }, [academicYearForm.startDate, academicYearForm.endDate]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await getAcademicConfig(organizationId);
      if (response.success) {
        setConfig(response.data);
        setAcademicYearForm({
          label: response.data.academicYear?.label || "",
          startDate: response.data.academicYear?.startDate?.split("T")[0] || "",
          endDate: response.data.academicYear?.endDate?.split("T")[0] || "",
          isActive: response.data.academicYear?.isActive !== false,
        });

        const fetchedSlabs = response.data.gradingSystem?.slabs || [];
        const slabsWithIds = fetchedSlabs.map((slab) => ({
          ...slab,
          id: slab._id || Date.now() + Math.random(),
        }));

        setGradingForm(
          response.data.gradingSystem
            ? { ...response.data.gradingSystem, slabs: slabsWithIds }
            : { type: "percentage", passingMarks: 33, slabs: [] },
        );
        setSelectedClasses(response.data.classes?.map((c) => c._id) || []);
        setSelectedSubjects(response.data.subjects?.map((s) => s._id) || []);
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch academic config");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await getOrganizationClasses(organizationId);
      if (response.success) setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await getOrganizationSubjects(organizationId);
      if (response.success) {
        const fetchedSubjects = Array.isArray(response.data)
          ? response.data
          : response.data?.subjects || response.data?.data || [];
        setSubjects(fetchedSubjects);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  // ─── UTILITY: CALCULATE MISSING SUBJECTS ────────────────────────────
  const getMissingSubjectsForPattern = (pattern) => {
    const classId = pattern.classRef?._id || pattern.classRef;
    if (!classId || classId === "global") return [];

    const expectedSubjects = subjects.filter(
      (s) =>
        (s.classRef?._id === classId || s.classRef === classId) &&
        selectedSubjects.includes(s._id),
    );

    const includedSubjectIds =
      pattern.components?.map((c) => c.subjectRef?._id || c.subjectRef) || [];

    return expectedSubjects.filter((s) => !includedSubjectIds.includes(s._id));
  };

  // ─── STEP 1: HIERARCHICAL SELECTION HANDLERS ─────────────────────────
  const handleClassToggle = (classId, isChecked) => {
    if (isChecked) {
      setSelectedClasses((prev) => [...prev, classId]);
      const classSubjects = subjects
        .filter((s) => s.classRef?._id === classId)
        .map((s) => s._id);
      setSelectedSubjects((prev) =>
        Array.from(new Set([...prev, ...classSubjects])),
      );
    } else {
      setSelectedClasses((prev) => prev.filter((id) => id !== classId));
      const classSubjects = subjects
        .filter((s) => s.classRef?._id === classId)
        .map((s) => s._id);
      setSelectedSubjects((prev) =>
        prev.filter((id) => !classSubjects.includes(id)),
      );
    }
  };

  const handleSubjectToggle = (subjectId, isChecked) => {
    if (isChecked) {
      setSelectedSubjects((prev) => [...prev, subjectId]);
    } else {
      setSelectedSubjects((prev) => prev.filter((id) => id !== subjectId));
    }
  };

  // ─── STEPPER SMART ACTIONS ──────────────────────────────────────────
  const handleNextStep = async () => {
    setIsProcessing(true);
    setStepMessage({ text: "", type: "" });
    try {
      if (currentStep === 0) {
        if (
          !academicYearForm.label ||
          !academicYearForm.startDate ||
          !academicYearForm.endDate
        ) {
          setStepMessage({ text: "Please fill all required academic year fields", type: "error" });
          setIsProcessing(false);
          return;
        }
        if (new Date(academicYearForm.startDate) > new Date(academicYearForm.endDate)) {
          setStepMessage({ text: "Please enter a valid Date range", type: "error" });
          setIsProcessing(false);
          return;
        }
        const res = await updateAcademicYear(config._id, academicYearForm);
        if (res.success) {
          setConfig(res.data);
          setStepMessage({ text: "Academic year saved", type: "success" });
          setCurrentStep(1);
        }
      } else if (currentStep === 1) {
        if (selectedClasses.length === 0) {
          setStepMessage({ text: "Please select at least one active class to proceed.", type: "error" });
          setIsProcessing(false);
          return;
        }
        if (selectedSubjects.length === 0) {
          setStepMessage({ text: "Please select at least one active subject to proceed.", type: "error" });
          setIsProcessing(false);
          return;
        }
        const resClasses = await assignClasses(config._id, selectedClasses);
        const resSubjects = await assignSubjects(config._id, selectedSubjects);
        if (resClasses.success && resSubjects.success) {
          setConfig(resSubjects.data);
          setStepMessage({ text: "Curriculum assignments saved", type: "success" });
          setCurrentStep(2);
        }
      } else if (currentStep === 2) {
        setCurrentStep(3);
      } else if (currentStep === 3) {
        if (!config?.examPattern || config.examPattern.length === 0) {
          setStepMessage({ text: "Please create at least one exam pattern to proceed.", type: "error" });
          setIsProcessing(false);
          return;
        }
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Validation Engine
        if (gradingForm.slabs.length > 0) {
          for (let slab of gradingForm.slabs) {
            if (slab.grade === "" || slab.min === "" || slab.max === "") {
              setStepMessage({ text: "Please fill in all Grade, Min, and Max fields.", type: "error" });
              setIsProcessing(false);
              return;
            }
            if (Number(slab.min) > Number(slab.max)) {
              setStepMessage({ text: `Invalid Math: Min cannot be greater than Max for grade '${slab.grade}'.`, type: "error" });
              setIsProcessing(false);
              return;
            }
          }

          const validationSlabs = [...gradingForm.slabs].sort(
            (a, b) => Number(a.min) - Number(b.min),
          );

          if (Number(validationSlabs[0].min) !== 0) {
            setStepMessage({ text: "Grading gap detected: The lowest grade slab must start exactly at 0.", type: "error" });
            setIsProcessing(false);
            return;
          }

          const expectedMax =
            String(gradingForm.type).toLowerCase() === "cgpa" ? 10 : 100;
          if (
            Number(validationSlabs[validationSlabs.length - 1].max) !==
            expectedMax
          ) {
            setStepMessage({ text: `Grading gap detected: The highest grade slab must end exactly at ${expectedMax}.`, type: "error" });
            setIsProcessing(false);
            return;
          }

          for (let i = 0; i < validationSlabs.length - 1; i++) {
            const currentMax = Number(validationSlabs[i].max);
            const nextMin = Number(validationSlabs[i + 1].min);
            if (currentMax >= nextMin) {
              setStepMessage({ text: `Overlap detected between grade '${validationSlabs[i].grade}' and '${validationSlabs[i + 1].grade}'.`, type: "error" });
              setIsProcessing(false);
              return;
            }
            if (nextMin - currentMax > 1) {
              setStepMessage({ text: `Gap detected between ${currentMax} and ${nextMin}. Scale must be continuous without missing numbers.`, type: "error" });
              setIsProcessing(false);
              return;
            }
          }
        }

        const finalSortedSlabs = [...gradingForm.slabs].sort((a, b) => {
          const minA = a.min === "" ? -Infinity : Number(a.min);
          const minB = b.min === "" ? -Infinity : Number(b.min);
          return minB - minA;
        });

        const payloadToSave = {
          ...gradingForm,
          slabs: finalSortedSlabs.map(({ id, ...rest }) => rest),
        };

        const res = await updateGradingSystem(config._id, payloadToSave);
        if (res.success) {
          setConfig(res.data);
          setStepMessage({ text: "Configuration Completed Successfully! 🎉", type: "success" });
        }
      }
    } catch (error) {
      setStepMessage({ text: error.message || "Failed to save configuration", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrevStep = () => {
    setStepMessage({ text: "", type: "" });
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // ─── SUB-HANDLERS (Lists & Modals) ──────────────────────────────────
  const resetHolidayForm = () => {
    setHolidayForm({
      title: "",
      date: "",
      type: "holiday",
      isGlobal: true,
      applicableBranches: [],
    });
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.title || !holidayForm.date)
      return toast.error("Fill required fields");
    try {
      const res = await addHoliday(config._id, holidayForm);
      if (res.success) {
        setConfig(res.data);
        toast.success("Holiday added");
        setShowHolidayModal(false);
        resetHolidayForm();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!holidayForm.title || !holidayForm.date)
      return toast.error("Fill required fields");
    try {
      const res = await updateHoliday(
        config._id,
        editingHoliday._id,
        holidayForm,
      );
      if (res.success) {
        setConfig(res.data);
        toast.success("Holiday updated");
        setShowHolidayModal(false);
        setEditingHoliday(null);
        resetHolidayForm();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (window.confirm("Delete this holiday?")) {
      try {
        const res = await deleteHoliday(config._id, id);
        if (res.success) {
          setConfig(res.data);
          toast.success("Holiday deleted");
        }
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const resetExamPatternForm = () => {
    setModalError("");
    setExamPatternForm({
      name: "",
      classRef: "",
      totalMarks: 0,
      passingMarks: 0,
      weightage: 0,
      components: [],
      resultApprovalRequired: true,
    });
  };

  const handleAddExamPattern = async () => {
    setModalError("");
    if (
      !examPatternForm.name ||
      !examPatternForm.classRef ||
      !examPatternForm.totalMarks ||
      examPatternForm.totalMarks === 0 ||
      !examPatternForm.passingMarks ||
      examPatternForm.passingMarks === 0
    )
      return setModalError(
        "Please fill in all required fields including the specific Class",
      );

    try {
      const payload = {
        ...examPatternForm,
        classRef: examPatternForm.classRef,
        components: examPatternForm.components.map((c) => ({
          subjectRef: c.subjectRef,
          maxMarks: c.maxMarks,
          weightage: c.weightage,
        })),
      };

      const res = await addExamPattern(config._id, payload);
      if (res.success) {
        setConfig(res.data);
        toast.success("Pattern added");
        setShowExamPatternModal(false);
        resetExamPatternForm();
      }
    } catch (err) {
      setModalError(err.message || "Failed to add pattern");
    }
  };

  const handleUpdateExamPattern = async () => {
    setModalError("");
    if (
      !examPatternForm.name ||
      !examPatternForm.classRef ||
      !examPatternForm.totalMarks ||
      examPatternForm.totalMarks === 0 ||
      !examPatternForm.passingMarks ||
      examPatternForm.passingMarks === 0
    )
      return setModalError(
        "Please fill in all required fields including the specific Class",
      );

    try {
      const payload = {
        ...examPatternForm,
        classRef: examPatternForm.classRef,
        components: examPatternForm.components.map((c) => ({
          subjectRef: c.subjectRef,
          maxMarks: c.maxMarks,
          weightage: c.weightage,
        })),
      };

      const res = await updateExamPattern(
        config._id,
        editingExamPattern._id,
        payload,
      );
      if (res.success) {
        setConfig(res.data);
        toast.success("Pattern updated");
        setShowExamPatternModal(false);
        setEditingExamPattern(null);
        resetExamPatternForm();
      }
    } catch (err) {
      setModalError(err.message || "Failed to update pattern");
    }
  };

  const handleDeleteExamPattern = async (id) => {
    if (window.confirm("Delete this exam pattern?")) {
      try {
        const res = await deleteExamPattern(config._id, id);
        if (res.success) {
          setConfig(res.data);
          toast.success("Pattern deleted");
        }
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleAddComponent = () => {
    setModalError("");
    if (
      !componentForm.subjectRef ||
      !componentForm.maxMarks ||
      !componentForm.weightage
    ) {
      return setModalError("Fill component fields");
    }
    if (
      examPatternForm.components.some(
        (c) =>
          c.subjectRef === componentForm.subjectRef ||
          c.subjectRef?._id === componentForm.subjectRef,
      )
    ) {
      return setModalError("This subject is already added to the pattern.");
    }
    const newComponents = [...examPatternForm.components, { ...componentForm }];
    const newTotalMarks = newComponents.reduce(
      (sum, comp) => sum + Number(comp.maxMarks || 0),
      0,
    );
    setExamPatternForm({
      ...examPatternForm,
      components: newComponents,
      totalMarks: newTotalMarks,
    });
    setComponentForm({
      subjectRef: "",
      subjectName: "",
      maxMarks: "",
      weightage: "",
    });
  };

  // ─── GRADING SMART SORT ───────────────────────────────────────────
  const handleAddGradeSlab = () => {
    setGradingForm({
      ...gradingForm,
      slabs: [
        {
          id: Date.now() + Math.random(),
          grade: "",
          min: "",
          max: "",
          gradePoint: "",
        },
        ...gradingForm.slabs,
      ],
    });
  };

  const handleSortSlabs = () => {
    setGradingForm((prev) => {
      if (!prev.slabs || prev.slabs.length <= 1) return prev;

      const sorted = [...prev.slabs].sort((a, b) => {
        const minA = a.min === "" ? -Infinity : Number(a.min);
        const minB = b.min === "" ? -Infinity : Number(b.min);
        if (minA !== minB) return minB - minA;

        const maxA = a.max === "" ? -Infinity : Number(a.max);
        const maxB = b.max === "" ? -Infinity : Number(b.max);
        if (maxA !== maxB) return maxB - maxA;

        const gradeRank = {
          "A+": 1,
          A: 2,
          "A-": 3,
          "B+": 4,
          B: 5,
          "B-": 6,
          "C+": 7,
          C: 8,
          "C-": 9,
          "D+": 10,
          D: 11,
          E: 12,
          F: 13,
        };
        const rankA = gradeRank[(a.grade || "").toUpperCase()] || 99;
        const rankB = gradeRank[(b.grade || "").toUpperCase()] || 99;
        return rankA - rankB;
      });

      const isAlreadySorted = prev.slabs.every(
        (slab, idx) => slab.id === sorted[idx].id,
      );
      if (isAlreadySorted) return prev;

      return { ...prev, slabs: sorted };
    });
  };

  // Input styling standard
  const inputStyle =
    "w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 placeholder:text-slate-400";
  const labelStyle =
    "text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none mb-1.5 block";

  // ─── SELECT ALL SUBJECTS TOGGLE ─────────────────────────────────────
  const handleSelectAllSubjects = (classId, selectAll) => {
    const classSubjects = subjects
      .filter((s) => s.classRef?._id === classId)
      .map((s) => s._id);
    if (selectAll) {
      setSelectedSubjects((prev) =>
        Array.from(new Set([...prev, ...classSubjects])),
      );
    } else {
      setSelectedSubjects((prev) =>
        prev.filter((id) => !classSubjects.includes(id)),
      );
    }
  };

  // ─── DATATABLE CONFIG ───────────────────────────────────────────────
  const configTableColumns = [
    { key: "label", label: "Academic Year" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "classCount", label: "Classes" },
    { key: "subjectCount", label: "Subjects" },
    { key: "status", label: "Status" },
  ];

  const configTableRows = config
    ? [
      {
        _id: config._id,
        label: config.academicYear?.label || "N/A",
        startDate: config.academicYear?.startDate
          ? new Date(config.academicYear.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
          : "—",
        endDate: config.academicYear?.endDate
          ? new Date(config.academicYear.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
          : "—",
        classCount: String(config.classes?.length || 0),
        subjectCount: String(config.subjects?.length || 0),
        status: config.academicYear?.isActive ? "Active" : "Inactive",
        _raw: config,
      },
    ]
    : [];

  const configTableActions = [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => {
        setViewingConfig(row._raw);
        setTimeout(() => openModal("view-config-modal"), 50);
      },
    },
    {
      icon: <Edit2 size={16} />,
      tooltip: "Edit Configuration",
      variant: "ghost",
      onClick: () => {
        setShowConfigWizard(true);
        setCurrentStep(0);
      },
    },
  ];

  if (loading) {
    return (

      <div className="space-y-6">
        <Grid cols={12} gap={4}>
          <Heading
            primaryText="Academic"
            secondaryText="Configuration"
            size={12}
            fontSize="2xl"
          />
        </Grid>

        <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#223F74]"></div>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Create Config button */}
      <div className="flex flex-col gap-4">
        <Heading
          primaryText="Academic"
          secondaryText="Configuration"
          showAnimations={true}
        />
        <div className="flex justify-end">
          <div className="w-48">
            <Button
              text="Create Config"
              icon={<Plus size={16} />}
              onClick={() => {
                setShowConfigWizard(true);
                setCurrentStep(0);
              }}
              size={12}
            />
          </div>
        </div>
      </div>

      {/* Overview Summary Cards */}
      <DashGrid cols={12} gap={4}>
        <DashCard
          title="Academic Year"
          value={config?.academicYear?.label || "Not Set"}
          icon={<Calendar size={22} />}
          accentColor="#223F74"
          size={4}
        />
        <DashCard
          title="Classes Configured"
          value={String(config?.classes?.length || 0)}
          icon={<Layers size={22} />}
          accentColor="#F59B87"
          size={4}
        />
        <DashCard
          title="Subjects Configured"
          value={String(config?.subjects?.length || 0)}
          icon={<BookOpen size={22} />}
          accentColor="#5B9A6A"
          size={4}
        />
        <DashCard
          title="Holidays Defined"
          value={String(config?.holidays?.length || 0)}
          icon={<Gift size={22} />}
          accentColor="#E0A04B"
          size={4}
        />
        <DashCard
          title="Exam Patterns"
          value={String(config?.examPattern?.length || 0)}
          icon={<FileText size={22} />}
          accentColor="#7A8FC6"
          size={4}
        />
        <DashCard
          title="Grading Scales"
          value={String(config?.gradingSystem?.slabs?.length || 0)}
          icon={<Award size={22} />}
          accentColor="#8b5cf6"
          size={4}
        />
      </DashGrid>

      {/* Academic Configs DataTable */}
      <DataTable
        title="Academic Configurations"
        columns={configTableColumns}
        rows={configTableRows}
        actions={configTableActions}
        searchable={true}
        pageSize={5}
      />



      {/* ═══════ VIEW CONFIG DETAILS MODAL ═══════ */}
      {viewingConfig && (
        <Modal id="view-config-modal" title="Configuration Details" size="xl">
          <div className="space-y-6">
            {/* Academic Year */}
            <div className="bg-[#F8F9FA]/60 p-5 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-bold text-[#223F74] mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-[#F59B87]" /> Academic Year
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Label</span>
                  <span className="text-sm font-semibold text-slate-800">{viewingConfig.academicYear?.label || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {viewingConfig.academicYear?.startDate ? new Date(viewingConfig.academicYear.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {viewingConfig.academicYear?.endDate ? new Date(viewingConfig.academicYear.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Classes & Subjects */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8F9FA]/60 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-bold text-[#223F74] mb-2 flex items-center gap-2">
                  <Layers size={16} className="text-[#F59B87]" /> Classes ({viewingConfig.classes?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {viewingConfig.classes && viewingConfig.classes.length > 0 ? (
                    viewingConfig.classes.map((cls) => (
                      <span key={cls._id} className="px-3 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg">
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">None</span>
                  )}
                </div>
              </div>
              <div className="bg-[#F8F9FA]/60 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-bold text-[#223F74] mb-2 flex items-center gap-2">
                  <BookOpen size={16} className="text-[#5B9A6A]" /> Subjects ({viewingConfig.subjects?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {viewingConfig.subjects && viewingConfig.subjects.length > 0 ? (
                    viewingConfig.subjects.map((sub) => (
                      <span key={sub._id} className="px-3 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg">
                        {sub.name || sub.subjectName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Holidays & Exams counts */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#F8F9FA]/60 p-4 rounded-2xl border border-slate-100 text-center">
                <Gift size={20} className="mx-auto text-[#E0A04B] mb-2" />
                <span className="text-xl font-bold text-[#223F74] block">{viewingConfig.holidays?.length || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Holidays</span>
              </div>
              <div className="bg-[#F8F9FA]/60 p-4 rounded-2xl border border-slate-100 text-center">
                <FileText size={20} className="mx-auto text-[#7A8FC6] mb-2" />
                <span className="text-xl font-bold text-[#223F74] block">{viewingConfig.examPattern?.length || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exam Patterns</span>
              </div>
              <div className="bg-[#F8F9FA]/60 p-4 rounded-2xl border border-slate-100 text-center">
                <Award size={20} className="mx-auto text-[#8b5cf6] mb-2" />
                <span className="text-xl font-bold text-[#223F74] block">{viewingConfig.gradingSystem?.slabs?.length || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade Slabs</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { closeModal("view-config-modal"); setViewingConfig(null); }}
                className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-sm transition hover:-translate-y-0.5 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════ CONFIG WIZARD MODAL ═══════ */}
      {createPortal(
      <AnimatePresence>
        {showConfigWizard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 pointer-events-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowConfigWizard(false)}
            />

            {/* Wizard Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-6xl bg-white rounded-3xl flex flex-col max-h-[92vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#223F74] border-b border-[#223F74] rounded-t-3xl shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings size={20} /> Create Configuration
                </h3>
                <button
                  onClick={() => setShowConfigWizard(false)}
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>


              {/* Step Indicator */}
              <div className="px-6 py-5 bg-white border-b border-[#E2E8F0]">
                <div className="flex items-center justify-between max-w-4xl mx-auto relative">
                  {/* Background progress line */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#E2E8F0] -z-0" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#F59B87] transition-all duration-500 -z-0"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  />

                  {steps.map((step, index) => {
                    const isActive = currentStep === index;
                    const isCompleted = currentStep > index;
                    const isExamStep = step.id === "exam-patterns";
                    const showWarning = false; // isExamStep && hasAnyExamPatternWarning;

                    let iconBg = isActive
                      ? "bg-[#223F74] text-white shadow-lg shadow-[#223F74]/20 scale-110 ring-4 ring-[#223F74]/15"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100/50 cursor-pointer"
                        : "bg-white border-2 border-slate-200 text-slate-400 cursor-not-allowed";

                    let textColor = isActive
                      ? "text-[#223F74] font-bold"
                      : isCompleted
                        ? "text-emerald-700 font-bold"
                        : "text-slate-400 font-semibold";

                    if (showWarning) {
                      iconBg = isActive
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110 ring-4 ring-amber-50"
                        : isCompleted
                          ? "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse cursor-pointer hover:bg-amber-100/50"
                          : "bg-white border-2 border-slate-200 text-slate-400 cursor-not-allowed";
                      textColor = isActive ? "text-amber-900 font-bold" : "text-amber-600 font-bold";
                    }

                    return (
                      <div
                        key={step.id}
                        className="flex flex-col items-center gap-2.5 w-full relative z-10"
                        onClick={() => {
                          if (index < currentStep) {
                            setCurrentStep(index);
                          }
                        }}
                      >
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${iconBg}`}
                        >
                          {isCompleted && !showWarning ? (
                            <CheckCircle size={20} strokeWidth={2.5} />
                          ) : showWarning && !isActive ? (
                            <AlertCircle size={20} strokeWidth={2.5} />
                          ) : (
                            <step.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                          )}
                        </div>
                        <span
                          className={`hidden sm:block text-xs tracking-wide transition-colors duration-300 ${textColor}`}
                        >
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-4xl mx-auto"
                  >
                    {/* ── STEP 0: ACADEMIC YEAR ── */}
                    {currentStep === 0 && (
                      <div>
                        <div className="mb-8 flex items-center gap-3">
                          <Calendar className="text-[#F59B87] w-6 h-6" />
                          <div>
                            <h2 className="text-xl font-bold text-[#223F74]">
                              Academic Year Schedule
                            </h2>
                            <p className="text-xs text-[#6B7280] mt-1 font-medium">
                              Define the start and end dates for the current operating year.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <DataField
                              label="Year Label"
                              id="academic-year-label"
                              type="text"
                              value={academicYearForm.label}
                              onChange={(e) =>
                                setAcademicYearForm({
                                  ...academicYearForm,
                                  label: e.target.value,
                                })
                              }
                              placeholder="e.g., 2024-2025"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <DataField
                                label="Start Date"
                                id="academic-year-start"
                                type="date"
                                value={academicYearForm.startDate}
                                onChange={(e) =>
                                  setAcademicYearForm({
                                    ...academicYearForm,
                                    startDate: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <DataField
                                label="End Date"
                                id="academic-year-end"
                                type="date"
                                value={academicYearForm.endDate}
                                onChange={(e) =>
                                  setAcademicYearForm({
                                    ...academicYearForm,
                                    endDate: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-5 border border-[#E7E2DB] bg-[#F8F9FA]/80 rounded-2xl mt-6">
                            <div>
                              <span className="block font-bold text-[#223F74] text-sm">
                                Set as Current Operating Year
                              </span>
                              <span className="block text-xs text-[#6B7280] mt-1 font-medium">
                                Make this the default active year across the platform.
                              </span>
                            </div>
                            <ToggleButton
                              checked={academicYearForm.isActive}
                              onChange={(val) =>
                                setAcademicYearForm({
                                  ...academicYearForm,
                                  isActive: val,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 1: CLASSES & SUBJECTS ── */}
                    {currentStep === 1 && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                          <div className="flex items-center gap-3">
                            <Layers className="text-[#F59B87] w-6 h-6" />
                            <div>
                              <h2 className="text-xl font-bold text-[#223F74]">
                                Class & Subject Mapping
                              </h2>
                              <p className="text-xs text-[#6B7280] mt-1 font-medium">
                                Select the classes operating this year and their corresponding subjects.
                              </p>
                            </div>
                          </div>
                          {classes.length > 0 && (
                            <ToggleButton
                              label="Select All Classes"
                              checked={selectedClasses.length === classes.length}
                              onChange={(val) => {
                                if (!val) {
                                  setSelectedClasses([]);
                                  setSelectedSubjects([]);
                                } else {
                                  setSelectedClasses(classes.map((c) => c._id));
                                }
                              }}
                            />
                          )}
                        </div>

                        {selectedClasses.length === 0 && classes.length > 0 && (
                          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
                            <AlertCircle size={16} className="text-rose-500 shrink-0" />
                            <span className="text-sm font-semibold text-rose-600">Please select at least one class to proceed.</span>
                          </div>
                        )}
                        {selectedClasses.length > 0 && selectedSubjects.length === 0 && (
                          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                            <AlertCircle size={16} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold text-amber-600">Please select at least one subject to proceed.</span>
                          </div>
                        )}

                        {classes.length === 0 ? (
                          <div className="text-center py-16 bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                              <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                              No Classes Found
                            </h3>
                            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                              You must create at least one class and map subjects to it before configuring the curriculum.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <button
                                onClick={() =>
                                  navigate("/superadmin/academic/classes")
                                }
                                className="px-5 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
                              >
                                Manage Classes
                              </button>
                              <button
                                onClick={() =>
                                  navigate("/superadmin/academic/subjects")
                                }
                                className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] font-bold text-sm rounded-2xl transition hover:-translate-y-0.5 active:scale-95"
                              >
                                Manage Subjects
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {classes.map((cls) => {
                              const isClassSelected = selectedClasses.includes(
                                cls._id,
                              );
                              const classSubjects = subjects.filter(
                                (s) => s.classRef?._id === cls._id,
                              );

                              return (
                                <div
                                  key={cls._id}
                                  className={`border rounded-2xl p-5 transition-all duration-200 ${isClassSelected ? "bg-[#F8EEE9]/20 border-[#F59B87] shadow-sm" : "bg-white border-[#E7E2DB] hover:border-[#F59B87]/50"}`}
                                >
                                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                                    <input
                                      type="checkbox"
                                      checked={isClassSelected}
                                      onChange={(e) =>
                                        handleClassToggle(cls._id, e.target.checked)
                                      }
                                      className="w-5 h-5 text-[#223F74] rounded border-slate-300 focus:ring-[#223F74] cursor-pointer"
                                    />
                                    <span
                                      className={`font-bold text-lg ${isClassSelected ? "text-[#223F74]" : "text-slate-800"}`}
                                    >
                                      {cls.name}
                                    </span>
                                  </label>

                                  {isClassSelected && classSubjects.length > 0 && (
                                    <div className="flex items-center gap-2 mb-3 pl-8">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allSelected = classSubjects.every((s) => selectedSubjects.includes(s._id));
                                          handleSelectAllSubjects(cls._id, !allSelected);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${classSubjects.every((s) => selectedSubjects.includes(s._id))
                                          ? "bg-[#223F74]/10 border-[#223F74]/20 text-[#223F74]"
                                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                          }`}
                                      >
                                        <ToggleLeft size={14} />
                                        {classSubjects.every((s) => selectedSubjects.includes(s._id)) ? "Deselect All Subjects" : "Select All Subjects"}
                                      </button>
                                    </div>
                                  )}

                                  {classSubjects.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pl-8">
                                      {classSubjects.map((sub) => {
                                        const isSubjectSelected =
                                          selectedSubjects.includes(sub._id);
                                        return (
                                          <label
                                            key={sub._id}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all
                                      ${!isClassSelected
                                                ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 grayscale"
                                                : isSubjectSelected
                                                  ? "bg-[#223F74]/5 border-[#223F74]/20 text-[#223F74] font-semibold cursor-pointer"
                                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              disabled={!isClassSelected}
                                              checked={isSubjectSelected}
                                              onChange={(e) =>
                                                handleSubjectToggle(
                                                  sub._id,
                                                  e.target.checked,
                                                )
                                              }
                                              className="w-4 h-4 text-[#223F74] rounded border-slate-300 focus:ring-[#223F74]"
                                            />
                                            <span>{sub.name || sub.subjectName}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="pl-8">
                                      <span className="text-xs text-slate-400 italic">
                                        No subjects mapped yet.
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <div className="border-2 border-dashed border-[#E7E2DB] rounded-2xl p-6 bg-[#F8F9FA]/40 flex flex-col items-center justify-center min-h-[160px] gap-4 transition-all hover:bg-[#F8F9FA]/80">
                              <p className="text-sm font-bold text-slate-500 mb-1">
                                Need to add more?
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                  onClick={() =>
                                    navigate("/superadmin/academic/classes")
                                  }
                                  className="px-4 py-2 bg-white border border-[#E7E2DB] text-[#223F74] font-bold text-xs rounded-2xl hover:bg-[#F8EEE9] transition-all flex items-center gap-2"
                                >
                                  <Plus size={16} /> New Class
                                </button>
                                <button
                                  onClick={() =>
                                    navigate("/superadmin/academic/subjects")
                                  }
                                  className="px-4 py-2 bg-white border border-[#E7E2DB] text-[#223F74] font-bold text-xs rounded-2xl hover:bg-[#F8EEE9] transition-all flex items-center gap-2"
                                >
                                  <Plus size={16} /> New Subject
                                </button>
                              </div>
                            </div>

                            {subjects.filter((s) => !s.classRef).length > 0 && (
                              <div className="border rounded-2xl p-5 bg-white border-[#E7E2DB] col-span-1 lg:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                  <BookOpen size={20} className="text-slate-400" />
                                  <span className="font-bold text-lg text-[#223F74]">
                                    Global Subjects
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    Applies to all
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 pl-8">
                                  {subjects
                                    .filter((s) => !s.classRef)
                                    .map((sub) => {
                                      const isSubjectSelected =
                                        selectedSubjects.includes(sub._id);
                                      return (
                                        <label
                                          key={sub._id}
                                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all cursor-pointer
                                  ${isSubjectSelected ? "bg-[#223F74]/5 border-[#223F74]/20 text-[#223F74] font-semibold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSubjectSelected}
                                            onChange={(e) =>
                                              handleSubjectToggle(
                                                sub._id,
                                                e.target.checked,
                                              )
                                            }
                                            className="w-4 h-4 text-[#223F74] rounded border-[#E7E2DB] focus:ring-[#223F74]"
                                          />
                                          <span>{sub.name || sub.subjectName}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}


                    {/* ── STEP 2: HOLIDAYS ── */}
                    {currentStep === 2 && (
                      <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                          <div className="flex items-center gap-3">
                            <Gift className="text-[#F59B87] w-6 h-6" />
                            <div>
                              <h2 className="text-xl font-bold text-[#223F74]">
                                Organization Calendar
                              </h2>
                              <p className="text-xs text-[#6B7280] mt-1 font-medium">
                                Manage official holidays and non-working days.
                              </p>

                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingHoliday(null);
                              resetHolidayForm();
                              setShowHolidayModal(true);
                            }}
                            className="px-5 py-2.5 bg-white border border-[#E7E2DB] text-[#223F74] font-bold text-sm rounded-2xl hover:bg-[#F8EEE9] flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                          >
                            <Plus size={18} /> Add Event
                          </button>
                        </div>

                        {config?.holidays?.length === 0 ? (
                          <div className="text-center py-16 bg-[#F8F9FA]/40 rounded-[24px] border border-dashed border-[#E7E2DB]">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                              <CalendarDays className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-bold">
                              No holidays scheduled yet.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {config?.holidays?.map((holiday) => {
                              const typeObj = holidayTypes.find(
                                (t) => t.value === holiday.type,
                              );
                              return (
                                <div
                                  key={holiday._id}
                                  className="bg-white border border-[#E7E2DB] p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative group"
                                >
                                  <div className="absolute top-4 right-4 flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingHoliday(holiday);
                                        setHolidayForm({
                                          ...holiday,
                                          date: holiday.date?.split("T")[0],
                                        });
                                        setShowHolidayModal(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-[#223F74] bg-slate-50 hover:bg-[#F4F7FB] rounded-lg transition-colors"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteHoliday(holiday._id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${typeObj?.color || "bg-slate-50 text-slate-600 border-slate-200"}`}
                                  >
                                    {typeObj?.label || holiday.type}
                                  </span>
                                  <h3 className="font-semibold text-slate-800 text-lg mt-4 leading-tight pr-12">
                                    {holiday.title}
                                  </h3>
                                  <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                                    <CalendarDays
                                      size={14}
                                      className="text-slate-400"
                                    />{" "}
                                    {new Date(holiday.date).toLocaleDateString(
                                      "en-IN",
                                      { dateStyle: "medium" },
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── STEP 3: EXAM PATTERNS ── */}
                    {currentStep === 3 && (
                      <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                          <div className="flex items-center gap-3">
                            <FileText className="text-[#F59B87] w-6 h-6" />
                            <div>
                              <h2 className="text-xl font-bold text-[#223F74]">
                                Examination Framework
                              </h2>
                              <p className="text-xs text-[#6B7280] mt-1 font-medium">
                                Design templates for how exams are scored and weighted.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingExamPattern(null);
                              resetExamPatternForm();
                              setShowExamPatternModal(true);
                            }}
                            className="px-5 py-2.5 bg-white border border-[#E7E2DB] text-[#223F74] font-bold text-sm rounded-2xl hover:bg-[#F8EEE9] flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                          >
                            <Plus size={18} /> New Pattern
                          </button>
                        </div>

                        {config?.examPattern?.length === 0 ? (
                          <div className="text-center py-16 bg-[#F8F9FA]/40 rounded-[24px] border border-dashed border-[#E7E2DB]">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                              <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-bold">
                              No exam patterns defined.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {config?.examPattern?.map((pattern, idx) => {
                              const patternClass = classes.find(
                                (c) =>
                                  c._id === pattern.classRef?._id ||
                                  c._id === pattern.classRef,
                              );
                              const className = patternClass
                                ? patternClass.name
                                : "Unknown Class";

                              const missingSubjects =
                                getMissingSubjectsForPattern(pattern);
                              const hasWarning = missingSubjects.length > 0;

                              return (
                                <div
                                  key={pattern._id || idx}
                                  className={`border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative 
                                ${hasWarning ? "bg-amber-50/10 border-amber-300" : "bg-white border-[#E7E2DB]"}`}
                                >
                                  <div className="absolute top-5 right-5 flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingExamPattern(pattern);
                                        setExamPatternForm({
                                          ...pattern,
                                          classRef:
                                            pattern.classRef?._id ||
                                            pattern.classRef ||
                                            "",
                                          components:
                                            pattern.components?.map((c) => ({
                                              ...c,
                                              subjectRef:
                                                c.subjectRef?._id || c.subjectRef,
                                              subjectName:
                                                c.subjectRef?.name ||
                                                c.subjectRef?.subjectName ||
                                                c.name ||
                                                "",
                                            })) || [],
                                        });
                                        setShowExamPatternModal(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-[#223F74] bg-slate-50 hover:bg-[#F4F7FB] rounded-lg transition-colors"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteExamPattern(pattern._id)
                                      }
                                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 mb-1 pr-16">
                                    <h3 className="font-bold text-[#223F74] text-lg">
                                      {pattern.name}
                                    </h3>
                                    {hasWarning && (
                                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                    )}
                                  </div>


                                  <p className="text-[10px] font-bold text-slate-500 mb-4 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200 uppercase tracking-wider">
                                    {className}
                                  </p>

                                  <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-[#223F74]/5 border border-[#223F74]/10 p-3.5 rounded-xl">
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                        Total Marks
                                      </p>
                                      <p className="text-xl font-bold text-[#223F74]">
                                        {pattern.totalMarks}
                                      </p>
                                    </div>

                                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                                      <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider mb-1">
                                        Passing

                                      </p>
                                      <p className="text-xl font-bold text-emerald-700">
                                        {pattern.passingMarks}
                                      </p>
                                    </div>
                                  </div>

                                  {pattern.components?.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                                        Subject Breakdown
                                      </p>
                                      {pattern.components.map((comp, i) => (
                                        <div
                                          key={i}
                                          className="flex justify-between items-center text-sm p-2.5 bg-slate-50 border border-slate-100 rounded-xl"
                                        >
                                          <span className="font-bold text-slate-700">
                                            {comp.subjectRef?.name ||
                                              comp.subjectRef?.subjectName ||
                                              comp.name ||
                                              "Unknown"}
                                          </span>
                                          <div className="flex gap-2">
                                            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                                              {comp.maxMarks} pts
                                            </span>
                                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                              {comp.weightage}%
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {hasWarning && (
                                    <div className="mt-4 p-3 bg-amber-100/60 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800">
                                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-[13px] font-bold">
                                          Action Required
                                        </p>
                                        <p className="text-xs font-medium mt-0.5 leading-snug">
                                          The following subjects are active for this class but missing from the pattern:{" "}
                                          <span className="font-bold underline decoration-amber-300 underline-offset-2">
                                            {missingSubjects
                                              .map((s) => s.name || s.subjectName)
                                              .join(", ")}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}


                    {/* ── STEP 4: GRADING SYSTEM ── */}
                    {currentStep === 4 && (
                      <div>
                        <div className="mb-8 flex items-center gap-3">
                          <Award className="text-[#F59B87] w-6 h-6" />
                          <div>
                            <h2 className="text-xl font-bold text-[#223F74]">
                              Grading Scale
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                              Establish how percentage scores translate to final letter grades.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#F8F9FA]/60 p-6 rounded-2xl border border-slate-100">
                            <div>
                              <label className={labelStyle}>Evaluation Metric</label>
                              <select
                                value={gradingForm.type || "percentage"}
                                onChange={(e) =>
                                  setGradingForm({
                                    ...gradingForm,
                                    type: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none cursor-pointer transition-all placeholder:text-slate-400"
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="cgpa">CGPA (10 Point)</option>
                              </select>

                            </div>
                            <div>
                              <label className={labelStyle}>
                                Global Passing Threshold
                              </label>
                              <input
                                type="number"
                                min="0"
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "." || e.key === "e") e.preventDefault();
                                }}
                                value={gradingForm.passingMarks}
                                onChange={(e) =>
                                  setGradingForm({
                                    ...gradingForm,
                                    passingMarks: parseInt(e.target.value) || 0,
                                  })
                                }
                                className={inputStyle}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-[#223F74] text-lg">
                                Grade Boundaries
                              </h3>
                              <button
                                onClick={handleAddGradeSlab}
                                className="px-4 py-2 bg-white border border-[#E7E2DB] text-[#223F74] font-bold text-sm rounded-2xl hover:bg-[#F8EEE9] flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm"
                              >
                                <Plus size={16} /> New Boundary
                              </button>
                            </div>

                            <div className="bg-white border border-[#E7E2DB] rounded-[24px] overflow-hidden shadow-sm">
                              {gradingForm.slabs.length === 0 ? (
                                <div className="p-12 text-center">
                                  <Percent className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                  <p className="text-slate-500 font-bold">
                                    No boundaries defined. Click above to add your first scale.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-4 space-y-2">
                                  <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr_40px] gap-3 px-4 py-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest bg-[#223F74]/5 border-b border-[#223F74]/10 rounded-lg">
                                    <div>Grade</div>
                                    <div>Min Value</div>
                                    <div>Max Value</div>
                                    <div>GPA Pts</div>
                                    <div className="text-center"></div>
                                  </div>

                                  {gradingForm.slabs.map((slab, idx) => (
                                    <div
                                      key={slab.id}
                                      className="grid grid-cols-[60px_1fr_1fr_1fr_40px] sm:grid-cols-[80px_1fr_1fr_1fr_40px] gap-2 sm:gap-3 items-center bg-white p-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                                    >
                                      <input
                                        type="text"
                                        placeholder="A+"
                                        value={slab.grade}
                                        onChange={(e) => {
                                          const s = [...gradingForm.slabs];
                                          s[idx].grade = e.target.value;
                                          setGradingForm({
                                            ...gradingForm,
                                            slabs: s,
                                          });
                                        }}
                                        onBlur={handleSortSlabs}
                                        className="w-full px-2 py-2.5 bg-[#F8F9FA] border border-transparent focus:bg-white focus:border-[#223F74] focus:ring-2 focus:ring-[#223F74]/20 rounded-xl font-bold text-[#223F74] text-center uppercase outline-none transition-all text-sm"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "." || e.key === "e") e.preventDefault();
                                        }}
                                        placeholder="0"
                                        value={slab.min}
                                        onChange={(e) => {
                                          const s = [...gradingForm.slabs];
                                          s[idx].min = e.target.value;
                                          setGradingForm({
                                            ...gradingForm,
                                            slabs: s,
                                          });
                                        }}
                                        onBlur={handleSortSlabs}
                                        className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-transparent focus:bg-white focus:border-[#223F74] focus:ring-2 focus:ring-[#223F74]/20 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "." || e.key === "e") e.preventDefault();
                                        }}
                                        placeholder="100"
                                        value={slab.max}
                                        onChange={(e) => {
                                          const s = [...gradingForm.slabs];
                                          s[idx].max = e.target.value;
                                          setGradingForm({
                                            ...gradingForm,
                                            slabs: s,
                                          });
                                        }}
                                        onBlur={handleSortSlabs}
                                        className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-transparent focus:bg-white focus:border-[#223F74] focus:ring-2 focus:ring-[#223F74]/20 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "." || e.key === "e") e.preventDefault();
                                        }}
                                        placeholder="10"
                                        value={slab.gradePoint}
                                        onChange={(e) => {
                                          const s = [...gradingForm.slabs];
                                          s[idx].gradePoint = e.target.value;
                                          setGradingForm({
                                            ...gradingForm,
                                            slabs: s,
                                          });
                                        }}
                                        onBlur={handleSortSlabs}
                                        className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-transparent focus:bg-white focus:border-[#223F74] focus:ring-2 focus:ring-[#223F74]/20 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all"
                                      />
                                      <button
                                        onClick={() => {
                                          const s = gradingForm.slabs.filter(
                                            (_, i) => i !== idx,
                                          );
                                          setGradingForm({
                                            ...gradingForm,
                                            slabs: s,
                                          });
                                          toast.success("Slab deleted");
                                        }}
                                        className="w-full aspect-square flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-[#D66B5F] rounded-xl transition-colors"
                                        title="Delete"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Stepper Footer Controls */}
              <div className="p-6 md:px-10 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center shrink-0 rounded-b-[24px]">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0 || isProcessing}
                  className="px-5 py-3 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] font-bold text-sm rounded-2xl hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 flex items-center gap-2 shadow-sm"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-4">
                  {stepMessage.text && (
                    <span className={`text-sm font-semibold flex items-center gap-1.5 ${stepMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {stepMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                      {stepMessage.text}
                    </span>
                  )}
                  <button
                    onClick={handleNextStep}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm rounded-full shadow-lg shadow-[#F59B87]/30 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-2"
                  >
                    {isProcessing && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                    {currentStep === steps.length - 1
                      ? "Complete Setup"
                      : "Save & Continue"}
                    {!isProcessing && currentStep !== steps.length - 1 && (
                      <ArrowRight size={16} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ================= MODALS ================= */}

      {/* Holiday Modal */}
      {showHolidayModal && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowHolidayModal(false)}
        >
          <div
            className="bg-white rounded-[28px] max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#E2E8F0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2.5">
                <div className="p-2 bg-[#223F74]/5 text-[#223F74] rounded-xl">
                  <Gift className="w-4 h-4" />
                </div>
                {editingHoliday ? "Edit Event" : "New Calendar Event"}
              </h2>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="text-slate-400 hover:bg-slate-100 hover:text-[#1D1D1F] p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className={labelStyle}>Event Title</label>
                <input
                  type="text"
                  value={holidayForm.title}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, title: e.target.value })
                  }
                  placeholder="e.g., Winter Break"
                  className={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) =>
                      setHolidayForm({ ...holidayForm, date: e.target.value })
                    }
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Category</label>
                  <select
                    value={holidayForm.type}
                    onChange={(e) =>
                      setHolidayForm({ ...holidayForm, type: e.target.value })
                    }
                    className={`${inputStyle} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%2010l3%203%203-3H7z%22%20fill%3D%22%236B7280%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat`}
                  >
                    {holidayTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-sm transition hover:-translate-y-0.5 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={
                  editingHoliday ? handleUpdateHoliday : handleAddHoliday
                }
                className="px-6 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
              >
                {editingHoliday ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Exam Pattern Modal */}
      {showExamPatternModal && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowExamPatternModal(false)}
        >
          <div
            className="bg-white rounded-[28px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-[#E2E8F0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] shrink-0">
              <h2 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2.5">
                <div className="p-2 bg-[#223F74]/5 text-[#223F74] rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
                {editingExamPattern
                  ? "Edit Exam Template"
                  : "New Exam Template"}
              </h2>
              <button
                onClick={() => setShowExamPatternModal(false)}
                className="text-slate-400 hover:bg-slate-100 hover:text-[#1D1D1F] p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div>
                <label className={labelStyle}>Template Name</label>
                <input
                  type="text"
                  value={examPatternForm.name}
                  onChange={(e) =>
                    setExamPatternForm({
                      ...examPatternForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Mid-Term Examination"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Applicable Class</label>
                <Select
                  value={examPatternForm.classRef}
                  onChange={(e) =>
                    setExamPatternForm({
                      ...examPatternForm,
                      classRef: e.target.value,
                      components: [],
                      totalMarks: 0,
                    })
                  }
                  placeholder="Select a Class"
                >
                  {classes
                    .filter((cls) => selectedClasses.includes(cls._id))
                    .map((cls) => (
                      <Option key={cls._id} value={cls._id} label={cls.name} />
                    ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Total Marks (Auto-Calc)</label>
                  <input
                    type="number"
                    value={examPatternForm.totalMarks || 0}
                    readOnly
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#8E8E93] rounded-2xl text-sm font-semibold outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Passing Marks</label>
                  <input
                    type="number"
                    value={examPatternForm.passingMarks}
                    min="0"

                    step="1" 

                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "." || e.key === "e") {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) =>
                      setExamPatternForm({
                        ...examPatternForm,
                        passingMarks: e.target.value,
                      })
                    }
                    placeholder="e.g., 35"
                    className={inputStyle}
                  />
                </div>
              </div>

              <div className="border border-[#E2E8F0] p-5 rounded-[20px] bg-[#F8FAFC]">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.15em] mb-3 select-none">
                  Map Subjects to Template
                </label>

                <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                  <div className="w-full sm:flex-[2] min-w-0">
                    <Select
                      value={componentForm.subjectRef}
                      onChange={(e) => {
                        const selectedSub = subjects.find(
                          (s) => s._id === e.target.value,
                        );
                        setComponentForm({
                          ...componentForm,
                          subjectRef: e.target.value,
                          subjectName: selectedSub
                            ? selectedSub.name || selectedSub.subjectName
                            : "",
                        });
                      }}
                      placeholder="Select Subject"
                    >
                      {subjects
                        .filter((sub) => {
                          if (!examPatternForm.classRef) return false;
                          // Show all subjects for now to debug
                          return true;
                        })
                        .filter(
                          (sub) =>
                            !examPatternForm.components.some(
                              (c) =>
                                c.subjectRef === sub._id ||
                                c.subjectRef?._id === sub._id,
                            ),
                        )
                        .map((sub) => (
                          <Option
                            key={sub._id}
                            value={sub._id}
                            label={`${sub.name || sub.subjectName} ${sub.classRef ? "" : "(Global)"}`}
                          />
                        ))}
                    </Select>
                  </div>

                  <div className="flex gap-2.5 w-full sm:flex-[2]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "." || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Marks"
                      value={componentForm.maxMarks}
                      onChange={(e) =>
                        setComponentForm({
                          ...componentForm,
                          maxMarks: e.target.value,
                        })
                      }
                      className="w-full flex-1 min-w-0 px-4 py-3 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#223F74]/20 shadow-sm text-[#1D1D1F]"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "." || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Wt %"
                      value={componentForm.weightage}
                      onChange={(e) =>
                        setComponentForm({
                          ...componentForm,
                          weightage: e.target.value,
                        })
                      }
                      className="w-full flex-1 min-w-0 px-4 py-3 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#223F74]/20 shadow-sm text-[#1D1D1F]"
                    />
                    <button
                      onClick={handleAddComponent}
                      className="shrink-0 bg-[#F59B87] hover:bg-[#EC856D] text-white px-5 py-3 rounded-full text-sm font-bold shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {examPatternForm.components.map((c, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm group"
                    >
                      <span className="font-semibold text-sm text-[#1D1D1F]">
                        {c.subjectName ||
                          c.subjectRef?.name ||
                          c.subjectRef?.subjectName ||
                          c.name ||
                          "Unknown Subject"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#6B7280] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-xl">
                          {c.maxMarks} pts
                        </span>
                        <span className="text-xs font-semibold text-[#223F74] bg-[#223F74]/5 border border-[#223F74]/10 px-2.5 py-1 rounded-xl">
                          {c.weightage}% wt
                        </span>
                        <button
                          onClick={() => {
                            const comps = examPatternForm.components.filter(
                              (_, idx) => idx !== i,
                            );
                            const newTotal = comps.reduce(
                              (sum, comp) => sum + Number(comp.maxMarks || 0),
                              0,
                            );
                            setExamPatternForm({
                              ...examPatternForm,
                              components: comps,
                              totalMarks: newTotal,
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center shrink-0">
              <div>
                {modalError && (
                  <span className="text-sm font-semibold flex items-center gap-1.5 text-rose-500">
                    <AlertCircle size={16} />
                    {modalError}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExamPatternModal(false);
                    setModalError("");
                  }}
                  className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] rounded-2xl font-bold text-sm transition hover:-translate-y-0.5 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    editingExamPattern
                      ? handleUpdateExamPattern
                      : handleAddExamPattern
                  }
                  className="px-6 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
                >
                  {editingExamPattern ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <Toaster position="top-center" />
    </div>
  );
};

export default OrganizationConfig;
