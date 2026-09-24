import React, { useState, useEffect } from 'react';
import { 
    DollarSign, 
    CreditCard, 
    PieChart as PieIcon, 
    BarChart3, 
    ArrowUpRight, 
    Calendar,
    Filter,
    Download,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    AreaChart, 
    Area 
} from 'recharts';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../features/theme/themeSlice';
import axios from 'axios';
import toast from 'react-hot-toast';

const Finance = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState('6M');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const darkMode = useSelector(selectIsDarkMode);

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const years = [2024, 2025, 2026, 2027, 2028];

    useEffect(() => {
        const initMonth = new Date().getMonth() + 1;
        const initYear = new Date().getFullYear();
        setSelectedMonth(initMonth);
        setSelectedYear(initYear);
        fetchFinanceStats(initMonth, initYear);
    }, []);

    const fetchFinanceStats = async (month, year) => {
        const isInitial = !stats;
        if (isInitial) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        try {
            const response = await axios.get(`/api/admin/finance/dashboard-stats?month=${month}&year=${year}`, { withCredentials: true });
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching finance stats:", error);
            toast.error("Unable to load finance data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const hasFinanceData = () => {
        if (!stats) return false;
        const { kpis, monthlyTrend } = stats;
        if (!kpis) return false;

        const fees = kpis.totalFees?.value || 0;
        const fines = kpis.fineCollected?.value || 0;
        const outstanding = kpis.totalOutstanding?.value || 0;
        const unpaid = kpis.studentsNotPaid?.value || 0;
        const hasTrendAmount = monthlyTrend && monthlyTrend.some(item => item.amount > 0);

        return fees > 0 || fines > 0 || outstanding > 0 || unpaid > 0 || hasTrendAmount;
    };

    const handleExport = async () => {
        if (!hasFinanceData()) {
            toast.error("No finance records available for export.");
            return;
        }

        try {
            const response = await axios.get(
                `/api/admin/finance/export?month=${selectedMonth}&year=${selectedYear}`,
                { responseType: 'blob', withCredentials: true }
            );

            // Trigger file download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Finance_Report_${selectedMonth}_${selectedYear}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Financial report exported successfully!");
        } catch (error) {
            console.error("Export error:", error);
            if (error.response && error.response.status === 404) {
                toast.error("Export functionality is not implemented yet.");
            } else {
                toast.error("Export failed. Please try again later.");
            }
        }
    };

    if (loading) {
        return (
            <div className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors duration-200 ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-slate-800'}`}>
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-7 bg-gray-300 dark:bg-slate-700 rounded w-48"></div>
                        <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-72"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 bg-gray-300 dark:bg-slate-700 rounded w-28"></div>
                        <div className="h-9 bg-gray-300 dark:bg-slate-700 rounded w-28"></div>
                    </div>
                </div>

                {/* KPI Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`p-6 rounded-2xl border animate-pulse space-y-4
                            ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}
                        >
                            <div className="flex justify-between items-center">
                                <div className="h-10 w-10 bg-gray-300 dark:bg-slate-700 rounded-xl"></div>
                                <div className="h-5 w-14 bg-gray-300 dark:bg-slate-700 rounded-full"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/2"></div>
                                <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                    <div className={`lg:col-span-2 border p-6 rounded-2xl space-y-4 min-h-[300px]
                        ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}
                    >
                        <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-1/4"></div>
                        <div className="h-40 bg-gray-300 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                    <div className={`border p-6 rounded-2xl space-y-4 min-h-[300px]
                        ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}
                    >
                        <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-1/3"></div>
                        <div className="h-40 bg-gray-300 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    const { kpis, paymentMethods, monthlyTrend } = stats || {};

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed'];

    const pieData = [
        { name: 'Online', value: paymentMethods?.online || 0 },
        { name: 'Cash', value: paymentMethods?.cash || 0 },
        { name: 'Cheque', value: paymentMethods?.cheque || 0 },
    ];

    return (
        <div className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors duration-200 ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-slate-800'}`}>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Financial Analytics</h1>
                    <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Overview of your school's revenue and collection trends</p>
                </div>
                <div className="flex items-center gap-2 relative">
                    <button 
                        onClick={handleExport}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200
                            ${darkMode ? 'bg-[#1e293b] border-[#334155] text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-slate-800 hover:bg-gray-50'}`}
                    >
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            {refreshing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <Calendar className="w-4 h-4" />
                            )}
                            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </button>

                        {isDatePickerOpen && (
                            <div className={`absolute right-0 mt-2 p-4 w-64 border rounded-xl shadow-lg z-50 transition-all duration-200
                                ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/50' : 'bg-white border-gray-200 text-slate-800 shadow-lg'}`}
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Month</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => {
                                                const newMonth = Number(e.target.value);
                                                setSelectedMonth(newMonth);
                                                fetchFinanceStats(newMonth, selectedYear);
                                                setIsDatePickerOpen(false);
                                            }}
                                            className={`w-full text-sm border rounded-lg p-2 transition-colors duration-200
                                                ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-gray-200 text-slate-700'}`}
                                        >
                                            {months.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Year</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => {
                                                const newYear = Number(e.target.value);
                                                setSelectedYear(newYear);
                                                fetchFinanceStats(selectedMonth, newYear);
                                                setIsDatePickerOpen(false);
                                            }}
                                            className={`w-full text-sm border rounded-lg p-2 transition-colors duration-200
                                                ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-gray-200 text-slate-700'}`}
                                        >
                                            {years.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {Object.entries(kpis || {}).map(([key, item]) => (
                    <div key={key} className={`p-6 rounded-2xl border hover:shadow-md transition-all duration-200
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white' : 'bg-white border-gray-100 text-slate-850'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                {key === 'totalFees' ? <DollarSign className="w-6 h-6" /> : 
                                 key === 'fineCollected' ? <CreditCard className="w-6 h-6" /> : 
                                 key === 'studentsNotPaid' ? <BarChart3 className="w-6 h-6" /> : 
                                 <ArrowUpRight className="w-6 h-6" />}
                            </div>
                            <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full 
                                ${item.trend.startsWith('+') 
                                    ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-700') 
                                    : (darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-700')
                                }`}
                            >
                                {item.trend.startsWith('+') ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {item.trend}
                            </span>
                        </div>
                        <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
                        <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {typeof item.value === 'number' && key !== 'studentsNotPaid' ? `₹${item.value.toLocaleString()}` : item.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend Chart */}
                <div className={`lg:col-span-2 border p-6 rounded-2xl shadow-sm transition-all duration-200
                    ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}
                >
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Revenue Trend</h3>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Monthly income aggregation</p>
                        </div>
                        <div className={`flex p-1 rounded-lg transition-colors ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                            {['1M', '6M', '1Y'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                                        ${timeRange === range 
                                            ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                                            : (darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                                        color: darkMode ? '#ffffff' : '#0f172a', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' 
                                    }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Income']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods Chart */}
                <div className={`p-6 rounded-2xl shadow-sm border flex flex-col transition-all duration-200
                    ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}
                >
                    <div className="mb-8">
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Payment Methods</h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Preference breakdown</p>
                    </div>
                    <div className="flex-1 relative min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                                        color: darkMode ? '#ffffff' : '#0f172a' 
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-center flex-col items-center justify-center pointer-events-none">
                            <PieIcon className={`w-8 h-8 mb-1 ${darkMode ? 'text-slate-500' : 'text-gray-300'}`} />
                            <span className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Status</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        {pieData.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx]}}></div>
                                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{item.name}</span>
                                </div>
                                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Finance;
