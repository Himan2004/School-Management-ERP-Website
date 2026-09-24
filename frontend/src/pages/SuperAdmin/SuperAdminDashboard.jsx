import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  School,
  Ticket,
  Plus,
  ClipboardList,
  BarChart3,
  Target,
  FileText,
} from "lucide-react";
import { FaRupeeSign } from "react-icons/fa";
import {
  getDashboardAnalytics,
  clearError,
} from "../../features/superAdmin/superAdminSlice";

// ── Shared Component Imports ───────────────────────────────────────────────
import {
  DashGrid,
  DashCard,
  GColumnChart,
  GAreaChart,
  DataTable,
  Button,
  Heading,
} from "../../components/shared/Common_Components";

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { dashboard, loading, error } = useSelector(
    (state) => state.superAdmin,
  );
  const { authUser } = useSelector(
    (state) => state.superAuth,
  );
  const loggedInAdminName = authUser?.superAdmin?.name || "Super Admin";

  useEffect(() => {
    dispatch(getDashboardAnalytics());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // ── Data Formatting ──────────────────────────────────────────────────────
  const kpiData = {
    totalSchools: dashboard?.kpi?.totalSchools || 0,
    monthlyRevenue: dashboard?.kpi?.monthlyRevenue || 0,
    totalTickets: dashboard?.kpi?.totalTickets || 0,
  };

  const maxSchools = dashboard?.quotas?.maxSchools ?? 0;
  const remainingCapacity = Math.max(0, maxSchools - kpiData.totalSchools);

  const formattedSchoolGrowth = (dashboard?.schoolGrowthData || []).map(
    (d) => ({
      name: d.month,
      schools: d.schools,
    }),
  );

  const formattedRevenue = (dashboard?.revenueData || []).map((d) => ({
    name: d.month,
    revenue: d.revenue,
  }));

  const recentSchools =
    dashboard?.recentSchools?.map((school) => ({
      id: school?._id || Math.random().toString(),
      name: school?.name || "Unknown School",
      students: school?.students || 0,
      status: school?.status || "inactive",
      email: school?.email || "N/A",
    })) || [];

  // ── Loading & Error States ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-rose-100 max-w-md">
          <p className="text-rose-600 font-bold text-lg mb-2">
            Failed to load analytics
          </p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Main Dashboard Render ────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      {/* Page Header */}
      <Heading
        primaryText="Welcome Back, "
        secondaryText={`${loggedInAdminName} !`}
        size={12}
      />

      {/* 1. KPI Metric Cards */}
      <div className="mt-6 mb-8 flex flex-col xl:flex-row gap-6 w-full">
        <div className="flex-1 min-w-0 relative group">
          <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <DashCard
            title={`Total Schools (${remainingCapacity} Remaining)`}
            value={`${kpiData.totalSchools} / ${maxSchools}`}
            icon={<School size={22} />}
            accentColor="#f97316"
          />
        </div>
        <div className="flex-1 min-w-0 relative group">
          <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <DashCard
            title="Monthly Revenue"
            value={`₹${kpiData.monthlyRevenue.toLocaleString()}`}
            icon={<FaRupeeSign size={22} />}
            accentColor="#ec4899"
          />
        </div>
        <div className="flex-1 min-w-0 relative group">
          <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <DashCard
            title="Support Tickets"
            value={kpiData.totalTickets}
            icon={<Ticket size={22} />}
            accentColor="#eab308"
          />
        </div>
      </div>

      {/* 2. Quick Action Links */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <h2 className="text-2xl font-black text-[#223F74] mb-6 px-2 flex items-center gap-3 relative z-10">
          <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
          Quick Actions
        </h2>
        <div className="relative z-10">
          <DashGrid cols={12} gap={4}>
            <Button
              text="Add School"
              icon={<Plus size={18} />}
              variant="primary"
              onClick={() => navigate("/superadmin/add-school")}
              size={3}
            />
            <Button
              text="Subscriptions"
              icon={<ClipboardList size={18} />}
              variant="secondary"
              onClick={() => navigate("/superadmin/subscriptions")}
              size={3}
            />
            <Button
              text="Reports"
              icon={<BarChart3 size={18} />}
              variant="secondary"
              onClick={() => navigate("/superadmin/reports/export")}
              size={3}
            />
            <Button
              text="Academic Config"
              icon={<Target size={18} />}
              variant="secondary"
              onClick={() => navigate("/superadmin/academic/config")}
              size={3}
            />
          </DashGrid>
        </div>
      </div>

      {/* 3. Analytics Charts */}
      <div className="mb-8">
        <DashGrid cols={12} gap={6}>
          <GColumnChart
            title="School Growth Trend"
            subtitle="Monthly active network additions"
            data={formattedSchoolGrowth}
            bars={[{ key: "schools", label: "Schools", color: "#3b82f6" }]}
            size={6}
          />
          <GAreaChart
            title="Revenue Analytics"
            subtitle="Monthly recurring revenue trajectory"
            data={formattedRevenue}
            areas={[{ key: "revenue", label: "Revenue", color: "#22c55e" }]}
            size={6}
          />
        </DashGrid>
      </div>

      {/* 4. Filterable Data Table */}
      <div className="mb-8">
        <DataTable
          title="Recent Schools Registrations"
          columns={[
            { key: "name", label: "School Name" },
            { key: "students", label: "Students", align: "center" },
            { key: "status", label: "Status", align: "center" },
            { key: "email", label: "Email" },
          ]}
          rows={recentSchools}
          size={12}
          pageSize={5}
          searchable={true}
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
