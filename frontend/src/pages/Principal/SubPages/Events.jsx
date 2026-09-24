import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Edit2, Trash2, Calendar, List, ChevronLeft, ChevronRight, X, AlertTriangle, MapPin, Clock, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Button,
  DashGrid,
  DataField,
  EnhancedDashCard,
  Grid,
  Heading,
  Modal,
  Option,
  PanelModal,
  SelectField,
  closeModal,
  openModal,
  ModalGrid,
  ModalData,
} from '../../../components/shared/Common_Components.jsx';
import DatePicker from '../../../components/shared/DatePicker.jsx';
import {
  getPrincipalEventsApi,
  getPrincipalEventStatsApi,
  createPrincipalEventApi,
  updatePrincipalEventApi,
  deletePrincipalEventApi,
  uploadEventPhotosApi
} from '../../../services/api/principalCommunicationApi';
import { getClasses as getPrincipalClasses } from '../../../services/api/principalStudentApi';

const FORM_MODAL_ID = 'create-edit-event-modal';
const PHOTO_MODAL_ID = 'event-photo-modal';
const DELETE_MODAL_ID = 'event-delete-modal';
const CATEGORIES = ['Sports', 'Cultural', 'Academic', 'Holiday', 'Workshop', 'Trip', 'General', 'Meeting', 'Administrative'];
const STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
const CARD = 'rounded-[28px] border border-slate-100 bg-white shadow-sm';

const SectionHeader = ({ title }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
    <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
  </div>
);

const Events = () => {
  const categoryColors = {
    Sports: 'bg-green-100',
    Cultural: 'bg-purple-100',
    Academic: 'bg-blue-100',
    Holiday: 'bg-yellow-100',
    Workshop: 'bg-orange-100',
    Trip: 'bg-pink-100',
    General: 'bg-slate-100',
    Meeting: 'bg-indigo-100',
    Administrative: 'bg-teal-100',
    Other: 'bg-slate-100'
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
    Other: 'bg-slate-100 text-slate-800 border-slate-300'
  };

  const statusColors = {
    Upcoming: 'bg-yellow-100 text-yellow-800',
    Ongoing: 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800'
  };

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0
  });
  const PARTICIPANT_OPTIONS = useMemo(() => ['Students', 'Teachers', 'Parents', 'Admin', 'Accounts'], []);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Academic',
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    venue: '',
    participantTypes: [],
    classTarget: 'all',
    classId: '',
    status: 'Upcoming',
    description: ''
  });

  const [classes, setClasses] = useState([]);

  const [formErrors, setFormErrors] = useState({
    name: '',
    date: '',
    venue: '',
    participantTypes: '',
    classId: ''
  });

  const selectedAudience = useMemo(() => {
    if (formData.participantTypes.length === PARTICIPANT_OPTIONS.length) {
      return 'All';
    }
    if (formData.participantTypes.length === 1) {
      return formData.participantTypes[0];
    }
    return '';
  }, [formData.participantTypes, PARTICIPANT_OPTIONS]);

  const normalizeEvent = (event) => {
    // participants may come back as a string or array from the API
    const rawParticipants = event.participants || '';
    let rawList = [];
    if (Array.isArray(rawParticipants)) {
      rawList = rawParticipants;
    } else if (typeof rawParticipants === 'string' && rawParticipants) {
      rawList = rawParticipants.split(',').map(p => p.trim()).filter(Boolean);
    }

    // Map backend participant strings to UI options
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
      photos: event.photos || []
    };
  };

  const buildEventPayload = (payload) => ({
    name: payload.name,
    title: payload.name,
    category: payload.category,
    date: payload.date,
    eventDate: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    venue: payload.venue,
    participants: payload.participantTypes.join(', '),
    participantTypes: payload.participantTypes,
    classId: payload.classTarget === 'single' ? payload.classId : null,
    status: payload.status,
    description: payload.description
  });

  const fetchEventData = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, statsRes] = await Promise.all([
        getPrincipalEventsApi(),
        getPrincipalEventStatsApi()
      ]);
      const list = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
      const normalizedEvents = list.map(normalizeEvent);
      setEvents(normalizedEvents);
      if (selectedEvent?.id) {
        const refreshedSelectedEvent = normalizedEvents.find((event) => event.id === selectedEvent.id);
        if (refreshedSelectedEvent) {
          setSelectedEvent(refreshedSelectedEvent);
        }
      }
      setStats(statsRes?.data || {
        totalEvents: 0,
        upcomingEvents: 0,
        ongoingEvents: 0,
        completedEvents: 0
      });
    } catch (err) {
      setError(err?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
    getPrincipalClasses().then(res => {
      const list = Array.isArray(res?.data?.classes) ? res.data.classes
        : Array.isArray(res?.data) ? res.data
          : [];
      setClasses(list);
    }).catch(() => { });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let filtered = events;
    if (searchTerm) filtered = filtered.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== 'All') filtered = filtered.filter(e => e.category === categoryFilter);
    if (statusFilter !== 'All') filtered = filtered.filter(e => e.status === statusFilter);
    if (dateFrom) filtered = filtered.filter(e => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) filtered = filtered.filter(e => new Date(e.date) <= new Date(dateTo));
    setFilteredEvents(filtered);
  }, [searchTerm, categoryFilter, statusFilter, dateFrom, dateTo, events]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(e => e.date === dateStr);
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const statCards = useMemo(() => [
    { title: 'Total Events', value: String(stats.totalEvents || 0), accentColor: '#223F74' },
    { title: 'Upcoming Events', value: String(stats.upcomingEvents || 0), accentColor: '#E0A04B' },
    { title: 'Ongoing Events', value: String(stats.ongoingEvents || 0), accentColor: '#8B5CF6' },
    { title: 'Completed Events', value: String(stats.completedEvents || 0), accentColor: '#5B9A6A' },
  ], [stats]);

  const validate = () => {
    const errs = { name: '', date: '', venue: '', participantTypes: '', classId: '' };
    let ok = true;

    if (!formData.name.trim()) {
      errs.name = 'Event name is required';
      ok = false;
    } else if (formData.name.trim().length < 3) {
      errs.name = 'Event name must be at least 3 characters';
      ok = false;
    }

    if (!formData.date) {
      errs.date = 'Event date is required';
      ok = false;
    }

    if (!formData.venue.trim()) {
      errs.venue = 'Venue is required';
      ok = false;
    }

    if (formData.participantTypes.length === 0) {
      errs.participantTypes = 'Select at least one participant type';
      ok = false;
    }

    if (formData.classTarget === 'single' && !formData.classId) {
      errs.classId = 'Select a target class';
      ok = false;
    }

    setFormErrors(errs);
    return ok;
  };

  const handleCreateClick = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'Academic',
      date: '',
      startTime: '09:00',
      endTime: '12:00',
      venue: '',
      participantTypes: [],
      classTarget: 'all',
      classId: '',
      status: 'Upcoming',
      description: ''
    });
    setFormErrors({ name: '', date: '', venue: '', participantTypes: '', classId: '' });
    openModal(FORM_MODAL_ID);
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setFormData({
      name: event.name,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      participantTypes: event.participantTypes || [],
      classTarget: event.classTarget || 'all',
      classId: event.classId || '',
      status: event.status,
      description: event.description
    });
    setFormErrors({ name: '', date: '', venue: '', participantTypes: '', classId: '' });
    openModal(FORM_MODAL_ID);
  };

  const handleToggleParticipant = (opt) => {
    let nextTypes = [...formData.participantTypes];
    if (opt === 'All') {
      if (nextTypes.length === PARTICIPANT_OPTIONS.length) {
        nextTypes = [];
      } else {
        nextTypes = [...PARTICIPANT_OPTIONS];
      }
    } else {
      if (nextTypes.includes(opt)) {
        nextTypes = nextTypes.filter(t => t !== opt);
      } else {
        nextTypes.push(opt);
      }
    }
    setFormData(prev => ({ ...prev, participantTypes: nextTypes }));
    if (formErrors.participantTypes && nextTypes.length > 0) {
      setFormErrors(errs => ({ ...errs, participantTypes: '' }));
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix form validation errors.');
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await updatePrincipalEventApi(editingId, buildEventPayload(formData));
        toast.success('Event updated successfully');
      } else {
        await createPrincipalEventApi(buildEventPayload(formData));
        toast.success('Event created successfully');
      }
      await fetchEventData();
      closeModal(FORM_MODAL_ID);
    } catch (err) {
      toast.error(err?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (event) => {
    setSelectedEvent(event);
    openModal('view-event-modal');
  };

  const handleDelete = (event) => {
    setSelectedEvent(event);
    openModal(DELETE_MODAL_ID);
  };

  const confirmDelete = async () => {
    try {
      await deletePrincipalEventApi(selectedEvent.id);
      await fetchEventData();
      closeModal(DELETE_MODAL_ID);
      toast.success('Event deleted successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete event');
    }
  };

  const handleAddPhotos = (event) => {
    setSelectedEvent(event);
    setSelectedFiles([]);
    setPreviewUrls([]);
    openModal(PHOTO_MODAL_ID);
  };

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {loading && (
        <div className="mb-6 flex items-center justify-center min-h-[120px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#223F74] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6">
        <Heading
          primaryText="Events & Activities"
          showAnimations={true}
        />
      </div>

      {/* Summary Cards */}
      <DashGrid cols={12} gap={4}>
        {statCards.map((c) => (
          <EnhancedDashCard key={c.title} title={c.title} value={c.value} accentColor={c.accentColor} size={3} />
        ))}
      </DashGrid>

      {/* Actions Row - Moved below cards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {[
              { mode: 'list', label: 'List', icon: List },
              { mode: 'calendar', label: 'Calendar', icon: Calendar },
            ].map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${viewMode === mode
                    ? 'bg-[#223F74] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          
          {viewMode === 'list' && (
            <div className="w-full sm:w-64">
              <DataField
                id="event_search"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
                size={12}
              />
            </div>
          )}
        </div>
        <div className="w-48 sm:self-auto self-end">
          <Button text="Create Event" icon={<Plus size={16} />} onClick={handleCreateClick} size={12} />
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter Bar */}
          <div className={`${CARD} p-4 mt-6 mb-6`}>
            <Grid cols={12} gap={4}>
              <div className="col-span-12 md:col-span-3">
                <SelectField
                  label="Category"
                  id="event_category_filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  searchable={false}
                  size={12}
                >
                  <Option value="All" label="All" />
                  {CATEGORIES.map((cat) => <Option key={cat} value={cat} label={cat} />)}
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-3">
                <SelectField
                  label="Status"
                  id="event_status_filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  searchable={false}
                  size={12}
                >
                  <Option value="All" label="All" />
                  {STATUSES.map((s) => <Option key={s} value={s} label={s} />)}
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-3">
                <DatePicker
                  label="From Date"
                  value={dateFrom}
                  onChange={(val) => setDateFrom(val)}
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <DatePicker
                  label="To Date"
                  value={dateTo}
                  onChange={(val) => setDateTo(val)}
                />
              </div>
            </Grid>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p>{
                      Array.isArray(event.participantTypes) && event.participantTypes.length > 0
                        ? event.participantTypes.join(', ')
                        : (event.participants || '—')
                    }</p>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button onClick={() => handleView(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                      <Eye size={14} /> View
                    </button>
                    {event.origin === 'Local' && (
                      <>
                        <button onClick={() => handleEdit(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => handleAddPhotos(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-[#F8EEE9] text-[#223F74] rounded-xl transition text-xs font-bold">
                          Photos
                        </button>
                        <button onClick={() => handleDelete(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-rose-50 text-rose-600 rounded-xl transition text-xs font-bold">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Calendar View */}
          <div className={`${CARD} p-6 mt-6 mb-6`}>
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

      {/* View Event Modal */}
      <Modal id="view-event-modal" title="Event Details" size="md">
        {selectedEvent && (
          <div className="space-y-6 pt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">{selectedEvent.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black border ${categoryBadges[selectedEvent.category]}`}>
                  {selectedEvent.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black ${statusColors[selectedEvent.status]}`}>
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <ModalGrid cols={2}>
              <ModalData label="Date" value={selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : 'N/A'} />
              <ModalData label="Time" value={`${selectedEvent.startTime || 'N/A'} - ${selectedEvent.endTime || 'N/A'}`} />
              <ModalData label="Venue" value={selectedEvent.venue || 'N/A'} />
              <ModalData label="Participants" value={
                Array.isArray(selectedEvent.participantTypes) && selectedEvent.participantTypes.length > 0
                  ? selectedEvent.participantTypes.join(', ')
                  : (selectedEvent.participants || 'N/A')
              } />
              <ModalData label="Target Class" value={
                selectedEvent.classTarget === 'single'
                  ? (classes.find(c => c._id === selectedEvent.classId)?.name || classes.find(c => c._id === selectedEvent.classId)?.className || classes.find(c => c._id === selectedEvent.classId)?.gradeLevel || selectedEvent.classId || 'N/A')
                  : 'All Classes'
              } />
              <ModalData label="Organizer" value={selectedEvent.organizer || 'N/A'} />
            </ModalGrid>

            <div>
              <p className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-3 border-b border-slate-100 pb-2">Description</p>
              <p className="text-slate-600 text-sm font-medium">{selectedEvent.description || 'N/A'}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-3 border-b border-slate-100 pb-2">Photos</p>
              {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedEvent.photos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`Event ${idx}`} className="w-full h-24 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-medium italic">No photos added yet</p>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button text="Close" onClick={() => closeModal('view-event-modal')} variant="secondary" size={4} />
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Event Modal */}
      <Modal id={FORM_MODAL_ID} title={editingId ? 'Edit Event' : 'Create Event'} size="lg">
        <div className="flex flex-col gap-4">

          {/* Event Details */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Event Details" />
            <div className="p-4">
              <DashGrid cols={12} gap={4}>
                <DataField
                  label="Event Name *"
                  id="event_name"
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
                  id="event_category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  searchable={false}
                  size={6}
                >
                  {CATEGORIES.map((cat) => (
                    <Option key={cat} value={cat} label={cat} />
                  ))}
                </SelectField>
                <DataField
                  label="Event Date *"
                  id="event_date"
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
                  id="event_venue"
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
                <DataField
                  label="Start Time"
                  id="event_start_time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  icon={Clock}
                  size={4}
                />
                <DataField
                  label="End Time"
                  id="event_end_time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  icon={Clock}
                  size={4}
                />
                <SelectField
                  label="Status"
                  id="event_status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  searchable={false}
                  size={4}
                >
                  {STATUSES.map((status) => (
                    <Option key={status} value={status} label={status} />
                  ))}
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
                {/* All Option */}
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.participantTypes.length === PARTICIPANT_OPTIONS.length}
                    onChange={() => handleToggleParticipant('All')}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700">All</span>
                </label>

                {/* Individual options */}
                {PARTICIPANT_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.participantTypes.includes(opt)}
                      onChange={() => handleToggleParticipant(opt)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              {formErrors.participantTypes && (
                <p className="text-xs font-semibold text-rose-500 mt-2">{formErrors.participantTypes}</p>
              )}
            </div>
          </div>

          {/* Class Targeting */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Class Target" />
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'all', label: 'All Classes' },
                  { value: 'single', label: 'Single Class' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        classTarget: value,
                        classId: value === 'all' ? '' : formData.classId,
                      });
                      setFormErrors(prev => ({ ...prev, classId: '' }));
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-200 ${formData.classTarget === value
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
                  id="event_class"
                  value={formData.classId}
                  onChange={(e) => {
                    setFormData({ ...formData, classId: e.target.value });
                    if (formErrors.classId) setFormErrors(prev => ({ ...prev, classId: '' }));
                  }}
                  placeholder="Select Class"
                  searchable
                  size={12}
                >
                  {classes.map((cls) => (
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

          {/* Description */}
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Description" />
            <div className="p-4">
              <DataField
                label="Event Description"
                id="event_description"
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
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal(FORM_MODAL_ID)}
              size={3}
            />
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

      {/* Add Photos Modal */}
      <Modal id={PHOTO_MODAL_ID} title={selectedEvent ? `Upload Photos — ${selectedEvent.name}` : 'Upload Photos'} size="md">
        <div className="flex flex-col gap-4">
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
                  await uploadEventPhotosApi(selectedEvent.id, selectedFiles);
                  await fetchEventData();
                  closeModal(PHOTO_MODAL_ID);
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                  toast.success('Photos uploaded successfully!');
                } catch (err) {
                  toast.error('Upload failed: ' + err.message);
                } finally {
                  setUploading(false);
                }
              }}
              size={3}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal id={DELETE_MODAL_ID} title="Delete Event" size="sm">
        {selectedEvent && (
          <div className="flex flex-col gap-4">
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

export default Events;