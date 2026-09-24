import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Receipt, Send, Settings, AlertCircle, CreditCard, IndianRupee,
    History, CheckCircle2, ArrowRightLeft, Wallet, Loader2, Eye,
    User, DollarSign, TrendingUp, Users, Clock, Download,
    ChevronLeft, Percent, BookOpen, X, Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    Heading, Grid, DashGrid, EnhancedDashCard, Button,
    DataField, PanelModal, DataTable, ToggleButton, Modal
} from '../../components/shared/Common_Components';
import {
    fetchStudentsWithFees,
    fetchStudentFeeProfile,
    processPayment as apiProcessPayment,
    fetchPaymentHistory,
    fetchLateFeeSetting,
    saveLateFeeSetting as apiSaveLateFeeSetting,
    fetchFeeSummary,
} from '../../services/accountantFeesApi';

// ── Shared helper ──
const formatAmount = (amount) => {
    if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// ══════════════════════════════════════════════════
// Payment Card
// ══════════════════════════════════════════════════
const PaymentCard = ({ student, onClose, onSuccess }) => {
    const [paymentData, setPaymentData] = useState({
        amount: '',
        mode: 'Cash',
        reference: '',
        remarks: '',
        isAdvance: false,
        isPartial: false,
        applyLateFee: true,
        includeGST: false,
    });
    const [loading, setLoading] = useState(false);
    const [gstAmount, setGstAmount] = useState(0);
    const [selectedPaymentType, setSelectedPaymentType] = useState('due');

    const lateFeeAmount = student?.lateFee?.currentPenalty || 0;
    const totalDue = student?.totalDue || 0;

    const handleAmountChange = (val) => {
        const base = parseFloat(val) || 0;
        const gst = paymentData.includeGST ? Math.round(base * 0.18 * 100) / 100 : 0;
        setGstAmount(gst);
        setPaymentData((prev) => ({ ...prev, amount: val }));
    };

    const handlePaymentTypeChange = (type) => {
        setSelectedPaymentType(type);
        if (type === 'due') {
            setPaymentData((prev) => ({
                ...prev, isAdvance: false, isPartial: false, applyLateFee: true,
                amount: totalDue > 0 ? totalDue.toString() : '',
            }));
        } else if (type === 'partial') {
            setPaymentData((prev) => ({
                ...prev, isAdvance: false, isPartial: true, applyLateFee: true,
                amount: totalDue > 0 ? Math.floor(totalDue / 2).toString() : '',
            }));
        } else if (type === 'advance') {
            setPaymentData((prev) => ({
                ...prev, isAdvance: true, isPartial: false, applyLateFee: false, amount: '5000',
            }));
        }
    };

    const handleSubmit = async () => {
        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (paymentData.mode !== 'Cash' && !paymentData.reference) {
            toast.error('Reference number is required for non-cash payments');
            return;
        }

        setLoading(true);
        try {
            const result = await apiProcessPayment({
                studentId: student.id,
                installmentId: student.installmentId || undefined,
                amount: parseFloat(paymentData.amount),
                mode: paymentData.mode,
                reference: paymentData.reference,
                remarks: paymentData.remarks,
                applyLateFee: paymentData.applyLateFee,
                includeGST: paymentData.includeGST,
                isAdvance: paymentData.isAdvance,
                isPartial: paymentData.isPartial,
            });

            toast.success(`Payment of ${formatAmount(result.data.totalAmount)} processed!`);
            if (onSuccess) onSuccess(result.data);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Payment processing failed');
        } finally {
            setLoading(false);
        }
    };

    const totalAmount =
        parseFloat(paymentData.amount || 0) +
        (paymentData.applyLateFee && lateFeeAmount > 0 ? lateFeeAmount : 0) +
        gstAmount;

    const paymentTypes = [
        { key: 'due',     label: 'Full Due',  icon: <CheckCircle2 size={15} />, active: 'bg-[#223F74]' },
        { key: 'partial', label: 'Partial',   icon: <Percent size={15} />,      active: 'bg-amber-500' },
        { key: 'advance', label: 'Advance',   icon: <Wallet size={15} />,       active: 'bg-blue-500'  },
    ];

    return (
        <div
            className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] flex overflow-hidden"
            style={{ width: 'min(900px, 96vw)', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* LEFT PANEL */}
            <div
                className="flex flex-col bg-gradient-to-b from-[#223F74] to-[#1A2F56] text-white p-7 overflow-y-auto"
                style={{ width: '38%', minWidth: 260, flexShrink: 0 }}
            >
                <div className="flex items-center gap-4 mb-7">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-3xl flex-shrink-0">
                        {student?.name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg font-bold leading-tight truncate">{student?.name}</p>
                        <p className="text-sm text-white/70 mt-0.5">{student?.admissionNo}</p>
                        <p className="text-xs text-white/60">Class {student?.class} – {student?.section}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-7">
                    {[
                        { label: 'Total Fee',   value: formatAmount(student?.totalFee   || 0), color: 'bg-white/10' },
                        { label: 'Paid So Far', value: formatAmount(student?.totalPaid  || 0), color: 'bg-emerald-500/20' },
                        { label: 'Balance Due', value: formatAmount(student?.totalDue   || 0), color: totalDue > 0 ? 'bg-rose-500/20' : 'bg-emerald-500/20' },
                        { label: 'Advance Bal', value: formatAmount(student?.advanceBalance || 0), color: 'bg-blue-400/20' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className={`${color} rounded-xl p-3`}>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-base font-bold text-white">{value}</p>
                        </div>
                    ))}
                </div>

                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Payment type</p>
                <div className="flex flex-col gap-2 mb-7">
                    {paymentTypes.map(({ key, label, icon, active }) => (
                        <button
                            key={key}
                            onClick={() => handlePaymentTypeChange(key)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                                selectedPaymentType === key
                                    ? `${active} text-white shadow-md`
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {student?.lateFee?.isEnabled && lateFeeAmount > 0 && selectedPaymentType !== 'advance' && (
                    <div className={`rounded-xl border p-4 ${paymentData.applyLateFee ? 'border-amber-400/50 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-amber-300">Late Fee Penalty</p>
                                <p className="text-xs text-white/60 mt-0.5">
                                    ₹{student.lateFee.penaltyPerDay}/day · {student.lateFee.daysLate} days overdue
                                </p>
                                <p className="text-lg font-black text-amber-300 mt-1">{formatAmount(lateFeeAmount)}</p>
                            </div>
                            <button
                                onClick={() => setPaymentData((prev) => ({ ...prev, applyLateFee: !prev.applyLateFee }))}
                                className={`mt-1 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${
                                    paymentData.applyLateFee
                                        ? 'bg-amber-400 text-amber-900 hover:bg-amber-300'
                                        : 'bg-white/15 text-white/70 hover:bg-white/25'
                                }`}
                            >
                                {paymentData.applyLateFee ? '✓ Included' : 'Excluded'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-6 border-t border-white/10 text-xs text-white/50 space-y-1">
                    <p>Father: {student?.fatherName}</p>
                    <p>{student?.phone}</p>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
                <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#223F74]/10 rounded-xl">
                            <DollarSign className="w-5 h-5 text-[#223F74]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#223F74]">Process Payment</h3>
                            <p className="text-xs text-[#6B7280]">Fill in the details and confirm</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                        <X size={20} className="text-[#6B7280]" />
                    </button>
                </div>

                <div className="px-7 py-6 flex-1">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none block mb-1.5">Amount (₹)</label>
                            <input
                                type="number"
                                placeholder="Enter amount"
                                value={paymentData.amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-4 px-5 text-2xl font-black text-[#223F74] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none block mb-1.5">Payment Mode</label>
                            <select
                                value={paymentData.mode}
                                onChange={(e) => setPaymentData((prev) => ({ ...prev, mode: e.target.value }))}
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Online">Online</option>
                                <option value="Cheque">Cheque</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none block mb-1.5">
                                {paymentData.mode === 'Cash' ? 'Reference (optional)' : 'Reference ID *'}
                            </label>
                            <input
                                type="text"
                                placeholder={paymentData.mode === 'Cash' ? 'Optional' : 'Enter reference'}
                                value={paymentData.reference}
                                onChange={(e) => setPaymentData((prev) => ({ ...prev, reference: e.target.value }))}
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none block mb-1.5">Remarks</label>
                            <input
                                type="text"
                                placeholder="Add notes..."
                                value={paymentData.remarks}
                                onChange={(e) => setPaymentData((prev) => ({ ...prev, remarks: e.target.value }))}
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                            />
                        </div>

                        <div className="col-span-2 flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0]">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={paymentData.includeGST}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const gst = checked ? parseFloat(paymentData.amount || 0) * 0.18 : 0;
                                        setGstAmount(gst);
                                        setPaymentData((prev) => ({ ...prev, includeGST: checked }));
                                    }}
                                    className="w-4 h-4 accent-[#223F74]"
                                />
                                <span className="text-sm font-medium text-[#1D1D1F]">Include GST (18%)</span>
                            </label>
                            {paymentData.includeGST && (
                                <span className="text-sm font-bold text-[#223F74]">+{formatAmount(gstAmount)}</span>
                            )}
                        </div>
                    </div>

                    {(parseFloat(paymentData.amount) > 0 || (paymentData.applyLateFee && lateFeeAmount > 0)) && (
                        <div className="mt-5 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#E2E8F0]">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.3em]">Amount Breakdown</p>
                            </div>
                            <div className="px-5 py-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Base Amount</span>
                                    <span className="font-semibold">{formatAmount(parseFloat(paymentData.amount || 0))}</span>
                                </div>
                                {paymentData.applyLateFee && lateFeeAmount > 0 && (
                                    <div className="flex justify-between text-amber-600">
                                        <span>Late Fee Penalty</span>
                                        <span className="font-semibold">{formatAmount(lateFeeAmount)}</span>
                                    </div>
                                )}
                                {paymentData.includeGST && gstAmount > 0 && (
                                    <div className="flex justify-between text-[#6B7280]">
                                        <span>GST (18%)</span>
                                        <span className="font-semibold">{formatAmount(gstAmount)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="px-5 py-4 bg-[#223F74] flex justify-between items-center">
                                <span className="text-sm font-bold text-white/80">Total Payable</span>
                                <span className="text-2xl font-black text-white">{formatAmount(totalAmount)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-7 py-5 border-t border-[#E2E8F0] flex gap-3 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#223F74] hover:bg-[#1A2F56] disabled:opacity-60 text-white font-bold text-base transition-all shadow-lg shadow-[#223F74]/20"
                    >
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : <><Send size={18} /> Pay Now</>}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 rounded-2xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold text-base transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════
// History Card — loads from API
// ══════════════════════════════════════════════════
const HistoryCard = ({ student, onClose }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchPaymentHistory(student.id, { limit: 5 });
                setPayments(res.data || []);
            } catch {
                toast.error('Could not load payment history');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [student.id]);

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-2xl w-full mx-auto relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                <X size={20} className="text-[#6B7280]" />
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#223F74]/10 rounded-2xl">
                    <History className="w-6 h-6 text-[#223F74]" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-[#223F74]">Payment History</h3>
                    <p className="text-sm text-[#6B7280]">Last 5 transactions for {student?.name}</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-[#223F74] to-[#2A4A82] p-4 rounded-2xl text-white mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl border-2 border-white/30">
                        {student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <p className="font-bold">{student?.name}</p>
                        <p className="text-sm text-white/80">{student?.admissionNo} • Class {student?.class} - {student?.section}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
                    </div>
                ) : payments.length > 0 ? (
                    payments.map((p, idx) => (
                        <div key={idx} className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-[#1D1D1F]">
                                        {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-[#6B7280]">{p.mode}</span>
                                        <span className="w-1 h-1 bg-[#E2E8F0] rounded-full" />
                                        <span className="text-xs text-[#6B7280]">{p.receipt}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-600">{formatAmount(p.amount)}</p>
                                    <span className="text-[10px] text-[#6B7280] capitalize">{p.status}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0]">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-[#9CA3AF] opacity-30" />
                        <p className="font-semibold text-[#6B7280]">No payment history found</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] mt-6">
                <Button text="Close" variant="secondary" size={3} onClick={onClose} />
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════
// Penalty Setup Card — saves to API
// ══════════════════════════════════════════════════
const PenaltySetupCard = ({ onClose, onSave }) => {
    const [settings, setSettings] = useState({
        dueDay: 10, penaltyPerDay: 50, gracePeriod: 0,
        maxPenalty: 0, isActive: true, applicableClasses: [],
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const classOptions = ['1','2','3','4','5','6','7','8','9','10','11','12'];

    // Load existing settings
    useEffect(() => {
        fetchLateFeeSetting()
            .then((res) => {
                if (res.data) {
                    const s = res.data;
                    setSettings({
                        dueDay: s.dueDay || 10,
                        penaltyPerDay: s.penaltyPerDay || 50,
                        gracePeriod: s.gracePeriod || 0,
                        maxPenalty: s.maxPenalty || 0,
                        isActive: s.isActive !== false,
                        applicableClasses: s.applicableClasses || [],
                    });
                    setSelectedClasses(s.applicableClasses || []);
                }
            })
            .catch(() => {})
            .finally(() => setFetching(false));
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await apiSaveLateFeeSetting({ ...settings, applicableClasses: selectedClasses });
            toast.success('Penalty settings updated successfully!');
            if (onSave) onSave();
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (cls) => {
        const next = selectedClasses.includes(cls)
            ? selectedClasses.filter((c) => c !== cls)
            : [...selectedClasses, cls];
        setSelectedClasses(next);
        setSettings((prev) => ({ ...prev, applicableClasses: next }));
    };

    if (fetching) {
        return (
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-16 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#223F74]" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-2xl w-full mx-auto relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                <X size={20} className="text-[#6B7280]" />
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 rounded-2xl">
                    <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-[#223F74]">Penalty Setup</h3>
                    <p className="text-sm text-[#6B7280]">Configure late fee penalties for all classes</p>
                </div>
            </div>

            <Grid cols={12} gap={4}>
                <div className="col-span-6">
                    <DataField label="Due Day of Month" id="dueDay" type="number" value={settings.dueDay}
                        onChange={(e) => setSettings((prev) => ({ ...prev, dueDay: parseInt(e.target.value) || 0 }))} size={12} />
                    <p className="text-xs text-[#6B7280] mt-1">Day of month when fee becomes due</p>
                </div>
                <div className="col-span-6">
                    <DataField label="Penalty Per Day (₹)" id="penaltyPerDay" type="number" value={settings.penaltyPerDay}
                        onChange={(e) => setSettings((prev) => ({ ...prev, penaltyPerDay: parseInt(e.target.value) || 0 }))} size={12} />
                    <p className="text-xs text-[#6B7280] mt-1">Amount charged for each day late</p>
                </div>
                <div className="col-span-6">
                    <DataField label="Grace Period (Days)" id="gracePeriod" type="number" value={settings.gracePeriod}
                        onChange={(e) => setSettings((prev) => ({ ...prev, gracePeriod: parseInt(e.target.value) || 0 }))} size={12} />
                    <p className="text-xs text-[#6B7280] mt-1">Days allowed after due date without penalty</p>
                </div>
                <div className="col-span-6">
                    <DataField label="Max Penalty (0 = No Limit)" id="maxPenalty" type="number" value={settings.maxPenalty}
                        onChange={(e) => setSettings((prev) => ({ ...prev, maxPenalty: parseInt(e.target.value) || 0 }))} size={12} />
                    <p className="text-xs text-[#6B7280] mt-1">Maximum penalty amount</p>
                </div>
                <div className="col-span-12">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none mb-2 block">
                        Applicable Classes (Leave empty for all)
                    </label>
                    <div className="flex flex-wrap gap-2 p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0]">
                        {classOptions.map((cls) => (
                            <button key={cls} onClick={() => toggleClass(cls)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    selectedClasses.includes(cls)
                                        ? 'bg-[#223F74] text-white shadow-md'
                                        : 'bg-white border border-[#E2E8F0] text-[#6B7280] hover:bg-[#F4F7FB]'
                                }`}>
                                Class {cls}
                            </button>
                        ))}
                        <button
                            onClick={() => { setSelectedClasses([]); setSettings((p) => ({ ...p, applicableClasses: [] })); }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
                <div className="col-span-12 flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0]">
                    <div>
                        <p className="text-sm font-bold text-[#1D1D1F]">Enable Late Fee</p>
                        <p className="text-xs text-[#6B7280]">Auto-calculate penalties for all students</p>
                    </div>
                    <ToggleButton checked={settings.isActive}
                        onChange={(val) => setSettings((prev) => ({ ...prev, isActive: val }))}
                        label="Active" labelOff="Inactive" />
                </div>
            </Grid>

            <div className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-6">
                <Button text={loading ? 'Saving...' : 'Save Settings'} variant="primary" size={6}
                    onClick={handleSave} loading={loading} disabled={loading} />
                <Button text="Cancel" variant="secondary" size={6} onClick={onClose} />
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════
// Shared Modal Overlay
// ══════════════════════════════════════════════════
const ModalOverlay = ({ children, onClose }) => (
    <div
        className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
    >
        <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
            {children}
        </div>
    </div>
);

// ══════════════════════════════════════════════════
// Receipt download helper (unchanged)
// ══════════════════════════════════════════════════
const downloadReceipt = (paymentData, student) => {
    if (!paymentData) return;
    const receiptHTML = `<!DOCTYPE html><html><head><title>Receipt - ${paymentData.receiptNumber}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#334155}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #223F74;padding-bottom:20px;margin-bottom:20px}
    .title{color:#223F74;font-size:24px;font-weight:bold}
    .details{background:#F8F9FA;padding:20px;border-radius:12px;margin:20px 0}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{border:1px solid #E2E8F0;padding:12px;text-align:left}
    th{background:#F4F7FB}.total{font-weight:bold;background:#F0F4FA}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0;text-align:center;color:#94A3B8;font-size:12px}
    .status{color:#16a34a;font-weight:bold}</style></head><body>
    <div class="header"><div><h1 class="title">FEE RECEIPT</h1><p>Receipt: ${paymentData.receiptNumber}</p></div>
    <div style="text-align:right"><p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
    <p class="status">✓ Status: SUCCESS</p></div></div>
    <div class="details"><p><strong>Student:</strong> ${student?.name}</p>
    <p><strong>Admission No:</strong> ${student?.admissionNo}</p>
    <p><strong>Class:</strong> ${student?.class} - ${student?.section}</p>
    <p><strong>Payment Mode:</strong> ${paymentData.mode?.toUpperCase()}</p>
    ${paymentData.reference ? `<p><strong>Reference:</strong> ${paymentData.reference}</p>` : ''}
    ${paymentData.isAdvance ? '<p><strong>Advance Payment</strong></p>' : ''}
    ${paymentData.isPartial ? '<p><strong>Partial Payment</strong></p>' : ''}</div>
    <h3>Payment Breakdown</h3>
    <table><thead><tr><th>Description</th><th style="text-align:right">Amount (₹)</th></tr></thead>
    <tbody><tr><td>Base Amount</td><td style="text-align:right">${paymentData.baseAmount?.toLocaleString()}</td></tr>
    ${paymentData.lateFeeAmount > 0 ? `<tr><td>Late Fee Penalty</td><td style="text-align:right">${paymentData.lateFeeAmount.toLocaleString()}</td></tr>` : ''}
    ${paymentData.gstAmount > 0 ? `<tr><td>GST (18%)</td><td style="text-align:right">${paymentData.gstAmount.toLocaleString()}</td></tr>` : ''}
    <tr class="total"><td>TOTAL</td><td style="text-align:right">${paymentData.totalAmount?.toLocaleString()}</td></tr></tbody></table>
    <div class="footer"><p>This is a computer generated receipt. | Thank you for your payment!</p></div>
    </body></html>`;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${paymentData.receiptNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
};

// ══════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════
const FeeEntry = () => {
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 0, totalPending: 0, totalPaid: 0, totalAdvance: 0,
    });
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [lastPayment, setLastPayment] = useState(null);

    // ── Load students from API ──
    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchStudentsWithFees({ limit: 100 });
            setStudents(res.data || []);
            setStats(res.stats || {});
        } catch (err) {
            toast.error(err.message || 'Failed to load students');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    // ── Handlers ──
    const openPayment = useCallback((studentOrId, e) => {
    e?.stopPropagation();

    const id =
        typeof studentOrId === "string"
            ? studentOrId
            : studentOrId.id;

    const cachedStudent = students.find(s => s.id === id);

    if (cachedStudent) {
        setSelectedStudent(cachedStudent);
    }

    setPaymentSuccess(false);
    setLastPayment(null);
    setShowPaymentModal(true);

    fetchStudentFeeProfile(id)
        .then((res) => {
            setSelectedStudent(res.data);
        })
        .catch(() => {});

}, [students]);

    const openHistory = useCallback((studentOrId, e) => {
        e?.stopPropagation();
        const id = typeof studentOrId === 'string' ? studentOrId : studentOrId.id;
        const cached = students.find((s) => s.id === id) || selectedStudent;
        setSelectedStudent(cached);
        setShowHistoryModal(true);
    }, [students, selectedStudent]);

const openProfile = useCallback((studentOrId, e) => {

    e?.stopPropagation();

    const id =
        typeof studentOrId === "string"
            ? studentOrId
            : studentOrId.id;

    const cachedStudent = students.find(s => s.id === id);

    if (cachedStudent) {
        setSelectedStudent(cachedStudent);
    }

    setPaymentSuccess(false);
    setLastPayment(null);
    setShowPaymentModal(false);
    setShowHistoryModal(false);

    fetchStudentFeeProfile(id)
        .then((res) => {
            setSelectedStudent(res.data);
        })
        .catch(() => {});

}, [students]);

    const handlePaymentSuccess = useCallback((data) => {
        // Update local cache with new fee summary from server
        setStudents((prev) =>
            prev.map((s) => {
                if (s.id !== selectedStudent?.id) return s;
                const updated = data.updatedFee
                    ? { ...s, ...data.updatedFee }
                    : s;
                return updated;
            })
        );
        if (selectedStudent && data.updatedFee) {
            setSelectedStudent((prev) => ({ ...prev, ...data.updatedFee }));
        }
        setStats((prev) => ({
            ...prev,
            totalPaid: data.updatedFee?.feeStatus === 'paid' ? prev.totalPaid + 1 : prev.totalPaid,
            totalPending: data.updatedFee?.feeStatus === 'paid' ? Math.max(0, prev.totalPending - 1) : prev.totalPending,
        }));
        setPaymentSuccess(true);
        setLastPayment(data);
        setShowPaymentModal(false);

        toast.success(
            <div className="flex flex-col gap-2">
                <span>Payment of {formatAmount(data.totalAmount)} processed!</span>
                <button
                    onClick={() => downloadReceipt(data, selectedStudent)}
                    className="text-emerald-600 font-bold hover:underline text-sm"
                >
                    Download Receipt
                </button>
            </div>,
            { duration: 5000 }
        );
    }, [selectedStudent]);

    // ── Table columns ──
    const studentColumns = [
        { key: 'name',               label: 'Student',      width: '14%' },
        { key: 'admissionNo',        label: 'Admission No', width: '12%' },
        { key: 'class',              label: 'Class',        width: '8%' },
        { key: 'section',            label: 'Section',      width: '8%' },
        { key: 'totalFeeFormatted',  label: 'Total Fee',    width: '12%' },
        { key: 'totalPaidFormatted', label: 'Paid',         width: '12%' },
        { key: 'totalDueFormatted',  label: 'Due',          width: '12%' },
        {
            key: 'feeStatus', label: 'Status', width: '10%',
            render: (val) => {
                const cfg = {
                    paid:    { cls: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
                    pending: { cls: 'bg-rose-100 text-rose-700',       label: 'Due' },
                    advance: { cls: 'bg-blue-100 text-blue-700',       label: 'Advance' },
                };
                const { cls, label } = cfg[val] || { cls: 'bg-slate-100 text-slate-700', label: val };
                return <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
            },
        },
        {
            key: 'actions', label: 'Actions', width: '12%',
            render: (_, row) => (
                <div className="flex gap-2">
                    <button onClick={(e) => openProfile(row.id, e)}
                        className="p-1.5 text-[#6B7280] hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors" title="View Profile">
                        <Eye size={16} />
                    </button>
                    <button onClick={(e) => openPayment(row.id, e)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Pay Fee">
                        <DollarSign size={16} />
                    </button>
                    <button onClick={(e) => openHistory(row.id, e)}
                        className="p-1.5 text-[#6B7280] hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors" title="View History">
                        <History size={16} />
                    </button>
                </div>
            ),
        },
    ];

  const studentRows = useMemo(() => {

    return students.map((s) => ({
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        class: s.class,
        section: s.section,
        feeStatus: s.feeStatus,
        totalFeeFormatted: formatAmount(s.totalFee),
        totalPaidFormatted: formatAmount(s.totalPaid),
        totalDueFormatted: formatAmount(s.totalDue),
    }));

}, [students]);
    // ══════════════════════════════
    // PROFILE VIEW
    // ══════════════════════════════
    if (selectedStudent && !showPaymentModal && !showHistoryModal && !showPenaltyModal) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
                <button
                    onClick={() => { setSelectedStudent(null); setPaymentSuccess(false); setLastPayment(null); }}
                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#223F74] transition-colors mb-4"
                >
                    <ChevronLeft size={20} />
                    <span className="font-medium">Back to Student List</span>
                </button>

                {/* Profile header */}
                <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] rounded-2xl shadow-lg shadow-[#223F74]/20 p-6 border border-[#1a3360] mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-3xl border-2 border-white/30">
                                {selectedStudent.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">{selectedStudent.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-white/80 mt-1">
                                    <span>{selectedStudent.admissionNo}</span>
                                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                                    <span>Roll No: {selectedStudent.rollNo}</span>
                                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                                    <span>Class {selectedStudent.class} - {selectedStudent.section}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-white/60 mt-2">
                                    <span>Father: {selectedStudent.fatherName}</span>
                                    <span>•</span>
                                    <span>Contact: {selectedStudent.phone}</span>
                                    <span>•</span>
                                    <span>Email: {selectedStudent.email}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => openHistory(selectedStudent.id)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20">
                                <History size={16} /> History
                            </button>
                            <button onClick={() => openPayment(selectedStudent.id)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm transition-all shadow-lg shadow-[#F59B87]/30">
                                <DollarSign size={16} /> Pay Fee
                            </button>
                        </div>
                    </div>
                    <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A] mt-4" />
                </div>

                {/* Payment success banner */}
                {paymentSuccess && lastPayment && (
                    <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-800 text-lg">Payment Successful!</p>
                                <p className="text-sm text-emerald-600">
                                    {formatAmount(lastPayment.totalAmount)} paid • Receipt: {lastPayment.receiptNumber}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => downloadReceipt(lastPayment, selectedStudent)}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
                        >
                            <Download size={18} /> Download Receipt
                        </button>
                    </div>
                )}

                {/* Profile body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                            <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                <User size={18} /> Personal Information
                            </h3>
                            <div className="space-y-4">
                                {[
                                    ['Full Name',      selectedStudent.name],
                                    ["Father's Name",  selectedStudent.fatherName],
                                    ["Mother's Name",  selectedStudent.motherName],
                                    ['Contact',        selectedStudent.phone],
                                    ['Email',          selectedStudent.email],
                                    ['Address',        selectedStudent.address],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
                                        <p className="font-semibold text-[#1D1D1F]">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                            <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                <BookOpen size={18} /> Academic Details
                            </h3>
                            <div className="space-y-4">
                                {[
                                    ['Class',            `Class ${selectedStudent.class}`],
                                    ['Section',          selectedStudent.section],
                                    ['Roll Number',      selectedStudent.rollNo],
                                    ['Admission Number', selectedStudent.admissionNo],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
                                        <p className="font-semibold text-[#1D1D1F]">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {!selectedStudent.feeStructureId ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center shadow-inner">
                                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-amber-800">No active fee structure available.</h3>
                                <p className="text-sm text-amber-600 mt-2">
                                    This student belongs to Class {selectedStudent.class}, which does not have any active fee structures configured for the current session.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Fee summary */}
                                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                    <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                        <IndianRupee size={18} /> Fee Summary
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-[#F8F9FA] p-4 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Fee</p>
                                            <p className="text-xl font-bold text-[#1D1D1F] mt-1">{formatAmount(selectedStudent.totalFee)}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Amount Paid</p>
                                            <p className="text-xl font-bold text-emerald-700 mt-1">{formatAmount(selectedStudent.totalPaid)}</p>
                                        </div>
                                        <div className={`p-4 rounded-xl text-center ${selectedStudent.totalDue > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Balance Due</p>
                                            <p className={`text-xl font-bold mt-1 ${selectedStudent.totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatAmount(selectedStudent.totalDue)}
                                            </p>
                                        </div>
                                        {selectedStudent.advanceBalance > 0 && (
                                            <div className="bg-blue-50 p-4 rounded-xl text-center">
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Advance</p>
                                                <p className="text-xl font-bold text-blue-700 mt-1">{formatAmount(selectedStudent.advanceBalance)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fee Heads Breakdown */}
                                {selectedStudent.feeLines?.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                        <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                            <BookOpen size={18} /> Fee Heads Breakdown
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedStudent.feeLines.map((line, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-medium text-slate-700">{line.headName}</span>
                                                    <span className="font-bold text-slate-900">{formatAmount(line.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Installment Slots */}
                                {selectedStudent.installmentSlots?.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                        <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                            <Receipt size={18} /> Installment Slots
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedStudent.installmentSlots.map((slot, idx) => {
                                                const slotStatusConfig = {
                                                    paid: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Paid' },
                                                    partially_paid: { cls: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Partially Paid' },
                                                    due: { cls: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Due' },
                                                    overdue: { cls: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse', label: 'Overdue' },
                                                    upcoming: { cls: 'bg-slate-50 text-slate-600 border-slate-100', label: 'Upcoming' }
                                                };
                                                const status = slotStatusConfig[slot.status] || { cls: 'bg-slate-50 text-slate-600', label: slot.status };
                                                return (
                                                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                                                        <div>
                                                            <p className="font-bold text-[#1D1D1F] text-sm">{slot.label || `Installment ${slot.installmentNo}`}</p>
                                                            <p className="text-xs text-[#6B7280] mt-0.5">
                                                                Due Date: {new Date(slot.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-slate-900">Due: {formatAmount(slot.amountDue)}</p>
                                                                {slot.amountPaid > 0 && (
                                                                    <p className="text-xs text-emerald-600 font-semibold">Paid: {formatAmount(slot.amountPaid)}</p>
                                                                )}
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${status.cls}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Late fee */}
                                {selectedStudent.lateFee && (
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${selectedStudent.lateFee.isEnabled ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-[#1D1D1F]">Late Fee Status</h3>
                                                    <p className="text-xs text-[#6B7280]">
                                                        ₹{selectedStudent.lateFee.penaltyPerDay}/day after {selectedStudent.lateFee.dueDay}th
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-amber-600">{formatAmount(selectedStudent.lateFee.currentPenalty)}</p>
                                                <p className="text-xs text-[#6B7280]">{selectedStudent.lateFee.daysLate} days late</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Recent payments */}
                                {selectedStudent.recentPayments?.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                        <h3 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                                            <History size={18} /> Recent Payments
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedStudent.recentPayments.slice(0, 5).map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                            <Receipt className="w-5 h-5 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-[#1D1D1F] text-sm">{formatAmount(p.amount)}</p>
                                                            <p className="text-xs text-[#6B7280]">{p.mode} • {p.receipt}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-[#6B7280]">
                                                        {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {showHistoryModal && (
                    <ModalOverlay onClose={() => setShowHistoryModal(false)}>
                        <HistoryCard student={selectedStudent} onClose={() => setShowHistoryModal(false)} />
                    </ModalOverlay>
                )}
                {showPaymentModal && (
                    <ModalOverlay onClose={() => setShowPaymentModal(false)}>
                        <PaymentCard student={selectedStudent} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} />
                    </ModalOverlay>
                )}
            </div>
        );
    }

    // ══════════════════════════════
    // LIST VIEW
    // ══════════════════════════════
    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="w-full mb-8">
                <Heading 
                    primaryText="Fee" 
                    secondaryText="Management"
                    action={
                        <button
                            onClick={() => setShowPenaltyModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-sm transition-all border border-amber-500/30"
                        >
                            <Clock size={16} /> Penalty Setup
                        </button>
                    }
                />
            </div>

            {/* Stats */}
            <div className="w-full mb-8">
                <DashGrid cols={12} gap={4}>
                    <EnhancedDashCard title="Total Students"   value={String(stats.totalStudents || 0)} icon={<Users size={22} />}       accentColor="#3b82f6" size={3} showAnimations />
                    <EnhancedDashCard title="Pending Dues"     value={String(stats.totalPending  || 0)} icon={<AlertCircle size={22} />}  accentColor="#ef4444" size={3} showAnimations />
                    <EnhancedDashCard title="Fully Paid"       value={String(stats.totalPaid     || 0)} icon={<CheckCircle2 size={22} />} accentColor="#22c55e" size={3} showAnimations />
                    <EnhancedDashCard title="Advance Payments" value={String(stats.totalAdvance  || 0)} icon={<Wallet size={22} />}       accentColor="#8b5cf6" size={3} showAnimations />
                </DashGrid>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-[#223F74]" />
                    </div>
                ) : (
                    <DataTable
                        columns={studentColumns}
                        rows={studentRows}
                        size={12}
                        pageSize={10}
                        pageSizeOptions={[5, 10, 20, 50]}
                        searchable
                        title={`Students (${students.length})`}
                        filters={[{ title: 'Status', type: 'toggle', key: 'feeStatus', options: ['paid', 'pending', 'advance'] }]}
                        onRefresh={loadStudents}
                    />
                )}
            </div>

            {/* Modals */}
            {showPaymentModal && selectedStudent && (
                <ModalOverlay onClose={() => { setShowPaymentModal(false); setSelectedStudent(null); }}>
                    <PaymentCard
                        student={selectedStudent}
                        onClose={() => { setShowPaymentModal(false); setSelectedStudent(null); }}
                        onSuccess={handlePaymentSuccess}
                    />
                </ModalOverlay>
            )}
            {showHistoryModal && selectedStudent && (
                <ModalOverlay onClose={() => { setShowHistoryModal(false); setSelectedStudent(null); }}>
                    <HistoryCard student={selectedStudent} onClose={() => { setShowHistoryModal(false); setSelectedStudent(null); }} />
                </ModalOverlay>
            )}
            {showPenaltyModal && (
                <ModalOverlay onClose={() => setShowPenaltyModal(false)}>
                    <PenaltySetupCard
                        onClose={() => setShowPenaltyModal(false)}
                        onSave={() => { toast.success('Penalty settings updated'); loadStudents(); }}
                    />
                </ModalOverlay>
            )}
        </div>
    );
};

export default FeeEntry;
