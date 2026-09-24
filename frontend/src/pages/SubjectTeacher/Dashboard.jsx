import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Bell,
  MessageSquare,
  FileText,
  Award,
  UserCheck,
  UserX,
  BarChart3,
  GraduationCap,
  School,
  Settings,
  Download,
  Printer,
  Mail,
  Phone,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  CalendarDays,
  Home,
  Menu,
  Search,
  Filter,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Zap,
  Brain,
  Sparkles,
  TrendingUp as TrendingUpIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  Button,
  DataField,
  PanelModal,
  DataTable,
  ToggleButton
} from '../../components/shared/Common_Components';
import { useNavigate } from 'react-router-dom';


import {
  getTeacherDashboardStats,
  getWeakStudents,
  getRecentActivity,
  getTasks,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../../services/api/subjectTeacherDashboardApi';

// ── Main Component ──
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── State ──
  const [stats, setStats] = useState({
    todayAttendance: 0,
    totalStudents: 0,
    pendingTasks: 0,
    upcomingPTM: null,
    lowAttendanceCount: 0
  });
  const [weakStudents, setWeakStudents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [error, setError] = useState(null);

  // ── Fetch Dashboard Data ──
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);


      // Fetch all data in parallel
      const [statsRes, weakStudentsRes, activityRes, notificationsRes] = await Promise.all([
        getTeacherDashboardStats(selectedTimeRange),
        getWeakStudents(selectedTimeRange),
        getRecentActivity(selectedTimeRange),
        getNotifications()
      ]);

      // Set Stats
      if (statsRes?.data?.success) {
        setStats(statsRes.data.data);
      }

      // Set Weak Students
      if (weakStudentsRes?.data?.success) {
        setWeakStudents(weakStudentsRes.data.data || []);
      }

      // Set Recent Activity
      if (activityRes?.data?.success) {
        setRecentActivity(activityRes.data.data || []);
      }

      // Set Notifications
      if (notificationsRes?.data?.success) {
        const notifs = notificationsRes.data.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Tasks ──
  const fetchTasksData = async () => {
    try {
      const res = await getTasks();
      if (res?.data?.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  // ── Initial Load & Time Range Change ──
  useEffect(() => {
    fetchDashboardData();
    fetchTasksData();
  }, [selectedTimeRange]);

  // ── Refresh Handler ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await fetchTasksData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // ── Quick Actions ──
  const handleMarkAttendance = () => {
    navigate('/subject-teacher/attendance/subject-wise');
  };

  const handleCreateTest = () => {
    navigate('/subject-teacher/examinations/create-test');
  };

  const handleEnterMarks = () => {
    navigate('/subject-teacher/examinations/marks-entry');
  };

  const handleRaiseComplaint = () => {
    navigate('/subject-teacher/complaints/manage');
  };

  const handleApplyLeave = () => {
    navigate('/subject-teacher/attendance/staff');
  };

  const handleViewPerformance = () => {
    navigate('/subject-teacher/students/performance');
  };

  // ── Notification Handlers ──
  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  // ── Stats Cards Config ──
  const statsCards = [
    {
      title: "Today's Attendance",
      value: `${stats.todayAttendance || 0}%`,
      icon: <UserCheck size={22} />,
      accentColor: "#22c55e",
      size: 3
    },
    {
      title: "Total Students",
      value: String(stats.totalStudents || 0),
      icon: <Users size={22} />,
      accentColor: "#3b82f6",
      size: 3
    },
    {
      title: "Upcoming PTM",
      value: stats.upcomingPTM ? new Date(stats.upcomingPTM).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Not Scheduled',
      icon: <Calendar size={22} />,
      accentColor: "#8b5cf6",
      size: 3
    },
    {
      title: "Low Attendance Alerts",
      value: String(stats.lowAttendanceCount || 0),
      icon: <AlertTriangle size={22} />,
      accentColor: "#ef4444",
      size: 3
    }
  ];

  // ── Quick Actions Config ──
  const quickActions = [
    { icon: UserCheck, title: 'Mark Attendance', description: 'Subject-wise class attendance', onClick: handleMarkAttendance, color: '#223F74' },
    { icon: FileText, title: 'Create Online Test', description: 'Create and release tests', onClick: handleCreateTest, color: '#8b5cf6' },
    { icon: BarChart3, title: 'Enter Marks', description: 'Subject-wise marks entry', onClick: handleEnterMarks, color: '#3b82f6' },
    { icon: AlertTriangle, title: 'Raise Complaint', description: 'Against student behaviour', onClick: handleRaiseComplaint, color: '#ef4444' },
    { icon: CalendarDays, title: 'Apply Leave', description: 'Full/Half day leave', onClick: handleApplyLeave, color: '#f59e0b' },
    { icon: Award, title: 'View Performance', description: 'Student performance analysis', onClick: handleViewPerformance, color: '#22c55e' }
  ];

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">

        <div className="pt-4 p-6 flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#223F74] animate-spin" />
            <p className="text-sm font-semibold text-[#223F74]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Time Range Selector ──
  const TimeRangeSelector = () => (
    <div className="flex items-center gap-1 bg-[#F4F7FB] p-1 rounded-xl">
      {['Today', 'Week', 'Month'].map((range) => (
        <button
          key={range}
          onClick={() => setSelectedTimeRange(range.toLowerCase())}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTimeRange === range.toLowerCase()
              ? 'bg-white text-[#223F74] shadow-sm'
              : 'text-[#6B7280] hover:text-[#1D1D1F]'
            }`}
        >
          {range}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">



      {/* Main Content */}
      <div className="pt-4 p-6 mb-8">

        {/* Header */}
        <div className="w-full mb-8">
          <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] rounded-2xl shadow-lg shadow-[#223F74]/20 p-6 border border-[#1a3360]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Teacher Dashboard
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                    Live
                  </span>
                </h1>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                  <School size={16} /> Welcome back, Subject Teacher
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TimeRangeSelector />
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A] mt-4" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="w-full mb-8">
          <DashGrid cols={12} gap={4}>
            {statsCards.map((stat, idx) => (
              <EnhancedDashCard
                key={idx}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                accentColor={stat.accentColor}
                size={stat.size}
                showAnimations={true}
              />
            ))}
          </DashGrid>
        </div>

        {/* Quick Actions */}
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
              <Zap size={20} className="text-[#F59B87]" /> Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, idx) => (
              <QuickActionCard
                key={idx}
                icon={action.icon}
                title={action.title}
                description={action.description}
                onClick={action.onClick}
                color={action.color}
              />
            ))}
          </div>
        </div>

        {/* Main Grid - AI Insights, Recent Activity, Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Insights - Weak Students */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#F59B87]" /> AI Insights
                </h3>
                <span className="text-[10px] font-bold text-[#6B7280] bg-[#F4F7FB] px-3 py-1 rounded-full border border-[#E2E8F0]">
                  Live Analysis
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {weakStudents.length > 0 ? (
                  weakStudents.map((student) => (
                    <WeakStudentCard key={student.id} student={student} />
                  ))
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-30" />
                    <p className="font-semibold">No weak students flagged</p>
                    <p className="text-sm">All students are performing well!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#6B7280]" /> Recent Activity
                </h3>
                <button
                  onClick={() => setShowAllActivity(true)}
                  className="text-xs font-bold text-[#223F74] hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> Upcoming Tasks
                </h3>
                <button
                  onClick={() => setShowAllTasks(true)}
                  className="text-xs font-bold text-[#223F74] hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No upcoming tasks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Modal */}
        {showAllNotifications && (
          <PanelModal
            id="notifications-modal"
            title={`Notifications (${unreadCount} unread)`}
            isVisible={showAllNotifications}
            onClose={() => setShowAllNotifications(false)}
            size="lg"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#6B7280]">{notifications.length} notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-[#223F74] hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border ${notif.read ? 'bg-white border-[#E2E8F0]' : 'bg-blue-50 border-blue-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-[#1D1D1F] text-sm">{notif.title}</p>
                          <p className="text-sm text-[#6B7280] mt-0.5">{notif.message}</p>
                          <p className="text-xs text-[#9CA3AF] mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-xs font-bold text-[#223F74] hover:underline whitespace-nowrap ml-4"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </PanelModal>
        )}

        {/* All Activity Modal */}
        {showAllActivity && (
          <PanelModal
            id="activity-modal"
            title="All Activity"
            isVisible={showAllActivity}
            onClose={() => setShowAllActivity(false)}
            size="lg"
          >
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No activity found</p>
                </div>
              )}
            </div>
          </PanelModal>
        )}

        {/* All Tasks Modal */}
        {showAllTasks && (
          <PanelModal
            id="tasks-modal"
            title="All Tasks"
            isVisible={showAllTasks}
            onClose={() => setShowAllTasks(false)}
            size="lg"
          >
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No tasks found</p>
                </div>
              )}
            </div>
          </PanelModal>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #E2E8F0;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #C4D0E0;
          }
        `}</style>
      </div>
    </div>
  );
};

// ── Quick Action Component ──
const QuickActionCard = ({ icon: Icon, title, description, onClick, color = '#223F74' }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg transition-all hover:-translate-y-1 text-left w-full group"
  >
    <div className={`p-3 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform`} style={{ background: `${color}15` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <h4 className="font-bold text-[#1D1D1F] text-sm">{title}</h4>
    <p className="text-xs text-[#6B7280] mt-1">{description}</p>
  </button>
);

// ── AI Insight Card ──
const WeakStudentCard = ({ student }) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-start justify-between">
      <div>
        <p className="font-bold text-[#1D1D1F] text-sm">{student.name}</p>
        <p className="text-xs text-[#6B7280]">{student.subject}</p>
      </div>
      <div className={`px-2.5 py-1 rounded-full ${student.trend === 'down' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
        <span className={`text-xs font-bold ${student.trend === 'down' ? 'text-rose-600' : 'text-emerald-600'}`}>
          {student.score}%
        </span>
      </div>
    </div>
    <div className="mt-2">
      <div className="w-full bg-[#F4F7FB] h-1.5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${student.trend === 'down' ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${student.score}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-[#6B7280]">{student.improvement}</p>
        {student.trend === 'down' ? (
          <ArrowDownRight size={12} className="text-rose-500" />
        ) : (
          <ArrowUpRight size={12} className="text-emerald-500" />
        )}
      </div>
    </div>
  </div>
);

// ── Activity Item ──
const ActivityItem = ({ activity }) => {
  const getIcon = () => {
    const iconMap = {
      'UserCheck': <UserCheck size={14} className="text-emerald-600" />,
      'AlertTriangle': <AlertTriangle size={14} className="text-amber-600" />,
      'FileText': <FileText size={14} className="text-blue-600" />,
      'Calendar': <Calendar size={14} className="text-purple-600" />,
      'BarChart3': <BarChart3 size={14} className="text-indigo-600" />
    };
    return iconMap[activity.icon] || <Bell size={14} className="text-[#6B7280]" />;
  };

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-[#F8F9FA] rounded-xl transition-colors border-b border-[#E2E8F0] last:border-0 group">
      <div className="p-2 bg-white rounded-lg border border-[#E2E8F0] group-hover:border-[#223F74]/20 transition-colors">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1D1D1F]">{activity.message}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{activity.time}</p>
      </div>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={16} className="text-[#9CA3AF]" />
      </button>
    </div>
  );
};

// ── Task Item ──
const TaskItem = ({ task }) => {
  const priorityColors = {
    high: 'bg-rose-100 text-rose-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F8F9FA] rounded-xl transition-colors border-b border-[#E2E8F0] last:border-0">
      <div className="w-1.5 h-8 rounded-full" style={{ background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6' }} />
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1D1D1F]">{task.title}</p>
        <p className="text-xs text-[#6B7280]">Due: {task.due}</p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColors[task.priority]}`}>
        {task.priority}
      </span>
    </div>
  );
};

export default TeacherDashboard;