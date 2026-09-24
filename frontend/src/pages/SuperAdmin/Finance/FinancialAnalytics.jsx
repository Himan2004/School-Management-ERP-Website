import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Wallet, Clock, Target, DollarSign,
  Activity, Users, Building2, Landmark, AlertCircle
} from "lucide-react";
import {
  getFinanceAnalytics,
  getPendingDues,
} from "../../../services/api/financeApi";

import {
  DashGrid,
  EnhancedDashCard,
  Heading,
  GAreaChart,
  GDoughnutChart,
  GBarChart,
  GColumnChart,
  GPieChart,
  DataTable
} from "../../../components/shared/Common_Components";

const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN")}`;

const FinancialAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [pendingDues, setPendingDues] = useState([]);
  
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingDues, setLoadingDues] = useState(true);
  
  const [selectedSchool, setSelectedSchool] = useState("All Schools");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [chartRange, setChartRange] = useState("12");
  
  const [availableSchools, setAvailableSchools] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // Auto-reset class when school changes
  useEffect(() => { setSelectedClass("All Classes"); }, [selectedSchool]);

  useEffect(() => {
    let active = true;
    const params = { school: selectedSchool, class: selectedClass };

    const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const res = await getFinanceAnalytics(params);
        if (!active) return;
        
        const data = res.data?.data || null;
        setAnalytics(data);
        if (data?.filters) {
          setAvailableSchools(data.filters.schools || []);
          setAvailableClasses(data.filters.classes || []);
        }
      } catch (err) {
        // Handle error silently or show toast
      } finally {
        if (active) setLoadingAnalytics(false);
      }
    };

    const fetchDues = async () => {
      try {
        setLoadingDues(true);
        const res = await getPendingDues(params);
        if (!active) return;
        
        const duesData = res.data?.data?.students || res.data?.data || [];
        setPendingDues(Array.isArray(duesData) ? duesData : []);
      } catch (err) {
        // Handle error silently
      } finally {
        if (active) setLoadingDues(false);
      }
    };

    fetchAnalytics();
    fetchDues();

    return () => { active = false; };
  }, [selectedSchool, selectedClass]);

  // Derived Data
  const rawMonthlyData = analytics?.monthlyData || [];
  const rangeMap = { "1": 1, "3": 3, "6": 6, "12": 12 };
  const monthlyData = rawMonthlyData.slice(-rangeMap[chartRange] || -12);
  
  const feeBreakdown = analytics?.feeBreakdown && analytics.feeBreakdown.length > 0
    ? analytics.feeBreakdown
    : [];

  const expenseBreakdown = analytics?.expenseBreakdown && analytics.expenseBreakdown.length > 0
    ? analytics.expenseBreakdown
    : [];
  const expenseDataChart = expenseBreakdown.map(e => ({ name: e.name, value: e.amount || 0 }));

  const criticalDues = pendingDues
    .filter(d => d.daysOverdue > 0 || (d.status || '').toLowerCase().includes('overdue'))
    .sort((a, b) => (b.pendingAmount || 0) - (a.pendingAmount || 0))
    .map(d => ({
      name: d.name || d.studentId?.name || "Unknown",
      class: d.class || "N/A",
      schoolName: d.schoolName || "N/A",
      pendingAmount: d.pendingAmount || d.totalDue || 0,
      dueDate: d.dueDate || "-",
      daysOverdue: d.daysOverdue || 0,
      status: d.status || "Overdue"
    }));

  const branchData = analytics?.branchData || [];

  const paymentDistribution = analytics?.paymentDistribution || [];

  const recentActivity = analytics?.recentActivity || [];

  const totals = analytics?.totals || {};
  
  // Calculate collection efficiency
  const expectedRev = totals?.expectedRevenue || 0;
  const colThisMonth = totals?.totalRevenue || 0;
  const colEfficiency = expectedRev > 0 ? ((colThisMonth / expectedRev) * 100).toFixed(1) : "0.0";

  // Actionable Insights Sorting
  const sortedByRevenue = [...branchData].sort((a, b) => b.revenue - a.revenue);
  const highestRevenueBranch = sortedByRevenue[0]?.name || "-";

  const sortedByColRate = [...branchData].sort((a, b) => a.colRate - b.colRate);
  const lowestCollectionBranch = sortedByColRate[0]?.name || "-";

  const sortedExpenses = [...expenseBreakdown].sort((a, b) => b.amount - a.amount);
  const highestExpenseCat = sortedExpenses[0]?.name || "-";

  const collectionGrowthVal = analytics?.growth?.totalRevenue || 0;
  const collectionGrowth = `${collectionGrowthVal >= 0 ? '+' : ''}${Number(collectionGrowthVal).toFixed(1)}%`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen font-sans bg-[#F8FAFC] max-w-7xl mx-auto w-full max-w-[100vw] box-border overflow-x-hidden">
      
      <div className="mb-8">
        <Heading 
          primaryText="Finance Dashboard" 
          secondaryText="Command Center" 
          size={12} 
          showAnimations={true}
          action={
            <div className="flex flex-wrap gap-2 items-center bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
              <select 
                value={selectedSchool} 
                onChange={(e) => setSelectedSchool(e.target.value)} 
                className="bg-white text-[#223F74] font-bold text-sm outline-none cursor-pointer px-3 py-2 rounded-lg"
              >
                <option value="All Schools">All Schools</option>
                {availableSchools.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              {/* <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)} 
                className="bg-white text-[#223F74] font-bold text-sm outline-none cursor-pointer px-3 py-2 rounded-lg"
              >
                <option value="All Classes">All Classes</option>
                {availableClasses.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select> */}
              <select 
                value={chartRange} 
                onChange={(e) => setChartRange(e.target.value)} 
                className="bg-[#38bdf8] text-[#223F74] font-bold text-sm outline-none cursor-pointer px-3 py-2 rounded-lg"
              >
                <option value="1">30 Days</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Revenue" value={formatCurrency(totals?.totalRevenue)} icon={<DollarSign size={22} />} accentColor="#22c55e" size={3} showAnimations />
        <EnhancedDashCard title="Total Expenses" value={formatCurrency(totals?.totalExpense)} icon={<Wallet size={22} />} accentColor="#f43f5e" size={3} showAnimations />
        <EnhancedDashCard title="Net Profit" value={formatCurrency(totals?.netProfit)} icon={<TrendingUp size={22} />} accentColor="#3b82f6" size={3} showAnimations />
        <EnhancedDashCard title="Outstanding Dues" value={formatCurrency(totals?.outstandingDues)} icon={<Clock size={22} />} accentColor="#f59e0b" size={3} showAnimations />
        <EnhancedDashCard title="Collection Rate" value={`${colEfficiency}%`} icon={<Target size={22} />} accentColor="#8b5cf6" size={3} showAnimations />
        <EnhancedDashCard title="Expected Revenue" value={formatCurrency(expectedRev)} icon={<Building2 size={22} />} accentColor="#6366f1" size={3} showAnimations />
        <EnhancedDashCard title="Collected This Month" value={formatCurrency(colThisMonth)} icon={<Landmark size={22} />} accentColor="#14b8a6" size={3} showAnimations />
        <EnhancedDashCard title="Pending Collection" value={formatCurrency(expectedRev - colThisMonth)} icon={<AlertCircle size={22} />} accentColor="#ef4444" size={3} showAnimations />
      </DashGrid>

      {/* Main Analytics Charts */}
      <div className="mt-8">
        <DashGrid cols={12} gap={4}>
          <GAreaChart
            title="Revenue & Expense Trend"
            subtitle="Monthly financial overview"
            data={monthlyData}
            areas={[
              { key: 'income', label: 'Revenue', color: '#22c55e' },
              { key: 'expense', label: 'Expense', color: '#f43f5e' },
            ]}
            size={8}
            height={320}
          />
          <GDoughnutChart
            title="Revenue Breakdown"
            subtitle="By fee category"
            data={feeBreakdown}
            size={4}
            height={320}
          />
        </DashGrid>
      </div>

      <div className="mt-4">
        <DashGrid cols={12} gap={4}>
          <GBarChart
            title="Branch Performance"
            subtitle="Revenue vs Expenses per branch"
            data={branchData}
            bars={[
              { key: 'revenue', label: 'Revenue', color: '#3b82f6' },
              { key: 'expenses', label: 'Expenses', color: '#f43f5e' },
              { key: 'profit', label: 'Net Profit', color: '#22c55e' }
            ]}
            size={8}
            height={300}
            yAxisWidth={80}
          />
          <GPieChart
            title="Payment Distribution"
            subtitle="Methods of fee collection"
            data={paymentDistribution}
            colors={['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']}
            size={4}
            height={300}
          />
        </DashGrid>
      </div>

      <div className="mt-4">
        <DashGrid cols={12} gap={4}>
           <GColumnChart
            title="Collection Efficiency"
            subtitle="Billed vs Collected Amount"
            data={branchData}
            bars={[
              { key: 'revenue', label: 'Billed', color: '#6366f1' },
              { key: 'colRate', label: 'Collected %', color: '#22c55e' }
            ]}
            size={4}
            height={300}
          />
          <GDoughnutChart
            title="Expense Breakdown"
            subtitle="Operational expenditure"
            data={expenseDataChart}
            size={4}
            height={300}
            innerRadius={70}
          />
          
          {/* Actionable Insights Summary Card */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-black text-[#6B7280] uppercase tracking-widest">Actionable Insights</h3>
            <div className="space-y-3 mt-2 flex-1">
              <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#6B7280]">Highest Revenue Branch</span>
                <span className="text-sm font-black text-[#223F74]">{highestRevenueBranch}</span>
              </div>
              <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#6B7280]">Lowest Collection</span>
                <span className="text-sm font-black text-[#ef4444]">{lowestCollectionBranch}</span>
              </div>
              <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#6B7280]">Highest Expense Cat.</span>
                <span className="text-sm font-black text-[#f59e0b]">{highestExpenseCat}</span>
              </div>
              <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#6B7280]">Collection Growth</span>
                <span className="text-sm font-black text-[#22c55e]">{collectionGrowth}</span>
              </div>
            </div>
          </div>
        </DashGrid>
      </div>

      <div className="mt-8">
        <DashGrid cols={12} gap={4}>
          <div className="col-span-12 lg:col-span-8">
            <DataTable
              title="Critical Pending Dues"
              columns={[
                { key: 'name', label: 'Student Name' },
                { key: 'class', label: 'Class' },
                { key: 'schoolName', label: 'Branch' },
                { key: 'pendingAmount', label: 'Pending Amt' },
                { key: 'dueDate', label: 'Due Date' },
                { key: 'daysOverdue', label: 'Overdue' },
                { key: 'status', label: 'Status' }
              ]}
              rows={criticalDues}
              pageSize={5}
              size={12}
            />
          </div>
          
          {/* Recent Financial Activity (Timeline-like) */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-sm flex flex-col h-full">
            <h3 className="text-xs font-black text-[#6B7280] uppercase tracking-widest mb-6">Recent Activity</h3>
            <div className="flex flex-col gap-4 overflow-y-auto pr-2 max-h-[400px]">
              {recentActivity.map((act, i) => (
                <div key={i} className="flex gap-4 items-start relative">
                  {i !== recentActivity.length - 1 && <div className="absolute top-6 left-[15px] bottom-[-20px] w-0.5 bg-[#E2E8F0]" />}
                  <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center z-10 ${act.type.includes('Collected') || act.type.includes('Received') ? 'bg-emerald-100 text-emerald-600' : act.type.includes('Added') ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Activity size={14} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-bold text-[#223F74]">{act.type}</p>
                      <p className="text-[10px] font-bold text-[#6B7280]">{act.date}</p>
                    </div>
                    <p className="text-xs text-[#6B7280] mb-1">{act.desc}</p>
                    <p className="text-sm font-black text-[#223F74]">{act.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashGrid>
      </div>

    </div>
  );
};

export default FinancialAnalytics;