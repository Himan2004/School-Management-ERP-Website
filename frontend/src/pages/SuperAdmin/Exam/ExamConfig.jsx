import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  BookOpen,
  GraduationCap,
  FileText,
  Plus,
  Trash2,
  Save,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";
import {
  createExamStructure,
  getExamDashboardStats,
} from "../../../services/api/superAdminExamApi";
import {
  getOrganizationClasses,
  getOrganizationSubjects,
} from "../../../services/api/organizationApi";
import { getAcademicConfig } from "../../../services/api/academicConfigApi";
import toast from "react-hot-toast";
import ExamStructurePage from "./ExamStructure";
import SuperAdminExamSchedule from "./ExamSchedule";
import {
  Heading,
  DashGrid,
  DashCard,
  Grid,
} from "../../../components/shared/Common_Components";

const ExamConfigProfessional = () => {
  const [activeModule, setActiveModule] = useState("config");
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [academicConfig, setAcademicConfig] = useState(null);
  const [stats, setStats] = useState({
    totalStructures: 0,
    totalSchedules: 0,
    participatingSchools: 0,
  });

  // --- 1. STATE MANAGEMENT ---
  const [basicDetails, setBasicDetails] = useState({
    title: "",
    cycle: "Unit Test",
    year:
      new Date().getFullYear().toString() +
      "-" +
      (new Date().getFullYear() + 1).toString().slice(-2),
    selectedClasses: [],
    term: "term1",
  });

  const [subjects, setSubjects] = useState([]);

  const [grading, setGrading] = useState({
    minPass: 33,
    method: "Absolute Grading",
    matrix: [
      { id: 1, label: "A+", min: 91, max: 100, color: "text-green-600" },
      { id: 2, label: "A", min: 81, max: 90, color: "text-blue-600" },
      { id: 3, label: "B", min: 71, max: 80, color: "text-indigo-600" },
      { id: 4, label: "C", min: 61, max: 70, color: "text-orange-600" },
      { id: 5, label: "D", min: 33, max: 60, color: "text-slate-600" },
      { id: 6, label: "F", min: 0, max: 32, color: "text-red-600" },
    ],
  });

  const [rules, setRules] = useState({
    allowGraceMarks: false,
    graceMarksLimit: 0,
    weightagePercentage: 100,
  });

  const fetchStats = async () => {
    try {
      const statsRes = await getExamDashboardStats();
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const orgId = localStorage.getItem("organizationId");

        const [classesRes, subjectsRes, configRes, statsRes] =
          await Promise.all([
            getOrganizationClasses(orgId),
            getOrganizationSubjects(orgId),
            getAcademicConfig(orgId),
            getExamDashboardStats(),
          ]);

        if (classesRes.success) setClasses(classesRes.data);
        if (subjectsRes.success) setAllSubjects(subjectsRes.data);
        if (statsRes.success) setStats(statsRes.data);

        if (configRes.success) {
          const config = Array.isArray(configRes.data)
            ? configRes.data[0]
            : configRes.data;
          setAcademicConfig(config);
        }
      } catch (error) {
        console.error("fetchData error:", error);
        toast.error("Failed to load setup data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- 2. HANDLER FUNCTIONS ---
  const addSubject = (subjectObj) => {
    if (subjects.find((s) => s.subject === subjectObj._id)) {
      toast.error("Subject already added");
      return;
    }
    const newSub = {
      subject: subjectObj._id,
      name: subjectObj.name,
      theory: 80,
      practical: 20,
      passing: grading.minPass,
    };
    setSubjects([...subjects, newSub]);
  };

  const updateSubject = (id, field, value) => {
    setSubjects(
      subjects.map((s) =>
        s.subject === id ? { ...s, [field]: parseInt(value) || 0 } : s,
      ),
    );
  };

  const deleteSubject = (id) => {
    setSubjects(subjects.filter((s) => s.subject !== id));
  };

  const addGradeRow = () => {
    const newGrade = {
      id: Date.now(),
      label: "New",
      min: 0,
      max: 0,
      color: "text-slate-600",
    };
    setGrading({ ...grading, matrix: [...grading.matrix, newGrade] });
  };

  const updateGrade = (id, field, value) => {
    const updatedMatrix = grading.matrix.map((g) =>
      g.id === id
        ? { ...g, [field]: field === "label" ? value : parseInt(value) || 0 }
        : g,
    );
    setGrading({ ...grading, matrix: updatedMatrix });
  };

  const deleteGrade = (id) => {
    setGrading({
      ...grading,
      matrix: grading.matrix.filter((g) => g.id !== id),
    });
  };

  // --- 3. ROBUST VALIDATION LOGIC ---
  const validateConfig = () => {
    // 1. Basic Info Validation
    if (!basicDetails.title.trim()) {
      toast.error("Examination Title is required.");
      setActiveTab("basic");
      return false;
    }
    if (!basicDetails.year.trim()) {
      toast.error("Examination Year is required.");
      setActiveTab("basic");
      return false;
    }
    if (basicDetails.selectedClasses.length === 0) {
      toast.error("Please select at least one applicable class.");
      setActiveTab("basic");
      return false;
    }

    // 2. Subject Logic Validation
    if (subjects.length === 0) {
      toast.error("Please map at least one subject.");
      setActiveTab("subjects");
      return false;
    }

    for (const sub of subjects) {
      const theory = parseInt(sub.theory) || 0;
      const practical = parseInt(sub.practical) || 0;
      const passing = parseInt(sub.passing) || 0;
      const total = theory + practical;

      if (theory < 0 || practical < 0) {
        toast.error(`Marks cannot be negative for ${sub.name}.`);
        setActiveTab("subjects");
        return false;
      }
      if (total === 0) {
        toast.error(
          `Total marks (Theory + Practical) for ${sub.name} must be greater than 0.`,
        );
        setActiveTab("subjects");
        return false;
      }
      if (passing < 0) {
        toast.error(`Passing marks cannot be negative for ${sub.name}.`);
        setActiveTab("subjects");
        return false;
      }
      if (passing > total) {
        toast.error(
          `Pass marks (${passing}) cannot exceed Total marks (${total}) for ${sub.name}.`,
        );
        setActiveTab("subjects");
        return false;
      }
    }

    // 3. Grading Matrix Logic Validation
    if (grading.minPass < 0 || grading.minPass > 100) {
      toast.error("Minimum Pass % must be between 0 and 100.");
      setActiveTab("grading");
      return false;
    }

    // Check for logical range errors (min > max)
    for (const grade of grading.matrix) {
      if (!grade.label.trim()) {
        toast.error("Grade labels cannot be empty.");
        setActiveTab("grading");
        return false;
      }
      if (grade.min < 0 || grade.max > 100) {
        toast.error(
          `Invalid range for Grade ${grade.label}. Values must be 0-100.`,
        );
        setActiveTab("grading");
        return false;
      }
      if (grade.min > grade.max) {
        toast.error(
          `Min value cannot be greater than Max value for Grade ${grade.label}.`,
        );
        setActiveTab("grading");
        return false;
      }
    }

    // Check for overlapping grade ranges
    const sortedGrades = [...grading.matrix].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sortedGrades.length - 1; i++) {
      if (sortedGrades[i].max >= sortedGrades[i + 1].min) {
        toast.error(
          `Grade ranges overlap between ${sortedGrades[i].label} and ${sortedGrades[i + 1].label}.`,
        );
        setActiveTab("grading");
        return false;
      }
    }

    // 4. Governance Rules Validation
    if (rules.weightagePercentage < 0 || rules.weightagePercentage > 100) {
      toast.error("Result Weightage % must be between 0 and 100.");
      setActiveTab("rules");
      return false;
    }
    if (rules.allowGraceMarks && rules.graceMarksLimit < 0) {
      toast.error("Grace marks limit cannot be negative.");
      setActiveTab("rules");
      return false;
    }

    return true; // Everything is flawless!
  };

  // Final Deploy Logic
  const handleDeploy = async () => {
    // Stop execution immediately if validation fails
    if (!validateConfig()) return;

    if (!academicConfig) {
      toast.error(
        "Academic configuration not found. Please setup academic settings first.",
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        examName: basicDetails.title,
        academicYear: basicDetails.year,
        examType: basicDetails.cycle,
        term: basicDetails.term,
        applicableClasses: basicDetails.selectedClasses,
        subjectMarkings: subjects.map((s) => ({
          subject: s.subject,
          theoryMaxMarks: s.theory,
          practicalMaxMarks: s.practical,
          totalMaxMarks: s.theory + s.practical,
          passingMarks: s.passing || grading.minPass,
        })),
        gradingConfigRef: academicConfig._id || academicConfig.id,
        allowGraceMarks: rules.allowGraceMarks,
        graceMarksLimit: rules.graceMarksLimit,
        weightagePercentage: rules.weightagePercentage,
        isActive: true,
      };

      const response = await createExamStructure(payload);
      if (response.success) {
        toast.success("Exam configuration deployed successfully!");
        fetchStats();
        setBasicDetails({
          title: "",
          cycle: "Unit Test",
          year:
            new Date().getFullYear().toString() +
            "-" +
            (new Date().getFullYear() + 1).toString().slice(-2),
          selectedClasses: [],
          term: "term1",
        });
        setSubjects([]);
      }
    } catch (error) {
      toast.error(error.message || "Failed to deploy configuration");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "basic", label: "General Info", icon: <Settings size={18} /> },
    { id: "subjects", label: "Subject Mapping", icon: <BookOpen size={18} /> },
    {
      id: "grading",
      label: "Grading Logic",
      icon: <GraduationCap size={18} />,
    },
    { id: "rules", label: "Result Rules", icon: <FileText size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="Examination"
          secondaryText="Management"
          size={12}
          fontSize="2xl"
        />
      </Grid>

      {/* Overview Stats Cards */}
      <div className="mb-8">
        <DashGrid cols={12}>
          <DashCard
            title="Exam Templates & Structures"
            value={String(stats.totalStructures || 0).padStart(2, "0")}
            icon={<FileText size={20} />}
            size={4}
            accentColor="#223F74"
          />
          <DashCard
            title="Total Scheduled Exams"
            value={String(stats.totalSchedules || 0).padStart(2, "0")}
            icon={<Calendar size={20} />}
            size={4}
            accentColor="#10B981"
          />
          <DashCard
            title="Participating Branches"
            value={String(stats.participatingSchools || 0).padStart(2, "0")}
            icon={<GraduationCap size={20} />}
            size={4}
            accentColor="#F59E0B"
          />
        </DashGrid>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-[#E2E8F0] mb-8 overflow-x-auto custom-scrollbar gap-2">
        <button
          onClick={() => setActiveModule("config")}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeModule === "config"
            ? "border-[#223F74] text-[#223F74]"
            : "border-transparent text-slate-400 hover:text-[#1D1D1F]"
            }`}
        >
          Exam Configuration
        </button>
        <button
          onClick={() => setActiveModule("structure")}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeModule === "structure"
            ? "border-[#223F74] text-[#223F74]"
            : "border-transparent text-slate-400 hover:text-[#1D1D1F]"
            }`}
        >
          Exam Structures
        </button>
        <button
          onClick={() => setActiveModule("schedule")}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeModule === "schedule"
            ? "border-[#223F74] text-[#223F74]"
            : "border-transparent text-slate-400 hover:text-[#1D1D1F]"
            }`}
        >
          Exam Schedules
        </button>
      </div>

      {/* Module Content */}
      <AnimatePresence mode="wait">
        {activeModule === "structure" && (
          <motion.div
            key="module-structure"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <ExamStructurePage hideHeader={true} />
          </motion.div>
        )}

        {activeModule === "schedule" && (
          <motion.div
            key="module-schedule"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <SuperAdminExamSchedule hideHeader={true} />
          </motion.div>
        )}

        {activeModule === "config" && (
          <motion.div
            key="module-config"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Top Stepper (replaces header + sidebar) ── */}
            <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.04)] border border-[#E7E2DB] mb-6 p-4 sm:p-6">
              <div className="relative flex justify-between items-center px-2 sm:px-10">
                <div className="absolute top-5 sm:top-6 left-6 sm:left-14 right-6 sm:right-14 h-[2px] bg-slate-100 -z-0" />
                <motion.div
                  className="absolute top-5 sm:top-6 left-6 sm:left-14 right-6 sm:right-14 h-[2px] bg-[#223F74] origin-left -z-0"
                  animate={{ scaleX: activeTab === "basic" ? 0 : activeTab === "subjects" ? 0.33 : activeTab === "grading" ? 0.66 : 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
                {tabs.map((tab, index) => {
                  const tabOrder = { basic: 0, subjects: 1, grading: 2, rules: 3 };
                  const currentIdx = tabOrder[activeTab];
                  const isActive = activeTab === tab.id;
                  const isCompleted = currentIdx > index;
                  return (
                    <div key={tab.id} className="flex flex-col items-center gap-2.5 w-full relative z-10"
                      onClick={() => isCompleted && setActiveTab(tab.id)}
                      style={{ cursor: isCompleted ? "pointer" : "default" }}>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive ? "bg-[#223F74] text-white shadow-lg shadow-[#223F74]/20 scale-110 ring-4 ring-[#223F74]/15"
                          : isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100/50"
                            : "bg-white border-2 border-slate-200 text-slate-400"}`}>
                        {isCompleted ? <CheckCircle2 size={20} strokeWidth={2.5} /> : tab.icon}
                      </div>
                      <span className={`hidden sm:block text-xs tracking-wide transition-colors duration-300
                        ${isActive ? "text-[#223F74] font-bold" : isCompleted ? "text-emerald-700 font-bold" : "text-slate-400 font-semibold"}`}>
                        {tab.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Step Content Card ── */}
            <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <main>
                <AnimatePresence mode="wait">
                  {/* Section 1: Basic Details */}
                  {activeTab === "basic" && (
                    <motion.div
                      key="basic"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 sm:p-8"
                    >
                      <div className="flex items-center gap-4 mb-8 bg-[#223F74] p-6 rounded-[20px]">
                        <div className="p-3 bg-white/10 rounded-xl shrink-0">
                          <Settings className="text-white w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          Basic Exam Details
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                            Examination Title
                          </label>
                          <input
                            type="text"
                            value={basicDetails.title}
                            onChange={(e) =>
                              setBasicDetails({
                                ...basicDetails,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                            placeholder="e.g. Annual Assessment 2026"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                            Evaluation Cycle
                          </label>
                          <select
                            value={basicDetails.cycle}
                            onChange={(e) =>
                              setBasicDetails({
                                ...basicDetails,
                                cycle: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                          >
                            <option value="Unit Test">Unit Test</option>
                            <option value="Class Test">Class Test</option>
                            <option value="Mid Term">
                              Mid-Year (Half Yearly)
                            </option>
                            <option value="Term Exam">Term Exam</option>
                            <option value="Final Term">
                              Terminal (Annual)
                            </option>
                            <option value="Pre Board">Pre-Board</option>
                            <option value="Board">Board Exam</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                            Examination Year
                          </label>
                          <input
                            type="text"
                            value={basicDetails.year}
                            onChange={(e) =>
                              setBasicDetails({
                                ...basicDetails,
                                year: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                            placeholder="2026-2027"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                            Examination Term
                          </label>
                          <select
                            value={basicDetails.term}
                            onChange={(e) =>
                              setBasicDetails({
                                ...basicDetails,
                                term: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-[#223F74]"
                          >
                            <option value="term1">Term 1</option>
                            <option value="term2">Term 2</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em] select-none block mb-1">
                            Applicable Classes
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {classes.map((cls) => (
                              <div
                                key={cls._id}
                                onClick={() => {
                                  const current = basicDetails.selectedClasses;
                                  if (current.includes(cls._id)) {
                                    setBasicDetails({
                                      ...basicDetails,
                                      selectedClasses: current.filter(
                                        (id) => id !== cls._id,
                                      ),
                                    });
                                  } else {
                                    setBasicDetails({
                                      ...basicDetails,
                                      selectedClasses: [...current, cls._id],
                                    });
                                  }
                                }}
                                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${basicDetails.selectedClasses.includes(cls._id)
                                  ? "border-[#223F74] bg-[#223F74]/5 text-[#223F74]"
                                  : "border-slate-100 hover:border-slate-200 text-slate-500 bg-white"
                                  }`}
                              >
                                <span className="text-xs font-bold">
                                  {cls.name}
                                </span>
                                {basicDetails.selectedClasses.includes(
                                  cls._id,
                                ) && <CheckCircle2 size={16} />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 2: Subject Mapping */}
                  {activeTab === "subjects" && (
                    <motion.div
                      key="subjects"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 sm:p-8"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#223F74] p-6 rounded-[20px]">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-xl shrink-0">
                            <BookOpen className="text-white w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold text-white">
                            Subject Configuration
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <select
                            onChange={(e) => {
                              const sub = allSubjects.find(
                                (s) => s._id === e.target.value,
                              );
                              if (sub) addSubject(sub);
                              e.target.value = ""; // reset dropdown after selection
                            }}
                            className="flex-1 sm:w-48 px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-bold text-xs"
                          >
                            <option value="">Select Subject to Add</option>
                            {allSubjects
                              .filter((s) => {
                                if (!s.classRef) return false;
                                const sClassId =
                                  typeof s.classRef === "object"
                                    ? s.classRef._id
                                    : s.classRef;
                                return basicDetails.selectedClasses.includes(
                                  sClassId,
                                );
                              })
                              .map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.classRef?.name || "No Class"})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC]/50 border-b border-[#E2E8F0]">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Subject Name
                              </th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Theory Max
                              </th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Practical Max
                              </th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Pass Marks
                              </th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Total
                              </th>
                              <th className="px-6 py-4"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {subjects.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="6"
                                  className="p-10 text-center text-slate-400 italic text-sm"
                                >
                                  No subjects added yet. Select a subject from
                                  the list above.
                                </td>
                              </tr>
                            ) : (
                              subjects.map((sub) => (
                                <tr
                                  key={sub.subject}
                                  className="hover:bg-slate-50/50"
                                >
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-slate-700 text-sm">
                                      {sub.name}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "-" ||
                                          e.key === "." ||
                                          e.key === "e"
                                        ) {
                                          e.preventDefault();
                                        }
                                      }}
                                      value={sub.theory}
                                      onChange={(e) =>
                                        updateSubject(
                                          sub.subject,
                                          "theory",
                                          e.target.value,
                                        )
                                      }
                                      className="w-16 mx-auto block p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-center font-bold text-slate-700 text-sm focus:outline-none focus:border-[#223F74]"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "-" ||
                                          e.key === "." ||
                                          e.key === "e"
                                        ) {
                                          e.preventDefault();
                                        }
                                      }}
                                      value={sub.practical}
                                      onChange={(e) =>
                                        updateSubject(
                                          sub.subject,
                                          "practical",
                                          e.target.value,
                                        )
                                      }
                                      className="w-16 mx-auto block p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-center font-bold text-slate-700 text-sm focus:outline-none focus:border-[#223F74]"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "-" ||
                                          e.key === "." ||
                                          e.key === "e"
                                        ) {
                                          e.preventDefault();
                                        }
                                      }}
                                      value={sub.passing}
                                      onChange={(e) =>
                                        updateSubject(
                                          sub.subject,
                                          "passing",
                                          e.target.value,
                                        )
                                      }
                                      className="w-16 mx-auto block p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-center font-bold text-slate-700 text-sm focus:outline-none focus:border-[#223F74]"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-center font-bold text-[#223F74]">
                                    {sub.theory + sub.practical}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => deleteSubject(sub.subject)}
                                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 3: Grading Logic */}
                  {activeTab === "grading" && (
                    <motion.div
                      key="grading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 sm:p-8"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#223F74] p-6 rounded-[20px]">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-xl shrink-0">
                            <GraduationCap className="text-white w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold text-white">
                            Grading Matrix
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-white">
                          <span className="text-xs font-bold text-white/70">
                            Min Pass %
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            onKeyDown={(e) => {
                              if (
                                e.key === "-" ||
                                e.key === "." ||
                                e.key === "e"
                              ) {
                                e.preventDefault();
                              }
                            }}
                            value={grading.minPass}
                            onChange={(e) =>
                              setGrading({
                                ...grading,
                                minPass: e.target.value,
                              })
                            }
                            className="w-12 bg-transparent text-center font-black text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {grading.matrix.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center gap-4 p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl group"
                          >
                            <input
                              type="text"
                              value={g.label}
                              onChange={(e) =>
                                updateGrade(g.id, "label", e.target.value)
                              }
                              className="w-14 h-11 rounded-xl bg-white text-center font-bold text-[#223F74] border border-[#E2E8F0] shadow-sm outline-none"
                            />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "." ||
                                    e.key === "e"
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                value={g.min}
                                onChange={(e) =>
                                  updateGrade(g.id, "min", e.target.value)
                                }
                                className="p-2 h-11 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-center"
                                placeholder="Min"
                              />
                              <input
                                type="number"
                                min="0"
                                step="1"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "." ||
                                    e.key === "e"
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                value={g.max}
                                onChange={(e) =>
                                  updateGrade(g.id, "max", e.target.value)
                                }
                                className="p-2 h-11 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-center"
                                placeholder="Max"
                              />
                            </div>
                            <button
                              onClick={() => deleteGrade(g.id)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addGradeRow}
                          className="w-full py-4 border-2 border-dashed border-[#E2E8F0] rounded-2xl text-slate-400 font-bold hover:border-[#223F74]/20 hover:text-[#223F74] transition-all text-sm"
                        >
                          + Add New Grade Level
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 4: Result Rules */}
                  {activeTab === "rules" && (
                    <motion.div
                      key="rules"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 sm:p-8"
                    >
                      <div className="flex items-center gap-4 mb-8 bg-[#223F74] p-6 rounded-[20px]">
                        <div className="p-3 bg-white/10 rounded-xl shrink-0">
                          <FileText className="text-white w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          Governance Rules
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 text-sm">
                              Allow Grace Marks
                            </span>
                            <input
                              type="checkbox"
                              checked={rules.allowGraceMarks}
                              onChange={(e) =>
                                setRules({
                                  ...rules,
                                  allowGraceMarks: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#223F74] cursor-pointer"
                            />
                          </div>
                          {rules.allowGraceMarks && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 select-none">
                                Limit per student
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "." ||
                                    e.key === "e"
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                value={rules.graceMarksLimit}
                                onChange={(e) =>
                                  setRules({
                                    ...rules,
                                    graceMarksLimit:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl font-bold text-slate-700"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 text-sm">
                              Result Weightage %
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "-" ||
                                  e.key === "." ||
                                  e.key === "e"
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              value={rules.weightagePercentage}
                              onChange={(e) =>
                                setRules({
                                  ...rules,
                                  weightagePercentage:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-16 p-2 bg-white border border-[#E2E8F0] rounded-xl text-center font-bold text-[#223F74]"
                            />
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            Define how much this exam contributes to the final
                            annual result.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Step Footer: Back / Next / Discard / Deploy ── */}
                <div className="flex items-center justify-between px-6 sm:px-8 pb-6 sm:pb-8 pt-4 bg-white">
                  {activeTab === "basic" ? (
                    <button
                      onClick={() => { setBasicDetails({ title: "", cycle: "Unit Test", year: new Date().getFullYear().toString() + "-" + (new Date().getFullYear() + 1).toString().slice(-2), selectedClasses: [], term: "term1" }); setSubjects([]); }}
                      className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] text-xs font-bold rounded-2xl transition hover:-translate-y-0.5 active:scale-95"
                    >
                      Discard
                    </button>
                  ) : (
                    <button
                      onClick={() => { const order = ["basic", "subjects", "grading", "rules"]; const idx = order.indexOf(activeTab); if (idx > 0) setActiveTab(order[idx - 1]); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] text-xs font-bold rounded-2xl transition hover:-translate-y-0.5 active:scale-95"
                    >
                      ← Back
                    </button>
                  )}

                  {activeTab === "rules" ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => { setBasicDetails({ title: "", cycle: "Unit Test", year: new Date().getFullYear().toString() + "-" + (new Date().getFullYear() + 1).toString().slice(-2), selectedClasses: [], term: "term1" }); setSubjects([]); setActiveTab("basic"); }}
                        className="px-5 py-2.5 bg-white text-[#223F74] border border-[#E7E2DB] hover:bg-[#F8EEE9] text-xs font-bold rounded-2xl transition hover:-translate-y-0.5 active:scale-95"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleDeploy}
                        disabled={loading}
                        className="px-6 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white text-xs font-bold rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? "Deploying..." : <><Save size={14} /> Deploy Config</>}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { const order = ["basic", "subjects", "grading", "rules"]; const idx = order.indexOf(activeTab); if (idx < order.length - 1) setActiveTab(order[idx + 1]); }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#223F74] hover:bg-[#1b325c] text-white text-xs font-bold rounded-full shadow-lg shadow-[#223F74]/20 transition hover:-translate-y-0.5 active:scale-95"
                    >
                      Save & Continue →
                    </button>
                  )}
                </div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamConfigProfessional;
