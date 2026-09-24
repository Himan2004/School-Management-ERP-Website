import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
    CircleDollarSign,
    Hourglass,
    BarChart3,
    AlertCircle,
    Clock,
    XCircle,
    CalendarDays,
    Settings,
    Eye,
    FileText,
    User,
    Phone,
    Mail,
    Users,
    UserCheck,
    ChevronDown
} from 'lucide-react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';
import {
    getDashboardStats,
    getRecentTransactions,
    getMonthlyChartData,
    getAllTransactions,
    getStudentTransactionReport,
} from '../../services/AccountantDashboard';
import {
    DashGrid,
    EnhancedDashCard,
    Heading,
    DataTable,
    PanelModal,
    Button,
    Grid,
    ModalData,
    ModalGrid,
    ModalProfile
} from '../../components/shared/Common_Components';

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1D1D1F] backdrop-blur-md rounded-xl shadow-2xl border border-slate-700 p-4">
            <p className="text-[10px] font-black text-[#F59B87] uppercase tracking-[0.2em] mb-2">
                {label} Report
            </p>
            <div className="space-y-2">
                <div className="flex justify-between gap-10 items-center">
                    <span className="text-xs font-medium text-slate-300">Actual Collection</span>
                    <span className="text-sm font-black text-white">
                        ₹{((payload[0]?.value || 0) / 1000).toFixed(1)}k
                    </span>
                </div>
                <div className="flex justify-between gap-10 items-center">
                    <span className="text-xs font-medium text-slate-400">Target Goal</span>
                    <span className="text-sm font-black text-[#F59B87]">
                        ₹{((payload[1]?.value || 0) / 1000).toFixed(1)}k
                    </span>
                </div>
            </div>
        </div>
    );
};

// ── Student Report Modal ──────────────────────────────────────
// Receives already-fetched `reportData` — no API call inside.
const StudentReportModal = ({ reportData, loading, error, onClose }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-[#223F74]/20 border-t-[#223F74] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <p className="text-rose-600 font-semibold">{error}</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-[#223F74] text-white rounded-xl">
                    Close
                </button>
            </div>
        );
    }

    const { student: studentInfo, summary, transactions } = reportData || {};

    if (!studentInfo) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">No student data available</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-[#223F74] text-white rounded-xl">
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Student profile banner */}
            <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-2xl text-white">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl border-2 border-white/30">
                        {studentInfo?.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold">{studentInfo?.name || 'Unknown'}</h3>
                        <p className="text-sm text-white/80">
                            Roll No: {studentInfo?.rollNo || 'N/A'} • {studentInfo?.admissionNo || 'N/A'}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                                Class {studentInfo?.class || 'N/A'} - {studentInfo?.section || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Parent & contact */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { icon: <User size={14} />, label: 'Father',  value: studentInfo?.fatherName  || 'N/A' },
                    { icon: <User size={14} />, label: 'Mother',  value: studentInfo?.motherName  || 'N/A' },
                    { icon: <Phone size={14} />, label: 'Contact', value: studentInfo?.parentPhone || studentInfo?.phone || 'N/A' },
                    { icon: <Mail size={14} />,  label: 'Email',   value: studentInfo?.parentEmail || studentInfo?.email || 'N/A' },
                ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-[#F8F9FA] p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            {icon} {label}
                        </p>
                        <p className="font-semibold text-[#223F74] text-sm mt-1 break-all">{value}</p>
                    </div>
                ))}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                        ₹{(summary?.totalPaid || 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Due</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                        ₹{(summary?.totalDue || 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Transactions</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                        {summary?.totalTransactions || 0}
                    </p>
                </div>
            </div>

            {/* Transaction history */}
            <div>
                <h4 className="text-sm font-bold text-[#223F74] mb-3 flex items-center gap-2">
                    <FileText size={16} /> Transaction History
                </h4>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                {['Date', 'Amount', 'Mode', 'Status'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left font-bold text-slate-500 text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions?.length > 0 ? (
                                transactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2.5 text-slate-700 text-xs">
                                            {new Date(tx.date).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs">
                                            ₹{(tx.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600 text-xs">
                                            {tx.mode || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                                tx.status === 'Success'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : tx.status === 'Failed'
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {tx.status || 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                                        No transactions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button text="Close" variant="secondary" size={4} onClick={onClose} />
            </div>
        </div>
    );
};

// ── Main Dashboard ────────────────────────────────────────────
const AccountantDashboard = () => {
    // ── modal visibility ──
    const [isModalOpen, setIsModalOpen]           = useState(false);
    const [showStudentReport, setShowStudentReport] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    // ── raw data from backend (fetched ONCE on mount) ──
    const [statsData, setStatsData]           = useState(null);
    const [transactions, setTransactions]     = useState([]);   // recent 20
    const [allTransactions, setAllTransactions] = useState([]); // full ledger
    const [chartData, setChartData]           = useState([]);
    const [loading, setLoading]               = useState(true);
    const [isDarkMode, setIsDarkMode]         = useState(false);

    // ── student report state ──
    // reportCache: { [studentId]: reportData } — avoids re-fetching same student
    const reportCache = useRef({});
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [reportData, setReportData]           = useState(null);
    const [reportLoading, setReportLoading]     = useState(false);
    const [reportError, setReportError]         = useState('');

    // ── revenue target ──
    const [revenueTarget, setRevenueTarget] = useState(() => {
        const stored = localStorage.getItem('accountantRevenueTargetGoal');
        return stored ? Number(stored) : 500000;
    });
    const [targetInput, setTargetInput] = useState(() =>
        localStorage.getItem('accountantRevenueTargetGoal') || '500000'
    );

    // ── schoolId ─────────────────────────────────────────────
    const schoolId = useMemo(() => {
        const raw = localStorage.getItem('schoolId');
        // FIX: guard corrupt value — returns null so the effect can bail out cleanly
        if (!raw || raw === 'undefined' || raw.includes('[object')) {
            if (raw) localStorage.removeItem('schoolId');
            return null;
        }
        return raw;
    }, []);

    // ── dark-mode observer ────────────────────────────────────
    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
        const observer = new MutationObserver(() =>
            setIsDarkMode(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // ── SINGLE data fetch on mount ────────────────────────────
    // FIX: allTransactions is now fetched here alongside the other calls,
    //      NOT lazily inside a modal-open effect. The modal never triggers
    //      a re-fetch — it just reads from state.
    useEffect(() => {
        if (!schoolId) {
            console.error('No valid School ID found.');
            setLoading(false);
            toast.error('School ID is missing. Please log in again.');
            return;
        }

        const fetchAll = async () => {
            try {
                setLoading(true);

                const [statsRes, transRes, chartRes, allTransRes] = await Promise.allSettled([
                    getDashboardStats(schoolId),
                    getRecentTransactions(schoolId),
                    getMonthlyChartData(schoolId),
                    getAllTransactions(schoolId),
                ]);

                if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
                    setStatsData(statsRes.value.data.data);
                }
                if (transRes.status === 'fulfilled' && transRes.value.data.success) {
                    setTransactions(transRes.value.data.data);
                }
                if (chartRes.status === 'fulfilled' && chartRes.value.data.success) {
                    setChartData(chartRes.value.data.data);
                }
                // FIX: always unwrap via .transactions key — backend now
                //      guarantees { data: { transactions: [], pagination: {} } }
                if (allTransRes.status === 'fulfilled' && allTransRes.value.data.success) {
                    const payload = allTransRes.value.data.data;
                    setAllTransactions(payload.transactions ?? []);
                }

                // Log any failures without crashing the whole dashboard
                [statsRes, transRes, chartRes, allTransRes].forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.error(`Dashboard fetch [${i}] failed:`, r.reason);
                    }
                });
            } catch (error) {
                console.error('Dashboard fetch error:', error);
                toast.error('Failed to load dashboard metrics');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId]);

    // ── sorted lists (memoized) ───────────────────────────────
    const sortedTransactions = useMemo(() =>
        [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [transactions]);

    const sortedAllTransactions = useMemo(() =>
        [...allTransactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [allTransactions]);

    // ── chart data with user-controlled target overlay ────────
    const mappedChartData = useMemo(() =>
        chartData.map(item => ({ ...item, target: revenueTarget })),
    [chartData, revenueTarget]);

    // ── revenue target handlers ───────────────────────────────
    const handleOpenTargetModal = () => {
        setTargetInput(revenueTarget.toString());
        setIsTargetModalOpen(true);
    };

    const handleSaveTarget = (e) => {
        e.preventDefault();
        const num = Number(targetInput);
        if (isNaN(num) || num <= 0) {
            toast.error('Please enter a valid positive number for revenue target');
            return;
        }
        setRevenueTarget(num);
        localStorage.setItem('accountantRevenueTargetGoal', num.toString());
        setIsTargetModalOpen(false);
        toast.success('Revenue target updated successfully');
    };

    // ── student report handler ────────────────────────────────
    // FIX 1: guard missing studentId
    // FIX 2: check cache before making an API call
    // FIX 3: API is never called from inside the modal — always called here
    const handleViewStudentReport = useCallback(async (tx) => {
        const rawId = tx?.studentId;

        // Guard: studentId must be present
        if (!rawId) {
            toast.error('Student information not available for this transaction');
            return;
        }

        const studentId = String(rawId);
        setSelectedStudentId(studentId);
        setShowStudentReport(true);

        // Cache hit — no API call needed
        if (reportCache.current[studentId]) {
            setReportData(reportCache.current[studentId]);
            setReportError('');
            setReportLoading(false);
            return;
        }

        // Cache miss — fetch and store
        setReportLoading(true);
        setReportError('');
        setReportData(null);

        try {
            const response = await getStudentTransactionReport(schoolId, studentId);
            if (response?.data?.success) {
                const data = response.data.data;
                reportCache.current[studentId] = data;  // store in cache
                setReportData(data);
            } else {
                setReportError('Failed to load student report');
            }
        } catch (err) {
            console.error('Error fetching student report:', err);
            setReportError(err?.response?.data?.message || err.message || 'Failed to load student report');
        } finally {
            setReportLoading(false);
        }
    }, [schoolId]);

    const handleCloseStudentReport = () => {
        setShowStudentReport(false);
        setSelectedStudentId(null);
        // NOTE: reportData is intentionally NOT cleared — cached for instant re-open
    };

    // ── format helpers ────────────────────────────────────────
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${datePart} • ${timePart}`;
    };

    // ── stats cards ───────────────────────────────────────────
    const stats = useMemo(() => {
        if (!statsData) return [
            { title: "Today's Collection",  value: '₹0',       icon: <CircleDollarSign size={22} />, accentColor: '#22c55e', size: 3 },
            { title: 'Monthly Summary',      value: '₹0L',      icon: <BarChart3 size={22} />,        accentColor: '#3b82f6', size: 3 },
            { title: 'Instalment Tracking',  value: '0 Active', icon: <CalendarDays size={22} />,     accentColor: '#8b5cf6', size: 3 },
            { title: 'Pending Dues',         value: '₹0',       icon: <Hourglass size={22} />,        accentColor: '#f59e0b', size: 3 },
        ];
        return [
            {
                title: "Today's Collection",
                value: `₹${(statsData.todayCollection || 0).toLocaleString()}`,
                icon: <CircleDollarSign size={22} />, accentColor: '#22c55e', size: 3,
            },
            {
                title: 'Monthly Summary',
                value: `₹${((statsData.monthlyCollection || 0) / 100000).toFixed(1)}L`,
                icon: <BarChart3 size={22} />, accentColor: '#3b82f6', size: 3,
            },
            {
                title: 'Instalment Tracking',
                value: `${statsData.activeInstalments || 0} Active`,
                icon: <CalendarDays size={22} />, accentColor: '#8b5cf6', size: 3,
            },
            {
                title: 'Pending Dues',
                value: `₹${(statsData.pendingDues || 0).toLocaleString()}`,
                icon: <Hourglass size={22} />, accentColor: '#f59e0b', size: 3,
            },
        ];
    }, [statsData]);

    // ── table config for ledger modal ─────────────────────────
    const transactionColumns = [
        { key: 'student', label: 'Student', width: '25%' },
        { key: 'class',   label: 'Class',   width: '15%' },
        { key: 'amount',  label: 'Amount',  width: '20%' },
        { key: 'status',  label: 'Status',  width: '20%' },
        {
            key: 'actions',
            label: 'Actions',
            width: '20%',
            render: (_, row) => (
                <button
                    onClick={() => handleViewStudentReport(row)}
                    className="p-1.5 text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors flex items-center gap-1.5"
                >
                    <Eye size={16} />
                    <span className="text-xs font-bold">View Report</span>
                </button>
            ),
        },
    ];

    // FIX: rows pre-format amount so the render column shows ₹ prefix,
    //      but keep the raw studentId for the report handler
    const transactionRows = useMemo(() =>
        sortedAllTransactions.map(tx => ({
            ...tx,
            amount: `₹${(tx.amount || 0).toLocaleString()}`,
        })),
    [sortedAllTransactions]);

    // ── loading screen ────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#223F74]/20 border-t-[#223F74] rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-[#223F74]">Loading Financial Command Center...</p>
                </div>
            </div>
        );
    }

    // ── render ────────────────────────────────────────────────
    return (
        <div className="min-h-screen">

            {/* Header */}
            <div className="w-full mb-8">
                <Heading 
                    primaryText="Financial" 
                    secondaryText="Command Center"
                />
            </div>

            {/* Stats Cards */}
            <div className="w-full mb-8">
                <DashGrid cols={12} gap={4}>
                    {stats.map((stat, i) => (
                        <EnhancedDashCard
                            key={i}
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            accentColor={stat.accentColor}
                            size={stat.size}
                            showAnimations
                        />
                    ))}
                </DashGrid>
            </div>

            {/* Chart + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">

                {/* Revenue Trends Chart */}
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[1.5rem] shadow-sm border border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-[#223F74] flex items-center gap-2">
                                <BarChart3 className="text-[#F59B87]" size={20} /> Revenue Trends
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Comparison with monthly projections
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenTargetModal}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#223F74] hover:bg-[#1a3360] text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#223F74]/20"
                            >
                                <Settings size={16} /> Set Target (₹{revenueTarget.toLocaleString()})
                            </button>
                            <div className="bg-slate-50 p-1.5 rounded-xl flex items-center gap-4 px-4 border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#223F74] rounded-full shadow-lg" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Collection</span>
                                </div>
                                <div className="w-[1px] h-4 bg-slate-200" />
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1 bg-[#F59B87] rounded-full" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Target</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] sm:h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={mappedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#223F74" />
                                        <stop offset="100%" stopColor="#4A7AB5" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="0"
                                    vertical={false}
                                    stroke={isDarkMode ? '#334155' : '#f8fafc'}
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 900 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 900 }}
                                    tickFormatter={(v) => `₹${v / 1000}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="collection" barSize={32} radius={[10, 10, 0, 0]}>
                                    {mappedChartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                                    ))}
                                </Bar>
                                <Line
                                    type="monotone"
                                    dataKey="target"
                                    stroke="#F59B87"
                                    strokeWidth={3}
                                    dot={{ fill: '#F59B87', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between">
                    <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-[#223F74]">Recent Activity</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Real-time ledger postings
                            </p>
                        </div>
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[380px] sm:max-h-[480px] custom-scrollbar">
                        {sortedTransactions.length > 0 ? (
                            sortedTransactions.map((tx) => (
                                <div
                                    key={tx.id || tx._id}
                                    className="p-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                                            tx.status === 'Success'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-red-50 text-red-600'
                                        }`}>
                                            {tx.status === 'Success' ? 'IN' : 'ERR'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{tx.student}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {formatDateTime(tx.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-black text-slate-800">
                                            ₹{(tx.amount || 0).toLocaleString()}
                                        </p>
                                        {/* FIX: guard missing studentId before showing the eye button */}
                                        {tx.studentId && (
                                            <button
                                                onClick={() => handleViewStudentReport(tx)}
                                                className="p-1.5 text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors"
                                                title="View Full Report"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                No recent activity
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-slate-50">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full py-4 rounded-2xl bg-[#223F74] hover:bg-[#1a3360] text-white text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-[#223F74]/30"
                        >
                            Explore Full History
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Full Ledger Modal ─────────────────────────────────── */}
            {/* FIX: data is already in state — no fetch on open */}
            {isModalOpen && (
                <PanelModal
                    id="ledger-modal"
                    title="Ledger Management"
                    isVisible={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    size="xl"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium">Complete Transaction Audit Trail</p>
                        <DataTable
                            columns={transactionColumns}
                            rows={transactionRows}
                            size={12}
                            pageSize={10}
                            pageSizeOptions={[5, 10, 20, 50]}
                            searchable
                            title="All Transactions"
                            exportable={false}
                            onRefresh={() => {}}
                        />
                    </div>
                </PanelModal>
            )}

            {/* ── Student Report Modal ──────────────────────────────── */}
            {/* FIX: no API call inside; passes already-resolved data down */}
            {showStudentReport && (
                <PanelModal
                    id="student-report-modal"
                    title="Student Transaction Report"
                    isVisible={showStudentReport}
                    onClose={handleCloseStudentReport}
                    size="lg"
                >
                    <StudentReportModal
                        reportData={reportData}
                        loading={reportLoading}
                        error={reportError}
                        onClose={handleCloseStudentReport}
                    />
                </PanelModal>
            )}

            {/* ── Set Revenue Target Modal ──────────────────────────── */}
            {isTargetModalOpen && (
                <PanelModal
                    id="target-modal"
                    title="Set Revenue Target"
                    isVisible={isTargetModalOpen}
                    onClose={() => setIsTargetModalOpen(false)}
                    size="sm"
                >
                    <form onSubmit={handleSaveTarget} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Monthly Revenue Target (₹)
                            </label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={targetInput}
                                onChange={(e) => setTargetInput(e.target.value)}
                                placeholder="e.g. 500000"
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-slate-800 font-bold"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Current target: ₹{revenueTarget.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setIsTargetModalOpen(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-[#223F74] hover:bg-[#1a3360] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Save Target
                            </button>
                        </div>
                    </form>
                </PanelModal>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
            `}</style>
        </div>
    );
};

export default AccountantDashboard;
