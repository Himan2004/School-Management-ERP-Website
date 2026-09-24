import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CalendarRange,
  Check,
  Clock,
  History,
  LoaderCircle,
  ReceiptText,
  Wallet,
  X,
  Printer,
  Download,
  PieChart,
  Tag,
} from "lucide-react";

// ðŸŒŸ IMPORT COMMON COMPONENTS
import {
  Heading,
  DashGrid,
  DataTable,
  Select,
  Option,
  PanelModal,
  Button,
} from "../../components/shared/Common_Components";

export default function ParentFeeStatus() {
  const [feeData, setFeeData] = useState(null);
  const [instalments, setInstalments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [student, setStudent] = useState(null);
  const [schoolId, setSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState("");
  const [error, setError] = useState("");

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Period Filter States
  const [filterType, setFilterType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState("q1");
  const [selectedHalfYear, setSelectedHalfYear] = useState("h1");

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const getConnectionContext = (override = {}) => {
    const resolvedSchoolId =
      override.schoolId || schoolId || localStorage.getItem("schoolId");
    const resolvedStudentId =
      override.studentId || studentId || localStorage.getItem("studentId");

    if (resolvedSchoolId && resolvedSchoolId !== schoolId)
      setSchoolId(resolvedSchoolId);
    if (resolvedStudentId && resolvedStudentId !== studentId)
      setStudentId(resolvedStudentId);

    return { schoolId: resolvedSchoolId, studentId: resolvedStudentId };
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-50 text-emerald-600";
      case "partially_paid":
        return "bg-purple-50 text-purple-600";
      case "due soon":
        return "bg-amber-50 text-amber-600";
      case "overdue":
        return "bg-rose-50 text-rose-600";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return <Check className="w-4 h-4" />;
      case "partially_paid":
        return <PieChart className="w-4 h-4" />;
      case "due soon":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getProgressLineColor = (status) => {
    const s = status?.toLowerCase();
    if (s === "paid") return "bg-blue-600";
    if (s === "partially_paid") return "bg-purple-400";
    if (s === "overdue" || s === "due soon") return "bg-amber-500";
    return "bg-slate-200";
  };

  const getCircleColor = (status) => {
    const s = status?.toLowerCase();
    if (s === "paid") return "bg-blue-600 border-blue-600";
    if (s === "partially_paid") return "bg-purple-500 border-purple-500";
    if (s === "due soon") return "bg-amber-500 border-amber-500";
    if (s === "overdue") return "bg-rose-500 border-rose-500";
    return "bg-slate-200 border-slate-200";
  };

  const normalizeStudentPayload = (data) => {
    const node = data?.students?.[0] || data;
    if (!node || !node.studentId)
      return { student: null, summary: null, instalments: [] };

    return {
      studentId: node.studentId,
      student: {
        name: node.studentName || node.student?.name,
        class: node.class || node.student?.class,
        section: node.section || node.student?.section,
        admissionNo: node.admissionNo || node.student?.admissionNo,
      },
      summary: node.feeData || node.summary || null,
      instalments: node.instalments || [],
    };
  };

  const fetchFeeStatus = async (sId, stId) => {
    const res = await api.get("/parent/fees/status", {
      params: { school_id: sId, student_id: stId },
    });
    if (!res.data?.success)
      throw new Error(res.data?.message || "Unable to load fee status");
    return normalizeStudentPayload(res.data.data);
  };

  const fetchPaymentHistory = async (sId, stId) => {
    const res = await api.get("/parent/fees/payment-history", {
      params: { school_id: sId, student_id: stId, page: 1, limit: 10 },
    });
    if (!res.data?.success)
      throw new Error(res.data?.message || "Unable to load payment history");
    return res.data.data?.receipts || [];
  };

  const refreshData = async (override = {}) => {
    const { schoolId: activeSchoolId, studentId: activeStudentId } =
      getConnectionContext(override);

    if (!activeSchoolId) {
      setError("School information is missing. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const statusData = await fetchFeeStatus(activeSchoolId, activeStudentId);
      const resolvedStudentId = activeStudentId || statusData?.studentId || "";

      if (!resolvedStudentId)
        throw new Error("Unable to resolve student information");

      const receiptData = await fetchPaymentHistory(
        activeSchoolId,
        resolvedStudentId,
      );

      setSchoolId(activeSchoolId);
      setStudentId(resolvedStudentId);
      localStorage.setItem("schoolId", activeSchoolId);
      localStorage.setItem("studentId", resolvedStudentId);

      setStudent(statusData.student);
      setFeeData(statusData.summary);
      setInstalments(statusData.instalments);
      setReceipts(receiptData);
    } catch (err) {
      console.error("Error loading fee status", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load fee status",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sId = localStorage.getItem("schoolId");
    const stId = localStorage.getItem("studentId");
    refreshData({ schoolId: sId, studentId: stId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];

    return receipts.filter((receipt) => {
      if (!receipt.paymentDate) return true;
      const date = new Date(receipt.paymentDate);
      const month = date.getMonth();

      if (filterType === "all") return true;
      if (filterType === "monthly") return month === Number(selectedMonth);
      if (filterType === "quarterly") {
        if (selectedQuarter === "q1") return month >= 3 && month <= 5;
        if (selectedQuarter === "q2") return month >= 6 && month <= 8;
        if (selectedQuarter === "q3") return month >= 9 && month <= 11;
        if (selectedQuarter === "q4") return month >= 0 && month <= 2;
      }
      if (filterType === "half_yearly") {
        if (selectedHalfYear === "h1") return month >= 3 && month <= 8;
        if (selectedHalfYear === "h2")
          return (month >= 9 && month <= 11) || (month >= 0 && month <= 2);
      }
      if (filterType === "annually") {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const endYear = startYear + 1;
        const startDate = new Date(startYear, 3, 1);
        const endDate = new Date(endYear, 2, 31, 23, 59, 59);
        return date >= startDate && date <= endDate;
      }
      return true;
    });
  }, [receipts, filterType, selectedMonth, selectedQuarter, selectedHalfYear]);

  // â”€â”€â”€ Export Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(42, 70, 90);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const schoolTitle = selectedReceipt?.schoolName || "School Ledger";
      doc.text(schoolTitle, 14, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(230, 230, 230);
      doc.text("OFFICIAL FEE LEDGER & STATEMENT", 14, 34);

      doc.setFontSize(8);
      const todayStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      doc.text(`Generated on: ${todayStr}`, 145, 20);
      const rangeText =
        filterType === "all"
          ? "All Time"
          : filterType === "monthly"
            ? `Month: ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][selectedMonth]}`
            : filterType === "quarterly"
              ? `Quarter: ${selectedQuarter.toUpperCase()}`
              : filterType === "half_yearly"
                ? `Half-Yearly: ${selectedHalfYear.toUpperCase()}`
                : "Annual (Current Academic Year)";
      doc.text(`Period: ${rangeText}`, 145, 27);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Student & Academic Details", 14, 54);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 57, 196, 57);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Name: ${student?.name || "N/A"}`, 14, 65);
      doc.text(
        `Class & Section: ${student?.class ? `Class ${student.class} - ${student.section || "N/A"}` : "N/A"}`,
        14,
        72,
      );
      doc.text(`Admission No: ${student?.admissionNo || "N/A"}`, 14, 79);

      doc.setFont("helvetica", "bold");
      doc.text("Ledger Summary:", 115, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Academic Fee: Rs. ${netFee.toLocaleString()}`, 115, 72);
      doc.text(`Total Amount Paid: Rs. ${totalPaid.toLocaleString()}`, 115, 79);
      doc.text(`Balance Pending: Rs. ${balanceDue.toLocaleString()}`, 115, 86);

      const tableHeaders = [
        [
          "Receipt Number",
          "Date",
          "Amount",
          "Mode",
          "Transaction ID",
          "Status",
        ],
      ];
      const tableRows = filteredReceipts.map((r) => [
        r.receiptNumber || r.id,
        r.date,
        `Rs. ${Number(r.amount).toLocaleString()}`,
        r.mode,
        r.transactionId || "N/A",
        r.status,
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 94,
        theme: "striped",
        headStyles: {
          fillColor: [42, 70, 90],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "left",
        },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 10, left: 14, right: 14 },
      });

      const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 150) + 15;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text(
        "This is an electronically generated statement and does not require a physical signature.",
        14,
        finalY,
      );

      doc.save(
        `fee_statement_${student?.name || "student"}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch (err) {
      console.error("PDF Export failed", err);
      setError("Failed to generate PDF statement.");
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredReceipts.map((r) => ({
        "Receipt Number": r.receiptNumber || r.id,
        Date: r.date,
        "Amount (INR)": r.amount,
        "Payment Mode": r.mode,
        "Transaction ID": r.transactionId || "N/A",
        Status: r.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const maxLens = {};
      exportData.forEach((row) => {
        Object.keys(row).forEach((key) => {
          const val = String(row[key] || "");
          maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
        wch: maxLens[key] + 3,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Payments");

      XLSX.writeFile(
        workbook,
        `fee_ledger_${student?.name || "student"}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Excel Export failed", err);
      setError("Failed to generate Excel ledger.");
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      const receiptId = receipt.id;
      const res = await api.get(`/parent/fees/receipt/${receiptId}`);
      if (res.data?.success) {
        setSelectedReceipt(res.data.data);
        setShowReceiptModal(true);
      } else {
        throw new Error(res.data?.message || "Failed to load receipt");
      }
    } catch (err) {
      console.error(
        "Failed to load receipt from backend, falling back to local object:",
        err,
      );
      setSelectedReceipt(receipt);
      setShowReceiptModal(true);
    }
  };

  const handlePrint = () => window.print();

  // â”€â”€â”€ Math & Payment Flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const nextPayableInstalment = useMemo(() => {
    return (
      instalments.find((inst) => inst.status?.toLowerCase() === "overdue") ||
      instalments.find(
        (inst) => inst.status?.toLowerCase() === "partially_paid",
      ) ||
      instalments.find((inst) => inst.status?.toLowerCase() === "due soon") ||
      instalments.find((inst) => inst.status?.toLowerCase() !== "paid") ||
      null
    );
  }, [instalments]);

  const grossFee = feeData?.gross || feeData?.totalFee || 0;
  const netFee = feeData?.net || feeData?.netAmount || grossFee;
  const totalPaid = feeData?.tPaid || feeData?.totalPaid || 0;
  const balanceDue =
    (feeData?.bal || feeData?.balanceDue) ?? Math.max(netFee - totalPaid, 0);
  const percentage =
    (feeData?.pct || feeData?.percentage) ??
    (netFee > 0 ? Math.round((totalPaid / netFee) * 100) : 0);
  const waiverInfo = feeData?.wv || feeData?.waiver || null;

  const startRazorpayFlow = async (instalment) => {
    const { schoolId: activeSchoolId, studentId: activeStudentId } =
      getConnectionContext();

    if (!activeSchoolId || !activeStudentId) {
      setError("Session missing. Please log in again.");
      return;
    }

    const amount = Number(
      instalment?.totalPayableNow ||
        (instalment?.remainingBase || instalment?.amount || 0) +
          Number(instalment?.penalty || 0),
    );

    if (!amount || amount <= 0) {
      setError("Invalid payment amount.");
      return;
    }

    setPayingId(instalment?.id || instalment?.month || "summary");
    setError("");

    try {
      const createRes = await api.post("/parent/fees/create-order", {
        school_id: activeSchoolId,
        student_id: activeStudentId,
        amount: instalment?.remainingBase || instalment?.amount || amount,
        instalmentId: instalment?.id,
      });

      if (!createRes.data?.success)
        throw new Error(
          createRes.data?.message || "Failed to create payment order",
        );

      const order = createRes.data.data;
      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay)
        throw new Error("Razorpay SDK failed to load");

      const razorpay = new window.Razorpay({
        key: razorpayKeyId || order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "School Fee Payment",
        description: instalment ? `Pay ${instalment.month}` : "Fee Payment",
        order_id: order.orderId,
        prefill: {
          name: student?.name || "",
          email: "",
          contact: "",
        },
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/parent/fees/verify-payment", {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              student_id: activeStudentId,
              school_id: activeSchoolId,
              amount: order.baseAmount || amount,
              lateFee: order.lateFee || instalment?.penalty || 0,
              instalmentId: instalment?.id,
            });

            if (!verifyRes.data?.success)
              throw new Error(
                verifyRes.data?.message || "Payment verification failed",
              );

            const d = verifyRes.data.data || {};
            setSelectedReceipt({
              id: d.receiptNumber || d.paymentId,
              date: d.paymentDate
                ? new Date(d.paymentDate).toLocaleDateString("en-IN")
                : new Date().toLocaleDateString("en-IN"),
              description: instalment
                ? `Fee Payment - ${instalment.month}`
                : "Fee Payment",
              amount: d.totalAmount || d.amountPaid || amount,
              mode: "Online",
              status: "Success",
              studentName: d.studentName || student?.name,
            });
            setShowReceiptModal(true);

            await refreshData({
              schoolId: activeSchoolId,
              studentId: activeStudentId,
            });
          } catch (err) {
            console.error("Verify payment failed", err);
            setError(
              err?.response?.data?.message ||
                err.message ||
                "Payment verification failed",
            );
          }
        },
      });

      razorpay.on("payment.failed", (response) => {
        setError(response?.error?.description || "Payment was not completed");
      });

      razorpay.open();
    } catch (err) {
      console.error("Payment flow error", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to start payment",
      );
    } finally {
      setPayingId("");
    }
  };

  // ————————————————————————————————————————————————————————————————————————————
  const receiptColumns = [
    {
      key: "id",
      label: "Receipt No",
      render: (val, row) => (
        <span className="font-mono font-semibold text-slate-600">
          {row.receiptNumber || row.id}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (val, row) => (
        <span className="text-slate-700 font-medium">
          {val ||
            (row.paymentDate
              ? new Date(row.paymentDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—")}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (val) => (
        <span className="font-black text-slate-800">
          ₹{Number(val || 0).toLocaleString()}
        </span>
      ),
    },
    { key: "mode", label: "Mode", align: "center" },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (val) => (
        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">
          {val}
        </span>
      ),
    },
  ];

  const receiptActions = [
    {
      icon: <ReceiptText size={16} />,
      tooltip: "View Receipt",
      variant: "primary",
      onClick: (row) => handleDownloadReceipt(row),
    },
  ];

  if (loading && !feeData) {
    return (
      <div className="col-span-12 flex flex-row items-center justify-center gap-3 w-full h-[50vh] text-slate-500">
        <LoaderCircle className="w-6 h-6 animate-spin text-[#223F74]" /> 
        <span className="font-semibold text-lg text-[#6B7280] whitespace-nowrap">Loading fee status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 font-sans relative">
      <style>{`
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
      {/* ========== CUSTOM HEADER ========== */}
      <div className="mb-8 bg-[#223F74] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 p-3 rounded-2xl ring-4 ring-white/10">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Fee Ledger</h1>
            <p className="text-sm font-medium text-blue-100 mt-1">Track your payment status and instalments</p>
          </div>
        </div>
        {student && (
          <div className="bg-white text-[#223F74] px-5 py-2.5 rounded-xl text-right relative z-10 shadow-md">
            <p className="text-sm font-black">
              {student.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">
              {student.class ? `Class ${student.class}` : ""}
              {student.section ? ` · Section ${student.section}` : ""}
            </p>
          </div>
        )}
      </div>
      {error && (
        <div className="mb-8 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}
      {/* ========== SUMMARY CARDS USING DASHGRID ========== */}
      <DashGrid cols={12} gap={6}>
        <div className="col-span-12 md:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">
            Total Academic Fee
          </p>
          <div className="flex items-end gap-3 mb-4">
            <h3 className="text-4xl font-black text-[#223F74]">
              ₹{netFee.toLocaleString()}
            </h3>
            {waiverInfo && (
              <span className="text-lg font-bold text-slate-400 line-through mb-1">
                ₹{grossFee.toLocaleString()}
              </span>
            )}
          </div>
          {waiverInfo ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Tag className="w-3 h-3" /> Waiver Applied (-₹
              {waiverInfo.dis || waiverInfo.discountApplied})
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#223F74] rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Session {feeData?.sess || feeData?.session || "2025-26"}
              </span>
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-6">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">
            Total Paid
          </p>
          <h3 className="text-4xl font-black text-emerald-500 mb-4">
            ₹{totalPaid.toLocaleString()}
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {percentage}% Collected
            </span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">
              Balance Pending
            </p>
            <h3 className="text-4xl font-black text-slate-800 mb-4">
              ₹{balanceDue.toLocaleString()}
            </h3>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="bg-[#223F74] h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => startRazorpayFlow(nextPayableInstalment)}
            disabled={!nextPayableInstalment || payingId !== ""}
            className="w-full bg-[#223F74] text-white font-bold rounded-2xl py-3 hover:bg-[#1a325c] shadow-lg shadow-blue-100/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {payingId === "summary" && (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            )}
            {nextPayableInstalment ? "Pay Next Due" : "All Clear! 🎉"}
          </button>
        </div>
      </DashGrid>
      <div className="h-10"></div> {/* Spacing */}
      {/* ========== INSTALMENT TIMELINE ========== */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all mb-10">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <CalendarRange className="w-5 h-5 text-[#223F74]" />
            <h2 className="text-xl font-bold text-slate-800">
              Instalment Plan
            </h2>
          </div>
          <p className="text-slate-400 text-sm">
            Detailed breakdown of dues and partial payments
          </p>
        </div>

        <div className="p-8">
          <div className="space-y-6">
            {instalments.length > 0 ? (
              instalments.map((inst, idx) => {
                const isPartiallyPaid =
                  inst.status?.toLowerCase() === "partially_paid";
                const isPaid = inst.status?.toLowerCase() === "paid";

                return (
                  <div key={inst.id || `${inst.month}-${idx}`}>
                    <div className="flex gap-6 items-start">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getCircleColor(inst.status)} text-white`}
                        >
                          {getStatusIcon(inst.status)}
                        </div>
                        {idx < instalments.length - 1 && (
                          <div
                            className={`w-1 h-24 ${getProgressLineColor(inst.status)} mt-2`}
                          ></div>
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-800 text-lg">
                              Instalment {idx + 1} - {inst.month}
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Base Amount
                                </p>
                                <p className="font-black text-slate-800">
                                  ₹
                                  {Number(
                                    inst.baseAmount || inst.amount || 0,
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Due Date
                                </p>
                                <p className="font-semibold text-slate-600">
                                  {formatDate(inst.dueDate || inst.fullDueDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Status
                                </p>
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-1 ${getStatusColor(inst.status)}`}
                                >
                                  {inst.status?.replace("_", " ")}
                                </span>
                              </div>

                              {(isPartiallyPaid || isPaid) && (
                                <>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                      Amount Paid
                                    </p>
                                    <p className="font-black text-emerald-600">
                                      ₹{Number(inst.amountPaid || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  {inst.paidOn && (
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Paid On
                                      </p>
                                      <p className="font-semibold text-[#223F74] font-bold">
                                        {formatDate(inst.paidOn)}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {inst.status?.toLowerCase() === "overdue" &&
                              inst.penalty > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mt-4 flex items-center justify-between">
                                  <p className="text-sm font-bold text-rose-700">
                                    ⚠️ Late Fee Applied (₹5 × {inst.penaltyDays || 0} days)
                                  </p>
                                  <p className="font-black text-rose-700">
                                    + ₹{inst.penalty}
                                  </p>
                                </div>
                              )}

                            {!isPaid && (
                              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Payable Now
                                  </p>
                                  <p className="text-xl font-black text-slate-800">
                                    ₹
                                    {Number(
                                      inst.totalPayableNow ||
                                        inst.remainingBase ||
                                        inst.amount,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startRazorpayFlow(inst)}
                                  disabled={
                                    payingId === (inst.id || inst.month)
                                  }
                                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#223F74] text-white font-bold rounded-xl hover:bg-[#1a325c] shadow-md shadow-blue-100/50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {payingId === (inst.id || inst.month) && (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                  )}
                                  Pay Balance
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400">
                No instalment plan available.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ========== PAYMENT HISTORY WITH DATATABLE ========== */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <Option value="all" label="All Time" />
              <Option value="monthly" label="Monthly" />
              <Option value="quarterly" label="Quarterly" />
              <Option value="half_yearly" label="Half-Yearly" />
              <Option value="annually" label="Annually" />
            </Select>

            {filterType === "monthly" && (
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((m, idx) => (
                  <Option key={m} value={idx} label={m} />
                ))}
              </Select>
            )}

            {filterType === "quarterly" && (
              <Select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
              >
                <Option value="q1" label="Q1 (Apr - Jun)" />
                <Option value="q2" label="Q2 (Jul - Sep)" />
                <Option value="q3" label="Q3 (Oct - Dec)" />
                <Option value="q4" label="Q4 (Jan - Mar)" />
              </Select>
            )}

            {filterType === "half_yearly" && (
              <Select
                value={selectedHalfYear}
                onChange={(e) => setSelectedHalfYear(e.target.value)}
              >
                <Option value="h1" label="H1 (Apr - Sep)" />
                <Option value="h2" label="H2 (Oct - Mar)" />
              </Select>
            )}
          </div>

          {filteredReceipts.length > 0 && (
            <div className="flex gap-2">
              <Button
                text="PDF"
                icon={<Download size={14} />}
                variant="secondary"
                onClick={handleExportPDF}
                size={3}
              />
              <Button
                text="Excel"
                icon={<Download size={14} />}
                variant="secondary"
                onClick={handleExportExcel}
                size={3}
              />
            </div>
          )}
        </div>

        <DataTable
          title="Payment History"
          columns={receiptColumns}
          rows={filteredReceipts}
          actions={receiptActions}
          searchable={true}
          size={12}
          pageSize={10}
        />
      </div>
      {/* ========== OFFICIAL RECEIPT MODAL USING PANELMODAL ========== */}
      <PanelModal
        id="receipt-modal"
        title="Official Fee Receipt"
        isVisible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        size="md"
      >
        {selectedReceipt && (
          <div className="print:bg-white space-y-6" id="receipt-print-area">
            <div className="text-center border-b border-slate-200 pb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-md">
                {(selectedReceipt.schoolName || "Delhi Public School").charAt(
                  0,
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-800">
                {selectedReceipt.schoolName || "Delhi Public School"}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {selectedReceipt.schoolAddress
                  ? `${selectedReceipt.schoolAddress}, `
                  : ""}
                {selectedReceipt.schoolCity
                  ? `${selectedReceipt.schoolCity}`
                  : ""}
                {selectedReceipt.schoolState
                  ? `, ${selectedReceipt.schoolState}`
                  : ""}
                {selectedReceipt.schoolPinCode
                  ? ` - ${selectedReceipt.schoolPinCode}`
                  : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Receipt No
                </p>
                <p className="font-mono font-bold text-slate-800">
                  {selectedReceipt.receiptNumber || selectedReceipt.id}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-1">
                  Student Name
                </p>
                <p className="font-black text-slate-800">
                  {selectedReceipt.studentName || student?.name || "Student"}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-1">
                  Class & Section
                </p>
                <p className="font-semibold text-slate-600">
                  {selectedReceipt.class
                    ? `Class ${selectedReceipt.class}`
                    : student?.class
                      ? `Class ${student.class}`
                      : "N/A"}
                  {selectedReceipt.section
                    ? ` - ${selectedReceipt.section}`
                    : student?.section
                      ? ` - ${student.section}`
                      : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Payment Date
                </p>
                <p className="font-semibold text-slate-800">
                  {selectedReceipt.receiptDate
                    ? new Date(selectedReceipt.receiptDate).toLocaleDateString(
                        "en-IN",
                        { month: "short", day: "numeric", year: "numeric" },
                      )
                    : selectedReceipt.paymentDate
                      ? new Date(selectedReceipt.paymentDate).toLocaleDateString(
                          "en-IN",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : selectedReceipt.date || "N/A"}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-1">
                  Payment Mode
                </p>
                <p className="font-semibold text-slate-800">
                  {selectedReceipt.paymentMode ||
                    selectedReceipt.mode ||
                    "Online"}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-1">
                  Transaction ID
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {selectedReceipt.transactionId || "N/A"}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500 font-black">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-500 font-black">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                      {selectedReceipt.description || "Fee Payment"}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-slate-800">
                      ₹{selectedReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-4 py-4 font-black text-blue-800">
                      Total Paid
                    </td>
                    <td className="px-4 py-4 text-right font-black text-blue-700 text-lg">
                      ₹{selectedReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm italic text-slate-500 text-center pb-4">
              Rupees {getAmountInWords(selectedReceipt.amount)}
            </p>

            <div className="flex gap-4 print:hidden border-t border-slate-100 pt-6">
              <Button
                text="Print Receipt"
                icon={<Printer size={16} />}
                variant="primary"
                onClick={handlePrint}
                size={6}
                className="w-full justify-center"
              />
              <Button
                text="Close"
                variant="secondary"
                onClick={() => setShowReceiptModal(false)}
                size={6}
                className="w-full justify-center"
              />
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
}

// Helper function to convert amount to words
function getAmountInWords(amount) {
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

  if (amount === 0) return "Zero Only";
  if (amount < 10) return ones[amount] + " Only";
  if (amount < 20) return teens[amount - 10] + " Only";
  if (amount < 100) {
    const ten = Math.floor(amount / 10);
    const one = amount % 10;
    return tens[ten] + (one ? " " + ones[one] : "") + " Only";
  }
  if (amount < 1000) {
    const hundred = Math.floor(amount / 100);
    const rest = amount % 100;
    return (
      ones[hundred] +
      " Hundred" +
      (rest ? " " + getAmountInWords(rest).replace(" Only", "") : " Only")
    );
  }
  if (amount < 100000) {
    const thousand = Math.floor(amount / 1000);
    const rest = amount % 1000;
    return (
      (ones[Math.floor(thousand / 10)]
        ? tens[Math.floor(thousand / 10)] + " "
        : "") +
      ones[thousand % 10] +
      " Thousand" +
      (rest ? " " + getAmountInWords(rest).replace(" Only", "") : " Only")
    );
  }
  return amount + " Only";
}
