import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye, Calendar, Clock, MapPin, Users, X, Bell, CheckCircle2, AlertCircle,
  Star, FileText, UserCheck, MessageSquare, Plus, UserCheck2, Edit2, Trash2, AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Button,
  DashGrid,
  DataField,
  EnhancedDashCard,
  Heading,
  Modal,
  Option,
  Select,
  SelectField,
  ToggleButton,
  DataTable,
  closeModal,
  openModal,
} from '../../components/shared/Common_Components.jsx';
import {
  getPrincipalMeetingsApi,
  createPrincipalMeetingApi,
  updatePrincipalMeetingApi,
  cancelPrincipalMeetingApi,
  getPTMFeedbackData,
} from '../../services/api/principalCommunicationApi';
import { getAdminClassesSections } from '../../services/api/adminAcademicsApi';

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

// ── Modal ids ─────────────────────────────────────────────────────────────────
const VIEW_MODAL_ID = 'admin-view-ptm-modal';
const ATTENDANCE_MODAL_ID = 'admin-ptm-attendance-modal';
const FEEDBACK_MODAL_ID = 'admin-ptm-feedback-modal';
const DELETE_MODAL_ID = 'cancel-meeting-modal';

// ── Status badge maps ─────────────────────────────────────────────────────────
const ptmStatusColors = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  Ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
  ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const attendColors = {
  Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Absent: 'bg-rose-100 text-rose-800 border-rose-200',
  Invited: 'bg-amber-100 text-amber-800 border-amber-200',
};

const SectionHeader = ({ title }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
    <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
  </div>
);

export default function ScheduleMeeting() {
  const [ptms, setPtms] = useState(() => {
    const cached = sessionStorage.getItem('admin_meetings_list');
    return cached ? JSON.parse(cached) : [];
  });
  const [classesList, setClassesList] = useState(() => {
    const cached = sessionStorage.getItem('admin_meetings_classes_list');
    return cached ? JSON.parse(cached) : [];
  });
  const [feedbackList, setFeedbackList] = useState(() => {
    const cached = sessionStorage.getItem('admin_meetings_feedback_list');
    return cached ? JSON.parse(cached) : [];
  });

  // Loading states
  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem('admin_meetings_list');
    return !cached || JSON.parse(cached).length === 0;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Global filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const editFormRef = useRef(null);

  // Form state (scheduling)
  const [formData, setFormData] = useState({
    title: '', className: '', sectionName: 'All Sections', date: '',
    startTime: '', endTime: '',
    venue: '', mode: 'Offline',
    reminder: '1 Hour Before', notify: true,
    status: 'Upcoming', agenda: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});

  // Modals / selection
  const [selectedPtm, setSelectedPtm] = useState(null);
  const [attendanceDraft, setAttendanceDraft] = useState(null); // working copy of roster
  const [feedbackDraft, setFeedbackDraft] = useState({
    parent: '', student: '', category: 'Academics', rating: 5, comment: '',
  });

  // ── Load live data ──────────────────────────────────────────────────────────
  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [meetingsRes, classesRes, feedbackRes] = await Promise.all([
        getPrincipalMeetingsApi(),
        getAdminClassesSections().catch(() => []),
        getPTMFeedbackData().catch(() => ({ data: [] }))
      ]);

      const rawMeetings = meetingsRes?.data || [];
      const formattedMeetings = rawMeetings
        .filter(m => m.type === 'PTM' || m.meetingType === 'general')
        .map(m => {
          const targetClass = m.className || m.targetRoles?.find(r => r.startsWith('Class')) || 'All Classes';
          const targetSection = m.sectionName || 'All Sections';
          return {
            ...m,
            className: targetClass,
            sectionName: targetSection,
            mode: m.isOnline ? 'Online' : 'Offline',
            reminder: m.reminder || '1 Hour Before',
            roster: (m.attendees || []).map(att => ({
              id: att.staffId?._id || att._id || Math.random().toString(),
              student: 'Student Name',
              parent: att.staffId?.name || 'Parent Name',
              status: att.attendanceStatus === 'confirmed' ? 'Present' : (att.attendanceStatus === 'declined' ? 'Declined' : 'Invited'),
              staffId: att.staffId?._id || att.staffId
            }))
          };
        });
      // Safe parsing of classes list
      const rawClasses = classesRes?.data?.classes || classesRes?.data?.data || classesRes?.data || classesRes || [];
      const fetchedClasses = Array.isArray(rawClasses) ? rawClasses : [];
      const sortedClasses = sortClasses(fetchedClasses);
      const fetchedFeedback = feedbackRes?.data || [];

      setPtms(formattedMeetings);
      setClassesList(sortedClasses);
      setFeedbackList(fetchedFeedback);

      sessionStorage.setItem('admin_meetings_list', JSON.stringify(formattedMeetings));
      sessionStorage.setItem('admin_meetings_classes_list', JSON.stringify(sortedClasses));
      sessionStorage.setItem('admin_meetings_feedback_list', JSON.stringify(fetchedFeedback));
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to load PTM data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('admin_meetings_list');
    if (!cached || JSON.parse(cached).length === 0) {
      loadData(true);
    }
  }, []);

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = ptms.length;
    const scheduled = ptms.filter(p => p.status === 'Upcoming' || p.status === 'scheduled').length;
    const completed = ptms.filter(p => p.status === 'Completed' || p.status === 'completed').length;
    const allAttendees = ptms.flatMap(p => p.roster);
    const attended = allAttendees.filter(a => a.status === 'Present').length;
    const attendanceRate = allAttendees.length
      ? Math.round((attended / allAttendees.length) * 100)
      : 0;
    const feedbackCount = feedbackList.length;
    return { total, scheduled, completed, attendanceRate, feedbackCount };
  }, [ptms, feedbackList]);

  const statCards = useMemo(() => [
    { title: 'Total PTMs', value: String(stats.total), icon: <Users size={22} />, accentColor: '#223F74' },
    { title: 'Scheduled', value: String(stats.scheduled), icon: <Calendar size={22} />, accentColor: '#3B82F6' },
    { title: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: <UserCheck size={22} />, accentColor: '#10B981' },
    { title: 'Feedback Recorded', value: String(stats.feedbackCount), icon: <MessageSquare size={22} />, accentColor: '#F59E0B' },
  ], [stats]);

  // ── Filtered PTM list (Client-side class match, query status & search) ────────
  const filteredPtms = useMemo(() => {
    return ptms.filter(p => {
      const matchSearch = !searchTerm
        || p.title.toLowerCase().includes(searchTerm.toLowerCase())
        || p.className.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' || p.status === statusFilter || (statusFilter === 'Scheduled' && p.status === 'scheduled') || (statusFilter === 'Completed' && p.status === 'completed') || (statusFilter === 'Cancelled' && p.status === 'cancelled');
      const matchClass = classFilter === 'All' || p.className === classFilter;
      return matchSearch && matchStatus && matchClass;
    });
  }, [ptms, searchTerm, statusFilter, classFilter]);

  const availableSections = useMemo(() => {
    if (!formData.className || formData.className === 'All Classes') return [];
    const selectedClass = classesList.find(c => c.name === formData.className);
    return selectedClass?.sections || [];
  }, [formData.className, classesList]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, sectionName: 'All Sections' }));
  }, [formData.className]);

  // ── Form Validation ──────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.className) newErrors.className = 'Class is required';
    if (formData.className && formData.className !== 'All Classes' && !formData.sectionName) {
      newErrors.sectionName = 'Section is required';
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start Time is required';
    if (!formData.endTime) newErrors.endTime = 'End Time is required';
    if (!formData.venue.trim()) newErrors.venue = formData.mode === 'Online' ? 'Meeting Link is required' : 'Venue is required';
    if (formData.agenda && formData.agenda.length > 500) newErrors.agenda = 'Agenda must be under 500 characters';
    
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        newErrors.endTime = 'End Time must be after Start Time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      title: '', className: '', sectionName: 'All Sections', date: '',
      startTime: '', endTime: '',
      venue: '', mode: 'Offline',
      reminder: '1 Hour Before', notify: true,
      status: 'Upcoming', agenda: '',
    });
    setEditingId(null);
    setErrors({});
  };

  // ── Scheduling handlers ──────────────────────────────────────────────────────
  const handleSchedule = async () => {
    if (!validateForm()) {
      toast.error('Please fix form validation errors.');
      return;
    }

    setSubmitting(true);
    const payload = {
      title: formData.title,
      type: "PTM",
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      venue: formData.venue,
      isOnline: formData.mode === 'Online',
      meetingLink: formData.mode === 'Online' ? formData.venue : '',
      participants: `parents, students, ${formData.className}${formData.sectionName && formData.sectionName !== 'All Sections' ? ' ' + formData.sectionName : ''}`,
      agenda: formData.agenda,
      notify: formData.notify,
      reminder: formData.reminder,
      className: formData.className,
      sectionName: formData.sectionName,
    };

    try {
      if (editingId) {
        await updatePrincipalMeetingApi(editingId, payload);
        toast.success('PTM updated successfully!');
      } else {
        await createPrincipalMeetingApi(payload);
        toast.success('PTM scheduled successfully!');
      }
      resetForm();
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to save PTM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (ptm) => {
    setEditingId(ptm.id || ptm._id);
    setFormData({
      title: ptm.title,
      className: ptm.className || '',
      sectionName: ptm.sectionName || 'All Sections',
      date: ptm.date,
      startTime: ptm.startTime,
      endTime: ptm.endTime,
      venue: ptm.venue,
      mode: ptm.mode,
      reminder: ptm.reminder,
      notify: !!ptm.notificationSent,
      status: ptm.status,
      agenda: ptm.agenda || '',
    });
    setErrors({});
    if (editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteClick = (ptm) => {
    setSelectedPtm(ptm);
    openModal(DELETE_MODAL_ID);
  };

  const confirmDelete = async () => {
    try {
      setSubmitting(true);
      await cancelPrincipalMeetingApi(selectedPtm.id || selectedPtm._id);
      toast.success('PTM cancelled successfully');
      closeModal(DELETE_MODAL_ID);
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel PTM');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View Live Details ────────────────────────────────────────────────────────
  const handleView = async (ptm) => {
    setSelectedPtm(ptm);
    openModal(VIEW_MODAL_ID);
  };

  const handleStatusChange = async (ptm, status) => {
    try {
      await updatePrincipalMeetingApi(ptm.id || ptm._id, { status: status.toLowerCase() });
      toast.success(`PTM status updated to ${status}`);
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // ── Attendance tracking ──────────────────────────────────────────────────────
  const openAttendance = (ptm) => {
    setSelectedPtm(ptm);
    setAttendanceDraft(ptm.roster.map(a => ({ ...a })));
    openModal(ATTENDANCE_MODAL_ID);
  };

  const cycleAttendance = (attendeeId) => {
    const order = ['Invited', 'Present', 'Absent'];
    setAttendanceDraft(prev => prev.map(a => {
      if (a.id !== attendeeId) return a;
      const idx = order.indexOf(a.status);
      return { ...a, status: order[(idx + 1) % order.length] };
    }));
  };

  const addAttendee = () => {
    setAttendanceDraft(prev => [...prev, { id: `att-${Math.random().toString(36).slice(2, 9)}`, student: 'New Student', parent: 'New Parent', status: 'Invited' }]);
  };

  const updateAttendeeField = (attendeeId, field, value) => {
    setAttendanceDraft(prev => prev.map(a => a.id === attendeeId ? { ...a, [field]: value } : a));
  };

  const removeAttendee = (attendeeId) => {
    setAttendanceDraft(prev => prev.filter(a => a.id !== attendeeId));
  };

  const saveAttendance = async () => {
    try {
      const attendeesPayload = attendanceDraft.map(a => ({
        staffId: a.staffId || a.id,
        hasAcknowledged: true,
        attendanceStatus: a.status === 'Present' ? 'confirmed' : a.status === 'Absent' ? 'cancelled' : 'pending'
      }));

      await updatePrincipalMeetingApi(selectedPtm.id || selectedPtm._id, {
        attendees: attendeesPayload
      });

      toast.success('Attendance updated successfully');
      closeModal(ATTENDANCE_MODAL_ID);
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to save attendance');
    }
  };

  // ── Reports table (combined, exportable) ─────────────────────────────────────
  const reportRows = useMemo(() => {
    const rows = [];
    ptms.forEach(p => {
      p.roster.forEach(a => {
        const fb = feedbackList.find(f => f.parentName === a.parent && f.ptmEvent === p.title) || null;
        rows.push({
          id: `${p.id}-${a.id}`,
          ptm: p.title,
          className: p.className,
          date: p.date,
          student: a.student,
          parent: a.parent,
          attendance: a.status,
          ptmStatus: p.status,
          feedbackRating: fb ? fb.rating : '—',
          feedbackCategory: fb ? fb.category : '—',
          feedbackComment: fb ? fb.comments : '—',
        });
      });
    });
    return rows;
  }, [ptms, feedbackList]);

  const reportColumns = useMemo(() => [
    { key: 'ptm', label: 'PTM', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { key: 'className', label: 'Class' },
    { key: 'date', label: 'Date' },
    { key: 'student', label: 'Student' },
    { key: 'parent', label: 'Parent' },
    {
      key: 'attendance', label: 'Attendance',
      render: (val) => <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${attendColors[val] || 'bg-slate-100'}`}>{val}</span>,
    },
    { key: 'ptmStatus', label: 'PTM Status' },
    {
      key: 'feedbackRating', label: 'Rating',
      align: 'center',
      render: (val) => val === '—' ? '—' : (
        <span className="font-bold text-amber-600">★ {val}</span>
      ),
    },
    { key: 'feedbackCategory', label: 'Feedback Topic' },
    { key: 'feedbackComment', label: 'Feedback Comment', render: (val) => val === '—' ? '—' : val },
  ], []);

  // ── Scheduled-meetings table config ──────────────────────────────────────────
  const scheduleColumns = useMemo(() => [
    { key: 'title', label: 'PTM Title', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { 
      key: 'className', 
      label: 'Class',
      render: (_, row) => `${row.className || 'All Classes'}${row.sectionName && row.sectionName !== 'All Sections' ? ` - ${row.sectionName}` : ''}`
    },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time', render: (_, row) => `${row.startTime} - ${row.endTime}` },
    { key: 'venue', label: 'Venue' },
    {
      key: 'status', label: 'Status',
      render: (val) => <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${ptmStatusColors[val] || 'bg-slate-100'}`}>{val}</span>,
    },
    {
      key: 'attendance', label: 'Attendance', align: 'center',
      render: (_, row) => {
        const present = row.roster.filter(a => a.status === 'Present').length;
        return <span className="font-semibold text-slate-600">{present}/{row.roster.length}</span>;
      },
    },
  ], []);

  const scheduleActions = useMemo(() => [
    { icon: <Eye size={15} />, tooltip: 'View Details', variant: 'primary',
      onClick: (row) => handleView(row) },
    { icon: <UserCheck2 size={15} />, tooltip: 'Track Attendance', variant: 'success',
      onClick: (row) => openAttendance(row) },
    { icon: <Edit2 size={15} />, tooltip: 'Edit PTM', variant: 'warning',
      onClick: (row) => handleEditClick(row) },
    { icon: <Trash2 size={15} />, tooltip: 'Cancel PTM', variant: 'danger',
      onClick: (row) => handleDeleteClick(row) },
  ], []);

  return (
    <div className="w-full space-y-6 text-left pb-10">

      {/* 1. Heading */}
      <Heading
        primaryText="Parent-Teacher"
        secondaryText="Meetings (PTM)"
        size={12}
        showAnimations={true}
      />

      {/* 2. KPI Cards */}
      <DashGrid cols={12} gap={6}>
        {statCards.map((c) => (
          <EnhancedDashCard
            key={c.title}
            title={c.title}
            value={c.value}
            icon={c.icon}
            accentColor={c.accentColor}
            size={3}
          />
        ))}
      </DashGrid>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 3. Schedule a PTM form */}
      <div ref={editFormRef} className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#223F74] px-6 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white shrink-0" />
          <p className="text-sm font-black text-white uppercase tracking-widest">
            {editingId ? 'Edit PTM Configuration' : 'Schedule a PTM'}
          </p>
        </div>
        <div className="p-6">
          <DashGrid cols={12} gap={4}>
            <DataField label="PTM Title *" id="form_title" placeholder="e.g. Mid-Term PTM — Grade 8"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              error={errors.title}
              size={12} />

             <div className="col-span-6 flex flex-col gap-1.5">
              <label htmlFor="form_class" className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Class *
              </label>
              <Select
                id="form_class"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="Select class"
                searchable={true}
              >
                <Option value="All Classes" label="All Classes" />
                {classesList.map(c => (
                  <Option key={c._id || c.id} value={c.name} label={c.name} />
                ))}
              </Select>
              {errors.className && (
                <span className="text-xs font-semibold text-rose-500 ml-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.className}
                </span>
              )}
            </div>

            {formData.className && formData.className !== 'All Classes' && (
              <div className="col-span-6 flex flex-col gap-1.5">
                <label htmlFor="form_section" className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                  Section *
                </label>
                <Select
                  id="form_section"
                  value={formData.sectionName}
                  onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  placeholder="Select section"
                  searchable={true}
                >
                  <Option value="All Sections" label="All Sections" />
                  {availableSections.map(s => (
                    <Option key={s.id || s._id} value={s.name} label={s.name} />
                  ))}
                </Select>
                {errors.sectionName && (
                  <span className="text-xs font-semibold text-rose-500 ml-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.sectionName}
                  </span>
                )}
              </div>
            )}

            <DataField label="Date *" id="form_date" type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              error={errors.date}
              size={6} />

            <DataField label="Start Time *" id="form_start" type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              error={errors.startTime}
              size={4} />
            <DataField label="End Time *" id="form_end" type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              error={errors.endTime}
              size={4} />

            <SelectField label="Status" id="form_status" value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              searchable={false} size={4}>
              <Option value="Upcoming" label="Scheduled" />
              <Option value="Completed" label="Completed" />
              <Option value="Cancelled" label="Cancelled" />
            </SelectField>

            <SelectField label="Mode" id="form_mode" value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              searchable={false} size={6}>
              <Option value="Offline" label="Offline" />
              <Option value="Online" label="Online" />
              <Option value="Hybrid" label="Hybrid" />
            </SelectField>

            <DataField label={formData.mode === 'Online' ? 'Meeting Link *' : 'Venue *'}
              id="form_venue"
              placeholder={formData.mode === 'Online' ? 'e.g. Google Meet link' : 'e.g. Conference Hall A'}
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              error={errors.venue}
              size={6} />

            <SelectField label="Reminder" id="form_reminder" value={formData.reminder}
              onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
              searchable={false} size={6}>
              <Option value="None" label="None" />
              <Option value="15 Minutes Before" label="15 Minutes Before" />
              <Option value="30 Minutes Before" label="30 Minutes Before" />
              <Option value="1 Hour Before" label="1 Hour Before" />
            </SelectField>

            <DataField label="Agenda / Description" id="form_agenda" type="textarea" rows={2}
              placeholder="Topics to discuss in the PTM..."
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              error={errors.agenda}
              size={12} />

            {/* Notify toggle */}
            <div className="col-span-12 mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
              <div className="pt-1 flex-shrink-0">
                <ToggleButton checked={formData.notify}
                  onChange={(val) => setFormData({ ...formData, notify: val })} size="sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#223F74]">Notify parents</p>
                <p className="text-xs text-slate-500 mt-1">Email & dashboard notifications will be sent to invited parents once the PTM is scheduled.</p>
              </div>
            </div>
          </DashGrid>

          <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-slate-100">
            <div className="w-32">
              <Button text="Reset" variant="secondary" onClick={resetForm} />
            </div>
            <div className="w-48">
              <Button
                text={submitting ? 'Saving...' : editingId ? 'Update PTM' : 'Schedule PTM'}
                loading={submitting}
                disabled={submitting}
                variant="primary"
                onClick={handleSchedule}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filters + Scheduled PTMs table */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-[#1D1D1F]">Scheduled PTMs</h2>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-800"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search title or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/10 w-56"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div className="w-56 text-left">
              <Select
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                placeholder="All Classes"
                searchable={false}
              >
                <Option value="All" label="All Classes" />
                {classesList.map(c => (
                  <Option key={c._id || c.id} value={c.name} label={c.name} />
                ))}
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
            <p className="text-sm font-medium text-slate-500">Loading scheduled PTMs...</p>
          </div>
        ) : filteredPtms.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Calendar className="text-slate-400" size={24} />
            </div>
            <h3 className="text-lg font-black text-[#223F74] mb-1">No PTMs Found</h3>
            <p className="text-sm font-medium text-slate-500">No PTMs match the current filters.</p>
          </div>
        ) : (
          <DataTable
            columns={scheduleColumns}
            rows={filteredPtms}
            actions={scheduleActions}
            searchable={false}
            pageSize={5}
            pageSizeOptions={[5, 10, 20]}
          />
        )}
      </div>

      {/* 5. PTM Reports — combined data table with CSV export */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-2 border-b border-gray-100 flex items-center gap-2">
          <FileText size={20} className="text-[#223F74]" />
          <h2 className="text-xl font-black text-[#1D1D1F]">PTM Reports</h2>
        </div>
        <div className="p-6 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
              <p className="text-sm font-medium text-slate-500">Loading reports...</p>
            </div>
          ) : (
            <DataTable
              rows={reportRows}
              columns={reportColumns}
              searchable={true}
              exportable={true}
              exportFileName="PTM_Reports"
              pageSize={8}
            />
          )}
        </div>
      </div>

      {/* ── View PTM Details modal ─────────────────────────────────────────────── */}
      <Modal id={VIEW_MODAL_ID} title="PTM Details" size="lg">
        {selectedPtm && (
          <div className="space-y-5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedPtm.title}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{selectedPtm.className}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${ptmStatusColors[selectedPtm.status] || 'bg-slate-100'}`}>
                  {selectedPtm.status}
                </span>
                <select
                  value={selectedPtm.status}
                  onChange={(e) => {
                    handleStatusChange(selectedPtm, e.target.value);
                    setSelectedPtm({ ...selectedPtm, status: e.target.value });
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-white font-semibold focus:outline-none"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <Detail icon={<Calendar size={18} />} label="Date" value={selectedPtm.date} />
              <Detail icon={<Clock size={18} />} label="Time" value={`${selectedPtm.startTime} - ${selectedPtm.endTime}`} />
              <Detail icon={<MapPin size={18} />} label={selectedPtm.mode === 'Online' ? 'Meeting Link' : 'Venue'} value={selectedPtm.venue || 'N/A'} />
              <Detail icon={<Bell size={18} />} label="Reminder" value={selectedPtm.reminder} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agenda</p>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 leading-relaxed shadow-sm min-h-[60px]">
                {selectedPtm.agenda || 'No agenda provided.'}
              </div>
            </div>

            {/* Attendance summary */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attendance Summary</p>
              <div className="flex flex-wrap gap-3">
                {['Present', 'Absent', 'Invited'].map(s => {
                  const count = selectedPtm.roster?.filter(a => a.status === s).length || 0;
                  return (
                    <div key={s} className="flex-1 min-w-[120px] p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-2xl font-black text-slate-800">{count}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recorded feedback preview */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Recorded Feedback ({feedbackList.filter(f => f.ptmEvent === selectedPtm.title).length})
              </p>
              {feedbackList.filter(f => f.ptmEvent === selectedPtm.title).length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">No feedback recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {feedbackList.filter(f => f.ptmEvent === selectedPtm.title).map(fb => (
                    <div key={fb.id || fb._id} className="p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <p className="text-sm font-bold text-slate-800">{fb.parentName} <span className="text-slate-400 font-medium">· {fb.studentName}</span></p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{fb.category}</p>
                      <p className="text-sm text-slate-700 mt-1">"{fb.comments}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-wrap">
              <Button text="Close" variant="secondary" onClick={() => closeModal(VIEW_MODAL_ID)} size={3} />
              <Button text="Track Attendance" onClick={() => { closeModal(VIEW_MODAL_ID); openAttendance(selectedPtm); }} size={4} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Attendance Tracking modal ──────────────────────────────────────────── */}
      <Modal id={ATTENDANCE_MODAL_ID} title={`Attendance — ${selectedPtm?.title || ''}`} size="lg">
        {selectedPtm && attendanceDraft && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-500 font-medium">
                Tap a status badge to cycle <span className="font-bold text-slate-700">Invited → Present → Absent</span>.
              </p>
              <Button text="Add Parent" icon={<Plus size={14} />} onClick={addAttendee} size={3} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left font-black text-slate-500 uppercase tracking-wider text-xs px-4 py-3">Student</th>
                    <th className="text-left font-black text-slate-500 uppercase tracking-wider text-xs px-4 py-3">Parent</th>
                    <th className="text-center font-black text-slate-500 uppercase tracking-wider text-xs px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceDraft.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-400 font-medium py-8">No parents invited yet.</td>
                    </tr>
                  )}
                  {attendanceDraft.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-2">
                        <input value={a.student} placeholder="Student name"
                          onChange={(e) => updateAttendeeField(a.id, 'student', e.target.value)}
                          className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 rounded-lg focus:outline-none focus:border-[#223F74] text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={a.parent} placeholder="Parent name"
                          onChange={(e) => updateAttendeeField(a.id, 'parent', e.target.value)}
                          className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 rounded-lg focus:outline-none focus:border-[#223F74] text-sm" />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => cycleAttendance(a.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${attendColors[a.status] || 'bg-slate-100'}`}>
                          {a.status}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button type="button" onClick={() => removeAttendee(a.id)} className="text-rose-400 hover:text-rose-600 p-1">
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal(ATTENDANCE_MODAL_ID)} size={3} />
              <Button text="Save Attendance" onClick={saveAttendance} size={4} />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete / Cancel Modal */}
      <Modal id={DELETE_MODAL_ID} title="Cancel Meeting" size="sm">
        {selectedPtm && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-full"><AlertTriangle size={24} className="text-rose-600" /></div>
              <p className="text-slate-600 text-sm font-medium">
                Cancel <strong className="text-slate-800">{selectedPtm.title}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button text="Keep Meeting" variant="secondary" onClick={() => closeModal(DELETE_MODAL_ID)} size={3} />
              <Button text={submitting ? 'Cancelling...' : 'Cancel Meeting'} disabled={submitting} variant="danger" onClick={confirmDelete} size={3} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────────
const Detail = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);
