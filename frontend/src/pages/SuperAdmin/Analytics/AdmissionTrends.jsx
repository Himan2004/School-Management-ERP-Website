import React, { useMemo, useState, useEffect } from "react";
import { UserPlus, AlertCircle, CheckCircle, TrendingUp, Users, CalendarDays, Filter } from "lucide-react";
import { motion } from "framer-motion";
import {
  DashGrid,
  Grid,
  Heading,
  Select,
  Option,
  EnhancedDashCard,
  GColumnChart,
  GBarChart,
  DataTable
} from "../../../components/shared/Common_Components";
import * as api from "../../../services/AdminssionTrendsApi";

// ── EXACT SIDEBAR TOOLTIP MATCH ──
const Tooltip = ({ label, children }) => {
  return (
    <div className="relative group/tip inline-flex justify-center items-center">
      {children}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]
                      opacity-0 translate-x-1
                      group-hover/tip:opacity-100 group-hover/tip:translate-x-0
                      transition-[opacity,transform] duration-150 whitespace-nowrap"
      >
        <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
          {label}
        </div>
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a2e3f]" />
      </div>
    </div>
  );
};

// ── ANIMATION VARIANTS ──
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

// ── DYNAMIC BACKEND DRIVEN COMPONENT ──
const AdmissionTrends = () => {
  const [academicYear, setAcademicYear] = useState("");
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [classBranchSelection, setClassBranchSelection] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.getAdmissionDashboardData(academicYear);
        if (res?.success) {
          const { activeSession, availableSessions: sessions } = res.data;
          setDashboardData(res.data);
          setAvailableSessions(sessions || []);
          if (!academicYear && activeSession) {
            setAcademicYear(activeSession);
          }
        }
      } catch (err) {
        console.error("Connectivity Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear]);

  // Fallback list of academic sessions
  const sessionsList = useMemo(() => {
    return availableSessions.length > 0 ? availableSessions : ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];
  }, [availableSessions]);

  // Dynamic branch list derived from backend performance records
  const uniqueBranches = useMemo(() => {
    if (!dashboardData?.branchPerformance) return [];
    return Array.from(new Set(dashboardData.branchPerformance.map(b => b.branch))).filter(Boolean);
  }, [dashboardData]);

  // 1. KPI Cards Summary
  const stats = useMemo(() => {
    return dashboardData?.stats || {
      totalAdmissions: 0,
      growth: 0,
      conversionRate: 0,
      lowBranches: 0
    };
  }, [dashboardData]);

  // 2. Monthly Admission Trends Chart Dataset
  const admissionTrend = useMemo(() => {
    const rawTrend = dashboardData?.admissionTrend || [];
    const monthsShort = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const base = rawTrend.length > 0 
      ? rawTrend 
      : monthsShort.map(m => ({ name: m, new: 0, cancelled: 0, transfer: 0 }));
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [dashboardData]);

  // 3. Branch Comparison Chart Dataset
  const branchComparison = useMemo(() => {
    const rawComp = dashboardData?.branchComparison || [];
    const base = rawComp.length > 0
      ? rawComp
      : [{ name: "No Branches Configured", enquiries: 0, target: 0, actual: 0 }];
    return base.map(row => ({ ...row, __placeholder__: 0.001 }));
  }, [dashboardData]);

  // 4. Enquiry Funnel Pipeline
  const funnelDataToDisplay = useMemo(() => {
    const funnelObj = dashboardData?.funnel || {};
    const selectedFunnel = funnelObj[branchFilter] || funnelObj["All Branches"] || {
      enquiries: 0,
      visits: 0,
      forms: 0,
      verified: 0,
      admissions: 0
    };

    const enq = selectedFunnel.enquiries || 0;
    const vis = selectedFunnel.visits || 0;
    const form = selectedFunnel.forms || 0;
    const doc = selectedFunnel.verified || 0;
    const adm = selectedFunnel.admissions || 0;

    return [
      { label: "Enquiry Received", count: enq, width: 100 },
      { 
        label: "Visit Scheduled", 
        count: vis, 
        width: enq > 0 ? Math.round((vis / enq) * 100) : 0, 
        dropoff: Math.max(0, enq - vis), 
        convRate: enq > 0 ? Math.round((vis / enq) * 100) : 0 
      },
      { 
        label: "Form Submitted", 
        count: form, 
        width: enq > 0 ? Math.round((form / enq) * 100) : 0, 
        dropoff: Math.max(0, vis - form), 
        convRate: vis > 0 ? Math.round((form / vis) * 100) : 0 
      },
      { 
        label: "Documents Verified", 
        count: doc, 
        width: enq > 0 ? Math.round((doc / enq) * 100) : 0, 
        dropoff: Math.max(0, form - doc), 
        convRate: form > 0 ? Math.round((doc / form) * 100) : 0 
      },
      { 
        label: "Admission Confirmed", 
        count: adm, 
        width: enq > 0 ? Math.round((adm / enq) * 100) : 0, 
        dropoff: Math.max(0, doc - adm), 
        convRate: doc > 0 ? Math.round((adm / doc) * 100) : 0 
      },
    ];
  }, [dashboardData, branchFilter]);

  // 5. Branch Performance Table Dataset
  const branchPerformance = useMemo(() => {
    return dashboardData?.branchPerformance || [];
  }, [dashboardData]);

  // 6. Class-wise Admission Strength Table Dataset
  const rawClassStrength = useMemo(() => {
    return dashboardData?.classStrength || [];
  }, [dashboardData]);

  const classStrengthData = useMemo(() => {
    const branchesToInclude = classBranchSelection.length > 0 && !classBranchSelection.includes("All Branches")
      ? classBranchSelection
      : uniqueBranches;
    
    const filteredRaw = rawClassStrength.filter(r => branchesToInclude.includes(r.branch));
    const classesList = Array.from(new Set(rawClassStrength.map(r => r.class)));
    const aggregated = [];
    
    const extractClassNum = (str) => {
      const m = str.match(/\d+/);
      return m ? parseInt(m[0]) : 999;
    };
    
    const sortedClasses = classesList.sort((a, b) => extractClassNum(a) - extractClassNum(b));
    
    sortedClasses.forEach((clsName) => {
      const rowsForClass = filteredRaw.filter(r => r.class === clsName);
      if (rowsForClass.length === 0) {
        const originalRow = rawClassStrength.find(r => r.class === clsName);
        const group = originalRow?.group || (clsName.includes("Class 11") || clsName.includes("Class 12") ? "Higher Secondary (11–12)" : clsName.includes("Class 9") || clsName.includes("Class 10") ? "Secondary (9–10)" : clsName.includes("Class 6") || clsName.includes("Class 7") || clsName.includes("Class 8") ? "Middle (6–8)" : "Primary (1–5)");
        
        aggregated.push({
          class: clsName,
          group,
          seats: 0,
          filled: 0,
          vacant: 0,
          occupancy: 0,
          growth: 0
        });
      } else {
        const seats = rowsForClass.reduce((sum, r) => sum + r.seats, 0);
        const filled = rowsForClass.reduce((sum, r) => sum + r.filled, 0);
        const vacant = seats - filled;
        const occupancy = seats > 0 ? Math.round((filled / seats) * 100) : 0;
        const growth = (rowsForClass.reduce((sum, r) => sum + parseFloat(r.growth || 0), 0) / rowsForClass.length).toFixed(1);
        
        aggregated.push({
          class: clsName,
          group: rowsForClass[0].group,
          seats,
          filled,
          vacant,
          occupancy,
          growth: parseFloat(growth)
        });
      }
    });

    return aggregated;
  }, [rawClassStrength, classBranchSelection, uniqueBranches]);

  // 7. Student Dropout & TC Analysis Table Dataset
  const dropoutTable = useMemo(() => {
    return dashboardData?.dropoutTable || [];
  }, [dashboardData]);

  // ── TABLE COLUMNS ──
  const branchPerformanceCols = [
    { key: "branch", label: "Branch" },
    { key: "new", label: "New Admissions" },
    { key: "cancelled", label: "Cancellations" },
    { key: "transfer", label: "Transfers" },
    { key: "net", label: "Net Growth" },
    { key: "conversion", label: "Conversion Rate %", render: (val) => `${val}%` }
  ];

  const classStrengthCols = [
    { key: "class", label: "Class" },
    { key: "seats", label: "Total Seats" },
    { key: "filled", label: "Filled" },
    { key: "vacant", label: "Vacant" },
    { key: "occupancy", label: "Occupancy %", render: (val) => `${val}%` },
    { key: "growth", label: "Admission Growth %", render: (val) => `${val > 0 ? "+" : ""}${val}%` }
  ];

  const dropoutCols = [
    { key: "branch", label: "Branch" },
    { key: "tc", label: "TC Count" },
    { key: "dropouts", label: "Dropout Count" },
    { key: "dropoutPct", label: "Dropout %", render: (val) => `${val}%` },
    { 
      key: "severity", 
      label: "Severity Level",
      render: (val) => {
        let colors = "bg-slate-100 text-slate-600";
        if (val === "High Risk") colors = "bg-rose-100 text-rose-700";
        else if (val === "Medium Risk") colors = "bg-amber-100 text-amber-700";
        else if (val === "Low Risk") colors = "bg-emerald-100 text-emerald-700";
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors}`}>
            {val}
          </span>
        );
      }
    },
    { key: "reason", label: "Primary Reason" }
  ];

  // ── DYNAMIC TABLE FILTERS ──
  const tableFilters = useMemo(() => [
    { 
      title: "Branch", type: "toggle", key: "branch", 
      options: uniqueBranches,
      fn: (row, selected) => {
        if (selected.length === 0) return true;
        return selected.includes(row.branch);
      }
    }
  ], [uniqueBranches]);

  const classStrengthFilters = useMemo(() => [
    { 
      title: "Branch", type: "toggle", key: "branch", 
      options: ["All Branches", ...uniqueBranches],
      fn: () => true
    },
    { 
      title: "Class Group", type: "toggle", key: "group", 
      options: ["All Classes", "Primary (1–5)", "Middle (6–8)", "Secondary (9–10)", "Higher Secondary (11–12)"],
      fn: (row, selected) => {
        if (selected.includes("All Classes")) return true;
        return selected.includes(row.group);
      }
    }
  ], [uniqueBranches]);

  const dropoutFilters = useMemo(() => [
    { 
      title: "Branch", type: "toggle", key: "branch", 
      options: ["All Branches", ...uniqueBranches],
      fn: (row, selected) => {
        if (selected.includes("All Branches")) return true;
        return selected.includes(row.branch);
      }
    },
    { 
      title: "Primary Reason", type: "toggle", key: "reason", 
      options: ["All Reasons", "Fee Issues", "Relocation", "Academic Pressure", "Transport Issues", "Personal Reasons"],
      fn: (row, selected) => {
        if (selected.includes("All Reasons")) return true;
        return selected.includes(row.reason);
      }
    },
    { 
      title: "Severity Level", type: "toggle", key: "severity", 
      options: ["All", "High Risk", "Medium Risk", "Low Risk"],
      fn: (row, selected) => {
        if (selected.includes("All")) return true;
        return selected.includes(row.severity);
      }
    }
  ], [uniqueBranches]);

  return (
    <div className="custom-dashboard-styles w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── CSS TWEAKS ── */}
      <style>{`
        .custom-dashboard-styles input[placeholder="Search…"] {
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .custom-dashboard-styles input[placeholder="Search…"]:focus {
          border-color: #223F74 !important;
          box-shadow: 0 0 0 2px rgba(34, 63, 116, 0.2) !important;
        }
        
        div[class*="z-[9999]"] button > span.w-4.h-4.border-\\[\\#E2E8F0\\] {
          border-color: #94a3b8 !important;
        }

        /* Hide the native border of Select inside our premium wrapper */
        .premium-select-wrapper select {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding-left: 0.5rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
        }
        .premium-select-wrapper select:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .premium-select-wrapper button {
          background-color: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
        }
        .premium-select-wrapper button span {
          color: #1e293b !important;
          font-weight: 700 !important;
        }
        .premium-select-wrapper button svg {
          color: #94a3b8 !important;
        }

        /* Branch Performance Table Col Widths */
        .branch-performance-table table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        .branch-performance-table th:nth-child(1), .branch-performance-table td:nth-child(1) { width: 20%; }
        .branch-performance-table th:nth-child(2), .branch-performance-table td:nth-child(2) { width: 16%; }
        .branch-performance-table th:nth-child(3), .branch-performance-table td:nth-child(3) { width: 16%; }
        .branch-performance-table th:nth-child(4), .branch-performance-table td:nth-child(4) { width: 16%; }
        .branch-performance-table th:nth-child(5), .branch-performance-table td:nth-child(5) { width: 16%; }
        .branch-performance-table th:nth-child(6), .branch-performance-table td:nth-child(6) { width: 16%; }

        .dash-table-section {
          width: 100%;
          max-width: 100%;
        }
        .dash-table-section .overflow-x-auto {
          margin-left: 0 !important;
          margin-right: 0 !important;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          width: 100%;
          overflow-x: auto !important;
        }
        .dash-table-section .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
          display: block !important;
        }
        .dash-table-section .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 0 0 12px 12px;
        }
        .dash-table-section .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dash-table-section .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .dash-table-section table {
          width: 100% !important;
          table-layout: auto !important;
        }
        .dash-table-section.large-table table {
          min-width: 800px;
        }
        .dash-table-section th, 
        .dash-table-section td {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          text-align: left !important;
        }
      `}</style>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

        {/* Page Heading */}
        <motion.div variants={itemVariants}>
          <Grid cols={12} gap={4}>
            <Heading
              primaryText={
                <span className="inline-flex items-center gap-2">
                  <Tooltip label="HQ Dashboard for admission growth, funnel analysis, and branch-wise performance">
                    <span className="flex items-center cursor-help px-1 -mx-1">
                      <UserPlus size={20} className="text-[#0ea5e9] hover:opacity-80 transition-opacity" />
                    </span>
                  </Tooltip>
                  <span>Admission</span>
                </span>
              }
              secondaryText="Trends"
              size={12}
              fontSize="2xl"
            />
          </Grid>
        </motion.div>

        {/* SECTION 1: KPI CARDS */}
        <motion.div variants={itemVariants}>
          <DashGrid cols={12} gap={3}>
            <EnhancedDashCard
              title="Total Admissions (Year)"
              value={stats.totalAdmissions}
              icon={<Users size={22} />}
              size={3}
              accentColor="#0ea5e9"
            />
            <EnhancedDashCard
              title="Admission Growth %"
              value={`${stats.growth > 0 ? "+" : ""}${stats.growth}%`}
              icon={<TrendingUp size={22} />}
              size={3}
              accentColor={stats.growth > 0 ? "#22c55e" : "#ef4444"}
            />
            <EnhancedDashCard
              title="Conversion Rate %"
              value={`${stats.conversionRate}%`}
              icon={<CheckCircle size={22} />}
              size={3}
              accentColor="#8b5cf6"
            />
            <EnhancedDashCard
              title="Low Admission Branches"
              value={stats.lowBranches}
              icon={<AlertCircle size={22} />}
              size={3}
              accentColor={stats.lowBranches > 0 ? "#ef4444" : "#22c55e"}
            />
          </DashGrid>
        </motion.div>

        {/* TOP ACADEMIC YEAR FILTER - MOVED BELOW KPI CARDS */}
        <motion.div variants={itemVariants} className="flex justify-end w-full relative z-30">
          <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
              <CalendarDays size={18} />
            </div>
            <div className="flex-1">
              <Select
                id="academicYear"
                value={academicYear || ""}
                onChange={(e) => setAcademicYear(e.target.value)}
                size={12}
                searchable={false}
              >
                {sessionsList.map(s => (
                  <Option key={s} value={s} label={s} />
                ))}
              </Select>
            </div>
          </div>
        </motion.div>

        {/* SECTION 2 & 3: ADMISSION TREND ANALYSIS & BRANCH COMPARISON */}
        <motion.div variants={itemVariants}>
          <DashGrid cols={12} gap={4}>
            <GColumnChart
              title="Admission Trends"
              subtitle="Month Wise Analysis"
              data={admissionTrend}
              bars={[
                { key: "new", label: "New Admissions", color: "#2563eb" },
                { key: "cancelled", label: "Cancellations", color: "#ef4444" },
                { key: "transfer", label: "Transfers", color: "#f59e0b" },
              ]}
              size={6}
            />
            <GBarChart
              title="Branch-wise Admissions"
              subtitle="Enquiries vs Targets vs Actual"
              data={branchComparison}
              bars={[
                { key: "enquiries", label: "Total Enquiries", color: "#94a3b8" },
                { key: "target", label: "Target Admissions", color: "#0ea5e9" },
                { key: "actual", label: "Actual Admissions", color: "#8b5cf6" },
              ]}
              size={6}
            />
          </DashGrid>
        </motion.div>

        {/* SECTION 6 (MOVED UP): ADMISSION ENQUIRY FUNNEL */}
        <motion.div variants={itemVariants}>
          <DashGrid cols={12} gap={4}>
            <div className="col-span-12 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Admission Enquiry Funnel</h3>
                  <p className="text-sm text-slate-400">Pipeline health and conversion drop-offs</p>
                </div>
                <div className="premium-select-wrapper relative flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner w-full sm:w-56 group transition-colors hover:bg-white hover:border-slate-300">
                  <div className="pl-3 text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Filter size={16} />
                  </div>
                  <div className="flex-1">
                    <Select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      size={12}
                      searchable={false}
                    >
                      <Option value="All Branches" label="All Branches" />
                      {uniqueBranches.map(b => (
                        <Option key={b} value={b} label={b} />
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 max-w-3xl mx-auto mt-8">
                {funnelDataToDisplay.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Arrow connecting stages showing dropoff */}
                    {idx > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
                        <div className="text-[10px] sm:text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10 border border-rose-200 -mt-1 flex items-center gap-1.5 tracking-tight">
                          <TrendingUp size={12} className="rotate-180" /> 
                          {step.dropoff} lost ({step.convRate}% converted)
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between mb-1.5 px-2 items-end">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {step.label}
                      </p>
                      <p className="text-sm font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {step.count.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <div
                        className="h-10 rounded-xl bg-gradient-to-r from-[#223F74] to-[#4A6491] flex items-center justify-center text-white font-bold text-xs shadow-md transition-all duration-1000 min-w-[10%]"
                        style={{ width: `${step.width}%` }}
                      >
                        {step.width}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashGrid>
        </motion.div>

        {/* SECTION 4: BRANCH ADMISSION PERFORMANCE TABLE */}
        <motion.div variants={itemVariants} className="branch-performance-table dash-table-section large-table relative z-10">
          <DataTable
            title="Branch Admission Performance"
            columns={branchPerformanceCols}
            rows={branchPerformance}
            size={12}
            pageSize={5}
            searchable={true}
            exportable={true}
            filters={tableFilters}
          />
        </motion.div>

        {/* SECTION 5: CLASS-WISE ADMISSION STRENGTH */}
        <motion.div variants={itemVariants} className="dash-table-section large-table relative z-10">
          <DataTable
            title="Class-wise Admission Strength"
            columns={classStrengthCols}
            rows={classStrengthData}
            size={12}
            pageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
            searchable={true}
            exportable={true}
            filters={classStrengthFilters}
            onApplyFilters={(f) => {
              setClassBranchSelection(f.branch || []);
            }}
          />
        </motion.div>

        {/* SECTION 7: STUDENT DROPOUT & TC ANALYSIS */}
        <motion.div variants={itemVariants} className="dash-table-section large-table relative z-10">
          <DataTable
            title="Student Dropout & TC Analysis"
            columns={dropoutCols}
            rows={dropoutTable}
            size={12}
            pageSize={5}
            searchable={true}
            exportable={true}
            filters={dropoutFilters}
          />
        </motion.div>

      </motion.div>
    </div>
  );
};

export default AdmissionTrends;
