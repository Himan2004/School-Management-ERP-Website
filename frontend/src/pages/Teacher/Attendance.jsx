import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Eye,
  Edit2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  PanelModal,
  GColumnChart,
  GDoughnutChart,
  SelectField,
  Option,
} from "../../components/shared/Common_Components";

const today = new Date().toISOString().split("T")[0];
const API_BASE_URL = "/api/teacher/attendance";

const Attendance = () => {
  // --- HOMEROOM STATE ---
  const [homeroom, setHomeroom] = useState({
    classId: null,
    sectionName: null,
    className: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // --- ATTENDANCE STATE ---
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    viewType: "Daily",
    startDate: today,
  });
  const [recordMeta, setRecordMeta] = useState({ alreadyMarked: false });

  // --- MODALS STATE ---
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: "Present",
    reason: "",
    remarks: "",
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState("");
  const [bulkSelectedRows, setBulkSelectedRows] = useState([]);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  // --- API MAPPING HELPERS ---
  const apiToUiStatus = (apiStatus) => {
    const map = {
      present: "Present",
      absent: "Absent",
      on_leave: "Leave",
      late: "Present",
      half_day: "Present",
    };
    return map[apiStatus] || "Not Marked";
  };

  const uiToApiStatus = (uiStatus) => {
    const map = {
      Present: "present",
      Absent: "absent",
      Leave: "on_leave",
      "Not Marked": "present",
    };
    return map[uiStatus] || "present";
  };

  const getAuthToken = () => {
    return localStorage.getItem("token") || "";
  };

  // --- 1. FETCH HOMEROOM ON MOUNT ---
  useEffect(() => {
    const fetchHomeroom = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/homeroom`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        const result = await response.json();

        if (result.success && result.data) {
          setHomeroom({
            classId: result.data.classId,
            sectionName: result.data.sectionName,
            className: result.data.className,
          });
        }
      } catch (error) {
        toast.error("Failed to fetch homeroom details.");
        console.error(error);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchHomeroom();
  }, []);

  // --- 2. FETCH ATTENDANCE ---
  const fetchAttendance = async () => {
    if (!homeroom.classId || !homeroom.sectionName) return;

    setIsLoading(true);
    const dateToFetch = activeFilters.startDate || today;

    try {
      const response = await fetch(
        `${API_BASE_URL}/students?classId=${homeroom.classId}&section=${homeroom.sectionName}&date=${dateToFetch}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        setRecordMeta({ alreadyMarked: result.data.alreadyMarked });

        const formattedStudents = result.data.students.map((s) => ({
          id: s.id,
          rollNo: s.rollNo || "U23EC160",
          name: s.name,
          status: s.status ? apiToUiStatus(s.status) : "Not Marked",
          reason: s.reason || "",
          remarks: s.remarks || "",
          lastUpdated: result.data.alreadyMarked
            ? "Previously Saved"
            : "New Entry",
          date: dateToFetch,
        }));

        setStudents(formattedStudents);
      } else {
        toast.error(result.message || "Failed to fetch students");
      }
    } catch (error) {
      toast.error("Network error while fetching attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when homeroom is ready OR date changes
  useEffect(() => {
    fetchAttendance();
  }, [activeFilters.startDate, homeroom.classId, homeroom.sectionName]);

  // --- 3. SAVE ATTENDANCE ---
  const handleSaveAttendance = async () => {
    if (!homeroom.classId) return;

    const invalidStudent = students.find(
      (s) => (s.status === "Absent" || s.status === "Leave") && !s.reason,
    );
    if (invalidStudent) {
      toast.error(
        `Reason is mandatory for ${invalidStudent.name} (${invalidStudent.status})`,
      );
      return;
    }

    setIsSaving(true);
    const dateToSave = activeFilters.startDate || today;

    try {
      const payload = {
        classId: homeroom.classId,
        section: homeroom.sectionName,
        date: dateToSave,
        attendance: students.map((s) => ({
          studentId: s.id,
          status: uiToApiStatus(s.status),
          reason: s.reason,
          remarks: s.remarks,
        })),
      };

      const endpoint = recordMeta.alreadyMarked
        ? `${API_BASE_URL}/update`
        : `${API_BASE_URL}/mark`;
      const method = recordMeta.alreadyMarked ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Attendance saved successfully!");
        setRecordMeta((prev) => ({ ...prev, alreadyMarked: true }));
        setStudents((prev) =>
          prev.map((s) => ({ ...s, lastUpdated: "Just now" })),
        );
      } else {
        toast.error(result.message || "Failed to save attendance");
      }
    } catch (error) {
      toast.error("Network error while saving attendance");
    } finally {
      setIsSaving(false);
    }
  };

  // --- FILTERING & STATS ---
  const filteredData = useMemo(() => {
    return students.filter((s) => {
      if (
        activeFilters["Attendance Status"]?.length > 0 &&
        !activeFilters["Attendance Status"].includes(s.status)
      ) {
        return false;
      }
      return true;
    });
  }, [students, activeFilters]);

  const presentCount = filteredData.filter(
    (s) => s.status === "Present",
  ).length;
  const absentCount = filteredData.filter((s) => s.status === "Absent").length;
  const leaveCount = filteredData.filter((s) => s.status === "Leave").length;
  const totalStudents = filteredData.length;

  const doughnutData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
    { name: "Leave", value: leaveCount },
  ];
  const doughnutColors = ["#10B981", "#EF4444", "#F59E0B"];

  const generateTrendData = () => {
    return [
      {
        name: activeFilters.startDate || "Selected Day",
        Present: presentCount,
        Absent: absentCount,
        Leave: leaveCount,
      },
    ];
  };

  const columnBars = [
    { key: "Present", color: "#10B981" },
    { key: "Absent", color: "#EF4444" },
    { key: "Leave", color: "#F59E0B" },
  ];

  const canEdit = (item) => {
    if (item.date && item.date !== today)
      return { allowed: false, reason: "Editing period has expired." };
    return { allowed: true };
  };

  // --- BULK ACTIONS ---
  const handleBulkAction = (selectedRows, status) => {
    if (status === "Clear") {
      toast.success("Please uncheck the header checkbox to clear selection.");
      return;
    }
    if (status === "Present") {
      setStudents((prev) =>
        prev.map((s) => {
          if (selectedRows.find((sr) => sr.id === s.id))
            return {
              ...s,
              status,
              reason: "",
              remarks: "",
              lastUpdated: "Pending Save",
            };
          return s;
        }),
      );
      toast.success(
        "Selected students marked as Present locally. Remember to save.",
      );
    } else {
      setBulkSelectedRows(selectedRows);
      setBulkActionType(status);
      setBulkReason("");
      setBulkRemarks("");
      setShowBulkModal(true);
    }
  };

  const confirmBulkAction = () => {
    if (!bulkReason) {
      toast.error("Reason is mandatory for bulk Absent/Leave");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => {
        if (bulkSelectedRows.find((sr) => sr.id === s.id)) {
          return {
            ...s,
            status: bulkActionType,
            reason: bulkReason,
            remarks: bulkRemarks,
            lastUpdated: "Pending Save",
          };
        }
        return s;
      }),
    );
    toast.success(`Selected students marked locally. Remember to save.`);
    setShowBulkModal(false);
  };

  const tableBulkActions = [
    {
      title: "Mark Present",
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: (rows) => handleBulkAction(rows, "Present"),
    },
    {
      title: "Mark Absent",
      icon: <XCircle className="w-4 h-4" />,
      onClick: (rows) => handleBulkAction(rows, "Absent"),
    },
    {
      title: "Mark Leave",
      icon: <Clock className="w-4 h-4" />,
      onClick: (rows) => handleBulkAction(rows, "Leave"),
    },
    {
      title: "Clear Selection",
      icon: <RotateCcw className="w-4 h-4" />,
      onClick: (rows) => handleBulkAction(rows, "Clear"),
    },
  ];

  const headerAction = (
    <button
      onClick={handleSaveAttendance}
      disabled={isSaving || students.length === 0 || isLoading}
      className={`flex items-center px-4 py-2 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${recordMeta.alreadyMarked ? "bg-amber-500 hover:bg-amber-600" : "bg-[#223F74] hover:bg-[#1a3360]"}`}
    >
      <Save className="w-4 h-4 mr-2" />
      {isSaving
        ? "Saving..."
        : recordMeta.alreadyMarked
          ? "Update Attendance"
          : "Save Attendance"}
    </button>
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 border";
      case "Absent":
        return "bg-rose-50 text-rose-700 border-rose-200 border";
      case "Leave":
        return "bg-amber-50 text-amber-700 border-amber-200 border";
      case "Not Marked":
        return "bg-slate-100 text-slate-500 border-slate-200 border border-dashed";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 border";
    }
  };

  const columns = [
    { key: "rollNo", label: "Roll No." },
    {
      key: "student",
      label: "Student Name",
      searchValue: (row) => `${row.name} ${row.rollNo}`,
      render: (_, item) => (
        <div className="flex items-center space-x-3 min-w-[150px]">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
            {item.name ? item.name.charAt(0).toUpperCase() : "?"}
          </div>
          <span className="font-semibold text-[#1D1D1F] truncate">
            {item.name}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Attendance Status",
      render: (_, item) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(item.status)}`}
        >
          {item.status}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (_, item) => (
        <span className="text-slate-600 font-medium truncate max-w-[150px] inline-block">
          {item.reason || "-"}
        </span>
      ),
    },
    { key: "lastUpdated", label: "Status Info" },
    {
      key: "customActions",
      label: "Actions",
      render: (_, item) => {
        const { allowed } = canEdit(item);
        return (
          <div className="flex items-center gap-3">
            <span
              title="View"
              onClick={() => {
                setSelectedStudent(item);
                setShowViewModal(true);
              }}
              className="cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-500 hover:text-[#223F74]" />
            </span>
            {allowed && (
              <span
                title="Edit"
                onClick={() => {
                  setSelectedStudent(item);
                  setEditFormData({
                    status:
                      item.status !== "Not Marked" ? item.status : "Present",
                    reason: item.reason || "",
                    remarks: item.remarks || "",
                  });
                  setShowEditModal(true);
                }}
                className="cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-slate-500 hover:text-[#223F74]" />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const dataTableFilters = [
    {
      title: "Attendance Status",
      type: "toggle",
      key: "status",
      options: ["Present", "Absent", "Leave"],
    },
  ];

  // --- RENDER LOGIC ---

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#223F74]"></div>
      </div>
    );
  }

  if (!homeroom.classId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          No Homeroom Assigned
        </h2>
        <p className="text-slate-500 max-w-md">
          You are currently not assigned as a Class Teacher for any section.
          Please contact the administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <Heading
          primaryText={`Attendance Tracker - ${homeroom.className} ${homeroom.sectionName}`}
        />
        {recordMeta.alreadyMarked && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-4">
            Attendance Already Submitted for this Date
          </span>
        )}
      </div>

      <DashGrid cols={12}>
        <EnhancedDashCard
          title="Total Students"
          value={isLoading ? "-" : totalStudents}
          icon={<Users size={24} />}
          accentColor="#4f46e5"
          size={3}
        />
        <EnhancedDashCard
          title="Present"
          value={isLoading ? "-" : presentCount}
          icon={<CheckCircle size={24} />}
          accentColor="#10B981"
          size={3}
        />
        <EnhancedDashCard
          title="Absent"
          value={isLoading ? "-" : absentCount}
          icon={<XCircle size={24} />}
          accentColor="#EF4444"
          size={3}
        />
        <EnhancedDashCard
          title="Leave"
          value={isLoading ? "-" : leaveCount}
          icon={<Clock size={24} />}
          accentColor="#F59E0B"
          size={3}
        />
      </DashGrid>

      <DashGrid cols={12}>
        <GColumnChart
          title="Attendance Trend"
          data={generateTrendData()}
          bars={columnBars}
          size={6}
        />
        <GDoughnutChart
          title="Attendance Distribution"
          data={doughnutData}
          colors={doughnutColors}
          size={6}
        />
      </DashGrid>

      <DashGrid cols={12}>
        {isLoading ? (
          <div className="col-span-12 p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
          </div>
        ) : (
          <DataTable
            title="Attendance Records"
            columns={columns}
            rows={students}
            searchable={true}
            exportable={true}
            pageSize={10}
            filters={dataTableFilters}
            onApplyFilters={setActiveFilters}
            date={true}
            bulkAction={true}
            bulkActions={tableBulkActions}
            headerAction={headerAction}
          />
        )}
      </DashGrid>

      {/* Footer Summary */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">
            Attendance Summary
          </h3>
        </div>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Present
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {presentCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Absent
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {absentCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Leave
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {leaveCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Students
            </p>
            <p className="text-2xl font-black text-[#223F74] mt-1">
              {totalStudents}
            </p>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedStudent && (
        <PanelModal
          id="viewAttendanceModal"
          title="Attendance Record Details"
          isVisible={true}
          onClose={() => setShowViewModal(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Student Name</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Roll No.</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.rollNo}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Attendance Date</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.date}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Attendance Status</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(selectedStudent.status)}`}
                >
                  {selectedStudent.status}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Reason</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.reason || "None provided"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Remarks</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.remarks || "No additional remarks"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Status Info</p>
                <p className="font-semibold text-[#1D1D1F]">
                  {selectedStudent.lastUpdated}
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </PanelModal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStudent && (
        <PanelModal
          id="editAttendanceModal"
          title="Edit Attendance"
          isVisible={true}
          onClose={() => setShowEditModal(false)}
        >
          <div className="space-y-4">
            <SelectField
              label="Attendance Status"
              id="edit-status"
              value={editFormData.status}
              onChange={(e) =>
                setEditFormData({ ...editFormData, status: e.target.value })
              }
            >
              <Option value="Present" label="Present" />
              <Option value="Absent" label="Absent" />
              <Option value="Leave" label="Leave" />
            </SelectField>

            {(editFormData.status === "Absent" ||
              editFormData.status === "Leave") && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.reason}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, reason: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none"
                >
                  <option value="">Select a reason</option>
                  <option value="Sick">Sick</option>
                  <option value="Medical">Medical</option>
                  <option value="Family Function">Family Function</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Remarks
              </label>
              <textarea
                value={editFormData.remarks}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, remarks: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none"
                rows={3}
                placeholder="Add any remarks..."
              />
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (
                    (editFormData.status === "Absent" ||
                      editFormData.status === "Leave") &&
                    !editFormData.reason
                  )
                    return toast.error("Reason is mandatory");
                  setStudents((prev) =>
                    prev.map((s) =>
                      s.id === selectedStudent.id
                        ? { ...s, ...editFormData, lastUpdated: "Pending Save" }
                        : s,
                    ),
                  );
                  setShowEditModal(false);
                  toast.success(
                    "Attendance updated locally. Remember to save.",
                  );
                }}
                className="px-5 py-2.5 bg-[#223F74] text-white font-bold rounded-xl hover:bg-[#1a3360] transition-colors shadow-sm"
              >
                Update Locally
              </button>
            </div>
          </div>
        </PanelModal>
      )}

      {/* Bulk Reason Modal */}
      {showBulkModal && (
        <PanelModal
          id="bulkReasonModal"
          title={`Provide Reason for Bulk ${bulkActionType}`}
          isVisible={true}
          onClose={() => setShowBulkModal(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              You are marking {bulkSelectedRows.length} student(s) as{" "}
              <strong>{bulkActionType}</strong>. A reason is mandatory.
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none"
              >
                <option value="">Select a reason</option>
                <option value="School Event">School Event</option>
                <option value="Holiday">Holiday</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Weather Emergency">Weather Emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Remarks (Optional)
              </label>
              <textarea
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none"
                rows={3}
                placeholder="Add bulk remarks..."
              />
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkAction}
                className="px-5 py-2.5 bg-[#223F74] text-white font-bold rounded-xl hover:bg-[#1a3360] transition-colors shadow-sm"
              >
                Confirm Bulk Action
              </button>
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default Attendance;
