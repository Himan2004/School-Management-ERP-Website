import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Award,
  Calendar,
  TrendingUp,
  FileCheck,
  Eye,
  Download,
  CalendarDays,
  Clock,
  MapPin,
  FileText
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from 'react-hot-toast';
import ParentExamApi from "../../services/api/ParentExamApi";

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  PanelModal,
  GColumnChart,
  GLineChart,
} from "../../components/shared/Common_Components";

const CARD = 'rounded-[24px] border border-[#E7E2DB] bg-white shadow-[0_6px_20px_rgba(0,0,0,.06)]';

const ParentExam = () => {
  const [selectedExamDetails, setSelectedExamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    completed: 0,
    appear: 0,
    upcoming: 0
  });

  useEffect(() => {
    fetchExamData();
  }, []);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem("studentId");
      const schoolId = localStorage.getItem("schoolId");
      
      if (!studentId || !schoolId) {
        setError("Student or School ID missing. Please return to dashboard.");
        setLoading(false);
        return;
      }

      const [schedulesRes, resultsRes, trendRes, analysisRes] = await Promise.all([
        ParentExamApi.getStudentSchedules(studentId),
        ParentExamApi.getStudentResults(studentId),
        ParentExamApi.getPerformanceTrend(studentId),
        ParentExamApi.getSubjectAnalysis(studentId),
      ]);

      let allExams = [];
      let completedCount = 0;
      let upcomingCount = 0;
      let ongoingCount = 0;
      const uniqueExams = new Set();

      if (resultsRes?.success) {
        setResults(resultsRes.data || []);
        const mappedResults = (resultsRes.data || []).map((res) => {
          const name = res.examSchedule?.examStructure?.examName || "Exam";
          uniqueExams.add(name);
          return {
            id: res._id,
            name,
            subject: "Overall",
            class: "",
            date: new Date(res.publishedAt || res.createdAt).toLocaleDateString(),
            venue: "-",
            status: "completed",
            score: `${res.totalMarksObtained}/${res.totalMaxMarks}`,
            grade: res.overallGrade || res.percentage + "%" || "A",
            total: res.totalMaxMarks,
            attendance: "90%",
          };
        });
        allExams = [...allExams, ...mappedResults];
        completedCount = mappedResults.length;
      }

      if (schedulesRes?.success) {
        setSchedules(schedulesRes.data || []);
        const mappedSchedules = (schedulesRes.data || []).map((sch) => {
          let st = sch.status === "published" ? "upcoming" : sch.status;
          const name = sch.examStructure?.examName || "Scheduled Exam";
          uniqueExams.add(name);
          return {
            id: sch._id,
            name,
            subject: "Overall",
            class: "",
            date: new Date(sch.createdAt).toLocaleDateString(),
            venue: sch.venue || "-",
            status: st,
            duration: "3 Hours",
            totalMarks: "100",
          };
        });

        upcomingCount = mappedSchedules.filter((s) => s.status === "upcoming").length;
        ongoingCount = mappedSchedules.filter((s) => s.status === "ongoing").length;
        allExams = [...allExams, ...mappedSchedules];
      }

      setExams(allExams);
      setStats({
        totalExams: uniqueExams.size || allExams.length,
        completed: completedCount,
        appear: ongoingCount,
        upcoming: upcomingCount,
      });

      const analysisPayload = analysisRes?.success ? analysisRes.data : analysisRes?.data ?? analysisRes;
      if (Array.isArray(analysisPayload)) {
        const mappedPerformance = analysisPayload.map((item) => ({
          name: item.name,
          You: item.score,
          Other: item.average,
        }));
        setPerformanceData(mappedPerformance);
      }

      const trendPayload = trendRes?.success ? trendRes.data : trendRes?.data ?? trendRes;
      if (Array.isArray(trendPayload)) {
        const mappedTrend = trendPayload.map((item) => {
          if (typeof item.score === "number") {
            return {
              name: item.name || item.month || "N/A",
              score: item.score,
            };
          }
          let total = 0;
          let count = 0;
          Object.keys(item).forEach((key) => {
            if (key !== "name" && key !== "__date" && key !== "__subjects") {
              total += item[key];
              count += 1;
            }
          });
          return {
            name: item.name || item.month || "N/A",
            score: count > 0 ? parseFloat((total / count).toFixed(2)) : 0,
          };
        });
        setTrendData(mappedTrend);
      }
      
    } catch (err) {
      console.error(err);
      setError(
        `Failed to fetch exam data. ${err.response?.data?.message || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const generateReportCard = (result) => {
    try {
      const doc = new jsPDF();
      const examName = result.examSchedule?.examStructure?.examName || "Examination";

      // Header
      doc.setFillColor(34, 63, 116);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("BUDDHA INSTITUTE OF TECHNOLOGY", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("Academic Progress Report", 105, 30, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Examination: ${examName}`, 20, 55);

      // Student Info
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);

      // Table
      autoTable(doc, {
        startY: 75,
        head: [["Subject", "Marks Obtained", "Max Marks", "Grade"]],
        body:
          result.subjectMarks?.map((sub) => [
            sub.subject?.subjectName || sub.subject?.name || "Subject",
            sub.totalMarks || 0,
            sub.maxMarks || 0,
            sub.grade || "-",
          ]) || [],
        headStyles: { fillColor: [34, 63, 116] },
        theme: "grid",
      });

      doc.save(`${examName}_Report_Card.pdf`);
      toast.success("Report Card Downloaded");
    } catch (error) {
      console.error("Failed to generate report card", error);
      toast.error("Failed to generate report card. Please try again.");
    }
  };

  const generateRanking = () => {
    const sortedResults = [...results].sort((a, b) => {
      const percA = parseFloat(a.percentage) || 0;
      const percB = parseFloat(b.percentage) || 0;
      return percB - percA;
    });
    
    return sortedResults.map((res, idx) => ({
      rank: idx + 1,
      examName: res.examSchedule?.examStructure?.examName || 'Exam',
      percentage: res.percentage ? `${res.percentage}%` : 'N/A',
      grade: res.overallGrade || 'N/A',
      status: (parseFloat(res.percentage) >= 75) ? 'Excellent' : (parseFloat(res.percentage) < 40) ? 'Needs Improvement' : 'Average',
      rawResult: res
    }));
  };

  const handleExportAnalytics = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(34, 63, 116);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Performance Analytics Report", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("1. Student Performance Leaderboard", 14, 55);

      const rankingData = generateRanking();
      autoTable(doc, {
        startY: 65,
        head: [["Rank", "Exam", "Percentage", "Grade", "Remarks"]],
        body: rankingData.map((r) => [r.rank, r.examName, r.percentage, r.grade, r.status]),
        headStyles: { fillColor: [34, 63, 116] },
        theme: "grid",
      });

      let nextY = doc.lastAutoTable.finalY + 20;

      doc.setFontSize(14);
      doc.text("2. Subject Analysis Summary", 14, nextY);
      
      autoTable(doc, {
        startY: nextY + 10,
        head: [["Subject", "Student Score", "Class Average"]],
        body: performanceData.map((p) => [p.subject, p.You, p.Other]),
        headStyles: { fillColor: [34, 63, 116] },
        theme: "grid",
      });

      doc.save(`Performance_Analytics_${new Date().getTime()}.pdf`);
      toast.success("Analytics Exported Successfully!");
    } catch (error) {
      console.error("Failed to export analytics", error);
      toast.error("Failed to generate analytics report");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F8EEE9] flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="font-bold text-sm text-slate-400">Loading exam records...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl m-8">{error}</div>;
  }

  const rankingData = generateRanking();

  return (
    <div className="w-full space-y-6 pb-10 text-left min-h-screen">
      
      {/* 1. Page Header */}
      <Heading
        primaryText="Exams &"
        secondaryText="Results"
        size={12}
        showAnimations={true}
      />

      {/* 2. KPI / Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Exams"
          value={String(stats.totalExams)}
          icon={<GraduationCap size={22} />}
          size={3}
          accentColor="#3B82F6"
        />
        <EnhancedDashCard
          title="Completed"
          value={String(stats.completed)}
          icon={<Award size={22} />}
          size={3}
          accentColor="#10B981"
        />
        <EnhancedDashCard
          title="Ongoing / Appearing"
          value={String(stats.appear)}
          icon={<Calendar size={22} />}
          size={3}
          accentColor="#F59E0B"
        />
        <EnhancedDashCard
          title="Upcoming"
          value={String(stats.upcoming)}
          icon={<TrendingUp size={22} />}
          size={3}
          accentColor="#8B5CF6"
        />
      </DashGrid>

      {/* 3. Scheduled Exams */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="p-6 border-b border-[#E7E2DB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
            <h3 className="text-lg font-black text-slate-800">Scheduled Exams</h3>
          </div>
          {schedules.length > 0 && (
            <span className="bg-[#F8EEE9] text-[#223F74] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {stats.upcoming + stats.appear} Upcoming
            </span>
          )}
        </div>
        
        <div className="p-6">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No upcoming exams scheduled.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {schedules.map((exam) => (
                <div key={exam._id} className="flex flex-col md:flex-row items-center justify-between rounded-2xl border border-[#E7E2DB] p-5 hover:bg-[#F8EEE9]/30 transition-all group">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-slate-800 text-base">
                        {exam.examStructure?.examName || 'Exam'}
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        exam.status === 'ongoing' ? 'bg-amber-100 text-amber-700' :
                        exam.status === 'published' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {exam.status === 'published' ? 'Upcoming' : exam.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-slate-400" /> 
                        Class {exam.class?.className || exam.class?.name || exam.className || "N/A"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        {exam.slots?.[0]?.examDate ? new Date(exam.slots[0].examDate).toLocaleDateString() : 'TBD'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {exam.slots?.[0]?.durationMinutes ? `${exam.slots[0].durationMinutes} mins` : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {exam.slots?.[0]?.venue || 'TBD'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedExamDetails(exam)}
                    className="mt-4 md:mt-0 p-2.5 bg-white rounded-xl border border-[#E7E2DB] text-slate-400 hover:text-[#223F74] hover:bg-[#F4F7FB] transition-all"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Analytics & Student Ranking */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="p-6 border-b border-[#E7E2DB] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
            <h3 className="text-lg font-black text-slate-800">Analytics & Ranking</h3>
          </div>
          <button 
            onClick={handleExportAnalytics}
            className="flex items-center gap-2 bg-[#223F74] hover:bg-[#1a3360] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Download size={16} /> Export Report
          </button>
        </div>
        
        <div className="p-6 space-y-8 bg-[#F4F7FB]/50">
          
          {/* Charts Row */}
          <DashGrid cols={12} gap={6}>
             <GColumnChart 
               title="Subject Performance" 
               subtitle="You vs Class Average"
               data={performanceData}
               bars={[
                 { key: 'You', label: 'You', color: '#223F74' }, 
                 { key: 'Other', label: 'Class Avg', color: '#38bdf8' }
               ]}
               size={6}
               height={300}
             />
             <GLineChart
               title="Performance Trend"
               subtitle="Average Score over Time"
               data={trendData}
               lines={[{ key: 'score', label: 'Average Score', color: '#10B981' }]}
               size={6}
               height={300}
             />
          </DashGrid>

          {/* Leaderboard Summary */}
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Student Performance Leaderboard</h4>
            {rankingData.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-[#E7E2DB]">
                <p className="text-slate-400 font-bold text-sm">No exam results available for ranking.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rankingData.map((rankInfo) => (
                  <div key={rankInfo.rank} className="bg-white rounded-2xl p-5 border border-[#E7E2DB] flex items-center gap-4 hover:shadow-md transition-all">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${
                      rankInfo.rank === 1 ? 'bg-amber-100 text-amber-600' :
                      rankInfo.rank === 2 ? 'bg-slate-100 text-slate-500' :
                      rankInfo.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      #{rankInfo.rank}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{rankInfo.examName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-black text-[#223F74]">{rankInfo.percentage}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-slate-500">Grade {rankInfo.grade}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Completed Exams / Results */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="p-6 border-b border-[#E7E2DB] flex items-center gap-2">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">Completed Exams & Results</h3>
        </div>

        <div className="p-6">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No published results available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result) => {
                const exam = result.examSchedule;
                const isPass = result.overallGrade !== 'FAIL' && parseFloat(result.percentage) >= 40;
                
                return (
                  <div key={result._id} className="border border-[#E7E2DB] bg-[#F8EEE9]/30 rounded-[20px] p-5 flex flex-col justify-between hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base mb-1">
                          {exam?.examStructure?.examName || 'Examination'}
                        </h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-lg border border-[#E7E2DB]">
                          Published {new Date(result.publishedAt || result.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {result.overallGrade || (isPass ? 'PASS' : 'FAIL')}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-[#E7E2DB]">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Percentage</p>
                        <p className="text-2xl font-black text-[#223F74]">{result.percentage}%</p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">{result.totalMarksObtained} / {result.totalMaxMarks} Marks</p>
                      </div>
                      <button
                        onClick={() => generateReportCard(result)}
                        className="flex items-center gap-2 bg-white border border-[#E7E2DB] px-4 py-2.5 rounded-xl text-sm font-bold text-[#223F74] hover:bg-[#223F74] hover:text-white transition-all shadow-sm"
                      >
                        <FileText size={16} /> Report Card
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Exam Details Modal --- */}
      <PanelModal
        id="exam-details-modal"
        title="Exam Details"
        size="lg"
        isVisible={!!selectedExamDetails}
        onClose={() => setSelectedExamDetails(null)}
      >
        {selectedExamDetails && (
          <div className="space-y-6">
            <div className="bg-[#223F74] p-6 rounded-2xl text-white">
              <h3 className="text-xl font-black">
                {selectedExamDetails.examStructure?.examName || selectedExamDetails.name}
              </h3>
              <p className="text-sm font-medium text-white/80 mt-1">
                Class {selectedExamDetails.class?.className || selectedExamDetails.class?.name || selectedExamDetails.className || "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8EEE9] p-4 rounded-2xl border border-[#E7E2DB]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                <p className="font-bold text-slate-800">
                  {selectedExamDetails.slots?.[0]?.examDate
                    ? new Date(selectedExamDetails.slots[0].examDate).toLocaleDateString()
                    : 'TBD'}
                </p>
              </div>
              <div className="bg-[#F8EEE9] p-4 rounded-2xl border border-[#E7E2DB]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venue</p>
                <p className="font-bold text-slate-800">{selectedExamDetails.slots?.[0]?.venue || 'Not Assigned'}</p>
              </div>
              <div className="bg-[#F8EEE9] p-4 rounded-2xl border border-[#E7E2DB]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="font-bold text-slate-800">{selectedExamDetails.slots?.[0]?.durationMinutes || 'N/A'} Minutes</p>
              </div>
              <div className="bg-[#F8EEE9] p-4 rounded-2xl border border-[#E7E2DB]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <p className="font-bold text-slate-800 capitalize">{selectedExamDetails.status === 'published' ? 'Upcoming' : selectedExamDetails.status}</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-blue-800">
                Please reach the venue 15 minutes before the scheduled time with your Admit Card.
              </p>
            </div>
          </div>
        )}
      </PanelModal>

    </div>
  );
};

export default ParentExam;
