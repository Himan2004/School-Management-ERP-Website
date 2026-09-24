import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  TrendingUp,
  Award,
  Users,
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronDown
} from "lucide-react";
import {
  getAcademicYears
} from "../../../services/api/PrincipalSettingApi";
import {
  getClassPerformance
} from "../../../services/api/principalStudentApi";
import {
  DataTable,
  DashGrid,
  Grid,
  EnhancedDashCard,
  GColumnChart,
  Heading
} from "../../../components/shared/Common_Components";

const ClassComparison = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchYears = async () => {
    try {
      const schoolId = localStorage.getItem("schoolId") || "";
      const res = await getAcademicYears(schoolId);
      if (res.success && res.data?.academicYears) {
        setAcademicYears(res.data.academicYears);
        const activeYear = res.data.academicYears.find((y) => y.status === "Active");
        if (activeYear) {
          setAcademicYear(activeYear.name);
        } else if (res.data.academicYears.length > 0) {
          setAcademicYear(res.data.academicYears[0].name);
        }
      } else {
        setAcademicYears([{ name: "2024-25" }, { name: "2023-24" }]);
      }
    } catch (err) {
      console.error("Error fetching academic years:", err);
      setAcademicYears([{ name: "2024-25" }, { name: "2023-24" }]);
    }
  };

  const fetchPerformance = async (yearName) => {
    setLoading(true);
    setError("");
    try {
      const res = await getClassPerformance({ academicYear: yearName || academicYear });
      if (res.success && res.data) {
        setPerformanceData(res.data);
      } else {
        setPerformanceData([]);
      }
    } catch (err) {
      console.error("Error fetching class performance:", err);
      setError("Failed to fetch class performance data.");
      setPerformanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (academicYear) {
      fetchPerformance(academicYear);
    }
  }, [academicYear]);

  // Derived KPI values
  const statsSummary = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      return {
        totalClasses: 0,
        highestAvgClass: null,
        overallAvg: 0,
        bestPassClass: null,
        totalStudents: 0
      };
    }

    const totalClasses = performanceData.length;

    let highestAvgClass = performanceData[0];
    let bestPassClass = performanceData[0];
    let totalAvgSum = 0;
    let totalStudents = 0;

    performanceData.forEach((item) => {
      totalAvgSum += item.avgPercentage || 0;
      totalStudents += item.totalStudents || 0;
      if ((item.avgPercentage || 0) > (highestAvgClass.avgPercentage || 0)) {
        highestAvgClass = item;
      }
      if ((item.passRate || 0) > (bestPassClass.passRate || 0)) {
        bestPassClass = item;
      }
    });

    const overallAvg = (totalAvgSum / totalClasses).toFixed(2);

    return {
      totalClasses,
      highestAvgClass,
      overallAvg,
      bestPassClass,
      totalStudents,
    };
  }, [performanceData]);

  // Transform data for chart
  const chartData = useMemo(() => {
    return performanceData.map((item) => ({
      name: item.className || "N/A",
      avgPercentage: item.avgPercentage || 0,
      passRate: item.passRate || 0,
    }));
  }, [performanceData]);

  // Table Columns
  const columns = [
    { key: "className", label: "Class Name", width: "150px" },
    {
      key: "classTeacher",
      label: "Class Teacher",
      width: "150px",
      render: (val) => val || <span className="text-slate-400 italic">N/A</span>
    },
    { key: "totalStudents", label: "Total Students Evaluated", width: "180px", align: "center" },
    {
      key: "topStudent",
      label: "Top Student",
      width: "150px",
      render: (val) => val ? <span className="font-semibold text-emerald-700">{val}</span> : <span className="text-slate-400 italic">N/A</span>
    },
    {
      key: "avgPercentage",
      label: "Average Marks (%)",
      width: "180px",
      align: "center",
      render: (val) => <span className="font-bold text-slate-700">{val}%</span>
    },
    {
      key: "passRate",
      label: "Pass Rate (%)",
      width: "180px",
      align: "center",
      render: (val) => <span className="font-bold text-emerald-600">{val}%</span>
    },
    {
      key: "status",
      label: "Performance Status",
      width: "200px",
      align: "center",
      render: (val, row) => {
        let badgeColor = "bg-gray-100 text-gray-800";
        let statusText = "Average";

        const avg = row.avgPercentage || 0;
        if (avg >= 75) {
          badgeColor = "bg-emerald-100 text-emerald-800 border border-emerald-200";
          statusText = "Excellent";
        } else if (avg >= 60) {
          badgeColor = "bg-indigo-100 text-indigo-800 border border-indigo-200";
          statusText = "Good";
        } else if (avg < 50) {
          badgeColor = "bg-rose-100 text-rose-800 border border-rose-200";
          statusText = "Needs Improvement";
        } else {
          badgeColor = "bg-amber-100 text-amber-800 border border-amber-200";
          statusText = "Satisfactory";
        }

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${badgeColor}`}>
            {statusText}
          </span>
        );
      }
    }
  ];

  const stats = [
    {
      title: "Total Students Evaluated",
      value: String(statsSummary.totalStudents || 0),
      icon: <Users size={22} />,
      accentColor: "#f59e0b",
      size: 3,
    },
    {
      title: "Highest Class Average",
      value: statsSummary.highestAvgClass
        ? `${statsSummary.highestAvgClass.className} (${statsSummary.highestAvgClass.avgPercentage}%)`
        : "N/A",
      icon: <Award size={22} />,
      accentColor: "#10b981",
      size: 3,
    },
    {
      title: "Overall School Average",
      value: statsSummary.overallAvg ? `${statsSummary.overallAvg}%` : "N/A",
      icon: <TrendingUp size={22} />,
      accentColor: "#8b5cf6",
      size: 3,
    },
    {
      title: "Best Pass Rate Class",
      value: statsSummary.bestPassClass
        ? `${statsSummary.bestPassClass.className} (${statsSummary.bestPassClass.passRate}%)`
        : "N/A",
      icon: <BookOpen size={22} />,
      accentColor: "#dc2626",
      size: 3,
    },
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      <Heading
        primaryText="Class"
        secondaryText="Comparison"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <DashGrid cols={12} gap={4}>
          {stats.map((stat, idx) => (
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

      {/* Custom Filters: Calendar & Class Comparators */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row gap-6 items-end relative z-10">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all font-medium text-sm"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all font-medium text-sm"
            />
          </div>
        </div>
      </div>



      {/* Column Chart */}
      <div className="mt-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12">
            {chartData.length > 0 ? (
              <GColumnChart
                title="Class Performance Analysis"
                subtitle="Average Marks vs Pass Rate Comparison"
                data={chartData}
                bars={[
                  { key: "avgPercentage", label: "Average Marks (%)", color: "#8b5cf6" },
                  { key: "passRate", label: "Pass Rate (%)", color: "#10b981" }
                ]}
                size={12}
                height={350}
              />
            ) : (
              <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <BookOpen size={48} className="text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">No chart data available for this academic year</p>
                <p className="text-xs text-slate-400">Make sure marksheets are generated and published</p>
              </div>
            )}
          </div>
        </Grid>
      </div>

      {/* Data Table */}
      <div className="mt-6 pb-12">
        <DataTable
          columns={columns}
          rows={performanceData}
          size={12}
          pageSize={10}
          pageSizeOptions={[5, 10, 20]}
          searchable={true}
          bulkAction={false}
          exportable={true}
          exportFileName={`class-comparison-${academicYear}`}
          title="Class Comparison Data"
        />
      </div>
    </div>
  );
};

export default ClassComparison;
