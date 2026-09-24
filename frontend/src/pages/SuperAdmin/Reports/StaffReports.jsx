import React, { useEffect, useState } from "react";
import { Users, Loader2, Download, ArrowLeftRight, LogOut } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import {
  getStaffBranchOverviewApi,
  getStaffDepartmentWiseApi,
  getStaffTransfersExitsApi,
  getStaffAttendanceTrendApi,
} from "../../../services/api/reportsApi";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  GPieChart,
  GColumnChart,
  GAreaChart,
} from "../../../components/shared/Common_Components";

const COLORS = ["#223F74", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const StaffReports = () => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [branchOverview, setBranchOverview] = useState([]);
  const [departmentWise, setDepartmentWise] = useState([]);
  const [transfersExits, setTransfersExits] = useState({
    totalTransfers: 0,
    totalResignations: 0,
    recentTransfers: [],
    recentExits: [],
  });
  const [attendanceTrend, setAttendanceTrend] = useState([]);

  const loadReports = async (isManualLoad = false) => {
    try {
      if (isManualLoad) setGenerating(true);
      else setLoading(true);

      const [overviewRes, deptRes, transfersRes, trendRes] = await Promise.all([
        getStaffBranchOverviewApi(),
        getStaffDepartmentWiseApi(),
        getStaffTransfersExitsApi(),
        getStaffAttendanceTrendApi(),
      ]);

      setBranchOverview(overviewRes?.data || []);
      setDepartmentWise(deptRes?.data || []);
      if (transfersRes?.success && transfersRes?.data) {
        setTransfersExits(transfersRes.data);
      }
      setAttendanceTrend(trendRes?.data || []);

      if (isManualLoad) {
        toast.success("Reports refreshed successfully!");
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load staff reports");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // CSV Export Logic
  const handleExportCSV = () => {
    toast.loading("Generating CSV...", { id: "csv-toast" });

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    let csvContent = "";

    // 1. Branch wise Staff Overview
    csvContent += "--- Branch wise Staff Overview ---\n";
    csvContent += "Branch,Total Staff,Teaching Staff,Admin & Leadership,Support Staff,Present Today,Attendance Rate (%)\n";
    branchOverview.forEach((row) => {
      csvContent += `${escapeCSV(row.branch)},${row.totalStaff || 0},${row.teachingStaff || 0},${row.adminStaff || 0},${row.supportStaff || 0},${row.presentToday || 0},${row.attendanceRate || 0}%\n`;
    });
    csvContent += "\n\n";

    // 2. Department distribution
    csvContent += "--- Department Distribution ---\n";
    csvContent += "Department,Count\n";
    departmentWise.forEach((row) => {
      csvContent += `${escapeCSV(row.department)},${row.count || 0}\n`;
    });
    csvContent += "\n\n";

    // 3. Transfers and Exits
    csvContent += "--- Staff Metrics ---\n";
    csvContent += `Total Transfers,${transfersExits.totalTransfers || 0}\n`;
    csvContent += `Total Resignations,${transfersExits.totalResignations || 0}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Staff_Reports_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("CSV Downloaded!", { id: "csv-toast" });
  };

  // Aggregated Stats
  const totalStaff = branchOverview.reduce((sum, b) => sum + (b.totalStaff || 0), 0);
  const totalTeaching = branchOverview.reduce((sum, b) => sum + (b.teachingStaff || 0), 0);
  const totalAdmin = branchOverview.reduce((sum, b) => sum + (b.adminStaff || 0), 0);
  const totalSupport = branchOverview.reduce((sum, b) => sum + (b.supportStaff || 0), 0);

  // DataTable columns definition
  const columns = [
    { key: "branch", label: "Branch" },
    { key: "totalStaff", label: "Total Staff" },
    { key: "teachingStaff", label: "Teaching Staff" },
    { key: "adminStaff", label: "Admin & Leadership" },
    { key: "supportStaff", label: "Support Staff" },
    { key: "presentToday", label: "Present Today" },
    {
      key: "attendanceRate",
      label: "Attendance Rate",
      render: (_, row) => `${row.attendanceRate || 0}%`,
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans min-h-screen">
      <Heading
        primaryText="Staff"
        secondaryText="Reports"
        size={12}
        showAnimations={true}
      />

      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="font-bold text-slate-700 animate-pulse">Generating Report Data...</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
          <Loader2 className="animate-spin text-[#223F74]" size={24} />
          <span className="font-semibold text-sm">Loading staff reports data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Dashboard */}
          <div>
            <DashGrid cols={12} gap={4}>
              <EnhancedDashCard
                title="Total Active Staff"
                value={totalStaff}
                icon={<Users size={22} />}
                size={3}
                accentColor="#223f74"
                showAnimations={true}
              />
              <EnhancedDashCard
                title="Teaching Staff"
                value={totalTeaching}
                icon={<Users size={22} />}
                size={3}
                accentColor="#10b981"
                showAnimations={true}
              />
              <EnhancedDashCard
                title="Admin & Leadership"
                value={totalAdmin}
                icon={<Users size={22} />}
                size={3}
                accentColor="#f59e0b"
                showAnimations={true}
              />
              <EnhancedDashCard
                title="Support Staff"
                value={totalSupport}
                icon={<Users size={22} />}
                size={3}
                accentColor="#8b5cf6"
                showAnimations={true}
              />
            </DashGrid>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-2.5 px-4 transition-all flex items-center gap-1.5 text-sm shadow-sm"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Charts Grid */}
          <DashGrid cols={12} gap={4}>
            <GPieChart
              title="Department Distribution"
              data={departmentWise.map((d) => ({ name: d.department, value: d.count }))}
              colors={COLORS}
              size={4}
              height={260}
            />

            <GColumnChart
              title="Branch Staffing Levels"
              data={branchOverview.map((b) => ({ ...b, name: b.branch }))}
              bars={[{ key: "totalStaff", label: "Total Staff", color: "#223F74" }]}
              size={4}
              height={260}
            />

            <GAreaChart
              title="Staff Attendance Trend"
              subtitle="Last 7 Days"
              data={attendanceTrend.map((t) => ({ ...t, name: t.date }))}
              areas={[{ key: "attendanceRate", label: "Attendance Rate", color: "#10B981" }]}
              size={4}
              height={260}
            />
          </DashGrid>

          {/* Transfers & Exits Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exits */}
            <div
              className="rounded-[24px] p-5 flex flex-col gap-4"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E7E2DB",
                boxShadow: "0 6px 20px rgba(0,0,0,.06)",
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <LogOut size={18} className="text-rose-500" />
                  Recent Exits & Resignations
                </h3>
                <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  Total Exits: {transfersExits.totalResignations}
                </span>
              </div>
              <div className="divide-y divide-slate-50 min-h-[220px]">
                {transfersExits.recentExits.length > 0 ? (
                  transfersExits.recentExits.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-700">{item.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{item.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500">{item.branch}</p>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 capitalize">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">No recent resignations recorded</div>
                )}
              </div>
            </div>

            {/* Transfers */}
            <div
              className="rounded-[24px] p-5 flex flex-col gap-4"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E7E2DB",
                boxShadow: "0 6px 20px rgba(0,0,0,.06)",
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ArrowLeftRight size={18} className="text-blue-500" />
                  Recent Staff Transfers
                </h3>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  Total Transfers: {transfersExits.totalTransfers}
                </span>
              </div>
              <div className="divide-y divide-slate-50 min-h-[220px]">
                {transfersExits.recentTransfers.length > 0 ? (
                  transfersExits.recentTransfers.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-700">{item.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{item.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500">{item.branch}</p>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 capitalize">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">No recent transfers recorded</div>
                )}
              </div>
            </div>
          </div>

          {/* Branch Overview DataTable */}
          <div>
            <DataTable
              title="Branch Staffing Ledger"
              size={12}
              columns={columns}
              rows={branchOverview}
              searchable={true}
              exportable={true}
              exportFileName="branch_staffing_ledger"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReports;
