import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';

import {
  TrendingUp, Award, Star,
  Activity, Trophy,
  Heart, Bell, AlertCircle, Video,
  Users,
  Loader2, X, Medal, MessageSquare
} from 'lucide-react';

import {
  Heading,
  EnhancedDashCard,
  Grid,
  DashGrid,
  GLineChart,
  GColumnChart,
  GDoughnutChart,
  GRadarChart,
  Modal,
  openModal,
  closeModal,
  DataField,
  SelectField,
  Option,
  Button,
} from '../../components/shared/Common_Components';

const StudentDashboard = () => {
  const [results, setResults] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [leaveForm, setLeaveForm] = useState({ reason: '', startDate: '', endDate: '', type: 'sick' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [greetingEmoji, setGreetingEmoji] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [studentData, setStudentData] = useState({});

  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
    trend: '+0%',
    monthlyTrend: [],
    subjectWise: []
  });

  const [performanceData, setPerformanceData] = useState({
    overall: 0,
    rank: 0,
    totalStudents: 0,
    cgpa: 0,
    improvement: '+0%',
    subjects: [],
    monthlyData: [],
    classMonthlyData: [],
    weeklyData: []
  });

  const [alerts, setAlerts] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);

  useEffect(() => {
    setIsDataLoaded(true);
  }, []);



  // Fetch dashboard data from backend when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const dashboardData = await studentApi.getDashboard();
        setDashboard(dashboardData.data || dashboardData);
        

        
        const resultsRes = await studentApi.getResults();
        setResults(resultsRes?.data || resultsRes);

        try {
          const subjectsRes = await studentApi.getSubjects();
          const subjectsData = subjectsRes?.data || subjectsRes || [];
          if (Array.isArray(subjectsData) && subjectsData.length > 0) {
            setSubjects(subjectsData);
          }
        } catch (subjectErr) {
          console.error('Error fetching subjects:', subjectErr);
        }
      } catch (err) {
        console.error(err);
        if (typeof setError === 'function') setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Update local states when dashboard data is fetched
  useEffect(() => {
    if (dashboard) {
      if (dashboard.studentData) setStudentData(dashboard.studentData);
      if (dashboard.attendanceData) setAttendanceData(dashboard.attendanceData);
      if (dashboard.performanceData) setPerformanceData(dashboard.performanceData);

      if (dashboard.alerts) {
        const mappedAlerts = dashboard.alerts.map(alert => ({
          ...alert,
          icon: alert.type === 'warning' ? AlertCircle : (alert.type === 'success' ? Award : (alert.type === 'info' && alert.title.includes('PTM') ? Users : Video)),
          color: alert.type === 'warning' ? 'text-orange-600' : (alert.type === 'success' ? 'text-green-600' : (alert.type === 'info' && alert.title.includes('PTM') ? 'text-purple-600' : 'text-blue-600')),
          bg: alert.type === 'warning' ? 'bg-orange-50' : (alert.type === 'success' ? 'bg-green-50' : (alert.type === 'info' && alert.title.includes('PTM') ? 'bg-purple-50' : 'bg-blue-50'))
        }));
        setAlerts(mappedAlerts);
      }

      if (dashboard.leaveApplications) setLeaveApplications(dashboard.leaveApplications);
    }
  }, [dashboard]);

  // Transform fetched subjects into performance data format
  useEffect(() => {
    if (subjects && subjects.length > 0) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'];
      const transformedSubjects = subjects.slice(0, 7).map((subj, index) => ({
        name: subj.subject || `Subject ${index + 1}`,
        score: Math.round(subj.average || 0),
        color: colors[index % colors.length],
        grade: subj.average >= 90 ? 'A+' : subj.average >= 80 ? 'A' : subj.average >= 70 ? 'B' : subj.average >= 60 ? 'C' : 'D',
        trend: subj.trend === 'improving' ? '+5%' : subj.trend === 'declining' ? '-3%' : 'stable',
        rank: index + 1,
        latest: subj.latest || 0,
        classAverage: subj.classAverage || 0
      }));

      setPerformanceData(prev => ({
        ...prev,
        subjects: transformedSubjects
      }));
    }
  }, [subjects]);

  const handleLeaveApply = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('leaveType', leaveForm.type);
      formData.append('fromDate', leaveForm.startDate);
      formData.append('toDate', leaveForm.endDate);
      formData.append('reason', leaveForm.reason);

      await studentApi.submitLeave(formData);
      toast.success('Leave application submitted! Parents will be notified.');
      closeModal('student-leave-modal');
      setLeaveForm({ reason: '', startDate: '', endDate: '', type: 'sick' });

      // Refresh dashboard data so the new leave appears instantly
      const dashboardData = await studentApi.getDashboard();
      setDashboard(dashboardData.data || dashboardData);
    } catch (error) {
      toast.error(error.message || 'Failed to submit leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAlertRead = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    toast.success('Alert marked as read');
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const statsCards = [
    { label: 'Attendance', value: `${attendanceData.percentage}%`, icon: <Activity size={22} />, accentColor: '#10b981', path: '/student/attendance' },
    { label: 'Performance', value: `${performanceData.overall}%`, icon: <TrendingUp size={22} />, accentColor: '#3b82f6', path: '/student/performance' },
    { label: 'Class Rank', value: `${performanceData.rank}/${performanceData.totalStudents}`, icon: <Trophy size={22} />, accentColor: '#f59e0b', path: '/student/performance' },
    { label: 'CGPA', value: `${performanceData.cgpa}`, icon: <Star size={22} />, accentColor: '#8b5cf6', path: '/student/results' }
  ];

  // ── Chart Data for Common_Components ──────────────────────────────────────

  // Performance Trend Line Chart
  const performanceLineData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = performanceData?.monthlyData || [];
    const classMonthlyData = performanceData?.classMonthlyData || [];
    return months.map((name, i) => ({
      name,
      performance: monthlyData[i] || 0,
      classAverage: classMonthlyData[i] || 0,
    }));
  })();

  // Subject-wise Bar Chart
  const subjectBarData = (performanceData?.subjects || []).map(s => ({
    name: s.name,
    score: s.score,
    classAverage: s.classAverage || 0,
  }));

  // Attendance Doughnut
  const attendanceDoughnutData = [
    { name: 'Present', value: attendanceData?.present || 0 },
    { name: 'Absent', value: attendanceData?.absent || 0 },
    { name: 'Late', value: attendanceData?.late || 0 },
  ];


  if (!isDataLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <Heading
        primaryText="Welcome Back,"
        secondaryText={`${studentData?.name?.split(' ')?.[0] || 'Student'}!`}
      />

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <Grid cols={12} gap={5}>
        {statsCards.map((stat, idx) => (
          <EnhancedDashCard
            key={idx}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            accentColor={stat.accentColor}
            size={3}
            onClick={() => handleNavigate(stat.path)}
          />
        ))}
      </Grid>

      {/* ── Alerts Section ──────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Important Alerts
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{alerts.length} new</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-[20px] border ${alert.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                    alert.type === 'success' ? 'bg-green-50 border-green-100' :
                      alert.type === 'info' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                  }`}
              >
                <div className={`p-2 rounded-xl ${alert.bg}`}>
                  <alert.icon className={`w-4 h-4 ${alert.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                  {alert.date && <p className="text-xs text-gray-400 mt-1">{alert.date}</p>}
                </div>
                <button
                  onClick={() => handleMarkAlertRead(alert.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts Section ──────────────────────────────────────────────── */}
      <DashGrid cols={12} gap={5}>
        {/* Performance Trend */}
        <GLineChart
          title="Performance Trend"
          subtitle="Monthly academic progress compared to class"
          data={performanceLineData}
          lines={[
            { key: 'performance', label: 'Your Performance %', color: '#8b5cf6' },
            { key: 'classAverage', label: 'Class Average %', color: '#10b981' }
          ]}
          size={6}
          height={280}
        />

        {/* Subject-wise Performance */}
        <GColumnChart
          title="Subject-wise Performance"
          subtitle="Score distribution compared to class"
          data={subjectBarData}
          bars={[
            { key: 'score', label: 'Your Score (%)', color: '#223F74' },
            { key: 'classAverage', label: 'Class Average (%)', color: '#94a3b8' }
          ]}
          size={6}
          height={280}
        />

        {/* Attendance Doughnut */}
        <GDoughnutChart
          title="Attendance Overview"
          subtitle="Present vs Absent vs Late"
          data={attendanceDoughnutData}
          colors={['#10b981', '#ef4444', '#f59e0b']}
          size={4}
          height={280}
          innerRadius={55}
        />

        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Leave Applications */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[#1D1D1F] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#D66B5F]" />
                Leave Applications
              </h3>
              <button onClick={() => openModal('student-leave-modal')} className="text-sm text-[#223F74] font-semibold hover:text-[#1a3360] transition-colors">Apply New</button>
            </div>
            <div className="space-y-3">
              {leaveApplications.length > 0 ? (
                leaveApplications.map((leave) => (
                  <div key={leave.id} className="bg-[#F4F7FB] rounded-2xl p-3 border border-[#E2E8F0]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-[#1D1D1F]">{leave.type} Leave</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>{leave.status}</span>
                    </div>
                    <p className="text-xs text-[#6B7280]">{leave.startDate} to {leave.endDate}</p>
                    <p className="text-xs text-[#6B7280]/70 mt-1">{leave.reason}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[#6B7280]">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-[#E2E8F0]" />
                  <p className="text-sm font-medium">No leave applications</p>
                  <p className="text-xs mt-0.5">Click "Apply New" to request leave</p>
                </div>
              )}
            </div>
          </div>

          {/* Support Ticket */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[#1D1D1F] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#E0A04B]" />
                Support Ticket
              </h3>
              <button onClick={() => handleNavigate('/student/support-ticket')} className="text-sm text-[#223F74] font-semibold hover:text-[#1a3360] transition-colors">Raise Ticket</button>
            </div>
            <div className="flex flex-col items-center justify-center h-[calc(100%-40px)] text-[#6B7280]">
              <MessageSquare className="w-8 h-8 mb-2 text-[#E2E8F0]" />
              <p className="text-sm font-medium">Need Help?</p>
              <p className="text-xs mt-0.5">Contact administration for assistance</p>
            </div>
          </div>
        </div>
      </DashGrid>

      {/* ── Leave Application Modal ─────────────────────────────────────── */}
      <Modal id="student-leave-modal" title="Apply for Leave" size="md">
        <form onSubmit={handleLeaveApply} className="space-y-5">
          <SelectField
            label="Leave Type"
            id="leave-type"
            value={leaveForm.type}
            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
            searchable={false}
          >
            <Option value="sick" label="Sick Leave" />
            <Option value="casual" label="Casual Leave" />
            <Option value="emergency" label="Emergency" />
            <Option value="other" label="Other" />
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <DataField
              label="Start Date"
              id="leave-start"
              type="date"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
            />
            <DataField
              label="End Date"
              id="leave-end"
              type="date"
              value={leaveForm.endDate}
              onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
            />
          </div>

          <DataField
            label="Reason"
            id="leave-reason"
            type="textarea"
            rows={3}
            placeholder="Please provide reason for leave..."
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
          />

          <div className="flex gap-3 pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              size={6}
              onClick={() => closeModal('student-leave-modal')}
            />
            <Button
              text={isSubmitting ? 'Submitting...' : 'Submit Application'}
              variant="primary"
              size={6}
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDashboard;