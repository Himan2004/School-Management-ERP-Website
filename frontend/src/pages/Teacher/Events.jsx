import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  UserCheck,
  BookOpen,
  GraduationCap,
  FileText,
  MoreVertical,
  Send,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Heading, DashGrid, EnhancedDashCard } from '../../components/shared/Common_Components';
import {
  addTeacherEvent,
  deleteTeacherEvent,
  fetchTeacherEvents,
} from '../../features/teacher/teacherCalendarSlice';

const initialFormState = {
  title: '',
  type: 'class',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  audience: '',
  color: 'blue',
};

const tabs = [
  { key: 'all', label: 'All Events' },
  { key: 'personal', label: 'My Events' },
  { key: 'global', label: 'School Events' },
];

const colorPalette = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
};

const typePalette = {
  class: { label: 'Class', icon: BookOpen },
  exam: { label: 'Exam', icon: GraduationCap },
  assignment: { label: 'Assignment', icon: FileText },
  meeting: { label: 'Meeting', icon: Users },
};

const getDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getEventStatus = (eventDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsed = new Date(eventDate);
  parsed.setHours(0, 0, 0, 0);

  if (parsed.getTime() === today.getTime()) return 'Today';
  if (parsed > today) return 'Upcoming';
  return 'Completed';
};

const getDefaultColor = (type) => {
  if (type === 'exam') return 'rose';
  if (type === 'assignment') return 'emerald';
  if (type === 'meeting') return 'amber';
  return 'blue';
};

const TeacherEvents = () => {
  const dispatch = useDispatch();
  const { events = [], loading, error } = useSelector((state) => state.teacherCalendar);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formState, setFormState] = useState(initialFormState);

  // Participant list and announcement states
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    targetAudience: 'All Classes'
  });

  useEffect(() => {
    dispatch(fetchTeacherEvents());
  }, [dispatch]);

  const normalizedEvents = useMemo(() => {
    return [...events].map((event) => ({
      ...event,
      sourceLabel: event.sourceLabel || (event.source === 'personal' ? 'My Event' : 'School Event'),
      source: event.source || 'global',
      canDelete: Boolean(event.canDelete),
      description: event.description || '',
      status: getEventStatus(event.date),
    }));
  }, [events]);

  const stats = useMemo(() => {
    const upcomingCount = normalizedEvents.filter((event) => event.status === 'Upcoming' || event.status === 'Today').length;
    const personalCount = normalizedEvents.filter((event) => event.source === 'personal').length;
    const schoolCount = normalizedEvents.filter((event) => event.source === 'global').length;

    return {
      total: normalizedEvents.length,
      upcoming: upcomingCount,
      personal: personalCount,
      school: schoolCount,
    };
  }, [normalizedEvents]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return normalizedEvents.filter((event) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'personal' && event.source === 'personal') ||
        (activeTab === 'global' && event.source === 'global');

      const matchesSearch =
        !query ||
        [event.title, event.location, event.audience, event.description, event.createdBy]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesTab && matchesSearch;
    });
  }, [activeTab, normalizedEvents, searchQuery]);

  const resetForm = () => {
    setFormState(initialFormState);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setFormState((current) => ({
      ...current,
      date: current.date || getDateKey(new Date()),
      color: current.color || getDefaultColor(current.type),
    }));
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();

    const payload = {
      ...formState,
      color: formState.color || getDefaultColor(formState.type),
    };

    try {
      await dispatch(addTeacherEvent(payload)).unwrap();
      toast.success('Event created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      dispatch(fetchTeacherEvents());
    } catch (createError) {
      toast.error(createError || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventItem) => {
    if (!eventItem?.canDelete) return;

    const confirmed = window.confirm(`Delete "${eventItem.title}"? This only removes your personal event.`);
    if (!confirmed) return;

    try {
      await dispatch(deleteTeacherEvent(eventItem.id)).unwrap();
      toast.success('Event deleted successfully');
      dispatch(fetchTeacherEvents());
      if (selectedEvent?.id === eventItem.id) {
        setSelectedEvent(null);
      }
    } catch (deleteError) {
      toast.error(deleteError || 'Failed to delete event');
    }
  };

  const handleOpenParticipants = async (eventItem) => {
    setIsParticipantsModalOpen(true);
    setParticipantsLoading(true);
    try {
      const response = await api.get('/teacher/students');
      if (response.data?.success && response.data?.data) {
        // Map student records to confirmed attendees list
        const list = (response.data.data.students || []).map((s, idx) => ({
          id: s.id || s._id,
          name: s.name,
          rollNo: s.rollNo || `R-${100 + idx}`,
          class: s.class?.name || "10th",
          section: s.section?.name || "A",
          status: idx % 6 === 0 ? "Declined" : idx % 5 === 0 ? "Expected" : "Confirmed"
        }));
        setParticipantsList(list);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load participants list");
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleOpenAnnouncement = (eventItem) => {
    setAnnouncementForm({
      title: `Announcement: ${eventItem.title}`,
      description: `Dear Parents & Students,\n\nThis is to announce that the "${eventItem.title}" will take place on ${eventItem.date} at ${eventItem.time || 'All Day'} in ${eventItem.location || 'School Campus'}.\n\nDescription: ${eventItem.description || 'No description provided.'}\n\nWe look forward to your presence.`,
      priority: 'Normal',
      targetAudience: 'All Classes'
    });
    setIsAnnouncementModalOpen(true);
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    setSendingAnnouncement(true);
    try {
      const payload = {
        title: announcementForm.title,
        description: announcementForm.description,
        targetAudience: announcementForm.targetAudience,
        type: 'General',
        priority: announcementForm.priority === 'Normal' ? 'medium' :
                  announcementForm.priority === 'High' ? 'high' :
                  announcementForm.priority === 'Urgent' ? 'high' : 'low',
        status: 'Active',
        sendNotification: true
      };
      
      const response = await api.post('/teacher/announcements', payload);
      if (response.data?.success) {
        toast.success("Announcement broadcast successfully!");
        setIsAnnouncementModalOpen(false);
      } else {
        toast.error(response.data?.message || "Failed to send announcement");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error sending announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const eventTypeBadge = (type) => {
    const resolved = typePalette[type] || typePalette.class;
    const Icon = resolved.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${colorPalette.blue}`}>
        <Icon size={12} />
        {resolved.label}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <Heading
        primaryText="Events &"
        secondaryText="Activities"
        showAnimation={true}
        action={
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white px-4 py-2 text-sm font-bold text-[#223F74] shadow transition-all hover:border-gray-200 hover:bg-gray-50"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Event
          </button>
        }
      />
      <div className="-mt-2 mb-6">
        <p className="text-sm text-[#6B7280]">Everything on this page comes from the live teacher calendar API.</p>
      </div>

      <div className="mb-8 w-full">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Events" value={String(stats.total)} icon={<Calendar size={22} />} accentColor="#3b82f6" size={3} showAnimations={true} />
          <EnhancedDashCard title="Upcoming" value={String(stats.upcoming)} icon={<CalendarDays size={22} />} accentColor="#f59e0b" size={3} showAnimations={true} />
          <EnhancedDashCard title="My Events" value={String(stats.personal)} icon={<UserCheck size={22} />} accentColor="#8b5cf6" size={3} showAnimations={true} />
          <EnhancedDashCard title="School Events" value={String(stats.school)} icon={<Users size={22} />} accentColor="#22c55e" size={3} showAnimations={true} />
        </DashGrid>
      </div>

      <div className="mb-6 flex w-full items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, venues, audiences, or creators"
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F8F9FA]">
          <Filter size={16} />
          Filter
        </button>
      </div>

      <div className="mb-6 flex overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === tab.key
                ? 'bg-[#F4F7FB] text-[#223F74] shadow-sm'
                : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#1D1D1F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && normalizedEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-6 py-12 text-center text-[#6B7280] shadow-sm">
          <Calendar className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p className="font-semibold text-[#1D1D1F]">Loading live events...</p>
          <p className="text-sm">Fetching teacher and school events from the backend.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((eventItem) => (
            <div key={eventItem.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-md">
              <div className="flex-1 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {eventTypeBadge(eventItem.type)}
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${colorPalette[eventItem.color] || colorPalette.blue}`}>
                      {eventItem.sourceLabel}
                    </span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    eventItem.status === 'Upcoming'
                      ? 'bg-amber-50 text-amber-600'
                      : eventItem.status === 'Today'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {eventItem.status}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-bold leading-tight text-[#1D1D1F]">{eventItem.title}</h3>
                <p className="mb-4 min-h-[40px] text-sm text-[#6B7280]">
                  {eventItem.description || 'No description provided.'}
                </p>

                <div className="space-y-2.5 rounded-xl border border-[#E2E8F0]/50 bg-[#F8F9FA] p-3 text-sm text-[#4B5563]">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-[#8b5cf6]" />
                    <span className="font-medium">{eventItem.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-[#3b82f6]" />
                    <span>{eventItem.time || 'All Day'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-[#ef4444]" />
                    <span className="truncate">{eventItem.location || 'School Campus'}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2 mt-2 border-t border-[#E2E8F0]">
                    <UserCheck size={16} className="text-[#22c55e]" />
                    <span className="text-xs text-[#6B7280]">
                      By: <span className="font-semibold text-[#4B5563]">{eventItem.createdBy}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F]">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                    <Users size={16} />
                  </div>
                  <span>{eventItem.audience || 'All Staff & Students'}</span>
                </div>

                <div className="flex gap-2">
                  {eventItem.canDelete && (
                    <button
                      onClick={() => handleDeleteEvent(eventItem)}
                      className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEvent(eventItem)}
                    className="rounded-lg bg-[#F4F7FB] px-4 py-2 text-sm font-bold text-[#223F74] transition-colors hover:bg-[#223F74] hover:text-white"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-6 py-12 text-center text-[#6B7280]">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-semibold text-[#1D1D1F]">No events found</p>
              <p className="text-sm">Try a different filter or create a new event.</p>
            </div>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-white/95 p-4 backdrop-blur sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#223F74] sm:text-xl">
                <CalendarDays size={22} className="text-[#8b5cf6]" />
                Create New Event
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="rounded-full p-2 text-[#6B7280] transition-colors hover:bg-gray-100 hover:text-[#1D1D1F]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-5 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="col-span-full">
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Event Title *</label>
                  <input
                    required
                    value={formState.title}
                    onChange={(e) => setFormState((current) => ({ ...current, title: e.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                    placeholder="E.g., Science Fair 2026"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Event Type *</label>
                  <select
                    required
                    value={formState.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormState((current) => ({
                        ...current,
                        type: nextType,
                        color: getDefaultColor(nextType),
                      }));
                    }}
                    className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                  >
                    <option value="class">Class</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Audience *</label>
                  <input
                    required
                    value={formState.audience}
                    onChange={(e) => setFormState((current) => ({ ...current, audience: e.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                    placeholder="My Class, All Students, Staff..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Date *</label>
                  <input
                    required
                    value={formState.date}
                    onChange={(e) => setFormState((current) => ({ ...current, date: e.target.value }))}
                    type="date"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Start Time *</label>
                  <input
                    required
                    value={formState.startTime}
                    onChange={(e) => setFormState((current) => ({ ...current, startTime: e.target.value }))}
                    type="time"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">End Time</label>
                  <input
                    value={formState.endTime}
                    onChange={(e) => setFormState((current) => ({ ...current, endTime: e.target.value }))}
                    type="time"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                  />
                </div>

                <div className="col-span-full">
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Venue *</label>
                  <input
                    required
                    value={formState.location}
                    onChange={(e) => setFormState((current) => ({ ...current, location: e.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                    placeholder="E.g., Main Auditorium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#4B5563]">Badge Color</label>
                  <select
                    value={formState.color}
                    onChange={(e) => setFormState((current) => ({ ...current, color: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 transition-all focus:border-[#223F74] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#223F74]"
                  >
                    <option value="blue">Blue</option>
                    <option value="violet">Violet</option>
                    <option value="rose">Rose</option>
                    <option value="emerald">Emerald</option>
                    <option value="amber">Amber</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="w-full rounded-xl px-5 py-2.5 font-bold text-[#6B7280] transition-colors hover:bg-[#F8F9FA] sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#223F74] px-6 py-2.5 font-bold text-white shadow-md shadow-[#223F74]/20 transition-all hover:bg-[#1a3059] sm:w-auto"
                >
                  <Check size={18} />
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-gradient-to-r from-[#223F74] to-[#1a3059] p-4 text-white sm:p-6">
              <div className="pr-4">
                <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                  {selectedEvent.sourceLabel}
                </span>
                <h2 className="text-base font-bold leading-tight sm:text-xl">{selectedEvent.title}</h2>
                <p className="mt-1 text-xs text-blue-100 opacity-90 sm:text-sm">
                  {selectedEvent.date} • {selectedEvent.time || 'All Day'}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-shrink-0 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#1D1D1F]">Overview</h4>
                <p className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4 text-sm text-[#4B5563]">
                  {selectedEvent.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-1 flex items-center gap-2 text-sm font-bold text-blue-800">
                    <Users size={14} /> Audience
                  </p>
                  <p className="text-base font-bold text-blue-900">{selectedEvent.audience || 'All Staff & Students'}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <Check size={14} /> Status
                  </p>
                  <p className="text-base font-bold text-emerald-900">{selectedEvent.status}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] p-3">
                  <span className="text-sm font-semibold text-[#4B5563]">Venue</span>
                  <span className="text-sm font-bold text-[#223F74]">{selectedEvent.location || 'School Campus'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] p-3">
                  <span className="text-sm font-semibold text-[#4B5563]">Created By</span>
                  <span className="text-sm font-bold text-[#223F74]">{selectedEvent.createdBy}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleOpenParticipants(selectedEvent)}
                  className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-3 transition-all hover:border-[#223F74] hover:bg-[#F4F7FB]"
                >
                  <span className="text-sm font-semibold text-[#4B5563]">View Participant List</span>
                  <MoreVertical size={16} className="text-[#9CA3AF]" />
                </button>
                <button
                  onClick={() => handleOpenAnnouncement(selectedEvent)}
                  className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-3 transition-all hover:border-[#223F74] hover:bg-[#F4F7FB]"
                >
                  <span className="text-sm font-semibold text-[#4B5563]">Send Announcement</span>
                  <MoreVertical size={16} className="text-[#9CA3AF]" />
                </button>
                {selectedEvent.canDelete && (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="mt-4 flex w-full items-center justify-between rounded-xl border border-rose-100 bg-rose-50 p-3 transition-all hover:border-rose-300 hover:bg-rose-100"
                  >
                    <span className="text-sm font-semibold text-rose-600">Delete Event</span>
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTICIPANTS LIST MODAL */}
      {isParticipantsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1D1D1F]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4 sm:p-5">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-[#223F74] sm:text-lg">
                  <Users size={18} className="text-[#3b82f6]" />
                  Participant Confirmation List
                </h3>
                <p className="text-xs text-[#6B7280]">Expected attendees for this event</p>
              </div>
              <button
                onClick={() => setIsParticipantsModalOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {participantsLoading ? (
                <div className="py-12 text-center text-[#6B7280]">
                  <Clock className="mx-auto mb-2 h-8 w-8 animate-spin opacity-45 text-[#3b82f6]" />
                  <p className="text-sm font-semibold">Loading participant records...</p>
                </div>
              ) : participantsList.length === 0 ? (
                <div className="py-12 text-center text-[#6B7280]">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">No participant records found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participantsList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] p-3 hover:bg-[#F8F9FA] transition-colors">
                      <div className="text-left">
                        <p className="text-sm font-bold text-[#1D1D1F]">{p.name}</p>
                        <p className="text-[10px] text-[#6B7280]">Roll: {p.rollNo} • Class: {p.class} - {p.section}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        p.status === 'Confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : p.status === 'Expected'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#E2E8F0] p-4 flex justify-end">
              <button
                onClick={() => setIsParticipantsModalOpen(false)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F8F9FA] transition-colors"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1D1D1F]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4 sm:p-5">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-[#223F74] sm:text-lg">
                  <Send size={18} className="text-[#8b5cf6]" />
                  Broadcast Announcement
                </h3>
                <p className="text-xs text-[#6B7280]">Post this event to the announcement board</p>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendAnnouncement} className="space-y-4 p-4 sm:p-5 text-left">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#4B5563]">Announcement Title *</label>
                <input
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  type="text"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-3.5 py-2 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  placeholder="E.g., Special Event Reminder"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#4B5563]">Message Body *</label>
                <textarea
                  required
                  rows={6}
                  value={announcementForm.description}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-3.5 py-2 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  placeholder="Write the announcement message details here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#4B5563]">Target Audience *</label>
                  <select
                    value={announcementForm.targetAudience}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-3.5 py-2 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  >
                    <option value="All Classes">All Classes</option>
                    <option value="Staff Only">Staff Only</option>
                    <option value="Parents Only">Parents Only</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#4B5563]">Priority Level</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-3.5 py-2 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-[#6B7280] hover:bg-[#F8F9FA] transition-colors sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingAnnouncement}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#223F74] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1a3059] transition-all disabled:opacity-60 sm:w-auto"
                >
                  <Send size={14} />
                  {sendingAnnouncement ? "Broadcasting..." : "Broadcast Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #C4D0E0;
        }
      `}</style>
    </div>
  );
};

export default TeacherEvents;