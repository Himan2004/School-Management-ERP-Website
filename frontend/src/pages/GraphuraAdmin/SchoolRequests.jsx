import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import OrganizationDetailsModal from "../../components/GraphuraAdmin/Organizationdetailsmodal";
import {
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Clock,
  AlertCircle,
  DollarSign,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Save,
  Settings,
  X,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  fetchOrganizationRequests,
  approveOrganizationRequest,
  rejectOrganizationRequest,
  fetchOrganizationRequestStats,
} from "../../services/api/graphuraApi";
import { Modal, openModal, closeModal, Button } from "../../components/shared/Common_Components";

const OrganizationRequests = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [localRequests, setLocalRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [selectedApproveRequest, setSelectedApproveRequest] = useState(null);
  const [targetAmount, setTargetAmount] = useState(0);
  const [lockedTargetAmount, setLockedTargetAmount] = useState(0);
  const [isProceedCompleted, setIsProceedCompleted] = useState(false);
  const [renewData, setRenewData] = useState({
    billingCycle: "Yearly",
    customExpiryDate: "",
  });
  const [batchPayments, setBatchPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({
    amount: "",
    method: "Online Transfer",
    remark: "",
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [requestsRes, statsRes] = await Promise.all([
        fetchOrganizationRequests({ page: 1, limit: 50 }),
        fetchOrganizationRequestStats(),
      ]);

      const requests = requestsRes.data.data.requests;
      setLocalRequests(requests);

      const breakdown = statsRes.data.data.statusBreakdown;
      const pendingCount = breakdown.pending || 0;
      const approvedCount = breakdown.approved || 0;
      const deactivatedCount =
        (breakdown.deactivated || 0) + (breakdown.rejected || 0);

      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: deactivatedCount,
        total: pendingCount + approvedCount + deactivatedCount,
      });
    } catch (error) {
      toast.error("Failed to load organization requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleProceed = () => {
    if (isProceedCompleted) return;
    if (!currentPayment.amount || isNaN(Number(currentPayment.amount))) {
      toast.error("Please enter a valid amount");
      return;
    }
    const val = Number(currentPayment.amount);
    if (val < 0) {
      toast.error("Payment amount cannot be negative.");
      return;
    }
    if (val < Number(lockedTargetAmount)) {
      toast.error("Payment amount must cover the subscription amount.");
      return;
    }
    if (val > Number(lockedTargetAmount)) {
      toast.error("Payment amount cannot exceed the subscription amount.");
      return;
    }

    setBatchPayments([
      {
        id: Date.now(),
        amount: currentPayment.amount,
        method: currentPayment.method,
        remark: currentPayment.remark,
      },
    ]);
    setIsProceedCompleted(true);
    toast.success("Payment details verified. Ready to approve.");
  };

  // ─── DYNAMIC PAYMENT MATH ───
  const isRenewal = renewData.billingCycle !== "None";
  const effectiveTarget = isRenewal ? Math.max(0, Number(lockedTargetAmount) || 0) : 0;
  const previousOutstanding = 0;
  const totalDue = effectiveTarget + previousOutstanding;

  const totalPaidSoFar = isProceedCompleted
    ? batchPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    : Number(currentPayment.amount) || 0;

  const isPaymentShort = totalPaidSoFar < totalDue;
  const overpayment = totalPaidSoFar > totalDue ? totalPaidSoFar - totalDue : 0;
  const isOverpaying = totalPaidSoFar > totalDue;

  const isConfirmDisabled =
    !isProceedCompleted ||
    lockedTargetAmount === "" ||
    Number(lockedTargetAmount) <= 0 ||
    batchPayments.length === 0 ||
    totalPaidSoFar < totalDue ||
    isOverpaying;

  const confirmButtonText = "Approve & Activate";

  const handleApprove = (request) => {
    setSelectedApproveRequest(request);
    setBatchPayments([]);
    setTargetAmount(0);
    setLockedTargetAmount(0);
    setIsProceedCompleted(false);
    setCurrentPayment({
      amount: "",
      method: "Online Transfer",
      remark: "",
    });
    setRenewData({
      billingCycle: "Yearly",
      customExpiryDate: "",
    });
    openModal("approve-billing-modal");
  };

  const handleConfirmApproval = async () => {
    const val = Number(lockedTargetAmount);
    if (isNaN(val) || val < 0) {
      toast.error("Subscription amount cannot be negative.");
      return;
    }

    try {
      let finalPayments = batchPayments.map((p) => ({
        amount: Number(p.amount),
        method: p.method,
        remark: p.remark,
      }));

      await approveOrganizationRequest(selectedApproveRequest._id, {
        targetAmount: Number(lockedTargetAmount),
        billingCycle: renewData.billingCycle,
        customExpiryDate: renewData.customExpiryDate || null,
        batchPayments: finalPayments,
      });

      toast.success(`${selectedApproveRequest.organizationName} activated successfully!`);

      setLocalRequests((prev) =>
        prev.map((req) =>
          req._id === selectedApproveRequest._id ? { ...req, status: "approved" } : req,
        ),
      );

      closeModal("approve-billing-modal");
      setSelectedApproveRequest(null);
      setBatchPayments([]);
      setCurrentPayment({ amount: "", method: "Online Transfer", remark: "" });

      // Reload stats and requests
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to activate request");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }
    try {
      await rejectOrganizationRequest(selectedRequest._id, rejectReason);
      toast.success(`${selectedRequest.organizationName} declined`);
      setLocalRequests((prev) =>
        prev.map((req) =>
          req._id === selectedRequest._id
            ? { ...req, status: "deactivated", rejectionReason: rejectReason }
            : req,
        ),
      );
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to decline request");
    }
  };

  const handleOpenReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = filteredRequests.map((req) => ({
        "Organization Name": req.organizationName,
        "Registration Number": req.registrationNumber,
        Email: req.officialEmail,
        Phone: req.contactNumber,
        City: req.city,
        State: req.state,
        Type: req.organizationType,
        Status:
          req.status === "approved"
            ? "active"
            : req.status === "rejected" || req.status === "deactivated"
              ? "declined"
              : req.status,
        "HQ Address": req.address,
        "Administrator Name": req.adminName,
        "Administrator Email": req.adminEmail,
        "Administrator Phone": req.adminPhone,
        "Submitted Date": req.createdAt
          ? format(new Date(req.createdAt), "PPP")
          : "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Organization Requests",
      );
      XLSX.writeFile(
        workbook,
        `organization_requests_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success("Export completed successfully!");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };



  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map((r) => r._id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkApprove = async () => {
    for (const id of selectedRequests) {
      const request = localRequests.find((r) => r._id === id);
      if (request && request.status === "pending") {
        await handleApprove(request);
      }
    }
    setSelectedRequests([]);
    setSelectAll(false);
    toast.success(`${selectedRequests.length} requests activated`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case "rejected":
      case "deactivated":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  const filteredRequests = localRequests.filter((request) => {
    const matchesSearch =
      !searchTerm ||
      request.organizationName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.officialEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.registrationNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.adminName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      request.status === filterStatus ||
      (filterStatus === "deactivated" && request.status === "rejected");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Organization Registration Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage organization registration applications
          </p>
        </div>
        <div className="flex gap-2">
          

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Requests</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">All time requests</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Pending</span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Active</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-gray-500 mt-1">Successfully onboarded</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Declined</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-xs text-gray-500 mt-1">Declined applications</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by organization name, email, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Active</option>
            <option value="deactivated">Declined</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <motion.div
            key={request._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
              selectedRequests.includes(request._id)
                ? "border-indigo-300 ring-2 ring-indigo-200"
                : "border-gray-100"
            } hover:shadow-md`}
          >
            <div className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedRequests.includes(request._id)}
                      onChange={() => {
                        if (selectedRequests.includes(request._id)) {
                          setSelectedRequests(
                            selectedRequests.filter((id) => id !== request._id),
                          );
                        } else {
                          setSelectedRequests([
                            ...selectedRequests,
                            request._id,
                          ]);
                        }
                      }}
                      className="mt-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />

                    {/* Organization Icon */}
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {request.organizationName}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 min-w-0">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span
                            className="truncate"
                            title={request.officialEmail}
                          >
                            {request.officialEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 min-w-0">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span
                            className="truncate"
                            title={request.contactNumber}
                          >
                            {request.contactNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 min-w-0">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span
                            className="truncate"
                            title={`${request.city}, ${request.state}`}
                          >
                            {request.city}, {request.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          Applied:{" "}
                          {format(new Date(request.createdAt), "dd MMM yyyy")}
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {expandedId === request._id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Organization Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="text-gray-500">
                                    Registration No:
                                  </span>{" "}
                                  {request.registrationNumber}
                                </p>
                                <p>
                                  <span className="text-gray-500">
                                    Established:
                                  </span>{" "}
                                  {request.yearEstablished}
                                </p>
                                <p>
                                  <span className="text-gray-500">Type:</span>{" "}
                                  {request.organizationType}
                                </p>
                                <p>
                                  <span className="text-gray-500">
                                    Branches:
                                  </span>{" "}
                                  {request.numberOfBranches}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Administrator Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="text-gray-500">Name:</span>{" "}
                                  {request.adminName}
                                </p>
                                <p>
                                  <span className="text-gray-500">Email:</span>{" "}
                                  {request.adminEmail}
                                </p>
                                <p>
                                  <span className="text-gray-500">Phone:</span>{" "}
                                  {request.adminPhone}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === request._id ? null : request._id,
                      )
                    }
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title={
                      expandedId === request._id ? "Show Less" : "View More"
                    }
                  >
                    {expandedId === request._id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailsModal(true);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Full Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {request.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(request)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Activate
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No organization requests found</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedRequest && (
          <OrganizationDetailsModal
            request={selectedRequest}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedRequest(null);
            }}
            onApprove={handleApprove}
            onReject={handleOpenReject}
          />
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      {createPortal(
        <AnimatePresence>
          {showRejectModal && selectedRequest && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowRejectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Decline Organization Request
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to decline{" "}
                    <span className="font-medium">
                      {selectedRequest?.organizationName}
                    </span>
                    's registration request?
                  </p>
                  <textarea
                    rows="3"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason for declining..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectReason("");
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Decline Request
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── APPROVE ORGANIZATION & BILLING MODAL ── */}
      <Modal
        id="approve-billing-modal"
        title="Approve Organization & Billing"
        size="xl"
      >
        {selectedApproveRequest && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  {selectedApproveRequest.organizationName}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Initial Organization Setup & Billing
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2">
              {/* Left Column: Payments */}
              <div className="flex flex-col space-y-6">
                {/* Target Amount Header */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Subscription Amount
                    </p>
                  </div>

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
                      setIsProceedCompleted(false);
                      setBatchPayments([]);
                      if (val === "") {
                        setTargetAmount("");
                        setLockedTargetAmount("");
                        return;
                      }
                      const numVal = Number(val);
                      if (numVal < 0) {
                        setTargetAmount(0);
                        setLockedTargetAmount(0);
                      } else {
                        setTargetAmount(val);
                        setLockedTargetAmount(val);
                      }
                    }}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-2xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Add Payment Form */}
                <div
                  className="border border-slate-200 rounded-2xl p-5 bg-white transition-all"
                >
                  <h4 className="font-bold text-slate-800 text-base mb-4">
                    Add Payment
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={currentPayment.amount}
                        onChange={(e) => {
                          setCurrentPayment({
                            ...currentPayment,
                            amount: e.target.value,
                          });
                          setIsProceedCompleted(false);
                          setBatchPayments([]);
                        }}
                        className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                      <select
                        value={currentPayment.method}
                        onChange={(e) => {
                          setCurrentPayment({
                            ...currentPayment,
                            method: e.target.value,
                          });
                          setIsProceedCompleted(false);
                          setBatchPayments([]);
                        }}
                        className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
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
                      onChange={(e) => {
                        setCurrentPayment({
                          ...currentPayment,
                          remark: e.target.value,
                        });
                        setIsProceedCompleted(false);
                        setBatchPayments([]);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                    <Button
                      text={isProceedCompleted ? "Proceeded" : "Proceed"}
                      onClick={handleProceed}
                      disabled={isProceedCompleted}
                      variant="primary"
                    />
                  </div>
                </div>
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
                        Billing Cycle
                      </label>
                      <div className="relative">
                        <select
                          value={renewData.billingCycle}
                          onChange={(e) => {
                            setRenewData({
                              ...renewData,
                              billingCycle: e.target.value,
                            });
                            setIsProceedCompleted(false);
                            setBatchPayments([]);
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 appearance-none transition-all"
                        >
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
                            onChange={(e) => {
                              setRenewData({
                                ...renewData,
                                customExpiryDate: e.target.value,
                              });
                              setIsProceedCompleted(false);
                              setBatchPayments([]);
                            }}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-auto pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-500">
                        Subscription Cost:
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{effectiveTarget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-700">
                        Total Payable:
                      </span>
                      <span className="font-black text-slate-900 text-lg">
                        ₹{totalDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-500">
                        Total Logged:
                      </span>
                      <span className="font-bold text-emerald-600 text-lg">
                        ₹{totalPaidSoFar.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-500">
                        Remaining Amount:
                      </span>
                      <span className={`font-bold text-lg ${totalDue - totalPaidSoFar > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                        ₹{Math.max(0, totalDue - totalPaidSoFar).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-500">
                        Payment Status:
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${totalPaidSoFar >= totalDue && totalDue > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {totalPaidSoFar >= totalDue && totalDue > 0 ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>

                    {totalDue > 0 && isPaymentShort && (
                      <div className="flex gap-3 p-3 mt-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl text-[#92400e]">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#f59e0b]" />
                        <p className="text-xs font-medium leading-relaxed">
                          Payment is less than the total due.{" "}
                          <span className="font-bold text-red-600">
                            You must clear the full balance to activate the
                            cycle.
                          </span>
                        </p>
                      </div>
                    )}
                    {totalPaidSoFar >= totalDue &&
                      totalDue > 0 &&
                      overpayment === 0 && (
                        <div className="flex gap-3 p-3 mt-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-[#065f46]">
                          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#10b981]" />
                          <p className="text-xs font-medium leading-relaxed">
                            Payment exactly covers the total due.
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
                  onClick={handleConfirmApproval}
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
        )}
      </Modal>

      {/* Loading State */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-600">Loading requests...</span>
        </div>
      )}
    </div>
  );
};

export default OrganizationRequests;
