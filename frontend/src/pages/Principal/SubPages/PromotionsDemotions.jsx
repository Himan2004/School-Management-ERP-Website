import React, { useState, useEffect, useMemo } from "react";
import { Search, Users, ClipboardList, TrendingUp, TrendingDown, Calendar, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, FileDown } from "lucide-react";
import api from "../../../services/api";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  DataField,
  SelectField,
  Option,
  Button,
  Modal,
  ModalGrid,
  ModalData,
  openModal,
  closeModal
} from "../../../components/shared/Common_Components";
import DatePicker from "../../../components/shared/DatePicker";

const designationHierarchy = [
  "Teacher",
  "Senior Teacher",
  "Head Teacher"
];

const getDesignationIndex = (designation) => {
  if (!designation) return 1; // Default to "Teacher"
  const index = designationHierarchy.findIndex(
    d => d.toLowerCase() === designation.trim().toLowerCase()
  );
  return index !== -1 ? index : 1;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-white border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] rounded-[24px]">
    <Loader2 className="w-10 h-10 text-[#223F74] animate-spin" />
    <p className="text-sm font-semibold text-slate-500">Loading records...</p>
  </div>
);

const PromotionsDemotions = () => {
  const [activeTab, setActiveTab] = useState("manage");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPromotions: 0,
    totalDemotions: 0,
    thisMonthPromotions: 0,
    thisMonthDemotions: 0
  });

  // Tab 1 (Manage) State
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedDesignation, setSelectedDesignation] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Tab 2 (History) State
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyActionType, setHistoryActionType] = useState("All");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  // Modal State
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [modalType, setModalType] = useState(null); // 'promote' | 'demote'
  const [newDesignation, setNewDesignation] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await api.get("/principal/promotions/stats");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  // Fetch staff
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedDepartment && selectedDepartment !== "All") params.department = selectedDepartment;
      if (selectedDesignation && selectedDesignation !== "All") params.designation = selectedDesignation;
      if (selectedStatus && selectedStatus !== "All") params.status = selectedStatus;

      const res = await api.get("/principal/promotions/staff", { params });
      if (res.data?.success) {
        setStaffList(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (historySearch) params.teacher = historySearch;
      if (historyActionType && historyActionType !== "All") params.actionType = historyActionType;
      if (historyStartDate) params.startDate = historyStartDate;
      if (historyEndDate) params.endDate = historyEndDate;

      const res = await api.get("/principal/promotions/history", { params });
      if (res.data?.success) {
        setHistoryList(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchStaff();
    } else {
      fetchHistory();
    }
  }, [activeTab, searchQuery, selectedDepartment, selectedDesignation, selectedStatus, historySearch, historyActionType, historyStartDate, historyEndDate]);

  // Extract unique departments for filters
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(staffList.map(item => item.department).filter(Boolean));
    return Array.from(depts);
  }, [staffList]);

  // Modal open handlers
  const handlePromoteClick = (teacher) => {
    setSelectedTeacher(teacher);
    setModalType("promote");
    setNewDesignation("");
    setReason("");
    setModalError("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    openModal("promotion-demotion-modal");
  };

  const handleDemoteClick = (teacher) => {
    setSelectedTeacher(teacher);
    setModalType("demote");
    setNewDesignation("");
    setReason("");
    setModalError("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    openModal("promotion-demotion-modal");
  };

  // Submit action
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!newDesignation || !reason || !effectiveDate) {
      setModalError("All fields are required.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError("");
      const payload = {
        teacherId: selectedTeacher._id || selectedTeacher.id || selectedTeacher.employeeId || selectedTeacher.teacherId,
        newDesignation,
        reason,
        effectiveDate
      };

      const endpoint = modalType === "promote" ? "/principal/promotions/promote" : "/principal/promotions/demote";
      const res = await api.post(endpoint, payload);

      if (res.data?.success) {
        closeModal("promotion-demotion-modal");
        fetchStats();
        if (activeTab === "manage") {
          fetchStaff();
        } else {
          fetchHistory();
        }
      }
    } catch (err) {
      setModalError(err.response?.data?.message || `Failed to complete ${modalType} request.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns Setup
  const manageColumns = [
    {
      key: "teacherName",
      label: "Teacher Name",
      render: (val) => <span className="font-bold text-gray-900">{val}</span>
    },
    {
      key: "employeeId",
      label: "Employee ID",
      render: (val) => <span className="font-mono text-xs px-2.5 py-1 bg-gray-100 rounded text-gray-600 font-bold">{val}</span>
    },
    {
      key: "department",
      label: "Department",
      render: (val) => <span className="text-gray-600 font-medium">{val}</span>
    },
    {
      key: "currentDesignation",
      label: "Designation",
      render: (val) => <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg capitalize">{val}</span>
    },
    {
      key: "joiningDate",
      label: "Joining Date",
      render: (val) => <span className="text-gray-600 font-medium">{val ? new Date(val).toLocaleDateString() : "—"}</span>
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (val) => (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${val === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 border" : "bg-rose-50 text-rose-700 border-rose-200 border"
          }`}>
          {val}
        </span>
      )
    }
  ];

  const manageActions = [
    {
      label: "Promote",
      icon: <ArrowUpRight className="w-3.5 h-3.5" />,
      variant: "success",
      disabled: (row) => getDesignationIndex(row.currentDesignation) === designationHierarchy.length - 1,
      onClick: (row) => handlePromoteClick(row)
    },
    {
      label: "Demote",
      icon: <ArrowDownRight className="w-3.5 h-3.5" />,
      variant: "danger",
      disabled: (row) => getDesignationIndex(row.currentDesignation) === 0,
      onClick: (row) => handleDemoteClick(row)
    }
  ];

  const historyColumns = [
    {
      key: "teacherName",
      label: "Teacher Name",
      render: (val) => <span className="font-bold text-gray-900">{val}</span>
    },
    {
      key: "employeeId",
      label: "Employee ID",
      render: (val) => <span className="font-mono text-xs px-2.5 py-1 bg-gray-100 rounded text-gray-600 font-bold">{val}</span>
    },
    {
      key: "previousDesignation",
      label: "Previous Designation",
      render: (val) => <span className="text-gray-600 font-medium">{val}</span>
    },
    {
      key: "newDesignation",
      label: "New Designation",
      render: (val) => <span className="text-gray-900 font-bold">{val}</span>
    },
    {
      key: "actionType",
      label: "Action Type",
      align: "center",
      render: (val) => (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${val === "promotion" ? "bg-emerald-50 text-emerald-700 border-emerald-200 border" : "bg-rose-50 text-rose-700 border-rose-200 border"
          } capitalize`}>
          {val}
        </span>
      )
    },
    {
      key: "effectiveDate",
      label: "Effective Date",
      render: (val) => <span className="text-gray-600 font-semibold">{new Date(val).toLocaleDateString()}</span>
    },
    {
      key: "promotedByName",
      label: "Changed By",
      render: (val) => <span className="text-gray-600 font-medium">{val}</span>
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (val) => <span className="text-gray-500 text-xs">{new Date(val).toLocaleString()}</span>
    }
  ];

  // Dynamic values based on selected teacher for dropdowns
  const currentIdx = selectedTeacher ? getDesignationIndex(selectedTeacher.currentDesignation) : 1;
  const availableDesignations = useMemo(() => {
    if (!selectedTeacher) return [];
    if (modalType === "promote") {
      return designationHierarchy.slice(currentIdx + 1);
    } else if (modalType === "demote") {
      return designationHierarchy.slice(0, currentIdx);
    }
    return [];
  }, [selectedTeacher, modalType, currentIdx]);

  return (
    <div className="w-full space-y-6 text-left">
      <main className="text-left">
        {/* Header Block */}
        <div className="mb-6">
          <Heading
            primaryText="Promotions-Demotions"
            secondaryText="& HRM"
            showAnimations={true}
          />
        </div>

        {/* Stats Cards Section */}
        <div className="mb-6">
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard title="Total Promotions" value={stats.totalPromotions.toString()} icon={<TrendingUp size={22} />} size={3} accentColor="#10B981" />
            <EnhancedDashCard title="Total Demotions" value={stats.totalDemotions.toString()} icon={<TrendingDown size={22} />} size={3} accentColor="#EF4444" />
            <EnhancedDashCard title="This Month Promotions" value={stats.thisMonthPromotions.toString()} icon={<Calendar size={22} />} size={3} accentColor="#3B82F6" />
            <EnhancedDashCard title="This Month Demotions" value={stats.thisMonthDemotions.toString()} icon={<Calendar size={22} />} size={3} accentColor="#F59E0B" />
          </DashGrid>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("manage")}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === "manage"
                ? "border-[#223F74] text-[#223F74]"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <Users className="w-4 h-4" />
            Manage Promotions
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${activeTab === "history"
                ? "border-[#223F74] text-[#223F74]"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            Promotion History
          </button>
        </div>

        {activeTab === "manage" ? (
          <>
            {/* Staff List Table */}
            {loading ? (
              <LoadingState />
            ) : (
              <div className="mb-6">
                <DataTable
                  columns={manageColumns}
                  rows={staffList}
                  actions={manageActions}
                  size={12}
                  pageSize={10}
                  pageSizeOptions={[5, 10, 20, 50]}
                  searchable={true}
                  bulkAction={false}
                  exportable={true}
                  filters={[
                    { title: "Department", type: "toggle", key: "department", options: ["All", ...uniqueDepartments], fn: () => true },
                    { title: "Designation", type: "toggle", key: "designation", options: ["All", ...designationHierarchy], fn: () => true },
                    { title: "Status", type: "toggle", key: "status", options: ["All", "Active", "Inactive"], fn: () => true }
                  ]}
                  onApplyFilters={(applied) => {
                    if (applied.department && applied.department.length > 0) {
                      setSelectedDepartment(applied.department[0]);
                    } else setSelectedDepartment("All");
                    
                    if (applied.designation && applied.designation.length > 0) {
                      setSelectedDesignation(applied.designation[0]);
                    } else setSelectedDesignation("All");

                    if (applied.status && applied.status.length > 0) {
                      setSelectedStatus(applied.status[0]);
                    } else setSelectedStatus("All");
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* History Table */}
            {loading ? (
              <LoadingState />
            ) : (
              <div className="mb-6">
                <DataTable
                  columns={historyColumns}
                  rows={historyList}
                  size={12}
                  pageSize={10}
                  pageSizeOptions={[5, 10, 20, 50]}
                  searchable={true}
                  bulkAction={false}
                  exportable={true}
                  filters={[
                    { title: "Action Type", type: "toggle", key: "actionType", options: ["All", "Promotion", "Demotion"], fn: () => true },
                    { title: "Start Date", type: "date", key: "startDate", fn: () => true },
                    { title: "End Date", type: "date", key: "endDate", fn: () => true }
                  ]}
                  onApplyFilters={(applied) => {
                    if (applied.actionType && applied.actionType.length > 0) {
                      setHistoryActionType(applied.actionType[0]);
                    } else setHistoryActionType("All");
                    
                    if (applied.startDate) setHistoryStartDate(applied.startDate);
                    else setHistoryStartDate("");

                    if (applied.endDate) setHistoryEndDate(applied.endDate);
                    else setHistoryEndDate("");
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Promotion / Demotion Modal */}
      <Modal id="promotion-demotion-modal" title={modalType === "promote" ? "Confirm Promotion" : "Confirm Demotion"} size="md">
        <form onSubmit={handleModalSubmit} className="space-y-5 text-left p-2">
          {modalError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {selectedTeacher && (
            <ModalGrid title="Teacher Details" cols={3}>
              <ModalData label="Teacher Name" value={selectedTeacher.teacherName} />
              <ModalData label="Employee ID" value={selectedTeacher.employeeId} />
              <ModalData label="Designation" value={selectedTeacher.currentDesignation} />
            </ModalGrid>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SelectField
                label={`Select New Designation`}
                id="modalNewDesignation"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                placeholder="Choose designation..."
                searchable={false}
                size={12}
              >
                <Option value="" label="Select designation..." />
                {availableDesignations.map((des) => (
                  <Option key={des} value={des} label={des} />
                ))}
              </SelectField>
            </div>
            <div>
              <DatePicker
                label="Effective Date"
                value={effectiveDate}
                onChange={(val) => setEffectiveDate(val)}
                placeholder="Select date"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#223F74] mb-1.5 uppercase tracking-wide">
              Reason / Remarks
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Provide reasoning for this designation change...`}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => closeModal("promotion-demotion-modal")}
              variant="ghost"
              text="Cancel"
              size={3}
            />
            <Button
              type="submit"
              disabled={submitting || availableDesignations.length === 0}
              variant={modalType === "promote" ? "success" : "danger"}
              text={submitting ? "Processing..." : modalType === "promote" ? "Confirm Promotion" : "Confirm Demotion"}
              size={5}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PromotionsDemotions;
