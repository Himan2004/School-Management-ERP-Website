import React, { useState, useEffect, useRef } from 'react';
import { Download, Eye, DollarSign, Wallet, TrendingUp, Clock, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  DashGrid,
  EnhancedDashCard,
  Heading,
  GAreaChart,
  GDoughnutChart,
  GBarChart,
  GColumnChart,
  DataTable,
  Button,
  Modal,
  openModal,
  closeModal
} from "../../../components/shared/Common_Components";
import { getFinancialReports, getDueStudents } from "../../../services/api/PrincipalReportApi";

const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN")}`;

const monthMap = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

// --- Custom Dual-Export Dropdown (Sits inside the table header) ---
const ExportDropdown = ({ type, rows, fileName, dateStr }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const escapeCsv = (val) => {
    if (val == null) return '';
    const str = String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const handleExportCSV = () => {
    setIsOpen(false);
    try {
      let headers = [];
      let data = [];

      if (type === 'Collection_Report') {
        headers = ['Fee Category', 'Total Expected', 'Total Collected', 'Total Pending', 'Collection %'];
        data = rows.map(r => [r._raw.category, r._raw.expected, r._raw.collected, r._raw.pending, r._raw.pct + '%']);
      } else if (type === 'Expense_Summary') {
        headers = ['Category', 'Last Month', 'This Month', 'Change', 'Budget Allocated', 'Used %'];
        data = rows.map(r => [r._raw.category, r._raw.lastMonth, r._raw.thisMonth, r._raw.change, r._raw.allocated || 1, r._raw.budgetUsed + '%']);
      } else if (type === 'Due_Analysis') {
        headers = ['Class', 'Students w/ Dues', 'Total Due', '0-30 Days', '31-60 Days', '60+ Days'];
        data = rows.map(r => [r._raw.class, r._raw.withDues, r._raw.totalDue, r._raw.days0to30, r._raw.days31to60, r._raw.days60plus]);
      }

      const csvContent = [
        headers.map(escapeCsv).join(','),
        ...data.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`${type.replace(/_/g, ' ')} exported as CSV`);
    } catch (err) {
      console.error("CSV Export Error:", err);
      toast.error("Failed to generate CSV");
    }
  };

  const handleExportPDF = () => {
    setIsOpen(false);
    try {
      const doc = new jsPDF();

      // Document Header
      doc.setFontSize(18);
      doc.setTextColor(34, 63, 116);
      doc.text(`Financial Report - ${type.replace(/_/g, ' ')}`, 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${dateStr}`, 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

      let head = [];
      let body = [];

      if (type === "Collection_Report") {
        head = [['Fee Category', 'Total Expected', 'Total Collected', 'Total Pending', 'Collection %']];
        body = rows.map(row => [
          row._raw.category,
          formatCurrency(row._raw.expected),
          formatCurrency(row._raw.collected),
          formatCurrency(row._raw.pending),
          `${row._raw.pct}%`
        ]);
      }
      else if (type === "Expense_Summary") {
        head = [['Category', 'Last Month', 'This Month', 'Change', 'Budget Allocated', 'Used %']];
        body = rows.map(row => [
          row._raw.category,
          formatCurrency(row._raw.lastMonth),
          formatCurrency(row._raw.thisMonth),
          `${row._raw.change >= 0 ? '+' : ''}${formatCurrency(row._raw.change)}`,
          formatCurrency(row._raw.allocated || 1),
          `${row._raw.budgetUsed}%`
        ]);
      }
      else if (type === "Due_Analysis") {
        head = [['Class', 'Students w/ Dues', 'Total Due', '0-30 Days', '31-60 Days', '60+ Days']];
        body = rows.map(row => [
          row._raw.class,
          row._raw.withDues,
          formatCurrency(row._raw.totalDue),
          row._raw.days0to30,
          row._raw.days31to60,
          row._raw.days60plus
        ]);
      }

      doc.autoTable({
        startY: 45,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [34, 63, 116], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`${fileName}.pdf`);
      toast.success(`${type.replace(/_/g, ' ')} exported as PDF`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="absolute top-[18px] right-[100px] z-30" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 text-[#223F74] font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:ring-2 focus:ring-[#223F74]/20 h-[38px]"
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors border-b border-slate-100"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            Export as CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors"
          >
            <FileText size={16} className="text-rose-600" />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

const FinancialReports = () => {
  const [selectedDueClass, setSelectedDueClass] = useState(null);
  const [filterYear, setFilterYear] = useState("2024-25");
  const [filterMonth, setFilterMonth] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    totalPending: 0,
    netBalance: 0
  });

  const [activeTrendData, setActiveTrendData] = useState([]);
  const [revenueExpenseData, setRevenueExpenseData] = useState([]);
  const [feeCollectionData, setFeeCollectionData] = useState([]);
  const [classWiseCollection, setClassWiseCollection] = useState([]);
  const [collectionByCategory, setCollectionByCategory] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [dueAnalysis, setDueAnalysis] = useState([]);

  const [dueStudents, setDueStudents] = useState([]);
  const [dueStudentsLoading, setDueStudentsLoading] = useState(false);

  const { totalRevenue, totalExpense, totalPending, netBalance } = overview;
  const dateStr = filterMonth === 'All' ? filterYear : `${filterMonth} ${filterYear}`;

  // ================= TABLE DATA =================
  const collectionTableColumns = [
    { key: 'category', label: 'Fee Category' },
    { key: 'expectedDisplay', label: 'Total Expected', align: 'center' },
    { key: 'collectedDisplay', label: 'Total Collected', align: 'center' },
    { key: 'pendingDisplay', label: 'Total Pending', align: 'center' },
    { key: 'percentageDisplay', label: 'Collection %', align: 'center' }
  ];

  const collectionTableRows = collectionByCategory.map(row => {
    const pct = row.expected > 0 ? Math.round((row.collected / row.expected) * 100) : 0;
    return {
      category: row.category,
      expectedDisplay: formatCurrency(row.expected),
      collectedDisplay: formatCurrency(row.collected),
      pendingDisplay: formatCurrency(row.pending),
      percentageDisplay: `${pct}%`,
      _raw: { ...row, pct } // Essential for PDF/CSV logic
    }
  });

  const expenseTableColumns = [
    { key: 'category', label: 'Category' },
    { key: 'lastMonthDisplay', label: 'Last Month', align: 'center' },
    { key: 'thisMonthDisplay', label: 'This Month', align: 'center' },
    { key: 'changeDisplay', label: 'Change', align: 'center' },
    { key: 'allocatedDisplay', label: 'Budget Allocated', align: 'center' },
    { key: 'usedDisplay', label: 'Used %', align: 'center' }
  ];

  const expenseTableRows = expenseData.map(row => {
    const change = row.thisMonth - row.lastMonth;
    const allocated = row.allocated || 1;
    const budgetUsed = allocated > 0 ? Math.round((row.thisMonth / allocated) * 100) : 0;

    return {
      category: row.category,
      lastMonthDisplay: formatCurrency(row.lastMonth),
      thisMonthDisplay: formatCurrency(row.thisMonth),
      changeDisplay: (
        <span className={`font-bold ${change >= 0 ? 'text-rose-600' : 'text-emerald-600'} bg-white px-2.5 py-1 rounded-lg border ${change >= 0 ? 'border-rose-100' : 'border-emerald-100'}`}>
          {change >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(change))}
        </span>
      ),
      allocatedDisplay: formatCurrency(row.allocated),
      usedDisplay: (
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${budgetUsed > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }}></div>
          </div>
          <span className="font-bold text-[#223F74] text-xs">{budgetUsed}%</span>
        </div>
      ),
      _raw: { ...row, change, budgetUsed } // Essential for PDF/CSV logic
    };
  });

  const dueAnalysisColumns = [
    { key: 'class', label: 'Class' },
    { key: 'withDuesDisplay', label: 'Students with Dues', align: 'center' },
    { key: 'totalDueDisplay', label: 'Total Due Amount', align: 'center' },
    { key: 'days0to30', label: '0-30 Days', align: 'center' },
    { key: 'days31to60', label: '31-60 Days', align: 'center' },
    { key: 'days60plus', label: '60+ Days', align: 'center' }
  ];

  const dueAnalysisRows = dueAnalysis.map(row => ({
    class: row.class,
    withDuesDisplay: `${row.withDues} students`,
    totalDueDisplay: formatCurrency(row.totalDue),
    days0to30: row.days0to30,
    days31to60: row.days31to60,
    days60plus: row.days60plus,
    _raw: row // Essential for PDF/CSV logic
  }));

  const dueAnalysisActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Students",
      variant: "ghost",
      onClick: (row) => {
        setSelectedDueClass(row._raw);
        openModal("due-students-modal");
      }
    }
  ];

  // ================= DATA FETCHING =================
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        year: filterYear.split('-')[0],
        month: filterMonth === 'All' ? '' : (monthMap[filterMonth] || '')
      };

      const res = await getFinancialReports(params);
      if (res?.success && res?.data) {
        const d = res.data;
        setOverview(d.overview || { totalRevenue: 0, totalExpense: 0, totalPending: 0, netBalance: 0 });
        setActiveTrendData(d.revenueTrend || []);
        setRevenueExpenseData(d.revenueExpenseData || []);

        const categoryData = d.collectionByCategory || [];
        setCollectionByCategory(categoryData);
        setFeeCollectionData(categoryData.map(c => ({
          name: c.category,
          value: c.collected || 0
        })));

        setClassWiseCollection(d.classWiseCollection || []);
        setExpenseData(d.expenseData || []);
        setDueAnalysis(d.dueAnalysis || []);
      } else {
        setError("Failed to load financial reports data.");
      }
    } catch (err) {
      console.error('Error fetching financial reports:', err);
      setError(err?.message || "Failed to load financial reports.");
      toast.error(err?.message || "Failed to load financial reports.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDueStudentsList = async (classId) => {
    try {
      setDueStudentsLoading(true);
      setDueStudents([]);
      const res = await getDueStudents({ className: classId });
      if (res?.success && Array.isArray(res?.data)) {
        setDueStudents(res.data);
      } else {
        toast.error("Failed to load due students list.");
      }
    } catch (err) {
      console.error('Error fetching due students list:', err);
      toast.error(err?.message || "Failed to load due students.");
    } finally {
      setDueStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [filterYear, filterMonth]);

  useEffect(() => {
    if (selectedDueClass?.classId) {
      fetchDueStudentsList(selectedDueClass.classId);
    }
  }, [selectedDueClass]);

  return (
    <div className="pb-12 space-y-8 font-sans">
      <div className="mb-6">
        <Heading
          primaryText="Financial"
          secondaryText="Reports"
          size={12}
          showAnimations={true}
          action={
            <div className="flex gap-3 items-center">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-white border border-slate-200 text-[#223F74] font-bold text-sm outline-none cursor-pointer px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-[#223F74]/20 shadow-sm transition-all hover:border-[#223F74]"
              >
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
                <option value="2022-23">2022-23</option>
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-white border border-slate-200 text-[#223F74] font-bold text-sm outline-none cursor-pointer px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-[#223F74]/20 shadow-sm transition-all hover:border-[#223F74]"
              >
                <option value="All">All Months</option>
                <option value="Jan">January</option>
                <option value="Feb">February</option>
                <option value="Mar">March</option>
                <option value="Apr">April</option>
                <option value="May">May</option>
                <option value="Jun">June</option>
              </select>
            </div>
          }
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#223F74] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="p-5 rounded-2xl border border-rose-100 bg-rose-50/50 text-[#9E2E25] font-semibold text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={22} />} accentColor="#10b981" size={3} showAnimations />
            <EnhancedDashCard title="Total Expenses" value={formatCurrency(totalExpense)} icon={<Wallet size={22} />} accentColor="#f59e0b" size={3} showAnimations />
            <EnhancedDashCard title="Total Pending Dues" value={formatCurrency(totalPending)} icon={<Clock size={22} />} accentColor="#ef4444" size={3} showAnimations />
            <EnhancedDashCard title="Net Balance" value={formatCurrency(netBalance)} icon={<TrendingUp size={22} />} accentColor="#3b82f6" size={3} showAnimations />
          </DashGrid>

          {/* Primary Charts */}
          <DashGrid cols={12} gap={6}>
            <GAreaChart
              title="Revenue Trend"
              subtitle={`Financial overview (${filterMonth === 'All' ? filterYear : `${filterMonth}, ${filterYear}`})`}
              data={activeTrendData}
              areas={[
                { key: 'revenue', label: 'Revenue', color: '#10b981' }
              ]}
              size={7}
              height={340}
            />
            <GDoughnutChart
              title="Collection by Category"
              subtitle="Breakdown of received fees"
              data={feeCollectionData}
              size={5}
              height={340}
              innerRadius={80}
            />
          </DashGrid>

          {/* Secondary Charts */}
          <DashGrid cols={12} gap={6}>
            <GBarChart
              title="Revenue vs Expense"
              subtitle="Comparison by month"
              data={revenueExpenseData}
              bars={[
                { key: 'revenue', label: 'Revenue', color: '#3b82f6' },
                { key: 'expense', label: 'Expense', color: '#ef4444' }
              ]}
              size={6}
              height={340}
            />
            <GColumnChart
              title="Class-wise Collection Efficiency"
              subtitle="Billed vs Collected Amount per class"
              data={classWiseCollection}
              bars={[
                { key: 'expected', label: 'Expected', color: '#6366f1' },
                { key: 'collected', label: 'Collected', color: '#22c55e' }
              ]}
              size={6}
              height={340}
            />
          </DashGrid>

          {/* Data Tables with Fixed Embedded Export Menus */}
          <div className="mt-8 space-y-8">
            <div className="relative">
              <ExportDropdown type="Collection_Report" rows={collectionTableRows} fileName={`Collection_Report_${filterMonth}_${filterYear}`} dateStr={dateStr} />
              <DataTable
                title="Collection Report by Category"
                columns={collectionTableColumns}
                rows={collectionTableRows}
                pageSize={5}
                size={12}
                exportable={false}
              />
            </div>

            <div className="relative">
              <ExportDropdown type="Expense_Summary" rows={expenseTableRows} fileName={`Expense_Summary_${filterMonth}_${filterYear}`} dateStr={dateStr} />
              <DataTable
                title="Expense Summary"
                columns={expenseTableColumns}
                rows={expenseTableRows}
                pageSize={5}
                size={12}
                exportable={false}
              />
            </div>

            <div className="relative">
              <ExportDropdown type="Due_Analysis" rows={dueAnalysisRows} fileName={`Due_Analysis_${filterMonth}_${filterYear}`} dateStr={dateStr} />
              <DataTable
                title="Due Analysis"
                columns={dueAnalysisColumns}
                rows={dueAnalysisRows}
                actions={dueAnalysisActions}
                pageSize={5}
                size={12}
                exportable={false}
              />
            </div>
          </div>
        </>
      )}

      {/* Modal is always mounted so it can receive events, content is dynamic */}
      <Modal id="due-students-modal" title={`Due Students - ${selectedDueClass?.class || ''}`}>
        <div className="space-y-3">
          {dueStudentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#223F74] border-t-transparent" />
            </div>
          ) : dueStudents.length > 0 ? (
            dueStudents.map((student, idx) => (
              <div
                key={student.id || idx}
                className="p-4 transition-colors border border-rose-100 rounded-xl bg-rose-50/50 hover:bg-rose-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-[#223F74] text-sm">
                      {student.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Roll No: {student.rollNo} · Section: {student.section || 'A'}
                    </p>
                  </div>
                  <span className="text-rose-600 font-black text-sm bg-white px-2.5 py-1 rounded-lg border border-rose-100 shadow-sm">
                    {formatCurrency(student.dueAmount)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 text-sm py-4">No due students found for this class.</p>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button text="Close" variant="ghost" size={3} onClick={() => closeModal("due-students-modal")} />
        </div>
      </Modal>
    </div>
  );
};

export default FinancialReports;