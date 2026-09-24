import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { selectPrincipal } from "../../../features/auth/principalAuthSlice";
import {
  CalendarDays,
  Loader2,
  Users,
  UserCheck,
  Eye,
  Download,
  DoorOpen,
  Clock,
  BookOpen
} from "lucide-react";
import {
  getPrincipalClassesSections,
  getPrincipalTeacherAssignments,
  getPrincipalTimetables
} from "../../../services/api/principalAcademicsApi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  SelectField,
  Option,
  DataTable,
  Modal,
  openModal,
  closeModal
} from "../../../components/shared/Common_Components";

const NAVY = "#223F74";
const PEACH = "#F59B87";
const TEXT_MUTED = "#64748B";
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

export default function Timetable() {
  const principal = useSelector(selectPrincipal);
  const schoolName = principal?.school?.schoolName || principal?.school?.name || "Graphura School Management ERP";

  const [timetables, setTimetables] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // View SubTab
  const [subTab, setSubTab] = useState("classes"); // "classes" | "teachers"

  // Filter States
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Modals Target States
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Derived sections list for Class dropdown filter
  const availableSections = useMemo(() => {
    if (!selectedClassId) return [];
    const matchingClass = allClasses.find(
      (c) => String(c.id || c._id) === String(selectedClassId)
    );
    return matchingClass ? matchingClass.sections || [] : [];
  }, [allClasses, selectedClassId]);

  // Load Bootstrap Data (Classes, Teachers, and Timetables)
  const fetchBootstrap = async () => {
    try {
      setLoading(true);
      const [classRes, teacherRes, timetablesRes] = await Promise.all([
        getPrincipalClassesSections(),
        getPrincipalTeacherAssignments(),
        getPrincipalTimetables()
      ]);

      const rawTimetables = timetablesRes?.data || [];
      // Filter out only active/published timetables
      const publishedOnly = rawTimetables.filter(t => t.isActive || t.isPublished).map(tt => {
        const totalPeriods = tt.schedule && tt.schedule[0] ? tt.schedule[0].periods.length : 0;
        let totalLectures = 0;
        if (tt.schedule) {
          for (const day of tt.schedule) {
            if (!day.isWorkingDay) continue;
            for (const p of day.periods) {
              if (!p.isBreak && p.subject && p.teacher) {
                totalLectures++;
              }
            }
          }
        }
        return {
          _id: tt._id,
          classId: tt.class?._id || tt.class,
          className: tt.class?.name || "Unknown Class",
          sectionName: tt.section || "",
          academicYear: tt.academicYear,
          totalPeriods,
          totalLectures,
          status: tt.isActive ? "Active" : "Inactive",
          publishedAt: tt.updatedAt || tt.createdAt,
          publishedBy: tt.createdBy?.name || "System",
          isActive: tt.isActive,
          schedule: tt.schedule
        };
      });
      setTimetables(publishedOnly);

      const rawClasses = classRes?.data || [];
      const publishedClassIds = new Set(publishedOnly.map(t => String(t.classId)));
      const classesWithTimetable = rawClasses.filter(c => publishedClassIds.has(String(c.id || c._id)));

      const sortedClasses = [...classesWithTimetable].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" })
      );
      setAllClasses(sortedClasses);

      const rawTeachers = teacherRes?.data?.teachers || [];
      setTeachers(rawTeachers);


      // Derive academic years list from published timetables or default list
      const years = [...new Set(publishedOnly.map(t => t.academicYear))];
      if (years.length === 0) {
        const today = new Date();
        const currentYearNum = today.getFullYear();
        const isBeforeApril = today.getMonth() < 3;
        const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
        years.push(`${startYear}-${startYear + 1}`);
      }
      const yearsList = years.map(y => ({ label: y, isCurrent: true }));
      setAcademicYears(yearsList);

      // Set defaults
      if (yearsList.length > 0) {
        setSelectedYear(yearsList[0].label);
      }
      if (sortedClasses.length > 0) {
        setSelectedClassId(sortedClasses[0].id || sortedClasses[0]._id);
        const secs = sortedClasses[0].sections || [];
        if (secs.length > 0) {
          setSelectedSection(secs[0].name);
        }
      }
      if (rawTeachers.length > 0) {
        setSelectedTeacherId(rawTeachers[0]._id || rawTeachers[0].id);
      }

    } catch (error) {
      console.error("Bootstrap load error:", error);
      toast.error("Failed to load timetable data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, []);

  // Update default section when class filter changes
  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    const matchingClass = allClasses.find(
      (c) => String(c.id || c._id) === String(newClassId)
    );
    const sections = matchingClass?.sections || [];
    if (sections.length > 0) {
      setSelectedSection(sections[0].name);
    } else {
      setSelectedSection("");
    }
  };

  // Derive unique period configurations across all published timetables
  const allUniquePeriods = useMemo(() => {
    const periodMap = {};
    timetables.forEach(tt => {
      if (tt.schedule) {
        tt.schedule.forEach(day => {
          if (day.periods) {
            day.periods.forEach(p => {
              const key = `${p.startTime}-${p.endTime}`;
              if (!periodMap[key]) {
                periodMap[key] = {
                  name: p.isBreak ? (p.breakLabel || "Break") : `Period ${p.periodNumber}`,
                  startTime: p.startTime,
                  endTime: p.endTime,
                  isBreak: p.isBreak,
                  breakLabel: p.breakLabel,
                  periodNumber: p.periodNumber
                };
              }
            });
          }
        });
      }
    });
    return Object.values(periodMap).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetables]);

  // Statistics derived indicators
  const stats = useMemo(() => {
    const published = timetables.filter(t => t.isActive).length;
    let totalLectures = 0;
    const uniqueRooms = new Set();
    const uniqueTeachers = new Set();

    timetables.forEach(t => {
      if (t.isActive && t.schedule) {
        t.schedule.forEach(day => {
          if (day.periods) {
            day.periods.forEach(p => {
              if (!p.isBreak && p.subject && p.teacher) {
                totalLectures++;
                if (p.room) uniqueRooms.add(String(p.room).trim().toLowerCase());
                const teacherIdStr = typeof p.teacher === "object" ? p.teacher._id : p.teacher;
                if (teacherIdStr) uniqueTeachers.add(String(teacherIdStr));
              }
            });
          }
        });
      }
    });

    return {
      totalLectures,
      teachersOccupied: uniqueTeachers.size,
      roomsOccupied: uniqueRooms.size,
      published
    };
  }, [timetables]);

  // Currently loaded timetable in Weekly grid for Class View tab
  const currentTimetable = useMemo(() => {
    if (subTab !== "classes" || !selectedClassId || !selectedSection || !selectedYear) return null;
    return timetables.find(
      (t) =>
        String(t.classId) === String(selectedClassId) &&
        String(t.sectionName).toLowerCase() === String(selectedSection).toLowerCase() &&
        t.academicYear === selectedYear
    );
  }, [timetables, subTab, selectedClassId, selectedSection, selectedYear]);

  // Filtered rows for Class DataTable
  const filteredClassRows = useMemo(() => {
    return timetables.filter(row => {
      if (selectedYear && row.academicYear !== selectedYear) return false;
      if (selectedClassId && String(row.classId || "") !== String(selectedClassId)) return false;
      if (selectedSection && row.sectionName !== selectedSection) return false;
      return true;
    });
  }, [timetables, selectedYear, selectedClassId, selectedSection]);

  // Teacher Schedule Data aggregates derived for selected year & teacher
  const selectedTeacherScheduleData = useMemo(() => {
    if (!selectedTeacherId || !selectedYear) return {};
    const daySlots = {};
    DAYS.forEach(d => { daySlots[d] = []; });

    timetables.forEach(tt => {
      if (tt.schedule && tt.academicYear === selectedYear) {
        tt.schedule.forEach(ds => {
          const dayName = ds.day.toLowerCase();
          if (daySlots[dayName]) {
            ds.periods.forEach(p => {
              const pTeacherId = p.teacher?._id || p.teacher;
              if (pTeacherId && String(pTeacherId) === String(selectedTeacherId)) {
                daySlots[dayName].push({
                  ...p,
                  className: tt.className || tt.class?.name || "Unknown",
                  section: tt.sectionName || tt.section
                });
              }
            });
          }
        });
      }
    });
    return daySlots;
  }, [selectedTeacherId, selectedYear, timetables]);

  const hasAnyPeriods = useMemo(() => {
    return Object.values(selectedTeacherScheduleData).some(slots => slots.some(s => s.subject));
  }, [selectedTeacherScheduleData]);

  // Compile teacher weekly load records list for Teacher DataTable
  const teacherTimetableData = useMemo(() => {
    if (subTab !== "teachers") return [];
    
    const relevantTimetables = timetables.filter(t => {
      if (selectedYear && t.academicYear !== selectedYear) return false;
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
        : (selectedYear || "N/A");

      return {
        _id: teacher._id,
        teacherName: teacher.name,
        department: teacher.department || "Academics",
        totalLectures,
        academicYear: yearsStr,
        lastUpdated: lastUpdatedStr,
        teacherObj: teacher,
        status: totalLectures > 0 ? "Scheduled" : "No Load"
      };
    });

    if (selectedTeacherId) {
      result = result.filter(item => String(item._id) === String(selectedTeacherId));
    }

    return result;
  }, [subTab, timetables, teachers, selectedTeacherId, selectedYear]);

  // Period config for modal or active timetable
  const timetablePeriods = useMemo(() => {
    if (!selectedTimetable || !selectedTimetable.schedule) return [];
    const periodMap = {};
    selectedTimetable.schedule.forEach(day => {
      if (day.periods) {
        day.periods.forEach(p => {
          const key = `${p.startTime}-${p.endTime}`;
          if (!periodMap[key]) {
            periodMap[key] = {
              name: p.isBreak ? (p.breakLabel || "Break") : `Period ${p.periodNumber}`,
              startTime: p.startTime,
              endTime: p.endTime,
              isBreak: p.isBreak,
              breakLabel: p.breakLabel,
              periodNumber: p.periodNumber
            };
          }
        });
      }
    });
    return Object.values(periodMap).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedTimetable]);

  // Export Class Weekly Timetable to Excel
  const handleExportExcel = (tt) => {
    if (!tt) return;
    try {
      const classNameVal = tt.className;
      const sectionNameVal = tt.sectionName;
      const academicYearVal = tt.academicYear;
      const statusVal = tt.status;

      // ── SHEET 1: WEEKLY TIMETABLE ──
      const sheet1Data = [
        [schoolName.toUpperCase()],
        ["WEEKLY CLASS TIMETABLE"],
        [],
        ["School Name:", schoolName],
        ["Class:", classNameVal],
        ["Section:", sectionNameVal],
        ["Academic Year:", academicYearVal],
        ["Status:", statusVal],
        ["Generated On:", new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
        [],
        ["Period", "Timing", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      ];

      // Extract unique periods from this timetable's schedule
      const periodMap = {};
      tt.schedule.forEach(day => {
        if (day.periods) {
          day.periods.forEach(p => {
            const key = `${p.startTime}-${p.endTime}`;
            if (!periodMap[key]) {
              periodMap[key] = {
                name: p.isBreak ? (p.breakLabel || "Break") : `Period ${p.periodNumber}`,
                startTime: p.startTime,
                endTime: p.endTime,
                isBreak: p.isBreak,
                breakLabel: p.breakLabel,
                periodNumber: p.periodNumber
              };
            }
          });
        }
      });
      const tPeriods = Object.values(periodMap).sort((a, b) => a.startTime.localeCompare(b.startTime));

      tPeriods.forEach((period) => {
        const row = [period.name, `${period.startTime} - ${period.endTime}`];
        
        DAYS.forEach((day) => {
          const ds = tt.schedule.find(
            (d) => d.day.toLowerCase() === day.toLowerCase()
          );
          const slot = ds?.periods.find((ps) => ps.startTime === period.startTime);
          
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

      // Freeze rows
      ws1["!views"] = [{ state: "frozen", ySplit: 11 }];

      // ── SHEET 2: LECTURE DETAILS ──
      const sheet2Data = [
        ["Day", "Period", "Timing", "Subject", "Teacher", "Room Number", "Lecture Type", "Status", "Break Slot"]
      ];

      DAYS.forEach((day) => {
        const ds = tt.schedule.find(
          (d) => d.day.toLowerCase() === day.toLowerCase()
        );
        
        tPeriods.forEach((period) => {
          const slot = ds?.periods.find((ps) => ps.startTime === period.startTime);
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

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Weekly Timetable");
      XLSX.utils.book_append_sheet(wb, ws2, "Lecture Details");

      const cleanClassName = classNameVal.replace(/\s+/g, "");
      const cleanSectionName = sectionNameVal.replace(/\s+/g, "");
      const finalFileName = `${cleanClassName}_${cleanSectionName}_${academicYearVal}_WeeklyTimetable.xlsx`;

      XLSX.writeFile(wb, finalFileName);
      toast.success("Excel exported successfully");
    } catch (err) {
      console.error("Excel generation failed:", err);
      toast.error("Failed to generate Excel report");
    }
  };

  // Export Teacher Weekly Timetable to Excel
  const handleExportTeacherExcel = (tRow, tSchedule) => {
    if (!tRow || !tSchedule) return;
    try {
      const teacherNameVal = tRow.teacherName;
      const deptVal = tRow.department || "Academics";
      const academicYearVal = selectedYear || "N/A";
      const statusVal = "Active";

      // ── SHEET 1: WEEKLY TIMETABLE ──
      const sheet1Data = [
        [schoolName.toUpperCase()],
        ["WEEKLY TEACHER TIMETABLE"],
        [],
        ["School Name:", schoolName],
        ["Teacher Name:", teacherNameVal],
        ["Department:", deptVal],
        ["Academic Year:", academicYearVal],
        ["Status:", statusVal],
        ["Generated On:", new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
        [],
        ["Period", "Timing", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      ];

      allUniquePeriods.forEach((period) => {
        const row = [period.name, `${period.startTime} - ${period.endTime}`];
        
        DAYS.forEach((day) => {
          const slots = tSchedule[day.toLowerCase()] || [];
          const slot = slots.find((s) => s.startTime === period.startTime);
          
          if (slot) {
            if (slot.isBreak) {
              row.push(slot.breakLabel?.toUpperCase() === "LUNCH" ? "🍽 LUNCH" : slot.breakLabel || "BREAK");
            } else if (slot.subject) {
              const subjectNameText = typeof slot.subject === "object"
                ? (slot.subject.subjectName || slot.subject.name)
                : (slot.subject || "Subject");
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

      // Freeze rows
      ws1["!views"] = [{ state: "frozen", ySplit: 11 }];

      // ── SHEET 2: LECTURE DETAILS ──
      const sheet2Data = [
        ["Day", "Period", "Timing", "Subject", "Class & Section", "Room Number", "Lecture Type", "Status", "Break Slot"]
      ];

      DAYS.forEach((day) => {
        const slots = tSchedule[day.toLowerCase()] || [];
        
        allUniquePeriods.forEach((period) => {
          const slot = slots.find((s) => s.startTime === period.startTime);
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
                : (slot.subject || "Subject");
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

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Weekly Timetable");
      XLSX.utils.book_append_sheet(wb, ws2, "Lecture Details");

      const cleanTeacherName = teacherNameVal.replace(/\s+/g, "");
      const finalFileName = `${cleanTeacherName}_${academicYearVal}_WeeklyTimetable.xlsx`;

      XLSX.writeFile(wb, finalFileName);
      toast.success("Excel exported successfully");
    } catch (err) {
      console.error("Excel generation failed:", err);
      toast.error("Failed to generate Excel report");
    }
  };

  // Helper trigger for main page active grid export
  const handleExportExcelMain = () => {
    if (subTab === "classes") {
      handleExportExcel(currentTimetable);
    } else {
      const activeTeacherRow = teacherTimetableData.find(t => String(t._id) === String(selectedTeacherId));
      if (activeTeacherRow) {
        handleExportTeacherExcel(activeTeacherRow, selectedTeacherScheduleData);
      }
    }
  };

  // Segmented control definitions
  const options = [
    { key: "classes", label: "Class Weekly View", icon: <Users size={14} /> },
    { key: "teachers", label: "Teacher Weekly View", icon: <UserCheck size={14} /> }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#223F74] animate-spin mb-2" />
        <span className="text-sm font-semibold text-slate-500">Loading timetable modules...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left animate-in fade-in duration-300">
      {/* Hero Header */}
      <Heading
        primaryText="Timetable"
        secondaryText="Viewer"
        showAnimations={true}
        size={12}
      />

      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Published"
          value={String(stats.published)}
          icon={<CalendarDays size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Weekly Lectures"
          value={String(stats.totalLectures)}
          icon={<Users size={20} />}
          accentColor="#E88F80"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Occupied Classrooms"
          value={String(stats.roomsOccupied)}
          icon={<UserCheck size={20} />}
          accentColor="#7FC7B9"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Occupied Teachers"
          value={String(stats.teachersOccupied)}
          icon={<BookOpen size={20} />}
          accentColor="#8BB8E8"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* ── SEGMENTED TAB SWITCH ────────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto whitespace-nowrap scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="flex w-max md:w-full p-1 rounded-full gap-1 bg-white border border-slate-200/80"
          style={{ background: "#EEF2FB", border: `1px solid #D8E0F0` }}
        >
          {options.map(opt => {
            const active = subTab === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSubTab(opt.key)}
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

      {/* ── FILTERS PANEL ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm">
        {subTab === "classes" ? (
          <Grid cols={12} gap={4}>
            <SelectField
              label="Academic Year"
              id="filter-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              size={4}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>

            <SelectField
              label="Class"
              id="filter-class"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              size={4}
            >
              {allClasses.map((c) => (
                <Option key={c.id || c._id} value={c.id || c._id} label={c.name} />
              ))}
            </SelectField>

            <SelectField
              label="Section"
              id="filter-section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              size={4}
            >
              {availableSections.map((sec) => (
                <Option key={sec.name} value={sec.name} label={sec.name} />
              ))}
            </SelectField>
          </Grid>
        ) : (
          <Grid cols={12} gap={4}>
            <SelectField
              label="Teacher"
              id="filter-teacher"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              size={8}
            >
              {teachers.map((t) => (
                <Option key={t._id} value={t._id} label={t.name} />
              ))}
            </SelectField>

            <SelectField
              label="Academic Year"
              id="filter-teacher-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              size={4}
            >
              {academicYears.map((yr) => (
                <Option key={yr.label} value={yr.label} label={yr.label} />
              ))}
            </SelectField>
          </Grid>
        )}
      </div>

      {/* ── WEEKLY TIMETABLE GRID VIEW (Main panel) ─────────────────────────── */}
      {subTab === "classes" ? (
        <div className="w-full overflow-x-auto rounded-[24px] border border-slate-200 shadow-sm bg-white p-6">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Weekly Schedule Grid</h3>
              <p className="text-xs text-slate-500">Showing schedule for selected class, section and academic year</p>
            </div>
            <button
              onClick={handleExportExcelMain}
              disabled={!currentTimetable}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl font-bold text-xs uppercase transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Export Excel
            </button>
          </div>

          {currentTimetable ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40" style={{ background: NAVY, color: "#fff" }}>
                      Period / Time
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="py-4.5 px-3 text-center text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ background: NAVY, color: "#fff" }}>
                        {capitalize(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUniquePeriods.map((period, pi) => (
                    <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-4.5 px-4 border-b border-r whitespace-nowrap" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                        <p className="text-xs font-black" style={{ color: NAVY }}>{period.name}</p>
                        <p className="text-[10px] font-semibold mt-0.5 text-slate-400">{period.startTime} – {period.endTime}</p>
                        {period.isBreak && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                            Break
                          </span>
                        )}
                      </td>
                      {DAYS.map((day) => {
                        const ds = currentTimetable.schedule.find(
                          (d) => d.day.toLowerCase() === day.toLowerCase()
                        );
                        const slot = ds?.periods.find((ps) => ps.startTime === period.startTime);
                        let cellContent = null;

                        if (slot) {
                          if (slot.isBreak) {
                            const colors = getLectureColors("Break");
                            cellContent = (
                              <div className="text-center py-2.5">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                  <Clock size={12} /> {slot.breakLabel || "Break"}
                                </p>
                              </div>
                            );
                          } else if (slot.subject) {
                            const colors = getLectureColors(slot.lectureType || "Theory");
                            const subjectNameText = typeof slot.subject === "object"
                              ? (slot.subject.subjectName || slot.subject.name)
                              : (slot.subject || "Subject");
                            const teacherNameText = typeof slot.teacher === "object"
                              ? slot.teacher.name
                              : (slot.teacher || "TBA");

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
                          <td key={day} className="py-3 px-3 border-b border-r text-center align-middle whitespace-nowrap" style={{ borderColor: "#E2E8F0" }}>
                            {cellContent || <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-medium text-sm">
              No timetable template active for this Class/Section selection.
            </div>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-[24px] border border-slate-200 shadow-sm bg-white p-6">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Weekly Teacher Grid</h3>
              <p className="text-xs text-slate-500">Showing consolidated weekly schedule load for selected teacher</p>
            </div>
            <button
              onClick={handleExportExcelMain}
              disabled={!selectedTeacherId || !hasAnyPeriods}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl font-bold text-xs uppercase transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Export Excel
            </button>
          </div>

          {selectedTeacherId && hasAnyPeriods ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40" style={{ background: NAVY, color: "#fff" }}>
                      Period / Time
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="py-4.5 px-3 text-center text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ background: NAVY, color: "#fff" }}>
                        {capitalize(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUniquePeriods.map((period, pi) => (
                    <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-4.5 px-4 border-b border-r whitespace-nowrap" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                        <p className="text-xs font-black" style={{ color: NAVY }}>{period.name}</p>
                        <p className="text-[10px] font-semibold mt-0.5 text-slate-400">{period.startTime} – {period.endTime}</p>
                      </td>
                      {DAYS.map((day) => {
                        const slots = selectedTeacherScheduleData[day.toLowerCase()] || [];
                        const slot = slots.find((s) => s.startTime === period.startTime);
                        let cellContent = null;

                        if (slot) {
                          if (slot.isBreak) {
                            cellContent = <span className="text-xs font-black uppercase text-amber-600">Break</span>;
                          } else if (slot.subject) {
                            const colors = getLectureColors(slot.lectureType || "Theory");
                            const subjectNameText = typeof slot.subject === "object"
                              ? (slot.subject.subjectName || slot.subject.name)
                              : (slot.subject || "Subject");
                            cellContent = (
                              <div className="space-y-1 text-left">
                                <div className="flex justify-between items-start gap-1">
                                  <p className="text-xs font-black truncate max-w-[90px]" title={subjectNameText}>{subjectNameText}</p>
                                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                    {slot.lectureType || "Theory"}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-600/90">{slot.className} - {slot.section}</p>
                                <p className="text-[9px] font-bold text-slate-400">Room {slot.room || "TBA"}</p>
                              </div>
                            );
                          }
                        }

                        return (
                          <td key={day} className="py-3 px-3 border-b border-r text-center align-middle whitespace-nowrap" style={{ borderColor: "#E2E8F0" }}>
                            {cellContent || <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-medium text-sm">
              {selectedTeacherId ? "No load schedule found for chosen teacher in this academic year." : "Select Teacher and Academic Year to load weekly grid."}
            </div>
          )}
        </div>
      )}

      {/* ── DETAILED TABLE VIEW (Below grid) ────────────────────────────────── */}
      {subTab === "classes" ? (
        <DataTable
          title="Published Timetables"
          columns={[
            { label: "Class", key: "className", sortable: true },
            { label: "Section", key: "sectionName", sortable: true },
            { label: "Academic Year", key: "academicYear", sortable: true },
            { label: "Periods", key: "totalPeriods", sortable: true },
            { label: "Lectures", key: "totalLectures", sortable: true },
            {
              label: "Status",
              key: "status",
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
          ]}
          rows={filteredClassRows}
          actions={[
            {
              tooltip: "View Class Timetable",
              icon: <Eye size={14} className="text-slate-600" />,
              onClick: (row) => {
                setSelectedTimetable(row);
                openModal("view-published-timetable-modal");
              }
            }
          ]}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          size={12}
          searchable={true}
          exportable={true}
          exportFileName="Published_Timetables_Report"
        />
      ) : (
        <DataTable
          title="Teachers Timetable Load"
          columns={[
            { label: "Teacher Name", key: "teacherName", sortable: true },
            { label: "Department", key: "department", sortable: true },
            { label: "Weekly Lectures", key: "totalLectures", sortable: true },
            { label: "Academic Year", key: "academicYear", sortable: true },
            {
              label: "Status",
              key: "status",
              render: (row) => {
                const isScheduled = row.totalLectures > 0;
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isScheduled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isScheduled ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {row.status}
                  </span>
                );
              }
            }
          ]}
          rows={teacherTimetableData}
          actions={[
            {
              tooltip: "View Teacher Timetable",
              icon: <Eye size={14} className="text-slate-600" />,
              onClick: (row) => {
                const schedule = {};
                DAYS.forEach(d => { schedule[d] = []; });
                timetables.forEach(tt => {
                  const isYearMatch = row.academicYear.includes(tt.academicYear);
                  if (tt.schedule && isYearMatch) {
                    tt.schedule.forEach(ds => {
                      const dayName = ds.day.toLowerCase();
                      if (schedule[dayName]) {
                        ds.periods.forEach(p => {
                          const pTeacherId = p.teacher?._id || p.teacher;
                          if (pTeacherId && String(pTeacherId) === String(row._id)) {
                            schedule[dayName].push({
                              ...p,
                              className: tt.className || tt.class?.name || "Unknown",
                              section: tt.sectionName || tt.section
                            });
                          }
                        });
                      }
                    });
                  }
                });
                setSelectedTeacher({
                  ...row,
                  schedule
                });
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
        />
      )}

      {/* ── VIEW MODALS (Read-Only) ─────────────────────────────────────────── */}
      <Modal id="view-published-timetable-modal" title="Weekly Timetable View" size="xl">
        {selectedTimetable && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="space-y-6 p-4 bg-white rounded-2xl">
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
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th
                        className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40"
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
                          className="py-4.5 px-4 border-b border-r whitespace-nowrap"
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
                          const slot = ds?.periods.find((ps) => ps.startTime === period.startTime);
                          
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
                              className="p-2 border-b border-r text-center align-middle whitespace-nowrap min-w-32"
                              style={{
                                borderColor: "#E2E8F0",
                                background: colors.bg,
                                color: colors.text,
                              }}
                            >
                              {cellContent || <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleExportExcel(selectedTimetable)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm"
              >
                <Download size={14} /> Export Excel
              </button>
              <button
                onClick={() => closeModal("view-published-timetable-modal")}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal id="view-teacher-timetable-modal" title="Weekly Teacher Timetable View" size="xl">
        {selectedTeacher && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
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
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTeacher.teacherName}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Department</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTeacher.department}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTeacher.academicYear}</p>
                </div>
              </div>

              {/* Teacher Schedule Table */}
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th
                        className="py-4.5 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap w-40"
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
                    {allUniquePeriods.map((period, pi) => (
                      <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td
                          className="py-4.5 px-4 border-b border-r whitespace-nowrap"
                          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
                        >
                          <p className="text-xs font-black" style={{ color: NAVY }}>
                            {period.name}
                          </p>
                          <p className="text-[10px] font-semibold mt-0.5 text-slate-400">
                            {period.startTime} – {period.endTime}
                          </p>
                        </td>

                        {DAYS.map((day) => {
                          const slots = selectedTeacher.schedule[day.toLowerCase()] || [];
                          const slot = slots.find((s) => s.startTime === period.startTime);
                          
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
                                : (slot.subject || "Subject");
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
                                  <p className="text-[10px] font-bold text-slate-600/90 truncate">
                                    {slot.className} - {slot.section}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400">Room {slot.room || "TBA"}</p>
                                </div>
                              );
                            }
                          } else {
                            if (period.isBreak) {
                              colors = getLectureColors("Break");
                              cellContent = (
                                <div className="text-center py-2.5">
                                  <p className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center justify-center gap-1">
                                    <Clock size={12} /> {period.breakLabel || "Break"}
                                  </p>
                                </div>
                              );
                            }
                          }

                          return (
                            <td
                              key={day}
                              className="p-2 border-b border-r text-center align-middle whitespace-nowrap min-w-32"
                              style={{
                                borderColor: "#E2E8F0",
                                background: colors.bg,
                                color: colors.text,
                              }}
                            >
                              {cellContent || <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleExportTeacherExcel(selectedTeacher, selectedTeacher.schedule)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#223F74] hover:bg-[#1a3059] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm"
              >
                <Download size={14} /> Export Excel
              </button>
              <button
                onClick={() => closeModal("view-teacher-timetable-modal")}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}