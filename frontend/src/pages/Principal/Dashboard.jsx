import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  Bell,
  FileText,
  Eye,
  UserCheck,
  TrendingUp,
  BookOpen,
  UserPlus,
} from 'lucide-react';
import {
  DashGrid,
  EnhancedDashCard,
  Heading,
  Button,
  Modal,
  openModal,
  closeModal
} from '../../components/shared/Common_Components';
import { getAdmissionRequests, getDashboardOverviewStats } from '../../services/api/principalApi';
import { getLowAttendance } from '../../services/api/principalStudentApi';
import StudentDetailsDrawer from './StudentDetailsDrawer';

const PrincipalDashboard = () => {
  const navigate = useNavigate();

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeClasses: 0,
    pendingApprovals: 0,
    attendancePercentage: 0,
    upcomingEvents: 0,
  });

  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Hover state per alert card — stores expanded student id
  const [hoveredAlert, setHoveredAlert] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [statsRes, attendanceRes, admissionRes] = await Promise.all([
        getDashboardOverviewStats(),
        getLowAttendance(),
        getAdmissionRequests({ status: 'pending', limit: 5 }),
      ]);

      if (statsRes?.success && statsRes.data) setDashboardStats(statsRes.data);
      if (attendanceRes?.success) setAttendanceAlerts(attendanceRes.data || []);
      if (admissionRes?.success) setAdmissionRequests(admissionRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingStats(false);
      setLoadingRequests(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleViewRequest = (requestId) => {
    navigate('/principal/admissions/list');
  };

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <Heading primaryText="Principal" secondaryText="Dashboard" showAnimations size={12} />
      </div>

      {/* Summary Statistics Cards */}
      <div className="mb-8">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard
            title="Total Students Enrolled"
            value={loadingStats ? '...' : dashboardStats.totalStudents.toLocaleString()}
            icon={<Users size={22} />}
            accentColor="#223F74"
            size={3}
            showAnimations
          />
          <EnhancedDashCard
            title="Total Staff"
            value={loadingStats ? '...' : (dashboardStats.totalTeachers || 0).toLocaleString()}
            icon={<UserCheck size={22} />}
            accentColor="#059669"
            size={3}
            showAnimations
          />
          <EnhancedDashCard
            title="Student Pending Approvals"
            value={loadingStats ? '...' : dashboardStats.pendingApprovals}
            icon={<Clock size={22} />}
            accentColor="#F59B87"
            size={3}
            showAnimations
          />
          <EnhancedDashCard
            title="Upcoming Events"
            value={loadingStats ? '...' : dashboardStats.upcomingEvents}
            icon={<Calendar size={22} />}
            accentColor="#9333ea"
            size={3}
            showAnimations
          />
        </DashGrid>
      </div>

      {/* Quick Actions Panel */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <h2 className="text-2xl font-black text-[#223F74] mb-6 px-2 flex items-center gap-3 relative z-10">
          <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
          Quick Actions
        </h2>
        <div className="relative z-10">
          <DashGrid cols={12} gap={4}>
            <Button
              text="Financial Reports"
              icon={<TrendingUp size={18} />}
              variant="secondary"
              onClick={() => navigate('/principal/reports/financial')}
              size={3}
            />
            <Button
              text="Admit Cards"
              icon={<FileText size={18} />}
              variant="secondary"
              onClick={() => navigate('/principal/examinations/admit-card')}
              size={3}
            />
            <Button
              text="Create Exam"
              icon={<BookOpen size={18} />}
              variant="secondary"
              onClick={() => navigate('/principal/examinations/create')}
              size={3}
            />
            <Button
              text="Admission List"
              icon={<UserPlus size={18} />}
              variant="secondary"
              onClick={() => navigate('/principal/admissions/list')}
              size={3}
            />
          </DashGrid>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Notices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center">
              <Bell size={20} className="text-[#223F74]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#223F74]">Recent Notices</h2>
              <p className="text-xs text-slate-500 font-medium">Latest school notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentNotices.length > 0 ? (
              recentNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-3.5 border border-slate-100 rounded-xl hover:border-[#223F74]/30 hover:bg-[#223F74]/5 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#223F74] transition-colors">
                        {notice.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(notice.date)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${notice.type === 'event'
                      ? 'bg-purple-100 text-purple-700'
                      : notice.type === 'meeting'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-[#F59B87]/20 text-[#F59B87]'
                      }`}>
                      {notice.type.charAt(0).toUpperCase() + notice.type.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No notices yet</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/principal/communication/notices')}
            className="w-full mt-5 px-4 py-2.5 text-sm font-bold text-[#223F74] border border-[#223F74]/20 rounded-xl hover:bg-[#223F74]/5 transition-colors"
          >
            View All Notices
          </button>
        </div>

        {/*  */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#223F74]">Admission List</h2>
              <p className="text-xs text-slate-500 font-medium">New student list</p>
            </div>
          </div>

          <div className="space-y-3">
            {loadingRequests ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-3 font-medium">Loading...</p>
              </div>
            ) : admissionRequests.length > 0 ? (
              admissionRequests.map((request) => (
                <div
                  key={request._id}
                  className="p-3.5 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                        {request.parent?.fullName || 'Unknown Parent'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {request.students?.[0]?.fullName || 'N/A'} · {request.applicationId || request.applicationNumber}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(request.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleViewRequest(request._id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold shrink-0"
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No admission requests</p>
              </div>
            )}
          </div>

          {admissionRequests.length > 0 && (
            <button
              onClick={() => navigate('/principal/admissions/list')}
              className="w-full mt-5 px-4 py-2.5 text-sm font-bold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              View All Requests
            </button>
          )}
        </div>

        {/* Low Attendance Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#223F74]">Low Attendance Alerts</h2>
              <p className="text-xs text-slate-500 font-medium">Students below 75% threshold</p>
            </div>
          </div>

          <div className="space-y-3">
            {loadingStats ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : attendanceAlerts.length > 0 ? (
              attendanceAlerts.map((alert) => {
                const isHovered = hoveredAlert === (alert.id || alert._id);
                const pct = alert.attendance;
                const barColor = pct < 60 ? 'bg-rose-500' : pct < 70 ? 'bg-orange-500' : 'bg-amber-400';
                const textColor = pct < 60 ? 'text-rose-600' : pct < 70 ? 'text-orange-600' : 'text-amber-600';

                return (
                  <div
                    key={alert.id || alert._id}
                    onMouseEnter={() => setHoveredAlert(alert.id || alert._id)}
                    onMouseLeave={() => setHoveredAlert(null)}
                    className="relative p-3.5 border border-rose-100 bg-rose-50/60 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer group overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{alert.studentName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {alert.admissionNo} · {alert.class}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Eye icon — visible on hover */}
                        <button
                          onClick={() => {
                            setSelectedStudent({
                              _id: alert.id || alert._id,
                              user: { name: alert.studentName },
                              enrollmentNo: alert.admissionNo,
                              class: alert.class,
                              status: 'Active'
                            });
                            openModal("dashboard-student-details-modal");
                          }}
                          className={`p-1.5 rounded-lg bg-white border border-rose-200 text-rose-500 hover:bg-rose-100 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
                            }`}
                          title="View attendance details"
                        >
                          <Eye size={13} />
                        </button>
                        <span className={`font-black text-lg leading-none ${textColor}`}>{pct}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2.5 w-full bg-white rounded-full h-1.5 overflow-hidden border border-rose-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Extra details panel — slides in on hover */}
                    <div className={`overflow-hidden transition-all duration-300 ${isHovered ? 'max-h-20 mt-2.5' : 'max-h-0'}`}>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-100">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium">Present</p>
                          <p className="text-xs font-bold text-emerald-600">{alert.presentDays ?? '—'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium">Absent</p>
                          <p className="text-xs font-bold text-rose-600">{alert.absentDays ?? '—'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium">Total</p>
                          <p className="text-xs font-bold text-slate-600">{alert.totalDays ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400">
                <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No low attendance alerts</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/principal/reports/academic')}
            className="w-full mt-5 px-4 py-2.5 text-sm font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
          >
            View Attendance Reports
          </button>
        </div>

      </div>

      {/* ── Modals ── */}
      <Modal id="dashboard-student-details-modal" title="Student Insights" size="xl">
        {selectedStudent && (
          <StudentDetailsDrawer
            student={selectedStudent}
            onClose={() => closeModal("dashboard-student-details-modal")}
          />
        )}
      </Modal>
    </div>
  );
};

export default PrincipalDashboard;
