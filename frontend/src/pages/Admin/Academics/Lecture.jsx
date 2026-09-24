import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Clock,
  Users,
  DoorOpen,
  Eye,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  CalendarDays,
} from "lucide-react";

import {
  EnhancedDashCard,
  DashGrid,
  DataTable,
  Modal,
  openModal,
  closeModal,
  DataField,
  Button,
  Option,
  SelectField,
  Grid,
  ModalData,
  ModalGrid,
  ModalProfile,
  Heading,
} from "../../../components/shared/Common_Components";

import Toast from "../../../components/common/Toast";

import {
  getAdminClassesSections,
  getAdminLectures,
  createAdminLecture,
  updateAdminLecture,
  deleteAdminLecture,
  getAdminLectureDashboard,
  getAdminLectureFilterData,
} from "../../../services/api/adminAcademicsApi";

const TYPES = ["Normal", "Practical", "Lab", "Extra", "Revision"];
const STATUSES = ["Scheduled", "Completed", "Cancelled", "Rescheduled"];

const TODAY = new Date().toISOString().split("T")[0];

const getDerivedAcademicYear = () => {
  const today = new Date();
  const currentYearNum = today.getFullYear();
  const isBeforeApril = today.getMonth() < 3;
  const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
  return `${startYear}-${startYear + 1}`;
};

const EMPTY_FORM = {
  academicYear: getDerivedAcademicYear(),
  teacher: "",
  subject: "",
  class: "",
  section: "",
  room: "",
  startTime: "08:00",
  endTime: "08:45",
  type: "Normal",
  status: "Scheduled",
  date: TODAY,
  lectureTitle: "",
  description: "",
};

const calcDuration = (start, end) => {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
};

export default function Lecture({ cache, refreshCache }) {
  const [lectures, setLectures] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    today: 0,
    teachersOccupied: 0,
    roomsOccupied: 0,
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [viewingLecture, setViewingLecture] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [conflictWarning, setConflictWarning] = useState("");
  const [toast, setToast] = useState(null);

  // Filter States
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsLoadingData(true);
        if (refreshCache) {
          await refreshCache();
        }
        return;
      }

      if (cache && !cache.loading && cache.classes && cache.lectures && cache.lectureDashboard && cache.lectureFilters) {
        setAllClasses(cache.classes || []);
        
        const filterData = cache.lectureFilters || {};
        setSubjects(filterData.subjects || []);
        setTeachers(filterData.teachers || []);
        setRooms(filterData.rooms || []);

        const statsData = cache.lectureDashboard || {};
        setDashboardStats({
          total: statsData.total || 0,
          today: statsData.today || 0,
          teachersOccupied: statsData.teachersOccupied || 0,
          roomsOccupied: statsData.roomsOccupied || 0,
        });

        setLectures(cache.lectures || []);
        setIsLoadingData(false);
      } else {
        setIsLoadingData(true);
        const derivedAcademicYear = getDerivedAcademicYear();

        const [classesRes, filterDataRes, dashboardRes, lecturesRes] = await Promise.all([
          getAdminClassesSections({ academicYear: derivedAcademicYear }),
          getAdminLectureFilterData(),
          getAdminLectureDashboard(),
          getAdminLectures(),
        ]);

        const rawClasses = classesRes?.data?.data || classesRes?.data || classesRes || [];
        setAllClasses(Array.isArray(rawClasses) ? rawClasses : []);

        const filterData = filterDataRes?.data || filterDataRes || {};
        setSubjects(filterData.subjects || []);
        setTeachers(filterData.teachers || []);
        setRooms(filterData.rooms || []);

        const statsData = dashboardRes?.data || dashboardRes || {};
        setDashboardStats({
          total: statsData.total || 0,
          today: statsData.today || 0,
          teachersOccupied: statsData.teachersOccupied || 0,
          roomsOccupied: statsData.roomsOccupied || 0,
        });

        const rawLectures = lecturesRes?.data || lecturesRes || [];
        setLectures(Array.isArray(rawLectures) ? rawLectures : []);
        setIsLoadingData(false);
      }
    } catch (error) {
      console.error("Failed to load lectures metadata:", error);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (cache && !cache.loading && cache.classes && cache.lectures && cache.lectureDashboard && cache.lectureFilters) {
      fetchData();
    } else {
      fetchData();
    }
  }, [cache]);

  // Derive unique filters from active lectures list
  const filterClassOptions = useMemo(() => {
    const unique = {};
    lectures.forEach((l) => {
      if (l.classId && l.class) {
        unique[l.classId] = l.class;
      }
    });
    return Object.entries(unique).map(([id, name]) => ({ id, name }));
  }, [lectures]);

  const filterSectionOptions = useMemo(() => {
    const secs = lectures.map((l) => l.section).filter(Boolean);
    return [...new Set(secs)].sort();
  }, [lectures]);

  const filterSubjectOptions = useMemo(() => {
    const unique = {};
    lectures.forEach((l) => {
      if (l.subjectId && l.subject) {
        unique[l.subjectId] = l.subject;
      }
    });
    return Object.entries(unique).map(([id, name]) => ({ id, name }));
  }, [lectures]);

  const filterTeacherOptions = useMemo(() => {
    const unique = {};
    lectures.forEach((l) => {
      if (l.teacherId && l.teacher) {
        unique[l.teacherId] = l.teacher;
      }
    });
    return Object.entries(unique).map(([id, name]) => ({ id, name }));
  }, [lectures]);

  // Filtered rows for DataTable
  const filteredRows = useMemo(() => {
    return lectures
      .filter((l) => {
        if (filterClass && String(l.classId) !== String(filterClass)) return false;
        if (filterSection && String(l.section).toLowerCase() !== String(filterSection).toLowerCase()) return false;
        if (filterSubject && String(l.subjectId) !== String(filterSubject)) return false;
        if (filterTeacher && String(l.teacherId) !== String(filterTeacher)) return false;
        if (filterDate && l.date !== filterDate) return false;
        return true;
      })
      .map((l) => ({
        ...l,
        duration: calcDuration(l.startTime, l.endTime),
      }));
  }, [lectures, filterClass, filterSection, filterSubject, filterTeacher, filterDate]);

  const hasActiveFilters = filterClass || filterSection || filterSubject || filterTeacher || filterDate;

  const resetFilters = () => {
    setFilterClass("");
    setFilterSection("");
    setFilterSubject("");
    setFilterTeacher("");
    setFilterDate("");
  };

  // Form selections lookup
  const availableSections = useMemo(() => {
    if (!formData.class) return [];
    const matchingClass = allClasses.find(
      (c) => String(c.id) === String(formData.class) || String(c._id) === String(formData.class)
    );
    return matchingClass ? matchingClass.sections || [] : [];
  }, [allClasses, formData.class]);

  const handleClassChange = (e) => {
    setFormData((prev) => ({ ...prev, class: e.target.value, section: "" }));
    setErrors((prev) => ({ ...prev, class: undefined }));
    setConflictWarning("");
  };

  const setField = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setConflictWarning("");
  };

  const validate = () => {
    const e = {};
    if (!formData.class) e.class = "Class is required";
    if (!formData.section) e.section = "Section is required";
    if (!formData.subject) e.subject = "Subject is required";
    if (!formData.teacher) e.teacher = "Teacher is required";
    if (!formData.room || !formData.room.trim()) {
      e.room = "Room Number is required";
    } else if (formData.room.trim().length > 50) {
      e.room = "Room Number cannot exceed 50 characters";
    }
    if (!formData.date) e.date = "Date is required";
    if (!formData.startTime) e.startTime = "Start time is required";
    if (!formData.endTime) e.endTime = "End time is required";

    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(":").map(Number);
      const [eh, em] = formData.endTime.split(":").map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        e.endTime = "End Time must be after Start Time";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setConflictWarning("");
    openModal("lecture-modal");
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      academicYear: row.academicYear || getDerivedAcademicYear(),
      class: row.classId,
      section: row.section,
      subject: row.subjectId,
      teacher: row.teacherId,
      room: row.room,
      startTime: row.startTime,
      endTime: row.endTime,
      type: row.type,
      status: row.status,
      date: row.date,
      lectureTitle: row.lectureTitle || "",
      description: row.description || "",
    });
    setErrors({});
    setConflictWarning("");
    openModal("lecture-modal");
  };

  const handleView = (row) => {
    setViewingLecture(row);
    openModal("lecture-view-modal");
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setConflictWarning("");
    try {
      const payload = {
        ...formData,
        room: formData.room.trim(),
      };

      if (editingId) {
        await updateAdminLecture(editingId, payload);
        showToast("Lecture updated successfully");
      } else {
        await createAdminLecture(payload);
        showToast("Lecture scheduled successfully");
      }
      closeModal("lecture-modal");
      fetchData(true);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to save lecture.";
      setConflictWarning(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      await deleteAdminLecture(deleteTarget.id);
      showToast("Lecture deleted successfully");
      closeModal("delete-confirm-modal");
      setDeleteTarget(null);
      fetchData(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete lecture");
    } finally {
      setSaving(false);
    }
  };

  // Data Table Columns
  const columns = [
    {
      key: "lectureId",
      label: "Lecture ID",
      render: (v) => <span className="font-mono font-black text-[#223F74] text-sm">{v}</span>,
    },
    { key: "subject", label: "Subject" },
    { key: "teacher", label: "Teacher" },
    { key: "class", label: "Class" },
    { key: "section", label: "Section", align: "center" },
    { key: "room", label: "Room" },
    {
      key: "date",
      label: "Date",
      render: (v) => <span className="font-mono text-sm font-semibold">{v}</span>,
    },
    {
      key: "startTime",
      label: "Time",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-[#223F74]">
          {row.startTime} - {row.endTime}
        </span>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      align: "center",
      render: (v) => (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-[#F4F7FB] text-[#223F74] font-black text-xs">
          {v}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (v) => {
        const map = {
          Normal: "bg-blue-50 text-blue-700 border border-blue-200",
          Practical: "bg-amber-50 text-[#E0A04B] border border-amber-200",
          Lab: "bg-purple-50 text-purple-750 border border-purple-200",
          Extra: "bg-pink-50 text-pink-700 border border-pink-200",
          Revision: "bg-indigo-50 text-indigo-700 border border-indigo-200",
        };
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[v] || "bg-slate-100 text-slate-650"}`}>
            {v}
          </span>
        );
      },
    },
    { key: "status", label: "Status" },
  ];

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => handleView(row),
    },
    {
      icon: <Pencil size={14} />,
      tooltip: "Edit Lecture",
      variant: "ghost",
      onClick: (row) => handleEdit(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Delete Lecture",
      variant: "danger",
      onClick: (row) => {
        setDeleteTarget(row);
        openModal("delete-confirm-modal");
      },
    },
  ];

  const tableFilters = [
    {
      title: "Type",
      type: "toggle",
      key: "type",
      options: TYPES,
      fn: (row, selected) => selected.includes(row.type),
    },
    {
      title: "Status",
      type: "toggle",
      key: "status",
      options: STATUSES,
      fn: (row, selected) => selected.includes(row.status),
    },
  ];

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      {/* Header Panel */}
      <div className="flex justify-end">
        <Button
          text="Add Lecture"
          onClick={handleAddClick}
          icon={<Plus size={15} />}
          variant="primary"
          size={12}
        />
      </div>

      {/* Dashboard Stats */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Lectures"
          value={String(dashboardStats.total)}
          icon={<BookOpen size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Today's Lectures"
          value={String(dashboardStats.today)}
          icon={<CalendarDays size={20} />}
          accentColor="#223F74"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Teachers Occupied"
          value={String(dashboardStats.teachersOccupied)}
          icon={<Users size={20} />}
          accentColor="#E0A04B"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Rooms Occupied"
          value={String(dashboardStats.roomsOccupied)}
          icon={<DoorOpen size={20} />}
          accentColor="#F59B87"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* Filter Bar */}
      <div className="rounded-[24px] p-5 space-y-4 bg-white border border-slate-200/80 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-[#223F74]">Quick Filters</p>
        <Grid cols={12} gap={4}>
          <SelectField
            label="Class"
            id="filter-class"
            placeholder="All Classes"
            searchable={false}
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            size={2}
          >
            <Option value="" label="All Classes" />
            {filterClassOptions.map((c) => (
              <Option key={c.id} value={c.id} label={c.name} />
            ))}
          </SelectField>

          <SelectField
            label="Section"
            id="filter-section"
            placeholder="All Sections"
            searchable={false}
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            size={2}
          >
            <Option value="" label="All Sections" />
            {filterSectionOptions.map((s) => (
              <Option key={s} value={s} label={`Section ${s}`} />
            ))}
          </SelectField>

          <SelectField
            label="Subject"
            id="filter-subject"
            placeholder="All Subjects"
            searchable={true}
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            size={2}
          >
            <Option value="" label="All Subjects" />
            {filterSubjectOptions.map((s) => (
              <Option key={s.id} value={s.id} label={s.name} />
            ))}
          </SelectField>

          <SelectField
            label="Teacher"
            id="filter-teacher"
            placeholder="All Teachers"
            searchable={true}
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            size={3}
          >
            <Option value="" label="All Teachers" />
            {filterTeacherOptions.map((t) => (
              <Option key={t.id} value={t.id} label={t.name} />
            ))}
          </SelectField>

          <DataField
            label="Date"
            id="filter-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            size={3}
          />
        </Grid>

        {hasActiveFilters && (
          <div className="pt-1">
            <button
              onClick={resetFilters}
              className="text-xs font-black text-[#D66B5F] hover:opacity-80 uppercase tracking-wide transition flex items-center gap-1"
            >
              ✕ Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Lectures Inventory Table */}
      <DataTable
        title="Scheduled Lectures"
        columns={columns}
        rows={filteredRows}
        actions={actions}
        pageSize={8}
        size={12}
        searchable={true}
        filters={tableFilters}
        filterSize="xl"
        exportable={true}
        exportFileName="lectures-schedule-export"
      />

      {/* MODAL: ADD / EDIT LECTURE */}
      <Modal
        id="lecture-modal"
        title={editingId !== null ? "Edit Scheduled Lecture" : "Schedule New Lecture"}
        size="lg"
      >
        <div className="space-y-5 text-left">
          <Grid cols={12} gap={4}>
            {/* Class & Section selection */}
            <SelectField
              label="Class *"
              id="lec-class"
              placeholder="Select Class..."
              searchable={false}
              value={formData.class}
              onChange={handleClassChange}
              size={6}
              error={errors.class}
            >
              {allClasses.map((c) => (
                <Option key={c.id || c._id} value={c.id || c._id} label={c.name} />
              ))}
            </SelectField>

            <SelectField
              label="Section *"
              id="lec-section"
              placeholder="Select Section..."
              searchable={false}
              value={formData.section}
              onChange={setField("section")}
              size={6}
              disabled={!formData.class}
              error={errors.section}
            >
              {availableSections.map((s) => (
                <Option key={s.id || s.name} value={s.name} label={`Section ${s.name}`} />
              ))}
            </SelectField>

            {/* Subject & Teacher */}
            <SelectField
              label="Subject *"
              id="lec-subject"
              placeholder="Select Subject..."
              searchable={true}
              value={formData.subject}
              onChange={setField("subject")}
              size={6}
              error={errors.subject}
            >
              {subjects.map((s) => (
                <Option key={s.id} value={s.id} label={`${s.name} (${s.code})`} />
              ))}
            </SelectField>

            <SelectField
              label="Teacher *"
              id="lec-teacher"
              placeholder="Select Teacher..."
              searchable={true}
              value={formData.teacher}
              onChange={setField("teacher")}
              size={6}
              error={errors.teacher}
            >
              {teachers.map((t) => (
                <Option key={t.id} value={t.id} label={t.name} />
              ))}
            </SelectField>

            {/* Room & Date */}
            <DataField
              label="Room Number *"
              id="lec-room"
              placeholder="e.g. 101, Lab-1, Hall A"
              value={formData.room}
              onChange={setField("room")}
              size={6}
              error={errors.room}
            />

            <DataField
              label="Lecture Date *"
              id="lec-date"
              type="date"
              value={formData.date}
              onChange={setField("date")}
              size={6}
              error={errors.date}
            />

            {/* Times */}
            <DataField
              label="Start Time *"
              id="lec-start-time"
              type="time"
              value={formData.startTime}
              onChange={setField("startTime")}
              size={6}
              error={errors.startTime}
            />

            <DataField
              label="End Time *"
              id="lec-end-time"
              type="time"
              value={formData.endTime}
              onChange={setField("endTime")}
              size={6}
              error={errors.endTime}
            />

            {/* Duration and details */}
            {formData.startTime && formData.endTime && (
              <div className="col-span-12">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#F4F7FB] border border-[#E2E8F0]">
                  <Clock size={15} className="text-[#223F74]" />
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">
                    Duration: {calcDuration(formData.startTime, formData.endTime)}
                  </p>
                </div>
              </div>
            )}

            <DataField
              label="Lecture Title (optional)"
              id="lec-title"
              placeholder="e.g. Intro to Algebra"
              value={formData.lectureTitle}
              onChange={setField("lectureTitle")}
              size={12}
            />

            {/* Type & Status */}
            <SelectField
              label="Lecture Type *"
              id="lec-type"
              placeholder="Select Type..."
              searchable={false}
              value={formData.type}
              onChange={setField("type")}
              size={6}
            >
              {TYPES.map((t) => (
                <Option key={t} value={t} label={t} />
              ))}
            </SelectField>

            <SelectField
              label="Status *"
              id="lec-status"
              placeholder="Select Status..."
              searchable={false}
              value={formData.status}
              onChange={setField("status")}
              size={6}
            >
              {STATUSES.map((s) => (
                <Option key={s} value={s} label={s} />
              ))}
            </SelectField>

            <div className="col-span-12">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 font-sans">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Topic outlines, tasks, or comments..."
                rows="2"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition bg-white"
              />
            </div>
          </Grid>

          {/* Conflict Warning */}
          {conflictWarning && (
            <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 border border-amber-200">
              <AlertCircle className="text-[#E0A04B] flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-black text-amber-700 uppercase tracking-tight">Scheduling Conflict Detected</p>
                <p className="text-xs text-amber-600 font-semibold mt-0.5 leading-relaxed">{conflictWarning}</p>
              </div>
            </div>
          )}

          {/* Validation error summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 p-4 rounded-2xl flex gap-3 border border-red-100">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-[10px] font-black text-red-700 leading-normal uppercase">
                Please fill all required fields correctly before saving.
              </p>
            </div>
          )}

          <Grid cols={12} gap={3} className="pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("lecture-modal")}
              size={4}
            />
            <Button
              text={editingId !== null ? "SAVE CHANGES" : "SCHEDULE LECTURE"}
              variant="primary"
              onClick={handleSave}
              loading={saving}
              size={8}
            />
          </Grid>
        </div>
      </Modal>

      {/* MODAL: VIEW LECTURE DETAILS */}
      {viewingLecture && (
        <Modal id="lecture-view-modal" title="Lecture Details" size="md">
          <div className="space-y-5 text-left">
            <ModalProfile
              name={viewingLecture.lectureTitle || viewingSubject?.lectureTitle || "Scheduled Lecture"}
              subtitle={viewingLecture.lectureId}
              meta={`${viewingLecture.class} · Section ${viewingLecture.section}`}
            />

            <ModalGrid title="Schedule Info" cols={2}>
              <ModalData label="Day" value={viewingLecture.day} />
              <ModalData label="Date" value={viewingLecture.date} />
              <ModalData label="Time" value={`${viewingLecture.startTime} - ${viewingLecture.endTime}`} />
              <ModalData label="Room" value={viewingLecture.room} />
              <ModalData label="Duration" value={calcDuration(viewingLecture.startTime, viewingLecture.endTime)} />
              <ModalData label="Status" value={viewingLecture.status} />
            </ModalGrid>

            <ModalGrid title="Assignment Details" cols={2}>
              <ModalData label="Teacher" value={viewingLecture.teacher} />
              <ModalData label="Subject" value={viewingLecture.subject} />
              <ModalData label="Type" value={viewingLecture.type} />
            </ModalGrid>

            {viewingLecture.description && (
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest font-sans">Description</p>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 leading-relaxed font-medium">
                  {viewingLecture.description}
                </div>
              </div>
            )}

            <Grid cols={12} gap={3} className="pt-2">
              <Button
                text="Close"
                variant="secondary"
                onClick={() => closeModal("lecture-view-modal")}
                size={4}
              />
              <Button
                text="EDIT LECTURE"
                variant="primary"
                icon={<Pencil size={14} />}
                onClick={() => {
                  closeModal("lecture-view-modal");
                  setTimeout(() => handleEdit(viewingLecture), 350);
                }}
                size={8}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <Modal id="delete-confirm-modal" title="Delete Lecture" size="sm">
          <div className="space-y-5 text-left">
            <div className="bg-red-50 p-5 rounded-2xl flex gap-3 border border-red-100">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-sm font-black text-red-700 uppercase tracking-tight">
                  This action is irreversible
                </p>
                <p className="text-xs text-red-500 font-medium mt-1 leading-relaxed">
                  Are you sure you want to permanently delete lecture{" "}
                  <span className="font-black">{deleteTarget.lectureId}</span> —{" "}
                  <span className="font-black">{deleteTarget.subject}</span>? This will cancel the schedule for this time
                  slot.
                </p>
              </div>
            </div>

            <Grid cols={12} gap={3}>
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  closeModal("delete-confirm-modal");
                }}
                size={4}
              />
              <Button
                text="YES, DELETE"
                variant="danger"
                onClick={handleDeleteConfirm}
                loading={saving}
                size={8}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* Shared Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}