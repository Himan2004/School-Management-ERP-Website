import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Download, 
    Users, 
    TrendingUp, 
    AlertCircle, 
    Wallet, 
    Phone, 
    MessageSquare,
    ChevronRight
} from 'lucide-react';
import { 
    getFinancialSummary, 
    getMonthlyTrend, 
    getPayrollSummary, 
    getClassWiseDues, 
    exportFinancialReport 
} from '../../services/accountantReportsApi';
import { sendBulkDuesReminder, sendDuesReminder, getDuesList } from '../../services/accountantDuesApi';
import { exportToCSV } from '../../features/accountant/exportUtils';
import { toast } from 'react-hot-toast';
import { ReportsExportPanel } from './ReportsExportPanel';
import { Heading, EnhancedDashCard, DataTable } from '../../components/shared/Common_Components';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700 ring-1 ring-white/10 p-4 z-50">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">{label} Financials</p>
                <div className="space-y-2">
                    {payload.map((item, idx) => {
                        const isProfit = item.name.toLowerCase() === 'profit';
                        const colorClass = isProfit 
                            ? (item.value >= 0 ? 'text-emerald-400' : 'text-red-400')
                            : 'text-white';
                        
                        return (
                            <div key={idx} className="flex justify-between gap-10 items-center">
                                <span className="text-xs font-medium text-slate-350">{item.name}</span>
                                <span className={`text-sm font-black ${colorClass}`}>
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(item.value)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

const CollectionReports = () => {
    const navigate = useNavigate();
    const schoolId = localStorage.getItem('schoolId');

    // API Data State
    const [summary, setSummary] = useState({});
    const [profitTrend, setProfitTrend] = useState([]);
    const [payrollSummary, setPayrollSummary] = useState([]);
    const [classDues, setClassDues] = useState([]);
    
    // Bulk Reminders Progress Modal State
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderProgress, setReminderProgress] = useState(0);
    const [reminderStatusText, setReminderStatusText] = useState('');
    const [reminderStats, setReminderStats] = useState({ sent: 0, failed: 0, skipped: 0, total: 0 });
    const [isReminderFinished, setIsReminderFinished] = useState(false);

    const fetchReportsData = useCallback(async () => {
        if (!schoolId) return;
        try {
            Promise.all([
                getFinancialSummary(schoolId),
                getMonthlyTrend(schoolId),
                getPayrollSummary(schoolId),
                getClassWiseDues(schoolId)
            ]).then(([sumRes, trendRes, payRes, duesRes]) => {
                if (sumRes.data?.success && Object.keys(sumRes.data.data || {}).length > 0) setSummary(sumRes.data.data);
                if (trendRes.data?.success && trendRes.data.data?.length > 0) setProfitTrend(trendRes.data.data);
                if (payRes.data?.success && payRes.data.data?.length > 0) setPayrollSummary(payRes.data.data);
                if (duesRes.data?.success && duesRes.data.data?.length > 0) setClassDues(duesRes.data.data);
            }).catch(err => console.error("Error loading reports data:", err));
        } catch (err) {
            console.error(err);
        }
    }, [schoolId]);

    useEffect(() => {
        fetchReportsData();
    }, [fetchReportsData]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);

    const maxVal = profitTrend.length > 0 ? Math.max(...profitTrend.map(d => d.revenue), 10000) : 100000;
    const yAxisLabels = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];

    const handleExportCSV = async () => {
        if (profitTrend.length === 0) {
            toast.error("Nothing to export");
            return;
        }
        try {
            toast.loading("Exporting detailed financial report...");
            const res = await exportFinancialReport(schoolId, { reportType: 'fees' });
            toast.dismiss();
            if (res.data?.success && res.data.data && res.data.data.length > 0) {
                exportToCSV(res.data.data, `Financial_Detailed_Report_${new Date().toLocaleDateString()}`);
                toast.success("Detailed reports exported successfully");
            } else {
                // Fallback to exporting local summary trend
                const localData = profitTrend.map(d => ({
                    'Month': d.month,
                    'Revenue': d.revenue,
                    'Profit/Net': d.profit
                }));
                exportToCSV(localData, `Financial_Oversight_Summary_${new Date().toLocaleDateString()}`);
                toast.success("Summary report exported successfully");
            }
        } catch (err) {
            toast.dismiss();
            console.error("Export error:", err);
            toast.error("Failed to export detailed report");
        }
    };

    const handleBulkSMS = async () => {
        try {
            toast.loading("Fetching student dues list...");
            const res = await getDuesList(schoolId, { limit: 1000 });
            toast.dismiss();
            
            const studentsWithDues = (res.data?.data?.students || res.data?.data || []).filter(s => s.dues > 0);
            if (studentsWithDues.length === 0) {
                toast.error("No active student records with outstanding dues found.");
                return;
            }

            // Open progress modal
            setIsReminderModalOpen(true);
            setReminderProgress(0);
            setIsReminderFinished(false);
            setReminderStatusText(`Preparing to send reminders to ${studentsWithDues.length} students...`);
            setReminderStats({ sent: 0, failed: 0, skipped: 0, total: studentsWithDues.length });

            const studentIds = studentsWithDues.map(s => s.id); // Student profile ID for backend filter
            
            const batchSize = 10;
            let sentCount = 0;
            let failedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < studentIds.length; i += batchSize) {
                const batch = studentIds.slice(i, i + batchSize);
                const batchNames = studentsWithDues.slice(i, i + batchSize).map(s => s.name).join(', ');
                
                setReminderStatusText(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(studentIds.length / batchSize)}: ${batchNames}...`);
                
                try {
                    const response = await sendBulkDuesReminder({ studentIds: batch });
                    if (response.data?.success) {
                        const { sent = [], failed = [], skipped = [] } = response.data.data || {};
                        sentCount += sent.length;
                        failedCount += failed.length;
                        skippedCount += skipped.length;
                    } else {
                        failedCount += batch.length;
                    }
                } catch (err) {
                    console.error("Batch reminder error:", err);
                    failedCount += batch.length;
                }

                const currentProgress = Math.min(100, Math.round(((i + batch.length) / studentIds.length) * 100));
                setReminderProgress(currentProgress);
                setReminderStats({
                    sent: sentCount,
                    failed: failedCount,
                    skipped: skippedCount,
                    total: studentIds.length
                });
            }

            setReminderStatusText("Bulk reminder process completed successfully.");
            setIsReminderFinished(true);
            toast.success(`Completed! Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
        } catch (err) {
            toast.dismiss();
            console.error("Bulk reminders error:", err);
            toast.error("Error occurred while sending due reminders");
            setIsReminderModalOpen(false);
        }
    };

    const handleViewSlips = (dept) => {
        let role = 'All';
        if (dept === 'Teachers') role = 'teacher';
        else if (dept === 'Admin') role = 'admin';
        else if (dept === 'Support Staff') role = 'support_staff';
        
        console.log(`[View Slips] Redirecting to payroll with role: ${role}`);
        toast.success(`Redirecting to Payroll for ${dept} slip audit...`);
        navigate('/accountant/payroll', { state: { role } });
    };

    const handleContactParent = (className) => {
        toast.success(`Drafting communication thread for ${className} default group`);
    };

    return (
        <div className="bg-[#f8fafc] dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header Section */}
            <div className="mb-8">
                <Heading 
                    primaryText="Reports" 
                    size={12} 
                    action={
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all text-sm border border-white/20"
                        >
                            <Download size={16} /> Export Reports
                        </button>
                    }
                />
            </div>


                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-12 gap-6 mb-8 mt-4">
                        <EnhancedDashCard
                            title="Total Transactions"
                            value={(summary.transactions || 0).toLocaleString()}
                            icon={<Wallet size={24} className="text-white" />}
                            accentColor="#3b82f6"
                            size={3}
                        />
                        <EnhancedDashCard
                            title="Total Collections"
                            value={formatCurrency(summary.totalRevenue || 0)}
                            icon={<TrendingUp size={24} className="text-white" />}
                            accentColor="#10b981"
                            size={3}
                        />
                        <EnhancedDashCard
                            title="Pending Dues"
                            value={formatCurrency(summary.outstandingFees || 0)}
                            icon={<AlertCircle size={24} className="text-white" />}
                            accentColor="#f43f5e"
                            size={3}
                        />
                        <EnhancedDashCard
                            title="Total Payroll Processed"
                            value={formatCurrency(summary.payrollTotal || 0)}
                            icon={<Users size={24} className="text-white" />}
                            accentColor="#8b5cf6"
                            size={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Visual Chart Card */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                                <h3 className="font-black text-lg text-slate-800 dark:text-white tracking-tight">Revenue vs Profit Trend</h3>
                                <div className="flex flex-wrap gap-3 text-xs font-bold">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 bg-slate-350 dark:bg-slate-700 rounded-full"></span> Revenue</span>
                                    <span className="flex items-center gap-1 text-blue-500"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Profit</span>
                                </div>
                            </div>
                            
                            <div className="h-64 w-full relative">
                                {profitTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <LineChart
                                            data={profitTrend}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                                                dy={5}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                                                tickFormatter={(val) => {
                                                    const sign = val < 0 ? '-' : '';
                                                    const absVal = Math.abs(val);
                                                    if (absVal >= 100000) return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
                                                    if (absVal >= 1000) return `${sign}₹${(absVal / 1000).toFixed(0)}k`;
                                                    return `${sign}₹${absVal}`;
                                                }}
                                                domain={['dataMin - 10000', 'dataMax + 10000']}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#94a3b8"
                                                strokeWidth={3}
                                                dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                                                activeDot={{ r: 5 }}
                                                name="Revenue"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="profit"
                                                stroke="#3b82f6"
                                                strokeWidth={3}
                                                dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                                                activeDot={{ r: 5 }}
                                                name="Profit"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="w-full text-center text-xs text-slate-400 italic pt-20">No trend historical logs recorded</p>
                                )}
                            </div>
                        </div>

                        {/* Payroll Section */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="font-black text-lg text-slate-800 dark:text-white mb-6 tracking-tight">Payroll Distribution</h3>
                            <div className="space-y-4">
                                {payrollSummary.length > 0 ? (
                                    payrollSummary.map((item, i) => (
                                        <div key={i} className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 bg-slate-50 dark:bg-slate-950 border border-transparent hover:border-blue-100 hover:bg-white dark:hover:bg-slate-900 transition-all rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {item.dept ? item.dept[0] : 'P'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-700 dark:text-slate-200">{item.dept}</p>
                                                    <p className="text-xs text-slate-400">{item.count} Personnel</p>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <p className="font-black text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                                                <button 
                                                    onClick={() => handleViewSlips(item.dept)}
                                                    className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 justify-start sm:justify-end mt-1"
                                                >
                                                    View Slips <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 dark:text-slate-500 italic text-center py-10 text-xs">No payroll disbursements recorded</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fee Dues Table Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="font-black text-lg text-slate-800 dark:text-white tracking-tight">Class-wise Outstanding Dues</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Action required for high-risk class accounts</p>
                            </div>
                            <button 
                                onClick={handleBulkSMS}
                                className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors border border-rose-100 dark:border-rose-900/40"
                            >
                                <MessageSquare size={16} />
                                Bulk Reminders
                            </button>
                        </div>
                        <div className="p-4">
                            <DataTable 
                                columns={[
                                    { key: 'class', label: 'Class/Section' },
                                    { key: 'amount', label: 'Outstanding Amount', render: (val) => formatCurrency(val) },
                                    { key: 'status', label: 'Risk Level', render: (val) => (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                            val === 'Critical' ? 'bg-rose-500 text-white' :
                                            val === 'High' ? 'bg-amber-400 text-white' : 'bg-indigo-500 text-white'
                                        }`}>
                                            {val}
                                        </span>
                                    )}
                                ]}
                                rows={classDues}
                                actions={[
                                    { label: 'Details', icon: <ChevronRight size={14} />, onClick: (row) => navigate(`/accountant/students?classSearch=${encodeURIComponent(row.class)}`) },
                                    { label: 'Contact', icon: <Phone size={14} />, onClick: (row) => handleContactParent(row.class) }
                                ]}
                                searchable
                                exportable
                                exportFileName="class-wise-outstanding-dues"
                                filters={[
                                    { title: 'Risk Level', key: 'status', type: 'toggle', options: ['Critical', 'High', 'Moderate'] }
                                ]}
                            />
                        </div>
                    </div>
                    
                    {/* Centralized Export Panel */}
                    <ReportsExportPanel schoolId={schoolId} />

                    {/* Bulk Reminders Progress Modal */}
                    {isReminderModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <style>{`
                                @keyframes shimmer {
                                    0% { background-position: 0% 50%; }
                                    50% { background-position: 100% 50%; }
                                    100% { background-position: 0% 50%; }
                                }
                            `}</style>
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in duration-300">
                                {/* Header */}
                                <div className="bg-[#223F74] p-6 text-white text-center">
                                    <h3 className="text-lg font-black tracking-tight">Bulk Dues Reminders</h3>
                                    <p className="text-xs text-slate-200 mt-1">Sending automated notifications via email to parents</p>
                                </div>
                                
                                {/* Body */}
                                <div className="p-8 space-y-6 text-center">
                                    {/* Large numeric counter */}
                                    <div className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                                        {reminderStats.sent + reminderStats.failed + reminderStats.skipped} <span className="text-slate-300 font-light">/</span> {reminderStats.total}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Reminders Processed
                                    </div>

                                    {/* Progress bar container */}
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500 ease-out bg-[length:200%_auto] animate-[shimmer_1.5s_linear_infinite]"
                                            style={{ 
                                                width: `${reminderProgress}%`,
                                                backgroundImage: 'linear-gradient(to right, #3b82f6 0%, #6366f1 50%, #3b82f6 100%)'
                                            }}
                                        />
                                    </div>

                                    {/* Mini stats row */}
                                    <div className="flex justify-center gap-6 text-xs font-bold pt-2">
                                        <span className="text-emerald-500">{reminderStats.sent} Sent</span>
                                        <span className="text-rose-500">{reminderStats.failed} Failed</span>
                                        <span className="text-amber-500">{reminderStats.skipped} Skipped</span>
                                    </div>
                                </div>
                                
                                {/* Footer */}
                                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                                    <button
                                        disabled={!isReminderFinished}
                                        onClick={() => setIsReminderModalOpen(false)}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                            isReminderFinished 
                                                ? 'bg-[#223F74] hover:bg-[#1a3360] text-white cursor-pointer shadow-[#223F74]/20' 
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {isReminderFinished ? 'Close' : 'Sending...'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
        </div>
    );
};

export default CollectionReports;