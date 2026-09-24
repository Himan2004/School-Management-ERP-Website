import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Edit2,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  History,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Services
import {
  getAllStudents,
  exportStudentList,
  getClasses,
  getStudentStats,
  fetchSectionsForClass,
} from "../../../services/api/principalStudentApi";
import {
  fetchOrganizationSchools,
  transferStudent,
} from "../../../services/api/principalAdmissionListApi";

// Shared Components
import {
  Grid,
  Heading,
  Button,
  DataField,
  SelectField,
  Option,
  DataTable,
  Modal,
  openModal,
  closeModal,
  DashGrid,
  EnhancedDashCard,
} from "../../../components/shared/Common_Components";
import StudentDetailsDrawer from "../StudentDetailsDrawer";

const AllStudents = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, transferred: 0 });
  const [totalFound, setTotalFound] = useState(0);

  // ─── Filters & Search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState(["All"]); // ✅ Starts with only "All"

  // ─── Pagination & Modals ───
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ─── Transfer Modal State ───
  const [selectedTransferStudent, setSelectedTransferStudent] = useState(null);
  const [targetSchool, setTargetSchool] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [availableSchools, setAvailableSchools] = useState([]);

  // 1. Fetch Classes on Mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await getClasses();
        if (response.success) {
          setClassList([
            { id: "All", name: "All Classes" },
            ...response.data.map((c) => ({ id: c._id, name: c.name })),
          ]);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    loadClasses();
  }, []);

  // Fetch global student stats
  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await getStudentStats();
      if (response.success && response.data?.summary) {
        setStats(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  // 2. Fetch Sections Dynamically when Class changes
  const loadSections = async (classId) => {
    if (classId === "All") {
      setSectionList(["All"]);
      return;
    }
    try {
      const res = await fetchSectionsForClass(classId);
      if (res.success) {
        // Assuming your backend returns data: ["A", "B", "C"]
        setSectionList(["All", ...res.data]);
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
      toast.error("Failed to load sections for this class.");
    }
  };

  // 3. Fetch Students Logic
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: statusFilter === "All" ? "" : statusFilter.toLowerCase(),
        classId: classFilter === "All" ? "" : classFilter,
        sectionId: sectionFilter === "All" ? "" : sectionFilter,
      };

      const response = await getAllStudents(params);
      if (response.success) {
        setStudents(response.data);
        setTotalFound(response.total || response.data.length);
        setTotalPages(
          response.totalPages ||
          Math.ceil((response.total || response.data.length) / itemsPerPage),
        );
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchQuery,
    classFilter,
    sectionFilter,
    statusFilter,
    itemsPerPage,
  ]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchStudents(), 300);
    return () => clearTimeout(debounce);
  }, [fetchStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, sectionFilter, statusFilter]);

  // ─── Handlers ───
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = { classId: classFilter === "All" ? "" : classFilter };
      const response = await exportStudentList(params);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "students_list.csv");
      document.body.appendChild(link);
      link.click();
      toast.success("Export started");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleTransferClick = async (student) => {
    setSelectedTransferStudent(student);
    openModal("transfer-modal");

    try {
      const res = await fetchOrganizationSchools();
      if (res.success) setAvailableSchools(res.data);
    } catch (err) {
      toast.error("Failed to load destination branches");
    }
  };

  const handleConfirmTransfer = async () => {
    if (!targetSchool || !transferReason.trim()) return;
    setTransferLoading(true);
    try {
      await transferStudent({
        studentId: selectedTransferStudent._id,
        targetSchoolId: targetSchool,
        reason: transferReason,
      });
      toast.success(`Student transferred successfully.`);
      closeModal("transfer-modal");
      setTargetSchool("");
      setTransferReason("");
      setSelectedTransferStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error("Failed to transfer student. Please try again.");
    } finally {
      setTransferLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setClassFilter("All");
    setSectionFilter("All");
    setStatusFilter("All");
    setSectionList(["All"]); // Reset section dropdown options
  };

  // ─── Map Data for DataTable ───
  const tableColumns = [
    { key: "admissionNo", label: "Admission No" },
    { key: "studentName", label: "Student Name" },
    { key: "classSection", label: "Class & Section" },
    { key: "parent", label: "Parent" },
    { key: "contact", label: "Contact" },
    { key: "status", label: "Status" },
  ];

  const tableRows = useMemo(() => {
    return students.map((student) => ({
      _original: student,
      id: student._id,
      admissionNo: student.enrollmentNo || student.rollNo || "N/A",
      studentName: student.user?.name || student.fullName || "N/A",
      photoUrl:
        student.user?.photo ||
        `https://ui-avatars.com/api/?name=${student.user?.name || "S"}&background=random`,
      classSection: `${student.class?.name || "N/A"} - ${student.section?.name || student.section || "A"}`,
      parent: student.parent?.fatherName || student.parent?.fullName || "N/A",
      contact: student.user?.phone || student.parent?.primaryContact || "N/A",
      status: student.status || "Active",
    }));
  }, [students]);

  const tableActions = [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => {
        setSelectedStudent(row._original);
        openModal("student-view-modal");
      },
    },
    {
      icon: <Edit2 size={16} />,
      tooltip: "Edit Student",
      variant: "ghost",
      onClick: (row) => navigate(`/principal/students/manage/${row.id}?edit=true`, { state: { editMode: true } }),
    },
    {
      icon: <ArrowRightLeft size={16} />,
      tooltip: "Initiate Transfer",
      variant: "danger",
      show: (row) => {
        const s = row.status?.toLowerCase();
        return s !== "transferred" && s !== "tc_issued";
      },
      onClick: (row) => handleTransferClick(row._original),
    },
    {
      icon: <History size={16} />,
      tooltip: "View TC History",
      variant: "primary",
      show: (row) => {
        const s = row.status?.toLowerCase();
        return s === "transferred" || s === "tc_issued";
      },
      onClick: (row) =>
        navigate("/principal/admissions/transfer", {
          state: { studentId: row.id, activeTab: "history" },
        }),
    },
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      <Heading
        primaryText="All Students"
        secondaryText={
          loading ? "Searching..." : `${totalFound} students found`
        }
        action={
          <Button
            text={isExporting ? "Exporting..." : "Export"}
            icon={
              isExporting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )
            }
            variant="secondary"
            disabled={isExporting}
            onClick={handleExport}
            size={12}
          />
        }
      />

      {/* Stats Cards */}
      <div>
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard
            title="Total Students"
            value={String(stats.total || 0)}
            accentColor="#223F74"
            size={3}
          />
          <EnhancedDashCard
            title="Active Students"
            value={String(stats.active || 0)}
            accentColor="#5B9A6A"
            size={3}
          />
          <EnhancedDashCard
            title="Inactive Students"
            value={String(stats.inactive || 0)}
            accentColor="#D66B5F"
            size={3}
          />
          <EnhancedDashCard
            title="Transferred Students"
            value={String(stats.transferred || 0)}
            accentColor="#E0A04B"
            size={3}
          />
        </DashGrid>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
        <Grid cols={12} gap={4}>
          <DataField
            id="searchQuery"
            placeholder="Search name or admission no..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size={3}
          />

          {/* ✅ Cascading Class Dropdown */}
          <SelectField
            id="classFilter"
            label=""
            value={classFilter}
            onChange={(e) => {
              const selectedClass = e.target.value;
              setClassFilter(selectedClass);
              setSectionFilter("All"); // Reset section instantly
              loadSections(selectedClass); // Fetch correct sections
            }}
            searchable={false}
            size={2}
          >
            {classList.map((cls) => (
              <Option key={cls.id} value={cls.id} label={cls.name} />
            ))}
          </SelectField>

          {/* ✅ Locked Section Dropdown */}
          <SelectField
            id="sectionFilter"
            label=""
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            searchable={false}
            size={2}
            disabled={classFilter === "All"}
          >
            {sectionList.map((section) => (
              <Option
                key={section}
                value={section}
                label={
                  section === "All"
                    ? classFilter === "All"
                      ? "Select Class First"
                      : "All Sections"
                    : `Section ${section}`
                }
              />
            ))}
          </SelectField>

          <SelectField
            id="statusFilter"
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            searchable={false}
            size={2}
          >
            {[
              "All",
              "Active",
              "Inactive",
              "TC Issued",
              "Transferred",
              "Dropped",
            ].map((status) => (
              <Option
                key={status}
                value={
                  status === "All"
                    ? "All"
                    : status.toLowerCase().replace(" ", "_")
                }
                label={status === "All" ? "All Statuses" : status}
              />
            ))}
          </SelectField>

          <div className="col-span-12 sm:col-span-3 flex items-center justify-end">
            <Button
              text="Reset Filters"
              variant="ghost"
              onClick={resetFilters}
              size={12}
            />
          </div>
        </Grid>
      </div>

      {/* ── Table & Pagination ── */}
      <div>
        <DataTable
          columns={tableColumns}
          rows={tableRows}
          actions={tableActions}
          userProfile="studentName"
          searchable={false}
          hidePagination={true}
          hideRecordSummary={true}
        />

        {students.length > 0 && (
          <div className="flex items-center justify-between px-1 mt-5">
            <p className="text-xs text-[#6B7280] font-medium">
              Showing{" "}
              <span className="text-[#223F74] font-bold">
                {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, totalFound)}
              </span>{" "}
              of <span className="text-[#223F74] font-bold">{totalFound}</span>{" "}
              records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none custom-scrollbar">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 ${currentPage === i + 1
                      ? "bg-[#223F74] text-white shadow"
                      : "border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#eef2f7]"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Drawers & Modals ── */}
      <Modal id="student-view-modal" title="Student Insights" size="xl">
        {selectedStudent && (
          <StudentDetailsDrawer
            student={selectedStudent}
            onClose={() => closeModal("student-view-modal")}
          />
        )}
      </Modal>

      <Modal id="transfer-modal" title="Transfer Certificate" size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Transferring{" "}
            <span className="font-bold text-[#223F74]">
              {selectedTransferStudent?.user?.name ||
                selectedTransferStudent?.fullName ||
                "Unknown Student"}
            </span>{" "}
            to another branch within your organization.
          </p>

          <Grid cols={1} gap={4}>
            <SelectField
              id="targetSchool"
              label="Destination Branch *"
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="Select Branch"
            >
              <Option value="" label="Select Branch" />
              {availableSchools.map((school) => (
                <Option
                  key={school._id}
                  value={school._id}
                  label={school.name}
                />
              ))}
            </SelectField>

            <DataField
              id="transferReason"
              label="Reason for Transfer *"
              type="textarea"
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="E.g. Parent relocated..."
            />
          </Grid>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
            <Button
              text="Cancel"
              variant="ghost"
              onClick={() => closeModal("transfer-modal")}
              size={3}
            />
            <Button
              text="Initiate Transfer"
              variant="primary"
              onClick={handleConfirmTransfer}
              loading={transferLoading}
              disabled={!targetSchool || !transferReason.trim()}
              size={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllStudents;