import React, { useState, useEffect, useCallback } from 'react';
import {
    Clock, UserCheck, UserX, CalendarDays,
    RefreshCw, CheckCircle, XCircle, LogIn,
    LogOut, Plus, AlertCircle, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    Grid,
    Heading,
    Button,
    DataTable,
    DashCard,
    Modal,
    openModal,
    closeModal,
    Label,
    DataField,
    ModalData,
    ModalGrid
} from '../../../components/shared/Common_Components';

import {
    getMyAttendance,
    clockIn,
    clockOut,
    getMyLeaves,
    applyMyLeave
} from '../../../services/api/subjectTeacherAttendanceApi';

// ── helpers ───────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        absent: 'bg-rose-100 text-rose-700 border-rose-200',
        late: 'bg-amber-100 text-amber-700 border-amber-200',
        half_day: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        on_leave: 'bg-slate-100 text-slate-700 border-slate-200',
        holiday: 'bg-purple-100 text-purple-700 border-purple-200',
        approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const icons = {
        approved: <CheckCircle size={10} />,
        pending: <Clock size={10} />,
        rejected: <XCircle size={10} />,
        present: <CheckCircle size={10} />,
        absent: <XCircle size={10} />,
        late: <AlertCircle size={10} />,
    };
    const labels = {
        approved: 'Approved',
        pending: 'Pending',
        rejected: 'Rejected',
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        half_day: 'Half Day',
        on_leave: 'On Leave',
        holiday: 'Holiday'
    };
    const s = status ? status.toLowerCase() : '';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[s] || map.pending}`}>
            {icons[s]} {labels[s] || s}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────
const MyAttendance = () => {
    const [activeTab, setActiveTab] = useState('attendance');

    // ── attendance state ──────────────────────────────────────
    const [attendanceData, setAttendanceData] = useState({
        today: null,
        history: []
    });
    const [loadingAtt, setLoadingAtt] = useState(false);

    // ── leave state ───────────────────────────────────────────
    const [leaveData, setLeaveData] = useState({
        leaves: [],
        stats: { totalLeaves: 0, pending: 0, approved: 0, rejected: 0 }
    });
    const [loadingLeave, setLoadingLeave] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);

    // ── API service functions ─────────────────────────────────
    const fetchAttendance = useCallback(async () => {
        setLoadingAtt(true);
        try {
            const response = await getMyAttendance(null);
            setAttendanceData(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch attendance records');
        } finally {
            setLoadingAtt(false);
        }
    }, []);

    const fetchLeave = useCallback(async () => {
        setLoadingLeave(true);
        try {
            const response = await getMyLeaves(null);
            setLeaveData(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch leave records');
        } finally {
            setLoadingLeave(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'attendance') fetchAttendance();
        if (activeTab === 'leave') fetchLeave();
    }, [activeTab, fetchAttendance, fetchLeave]);

    // ── clock handlers ────────────────────────────────────────
    const handleClockIn = async () => {
        try {
            await clockIn(null, {});
            toast.success('Clocked in successfully!');
            fetchAttendance();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to clock in');
        }
    };

    const handleClockOut = async () => {
        try {
            await clockOut(null, {});
            toast.success('Clocked out successfully!');
            fetchAttendance();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to clock out');
        }
    };

    // ── leave handlers ────────────────────────────────────────
    const [leaveForm, setLeaveForm] = useState({
        leaveType: 'full_day',
        fromDate: todayStr(),
        toDate: todayStr(),
        totalDays: 1,
        reason: '',
    });

    const handleOpenLeaveModal = () => {
        setLeaveForm({
            leaveType: 'full_day',
            fromDate: todayStr(),
            toDate: todayStr(),
            totalDays: 1,
            reason: '',
        });
        openModal('apply-leave-modal');
    };

    useEffect(() => {
        if (leaveForm.fromDate && leaveForm.toDate) {
            const start = new Date(leaveForm.fromDate);
            const end = new Date(leaveForm.toDate);
            const diffTime = end - start;
            let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays < 1) diffDays = 1;

            if (leaveForm.leaveType === 'half_day') {
                if (leaveForm.totalDays !== 0.5 * diffDays) {
                    setLeaveForm(prev => ({ ...prev, totalDays: 0.5 * diffDays }));
                }
            } else {
                if (leaveForm.totalDays !== diffDays) {
                    setLeaveForm(prev => ({ ...prev, totalDays: diffDays }));
                }
            }
        }
    }, [leaveForm.fromDate, leaveForm.toDate, leaveForm.leaveType]);

    const handleSubmitLeave = async (e) => {
        e.preventDefault();
        if (!leaveForm.reason.trim()) {
            toast.error('Please enter a reason');
            return;
        }
        try {
            await applyMyLeave(null, leaveForm);
            toast.success('Leave applied successfully!');
            closeModal('apply-leave-modal');
            fetchLeave();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to apply leave');
        }
    };

    const handleViewLeave = (leave) => {
        setSelectedLeave(leave);
        openModal('view-leave-modal');
    };

    // ── Attendance Table Columns ──────────────────────────────
    const attendanceColumns = [
        {
            key: 'date',
            label: 'Date',
            render: (val) => fmtDate(val),
            sortValue: (row) => new Date(row.date).getTime(),
        },
        { key: 'clockIn', label: 'Clock In', render: (val) => val ? fmtTime(val) : '—' },
        { key: 'clockOut', label: 'Clock Out', render: (val) => val ? fmtTime(val) : '—' },
        {
            key: 'totalHours',
            label: 'Hours',
            render: (val) => val > 0 ? `${val}h` : '—'
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ];

    // ── Leave Table Columns ────────────────────────────────────
    const typeLabel = {
        full_day: 'Full Day',
        half_day: 'Half Day',
    };

    const leaveColumns = [
        {
            key: 'fromDate',
            label: 'From',
            render: (val) => fmtDate(val),
            sortValue: (row) => new Date(row.fromDate).getTime(),
        },
        {
            key: 'toDate',
            label: 'To',
            render: (val) => fmtDate(val),
        },
        {
            key: 'totalDays',
            label: 'Days'
        },
        {
            key: 'leaveType',
            label: 'Type',
            render: (val) => typeLabel[val] || val
        },
        {
            key: 'reason',
            label: 'Reason'
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ];

    const leaveActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewLeave(row),
        },
    ];

    // ── leave balance cards data ──────────────────────────────
    const balanceCards = [
        {
            title: 'Total Leaves (Approved)',
            value: leaveData.stats.totalLeaves,
            accentColor: '#223F74',
            icon: <CalendarDays size={20} />,
        },
        {
            title: 'Pending',
            value: leaveData.stats.pending,
            accentColor: '#E0A04B',
            icon: <AlertCircle size={20} />
        },
        {
            title: 'Approved',
            value: leaveData.stats.approved,
            accentColor: '#5B9A6A',
            icon: <CheckCircle size={20} />
        },
        {
            title: 'Rejected',
            value: leaveData.stats.rejected,
            accentColor: '#D66B5F',
            icon: <XCircle size={20} />
        },
    ];

    // ── Derived Data for Clock Status ─────────────────────────
    const todayRec = attendanceData.today;
    const isClockedIn = todayRec && todayRec.clockIn;
    const clockInTimeStr = isClockedIn ? fmtTime(todayRec.clockIn) : '--:--';
    const clockOutTimeStr = todayRec && todayRec.clockOut ? fmtTime(todayRec.clockOut) : '--:--';
    const todayHours = todayRec ? todayRec.totalHours : 0;

    // ── Clock Status Card ─────────────────────────────────────
    const ClockStatusCard = () => (
        <div className="col-span-12 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl">
                        <Clock size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="font-black text-white text-base">Daily Attendance</p>
                        <p className="text-xs text-white/60 mt-0.5">{fmtDate(new Date())}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                    <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-white/80 text-xs font-bold">
                        {isClockedIn ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Clock In', value: clockInTimeStr, color: 'text-emerald-600' },
                        { label: "Today's Hours", value: `${todayHours > 0 ? todayHours : '0.0'}h`, color: 'text-[#223F74]' },
                        { label: 'Clock Out', value: clockOutTimeStr, color: 'text-rose-500' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E2E8F0] text-center">
                            <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[.25em]">{label}</p>
                            <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    {!isClockedIn ? (
                        <Button
                            text="Clock In"
                            icon={<LogIn size={18} />}
                            variant="primary"
                            size={0}
                            onClick={handleClockIn}
                        />
                    ) : (
                        <Button
                            text="Clock Out"
                            icon={<LogOut size={18} />}
                            variant="danger"
                            size={0}
                            onClick={handleClockOut}
                        />
                    )}
                </div>
            </div>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="My Attendance"
                        size={12}
                    />
                </div>
            </Grid>

            {/* ── Tab Navigation ── */}
            <Grid cols={12} gap={3}>
                <div className="col-span-12">
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5 mt-6">
                        {[
                            { key: 'attendance', label: 'Attendance Management', icon: Clock },
                            { key: 'leave', label: 'Leave Management', icon: CalendarDays },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === key
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

            {/* TAB 1 — ATTENDANCE MANAGEMENT */}
            {activeTab === 'attendance' && (
                <div className="mt-6">
                    <Grid cols={12} gap={4}>
                        {/* Stats Cards */}
                        <DashCard
                            title="Status"
                            value={isClockedIn ? 'Clocked In' : 'Not In'}
                            icon={isClockedIn ? <UserCheck size={20} /> : <UserX size={20} />}
                            accentColor={isClockedIn ? '#5B9A6A' : '#D66B5F'}
                            size={3}
                        />
                        <DashCard
                            title="Today's Hours"
                            value={`${todayHours > 0 ? todayHours : '0.0'}h`}
                            icon={<Clock size={20} />}
                            accentColor="#223F74"
                            size={3}
                        />
                        <DashCard
                            title="Clock In"
                            value={clockInTimeStr}
                            icon={<LogIn size={20} />}
                            accentColor="#7A8FC6"
                            size={3}
                        />
                        <DashCard
                            title="Clock Out"
                            value={clockOutTimeStr}
                            icon={<LogOut size={20} />}
                            accentColor="#E0A04B"
                            size={3}
                        />

                        {/* Clock In/Out Card */}
                        <ClockStatusCard />

                        {/* Attendance History Table */}
                        <div className="col-span-12">
                            <DataTable
                                columns={attendanceColumns}
                                rows={attendanceData.history}
                                title="Attendance History"
                                pageSize={10}
                                pageSizeOptions={[5, 10, 20, 50]}
                                searchable={true}
                                exportable={true}
                                exportFileName="attendance_history"
                                defaultSortKey="date"
                                defaultSortDir="desc"
                                date={true}
                                filters={[
                                    {
                                        title: 'Status',
                                        type: 'toggle',
                                        key: 'status',
                                        options: ['present', 'absent', 'half_day', 'on_leave']
                                    },
                                ]}
                                loading={loadingAtt}
                            />
                        </div>
                    </Grid>
                </div>
            )}

            {/* TAB 2 — LEAVE MANAGEMENT */}
            {activeTab === 'leave' && (
                <div className='mt-6'>
                    <Grid cols={12} gap={4}>
                        {/* Leave Balance Cards */}
                        {balanceCards.map((card, i) => (
                            <DashCard
                                key={i}
                                title={card.title}
                                value={card.value}
                                icon={card.icon}
                                accentColor={card.accentColor}
                                size={3}
                            />
                        ))}

                        {/* Leave History Table */}
                        <div className="col-span-12">
                            <DataTable
                                columns={leaveColumns}
                                rows={leaveData.leaves}
                                actions={leaveActions}
                                title="Leave History"
                                pageSize={10}
                                pageSizeOptions={[5, 10, 20, 50]}
                                searchable={true}
                                exportable={true}
                                exportFileName="leave_history"
                                filters={[
                                    {
                                        title: 'Status',
                                        type: 'toggle',
                                        key: 'status',
                                        options: ['pending', 'approved', 'rejected']
                                    },
                                    {
                                        title: 'Type',
                                        type: 'select',
                                        key: 'leaveType',
                                        options: ['full_day', 'half_day']
                                    },
                                ]}
                                date={true}
                                defaultSortKey="fromDate"
                                defaultSortDir="desc"
                                loading={loadingLeave}
                                headerAction={
                                    <Button
                                        text="Apply Leave"
                                        icon={<Plus size={15} />}
                                        variant="primary"
                                        size={0}
                                        onClick={handleOpenLeaveModal}
                                    />
                                }
                            />
                        </div>
                    </Grid>
                </div>
            )}

            {/* MODALS */}
            {/* Apply Leave Modal */}
            <Modal id="apply-leave-modal" title="Apply for Leave" size="md">
                <form onSubmit={handleSubmitLeave} className="space-y-5">
                    <div className="space-y-1.5">
                        <Label text="Leave Type" />
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: 'full_day', label: 'Full Day' },
                                { val: 'half_day', label: 'Half Day' },
                            ].map(({ val, label }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setLeaveForm(p => ({ ...p, leaveType: val }))}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${leaveForm.leaveType === val
                                            ? 'bg-[#223F74] text-white border-[#223F74] shadow-lg shadow-[#223F74]/20'
                                            : 'bg-white text-[#6B7280] border-[#E2E8F0] hover:border-[#223F74]/30'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <DataField
                        label="From Date"
                        id="fromDate"
                        type="date"
                        min={todayStr()}
                        value={leaveForm.fromDate}
                        onChange={e => setLeaveForm(p => ({ ...p, fromDate: e.target.value }))}
                    />

                    <DataField
                        label="To Date"
                        id="toDate"
                        type="date"
                        min={leaveForm.fromDate || todayStr()}
                        value={leaveForm.toDate}
                        onChange={e => setLeaveForm(p => ({ ...p, toDate: e.target.value }))}
                    />

                    <DataField
                        label="Total Days"
                        id="totalDays"
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={leaveForm.totalDays}
                        readOnly={true}
                        disabled={true}
                    />

                    <DataField
                        label="Reason *"
                        id="reason"
                        type="textarea"
                        placeholder="Enter reason for leave…"
                        rows={3}
                        value={leaveForm.reason}
                        onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                    />

                    <div className="flex gap-3 pt-1 border-t border-[#E2E8F0]">
                        <Button
                            text="Submit Leave"
                            icon={<CalendarDays size={15} />}
                            variant="primary"
                            type="submit"
                            size={0}
                            onClick={handleSubmitLeave}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            type="button"
                            onClick={() => closeModal('apply-leave-modal')}
                        />
                    </div>
                </form>
            </Modal>

            {/* View Leave Modal */}
            <Modal id="view-leave-modal" title="Leave Details" size="md">
                {selectedLeave && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                {typeLabel[selectedLeave.leaveType]?.substring(0, 2).toUpperCase() || 'LV'}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">
                                    {typeLabel[selectedLeave.leaveType] || selectedLeave.leaveType}
                                </p>
                                <p className="text-sm text-slate-300">
                                    {fmtDate(selectedLeave.fromDate)} - {fmtDate(selectedLeave.toDate)}
                                </p>
                            </div>
                        </div>

                        <ModalGrid title="Leave Information" cols={2}>
                            <ModalData label="From" value={fmtDate(selectedLeave.fromDate)} />
                            <ModalData label="To" value={fmtDate(selectedLeave.toDate)} />
                            <ModalData label="Days" value={selectedLeave.totalDays} />
                            <ModalData label="Type" value={typeLabel[selectedLeave.leaveType] || selectedLeave.leaveType} />
                            <ModalData label="Status" value={<StatusBadge status={selectedLeave.status} />} />
                            <ModalData label="Reason" value={selectedLeave.reason} />
                        </ModalGrid>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                type="button"
                                onClick={() => closeModal('view-leave-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyAttendance;
