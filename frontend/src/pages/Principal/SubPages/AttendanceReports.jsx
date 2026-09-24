import React, { useState, useEffect, useMemo } from "react";
import { Search, Users, ClipboardList, CheckCircle2, XCircle, FileDown, TrendingUp, AlertCircle, Loader2, Eye } from "lucide-react";
import api from "../../../services/api";
import {
  getStaffAttendance,
  getOtherStaffAttendance
} from "../../../services/api/PrincipalAttendanceApi";
import DatePicker from "../../../components/shared/DatePicker";
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
  Button,
  PanelModal
} from "../../../components/shared/Common_Components";

const MONTH_OPTIONS = [
  { value: "All", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" }
];

const QUICK_RANGE_OPTIONS = [
  { value: "This Month", label: "This Month" },
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "Custom", label: "Custom Range" }
];

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading reports...</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-[#223F74] border border-[#E2E8F0]">
      <ClipboardList size={32} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">No Records Found</h3>
    <p className="text-sm text-slate-500 max-w-sm">{message}</p>
  </div>
);

const AttendanceReports = () => {
  const [filterOptions, setFilterOptions] = useState({
    academicYears: []
  });

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

  const [selectedStatusStaff, setSelectedStatusStaff] = useState("All");
  const [academicYear, setAcademicYear] = useState("");
  const [quickFilter, setQuickFilter] = useState("This Month");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [searchName, setSearchName] = useState("");
  const [searchLoginID, setSearchLoginID] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");

  const [staffPage, setStaffPage] = useState(1);
  const [staffLimit, setStaffLimit] = useState(10);

  const [staffList, setStaffList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleViewRecord = (row) => {
    setSelectedRecord(row);
    setViewModalOpen(true);
  };

  const staffActions = [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "primary",
      onClick: (row) => handleViewRecord(row),
    },
  ];



  const staffStatsComputed = useMemo(() => {
    const total = staffList.length;
    const present = staffList.filter(s => s.status === 'present' || s.status === 'late').length;
    const absent = staffList.filter(s => s.status === 'absent').length;
    const percentage = total === 0 ? "0%" : `${((present / total) * 100).toFixed(1)}%`;
    return {
      totalStaff: total,
      presentToday: present,
      absentToday: absent,
      attendancePercentage: percentage
    };
  }, [staffList]);

  const filteredStaffList = useMemo(() => {
    return staffList.filter((item) => {
      if (selectedRole !== "All") {
        if (item.role?.toLowerCase() !== selectedRole.toLowerCase()) {
          return false;
        }
      }
      if (selectedStatusStaff !== "All") {
        if (item.status?.toLowerCase() !== selectedStatusStaff.toLowerCase().replace(" ", "_")) {
          return false;
        }
      }
      if (searchName) {
        if (!item.name?.toLowerCase().includes(searchName.toLowerCase())) {
          return false;
        }
      }
      if (searchLoginID) {
        if (!item.loginId?.toLowerCase().includes(searchLoginID.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [staffList, selectedRole, selectedStatusStaff, searchName, searchLoginID]);

  const paginatedStaffList = useMemo(() => {
    const startIdx = (staffPage - 1) * staffLimit;
    return filteredStaffList.slice(startIdx, startIdx + staffLimit);
  }, [filteredStaffList, staffPage, staffLimit]);

  const currentPrincipalName = useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        const userObj = JSON.parse(userStr);
        return userObj?.name || "Principal User";
      }
    } catch (e) {
      console.error(e);
    }
    return "Principal User";
  }, []);

  useEffect(() => {
    const fetchFilterDropdowns = async () => {
      try {
        const res = await api.get("/principal/academic/filters");
        if (res.data?.success) {
          const data = res.data.data;
          const years = data.academicYears ? data.academicYears.map(y => y.year || y) : [];
          setFilterOptions({ academicYears: years });
          setAcademicYear(prev => prev || (years[0] || ""));
        }
      } catch (err) {
        console.error("Failed to load reporting filters options", err);
      }
    };
    fetchFilterDropdowns();
  }, []);

  const loadList = async () => {
    setLoading(true);
    setError("");
    try {
      const queryDate = startDate || new Date().toISOString().split("T")[0];
        const adminRes = await getStaffAttendance({
          school_id: schoolId,
          date: queryDate,
        });
        const adminStaff = adminRes?.data?.staff || [];
        const schoolAdminName = adminStaff[0]?.name || "Admin User";

        const admins = adminStaff
          .filter((s) => s.role?.toLowerCase() === "admin")
          .map(s => ({
            ...s,
            role: "Admin",
            markedBy: s.isSaved && s.markedBy && s.markedBy !== "—" ? s.markedBy : currentPrincipalName,
          }));

        const otherRes = await getOtherStaffAttendance({
          school_id: schoolId,
          date: queryDate,
        });
        const others = (otherRes?.data?.staff || []).map(s => ({
          ...s,
          markedBy: s.isSaved && s.markedBy && s.markedBy !== "—" ? s.markedBy : schoolAdminName,
        }));

        const combined = [...admins, ...others].map((item) => ({
          ...item,
          date: queryDate,
        }));

        setStaffList(combined);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reports");
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [startDate]);

  const handleExportCSV = async () => {
    try {
      const headers = ["Staff Name", "Login ID", "Role", "Contact Number", "Attendance Date", "Status", "Remarks", "Marked By"];
        const rows = filteredStaffList.map((item) => [
          item.name,
          item.loginId || "—",
          item.role,
          item.contact || "—",
          new Date(item.date).toLocaleDateString(),
          item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " ") : "—",
          item.remarks || "—",
          item.markedBy || "—",
        ]);

        const csvContent = [headers, ...rows].map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `staff_attendance_report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
      console.error("Export action failed", err);
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

  const staffColumns = [
    {
      key: "name",
      label: "Staff Name",
      render: (val) => <span className="font-bold text-gray-900">{val}</span>,
    },
    {
      key: "loginId",
      label: "Login ID",
      render: (val) => <span className="font-mono text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold">{val}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (val) => <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg capitalize">{val}</span>,
    },
    {
      key: "contact",
      label: "Contact Number",
      render: (val) => <span className="text-gray-600 font-medium">{val}</span>,
    },
    {
      key: "date",
      label: "Attendance Date",
      render: (val) => <span className="text-gray-600 font-semibold">{new Date(val).toLocaleDateString()}</span>,
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
      render: (val) => <span className="text-gray-500 text-xs italic">{val || "—"}</span>,
    },
    {
      key: "markedBy",
      label: "Marked By",
      render: (val) => <span className="text-gray-600 font-bold">{val}</span>,
    },
  ];

  return (
    <div className="w-full space-y-6 text-left">
      <main className="text-left">
        <div className="mb-6">
          <Heading
            primaryText="Admin Attendance"
            secondaryText="Leave Management"
            showAnimations={true}
          />
        </div>


            <div className="mb-6">
              <DashGrid cols={12} gap={4}>
                <EnhancedDashCard title="Total Staff" value={loading ? "..." : staffStatsComputed.totalStaff.toString()} icon={<Users size={22} />} size={3} accentColor="#223F74" />
                <EnhancedDashCard title="Present Today" value={loading ? "..." : staffStatsComputed.presentToday.toString()} icon={<CheckCircle2 size={22} />} size={3} accentColor="#10B981" />
                <EnhancedDashCard title="Absent Today" value={loading ? "..." : staffStatsComputed.absentToday.toString()} icon={<XCircle size={22} />} size={3} accentColor="#EF4444" />
                <EnhancedDashCard title="Attendance Percentage" value={loading ? "..." : staffStatsComputed.attendancePercentage} icon={<TrendingUp size={22} />} size={3} accentColor="#3B82F6" />
              </DashGrid>
            </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 mb-6 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {loading ? (
                <LoadingState />
              ) : paginatedStaffList.length === 0 ? (
                <EmptyState message="No staff found." />
              ) : (
                <DataTable
                  title="Staff Records"
                  headerAction={
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-[150px]">
                        <Select value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} searchable={false}>
                          {QUICK_RANGE_OPTIONS.map(opt => <Option key={opt.value} value={opt.value} label={opt.label} />)}
                        </Select>
                      </div>
                      <div className="w-[150px]">
                        <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
                          {filterOptions.academicYears.map(y => <Option key={y} value={y} label={y} />)}
                        </Select>
                      </div>
                      <div className="w-[180px]">
                        <DatePicker
                          value={quickFilter === "Custom" ? startDate : ""}
                          onChange={(val) => {
                            setStartDate(val);
                            setEndDate(val);
                            if (val) setQuickFilter("Custom");
                            else setQuickFilter("This Month");
                          }}
                          placeholder="Attendance Date"
                        />
                      </div>
                    </div>
                  }
                  columns={staffColumns}
                  rows={paginatedStaffList}
                  size={staffLimit}
                  page={staffPage}
                  totalRows={filteredStaffList.length}
                  pageSize={staffLimit}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={(p) => setStaffPage(p)}
                  onPageSizeChange={(s) => setStaffLimit(s)}
                  searchable={true}
                  bulkAction={false}
                  exportable={true}
                  actions={staffActions}
                />
              )}

        {/* View Modal */}
        <PanelModal
          id="attendance-view-modal"
          title="Staff Attendance Details"
          isVisible={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          size="md"
        >
          {selectedRecord && (
            <div className="space-y-4 text-sm text-gray-700">
              <Grid cols={12} gap={4}>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</span>
                  <span className="font-semibold">{selectedRecord.name || "N/A"}</span>
                </div>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</span>
                  <span className="font-semibold capitalize">{selectedRecord.role || "N/A"}</span>
                </div>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact</span>
                  <span className="font-semibold">{selectedRecord.contact || "N/A"}</span>
                </div>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</span>
                  <span className="font-semibold">{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</span>
                  <span className="font-semibold capitalize">{selectedRecord.status ? selectedRecord.status.replace("_", " ") : "N/A"}</span>
                </div>
                <div className="col-span-12 sm:col-span-6 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Marked By</span>
                  <span className="font-semibold">{selectedRecord.markedBy || "N/A"}</span>
                </div>
                <div className="col-span-12 border-b border-gray-100 pb-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks</span>
                  <span className="font-semibold italic">{selectedRecord.remarks || "N/A"}</span>
                </div>
              </Grid>
              <div className="mt-6 flex justify-end">
                <Button variant="ghost" onClick={() => setViewModalOpen(false)} text="Close" />
              </div>
            </div>
          )}
        </PanelModal>
      </main>
    </div>
  );
};

export default AttendanceReports;