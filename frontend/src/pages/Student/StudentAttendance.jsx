import React, { useState, useEffect } from 'react';
import {
  Activity, Star, CheckCircle, AlertCircle,
  Trophy, Zap, Eye, Calendar, Clock, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  GColumnChart,
  GDoughnutChart,
  DataTable,
  SelectField,
  Option,
  PanelModal,
  ModalGrid,
  ModalData,
  openModal,
  closeModal
} from '../../components/shared/Common_Components';

import { studentApi } from '../../services/api/studentApi';

export default function StudentAttendance() {
  const [period, setPeriod] = useState('month');
  const [subject, setSubject] = useState('all');
  const [selectedSubjectDetails, setSelectedSubjectDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await studentApi.getAttendance();
        if (res?.success && res?.data) {
          setAttendanceData(res.data);
        } else {
          setError('No attendance data available.');
        }
      } catch (err) {
        const msg = err?.response?.data?.message || 'Failed to load attendance data.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // Build the currentData shape that the rest of the component consumes
  const currentData = attendanceData
    ? {
        summary: {
          percentage: attendanceData.summary?.percentage ?? 0,
          present: attendanceData.summary?.present ?? 0,
          absent: attendanceData.summary?.absent ?? 0,
          late: attendanceData.summary?.late ?? 0,
          total: attendanceData.summary?.totalDays ?? 0,
        },
        bestMonth: attendanceData.summary?.bestMonth || '--',
        bestMonthPercentage: attendanceData.summary?.bestMonthPercentage ?? 0,
        streak: attendanceData.summary?.streak ?? 0,
        // trend: use monthly data for the column chart (12 months)
        trend: (attendanceData.monthly || []).map((m) => ({
          name: m.month,
          percentage: m.percentage,
          present: m.present,
          absent: m.absent,
          late: m.late,
        })),
        distribution: [
          { name: 'Present', value: attendanceData.summary?.present ?? 0 },
          { name: 'Absent', value: attendanceData.summary?.absent ?? 0 },
          { name: 'Late', value: attendanceData.summary?.late ?? 0 },
        ],
        subjects: attendanceData.subjects || [],
        recentActivity: (attendanceData.dailyRecords || []).map((r, idx) => ({
          id: idx + 1,
          text: `${r.day} — ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}`,
          type: r.status === 'present' ? 'present' : r.status === 'absent' ? 'absent' : r.status === 'late' ? 'late' : 'info',
          date: r.date,
          time: r.checkIn || '--',
          reason: r.reason || '',
        })),
        alerts: attendanceData.alerts || [],
        weekly: attendanceData.weekly || [],
      }
    : {
        summary: { percentage: 0, present: 0, absent: 0, late: 0, total: 0 },
        bestMonth: '--',
        bestMonthPercentage: 0,
        streak: 0,
        trend: [],
        distribution: [],
        subjects: [],
        recentActivity: [],
        alerts: [],
        weekly: [],
      };

  // Period-aware trend data
  const trendData = period === 'week'
    ? (currentData.weekly || []).map((w) => ({ name: `Week ${w.week}`, percentage: w.percentage }))
    : period === 'year'
    ? currentData.trend
    : currentData.trend; // month = monthly by default

  const filteredSubjects = subject === 'all'
    ? currentData.subjects
    : currentData.subjects.filter((s) => s.name === subject);

  const filteredSummary = subject === 'all'
    ? currentData.summary
    : {
        percentage: filteredSubjects[0]?.percentage ?? 0,
        present: filteredSubjects[0]?.present ?? 0,
        total: filteredSubjects[0]?.total ?? 0,
      };

  const filteredDistribution = subject === 'all'
    ? currentData.distribution
    : [
        { name: 'Present', value: filteredSubjects[0]?.present ?? 0 },
        { name: 'Absent', value: filteredSubjects[0]?.absent ?? 0 },
        { name: 'Late', value: filteredSubjects[0]?.late ?? 0 },
      ];

  const filteredTrend = subject === 'all'
    ? trendData
    : trendData.map((t) => ({
        name: t.name,
        percentage: Math.min(100, Math.max(0, t.percentage + ((filteredSubjects[0]?.percentage ?? 0) - currentData.summary.percentage))),
      }));

  const filteredActivity = subject === 'all'
    ? currentData.recentActivity
    : currentData.recentActivity.filter((a) => a.text.includes(subject) || a.type === 'info');

  const getAttendanceStatus = (percentage) => {
    if (!percentage && percentage !== 0) return { label: 'N/A', color: '#9ca3af', icon: Activity };
    if (percentage >= 90) return { label: 'Excellent Attendance', color: '#10b981', icon: Star };
    if (percentage >= 75) return { label: 'Great Attendance', color: '#3b82f6', icon: CheckCircle };
    if (percentage >= 60) return { label: 'Average Attendance', color: '#f59e0b', icon: Activity };
    return { label: 'Low Attendance Alert', color: '#ef4444', icon: AlertCircle };
  };

  const statusInfo = getAttendanceStatus(filteredSummary.percentage);
  const StatusIcon = statusInfo.icon;

  const tableColumns = [
    { key: 'name', label: 'Subject' },
    { key: 'teacher', label: 'Teacher' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
    { key: 'total', label: 'Total Classes' },
    { key: 'percentageStr', label: 'Attendance %' },
    { key: 'trend', label: 'Trend' },
  ];

  const formattedSubjects = filteredSubjects.map((s) => ({
    ...s,
    percentageStr: (
      <div className="flex items-center gap-1.5 font-semibold">
        <span className={`w-2 h-2 rounded-full ${s.percentage >= 90 ? 'bg-green-500' : s.percentage >= 75 ? 'bg-blue-500' : s.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
        <span className={s.percentage >= 90 ? 'text-green-700' : s.percentage >= 75 ? 'text-blue-700' : s.percentage >= 60 ? 'text-yellow-700' : 'text-red-700'}>{s.percentage}%</span>
      </div>
    ),
  }));

  const handleViewDetails = (row) => {
    setSelectedSubjectDetails(row);
    openModal('subject-details-modal');
  };

  const tableActions = [
    {
      tooltip: 'View Details',
      icon: <span title="View Details"><Eye className="w-4 h-4" /></span>,
      onClick: handleViewDetails,
    },
  ];

  const getActivityBadge = (type) => {
    const styles = {
      present: 'bg-green-100 text-green-700 border-green-200',
      absent: 'bg-red-100 text-red-700 border-red-200',
      late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${styles[type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading attendance data...
      </div>
    );
  }

  if (error && !attendanceData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm bg-[#223F74] text-white rounded-lg hover:bg-[#1D3557] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading primaryText="Attendance Tracker" />

      {/* Alerts from backend */}
      {currentData.alerts.length > 0 && (
        <div className="space-y-2">
          {currentData.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${alert.bg} ${alert.color} border-current/20`}
            >
              {alert.type === 'success'
                ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                <span className="font-semibold">{alert.title}: </span>
                {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Overall Attendance"
          value={`${filteredSummary.percentage}%`}
          icon={<Activity size={24} />}
          accentColor="#10b981"
          size={3}
        />
        <EnhancedDashCard
          title="Attendance Status"
          value={statusInfo.label}
          icon={<StatusIcon size={24} />}
          accentColor={statusInfo.color}
          size={3}
        />
        <EnhancedDashCard
          title="Best Month"
          value={currentData.bestMonth}
          icon={<Trophy size={24} />}
          accentColor="#eab308"
          size={3}
        />
        <EnhancedDashCard
          title="Current Streak"
          value={currentData.streak ? `${currentData.streak} Days` : 'N/A'}
          icon={<Zap size={24} />}
          accentColor="#f97316"
          size={3}
        />
      </DashGrid>

      {/* Filters */}
      <DashGrid cols={12} gap={4}>
        <SelectField label="Time Period" value={period} onChange={(e) => setPeriod(e.target.value)} searchable={false} size={4}>
          <Option value="week" label="Weekly" />
          <Option value="month" label="Monthly" />
          <Option value="year" label="Yearly" />
        </SelectField>

        <SelectField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} searchable={false} size={4}>
          <Option value="all" label="All Subjects" />
          {currentData.subjects.map((s) => (
            <Option key={s.name} value={s.name} label={s.name} />
          ))}
        </SelectField>
      </DashGrid>

      {/* Charts Section */}
      <DashGrid cols={12} gap={6}>
        {filteredTrend && filteredTrend.length > 0 ? (
          <GColumnChart
            title="Attendance Trend"
            subtitle={`Trend for ${period} view`}
            data={filteredTrend}
            bars={[{ key: 'percentage', label: 'Attendance (%)', color: '#6366f1' }]}
            size={8}
            height={320}
          />
        ) : (
          <div className="col-span-12 md:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-[320px] text-gray-500 font-medium">
            No attendance data available
          </div>
        )}

        {filteredDistribution && filteredDistribution.some((d) => d.value > 0) ? (
          <GDoughnutChart
            title="Attendance Distribution"
            subtitle="Present vs Absent vs Late"
            data={filteredDistribution}
            colors={['#10b981', '#ef4444', '#f59e0b']}
            size={4}
            height={320}
          />
        ) : (
          <div className="col-span-12 md:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-[320px] text-gray-500 font-medium">
            No attendance data available
          </div>
        )}
      </DashGrid>

      {/* Detailed Subject Records Table */}
      <DashGrid cols={12}>
        <DataTable
          title="Detailed Subject Records"
          columns={tableColumns}
          rows={formattedSubjects}
          actions={tableActions}
          searchable={true}
          exportable={true}
          pageSize={5}
        />
      </DashGrid>

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 text-lg">Recent Activity</h3>
          <p className="text-sm text-gray-500">Your latest attendance updates</p>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent attendance activity.
          </div>
        ) : (
          <div className="relative border-l-2 border-indigo-100 ml-3 space-y-8 pb-4">
            {filteredActivity.map((record) => (
              <div key={record.id} className="relative pl-6">
                <span className={`absolute -left-[10px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                  record.type === 'present' ? 'bg-green-500' :
                  record.type === 'absent' ? 'bg-red-500' :
                  record.type === 'late' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></span>

                <div className="bg-slate-50/80 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-800">{record.text}</h4>
                    {getActivityBadge(record.type)}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {record.time}
                    </div>
                  </div>
                  {record.reason && (
                    <p className="mt-1 text-xs text-slate-400 italic">{record.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject Details PanelModal */}
      <PanelModal id="subject-details-modal" title="Subject Attendance Details" size="md">
        {selectedSubjectDetails && (
          <div className="flex flex-col gap-6 py-2">
            <ModalGrid title="Subject Information" cols={2}>
              <ModalData label="Subject Name" value={selectedSubjectDetails.name} />
              <ModalData label="Teacher Name" value={selectedSubjectDetails.teacher || 'N/A'} />
            </ModalGrid>
            <ModalGrid title="Attendance Stats" cols={2}>
              <ModalData label="Present Classes" value={selectedSubjectDetails.present} />
              <ModalData label="Absent Classes" value={selectedSubjectDetails.absent} />
              <ModalData label="Late Count" value={selectedSubjectDetails.late} />
              <ModalData label="Total Classes" value={selectedSubjectDetails.total} />
              <ModalData label="Attendance Percentage" value={`${selectedSubjectDetails.percentage}%`} />
              <ModalData label="Attendance Trend" value={selectedSubjectDetails.trend || 'N/A'} />
            </ModalGrid>
            <ModalGrid title="Performance Summary" cols={2}>
              <ModalData label="Overall Attendance Percentage" value={`${selectedSubjectDetails.percentage}%`} />
              <ModalData label="Attendance Rating" value={getAttendanceStatus(selectedSubjectDetails.percentage).label} />
              <ModalData
                label="Teacher Remarks"
                value={selectedSubjectDetails.percentage > 85
                  ? 'Excellent engagement and participation.'
                  : 'Needs to improve attendance consistency.'}
              />
            </ModalGrid>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => closeModal('subject-details-modal')}
                className="px-6 py-2 bg-[#223F74] text-white rounded-xl hover:bg-[#1D3557] font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
}
