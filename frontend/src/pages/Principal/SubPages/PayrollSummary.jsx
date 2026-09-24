import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Banknote, Eye, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  fetchPrincipalPayroll,
  approvePrincipalPayroll,
  rejectPrincipalPayroll,
} from "../../../services/api/principalApi";

import {
  Grid,
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


const formatCurrency = (amount = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const PayrollSummary = () => {

  const [payrollRows, setPayrollRows] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [approvalPayroll, setApprovalPayroll] = useState(null);
  const [rejectPayrollRow, setRejectPayrollRow] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPayrollData = async () => {
      try {
        setLoading(true);
        setError("");
        
        const payrollResponse = await fetchPrincipalPayroll();

        if (!active) return;
        setPayrollRows(payrollResponse?.data || []);

      } catch (err) {
        if (active) setError(err.message || "Failed to load payroll data");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPayrollData();

    return () => { active = false; };
  }, []);

  const totals = useMemo(() => {
    const totalSalary = payrollRows.reduce((sum, row) => sum + (row.netSalary || 0), 0);
    const draftCount = payrollRows.filter((row) => row.payrollStatus === "draft").length;
    const approvedCount = payrollRows.filter((row) => row.payrollStatus === "approved").length;
    return { totalSalary, draftCount, approvedCount };
  }, [payrollRows]);

  const patchStatus = (id, status) => {
    setPayrollRows((prev) => prev.map((row) => row._id === id ? { ...row, payrollStatus: status } : row));
    setSelectedPayroll((prev) => prev && prev._id === id ? { ...prev, payrollStatus: status } : prev);
  };

  const handleApprove = async () => {
    if (!approvalPayroll) return;
    try {
      setSubmitting(true);
      await approvePrincipalPayroll(approvalPayroll._id, { remarks });
      patchStatus(approvalPayroll._id, "approved");
      toast.success("Payroll approved");
      closeModal("approve-modal");
      setTimeout(() => { setApprovalPayroll(null); setRemarks(""); }, 300);
    } catch (err) {
      setError(err.message || "Failed to approve payroll");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectPayrollRow || !rejectReason.trim()) return;
    try {
      setSubmitting(true);
      await rejectPrincipalPayroll(rejectPayrollRow._id, { rejectionReason: rejectReason });
      patchStatus(rejectPayrollRow._id, "rejected");
      toast.success("Payroll rejected");
      closeModal("reject-modal");
      setTimeout(() => { setRejectPayrollRow(null); setRejectReason(""); }, 300);
    } catch (err) {
      setError(err.message || "Failed to reject payroll");
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (row) => { setApprovalPayroll(row); setRemarks(""); setTimeout(() => openModal("approve-modal"), 50); };
  const openRejectModal = (row) => { setRejectPayrollRow(row); setRejectReason(""); setTimeout(() => openModal("reject-modal"), 50); };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="w-full max-w-[1600px] mx-auto space-y-6">
      <Heading primaryText="Payroll" secondaryText="Summary" icon={<Banknote className="text-[#223F74] w-6 h-6 sm:w-8 sm:h-8" />} size={12} showAnimations />


      {!!error && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-2 text-red-700">
          <AlertCircle size={18} className="shrink-0" /> <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      <div>
        <DashGrid cols={12} gap={6}>
          <EnhancedDashCard title="Total Salary Amount" value={formatCurrency(totals.totalSalary)} icon={<Banknote size={22} />} size={4} accentColor="#3b82f6" showAnimations />
          <EnhancedDashCard title="Pending Approvals" value={totals.draftCount} icon={<AlertCircle size={22} />} size={4} accentColor="#f59e0b" showAnimations />
          <EnhancedDashCard title="Approved Records" value={totals.approvedCount} icon={<CheckCircle2 size={22} />} size={4} accentColor="#10b981" showAnimations />
        </DashGrid>
      </div>

      <Grid cols={12} gap={4}>
        {loading ? (
          <div className="col-span-12 py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <Loader2 className="animate-spin" size={24} /> <span className="font-semibold text-sm">Loading payroll records...</span>
          </div>
        ) : (
          <DataTable
            title="Payroll Records"
            size={12}
            searchable={true}
            exportable={true}
            exportFileName="payroll_summary"
            pageSizeOptions={[5, 10, 20, 50]}
            columns={[
              { key: "staff", label: "Staff", render: (_, row) => row?.staffId?.name || "-" },
              { key: "role", label: "Role", render: (_, row) => row?.staffId?.role || "-" },
              { key: "month", label: "Month", render: (_, row) => formatDate(row.payrollMonth) },
              { key: "salary", label: "Salary Amount", align: "right", render: (_, row) => formatCurrency(row.netSalary || 0) },
              { key: "status", label: "Status", align: "center", render: (_, row) => {
                  let badgeCls = "bg-slate-100 text-slate-600";
                  if (row.payrollStatus === "approved") badgeCls = "bg-emerald-100 text-emerald-700";
                  if (row.payrollStatus === "draft") badgeCls = "bg-amber-100 text-amber-700";
                  if (row.payrollStatus === "rejected") badgeCls = "bg-rose-100 text-rose-700";
                  return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}>{row.payrollStatus || "-"}</span>;
                },
              },
            ]}
            actions={[
              { icon: <Eye size={13} />, tooltip: "View Details", variant: "ghost", onClick: (row) => setSelectedPayroll(row) },
              { icon: <CheckCircle2 size={13} />, tooltip: "Approve", variant: "primary", show: (row) => row.payrollStatus === "draft", onClick: (row) => openApproveModal(row) },
              { icon: <XCircle size={13} />, tooltip: "Reject", variant: "danger", show: (row) => row.payrollStatus === "draft", onClick: (row) => openRejectModal(row) },
            ]}
            rows={payrollRows}
            pageSize={10}
          />
        )}
      </Grid>

      <PanelModal id="view-payroll-modal" title="Payroll Details" isVisible={!!selectedPayroll} onClose={() => setSelectedPayroll(null)} size="lg">
        {selectedPayroll && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800">{selectedPayroll?.staffId?.name || "-"}</h3>
              <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">Role: {selectedPayroll?.staffId?.role || "-"}</p>
            </div>
            <ModalGrid cols={2} title="Salary Information">
              <ModalData label="Gross Salary" value={formatCurrency(selectedPayroll.grossSalary || 0)} />
              <ModalData label="Net Salary" value={formatCurrency(selectedPayroll.netSalary || 0)} />
              <ModalData label="Total Deductions" value={formatCurrency(selectedPayroll.totalDeductions || 0)} />
              <ModalData label="Status" value={<span className="uppercase tracking-widest text-xs font-black">{selectedPayroll.payrollStatus}</span>} />
            </ModalGrid>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button text="Close Details" variant="secondary" size={12} onClick={() => setSelectedPayroll(null)} />
            </div>
          </div>
        )}
      </PanelModal>

      <Modal id="approve-modal" title="Approve Payroll" size="md">
        {approvalPayroll && (
          <Grid cols={12} gap={4}>
            <div className="col-span-12 mb-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-sm">
              <p className="font-bold text-slate-700">Staff: <span className="font-semibold text-blue-700">{approvalPayroll?.staffId?.name}</span></p>
              <p className="font-bold text-slate-700 mt-1">Net Pay: <span className="font-black text-emerald-600">{formatCurrency(approvalPayroll?.netSalary)}</span></p>
            </div>
            <DataField id="approve-remarks" label="Remarks (Optional)" type="textarea" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add approval remarks..." size={12} />
            <div className="col-span-12 flex gap-3 mt-4">
              <Button text="Cancel" variant="secondary" onClick={() => { closeModal("approve-modal"); setTimeout(() => setApprovalPayroll(null), 300); }} size={6} />
              <Button text={submitting ? "Processing..." : "Confirm Approval"} variant="primary" disabled={submitting} loading={submitting} onClick={handleApprove} size={6} icon={<CheckCircle2 className="w-4 h-4" />} />
            </div>
          </Grid>
        )}
      </Modal>

      <Modal id="reject-modal" title="Reject Payroll" size="md">
        {rejectPayrollRow && (
          <Grid cols={12} gap={4}>
            <div className="col-span-12 mb-2 p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-sm">
              <p className="font-bold text-slate-700">Staff: <span className="font-semibold text-rose-700">{rejectPayrollRow?.staffId?.name}</span></p>
            </div>
            <DataField id="reject-reason" label="Reason for Rejection *" type="textarea" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Please explain why this is being rejected..." size={12} />
            <div className="col-span-12 flex gap-3 mt-4">
              <Button text="Cancel" variant="secondary" onClick={() => { closeModal("reject-modal"); setTimeout(() => setRejectPayrollRow(null), 300); }} size={6} />
              <Button text={submitting ? "Rejecting..." : "Confirm Rejection"} variant="danger" disabled={!rejectReason.trim() || submitting} loading={submitting} onClick={handleReject} size={6} icon={<XCircle className="w-4 h-4" />} />
            </div>
          </Grid>
        )}
      </Modal>
    </motion.div>
  );
};

export default PayrollSummary;