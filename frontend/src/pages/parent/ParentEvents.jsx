import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Star,
  X,
  Download,
  Trophy,
  Medal,
  CheckCircle2,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
} from "lucide-react";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  Button,
  PanelModal,
} from "../../components/shared/Common_Components";
import {
  fetchParentEvents,
  fetchParentActivities,
  respondToParentEvent,
} from "../../services/parentDashboardApi";

const CARD = "rounded-[24px] border border-[#E7E2DB] bg-white shadow-[0_6px_20px_rgba(0,0,0,.06)]";
const CARD_HOVER = "hover:-translate-y-1 hover:shadow-xl transition-all duration-300";

const ActionTooltip = ({ label, children }) => (
  <div className="relative group/tip flex justify-center">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-2 z-[200] opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 transition-[opacity,transform] duration-150 whitespace-nowrap">
      <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
        {label}
      </div>
      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-[#1a2e3f]" />
    </div>
  </div>
);

const EMPTY_ACTIVITIES = {
  summary: { totalParticipated: 0, awardsWon: 0, upcoming: 0 },
  timeline: [],
  certificates: [],
};

export default function ParentEvents() {
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [activities, setActivities] = useState(EMPTY_ACTIVITIES);
  const [selectedEvent, setSelectedEvent] = useState(null); // for photo gallery
  const [lightboxPhoto, setLightboxPhoto] = useState(null); // for zoomed popup
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rsvpLoading, setRsvpLoading] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const studentId = localStorage.getItem("studentId");

        const [eventsResponse, activitiesResponse] = await Promise.all([
          fetchParentEvents(),
          studentId
            ? fetchParentActivities(studentId)
            : Promise.resolve({ data: EMPTY_ACTIVITIES }),
        ]);

        setEvents(eventsResponse.data || { upcoming: [], past: [] });
        setActivities(activitiesResponse.data || EMPTY_ACTIVITIES);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load events & activities"
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getCategoryColor = (category) => {
    const colors = {
      Academic: { light: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-50 text-blue-700 border-blue-200" },
      Sports: { light: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-50 text-orange-700 border-orange-200" },
      Cultural: { light: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
      Holiday: { light: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      Trip: { light: "bg-teal-50", text: "text-teal-700", badge: "bg-teal-50 text-teal-700 border-teal-200" },
      Workshop: { light: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-200" },
      General: { light: "bg-slate-50", text: "text-slate-600", badge: "bg-slate-50 text-slate-600 border-slate-200" },
      Meeting: { light: "bg-indigo-50", text: "text-indigo-700", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    };
    return colors[category] || colors.General;
  };

  const getEventBannerColor = (category) => {
    return "bg-[#223F74]";
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      Winner: "bg-[#223F74]/10 text-[#223F74] border border-[#223F74]/20",
      "Runner Up": "bg-[#F59B87]/10 text-[#d9725b] border border-[#F59B87]/20",
      Participated: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      Upcoming: "bg-amber-50 text-amber-700 border border-amber-200",
    };
    return colors[status] || "bg-slate-50 text-slate-600 border border-slate-200";
  };

  const handleEventRsvp = async (eventId, response) => {
    if (rsvpLoading[eventId]) return;
    setRsvpLoading((prev) => ({ ...prev, [eventId]: response }));
    try {
      await respondToParentEvent(eventId, response);
      setEvents((prev) => ({
        ...prev,
        upcoming: prev.upcoming.map((event) =>
          event.id === eventId ? { ...event, myRsvp: response } : event
        ),
      }));
    } catch {
      // Keep existing UI state
    } finally {
      setRsvpLoading((prev) => ({ ...prev, [eventId]: null }));
    }
  };

  // --- Photo Gallery Functions ---
  const openPhotoGallery = (event) => {
    setSelectedEvent(event);
    setLightboxPhoto(null);
  };

  const closePhotoGallery = () => {
    setSelectedEvent(null);
    setLightboxPhoto(null);
  };

  const openLightbox = (photoUrl, index) => {
    setLightboxPhoto(photoUrl);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  const navigateLightbox = (direction) => {
    if (!selectedEvent?.photos) return;
    const photos = selectedEvent.photos;
    let newIndex = lightboxIndex + direction;
    if (newIndex < 0) newIndex = photos.length - 1;
    if (newIndex >= photos.length) newIndex = 0;
    setLightboxIndex(newIndex);
    setLightboxPhoto(photos[newIndex]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F8EEE9] flex items-center justify-center shadow-inner">
          <div className="w-6 h-6 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="font-bold text-sm text-slate-400">Loading events & activities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-3xl m-6 border border-rose-100 flex items-center gap-3">
        <X className="w-6 h-6 text-rose-500 flex-shrink-0" />
        <div>
          <p className="font-black text-slate-800 text-base">Error Loading Data</p>
          <p className="text-sm text-rose-600 font-semibold mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left min-h-screen">
      {/* Header */}
      <Heading 
        primaryText="Events " 
        secondaryText="& Activities" 
        size={12} 
        showAnimations={true} 
      />

      {/* ── Activities & Achievements (Summary Stats) ── */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-[#223F74] p-2.5 rounded-xl">
            <Star className="w-5 h-5 text-[#F59B87]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Activities & Achievements</h3>
            <p className="text-slate-400 text-xs mt-0.5">Your child&apos;s participation and awards</p>
          </div>
        </div>

        {/* Activity Stats */}
        <DashGrid cols={12} gap={4} className="mb-8">
          <EnhancedDashCard
            title="Total Participated"
            value={String(activities.summary.totalParticipated)}
            icon={<Trophy size={22} />}
            size={4}
            accentColor="#3B82F6"
          />
          <EnhancedDashCard
            title="Awards Won"
            value={String(activities.summary.awardsWon)}
            icon={<Medal size={22} />}
            size={4}
            accentColor="#10B981"
          />
          <EnhancedDashCard
            title="Upcoming"
            value={String(activities.summary.upcoming)}
            icon={<CalendarRange size={22} />}
            size={4}
            accentColor="#F59E0B"
          />
        </DashGrid>
      </div>

      {/* ── Upcoming Events ── */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">Upcoming Events</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.upcoming.length === 0 ? (
            <div className={`${CARD} p-6 text-slate-400 text-sm md:col-span-2 text-center`}>
              No upcoming events found.
            </div>
          ) : (
            events.upcoming.map((event) => (
              <div key={event.id} className={`${CARD} ${CARD_HOVER} overflow-hidden flex flex-col justify-between`}>
                <div>
                  <div className={`h-1.5 ${getEventBannerColor(event.category)}`} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCategoryColor(event.category).badge}`}>
                        {event.category}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-base mb-2 leading-snug">{event.name}</h4>
                    <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-4 leading-relaxed">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{event.participants}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-auto">
                  {/* RSVP for parent-invited events */}
                  {(() => {
                    const participantsText = (event.participants || "").toLowerCase();
                    const isParentInvited =
                      participantsText.includes("parent") ||
                      participantsText.includes("everyone") ||
                      participantsText.includes("family");

                    return isParentInvited ? (
                      <div className="pt-3">
                        <p className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-wider">
                          Will you attend?
                        </p>
                        <Grid cols={12} gap={2}>
                          <Button
                            text="Yes"
                            onClick={() => handleEventRsvp(event.id, "yes")}
                            variant={event.myRsvp === "yes" ? "success" : "secondary"}
                            icon={<CheckCircle2 size={14} />}
                            size={6}
                            disabled={!!rsvpLoading[event.id]}
                            loading={rsvpLoading[event.id] === "yes"}
                          />
                          <Button
                            text="No"
                            onClick={() => handleEventRsvp(event.id, "no")}
                            variant={event.myRsvp === "no" ? "danger" : "secondary"}
                            icon={<X size={14} />}
                            size={6}
                            disabled={!!rsvpLoading[event.id]}
                            loading={rsvpLoading[event.id] === "no"}
                          />
                        </Grid>
                      </div>
                    ) : (
                      <div className="pt-3">
                        <p className="text-[10px] text-slate-400 font-medium italic text-center bg-slate-50 border border-slate-100 py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          Student Event — No parent RSVP required
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Past Events ── */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">Past Events</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.past.length === 0 ? (
            <div className={`${CARD} p-6 text-slate-400 text-sm md:col-span-3 text-center`}>
              No past events found.
            </div>
          ) : (
            events.past.map((event) => (
              <div key={event.id} className={`${CARD} ${CARD_HOVER} overflow-hidden flex flex-col justify-between`}>
                <div>
                  <div className={`h-2 ${getEventBannerColor(event.category)}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCategoryColor(event.category).badge}`}>
                        {event.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug">{event.name}</h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-4 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.date}</span>
                    </div>
                  </div>
                </div>

                {event.hasPhotos && (
                  <div className="px-6 pb-6 pt-0 mt-auto">
                    <Button
                      text="View Photos"
                      onClick={() => openPhotoGallery(event)}
                      icon={<ImageIcon size={14} />}
                      variant="primary"
                      size={12}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Activities & Achievements Remaining Content ── */}
      <div>
        {/* Activity Timeline */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
            <h4 className="font-bold text-slate-800 text-base">Activity Timeline</h4>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#223F74] to-[#E7E2DB]" />

            <div className="space-y-4">
              {activities.timeline.length === 0 ? (
                <div className={`${CARD} p-5 text-slate-400 text-sm ml-16 text-center`}>
                  No activity history yet.
                </div>
              ) : (
                activities.timeline.map((activity) => (
                  <div key={activity.id} className="relative pl-16">
                    <div
                      className={`absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        activity.status === "Upcoming"
                          ? "border-[#F59B87] bg-white shadow-sm"
                          : "border-[#223F74] bg-[#223F74] shadow-sm"
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          activity.status === "Upcoming" ? "bg-[#F59B87]" : "bg-white"
                        }`}
                      />
                    </div>

                    <div className={`${CARD} ${CARD_HOVER} p-5`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-black text-slate-800 text-sm">{activity.name}</h5>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCategoryColor(activity.category).badge}`}>
                          {activity.category}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusBadgeColor(activity.status)}`}>
                          {activity.status === "Winner" && "🏆 "}{activity.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2.5 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activity.date}</span>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-semibold">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Certificates & Awards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
            <h4 className="font-bold text-slate-800 text-base">Certificates & Awards</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activities.certificates.length === 0 ? (
              <div className={`${CARD} p-6 text-slate-400 text-sm md:col-span-3 text-center`}>
                No certificates available yet.
              </div>
            ) : (
              activities.certificates.map((cert) => (
                <div key={cert.id} className={`${CARD} ${CARD_HOVER} p-6 text-center flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 bg-[#223F74]/10 rounded-2xl flex items-center justify-center border border-[#223F74]/15">
                        {cert.icon === "trophy" && <Trophy className="w-7 h-7 text-[#223F74]" />}
                        {cert.icon === "medal" && <Medal className="w-7 h-7 text-[#223F74]" />}
                        {cert.icon === "star" && <Star className="w-7 h-7 text-[#223F74]" />}
                      </div>
                    </div>
                    <h5 className="font-black text-slate-800 text-sm mb-1">{cert.title}</h5>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{cert.eventName}</p>
                    <div className="flex justify-center items-center gap-1.5 text-[10px] text-slate-400 mb-4 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cert.date}</span>
                    </div>
                  </div>
                  <Button
                    text="Download"
                    icon={<Download className="w-3.5 h-3.5" />}
                    variant="primary"
                    size={12}
                    onClick={() => {
                      // File download placeholder
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- Photo Gallery Modal --- */}
      <PanelModal
        id="photo-gallery-modal"
        title={selectedEvent ? `${selectedEvent.name} — Photos` : "Photo Gallery"}
        size="4xl"
        isVisible={!!selectedEvent}
        onClose={closePhotoGallery}
      >
        {selectedEvent && (
          <div className="p-1">
            {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedEvent.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => openLightbox(photo, idx)}
                    className="relative group cursor-pointer overflow-hidden rounded-2xl border border-[#E7E2DB] aspect-square"
                  >
                    <img
                      src={photo}
                      alt={`${selectedEvent.name} photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No photos were uploaded for this event.</p>
              </div>
            )}
          </div>
        )}
      </PanelModal>

      {/* Lightbox / Zoomed Photo Popup */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev Button */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image */}
          <img
            src={lightboxPhoto}
            alt="Event photo"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-bold">
            {lightboxIndex + 1} / {selectedEvent?.photos?.length || 1}
          </div>
        </div>
      )}
    </div>
  );
}
