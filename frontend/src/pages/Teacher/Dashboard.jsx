import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import SharedTimetableViewer from '../../components/shared/SharedTimetableViewer';
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
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  FileCheck,
  Send,
  ClipboardList,
  Timer,
  LogIn,
  LogOut as LogOutIcon,
  Star,
  Hash,
  Percent,
  BookMarked,
  PenTool,
  Save,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  Button,
  DataField,
  DataTable,
} from '../../components/shared/Common_Components';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — Replace with API calls when backend is ready
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Dashboard State ──
  const [stats, setStats] = useState({
    todayAttendance: 0,
    totalStudents: 0,
    pendingTasks: 0,
    upcomingPTM: null,
    lowAttendanceCount: 0,
  });
  const [weakStudents, setWeakStudents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tasks, setTasks] = useState([]);

  // ── Timetable State ──
  const [timetableTab, setTimetableTab] = useState('class');
  const [classTimetable] = useState({ subjects: [], schedule: [], days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], timeSlots: ['08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'], breakSlots: ['12:00 PM - 01:00 PM'] });
  const [teacherTimetable] = useState({ subjects: [], schedule: [], days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], timeSlots: ['08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'], breakSlots: ['12:00 PM - 01:00 PM'] });

  // ── Fetch Dashboard Data ──
  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, weakRes, actRes, taskRes] = await Promise.all([
        api.get('/subject-teacher/dashboard/stats'),
        api.get('/subject-teacher/dashboard/weak-students'),
        api.get('/subject-teacher/dashboard/activity'),
        api.get('/subject-teacher/dashboard/tasks')
      ]);

      if (statsRes.data && statsRes.data.data) {
        setStats(statsRes.data.data);
      }
      if (weakRes.data && weakRes.data.data) {
        setWeakStudents(weakRes.data.data);
      }
      if (actRes.data && actRes.data.data) {
        const mappedAct = actRes.data.data.map(act => {
          return {
            id: act.id,
            icon: act.icon || 'Bell',
            message: act.message,
            time: act.time,
            timestamp: act.time
          };
        });
        setRecentActivity(mappedAct);
      }
      if (taskRes.data && taskRes.data.data) {
        const mappedTasks = taskRes.data.data.map(t => ({
          id: t._id || t.id,
          title: t.title || t.text || '',
          completed: t.status === 'completed',
          due: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date',
          priority: t.priority || 'medium'
        }));
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Refresh Handler ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // ── Quick Actions ──
  const quickActions = [
    { icon: UserCheck, title: 'Mark Attendance', description: 'Daily class attendance', onClick: () => navigate('/teacher/attendance'), color: '#223F74' },
    { icon: FileText, title: 'Manage Assignments', description: 'Create and review assignments', onClick: () => navigate('/teacher/assignments'), color: '#8b5cf6' },
    { icon: BarChart3, title: 'Enter Marks', description: 'Student marksheet entry', onClick: () => navigate('/teacher/marksheet'), color: '#3b82f6' },
    { icon: Award, title: 'Exams & Grades', description: 'View exams and grades', onClick: () => navigate('/teacher/exams-grades'), color: '#ef4444' },
    { icon: CalendarDays, title: 'HRM & Leave', description: 'Salary, attendance, and leave', onClick: () => navigate('/teacher/hrm/attendance'), color: '#f59e0b' },
    { icon: Users, title: 'View Students', description: 'Student profiles and performance', onClick: () => navigate('/teacher/students'), color: '#22c55e' },
  ];

  // ── Stats Cards Config ──
  const statsCards = [
    { title: "Today's Attendance", value: `${stats.todayAttendance}%`, icon: <UserCheck size={22} />, accentColor: '#22c55e', size: 3 },
    { title: 'Total Students', value: String(stats.totalStudents), icon: <Users size={22} />, accentColor: '#3b82f6', size: 3 },
    { title: 'Upcoming PTM', value: stats.upcomingPTM ? new Date(stats.upcomingPTM).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Not Scheduled', icon: <Calendar size={22} />, accentColor: '#8b5cf6', size: 3 },
    { title: 'Low Attendance Alerts', value: String(stats.lowAttendanceCount), icon: <AlertTriangle size={22} />, accentColor: '#ef4444', size: 3 },
  ];

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#223F74] animate-spin" />
          <p className="text-sm font-semibold text-[#223F74]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — DASHBOARD HEADER
           ═══════════════════════════════════════════════════════════════════ */}
        <Heading
         primaryText='Teacher'
         secondaryText='Dashboard'
         showAnimation={true}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — STATS CARDS
           ═══════════════════════════════════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — QUICK ACTIONS
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
              <Zap size={20} className="text-[#F59B87]" /> Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, idx) => (
              <QuickActionCard key={idx} icon={action.icon} title={action.title} description={action.description} onClick={action.onClick} color={action.color} />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — AI INSIGHTS, ACTIVITY, TASKS (3 columns)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* AI Insights */}
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
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
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
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {tasks.length > 0 ? (
                  tasks.map((task) => <TaskItem key={task.id} task={task} />)
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
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 — TIMETABLES
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-full mb-8">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#223F74] flex items-center gap-2">
                  <CalendarDays size={20} className="text-[#F59B87]" /> Timetables
                </h2>
                <p className="text-sm text-[#6B7280]">View your class and personal schedule</p>
              </div>
              
              <div className="flex items-center bg-[#F8F9FA] rounded-xl p-1 border border-[#E2E8F0]">
                <button 
                  onClick={() => setTimetableTab('class')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timetableTab === 'class' ? 'bg-white text-[#223F74] shadow-sm' : 'text-[#6B7280] hover:text-[#1D1D1F]'}`}
                >
                  Class Timetable
                </button>
                <button 
                  onClick={() => setTimetableTab('teacher')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timetableTab === 'teacher' ? 'bg-white text-[#223F74] shadow-sm' : 'text-[#6B7280] hover:text-[#1D1D1F]'}`}
                >
                  My Timetable
                </button>
              </div>
            </div>
            
            <div className="w-full">
              <SharedTimetableViewer 
                data={timetableTab === 'class' ? classTimetable : teacherTimetable}
                readOnly={true}
                title={timetableTab === 'class' ? "Class Timetable" : "Teacher Timetable"}
              />
            </div>
          </div>
        </div>

        {/* ── Custom Styles ── */}
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
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s ease-out;
          }
        `}</style>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Quick Action Card ──
const QuickActionCard = ({ icon: Icon, title, description, onClick, color = '#223F74' }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg transition-all hover:-translate-y-1 text-left w-full group"
  >
    <div className="p-3 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform" style={{ background: `${color}15` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <h4 className="font-bold text-[#1D1D1F] text-sm">{title}</h4>
    <p className="text-xs text-[#6B7280] mt-1">{description}</p>
  </button>
);

// ── Weak Student Card ──
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
      UserCheck: <UserCheck size={14} className="text-emerald-600" />,
      AlertTriangle: <AlertTriangle size={14} className="text-amber-600" />,
      FileText: <FileText size={14} className="text-blue-600" />,
      Calendar: <Calendar size={14} className="text-purple-600" />,
      BarChart3: <BarChart3 size={14} className="text-indigo-600" />,
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
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F8F9FA] rounded-xl transition-colors border-b border-[#E2E8F0] last:border-0">
      <div className="w-1.5 h-8 rounded-full" style={{ background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6' }} />
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1D1D1F]">{task.title}</p>
        <p className="text-xs text-[#6B7280]">Due: {task.due}</p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
        task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {task.priority}
      </span>
    </div>
  );
};

export default TeacherDashboard;
