/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Download,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Send,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Heading, DashGrid, EnhancedDashCard } from '../../components/shared/Common_Components';
import api from '../../services/api.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const initialResignationForm = {
  reason: '',
  lastDate: '',
  remarks: '',
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonthYear = (month, year) => {
  const monthIndex = Number(month) - 1;
  const monthName = MONTHS[monthIndex] || month;
  return `${monthName} ${year}`;
};

const formatPaymentMode = (mode) => {
  if (!mode || mode === '—') return 'Bank Transfer';
  return mode
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'approved') return 'bg-blue-100 text-blue-700';
  if (normalized === 'held') return 'bg-amber-100 text-amber-700';
  if (normalized === 'draft') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

const PrintableSlip = ({ slip, onClose, onPrint, onDownload }) => {
  const allowancesTotal = Array.isArray(slip?.allowances)
    ? slip.allowances.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    : 0;
  const deductionsTotal = Array.isArray(slip?.deductions)
    ? slip.deductions.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    : Number(slip?.totalDeductions || 0);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] p-5">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-[#223F74]">
              <FileText size={18} /> Salary Slip — {formatMonthYear(slip?.month, slip?.year)}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Payment status: {String(slip?.paymentStatus || 'draft').toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-[#F4F7FB]">
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="rounded-2xl bg-[#223F74] p-5 text-white shadow-lg shadow-[#223F74]/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Teacher Salary Slip</p>
                <h1 className="mt-2 text-2xl font-black">{formatMonthYear(slip?.month, slip?.year)}</h1>
                <p className="mt-1 text-sm text-white/70">Generated for your teacher account</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                {String(slip?.paymentStatus || 'draft').toUpperCase()}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-sm">
              <div>
                <p className="text-white/50">Net Salary</p>
                <p className="text-xl font-black">{formatCurrency(slip?.netSalary)}</p>
              </div>
              <div>
                <p className="text-white/50">Payment Mode</p>
                <p className="text-xl font-black">{formatPaymentMode(slip?.paymentMode)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Earnings</p>
              <div className="mt-3 space-y-2 text-sm text-[#4B5563]">
                <div className="flex justify-between border-b border-emerald-100 py-1"><span>Basic Salary</span><span className="font-bold">{formatCurrency(slip?.basicSalary)}</span></div>
                <div className="flex justify-between border-b border-emerald-100 py-1"><span>Gross Earnings</span><span className="font-bold">{formatCurrency(slip?.grossEarnings || ((slip?.basicSalary || 0) + allowancesTotal))}</span></div>
                <div className="flex justify-between border-b border-emerald-100 py-1"><span>Allowances</span><span className="font-bold">{formatCurrency(allowancesTotal)}</span></div>
                <div className="flex justify-between py-1 font-black text-emerald-700"><span>Total Earnings</span><span>{formatCurrency(slip?.grossEarnings || ((slip?.basicSalary || 0) + allowancesTotal))}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Deductions</p>
              <div className="mt-3 space-y-2 text-sm text-[#4B5563]">
                <div className="flex justify-between border-b border-rose-100 py-1"><span>Total Deductions</span><span className="font-bold">{formatCurrency(deductionsTotal)}</span></div>
                <div className="flex justify-between border-b border-rose-100 py-1"><span>Absent Deduction</span><span className="font-bold">{formatCurrency(slip?.absentDeduction)}</span></div>
                <div className="flex justify-between border-b border-rose-100 py-1"><span>Advance Recovery</span><span className="font-bold">{formatCurrency(slip?.advanceRecovery)}</span></div>
                <div className="flex justify-between py-1 font-black text-rose-700"><span>Net Pay</span><span>{formatCurrency(slip?.netSalary)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Payment Info</p>
              <div className="mt-3 space-y-2 text-sm text-[#4B5563]">
                <div className="flex justify-between border-b border-[#E2E8F0] py-1"><span>Payment Date</span><span className="font-bold">{formatDate(slip?.paymentDate)}</span></div>
                <div className="flex justify-between border-b border-[#E2E8F0] py-1"><span>Transaction</span><span className="font-bold">{slip?.paymentReference || '—'}</span></div>
                <div className="flex justify-between border-b border-[#E2E8F0] py-1"><span>Remarks</span><span className="font-bold">{slip?.remarks || '—'}</span></div>
                <div className="flex justify-between py-1"><span>Generated On</span><span className="font-bold">{formatDate(slip?.createdAt)}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Allowances & Deductions</p>
              <div className="mt-3 space-y-3 text-sm text-[#4B5563] max-h-[220px] overflow-y-auto pr-1">
                {Array.isArray(slip?.allowances) && slip.allowances.length > 0 ? (
                  slip.allowances.map((item, index) => (
                    <div key={`allowance-${index}`} className="flex justify-between border-b border-[#E2E8F0] py-1">
                      <span>{item.name}</span>
                      <span className="font-bold">{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#9CA3AF]">No allowances recorded.</p>
                )}
                {Array.isArray(slip?.deductions) && slip.deductions.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Deductions</p>
                    <div className="mt-2 space-y-2">
                      {slip.deductions.map((item, index) => (
                        <div key={`deduction-${index}`} className="flex justify-between border-b border-[#E2E8F0] py-1">
                          <span>{item.name}</span>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="w-full rounded-xl px-5 py-2.5 font-bold text-[#6B7280] transition-colors hover:bg-[#F8F9FA] sm:w-auto">
              Close
            </button>
            <button onClick={onDownload} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-emerald-700 sm:w-auto">
              <Download size={16} /> Download CSV
            </button>
            <button onClick={onPrint} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#223F74] px-5 py-2.5 font-bold text-white transition-colors hover:bg-[#1a3059] sm:w-auto">
              <Printer size={16} /> Print Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HRMSalary = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [salarySummary, setSalarySummary] = useState(null);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedSlipLoading, setSelectedSlipLoading] = useState(false);
  const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
  const [resignationForm, setResignationForm] = useState(initialResignationForm);
  const [submittingResignation, setSubmittingResignation] = useState(false);
  const [resignation, setResignation] = useState(null);

  const loadSalaryData = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [summaryResponse, historyResponse, resignationResponse] = await Promise.all([
        api.get('/teacher/finance/summary'),
        api.get('/teacher/finance/salaries'),
        api.get('/teacher/resignation').catch(() => ({ data: { success: true, data: null } })),
      ]);

      setSalarySummary(summaryResponse.data?.data || null);
      setSalaryHistory(historyResponse.data?.data || []);
      setResignation(resignationResponse.data?.data || null);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load salary data');
      toast.error(requestError.response?.data?.message || 'Failed to load salary data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSalaryData();
  }, []);

  const currentSlip = salaryHistory[0] || null;

  const stats = useMemo(() => ({
    currentMonthSalary: currentSlip?.netSalary || salarySummary?.lastMonthPaid || 0,
    totalEarnings: salarySummary?.totalEarningsYear || 0,
    slipsAvailable: salaryHistory.length,
    paymentStatus: salarySummary?.paymentStatus || currentSlip?.paymentStatus || 'draft',
  }), [currentSlip, salaryHistory.length, salarySummary]);

  const recentTrend = useMemo(() => {
    const trend = salarySummary?.monthlyTrend || [];
    return [...trend].slice(-6).reverse();
  }, [salarySummary]);

  const handleViewSalarySlip = async (row) => {
    if (!row?._id) return;

    setSelectedSlipLoading(true);
    setSelectedSlip(null);

    try {
      const response = await api.get(`/teacher/finance/salary/${row._id}`);
      setSelectedSlip(response.data?.data || null);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to load salary slip');
    } finally {
      setSelectedSlipLoading(false);
    }
  };

  const handlePrintSalarySlip = (slip) => {
    if (!slip) return;

    const allowancesTotal = Array.isArray(slip.allowances)
      ? slip.allowances.reduce((acc, item) => acc + Number(item.amount || 0), 0)
      : 0;
    const deductionsTotal = Array.isArray(slip.deductions)
      ? slip.deductions.reduce((acc, item) => acc + Number(item.amount || 0), 0)
      : Number(slip.totalDeductions || 0);

    const content = `
      <html><head><title>Salary Slip</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;color:#1D1D1F;padding:40px;}
        .wrap{max-width:820px;margin:0 auto;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;}
        .head{background:#223F74;color:#fff;padding:24px;}
        .head h1{font-size:24px;font-weight:900;}
        .head p{opacity:.7;margin-top:6px;font-size:13px;}
        .body{padding:24px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
        .box{background:#F8F9FA;border:1px solid #E2E8F0;border-radius:12px;padding:16px;}
        .title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:12px;}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E2E8F0;font-size:14px;}
        .row:last-child{border-bottom:none;}
        .net{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:16px;border-radius:12px;background:#223F74;color:#fff;font-size:18px;font-weight:900;}
      </style>
      </head><body>
      <div class="wrap">
        <div class="head">
          <h1>Salary Slip — ${formatMonthYear(slip.month, slip.year)}</h1>
          <p>Payment Status: ${String(slip.paymentStatus || 'draft').toUpperCase()}</p>
        </div>
        <div class="body">
          <div class="grid">
            <div class="box">
              <div class="title">Earnings</div>
              <div class="row"><span>Basic Salary</span><span>${formatCurrency(slip.basicSalary)}</span></div>
              <div class="row"><span>Allowances</span><span>${formatCurrency(allowancesTotal)}</span></div>
              <div class="row"><span>Gross Earnings</span><span>${formatCurrency(slip.grossEarnings || (Number(slip.basicSalary || 0) + allowancesTotal))}</span></div>
            </div>
            <div class="box">
              <div class="title">Deductions</div>
              <div class="row"><span>Total Deductions</span><span>${formatCurrency(deductionsTotal)}</span></div>
              <div class="row"><span>Advance Recovery</span><span>${formatCurrency(slip.advanceRecovery)}</span></div>
              <div class="row"><span>Absent Deduction</span><span>${formatCurrency(slip.absentDeduction)}</span></div>
            </div>
          </div>
          <div class="net"><span>Net Salary</span><span>${formatCurrency(slip.netSalary)}</span></div>
        </div>
      </div>
      </body></html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleDownloadSalarySlip = (slip) => {
    if (!slip) return;

    const allowancesTotal = Array.isArray(slip.allowances)
      ? slip.allowances.reduce((acc, item) => acc + Number(item.amount || 0), 0)
      : 0;
    const deductionsTotal = Array.isArray(slip.deductions)
      ? slip.deductions.reduce((acc, item) => acc + Number(item.amount || 0), 0)
      : Number(slip.totalDeductions || 0);

    const csvContent = [
      ['Component', 'Amount'],
      ['Basic Salary', slip.basicSalary || 0],
      ['Allowances', allowancesTotal],
      ['Gross Earnings', slip.grossEarnings || (Number(slip.basicSalary || 0) + allowancesTotal)],
      ['Total Deductions', deductionsTotal],
      ['Net Salary', slip.netSalary || 0],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Salary_Slip_${formatMonthYear(slip.month, slip.year).replace(/\s+/g, '_')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Salary slip downloaded');
  };

  const handleSubmitResignation = async () => {
    if (!resignationForm.reason || !resignationForm.lastDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingResignation(true);
    try {
      const response = await api.post('/teacher/resignation', {
        lastDay: resignationForm.lastDate,
        reason: resignationForm.reason,
      });
      if (response.data?.success) {
        toast.success(response.data?.message || 'Resignation application submitted successfully');
        setIsResignationModalOpen(false);
        setResignationForm(initialResignationForm);
        // Fetch fresh resignation status
        const statusRes = await api.get('/teacher/resignation').catch(() => null);
        if (statusRes?.data?.success) {
          setResignation(statusRes.data.data);
        }
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to submit resignation');
    } finally {
      setSubmittingResignation(false);
    }
  };

  const handleWithdrawResignation = async () => {
    const confirmed = window.confirm('Are you sure you want to withdraw your resignation request?');
    if (!confirmed) return;

    setSubmittingResignation(true);
    try {
      const response = await api.post('/teacher/resignation/withdraw');
      if (response.data?.success) {
        toast.success(response.data?.message || 'Resignation request withdrawn successfully');
        setResignation(null);
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to withdraw resignation');
    } finally {
      setSubmittingResignation(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Heading
          primaryText="Salary &"
          secondaryText="Resignation"
          size={12}
          showAnimations={true}
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => loadSalaryData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#223F74] shadow-sm transition-colors hover:bg-[#F4F7FB]"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsResignationModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D66B5F] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#D66B5F]/20 transition-all hover:bg-[#c05d52] hover:-translate-y-0.5"
          >
            <Send size={16} />
            Apply for Resignation
          </button>
        </div>
      </div>

      <p className="-mt-2 text-sm text-[#6B7280]">
        Live salary history and slips from the teacher payroll backend.
      </p>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Current Month Salary"
          value={formatCurrency(stats.currentMonthSalary)}
          icon={<Wallet size={22} />}
          accentColor="#22c55e"
          size={3}
          showAnimations={true}
        />
        <EnhancedDashCard
          title="Total Earnings (YTD)"
          value={formatCurrency(stats.totalEarnings)}
          icon={<TrendingUp size={22} />}
          accentColor="#3b82f6"
          size={3}
          showAnimations={true}
        />
        <EnhancedDashCard
          title="Total Slips"
          value={String(stats.slipsAvailable)}
          icon={<FileText size={22} />}
          accentColor="#8b5cf6"
          size={3}
          showAnimations={true}
        />
        <EnhancedDashCard
          title="Latest Status"
          value={String(stats.paymentStatus || 'draft').toUpperCase()}
          icon={<TrendingDown size={22} />}
          accentColor="#ef4444"
          size={3}
          showAnimations={true}
        />
      </DashGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1F]">Salary History</h2>
                <p className="text-sm text-[#6B7280]">All slips issued for your teacher account.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="Search slips..."
                    className="min-w-[220px] rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
                  />
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F8F9FA]">
                  <Filter size={16} /> Filter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-left">
                <thead className="border-b border-[#E2E8F0] bg-[#F8F9FA]">
                  <tr>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Month</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Net Salary</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Status</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Payment Date</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Mode</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#6B7280]">
                        <Clock className="mx-auto mb-2 h-10 w-10 opacity-20" />
                        Loading salary history...
                      </td>
                    </tr>
                  ) : salaryHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#6B7280]">
                        <AlertTriangle className="mx-auto mb-2 h-10 w-10 opacity-20" />
                        No salary slips found.
                      </td>
                    </tr>
                  ) : (
                    salaryHistory.map((row) => (
                      <tr key={row._id} className="transition-colors hover:bg-[#F8F9FA]">
                        <td className="p-3">
                          <div className="font-bold text-[#1D1D1F]">{formatMonthYear(row.month, row.year)}</div>
                          <div className="text-xs text-[#6B7280]">Slip #{String(row._id).slice(-6)}</div>
                        </td>
                        <td className="p-3 font-bold text-[#223F74]">{formatCurrency(row.netSalary)}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getStatusTone(row.paymentStatus)}`}>
                            {String(row.paymentStatus || 'draft').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-[#4B5563]">{formatDate(row.paymentDate)}</td>
                        <td className="p-3 text-sm text-[#4B5563]">{formatPaymentMode(row.paymentMode)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleViewSalarySlip(row)}
                            className="rounded-lg bg-[#F4F7FB] px-4 py-2 text-sm font-bold text-[#223F74] transition-colors hover:bg-[#223F74] hover:text-white"
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1F]">Payment Trend</h2>
                <p className="text-sm text-[#6B7280]">Last six months from the summary endpoint.</p>
              </div>
              <BarChartPlaceholder />
            </div>
            {recentTrend.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {recentTrend.map((item) => (
                  <div key={`${item.year}-${item.month}`} className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
                    <p className="text-sm font-bold text-[#1D1D1F]">{MONTHS[(Number(item.month) || 1) - 1] || item.month} {item.year}</p>
                    <p className="mt-2 text-2xl font-black text-[#223F74]">{formatCurrency(item.amount)}</p>
                    <div className="mt-3 h-2 rounded-full bg-[#E2E8F0]">
                      <div className="h-2 rounded-full bg-[#223F74]" style={{ width: `${Math.min(100, Math.max(15, (Number(item.amount || 0) / Math.max(stats.totalEarnings || 1, 1)) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E2E8F0] p-6 text-center text-sm text-[#6B7280]">
                No trend data available yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1D1D1F]">Quick Summary</h2>
            <p className="text-sm text-[#6B7280]">Most recent backend values.</p>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Latest Paid Slip" value={formatCurrency(salarySummary?.lastMonthPaid || currentSlip?.netSalary)} />
              <SummaryRow label="Latest Status" value={String(salarySummary?.paymentStatus || currentSlip?.paymentStatus || 'draft').toUpperCase()} />
              <SummaryRow label="Latest Period" value={salarySummary?.lastMonthDate ? formatMonthYear(salarySummary.lastMonthDate.month, salarySummary.lastMonthDate.year) : '—'} />
              <SummaryRow label="Available Slips" value={String(salaryHistory.length)} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1D1D1F]">
              <UserCheck size={18} className="text-[#223F74]" /> Resignation
            </h2>
            {!resignation ? (
              <>
                <p className="mt-1 text-sm text-[#6B7280]">Submit a resignation request to the school administration.</p>
                <button
                  onClick={() => setIsResignationModalOpen(true)}
                  className="mt-4 w-full rounded-xl bg-[#D66B5F] px-4 py-3 font-bold text-white transition-colors hover:bg-[#c05d52]"
                >
                  Apply for Resignation
                </button>
              </>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Status:</span>
                  <span className={`font-bold ${
                    resignation.status === 'Approved' ? 'text-emerald-600' :
                    resignation.status === 'Rejected' ? 'text-rose-600' :
                    resignation.status === 'Withdrawn' ? 'text-slate-500' : 'text-amber-500'
                  }`}>{resignation.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Applied Date:</span>
                  <span className="font-semibold text-[#1D1D1F]">{formatDate(resignation.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Last Day:</span>
                  <span className="font-semibold text-[#1D1D1F]">{formatDate(resignation.lastDay)}</span>
                </div>
                {resignation.status === 'Pending' && (
                  <button
                    onClick={handleWithdrawResignation}
                    disabled={submittingResignation}
                    className="mt-4 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    {submittingResignation ? 'Withdrawing...' : 'Withdraw Request'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSlipLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-2xl">
            <p className="text-sm font-semibold text-[#1D1D1F]">Loading salary slip...</p>
          </div>
        </div>
      )}

      {selectedSlip && (
        <PrintableSlip
          slip={selectedSlip}
          onClose={() => setSelectedSlip(null)}
          onPrint={() => handlePrintSalarySlip(selectedSlip)}
          onDownload={() => handleDownloadSalarySlip(selectedSlip)}
        />
      )}

      {isResignationModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] p-5">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-[#223F74]">
                  <AlertCircle size={18} /> Apply for Resignation
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">Submit your formal resignation request.</p>
              </div>
              <button onClick={() => setIsResignationModalOpen(false)} className="rounded-xl p-2 transition-colors hover:bg-[#F4F7FB]">
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="font-bold">Important Notice</p>
                <p className="mt-1 text-rose-600">This action will submit a formal resignation request to the school administration for review.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Reason for Resignation"
                  value={resignationForm.reason}
                  onChange={(value) => setResignationForm((current) => ({ ...current, reason: value }))}
                  textarea
                  rows={4}
                  placeholder="Please provide your reason..."
                />
                <Field
                  label="Proposed Last Working Date"
                  value={resignationForm.lastDate}
                  onChange={(value) => setResignationForm((current) => ({ ...current, lastDate: value }))}
                  type="date"
                />
                <Field
                  label="Additional Remarks (Optional)"
                  value={resignationForm.remarks}
                  onChange={(value) => setResignationForm((current) => ({ ...current, remarks: value }))}
                  textarea
                  rows={3}
                  placeholder="Any additional remarks..."
                  className="md:col-span-2"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsResignationModalOpen(false)}
                  className="w-full rounded-xl px-5 py-2.5 font-bold text-[#6B7280] transition-colors hover:bg-[#F8F9FA] sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResignation}
                  disabled={submittingResignation}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#223F74] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#1a3059] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Send size={16} />
                  {submittingResignation ? 'Submitting...' : 'Submit Resignation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-5 right-5 z-[10001] rounded-full bg-[#223F74] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#223F74]/20">
          Loading salary data...
        </div>
      )}
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-sm">
    <span className="font-semibold text-[#4B5563]">{label}</span>
    <span className="font-bold text-[#223F74]">{value}</span>
  </div>
);

const Field = ({ label, value, onChange, textarea = false, rows = 3, placeholder = '', type = 'text', className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-sm font-bold text-[#4B5563]">{label}</span>
    {textarea ? (
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#223F74] focus:bg-white"
      />
    )}
  </label>
);

const BarChartPlaceholder = () => (
  <div className="inline-flex items-center gap-2 rounded-full bg-[#F4F7FB] px-3 py-1 text-xs font-bold text-[#223F74]">
    <CalendarDays size={12} /> Live data
  </div>
);

export default HRMSalary;