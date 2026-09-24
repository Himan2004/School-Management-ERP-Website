import React, { useState, useEffect, useCallback } from 'react';
import {
    getFeeStructures,
    createFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    getFeeStructureClasses,
    toggleFeeStructureStatus,
    getCurrentAcademicConfig,
} from '../../services/accountantFeeStructureApi';
import { toast } from 'react-hot-toast';
import {
    Loader2, Plus, Save, Edit, Trash2,
    ChevronLeft, AlertTriangle, Calendar,
    BookOpen, IndianRupee, LayoutList,
    Settings, Search
} from 'lucide-react';
import { Heading, Select, Option } from '../../components/shared/Common_Components';

// ── helpers ───────────────────────────────────────────────────
const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n || 0);

const formatYearLong = (year) => {
    if (!year) return '';
    let clean = String(year).trim();
    const match = clean.match(/^(\d{4})-(\d{2,4})$/);
    if (match) {
        const start = match[1];
        let end = match[2];
        if (end.length === 2) {
            const startPrefix = start.slice(0, 2);
            end = `${startPrefix}${end}`;
        }
        return `${start}-${end}`;
    }
    return clean;
};

const normalizeClassName = (name) => {
    if (!name) return '';
    let clean = String(name).trim();
    
    // Strip section suffix if present (e.g. "Class 1 - A" -> "Class 1" or "Nursery - A" -> "Nursery")
    if (clean.includes("-")) {
        clean = clean.split("-")[0].trim();
    }
    
    // Check if it matches "class1", "class 1", "CLASS 1" etc.
    const classMatch = clean.match(/^class\s*(\d+)$/i);
    if (classMatch) {
        return `Class ${classMatch[1]}`;
    }

    if (clean.toLowerCase().startsWith("class")) {
        clean = clean.substring(5).trim();
    }
    
    const lower = clean.toLowerCase();
    if (lower === 'nursery') return 'Nursery';
    if (lower === 'junior kg' || lower === 'jr kg' || lower === 'jr. kg' || lower === 'juniorkg') return 'Junior KG';
    if (lower === 'senior kg' || lower === 'sr kg' || lower === 'sr. kg' || lower === 'seniorkg') return 'Senior KG';
    
    if (!isNaN(Number(clean)) && clean.length > 0) {
        return `Class ${clean}`;
    }
    
    return clean.replace(/\b\w/g, c => c.toUpperCase());
};

const normalizeClassDisplay = (gradeLevel, section) => {
    if (!gradeLevel) return 'All Classes';
    
    let cleanGrade = String(gradeLevel).trim();
    if (cleanGrade.toLowerCase().startsWith("class")) {
        cleanGrade = cleanGrade.substring(5).trim();
    }
    if (cleanGrade.toLowerCase().startsWith("class")) {
        cleanGrade = cleanGrade.substring(5).trim();
    }
    
    if (cleanGrade.includes("-")) {
        const parts = cleanGrade.split("-");
        cleanGrade = parts[0].trim();
        if (!section) {
            section = parts[1].trim();
        }
    }
    
    const normalizedName = normalizeClassName(cleanGrade);
    
    if (section) {
        let cleanSec = String(section).trim();
        if (cleanSec.includes("-")) {
            cleanSec = cleanSec.split("-").pop().trim();
        }
        return `${normalizedName} - ${cleanSec.toUpperCase()}`;
    }
    return normalizedName;
};

const getClassSortWeight = (name) => {
    const normalized = normalizeClassName(name).toLowerCase();
    if (normalized === 'nursery') return 1;
    if (normalized === 'junior kg') return 2;
    if (normalized === 'senior kg') return 3;
    
    const match = normalized.match(/^class\s*(\d+)$/);
    if (match) {
        return 3 + parseInt(match[1], 10);
    }
    return 999;
};

const prepareClassOptions = (rawClasses) => {
    if (!Array.isArray(rawClasses)) return [];
    
    const options = [];
    
    rawClasses.forEach((cls) => {
        const normalizedClassName = normalizeClassName(cls.name);
        
        options.push({
            value: cls.id,
            classId: cls.id,
            name: normalizedClassName,
            sortWeight: getClassSortWeight(normalizedClassName),
        });
    });

    // Remove duplicates (same displayName)
    const seen = new Set();
    const uniqueOptions = [];
    options.forEach(opt => {
        if (!seen.has(opt.name)) {
            seen.add(opt.name);
            uniqueOptions.push(opt);
        }
    });

    // Sort options by sortWeight ascending
    uniqueOptions.sort((a, b) => a.sortWeight - b.sortWeight);

    return uniqueOptions;
};

const currentAcademicYear = () => {
    const now = new Date();
    const y   = now.getFullYear();
    const shortYear = now.getMonth() >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
    return formatYearLong(shortYear);
};

// ── Delete Confirmation Dialog ────────────────────────────────
const DeleteDialog = ({ structure, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-100 rounded-2xl">
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-[#223F74]">Remove Fee Structure</h3>
            </div>
            <p className="text-[#6B7280] mb-2">
                You are about to remove the fee structure for:
            </p>
            <div className="bg-[#F8F9FA] rounded-xl p-4 mb-6 border border-[#E2E8F0]">
                <p className="font-bold text-[#1D1D1F]">{structure.className}</p>
                <p className="text-sm text-[#6B7280]">
                    {structure.academicYear} · {fmt(structure.totalAmount)} annual
                </p>
            </div>
            <p className="text-sm text-rose-600 font-medium mb-6">
                This action cannot be undone. Students linked to this structure will retain their existing installments.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold transition-all"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Remove Structure
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#6B7280] font-bold transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// ── Fee Structure Defaults ───────────────────────────────────
const DEFAULT_FEE_HEADS = [
    { name: 'Tuition Fee' },
    { name: 'Bus Service' },
    { name: 'Library Fee' },
    { name: 'Sports Fee' },
    { name: 'Exam Fee' },
    { name: 'Admission Fee' },
];

// ── Fee Structure Form (create + edit) ────────────────────────
const StructureForm = ({ classes, editingStructure, onSaved, onCancel }) => {
    const options = React.useMemo(() => prepareClassOptions(classes), [classes]);

    const [periodId, setPeriodId] = useState(() => {
        if (editingStructure?.periodId) {
            const matched = options.find(opt => opt.classId === editingStructure.periodId);
            if (matched) return matched.value;
        }
        return options[0]?.value || '';
    });

    const [academicYear, setAcademicYear] = useState(editingStructure?.academicYear ? formatYearLong(editingStructure.academicYear) : currentAcademicYear());
    const [feeType, setFeeType] = useState(editingStructure?.feeType || 'annual');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingStructure?.periodId) {
            const matched = options.find(opt => opt.classId === editingStructure.periodId);
            if (matched) {
                setPeriodId(matched.value);
            }
        } else if (options.length > 0 && !periodId) {
            setPeriodId(options[0].value);
        }
    }, [options, editingStructure]);

    useEffect(() => {
        if (!editingStructure) {
            getCurrentAcademicConfig()
                .then(res => {
                    if (res.data?.success && res.data?.data?.academicYear) {
                        const activeYear = res.data.data.academicYear;
                        if (activeYear) {
                            setAcademicYear(formatYearLong(activeYear));
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch current academic year:', err);
                });
        }
    }, [editingStructure]);

    // Default fee heads checkable state
    const [selectedDefaults, setSelectedDefaults] = useState(() => {
        const initial = {};
        DEFAULT_FEE_HEADS.forEach((head) => {
            initial[head.name] = {
                checked: false,
                amount: 0,
                dueDate: '',
            };
        });

        if (editingStructure?.feeLines) {
            editingStructure.feeLines.forEach((line) => {
                const matched = DEFAULT_FEE_HEADS.find(
                    (h) => h.name.toLowerCase() === (line.headName || '').toLowerCase()
                );
                if (matched) {
                    initial[matched.name] = {
                        checked: true,
                        amount: line.amount || 0,
                        dueDate: line.dueDate ? new Date(line.dueDate).toISOString().slice(0, 10) : '',
                    };
                }
            });
        } else {
            // Default check Tuition Fee for convenience
            if (initial['Tuition Fee']) {
                initial['Tuition Fee'].checked = true;
            }
        }
        return initial;
    });

    // Custom fee heads list
    const [customFees, setCustomFees] = useState(() => {
        if (editingStructure?.feeLines) {
            const list = [];
            editingStructure.feeLines.forEach((line) => {
                const matched = DEFAULT_FEE_HEADS.some(
                    (h) => h.name.toLowerCase() === (line.headName || '').toLowerCase()
                );
                if (!matched) {
                    list.push({
                        name: line.headName || '',
                        amount: line.amount || 0,
                        dueDate: line.dueDate ? new Date(line.dueDate).toISOString().slice(0, 10) : '',
                    });
                }
            });
            return list;
        }
        return [];
    });

    const handleDefaultCheckChange = (name, checked) => {
        setSelectedDefaults((prev) => ({
            ...prev,
            [name]: {
                ...prev[name],
                checked,
            },
        }));
    };

    const handleDefaultValChange = (name, field, value) => {
        setSelectedDefaults((prev) => ({
            ...prev,
            [name]: {
                ...prev[name],
                [field]: value,
            },
        }));
    };

    const handleAddCustomFee = () => {
        setCustomFees((prev) => [
            { name: '', amount: 0, dueDate: '' },
            ...prev,
        ]);
    };

    const handleRemoveCustomFee = (index) => {
        setCustomFees((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCustomFeeChange = (index, field, value) => {
        setCustomFees((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                [field]: value,
            };
            return next;
        });
    };

    const calculateTotal = () => {
        let sum = 0;
        Object.values(selectedDefaults).forEach((item) => {
            if (item.checked) {
                sum += parseFloat(item.amount) || 0;
            }
        });
        customFees.forEach((item) => {
            sum += parseFloat(item.amount) || 0;
        });
        return sum;
    };

    const totalFee = calculateTotal();

    const handleSave = async () => {
        if (!periodId) {
            toast.error('Please select a class');
            return;
        }
        if (!academicYear) {
            toast.error('Please enter an academic year');
            return;
        }

        const activeDefaults = Object.entries(selectedDefaults)
            .filter(([_, item]) => item.checked)
            .map(([name, item]) => {
                const line = {
                    headName: name,
                    amount: parseFloat(item.amount) || 0,
                    feeType: feeType,
                };
                if (item.dueDate) {
                    line.dueDate = new Date(item.dueDate).toISOString();
                }
                return line;
            });

        const activeCustoms = customFees
            .filter(item => item.name.trim() !== '')
            .map(item => {
                const line = {
                    headName: item.name.trim(),
                    amount: parseFloat(item.amount) || 0,
                    feeType: feeType,
                };
                if (item.dueDate) {
                    line.dueDate = new Date(item.dueDate).toISOString();
                }
                return line;
            });

        const feeLines = [...activeDefaults, ...activeCustoms];

        if (feeLines.length === 0) {
            toast.error('At least one fee line must be configured');
            return;
        }

        const hasInvalidAmount = feeLines.some(line => line.amount <= 0);
        if (hasInvalidAmount) {
            toast.error('All active fee items must have a valid positive amount');
            return;
        }

        setIsSaving(true);
        try {
            const payload = { periodId: periodId.split('_')[0], academicYear: formatYearLong(academicYear), feeLines, feeType };

            let res;
            if (editingStructure?.id) {
                res = await updateFeeStructure(editingStructure.id, payload);
            } else {
                res = await createFeeStructure(payload);
            }

            if (res.data?.success) {
                toast.success(editingStructure ? 'Fee structure updated!' : 'Fee structure saved!');
                onSaved(res.data.data);
            } else {
                toast.error(res.data?.message || 'Failed to save');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error saving fee structure');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#223F74] transition-colors font-medium"
                >
                    <ChevronLeft size={20} />
                    Back to list
                </button>
            </div>

            <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] rounded-2xl shadow-lg shadow-[#223F74]/20 p-6 border border-[#1a3360]">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            {editingStructure ? 'Edit Fee Structure' : 'New Fee Structure'}
                        </h1>
                        <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                            <IndianRupee size={14} />
                            Configure customized breakdown of annual fees
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F59B87] hover:bg-[#EC856D] disabled:opacity-60 text-white font-bold text-sm transition-all shadow-lg shadow-[#F59B87]/30"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'Saving…' : 'Save Structure'}
                        </button>
                    </div>
                </div>
                <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A] mt-4" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* General Configuration Card */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-6 h-fit">
                    <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-[0.2em] border-b border-[#F4F7FB] pb-3">
                        General Settings
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">
                                Grade / Class
                            </label>
                            <div className="min-w-0">
                                <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                                    {options.length === 0 && <Option value="">No classes found</Option>}
                                    {options.map((opt) => (
                                        <Option key={opt.value} value={opt.value}>{opt.name}</Option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">
                                Billing Cycle
                            </label>
                            <div className="min-w-0">
                                <Select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                                    <Option value="annual">Annual</Option>
                                    <Option value="half_yearly">Half Yearly</Option>
                                    <Option value="quarterly">Quarterly</Option>
                                    <Option value="monthly">Monthly</Option>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">
                                Academic Year
                            </label>
                            <input
                                type="text"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                placeholder="e.g. 2025-26"
                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F]"
                            />
                        </div>

                        <div className="pt-4 border-t border-[#F4F7FB]">
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                                Dynamic Total Fee
                            </p>
                            <p className="text-3xl font-black text-[#223F74] mt-1">
                                {fmt(totalFee)}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-1">
                                Automatically calculated from active breakdowns below
                            </p>
                        </div>
                    </div>
                </div>

                {/* Breakdown Configuration Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-[#F4F7FB] pb-3">
                        <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-[0.2em]">
                            Customized Fee Breakdown
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddCustomFee}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                        >
                            <Plus size={14} /> Add Custom Fee
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Custom fee items */}
                        {customFees.map((fee, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        value={fee.name}
                                        onChange={(e) => handleCustomFeeChange(idx, 'name', e.target.value)}
                                        placeholder="Enter Custom Fee Name (e.g. Lab Fee)"
                                        className="w-full rounded-xl border border-indigo-100 py-2 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#1D1D1F] bg-white"
                                    />
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="flex-1 md:w-36">
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-sm font-bold text-slate-400">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={fee.amount}
                                                onChange={(e) => handleCustomFeeChange(idx, 'amount', e.target.value)}
                                                placeholder="Amount"
                                                className="w-full rounded-xl border border-indigo-100 py-2 pl-7 pr-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#1D1D1F] bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 md:w-44">
                                        <input
                                            type="date"
                                            value={fee.dueDate}
                                            onChange={(e) => handleCustomFeeChange(idx, 'dueDate', e.target.value)}
                                            className="w-full rounded-xl border border-indigo-100 py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#1D1D1F] bg-white"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCustomFee(idx)}
                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors self-end md:self-auto"
                                        title="Remove Custom Fee"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Default checkable items */}
                        {DEFAULT_FEE_HEADS.map((head) => {
                            const isChecked = selectedDefaults[head.name]?.checked;
                            const amount = selectedDefaults[head.name]?.amount;
                            const dueDate = selectedDefaults[head.name]?.dueDate;
                            return (
                                <div
                                    key={head.name}
                                    className={`p-4 rounded-2xl border transition-all ${
                                        isChecked
                                            ? 'border-[#223F74]/30 bg-[#223F74]/5'
                                            : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                                    } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id={`check-${head.name}`}
                                            checked={isChecked || false}
                                            onChange={(e) => handleDefaultCheckChange(head.name, e.target.checked)}
                                            className="w-4 h-4 rounded text-[#223F74] focus:ring-[#223F74]/20 border-slate-300 cursor-pointer"
                                        />
                                        <label
                                            htmlFor={`check-${head.name}`}
                                            className="text-sm font-bold text-[#1D1D1F] cursor-pointer selection:bg-transparent"
                                        >
                                            {head.name}
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="flex-1 md:w-36">
                                            <div className="relative flex items-center">
                                                <span className="absolute left-3 text-sm font-bold text-slate-400">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    disabled={!isChecked}
                                                    value={amount}
                                                    onChange={(e) => handleDefaultValChange(head.name, 'amount', e.target.value)}
                                                    placeholder="Amount"
                                                    className={`w-full rounded-xl border py-2 pl-7 pr-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F] ${
                                                        isChecked ? 'bg-white border-[#E2E8F0]' : 'bg-[#F8F9FA] border-slate-200 cursor-not-allowed opacity-55'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 md:w-44">
                                            <input
                                                type="date"
                                                disabled={!isChecked}
                                                value={dueDate}
                                                onChange={(e) => handleDefaultValChange(head.name, 'dueDate', e.target.value)}
                                                className={`w-full rounded-xl border py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 text-[#1D1D1F] ${
                                                    isChecked ? 'bg-white border-[#E2E8F0]' : 'bg-[#F8F9FA] border-slate-200 cursor-not-allowed opacity-55'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {customFees.length === 0 && (
                            <p className="text-xs text-center text-[#6B7280] italic py-2">
                                No custom fee types added. Use the button in the header to add any specific fees.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Structure List Card ─────────────────────────────────────
const StructureCard = ({ structure, onEdit, onDelete, onToggleStatus, toggleLoading }) => (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden group ${
        structure.isActive ? 'border-[#E2E8F0]' : 'border-rose-200'
    }`}>
        <div className={`p-5 flex items-start justify-between gap-4 ${structure.isActive ? '' : 'opacity-70'}`}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#223F74]/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={22} className="text-[#223F74]" />
                </div>
                <div>
                    <p className="font-bold text-[#1D1D1F] text-base">{structure.className}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-[#6B7280] flex items-center gap-1">
                            <Calendar size={11} /> {formatYearLong(structure.academicYear)}
                        </span>
                        <span className="w-1 h-1 bg-[#D1D5DB] rounded-full" />
                        <span className="text-xs font-semibold text-[#223F74]">
                            {fmt(structure.totalAmount)} / year
                        </span>
                        <span className="w-1 h-1 bg-[#D1D5DB] rounded-full" />
                        <span className="text-xs font-medium text-[#6B7280] uppercase">
                            {structure.feeType || 'annual'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {/* ── ACTIVE / INACTIVE TOGGLE ── */}
                <button
                    onClick={() => onToggleStatus(structure)}
                    disabled={toggleLoading}
                    title={structure.isActive ? 'Deactivate structure' : 'Activate structure'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                        structure.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-[#F8F9FA] text-[#6B7280] border-[#E2E8F0] hover:bg-rose-50 hover:text-rose-600'
                    }`}
                >
                    {toggleLoading ? <Loader2 size={12} className="animate-spin" /> : (structure.isActive ? 'Active' : 'Inactive')}
                </button>

                <button
                    onClick={() => onEdit(structure)}
                    className="p-2 text-[#6B7280] hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-xl transition-colors"
                    title="Edit Structure"
                >
                    <Edit size={16} />
                </button>

                <button
                    onClick={() => onDelete(structure)}
                    className="p-2 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                    title="Delete Structure"
                >
                    <Trash2 size={16} className="group-hover:text-rose-600" />
                </button>
            </div>
        </div>

        <div className={`px-5 pb-5 ${structure.isActive ? '' : 'opacity-70'}`}>
            <div className="grid grid-cols-2 gap-2">
                {structure.feeLines.map((line, idx) => (
                    <div key={idx} className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E2E8F0] flex justify-between items-center gap-2">
                        <div className="truncate">
                            <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider truncate">
                                {line.headName || "Fee Head"}
                            </p>
                            {line.dueDate && (
                                <p className="text-[9px] text-[#A0AEC0] mt-0.5">
                                    Due: {new Date(line.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                            )}
                        </div>
                        <p className="text-sm font-bold text-[#223F74] flex-shrink-0">
                            {fmt(line.amount)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// ── Empty state ───────────────────────────────────────────────
const EmptyState = ({ onAdd }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#223F74]/10 flex items-center justify-center mb-6">
            <LayoutList size={32} className="text-[#223F74]" />
        </div>
        <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">No fee structures yet</h3>
        <p className="text-sm text-[#6B7280] max-w-xs mb-6">
            Create a fee structure for each class to define annual fees and instalments.
        </p>
        <button
            onClick={onAdd}
            className="flex items-center gap-2 px-6 py-3 bg-[#223F74] hover:bg-[#1A2F56] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#223F74]/20"
        >
            <Plus size={18} /> Create First Structure
        </button>
    </div>
);

// ── Main Component ────────────────────────────────────────────
const FeeStructures = () => {
    const [view, setView] = useState('list');
    const [editing, setEditing] = useState(null);
    const [classes, setClasses] = useState([]);
    const [structures, setStructures] = useState([]);
    const [filteredStructures, setFilteredStructures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toggleLoadingId, setToggleLoadingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [classRes, structRes] = await Promise.allSettled([
                getFeeStructureClasses(),
                getFeeStructures(),
            ]);

            if (classRes.status === 'fulfilled' && classRes.value.data?.success) {
                setClasses(classRes.value.data.data);
            } else {
                toast.error('Could not load classes for this school');
            }
            if (structRes.status === 'fulfilled' && structRes.value.data?.success) {
                setStructures(structRes.value.data.data);
                setFilteredStructures(structRes.value.data.data);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load fee structures');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        let filtered = structures;

        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.className?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterYear !== 'all') {
            filtered = filtered.filter(s => formatYearLong(s.academicYear) === formatYearLong(filterYear));
        }

        if (filterType !== 'all') {
            filtered = filtered.filter(s => (s.feeType || 'quarterly') === filterType);
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(s => (filterStatus === 'active' ? s.isActive : !s.isActive));
        }

        setFilteredStructures(filtered);
    }, [searchTerm, filterYear, filterType, filterStatus, structures]);

    const handleAdd = () => { setEditing(null); setView('form'); };
    const handleEdit = (structure) => { setEditing(structure); setView('form'); };

    const handleSaved = (saved) => {
        fetchAll();
        setView('list');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await deleteFeeStructure(deleteTarget.id);
            if (res.data?.success) {
                setStructures((prev) => prev.filter((s) => s.id !== deleteTarget.id));
                toast.success('Fee structure removed successfully!');
                setDeleteTarget(null);
            } else {
                toast.error(res.data?.message || 'Failed to remove');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.response?.data?.message || 'Error removing fee structure');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleToggleStatus = async (structure) => {
        setToggleLoadingId(structure.id);
        try {
            const res = await toggleFeeStructureStatus(structure.id);
            if (res.data?.success) {
                toast.success(res.data.message);
                fetchAll();
            } else {
                toast.error(res.data?.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Toggle error:', err);
            toast.error(err.response?.data?.message || 'Error updating status');
        } finally {
            setToggleLoadingId(null);
        }
    };

    const years = [...new Set(structures.map((s) => formatYearLong(s.academicYear)))].sort().reverse();
    const feeTypes = [...new Set(structures.map((s) => s.feeType || 'quarterly'))];
    const activeCount = structures.filter((s) => s.isActive).length;

    if (view === 'form') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
                <StructureForm
                    classes={classes}
                    editingStructure={editing}
                    onSaved={handleSaved}
                    onCancel={() => setView('list')}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen">

            <div className="w-full mb-8">
                <Heading 
                    primaryText="Fee" 
                    secondaryText="Structures"
                    action={
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F59B87] hover:bg-[#EC856D] text-white font-bold text-sm transition-all shadow-lg shadow-[#F59B87]/30"
                        >
                            <Plus size={16} /> New Structure
                        </button>
                    }
                />
            </div>

            {!loading && structures.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Structures', value: filteredStructures.length, color: 'text-[#223F74]', bg: 'bg-[#223F74]/10' },
                        { label: 'Total Classes', value: new Set(structures.map((s) => s.periodId)).size, color: 'text-amber-700', bg: 'bg-amber-50' },
                        { label: 'Fee Types', value: feeTypes.length, color: 'text-blue-700', bg: 'bg-blue-50' },
                        { label: 'Active Structures', value: activeCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`${bg} rounded-2xl p-4 border border-[#E2E8F0]`}>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
                            <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {!loading && structures.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search by class name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-sm text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
                            />
                        </div>

                        <div className="min-w-0">
                            <Select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                                <Option value="all">All Years</Option>
                                {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                            </Select>
                        </div>

                        <div className="min-w-0">
                            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <Option value="all">All Cycles</Option>
                                <Option value="annual">Annual</Option>
                                <Option value="half_yearly">Half Yearly</Option>
                                <Option value="quarterly">Quarterly</Option>
                                <Option value="monthly">Monthly</Option>
                            </Select>
                        </div>

                        <div className="min-w-0">
                            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <Option value="all">All Status</Option>
                                <Option value="active">Active</Option>
                                <Option value="inactive">Inactive</Option>
                            </Select>
                        </div>

                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterYear('all');
                                setFilterType('all');
                                setFilterStatus('all');
                            }}
                            className="px-4 py-3 rounded-xl bg-[#223F74] text-white font-bold text-sm hover:bg-[#1a3360] transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-4 border-[#223F74]/20 border-t-[#223F74] rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-[#223F74]">Loading fee structures…</p>
                </div>
            ) : filteredStructures.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
                    <EmptyState onAdd={handleAdd} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredStructures.map((s) => (
                        <StructureCard
                            key={s.id}
                            structure={s}
                            onEdit={handleEdit}
                            onDelete={setDeleteTarget}
                            onToggleStatus={handleToggleStatus}
                            toggleLoading={toggleLoadingId === s.id}
                        />
                    ))}
                </div>
            )}

            {deleteTarget && (
                <DeleteDialog
                    structure={deleteTarget}
                    loading={deleteLoading}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
};

export default FeeStructures;
