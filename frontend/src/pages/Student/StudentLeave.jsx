/**
 * StudentLeaveManagement.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned Student Leave Management page.
 *
 * IMPORTANT — this redesign strictly reuses the shared component library
 * (Heading, DashGrid, DashCard, DataTable, Button, Modal, DataField,
 * SelectField, Option, ModalProfile, Grid, openModal/closeModal) and the
 * shared DatePicker. No duplicate inputs/tables/modals were created — every
 * piece of UI that already exists in Common_Components is reused as-is.
 *
 * BUSINESS LOGIC IS UNCHANGED. Only the visual layer was redesigned:
 *   • "Apply for Leave" moved from the page header into the Leave History
 *     table header (headerAction slot), as required.
 *   • Refresh lives inside the Leave History card via DataTable's built-in
 *     `onRefresh` toolbar button (no duplicate refresh button added).
 *   • A "View" row action opens a read-only details modal for a leave
 *     request (leave type, dates, days, reason, status, attachment).
 *
 * DATA LAYER: all mock/dummy data has been removed. The functions below call
 * the real API endpoints directly. If a request fails or returns no data,
 * the page falls back to safe empty values (never throws / never blanks the
 * whole page) — you'll just see the existing empty/error states instead of
 * a crash.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  Button,
  Modal,
  DataField,
  SelectField,
  Option,
  ModalProfile,
  Grid,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import DatePicker from "../../components/shared/DatePicker";
import {
  CalendarCheck2,
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  Eye,
  XCircle,
  Plus,
  Paperclip,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

import { studentApi } from "../../services/api/studentApi";

async function apiFetchStudentProfile() {
  try {
    const res = await studentApi.getProfile();
    return res?.data || res || null;
  } catch (err) {
    console.error("apiFetchStudentProfile failed:", err);
    return null;
  }
}

async function apiFetchLeaveStats() {
  try {
    const res = await studentApi.getLeaveStats();
    if (res?.success && res?.data) {
      return {
        totalApprovedDays: res.data.totalApprovedDays || 0,
        pendingRequests: res.data.pendingLeaves || 0,
        approvedRequests: res.data.approvedLeaves || 0,
        totalApplied: res.data.totalLeaves || 0
      };
    }
    return null;
  } catch (err) {
    console.error("apiFetchLeaveStats failed:", err);
    return null;
  }
}

async function apiFetchLeaveHistory() {
  try {
    const res = await studentApi.getLeaveHistory();
    if (res?.success && res?.data?.leaves) {
      return res.data.leaves.map(l => ({
        id: l.id || l._id,
        leaveType: l.leaveType,
        startDate: l.fromDate,
        endDate: l.toDate,
        days: l.totalDays,
        reason: l.reason,
        status: l.status.charAt(0).toUpperCase() + l.status.slice(1), // Capitalize lowercase backend enum strings
        attachmentUrl: l.supportingDocument || null,
        rejectionReason: l.rejectionReason || ""
      }));
    }
    return [];
  } catch (err) {
    console.error("apiFetchLeaveHistory failed:", err);
    return [];
  }
}

async function apiSubmitLeaveApplication(formData) {
  return studentApi.submitLeave(formData);
}

async function apiCancelLeaveRequest(leaveId) {
  return studentApi.cancelLeave(leaveId);
}

const LEAVE_TYPE_OPTIONS = ["Sick Leave", "Casual Leave", "Emergency Leave", "Other"];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL LOCAL HELPERS (not duplicating any shared component — plain markup)
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const FieldLabel = ({ children }) => (
  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
    {children}
  </label>
);

const FieldError = ({ children }) =>
  !children ? null : (
    <span className="text-xs font-semibold text-rose-500 mt-0.5 ml-1 flex items-center gap-1">
      <AlertTriangle size={13} className="flex-shrink-0" />
      {children}
    </span>
  );

const statusBadgeClasses = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Rejected":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "Cancelled":
      return "bg-slate-100 text-slate-500 border-slate-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const DetailRow = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.25em]">{label}</span>
    <div className="text-sm font-semibold text-[#1D1D1F]">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentLeaveManagement() {
  // ── Core data state (safe defaults — never left undefined) ─────────────
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  // ── Loading / error state ────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(null);

  // ── Toast notifications (no shared toast component exists in the library,
  //     so a minimal local one is used here) ──────────────────────────────
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Apply for Leave form state ───────────────────────────────────────────
  const emptyForm = { leaveType: "", startDate: "", endDate: "", reason: "", attachment: null };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Cancel Leave confirmation state ──────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // ── View Leave details state ─────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async ({ silent } = {}) => {
    if (!silent) setInitialError(null);
    try {
      const [profileRes, statsRes, historyRes] = await Promise.all([
        apiFetchStudentProfile(),
        apiFetchLeaveStats(),
        apiFetchLeaveHistory(),
      ]);
      // Each call above already falls back to a safe value on failure, so
      // this only throws for truly unexpected errors (e.g. Promise.all
      // itself). The page still gets usable, non-crashing state either way.
      setProfile(profileRes);
      setStats(statsRes);
      setHistory(historyRes || []);
    } catch (err) {
      setInitialError(err?.message || "Something went wrong while loading your leave data.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const refreshStatsAndHistory = useCallback(async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        apiFetchLeaveStats(),
        apiFetchLeaveHistory(),
      ]);
      setStats(statsRes);
      setHistory(historyRes || []);
    } catch (err) {
      addToast("error", "Could not refresh leave data. Please try again.");
    }
  }, [addToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Refresh button inside the Leave History card (DataTable's built-in
  // onRefresh) — reloads history, statistics AND profile per requirement #12.
  const handleTableRefresh = async () => {
    try {
      const [profileRes, statsRes, historyRes] = await Promise.all([
        apiFetchStudentProfile(),
        apiFetchLeaveStats(),
        apiFetchLeaveHistory(),
      ]);
      setProfile(profileRes);
      setStats(statsRes);
      setHistory(historyRes || []);
      addToast("success", "Leave data refreshed.");
    } catch {
      addToast("error", "Refresh failed. Please try again.");
    }
  };

  // ── Apply for Leave — validation ─────────────────────────────────────────
  const validateForm = () => {
    const errs = {};
    if (!form.leaveType) errs.leaveType = "Please select a leave type.";
    if (!form.startDate) errs.startDate = "Start date is required.";
    if (!form.endDate) errs.endDate = "End date is required.";
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      errs.endDate = "End date cannot be before the start date.";
    }
    if (!form.reason || !form.reason.trim()) errs.reason = "Please tell us the reason for leave.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetApplyForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setSubmitting(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, attachment: file }));
  };

  // ── Apply for Leave — submit ──────────────────────────────────────────────
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("leaveType", form.leaveType);
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("reason", form.reason);
      if (form.attachment) fd.append("attachment", form.attachment);

      await apiSubmitLeaveApplication(fd);

      addToast("success", "Leave application submitted successfully.");
      closeModal("apply-leave-modal");
      resetApplyForm();
      await refreshStatsAndHistory();
    } catch (err) {
      addToast("error", err?.message || "Failed to submit leave application.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel Leave ──────────────────────────────────────────────────────────
  const openCancelConfirm = (row) => {
    setCancelTarget(row);
    openModal("cancel-leave-modal");
  };

  const confirmCancelLeave = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiCancelLeaveRequest(cancelTarget.id);
      addToast("success", "Leave request cancelled.");
      closeModal("cancel-leave-modal");
      await refreshStatsAndHistory();
    } catch (err) {
      addToast("error", err?.message || "Failed to cancel leave request.");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  // ── View Leave details ────────────────────────────────────────────────────
  const openViewLeave = (row) => {
    setViewTarget(row);
    openModal("view-leave-modal");
  };

  // ── Leave History table config ───────────────────────────────────────────
  const leaveColumns = [
    { key: "leaveType", label: "Leave Type" },
    {
      key: "dates",
      label: "Leave Dates",
      sortValue: (row) => row.startDate,
      searchValue: (row) => `${row.startDate} ${row.endDate}`,
      render: (_, row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
    },
    { key: "days", label: "Days", align: "center", width: "80px" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
  ];

  const leaveActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => openViewLeave(row),
    },
    {
      icon: <Paperclip size={14} />,
      tooltip: "View Attachment",
      variant: "ghost",
      show: (row) => !!row.attachmentUrl,
      onClick: (row) => window.open(row.attachmentUrl, "_blank"),
    },
    {
      icon: <XCircle size={14} />,
      tooltip: "Cancel Leave",
      variant: "danger",
      show: (row) => row.status === "Pending",
      onClick: (row) => openCancelConfirm(row),
    },
  ];

  const applyLeaveButton = (
    <div className="w-full sm:w-auto">
      <Button
        text="Apply for Leave"
        icon={<Plus size={16} />}
        variant="primary"
        size={12}
        onClick={() => openModal("apply-leave-modal")}
      />
    </div>
  );

  // ── Full-page loading state ───────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#E2E8F0] border-t-[#223F74] animate-spin" />
          <p className="text-sm font-semibold text-[#6B7280]">Loading your leave dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Full-page error state ─────────────────────────────────────────────────
  if (initialError) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#E7E2DB] rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="text-[#D66B5F]" size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1D1D1F]">Couldn't load your leave data</h3>
            <p className="text-sm text-[#6B7280] mt-1">{initialError}</p>
          </div>
          <div className="w-full">
            <Button
              text="Retry"
              variant="primary"
              size={12}
              onClick={() => {
                setInitialLoading(true);
                loadAll();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Profile / teacher / stats may legitimately be null (e.g. brand-new
  // account, or API not wired up yet) — everything below is optional-chained
  // with "—" fallbacks so the page always renders instead of crashing.
  const teacher = profile?.classTeacher || {};

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* ── Page Header ── */}
        <Heading primaryText="Leave " secondaryText="Management" size={12} fontSize="2xl" />

        {/* ── Class Teacher ── */}
        <Grid cols={12} gap={4}>
          <div className="col-span-12">
            <ModalProfile
              name={teacher.name || "—"}
              subtitle="Class Teacher"
              meta={teacher.email || "—"}
              avatarColor="#223F74"
            />
          </div>
        </Grid>

        {/* ── Leave Statistics ── */}
        <DashGrid cols={12} gap={4}>
          <DashCard
            title="Total Approved Days"
            value={String(stats?.totalApprovedDays ?? "—")}
            icon={<CalendarCheck2 size={22} />}
            accentColor="#223F74"
            size={3}
          />
          <DashCard
            title="Pending Requests"
            value={String(stats?.pendingRequests ?? "—")}
            icon={<CalendarClock size={22} />}
            accentColor="#223F74"
            size={3}
          />
          <DashCard
            title="Approved Requests"
            value={String(stats?.approvedRequests ?? "—")}
            icon={<CheckCircle2 size={22} />}
            accentColor="#223F74"
            size={3}
          />
          <DashCard
            title="Total Leaves Applied"
            value={String(stats?.totalApplied ?? "—")}
            icon={<ClipboardList size={22} />}
            accentColor="#223F74"
            size={3}
          />
        </DashGrid>

        {/* ── Leave History ── */}
        {history.length === 0 ? (
          <div className="bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px] p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-black tracking-tight text-[#223F74]">Leave History</h2>
              {applyLeaveButton}
            </div>
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center">
                <ClipboardList className="text-[#223F74]" size={26} />
              </div>
              <p className="text-sm font-bold text-[#1D1D1F]">No leave applications yet</p>
              <p className="text-xs text-[#6B7280] max-w-xs text-center">
                Feeling under the weather or have somewhere to be? Apply for leave and your class
                teacher will review it shortly.
              </p>
            </div>
          </div>
        ) : (
          <DataTable
            title="Leave History"
            headerAction={applyLeaveButton}
            columns={leaveColumns}
            rows={history}
            actions={leaveActions}
            pageSize={5}
            pageSizeOptions={[5, 10, 20]}
            searchable={true}
            date={true}
            filterSize="lg"
            filters={[
              {
                title: "Status",
                type: "toggle",
                key: "status",
                options: ["Pending", "Approved", "Rejected", "Cancelled"],
              },
              { title: "Leave Type", type: "select", key: "leaveType", options: LEAVE_TYPE_OPTIONS },
            ]}
            ellipse={10}
            onRefresh={handleTableRefresh}
            size={12}
          />
        )}

        {/* ── Leave Guidelines ── */}
        <div className="bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F4F7FB] flex items-center justify-center">
              <Info size={18} className="text-[#223F74]" />
            </div>
            <h3 className="text-lg font-black text-[#223F74]">Leave Guidelines</h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {[
              "Submit leave applications at least 24 hours in advance, except in genuine medical emergencies.",
              "Sick leave beyond 2 consecutive days requires a valid medical certificate as a supporting document.",
              "Pending requests can be cancelled anytime before your class teacher reviews them.",
              "Approved leave days are deducted from your annual balance and reflected in your statistics above.",
              "Leave requests are typically reviewed within 2 working days.",
              "You'll receive a notification as soon as a decision is made on your request.",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#6B7280] font-medium">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#223F74] flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Apply for Leave Modal ── */}
      <Modal id="apply-leave-modal" title="Apply for Leave" size="md" onClose={resetApplyForm}>
        <form onSubmit={handleSubmitLeave} className="flex flex-col gap-5">
          <Grid cols={12} gap={4}>
            <SelectField
              label="Leave Type"
              id="leaveType"
              size={12}
              placeholder="Select leave type"
              value={form.leaveType}
              onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
            >
              {LEAVE_TYPE_OPTIONS.map((opt) => (
                <Option key={opt} value={opt} label={opt} />
              ))}
            </SelectField>
            {formErrors.leaveType && (
              <div className="col-span-12 -mt-3">
                <FieldError>{formErrors.leaveType}</FieldError>
              </div>
            )}

            <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
              <FieldLabel>Start Date</FieldLabel>
              <DatePicker
                value={form.startDate}
                onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
                placeholder="Select start date"
                maxDate={form.endDate || undefined}
              />
              <FieldError>{formErrors.startDate}</FieldError>
            </div>
            <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
              <FieldLabel>End Date</FieldLabel>
              <DatePicker
                value={form.endDate}
                onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
                placeholder="Select end date"
                minDate={form.startDate || undefined}
              />
              <FieldError>{formErrors.endDate}</FieldError>
            </div>

            <DataField
              label="Reason"
              id="reason"
              type="textarea"
              rows={4}
              size={12}
              placeholder="Briefly describe the reason for your leave"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              error={formErrors.reason}
            />

            <div className="col-span-12 flex flex-col gap-1.5">
              <FieldLabel>Supporting Document (optional)</FieldLabel>
              <label
                htmlFor="attachment"
                className="flex items-center gap-3 w-full rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F4F7FB] py-3.5 px-4 text-sm font-medium text-[#6B7280] cursor-pointer hover:border-[#223F74]/40 hover:bg-white transition"
              >
                <Paperclip size={17} className="text-[#223F74] flex-shrink-0" />
                <span className="truncate">
                  {form.attachment ? form.attachment.name : "Click to upload a file (PDF, JPG, PNG)"}
                </span>
                <input
                  id="attachment"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </Grid>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <Grid cols={12} gap={3}>
              <Button
                text="Cancel"
                variant="secondary"
                size={6}
                type="button"
                onClick={() => closeModal("apply-leave-modal")}
              />
              <Button
                text="Submit Application"
                variant="primary"
                size={6}
                type="submit"
                loading={submitting}
              />
            </Grid>
          </div>
        </form>
      </Modal>

      {/* ── View Leave Details Modal ── */}
      <Modal
        id="view-leave-modal"
        title="Leave Request Details"
        size="md"
        onClose={() => setViewTarget(null)}
      >
        {viewTarget && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <p className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.25em]">
                  Request ID
                </p>
                <p className="text-sm font-black text-[#223F74]">{viewTarget.id}</p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusBadgeClasses(
                  viewTarget.status
                )}`}
              >
                {viewTarget.status}
              </span>
            </div>

            <Grid cols={12} gap={4}>
              <div className="col-span-12 sm:col-span-6">
                <DetailRow label="Leave Type">{viewTarget.leaveType}</DetailRow>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <DetailRow label="Days">{viewTarget.days}</DetailRow>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <DetailRow label="Start Date">{formatDate(viewTarget.startDate)}</DetailRow>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <DetailRow label="End Date">{formatDate(viewTarget.endDate)}</DetailRow>
              </div>
              <div className="col-span-12">
                <DetailRow label="Reason">
                  <span className="font-medium text-[#334155] leading-relaxed">
                    {viewTarget.reason || "—"}
                  </span>
                </DetailRow>
              </div>
              {viewTarget.attachmentUrl && (
                <div className="col-span-12">
                  <DetailRow label="Supporting Document">
                    <button
                      type="button"
                      onClick={() => window.open(viewTarget.attachmentUrl, "_blank")}
                      className="inline-flex items-center gap-2 text-[#223F74] font-bold hover:underline"
                    >
                      <Paperclip size={15} />
                      View Attachment
                    </button>
                  </DetailRow>
                </div>
              )}
            </Grid>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <Grid cols={12} gap={3}>
                <div className="col-span-12">
                  <Button
                    text="Close"
                    variant="secondary"
                    size={12}
                    onClick={() => closeModal("view-leave-modal")}
                  />
                </div>
              </Grid>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel Leave Confirmation Modal ── */}
      <Modal
        id="cancel-leave-modal"
        title="Cancel Leave Request"
        size="sm"
        onClose={() => setCancelTarget(null)}
      >
        {cancelTarget && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <AlertTriangle className="text-[#D66B5F] flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-[#334155] font-medium">
                Are you sure you want to cancel your <b>{cancelTarget.leaveType}</b> request for{" "}
                {formatDate(cancelTarget.startDate)} – {formatDate(cancelTarget.endDate)}? This
                action cannot be undone.
              </p>
            </div>
            <Grid cols={12} gap={3}>
              <Button
                text="Keep Request"
                variant="secondary"
                size={6}
                onClick={() => closeModal("cancel-leave-modal")}
              />
              <Button
                text="Yes, Cancel"
                variant="danger"
                size={6}
                loading={cancelling}
                onClick={confirmCancelLeave}
              />
            </Grid>
          </div>
        )}
      </Modal>

      {/* ── Toast Notifications ── */}
      <div className="fixed top-4 right-4 z-[10050] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 shadow-xl border text-sm font-semibold ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : t.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-700"
                : "bg-white border-[#E2E8F0] text-[#223F74]"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            ) : t.type === "error" ? (
              <XCircle size={18} className="flex-shrink-0 mt-0.5" />
            ) : (
              <Info size={18} className="flex-shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}