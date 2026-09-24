import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Users,
  Clock,
  ShieldAlert,
  CheckCircle,
  Loader2,
  Check,
  X,
  Eye,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";

import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";

import {
  fetchStaffAttendanceRecords,
  markAttendanceApi,
  fetchLeaveRequestsApi,
  approveLeaveApi,
  rejectLeaveApi,
} from "../../../services/hrmApi";

import { fetchAllStaff } from "../../../services/staffApi";

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
} from "../../../components/shared/Common_Components";

// 🔥 CRASH & TIMEZONE PREVENTION:
// These guarantee the API searches from 00:00:00 to 23:59:59 of the local day.
const getLocalStartOfDay = (dateString) => {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getLocalEndOfDay = (dateString) => {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const getPastDateString = (monthsToSubtract) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsToSubtract);
  return d.toISOString().split("T")[0];
};

const safeDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
};

const StaffAttendance = () => {
  const superAdmin = useSelector(selectSuperAdmin);
  const organizationId =
    superAdmin?.superAdmin?.organization?._id ||
    superAdmin?.superAdmin?.organization ||
    superAdmin?.organization?._id ||
    superAdmin?.organization ||
    superAdmin?._id;

  const [activeTab, setActiveTab] = useState("all_staff");

  // States for All Staff (Tab 1)
  const [records, setRecords] = useState([]);
  const [totalStaffHeadcount, setTotalStaffHeadcount] = useState(0);
  const [allBranches, setAllBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    on_leave: 0,
  });

  const [activeFilters, setActiveFilters] = useState({});

  // States for Principal Attendance (Tab 2)
  const [principalDate, setPrincipalDate] = useState(() => {
    // Ensures default date is the user's correct local YYYY-MM-DD
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
  });
  const [principals, setPrincipals] = useState([]);
  const [principalsLoading, setPrincipalsLoading] = useState(false);

  // States for Principal Leaves (Tab 3)
  const [principalLeaves, setPrincipalLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);

  // Fetch all branches once on mount
  useEffect(() => {
    fetchAllStaff()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const branches = new Set();
        list.forEach((s) => {
          const bName = s.school?.schoolName || s.school?.name;
          if (bName) branches.add(bName);
        });
        setAllBranches(Array.from(branches).sort());
      })
      .catch((err) => console.error("Failed to fetch branches", err));
  }, []);

  // ── 1. LOAD ALL STAFF ATTENDANCE (Tab 1) ──
  const loadData = useCallback(async (currentFilters = {}) => {
    try {
      setLoading(true);
      setError("");
      setActiveFilters(currentFilters);

      // Determine dates based on the dropdown
      const period = currentFilters.timePeriod || "Today";
      let startRaw = new Date().toISOString().split("T")[0]; // Defaults to Today
      let endRaw = new Date().toISOString().split("T")[0];

      if (period === "Past 1 Month") startRaw = getPastDateString(1);
      else if (period === "Past 2 Months") startRaw = getPastDateString(2);
      else if (period === "Past 3 Months") startRaw = getPastDateString(3);
      else if (period === "Past 6 Months") startRaw = getPastDateString(6);
      else if (period === "All Time") {
        startRaw = ""; // Empty string skips date filtering
        endRaw = "";
      }

      const startIso = startRaw ? getLocalStartOfDay(startRaw) : "";
      const endIso = endRaw ? getLocalEndOfDay(endRaw) : "";

      const params = new URLSearchParams();
      if (startIso && endIso) {
        params.append("startDate", startIso);
        params.append("endDate", endIso);
      }

      if (currentFilters.branch && currentFilters.branch !== "All") {
        params.append("schoolName", currentFilters.branch);
      }
      if (currentFilters.staffRole && currentFilters.staffRole !== "All") {
        params.append("role", currentFilters.staffRole);
      }
      if (currentFilters.status && currentFilters.status !== "All") {
        params.append("status", currentFilters.status);
      }

      const queryObj = Object.fromEntries(params.entries());

      const [recordsRes, staffRes] = await Promise.all([
        fetchStaffAttendanceRecords(queryObj),
        fetchAllStaff(
          `?${new URLSearchParams({
            ...(currentFilters.branch &&
              currentFilters.branch !== "All" && {
                schoolName: currentFilters.branch,
              }),
            ...(currentFilters.staffRole &&
              currentFilters.staffRole !== "All" && {
                role: currentFilters.staffRole,
              }),
          }).toString()}`,
        ),
      ]);

      const recordsData = Array.isArray(recordsRes?.data)
        ? recordsRes.data
        : [];

      const mapped = recordsData.map((rec) => ({
        ...rec,
        date: rec.date,
      }));
      setRecords(mapped);

      // Set Baseline Total Staff Headcount
      const staffList = Array.isArray(staffRes?.data) ? staffRes.data : [];
      setTotalStaffHeadcount(staffList.length);

      // Calculate Stats directly from the retrieved rows
      let present = 0,
        late = 0,
        absent = 0,
        on_leave = 0;
      mapped.forEach((r) => {
        if (r.status === "present") present++;
        else if (r.status === "late") late++;
        else if (r.status === "absent") absent++;
        else if (r.status === "on_leave") on_leave++;
      });
      setStats({ present, late, absent, on_leave });
    } catch (err) {
      setError(err?.message || "Failed to load staff attendance data");
      toast.error("Failed to load staff attendance data");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 2. LOAD PRINCIPALS & THEIR ATTENDANCE (Tab 2) ──
  const loadPrincipalsAttendance = useCallback(async () => {
    if (!principalDate) return;

    try {
      setPrincipalsLoading(true);

      const startIso = getLocalStartOfDay(principalDate);
      const endIso = getLocalEndOfDay(principalDate);

      const [principalsRes, attendanceRes] = await Promise.all([
        fetchAllStaff("?role=principal"),
        fetchStaffAttendanceRecords({ startDate: startIso, endDate: endIso }),
      ]);

      const principalsList = Array.isArray(principalsRes?.data)
        ? principalsRes.data
        : [];
      const attendanceList = Array.isArray(attendanceRes?.data)
        ? attendanceRes.data
        : [];

      const mergedPrincipals = principalsList.map((principal) => {
        const record = attendanceList.find(
          (a) => String(a.staffId?._id || a.staffId) === String(principal._id),
        );
        return {
          id: principal._id,
          name: principal.name,
          branch:
            principal.school?.schoolName || principal.school?.name || "N/A",
          schoolId: principal.school?._id || principal.school,
          date: principalDate,
          status: record ? record.status : "",
        };
      });

      setPrincipals(mergedPrincipals);
    } catch (err) {
      toast.error("Failed to load principal attendance");
    } finally {
      setPrincipalsLoading(false);
    }
  }, [principalDate]);

  // ── 3. LOAD PRINCIPAL LEAVES (Tab 3) ──
  const loadPrincipalLeaves = useCallback(async () => {
    try {
      setLeavesLoading(true);
      const res = await fetchLeaveRequestsApi();
      const leavesData = Array.isArray(res?.data) ? res.data : [];

      const pLeaves = leavesData
        .filter((l) => l.staffId?.role === "principal")
        .map((l) => ({
          id: l._id,
          name: l.staffId?.name || "N/A",
          branch: l.school?.schoolName || "N/A",
          type: l.leaveType || "Leave",
          dates: `${safeDate(l.fromDate)} to ${safeDate(l.toDate)}`,
          reason: l.reason || "-",
          status: l.status || "pending",
        }));

      setPrincipalLeaves(pLeaves);
    } catch (err) {
      toast.error("Failed to load principal leaves");
    } finally {
      setLeavesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData({}); // Load with default filters (Today)
    loadPrincipalLeaves();
  }, [loadData, loadPrincipalLeaves]);

  useEffect(() => {
    loadPrincipalsAttendance();
  }, [loadPrincipalsAttendance]);

  // ── ACTIONS ──

  const handleSavePrincipalAttendance = async (
    principalId,
    schoolId,
    newStatus,
  ) => {
    try {
      await markAttendanceApi({
        staffId: principalId,
        school: schoolId,
        organization: organizationId,
        date: getLocalStartOfDay(principalDate), // Save exactly at local midnight
        status: newStatus,
        remarks: "Marked by Super Admin",
      });
      setPrincipals((prev) =>
        prev.map((p) =>
          p.id === principalId ? { ...p, status: newStatus } : p,
        ),
      );
      toast.success(`Attendance marked as ${newStatus}`);

      loadData(activeFilters);
    } catch (error) {
      toast.error(error.message || "Failed to mark attendance");
    }
  };

  const handleLeaveAction = async (id, newStatus) => {
    try {
      if (newStatus === "approved") {
        await approveLeaveApi(id, { remarks: "Approved by Super Admin" });
      } else {
        await rejectLeaveApi(id, {
          rejectionReason: "Rejected by Super Admin",
        });
      }
      setPrincipalLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
      );
      toast.success(`Leave request ${newStatus}`);
    } catch (error) {
      toast.error(error.message || `Failed to ${newStatus} leave`);
    }
  };

  // ── DATATABLE COLUMNS ──

  const columns = [
    {
      key: "name",
      label: "Staff Name",
      render: (_, row) => row.staffId?.name || "N/A",
      searchValue: (row) => row.staffId?.name || "",
    },
    {
      key: "role",
      label: "System Role",
      render: (_, row) => {
        const role = row.staffRole || row.staffId?.role || "N/A";
        return <span className="capitalize">{role.replace(/_/g, " ")}</span>;
      },
      searchValue: (row) => row.staffRole || row.staffId?.role || "",
    },
    {
      key: "branch",
      label: "School / Branch",
      render: (_, row) => row.school?.schoolName || "N/A",
      searchValue: (row) => row.school?.schoolName || "",
    },
    {
      key: "date",
      label: "Date",
      render: (_, row) => safeDate(row.date),
      sortValue: (row) => (row.date ? new Date(row.date).getTime() : 0),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => {
        const status = row.status || "absent";
        let badgeCls = "bg-slate-100 text-slate-600 border border-slate-200";
        if (status === "present")
          badgeCls = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        if (status === "late")
          badgeCls = "bg-amber-50 text-amber-700 border border-amber-200";
        if (status === "on_leave")
          badgeCls = "bg-blue-50 text-blue-700 border border-blue-200";
        if (status === "absent")
          badgeCls = "bg-rose-50 text-rose-700 border border-rose-200";

        return (
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}
          >
            {status.replace(/_/g, " ")}
          </span>
        );
      },
    },
  ];

  const principalColumns = [
    {
      key: "name",
      label: "Principal Name",
      render: (_, row) => row.name,
      searchValue: (row) => row.name,
    },
    {
      key: "branch",
      label: "Branch",
      render: (_, row) => row.branch,
      searchValue: (row) => row.branch,
    },
    {
      key: "date",
      label: "Date",
      render: (_, row) => safeDate(row.date),
      sortValue: (row) => (row.date ? new Date(row.date).getTime() : 0),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => {
        const status = row.status;
        if (!status)
          return (
            <span className="text-slate-400 italic text-xs font-semibold">
              Not Marked
            </span>
          );

        let badgeCls = "bg-slate-100 text-slate-600 border border-slate-200";
        if (status === "present")
          badgeCls = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        if (status === "late")
          badgeCls = "bg-amber-50 text-amber-700 border border-amber-200";
        if (status === "on_leave")
          badgeCls = "bg-blue-50 text-blue-700 border border-blue-200";
        if (status === "absent")
          badgeCls = "bg-rose-50 text-rose-700 border border-rose-200";

        return (
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}
          >
            {status.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      render: (_, row) => {
        if (!row.status || row.status === "") {
          return (
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleSavePrincipalAttendance(row.id, row.schoolId, "present")
                }
                title="Mark Present"
                className="w-8 h-8 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm flex items-center justify-center"
              >
                P
              </button>
              <button
                onClick={() =>
                  handleSavePrincipalAttendance(row.id, row.schoolId, "absent")
                }
                title="Mark Absent"
                className="w-8 h-8 bg-rose-50 text-rose-600 font-bold text-sm rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors shadow-sm flex items-center justify-center"
              >
                A
              </button>
            </div>
          );
        }
        return (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recorded
          </span>
        );
      },
    },
  ];

  const leaveColumns = [
    {
      key: "name",
      label: "Principal Name",
      render: (_, row) => row.name,
      searchValue: (row) => row.name,
    },
    {
      key: "branch",
      label: "Branch",
      render: (_, row) => row.branch,
      searchValue: (row) => row.branch,
    },
    { key: "type", label: "Leave Type", render: (_, row) => row.type },
    { key: "dates", label: "Dates", render: (_, row) => row.dates },
    { key: "reason", label: "Reason", render: (_, row) => row.reason },
    {
      key: "status",
      label: "Status",
      render: (_, row) => {
        let badgeCls = "bg-slate-100 text-slate-600 border border-slate-200";
        if (row.status === "approved")
          badgeCls = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        if (row.status === "rejected")
          badgeCls = "bg-rose-50 text-rose-700 border border-rose-200";
        if (row.status === "pending")
          badgeCls = "bg-amber-50 text-amber-700 border border-amber-200";

        return (
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleLeaveAction(row.id, "approved")}
            disabled={row.status !== "pending"}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${row.status === "pending" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"}`}
          >
            Approve
          </button>
          <button
            onClick={() => handleLeaveAction(row.id, "rejected")}
            disabled={row.status !== "pending"}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${row.status === "pending" ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"}`}
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  const tableFilters = [
    {
      title: "Time Period",
      type: "select",
      key: "timePeriod",
      options: [
        "Today",
        "Past 1 Month",
        "Past 2 Months",
        "Past 3 Months",
        "Past 6 Months",
        "All Time",
      ],
      fn: () => true,
    },
    {
      title: "Branch",
      type: "select",
      key: "branch",
      options: allBranches,
      fn: () => true,
    },
    {
      title: "Role",
      type: "select",
      key: "staffRole",
      options: ["teacher", "admin", "accountant", "principal", "support_staff"],
      fn: () => true,
    },
    {
      title: "Status",
      type: "select",
      key: "status",
      options: ["present", "absent", "late", "on_leave"],
      fn: () => true,
    },
  ];

  return (
    <div className="p-4 lg:p-6 bg-[#F7F5F2] min-h-screen font-sans flex flex-col gap-4">
      {/* Notifications securely set to Top-Center so they are instantly visible */}
      <Toaster
        position="top-center"
        toastOptions={{ style: { zIndex: 99999 } }}
      />

      {/* ── HEADER WITH DARK ANIMATED BACKGROUND ── */}
      <div className="-mt-2 mb-2">
        <Heading primaryText="Staff Attendance" showAnimations={true} />
      </div>

      {/* TABS */}
      <div className="flex space-x-6 mb-2 border-b border-gray-200 px-2 overflow-x-auto">
        <button
          className={`pb-3 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "all_staff" ? "border-b-[3px] border-[#223F74] text-[#223F74]" : "text-gray-500 hover:text-gray-800"}`}
          onClick={() => setActiveTab("all_staff")}
        >
          All Staff Attendance
        </button>
        <button
          className={`pb-3 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "mark_principal" ? "border-b-[3px] border-[#223F74] text-[#223F74]" : "text-gray-500 hover:text-gray-800"}`}
          onClick={() => setActiveTab("mark_principal")}
        >
          Mark Principal Attendance
        </button>
        <button
          className={`pb-3 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "principal_leaves" ? "border-b-[3px] border-[#223F74] text-[#223F74]" : "text-gray-500 hover:text-gray-800"}`}
          onClick={() => setActiveTab("principal_leaves")}
        >
          Principal Leave Approvals
        </button>
      </div>

      {/* ── TAB 1: ALL STAFF ── */}
      {activeTab === "all_staff" && (
        <div className="flex flex-col gap-6">
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard
              title="Total Staff"
              value={totalStaffHeadcount}
              icon={<Users size={22} />}
              size={3}
              accentColor="#223f74"
              showAnimations={true}
            />
            <EnhancedDashCard
              title="Present"
              value={stats.present}
              icon={<CheckCircle size={22} />}
              size={3}
              accentColor="#10b981"
              showAnimations={true}
            />
            <EnhancedDashCard
              title="Late Check-ins"
              value={stats.late}
              icon={<Clock size={22} />}
              size={3}
              accentColor="#f59e0b"
              showAnimations={true}
            />
            <EnhancedDashCard
              title="On Leave / Absent"
              value={stats.on_leave + stats.absent}
              icon={<ShieldAlert size={22} />}
              size={3}
              accentColor="#f43f5e"
              showAnimations={true}
            />
          </DashGrid>

          <div className="min-w-0 overflow-hidden bg-white p-5 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <h3 className="text-[#223F74] font-bold text-lg mb-3 pl-1">
              Attendance Records
            </h3>
            <div className="mx-[-20px] mb-[-20px] border-t-0 shadow-none">
              <DataTable
                columns={columns}
                rows={records}
                searchable={true}
                exportable={true}
                exportFileName="staff_attendance_records"
                date={false} // <-- Change this to false so the from/to boxes vanish!
                filters={tableFilters}
                onApplyFilters={(filters) => loadData(filters)}
                onRefresh={() => loadData(activeFilters)}
                pageSize={10}
                pageSizeOptions={[5, 10, 20, 50]}
                hidePageSizeLabel={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MARK PRINCIPAL ATTENDANCE ── */}
      {activeTab === "mark_principal" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-4 items-end bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                Select Date
              </label>
              <input
                type="date"
                value={principalDate}
                onChange={(e) => setPrincipalDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-gray-50"
              />
            </div>
          </div>

          <div className="min-w-0 overflow-hidden bg-white p-5 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <h3 className="text-[#223F74] font-bold text-lg mb-3 pl-1">
              Principal Records
            </h3>
            {principalsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="animate-spin text-[#223F74]" size={24} />
                <span className="font-semibold text-sm">
                  Loading principals...
                </span>
              </div>
            ) : (
              <div className="mx-[-20px] mb-[-20px] border-t-0 shadow-none">
                <DataTable
                  columns={principalColumns}
                  rows={principals}
                  searchable={true}
                  pageSize={10}
                  hidePageSizeLabel={true}
                  onRefresh={loadPrincipalsAttendance}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: PRINCIPAL LEAVES ── */}
      {activeTab === "principal_leaves" && (
        <div className="min-w-0 overflow-hidden bg-white p-5 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <h3 className="text-[#223F74] font-bold text-lg mb-3 pl-1">
            Principal Leave Requests
          </h3>
          {leavesLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="animate-spin text-[#223F74]" size={24} />
              <span className="font-semibold text-sm">
                Loading leave requests...
              </span>
            </div>
          ) : (
            <div className="mx-[-20px] mb-[-20px] border-t-0 shadow-none">
              <DataTable
                columns={leaveColumns}
                rows={principalLeaves}
                searchable={true}
                pageSize={10}
                hidePageSizeLabel={true}
                onRefresh={loadPrincipalLeaves}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffAttendance;
