import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { 
  Users, UserCheck, UserX, Eye, CalendarCheck, Clock, FileText, CheckCircle, XCircle, Download, Search
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option, PanelModal, GColumnChart, GPieChart
} from '../../../components/shared/Common_Components';
import api from '../../../services/api';
import { getStudentById } from '../../../services/api/adminStudentApi';

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

const classOrder = ["nursery", "junior kg", "senior kg", "lkg", "ukg"];

const sortClasses = (classesList) => {
  return [...classesList].sort((a, b) => {
    const nameA = (a.name || '').trim().toLowerCase();
    const nameB = (b.name || '').trim().toLowerCase();

    const idxA = classOrder.indexOf(nameA);
    const idxB = classOrder.indexOf(nameB);

    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    // Extract numeric part if name is like "Class X" or "Grade X"
    const matchA = nameA.match(/(?:class|grade)\s*(\d+)/i);
    const matchB = nameB.match(/(?:class|grade)\s*(\d+)/i);

    if (matchA && matchB) {
      return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
    }
    if (matchA) return -1;
    if (matchB) return 1;

    return nameA.localeCompare(nameB);
  });
};

// Global module-level cache for instant page switching
let academicYearsCache = null;
let globalStudentsCache = null;
const classesCache = {}; // schoolId -> academicYear -> classes
const rawAttendanceCache = {}; // schoolId -> academicYear -> rawAttendance
const rawLeavesCache = {}; // schoolId -> academicYear -> rawLeaves
const reportsCache = {}; // cacheKey -> reportData
const studentDetailsApiCache = {}; // studentId -> studentDetailsData
const filtersCache = {
  activeTab: '',
  academicYear: '',
  classFilter: '',
  sectionFilter: '',
  dateFilter: '',
  customStartDate: '',
  customEndDate: '',
  sections: []
};

const formatDateReadable = (dateStr) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }
  const day = parts[2].padStart(2, '0');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[monthIdx] || parts[1];
  const year = parts[0];
  return `${day} ${month} ${year}`;
};

const formatDateReadableShort = (dateStr) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const day = parts[2].padStart(2, '0');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[monthIdx] || parts[1];
  return `${day} ${month}`;
};

const formatMarkedTime = (timestamp) => {
  if (!timestamp) return "—";
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) return "—";
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const getAcademicYearDates = (yearStr) => {
  if (!yearStr || yearStr === 'All Academic Years') {
    const today = new Date();
    return {
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: new Date(today.getFullYear(), 11, 31)
    };
  }
  
  const clean = yearStr.trim().replace(/[\u2013\u2014]/g, "-");
  const parts = clean.split("-");
  if (parts.length === 2) {
    const startYearStr = parts[0].trim();
    let endYearStr = parts[1].trim();
    if (startYearStr.length === 4) {
      let startYear = parseInt(startYearStr, 10);
      let endYear = parseInt(endYearStr, 10);
      if (endYearStr.length === 2) {
        const century = startYearStr.slice(0, 2);
        endYear = parseInt(`${century}${endYearStr}`, 10);
      }
      return {
        startDate: new Date(startYear, 3, 1), // April 1st
        endDate: new Date(endYear, 2, 31)     // March 31st
      };
    }
  }
  
  const today = new Date();
  return {
    startDate: new Date(today.getFullYear(), 0, 1),
    endDate: new Date(today.getFullYear(), 11, 31)
  };
};

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDateRange = (filter, customStart, customEnd, academicYear) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let startD = new Date(0);
  let endD = new Date("2100-01-01");

  if (filter === 'Today') {
      startD = new Date(today);
      endD = new Date(today);
  } else if (filter === 'Yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      startD = new Date(yest);
      endD = new Date(yest);
  } else if (filter === 'This Week') {
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      startD = new Date(today);
      startD.setDate(today.getDate() + distanceToMonday);
      endD = new Date(startD);
      endD.setDate(startD.getDate() + 6);
  } else if (filter === 'This Month') {
      startD = new Date(today.getFullYear(), today.getMonth(), 1);
      endD = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (filter === 'Last Month') {
      let year = today.getFullYear();
      let prevMonth = today.getMonth() - 1;
      if (prevMonth < 0) {
          prevMonth = 11;
          year = year - 1;
      }
      startD = new Date(year, prevMonth, 1);
      endD = new Date(year, prevMonth + 1, 0);
  } else if (filter === 'This Year') {
      const acDates = getAcademicYearDates(academicYear);
      startD = acDates.startDate;
      endD = acDates.endDate;
  } else if (filter === 'Custom Date') {
      if (customStart) {
        startD = new Date(customStart);
        startD.setHours(0,0,0,0);
      }
      if (customEnd) {
        endD = new Date(customEnd);
        endD.setHours(23,59,59,999);
      }
  }
  
  return {
    startDate: formatLocalDate(startD),
    endDate: formatLocalDate(endD)
  };
};

const deduplicateAttendance = (attendanceList) => {
  const seen = new Map();
  const result = [];
  for (const item of attendanceList) {
    const studentId = item.studentId || item.student?._id || item.student?.id || item.student;
    const date = item.date;
    if (!studentId || !date) {
      result.push(item);
      continue;
    }
    const key = `${studentId}_${date}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      const studentObj = item.student || {};
      const rollNo = item.rollNo && item.rollNo !== '-' ? item.rollNo : (studentObj.rollNo || studentObj.rollNumber || item.rollNumber || '-');
      const name = item.name && item.name !== 'Unknown' ? item.name : (studentObj.name || 'Unknown');
      const admissionNo = item.admissionNo && item.admissionNo !== '-' ? item.admissionNo : (studentObj.admissionNo || '-');
      const className = item.className && item.className !== '-' ? item.className : (item.class?.name || '-');
      const section = item.section || '-';
      const markedAt = item.markedAt || item.createdAt || item.updatedAt || null;
      
      result.push({
        ...item,
        name,
        rollNo,
        admissionNo,
        className,
        section,
        markedAtTime: formatMarkedTime(markedAt)
      });
    }
  }
  return result;
};

const getStudentId = (item) => {
  if (!item) return null;
  if (item.student?._id) return String(item.student._id);
  if (typeof item.student === 'string') return item.student;
  if (item.studentId) return String(item.studentId);
  if (item.userId) return String(item.userId);
  if (item.admissionNo) return String(item.admissionNo);
  if (item.admissionNumber) return String(item.admissionNumber);
  if (item.student?.id) return String(item.student.id);
  if (item.student?.admissionNo) return String(item.student.admissionNo);
  if (item.student?.admissionNumber) return String(item.student.admissionNumber);
  return null;
};

const getAdmissionNumber = (student, record) => {
  if (student) {
    if (student.admissionNo) return student.admissionNo;
    if (student.enrollmentNo) return student.enrollmentNo;
    if (student.admissionNumber) return student.admissionNumber;
    if (student.admissionId) return student.admissionId;
    if (student.admission?.admissionNumber) return student.admission.admissionNumber;
  }
  if (record) {
    if (record.admissionNo && record.admissionNo !== '-') return record.admissionNo;
    if (record.admissionNumber && record.admissionNumber !== '-') return record.admissionNumber;
    if (record.student?.admissionNumber) return record.student.admissionNumber;
    if (record.student?.admissionNo) return record.student.admissionNo;
  }
  return '—';
};

const getRollNumber = (student, record) => {
  if (student) {
    if (student.rollNumber) return student.rollNumber;
    if (student.rollNo) return student.rollNo;
    if (student.academicDetails?.rollNumber) return student.academicDetails.rollNumber;
    if (student.currentAcademicDetails?.rollNumber) return student.currentAcademicDetails.rollNumber;
  }
  if (record) {
    if (record.rollNo && record.rollNo !== '-') return record.rollNo;
    if (record.rollNumber && record.rollNumber !== '-') return record.rollNumber;
    if (record.student?.rollNumber) return record.student.rollNumber;
    if (record.student?.rollNo) return record.student.rollNo;
  }
  return '—';
};

const getAcademicSession = (student, record) => {
  const extractName = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.name || val.sessionName || val.year || null;
    }
    return null;
  };

  if (student) {
    let val = extractName(student.academicSession) || 
                extractName(student.academicYear) || 
                extractName(student.session) || 
                extractName(student.currentAcademicSession);
    if (val) return val;
  }
  if (record) {
    let val = extractName(record.academicSession) || 
                extractName(record.academicYear) || 
                extractName(record.student?.academicSession) || 
                extractName(record.student?.academicYear);
    if (val) return val;
  }
  return '—';
};

const findMatchedStudent = (attendanceStudentId, students, name, admissionNo) => {
  if (!students || !Array.isArray(students)) return null;
  
  // 1. Try exact ID matching first
  if (attendanceStudentId) {
    const match = students.find(student => {
      if (String(student._id) === String(attendanceStudentId)) return true;
      
      const sId = student.studentId?._id || student.studentId;
      if (sId && String(sId) === String(attendanceStudentId)) return true;
      
      const uId = student.userId?._id || student.userId || student.user?._id || student.user;
      if (uId && String(uId) === String(attendanceStudentId)) return true;
      
      return false;
    });
    if (match) return match;
  }
  
  // 2. Try matching by admission number
  if (admissionNo && admissionNo !== '-') {
    const match = students.find(student => {
      const sAdm = student.admissionNo || student.enrollmentNo || student.admissionNumber;
      return sAdm && String(sAdm).toLowerCase() === String(admissionNo).toLowerCase();
    });
    if (match) return match;
  }
  
  // 3. Try matching by name (case-insensitive)
  if (name && name !== 'Unknown') {
    const match = students.find(student => {
      const sName = student.name || student.user?.name;
      return sName && String(sName).toLowerCase().trim() === String(name).toLowerCase().trim();
    });
    if (match) return match;
  }
  
  return null;
};

const calculateTrendAndDistribution = (filteredAtt, dateFilter, academicYear) => {
  const groupedByDate = {};
  filteredAtt.forEach(item => {
    const d = item.date;
    if (!groupedByDate[d]) {
      groupedByDate[d] = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0 };
    }
    const status = item.attendance;
    if (status === 'Present') groupedByDate[d].present++;
    else if (status === 'Absent') groupedByDate[d].absent++;
    else if (status === 'Late') groupedByDate[d].late++;
    else if (status === 'Half Day') groupedByDate[d].halfDay++;
    else if (status === 'Leave') groupedByDate[d].leave++;
  });

  let trendData = [];
  
  if (dateFilter === 'Today' || dateFilter === 'Yesterday') {
    const todayStr = dateFilter === 'Today' 
      ? formatLocalDate(new Date()) 
      : formatLocalDate(new Date(Date.now() - 86400000));
    
    const counts = groupedByDate[todayStr] || { present: 0, absent: 0, late: 0, leave: 0 };
    trendData = [{
      month: formatDateReadable(todayStr),
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      leave: counts.leave
    }];
  } 
  else if (dateFilter === 'This Week') {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    trendData = weekdays.map((label, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      const dStr = formatLocalDate(d);
      const counts = groupedByDate[dStr] || { present: 0, absent: 0, late: 0, leave: 0 };
      return {
        month: label,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        leave: counts.leave
      };
    });
  } 
  else if (dateFilter === 'This Month' || dateFilter === 'Last Month' || dateFilter === 'Custom Date') {
    const sortedDates = Object.keys(groupedByDate).sort();
    if (sortedDates.length === 0) {
      trendData = [];
    } else {
      trendData = sortedDates.map(dStr => {
        const counts = groupedByDate[dStr];
        return {
          month: formatDateReadableShort(dStr),
          present: counts.present,
          absent: counts.absent,
          late: counts.late,
          leave: counts.leave
        };
      });
    }
  } 
  else if (dateFilter === 'This Year') {
    const acDates = getAcademicYearDates(academicYear);
    const startYear = acDates.startDate.getFullYear();
    const endYear = acDates.endDate.getFullYear();

    const academicMonths = [
      { monthIdx: 3, year: startYear, label: 'Apr' },
      { monthIdx: 4, year: startYear, label: 'May' },
      { monthIdx: 5, year: startYear, label: 'Jun' },
      { monthIdx: 6, year: startYear, label: 'Jul' },
      { monthIdx: 7, year: startYear, label: 'Aug' },
      { monthIdx: 8, year: startYear, label: 'Sep' },
      { monthIdx: 9, year: startYear, label: 'Oct' },
      { monthIdx: 10, year: startYear, label: 'Nov' },
      { monthIdx: 11, year: startYear, label: 'Dec' },
      { monthIdx: 0, year: endYear, label: 'Jan' },
      { monthIdx: 1, year: endYear, label: 'Feb' },
      { monthIdx: 2, year: endYear, label: 'Mar' }
    ];

    trendData = academicMonths.map(mObj => {
      let presentSum = 0;
      let absentSum = 0;
      let lateSum = 0;
      let leaveSum = 0;

      Object.keys(groupedByDate).forEach(dStr => {
        const parts = dStr.split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y === mObj.year && m === mObj.monthIdx) {
            const counts = groupedByDate[dStr];
            presentSum += counts.present;
            absentSum += counts.absent;
            lateSum += counts.late;
            leaveSum += counts.leave;
          }
        }
      });

      return {
        month: mObj.label,
        present: presentSum,
        absent: absentSum,
        late: lateSum,
        leave: leaveSum
      };
    });
  }

  let presentTotal = 0;
  let absentTotal = 0;
  let lateTotal = 0;
  let halfDayTotal = 0;
  let leaveTotal = 0;

  filteredAtt.forEach(item => {
    const status = item.attendance;
    if (status === 'Present') presentTotal++;
    else if (status === 'Absent') absentTotal++;
    else if (status === 'Late') lateTotal++;
    else if (status === 'Half Day') halfDayTotal++;
    else if (status === 'Leave') leaveTotal++;
  });

  const pieData = [
    { name: 'Present', value: presentTotal },
    { name: 'Absent', value: absentTotal },
    { name: 'Late', value: lateTotal },
    { name: 'Half Day', value: halfDayTotal },
    { name: 'Leave', value: leaveTotal }
  ].filter(d => d.value > 0);

  return {
    trendData,
    pieData
  };
};

const calculateLeaveTrendAndDistribution = (filteredLeaves, dateFilter, academicYear) => {
  const groupedByDate = {};
  filteredLeaves.forEach(item => {
    const d = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : (item.fromDateStr || '');
    if (!d) return;
    if (!groupedByDate[d]) {
      groupedByDate[d] = { approved: 0, pending: 0, rejected: 0 };
    }
    const status = item.status?.toLowerCase();
    if (status === 'approved') groupedByDate[d].approved++;
    else if (status === 'pending') groupedByDate[d].pending++;
    else if (status === 'rejected') groupedByDate[d].rejected++;
  });

  let trendData = [];
  
  if (dateFilter === 'Today' || dateFilter === 'Yesterday') {
    const todayStr = dateFilter === 'Today' 
      ? formatLocalDate(new Date()) 
      : formatLocalDate(new Date(Date.now() - 86400000));
    
    const counts = groupedByDate[todayStr] || { approved: 0, pending: 0, rejected: 0 };
    trendData = [{
      month: formatDateReadable(todayStr),
      approved: counts.approved,
      pending: counts.pending,
      rejected: counts.rejected
    }];
  } 
  else if (dateFilter === 'This Week') {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    trendData = weekdays.map((label, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      const dStr = formatLocalDate(d);
      const counts = groupedByDate[dStr] || { approved: 0, pending: 0, rejected: 0 };
      return {
        month: label,
        approved: counts.approved,
        pending: counts.pending,
        rejected: counts.rejected
      };
    });
  } 
  else if (dateFilter === 'This Month' || dateFilter === 'Last Month' || dateFilter === 'Custom Date') {
    const sortedDates = Object.keys(groupedByDate).sort();
    if (sortedDates.length === 0) {
      trendData = [];
    } else {
      trendData = sortedDates.map(dStr => {
        const counts = groupedByDate[dStr];
        return {
          month: formatDateReadableShort(dStr),
          approved: counts.approved,
          pending: counts.pending,
          rejected: counts.rejected
        };
      });
    }
  } 
  else if (dateFilter === 'This Year') {
    const acDates = getAcademicYearDates(academicYear);
    const startYear = acDates.startDate.getFullYear();
    const endYear = acDates.endDate.getFullYear();

    const academicMonths = [
      { monthIdx: 3, year: startYear, label: 'Apr' },
      { monthIdx: 4, year: startYear, label: 'May' },
      { monthIdx: 5, year: startYear, label: 'Jun' },
      { monthIdx: 6, year: startYear, label: 'Jul' },
      { monthIdx: 7, year: startYear, label: 'Aug' },
      { monthIdx: 8, year: startYear, label: 'Sep' },
      { monthIdx: 9, year: startYear, label: 'Oct' },
      { monthIdx: 10, year: startYear, label: 'Nov' },
      { monthIdx: 11, year: startYear, label: 'Dec' },
      { monthIdx: 0, year: endYear, label: 'Jan' },
      { monthIdx: 1, year: endYear, label: 'Feb' },
      { monthIdx: 2, year: endYear, label: 'Mar' }
    ];

    trendData = academicMonths.map(mObj => {
      let approvedSum = 0;
      let pendingSum = 0;
      let rejectedSum = 0;

      Object.keys(groupedByDate).forEach(dStr => {
        const parts = dStr.split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y === mObj.year && m === mObj.monthIdx) {
            const counts = groupedByDate[dStr];
            approvedSum += counts.approved;
            pendingSum += counts.pending;
            rejectedSum += counts.rejected;
          }
        }
      });

      return {
        month: mObj.label,
        approved: approvedSum,
        pending: pendingSum,
        rejected: rejectedSum
      };
    });
  }

  let approvedTotal = 0;
  let pendingTotal = 0;
  let rejectedTotal = 0;

  filteredLeaves.forEach(item => {
    const status = item.status?.toLowerCase();
    if (status === 'approved') approvedTotal++;
    else if (status === 'pending') pendingTotal++;
    else if (status === 'rejected') rejectedTotal++;
  });

  const pieData = [
    { name: 'Approved', value: approvedTotal },
    { name: 'Pending', value: pendingTotal },
    { name: 'Rejected', value: rejectedTotal }
  ].filter(d => d.value > 0);

  return {
    trendData,
    pieData
  };
};

const normalizeAcademicYear = (yearStr) => {
  if (!yearStr) return "";
  const clean = yearStr.trim().replace(/[\u2013\u2014]/g, "-");
  const parts = clean.split("-");
  if (parts.length !== 2) return yearStr;

  const startYearStr = parts[0].trim();
  const endYearStr = parts[1].trim();

  if (startYearStr.length === 4) {
    if (endYearStr.length === 4) {
      return `${startYearStr}–${endYearStr}`; 
    } else if (endYearStr.length === 2) {
      const century = startYearStr.slice(0, 2);
      return `${startYearStr}–${century}${endYearStr}`; 
    }
  }
  return yearStr;
};

const calculateActiveStudentsCount = (studentsList, academicYear, classFilter, sectionFilter) => {
  let result = [...studentsList];

  result = result.filter(s => String(s.status || '').toLowerCase().trim() === 'active');

  if (academicYear !== "All Academic Years") {
    result = result.filter((s) => normalizeAcademicYear(s.academicYear) === normalizeAcademicYear(academicYear));
  }

  if (classFilter !== "All Classes") {
    result = result.filter((s) => {
      const classId = s.class?._id || s.class?.id || s.class;
      return String(classId) === String(classFilter);
    });
  }

  if (sectionFilter !== "All Sections") {
    result = result.filter((s) => {
      const secName = s.section?.name || s.section?.sectionName || (typeof s.section === 'string' ? s.section : '');
      return String(secName).toLowerCase() === String(sectionFilter).toLowerCase();
    });
  }

  return result.length;
};

const calculateAttendanceTodayCounts = (rawAttendanceVal, classFilter, sectionFilter) => {
  let classSectionFilteredRegister = rawAttendanceVal.filter(item => {
    const matchClass = classFilter === 'All Classes' || String(item.classId) === String(classFilter);
    const matchSection = sectionFilter === 'All Sections' || String(item.section).toLowerCase() === String(sectionFilter).toLowerCase();
    return matchClass && matchSection;
  });

  classSectionFilteredRegister = deduplicateAttendance(classSectionFilteredRegister);

  const todayStr = formatLocalDate(new Date());
  const todayRecords = classSectionFilteredRegister.filter(item => item.date === todayStr);

  let presentTodayCount = todayRecords.filter(a => a.attendance === 'Present' || a.attendance === 'Late' || a.attendance === 'Half Day').length;
  let absentTodayCount = todayRecords.filter(a => a.attendance === 'Absent').length;

  if (presentTodayCount === 0 && absentTodayCount === 0 && classSectionFilteredRegister.length > 0) {
    const dates = [...new Set(classSectionFilteredRegister.map(a => a.date))].sort();
    const lastDate = dates[dates.length - 1];
    const lastDateRecords = classSectionFilteredRegister.filter(item => item.date === lastDate);
    presentTodayCount = lastDateRecords.filter(a => a.attendance === 'Present' || a.attendance === 'Late' || a.attendance === 'Half Day').length;
    absentTodayCount = lastDateRecords.filter(a => a.attendance === 'Absent').length;
  }

  return {
    present: presentTodayCount,
    absent: absentTodayCount
  };
};

const calculateAttendanceResults = (academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, rawAttendanceVal) => {
  const { startDate, endDate } = getDateRange(dateFilter, customStartDate, customEndDate, academicYear);
  const startD = new Date(startDate);
  startD.setHours(0,0,0,0);
  const endD = new Date(endDate);
  endD.setHours(23,59,59,999);

  let filteredAtt = rawAttendanceVal.filter(item => {
    const d = new Date(item.date);
    d.setHours(0,0,0,0);
    const matchDate = d >= startD && d <= endD;
    
    const matchClass = classFilter === 'All Classes' || String(item.classId) === String(classFilter);
    const matchSection = sectionFilter === 'All Sections' || String(item.section).toLowerCase() === String(sectionFilter).toLowerCase();
    
    return matchDate && matchClass && matchSection;
  });

  filteredAtt = deduplicateAttendance(filteredAtt);

  const { trendData, pieData } = calculateTrendAndDistribution(filteredAtt, dateFilter, academicYear);

  // Group by student ID to build the summaries for the main table
  const studentGroups = {};
  filteredAtt.forEach(item => {
    const sId = getStudentId(item);
    if (!sId) return;

    if (!studentGroups[sId]) {
      const studentObj = item.student || {};
      const rollNo = item.rollNo && item.rollNo !== '-' ? item.rollNo : (studentObj.rollNo || studentObj.rollNumber || item.rollNumber || '-');
      const name = item.name && item.name !== 'Unknown' ? item.name : (studentObj.name || 'Unknown');
      const admissionNo = item.admissionNo && item.admissionNo !== '-' ? item.admissionNo : (studentObj.admissionNo || '-');
      const className = item.className && item.className !== '-' ? item.className : (item.class?.name || '-');
      const section = item.section || '-';
      const academicSession = item.academicYear || studentObj.academicYear || '-';

      studentGroups[sId] = {
        studentId: sId,
        name,
        rollNo,
        admissionNo,
        className,
        section,
        academicSession,
        records: [],
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        leaveCount: 0,
        halfDayCount: 0
      };
    }

    studentGroups[sId].records.push(item);

    const status = item.attendance;
    if (status === 'Present') studentGroups[sId].presentCount++;
    else if (status === 'Absent') studentGroups[sId].absentCount++;
    else if (status === 'Late') studentGroups[sId].lateCount++;
    else if (status === 'Half Day') studentGroups[sId].halfDayCount++;
    else if (status === 'Leave') studentGroups[sId].leaveCount++;
  });

  const groupedSummaries = Object.values(studentGroups).map(group => {
    const totalRecords = group.records.length;
    const presentPlusLate = group.presentCount + group.lateCount;
    let attendancePercentage = 0;
    if (totalRecords > 0) {
      attendancePercentage = (presentPlusLate / totalRecords) * 100;
      attendancePercentage = Math.round(attendancePercentage * 10) / 10;
    }

    return {
      ...group,
      totalDays: totalRecords,
      present: group.presentCount,
      absent: group.absentCount,
      late: group.lateCount,
      leave: group.leaveCount,
      attendancePercentage: `${attendancePercentage}%`
    };
  });

  return {
    attendanceData: groupedSummaries,
    attendanceRawData: filteredAtt,
    attendancePieData: pieData,
    attendanceTrendData: trendData
  };
};

const calculateLeaveResults = (academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, rawLeavesVal) => {
  const { startDate, endDate } = getDateRange(dateFilter, customStartDate, customEndDate, academicYear);
  const startD = new Date(startDate);
  startD.setHours(0,0,0,0);
  const endD = new Date(endDate);
  endD.setHours(23,59,59,999);

  const filteredLeaves = rawLeavesVal.filter(item => {
      const fromD = new Date(item.fromDate);
      const toD = new Date(item.toDate);
      const matchDate = (fromD <= endD && toD >= startD);

      const studentClassId = item.student?.class?._id || item.student?.class || item.class?._id || item.class;
      const matchClass = classFilter === 'All Classes' || String(studentClassId) === String(classFilter);

      const studentSectionName = item.student?.sectionName || item.section;
      const matchSection = sectionFilter === 'All Sections' || String(studentSectionName).toLowerCase() === String(sectionFilter).toLowerCase();

      return matchDate && matchClass && matchSection;
  });

  const { trendData, pieData } = calculateLeaveTrendAndDistribution(filteredLeaves, dateFilter, academicYear);

  const approvedL = filteredLeaves.filter(l => l.status === 'approved').length;
  const pendingL = filteredLeaves.filter(l => l.status === 'pending').length;
  const rejectedL = filteredLeaves.filter(l => l.status === 'rejected').length;

  const leaveKpiVal = {
      totalRequests: filteredLeaves.length,
      approved: approvedL,
      pending: pendingL,
      rejected: rejectedL
  };

  const leaveDataVal = filteredLeaves.map(l => ({
      ...l,
      name: l.student?.name || 'Unknown',
      admissionNo: l.student?.admissionNo || '-',
      rollNo: l.student?.rollNo || l.student?.rollNumber || '-',
      className: l.student?.className || '-',
      section: l.student?.sectionName || '-',
      leaveType: (l.leaveType || 'other').charAt(0).toUpperCase() + (l.leaveType || 'other').slice(1),
      fromDateStr: new Date(l.fromDate).toISOString().split('T')[0],
      toDateStr: new Date(l.toDate).toISOString().split('T')[0],
      reason: l.reason || '-',
      statusDisplay: (l.status || 'pending').charAt(0).toUpperCase() + (l.status || 'pending').slice(1),
      appliedDate: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '-'
  }));

  return {
    leaveData: leaveDataVal,
    leaveKpi: leaveKpiVal,
    leavePieData: pieData,
    leaveTrendData: trendData
  };
};

const AttendanceReports = () => {
  const authUser = useSelector((state) => state.adminAuth?.authUser);
  const schoolId = authUser?.school?._id || authUser?.school || 'global';

  const isMounted = useRef(true);
  const latestKeyRef = useRef('');
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getCurrentAcademicYear = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const month = today.getMonth(); 
    if (month < 3) {
        return `${currentYear - 1}–${currentYear}`;
    } else {
        return `${currentYear}–${currentYear + 1}`;
    }
  };

  const [activeTab, setActiveTab] = useState(() => filtersCache.activeTab || sessionStorage.getItem('admin_attendance_active_tab') || 'attendance');
  const [academicYear, setAcademicYear] = useState(() => {
    if (filtersCache.academicYear && filtersCache.academicYear !== 'All Academic Years') {
      return filtersCache.academicYear;
    }
    const sessionVal = sessionStorage.getItem('admin_attendance_filter_year');
    if (sessionVal && sessionVal !== 'All Academic Years') {
      return sessionVal;
    }
    return getCurrentAcademicYear();
  });
  const [classFilter, setClassFilter] = useState(() => filtersCache.classFilter || sessionStorage.getItem('admin_attendance_filter_class') || 'All Classes');
  const [sectionFilter, setSectionFilter] = useState(() => filtersCache.sectionFilter || sessionStorage.getItem('admin_attendance_filter_section') || 'All Sections');
  const [dateFilter, setDateFilter] = useState(() => filtersCache.dateFilter || sessionStorage.getItem('admin_attendance_filter_date') || 'This Month');
  const [customStartDate, setCustomStartDate] = useState(() => filtersCache.customStartDate || sessionStorage.getItem('admin_attendance_filter_custom_start') || '');
  const [customEndDate, setCustomEndDate] = useState(() => filtersCache.customEndDate || sessionStorage.getItem('admin_attendance_filter_custom_end') || '');

  const [academicYearsOptions, setAcademicYearsOptions] = useState(() => {
    return academicYearsCache || JSON.parse(sessionStorage.getItem('admin_attendance_academic_years') || '[]');
  });

  const [classes, setClasses] = useState(() => {
    return classesCache[schoolId]?.[academicYear] || [];
  });
  
  const [sections, setSections] = useState(() => {
    return filtersCache.sections.length > 0 ? filtersCache.sections : JSON.parse(sessionStorage.getItem('admin_attendance_sections') || '[]');
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [fetchedStudentDetails, setFetchedStudentDetails] = useState(null);

  useEffect(() => {
    filtersCache.activeTab = activeTab;
    sessionStorage.setItem('admin_attendance_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    filtersCache.academicYear = academicYear;
    sessionStorage.setItem('admin_attendance_filter_year', academicYear);
  }, [academicYear]);

  useEffect(() => {
    filtersCache.classFilter = classFilter;
    sessionStorage.setItem('admin_attendance_filter_class', classFilter);
  }, [classFilter]);

  useEffect(() => {
    filtersCache.sectionFilter = sectionFilter;
    sessionStorage.setItem('admin_attendance_filter_section', sectionFilter);
  }, [sectionFilter]);

  useEffect(() => {
    filtersCache.dateFilter = dateFilter;
    sessionStorage.setItem('admin_attendance_filter_date', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    filtersCache.customStartDate = customStartDate;
    sessionStorage.setItem('admin_attendance_filter_custom_start', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    filtersCache.customEndDate = customEndDate;
    sessionStorage.setItem('admin_attendance_filter_custom_end', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    academicYearsCache = academicYearsOptions;
    sessionStorage.setItem('admin_attendance_academic_years', JSON.stringify(academicYearsOptions));
  }, [academicYearsOptions]);

  useEffect(() => {
    if (!classesCache[schoolId]) classesCache[schoolId] = {};
    classesCache[schoolId][academicYear] = classes;
    sessionStorage.setItem('admin_attendance_classes', JSON.stringify(classes));
  }, [classes, schoolId, academicYear]);

  useEffect(() => {
    filtersCache.sections = sections;
    sessionStorage.setItem('admin_attendance_sections', JSON.stringify(sections));
  }, [sections]);

  const [attendanceKpi, setAttendanceKpi] = useState({ totalStudents: 0, present: 0, absent: 0, totalClasses: 0 });
  const [leaveKpi, setLeaveKpi] = useState({ totalRequests: 0, approved: 0, pending: 0, rejected: 0 });
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceRawData, setAttendanceRawData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  
  const [attendanceTrendData, setAttendanceTrendData] = useState([]);
  const [attendancePieData, setAttendancePieData] = useState([]);
  const [leaveTrendData, setLeaveTrendData] = useState([]);
  const [leavePieData, setLeavePieData] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('attendance');

  const [rawAttendance, setRawAttendance] = useState(() => {
    return rawAttendanceCache[schoolId]?.[academicYear] || [];
  });
  const [rawLeaves, setRawLeaves] = useState(() => {
    return rawLeavesCache[schoolId]?.[academicYear] || [];
  });

  useEffect(() => {
    const fetchAcademicConfigs = async () => {
      try {
        const res = await api.get('/admin/academic-configurations');
        const configs = res.data?.data || [];
        
        let activeYear = null;
        const yearsSet = new Set();
        
        configs.forEach(c => {
          if (c.academicYear) {
            yearsSet.add(c.academicYear);
            if (c.isCurrent) {
              activeYear = c.academicYear;
            }
          }
        });
        
        if (academicYear === '' || academicYear === 'All Academic Years') {
          if (activeYear) {
            setAcademicYear(activeYear);
          } else if (configs.length > 0) {
            activeYear = configs[0].academicYear;
            setAcademicYear(activeYear);
          } else {
            const defaultCurrent = getCurrentAcademicYear();
            activeYear = defaultCurrent;
            setAcademicYear(defaultCurrent);
            yearsSet.add(defaultCurrent);
          }
        }
        
        const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
        
        if (sortedYears.length < 4) {
          const earliestYearStr = sortedYears[sortedYears.length - 1];
          const match = earliestYearStr.match(/^(\d{4})[\u2013-–](\d{4})$/);
          if (match) {
            let start = parseInt(match[1], 10);
            while (sortedYears.length < 4) {
              start--;
              const prevYearStr = `${start}–${start + 1}`;
              if (!yearsSet.has(prevYearStr)) {
                sortedYears.push(prevYearStr);
              }
            }
          }
        }
        
        const otherYears = sortedYears.filter(y => y !== activeYear).sort((a, b) => b.localeCompare(a));
        const finalOptions = ['All Academic Years', activeYear || getCurrentAcademicYear(), ...otherYears];
        
        if (isMounted.current) {
          setAcademicYearsOptions(finalOptions);
        }
      } catch (err) {
        console.error("Failed to fetch academic configs:", err);
        const defaultCurrent = getCurrentAcademicYear();
        if (isMounted.current) {
          setAcademicYearsOptions(['All Academic Years', defaultCurrent]);
        }
      }
    };
    if (academicYearsOptions.length === 0) {
      fetchAcademicConfigs();
    }
  }, [academicYearsOptions.length, academicYear]);

  const handleClassChange = (newClassId) => {
    setClassFilter(newClassId);
    let sectionOptions = [];
    if (newClassId !== 'All Classes') {
      const selectedClass = classes.find(c => String(c.id) === String(newClassId) || String(c._id) === String(newClassId));
      sectionOptions = selectedClass?.sections || [];
    }
    setSections(sectionOptions);
    setSectionFilter('All Sections');
  };

  const handleDateFilterChange = (newDateFilter) => {
    setDateFilter(newDateFilter);
    if (newDateFilter !== 'Custom Date') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const loadReport = useCallback(async (isSilent = false) => {
    const key = `${schoolId}_${academicYear}_${classFilter}_${sectionFilter}_${dateFilter}_${customStartDate}_${customEndDate}_${activeTab}`;
    latestKeyRef.current = key;
    
    const cached = reportsCache[key];
    if (cached) {
      if (isMounted.current) {
        if (cached.attendanceData !== undefined) setAttendanceData(cached.attendanceData);
        if (cached.attendanceRawData !== undefined) setAttendanceRawData(cached.attendanceRawData);
        if (cached.attendanceKpi !== undefined) setAttendanceKpi(cached.attendanceKpi);
        if (cached.attendancePieData !== undefined) setAttendancePieData(cached.attendancePieData);
        if (cached.attendanceTrendData !== undefined) setAttendanceTrendData(cached.attendanceTrendData);
        if (cached.leaveData !== undefined) setLeaveData(cached.leaveData);
        if (cached.leaveKpi !== undefined) setLeaveKpi(cached.leaveKpi);
        if (cached.leavePieData !== undefined) setLeavePieData(cached.leavePieData);
        if (cached.leaveTrendData !== undefined) setLeaveTrendData(cached.leaveTrendData);
        
        setInitialLoading(false);
        setFilterLoading(false);
      }
      isSilent = true;
    } else {
      if (!isSilent) {
        const cachedClasses = classesCache[schoolId]?.[academicYear];
        const cachedRawAtt = rawAttendanceCache[schoolId]?.[academicYear];
        const cachedRawLeaves = rawLeavesCache[schoolId]?.[academicYear];
        const cachedStudents = globalStudentsCache;
        
        if (cachedClasses && cachedRawAtt && cachedRawLeaves && cachedStudents) {
          const activeStudentsCount = calculateActiveStudentsCount(cachedStudents, academicYear, classFilter, sectionFilter);
          const attResults = calculateAttendanceResults(academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, cachedRawAtt);
          const leaveResults = calculateLeaveResults(academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, cachedRawLeaves);
          
          const results = {
            ...attResults,
            attendanceKpi: {
              totalStudents: activeStudentsCount,
              totalClasses: classFilter === 'All Classes' ? cachedClasses.length : 1,
              ...calculateAttendanceTodayCounts(cachedRawAtt, classFilter, sectionFilter)
            },
            ...leaveResults
          };
          reportsCache[key] = results;
          
          if (isMounted.current) {
            setAttendanceData(results.attendanceData);
            setAttendanceRawData(results.attendanceRawData || []);
            setAttendanceKpi(results.attendanceKpi);
            setAttendancePieData(results.attendancePieData);
            setAttendanceTrendData(results.attendanceTrendData);
            setLeaveData(results.leaveData);
            setLeaveKpi(results.leaveKpi);
            setLeavePieData(results.leavePieData);
            setLeaveTrendData(results.leaveTrendData);
            
            setInitialLoading(false);
            setFilterLoading(false);
          }
          isSilent = true;
        } else {
          const hasAnyCachedReport = Object.keys(reportsCache).length > 0;
          if (isMounted.current) {
            if (hasAnyCachedReport) {
              setFilterLoading(true);
            } else {
              setInitialLoading(true);
            }
          }
        }
      }
    }

    try {
      // 1. Fetch Classes if not cached
      let fetchedClasses = classesCache[schoolId]?.[academicYear];
      const classesPromise = fetchedClasses ? Promise.resolve(fetchedClasses) : (async () => {
        const params = {
          academicYear: academicYear === 'All Academic Years' ? 'all' : academicYear
        };
        const res = await api.get('/admin/academic/classes-sections', { params });
        const data = sortClasses(res.data?.data || []);
        if (!classesCache[schoolId]) classesCache[schoolId] = {};
        classesCache[schoolId][academicYear] = data;
        sessionStorage.setItem('admin_attendance_classes', JSON.stringify(data));
        return data;
      })();

      // 2. Fetch raw attendance if not cached
      let fetchedRawAtt = rawAttendanceCache[schoolId]?.[academicYear];
      const attPromise = fetchedRawAtt ? Promise.resolve(fetchedRawAtt) : (async () => {
        const attParams = {
          academicYear: academicYear === 'All Academic Years' ? 'all' : academicYear
        };
        const attRes = await api.get('/admin/attendance/reports/stats', { params: attParams });
        const data = attRes.data?.data?.attendanceRegister || [];
        if (!rawAttendanceCache[schoolId]) rawAttendanceCache[schoolId] = {};
        rawAttendanceCache[schoolId][academicYear] = data;
        sessionStorage.setItem('admin_attendance_raw', JSON.stringify(data));
        return data;
      })();
      
      // 3. Fetch raw leaves if not cached
      let fetchedRawLeaves = rawLeavesCache[schoolId]?.[academicYear];
      const leavesPromise = fetchedRawLeaves ? Promise.resolve(fetchedRawLeaves) : (async () => {
        const leaveParams = {
          academicYear: academicYear === 'All Academic Years' ? 'all' : academicYear
        };
        const leaveRes = await api.get('/admin/leave/student', { params: leaveParams });
        const data = leaveRes.data?.data || [];
        if (!rawLeavesCache[schoolId]) rawLeavesCache[schoolId] = {};
        rawLeavesCache[schoolId][academicYear] = data;
        sessionStorage.setItem('admin_leaves_raw', JSON.stringify(data));
        return data;
      })();

      // 4. Fetch students if not cached
      let fetchedStudents = globalStudentsCache;
      const studentsPromise = fetchedStudents ? Promise.resolve(fetchedStudents) : (async () => {
        try {
          const params = {
            page: 1,
            limit: 10000,
            sortBy: "createdAt",
            sortOrder: "desc"
          };
          const res = await api.get('/admin/students', { params });
          const data = res.data?.data || [];
          globalStudentsCache = data;
          return data;
        } catch (err) {
          console.error("Failed to fetch active students list:", err);
          return [];
        }
      })();

      const [clsList, attList, leavesList, studentsList] = await Promise.all([
        classesPromise,
        attPromise,
        leavesPromise,
        studentsPromise
      ]);

      if (latestKeyRef.current !== key) return;

      if (isMounted.current) {
        setClasses(clsList);
        setRawAttendance(attList);
        setRawLeaves(leavesList);

        const activeStudentsCount = calculateActiveStudentsCount(studentsList, academicYear, classFilter, sectionFilter);
        const todayCounts = calculateAttendanceTodayCounts(attList, classFilter, sectionFilter);
        const attResults = calculateAttendanceResults(academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, attList);
        const leaveResults = calculateLeaveResults(academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, leavesList);

        setAttendanceKpi({
          totalStudents: activeStudentsCount,
          totalClasses: classFilter === 'All Classes' ? clsList.length : 1,
          present: todayCounts.present,
          absent: todayCounts.absent
        });

        setLeaveKpi(leaveResults.leaveKpi);
        setLeaveData(leaveResults.leaveData);
        setLeavePieData(leaveResults.leavePieData);
        setLeaveTrendData(leaveResults.leaveTrendData);

        setAttendanceData(attResults.attendanceData);
        setAttendanceRawData(attResults.attendanceRawData || []);
        setAttendancePieData(attResults.attendancePieData);
        setAttendanceTrendData(attResults.attendanceTrendData);

        reportsCache[key] = {
          attendanceData: attResults.attendanceData,
          attendanceRawData: attResults.attendanceRawData,
          attendanceKpi: {
            totalStudents: activeStudentsCount,
            totalClasses: classFilter === 'All Classes' ? clsList.length : 1,
            present: todayCounts.present,
            absent: todayCounts.absent
          },
          attendancePieData: attResults.attendancePieData,
          attendanceTrendData: attResults.attendanceTrendData,
          leaveData: leaveResults.leaveData,
          leaveKpi: leaveResults.leaveKpi,
          leavePieData: leaveResults.leavePieData,
          leaveTrendData: leaveResults.leaveTrendData
        };

        setInitialLoading(false);
        setFilterLoading(false);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
      toast.error("Failed to load attendance report data");
    } finally {
      if (latestKeyRef.current === key && isMounted.current) {
        setInitialLoading(false);
        setFilterLoading(false);
      }
    }
  }, [schoolId, academicYear, classFilter, sectionFilter, dateFilter, customStartDate, customEndDate, activeTab]);

  // Trigger loading report when dependencies change
  useEffect(() => {
    if (academicYearsOptions.length > 0) {
      loadReport(false);
    }
  }, [loadReport, academicYearsOptions.length]);

  const handleView = async (row, type) => {
    setSelectedRecord(row);
    setModalType(type);
    setIsModalOpen(true);

    if (type === 'attendance') {
      const sId = row.studentId;
      if (!sId) {
        setFetchedStudentDetails(null);
        return;
      }

      const attendanceStudentId = sId;
      // Resolve the matched student using available stable fields
      const matchedStudent = findMatchedStudent(sId, globalStudentsCache, row.name, row.admissionNo);
      const detailsId = matchedStudent?._id;

      // Temporary development logs to verify mapping
      console.log("Attendance student ID:", attendanceStudentId);
      console.log("Matched student:", matchedStudent);
      console.log("Details ID:", detailsId);

      const correctDetailsId = detailsId;

      if (correctDetailsId && studentDetailsApiCache[correctDetailsId]) {
        setFetchedStudentDetails(studentDetailsApiCache[correctDetailsId]);
        return;
      }

      if (matchedStudent) {
        // If the complete student details are already present, use directly
        const hasCompleteData = matchedStudent.admissionNo || matchedStudent.enrollmentNo;
        if (hasCompleteData) {
          if (correctDetailsId) {
            studentDetailsApiCache[correctDetailsId] = matchedStudent;
          }
          setFetchedStudentDetails(matchedStudent);
          return;
        }
      }

      const queryId = correctDetailsId || sId;

      // Fallback: Fetch complete student details using the exact service function from AdmissionDetails.jsx
      setDetailsLoading(true);
      setFetchedStudentDetails(null);
      try {
        const res = await getStudentById(queryId);
        const studentData = res?.data || (res?.success ? res : null);
        if (studentData) {
          if (correctDetailsId) {
            studentDetailsApiCache[correctDetailsId] = studentData;
          } else {
            const resolvedId = studentData._id || studentData.id;
            if (resolvedId) studentDetailsApiCache[resolvedId] = studentData;
          }
          setFetchedStudentDetails(studentData);
        } else {
          console.warn("No student details returned from service for ID:", queryId);
          if (matchedStudent) setFetchedStudentDetails(matchedStudent);
        }
      } catch (err) {
        console.error("Failed to fetch student details via service:", err);
        if (matchedStudent) setFetchedStudentDetails(matchedStudent);
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const attendanceColumns = [
    { key: 'name', label: 'STUDENT NAME', align: 'left', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'rollNo', label: 'ROLL NO.', align: 'left', render: (val) => <span className="font-semibold text-slate-600">{val}</span> },
    { key: 'className', label: 'CLASS', align: 'left' },
    { key: 'section', label: 'SECTION', align: 'left' },
    { key: 'totalDays', label: 'TOTAL DAYS', align: 'center', render: (val) => <span className="font-semibold text-slate-700">{val}</span> },
    { key: 'present', label: 'PRESENT', align: 'center', render: (val) => <span className="font-bold text-emerald-600">{val}</span> },
    { key: 'absent', label: 'ABSENT', align: 'center', render: (val) => <span className="font-bold text-rose-600">{val}</span> },
    { key: 'late', label: 'LATE', align: 'center', render: (val) => <span className="font-bold text-amber-500">{val}</span> },
    { key: 'leave', label: 'LEAVE', align: 'center', render: (val) => <span className="font-bold text-blue-600">{val}</span> },
    { key: 'attendancePercentage', label: 'ATTENDANCE %', align: 'center', render: (val) => <span className="font-black text-[#223F74]">{val}</span> },
    { key: 'actions', label: 'VIEW', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => handleView(row, 'attendance')} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const leaveColumns = [
    { key: 'name', label: 'Student Name', align: 'left', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'admissionNo', label: 'Admission Number', align: 'left', render: (val) => <span className="font-semibold text-slate-600">{val}</span> },
    { key: 'className', label: 'Class', align: 'left' },
    { key: 'section', label: 'Section', align: 'left' },
    { key: 'leaveType', label: 'Leave Type', align: 'left', render: (val) => <span className="font-medium text-slate-700">{val}</span> },
    { key: 'fromDateStr', label: 'From Date', align: 'left', render: (val) => <span className="whitespace-nowrap">{val}</span> },
    { key: 'toDateStr', label: 'To Date', align: 'left', render: (val) => <span className="whitespace-nowrap">{val}</span> },
    { key: 'reason', label: 'Reason', align: 'left', render: (val) => <span className="truncate max-w-xs block">{val}</span> },
    { key: 'statusDisplay', label: 'Status', align: 'center', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
      }`}>{val}</span>
    )},
    { key: 'appliedDate', label: 'Applied Date', align: 'left', render: (val) => <span className="whitespace-nowrap">{val}</span> },
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => handleView(row, 'leave')} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const statusColors = {
    'Present': '#10B981',
    'Absent': '#F43F5E',
    'Late': '#F59E0B',
    'Half Day': '#6366F1',
    'Leave': '#3B82F6'
  };
  const attendancePieColors = attendancePieData.map(d => statusColors[d.name] || '#64748B');

  const leaveColors = {
    'Approved': '#10B981',
    'Pending': '#F59E0B',
    'Rejected': '#F43F5E'
  };
  const leavePieColors = leavePieData.map(d => leaveColors[d.name] || '#64748B');

  const isAttendanceTrendEmpty = attendanceTrendData.length === 0 || attendanceTrendData.every(d => (d.present === 0 && d.absent === 0 && d.late === 0 && d.leave === 0));
  const isAttendanceDistributionEmpty = attendancePieData.length === 0;
  const isLeaveTrendEmpty = leaveTrendData.length === 0 || leaveTrendData.every(d => (d.approved === 0 && d.pending === 0 && d.rejected === 0));
  const isLeaveDistributionEmpty = leavePieData.length === 0;

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      <Heading primaryText="Student" secondaryText="Attendance" size={12} showAnimations={true} />

      <style>{`
        .attendance-cards h3.truncate, .attendance-cards span.truncate {
          white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
        }
      `}</style>

      <div className="attendance-cards">
        <DashGrid cols={12} gap={4}>
          {activeTab === 'attendance' ? (
            <>
              <EnhancedDashCard title="Active Students" value={initialLoading ? "-" : String(attendanceKpi.totalStudents)} icon={<Users size={22} />} size={3} accentColor="#3B82F6" />
              <EnhancedDashCard title="Today's Present" value={initialLoading ? "-" : String(attendanceKpi.present)} icon={<UserCheck size={22} />} size={3} accentColor="#10B981" />
              <EnhancedDashCard title="Today's Absent" value={initialLoading ? "-" : String(attendanceKpi.absent)} icon={<UserX size={22} />} size={3} accentColor="#F43F5E" />
              <EnhancedDashCard title="Total Classes" value={initialLoading ? "-" : String(attendanceKpi.totalClasses)} icon={<CalendarCheck size={22} />} size={3} accentColor="#F59E0B" />
            </>
          ) : (
            <>
              <EnhancedDashCard title="Total Leave Requests" value={initialLoading ? "-" : String(leaveKpi.totalRequests)} icon={<FileText size={22} />} size={3} accentColor="#3B82F6" />
              <EnhancedDashCard title="Pending Leaves" value={initialLoading ? "-" : String(leaveKpi.pending)} icon={<Clock size={22} />} size={3} accentColor="#F59E0B" />
              <EnhancedDashCard title="Approved Leaves" value={initialLoading ? "-" : String(leaveKpi.approved)} icon={<CheckCircle size={22} />} size={3} accentColor="#10B981" />
              <EnhancedDashCard title="Rejected Leaves" value={initialLoading ? "-" : String(leaveKpi.rejected)} icon={<XCircle size={22} />} size={3} accentColor="#F43F5E" />
            </>
          )}
        </DashGrid>
      </div>

      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
              {academicYearsOptions.map(y => <Option key={y} value={y} label={y} />)}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
            <Select id="filter-class" value={classFilter} onChange={(e) => handleClassChange(e.target.value)} searchable={false}>
              <Option value="All Classes" label="All Classes" />
              {classes.map(c => <Option key={c.id || c._id} value={c.id || c._id} label={c.name} />)}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Section</label>
            <Select id="filter-section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} searchable={false}>
              <Option value="All Sections" label="All Sections" />
              {sections.map(s => <Option key={s.id || s} value={s.name || s} label={s.name || s} />)}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Month / Date</label>
            <Select id="filter-date" value={dateFilter} onChange={(e) => handleDateFilterChange(e.target.value)} searchable={false}>
              <Option value="Today" label="Today" />
              <Option value="Yesterday" label="Yesterday" />
              <Option value="This Week" label="This Week" />
              <Option value="This Month" label="This Month" />
              <Option value="Last Month" label="Last Month" />
              <Option value="This Year" label="This Year" />
              <Option value="Custom Date" label="Custom Date" />
            </Select>
          </div>
          {dateFilter === 'Custom Date' && (
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Start Date</label>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#223F74] text-sm text-slate-700 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">End Date</label>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#223F74] text-sm text-slate-700 bg-white"
                />
              </div>
            </div>
          )}
        </Grid>
      </div>

      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 w-full">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
          <p className="text-[#223F74] font-black uppercase tracking-widest text-[10px] mt-2">
            LOADING ATTENDANCE DATA...
          </p>
        </div>
      ) : (
        <>
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button onClick={() => setActiveTab('attendance')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Student Attendance</button>
            <button onClick={() => setActiveTab('leave')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leave' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Student Leave Tracking</button>
          </div>

          <DashGrid cols={12} gap={4}>
            {activeTab === 'attendance' ? (
              <>
                {isAttendanceTrendEmpty ? (
                  <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col justify-between min-h-[330px]">
                    <h3 className="text-[#1D1D1F] font-black text-lg">Attendance Trend</h3>
                    <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 text-center px-4 py-10">
                      No attendance trend available for the selected filters.
                    </div>
                  </div>
                ) : (
                  <GColumnChart title="Attendance Trend" data={attendanceTrendData.map(d => ({ ...d, name: d.month }))} bars={[{key: 'absent', label: 'Absent', color: '#F43F5E'}, {key: 'late', label: 'Late', color: '#F59E0B'}, {key: 'leave', label: 'Leave', color: '#3B82F6'}, {key: 'present', label: 'Present', color: '#10B981'}]} size={6} />
                )}
                
                {isAttendanceDistributionEmpty ? (
                  <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col justify-between min-h-[330px]">
                    <h3 className="text-[#1D1D1F] font-black text-lg">Attendance Distribution</h3>
                    <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 text-center px-4 py-10">
                      No attendance distribution available for the selected filters.
                    </div>
                  </div>
                ) : (
                  <GPieChart title="Attendance Distribution" data={attendancePieData} colors={attendancePieColors} size={6} />
                )}
              </>
            ) : (
              <>
                {isLeaveTrendEmpty ? (
                  <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col justify-between min-h-[330px]">
                    <h3 className="text-[#1D1D1F] font-black text-lg">Leave Requests Trend</h3>
                    <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 text-center px-4 py-10">
                      No leave requests trend available for the selected filters.
                    </div>
                  </div>
                ) : (
                  <GColumnChart title="Leave Requests Trend" data={leaveTrendData.map(d => ({ ...d, name: d.month }))} bars={[{key: 'approved', label: 'Approved', color: '#10B981'}, {key: 'pending', label: 'Pending', color: '#F59E0B'}, {key: 'rejected', label: 'Rejected', color: '#F43F5E'}]} size={6} />
                )}
                
                {isLeaveDistributionEmpty ? (
                  <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col justify-between min-h-[330px]">
                    <h3 className="text-[#1D1D1F] font-black text-lg">Leave Status Distribution</h3>
                    <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 text-center px-4 py-10">
                      No leave distribution available for the selected filters.
                    </div>
                  </div>
                ) : (
                  <GPieChart title="Leave Status Distribution" data={leavePieData} colors={leavePieColors} size={6} />
                )}
              </>
            )}
          </DashGrid>

          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
            <div className="p-6 pb-2 border-b border-gray-100 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-black text-[#1D1D1F]">
                {activeTab === 'attendance' ? 'Attendance Register' : 'Leave Tracking'}
              </h2>
            </div>
            <div className="p-6 pt-4 relative min-h-[300px]">
              {filterLoading && (
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/5 gap-3">
                   <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
                 </div>
              )}
              <DataTable 
                rows={activeTab === 'attendance' ? attendanceData : leaveData} 
                columns={activeTab === 'attendance' ? attendanceColumns : leaveColumns} 
                searchable={true} 
                exportable={true}
                exportFileName={`${activeTab}_export_${new Date().getTime()}.csv`}
                noRecordsMessage={activeTab === 'attendance' ? "No attendance records found for the selected filters." : "No leave records found for the selected filters."}
              />
            </div>
          </div>
        </>
      )}

      <PanelModal 
        id="view-detail-modal" 
        title={modalType === 'attendance' ? 'Attendance Details' : 'Leave Details'} 
        size="3xl"
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {detailsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 w-full">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
            <p className="text-[#223F74] text-xs font-semibold">Loading student profile...</p>
          </div>
        ) : selectedRecord && modalType === 'attendance' ? (() => {
          const studentHistory = [...attendanceRawData]
            .filter(item => getStudentId(item) === selectedRecord.studentId)
            .sort((a, b) => b.date.localeCompare(a.date));

          const fallbackProfile = globalStudentsCache?.find(s => {
            const sId = s._id || s.id;
            return String(sId) === String(selectedRecord.studentId);
          });
          const studentProfile = fetchedStudentDetails || fallbackProfile;

          const resolvedAdmissionNo = getAdmissionNumber(studentProfile, selectedRecord);
          const resolvedRollNo = getRollNumber(studentProfile, selectedRecord);
          const resolvedAcademicSession = getAcademicSession(studentProfile, selectedRecord);

          return (
            <div className="space-y-6 pb-6 text-left max-h-[70vh] overflow-y-auto pr-2">
              {/* STUDENT INFORMATION */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><p className="text-xs text-slate-500 font-medium">Student Name</p><p className="font-bold text-slate-900">{selectedRecord.name}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Admission Number</p><p className="font-bold text-slate-900">{resolvedAdmissionNo}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Roll Number</p><p className="font-bold text-slate-900">{resolvedRollNo}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Class</p><p className="font-bold text-slate-900">{selectedRecord.className}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Section</p><p className="font-bold text-slate-900">{selectedRecord.section}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Academic Session</p><p className="font-bold text-slate-900">{resolvedAcademicSession}</p></div>
                </div>
              </div>

              {/* ATTENDANCE SUMMARY */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Attendance Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div><p className="text-xs text-slate-500 font-medium">Total Attendance Days</p><p className="font-bold text-slate-900 text-lg">{selectedRecord.totalDays}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium font-semibold text-emerald-600">Present</p><p className="font-bold text-emerald-600 text-lg">{selectedRecord.present}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium font-semibold text-rose-600">Absent</p><p className="font-bold text-rose-600 text-lg">{selectedRecord.absent}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium font-semibold text-amber-500">Late</p><p className="font-bold text-amber-500 text-lg">{selectedRecord.late}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium font-semibold text-blue-600">Leave</p><p className="font-bold text-blue-600 text-lg">{selectedRecord.leave}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium font-semibold text-[#223F74]">Attendance Percentage</p><p className="font-bold text-[#223F74] text-lg">{selectedRecord.attendancePercentage}</p></div>
                </div>
              </div>

              {/* ATTENDANCE HISTORY */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Attendance History</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Attendance Type</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Marked At</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {studentHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                            No attendance records found for this student in the selected filter range.
                          </td>
                        </tr>
                      ) : (
                        studentHistory.map((item, idx) => {
                          let badgeStyle = 'bg-slate-50 text-slate-700';
                          if (item.attendance === 'Present') badgeStyle = 'bg-emerald-50 text-emerald-700';
                          else if (item.attendance === 'Absent') badgeStyle = 'bg-rose-50 text-rose-700';
                          else if (item.attendance === 'Late') badgeStyle = 'bg-amber-50 text-amber-700';
                          else if (item.attendance === 'Leave') badgeStyle = 'bg-blue-50 text-blue-700';
                          else if (item.attendance === 'Half Day') badgeStyle = 'bg-indigo-50 text-indigo-700';

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                                {formatDateReadable(item.date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeStyle}`}>
                                  {item.attendance}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                                {item.attendanceType || 'Class'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-slate-600">
                                {item.markedAtTime || '—'}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-600 max-w-xs truncate">
                                {item.remarks || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })() : selectedRecord && modalType === 'leave' ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500 font-medium">Student Name</p><p className="font-bold text-slate-900">{selectedRecord.name}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Admission Number</p><p className="font-bold text-slate-900">{selectedRecord.admissionNo}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Class</p><p className="font-bold text-slate-900">{selectedRecord.className}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Section</p><p className="font-bold text-slate-900">{selectedRecord.section}</p></div>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Leave Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500 font-medium">Leave Type</p><p className="font-bold text-slate-900">{selectedRecord.leaveType}</p></div>
                <div><p className="text-xs text-slate-500 font-medium mb-1.5">Status</p><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${selectedRecord.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : selectedRecord.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{selectedRecord.statusDisplay}</span></div>
                <div><p className="text-xs text-slate-500 font-medium">From Date</p><p className="font-bold text-slate-900 whitespace-nowrap">{selectedRecord.fromDateStr}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">To Date</p><p className="font-bold text-slate-900 whitespace-nowrap">{selectedRecord.toDateStr}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Total Days</p><p className="font-bold text-slate-900">{selectedRecord.totalDays}</p></div>
                <div className="col-span-2"><p className="text-xs text-slate-500 font-medium">Reason</p><p className="font-medium text-slate-800">{selectedRecord.reason}</p></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center"><h3 className="text-sm font-bold text-slate-500">{modalType === 'attendance' ? 'No attendance details available.' : 'No leave details available.'}</h3></div>
        )}
      </PanelModal>
    </div>
  );
};

export default AttendanceReports;
