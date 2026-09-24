// SalaryAndPayout.jsx - Connected to Backend Salary Modules
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Edit, Trash2, Eye, Copy, Calendar, Clock, 
    Users, BookOpen, CheckCircle, XCircle, AlertCircle,
    RefreshCw, FileText, Download, Search, Filter,
    ChevronDown, ChevronUp, Settings, BarChart,
    PlayCircle, PauseCircle, Send, HelpCircle,
    Upload, Link, Hash, List, Grid3x3, Menu,
    Zap, Award, Target, Sparkles, Crown, Star,
    TrendingUp, TrendingDown, PieChart, Activity,
    Award as AwardIcon, Medal, Star as StarIcon,
    User, GraduationCap, Clipboard, PenTool,
    Save, Printer, Mail, ExternalLink, Maximize2,
    Minimize2, Check, X, AlertTriangle, UserPlus,
    UserCheck as UserCheckIcon, UserX as UserXIcon,
    ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
    FileCheck, FileSpreadsheet, FileBarChart, FileOutput,
    Trophy, Medal as MedalIcon, Crown as CrownIcon,
    Phone, Mail as MailIcon, MapPin, Briefcase, CalendarDays,
    Activity as ActivityIcon, Award as AwardTrophy,
    Wallet, CreditCard, Banknote, PiggyBank, Receipt,
    DollarSign, Coins, Landmark, Building2, Shield,
    AlertOctagon, BadgeCheck, Clock as ClockIcon,
    Smartphone, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import {
    Grid,
    Heading,
    Button,
    DataTable,
    DashCard,
    Modal,
    openModal,
    closeModal,
    PanelModal,
    DataField,
    Label,
    Select,
    Option,
    P,
    ModalData,
    ModalGrid,
    ModalProfile,
    ToggleButton,
    GColumnChart,
    GDoughnutChart,
    GLineChart,
    GBarChart,
    GAreaChart,
} from '../../../components/shared/Common_Components';
import {
    getSalarySummary,
    getSalaryHistory,
    getSalaryAnalytics
} from '../../../services/api/subjectTeacherSalaryApi';

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
});
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
};

// ── Constants ─────────────────────────────────────────────────
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PAYMENT_STATUS = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    on_hold: 'On Hold',
    draft: 'Draft',
    approved: 'Approved',
    paid: 'Paid',
    held: 'Held'
};

const PAYMENT_METHODS = {
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    cash: 'Cash',
    online: 'Online Transfer',
    upi: 'UPI',
    salary_account: 'Salary Account',
    razorpay: 'Razorpay'
};

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        processing: 'bg-blue-100 text-blue-700 border-blue-200',
        completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        approved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        failed: 'bg-rose-100 text-rose-700 border-rose-200',
        cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
        on_hold: 'bg-orange-100 text-orange-700 border-orange-200',
        held: 'bg-orange-100 text-orange-700 border-orange-200',
        draft: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    const icons = {
        pending: <ClockIcon size={10} />,
        processing: <Settings size={10} />,
        completed: <CheckCircle size={10} />,
        paid: <CheckCircle size={10} />,
        approved: <CheckCircle size={10} />,
        failed: <XCircle size={10} />,
        cancelled: <X size={10} />,
        on_hold: <AlertCircle size={10} />,
        held: <AlertCircle size={10} />,
        draft: <ClockIcon size={10} />
    };
    const label = PAYMENT_STATUS[status] || status;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.pending}`}>
            {icons[status]} {label}
        </span>
    );
};

// ── Printable Salary Slip Component ─────────────────────────────
const PrintableSlip = ({ slip, onClose }) => {
    const printRef = useRef();

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Salary Slip</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family: Arial, sans-serif; color: #1D1D1F; }
                .slip { max-width: 700px; margin: 32px auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px; }
                .header { background: #223F74; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
                .header h1 { font-size: 20px; font-weight: 900; }
                .header p { font-size: 12px; opacity: 0.7; margin-top: 4px; }
                .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F4F7FB; font-size: 13px; }
                .row:last-child { border: none; }
                .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin: 16px 0 8px; }
                .net { background: #223F74; color: white; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 16px; font-weight: bold; font-size: 16px; }
                .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
                .approved { background: #D1FAE5; color: #065F46; }
                .draft { background: #FEF3C7; color: #92400E; }
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .box { background: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
                @media print { body { margin: 0; } .slip { border: none; margin: 0; padding: 24px; } }
            </style>
            </head><body><div class="slip">${content}</div></body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    const monthName = MONTHS[parseInt(slip.month) - 1] || slip.month;
    const allowancesTotal = Array.isArray(slip.allowances) ? slip.allowances.reduce((acc, a) => acc + a.amount, 0) : 0;
    const deductionsTotal = Array.isArray(slip.deductions) ? slip.deductions.reduce((acc, d) => acc + d.amount, 0) : 0;
    const totalEarnings = (slip.basicSalary || 0) + allowancesTotal + (slip.overtime || 0) + (slip.bonus || 0);

    return (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-2xl my-4">
                <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
                    <h3 className="font-bold text-[#223F74] flex items-center gap-2">
                        <FileText size={18} /> Salary Slip — {monthName} {slip.year}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#223F74] hover:bg-[#1A2F56] text-white font-bold text-sm transition-all shadow-md">
                            <Printer size={15} /> Print / Download
                        </button>
                        <button onClick={onClose}
                            className="p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                            <X size={18} className="text-[#6B7280]" />
                        </button>
                    </div>
                </div>

                <div ref={printRef} className="p-8">
                    <div className="header bg-[#223F74] text-white p-6 rounded-xl mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-black">Salary Slip</h1>
                                <p className="text-sm text-white/70 mt-1">{monthName} {slip.year}</p>
                            </div>
                            <span className="badge approved text-xs font-black uppercase px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200">
                                {slip.paymentStatus}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Employee</p>
                                <p className="font-bold text-white">Subject Teacher</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Designation</p>
                                <p className="font-bold text-white capitalize">Teacher</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid2 grid grid-cols-2 gap-6 mb-6">
                        <div className="box bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <p className="section-title text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-3">Earnings</p>
                            <div className="space-y-2">
                                <div className="row flex justify-between text-sm py-1 border-b border-emerald-100">
                                    <span className="text-[#6B7280]">Basic Salary</span>
                                    <span className="font-bold">{formatCurrency(slip.basicSalary)}</span>
                                </div>
                                {Array.isArray(slip.allowances) && slip.allowances.map((allow, idx) => (
                                    <div key={idx} className="row flex justify-between text-sm py-1 border-b border-emerald-100">
                                        <span className="text-[#6B7280]">{allow.name}</span>
                                        <span className="font-bold">{formatCurrency(allow.amount)}</span>
                                    </div>
                                ))}
                                {slip.overtime > 0 && (
                                    <div className="row flex justify-between text-sm py-1 border-b border-emerald-100">
                                        <span className="text-[#6B7280]">Overtime</span>
                                        <span className="font-bold">{formatCurrency(slip.overtime)}</span>
                                    </div>
                                )}
                                {slip.bonus > 0 && (
                                    <div className="row flex justify-between text-sm py-1 border-b border-emerald-100">
                                        <span className="text-[#6B7280]">Bonus</span>
                                        <span className="font-bold">{formatCurrency(slip.bonus)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black pt-2">
                                    <span>Total Earnings</span>
                                    <span className="text-emerald-600">{formatCurrency(totalEarnings)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-rose-50 border border-rose-100 rounded-xl p-4">
                            <p className="section-title text-rose-700 text-[10px] font-black uppercase tracking-wider mb-3">Deductions</p>
                            <div className="space-y-2">
                                {Array.isArray(slip.deductions) && slip.deductions.map((deduct, idx) => (
                                    <div key={idx} className="row flex justify-between text-sm py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">{deduct.name}</span>
                                        <span className="font-bold">{formatCurrency(deduct.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-black pt-2">
                                    <span>Total Deductions</span>
                                    <span className="text-rose-600">{formatCurrency(deductionsTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="net bg-[#223F74] text-white p-5 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">Net Payable Salary</p>
                            <p className="text-2xl font-black">{formatCurrency(slip.netSalary)}</p>
                        </div>
                        <div className="text-right text-sm text-white/70">
                            <p>Mode: {PAYMENT_METHODS[slip.paymentMethod] || slip.paymentMethod || 'Bank Transfer'}</p>
                        </div>
                    </div>

                    <p className="text-[10px] text-[#9CA3AF] text-center mt-6">
                        This is a computer-generated salary slip. No signature required.
                    </p>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────
// Global module-level cache for Salary & Payout
let cachedStats = null;
let cachedSalaryData = null;
let cachedSalaryHistory = null;
let cachedPayoutRequests = null;
let cachedAnalyticsData = null;
let cachedUserId = "";
let cachedSchoolId = "";
let cachedOrgId = "";
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// ── Main Component ────────────────────────────────────────────
const SalaryAndPayout = () => {
    const authUser = useSelector((state) => state.teacherAuth?.teacher || state.auth?.user);
    const userId = authUser?._id || authUser?.id || "";
    const schoolId = authUser?.school?._id || authUser?.school || "";
    const orgId = authUser?.school?.organization?._id || authUser?.school?.organization || authUser?.organization || "";

    const contextChanged = userId !== cachedUserId || schoolId !== cachedSchoolId || orgId !== cachedOrgId;

    if (contextChanged) {
        cachedStats = null;
        cachedSalaryData = null;
        cachedSalaryHistory = null;
        cachedPayoutRequests = null;
        cachedAnalyticsData = null;
        cachedUserId = userId;
        cachedSchoolId = schoolId;
        cachedOrgId = orgId;
        lastFetchTime = 0;
    }

    const [loading, setLoading] = useState(!cachedStats);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [activeTab, setActiveTab] = useState('salary');
    const [showPrint, setShowPrint] = useState(false);
    const [selectedSlip, setSelectedSlip] = useState(null);

    const slipPrintRef = useRef(null);

    const handlePrintSlip = () => {
        if (!slipPrintRef.current) return;
        const content = slipPrintRef.current.innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Salary Slip</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family: Arial, sans-serif; color: #1D1D1F; }
                .slip { max-width: 700px; margin: 32px auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px; }
                .header { background: #223F74; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
                .header h1 { font-size: 20px; font-weight: 900; }
                .header p { font-size: 12px; opacity: 0.7; margin-top: 4px; }
                .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F4F7FB; font-size: 13px; }
                .row:last-child { border: none; }
                .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin: 16px 0 8px; }
                .net { background: #223F74; color: white; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 16px; font-weight: bold; font-size: 16px; }
                .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
                .approved { background: #D1FAE5; color: #065F46; }
                .draft { background: #FEF3C7; color: #92400E; }
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .box { background: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
                @media print { body { margin: 0; } .slip { border: none; margin: 0; padding: 24px; } }
            </style>
            </head><body><div class="slip">${content}</div></body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    // ── Stats ──────────────────────────────────────────────────
    const [stats, setStats] = useState(cachedStats || {
        totalEarned: 0,
        currentSalary: 0,
        pendingPayments: 0,
        totalPaid: 0,
        totalDeductions: 0,
        netPayable: 0,
        paymentCount: 0,
        upcomingPayments: 0,
    });

    // ── Data ──────────────────────────────────────────────────
    const [salaryData, setSalaryData] = useState(cachedSalaryData || {
        basic: 0,
        hra: 0,
        da: 0,
        ta: 0,
        medical: 0,
        education: 0,
        special: 0,
        bonus: 0,
        incentives: 0,
        overtime: 0,
        pf: 0,
        tax: 0,
        insurance: 0,
        others: 0,
    });

    const [salaryHistory, setSalaryHistory] = useState(cachedSalaryHistory || []);
    const [payoutRequests, setPayoutRequests] = useState(cachedPayoutRequests || []);
    const [analyticsData, setAnalyticsData] = useState(cachedAnalyticsData || { trends: [], yearlySummary: [] });

    const isFirstLoad = !cachedStats;

    // ── Fetch Data ─────────────────────────────────────────────
    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        const isFirstLoad = !cachedStats;
        if (!force && !isFirstLoad && (now - lastFetchTime < CACHE_DURATION)) {
            return;
        }
        if (isFirstLoad) {
            setLoading(true);
        }
        try {
            const [summaryRes, historyRes, analyticsRes] = await Promise.all([
                getSalarySummary(),
                getSalaryHistory({ limit: 100 }),
                getSalaryAnalytics()
            ]);

            if (summaryRes?.success && summaryRes.data) {
                const summary = summaryRes.data;
                const newStats = {
                    totalEarned: summary.totalEarned,
                    currentSalary: summary.currentSalary,
                    pendingPayments: summary.pendingPayments,
                    totalPaid: summary.totalPaid,
                    totalDeductions: summary.totalDeductions,
                    netPayable: summary.netPayable,
                    paymentCount: summary.paymentCount,
                    upcomingPayments: summary.upcomingPayments,
                };
                setStats(newStats);
                cachedStats = newStats;

                if (summary.breakdown) {
                    setSalaryData(summary.breakdown);
                    cachedSalaryData = summary.breakdown;
                }
            }

            if (historyRes?.success && historyRes.data) {
                setSalaryHistory(historyRes.data);
                cachedSalaryHistory = historyRes.data;
                
                // Construct Payout History records
                const payouts = historyRes.data.filter(s => s.paymentStatus === 'paid').map(s => ({
                    id: s.id || s._id,
                    requestedDate: s.paymentDate || s.createdAt,
                    amount: s.netSalary,
                    method: s.paymentMethod === '—' ? 'bank_transfer' : s.paymentMethod,
                    status: s.paymentStatus,
                    remarks: s.remarks,
                    approvedDate: s.updatedAt,
                    paidDate: s.paymentDate,
                    accountHolder: s.processedBy,
                    accountNumber: s.transactionId
                }));
                setPayoutRequests(payouts);
                cachedPayoutRequests = payouts;
            }

            if (analyticsRes?.success && analyticsRes.data) {
                setAnalyticsData(analyticsRes.data);
                cachedAnalyticsData = analyticsRes.data;
            }
            lastFetchTime = now;
        } catch (error) {
            toast.error(error.message || 'Failed to fetch salary details');
        } finally {
            if (isFirstLoad) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleViewPaymentDetails = (payment) => {
        setSelectedPayment(payment);
        openModal('payment-details-modal');
    };

    const handleDownloadSalaryReport = () => {
        if (salaryHistory.length === 0) {
            toast.error('No salary data to export');
            return;
        }

        const headers = ['Month', 'Gross Salary', 'Total Deductions', 'Net Payable', 'Status', 'Payment Date'];
        const data = salaryHistory.map(s => ({
            'Month': `${MONTHS[s.month - 1]} ${s.year}`,
            'Gross Salary': formatCurrency(s.grossSalary),
            'Total Deductions': formatCurrency(s.grossSalary - s.netSalary),
            'Net Payable': formatCurrency(s.netSalary),
            'Status': s.paymentStatus.charAt(0).toUpperCase() + s.paymentStatus.slice(1),
            'Payment Date': s.paymentDate ? formatDate(s.paymentDate) : '—',
        }));

        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'salary_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Salary report downloaded successfully!');
    };

    const handleDownloadPayoutReport = () => {
        if (payoutRequests.length === 0) {
            toast.error('No payout data to export');
            return;
        }

        const headers = ['Request Date', 'Amount', 'Method', 'Status', 'Remarks', 'Approved Date'];
        const data = payoutRequests.map(p => ({
            'Request Date': formatDate(p.requestedDate),
            'Amount': formatCurrency(p.amount),
            'Method': PAYMENT_METHODS[p.method] || p.method,
            'Status': p.status.charAt(0).toUpperCase() + p.status.slice(1),
            'Remarks': p.remarks || '—',
            'Approved Date': p.approvedDate ? formatDate(p.approvedDate) : '—',
        }));

        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'payout_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Payout report downloaded successfully!');
    };

    // ── Table Columns ──────────────────────────────────────────
    const salaryColumns = [
        {
            key: 'month',
            label: 'Month',
            render: (val, row) => (
                <span className="font-bold text-[#1D1D1F]">{MONTHS[row.month - 1]} {row.year}</span>
            )
        },
        {
            key: 'grossSalary',
            label: 'Gross Salary',
            render: (val) => (
                <span className="text-emerald-600 font-bold">{formatCurrency(val)}</span>
            )
        },
        {
            key: 'totalDeductions',
            label: 'Deductions',
            render: (val, row) => {
                const totalDeds = Array.isArray(row.deductions) ? row.deductions.reduce((acc, d) => acc + d.amount, 0) : val;
                return <span className="text-rose-600 font-bold">{formatCurrency(totalDeds)}</span>;
            }
        },
        {
            key: 'netSalary',
            label: 'Net Payable',
            render: (val) => (
                <span className="text-[#223F74] font-bold text-base">{formatCurrency(val)}</span>
            )
        },
        {
            key: 'paymentStatus',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
        {
            key: 'paymentDate',
            label: 'Payment Date',
            render: (val) => val ? formatDate(val) : '—'
        },
    ];

    const salaryActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Salary Slip',
            variant: 'primary',
            onClick: (row) => {
                setSelectedSlip(row);
                openModal('salary-slip-modal');
            },
        },
    ];

    const payoutColumns = [
        {
            key: 'requestedDate',
            label: 'Payment Date',
            render: (val) => formatDate(val)
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (val) => (
                <span className="font-bold text-[#223F74]">{formatCurrency(val)}</span>
            )
        },
        {
            key: 'method',
            label: 'Method',
            render: (val) => PAYMENT_METHODS[val] || val
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
        {
            key: 'remarks',
            label: 'Remarks',
            render: (val) => val || '—'
        },
        {
            key: 'approvedDate',
            label: 'Approved Date',
            render: (val) => val ? formatDate(val) : '—'
        },
    ];

    const payoutActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewPaymentDetails(row),
        },
    ];

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        {
            title: 'Total Earned',
            value: formatCurrency(stats.totalEarned),
            icon: <Wallet size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Current Salary',
            value: formatCurrency(stats.currentSalary),
            icon: <Banknote size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Pending Payments',
            value: formatCurrency(stats.pendingPayments),
            icon: <ClockIcon size={20} />,
            accentColor: '#E0A04B',
        },
        {
            title: 'Total Paid',
            value: formatCurrency(stats.totalPaid),
            icon: <CreditCard size={20} />,
            accentColor: '#7A8FC6',
        },
    ];

    // ── Salary Breakdown Data ─────────────────────────────────
    const salaryBreakdownData = [
        { name: 'Basic Salary', value: salaryData.basic },
        { name: 'HRA', value: salaryData.hra },
        { name: 'DA', value: salaryData.da },
        { name: 'TA', value: salaryData.ta },
        { name: 'Medical', value: salaryData.medical },
        { name: 'Education', value: salaryData.education },
        { name: 'Special', value: salaryData.special },
        { name: 'Bonus', value: salaryData.bonus || 0 },
        { name: 'Incentives', value: salaryData.incentives || 0 },
        { name: 'Overtime', value: salaryData.overtime || 0 },
    ];

    const deductionData = [
        { name: 'PF', value: salaryData.pf },
        { name: 'Tax', value: salaryData.tax },
        { name: 'Insurance', value: salaryData.insurance },
        { name: 'Others', value: salaryData.others || 0 },
    ];

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="w-full space-y-8 pb-10 text-left font-sans">
            
            {/* ── Header ── */}
            <Heading
                primaryText="Salary & "
                secondaryText="Payout"
                showAnimations={true}
                size={12}
            />

            {salaryHistory.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm mt-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-[#223F74]">
                        <Wallet size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[#1D1D1F]">No Salary Records Found</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                        Your salary slips will be displayed here once processed by the accountant.
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Stats Cards ── */}
                    <div className='mt-6'>
                        <Grid cols={12} gap={4}>
                            {statCards.map((card, i) => (
                                <DashCard
                                    key={i}
                                    title={card.title}
                                    value={card.value}
                                    icon={card.icon}
                                    accentColor={card.accentColor}
                                    size={3}
                                />
                            ))}
                        </Grid>
                    </div>

                    {/* ── Quick Stats Row ── */}
                    <div className='mt-6'>
                        <Grid cols={12} gap={4}>
                            <div className="col-span-12">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-4 text-white">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Deductions</p>
                                        <p className="text-2xl font-black">{formatCurrency(stats.totalDeductions)}</p>
                                        <p className="text-xs opacity-70 mt-1">Lifetime deductions</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Net Payable</p>
                                        <p className="text-2xl font-black">{formatCurrency(stats.netPayable)}</p>
                                        <p className="text-xs opacity-70 mt-1">Pending payout balance</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Payment Count</p>
                                        <p className="text-2xl font-black">{stats.paymentCount}</p>
                                        <p className="text-xs opacity-70 mt-1">Total transactions</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Upcoming Payments</p>
                                        <p className="text-2xl font-black">{stats.upcomingPayments}</p>
                                        <p className="text-xs opacity-70 mt-1">Pending slips</p>
                                    </div>
                                </div>
                            </div>
                        </Grid>
                    </div>

                    {/* ── Tab Navigation ── */}
                    <div className='mt-6'>
                        <Grid cols={12} gap={3}>
                            <div className="col-span-12">
                                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5">
                                    {[
                                        { key: 'salary', label: 'Salary Details', icon: Wallet },
                                        { key: 'payouts', label: 'Payout History', icon: Banknote },
                                        { key: 'analytics', label: 'Analytics', icon: BarChart },
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                                activeTab === key
                                                    ? 'bg-gradient-to-r from-[#223F74] to-[#2A4A82] text-white shadow-lg shadow-[#223F74]/25'
                                                    : 'text-[#6B7280] hover:bg-[#F4F7FB] hover:text-[#223F74]'
                                            }`}
                                        >
                                            <Icon size={16} /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Grid>
                    </div>

                    {isFirstLoad && loading ? (
                        <div className="w-full py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm mt-6">
                            <Loader2 className="animate-spin text-[#223F74]" size={32} />
                            <p className="text-[#223F74] font-black text-sm tracking-wide">
                                Loading Payout Details...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1 — SALARY DETAILS */}
                            {activeTab === 'salary' && (
                        <div className='mt-6'>
                            <Grid cols={12} gap={4}>
                                <div className="col-span-12 md:col-span-6">
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PieChart size={16} className="text-[#223F74]" />
                                            <p className="font-bold text-sm text-[#1D1D1F]">Salary Breakdown</p>
                                        </div>
                                        <div className="space-y-2">
                                            {salaryBreakdownData.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-[#6B7280]">{item.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-[#223F74] rounded-full"
                                                                style={{ width: `${salaryData.basic > 0 ? (item.value / salaryData.basic) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-[#223F74]">{formatCurrency(item.value)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="border-t border-[#E2E8F0] pt-2 mt-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-[#1D1D1F]">Gross Salary</span>
                                                    <span className="text-sm font-bold text-emerald-600">
                                                        {formatCurrency(salaryBreakdownData.reduce((acc, item) => acc + item.value, 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle size={16} className="text-[#223F74]" />
                                            <p className="font-bold text-sm text-[#1D1D1F]">Deductions Breakdown</p>
                                        </div>
                                        <div className="space-y-2">
                                            {deductionData.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-[#6B7280]">{item.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-rose-500 rounded-full"
                                                                style={{ width: `${salaryData.basic > 0 ? (item.value / salaryData.basic) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-rose-600">{formatCurrency(item.value)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="border-t border-[#E2E8F0] pt-2 mt-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-[#1D1D1F]">Total Deductions</span>
                                                    <span className="text-sm font-bold text-rose-600">
                                                        {formatCurrency(deductionData.reduce((acc, item) => acc + item.value, 0))}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-[#F8F9FA] rounded-lg p-2 flex items-center justify-between">
                                                <span className="text-sm font-bold text-[#1D1D1F]">Net Salary</span>
                                                <span className="text-lg font-black text-emerald-600">
                                                    {formatCurrency(
                                                        salaryBreakdownData.reduce((acc, item) => acc + item.value, 0) -
                                                        deductionData.reduce((acc, item) => acc + item.value, 0)
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-12">
                                    <DataTable
                                        columns={salaryColumns}
                                        rows={salaryHistory}
                                        actions={salaryActions}
                                        title="Salary History"
                                        pageSize={5}
                                        pageSizeOptions={[5, 10, 20]}
                                        searchable={true}
                                        exportable={true}
                                        exportFileName="salary_history"
                                        loading={isFirstLoad && loading}
                                        filters={[
                                            {
                                                title: 'Status',
                                                type: 'toggle',
                                                key: 'paymentStatus',
                                                options: ['draft', 'approved', 'paid', 'held']
                                            },
                                        ]}
                                        date={true}
                                        defaultSortKey="month"
                                        defaultSortDir="desc"
                                        headerAction={
                                            <Button
                                                text="Download Report"
                                                variant="success"
                                                size={0}
                                                icon={<Download size={14} />}
                                                onClick={handleDownloadSalaryReport}
                                            />
                                        }
                                    />
                                </div>
                            </Grid>
                        </div>
                    )}

                    {/* TAB 2 — PAYOUT HISTORY */}
                    {activeTab === 'payouts' && (
                        <div className='mt-6'>
                            <Grid cols={12} gap={4}>
                                <div className="col-span-12">
                                    <DataTable
                                        columns={payoutColumns}
                                        rows={payoutRequests}
                                        actions={payoutActions}
                                        title="Payout History"
                                        pageSize={10}
                                        pageSizeOptions={[5, 10, 20, 50]}
                                        searchable={true}
                                        exportable={true}
                                        exportFileName="payout_history"
                                        loading={isFirstLoad && loading}
                                        filters={[
                                            {
                                                title: 'Status',
                                                type: 'toggle',
                                                key: 'status',
                                                options: ['draft', 'approved', 'paid', 'held']
                                            },
                                            {
                                                title: 'Method',
                                                type: 'select',
                                                key: 'method',
                                                options: Object.keys(PAYMENT_METHODS)
                                            },
                                        ]}
                                        date={true}
                                        defaultSortKey="requestedDate"
                                        defaultSortDir="desc"
                                        headerAction={
                                            <div className="flex gap-2">
                                                <Button
                                                    text="Download Report"
                                                    variant="success"
                                                    size={0}
                                                    icon={<Download size={14} />}
                                                    onClick={handleDownloadPayoutReport}
                                                />
                                            </div>
                                        }
                                    />
                                </div>

                                <div className="col-span-12">
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CreditCard size={16} className="text-[#223F74]" />
                                            <p className="font-bold text-sm text-[#1D1D1F]">Payment Methods</p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                                                <div key={key} className="flex items-center gap-2 p-2 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                                    <div className="w-8 h-8 rounded-lg bg-[#223F74]/10 flex items-center justify-center flex-shrink-0">
                                                        {key === 'bank_transfer' && <Landmark size={14} className="text-[#223F74]" />}
                                                        {key === 'cheque' && <FileText size={14} className="text-[#223F74]" />}
                                                        {key === 'cash' && <Banknote size={14} className="text-[#223F74]" />}
                                                        {key === 'online' && <Building2 size={14} className="text-[#223F74]" />}
                                                        {key === 'upi' && <Smartphone size={14} className="text-[#223F74]" />}
                                                        {key === 'salary_account' && <Wallet size={14} className="text-[#223F74]" />}
                                                        {key === 'razorpay' && <CreditCard size={14} className="text-[#223F74]" />}
                                                    </div>
                                                    <span className="text-xs font-semibold text-[#1D1D1F] truncate">{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Grid>
                        </div>
                    )}

                    {/* TAB 3 — ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className='mt-6'>
                            <Grid cols={12} gap={4}>
                                <div className="col-span-12">
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-[#223F74]">Salary Analytics</h3>
                                                <p className="text-xs text-slate-500">Overview of your salary trends and earnings</p>
                                            </div>
                                            <Button
                                                text="Download Report"
                                                variant="primary"
                                                size={0}
                                                icon={<Download size={14} />}
                                                onClick={handleDownloadSalaryReport}
                                            />
                                        </div>

                                        {/* Summary Stats */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Avg Monthly Salary</p>
                                                <p className="text-2xl font-black text-[#223F74]">
                                                    {formatCurrency(salaryHistory.length > 0 ? stats.totalEarned / salaryHistory.length : 0)}
                                                </p>
                                            </div>
                                            <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Highest Salary</p>
                                                <p className="text-2xl font-black text-emerald-600">
                                                    {formatCurrency(salaryHistory.length > 0 ? Math.max(...salaryHistory.map(s => s.netSalary || s.netPayable || 0)) : 0)}
                                                </p>
                                            </div>
                                            <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Payouts</p>
                                                <p className="text-2xl font-black text-[#223F74]">{payoutRequests.length}</p>
                                            </div>
                                            <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Avg Deduction</p>
                                                <p className="text-2xl font-black text-rose-600">
                                                    {formatCurrency(salaryHistory.length > 0 ? stats.totalDeductions / salaryHistory.length : 0)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dynamic Reusable Area Chart */}
                                        <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                            <GAreaChart
                                                title="Earnings & Payouts Trend"
                                                subtitle="Monthly gross earnings, deductions, and net payout distribution"
                                                data={analyticsData?.trends || []}
                                                areas={[
                                                    { key: "earnings", label: "Gross Earnings", color: "#223F74" },
                                                    { key: "payouts", label: "Net Payouts", color: "#10B981" },
                                                    { key: "deductions", label: "Deductions", color: "#EF4444" }
                                                ]}
                                                size={12}
                                            />
                                        </div>

                                        {/* Earnings Distribution */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <PieChart size={16} className="text-[#223F74]" />
                                                    <h4 className="font-bold text-sm text-[#1D1D1F]">Earnings Distribution</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    {salaryBreakdownData.slice(0, 6).map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-[#6B7280]">{item.name}</span>
                                                            <span className="text-xs font-bold text-[#223F74]">{formatCurrency(item.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertCircle size={16} className="text-[#223F74]" />
                                                    <h4 className="font-bold text-sm text-[#1D1D1F]">Deductions Distribution</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    {deductionData.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-[#6B7280]">{item.name}</span>
                                                            <span className="text-xs font-bold text-rose-600">{formatCurrency(item.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Grid>
                        </div>
                    )}
                        </>
                    )}
                </>
            )}

            {/* ── Modals ── */}

            {/* Payment Details PanelModal */}
            <PanelModal id="payment-details-modal" title="Payment Details" size="lg">
                {selectedPayment && (
                    <div className="space-y-4 text-left font-sans">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <Receipt size={24} />
                            </div>
                            <div className="flex-1 text-white text-left">
                                <p className="text-lg font-bold">Payout #{selectedPayment.id}</p>
                                <p className="text-sm text-slate-300">{formatDate(selectedPayment.requestedDate)}</p>
                            </div>
                            <StatusBadge status={selectedPayment.status} />
                        </div>

                        <ModalGrid title="Payment Information" cols={2}>
                            <ModalData label="Amount" value={formatCurrency(selectedPayment.amount)} />
                            <ModalData label="Method" value={PAYMENT_METHODS[selectedPayment.method] || selectedPayment.method} />
                            <ModalData label="Status" value={PAYMENT_STATUS[selectedPayment.status] || selectedPayment.status} />
                            <ModalData label="Payment Date" value={formatDate(selectedPayment.requestedDate)} />
                            {selectedPayment.approvedDate && (
                                <ModalData label="Approved Date" value={formatDate(selectedPayment.approvedDate)} />
                            )}
                            {selectedPayment.paidDate && (
                                <ModalData label="Paid Date" value={formatDate(selectedPayment.paidDate)} />
                            )}
                            {selectedPayment.accountHolder && (
                                <ModalData label="Recipient" value={selectedPayment.accountHolder} />
                            )}
                            {selectedPayment.accountNumber && (
                                <ModalData label="Reference/TXN ID" value={selectedPayment.accountNumber} />
                            )}
                        </ModalGrid>

                        {selectedPayment.remarks && (
                            <ModalGrid title="Remarks" cols={1}>
                                <ModalData label="Remarks" value={selectedPayment.remarks} />
                            </ModalGrid>
                        )}

                        <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('payment-details-modal')}
                            />
                        </div>
                    </div>
                )}
            </PanelModal>

            {/* Salary Slip Details PanelModal */}
            <PanelModal id="salary-slip-modal" title="Salary Slip Details" size="lg">
                {selectedSlip && (
                    <div className="space-y-4 text-left font-sans">
                        <div ref={slipPrintRef} className="p-4 border border-[#E2E8F0] rounded-2xl bg-white">
                            <div className="header bg-[#223F74] text-white p-6 rounded-xl mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-xl font-black">Salary Slip</h1>
                                        <p className="text-sm text-slate-300 mt-1">{MONTHS[parseInt(selectedSlip.month) - 1]} {selectedSlip.year}</p>
                                    </div>
                                    <span className="badge approved text-xs font-black uppercase px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200">
                                        {selectedSlip.paymentStatus}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Employee</p>
                                        <p className="font-bold text-white">Subject Teacher</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Designation</p>
                                        <p className="font-bold text-white capitalize">Teacher</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="box bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                                    <p className="text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-3">Earnings</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm py-1 border-b border-emerald-100">
                                            <span className="text-[#6B7280]">Basic Salary</span>
                                            <span className="font-bold">{formatCurrency(selectedSlip.basicSalary)}</span>
                                        </div>
                                        {Array.isArray(selectedSlip.allowances) && selectedSlip.allowances.map((allow, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-emerald-100">
                                                <span className="text-[#6B7280]">{allow.name}</span>
                                                <span className="font-bold">{formatCurrency(allow.amount)}</span>
                                            </div>
                                        ))}
                                        {selectedSlip.overtime > 0 && (
                                            <div className="flex justify-between text-sm py-1 border-b border-emerald-100">
                                                <span className="text-[#6B7280]">Overtime</span>
                                                <span className="font-bold">{formatCurrency(selectedSlip.overtime)}</span>
                                            </div>
                                        )}
                                        {selectedSlip.bonus > 0 && (
                                            <div className="flex justify-between text-sm py-1 border-b border-emerald-100">
                                                <span className="text-[#6B7280]">Bonus</span>
                                                <span className="font-bold">{formatCurrency(selectedSlip.bonus)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-black pt-2">
                                            <span>Total Earnings</span>
                                            <span className="text-emerald-600">
                                                {formatCurrency(
                                                    (selectedSlip.basicSalary || 0) +
                                                    (Array.isArray(selectedSlip.allowances) ? selectedSlip.allowances.reduce((acc, a) => acc + a.amount, 0) : 0) +
                                                    (selectedSlip.overtime || 0) +
                                                    (selectedSlip.bonus || 0)
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="box bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                                    <p className="text-rose-700 text-[10px] font-black uppercase tracking-wider mb-3">Deductions</p>
                                    <div className="space-y-2">
                                        {Array.isArray(selectedSlip.deductions) && selectedSlip.deductions.map((deduct, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-rose-100">
                                                <span className="text-[#6B7280]">{deduct.name}</span>
                                                <span className="font-bold">{formatCurrency(deduct.amount)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-black pt-2">
                                            <span>Total Deductions</span>
                                            <span className="text-rose-600">
                                                {formatCurrency(
                                                    Array.isArray(selectedSlip.deductions) ? selectedSlip.deductions.reduce((acc, d) => acc + d.amount, 0) : 0
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="net bg-[#223F74] text-white p-5 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-white/60 uppercase tracking-wider">Net Payable Salary</p>
                                    <p className="text-2xl font-black">{formatCurrency(selectedSlip.netSalary)}</p>
                                </div>
                                <div className="text-right text-sm text-white/70">
                                    <p>Mode: {PAYMENT_METHODS[selectedSlip.paymentMethod] || selectedSlip.paymentMethod || 'Bank Transfer'}</p>
                                    {selectedSlip.paymentDate && (
                                        <p className="text-xs mt-1">Paid: {formatDate(selectedSlip.paymentDate)}</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-[10px] text-[#9CA3AF] text-center mt-6">
                                This is a computer-generated salary slip. No signature required.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                            <Button
                                text="Print"
                                variant="primary"
                                size={0}
                                icon={<Printer size={14} />}
                                onClick={handlePrintSlip}
                            />
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('salary-slip-modal')}
                            />
                        </div>
                    </div>
                )}
            </PanelModal>

        </div>
    );
};

export default SalaryAndPayout;