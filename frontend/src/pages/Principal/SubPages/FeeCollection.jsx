import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Eye, DollarSign, Printer, X, Search, Filter,
  Calendar, Clock, CheckCircle, AlertCircle, CreditCard,
  Users, Download, RefreshCw, FileText, Receipt, Send,
  ChevronLeft, ChevronRight, Loader2,
  CalendarDays, CircleDollarSign, Banknote,
  Bell, AlertTriangle
} from "lucide-react";
import {
  collectPrincipalFeePayment,
  getPrincipalFeeCollections,
  getPrincipalFeePaymentHistory,
  sendPrincipalFeeReminder,
  sendPrincipalBulkReminder,
  getPrincipalFeeStatement 
} from "../../../services/api/principalFinanceApi";
import { getClasses } from "../../../services/api/principalStudentApi";
import {
  DataTable,
  Button,
  DataField,
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  PanelModal,
  openModal,
  SelectField,
  Select,
  Option,
} from "../../../components/shared/Common_Components";
import { toast } from 'react-hot-toast'; // Make sure this is imported
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Simple Avatar component
const UserAvatar = ({ name, size = 32, className = "" }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  };

  const getColor = (name) => {
    const colors = [
      "bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-emerald-500",
      "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-pink-500",
      "bg-cyan-500", "bg-orange-500", "bg-lime-600", "bg-sky-500",
      "bg-purple-500", "bg-fuchsia-500", "bg-red-500", "bg-green-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-bold ${getColor(name)} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  );
};

const FeeCollection = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [summary, setSummary] = useState({
    totalCollectedToday: 0,
    totalCollectedThisMonth: 0,
    totalPendingDues: 0,
    studentsWithDues: 0,
  });
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderStudent, setReminderStudent] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);

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

  const loadFilterOptions = async () => {
    try {
      const response = await getClasses();
      if (response?.success && response?.data) {
        const sortedClasses = (response.data.classes || []).map(c => c.name).sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, ''));
          const numB = parseInt(b.replace(/[^0-9]/g, ''));
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });
        setClassOptions(sortedClasses);
        setSectionOptions(response.data.sections || []);
        return true;
      }
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
    return false;
  };

  const loadCollectionData = async () => {
    if (!schoolId) {
      setPageLoading(false);
      setError("School ID not found. Please sign in again.");
      return;
    }

    setPageLoading(true);
    setError("");

    try {
      const response = await getPrincipalFeeCollections(schoolId);
      const payload = response?.data || {};

      const nextStudents = payload.students || [];
      setStudents(nextStudents);
      setFilteredStudents(nextStudents);
      setSummary(payload.summary || {
        totalCollectedToday: 0,
        totalCollectedThisMonth: 0,
        totalPendingDues: 0,
        studentsWithDues: 0,
      });

      // Try loading filter options from DB first
      const loadedFromDB = await loadFilterOptions();
      if (!loadedFromDB) {
        // Fallback: Extract unique classes and sections from the data
        const classes = new Set();
        const sections = new Set();

        nextStudents.forEach(student => {
          if (student.class) {
            const classVal = String(student.class);
            classes.add(classVal);
          }
          if (student.section) {
            sections.add(student.section);
          }
        });

        const sortedClasses = Array.from(classes).sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });

        setClassOptions(sortedClasses);
        setSectionOptions(Array.from(sections).sort());
      }

    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
        loadError.message ||
        "Failed to load fee collection data",
      );
    } finally {
      setPageLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadCollectionData();
  };

  useEffect(() => {
    if (schoolId) {
      handleRefresh();
    }
  }, [schoolId]);

  useEffect(() => {
    let filtered = [...students];

    if (classFilter) {
      filtered = filtered.filter((s) => String(s.class) === String(classFilter));
    }

    if (sectionFilter) {
      filtered = filtered.filter((s) => String(s.section) === String(sectionFilter));
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStudents(filtered);
  }, [classFilter, sectionFilter, statusFilter, students]);

  const availableSections = useMemo(() => {
    const secs = new Set();
    students.forEach(s => {
      if (!classFilter || String(s.class) === String(classFilter)) {
        if (s.section) secs.add(s.section);
      }
    });
    return Array.from(secs).sort();
  }, [classFilter, students]);

  const handleOpenHistory = async (student) => {
    setSelectedStudent(student);
    setShowHistoryDrawer(true);

    if (!schoolId || !student?.id) {
      setHistoryItems([]);
      return;
    }

    try {
      const response = await getPrincipalFeePaymentHistory(
        schoolId,
        student.id,
      );
      const historyData = response?.data || {};
      setHistoryItems(historyData.payments || []);
    } catch (historyError) {
      setHistoryItems([]);
      setError(
        historyError.response?.data?.message ||
        historyError.message ||
        "Failed to load payment history",
      );
    }
  };

  const handleCollectPayment = (student) => {
    setSelectedStudent(student);
    setPaymentAmount("");
    setPaymentMode("Cash");
    setTransactionId("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setRemarks("");
    setShowCollectModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    if (!schoolId) {
      alert("School ID not found");
      return;
    }

    const balanceDue = (selectedStudent.totalFee || 0) - (selectedStudent.amountPaid || 0);
    if (parseFloat(paymentAmount) > balanceDue) {
      alert(`Payment amount cannot exceed the outstanding balance of ${formatAmount(balanceDue)}`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await collectPrincipalFeePayment(schoolId, {
        studentId: selectedStudent.id,
        installmentId: selectedStudent.installmentId,
        amountPaid: Number(paymentAmount),
        paymentMode: paymentMode.toLowerCase(),
        paymentDate,
        transactionId,
        remarks,
      });

      alert(
        response?.message ||
        `Payment of ${formatAmount(paymentAmount)} collected for ${selectedStudent.name}`,
      );
      setShowCollectModal(false);
      await loadCollectionData();
      if (showHistoryDrawer) {
        await handleOpenHistory(selectedStudent);
      }
    } catch (payError) {
      alert(
        payError.response?.data?.message ||
        payError.message ||
        "Failed to collect payment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = (student) => {
    setReminderStudent(student);
    const balanceDue = (student.totalFee || 0) - (student.amountPaid || 0);
    setReminderMessage(`Dear Parent, this is a reminder for the pending fee payment of ${formatAmount(balanceDue)} for ${student.name} (${student.admissionNo}). Please clear the dues at the earliest.`);
    setShowReminderModal(true);
  };

  const handleConfirmReminder = async () => {
    if (!schoolId || !reminderStudent) return;

    setIsSendingReminder(true);
    try {
      const response = await sendPrincipalFeeReminder(schoolId, {
        studentId: reminderStudent.id,
        installmentId: reminderStudent.installmentId,
        amount: (reminderStudent.totalFee || 0) - (reminderStudent.amountPaid || 0),
        message: reminderMessage,
      });

      alert(response?.message || "Reminder sent successfully");
      setShowReminderModal(false);
    } catch (reminderError) {
      alert(
        reminderError.response?.data?.message ||
        reminderError.message ||
        "Failed to send reminder",
      );
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Table columns configuration - Removed Last Payment column
  const columns = [
    {
      key: "admissionNo",
      label: "Admission No",
      width: "130px",
    },
    {
      key: "name",
      label: "Student",
      width: "200px",
    },
    {
      key: "class",
      label: "Class",
      width: "100px",
    },
    {
      key: "section",
      label: "Section",
      width: "100px",
    },
    {
      key: "totalFeeFormatted",
      label: "Total Fee",
      width: "120px",
    },
    {
      key: "amountPaidFormatted",
      label: "Paid",
      width: "120px",
    },
    {
      key: "balanceDueFormatted",
      label: "Balance",
      width: "120px",
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
    },
  ];

  // Transform data for DataTable
  const tableRows = filteredStudents.map(student => ({
    id: student.id,
    admissionNo: student.admissionNo || 'N/A',
    name: student.name || 'Unknown',
    class: student.class || 'N/A',
    section: student.section || 'N/A',
    totalFee: student.totalFee || 0,
    amountPaid: student.amountPaid || 0,
    balanceDue: (student.totalFee || 0) - (student.amountPaid || 0),
    status: student.status || 'Pending',
    installmentId: student.installmentId,
    email: student.email || '',
    totalFeeFormatted: formatAmount(student.totalFee || 0),
    amountPaidFormatted: formatAmount(student.amountPaid || 0),
    balanceDueFormatted: formatAmount((student.totalFee || 0) - (student.amountPaid || 0)),
  }));

  // Actions for DataTable
  const actions = [
    {
      icon: <DollarSign size={14} />,
      tooltip: "Collect Payment",
      variant: "primary",
      onClick: (row) => handleCollectPayment(row),
      show: (row) => row.balanceDue > 0,
    },
    {
      icon: <Bell size={14} />,
      tooltip: "Send Reminder",
      variant: "warning",
      onClick: (row) => handleSendReminder(row),
      show: (row) => row.balanceDue > 0,
    },
    {
      icon: <Eye size={14} />,
      tooltip: "View",
      variant: "primary",
      onClick: (row) => handleOpenHistory(row),
    },
    {
      icon: <Printer size={14} />,
      tooltip: "Print Receipt",
      variant: "ghost",
      show: (row) => row.amountPaid > 0,
      onClick: async (row) => {
        try {
          const toastId = toast.loading("Fetching latest receipt...");
          // 1. Fetch history to get the actual paymentId
          const historyRes = await getPrincipalFeePaymentHistory(schoolId, row.id);
          const payments = historyRes?.data?.payments || [];
          
          if (payments.length === 0) {
             toast.error("No successful payments found to print.", { id: toastId });
             return;
          }
          
          // 2. Open the real backend URL using the latest payment ID
          const latestPaymentId = payments[0].id;
          const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api"; // Ensure this matches your env setup
          
          window.open(`${backendUrl}/principal/fees/receipt/${latestPaymentId}`, "_blank");
          toast.success("Receipt opened", { id: toastId });
        } catch (err) {
           toast.error("Failed to fetch receipt", { id: toastId });
        }
      },
    },
  ];

  // Stats for EnhancedDashCard
  const stats = [
    {
      title: "Today's Collection",
      value: formatAmount(summary.totalCollectedToday || 0),
      icon: <Clock size={22} />,
      accentColor: "#16a34a",
      size: 3,
    },
    {
      title: "Monthly Collection",
      value: formatAmount(summary.totalCollectedThisMonth || 0),
      icon: <Calendar size={22} />,
      accentColor: "#3b82f6",
      size: 3,
    },
    {
      title: "Pending Dues",
      value: formatAmount(summary.totalPendingDues || 0),
      icon: <AlertCircle size={22} />,
      accentColor: "#dc2626",
      size: 3,
    },
    {
      title: "Students with Dues",
      value: String(summary.studentsWithDues || 0),
      icon: <Users size={22} />,
      accentColor: "#f59e0b",
      size: 3,
    },
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <Grid cols={12} gap={4}>
          <Heading
            primaryText="Fee"
            secondaryText="Collection"
            size={12}
            showAnimations={true}
          />
        </Grid>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2 mx-6">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Cards - No extra container */}
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



      {/* Data Table with Refresh button - No extra container */}
      <div className="mt-6 px-6 pb-8">
        

        <DataTable
          title="Student fee records"
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[140px]">
                <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} searchable={false}>
                  <Option value="" label="All Classes" />
                  {classOptions.map((cls) => <Option key={cls} value={cls} label={cls} />)}
                </Select>
              </div>
              <div className="w-[140px]">
                <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} searchable={false}>
                  <Option value="" label="All Sections" />
                  {availableSections.map((sec, i) => (
                    <Option key={i} value={sec} label={sec} />
                  ))}
                </Select>
              </div>
              <div className="w-[140px]">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} searchable={false}>
                  <Option value="All" label="All Status" />
                  <Option value="Paid" label="Paid" />
                  <Option value="Partial" label="Partial" />
                  <Option value="Pending" label="Pending" />
                </Select>
              </div>
            </div>
          }
          columns={columns}
          rows={tableRows}
          actions={actions}
          size={12}
          pageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
          searchable={true}
          bulkAction={false}
          exportable={true}
          exportFileName="fee_collection_records"
          userProfile="name"
          onRefresh={loadCollectionData}
        />
      </div>



      {/* Payment History Drawer */}
      {showHistoryDrawer && selectedStudent && (
        <PanelModal
          id="history-drawer"
          title="Payment History"
          isVisible={showHistoryDrawer}
          onClose={() => setShowHistoryDrawer(false)}
          size="md"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-slate-200">
              <UserAvatar name={selectedStudent.name} size={64} className="mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#223F74]">{selectedStudent.name}</h3>
              <p className="text-sm text-slate-500">{selectedStudent.class}-{selectedStudent.section} • {selectedStudent.admissionNo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600">{formatAmount(selectedStudent.amountPaid || 0)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-rose-50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Balance Due</p>
                <p className="text-lg font-bold text-rose-600">{formatAmount((selectedStudent.totalFee || 0) - (selectedStudent.amountPaid || 0))}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#223F74]">
                <Receipt className="w-4 h-4" />
                Recent Payments
              </h3>
              <div className="space-y-2">
                {historyItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No payment records found</p>
                    </div>
                  </div>
                ) : (
                  historyItems.map((payment) => (
                    <div key={payment.id} className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <p className="font-semibold text-sm text-[#223F74]">
                          {payment.date ? new Date(payment.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.mode || 'N/A'} • {payment.receiptNumber ? `#${payment.receiptNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">{formatAmount(payment.amount || 0)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                text="Download Statement"
                icon={<Download className="w-4 h-4" />}
                variant="primary"
                onClick={async () => {
                  try {
                    const res = await getPrincipalFeeStatement(schoolId, selectedStudent.id);
                    const d = res.data;
                    const rows = [
                      ["Statement for", d.studentName],
                      ["Total Fee", d.totalFee],
                      ["Total Paid", d.totalPaid],
                      ["Total Due", d.totalDue],
                      [],
                      ["Date", "Amount", "Mode", "Receipt No"],
                      ...d.payments.map(p => [new Date(p.date).toLocaleDateString("en-IN"), p.amount, p.mode, p.receiptNumber]),
                    ];
                    const csv = rows.map(r => r.join(",")).join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `fee-statement-${d.studentName}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Failed to download statement: " + (err.response?.data?.message || err.message));
                  }
                }}
                size={12}
              />
            </div>
          </div>
        </PanelModal>
      )}

      {/* Payment Collection Modal */}
      {showCollectModal && selectedStudent && (
        <PanelModal
          id="collect-modal"
          title={`Collect Payment - ${selectedStudent.name}`}
          isVisible={showCollectModal}
          onClose={() => setShowCollectModal(false)}
          size="md"
        >
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600">Total Fee:</span>
                <span className="text-sm font-bold text-[#223F74]">{formatAmount(selectedStudent.totalFee || 0)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600">Amount Paid:</span>
                <span className="text-sm font-bold text-emerald-600">{formatAmount(selectedStudent.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-700">Balance Due:</span>
                <span className="text-sm font-bold text-rose-600">{formatAmount((selectedStudent.totalFee || 0) - (selectedStudent.amountPaid || 0))}</span>
              </div>
            </div>

            <Grid cols={12} gap={4}>
              <div className="col-span-12">
                <DataField
                  label="Amount to Pay (₹)"
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  size={12}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <SelectField
                  label="Payment Mode"
                  id="paymentMode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  size={12}
                >
                  <Option value="Cash" label="Cash" />
                  <Option value="Online" label="Online" />
                  <Option value="UPI" label="UPI" />
                  <Option value="Cheque" label="Cheque" />
                  <Option value="DD" label="DD" />
                </SelectField>
              </div>
              <div className="col-span-12 md:col-span-6">
                <DataField
                  label="Payment Date"
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  size={12}
                />
              </div>
              {paymentMode !== "Cash" && (
                <div className="col-span-12">
                  <DataField
                    label="Transaction / Cheque ID"
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter reference number"
                    size={12}
                  />
                </div>
              )}
              <div className="col-span-12">
                <DataField
                  label="Remarks (Optional)"
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional remarks"
                  size={12}
                />
              </div>
            </Grid>

            <div className="flex gap-3 pt-4 mt-2 border-t border-slate-200">
              <Button
                text={isLoading ? "Processing..." : "Confirm Payment"}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                variant="primary"
                onClick={handleConfirmPayment}
                disabled={isLoading || !paymentAmount}
                size={6}
              />
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => setShowCollectModal(false)}
                disabled={isLoading}
                size={6}
              />
            </div>
          </div>
        </PanelModal>
      )}

      {/* Reminder Modal */}
      {showReminderModal && reminderStudent && (
        <PanelModal
          id="reminder-modal"
          title={`Send Reminder - ${reminderStudent.name}`}
          isVisible={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          size="md"
        >
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 text-sm text-amber-800">
              You are about to send a payment reminder for the pending due of <span className="font-bold">{formatAmount((reminderStudent.totalFee || 0) - (reminderStudent.amountPaid || 0))}</span>.
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                  Reminder Message
                </label>
                <textarea
                  className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-[#1D1D1F] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition duration-200 resize-none"
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Enter custom reminder message"
                />
            </div>

            <div className="flex gap-3 pt-4 mt-2 border-t border-slate-200">
              <Button
                text={isSendingReminder ? "Sending..." : "Send Reminder"}
                icon={isSendingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                variant="primary"
                onClick={handleConfirmReminder}
                disabled={isSendingReminder || !reminderMessage}
                size={6}
              />
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => setShowReminderModal(false)}
                disabled={isSendingReminder}
                size={6}
              />
            </div>
          </div>
        </PanelModal>
      )}

    </div>
  );
};

export default FeeCollection;