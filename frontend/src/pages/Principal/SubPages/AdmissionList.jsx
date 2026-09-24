import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Eye,
  X,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Services
import {
  fetchAdmissionList,
  fetchDashboardStats,
  changeAdmissionStatus,
  exportAdmissionsCSV,
  fetchFilterMetadata,
} from "../../../services/api/principalAdmissionListApi";

// Shared Components
import {
  Grid,
  DashGrid,
  EnhancedDashCard,
  Heading,
  Button,
  DataField,
  SelectField,
  Option,
  DataTable,
  Modal,
  openModal,
  closeModal,
} from "../../../components/shared/Common_Components";
import StudentAdmissionDetailsModal from "../../../components/principal/StudentAdmissionDetailsModal";

const normalizeDocuments = (docs) => {
  if (!docs || typeof docs !== "object") return [];
  return Object.entries(docs)
    .filter(([, val]) => val && val.url)
    .map(([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      fileName: val.url.split("/").pop() || `${key}.pdf`,
      status: val.status || 'submitted',
      remarks: val.remarks || '',
      url: val.url,
    }));
};

const normalizeAdmissionRequest = (item) => {
  const studentIndex = item._studentIndex !== undefined ? item._studentIndex : 0;
  const firstStudent = Array.isArray(item.students) ? item.students[studentIndex] || {} : {};
  const parent = item.parent || {};
  const address = parent.address || {};

  return {
    _id: item._id,
    admissionRequestId: item._id,
    studentIndex: studentIndex,
    applicationNo: item.applicationNumber || "N/A",
    submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(),
    status: item.status || "pending",
    organizationName: item.organizationName || "",
    branchName: item.branchName || "",
    student: {
      fullName: firstStudent.fullName || "Unnamed",
      dob: firstStudent.dob ? new Date(firstStudent.dob).toLocaleDateString('en-IN') : "",
      gender: firstStudent.gender || "",
      bloodGroup: firstStudent.bloodGroup || "",
      aadhaar: parent.aadharNumber || "",
      previousSchool: firstStudent.previousSchool || "",
      photo: firstStudent.photo || null,
    },
    academic: {
      appliedClass: firstStudent.class?.name || firstStudent.class || "",
      preferredSection: firstStudent.section || "",
      academicYear: firstStudent.academicYear || "",
      rollNumber: firstStudent.rollNumber || "",
      transportRequired: firstStudent.transport?.required ? "Yes" : "No",
      busRoute: firstStudent.transport?.busRoute || "",
      healthNotes: firstStudent.healthNotes || "",
    },
    contact: {
      email: parent.email || "",
      phone: parent.primaryContact || "",
      alternatePhone: parent.alternatePhone || parent.alternateContact || "",
      city: address.city || "",
      address: [address.street, address.city, address.state, address.pincode]
        .filter(Boolean).join(", "),
    },
    parent: {
      fullName: parent.fullName || "",
      relation: parent.relation || "",
      fatherName: parent.fatherName || "",
      motherName: parent.motherName || "",
      guardianPhone: parent.alternateContact || parent.primaryContact || "",
      notifications: parent.notifications || {},
      emergencyContact: parent.emergencyContact || {},
    },
    documents: normalizeDocuments(firstStudent.documents),
    remarks: item.remarks || "",
    rawStudents: item.students || [],
  };
};

const AdmissionList = () => {
  const navigate = useNavigate();

  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    cancelled: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  // Single Combined Filter State
  const [classSectionFilter, setClassSectionFilter] = useState("All");

  const [classList, setClassList] = useState([]);
  const [allSections, setAllSections] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [filterDate, setFilterDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Modal States
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [leavingDate, setLeavingDate] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);

  // ─── Fetch Metadata (Classes/Sections) ─────────────────────────────────────
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const res = await fetchFilterMetadata();
        if (res.success) {
          setClassList(res.data.classes || []);
          setAllSections(res.data.sections || []);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    loadMetadata();
  }, []);

  // ─── Generate Combined Class + Section Options ─────────────────────────────
  const combinedClassSectionOptions = useMemo(() => {
    const opts = [{ val: "All", lbl: "All Classes & Sections" }];

    classList.forEach((c) => {
      // Add parent class option (Selects the class, ignoring specific sections)
      opts.push({ val: `${c._id}|All`, lbl: `${c.name} (All Sections)` });

      // Add child section options specific to this class
      const sections = allSections.filter((s) => s.classId === c._id);
      sections.forEach((s) => {
        opts.push({
          val: `${c._id}|${s.name}`,
          lbl: `${c.name} - Sec ${s.name}`,
        });
      });
    });

    return opts;
  }, [classList, allSections]);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 5000 };

      if (statusFilter !== "All") params.status = statusFilter;
      if (filterDate) {
        params.fromDate = filterDate;
        params.toDate = filterDate;
      }

      // Parse the combined filter
      if (classSectionFilter !== "All") {
        const [classId, sectionName] = classSectionFilter.split("|");
        params.classId = classId;
        if (sectionName !== "All") {
          params.section = sectionName;
        }
      }

      const res = await fetchAdmissionList(params);
      if (res.success) {
        setAdmissions(res.data);
        setTotalPages(1);
        setTotalCount(res.data.length || res.pagination?.total || 0);
      }
    } catch {
      toast.error("Failed to load admissions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    classSectionFilter,
    filterDate,
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchDashboardStats();
      if (res.success) setStats(res.data);
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleCancelClick = (admission) => {
    setSelectedAdmission(admission);
    setCancelReason("");
    setLeavingDate("");
    openModal("cancel-admission-modal");
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim() || !leavingDate) return;
    setCancelLoading(true);
    try {
      await changeAdmissionStatus(
        selectedAdmission._id,
        "cancelled",
        cancelReason,
      );
      toast.success(`Admission cancelled successfully.`);
      closeModal("cancel-admission-modal");
      setSelectedAdmission(null);
      fetchAdmissions();
      fetchStats();
    } catch {
      toast.error("Failed to cancel admission. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      await exportAdmissionsCSV();
      toast.success("Export successful!");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const resetFilters = () => {
    setClassSectionFilter("All");
    setStatusFilter("All");
    setFilterDate("");
  };

  const getStudentName = (adm) => adm.students?.[0]?.fullName || "—";

  // ─── Map Data for DataTable ────────────────────────────────────────────────
  const formatStatus = (s) => {
    if (!s) return "—";
    const lowerS = s.toLowerCase();

    const statusMap = {
      pending: "Pending",
      under_review: "Under Review",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
      active: "Active",
      inactive: "Inactive",
      transferred: "Transferred",
      dropped: "Dropped",
      tc_issued: "TC Issued",
    };

    return (
      statusMap[lowerS] ||
      s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  const tableColumns = [
    { key: "appNo", label: "Application No" },
    { key: "applicants", label: "Applicants" },
    { key: "parent", label: "Parent Name" },
    { key: "contact", label: "Contact" },
    { key: "submitted", label: "Submitted At" },
    { key: "status", label: "Status" },
  ];

  const tableRows = useMemo(() => {
    return admissions.map((adm) => {
      const rawStudents = adm.students || [];
      let applicantsText = "";
      if (rawStudents.length > 1) {
        const firstStudent = rawStudents[0]?.fullName || "Unnamed";
        applicantsText = `${firstStudent} (+${rawStudents.length - 1})`;
      } else if (rawStudents.length === 1) {
        applicantsText = rawStudents[0]?.fullName || "Unnamed";
      } else {
        applicantsText = "—";
      }

      return {
        _original: adm,
        id: adm._id,
        appNo: adm.applicationNumber || "—",
        applicants: applicantsText,
        parent: adm.parent?.fullName || "—",
        contact: adm.parent?.primaryContact || "—",
        submitted: adm.submittedAt
          ? new Date(adm.submittedAt).toLocaleDateString()
          : new Date(adm.createdAt).toLocaleDateString(),
        status: formatStatus(adm.status),
      };
    });
  }, [admissions]);

  const tableActions = [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => setViewRequest(normalizeAdmissionRequest(row._original)),
    },
    {
      icon: <Ban size={16} />,
      tooltip: "Cancel Admission",
      variant: "danger",
      show: (row) =>
        !["cancelled", "transferred", "dropped", "tc_issued", "rejected"].includes(row._original.status?.toLowerCase()),
      onClick: (row) => handleCancelClick(row._original),
    },
  ];

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* ── Header ── */}
      <Heading
        primaryText="Admission Hub"
      />

      {/* ── Summary Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Admissions"
          value={stats.total}
          icon={<FileText size={24} />}
          accentColor="#3b82f6"
          size={3}
        />
        <EnhancedDashCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircle size={24} />}
          accentColor="#22c55e"
          size={3}
        />
        <EnhancedDashCard
          title="Pending Review"
          value={stats.pending}
          icon={<Clock size={24} />}
          accentColor="#f59e0b"
          size={3}
        />
        <EnhancedDashCard
          title="Cancelled"
          value={stats.cancelled}
          icon={<XCircle size={24} />}
          accentColor="#f43f5e"
          size={3}
        />
      </DashGrid>

      {/* ── Filter Bar ── */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
        <Grid cols={12} gap={4}>
          {/* Combined Class & Section Filter */}
          <SelectField
            id="classSectionFilter"
            label="Class & Section"
            value={classSectionFilter}
            onChange={(e) => setClassSectionFilter(e.target.value)}
            searchable={true}
            size={4}
          >
            {combinedClassSectionOptions.map((opt) => (
              <Option key={opt.val} value={opt.val} label={opt.lbl} />
            ))}
          </SelectField>

          <SelectField
            id="statusFilter"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            searchable={false}
            size={4}
          >
            {[
              { val: "All", lbl: "All Statuses" },
              { val: "pending", lbl: "Pending" },
              { val: "approved", lbl: "Approved" },
              { val: "cancelled", lbl: "Cancelled" },
            ].map((opt) => (
              <Option key={opt.val} value={opt.val} label={opt.lbl} />
            ))}
          </SelectField>

          <DataField
            id="filterDate"
            label="Date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            size={3}
          />

          <div className="col-span-12 sm:col-span-1 flex items-end">
            <Button
              text="Reset"
              variant="ghost"
              onClick={resetFilters}
              size={12}
            />
          </div>
        </Grid>
      </div>

      {/* ── Data Table ── */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2DB] h-64 flex items-center justify-center">
            <Loader2 size={36} className="animate-spin text-[#223F74]" />
          </div>
        ) : (
          <>
            <DataTable
              title="Admission List"
              columns={tableColumns}
              rows={tableRows}
              actions={tableActions}
              searchable={true}
              exportable={true}
              hidePagination={false}
              hideRecordSummary={true}
            />

            {/* Custom Server-Side Pagination replicating DataTable Styles Removed */}
          </>
        )}
      </div>

      {/* ── Cancel Modal ── */}
      <Modal id="cancel-admission-modal" title="Cancel Admission" size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            You are about to cancel admission for{" "}
            <span className="font-bold text-slate-900">
              {selectedAdmission && getStudentName(selectedAdmission)}
            </span>
            . This action cannot be undone. Please provide the details below.
          </p>

          <Grid cols={1} gap={4}>
            <DataField
              id="cancelReason"
              label="Reason for Cancellation *"
              type="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="E.g. Parent requested, unfulfilled requirements..."
            />
            <DataField
              id="leavingDate"
              label="Leaving Date *"
              type="date"
              value={leavingDate}
              onChange={(e) => setLeavingDate(e.target.value)}
            />
          </Grid>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
            <Button
              text="Go Back"
              variant="ghost"
              onClick={() => closeModal("cancel-admission-modal")}
              size={3}
            />
            <Button
              text="Confirm Cancel"
              variant="danger"
              onClick={handleConfirmCancel}
              loading={cancelLoading}
              disabled={!cancelReason.trim() || !leavingDate}
              size={4}
            />
          </div>
        </div>
      </Modal>

      {viewRequest && (
        <StudentAdmissionDetailsModal
          request={viewRequest}
          onClose={() => setViewRequest(null)}
        />
      )}
    </div>
  );
};

export default AdmissionList;