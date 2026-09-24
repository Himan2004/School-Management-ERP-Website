import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import {
    Clock, LogOut, Download, TrendingUp, Calendar,
    Send, UserMinus, History, PieChart, MessageSquare, Receipt, Printer, Loader2, X, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    getHRMDashboardStats,
    toggleAttendance,
    applyLeaveRequest
} from '../../services/accountantHrmApi';
import {
    getTicketDetails,
    updateTicket,
    createTicket
} from '../../services/api/commonTicketApi';
import { 
    Heading, DashGrid, EnhancedDashCard, 
    DataField, Button, SelectField, Option, Grid, DataTable,
    UserChat, PanelModal
} from '../../components/shared/Common_Components';

const CardBox = ({ title, icon: Icon, children, className = "" }) => (
    <div className={`bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col h-full ${className}`}>
        {title && (
            <div className="flex items-center gap-2 mb-4">
                {Icon && <Icon className="text-[#223F74]" size={22} />}
                <h3 className="text-lg font-bold text-[#223F74]">{title}</h3>
            </div>
        )}
        <div className="flex-1 h-full flex flex-col">
            {children}
        </div>
    </div>
);

// Global cache for accountant hrm statistics/records
let hrmCache = null;

const confirmAction = (message) => new Promise((resolve) => {
    toast((t) => (
        <div className="flex flex-col gap-3 min-w-[250px]">
            <p className="text-sm font-medium text-slate-800 dark:text-white">{message}</p>
            <div className="flex gap-2 justify-end mt-2">
                <button
                    onClick={() => { toast.dismiss(t.id); resolve(false); }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => { toast.dismiss(t.id); resolve(true); }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                >
                    OK
                </button>
            </div>
        </div>
    ), {
        duration: Infinity,
        position: 'top-center',
    });
});

const HRM = () => {
    const currentUser = useSelector((state) => state.auth?.user);

    const [loading, setLoading] = useState(true);
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInTime, setClockInTime] = useState(null);
    const [clockOutTime, setClockOutTime] = useState(null);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [attendanceRate, setAttendanceRate] = useState("100.0%");
    const [totalLeaveAvailable, setTotalLeaveAvailable] = useState(0);
    const [activeTicketsCount, setActiveTicketsCount] = useState(0);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    
    const [leaveData, setLeaveData] = useState({ type: 'Casual Leave (CL)', start: '', end: '', reason: '' });
    const [ticketData, setTicketData] = useState({ subject: '', category: 'IT Support', priority: 'Medium', description: '' });
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    
    // Ticket details view
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [ticketDetails, setTicketDetails] = useState(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [activeTab, setActiveTab] = useState('attendance_leave');

    const loadData = async (force = false) => {
        if (hrmCache && !force) {
            const d = hrmCache;
            setIsClockedIn(d.isClockedIn);
            setClockInTime(d.clockInTime);
            setClockOutTime(d.clockOutTime);
            setLeaveBalance(d.leaveBalance || []);
            setLeaveHistory(d.leaveHistory || []);
            setPayoutHistory(d.payoutHistory || []);
            setAttendanceRate(d.attendanceRate || "100.0%");
            setAttendanceHistory(d.attendanceHistory || []);
            setSupportTickets(d.supportTickets || []);
            setTotalLeaveAvailable(d.totalLeaveAvailable || 0);
            setActiveTicketsCount(d.activeTicketsCount || 0);
            setLoading(false);
            setFetchError(null);
            return;
        }

        try {
            setLoading(true);
            setFetchError(null);
            const hrmRes = await getHRMDashboardStats();
            
            if (hrmRes.data?.success) {
                const d = hrmRes.data.data;
                hrmCache = d; // Cache it
                setIsClockedIn(d.isClockedIn);
                setClockInTime(d.clockInTime);
                setClockOutTime(d.clockOutTime);
                setLeaveBalance(d.leaveBalance || []);
                setLeaveHistory(d.leaveHistory || []);
                setPayoutHistory(d.payoutHistory || []);
                setAttendanceRate(d.attendanceRate || "100.0%");
                setAttendanceHistory(d.attendanceHistory || []);
                setSupportTickets(d.supportTickets || []);
                setTotalLeaveAvailable(d.totalLeaveAvailable || 0);
                setActiveTicketsCount(d.activeTicketsCount || 0);
            } else {
                setFetchError(hrmRes.data?.message || "Failed to load HRM information");
            }
        } catch (err) {
            console.error(err);
            setFetchError(err.response?.data?.message || err.message || "Error loading HRM information");
            toast.error("Error loading HRM information");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        document.body.style.overflow = (isTicketModalOpen || isDetailModalOpen) ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isTicketModalOpen, isDetailModalOpen]);

    const handleAttendanceToggle = async () => {
        try {
            const actionText = isClockedIn ? "Clock Out" : "Clock In";
            if (await confirmAction(`Are you sure you want to ${actionText}?`)) {
                const toastId = toast.loading(`${actionText} process initiating...`);
                const res = await toggleAttendance();
                toast.dismiss(toastId);
                if (res.data?.success) {
                    toast.success(res.data.message || `${actionText} registered!`);
                    
                    // Instantly reflect change in UI
                    const newState = !isClockedIn;
                    setIsClockedIn(newState);
                    
                    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    if (newState) setClockInTime(timeStr);
                    else setClockOutTime(timeStr);
                    
                    // Update cache to prevent stale data reverts
                    if (hrmCache) {
                        hrmCache.isClockedIn = newState;
                        if (newState) hrmCache.clockInTime = timeStr;
                        else hrmCache.clockOutTime = timeStr;
                    }
                    
                    // Delay reloading to avoid backend race conditions
                    setTimeout(() => loadData(true), 300);
                } else {
                    toast.error(res.data?.message || `Failed to ${actionText}`);
                }
            }
        } catch (err) {
            toast.dismiss();
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to toggle attendance");
        }
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        if (!leaveData.start || !leaveData.end || !leaveData.reason) {
            toast.error("Please fill all fields");
            return;
        }
        if (new Date(leaveData.end) < new Date(leaveData.start)) {
            toast.error("End date cannot be before start date");
            return;
        }
        if (await confirmAction("Submit this leave application?")) {
            const toastId = toast.loading("Submitting leave application...");
            try {
                const res = await applyLeaveRequest({
                    leaveType: leaveData.type,
                    fromDate: leaveData.start,
                    toDate: leaveData.end,
                    reason: leaveData.reason
                });
                toast.dismiss(toastId);
                if (res.data?.success) {
                    toast.success("Application submitted successfully!");
                    setLeaveData({ type: 'Casual Leave (CL)', start: '', end: '', reason: '' });
                    loadData(true);
                } else {
                    toast.error(res.data?.message || "Failed to submit leave application");
                }
            } catch (err) {
                toast.dismiss(toastId);
                console.error(err);
                toast.error(err.response?.data?.message || "Error submitting leave application");
            }
        }
    };

    const handleComplaintSubmit = async (e) => {
        e.preventDefault();
        if (!ticketData.subject.trim() || !ticketData.description.trim()) {
            toast.error("Subject and description cannot be empty");
            return;
        }
        const toastId = toast.loading("Submitting ticket...");
        try {
            
            // Map category to backend Ticket category enum: academic, fee, discipline, transport, general, complaint, query, id_card
            const mappedCategory = 
                ticketData.category === "HR Query" ? "query" :
                ticketData.category === "Payroll Issue" ? "fee" :
                ticketData.category === "IT Support" ? "general" : "general";

            const res = await createTicket({
                title: ticketData.subject.trim(),
                category: mappedCategory,
                priority: ticketData.priority.toLowerCase(),
                description: ticketData.description.trim(),
                assignedToRole: "admin"
            });
            
            toast.dismiss(toastId);
            if (res.success) {
                toast.success(`Ticket raised successfully.`);
                setTicketData({ subject: '', category: 'IT Support', priority: 'Medium', description: '' });
                setIsTicketModalOpen(false);
                loadData(true);
            } else {
                toast.error(res.message || "Failed to submit ticket");
            }
        } catch (err) {
            toast.dismiss(toastId);
            console.error(err);
            toast.error(err.message || "Error registering ticket");
        }
    };

    const handleViewTicket = async (row) => {
        try {
            setIsDetailsLoading(true);
            setSelectedTicketId(row.id || row._id);
            setIsDetailModalOpen(true);
            const response = await getTicketDetails(row.id || row._id);
            if (response.success) {
                setTicketDetails(response.data);
            }
        } catch (error) {
            toast.error("Failed to load ticket details");
            setIsDetailModalOpen(false);
            setSelectedTicketId(null);
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const handleReply = async (msgObj) => {
        if (!msgObj.text?.trim()) return;
        try {
            const response = await updateTicket(selectedTicketId, {
                message: msgObj.text,
            });
            if (response.success) {
                setTicketDetails(response.data);
                // Background update of local list status
                const updatedTickets = supportTickets.map(t => t.id === selectedTicketId ? { 
                    ...t, 
                    status: response.data.status === 'in_progress' ? 'In Progress' : response.data.status.charAt(0).toUpperCase() + response.data.status.slice(1)
                } : t);
                setSupportTickets(updatedTickets);
                if (hrmCache) {
                    hrmCache.supportTickets = updatedTickets;
                    hrmCache.activeTicketsCount = updatedTickets.filter(t => ['open', 'in_progress', 'escalated'].includes(response.data.status)).length;
                    setActiveTicketsCount(hrmCache.activeTicketsCount);
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to send reply");
        }
    };

    const handleResignationSubmit = async () => {
        if (await confirmAction("Are you sure you want to apply for resignation? This will notify human resources and initiate exit steps.")) {
            toast.success("Exit process request sent. Please contact Branch Administrator.");
        }
    };

    const formatDate = (date) => {
        if (!date || date === '-') return "—";
        const d = new Date(date);
        if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g. 10 Jul 2026
    };

    const formatTime = (time) => {
        if (!time || time === '-') return "—";
        const d = new Date(time);
        if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatWorkingHours = (row) => {
        if (!row.clockIn || !row.clockOut || row.clockIn === '-' || row.clockOut === '-') return "—";
        const inDate = new Date(row.clockIn);
        const outDate = new Date(row.clockOut);
        if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return "—";
        
        const diffMs = outDate - inDate;
        if (diffMs <= 0) return "—";
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    };

    const tabs = [
        { id: 'attendance_leave', label: 'Attendance & Leave' },
        { id: 'payroll', label: 'Payroll & Salary' },
        { id: 'support', label: 'Support & Exit' }
    ];

    // DataTables Columns & Rows
    const attendanceColumns = [
        { 
            key: "date", 
            label: "Date", 
            sortable: true,
            render: (val) => formatDate(val)
        },
        { 
            key: "clockIn", 
            label: "Clock In",
            render: (val) => formatTime(val)
        },
        { 
            key: "clockOut", 
            label: "Clock Out",
            render: (val) => formatTime(val)
        },
        { 
            key: "totalHours", 
            label: "Working Hours",
            render: (_, row) => formatWorkingHours(row)
        },
        { 
            key: "isLate", 
            label: "Late",
            render: (val, row) => val ? (
                <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded">
                    Yes {row.lateByMinutes ? `(${row.lateByMinutes}m)` : ''}
                </span>
            ) : 'No'
        },
        { 
            key: "status", 
            label: "Status",
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    val === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                    val === 'Absent' ? 'bg-red-100 text-red-700' :
                    val === 'Late' ? 'bg-orange-100 text-orange-700' :
                    val === 'Half Day' ? 'bg-amber-100 text-amber-700' :
                    val === 'On Leave' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                }`}>
                    {val}
                </span>
            )
        },
        { 
            key: "remarks", 
            label: "Remarks",
            render: (val) => val || '—'
        }
    ];

    const attendanceRows = attendanceHistory.map((att, i) => ({ id: i, ...att }));

    const leaveHistoryColumns = [
        { key: "type", label: "Leave Type", render: (val) => <span className="uppercase font-bold text-xs">{val}</span> },
        { key: "dates", label: "Dates", render: (_, row) => <span className="text-xs font-medium">{formatDate(row.start)} - {formatDate(row.end)}</span> },
        { key: "totalDays", label: "Days", render: (val) => <span className="text-xs font-bold">{val}</span> },
        { key: "reason", label: "Reason", render: (val) => <span className="text-xs text-slate-600 line-clamp-1" title={val}>{val}</span> },
        { 
            key: "status", 
            label: "Status",
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    val === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                    val === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                    val === 'Cancelled' ? 'bg-slate-100 text-slate-700' :
                    'bg-orange-100 text-orange-700'
                }`}>
                    {val}
                </span>
            )
        }
    ];

    const leaveHistoryRows = leaveHistory.map((item, i) => ({ id: item.id || i, ...item }));

    const payoutColumns = [
        { key: "month", label: "Month", sortable: true },
        { key: "basicSalary", label: "Basic", sortable: true },
        { key: "allowances", label: "Allowances", sortable: true },
        { key: "deductions", label: "Deductions", sortable: true },
        { key: "netSalary", label: "Net Pay", sortable: true },
        { key: "date", label: "Payment Date", sortable: true },
        { 
            key: "status", 
            label: "Status",
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    val?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                    {val || 'Processing'}
                </span>
            )
        },
        {
            key: "slipUrl",
            label: "Payslip",
            render: (val) => val ? (
                <a href={val} target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:bg-blue-100 p-2 rounded-lg transition-colors inline-block">
                    <Download size={18} />
                </a>
            ) : <span className="text-slate-400">-</span>
        }
    ];

    const payoutRows = payoutHistory.map((p, i) => ({ id: i, ...p }));

    const supportColumns = [
        { key: "ticketId", label: "Ticket ID", sortable: true },
        { key: "date", label: "Date", sortable: true },
        { key: "category", label: "Category" },
        { key: "priority", label: "Priority" },
        { key: "subject", label: "Subject" },
        { 
            key: "status", 
            label: "Status",
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    val === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 
                    val === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    val === 'Closed' ? 'bg-slate-200 text-slate-700' :
                    'bg-orange-100 text-orange-700'
                }`}>
                    {val}
                </span>
            )
        },
        {
            key: "actions",
            label: "Action",
            render: (_, row) => (
                <Button 
                    text="View Details"
                    variant="ghost"
                    onClick={() => handleViewTicket(row)}
                />
            )
        }
    ];

    const supportRows = supportTickets.map((t, i) => ({ id: t.id || t._id, ...t }));

    const isClosed = ticketDetails ? ["resolved", "closed"].includes(ticketDetails.status?.toLowerCase()) : false;
    const isCreatorMe = ticketDetails?.raisedBy?._id === currentUser?._id;
    const initialMessage = ticketDetails ? {
        sender: isCreatorMe ? "Me" : ticketDetails.raisedBy?.name || "User",
        time: new Date(ticketDetails.createdAt).toLocaleString(),
        text: ticketDetails.description,
    } : null;

    const threadMessages = ticketDetails ? (ticketDetails.responses || []).map((res) => ({
        sender: res.user?._id === currentUser?._id ? "Me" : res.user?.name || "Admin/Support",
        time: new Date(res.createdAt).toLocaleString(),
        text: res.message,
    })) : [];

    const chatMessages = ticketDetails ? [initialMessage, ...threadMessages] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="mb-2">
                <Heading 
                    primaryText="HRM" 
                    secondaryText="Dashboard" 
                />
            </div>

            <DashGrid gap={6}>
                <EnhancedDashCard
                    title="Attendance Rate"
                    value={attendanceRate}
                    icon={<TrendingUp size={22} />}
                    accentColor="#3b82f6"
                    size={4}
                />
                
                <EnhancedDashCard
                    title="Total Leave Available"
                    value={totalLeaveAvailable}
                    icon={<PieChart size={22} />}
                    accentColor="#10b981"
                    size={4}
                />
                
                <EnhancedDashCard
                    title="Active Support Tickets"
                    value={activeTicketsCount}
                    icon={<MessageSquare size={22} />}
                    accentColor="#f59e0b"
                    size={4}
                />
            </DashGrid>

            {/* Tab System Wrapper */}
            <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-[150px] py-4 px-6 text-sm font-bold capitalize transition-colors border-b-2 whitespace-nowrap outline-none ${
                                activeTab === tab.id 
                                    ? 'border-[#223F74] text-[#223F74] bg-white' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 bg-slate-50/30 min-h-[400px] flex flex-col gap-6">
                    {fetchError ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to load HRM Data</h3>
                            <p className="text-sm text-slate-500 max-w-md mb-6">{fetchError}</p>
                            <Button 
                                text="Retry" 
                                onClick={() => { setFetchError(null); loadData(true); }} 
                                variant="primary"
                                className="px-6"
                            />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'attendance_leave' && (
                                <>
                                    <Grid gap={6}>
                                        {/* Left Column: Leave Balances */}
                                        <div className="col-span-12 lg:col-span-6 space-y-6">
                                            <CardBox title="Leave Balances" icon={PieChart}>
                                                {loading ? (
                                                    <div className="flex justify-center items-center h-48">
                                                        <Loader2 className="w-8 h-8 text-[#223F74] animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4 h-full content-center">
                                                        {leaveBalance.map((b, i) => (
                                                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{b.l}</p>
                                                                <p className={`text-2xl font-black mt-1 ${b.c}`}>{b.v}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardBox>
                                        </div>

                                        {/* Right Column: Apply Leave */}
                                        <div className="col-span-12 lg:col-span-6 space-y-6">
                                            <CardBox title="Apply Leave" icon={Calendar}>
                                                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                                                    <SelectField 
                                                        label="Leave Type" 
                                                        id="leave-type" 
                                                        value={leaveData.type} 
                                                        onChange={e => setLeaveData({ ...leaveData, type: e.target.value })}
                                                    >
                                                        <Option value="Casual Leave (CL)">Casual Leave (CL)</Option>
                                                        <Option value="Sick Leave (SL)">Sick Leave (SL)</Option>
                                                        <Option value="Earned Leave (EL)">Earned Leave (EL)</Option>
                                                        <Option value="Leave Without Pay (LWP)">Leave Without Pay (LWP)</Option>
                                                    </SelectField>

                                                    <Grid gap={4}>
                                                        <DataField 
                                                            label="Start Date" 
                                                            type="date" 
                                                            size={6} 
                                                            value={leaveData.start} 
                                                            onChange={e => setLeaveData({ ...leaveData, start: e.target.value })} 
                                                            required 
                                                        />
                                                        <DataField 
                                                            label="End Date" 
                                                            type="date" 
                                                            size={6} 
                                                            value={leaveData.end} 
                                                            onChange={e => setLeaveData({ ...leaveData, end: e.target.value })} 
                                                            required 
                                                        />
                                                    </Grid>

                                                    <DataField 
                                                        label="Reason" 
                                                        type="textarea" 
                                                        rows={3}
                                                        placeholder="State your reason for leave..."
                                                        value={leaveData.reason} 
                                                        onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })} 
                                                        required 
                                                    />

                                                    <Button text="Submit Application" icon={<Send size={18} />} type="submit" variant="primary" className="w-full" />
                                                </form>
                                            </CardBox>
                                        </div>
                                    </Grid>
                                    
                                    <Grid gap={6}>
                                        {loading ? (
                                            <div className="col-span-12 flex justify-center items-center h-64 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                                                <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
                                            </div>
                                        ) : (
                                            <DataTable 
                                                title="Attendance History (Last 30 Days)"
                                                columns={attendanceColumns}
                                                rows={attendanceRows}
                                                size={12}
                                                searchable={true}
                                                headerAction={
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-xs font-bold text-slate-500">Today's Status</p>
                                                            <p className="text-xs font-black text-[#223F74]">
                                                                {isClockedIn 
                                                                    ? `Clocked In: ${clockInTime ? new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}` 
                                                                    : (clockOutTime 
                                                                        ? `Clocked Out: ${new Date(clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                                                        : 'Not Clocked In Today'
                                                                      )
                                                                }
                                                            </p>
                                                        </div>
                                                        <Button 
                                                            text={isClockedIn ? "Clock Out" : "Clock In"}
                                                            icon={<LogOut size={16} />}
                                                            variant={isClockedIn ? "danger" : "success"}
                                                            onClick={handleAttendanceToggle}
                                                        />
                                                    </div>
                                                }
                                            />
                                        )}
                                    </Grid>

                                    <Grid gap={6}>
                                        {loading ? (
                                            <div className="col-span-12 flex justify-center items-center h-64 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                                                <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
                                            </div>
                                        ) : (
                                            <DataTable 
                                                title="Leave Applications History"
                                                columns={leaveHistoryColumns}
                                                rows={leaveHistoryRows}
                                                size={12}
                                                searchable={true}
                                            />
                                        )}
                                    </Grid>
                                </>
                            )}

                            {activeTab === 'payroll' && (
                                <>
                                    <Grid gap={6}>
                                        <div className="col-span-12">
                                            <CardBox title="Payslips" icon={Printer}>
                                                <div className="flex flex-col items-center justify-center gap-4 mt-2 bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center flex-1">
                                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                                                        <Printer size={32} />
                                                    </div>
                                                    <p className="text-sm text-slate-500 max-w-[300px]">Download or print your latest salary slips for your records.</p>
                                                    <Button 
                                                        text="Print Slip"
                                                        icon={<Printer size={18} />}
                                                        variant="primary"
                                                        onClick={() => window.print()}
                                                        className="w-full max-w-[200px] mt-4"
                                                    />
                                                </div>
                                            </CardBox>
                                        </div>
                                    </Grid>

                                    <Grid>
                                        {loading ? (
                                            <div className="col-span-12 flex justify-center items-center h-64 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                                                <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
                                            </div>
                                        ) : (
                                            <DataTable 
                                                title="Salary & Payouts"
                                                columns={payoutColumns}
                                                rows={payoutRows}
                                                size={12}
                                                searchable={true}
                                            />
                                        )}
                                    </Grid>
                                </>
                            )}

                            {activeTab === 'support' && (
                                <>
                                    <Grid>
                                        {loading ? (
                                            <div className="col-span-12 flex justify-center items-center h-64 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                                                <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
                                            </div>
                                        ) : (
                                            <DataTable 
                                                title="Support Ticket History"
                                                columns={supportColumns}
                                                rows={supportRows}
                                                size={12}
                                                searchable={true}
                                                headerAction={
                                                    <Button 
                                                        text="Create Ticket" 
                                                        icon={<MessageSquare size={16} />} 
                                                        variant="primary" 
                                                        onClick={() => setIsTicketModalOpen(true)} 
                                                    />
                                                }
                                            />
                                        )}
                                    </Grid>

                                    <div className="mt-6">
                                        <CardBox title="Exit" icon={UserMinus}>
                                            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 mt-2">
                                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                                                        <UserMinus size={32} />
                                                    </div>
                                                    <div className="flex flex-col justify-center h-full">
                                                        <h3 className="font-bold text-red-900 text-lg mb-1">Initiate Resignation</h3>
                                                        <p className="text-sm text-red-700/80 font-medium max-w-xl">
                                                            Begin the formal exit process. This action will notify human resources and start your notice period.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <Button 
                                                        text="Apply Now" 
                                                        icon={<UserMinus size={18} />}
                                                        variant="danger" 
                                                        onClick={handleResignationSubmit}
                                                        className="w-full sm:w-auto px-8 py-3"
                                                    />
                                                </div>
                                            </div>
                                        </CardBox>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            {isTicketModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsTicketModalOpen(false)}>
                    <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8" onClick={e => e.stopPropagation()}>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100 flex justify-between items-start rounded-t-[24px]">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#223F74]">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Submit a Request</h3>
                                    <p className="text-sm text-slate-500 font-medium">Our support team usually responds within 2 hours.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsTicketModalOpen(false)} type="button" className="text-slate-400 hover:text-slate-700 bg-white/50 hover:bg-white rounded-full p-2 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 sm:p-8">
                            <form onSubmit={handleComplaintSubmit} className="space-y-6">
                                <Grid gap={4}>
                                    <SelectField 
                                        label="Category" 
                                        id="ticket-category"
                                        size={6} 
                                        value={ticketData.category}
                                        onChange={e => setTicketData({...ticketData, category: e.target.value})}
                                    >
                                        <Option value="IT Support">IT Support</Option>
                                        <Option value="HR Query">HR Query</Option>
                                        <Option value="Payroll Issue">Payroll Issue</Option>
                                        <Option value="Other">Other</Option>
                                    </SelectField>
                                    
                                    <SelectField 
                                        label="Priority" 
                                        id="ticket-priority"
                                        size={6} 
                                        value={ticketData.priority}
                                        onChange={e => setTicketData({...ticketData, priority: e.target.value})}
                                    >
                                        <Option value="Low">Low</Option>
                                        <Option value="Medium">Medium</Option>
                                        <Option value="High">High</Option>
                                    </SelectField>
                                </Grid>

                                <DataField 
                                    label="Subject"
                                    type="text"
                                    placeholder="Brief summary of the issue..."
                                    value={ticketData.subject}
                                    onChange={e => setTicketData({...ticketData, subject: e.target.value})}
                                    required
                                />

                                <DataField 
                                    label="Description" 
                                    type="textarea" 
                                    rows={4}
                                    placeholder="Describe your issue or grievance in detail..."
                                    value={ticketData.description} 
                                    onChange={e => setTicketData({...ticketData, description: e.target.value})} 
                                    required 
                                />

                                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                                    <Button text="Cancel" variant="ghost" type="button" onClick={() => setIsTicketModalOpen(false)} />
                                    <Button text="Submit Ticket" icon={<Send size={18} />} type="submit" variant="primary" className="px-8 py-2.5" />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Ticket Details Modal */}
            {isDetailModalOpen && createPortal(
                <PanelModal
                    id="ticket-detail-modal"
                    title={`Ticket Details: ${ticketDetails?.title || 'Loading...'}`}
                    isVisible={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    size="lg"
                >
                    {isDetailsLoading || !ticketDetails ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="animate-spin text-[#223F74]" size={32} />
                            <p className="text-sm font-semibold text-slate-500">Loading details...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-[650px]">
                            <div className="flex-1 overflow-hidden p-2 flex flex-col gap-6">
                                <Grid cols={12} gap={4}>
                                    <div className="col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                                        <p className="text-sm font-bold text-slate-700 capitalize">{ticketDetails.category}</p>
                                    </div>
                                    <div className="col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Priority</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-1 ${
                                            ticketDetails.priority?.toLowerCase() === 'high' ? 'bg-amber-100 text-amber-700' : 
                                            ticketDetails.priority?.toLowerCase() === 'low' ? 'bg-emerald-100 text-emerald-700' : 
                                            'bg-blue-100 text-blue-700'
                                        }`}>{ticketDetails.priority}</span>
                                    </div>
                                    <div className="col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-1 ${
                                            ticketDetails.status?.toLowerCase() === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 
                                            ticketDetails.status?.toLowerCase() === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
                                            ticketDetails.status?.toLowerCase() === 'closed' ? 'bg-slate-200 text-slate-700' : 
                                            'bg-orange-100 text-orange-700'
                                        }`}>{ticketDetails.status?.replace('_', ' ')}</span>
                                    </div>
                                </Grid>
                                
                                <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 p-4 overflow-hidden flex flex-col">
                                    <UserChat
                                        messages={chatMessages}
                                        onSend={handleReply}
                                        currentUser="Me"
                                        maxHeight="h-[380px]"
                                        readOnly={isClosed}
                                        showAttach={false}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </PanelModal>,
                document.body
            )}
        </div>
    );
};

export default HRM;
