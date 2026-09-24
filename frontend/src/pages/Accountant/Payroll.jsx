import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Download, FileText, Clock, Building, X,
    IndianRupee, Loader2, RefreshCw, Eye,
    Edit, CheckCircle, AlertCircle, Users,
    Wallet, Printer, Plus, Minus, ChevronDown,
    Settings, ArrowUpRight, Receipt ,Search
} from 'lucide-react';
import {
    getPayrollStaff,
    processPayroll as processPayrollApi,
    updateSalarySlip,
    getSalarySlips,
    generateBankTransferReport
} from '../../services/accountantPayrollApi';
import { exportToCSV } from '../../features/accountant/exportUtils';
import { toast } from 'react-hot-toast';
import {
    Heading,
    Grid,
    DashGrid,
    EnhancedDashCard,
    Button,
    DataField,
    PanelModal,
    DataTable,
    ToggleButton
} from '../../components/shared/Common_Components';

// ── helpers ────────────────────────────────────────────────────
const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n || 0);

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

// ── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        approved: 'bg-emerald-100 text-emerald-700',
        draft:    'bg-amber-100 text-amber-700',
        rejected: 'bg-rose-100 text-rose-700',
        pending:  'bg-blue-100 text-blue-700',
        none:     'bg-[#F4F7FB] text-[#9CA3AF]',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${map[status] || map.none}`}>
            {status === 'none' ? 'No Slip' : status}
        </span>
    );
};

// ── Reject Dialog ──────────────────────────────────────────────
const RejectDialog = ({ slip, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-100 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-[#223F74]">Reject Salary Slip</h3>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-4 mb-4 border border-[#E2E8F0]">
                <p className="font-bold text-[#1D1D1F]">{slip?.name}</p>
                <p className="text-sm text-[#6B7280]">{slip?.role} · {fmt(slip?.net)}</p>
            </div>
            <p className="text-sm text-rose-600 font-medium mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
                <button onClick={onConfirm} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold transition-all">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                    Reject Slip
                </button>
                <button onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all">
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// ── Advance Salary Dialog ──────────────────────────────────────
const AdvanceDialog = ({ staff, onConfirm, onCancel, loading }) => {
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [reason, setReason] = useState('');
    const [repayMonths, setRepayMonths] = useState('3');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!advanceAmount || Number(advanceAmount) <= 0) {
            toast.error('Enter a valid advance amount');
            return;
        }
        
        const maxAdvance = (staff?.base || 0) * 0.5;
        if (Number(advanceAmount) > maxAdvance) {
            toast.error(`Advance amount cannot exceed ${fmt(maxAdvance)} (50% of base)`);
            return;
        }

        if (Number(repayMonths) <= 0) {
            toast.error('Repayment period must be at least 1 month');
            return;
        }

        onConfirm({ advanceAmount: Number(advanceAmount), reason, repayMonths: Number(repayMonths) });
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                        <IndianRupee className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-[#223F74]">Advance Salary</h3>
                        <p className="text-xs text-[#6B7280] mt-0.5">Issue advance to {staff?.name}</p>
                    </div>
                </div>

                <div className="bg-[#F8F9FA] rounded-xl p-4 mb-6 border border-[#E2E8F0]">
                    <p className="font-bold text-[#1D1D1F]">{staff?.name}</p>
                    <p className="text-sm text-[#6B7280]">{staff?.role} · Base: {fmt(staff?.base)}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">
                            Advance Amount (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-bold text-sm">₹</span>
                            <input
                                type="number"
                                value={advanceAmount}
                                onChange={(e) => setAdvanceAmount(e.target.value)}
                                placeholder="e.g. 10000"
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 pl-8 pr-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#223F74]"
                                required
                            />
                        </div>
                        <p className="text-xs text-[#9CA3AF] pl-1">
                            Max recommended: {fmt((staff?.base || 0) * 0.5)} (50% of base)
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">
                            Repayment Period
                        </label>
                        <select
                            value={repayMonths}
                            onChange={(e) => setRepayMonths(e.target.value)}
                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                        >
                            <option value="1">1 month</option>
                            <option value="2">2 months</option>
                            <option value="3">3 months</option>
                            <option value="6">6 months</option>
                        </select>
                        {advanceAmount && (
                            <p className="text-xs text-amber-600 font-semibold pl-1">
                                Monthly deduction: {fmt(Number(advanceAmount) / Number(repayMonths))} / month
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">
                            Reason
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Medical emergency, personal need..."
                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F59B87] hover:bg-[#EC856D] disabled:opacity-60 text-white font-bold transition-all shadow-lg shadow-[#F59B87]/30">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
                            Issue Advance
                        </button>
                        <button type="button" onClick={onCancel}
                            className="flex-1 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Printable Salary Slip ──────────────────────────────────────
const PrintableSlip = ({ slip, month, year, onClose }) => {
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
            </head><body>${content}</body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 300);
    };

    const monthName = MONTHS[parseInt(month) - 1] || month;
    const totalEarnings = (slip.base || 0) + (slip.allowances || 0) + (slip.otAmount || 0) + (slip.bonus || 0);

    return (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-2xl my-4">
                <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
                    <h3 className="font-bold text-[#223F74] flex items-center gap-2">
                        <FileText size={18} /> Salary Slip — {monthName} {year}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#223F74] hover:bg-[#1A2F56] text-white font-bold text-sm transition-all">
                            <Printer size={15} /> Print / Download
                        </button>
                        <button onClick={onClose}
                            className="p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                            <X size={18} className="text-[#6B7280]" />
                        </button>
                    </div>
                </div>

                <div ref={printRef} className="slip p-8">
                    <div className="header bg-[#223F74] text-white p-6 rounded-xl mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-black">Salary Slip</h1>
                                <p className="text-sm text-white/70 mt-1">{monthName} {year}</p>
                            </div>
                            <span className={`badge ${slip.status === 'approved' ? 'approved' : 'draft'} text-xs font-black uppercase px-3 py-1 rounded-full ${slip.status === 'approved' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>
                                {slip.status}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Employee</p>
                                <p className="font-bold text-white">{slip.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Designation</p>
                                <p className="font-bold text-white capitalize">{slip.role}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid2 grid grid-cols-2 gap-6 mb-6">
                        <div className="box bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <p className="section-title text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-3">Earnings</p>
                            <div className="space-y-2">
                                {[
                                    ['Basic Salary', slip.base],
                                    slip.allowances > 0 && ['Allowances', slip.allowances],
                                    slip.otAmount > 0 && [`Overtime (${slip.ot}h)`, slip.otAmount],
                                    slip.bonus > 0 && ['Bonus / Incentive', slip.bonus],
                                ].filter(Boolean).map(([label, val]) => (
                                    <div key={label} className="row flex justify-between text-sm py-1 border-b border-emerald-100">
                                        <span className="text-[#6B7280]">{label}</span>
                                        <span className="font-bold">{fmt(val)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-black pt-2">
                                    <span>Total</span>
                                    <span className="text-emerald-600">{fmt(totalEarnings)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-rose-50 border border-rose-100 rounded-xl p-4">
                            <p className="section-title text-rose-700 text-[10px] font-black uppercase tracking-wider mb-3">Deductions</p>
                            <div className="space-y-2">
                                {slip.pf > 0 && (
                                    <div className="row flex justify-between text-sm py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">PF & Taxes</span>
                                        <span className="font-bold">{fmt(slip.pf)}</span>
                                    </div>
                                )}
                                {slip.absentDeduction > 0 && (
                                    <div className="row flex justify-between text-sm py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">Absent Deduction</span>
                                        <span className="font-bold">{fmt(slip.absentDeduction)}</span>
                                    </div>
                                )}
                                {slip.advance > 0 && (
                                    <div className="row flex justify-between text-sm py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">Advance Recovery</span>
                                        <span className="font-bold">{fmt(slip.advance)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black pt-2">
                                    <span>Total</span>
                                    <span className="text-rose-600">{fmt(slip.deductions)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="net bg-[#223F74] text-white p-5 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">Net Payable Salary</p>
                            <p className="text-2xl font-black">{fmt(slip.net)}</p>
                        </div>
                        <div className="text-right text-sm text-white/70">
                            <p>Mode: {slip.paymentMode || 'Bank Transfer'}</p>
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

// ── Process / Edit Modal ───────────────────────────────────────
const ProcessModal = ({ staff, onClose, onSubmit, submitting }) => {
    const [form, setForm] = useState({
        totalWorkingDays: '26',
        daysPresent: '26',
        overtimeHours: staff?.ot?.toString() || '0',
        bonusAmount: staff?.bonus?.toString() || '0',
        paymentMode: 'bank_transfer',
        remarks: '',
    });

    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const daysAbsent = Math.max(0, Number(form.totalWorkingDays) - Number(form.daysPresent));

    return (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg">
                <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {staff?.hasSlip ? 'Recalculate Payroll' : 'Generate Salary Slip'}
                        </h3>
                        <p className="text-sm text-white/70 mt-0.5">{staff?.name} · {staff?.role}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-5">
                    <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E2E8F0] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Base Salary</span>
                        <span className="text-base font-black text-[#223F74]">{fmt(staff?.base)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Total Working Days', key: 'totalWorkingDays', type: 'number' },
                            { label: 'Days Present', key: 'daysPresent', type: 'number' },
                            { label: 'Overtime Hours', key: 'overtimeHours', type: 'number' },
                            { label: 'Bonus / Incentive (₹)', key: 'bonusAmount', type: 'number' },
                        ].map(({ label, key, type }) => (
                            <div key={key} className="space-y-1.5">
                                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">{label}</label>
                                <input
                                    type={type}
                                    value={form[key]}
                                    onChange={(e) => set(key, e.target.value)}
                                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                                />
                            </div>
                        ))}
                    </div>

                    {daysAbsent > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 text-sm text-rose-600 font-semibold flex items-center gap-2">
                            <Minus size={14} /> {daysAbsent} absent day{daysAbsent > 1 ? 's' : ''} will be deducted from salary
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">Payment Mode</label>
                        <select
                            value={form.paymentMode}
                            onChange={(e) => set('paymentMode', e.target.value)}
                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                        >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] block">Remarks</label>
                        <input
                            type="text"
                            value={form.remarks}
                            onChange={(e) => set('remarks', e.target.value)}
                            placeholder="Optional notes..."
                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                        />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
                        <button type="submit" disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F59B87] hover:bg-[#EC856D] disabled:opacity-60 text-white font-bold transition-all shadow-lg shadow-[#F59B87]/30">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            {submitting ? 'Processing…' : staff?.hasSlip ? 'Recalculate' : 'Generate Slip'}
                        </button>
                        <button type="button" onClick={onClose}
                            className="px-5 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── View Slip Modal ────────────────────────────────────────────
const ViewSlipModal = ({ slip, month, year, onClose, onApprove, onReject, approving }) => {
    const [showPrint, setShowPrint] = useState(false);
    const monthName = MONTHS[parseInt(month) - 1] || month;
    const totalEarnings = (slip.base || 0) + (slip.allowances || 0) + (slip.otAmount || 0) + (slip.bonus || 0);

    if (showPrint) {
        return <PrintableSlip slip={slip} month={month} year={year} onClose={() => setShowPrint(false)} />;
    }

    return (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-2xl my-4">
                <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-6 rounded-t-2xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">{slip.name}</h3>
                            <p className="text-sm text-white/70 capitalize">{slip.role} · {monthName} {year}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPrint(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20">
                                <Printer size={14} /> Print
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <StatusBadge status={slip.status} />
                        <div className="text-right">
                            <p className="text-xs text-white/60">Net Payable</p>
                            <p className="text-2xl font-black text-white">{fmt(slip.net)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-3">Earnings</h4>
                            <div className="space-y-2 text-sm">
                                {[
                                    ['Basic Salary', slip.base],
                                    slip.allowances > 0 && ['Allowances', slip.allowances],
                                    slip.otAmount > 0 && [`Overtime (${slip.ot}h)`, slip.otAmount],
                                    slip.bonus > 0 && ['Bonus', slip.bonus],
                                ].filter(Boolean).map(([label, val]) => (
                                    <div key={label} className="flex justify-between py-1 border-b border-emerald-100">
                                        <span className="text-[#6B7280]">{label}</span>
                                        <span className="font-bold">{fmt(val)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-black pt-1">
                                    <span>Total</span>
                                    <span className="text-emerald-600">{fmt(totalEarnings)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                            <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-3">Deductions</h4>
                            <div className="space-y-2 text-sm">
                                {slip.pf > 0 && (
                                    <div className="flex justify-between py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">PF & Taxes</span>
                                        <span className="font-bold">{fmt(slip.pf)}</span>
                                    </div>
                                )}
                                {slip.absentDeduction > 0 && (
                                    <div className="flex justify-between py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">Absent Deduction</span>
                                        <span className="font-bold">{fmt(slip.absentDeduction)}</span>
                                    </div>
                                )}
                                {slip.advance > 0 && (
                                    <div className="flex justify-between py-1 border-b border-rose-100">
                                        <span className="text-[#6B7280]">Advance Recovery</span>
                                        <span className="font-bold">{fmt(slip.advance)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-black pt-1">
                                    <span>Total</span>
                                    <span className="text-rose-600">{fmt(slip.deductions)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#223F74] p-4 rounded-xl flex justify-between items-center">
                        <span className="text-white font-bold">Net Salary</span>
                        <span className="text-2xl font-black text-white">{fmt(slip.net)}</span>
                    </div>

                    {slip.status !== 'approved' && (
                        <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
                            <button
                                onClick={() => onApprove(slip.id)}
                                disabled={approving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold transition-all"
                            >
                                {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Approve & Disburse
                            </button>
                            <button
                                onClick={() => onReject(slip)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all"
                            >
                                <X size={16} /> Reject
                            </button>
                            <button onClick={onClose}
                                className="px-5 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all">
                                Close
                            </button>
                        </div>
                    )}
                    {slip.status === 'approved' && (
                        <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
                            <button onClick={onClose}
                                className="px-5 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all">
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────
const Payroll = () => {
    const schoolId = localStorage.getItem('schoolId');
    const location = useLocation();

    const [selectedMonth, setSelectedMonth] = useState(
        String(new Date().getMonth() + 1).padStart(2, '0')
    );
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [roleFilter, setRoleFilter] = useState(location.state?.role || 'All');

    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [processingStaff, setProcessingStaff] = useState(null);
    const [processSubmitting, setProcessSubmitting] = useState(false);

    const [viewingSlip, setViewingSlip] = useState(null);
    const [approving, setApproving] = useState(false);

    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectLoading, setRejectLoading] = useState(false);

    const [advanceTarget, setAdvanceTarget] = useState(null);
    const [advanceLoading, setAdvanceLoading] = useState(false);

    const [stats, setStats] = useState({ totalStaff: 0, totalPayroll: 0, processedCount: 0, pendingCount: 0 });

    // ── Fetch ────────────────────────────────────────────────
    const fetchStaff = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const res = await getPayrollStaff(schoolId, { month: selectedMonth, year: selectedYear });
            if (res.data?.success) {
                const data = res.data.data || [];
                setStaffData(data);
                const processed = data.filter((s) => s.hasSlip).length;
                setStats({
                    totalStaff: data.length,
                    totalPayroll: data.reduce((sum, s) => sum + (s.net || 0), 0),
                    processedCount: processed,
                    pendingCount: data.length - processed,
                });
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    }, [schoolId, selectedMonth, selectedYear]);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // ── Filtered rows ────────────────────────────────────────
    const filtered = useMemo(() => {
        return staffData.filter((s) => {
            const matchRole = roleFilter === 'All' || s.role?.toLowerCase() === roleFilter.toLowerCase();
            const matchSearch = !searchTerm || s.name?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchRole && matchSearch;
        });
    }, [staffData, roleFilter, searchTerm]);

    // ── Export ───────────────────────────────────────────────
    const handleExport = () => {
        if (!staffData.length) { toast.error('Nothing to export'); return; }
        exportToCSV(
            staffData.map((s) => ({
                'Staff ID': s.id,
                Name: s.name,
                Role: s.role,
                'Base Salary': s.base,
                'Overtime Hours': s.ot,
                'Overtime Amount': s.otAmount,
                Deductions: s.deductions,
                Incentives: s.bonus,
                'Net Payable': Math.round(s.net),
                Status: s.paymentStatus,
            })),
            `Payroll_${selectedMonth}_${selectedYear}`
        );
        toast.success('Payroll exported');
    };

    // ── Bank Report ─────────────────────────────────────────
    const handleBankReport = async () => {
        if (!staffData.length) { toast.error('No data'); return; }
        try {
            const t = toast.loading('Generating bank report…');
            const res = await generateBankTransferReport(schoolId, { month: selectedMonth, year: selectedYear });
            toast.dismiss(t);
            if (res.data?.success && res.data.data?.length > 0) {
                exportToCSV(res.data.data, `Bank_Transfer_${selectedMonth}_${selectedYear}`);
                toast.success('Bank report exported');
            } else {
                toast.error('No approved slips found for this period');
            }
        } catch (err) {
            toast.error('Failed to generate bank report');
        }
    };

    // ── Process Payroll ──────────────────────────────────────
    const handleOpenProcess = (staff) => setProcessingStaff(staff);

    const handleSubmitProcess = async (form) => {
        if (!processingStaff) return;
        setProcessSubmitting(true);
        try {
            const res = await processPayrollApi(schoolId, {
                staffId: processingStaff.rawId || processingStaff.id,
                month: selectedMonth,
                year: selectedYear,
                totalWorkingDays: parseInt(form.totalWorkingDays),
                daysPresent: parseInt(form.daysPresent),
                overtimeHours: parseFloat(form.overtimeHours || 0),
                bonusAmount: parseFloat(form.bonusAmount || 0),
                paymentMode: form.paymentMode,
                remarks: form.remarks,
            });
            if (res.data?.success) {
                toast.success('Salary slip generated!');
                setProcessingStaff(null);
                fetchStaff();
            } else {
                toast.error(res.data?.message || 'Processing failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to process payroll');
        } finally {
            setProcessSubmitting(false);
        }
    };

    // ── View Slip ────────────────────────────────────────────
    const handleViewSlip = async (staff) => {
        const t = toast.loading('Loading salary slip…');
        try {
            const res = await getSalarySlips(schoolId, { month: selectedMonth, year: selectedYear });
            toast.dismiss(t);
            if (res.data?.success) {
                const slips = res.data.data?.salarySlips || [];
                const slip = slips.find(
                    (sl) =>
                        String(sl.staffId?._id || sl.staffId) === String(staff.rawId || staff.id)
                );
                if (!slip) { toast.error('Salary slip not found for this period'); return; }
                const allowancesSum = slip.allowances?.reduce((s, a) => s + a.amount, 0) || 0;
                setViewingSlip({
                    id: slip._id,
                    name: staff.name,
                    role: staff.role,
                    base: slip.basicSalary,
                    allowances: allowancesSum,
                    ot: slip.overtimeHours || 0,
                    otAmount: slip.overtimeAmount || 0,
                    bonus: slip.bonusAmount || 0,
                    advance: 0,
                    net: slip.netSalary,
                    pf: (slip.totalDeductions || 0) - (slip.absentDeduction || 0),
                    absentDeduction: slip.absentDeduction || 0,
                    deductions: slip.totalDeductions || 0,
                    status: slip.paymentStatus || 'draft',
                    paymentMode: slip.paymentMode || 'bank_transfer',
                });
            }
        } catch (err) {
            toast.dismiss(t);
            toast.error('Failed to load salary slip');
        }
    };

    // ── Approve ──────────────────────────────────────────────
    const handleApprove = async (slipId) => {
        setApproving(true);
        try {
            const res = await updateSalarySlip(slipId, { paymentStatus: 'approved' });
            if (res.data?.success) {
                toast.success('Salary slip approved!');
                setViewingSlip(null);
                fetchStaff();
            } else {
                toast.error(res.data?.message || 'Approval failed');
            }
        } catch (err) {
            toast.error('Failed to approve');
        } finally {
            setApproving(false);
        }
    };

    // ── Reject ───────────────────────────────────────────────
    const handleRejectConfirm = async () => {
        if (!rejectTarget) return;
        setRejectLoading(true);
        try {
            const res = await updateSalarySlip(rejectTarget.id, { paymentStatus: 'rejected' });
            if (res.data?.success) {
                toast.success('Salary slip rejected');
                setRejectTarget(null);
                fetchStaff();
            } else {
                toast.error(res.data?.message || 'Rejection failed');
            }
        } catch (err) {
            toast.error('Failed to reject');
        } finally {
            setRejectLoading(false);
        }
    };

    // ── Advance Salary ───────────────────────────────────────
    const handleAdvanceConfirm = async ({ advanceAmount, reason, repayMonths }) => {
        if (!advanceTarget) return;
        setAdvanceLoading(true);
        try {
            const res = await updateSalarySlip(advanceTarget.slipId || advanceTarget.rawId, {
                advanceAmount,
                advanceReason: reason,
                repaymentMonths: repayMonths,
                remarks: `Advance issued: ₹${advanceAmount} — ${reason || 'No reason given'}. Repay over ${repayMonths} month(s).`,
            });
            if (res.data?.success) {
                toast.success(`Advance of ${fmt(advanceAmount)} issued to ${advanceTarget.name}`);
                setAdvanceTarget(null);
                fetchStaff();
            } else {
                toast.error(res.data?.message || 'Failed to issue advance');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error issuing advance');
        } finally {
            setAdvanceLoading(false);
        }
    };

    return (
        <div className="min-h-screen">

            {/* Header */}
            <div className="w-full mb-8">
                <Heading 
                    primaryText="Payroll" 
                    secondaryText="Management"
                    action={
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={handleBankReport}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20">
                                <Building size={15} /> Bank Report
                            </button>
                            <button onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20">
                                <Download size={15} /> Export
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Stats Cards - Using EnhancedDashCard */}
            <div className="w-full mb-8">
                <DashGrid cols={12} gap={4}>
                    <EnhancedDashCard
                        title="Total Staff"
                        value={String(stats.totalStaff)}
                        icon={<Users size={22} />}
                        accentColor="#3b82f6"
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Total Payroll"
                        value={fmt(stats.totalPayroll)}
                        icon={<IndianRupee size={22} />}
                        accentColor="#8b5cf6"
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Processed"
                        value={String(stats.processedCount)}
                        icon={<CheckCircle size={22} />}
                        accentColor="#22c55e"
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Pending"
                        value={String(stats.pendingCount)}
                        icon={<Clock size={22} />}
                        accentColor="#f59e0b"
                        size={3}
                        showAnimations={true}
                    />
                </DashGrid>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={14} />
                        <input
                            type="text"
                            placeholder="Search staff by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                        />
                    </div>

                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F] font-semibold">
                        {MONTHS.map((m, i) => (
                            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                        ))}
                    </select>

                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F] font-semibold">
                        {['2024','2025','2026','2027'].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F] font-semibold">
                        {['All','teacher','admin','support_staff','accountant'].map((r) => (
                            <option key={r} value={r}>{r === 'All' ? 'All Roles' : r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                {(roleFilter !== 'All' || searchTerm) && (
                    <div className="mt-3 flex">
                        <button onClick={() => { setRoleFilter('All'); setSearchTerm(''); }}
                            className="text-xs font-bold text-[#223F74] hover:underline">
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Table - Using DataTable with Theme */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <DataTable
                    columns={[
                        { 
                            key: 'name', 
                            label: 'Staff',
                            width: '20%',
                            render: (val, row) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74] font-bold text-sm">
                                        {row.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1D1D1F] text-sm">{row.name}</p>
                                        <p className="text-xs text-[#6B7280] uppercase">{row.role}</p>
                                    </div>
                                </div>
                            )
                        },
                        { key: 'base', label: 'Base Salary', width: '12%', render: (val) => <span className="font-bold">{fmt(val)}</span> },
                        { 
                            key: 'ot', 
                            label: 'Overtime', 
                            width: '14%',
                            render: (val, row) => (
                                <span className="text-indigo-600 font-semibold">
                                    {val}h {row.otAmount > 0 && <span className="text-[#9CA3AF] font-normal">({fmt(row.otAmount)})</span>}
                                </span>
                            )
                        },
                        { key: 'bonus', label: 'Incentives', width: '12%', render: (val) => val > 0 ? <span className="text-emerald-600 font-bold">+{fmt(val)}</span> : '—' },
                        { key: 'deductions', label: 'Deductions', width: '12%', render: (val) => val > 0 ? <span className="text-rose-600 font-bold">-{fmt(val)}</span> : '—' },
                        { key: 'net', label: 'Net Payable', width: '15%', render: (val) => <span className="font-black text-[#223F74] text-base">{fmt(Math.round(val))}</span> },
                        { 
                            key: 'status', 
                            label: 'Status', 
                            width: '10%',
                            render: (val) => <StatusBadge status={val || 'none'} />
                        },
                        {
                            key: 'actions',
                            label: 'Actions',
                            width: '15%',
                            render: (_, row) => (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setAdvanceTarget(row)}
                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                        title="Issue Advance Salary"
                                    >
                                        <IndianRupee size={15} />
                                    </button>
                                    {row.hasSlip ? (
                                        <>
                                            <button
                                                onClick={() => handleViewSlip(row)}
                                                className="p-1.5 text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors"
                                                title="View Salary Slip"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenProcess(row)}
                                                className="p-1.5 text-[#6B7280] hover:bg-[#F4F7FB] rounded-lg transition-colors"
                                                title="Recalculate"
                                            >
                                                <Edit size={15} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleOpenProcess(row)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-[#223F74] hover:bg-[#1A2F56] text-white rounded-lg text-xs font-bold transition-all"
                                        >
                                            <Plus size={12} /> Generate
                                        </button>
                                    )}
                                </div>
                            )
                        }
                    ]}
                    rows={filtered.map(s => ({
                        id: s.id,
                        name: s.name,
                        role: s.role,
                        base: s.base || 0,
                        ot: s.ot || 0,
                        otAmount: s.otAmount || 0,
                        bonus: s.bonus || 0,
                        deductions: s.deductions || 0,
                        net: s.net || 0,
                        hasSlip: s.hasSlip || false,
                        status: s.paymentStatus || 'none',
                        rawId: s.rawId || s.id
                    }))}
                    size={12}
                    pageSize={10}
                    pageSizeOptions={[5, 10, 20, 50]}
                    searchable={true}
                    title={`Staff Records (${filtered.length})`}
                    loading={loading}
                    exportable={false}
                />
            </div>

            {/* Modals */}
            {processingStaff && (
                <ProcessModal
                    staff={processingStaff}
                    onClose={() => setProcessingStaff(null)}
                    onSubmit={handleSubmitProcess}
                    submitting={processSubmitting}
                />
            )}

            {viewingSlip && (
                <ViewSlipModal
                    slip={viewingSlip}
                    month={selectedMonth}
                    year={selectedYear}
                    onClose={() => setViewingSlip(null)}
                    onApprove={handleApprove}
                    onReject={(slip) => { setRejectTarget(slip); setViewingSlip(null); }}
                    approving={approving}
                />
            )}

            {rejectTarget && (
                <RejectDialog
                    slip={rejectTarget}
                    loading={rejectLoading}
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setRejectTarget(null)}
                />
            )}

            {advanceTarget && (
                <AdvanceDialog
                    staff={advanceTarget}
                    loading={advanceLoading}
                    onConfirm={handleAdvanceConfirm}
                    onCancel={() => setAdvanceTarget(null)}
                />
            )}
        </div>
    );
};

export default Payroll;