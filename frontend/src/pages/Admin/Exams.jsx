import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, CalendarRange, FileDown, GraduationCap, LayoutList, Plus, Search, Pencil, Trash2, BookOpen, Calendar, RefreshCw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../features/theme/themeSlice';
import ExamFormModal from '../../components/admin/exams/ExamFormModal';
import ExamStructureFormModal from '../../components/admin/exams/ExamStructureFormModal';
import AdminToast from '../../components/admin/AdminToast';
import {
  Button,
  DataField,
  DashGrid,
  EnhancedDashCard,
  Heading,
  Modal,
  Option,
  SelectField,
  DataTable,
  Grid,
  Select,
  closeModal,
  openModal,
} from '../../components/shared/Common_Components.jsx';
import {
  createExam,
  deleteExam,
  fetchExams,
  updateExam,
  createExamStructure,
  fetchExamStructures,
  updateExamStructure,
  deleteExamStructure,
} from '../../services/examApi';
import { getAdminClassesSections, getAdminSubjects } from '../../services/api/adminAcademicsApi';

// Modal IDs
const EXAM_FORM_MODAL_ID = 'exam-form-modal';
const DELETE_EXAM_MODAL_ID = 'delete-exam-modal';
const EXAM_STRUCTURE_MODAL_ID = 'exam-structure-modal';
const DELETE_STRUCTURE_MODAL_ID = 'delete-structure-modal';

const getDerivedAcademicYear = () => {
  const today = new Date();
  const currentYearNum = today.getFullYear();
  const isBeforeApril = today.getMonth() < 3;
  const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
  return `${startYear}-${startYear + 1}`;
};

const getClassPriority = (className) => {
  if (!className) return 999;
  const name = className.trim().toLowerCase();
  if (name === 'nursery') return 0;
  if (name === 'junior kg' || name === 'jr kg' || name === 'jr. kg') return 1;
  if (name === 'senior kg' || name === 'sr kg' || name === 'sr. kg') return 2;

  // Extract any numbers from string
  const numMatch = name.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    return 2 + num;
  }
  return 999;
};

const sortClasses = (classes) => {
  return [...classes].sort((a, b) => {
    const aName = typeof a === 'string' ? a : (a.className || a.name || '');
    const bName = typeof b === 'string' ? b : (b.className || b.name || '');
    const diff = getClassPriority(aName) - getClassPriority(bName);
    if (diff !== 0) return diff;
    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const emptyForm = {
  examName: '',
  className: '',
  subject: '',
  examDate: '',
  startTime: '',
  endTime: '',
};

const Exams = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.adminAuth?.authUser);
  const schoolId = authUser?.school?._id || authUser?.school || 'global';
  const cachePrefix = `${schoolId}_`;

  // ── Active tab: 'schedule' | 'structure' ─────────────────────────────────
  const [activeTab, setActiveTab] = useState('schedule');

  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_rows`);
    return !cached || JSON.parse(cached).length === 0;
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownError, setDropdownError] = useState(null);

  const [rows, setRows] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_rows`);
    return cached ? JSON.parse(cached) : [];
  });
  const [meta, setMeta] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_meta`);
    return cached ? JSON.parse(cached) : { page: 1, limit: 8, totalPages: 1, total: 0 };
  });
  const [options, setOptions] = useState(() => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_classes`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const formatted = parsed.map(cls => ({
        _id: cls.id || cls._id,
        className: cls.name,
        name: cls.name
      }));
      return sortClasses(formatted);
    }
    return [];
  });

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [calendarView, setCalendarView] = useState(false);

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const darkMode = useSelector(selectIsDarkMode);

  // ── Exam Structure state ────────────────────────────────────────────────
  const [structures, setStructures] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_structures`);
    return cached ? JSON.parse(cached) : [];
  });
  const [structuresLoading, setStructuresLoading] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_structures`);
    return !cached || JSON.parse(cached).length === 0;
  });
  const [structureMode, setStructureMode] = useState('create');
  const [editingStructure, setEditingStructure] = useState(null);
  const [structureSubmitting, setStructureSubmitting] = useState(false);
  const [deleteStructureTarget, setDeleteStructureTarget] = useState(null);
  const [deletingStructure, setDeletingStructure] = useState(false);
  const [allClasses, setAllClasses] = useState(() => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_classes`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const formatted = parsed.map(cls => ({
        _id: cls.id || cls._id,
        className: cls.name,
        name: cls.name
      }));
      return sortClasses(formatted);
    }
    return [];
  });
  const [allSubjects, setAllSubjects] = useState(() => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    return cached ? JSON.parse(cached) : [];
  });
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);


  const classOptions = useMemo(() => {
    const serverClasses = Array.isArray(options) ? options.map(c => c.className) : [];
    const unique = Array.from(new Set(serverClasses));
    return sortClasses(unique);
  }, [options]);

  const [filterSubjects, setFilterSubjects] = useState(() => {
    const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_filter_subjects`);
    return cached ? JSON.parse(cached) : [];
  });
  const [modalSubjects, setModalSubjects] = useState([]);

  // Fetch subjects for filter dropdown
  const loadFilterSubjects = async (classId, className) => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const filtered = parsed.filter(s => {
        const sClassId = s.classId?._id || s.classId;
        const sClassName = s.classId?.name || s.className;
        return String(sClassId) === String(classId) || String(sClassName) === String(className);
      });
      const sorted = Array.from(new Set(filtered.map(s => s.subjectName || s.name).filter(Boolean))).sort();
      setFilterSubjects(sorted);
      sessionStorage.setItem(`${cachePrefix}admin_exams_filter_subjects`, JSON.stringify(sorted));
    } else {
      setDropdownLoading(true);
      setDropdownError(null);
      try {
        const res = await getAdminSubjects({ classId });
        if (res.success && Array.isArray(res.data)) {
          const subjects = res.data.map(s => s.subjectName || s.name).filter(Boolean);
          const sorted = Array.from(new Set(subjects)).sort();
          setFilterSubjects(sorted);
          sessionStorage.setItem(`${cachePrefix}admin_exams_filter_subjects`, JSON.stringify(sorted));
        } else {
          setFilterSubjects([]);
        }
      } catch (error) {
        console.error('Failed to load filter subjects:', error);
        setDropdownError('Failed to load subjects');
        setFilterSubjects([]);
      } finally {
        setDropdownLoading(false);
      }
    }
  };

  // Fetch all organization subjects for filter dropdown
  const loadAllFilterSubjects = async () => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const sorted = Array.from(new Set(parsed.map(s => s.subjectName || s.name).filter(Boolean))).sort();
      setFilterSubjects(sorted);
      sessionStorage.setItem(`${cachePrefix}admin_exams_filter_subjects`, JSON.stringify(sorted));
    } else {
      setDropdownLoading(true);
      setDropdownError(null);
      try {
        const res = await getAdminSubjects();
        if (res.success && Array.isArray(res.data)) {
          const subjects = res.data.map(s => s.subjectName || s.name).filter(Boolean);
          const sorted = Array.from(new Set(subjects)).sort();
          setFilterSubjects(sorted);
          sessionStorage.setItem(`${cachePrefix}admin_exams_filter_subjects`, JSON.stringify(sorted));
        } else {
          setFilterSubjects([]);
        }
      } catch (error) {
        console.error('Failed to load all subjects:', error);
        setDropdownError('Failed to load subjects');
        setFilterSubjects([]);
      } finally {
        setDropdownLoading(false);
      }
    }
  };

  // Fetch subjects for modal dropdown
  const loadModalSubjects = async (classId, className) => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const filtered = parsed.filter(s => {
        const sClassId = s.classId?._id || s.classId;
        const sClassName = s.classId?.name || s.className;
        return String(sClassId) === String(classId) || String(sClassName) === String(className);
      });
      const sorted = Array.from(new Set(filtered.map(s => s.subjectName || s.name).filter(Boolean))).sort();
      setModalSubjects(sorted);
    } else {
      setDropdownLoading(true);
      setDropdownError(null);
      try {
        const res = await getAdminSubjects({ classId });
        if (res.success && Array.isArray(res.data)) {
          const subjects = res.data.map(s => s.subjectName || s.name).filter(Boolean);
          setModalSubjects(Array.from(new Set(subjects)).sort());
        } else {
          setModalSubjects([]);
        }
      } catch (error) {
        console.error('Failed to load modal subjects:', error);
        setDropdownError('Failed to load subjects');
        setModalSubjects([]);
      } finally {
        setDropdownLoading(false);
      }
    }
  };

  // Effect to load filter subjects when classFilter changes
  useEffect(() => {
    if (options.length > 0) {
      if (classFilter) {
        const selectedClassObj = options.find(c => c.className === classFilter);
        if (selectedClassObj) {
          loadFilterSubjects(selectedClassObj._id, selectedClassObj.className);
        } else {
          loadAllFilterSubjects();
        }
      } else {
        loadAllFilterSubjects();
      }
    }
  }, [classFilter, options]);

  // Effect to load modal subjects when form.className changes
  useEffect(() => {
    if (form.className && options.length > 0) {
      const selectedClassObj = options.find(c => c.className === form.className);
      if (selectedClassObj) {
        loadModalSubjects(selectedClassObj._id, selectedClassObj.className);
      } else {
        setModalSubjects([]);
      }
    } else {
      setModalSubjects([]);
    }
  }, [form.className, options]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const loadDropdownOptions = async () => {
    // First check sessionStorage academics cache
    const cached = sessionStorage.getItem(`${schoolId}_academics_classes`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const formatted = parsed.map(cls => ({
        _id: cls.id || cls._id,
        className: cls.name,
        name: cls.name
      }));
      const sorted = sortClasses(formatted);
      setOptions(sorted);
      sessionStorage.setItem(`${cachePrefix}admin_exams_options`, JSON.stringify(sorted));
    } else {
      setDropdownLoading(true);
      setDropdownError(null);
      try {
        const response = await getAdminClassesSections({ academicYear: getDerivedAcademicYear() });
        const rawClasses = response.success && Array.isArray(response.data) ? response.data : [];
        const formatted = rawClasses.map(cls => ({
          _id: cls.id || cls._id,
          className: cls.name,
          name: cls.name
        }));
        const sorted = sortClasses(formatted);
        setOptions(sorted);
        sessionStorage.setItem(`${cachePrefix}admin_exams_options`, JSON.stringify(sorted));
        sessionStorage.setItem(`${schoolId}_academics_classes`, JSON.stringify(rawClasses));
      } catch (error) {
        console.error('Failed to load dropdown options:', error);
        setDropdownError('Failed to load classes');
        setOptions([]);
      } finally {
        setDropdownLoading(false);
      }
    }
  };

  const loadExams = async (page = 1, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetchExams({
        page,
        limit: meta.limit,
        search,
        className: classFilter,
      });
      const responseData = response.data || [];
      const responseMeta = response.meta || { page: 1, limit: 8, totalPages: 1, total: 0 };
      setRows(responseData);
      setMeta(responseMeta);
      sessionStorage.setItem(`${cachePrefix}admin_exams_rows`, JSON.stringify(responseData));
      sessionStorage.setItem(`${cachePrefix}admin_exams_meta`, JSON.stringify(responseMeta));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Structure CRUD ─────────────────────────────────────────────────────
  const loadStructures = async (showLoading = false) => {
    if (showLoading) setStructuresLoading(true);
    try {
      const res = await fetchExamStructures();
      if (res.success) {
        const data = res.data || [];
        setStructures(data);
        sessionStorage.setItem(`${cachePrefix}admin_exams_structures`, JSON.stringify(data));
      }
    } catch (e) {
      showToast('Failed to load exam structures', 'error');
    } finally {
      setStructuresLoading(false);
    }
  };

  const loadAllClassesForStructure = async () => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_classes`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const formatted = parsed.map(cls => ({
        _id: cls.id || cls._id,
        className: cls.name,
        name: cls.name
      }));
      const sorted = sortClasses(formatted);
      setAllClasses(sorted);
      sessionStorage.setItem(`${cachePrefix}admin_exams_all_classes`, JSON.stringify(sorted));
    } else {
      try {
        const response = await getAdminClassesSections({ academicYear: getDerivedAcademicYear() });
        const rawClasses = response.success && Array.isArray(response.data) ? response.data : [];
        const formatted = rawClasses.map(cls => ({
          _id: cls.id || cls._id,
          className: cls.name,
          name: cls.name
        }));
        const sorted = sortClasses(formatted);
        setAllClasses(sorted);
        sessionStorage.setItem(`${cachePrefix}admin_exams_all_classes`, JSON.stringify(sorted));
        sessionStorage.setItem(`${schoolId}_academics_classes`, JSON.stringify(rawClasses));
      } catch (e) {
        console.error('Failed to load classes', e);
      }
    }
  };

  const loadAllSubjectsForStructure = async () => {
    const cached = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setAllSubjects(parsed);
      sessionStorage.setItem(`${cachePrefix}admin_exams_all_subjects`, JSON.stringify(parsed));
    } else {
      try {
        const res = await getAdminSubjects();
        if (res.success && Array.isArray(res.data)) {
          setAllSubjects(res.data);
          sessionStorage.setItem(`${cachePrefix}admin_exams_all_subjects`, JSON.stringify(res.data));
          sessionStorage.setItem(`${schoolId}_academics_subjects`, JSON.stringify(res.data));
        }
      } catch (e) {
        console.error('Failed to load subjects', e);
      }
    }
  };

  const openCreateStructure = () => {
    setStructureMode('create');
    setEditingStructure(null);
    setIsStructureModalOpen(true);
  };

  const openEditStructure = (structure) => {
    setStructureMode('edit');
    setEditingStructure(structure);
    setIsStructureModalOpen(true);
  };

  const handleStructureSubmit = async (payload) => {
    setStructureSubmitting(true);
    try {
      if (structureMode === 'edit' && editingStructure?._id) {
        await updateExamStructure(editingStructure._id, payload);
        showToast('Exam structure updated successfully');
      } else {
        await createExamStructure(payload);
        showToast('Exam structure created successfully');
      }
      setIsStructureModalOpen(false);
      setEditingStructure(null);
      loadStructures(false);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save exam structure', 'error');
    } finally {
      setStructureSubmitting(false);
    }
  };

  const handleDeleteStructure = async () => {
    if (!deleteStructureTarget?._id) return;
    setDeletingStructure(true);
    try {
      await deleteExamStructure(deleteStructureTarget._id);
      showToast('Exam structure deleted successfully');
      setStructures((prev) => prev.filter((item) => item._id !== deleteStructureTarget._id));
      const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_structures`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((item) => item._id !== deleteStructureTarget._id);
        sessionStorage.setItem(`${cachePrefix}admin_exams_structures`, JSON.stringify(filtered));
      }
      closeModal(DELETE_STRUCTURE_MODAL_ID);
      setDeleteStructureTarget(null);
      loadStructures(false);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete structure', 'error');
    } finally {
      setDeletingStructure(false);
    }
  };

  useEffect(() => {
    if (rows.length === 0) {
      loadExams(1, true);
    }
    if (options.length === 0) {
      loadDropdownOptions();
    }
    if (structures.length === 0) {
      loadStructures(true);
    }
    if (allClasses.length === 0) {
      loadAllClassesForStructure();
    }
    if (allSubjects.length === 0) {
      loadAllSubjectsForStructure();
    }
  }, [rows.length, options.length, structures.length, allClasses.length, allSubjects.length]);

  const openCreateModal = () => {
    setMode('create');
    setEditingId('');
    setForm(emptyForm);
    openModal(EXAM_FORM_MODAL_ID);
  };

  const openEditModal = (item) => {
    setMode('edit');
    setEditingId(item._id);
    setForm({
      examName: item.examName,
      className: item.className,
      subject: item.subject,
      examDate: new Date(item.examDate).toISOString().slice(0, 10),
      startTime: item.startTime,
      endTime: item.endTime,
    });
    openModal(EXAM_FORM_MODAL_ID);
  };

  const handleSave = async () => {
    // Detailed validation
    const missingFields = [];
    if (!form.examName) missingFields.push('Exam Name');
    if (!form.className) missingFields.push('Class');
    if (!form.subject) missingFields.push('Subject');
    if (!form.examDate) missingFields.push('Exam Date');
    if (!form.startTime) missingFields.push('Start Time');
    if (!form.endTime) missingFields.push('End Time');

    if (missingFields.length > 0) {
      showToast(`Please fill: ${missingFields.join(', ')}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'edit' && editingId) {
        await updateExam(editingId, form);
        showToast('Exam updated successfully');
      } else {
        await createExam(form);
        showToast('Exam created successfully');
      }
      closeModal(EXAM_FORM_MODAL_ID);
      setForm(emptyForm);
      loadExams(meta.page);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) {
      return;
    }

    setDeleting(true);
    try {
      await deleteExam(deleteTarget._id);
      showToast('Exam deleted successfully');
      setRows((prev) => prev.filter((item) => item._id !== deleteTarget._id));
      const cached = sessionStorage.getItem(`${cachePrefix}admin_exams_rows`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((item) => item._id !== deleteTarget._id);
        sessionStorage.setItem(`${cachePrefix}admin_exams_rows`, JSON.stringify(filtered));
      }
      closeModal(DELETE_EXAM_MODAL_ID);
      setDeleteTarget(null);
      loadExams(meta.page);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete exam', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    let headers = [];
    let dataRows = [];
    let fileName = '';

    if (activeTab === 'schedule') {
      if (filteredRows.length === 0) {
        showToast('No exam schedules available to export', 'error');
        return;
      }
      headers = ['Exam Name', 'Class', 'Subject', 'Date', 'Start Time', 'End Time'];
      dataRows = filteredRows.map(row => [
        `"${(row.examName || '').replace(/"/g, '""')}"`,
        `"${(row.className || '').replace(/"/g, '""')}"`,
        `"${(row.subject || '').replace(/"/g, '""')}"`,
        `"${row.examDate ? new Date(row.examDate).toLocaleDateString() : ''}"`,
        `"${(row.startTime || '').replace(/"/g, '""')}"`,
        `"${(row.endTime || '').replace(/"/g, '""')}"`
      ]);
      fileName = `Exam_Schedule_${new Date().getTime()}.csv`;
    } else {
      if (structures.length === 0) {
        showToast('No exam structures available to export', 'error');
        return;
      }
      headers = ['Exam Name', 'Exam Type', 'Academic Year', 'Term', 'SubjectsCount', 'Total Marks'];
      dataRows = structures.map(row => [
        `"${(row.examName || '').replace(/"/g, '""')}"`,
        `"${(row.examType || '').replace(/"/g, '""')}"`,
        `"${(row.academicYear || '').replace(/"/g, '""')}"`,
        `"${row.term === 'term1' ? 'Term 1' : row.term === 'term2' ? 'Term 2' : 'Annual'}"`,
        `"${(row.subjectMarkings || []).length}"`,
        `"${(row.subjectMarkings || []).reduce((acc, sm) => acc + (sm.totalMaxMarks || 0), 0)}"`
      ]);
      fileName = `Exam_Structures_${new Date().getTime()}.csv`;
    }

    const csvContent = [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  };

  const groupedByDate = useMemo(() => {
    const filtered = rows.filter((item) => (subjectFilter ? item.subject === subjectFilter : true));
    return filtered.reduce((acc, row) => {
      const key = new Date(row.examDate).toLocaleDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});
  }, [rows, subjectFilter]);

  const filteredRows = useMemo(
    () => rows.filter((item) => (subjectFilter ? item.subject === subjectFilter : true)),
    [rows, subjectFilter]
  );

  // DataTable columns for exam schedule
  const examColumns = useMemo(() => [
    { label: 'Exam Name', key: 'examName', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { label: 'Class', key: 'className' },
    { label: 'Subject', key: 'subject' },
    { label: 'Date', key: 'examDate', render: (val) => new Date(val).toLocaleDateString() },
    { label: 'Time', key: 'time', render: (_, row) => `${row.startTime} - ${row.endTime}` },
    { 
      label: 'Actions', 
      key: 'actions', 
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => { setDeleteTarget(row); openModal(DELETE_EXAM_MODAL_ID); }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], []);

  // DataTable columns for exam structures
  const structureColumns = useMemo(() => [
    { label: 'Exam Name', key: 'examName', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { label: 'Exam Type', key: 'examType' },
    { label: 'Academic Year', key: 'academicYear' },
    { label: 'Term', key: 'term', render: (val) => val === 'term1' ? 'Term 1' : val === 'term2' ? 'Term 2' : 'Annual' },
    { label: 'Subjects', key: 'subjects', render: (_, row) => (row.subjectMarkings || []).length },
    { label: 'Total Marks', key: 'totalMarks', render: (_, row) => (row.subjectMarkings || []).reduce((acc, sm) => acc + (sm.totalMaxMarks || 0), 0) },
    { 
      label: 'Actions', 
      key: 'actions', 
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => openEditStructure(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => { setDeleteStructureTarget(row); openModal(DELETE_STRUCTURE_MODAL_ID); }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], []);

  // KPI stats
  const examStats = useMemo(() => {
    return {
      totalExams: rows.length,
      upcoming: rows.filter(r => new Date(r.examDate) >= new Date()).length,
      totalStructures: structures.length,
    };
  }, [rows, structures]);

  return (
    <div className="w-full space-y-6 text-left">
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page heading ── */}
      <Heading
        primaryText="Exam"
        secondaryText="Schedule"
        size={12}
        showAnimations={true}
      />

      {/* ── KPI Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Exams"
          value={String(examStats.totalExams)}
          icon={<Calendar size={22} />}
          size={4}
          accentColor="#223F74"
        />
        <EnhancedDashCard
          title="Upcoming Exams"
          value={String(examStats.upcoming)}
          icon={<CalendarRange size={22} />}
          size={4}
          accentColor="#10B981"
        />
        <EnhancedDashCard
          title="Exam Structures"
          value={String(examStats.totalStructures)}
          icon={<GraduationCap size={22} />}
          size={4}
          accentColor="#3B82F6"
        />
      </DashGrid>

      {/* ── Action Buttons ── */}
      <div className="flex justify-end gap-3">
        <Button
          text="Export"
          variant="secondary"
          onClick={handleExportCsv}
          size={12}
          icon={<FileDown size={16} />}
        />

        {activeTab === 'schedule' ? (
          <Button
            text="Add Exam"
            variant="primary"
            onClick={openCreateModal}
            size={12}
            icon={<Plus size={16} />}
          />
        ) : (
          <Button
            text="Create Structure"
            variant="primary"
            onClick={openCreateStructure}
            size={12}
            icon={<Plus size={16} />}
          />
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <div className="inline-flex rounded-2xl p-1 gap-1 border border-[#E2E8F0] bg-white shadow-sm">
          {[
            { id: 'schedule', label: 'Exam Schedule', icon: LayoutList },
            { id: 'structure', label: 'Exam Structure', icon: GraduationCap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${activeTab === id
                  ? 'bg-[#223F74] text-white shadow-md'
                  : 'text-[#6B7280] hover:text-[#223F74] hover:bg-[#F8EEE9]'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' && (
          <>
            {/* ── Filters ── */}
            <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
              <Grid cols={12} gap={4}>
                <DataField
                  label="Search"
                  id="exam_search"
                  icon={Search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exam or subject"
                  size={3}
                />
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
                  <Select
                    id="exam_class_filter"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    searchable={false}
                  >
                    <Option value="" label="All Classes" />
                    {classOptions.map((item) => (
                      <Option key={item} value={item} label={item} />
                    ))}
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Subject</label>
                  <Select
                    id="exam_subject_filter"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    searchable={false}
                  >
                    <Option value="" label="All Subjects" />
                    {filterSubjects.map((item) => (
                      <Option key={item} value={item} label={item} />
                    ))}
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-3 flex items-end gap-2">
                  <Button
                    text="Apply"
                    variant="primary"
                    onClick={() => loadExams(1)}
                    size={12}
                  />
                  <Button
                    text={calendarView ? 'Table View' : 'Calendar View'}
                    variant="secondary"
                    onClick={() => setCalendarView((prev) => !prev)}
                    size={12}
                    icon={<CalendarRange size={16} />}
                  />
                </div>
              </Grid>
            </div>

            {/* ── Content ── */}
            {loading ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center text-[#6B7280]">
                Loading exams...
              </div>
            ) : calendarView ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="col-span-full rounded-[24px] border border-slate-200 bg-white p-10 text-center text-[#6B7280]">
                    No exam schedules found.
                  </div>
                ) : (
                  Object.entries(groupedByDate).map(([dateKey, items]) => (
                    <div key={dateKey} className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
                      <h3 className="mb-3 text-sm font-bold text-[#223F74]">{dateKey}</h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <button
                            key={item._id}
                            className="w-full rounded-xl p-3 text-left transition-colors duration-200 bg-[#F8F5F1] hover:bg-[#F8EEE9]"
                            onClick={() => openEditModal(item)}
                          >
                            <p className="text-sm font-semibold text-[#1D1D1F]">{item.examName}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              {item.className} | {item.subject} | {item.startTime} - {item.endTime}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <DataTable
                title="Exam Schedule"
                rows={filteredRows}
                columns={examColumns}
                searchable={true}
                exportable={true}
                exportFileName="Exam_Schedule"
              />
            )}
          </>
        )}

        {/* ── Pagination ── */}
        {activeTab === 'schedule' && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">Total exams: {meta.total || 0}</p>
            <div className="flex items-center gap-2">
              <Button
                text="Previous"
                variant="secondary"
                onClick={() => loadExams(Math.max((meta.page || 1) - 1, 1))}
                disabled={(meta.page || 1) <= 1}
                size={12}
              />
              <span className="text-sm font-medium text-[#6B7280]">Page {meta.page || 1} of {meta.totalPages || 1}</span>
              <Button
                text="Next"
                variant="secondary"
                onClick={() => loadExams(Math.min((meta.page || 1) + 1, meta.totalPages || 1))}
                disabled={(meta.page || 1) >= (meta.totalPages || 1)}
                size={12}
              />
            </div>
          </div>
        )}

        {/* ═══════════ EXAM STRUCTURE TAB CONTENT ═══════════ */}
        {activeTab === 'structure' && (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#223F74]/10 text-[#223F74]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1D1D1F]">
                    Exam Structures
                  </p>
                  <p className="text-xs mt-0.5 text-[#6B7280]">
                    Exam structures define the blueprint for each exam — which subjects are tested, 
                    maximum and passing marks per subject, and grading rules. Create a structure first, 
                    then schedule it for specific classes.
                  </p>
                </div>
              </div>
            </div>

            {structuresLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center text-[#6B7280]">
                Loading exam structures...
              </div>
            ) : (
              <DataTable
                title="Exam Structures"
                rows={structures}
                columns={structureColumns}
                searchable={true}
                exportable={true}
                exportFileName="Exam_Structures"
              />
            )}
          </div>
        )}

      {/* ── Exam Form Modal (uses shared Modal wrapper) ── */}
      <ExamFormModal
        modalId={EXAM_FORM_MODAL_ID}
        mode={mode}
        form={form}
        setForm={setForm}
        onClose={() => { closeModal(EXAM_FORM_MODAL_ID); setForm(emptyForm); }}
        onSubmit={handleSave}
        classOptions={classOptions}
        subjectOptions={modalSubjects}
        submitting={submitting}
        dropdownLoading={dropdownLoading}
        dropdownError={dropdownError}
      />

      {/* ── Delete Exam Confirm Modal ── */}
      <Modal id={DELETE_EXAM_MODAL_ID} title="Delete Exam" size="sm" onClose={() => setDeleteTarget(null)}>
        <div className="p-2">
          <p className="text-sm text-[#6B7280] mt-2">
            Are you sure you want to delete <span className="font-bold text-[#1D1D1F]">{deleteTarget?.examName}</span> for <span className="font-bold text-[#1D1D1F]">{deleteTarget?.className}</span>?
          </p>
          <div className="mt-6">
            <DashGrid cols={12} gap={3}>
              <Button text="Cancel" variant="secondary" onClick={() => { closeModal(DELETE_EXAM_MODAL_ID); setDeleteTarget(null); }} size={6} />
              <Button text="Delete" variant="danger" onClick={handleDelete} loading={deleting} size={6} />
            </DashGrid>
          </div>
        </div>
      </Modal>

      {/* ── Exam Structure Form Modal ── */}
      <ExamStructureFormModal
        open={isStructureModalOpen}
        mode={structureMode}
        initialData={editingStructure}
        onClose={() => { setIsStructureModalOpen(false); setEditingStructure(null); }}
        onSubmit={handleStructureSubmit}
        submitting={structureSubmitting}
        classOptions={allClasses}
        subjectOptions={allSubjects}
      />

      {/* ── Delete Structure Confirm Modal ── */}
      <Modal id={DELETE_STRUCTURE_MODAL_ID} title="Delete Exam Structure" size="sm" onClose={() => setDeleteStructureTarget(null)}>
        <div className="p-2">
          <p className="text-sm text-[#6B7280] mt-2">
            Are you sure you want to delete <span className="font-bold text-[#1D1D1F]">{deleteStructureTarget?.examName}</span>? This action cannot be undone.
          </p>
          <div className="mt-6">
            <DashGrid cols={12} gap={3}>
              <Button text="Cancel" variant="secondary" onClick={() => { closeModal(DELETE_STRUCTURE_MODAL_ID); setDeleteStructureTarget(null); }} size={6} />
              <Button text="Delete Structure" variant="danger" onClick={handleDeleteStructure} loading={deletingStructure} size={6} />
            </DashGrid>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Exams;
