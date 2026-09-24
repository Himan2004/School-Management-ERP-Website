/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.js';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  GColumnChart,
  GDoughnutChart,
} from '../../components/shared/Common_Components';

const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusTone = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent: 'bg-rose-100 text-rose-700 border-rose-200',
  late: 'bg-amber-100 text-amber-700 border-amber-200',
  half_day: 'bg-orange-100 text-orange-700 border-orange-200',
  on_leave: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

const leaveTypeTone = {
  sick: 'bg-rose-50 text-rose-700',
  casual: 'bg-blue-50 text-blue-700',
  emergency: 'bg-amber-50 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
};

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const parseClassKey = (key) => {
  if (!key) return { classId: '', section: '' };
  const [classId, section = ''] = key.split('__');
  return { classId, section };
};

const buildClassKey = (item) => `${item.classId || ''}__${item.section || ''}`;

const HRMAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [attendanceClasses, setAttendanceClasses] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStats, setLeaveStats] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [classLoading, setClassLoading] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedClass = useMemo(() => {
    if (!attendanceClasses.length) return null;
    return attendanceClasses.find((item) => buildClassKey(item) === selectedClassKey) || attendanceClasses[0];
  }, [attendanceClasses, selectedClassKey]);

  const loadLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const response = await api.get('/teacher/leave');
      const data = response.data?.data || [];
      const stats = response.data?.stats || [];
      setLeaveRequests(data);
      setLeaveStats(stats);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLeaveLoading(false);
    }
  };

  const loadOverview = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [overviewRes, weeklyRes, classesRes] = await Promise.all([
        api.get('/teacher/dashboard/attendance'),
        api.get('/teacher/dashboard/weekly-chart'),
        api.get('/teacher/attendance/classes'),
      ]);

      setAttendanceOverview(overviewRes.data?.data || null);
      setWeeklyChart(weeklyRes.data?.data || []);
      setAttendanceClasses(classesRes.data?.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load attendance dashboard');
      toast.error(requestError.response?.data?.message || 'Failed to load attendance dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClassDetails = async (classItem) => {
    if (!classItem?.classId) return;

    setClassLoading(true);
    try {
      const [reportRes, statsRes] = await Promise.all([
        api.get('/teacher/attendance/report', {
          params: {
            classId: classItem.classId,
            section: classItem.section,
            month: reportMonth,
            year: reportYear,
          },
        }),
        api.get('/teacher/attendance/stats', {
          params: {
            classId: classItem.classId,
            section: classItem.section,
          },
        }),
      ]);

      setAttendanceReport(reportRes.data?.data || null);
      setAttendanceStats(statsRes.data?.data || null);
      setError('');
    } catch (requestError) {
      setAttendanceReport(null);
      setAttendanceStats(null);
      setError(requestError.response?.data?.message || 'Failed to load class attendance details');
    } finally {
      setClassLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadLeaveRequests();
  }, []);

  useEffect(() => {
    if (!attendanceClasses.length) return;
    const firstKey = buildClassKey(attendanceClasses[0]);
    if (!selectedClassKey) {
      setSelectedClassKey(firstKey);
      return;
    }
    const existing = attendanceClasses.find((item) => buildClassKey(item) === selectedClassKey);
    if (!existing) setSelectedClassKey(firstKey);
  }, [attendanceClasses, selectedClassKey]);

  useEffect(() => {
    if (!selectedClass) return;
    loadClassDetails(selectedClass);
  }, [selectedClassKey, reportMonth, reportYear, attendanceClasses]);

  const overallStats = attendanceOverview?.today || null;
  const selectedStats = attendanceStats || null;

  const chartData = useMemo(() => {
    return (weeklyChart || []).map((item) => ({
      name: item.day,
      Present: item.Present ?? item.present ?? 0,
      Absent: item.Absent ?? item.absent ?? 0,
      Late: item.Late ?? item.late ?? 0,
    }));
  }, [weeklyChart]);

  const doughnutData = useMemo(() => {
    const present = overallStats?.present ?? 0;
    const absent = overallStats?.absent ?? 0;
    const late = overallStats?.late ?? 0;
    return [
      { name: 'Present', value: present },
      { name: 'Absent', value: absent },
      { name: 'Late', value: late },
    ];
  }, [overallStats]);

  const leaveFiltered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (leaveRequests || []).filter((item) => {
      if (leaveFilter !== 'all' && item.status !== leaveFilter) return false;
      if (!query) return true;
      return [item.studentName, item.className, item.guardian, item.reason, item.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [leaveRequests, leaveFilter, searchQuery]);

  const leaveSummary = useMemo(() => ({
    pending: leaveRequests.filter((item) => item.status === 'pending').length,
    approved: leaveRequests.filter((item) => item.status === 'approved').length,
    rejected: leaveRequests.filter((item) => item.status === 'rejected').length,
    total: leaveRequests.length,
  }), [leaveRequests]);

  const handleLeaveAction = async (leaveId, status) => {
    try {
      await api.patch(`/teacher/leave/${leaveId}`, { status });
      toast.success(`Leave ${status} successfully`);
      loadLeaveRequests();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || `Failed to ${status} leave`);
    }
  };

  const exportLeaveReport = async () => {
    try {
      const response = await api.get('/teacher/leave/export');
      const payload = JSON.stringify(response.data?.data || [], null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'teacher-leave-report.json';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Leave report downloaded');
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to export leave report');
    }
  };

  const attendanceSummaryCards = [
    {
      title: 'Today Marked',
      value: overallStats?.total ? `${overallStats.present}/${overallStats.total}` : '0/0',
      icon: <CheckCircle size={22} />,
      accentColor: '#22c55e',
    },
    {
      title: 'Today Present %',
      value: overallStats ? formatPercent(overallStats.presentPercentage) : '0.00%',
      icon: <BarChart3 size={22} />,
      accentColor: '#3b82f6',
    },
    {
      title: 'This Month Average',
      value: selectedStats ? formatPercent(selectedStats.thisMonthAverage) : '0.00%',
      icon: <CalendarDays size={22} />,
      accentColor: '#8b5cf6',
    },
    {
      title: 'Low Attendance',
      value: String(selectedStats?.lowAttendanceStudents ?? 0),
      icon: <AlertTriangle size={22} />,
      accentColor: '#ef4444',
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Heading primaryText="My Attendance &" secondaryText="Leave" size={12} showAnimations={true} />
        <button
          onClick={() => {
            loadOverview({ silent: true });
            loadLeaveRequests();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#223F74] shadow-sm transition-colors hover:bg-[#F4F7FB]"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="text-sm text-[#6B7280]">
        Live attendance analytics and student leave requests from the teacher backend.
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#1D3557] to-[#2B4A7A] p-6 text-white shadow-lg shadow-[#223F74]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Live Clock</p>
              <h3 className="mt-2 text-4xl font-black tracking-tight">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h3>
            </div>
            <Clock size={28} className="text-white/80" />
          </div>
          <p className="mt-4 text-sm text-slate-200">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/90">
            {selectedClass ? `${selectedClass.className} • ${selectedClass.section || 'All Sections'}` : 'Select a class to load detailed attendance'}
          </div>
        </div>

        <div className="lg:col-span-2">
          <DashGrid cols={12} gap={4}>
            {attendanceSummaryCards.map((card) => (
              <EnhancedDashCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                accentColor={card.accentColor}
                size={3}
                showAnimations={true}
              />
            ))}
          </DashGrid>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1F]">Attendance Overview</h2>
                <p className="text-sm text-[#6B7280]">Weekly trend and daily breakdown from the backend.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <select
                    value={selectedClassKey}
                    onChange={(event) => setSelectedClassKey(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  >
                    {attendanceClasses.length === 0 ? (
                      <option value="">No class assignments found</option>
                    ) : (
                      attendanceClasses.map((item) => {
                        const key = buildClassKey(item);
                        return (
                          <option key={key} value={key}>
                            {item.className} {item.section ? `• ${item.section}` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                </div>

                <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F8F9FA]">
                  <Filter size={16} /> Filter
                </button>
              </div>
            </div>

            <DashGrid cols={12} gap={4}>
              <div className="col-span-12 xl:col-span-7">
                <GColumnChart
                  title="Weekly Attendance Trend"
                  data={chartData}
                  bars={[
                    { key: 'Present', color: '#10B981' },
                    { key: 'Absent', color: '#EF4444' },
                    { key: 'Late', color: '#F59E0B' },
                  ]}
                  size={12}
                />
              </div>
              <div className="col-span-12 xl:col-span-5">
                <GDoughnutChart
                  title="Attendance Distribution"
                  data={doughnutData}
                  colors={['#10B981', '#EF4444', '#F59E0B']}
                  size={12}
                />
              </div>
            </DashGrid>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1F]">Class Attendance Report</h2>
                <p className="text-sm text-[#6B7280]">Month-wise report for the selected class.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={reportMonth}
                  onChange={(event) => setReportMonth(Number(event.target.value))}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={reportYear}
                  onChange={(event) => setReportYear(Number(event.target.value))}
                  className="w-28 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                />
              </div>
            </div>

            {classLoading ? (
              <div className="rounded-xl border border-dashed border-[#E2E8F0] px-6 py-10 text-center text-sm text-[#6B7280]">
                Loading class report...
              </div>
            ) : attendanceReport ? (
              <>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ReportPill label="Class" value={`${attendanceReport.className || '—'} ${attendanceReport.section ? `• ${attendanceReport.section}` : ''}`} />
                  <ReportPill label="Working Days" value={String(attendanceReport.workingDays || 0)} />
                  <ReportPill label="Class Attendance" value={formatPercent(attendanceReport.classPercentage)} />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left">
                    <thead className="border-b border-[#E2E8F0] bg-[#F8F9FA]">
                      <tr>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Student</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Roll No.</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Present</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Absent</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Late</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Total</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Percentage</th>
                        <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {(attendanceReport.studentWise || [])
                        .filter((row) => {
                          if (!searchQuery.trim()) return true;
                          const query = searchQuery.trim().toLowerCase();
                          return [row.name, row.rollNo].some((value) => String(value || '').toLowerCase().includes(query));
                        })
                        .map((row) => (
                          <tr key={row.id} className="transition-colors hover:bg-[#F8F9FA]">
                            <td className="p-3 font-bold text-[#1D1D1F]">{row.name}</td>
                            <td className="p-3 text-sm text-[#4B5563]">{row.rollNo || '—'}</td>
                            <td className="p-3 text-sm text-emerald-700">{row.present}</td>
                            <td className="p-3 text-sm text-rose-700">{row.absent}</td>
                            <td className="p-3 text-sm text-amber-700">{row.late}</td>
                            <td className="p-3 text-sm text-[#4B5563]">{row.total}</td>
                            <td className="p-3 text-sm font-bold text-[#223F74]">{formatPercent(row.percentage)}</td>
                            <td className="p-3">
                              {row.isLowAttendance ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">
                                  <AlertTriangle size={12} /> Low
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                                  <Check size={12} /> Good
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E2E8F0] px-6 py-10 text-center text-sm text-[#6B7280]">
                Select a class to load the month report.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1D1D1F]">Quick Stats</h2>
            <p className="text-sm text-[#6B7280]">Selected class and overall teacher attendance snapshot.</p>
            <div className="mt-4 space-y-3">
              <SideStat label="Total Students" value={String(selectedStats?.totalStudents ?? overallStats?.total ?? 0)} />
              <SideStat label="Perfect Attendance" value={String(selectedStats?.perfectAttendanceStudents ?? 0)} />
              <SideStat label="Today Marked" value={selectedStats?.todayMarked ? 'Yes' : 'No'} />
              <SideStat label="Most Absent Day" value={selectedStats?.mostAbsentDay || 'N/A'} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1F]">Leave Requests</h2>
                <p className="text-sm text-[#6B7280]">Approve or reject student leave requests.</p>
              </div>
              <button
                onClick={exportLeaveReport}
                className="rounded-xl bg-[#F4F7FB] px-3 py-2 text-sm font-bold text-[#223F74] transition-colors hover:bg-[#223F74] hover:text-white"
              >
                Export
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Pending" value={leaveSummary.pending} tone="amber" />
              <MiniStat label="Approved" value={leaveSummary.approved} tone="emerald" />
              <MiniStat label="Rejected" value={leaveSummary.rejected} tone="rose" />
              <MiniStat label="Total" value={leaveSummary.total} tone="blue" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setLeaveFilter(status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-all ${leaveFilter === status ? 'bg-[#223F74] text-white' : 'bg-[#F4F7FB] text-[#6B7280] hover:text-[#1D1D1F]'}`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative mt-4">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search leave requests"
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
              />
            </div>

            {leaveLoading ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#E2E8F0] px-4 py-8 text-center text-sm text-[#6B7280]">
                Loading leave requests...
              </div>
            ) : leaveFiltered.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#E2E8F0] px-4 py-8 text-center text-sm text-[#6B7280]">
                No leave requests found.
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {leaveFiltered.map((request) => (
                  <div key={request.rawId || request.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#1D1D1F]">{request.studentName}</p>
                        <p className="text-sm text-[#6B7280]">{request.className} • {request.guardian}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusTone[request.status] || statusTone.pending}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[#4B5563]">
                      <p><span className="font-semibold text-[#1D1D1F]">Type:</span> <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${leaveTypeTone[String(request.leaveType || '').toLowerCase().split(' ')[0]] || leaveTypeTone.other}`}>{request.leaveType}</span></p>
                      <p><span className="font-semibold text-[#1D1D1F]">Range:</span> {request.range}</p>
                      <p><span className="font-semibold text-[#1D1D1F]">Days:</span> {request.days}</p>
                      <p><span className="font-semibold text-[#1D1D1F]">Reason:</span> {request.reason}</p>
                      <p><span className="font-semibold text-[#1D1D1F]">Applied On:</span> {request.appliedOn}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleLeaveAction(request.rawId, 'approved')}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleLeaveAction(request.rawId, 'rejected')}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700"
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Actioned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-5 right-5 z-[10001] rounded-full bg-[#223F74] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#223F74]/20">
          Loading attendance data...
        </div>
      )}
    </div>
  );
};

const ReportPill = ({ label, value }) => (
  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9CA3AF]">{label}</p>
    <p className="mt-1 text-sm font-bold text-[#223F74]">{value}</p>
  </div>
);

const SideStat = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-sm">
    <span className="font-semibold text-[#4B5563]">{label}</span>
    <span className="font-bold text-[#223F74]">{value}</span>
  </div>
);

const MiniStat = ({ label, value, tone }) => {
  const palette = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${palette[tone] || palette.blue}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
};

export default HRMAttendance;