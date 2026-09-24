import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Eye, Pencil, CheckCircle, AlertCircle, Info, RefreshCw,
  ChevronLeft, ChevronRight, Loader2, GraduationCap
} from 'lucide-react';
import PromoteStudents from './PromoteStudents';
import { 
  getAllStudents, 
  getClassesAndSections 
} from '../../../services/api/adminStudentApi';
import { fetchAcademicYears } from '../../../services/classesApi';
import { 
  Heading, Button, DataTable, 
  DashGrid, EnhancedDashCard
} from '../../../components/shared/Common_Components';
import toast from 'react-hot-toast';

const normalizeAcademicYear = (yearStr) => {
  if (!yearStr) return "";
  // Strip whitespace and replace en-dash or any other dash with a standard hyphen
  const clean = yearStr.trim().replace(/[\u2013\u2014]/g, "-");
  const parts = clean.split("-");
  if (parts.length !== 2) return yearStr;

  const startYearStr = parts[0].trim();
  const endYearStr = parts[1].trim();

  if (startYearStr.length === 4) {
    if (endYearStr.length === 4) {
      return `${startYearStr}–${endYearStr}`; // en-dash
    } else if (endYearStr.length === 2) {
      const century = startYearStr.slice(0, 2);
      return `${startYearStr}–${century}${endYearStr}`; // en-dash
    }
  }
  return yearStr;
};

// Global module-level cache for instant page switching
let studentsCache = null;
let classesListCache = null;
let academicYearsCache = null;
let currentSessionCache = "";
let filtersCache = {
  activeTab: "profile",
  currentPage: 1,
  rowsPerPage: 10,
  searchTerm: "",
  classFilter: "all",
  sectionFilter: "all",
  genderFilter: "all",
  statusFilter: "all",
  academicYearFilter: "all"
};

const AdminManageStudents = () => {
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState(filtersCache.activeTab);

  // Filters & State
  const [students, setStudents] = useState(studentsCache || []);
  const [classesList, setClassesList] = useState(classesListCache || []);
  const [academicYears, setAcademicYears] = useState(academicYearsCache || []);
  const [currentSession, setCurrentSession] = useState(currentSessionCache || "");
  const [loading, setLoading] = useState(!studentsCache);
  const [currentPage, setCurrentPage] = useState(filtersCache.currentPage);
  const [rowsPerPage, setRowsPerPage] = useState(filtersCache.rowsPerPage);

  // Filter values
  const [searchTerm, setSearchTerm] = useState(filtersCache.searchTerm);
  const [classFilter, setClassFilter] = useState(filtersCache.classFilter);
  const [sectionFilter, setSectionFilter] = useState(filtersCache.sectionFilter);
  const [genderFilter, setGenderFilter] = useState(filtersCache.genderFilter);
  const [statusFilter, setStatusFilter] = useState(filtersCache.statusFilter);
  const [academicYearFilter, setAcademicYearFilter] = useState(filtersCache.academicYearFilter);

  // Sync state changes back to global cache
  useEffect(() => {
    filtersCache = {
      activeTab,
      currentPage,
      rowsPerPage,
      searchTerm,
      classFilter,
      sectionFilter,
      genderFilter,
      statusFilter,
      academicYearFilter
    };
  }, [activeTab, currentPage, rowsPerPage, searchTerm, classFilter, sectionFilter, genderFilter, statusFilter, academicYearFilter]);

  // client-side filtering
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Search Filter
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

    // 2. Class Filter
    if (classFilter !== "all" && classFilter !== "All") {
      result = result.filter((s) => {
        const classId = s.class?._id || s.class?.id || s.class;
        return classId === classFilter;
      });
    }

    // 3. Section Filter
    if (sectionFilter !== "all" && sectionFilter !== "All") {
      result = result.filter((s) => {
        const sectionId = s.section?._id || s.section?.id || s.section;
        return sectionId === sectionFilter;
      });
    }

    // 4. Gender Filter
    if (genderFilter !== "all" && genderFilter !== "All") {
      result = result.filter((s) => s.gender?.toLowerCase() === genderFilter.toLowerCase());
    }

    // 5. Status Filter
    if (statusFilter !== "all" && statusFilter !== "All") {
      result = result.filter((s) => s.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // 6. Academic Session Filter
    if (academicYearFilter !== "all" && academicYearFilter !== "All") {
      result = result.filter((s) => normalizeAcademicYear(s.academicYear) === normalizeAcademicYear(academicYearFilter));
    }

    return result;
  }, [students, searchTerm, classFilter, sectionFilter, genderFilter, statusFilter, academicYearFilter]);

  // Derived pagination variables
  const totalCount = filteredStudents.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedData = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, rowsPerPage]);

  const stats = useMemo(() => {
    const total = filteredStudents.length || 0;
    const active = filteredStudents.filter(s => s.status === 'active').length || 0;
    const inactive = filteredStudents.filter(s => s.status === 'inactive').length || 0;
    
    const tcIssued = filteredStudents.filter(s => {
      const st = (s.status || "").toLowerCase().trim().replace(/_/g, " ");
      return (
        st === "tc issued" ||
        st === "tcissued" ||
        st === "transferred" ||
        st === "passout" ||
        st === "dropped"
      );
    }).length || 0;

    return { total, active, inactive, tcIssued };
  }, [filteredStudents]);

  // Load classes & sections and session metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      if (classesListCache) return;
      try {
        const res = await getClassesAndSections();
        if (res.success && res.data) {
          const uniqueClasses = [];
          const seenIds = new Set();
          const seenNames = new Set();

          res.data.forEach((cls) => {
            if (!cls || (!cls._id && !cls.id) || !cls.name) return;
            const clsId = cls.id || cls._id;
            const normalizedName = cls.name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!seenIds.has(clsId) && !seenNames.has(normalizedName)) {
              seenIds.add(clsId);
              seenNames.add(normalizedName);
              uniqueClasses.push(cls);
            }
          });

          // Natural sorting
          uniqueClasses.sort((a, b) => {
            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

          setClassesList(uniqueClasses);
          classesListCache = uniqueClasses;
        }
      } catch (err) {
        console.error("Failed to load classes metadata", err);
      }
    };

    const loadSessionData = async () => {
      if (academicYearsCache) return;
      try {
        let years = [];
        let currentYear = null;
        try {
          const response = await fetchAcademicYears();
          const res = response?.data;
          if (res && res.success && Array.isArray(res.data)) {
            years = res.data.map((y, index) => ({
              name: normalizeAcademicYear(y),
              status: index === 0 ? 'Active' : 'Inactive'
            }));
            currentYear = years[0];
          }
        } catch (apiErr) {
          console.warn("fetchAcademicYears API failed, falling back to dynamic/student data", apiErr);
        }

        // Fallback: If no years returned from API, generate the last 5 academic sessions dynamically from the current year.
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
          currentYear = years[0];
        }

        setAcademicYears(years);
        academicYearsCache = years;
        const activeYear = currentYear || years.find(y => y.status === 'Active');
        if (activeYear) {
          const normY = normalizeAcademicYear(activeYear.name);
          setCurrentSession(normY);
          currentSessionCache = normY;
          if (filtersCache.academicYearFilter === "all" || filtersCache.academicYearFilter === "") {
            setAcademicYearFilter(normY);
          }
        } else if (years.length > 0) {
          const normY = normalizeAcademicYear(years[0].name);
          setCurrentSession(normY);
          currentSessionCache = normY;
          if (filtersCache.academicYearFilter === "all" || filtersCache.academicYearFilter === "") {
            setAcademicYearFilter(normY);
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
        // Fallback in case of catch error
        const years = [];
        const currentYearNum = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
          const startYear = currentYearNum - i;
          const endYear = startYear + 1;
          years.push({
            name: `${startYear}–${endYear}`,
            status: i === 0 ? 'Active' : 'Inactive'
          });
        }
        setAcademicYears(years);
        academicYearsCache = years;
        setCurrentSession(years[0].name);
        currentSessionCache = years[0].name;
        if (filtersCache.academicYearFilter === "all" || filtersCache.academicYearFilter === "") {
          setAcademicYearFilter(years[0].name);
        }
      }
    };

    loadMetadata();
    loadSessionData();
  }, []);

  // Fetch student list
  const fetchStudentList = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = {
        page: 1,
        limit: 10000,
        sortBy: "createdAt",
        sortOrder: "desc"
      };

      const response = await getAllStudents(params);
      if (response.success) {
        setStudents(response.data || []);
        studentsCache = response.data || [];
      } else {
        setStudents([]);
        studentsCache = [];
      }
    } catch (err) {
      toast.error("Failed to fetch student database");
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Trigger search with timeout to avoid rapid hits
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStudentList(!!studentsCache);
    }, 400);
    return () => clearTimeout(timeout);
  }, [fetchStudentList]);

  // Reset current page when filters or rowsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter, sectionFilter, genderFilter, statusFilter, academicYearFilter, rowsPerPage]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setClassFilter("all");
    setSectionFilter("all");
    setGenderFilter("all");
    setStatusFilter("all");
    setAcademicYearFilter(currentSession || "all");
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  // Section options based on selected class filter
  const classSections = useMemo(() => {
    if (classFilter === "all") return [];
    const cls = classesList.find(c => c.id === classFilter || c._id === classFilter);
    return cls?.sections || [];
  }, [classFilter, classesList]);

  // Academic sessions options sorted newest -> oldest
  const sessionOptions = useMemo(() => {
    const names = academicYears.map(y => normalizeAcademicYear(y.name)).filter(Boolean);
    if (currentSession) {
      const normalizedCurrent = normalizeAcademicYear(currentSession);
      if (!names.includes(normalizedCurrent)) {
        names.push(normalizedCurrent);
      }
    }
    // Merge academicSession values from student records
    students.forEach(s => {
      if (s.academicYear) {
        const normalized = normalizeAcademicYear(s.academicYear);
        if (!names.includes(normalized)) {
          names.push(normalized);
        }
      }
    });

    const uniqueNames = Array.from(new Set(names));
    uniqueNames.sort((a, b) => {
      const yearA = parseInt(a.split("–")[0], 10); // split by en-dash
      const yearB = parseInt(b.split("–")[0], 10);
      if (!isNaN(yearA) && !isNaN(yearB)) {
        return yearB - yearA;
      }
      return b.localeCompare(a);
    });
    return uniqueNames;
  }, [academicYears, currentSession, students]);

  // DataTable Configuration
  const tableColumns = [
    { 
      key: "photo", 
      label: "Student Photo",
      render: (val, row) => (
        <img
          src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName)}&background=223F74&color=fff`}
          alt={row.studentName}
          className="w-10 h-10 rounded-full object-cover border border-[#E7E2DB]"
        />
      )
    },
    { key: "studentName", label: "Student Name" },
    { key: "classSec", label: "Class & Section" },
    { key: "rollNo", label: "Roll No" },
    { key: "admissionDate", label: "Admission Date" },
    { 
      key: "status", 
      label: "Status",
      render: (val) => {
        const st = val?.toLowerCase() || "active";
        const displayVal = st === "dropped" ? "Passout" : val;
        const colors = {
          active: "bg-emerald-50 text-emerald-700 border-emerald-200",
          inactive: "bg-amber-50 text-amber-700 border-amber-200",
          cancelled: "bg-rose-50 text-rose-700 border-rose-200",
          transferred: "bg-blue-50 text-blue-700 border-blue-200",
          dropped: "bg-indigo-50 text-indigo-700 border-indigo-200",
          tc_issued: "bg-purple-50 text-purple-700 border-purple-200",
        };
        return (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase ${colors[st] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
            {displayVal}
          </span>
        );
      }
    }
  ];

  const tableRows = useMemo(() => {
    return paginatedData.map((s) => {
      const clsName = s.class?.name || s.class?.className || "—";
      const secName = s.section?.name || s.section?.sectionName || "";
      const p = s.parent || {};
      
      return {
        _original: s,
        id: s._id,
        photo: s.photo || s.user?.photo,
        enrollmentNo: s.enrollmentNo || s.admissionNo || "—",
        rollNo: s.rollNo || "—",
        studentName: s.user?.name || s.name || "—",
        classSec: secName ? `${clsName} - ${secName}` : clsName,
        gender: s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : "—",
        phone: s.phone || p.primaryContact || "—",
        parent: p.fatherName || p.motherName || "—",
        admissionDate: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : "—",
        status: s.status || "active"
      };
    });
  }, [paginatedData]);

  const tableActions = useMemo(() => [
    {
      icon: <Eye size={16} />,
      tooltip: "View Profile",
      variant: "ghost",
      onClick: (row) => {
        navigate(`/admin/students/manage/${row.id}`);
      }
    },
    {
      icon: <Pencil size={16} />,
      tooltip: "Edit Profile",
      variant: "ghost",
      onClick: (row) => {
        navigate(`/admin/students/manage/${row.id}?edit=true`, { state: { editMode: true } });
      }
    }
  ], [navigate]);

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Header */}
      <Heading 
        primaryText="Manage"
        secondaryText="Students"
      />

      {/* Tab Navigation */}
      <div className="flex w-full border-b border-gray-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`w-1/2 flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "profile" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Users size={18} />
          Student Profile
        </button>
        <button
          onClick={() => setActiveTab("promote")}
          className={`w-1/2 flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "promote" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <GraduationCap size={18} />
          Promote Students
        </button>
      </div>

      {activeTab === "promote" ? (
        <PromoteStudents />
      ) : (
        <>
          {/* Summary Cards */}
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard title="Total Students" value={totalCount} icon={<Users size={24} />} accentColor="#3b82f6" size={3} />
            <EnhancedDashCard title="Active" value={stats.active} icon={<CheckCircle size={24} />} accentColor="#22c55e" size={3} />
            <EnhancedDashCard title="Inactive" value={stats.inactive} icon={<AlertCircle size={24} />} accentColor="#eab308" size={3} />
            <EnhancedDashCard title="TC Issued / Passout" value={stats.tcIssued} icon={<Info size={24} />} accentColor="#f43f5e" size={3} />
          </DashGrid>

          {/* Filters Panel */}
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
                    <option value="cancelled">Cancelled</option>
                    <option value="transferred">Transferred</option>
                    <option value="dropped">Passout</option>
                    <option value="tc_issued">TC Issued</option>
                  </select>
                </div>

                {/* Academic Session */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Academic Session</label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
                    value={academicYearFilter}
                    onChange={(e) => setAcademicYearFilter(e.target.value)}
                  >
                    {currentSession && (
                      <option value={currentSession}>Current Academic Session ({currentSession})</option>
                    )}
                    <option value="all">All Sessions</option>
                    <option disabled>─────────────────────────</option>
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
              </div>
            </div>

            {/* Student Data Table */}
            <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden custom-cancel-admission-table">
              <style>{`
                .custom-cancel-admission-table div.flex.flex-col > div.flex-wrap {
                  display: none !important;
                }
              `}</style>
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <Loader2 size={36} className="animate-spin text-[#223F74] mb-2" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Student Directory...</p>
                </div>
              ) : (
                <>
                  {/* Header inside the table card containing the Rows per page dropdown at the top-right */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Student Directory</h3>
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

                  <DataTable
                    columns={tableColumns}
                    rows={tableRows}
                    actions={tableActions}
                    searchable={false}
                    hidePagination={true}
                    hideRecordSummary={true}
                    pageSize={10000}
                  />

                  {/* Pagination */}
                  {filteredStudents.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">
                        Showing{" "}
                        <span className="text-[#223F74] font-bold">
                          {(currentPage - 1) * rowsPerPage + 1}–
                          {Math.min(currentPage * rowsPerPage, filteredStudents.length)}
                        </span>{" "}
                        of{" "}
                        <span className="text-[#223F74] font-bold">{filteredStudents.length}</span>{" "}
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

                  {filteredStudents.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Users size={48} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-sm">No Student Records Found</p>
                      <p className="text-xs text-gray-400 mt-1">Try modifying your search or dropdown filters</p>
                    </div>
                  )}
                </>
              )}
            </div>
        </>
      )}
    </div>
  );
};

export default AdminManageStudents;
