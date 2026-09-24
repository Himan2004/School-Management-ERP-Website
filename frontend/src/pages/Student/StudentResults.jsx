import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Award, TrendingUp, Trophy, Download, Loader2, Eye, X,
  BarChart, LineChart, BookOpen, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  Heading, DashGrid, EnhancedDashCard, GColumnChart, GDoughnutChart, DataTable, 
  SelectField, Option, PanelModal, ModalGrid, ModalData, openModal, closeModal
} from '../../components/shared/Common_Components';

// Mock data removed. Ready for backend integration.
const StudentResults = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [filterYear, setFilterYear] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await api.get('/student/results');
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          setResults(data);
          // Set filter year from the student's actual academic year
          if (data.academicYear) setFilterYear(data.academicYear);
        } else {
          setResults(null);
          setError(null);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setResults(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, []);

  const filteredSubjects = (results?.subjects || []).filter(sub => {
    const matchExam = filterExam === 'all' || sub.examType === filterExam;
    const matchSub = filterSubject === 'all' || sub.name === filterSubject;
    const matchStatus = filterStatus === 'all' || sub.status.toLowerCase() === filterStatus;
    return matchExam && matchSub && matchStatus;
  });

  let publishedCount = 0;
  let pendingCount = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;

  filteredSubjects.forEach(sub => {
    if (sub.status === 'Published') publishedCount++;
    if (sub.status === 'Pending') pendingCount++;
    totalMarks += sub.maxScore;
    obtainedMarks += sub.score;
  });

  const overallPercentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  
  let overallGrade = 'N/A';
  if (totalMarks > 0) {
    if (overallPercentage >= 90) overallGrade = 'A+';
    else if (overallPercentage >= 80) overallGrade = 'A';
    else if (overallPercentage >= 70) overallGrade = 'B+';
    else if (overallPercentage >= 60) overallGrade = 'B';
    else if (overallPercentage >= 50) overallGrade = 'C';
    else overallGrade = 'D';
  }

  const overallRank = filteredSubjects.length > 0 && filteredSubjects.length === (results?.subjects?.length || 0) 
    ? (results?.overall?.rank || 'N/A') 
    : 'N/A';

  const handleDownloadReport = () => {
    if (!results) {
      toast.error('No data to download');
      return;
    }
    
    try {
      setIsDownloading(true);
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("Student Academic Report", 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Student Name: ${results.student?.name || 'N/A'}`, 14, 32);
      doc.text(`Roll Number: ${results.student?.rollNo || 'N/A'}`, 14, 38);
      doc.text(`Class & Section: ${results.student?.class || 'N/A'}`, 14, 44);
      doc.text(`Academic Year: ${filterYear}`, 14, 50);
      doc.text(`Exam Name: All Exams`, 14, 56);
      doc.text(`Result Published Date: ${new Date().toISOString().split('T')[0]}`, 14, 62);
      
      if (filteredSubjects.length > 0) {
        doc.text(`Total Marks: ${obtainedMarks} / ${totalMarks}`, 120, 38);
        doc.text(`Percentage: ${overallPercentage}%`, 120, 44);
        doc.text(`Grade: ${overallGrade}`, 120, 50);
        doc.text(`Rank: ${overallRank}`, 120, 56);
        doc.text(`Overall Result: ${overallPercentage >= 35 ? 'Pass' : 'Fail'}`, 120, 62);
      }
      
      const tableColumn = ["Subject", "Max Marks", "Obtained Marks", "Grade", "Percentage"];
      const tableRows = [];
      
      filteredSubjects.forEach(subject => {
        tableRows.push([
          subject.name || 'N/A',
          subject.maxScore ?? 0,
          subject.score ?? 0,
          subject.grade || 'N/A',
          `${subject.percentage ?? 0}%`
        ]);
      });
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [34, 63, 116] }
      });
      
      const safeStudentName = (results.student?.name || 'Student').replace(/\s+/g, '_');
      doc.save(`Overall_Result_${safeStudentName}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSubjectResult = (subject) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(`Result Statement - ${subject.examName || 'Examination'}`, 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Student Name: ${results?.student?.name || 'N/A'}`, 14, 35);
      doc.text(`Roll Number: ${results?.student?.rollNo || 'N/A'}`, 14, 42);
      doc.text(`Class & Section: ${results?.student?.class || 'N/A'}`, 14, 49);
      
      autoTable(doc, {
        head: [["Detail", "Value"]],
        body: [
          ["Subject", subject.name || 'N/A'],
          ["Teacher Name", subject.teacher || 'N/A'],
          ["Exam Details", `${subject.examName || 'N/A'} (${subject.examType || 'N/A'})`],
          ["Subject Marks", `${subject.score ?? 0} / ${subject.maxScore ?? 0}`],
          ["Grade", subject.grade || 'N/A'],
          ["Percentage", `${subject.percentage ?? 0}%`],
          ["Status", (subject.percentage ?? 0) >= 35 ? 'Pass' : 'Fail'],
          ["Result Published Date", subject.publishDate || new Date().toISOString().split('T')[0]]
        ],
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 11 },
        headStyles: { fillColor: [34, 63, 116] }
      });
      
      const safeExamName = (subject.examName || 'Exam').replace(/\s+/g, '_');
      const safeSubjectName = (subject.name || 'Subject').replace(/\s+/g, '_');
      doc.save(`${safeExamName}_Result_${safeSubjectName}.pdf`);
      toast.success(`Result for ${subject.name} downloaded successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleViewDetails = (subject) => {
    setSelectedSubject(subject);
    openModal("result-details-modal");
  };
  // Filters moved to top of component for derived stats calculation

  const tableColumns = [
    { key: "name", label: "Subject" },
    { key: "teacher", label: "Teacher Name" },
    { key: "examName", label: "Exam Name" },
    { key: "examType", label: "Exam Type" },
    { key: "score", label: "Marks Obtained" },
    { key: "maxScore", label: "Total Marks" },
    { 
      key: "percentage", 
      label: "Percentage",
      render: (val) => `${val}%`
    },
    { 
      key: "grade", 
      label: "Grade",
      render: (val) => {
        if (!val) return "-";
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            val.includes('A') ? 'bg-green-100 text-green-700' :
            val.includes('B') ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { 
      key: "status", 
      label: "Result Status",
      render: (val) => {
        if (!val) return "-";
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            val === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { key: "publishDate", label: "Result Publish Date" }
  ];

  const tableActions = [
    {
      tooltip: "View Details",
      icon: <span title="View Details"><Eye className="w-4 h-4" /></span>,
      onClick: handleViewDetails
    },
    {
      tooltip: "Download Subject Result",
      icon: <span title="Download Subject Result"><Download className="w-4 h-4" /></span>,
      onClick: handleDownloadSubjectResult
    }
  ];

  const chartDataBar = filteredSubjects.map(s => ({
    name: s.name,
    percentage: s.percentage,
    classAverage: s.classAverage
  }));

  const gradeCount = filteredSubjects.reduce((acc, curr) => {
    acc[curr.grade] = (acc[curr.grade] || 0) + 1;
    return acc;
  }, {});
  const chartDataDoughnut = Object.keys(gradeCount).map(k => ({
    name: k,
    value: gradeCount[k]
  }));

  if (loading && !results) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Loading your results...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="w-full sm:w-auto flex-1">
          <Heading primaryText="Results" />
        </div>
      </div>

      {/* Summary Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Results Published"
          value={publishedCount}
          icon={<BookOpen size={24} />}
          accentColor="#10b981"
          size={3}
        />
        <EnhancedDashCard
          title="Pending Results"
          value={pendingCount}
          icon={<Clock size={24} />}
          accentColor="#f59e0b"
          size={3}
        />
        <EnhancedDashCard
          title="Current Rank"
          value={overallRank !== 'N/A' ? `#${overallRank}` : 'N/A'}
          icon={<Trophy size={24} />}
          accentColor="#3b82f6"
          size={3}
        />
        <EnhancedDashCard
          title="Overall Performance"
          value={`${overallPercentage}%`}
          icon={<Award size={24} />}
          accentColor="#8b5cf6"
          size={3}
        />
      </DashGrid>

      {/* Filters */}
      <DashGrid cols={12} gap={4}>
        <SelectField label="Academic Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} searchable={false} size={3}>
          <Option value="2026-2027" label="2026-2027" />
          <Option value="2025-2026" label="2025-2026" />
          <Option value="2024-2025" label="2024-2025" />
          <Option value="2023-2024" label="2023-2024" />
          <Option value="2022-2023" label="2022-2023" />
        </SelectField>
        
        <SelectField label="Exam Type" value={filterExam} onChange={(e) => setFilterExam(e.target.value)} searchable={false} size={3}>
          <Option value="all" label="All Types" />
          <Option value="Term 1" label="Term 1" />
          <Option value="Term 2" label="Term 2" />
          <Option value="Final" label="Final" />
        </SelectField>

        <SelectField label="Subject" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} searchable={false} size={3}>
          <Option value="all" label="All Subjects" />
          {results?.subjects?.map(s => (
            <Option key={s.id} value={s.name} label={s.name} />
          ))}
        </SelectField>
        
        <SelectField label="Result Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} searchable={false} size={3}>
          <Option value="all" label="All Statuses" />
          <Option value="published" label="Published" />
          <Option value="pending" label="Pending" />
        </SelectField>
      </DashGrid>

      {/* Charts Section */}
      <DashGrid cols={12} gap={6}>
        {chartDataBar.length > 0 ? (
          <GColumnChart 
            title="Subject-wise Performance"
            subtitle="Comparing your score to class average"
            data={chartDataBar}
            bars={[
              { key: 'percentage', label: 'Your Score (%)', color: '#6366f1' },
              { key: 'classAverage', label: 'Class Average (%)', color: '#9ca3af' }
            ]}
            size={8}
            height={320}
          />
        ) : (
          <div className="col-span-12 md:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-[320px] text-gray-500 font-medium">
            No chart data available
          </div>
        )}
        
        {chartDataDoughnut.length > 0 ? (
          <GDoughnutChart 
            title="Overall Result Distribution"
            subtitle="Grades breakdown"
            data={chartDataDoughnut}
            colors={['#10b981', '#3b82f6', '#f59e0b', '#ef4444']}
            size={4}
            height={320}
          />
        ) : (
          <div className="col-span-12 md:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-[320px] text-gray-500 font-medium">
            No chart data available
          </div>
        )}
      </DashGrid>

      {/* DataTable */}
      <DashGrid cols={12}>
        <DataTable
          title="Exam Results"
          columns={tableColumns}
          rows={filteredSubjects}
          actions={tableActions}
          searchable={true}
          exportable={true}
          pageSize={5}
          headerAction={
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading || !results}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#223F74] hover:bg-[#F4F7FB] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> {isDownloading ? 'Preparing...' : 'Download Overall Result'}
            </button>
          }
        />
      </DashGrid>

      {/* Overall Performance Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 md:p-8 border border-indigo-100 shadow-sm mt-6 mb-6">
        <div className="flex items-center gap-4 mb-8 border-b border-indigo-100 pb-5">
          <div className="p-3 bg-indigo-100 rounded-xl shadow-inner">
            <Award className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Overall Performance Summary</h3>
            <p className="text-sm text-gray-500 mt-1">A comprehensive view of your academic standing</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subjects</span>
            <span className="text-2xl font-bold text-gray-900">{filteredSubjects.length}</span>
          </div>
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Marks Obtained</span>
            <span className="text-2xl font-bold text-gray-900">{obtainedMarks}</span>
          </div>
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Marks</span>
            <span className="text-2xl font-bold text-gray-900">{totalMarks}</span>
          </div>
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Overall Percentage</span>
            <span className="text-2xl font-bold text-indigo-600">{overallPercentage}%</span>
          </div>
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grade</span>
            <span className="text-2xl font-bold text-green-600">{overallGrade}</span>
          </div>
          <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rank</span>
            <span className="text-2xl font-bold text-amber-500">{overallRank !== 'N/A' ? `#${overallRank}` : 'N/A'}</span>
          </div>
          <div className="flex flex-row items-center justify-start gap-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm col-span-2 md:col-span-3 lg:col-span-6">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Pass/Fail Status</span>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${overallPercentage >= 35 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {overallPercentage >= 35 ? "Pass" : "Fail"}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Performance Status</span>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${overallPercentage >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {overallPercentage >= 75 ? "Excellent Performance" : "Needs Improvement"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Details Modal */}
      <PanelModal id="result-details-modal" title="Result Details" size="md">
        {selectedSubject && (
          <div className="flex flex-col gap-6 py-2">
            <ModalGrid title="Student Information" cols={2}>
              <ModalData label="Name" value={results?.student?.name} />
              <ModalData label="Class / Roll No" value={`${results?.student?.class} - ${results?.student?.rollNo}`} />
            </ModalGrid>
            <ModalGrid title="Exam Information" cols={2}>
              <ModalData label="Subject" value={selectedSubject.name} />
              <ModalData label="Teacher Name" value={selectedSubject.teacher} />
              <ModalData label="Exam Name" value={selectedSubject.examName} />
              <ModalData label="Exam Date" value={selectedSubject.publishDate} />
              <ModalData label="Result Publish Date" value={selectedSubject.publishDate} />
            </ModalGrid>
            <ModalGrid title="Performance" cols={2}>
              <ModalData label="Maximum Marks" value={selectedSubject.maxScore} />
              <ModalData label="Obtained Marks" value={selectedSubject.score} />
              <ModalData label="Percentage" value={`${selectedSubject.percentage}%`} />
              <ModalData label="Grade" value={selectedSubject.grade} />
              <ModalData label="Rank" value={selectedSubject.rank} />
              <ModalData label="Class Average" value={`${selectedSubject.classAverage}%`} />
            </ModalGrid>
            <ModalGrid title="Remarks" cols={1}>
              <ModalData label="Performance Status" value={selectedSubject.percentage >= 75 ? "Excellent" : "Good"} />
              <ModalData label="Teacher Remarks" value={selectedSubject.percentage >= 90 ? "Excellent work!" : "Keep improving."} />
            </ModalGrid>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => closeModal("result-details-modal")}
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
};

export default StudentResults;