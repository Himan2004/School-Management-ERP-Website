import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, Award, Users, BookOpen, FileText, DollarSign, Plus, User, LogOut, AlertCircle, Zap } from 'lucide-react';
import Header from './Header';
import OverviewStats from './OverviewStats';
import ScheduleAttendance from './ScheduleAttendance';
import NoticesFinance from './NoticesFinance';
import ActivitiesProgress from './ActivitiesProgress';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AddAccountantModal from '../../../components/admin/modals/AddAccountant';
import AddTeacherModal from '../../../components/admin/modals/AddTeacher';
import { addAccountant } from '../../../services/api/adminApi';
import { 
  selectDashboardStats, 
  selectAdminLoading, 
  getDashboardStats, 
  createTeacher,
  fetchDashboardEvents,
  fetchDashboardActivities,
  fetchAttendanceAnalytics,
  selectDashboardEvents,
  selectDashboardActivities,
  selectAttendanceAnalytics,
  selectAdminError,
  setFinanceStats,
  setNotices,
  setLeaveRequests,
  setPendingApprovalsCount,
  setDashboardLoaded,
  selectFinanceStats,
  selectNotices,
  selectLeaveRequests,
  selectPendingApprovalsCount,
  selectDashboardLoaded
} from '../../../features/admin/adminSlice';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import axios from 'axios';
import api from '../../../services/api.js';
import { PanelModal, DataField, SelectField, Option, Button } from '../../../components/shared/Common_Components';
import { getAdmissionStats } from '../../../services/api/principalAdmissionApi';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // 1. State Hooks
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAttendanceTab, setActiveAttendanceTab] = useState('Students');
  const darkMode = useSelector(selectIsDarkMode);
  const [filterType, setFilterType] = useState('all');
  const financeStats = useSelector(selectFinanceStats);
  const [financeLoading, setFinanceLoading] = useState(!financeStats);
  const leaveRequests = useSelector(selectLeaveRequests);
  const notices = useSelector(selectNotices);
  const [likedActivities, setLikedActivities] = useState({});
  const [performanceData, setPerformanceData] = useState([]);
  const [subjectPerformanceData, setSubjectPerformanceData] = useState([]);
  const pendingApprovalsCount = useSelector(selectPendingApprovalsCount);
  const dashboardLoaded = useSelector(selectDashboardLoaded);
  const [liveAttendanceData, setLiveAttendanceData] = useState({
    Students: { present: '--', absent: '--', late: '--', percentage: '--' },
    Teachers: { present: '--', absent: '--', late: '--', percentage: '--' },
    'Other Staff': { present: '--', absent: '--', late: '--', percentage: '--' }
  });
  const [attendanceMonthlyTrend, setAttendanceMonthlyTrend] = useState([]);

  useEffect(() => {
    fetchFinanceStats();
    fetchLiveAttendanceData();
    fetchPerformance();
  }, []);

  // 2. Redux Selectors
  const dashboardStats = useSelector(selectDashboardStats);
  const adminLoading = useSelector(selectAdminLoading);
  const { authUser } = useSelector((state) => state.adminAuth);
  
  const reduxEvents = useSelector(selectDashboardEvents);
  const reduxActivities = useSelector(selectDashboardActivities);
  const reduxAttendance = useSelector(selectAttendanceAnalytics);
  const adminError = useSelector(selectAdminError);

  // 3. Derived Variables & Redux Integration
  const statsLoading = adminLoading.dashboardStats || adminLoading.fetchDashboardStats;
  const attendanceLoading = adminLoading.fetchAttendanceAnalytics;
  const loading = statsLoading || attendanceLoading;

  const statsError = adminError.dashboardStats || adminError.fetchDashboardStats;
  const attendanceError = adminError.fetchAttendanceAnalytics;
  const hasError = statsError || attendanceError;

  const adminName = authUser?.adminProfile?.name || 'Admin';

  const statistics = useMemo(() => {
    return dashboardStats || {
      students: { total: 0, active: 0, inactive: 0, trend: '+0%' },
      teachers: { total: 0, active: 0, inactive: 0, trend: '+0%' },
      staff: { total: 0, active: 0, inactive: 0, trend: '+0%' },
      staffCombined: { total: 0, active: 0, inactive: 0, trend: '+0%' },
      classes: { total: 0, active: 0, inactive: 0, trend: '+0%' },
      subjects: { total: 0, active: 0, inactive: 0, trend: '+0%' },
    };
  }, [dashboardStats]);

  const currentStaffCount = statistics?.staffCombined?.total ?? statistics?.staff?.total ?? 0;
  const maxStaffLimit = authUser?.school?.totalStaff !== undefined && authUser?.school?.totalStaff !== ""
    ? Number(authUser?.school?.totalStaff) || 0
    : (Number(authUser?.school?.totalTeachingStaff) || 0) + (Number(authUser?.school?.totalNonTeachingStaff) || 0);

  const attendanceData = reduxAttendance?.current || {
    Students: { present: 0, absent: 0, late: 0, percentage: 0 },
    Teachers: { present: 0, absent: 0, late: 0, percentage: 0 },
    Staff: { present: 0, absent: 0, late: 0, percentage: 0 }
  };

  const monthlyAttendanceData = attendanceMonthlyTrend.length > 0 ? attendanceMonthlyTrend : (reduxAttendance?.monthlyTrend || []);

  const upcomingEventsList = Array.isArray(reduxEvents) ? reduxEvents.map(e => ({
    id: e._id || e.id,
    title: e.title,
    date: e.startDate || e.eventDate || e.date,
    time: e.startTime ? (() => {
      const [h, m] = e.startTime.split(':');
      const hr = parseInt(h);
      return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    })() : '09:00 AM',
    priority: e.priority?.toLowerCase() || 'normal',
    location: e.category || e.description || 'School Campus',
    participants: 0,
    avatars: []
  })) : [];

  const activities = reduxActivities?.feed || [];
  const activityStats = reduxActivities?.stats || { newStudents: 0, feePayments: 0, pendingLeaves: 0 };


  // Helpers
  const parseEventDate = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  // Financial Summary - Mapping live data if available
  const financialSummary = financeStats ? [
    { id: 1, label: 'Total Fees Collected', amount: `₹${financeStats.kpis.totalFees.value.toLocaleString()}`, trend: financeStats.kpis.totalFees.trend, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', value: financeStats.kpis.totalFees.value, previous: 0 },
    { id: 2, label: 'Fine Collected', amount: `₹${financeStats.kpis.fineCollected.value.toLocaleString()}`, trend: financeStats.kpis.fineCollected.trend, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', value: financeStats.kpis.fineCollected.value, previous: 0 },
    { id: 3, label: 'Students Not Paid', amount: financeStats.kpis.studentsNotPaid.value.toString(), trend: financeStats.kpis.studentsNotPaid.trend, icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50', value: financeStats.kpis.studentsNotPaid.value, previous: 0 },
    { id: 4, label: 'Total Outstanding', amount: `₹${financeStats.kpis.totalOutstanding.value.toLocaleString()}`, trend: financeStats.kpis.totalOutstanding.trend, icon: TrendingUp, color: 'text-yellow-600', bgColor: 'bg-yellow-50', value: financeStats.kpis.totalOutstanding.value, previous: 0 },
  ] : [
    { id: 1, label: 'Total Fees Collected', amount: '--', trend: '0%', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', value: 0, previous: 1 },
    { id: 2, label: 'Fine Collected', amount: '--', trend: '0%', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', value: 0, previous: 1 },
    { id: 3, label: 'Students Not Paid', amount: '--', trend: '0%', icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50', value: 0, previous: 1 },
    { id: 4, label: 'Total Outstanding', amount: '--', trend: '0%', icon: TrendingUp, color: 'text-yellow-600', bgColor: 'bg-yellow-50', value: 0, previous: 1 },
  ];

  // Quick Links - Derived counts
  const quickLinks = [
    { label: 'Calendar', icon: Calendar, color: 'bg-[#7A8FC6]/15 text-[#7A8FC6]', hover: 'hover:bg-[#7A8FC6]/25', route: '/admin/dashboard', count: upcomingEventsList.length },
    { label: 'Exam Results', icon: Award, color: 'bg-[#5B9A6A]/15 text-[#5B9A6A]', hover: 'hover:bg-[#5B9A6A]/25', route: '/admin/exam', count: subjectPerformanceData.length },
    { label: 'Attendance', icon: Users, color: 'bg-[#223F74]/10 text-[#223F74]', hover: 'hover:bg-[#223F74]/20', route: '/admin/attendance/manage', count: 0 },
    { label: 'Fees', icon: DollarSign, color: 'bg-[#E0A04B]/15 text-[#E0A04B]', hover: 'hover:bg-[#E0A04B]/25', route: '/admin/finance/analytics', count: 0 },
    { label: 'Homework', icon: BookOpen, color: 'bg-[#F59B87]/15 text-[#F59B87]', hover: 'hover:bg-[#F59B87]/25', route: '/admin/academics', count: 0 },
    { label: 'Reports', icon: FileText, color: 'bg-[#D66B5F]/15 text-[#D66B5F]', hover: 'hover:bg-[#D66B5F]/25', route: '/admin/report/academic-reports', count: 0 },
  ];

  // State for Calendar
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Form states
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showAccountantForm, setShowAccountantForm] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    date: '',
    category: 'academic',
    priority: 'medium'
  });

  // Calendar helpers
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarStartOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const calendarCells = Math.ceil((calendarStartOffset + daysInMonth) / 7) * 7;

  const isSameDate = (a, b) => (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

  const calendarDays = Array.from({ length: calendarCells }, (_, i) => {
    const dayNumber = i - calendarStartOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(calendarYear, calendarMonth, dayNumber);
  });

  const eventDateKeys = new Set(
    upcomingEventsList
      .map((event) => {
        const date = parseEventDate(event.date);
        if (!date) return null;
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
      .filter(Boolean)
  );

  // 4. Methods
  const fetchFinanceStats = async () => {
    try {
      setFinanceLoading(true);
      const res = await api.get('/admin/finance/dashboard-stats');
      if (res && res.data && res.data.success) {
        dispatch(setFinanceStats(res.data.data));
      }
    } catch (error) {
      console.error("Error fetching finance stats:", error);
    } finally {
      setFinanceLoading(false);
    }
  };

  const fetchLiveAttendanceData = async () => {
    try {
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth() + 1;
      
      const todayYMD = () => {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const todayStr = todayYMD();

      const currentYear = today.getFullYear();
      const monthIdx = today.getMonth(); // 0 = Jan
      const academicYear = monthIdx < 3 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;

      // Fetch student attendance and staff attendance in parallel
      const [studentAttRes, staffListRes, staffAttRes] = await Promise.all([
        api.get('/admin/attendance', { params: { academicYear } }).catch(err => {
          console.error("Failed to fetch student attendance:", err);
          return { data: { data: [] } };
        }),
        api.get('/admin/staff').catch(err => {
          console.error("Failed to fetch staff list:", err);
          return { data: { data: [] } };
        }),
        api.get('/admin/staff/attendance/report', { params: { month: todayMonth, year: todayYear } }).catch(err => {
          console.error("Failed to fetch staff attendance report:", err);
          return { data: { data: [] } };
        })
      ]);

      // 1. Process Student Attendance
      const studentAttRecords = studentAttRes.data?.data || [];
      let studentPresent = 0;
      let studentAbsent = 0;
      let studentLate = 0;

      studentAttRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = String(recordDate.getMonth() + 1).padStart(2, "0");
        const recordDay = String(recordDate.getDate()).padStart(2, "0");
        const recordDateStr = `${recordYear}-${recordMonth}-${recordDay}`;

        if (recordDateStr === todayStr) {
          record.entries?.forEach(entry => {
            if (entry.status === 'present') {
              studentPresent++;
            } else if (entry.status === 'absent' || entry.status === 'on_leave') {
              studentAbsent++;
            } else if (entry.status === 'late') {
              studentLate++;
            }
          });
        }
      });

      const studentTotal = studentPresent + studentAbsent + studentLate;
      const studentPercentage = studentTotal > 0 ? parseFloat(((studentPresent / studentTotal) * 100).toFixed(1)) : 100;

      // 2. Process Teachers and Other Staff Attendance
      const staffList = staffListRes.data?.data || staffListRes.data || [];
      const staffAttRecords = staffAttRes.data?.data || staffAttRes.data || [];

      // Filter staff lists
      const teachers = staffList.filter(s => s.role === 'teacher');
      const otherStaff = staffList.filter(s => s.role !== 'teacher');

      const teacherIds = new Set(teachers.map(t => t._id));
      const otherStaffIds = new Set(otherStaff.map(s => s._id));

      let teacherPresent = 0;
      let teacherAbsent = 0;
      let teacherLate = 0;

      let otherPresent = 0;
      let otherAbsent = 0;
      let otherLate = 0;

      staffAttRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = String(recordDate.getMonth() + 1).padStart(2, "0");
        const recordDay = String(recordDate.getDate()).padStart(2, "0");
        const recordDateStr = `${recordYear}-${recordMonth}-${recordDay}`;

        if (recordDateStr === todayStr) {
          const staffId = typeof record.staffId === 'object' ? record.staffId?._id : record.staffId;
          const status = record.status || 'present';
          
          if (teacherIds.has(staffId)) {
            if (status === 'present') teacherPresent++;
            else if (status === 'absent' || status === 'on_leave') teacherAbsent++;
            else if (status === 'late' || status === 'half_day') teacherLate++;
          } else if (otherStaffIds.has(staffId)) {
            if (status === 'present') otherPresent++;
            else if (status === 'absent' || status === 'on_leave') otherAbsent++;
            else if (status === 'late' || status === 'half_day') otherLate++;
          }
        }
      });

      const teacherTotal = teacherPresent + teacherAbsent + teacherLate;
      const teacherPercentage = teacherTotal > 0 ? parseFloat(((teacherPresent / teacherTotal) * 100).toFixed(1)) : 100;

      const otherTotal = otherPresent + otherAbsent + otherLate;
      const otherPercentage = otherTotal > 0 ? parseFloat(((otherPresent / otherTotal) * 100).toFixed(1)) : 100;

      setLiveAttendanceData({
        Students: { present: studentPresent, absent: studentAbsent, late: studentLate, percentage: studentPercentage },
        Teachers: { present: teacherPresent, absent: teacherAbsent, late: teacherLate, percentage: teacherPercentage },
        'Other Staff': { present: otherPresent, absent: otherAbsent, late: otherLate, percentage: otherPercentage }
      });
      const trendRes = await api.get('/admin/attendance/dashboard-stats').catch(err => {
        console.error("Failed to fetch monthly trend:", err);
        return { data: { data: { monthlyTrend: [] } } };
      });
      if (trendRes.data?.success) {
        setAttendanceMonthlyTrend(trendRes.data.data.monthlyTrend || []);
      }
    } catch (err) {
      console.error("Failed to fetch live attendance stats:", err);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.get('/admin/notice?limit=5');
      if (res && res.data && res.data.success) {
        dispatch(setNotices(res.data.data.map(n => ({
          id: n._id,
          title: n.title,
          date: n.date,
          category: n.category,
          priority: n.isPinned ? 'high' : 'medium',
          views: n.viewedBy ? n.viewedBy.length : 0,
          daysLeft: n.daysLeft,
          createdAt: n.createdAt
        }))));
      }
    } catch (err) {
      console.error("Error fetching notices:", err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/admin/leave/staff?status=pending');
      if (res && res.data && res.data.success) {
        dispatch(setLeaveRequests(res.data.data.map(l => ({
          id: l._id,
          name: l.staffId?.name || 'Unknown',
          role: l.staffId?.role || 'Staff',
          type: l.leaveType,
          dates: `${new Date(l.fromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(l.toDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
          appliedOn: new Date(l.createdAt).toLocaleDateString(),
          reason: l.reason,
          status: l.status
        }))));
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  const fetchPerformance = async () => {
    try {
      const res = await api.get('/admin/academic/analytics/dashboard-performance');
      if (res && res.data && res.data.success) {
        if (res.data.data.performance?.length) setPerformanceData(res.data.data.performance);
        if (res.data.data.subjects?.length) setSubjectPerformanceData(res.data.data.subjects);
      }
    } catch (err) {
      console.error("Error fetching performance:", err);
    }
  };


  const handleSaveEvent = async (event) => {
    try {
      const priorityMapping = {
        'high': 'High',
        'medium': 'Normal',
        'low': 'Normal'
      };
      
      const eventData = {
        title: event.title,
        category: event.category || 'General',
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
        startTime: event.startTime,
        endTime: event.endTime,
        eventFor: event.eventFor || 'All',
        description: event.message || '',
        priority: priorityMapping[event.priority?.toLowerCase()] || 'Normal',
        status: 'Scheduled'
      };

      const res = await api.post('/admin/events', eventData);
      
      if (res && res.data && res.data.success) {
        toast.success('Event saved successfully');
        dispatch(fetchDashboardEvents());
      }
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error(error.response?.data?.message || "Failed to save event");
    }
  };

  const fetchPendingApprovalsCount = async () => {
    try {
      const res = await getAdmissionStats();
      if (res && res.success && Array.isArray(res.data)) {
        const pendingItem = res.data.find(item => item._id === 'pending');
        dispatch(setPendingApprovalsCount(pendingItem ? pendingItem.count : 0));
      } else {
        dispatch(setPendingApprovalsCount(0));
      }
    } catch (err) {
      console.error("Failed to fetch pending approvals stats:", err);
      dispatch(setPendingApprovalsCount(0));
    }
  };

  const handleRefresh = async (isManual = false) => {
    try {
      const results = await Promise.allSettled([
        dispatch(getDashboardStats()).unwrap(),
        dispatch(fetchDashboardEvents()).unwrap(),
        dispatch(fetchDashboardActivities()).unwrap(),
        dispatch(fetchAttendanceAnalytics()).unwrap(),
        fetchFinanceStats(),
        fetchNotices(),
        fetchLeaves(),
        fetchPerformance(),
        fetchPendingApprovalsCount(),
        fetchLiveAttendanceData(),
      ]);

      dispatch(setDashboardLoaded(true));

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error("Dashboard refresh partial failure:", failed);
        if (isManual) {
          toast.error(`${failed.length} section(s) failed to load`);
        }
      } else {
        if (isManual) {
          toast.success("Dashboard refreshed");
        }
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  // 5. Effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    if (!dashboardLoaded) {
      handleRefresh(false);
    }
    
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardLoaded]);

  const handleQuickLinkClick = (link) => {
    if (link.label === 'Calendar') {
      const el = document.getElementById('dashboard-calendar');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        toast.success("Scrolled to Schedule Calendar");
      }
    } else if (link.label === 'Attendance') {
      navigate('/admin/attendance/manage');
    } else if (link.label === 'Reports') {
      navigate('/admin/report/academic-reports');
    } else if (link.label === 'Fees') {
      navigate('/admin/finance/analytics');
    } else if (link.label === 'Homework') {
      navigate('/admin/academics');
    } else if (link.route) {
      navigate(link.route);
    } else {
      addNotification(`Opening ${link.label}`, 'success');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    addNotification(`Selected: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 'success');
  };

  const handlePreviousMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDaysLeft = (dateString) => {
    const target = new Date(dateString);
    const today = new Date();
    const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };
  const handleAddNotice = async (e) => {
    e.preventDefault();
    try {
      const rawCategory = noticeForm.category;
      const categoryValue = typeof rawCategory === 'string'
        ? rawCategory
        : rawCategory?.value || '';

      const rawPriority = noticeForm.priority;
      const priorityValue = typeof rawPriority === 'string'
        ? rawPriority
        : rawPriority?.value || '';

      const noticeData = {
        title: noticeForm.title,
        content: noticeForm.title, // Using title as content for now
        date: noticeForm.date,
        category: (categoryValue || '').toLowerCase(),
        isPinned: (priorityValue || '').toLowerCase() === 'high',
        targetAudience: ['all']
      };

      const res = await api.post('/admin/notice', noticeData);
      
      if (res.data.success) {
        const savedNotice = {
          id: res.data.data._id,
          title: res.data.data.title,
          date: res.data.data.date,
          daysLeft: getDaysLeft(res.data.data.date),
          priority: (res.data.data.priority || '').toLowerCase(),
          category: (res.data.data.category || '').toLowerCase(),
          views: 0,
          createdAt: res.data.data.createdAt || new Date().toISOString()
        };
        dispatch(setNotices([savedNotice, ...notices]));
        setShowNoticeForm(false);
        setNoticeForm({ title: '', date: '', category: 'academic', priority: 'medium' });
        toast.success('Notice saved to backend');
      }
    } catch (error) {
      console.error("Error creating notice:", error);
      toast.error(error.response?.data?.message || "Failed to create notice");
    }
  };

  const [accountantLoading, setAccountantLoading] = useState(false);
  const [accountantSuccess, setAccountantSuccess] = useState(false);

  const handleAddAccountant = async (formData) => {
    setAccountantLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("email", formData.email.trim());
      payload.append("phone", formData.phone.trim());
      if (formData.gender) payload.append("gender", formData.gender);
      if (formData.dob) payload.append("dob", formData.dob);
      if (formData.address) payload.append("address", formData.address.trim());
      if (formData.qualification) payload.append("qualification", formData.qualification);
      if (formData.experience) payload.append("experience", formData.experience);
      if (formData.joiningDate) payload.append("joiningDate", formData.joiningDate);
      if (formData.salary) payload.append("salary", formData.salary);
      if (formData.photo) payload.append("photo", formData.photo);

      console.log("Submitting accountant:", payload);
      await addAccountant(payload);
      setAccountantSuccess(true);
      toast.success("Accountant added! Credentials sent to their email.");
      setTimeout(() => {
        setShowAccountantForm(false);
        setAccountantSuccess(false);
      }, 1500);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add accountant.");
    } finally {
      setAccountantLoading(false);
    }
  };

  const handleAddTeacher = async (teacherData) => {
    try {
      const resultAction = await dispatch(createTeacher(teacherData)).unwrap();
      if (resultAction.success) {
        const designation = teacherData?.designation || resultAction?.teacher?.designation;
        if (designation === "Class Teacher") {
          toast.success("Class Teacher added successfully. Login credentials have been sent to the registered email.");
        } else if (designation === "Subject Teacher") {
          toast.success("Subject Teacher added successfully. Login credentials have been sent to the registered email.");
        } else {
          toast.success("Teacher added successfully. Login credentials have been sent to the registered email.");
        }
        setShowTeacherForm(false);
        handleRefresh();
      }
    } catch (error) {
      toast.error(error?.message || "Failed to add teacher");
    }
  };

  const handleActivityLike = (activityId) => {
    setLikedActivities(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  const handleApproveLeave = async (id) => {
    try {
      const res = await api.put(`/admin/leave/staff/${id}/status`, { status: 'approved' });
      if (res.data.success) {
        dispatch(setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, status: 'approved' } : req)));
        toast.success(`Leave request approved`);
      }
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Failed to approve leave");
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      const res = await api.put(`/admin/leave/staff/${id}/status`, { status: 'rejected' });
      if (res.data.success) {
        dispatch(setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, status: 'rejected' } : req)));
        toast.error(`Leave request rejected`);
      }
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Failed to reject leave");
    }
  };

  const addNotification = (message, type) => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    } else {
      toast(message);
    }
  };

  const markAllNotificationsRead = () => {};

  // Filter functions
  const getFilteredNotices = () => {
    let filtered = [...notices];
    if (filterType !== 'all') {
      filtered = filtered.filter(notice => notice.category === filterType);
    }
    return filtered;
  };

  const getFilteredEvents = () => {
    return [...upcomingEventsList];
  };


  if (hasError) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-slate-800'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl shadow-lg border text-center ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'}`}>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to load dashboard data</h2>
          <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            There was an error communicating with the school servers. Please check your connection and try again.
          </p>
          <button
            onClick={() => handleRefresh(true)}
            className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
        {/* Component 1: Header */}
        <Header
          adminName={adminName}
          setShowTeacherForm={setShowTeacherForm}
          setAccountantForm={setShowAccountantForm}
          currentTime={currentTime}
        />

        {/* Component 2: Overview Stats */}
        <OverviewStats statistics={statistics} loading={loading} pendingApprovalsCount={pendingApprovalsCount} />

        {/* Component 3: Attendance Analytics */}
        <ScheduleAttendance
          activeAttendanceTab={activeAttendanceTab}
          setActiveAttendanceTab={setActiveAttendanceTab}
          attendanceData={liveAttendanceData}
          monthlyAttendanceData={monthlyAttendanceData}
        />

        {/* Component 4: Notices & Finance */}
        <NoticesFinance
          filterType={filterType}
          setFilterType={setFilterType}
          getFilteredNotices={getFilteredNotices}
          setShowNoticeForm={setShowNoticeForm}
          addNotification={addNotification}
          financialSummary={financialSummary}
          paymentMethodsData={financeStats?.paymentMethods}
          financeLoading={financeLoading}
          leaveRequests={leaveRequests}
          handleApproveLeave={handleApproveLeave}
          handleRejectLeave={handleRejectLeave}
          performanceData={performanceData}
          subjectPerformanceData={subjectPerformanceData}
        />



      {(showAccountantForm || showTeacherForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {showAccountantForm && (
            <AddAccountantModal
              isOpen={showAccountantForm}
              onClose={() => setShowAccountantForm(false)}
              onSubmit={handleAddAccountant}
              loading={accountantLoading}
              success={accountantSuccess}
              currentStaff={currentStaffCount}
              maxStaff={maxStaffLimit}
            />
          )}

          {showTeacherForm && (
            <AddTeacherModal
              isOpen={showTeacherForm}
              onClose={() => setShowTeacherForm(false)}
              onSubmit={handleAddTeacher}
              loading={adminLoading?.createTeacher || false}
              currentStaff={currentStaffCount}
              maxStaff={maxStaffLimit}
            />
          )}
        </div>
      )}

      <PanelModal
        id="add-notice-modal"
        title="Add Notice"
        isVisible={showNoticeForm}
        onClose={() => setShowNoticeForm(false)}
        size="md"
      >
        <form onSubmit={handleAddNotice} className="space-y-4">
          <DataField
            required
            label="Notice Title"
            id="noticeForm-title"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Notice title"
          />
          <DataField
            required
            type="date"
            label="Notice Date"
            id="noticeForm-date"
            value={noticeForm.date}
            onChange={(e) => setNoticeForm(prev => ({ ...prev, date: e.target.value }))}
          />
          <SelectField
            label="Category"
            id="noticeForm-category"
            value={noticeForm.category}
            onChange={(e) => setNoticeForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Select category"
          >
            <Option value="academic" label="Academic" />
            <Option value="events" label="Events" />
            <Option value="finance" label="Finance" />
            <Option value="holiday" label="Holiday" />
            <Option value="general" label="General" />
            <Option value="emergency" label="Emergency" />
          </SelectField>
          <SelectField
            label="Priority"
            id="noticeForm-priority"
            value={noticeForm.priority}
            onChange={(e) => setNoticeForm(prev => ({ ...prev, priority: e.target.value }))}
            placeholder="Select priority"
          >
            <Option value="high" label="High" />
            <Option value="medium" label="Medium" />
            <Option value="low" label="Low" />
          </SelectField>
          <div className="flex justify-end gap-2 pt-2">
            <div className="w-24">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                onClick={() => setShowNoticeForm(false)}
                size={12}
              />
            </div>
            <div className="w-24">
              <Button
                type="submit"
                variant="primary"
                text="Save"
                size={12}
              />
            </div>
          </div>
        </form>
      </PanelModal>
    </>
  );
};

export default Dashboard;