import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Clock,
  User,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  Bell,
  Activity,
  Heart,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/teacher/Card';
import { LineChartComponent, PieChartComponent } from '../../components/teacher/Charts';
import { getTeacherStudentByIdApi } from '../../services/api/teacherApi';

const StudentProfile = () => {
  const navigate = useNavigate();
  const { id: routeId, studentId: routeStudentId } = useParams();
  const studentId = routeStudentId || routeId;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  const [studentInfo, setStudentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['overview', 'academics', 'attendance', 'exams', 'homework', 'notices'];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!studentId) return;

    const loadStudentProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getTeacherStudentByIdApi(studentId);
        if (response?.success) {
          setStudentInfo(response.data);
        } else {
          setError(response?.message || 'Failed to load student profile');
        }
      } catch (err) {
        const msg = err?.message || 'Failed to load student profile';
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentProfile();
  }, [studentId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm animate-pulse">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !studentInfo) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="p-4 bg-red-50 text-red-500 rounded-full">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-gray-950">Failed to Load Profile</h2>
          <p className="text-red-500 text-sm max-w-md text-center">{error || 'Student not found.'}</p>
        </div>
      </div>
    );
  }

  // Format YTD attendance summary for PieChart
  const totalDays = (studentInfo.attendance?.totalPresent || 0) + 
                    (studentInfo.attendance?.totalAbsent || 0) + 
                    (studentInfo.attendance?.totalLate || 0);

  const attendancePercent = studentInfo.attendance?.percentage ?? 0;

  const attendanceSummaryData = [
    {
      name: 'Present',
      value: totalDays ? Number((((studentInfo.attendance?.totalPresent || 0) / totalDays) * 100).toFixed(1)) : 0,
      color: '#10B981'
    },
    {
      name: 'Absent',
      value: totalDays ? Number((((studentInfo.attendance?.totalAbsent || 0) / totalDays) * 100).toFixed(1)) : 0,
      color: '#EF4444'
    },
    {
      name: 'Late',
      value: totalDays ? Number((((studentInfo.attendance?.totalLate || 0) / totalDays) * 100).toFixed(1)) : 0,
      color: '#F59E0B'
    }
  ];

  // Helper for grade styling
  const getGradeColor = (grade) => {
    switch (String(grade).toUpperCase()) {
      case 'A+':
      case 'A': return 'bg-green-100 text-green-700 border-green-200';
      case 'B+':
      case 'B': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'C+':
      case 'C': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'D': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'F': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10 transition-all duration-300">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </button>
      </div>

      {/* Top Header Card in modern ERP dashboard style */}
      <Card className="overflow-hidden bg-white border border-gray-100 shadow-md rounded-3xl">
        <div className="relative h-24 bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mt-12 -mr-12" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -mb-12 -ml-12" />
        </div>
        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-10">
          {/* Student Photo */}
          <div className="relative">
            {studentInfo.photo ? (
              <img
                src={studentInfo.photo}
                alt={studentInfo.name}
                className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="h-28 w-28 rounded-3xl border-4 border-white shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {studentInfo.name ? studentInfo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                </span>
              </div>
            )}
            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              studentInfo.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>

          {/* Student Header Details */}
          <div className="flex-1 text-center md:text-left space-y-2 mt-4 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {studentInfo.name}
              </h2>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                studentInfo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {studentInfo.status || 'Not Available'}
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
              <span className="flex items-center">
                <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                Class: {studentInfo.class || 'Not Available'}
              </span>
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                Section: {studentInfo.section || 'Not Available'}
              </span>
              <span className="flex items-center">
                <span className="font-bold text-gray-700 mr-1">Roll:</span>
                {studentInfo.rollNo || 'Not Available'}
              </span>
              <span className="flex items-center">
                <span className="font-bold text-gray-700 mr-1">Adm:</span>
                {studentInfo.enrollmentNo || 'Not Available'}
              </span>
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="flex items-center gap-4">
            <div className="bg-green-50/50 border border-green-100 p-3 rounded-2xl text-center min-w-[110px]">
              <span className="text-2xl font-black text-green-600">{attendancePercent}%</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider mt-0.5">Attendance</span>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl text-center min-w-[110px]">
              <span className="text-2xl font-black text-blue-600">
                {studentInfo.performance?.latestGrade || 'N/A'}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider mt-0.5">Latest Grade</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-2 md:gap-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'academics', label: 'Academics' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'exams', label: 'Exams' },
            { id: 'homework', label: 'Homework' },
            { id: 'notices', label: 'Notices & Notifications' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-500" />
                Personal Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Full Name</span>
                  <span className="text-gray-900 font-bold">{studentInfo.name || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Roll Number</span>
                  <span className="text-gray-900 font-bold">{studentInfo.rollNo || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Date of Birth</span>
                  <span className="text-gray-900 font-bold">
                    {studentInfo.dateOfBirth ? new Date(studentInfo.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Gender</span>
                  <span className="text-gray-900 font-bold capitalize">{studentInfo.gender || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Blood Group</span>
                  <span className="text-gray-900 font-bold">{studentInfo.bloodGroup || 'Not Available'}</span>
                </div>
                <div className="py-1">
                  <span className="text-gray-500 font-medium block mb-1">Permanent Address</span>
                  <span className="text-gray-900 font-semibold block">{studentInfo.address || 'Not Available'}</span>
                </div>
              </div>
            </Card>

            {/* Parent Information */}
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-indigo-500" />
                Parent Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Father's Name</span>
                  <span className="text-gray-900 font-bold">{studentInfo.fatherName || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Mother's Name</span>
                  <span className="text-gray-900 font-bold">{studentInfo.motherName || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Parent Contact</span>
                  <span className="text-gray-900 font-bold">{studentInfo.parent?.phone || 'Not Available'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Guardian</span>
                  <span className="text-gray-900 font-bold">{studentInfo.guardianName || 'Not Available'}</span>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-emerald-500" />
                Contact Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Email Address</span>
                  <span className="text-gray-900 font-bold block truncate max-w-[200px]" title={studentInfo.email}>
                    {studentInfo.email || 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Phone Number</span>
                  <span className="text-gray-900 font-bold">{studentInfo.parent?.phone || 'Not Available'}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: ACADEMICS */}
        {activeTab === 'academics' && (
          <div className="space-y-6">
            {/* Academics Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Class & Section</span>
                <span className="text-xl font-extrabold text-gray-900 mt-1 block">
                  {studentInfo.class} - {studentInfo.section || 'N/A'}
                </span>
              </Card>
              <Card className="p-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Average Marks %</span>
                <span className="text-xl font-extrabold text-blue-600 mt-1 block">
                  {studentInfo.performance?.overallPercentage ? `${studentInfo.performance.overallPercentage}%` : 'N/A'}
                </span>
              </Card>
              <Card className="p-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Overall Grade</span>
                <span className="text-xl font-extrabold text-purple-600 mt-1 block">
                  {studentInfo.performance?.latestGrade || 'N/A'}
                </span>
              </Card>
              <Card className="p-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Total Subjects</span>
                <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                  {studentInfo.subjects?.length || 0}
                </span>
              </Card>
            </div>

            {/* Subjects & Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Subjects List */}
              <Card className="p-6 space-y-4 lg:col-span-1">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-indigo-500" />
                  Current Subjects
                </h3>
                {(!studentInfo.subjects || studentInfo.subjects.length === 0) ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No subjects mapped yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {studentInfo.subjects.map((sub, index) => (
                      <span
                        key={index}
                        className="px-3.5 py-1.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-800 text-sm font-semibold shadow-sm"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </Card>

              {/* Subject Wise Performance Cards */}
              <Card className="p-6 space-y-4 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Subject-wise Performance
                </h3>
                {(!studentInfo.performance?.subjectWise || studentInfo.performance.subjectWise.length === 0) ? (
                  <p className="text-sm text-gray-400 py-12 text-center">No subject performance data available.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentInfo.performance.subjectWise.map((subject, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between space-y-2 shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 text-base">{subject.subject}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(subject.grade)}`}>
                            {subject.grade || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                            <span>Score</span>
                            <span className="font-semibold text-gray-700">{subject.score}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(subject.score || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Stats & Summary */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                    <span className="text-3xl font-black text-green-700">{studentInfo.attendance?.totalPresent || 0}</span>
                    <span className="text-xs text-green-600 font-bold block mt-1">Present Days</span>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                    <span className="text-3xl font-black text-red-700">{studentInfo.attendance?.totalAbsent || 0}</span>
                    <span className="text-xs text-red-600 font-bold block mt-1">Absent Days</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                    <span className="text-3xl font-black text-amber-700">{studentInfo.attendance?.totalLate || 0}</span>
                    <span className="text-xs text-amber-600 font-bold block mt-1">Late Days</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span className="text-3xl font-black text-blue-700">{studentInfo.attendance?.totalLeave || 0}</span>
                    <span className="text-xs text-blue-600 font-bold block mt-1">On Leave</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500">Yearly Attendance Rate</span>
                  <span className="text-lg font-extrabold text-gray-900">{attendancePercent}%</span>
                </div>
              </Card>

              {/* Pie chart breakdown */}
              {totalDays > 0 && (
                <Card className="p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Breakdown Percentages</h4>
                  <PieChartComponent data={attendanceSummaryData} height={200} />
                </Card>
              )}
            </div>

            {/* Right: Trend Chart & Monthly Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Monthly Trend Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                  Monthly Attendance Trend
                </h3>
                {(!studentInfo.attendance?.monthlyTrend || studentInfo.attendance.monthlyTrend.length === 0) ? (
                  <p className="text-sm text-gray-400 py-12 text-center">No trend data available.</p>
                ) : (
                  <LineChartComponent
                    data={studentInfo.attendance.monthlyTrend}
                    xKey="month"
                    lines={[{ dataKey: 'percentage', color: '#3B82F6' }]}
                    height={260}
                  />
                )}
              </Card>

              {/* Monthly Table summary */}
              {studentInfo.attendance?.monthlyTrend && studentInfo.attendance.monthlyTrend.length > 0 && (
                <Card className="overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Month</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentInfo.attendance.monthlyTrend.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3.5 font-bold text-gray-800 text-sm">{m.month}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              m.percentage >= 90 ? 'bg-green-100 text-green-700' :
                              m.percentage >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {m.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EXAMS */}
        {activeTab === 'exams' && (
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center">
              <Award className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900">Exam History</h3>
            </div>
            {(!studentInfo.performance?.examSubjectHistory || studentInfo.performance.examSubjectHistory.length === 0) ? (
              <div className="py-16 text-center flex flex-col items-center">
                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-bold">No exam results available</p>
                <p className="text-xs text-gray-400 mt-1">This student has no graded exams published.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Exam Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Subject</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-center">Marks Obtained</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-center">Total Marks</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-center">Percentage</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentInfo.performance.examSubjectHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 text-sm">{item.examName}</td>
                        <td className="px-6 py-4 text-gray-700 text-sm font-semibold">{item.subject}</td>
                        <td className="px-6 py-4 text-center font-semibold text-sm text-gray-800">{item.marksObtained}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">{item.totalMarks}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center text-sm font-bold ${
                            item.percentage >= 90 ? 'text-green-600' :
                            item.percentage >= 75 ? 'text-blue-600' :
                            item.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {item.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(item.grade)}`}>
                            {item.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: HOMEWORK */}
        {activeTab === 'homework' && (
          <div className="space-y-6">
            {/* Homework Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-5 text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Total Assigned</span>
                <span className="text-3xl font-black text-gray-900 mt-2 block">
                  {studentInfo.homework?.total || 0}
                </span>
              </Card>
              <Card className="p-5 text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Submitted</span>
                <span className="text-3xl font-black text-green-600 mt-2 block">
                  {studentInfo.homework?.submitted || 0}
                </span>
              </Card>
              <Card className="p-5 text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Pending</span>
                <span className="text-3xl font-black text-amber-500 mt-2 block">
                  {studentInfo.homework?.pending || 0}
                </span>
              </Card>
              <Card className="p-5 text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Late / Pending Overdue</span>
                <span className="text-3xl font-black text-red-600 mt-2 block">
                  {studentInfo.homework?.lateSubmission || 0}
                </span>
              </Card>
            </div>

            {/* Homework History Table */}
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                <h3 className="text-lg font-bold text-gray-900">Homework History</h3>
              </div>
              {(!studentInfo.homeworkHistory || studentInfo.homeworkHistory.length === 0) ? (
                <div className="py-16 text-center flex flex-col items-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-bold">No homework assigned</p>
                  <p className="text-xs text-gray-400 mt-1">This class currently has no homework assignments.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-150">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Homework Title</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Subject</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Due Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Grade / Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentInfo.homeworkHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">{item.title}</td>
                          <td className="px-6 py-4 text-gray-700 text-sm font-semibold">{item.subject}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                              item.status === 'submitted' ? 'bg-green-100 text-green-700' :
                              item.status === 'late' ? 'bg-red-100 text-red-700' :
                              item.status === 'notSubmitted' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {item.status === 'notSubmitted' ? 'Not Submitted' : item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {item.grade ? (
                              <span className="text-sm font-bold text-gray-800">{item.grade}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 6: NOTICES & NOTIFICATIONS */}
        {activeTab === 'notices' && (
          <Card className="p-6 space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900">Student Notices & Notifications</h3>
            </div>
            {(!studentInfo.notifications || studentInfo.notifications.length === 0) ? (
              <div className="py-16 text-center flex flex-col items-center">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-bold">No announcements found</p>
                <p className="text-xs text-gray-400 mt-1">There are no administrative or teacher notices published for this student.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentInfo.notifications.map((notif, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-start gap-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          notif.source === 'Principal' ? 'bg-indigo-100 text-indigo-700' :
                          notif.source === 'Super Admin' ? 'bg-red-100 text-red-700' :
                          notif.source === 'Teacher' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {notif.source}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">
                          {notif.date ? new Date(notif.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-gray-900">{notif.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
                    </div>

                    <div className="md:text-right text-xs text-gray-400 font-bold self-end md:self-auto">
                      <span>Posted by:</span>
                      <span className="block font-black text-gray-700 text-sm mt-0.5">{notif.createdBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
};

export default StudentProfile;
