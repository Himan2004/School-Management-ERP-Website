import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Search, AlertCircle, Check, X, Calendar, ClipboardList, CheckCircle2, XCircle, Users } from "lucide-react";
import {
  getStaffAttendance,
  markStaffAttendance,
  getAdminLeaves,
  approveAdminLeave,
  rejectAdminLeave,
  getOtherStaffAttendance,
} from "../../../services/api/PrincipalAttendanceApi.js";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataTable,
  DataField,
  SelectField,
  Select,
  Option,
  PanelModal,
  Button,
} from "../../../components/shared/Common_Components";

const STATUS_OPTIONS = [
  { value: "present", label: "P" },
  { value: "absent", label: "A" },
  { value: "half_day", label: "Half" },
  { value: "on_leave", label: "L" },
  { value: "late", label: "Late" },
];

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading records...</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-[#223F74] border border-[#E2E8F0]">
      <Users size={32} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">No Records Found</h3>
    <p className="text-sm text-slate-500 max-w-sm">{message}</p>
  </div>
);

const MarkAttendance = () => {
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" | "leaves" | "otherStaff"
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Other staff attendance states
  const [otherStaffList, setOtherStaffList] = useState([]);
  const [otherStaffStats, setOtherStaffStats] = useState({ total: 0, present: 0, absent: 0, onLeave: 0, halfDay: 0, late: 0 });
  const [otherStaffSearchName, setOtherStaffSearchName] = useState("");
  const [otherStaffSearchID, setOtherStaffSearchID] = useState("");
  const [otherStaffRoleFilter, setOtherStaffRoleFilter] = useState("All");
  const [otherStaffStatusFilter, setOtherStaffStatusFilter] = useState("All");
  const [loadingOtherStaff, setLoadingOtherStaff] = useState(false);
  const [otherStaffError, setOtherStaffError] = useState("");

  // Attendance states
  const [staffList, setStaffList] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState("");
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);

  // Leave requests states
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);

  const navigate = useNavigate();

  const handleAllReportsClick = () => {
    navigate("/principal/reports/attendance?tab=staff", { state: { defaultTab: "staff" } });
  };

  const getSchoolId = () => {
    try {
      const directId = localStorage.getItem("schoolId");
      if (directId && directId !== "undefined" && directId !== "null") return directId;

      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        const userObj = JSON.parse(userStr);
        return userObj?.schoolId || userObj?.school?._id || userObj?.school || userObj?.organization || null;
      }
    } catch (e) {
      console.error("Auth parsing error:", e);
    }
    return "use_token";
  };

  const schoolId = getSchoolId();

  // 48-hour edit window check
  const isExpired = useMemo(() => {
    if (!selectedDate) return false;
    const attendanceDate = new Date(selectedDate);
    attendanceDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - attendanceDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 2; // More than 48 hours (2 days)
  }, [selectedDate]);

  // Load attendance
  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(`[MarkAttendance FE] Loading staff attendance for date: ${selectedDate}`);

      const response = await getStaffAttendance({
        school_id: schoolId,
        date: selectedDate,
      });

      const staffData = (response?.data?.staff || []).filter(
        (s) => s.role?.toLowerCase() === "admin"
      );
      const attendanceMap = {};

      staffData.forEach((staff) => {
        attendanceMap[staff.id] = {
          status: staff.status,
          remarks: staff.remarks || "",
          saved: staff.isSaved || false,
        };
      });

      setStaffList(staffData);
      setAttendanceData(attendanceMap);
      setIsAlreadyMarked(response?.data?.isAlreadyMarked || false);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load admin attendance");
      setStaffList([]);
      setAttendanceData({});
      setIsAlreadyMarked(false);
    } finally {
      setLoading(false);
    }
  };

  // Load leave requests
  const loadLeaves = async () => {
    try {
      setLoadingLeaves(true);
      setError("");

      console.log("[MarkAttendance FE] Loading Admin leave requests");

      const response = await getAdminLeaves();
      setLeaveRequests(response.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Load other staff attendance
  const loadOtherStaffAttendance = async () => {
    try {
      setLoadingOtherStaff(true);
      setOtherStaffError("");

      console.log(`[MarkAttendance FE] Loading other staff attendance for date: ${selectedDate}`);

      const response = await getOtherStaffAttendance({
        school_id: schoolId,
        date: selectedDate,
      });

      setOtherStaffList(response?.data?.staff || []);
      setOtherStaffStats(response?.data?.stats || { total: 0, present: 0, absent: 0, onLeave: 0, halfDay: 0, late: 0 });
    } catch (err) {
      console.error(err);
      setOtherStaffError(err?.response?.data?.message || "Failed to load other staff attendance");
      setOtherStaffList([]);
      setOtherStaffStats({ total: 0, present: 0, absent: 0, onLeave: 0, halfDay: 0, late: 0 });
    } finally {
      setLoadingOtherStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance();
    } else if (activeTab === "leaves") {
      loadLeaves();
    } else if (activeTab === "otherStaff") {
      loadOtherStaffAttendance();
    }
  }, [selectedDate, activeTab]);

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.loginId && staff.loginId.toLowerCase().includes(searchQuery.toLowerCase()));
      const statusValue = attendanceData[staff.id]?.status;
      const statusMatchValue =
        statusFilter === "All" ? null
          : statusFilter === "Present" ? "present"
            : statusFilter === "Absent" ? "absent"
              : statusFilter === "Half Day" ? "half_day"
                : statusFilter === "Leave" ? "on_leave"
                  : "late";

      const matchesStatus = statusFilter === "All" || statusValue === statusMatchValue;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, attendanceData, staffList]);

  const stats = useMemo(() => {
    const total = staffList.length;
    const present = Object.values(attendanceData).filter((a) => a.status === "present").length;
    const absent = Object.values(attendanceData).filter((a) => a.status === "absent").length;
    const onLeave = Object.values(attendanceData).filter((a) => a.status === "on_leave").length;
    const halfDay = Object.values(attendanceData).filter((a) => a.status === "half_day").length;
    const late = Object.values(attendanceData).filter((a) => a.status === "late").length;
    return { total, present, absent, onLeave, halfDay, late };
  }, [attendanceData, staffList]);

  const handleStatusChange = (staffId, newStatus) => {
    if (isExpired) return;
    setAttendanceData((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], status: newStatus, saved: false },
    }));
    setHasChanges(true);
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
      setLoadingSave(true);
      setError("");

      // Exclude self-attendance from save payload
      const attendancePayload = staffList
        .filter((staff) => !staff.isSelf)
        .map((staff) => ({
          id: staff.id,
          status: attendanceData[staff.id]?.status || "present",
          remarks: attendanceData[staff.id]?.remarks || "",
        }));

      console.log("[MarkAttendance FE] Saving payload:", JSON.stringify(attendancePayload));

      const response = await markStaffAttendance(
        { school_id: schoolId },
        { date: selectedDate, attendance: attendancePayload }
      );

      const newAttendanceData = { ...attendanceData };
      Object.keys(newAttendanceData).forEach((key) => {
        newAttendanceData[key].saved = true;
      });
      setAttendanceData(newAttendanceData);
      setHasChanges(false);
      setIsAlreadyMarked(true);

      setToastMessage(response?.message || `Attendance saved. ${stats.present} Present, ${stats.absent} Absent`);
      setTimeout(() => setToastMessage(""), 4000);
      await loadAttendance();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to save attendance");
    } finally {
      setLoadingSave(false);
    }
  };

  // Leave approval flows
  const handleApproveLeave = async (id) => {
    try {
      console.log(`[MarkAttendance FE] Approving leave ID: ${id}`);
      setError("");
      const res = await approveAdminLeave(id);
      setToastMessage(res.message || "Admin leave approved successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      await loadLeaves();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to approve leave request");
    }
  };

  const handleRejectLeaveClick = (id) => {
    setSelectedLeaveId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleRejectLeaveConfirm = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      setSubmittingRejection(true);
      console.log(`[MarkAttendance FE] Rejecting leave ID: ${selectedLeaveId}, reason: ${rejectionReason}`);
      setError("");
      const res = await rejectAdminLeave(selectedLeaveId, rejectionReason);
      setToastMessage(res.message || "Admin leave rejected.");
      setTimeout(() => setToastMessage(""), 4000);
      setRejectModalOpen(false);
      await loadLeaves();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to reject leave request");
    } finally {
      setSubmittingRejection(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" };
      case "absent": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
      case "half_day": return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
      case "on_leave": return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" };
      case "late": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
      default: return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" };
    }
  };

  // DataTable structures
  const attendanceColumns = [
    {
      key: "name",
      label: "Admin Name",
      render: (val) => <span className="font-bold text-gray-900">{val}</span>,
    },
    {
      key: "loginId",
      label: "ID",
      render: (val) => (
        <span className="font-mono text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (val) => <span className="text-gray-600 font-medium">{val || "—"}</span>,
    },
    {
      key: "date",
      label: "Attendance Date",
      render: () => <span className="font-medium text-gray-600">{selectedDate}</span>,
    },
    {
      key: "actions",
      label: "Attendance",
      align: "center",
      render: (val, row) => {
        if (row.isSelf) {
          return (
            <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 px-3 py-1 rounded-full inline-block">
              Self attendance cannot be marked by Principal.
            </span>
          );
        }

        const status = row.attendanceStatus;

        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => handleStatusChange(row.id, "present")}
              disabled={isExpired}
              title="Present"
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${status === "present"
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
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${status === "absent"
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
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${status === "on_leave"
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
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs transition-colors ${status === "half_day"
                  ? "bg-blue-500 text-white border border-blue-600 shadow-sm"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                }`}
            >
              HD
            </button>
          </div>
        );
      }
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (val, row) => {
        if (row.isSelf || row.attendanceStatus === "present") return null;
        return (
          <input
            type="text"
            disabled={isExpired}
            placeholder="Add remarks..."
            value={val || ""}
            onChange={(e) => handleRemarksChange(row.id, e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white"
          />
        );
      },
    },
    {
      key: "saved",
      label: "Saved Status",
      align: "center",
      render: (val) => {
        if (val) {
          return (
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 w-fit mx-auto">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          );
        } else {
          return (
            <span className="text-xs text-amber-500 font-bold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full inline-block">
              Unsaved
            </span>
          );
        }
      },
    },
  ];

  const attendanceRows = useMemo(() => {
    return filteredStaff.map((staff) => {
      const attendance = attendanceData[staff.id] || { status: "present", remarks: "", saved: false };
      return {
        id: staff.id,
        name: staff.name,
        loginId: staff.loginId,
        contact: staff.contact,
        isSelf: staff.isSelf,
        attendanceStatus: attendance.status,
        remarks: attendance.remarks || "",
        saved: attendance.saved || false,
      };
    });
  }, [filteredStaff, attendanceData]);

  const filteredOtherStaff = useMemo(() => {
    return otherStaffList.filter((staff) => {
      const nameMatch = staff.name.toLowerCase().includes(otherStaffSearchName.toLowerCase());
      const idMatch = staff.loginId.toLowerCase().includes(otherStaffSearchID.toLowerCase());
      const matchesSearch = nameMatch && idMatch;

      const matchesRole =
        otherStaffRoleFilter === "All" ||
        staff.role.toLowerCase() === otherStaffRoleFilter.toLowerCase();

      const statusMatchValue =
        otherStaffStatusFilter === "All" ? null
          : otherStaffStatusFilter === "Present" ? "present"
            : otherStaffStatusFilter === "Absent" ? "absent"
              : otherStaffStatusFilter === "Half Day" ? "half_day"
                : otherStaffStatusFilter === "Leave" ? "on_leave"
                  : "late";

      const matchesStatus = otherStaffStatusFilter === "All" || staff.status === statusMatchValue;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [otherStaffSearchName, otherStaffSearchID, otherStaffRoleFilter, otherStaffStatusFilter, otherStaffList]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set();
    otherStaffList.forEach(s => {
      if (s.role) roles.add(s.role);
    });
    return Array.from(roles);
  }, [otherStaffList]);

  const otherStaffColumns = [
    {
      key: "name",
      label: "Staff Name",
      render: (val) => <span className="font-bold text-gray-900">{val}</span>,
    },
    {
      key: "loginId",
      label: "Login ID",
      render: (val) => (
        <span className="font-mono text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (val) => (
        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (val) => <span className="text-gray-600 font-medium">{val || "—"}</span>,
    },
    {
      key: "date",
      label: "Attendance Date",
      render: () => <span className="font-medium text-gray-600">{selectedDate}</span>,
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (val) => {
        const colors = getStatusColor(val);
        return (
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>
            {val ? val.charAt(0).toUpperCase() + val.slice(1).replace("_", " ") : "—"}
          </span>
        );
      },
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (val) => <span className="text-gray-600 font-medium">{val || "—"}</span>,
    },
    {
      key: "markedBy",
      label: "Marked By",
      render: (val) => <span className="text-gray-600 font-bold">{val || "—"}</span>,
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (val) => (
        <span className="text-xs text-gray-500 font-medium">
          {val ? new Date(val).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  const otherStaffRows = useMemo(() => {
    return filteredOtherStaff.map((staff) => ({
      id: staff.id,
      name: staff.name,
      loginId: staff.loginId,
      role: staff.role,
      contact: staff.contact,
      status: staff.status,
      remarks: staff.remarks,
      markedBy: staff.markedBy,
      updatedAt: staff.updatedAt,
    }));
  }, [filteredOtherStaff]);

  const leaveColumns = [
    {
      key: "adminStaff",
      label: "Admin Name",
      render: (val, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.staffId?.name || "Unknown"}</p>
          <p className="text-xs text-gray-500 font-medium">{row.staffId?.email || ""}</p>
        </div>
      ),
    },
    {
      key: "loginId",
      label: "ID",
      render: (val, row) => (
        <span className="font-mono font-bold text-gray-600">
          {row.staffId?.loginId || "—"}
        </span>
      ),
    },
    {
      key: "leaveType",
      label: "Leave Type",
      render: (val) => (
        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#eef2f7] text-[#223F74] rounded-lg uppercase">
          {val}
        </span>
      ),
    },
    {
      key: "dates",
      label: "Dates",
      render: (val, row) => {
        const fromStr = new Date(row.fromDate).toLocaleDateString();
        const toStr = new Date(row.toDate).toLocaleDateString();
        return <span className="text-gray-600 font-medium">{fromStr} - {toStr}</span>;
      },
    },
    {
      key: "totalDays",
      label: "Days",
      render: (val) => <span className="text-gray-600 font-bold">{val}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (val) => (
        <span className="text-gray-600 font-medium block max-w-xs truncate" title={val}>
          {val}
        </span>
      ),
    },
    {
      key: "leaveStatus",
      label: "Status",
      align: "center",
      render: (val, row) => {
        const status = row.status;
        return (
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status === "approved" ? "bg-green-50 text-green-700 border border-green-100" :
              status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {row.rejectionReason && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1 max-w-[120px] mx-auto truncate" title={row.rejectionReason}>
                Rej: {row.rejectionReason}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  const leaveActions = [
    {
      icon: <Check className="w-3.5 h-3.5" />,
      label: "Approve",
      tooltip: "Approve Leave",
      variant: "success",
      show: (row) => row.status === "pending",
      onClick: (row) => handleApproveLeave(row._id),
    },
    {
      icon: <X className="w-3.5 h-3.5" />,
      label: "Reject",
      tooltip: "Reject Leave",
      variant: "danger",
      show: (row) => row.status === "pending",
      onClick: (row) => handleRejectLeaveClick(row._id),
    },
  ];

  return (
    <div className="w-full space-y-6 text-left">
      <main className="text-left">
        {/* Page Header */}
        <div className="mb-6">
          <Heading
            primaryText="Admin Attendance"
            secondaryText="Leave Management"
            showAnimations={true}
          />
        </div>

        {/* Tab Toggle Control */}
        <div className="flex gap-4 border-b border-gray-200 mt-6 mb-6">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === "attendance"
              ? "border-[#223F74] text-[#223F74]"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <Calendar className="w-4 h-4" />
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === "leaves"
              ? "border-[#223F74] text-[#223F74]"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            Admin Leave Requests
          </button>
          <button
            onClick={() => setActiveTab("otherStaff")}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === "otherStaff"
              ? "border-[#223F74] text-[#223F74]"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <Users className="w-4 h-4" />
            Other Staff Attendance
          </button>
        </div>

        {activeTab === "otherStaff" ? (
          <>
            {/* Statistics Cards */}
            <div className="mb-6">
              <DashGrid cols={12} gap={4}>
                <EnhancedDashCard title="Total Staff" value={otherStaffStats.total.toString()} icon={<Users size={22} />} size={3} accentColor="#223F74" />
                <EnhancedDashCard title="Present Today" value={otherStaffStats.present.toString()} icon={<CheckCircle2 size={22} />} size={3} accentColor="#10B981" />
                <EnhancedDashCard title="Absent Today" value={otherStaffStats.absent.toString()} icon={<XCircle size={22} />} size={3} accentColor="#EF4444" />
                <EnhancedDashCard title="On Leave Today" value={otherStaffStats.onLeave.toString()} icon={<Calendar size={22} />} size={3} accentColor="#F59E0B" />
              </DashGrid>
            </div>

            {/* Attendance Table Wrapper */}
            <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 mb-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#223F74]">Other Staff Attendance</h2>
                  <p className="text-xs text-gray-500 mt-1">View attendance records of non-admin staff members</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
                  />
                </div>
              </div>

              {otherStaffError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 mb-6 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {otherStaffError}
                </div>
              )}

              {loadingOtherStaff ? (
                <LoadingState />
              ) : otherStaffList.length === 0 ? (
                <EmptyState message="No Attendance Records Found." />
              ) : filteredOtherStaff.length === 0 ? (
                <EmptyState message="No staff members found matching search criteria." />
              ) : (
                <DataTable
                  columns={otherStaffColumns}
                  rows={otherStaffRows}
                  size={12}
                  pageSize={10}
                  pageSizeOptions={[5, 10, 20, 50]}
                  searchable
                  bulkAction={false}
                  exportable
                  exportFileName="other_staff_attendance"
                />
              )}
            </div>
          </>
        ) : activeTab === "attendance" ? (
          <>
            {/* Statistics Cards */}
            <div className="mb-6">
              <DashGrid cols={12} gap={4}>
                <EnhancedDashCard title="Total Admins" value={stats.total.toString()} icon={<Users size={22} />} size={3} accentColor="#223F74" />
                <EnhancedDashCard title="Present Today" value={stats.present.toString()} icon={<CheckCircle2 size={22} />} size={3} accentColor="#10B981" />
                <EnhancedDashCard title="Absent Today" value={stats.absent.toString()} icon={<XCircle size={22} />} size={3} accentColor="#EF4444" />
                <EnhancedDashCard title="On Leave Today" value={stats.onLeave.toString()} icon={<Calendar size={22} />} size={3} accentColor="#F59E0B" />
              </DashGrid>
            </div>

            {/* Attendance Table & Header Controls Wrapper */}
            <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 mb-6">
              {/* Section Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#223F74]">Mark Attendance</h2>
                  <p className="text-xs text-gray-500 mt-1">Mark and update daily attendance for Admin users</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-end w-full sm:w-auto">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl border border-[#E2E8F0] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition w-full sm:w-auto"
                  />
                  <div className="w-full sm:w-auto">
                    <Button
                      text={loadingSave ? "Saving..." : "Save Attendance"}
                      onClick={handleSaveAttendance}
                      disabled={!hasChanges || isExpired}
                      loading={loadingSave}
                      variant="primary"
                      icon={<Save className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>

              {/* 48 hour Edit Window Banner */}
              {isExpired && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 border border-rose-100 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <p className="text-sm text-rose-800 font-semibold">
                    Attendance can no longer be modified. Edit window expired (48-hour limit reached).
                  </p>
                </div>
              )}

              {/* Already Marked Banner */}
              {isAlreadyMarked && !isExpired && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-amber-50 border border-amber-100 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800 font-semibold">
                    Attendance already saved for this date. You can still make changes inside the edit window.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 mb-6 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Attendance Table Content */}
              {loading ? (
                <LoadingState />
              ) : staffList.length === 0 ? (
                <EmptyState message="No Admin users found for this school." />
              ) : filteredStaff.length === 0 ? (
                <EmptyState message="No admins found matching search criteria." />
              ) : (
                <DataTable
                  columns={attendanceColumns}
                  rows={attendanceRows}
                  size={12}
                  pageSize={10}
                  pageSizeOptions={[5, 10, 20, 50]}
                  searchable
                  bulkAction={false}
                  exportable
                  exportFileName="admin_attendance"
                />
              )}
            </div>
          </>
        ) : (
          /* Admin Leave Approvals Flow */
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mt-1">Review, approve, or reject leave requests submitted by Admins</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {loadingLeaves ? (
              <LoadingState />
            ) : leaveRequests.length === 0 ? (
              <EmptyState message="No Admin leave requests found." />
            ) : (
              <DataTable
                columns={leaveColumns}
                rows={leaveRequests}
                actions={leaveActions}
                size={12}
                pageSize={10}
                pageSizeOptions={[5, 10, 20, 50]}
                searchable
                bulkAction={false}
                exportable
                exportFileName="leave_requests"
                title="Leave Requests"
              />
            )}

            {/* Rejection Modal using PanelModal */}
            <PanelModal
              id="reject-leave-modal"
              title="Reject Leave Request"
              isVisible={rejectModalOpen}
              onClose={() => setRejectModalOpen(false)}
              size="md"
            >
              <div className="space-y-4 text-left">
                <p className="text-sm text-gray-500">
                  Please enter a reason for rejecting this leave request. This will be visible to the Admin.
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason (e.g. Insufficient coverage, exam duties)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm min-h-[100px] font-medium"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setRejectModalOpen(false)}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRejectLeaveConfirm}
                    disabled={!rejectionReason.trim() || submittingRejection}
                    variant="danger"
                  >
                    {submittingRejection ? "Rejecting..." : "Submit Rejection"}
                  </Button>
                </div>
              </div>
            </PanelModal>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold z-50 flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
            <Check className="w-4 h-4 text-green-400" />
            {toastMessage}
          </div>
        )}
      </main>
    </div>
  );
};

export default MarkAttendance;