/**
 * ParentPayFee.jsx
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Parent-facing "Pay Fee" screen integrated with Razorpay and Mongoose Backend.
 * Pulls auth/context IDs from localStorage.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Button,
  DataField,
  Select,
  Option,
  DataTable,
  Heading,
  HeadingForDataTable,
  DashCard,
  Modal,
  ModalData,
  ModalGrid,
  ModalProfile,
  P,
  Grid,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import {
  Receipt,
  Download,
  Printer,
  X,
  ChevronDown,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  IndianRupee,
  CalendarDays,
  GraduationCap,
  Tag,
  Percent,
  Gift,
  AlarmClock,
  Eye,
  Sparkles,
} from "lucide-react";

import api from "../../services/api";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RAZORPAY SCRIPT LOADER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// THEME & FORMAT HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const T = {
  navy: "#223F74",
  border: "#E2E8F0",
  emerald: "#5B9A6A",
  amber: "#E0A04B",
  rose: "#D66B5F",
  blue: "#7A8FC6",
};

const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDate = (iso) => {
  if (!iso || iso === "N/A") return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const NUM_WORDS = {
  ones: [
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
  ],
  tens: [
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
  ],
};
function twoDigitWords(n) {
  if (n < 20) return NUM_WORDS.ones[n];
  return `${NUM_WORDS.tens[Math.floor(n / 10)]}${n % 10 ? " " + NUM_WORDS.ones[n % 10] : ""}`;
}
function threeDigitWords(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${hundred ? NUM_WORDS.ones[hundred] + " Hundred " : ""}${rest ? twoDigitWords(rest) : ""}`.trim();
}
function amountToWords(amount) {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Rupees Only";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;
  let words = "";
  if (crore) words += `${threeDigitWords(crore)} Crore `;
  if (lakh) words += `${threeDigitWords(lakh)} Lakh `;
  if (thousand) words += `${threeDigitWords(thousand)} Thousand `;
  if (hundred) words += `${threeDigitWords(hundred)}`;
  return `${words.trim()} Rupees Only`;
}

const PAYMENT_METHODS = [
  { key: "card", label: "Credit/Debit Card", icon: CreditCard },
  { key: "upi", label: "UPI", icon: Smartphone },
  { key: "netbanking", label: "Net Banking", icon: Landmark },
];

const OFFER_ICONS = {
  "Early Payment Discount": Percent,
  "Late Fee Penalty": AlarmClock,
  Scholarship: GraduationCap,
  "Special Offer": Gift,
};

const STATUS_STYLES = {
  Paid: ["bg-emerald-100", "text-emerald-700", CheckCircle2],
  "Partially Paid": ["bg-amber-100", "text-amber-700", Clock],
  Pending: ["bg-blue-100", "text-blue-700", Clock],
  "Due Soon": ["bg-amber-100", "text-amber-700", Clock],
  Overdue: ["bg-rose-100", "text-rose-700", AlertTriangle],
};

const StatusBadge = ({ status, size = "md" }) => {
  const [bg, text, Icon] = STATUS_STYLES[status] ?? [
    "bg-slate-100",
    "text-slate-600",
    Clock,
  ];
  const pad =
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${bg} ${text} ${pad}`}
    >
      <Icon size={size === "sm" ? 11 : 13} />
      {status}
    </span>
  );
};

const TOAST_STYLES = {
  success: [
    "bg-emerald-50",
    "border-emerald-200",
    "text-emerald-700",
    CheckCircle2,
  ],
  error: ["bg-rose-50", "border-rose-200", "text-rose-700", AlertTriangle],
  info: ["bg-blue-50", "border-blue-200", "text-blue-700", Sparkles],
};

const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-5 right-5 z-[10050] flex flex-col gap-2.5 w-[calc(100%-2.5rem)] sm:w-80">
    {toasts.map((t) => {
      const [bg, border, text, Icon] =
        TOAST_STYLES[t.type] ?? TOAST_STYLES.info;
      return (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-2xl border ${bg} ${border} px-4 py-3 shadow-lg animate-[fadeIn_0.2s_ease-out]`}
        >
          <Icon size={18} className={`${text} flex-shrink-0 mt-0.5`} />
          <p className={`text-sm font-semibold ${text} flex-1`}>{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className={`${text} opacity-60 hover:opacity-100 transition`}
          >
            <X size={15} />
          </button>
        </div>
      );
    })}
  </div>
);

const LoadingScreen = () => (
  <div className="col-span-12 flex flex-row items-center justify-center gap-3 w-full h-[50vh] text-slate-500">
    <svg
      className="animate-spin h-6 w-6 text-[#223F74]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span className="font-semibold text-lg text-[#6B7280] whitespace-nowrap">
      Loading fee details...
    </span>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
    <AlertTriangle size={40} className="text-gray-200" />
    <p className="text-sm font-bold text-[#6B7280]">{message}</p>
  </div>
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN COMPONENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ParentPayFee() {
  // Fetch IDs dynamically from local storage
  const SCHOOL_ID = localStorage.getItem("schoolId") || "";
  const STUDENT_ID = localStorage.getItem("studentId") || "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [student, setStudent] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [offers, setOffers] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);

  // Payment State
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [payOption, setPayOption] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [submitting, setSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const toastTimers = useRef({});

  const nextUnpaidInstallment = useMemo(() => {
    // Sort all installments by dueDate ascending to process chronologically
    const sorted = [...installments].sort(
      (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
    );

    // First priority: any overdue or partially-paid slot
    const overdue = sorted.find(
      (inst) =>
        inst.pendingAmount > 0 &&
        (inst.status?.toLowerCase() === "overdue" ||
          inst.status?.toLowerCase() === "partially paid"),
    );
    if (overdue) return overdue;

    // Second priority: first slot that has pending amount (active dues)
    const pendingDue = sorted.find((inst) => inst.pendingAmount > 0);
    if (pendingDue) return pendingDue;

    // All current dues cleared — offer the first future/advance installment
    // (these are fully unpaid terms with a future due date)
    const today = new Date();
    const advanceTerm = sorted.find(
      (inst) =>
        inst.status?.toLowerCase() !== "paid" &&
        inst.dueDate &&
        new Date(inst.dueDate) > today,
    );
    return advanceTerm || null;
  }, [installments]);

  const showToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete toastTimers.current[id];
    }, 3200);
  }, []);
  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  useEffect(
    () => () => Object.values(toastTimers.current).forEach(clearTimeout),
    [],
  );

  // â”€â”€ 1. Load Data mapping to Mongoose Controller â”€â”€
  const loadData = useCallback(async () => {
    if (!SCHOOL_ID || !STUDENT_ID) {
      setLoadError("Missing school or student context. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const queryParams = `?school_id=${SCHOOL_ID}&student_id=${STUDENT_ID}`;

      const [statusRes, instRes, histRes, offersRes] = await Promise.all([
        api.get(`/parent/fees/status${queryParams}`).then((r) => r.data),
        api.get(`/parent/fees/instalments${queryParams}`).then((r) => r.data),
        api.get(`/parent/fees/payment-history${queryParams}`).then((r) => r.data),
        api.get(`/parent/fees/offers${queryParams}`).then((r) => r.data),
      ]);

      // Map Status
      if (statusRes.success && statusRes.data) {
        const studentObj = statusRes.data.students
          ? statusRes.data.students[0]
          : statusRes.data;
        if (studentObj) {
          setStudent({
            id: studentObj.studentId,
            name: studentObj.studentName,
            admissionNo: studentObj.admissionNo,
            classSection: `${studentObj.class} - ${studentObj.section}`,
            session: studentObj.feeData?.sess || "Current Session",
            totalAnnualFee: studentObj.feeData?.net || 0,
            totalPaid: studentObj.feeData?.tPaid || 0,
            pendingAmount: studentObj.feeData?.bal || 0,
            status: studentObj.feeData?.bal > 0 ? "Pending" : "Paid",
            dueDate:
              studentObj.instalments?.find((i) => i.status !== "Paid")
                ?.dueDate || null,
          });
        }
      }

      // Map Installments
      if (instRes.success && instRes.data?.instalments) {
        const mappedInst = instRes.data.instalments.map((inst) => ({
          id: inst.id,
          name: inst.month,
          dueDate: inst.fullDueDate,
          totalAmount: inst.amount,
          paidAmount: inst.amountPaid || 0,
          pendingAmount: inst.remainingBase ?? (inst.isPaid ? 0 : inst.amount),
          status: inst.status,
          minPartialAmount: 50,
          lateFee: inst.penalty || 0,
          paidOn: inst.paidOn || null,
          paymentRefId: inst.paymentRefId ? String(inst.paymentRefId) : null,
        }));
        setInstallments(mappedInst);
      }

      // Map Payment History
      if (histRes.success && histRes.data?.receipts) {
        const mappedHist = histRes.data.receipts.map((rec) => ({
          id: rec.id,
          receiptNo: rec.receiptNumber,
          date: rec.paymentDate,
          installment: rec.description,
          amountPaid: rec.amount,
          mode: rec.mode,
          status: rec.status,
          txnId: rec.transactionId,
        }));
        setPaymentHistory(mappedHist);
      }

      // Map Offers
      if (offersRes.success && offersRes.data) {
        const mappedOffers = [];
        if (offersRes.data.earlyPaymentOffer) {
          mappedOffers.push({
            id: "early_pay",
            type: "Early Payment Discount",
            reason: offersRes.data.earlyPaymentOffer.message,
            amount: `₹${offersRes.data.earlyPaymentOffer.discount} Off`,
            validity: `Until ${new Date(offersRes.data.earlyPaymentOffer.validUntil).toLocaleDateString("en-IN")}`,
            color: T.emerald,
          });
        }
        if (offersRes.data.overdueInfo) {
          mappedOffers.push({
            id: "overdue_pen",
            type: "Late Fee Penalty",
            reason: offersRes.data.overdueInfo.message,
            amount: `+₹${offersRes.data.overdueInfo.penalty}`,
            validity: `${offersRes.data.overdueInfo.daysLate} days late`,
            color: T.rose,
          });
        }
        setOffers(mappedOffers);
      }
    } catch (err) {
      setLoadError("Failed to load details from the server.");
    } finally {
      setLoading(false);
    }
  }, [SCHOOL_ID, STUDENT_ID]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openPaymentPanel = (installment) => {
    setPayingInstallment(installment);
    setPayOption("full");
    setCustomAmount("");
    setAmountError("");
    setPaymentMethod("upi");
    openModal("pay-fee-modal");
  };

  const closePaymentPanel = () => {
    closeModal("pay-fee-modal");
    setTimeout(() => {
      setPayingInstallment(null);
      setCustomAmount("");
      setAmountError("");
    }, 300);
  };

  const payAmount = useMemo(() => {
    if (!payingInstallment) return 0;
    if (payOption === "full")
      return payingInstallment.pendingAmount + payingInstallment.lateFee;
    const n = Number(customAmount);
    return Number.isFinite(n) ? n : 0;
  }, [payOption, customAmount, payingInstallment]);

  const validateAmount = () => {
    if (!payingInstallment) return false;
    if (payOption === "full") return true;
    const n = Number(customAmount);
    if (!customAmount || Number.isNaN(n) || n <= 0) {
      setAmountError("Amount cannot be zero.");
      return false;
    }
    const maxPayable =
      payingInstallment.pendingAmount + payingInstallment.lateFee;
    if (n > maxPayable) {
      setAmountError(
        `Amount cannot exceed pending amount (${formatINR(maxPayable)}).`,
      );
      return false;
    }
    if (n < payingInstallment.minPartialAmount && n !== maxPayable) {
      setAmountError(
        `Minimum partial payment is ${formatINR(payingInstallment.minPartialAmount)}.`,
      );
      return false;
    }
    setAmountError("");
    return true;
  };

  // â”€â”€ 2. Integrated Razorpay Checkout Flow â”€â”€
  const handleConfirmPayment = async () => {
    if (!validateAmount()) {
      showToast("error", "Invalid Amount.");
      return;
    }

    setSubmitting(true);
    const res = await loadRazorpayScript();
    if (!res) {
      showToast("error", "Razorpay SDK failed to load. Are you online?");
      setSubmitting(false);
      return;
    }

    try {
      // Create Order
      const orderRes = await api.post("/parent/fees/create-order", {
        school_id: SCHOOL_ID,
        student_id: student.id,
        amount: payAmount - payingInstallment.lateFee, // Base amount
        instalmentId: payingInstallment.id,
      });
      const orderData = orderRes.data;

      if (!orderData.success) {
        throw new Error("Could not create payment order.");
      }

      const options = {
        key: orderData.data.keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: "School ERP",
        description: `Fee Payment - ${payingInstallment.name}`,
        order_id: orderData.data.orderId,
        handler: async function (response) {
          // Verify Signature
          try {
            const verifyRes = await api.post("/parent/fees/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              school_id: SCHOOL_ID,
              student_id: student.id,
              amount: orderData.data.baseAmount,
              lateFee: orderData.data.lateFee,
              instalmentId: payingInstallment.id,
            });
            const verifyData = verifyRes.data;

            if (verifyData.success) {
              showToast("success", "Payment Successful!");
              closePaymentPanel();
              loadData(); // Refresh UI State entirely from DB
            } else {
              showToast("error", "Payment verification failed.");
            }
          } catch (err) {
            showToast("error", "Error verifying payment.");
          }
        },
        prefill: {
          name: student?.name || "Parent",
          email: "parent@example.com",
          contact: "9999999999",
        },
        theme: {
          color: T.navy,
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      showToast("error", err.message || "Payment initialization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAndOpenReceipt = async (receiptId) => {
    if (!receiptId) {
      showToast("error", "Receipt ID is missing.");
      return;
    }
    try {
      const res = await api.get(`/parent/fees/receipt/${receiptId}`);
      const data = res.data;
      if (data.success) {
        setSelectedReceipt(data.data);
        openModal("receipt-modal");
      } else {
        showToast("error", data.message || "Could not fetch receipt details.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "Receipt not found on server."
          : err?.response?.status === 403
            ? "You are not authorized to view this receipt."
            : "Failed to load receipt. Please try again.");
      showToast("error", msg);
      console.error("Receipt fetch error:", err?.response?.status, err?.response?.data);
    }
  };

  const handlePrint = () => {
    showToast("info", "Print Started.");
    setTimeout(() => window.print(), 300);
  };

  const historyColumns = [
    { key: "receiptNo", label: "Receipt No." },
    { key: "date", label: "Date", render: (v) => formatDate(v) },
    { key: "installment", label: "Description" },
    { key: "amountPaid", label: "Amount Paid", render: (v) => formatINR(v) },
    { key: "mode", label: "Mode" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <span
          className={v === "Success" ? "text-emerald-600 font-semibold" : ""}
        >
          {v}
        </span>
      ),
    },
  ];

  const historyActions = [
    {
      icon: <Eye size={14} />,
      label: "View Receipt",
      variant: "primary",
      onClick: (row) => fetchAndOpenReceipt(row.id),
    },
  ];

  if (loading) {
    return (
      <Grid cols={12} gap={4}>
        <Heading primaryText="Pay " secondaryText="Fee" size={12} />
        <LoadingScreen />
      </Grid>
    );
  }

  if (loadError || !student) {
    return (
      <Grid cols={12} gap={4}>
        <Heading primaryText="Pay " secondaryText="Fee" size={12} />
        <div className="col-span-12 flex w-full items-center justify-center min-h-[50vh]">
          <EmptyState message={loadError || "No fee details available yet"} />
        </div>
      </Grid>
    );
  }



  return (
    <Grid cols={12} gap={4}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:translateY(0);} }
        @media print { 
          body * { visibility: hidden; } 
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; } 
          #receipt-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; } 
          .fixed, .relative, .overflow-y-auto, .overflow-hidden {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <Heading primaryText="Pay " secondaryText="Fee" size={12} />

      {/* â”€â”€ 1. Student Fee Summary â”€â”€ */}
      <div className="col-span-12 rounded-[24px] bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <ModalProfile
            name={student.name}
            subtitle={`Admission No: ${student.admissionNo} · ${student.classSection}`}
            meta={`Academic Session: ${student.session}`}
          />
          <div className="flex flex-col items-start lg:items-end gap-1.5">
            <StatusBadge status={student.status} />
            <p className="text-xs font-semibold text-[#6B7280] flex items-center gap-1.5">
              <CalendarDays size={13} /> Next Due Date:{" "}
              <span className="text-[#223F74] font-bold">
                {formatDate(student.dueDate)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DashCard
            title="Total Annual Fee"
            value={formatINR(student.totalAnnualFee)}
            icon={<IndianRupee size={20} />}
            accentColor={T.navy}
            size={2}
          />
          <DashCard
            title="Total Paid"
            value={formatINR(student.totalPaid)}
            icon={<CheckCircle2 size={20} />}
            accentColor={T.emerald}
            size={2}
          />
          <DashCard
            title="Balance Due"
            value={formatINR(student.pendingAmount)}
            icon={<Clock size={20} />}
            accentColor={T.amber}
            size={2}
          />
          <DashCard
            title="Fee Status"
            value={student.status}
            icon={<AlertTriangle size={20} />}
            accentColor={student.status === "Paid" ? T.emerald : T.rose}
            size={2}
          />
        </div>
      </div>

      {/* ── Quick Pay Next Installment Card ── */}
      {nextUnpaidInstallment && (
        <div className="col-span-12 rounded-[24px] bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100/80 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-[#223F74] text-lg">
                  {student.pendingAmount === 0
                    ? `Advance Pay: ${nextUnpaidInstallment.name}`
                    : `Next Installment: ${nextUnpaidInstallment.name}`}
                </h3>
                <StatusBadge status={nextUnpaidInstallment.status} size="sm" />
                {student.pendingAmount === 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-[#223F74] text-white px-2.5 py-1 rounded-full">
                    Advance Payment
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[#6B7280] mt-1 flex items-center gap-1.5">
                <CalendarDays size={13} /> Due Date: {formatDate(nextUnpaidInstallment.dueDate)}
                {student.pendingAmount === 0 ? (
                  <span className="text-[#223F74] font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                    All dues cleared — paying in advance
                  </span>
                ) : (
                  new Date(nextUnpaidInstallment.dueDate) > new Date() && (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Pay Early Discount Available</span>
                  )
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-blue-100 pt-4 sm:pt-0">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {student.pendingAmount === 0 ? "Advance Amount" : "Total Payable"}
              </p>
              <p className="text-2xl font-black text-[#223F74]">
                {formatINR(nextUnpaidInstallment.pendingAmount + nextUnpaidInstallment.lateFee)}
              </p>
            </div>
            <Button
              text={student.pendingAmount === 0 ? "Pay Advance" : "Quick Pay Now"}
              variant="primary"
              size={12}
              onClick={() => openPaymentPanel(nextUnpaidInstallment)}
            />
          </div>
        </div>
      )}

      {/* â”€â”€ 2. Installments Grid â”€â”€ */}
      <div className="col-span-12 rounded-[24px] bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col gap-4">
        <HeadingForDataTable
          primaryText="Installments"
          secondaryText="All terms"
          size={12}
        />
        {installments.length === 0 ? (
          <EmptyState message="No installments found" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {installments.map((inst) => (
              <div
                key={inst.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-3 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[#223F74] text-sm leading-snug">
                    {inst.name}
                  </p>
                  <StatusBadge status={inst.status} size="sm" />
                </div>
                <p className="text-xs font-semibold text-[#6B7280] flex items-center gap-1.5">
                  <CalendarDays size={12} /> Due {formatDate(inst.dueDate)}
                </p>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#6B7280] font-semibold">
                    Total Base
                  </span>
                  <span className="font-bold text-[#1D1D1F]">
                    {formatINR(inst.totalAmount)}
                  </span>
                </div>
                {inst.lateFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#D66B5F] font-semibold">
                      Late Fee
                    </span>
                    <span className="font-bold text-[#D66B5F]">
                      +{formatINR(inst.lateFee)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280] font-semibold">Pending</span>
                  <span className="font-bold text-[#D66B5F]">
                    {formatINR(inst.pendingAmount + inst.lateFee)}
                  </span>
                </div>

                {inst.status === "Paid" || inst.pendingAmount <= 0 ? (
                  <div className="flex flex-col gap-2">
                    {inst.paidOn && (
                      <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Paid on {formatDate(inst.paidOn)}
                      </p>
                    )}
                    <Button
                      text="Paid ✓"
                      variant="secondary"
                      size={12}
                      disabled
                    />
                  </div>
                ) : (
                  <Button
                    text="Pay Now"
                    variant="primary"
                    size={12}
                    onClick={() => openPaymentPanel(inst)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ 3. Offers & Discounts â”€â”€ */}
      {offers.length > 0 && (
        <div className="col-span-12 rounded-[24px] bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col gap-4">
          <HeadingForDataTable
            primaryText="Offers"
            secondaryText="& Alerts"
            size={12}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {offers.map((o) => {
              const Icon = OFFER_ICONS[o.type] ?? Tag;
              const color = o.color ?? T.blue;
              return (
                <div
                  key={o.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F4F7FB] p-4 flex flex-col gap-2.5"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}1A`, color }}
                  >
                    <Icon size={18} />
                  </div>
                  <p className="font-bold text-[#223F74] text-sm">{o.type}</p>
                  <p className="text-xs text-[#6B7280] font-medium leading-relaxed">
                    {o.reason}
                  </p>
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color }}
                  >
                    <Tag size={12} /> {o.amount}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] font-semibold">
                    {o.validity}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* â”€â”€ 4. Payment History â”€â”€ */}
      <DataTable
        title="Payment History"
        columns={historyColumns}
        rows={paymentHistory}
        actions={historyActions}
        size={12}
        pageSize={5}
        searchable={true}
        emptyMessage="No payments made yet"
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* â”€â”€ Payment Panel Modal â”€â”€ */}
      <Modal
        id="pay-fee-modal"
        title={
          payingInstallment ? `Pay — ${payingInstallment.name}` : "Pay Fee"
        }
        size="lg"
        onClose={closePaymentPanel}
      >
        {payingInstallment && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-2xl bg-[#F4F7FB] border border-[#E2E8F0] px-4 py-3">
              <span className="text-sm font-bold text-[#6B7280]">
                Total Payable
              </span>
              <span className="text-xl font-black text-[#D66B5F]">
                {formatINR(
                  payingInstallment.pendingAmount + payingInstallment.lateFee,
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPayOption("full");
                  setAmountError("");
                }}
                className={`rounded-2xl border-2 px-4 py-3.5 text-left transition ${payOption === "full" ? "border-[#223F74] bg-[#F4F7FB]" : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"}`}
              >
                <p className="text-sm font-bold text-[#223F74]">
                  Pay Full Amount
                </p>
                <p className="text-xs text-[#6B7280] font-semibold mt-0.5">
                  {formatINR(
                    payingInstallment.pendingAmount + payingInstallment.lateFee,
                  )}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayOption("partial");
                  setAmountError("");
                }}
                className={`rounded-2xl border-2 px-4 py-3.5 text-left transition ${payOption === "partial" ? "border-[#223F74] bg-[#F4F7FB]" : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"}`}
              >
                <p className="text-sm font-bold text-[#223F74]">
                  Pay Partial Amount
                </p>
                <p className="text-xs text-[#6B7280] font-semibold mt-0.5">
                  Enter custom amount
                </p>
              </button>
            </div>

            {payOption === "partial" && (
              <div className="flex flex-col gap-2">
                <DataField
                  label="Custom Amount (includes late fee)"
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  icon={IndianRupee}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmountError("");
                  }}
                  error={amountError}
                  size={12}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2">
                Summary
              </p>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-white">
                      <td className="py-2.5 px-4 font-semibold text-[#1D1D1F]">
                        Base Pending
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#1D1D1F]">
                        {formatINR(payingInstallment.pendingAmount)}
                      </td>
                    </tr>
                    {payingInstallment.lateFee > 0 && (
                      <tr className="bg-[#FAFAF9]">
                        <td className="py-2.5 px-4 font-semibold text-[#D66B5F]">
                          Late Fee Penalty
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-[#D66B5F]">
                          {formatINR(payingInstallment.lateFee)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 rounded-2xl border border-[#E2E8F0] bg-[#F4F7FB] px-4 py-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-base pt-1">
                  <span className="font-black text-[#223F74]">
                    You are Paying
                  </span>
                  <span className="font-black text-emerald-600">
                    {formatINR(payAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                text="Cancel"
                variant="ghost"
                size={4}
                onClick={closePaymentPanel}
              />
              <Button
                text="Confirm via Razorpay"
                variant="primary"
                size={8}
                loading={submitting}
                onClick={handleConfirmPayment}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* â”€â”€ Receipt Modal â”€â”€ */}
      <Modal id="receipt-modal" title="Payment Receipt" size="md">
        {selectedReceipt && (
          <div className="flex flex-col gap-4" id="receipt-print-area">
            <div className="text-center border-b border-dashed border-[#E2E8F0] pb-4">
              <p className="text-lg font-black text-[#223F74]">
                {selectedReceipt.schoolName}
              </p>
              <p className="text-xs text-[#6B7280] font-semibold">
                {selectedReceipt.schoolAddress} • {selectedReceipt.schoolPhone}
              </p>
            </div>

            <ModalGrid title="Receipt Info" cols={2}>
              <ModalData
                label="Receipt Number"
                value={selectedReceipt.receiptNumber}
              />
              <ModalData
                label="Payment Date"
                value={formatDate(selectedReceipt.receiptDate)}
              />
              <ModalData
                label="Payment Mode"
                value={selectedReceipt.paymentMode}
              />
              <ModalData
                label="Transaction ID"
                value={selectedReceipt.transactionId}
              />
            </ModalGrid>

            <ModalGrid title="Student Details" cols={2}>
              <ModalData
                label="Student Name"
                value={selectedReceipt.studentName}
              />
              <ModalData
                label="Admission No."
                value={selectedReceipt.admissionNo}
              />
              <ModalData
                label="Class & Section"
                value={`${selectedReceipt.class} - ${selectedReceipt.section}`}
              />
              <ModalData
                label="Academic Year"
                value={selectedReceipt.academicYear}
              />
            </ModalGrid>

            <div className="rounded-2xl bg-[#F4F7FB] border border-[#E2E8F0] px-4 py-3 flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[#6B7280]">
                  Base Amount Paid
                </span>
                <span className="font-bold text-[#1D1D1F]">
                  {formatINR(selectedReceipt.amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[#6B7280]">
                  Late Fee Paid
                </span>
                <span className="font-bold text-[#D66B5F]">
                  {formatINR(selectedReceipt.lateFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-[#E2E8F0] mt-1">
                <span className="font-black text-[#223F74]">
                  Total Collected
                </span>
                <span className="font-black text-emerald-600 text-lg">
                  {formatINR(selectedReceipt.totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-semibold pt-1">
                Amount in Words: {amountToWords(selectedReceipt.totalAmount)}
              </p>
            </div>

            <div className="flex gap-3 pt-3 print:hidden">
              <Button
                text="Print"
                variant="secondary"
                size={4}
                icon={<Printer size={14} />}
                onClick={handlePrint}
              />
              <Button
                text="Close"
                variant="primary"
                size={8}
                onClick={() => closeModal("receipt-modal")}
              />
            </div>
          </div>
        )}
      </Modal>
    </Grid>
  );
}
