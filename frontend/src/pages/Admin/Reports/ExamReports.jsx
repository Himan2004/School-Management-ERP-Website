import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, Clock, Percent, Eye, FileBarChart
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option,
  GColumnChart, GPieChart, PanelModal
} from '../../../components/shared/Common_Components';
import api from '../../../services/api';

const ActionTooltip = ({ label, children }) => (
  <div className="relative group/tip flex justify-center">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-2 z-[200] opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 transition-[opacity,transform] duration-150 whitespace-nowrap">
      <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
        {label}
      </div>
      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-[#1a2e3f]" />
    </div>
  </div>
);

const ExamReports = () => {
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  
  // Real Filter Options from API
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [examTypeOptions, setExamTypeOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);

  // Global Filters
  const [academicYear, setAcademicYear] = useState('');
  const [examType, setExamType] = useState('All Exams');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  // Data States
  const [kpiData, setKpiData] = useState({});
  const [trendChartData, setTrendChartData] = useState([]);
  const [subjectChartData, setSubjectChartData] = useState([]);
  const [examData, setExamData] = useState([]);
  const [subjectData, setSubjectData] = useState([]);

  // Modal States
  const [selectedExam, setSelectedExam] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Load real filter options once on mount
  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const res = await api.get('/admin/reports/exam-reports/filters');
        if (res.data?.success && res.data?.data) {
          const { classes, sections, academicYears, examTypes } = res.data.data;
          setAcademicYearOptions(academicYears || []);
          setClassOptions(classes || []);
          setAllSections(sections || []);
          setSectionOptions(sections || []);
          setExamTypeOptions(examTypes || []);
          
          if (academicYears?.length > 0) {
            setAcademicYear(academicYears[0].value);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exam report filters:', err);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // When class selection changes, filter sections
  useEffect(() => {
    if (classFilter === 'All Classes') {
      setSectionOptions(allSections);
    } else {
      const selectedClassObj = classOptions.find(c => c.value === classFilter);
      if (selectedClassObj) {
        const filtered = allSections.filter(s => !s.classId || s.classId === selectedClassObj.id);
        setSectionOptions(filtered);
      } else {
        setSectionOptions(allSections);
      }
    }
    setSectionFilter('All Sections'); // reset section when class changes
  }, [classFilter, allSections, classOptions]);

  // Fetch report data whenever filters change (and after filters are loaded)
  useEffect(() => {
    if (filtersLoading || !academicYear) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/reports/exam-reports', {
          params: { academicYear, examType, classFilter, sectionFilter }
        });
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setKpiData(d.kpiData || { total: 0, completed: 0, upcoming: 0, passPct: 0 });
          setTrendChartData(d.trendChartData || []);
          setSubjectChartData(d.subjectChartData || []);
          setExamData(d.examData || []);
          setSubjectData(d.subjectData || []);
        } else {
          setKpiData({ total: 0, completed: 0, upcoming: 0, passPct: 0 });
          setTrendChartData([]);
          setSubjectChartData([]);
          setExamData([]);
          setSubjectData([]);
        }
      } catch (err) {
        console.error("Failed to fetch exam reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear, examType, classFilter, sectionFilter, filtersLoading]);

  const examColumns = [
    { key: 'examName', label: 'Exam Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'type', label: 'Exam Type' },
    { key: 'className', label: 'Class' },
    { key: 'appeared', label: 'Students Appeared', align: 'center' },
    { key: 'passed', label: 'Passed', render: (val) => <span className="text-emerald-600 font-semibold">{val}</span> },
    { key: 'failed', label: 'Failed', render: (val) => <span className="text-rose-600 font-semibold">{val}</span> },
    { key: 'passPct', label: 'Pass %', render: (val) => <span className="font-black text-[#223F74]">{val}</span> },
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedExam(row); setIsExamModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const subjectColumns = [
    { key: 'subject', label: 'Subject', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'highest', label: 'Highest Marks' },
    { key: 'average', label: 'Average Marks' },
    { key: 'passPct', label: 'Pass %', render: (val) => <span className="font-black text-[#223F74]">{val}</span> },
    { key: 'topper', label: 'Topper', render: (val) => <span className="font-semibold text-slate-700">{val}</span> },
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedSubject(row); setIsSubjectModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  if (filtersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading exam report filters...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      
      {/* 1. Header */}
      <Heading
        primaryText="Exam"
        secondaryText="Reports"
        size={12}
        showAnimations={true}
      />

      {/* 2. KPI Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Exams" value={kpiData.total} icon={<FileText size={22} />} size={3} accentColor="#223F74" />
        <EnhancedDashCard title="Completed Exams" value={kpiData.completed} icon={<CheckCircle size={22} />} size={3} accentColor="#10B981" />
        <EnhancedDashCard title="Upcoming Exams" value={kpiData.upcoming} icon={<Clock size={22} />} size={3} accentColor="#F59E0B" />
        <EnhancedDashCard title="Overall Pass Percentage" value={`${kpiData.passPct}%`} icon={<Percent size={22} />} size={3} accentColor="#3B82F6" />
      </DashGrid>

      {/* 3. Global Filters - Real Data from API */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
              <Option value="All Years" label="All Years" />
              {academicYearOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Exam Type</label>
            <Select id="filter-exam-type" value={examType} onChange={(e) => setExamType(e.target.value)} searchable={false}>
              <Option value="All Exams" label="All Exams" />
              {examTypeOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
            <Select id="filter-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} searchable={false}>
              <Option value="All Classes" label="All Classes" />
              {classOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Section</label>
            <Select id="filter-section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} searchable={false}>
              <Option value="All Sections" label="All Sections" />
              {sectionOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>
        </Grid>
      </div>

      {/* 5. Charts */}
      <DashGrid cols={12} gap={4}>
         <GColumnChart 
            title="Exam Result Trend" 
            data={trendChartData.map(d => ({ ...d, name: d.term }))} 
            bars={[{key: 'passed', color: '#10B981'}]} 
            size={6} 
         />
         <GPieChart 
            title="Subject-wise Pass Percentage" 
            data={subjectChartData.map(d => ({ name: d.subject, value: parseInt(d.passPct, 10) || 0 }))}
            size={6} 
         />
      </DashGrid>

      {/* 6. Exam Result Summary Table */}
      <div className="relative">
        {loading && Object.keys(kpiData).length > 0 && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[24px]">
             <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
           </div>
        )}
        <DataTable 
          title="Exam Result Summary"
          rows={examData} 
          columns={examColumns} 
          searchable={true} 
          exportable={true} 
          exportFileName={`Exam_Result_Summary_${academicYear}`} 
        />
      </div>

      {/* 8. Subject Performance Table */}
      <div className="relative">
        {loading && Object.keys(kpiData).length > 0 && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[24px]">
             <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
           </div>
        )}
        <DataTable 
          title="Subject Performance"
          rows={subjectData} 
          columns={subjectColumns} 
          searchable={true} 
          exportable={true} 
          exportFileName={`Subject_Performance_${academicYear}`} 
        />
      </div>

      {/* 7. Exam Result Modal */}
      <PanelModal 
        id="exam-detail-modal" 
        title="Exam Information" 
        size="2xl"
        isVisible={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
      >
        {selectedExam && (
          <div className="space-y-6 pb-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Exam Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Exam Name</p>
                    <p className="font-bold text-slate-900">{selectedExam.examName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Exam Type</p>
                    <p className="font-bold text-slate-900">{selectedExam.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Academic Year</p>
                    <p className="font-bold text-slate-900">{academicYear}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Class</p>
                    <p className="font-bold text-slate-900">{selectedExam.className}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Section</p>
                    <p className="font-bold text-slate-900">{sectionFilter === 'All Sections' ? 'All' : sectionFilter}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Exam Date</p>
                    <p className="font-bold text-slate-900">{selectedExam.date}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Result Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Students Appeared</p>
                    <p className="font-bold text-slate-900">{selectedExam.appeared}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1.5">Pass Percentage</p>
                    <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-[#e3eafd] text-[#223F74]">
                      {selectedExam.passPct}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Passed</p>
                    <p className="font-bold text-emerald-600">{selectedExam.passed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Failed</p>
                    <p className="font-bold text-rose-600">{selectedExam.failed}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Exam Schedule</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Duration</p>
                    <p className="font-bold text-slate-900">{selectedExam.duration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Marks</p>
                    <p className="font-bold text-slate-900">{selectedExam.totalMarks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Passing Marks</p>
                    <p className="font-bold text-slate-900">{selectedExam.passingMarks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Remarks</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">General Remarks</p>
                    <p className="font-semibold text-slate-800">{selectedExam.remarks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Result Status</p>
                    <p className="font-bold text-slate-900">{selectedExam.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>

      {/* 9. Subject Performance Modal */}
      <PanelModal 
        id="subject-detail-modal" 
        title="Subject Performance" 
        size="2xl"
        isVisible={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
      >
        {selectedSubject && (
          <div className="space-y-6 pb-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Subject Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Subject Name</p>
                    <p className="font-bold text-slate-900">{selectedSubject.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Class</p>
                    <p className="font-bold text-slate-900">{classFilter === 'All Classes' ? 'Class 10' : classFilter}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Section</p>
                    <p className="font-bold text-slate-900">{sectionFilter === 'All Sections' ? 'All' : sectionFilter}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Performance Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Highest Marks</p>
                    <p className="font-bold text-emerald-600">{selectedSubject.highest}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1.5">Pass Percentage</p>
                    <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-[#e3eafd] text-[#223F74]">
                      {selectedSubject.passPct}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Lowest Marks</p>
                    <p className="font-bold text-rose-600">{Math.max(0, selectedSubject.average - 25)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Average Marks</p>
                    <p className="font-bold text-amber-600">{selectedSubject.average}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Class Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Total Students</p>
                    <p className="font-bold text-slate-900">45</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Students Passed</p>
                    <p className="font-bold text-emerald-600">44</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Students Failed</p>
                    <p className="font-bold text-rose-600">1</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Top Performer</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Student Name</p>
                    <p className="font-bold text-slate-900">{selectedSubject.topper}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Marks</p>
                    <p className="font-bold text-slate-900">{selectedSubject.topperMarks}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-slate-500 font-medium">Rank</p>
                    <p className="font-bold text-slate-900">#{selectedSubject.topperRank}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default ExamReports;
