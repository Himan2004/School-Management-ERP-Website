import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import {
  Heading,
  DashGrid,
  DashCard,
  EnhancedDashCard,
  Grid,
  DataTable,
  Select,
  Option,
  PanelModal,
  openModal,
} from '../../../components/shared/Common_Components';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading data...</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-[#223F74] border border-[#E2E8F0]">
      <AlertCircle size={32} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">No Records Found</h3>
    <p className="text-sm text-slate-500 max-w-sm">{message}</p>
  </div>
);

// Tooltip wrapper for Headings and Icons
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

const PayrollSummary = () => {
  const baseDummyPayroll = [
    { id: 1, employeeName: 'Rajesh Sharma', employeeId: 'EMP-001', department: 'Academic', designation: 'Senior Teacher', salary: 75000, paidAmount: 75000, pendingAmount: 0, paymentDate: '01 Oct 2025', paymentMethod: 'Bank Transfer', paymentStatus: 'Paid', deductions: 2500 },
    { id: 2, employeeName: 'Sneha Verma', employeeId: 'EMP-012', department: 'Academic', designation: 'Mathematics Teacher', salary: 60000, paidAmount: 0, pendingAmount: 60000, paymentDate: null, paymentMethod: null, paymentStatus: 'Pending', deductions: 1500 },
    { id: 3, employeeName: 'Amit Patel', employeeId: 'EMP-045', department: 'Administration', designation: 'Accountant', salary: 45000, paidAmount: 45000, pendingAmount: 0, paymentDate: '02 Oct 2025', paymentMethod: 'Bank Transfer', paymentStatus: 'Paid', deductions: 1000 },
    { id: 4, employeeName: 'Neha Gupta', employeeId: 'EMP-067', department: 'Support Staff', designation: 'Librarian', salary: 35000, paidAmount: 35000, pendingAmount: 0, paymentDate: '01 Oct 2025', paymentMethod: 'Bank Transfer', paymentStatus: 'Paid', deductions: 800 },
    { id: 5, employeeName: 'Priya Singh', employeeId: 'EMP-088', department: 'Academic', designation: 'Science Teacher', salary: 55000, paidAmount: 25000, pendingAmount: 30000, paymentDate: '05 Oct 2025', paymentMethod: 'Cheque', paymentStatus: 'Partial', deductions: 1200 },
    { id: 6, employeeName: 'Vikram Joshi', employeeId: 'EMP-092', department: 'Administration', designation: 'HR Manager', salary: 65000, paidAmount: 65000, pendingAmount: 0, paymentDate: '01 Oct 2025', paymentMethod: 'Bank Transfer', paymentStatus: 'Paid', deductions: 2000 },
    { id: 7, employeeName: 'Anita Desai', employeeId: 'EMP-105', department: 'Support Staff', designation: 'Lab Assistant', salary: 25000, paidAmount: 0, pendingAmount: 25000, paymentDate: null, paymentMethod: null, paymentStatus: 'Pending', deductions: 500 },
  ];

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState("2025-2026");
  const [selectedDept, setSelectedDept] = useState("all");

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    // Simulate API fetch with dynamic filtering based on selected global filters
    setLoading(true);
    const timer = setTimeout(() => {
      setRecords([]);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedMonth, selectedYear, selectedDept]);

  // Derived KPI values based on filtered records
  const totalEmployees = records.length;
  const totalPayroll = records.reduce((sum, r) => sum + r.salary, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalPending = records.reduce((sum, r) => sum + r.pendingAmount, 0);

  const handleViewDetails = (record) => {
    setSelectedPayroll(record);
    setIsModalVisible(true);
  };

  const columns = [
    { key: "employeeName", label: "Employee Name", render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "employeeId", label: "Employee ID", render: (val) => <span className="text-gray-600 font-mono text-xs">{val}</span> },
    { key: "department", label: "Department", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "designation", label: "Designation", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "salary", label: "Salary", render: (val) => <span className="text-gray-900 font-bold">{formatCurrency(val)}</span> },
    { key: "paidAmount", label: "Paid Amount", render: (val) => <span className="text-emerald-600 font-bold">{formatCurrency(val)}</span> },
    { key: "pendingAmount", label: "Pending Amount", render: (val) => <span className="text-rose-600 font-bold">{formatCurrency(val)}</span> },
    { key: "paymentDate", label: "Payment Date", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "paymentStatus", label: "Payment Status", render: (val) => (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
        val === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
        val === 'Pending' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
        'bg-amber-50 text-amber-700 border border-amber-100'
      }`}>
        {val}
      </span>
    )},
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <ActionTooltip label="View">
        <button 
          onClick={() => handleViewDetails(row)}
          className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block"
        >
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      {/* 1. Heading */}
      <Heading
        primaryText="Payroll"
        secondaryText="Summary"
        size={12}
        showAnimations={true}
      />

      {/* 2. Summary Cards */}
      <DashGrid cols={12} gap={3}>
        <EnhancedDashCard 
          title="Total Employees" 
          value={totalEmployees} 
          icon={<Users size={22} />} 
          size={3}
          accentColor="#223F74" 
        />
        <EnhancedDashCard 
          title="Payroll Amount" 
          value={formatCurrency(totalPayroll)} 
          icon={<DollarSign size={22} />} 
          size={3}
          accentColor="#F59E0B" 
        />
        <EnhancedDashCard 
          title="Paid Salary" 
          value={formatCurrency(totalPaid)} 
          icon={<CheckCircle2 size={22} />} 
          size={3}
          accentColor="#10B981" 
        />
        <EnhancedDashCard 
          title="Pending Salary" 
          value={formatCurrency(totalPending)} 
          icon={<Clock size={22} />} 
          size={3}
          accentColor="#EF4444" 
        />
      </DashGrid>

      {/* 3. Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Month</label>
            <Select 
              id="filter-month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              searchable={false}
            >
              <Option value="1" label="January" />
              <Option value="2" label="February" />
              <Option value="3" label="March" />
              <Option value="4" label="April" />
              <Option value="5" label="May" />
              <Option value="6" label="June" />
              <Option value="7" label="July" />
              <Option value="8" label="August" />
              <Option value="9" label="September" />
              <Option value="10" label="October" />
              <Option value="11" label="November" />
              <Option value="12" label="December" />
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select 
              id="filter-year" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)} 
              searchable={false}
            >
              <Option value="2024-2025" label="2024-2025" />
              <Option value="2025-2026" label="2025-2026" />
              <Option value="2026-2027" label="2026-2027" />
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Department</label>
            <Select 
              id="filter-dept" 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)} 
              searchable={false}
            >
              <Option value="all" label="All Departments" />
              <Option value="Academic" label="Academic" />
              <Option value="Administration" label="Administration" />
              <Option value="Accounts" label="Accounts" />
              <Option value="Support Staff" label="Support Staff" />
            </Select>
          </div>
        </Grid>
      </div>

      {/* 4. Payroll Table */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="p-6 pb-2 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#1D1D1F]">Payroll Details</h2>
        </div>
        <div className="p-6 pt-4">
          {loading ? (
             <LoadingState />
          ) : (
             <DataTable 
               rows={records}
               columns={columns}
               searchable={true}
               searchPlaceholder="Search payroll records..."
               exportable={true}
             />
          )}
        </div>
      </div>

      {/* 5. View Details Modal */}
      <PanelModal 
        id="payroll-details-modal" 
        title="Payroll Details" 
        size="md"
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      >
        {!selectedPayroll ? (
          <EmptyState message="No details available." />
        ) : (
          <div className="space-y-6 pb-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Employee Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Name</p>
                  <p className="font-bold text-slate-900">{selectedPayroll.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Employee ID</p>
                  <p className="font-mono font-bold text-slate-600">{selectedPayroll.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="font-bold text-slate-900">{selectedPayroll.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Designation</p>
                  <p className="font-bold text-slate-900">{selectedPayroll.designation}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Salary Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Gross Salary</p>
                  <p className="font-bold text-slate-900">{formatCurrency(selectedPayroll.salary)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Deductions</p>
                  <p className="font-bold text-rose-600">{formatCurrency(selectedPayroll.deductions || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Net Salary</p>
                  <p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedPayroll.salary - (selectedPayroll.deductions || 0))}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Payment Date</p>
                  <p className="font-bold text-slate-900">{selectedPayroll.paymentDate || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Payment Method</p>
                  <p className="font-bold text-slate-900">{selectedPayroll.paymentMethod || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <span className={`inline-block px-3 py-1 mt-1 rounded-full text-xs font-bold ${
                    selectedPayroll.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                    selectedPayroll.paymentStatus === 'Pending' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedPayroll.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default PayrollSummary;
