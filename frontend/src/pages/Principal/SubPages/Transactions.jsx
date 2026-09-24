import React, { useEffect, useMemo, useState } from "react";
import { Eye, Printer, X, Search, RefreshCw, Loader2, AlertCircle, Download, Calendar, Users, DollarSign } from "lucide-react";
import { getPrincipalTransactions } from "../../../services/api/principalFinanceApi";
import {
  DataTable,
  Button,
  DataField,
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  PanelModal,
  P,
  SelectField,
  ModalGrid,
  ModalData,
} from "../../../components/shared/Common_Components";
import DatePicker from "../../../components/shared/DatePicker";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    onlinePayments: 0,
    cashPayments: 0,
  });

  const getSchoolId = () => {
    const directId = localStorage.getItem("schoolId") || "backend_handles_this";
    if (directId && directId !== "undefined" && directId !== "null") return directId;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj?.school || userObj?.school?._id || null;
      }
    } catch (e) { console.error("Error parsing"); }
    return null;
  };

  const schoolId = getSchoolId();

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const loadTransactions = async () => {
    if (!schoolId) {
      setLoadingPage(false);
      setError("School ID not found. Please sign in again.");
      return;
    }

    setLoadingPage(true);
    setError("");

    try {
      const response = await getPrincipalTransactions(schoolId);
      const payload = response?.data || {};
      const nextTransactions = payload.transactions || [];
      setTransactions(nextTransactions);
      setFilteredTransactions(nextTransactions);
      setSummary(payload.summary || summary);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
        loadError.message ||
        "Failed to load transactions",
      );
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const amountToWords = (amount) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (amount < 10) return `${ones[amount]} only`;
    if (amount < 100) {
      if (amount < 20) return `${teens[amount - 10]} only`;
      return `${tens[Math.floor(amount / 10)]} ${ones[amount % 10]} only`;
    }
    return `Rupees ${amount} only`;
  };

  useEffect(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (modeFilter !== "All") {
      filtered = filtered.filter((t) => t.mode === modeFilter);
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (dateFromFilter) {
      filtered = filtered.filter(
        (t) => new Date(t.date) >= new Date(dateFromFilter),
      );
    }

    if (dateToFilter) {
      filtered = filtered.filter(
        (t) => new Date(t.date) <= new Date(dateToFilter),
      );
    }

    if (classFilter) {
      filtered = filtered.filter((t) => String(t.class) === String(classFilter));
    }

    setFilteredTransactions(filtered);
  }, [
    searchTerm,
    modeFilter,
    statusFilter,
    dateFromFilter,
    dateToFilter,
    classFilter,
    transactions,
  ]);

  // Table columns configuration
  const columns = [
    {
      key: "transactionId",
      label: "Transaction ID",
      width: "150px",
    },
    {
      key: "date",
      label: "Date & Time",
      width: "180px",
    },
    {
      key: "studentName",
      label: "Student Name",
      width: "180px",
    },
    {
      key: "class",
      label: "Class & Section",
      width: "140px",
    },
    {
      key: "category",
      label: "Category",
      width: "140px",
    },
    {
      key: "amount",
      label: "Amount",
      width: "120px",
    },
    {
      key: "mode",
      label: "Mode",
      width: "120px",
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
    },
  ];

  // Transform data for DataTable
  const tableRows = filteredTransactions.map(transaction => ({
    id: transaction.id,
    transactionId: transaction.transactionId || 'N/A',
    date: transaction.date || 'N/A',
    time: transaction.time || 'N/A',
    studentName: transaction.studentName || 'Unknown',
    class: transaction.class || 'N/A',
    section: transaction.section || 'N/A',
    category: transaction.category || 'Fee Payment',
    amount: transaction.amount || 0,
    mode: transaction.mode || 'Cash',
    status: transaction.status || 'Success',
    receipt: transaction.receipt || 'N/A',
    amountFormatted: formatAmount(transaction.amount || 0),
  }));

  // Actions for DataTable
  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Receipt",
      variant: "primary",
      onClick: (row) => {
        setSelectedTransaction(row);
        setShowReceiptModal(true);
      },
    },
    {
      icon: <Printer size={14} />,
      tooltip: "Print",
      variant: "ghost",
      onClick: (row) => {
        setSelectedTransaction(row);
        setShowReceiptModal(true);
        setTimeout(() => window.print(), 500);
      },
    },
  ];

  // Stats for EnhancedDashCard
  const totalTransactions = filteredTransactions.length;
  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const onlinePayments = filteredTransactions.filter((t) =>
    ["Online", "UPI"].includes(t.mode),
  ).length;
  const cashPayments = filteredTransactions.filter(
    (t) => t.mode === "Cash",
  ).length;

  const stats = [
    {
      title: "Total Transactions",
      value: String(summary.totalTransactions || totalTransactions || 0),
      icon: <Download size={22} />,
      accentColor: "#3b82f6",
      size: 3,
    },
    {
      title: "Total Amount Collected",
      value: formatAmount(summary.totalAmount || totalAmount || 0),
      icon: <DollarSign size={22} />,
      accentColor: "#16a34a",
      size: 3,
    },
    {
      title: "Online Payments",
      value: String(summary.onlinePayments || onlinePayments || 0),
      icon: <Download size={22} />,
      accentColor: "#8b5cf6",
      size: 3,
    },
    {
      title: "Cash Payments",
      value: String(summary.cashPayments || cashPayments || 0),
      icon: <Users size={22} />,
      accentColor: "#f59e0b",
      size: 3,
    },
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <Heading
          primaryText="Transaction Logs"
          secondaryText="Complete record of all fee transactions"
          showAnimations={true}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2 mx-6">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-6">
        <DashGrid cols={12} gap={4}>
          {stats.map((stat, idx) => (
            <EnhancedDashCard
              key={idx}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              accentColor={stat.accentColor}
              size={stat.size}
              showAnimations={true}
            />
          ))}
        </DashGrid>
      </div>

      {/* Data Table */}
      <div className="mt-6 px-6 pb-8">

        <DataTable
          columns={columns}
          rows={tableRows}
          actions={actions}
          size={12}
          pageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
          searchable={true}
          bulkAction={false}
          exportable={true}
          filters={[
            { title: "Payment Mode", type: "toggle", key: "mode", options: ["All", "Cash", "Online", "UPI", "Cheque", "DD"], fn: () => true },
            { title: "Status", type: "toggle", key: "status", options: ["All", "Success", "Failed", "Refunded"], fn: () => true },
            { title: "From Date", type: "date", key: "fromDate", fn: () => true },
            { title: "To Date", type: "date", key: "toDate", fn: () => true }
          ]}
          onApplyFilters={(applied) => {
            if (applied.mode && applied.mode.length > 0) setModeFilter(applied.mode[0]);
            else setModeFilter("All");
            
            if (applied.status && applied.status.length > 0) setStatusFilter(applied.status[0]);
            else setStatusFilter("All");

            if (applied.fromDate) setDateFromFilter(applied.fromDate);
            else setDateFromFilter("");

            if (applied.toDate) setDateToFilter(applied.toDate);
            else setDateToFilter("");
          }}
          title="Transaction Logs"
          onRefresh={loadTransactions}
        />
      </div>

      {/* Receipt Modal using PanelModal */}
      {showReceiptModal && selectedTransaction && (
        <PanelModal
          id="receipt-modal"
          title="Fee Receipt"
          isVisible={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedTransaction(null);
          }}
          size="lg"
        >
          <div className="p-8 max-w-2xl mx-auto" id="receipt-print">
            {/* School Logo & Name */}
            <div className="text-center mb-8 pb-8 border-b border-slate-300">
              <div className="w-20 h-20 bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">
                S
              </div>
              <h1 className="text-3xl font-bold text-[#223F74]">
                School Name
              </h1>
              <p className="text-slate-600">
                School Address, City - PIN Code
              </p>
              <p className="text-slate-600">Phone: +91-XXXXX-XXXXX</p>
            </div>

            {/* Receipt Title */}
            <h2 className="text-2xl font-bold text-center mb-8 text-[#223F74]">
              FEE RECEIPT
            </h2>

            {/* Receipt Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs text-slate-600">Receipt Number</p>
                <p className="text-lg font-bold text-[#223F74]">
                  {selectedTransaction.receipt || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Receipt Date</p>
                <p className="text-lg font-bold text-[#223F74]">
                  {selectedTransaction.date || 'N/A'}
                </p>
              </div>
            </div>

            {/* Student Details */}
            <div className="mb-8 pb-8 border-b border-slate-300">
              <h3 className="font-bold text-[#223F74] text-sm mb-4">
                STUDENT DETAILS
              </h3>
              <ModalGrid cols={2}>
                <ModalData label="Student Name" value={selectedTransaction.studentName || 'N/A'} />
                <ModalData label="Class & Section" value={`${selectedTransaction.class}-${selectedTransaction.section}`} />
                <ModalData label="Admission Number" value={`ADM${String(selectedTransaction.id || '001').padStart(3, "0")}`} />
                <ModalData label="Roll Number" value={String(selectedTransaction.id || '01').padStart(2, "0")} />
              </ModalGrid>
            </div>

            {/* Fee Details Table */}
            <div className="mb-8 pb-8 border-b border-slate-300">
              <h3 className="font-bold text-[#223F74] text-sm mb-4">
                FEE DETAILS
              </h3>
              <ModalGrid cols={2}>
                <ModalData label="Description" value={selectedTransaction.category || 'Fee Payment'} />
                <ModalData label="Total Amount" value={formatAmount(selectedTransaction.amount)} />
              </ModalGrid>
            </div>

            {/* Payment Info */}
            <div className="mb-8 pb-8 border-b border-slate-300">
              <h3 className="font-bold text-[#223F74] text-sm mb-4">
                PAYMENT INFO
              </h3>
              <ModalGrid cols={2}>
                <ModalData label="Payment Mode" value={selectedTransaction.mode || 'N/A'} />
                <ModalData label="Transaction ID" value={selectedTransaction.transactionId || 'N/A'} />
                <ModalData label="Amount in Words" value={amountToWords(selectedTransaction.amount)} className="col-span-2" />
              </ModalGrid>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-[#223F74] font-semibold mb-8">
                Thank you for your payment!
              </p>
              <div className="mt-12 pt-6 border-t border-slate-300">
                <p className="text-xs text-slate-600">
                  Authorized Signature
                </p>
                <p className="mt-6 text-[#223F74]">___________________</p>
              </div>
            </div>
          </div>

          {/* Action Buttons for Modal */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4">
            <div className="flex-1">
              <Button
                variant="primary"
                onClick={() => window.print()}
                icon={<Printer className="w-4 h-4" />}
                className="w-full"
              >
                Print Receipt
              </Button>
            </div>
            <div className="flex-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedTransaction(null);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default Transactions;