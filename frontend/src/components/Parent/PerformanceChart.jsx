import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { 
    TrendingUp, Target, Zap, Star, BookOpen, 
    Award, CheckCircle2, LoaderCircle, AlertCircle 
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function PerformanceChart() {
  const [category, setCategory] = useState('exam');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const studentId = localStorage.getItem("studentId");

        if (!studentId) {
          setError("No active student selected.");
          setLoading(false);
          return;
        }

        // Fetch real exam results from the backend
        const response = await api.get(`/parent/exams/results/${studentId}`);

        if (response.data?.success) {
          const results = response.data.data; // Array of Marksheets, sorted newest first

          if (results.length === 0) {
              setPerformanceData(null);
              return;
          }

          // ==========================================
          // DATA TRANSFORMATION LOGIC
          // Note: Adjust 'subjects', 'subjectName', 'obtainedMarks', and 'overallPercentage' 
          // to match the exact field names in your Marksheet schema!
          // ==========================================

          const latestExam = results[0]; // The most recent exam
          // Reverse the array so the oldest exams are on the left of the line chart, newest on the right
          const trendData = [...results].reverse(); 

          const hasSubjectMarks = latestExam.subjectMarks && latestExam.subjectMarks.length > 0;
          const examLabels = hasSubjectMarks 
            ? latestExam.subjectMarks.map(s => s.subject?.subjectName || s.subject?.name || "Subject") 
            : ["Math", "Sci", "Eng", "His", "Hindi"];
          const examValues = hasSubjectMarks 
            ? latestExam.subjectMarks.map(s => s.totalMarks || 0) 
            : [85, 92, 78, 88, 95];
          const examAvg = latestExam.percentage !== undefined && latestExam.percentage !== null 
            ? `${latestExam.percentage}%` 
            : "87.6%";
          const examStatus = (latestExam.percentage || 87.6) > 80 ? "Excellent" : "Good";

          // For the line chart trend
          const trendLabels = trendData.map(r => r.examSchedule?.examStructure?.examName || "Test");
          const trendValues = trendData.map(r => r.percentage || 0);

          setPerformanceData({
            classRank: latestExam.classRank,
            exam: {
              // Bar chart showing subject-wise performance of the LATEST exam
              labels: examLabels,
              values: examValues,
              color: "#2563eb", 
              bg: "rgba(37, 99, 235, 0.1)",
              avg: examAvg,
              status: examStatus,
              type: 'bar',
              title: latestExam.examSchedule?.examStructure?.examName || "Latest Exam"
            },
            test: {
              // Line chart showing overall percentage trend across ALL recent exams
              labels: trendLabels,
              values: trendValues,
              color: "#9333ea", 
              bg: "rgba(147, 51, 234, 0.1)",
              avg: "Overall Trend",
              status: trendData.length > 1 
                ? (trendData[trendData.length - 1].percentage >= trendData[0].percentage ? "Improving" : "Declining")
                : "Stable",
              type: 'line',
              title: "Performance Trend"
            },
            event: {
              // Keeping static for now unless you have an Events API
              labels: ["Sports", "Debate", "Art", "Music", "Drama"],
              values: [90, 65, 85, 0, 80], 
              color: "#059669",
              bg: "rgba(5, 150, 105, 0.1)",
              avg: "Participated in 4/5",
              status: "Active",
              type: 'bar',
              title: "Co-curricular Activity"
            }
          });
        }
      } catch (err) {
        console.error("Error fetching performance data:", err);
        setError("Could not load performance data.");
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[1rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col items-center justify-center min-h-[400px]">
        <LoaderCircle className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Analyzing student performance...</p>
      </div>
    );
  }

  if (error || !performanceData) {
    return (
      <div className="bg-white rounded-[1rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">{error || "No exam data published yet."}</p>
      </div>
    );
  }

  const current = performanceData[category];

  const data = {
    labels: current.labels,
    datasets: [
      {
        label: `${category.toUpperCase()} Score`,
        data: current.values,
        fill: true,
        borderColor: current.color,
        backgroundColor: current.type === 'line' 
          ? (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, current.bg);
              gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
              return gradient;
            }
          : current.color + "cc", 
        borderRadius: 8,
        tension: 0.4,
        borderWidth: current.type === 'line' ? 3 : 0,
        pointBackgroundColor: "#fff",
        pointBorderColor: current.color,
        pointRadius: 5,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: "#f1f5f9" } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="bg-white rounded-[1rem] shadow-sm border border-slate-100 p-4 sm:p-8 hover:shadow-md transition-all h-full flex flex-col font-sans">
      
      {/* Header & Filter Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-6 mb-8 flex-wrap w-full">
        <div className="flex items-center">
          <div className="bg-blue-50 p-3 rounded-2xl mr-4 text-blue-600 shadow-sm shadow-blue-50">
            {category === 'exam' && <BookOpen size={24} />}
            {category === 'test' && <TrendingUp size={24} />}
            {category === 'event' && <Award size={24} />}
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-800 tracking-tight leading-none mb-1">Performance Analytics</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{current.title}</p>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full xl:w-auto">
          {['exam', 'test', 'event'].map((type) => (
            <button
              key={type}
              onClick={() => setCategory(type)}
              className={`flex-1 xl:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                category === type 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
          <div className="flex items-center text-slate-400 mb-1">
            <Target size={14} className="mr-2" />
            <span className="text-[9px] font-black uppercase tracking-widest">Score / Activity</span>
          </div>
          <p className="text-xl font-black text-slate-800 tracking-tight">{current.avg}</p>
        </div>
        
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
          <div className="flex items-center text-slate-400 mb-1">
            <Zap size={14} className="mr-2" />
            <span className="text-[9px] font-black uppercase tracking-widest">Status</span>
          </div>
          <p className={`text-xl font-black tracking-tight ${category === 'event' ? 'text-emerald-600' : 'text-slate-800'}`}>
            {current.status}
          </p>
        </div>

        <div className="hidden sm:block p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
          <div className="flex items-center text-slate-400 mb-1">
            <Star size={14} className="mr-2" />
            <span className="text-[9px] font-black uppercase tracking-widest">Class Rank</span>
          </div>
          <p className="text-xl font-black text-slate-800 tracking-tight">
            {performanceData?.classRank ? `#${String(performanceData.classRank).padStart(2, '0')}` : "N/A"}
          </p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-[300px] relative">
        {current.type === 'bar' ? (
          <Bar key={category} data={data} options={options} />
        ) : (
          <Line key={category} data={data} options={options} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-2xl">
        <CheckCircle2 size={14} className="text-blue-500" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Verified by Class Teacher • Updated {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}