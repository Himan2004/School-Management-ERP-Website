import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Percent,
  Eye,
  FileText,
  DollarSign,
  User,
  Plane,
  XCircle,
  Plus,
  Send,
  Download,
  Info
} from 'lucide-react';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataTable,
  Button,
  Select,
  Option,
  DataField,
  SelectField,
  GColumnChart,
  GPieChart,
  PanelModal,
  ModalData,
  ModalGrid
} from '../../components/shared/Common_Components';
import toast from 'react-hot-toast';
import api from '../../services/api';
import axios from 'axios';
import {
  getSalaryDetails,
  getSalarySlips,
  getAttendanceLogs,
  getAttendanceStats,
  getLeaveHistory,
  applyLeave,
  getLeaveBalance,
  getResignation,
  applyResignation,
  withdrawResignation
} from '../../services/adminHrmApi';

const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// ==========================================
// Global module-level cache for instant page switching
// ==========================================
let adminProfileCache = null;
let presentDaysCache = 0;
let absentDaysCache = 0;
let leaveDaysCache = 0;
let halfDaysCache = 0;
let attendancePercentageCache = 0;
let chartDataCache = [];
let pieDataCache = [];
let attendanceHistoryCache = [];

let salaryDetailsCache = {
  basic: 0,
  allowances: [],
  deductions: [],
  gross: 0,
  totalDeduction: 0,
  netPay: 0
};
let payrollHistoryCache = [];

let leaveBalancesCache = {
  approvedLeaves: 0,
  pendingRequests: 0,
  rejectedRequests: 0
};
let leaveHistoryCache = [];
let resignationCache = null;

let hrmFiltersCache = {
  activeTab: 'attendance',
  activeSubTab: 'salary',
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  selectedStatus: 'All',
  searchText: ''
};

// Cache map for attendance data by key: `${year}-${month}`
const attendanceCacheMap = new Map();

const HRM = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState(hrmFiltersCache.activeTab);
  const [activeSubTab, setActiveSubTab] = useState(hrmFiltersCache.activeSubTab);

  // Global Filters for Attendance
  const [selectedYear, setSelectedYear] = useState(hrmFiltersCache.selectedYear);
  const [selectedMonth, setSelectedMonth] = useState(hrmFiltersCache.selectedMonth);
  const [selectedStatus, setSelectedStatus] = useState(hrmFiltersCache.selectedStatus);
  const [searchText, setSearchText] = useState(hrmFiltersCache.searchText);
  const [debouncedSearchText, setDebouncedSearchText] = useState(hrmFiltersCache.searchText);

  // Loading States
  const [loading, setLoading] = useState(!attendanceHistoryCache || attendanceHistoryCache.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Profile data from backend
  const [adminProfile, setAdminProfile] = useState(adminProfileCache);

  // Attendance states
  const [presentDays, setPresentDays] = useState(presentDaysCache);
  const [absentDays, setAbsentDays] = useState(absentDaysCache);
  const [leaveDays, setLeaveDays] = useState(leaveDaysCache);
  const [halfDays, setHalfDays] = useState(halfDaysCache);
  const [attendancePercentage, setAttendancePercentage] = useState(attendancePercentageCache);
  const [chartData, setChartData] = useState(chartDataCache);
  const [pieData, setPieData] = useState(pieDataCache);
  const [attendanceHistory, setAttendanceHistory] = useState(attendanceHistoryCache);

  // Salary states
  const [salaryDetails, setSalaryDetails] = useState(salaryDetailsCache);
  const [payrollHistory, setPayrollHistory] = useState(payrollHistoryCache);

  // Leave states
  const [leaveBalances, setLeaveBalances] = useState(leaveBalancesCache);
  const [leaveHistory, setLeaveHistory] = useState(leaveHistoryCache);
  const [loadingLeaves, setLoadingLeaves] = useState(!leaveHistoryCache || leaveHistoryCache.length === 0);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    totalDays: 0,
    reason: ''
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Resignation states
  const [resignation, setResignation] = useState(resignationCache);
  const [resignationForm, setResignationForm] = useState({ lastDay: '', reason: '' });

  // Modal States
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Salary Modal States
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Sync state changes back to global filters cache
  useEffect(() => {
    hrmFiltersCache = {
      activeTab,
      activeSubTab,
      selectedYear,
      selectedMonth,
      selectedStatus,
      searchText
    };
  }, [activeTab, activeSubTab, selectedYear, selectedMonth, selectedStatus, searchText]);

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchText]);

  // AbortController Ref for cancelling stale requests
  const abortControllerRef = useRef(null);

  // Fetch admin profile
  const fetchAdminProfile = async () => {
    if (adminProfileCache) return;
    try {
      const res = await api.get('/admin/profile');
      if (res.data?.success) {
        setAdminProfile(res.data.data);
        adminProfileCache = res.data.data;
      }
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
    }
  };

  // Fetch attendance data (optimized with cache map and AbortController)
  const fetchAttendanceData = useCallback(async () => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cacheKey = `${selectedYear}-${selectedMonth}`;

    // Check if cache map has this combination
    if (attendanceCacheMap.has(cacheKey)) {
      const cached = attendanceCacheMap.get(cacheKey);

      // Restore states instantly
      setPresentDays(cached.stats.presentDays);
      setAbsentDays(cached.stats.absentDays);
      setLeaveDays(cached.stats.leaveDays);
      setHalfDays(cached.stats.halfDays);
      setAttendancePercentage(cached.stats.attendancePercentage);
      setChartData(cached.stats.chartData || []);
      setPieData(cached.stats.pieData || []);

      // Filter and search logs locally on cached data to avoid backend trips
      let filteredLogs = cached.logs || [];
      if (selectedStatus && selectedStatus !== 'All') {
        if (selectedStatus === 'Present') {
          filteredLogs = filteredLogs.filter(l => l.attendance === 'Present');
        } else if (selectedStatus === 'Absent') {
          filteredLogs = filteredLogs.filter(l => l.attendance === 'Absent');
        } else if (selectedStatus === 'Leave') {
          filteredLogs = filteredLogs.filter(l => l.attendance === 'Leave');
        } else if (selectedStatus === 'Half Day') {
          filteredLogs = filteredLogs.filter(l => l.attendance === 'Half Day');
        }
      }
      if (debouncedSearchText.trim()) {
        const regex = new RegExp(debouncedSearchText.trim(), 'i');
        filteredLogs = filteredLogs.filter(l => 
          regex.test(l.date) || 
          regex.test(l.day) || 
          regex.test(l.attendance) || 
          regex.test(l.type) || 
          regex.test(l.reason)
        );
      }
      setAttendanceHistory(filteredLogs);

      // Save global cache variables for sidebar transitions
      presentDaysCache = cached.stats.presentDays;
      absentDaysCache = cached.stats.absentDays;
      leaveDaysCache = cached.stats.leaveDays;
      halfDaysCache = cached.stats.halfDays;
      attendancePercentageCache = cached.stats.attendancePercentage;
      chartDataCache = cached.stats.chartData || [];
      pieDataCache = cached.stats.pieData || [];
      attendanceHistoryCache = filteredLogs;

      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Determine if we should show full page loader or just background table loader
    const hasCachedData = attendanceHistory && attendanceHistory.length > 0;
    if (!hasCachedData) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const statsRes = await api.get('/admin/hrm/attendance/stats', {
        params: { year: selectedYear, month: selectedMonth },
        signal: controller.signal
      });

      const logsRes = await api.get('/admin/hrm/attendance/logs', {
        params: { year: selectedYear, month: selectedMonth, status: 'All', limit: 1000 },
        signal: controller.signal
      });

      if (statsRes.data?.success && logsRes.data?.success) {
        const statsData = statsRes.data.data;
        const logsData = logsRes.data.data;

        // Save to cache map
        attendanceCacheMap.set(cacheKey, {
          stats: statsData,
          logs: logsData
        });

        // Set state
        setPresentDays(statsData.presentDays);
        setAbsentDays(statsData.absentDays);
        setLeaveDays(statsData.leaveDays);
        setHalfDays(statsData.halfDays);
        setAttendancePercentage(statsData.attendancePercentage);
        setChartData(statsData.chartData || []);
        setPieData(statsData.pieData || []);

        // Filter and search
        let filteredLogs = logsData || [];
        if (selectedStatus && selectedStatus !== 'All') {
          if (selectedStatus === 'Present') {
            filteredLogs = filteredLogs.filter(l => l.attendance === 'Present');
          } else if (selectedStatus === 'Absent') {
            filteredLogs = filteredLogs.filter(l => l.attendance === 'Absent');
          } else if (selectedStatus === 'Leave') {
            filteredLogs = filteredLogs.filter(l => l.attendance === 'Leave');
          } else if (selectedStatus === 'Half Day') {
            filteredLogs = filteredLogs.filter(l => l.attendance === 'Half Day');
          }
        }
        if (debouncedSearchText.trim()) {
          const regex = new RegExp(debouncedSearchText.trim(), 'i');
          filteredLogs = filteredLogs.filter(l => 
            regex.test(l.date) || 
            regex.test(l.day) || 
            regex.test(l.attendance) || 
            regex.test(l.type) || 
            regex.test(l.reason)
          );
        }
        setAttendanceHistory(filteredLogs);

        // Sync global cache variables
        presentDaysCache = statsData.presentDays;
        absentDaysCache = statsData.absentDays;
        leaveDaysCache = statsData.leaveDays;
        halfDaysCache = statsData.halfDays;
        attendancePercentageCache = statsData.attendancePercentage;
        chartDataCache = statsData.chartData || [];
        pieDataCache = statsData.pieData || [];
        attendanceHistoryCache = filteredLogs;
      }
    } catch (error) {
      if (axios.isCancel(error) || error.name === 'CanceledError' || error.message === 'canceled') {
        return; // Request was canceled, ignore
      }
      console.error('Error fetching attendance:', error);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedYear, selectedMonth, selectedStatus, debouncedSearchText, attendanceHistory]);

  // Fetch salary details
  const fetchSalaryInfo = async (forceRefetch = false) => {
    if (salaryDetailsCache.basic > 0 && payrollHistoryCache.length > 0 && !forceRefetch) {
      return;
    }
    try {
      const detailsRes = await getSalaryDetails();
      if (detailsRes.success) {
        setSalaryDetails(detailsRes.data);
        salaryDetailsCache = detailsRes.data;
      }
      const slipsRes = await getSalarySlips();
      if (slipsRes.success) {
        setPayrollHistory(slipsRes.data);
        payrollHistoryCache = slipsRes.data;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load salary info');
    }
  };

  // Fetch leaves details
  const fetchLeavesInfo = async (forceRefetch = false) => {
    if (leaveHistoryCache.length > 0 && !forceRefetch) {
      return;
    }
    setLoadingLeaves(true);
    try {
      const balanceRes = await getLeaveBalance();
      if (balanceRes.success) {
        setLeaveBalances(balanceRes.data);
        leaveBalancesCache = balanceRes.data;
      }
      const historyRes = await getLeaveHistory();
      if (historyRes.success) {
        setLeaveHistory(historyRes.data);
        leaveHistoryCache = historyRes.data;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load leaves info');
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Fetch resignation details
  const fetchResignationInfo = async (forceRefetch = false) => {
    if (resignationCache && !forceRefetch) {
      return;
    }
    try {
      const res = await getResignation();
      if (res.success) {
        setResignation(res.data);
        resignationCache = res.data;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load resignation info');
    }
  };

  // Lifecycle effects
  useEffect(() => {
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceData();
    }
  }, [activeTab, selectedYear, selectedMonth, selectedStatus, debouncedSearchText]);

  useEffect(() => {
    if (activeTab === 'employee_details') {
      if (activeSubTab === 'salary') fetchSalaryInfo();
      else if (activeSubTab === 'leaves') fetchLeavesInfo();
      else if (activeSubTab === 'resignation') fetchResignationInfo();
    }
  }, [activeTab, activeSubTab]);

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];
  const years = [2024, 2025, 2026, 2027, 2028];

  // Resolve current Admin details
  const userStr = localStorage.getItem("user");
  const localUserObj = userStr ? JSON.parse(userStr) : null;

  const currentAdmin = {
    name: adminProfile?.name || localUserObj?.name || "Admin User",
    employeeId: localUserObj?.employeeId || localUserObj?.loginId || "ADM-9021",
    department: "Administration",
    designation: adminProfile?.designation || "Senior Administrator",
    doj: adminProfile?.doj || "15 Jan 2022",
    pan: adminProfile?.pan || "ABCDE1234F",
    pfNumber: adminProfile?.pfNumber || "MH/BAN/009021/100",
    bankName: adminProfile?.bankName || "HDFC Bank Ltd.",
    bankAccount: adminProfile?.bankAccount || "50100412345678",
    email: adminProfile?.email || localUserObj?.email || "",
    phone: adminProfile?.phone || localUserObj?.phone || ""
  };

  // Leave Form Handlers
  const handleLeaveFormChange = (field, value) => {
    setLeaveForm(prev => {
      const next = { ...prev, [field]: value };
      if (next.fromDate && next.toDate) {
        const start = new Date(next.fromDate);
        const end = new Date(next.toDate);
        if (end >= start) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          next.totalDays = diffDays;
        } else {
          next.totalDays = 0;
        }
      }
      return next;
    });
  };

  const handleApplyLeave = async () => {
    if (!leaveForm.leaveType || !leaveForm.fromDate || !leaveForm.toDate || leaveForm.totalDays <= 0 || !leaveForm.reason) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await applyLeave({
        leaveType: leaveForm.leaveType,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: leaveForm.reason
      });
      if (res.success) {
        toast.success("Leave request submitted successfully.");
        setLeaveForm({ leaveType: '', fromDate: '', toDate: '', totalDays: 0, reason: '' });
        await fetchLeavesInfo(true); // Force refetch to invalidate and load fresh leaves list & balance
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Resignation Submit
  const handleResignationSubmit = async () => {
    if (!resignationForm.lastDay || !resignationForm.reason) {
      toast.error("Please specify your last working day and reason.");
      return;
    }
    try {
      const res = await applyResignation({
        lastDay: resignationForm.lastDay,
        reason: resignationForm.reason
      });
      if (res.success) {
        toast.success("Resignation request submitted.");
        setResignationForm({ lastDay: '', reason: '' });
        await fetchResignationInfo(true); // Force refetch resignation status
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit resignation');
    }
  };

  const handleCancelResignation = async () => {
    try {
      const res = await withdrawResignation();
      if (res.success) {
        toast.success("Resignation request withdrawn.");
        await fetchResignationInfo(true); // Force refetch resignation status
      }
    } catch (error) {
      toast.error(error.message || 'Failed to withdraw resignation');
    }
  };

  // Columns definitions
  const attendanceColumns = [
    { key: "date", label: "Date", render: (val) => <span className="font-bold text-gray-900 whitespace-nowrap block min-w-max">{val}</span> },
    { key: "day", label: "Day", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "attendance", label: "Attendance", render: (val) => {
        let color = "text-emerald-600";
        if (val === 'Absent') color = "text-rose-600";
        else if (val === 'Leave') color = "text-amber-600";
        return <span className={`font-bold ${color}`}>{val}</span>;
    }},
    { key: "type", label: "Attendance Type", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "hours", label: "Working Hours", align: "center", render: (val) => <span className="text-gray-800 font-medium">{val}</span> },
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <button 
        onClick={() => { setSelectedRecord(row); setIsAttendanceModalOpen(true); }}
        className="p-1.5 text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
      >
        <Eye size={14} /> Details
      </button>
    )}
  ];

  const leaveColumns = [
    { key: "appliedDate", label: "Applied Date", render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "leaveType", label: "Leave Type", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "fromDate", label: "From Date", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "toDate", label: "To Date", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "totalDays", label: "Total Days", align: "center", render: (val) => <span className="font-bold text-[#223F74]">{val}</span> },
    { key: "status", label: "Status", align: "center", render: (val) => {
        let bg = 'bg-amber-100 text-amber-700';
        if (val === 'Approved') bg = 'bg-emerald-100 text-emerald-700';
        else if (val === 'Rejected') bg = 'bg-rose-100 text-rose-700';
        else if (val === 'Cancelled') bg = 'bg-slate-100 text-slate-700';
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${bg}`}>{val}</span>;
    }}
  ];

  const payrollColumns = [
    { key: "month", label: "Month", render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "basic", label: "Basic Pay", render: (val) => <span className="font-medium text-gray-600">{formatCurrency(val)}</span> },
    { key: "allowance", label: "Allowances", render: (val) => <span className="font-medium text-gray-600">{formatCurrency(val)}</span> },
    { key: "deduction", label: "Deductions", render: (val) => <span className="font-medium text-rose-600">-{formatCurrency(val)}</span> },
    { key: "netSalary", label: "Net Payable", render: (val) => <span className="font-bold text-[#223F74]">{formatCurrency(val)}</span> },
    { key: "status", label: "Status", align: "center", render: (val) => {
        let bg = 'bg-emerald-100 text-emerald-700';
        if (val === 'Draft') bg = 'bg-amber-100 text-amber-700';
        else if (val === 'Held') bg = 'bg-rose-100 text-rose-700';
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${bg}`}>{val}</span>;
    }},
    { key: "actions", label: "Pay Slip", align: "center", render: (_, row) => (
      <button 
        onClick={() => { setSelectedPayslip(row); setIsPayslipModalOpen(true); }}
        className="p-1.5 text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
      >
        <FileText size={14} /> View
      </button>
    )}
  ];

  return (
    <div className="w-full space-y-6 pb-10 text-left font-sans max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <Heading
        primaryText={
          <div className="flex flex-col gap-1 text-left relative z-10">
            <span className="text-[#e8612c] font-black text-2xl">Manage HRM</span>
            <span className="text-[#ffffff] font-medium text-xs">Manage your personal attendance logs, leave balances, payslips, and resignation status.</span>
          </div>
        }
        secondaryText=""
        size={12}
        showAnimations={true}
      />

      {/* Tab Navigation (Full Width, Under Header) */}
      <div className="w-full border-b border-slate-200 flex">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-4 text-center text-sm font-bold transition-all border-b-2 ${
            activeTab === 'attendance'
              ? "border-[#223F74] text-[#223F74]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          My Attendance
        </button>
        <button
          onClick={() => setActiveTab('employee_details')}
          className={`flex-1 py-4 text-center text-sm font-bold transition-all border-b-2 ${
            activeTab === 'employee_details'
              ? "border-[#223F74] text-[#223F74]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Employee Details
        </button>
      </div>

      {/* Main Tab content: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Cards */}
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard 
              title="Present Days" 
              value={loading ? "-" : presentDays} 
              icon={<CheckCircle2 size={22} />} 
              size={3} 
              accentColor="#10B981" 
            />
            <EnhancedDashCard 
              title="Absent Days" 
              value={loading ? "-" : absentDays} 
              icon={<XCircle size={22} />} 
              size={3} 
              accentColor="#EF4444" 
            />
            <EnhancedDashCard 
              title="Leaves Taken" 
              value={loading ? "-" : leaveDays} 
              icon={<Plane size={22} />} 
              size={3} 
              accentColor="#F59E0B" 
            />
            <EnhancedDashCard 
              title="Attendance Percentage" 
              value={loading ? "-" : `${attendancePercentage}%`} 
              icon={<Percent size={22} />} 
              size={3} 
              accentColor="#223F74" 
            />
          </DashGrid>

          {/* Filters */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-sm">
            <Grid cols={12} gap={4}>
              <SelectField
                label="Academic Year"
                size={3}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <Option key={y} value={y} label={String(y)} />)}
              </SelectField>
              
              <SelectField
                label="Month"
                size={3}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map(m => <Option key={m.value} value={m.value} label={m.label} />)}
              </SelectField>

              <SelectField
                label="Attendance Status"
                size={3}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <Option value="All" label="All Statuses" />
                <Option value="Present" label="Present" />
                <Option value="Absent" label="Absent" />
                <Option value="Leave" label="Leave" />
                <Option value="Half Day" label="Half Day" />
              </SelectField>

              <DataField
                type="text"
                label="Search Logs"
                size={3}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
              />
            </Grid>
          </div>

          {/* Charts */}
          {loading ? (
            <div className="h-[250px] flex items-center justify-center bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm">
              <div className="animate-spin w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full"></div>
            </div>
          ) : chartData.length > 0 ? (
            <DashGrid cols={12} gap={4}>
              <GColumnChart 
                title="Monthly Attendance Overview"
                data={chartData} 
                bars={[
                  { key: "Present", label: "Present", color: "#10B981" },
                  { key: "Half Day", label: "Half Day", color: "#3B82F6" },
                  { key: "Leave", label: "Leave Taken", color: "#F59E0B" },
                  { key: "Absent", label: "Absent", color: "#EF4444" }
                ]}
                size={8}
                height={250}
              />
              <GPieChart 
                title="Attendance Distribution"
                data={pieData} 
                colors={["#10B981", "#EF4444", "#F59E0B", "#3B82F6"]}
                size={4}
                height={250} 
              />
            </DashGrid>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm">
              <Calendar size={48} className="text-slate-200 mb-2" />
              <h3 className="text-base font-bold text-slate-800">No records found for filter.</h3>
            </div>
          )}

          {/* Records Table */}
          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm p-6 relative">
            {refreshing && (
              <div className="absolute right-6 top-6 flex items-center gap-2 text-xs font-bold text-[#223F74] animate-pulse">
                <div className="w-4 h-4 border-2 border-[#223F74] border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </div>
            )}
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full"></div>
              </div>
            ) : attendanceHistory.length > 0 ? (
              <DataTable 
                title="Attendance Logs"
                rows={attendanceHistory}
                columns={attendanceColumns}
                searchable={false}
                exportable={true}
                exportFileName={`Attendance_Logs_${selectedMonth}_${selectedYear}`}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 font-medium">No log details available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Tab content: Employee Details */}
      {activeTab === 'employee_details' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-100 gap-1 overflow-x-auto pb-px">
            {[
              { id: 'salary', label: 'Salary Details', icon: <DollarSign size={16} /> },
              { id: 'leaves', label: 'Leaves Management', icon: <Plane size={16} /> },
              { id: 'resignation', label: 'My Resignation', icon: <FileText size={16} /> }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeSubTab === sub.id
                    ? 'border-[#223F74] text-[#223F74]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {sub.icon} {sub.label}
              </button>
            ))}
          </div>

          {/* Subtab 1: Salary Details */}
          {activeSubTab === 'salary' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <DashGrid cols={12} gap={4}>
                <EnhancedDashCard title="Basic Salary (Monthly)" value={formatCurrency(salaryDetails.basic)} icon={<DollarSign />} size={3} accentColor="#10B981" />
                <EnhancedDashCard title="Gross Allowances" value={formatCurrency(salaryDetails.gross - salaryDetails.basic)} icon={<Plus />} size={3} accentColor="#3B82F6" />
                <EnhancedDashCard title="Deductions (PF + Tax)" value={formatCurrency(salaryDetails.totalDeduction)} icon={<XCircle />} size={3} accentColor="#EF4444" />
                <EnhancedDashCard title="Net Monthly In-Hand" value={formatCurrency(salaryDetails.netPay)} icon={<CheckCircle2 />} size={3} accentColor="#223F74" />
              </DashGrid>

              <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm p-6">
                <DataTable
                  title="Past Payments & Slips"
                  rows={payrollHistory}
                  columns={payrollColumns}
                  searchable={true}
                  searchPlaceholder="Search payroll slips..."
                />
              </div>
            </div>
          )}

          {/* Subtab 2: Leaves */}
          {activeSubTab === 'leaves' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Leave Statistics */}
              <DashGrid cols={12} gap={4}>
                <EnhancedDashCard 
                  title="Approved Leaves" 
                  value={loadingLeaves ? <div className="h-8 w-16 bg-white/20 rounded animate-pulse" /> : String(leaveBalances.approvedLeaves ?? 0)} 
                  icon={<CheckCircle2 />} 
                  size={4} 
                  accentColor="#10B981" 
                />
                <EnhancedDashCard 
                  title="Pending Requests" 
                  value={loadingLeaves ? <div className="h-8 w-16 bg-white/20 rounded animate-pulse" /> : String(leaveBalances.pendingRequests ?? 0)} 
                  icon={<Clock />} 
                  size={4} 
                  accentColor="#F59E0B" 
                />
                <EnhancedDashCard 
                  title="Rejected Requests" 
                  value={loadingLeaves ? <div className="h-8 w-16 bg-white/20 rounded animate-pulse" /> : String(leaveBalances.rejectedRequests ?? 0)} 
                  icon={<XCircle />} 
                  size={4} 
                  accentColor="#EF4444" 
                />
              </DashGrid>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Apply Form */}
                <div className="lg:col-span-5 bg-white rounded-[24px] border border-[#E7E2DB] p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Request Leave</h3>
                  <div className="space-y-4">
                    <SelectField
                      label="Leave Type"
                      value={leaveForm.leaveType}
                      onChange={(e) => handleLeaveFormChange('leaveType', e.target.value)}
                    >
                      <Option value="" label="Select Leave Type" disabled hidden />
                      <Option value="Casual Leave (CL)" label="Casual Leave (CL)" />
                      <Option value="Sick Leave (SL)" label="Sick Leave (SL)" />
                      <Option value="Earned Leave (EL)" label="Earned Leave (EL)" />
                      <Option value="Maternity Leave" label="Maternity Leave" />
                      <Option value="Paternity Leave" label="Paternity Leave" />
                      <Option value="Emergency Leave" label="Emergency Leave" />
                    </SelectField>

                    <Grid cols={12} gap={4}>
                      <DataField
                        type="date"
                        label="From Date"
                        size={6}
                        value={leaveForm.fromDate}
                        onChange={(e) => handleLeaveFormChange('fromDate', e.target.value)}
                      />
                      <DataField
                        type="date"
                        label="To Date"
                        size={6}
                        value={leaveForm.toDate}
                        onChange={(e) => handleLeaveFormChange('toDate', e.target.value)}
                      />
                    </Grid>

                    <DataField
                      type="number"
                      label="Calculated Days"
                      value={leaveForm.totalDays}
                      readOnly={true}
                    />

                    <DataField
                      type="textarea"
                      label="Reason for Leave"
                      value={leaveForm.reason}
                      onChange={(e) => handleLeaveFormChange('reason', e.target.value)}
                      placeholder="Specify reason..."
                      rows={3}
                    />

                    <Button
                      text={submittingLeave ? "Submitting Request..." : "Submit Application"}
                      variant="primary"
                      className="w-full justify-center"
                      icon={submittingLeave ? null : <Send size={16} />}
                      onClick={handleApplyLeave}
                      disabled={submittingLeave}
                      loading={submittingLeave}
                    />
                  </div>
                </div>

                {/* History Table */}
                <div className="lg:col-span-7 bg-white rounded-[24px] border border-[#E7E2DB] p-6 shadow-sm">
                  <DataTable
                    title="Leave Application History"
                    rows={leaveHistory}
                    columns={leaveColumns}
                    searchable={true}
                    searchPlaceholder="Search past leaves..."
                    onRefresh={() => fetchLeavesInfo(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtab 3: My Resignation */}
          {activeSubTab === 'resignation' && (
            <div className="bg-white rounded-[24px] border border-[#E7E2DB] p-6 shadow-sm max-w-4xl mx-auto animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-3 mb-6">Service Resignation Request</h3>
              
              {!resignation ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                     <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                     <div>
                       <h4 className="font-bold text-emerald-900 text-sm">Employment Status: Active</h4>
                       <p className="text-xs text-emerald-700 mt-0.5">Your status is currently active. You can apply for a formal resignation using the form below if needed.</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <DataField
                      type="date"
                      label="Proposed Last Working Day"
                      value={resignationForm.lastDay}
                      onChange={(e) => setResignationForm(prev => ({ ...prev, lastDay: e.target.value }))}
                    />
                    <DataField
                      type="textarea"
                      label="Detailed Reason for Leaving"
                      value={resignationForm.reason}
                      onChange={(e) => setResignationForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Specify your reasons for resignation..."
                      rows={5}
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        text="Apply Resignation"
                        variant="danger"
                        icon={<XCircle size={16} />}
                        onClick={handleResignationSubmit}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">Status: Resignation {resignation.status}</h4>
                      <p className="text-xs text-amber-700 mt-0.5">Your request is currently in status: <span className="font-bold">{resignation.status}</span>.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <Grid cols={12} gap={4}>
                      <div className="col-span-6">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Applied Date</p>
                        <p className="font-bold text-slate-900 mt-1">{resignation.date}</p>
                      </div>
                      <div className="col-span-6">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Proposed Last Working Day</p>
                        <p className="font-bold text-slate-900 mt-1">{resignation.lastDay}</p>
                      </div>
                    </Grid>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reason Submitted</p>
                      <p className="text-sm text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-200">{resignation.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reviewer Remarks</p>
                      <p className="text-xs text-slate-500 mt-1 italic">{resignation.remarks}</p>
                    </div>
                  </div>

                  {resignation.status === 'Pending' && (
                    <div className="flex justify-end">
                      <Button
                        text="Withdraw Resignation Request"
                        variant="secondary"
                        onClick={handleCancelResignation}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attendance Detail Modal */}
      <PanelModal 
        id="attendance-details-modal" 
        title="Attendance Details" 
        size="md"
        isVisible={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
      >
        {selectedRecord ? (
          <div className="space-y-6 pb-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Name</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{currentAdmin.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Employee ID</p>
                  <p className="font-mono font-bold text-slate-600 text-sm mt-0.5">{currentAdmin.employeeId}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Attendance Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Date</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Day</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRecord.day}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Status</p>
                  <span className={`inline-block font-bold text-xs mt-1 ${selectedRecord.attendance === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedRecord.attendance}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Type</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRecord.type}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Hours Logged</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRecord.hours}</p>
                </div>
              </div>
            </div>

            {selectedRecord.reason && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Remarks / Notes</h3>
                <p className="text-sm text-slate-700">{selectedRecord.reason}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">No record selected</div>
        )}
      </PanelModal>

      {/* Salary Payslip Modal */}
      <PanelModal
        id="payslip-details-modal"
        title="Employee Pay Slip"
        size="lg"
        isVisible={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
      >
        {selectedPayslip ? (
          <div className="space-y-6 pb-6 bg-white text-slate-800 p-4 border border-slate-100 rounded-2xl">
            {/* Header Slip */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-[#223F74] tracking-tight">GRAPHURA ACADEMY</h2>
                <p className="text-xs text-slate-400 font-medium">Graphura School Management ERP Payroll Slip</p>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">{selectedPayslip.status}</span>
                <p className="text-xs text-slate-400 font-semibold mt-1">Date: {selectedPayslip.date}</p>
              </div>
            </div>

            {/* Payslip Admin Profile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block font-bold uppercase">Name</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentAdmin.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Employee ID</span>
                <span className="font-bold font-mono text-slate-800 mt-0.5 block">{currentAdmin.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Designation</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentAdmin.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Pay Period</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedPayslip.month}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block font-bold uppercase">PAN Card</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentAdmin.pan}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block font-bold uppercase">PF Account</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentAdmin.pfNumber}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block font-bold uppercase">Bank Account</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentAdmin.bankAccount}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block font-bold uppercase">Payment Mode</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedPayslip.method}</span>
              </div>
            </div>

            {/* Pay Slips Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-[#223F74] text-white py-1.5 px-3 font-bold text-xs">EARNINGS</div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Basic Pay</span>
                    <span className="font-bold">{formatCurrency(selectedPayslip.basic)}</span>
                  </div>
                  {(selectedPayslip.allowances || []).map((allow, idx) => (
                    <div className="flex justify-between" key={idx}>
                      <span className="text-slate-500">{allow.name}</span>
                      <span className="font-bold">{formatCurrency(allow.amount)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between text-slate-900 font-black">
                    <span>Gross Earnings</span>
                    <span>{formatCurrency(selectedPayslip.basic + (selectedPayslip.allowance || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-rose-900 text-white py-1.5 px-3 font-bold text-xs">DEDUCTIONS</div>
                <div className="p-3 space-y-2 text-xs">
                  {(selectedPayslip.deductions || []).map((ded, idx) => (
                    <div className="flex justify-between" key={idx}>
                      <span className="text-slate-500">{ded.name}</span>
                      <span className="font-bold">{formatCurrency(ded.amount)}</span>
                    </div>
                  ))}
                  {(!selectedPayslip.deductions || selectedPayslip.deductions.length === 0) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Deductions</span>
                      <span className="font-bold">{formatCurrency(selectedPayslip.deduction)}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between text-rose-600 font-black">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(selectedPayslip.deduction)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Summary Pay Slip */}
            <div className="border border-[#223F74] p-4 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center bg-[#223F74]/5">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Net Payable Salary In-Hand</span>
              </div>
              <div className="mt-3 md:mt-0 text-right">
                <span className="text-2xl font-black text-[#223F74]">{formatCurrency(selectedPayslip.netSalary)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button text="Close" variant="secondary" onClick={() => setIsPayslipModalOpen(false)} />
              <Button text="Print Slip" variant="primary" icon={<Download size={14} />} onClick={() => window.print()} />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">No payslip data</div>
        )}
      </PanelModal>
    </div>
  );
};

export default HRM;
