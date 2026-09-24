import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import * as XLSX from "xlsx";
import {
  Eye,
  Power,
  Trash2,
  Calendar,
  Check,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  BookOpen,
  Users,
  DoorOpen,
  GraduationCap,
  Download,
  Edit3
} from "lucide-react";

import {
  EnhancedDashCard,
  DashGrid,
  Modal,
  openModal,
  closeModal,
  SelectField,
  Option,
  Grid,
  Button,
  DataTable,
  InputField
} from "../../../components/shared/Common_Components";
import {
  getAdminPublishedTimetables,
  toggleAdminTimetableStatus,
  deleteAdminTimetable,
  updateAdminTimetableAcademicYear,
  getAdminPeriods
} from "../../../services/api/adminAcademicsApi";

const NAVY = "#223F74";
const BORDER = "#E7E2DB";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const LECTURE_TYPES = {
  Theory: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", badge: "bg-indigo-100 text-indigo-700" },
  Practical: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", badge: "bg-green-100 text-green-700" },
  Lab: { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4", badge: "bg-teal-100 text-teal-700" },
  Sports: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", badge: "bg-orange-100 text-orange-700" },
  Library: { bg: "#FDF4FF", text: "#9333EA", border: "#E9D5FF", badge: "bg-purple-100 text-purple-700" },
  Exam: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", badge: "bg-rose-100 text-rose-700" },
  Break: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", badge: "bg-amber-100 text-amber-700" }
};

const getLectureColors = (type) => LECTURE_TYPES[type] || LECTURE_TYPES.Theory;

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

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

const matchSlot = (ps, period) => {
  if (!ps || !period) return false;
  if (ps.periodSlotId && period._id) {
    if (String(ps.periodSlotId) === String(period._id)) return true;
  }
  if (ps.periodSlot?._id && period._id) {
    if (String(ps.periodSlot._id) === String(period._id)) return true;
  }
  if (ps._id && period._id && !String(ps._id).startsWith("derived-")) {
    if (String(ps._id) === String(period._id)) return true;
  }
  const psStart = parseTimeToMinutes(ps.startTime);
  const psEnd = parseTimeToMinutes(ps.endTime);
  const periodStart = parseTimeToMinutes(period.startTime);
  const periodEnd = parseTimeToMinutes(period.endTime);
  return psStart === periodStart && psEnd === periodEnd;
};

export default function AllTimetables({ allClasses = [], academicYears = [], teachers = [], showToast, setViewMode, periods = [] }) {
  const authUser = useSelector((state) => state.adminAuth.authUser);
  const schoolName = authUser?.school?.schoolName || authUser?.school?.name || "Graphura School Management ERP";
  const timetableRef = useRef(null);

  const [timetables, setTimetables] = useState([]);
  const [configuredPeriods, setConfiguredPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get active period configurations for the current school
  const activeConfiguredSlots = useMemo(() => {
    const rawPeriods = configuredPeriods.length > 0 ? configuredPeriods : (periods || []);
    const activeOnly = rawPeriods.filter(p => p.isActive !== false);
    // Sort by order/sequence
    return [...activeOnly].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [configuredPeriods, periods]);

  // Normalize and deduplicate configured slots
  const timetableRows = useMemo(() => {
    return normalizeTimetableSlots(activeConfiguredSlots);
  }, [activeConfiguredSlots]);

  // Filter States
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // Selected action target states
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [actionTimetable, setActionTimetable] = useState(null);

  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Edit Academic Year states
  const [editYearTimetable, setEditYearTimetable] = useState(null);
  const [editYearValue, setEditYearValue] = useState("");
  const [updatingYear, setUpdatingYear] = useState(false);

  const [subTab, setSubTab] = useState("classes"); // "classes" or "teachers"
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterTeacherYear, setFilterTeacherYear] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Derive unique period configurations across all published timetables
  const allUniquePeriods = useMemo(() => {
    const periodMap = {};
    timetables.forEach(tt => {
      if (tt.schedule) {
        tt.schedule.forEach(day => {
          if (day.periods) {
            day.periods.forEach(p => {
              const startMin = parseTimeToMinutes(p.startTime);
              const endMin = parseTimeToMinutes(p.endTime);
              const slotType = p.isBreak ? "break" : "period";
              const key = `${startMin}-${endMin}-${slotType}`;
              if (!periodMap[key]) {
                periodMap[key] = {
                  startTime: p.startTime,
                  endTime: p.endTime,
                  isBreak: p.isBreak,
                  breakLabel: p.breakLabel,
                  periodNumber: p.periodNumber,
                  startMin
                };
              }
            });
          }
        });
      }
    });
    return normalizeTimetableSlots(Object.values(periodMap));
  }, [timetables]);

  // Derive unique period configurations only for the currently selected teacher's assigned classes
  const teacherUniquePeriods = timetableRows;

  // Aggregate teacher weekly load records derived from published class timetables
  const teacherTimetableData = useMemo(() => {
    if (subTab !== "teachers") return [];
    
    const relevantTimetables = timetables.filter(t => {
      if (filterTeacherYear && t.academicYear !== filterTeacherYear) return false;
      return true;
    });

    let result = (teachers || []).map(teacher => {
      let totalLectures = 0;
      let latestUpdatedDate = null;
      let associatedYears = new Set();

      relevantTimetables.forEach(tt => {
        let hasLecturesInTT = false;
        if (tt.schedule) {
          tt.schedule.forEach(day => {
            if (day.periods) {
              day.periods.forEach(p => {
                if (!p.isBreak && p.teacher) {
                  const teacherIdStr = typeof p.teacher === "object" ? p.teacher._id : p.teacher;
                  if (String(teacherIdStr) === String(teacher._id)) {
                    totalLectures++;
                    hasLecturesInTT = true;
                  }
                }
              });
            }
          });
        }

        if (hasLecturesInTT) {
          associatedYears.add(tt.academicYear);
          const updateTime = new Date(tt.updatedAt || tt.createdAt || Date.now());
          if (!latestUpdatedDate || updateTime > latestUpdatedDate) {
            latestUpdatedDate = updateTime;
          }
        }
      });

      let lastUpdatedStr = "-";
      if (latestUpdatedDate) {
        lastUpdatedStr = latestUpdatedDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
      }

      const yearsStr = associatedYears.size > 0 
        ? Array.from(associatedYears).join(", ") 
        : (filterTeacherYear || "N/A");

      return {
        _id: teacher._id,
        teacherName: teacher.name,
        department: teacher.department || "Academics",
        totalLectures,
        academicYear: yearsStr,
        lastUpdated: lastUpdatedStr,
        teacherObj: teacher
      };
    });

    if (filterTeacher) {
      result = result.filter(item => String(item._id) === String(filterTeacher));
    }

    return result;
  }, [subTab, timetables, teachers, filterTeacher, filterTeacherYear]);

  // Compile teacher weekly grid for the selected viewed teacher
  const selectedTeacherScheduleData = useMemo(() => {
    if (!selectedTeacher) return {};
    const daySlots = {};
    DAYS.forEach(d => { daySlots[d] = []; });

    const teacherTimetableSources = timetables.filter(tt => {
      const isYearMatch = selectedTeacher.academicYear.includes(tt.academicYear);
      return tt.schedule && isYearMatch;
    });

    console.log("Teacher timetable sources:", teacherTimetableSources);

    teacherTimetableSources.forEach(tt => {
      tt.schedule.forEach(ds => {
        const dayName = ds.day.toLowerCase();
        if (daySlots[dayName]) {
          ds.periods.forEach(p => {
            const pTeacherId = p.teacher?._id || p.teacher;
            if (pTeacherId && String(pTeacherId) === String(selectedTeacher._id)) {
              daySlots[dayName].push({
                ...p,
                className: tt.className || tt.class?.name || "Unknown",
                section: tt.sectionName || tt.section
              });
            }
          });
        }
      });
    });
    return daySlots;
  }, [selectedTeacher, timetables]);

  // Load published timetables and period configurations
  const loadTimetables = async () => {
    setLoading(true);
    try {
      const [res, resPeriods] = await Promise.all([
        getAdminPublishedTimetables(),
        getAdminPeriods()
      ]);
      if (res.success) {
        setTimetables(res.data || []);
      } else {
        showToast(res.message || "Failed to load published timetables", "error");
      }
      if (resPeriods.success) {
        setConfiguredPeriods(resPeriods.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading timetable data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetables();
  }, []);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterYear("");
    setFilterStatus("");
    setFilterClass("");
    setFilterSection("");
  };

  // Sections of selected filterClass
  const availableSections = useMemo(() => {
    if (!filterClass) return [];
    const matchingClass = allClasses.find((c) => String(c.id || c._id) === String(filterClass));
    return matchingClass ? matchingClass.sections || [] : [];
  }, [allClasses, filterClass]);

  // Statistics
  const stats = useMemo(() => {
    const total = timetables.length;
    const active = timetables.filter((t) => t.isActive).length;
    const inactive = total - active;
    let latestText = "-";

    if (total > 0) {
      // timetables is sorted by updatedAt desc from backend
      const latest = timetables[0];
      latestText = `${latest.className} - ${latest.sectionName}`;
    }

    return { total, active, inactive, latestText };
  }, [timetables]);

  // Filter and Search rows locally
  const filteredRows = useMemo(() => {
    return timetables.filter((row) => {
      if (filterYear && row.academicYear !== filterYear) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      if (filterClass && String(row.classId || "") !== String(filterClass)) return false;
      if (filterSection && row.sectionName !== filterSection) return false;
      return true;
    });
  }, [timetables, filterYear, filterStatus, filterClass, filterSection]);

  // Table Columns config
  const columns = [
    { key: "className", label: "Class" },
    { key: "sectionName", label: "Section" },
    { key: "academicYear", label: "Academic Year" },
    { key: "totalPeriods", label: "Periods" },
    { key: "totalLectures", label: "Lectures" },
    { key: "publishedBy", label: "Published By" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const isActive = row.isActive;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
            {row.status}
          </span>
        );
      }
    }
  ];

  // Actions configuration
  const actions = [
    {
      tooltip: "View Timetable Grid",
      icon: <Eye size={14} className="text-slate-600" />,
      onClick: (row) => {
        setSelectedTimetable(row);
        openModal("view-published-timetable-modal");
      }
    },
    {
      tooltip: "Deactivate Timetable",
      icon: <Power size={14} className="text-rose-500 animate-pulse" />,
      show: (row) => row.isActive,
      onClick: (row) => {
        setActionTimetable(row);
        openModal("deactivate-confirm-modal");
      }
    },
    {
      tooltip: "Activate Timetable",
      icon: <Power size={14} className="text-emerald-500" />,
      show: (row) => !row.isActive,
      onClick: (row) => {
        setActionTimetable(row);
        openModal("activate-confirm-modal");
      }
    },
    {
      tooltip: "Edit Academic Year",
      icon: <Edit3 size={14} className="text-[#223F74]" />,
      onClick: (row) => {
        setEditYearTimetable(row);
        setEditYearValue(row.academicYear);
        openModal("edit-year-modal");
      }
    },
    {
      tooltip: "Delete Timetable",
      variant: "danger",
      icon: <Trash2 size={14} />,
      onClick: (row) => {
        setActionTimetable(row);
        openModal("delete-published-timetable-confirm-modal");
      }
    }
  ];

  // Toggle active/inactive action handler
  const handleToggleStatus = async () => {
    if (!actionTimetable) return;
    setTogglingStatus(true);
    const newStatus = !actionTimetable.isActive;
    try {
      const res = await toggleAdminTimetableStatus(actionTimetable._id, newStatus);
      if (res.success) {
        showToast(`Timetable successfully ${newStatus ? "activated" : "deactivated"}.`, "success");
        closeModal(newStatus ? "activate-confirm-modal" : "deactivate-confirm-modal");
        loadTimetables();
      } else {
        showToast(res.message || "Failed to update timetable status", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating timetable status", "error");
    } finally {
      setTogglingStatus(false);
    }
  };

  // Delete timetable action handler
  const handleDeleteTimetable = async () => {
    if (!actionTimetable) return;
    setDeleting(true);
    try {
      const res = await deleteAdminTimetable(actionTimetable._id);
      if (res.success) {
        showToast("Timetable permanently deleted.", "success");
        closeModal("delete-published-timetable-confirm-modal");
        loadTimetables();
      } else {
        showToast(res.message || "Failed to delete timetable", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting timetable", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Update Academic Year handler
  const handleUpdateAcademicYear = async () => {
    if (!editYearTimetable || !editYearValue) return;
    setUpdatingYear(true);
    try {
      const res = await updateAdminTimetableAcademicYear(editYearTimetable._id, editYearValue);
      if (res.success) {
        showToast("Academic Year updated successfully.", "success");
        closeModal("edit-year-modal");
        
        // Auto-refresh the view details modal if the currently open timetable was updated
        if (selectedTimetable && selectedTimetable._id === editYearTimetable._id) {
          setSelectedTimetable(prev => ({
            ...prev,
            academicYear: editYearValue
          }));
        }
        
        loadTimetables();
      } else {
        showToast(res.message || "Failed to update academic year", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating academic year", "error");
    } finally {
      setUpdatingYear(false);
    }
  };

  // Read-only modal grid calculation
  const timetablePeriods = timetableRows;

  const handleExportExcel = () => {
    if (!selectedTimetable) return;
    try {
      const schoolNameVal = schoolName || "Graphura School Management ERP";
      const classNameVal = selectedTimetable.className;
      const sectionNameVal = selectedTimetable.sectionName;
      const academicYearVal = selectedTimetable.academicYear;
      const statusVal = selectedTimetable.status;

      // ── SHEET 1: WEEKLY TIMETABLE ──
      const sheet1Data = [
        [schoolNameVal.toUpperCase()],
        ["WEEKLY CLASS TIMETABLE"],
        [],
        ["School Name:", schoolNameVal],
        ["Class:", classNameVal],
        ["Section:", sectionNameVal],
        ["Academic Year:", academicYearVal],
        ["Status:", statusVal],
        [],
        ["Period", "Timing", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      ];

      timetablePeriods.forEach((period, pi) => {
        const row = [period.name, `${period.startTime} - ${period.endTime}`];
        
        DAYS.forEach((day) => {
          const ds = selectedTimetable.schedule.find(
            (d) => d.day.toLowerCase() === day.toLowerCase()
          );
          const slot = ds?.periods.find((ps) => matchSlot(ps, period));
          
          if (slot) {
            if (slot.isBreak) {
              row.push(slot.breakLabel?.toUpperCase() === "LUNCH" ? "🍽 LUNCH" : slot.breakLabel || "BREAK");
            } else if (slot.subject) {
              const subjectNameText = typeof slot.subject === "object"
                ? (slot.subject.subjectName || slot.subject.name)
                : (slot.subjectName || slot.subject || "Subject");
              const teacherNameText = typeof slot.teacher === "object"
                ? slot.teacher.name
                : (slot.teacherName || slot.teacher || "TBA");
              const roomText = slot.room || "TBA";
              const typeText = slot.lectureType || "Theory";

              row.push(`${subjectNameText}\nTeacher: ${teacherNameText}\nRoom: ${roomText}\n${typeText}`);
            } else {
              row.push("-");
            }
          } else {
            row.push("-");
          }
        });
        
        sheet1Data.push(row);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

      // Merges for main title & subtitle
      ws1["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
      ];

      // Auto-fit columns for Sheet 1
      const ws1Cols = [];
      sheet1Data.forEach(row => {
        row.forEach((val, colIdx) => {
          const strVal = val ? String(val) : "";
          const lines = strVal.split("\n");
          let maxLineLen = 0;
          lines.forEach(l => {
            if (l.length > maxLineLen) maxLineLen = l.length;
          });
          const cellLen = Math.max(maxLineLen + 3, 12);
          if (!ws1Cols[colIdx] || cellLen > ws1Cols[colIdx].wch) {
            ws1Cols[colIdx] = { wch: cellLen };
          }
        });
      });
      ws1["!cols"] = ws1Cols;

      // Freeze first 10 rows (header + metadata info + grid column headers)
      ws1["!views"] = [{ state: "frozen", ySplit: 10 }];


      // ── SHEET 2: LECTURE DETAILS ──
      const sheet2Data = [
        ["Day", "Period", "Timing", "Subject", "Teacher", "Room Number", "Lecture Type", "Status", "Break Slot"]
      ];

      DAYS.forEach((day) => {
        const ds = selectedTimetable.schedule.find(
          (d) => d.day.toLowerCase() === day.toLowerCase()
        );
        
        timetablePeriods.forEach((period) => {
          const slot = ds?.periods.find((ps) => matchSlot(ps, period));
          const timingStr = `${period.startTime} - ${period.endTime}`;
          
          if (slot) {
            if (slot.isBreak) {
              const breakLabelText = slot.breakLabel?.toUpperCase() === "LUNCH" ? "Lunch" : (slot.breakLabel || "Break");
              sheet2Data.push([
                capitalize(day),
                breakLabelText,
                timingStr,
                breakLabelText,
                "-",
                "-",
                "Break",
                statusVal,
                "Yes"
              ]);
            } else if (slot.subject) {
              const subjectNameText = typeof slot.subject === "object"
                ? (slot.subject.subjectName || slot.subject.name)
                : (slot.subjectName || slot.subject || "Subject");
              const teacherNameText = typeof slot.teacher === "object"
                ? slot.teacher.name
                : (slot.teacherName || slot.teacher || "TBA");
              const roomText = slot.room || "TBA";
              const typeText = slot.lectureType || "Theory";

              sheet2Data.push([
                capitalize(day),
                period.name,
                timingStr,
                subjectNameText,
                teacherNameText,
                roomText,
                typeText,
                statusVal,
                "No"
              ]);
            }
          }
        });
      });

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

      // Auto-fit columns for Sheet 2
      const ws2Cols = [];
      sheet2Data.forEach(row => {
        row.forEach((val, colIdx) => {
          const strVal = val ? String(val) : "";
          const cellLen = Math.max(strVal.length + 3, 12);
          if (!ws2Cols[colIdx] || cellLen > ws2Cols[colIdx].wch) {
            ws2Cols[colIdx] = { wch: cellLen };
          }
        });
      });
      ws2["!cols"] = ws2Cols;

      // Freeze header row (Row 1)
      ws2["!views"] = [{ state: "frozen", ySplit: 1 }];


      // ── CREATE WORKBOOK & SAVE ──
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Weekly Timetable");
      XLSX.utils.book_append_sheet(wb, ws2, "Lecture Details");

      const cleanClassName = classNameVal.replace(/\s+/g, "");
      const cleanSectionName = sectionNameVal.replace(/\s+/g, "");
      const finalFileName = `${cleanClassName}_${cleanSectionName}_${academicYearVal}_WeeklyTimetable.xlsx`;

      XLSX.writeFile(wb, finalFileName);
      showToast("Excel exported successfully", "success");
    } catch (err) {
      console.error("Excel generation failed:", err);
      showToast("Failed to generate Excel report", "error");
    }
  };

  const handleExportTeacherExcel = () => {
    if (!selectedTeacher) return;
    try {
      const schoolNameVal = schoolName || "Graphura School Management ERP";
      const teacherNameVal = selectedTeacher.teacherName;
      const deptVal = selectedTeacher.department || "Academics";
      const academicYearVal = selectedTeacher.academicYear;
      const statusVal = "Active";

      // ── SHEET 1: WEEKLY TIMETABLE ──
      const sheet1Data = [
        [schoolNameVal.toUpperCase()],
        ["WEEKLY TEACHER TIMETABLE"],
        [],
        ["School Name:", schoolNameVal],
        ["Teacher Name:", teacherNameVal],
        ["Department:", deptVal],
        ["Academic Year:", academicYearVal],
        ["Status:", statusVal],
        [],
        ["Period", "Timing", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      ];

      teacherUniquePeriods.forEach((period, pi) => {
        const row = [period.name, `${period.startTime} - ${period.endTime}`];
        
        DAYS.forEach((day) => {
          const slots = selectedTeacherScheduleData[day.toLowerCase()] || [];
          const slot = slots.find((s) => matchSlot(s, period));
          
          if (slot) {
            if (slot.isBreak) {
              row.push(slot.breakLabel?.toUpperCase() === "LUNCH" ? "🍽 LUNCH" : slot.breakLabel || "BREAK");
            } else if (slot.subject) {
              const subjectNameText = typeof slot.subject === "object"
                ? (slot.subject.subjectName || slot.subject.name)
                : (slot.subjectName || slot.subject || "Subject");
              const classNameText = slot.className || "Unknown";
              const sectionText = slot.section || "TBA";
              const roomText = slot.room || "TBA";
              const typeText = slot.lectureType || "Theory";

              row.push(`${subjectNameText}\n${classNameText} - ${sectionText}\nRoom: ${roomText}\n${typeText}`);
            } else {
              row.push("-");
            }
          } else {
            if (period.isBreak) {
              row.push(period.breakLabel?.toUpperCase() === "LUNCH" ? "🍽 LUNCH" : period.breakLabel || "BREAK");
            } else {
              row.push("-");
            }
          }
        });
        
        sheet1Data.push(row);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

      // Merges
      ws1["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
      ];

      // Auto-fit columns
      const ws1Cols = [];
      sheet1Data.forEach(row => {
        row.forEach((val, colIdx) => {
          const strVal = val ? String(val) : "";
          const lines = strVal.split("\n");
          let maxLineLen = 0;
          lines.forEach(l => {
            if (l.length > maxLineLen) maxLineLen = l.length;
          });
          const cellLen = Math.max(maxLineLen + 3, 12);
          if (!ws1Cols[colIdx] || cellLen > ws1Cols[colIdx].wch) {
            ws1Cols[colIdx] = { wch: cellLen };
          }
        });
      });
      ws1["!cols"] = ws1Cols;

      // Freeze first 10 rows
      ws1["!views"] = [{ state: "frozen", ySplit: 10 }];


      // ── SHEET 2: LECTURE DETAILS ──
      const sheet2Data = [
        ["Day", "Period", "Timing", "Subject", "Class & Section", "Room Number", "Lecture Type", "Status", "Break Slot"]
      ];

      DAYS.forEach((day) => {
        const slots = selectedTeacherScheduleData[day.toLowerCase()] || [];
        
        teacherUniquePeriods.forEach((period) => {
          const slot = slots.find((s) => matchSlot(s, period));
          const timingStr = `${period.startTime} - ${period.endTime}`;
          
          if (slot) {
            if (slot.isBreak) {
              const breakLabelText = slot.breakLabel?.toUpperCase() === "LUNCH" ? "Lunch" : (slot.breakLabel || "Break");
              sheet2Data.push([
                capitalize(day),
                breakLabelText,
                timingStr,
                breakLabelText,
                "-",
                "-",
                "Break",
                statusVal,
                "Yes"
              ]);
            } else if (slot.subject) {
              const subjectNameText = typeof slot.subject === "object"
                ? (slot.subject.subjectName || slot.subject.name)
                : (slot.subjectName || slot.subject || "Subject");
              const classSectionStr = `${slot.className} - ${slot.section || "TBA"}`;
              const roomText = slot.room || "TBA";
              const typeText = slot.lectureType || "Theory";

              sheet2Data.push([
                capitalize(day),
                period.name,
                timingStr,
                subjectNameText,
                classSectionStr,
                roomText,
                typeText,
                statusVal,
                "No"
              ]);
            }
          } else if (period.isBreak) {
            const breakLabelText = period.breakLabel?.toUpperCase() === "LUNCH" ? "Lunch" : (period.breakLabel || "Break");
            sheet2Data.push([
              capitalize(day),
              breakLabelText,
              timingStr,
              breakLabelText,
              "-",
              "-",
              "Break",
              statusVal,
              "Yes"
            ]);
          }
        });
      });

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

      // Auto-fit columns
      const ws2Cols = [];
      sheet2Data.forEach(row => {
        row.forEach((val, colIdx) => {
          const strVal = val ? String(val) : "";
          const cellLen = Math.max(strVal.length + 3, 12);
          if (!ws2Cols[colIdx] || cellLen > ws2Cols[colIdx].wch) {
            ws2Cols[colIdx] = { wch: cellLen };
          }
        });
      });
      ws2["!cols"] = ws2Cols;

      // Freeze header row
      ws2["!views"] = [{ state: "frozen", ySplit: 1 }];


      // ── CREATE WORKBOOK & SAVE ──
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Weekly Timetable");
      XLSX.utils.book_append_sheet(wb, ws2, "Lecture Details");

      const cleanTeacherName = teacherNameVal.replace(/\s+/g, "");
      const finalFileName = `${cleanTeacherName}_${academicYearVal}_WeeklyTimetable.xlsx`;

      XLSX.writeFile(wb, finalFileName);
      showToast("Excel exported successfully", "success");
    } catch (err) {
      console.error("Excel generation failed:", err);
      showToast("Failed to generate Excel report", "error");
    }
  };

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Published"
          value={loading ? "-" : stats.total}
          icon={<Calendar size={22} />}
          accentColor="#223F74"
          size={3}
        />
        <EnhancedDashCard
          title="Active Timetables"
          value={loading ? "-" : stats.active}
          icon={<Check size={22} />}
          accentColor="#5B9A6A"
          size={3}
        />
        <EnhancedDashCard
          title="Inactive Timetables"
          value={loading ? "-" : stats.inactive}
          icon={<AlertCircle size={22} />}
          accentColor="#D66B5F"
          size={3}
        />
        <EnhancedDashCard
          title="Latest Published"
          value={loading ? "-" : stats.latestText}
          icon={<Clock size={22} />}
          accentColor="#E0A04B"
          size={3}
        />
      </DashGrid>

      {/* ── SEGMENTED TAB SWITCH ────────────────────────────────────────────── */}
      <div className="flex w-full mb-2">
        <div
          className="flex w-full p-1 rounded-full gap-1"
          style={{ background: "#EEF2FB", border: `1px solid #D8E0F0` }}
        >
          <button
            type="button"
            onClick={() => setSubTab("classes")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-tight transition-all duration-300"
            style={{
              background: subTab === "classes" ? NAVY : "transparent",
              color: subTab === "classes" ? "#fff" : "#64748B",
              boxShadow: subTab === "classes" ? "0 2px 8px rgba(34,63,116,0.25)" : "none",
              transform: subTab === "classes" ? "scale(1.01)" : "scale(1)",
            }}
          >
            <GraduationCap size={14} />
            Classes Timetable
          </button>
          <button
            type="button"
            onClick={() => setSubTab("teachers")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-tight transition-all duration-300"
            style={{
              background: subTab === "teachers" ? NAVY : "transparent",
              color: subTab === "teachers" ? "#fff" : "#64748B",
              boxShadow: subTab === "teachers" ? "0 2px 8px rgba(34,63,116,0.25)" : "none",
              transform: subTab === "teachers" ? "scale(1.01)" : "scale(1)",
            }}
          >
            <Users size={14} />
            Teachers Timetable
          </button>
        </div>
      </div>

      {/* ── TOP FILTERS PANEL ────────────────────────────────────────────────── */}
      <div
        className="rounded-[24px] p-5 bg-white border border-slate-200 shadow-sm"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} style={{ color: NAVY }} />
          <span className="text-sm font-black uppercase tracking-widest text-[#223F74]">Filters</span>
        </div>

        {subTab === "classes" ? (
          <Grid cols={12} gap={4}>
            {/* Academic Year filter */}
            <SelectField
              label="Academic Year"
              id="all-filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              placeholder="All Academic Years"
              size={3}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>

            {/* Status filter */}
            <SelectField
              label="Status"
              id="all-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="All Statuses"
              size={2}
            >
              <Option value="Active" label="Active" />
              <Option value="Inactive" label="Inactive" />
            </SelectField>

            {/* Class filter */}
            <SelectField
              label="Class"
              id="all-filter-class"
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterSection("");
              }}
              placeholder="All Classes"
              size={3}
            >
              {allClasses.map((c) => (
                <Option key={c.id || c._id} value={c.id || c._id} label={c.name} />
              ))}
            </SelectField>

            {/* Section filter */}
            <SelectField
              label="Section"
              id="all-filter-section"
              value={filterSection}
              disabled={!filterClass}
              onChange={(e) => setFilterSection(e.target.value)}
              placeholder="All Sections"
              size={2}
            >
              {availableSections.map((sec) => (
                <Option key={sec.name} value={sec.name} label={sec.name} />
              ))}
            </SelectField>

            {/* Reset Filters button */}
            <div className="col-span-12 md:col-span-2 flex items-end">
              <Button
                text="Reset"
                onClick={handleResetFilters}
                variant="secondary"
                className="w-full py-2.5 rounded-xl text-xs font-black uppercase"
              />
            </div>
          </Grid>
        ) : (
          <Grid cols={12} gap={4}>
            {/* Teacher filter */}
            <SelectField
              label="Teacher"
              id="all-filter-teacher"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              placeholder="All Teachers"
              size={8}
            >
              {(teachers || []).map((t) => (
                <Option key={t._id} value={t._id} label={t.name} />
              ))}
            </SelectField>

            {/* Academic Year filter */}
            <SelectField
              label="Academic Year"
              id="all-filter-teacher-year"
              value={filterTeacherYear}
              onChange={(e) => setFilterTeacherYear(e.target.value)}
              placeholder="All Academic Years"
              size={4}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>
          </Grid>
        )}
      </div>

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="animate-spin text-[#223F74]" size={36} />
          <p className="text-sm font-semibold text-slate-500">Retrieving published timetables...</p>
        </div>
      ) : timetables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-100 rounded-[24px] shadow-sm text-center">
          <div className="h-44 w-44 mb-6 text-slate-300 flex items-center justify-center rounded-full bg-slate-50 border border-dashed border-slate-200">
            <FolderOpen size={64} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">No Published Timetables</h3>
          <p className="text-sm text-slate-400 font-medium max-w-sm mb-6">
            Publish a timetable to manage it here.
          </p>
          <Button
            text="Go To Timetable Builder"
            onClick={() => setViewMode("classes")}
            icon={<ArrowRight size={15} />}
            variant="primary"
            className="px-6 rounded-full shadow-md text-xs font-black uppercase"
          />
        </div>
      ) : subTab === "classes" ? (
        <DataTable
          title="Published Timetables"
          columns={columns}
          rows={filteredRows}
          actions={actions}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          size={12}
          searchable={true}
          exportable={true}
          exportFileName="Published_Timetables_Report"
          onRefresh={loadTimetables}
        />
      ) : (
        <DataTable
          title="Teachers Timetable Load"
          columns={[
            { label: "Teacher Name", key: "teacherName", sortable: true },
            { label: "Department", key: "department", sortable: true },
            { label: "Total Lectures", key: "totalLectures", sortable: true },
            { label: "Academic Year", key: "academicYear", sortable: true },
            { label: "Last Updated", key: "lastUpdated", sortable: true }
          ]}
          rows={teacherTimetableData}
          actions={[
            {
              tooltip: "View Teacher Timetable",
              icon: <Eye size={14} className="text-slate-600" />,
              onClick: (row) => {
                setSelectedTeacher(row);
                openModal("view-teacher-timetable-modal");
              }
            }
          ]}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          size={12}
          searchable={true}
          exportable={true}
          exportFileName="Teachers_Timetable_Report"
          onRefresh={loadTimetables}
        />
      )}

      <Modal id="view-published-timetable-modal" title="Weekly Timetable View" size="xl">
        {selectedTimetable && (
          <div className="space-y-6 text-left">
            <div className="space-y-6 p-4 bg-white rounded-2xl" ref={timetableRef}>
              {/* Professional Header */}
              <div className="text-center pb-4 border-b border-slate-100">
                <h2 className="text-xl font-black uppercase text-[#223F74] tracking-wider">
                  {schoolName}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Weekly Class Timetable
                </p>
              </div>

              {/* Header info bar */}
              <div className="grid grid-cols-3 gap-4 p-4.5 bg-[#EEF2FB] border border-[#D8E0F0] rounded-[18px]">
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Class & Section</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedTimetable.className} - Section {selectedTimetable.sectionName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTimetable.academicYear}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Current Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase mt-1 ${
                      selectedTimetable.isActive
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-200 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {selectedTimetable.status}
                  </span>
                </div>
              </div>

            {/* Timetable schedule grid table */}
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white max-h-[50vh] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th
                      className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40 sticky left-0 z-30"
                      style={{ background: NAVY, color: "#fff" }}
                    >
                      Period / Time
                    </th>
                    {DAYS.map((day) => (
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
                  {timetablePeriods.map((period, pi) => (
                    <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td
                        className="py-4.5 px-4 border-b border-r whitespace-nowrap sticky left-0 z-10"
                        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
                      >
                        <p className="text-xs font-black" style={{ color: NAVY }}>
                          {period.name}
                        </p>
                        <p className="text-[10px] font-semibold mt-0.5 text-slate-400">
                          {period.startTime} – {period.endTime}
                        </p>
                        {period.isBreak && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                            Break
                          </span>
                        )}
                      </td>

                      {DAYS.map((day) => {
                        const ds = selectedTimetable.schedule.find(
                          (d) => d.day.toLowerCase() === day.toLowerCase()
                        );
                        const slot = ds?.periods.find((ps) => matchSlot(ps, period));
                        
                        let cellContent = null;
                        let colors = { bg: "transparent", text: NAVY, border: "transparent" };

                        if (slot) {
                          if (slot.isBreak) {
                            colors = getLectureColors("Break");
                            cellContent = (
                              <div className="text-center py-2.5">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                  <Clock size={12} /> {slot.breakLabel || "Break"}
                                </p>
                              </div>
                            );
                          } else if (slot.subject) {
                            colors = getLectureColors(slot.lectureType || "Theory");
                            const subjectNameText = typeof slot.subject === "object"
                              ? (slot.subject.subjectName || slot.subject.name)
                              : (slot.subjectName || slot.subject || "Subject");
                            const teacherNameText = typeof slot.teacher === "object"
                              ? slot.teacher.name
                              : (slot.teacherName || slot.teacher || "TBA");

                            cellContent = (
                              <div className="space-y-1.5 text-left">
                                <div className="flex justify-between items-start gap-1">
                                  <p className="text-xs font-black truncate max-w-[90px]" title={subjectNameText}>
                                    {subjectNameText}
                                  </p>
                                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                    {slot.lectureType || "Theory"}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-600/90 truncate flex items-center gap-1" title={teacherNameText}>
                                  <Users size={11} className="text-slate-400" /> {teacherNameText}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <DoorOpen size={11} className="text-slate-355" /> Room {slot.room || "TBA"}
                                </p>
                              </div>
                            );
                          }
                        }

                        return (
                          <td
                            key={day}
                            className="py-2.5 px-3 border-b border-r"
                            style={{
                              borderColor: "#E2E8F0",
                              verticalAlign: "top",
                              minWidth: 140,
                              background: cellContent ? colors.bg : "transparent"
                            }}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer Controls (Not captured in PDF) */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button
              text="Cancel / Close"
              onClick={() => closeModal("view-published-timetable-modal")}
              variant="secondary"
            />
            <Button
              text="Export Excel"
              onClick={handleExportExcel}
              variant="primary"
              className="px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-tight shadow-md"
              style={{ background: NAVY, color: "#fff" }}
            />
          </div>
        </div>
      )}
    </Modal>

      {/* ── MODAL: VIEW TEACHER GRID READ-ONLY ────────────────────────────────── */}
      <Modal id="view-teacher-timetable-modal" title="Weekly Teacher Timetable View" size="xl">
        {selectedTeacher && (
          <div className="space-y-6 text-left">
            <div className="space-y-6 p-4 bg-white rounded-2xl">
              {/* Professional Header */}
              <div className="text-center pb-4 border-b border-slate-100">
                <h2 className="text-xl font-black uppercase text-[#223F74] tracking-wider">
                  {schoolName}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Weekly Teacher Timetable
                </p>
              </div>

              {/* Header info bar */}
              <div className="grid grid-cols-3 gap-4 p-4.5 bg-[#EEF2FB] border border-[#D8E0F0] rounded-[18px]">
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Teacher Name</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedTeacher.teacherName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTeacher.academicYear}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Department</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTeacher.department}</p>
                </div>
              </div>

              {/* Timetable schedule grid table */}
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white max-h-[50vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-20">
                    <tr>
                      <th
                        className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40 sticky left-0 z-30"
                        style={{ background: NAVY, color: "#fff" }}
                      >
                        Period / Time
                      </th>
                      {DAYS.map((day) => (
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
                    {teacherUniquePeriods.map((period, pi) => (
                      <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td
                          className="py-4.5 px-4 border-b border-r whitespace-nowrap sticky left-0 z-10"
                          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
                        >
                          <p className="text-xs font-black" style={{ color: NAVY }}>
                            {period.name}
                          </p>
                          <p className="text-[10px] font-semibold mt-0.5 text-slate-400">
                            {period.startTime} – {period.endTime}
                          </p>
                          {period.isBreak && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                              Break
                            </span>
                          )}
                        </td>

                        {DAYS.map((day) => {
                          const slots = selectedTeacherScheduleData[day.toLowerCase()] || [];
                          const slot = slots.find((s) => matchSlot(s, period));
                          
                          let cellContent = null;
                          let colors = { bg: "transparent", text: NAVY, border: "transparent" };

                          if (slot) {
                            if (slot.isBreak) {
                              colors = getLectureColors("Break");
                              cellContent = (
                                <div className="text-center py-2.5">
                                  <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                    <Clock size={12} /> {slot.breakLabel || "Break"}
                                  </p>
                                </div>
                              );
                            } else if (slot.subject) {
                              colors = getLectureColors(slot.lectureType || "Theory");
                              const subjectNameText = typeof slot.subject === "object"
                                ? (slot.subject.subjectName || slot.subject.name)
                                : (slot.subjectName || slot.subject || "Subject");
                              const classSectionText = `${slot.className} - ${slot.section || "TBA"}`;
                              const roomText = slot.room || "TBA";
                              const typeText = slot.lectureType || "Theory";

                              cellContent = (
                                <div className="space-y-1.5 text-left">
                                  <div className="flex justify-between items-start gap-1">
                                    <p className="text-xs font-black truncate max-w-[90px]" title={subjectNameText}>
                                      {subjectNameText}
                                    </p>
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                      {typeText}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-600/90 truncate flex items-center gap-1" title={classSectionText}>
                                    <GraduationCap size={11} className="text-slate-400" /> {classSectionText}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                    <DoorOpen size={11} className="text-slate-355" /> Room {roomText}
                                  </p>
                                </div>
                              );
                            }
                          } else if (period.isBreak) {
                            colors = getLectureColors("Break");
                            cellContent = (
                              <div className="text-center py-2.5">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                  <Clock size={12} /> {period.breakLabel || "Break"}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <td
                              key={day}
                              className="py-2.5 px-3 border-b border-r"
                              style={{
                                borderColor: "#E2E8F0",
                                verticalAlign: "top",
                                minWidth: 140,
                                background: cellContent ? colors.bg : "transparent"
                              }}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <Button
                  text="Cancel / Close"
                  onClick={() => closeModal("view-teacher-timetable-modal")}
                  variant="secondary"
                />
                <Button
                  text="Export Excel"
                  onClick={handleExportTeacherExcel}
                  variant="primary"
                  className="px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-tight shadow-md"
                  style={{ background: NAVY, color: "#fff" }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: ACTIVATE CONFIRMATION ──────────────────────────────────────── */}
      <Modal id="activate-confirm-modal" title="Activate Timetable" size="md">
        <div className="space-y-4 text-left">
          <p className="text-sm font-semibold text-slate-600">
            This timetable will become the active timetable for this class & section.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button text="Cancel" onClick={() => closeModal("activate-confirm-modal")} variant="secondary" />
            <Button
              text={togglingStatus ? "Activating..." : "Activate"}
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              variant="primary"
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL: DEACTIVATE CONFIRMATION ────────────────────────────────────── */}
      <Modal id="deactivate-confirm-modal" title="Deactivate Timetable" size="md">
        <div className="space-y-4 text-left">
          <p className="text-sm font-semibold text-slate-600">
            This timetable will no longer be available for students and teachers.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button text="Cancel" onClick={() => closeModal("deactivate-confirm-modal")} variant="secondary" />
            <Button
              text={togglingStatus ? "Deactivating..." : "Deactivate"}
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              variant="primary"
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL: DELETE CONFIRMATION ────────────────────────────────────────── */}
      <Modal id="delete-published-timetable-confirm-modal" title="Delete Timetable" size="md">
        <div className="space-y-4 text-left">
          <p className="text-sm font-semibold text-slate-600">
            This will permanently delete this published timetable. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button text="Cancel" onClick={() => closeModal("delete-published-timetable-confirm-modal")} variant="secondary" />
            <Button
              text={deleting ? "Deleting..." : "Delete"}
              onClick={handleDeleteTimetable}
              disabled={deleting}
              variant="danger"
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL: EDIT ACADEMIC YEAR ─────────────────────────────────────────── */}
      <Modal id="edit-year-modal" title="Update Academic Year" size="md">
        {editYearTimetable && (
          <div className="space-y-6 text-left">
            <div className="space-y-4">
              <SelectField
                label="Academic Year"
                id="edit-year-select"
                value={editYearValue}
                onChange={(e) => setEditYearValue(e.target.value)}
                placeholder="Select Academic Year..."
                size={12}
              >
                {academicYears.map((yr) => (
                  <Option key={yr.label} value={yr.label} label={yr.label} />
                ))}
              </SelectField>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                text="Cancel"
                onClick={() => closeModal("edit-year-modal")}
                variant="secondary"
              />
              <Button
                text={updatingYear ? "Updating..." : "Update Academic Year"}
                onClick={handleUpdateAcademicYear}
                disabled={updatingYear || !editYearValue}
                variant="primary"
                style={{ background: NAVY, color: "#fff" }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
