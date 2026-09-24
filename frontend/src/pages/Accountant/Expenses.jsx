import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PlusCircle, Users, Receipt, Repeat,
    TrendingDown, ArrowUpRight, Search, Phone,
    Upload, Trash2, X, Eye, FileText,
    Building2, Coffee, Truck, PenTool, Calendar,
    TrendingUp, Loader2, ChevronLeft, Download,
    Filter, Clock, AlertCircle, CheckCircle2,
    IndianRupee, Wallet, CreditCard, Edit
} from 'lucide-react';
import { 
    getExpenses, 
    createExpense, 
    deleteExpense as deleteExpenseApi, 
    getVendors,
    getRecurringExpenses
} from '../../services/accountantExpensesApi';
import { getFinancialSummary } from '../../services/accountantReportsApi';
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

// ── Delete Confirmation Dialog ──
const DeleteDialog = ({ expense, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-100 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-[#223F74]">Delete Expense</h3>
            </div>
            <p className="text-[#6B7280] mb-2">
                You are about to delete the expense record:
            </p>
            <div className="bg-[#F8F9FA] rounded-xl p-4 mb-6 border border-[#E2E8F0]">
                <p className="font-bold text-[#1D1D1F]">{expense?.title}</p>
                <p className="text-sm text-[#6B7280]">
                    {expense?.category} · ₹{expense?.amount?.toLocaleString()}
                </p>
            </div>
            <p className="text-sm text-rose-600 font-medium mb-6">
                This action cannot be undone.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold transition-all"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Delete Expense
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

// ── Receipt Modal ──
const ReceiptModal = ({ expense, onClose }) => (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#223F74]/10 rounded-2xl">
                        <FileText className="w-6 h-6 text-[#223F74]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#223F74]">Expense Details</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[#F4F7FB] rounded-xl transition-colors">
                    <X size={20} className="text-[#6B7280]" />
                </button>
            </div>

            <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#223F74]/5 to-[#F59B87]/5 p-4 rounded-xl border border-[#E2E8F0]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Title</p>
                    <p className="font-bold text-[#1D1D1F] text-lg">{expense?.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Category</p>
                        <p className="font-semibold text-[#1D1D1F]">{expense?.category}</p>
                    </div>
                    <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Amount</p>
                        <p className="font-bold text-rose-600">₹{expense?.amount?.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Vendor</p>
                    <p className="font-semibold text-[#1D1D1F]">{expense?.vendorName || 'Direct Expense'}</p>
                    {expense?.vendorContact && (
                        <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                            <Phone size={12} /> {expense.vendorContact}
                        </p>
                    )}
                </div>

                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Date</p>
                    <p className="font-semibold text-[#1D1D1F]">
                        {new Date(expense?.expenseDate || expense?.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                </div>

                {expense?.remarks && (
                    <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Remarks</p>
                        <p className="text-sm text-[#1D1D1F]">{expense.remarks}</p>
                    </div>
                )}

                {expense?.isRecurring && (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-center gap-2">
                        <Repeat size={16} className="text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">Recurring Monthly Expense</span>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-[#E2E8F0]">
                <Button text="Close" variant="secondary" size={6} onClick={onClose} />
            </div>
        </div>
    </div>
);

// ── Main Component ──
const Expenses = () => {
    const schoolId = localStorage.getItem('schoolId');
    const categories = [
        'electricity', 'water', 'transport', 'lab', 'events', 'maintenance', 
        'salaries', 'rent', 'stationery', 'cleaning', 'security', 'it_infrastructure', 'miscellaneous'
    ];

    // API Data State
    const [expenseHistory, setExpenseHistory] = useState([]);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [categoryTotals, setCategoryTotals] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [recurringExpenses, setRecurringExpenses] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        category: 'electricity',
        vendor: "",
        vendorContact: "",
        amount: "",
        expenseDate: new Date().toISOString().split('T')[0],
        isRecurring: false,
        remarks: '',
        invoiceFile: null
    });

    const [vendorSearch, setVendorSearch] = useState("");
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchExpensesData = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const [expRes, vendorsRes, recurRes, reportsRes] = await Promise.all([
                getExpenses(schoolId),
                getVendors(schoolId),
                getRecurringExpenses(schoolId),
                getFinancialSummary(schoolId)
            ]);

            if (expRes.data?.success) {
                setExpenseHistory(expRes.data.data.expenses || []);
                setTotalExpenses(expRes.data.data.summary?.totalExpenses || 0);
                setCategoryTotals(expRes.data.data.summary?.categoryTotals || []);
            }
            if (vendorsRes.data?.success) {
                const mappedVendors = (vendorsRes.data.data || []).map(v => ({
                    ...v,
                    phoneNumber: v.contact
                }));
                setVendors(mappedVendors);
            }
            if (recurRes.data?.success) {
                setRecurringExpenses(recurRes.data.data || []);
            }
            if (reportsRes.data?.success) {
                setTotalRevenue(reportsRes.data.data.totalRevenue || 0);
            }
        } catch (err) {
            console.error("Error loading expenses data:", err);
            toast.error("Failed to load expenses list");
        } finally {
            setLoading(false);
        }
    }, [schoolId]);

    useEffect(() => {
        fetchExpensesData();
    }, [fetchExpensesData]);

    const filteredVendors = useMemo(() => {
        const baseVendors = vendors;
        return baseVendors.filter(v =>
            v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
            v.category.toLowerCase().includes(vendorSearch.toLowerCase())
        );
    }, [vendors, vendorSearch]);

    // ── Mobile Number Validation ──
    const handleVendorContactChange = (e) => {
        const value = e.target.value;
        // Only allow digits
        const digitsOnly = value.replace(/\D/g, '');
        // Limit to 10 digits
        if (digitsOnly.length <= 10) {
            setFormData({ ...formData, vendorContact: digitsOnly });
        }
    };

    // ── Handle Key Down to prevent non-digit input ──
    const handleVendorContactKeyDown = (e) => {
        // Allow: backspace, delete, tab, escape, enter
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (allowedKeys.includes(e.key)) return;
        
        // Allow: Ctrl+C, Ctrl+V, Ctrl+A
        if (e.ctrlKey && ['c', 'v', 'a'].includes(e.key.toLowerCase())) return;
        
        // Prevent if not a digit
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.title) {
            toast.error("Please enter expense Title and Amount!");
            return;
        }
        if (!formData.expenseDate) {
            toast.error("Please select a valid Expense Date!");
            return;
        }

        const selectedDate = new Date(formData.expenseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        if (selectedDate > today) {
            toast.error("Cannot add an expense for a future date!");
            return;
        }
        // Validate mobile number if entered
        if (formData.vendorContact && formData.vendorContact.length < 10) {
            toast.error("Please enter a valid 10-digit mobile number!");
            return;
        }

        try {
            toast.loading("Recording expense...");
            const res = await createExpense(schoolId, {
                title: formData.title,
                category: formData.category,
                vendorName: formData.vendor || "Direct Expense",
                vendorContact: formData.vendorContact || null,
                amount: Number(formData.amount),
                isRecurring: formData.isRecurring,
                expenseDate: new Date(formData.expenseDate).toISOString(),
                paymentMode: 'bank_transfer',
                paymentStatus: 'paid',
                remarks: formData.remarks
            });
            toast.dismiss();

            if (res.data?.success) {
                toast.success("Expense recorded successfully!");
                setFormData({ 
                    title: '', 
                    category: 'electricity', 
                    vendor: "", 
                    vendorContact: "",
                    amount: "", 
                    expenseDate: new Date().toISOString().split('T')[0], 
                    isRecurring: false, 
                    remarks: '', 
                    invoiceFile: null 
                });
                fetchExpensesData();
            } else {
                toast.error(res.data?.message || "Failed to record expense");
            }
        } catch (error) {
            toast.dismiss();
            console.error("Expense Record Error:", error);
            toast.error(error.response?.data?.message || "Error submitting expense entry");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await deleteExpenseApi(deleteTarget.id);
            if (res.data?.success) {
                setExpenseHistory(prev => prev.filter(e => (e._id || e.id) !== deleteTarget.id));
                toast.success("Expense deleted successfully");
                setDeleteTarget(null);
                fetchExpensesData();
            } else {
                toast.error(res.data?.message || "Delete operation failed");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error(error.response?.data?.message || "Error deleting expense");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleExport = () => {
        if (expenseHistory.length === 0) {
            toast.error("Nothing to export");
            return;
        }
        const data = expenseHistory.map(exp => ({
            'Title': exp.title,
            'Category': exp.category,
            'Vendor': exp.vendorName || 'N/A',
            'Amount': exp.amount,
            'Date': new Date(exp.expenseDate || exp.date).toLocaleDateString(),
            'Recurring': exp.isRecurring ? 'Yes' : 'No'
        }));
        exportToCSV(data, `Expenses_Log_${new Date().toLocaleDateString()}`);
    };

    // Format amount helper
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Table columns for expenses
    const expenseColumns = [
        { key: 'title', label: 'Title & Date', width: '25%' },
        { key: 'category', label: 'Category', width: '15%' },
        { key: 'vendorName', label: 'Vendor Details', width: '20%' },
        { key: 'amount', label: 'Amount', width: '15%' },
        {
            key: 'actions',
            label: 'Actions',
            width: '15%',
            render: (_, row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedReceipt(row)}
                        className="p-1.5 text-[#6B7280] hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition-colors"
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const expenseRows = expenseHistory.map(exp => ({
        id: exp._id || exp.id,
        title: exp.title,
        date: new Date(exp.expenseDate || exp.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),
        category: exp.category,
        vendorName: exp.vendorName || 'Direct Expense',
        amount: formatAmount(exp.amount),
        isRecurring: exp.isRecurring,
        vendorContact: exp.vendorContact,
        remarks: exp.remarks
    }));

    return (
        <div className="min-h-screen">
            
            {/* Header */}
            <div className="w-full mb-8">
                <Heading 
                    primaryText="Expense" 
                    secondaryText="Management"
                    action={
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
                            >
                                <Download size={16} /> Export
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Stats Cards */}
            <div className="w-full mb-8">
                <DashGrid cols={12} gap={4}>
                    <EnhancedDashCard
                        title="Total Revenue"
                        value={formatAmount(totalRevenue)}
                        icon={<TrendingUp size={22} />}
                        accentColor="#3b82f6"
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Total Expenses"
                        value={formatAmount(totalExpenses)}
                        icon={<TrendingDown size={22} />}
                        accentColor="#ef4444"
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Net Balance"
                        value={formatAmount(totalRevenue - totalExpenses)}
                        icon={<Wallet size={22} />}
                        accentColor={totalRevenue - totalExpenses > 0 ? "#22c55e" : "#ef4444"}
                        size={3}
                        showAnimations={true}
                    />
                    <EnhancedDashCard
                        title="Categories Used"
                        value={String(categoryTotals.length)}
                        icon={<Filter size={22} />}
                        accentColor="#8b5cf6"
                        size={3}
                        showAnimations={true}
                    />
                </DashGrid>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Add Expense Form */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#223F74] rounded-xl">
                                <PlusCircle size={18} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-[#223F74]">Record New Expense</h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <Grid cols={12} gap={4}>
                                <div className="col-span-12 md:col-span-6">
                                    <DataField
                                        label="Expense Title"
                                        id="title"
                                        placeholder="e.g., Office Supplies, Electricity Bill"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        size={12}
                                        required
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                                            Category
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition duration-200"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>
                                                    {cat.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <DataField
                                        label="Expense Date"
                                        id="expenseDate"
                                        type="date"
                                        value={formData.expenseDate}
                                        onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                                        size={12}
                                        required
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <DataField
                                        label="Vendor Name"
                                        id="vendor"
                                        placeholder="Enter vendor name"
                                        value={formData.vendor}
                                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                        size={12}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <DataField
                                        label="Amount (₹)"
                                        id="amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        size={12}
                                        required
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                                            Vendor Contact (10 digits)
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                            <input
                                                type="text"
                                                id="vendorContact"
                                                placeholder="Enter 10-digit mobile number"
                                                value={formData.vendorContact}
                                                onChange={handleVendorContactChange}
                                                onKeyDown={handleVendorContactKeyDown}
                                                maxLength={10}
                                                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition duration-200"
                                                title="Enter only digits, max 10 digits"
                                            />
                                            {formData.vendorContact && formData.vendorContact.length > 0 && (
                                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold ${formData.vendorContact.length === 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {formData.vendorContact.length}/10
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[#6B7280] mt-0.5">
                                            Only digits allowed • Maximum 10 digits
                                        </p>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <DataField
                                        label="Remarks"
                                        id="remarks"
                                        placeholder="Add extra description..."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        size={12}
                                    />
                                </div>

                                <div className="col-span-12 flex items-center p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0]">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isRecurring}
                                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            className="w-4 h-4 text-[#223F74] rounded border-[#E2E8F0] focus:ring-[#223F74]"
                                        />
                                        <span className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                                            <Repeat size={16} className="text-[#223F74]" /> Recurring Monthly
                                        </span>
                                    </label>
                                </div>
                            </Grid>

                            <Button
                                text="Save Expense"
                                variant="primary"
                                size={12}
                                icon={<PlusCircle size={16} />}
                                onClick={handleSubmit}
                                className="mt-6"
                            />
                        </form>
                    </div>

                    {/* Expense List */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                        <DataTable
                            columns={expenseColumns}
                            rows={expenseRows}
                            size={12}
                            pageSize={10}
                            pageSizeOptions={[5, 10, 20, 50]}
                            searchable={true}
                            title={`Expense History (${expenseHistory.length})`}
                            onRefresh={fetchExpensesData}
                            loading={loading}
                            exportable={true}
                            exportFileName={`expenses-${new Date().toISOString().split('T')[0]}`}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Vendor Directory */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                        <h4 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2">
                            <Users size={18} /> Vendor Directory
                        </h4>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#1D1D1F] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
                            />
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {filteredVendors.length > 0 ? (
                                filteredVendors.map((v, i) => (
                                    <div key={i} className="p-3 rounded-xl border border-[#E2E8F0] hover:border-[#223F74]/20 hover:shadow-sm transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-[#F4F7FB] rounded-lg">
                                                <Building2 size={14} className="text-[#223F74]" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-[#1D1D1F]">{v.name}</p>
                                                <p className="text-[10px] font-bold text-[#223F74] uppercase tracking-wider">{v.category}</p>
                                                <p className="text-[10px] text-[#6B7280] mt-1">{v.phoneNumber || 'No contact'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-[#6B7280]">
                                    <p className="text-sm">No vendors found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Summary */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                        <h4 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2">
                            <Clock size={18} /> Monthly Summary
                        </h4>
                        {categoryTotals && categoryTotals.length > 0 ? (
                            <div className="space-y-3">
                                {categoryTotals.slice(0, 5).map((item) => {
                                    const total = item.total || 0;
                                    const cat = item._id || 'Other';
                                    const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-[10px] font-bold text-[#6B7280]">
                                                <span>{cat.replace('_', ' ').toUpperCase()}</span>
                                                <span>{formatAmount(total)}</span>
                                            </div>
                                            <div className="w-full bg-[#F4F7FB] h-1.5 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="bg-[#223F74] h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-[#6B7280]">No categorized data</p>
                        )}
                    </div>

                    {/* Recurring Expenses */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                        <h4 className="text-sm font-bold text-[#223F74] mb-4 flex items-center gap-2">
                            <Repeat size={18} /> Recurring Expenses
                        </h4>
                        {recurringExpenses.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {recurringExpenses.slice(0, 5).map((item) => (
                                    <div key={item._id || item.id} className="flex justify-between items-center p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                        <span className="text-sm font-semibold text-[#1D1D1F]">{item.vendorName || item.title}</span>
                                        <span className="text-sm font-bold text-rose-600">{formatAmount(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#6B7280]">No recurring expenses</p>
                        )}
                    </div>

                    {/* Revenue Comparison */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                        <h4 className="text-sm font-bold text-[#223F74] mb-4 text-center">Expense vs Revenue</h4>
                        <div className="flex justify-between items-center px-4">
                            <div className="text-center">
                                <p className="text-[10px] text-[#6B7280] font-bold uppercase">Expenses</p>
                                <p className="text-lg font-bold text-rose-600">
                                    {totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                                </p>
                            </div>
                            <div className="h-8 w-px bg-[#E2E8F0]"></div>
                            <div className="text-center">
                                <p className="text-[10px] text-[#6B7280] font-bold uppercase">Revenue</p>
                                <p className="text-lg font-bold text-emerald-600">100%</p>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-[#F4F7FB] h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-rose-400 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min((totalExpenses / totalRevenue) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Dialog */}
            {deleteTarget && (
                <DeleteDialog
                    expense={deleteTarget}
                    loading={deleteLoading}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {/* Receipt Modal */}
            {selectedReceipt && (
                <ReceiptModal
                    expense={selectedReceipt}
                    onClose={() => setSelectedReceipt(null)}
                />
            )}
        </div>
    );
};

export default Expenses;