import React, { useMemo, useState, useEffect } from "react";
import { Users, AlertCircle, CheckCircle2, Bookmark, TrendingUp, CalendarDays, Eye } from "lucide-react";
import { motion } from "framer-motion";
import {
  DashGrid,
  Grid,
  Heading,
  Select,
  Option,
  EnhancedDashCard,
  GColumnChart,
  GLineChart,
  GDoughnutChart,
  DataTable,
  PanelModal
} from "../../../components/shared/Common_Components";
import api from "../../../services/api";


// ── TOOLTIP (matching Super Admin sidebar tooltip) ──
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

// ── ACTION TOOLTIP (for table action buttons) ──
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

// ── ANIMATION VARIANTS ──
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const DropoutTracking = () => {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Modal States
  const [selectedInactive, setSelectedInactive] = useState(null);
  const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
  const [selectedPassout, setSelectedPassout] = useState(null);
  const [isPassoutModalOpen, setIsPassoutModalOpen] = useState(false);

  const sessionsList = ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/reports/dropout-tracking", {
          params: { academicYear }
        });
        if (res.data?.success && res.data?.data) {
          setDashboardData(res.data.data);
        } else {
          setDashboardData(null);
        }
      } catch (err) {
        console.error("Failed to load dropout tracking data:", err?.response?.data || err.message);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear]);


  // ── KPI STATS ──
  const stats = useMemo(() => {
    return dashboardData?.stats || {
      activeStudents: 0,
      inactiveStudents: 0,
      passoutStudents: 0,
      retentionRate: 0,
    };
  }, [dashboardData]);

  // ── CHART DATA ──
  const monthlyTrend = useMemo(() => dashboardData?.monthlyTrend || [], [dashboardData]);
  const reasonData = useMemo(() => dashboardData?.reasonData || [], [dashboardData]);
  const classWiseDistribution = useMemo(() => dashboardData?.classWiseDistribution || [], [dashboardData]);
  const inactiveStudents = useMemo(() => dashboardData?.inactiveStudents || [], [dashboardData]);
  const passoutStudents = useMemo(() => dashboardData?.passoutStudents || [], [dashboardData]);

  // ── INACTIVE STUDENTS TABLE COLUMNS ──
  const inactiveColumns = useMemo(() => [
    { key: "name", label: "Student Name", render: (val) => <span className="font-bold text-gray-800">{val || "—"}</span> },
    { key: "className", label: "Class" },
    { key: "rollNo", label: "Roll No" },
    { key: "attendancePct", label: "Attendance", render: (val) => {
      const num = parseInt(val) || 0;
      return <span className={`font-bold ${num < 50 ? "text-rose-600" : num < 65 ? "text-amber-600" : "text-emerald-600"}`}>{val || "—"}</span>;
    }},
    { key: "reason", label: "Inactivity Reason" },
    { key: "status", label: "Status", render: (val) => {
      const s = val || "Unknown";
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          s === "Withdrawn" ? "bg-rose-100 text-rose-700" :
          s === "Suspended" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
        }`}>{s}</span>
      );
    }},
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedInactive(row); setIsInactiveModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ], []);

  // ── PASSOUT STUDENTS TABLE COLUMNS ──
  const passoutColumns = useMemo(() => [
    { key: "name", label: "Student Name", render: (val) => <span className="font-bold text-gray-800">{val || "—"}</span> },
    { key: "batch", label: "Graduation Batch" },
    { key: "lastClass", label: "Last Class" },
    { key: "finalScore", label: "Final Score", render: (val) => <span className="font-bold text-[#223F74]">{val || "—"}</span> },
    { key: "destination", label: "Higher Education / Destination" },
    { key: "status", label: "Status", render: (val) => (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{val || "Graduated"}</span>
    )},
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedPassout(row); setIsPassoutModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ], []);

  // ── TABLE FILTERS ──
  const inactiveFilters = useMemo(() => [
    {
      title: "Status", type: "toggle", key: "status",
      options: ["All", "Medical Leave", "Suspended", "Withdrawn"],
      fn: (row, selected) => {
        if (selected.includes("All") || selected.length === 0) return true;
        return selected.includes(row.status);
      }
    },
    {
      title: "Reason", type: "toggle", key: "reason",
      options: ["All Reasons", "Extended Sick Leave", "Migration / Relocation", "Suspension / Discipline", "Fees Defaulting", "Unexcused Absences"],
      fn: (row, selected) => {
        if (selected.includes("All Reasons") || selected.length === 0) return true;
        return selected.includes(row.reason);
      }
    }
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="custom-dashboard-styles w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── CSS TWEAKS (matching Super Admin) ── */}
      <style>{`
        .custom-dashboard-styles input[placeholder="Search…"] {
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .custom-dashboard-styles input[placeholder="Search…"]:focus {
          border-color: #223F74 !important;
          box-shadow: 0 0 0 2px rgba(34, 63, 116, 0.2) !important;
        }

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
                  <Tooltip label="Monitor inactive students and track graduated alumni records">
                    <span className="flex items-center cursor-help px-1 -mx-1">
                      <Users size={20} className="text-[#0ea5e9] hover:opacity-80 transition-opacity" />
                    </span>
                  </Tooltip>
                  <span>Inactive & Passout</span>
                </span>
              }
              secondaryText="Student Tracking"
              size={12}
              fontSize="2xl"
            />
          </Grid>
        </motion.div>

        {/* SECTION 1: KPI CARDS */}
        <motion.div variants={itemVariants}>
          <DashGrid cols={12} gap={3}>
            <EnhancedDashCard
              title="Active Enrollment"
              value={stats.activeStudents.toLocaleString()}
              icon={<Users size={22} />}
              size={3}
              accentColor="#0ea5e9"
            />
            <EnhancedDashCard
              title="Inactive Registry"
              value={stats.inactiveStudents}
              icon={<AlertCircle size={22} />}
              size={3}
              accentColor="#f59e0b"
            />
            <EnhancedDashCard
              title="Graduated (Passout)"
              value={stats.passoutStudents}
              icon={<CheckCircle2 size={22} />}
              size={3}
              accentColor="#22c55e"
            />
            <EnhancedDashCard
              title="Institutional Retention"
              value={`${stats.retentionRate}%`}
              icon={<Bookmark size={22} />}
              size={3}
              accentColor="#8b5cf6"
            />
          </DashGrid>
        </motion.div>

        {/* FILTERS ROW */}
        <motion.div variants={itemVariants} className="flex flex-wrap justify-end gap-3 w-full relative z-30">
          <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
              <CalendarDays size={18} />
            </div>
            <div className="flex-1">
              <Select
                id="academicYear"
                value={academicYear}
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
          <div className="premium-select-wrapper relative flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-56 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="pl-3 text-[#223F74] group-hover:text-[#F59B87] transition-colors">
              <Users size={18} />
            </div>
            <div className="flex-1">
              <Select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size={12}
                searchable={false}
              >
                <Option value="All" label="All Statuses" />
                <Option value="Inactive" label="Inactive Only" />
                <Option value="Passout" label="Passout Only" />
              </Select>
            </div>
          </div>
        </motion.div>

        {/* SECTION 2: CHARTS */}
        <motion.div variants={itemVariants}>
          <DashGrid cols={12} gap={4}>
            <GLineChart
              title="Monthly Status Transitions"
              subtitle="Trajectory of student inactivations and graduations"
              data={monthlyTrend}
              lines={[
                { key: "inactive", label: "Inactivations", color: "#F59E0B" },
                { key: "passouts", label: "Graduated", color: "#10B981" },
              ]}
              size={4}
            />
            <GColumnChart
              title="Class-wise Distribution"
              subtitle="Inactive vs Passout counts across class segments"
              data={classWiseDistribution}
              bars={[
                { key: "inactive", label: "Inactive", color: "#F59E0B" },
                { key: "passouts", label: "Passout", color: "#10B981" },
              ]}
              size={4}
            />
            <GDoughnutChart
              title="Primary Inactivity Reasons"
              subtitle="Drivers for inactive enrollment classifications"
              data={reasonData}
              colors={["#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#10B981"]}
              size={4}
            />
          </DashGrid>
        </motion.div>

        {/* SECTION 3: INACTIVE STUDENTS TABLE */}
        {(statusFilter === "All" || statusFilter === "Inactive") && (
          <motion.div variants={itemVariants} className="dash-table-section large-table relative z-10">
            <DataTable
              title="Inactive Students Registry"
              columns={inactiveColumns}
              rows={inactiveStudents}
              size={12}
              pageSize={5}
              searchable={true}
              exportable={true}
              filters={inactiveFilters}
            />
          </motion.div>
        )}

        {/* SECTION 4: PASSOUT / ALUMNI TABLE */}
        {(statusFilter === "All" || statusFilter === "Passout") && (
          <motion.div variants={itemVariants} className="dash-table-section large-table relative z-10">
            <DataTable
              title="Alumni & Passout Registry"
              columns={passoutColumns}
              rows={passoutStudents}
              size={12}
              pageSize={5}
              searchable={true}
              exportable={true}
            />
          </motion.div>
        )}

      </motion.div>

      {/* ── INACTIVE STUDENT DETAIL MODAL ── */}
      <PanelModal
        id="inactive-modal"
        title="Inactive Student Record"
        size="md"
        isVisible={isInactiveModalOpen}
        onClose={() => setIsInactiveModalOpen(false)}
      >
        {selectedInactive && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Student Name</p>
                  <p className="font-bold text-slate-900">{selectedInactive.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Father's Name</p>
                  <p className="font-bold text-slate-900">{selectedInactive.fatherName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Class & Section</p>
                  <p className="font-bold text-slate-900">{selectedInactive.className}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Roll Number</p>
                  <p className="font-bold text-slate-900">{selectedInactive.rollNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Parent Contact</p>
                  <p className="font-bold text-slate-900">{selectedInactive.parentContact}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Address</p>
                  <p className="font-bold text-slate-900">{selectedInactive.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Inactivity & Status Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Current Status</p>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                    selectedInactive.status === "Withdrawn" ? "bg-rose-100 text-rose-700" :
                    selectedInactive.status === "Suspended" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}>{selectedInactive.status}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Attendance %</p>
                  <p className="font-bold text-slate-900">{selectedInactive.attendancePct}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Primary Reason</p>
                  <p className="font-bold text-slate-900">{selectedInactive.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Last Attendance Date</p>
                  <p className="font-bold text-slate-900">{selectedInactive.lastPresent}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Action & Remarks</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedInactive.actionTaken}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── PASSOUT STUDENT DETAIL MODAL ── */}
      <PanelModal
        id="passout-modal"
        title="Graduated Alumni Record"
        size="md"
        isVisible={isPassoutModalOpen}
        onClose={() => setIsPassoutModalOpen(false)}
      >
        {selectedPassout && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Alumni Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Student Name</p>
                  <p className="font-bold text-slate-900">{selectedPassout.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Father's Name</p>
                  <p className="font-bold text-slate-900">{selectedPassout.fatherName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Graduation Batch</p>
                  <p className="font-bold text-slate-900">{selectedPassout.batch}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Last Attended Class</p>
                  <p className="font-bold text-slate-900">{selectedPassout.lastClass}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Parent Contact</p>
                  <p className="font-bold text-slate-900">{selectedPassout.parentContact}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Address</p>
                  <p className="font-bold text-slate-900">{selectedPassout.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Academic Record</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Final Score / GPA</p>
                  <p className="font-bold text-[#223F74] text-lg">{selectedPassout.finalScore}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Current Status</p>
                  <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{selectedPassout.status}</span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium">Higher Education / Destination</p>
                  <p className="font-bold text-slate-900">{selectedPassout.destination}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default DropoutTracking;