import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Download,
  History,
  FileText,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  UserCheck,
  FileCheck,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// API
import {
  getEligibleStudents,
  getPendingRequests,
  getTransferHistory,
  generateTC,
  approveRequest,
  rejectRequest,
  transferStudent,
  getTransferDetails,
  getTransferStats,
  getAvailableSchools,
  getClassesAndSections,
} from "../../../services/api/adminTransferApi";
import { fetchAcademicYears } from "../../../services/classesApi";

// COMMON COMPONENTS
import {
  Heading,
  EnhancedDashCard,
  DashGrid,
  DataTable,
  Modal,
  openModal,
  closeModal,
  DataField,
  Button,
  Option,
  SelectField,
  Grid,
} from "../../../components/shared/Common_Components";

// Academic Year Normalization (identical to ManageStudents)
const normalizeAcademicYear = (yearStr) => {
  if (!yearStr) return "";
  const clean = yearStr.trim().replace(/[\u2013\u2014]/g, "-");
  const parts = clean.split("-");
  if (parts.length !== 2) return yearStr;

  const startYearStr = parts[0].trim();
  const endYearStr = parts[1].trim();

  if (startYearStr.length === 4) {
    if (endYearStr.length === 4) {
      return `${startYearStr}–${endYearStr}`;
    } else if (endYearStr.length === 2) {
      const century = startYearStr.slice(0, 2);
      return `${startYearStr}–${century}${endYearStr}`;
    }
  }
  return yearStr;
};

const TransferHub = () => {
  const authUser = useSelector((state) => state.adminAuth.authUser);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tc-eligible");

  // Dashboard Statistics State
  const [stats, setStats] = useState({
    eligibleStudents: 0,
    pendingRequests: 0,
    approvedTc: 0,
    totalTransferred: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Metadata Lists
  const [classesList, setClassesList] = useState([]);
  const [schoolsList, setSchoolsList] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentSession, setCurrentSession] = useState("");

  // Loading indicator for active tab list fetching
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Raw Database Lists loaded once per active tab
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);

  // Modal Interactive States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTC, setSelectedTC] = useState(null);
  const [loadingAction, setLoadingAction] = useState({ id: null, type: null });

  // ─── TAB 1: FILTERS (TC ELIGIBLE) ─────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [admissionFeeStatusFilter, setAdmissionFeeStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // ─── TAB 2: FILTERS (PENDING REQUESTS) ────────────────────────────────────
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingClassId, setPendingClassId] = useState("all");
  const [pendingSectionId, setPendingSectionId] = useState("all");

  // ─── TAB 3: FILTERS (TRANSFER HISTORY) ────────────────────────────────────
  const [historySearch, setHistorySearch] = useState("");
  const [historyClassId, setHistoryClassId] = useState("all");
  const [historyAcademicYear, setHistoryAcademicYear] = useState("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  // Modal Form States
  const [tcForm, setTcForm] = useState({
    tcNumber: "",
    transferReason: "Relocation",
    customReason: "",
    leavingDate: new Date().toISOString().split("T")[0],
    conduct: "Good",
    characterCertificate: true,
    remarks: "",
    issueDate: new Date().toISOString().split("T")[0],
    transferredTo: "",
  });

  const [transferForm, setTransferForm] = useState({
    targetSchoolId: "",
    destinationSchool: "",
    reason: "Branch Transfer",
  });

  const [requestActionForm, setRequestActionForm] = useState({
    remarks: "",
  });

  // ─── FETCH STATISTICS ────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getTransferStats();
      if (res.success && res.data) {
        setStats({
          eligibleStudents: res.data.eligibleStudents || 0,
          pendingRequests: res.data.pendingRequests || 0,
          approvedTc: res.data.approvedTc || 0,
          totalTransferred: res.data.totalTransferred || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─── DATA FETCHERS (LOAD ALL TO CLIENT ON MOUNT/TAB CHANGE) ──────────────
  const fetchEligibleStudentsList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getEligibleStudents({ page: 1, limit: 10000 });
      if (res.success && res.data) {
        setStudents(res.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Eligible students fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequestsList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPendingRequests({ page: 1, limit: 10000 });
      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Pending requests fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistoryList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTransferHistory({ page: 1, limit: 10000 });
      if (res.success && res.data) {
        setHistory(res.data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger statistics & initial tab list fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Load lists dynamically when activeTab changes
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === "tc-eligible") {
      fetchEligibleStudentsList();
    } else if (activeTab === "pending") {
      fetchPendingRequestsList();
    } else if (activeTab === "history") {
      fetchHistoryList();
    }
  }, [activeTab, fetchEligibleStudentsList, fetchPendingRequestsList, fetchHistoryList]);

  // Reset pagination on filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    classFilter,
    sectionFilter,
    academicYearFilter,
    statusFilter,
    admissionFeeStatusFilter,
    genderFilter,
    startDateFilter,
    endDateFilter,
    pendingSearch,
    pendingClassId,
    pendingSectionId,
    historySearch,
    historyClassId,
    historyAcademicYear,
    historyStartDate,
    historyEndDate,
    rowsPerPage,
  ]);

  // ─── LOAD METADATA (ONCE ON MOUNT) ────────────────────────────────────────
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const classRes = await getClassesAndSections();
        if (classRes.success && Array.isArray(classRes.data)) {
          const uniqueClasses = [];
          const seenIds = new Set();
          const seenNames = new Set();
          classRes.data.forEach((cls) => {
            if (!cls || (!cls._id && !cls.id) || !cls.name) return;
            const clsId = cls.id || cls._id;
            const normalizedName = cls.name.trim().toLowerCase().replace(/\s+/g, " ");
            if (!seenIds.has(clsId) && !seenNames.has(normalizedName)) {
              seenIds.add(clsId);
              seenNames.add(normalizedName);
              uniqueClasses.push(cls);
            }
          });
          uniqueClasses.sort((a, b) => {
            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
          });
          setClassesList(uniqueClasses);
        }
        const schoolRes = await getAvailableSchools();
        if (schoolRes.success && Array.isArray(schoolRes.data)) {
          setSchoolsList(schoolRes.data);
        }
      } catch (error) {
        console.error("Failed to load metadata:", error);
      }
    };

    const loadSessionData = async () => {
      try {
        let years = [];
        let currentYear = null;
        try {
          const response = await fetchAcademicYears();
          const res = response?.data;
          if (res && res.success && Array.isArray(res.data)) {
            years = res.data.map((y, idx) => ({
              name: normalizeAcademicYear(y),
              status: idx === 0 ? "Active" : "Inactive",
            }));
            currentYear = years[0];
          }
        } catch (apiErr) {
          console.warn("fetchAcademicYears failed, fallback used", apiErr);
        }

        if (!years || years.length === 0) {
          years = [];
          const currentYearNum = new Date().getFullYear();
          for (let i = 0; i < 5; i++) {
            const startYear = currentYearNum - i;
            const endYear = startYear + 1;
            years.push({
              name: `${startYear}–${endYear}`,
              status: i === 0 ? "Active" : "Inactive",
            });
          }
          currentYear = years[0];
        }

        setAcademicYears(years);
        const activeYear = currentYear || years.find((y) => y.status === "Active");
        if (activeYear) {
          setCurrentSession(normalizeAcademicYear(activeYear.name));
          setAcademicYearFilter(normalizeAcademicYear(activeYear.name));
          setHistoryAcademicYear(normalizeAcademicYear(activeYear.name));
        }
      } catch (err) {
        console.error("Session load error:", err);
      }
    };

    loadMetadata();
    loadSessionData();
  }, []);

  // ─── DERIVED SECTIONS BASED ON SELECTED CLASS FILTER ──────────────────────
  const classSections = useMemo(() => {
    if (classFilter === "all") return [];
    const cls = classesList.find((c) => c.id === classFilter || c._id === classFilter);
    return cls?.sections || [];
  }, [classFilter, classesList]);

  const pendingSections = useMemo(() => {
    if (pendingClassId === "all") return [];
    const cls = classesList.find((c) => c.id === pendingClassId || c._id === pendingClassId);
    return cls?.sections || [];
  }, [pendingClassId, classesList]);

  // Derived sessions options
  const sessionOptions = useMemo(() => {
    const names = academicYears.map((y) => normalizeAcademicYear(y.name)).filter(Boolean);
    if (currentSession) {
      const normalizedCurrent = normalizeAcademicYear(currentSession);
      if (!names.includes(normalizedCurrent)) {
        names.push(normalizedCurrent);
      }
    }
    const uniqueNames = Array.from(new Set(names));
    uniqueNames.sort((a, b) => {
      const yearA = parseInt(a.split("–")[0], 10);
      const yearB = parseInt(b.split("–")[0], 10);
      if (!isNaN(yearA) && !isNaN(yearB)) {
        return yearB - yearA;
      }
      return b.localeCompare(a);
    });
    return uniqueNames;
  }, [academicYears, currentSession]);

  // ─── CLIENT-SIDE IN-MEMORY FILTERING & PACING ────────────────────────────
  
  // Tab 1 Filter logic
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      result = result.filter((s) => {
        const name = s.user?.name || s.name || "";
        const parentFather = s.parent?.fatherName || "";
        const parentMother = s.parent?.motherName || "";
        const rollNo = s.rollNo || "";
        const enrollmentNo = s.enrollmentNo || s.admissionNo || "";
        const phone = s.phone || s.parent?.primaryContact || "";
        return (
          searchRegex.test(name) ||
          searchRegex.test(parentFather) ||
          searchRegex.test(parentMother) ||
          searchRegex.test(rollNo) ||
          searchRegex.test(enrollmentNo) ||
          searchRegex.test(phone)
        );
      });
    }

    if (classFilter !== "all" && classFilter !== "All") {
      result = result.filter((s) => {
        const classId = s.class?._id || s.class?.id || s.class;
        return classId === classFilter;
      });
    }

    if (sectionFilter !== "all" && sectionFilter !== "All") {
      result = result.filter((s) => {
        const sectionId = s.section?._id || s.section?.id || s.section;
        return sectionId === sectionFilter;
      });
    }

    if (genderFilter !== "all" && genderFilter !== "All") {
      result = result.filter((s) => s.gender?.toLowerCase() === genderFilter.toLowerCase());
    }

    if (statusFilter !== "all" && statusFilter !== "All") {
      result = result.filter((s) => s.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (admissionFeeStatusFilter !== "all" && admissionFeeStatusFilter !== "All") {
      result = result.filter((s) => s.admissionFeeStatus?.toLowerCase() === admissionFeeStatusFilter.toLowerCase());
    }

    if (academicYearFilter !== "all" && academicYearFilter !== "All") {
      result = result.filter((s) => normalizeAcademicYear(s.academicYear) === normalizeAcademicYear(academicYearFilter));
    }

    if (startDateFilter) {
      const start = new Date(startDateFilter);
      result = result.filter((s) => s.admissionDate && new Date(s.admissionDate) >= start);
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => s.admissionDate && new Date(s.admissionDate) <= end);
    }

    return result;
  }, [students, searchTerm, classFilter, sectionFilter, genderFilter, statusFilter, admissionFeeStatusFilter, academicYearFilter, startDateFilter, endDateFilter]);

  // Tab 2 Filter logic
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (pendingSearch.trim()) {
      const searchRegex = new RegExp(pendingSearch.trim(), "i");
      result = result.filter((r) => {
        const studentName = r.student?.user?.name || r.student?.name || "";
        const enrollmentNo = r.student?.enrollmentNo || r.student?.admissionNo || "";
        const requestedBy = r.requestedBy || "";
        const reason = r.reason || "";
        return (
          searchRegex.test(studentName) ||
          searchRegex.test(enrollmentNo) ||
          searchRegex.test(requestedBy) ||
          searchRegex.test(reason)
        );
      });
    }

    if (pendingClassId !== "all" && pendingClassId !== "All") {
      result = result.filter((r) => {
        const classId = r.student?.class?._id || r.student?.class?.id || r.student?.class;
        return classId === pendingClassId;
      });
    }

    if (pendingSectionId !== "all" && pendingSectionId !== "All") {
      result = result.filter((r) => {
        const sectionId = r.student?.section?._id || r.student?.section?.id || r.student?.section;
        return sectionId === pendingSectionId;
      });
    }

    return result;
  }, [requests, pendingSearch, pendingClassId, pendingSectionId]);

  // Tab 3 Filter logic
  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (historySearch.trim()) {
      const searchRegex = new RegExp(historySearch.trim(), "i");
      result = result.filter((h) => {
        const studentName = h.student?.user?.name || h.student?.fullName || h.student?.name || "";
        const enrollmentNo = h.student?.enrollmentNo || h.student?.admissionNo || "";
        const tcNumber = h.tcNumber || "";
        const reason = h.transferReason || h.reason || "";
        const destination = h.transferredTo || h.destinationSchool || "";
        return (
          searchRegex.test(studentName) ||
          searchRegex.test(enrollmentNo) ||
          searchRegex.test(tcNumber) ||
          searchRegex.test(reason) ||
          searchRegex.test(destination)
        );
      });
    }

    if (historyClassId !== "all" && historyClassId !== "All") {
      result = result.filter((h) => {
        const classId = h.student?.class?._id || h.student?.class?.id || h.student?.class || h.classAtWithdrawal;
        return classId === historyClassId;
      });
    }

    if (historyAcademicYear !== "all" && historyAcademicYear !== "All") {
      result = result.filter((h) => {
        const academicYear = h.student?.academicYear || h.academicYear;
        return normalizeAcademicYear(academicYear) === normalizeAcademicYear(historyAcademicYear);
      });
    }

    if (historyStartDate) {
      const start = new Date(historyStartDate);
      result = result.filter((h) => h.issueDate && new Date(h.issueDate) >= start);
    }
    if (historyEndDate) {
      const end = new Date(historyEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((h) => h.issueDate && new Date(h.issueDate) <= end);
    }

    return result;
  }, [history, historySearch, historyClassId, historyAcademicYear, historyStartDate, historyEndDate]);

  // PAGINATION CONTROLS
  const activeFilteredList = useMemo(() => {
    if (activeTab === "tc-eligible") return filteredStudents;
    if (activeTab === "pending") return filteredRequests;
    return filteredHistory;
  }, [activeTab, filteredStudents, filteredRequests, filteredHistory]);

  const totalCount = activeFilteredList.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedData = useMemo(() => {
    return activeFilteredList.slice(startIndex, endIndex);
  }, [activeFilteredList, startIndex, endIndex]);

  // ─── RESET FILTER CALLS ──────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchTerm("");
    setClassFilter("all");
    setSectionFilter("all");
    setGenderFilter("all");
    setStatusFilter("all");
    setAdmissionFeeStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAcademicYearFilter(currentSession || "all");
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  const handleResetPendingFilters = () => {
    setPendingSearch("");
    setPendingClassId("all");
    setPendingSectionId("all");
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  const handleResetHistoryFilters = () => {
    setHistorySearch("");
    setHistoryClassId("all");
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistoryAcademicYear(currentSession || "all");
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  // ─── PHOTO RESOLVING HELPER ──────────────────────────────────────────────
  const getStudentPhoto = (student) => {
    return (
      student?.photo ||
      student?.profilePhoto ||
      student?.studentPhoto ||
      student?.user?.photo ||
      student?.user?.profileImage ||
      ""
    );
  };

  // ─── TABLE ROW CONFIGURATIONS (MEMOIZED WITH SKELETON RECOGNITION) ────────
  
  // Tab 1 Columns (TC Eligible)
  const eligibleColumns = [
    { key: "photo", label: "Photo", render: (val, row) => row.isSkeleton ? (
      <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse border border-[#E7E2DB]" />
    ) : (
      <img
        src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
        alt={row.studentName}
        className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
      />
    )},
    { key: "admissionNo", label: "Admission No", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "rollNo", label: "Roll No", render: (val, row) => row.isSkeleton ? <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "studentName", label: "Student Name", render: (val, row) => row.isSkeleton ? <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /> : <div className="font-bold text-slate-800">{val}</div> },
    { key: "class", label: "Class", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "section", label: "Section", render: (val, row) => row.isSkeleton ? <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "academicSession", label: "Academic Session", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "studentStatus", label: "Student Status", render: (val, row) => {
      if (row.isSkeleton) return <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />;
      const st = val?.toUpperCase() || "ACTIVE";
      const colors = {
        ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
        INACTIVE: "bg-amber-50 text-amber-700 border-amber-200",
        PASSOUT: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
      return (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${colors[st.replace(" ", "")] || "bg-slate-50 text-slate-700"}`}>
          {st}
        </span>
      );
    }},
    { key: "parentName", label: "Parent Name", render: (val, row) => row.isSkeleton ? <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "mobile", label: "Mobile", render: (val, row) => row.isSkeleton ? <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "admissionDate", label: "Admission Date", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
  ];

  // Tab 2 Columns (Pending Requests)
  const pendingColumns = [
    { key: "studentPhoto", label: "Photo", render: (val, row) => row.isSkeleton ? (
      <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse border border-[#E7E2DB]" />
    ) : (
      <img
        src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
        alt={row.studentName}
        className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
      />
    )},
    { key: "studentName", label: "Student", render: (val, row) => row.isSkeleton ? <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /> : (
      <div>
        <div className="font-bold text-slate-800">{val}</div>
        <div className="text-xs text-slate-400">Adm: {row.admissionNo}</div>
      </div>
    )},
    { key: "classSec", label: "Class", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "requestedBy", label: "Requested By", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : <span className="font-semibold text-slate-700">{val}</span> },
    { key: "reason", label: "Reason", render: (val, row) => row.isSkeleton ? <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" /> : <span className="text-slate-500 line-clamp-1 max-w-xs">{val}</span> },
    { key: "requestedDate", label: "Requested Date", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "status", label: "Status", render: (val, row) => {
      if (row.isSkeleton) return <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />;
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
          {val}
        </span>
      );
    }},
  ];

  // Tab 3 Columns (Transfer History)
  const historyColumns = [
    { key: "tcNumber", label: "TC Number", render: (val, row) => row.isSkeleton ? <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" /> : (
      <span className="font-mono font-black text-blue-900 text-sm tracking-tight">{val}</span>
    )},
    { key: "studentPhoto", label: "Photo", render: (val, row) => row.isSkeleton ? (
      <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse border border-[#E7E2DB]" />
    ) : (
      <img
        src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
        alt={row.studentName}
        className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
      />
    )},
    { key: "studentName", label: "Student", render: (val, row) => row.isSkeleton ? <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /> : (
      <div>
        <div className="font-bold text-slate-800">{val}</div>
        <div className="text-xs text-slate-400">Adm: {row.admissionNo}</div>
      </div>
    )},
    { key: "class", label: "Class", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "section", label: "Section", render: (val, row) => row.isSkeleton ? <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "transferredTo", label: "Transferred To", render: (val, row) => row.isSkeleton ? <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "reason", label: "Reason", render: (val, row) => row.isSkeleton ? <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "issuedBy", label: "Issued By", render: (val, row) => row.isSkeleton ? <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /> : val },
    { key: "issueDate", label: "Issue Date", render: (val, row) => row.isSkeleton ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /> : val },
  ];

  // Mapping actual lists to DataTable rows (or skeletons if loading)
  const tableRows = useMemo(() => {
    if (loading) {
      return Array.from({ length: rowsPerPage }).map((_, idx) => ({
        id: `skeleton-${idx}`,
        isSkeleton: true,
      }));
    }

    if (activeTab === "tc-eligible") {
      return paginatedData.map((s) => {
        const p = s.parent || {};
        return {
          _original: s,
          id: s._id,
          photo: getStudentPhoto(s),
          studentName: s.user?.name || s.name || "—",
          admissionNo: s.admissionNo || s.enrollmentNo || "—",
          rollNo: s.rollNo || "—",
          class: s.class?.name || "—",
          section: s.section?.name || "—",
          academicSession: s.academicYear || "—",
          studentStatus: s.status || "active",
          admissionStatus: s.admissionFeeStatus || "paid",
          parentName: p.user?.name || p.fatherName || p.motherName || "—",
          mobile: p.primaryContact || s.user?.phone || "—",
          admissionDate: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : "—",
        };
      });
    }

    if (activeTab === "pending") {
      return paginatedData.map((r) => {
        const student = r.student || {};
        return {
          _original: r,
          id: r._id,
          studentPhoto: getStudentPhoto(student),
          studentName: student.user?.name || student.name || "—",
          admissionNo: student.admissionNo || student.enrollmentNo || "—",
          classSec: student.class?.name ? (student.section?.name ? `${student.class.name} - ${student.section.name}` : student.class.name) : "—",
          requestedBy: r.requestedBy || "Parent",
          reason: r.reason || "—",
          requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
          status: r.status || "Pending",
        };
      });
    }

    // Transfer History rows
    return paginatedData.map((h) => {
      const student = h.student || {};
      return {
        _original: h,
        id: h._id,
        tcNumber: h.tcNumber || "—",
        studentPhoto: getStudentPhoto(student),
        studentName: student.user?.name || h.studentName || "—",
        admissionNo: student.admissionNo || h.admissionNumber || "—",
        class: student.class?.name || h.classAtWithdrawal || "—",
        section: student.section?.name || h.sectionAtWithdrawal || "—",
        transferredTo: h.transferredTo || h.destinationSchool || "—",
        reason: h.transferReason || h.reason || "—",
        issuedBy: h.issuedBy?.name || "Administrator",
        issueDate: h.issueDate ? new Date(h.issueDate).toLocaleDateString() : "—",
      };
    });
  }, [loading, paginatedData, activeTab, rowsPerPage]);

  // Memoized Table Actions
  const tableActions = useMemo(() => {
    if (loading) return [];

    if (activeTab === "tc-eligible") {
      return [
        {
          label: "View Profile",
          variant: "ghost",
          onClick: (row) => handleViewProfile(row._original),
        },
        {
          label: "Generate TC",
          variant: "ghost",
          onClick: (row) => handleOpenGenerateTC(row._original),
        },
        {
          label: "Transfer Student",
          variant: "ghost",
          onClick: (row) => handleOpenTransfer(row._original),
        },
      ];
    }

    if (activeTab === "pending") {
      return [
        {
          icon: <Eye size={16} />,
          tooltip: "View & Process Request",
          variant: "ghost",
          onClick: (row) => handleOpenRequestDetails(row._original),
        },
      ];
    }

    // history
    return [
      {
        icon: <Eye size={16} />,
        tooltip: "View / Print TC",
        variant: "ghost",
        loading: (row) => loadingAction.id === row._original._id && loadingAction.type === "preview",
        onClick: (row) => handlePreviewTC(row._original),
      },
      {
        icon: <Download size={16} />,
        tooltip: "Download PDF",
        variant: "ghost",
        onClick: (row) => handleDownloadTC(row._original),
      },
    ];
  }, [loading, activeTab, loadingAction]);

  // ─── MODAL CONTROLS & تصمیم ACTIONS ──────────────────────────────────────
  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    openModal("student-profile-modal");
  };

  const handleOpenGenerateTC = (student) => {
    setSelectedStudent(student);
    setTcForm({
      tcNumber: "",
      transferReason: "Relocation",
      customReason: "",
      leavingDate: new Date().toISOString().split("T")[0],
      conduct: "Good",
      characterCertificate: true,
      remarks: "",
      issueDate: new Date().toISOString().split("T")[0],
      transferredTo: "",
    });
    openModal("generate-tc-modal");
  };

  const handleProcessGenerateTC = async (e) => {
    e.preventDefault();
    const finalReason = tcForm.transferReason === "Other" ? tcForm.customReason : tcForm.transferReason;
    if (!finalReason) {
      return toast.error("Please specify a transfer reason");
    }

    try {
      setLoadingAction({ id: selectedStudent?._id, type: "generate" });
      const payload = {
        studentId: selectedStudent?._id,
        tcNumber: tcForm.tcNumber || undefined,
        transferReason: finalReason,
        leavingDate: tcForm.leavingDate,
        conduct: tcForm.conduct,
        characterCertificate: tcForm.characterCertificate,
        remarks: tcForm.remarks,
        issueDate: tcForm.issueDate,
        transferredTo: tcForm.transferredTo,
      };

      const res = await generateTC(payload);
      if (res.success) {
        toast.success("Transfer Certificate generated successfully!");
        closeModal("generate-tc-modal");
        
        fetchStats();
        fetchEligibleStudentsList();

        const details = await getTransferDetails(res.data._id);
        if (details.success && details.data) {
          setSelectedTC(details.data);
          openModal("tc-preview-modal");
        }
      } else {
        toast.error(res.message || "Failed to generate TC");
      }
    } catch (err) {
      toast.error("An error occurred during TC generation");
    } finally {
      setLoadingAction({ id: null, type: null });
    }
  };

  const handleOpenTransfer = (student) => {
    setSelectedStudent(student);
    setTransferForm({
      targetSchoolId: "",
      destinationSchool: "",
      reason: "Branch Transfer",
    });
    openModal("transfer-student-modal");
  };

  const handleProcessTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.targetSchoolId && !transferForm.destinationSchool) {
      return toast.error("Please select a target branch or type a destination school");
    }

    try {
      setLoadingAction({ id: selectedStudent?._id, type: "transfer" });
      const payload = {
        studentId: selectedStudent?._id,
        targetSchoolId: transferForm.targetSchoolId || undefined,
        destinationSchool: transferForm.destinationSchool || undefined,
        reason: transferForm.reason,
      };

      const res = await transferStudent(payload);
      if (res.success) {
        toast.success("Student transferred successfully & TC issued!");
        closeModal("transfer-student-modal");
        fetchStats();
        fetchEligibleStudentsList();

        const details = await getTransferDetails(res.data._id);
        if (details.success && details.data) {
          setSelectedTC(details.data);
          openModal("tc-preview-modal");
        }
      } else {
        toast.error(res.message || "Transfer failed");
      }
    } catch (error) {
      toast.error("An error occurred during transfer");
    } finally {
      setLoadingAction({ id: null, type: null });
    }
  };

  const handleOpenRequestDetails = (request) => {
    setSelectedRequest(request);
    setRequestActionForm({ remarks: "" });
    openModal("request-details-modal");
  };

  const handleRequestAction = async (status) => {
    try {
      setLoadingAction({ id: selectedRequest?._id, type: status.toLowerCase() });
      let res;
      if (status === "Approve") {
        res = await approveRequest(selectedRequest?._id, { remarks: requestActionForm.remarks });
      } else {
        res = await rejectRequest(selectedRequest?._id, { remarks: requestActionForm.remarks });
      }

      if (res.success) {
        toast.success(`Request ${status}d successfully!`);
        closeModal("request-details-modal");
        fetchStats();
        fetchPendingRequestsList();
      } else {
        toast.error(res.message || `Failed to ${status.toLowerCase()} request`);
      }
    } catch (error) {
      toast.error("An error occurred processing the request");
    } finally {
      setLoadingAction({ id: null, type: null });
    }
  };

  const handlePreviewTC = async (row) => {
    setLoadingAction({ id: row._id, type: "preview" });
    try {
      const res = await getTransferDetails(row._id);
      if (res.success && res.data) {
        setSelectedTC(res.data);
        openModal("tc-preview-modal");
      } else {
        toast.error("Could not fetch certificate details");
      }
    } catch (error) {
      toast.error("Failed to load certificate");
    } finally {
      setLoadingAction({ id: null, type: null });
    }
  };

  // ─── PDF EXPORT CONTROLS ────────────────────────────────────────────────
  const handleDownloadTC = async (tc) => {
    const toastId = toast.loading("Generating PDF certificate...");
    try {
      const element = document.getElementById("tc-document-download-admin");
      if (!element) {
        throw new Error("TC preview container not found in DOM");
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`TC_${tc?.tcNumber || "Document"}.pdf`);
      toast.success("PDF Downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  const handlePrintTC = (elementId) => {
    const content = document.getElementById(elementId);
    if (!content) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Transfer Certificate</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { background: white; color: black; font-family: sans-serif; }
            @media print {
              body { padding: 0; margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="p-6 flex justify-center items-center">
          <div>
            ${content.outerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── RENDER TC PREVIEW PANEL ─────────────────────────────────────────────
  const renderTCDocument = (tcData, targetId) => {
    if (!tcData) return null;
    const logoUrl = tcData.school?.organization?.organizationLogo || tcData.school?.logoUrl || tcData.school?.logo;
    const schoolName = tcData.school?.organization?.organizationName || tcData.school?.schoolName || tcData.school?.name || "Graphura International School";
    const schoolAddress = tcData.school?.address || "123 Academic Block, Education City";
    const contactInfo = [tcData.school?.officialPhone, tcData.school?.officialEmail, tcData.school?.website].filter(Boolean).join(" | ") || "info@graphuraschool.com | www.graphura.com";

    return (
      <div
        id={targetId}
        className="border-[12px] border-double border-blue-900 p-12 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between items-center bg-white text-left shadow-sm relative"
        style={{ boxSizing: "border-box" }}
      >
        <div className="absolute inset-2 border-2 border-amber-500/20 pointer-events-none" />

        <div className="w-full flex flex-col items-center border-b-2 border-blue-900/10 pb-6 mb-8 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" className="w-20 h-20 object-contain mb-3" />
          ) : (
            <div className="w-20 h-20 bg-blue-950 rounded-2xl mb-3 flex items-center justify-center text-white font-black text-3xl italic shadow-md">
              {schoolName.substring(0, 1)}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-blue-950 uppercase tracking-tight">
            {schoolName}
          </h1>
          {schoolAddress && (
            <p className="text-xs text-gray-500 font-semibold uppercase mt-1">
              {schoolAddress}
            </p>
          )}
          {contactInfo && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              {contactInfo}
            </p>
          )}
          <div className="mt-6 flex flex-col items-center">
            <h2 className="text-2xl font-black text-blue-900 tracking-tighter uppercase">
              Transfer Certificate
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              (Migration / School Leaving Certificate)
            </p>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-y-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              TC Number
            </span>
            <span className="text-xl font-mono font-black text-blue-700">
              {tcData.tcNumber}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Issue Date
            </span>
            <span className="text-base font-bold text-gray-800">
              {new Date(tcData.issueDate || tcData.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="col-span-2 border border-gray-200 rounded-3xl overflow-hidden bg-slate-50/50 p-6 grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Student Name
              </span>
              <span className="text-base font-black text-gray-800 uppercase">
                {tcData.student?.user?.name || tcData.student?.fullName || "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Admission No
              </span>
              <span className="text-base font-black text-gray-755">
                {tcData.student?.enrollmentNo || tcData.student?.admissionNo || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Class
              </span>
              <span className="text-base font-bold text-gray-755 uppercase">
                {tcData.student?.class?.name || tcData.classAtWithdrawal || "—"}{tcData.student?.section?.name ? ` - ${tcData.student.section.name}` : ""}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Date of Leaving
              </span>
              <span className="text-base font-bold text-gray-755">
                {new Date(tcData.leavingDate || tcData.transferDate || new Date()).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Reason for Leaving
              </span>
              <span className="text-base font-bold text-gray-755">
                {tcData.transferReason || tcData.reason || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Destination School
              </span>
              <span className="text-base font-bold text-gray-755">
                {tcData.transferredTo || tcData.destinationSchool || "—"}
              </span>
            </div>

            {tcData.remarks && (
              <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2 col-span-2">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Remarks / Observations
                </span>
                <span className="text-sm text-gray-600">
                  {tcData.remarks}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                General Conduct
              </span>
              <span className="text-base font-bold text-emerald-700 uppercase tracking-wide">
                {tcData.conduct || "GOOD"}
              </span>
            </div>
          </div>

          <div className="col-span-2 pt-4">
            <p className="text-xs font-medium text-gray-600 leading-relaxed text-justify italic">
              Certified that the above mentioned student has been a
              student of this institution until{" "}
              <b>
                {new Date(tcData.leavingDate || tcData.lastAttendedDate || new Date()).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </b>
              . All dues to the school have been cleared. His/Her
              character is found to be <b>{tcData.conduct || "Good"}</b> during
              the period of stay. The student is now transferring to{" "}
              <b>
                {tcData.transferredTo || tcData.destinationSchool || "Another Institution"}
              </b>{" "}
              for further studies.
            </p>
          </div>
        </div>

        <div className="w-full grid grid-cols-3 gap-6 pt-12 mt-auto">
          <div className="text-center flex flex-col justify-end items-center h-20 border-t border-gray-300 pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Class Teacher
            </p>
          </div>
          <div className="text-center flex flex-col justify-end items-center h-20">
            <ShieldCheck size={36} className="text-blue-900/20 mb-1" />
            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.4em]">
              School Seal
            </p>
          </div>
          <div className="text-center flex flex-col justify-end items-center h-20 border-t border-gray-300 pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Principal Signature
            </p>
          </div>
        </div>

        <p className="mt-8 text-[7px] font-bold text-gray-300 uppercase tracking-widest text-center w-full">
          Digital Certificate Issued by{" "}
          {tcData.issuedBy?.name || "Administrator"} • School Management System ERP
        </p>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Shared common Heading component */}
      <Heading
        primaryText="Transfer & TC"
        secondaryText="Hub"
        showAnimations={true}
      />

      {/* KPI Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="TC Eligible Students"
          value={String(stats.eligibleStudents)}
          icon={<UserCheck size={24} />}
          accentColor="#3b82f6"
          size={3}
          showAnimations
          loading={statsLoading}
        />
        <EnhancedDashCard
          title="Pending Requests"
          value={String(stats.pendingRequests)}
          icon={<Clock size={24} />}
          accentColor="#eab308"
          size={3}
          showAnimations
          loading={statsLoading}
        />
        <EnhancedDashCard
          title="Approved TC"
          value={String(stats.approvedTc)}
          icon={<FileCheck size={24} />}
          accentColor="#22c55e"
          size={3}
          showAnimations
          loading={statsLoading}
        />
        <EnhancedDashCard
          title="Total Transferred"
          value={String(stats.totalTransferred)}
          icon={<ArrowRightLeft size={24} />}
          accentColor="#a855f7"
          size={3}
          showAnimations
          loading={statsLoading}
        />
      </DashGrid>

      {/* Segmented full-width Tab Navigation */}
      <div className="flex w-full bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
        {[
          { id: "tc-eligible", label: "TC Eligible Students", icon: UserCheck },
          { id: "pending", label: "Pending Requests", icon: Clock },
          { id: "history", label: "Transfer History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-1/3 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-[#223F74] shadow-sm font-extrabold"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/40"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER PANEL SECTION */}
      {activeTab === "tc-eligible" && (
        <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by Name, Roll No, Adm No, Parent, Phone..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] focus:border-[#223F74] outline-none transition text-sm font-semibold text-gray-700 bg-gray-50/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter("all");
                }}
              >
                <option value="all">All Classes</option>
                {classesList.map(cls => (
                  <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={classFilter === "all"}
              >
                <option value="all">All Sections</option>
                {classSections.map((sec) => (
                  <option key={sec.id || sec._id || sec} value={sec.id || sec._id || sec}>{sec.name || sec}</option>
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

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="passout">Pass Out</option>
              </select>
            </div>

            {/* Academic Session */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
              >
                <option value="all">All Sessions</option>
                {sessionOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div>
              <Button 
                text="Reset Filters"
                variant="secondary"
                onClick={handleResetFilters}
                className="w-full font-bold uppercase tracking-tight py-3"
              />
            </div>

            {/* Date range filters */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Admission Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="w-full p-2.5 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
                <input
                  type="date"
                  className="w-full p-2.5 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pending" && (
        <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by Student Name, Adm No..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] focus:border-[#223F74] outline-none transition text-sm font-semibold text-gray-700 bg-gray-50/50"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={pendingClassId}
                onChange={(e) => {
                  setPendingClassId(e.target.value);
                  setPendingSectionId("all");
                }}
              >
                <option value="all">All Classes</option>
                {classesList.map(cls => (
                  <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={pendingSectionId}
                onChange={(e) => setPendingSectionId(e.target.value)}
                disabled={pendingClassId === "all"}
              >
                <option value="all">All Sections</option>
                {pendingSections.map((sec) => (
                  <option key={sec.id || sec._id || sec} value={sec.id || sec._id || sec}>{sec.name || sec}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div>
              <Button 
                text="Reset Filters"
                variant="secondary"
                onClick={handleResetPendingFilters}
                className="w-full font-bold uppercase tracking-tight py-3"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by TC Number, Student Name, Adm No..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] focus:border-[#223F74] outline-none transition text-sm font-semibold text-gray-700 bg-gray-50/50"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={historyClassId}
                onChange={(e) => setHistoryClassId(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classesList.map(cls => (
                  <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Academic Session */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
                value={historyAcademicYear}
                onChange={(e) => setHistoryAcademicYear(e.target.value)}
              >
                <option value="all">All Sessions</option>
                {sessionOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Date range filters */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Issue Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="w-full p-2.5 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="w-full p-2.5 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Reset */}
            <div>
              <Button 
                text="Reset Filters"
                variant="secondary"
                onClick={handleResetHistoryFilters}
                className="w-full font-bold uppercase tracking-tight py-3"
              />
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DATA TABLE WITH SKELETON ROW AND DETAILED PAGINATION */}
      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden custom-cancel-admission-table">
        <style>{`
          .custom-cancel-admission-table div.flex.flex-col > div.flex-wrap {
            display: none !important;
          }
        `}</style>
        
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">
            {activeTab === "tc-eligible" ? "TC Eligible Students" : activeTab === "pending" ? "Pending TC Requests" : "TC Issued History"}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1.5 border border-gray-200 rounded-xl font-bold text-xs text-[#223F74] focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={activeTab === "tc-eligible" ? eligibleColumns : activeTab === "pending" ? pendingColumns : historyColumns}
          rows={tableRows}
          actions={tableActions}
          searchable={false}
          hidePagination={true}
          hideRecordSummary={true}
          pageSize={10000}
        />

        {/* Custom Pagination controls identical to ManageStudents */}
        {!loading && activeFilteredList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              Showing{" "}
              <span className="text-[#223F74] font-bold">
                {(currentPage - 1) * rowsPerPage + 1}–
                {Math.min(currentPage * rowsPerPage, activeFilteredList.length)}
              </span>{" "}
              of{" "}
              <span className="text-[#223F74] font-bold">{activeFilteredList.length}</span>{" "}
              records
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

        {/* Empty state renderer identical to ManageStudents */}
        {!loading && activeFilteredList.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Users size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="font-bold text-sm">No Student Records Found</p>
            <p className="text-xs text-gray-400 mt-1">Try modifying your search or dropdown filters</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: QUICK VIEW PROFILE ──────────────────────────────────────── */}
      <Modal id="student-profile-modal" title="Student Profile Overview" size="md">
        {selectedStudent && (
          <div className="space-y-6 text-left p-2">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-105">
              <img
                src={getStudentPhoto(selectedStudent) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.user?.name || selectedStudent.name)}&background=223F74&color=fff`}
                alt={selectedStudent.user?.name || selectedStudent.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
              />
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedStudent.user?.name || selectedStudent.name}</h3>
                <p className="text-sm text-slate-500">Roll No: {selectedStudent.rollNo || "—"} • Adm No: {selectedStudent.admissionNo || selectedStudent.enrollmentNo}</p>
                <div className="mt-1 flex gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Class: {selectedStudent.class?.name || "—"}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Section: {selectedStudent.section?.name || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent / Guardian</span>
                <span className="font-semibold text-slate-750">{selectedStudent.parent?.user?.name || selectedStudent.parent?.fatherName || "—"}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Contact</span>
                <span className="font-semibold text-slate-750">{selectedStudent.parent?.primaryContact || selectedStudent.user?.phone || "—"}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                <span className="font-semibold text-slate-750 uppercase">{selectedStudent.user?.gender || selectedStudent.gender || "—"}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                <span className="font-semibold text-slate-750 uppercase text-emerald-600">{selectedStudent.status || "—"}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</span>
                <span className="text-sm text-slate-600">{selectedStudent.address || "No address listed"}</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button text="Close" variant="secondary" onClick={() => closeModal("student-profile-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: GENERATE TC ─────────────────────────────────────────────── */}
      <Modal id="generate-tc-modal" title="Issue Transfer Certificate (TC)" size="md">
        {selectedStudent && (
          <form onSubmit={handleProcessGenerateTC} className="space-y-6 text-left p-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuing TC For</div>
                <div className="font-extrabold text-slate-800 text-lg uppercase">{selectedStudent.user?.name || selectedStudent.name}</div>
                <div className="text-xs text-slate-500">Class: {selectedStudent.class?.name || "—"} | Section: {selectedStudent.section?.name || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admission No</div>
                <div className="font-mono font-bold text-blue-900">{selectedStudent.admissionNo || selectedStudent.enrollmentNo || "—"}</div>
              </div>
            </div>

            <Grid cols={12} gap={4}>
              <div className="col-span-12 sm:col-span-6">
                <DataField
                  label="TC Number (Optional)"
                  id="tc-num"
                  placeholder="e.g. TC-2026-0099"
                  value={tcForm.tcNumber}
                  onChange={(e) => setTcForm({ ...tcForm, tcNumber: e.target.value })}
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <DataField
                  label="Leaving Date"
                  id="leaving-date"
                  type="date"
                  value={tcForm.leavingDate}
                  onChange={(e) => setTcForm({ ...tcForm, leavingDate: e.target.value })}
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <SelectField
                  label="Transfer Reason"
                  id="transfer-reason"
                  value={tcForm.transferReason}
                  onChange={(e) => setTcForm({ ...tcForm, transferReason: e.target.value })}
                >
                  <Option value="Relocation" label="Parent's Relocation" />
                  <Option value="Higher Education" label="Higher Education" />
                  <Option value="Personal" label="Personal Grounds" />
                  <Option value="Course Completion" label="Course Completion" />
                  <Option value="Other" label="Other" />
                </SelectField>
              </div>

              {tcForm.transferReason === "Other" && (
                <div className="col-span-12 sm:col-span-6">
                  <DataField
                    label="Specify Reason"
                    id="custom-reason"
                    placeholder="Enter custom reason"
                    value={tcForm.customReason}
                    onChange={(e) => setTcForm({ ...tcForm, customReason: e.target.value })}
                  />
                </div>
              )}

              <div className="col-span-12 sm:col-span-6">
                <SelectField
                  label="General Conduct"
                  id="tc-conduct"
                  value={tcForm.conduct}
                  onChange={(e) => setTcForm({ ...tcForm, conduct: e.target.value })}
                >
                  <Option value="Excellent" label="Excellent" />
                  <Option value="Good" label="Good" />
                  <Option value="Satisfactory" label="Satisfactory" />
                  <Option value="Poor" label="Poor" />
                </SelectField>
              </div>

              <div className="col-span-12 sm:col-span-6">
                <DataField
                  label="Destination School"
                  id="dest-school"
                  placeholder="Cambridge High School"
                  value={tcForm.transferredTo}
                  onChange={(e) => setTcForm({ ...tcForm, transferredTo: e.target.value })}
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <DataField
                  label="Issue Date"
                  id="issue-date"
                  type="date"
                  value={tcForm.issueDate}
                  onChange={(e) => setTcForm({ ...tcForm, issueDate: e.target.value })}
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issued By</label>
                <div className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200">
                  {authUser?.name || "System Admin"}
                </div>
              </div>

              <div className="col-span-12">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks</label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition h-20"
                  placeholder="Add optional remarks..."
                  value={tcForm.remarks}
                  onChange={(e) => setTcForm({ ...tcForm, remarks: e.target.value })}
                />
              </div>
            </Grid>

            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-150">
              <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-blue-700 leading-relaxed">
                Confirming this action will update the student status to <b>Transferred</b> and mark their user account as <b>Inactive</b>. The generated TC will be available for download.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal("generate-tc-modal")} />
              <Button
                text="Confirm & Generate TC"
                type="submit"
                variant="primary"
                loading={loadingAction.id === selectedStudent?._id && loadingAction.type === "generate"}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL: TRANSFER STUDENT ────────────────────────────────────────── */}
      <Modal id="transfer-student-modal" title="Transfer Student (Inter-Branch / External)" size="md">
        {selectedStudent && (
          <form onSubmit={handleProcessTransfer} className="space-y-6 text-left p-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transferring Student</div>
                <div className="font-extrabold text-slate-800 text-lg uppercase">{selectedStudent.user?.name || selectedStudent.name}</div>
                <div className="text-xs text-slate-500">Current Branch Class: {selectedStudent.class?.name || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admission No</div>
                <div className="font-mono font-bold text-blue-900">{selectedStudent.admissionNo || selectedStudent.enrollmentNo || "—"}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target School / Branch (Within Organization)</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 transition"
                  value={transferForm.targetSchoolId}
                  onChange={(e) => setTransferForm({ ...transferForm, targetSchoolId: e.target.value })}
                >
                  <Option value="" label="-- Choose target branch -- (Or select External below)" />
                  {schoolsList.map((sch) => (
                    <option key={sch._id} value={sch._id}>{sch.schoolName}</option>
                  ))}
                </select>
              </div>

              {!transferForm.targetSchoolId && (
                <div>
                  <DataField
                    label="External Destination School (If not in organization)"
                    id="ext-school"
                    placeholder="Cambridge High School"
                    value={transferForm.destinationSchool}
                    onChange={(e) => setTransferForm({ ...transferForm, destinationSchool: e.target.value })}
                  />
                </div>
              )}

              <SelectField
                label="Transfer Reason"
                id="trans-reason"
                value={transferForm.reason}
                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
              >
                <Option value="Branch Transfer" label="Inter-Branch Migration" />
                <Option value="Relocation" label="Parent's Relocation" />
                <Option value="Higher Education" label="Higher Education / Graduation" />
                <Option value="Other" label="Other Reason" />
              </SelectField>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 border border-amber-150">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-amber-700 leading-relaxed">
                This will officially transfer the student out. A Transfer Certificate (TC) will be automatically generated, and an inter-branch transfer request will be sent to the target school.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal("transfer-student-modal")} />
              <Button
                text="Process Outgoing Transfer"
                type="submit"
                variant="primary"
                loading={loadingAction.id === selectedStudent?._id && loadingAction.type === "transfer"}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL: PENDING REQUEST DETAILS & PROCESSING ───────────────────── */}
      <Modal id="request-details-modal" title="Transfer Request Details" size="md">
        {selectedRequest && (
          <div className="space-y-6 text-left p-2">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested Student</span>
                <span className="font-extrabold text-slate-800 text-lg uppercase">{selectedRequest.student?.user?.name || selectedRequest.studentName || "—"}</span>
                <span className="text-xs text-slate-500 block">Class: {selectedRequest.student?.class?.name || "—"}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested By</span>
                <span className="font-bold text-blue-900">{selectedRequest.requestedBy || "Parent"}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason for transfer request</span>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedRequest.reason || "No details provided"}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks / Feedback (Add when approving or rejecting)</label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition h-20"
                  placeholder="Feedback/remarks regarding decision..."
                  value={requestActionForm.remarks}
                  onChange={(e) => setRequestActionForm({ ...requestActionForm, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleRequestAction("Reject")}
                disabled={loadingAction.id === selectedRequest?._id}
                className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition border border-rose-200 disabled:opacity-40"
              >
                <ThumbsDown size={14} />
                {loadingAction.id === selectedRequest?._id && loadingAction.type === "reject" ? "Rejecting..." : "Reject Request"}
              </button>
              <button
                onClick={() => handleRequestAction("Approve")}
                disabled={loadingAction.id === selectedRequest?._id}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition border border-emerald-200 disabled:opacity-40"
              >
                <ThumbsUp size={14} />
                {loadingAction.id === selectedRequest?._id && loadingAction.type === "approve" ? "Approving..." : "Approve Request"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: TC DOCUMENT PREVIEW & EXPORT ───────────────────────────── */}
      <Modal id="tc-preview-modal" title="Transfer Certificate Document" size="lg">
        {selectedTC && (
          <div className="space-y-6 p-2 text-center">
            <div className="flex justify-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <button
                onClick={() => handleDownloadTC(selectedTC)}
                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                <Download size={14} />
                Download PDF
              </button>
              <button
                onClick={() => handlePrintTC("tc-document-download-admin")}
                className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition"
              >
                <Printer size={14} />
                Print Certificate
              </button>
              <button
                onClick={() => closeModal("tc-preview-modal")}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-500 py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition"
              >
                Close
              </button>
            </div>

            <div className="border border-slate-200 rounded-3xl overflow-hidden p-4 bg-slate-50 flex justify-center overflow-x-auto">
              {renderTCDocument(selectedTC, "tc-document-download-admin")}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TransferHub;
