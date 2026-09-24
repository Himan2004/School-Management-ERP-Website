import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileText, Clock, CheckCircle, Percent,
  Eye, Edit2, BarChart2, Save, X, Users, Plus
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, DataTable, PanelModal,
  GColumnChart, GLineChart
} from '../../components/shared/Common_Components';

const DUMMY_FIELDS = {
  topic: 'General Syllabus',
  startTime: '10:00',
  endTime: '12:00',
  duration: '120',
  totalMarks: 100,
  passingMarks: 35,
  questions: 50,
  instructions: 'All questions are compulsory.'
};

const Exams = () => {
  const [isLoading, setIsLoading] = useState(true);

  // API Data States
  const [dashboard, setDashboard] = useState({
    stats: { totalExams: 0, completed: 0, avgScore: 0, totalStudents: 0 },
    charts: { subjectPerformance: [], trendData: [] }
  });
  const [examsList, setExamsList] = useState([]);
  const [filters, setFilters] = useState({ subjects: [], exams: [] });
  
  // Marks Entry States
  const [quickEntry, setQuickEntry] = useState({ examId: '', subjectId: '' });
  const [students, setStudents] = useState([]);
  const marksSectionRef = useRef(null);
  
  // UI States
  const [activeFilters, setActiveFilters] = useState({});
  const [marksActiveFilters, setMarksActiveFilters] = useState({});
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewExam, setViewExam] = useState(null); 
  const [editingExamId, setEditingExamId] = useState(null);
  
  const [newExam, setNewExam] = useState({ 
    name: '', classId: '', subjectId: '', date: '', 
    topic: '', startTime: '09:00', endTime: '12:00', duration: 180, 
    totalMarks: 100, passingMarks: 35, questions: 50, instructions: '' 
  });

  // Calculate duration automatically
  useEffect(() => {
    if (newExam.startTime && newExam.endTime) {
      const start = new Date(`2000-01-01T${newExam.startTime}`);
      const end = new Date(`2000-01-01T${newExam.endTime}`);
      let diff = (end - start) / 60000;
      if (diff > 0) setNewExam(prev => ({ ...prev, duration: diff }));
    }
  }, [newExam.startTime, newExam.endTime]);

  const fetchDashboard = () => {
    api.get('/teacher/exams/dashboard')
      .then(res => setDashboard(res.data?.data || dashboard))
      .catch(() => {});
  };

  const fetchExamsList = () => {
    api.get('/teacher/exams/list')
      .then(res => {
        if (res.data?.data) {
          setExamsList(res.data.data);
          setQuickEntry(prev => {
            if (!prev.examId) {
              const completed = res.data.data.find(e => e.status === 'completed');
              if (completed) {
                return { ...prev, examId: completed.id };
              }
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  };

  const fetchQuickEntryFilters = () => {
    api.get('/teacher/exams/filters')
      .then(res => {
        if (res.data?.data) setFilters(res.data.data);
      })
      .catch(() => {
        setFilters({ subjects: [], exams: [] });
      });
  };

  const fetchMarksTable = () => {
    if (!quickEntry.examId) {
      setStudents([]);
      return;
    }

    api.get('/teacher/exams/marks-entry', { params: quickEntry })
      .then(res => {
        if (res.data?.data) {
          setStudents(res.data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    setIsLoading(true);
    // Execute data fetch functions synchronously relative to dummy data to prevent blocking
    fetchDashboard();
    fetchExamsList();
    fetchQuickEntryFilters();
    setIsLoading(false); // Unmount loading immediately for dummy data
  }, []);

  useEffect(() => {
    fetchMarksTable();
  }, [quickEntry.examId, quickEntry.subjectId]);

  // Apply filters externally so Dashboard/Charts can react to DataTable active filters
  const filteredExamsForDashboard = useMemo(() => {
    return examsList.filter(exam => {
      if (activeFilters.search) {
        const s = activeFilters.search.toLowerCase();
        if (!exam.name?.toLowerCase().includes(s) && !exam.subject?.toLowerCase().includes(s)) return false;
      }
      if (activeFilters.status?.length > 0 && !activeFilters.status.includes(exam.status)) return false;
      if (activeFilters.subject?.length > 0 && !activeFilters.subject.includes(exam.subject)) return false;
      if (activeFilters.startDate && new Date(exam.date) < new Date(activeFilters.startDate)) return false;
      if (activeFilters.endDate && new Date(exam.date) > new Date(activeFilters.endDate)) return false;
      return true;
    });
  }, [examsList, activeFilters]);

  // Derived Stats based on Filtered Dataset
  const totalTests = filteredExamsForDashboard.length;
  const completedTests = filteredExamsForDashboard.filter(e => e.status === 'completed').length;
  const upcomingTests = filteredExamsForDashboard.filter(e => e.status === 'upcoming' || e.status === 'ongoing').length;
  const avgScore = completedTests > 0 ? (dashboard.stats?.avgScore || 0) : 0; 

  // Charts Logic (Filtered Dataset)
  const subjectPerformanceData = useMemo(() => {
    if (dashboard.charts?.subjectPerformance?.length > 0) {
      return dashboard.charts.subjectPerformance.map(item => ({
        ...item,
        name: item.name || item.subject
      }));
    }
    const map = {};
    filteredExamsForDashboard.forEach(e => {
      if (!map[e.subject]) map[e.subject] = { name: e.subject, average: e.averageScore || 0, highest: e.highestScore || 0, count: 0 };
      map[e.subject].average += (e.averageScore || 0); 
      map[e.subject].highest = Math.max(map[e.subject].highest, (e.highestScore || 0));
      map[e.subject].count++;
    });
    return Object.values(map).map(m => ({ ...m, average: m.count ? Math.round(m.average / m.count) : 0 }));
  }, [filteredExamsForDashboard, dashboard]);

  const trendData = useMemo(() => {
    if (dashboard.charts?.trendData?.length > 0) {
      return dashboard.charts.trendData.map(item => ({
        ...item,
        name: item.name || item.month
      }));
    }
    return [];
  }, [dashboard]);

  // Save Modal
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (new Date(`2000-01-01T${newExam.endTime}`) <= new Date(`2000-01-01T${newExam.startTime}`)) {
      return toast.error("End Time must be greater than Start Time");
    }
    if (Number(newExam.passingMarks) > Number(newExam.totalMarks)) {
      return toast.error("Passing Marks cannot exceed Total Marks");
    }

    try {
      if (editingExamId) {
        await api.put(`/teacher/exams/${editingExamId}`, newExam);
        toast.success("Exam updated successfully!");
      } else {
        await api.post('/teacher/exams', newExam);
        toast.success("Exam created successfully!");
      }
      setShowCreateModal(false);
      fetchDashboard();
      fetchExamsList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save exam");
      setShowCreateModal(false);
    }
  };

  const openCreateModal = () => {
    setEditingExamId(null);
    setNewExam({ name: '', classId: '', subjectId: '', date: '', topic: '', startTime: '09:00', endTime: '12:00', duration: 180, totalMarks: 100, passingMarks: 35, questions: 50, instructions: '' });
    setShowCreateModal(true);
  };

  // Exam Actions
  const getStatusBadge = (status) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200 border';
    if (status === 'ongoing') return 'bg-amber-50 text-amber-700 border-amber-200 border';
    return 'bg-blue-50 text-blue-700 border-blue-200 border';
  };

  const examColumns = [
    { key: 'name', label: 'Test Name', render: (_, item) => <span className="font-semibold text-slate-800">{item.name}</span> },
    { key: 'subject', label: 'Subject', render: (_, item) => <span className="font-bold text-slate-700">{item.subject}</span> },
    { key: 'topic', label: 'Topic' },
    { key: 'date', label: 'Exam Date', render: (_, item) => <span className="text-slate-600 font-medium">{item.date}</span> },
    { key: 'duration', label: 'Duration', render: (_, item) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.duration} Min</span> },
    { key: 'totalMarks', label: 'Total Marks', render: (_, item) => <span className="font-bold text-slate-800">{item.totalMarks}</span> },
    { key: 'passingMarks', label: 'Passing Marks', render: (_, item) => <span className="font-bold text-slate-600">{item.passingMarks}</span> },
    { key: 'status', label: 'Status', render: (_, item) => <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(item.status)}`}>{item.status}</span> }
  ];

  const examActions = [
    { icon: <Eye size={15} />, tooltip: "View", onClick: (row) => setViewExam(row) },
    { 
      icon: <Edit2 size={15} />, 
      tooltip: "Edit", 
      show: (row) => row.status === 'upcoming',
      onClick: (row) => { setEditingExamId(row.id || row._id); setNewExam({...DUMMY_FIELDS, ...row}); setShowCreateModal(true); } 
    },
    {
      icon: <BarChart2 size={15} />,
      tooltip: "View Results",
      show: (row) => row.status === 'completed',
      onClick: (row) => {
        setQuickEntry({
          examId: row.id || row._id,
          classId: row.classId,
          subjectId: row.subjectId
        });
        if (marksSectionRef.current) {
          marksSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  ];

  const examFilters = [
    { title: "Subject", type: "toggle", key: "subject", options: [...new Set(examsList.map(e => e.subject).filter(Boolean))] },
    { title: "Status", type: "toggle", key: "status", options: ["upcoming", "ongoing", "completed"] }
  ];

  // Marks Entry Logic
  const handleStudentMarkChange = (studentId, value) => {
    const selectedExam = examsList.find(e => e.id === quickEntry.examId || e._id === quickEntry.examId);
    const maxMarks = (selectedExam && selectedExam.totalMarks) ? selectedExam.totalMarks : 100;
    const passing = (selectedExam && selectedExam.passingMarks) ? selectedExam.passingMarks : 33;
    
    let val = Number(value);
    if (val < 0) return toast.error("Negative marks not allowed");
    if (val > maxMarks) return toast.error(`Marks cannot exceed total marks (${maxMarks})`);
    
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, marks: val, status: val >= passing ? 'Pass' : 'Fail' } : s));
  };

  const handleBulkSaveMarks = async () => {
    if (students.length === 0) return toast.error("No students to save.");
    try {
      await api.post('/teacher/exams/marks/bulk', { ...quickEntry, marksData: students });
      toast.success("Marks saved successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save marks");
    }
  };

  // Intercept the onApplyFilters payload from DataTable to control the 'examName' meta filter manually.
  const handleMarksFilterApply = (filters) => {
    setMarksActiveFilters(filters);
    
    if (filters.examName && Array.isArray(filters.examName) && filters.examName.length > 0) {
      const selectedName = filters.examName[0];
      const found = examsList.find(e => e.name === selectedName);
      if (found) {
        setQuickEntry(prev => ({ ...prev, examId: found.id || found._id }));
      }
    } else if (filters.examName && typeof filters.examName === 'string') {
      const found = examsList.find(e => e.name === filters.examName);
      if (found) {
        setQuickEntry(prev => ({ ...prev, examId: found.id || found._id }));
      }
    } else if (filters.examName === '') {
      // If cleared manually in UI
      setQuickEntry(prev => ({ ...prev, examId: '' }));
    }
  };

  const marksFilters = [
    { 
      title: "Select Exam", 
      type: "toggle", 
      key: "examName", 
      options: [...new Set(examsList.filter(e => e.status === 'completed').map(e => e.name))],
      // Always return true to prevent DataTable from internally filtering out rows missing 'examName'
      fn: () => true 
    },
    { title: "Pass / Fail Status", type: "toggle", key: "status", options: ["Pass", "Fail"] }
  ];

  const marksColumns = [
    { key: 'rollNo', label: 'Roll No.' },
    { key: 'studentName', label: 'Student Name', render: (_, item) => <span className="font-semibold text-slate-800">{item.studentName}</span> },
    { 
      key: 'marks', 
      label: 'Marks Obtained', 
      render: (_, item) => <input type="number" value={item.marks !== undefined && item.marks !== null ? item.marks : ''} onChange={(e) => handleStudentMarkChange(item.studentId, e.target.value)} className="w-20 rounded border border-gray-300 bg-white p-1.5 text-sm outline-none focus:ring-1 focus:ring-[#FF8066]" />
    },
    { 
      key: 'totalMarks', 
      label: 'Total Marks', 
      render: () => {
        const selectedExam = examsList.find(e => e.id === quickEntry.examId || e._id === quickEntry.examId);
        return <span className="font-semibold text-slate-700">{(selectedExam && selectedExam.totalMarks) ? selectedExam.totalMarks : 100}</span>;
      }
    },
    { 
      key: 'percentage', 
      label: 'Percentage', 
      render: (_, item) => {
        const selectedExam = examsList.find(e => e.id === quickEntry.examId || e._id === quickEntry.examId);
        const total = (selectedExam && selectedExam.totalMarks) ? selectedExam.totalMarks : 100;
        const perc = total > 0 ? (((item.marks || 0) / total) * 100).toFixed(1) : 0;
        return <span className="font-semibold text-slate-700">{perc}%</span>;
      }
    },
    { 
      key: 'status', 
      label: 'Pass / Fail Status', 
      render: (_, item) => <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${item.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.status || '-'}</span> 
    },
    { 
      key: 'remarks', 
      label: 'Remarks', 
      render: (_, item) => <input type="text" title={item.remarks || ''} value={item.remarks || ''} onChange={(e) => setStudents(prev => prev.map(s => s.studentId === item.studentId ? { ...s, remarks: e.target.value } : s))} className="min-w-[200px] w-full rounded border border-gray-300 bg-white p-1.5 text-sm outline-none focus:ring-1 focus:ring-[#FF8066]" placeholder="Optional" />
    }
  ];

  // Apply filters to Marks Summary
  const filteredMarksForSummary = useMemo(() => {
    return students.filter(s => {
      if (marksActiveFilters.search) {
        const q = marksActiveFilters.search.toLowerCase();
        if (!s.studentName?.toLowerCase().includes(q) && !s.rollNo?.toLowerCase().includes(q) && !s.remarks?.toLowerCase().includes(q)) return false;
      }
      if (marksActiveFilters.status?.length > 0 && !marksActiveFilters.status.includes(s.status)) return false;
      return true;
    });
  }, [students, marksActiveFilters]);

  // Marks Summary calculations
  const marksAppeared = filteredMarksForSummary.length;
  const marksPassed = filteredMarksForSummary.filter(s => s.status === 'Pass').length;
  const marksFailed = filteredMarksForSummary.filter(s => s.status === 'Fail').length;
  const marksAvg = filteredMarksForSummary.length ? Math.round(filteredMarksForSummary.reduce((acc, s) => acc + (s.marks || 0), 0) / filteredMarksForSummary.length) : 0;
  const marksHighest = filteredMarksForSummary.length ? Math.max(...filteredMarksForSummary.map(s => s.marks || 0)) : 0;
  const marksLowest = filteredMarksForSummary.length ? Math.min(...filteredMarksForSummary.map(s => s.marks || 0)) : 0;

  return (
    <div className="space-y-6">
      <Heading primaryText="Online Test" />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#FF8066] rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-semibold animate-pulse">Loading Online Tests...</p>
        </div>
      ) : (
        <>
          <DashGrid cols={12}>
            <EnhancedDashCard title="Total Tests" value={totalTests} icon={<FileText size={24} />} accentColor="#4f46e5" size={3} />
            <EnhancedDashCard title="Active / Upcoming" value={upcomingTests} icon={<Clock size={24} />} accentColor="#F59E0B" size={3} />
            <EnhancedDashCard title="Completed Tests" value={completedTests} icon={<CheckCircle size={24} />} accentColor="#10B981" size={3} />
            <EnhancedDashCard title="Average Score" value={`${avgScore}%`} icon={<Percent size={24} />} accentColor="#8B5CF6" size={3} />
          </DashGrid>

          <DashGrid cols={12}>
            <GColumnChart title="Subject Performance" data={subjectPerformanceData} bars={[{ key: 'average', color: '#3B82F6' }, { key: 'highest', color: '#10B981' }]} size={6} />
            <GLineChart title="Performance Trend" data={trendData} lines={[{ key: 'score', color: '#8B5CF6' }]} size={6} />
          </DashGrid>

          {examsList.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="font-bold text-xl text-slate-700">No Online Tests Found</h3>
              <p className="text-sm mt-2 text-slate-500">Adjust filters or create a new test.</p>
            </div>
          ) : (
            <DashGrid cols={12}>
              <DataTable
                title="Online Tests"
                columns={examColumns}
                rows={examsList}
                actions={examActions}
                searchable={true}
                exportable={true}
                pageSize={5}
                filters={examFilters}
                onApplyFilters={setActiveFilters}
                date={true}
                headerAction={
                  <button onClick={openCreateModal} className="flex items-center px-4 py-2 bg-[#FF8066] text-white text-sm font-bold rounded-xl hover:bg-[#e6735c] transition-all shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Create Test
                  </button>
                }
              />
            </DashGrid>
          )}

          {/* Marks Entry Section */}
          <div ref={marksSectionRef} className="mt-8 border-t border-slate-200 pt-8">
            {!quickEntry.examId ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[2rem] shadow-sm text-slate-500">
                <Users className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="font-bold text-xl text-slate-700">Select an Exam to Enter Marks</h3>
                <p className="text-sm mt-2 text-center max-w-sm">Use the filters or click "View Results" on a completed test in the table above to view student marks.</p>
              </div>
            ) : (
              <>
                <DashGrid cols={12}>
                  <DataTable
                    title="Student Marks"
                    columns={marksColumns}
                    rows={students}
                    filters={marksFilters}
                    searchable={true}
                    exportable={true}
                    pageSize={20}
                    onApplyFilters={handleMarksFilterApply}
                    headerAction={
                      <button onClick={handleBulkSaveMarks} disabled={students.length === 0} className="flex items-center px-4 py-2 bg-[#FF8066] text-white font-bold rounded-xl hover:bg-[#e6735c] transition-all disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> Save Marks
                      </button>
                    }
                  />
                </DashGrid>

                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
                    <h3 className="text-lg font-black text-slate-800">Marks Summary</h3>
                  </div>
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeared</p>
                      <p className="text-2xl font-black text-[#223F74] mt-1">{marksAppeared}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passed</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">{marksPassed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failed</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">{marksFailed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Marks</p>
                      <p className="text-2xl font-black text-purple-600 mt-1">{marksAvg}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Highest Marks</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">{marksHighest}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lowest Marks</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{marksLowest}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <PanelModal id="createExamModal" title={editingExamId ? 'Edit Online Test' : 'Create Online Test'} isVisible={true} onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Test Name <span className="text-rose-500">*</span></label>
                <input required type="text" value={newExam.name} onChange={(e) => setNewExam({...newExam, name: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Class <span className="text-rose-500">*</span></label>
                <select 
                  required 
                  value={newExam.classId} 
                  onChange={(e) => setNewExam({...newExam, classId: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none"
                >
                  <option value="">Select Class</option>
                  {filters.classes?.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Subject <span className="text-rose-500">*</span></label>
                <select 
                  required 
                  value={newExam.subjectId} 
                  onChange={(e) => setNewExam({...newExam, subjectId: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none"
                >
                  <option value="">Select Subject</option>
                  {filters.subjects?.map(s => (
                    <option key={s._id} value={s._id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Topic <span className="text-rose-500">*</span></label>
                <input required type="text" value={newExam.topic} onChange={(e) => setNewExam({...newExam, topic: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Exam Date <span className="text-rose-500">*</span></label>
                <input required type="date" value={newExam.date} onChange={(e) => setNewExam({...newExam, date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Duration (Auto) <span className="text-slate-400 font-normal">mins</span></label>
                <input readOnly type="text" value={newExam.duration} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Start Time <span className="text-rose-500">*</span></label>
                <input required type="time" value={newExam.startTime} onChange={(e) => setNewExam({...newExam, startTime: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">End Time <span className="text-rose-500">*</span></label>
                <input required type="time" value={newExam.endTime} onChange={(e) => setNewExam({...newExam, endTime: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Total Marks <span className="text-rose-500">*</span></label>
                <input required type="number" min="1" value={newExam.totalMarks} onChange={(e) => setNewExam({...newExam, totalMarks: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Passing Marks <span className="text-rose-500">*</span></label>
                <input required type="number" min="0" value={newExam.passingMarks} onChange={(e) => setNewExam({...newExam, passingMarks: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Question Count <span className="text-rose-500">*</span></label>
                <input required type="number" min="1" value={newExam.questions} onChange={(e) => setNewExam({...newExam, questions: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Instructions</label>
                <textarea value={newExam.instructions} onChange={(e) => setNewExam({...newExam, instructions: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF8066]/20 focus:border-[#FF8066] outline-none" rows={3} />
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-[#FF8066] text-white font-bold rounded-xl hover:bg-[#e6735c] transition-colors shadow-sm">
                {editingExamId ? 'Update Exam' : 'Create Exam'}
              </button>
            </div>
          </form>
        </PanelModal>
      )}

      {/* View Modal */}
      {viewExam && (
        <PanelModal id="viewExamModal" title="Online Test Details" isVisible={true} onClose={() => setViewExam(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><p className="text-sm text-slate-500 mb-1">Test Name</p><p className="font-semibold text-[#1D1D1F] text-lg">{viewExam.name}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Subject</p><p className="font-semibold text-[#1D1D1F]">{viewExam.subject}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Topic</p><p className="font-semibold text-[#1D1D1F]">{viewExam.topic}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Date</p><p className="font-semibold text-[#1D1D1F]">{viewExam.date}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Duration</p><p className="font-semibold text-[#1D1D1F]">{viewExam.duration} Mins ({viewExam.startTime} - {viewExam.endTime})</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Total Marks</p><p className="font-semibold text-[#1D1D1F]">{viewExam.totalMarks}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Passing Marks</p><p className="font-semibold text-[#1D1D1F]">{viewExam.passingMarks}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Questions</p><p className="font-semibold text-[#1D1D1F]">{viewExam.questions}</p></div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(viewExam.status)}`}>{viewExam.status}</span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Instructions</p>
                <p className="font-semibold text-[#1D1D1F] whitespace-pre-wrap">{viewExam.instructions || 'No instructions provided.'}</p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setViewExam(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Close</button>
            </div>
          </div>
        </PanelModal>
      )}

    </div>
  );
};

export default Exams;