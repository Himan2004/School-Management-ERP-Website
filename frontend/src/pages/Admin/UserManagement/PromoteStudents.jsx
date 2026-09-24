import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, CheckCircle, AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight, 
  Loader2, GraduationCap, ArrowUpRight, History, Calendar, CheckSquare, 
  Square, Search, AlertTriangle, Eye, ShieldAlert, Award
} from 'lucide-react';
import { 
  getEligibleStudents, 
  getPromotionStats, 
  promoteSingleStudent, 
  promoteBulkStudents, 
  markPassOut, 
  getPromotionHistory 
} from '../../../services/api/adminPromotionApi';
import { getClassesAndSections } from '../../../services/api/adminStudentApi';
import { fetchAcademicYears } from '../../../services/classesApi';
import { 
  Heading, Button, DashGrid, EnhancedDashCard, 
  Modal, openModal, closeModal, DataTable 
} from '../../../components/shared/Common_Components';
import toast from 'react-hot-toast';

// Module-level cache variables to persist data across component mount/unmount cycle (e.g. when switching tabs)
let cacheData = {
  stats: null,
  studentsList: null,
  historyLogs: null,
  initialized: false
};

const normalizeAcademicYear = (yearStr) => {
  if (!yearStr) return "";
  const clean = yearStr.trim().replace(/[\u2013\u2014]/g, "-");
  const parts = clean.split("-");
  if (parts.length !== 2) return yearStr;
  const startYearStr = parts[0].trim();
  const endYearStr = parts[1].trim();

  if (startYearStr.length === 4) {
    if (endYearStr.length === 4) {
      return `${startYearStr}-${endYearStr}`;
    } else if (endYearStr.length === 2) {
      const century = startYearStr.slice(0, 2);
      return `${startYearStr}-${century}${endYearStr}`;
    }
  }
  return yearStr;
};

const PromoteStudents = () => {
  // Tabs: "promotion" or "history"
  const [activeSubTab, setActiveSubTab] = useState("promotion");

  const classFilterRef = useRef(null);

  // Options & Metadata States
  const [classesList, setClassesList] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentSession, setCurrentSession] = useState("");
  const [allSections, setAllSections] = useState([]);

  // Stats State (Active, Eligible, Pass Out) - Initialized from cache or 0s
  const [stats, setStats] = useState(() => {
    return cacheData.stats || {
      activeStudents: 0,
      eligibleForPromotion: 0,
      alreadyPromoted: 0,
      passOutStudents: 0
    };
  });
  
  // Lists States - Initialized from cache or empty lists
  const [studentsList, setStudentsList] = useState(() => {
    return cacheData.studentsList || [];
  });
  const [historyLogs, setHistoryLogs] = useState(() => {
    return cacheData.historyLogs || [];
  });
  
  // Loading states - false if cache is already loaded, otherwise true
  const [statsLoading, setStatsLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(() => {
    return !cacheData.initialized;
  });
  const [historyLoading, setHistoryLoading] = useState(() => {
    return !cacheData.initialized;
  });

  // Pagination states (Promotion List)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters State (Promotion List)
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // default ACTIVE
  const [genderFilter, setGenderFilter] = useState("all");

  // Search & Debounce States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [admissionNoFilter, setAdmissionNoFilter] = useState("");
  const [debouncedAdmissionNo, setDebouncedAdmissionNo] = useState("");

  const [rollNoFilter, setRollNoFilter] = useState("");
  const [debouncedRollNo, setDebouncedRollNo] = useState("");

  // History Filters
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");
  const [historyClassFilter, setHistoryClassFilter] = useState("all");
  const [historyAcademicYearFilter, setHistoryAcademicYearFilter] = useState("all");

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals Data State
  const [activeStudent, setActiveStudent] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Single Promotion Form
  const [singleTargetClass, setSingleTargetClass] = useState("");
  const [singleTargetSection, setSingleTargetSection] = useState("");
  const [singleTargetSession, setSingleTargetSession] = useState("");
  const [singleRemarks, setSingleRemarks] = useState("");
  const [singleNewRollNo, setSingleNewRollNo] = useState("");

  // Bulk Promotion Form
  const [bulkTargetClass, setBulkTargetClass] = useState("");
  const [bulkTargetSection, setBulkTargetSection] = useState("");
  const [bulkTargetSession, setBulkTargetSession] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [bulkNewRollNos, setBulkNewRollNos] = useState({});

  // Pass Out Form
  const [statusReason, setStatusReason] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");

  // Debouncing handlers
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedAdmissionNo(admissionNoFilter), 300);
    return () => clearTimeout(handler);
  }, [admissionNoFilter]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedRollNo(rollNoFilter), 300);
    return () => clearTimeout(handler);
  }, [rollNoFilter]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedHistorySearch(historySearchTerm), 300);
    return () => clearTimeout(handler);
  }, [historySearchTerm]);

  // Load Classes, Sections, Academic Sessions on Mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const res = await getClassesAndSections();
        if (res.success && res.data) {
          const uniqueClasses = [];
          const seenIds = new Set();
          const seenNames = new Set();
          const sectionsList = [];

          res.data.forEach((cls) => {
            if (!cls || (!cls._id && !cls.id) || !cls.name) return;
            const clsId = cls.id || cls._id;
            const normalizedName = cls.name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!seenIds.has(clsId) && !seenNames.has(normalizedName)) {
              seenIds.add(clsId);
              seenNames.add(normalizedName);
              uniqueClasses.push(cls);
            }

            if (cls.sections && Array.isArray(cls.sections)) {
              cls.sections.forEach(sec => {
                if (sec.isFallback) return;
                sectionsList.push({
                  _id: sec.id || sec._id || sec,
                  name: sec.name || sec,
                  classId: clsId
                });
              });
            }
          });

          uniqueClasses.sort((a, b) => {
            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

          setClassesList(uniqueClasses);
          setAllSections(sectionsList);
        }
      } catch (err) {
        console.error("Failed to load classes and sections metadata:", err);
      }
    };

    const loadSessionData = async () => {
      try {
        let years = [];
        try {
          const response = await fetchAcademicYears();
          const res = response?.data;
          if (res && res.success && Array.isArray(res.data)) {
            years = res.data.map((y, idx) => ({
              name: normalizeAcademicYear(y),
              status: idx === 0 ? 'Active' : 'Inactive'
            }));
          }
        } catch (apiErr) {
          console.warn("fetchAcademicYears API failed, using fallback:", apiErr);
        }

        if (!years || years.length === 0) {
          years = [];
          const currentYearNum = new Date().getFullYear();
          for (let i = 0; i < 5; i++) {
            const startYear = currentYearNum - i;
            const endYear = startYear + 1;
            years.push({
              name: `${startYear}–${endYear}`,
              status: i === 0 ? 'Active' : 'Inactive'
            });
          }
        }

        setAcademicYears(years);
        const activeYear = years.find(y => y.status === 'Active') || years[0];
        if (activeYear) {
          const normalized = normalizeAcademicYear(activeYear.name);
          setCurrentSession(normalized);
          setAcademicYearFilter(normalized);
          setHistoryAcademicYearFilter(normalized);
        }
      } catch (err) {
        console.error("Failed to load academic sessions:", err);
      }
    };

    loadMetadata();
    loadSessionData();
  }, []);

  // Fetch Main Dashboard & Student Lists (Saves values directly to cache to prevent data clearance)
  const loadPromotionData = useCallback(async (isRefresh = false) => {
    try {
      setTableLoading(true);
      setStatsLoading(true);

      const statsRes = await getPromotionStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
        cacheData.stats = statsRes.data;
      }

      const studentsRes = await getEligibleStudents({ page: 1, limit: 10000 });
      if (studentsRes.success && studentsRes.data) {
        setStudentsList(studentsRes.data);
        cacheData.studentsList = studentsRes.data;
      }
      
      cacheData.initialized = true;
    } catch (err) {
      console.error("Failed to load promotion data:", err);
      toast.error("Failed to fetch students database");
    } finally {
      setTableLoading(false);
      setStatsLoading(false);
    }
  }, []);

  // Fetch History Logs List
  const loadHistoryData = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await getPromotionHistory({ page: 1, limit: 10000 });
      if (res.success && res.data) {
        setHistoryLogs(res.data);
        cacheData.historyLogs = res.data;
      }
    } catch (err) {
      console.error("Failed to load promotion history logs:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Trigger loading on mount ONLY if the cache is uninitialized. Switches are instant.
  useEffect(() => {
    if (!cacheData.initialized) {
      loadPromotionData();
      loadHistoryData();
    }
  }, [loadPromotionData, loadHistoryData]);

  // Unified reload handler for the manual refresh button or success call
  const handleReloadAll = useCallback(async () => {
    try {
      setTableLoading(true);
      setStatsLoading(true);
      setHistoryLoading(true);

      const statsRes = await getPromotionStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
        cacheData.stats = statsRes.data;
      }

      const studentsRes = await getEligibleStudents({ page: 1, limit: 10000 });
      if (studentsRes.success && studentsRes.data) {
        setStudentsList(studentsRes.data);
        cacheData.studentsList = studentsRes.data;
      }

      const historyRes = await getPromotionHistory({ page: 1, limit: 10000 });
      if (historyRes.success && historyRes.data) {
        setHistoryLogs(historyRes.data);
        cacheData.historyLogs = historyRes.data;
      }

      cacheData.initialized = true;
      toast.success("Database synced successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync database");
    } finally {
      setTableLoading(false);
      setStatsLoading(false);
      setHistoryLoading(false);
    }
  }, []);

  // Client-side filtering logic (Student Promotion List)
  const filteredStudents = useMemo(() => {
    let result = [...studentsList];

    // 1. Text Search Filter
    if (debouncedSearch.trim()) {
      const searchRegex = new RegExp(debouncedSearch.trim(), "i");
      result = result.filter((s) => {
        const name = s.user?.name || s.name || "";
        const rollNo = s.rollNo || "";
        const enrollmentNo = s.enrollmentNo || s.admissionNo || "";
        return (
          searchRegex.test(name) ||
          searchRegex.test(rollNo) ||
          searchRegex.test(enrollmentNo)
        );
      });
    }

    // 2. Admission Number Filter
    if (debouncedAdmissionNo.trim()) {
      const searchRegex = new RegExp(debouncedAdmissionNo.trim(), "i");
      result = result.filter((s) => searchRegex.test(s.admissionNo || s.enrollmentNo || ""));
    }

    // 3. Roll Number Filter
    if (debouncedRollNo.trim()) {
      const searchRegex = new RegExp(debouncedRollNo.trim(), "i");
      result = result.filter((s) => searchRegex.test(s.rollNo || ""));
    }

    // 4. Class Filter
    if (classFilter !== "all" && classFilter !== "All") {
      result = result.filter((s) => {
        const classId = s.class?._id || s.class;
        return classId === classFilter;
      });
    }

    // 5. Section Filter
    if (sectionFilter !== "all" && sectionFilter !== "All") {
      result = result.filter((s) => {
        const sectionId = s.section?._id || s.section;
        return sectionId === sectionFilter;
      });
    }

    // 6. Gender Filter
    if (genderFilter !== "all" && genderFilter !== "All") {
      result = result.filter((s) => s.gender?.toLowerCase() === genderFilter.toLowerCase());
    }

    // 7. Status Filter
    if (statusFilter !== "all" && statusFilter !== "All") {
      result = result.filter((s) => s.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // 8. Academic Session Filter
    if (academicYearFilter !== "all" && academicYearFilter !== "All") {
      result = result.filter((s) => normalizeAcademicYear(s.academicYear) === normalizeAcademicYear(academicYearFilter));
    }

    return result;
  }, [studentsList, debouncedSearch, debouncedAdmissionNo, debouncedRollNo, classFilter, sectionFilter, genderFilter, statusFilter, academicYearFilter]);

  // Derived promotion pagination
  const totalCount = filteredStudents.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, rowsPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, admissionNoFilter, rollNoFilter, classFilter, sectionFilter, genderFilter, statusFilter, academicYearFilter, rowsPerPage]);

  // Client-side filtering logic (Promotion History Logs)
  const filteredHistory = useMemo(() => {
    let result = [...historyLogs];

    if (debouncedHistorySearch.trim()) {
      const searchRegex = new RegExp(debouncedHistorySearch.trim(), "i");
      result = result.filter((log) => {
        const name = log.student?.user?.name || "";
        const adm = log.student?.admissionNo || "";
        const roll = log.student?.rollNo || "";
        return searchRegex.test(name) || searchRegex.test(adm) || searchRegex.test(roll);
      });
    }

    if (historyClassFilter !== "all") {
      result = result.filter((log) => {
        const oldClassId = log.oldClass?._id || log.oldClass;
        const newClassId = log.newClass?._id || log.newClass;
        return oldClassId === historyClassFilter || newClassId === historyClassFilter;
      });
    }

    if (historyAcademicYearFilter !== "all") {
      result = result.filter((log) => {
        return log.oldAcademicYear === historyAcademicYearFilter || log.newAcademicYear === historyAcademicYearFilter;
      });
    }

    return result;
  }, [historyLogs, debouncedHistorySearch, historyClassFilter, historyAcademicYearFilter]);

  // Derived history pagination
  const historyTotalCount = filteredHistory.length;
  const historyTotalPages = Math.ceil(historyTotalCount / historyRowsPerPage) || 1;
  const historyStartIndex = (historyPage - 1) * historyRowsPerPage;
  const historyEndIndex = historyStartIndex + historyRowsPerPage;
  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice(historyStartIndex, historyEndIndex);
  }, [filteredHistory, historyPage, historyRowsPerPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchTerm, historyClassFilter, historyAcademicYearFilter, historyRowsPerPage]);

  // Checkbox Selections
  const eligibleStudentsOnPage = useMemo(() => {
    return paginatedStudents.filter(s => s.isEligible);
  }, [paginatedStudents]);

  const selectedEligibleIdsOnPage = useMemo(() => {
    return selectedIds.filter(id => eligibleStudentsOnPage.some(s => s._id === id));
  }, [selectedIds, eligibleStudentsOnPage]);

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleToggleSelectPage = () => {
    if (classFilter === "all" || classFilter === "All" || !classFilter) {
      const classesOnPage = Array.from(new Set(eligibleStudentsOnPage.map(s => s.class?._id?.toString() || s.class?.toString())));
      if (classesOnPage.length > 1) {
        toast("Select a Current Class first. Bulk promotion works one class at a time.", {
          icon: '💡',
          duration: 3000,
          style: {
            background: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600'
          }
        });
        return;
      }
    }

    if (selectedEligibleIdsOnPage.length === eligibleStudentsOnPage.length && eligibleStudentsOnPage.length > 0) {
      setSelectedIds(prev => prev.filter(id => !eligibleStudentsOnPage.some(s => s._id === id)));
    } else {
      const newSelections = eligibleStudentsOnPage
        .map(s => s._id)
        .filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...newSelections]);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setAdmissionNoFilter("");
    setRollNoFilter("");
    setGenderFilter("all");
    setClassFilter("all");
    setSectionFilter("all");
    setStatusFilter("active");
    setAcademicYearFilter(currentSession || "all");
    setCurrentPage(1);
    setSelectedIds([]);
    toast.success("Promotion list filters reset");
  };

  const handleResetHistoryFilters = () => {
    setHistorySearchTerm("");
    setHistoryClassFilter("all");
    setHistoryAcademicYearFilter(currentSession || "all");
    setHistoryPage(1);
    toast.success("History filters reset");
  };

  // Sections for filters dropdown dynamically
  const classSections = useMemo(() => {
    if (classFilter === "all") return [];
    return allSections.filter(sec => sec.classId === classFilter);
  }, [classFilter, allSections]);

  // Modal Open Handlers
  const handleOpenSinglePromote = (student) => {
    setActiveStudent(student);
    setSingleTargetClass(student.nextClass?._id || "");
    setSingleTargetSection(student.defaultNextSection?._id || "");
    setSingleTargetSession(student.nextAcademicYear ? normalizeAcademicYear(student.nextAcademicYear) : "");
    setSingleRemarks("");
    setSingleNewRollNo(student.rollNo || "");
    openModal("single-promote-modal");
  };

  const handleOpenBulkPromote = () => {
    if (classFilter === "all" || classFilter === "All" || !classFilter) {
      toast("Please select a class from the Current Class filter before performing Bulk Promotion.", {
        icon: '💡',
        duration: 3000,
        style: {
          background: '#EFF6FF',
          color: '#1E40AF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("No students selected");
      return;
    }

    // Collect class IDs of all selected students
    const selectedStudents = studentsList.filter(s => selectedIds.includes(s._id));
    const classIds = selectedStudents.map(s => s.class?._id?.toString() || s.class?.toString());
    const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));

    if (uniqueClassIds.length > 1) {
      toast.error("Students from different classes cannot be promoted together. Please filter and select students from a single class first.");
      return;
    }

    const firstStudent = selectedStudents[0];
    if (firstStudent) {
      setBulkTargetClass(firstStudent.nextClass?._id || "");
      setBulkTargetSection(firstStudent.defaultNextSection?._id || "");
      setBulkTargetSession(firstStudent.nextAcademicYear ? normalizeAcademicYear(firstStudent.nextAcademicYear) : "");
    }
    const initialRolls = {};
    selectedStudents.forEach(s => {
      initialRolls[s._id] = s.rollNo || "";
    });
    setBulkNewRollNos(initialRolls);
    setBulkRemarks("");
    openModal("bulk-promote-modal");
  };

  const handleOpenStatusChange = (student) => {
    setActiveStudent(student);
    setStatusReason("Completed Final Grade (Class 12)");
    setStatusRemarks("");
    openModal("status-change-modal");
  };

  const availableTargetClasses = useMemo(() => {
    return classesList;
  }, [classesList]);

  const singleTargetClassSections = useMemo(() => {
    if (!singleTargetClass) return [];
    return allSections.filter(sec => sec.classId === singleTargetClass);
  }, [singleTargetClass, allSections]);

  const bulkTargetClassSections = useMemo(() => {
    if (!bulkTargetClass) return [];
    return allSections.filter(sec => sec.classId === bulkTargetClass);
  }, [bulkTargetClass, allSections]);

  // Action Submissions
  const handleConfirmSinglePromotion = async (e) => {
    e.preventDefault();
    if (!singleTargetClass || !singleTargetSection || !singleTargetSession || !singleNewRollNo) {
      toast.error("Please fill in all target academic details including the new roll number");
      return;
    }

    const rollNum = parseInt(singleNewRollNo, 10);
    if (isNaN(rollNum) || rollNum <= 0) {
      toast.error("Roll number must be a positive integer");
      return;
    }

    try {
      setSubmitLoading(true);
      const payload = {
        studentId: activeStudent._id,
        targetClass: singleTargetClass,
        targetSection: singleTargetSection,
        academicSession: normalizeAcademicYear(singleTargetSession),
        newRollNumber: singleNewRollNo,
        remarks: singleRemarks
      };
      const res = await promoteSingleStudent(payload);

      if (res.success) {
        toast.success(res.message || "Student promoted successfully!");
        closeModal("single-promote-modal");
        handleReloadAll();
      } else {
        toast.error(res.message || "Promotion failed");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmBulkPromotion = async (e) => {
    e.preventDefault();
    if (!bulkTargetClass || !bulkTargetSection || !bulkTargetSession) {
      toast.error("Please fill in target academic details");
      return;
    }

    // Double check single class constraint before calling API (protection)
    const selectedStudents = studentsList.filter(s => selectedIds.includes(s._id));
    const classIds = selectedStudents.map(s => s.class?._id?.toString() || s.class?.toString());
    const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));

    if (uniqueClassIds.length > 1) {
      toast.error("Bulk Promotion supports only one class at a time. Please select a single class.");
      return;
    }

    // Roll number validation
    const rolls = [];
    for (const s of selectedStudents) {
      const rollStr = bulkNewRollNos[s._id]?.toString().trim();
      if (!rollStr) {
        toast.error(`Please enter a new roll number for ${s.user?.name || s.name || "student"}`);
        return;
      }
      const rollNum = parseInt(rollStr, 10);
      if (isNaN(rollNum) || rollNum <= 0) {
        toast.error(`Roll number must be a positive integer for ${s.user?.name || s.name || "student"}`);
        return;
      }
      rolls.push(rollStr);
    }

    // Duplicate check in frontend
    const uniqueRolls = new Set(rolls);
    if (rolls.length !== uniqueRolls.size) {
      toast.error("Roll numbers must be unique.");
      return;
    }

    try {
      setSubmitLoading(true);
      const studentsPayload = selectedStudents.map(s => ({
        studentId: s._id,
        newRollNumber: bulkNewRollNos[s._id]
      }));

      const res = await promoteBulkStudents({
        students: studentsPayload,
        targetClass: bulkTargetClass,
        targetSection: bulkTargetSection,
        academicSession: normalizeAcademicYear(bulkTargetSession),
        remarks: bulkRemarks
      });

      if (res.success) {
        toast.success(res.message || "Bulk promotion completed!");
        setSelectedIds([]);
        closeModal("bulk-promote-modal");
        handleReloadAll();
      } else {
        toast.error(res.message || "Bulk promotion failed");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      const res = await markPassOut({
        studentId: activeStudent._id,
        reason: "Highest Class Completed",
        remarks: "Marked as Pass Out via highest class validation."
      });

      if (res.success) {
        toast.success(res.message || "Status updated successfully!");
        closeModal("status-change-modal");
        handleReloadAll();
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitLoading(false);
    }
  };

  const sessionOptions = useMemo(() => {
    const list = academicYears.map(y => normalizeAcademicYear(y.name));
    return Array.from(new Set(list)).sort((a, b) => b.localeCompare(a));
  }, [academicYears]);

  // Reusable DataTable Column Mapping (Promotion Directory)
  const promotionColumns = useMemo(() => [
    {
      key: "select",
      label: (
        <button
          type="button"
          onClick={handleToggleSelectPage}
          disabled={eligibleStudentsOnPage.length === 0}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
            selectedEligibleIdsOnPage.length === eligibleStudentsOnPage.length && eligibleStudentsOnPage.length > 0
              ? "bg-white border-white"
              : "bg-transparent border-white/40 hover:border-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          {selectedEligibleIdsOnPage.length === eligibleStudentsOnPage.length && eligibleStudentsOnPage.length > 0 && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#223F74" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ),
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />;
        const isSelected = selectedIds.includes(row.id);
        const isEligible = row._original?.isEligible;
        return (
          <button
            type="button"
            disabled={!isEligible}
            onClick={() => handleSelectRow(row.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
              isSelected
                ? "bg-[#223F74] border-[#223F74]"
                : isEligible
                ? "bg-white border-[#E2E8F0] hover:border-[#223F74]/60"
                : "bg-gray-100 border-gray-200 cursor-not-allowed opacity-30"
            }`}
          >
            {isSelected && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      }
    },
    {
      key: "photo",
      label: "Photo",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />;
        return (
          <img
            src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
            alt={row.studentName}
            className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
          />
        );
      }
    },
    {
      key: "admissionNo",
      label: "Admission No",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "rollNo",
      label: "Roll No",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "studentName",
      label: "Student Name",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />;
        return <span className="font-bold text-[#223F74]">{val}</span>;
      }
    },
    {
      key: "class",
      label: "Current Class",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "section",
      label: "Current Section",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "academicSession",
      label: "Academic Session",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "status",
      label: "Promotion Status",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />;
        const status = val || row._original?.promotionStatus || "Not Eligible";

        if (status === "Eligible") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle size={12} />
              Eligible
            </span>
          );
        } else if (status === "Promoted") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              <CheckCircle size={12} />
              Promoted
            </span>
          );
        } else if (status === "Pass Out") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8b5cf6]/10 text-[#8b5cf6]">
              <GraduationCap size={12} />
              Pass Out
            </span>
          );
        } else if (status === "MAX CLASS") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8b5cf6]/10 text-[#8b5cf6]">
              <AlertCircle size={12} />
              MAX CLASS
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle size={12} />
            Not Eligible
          </span>
        );
      }
    },
    {
      key: "action",
      label: "Action",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-8 w-16 bg-gray-200 rounded-xl mx-auto animate-pulse" />;
        const student = row._original;
        const status = student?.promotionStatus || "Not Eligible";
        return (
          <div className="text-center">
            {status === "MAX CLASS" ? (
              <button
                onClick={() => handleOpenStatusChange(student)}
                className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-sm transition"
              >
                Pass Out
              </button>
            ) : status === "Pass Out" ? (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-gray-400 bg-gray-100 rounded-xl">
                Completed
              </span>
            ) : status === "Eligible" || status === "Promoted" ? (
              <button
                onClick={() => handleOpenSinglePromote(student)}
                className="px-3.5 py-1.5 bg-[#223F74] text-white hover:bg-[#1a3360] font-bold text-xs rounded-xl shadow-sm transition"
              >
                {status === "Promoted" ? "Change Class" : "Promote"}
              </button>
            ) : (
              <span className="text-gray-400 text-xs font-semibold">—</span>
            )}
          </div>
        );
      }
    }
  ], [eligibleStudentsOnPage, selectedEligibleIdsOnPage, selectedIds]);

  const promotionRows = useMemo(() => {
    if (tableLoading) {
      return Array.from({ length: rowsPerPage }).map((_, idx) => ({
        id: `skeleton-${idx}`,
        isSkeleton: true,
        photo: null,
        admissionNo: null,
        rollNo: null,
        studentName: null,
        class: null,
        section: null,
        academicSession: null
      }));
    }
    return paginatedStudents.map((s) => ({
      _original: s,
      id: s._id,
      photo: s.photo || s.user?.photo,
      admissionNo: s.admissionNo || s.enrollmentNo || "—",
      rollNo: s.rollNo || "—",
      studentName: s.user?.name || s.name || "—",
      class: s.class?.name || "—",
      section: s.section?.name || "—",
      academicSession: s.academicYear || "—",
      status: s.promotionStatus || "—"
    }));
  }, [paginatedStudents, tableLoading, rowsPerPage]);

  // Reusable DataTable Column Mapping (History Logs)
  const historyColumns = useMemo(() => [
    {
      key: "photo",
      label: "Photo",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />;
        return (
          <img
            src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
            alt={row.studentName}
            className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
          />
        );
      }
    },
    {
      key: "studentName",
      label: "Student Name",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /> : <span className="font-bold text-[#223F74]">{val}</span>
    },
    {
      key: "admRoll",
      label: "Adm No / Roll",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />;
        return (
          <div className="text-xs font-bold text-gray-700">
            <div>Adm: {row.admissionNo}</div>
            <div>Roll: {row.rollNo}</div>
          </div>
        );
      }
    },
    {
      key: "prevAcademics",
      label: "Previous Academics",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />;
        return (
          <div className="text-xs font-semibold text-gray-700">
            <div className="font-bold">{row.oldClass} - {row.oldSection}</div>
            <div>Roll: {row.oldRoll || "—"}</div>
            <div className="text-slate-400">Session: {row.oldAcademicYear}</div>
          </div>
        );
      }
    },
    {
      key: "newAcademics",
      label: "New Academics",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />;
        if (row.actionType === "promote") {
          return (
            <div className="text-xs font-semibold text-gray-700">
              <div className="font-bold text-emerald-700">{row.newClass} - {row.newSection}</div>
              <div>Roll: {row.newRoll || "—"}</div>
              <div className="text-slate-400">Session: {row.newAcademicYear}</div>
            </div>
          );
        }
        return <span className="text-gray-400">—</span>;
      }
    },
    {
      key: "actionType",
      label: "Action Type",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />;
        if (val === "promote") {
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-semibold">PROMOTED</span>;
        } else if (val === "passout") {
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8b5cf6]/10 text-[#8b5cf6] font-semibold">PASS OUT</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-semibold">{val?.toUpperCase()}</span>;
      }
    },
    {
      key: "date",
      label: "Date",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "operator",
      label: "Operator",
      render: (val, row) => row.isSkeleton ? <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /> : val
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (val, row) => {
        if (row.isSkeleton) return <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />;
        return <span className="text-xs text-gray-500 italic max-w-[150px] truncate block" title={val}>{val || "—"}</span>;
      }
    }
  ], []);

  const historyRows = useMemo(() => {
    if (historyLoading) {
      return Array.from({ length: historyRowsPerPage }).map((_, idx) => ({
        id: `history-skeleton-${idx}`,
        isSkeleton: true
      }));
    }
    return paginatedHistory.map((log) => {
      const studentInfo = log.student || {};
      const userDetails = studentInfo.user || {};
      return {
        _original: log,
        id: log._id,
        photo: userDetails.photo,
        studentName: userDetails.name || "—",
        admissionNo: studentInfo.admissionNo || "—",
        rollNo: studentInfo.rollNo || "—",
        oldClass: log.oldClass?.name || "—",
        oldSection: log.oldSection?.name || "—",
        oldRoll: log.oldRoll || "—",
        oldAcademicYear: log.oldAcademicYear || "—",
        newClass: log.newClass?.name || "—",
        newSection: log.newSection?.name || "—",
        newRoll: log.newRoll || "—",
        newAcademicYear: log.newAcademicYear || "—",
        actionType: log.actionType,
        date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : "—",
        operator: log.promotedBy?.name || "System",
        remarks: log.remarks
      };
    });
  }, [paginatedHistory, historyLoading, historyRowsPerPage]);

  return (
    <div className="w-full space-y-6 text-left">
      {/* Header Subtabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveSubTab("promotion"); setSelectedIds([]); }}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeSubTab === "promotion" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <GraduationCap size={18} />
          Promote Students
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeSubTab === "history" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <History size={18} />
          Promotion History
        </button>
      </div>

      {activeSubTab === "promotion" ? (
        <>
          {/* Summary Cards */}
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard 
              title="Active Students" 
              value={stats.activeStudents} 
              icon={<Users size={20} />} 
              accentColor="#3b82f6" 
              size={4} 
            />
            <EnhancedDashCard 
              title="Eligible Students" 
              value={stats.eligibleForPromotion} 
              icon={<Award size={20} />} 
              accentColor="#6366f1" 
              size={4} 
            />
            <EnhancedDashCard 
              title="Pass Out" 
              value={stats.passOutStudents} 
              icon={<GraduationCap size={20} />} 
              accentColor="#8b5cf6" 
              size={4} 
            />
          </DashGrid>

          {/* Filters Panel */}
          <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={14} className="text-slate-400" />
                Filter Promotion Eligibility List
              </h4>
              <button 
                onClick={handleReloadAll} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-[#eef2f7] active:scale-95 transition text-xs font-bold text-gray-600 shadow-sm"
                title="Sync database from server"
              >
                <RefreshCw size={12} className={`${tableLoading ? "animate-spin" : ""}`} />
                Sync Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search Name / Roll / Admission No</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search by Name, Roll No, Adm No..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] focus:border-[#223F74] outline-none transition text-sm font-semibold text-gray-700 bg-gray-50/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Academic Session */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={academicYearFilter}
                  onChange={(e) => setAcademicYearFilter(e.target.value)}
                >
                  <option value="all">All Sessions</option>
                  {sessionOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Student Status */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Student Status</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="active">Active Only (Default)</option>
                  <option value="inactive">Inactive</option>
                  <option value="passout">Pass Out</option>
                  <option value="all">All</option>
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Class</label>
                 <select
                  ref={classFilterRef}
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classesList.map(cls => (
                    <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Section</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={classFilter === "all"}
                >
                  <option value="all">All Sections</option>
                  {classSections.map((sec) => (
                    <option key={sec._id} value={sec._id}>{sec.name}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Gender</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reset */}
              <div className="flex gap-2">
                <Button 
                  text="Reset Filters"
                  variant="secondary"
                  onClick={handleResetFilters}
                  className="flex-1 font-bold uppercase tracking-tight py-3"
                />
              </div>
            </div>

            {/* Sub-Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Admission Number</label>
                <input 
                  type="text"
                  placeholder="Filter by Admission No..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] outline-none text-sm font-semibold text-gray-700 bg-gray-50/50"
                  value={admissionNoFilter}
                  onChange={(e) => setAdmissionNoFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Roll Number</label>
                <input 
                  type="text"
                  placeholder="Filter by Roll No..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] outline-none text-sm font-semibold text-gray-700 bg-gray-50/50"
                  value={rollNoFilter}
                  onChange={(e) => setRollNoFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bulk Selection bar */}
          {selectedIds.length > 0 && (
            <div className="bg-[#223F74]/5 border border-[#223F74]/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-[#223F74] font-bold">
                <CheckSquare size={18} />
                <span>{selectedIds.length} eligible students selected for bulk action</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 border border-gray-200 rounded-xl bg-white font-bold text-xs text-gray-500 hover:bg-gray-100 transition"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleOpenBulkPromote}
                  className="px-4 py-2 rounded-xl bg-[#F59B87] text-white hover:bg-[#EC856D] font-bold text-xs shadow-md transition"
                >
                  Bulk Promote
                </button>
              </div>
            </div>
          )}

          {/* Promotion Directory Table Card - Styled via DataTable exactly like ManageStudents */}
          <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden promotion-directory-table">
            <style>{`
              .promotion-directory-table div.flex.flex-col > div.flex-wrap {
                display: none !important;
              }
            `}</style>

            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Promotion Directory</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="p-1.5 border border-gray-200 rounded-xl font-bold text-xs text-[#223F74] focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Empty State exactly like ManageStudents */}
            {filteredStudents.length === 0 && !tableLoading ? (
              <div className="p-12 text-center text-gray-400 bg-white border-t border-gray-100">
                <Users size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-sm">No Student Records Found</p>
              </div>
            ) : (
              <DataTable
                columns={promotionColumns}
                rows={promotionRows}
                searchable={false}
                hidePagination={true}
                hideRecordSummary={true}
                pageSize={10000}
              />
            )}

            {/* Table Pagination */}
            {!tableLoading && totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">
                  Showing{" "}
                  <span className="text-[#223F74] font-bold">
                    {(currentPage - 1) * rowsPerPage + 1}–
                    {Math.min(currentPage * rowsPerPage, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="text-[#223F74] font-bold">{totalCount}</span>{" "}
                  students
                </p>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 ${
                          currentPage === i + 1
                            ? "bg-[#223F74] text-white shadow"
                            : "border border-gray-200 bg-white text-gray-500 hover:bg-[#eef2f7]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* History Sub-tab contents */}
          <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Search History */}
              <div className="md:col-span-2 relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search Name / Admission / Roll No</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search history by name, admission no..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] outline-none text-sm font-semibold text-gray-700 bg-gray-50/50"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={historyClassFilter}
                  onChange={(e) => setHistoryClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classesList.map(cls => (
                    <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* Academic Year Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                  value={historyAcademicYearFilter}
                  onChange={(e) => setHistoryAcademicYearFilter(e.target.value)}
                >
                  <option value="all">All Sessions</option>
                  {sessionOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-1">
              <button 
                onClick={handleReloadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-[#eef2f7] active:scale-95 transition text-xs font-bold text-gray-600 shadow-sm"
                title="Sync database from server"
              >
                <RefreshCw size={12} className={`${historyLoading ? "animate-spin" : ""}`} />
                Sync History
              </button>
              <Button 
                text="Reset History Filters"
                variant="secondary"
                onClick={handleResetHistoryFilters}
                className="w-auto font-bold uppercase tracking-tight py-3"
              />
            </div>
          </div>

          {/* History Table Container - Styled via DataTable */}
          <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden history-log-table">
            <style>{`
              .history-log-table div.flex.flex-col > div.flex-wrap {
                display: none !important;
              }
            `}</style>

            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Promotion History Log</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Rows per page:</span>
                <select
                  value={historyRowsPerPage}
                  onChange={(e) => setHistoryRowsPerPage(Number(e.target.value))}
                  className="p-1.5 border border-gray-200 rounded-xl font-bold text-xs text-[#223F74] focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {historyTotalCount === 0 && !historyLoading ? (
              <div className="p-12 text-center text-gray-400 bg-white border-t border-gray-100">
                <Users size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-sm">No Promotion History Logged</p>
              </div>
            ) : (
              <DataTable
                columns={historyColumns}
                rows={historyRows}
                searchable={false}
                hidePagination={true}
                hideRecordSummary={true}
                pageSize={10000}
              />
            )}

            {/* History Pagination */}
            {!historyLoading && historyTotalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">
                  Showing{" "}
                  <span className="text-[#223F74] font-bold">
                    {(historyPage - 1) * historyRowsPerPage + 1}–
                    {Math.min(historyPage * historyRowsPerPage, historyTotalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="text-[#223F74] font-bold">{historyTotalCount}</span>{" "}
                  records
                </p>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: historyTotalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setHistoryPage(i + 1)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                          historyPage === i + 1
                            ? "bg-[#223F74] text-white shadow"
                            : "border border-gray-200 bg-white text-gray-500 hover:bg-[#eef2f7]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SINGLE PROMOTIONAL MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal id="single-promote-modal" title="Promote Student" size="md">
        {activeStudent && (
          <form onSubmit={handleConfirmSinglePromotion} className="p-6 space-y-4 text-left">
            {/* Student Info Summary */}
            <div className="bg-[#223F74]/5 p-4 rounded-2xl flex items-center gap-3">
              <img
                src={activeStudent.photo || activeStudent.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStudent.user?.name || activeStudent.name || "")}&background=223F74&color=fff`}
                alt="Student avatar"
                className="w-12 h-12 rounded-full object-cover border border-[#E7E2DB]"
              />
              <div>
                <h5 className="font-bold text-[#223F74]">{activeStudent.user?.name || activeStudent.name}</h5>
                <p className="text-xs text-gray-500 font-semibold">Adm No: {activeStudent.admissionNo || "—"} | Roll No: {activeStudent.rollNo || "—"}</p>
              </div>
            </div>

            {/* Current Academics */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Current Class</span>
                <span className="font-bold text-xs text-gray-700">{activeStudent.class?.name || "—"}</span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Current Section</span>
                <span className="font-bold text-xs text-gray-700">{activeStudent.section?.name || "—"}</span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Current Session</span>
                <span className="font-bold text-xs text-gray-700">{activeStudent.academicYear || "—"}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 my-4 pt-4">
              <h6 className="text-[10px] font-black text-[#223F74] uppercase tracking-widest mb-3">Target Academic Promotion Details</h6>
              
              <div className="space-y-3">
                {/* Target Class selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Promote to Class</label>
                  <select
                    required
                    value={singleTargetClass}
                    onChange={(e) => {
                      setSingleTargetClass(e.target.value);
                      const targetClassId = e.target.value;
                      const activeSecs = allSections.filter(s => s.classId === targetClassId);
                      const currentSecName = activeStudent.section?.name;
                      const matchingSec = activeSecs.find(s => s.name.toLowerCase() === currentSecName?.toLowerCase());
                      setSingleTargetSection(matchingSec?._id || activeSecs[0]?._id || "");
                    }}
                    className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none"
                  >
                    <option value="">Select target class...</option>
                    {availableTargetClasses.map(cls => (
                      <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target Section selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign Section</label>
                  <select
                    required
                    value={singleTargetSection}
                    onChange={(e) => setSingleTargetSection(e.target.value)}
                    disabled={!singleTargetClass || singleTargetClassSections.length === 0}
                    className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none disabled:opacity-50"
                  >
                    <option value="">Select target section...</option>
                    {singleTargetClassSections.map(sec => (
                      <option key={sec._id} value={sec._id}>{sec.name}</option>
                    ))}
                  </select>
                  {singleTargetClass && singleTargetClassSections.length === 0 && (
                    <p className="text-xs text-rose-500 font-bold mt-1.5">
                      No sections are available for the selected class.
                    </p>
                  )}
                </div>

                {/* Target Session selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
                  <select
                    required
                    value={singleTargetSession}
                    onChange={(e) => setSingleTargetSession(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none"
                  >
                    <option value="">Select target session...</option>
                    {sessionOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* New Roll Number input */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new roll number"
                    value={singleNewRollNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]+$/.test(val)) {
                        setSingleNewRollNo(val);
                      }
                    }}
                    className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Remarks / operator comments</label>
                  <textarea
                    placeholder="Enter promotion remarks (optional)..."
                    className="w-full p-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                    rows={2}
                    value={singleRemarks}
                    onChange={(e) => setSingleRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => closeModal("single-promote-modal")}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading || (singleTargetClass && singleTargetClassSections.length === 0)}
                className="px-5 py-2.5 rounded-xl bg-[#F59B87] text-white hover:bg-[#EC856D] font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitLoading && <Loader2 size={12} className="animate-spin" />}
                Confirm Promotion
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ──────────────────────────────────────────────────────── */}
      {/* BULK PROMOTION MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal id="bulk-promote-modal" title="Bulk Promote Students" size="md">
        <form onSubmit={handleConfirmBulkPromotion} className="p-6 space-y-4 text-left">
          {/* Summary Box */}
          <div className="bg-[#223F74]/5 p-4 rounded-2xl space-y-1">
            <h5 className="font-bold text-[#223F74] flex items-center gap-2 text-sm">
              <Users size={16} />
              Bulk Promoting {selectedIds.length} Students
            </h5>
            <p className="text-xs text-gray-500 font-semibold">
              Selected students will be transferred in bulk to the class, section, and academic year specified below.
            </p>
          </div>

          <div className="space-y-3">
            {/* Target Class selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Promote To Class</label>
              <select
                required
                value={bulkTargetClass}
                onChange={(e) => {
                  setBulkTargetClass(e.target.value);
                  const targetClassId = e.target.value;
                  const activeSecs = allSections.filter(s => s.classId === targetClassId);
                  setBulkTargetSection(activeSecs[0]?._id || "");
                }}
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none"
              >
                <option value="">Select target class...</option>
                {classesList.map(cls => (
                  <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Target Section selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign Section (Bulk)</label>
              <select
                required
                value={bulkTargetSection}
                onChange={(e) => setBulkTargetSection(e.target.value)}
                disabled={!bulkTargetClass || bulkTargetClassSections.length === 0}
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none disabled:opacity-50"
              >
                <option value="">Select target section...</option>
                {bulkTargetClassSections.map(sec => (
                  <option key={sec._id} value={sec._id}>{sec.name}</option>
                ))}
              </select>
              {bulkTargetClass && bulkTargetClassSections.length === 0 && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  No sections are available for the selected class.
                </p>
              )}
            </div>

            {/* Target Session selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
              <select
                required
                value={bulkTargetSession}
                onChange={(e) => setBulkTargetSession(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none"
              >
                <option value="">Select target session...</option>
                {sessionOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Assign Roll Numbers Section */}
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="mb-3">
                <h6 className="text-[10px] font-black text-[#223F74] uppercase tracking-widest">Assign Roll Numbers</h6>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2">Student Name</th>
                      <th className="px-4 py-2">Current Roll</th>
                      <th className="px-4 py-2 w-32">New Roll *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.filter(s => selectedIds.includes(s._id)).map(s => (
                      <tr key={s._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-bold text-[#223F74]">{s.user?.name || s.name}</td>
                        <td className="px-4 py-2 text-gray-500 font-semibold">{s.rollNo || "—"}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            required
                            placeholder="Roll No"
                            value={bulkNewRollNos[s._id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^[0-9]+$/.test(val)) {
                                setBulkNewRollNos(prev => ({
                                  ...prev,
                                  [s._id]: val
                                }));
                              }
                            }}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg font-bold text-xs text-gray-700 focus:ring-1 focus:ring-[#223F74] outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bulk Operator Remarks</label>
              <textarea
                placeholder="Enter remarks for the bulk promotion history..."
                className="w-full p-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                rows={2}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => closeModal("bulk-promote-modal")}
              className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading || (bulkTargetClass && bulkTargetClassSections.length === 0)}
              className="px-5 py-2.5 rounded-xl bg-[#F59B87] text-white hover:bg-[#EC856D] font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitLoading && <Loader2 size={12} className="animate-spin" />}
              Confirm Bulk Promotion
            </button>
          </div>
        </form>
      </Modal>

      {/* ──────────────────────────────────────────────────────── */}
      {/* PASS OUT MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal id="status-change-modal" title="Pass Out Student" size="md">
        {activeStudent && (
          <form onSubmit={handleConfirmStatusChange} className="p-6 space-y-4 text-left">
            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 p-4 rounded-2xl flex items-center gap-3">
              <img
                src={activeStudent.photo || activeStudent.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStudent.user?.name || activeStudent.name || "")}&background=223F74&color=fff`}
                alt="Student avatar"
                className="w-12 h-12 rounded-full object-cover border border-[#E7E2DB]"
              />
              <div>
                <h5 className="font-bold text-[#223F74]">{activeStudent.user?.name || activeStudent.name}</h5>
                <p className="text-xs text-gray-500 font-semibold">Adm No: {activeStudent.admissionNo || "—"} | Current Grade: {activeStudent.class?.name || "—"}</p>
              </div>
            </div>

            <div className="py-2">
              <p className="text-sm font-bold text-gray-700">
                This student has reached the highest class available in the school.
              </p>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Do you want to mark the student as Pass Out?
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => closeModal("status-change-modal")}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] text-white hover:bg-[#7c3aed] font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitLoading && <Loader2 size={12} className="animate-spin" />}
                Confirm Pass Out
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PromoteStudents;
