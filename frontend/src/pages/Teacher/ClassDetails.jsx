import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/teacher/Card';
import {
  getTeacherClassByIdApi,
  getTeacherClassStatsApi,
  getTeacherStudentByIdApi,
} from '../../services/api/teacherApi';

// ─── Backend shapes ──────────────────────────────────────────────────────────
//
// GET /teacher/classes/:id  →  getTeacherClassByIdApi(id)
// (id = SubjectAssignment._id, passed via react-router useParams().id)
//
// response.data = {
//   id,
//   className,          // "Grade 10"
//   section,            // "A" | ""
//   subject,            // subjectName
//   academicYear,
//   room,               // always null (not stored in SubjectAssignment model)
//   totalStudents,      // count of students filtered by section
//   attendanceRate,     // 30-day present% (number, e.g. 87.5)
//   pendingAssignments, // number
//   averageGrade,       // always "N/A"
//   schedule: [{ day, startTime, endTime }],    // from Timetable
//   students: [{
//     id,          // Student._id
//     name,        // student.user.name
//     rollNo,
//     photo,       // student.photo or ""
//     email,       // student.user.email
//     attendance,  // 30-day % (number)
//     performance, // always "N/A"
//   }],
//   recentAnnouncements: [{
//     id,          // Notice._id
//     title,
//     description, // notice.content
//     date,        // notice.createdAt
//   }]
// }
//
// GET /teacher/classes/:id/stats  →  getTeacherClassStatsApi(id)
//
// response.data = {
//   attendanceThisMonth,    // number of attendance records this month
//   presentPercentage,      // number (e.g. 91.67)
//   totalHomework,          // number
//   pendingHomework,        // number
//   averageScore,           // always null
//   topStudent,             // always null
//   lowAttendanceStudents,  // count of students < 75% attendance
//   totalStudents,
// }
// ────────────────────────────────────────────────────────────────────────────

const ClassDetails = () => {
  // :id is SubjectAssignment._id — comes from the Link in Classes.jsx
  const { id } = useParams();

  const [classData, setClassData] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [quickViewData, setQuickViewData] = useState(null);
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [quickViewError, setQuickViewError] = useState(null);

  useEffect(() => {
    if (!selectedStudentId) {
      setQuickViewData(null);
      return;
    }
    const fetchQuickView = async () => {
      try {
        setQuickViewLoading(true);
        setQuickViewError(null);
        const response = await getTeacherStudentByIdApi(selectedStudentId);
        if (response?.success) {
          setQuickViewData(response.data);
        } else {
          setQuickViewError(response?.message || "Failed to load student details.");
        }
      } catch (err) {
        setQuickViewError(err?.message || "Failed to load student details.");
      } finally {
        setQuickViewLoading(false);
      }
    };
    fetchQuickView();
  }, [selectedStudentId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedStudentId(null);
    };
    if (selectedStudentId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudentId]);

  useEffect(() => {
    if (!id) return;

    const loadClassDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch both endpoints in parallel
        const [detailRes, statsRes] = await Promise.all([
          getTeacherClassByIdApi(id),
          getTeacherClassStatsApi(id),
        ]);

        if (detailRes?.success) setClassData(detailRes.data);
        if (statsRes?.success) setClassStats(statsRes.data);
      } catch (err) {
        const msg = err?.message || 'Failed to load class details';
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassDetails();
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Details</h1>
          <p className="mt-1 text-gray-500">Loading…</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="animate-pulse text-sm text-gray-400">
            Fetching class information…
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !classData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Details</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-500">{error || 'Class not found.'}</p>
          <Link
            to="/teacher/dashboard/classes"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────

  // Title: "Grade 10 - A" or just "Grade 10"
  const classTitle = [classData.className, classData.section]
    .filter(Boolean)
    .join(' - ');

  // Schedule: join all periods into one readable string
  // schedule entries: { day: "Monday", startTime: "09:00 AM", endTime: "10:00 AM" }
  const scheduleText =
    classData.schedule && classData.schedule.length > 0
      ? classData.schedule
          .map((s) => {
            const time = s.endTime
              ? `${s.startTime} – ${s.endTime}`
              : s.startTime;
            return `${s.day} ${time}`;
          })
          .join(', ')
      : 'N/A';

  // For the stats bar we prefer classStats (this month) for homework figures
  // but fall back to classData values when classStats is unavailable
  const attendanceRate =
    classStats?.presentPercentage ?? classData.attendanceRate ?? 0;
  const totalHomework = classStats?.totalHomework ?? 0;
  const pendingHomework = classStats?.pendingHomework ?? classData.pendingAssignments ?? 0;
  const lowAttendance = classStats?.lowAttendanceStudents ?? 0;

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{classTitle}</h1>
        <p className="mt-1 text-gray-500">{classData.subject}</p>
      </div>

      {/* ── Class Info Card ─────────────────────────────────────────────── */}
      <Card>
        <div className="p-6">
          {/* 4-column info row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium text-gray-900">
                  {classData.subject || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                {/* totalStudents = count of students in this class+section */}
                <p className="font-medium text-gray-900">
                  {classData.totalStudents ?? '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Schedule</p>
                {/* scheduleText built from schedule[].{day, startTime, endTime} */}
                <p className="font-medium text-gray-900 text-sm">
                  {scheduleText}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Attendance Rate</p>
                {/*
                  room is always null in the backend (not stored in model).
                  Show attendanceRate (30-day %) instead — more useful.
                */}
                <p className="font-medium text-gray-900">
                  {classData.attendanceRate ?? 0}%
                </p>
              </div>
            </div>
          </div>

          {/* ── Quick Stats row (from /stats endpoint) ──────────────────── */}
          {(classStats || classData) && (
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {attendanceRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Attendance Rate
                  {classStats ? ' (this month)' : ' (30-day)'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {totalHomework}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total Homework</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {pendingHomework}
                </p>
                <p className="text-xs text-gray-500 mt-1">Pending Homework</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {lowAttendance}
                </p>
                <p className="text-xs text-gray-500 mt-1">Low Attendance</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Students List ────────────────────────────────────────────────── */}
      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {/* students array is filtered by section inside getClassById */}
            Students ({classData.students?.length ?? 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Roll No</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Attendance</th>
                  <th className="text-left py-3 px-4">Performance</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(classData.students || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-sm text-gray-400"
                    >
                      No students found for this class.
                    </td>
                  </tr>
                ) : (
                  classData.students.map((student) => (
                    <tr
                      key={String(student.id)}
                      className="border-b border-gray-100"
                    >
                      {/* rollNo – student.rollNo or "" */}
                      <td className="py-3 px-4">{student.rollNo || '—'}</td>

                      {/* name – from student.user.name via populate */}
                      <td className="py-3 px-4 font-medium">
                        {student.name || '—'}
                      </td>

                      {/* email – from student.user.email via populate */}
                      <td className="py-3 px-4">{student.email || '—'}</td>

                      {/* attendance – 30-day present % (number) */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            student.attendance >= 90
                              ? 'bg-green-100 text-green-700'
                              : student.attendance >= 75
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {student.attendance}%
                        </span>
                      </td>

                      {/* performance – always "N/A" until exam model wired */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            student.performance === 'A'
                              ? 'bg-green-100 text-green-700'
                              : student.performance === 'B'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {student.performance || 'N/A'}
                        </span>
                      </td>

                      {/* View link → Quick View Modal */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedStudentId(student.id)}
                          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* ── Class Announcements ──────────────────────────────────────────── */}
      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Class Announcements
          </h2>
          {(classData.recentAnnouncements || []).length === 0 ? (
            <p className="text-sm text-gray-400">No recent announcements.</p>
          ) : (
            <div className="space-y-4">
              {classData.recentAnnouncements.map((announcement) => (
                <div
                  key={String(announcement.id)}
                  className="rounded-lg bg-gray-50 p-4"
                >
                  <h3 className="font-semibold text-gray-900">
                    {announcement.title}
                  </h3>
                  {/* description = notice.content from Notice model */}
                  <p className="mt-1 text-sm text-gray-600">
                    {announcement.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {/* date = notice.createdAt */}
                    <span className="text-xs text-gray-500">
                      {announcement.date
                        ? new Date(announcement.date).toLocaleDateString(
                            'en-US',
                            { year: 'numeric', month: 'short', day: 'numeric' }
                          )
                        : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Student Quick View Modal */}
      {selectedStudentId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedStudentId(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Student Overview</h3>
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {quickViewLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-400 animate-pulse">Fetching details...</p>
                </div>
              )}

              {quickViewError && (
                <div className="text-center py-12 space-y-3">
                  <div className="inline-flex p-3 bg-red-50 text-red-500 rounded-full">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-red-500 font-medium">{quickViewError}</p>
                  <button 
                    onClick={() => setSelectedStudentId(selectedStudentId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!quickViewLoading && !quickViewError && quickViewData && (
                <div className="space-y-6">
                  {/* Top row with Photo and Basic Profile Card */}
                  <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-100/50">
                    {quickViewData.photo ? (
                      <img 
                        src={quickViewData.photo} 
                        alt={quickViewData.name} 
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md shadow-blue-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md shadow-blue-100">
                        {quickViewData.name ? quickViewData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                      </div>
                    )}
                    
                    <div className="text-center md:text-left space-y-1">
                      <h4 className="text-2xl font-bold text-gray-900">{quickViewData.name}</h4>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          Roll No: {quickViewData.rollNo || 'Not Available'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                          Adm No: {quickViewData.enrollmentNo || 'Not Available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card 1: Identity */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 space-y-3">
                      <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Identity Details</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500 block">Class & Section</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {quickViewData.class ? `${quickViewData.class} - ${quickViewData.section || 'N/A'}` : 'Not Available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Gender</span>
                          <span className="text-sm font-semibold text-gray-800 capitalize">{quickViewData.gender || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Date Of Birth</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {quickViewData.dateOfBirth ? new Date(quickViewData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not Available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Blood Group</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.bloodGroup || 'Not Available'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Contact & Address */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 space-y-3">
                      <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contact Details</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500 block">Email Address</span>
                          <span className="text-sm font-semibold text-gray-800 block truncate" title={quickViewData.email}>
                            {quickViewData.email || 'Not Available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Phone Number</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.parent?.phone || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Home Address</span>
                          <span className="text-sm font-semibold text-gray-800 block line-clamp-2" title={quickViewData.address}>
                            {quickViewData.address || 'Not Available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Parent & Guardians */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 space-y-3">
                      <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Parent Details</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500 block">Father's Name</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.fatherName || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Mother's Name</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.motherName || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Guardian Name</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.guardianName || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Parent Contact</span>
                          <span className="text-sm font-semibold text-gray-800">{quickViewData.parent?.phone || 'Not Available'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance, Attendance & Account Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3 p-4 rounded-xl bg-green-50/50 border border-green-100">
                      <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center text-lg font-bold">
                        %
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Attendance</span>
                        <span className="text-base font-bold text-green-700">
                          {quickViewData.attendance?.percentage !== undefined ? `${quickViewData.attendance.percentage}%` : 'Not Available'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                      <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center text-lg font-bold">
                        ★
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Performance</span>
                        <span className="text-base font-bold text-purple-700 capitalize">
                          {quickViewData.performance?.latestGrade || 'Not Available'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center text-lg font-bold">
                        ✔
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Account Status</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                          quickViewData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {quickViewData.status || 'Not Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-all"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setSelectedStudentId(null);
                  navigate(`/teacher/student/${quickViewData.id}`);
                }}
                disabled={!quickViewData}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                Open Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;
