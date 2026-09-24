import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, CheckCircle2, AlertCircle, Users, Eye, ToggleLeft, ToggleRight, BadgeAlert, BadgeCheck } from 'lucide-react';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataTable,
  Button,
  Select,
  Option,
  PanelModal
} from '../../../components/shared/Common_Components';
import api from '../../../services/api';
import toast from 'react-hot-toast';

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

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const FinancialAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [feeScheduleTab, setFeeScheduleTab] = useState('monthly');
  const [feeRecordsTab, setFeeRecordsTab] = useState('pending');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [records, setRecords] = useState([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [studentStatusMap, setStudentStatusMap] = useState({});
  const [studentDuesMap, setStudentDuesMap] = useState({});

  const months = [
    { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
    { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
  ];
  const years = [2024, 2025, 2026, 2027, 2028];

  const [stats, setStats] = useState({ pendingFees: 0, paidFees: 0, outstanding: 0, studentCount: 0 });

  // CONNECTED TO BACKEND
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        const response = await api.get('/admin/finance/dashboard-stats', {
          params: { month: selectedMonth, year: selectedYear }
        });
        if (response.data.success) {
          const kpis = response.data.data.kpis;
          setStats({
            paidFees:     kpis.totalFees?.value       || 0,
            pendingFees:  kpis.fineCollected?.value   || 0,
            outstanding:  kpis.totalOutstanding?.value || 0,
            studentCount: kpis.studentsNotPaid?.value  || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch financial stats:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const response = await api.get('/admin/finance/fee-records', {
          params: {
            type:   feeRecordsTab,          // 'pending' or 'paid'
            period: feeScheduleTab,          // 'monthly', '6months', 'yearly'
            month:  selectedMonth,
            year:   selectedYear
          }
        });
        if (response.data.success) {
          setRecords(response.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch fee records:", error);
        toast.error("Failed to load fee records");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [feeRecordsTab, feeScheduleTab, selectedMonth, selectedYear]);


  const handleToggleStatus = (id) => {
    setStudentStatusMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleDues = (id) => {
    setStudentDuesMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderStudentStatusBadge = (id) => {
    const isActive = studentStatusMap[id] !== false;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const renderDuesBadge = (id) => {
    const hasDues = studentDuesMap[id];
    if (!hasDues) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
          No Flag
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-300">
        <BadgeAlert size={12} />
        Dues Flagged
      </span>
    );
  };

  const pendingColumns = [
    { key: "studentName",    label: "Student Name",    render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "rollNo",         label: "Roll No",         render: (val) => <span className="text-gray-600 font-mono text-xs">{val}</span> },
    { key: "class",          label: "Class",           render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "section",        label: "Section",         align: "center", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "feeType",        label: "Fee Type",        render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "dueDate",        label: "Due Date",        render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "pendingAmount",  label: "Pending Amount",  align: "center", render: (val) => <span className="text-rose-600 font-bold">{formatCurrency(val)}</span> },
    { key: "studentStatus",  label: "Status",          align: "center", render: (_, row) => renderStudentStatusBadge(row.id) },
    { key: "duesStatus",     label: "Dues",            align: "center", render: (_, row) => renderDuesBadge(row.id) },
    {
      key: "actions", label: "Actions", align: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <ActionTooltip label={studentStatusMap[row.id] !== false ? "Set Inactive" : "Set Active"}>
            <button
              onClick={() => handleToggleStatus(row.id)}
              className={`p-2 rounded-lg transition-colors ${studentStatusMap[row.id] !== false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-400 hover:bg-rose-50'}`}
            >
              {studentStatusMap[row.id] !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
          </ActionTooltip>
          <ActionTooltip label={studentDuesMap[row.id] ? "Remove Dues Flag" : "Flag as Has Dues"}>
            <button
              onClick={() => handleToggleDues(row.id)}
              className={`p-2 rounded-lg transition-colors ${studentDuesMap[row.id] ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              {studentDuesMap[row.id] ? <BadgeAlert size={18} /> : <BadgeCheck size={18} />}
            </button>
          </ActionTooltip>
          <ActionTooltip label="View Details">
            <button
              onClick={() => { setSelectedRecord(row); setIsModalVisible(true); }}
              className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Eye size={18} />
            </button>
          </ActionTooltip>
        </div>
      )
    },
  ];

  const paidColumns = [
    { key: "studentName",   label: "Student Name",   render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "receiptNo",     label: "Receipt No",     render: (val) => <span className="text-gray-600 font-mono text-xs">{val}</span> },
    { key: "class",         label: "Class",          render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "section",       label: "Section",        render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "amount",        label: "Amount",         render: (val) => <span className="text-emerald-600 font-bold">{formatCurrency(val)}</span> },
    { key: "paymentDate",   label: "Payment Date",   render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "paymentMethod", label: "Payment Method", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "studentStatus", label: "Status",         align: "center", render: (_, row) => renderStudentStatusBadge(row.id) },
    { key: "duesStatus",    label: "Dues",           align: "center", render: (_, row) => renderDuesBadge(row.id) },
    {
      key: "actions", label: "Actions", align: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <ActionTooltip label={studentStatusMap[row.id] !== false ? "Set Inactive" : "Set Active"}>
            <button
              onClick={() => handleToggleStatus(row.id)}
              className={`p-2 rounded-lg transition-colors ${studentStatusMap[row.id] !== false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-400 hover:bg-rose-50'}`}
            >
              {studentStatusMap[row.id] !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
          </ActionTooltip>
          <ActionTooltip label={studentDuesMap[row.id] ? "Remove Dues Flag" : "Flag as Has Dues"}>
            <button
              onClick={() => handleToggleDues(row.id)}
              className={`p-2 rounded-lg transition-colors ${studentDuesMap[row.id] ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              {studentDuesMap[row.id] ? <BadgeAlert size={18} /> : <BadgeCheck size={18} />}
            </button>
          </ActionTooltip>
          <ActionTooltip label="View Receipt">
            <button
              onClick={() => { setSelectedRecord(row); setIsModalVisible(true); }}
              className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Eye size={18} />
            </button>
          </ActionTooltip>
        </div>
      )
    },
  ];

  return (
    <div className="w-full space-y-8 pb-10 text-left">

      {/* 1. Heading */}
      <div className="mb-6 relative z-30">
        <Heading
          primaryText="Financial"
          secondaryText="Analytics"
          size={12}
          showAnimations={true}
        />
      </div>

      {/* 2. KPI Cards */}
      <DashGrid cols={12} gap={3}>
        <EnhancedDashCard
          title="Fine Collected"
          value={formatCurrency(stats.pendingFees)}
          icon={<AlertCircle size={22} />}
          size={3}
          accentColor="#F59E0B"
        />
        <EnhancedDashCard
          title="Total Fees Collected"
          value={formatCurrency(stats.paidFees)}
          icon={<CheckCircle2 size={22} />}
          size={3}
          accentColor="#10B981"
        />
        <EnhancedDashCard
          title="Total Outstanding"
          value={formatCurrency(stats.outstanding)}
          icon={<DollarSign size={22} />}
          size={3}
          accentColor="#EF4444"
        />
        <EnhancedDashCard
          title="Students Not Paid"
          value={stats.studentCount}
          icon={<Users size={22} />}
          size={3}
          accentColor="#223F74"
        />
      </DashGrid>

      {/* 3. Fee Records (Tabs + Table) */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">

        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-4">
          <h2 className="text-xl font-black text-[#1D1D1F]">Fee Records</h2>
          <div className="flex justify-end relative z-20">
            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-[#E2E8F0] text-[#223F74] rounded-2xl text-sm font-bold hover:bg-[#F4F7FB] transition-colors shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                {feeScheduleTab === 'yearly'
                  ? `Year ${selectedYear}`
                  : feeScheduleTab === '6months'
                  ? `6 Months ending ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                  : `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                }
              </button>
              {isDatePickerOpen && (
                <div className="absolute right-0 mt-2 p-4 w-64 border border-[#E2E8F0] bg-white rounded-2xl shadow-xl z-50">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Only show Month selector when NOT in yearly mode */}
                    {feeScheduleTab !== 'yearly' && (
                      <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Month</label>
                        <Select
                          value={selectedMonth}
                          onChange={(e) => { setSelectedMonth(Number(e.target.value)); setIsDatePickerOpen(false); }}
                          searchable={false}
                        >
                          {months.map(m => <Option key={m.value} value={m.value} label={m.label} />)}
                        </Select>
                      </div>
                    )}
                    <div className={feeScheduleTab === 'yearly' ? 'col-span-2' : ''}>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Year</label>
                      <Select
                        value={selectedYear}
                        onChange={(e) => { setSelectedYear(Number(e.target.value)); setIsDatePickerOpen(false); }}
                        searchable={false}
                      >
                        {years.map(y => <Option key={y} value={y} label={String(y)} />)}
                      </Select>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 pb-6 gap-4 border-b border-gray-100">
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            {['monthly', '6months', 'yearly'].map(tab => (
              <button
                key={tab}
                onClick={() => setFeeScheduleTab(tab)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                  feeScheduleTab === tab
                    ? "bg-white text-[#223F74] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === 'monthly' ? 'Monthly' : tab === '6months' ? 'Last 6 Months' : 'Yearly'}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setFeeRecordsTab('pending')}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                feeRecordsTab === 'pending'
                  ? "bg-white text-[#223F74] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pending Fees
            </button>
            <button
              onClick={() => setFeeRecordsTab('paid')}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                feeRecordsTab === 'paid'
                  ? "bg-white text-[#223F74] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Paid Fees
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6">
          {loading ? (
            <LoadingState />
          ) : (
            <DataTable
              key={`${feeRecordsTab}-${feeScheduleTab}-${selectedMonth}-${selectedYear}`}
              rows={records}
              columns={feeRecordsTab === 'pending' ? pendingColumns : paidColumns}
              searchable={true}
              exportable={true}
            />
          )}
        </div>
      </div>

      {/* 4. Details Modal */}
      <PanelModal
        id="fee-details-modal"
        title={feeRecordsTab === 'pending' ? "Student Fee Details" : "Receipt Details"}
        size="md"
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      >
        {!selectedRecord ? (
          <EmptyState message="No details available." />
        ) : (
          <div className="space-y-6 pb-6">

            {/* Student Information */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Name</p>
                  <p className="font-bold text-slate-900">{selectedRecord.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{feeRecordsTab === 'pending' ? "Roll No" : "Receipt No"}</p>
                  <p className="font-mono font-bold text-slate-600">{feeRecordsTab === 'pending' ? selectedRecord.rollNo : selectedRecord.receiptNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Class</p>
                  <p className="font-bold text-slate-900">{selectedRecord.class}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Section</p>
                  <p className="font-bold text-slate-900">{selectedRecord.section}</p>
                </div>
              </div>
            </div>

            {/* Fee / Payment Details */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">
                {feeRecordsTab === 'pending' ? "Fee Details" : "Payment Information"}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {feeRecordsTab === 'pending' ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Fee Type</p>
                      <p className="font-bold text-slate-900">{selectedRecord.feeType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Due Date</p>
                      <p className="font-bold text-slate-900">{selectedRecord.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Pending Amount</p>
                      <p className="font-bold text-rose-600 text-lg">{formatCurrency(selectedRecord.pendingAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Fee Status</p>
                      <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        {selectedRecord.status}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Payment Date</p>
                      <p className="font-bold text-slate-900">{selectedRecord.paymentDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Payment Method</p>
                      <p className="font-bold text-slate-900">{selectedRecord.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Amount Paid</p>
                      <p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedRecord.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Fee Status</p>
                      <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {selectedRecord.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Student Status & Dues */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Account Status</h3>

              {studentDuesMap[selectedRecord.id] && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <BadgeAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Pending Dues Flagged</p>
                    <p className="text-xs text-amber-600 mt-0.5">This student has been individually flagged for pending fee dues.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2">Account Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${studentStatusMap[selectedRecord.id] !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {studentStatusMap[selectedRecord.id] !== false ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(selectedRecord.id)}
                      className={`p-1.5 rounded-lg transition-colors text-xs font-semibold border ${studentStatusMap[selectedRecord.id] !== false ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-rose-200 text-rose-500 hover:bg-rose-50'}`}
                    >
                      {studentStatusMap[selectedRecord.id] !== false ? 'Set Inactive' : 'Set Active'}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2">Dues Flag</p>
                  <div className="flex items-center gap-2">
                    {studentDuesMap[selectedRecord.id] ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-300">
                        <BadgeAlert size={11} /> Dues Flagged
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                        No Flag
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleDues(selectedRecord.id)}
                      className={`p-1.5 rounded-lg transition-colors text-xs font-semibold border ${studentDuesMap[selectedRecord.id] ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {studentDuesMap[selectedRecord.id] ? 'Remove Flag' : 'Flag Dues'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </PanelModal>

    </div>
  );
};

export default FinancialAnalytics;