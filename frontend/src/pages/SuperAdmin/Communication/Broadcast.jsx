import React, { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Search,
  Clock,
  Plus,
  Trash2,
  Eye,
  Layers,
  Zap,
  Activity,
  MapPin,
  Server,
  BarChart3,
  School,
  Calendar,
  Send,
  Edit3,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Communication APIs
import {
  createNoticeApi,
  deleteNoticeApi,
  getNoticesApi,
  getBranchesApi,
  getNoticeByIdApi,
} from "../../../services/api/communicationApi";

// Events APIs
import {
  createGlobalEventApi,
  deleteGlobalEventApi,
  getGlobalEventsApi,
  updateGlobalEventApi,
  getSchoolsForEventDropdown,
} from "../../../services/api/eventsApi";

// UI Components
import {
  Heading,
  Button,
  DataField,
  SelectField,
  Option,
  PanelModal,
  ModalGrid,
  ModalData,
  DashGrid,
  DashCard,
  DataTable,
  Grid
} from "../../../components/shared/Common_Components";

const getCleanAudienceList = (targetAudience, fallbackTarget) => {
  if (!targetAudience || targetAudience.length === 0) {
    if (!fallbackTarget) return [];
    let clean = fallbackTarget.replace(/\bOnly\b/gi, "").trim();
    if (clean.toLowerCase() === "staff") return ["Admin", "Accountant"];
    return [clean];
  }
  const result = [];
  targetAudience.forEach((aud) => {
    let clean = aud.replace(/\bOnly\b/gi, "").trim();
    if (clean.toLowerCase() === "staff") {
      result.push("Admin");
      result.push("Accountant");
    } else {
      result.push(clean);
    }
  });
  return Array.from(new Set(result.filter(Boolean)));
};

const BroadcastNotices = () => {
  // ─── NOTICES STATE ────────────────────────────────────────────────────────
  const [notices, setNotices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeSearchQuery, setNoticeSearchQuery] = useState("");
  const [newNotice, setNewNotice] = useState({
    title: "",
    message: "",
    schoolId: "",
    targetAudience: [],
  });

  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ─── EVENTS STATE ─────────────────────────────────────────────────────────
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [analyticsEvent, setAnalyticsEvent] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loadingEventsList, setLoadingEventsList] = useState(true);

  const [eventSchools, setEventSchools] = useState([]);
  const [loadingEventSchools, setLoadingEventSchools] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventFormData, setEventFormData] = useState({
    title: "",
    date: "",
    category: "Academic",
    description: "",
    targetSchool: "",
  });

  // ─── NOTICES LOGIC ────────────────────────────────────────────────────────
  const loadNotices = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingNotices(true);
      const response = await getNoticesApi({ limit: 100 });
      setNotices(response?.data?.notices || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load broadcasts");
    } finally {
      setLoadingNotices(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await getBranchesApi();
      setBranches(response?.data?.schools || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load branches");
    }
  };

  useEffect(() => {
    loadNotices();
    loadBranches();
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter(
      (notice) =>
        notice.title.toLowerCase().includes(noticeSearchQuery.toLowerCase()) ||
        notice.message.toLowerCase().includes(noticeSearchQuery.toLowerCase())
    );
  }, [notices, noticeSearchQuery]);

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (submittingNotice) return;
    if (!newNotice.title.trim()) return toast.error("Notice Title is required");
    if (!newNotice.message.trim()) return toast.error("Notice Content is required");
    if (!newNotice.schoolId) return toast.error("Please select a Target Branch");
    if (newNotice.targetAudience.length === 0) return toast.error("Select Audience Target");

    try {
      setSubmittingNotice(true);
      await createNoticeApi({
        title: newNotice.title,
        content: newNotice.message,
        schoolId: newNotice.schoolId,
        targetAudience: newNotice.targetAudience,
      });
      setIsNoticeModalOpen(false);
      setNewNotice({ title: "", message: "", schoolId: "", targetAudience: [] });
      toast.success("Broadcast Published Successfully!");
      await loadNotices({ silent: true });
    } catch (error) {
      toast.error(error?.message || "Failed to publish broadcast");
    } finally {
      setSubmittingNotice(false);
    }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm("Delete this broadcast?")) return;
    try {
      await deleteNoticeApi(id);
      toast.success("Notice removed");
      await loadNotices({ silent: true });
    } catch (error) {
      toast.error(error?.message || "Failed to delete notice");
    }
  };

  const handleViewDetails = async (id) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);
      const response = await getNoticeByIdApi(id);
      setSelectedNotice(response?.data || null);
    } catch (error) {
      toast.error(error?.message || "Failed to load notice details");
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ─── EVENTS LOGIC ─────────────────────────────────────────────────────────
  const loadEventsList = async () => {
    try {
      setLoadingEventsList(true);
      const response = await getGlobalEventsApi({
        search: eventSearchQuery || undefined,
        category: selectedCategory,
      });
      setEvents(response?.data?.events || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load events");
    } finally {
      setLoadingEventsList(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEventsList();
    }, 250);
    return () => clearTimeout(timer);
  }, [eventSearchQuery, selectedCategory]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoadingEventSchools(true);
        const response = await getSchoolsForEventDropdown();
        setEventSchools(response?.data?.schools || []);
      } catch (error) {
        console.error("Failed to load schools for dropdown:", error);
      } finally {
        setLoadingEventSchools(false);
      }
    };
    fetchSchools();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(eventSearchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, eventSearchQuery, selectedCategory]);

  const eventStats = useMemo(
    () => ({
      total: events.length,
      active: events.filter((e) => e.status !== "Draft").length,
      ongoing: events.filter((e) => e.status === "Ongoing").length,
      upcoming: events.filter((e) => new Date(e.date) > new Date()).length,
    }),
    [events]
  );

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingEvent(true);

    try {
      const selectedSchool = eventSchools.find((s) => s._id === eventFormData.targetSchool);
      const payload = {
        title: eventFormData.title,
        scope: eventFormData.targetSchool ? (selectedSchool ? selectedSchool.name : "School Specific") : "All Schools",
        date: eventFormData.date,
        category: eventFormData.category,
        description: eventFormData.description,
        ...(eventFormData.targetSchool ? { targetSchool: eventFormData.targetSchool } : {}),
      };

      if (editingEventId) {
        await updateGlobalEventApi(editingEventId, payload);
        toast.success("Event updated");
      } else {
        await createGlobalEventApi(payload);
        toast.success("Event created");
      }
      await loadEventsList();
      closeEventModal();
    } catch (error) {
      toast.error(error?.message || "Failed to save event");
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const deleteGlobalEvent = async (id) => {
    if (window.confirm("Are you sure you want to remove this global event?")) {
      try {
        await deleteGlobalEventApi(id);
        toast.success("Event deleted");
        await loadEventsList();
      } catch (error) {
        toast.error(error?.message || "Failed to delete event");
      }
    }
  };

  const openEventEditModal = (event) => {
    setEditingEventId(event.id);
    setEventFormData({
      title: event.title,
      date: event.date,
      category: event.category,
      description: event.description,
      targetSchool: event.targetSchool?._id || "",
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEventId(null);
    setEventFormData({
      title: "",
      date: "",
      category: "Academic",
      description: "",
      targetSchool: "",
    });
  };

  const eventTableRows = useMemo(() => {
    return filteredEvents.map((e) => ({
      ...e,
      formattedDate: new Date(e.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      schoolName: e.targetSchool?.name || "All Schools",
    }));
  }, [filteredEvents]);

  return (
    <div className="font-sans flex flex-col gap-6 pb-10">
      <Toaster />

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* HEADER & KPIs */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <Heading
        primaryText="Broadcast Notices & Events"
        showAnimations={true}
        action={
          <div className="flex items-center gap-3">
            <Button
              text="New Event"
              icon={<Calendar size={16} />}
              variant="secondary"
              onClick={() => setShowEventModal(true)}
              size={12}
            />
            <Button
              text="New Broadcast"
              icon={<Megaphone size={16} />}
              variant="primary"
              onClick={() => setIsNoticeModalOpen(true)}
              size={12}
            />
          </div>
        }
      />

      <DashGrid cols={12} gap={4}>
        <DashCard title="Total Events" value={eventStats.total} icon={<Layers size={22} />} accentColor="#3b82f6" size={3} />
        <DashCard title="Active Tasks" value={eventStats.active} icon={<Zap size={22} />} accentColor="#10b981" size={3} />
        <DashCard title="Live Now" value={eventStats.ongoing} icon={<Clock size={22} />} accentColor="#f59e0b" size={3} />
        <DashCard title="Scheduled" value={eventStats.upcoming} icon={<Calendar size={22} />} accentColor="#8b5cf6" size={3} />
      </DashGrid>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. BROADCAST NOTICES SECTION */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] p-6 mt-2">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#F4F7FB] text-[#223F74] flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Recent Notices</h3>
        </div>
          {/* Search bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-4">
            <div className="relative w-full md:max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search past broadcasts..."
                value={noticeSearchQuery}
                onChange={(e) => setNoticeSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-2xl outline-none text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#223F74]/20 transition-all"
              />
            </div>
            <div className="px-4 py-2.5 bg-[#F4F7FB] text-[#223F74] rounded-xl text-xs font-black uppercase tracking-widest border border-[#E2E8F0] self-start md:self-auto">
              Total: {notices.length}
            </div>
          </div>

          {/* Notices list */}
          <div className="space-y-4">
            {loadingNotices ? (
              <div className="text-center py-16 text-gray-400 font-bold">
                Loading broadcasts...
              </div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-5 bg-white border border-[#E7E2DB] rounded-2xl hover:border-[#223F74]/30 hover:shadow-sm transition-all group flex flex-col md:flex-row justify-between items-start gap-5"
                >
                  <div className="flex gap-4 w-full min-w-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#F4F7FB] text-[#223F74]">
                      <Megaphone size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-slate-800 truncate">
                        {notice.title}
                      </h4>
                      <p className="text-gray-500 text-sm font-medium mt-1 leading-relaxed line-clamp-2">
                        {notice.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                          Audience:{" "}
                          {getCleanAudienceList(null, notice.target).join(", ")}
                        </span>
                        <span className="bg-[#F4F7FB] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#223F74] uppercase tracking-wide">
                          Branch: {notice.branch || "All Branches"}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          <Clock size={11} /> {notice.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      onClick={() => handleViewDetails(notice.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F4F7FB] text-[#223F74] hover:bg-[#E2E8F0] transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => deleteNotice(notice.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-100 transition-colors"
                      title="Delete Notice"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400 font-bold border-2 border-dashed border-[#E7E2DB] rounded-2xl">
                No notices found.
              </div>
            )}
          </div>
        </div>

        {/* CREATE NOTICE MODAL */}
        <PanelModal
          id="create-broadcast"
          title="New Broadcast"
          isVisible={isNoticeModalOpen}
          onClose={() => {
            setIsNoticeModalOpen(false);
            setNewNotice({ title: "", message: "", schoolId: "", targetAudience: [] });
          }}
        >
          <form onSubmit={handlePublishNotice} className="flex flex-col gap-5">
            <DataField
              label="Notice Title *"
              id="title"
              value={newNotice.title}
              onChange={(e) =>
                setNewNotice({ ...newNotice, title: e.target.value })
              }
              placeholder="e.g. Holiday Announcement"
            />
            <DataField
              label="Notice Content *"
              id="content"
              type="textarea"
              rows={4}
              value={newNotice.message}
              onChange={(e) =>
                setNewNotice({ ...newNotice, message: e.target.value })
              }
              placeholder="Detailed message..."
            />
            <SelectField
              label="Target Branch *"
              id="branch"
              value={newNotice.schoolId}
              onChange={(e) =>
                setNewNotice({ ...newNotice, schoolId: e.target.value })
              }
              searchable={false}
            >
              <Option value="all" label="All Schools" />
              {branches.map((b) => (
                <Option key={b._id} value={b._id} label={b.name} />
              ))}
            </SelectField>

            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-2 block">
                Audience Target
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "All Users",
                  "Parents",
                  "Students",
                  "Teachers",
                  "Branch Principals",
                  "Accountant",
                  "Admin",
                ].map((aud) => {
                  const isSelected = newNotice.targetAudience.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => {
                        let updated = isSelected
                          ? newNotice.targetAudience.filter((a) => a !== aud)
                          : [
                              ...newNotice.targetAudience.filter(
                                (a) => a !== "All Users"
                              ),
                              aud,
                            ];
                        if (aud === "All Users")
                          updated = isSelected ? [] : ["All Users"];
                        setNewNotice({ ...newNotice, targetAudience: updated });
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-[#223F74] text-[#223F74] bg-[#F4F7FB]"
                          : "border-[#E2E8F0] text-[#6B7280] bg-white hover:border-[#223F74]/40"
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>} {aud}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#E2E8F0]">
              <Button
                text="Cancel"
                variant="ghost"
                size={3}
                onClick={() => setIsNoticeModalOpen(false)}
              />
              <Button
                type="submit"
                text="Publish Notice"
                variant="primary"
                size={5}
                loading={submittingNotice}
              />
            </div>
          </form>
        </PanelModal>

        {/* VIEW NOTICE DETAILS MODAL */}
        <PanelModal
          id="view-broadcast"
          title="Broadcast Details"
          isVisible={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        >
          {loadingDetails ? (
            <div className="text-center py-10 text-gray-400 font-bold">
              Loading...
            </div>
          ) : (
            selectedNotice && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xl font-black text-[#223F74]">
                    {selectedNotice.title}
                  </h4>
                  <p className="p-4 bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#1D1D1F] mt-3 whitespace-pre-wrap leading-relaxed">
                    {selectedNotice.content}
                  </p>
                </div>
                <ModalGrid title="Delivery Info" cols={2}>
                  <ModalData
                    label="Branch"
                    value={selectedNotice.branch || "All Branches"}
                  />
                  <ModalData label="Status" value={selectedNotice.status} />
                  <ModalData
                    label="Published"
                    value={new Date(selectedNotice.createdAt).toLocaleString("en-GB")}
                  />
                </ModalGrid>
                <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <div className="bg-[#223F74] px-4 py-2.5">
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.18em]">
                      Audience Targets
                    </p>
                  </div>
                  <div className="p-4 bg-white flex flex-wrap gap-2">
                    {getCleanAudienceList(
                      selectedNotice.targetAudience,
                      selectedNotice.target
                    ).map((aud) => (
                      <span
                        key={aud}
                        className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#223F74] text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    text="Close"
                    variant="ghost"
                    size={3}
                    onClick={() => setIsDetailsModalOpen(false)}
                  />
                </div>
              </div>
            )
          )}
        </PanelModal>
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. GLOBAL EVENTS SECTION */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Global Events</h3>
        </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {["All", "Academic", "Sports", "Administrative"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? "bg-[#223F74] text-white shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 focus:border-[#223F74] transition-all"
                  />
                </div>
              </div>
            </div>

            <DataTable
              columns={[
                {
                  key: "title",
                  label: "Event Name",
                  render: (val, row) => (
                    <div>
                      <div className="font-bold text-slate-800">{val}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                        {row.category}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "schoolName",
                  label: "Target School",
                  render: (val) => (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit">
                      <School size={14} /> {val}
                    </span>
                  ),
                },
                {
                  key: "formattedDate",
                  label: "Date",
                  render: (val) => (
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" /> {val}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (val) => (
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        val === "Ongoing"
                          ? "bg-emerald-100 text-emerald-700"
                          : val === "Scheduled"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {val}
                    </span>
                  ),
                },
              ]}
              rows={eventTableRows}
              size={12}
              pageSize={10}
              searchable={false}
              actions={[
                {
                  icon: <BarChart3 size={16} />,
                  tooltip: "Analytics Dashboard",
                  variant: "ghost",
                  onClick: (row) => setAnalyticsEvent(row),
                },
                {
                  icon: <Edit3 size={16} />,
                  tooltip: "Edit Event",
                  variant: "secondary",
                  onClick: (row) => openEventEditModal(row),
                },
                {
                  icon: <Trash2 size={16} />,
                  tooltip: "Delete Event",
                  variant: "danger",
                  onClick: (row) => deleteGlobalEvent(row.id),
                },
              ]}
            />
          </div>

        {/* CREATE / EDIT EVENT MODAL */}
        <PanelModal
          isVisible={showEventModal}
          onClose={closeEventModal}
          title={editingEventId ? "Modify Global Event" : "Create Global Event"}
          size="md"
        >
          <form onSubmit={handleEventSubmit} className="space-y-6">
            <Grid cols={12} gap={4}>
              <DataField
                label="Event Name *"
                id="eventTitle"
                value={eventFormData.title}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, title: e.target.value })
                }
                placeholder="e.g. 2026 Innovation Summit"
                size={12}
                required
              />
              <DataField
                label="Execution Date *"
                id="eventDate"
                type="date"
                value={eventFormData.date}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, date: e.target.value })
                }
                size={6}
                required
              />
              <SelectField
                label="Category"
                id="eventCategory"
                value={eventFormData.category}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, category: e.target.value })
                }
                size={6}
              >
                <Option value="Academic" label="Academic" />
                <Option value="Sports" label="Sports" />
                <Option value="Administrative" label="Administrative" />
                <Option value="Holiday" label="Holiday" />
              </SelectField>

              <SelectField
                label="Target School"
                id="eventTargetSchool"
                value={eventFormData.targetSchool}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, targetSchool: e.target.value })
                }
                size={12}
              >
                <Option
                  value=""
                  label={loadingEventSchools ? "Loading schools..." : "All Schools (Global)"}
                />
                {eventSchools.map((s) => (
                  <Option key={s._id} value={s._id} label={s.name} />
                ))}
              </SelectField>

              <DataField
                label="Strategic Description"
                id="eventDescription"
                type="textarea"
                rows={4}
                value={eventFormData.description}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, description: e.target.value })
                }
                placeholder="Provide details on scope, objective, and requirements..."
                size={12}
              />
            </Grid>
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button text="Cancel" variant="ghost" type="button" onClick={closeEventModal} />
              <Button
                text={editingEventId ? "Update Event" : "Create Event"}
                icon={!isLoadingEvent && <Send size={16} />}
                variant="primary"
                type="submit"
                loading={isLoadingEvent}
                disabled={isLoadingEvent}
              />
            </div>
          </form>
        </PanelModal>

        {/* ANALYTICS DASHBOARD MODAL */}
        <PanelModal
          isVisible={!!analyticsEvent}
          onClose={() => setAnalyticsEvent(null)}
          title="Event Deployment Tracker"
          size="3xl"
        >
          {analyticsEvent && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-[#223F74]/10 text-[#223F74] rounded-2xl flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {analyticsEvent.title}
                  </h3>
                  <p className="text-xs font-bold text-[#223F74] uppercase tracking-wider">
                    {analyticsEvent.category} Event
                  </p>
                </div>
              </div>

              <DashGrid cols={3} gap={4}>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Current Status
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {analyticsEvent.status}
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Target Scope
                  </div>
                  <div className="text-xl font-black text-slate-800">
                    {analyticsEvent.targetSchool?.name || "All Schools"}
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Command Origin
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {analyticsEvent.origin || "HQ"}
                  </div>
                </div>
              </DashGrid>

              <ModalGrid title="Deployment Details" cols={2}>
                <ModalData
                  label="Scope"
                  value={analyticsEvent.scope || analyticsEvent.branch || "All Branches"}
                />
                <ModalData
                  label="Target Date"
                  value={new Date(analyticsEvent.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
                <ModalData
                  label="Description"
                  value={analyticsEvent.description || "No description provided."}
                  colSpan={2}
                />
              </ModalGrid>

              <div className="flex justify-end pt-2">
                <Button
                  text="Close Dashboard"
                  variant="ghost"
                  onClick={() => setAnalyticsEvent(null)}
                />
              </div>
            </div>
          )}
        </PanelModal>
    </div>
  );
};


export default BroadcastNotices;