import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LogOut,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Clock,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  fetchResignations,
  approveResignation,
  rejectResignation,
} from "../../../services/hrmApi";

import {
  Heading,
  Select,
  Option,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Modal,
  openModal,
  closeModal,
  PanelModal,
  Button,
  DataField,
  ModalData,
  ModalGrid
} from "../../../components/shared/Common_Components";

const statusFilters = ["All", "Pending", "Approved", "Rejected"];

const normalizeStatus = (status = "") => {
  if (status === "accepted") return "approved";
  return status;
};

const toTitle = (status = "") =>
  status.charAt(0).toUpperCase() + status.slice(1);

const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
};

const Resignations = () => {
  const [filterStatus, setFilterStatus] = useState("All");
  const [resignations, setResignations] = useState([]);
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [approveModalData, setApproveModalData] = useState(null);
  const [rejectModalData, setRejectModalData] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadResignations = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Fetch real data from your hrmController.js endpoint
        const response = await fetchResignations();
        
        const rows = (response?.data || []).map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
        }));
        
        setResignations(rows);
      } catch (err) {
        setError(err.message || "Failed to load resignations");
      } finally {
        setLoading(false);
      }
    };

    loadResignations();
  }, []);

  const filteredResignations = useMemo(() => {
    if (filterStatus === "All") return resignations;
    return resignations.filter((item) => toTitle(item.status) === filterStatus);
  }, [filterStatus, resignations]);

  const totalRequests = resignations.length;
  const pendingCount = resignations.filter((item) => item.status === "pending").length;
  const approvedCount = resignations.filter((item) => item.status === "approved").length;
  const rejectedCount = resignations.filter((item) => item.status === "rejected").length;

  const patchRow = (id, status) => {
    setResignations((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status } : item)),
    );
    setSelectedResignation((prev) =>
      prev && prev._id === id ? { ...prev, status } : prev,
    );
  };

  const handleApprove = async () => {
    if (!approveModalData) return;
    try {
      setSubmitting(true);
      await approveResignation(approveModalData._id, {
        remarks: approveRemarks,
      });
      patchRow(approveModalData._id, "approved");
      toast.success("Resignation approved");
      closeModal("approve-modal");
      setTimeout(() => {
        setApproveModalData(null);
        setApproveRemarks("");
      }, 300);
    } catch (err) {
      setError(err.message || "Failed to approve resignation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModalData || !rejectReason.trim()) return;
    try {
      setSubmitting(true);
      await rejectResignation(rejectModalData._id, {
        rejectionReason: rejectReason,
      });
      patchRow(rejectModalData._id, "rejected");
      toast.success("Resignation rejected");
      closeModal("reject-modal");
      setTimeout(() => {
        setRejectModalData(null);
        setRejectReason("");
      }, 300);
    } catch (err) {
      setError(err.message || "Failed to reject resignation");
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (row) => {
    setApproveModalData(row);
    setApproveRemarks("");
    setTimeout(() => openModal("approve-modal"), 50);
  };

  const openRejectModal = (row) => {
    setRejectModalData(row);
    setRejectReason("");
    setTimeout(() => openModal("reject-modal"), 50);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-[1600px] mx-auto space-y-6"
    >
      <Heading
        primaryText="Resignations"
        secondaryText="& Exits"
        icon={<LogOut className="text-[#223F74] w-6 h-6 sm:w-8 sm:h-8" />}
        size={12}
        showAnimations
      />

      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="w-full sm:w-64">
          <Select
            id="status-filter"
            size={12}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statusFilters.map((s) => (
              <Option key={s} value={s} label={s} />
            ))}
          </Select>
        </div>
      </div>

      {!!error && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-2 text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      <div>
        <DashGrid cols={12} gap={6}>
          <EnhancedDashCard
            title="Total Requests"
            value={totalRequests}
            icon={<Users size={22} />}
            size={3}
            accentColor="#64748b"
            showAnimations
          />
          <EnhancedDashCard
            title="Pending"
            value={pendingCount}
            icon={<Clock size={22} />}
            size={3}
            accentColor="#f59e0b"
            showAnimations
          />
          <EnhancedDashCard
            title="Approved"
            value={approvedCount}
            icon={<ThumbsUp size={22} />}
            size={3}
            accentColor="#10b981"
            showAnimations
          />
          <EnhancedDashCard
            title="Rejected"
            value={rejectedCount}
            icon={<ThumbsDown size={22} />}
            size={3}
            accentColor="#f43f5e"
            showAnimations
          />
        </DashGrid>
      </div>

      <div>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-semibold text-sm">Loading resignations...</span>
          </div>
        ) : (
          <DataTable
            title="Resignation Records"
            size={12}
            searchable={true}
            pageSize={10}
            columns={[
              {
                key: "staff",
                label: "Staff Name",
                render: (_, row) => row?.staffId?.name || "-",
              },
              {
                key: "role",
                label: "Role",
                render: (_, row) => row?.staffId?.role || "-",
              },
              {
                key: "branch",
                label: "Branch",
                render: (_, row) => row?.school?.schoolName || "-",
              },
              {
                key: "appliedOn",
                label: "Applied On",
                render: (_, row) => formatDate(row.resignationDate),
              },
              {
                key: "lwd",
                label: "Last Working Day",
                render: (_, row) => formatDate(row.lastWorkingDate),
              },
              {
                key: "status",
                label: "Status",
                align: "center",
                render: (_, row) => {
                  const viewStatus = toTitle(row.status);
                  let badgeCls = "bg-slate-100 text-slate-600";
                  if (viewStatus === "Approved") badgeCls = "bg-emerald-100 text-emerald-700";
                  if (viewStatus === "Pending") badgeCls = "bg-amber-100 text-amber-700";
                  if (viewStatus === "Rejected") badgeCls = "bg-rose-100 text-rose-700";
                  return (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}>
                      {viewStatus}
                    </span>
                  );
                },
              },
            ]}
            actions={[
              {
                icon: <Eye size={13} />,
                tooltip: "View Details",
                variant: "ghost",
                onClick: (row) => setSelectedResignation(row),
              },
              {
                icon: <CheckCircle2 size={13} />,
                tooltip: "Approve",
                variant: "primary",
                show: (row) => row.status === "pending",
                onClick: (row) => openApproveModal(row),
              },
              {
                icon: <XCircle size={13} />,
                tooltip: "Reject",
                variant: "danger",
                show: (row) => row.status === "pending",
                onClick: (row) => openRejectModal(row),
              },
            ]}
            rows={filteredResignations}
          />
        )}
      </div>

      <PanelModal
        id="view-resignation-modal"
        title="Resignation Details"
        isVisible={!!selectedResignation}
        onClose={() => setSelectedResignation(null)}
        size="lg"
      >
        {selectedResignation && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800">
                {selectedResignation?.staffId?.name || "-"}
              </h3>
              <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">
                {selectedResignation?.staffId?.email || "-"}
              </p>
            </div>

            <ModalGrid cols={2} title="Employee Details">
              <ModalData label="Role" value={selectedResignation?.staffId?.role || "-"} />
              <ModalData label="Branch" value={selectedResignation?.school?.schoolName || "-"} />
              <ModalData label="Applied On" value={formatDate(selectedResignation.resignationDate)} />
              <ModalData label="Last Working Day" value={formatDate(selectedResignation.lastWorkingDate)} />
            </ModalGrid>

            <div className="rounded-2xl border border-slate-100 p-5 mb-8 bg-blue-50/30">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Reason for Resignation
              </p>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedResignation.reason || "-"}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              <Button
                text="Close Details"
                variant="secondary"
                size={selectedResignation.status === "pending" ? 4 : 12}
                onClick={() => setSelectedResignation(null)}
              />
              {selectedResignation.status === "pending" && (
                <>
                  <Button
                    text="Approve Request"
                    variant="primary"
                    size={4}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedResignation(null);
                      setTimeout(() => openApproveModal(selectedResignation), 300);
                    }}
                  />
                  <Button
                    text="Reject Request"
                    variant="danger"
                    size={4}
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedResignation(null);
                      setTimeout(() => openRejectModal(selectedResignation), 300);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </PanelModal>

      <Modal id="approve-modal" title="Approve Resignation" size="md">
        {approveModalData && (
          <div className="flex flex-col gap-4">
            <div className="mb-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-sm">
              <p className="font-bold text-slate-700">
                Staff:{" "}
                <span className="font-semibold text-blue-700">
                  {approveModalData?.staffId?.name}
                </span>
              </p>
            </div>
            <DataField
              id="approve-remarks"
              label="Remarks (Optional)"
              type="textarea"
              rows={3}
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Add internal remarks or notes..."
              size={12}
            />
            <div className="flex gap-3 mt-4">
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => {
                  closeModal("approve-modal");
                  setTimeout(() => setApproveModalData(null), 300);
                }}
                size={6}
              />
              <Button
                text={submitting ? "Approving..." : "Confirm Approval"}
                variant="primary"
                disabled={submitting}
                loading={submitting}
                onClick={handleApprove}
                size={6}
                icon={<CheckCircle2 className="w-4 h-4" />}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal id="reject-modal" title="Reject Resignation" size="md">
        {rejectModalData && (
          <div className="flex flex-col gap-4">
            <div className="mb-2 p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-sm">
              <p className="font-bold text-slate-700">
                Staff:{" "}
                <span className="font-semibold text-rose-700">
                  {rejectModalData?.staffId?.name}
                </span>
              </p>
            </div>
            <DataField
              id="reject-reason"
              label="Reason for Rejection *"
              type="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please explain why this resignation is being rejected..."
              size={12}
            />
            <div className="flex gap-3 mt-4">
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => {
                  closeModal("reject-modal");
                  setTimeout(() => setRejectModalData(null), 300);
                }}
                size={6}
              />
              <Button
                text={submitting ? "Rejecting..." : "Confirm Rejection"}
                variant="danger"
                disabled={!rejectReason.trim() || submitting}
                loading={submitting}
                onClick={handleReject}
                size={6}
                icon={<XCircle className="w-4 h-4" />}
              />
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Resignations;