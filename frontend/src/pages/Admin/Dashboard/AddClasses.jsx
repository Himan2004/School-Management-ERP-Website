import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Plus, X, Edit2, Trash2, BookOpen, Users,
  CheckCircle, Search, Filter,
  School, GraduationCap, UserPlus,
  TrendingUp, Award, BookMarked, FileText,
  ChevronLeft, ChevronRight, Clock,
  User, Play, Pause, Calendar,
  ChevronDown, AlertCircle, Check,
  ArrowRight, ArrowLeft, Layers,
  Info, Sparkles, MoreVertical
} from 'lucide-react';
import * as classesApi from '../../../services/classesApi';
import api from '../../../services/api';

/**
 * ANIMATION VARIANTS
 */
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalContent = {
  initial: { scale: 0.9, opacity: 0, y: 20 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.9, opacity: 0, y: 20 }
};

const AddClasses = () => {
  const authUser = useSelector((state) => state.adminAuth?.authUser);
  const allocatedGrades = useMemo(() => {
    const gradesString = authUser?.school?.gradesOffered || "";
    return gradesString ? gradesString.split(",").map(g => g.trim().toLowerCase()) : [];
  }, [authUser?.school?.gradesOffered]);

  const isClassAllowed = useCallback((clsName) => {
    if (!allocatedGrades.length) return false;
    let cleanName = clsName.trim().toLowerCase();
    if (cleanName.startsWith("class ")) {
      cleanName = cleanName.substring(6).trim();
    }
    return allocatedGrades.includes(cleanName);
  }, [allocatedGrades]);

  // ----------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic dropdown lists from API
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  
  // Loading & Error states for API fetches
  const [classesLoading, setClassesLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [classesError, setClassesError] = useState(null);
  const [teachersError, setTeachersError] = useState(null);
  
  // Submission state
  const [isSaving, setIsSaving] = useState(false);

  // Principal-assigned classes state
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'principal'
  const [principalAssignments, setPrincipalAssignments] = useState([]);
  const [principalLoading, setPrincipalLoading] = useState(false);
  const [principalError, setPrincipalError] = useState(null);

  // Modal Visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Wizard Navigation
  const [activeStep, setActiveStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Filters & Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  const itemsPerPage = 6;

  // Form State
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    classTeacher: '',
    room: '',
    capacity: '',
    timings: '08:00 AM - 10:00 AM',
    academicYear: '2024-25',
    subjectName: '',
    customClassName: '',
    customSection: '',
    colorScheme: 'blue'
  });

  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colorSchemes = [
    { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
    { id: 'purple', bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
    { id: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { id: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600' },
    { id: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600' },
  ];

  // ----------------------------------------------------------------
  // EFFECTS / MOUNT LOADERS
  // ----------------------------------------------------------------

  // Fetch standard data on mount
  useEffect(() => {
    fetchClassesFromAPI();
    loadDropdownData();
  }, []);

  // Fetch Principal Assignments when activeTab changes to 'principal'
  const fetchPrincipalAssignments = async () => {
    try {
      setPrincipalLoading(true);
      setPrincipalError(null);
      const res = await api.get('/admin/academic/teacher-assignments');
      if (res.data && res.data.success && res.data.data?.assignments) {
        setPrincipalAssignments(res.data.data.assignments);
      } else {
        setPrincipalAssignments([]);
      }
    } catch (err) {
      console.error('Failed to fetch principal assignments:', err);
      setPrincipalError('Failed to load Principal-assigned classes.');
    } finally {
      setPrincipalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'principal') {
      fetchPrincipalAssignments();
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Dropdowns from Backend API
  const loadDropdownData = async () => {
    // 1. Fetch Dynamic Classes/Grades list from Principal Academics
    try {
      setClassesLoading(true);
      setClassesError(null);
      const res = await api.get('/admin/academic/classes-sections');
      if (res.data && res.data.success && res.data.data) {
        const sorted = [...res.data.data].sort((a, b) => a.name.localeCompare(b.name));
        setAvailableClasses(sorted);
      } else {
        setAvailableClasses([]);
      }
    } catch (err) {
      console.error('Failed to load classes-sections:', err);
      setClassesError('Failed to load standard class list.');
    } finally {
      setClassesLoading(false);
    }

    // 2. Fetch Available Teachers List from Teacher API
    try {
      setTeachersLoading(true);
      setTeachersError(null);
      const res = await api.get('/admin/teachers');
      if (res.data && res.data.success && res.data.teachers) {
        setAvailableTeachers(res.data.teachers);
      } else {
        setAvailableTeachers([]);
      }
    } catch (err) {
      console.error('Failed to load available teachers:', err);
      setTeachersError('Failed to load available teachers list.');
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchClassesFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await classesApi.fetchClasses();
      if (response.data && response.data.data) {
        const apiClasses = response.data.data.map(cls => ({
          id: cls._id,
          className: cls.periodName,
          section: cls.section,
          classTeacher: cls.homeroomTeacher?.user?.name || cls.homeroomTeacher?.name || 'Not Assigned',
          homeroomTeacherId: cls.homeroomTeacher?._id || '',
          room: cls.roomNumber || '',
          capacity: cls.maxCapacity || 40,
          timings: cls.schedule || '',
          academicYear: cls.academicYear || '2024-25',
          students: 0,
          subjects: cls.subjects?.length || 0,
          status: cls.status || 'active',
          progress: 0,
          createdAt: cls.createdAt || new Date().toISOString(),
          colorScheme: 'blue',
          subjectList: cls.subjects || []
        }));
        setClasses(apiClasses);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setError(err.response?.data?.message || 'Failed to fetch classes');
      addNotification('Failed to fetch classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // UTILITIES & NOTIFICATIONS
  // ----------------------------------------------------------------

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validation function per wizard step
  const validateStep = (step) => {
    if (step === 1) {
      const hasClassName = formData.className === 'other'
        ? formData.customClassName?.trim()
        : formData.className?.trim();
      const hasSection = formData.section === 'other'
        ? formData.customSection?.trim()
        : formData.section?.trim();
      return Boolean(hasClassName && hasSection);
    }
    if (step === 2) {
      const hasRoom = formData.room?.trim();
      const capacityNum = parseInt(formData.capacity);
      const hasCapacity = !isNaN(capacityNum) && capacityNum > 0;
      return Boolean(hasRoom && hasCapacity);
    }
    return true;
  };

  const isEditFormValid = () => {
    const hasClassName = formData.className === 'other'
      ? formData.customClassName?.trim()
      : formData.className?.trim();
    const hasSection = formData.section === 'other'
      ? formData.customSection?.trim()
      : formData.section?.trim();
    const hasRoom = formData.room?.trim();
    const capacityNum = parseInt(formData.capacity);
    const hasCapacity = !isNaN(capacityNum) && capacityNum > 0;
    return Boolean(hasClassName && hasSection && hasRoom && hasCapacity);
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    } else {
      addNotification("Please fill all required fields", "error");
    }
  };

  const prevStep = () => setActiveStep(prev => prev - 1);

  const resetForm = () => {
    setFormData({
      className: '', section: '', classTeacher: '', room: '',
      capacity: '', timings: '08:00 AM - 10:00 AM', academicYear: '2024-25',
      customClassName: '', customSection: '',
      subjectName: '', colorScheme: 'blue'
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setActiveStep(1);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetForm();
  };

  const handleEditClick = (classItem) => {
    setSelectedClass(classItem);
    const isStandardClass = availableClasses.some(c => c.name === classItem.className);
    const isStandardSection = sections.includes(classItem.section);
    setFormData({
      className: isStandardClass ? classItem.className : 'other',
      section: isStandardSection ? classItem.section : 'other',
      classTeacher: classItem.homeroomTeacherId || '',
      room: classItem.room,
      capacity: classItem.capacity,
      timings: classItem.timings,
      academicYear: classItem.academicYear || '2024-25',
      customClassName: isStandardClass ? '' : classItem.className,
      customSection: isStandardSection ? '' : classItem.section,
      subjectName: '',
      colorScheme: classItem.colorScheme || 'blue'
    });
    setShowEditModal(true);
  };

  // ----------------------------------------------------------------
  // FORM SUBMISSION ACTIONS
  // ----------------------------------------------------------------

  const handleAddClass = async (e) => {
    if (e) e.preventDefault();

    try {
      setIsSaving(true);
      let finalClassName = formData.className === 'other' ? formData.customClassName : formData.className;
      let finalSection = formData.section === 'other' ? formData.customSection : formData.section;
      let finalTeacher = formData.classTeacher; // Teacher ObjectId

      // Double-check validation before posting
      if (!finalClassName || !finalClassName.trim()) {
        addNotification('Please select or enter a Class name', 'error');
        return;
      }
      if (!finalSection || !finalSection.trim()) {
        addNotification('Please select or enter a Section', 'error');
        return;
      }
      if (!formData.room || !formData.room.trim()) {
        addNotification('Please enter Room Number', 'error');
        return;
      }
      if (!formData.capacity || parseInt(formData.capacity) <= 0) {
        addNotification('Please enter a positive Student Capacity', 'error');
        return;
      }

      if (!isClassAllowed(finalClassName)) {
        addNotification("Organization capacity exceeded. Selected grade is not allocated to this school.", "error");
        return;
      }

      const classData = {
        periodName: finalClassName.trim(),
        gradeLevel: finalClassName.trim(),
        section: finalSection.trim(),
        academicYear: formData.academicYear,
        homeroomTeacher: finalTeacher || undefined,
        maxCapacity: parseInt(formData.capacity) || 40,
        roomNumber: formData.room.trim(),
        schedule: formData.timings,
        status: 'active'
      };

      const response = await classesApi.createClass(classData);
      
      if (response.data && response.data.success) {
        const newClass = response.data.data;
        const classItem = {
          id: newClass._id,
          className: newClass.periodName,
          section: newClass.section,
          classTeacher: newClass.homeroomTeacher?.user?.name || newClass.homeroomTeacher?.name || 'Not Assigned',
          homeroomTeacherId: newClass.homeroomTeacher?._id || '',
          room: newClass.roomNumber || '',
          capacity: newClass.maxCapacity || 40,
          timings: newClass.schedule || '',
          academicYear: newClass.academicYear || '2024-25',
          students: 0,
          subjects: newClass.subjects?.length || 0,
          status: newClass.status || 'active',
          progress: 0,
          createdAt: newClass.createdAt || new Date().toISOString(),
          colorScheme: formData.colorScheme,
          subjectList: newClass.subjects || []
        };

        setClasses(prev => [classItem, ...prev]);
        setShowAddModal(false);
        setActiveStep(1);
        addNotification(`Lecture ${finalClassName} added successfully!`, 'success');
        resetForm();
      }
    } catch (err) {
      console.error('Error creating class:', err);
      addNotification(err.response?.data?.message || 'Failed to create class', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClass = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      let finalClassName = formData.className === 'other' ? formData.customClassName : formData.className;
      let finalSection = formData.section === 'other' ? formData.customSection : formData.section;
      let finalTeacher = formData.classTeacher; // Teacher ObjectId

      if (!isClassAllowed(finalClassName)) {
        addNotification("Organization capacity exceeded. Selected grade is not allocated to this school.", "error");
        return;
      }

      const classData = {
        periodName: finalClassName.trim(),
        gradeLevel: finalClassName.trim(),
        section: finalSection.trim(),
        homeroomTeacher: finalTeacher || undefined,
        maxCapacity: parseInt(formData.capacity) || 40,
        roomNumber: formData.room,
        schedule: formData.timings,
      };

      const response = await classesApi.updateClass(selectedClass.id, classData);
      
      if (response.data && response.data.success) {
        const updatedData = response.data.data;
        const updatedClasses = classes.map(c =>
          c.id === selectedClass.id
            ? {
              ...c,
              className: updatedData.periodName,
              section: updatedData.section,
              classTeacher: updatedData.homeroomTeacher?.user?.name || updatedData.homeroomTeacher?.name || 'Not Assigned',
              homeroomTeacherId: updatedData.homeroomTeacher?._id || '',
              room: updatedData.roomNumber || '',
              capacity: updatedData.maxCapacity || 40,
              timings: updatedData.schedule || '',
            }
            : c
        );
        setClasses(updatedClasses);
        setShowEditModal(false);
        addNotification("Lecture updated successfully", "success");
      }
    } catch (err) {
      console.error('Error updating class:', err);
      addNotification(err.response?.data?.message || 'Failed to update class', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const classToUpdate = classes.find(c => c.id === id);
      const newStatus = classToUpdate.status === 'active' ? 'inactive' : 'active';
      
      await classesApi.updateClass(id, { status: newStatus });
      
      setClasses(classes.map(c =>
        c.id === id ? { ...c, status: newStatus } : c
      ));
      addNotification("Status updated successfully", "success");
    } catch (err) {
      console.error('Error updating status:', err);
      addNotification(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ----------------------------------------------------------------
  // FILTERING, PAGINATION & STATS
  // ----------------------------------------------------------------

  const filteredClasses = useMemo(() => {
    const allowed = classes.filter(c => isClassAllowed(c.className || ""));
    return allowed.filter(c => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        c.className?.toLowerCase().includes(searchStr) ||
        c.classTeacher?.toLowerCase().includes(searchStr) ||
        c.room?.includes(searchTerm);

      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesClass = filterClass === 'all' || c.className === filterClass;

      return matchesSearch && matchesStatus && matchesClass;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'name-asc') return a.className.localeCompare(b.className);
      if (sortBy === 'students-high') return (b.students || 0) - (a.students || 0);
      return 0;
    });
  }, [classes, searchTerm, filterStatus, filterClass, sortBy, isClassAllowed]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClasses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);

  const filteredPrincipalAssignments = useMemo(() => {
    const allowed = principalAssignments.filter(assignment => isClassAllowed(assignment.class?.name || ''));
    return allowed.filter(assignment => {
      const searchStr = searchTerm.toLowerCase().trim();
      const className = assignment.class?.name || '';
      const section = assignment.section || '';
      const subjectName = assignment.subject?.subjectName || assignment.subject?.name || '';
      const teacherName = assignment.teacherUser?.name || '';
      
      const matchesSearch = !searchStr || 
        className.toLowerCase().includes(searchStr) ||
        section.toLowerCase().includes(searchStr) ||
        subjectName.toLowerCase().includes(searchStr) ||
        teacherName.toLowerCase().includes(searchStr);
        
      const matchesClass = filterClass === 'all' || className === filterClass;
      
      return matchesSearch && matchesClass;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'name-asc') return (a.class?.name || '').localeCompare(b.class?.name || '');
      return 0;
    });
  }, [principalAssignments, searchTerm, filterClass, sortBy, isClassAllowed]);

  const principalItemsPerPage = 6;
  const totalPrincipalPages = Math.ceil(filteredPrincipalAssignments.length / principalItemsPerPage);
  const indexOfLastPrincipalItem = currentPage * principalItemsPerPage;
  const indexOfFirstPrincipalItem = indexOfLastPrincipalItem - principalItemsPerPage;
  const currentPrincipalItems = filteredPrincipalAssignments.slice(indexOfFirstPrincipalItem, indexOfLastPrincipalItem);

  const displayPages = activeTab === 'admin' ? totalPages : totalPrincipalPages;
  const displayFirstItem = activeTab === 'admin' ? indexOfFirstItem : indexOfFirstPrincipalItem;
  const displayLastItem = activeTab === 'admin' ? indexOfLastItem : indexOfLastPrincipalItem;
  const displayTotalCount = activeTab === 'admin' ? filteredClasses.length : filteredPrincipalAssignments.length;

  const stats = useMemo(() => ({
    total: classes.length,
    active: classes.filter(c => c.status === 'active').length,
    students: classes.reduce((acc, c) => acc + (c.students || 0), 0),
    teachers: availableTeachers.length,
    occupancy: classes.length > 0
      ? Math.round((classes.reduce((acc, c) => acc + (c.students || 0), 0) / classes.reduce((acc, c) => acc + (c.capacity || 0), 0)) * 100)
      : 0
  }), [classes, availableTeachers]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // ----------------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------------

  const StepIndicator = ({ current, total }) => (
    <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-8 flex-nowrap">
      {[...Array(total)].map((_, i) => (
        <React.Fragment key={i}>
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-500 flex-shrink-0 ${
            current > i + 1 ? 'bg-green-500 text-white' :
            current === i + 1 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'
          }`}>
            {current > i + 1 ? <Check size={14} className="md:w-4 md:h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 sm:w-12 h-1 ${current > i + 1 ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-500 flex-shrink`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 font-sans text-slate-900 dark:text-white transition-colors duration-250">

      {/* NOTIFICATIONS TRAY */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border ${n.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-350'
                }`}
            >
              {n.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} className="text-green-500" />}
              <span className="text-sm font-medium">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-blue-200 shadow-lg">
              <School className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Lecture <span className="text-blue-600">Scheduler</span>
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
            <Calendar size={14} />
            Academic Management Dashboard • {formData.academicYear}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
              <Clock className="w-5 h-5 text-blue-600 relative z-10" />
            </div>
            <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-300">
              {formatTime(currentTime)}
            </span>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 border dark:border-[#334155] text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200/10 transition-all hover:bg-blue-600"
          >
            <Plus className="w-5 h-5" />
            Add New Lecture
          </motion.button>
        </div>
      </header>

      {/* STATS GRID */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10"
      >
        {[
          { label: 'Total Lectures', value: stats.total, icon: School, color: 'blue' },
          { label: 'Live Now', value: stats.active, icon: Play, color: 'emerald' },
          { label: 'Students Enrolled', value: stats.students, icon: Users, color: 'purple' },
          { label: 'Faculty Count', value: stats.teachers, icon: UserPlus, color: 'amber' },
          { label: 'Occupancy Rate', value: `${stats.occupancy}%`, icon: TrendingUp, color: 'rose' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            className="bg-white dark:bg-[#1e293b] p-5 rounded-3xl border border-slate-100 dark:border-[#334155] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-slate-800 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* TABS SELECTOR */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mb-8 border border-slate-200/50 dark:border-[#334155]/50 shadow-inner">
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'admin'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-100'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap size={18} />
          Admin Classes
        </button>
        <button
          onClick={() => setActiveTab('principal')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'principal'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-100'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users size={18} />
          Principal Classes
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-3xl border border-slate-100 dark:border-[#334155] shadow-sm mb-8 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'admin' ? "Search by class name, teacher, or room..." : "Search by class name, section, subject, or teacher..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 dark:text-white placeholder-slate-450"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {activeTab === 'admin' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-semibold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-semibold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="name-asc">Alphabetical</option>
            {activeTab === 'admin' && <option value="students-high">Top Students</option>}
          </select>
        </div>
      </div>

      {/* LECTURES GRID */}
      {activeTab === 'admin' && (
        <LayoutGroup>
          <AnimatePresence mode='popLayout'>
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-dashed border-slate-200 dark:border-[#334155]"
              >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 animate-pulse" />
                  <School size={64} className="text-blue-600 relative z-10 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Loading Lectures...</h2>
                <p className="text-slate-500 font-medium">Fetching your lecture schedules from the server.</p>
              </motion.div>
            ) : currentItems.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {currentItems.map((classItem) => (
                  <motion.div
                    layout
                    key={classItem.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-100 dark:border-[#334155] shadow-sm hover:shadow-xl transition-all group overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${classItem.colorScheme || 'blue'}-50 dark:bg-slate-800 text-${classItem.colorScheme || 'blue'}-600 dark:text-${classItem.colorScheme || 'blue'}-400`}>
                            <GraduationCap size={28} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                              {classItem.className}
                            </h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                              Section {classItem.section} • Room {classItem.room}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${classItem.status === 'active' ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                          {classItem.status}
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                          <div className="flex items-center gap-3 text-slate-500">
                            <User size={16} />
                            <span className="text-sm font-bold">Faculty</span>
                          </div>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{classItem.classTeacher}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border border-slate-100 dark:border-[#334155] rounded-2xl text-center">
                            <Users size={16} className="mx-auto mb-1 text-blue-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Students</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{classItem.students}/{classItem.capacity}</p>
                          </div>
                          <div className="p-3 border border-slate-100 dark:border-[#334155] rounded-2xl text-center">
                            <Clock size={16} className="mx-auto mb-1 text-orange-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Timing</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate px-1">{classItem.timings.split('-')[0]}</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-400">Course Progress</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{classItem.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${classItem.progress}%` }}
                            className={`h-full bg-${classItem.colorScheme || 'blue'}-500 rounded-full`}
                          />
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-[#334155]">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-350">
                              {String.fromCharCode(64 + i)}
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                            +{classItem.subjects || 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditClick(classItem)}
                            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(classItem.id)}
                            className={`p-2.5 rounded-xl transition-all ${classItem.status === 'active' ? 'text-orange-550 hover:bg-orange-50 dark:hover:bg-orange-955/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-955/20'}`}
                          >
                            {classItem.status === 'active' ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                          </button>
                          <button
                            onClick={() => { setSelectedClass(classItem); setShowDeleteModal(true); }}
                            className="p-2.5 text-slate-400 hover:text-red-555 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-[#1e293b]/70 border border-dashed border-slate-200 dark:border-[#334155] rounded-[3rem]"
              >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 animate-pulse" />
                  <School size={64} className="text-blue-600 relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Lectures Scheduled</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">Start by adding your first lecture to manage students and academic progress effectively.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all"
                >
                  <Plus size={20} />
                  Create First Lecture
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      )}

      {/* PRINCIPAL CLASSES GRID */}
      {activeTab === 'principal' && (
        <LayoutGroup>
          <AnimatePresence mode='popLayout'>
            {principalLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-dashed border-slate-200 dark:border-[#334155]"
              >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 animate-pulse" />
                  <School size={64} className="text-blue-600 relative z-10 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Loading Assignments...</h2>
                <p className="text-slate-500 font-medium">Fetching Principal assignments from the server.</p>
              </motion.div>
            ) : principalError ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30"
              >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-red-100 rounded-full scale-150" />
                  <AlertCircle size={64} className="text-red-600 relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Failed to Load Assignments</h2>
                <p className="text-slate-500 font-medium mb-8">{principalError}</p>
                <button
                  onClick={fetchPrincipalAssignments}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  Retry
                </button>
              </motion.div>
            ) : currentPrincipalItems.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {currentPrincipalItems.map((assignment) => (
                  <motion.div
                    layout
                    key={assignment._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-100 dark:border-[#334155] shadow-sm hover:shadow-xl transition-all group overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400">
                            <GraduationCap size={28} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                              {assignment.class?.name || 'Class / Grade'}
                            </h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                              Section {assignment.section || 'N/A'} • Year {assignment.academicYear}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">
                          Principal Assigned
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                          <div className="flex items-center gap-3 text-slate-500">
                            <BookOpen size={16} />
                            <span className="text-sm font-bold">Subject</span>
                          </div>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {assignment.subject?.subjectName || assignment.subject?.name || 'N/A'} ({assignment.subject?.subjectCode || assignment.subject?.code || 'N/A'})
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                          <div className="flex items-center gap-3 text-slate-500">
                            <User size={16} />
                            <span className="text-sm font-bold">Teacher</span>
                          </div>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {assignment.teacherUser?.name || 'Not Assigned'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-semibold text-right italic">
                        Read Only Assignment
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-[#1e293b]/70 border border-dashed border-slate-200 dark:border-[#334155] rounded-[3rem]"
              >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 animate-pulse" />
                  <School size={64} className="text-blue-600 relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Principal Assignments Found</h2>
                <p className="text-slate-500 font-medium max-w-sm mx-auto">There are no matching classes or subject allocations assigned by the Principal.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      )}

      {/* PAGINATION */}
      {displayPages > 1 && (
        <div className="mt-12 flex items-center justify-between bg-white dark:bg-[#1e293b] p-4 rounded-[2rem] border border-slate-100 dark:border-[#334155] shadow-sm">
          <p className="text-sm font-bold text-slate-400 ml-4">
            Showing <span className="text-slate-900 dark:text-white">{displayFirstItem + 1}-{Math.min(displayLastItem, displayTotalCount)}</span> of {displayTotalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft />
            </button>
            {[...Array(displayPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === displayPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all text-slate-700 dark:text-slate-300"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* MULTI-STEP ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              variants={modalContent}
              className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-[95vw] md:w-[90vw] lg:max-w-[900px] lg:w-full max-h-[90vh] flex flex-col overflow-hidden border dark:border-[#334155]"
            >
              {/* Modal Header */}
              <div className="relative px-6 py-6 md:px-8 md:py-8 bg-slate-900 dark:bg-slate-950 text-white overflow-hidden flex-shrink-0 border-b dark:border-[#334155]">
                <div className="absolute top-0 right-0 p-12 bg-blue-600 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl md:text-3xl font-black">Create Lecture</h2>
                    <button onClick={handleCloseAddModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs md:text-sm font-medium italic">Step {activeStep} of 3: {activeStep === 1 ? 'Basic Identification' : activeStep === 2 ? 'Logistics & Capacity' : 'Confirmation'}</p>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
                <StepIndicator current={activeStep} total={3} />

                <div className="min-h-0">
                  <AnimatePresence mode="wait">
                    {activeStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Class / Grade <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <select
                                name="className"
                                value={formData.className}
                                onChange={handleInputChange}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">Select Class / Grade</option>
                                {availableClasses.map(c => (
                                  <option key={c._id || c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                                <option value="other">Custom / Other...</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                            {classesLoading && (
                              <p className="text-blue-500 text-xs font-semibold mt-1 flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Loading class list...
                              </p>
                            )}
                            {classesError && (
                              <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-xl flex items-center justify-between text-xs font-semibold">
                                <span>{classesError}</span>
                                <button
                                  type="button"
                                  onClick={loadDropdownData}
                                  className="underline font-bold hover:text-red-900"
                                >
                                  Retry
                                </button>
                              </div>
                            )}
                            {formData.className === 'other' && (
                              <motion.input
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                type="text"
                                name="customClassName"
                                placeholder="Enter specific name..."
                                value={formData.customClassName}
                                onChange={handleInputChange}
                                className="w-full px-5 py-3 mt-2 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold text-blue-700 placeholder:text-blue-300 focus:outline-none"
                              />
                            )}
                            {formData.className === 'other' && !formData.customClassName.trim() && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">Custom Class Name is required.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Section <span className="text-red-500">*</span></label>
                            <div className="flex flex-wrap gap-2">
                              {['A', 'B', 'C', 'D', 'E', 'other'].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, section: s })}
                                  className={`flex-grow py-4 px-3 rounded-2xl font-black transition-all ${formData.section === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                  {s === 'other' ? 'Custom' : s}
                                </button>
                              ))}
                            </div>
                            {formData.section === 'other' && (
                              <motion.input
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                type="text"
                                name="customSection"
                                placeholder="Enter custom section (e.g. F)..."
                                value={formData.customSection}
                                onChange={handleInputChange}
                                className="w-full px-5 py-3 mt-2 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold text-blue-700 placeholder:text-blue-300 focus:outline-none"
                              />
                            )}
                            {formData.section === 'other' && !formData.customSection.trim() && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">Custom Section is required.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Teacher</label>
                          <div className="relative font-bold text-slate-700">
                            <select
                              name="classTeacher"
                              value={formData.classTeacher}
                              onChange={handleInputChange}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="">Select Instructor (TBD)</option>
                              {availableTeachers.map(t => {
                                const subjects = (t.subjects || []).map(s => s.subjectName || s.name).filter(Boolean).join(', ');
                                const label = `${t.user?.name || t.name} (${t.user?.loginId || t.staffId || ''})${subjects ? ` - ${subjects}` : ''}`;
                                return (
                                  <option key={t._id} value={t._id}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                          </div>
                          {teachersLoading && (
                            <p className="text-blue-500 text-xs font-semibold mt-1 flex items-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              Loading teachers list...
                            </p>
                          )}
                          {teachersError && (
                            <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-xl flex items-center justify-between text-xs font-semibold">
                              <span>{teachersError}</span>
                              <button
                                type="button"
                                onClick={loadDropdownData}
                                className="underline font-bold hover:text-red-900"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Room No. <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="room"
                              placeholder="e.g. 402-B"
                              value={formData.room}
                              onChange={handleInputChange}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {!formData.room.trim() && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">Room number is required.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Student Capacity <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              name="capacity"
                              placeholder="Max Seats"
                              value={formData.capacity}
                              onChange={handleInputChange}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {(!formData.capacity || parseInt(formData.capacity) <= 0) && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">Capacity must be positive.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Timing Slot</label>
                          <div className="flex items-center gap-3">
                            <Clock className="text-blue-600" />
                            <input
                              type="text"
                              name="timings"
                              placeholder="08:00 AM - 10:00 AM"
                              value={formData.timings}
                              onChange={handleInputChange}
                              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Initial Subject</label>
                          <div className="relative">
                            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                              type="text"
                              name="subjectName"
                              placeholder="e.g. English"
                              value={formData.subjectName}
                              onChange={handleInputChange}
                              className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                      >
                        <div className="p-4 md:p-6 bg-blue-50 rounded-[1.5rem] md:rounded-[2rem] border border-blue-100 flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 flex-shrink-0 animate-pulse">
                            <Sparkles size={36} />
                          </div>
                          <div>
                            <h4 className="text-lg md:text-xl font-black text-blue-900">Looks Great!</h4>
                            <p className="text-blue-750 text-sm font-medium">Please review the lecture details before finalizing the schedule.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'Lecture', val: formData.className === 'other' ? formData.customClassName : formData.className, icon: GraduationCap },
                            { label: 'Instructor', val: (() => {
                                const teacherObj = availableTeachers.find(t => t._id === formData.classTeacher);
                                return teacherObj ? teacherObj.user?.name || teacherObj.name : 'TBD';
                              })(), icon: User },
                            { label: 'Location', val: `Room ${formData.room}`, icon: School },
                            { label: 'Capacity', val: `${formData.capacity} Seats`, icon: Users },
                          ].map((item, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                              <item.icon size={18} className="text-slate-400" />
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{item.label}</p>
                                <p className="text-sm font-black text-slate-700">{item.val || '---'}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Theme</label>
                          <div className="flex gap-3">
                            {colorSchemes.map(theme => (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, colorScheme: theme.id })}
                                className={`w-10 h-10 rounded-full transition-all ${theme.bg} ${formData.colorScheme === theme.id ? 'ring-4 ring-offset-2 ring-slate-900 scale-110' : 'opacity-40 hover:opacity-100'
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-between mt-10 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCloseAddModal}
                      className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    {activeStep > 1 && (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex items-center gap-2 px-5 py-3 font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                      >
                        <ArrowLeft size={18} /> Previous
                      </button>
                    )}
                  </div>

                  {activeStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!validateStep(activeStep)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next Step <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddClass}
                      disabled={isSaving || !validateStep(1) || !validateStep(2)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {isSaving ? (
                        <>
                          <span>Creating...</span>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </>
                      ) : (
                        <>
                          Confirm & Create <CheckCircle size={18} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              variants={modalContent}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border dark:border-[#334155]"
            >
              {/* Modal Header */}
              <div className="relative px-8 py-8 bg-slate-900 dark:bg-slate-950 text-white overflow-hidden border-b dark:border-[#334155]">
                <div className="absolute top-0 right-0 p-12 bg-blue-600 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20" />
                <div className="relative z-10 z-[10] flex items-center justify-between">
                  <h2 className="text-2xl font-black">Edit Lecture Details</h2>
                  <button onClick={handleCloseEditModal} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleEditClass} className="p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Class / Grade <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        name="className"
                        value={formData.className}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select Class/Grade</option>
                        {availableClasses.map(c => <option key={c._id || c.id} value={c.name}>{c.name}</option>)}
                        <option value="other">Custom / Other...</option>
                      </select>
                    </div>
                    {classesLoading && (
                      <p className="text-blue-500 text-xs font-semibold mt-1 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Loading class list...
                      </p>
                    )}
                    {classesError && (
                      <div className="mt-1 p-2 bg-red-50 text-red-700 rounded-lg flex items-center justify-between text-xs font-semibold">
                        <span>{classesError}</span>
                        <button type="button" onClick={loadDropdownData} className="underline font-bold hover:text-red-900">Retry</button>
                      </div>
                    )}
                    {formData.className === 'other' && (
                      <input
                        type="text"
                        name="customClassName"
                        placeholder="Enter specific name..."
                        value={formData.customClassName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 mt-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl font-bold text-blue-700 dark:text-blue-400 focus:outline-none animate-none"
                      />
                    )}
                    {formData.className === 'other' && !formData.customClassName.trim() && (
                      <p className="text-red-500 text-xs font-semibold mt-1">Custom Class Name is required.</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Section <span className="text-red-500">*</span></label>
                    <select
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="other">Custom Section...</option>
                    </select>
                    {formData.section === 'other' && (
                      <input
                        type="text"
                        name="customSection"
                        placeholder="Enter custom section..."
                        value={formData.customSection}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 mt-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl font-bold text-blue-700 dark:text-blue-400 focus:outline-none animate-none"
                      />
                    )}
                    {formData.section === 'other' && !formData.customSection.trim() && (
                      <p className="text-red-500 text-xs font-semibold mt-1">Custom Section is required.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Teacher</label>
                  <div className="relative">
                    <select
                      name="classTeacher"
                      value={formData.classTeacher}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Instructor (TBD)</option>
                      {availableTeachers.map(t => {
                        const subjects = (t.subjects || []).map(s => s.subjectName || s.name).filter(Boolean).join(', ');
                        const label = `${t.user?.name || t.name} (${t.user?.loginId || t.staffId || ''})${subjects ? ` - ${subjects}` : ''}`;
                        return <option key={t._id} value={t._id}>{label}</option>;
                      })}
                    </select>
                  </div>
                  {teachersLoading && (
                    <p className="text-blue-500 text-xs font-semibold mt-1 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading teachers list...
                    </p>
                  )}
                  {teachersError && (
                    <div className="mt-1 p-2 bg-red-50 text-red-700 rounded-lg flex items-center justify-between text-xs font-semibold">
                      <span>{teachersError}</span>
                      <button type="button" onClick={loadDropdownData} className="underline font-bold hover:text-red-900">Retry</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Room No. <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="room"
                      value={formData.room}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {!formData.room.trim() && (
                      <p className="text-red-500 text-xs font-semibold mt-1">Room number is required.</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Capacity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {(!formData.capacity || parseInt(formData.capacity) <= 0) && (
                      <p className="text-red-500 text-xs font-semibold mt-1">Capacity must be positive.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Timing Slot</label>
                  <input
                    type="text"
                    name="timings"
                    value={formData.timings}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Form Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-5 py-2.5 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !isEditFormValid()}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-100"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              variants={modalContent}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border dark:border-[#334155]"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-955/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Are you sure?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">This will permanently remove the <span className="font-bold text-slate-900 dark:text-white">{selectedClass?.className}</span> lecture and all associated data.</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      await classesApi.deleteClass(selectedClass.id);
                      setClasses(classes.filter(c => c.id !== selectedClass.id));
                      setShowDeleteModal(false);
                      addNotification("Lecture deleted", "error");
                    } catch (err) {
                      console.error('Error deleting class:', err);
                      addNotification(err.response?.data?.message || 'Failed to delete class', 'error');
                    }
                  }}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
                >
                  Yes, Delete it
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-4 text-slate-400 dark:text-slate-400 font-bold hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AddClasses;