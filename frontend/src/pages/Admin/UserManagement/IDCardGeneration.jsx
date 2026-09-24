import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  Users, CreditCard, Search, Eye, RefreshCw, 
  CheckCircle, Clock, Printer, Shield, History, AlertTriangle
} from 'lucide-react';
import { 
  Heading, Button, DataTable, 
  DashGrid, EnhancedDashCard, PanelModal, Grid, Select, Option
} from '../../../components/shared/Common_Components';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import IDCardDesign, { getDisplayCardStatus } from '../../../components/shared/IDCardDesign';

// --- Helpers ---
const formatClass = (cls) => {
  if (!cls) return 'N/A';
  const name = typeof cls === 'string' ? cls : (cls.name || cls.className || '');
  const cleaned = String(name).replace(/class/i, '').replace(/nm$/i, '').trim();
  return cleaned ? `Class ${cleaned}` : (name || 'N/A');
};

const formatSection = (sec) => {
  if (!sec) return 'N/A';
  const name = typeof sec === 'string' ? sec : (sec.name || sec.sectionName || '');
  return name ? String(name).toUpperCase() : 'N/A';
};

const formatRollNo = (rollNo) => {
  if (!rollNo || String(rollNo).trim() === '' || String(rollNo).trim() === '-') return 'Not Assigned';
  return String(rollNo).trim();
};

const getCurrentAcademicYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  return today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

const classOrder = ["nursery", "junior kg", "senior kg", "lkg", "ukg"];

const sortClasses = (classesList) => {
  return [...classesList].sort((a, b) => {
    const nameA = (a.name || '').trim().toLowerCase();
    const nameB = (b.name || '').trim().toLowerCase();

    const idxA = classOrder.indexOf(nameA);
    const idxB = classOrder.indexOf(nameB);

    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const matchA = nameA.match(/(?:class|grade)\s*(\d+)/i);
    const matchB = nameB.match(/(?:class|grade)\s*(\d+)/i);

    if (matchA && matchB) {
      return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
    }
    if (matchA) return -1;
    if (matchB) return 1;

    return nameA.localeCompare(nameB);
  });
};

const AdminIDCardGeneration = () => {
  const [rawStudents, setRawStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState(() => {
    const cached = sessionStorage.getItem('admin_idcard_classes_list');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0, cardsGenerated: 0, pendingCards: 0, cardsPrinted: 0 });

  // Global Filters
  const [classFilter, setClassFilter] = useState(() => sessionStorage.getItem('admin_idcard_filter_class') || 'all');
  const [sectionFilter, setSectionFilter] = useState(() => sessionStorage.getItem('admin_idcard_filter_section') || 'all');
  const [academicYearFilter, setAcademicYearFilter] = useState(() => sessionStorage.getItem('admin_idcard_filter_year') || getCurrentAcademicYear());
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('admin_idcard_filter_search') || '');
  const [academicYearsOptions, setAcademicYearsOptions] = useState(() => {
    const cached = sessionStorage.getItem('admin_idcard_academic_years');
    return cached ? JSON.parse(cached) : [];
  });

  // Selection for Printing table
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditStudent, setAuditStudent] = useState(null);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [deactivateTargetStudent, setDeactivateTargetStudent] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Printing state
  const [printTarget, setPrintTarget] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    const cached = sessionStorage.getItem('admin_idcard_selected_template');
    return cached ? JSON.parse(cached) : null;
  });
  const [generatingMap, setGeneratingMap] = useState({});

  // Sync state to sessionStorage
  useEffect(() => {
    if (selectedTemplate) {
      sessionStorage.setItem('admin_idcard_selected_template', JSON.stringify(selectedTemplate));
    }
  }, [selectedTemplate]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_classes_list', JSON.stringify(classesList));
  }, [classesList]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_academic_years', JSON.stringify(academicYearsOptions));
  }, [academicYearsOptions]);

  useEffect(() => {
    if (selectedTemplate) {
      sessionStorage.setItem('admin_idcard_selected_template', JSON.stringify(selectedTemplate));
    }
  }, [selectedTemplate]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_filter_class', classFilter);
  }, [classFilter]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_filter_section', sectionFilter);
  }, [sectionFilter]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_filter_year', academicYearFilter);
  }, [academicYearFilter]);

  useEffect(() => {
    sessionStorage.setItem('admin_idcard_filter_search', searchQuery);
  }, [searchQuery]);

  const authSchool = useSelector((state) => state.adminAuth?.authUser?.school);

  // Extract School Information from LocalStorage or Redux auth user
  const schoolInfo = useMemo(() => {
    if (authSchool) return authSchool;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return u.school || {};
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  }, [authSchool]);

  // Available sections driven by selected class
  const classSections = useMemo(() => {
    if (classFilter === 'all') {
      const all = new Map();
      classesList.forEach(c => {
        (c.sections || []).forEach(s => {
          const name = s.name || s;
          if (name) all.set(String(name).toUpperCase(), name);
        });
      });
      return Array.from(all.keys()).sort();
    }
    const cls = classesList.find(c => String(c.id || c._id) === String(classFilter));
    return (cls?.sections || []).map(s => s.name || s);
  }, [classFilter, classesList]);

  // Fetch academic configurations/years from backend
  const fetchAcademicConfigs = useCallback(async () => {
    try {
      const res = await api.get('/admin/academic-configurations');
      const configs = res.data?.data || [];
      
      let activeYear = null;
      const yearsSet = new Set();
      
      configs.forEach(c => {
        if (c.academicYear) {
          yearsSet.add(c.academicYear);
          if (c.isCurrent) {
            activeYear = c.academicYear;
          }
        }
      });
      
      if (activeYear) {
        setAcademicYearFilter(activeYear);
      } else if (configs.length > 0) {
        activeYear = configs[0].academicYear;
        setAcademicYearFilter(activeYear);
      } else {
        const defaultCurrent = getCurrentAcademicYear();
        activeYear = defaultCurrent;
        setAcademicYearFilter(defaultCurrent);
        yearsSet.add(defaultCurrent);
      }
      
      const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
      
      if (sortedYears.length < 4) {
        const earliestYearStr = sortedYears[sortedYears.length - 1] || getCurrentAcademicYear();
        const match = earliestYearStr.match(/^(\d{4})-(\d{4})$/);
        if (match) {
          let start = parseInt(match[1], 10);
          while (sortedYears.length < 4) {
            start--;
            const prevYearStr = `${start}-${start + 1}`;
            if (!yearsSet.has(prevYearStr)) {
              sortedYears.push(prevYearStr);
            }
          }
        }
      }
      
      const otherYears = sortedYears.filter(y => y !== activeYear).sort((a, b) => b.localeCompare(a));
      const finalOptions = [activeYear, ...otherYears];
      
      setAcademicYearsOptions(finalOptions);
    } catch (err) {
      console.error("Failed to fetch academic configs:", err);
      const defaultCurrent = getCurrentAcademicYear();
      setAcademicYearFilter(defaultCurrent);
      setAcademicYearsOptions([defaultCurrent]);
    }
  }, []);

  // Fetch classes from backend
  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/admin/academic/classes-sections');
      const sorted = sortClasses(res.data?.data || []);
      setClassesList(sorted);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  }, []);

  // Fetch students + idcard status from backend ONCE
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 }; // Fetch all active students once for local filtering
      const res = await api.get('/admin/id-cards/students', { params });
      setRawStudents(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch students for ID cards:', err);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/principal/id-cards/templates');
      const templatesList = res?.data?.data || [];
      const defaultTpl = templatesList.find(t => t && t.isDefault) || templatesList[0];
      setSelectedTemplate(defaultTpl);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  }, []);

  useEffect(() => {
    if (academicYearsOptions.length === 0) fetchAcademicConfigs();
    if (classesList.length === 0) fetchClasses();
    if (!selectedTemplate) fetchTemplates();
  }, [fetchAcademicConfigs, fetchClasses, fetchTemplates, academicYearsOptions.length, classesList.length, selectedTemplate]);

  useEffect(() => {
    fetchStudents();
    setSelectedStudentIds(new Set());
  }, [fetchStudents]);

  // Client-side local filtering and stats calculation
  useEffect(() => {
    const filtered = rawStudents.filter(s => {
      // 1. Academic Year filter
      const matchYear = academicYearFilter === 'all' || String(s.academicYear) === String(academicYearFilter);

      // 2. Class filter
      const matchClass = classFilter === 'all' || String(s.class?._id || s.class) === String(classFilter);
      
      // 3. Section filter
      const studentSectionName = s.sectionName || (s.section?.name || s.section?.sectionName || '');
      const matchSection = sectionFilter === 'all' || String(studentSectionName).toLowerCase() === String(sectionFilter).toLowerCase();
      
      // 4. Search query
      let matchSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = String(s.name || '').toLowerCase().includes(query);
        const rollMatch = String(s.rollNo || '').toLowerCase().includes(query);
        const admMatch = String(s.admissionNo || '').toLowerCase().includes(query);
        matchSearch = nameMatch || rollMatch || admMatch;
      }

      return matchYear && matchClass && matchSection && matchSearch;
    });

    setStudents(filtered);

    // Calculate Summary Stats from filtered set
    const totalCount = filtered.length;
    const generatedCount = filtered.filter(s => getDisplayCardStatus(s.idCardStatus) === 'Active').length;
    const printedCount = filtered.filter(s => (s.printCount || 0) > 0).length;
    const pendingCount = totalCount - generatedCount;

    setStats({
      totalStudents: totalCount,
      cardsGenerated: generatedCount,
      pendingCards: pendingCount < 0 ? 0 : pendingCount,
      cardsPrinted: printedCount
    });

  }, [rawStudents, academicYearFilter, classFilter, sectionFilter, searchQuery]);

  // Table 1: Registry rows (all students matching local filters)
  const registryRows = useMemo(() => students.map(s => ({
    _original: s,
    id: String(s._id),
    photo: s.photo,
    studentName: s.name || '—',
    rollNo: formatRollNo(s.rollNo),
    className: formatClass(s.class) || s.className || '—',
    sectionName: formatSection(s.section) || s.sectionName || '—',
    idCardStatus: s.idCardStatus || 'Pending',
  })), [students]);

  // Table 2: Printing rows (only Active cards matching local filters)
  const printRows = useMemo(() => students
    .filter(s => getDisplayCardStatus(s.idCardStatus) === 'Active')
    .map(s => ({
      _original: s,
      id: String(s._id),
      studentName: s.name || '—',
      rollNo: formatRollNo(s.rollNo),
      lastPrintedDate: s.lastPrintedDate,
      printCount: s.printCount || 0,
      idCardStatus: s.idCardStatus || 'Pending'
    })), [students]);

  // Actions
  const handleGenerate = useCallback(async (studentId) => {
    // Check if the card is already active
    const student = rawStudents.find(s => String(s._id) === String(studentId));
    if (student && getDisplayCardStatus(student.idCardStatus) === 'Active') {
      toast.success('ID Card is already active.');
      return;
    }

    if (generatingMap[studentId]) return;
    setGeneratingMap(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await api.post('/admin/id-cards/generate', { studentId });
      toast.success(res.data?.message || 'ID Card generated successfully.');
      await fetchStudents();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate ID Card. Please try again.');
    } finally {
      setGeneratingMap(prev => ({ ...prev, [studentId]: false }));
    }
  }, [generatingMap, fetchStudents, rawStudents]);

  const handleDeactivate = useCallback((student) => {
    setDeactivateTargetStudent(student);
    setIsDeactivateConfirmOpen(true);
  }, []);

  const handleDeactivateConfirm = useCallback(async () => {
    if (!deactivateTargetStudent || deactivating) return;
    setDeactivating(true);
    const studentId = String(deactivateTargetStudent._id);

    try {
      await api.patch('/admin/id-cards/deactivate', { studentId });
      toast.success('ID Card deactivated successfully.');
      
      // Update preview modal state locally to show Pending immediately
      setViewStudent(prev => prev ? { ...prev, idCardStatus: 'Pending' } : null);
      
      // Re-fetch the student list from database
      await fetchStudents();

      // Close the confirmation modal
      setIsDeactivateConfirmOpen(false);
      setDeactivateTargetStudent(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate ID Card. Please try again.');
    } finally {
      setDeactivating(false);
    }
  }, [deactivateTargetStudent, deactivating, fetchStudents]);

  // Standard printing trigger flow
  const triggerPrintFlow = useCallback(async (targetStudents) => {
    if (!targetStudents || targetStudents.length === 0) return;

    setPrintTarget(targetStudents);

    // Give React time to render print DOM before opening print dialog
    setTimeout(async () => {
      window.print();

      try {
        const studentIds = targetStudents.map(s => s._id);

        if (studentIds.length === 1) {
          const studentId = studentIds[0];
          await api.patch('/admin/id-cards/print', { studentId });
        } else {
          await api.patch('/admin/id-cards/bulk-print', { studentIds });
          setSelectedStudentIds(new Set());
        }
        toast.success(studentIds.length === 1 ? 'ID Card print logged' : 'ID Cards print logged');
        await fetchStudents();
      } catch (err) {
        console.error('Failed to log print records in backend:', err);
      } finally {
        setPrintTarget(null);
      }
    }, 400);
  }, [fetchStudents]);

  const handlePrint = useCallback((studentId) => {
    const student = students.find(s => String(s._id) === String(studentId));
    if (!student) return;
    triggerPrintFlow([student]);
  }, [students, triggerPrintFlow]);

  const handleBulkPrint = useCallback(() => {
    if (selectedStudentIds.size === 0) {
      return toast.error('Select at least one student to print');
    }
    const selectedStudents = students.filter(s => selectedStudentIds.has(String(s._id)));
    triggerPrintFlow(selectedStudents);
  }, [students, selectedStudentIds, triggerPrintFlow]);

  const handleSelectAllPrint = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(new Set(printRows.map(r => r.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const toggleSelection = (id) => {
    const next = new Set(selectedStudentIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedStudentIds(next);
  };

  // Registry columns
  const registryColumns = [
    {
      key: 'photo', label: 'Photo',
      render: (val, row) => (
        <img
          src={val || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.studentName || 'S')}&background=223F74&color=fff`}
          alt="Student"
          className="w-8 h-8 rounded-full object-cover border border-[#E7E2DB]"
        />
      )
    },
    { key: 'studentName', label: 'Student Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'rollNo', label: 'Roll No' },
    { key: 'className', label: 'Class' },
    { key: 'sectionName', label: 'Section' },
    {
      key: 'idCardStatus', label: 'Status',
      render: (val) => {
        const displayStatus = getDisplayCardStatus(val);
        const map = { Active: 'bg-emerald-100 text-emerald-700 border-emerald-200', Pending: 'bg-amber-100 text-amber-700 border-amber-200' };
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${map[displayStatus] || map.Pending}`}>{displayStatus}</span>;
      }
    }
  ];

  const registryActions = [
    {
      icon: <Eye size={16} />, tooltip: 'View Details', variant: 'ghost',
      onClick: (row) => { setViewStudent(row._original); setIsViewModalOpen(true); }
    },
    {
      icon: <RefreshCw size={16} />,
      tooltip: (row) => generatingMap[row.id] ? 'Generating ID Card...' : 'Generate/Regenerate ID Card',
      variant: 'ghost',
      loading: (row) => !!generatingMap[row.id],
      disabled: (row) => !!generatingMap[row.id],
      show: (row) => getDisplayCardStatus(row.idCardStatus) === 'Pending',
      onClick: (row) => handleGenerate(row.id)
    },
    {
      icon: <Printer size={16} />, tooltip: 'Print ID Card', variant: 'ghost',
      show: (row) => getDisplayCardStatus(row.idCardStatus) === 'Active',
      onClick: (row) => handlePrint(row.id)
    }
  ];

  // Printing columns
  const printColumns = [
    {
      key: 'checkbox',
      label: (
        <input
          type="checkbox"
          onChange={handleSelectAllPrint}
          checked={printRows.length > 0 && selectedStudentIds.size === printRows.length}
          className="rounded border-gray-300 text-[#223F74] focus:ring-[#223F74]"
        />
      ),
      render: (val, row) => (
        <input
          type="checkbox"
          checked={selectedStudentIds.has(row.id)}
          onChange={() => toggleSelection(row.id)}
          className="rounded border-gray-300 text-[#223F74] focus:ring-[#223F74]"
        />
      ),
      width: '40px', align: 'center'
    },
    { key: 'studentName', label: 'Student Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'rollNo', label: 'Roll No' },
    {
      key: 'lastPrintedDate', label: 'Last Printed Date',
      render: (val) => <span className="text-gray-600">{val ? new Date(val).toLocaleString() : 'N/A'}</span>
    },
    { key: 'printCount', label: 'Print Count', render: (val) => <span className="font-semibold text-gray-700">{val || 0}</span> }
  ];

  const printActions = [
    {
      icon: <Printer size={16} />,
      tooltip: (row) => (row.printCount || 0) > 0 ? 'Reprint Card' : 'Print Card',
      variant: 'ghost',
      onClick: (row) => handlePrint(row.id)
    },
    {
      icon: <History size={16} />, tooltip: 'Printing History', variant: 'ghost',
      show: (row) => getDisplayCardStatus(row.idCardStatus) === 'Active',
      onClick: (row) => { setAuditStudent(row._original); setIsAuditModalOpen(true); }
    }
  ];

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      <Heading primaryText="ID Card" secondaryText="Generation" size={12} showAnimations={true} />

      <style dangerouslySetInnerHTML={{ __html: `
        .idcard-cards h3.truncate, .idcard-cards span.truncate {
          white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-card-page {
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            height: 100vh !important;
            box-sizing: border-box !important;
          }
          .id-card-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          @page {
            size: portrait;
            margin: 0;
          }
        }
        
        .id-card-print-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          padding: 10px;
        }
      `}} />

      {/* Stats Cards */}
      <div className="idcard-cards">
        <DashGrid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-3">
            <EnhancedDashCard title="Active Students" value={loading ? '-' : stats.totalStudents} icon={<Users size={22} />} accentColor="#3B82F6" size={12} />
          </div>
          <div className="col-span-12 md:col-span-3">
            <EnhancedDashCard title="Cards Generated" value={loading ? '-' : stats.cardsGenerated} icon={<Shield size={22} />} accentColor="#6366F1" size={12} />
          </div>
          <div className="col-span-12 md:col-span-3">
            <EnhancedDashCard title="Pending Cards" value={loading ? '-' : stats.pendingCards} icon={<Clock size={22} />} accentColor="#F59E0B" size={12} />
          </div>
          <div className="col-span-12 md:col-span-3">
            <EnhancedDashCard title="Cards Printed" value={loading ? '-' : stats.cardsPrinted} icon={<CheckCircle size={22} />} accentColor="#10B981" size={12} />
          </div>
        </DashGrid>
      </div>

      {/* Global Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYearFilter} onChange={(e) => setAcademicYearFilter(e.target.value)} searchable={false}>
              <Option value="all" label="All Academic Years" />
              {academicYearsOptions.map(y => (
                <Option key={y} value={y} label={y} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
            <Select id="filter-class" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSectionFilter('all'); }} searchable={false}>
              <Option value="all" label="All Classes" />
              {classesList.map(c => (
                <Option key={c.id || c._id} value={String(c.id || c._id)} label={c.name} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Section</label>
            <Select id="filter-section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} searchable={false}>
              <Option value="all" label="All Sections" />
              {classSections.map(s => (
                <Option key={s} value={s} label={s} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Search Student</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Adm No, Roll No..."
                className="w-full bg-[#F9F8F6] border border-[#E7E2DB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74]"
              />
            </div>
          </div>
        </Grid>
      </div>

      {/* Table 1 - Student ID Card Registry */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="p-6 pb-2 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h2 className="text-xl font-black text-[#1D1D1F]">Student ID Card Registry</h2>
        </div>
        <div className="p-6 pt-4 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/5">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
            </div>
          )}
          <DataTable
            columns={registryColumns}
            rows={registryRows}
            actions={registryActions}
            searchable={false}
            pageSize={10}
            exportable={true}
            exportFileName={`IDCard_Registry_${new Date().getTime()}.csv`}
          />
        </div>
      </div>

      {/* Table 2 - Printing & Audit Records */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="p-6 pb-2 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h2 className="text-xl font-black text-[#1D1D1F]">Printing & Audit Records</h2>
          <div className="flex items-center gap-3">
            <Button
              text={`Bulk Print (${selectedStudentIds.size})`}
              icon={<Printer size={16} />}
              variant="primary"
              onClick={handleBulkPrint}
              disabled={selectedStudentIds.size === 0}
            />
          </div>
        </div>
        <div className="p-6 pt-4 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/5">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
            </div>
          )}
          <DataTable
            columns={printColumns}
            rows={printRows}
            actions={printActions}
            searchable={false}
            pageSize={10}
            exportable={true}
            exportFileName={`Print_Records_${new Date().getTime()}.csv`}
          />
        </div>
      </div>

      {/* View Modal */}
      <PanelModal id="id-card-view" title="Student ID Card Details" size="md" isVisible={isViewModalOpen} onClose={() => setIsViewModalOpen(false)}>
        {viewStudent ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={viewStudent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewStudent.name || 'S')}&background=223F74&color=fff`}
                alt="Student"
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div>
                <h4 className="font-bold text-[#223F74] text-lg">{viewStudent.name}</h4>
                <p className="text-sm font-medium text-slate-500">
                  <span className="font-semibold text-slate-600">Adm No:</span> {viewStudent.admissionNo || viewStudent.enrollmentNo || 'N/A'} <span className="mx-2 text-slate-300">|</span>
                  <span className="font-semibold text-slate-600">Roll No:</span> {formatRollNo(viewStudent.rollNo)}
                </p>
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="flex flex-col items-center py-6 bg-slate-100 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-3">Card Preview</p>
              <IDCardDesign student={viewStudent} template={selectedTemplate} schoolInfo={schoolInfo} />
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 w-full gap-3">
              {getDisplayCardStatus(viewStudent.idCardStatus) === 'Active' ? (
                <div className="w-1/2">
                  <Button 
                    text="Deactivate ID Card" 
                    variant="danger" 
                    onClick={() => handleDeactivate(viewStudent)} 
                  />
                </div>
              ) : <div className="w-1/2" />}
              <div className="w-1/2">
                <Button text="Close" variant="secondary" onClick={() => setIsViewModalOpen(false)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center"><p className="text-slate-500 font-bold">No details available.</p></div>
        )}
      </PanelModal>

      {/* Audit History Modal */}
      <PanelModal id="id-card-history" title="Printing History" size="md" isVisible={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)}>
        {auditStudent ? (
          <div className="space-y-4 pb-6 text-left">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <History size={18} className="text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-700">Audit Trail: {auditStudent.name}</p>
                <p className="text-[10px] text-slate-500">Roll No: {formatRollNo(auditStudent.rollNo)}</p>
              </div>
            </div>

            {auditStudent.auditTrail && auditStudent.auditTrail.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-200" style={{ width: '50%' }}>Date & Time</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{ width: '50%' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...auditStudent.auditTrail]
                      .sort((a, b) => new Date(b.date || b.createdAt || b.timestamp).getTime() - new Date(a.date || a.createdAt || a.timestamp).getTime())
                      .map((entry, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 text-slate-600 text-xs">{entry.date ? new Date(entry.date).toLocaleString() : 'N/A'}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{entry.note || entry.user || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-6 font-semibold">No audit history available.</p>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button text="Close" variant="secondary" onClick={() => setIsAuditModalOpen(false)} />
            </div>
          </div>
        ) : null}
      </PanelModal>

      {/* Custom Deactivate Confirmation Modal */}
      <PanelModal 
        id="deactivate-confirm-modal" 
        title="Deactivate ID Card" 
        size="md" 
        isVisible={isDeactivateConfirmOpen} 
        onClose={() => !deactivating && setIsDeactivateConfirmOpen(false)}
      >
        <div className="space-y-6 pb-6 text-left">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={24} className="text-red-500 flex-shrink-0 animate-pulse" />
            <div>
              <h4 className="font-bold text-red-700 text-base">Deactivate ID Card</h4>
              <p className="text-sm text-red-600/90 mt-0.5">
                Are you sure you want to deactivate this ID Card?
              </p>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
            The card status will change to <span className="font-bold text-[#223F74]">Pending</span> and it can be generated again later.
          </p>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 w-full gap-3">
            <div className="w-1/2">
              <Button 
                text="Cancel" 
                variant="secondary" 
                disabled={deactivating}
                onClick={() => setIsDeactivateConfirmOpen(false)} 
              />
            </div>
            <div className="w-1/2">
              <Button 
                text="Deactivate" 
                variant="danger" 
                loading={deactivating}
                disabled={deactivating}
                onClick={handleDeactivateConfirm} 
              />
            </div>
          </div>
        </div>
      </PanelModal>

      {/* Hidden Print Container */}
      <div id="print-section" className="hidden print:block">
        {printTarget && printTarget.map((stu) => (
          <div key={stu._id} className="id-card-page">
            <IDCardDesign student={stu} template={selectedTemplate} schoolInfo={schoolInfo} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminIDCardGeneration;
