import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, ChevronDown, Calendar, LayoutGrid, List, CheckCircle, Users, Heart, MapPin, Clock, Info, Loader2, XCircle, ChevronLeft, ChevronRight, ImageOff, Eye, Trophy, GraduationCap, Music, Paintbrush, Camera, X } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  PanelModal,
  ModalGrid,
  ModalData,
  openModal,
  closeModal,
  Button
} from '../../components/shared/Common_Components';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const categoryColors = {
  Sports:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  Academic:       'bg-blue-50 text-blue-700 border-blue-200',
  Cultural:       'bg-purple-50 text-purple-700 border-purple-200',
  Technology:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  Workshop:       'bg-orange-50 text-orange-700 border-orange-200',
  Holiday:        'bg-yellow-50 text-yellow-700 border-yellow-200',
  Trip:           'bg-pink-50 text-pink-700 border-pink-200',
  Meeting:        'bg-teal-50 text-teal-700 border-teal-200',
  General:        'bg-slate-50 text-slate-700 border-slate-200',
};

const getCategoryBadgeClass = (cat) => categoryColors[cat] || 'bg-slate-50 text-slate-700 border-slate-200';

const getCategoryIcon = (category, cls = 'w-5 h-5') => {
  switch (category) {
    case 'Sports':     return <Trophy className={`${cls} text-emerald-500`} />;
    case 'Academic':   return <GraduationCap className={`${cls} text-blue-500`} />;
    case 'Cultural':   return <Music className={`${cls} text-purple-500`} />;
    case 'Workshop':   return <Paintbrush className={`${cls} text-orange-500`} />;
    default:           return <Calendar className={`${cls} text-slate-500`} />;
  }
};

// ─── Image Lightbox ───────────────────────────────────────────────────────────
const ImageLightbox = ({ photos, initialIndex, onClose }) => {
  const [current, setCurrent] = useState(initialIndex);
  const handlePrev = useCallback((e) => { e.stopPropagation(); setCurrent((i) => (i - 1 + photos.length) % photos.length); }, [photos.length]);
  const handleNext = useCallback((e) => { e.stopPropagation(); setCurrent((i) => (i + 1) % photos.length); }, [photos.length]);
  
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev(e);
      if (e.key === 'ArrowRight') handleNext(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, handlePrev, handleNext]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X className="w-6 h-6" /></button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-semibold px-4 py-1.5 rounded-full">{current + 1} / {photos.length}</div>
      {photos.length > 1 && <button onClick={handlePrev} className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><ChevronLeft className="w-6 h-6" /></button>}
      <div className="max-w-5xl max-h-[85vh] w-full px-16 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={photos[current]} alt="" className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
      {photos.length > 1 && <button onClick={handleNext} className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><ChevronRight className="w-6 h-6" /></button>}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/40 rounded-2xl" onClick={(e) => e.stopPropagation()}>
          {photos.map((photo, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)} className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === current ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <img src={photo} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Event Card (Grid) ────────────────────────────────────────────────────────
const EventCard = ({ event, registered, favorite, onToggleFavorite, onView, onRegister, onUnregister, onPhotoClick }) => {
  const isUpcoming = new Date(event.date) >= new Date();
  const isFull = event.capacity && event.registered >= event.capacity;

  return (
    <div className="bg-white rounded-[24px] overflow-hidden border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,.1)] transition-all duration-300 flex flex-col h-full group">
      <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
        {event.photos && event.photos.length > 0 ? (
          <img src={event.photos[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onClick={() => onPhotoClick(event.photos, 0)} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#223F74]/5 to-[#F59B87]/10 ${event.photos?.length ? 'hidden' : 'flex'}`} style={{ display: event.photos?.length ? 'none' : 'flex' }}>
          {getCategoryIcon(event.category, 'w-10 h-10')}
        </div>
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {registered ? (
            <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Registered</span>
          ) : !isUpcoming ? (
            <span className="px-2.5 py-1 bg-slate-600/90 backdrop-blur-sm text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Past</span>
          ) : isFull ? (
            <span className="px-2.5 py-1 bg-rose-500/90 backdrop-blur-sm text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Full</span>
          ) : (
            <span className="px-2.5 py-1 bg-[#223F74]/90 backdrop-blur-sm text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Upcoming</span>
          )}
        </div>
        
        <button onClick={() => onToggleFavorite(event.id)} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm">
          <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-500'}`} />
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getCategoryBadgeClass(event.category)}`}>{event.category}</span>
        </div>
        <h3 className="text-base font-bold text-[#1D1D1F] mb-2 line-clamp-2 leading-tight group-hover:text-[#223F74] transition-colors">{event.title}</h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-1">{event.description}</p>
        
        <div className="space-y-2 text-xs font-semibold text-slate-600 mb-5">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#223F74]/70" /><span>{event.date ? format(new Date(event.date), 'EEEE, dd MMM yyyy') : '—'}</span></div>
          {event.time && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#223F74]/70" /><span>{event.time}</span></div>}
          {event.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#223F74]/70" /><span className="truncate">{event.location}</span></div>}
        </div>
        
        <div className="flex gap-2 mt-auto">
          <button onClick={() => onView(event)} className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-[#223F74] rounded-xl text-xs font-bold transition-all border border-slate-200">View Details</button>
          {isUpcoming && !registered && (
            <button onClick={() => onRegister(event)} disabled={isFull} className="flex-1 px-4 py-2.5 bg-[#223F74] hover:bg-[#1a3360] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#223F74]/20">{isFull ? 'Full' : 'Register'}</button>
          )}
          {registered && isUpcoming && (
            <button onClick={() => onUnregister(event.id)} className="flex-1 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-100">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Event Detail Modal ───────────────────────────────────────────────────────
const EventDetailModal = ({ event, registered, favorite, onClose, onRegister, onUnregister, onToggleFavorite, onPhotoClick }) => {
  if (!event) return null;
  const isUpcoming = new Date(event.date) >= new Date();
  const isFull = event.capacity && event.registered >= event.capacity;

  return (
    <PanelModal id="event-detail-panel" title="Event Details" size="lg" isVisible={true} onClose={onClose}>
      <div className="relative bg-slate-100 h-48 shrink-0 overflow-hidden rounded-t-xl">
        {event.photos && event.photos.length > 0 ? (
          <img src={event.photos[0]} alt="" className="w-full h-full object-cover opacity-80 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => onPhotoClick(event.photos, 0)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">{getCategoryIcon(event.category, 'w-16 h-16')}</div>
        )}
        {event.photos && event.photos.length > 0 && (
          <button onClick={() => onPhotoClick(event.photos, 0)} className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors">
            <Camera className="w-3.5 h-3.5" /> {event.photos.length} Photo{event.photos.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getCategoryBadgeClass(event.category)}`}>{event.category}</span>
            <h2 className="text-2xl font-black text-[#1D1D1F] mt-3 leading-tight">{event.title}</h2>
          </div>
          <button onClick={() => onToggleFavorite(event.id)} className="p-2.5 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all shrink-0 shadow-sm border border-slate-100 hover:border-rose-100">
            <Heart className={`w-6 h-6 ${favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-500'}`} />
          </button>
        </div>
        
        <ModalGrid title="Key Details" cols={2}>
          <ModalData label="Date" value={event.date ? format(new Date(event.date), 'PPPP') : '—'} />
          {event.time && <ModalData label="Time" value={event.time} />}
          {event.location && <ModalData label="Venue" value={event.location} />}
          {event.capacity && <ModalData label="Capacity" value={`${event.registered}/${event.capacity}`} />}
        </ModalGrid>

        <div className="mt-6">
          <ModalGrid title="Registration & Contact" cols={2}>
            <ModalData label="Organizer" value={event.organizer || 'Administration'} />
            <ModalData label="Contact Person" value={event.contactPerson || 'Coordinator'} />
            <ModalData label="Registration Deadline" value={event.registrationDeadline ? format(new Date(event.registrationDeadline), 'PPPP') : '—'} />
            <ModalData label="Registration Status" value={registered ? 'Registered' : isFull ? 'Full' : isUpcoming ? 'Open' : 'Closed'} />
            <ModalData label="Available Seats" value={event.capacity ? Math.max(0, event.capacity - event.registered) : 'Unlimited'} />
          </ModalGrid>
        </div>

        {event.attachmentUrl && (
          <div className="mt-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Attachment</h3>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-sm font-medium text-slate-700">{event.attachmentUrl}</span>
              <Button text="Download" variant="secondary" size={2} onClick={() => {
                const link = document.createElement('a');
                link.href = event.attachmentUrl || '#';
                link.download = event.attachmentUrl ? event.attachmentUrl.split('/').pop() : 'download';
                link.target = '_blank';
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                toast.success('Downloading attachment...');
              }} />
            </div>
          </div>
        )}

        {event.description && (
          <div className="mt-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{event.description}</p>
          </div>
        )}

        {event.photos && event.photos.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Camera className="w-4 h-4" /> Gallery</h3>
            <div className="flex gap-3 flex-wrap">
              {event.photos.map((photo, idx) => (
                <button key={idx} onClick={() => onPhotoClick(event.photos, idx)} className="w-24 h-20 rounded-xl overflow-hidden border-2 border-slate-100 hover:border-[#223F74] transition-all hover:scale-105 shadow-sm">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 p-5 pt-0 shrink-0 border-t border-slate-100 mt-2">
        <Button text="Close" variant="ghost" onClick={onClose} size={2} />
        {isUpcoming && !registered && (
          <Button text={isFull ? 'Event Full' : 'Register Now'} variant="primary" disabled={isFull} onClick={() => onRegister(event)} size={3} />
        )}
        {registered && isUpcoming && (
          <Button text="Cancel Registration" variant="danger" onClick={() => { onUnregister(event.id); onClose(); }} size={3} />
        )}
      </div>
    </PanelModal>
  );
};

// ─── Register Confirm Modal ───────────────────────────────────────────────────
const RegisterModal = ({ event, onConfirm, onClose, isLoading }) => {
  if (!event) return null;
  return (
    <PanelModal id="event-register-panel" title="Confirm Registration" size="sm" isVisible={true} onClose={onClose}>
      <div className="p-4">
        <p className="text-sm text-slate-600 mb-1">You are registering for:</p>
        <p className="font-bold text-[#1D1D1F] mb-4">{event.title}</p>
        <div className="text-sm text-slate-500 space-y-1 mb-5">
          <p>{event.date ? format(new Date(event.date), 'PPP') : '—'}</p>
          {event.time && <p>{event.time}</p>}
          {event.location && <p>{event.location}</p>}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-700 leading-relaxed">
          If you are unable to attend, please cancel your registration in advance.
        </div>
        <div className="flex justify-end gap-3">
          <Button text="Cancel" variant="ghost" onClick={onClose} size={4} />
          <Button text={isLoading ? "Registering..." : "Confirm"} variant="primary" icon={!isLoading && <CheckCircle className="w-4 h-4" />} disabled={isLoading} onClick={onConfirm} size={4} />
        </div>
      </div>
    </PanelModal>
  );
};

// ─── Day Events Modal ──────────────────────────────────────────────────────────
const DayEventsModal = ({ date, events, onSelectEvent, onClose }) => {
  if (!date || !events?.length) return null;
  return (
    <PanelModal id="day-events-panel" title={`Events on ${format(date, 'MMM d, yyyy')}`} size="sm" isVisible={true} onClose={onClose}>
      <div className="p-4 space-y-3">
        <p className="text-sm text-slate-600 mb-2">Select an event to view details:</p>
        {events.map(event => (
          <button key={event.id} onClick={() => { onClose(); onSelectEvent(event); }} className="w-full text-left p-4 border-2 border-slate-100 rounded-xl hover:border-[#223F74] transition-all bg-white shadow-sm flex flex-col gap-1.5 group">
             <span className="font-bold text-[#1D1D1F] group-hover:text-[#223F74] transition-colors">{event.title}</span>
             <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
               {event.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.time}</span>}
               {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
             </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end p-4 border-t border-slate-100">
        <Button text="Cancel" variant="ghost" onClick={onClose} size={4} />
      </div>
    </PanelModal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('grid');
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState({ date: null, events: [] });
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student_registered_events') || '[]'); } catch { return []; }
  });
  const [favoriteEvents, setFavoriteEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student_favorite_events') || '[]'); } catch { return []; }
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, photos: [], index: 0 });
  const [toolbarNode, setToolbarNode] = useState(null);

  useEffect(() => {
    const handleInput = (e) => {
      if (e.target && e.target.placeholder === "Search…") {
        setGlobalSearch(e.target.value);
      }
    };
    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const node = document.querySelector('.events-data-table .sm\\:ml-auto');
      if (node) {
        setToolbarNode(node);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [viewMode]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await studentApi.getEvents();
        const raw = res?.data?.events || res?.events || res?.data || [];
        const formatted = (Array.isArray(raw) ? raw : []).map((evt) => {
          let time = '';
          if (evt.startTime && evt.endTime) time = `${evt.startTime} – ${evt.endTime}`;
          else if (evt.startTime) time = evt.startTime;
          return {
            ...evt,
            id:          evt.id || evt._id,
            title:       evt.title || '—',
            description: evt.description || '—',
            category:    evt.category || '—',
            date:        evt.eventDate || evt.date || null,
            time:        time || '—',
            location:    evt.venue || evt.location || '—',
            capacity:    evt.capacity || null,
            registered:  evt.registeredCount || evt.registered || 0,
            photos:      Array.isArray(evt.photos) ? evt.photos : [],
            organizer:   evt.organizer || '—',
            registrationDeadline: evt.registrationDeadline || evt.date || null,
            contactPerson: evt.contactPerson || '—',
            attachmentUrl: evt.attachmentUrl || null,
          };
        });
        setEvents(formatted);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => { localStorage.setItem('student_registered_events', JSON.stringify(registeredEvents)); }, [registeredEvents]);
  useEffect(() => { localStorage.setItem('student_favorite_events', JSON.stringify(favoriteEvents)); }, [favoriteEvents]);

  const handleRegisterConfirm = async () => {
    if (!selectedEvent) return;
    setIsRegistering(true);
    try {
      await studentApi.registerForEvent(selectedEvent.id);
      setRegisteredEvents((prev) => [...prev, selectedEvent.id]);
      toast.success(`Registered for ${selectedEvent.title}`);
      setShowRegisterModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async (eventId) => {
    try {
      await studentApi.unregisterFromEvent(eventId);
      setRegisteredEvents((prev) => prev.filter((id) => id !== eventId));
      toast.success('Registration cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to cancel');
    }
  };

  const toggleFavorite = (id) => setFavoriteEvents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const openPhotoLightbox = (photos, index) => { if (photos?.length) setLightbox({ open: true, photos, index }); };

  const tableRows = events.map(e => ({
    ...e,
    status: e.date && new Date(e.date) >= new Date() ? 'Upcoming' : 'Past',
    participation: registeredEvents.includes(e.id) ? 'Registered' : 'Not Registered',
    dateStr: e.date ? format(new Date(e.date), 'dd MMM yyyy') : '—',
  }));

  const dataTableFilters = [
    { title: "Event Category", type: "toggle", key: "category", options: [...new Set(events.map(e => e.category))] },
    { title: "Event Status", type: "toggle", key: "status", options: ["Upcoming", "Past"] },
    { title: "Participation Status", type: "toggle", key: "participation", options: ["Registered", "Not Registered"] }
  ];

  const gridColumns = [
    {
      key: "gridCard", label: "", searchValue: (row) => `${row.title} ${row.category} ${row.location} ${row.description}`, render: (val, row) => (
        <EventCard event={row} registered={registeredEvents.includes(row.id)} favorite={favoriteEvents.includes(row.id)} onToggleFavorite={toggleFavorite} onView={(e) => { setSelectedEvent(e); setShowDetailModal(true); }} onRegister={(e) => { setSelectedEvent(e); setShowRegisterModal(true); }} onUnregister={handleUnregister} onPhotoClick={openPhotoLightbox} />
      )
    }
  ];

  const listColumns = [
    { key: "eventInfo", label: "Event", searchValue: (row) => `${row.title} ${row.category} ${row.location} ${row.description}`, render: (val, row) => (
      <div className="flex items-center gap-4 py-1">
        {row.photos?.length > 0 ? (
          <button onClick={() => openPhotoLightbox(row.photos, 0)} className="w-12 h-12 rounded-xl overflow-hidden shrink-0 hover:ring-2 ring-[#223F74] transition-all shadow-sm"><img src={row.photos[0]} alt="" className="w-full h-full object-cover" /></button>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">{getCategoryIcon(row.category, 'w-6 h-6')}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#1D1D1F] text-sm truncate">{row.title}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{row.description}</p>
        </div>
      </div>
    ) },
    { key: "category", label: "Category", render: (val) => (
      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getCategoryBadgeClass(val)}`}>{val}</span>
    ) },
    { key: "dateStr", label: "Date & Time", sortValue: (row) => new Date(row.date).getTime(), render: (val, row) => (
      <div>
        <p className="text-sm font-semibold text-[#1D1D1F]">{val}</p>
        <p className="text-xs text-slate-500">{row.time || '—'}</p>
      </div>
    ) },
    { key: "location", label: "Venue", render: (val) => (
      <div className="flex items-center gap-1.5 text-slate-600 text-sm font-medium">
        <MapPin size={14} className="text-slate-400" /><span className="truncate max-w-[150px]">{val || '—'}</span>
      </div>
    ) },
    { key: "status", label: "Status", render: (val, row) => {
      if (row.participation === 'Registered') return <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Registered</span>;
      if (val === 'Upcoming') return <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Upcoming</span>;
      return <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">Past</span>;
    } }
  ];

  const listActions = [
    { tooltip: "View Details", icon: <span title="View Details"><Eye className="w-4 h-4" /></span>, onClick: (row) => { setSelectedEvent(row); setShowDetailModal(true); } }
  ];

  const calendarFiltered = useMemo(() => {
    return events.filter(e => {
      const q = globalSearch.toLowerCase();
      if (q && !e.title.toLowerCase().includes(q) && !(e.description || '').toLowerCase().includes(q)) return false;
      if (activeFilters["Event Category"]?.length > 0 && !activeFilters["Event Category"].includes(e.category)) return false;
      const eventStatus = new Date(e.date) >= new Date() ? 'Upcoming' : 'Past';
      if (activeFilters["Event Status"]?.length > 0 && !activeFilters["Event Status"].includes(eventStatus)) return false;
      const partStatus = registeredEvents.includes(e.id) ? 'Registered' : 'Not Registered';
      if (activeFilters["Participation Status"]?.length > 0 && !activeFilters["Participation Status"].includes(partStatus)) return false;
      if (activeFilters.dateFrom && new Date(e.date) < new Date(activeFilters.dateFrom)) return false;
      if (activeFilters.dateTo) {
        const to = new Date(activeFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(e.date) > to) return false;
      }
      return true;
    });
  }, [events, globalSearch, activeFilters, registeredEvents]);

  const getDaysInMonth = (d) => {
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const days = [];
    for (let i = first.getDay() - 1; i >= 0; i--) days.push({ date: new Date(y, m, -i), cur: false });
    for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), cur: true });
    const rem = 42 - days.length;
    for (let i = 1; i <= rem; i++) days.push({ date: new Date(y, m + 1, i), cur: false });
    return days;
  };
  const calDays = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-2 text-slate-500 font-semibold">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <ImageOff className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#223F74] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3360] transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <style>{`
        .events-data-table .sm\\:ml-auto { display: flex; align-items: center; }
        .events-data-table .sm\\:ml-auto > button:not([title]) { order: 1 !important; }
        #view-toggles { order: 2 !important; }
        .events-data-table .sm\\:ml-auto > button[title="Export all data as CSV"] { order: 3 !important; }
        .events-data-table .sm\\:ml-auto > div.relative { display: none !important; }
        
        .hide-table .data-table-scroll { display: none !important; }
        .hide-table > div > div.flex.justify-between { display: none !important; }
        
        .grid-mode .data-table-scroll { overflow: visible !important; }
        .grid-mode table { display: block !important; }
        .grid-mode thead { display: none !important; }
        .grid-mode tbody {
          display: grid !important;
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          gap: 1.25rem !important;
        }
        @media (min-width: 768px) { .grid-mode tbody { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        @media (min-width: 1200px) { .grid-mode tbody { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
        .grid-mode tr { display: flex !important; border: none !important; }
        .grid-mode td { display: block !important; width: 100% !important; padding: 0 !important; border: none !important; }
      `}</style>

      <Heading primaryText="Events & Activities" />

      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Events" value={calendarFiltered.length} icon={<Calendar size={24} />} accentColor="#3b82f6" size={3} />
        <EnhancedDashCard title="Upcoming" value={calendarFiltered.filter((e) => e.date && new Date(e.date) >= new Date()).length} icon={<CheckCircle size={24} />} accentColor="#10b981" size={3} />
        <EnhancedDashCard title="Registered" value={calendarFiltered.filter((e) => registeredEvents.includes(e.id)).length} icon={<Users size={24} />} accentColor="#a855f7" size={3} />
        <EnhancedDashCard title="Favourites" value={calendarFiltered.filter((e) => favoriteEvents.includes(e.id)).length} icon={<Heart size={24} />} accentColor="#ef4444" size={3} />
      </DashGrid>

      <div className={`events-data-table ${viewMode === 'calendar' ? 'hide-table' : ''} ${viewMode === 'grid' ? 'grid-mode' : ''}`}>
        <DashGrid cols={12}>
          <DataTable
            columns={viewMode === 'grid' ? gridColumns : listColumns}
            rows={tableRows}
            actions={viewMode === 'list' ? listActions : []}
            searchable={true}
            exportable={false}
            hidePagination={true}
            hideRecordSummary={true}
            pageSize={1000}
            filters={dataTableFilters}
            date={true}
            onApplyFilters={setActiveFilters}
          />
        </DashGrid>

        {toolbarNode && createPortal(
          <div id="view-toggles" className="flex items-center bg-slate-100/80 p-1 rounded-xl gap-1 mx-2 border border-slate-200/50">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#223F74]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><LayoutGrid size={15} strokeWidth={2.5} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#223F74]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><List size={15} strokeWidth={2.5} /></button>
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-[#223F74]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><Calendar size={15} strokeWidth={2.5} /></button>
          </div>,
          toolbarNode
        )}

        {viewMode === 'calendar' && (
          <DashGrid cols={12}>
            <div className="col-span-12 bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden mt-2">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0] bg-slate-50/50">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h2 className="text-lg font-black text-[#223F74] uppercase tracking-wide">{format(currentDate, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 mb-3">
                  {weekDays.map((d) => <div key={d} className="text-center py-2 text-xs font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-3">
                  {calDays.map((day, i) => {
                    const dayEvents = calendarFiltered.filter((e) => isSameDay(new Date(e.date), day.date));
                    const isToday = isSameDay(day.date, new Date());
                    const hasEvents = dayEvents.length > 0;
                    return (
                      <button 
                        key={i} 
                        type="button"
                        onClick={() => {
                          if (dayEvents.length === 1) { setSelectedEvent(dayEvents[0]); setShowDetailModal(true); }
                          else if (dayEvents.length > 1) { setSelectedDayEvents({ date: day.date, events: dayEvents }); setShowDayEventsModal(true); }
                        }}
                        className={`min-h-[120px] p-2 flex flex-col items-start text-left rounded-2xl border-2 transition-all focus:outline-none ${!day.cur ? 'bg-slate-50/50 border-transparent opacity-50 cursor-default' : isToday ? 'border-[#223F74] bg-[#223F74]/5 shadow-sm cursor-default' : hasEvents ? 'border-[#223F74] bg-[#223F74] shadow-md hover:bg-[#1a3360] hover:border-[#1a3360] cursor-pointer' : 'border-slate-100 bg-white hover:border-[#223F74]/30 cursor-default'}`}
                      >
                        <span className={`text-sm font-black flex items-center justify-center w-8 h-8 rounded-xl mb-2 ${!day.cur ? 'text-slate-400' : isToday && !hasEvents ? 'bg-[#223F74] text-white shadow-md' : hasEvents ? 'bg-white/20 text-white shadow-sm' : 'text-slate-700'}`}>
                          {format(day.date, 'd')}
                        </span>
                        <div className="space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar pr-1 w-full">
                          {dayEvents.map((event) => {
                            const isEventToday = isSameDay(new Date(event.date), new Date());
                            const isEventPast = new Date(event.date) < new Date() && !isEventToday;
                            
                            let badgeClass = 'bg-white/10 border-white/20 text-white'; // Upcoming
                            if (isEventPast) badgeClass = 'bg-white/5 border-white/10 text-white/50';
                            else if (isEventToday) badgeClass = 'bg-emerald-400/20 border-emerald-400/40 text-emerald-50';

                            return (
                              <div
                                key={event.id}
                                className={`w-full text-left text-[10px] px-2 py-1.5 rounded-lg font-bold border flex items-start gap-1.5 ${badgeClass}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 mt-1" />
                                <div className="truncate">
                                  {event.time && <span className="opacity-75 mr-1 font-semibold">{event.time}</span>}
                                  {event.title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </DashGrid>
        )}
      </div>

      {showDetailModal && selectedEvent && (
        <EventDetailModal event={selectedEvent} registered={registeredEvents.includes(selectedEvent.id)} favorite={favoriteEvents.includes(selectedEvent.id)} onClose={() => setShowDetailModal(false)} onRegister={(e) => { setShowDetailModal(false); setSelectedEvent(e); setShowRegisterModal(true); }} onUnregister={handleUnregister} onToggleFavorite={toggleFavorite} onPhotoClick={openPhotoLightbox} />
      )}
      {showRegisterModal && selectedEvent && (
        <RegisterModal event={selectedEvent} onConfirm={handleRegisterConfirm} onClose={() => setShowRegisterModal(false)} isLoading={isRegistering} />
      )}
      {showDayEventsModal && selectedDayEvents.events.length > 0 && (
        <DayEventsModal date={selectedDayEvents.date} events={selectedDayEvents.events} onSelectEvent={(e) => { setSelectedEvent(e); setShowDetailModal(true); }} onClose={() => setShowDayEventsModal(false)} />
      )}
      {lightbox.open && (
        <ImageLightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox({ open: false, photos: [], index: 0 })} />
      )}
    </div>
  );
};

export default StudentEvents;
