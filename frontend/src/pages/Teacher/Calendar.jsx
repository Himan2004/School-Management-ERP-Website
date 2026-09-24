import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  BookOpen,
  GraduationCap,
  FileText,
  Users,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import Card from "../../components/teacher/Card";
import {
  fetchTeacherEvents,
  addTeacherEvent,
  deleteTeacherEvent,
} from "../../features/teacher/teacherCalendarSlice";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");

  // --- NEW MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // Stores the clicked date string (YYYY-MM-DD)
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "class",
    startTime: "",
    endTime: "",
    location: "",
    audience: "",
  });

  const dispatch = useDispatch();

  const { events, loading, error } = useSelector(
    (state) => state.teacherCalendar,
  );

  useEffect(() => {
    dispatch(fetchTeacherEvents());
  }, [dispatch]);

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const getEventIcon = (type) => {
    switch (type) {
      case "class":
        return BookOpen;
      case "exam":
        return GraduationCap;
      case "assignment":
        return FileText;
      case "meeting":
        return Users;
      default:
        return CalendarIcon;
    }
  };

  const getEventTone = (color) => {
    switch (color) {
      case "blue":
        return {
          chip: "border-blue-200 bg-blue-50 text-blue-700",
          dot: "bg-blue-500",
          panel: "bg-blue-50 text-blue-700",
        };
      case "violet":
        return {
          chip: "border-violet-200 bg-violet-50 text-violet-700",
          dot: "bg-violet-500",
          panel: "bg-violet-50 text-violet-700",
        };
      case "rose":
        return {
          chip: "border-rose-200 bg-rose-50 text-rose-700",
          dot: "bg-rose-500",
          panel: "bg-rose-50 text-rose-700",
        };
      case "emerald":
        return {
          chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
          dot: "bg-emerald-500",
          panel: "bg-emerald-50 text-emerald-700",
        };
      case "amber":
        return {
          chip: "border-amber-200 bg-amber-50 text-amber-700",
          dot: "bg-amber-500",
          panel: "bg-amber-50 text-amber-700",
        };
      default:
        return {
          chip: "border-gray-200 bg-gray-50 text-gray-700",
          dot: "bg-gray-400",
          panel: "bg-gray-50 text-gray-700",
        };
    }
  };

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = startOfMonth.getDay();
  const monthLabel = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const safeEvents = events || [];
  const monthEvents = [...safeEvents].sort(
    (left, right) => new Date(left.date) - new Date(right.date),
  );
  const todayEvents = monthEvents.filter(
    (event) => event.date === formatDateKey(today),
  );

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });

  const summaryCards = [
    { label: "Events This Month", value: monthEvents.length },
    {
      label: "Classes Scheduled",
      value: monthEvents.filter((event) => event.type === "class").length,
    },
    {
      label: "Assessment Blocks",
      value: monthEvents.filter(
        (event) => event.type === "assignment" || event.type === "exam",
      ).length,
    },
    {
      label: "Meetings Planned",
      value: monthEvents.filter((event) => event.type === "meeting").length,
    },
  ];

  const shiftMonth = (offset) => {
    setCurrentDate(new Date(currentYear, currentMonth + offset, 1));
  };

  // --- MODAL HANDLERS ---
  const handleDayClick = (dateKey) => {
    setSelectedDate(dateKey);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setNewEvent({
      title: "",
      type: "class",
      startTime: "",
      endTime: "",
      location: "",
      audience: "",
    });
  };

  const handleDeleteEvent = (eventId, eventTitle) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      dispatch(deleteTeacherEvent(eventId));
    }
  };

  // 1. Add 'async' to the function
  const handleAddEventSubmit = async (e) => {
    e.preventDefault();

    // Determine color based on event type for the database
    let assignedColor = "blue";
    if (newEvent.type === "exam") assignedColor = "rose";
    if (newEvent.type === "assignment") assignedColor = "emerald";
    if (newEvent.type === "meeting") assignedColor = "amber";

    const eventPayload = {
      ...newEvent,
      date: selectedDate,
      color: assignedColor,
    };

    try {
      // 2. Add 'await' and '.unwrap()' to ensure the save finishes successfully first
      await dispatch(addTeacherEvent(eventPayload)).unwrap();

      // 3. Immediately trigger a fresh fetch so the UI gets the perfectly formatted data
      dispatch(fetchTeacherEvents());

      // 4. Close the modal and reset the form
      closeModal();
    } catch (error) {
      console.error("Failed to add event:", error);
      // Optional: You could add a toast notification here if it fails!
    }
  };

  const renderMonthView = () => {
    const cells = [];

    for (let index = 0; index < firstDayOfMonth; index += 1) {
      cells.push(
        <div
          key={`empty-${index}`}
          className="min-h-[150px] border border-gray-100 bg-gray-50/70 p-3"
        />,
      );
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(currentYear, currentMonth, day);
      const dateKey = formatDateKey(date);
      const dayEvents = monthEvents.filter((event) => event.date === dateKey);
      const isToday = dateKey === formatDateKey(today);

      cells.push(
        <div
          key={dateKey}
          onClick={() => handleDayClick(dateKey)} // ADDED CLICK HANDLER
          className={`min-h-[150px] border p-3 cursor-pointer transition-colors ${
            isToday
              ? "border-blue-200 bg-blue-50/60 hover:bg-blue-100/50"
              : "border-gray-100 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}
            >
              {day}
            </span>
            {isToday && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Today
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {dayEvents.slice(0, 3).map((event) => {
              const Icon = getEventIcon(event.type);
              const tone = getEventTone(event.color);
              return (
                <div
                  key={event.id}
                  className={`rounded-xl border px-2.5 py-2 text-xs shadow-sm ${tone.chip}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{event.title}</p>
                      <p className="mt-0.5 truncate opacity-80">{event.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {dayEvents.length > 3 && (
              <div className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    return cells;
  };

  if (loading && safeEvents.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-lg font-medium text-gray-500">
          Syncing Schedule...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-lg font-medium text-red-500">
          Failed to load calendar: {error}
        </div>
      </div>
    );
  }

  // Find events for the specifically selected date in the modal
  const selectedDateEvents = selectedDate
    ? monthEvents.filter((ev) => ev.date === selectedDate)
    : [];

  return (
    <div className="space-y-6 relative">
      {/* --- MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {new Date(selectedDate).toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  Manage schedule for this day
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Existing Events */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                  Scheduled Events
                </h4>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const tone = getEventTone(event.color);
                      const Icon = getEventIcon(event.type);

                      // Check if it's a personal event (no global HQ emoji)
                      const isPersonalEvent = !event.title.includes("🏛️");

                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-xl border flex items-center justify-between group ${tone.chip}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm">
                                {event.title}
                              </p>
                              <p className="text-xs mt-1 opacity-80">
                                {event.time} • {event.location}
                              </p>
                            </div>
                          </div>

                          {/* ONLY render the delete button for the Teacher's personal events */}
                          {isPersonalEvent && (
                            <button
                              onClick={() =>
                                handleDeleteEvent(event.id, event.title)
                              }
                              className="p-2 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-500 bg-gray-50">
                    No events scheduled.
                  </div>
                )}
              </div>

              {/* Right Column: Add New Event Form */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add New Event
                </h4>
                <form onSubmit={handleAddEventSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Event Title
                    </label>
                    <input
                      required
                      type="text"
                      value={newEvent.title}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, title: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Grade 10 Math Test"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="class">Class / Lecture</option>
                      <option value="exam">Examination</option>
                      <option value="assignment">Assignment / Deadline</option>
                      <option value="meeting">Meeting / Conference</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        required
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, endTime: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, location: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Room 101"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Audience
                    </label>
                    <input
                      type="text"
                      value={newEvent.audience}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, audience: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Grade 10-A"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Save Event to Calendar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- END MODAL OVERLAY --- */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 max-w-2xl text-gray-500">
            Plan classes, assessments, and meetings with a cleaner month view
            and a focused weekly agenda.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => dispatch(fetchTeacherEvents())}
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <CalendarIcon
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Sync Schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <Card key={item.label}>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {item.value}
                </p>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  index === 0
                    ? "bg-blue-50 text-blue-600"
                    : index === 1
                      ? "bg-violet-50 text-violet-600"
                      : index === 2
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                }`}
              >
                <CalendarIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,0.95fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Academic Planner
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                  {monthLabel}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Structured visibility for instructional and assessment
                  activity. Click any day to manage.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => shiftMonth(-1)}
                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => shiftMonth(1)}
                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center rounded-xl bg-gray-100 p-1">
                  <button
                    onClick={() => setViewMode("month")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "month"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode("week")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "week"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "Classes", color: "blue" },
                { label: "Exams", color: "rose" },
                { label: "Assignments", color: "emerald" },
                { label: "Meetings", color: "amber" },
              ].map((item) => {
                const tone = getEventTone(item.color);
                return (
                  <span
                    key={item.label}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone.chip}`}
                  >
                    <span className={`mr-2 h-2 w-2 rounded-full ${tone.dot}`} />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {viewMode === "month" ? (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                  {weekdayLabels.map((day) => (
                    <div
                      key={day}
                      className="px-3 py-3 text-center text-sm font-semibold text-gray-600"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">{renderMonthView()}</div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {weekDays.map((day) => {
                  const dateKey = formatDateKey(day);
                  const dayEvents = monthEvents.filter(
                    (event) => event.date === dateKey,
                  );
                  const isToday = dateKey === formatDateKey(today);

                  return (
                    <div
                      key={dateKey}
                      onClick={() => handleDayClick(dateKey)}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                            {day.toLocaleDateString("default", {
                              weekday: "long",
                            })}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {day.toLocaleDateString("default", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                        {isToday && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {dayEvents.length > 0 ? (
                          dayEvents.map((event) => {
                            const Icon = getEventIcon(event.type);
                            const tone = getEventTone(event.color);
                            return (
                              <div
                                key={event.id}
                                className={`rounded-2xl p-4 ${tone.panel}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="rounded-xl bg-white/70 p-2">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                      {event.title}
                                    </p>
                                    <div className="mt-2 space-y-1 text-xs opacity-90">
                                      <p className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        {event.time}
                                      </p>
                                      <p className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {event.location}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            No scheduled items for this day. Click to add.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Agenda Feed
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All scheduled items in this month.
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {monthEvents.length} items
                </span>
              </div>

              <div className="space-y-3">
                {monthEvents.length > 0 ? (
                  monthEvents.map((event) => {
                    const Icon = getEventIcon(event.type);
                    const tone = getEventTone(event.color);
                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-gray-100 p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-xl p-2 ${tone.panel}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {event.title}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {event.audience}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}
                              >
                                {event.type}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                              <p className="flex items-center gap-2">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {new Date(event.date).toLocaleDateString()}
                              </p>
                              <p className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {event.time}
                              </p>
                              <p className="flex items-center gap-2 sm:col-span-2">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.location}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    No items on the agenda for this month.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Today at a Glance
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Immediate schedule visibility for the current day.
              </p>
              <div className="mt-5 space-y-3">
                {todayEvents.length > 0 ? (
                  todayEvents.map((event) => {
                    const tone = getEventTone(event.color);
                    return (
                      <div
                        key={event.id}
                        className={`rounded-2xl p-4 ${tone.panel}`}
                      >
                        <p className="font-semibold">{event.title}</p>
                        <p className="mt-2 text-sm opacity-90">{event.time}</p>
                        <p className="mt-1 text-sm opacity-90">
                          {event.location}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    No events scheduled for today.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
