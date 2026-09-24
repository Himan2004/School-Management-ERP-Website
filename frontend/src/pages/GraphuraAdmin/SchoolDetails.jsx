/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  DollarSign,
  Copy,
  ChevronDown,
  ShieldCheck,
  Activity,
  Database,
  School,
  AlertCircle,
  Clock,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Plus,
  Trash2,
  X,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import * as api from "../../services/api/graphuraApi";
import { Modal, openModal, closeModal } from "../../components/shared/Common_Components";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const OrganizationDetails = ({ id: propId, onBack }) => {
  const { id: paramId } = useParams();
  const id = propId || paramId;
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const queryParams = new URLSearchParams(location.search);
  let initialTab =
    location.state?.activeTab || queryParams.get("tab") || "overview";
  if (initialTab === "billing") initialTab = "finance";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // State for Payment Ledger
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedPaymentLog, setSelectedPaymentLog] = useState(null);

  // State for Editing Payment Log Remark
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [tempRemark, setTempRemark] = useState("");

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const [renewData, setRenewData] = useState({
    billingCycle: "Yearly",
    customExpiryDate: "",
  });

  const [quotaData, setQuotaData] = useState({
    maxSchools: 1,
    maxStudents: 500,
    maxStaff: 70,
  });

  // Authenticated Target Amount Override
  const [targetAmount, setTargetAmount] = useState(0);
  const [isTargetUnlocked, setIsTargetUnlocked] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [authPin, setAuthPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Batch Payments
  const [batchPayments, setBatchPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({
    amount: "",
    method: "Online Transfer",
    remark: "",
  });

  useEffect(() => {
    fetchOrgsList();
  }, []);

  useEffect(() => {
    fetchOrganizationDetails();
    fetchPaymentHistory();
  }, [id]);

  useEffect(() => {
    const qParams = new URLSearchParams(location.search);
    let tabFromUrl = location.state?.activeTab || qParams.get("tab");
    if (tabFromUrl === "billing") tabFromUrl = "finance";
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);

  const fetchOrgsList = async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.fetchAllOrganizations();
      if (res.data?.success) {
        setOrganizations(res.data.data.organizations || res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch organizations list:", err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!id) return;
    setLoadingLogs(true);
    try {
      const res = await api.fetchOrganizationPayments(id);
      if (res.data?.success) setPaymentLogs(res.data.data);
    } catch (err) {
      console.error("Failed to fetch payment history", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchOrganizationDetails = async () => {
    if (!id) {
      setLoading(false);
      setOrganization(null);
      return;
    }
    setLoading(true);
    try {
      const response = await api.fetchOrganizationById(id);
      const org = response.data?.data || response.data;

      const orgData = {
        ...org,
        id: org._id,
        organizationName: org.organizationName,
        registrationNumber: org.organizationId,
        email: org.officialEmail,
        phone: org.contactNumber,
        address: org.address?.line1 || "",
        city: org.address?.city || "",
        state: org.address?.state || "",
        pincode: org.address?.pincode || "",
        status: org.status || "active",
        establishedYear: org.yearEstablished || "N/A",
        board: org.organizationAcademic?.organizationBoard || "Unspecified",

        billing: org.billing || {
          status: "active",
          cycle: "Yearly",
          customAmount: 0,
          outstandingBalance: 0,
          expiryDate: new Date(+new Date() + 365 * 24 * 60 * 60 * 1000),
        },
        quotas: {
          maxSchools: org.quotas?.maxSchools || 1,
          maxStudents: org.quotas?.maxStudents || 500,
          maxStaff: org.quotas?.maxStaff !== undefined
            ? org.quotas.maxStaff
            : (org.quotas?.maxTeachingStaff || 0) + (org.quotas?.maxNonTeachingStaff || 0) || 70,
        },

        usage: {
          schools: org.usage?.schools || 0,
          students: org.usage?.students || 0,
          teachers: org.usage?.teachers || 0,
          nonTeachers: org.usage?.nonTeachers || 0,
        },

        lastActive: org.updatedAt || new Date(),
        joinedDate: org.createdAt || new Date(),

        principalName: org.superAdminProfile?.name || "Administrator",
        documents: [],
        recentActivities: org.recentActivities || [],
        performanceData: org.performanceData || [],
      };

      setOrganization(orgData);
      setEditData(orgData);
      setQuotaData(orgData.quotas);
      setTargetAmount(Math.max(0, orgData.billing.customAmount || 0));
    } catch (error) {
      console.error("Error fetching org details:", error);
      toast.error("Failed to load organization details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id && !propId && organizations.length > 0) {
      navigate(`/graphura-admin/school-details/${organizations[0]._id}`, {
        replace: true,
      });
    }
  }, [id, propId, organizations, navigate]);

  const handleSave = async () => {
    try {
      const updatePayload = {
        organizationName: editData.organizationName,
        officialEmail: editData.email,
        contactNumber: editData.phone,
        address: {
          line1: editData.address,
          city: editData.city,
          state: editData.state,
          pincode: editData.pincode,
        },
        organizationAcademic: {
          organizationBoard: editData.board,
          organizationSections:
            editData.organizationAcademic?.organizationSections || 1,
        },
      };

      const response = await api.updateOrganizationDetails(id, updatePayload);
      if (response.data?.success || response.success) {
        toast.success("Organization details updated successfully");
        setIsEditing(false);
        await fetchOrganizationDetails();
      } else {
        toast.error("Failed to update organization details");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(error.response?.data?.message || "Failed to update details");
    }
  };

  // ─── EDIT REMARK HANDLER ───
  const handleSaveRemark = async () => {
    try {
      // You will need to add this to your api service and backend
      const res = await api.updatePaymentLogRemark(selectedPaymentLog._id, {
        remark: tempRemark,
      });
      if (res.data?.success || res.success) {
        toast.success("Remark updated successfully.");
        setIsEditingRemark(false);
        // Update local selected state
        setSelectedPaymentLog({ ...selectedPaymentLog, remark: tempRemark });
        // Update main array so table matches
        setPaymentLogs((prev) =>
          prev.map((log) =>
            log._id === selectedPaymentLog._id
              ? { ...log, remark: tempRemark }
              : log,
          ),
        );
      }
    } catch (error) {
      toast.error("Failed to update remark.");
    }
  };

  // ─── BATCH PAYMENT HANDLERS ───
  const handleUnlockTarget = async () => {
    if (!authPin.trim()) {
      setPinError("Your PIN is wrong.");
      return;
    }

    const toastId = toast.loading("Verifying Authorization PIN...");
    try {
      const res = await api.verifyAdminPin({ pin: authPin });
      if (res.data?.success || res.success) {
        setIsTargetUnlocked(true);
        setShowPinInput(false);
        setAuthPin("");
        setPinError("");
        toast.success("Target amount unlocked. Save to confirm new amount.", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.dismiss(toastId);
      setPinError("Your PIN is wrong.");
      setAuthPin("");
    }
  };

  const handleLockTarget = () => {
    const val = Number(targetAmount);
    if (isNaN(val) || val < 0) {
      toast.error("Renewal amount cannot be negative.");
      return;
    }
    setIsTargetUnlocked(false);
    toast.success("New target amount saved.");
  };

  // ─── DYNAMIC PAYMENT MATH ───
  const isRenewal = renewData.billingCycle !== "None";
  const effectiveTarget = isRenewal ? Math.max(0, Number(targetAmount) || 0) : 0;
  const previousOutstanding = organization?.billing?.outstandingBalance || 0;
  const totalDue = effectiveTarget + previousOutstanding;

  const currentInputAmount = Number(currentPayment.amount) || 0;
  const totalPaidSoFar =
    batchPayments.reduce((acc, curr) => acc + Number(curr.amount), 0) +
    currentInputAmount;

  const newOutstanding = Math.max(0, totalDue - totalPaidSoFar);
  const overpayment = Math.max(0, totalPaidSoFar - totalDue);

  const isPaymentShort = totalPaidSoFar < totalDue;
  const isOverpaying = totalPaidSoFar > totalDue;

  const isConfirmDisabled =
    isTargetUnlocked || totalPaidSoFar === 0 || isOverpaying;

  let confirmButtonText = "";
  if (isOverpaying) {
    confirmButtonText = "Amount Exceeds Due";
  } else if (isPaymentShort && currentInputAmount > 0) {
    confirmButtonText = "Log Installment (No Extension)";
  } else if (isPaymentShort) {
    confirmButtonText = "Log Installment (No Extension)";
  } else if (isRenewal) {
    confirmButtonText = "Confirm Full Extension";
  } else {
    confirmButtonText = "Clear Dues & Extend";
  }

  const handleAddBatchPayment = () => {
    if (isTargetUnlocked) {
      toast.error("Please lock the target amount before logging payments.");
      return;
    }

    const inputAmount = Number(currentPayment.amount);
    if (!currentPayment.amount || isNaN(inputAmount) || inputAmount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const currentTotalLogged = batchPayments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0,
    );
    const remainingToPay = totalDue - currentTotalLogged;

    if (inputAmount > remainingToPay) {
      toast.error(
        `Amount exceeds total due. Maximum allowed: ₹${remainingToPay.toLocaleString()}`,
      );
      return;
    }

    setBatchPayments([...batchPayments, { ...currentPayment, id: Date.now() }]);
    setCurrentPayment({ amount: "", method: "Online Transfer", remark: "" });
  };

  const removeBatchPayment = (paymentId) => {
    setBatchPayments(batchPayments.filter((p) => p.id !== paymentId));
  };

  const handleRenewSubscription = async () => {
    const val = Number(targetAmount);
    if (isNaN(val) || val < 0) {
      toast.error("Renewal amount cannot be negative.");
      return;
    }
    if (isTargetUnlocked) {
      toast.error("Please save the target amount before confirming.");
      return;
    }
    if (isOverpaying) {
      toast.error(
        `Payment of ₹${totalPaidSoFar} exceeds the total due of ₹${totalDue}. Please adjust.`,
      );
      return;
    }
    if (renewData.billingCycle === "Custom" && !renewData.customExpiryDate) {
      toast.error("Please select a valid custom expiration date");
      return;
    }

    try {
      let finalPayments = batchPayments.map((p) => ({
        amount: Number(p.amount),
        method: p.method,
        remark: p.remark,
      }));

      const inputAmt = Number(currentPayment.amount);
      if (currentPayment.amount && !isNaN(inputAmt) && inputAmt > 0) {
        finalPayments.push({
          amount: inputAmt,
          method: currentPayment.method,
          remark: currentPayment.remark,
        });
      }

      await api.updateOrganizationBillingAndQuotas(id, {
        action: "renew",
        billingCycle: renewData.billingCycle,
        customExpiryDate: renewData.customExpiryDate || null,
        targetAmount: Number(targetAmount),
        batchPayments: finalPayments,
      });

      toast.success(
        isPaymentShort
          ? "Installment payment successfully logged. Outstanding balance updated."
          : `Subscription successfully extended for ${renewData.billingCycle === "None" ? organization.billing?.cycle : renewData.billingCycle}`,
      );

      closeModal("renewals-payments-modal");
      setRenewData({
        billingCycle: organization.billing?.cycle || "Yearly",
        customExpiryDate: "",
      });
      setBatchPayments([]);
      setCurrentPayment({ amount: "", method: "Online Transfer", remark: "" });
      setIsTargetUnlocked(false);

      fetchOrganizationDetails();
      fetchPaymentHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process payment");
    }
  };

  const handleUpdateQuotas = async () => {
    try {
      await api.updateOrganizationBillingAndQuotas(id, {
        action: "update_quotas",
        maxSchools: Number(quotaData.maxSchools || 0),
        maxStudents: Number(quotaData.maxStudents || 0),
        maxStaff: Number(quotaData.maxStaff || 0),
      });

      toast.success(`Capacity limits updated successfully`);
      closeModal("quota-limits-modal");
      fetchOrganizationDetails();
    } catch (error) {
      toast.error("Failed to update capacity limits");
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return toast.error("Please provide a reason");
    try {
      await api.updateOrganizationStatus(id, {
        status: "suspended",
        reason: suspendReason,
      });
      toast.success(`Organization suspended`);
      closeModal("suspend-modal");
      fetchOrganizationDetails();
    } catch (error) {
      toast.error("Failed to suspend organization");
    }
  };

  const handleDelete = async () => {
    try {
      toast.success(`Organization deleted successfully`);
      closeModal("delete-modal");
      navigate("/graphura-admin/schools");
    } catch (error) {
      toast.error("Failed to delete organization");
    }
  };

  const handleSendNotification = async (type) => {
    const loadingToast = toast.loading(`Dispatching ${type} notice...`);
    try {
      const response = await api.sendOrganizationNotification(id, { type });
      if (response.data?.success) {
        toast.success(response.data.message, { id: loadingToast });
      } else {
        toast.error("Failed to send email.", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to connect to email server.", { id: loadingToast });
    }
  };

  const handleCopyInfo = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDownloadInvoice = (log) => {
    const printWindow = window.open("", "_blank");
    const invoiceDate = format(new Date(log.paymentDate), "dd MMM yyyy");
    const invoiceId = `INV-${log._id.toString().slice(-6).toUpperCase()}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${invoiceId}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 40px; background-color: #f8fafc; }
          .invoice-box { max-width: 800px; margin: auto; padding: 40px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .header-left h1 { margin: 0; color: #4f46e5; font-size: 32px; font-weight: 900; letter-spacing: -1px; }
          .header-right { text-align: right; }
          .header-right h2 { margin: 0 0 4px 0; color: #0f172a; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; }
          .header-right p { margin: 0; color: #64748b; font-size: 14px; font-weight: 500; }
          .badge { display: inline-block; margin-top: 12px; padding: 6px 16px; background-color: #ecfdf5; color: #047857; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #a7f3d0; }
          .divider { border-bottom: 2px solid #f1f5f9; margin: 32px 0; }
          .billing-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .billing-col h3 { margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .billing-col p { margin: 0 0 4px 0; color: #0f172a; font-size: 16px; font-weight: 700; }
          .billing-col span { display: block; color: #475569; font-size: 14px; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { padding: 12px 16px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
          th.text-right { text-align: right; }
          td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 500; vertical-align: top; }
          td.text-right { text-align: right; }
          .desc-title { display: block; color: #0f172a; font-weight: 700; margin-bottom: 4px; }
          .desc-sub { display: block; color: #64748b; font-size: 13px; font-weight: 400; }
          .totals { width: 320px; float: right; margin-bottom: 40px; }
          .totals-row { display: flex; justify-content: space-between; padding: 12px 16px; color: #475569; font-size: 14px; font-weight: 500; }
          .totals-row.final { background-color: #f8fafc; border-radius: 8px; margin-top: 8px; padding: 16px; color: #0f172a; font-size: 18px; font-weight: 800; border: 1px solid #e2e8f0; }
          .totals-row.final span:last-child { color: #4f46e5; }
          .footer { clear: both; text-align: center; padding-top: 40px; color: #94a3b8; font-size: 13px; border-top: 2px solid #f1f5f9; }
          @media print { 
            body { padding: 0; background-color: #fff; } 
            .invoice-box { border: none; box-shadow: none; padding: 0; max-width: 100%; } 
            .badge { border: 1px solid #047857; }
            .totals-row.final { border: 1px solid #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="header-left">
              <h1>Graphura.</h1>
            </div>
            <div class="header-right">
              <h2>PAYMENT RECEIPT</h2>
              <p>Receipt # ${invoiceId}</p>
              <p>Date: ${invoiceDate}</p>
              <span class="badge">Status: ${log.status || "Successful"}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="billing-info">
            <div class="billing-col">
              <h3>Billed To</h3>
              <p>${organization.organizationName}</p>
              <span>ID: ${organization.registrationNumber}</span>
              <span>${organization.officialEmail}</span>
              <span>${organization.address?.line1 || organization.address}, ${organization.city}</span>
            </div>
            <div class="billing-col" style="text-align: right;">
              <h3>Payment Info</h3>
              <p>Method: ${log.method || "Online Transfer"}</p>
              <span>Graphura ERP</span>
              <span>sales@graphura.com</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Billing Cycle</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span class="desc-title">${log.remark || "Subscription Payment / Installment"}</span>
                  <span class="desc-sub">Software access, hosting, and platform support.</span>
                </td>
                <td class="text-right">${log.billingCycle}</td>
                <td class="text-right">₹${log.amountPaid.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>₹${log.amountPaid.toLocaleString()}</span>
            </div>
            <div class="totals-row">
              <span>Tax (0%)</span>
              <span>₹0</span>
            </div>
            <div class="totals-row final">
              <span>Total Paid</span>
              <span>₹${log.amountPaid.toLocaleString()}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for partnering with Graphura ERP.</p>
            <p>This is a computer-generated receipt. No signature is required.</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            <CheckCircle className="w-3.5 h-3.5" /> Active
          </span>
        );
      case "inactive":
        return (
          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            <XCircle className="w-3.5 h-3.5" /> Inactive
          </span>
        );
      case "suspended":
        return (
          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            <AlertCircle className="w-3.5 h-3.5" /> Suspended
          </span>
        );
      case "past_due":
        return (
          <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            <Clock className="w-3.5 h-3.5" /> Past Due
          </span>
        );
      case "expired":
        return (
          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            <XCircle className="w-3.5 h-3.5" /> Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide h-7">
            {status}
          </span>
        );
    }
  };

  const getCycleBadgeColor = (cycle) => {
    switch (cycle) {
      case "Yearly":
        return "text-emerald-700 bg-emerald-100";
      case "Monthly":
        return "text-blue-700 bg-blue-100";
      case "Custom":
        return "text-purple-700 bg-purple-100";
      case "Dues Cleared":
        return "text-slate-700 bg-slate-100";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  const calculateProgress = (usage, limit) => {
    const percent = limit > 0 ? (usage / limit) * 100 : 0;
    const color =
      percent > 95
        ? "bg-red-500"
        : percent > 80
          ? "bg-yellow-500"
          : "bg-indigo-500";
    return { width: `${Math.min(percent, 100)}%`, color };
  };

  const tabs = [
    { id: "overview", name: "Overview", icon: Building2 },
    { id: "finance", name: "Billing & Subscriptions", icon: DollarSign },
    { id: "performance", name: "Analytics", icon: TrendingUp },
    { id: "staff", name: "Resources", icon: Database },
  ];

  if (!id && organizations.length === 0 && loadingOrgs) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-500 font-medium">
          Syncing organization details...
        </p>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
          <Building2 className="w-10 h-10 text-indigo-500" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-slate-800">
            No Organization Selected
          </h2>
          <p className="text-slate-500 mt-2">
            Please select an organization from the list or sidebar to view its
            complete details.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !organization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-500 font-medium text-center">
          Syncing details...
        </p>
      </div>
    );
  }

  const totalStaffUsage =
    (organization?.usage?.teachers || 0) +
    (organization?.usage?.nonTeachers || 0);
  const totalStaffQuota =
    organization?.quotas?.maxStaff !== undefined
      ? organization.quotas.maxStaff
      : (organization?.quotas?.maxTeachingStaff || 0) +
      (organization?.quotas?.maxNonTeachingStaff || 0);

  const isExpired =
    new Date() > new Date(organization.billing?.expiryDate || new Date());

  return (
    <div className="space-y-6 pb-20">
      {/* ── HEADER SECTION ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 min-w-0 w-full xl:w-auto">
          <button
            onClick={onBack || (() => navigate("/graphura-admin/schools"))}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                {organization.organizationName}
              </h1>
              {getStatusBadge(organization.status)}
              {organization.billing?.status !== "active" &&
                getStatusBadge(organization.billing?.status)}
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" /> ID:{" "}
                {organization.registrationNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto shrink-0 justify-start xl:justify-end">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="h-11 flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm whitespace-nowrap shrink-0"
              >
                <Edit className="w-4 h-4" /> Edit Details
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="h-11 flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm whitespace-nowrap shrink-0"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="h-11 flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm whitespace-nowrap shrink-0"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </>
            )}

            <button
              onClick={() => openModal("quota-limits-modal")}
              className="h-11 flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-bold shadow-sm whitespace-nowrap shrink-0"
            >
              <Database className="w-4 h-4" /> Manage Capacity
            </button>

            <button
              onClick={() => {
                setBatchPayments([]);
                const initialTarget = Math.max(0, organization.billing?.customAmount || 0);
                setTargetAmount(initialTarget);
                // Auto-unlock if it's a new org with 0 target
                setIsTargetUnlocked(initialTarget === 0);
                setPinError("");
                setRenewData({
                  billingCycle:
                    organization.billing?.outstandingBalance > 0
                      ? "None"
                      : organization.billing?.cycle || "Yearly",
                  customExpiryDate: "",
                });
                openModal("renewals-payments-modal");
              }}
              className="h-11 flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-bold shadow-sm whitespace-nowrap shrink-0"
            >
              <DollarSign className="w-4 h-4" /> Manage Renewals
            </button>
          </div>
        </div>
      </div>

      {/* ── Quota & Usage Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 rounded-lg">
                <School className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Branches</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
              Usage
            </span>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight">
                {organization.usage?.schools || 0}
              </span>
              <span className="text-sm text-slate-500 font-bold mb-1">
                / {organization.quotas?.maxSchools || 0}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${calculateProgress(organization.usage?.schools, organization.quotas?.maxSchools).color}`}
                style={{
                  width: calculateProgress(
                    organization.usage?.schools,
                    organization.quotas?.maxSchools,
                  ).width,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Students</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight">
                {organization.usage?.students || 0}
              </span>
              <span className="text-sm text-slate-500 font-bold mb-1">
                / {organization.quotas?.maxStudents || 0}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${calculateProgress(organization.usage?.students, organization.quotas?.maxStudents).color}`}
                style={{
                  width: calculateProgress(
                    organization.usage?.students,
                    organization.quotas?.maxStudents,
                  ).width,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 rounded-lg">
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Staff</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight">
                {totalStaffUsage}
              </span>
              <span className="text-sm text-slate-500 font-bold mb-1">
                / {totalStaffQuota}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${calculateProgress(totalStaffUsage, totalStaffQuota).color}`}
                style={{
                  width: calculateProgress(totalStaffUsage, totalStaffQuota)
                    .width,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">
                Billing Cycle
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getCycleBadgeColor(organization.billing?.cycle)}`}
            >
              {organization.billing?.cycle || "N/A"}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">
              Valid Until
            </p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {organization.billing?.expiryDate
                ? format(
                  new Date(organization.billing.expiryDate),
                  "dd MMM yyyy",
                )
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-8 overflow-x-auto custom-scrollbar pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 flex items-center gap-2 transition-all whitespace-nowrap text-sm font-bold border-b-2 ${activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                Organization Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Organization Name
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.organizationName}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        organizationName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                  />
                ) : (
                  <p className="font-semibold text-slate-800">
                    {organization.organizationName}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Registration ID
                </p>
                <p className="font-semibold text-slate-800">
                  {organization.registrationNumber}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Official Email
                </p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                  />
                ) : (
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    {organization.email}{" "}
                    <button onClick={() => handleCopyInfo(organization.email)}>
                      <Copy className="w-3.5 h-3.5 text-indigo-400 hover:text-indigo-600" />
                    </button>
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Contact Phone
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) =>
                      setEditData({ ...editData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                  />
                ) : (
                  <p className="font-semibold text-slate-800">
                    {organization.phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Educational Board
                </p>
                {isEditing ? (
                  <select
                    value={editData.board}
                    onChange={(e) =>
                      setEditData({ ...editData, board: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                  >
                    <option>CBSE</option>
                    <option>ICSE</option>
                    <option>State Board</option>
                  </select>
                ) : (
                  <p className="font-semibold text-slate-800">
                    {organization.board}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Address
                </p>
                {isEditing ? (
                  <textarea
                    value={editData.address}
                    onChange={(e) =>
                      setEditData({ ...editData, address: e.target.value })
                    }
                    rows="2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                  />
                ) : (
                  <p className="font-semibold text-slate-800">
                    {organization.address}, {organization.city},{" "}
                    {organization.state}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Administrator
            </h2>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                {organization.principalName.charAt(0)}
              </div>
              <p className="font-bold text-slate-900 text-lg">
                {organization.principalName}
              </p>
              <p className="text-sm font-medium text-indigo-600 mb-4">
                Super Admin
              </p>

              <div className="space-y-3 pt-4 border-t border-slate-200 mt-auto">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {organization.superAdminProfile?.email ||
                      organization.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {organization.superAdminProfile?.phoneNumber ||
                      organization.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCE / BILLING TAB ── */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">
                  Current Subscription
                </h2>
                {getStatusBadge(organization.billing?.status)}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Billing Cycle
                  </span>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${getCycleBadgeColor(organization.billing?.cycle)}`}
                  >
                    {organization.billing?.cycle || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Amount Negotiated
                  </span>
                  <span className="font-black text-indigo-600 text-xl">
                    ₹
                    {(organization.billing?.customAmount || 0).toLocaleString()}
                  </span>
                </div>

                {organization.billing?.outstandingBalance > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-slate-50 bg-rose-50/50 -mx-6 px-6">
                    <span className="text-sm font-bold text-rose-500 uppercase tracking-wide flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Outstanding Balance
                    </span>
                    <span className="font-bold text-rose-600 text-xl">
                      ₹
                      {(
                        organization.billing?.outstandingBalance || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Last Payment Date
                  </span>
                  <span className="font-bold text-slate-800">
                    {organization.billing?.lastPaymentDate
                      ? format(
                        new Date(organization.billing.lastPaymentDate),
                        "dd MMM yyyy",
                      )
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Expiration Date
                  </span>
                  <span
                    className={`font-bold ${isExpired ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {organization.billing?.expiryDate
                      ? format(
                        new Date(organization.billing.expiryDate),
                        "dd MMM yyyy",
                      )
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => {
                    setBatchPayments([]);
                    const initialTarget =
                      Math.max(0, organization.billing?.customAmount || 0);
                    setTargetAmount(initialTarget);
                    // Auto-unlock if it's a new org with 0 target
                    setIsTargetUnlocked(initialTarget === 0);
                    setPinError("");
                    setRenewData({
                      billingCycle:
                        organization.billing?.outstandingBalance > 0
                          ? "None"
                          : organization.billing?.cycle || "Yearly",
                      customExpiryDate: "",
                    });
                    openModal("renewals-payments-modal");
                  }}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Manage Renewals & Payments
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6">
                  Resource Allocation Limits
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      label: "Maximum Branches",
                      field: "maxSchools",
                      icon: School,
                    },
                    {
                      label: "Maximum Students",
                      field: "maxStudents",
                      icon: Users,
                    },
                    {
                      label: "Maximum Staff",
                      field: "maxStaff",
                      icon: UserCheck,
                    },
                  ].map((item) => (
                    <div
                      key={item.field}
                      className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-slate-700">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-black text-xl text-slate-900">
                        {organization.quotas?.[item.field] || 0}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => openModal("quota-limits-modal")}
                    className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    Modify Capacity Limits
                  </button>
                </div>
              </div>

              {/* Manual Email Triggers Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-2">
                  Manual Email Triggers
                </h2>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  Dispatch lifecycle alerts directly to the organization
                  administrator.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleSendNotification("deactivation")}
                    className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-orange-500" />
                      <div className="text-left">
                        <p className="font-bold text-orange-900 text-sm">
                          Send Deactivation Notice
                        </p>
                        <p className="text-xs font-medium text-orange-700 mt-0.5">
                          Alert admin of past-due grace period.
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-orange-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleSendNotification("expiry")}
                    className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <div className="text-left">
                        <p className="font-bold text-red-900 text-sm">
                          Send Expiry Warning
                        </p>
                        <p className="text-xs font-medium text-red-700 mt-0.5">
                          Final warning before data archival.
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-red-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Ledger */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Payment History Ledger
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Record of all manual and automated subscription renewals.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider uppercase text-[11px]">
                      Transaction Date
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider uppercase text-[11px]">
                      Billing Cycle
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider uppercase text-[11px]">
                      Amount Paid
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider uppercase text-[11px]">
                      Status
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider uppercase text-[11px] text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLogs ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-slate-500 font-medium"
                      >
                        Loading history...
                      </td>
                    </tr>
                  ) : paymentLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold">
                          No payment history recorded yet.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paymentLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {format(
                            new Date(log.paymentDate),
                            "dd MMM yyyy, h:mm a",
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getCycleBadgeColor(log.billingCycle)}`}
                          >
                            {log.billingCycle}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-indigo-600 text-base">
                          ₹{log.amountPaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide w-max">
                            <CheckCircle className="w-3.5 h-3.5" />{" "}
                            {log.status || "successful"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => {
                                setIsEditingRemark(false);
                                setTempRemark(log.remark || "");
                                setSelectedPaymentLog(log);
                              }}
                              className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadInvoice(log)}
                              className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                              title="Download Receipt"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Recent Activities
            </h2>
            {organization.recentActivities?.length > 0 ? (
              <div className="space-y-3">
                {organization.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${activity.status === "active"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {activity.action}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {activity.name}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {format(new Date(activity.time), "dd MMM, yy")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">
                  No recent activities found.
                </p>
              </div>
            )}
          </div>

          {organization.performanceData?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-6">
                Academic Performance Trend
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={organization.performanceData}>
                  <defs>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="passPercentage"
                    stroke="#4F46E5"
                    fill="url(#colorPass)"
                    name="Pass Percentage"
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#10B981"
                    fill="none"
                    name="Average Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="border-t border-red-100 pt-8 mt-12 no-print">
        <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
          <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
            Administrative Danger Zone
          </h3>
          <p className="text-sm font-medium text-slate-500 mb-6">
            Deactivating or deleting an organization restricts all active users
            (staff and students) instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => openModal("suspend-modal")}
              className="px-6 py-3 bg-white text-orange-700 font-bold rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition-colors"
            >
              Suspend Organization Access
            </button>
            <button
              onClick={() => openModal("delete-modal")}
              className="px-6 py-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
            >
              Delete Organization Permanently
            </button>
          </div>
        </div>
      </div>

      {/* ── NEW RENEWALS & PAYMENTS MODAL ── */}
      <Modal
        id="renewals-payments-modal"
        title="Manage Renewals & Payments"
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                {organization?.organizationName}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Billing Cycle and Transactions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2">
              {/* Left Column: Payments */}
              <div className="flex flex-col space-y-6">
                {/* Target Amount Header */}
                <div
                  className={`border rounded-2xl p-5 transition-all ${!isRenewal ? "bg-slate-50 border-slate-200 opacity-70 pointer-events-none" : "bg-white border-slate-200"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Target Renewal Amount
                    </p>
                    {isTargetUnlocked ? (
                      <Unlock className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <button
                        onClick={() => setShowPinInput(!showPinInput)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isTargetUnlocked && isRenewal ? (
                    <input
                      type="number"
                      min="0"
                      value={targetAmount}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setTargetAmount("");
                          return;
                        }
                        const numVal = Number(val);
                        if (numVal < 0) {
                          setTargetAmount(0);
                        } else {
                          setTargetAmount(val);
                        }
                      }}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-2xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-3xl font-black text-slate-800 tracking-tight">
                      ₹{Math.max(0, Number(isRenewal ? targetAmount : 0)).toLocaleString()}
                    </p>
                  )}

                  {!isRenewal && (
                    <p className="text-xs font-bold text-slate-500 mt-2">
                      Paying towards previous balance. Cycle extends when dues
                      hit ₹0.
                    </p>
                  )}

                  {showPinInput && !isTargetUnlocked && isRenewal && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Auth PIN (e.g. 1234)"
                          value={authPin}
                          onChange={(e) => {
                            setAuthPin(e.target.value);
                            if (pinError) setPinError("");
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={handleUnlockTarget}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700"
                        >
                          Unlock
                        </button>
                      </div>
                      {pinError && (
                        <p className="text-xs text-red-500 font-semibold mt-1">
                          {pinError}
                        </p>
                      )}
                    </div>
                  )}

                  {isTargetUnlocked && isRenewal && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleLockTarget}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save Target
                      </button>
                    </div>
                  )}

                  {/* Outstanding Balance Indicator */}
                  {organization.billing?.outstandingBalance > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                          Previous Outstanding
                        </span>
                      </div>
                      <span className="text-lg font-black text-rose-600">
                        ₹
                        {organization.billing.outstandingBalance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add Batch Payment Form */}
                <div
                  className={`border rounded-2xl p-5 bg-white transition-all ${isTargetUnlocked ? "border-slate-100 opacity-50 pointer-events-none" : "border-slate-200"}`}
                >
                  <h4 className="font-bold text-slate-800 text-base mb-4">
                    Add Payment Batch
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={currentPayment.amount}
                        onChange={(e) =>
                          setCurrentPayment({
                            ...currentPayment,
                            amount: e.target.value,
                          })
                        }
                        disabled={isTargetUnlocked}
                        className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 disabled:bg-slate-50"
                      />
                      <select
                        value={currentPayment.method}
                        onChange={(e) =>
                          setCurrentPayment({
                            ...currentPayment,
                            method: e.target.value,
                          })
                        }
                        disabled={isTargetUnlocked}
                        className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 disabled:bg-slate-50"
                      >
                        <option value="Online Transfer">Online Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Remark / Description..."
                      value={currentPayment.remark}
                      onChange={(e) =>
                        setCurrentPayment({
                          ...currentPayment,
                          remark: e.target.value,
                        })
                      }
                      disabled={isTargetUnlocked}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 disabled:bg-slate-50"
                    />
                    <button
                      onClick={handleAddBatchPayment}
                      disabled={isTargetUnlocked}
                      className="w-full flex justify-center items-center gap-2 py-2.5 bg-[#1e293b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f172a] transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Log Payment
                    </button>
                  </div>
                </div>

                {/* Batch Payment List */}
                {batchPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Logged Payments
                    </p>
                    <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {batchPayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm"
                        >
                          <div>
                            <p className="font-bold text-indigo-600 text-sm">
                              ₹{Number(p.amount).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.method} {p.remark ? `- ${p.remark}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => removeBatchPayment(p.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Extend Plan Summary */}
              <div className="flex flex-col h-full">
                <div className="border border-slate-200 rounded-2xl p-6 bg-white flex-1 flex flex-col">
                  <h4 className="font-bold text-slate-800 text-base mb-6">
                    Subscription Details
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
                        Extend Billing Cycle
                      </label>
                      <div className="relative">
                        <select
                          value={renewData.billingCycle}
                          onChange={(e) =>
                            setRenewData({
                              ...renewData,
                              billingCycle: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 appearance-none transition-all"
                        >
                          <option value="None">
                            No Extension (Clear Dues Only)
                          </option>
                          <option value="Monthly">Monthly (+30 Days)</option>
                          <option value="Yearly">Yearly (+365 Days)</option>
                          <option value="Custom">Custom Expiration Date</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
                      </div>
                    </div>

                    <AnimatePresence>
                      {renewData.billingCycle === "Custom" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide mt-1">
                            Select Custom Expiry Date
                          </label>
                          <input
                            type="date"
                            value={renewData.customExpiryDate}
                            onChange={(e) =>
                              setRenewData({
                                ...renewData,
                                customExpiryDate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-auto pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-500">
                        Renewal Cost:
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{effectiveTarget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">
                        Previous Dues:
                      </span>
                      <span className="font-bold text-rose-600">
                        ₹{previousOutstanding.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-700">
                        Total Payable:
                      </span>
                      <span className="font-black text-slate-900 text-lg">
                        ₹{totalDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-500">
                        Total Logged:
                      </span>
                      <span className="font-bold text-emerald-600 text-lg">
                        ₹{totalPaidSoFar.toLocaleString()}
                      </span>
                    </div>

                    {totalDue > 0 && isPaymentShort && (
                      <div className="flex gap-3 p-3 mt-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl text-[#92400e]">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#f59e0b]" />
                        <p className="text-xs font-medium leading-relaxed">
                          {isRenewal ? (
                            <>
                              Payment is less than the total due.{" "}
                              <span className="font-bold text-red-600">
                                You must clear the full balance to extend the
                                cycle.
                              </span>
                            </>
                          ) : (
                            <>
                              Payment is less than the total due. Outstanding
                              balance will be updated to{" "}
                              <span className="font-bold">
                                ₹{newOutstanding.toLocaleString()}
                              </span>
                              .
                            </>
                          )}
                        </p>
                      </div>
                    )}
                    {totalPaidSoFar >= totalDue &&
                      totalDue > 0 &&
                      overpayment === 0 && (
                        <div className="flex gap-3 p-3 mt-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-[#065f46]">
                          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#10b981]" />
                          <p className="text-xs font-medium leading-relaxed">
                            Payment exactly covers the total due. Outstanding
                            balance will be cleared to{" "}
                            <span className="font-bold">₹0</span>.
                          </p>
                        </div>
                      )}
                    {overpayment > 0 && (
                      <div className="flex gap-3 p-3 mt-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                        <p className="text-xs font-medium leading-relaxed">
                          Payment exceeds total due by{" "}
                          <span className="font-bold">
                            ₹{overpayment.toLocaleString()}
                          </span>
                          .
                          <span className="text-red-600 font-bold block mt-1">
                            Please reduce the payment amount to match the total
                            payable.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleRenewSubscription}
                  disabled={isConfirmDisabled}
                  className={`w-full py-3.5 rounded-xl text-base font-bold mt-6 flex items-center justify-center gap-2 shadow-sm transition-all ${
                    isConfirmDisabled
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                      : "bg-[#059669] hover:bg-[#047857] text-white active:scale-[0.98]"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {confirmButtonText}
                </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Quota Limits Modal ── */}
      <Modal
        id="quota-limits-modal"
        title="Capacity Limits"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                {organization?.organizationName}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Adjust resource boundaries
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Max Branches
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quotaData.maxSchools}
                  onChange={(e) =>
                    setQuotaData({
                      ...quotaData,
                      maxSchools: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Max Students
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quotaData.maxStudents}
                  onChange={(e) =>
                    setQuotaData({
                      ...quotaData,
                      maxStudents: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Max Staff
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quotaData.maxStaff}
                  onChange={(e) =>
                    setQuotaData({
                      ...quotaData,
                      maxStaff: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => closeModal("quota-limits-modal")}
              className="flex-1 px-4 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateQuotas}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              Confirm Limits
            </button>
          </div>
        </div>
      </Modal>

      {/* ── VIEW / EDIT PAYMENT DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedPaymentLog && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              setSelectedPaymentLog(null);
              setIsEditingRemark(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[24px] max-w-sm w-full p-6 sm:p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-5">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Receipt Detail
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {format(
                        new Date(selectedPaymentLog.paymentDate),
                        "dd MMM yyyy, p",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPaymentLog(null);
                    setIsEditingRemark(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Amount Paid
                  </span>
                  <span className="text-2xl font-black text-indigo-600">
                    ₹{selectedPaymentLog.amountPaid.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">
                    Method
                  </span>
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    {selectedPaymentLog.method || "Online Transfer"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">
                    Status
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {selectedPaymentLog.status || "successful"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">
                    Cycle Billed
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getCycleBadgeColor(selectedPaymentLog.billingCycle)}`}
                  >
                    {selectedPaymentLog.billingCycle}
                  </span>
                </div>

                {/* ── EDITABLE REMARK SECTION ── */}
                <div className="pt-5 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Transaction Remark
                    </span>
                    {!isEditingRemark ? (
                      <button
                        onClick={() => setIsEditingRemark(true)}
                        className="text-indigo-600 text-xs flex items-center gap-1 hover:text-indigo-700 font-bold transition-colors"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setIsEditingRemark(false);
                            setTempRemark(selectedPaymentLog.remark || "");
                          }}
                          className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveRemark}
                          className="text-emerald-600 text-xs flex items-center gap-1 hover:text-emerald-700 font-bold transition-colors"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingRemark ? (
                    <textarea
                      value={tempRemark}
                      onChange={(e) => setTempRemark(e.target.value)}
                      placeholder="Add an internal note or reference..."
                      className="w-full text-sm font-medium text-slate-800 bg-white p-3 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
                      rows="3"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                      {selectedPaymentLog.remark ||
                        "No additional remarks provided for this transaction."}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => handleDownloadInvoice(selectedPaymentLog)}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download PDF Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspend Modal */}
      <Modal
        id="suspend-modal"
        title="Suspend Organization Access"
        size="md"
        onClose={() => setSuspendReason("")}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to suspend access for <span className="font-bold text-slate-800">{organization?.organizationName}</span>? This will restrict all active users (staff and students) instantly.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Reason for Suspension
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Provide a reason for suspension..."
              className="w-full text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
              rows="3"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => closeModal("suspend-modal")}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSuspend}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              Suspend Access
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        id="delete-modal"
        title="Delete Organization Permanently"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete <span className="font-bold text-slate-800">{organization?.organizationName}</span>? This action is irreversible and will delete all schools, branches, staff, and students.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => closeModal("delete-modal")}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationDetails;
