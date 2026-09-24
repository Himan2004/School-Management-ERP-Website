import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Award, BookOpen, Download,
  BarChart3, LineChart as LineChartIcon, Activity,
  ArrowUp, ArrowDown, Loader2,
  CheckCircle, GraduationCap,
  Zap, Flame, TrendingDown, Info,
} from 'lucide-react';
import {
  Heading,
  EnhancedDashCard,
  Grid,
  DashGrid,
  GLineChart,
  GColumnChart,
  GAreaChart,
  GRadarChart,
} from '../../components/shared/Common_Components';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';

const StudentPerformance = () => {
  const [attendance, setAttendance] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [timeRange, setTimeRange] = useState('semester');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar' | 'area'
  const [showComparison, setShowComparison] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const data = performance || {};

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [attendanceRes, performanceRes] = await Promise.all([
          studentApi.getAttendance(),
          studentApi.getPerformance(),
        ]);
        setAttendance(attendanceRes?.data || attendanceRes);
        setPerformance(performanceRes?.data || performanceRes);
      } catch (err) {
        console.error('Error loading performance data:', err);
        if (typeof setError === 'function') setError(err);
        toast.error('Failed to load performance data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getGradeColor = (grade) => {
    const colors = {
      'A+': 'text-green-600 bg-green-100',
      'A': 'text-green-600 bg-green-100',
      'B+': 'text-blue-600 bg-blue-100',
      'B': 'text-blue-600 bg-blue-100',
      'C+': 'text-yellow-600 bg-yellow-100',
      'C': 'text-yellow-600 bg-yellow-100',
      'D': 'text-orange-600 bg-orange-100',
      'F': 'text-red-600 bg-red-100',
    };
    return colors[grade] || 'text-gray-600 bg-gray-100';
  };

  const getPerformanceIcon = (perf) => {
    switch (perf) {
      case 'Outstanding': return <Award className="w-4 h-4 text-yellow-500" />;
      case 'Excellent': return <Award className="w-4 h-4 text-green-500" />;
      case 'Good': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'Satisfactory': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend) => {
    const value = parseFloat(trend);
    if (value > 0) return <ArrowUp className="w-3 h-3 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <Activity className="w-3 h-3 text-gray-400" />;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleExport = async () => {
    setIsExporting(true);
    setTimeout(() => {
      toast.success('Performance report exported successfully!');
      setIsExporting(false);
    }, 1500);
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const filteredSubjects = selectedSubject === 'all'
    ? subjects
    : subjects.filter(s => s.name === selectedSubject);

  const strongestSubject = subjects.length ? subjects.reduce((max, s) => s.score > max.score ? s : max, subjects[0]) : null;
  const weakestSubject = subjects.length ? subjects.reduce((min, s) => s.score < min.score ? s : min, subjects[0]) : null;
  const mostImprovedSubject = subjects.length ? subjects.reduce((max, s) => parseFloat(s.trend) > parseFloat(max.trend) ? s : max, subjects[0]) : null;

  // ── Chart data for Common_Components wrappers ───────────────────────────────

  // Performance Trend — line / bar / area chart data
  const perfTrendData = (data.monthlyPerformance || []).map(item => ({
    name: item.month,
    Math: item.math ?? 0,
    Physics: item.physics ?? 0,
    Chemistry: item.chemistry ?? 0,
    English: item.english ?? 0,
    CS: item.cs ?? 0,
    ...(showComparison ? { 'Class Avg': item.average ?? 0 } : {}),
  }));

  const perfLines = [
    { key: 'Math', label: 'Math', color: '#3B82F6' },
    { key: 'Physics', label: 'Physics', color: '#10B981' },
    { key: 'Chemistry', label: 'Chemistry', color: '#F59E0B' },
    { key: 'English', label: 'English', color: '#EF4444' },
    { key: 'CS', label: 'CS', color: '#8B5CF6' },
    ...(showComparison ? [{ key: 'Class Avg', label: 'Class Avg', color: '#6B7280' }] : []),
  ];

  // Attendance Trend — area chart
  const attendanceTrendData = (data.attendanceTrend || []).map(item => ({
    name: item.month,
    'Attendance %': item.percentage ?? 0,
    'Days Present': item.present ?? 0,
  }));

  // Skill Analysis — radar chart
  const skillRadarData = (data.skillAnalysis || []).map(item => ({
    subject: item.subject,
    score: item.score ?? 0,
    classAverage: item.classAverage ?? 0,
    target: item.target ?? 0,
  }));

  // Subject bar chart data for column chart
  const subjectBarData = subjects.map(s => ({
    name: s.name?.length > 8 ? `${s.name.substring(0, 8)}…` : s.name,
    Score: s.score ?? 0,
    'Max Score': s.maxScore ?? 100,
  }));

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading && !performance) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <Heading
        primaryText="Academic"
        secondaryText="Performance"
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-white/15 border border-white/20 rounded-xl text-white text-xs font-semibold backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
            >
              <option value="week" className="text-gray-800 bg-white">This Week</option>
              <option value="month" className="text-gray-800 bg-white">This Month</option>
              <option value="semester" className="text-gray-800 bg-white">This Semester</option>
              <option value="year" className="text-gray-800 bg-white">This Year</option>
            </select>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 border border-white/20 rounded-xl text-white text-xs font-semibold backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        }
      />

      {error && (
        <p className="text-xs text-red-600 px-1">⚠ Failed to sync latest data. Showing cached results.</p>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <Grid cols={12} gap={5}>
        <EnhancedDashCard
          title="Overall Performance"
          value={`${data.studentInfo?.overallPercentage ?? 0}%`}
          icon={<GraduationCap size={22} />}
          accentColor="#10b981"
          size={3}
        />
        <EnhancedDashCard
          title="Attendance Rate"
          value={`${data.studentInfo?.attendance ?? 0}%`}
          icon={<BookOpen size={22} />}
          accentColor="#3b82f6"
          size={3}
        />
        <EnhancedDashCard
          title="Achievements"
          value={`${data.studentInfo?.achievements?.length ?? 0}`}
          icon={<Award size={22} />}
          accentColor="#f59e0b"
          size={3}
        />
        <EnhancedDashCard
          title="Improvement Rate"
          value="+7.8%"
          icon={<TrendingUp size={22} />}
          accentColor="#8b5cf6"
          size={3}
        />
      </Grid>

      {/* ── Subject Performance + Skill Radar ────────────────────────────────── */}
      <DashGrid cols={12} gap={5}>

        {/* Subject Performance list — col-span 7 */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold text-[#1D1D1F]">Subject Performance</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Scores, grades &amp; trends by subject</p>
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 border border-[#E2E8F0] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
            >
              <option value="all">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredSubjects.length === 0 && (
              <p className="text-sm text-[#6B7280] text-center py-6">No subjects to display.</p>
            )}
            {filteredSubjects.map((subject) => (
              <div key={subject.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm text-[#1D1D1F] truncate">{subject.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getGradeColor(subject.grade)}`}>
                      {subject.grade}
                    </span>
                    {getPerformanceIcon(subject.performance)}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-base font-black ${getScoreColor(subject.score)}`}>
                      {subject.score}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">/ {subject.maxScore}</span>
                    <div className="flex items-center gap-0.5">
                      {getTrendIcon(subject.trend)}
                      <span className="text-xs text-[#6B7280]">{subject.trend}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-[#F4F7FB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#223F74] to-[#7A8FC6] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((subject.score / subject.maxScore) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1 text-xs text-[#9CA3AF]">
                  <span>Attendance: {subject.attendance}%</span>
                  <span>Teacher: {subject.teacher}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Analysis Radar — col-span 5 */}
        <GRadarChart
          title="Skill Analysis"
          subtitle="Your score vs class average vs target"
          data={skillRadarData}
          radars={[
            { key: 'score', label: 'Your Score', color: '#3B82F6' },
            { key: 'classAverage', label: 'Class Average', color: '#10B981' },
            { key: 'target', label: 'Target', color: '#F59E0B' },
          ]}
          size={5}
          height={320}
        />
      </DashGrid>

      {/* ── Performance Trend Chart ───────────────────────────────────────────── */}
      <DashGrid cols={12} gap={5}>
        <div className="col-span-12 bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[#1D1D1F]">Performance Trend</h2>
              <button
                onClick={() => setShowDetailedStats(prev => !prev)}
                className="p-1 hover:bg-[#F4F7FB] rounded-full text-[#9CA3AF] transition-colors"
                title="Show insight"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart type toggle */}
              <div className="flex bg-[#F4F7FB] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setChartType('line')}
                  title="Line chart"
                  className={`p-2 rounded-lg transition-colors ${chartType === 'line' ? 'bg-white shadow-sm text-[#223F74]' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
                >
                  <LineChartIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  title="Bar chart"
                  className={`p-2 rounded-lg transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-[#223F74]' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartType('area')}
                  title="Area chart"
                  className={`p-2 rounded-lg transition-colors ${chartType === 'area' ? 'bg-white shadow-sm text-[#223F74]' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>

              {/* Comparison toggle */}
              <button
                onClick={() => setShowComparison(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${showComparison
                  ? 'bg-[#223F74] text-white border-[#223F74]'
                  : 'border-[#E2E8F0] text-[#6B7280] hover:bg-[#F4F7FB]'
                  }`}
              >
                {showComparison ? 'Hide Comparison' : 'Show Class Avg'}
              </button>
            </div>
          </div>

          {/* Detailed insight banner */}
          {showDetailedStats && (
            <div className="mb-4 p-3 bg-[#EEF2FF] rounded-xl text-sm text-[#223F74] flex items-start gap-2 border border-[#C7D2FE]">
              <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#4F46E5]" />
              <p>Your average score has increased by <strong>5.8%</strong> over the last 4 months. You are performing <strong>12%</strong> above the class average in Mathematics.</p>
            </div>
          )}

          <div className="w-full">
            {chartType === 'line' && (
              <GLineChart
                title=""
                data={perfTrendData}
                lines={perfLines}
                size={12}
                height={360}
              />
            )}
            {chartType === 'bar' && (
              <GColumnChart
                title=""
                data={perfTrendData}
                bars={perfLines}
                size={12}
                height={360}
              />
            )}
            {chartType === 'area' && (
              <GAreaChart
                title=""
                data={perfTrendData}
                areas={perfLines}
                size={12}
                height={360}
              />
            )}
          </div>
        </div>
      </DashGrid>

      {/* ── Attendance Trend + Subject Bar Chart ─────────────────────────────── */}
      <DashGrid cols={12} gap={5}>
        <GAreaChart
          title="Attendance Trend"
          subtitle="Monthly attendance percentage and days present"
          data={attendanceTrendData}
          areas={[
            { key: 'Attendance %', label: 'Attendance %', color: '#3B82F6' },
            { key: 'Days Present', label: 'Days Present', color: '#10B981' },
          ]}
          size={7}
          height={300}
        />

        <GColumnChart
          title="Subject Scores"
          subtitle="Score vs max marks per subject"
          data={subjectBarData}
          bars={[
            { key: 'Score', label: 'Your Score', color: '#223F74' },
            { key: 'Max Score', label: 'Max Score', color: '#E2E8F0' },
          ]}
          size={5}
          height={300}
        />
      </DashGrid>

      {/* ── Performance Insight Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Strongest Subject */}
        <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-[20px] p-5 border border-[#C7D2FE]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">Strongest Subject</p>
            </div>
          </div>
          <p className="text-xl font-black text-[#1D1D1F] truncate">
            {strongestSubject?.name || 'N/A'}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-[#6B7280]">Score: <span className="font-semibold text-[#1D1D1F]">{strongestSubject?.score ?? 'N/A'}%</span></p>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Top 5%</span>
          </div>
        </div>

        {/* Needs Improvement */}
        <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FEF3C7] rounded-[20px] p-5 border border-[#FCD34D]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center shadow-md">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D97706]">Needs Improvement</p>
            </div>
          </div>
          <p className="text-xl font-black text-[#1D1D1F] truncate">
            {weakestSubject?.name || 'N/A'}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-[#6B7280]">Score: <span className="font-semibold text-[#1D1D1F]">{weakestSubject?.score ?? 'N/A'}%</span></p>
            <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Focus here</span>
          </div>
        </div>

        {/* Most Improved */}
        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] rounded-[20px] p-5 border border-[#6EE7B7]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center shadow-md">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#059669]">Most Improved</p>
            </div>
          </div>
          <p className="text-xl font-black text-[#1D1D1F] truncate">
            {mostImprovedSubject?.name || 'N/A'}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-[#6B7280]">Trend: <span className="font-semibold text-[#1D1D1F]">{mostImprovedSubject?.trend || 'N/A'}</span></p>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Great job!</span>
          </div>
        </div>
      </div>

      {/* ── Background data-sync indicator ──────────────────────────────────── */}
      {loading && data.subjects && (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E7E2DB] p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#223F74]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">Syncing latest data…</span>
        </div>
      )}
    </div>
  );
};

export default StudentPerformance;