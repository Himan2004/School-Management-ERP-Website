import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
  FileText,
  IndianRupee,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import StudentAdmissionDetailsModal from "../../../components/principal/StudentAdmissionDetailsModal";

// Services
import {
  fetchAdmissionList,
  fetchDashboardStats,
  changeAdmissionStatus,
  exportAdmissionsCSV,
  fetchFilterMetadata,
} from "../../../services/api/principalAdmissionListApi";
import { getClassesAndSections } from "../../../services/api/adminStudentApi";
import { approveAdmission } from "../../../services/api/principalAdmissionApi";

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
  Select,
  Modal,
  openModal,
  closeModal,
} from "../../../components/shared/Common_Components";
import { adjustFeeValues, handleFeeKeyDown, handleFeePaste } from "../../../utils/feeValidation";

const FeeField = ({ label, id, value, onChange, error, disabled, readOnly, size = 6 }) => {
  const hasError = !!error;
  const borderCls = hasError
    ? "border-[#D66B5F]/50 bg-rose-50/20 focus:ring-[#D66B5F]/20 focus:border-[#D66B5F]"
    : "border-[#E2E8F0] bg-white focus:ring-[#223F74]/20 focus:border-[#223F74]";

  return (
    <div className={`col-span-12 md:col-span-${size} flex flex-col gap-1.5 text-left`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          onKeyDown={handleFeeKeyDown}
          onPaste={handleFeePaste}
          className={`w-full rounded-2xl border ${borderCls} text-[#1D1D1F] placeholder:text-[#9CA3AF] text-sm font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 px-4 py-3.5`}
        />
        {error && <p className="text-xs text-rose-500 font-semibold mt-1">{error}</p>}
      </div>
    </div>
  );
};

// Wrapper to remove the built-in rows-per-page Select dropdown from DataTable
const PatchedDataTable = (props) => {
  const filterSelect = (node) => {
    if (!node || typeof node !== "object") return node;
    if (node.type === Select) return null;
    if (node.props && node.props.children) {
      const children = node.props.children;
      if (Array.isArray(children)) {
        const newChildren = children.map(filterSelect).filter(Boolean);
        return {
          ...node,
          props: {
            ...node.props,
            children: newChildren,
          },
        };
      } else {
        const newChild = filterSelect(children);
        return {
          ...node,
          props: {
            ...node.props,
            children: newChild,
          },
        };
      }
    }
    return node;
  };

  try {
    const tree = DataTable(props);
    return filterSelect(tree);
  } catch (e) {
    console.error("Error patching DataTable:", e);
    return <DataTable {...props} />;
  }
};

// Global module-level cache for instant page switching
let admissionsCache = null;
let classListCache = null;
let admissionFiltersCache = {
  searchQuery: "",
  classFilter: "all",
  sectionFilter: "All",
  statusFilter: "All",
  currentPage: 1,
  rowsPerPage: 10
};

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
    },
    documents: normalizeDocuments(firstStudent.documents),
    remarks: item.remarks || "",
    rawStudents: item.students || [],
  };
};

const AdmissionList = () => {
  const navigate = useNavigate();

  // Determine user role and corresponding base path prefix
  const userRole = useSelector(
    (state) => state.adminAuth.authUser?.role || state.principalAuth.authUser?.role
  );
  const basePath = userRole === "admin" ? "/admin" : "/principal";

  const [admissions, setAdmissions] = useState(admissionsCache || []);
  const stats = useMemo(() => {
    const counts = { total: 0, approved: 0, pending: 0, cancelled: 0 };
    admissions.forEach((adm) => {
      counts.total += 1;
      const status = adm.status?.toLowerCase();
      if (status === "approved") counts.approved += 1;
      else if (status === "pending") counts.pending += 1;
      else if (status === "cancelled") counts.cancelled += 1;
    });
    return counts;
  }, [admissions]);
  const [loading, setLoading] = useState(!admissionsCache);
  const [viewRequest, setViewRequest] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(admissionFiltersCache.searchQuery);
  
  // Separate Class & Section Filter States
  const [classFilter, setClassFilter] = useState(admissionFiltersCache.classFilter);
  const [sectionFilter, setSectionFilter] = useState(admissionFiltersCache.sectionFilter);
  
  const [classList, setClassList] = useState(classListCache || []);
  const [statusFilter, setStatusFilter] = useState(admissionFiltersCache.statusFilter);

  // client-side filtering
  const filteredAdmissions = useMemo(() => {
    let result = [...admissions];

    // 1. Search Filter
    if (searchQuery.trim()) {
      const searchRegex = new RegExp(searchQuery.trim(), "i");
      result = result.filter((adm) => {
        const parentName = adm.parent?.fullName || "";
        const appNo = adm.applicationNumber || "";
        const contact = adm.parent?.primaryContact || "";
        const rawStudents = adm.students || [];
        const studentMatches = rawStudents.some(s => 
          searchRegex.test(s.fullName || "") ||
          searchRegex.test(s.enrollmentNumber || "") ||
          searchRegex.test(s.admissionNo || "")
        );
        return (
          studentMatches ||
          searchRegex.test(parentName) ||
          searchRegex.test(appNo) ||
          searchRegex.test(contact)
        );
      });
    }

    // 2. Class Filter
    if (classFilter !== "all" && classFilter !== "All") {
      result = result.filter((adm) => {
        const rawStudents = adm.students || [];
        return rawStudents.some(student => {
          const classId = student?.class?._id || student?.class?.id || (typeof student?.class === 'string' ? student?.class : "");
          return classId === classFilter;
        });
      });
    }

    // 3. Section Filter
    if (sectionFilter !== "all" && sectionFilter !== "All") {
      result = result.filter((adm) => {
        const rawStudents = adm.students || [];
        return rawStudents.some(student => {
          const sectionName = student?.section || "";
          return sectionName.toLowerCase() === sectionFilter.toLowerCase();
        });
      });
    }

    // 4. Status Filter
    if (statusFilter !== "all" && statusFilter !== "All") {
      result = result.filter((adm) => adm.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    return result;
  }, [admissions, searchQuery, classFilter, sectionFilter, statusFilter]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(admissionFiltersCache.currentPage);
  const [rowsPerPage, setRowsPerPage] = useState(admissionFiltersCache.rowsPerPage);

  const totalCount = filteredAdmissions.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = useMemo(() => {
    return filteredAdmissions.slice(startIndex, endIndex);
  }, [filteredAdmissions, currentPage, rowsPerPage]);

  // Modal States
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [leavingDate, setLeavingDate] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Complete Payment Modal States
  const [modalPaymentStatus, setModalPaymentStatus] = useState("Unpaid");
  const [modalAmountPaid, setModalAmountPaid] = useState(0);
  const [modalRemarks, setModalRemarks] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Sync state changes back to global cache
  useEffect(() => {
    admissionFiltersCache = {
      searchQuery,
      classFilter,
      sectionFilter,
      statusFilter,
      currentPage,
      rowsPerPage
    };
  }, [searchQuery, classFilter, sectionFilter, statusFilter, currentPage, rowsPerPage]);

  // ─── Fetch Metadata (Classes/Sections) ─────────────────────────────────────
  useEffect(() => {
    const loadMetadata = async () => {
      if (classListCache) return;
      try {
        const res = await getClassesAndSections();
        if (res.success && res.data) {
          const uniqueClasses = [];
          const seenIds = new Set();
          const seenNames = new Set();

          res.data.forEach((cls) => {
            if (!cls || (!cls._id && !cls.id) || !cls.name) return;
            const clsId = cls.id || cls._id;
            const normalizedName = cls.name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!seenIds.has(clsId) && !seenNames.has(normalizedName)) {
              seenIds.add(clsId);
              seenNames.add(normalizedName);
              uniqueClasses.push(cls);
            }
          });

          // Sort naturally based on numericLevel or numeric value in name
          uniqueClasses.sort((a, b) => {
            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

          setClassList(uniqueClasses);
          classListCache = uniqueClasses;
        } else {
          setClassList([]);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    loadMetadata();
  }, []);

  // ─── Dynamically Populated Available Sections ──────────────────────────────
  const availableSections = useMemo(() => {
    if (classFilter === "all" || classFilter === "All") {
      const allSecs = new Set();
      classList.forEach((cls) => {
        if (Array.isArray(cls.sections)) {
          cls.sections.forEach((s) => {
            const sName = typeof s === "object" ? s.name : s;
            if (sName) allSecs.add(sName.trim());
          });
        }
      });
      return Array.from(allSecs).sort();
    } else {
      const selectedClass = classList.find((c) => c._id === classFilter || c.id === classFilter);
      if (selectedClass && Array.isArray(selectedClass.sections)) {
        return selectedClass.sections
          .map((s) => (typeof s === "object" ? s.name : s))
          .filter(Boolean)
          .sort();
      }
      return [];
    }
  }, [classFilter, classList]);

  const handleClassChange = (selectedClassId) => {
    setClassFilter(selectedClassId);
    if (selectedClassId !== "all" && selectedClassId !== "All") {
      const selectedClass = classList.find((c) => c._id === selectedClassId || c.id === selectedClassId);
      const secs = selectedClass && Array.isArray(selectedClass.sections)
        ? selectedClass.sections.map((s) => (typeof s === "object" ? s.name : s)).filter(Boolean)
        : [];
      if (sectionFilter !== "All" && !secs.includes(sectionFilter)) {
        setSectionFilter("All");
      }
    }
  };

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchAdmissions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = { page: 1, limit: 10000 };
      const res = await fetchAdmissionList(params);
      if (res.success) {
        setAdmissions(res.data || []);
        admissionsCache = res.data || [];
      }
    } catch {
      toast.error("Failed to load admissions. Please try again.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);



  useEffect(() => {
    if (!admissionsCache) {
      fetchAdmissions();
    }
  }, [fetchAdmissions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, classFilter, sectionFilter, rowsPerPage]);

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
    } catch {
      toast.error("Failed to cancel admission. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaymentClick = (admission) => {
    setSelectedAdmission(admission);
    setModalPaymentStatus(admission.feeDetails?.paymentStatus || "Unpaid");
    setModalAmountPaid(admission.feeDetails?.amountPaid || 0);
    setModalRemarks(admission.feeDetails?.remarks || "");
    setPaymentLoading(false);
    openModal("payment-modal");
  };

  const handleModalPaymentStatusChange = (val) => {
    setModalPaymentStatus(val);
    if (val === "Paid") {
      setModalAmountPaid(selectedAdmission?.feeDetails?.totalPayable || 0);
    } else {
      setModalAmountPaid(0);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedAdmission) return;
    setPaymentLoading(true);
    try {
      const totalPayable = selectedAdmission.feeDetails?.totalPayable || 0;
      const payload = {
        feeDetails: {
          paymentStatus: modalPaymentStatus,
          amountPaid: Number(modalAmountPaid) || 0,
          remainingAmount: Math.max(0, totalPayable - (Number(modalAmountPaid) || 0)),
          remarks: modalRemarks || null
        }
      };

      const res = await approveAdmission(selectedAdmission._id, payload);
      if (res.success) {
        toast.success("Payment confirmed and admission approved successfully!");
        closeModal("payment-modal");
        setSelectedAdmission(null);
        fetchAdmissions();
      } else {
        toast.error(res.message || "Failed to confirm payment.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to confirm payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const filteredIds = filteredAdmissions.map(a => a._id).join(",");
      await exportAdmissionsCSV({ ids: filteredIds });
      toast.success("Export successful!");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setClassFilter("all");
    setSectionFilter("All");
    setStatusFilter("All");
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
    { key: "applicants", label: "Applicants" },
    { key: "parent", label: "Parent Name" },
    { key: "contact", label: "Contact" },
    { key: "submitted", label: "Submitted At" },
    { key: "status", label: "Status" },
  ];

  const tableRows = useMemo(() => {
    return paginatedData.map((adm) => {
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

      // Display the admissionNo/enrollmentNumber of the first student (or fallback to applicationNo)
      const firstStudentAdmNo = rawStudents[0]?.enrollmentNumber || rawStudents[0]?.admissionNo || adm.applicationNumber || "—";

      return {
        _original: adm,
        id: adm._id,
        applicants: applicantsText,
        parent: adm.parent?.fullName || "—",
        admNo: firstStudentAdmNo,
        contact: adm.parent?.primaryContact || "—",
        submitted: adm.submittedAt
          ? new Date(adm.submittedAt).toLocaleDateString()
          : new Date(adm.createdAt).toLocaleDateString(),
        status: formatStatus(adm.status),
      };
    });
  }, [paginatedData]);

  const tableActions = useMemo(() => {
    const actions = [
      {
        icon: <Eye size={16} />,
        tooltip: "View Details",
        variant: "ghost",
        onClick: (row) => setViewRequest(normalizeAdmissionRequest(row._original)),
      },
    ];

    if (userRole === "admin") {
      actions.push({
        icon: <IndianRupee size={16} />,
        tooltip: "Complete Payment",
        variant: "ghost",
        show: (row) => row._original.status?.toLowerCase() === "pending",
        onClick: (row) => handlePaymentClick(row._original),
      });

      actions.push({
        icon: <Ban size={16} />,
        tooltip: "Cancel Admission",
        variant: "danger",
        disabled: (row) =>
          ["cancelled", "transferred", "dropped", "tc_issued", "rejected"].includes(
            row._original.status?.toLowerCase()
          ),
        onClick: (row) => handleCancelClick(row._original),
      });
    }

    return actions;
  }, [basePath, userRole, navigate]);

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* ── Header ── */}
      <Heading
        primaryText="Student Admission"
        secondaryText={`${totalCount} admissions found`}
        action={
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Button
              text="Export CSV"
              icon={exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              variant="secondary"
              onClick={handleExportCSV}
              disabled={exportLoading}
              size={12}
              className="w-full md:w-auto"
            />
            {userRole === "admin" && (
              <Button
                text="New Admission"
                icon={<Plus size={16} />}
                variant="primary"
                onClick={() => navigate(`${basePath}/admissions/new`)}
                size={12}
                className="w-full md:w-auto"
              />
            )}
          </div>
        }
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
          <DataField
            id="searchQuery"
            placeholder="Search name, ref no..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size={3}
          />
          
          {/* Class Filter */}
          <SelectField
            id="classFilter"
            value={classFilter}
            onChange={(e) => handleClassChange(e.target.value)}
            searchable={true}
            size={3}
          >
            <Option value="all" label="All Classes" />
            {classList.map((cls) => (
              <Option key={cls.id || cls._id} value={cls.id || cls._id} label={cls.name} />
            ))}
          </SelectField>

          {/* Section Filter */}
          <SelectField
            id="sectionFilter"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            searchable={true}
            size={2}
          >
            <Option value="All" label="All Sections" />
            {availableSections.map((sec) => (
              <Option key={sec} value={sec} label={`Section ${sec}`} />
            ))}
          </SelectField>

          <SelectField
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            searchable={false}
            size={3}
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
          
          <div className="col-span-12 sm:col-span-1 flex items-center justify-end">
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
      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden custom-cancel-admission-table">
        <style>{`
          .custom-cancel-admission-table div.flex.flex-col > div.flex-wrap {
            display: none !important;
          }
        `}</style>
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-[#223F74] mb-2" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Admission List...</p>
          </div>
        ) : (
          <>
            {/* Header inside the table card containing the Rows per page dropdown at the top-right */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Admission List</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="p-1.5 border border-gray-200 rounded-xl font-bold text-xs text-[#223F74] focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <DataTable
              columns={tableColumns}
              rows={tableRows}
              actions={tableActions}
              searchable={false}
              hidePagination={true}
              hideRecordSummary={true}
              pageSize={10000}
            />

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">
                  Showing{" "}
                  <span className="text-[#223F74] font-bold">
                    {(currentPage - 1) * rowsPerPage + 1}–
                    {Math.min(currentPage * rowsPerPage, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="text-[#223F74] font-bold">{totalCount}</span>{" "}
                  records
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none custom-scrollbar">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 ${
                          currentPage === i + 1
                            ? "bg-[#223F74] text-white shadow"
                            : "border border-gray-200 bg-white text-gray-500 hover:bg-[#eef2f7]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-[#eef2f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {totalCount === 0 && (
              <div className="p-12 text-center text-gray-400">
                <FileText size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-sm">No Admissions Found</p>
                <p className="text-xs text-gray-400 mt-1">Try modifying your search or dropdown filters</p>
              </div>
            )}
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

      {/* ── Complete Payment Modal ── */}
      <Modal id="payment-modal" title="Complete Payment" size="lg">
        {selectedAdmission && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Complete fee payment for student <span className="font-bold text-slate-900">{getStudentName(selectedAdmission)}</span> (Application No: <span className="font-bold text-slate-900">{selectedAdmission.applicationNumber}</span>).
            </p>

            <Grid cols={3} gap={4}>
              <FeeField
                id="modalAdmissionFee"
                label="Admission Fee"
                value={selectedAdmission.feeDetails?.admissionFee || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalDiscount"
                label="Discount"
                value={selectedAdmission.feeDetails?.discount || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalScholarship"
                label="Scholarship"
                value={selectedAdmission.feeDetails?.scholarship || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalLateFee"
                label="Late Fee"
                value={selectedAdmission.feeDetails?.lateFee || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalOtherCharges"
                label="Other Charges"
                value={selectedAdmission.feeDetails?.otherCharges || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalTotalPayable"
                label="Total Payable"
                value={selectedAdmission.feeDetails?.totalPayable || 0}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalAmountPaid"
                label="Amount Paid *"
                value={modalAmountPaid}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <FeeField
                id="modalRemainingAmount"
                label="Remaining Amount"
                value={Math.max(0, (selectedAdmission.feeDetails?.totalPayable || 0) - modalAmountPaid)}
                disabled={true}
                readOnly={true}
                size={4}
              />
              <SelectField
                id="modalPaymentStatus"
                label="Payment Status *"
                value={modalPaymentStatus}
                onChange={(e) => handleModalPaymentStatusChange(e.target.value)}
              >
                <Option value="Paid" label="Paid" />
                <Option value="Unpaid" label="Unpaid" />
              </SelectField>
            </Grid>

            <Grid cols={3} gap={4}>
              <DataField
                id="modalPaymentDate"
                label="Payment Date"
                value={selectedAdmission.feeDetails?.paymentDate || "—"}
                disabled={true}
                readOnly={true}
              />
              <DataField
                id="modalReceiptNumber"
                label="Receipt Number"
                value={selectedAdmission.feeDetails?.receiptNumber || "—"}
                disabled={true}
                readOnly={true}
              />
              <DataField
                id="modalCollectedBy"
                label="Collected By"
                value={selectedAdmission.feeDetails?.remarks ? selectedAdmission.feeDetails.remarks.split(" - ")[0] : "Admin"}
                disabled={true}
                readOnly={true}
              />
            </Grid>

            <DataField
              id="modalRemarks"
              label="Remarks"
              type="textarea"
              rows={2}
              value={modalRemarks}
              onChange={(e) => setModalRemarks(e.target.value)}
              placeholder="Enter payment remarks, cheque info, transaction ID, etc."
            />

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
              <Button
                text="Go Back"
                variant="ghost"
                onClick={() => closeModal("payment-modal")}
                size={3}
              />
              <Button
                text="Confirm Payment"
                variant="primary"
                onClick={handleConfirmPayment}
                loading={paymentLoading}
                disabled={modalPaymentStatus !== "Paid"}
                size={4}
              />
            </div>
          </div>
        )}
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
