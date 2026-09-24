import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Edit2,
  Save,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
  School,
  BookOpen,
  Award,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  Printer,
  Download,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import {
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  Button,
  DataField,
  PanelModal,
  DataTable,
  ToggleButton,
  Modal,
  Select,
  Option
} from '../../../components/shared/Common_Components';
import DatePicker from '../../../components/shared/DatePicker';

// ── API Service Imports ──
import {
  getSubjectWiseAttendance,
  markAttendance,
  editAttendance,
  applyLeave,
  getLowAttendanceAlerts
} from '../../../services/api/subjectTeacherAttendanceApi';

const SubjectWiseAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    percentage: 0
  });
  const [lowAttendanceAlerts, setLowAttendanceAlerts] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editReason, setEditReason] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    type: 'full_day',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingStudentId, setEditingStudentId] = useState(null);

  // ── Fetch Data ──
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);


      const params = {
        class: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        date: selectedDate
      };

      const response = await getSubjectWiseAttendance(null, params);

      if (response?.data?.success) {
        const data = response.data.data;
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
        setStats(data.stats || { present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
        if (data.assignmentsList) setAssignmentsList(data.assignmentsList);
        setLowAttendanceAlerts(data.lowAttendanceAlerts || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, selectedSubject, selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass, selectedSection, selectedSubject, selectedDate, fetchAttendance]);

  // ── Derive Dropdown Options ──
  const dynamicClasses = [...new Set(assignmentsList.map(a => a.className).filter(Boolean))].sort();

  const dynamicSections = [...new Set(
    assignmentsList
      .filter(a => selectedClass && selectedClass !== 'All Classes' ? a.className === selectedClass : true)
      .map(a => a.section)
      .filter(Boolean)
  )].sort();

  const dynamicSubjects = [...new Set(
    assignmentsList
      .filter(a => {
        let match = true;
        if (selectedClass && selectedClass !== 'All Classes') match = match && a.className === selectedClass;
        if (selectedSection && selectedSection !== 'All Sections') match = match && a.section === selectedSection;
        return match;
      })
      .map(a => a.subjectName)
      .filter(Boolean)
  )].sort();

  const handleLoadData = () => {
    fetchAttendance();
  };

  // ── Filter Students ──
  useEffect(() => {
    let filtered = [...students];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toString().includes(searchTerm)
      );
    }

    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // ── Handle Mark Attendance ──
  const handleMarkAttendance = async (studentId, status) => {
    try {
      await markAttendance(null, {
        studentId,
        status,
        date: selectedDate,
        subject: selectedSubject,
        class: selectedClass,
        section: selectedSection
      });

      toast.success(`Attendance marked as ${status}`);
      fetchAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  // ── Handle Edit Attendance ──
  const handleOpenEditModal = (student) => {
    setSelectedStudent(student);
    setEditingStudentId(student.id);
    setEditStatus(student.status || 'present');
    setEditReason(student.reason || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await editAttendance(null, {
        studentId: editingStudentId,
        status: editStatus,
        reason: editReason,
        date: selectedDate
      });

      toast.success('Attendance updated successfully');
      setShowEditModal(false);
      fetchAttendance();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  // ── Handle Apply Leave ──
  const handleOpenLeaveModal = (student) => {
    setSelectedStudent(student);
    setLeaveForm({
      type: 'full_day',
      reason: '',
      date: selectedDate
    });
    setShowLeaveModal(true);
  };

  const handleApplyLeave = async () => {
    try {
      await applyLeave(null, {
        studentId: selectedStudent.id,
        leaveType: leaveForm.type,
        date: leaveForm.date,
        reason: leaveForm.reason
      });

      toast.success('Leave applied successfully');
      setShowLeaveModal(false);
      fetchAttendance();
    } catch (error) {
      console.error('Error applying leave:', error);
      toast.error('Failed to apply leave');
    }
  };

  // ── Bulk Actions ──
  const handleMarkAllPresent = async () => {
    if (!window.confirm('Mark all students as present?')) return;

    try {
      for (const student of students) {
        await markAttendance(null, {
          studentId: student.id,
          status: 'present',
          date: selectedDate,
          subject: selectedSubject,
          class: selectedClass,
          section: selectedSection
        });
      }

      toast.success('All students marked as present');
      fetchAttendance();
    } catch (error) {
      console.error('Error marking all present:', error);
      toast.error('Failed to mark all present');
    }
  };

  const handleMarkAllAbsent = async () => {
    if (!window.confirm('Mark all students as absent?')) return;

    try {
      for (const student of students) {
        await markAttendance(null, {
          studentId: student.id,
          status: 'absent',
          date: selectedDate,
          subject: selectedSubject,
          class: selectedClass,
          section: selectedSection
        });
      }

      toast.success('All students marked as absent');
      fetchAttendance();
    } catch (error) {
      console.error('Error marking all absent:', error);
      toast.error('Failed to mark all absent');
    }
  };

  // ── Stats Cards ──
  const statsCards = [
    {
      title: 'Present',
      value: String(stats.present || 0),
      icon: <UserCheck size={22} />,
      accentColor: '#22c55e',
      size: 3
    },
    {
      title: 'Absent',
      value: String(stats.absent || 0),
      icon: <UserX size={22} />,
      accentColor: '#ef4444',
      size: 3
    },
    {
      title: 'Late',
      value: String(stats.late || 0),
      icon: <Clock size={22} />,
      accentColor: '#f59e0b',
      size: 3
    },
    {
      title: 'Attendance %',
      value: `${stats.percentage || 0}%`,
      icon: <BarChart3 size={22} />,
      accentColor: '#3b82f6',
      size: 3
    }
  ];

  // ── Table Columns ──
  const columns = [
    {
      key: 'rollNo',
      label: 'Roll No',
      width: '10%',
      render: (val) => <span className="font-bold text-[#223F74]">{val}</span>
    },
    {
      key: 'name',
      label: 'Student Name',
      width: '20%',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74] font-bold text-xs">
            {val?.charAt(0) || 'S'}
          </div>
          <span className="font-medium text-[#1D1D1F]">{val}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '40%',
      render: (_, row) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleMarkAttendance(row.id, 'present')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
          >
            Present
          </button>
          <button
            onClick={() => handleMarkAttendance(row.id, 'absent')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
          >
            Absent
          </button>
          <button
            onClick={() => handleMarkAttendance(row.id, 'late')}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all"
          >
            Late
          </button>

          <button
            onClick={() => handleOpenLeaveModal(row)}
            className="p-1.5 text-[#6B7280] hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Apply Leave"
          >
            <CalendarDays size={14} />
          </button>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '20%',
      render: (val) => {
        const statusColors = {
          present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          absent: 'bg-rose-100 text-rose-700 border-rose-200',
          late: 'bg-amber-100 text-amber-700 border-amber-200',
          holiday: 'bg-purple-100 text-purple-700 border-purple-200'
        };
        const statusLabels = {
          present: 'Present',
          absent: 'Absent',
          late: 'Late',
          holiday: 'Holiday'
        };
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[val] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {statusLabels[val] || val || 'N/A'}
          </span>
        );
      }
    }
  ];

  // ── Low Attendance Alerts ──
  const LowAttendanceAlert = ({ alert }) => (
    <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-100 rounded-lg">
          <AlertCircle size={16} className="text-rose-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1D1D1F]">{alert.name}</p>
          <p className="text-xs text-[#6B7280]">
            {alert.class} - {alert.section} • {alert.subject}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-rose-600">{alert.attendance}%</p>
        <p className="text-xs text-[#6B7280]">Below {alert.threshold}%</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#223F74] animate-spin" />
            <p className="text-sm font-semibold text-[#223F74]">Loading attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 pt-6">

      {/* Header */}
      <div className="w-full mb-8">
        <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] rounded-2xl shadow-lg shadow-[#223F74]/20 p-6 border border-[#1a3360]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Subject-wise Attendance
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  {selectedDate}
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                <BookOpen size={16} /> Mark and manage subject-wise class attendance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAttendance()}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A] mt-4" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="w-full mb-6">
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

      {/* Low Attendance Alerts */}
      {lowAttendanceAlerts.length > 0 && (
        <div className="w-full mb-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#223F74] flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" />
                Low Attendance Alerts
              </h3>
              <span className="text-xs text-[#6B7280] bg-[#F4F7FB] px-3 py-1 rounded-full">
                {lowAttendanceAlerts.length} students
              </span>
            </div>
            <div className="space-y-2">
              {lowAttendanceAlerts.map((alert, idx) => (
                <LowAttendanceAlert key={idx} alert={alert} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="w-full">
        <DataTable
          columns={columns}
          rows={students}
          size={12}
          pageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
          searchable={true}
          title={`Students (${students.length})`}
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-36">
                <Select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection('');
                    setSelectedSubject('');
                  }}
                  placeholder="All Classes"
                  searchable={false}
                >
                  <Option value="" label="All Classes" />
                  {dynamicClasses.map((cls) => (
                    <Option key={cls} value={cls} label={`Class ${cls}`} />
                  ))}
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setSelectedSubject('');
                  }}
                  placeholder="All Sections"
                  searchable={false}
                >
                  <Option value="" label="All Sections" />
                  {dynamicSections.map((sec) => (
                    <Option key={sec} value={sec} label={`Section ${sec}`} />
                  ))}
                </Select>
              </div>

              <div className="w-40">
                <Select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="All Subjects"
                  searchable={false}
                >
                  <Option value="" label="All Subjects" />
                  {dynamicSubjects.map((sub) => (
                    <Option key={sub} value={sub} label={sub} />
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <DatePicker
                  value={selectedDate}
                  onChange={(val) => setSelectedDate(val)}
                  placeholder="Filter by Date"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedClass('');
                  setSelectedSection('');
                  setSelectedSubject('');
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-4 rounded-2xl border border-[#E2E8F0] text-[#6B7280] hover:bg-[#F4F7FB] text-xs font-bold transition-all flex items-center justify-center h-11 active:scale-95"
              >
                Reset
              </button>
            </div>
          }
        />
      </div>

      {/* Edit Attendance Modal */}
      {showEditModal && selectedStudent && (
        <PanelModal
          id="edit-modal"
          title="Edit Attendance"
          isVisible={showEditModal}
          onClose={() => setShowEditModal(false)}
          size="md"
        >
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-[#223F74]/5 to-[#F59B87]/5 p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#223F74] flex items-center justify-center text-white font-bold text-sm">
                  {selectedStudent.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="font-bold text-[#1D1D1F]">{selectedStudent.name}</p>
                  <p className="text-xs text-[#6B7280]">Roll No: {selectedStudent.rollNo}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Reason
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Enter reason for status change..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
              <Button
                text="Save Changes"
                variant="primary"
                size={6}
                icon={<Save size={16} />}
                onClick={handleSaveEdit}
              />
              <Button
                text="Cancel"
                variant="secondary"
                size={6}
                onClick={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </PanelModal>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && selectedStudent && (
        <PanelModal
          id="leave-modal"
          title="Apply Leave"
          isVisible={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          size="md"
        >
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-[#223F74]/5 to-[#F59B87]/5 p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#223F74] flex items-center justify-center text-white font-bold text-sm">
                  {selectedStudent.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="font-bold text-[#1D1D1F]">{selectedStudent.name}</p>
                  <p className="text-xs text-[#6B7280]">Roll No: {selectedStudent.rollNo}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Leave Type
              </label>
              <select
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition"
              >
                <option value="full_day">Full Day</option>
                <option value="half_day">Half Day</option>
                <option value="subject_wise">Subject Wise</option>
                <option value="class_wise">Class Wise</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Date
              </label>
              <input
                type="date"
                value={leaveForm.date}
                onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                Reason
              </label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Enter reason for leave..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
              <Button
                text="Apply Leave"
                variant="primary"
                size={6}
                icon={<CalendarDays size={16} />}
                onClick={handleApplyLeave}
              />
              <Button
                text="Cancel"
                variant="secondary"
                size={6}
                onClick={() => setShowLeaveModal(false)}
              />
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default SubjectWiseAttendance;