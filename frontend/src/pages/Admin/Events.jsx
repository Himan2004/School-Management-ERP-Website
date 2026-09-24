import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Eye, Edit2, Trash2, Calendar, List, ChevronLeft, ChevronRight,
  X, AlertTriangle, MapPin, Clock, Check, FileDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import {
  Button,
  DashGrid,
  DataField,
  EnhancedDashCard,
  Heading,
  Modal,
  Option,
  SelectField,
  ToggleButton,
  DataTable,
  closeModal,
  openModal,
} from '../../components/shared/Common_Components.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────
// Mirrors the Principal Events page so visuals & vocabulary stay consistent.
const FORM_MODAL_ID = 'admin-create-edit-event-modal';
const DELETE_MODAL_ID = 'admin-event-delete-modal';
const PHOTO_MODAL_ID = 'admin-event-photo-modal';

const CATEGORIES = ['Sports', 'Cultural', 'Academic', 'Holiday', 'Workshop', 'Trip', 'General', 'Meeting', 'Administrative'];
const STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'];
const PUBLISH_STATUSES = ['Draft', 'Published'];
const CARD = 'rounded-[28px] border border-slate-100 bg-white shadow-sm';

const SectionHeader = ({ title }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
    <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
  </div>
);

// ── Reusable maps (kept in sync with Principal/SubPages/Events.jsx) ──────────
const categoryColors = {
  Sports: 'bg-green-100', Cultural: 'bg-purple-100', Academic: 'bg-blue-100',
  Holiday: 'bg-yellow-100', Workshop: 'bg-orange-100', Trip: 'bg-pink-100',
  General: 'bg-slate-100', Meeting: 'bg-indigo-100', Administrative: 'bg-teal-100',
  Other: 'bg-slate-100',
};

const categoryBadges = {
  Sports: 'bg-green-100 text-green-800 border-green-300',
  Cultural: 'bg-purple-100 text-purple-800 border-purple-300',
  Academic: 'bg-blue-100 text-blue-800 border-blue-300',
  Holiday: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Workshop: 'bg-orange-100 text-orange-800 border-orange-300',
  Trip: 'bg-pink-100 text-pink-800 border-pink-300',
  General: 'bg-slate-100 text-slate-800 border-slate-300',
  Meeting: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  Administrative: 'bg-teal-100 text-teal-800 border-teal-300',
  Other: 'bg-slate-100 text-slate-800 border-slate-300',
};

const statusColors = {
  Upcoming: 'bg-yellow-100 text-yellow-800',
  Ongoing: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const approvalColors = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-300',
};

const PARTICIPANT_OPTIONS = ['Students', 'Teachers', 'Parents', 'Admin', 'Accounts'];

let cachedEvents = null;
let cachedClassesList = null;
let cachedStats = null;

const AdminEvents = () => {
  const [events, setEvents] = useState(cachedEvents || []);
  const [classesList, setClassesList] = useState(cachedClassesList || []);
  const [loading, setLoading] = useState(!cachedEvents);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(cachedStats || {
    totalEvents: 0,
    upcomingEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0
  });

  // UI state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [visibilityFilter, setVisibilityFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Photo uploading states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', category: 'Academic', date: '',
    startTime: '09:00', endTime: '12:00', venue: '',
    participantTypes: [], classTarget: 'all', classId: '',
    status: 'Upcoming', description: '',
    publishStatus: 'Draft',
  });

  const [formErrors, setFormErrors] = useState({
    name: '', date: '', venue: '', participantTypes: '', classId: '',
  });

  const normalizeEvent = (event) => {
    const rawParticipants = event.participants || '';
    let rawList = [];
    if (Array.isArray(rawParticipants)) {
      rawList = rawParticipants;
    } else if (typeof rawParticipants === 'string' && rawParticipants) {
      rawList = rawParticipants.split(',').map(p => p.trim()).filter(Boolean);
    }

    const participantTypes = rawList.map(p => {
      const lower = p.toLowerCase();
      if (lower.includes('student')) return 'Students';
      if (lower.includes('teacher')) return 'Teachers';
      if (lower.includes('parent')) return 'Parents';
      if (lower.includes('admin')) return 'Admin';
      if (lower.includes('account')) return 'Accounts';
      return null;
    }).filter(Boolean);

    let category = event.category || 'General';
    if (category === 'Sport') category = 'Sports';

    const isDraft = event.status === 'Draft' || event.status === 'Cancelled';
    const publishStatus = isDraft ? 'Draft' : 'Published';

    return {
      id: event.id || event._id,
      name: event.name || event.title || '',
      category,
      date: event.date ? event.date.split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      venue: event.venue || 'School Campus',
      participantTypes,
      classTarget: event.classId ? 'single' : 'all',
      classId: event.classId || '',
      status: event.status || 'Upcoming',
      description: event.description || '',
      organizer: event.organizer || event.createdBy || 'Principal',
      origin: event.origin || 'Local',
      photos: event.photos || [],
      publishStatus
    };
  };

  const fetchEvents = useCallback(async (isSilent = false) => {
    if (!cachedEvents && !isSilent) setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        api.get('/admin/events'),
        api.get('/admin/events/stats')
      ]);

      const list = Array.isArray(eventsRes.data?.data) ? eventsRes.data.data : [];
      const normalized = list.map(normalizeEvent);
      setEvents(normalized);
      cachedEvents = normalized;

      if (selectedEvent?.id) {
        const refreshedSelectedEvent = normalized.find((event) => event.id === selectedEvent.id);
        if (refreshedSelectedEvent) {
          setSelectedEvent(refreshedSelectedEvent);
        }
      }

      const statsData = statsRes.data?.data || {
        totalEvents: 0,
        upcomingEvents: 0,
        ongoingEvents: 0,
        completedEvents: 0
      };
      setStats(statsData);
      cachedStats = statsData;
    } catch (err) {
      console.error('Failed to fetch events:', err);
      if (!isSilent) toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent?.id]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/admin/academic/classes-sections');
      const classesData = res.data?.data || [];
      setClassesList(classesData);
      cachedClassesList = classesData;
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents(Boolean(cachedEvents));
    fetchClasses();
  }, [fetchEvents, fetchClasses]);

  // ── Filtered list (search + filters) ─────────────────────────────────────────
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    let list = events;
    if (searchTerm) list = list.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== 'All') list = list.filter(e => e.category === categoryFilter);
    if (statusFilter !== 'All') list = list.filter(e => e.status === statusFilter);
    if (visibilityFilter !== 'All') list = list.filter(e => e.publishStatus === visibilityFilter);
    if (dateFrom) list = list.filter(e => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter(e => new Date(e.date) <= new Date(dateTo));
    setFilteredEvents(list);
  }, [searchTerm, categoryFilter, statusFilter, visibilityFilter, dateFrom, dateTo, events]);

  // ── Calendar helpers (mirrors Principal calendar logic) ──────────────────────
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getEventsForDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return events.filter(e => e.date === dateStr);
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const statCards = useMemo(() => [
    { title: 'Total Events', value: String(stats.totalEvents), accentColor: '#223F74' },
    { title: 'Upcoming Events', value: String(stats.upcomingEvents), accentColor: '#E0A04B' },
    { title: 'Ongoing Events', value: String(stats.ongoingEvents), accentColor: '#8B5CF6' },
    { title: 'Completed Events', value: String(stats.completedEvents), accentColor: '#5B9A6A' },
  ], [stats]);

  // ── Validation (same rules as Principal page) ────────────────────────────────
  const validate = () => {
    const errs = { name: '', date: '', venue: '', participantTypes: '', classId: '' };
    let ok = true;

    if (!formData.name.trim()) { errs.name = 'Event name is required'; ok = false; }
    else if (formData.name.trim().length < 3) { errs.name = 'Event name must be at least 3 characters'; ok = false; }

    if (!formData.date) { errs.date = 'Event date is required'; ok = false; }
    if (!formData.venue.trim()) { errs.venue = 'Venue is required'; ok = false; }
    if (formData.participantTypes.length === 0) { errs.participantTypes = 'Select at least one participant type'; ok = false; }
    if (formData.classTarget === 'single' && !formData.classId) { errs.classId = 'Select a target class'; ok = false; }

    setFormErrors(errs);
    return ok;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreateClick = () => {
    setEditingId(null);
    setFormData({
      name: '', category: 'Academic', date: '',
      startTime: '09:00', endTime: '12:00', venue: '',
      participantTypes: [], classTarget: 'all', classId: '',
      status: 'Upcoming', description: '',
      publishStatus: 'Draft',
    });
    setFormErrors({ name: '', date: '', venue: '', participantTypes: '', classId: '' });
    openModal(FORM_MODAL_ID);
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setFormData({
      name: event.name, category: event.category, date: event.date,
      startTime: event.startTime, endTime: event.endTime, venue: event.venue,
      participantTypes: event.participantTypes || [], classTarget: event.classTarget || 'all',
      classId: event.classId || '', status: event.status, description: event.description,
      publishStatus: event.publishStatus,
    });
    setFormErrors({ name: '', date: '', venue: '', participantTypes: '', classId: '' });
    openModal(FORM_MODAL_ID);
  };

  const handleToggleParticipant = (opt) => {
    let nextTypes = [...formData.participantTypes];
    if (opt === 'All') {
      nextTypes = nextTypes.length === PARTICIPANT_OPTIONS.length ? [] : [...PARTICIPANT_OPTIONS];
    } else if (nextTypes.includes(opt)) {
      nextTypes = nextTypes.filter(t => t !== opt);
    } else {
      nextTypes.push(opt);
    }
    setFormData(prev => ({ ...prev, participantTypes: nextTypes }));
    if (formErrors.participantTypes && nextTypes.length > 0) {
      setFormErrors(errs => ({ ...errs, participantTypes: '' }));
    }
  };

  const handleSave = async () => {
    if (submitting) return;
    if (!validate()) { toast.error('Please fix form validation errors.'); return; }
    setSubmitting(true);
    try {
      const finalStatus = formData.publishStatus === 'Published' ? 'Upcoming' : 'Draft';
      const payload = {
        title: formData.name,
        name: formData.name,
        category: formData.category,
        eventDate: formData.date,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue,
        participants: formData.participantTypes.join(', '),
        participantTypes: formData.participantTypes,
        classId: formData.classTarget === 'single' ? formData.classId : null,
        status: finalStatus,
        description: formData.description
      };

      if (editingId) {
        await api.put(`/admin/events/${editingId}`, payload);
        toast.success('Event updated successfully');
      } else {
        await api.post('/admin/events', payload);
        toast.success('Event created successfully');
      }
      closeModal(FORM_MODAL_ID);
      fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (event) => { setSelectedEvent(event); setShowViewDrawer(true); };

  const handleDelete = (event) => { setSelectedEvent(event); openModal(DELETE_MODAL_ID); };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/events/${selectedEvent.id}`);
      toast.success('Event deleted successfully');
      closeModal(DELETE_MODAL_ID);
      fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleTogglePublish = async (event) => {
    const nextStatus = event.publishStatus === 'Published' ? 'Draft' : 'Upcoming';
    try {
      await api.put(`/admin/events/${event.id}`, { status: nextStatus });
      toast.success(`Event marked as ${nextStatus === 'Draft' ? 'Draft' : 'Published'}`);
      fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update publish status');
    }
  };

  const handleAddPhotos = (event) => {
    setSelectedEvent(event);
    setSelectedFiles([]);
    setPreviewUrls([]);
    openModal(PHOTO_MODAL_ID);
  };

  // ── Event Reports — DataTable with CSV export ────────────────────────────────
  const reportColumns = [
    { key: 'name', label: 'Event', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { key: 'category', label: 'Category' },
    { key: 'date', label: 'Date' },
    { key: 'venue', label: 'Venue' },
    {
      key: 'participantTypes', label: 'Participants',
      render: (val) => (Array.isArray(val) && val.length ? val.join(', ') : '—'),
    },
    { key: 'status', label: 'Status' },
    { key: 'publishStatus', label: 'Visibility' },
    {
      key: 'createdBy', label: 'Organizer',
      render: (val, row) => <span className="font-medium">{row.organizer || val || 'Admin'}</span>,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto font-sans relative">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6">
        <Heading
          primaryText="Events &"
          secondaryText="Activities"
          showAnimations={true}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {[
              { mode: 'list', label: 'List', icon: <List size={16} /> },
              { mode: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
            ].map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                  viewMode === mode
                    ? 'bg-[#223F74] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="w-48 sm:self-auto self-end">
            <Button text="Create Event" icon={<Plus size={16} />} onClick={handleCreateClick} size={12} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <DashGrid cols={12} gap={4}>
        {statCards.map((c) => (
          <EnhancedDashCard key={c.title} title={c.title} value={loading ? "-" : c.value} accentColor={c.accentColor} size={3} />
        ))}
      </DashGrid>

      <div className="relative min-h-[300px] mt-6">
        {loading && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm gap-3">
             <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
           </div>
        )}

        {viewMode === 'list' ? (
          <>
            {/* Filter Bar */}
            <div className={`${CARD} p-4 mb-6`}>
              <DashGrid cols={12} gap={4}>
                <DataField
                  label="Search"
                  id="admin_event_search"
                  placeholder="Search by event name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size={4}
                />
                <SelectField label="Category" id="admin_event_category" value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)} searchable={false} size={2}>
                  <Option value="All" label="All" />
                  {CATEGORIES.map((cat) => <Option key={cat} value={cat} label={cat} />)}
                </SelectField>
                <SelectField label="Status" id="admin_event_status" value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)} searchable={false} size={2}>
                  <Option value="All" label="All" />
                  {STATUSES.map((s) => <Option key={s} value={s} label={s} />)}
                </SelectField>
                <SelectField label="Visibility" id="admin_event_visibility" value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)} searchable={false} size={4}>
                  <Option value="All" label="All" />
                  {PUBLISH_STATUSES.map((s) => <Option key={s} value={s} label={s} />)}
                </SelectField>
              </DashGrid>
              <DashGrid cols={12} gap={4}>
                <DataField label="From Date" id="admin_event_date_from" type="date"
                  value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size={6} />
                <DataField label="To Date" id="admin_event_date_to" type="date"
                  value={dateTo} onChange={(e) => setDateTo(e.target.value)} size={6} />
              </DashGrid>
            </div>

            {/* Events Grid — Draft & Publish cards */}
            {filteredEvents.length === 0 ? (
              <div className={`${CARD} p-10 text-center text-slate-400 font-semibold mb-6`}>
                No events match the current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {filteredEvents.map(event => (
                  <div key={event.id} className={`${CARD} overflow-hidden hover:shadow-md transition`}>
                    <div className={`h-28 ${categoryColors[event.category] || 'bg-slate-100'} flex items-center justify-center border-b border-slate-100`}>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{event.category}</span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryBadges[event.category] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {event.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[event.status] || 'bg-slate-100 text-slate-700'}`}>
                          {event.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 mb-3">{event.name}</h3>
                      <div className="space-y-1.5 mb-4 text-sm font-medium text-slate-500">
                        <p>{new Date(event.date).toLocaleDateString()} · {event.startTime} – {event.endTime}</p>
                        <p>{event.venue}</p>
                        <p>{Array.isArray(event.participantTypes) && event.participantTypes.length > 0
                          ? event.participantTypes.join(', ')
                          : '—'}</p>
                        <p className="text-xs">By {event.organizer || 'Admin'}</p>
                      </div>

                      {/* Draft & Publish toggle */}
                      <div className="flex items-center justify-between py-2 mb-2 border-t border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Visibility</span>
                        <ToggleButton
                          checked={event.publishStatus === 'Published'}
                          onChange={() => handleTogglePublish(event)}
                          label="Published"
                          labelOff="Draft"
                          size="sm"
                        />
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button onClick={() => handleView(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                          <Eye size={14} /> View
                        </button>
                        <button onClick={() => handleAddPhotos(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                          Photos
                        </button>
                        <button onClick={() => handleEdit(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(event)} className="flex-shrink-0 flex items-center justify-center p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition text-xs font-bold">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Calendar View */}
            <div className={`${CARD} p-6 mb-6`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">{monthName}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-[#F8EEE9] rounded-xl transition text-[#223F74]"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-[#F8EEE9] rounded-xl transition text-[#223F74]"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0 border border-[#E7E2DB] rounded-2xl overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-[#F8EEE9] p-3 text-center text-xs font-black uppercase tracking-wider text-[#223F74] border-r border-[#E7E2DB] last:border-r-0">
                    {day}
                  </div>
                ))}

                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50 p-3 border-r border-b border-[#E7E2DB] last:border-r-0" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                  const dayEvents = getEventsForDate(date);
                  const today = new Date();
                  const isToday = date.getDate() === today.getDate() &&
                                  date.getMonth() === today.getMonth() &&
                                  date.getFullYear() === today.getFullYear();

                  return (
                    <div
                      key={i + 1}
                      className={`p-3 border-r border-b border-[#E7E2DB] last:border-r-0 min-h-[100px] hover:bg-[#F8EEE9]/50 transition ${isToday ? 'bg-[#223F74]/5' : 'bg-white'}`}
                    >
                      <div className={`text-sm font-black mb-2 ${isToday ? 'text-[#223F74]' : 'text-slate-700'}`}>
                        {i + 1}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedDateEvents({ date, events: dayEvents })}
                            className="text-xs bg-[#223F74] text-white px-2 py-1 rounded-lg w-full truncate hover:bg-[#1a3360] text-left font-semibold"
                          >
                            {event.name}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <button
                            onClick={() => setSelectedDateEvents({ date, events: dayEvents })}
                            className="text-xs text-[#223F74] font-bold hover:underline"
                          >
                            +{dayEvents.length - 2} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDateEvents && (
              <div className={`${CARD} p-6 mb-6`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black text-slate-800">
                    Events on {selectedDateEvents.date.toLocaleDateString()}
                  </h3>
                  <button onClick={() => setSelectedDateEvents(null)} className="p-1.5 hover:bg-[#F8EEE9] rounded-xl text-slate-500">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedDateEvents.events.map(event => (
                    <div key={event.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl">
                      <div>
                        <h4 className="font-bold text-slate-800">{event.name}</h4>
                        <p className="text-sm text-slate-500 font-medium">{event.startTime} – {event.endTime} · {event.venue}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${statusColors[event.status]}`}>
                          {event.status}
                        </span>
                      </div>
                      <Button text="View" onClick={() => handleView(event)} size={3} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Event Reports (data table with CSV export) ──────────────────────────── */}
        <div className={`${CARD} p-4`}>
          <DataTable
            title="Event Reports"
            rows={filteredEvents}
            columns={reportColumns}
            searchable={true}
            exportable={true}
            exportFileName="Event_Reports"
          />
        </div>
      </div>

      {/* ── View Event Drawer ───────────────────────────────────────────────────── */}
      {showViewDrawer && selectedEvent && (
        <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl overflow-y-auto z-50 border-l border-slate-100 animate-slide-in">
          <div className="sticky top-0 bg-[#223F74] flex justify-between items-center px-6 py-4">
            <h2 className="text-lg font-black text-white">Event Details</h2>
            <button onClick={() => setShowViewDrawer(false)} className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X size={22} />
            </button>
          </div>

          <div className="p-6 space-y-6 text-left">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{selectedEvent.name}</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryBadges[selectedEvent.category]}`}>
                  {selectedEvent.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedEvent.status]}`}>
                  {selectedEvent.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedEvent.publishStatus === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {selectedEvent.publishStatus}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-slate-700 text-sm font-medium">
              <p><span className="font-bold">📅 Date:</span> {new Date(selectedEvent.date).toLocaleDateString()}</p>
              <p><span className="font-bold">🕐 Time:</span> {selectedEvent.startTime} - {selectedEvent.endTime}</p>
              <p><span className="font-bold">📍 Venue:</span> {selectedEvent.venue}</p>
              <p><span className="font-bold">👥 Participants:</span> {
                Array.isArray(selectedEvent.participantTypes) && selectedEvent.participantTypes.length > 0
                  ? selectedEvent.participantTypes.join(', ')
                  : '—'
              }</p>
              <p><span className="font-bold">✍️ Organizer:</span> {selectedEvent.organizer || 'Admin'}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 mb-2">Description</p>
              <p className="text-slate-700 text-sm font-medium leading-relaxed">{selectedEvent.description || 'No description provided.'}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 mb-2">Photos</p>
              {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedEvent.photos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`Event ${idx}`} className="w-full h-20 object-cover rounded-lg border border-slate-100 shadow-sm" />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-medium">No photos added yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Event Modal ─────────────────────────────────────────────── */}
      <Modal id={FORM_MODAL_ID} title={editingId ? 'Edit Event' : 'Create Event'} size="lg">
        <div className="flex flex-col gap-4 text-left">
          {/* Event Details */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Event Details" />
            <div className="p-4">
              <DashGrid cols={12} gap={4}>
                <DataField
                  label="Event Name *"
                  id="admin_event_name"
                  placeholder="e.g. Annual Sports Day"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                  }}
                  error={formErrors.name}
                  icon={List}
                  size={12}
                />
                <SelectField
                  label="Category *"
                  id="admin_event_category_field"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  searchable={false} size={6}
                >
                  {CATEGORIES.map((cat) => (<Option key={cat} value={cat} label={cat} />))}
                </SelectField>
                <DataField
                  label="Event Date *"
                  id="admin_event_date_field"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    if (formErrors.date) setFormErrors(prev => ({ ...prev, date: '' }));
                  }}
                  error={formErrors.date}
                  icon={Calendar}
                  size={6}
                />
                <DataField
                  label="Venue *"
                  id="admin_event_venue_field"
                  placeholder="Event venue or location"
                  value={formData.venue}
                  onChange={(e) => {
                    setFormData({ ...formData, venue: e.target.value });
                    if (formErrors.venue) setFormErrors(prev => ({ ...prev, venue: '' }));
                  }}
                  error={formErrors.venue}
                  icon={MapPin}
                  size={12}
                />
              </DashGrid>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Schedule" />
            <div className="p-4">
              <DashGrid cols={12} gap={4}>
                <DataField label="Start Time" id="admin_event_start" type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  icon={Clock} size={4} />
                <DataField label="End Time" id="admin_event_end" type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  icon={Clock} size={4} />
                <SelectField label="Status" id="admin_event_status_field"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  searchable={false} size={4}
                >
                  {STATUSES.map((status) => (<Option key={status} value={status} label={status} />))}
                </SelectField>
              </DashGrid>
            </div>
          </div>

          {/* Participants */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Participants" />
            <div className="p-4">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Target Audience *
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer select-none">
                  <input type="checkbox"
                    checked={formData.participantTypes.length === PARTICIPANT_OPTIONS.length}
                    onChange={() => handleToggleParticipant('All')}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-bold text-slate-700">All</span>
                </label>
                {PARTICIPANT_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer select-none">
                    <input type="checkbox"
                      checked={formData.participantTypes.includes(opt)}
                      onChange={() => handleToggleParticipant(opt)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-bold text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              {formErrors.participantTypes && (
                <p className="text-xs font-semibold text-rose-500 mt-2">{formErrors.participantTypes}</p>
              )}
            </div>
          </div>

          {/* Class Target */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Class Target" />
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'all', label: 'All Classes' },
                  { value: 'single', label: 'Single Class' },
                ].map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => {
                      setFormData({ ...formData, classTarget: value, classId: value === 'all' ? '' : formData.classId });
                      setFormErrors(prev => ({ ...prev, classId: '' }));
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-200 ${
                      formData.classTarget === value
                        ? 'bg-[#223F74] text-white shadow-md'
                        : 'bg-[#F8EEE9] text-[#223F74] border border-[#E7E2DB] hover:bg-[#F59B87]/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {formData.classTarget === 'single' && (
                <SelectField
                  label="Class *"
                  id="admin_event_class"
                  value={formData.classId}
                  onChange={(e) => {
                    setFormData({ ...formData, classId: e.target.value });
                    if (formErrors.classId) setFormErrors(prev => ({ ...prev, classId: '' }));
                  }}
                  placeholder="Select Class"
                  searchable
                  size={12}
                >
                  {classesList.map((cls) => (
                    <Option
                      key={cls._id || cls.id}
                      value={cls._id || cls.id}
                      label={cls.name || cls.className || cls.gradeLevel}
                    />
                  ))}
                </SelectField>
              )}
              {formData.classTarget === 'single' && formErrors.classId && (
                <p className="text-xs font-semibold text-rose-500 mt-2">{formErrors.classId}</p>
              )}
            </div>
          </div>

          {/* Approval & Publishing — Admin-context extension */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Approval & Publishing" />
            <div className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check size={16} className="text-emerald-500" />
                <span>Admin-created events are <span className="font-bold text-slate-800">auto-approved</span>.</span>
              </div>
              <ToggleButton
                checked={formData.publishStatus === 'Published'}
                onChange={(val) => setFormData(prev => ({ ...prev, publishStatus: val ? 'Published' : 'Draft' }))}
                label="Publish immediately"
                labelOff="Save as Draft"
                size="md"
              />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Description" />
            <div className="p-4">
              <DataField
                label="Event Description"
                id="admin_event_description"
                type="textarea"
                placeholder="Brief description of the event, agenda, or special instructions"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                size={12}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
            <Button text="Cancel" variant="secondary" onClick={() => closeModal(FORM_MODAL_ID)} size={3} />
            <Button
              text={submitting ? 'Saving…' : editingId ? 'Update Event' : 'Create Event'}
              loading={submitting}
              disabled={submitting}
              onClick={handleSave}
              size={3}
            />
          </div>
        </div>
      </Modal>

      {/* ── Add Photos Modal ───────────────────────────────────────────────────── */}
      <Modal id={PHOTO_MODAL_ID} title={selectedEvent ? `Upload Photos — ${selectedEvent.name}` : 'Upload Photos'} size="md">
        <div className="flex flex-col gap-4 text-left">
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            multiple
            id="photoInput"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              setSelectedFiles(files);
              setPreviewUrls(files.map(f => URL.createObjectURL(f)));
            }}
          />
          <label
            htmlFor="photoInput"
            className="border-2 border-dashed border-[#E7E2DB] rounded-2xl p-8 text-center hover:border-[#F59B87] transition cursor-pointer block bg-[#F8EEE9]/30"
          >
            <p className="text-slate-600 text-sm font-bold">Click to select images</p>
            <p className="text-slate-400 text-xs mt-1 font-medium">PNG, JPG, WEBP — max 10 files, 10MB each</p>
          </label>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, idx) => (
                <img key={idx} src={url} alt="" className="w-full h-24 object-cover rounded-xl border border-slate-100" />
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <p className="text-sm text-slate-500 text-center font-medium">{selectedFiles.length} file(s) selected</p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => {
                closeModal(PHOTO_MODAL_ID);
                setSelectedFiles([]);
                setPreviewUrls([]);
              }}
              size={3}
            />
            <Button
              text={uploading ? 'Uploading…' : 'Save Photos'}
              loading={uploading}
              disabled={selectedFiles.length === 0 || uploading}
              onClick={async () => {
                try {
                  setUploading(true);
                  const formData = new FormData();
                  selectedFiles.forEach((file) => formData.append("photos", file));
                  await api.post(`/admin/events/${selectedEvent.id}/photos`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                  await fetchEvents();
                  closeModal(PHOTO_MODAL_ID);
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                  toast.success('Photos uploaded successfully!');
                } catch (err) {
                  toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
                } finally {
                  setUploading(false);
                }
              }}
              size={3}
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ───────────────────────────────────────────── */}
      <Modal id={DELETE_MODAL_ID} title="Delete Event" size="sm">
        {selectedEvent && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <p className="text-slate-600 text-sm font-medium">
                Are you sure you want to delete <strong className="text-slate-800">{selectedEvent.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button text="Keep Event" variant="secondary" onClick={() => closeModal(DELETE_MODAL_ID)} size={3} />
              <Button text="Delete Event" variant="danger" onClick={confirmDelete} size={3} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminEvents;
