import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Save,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  getAdminStaffList,
  getAdminStaffAttendanceReport,
  saveAdminStaffAttendance,
  getAdminStaffPendingLeaves,
  processAdminStaffLeave
} from "../../../services/api/AdminAttendanceApi";
import {
  Button,
  DashGrid,
  DataField,
  DataTable,
  EnhancedDashCard,
  Grid,
  Heading,
  Modal,
  Option,
  Select,
  SelectField,
  closeModal,
  openModal,
} from "../../../components/shared/Common_Components";

const ROLE_OPTIONS = [
  { value: "all", label: "Teachers & Accountants" },
  { value: "teacher", label: "Teachers" },
  { value: "accountant", label: "Accountants" },
];

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
];

const roleLabel = (role) => {
  if (role === "teacher") return "Teacher";
  if (role === "accountant") return "Accountant";
  return role || "Staff";
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
};

const getProfilePhone = (staff) =>
  staff.phone || staff.profileId?.phone || staff.profileId?.phoneNumber || "—";

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#E7E2DB] bg-white p-12 text-center shadow-[0_6px_20px_rgba(0,0,0,.06)]">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E2E8F0] bg-slate-50 text-[#223F74]">
      <Users size={30} />
    </div>
    <h3 className="mb-1 text-lg font-bold text-gray-900">No Records Found</h3>
    <p className="max-w-sm text-sm text-slate-500">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[24px] border border-[#E7E2DB] bg-white shadow-[0_6px_20px_rgba(0,0,0,.06)]">
    <Loader2 className="h-9 w-9 animate-spin text-[#223F74]" />
    <p className="text-sm font-semibold text-slate-500">Loading records...</p>
  </div>
);

const toLocalYMD = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const StaffAttendance = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return location.state?.activeTab || "attendance";
  });
  const [selectedDate, setSelectedDate] = useState(() => toLocalYMD(new Date()));
  const [staffList, setStaffList] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState("");

  const [pendingOverride, setPendingOverride] = useState(null);

  const selectedDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
  const isExpired = useMemo(() => {
    const attendanceDate = new Date(selectedDate);
    attendanceDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24) > 2;
  }, [selectedDate]);

  const loadAttendance = useCallback(async () => {
    try {
      setLoadingAttendance(true);
      setError("");

      const staffRes = await getAdminStaffList();
      const staff = (staffRes?.data || []).filter((item) =>
        ["teacher", "accountant"].includes(item.role)
      );

      const reportRes = await getAdminStaffAttendanceReport({
        month: selectedDateObj.getMonth() + 1,
        year: selectedDateObj.getFullYear(),
      });
      const selectedDateKey = selectedDate;
      const attendanceMap = {};
      (reportRes?.data || []).forEach((record) => {
        const recordDate = toLocalYMD(record.date);
        const staffId = typeof record.staffId === "object" ? record.staffId?._id : record.staffId;
        if (recordDate === selectedDateKey && staffId) {
          attendanceMap[staffId] = {
            status: record.status || "present",
            remarks: record.remarks || "",
            saved: true,
            leaveRef: record.leaveRef || null,
          };
        }
      });

      const nextAttendance = {};
      staff.forEach((item) => {
        nextAttendance[item._id] = attendanceMap[item._id] || {
          status: "present",
          remarks: "",
          saved: false,
          leaveRef: null,
        };
      });

      setStaffList(staff);
      setAttendanceData(nextAttendance);
      setHasChanges(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load staff attendance.");
      setStaffList([]);
      setAttendanceData({});
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedDate, selectedDateObj]);

  const loadLeaves = useCallback(async () => {
    try {
      setLoadingLeaves(true);
      setError("");
      const response = await getAdminStaffPendingLeaves();
      const requests = (response?.data || []).filter((request) =>
        ["teacher", "accountant"].includes(request.staffRole || request.staffId?.role)
      );
      setLeaveRequests(requests);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load leave requests.");
      setLeaveRequests([]);
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance();
    } else {
      loadLeaves();
    }
  }, [activeTab, loadAttendance, loadLeaves]);

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return staffList.filter((staff) => {
      const attendance = attendanceData[staff._id];
      const matchesSearch = !query || [
        staff.name,
        staff.loginId,
        staff.email,
        getProfilePhone(staff),
      ].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesRole = roleFilter === "all" || staff.role === roleFilter;
      const matchesStatus = statusFilter === "all" || attendance?.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [attendanceData, roleFilter, searchQuery, staffList, statusFilter]);

  const stats = useMemo(() => {
    const values = Object.values(attendanceData);
    return {
      total: staffList.length,
      present: values.filter((entry) => entry.status === "present").length,
      absent: values.filter((entry) => entry.status === "absent").length,
      onLeave: values.filter((entry) => entry.status === "on_leave").length,
    };
  }, [attendanceData, staffList.length]);

  const handleStatusChange = (staffId, status) => {
    if (isExpired) return;
    
    const currentAtt = attendanceData[staffId];
    if (currentAtt?.leaveRef && currentAtt.status === "on_leave" && status !== "on_leave") {
        setPendingOverride({ staffId, status });
        openModal("leave-override-modal");
        return;
    }

    setAttendanceData((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], status, saved: false },
    }));
    setHasChanges(true);
  };

  const confirmOverride = () => {
      if (pendingOverride) {
          setAttendanceData((prev) => ({
              ...prev,
              [pendingOverride.staffId]: { ...prev[pendingOverride.staffId], status: pendingOverride.status, saved: false },
          }));
          setHasChanges(true);
      }
      setPendingOverride(null);
      closeModal("leave-override-modal");
  };

  const cancelOverride = () => {
      setPendingOverride(null);
      closeModal("leave-override-modal");
  };

  const handleRemarksChange = (staffId, remarks) => {
    if (isExpired) return;
    setAttendanceData((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], remarks, saved: false },
    }));
    setHasChanges(true);
  };

  const handleSaveAttendance = async () => {
    if (isExpired) return;
    try {
      setSavingAttendance(true);
      setError("");

      await Promise.all(
        staffList.map((staff) =>
          saveAdminStaffAttendance({
            staffId: staff._id,
            date: selectedDate,
            status: attendanceData[staff._id]?.status || "present",
            remarks: attendanceData[staff._id]?.remarks || "",
          })
        )
      );

      setAttendanceData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          next[id] = { ...next[id], saved: true };
        });
        return next;
      });
      setHasChanges(false);

      setToastMessage("Attendance saved for Teachers and Accountants.");
      setTimeout(() => setToastMessage(""), 3500);
      await loadAttendance();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save staff attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      setError("");
      const response = await processAdminStaffLeave(id, { status: "approved" });
      setToastMessage(response?.message || "Leave request approved.");
      setTimeout(() => setToastMessage(""), 3500);
      await loadLeaves();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve leave request.");
    }
  };

  const handleRejectLeaveClick = (id) => {
    setSelectedLeaveId(id);
    setRejectionReason("");
    openModal("reject-staff-leave-modal");
  };

  const handleRejectLeaveConfirm = async () => {
    if (!rejectionReason.trim()) return;
    try {
      setSubmittingRejection(true);
      setError("");
      const response = await processAdminStaffLeave(selectedLeaveId, {
        status: "rejected",
        rejectionReason,
      });
      setToastMessage(response?.message || "Leave request rejected.");
      setTimeout(() => setToastMessage(""), 3500);
      closeModal("reject-staff-leave-modal");
      await loadLeaves();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject leave request.");
    } finally {
      setSubmittingRejection(false);
    }
  };

  const attendanceColumns = [
    {
      key: "staff",
      label: "Staff Name",
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.name}</p>
          <p className="text-xs font-medium text-gray-500">{row.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "loginId",
      label: "Staff ID",
      render: (value) => (
        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs font-bold text-gray-600">
          {value || "—"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (value) => (
        <span className="rounded-lg bg-[#223F74]/10 px-2.5 py-1 text-xs font-bold text-[#223F74]">
          {roleLabel(value)}
        </span>
      ),
    },
    { key: "contact", label: "Contact" },
    {
      key: "attendanceStatus",
      label: "Status",
      align: "center",
      render: (value, row) => {
        const status = value || "present";
        return (
          <div className="flex items-center justify-center gap-1.5 mx-auto">
            <button
              onClick={() => handleStatusChange(row.id, "present")}
              disabled={isExpired}
              title="Present"
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${
                status === "present"
                  ? "bg-emerald-500 text-white border border-emerald-600 shadow-sm"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
              }`}
            >
              P
            </button>
            <button
              onClick={() => handleStatusChange(row.id, "absent")}
              disabled={isExpired}
              title="Absent"
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${
                status === "absent"
                  ? "bg-rose-500 text-white border border-rose-600 shadow-sm"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
              }`}
            >
              A
            </button>
            <button
              onClick={() => handleStatusChange(row.id, "on_leave")}
              disabled={isExpired}
              title="Leave"
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${
                status === "on_leave"
                  ? "bg-amber-500 text-white border border-amber-600 shadow-sm"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
              }`}
            >
              L
            </button>
            <button
              onClick={() => handleStatusChange(row.id, "half_day")}
              disabled={isExpired}
              title="Half Day"
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${
                status === "half_day"
                  ? "bg-blue-500 text-white border border-blue-600 shadow-sm"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
              }`}
            >
              HD
            </button>
          </div>
        );
      },
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (value, row) => (
        <input
          type="text"
          disabled={isExpired}
          placeholder="Add remarks..."
          value={value || ""}
          onChange={(event) => handleRemarksChange(row.id, event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#223F74]"
        />
      ),
    },
    {
      key: "saved",
      label: "Saved",
      align: "center",
      render: (value) =>
        value ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
            <Check size={13} /> Saved
          </span>
        ) : (
          <span className="inline-block rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">
            Unsaved
          </span>
        ),
    },
  ];

  const attendanceRows = useMemo(() => filteredStaff.map((staff) => {
    const attendance = attendanceData[staff._id] || { status: "present", remarks: "", saved: false };
    return {
      id: staff._id,
      staff: staff.name,
      name: staff.name,
      email: staff.email,
      loginId: staff.loginId,
      role: staff.role,
      contact: getProfilePhone(staff),
      attendanceStatus: attendance.status,
      remarks: attendance.remarks,
      saved: attendance.saved,
    };
  }), [attendanceData, filteredStaff]);

  const leaveColumns = [
    {
      key: "staff",
      label: "Staff Name",
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.staffId?.name || "Unknown"}</p>
          <p className="text-xs font-medium text-gray-500">{roleLabel(row.staffRole || row.staffId?.role)}</p>
        </div>
      ),
    },
    {
      key: "leaveType",
      label: "Leave Type",
      render: (value) => (
        <span className="rounded-lg bg-[#eef2f7] px-2.5 py-1 text-xs font-bold uppercase text-[#223F74]">
          {value || "—"}
        </span>
      ),
    },
    {
      key: "dates",
      label: "Dates",
      render: (_, row) => (
        <span className="font-medium text-gray-600">
          {formatDate(row.fromDate)} - {formatDate(row.toDate)}
        </span>
      ),
    },
    { key: "totalDays", label: "Days" },
    {
      key: "reason",
      label: "Reason",
      render: (value) => (
        <span className="block max-w-xs truncate font-medium text-gray-600" title={value}>
          {value || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (value) => (
        <span className="inline-block rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          {(value || "pending").charAt(0).toUpperCase() + (value || "pending").slice(1)}
        </span>
      ),
    },
  ];

  const leaveActions = [
    {
      icon: <Check size={14} />,
      label: "Approve",
      tooltip: "Approve Leave",
      variant: "success",
      onClick: (row) => handleApproveLeave(row._id),
    },
    {
      icon: <X size={14} />,
      label: "Reject",
      tooltip: "Reject Leave",
      variant: "danger",
      onClick: (row) => handleRejectLeaveClick(row._id),
    },
  ];

  const resetAttendanceFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="w-full space-y-6 pb-10 text-left">
      <Heading
        primaryText="Staff"
        secondaryText="Attendance & Leaves"
      />

      <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-2 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "attendance", label: "Mark Attendance", icon: Calendar },
            { key: "leaves", label: "Leave Approvals", icon: ClipboardList },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-black transition-all ${
                  activeTab === tab.key
                    ? "bg-[#223F74] text-white shadow-md shadow-[#223F74]/20"
                    : "text-[#223F74] hover:bg-[#F4F7FB]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 font-semibold text-rose-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {activeTab === "attendance" ? (
        <>
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard title="Total Staff" value={String(stats.total)} icon={<Users size={22} />} size={3} accentColor="#223F74" />
            <EnhancedDashCard title="Present Today" value={String(stats.present)} icon={<CheckCircle2 size={22} />} size={3} accentColor="#5B9A6A" />
            <EnhancedDashCard title="Absent Today" value={String(stats.absent)} icon={<XCircle size={22} />} size={3} accentColor="#D66B5F" />
            <EnhancedDashCard title="On Leave Today" value={String(stats.onLeave)} icon={<Calendar size={22} />} size={3} accentColor="#E0A04B" />
          </DashGrid>

          <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <Grid cols={12} gap={4}>
              <DataField
                id="attendance-search"
                placeholder="Search name, staff ID, email, or phone..."
                icon={Search}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                size={4}
              />
              <SelectField
                id="attendance-role"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                searchable={false}
                size={3}
              >
                {ROLE_OPTIONS.map((option) => (
                  <Option key={option.value} value={option.value} label={option.label} />
                ))}
              </SelectField>
              <SelectField
                id="attendance-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                searchable={false}
                size={2}
              >
                <Option value="all" label="All Statuses" />
                {STATUS_OPTIONS.map((option) => (
                  <Option key={option.value} value={option.value} label={option.label} />
                ))}
              </SelectField>
              <DataField
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                size={2}
              />
              <div className="col-span-12 flex items-center justify-end sm:col-span-1">
                <Button text="Reset" variant="ghost" onClick={resetAttendanceFilters} size={12} />
              </div>
            </Grid>
          </div>

          <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#223F74]">Daily Attendance</h2>
                <p className="mt-1 text-xs text-gray-500">Teachers and Accountants only. Admin self-attendance is not included.</p>
              </div>
              <Button
                text={savingAttendance ? "Saving..." : "Save Attendance"}
                onClick={handleSaveAttendance}
                disabled={!hasChanges || isExpired || savingAttendance || staffList.length === 0}
                loading={savingAttendance}
                variant="primary"
                icon={<Save size={16} />}
                size={12}
              />
            </div>

            {isExpired && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                <p className="text-sm font-semibold text-rose-800">Attendance can no longer be modified. Edit window expired.</p>
              </div>
            )}

            {loadingAttendance ? (
              <LoadingState />
            ) : staffList.length === 0 ? (
              <EmptyState message="No Teachers or Accountants found for this school." />
            ) : filteredStaff.length === 0 ? (
              <EmptyState message="No Teachers or Accountants match the selected filters." />
            ) : (
              <DataTable
                columns={attendanceColumns}
                rows={attendanceRows}
                size={12}
                pageSize={10}
                pageSizeOptions={[5, 10, 20, 50]}
                searchable={false}
                exportable={true}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {loadingLeaves ? (
            <LoadingState />
          ) : leaveRequests.length === 0 ? (
            <EmptyState message="No pending leave requests from Teachers or Accountants." />
          ) : (
            <DataTable
              title="Teacher & Accountant Leave Requests"
              columns={leaveColumns}
              rows={leaveRequests}
              actions={leaveActions}
              size={12}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable
              exportable={true}
            />
          )}
        </div>
      )}

      <Modal id="reject-staff-leave-modal" title="Reject Leave Request" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Please enter a reason for rejecting this leave request.</p>
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Enter rejection reason..."
            className="min-h-[100px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button text="Cancel" variant="secondary" size={3} onClick={() => closeModal("reject-staff-leave-modal")} />
            <Button
              text={submittingRejection ? "Rejecting..." : "Submit Rejection"}
              variant="danger"
              size={3}
              disabled={!rejectionReason.trim() || submittingRejection}
              loading={submittingRejection}
              onClick={handleRejectLeaveConfirm}
            />
          </div>
        </div>
      </Modal>

      <Modal id="leave-override-modal" title="Warning: Approved Leave Conflict" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              This staff member has an approved leave for this date.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to override their leave and mark them as{" "}
            <strong>{pendingOverride?.status}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button text="Cancel" variant="secondary" size={3} onClick={cancelOverride} />
            <Button text="Yes, Override" variant="danger" size={3} onClick={confirmOverride} />
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-xl sm:bottom-6 sm:left-6">
          <Check className="h-4 w-4 text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default StaffAttendance;
