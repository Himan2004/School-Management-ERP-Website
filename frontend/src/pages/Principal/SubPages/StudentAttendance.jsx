import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, UserX, BarChart3, ClipboardList, Eye, X, Calendar, Loader2, Filter } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Select,
  Option,
  Button,
  DataField,
  SelectField
} from '../../../components/shared/Common_Components';
import {
  getStudentReportsApi,
  getStudentReportsStatsApi,
  getStudentCalendar
} from '../../../services/api/PrincipalAttendanceApi';
import api from '../../../services/api';

// --- HELPER FUNCTION: WEEK RANGE RESOLUTION ---
const getWeekDateRange = (weekStr) => {
  if (!weekStr) return null;
  const parts = weekStr.split("-W");
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0]);
  const week = parseInt(parts[1]);

  const firstDayOfYear = new Date(year, 0, 1);
  const dayOffset = firstDayOfYear.getDay() - 1; // offset from Monday
  const daysToMonday = dayOffset <= 3 ? -dayOffset : 7 - dayOffset;
  const firstMonday = new Date(year, 0, 1 + daysToMonday);

  const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0]
  };
};

// --- MODAL COMPONENT ---
const StudentDetailsModal = ({ student, initialTab, initialSelectedDate, initialSelectedWeek, initialSelectedMonth, onClose, schoolId }) => {
  const [tab, setTab] = useState(initialTab || 'Monthly');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!student) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let targetDate = new Date();
        if (tab === 'Daily' && initialSelectedDate) {
          targetDate = new Date(initialSelectedDate);
        } else if (tab === 'Weekly' && initialSelectedWeek) {
          const weekRange = getWeekDateRange(initialSelectedWeek);
          if (weekRange) {
            targetDate = new Date(weekRange.startDate);
          }
        } else if (tab === 'Monthly' && initialSelectedMonth) {
          const parts = initialSelectedMonth.split("-");
          if (parts.length === 2) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            targetDate = new Date(year, month, 1);
          }
        }

        const monthParam = targetDate.getMonth();
        const yearParam = targetDate.getFullYear();

        const response = await getStudentCalendar({
          student_id: student.studentId || student.id || student._id,
          month: monthParam,
          year: yearParam
        });
        
        if (response?.success && response.data) {
          const calendarList = response.data.calendar || [];
          const markedDays = calendarList.filter(c => c.status !== 'pending' && c.status !== 'holiday');
          const totalDays = markedDays.length;
          
          let presentCount = 0;
          let absentCount = 0;
          let lateCount = 0;
          let leaveCount = 0;
          
          markedDays.forEach(c => {
            if (c.status === 'present') {
              presentCount++;
            } else if (c.status === 'late') {
              presentCount++;
              lateCount++;
            } else if (c.status === 'half_day') {
              presentCount += 0.5;
              absentCount += 0.5;
            } else if (c.status === 'absent') {
              absentCount++;
            } else if (c.status === 'on_leave') {
              leaveCount++;
            }
          });
          
          const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;
          
          const summary = {
            totalDays,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            percentage
          };

          const records = calendarList.map(c => {
            const date = new Date(yearParam, monthParam, c.day);
            return {
              date: date.toISOString(),
              status: c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1).replace("_", " ") : "Pending"
            };
          }).filter(r => r.status !== "Pending");

          setStudentData({
            student: {
              name: student.name,
              rollNo: student.rollNo,
              class: student.class,
              section: student.section
            },
            summary,
            records
          });
        } else {
          setError(response?.message || 'Failed to fetch details from server.');
          setStudentData(null);
        }
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError(err?.response?.data?.message || err.message || 'Failed to load student details.');
        setStudentData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [student, tab, initialSelectedDate, initialSelectedWeek, initialSelectedMonth, retryTrigger]);

  const { student: studentInfo, summary, records } = studentData || {};
  const displayName = studentInfo?.name || student?.name || 'Unknown';
  const displayRollNo = studentInfo?.rollNo || student?.rollNo || 'N/A';
  const displayClass = studentInfo?.class || student?.class || 'N/A';
  const displaySection = studentInfo?.section || student?.section || 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#223F74] flex items-center justify-center text-white font-black text-lg">
              {displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1e293b]">{displayName}</h2>
              <p className="text-xs font-semibold text-slate-500">
                Roll No: {displayRollNo} • Class {displayClass}-{displaySection}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Tabs */}
          <div className="flex justify-center">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              {['Daily', 'Weekly', 'Monthly'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    tab === t ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#223F74] mb-3" />
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading student details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-rose-500">
              <p className="text-sm font-semibold mb-2">⚠️ Error loading details</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={() => setRetryTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-[#223F74] text-white text-xs font-bold rounded-lg hover:bg-[#1a3360] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Metrics */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500">Days</p>
                    <p className="text-lg font-black text-slate-800">{summary.totalDays || 0}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600">Present</p>
                    <p className="text-lg font-black text-emerald-700">{summary.present || 0}</p>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-600">Absent</p>
                    <p className="text-lg font-black text-rose-700">{summary.absent || 0}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600">Late</p>
                    <p className="text-lg font-black text-amber-700">{summary.late || 0}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600">Score</p>
                    <p className="text-lg font-black text-blue-700">{summary.percentage || 0}%</p>
                  </div>
                </div>
              )}

              {/* Records */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  Detailed Attendance History
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto max-h-64">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 font-bold text-slate-500 text-xs">Date</th>
                        <th className="px-4 py-2.5 font-bold text-slate-500 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records && records.length > 0 ? (
                        records.map((rec, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-700 text-xs">
                              {new Date(rec.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                rec.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                rec.status === 'Absent' ? 'bg-rose-100 text-rose-700' :
                                rec.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                                rec.status === 'Half Day' ? 'bg-blue-100 text-blue-700' :
                                rec.status === 'On Leave' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-slate-500 text-xs">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- MAIN COMPONENT ---
const StudentAttendance = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolId, setSchoolId] = useState(null);
  
  const [classFilter, setClassFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [period, setPeriod] = useState('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((d - startOfYear) / 86400000);
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [academicYearOptions, setAcademicYearOptions] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [kpiStats, setKpiStats] = useState({
    totalStudents: 0,
    presentAgg: 0,
    absentAgg: 0,
    percentage: 0
  });
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);

  const getSchoolId = () => {
    try {
      const directId = localStorage.getItem("schoolId");
      if (directId && directId !== "undefined" && directId !== "null") return directId;
      
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        const userObj = JSON.parse(userStr);
        return userObj?.schoolId || userObj?.school?._id || userObj?.school || userObj?.organization || null;
      }
    } catch(e) {
      console.error("Auth parsing error:", e);
    }
    return "use_token"; 
  };

  // Load attendance data
  const loadAttendanceData = async () => {
    const currentSchoolId = getSchoolId();
    if (!currentSchoolId) {
      setLoading(false);
      setError('School ID not found. Please log in again.');
      return;
    }

    setSchoolId(currentSchoolId);
    setLoading(true);
    setError('');

    try {
      const queryParams = {
        academicYear: academicYearFilter,
        limit: 1000 // Large limit to pull matching records for client side table features
      };

      if (period === 'Daily') {
        queryParams.quickFilter = 'Custom';
        queryParams.startDate = selectedDate;
        queryParams.endDate = selectedDate;
      } else if (period === 'Weekly') {
        const weekRange = getWeekDateRange(selectedWeek);
        if (weekRange) {
          queryParams.quickFilter = 'Custom';
          queryParams.startDate = weekRange.startDate;
          queryParams.endDate = weekRange.endDate;
        }
      } else if (period === 'Monthly') {
        const parts = selectedMonth.split('-');
        if (parts.length === 2) {
          queryParams.year = parseInt(parts[0]);
          queryParams.month = parseInt(parts[1]) - 1; // 0-indexed month
        }
      }

      const listParams = {
        ...queryParams,
        class: classFilter,
        section: sectionFilter,
        status: statusFilter
      };

      console.log('📡 Loading attendance stats & list:', listParams);
      
      const [statsRes, listRes] = await Promise.all([
        getStudentReportsStatsApi(queryParams),
        getStudentReportsApi(listParams)
      ]);

      console.log(statsRes,listRes)

      if (statsRes?.success && statsRes?.data) {
        setKpiStats({
          totalStudents: statsRes.data.totalStudents || 0,
          presentAgg: statsRes.data.presentToday || 0,
          absentAgg: statsRes.data.absentToday || 0,
          percentage: statsRes.data.avgAttendancePercentage || 0
        });
      }

      if (listRes?.success) {
        const records = (listRes.data || []).map(s => ({
          ...s,
          displayStatus: s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1).replace("_", " ") : "—"
        }));
        setStudents(records);
        setFilteredStudents(records);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load attendance data');
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch filters options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/principal/students/classes");
        if (res.data?.success) {
          setClassOptions(res.data.data?.classes || []);
        }
      } catch (err) {
        console.error("Failed to load school classes list", err);
      }

      try {
        const res = await api.get("/principal/academic/filters");
        if (res.data?.success) {
          const data = res.data.data;
          setSectionOptions(data.sections || []);
          if (data.academicYears && data.academicYears.length > 0) {
            const years = data.academicYears.map(y => y.year || y);
            setAcademicYearOptions(years);
            setAcademicYearFilter(prev => prev || years[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load academic setup filters", err);
      }
    };
    
    fetchFilters();
  }, []);

  // Reload when filters change
  useEffect(() => {
    const id = getSchoolId();
    if (id) {
      loadAttendanceData();
    }
  }, [period, selectedDate, selectedWeek, selectedMonth, classFilter, sectionFilter, statusFilter, academicYearFilter]);

  // Status options mapping
  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Present', label: 'Present' },
    { value: 'Absent', label: 'Absent' },
    { value: 'Late', label: 'Late' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'on_leave', label: 'On Leave' }
  ];

  // Table Columns config to display student name, roll number, class, section, status, date, remarks and view action.
  const columns = [
    { key: 'name', label: 'Student Name', width: '18%' },
    { key: 'rollNo', label: 'Roll No', width: '10%' },
    { key: 'class', label: 'Class', width: '8%' },
    { key: 'section', label: 'Section', width: '8%' },
    {
      key: 'date',
      label: 'Date',
      width: '12%',
      render: (val) => (
        <span className="text-gray-600 font-semibold">
          {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
        </span>
      )
    },
    {
      key: 'percentage',
      label: 'Attendance %',
      align: 'center',
      width: '10%',
      render: (value) => (
        <span className={`font-black ${value >= 90 ? 'text-emerald-600' :
          value >= 75 ? 'text-amber-600' : 'text-rose-600'
        }`}>
          {value || 0}%
        </span>
      )
    },
    {
      key: 'displayStatus',
      label: 'Status',
      width: '12%',
      render: (val) => {
        let colors = 'bg-slate-100 text-slate-600';
        if (val === 'Present') colors = 'bg-emerald-100 text-emerald-700';
        else if (val === 'Absent') colors = 'bg-rose-100 text-rose-700';
        else if (val === 'Late') colors = 'bg-amber-100 text-amber-700';
        else if (val === 'Half Day') colors = 'bg-blue-100 text-blue-700';
        else if (val === 'On Leave') colors = 'bg-yellow-100 text-yellow-700';

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors}`}>
            {val || 'N/A'}
          </span>
        );
      }
    },
    {
      key: 'remarks',
      label: 'Remarks',
      width: '14%',
      render: (val) => (
        <span className="text-gray-500 text-xs italic">
          {val || '—'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'View',
      align: 'center',
      width: '8%',
      render: (_, row) => (
        <button
          onClick={() => setSelectedStudent(row)}
          className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#223F74] rounded-xl transition-colors"
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Page Heading */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText={
            <span className="inline-flex items-center gap-2">
              <ClipboardList size={22} className="text-[#0ea5e9]" />
              <span>Student</span>
            </span>
          }
          secondaryText="Attendance"
          size={12}
          fontSize="2xl"
          showAnimations={true}
          action={
            <Button
              text="Report"
              onClick={() => navigate("/principal/reports/attendance", { state: { activeTab: "student" } })}
              variant="secondary"
              size={12}
            />
          }
        />
      </Grid>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm flex items-center gap-2">
          <span>⚠️</span>
          {error}
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="ml-auto text-rose-700 underline hover:no-underline text-xs"
          >
            Clear & Reload
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <DashGrid cols={12} gap={3}>
        <EnhancedDashCard
          title="Total Students"
          value={loading ? "..." : kpiStats.totalStudents}
          icon={<Users size={22} />}
          size={3}
          accentColor="#4361ee"
        />
        <EnhancedDashCard
          title={period === 'Daily' ? 'Present Today' : period === 'Weekly' ? 'Avg Present' : 'Present Days'}
          value={loading ? "..." : kpiStats.presentAgg}
          icon={<UserCheck size={22} />}
          size={3}
          accentColor="#22c55e"
        />
        <EnhancedDashCard
          title={period === 'Daily' ? 'Absent Today' : period === 'Weekly' ? 'Avg Absent' : 'Absent Days'}
          value={loading ? "..." : kpiStats.absentAgg}
          icon={<UserX size={22} />}
          size={3}
          accentColor="#ef4444"
        />
        <EnhancedDashCard
          title="Attendance Percentage"
          value={loading ? "..." : `${kpiStats.percentage}%`}
          icon={<BarChart3 size={22} />}
          size={3}
          accentColor="#8b5cf6"
        />
      </DashGrid>

      {/* Data Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#223F74] animate-spin" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading attendance records...</p>
        </div>
      ) : (
        <DataTable
          title="Attendance Records"
          columns={columns}
          rows={filteredStudents}
          size={12}
          actions={[]}
          searchable={true}
          exportable={true}
          filters={[
            { title: "Class", type: "toggle", key: "class", options: ['All', ...classOptions.map(c => c.name || c)], fn: () => true },
            { title: "Section", type: "toggle", key: "section", options: ['All', ...sectionOptions], fn: () => true },
            { title: "Period", type: "toggle", key: "period", options: ['Daily', 'Weekly', 'Monthly'], fn: () => true },
            { title: "Date", type: "date", key: "date", fn: () => true },
            { title: "Status", type: "toggle", key: "status", options: statusOptions.map(opt => opt.label), fn: () => true },
            { title: "Academic Year", type: "toggle", key: "academicYear", options: academicYearOptions, fn: () => true }
          ]}
          onApplyFilters={(applied) => {
            if (applied.class && applied.class.length > 0) {
              const cName = applied.class[0];
              if (cName === 'All') setClassFilter('All');
              else {
                const c = classOptions.find(opt => (opt.name || opt) === cName);
                if (c) setClassFilter(c._id || c);
              }
            } else setClassFilter('All');

            if (applied.section && applied.section.length > 0) {
              setSectionFilter(applied.section[0]);
            } else setSectionFilter('All');

            if (applied.period && applied.period.length > 0) {
              setPeriod(applied.period[0]);
            }

            if (applied.status && applied.status.length > 0) {
              const sLabel = applied.status[0];
              const s = statusOptions.find(opt => opt.label === sLabel);
              if (s) setStatusFilter(s.value);
            } else setStatusFilter('All');

            if (applied.academicYear && applied.academicYear.length > 0) {
              setAcademicYearFilter(applied.academicYear[0]);
            }

            if (applied.date) {
              setSelectedDate(applied.date);
              const d = new Date(applied.date);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              setSelectedMonth(`${y}-${m}`);
              const getWeek = (dateObj) => {
                const target = new Date(dateObj.valueOf());
                const dayNr = (dateObj.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                return `${target.getFullYear()}-W${String(1 + Math.ceil((firstThursday - target) / 604800000)).padStart(2, '0')}`;
              };
              setSelectedWeek(getWeek(d));
            }
          }}
        />
      )}

      {/* View Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          initialTab={period}
          initialSelectedDate={selectedDate}
          initialSelectedWeek={selectedWeek}
          initialSelectedMonth={selectedMonth}
          onClose={() => setSelectedStudent(null)}
          schoolId={schoolId}
        />
      )}
    </div>
  );
};

export default StudentAttendance;