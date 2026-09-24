import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Filter, Send, Download, MoreVertical, Loader2, Eye,
    Edit, Mail, Users, UserCheck, UserX, X, ChevronLeft, Phone,
    Calendar, BookOpen, IndianRupee, History, CheckCircle2,
    AlertCircle, CreditCard, Wallet,
} from 'lucide-react';
import {
    getDuesList,
    sendDuesReminder,
    sendBulkDuesReminder,
    updateStudentStatus,
} from '../../services/accountantDuesApi';   // ← adjust path if needed
import { exportToCSV } from '../../features/accountant/exportUtils';
import { toast } from 'react-hot-toast';
import {
    PanelModal, Button, DataField, Grid, ToggleButton,
    Heading, DashGrid, EnhancedDashCard, DataTable,
} from '../../components/shared/Common_Components';


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (amount) => {
    if (isNaN(amount) || amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
};
// ─────────────────────────────────────────────────────────────────────────────
// StudentDetailsModal
// ─────────────────────────────────────────────────────────────────────────────
const StudentDetailsModal = ({ student, onClose, onSendEmail }) => (
    <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-2xl text-white">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl border-2 border-white/30">
                    {student?.name?.charAt(0) || 'S'}
                </div>
                <div>
                    <h3 className="text-xl font-bold">{student?.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-white/80 mt-1">
                        <span>{student?.admissionNo}</span>
                        <span className="w-1 h-1 bg-white/40 rounded-full" />
                        <span>Class {student?.class} – {student?.section}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/60 mt-2">
                        <span>Status: {student?.status}</span>
                        <span>•</span>
                        <span>Due: {fmt(student?.dues || 0)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {[
                { label: 'Phone',         value: student?.phone || 'N/A',           icon: <Phone size={14} className="text-[#6B7280]" /> },
                { label: 'Email',         value: student?.email || student?.parentEmail || 'N/A', icon: <Mail size={14} className="text-[#6B7280]" /> },
                { label: "Father's Name", value: student?.fatherName || 'N/A',      icon: null },
                { label: "Mother's Name", value: student?.motherName || 'N/A',      icon: null },
            ].map(({ label, value, icon }) => (
                <div key={label} className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
                    <p className="font-semibold text-[#1D1D1F] mt-1 flex items-center gap-2">
                        {icon}{value}
                    </p>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0] text-center">
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Fee</p>
                <p className="font-bold text-[#1D1D1F] mt-1">{fmt(student?.totalFee || 0)}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Paid</p>
                <p className="font-bold text-emerald-700 mt-1">{fmt(student?.paid || 0)}</p>
            </div>
            <div className={`p-3 rounded-xl border text-center ${(student?.dues || 0) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Due</p>
                <p className={`font-bold mt-1 ${(student?.dues || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmt(student?.dues || 0)}
                </p>
            </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button text="Send Reminder" variant="primary" size={6}
                icon={<Mail size={16} />}
                onClick={() => { onClose(); onSendEmail(student); }} />
            <Button text="Close" variant="secondary" size={6} onClick={onClose} />
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EditStatusModal  — calls real API
// ─────────────────────────────────────────────────────────────────────────────
const EditStatusModal = ({ student, onClose, onUpdate }) => {
    const [status, setStatus]   = useState(student?.status || 'Active');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await updateStudentStatus(student.id, status);
            toast.success(`Student status updated to ${status}`);
            if (onUpdate) onUpdate({ ...student, status });
            onClose();
        } catch (e) {
    console.log("URL:", e.config?.url);
    console.log("Status:", e.response?.status);
    console.log("Response:", e.response?.data);

    toast.error(e.response?.data?.message || "Failed");
} finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-2xl text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl border-2 border-white/30">
                        {student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{student?.name}</h3>
                        <p className="text-sm text-white/80">{student?.admissionNo} • Class {student?.class} – {student?.section}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStatus('Active')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${status === 'Active' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-[#E2E8F0] hover:border-emerald-200 hover:bg-emerald-50/50'}`}>
                    <UserCheck className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                    <span className="text-sm font-bold">Active</span>
                </button>
                <button onClick={() => setStatus('Inactive')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${status === 'Inactive' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-[#E2E8F0] hover:border-rose-200 hover:bg-rose-50/50'}`}>
                    <UserX className="w-6 h-6 mx-auto mb-2 text-rose-600" />
                    <span className="text-sm font-bold">Inactive</span>
                </button>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                <Button text={loading ? 'Updating…' : 'Update Status'} variant="primary" size={6}
                    onClick={handleSubmit} loading={loading} disabled={loading} />
                <Button text="Cancel" variant="secondary" size={6} onClick={onClose} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SendEmailModal  — calls real sendDuesReminder API
// ─────────────────────────────────────────────────────────────────────────────
const SendEmailModal = ({ student, onClose }) => {
    const [subject, setSubject] = useState('Fee Payment Reminder');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (student) {
            setMessage(
                `Dear Parent/Guardian of ${student.name},\n\nThis is to remind you that a fee payment of ₹${(student?.dues || 0).toLocaleString('en-IN')} is pending for ${student.name} (${student.admissionNo}), Class ${student.class}-${student.section}.\n\nPlease clear the dues at the earliest to avoid any late fee penalty.\n\nThank you,\nSchool Administration`
            );
        }
    }, [student]);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error('Please fill all fields');
            return;
        }
        setLoading(true);
        try {
            await sendDuesReminder(student.id, { subject, message });
            toast.success(`Reminder sent to ${student?.email || student?.parentEmail || 'parent'}`);
            onClose();
        } catch (e) {
    console.log("URL:", e.config?.url);
    console.log("Status:", e.response?.status);
    console.log("Response:", e.response?.data);

    toast.error(e.response?.data?.message || "Failed");
} finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-2xl text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl border-2 border-white/30">
                        {student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Send Reminder</h3>
                        <p className="text-sm text-white/80">
                            To: {student?.email || student?.parentEmail || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <DataField label="Subject" id="subject" placeholder="Email subject"
                        value={subject} onChange={e => setSubject(e.target.value)} size={12} />
                </div>
                <div className="col-span-12">
                    <DataField label="Message" id="message" type="textarea"
                        placeholder="Write your message here…"
                        value={message} onChange={e => setMessage(e.target.value)}
                        rows={6} size={12} />
                </div>
            </Grid>

            <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                <Button text={loading ? 'Sending…' : 'Send Reminder'} variant="primary" size={6}
                    icon={<Mail size={16} />} onClick={handleSubmit}
                    loading={loading} disabled={loading} />
                <Button text="Cancel" variant="secondary" size={6} onClick={onClose} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// BulkReminderModal
// ─────────────────────────────────────────────────────────────────────────────
const BulkReminderModal = ({ count, onClose, onSent }) => {
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        try {
            const res = await sendBulkDuesReminder({});
            const d   = res.data?.data || {};
            toast.success(`Sent: ${d.sent?.length || 0} | Failed: ${d.failed?.length || 0} | Skipped: ${d.skipped?.length || 0}`);
            if (onSent) onSent();
            onClose();
        } catch (e) {
    console.log("URL:", e.config?.url);
    console.log("Status:", e.response?.status);
    console.log("Response:", e.response?.data);

    toast.error(e.response?.data?.message || "Failed");
}finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold text-amber-800">Send bulk reminders?</p>
                    <p className="text-sm text-amber-700 mt-1">
                        This will send fee reminder emails to all <strong>{count}</strong> defaulter
                        students currently visible in the list. Emails are sent to the parent's
                        registered email address.
                    </p>
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <Button text={loading ? 'Sending…' : `Send to All ${count} Students`}
                    variant="primary" size={6} icon={<Send size={16} />}
                    onClick={handleSend} loading={loading} disabled={loading} />
                <Button text="Cancel" variant="secondary" size={6} onClick={onClose} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const StudentDuesList = () => {
    const schoolId = localStorage.getItem('schoolId');
    const [classSearch, setClassSearch] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('classSearch') || '';
    });
    const [students,       setStudents]       = useState([]);
//    const [classes, setClasses] = useState([]);
    const [summary,        setSummary]        = useState({ totalDues: 0, totalStudents: 0, activeStudents: 0, inactiveStudents: 0 });
    const [loading,        setLoading]        = useState(false);
    const [searchTerm,     setSearchTerm]     = useState('');
   const [selectedClass, setSelectedClass] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');

    const [selectedStudent,   setSelectedStudent]   = useState(null);
    const [showDetailsModal,  setShowDetailsModal]  = useState(false);
    const [showEditModal,     setShowEditModal]      = useState(false);
    const [showEmailModal,    setShowEmailModal]     = useState(false);
    const [showBulkModal,     setShowBulkModal]      = useState(false);

    // ── Fetch dues list ──
    const fetchDues = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
         const params = {
    search: searchTerm || undefined,
    status: selectedStatus !== 'All' ? selectedStatus : undefined,
    classSearch: classSearch || undefined,
    limit: 100,
};
            const res = await getDuesList(schoolId, params);
            if (res.data?.success) {
                setStudents(res.data.data.students  || []);
                if (res.data.data.summary) setSummary(res.data.data.summary);
            }
        } catch (e) {
    console.log("URL:", e.config?.url);
    console.log("Status:", e.response?.status);
    console.log("Response:", e.response?.data);

    toast.error(e.response?.data?.message || "Failed");
}
finally {
            setLoading(false);
        }
    }, [schoolId, searchTerm, selectedStatus]);

    useEffect(() => {
        const t = setTimeout(fetchDues, 400);
        return () => clearTimeout(t);
    }, [fetchDues]);

    // ── Helpers ──
    const openEmail  = (student) => { setSelectedStudent(student); setShowEmailModal(true); };
    const resetFilters = () => { setSearchTerm(''); setSelectedClass(''); setSelectedStatus('All'); };

    const handleExport = () => {
        if (!students.length) { toast.error('Nothing to export'); return; }
        exportToCSV(students.map(s => ({
            'Student ID':       s.admissionNo,
            'Student Name':     s.name,
            'Class':            `${s.class || ''}${s.section ? '-' + s.section : ''}`,
            'Total Fees':       s.totalFee,
            'Paid Amount':      s.paid,
            'Dues Outstanding': s.dues,
            'Status':           s.status,
        })), `Pending_Dues_${new Date().toLocaleDateString('en-IN')}`);
        toast.success('Dues report exported');
    };

    const handleUpdateStatus = (updated) => {
        setStudents(prev => prev.map(s => s.id === updated.id ? { ...s, status: updated.status } : s));
        setSummary(prev => {
            const active   = students.filter(s => (s.id === updated.id ? updated.status : s.status) === 'Active').length;
            const inactive = students.filter(s => (s.id === updated.id ? updated.status : s.status) === 'Inactive').length;
            return { ...prev, activeStudents: active, inactiveStudents: inactive };
        });
    };

    // ── Table columns ──
    const studentColumns = [
        {
            key: 'name', label: 'Student Info', width: '20%',
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74] font-bold text-sm">
                        {row.name?.split(' ').map(n => n[0]).join('') || 'S'}
                    </div>
                    <div>
                        <p className="font-bold text-[#1D1D1F]">{row.name}</p>
                        <p className="text-xs text-[#6B7280]">{row.admissionNo}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'class', label: 'Class', width: '12%',
            render: (val, row) => `${val || 'N/A'}${row.section ? ' – ' + row.section : ''}`,
        },
        { key: 'totalFee', label: 'Total Fee', width: '14%', render: v => fmt(v || 0) },
        { key: 'paid',     label: 'Paid',      width: '14%', render: v => fmt(v || 0) },
        {
            key: 'dues', label: 'Dues', width: '14%',
            render: v => (
                <span className={`font-bold ${v > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmt(v || 0)}
                </span>
            ),
        },
        {
            key: 'status', label: 'Status', width: '12%',
            render: v => {
                const colors = {
                    Active:   'bg-emerald-100 text-emerald-700 border-emerald-200',
                    Inactive: 'bg-rose-100 text-rose-700 border-rose-200',
                };
                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[v] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {v || 'N/A'}
                    </span>
                );
            },
        },
        {
            key: 'actions', label: 'Actions', width: '14%',
            render: (_, row) => (
                <div className="flex gap-1.5">
                    <button onClick={() => { setSelectedStudent(row); setShowDetailsModal(true); }}
                        className="p-1.5 text-[#6B7280] hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors" title="View Details">
                        <Eye size={16} />
                    </button>
                    <button onClick={() => { setSelectedStudent(row); setShowEditModal(true); }}
                        className="p-1.5 text-[#6B7280] hover:text-[#F59B87] hover:bg-[#F59B87]/10 rounded-lg transition-colors" title="Edit Status">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => openEmail(row)}
                        className="p-1.5 text-[#6B7280] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Send Reminder">
                        <Mail size={16} />
                    </button>
                </div>
            ),
        },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">

            {/* Header */}
            <div className="w-full mb-8">
                <Heading 
                    primaryText="Fee" 
                    secondaryText="Pending List"
                    action={
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-sm transition-all border border-amber-500/30">
                                <Send size={16} /> Bulk Remind ({summary.totalStudents})
                            </button>
                            <button onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20">
                                <Download size={16} /> Export
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Stats */}
            <div className="w-full mb-8">
                <DashGrid cols={12} gap={4}>
                    <EnhancedDashCard title="Total Pending Dues"  value={fmt(summary.totalDues || 0)}       icon={<IndianRupee size={22} />} accentColor="#ef4444" size={3} showAnimations />
                    <EnhancedDashCard title="Defaulter Students"  value={String(summary.totalStudents || 0)} icon={<Users size={22} />}       accentColor="#f59e0b" size={3} showAnimations />
                    <EnhancedDashCard title="Active Defaulters"   value={String(summary.activeStudents || 0)}icon={<UserCheck size={22} />}   accentColor="#22c55e" size={3} showAnimations />
                    <EnhancedDashCard title="Inactive Defaulters" value={String(summary.inactiveStudents || 0)} icon={<UserX size={22} />}    accentColor="#ef4444" size={3} showAnimations />
                </DashGrid>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <input type="text" placeholder="Search by name or admission…"
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
          <input
    type="text"
    placeholder="Search Class..."
    value={classSearch}
    onChange={(e) => setClassSearch(e.target.value)}
    className="w-full border rounded-lg px-3 py-2"
/>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <button onClick={resetFilters}
                        className="px-4 py-3 rounded-xl bg-[#223F74] text-white font-bold text-sm hover:bg-[#1a3360] transition-colors">
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-[#223F74] animate-spin" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-[#F4F7FB] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-10 h-10 text-[#9CA3AF]" />
                        </div>
                        <h4 className="text-lg font-bold text-[#1D1D1F]">No Defaulters Found</h4>
                        <p className="text-sm text-[#6B7280] mt-2">All students are up to date, or try adjusting your filters</p>
                    </div>
                ) : (
                    <DataTable
                        columns={studentColumns}
                        rows={students}
                        size={12}
                        pageSize={10}
                        pageSizeOptions={[5, 10, 20, 50]}
                        searchable={false}
                        title={`Defaulters (${students.length})`}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            {showDetailsModal && selectedStudent && (
                <PanelModal id="details-modal" title="Student Details"
                    isVisible={showDetailsModal}
                    onClose={() => { setShowDetailsModal(false); setSelectedStudent(null); }}
                    size="lg">
                    <StudentDetailsModal
                        student={selectedStudent}
                        onSendEmail={(s) => openEmail(s)}
                        onClose={() => { setShowDetailsModal(false); setSelectedStudent(null); }} />
                </PanelModal>
            )}

            {showEditModal && selectedStudent && (
                <PanelModal id="edit-modal" title="Update Status"
                    isVisible={showEditModal}
                    onClose={() => { setShowEditModal(false); setSelectedStudent(null); }}
                    size="md">
                    <EditStatusModal
                        student={selectedStudent}
                        onUpdate={handleUpdateStatus}
                        onClose={() => { setShowEditModal(false); setSelectedStudent(null); }} />
                </PanelModal>
            )}

            {showEmailModal && selectedStudent && (
                <PanelModal id="email-modal" title="Send Reminder"
                    isVisible={showEmailModal}
                    onClose={() => { setShowEmailModal(false); setSelectedStudent(null); }}
                    size="lg">
                    <SendEmailModal
                        student={selectedStudent}
                        onClose={() => { setShowEmailModal(false); setSelectedStudent(null); }} />
                </PanelModal>
            )}

            {showBulkModal && (
                <PanelModal id="bulk-modal" title="Send Bulk Reminders"
                    isVisible={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                    size="md">
                    <BulkReminderModal
                        count={summary.totalStudents}
                        onClose={() => setShowBulkModal(false)}
                        onSent={fetchDues} />
                </PanelModal>
            )}
        </div>
    );
};

export default StudentDuesList;
