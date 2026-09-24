import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Calendar,
  Users,
  BookOpen,
  DoorOpen,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Filter,
  GraduationCap,
  Copy,
  Download,
  Settings,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Clock,
  Check
} from "lucide-react";

import {
  EnhancedDashCard,
  DashGrid,
  Modal,
  openModal,
  closeModal,
  DataField,
  Button,
  Option,
  SelectField,
  Grid
} from "../../../components/shared/Common_Components";

import Toast from "../../../components/common/Toast";
import AllTimetables from "./AllTimetables";

import {
  getAdminPeriods,
  createAdminPeriod,
  updateAdminPeriod,
  deleteAdminPeriod,
  reorderAdminPeriods,
  duplicateAdminPeriod,
  getAdminTimetables,
  createAdminTimetable,
  updateAdminTimetable,
  deleteAdminTimetable,
  copyAdminTimetable,
  generateAdminTimetableDraft,
  checkAdminTimetableConflicts
} from "../../../services/api/adminAcademicsApi";

// ─── THEME TOKENS ────────────────────────────────────────────────────────────
const NAVY = "#223F74";
const PEACH = "#F59B87";
const BORDER = "#E7E2DB";
const TEXT_MUTED = "#6B7280";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Lecture types with custom HSL-tailored pastel themes
const LECTURE_TYPES = {
  Theory: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", badge: "bg-indigo-100 text-indigo-700" },
  Practical: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", badge: "bg-green-100 text-green-700" },
  Lab: { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4", badge: "bg-teal-100 text-teal-700" },
  Sports: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", badge: "bg-orange-100 text-orange-700" },
  Library: { bg: "#FDF4FF", text: "#9333EA", border: "#E9D5FF", badge: "bg-purple-100 text-purple-700" },
  Exam: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", badge: "bg-rose-100 text-rose-700" },
  Free: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", badge: "bg-slate-100 text-slate-700" },
  Break: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", badge: "bg-amber-100 text-amber-700" }
};

const getLectureColors = (type) => {
  return LECTURE_TYPES[type] || LECTURE_TYPES.Theory;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const matchAmPm = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (matchAmPm) {
    let hours = parseInt(matchAmPm[1], 10);
    const minutes = parseInt(matchAmPm[2], 10);
    const ampm = matchAmPm[3];
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const matchPlain = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (matchPlain) {
    let hours = parseInt(matchPlain[1], 10);
    const minutes = parseInt(matchPlain[2], 10);
    if (hours < 7) {
      hours += 12;
    }
    return hours * 60 + minutes;
  }
  return 0;
};

const normalizeTimetableSlots = (slots) => {
  if (!slots || !Array.isArray(slots)) return [];

  const parsedSlots = slots.map(s => {
    const isBreak = !!(
      s.isBreak ||
      s.type === "break" ||
      s.slotType === "break" ||
      s.periodType === "lunch" ||
      String(s.name || s.breakLabel || s.label || "").toLowerCase().includes("lunch") ||
      String(s.name || s.breakLabel || s.label || "").toLowerCase().includes("break")
    );
    
    return {
      ...s,
      isBreak,
      startMin: parseTimeToMinutes(s.startTime)
    };
  });

  const sorted = [...parsedSlots].sort((a, b) => a.startMin - b.startMin);

  let teachingPeriodNumber = 0;
  return sorted.map(s => {
    if (s.isBreak) {
      return {
        ...s,
        name: s.breakLabel || s.name || "Lunch",
        isBreak: true
      };
    } else {
      teachingPeriodNumber++;
      return {
        ...s,
        name: `Period ${teachingPeriodNumber}`,
        isBreak: false
      };
    }
  });
};

// ─── MEMOIZED PERIOD ROW ──────────────────────────────────────────────────────
const PeriodRow = React.memo(({
  period,
  index,
  totalCount,
  isDuplicating,
  onMove,
  onDuplicate,
  onEdit,
  onDelete
}) => {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-150">
      <td className="px-4 py-3 font-semibold text-slate-500">{period.order || index + 1}</td>
      <td className="px-4 py-3 font-bold text-slate-800">{period.name}</td>
      <td className="px-4 py-3 font-semibold text-slate-500">{period.startTime} – {period.endTime}</td>
      <td className="px-4 py-3">
        {period.isBreak ? (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase">
            Break
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
            Period
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0 || isDuplicating}
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
          >
            <ArrowUp size={14} className="text-slate-500" />
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === totalCount - 1 || isDuplicating}
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
          >
            <ArrowDown size={14} className="text-slate-500" />
          </button>
          <button
            onClick={() => onDuplicate(period._id)}
            disabled={isDuplicating}
            className={`p-1 hover:bg-slate-100 rounded transition duration-200 ${isDuplicating ? "cursor-not-allowed opacity-50" : "text-slate-600 hover:text-green-600"}`}
            title="Duplicate Period"
          >
            {isDuplicating ? <Loader2 size={14} className="animate-spin text-green-600" /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => onEdit(period)}
            disabled={isDuplicating}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 disabled:opacity-30"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(period._id)}
            disabled={isDuplicating}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ─── SEGMENTED TOGGLE ────────────────────────────────────────────────────────
const SegmentedToggle = React.memo(({ value, onChange }) => {
  const options = [
    { key: "classes", label: "Class Weekly View", icon: <GraduationCap size={14} /> },
    { key: "teacher", label: "Teacher Weekly View",  icon: <Users size={14} /> },
    { key: "all", label: "All Timetables",  icon: <Calendar size={14} /> },
  ];
  return (
    <div className="w-full overflow-x-auto whitespace-nowrap scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        className="flex w-max md:w-full p-1 rounded-full gap-1 bg-white border border-slate-200/80"
        style={{ background: "#EEF2FB", border: `1px solid #D8E0F0` }}
      >
        {options.map(opt => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className="flex-shrink-0 md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-tight transition-all duration-300 whitespace-nowrap"
              style={{
                background: active ? NAVY : "transparent",
                color: active ? "#fff" : TEXT_MUTED,
                boxShadow: active ? "0 2px 8px rgba(34,63,116,0.25)" : "none",
                transform: active ? "scale(1.02)" : "scale(1)",
              }}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default function Timetable({ cache, refreshCache }) {
  const [viewMode, setViewMode] = useState("classes"); // "classes" | "teacher"
  const [toast, setToast] = useState(null);

  // Cache configuration sources
  const [allClasses, setAllClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [timetables, setTimetables] = useState([]);

  // Selected filters
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);

  // Timetable schedule draft states
  const [currentTimetable, setCurrentTimetable] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [isDraft, setIsDraft] = useState(false);
  const [isSavingTimetable, setIsSavingTimetable] = useState(false);

  // Drag & drop state
  const [draggedCell, setDraggedCell] = useState(null); // { day, periodSlot }

  // Hover details tooltip
  const [hoveredSlot, setHoveredSlot] = useState(null); // { event, slot, day }

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, day, periodSlot }
  const [copiedSlot, setCopiedSlot] = useState(null);

  // Period timings settings modal state
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({ name: "", startTime: "", endTime: "", isBreak: false });
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);

  // Add/Edit individual cell slot modal state
  const [selectedCell, setSelectedCell] = useState(null); // { day, periodSlot }
  const [cellForm, setCellForm] = useState({ subject: "", teacher: "", room: "", lectureType: "Theory", status: "Active", isBreak: false, breakLabel: "" });
  const [conflictWarning, setConflictWarning] = useState("");
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Copy operations state
  const [copyType, setCopyType] = useState("day"); // "day" | "section"
  const [copyDayForm, setCopyDayForm] = useState({ from: "monday", to: "tuesday" });
  const [copySectionForm, setCopySectionForm] = useState({ toSection: "" });

  // Bulk operations state
  const [bulkType, setBulkType] = useState("replace-teacher"); // "replace-teacher" | "shift-period" | "clear"
  const [bulkForm, setBulkForm] = useState({ fromTeacher: "", toTeacher: "", fromPeriod: "", toPeriod: "" });

  // Deletion state
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  // Sync cache details
  useEffect(() => {
    if (cache && !cache.loading) {
      // 1. Populate academic years list using cache
      const yearsList = cache.academicYears || [];
      setAcademicYears(yearsList);

      // 2. Select default academic year
      if (!academicYear) {
        const currentYr = yearsList.find(y => y.isCurrent);
        if (currentYr) {
          setAcademicYear(currentYr.label);
        } else if (yearsList.length > 0) {
          setAcademicYear(yearsList[0].label);
        }
      }
      
      const sortedClasses = [...(cache.classes || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" })
      );
      setAllClasses(sortedClasses);
      setTeachers(cache.teachers || []);
      setSubjects(cache.subjects || []);
      setPeriods(cache.periods || []);
      setTimetables(cache.timetables || []);

      if (sortedClasses.length > 0 && !filterClass) {
        setFilterClass(sortedClasses[0]._id || sortedClasses[0].id);
        const sections = sortedClasses[0].sections || [];
        if (sections.length > 0) {
          setFilterSection(sections[0].name);
        }
      }
    }
  }, [cache]);

  const availableSections = useMemo(() => {
    if (!filterClass) return [];
    const matchingClass = allClasses.find(
      (c) => String(c.id || c._id) === String(filterClass)
    );
    return matchingClass ? matchingClass.sections || [] : [];
  }, [allClasses, filterClass]);

  // Load schedule based on Class, Section, and Academic Year (only when NOT working on a draft)
  useEffect(() => {
    if (isDraft) return;

    if (filterClass && filterSection && academicYear && timetables.length > 0) {
      // Fetch both Draft and Active Published timetables matching target class/section
      const found = timetables.find(
        (t) =>
          String(t.class?._id || t.class) === String(filterClass) &&
          String(t.section).toLowerCase() === String(filterSection).toLowerCase() &&
          t.academicYear === academicYear
      );
      if (found) {
        setCurrentTimetable(found);
        setSchedule(found.schedule || []);
        setIsDraft(!found.isActive);
      } else {
        setCurrentTimetable(null);
        setSchedule([]);
        setIsDraft(false);
      }
    } else {
      setCurrentTimetable(null);
      setSchedule([]);
      setIsDraft(false);
    }
  }, [filterClass, filterSection, academicYear, timetables, isDraft]);

  // Derive rows (Periods) dynamically to prevent blank grids on template drafts
  const displayPeriods = useMemo(() => {
    let rawPeriods = [];
    if (periods && periods.length > 0) {
      rawPeriods = [...periods];
    } else if (schedule && schedule.length > 0 && schedule[0].periods) {
      rawPeriods = schedule[0].periods.map((p, index) => ({
        _id: p._id || `derived-${index}`,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
        breakLabel: p.breakLabel,
        name: p.isBreak ? (p.breakLabel || "Break") : `Period ${p.periodNumber}`,
        order: p.periodNumber
      }));
    }
    return normalizeTimetableSlots(rawPeriods);
  }, [periods, schedule]);

  // Aggregate schedule for Teacher view
  const teacherScheduleData = useMemo(() => {
    if (viewMode !== "teacher" || !filterTeacher || timetables.length === 0) return [];
    const daySlots = {};
    DAYS.forEach(d => { daySlots[d] = []; });

    timetables.forEach(tt => {
      if (tt.isActive && tt.schedule) {
        tt.schedule.forEach(ds => {
          const dayName = ds.day.toLowerCase();
          if (daySlots[dayName]) {
            ds.periods.forEach(p => {
              const pTeacherId = p.teacher?._id || p.teacher;
              if (pTeacherId && String(pTeacherId) === String(filterTeacher)) {
                daySlots[dayName].push({
                  ...p,
                  className: tt.class?.name || "Unknown",
                  section: tt.section
                });
              }
            });
          }
        });
      }
    });
    return daySlots;
  }, [viewMode, filterTeacher, timetables]);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // Statistics derived indicators
  const stats = useMemo(() => {
    const totalClasses = allClasses.length;
    const published = timetables.filter(t => t.isActive).length;
    let totalLectures = 0;
    const uniqueRooms = new Set();
    const uniqueTeachers = new Set();

    timetables.forEach(t => {
      if (t.isActive && t.schedule) {
        t.schedule.forEach(day => {
          day.periods.forEach(p => {
            if (!p.isBreak && p.subject) {
              totalLectures++;
              if (p.room) uniqueRooms.add(String(p.room).trim().toLowerCase());
              if (p.teacher) uniqueTeachers.add(String(p.teacher?._id || p.teacher));
            }
          });
        });
      }
    });

    return {
      totalClasses,
      totalLectures,
      teachersOccupied: uniqueTeachers.size,
      roomsOccupied: uniqueRooms.size,
      published
    };
  }, [allClasses, timetables]);

  // Live completeness validation stats for the current timetable
  const emptySlotsCount = useMemo(() => {
    if (!schedule || schedule.length === 0) return 0;
    let count = 0;
    schedule.forEach(day => {
      if (!day.isWorkingDay) return;
      day.periods.forEach(p => {
        if (!p.isBreak && (!p.subject || !p.teacher)) {
          count++;
        }
      });
    });
    return count;
  }, [schedule]);

  const totalSlotsCount = useMemo(() => {
    if (!schedule || schedule.length === 0) return 0;
    let count = 0;
    schedule.forEach(day => {
      if (!day.isWorkingDay) return;
      count += day.periods.length;
    });
    return count;
  }, [schedule]);

  const isTimetableComplete = useMemo(() => {
    return emptySlotsCount === 0 && totalSlotsCount > 0;
  }, [emptySlotsCount, totalSlotsCount]);

  // Dynamic filter state handlers
  const handleClassChange = (newClassId) => {
    setFilterClass(newClassId);
    const matchingClass = allClasses.find(
      (c) => String(c.id || c._id) === String(newClassId)
    );
    const sections = matchingClass?.sections || [];
    if (sections.length > 0) {
      setFilterSection(sections[0].name);
    } else {
      setFilterSection("");
    }
    // Clear draft states dynamically
    setSchedule([]);
    setIsDraft(false);
    setCurrentTimetable(null);
  };

  const handleSectionChange = (newSecName) => {
    setFilterSection(newSecName);
    setSchedule([]);
    setIsDraft(false);
    setCurrentTimetable(null);
  };

  // Draft generator
  const handleGenerateDraft = async () => {
    if (!filterClass || !filterSection) {
      showToast("Please select Class and Section first", "error");
      return;
    }
    try {
      const res = await generateAdminTimetableDraft({
        class: filterClass,
        section: filterSection,
        academicYear
      });
      if (res.success && res.data) {
        setSchedule(res.data.schedule || []);
        setIsDraft(true);
        showToast("Editable draft template prepared! Review and save.", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to generate draft", "error");
    }
  };

  // Publish / Save Draft Timetable
  const handleSaveTimetable = async (shouldPublish = false) => {
    if (!schedule || schedule.length === 0) return;
    setIsSavingTimetable(true);
    try {
      const payload = {
        academicYear,
        class: filterClass,
        section: filterSection,
        effectiveFrom: new Date(),
        isActive: shouldPublish,
        schedule: schedule.map(day => ({
          day: day.day,
          isWorkingDay: day.isWorkingDay,
          periods: day.periods.map(p => ({
            periodNumber: p.periodNumber,
            startTime: p.startTime,
            endTime: p.endTime,
            subject: p.subject?._id || p.subject || null,
            teacher: p.teacher?._id || p.teacher || null,
            isBreak: p.isBreak,
            breakLabel: p.breakLabel,
            room: p.room,
            lectureType: p.lectureType || "Theory"
          }))
        }))
      };

      let res;
      if (currentTimetable?._id) {
        res = await updateAdminTimetable(currentTimetable._id, payload);
        showToast(shouldPublish ? "Timetable saved and published successfully!" : "Draft template saved successfully!", "success");
      } else {
        res = await createAdminTimetable(payload);
        showToast(shouldPublish ? "Timetable saved and published successfully!" : "Draft template saved successfully!", "success");
      }

      if (res.success) {
        setIsDraft(!shouldPublish);
        if (refreshCache) await refreshCache();
      }
    } catch (err) {
      showToast(err.message || "Failed to save timetable", "error");
    } finally {
      setIsSavingTimetable(false);
    }
  };

  // Drag & drop support
  const handleDragStart = (e, day, periodSlot) => {
    setDraggedCell({ day, periodSlot });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, targetDay, targetSlot) => {
    e.preventDefault();
    if (!draggedCell) return;
    if (draggedCell.day === targetDay && draggedCell.periodSlot.startTime === targetSlot.startTime) {
      return;
    }

    setIsCheckingConflict(true);
    try {
      const res = await checkAdminTimetableConflicts({
        day: targetDay,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
        teacher: draggedCell.periodSlot.teacher?._id || draggedCell.periodSlot.teacher || undefined,
        room: draggedCell.periodSlot.room || undefined,
        class: filterClass,
        section: filterSection,
        timetableId: currentTimetable?._id || undefined
      });

      if (res.success && res.conflict) {
        showToast(`Conflict detected: ${res.message}`, "error");
        setIsCheckingConflict(false);
        return;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingConflict(false);
    }

    setSchedule(prev => prev.map(day => {
      let updatedPeriods = day.periods;
      // Clear source slot
      if (day.day.toLowerCase() === draggedCell.day.toLowerCase()) {
        updatedPeriods = updatedPeriods.map(p => {
          if (p.startTime === draggedCell.periodSlot.startTime) {
            return {
              ...p,
              subject: null,
              teacher: null,
              room: "",
              lectureType: "Theory",
              isBreak: false
            };
          }
          return p;
        });
      }
      // Populate target slot
      if (day.day.toLowerCase() === targetDay.toLowerCase()) {
        updatedPeriods = updatedPeriods.map(p => {
          if (p.startTime === targetSlot.startTime) {
            return {
              ...p,
              subject: draggedCell.periodSlot.subject,
              teacher: draggedCell.periodSlot.teacher,
              room: draggedCell.periodSlot.room,
              lectureType: draggedCell.periodSlot.lectureType,
              isBreak: draggedCell.periodSlot.isBreak,
              breakLabel: draggedCell.periodSlot.breakLabel
            };
          }
          return p;
        });
      }
      return { ...day, periods: updatedPeriods };
    }));

    setDraggedCell(null);
    showToast("Lecture slot moved successfully!", "success");
  };

  // Right-click context menu helper
  const handleContextMenu = (e, day, periodSlot) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      day,
      periodSlot
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  // Cell Click Opens Form
  const handleCellClick = (day, periodSlot) => {
    if (viewMode !== "classes") return;
    setSelectedCell({ day, periodSlot });
    setConflictWarning("");
    setCellForm({
      subject: periodSlot.subject?._id || periodSlot.subject || "",
      teacher: periodSlot.teacher?._id || periodSlot.teacher || "",
      room: periodSlot.room || "",
      lectureType: periodSlot.lectureType || "Theory",
      status: periodSlot.status || "Active",
      isBreak: !!periodSlot.isBreak,
      breakLabel: periodSlot.breakLabel || ""
    });
    openModal("cell-modal");
  };

  // Dynamic conflict check
  useEffect(() => {
    if (!selectedCell) return;
    const checkConflict = async () => {
      if (!cellForm.teacher && !cellForm.room) {
        setConflictWarning("");
        return;
      }
      setIsCheckingConflict(true);
      try {
        const res = await checkAdminTimetableConflicts({
          day: selectedCell.day,
          startTime: selectedCell.periodSlot.startTime,
          endTime: selectedCell.periodSlot.endTime,
          teacher: cellForm.teacher || undefined,
          room: cellForm.room || undefined,
          class: filterClass,
          section: filterSection,
          timetableId: currentTimetable?._id || undefined
        });
        if (res.success && res.conflict) {
          setConflictWarning(res.message);
        } else {
          setConflictWarning("");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingConflict(false);
      }
    };
    const timer = setTimeout(checkConflict, 400);
    return () => clearTimeout(timer);
  }, [cellForm.teacher, cellForm.room, selectedCell]);

  const handleSaveCell = () => {
    if (!selectedCell) return;
    if (conflictWarning) {
      showToast(conflictWarning, "error");
      return;
    }
    const updatedSubject = subjects.find(s => String(s._id) === String(cellForm.subject));
    const updatedTeacher = teachers.find(t => String(t._id) === String(cellForm.teacher));

    setSchedule(prev => prev.map(day => {
      if (day.day.toLowerCase() === selectedCell.day.toLowerCase()) {
        return {
          ...day,
          periods: day.periods.map(p => {
            if (p.startTime === selectedCell.periodSlot.startTime && p.endTime === selectedCell.periodSlot.endTime) {
              return {
                ...p,
                subject: updatedSubject || null,
                teacher: updatedTeacher || null,
                room: cellForm.room,
                lectureType: cellForm.lectureType,
                status: cellForm.status,
                isBreak: cellForm.isBreak,
                breakLabel: cellForm.breakLabel
              };
            }
            return p;
          })
        };
      }
      return day;
    }));
    closeModal("cell-modal");
    showToast("Slot updated inside current draft grid", "success");
  };

  const handleClearCell = () => {
    const cell = selectedCell || contextMenu;
    if (!cell) return;
    setSchedule(prev => prev.map(day => {
      if (day.day.toLowerCase() === cell.day.toLowerCase()) {
        return {
          ...day,
          periods: day.periods.map(p => {
            if (p.startTime === cell.periodSlot.startTime && p.endTime === cell.periodSlot.endTime) {
              return {
                ...p,
                subject: null,
                teacher: null,
                room: "",
                lectureType: "Theory",
                breakLabel: p.isBreak ? p.breakLabel : ""
              };
            }
            return p;
          })
        };
      }
      return day;
    }));
    closeModal("cell-modal");
    setContextMenu(null);
    showToast("Slot cleared", "info");
  };

  const handleResetTimetable = async () => {
    setIsResetting(true);
    try {
      const clearedSchedule = schedule.map(day => ({
        ...day,
        periods: day.periods.map(p => ({
          ...p,
          subject: null,
          teacher: null,
          room: "",
          lectureType: "Theory"
        }))
      }));

      const payload = {
        academicYear,
        class: filterClass,
        section: filterSection,
        effectiveFrom: new Date(),
        isActive: false, // reset back to draft
        schedule: clearedSchedule.map(day => ({
          day: day.day,
          isWorkingDay: day.isWorkingDay,
          periods: day.periods.map(p => ({
            periodNumber: p.periodNumber,
            startTime: p.startTime,
            endTime: p.endTime,
            subject: null,
            teacher: null,
            isBreak: p.isBreak,
            breakLabel: p.breakLabel,
            room: "",
            lectureType: "Theory"
          }))
        }))
      };

      if (currentTimetable?._id) {
        await updateAdminTimetable(currentTimetable._id, payload);
      } else {
        await createAdminTimetable(payload);
      }

      setSchedule(clearedSchedule);
      setIsDraft(true);
      showToast("Timetable has been reset successfully.", "success");
      closeModal("reset-timetable-modal");
      if (refreshCache) await refreshCache();
    } catch (err) {
      showToast(err.message || "Failed to reset timetable", "error");
    } finally {
      setIsResetting(false);
    }
  };

  // Copy operations
  const handleExecuteCopy = async () => {
    if (copyType === "day") {
      const sourceDay = schedule.find(d => d.day.toLowerCase() === copyDayForm.from.toLowerCase());
      if (!sourceDay) return;
      setSchedule(prev => prev.map(d => {
        if (d.day.toLowerCase() === copyDayForm.to.toLowerCase()) {
          return {
            ...d,
            isWorkingDay: sourceDay.isWorkingDay,
            periods: sourceDay.periods.map(p => ({ ...p, _id: undefined }))
          };
        }
        return d;
      }));
      closeModal("copy-modal");
      showToast(`Copied ${capitalize(copyDayForm.from)} schedule to ${capitalize(copyDayForm.to)}!`, "success");
    } else {
      if (!currentTimetable) {
        showToast("Please publish this timetable first before copying to sections", "error");
        return;
      }
      if (!copySectionForm.toSection) {
        showToast("Please specify the destination section", "error");
        return;
      }
      try {
        await copyAdminTimetable({
          fromClassId: filterClass,
          fromSection: filterSection,
          toClassId: filterClass,
          toSection: copySectionForm.toSection,
          academicYear
        });
        showToast(`Copied successfully to Section ${copySectionForm.toSection}!`, "success");
        closeModal("copy-modal");
        if (refreshCache) await refreshCache();
      } catch (err) {
        showToast(err.message || "Failed to copy timetable", "error");
      }
    }
  };

  // Bulk operations
  const handleExecuteBulk = () => {
    if (bulkType === "replace-teacher") {
      if (!bulkForm.fromTeacher || !bulkForm.toTeacher) {
        showToast("Please select both teachers", "error");
        return;
      }
      const repl = teachers.find(t => String(t._id) === String(bulkForm.toTeacher));
      setSchedule(prev => prev.map(d => ({
        ...d,
        periods: d.periods.map(p => {
          if (p.teacher && String(p.teacher?._id || p.teacher) === String(bulkForm.fromTeacher)) {
            return { ...p, teacher: repl || null };
          }
          return p;
        })
      })));
      showToast("Teacher replaced in all slots", "success");
    } else if (bulkType === "shift-period") {
      if (bulkForm.fromPeriod === "" || bulkForm.toPeriod === "") {
        showToast("Please specify both periods", "error");
        return;
      }
      setSchedule(prev => prev.map(d => {
        const fromIdx = d.periods.findIndex(p => p.periodNumber === Number(bulkForm.fromPeriod));
        const toIdx = d.periods.findIndex(p => p.periodNumber === Number(bulkForm.toPeriod));
        if (fromIdx !== -1 && toIdx !== -1) {
          const updated = [...d.periods];
          const temp = { ...updated[fromIdx] };
          updated[fromIdx] = {
            ...updated[fromIdx],
            subject: updated[toIdx].subject,
            teacher: updated[toIdx].teacher,
            room: updated[toIdx].room,
            lectureType: updated[toIdx].lectureType
          };
          updated[toIdx] = {
            ...updated[toIdx],
            subject: temp.subject,
            teacher: temp.teacher,
            room: temp.room,
            lectureType: temp.lectureType
          };
          return { ...d, periods: updated };
        }
        return d;
      }));
      showToast("Periods shifted successfully", "success");
    } else {
      setSchedule(prev => prev.map(d => ({
        ...d,
        periods: d.periods.map(p => ({
          ...p,
          subject: null,
          teacher: null,
          room: "",
          lectureType: "Theory"
        }))
      })));
      showToast("Timetable draft cleared", "info");
    }
    closeModal("bulk-modal");
  };

  // Period timing settings CRUD
  const handleSavePeriod = async () => {
    if (!periodForm.name || !periodForm.startTime || !periodForm.endTime) {
      showToast("Fill in all period timing details", "error");
      return;
    }
    setIsSavingPeriod(true);
    try {
      if (editingPeriod?._id) {
        await updateAdminPeriod(editingPeriod._id, periodForm);
        showToast("Period updated successfully!", "success");
      } else {
        await createAdminPeriod(periodForm);
        showToast("Period created successfully!", "success");
      }
      setEditingPeriod(null);
      setPeriodForm({ name: "", startTime: "", endTime: "", isBreak: false });
      if (refreshCache) await refreshCache();
    } catch (err) {
      showToast(err.message || "Failed to save period slot", "error");
    } finally {
      setIsSavingPeriod(false);
    }
  };

  const handleEditPeriodClick = (p) => {
    setEditingPeriod(p);
    setPeriodForm({
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      isBreak: !!p.isBreak
    });
  };

  const handleDeletePeriodClick = async (pId) => {
    if (!window.confirm("Are you sure you want to delete this period timing slot?")) return;
    try {
      await deleteAdminPeriod(pId);
      showToast("Period timing deleted", "success");
      if (refreshCache) await refreshCache();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to delete period slot";
      showToast(errMsg, "error");
    }
  };

  const handleDuplicatePeriodClick = async (pId) => {
    const currentList = [...periods].sort((a, b) => a.order - b.order);
    const selected = currentList.find(p => String(p._id) === String(pId));
    if (!selected) return;

    const parseTimeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const formatMinutesToTime = (totalMinutes) => {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    const startMin = parseTimeToMinutes(selected.startTime);
    const endMin = parseTimeToMinutes(selected.endTime);
    const duration = (endMin - startMin > 0) ? (endMin - startMin) : 60;

    const dupStartMin = endMin;
    const dupEndMin = dupStartMin + duration;

    if (dupEndMin > 1439) {
      showToast("Cannot duplicate. Day timing exceeded.", "error");
      return;
    }

    const idx = currentList.findIndex(p => String(p._id) === String(pId));
    const tempId = `temp-duplicate-${Date.now()}`;
    const newPeriod = {
      _id: tempId,
      organization: selected.organization,
      school: selected.school,
      name: selected.isBreak ? selected.name : "Duplicate Period Temp",
      startTime: formatMinutesToTime(dupStartMin),
      endTime: formatMinutesToTime(dupEndMin),
      isBreak: selected.isBreak,
      isActive: selected.isActive,
      order: selected.order + 1,
      isOptimistic: true
    };

    const optimisticList = [...currentList];
    optimisticList.splice(idx + 1, 0, newPeriod);

    let nonBreakCount = 1;
    let limitExceeded = false;

    for (let i = 0; i < optimisticList.length; i++) {
      const curr = { ...optimisticList[i] };
      curr.order = i + 1;

      if (!curr.isBreak) {
        curr.name = `Period ${nonBreakCount}`;
        nonBreakCount++;
      }

      if (i > idx) {
        const prev = optimisticList[i - 1];
        const prevEnd = parseTimeToMinutes(prev.endTime);
        const currStart = parseTimeToMinutes(curr.startTime);
        const currEnd = parseTimeToMinutes(curr.endTime);
        const currDuration = (currEnd - currStart > 0) ? (currEnd - currStart) : 60;

        if (currStart < prevEnd) {
          const newStart = prevEnd;
          const newEnd = newStart + currDuration;
          if (newEnd > 1439) {
            limitExceeded = true;
            break;
          }
          curr.startTime = formatMinutesToTime(newStart);
          curr.endTime = formatMinutesToTime(newEnd);
        }
      }
      optimisticList[i] = curr;
    }

    if (limitExceeded) {
      showToast("Cannot duplicate. Day timing exceeded.", "error");
      return;
    }

    setPeriods(optimisticList);
    setDuplicatingId(pId);

    try {
      const res = await duplicateAdminPeriod(pId);
      if (res.success && res.data) {
        const sortedRes = [...res.data].sort((a, b) => a.order - b.order);
        setPeriods(sortedRes);
        if (refreshCache) {
          refreshCache({ type: "periods", data: sortedRes });
        }
        showToast("Period duplicated successfully!", "success");
      } else {
        throw new Error(res.message || "Invalid response");
      }
    } catch (err) {
      setPeriods(currentList);
      showToast(err.message || "Failed to duplicate period.", "error");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleMovePeriod = async (index, direction) => {
    const sorted = [...periods].sort((a, b) => a.order - b.order);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = temp;

    try {
      const orders = sorted.map(p => ({ id: p._id, order: p.order }));
      await reorderAdminPeriods(orders);
      if (refreshCache) await refreshCache();
    } catch (err) {
      showToast("Failed to reorder periods", "error");
    }
  };

  // CSV Spreadsheet Export
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headerRow = ["Day", ...displayPeriods.map(p => `"${p.name} (${p.startTime}-${p.endTime})"` )];
    csvContent += headerRow.join(",") + "\n";

    DAYS.forEach(day => {
      const row = [capitalize(day)];
      displayPeriods.forEach(p => {
        let cellText = "Empty";
        if (viewMode === "classes") {
          const ds = schedule.find(d => d.day.toLowerCase() === day.toLowerCase());
          const slot = ds?.periods.find(ps => ps.startTime === p.startTime);
          if (slot?.isBreak) {
            cellText = `Break: ${slot.breakLabel || "Lunch"}`;
          } else if (slot?.subject) {
            cellText = `${slot.subject.subjectName || slot.subject.name || "Subject"} (${slot.teacher?.name || "TBA"}) Room ${slot.room || "TBA"}`;
          }
        } else {
          const slot = teacherScheduleData[day.toLowerCase()]?.find(ps => ps.startTime === p.startTime);
          if (slot) {
            cellText = `${slot.subject?.subjectName || "Subject"} in Class ${slot.className} Section ${slot.section} Room ${slot.room || "TBA"}`;
          }
        }
        row.push(`"${cellText}"`);
      });
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timetable_${viewMode === "classes" ? `${filterClass}_${filterSection}` : filterTeacher}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Timetable exported as CSV!", "success");
  };

  return (
    <div className="w-full space-y-6 text-left relative">
      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar: Toggle + Actions ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 w-full">
        <SegmentedToggle value={viewMode} onChange={setViewMode} />

        {viewMode === "classes" && (
          <div className="flex flex-wrap items-center justify-end gap-3 w-full animate-in fade-in duration-200">
            <button
              onClick={() => openModal("periods-modal")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-tight transition-all hover:-translate-y-0.5 active:scale-95 border bg-white border-slate-200/80 text-[#223F74] shadow-sm"
            >
              <Settings size={15} /> Configure Periods
            </button>
            
            <button
              onClick={handleGenerateDraft}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-tight transition-all hover:-translate-y-0.5 active:scale-95 shadow-md"
              style={{ background: PEACH, color: "#fff", boxShadow: `0 4px 14px ${PEACH}55` }}
            >
              <Calendar size={15} /> {schedule.length > 0 ? "Re-Generate Template" : "Generate Template"}
            </button>

            {schedule.length > 0 && (
              <button
                onClick={() => handleSaveTimetable(false)}
                disabled={isSavingTimetable}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-[#223F74] rounded-full font-black text-xs uppercase tracking-tight transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm animate-in fade-in duration-200"
              >
                {isSavingTimetable ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
                Save Draft
              </button>
            )}
          </div>
        )}
      </div>

      <div className={viewMode === "all" ? "block" : "hidden"}>
        <AllTimetables
          allClasses={allClasses}
          academicYears={academicYears}
          teachers={teachers}
          showToast={showToast}
          setViewMode={setViewMode}
          periods={periods}
        />
      </div>

      <div className={viewMode !== "all" ? "block space-y-6" : "hidden"}>
          {/* ── STAT CARDS ───────────────────────────────────────────────────────── */}
          <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Published Timetables"
          value={String(stats.published)}
          icon={<BookOpen size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Total Lectures"
          value={String(stats.totalLectures)}
          icon={<Calendar size={20} />}
          accentColor="#E0A04B"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Teachers Occupied"
          value={String(stats.teachersOccupied)}
          icon={<Users size={20} />}
          accentColor="#5B9A6A"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Rooms Occupied"
          value={String(stats.roomsOccupied)}
          icon={<DoorOpen size={20} />}
          accentColor="#D66B5F"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* ── FILTERS ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-[24px] p-5 bg-white border border-slate-200 shadow-sm"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} style={{ color: NAVY }} />
          <span className="text-sm font-black uppercase tracking-widest text-[#223F74]">Filters</span>
        </div>

        {viewMode === "classes" && (
          <Grid cols={12} gap={4}>
            <SelectField
              label="Class"
              id="filter-class"
              value={filterClass}
              onChange={(e) => handleClassChange(e.target.value)}
              placeholder="Select Class..."
              size={4}
            >
              {allClasses.map((cls) => (
                <Option key={cls._id || cls.id} value={cls._id || cls.id} label={cls.name} />
              ))}
            </SelectField>

            <SelectField
              label="Section"
              id="filter-section"
              value={filterSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              placeholder="Select Section..."
              size={4}
            >
              {availableSections.map((sec) => (
                <Option key={sec.name} value={sec.name} label={sec.name} />
              ))}
            </SelectField>

            <SelectField
              label="Academic Year"
              id="filter-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="Select Year..."
              size={4}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>
          </Grid>
        )}

        {viewMode === "teacher" && (
          <Grid cols={12} gap={4}>
            <SelectField
              label="Teacher"
              id="filter-teacher"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              placeholder="Select Teacher..."
              size={8}
            >
              {teachers.map((t) => (
                <Option key={t._id} value={t._id} label={t.name} />
              ))}
            </SelectField>

            <SelectField
              label="Academic Year"
              id="filter-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="Select Year..."
              size={4}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>
          </Grid>
        )}
      </div>

      {/* ── ACTIONS CONTROLS BAR ─────────────────────────────────────────────── */}
      {viewMode === "classes" && schedule.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#EEF2FB] px-6 py-3.5 rounded-[20px] border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
            <p className="text-xs font-black uppercase text-[#223F74] tracking-wide">
              {isDraft ? "Draft Grid Active" : "Published grid loaded"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCopyType("day");
                openModal("copy-modal");
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition shadow-sm"
            >
              <Copy size={13} /> Copy Day
            </button>
            <button
              onClick={() => {
                setCopyType("section");
                openModal("copy-modal");
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition shadow-sm"
            >
              <Copy size={13} /> Copy Section
            </button>
            <button
              onClick={() => openModal("bulk-modal")}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw size={13} /> Bulk Actions
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition shadow-sm"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={() => openModal("reset-timetable-modal")}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase border border-red-100 hover:bg-red-100 transition shadow-sm"
            >
              <Trash2 size={13} /> Reset Timetable
            </button>
          </div>
        </div>
      )}

      {viewMode === "teacher" && filterTeacher && (
        <div className="flex items-center justify-between bg-[#EEF2FB] px-6 py-3.5 rounded-[20px] border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
          <p className="text-xs font-black uppercase text-[#223F74] tracking-wide">
            Weekly slots aggregate load for chosen teacher
          </p>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl font-bold text-xs uppercase border hover:bg-slate-50 transition shadow-sm"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      )}

      {/* ── TIMETABLE GRID ───────────────────────────────────────────────────── */}
      <div
        className="rounded-[24px] overflow-hidden bg-white border border-slate-200 shadow-sm relative"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="overflow-x-auto">
          {displayPeriods.length === 0 && schedule.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <AlertCircle className="mx-auto text-slate-400" size={36} />
              <p className="text-sm font-semibold text-slate-500">No period slots configured yet.</p>
              <button
                onClick={() => openModal("periods-modal")}
                className="px-4 py-2 bg-[#223F74] text-white text-xs font-black uppercase rounded-full hover:opacity-90"
              >
                Configure Period Timings
              </button>
            </div>
          ) : schedule.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Calendar className="mx-auto text-slate-400 animate-pulse" size={36} />
              <p className="text-sm font-semibold text-slate-500">No timetable template found.</p>
              <button
                onClick={handleGenerateDraft}
                className="px-5 py-2.5 bg-[#223F74] text-white text-xs font-black uppercase rounded-full hover:opacity-90 shadow-md"
              >
                {viewMode === "teacher" ? "See Teacher's Timetable" : "Generate Template"}
              </button>
            </div>
          ) : (
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40"
                    style={{ background: NAVY, color: "#fff" }}
                  >
                    Period / Time
                  </th>
                  {DAYS.map(day => (
                    <th
                      key={day}
                      className="py-4.5 px-3 text-center text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap"
                      style={{ background: NAVY, color: "#fff" }}
                    >
                      {capitalize(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayPeriods.map((period, pi) => (
                  <tr key={period._id} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    {/* Timing details */}
                    <td
                      className="py-4.5 px-4 border-b border-r whitespace-nowrap"
                      style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
                    >
                      <p className="text-xs font-black" style={{ color: NAVY }}>{period.name}</p>
                      <p className="text-[10px] font-semibold mt-0.5 text-slate-400">{period.startTime} – {period.endTime}</p>
                      {period.isBreak && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                          Break
                        </span>
                      )}
                    </td>

                    {/* Working days schedule grid */}
                    {DAYS.map(day => {
                      let cellText = null;
                      let colors = { bg: "transparent", text: NAVY, border: "transparent" };
                      let clickHandler = null;
                      let isDrag = false;
                      let currentSlot = null;

                      if (viewMode === "classes") {
                        const ds = schedule.find(d => d.day.toLowerCase() === day.toLowerCase());
                        const slot = ds?.periods.find(ps => ps.startTime === period.startTime);
                        currentSlot = slot || { startTime: period.startTime, endTime: period.endTime, periodNumber: period.order, isBreak: period.isBreak, breakLabel: period.isBreak ? period.name : "" };
                        clickHandler = () => handleCellClick(day, currentSlot);

                        if (slot) {
                          if (slot.isBreak) {
                            cellText = (
                              <div className="text-center py-2.5">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                  <Clock size={12} /> {slot.breakLabel || "Break"}
                                </p>
                              </div>
                            );
                            colors = getLectureColors("Break");
                          } else if (slot.subject) {
                            colors = getLectureColors(slot.lectureType || "Theory");
                            isDrag = true;
                            cellText = (
                              <div className="space-y-1.5 text-left">
                                <div className="flex justify-between items-start gap-1">
                                  <p className="text-xs font-black truncate">{slot.subject.subjectName || slot.subject.name || "Subject"}</p>
                                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                    {slot.lectureType || "Theory"}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-600/90 truncate flex items-center gap-1">
                                  <Users size={11} className="text-slate-400" /> {slot.teacher?.name || "TBA"}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <DoorOpen size={11} className="text-slate-355" /> Room {slot.room || "TBA"}
                                </p>
                              </div>
                            );
                          }
                        }
                      } else {
                        // Teacher aggregates view
                        const slots = teacherScheduleData[day.toLowerCase()] || [];
                        const slot = slots.find(s => s.startTime === period.startTime);
                        if (slot) {
                          colors = getLectureColors(slot.lectureType || "Theory");
                          cellText = (
                            <div className="space-y-1 text-left">
                              <p className="text-xs font-black truncate">{slot.subject?.subjectName || "Subject"}</p>
                              <p className="text-[10px] font-extrabold text-slate-600 truncate flex items-center gap-1">
                                <GraduationCap size={11} className="text-slate-400" /> {slot.className} - {slot.section}
                              </p>
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <DoorOpen size={11} className="text-slate-355" /> Room {slot.room || "TBA"}
                                </span>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                  {slot.lectureType || "Theory"}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      }

                      return (
                        <td
                          key={day}
                          className="py-2.5 px-2 border-b border-r select-none transition-colors duration-150"
                          style={{ borderColor: "#E2E8F0", verticalAlign: "top", minWidth: 140 }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, day, currentSlot)}
                        >
                          {cellText ? (
                            <div
                              draggable={isDrag}
                              onDragStart={(e) => handleDragStart(e, day, currentSlot)}
                              onClick={clickHandler}
                              onDoubleClick={clickHandler}
                              onContextMenu={(e) => handleContextMenu(e, day, currentSlot)}
                              onMouseEnter={(e) => {
                                if (currentSlot?.subject) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredSlot({
                                    x: rect.left,
                                    y: rect.bottom + window.scrollY,
                                    slot: currentSlot,
                                    day
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredSlot(null)}
                              className="rounded-2xl p-3 border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative group bg-white hover:z-10"
                              style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.text }}
                            >
                              {cellText}
                            </div>
                          ) : (
                            viewMode === "classes" && (
                              <div
                                onClick={clickHandler}
                                onDoubleClick={clickHandler}
                                onContextMenu={(e) => handleContextMenu(e, day, currentSlot)}
                                className="rounded-2xl min-h-[82px] flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-200/70 hover:border-[#223F74]/60 hover:bg-slate-50 transition-all duration-200 group gap-1.5"
                              >
                                <Plus size={16} className="text-slate-400 group-hover:text-[#223F74] transition" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#223F74] transition">
                                  Add Lecture
                                </span>
                              </div>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Publish Actions Section (Moved to Bottom) ── */}
      {viewMode === "classes" && schedule.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-3">
            {isTimetableComplete ? (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-green-600 bg-green-50 border border-green-100 flex-shrink-0 animate-pulse">
                  <Check size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase text-green-700">Timetable Complete</p>
                  <p className="text-xs font-semibold text-slate-500">All slots configured. Ready to Publish.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-100 flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase text-amber-700">{emptySlotsCount} slots remaining</p>
                  <p className="text-xs font-semibold text-slate-500">Please assign lectures to all periods or mark them as Break.</p>
                </div>
              </>
            )}
          </div>

          <div className="relative group w-full md:w-auto text-left">
            <button
              onClick={() => {
                if (!isTimetableComplete) {
                  showToast("Timetable is incomplete. Please fill every period before publishing.", "error");
                  return;
                }
                handleSaveTimetable(true);
              }}
              disabled={isSavingTimetable}
              className={`
                w-full md:w-auto px-8 py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all duration-200
                ${isTimetableComplete 
                  ? "bg-[#223F74] hover:bg-[#1a3059] active:scale-95 shadow-[#223F74]/20 hover:shadow-lg cursor-pointer" 
                  : "bg-slate-300 cursor-not-allowed opacity-60"
                }
              `}
            >
              {isSavingTimetable ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" /> Publishing…
                </span>
              ) : (
                "Publish Timetable"
              )}
            </button>
            {!isTimetableComplete && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl z-50">
                Complete all timetable slots before publishing.
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ── HOVERED DETAILS TOOLTIP ─────────────────────────────────────────── */}
      {hoveredSlot && (
        <div
          className="absolute z-[999] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-72 text-left space-y-2 pointer-events-none animate-in fade-in duration-100"
          style={{ top: hoveredSlot.y + 8, left: hoveredSlot.x }}
        >
          <div className="flex justify-between items-center border-b pb-1.5">
            <span className="text-xs font-black uppercase text-[#223F74]">
              {capitalize(hoveredSlot.day)} Timings
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {hoveredSlot.slot.startTime} - {hoveredSlot.slot.endTime}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Subject: <span className="font-bold text-slate-800">{hoveredSlot.slot.subject?.subjectName || hoveredSlot.slot.subject?.name}</span></p>
            <p className="text-xs text-slate-500">Teacher: <span className="font-bold text-slate-800">{hoveredSlot.slot.teacher?.name || "TBA"}</span></p>
            <p className="text-xs text-slate-500">Classroom: <span className="font-bold text-slate-800">{hoveredSlot.slot.room || "TBA"}</span></p>
            <p className="text-xs text-slate-500">Lecture Type: <span className="font-bold text-slate-800">{hoveredSlot.slot.lectureType || "Theory"}</span></p>
            {currentTimetable?.createdBy && (
              <p className="text-[9px] text-slate-400 pt-1">Created By: {currentTimetable.createdBy.name || "School Admin"}</p>
            )}
          </div>
        </div>
      )}

      {/* ── RIGHT-CLICK CONTEXT MENU ────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-white rounded-2xl border shadow-2xl py-2 w-48 text-left border-slate-200/80 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.periodSlot.subject ? (
            <>
              <button
                onClick={() => handleCellClick(contextMenu.day, contextMenu.periodSlot)}
                className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-slate-700 flex items-center gap-2"
              >
                <Pencil size={13} className="text-slate-500" /> Edit Lecture
              </button>
              <button
                onClick={() => {
                  setCopiedSlot(contextMenu.periodSlot);
                  showToast("Lecture details copied!", "success");
                }}
                className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-slate-700 flex items-center gap-2"
              >
                <Copy size={13} className="text-slate-500" /> Copy Slot
              </button>
              <button
                onClick={() => {
                  setSchedule(prev => prev.map(day => {
                    if (day.day.toLowerCase() === contextMenu.day.toLowerCase()) {
                      return {
                        ...day,
                        periods: day.periods.map(p => {
                          if (p.startTime === contextMenu.periodSlot.startTime) {
                            return {
                              ...p,
                              lectureType: "Practical"
                            };
                          }
                          return p;
                        })
                      };
                    }
                    return day;
                  }));
                  showToast("Copied as duplicate slot!", "success");
                }}
                className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-slate-700 flex items-center gap-2"
              >
                <Copy size={13} className="text-slate-500" /> Duplicate
              </button>
              <button
                onClick={handleClearCell}
                className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-red-600 flex items-center gap-2"
              >
                <Trash2 size={13} className="text-red-500" /> Delete Lecture
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleCellClick(contextMenu.day, contextMenu.periodSlot)}
                className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-slate-700 flex items-center gap-2"
              >
                <Plus size={13} className="text-slate-500" /> Add Lecture
              </button>
              {copiedSlot && (
                <button
                  onClick={() => {
                    setSchedule(prev => prev.map(day => {
                      if (day.day.toLowerCase() === contextMenu.day.toLowerCase()) {
                        return {
                          ...day,
                          periods: day.periods.map(p => {
                            if (p.startTime === contextMenu.periodSlot.startTime) {
                              return {
                                ...p,
                                subject: copiedSlot.subject,
                                teacher: copiedSlot.teacher,
                                room: copiedSlot.room,
                                lectureType: copiedSlot.lectureType,
                                isBreak: copiedSlot.isBreak,
                                breakLabel: copiedSlot.breakLabel
                              };
                            }
                            return p;
                          })
                        };
                      }
                      return day;
                    }));
                    showToast("Lecture details pasted!", "success");
                  }}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 font-bold text-xs uppercase text-slate-700 flex items-center gap-2"
                >
                  <Copy size={13} className="text-slate-500" /> Paste Slot
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MODAL: ASSIGN / EDIT INDIVIDUAL CELL ───────────────────────────── */}
      {selectedCell && (
        <Modal
          id="cell-modal"
          title={selectedCell.periodSlot.subject ? "Edit Lecture" : "Assign Lecture"}
          size="md"
          onClose={() => {
            setSelectedCell(null);
            setConflictWarning("");
          }}
        >
          <div className="space-y-5 text-left">
            {/* Top metadata info card */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-slate-600">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Day</span>
                <span className="font-black text-[#223F74] uppercase text-sm">{selectedCell.day}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Timing</span>
                <span className="font-black text-[#223F74] text-sm">{selectedCell.periodSlot.startTime} - {selectedCell.periodSlot.endTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <input
                type="checkbox"
                id="cell-isbreak"
                checked={cellForm.isBreak}
                onChange={(e) => setCellForm(prev => ({ ...prev, isBreak: e.target.checked }))}
                className="w-4 h-4 text-[#223F74] border-slate-350 rounded focus:ring-[#223F74]/20"
              />
              <label htmlFor="cell-isbreak" className="text-xs font-black uppercase text-[#223F74] cursor-pointer select-none">
                Mark this slot as a Break / Interval
              </label>
            </div>

            {cellForm.isBreak ? (
              <DataField
                label="Break Label"
                id="cell-break-label"
                value={cellForm.breakLabel}
                onChange={(e) => setCellForm(prev => ({ ...prev, breakLabel: e.target.value }))}
                placeholder="e.g. Lunch Break, Short Break"
              />
            ) : (
              <Grid cols={12} gap={4}>
                <SelectField
                  label="Subject *"
                  id="cell-subject"
                  value={cellForm.subject}
                  onChange={(e) => setCellForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Select Subject..."
                  size={12}
                >
                  {subjects.map((sub) => (
                    <Option key={sub._id} value={sub._id} label={sub.subjectName || sub.name} />
                  ))}
                </SelectField>

                <SelectField
                  label="Teacher *"
                  id="cell-teacher"
                  value={cellForm.teacher}
                  onChange={(e) => setCellForm(prev => ({ ...prev, teacher: e.target.value }))}
                  placeholder="Select Teacher..."
                  size={12}
                >
                  {teachers.map((t) => (
                    <Option key={t._id} value={t._id} label={t.name} />
                  ))}
                </SelectField>

                <DataField
                  label="Room Number *"
                  id="cell-room"
                  value={cellForm.room}
                  onChange={(e) => setCellForm(prev => ({ ...prev, room: e.target.value }))}
                  placeholder="e.g. 101, Lab A"
                  size={6}
                />

                <SelectField
                  label="Lecture Type *"
                  id="cell-type"
                  value={cellForm.lectureType}
                  onChange={(e) => setCellForm(prev => ({ ...prev, lectureType: e.target.value }))}
                  placeholder="Select Type..."
                  size={6}
                >
                  {Object.keys(LECTURE_TYPES).filter(k => k !== "Break").map((t) => (
                    <Option key={t} value={t} label={t} />
                  ))}
                </SelectField>

                <SelectField
                  label="Status *"
                  id="cell-status"
                  value={cellForm.status}
                  onChange={(e) => setCellForm(prev => ({ ...prev, status: e.target.value }))}
                  placeholder="Select Status..."
                  size={12}
                >
                  {["Active", "Inactive"].map((s) => (
                    <Option key={s} value={s} label={s} />
                  ))}
                </SelectField>
              </Grid>
            )}

            {conflictWarning && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs font-bold text-red-700 uppercase tracking-tight leading-normal">
                  {conflictWarning}
                </p>
              </div>
            )}

            <Grid cols={12} gap={3} className="pt-4 border-t border-slate-100">
              <Button
                text="Clear Slot"
                variant="danger"
                onClick={handleClearCell}
                size={4}
              />
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => closeModal("cell-modal")}
                size={4}
              />
              <Button
                text="Save Slot"
                variant="primary"
                onClick={handleSaveCell}
                size={4}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* ── MODAL: COPY OPTIONS ─────────────────────────────────────────────── */}
      <Modal
        id="copy-modal"
        title={copyType === "day" ? "Copy Day Schedule" : "Copy Section Timetable"}
        size="md"
        onClose={() => setCopySectionForm({ toSection: "" })}
      >
        <div className="space-y-5 text-left">
          {copyType === "day" ? (
            <Grid cols={12} gap={4}>
              <SelectField
                label="From Day"
                id="copy-from-day"
                value={copyDayForm.from}
                onChange={(e) => setCopyDayForm(prev => ({ ...prev, from: e.target.value }))}
                placeholder="Select Day..."
                size={6}
              >
                {DAYS.map(d => (
                  <Option key={d} value={d} label={capitalize(d)} />
                ))}
              </SelectField>
              <SelectField
                label="To Day"
                id="copy-to-day"
                value={copyDayForm.to}
                onChange={(e) => setCopyDayForm(prev => ({ ...prev, to: e.target.value }))}
                placeholder="Select Day..."
                size={6}
              >
                {DAYS.map(d => (
                  <Option key={d} value={d} label={capitalize(d)} />
                ))}
              </SelectField>
            </Grid>
          ) : (
            <DataField
              label="Destination Section (e.g. B, C)"
              id="copy-to-section"
              value={copySectionForm.toSection}
              onChange={(e) => setCopySectionForm({ toSection: e.target.value.toUpperCase() })}
              placeholder="e.g. B"
            />
          )}

          <Grid cols={12} gap={3} className="pt-4 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("copy-modal")}
              size={6}
            />
            <Button
              text="Execute Copy"
              variant="primary"
              onClick={handleExecuteCopy}
              size={6}
            />
          </Grid>
        </div>
      </Modal>

      {/* ── MODAL: BULK OPERATIONS ──────────────────────────────────────────── */}
      <Modal id="bulk-modal" title="Bulk Operations" size="md">
        <div className="space-y-5 text-left">
          <SelectField
            label="Action Type"
            id="bulk-action-type"
            value={bulkType}
            onChange={(e) => setBulkType(e.target.value)}
            placeholder="Select Action..."
          >
            <Option value="replace-teacher" label="Replace Teacher Across Timetable" />
            <Option value="shift-period" label="Shift/Swap Period Assignments" />
            <Option value="clear" label="Clear All Assignments" />
          </SelectField>

          {bulkType === "replace-teacher" && (
            <Grid cols={12} gap={4}>
              <SelectField
                label="From Teacher"
                id="bulk-from-teacher"
                value={bulkForm.fromTeacher}
                onChange={(e) => setBulkForm(prev => ({ ...prev, fromTeacher: e.target.value }))}
                placeholder="Select Teacher..."
                size={6}
              >
                {teachers.map((t) => (
                  <Option key={t._id} value={t._id} label={t.name} />
                ))}
              </SelectField>
              <SelectField
                label="To Teacher"
                id="bulk-to-teacher"
                value={bulkForm.toTeacher}
                onChange={(e) => setBulkForm(prev => ({ ...prev, toTeacher: e.target.value }))}
                placeholder="Select Teacher..."
                size={6}
              >
                {teachers.map((t) => (
                  <Option key={t._id} value={t._id} label={t.name} />
                ))}
              </SelectField>
            </Grid>
          )}

          {bulkType === "shift-period" && (
            <Grid cols={12} gap={4}>
              <SelectField
                label="From Period Slot"
                id="bulk-from-period"
                value={bulkForm.fromPeriod}
                onChange={(e) => setBulkForm(prev => ({ ...prev, fromPeriod: e.target.value }))}
                placeholder="Select Period..."
                size={6}
              >
                {displayPeriods.map(p => (
                  <Option key={p._id} value={p.order} label={p.name} />
                ))}
              </SelectField>
              <SelectField
                label="To Period Slot"
                id="bulk-to-period"
                value={bulkForm.toPeriod}
                onChange={(e) => setBulkForm(prev => ({ ...prev, toPeriod: e.target.value }))}
                placeholder="Select Period..."
                size={6}
              >
                {displayPeriods.map(p => (
                  <Option key={p._id} value={p.order} label={p.name} />
                ))}
              </SelectField>
            </Grid>
          )}

          {bulkType === "clear" && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex gap-2">
              <AlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-xs font-black uppercase text-orange-850 leading-normal">
                Warning: This will clear every subject assignment from the schedule grid instantly.
              </p>
            </div>
          )}

          <Grid cols={12} gap={3} className="pt-4 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("bulk-modal")}
              size={6}
            />
            <Button
              text="Execute"
              variant="primary"
              onClick={handleExecuteBulk}
              size={6}
            />
          </Grid>
        </div>
      </Modal>

      {/* ── MODAL: PERIODS CONFIGURATION DIALOG ─────────────────────────────── */}
      <Modal
        id="periods-modal"
        title="Configure School Period Timings"
        size="xl"
        onClose={() => {
          setEditingPeriod(null);
          setPeriodForm({ name: "", startTime: "", endTime: "", isBreak: false });
        }}
      >
        <Grid cols={12} gap={6} className="text-left">
          {/* Add/Edit form */}
          <div className="col-span-12 lg:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4 h-fit animate-in fade-in duration-200">
            <p className="text-xs font-black uppercase text-[#223F74] tracking-wide">
              {editingPeriod ? "Edit Period Details" : "Create New Period Slot"}
            </p>

            <DataField
              label="Slot Label / Name"
              id="period-name"
              value={periodForm.name}
              onChange={(e) => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Period 1, Lunch"
            />

            <Grid cols={2} gap={3}>
              <DataField
                label="Start"
                id="period-start"
                type="time"
                value={periodForm.startTime}
                onChange={(e) => setPeriodForm(prev => ({ ...prev, startTime: e.target.value }))}
              />
              <DataField
                label="End"
                id="period-end"
                type="time"
                value={periodForm.endTime}
                onChange={(e) => setPeriodForm(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </Grid>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="period-isbreak"
                checked={periodForm.isBreak}
                onChange={(e) => setPeriodForm(prev => ({ ...prev, isBreak: e.target.checked }))}
                className="w-4 h-4 text-[#223F74] border-slate-350 rounded focus:ring-[#223F74]/20"
              />
              <label htmlFor="period-isbreak" className="text-xs font-bold uppercase text-[#223F74] cursor-pointer select-none">
                Is Recess/Break Slot
              </label>
            </div>

            <Grid cols={12} gap={2} className="pt-2 border-t border-slate-200">
              <Button
                text="Save Slot"
                variant="primary"
                onClick={handleSavePeriod}
                loading={isSavingPeriod}
                size={editingPeriod ? 8 : 12}
              />
              {editingPeriod && (
                <Button
                  text="Cancel"
                  variant="secondary"
                  onClick={() => {
                    setEditingPeriod(null);
                    setPeriodForm({ name: "", startTime: "", endTime: "", isBreak: false });
                  }}
                  size={4}
                />
              )}
            </Grid>
          </div>

          {/* List sequence */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <p className="text-xs font-black uppercase text-[#223F74] tracking-wide">
              Active Periods Sequence
            </p>

            {periods.length === 0 ? (
              <div className="py-12 border border-dashed rounded-2xl text-center text-slate-400 text-sm">
                No periods configured. Use the form to add timings.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-black uppercase text-xs text-slate-600">Order</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-xs text-slate-600">Label</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-xs text-slate-600">Timing</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-xs text-slate-600">Type</th>
                      <th className="px-4 py-3 text-center font-black uppercase text-xs text-slate-600 w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p, index) => (
                      <PeriodRow
                        key={p._id}
                        period={p}
                        index={index}
                        totalCount={periods.length}
                        isDuplicating={duplicatingId === p._id || p.isOptimistic}
                        onMove={handleMovePeriod}
                        onDuplicate={handleDuplicatePeriodClick}
                        onEdit={handleEditPeriodClick}
                        onDelete={handleDeletePeriodClick}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Grid>
      </Modal>

      {/* ── MODAL: RESET TIMETABLE CONFIRMATION ──────────────────────────────── */}
      <Modal id="reset-timetable-modal" title="Reset Weekly Timetable" size="sm">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 animate-bounce">
            <Trash2 size={22} />
          </div>
          <div className="space-y-2 text-left">
            <h4 className="text-sm font-black uppercase text-slate-800 text-center">
              Confirm Reset
            </h4>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed text-center">
              Are you sure you want to reset this timetable?
            </p>
            <p className="text-xs font-medium text-slate-400 text-center">
              This action will remove all lecture assignments from the current draft timetable. Configured period timings will NOT be deleted. The timetable template structure will remain available.
            </p>
            <div className="text-xs text-slate-505 space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <p className="font-bold text-slate-700">This action will:</p>
              <ul className="list-disc list-inside space-y-1 font-medium text-slate-650">
                <li>Remove all assigned lectures</li>
                <li>Clear teacher assignments</li>
                <li>Clear subject assignments</li>
                <li>Clear room allocations</li>
                <li>Keep all configured period timings</li>
                <li>Keep class & section selection</li>
                <li>Keep timetable template structure</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl text-center">
              <p className="font-bold text-red-600 text-[11px] uppercase tracking-wider">This action cannot be undone.</p>
            </div>
          </div>

          <Grid cols={12} gap={3} className="pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("reset-timetable-modal")}
              size={6}
              disabled={isResetting}
            />
            <Button
              text="Reset Timetable"
              variant="danger"
              loading={isResetting}
              onClick={handleResetTimetable}
              size={6}
              disabled={isResetting}
            />
          </Grid>
        </div>
      </Modal>
    </div>
  );
}