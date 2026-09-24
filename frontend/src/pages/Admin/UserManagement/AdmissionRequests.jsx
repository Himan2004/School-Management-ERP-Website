import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Eye, CheckCircle, Search, Filter, Clock3,
  ClipboardList, BookOpen, AlertTriangle, X, ChevronLeft, ChevronRight, Loader2, Calendar, Building2
} from "lucide-react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import StudentAdmissionDetailsModal from "../../../components/principal/StudentAdmissionDetailsModal";
import {
  getAllAdmissions as fetchAdmissionRequests,
  approveAdmission,
  rejectAdmission,
  markAdmissionInReview,
  getAdmissionStats
} from "../../../services/api/principalAdmissionApi";
import { getClassesAndSections } from "../../../services/api/adminStudentApi";
import { fetchOrganizationSchools } from "../../../services/api/principalAdmissionListApi";
import { 
  Heading, Button, DataTable, Select,
  DashGrid, EnhancedDashCard, PanelModal, Grid, SelectField, Option, DataField,
  Modal, openModal, closeModal
} from "../../../components/shared/Common_Components";
import DatePicker from "../../../components/shared/DatePicker";
import { jsPDF } from "jspdf";
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

const statusConfig = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  under_review: "bg-sky-100 text-sky-800",
  cancelled: "bg-slate-100 text-slate-800",
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

const normalizeAdmissionRequest = (item, studentIndex = 0) => {
  const student = Array.isArray(item.students) ? item.students[studentIndex] || {} : {};
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
      fullName: student.fullName || "Unnamed",
      dob: student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : "",
      gender: student.gender || "",
      bloodGroup: student.bloodGroup || "",
      aadhaar: parent.aadharNumber || "",
      previousSchool: student.previousSchool || "",
      photo: student.photo || null,
    },
    academic: {
      appliedClass: student.class?.name || student.class || "",
      classId: student.class?._id || student.class?.id || (typeof student.class === 'string' ? student.class : ""),
      preferredSection: student.section || "",
      academicYear: student.academicYear || "",
      rollNumber: student.rollNumber || "",
      transportRequired: student.transport?.required ? "Yes" : "No",
      busRoute: student.transport?.busRoute || "",
      healthNotes: student.healthNotes || "",
    },
    contact: {
      email: parent.email || "",
      phone: parent.primaryContact || "",
      alternatePhone: parent.alternateContact || "",
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
      email: parent.email || "",
      primaryContact: parent.primaryContact || "",
    },
    documents: normalizeDocuments(student.documents),
    remarks: item.remarks || "",
    admissionSource: item.admissionSource || "ONLINE",
    reviewedBy: item.reviewedBy || null,
    rawStudents: item.students || [],
  };
};

// Global module-level cache for instant page switching
let requestsCache = null;
let classesListCache = null;
let statsCache = null;
let requestsFiltersCache = {
  searchTerm: "",
  statusFilter: "pending",
  classFilter: "all",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  rowsPerPage: 10
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdmissionRequests = () => {
  const location = useLocation();
  const userRole = useSelector(
    (state) => state.adminAuth.authUser?.role || state.principalAuth.authUser?.role
  );

  const [requests, setRequests] = useState(requestsCache || []);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState(requestsFiltersCache.searchTerm);
  const [statusFilter, setStatusFilter] = useState(requestsFiltersCache.statusFilter);
  const [classFilter, setClassFilter] = useState(requestsFiltersCache.classFilter);
  const [fromDate, setFromDate] = useState(requestsFiltersCache.fromDate);
  const [toDate, setToDate] = useState(requestsFiltersCache.toDate);
  const [isLoading, setIsLoading] = useState(!requestsCache);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // id of request being rejected
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  useEffect(() => {
    if (rejectTarget) {
      setRejectReason("");
      setRejectError("");
      openModal("reject-admission-modal");
    } else {
      closeModal("reject-admission-modal");
    }
  }, [rejectTarget]);
  const [currentPage, setCurrentPage] = useState(requestsFiltersCache.currentPage);
  const [rowsPerPage, setRowsPerPage] = useState(requestsFiltersCache.rowsPerPage);
  const [classesList, setClassesList] = useState(classesListCache || []);
  
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [currentApprovalRequest, setCurrentApprovalRequest] = useState(null);
  const [approvalStep, setApprovalStep] = useState(1);
  const [feeDataList, setFeeDataList] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const feeData = feeDataList[selectedStudentIndex] || {};
  const updateCurrentStudentFeeData = (updater) => {
    setFeeDataList(prev => {
      const newList = [...prev];
      const targetIndex = selectedStudentIndex;
      newList[targetIndex] = typeof updater === 'function' ? updater(newList[targetIndex]) : { ...newList[targetIndex], ...updater };
      return newList;
    });
  };
  const [isStatusOverridden, setIsStatusOverridden] = useState(false);
  const [feeErrors, setFeeErrors] = useState({});

  const authUser = useSelector(
    (state) => state.adminAuth.authUser || state.principalAuth.authUser
  );
  const getCurrentAdminName = () => {
    return authUser?.name || 'Administrator';
  };
  const [realStats, setRealStats] = useState(statsCache || {
    total: 0,
    pending: 0,
    approved: 0,
    under_review: 0,
    rejected: 0,
  });

  // Sync state changes back to global cache
  useEffect(() => {
    requestsFiltersCache = {
      searchTerm,
      statusFilter,
      classFilter,
      fromDate,
      toDate,
      currentPage,
      rowsPerPage
    };
  }, [searchTerm, statusFilter, classFilter, fromDate, toDate, currentPage, rowsPerPage]);

  useEffect(() => {
    if (location.state?.highlightId && requests.length > 0) {
      const match = requests.find(r => r._id === location.state.highlightId || r.id === location.state.highlightId);
      if (match) {
        setSelectedRequest(match);
        if (match.status !== statusFilter) {
          setStatusFilter(match.status);
        }
      }
    }
  }, [location.state?.highlightId, requests, statusFilter]);

  // client-side filtering
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // 1. Search Filter
    if (searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      result = result.filter((r) => {
        const parentName = r.parent?.fullName || "";
        const appNo = r.applicationNo || "";
        const email = r.contact?.email || "";
        const phone = r.contact?.phone || "";
        const rawStudents = r.rawStudents || [];
        const studentMatches = rawStudents.some(s => 
          searchRegex.test(s.fullName || "")
        );
        return (
          studentMatches ||
          searchRegex.test(parentName) ||
          searchRegex.test(appNo) ||
          searchRegex.test(email) ||
          searchRegex.test(phone)
        );
      });
    }

    // 2. Status Filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // 3. Class Filter
    if (classFilter !== "all") {
      result = result.filter((r) => {
        const rawStudents = r.rawStudents || [];
        return rawStudents.some(s => {
          const cId = s.class?._id || s.class?.id || (typeof s.class === 'string' ? s.class : "");
          return cId === classFilter;
        });
      });
    }

    // 4. From Date Filter
    if (fromDate) {
      const fromDateObj = new Date(fromDate);
      fromDateObj.setHours(0, 0, 0, 0);
      result = result.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        return submittedDate >= fromDateObj;
      });
    }

    // 5. To Date Filter
    if (toDate) {
      const toDateObj = new Date(toDate);
      toDateObj.setHours(23, 59, 59, 999);
      result = result.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        return submittedDate <= toDateObj;
      });
    }

    return result;
  }, [requests, searchTerm, statusFilter, classFilter, fromDate, toDate]);

  const totalCount = filteredRequests.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = useMemo(() => {
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, currentPage, rowsPerPage]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("pending");
    setClassFilter("all");
    setFromDate("");
    setToDate("");
  };

  const updateStatusLocally = (id, status) => {
    setRequests((prev) => prev.map((r) => {
      return r._id === id ? { ...r, status } : r;
    }));
  };

  const loadRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchAdmissionRequests({ 
          page: 1, 
          limit: 10000
      });
      
      const raw = Array.isArray(response.data) ? response.data : [];
      const normalized = raw.map(item => normalizeAdmissionRequest(item, 0));
      const filtered = normalized.filter(item => {
        if (item.admissionSource === 'ADMIN') return false;
        if (item.status === 'pending' && item.reviewedBy) return false;
        return true;
      });
      setRequests(filtered);
      requestsCache = filtered;

      // Compute client-side stats from the filtered list of parent requests
      const counts = { total: 0, pending: 0, approved: 0, under_review: 0, rejected: 0 };
      filtered.forEach(item => {
        const status = item.status === 'under_review' ? 'under_review' : item.status;
        if (counts[status] !== undefined) {
          counts[status] += 1;
        }
        counts.total += 1;
      });
      setRealStats(counts);
      statsCache = counts;
    } catch (error) {
      console.error("API Error details:", error);
      const actualErrorMsg = error?.response?.data?.message || error?.message || "Failed to fetch admission requests.";
      setErrorMessage(`Error: ${actualErrorMsg}`);
      setRequests([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, classFilter, fromDate, toDate, rowsPerPage]);

  // Load requests once on mount
  useEffect(() => {
    if (!requestsCache) {
      loadRequests();
    }
  }, [loadRequests]);

  // Load available classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      if (classesListCache) return;
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

          // Natural sorting
          uniqueClasses.sort((a, b) => {
            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

          setClassesList(uniqueClasses);
          classesListCache = uniqueClasses;
        } else {
          setClassesList([]);
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
        setClassesList([]);
      }
    };
    loadClasses();
  }, []);

  // Keep modal in sync when list updates
  useEffect(() => {
    if (!selectedRequest) return;
    const latest = requests.find((r) => r._id === selectedRequest._id);
    if (latest) setSelectedRequest(latest);
  }, [requests]);

  const handleViewRequest = async (request) => {
    setSelectedRequest(request);

    // If it is currently pending and user is admin, tell the backend it is now In Review
    if (request.status === "pending" && userRole === "admin") {
      try {
        const dbId = request.admissionRequestId || request._id;
        await markAdmissionInReview(dbId);
        updateStatusLocally(request._id, "under_review");
        // Update stats count locally
        setRealStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          under_review: prev.under_review + 1
        }));
      } catch (error) {
        console.error("Failed to mark as in review", error);
      }
    }
  };

  // Fee calculations
  const admissionFeeVal = Number(feeData.admissionFee) || 0;
  const tuitionFeeVal = Number(feeData.tuitionFee) || 0;
  const discountVal = Number(feeData.discount) || 0;
  const scholarshipVal = Number(feeData.scholarship) || 0;
  const lateFeeVal = Number(feeData.lateFee) || 0;
  const otherChargesVal = Number(feeData.otherCharges) || 0;

  const totalPayable = Math.max(0, admissionFeeVal + tuitionFeeVal - discountVal - scholarshipVal + lateFeeVal + otherChargesVal);
  const amountPaidVal = Number(feeData.amountPaid) || 0;
  const remainingAmount = Math.max(0, totalPayable - amountPaidVal);

  // Auto update payment status based on amount paid
  useEffect(() => {
    if (!isStatusOverridden && currentApprovalRequest) {
      let status = 'Unpaid';
      if (amountPaidVal > 0 && amountPaidVal >= totalPayable) {
        status = 'Paid';
      } else {
        status = 'Unpaid';
      }
      updateCurrentStudentFeeData(prev => ({ ...prev, paymentStatus: status }));
    }
  }, [amountPaidVal, totalPayable, isStatusOverridden]);

  const handleFeeChange = (field, value) => {
    updateCurrentStudentFeeData(prev => {
      const updated = adjustFeeValues(field, value, prev);
      if (feeErrors[field]) {
        setFeeErrors(errs => ({ ...errs, [field]: '' }));
      }
      return updated;
    });
  };

  const handlePaymentStatusChange = (e) => {
    setIsStatusOverridden(true);
    const newStatus = e.target.value;
    updateCurrentStudentFeeData(prev => {
      const updated = { ...prev, paymentStatus: newStatus };
      if (newStatus === 'Paid') {
        updated.amountPaid = totalPayable.toString();
      } else if (newStatus === 'Unpaid') {
        updated.amountPaid = '0';
      }
      return updated;
    });
  };

  const resolveClassName = (clsValue) => {
    if (!clsValue) return "";
    if (typeof clsValue === 'object') {
        if (clsValue.name) return clsValue.name;
        if (clsValue.className) return clsValue.className;
    }
    const clsId = String(clsValue);
    const matched = Array.isArray(classesList) 
        ? classesList.find(c => (c.id || c._id) === clsId || c.name === clsId) 
        : null;
    if (matched) return matched.name;
    return clsId;
  };

  const formatClassName = (clsVal) => {
    const resolved = resolveClassName(clsVal);
    if (!resolved) return "";
    const nameStr = String(resolved).trim();
    if (/^class/i.test(nameStr)) {
        return nameStr;
    }
    return `Class ${nameStr}`;
  };

  const openApprovalFlow = (reqObj) => {
    setCurrentApprovalRequest(reqObj);
    const rawStus = reqObj.rawStudents || [{}];
    const initialFeeList = rawStus.map(() => ({
      admissionFee: '',
      tuitionFee: '',
      discount: '0',
      scholarship: '',
      lateFee: '0',
      otherCharges: '',
      amountPaid: '',
      paymentStatus: 'Unpaid',
      paymentMode: '',
      transactionId: '',
      chequeNumber: '',
      ddNumber: '',
      receiptNumber: `RCP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    }));
    setFeeDataList(initialFeeList);
    setSelectedStudentIndex(0);
    setIsStatusOverridden(false);
    setApprovalStep(1);
    setFeeErrors({});
    setIsFeeModalOpen(true);
  };

  const handleNextStep = () => {
    for (let i = 0; i < feeDataList.length; i++) {
      const fData = feeDataList[i];
      const admissionFeeVal = Number(fData.admissionFee) || 0;
      const tuitionFeeVal = Number(fData.tuitionFee) || 0;
      const discountVal = Number(fData.discount) || 0;
      const scholarshipVal = Number(fData.scholarship) || 0;
      const lateFeeVal = Number(fData.lateFee) || 0;
      const otherChargesVal = Number(fData.otherCharges) || 0;
      const totalPayable = Math.max(0, admissionFeeVal + tuitionFeeVal - discountVal - scholarshipVal + lateFeeVal + otherChargesVal);

      const newErrors = {};

      if (!fData.admissionFee || Number(fData.admissionFee) <= 0) {
        newErrors.admissionFee = 'Admission Fee is required and must be greater than 0';
      }
      if (fData.amountPaid === '' || Number(fData.amountPaid) < 0) {
        newErrors.amountPaid = 'Amount Paid is required';
      } else if (Number(fData.amountPaid) > totalPayable) {
        newErrors.amountPaid = 'Amount Paid cannot be greater than Total Payable';
      }
      if (!fData.paymentMode) {
        newErrors.paymentMode = 'Payment Mode is required';
      }

      if (fData.paymentMode === 'UPI' || fData.paymentMode === 'Card' || fData.paymentMode === 'Bank Transfer') {
        if (!fData.transactionId || !fData.transactionId.trim()) {
          newErrors.transactionId = 'Transaction ID is required for online payments';
        }
      }
      if (fData.paymentMode === 'Cheque') {
        if (!fData.chequeNumber || !fData.chequeNumber.trim()) {
          newErrors.chequeNumber = 'Cheque Number is required';
        }
      }
      if (fData.paymentMode === 'Demand Draft') {
        if (!fData.ddNumber || !fData.ddNumber.trim()) {
          newErrors.ddNumber = 'DD Number is required';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setSelectedStudentIndex(i);
        setFeeErrors(newErrors);
        toast.error(`Please correct fee details for student: ${currentApprovalRequest?.rawStudents?.[i]?.fullName || 'Student'}`);
        return;
      }
    }

    setFeeErrors({});
    setApprovalStep(2);
  };

  const handleDownloadReceipt = (studentId, rollNumber, studentIdx = 0) => {
    const fData = feeDataList[studentIdx] || {};
    const admissionFeeVal = Number(fData.admissionFee) || 0;
    const tuitionFeeVal = Number(fData.tuitionFee) || 0;
    const discountVal = Number(fData.discount) || 0;
    const scholarshipVal = Number(fData.scholarship) || 0;
    const lateFeeVal = Number(fData.lateFee) || 0;
    const otherChargesVal = Number(fData.otherCharges) || 0;
    const currentTotalPayable = Math.max(0, admissionFeeVal + tuitionFeeVal - discountVal - scholarshipVal + lateFeeVal + otherChargesVal);
    const currentRemainingAmount = Math.max(0, currentTotalPayable - (Number(fData.amountPaid) || 0));

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const primaryColor = "#223F74";
    const darkColor = "#1D1D1F";

    // Header
    doc.setFillColor(34, 63, 116);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("GRAPHURA SCHOOL MANAGEMENT ERP", 15, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Official Student Fee Collection Receipt", 15, 25);

    // Title / Receipt Details
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("FEE RECEIPT", 15, 55);

    doc.setTextColor(darkColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Receipt No:", 140, 55);
    doc.setFont("helvetica", "normal");
    doc.text(fData.receiptNumber || 'N/A', 165, 55);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 140, 61);
    doc.setFont("helvetica", "normal");
    doc.text(fData.paymentDate || 'N/A', 165, 61);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 66, 195, 66);

    // Student Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.text("STUDENT & APPLICATION DETAILS", 15, 75);

    const targetStudent = currentApprovalRequest?.rawStudents?.[studentIdx] || currentApprovalRequest?.student || {};
    const studentName = targetStudent.fullName || targetStudent.name || 'N/A';

    doc.setTextColor(darkColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Student Name:", 15, 83);
    doc.setFont("helvetica", "normal");
    doc.text(studentName, 45, 83);

    doc.setFont("helvetica", "bold");
    doc.text("Application No:", 15, 89);
    doc.setFont("helvetica", "normal");
    doc.text(currentApprovalRequest?.applicationNo || currentApprovalRequest?.applicationNumber || 'N/A', 45, 89);

    const targetClass = targetStudent.class?.name || targetStudent.class || currentApprovalRequest?.academic?.appliedClass || currentApprovalRequest?.class;
    const selectedClassObj = classesList.find(c => c._id === targetClass || c.id === targetClass);
    const classNameStr = selectedClassObj ? selectedClassObj.name : (targetClass || 'N/A');
    const preferredSection = targetStudent.section || currentApprovalRequest?.academic?.preferredSection || currentApprovalRequest?.section || 'N/A';
    
    doc.setFont("helvetica", "bold");
    doc.text("Class / Section:", 120, 83);
    doc.setFont("helvetica", "normal");
    doc.text(`${classNameStr} / Section ${preferredSection}`, 155, 83);

    doc.setFont("helvetica", "bold");
    doc.text("Roll Number:", 120, 89);
    doc.setFont("helvetica", "normal");
    doc.text(rollNumber || 'NA', 155, 89);

    // Divider Line
    doc.line(15, 96, 195, 96);

    // Fee breakdown table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.text("FEE STRUCTURE & PAYMENTS", 15, 105);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 110, 180, 8, "F");
    doc.setFontSize(9);
    doc.setTextColor(darkColor);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, 115);
    doc.text("Amount (INR)", 160, 115);

    // Table rows
    const rows = [
      { label: "Admission Fee", value: `INR ${Number(fData.admissionFee || 0).toFixed(2)}` },
      { label: "Tuition Fee", value: `INR ${Number(fData.tuitionFee || 0).toFixed(2)}` },
      { label: "Admission Discount (-)", value: `INR ${Number(fData.discount || 0).toFixed(2)}` },
      { label: "Scholarship Amount (-)", value: `INR ${Number(fData.scholarship || 0).toFixed(2)}` },
      { label: "Late Fee (+)", value: `INR ${Number(fData.lateFee || 0).toFixed(2)}` },
      { label: "Other Charges (+)", value: `INR ${Number(fData.otherCharges || 0).toFixed(2)}` }
    ];

    let currentY = 124;
    doc.setFont("helvetica", "normal");
    rows.forEach(r => {
      doc.text(r.label, 20, currentY);
      doc.text(r.value, 160, currentY);
      doc.line(15, currentY + 3, 195, currentY + 3);
      currentY += 9;
    });

    // Totals
    currentY += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Total Payable", 20, currentY);
    doc.text(`INR ${Number(currentTotalPayable).toFixed(2)}`, 160, currentY);
    doc.line(15, currentY + 3, 195, currentY + 3);

    currentY += 9;
    doc.setTextColor("#10B981");
    doc.text("Amount Paid", 20, currentY);
    doc.text(`INR ${Number(fData.amountPaid).toFixed(2)}`, 160, currentY);
    doc.line(15, currentY + 3, 195, currentY + 3);

    currentY += 9;
    doc.setTextColor("#EF4444");
    doc.text("Remaining Balance", 20, currentY);
    doc.text(`INR ${Number(currentRemainingAmount).toFixed(2)}`, 160, currentY);
    doc.line(15, currentY + 3, 195, currentY + 3);

    // Payment Info Panel
    currentY += 12;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, currentY, 180, 24, "F");
    
    doc.setTextColor(darkColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Mode:", 20, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(fData.paymentMode || 'N/A', 50, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Payment Status:", 20, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(fData.paymentStatus || 'N/A', 50, currentY + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Receipt Issued By:", 20, currentY + 18);
    doc.setFont("helvetica", "normal");
    doc.text(getCurrentAdminName(), 50, currentY + 18);

    if (fData.paymentMode === 'Cheque') {
      doc.setFont("helvetica", "bold");
      doc.text("Cheque Number:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(fData.chequeNumber || 'N/A', 140, currentY + 6);
    } else if (fData.paymentMode === 'Demand Draft') {
      doc.setFont("helvetica", "bold");
      doc.text("DD Number:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(fData.ddNumber || 'N/A', 140, currentY + 6);
    } else if (fData.transactionId) {
      doc.setFont("helvetica", "bold");
      doc.text("Transaction ID:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(fData.transactionId || 'N/A', 140, currentY + 6);
    }

    if (fData.remarks) {
      doc.setFont("helvetica", "bold");
      doc.text("Remarks:", 110, currentY + 12);
      doc.setFont("helvetica", "normal");
      doc.text(fData.remarks, 140, currentY + 12);
    }

    // Footer note
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "italic");
    doc.text("This is a system generated receipt and does not require a physical signature.", 15, currentY + 32);

    doc.save(`Receipt_${fData.receiptNumber || 'unpaid'}.pdf`);
  };

  const handleApprove = async (id) => {
    if (userRole !== "admin") return;
    const reqObj = requests.find(r => r._id === id);
    if (!reqObj) {
      toast.error("Unable to find request details.");
      return;
    }
    openApprovalFlow(reqObj);
  };

  const handleConfirmApprove = async () => {
    if (userRole !== "admin") return;
    const reqId = currentApprovalRequest.admissionRequestId || currentApprovalRequest._id;
    setActionLoadingId(currentApprovalRequest._id);
    try {
      // Build the individual students feeDetails array
      const studentsFeeDetails = (currentApprovalRequest.rawStudents || [currentApprovalRequest.student || {}]).map((student, idx) => {
        const fData = feeDataList[idx] || {};
        const admissionFeeVal = Number(fData.admissionFee) || 0;
        const tuitionFeeVal = Number(fData.tuitionFee) || 0;
        const discountVal = Number(fData.discount) || 0;
        const scholarshipVal = Number(fData.scholarship) || 0;
        const lateFeeVal = Number(fData.lateFee) || 0;
        const otherChargesVal = Number(fData.otherCharges) || 0;
        const currentTotalPayable = Math.max(0, admissionFeeVal + tuitionFeeVal - discountVal - scholarshipVal + lateFeeVal + otherChargesVal);
        const currentAmountPaid = Number(fData.amountPaid) || 0;
        const currentRemainingAmount = Math.max(0, currentTotalPayable - currentAmountPaid);

        return {
          feeDetails: {
            admissionFee: admissionFeeVal,
            tuitionFee: tuitionFeeVal,
            discount: discountVal,
            scholarship: scholarshipVal,
            lateFee: lateFeeVal,
            otherCharges: otherChargesVal,
            totalPayable: currentTotalPayable,
            amountPaid: currentAmountPaid,
            remainingAmount: currentRemainingAmount,
            paymentStatus: fData.paymentStatus,
            paymentMode: fData.paymentMode,
            transactionId: fData.transactionId || null,
            chequeNumber: fData.chequeNumber || null,
            ddNumber: fData.ddNumber || null,
            receiptNumber: fData.receiptNumber,
            paymentDate: fData.paymentDate,
            remarks: fData.remarks || null
          }
        };
      });

      // Aggregate overall fee values
      let totalPayableSum = 0;
      let amountPaidSum = 0;
      let remainingAmountSum = 0;
      let overallPaymentStatus = 'Paid';
      let overallPaymentMode = '';

      studentsFeeDetails.forEach(s => {
        totalPayableSum += s.feeDetails.totalPayable;
        amountPaidSum += s.feeDetails.amountPaid;
        remainingAmountSum += s.feeDetails.remainingAmount;
        overallPaymentMode = s.feeDetails.paymentMode || overallPaymentMode;
        if (s.feeDetails.paymentStatus === 'Unpaid') {
          overallPaymentStatus = 'Unpaid';
        }
      });

      const firstFData = feeDataList[0] || {};
      const payload = {
        students: studentsFeeDetails,
        feeDetails: {
          admissionFee: Number(firstFData.admissionFee) || 0,
          tuitionFee: Number(firstFData.tuitionFee) || 0,
          discount: Number(firstFData.discount) || 0,
          scholarship: Number(firstFData.scholarship) || 0,
          lateFee: Number(firstFData.lateFee) || 0,
          otherCharges: Number(firstFData.otherCharges) || 0,
          totalPayable: totalPayableSum,
          amountPaid: amountPaidSum,
          remainingAmount: remainingAmountSum,
          paymentStatus: overallPaymentStatus,
          paymentMode: overallPaymentMode,
          transactionId: firstFData.transactionId || null,
          chequeNumber: firstFData.chequeNumber || null,
          ddNumber: firstFData.ddNumber || null,
          receiptNumber: firstFData.receiptNumber,
          paymentDate: firstFData.paymentDate,
          remarks: firstFData.remarks || null
        }
      };

      const approveResponse = await approveAdmission(reqId, payload);
      if (approveResponse.success) {
        toast.success(overallPaymentStatus === 'Paid' ? "Admission approved successfully!" : "Admission processed successfully (Pending Payment).");
        setIsFeeModalOpen(false);
        
        // Trigger PDF Receipt Download for each Paid student
        try {
          const finalStudentIds = approveResponse.studentProfileIds || approveResponse.data?.studentProfileIds || [approveResponse.studentId || approveResponse.data?.studentId];
          
          finalStudentIds.forEach((studentId, idx) => {
            const fData = feeDataList[idx] || {};
            if (fData.paymentStatus === 'Paid' && studentId) {
              const finalRollNo = (approveResponse.rollNumber && approveResponse.rollNumber !== 'Auto-Generated') 
                ? approveResponse.rollNumber 
                : 'NA';
              handleDownloadReceipt(studentId, finalRollNo, idx);
            }
          });
        } catch (receiptErr) {
          console.error("Failed to generate/download receipt:", receiptErr);
        }
        
        loadRequests();
      } else {
        toast.error(approveResponse.message || "Failed to approve admission.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to approve admission.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (userRole !== "admin") return;
    const reqObj = requests.find(r => r._id === rejectTarget);
    const dbId = reqObj?.admissionRequestId || rejectTarget;
    setActionLoadingId(rejectTarget);
    try {
      await rejectAdmission(dbId, reason);
      toast.success("Admission rejected.");
      setRejectTarget(null);
      loadRequests();
    } catch (error) {
      toast.error(error?.message || "Unable to reject admission.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectError("Rejection reason is required.");
      return;
    }
    handleRejectConfirm(rejectReason.trim());
  };

  const tableColumns = [
    { key: "applicants", label: "Applicants" },
    { key: "parentName", label: "Parent Name" },
    { key: "appNo", label: "Application No" },
    { key: "branchName", label: "School" },
    { key: "appliedDate", label: "Applied Date" },
    { 
      key: "status", 
      label: "Status",
      render: (val, row) => {
        const lowerS = String(val).toLowerCase();
        const displayMap = {
          pending: "Pending",
          approved: "Approved",
          rejected: "Rejected",
          under_review: "In Review",
          cancelled: "Cancelled",
        };
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[lowerS] || "bg-slate-100 text-slate-700"}`}>
            {displayMap[lowerS] || val}
          </span>
        );
      }
    },
  ];

  const tableRows = useMemo(() => {
    return paginatedData.map((r) => {
      const rawStudents = r.rawStudents || [];
      let applicantsText = "";
      if (rawStudents.length > 1) {
        const firstStudent = rawStudents[0]?.fullName || "Unnamed";
        applicantsText = `${firstStudent} (+${rawStudents.length - 1})`;
      } else if (rawStudents.length === 1) {
        applicantsText = rawStudents[0]?.fullName || "Unnamed";
      } else {
        applicantsText = r.student?.fullName || "Unnamed";
      }

      return {
        _original: r,
        id: r._id,
        applicants: applicantsText,
        parentName: r.parent.fullName,
        appNo: r.applicationNo,
        branchName: r.branchName || "—",
        appliedDate: new Date(r.submittedAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        }),
        status: r.status,
      };
    });
  }, [paginatedData]);

  const tableActions = useMemo(() => {
    if (isLoading) return [];
    const actions = [
      {
        icon: <Eye size={16} />,
        tooltip: "View Request",
        variant: "ghost",
        onClick: (row) => handleViewRequest(row._original),
      }
    ];

    if (userRole === "admin") {
      actions.push({
        label: "Approve",
        tooltip: "Approve Admission",
        variant: "success",
        disabled: (row) => actionLoadingId === row.id || !["pending", "under_review"].includes(row._original.status?.toLowerCase()),
        onClick: (row) => handleApprove(row.id),
      });

      actions.push({
        label: "Reject",
        tooltip: "Reject Admission",
        variant: "danger",
        disabled: (row) => actionLoadingId === row.id || !["pending", "under_review"].includes(row._original.status?.toLowerCase()),
        onClick: (row) => setRejectTarget(row.id),
      });
    }

    return actions;
  }, [userRole, actionLoadingId, isLoading]);

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <Heading 
        primaryText="Student Applications"
        secondaryText={`${totalCount} requests found`}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6 mb-6">
          <p className="text-sm font-semibold text-rose-800">{errorMessage}</p>
          <button
            onClick={() => loadRequests()}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="space-y-6 w-full">
        {/* FIRST ROW (2 cards) */}
        <DashGrid cols={12} gap={6}>
          <EnhancedDashCard title="Total Requests" value={realStats.total} icon={<ClipboardList size={24} />} accentColor="#3b82f6" size={6} />
          <EnhancedDashCard title="Approved" value={realStats.approved} icon={<CheckCircle size={24} />} accentColor="#22c55e" size={6} />
        </DashGrid>

        {/* SECOND ROW (3 cards) */}
        <DashGrid cols={12} gap={6}>
          <EnhancedDashCard title="Pending" value={realStats.pending} icon={<Clock3 size={24} />} accentColor="#eab308" size={4} />
          <EnhancedDashCard title="In Review" value={realStats.under_review} icon={<BookOpen size={24} />} accentColor="#38bdf8" size={4} />
          <EnhancedDashCard title="Rejected" value={realStats.rejected} icon={<AlertTriangle size={24} />} accentColor="#f43f5e" size={4} />
        </DashGrid>
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Search */}
          <div className="col-span-12 md:col-span-3 relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search by student, app no, email..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#223F74] focus:border-[#223F74] outline-none transition text-sm font-semibold text-gray-700 bg-gray-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer appearance-none"
            >
              <option value="all">All Classes</option>
              {classesList.map((cls) => (
                <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-[#223F74] outline-none bg-gray-50/50 cursor-pointer"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="col-span-12 sm:col-span-6 md:col-span-1 flex items-center justify-end">
            <Button
              text="Reset"
              variant="ghost"
              onClick={resetFilters}
              size={12}
            />
          </div>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] overflow-hidden custom-cancel-admission-table">
        <style>{`
          .custom-cancel-admission-table div.flex.flex-col > div.flex-wrap {
            display: none !important;
          }
        `}</style>
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-[#223F74] mb-2" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Admission Applications...</p>
          </div>
        ) : (
          <>
            {/* Header inside the table card containing the Rows per page dropdown at the top-right */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Admission Applications</h3>
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
                  <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
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
                <ClipboardList size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-sm">No Admission Applications Found</p>
                <p className="text-xs text-gray-400 mt-1">Try modifying your search or dropdown filters</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <StudentAdmissionDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={userRole === "admin" ? handleApprove : undefined}
          onReject={userRole === "admin" ? (id) => { setSelectedRequest(null); setRejectTarget(id); } : undefined}
          actionLoadingId={actionLoadingId}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <Modal
          id="reject-admission-modal"
          title="Reject Admission"
          size="md"
          onClose={() => setRejectTarget(null)}
        >
          <div className="space-y-4 text-left p-6">
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Please provide a reason for rejection. This will be sent to the parent via email.
            </p>
            
            <div className="space-y-1">
              <textarea
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                rows={4}
                placeholder="Enter rejection reason..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none font-sans"
              />
              {rejectError && <p className="text-xs text-rose-500 font-semibold">{rejectError}</p>}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => setRejectTarget(null)}
              />
              <Button
                text="Confirm Reject"
                variant="primary"
                onClick={handleConfirmReject}
                loading={actionLoadingId === rejectTarget}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Fee Details & Review Approval Flow Modal */}
      {isFeeModalOpen && currentApprovalRequest && (
        <PanelModal
          isVisible={isFeeModalOpen}
          onClose={() => setIsFeeModalOpen(false)}
          title={`Approve Admission - ${(currentApprovalRequest.rawStudents?.[selectedStudentIndex]?.fullName || currentApprovalRequest.student?.fullName || 'Student')}`}
          size="3xl"
        >
          {approvalStep === 1 ? (
            /* Step 1: Fee Details */
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider font-sans">Collect Fees</h3>
                <p className="text-xs text-gray-500 font-medium">Please enter fee details for this student's admission.</p>
                <div className="border-b border-[#E2E8F0] mt-3" />
              </div>

              {/* Student Switcher for multi-student applications */}
              {currentApprovalRequest.rawStudents && currentApprovalRequest.rawStudents.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 text-left">
                  <span className="text-xs font-black text-[#223F74] uppercase mr-1">Switch Student:</span>
                  {currentApprovalRequest.rawStudents.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedStudentIndex(idx);
                        setIsStatusOverridden(false);
                        setFeeErrors({});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        selectedStudentIndex === idx
                          ? "bg-[#223F74] text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {s.fullName || `Student ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <Grid>
                <FeeField
                  label="Admission Fee *"
                  id="admissionFee"
                  value={feeData.admissionFee}
                  onChange={(e) => handleFeeChange('admissionFee', e.target.value)}
                  error={feeErrors.admissionFee}
                  size={6}
                />
                <FeeField
                  label="Tuition Fee (Optional)"
                  id="tuitionFee"
                  value={feeData.tuitionFee}
                  onChange={(e) => handleFeeChange('tuitionFee', e.target.value)}
                  error={feeErrors.tuitionFee}
                  size={6}
                />
                <FeeField
                  label="Admission Discount"
                  id="discount"
                  value={feeData.discount}
                  onChange={(e) => handleFeeChange('discount', e.target.value)}
                  error={feeErrors.discount}
                  size={6}
                />
                <FeeField
                  label="Scholarship Amount"
                  id="scholarship"
                  value={feeData.scholarship}
                  onChange={(e) => handleFeeChange('scholarship', e.target.value)}
                  error={feeErrors.scholarship}
                  size={6}
                />
                <FeeField
                  label="Late Fee"
                  id="lateFee"
                  value={feeData.lateFee}
                  onChange={(e) => handleFeeChange('lateFee', e.target.value)}
                  error={feeErrors.lateFee}
                  size={6}
                />
                <FeeField
                  label="Other Charges"
                  id="otherCharges"
                  value={feeData.otherCharges}
                  onChange={(e) => handleFeeChange('otherCharges', e.target.value)}
                  error={feeErrors.otherCharges}
                  size={6}
                />
                <FeeField
                  label="Total Payable (Calculated)"
                  id="totalPayable"
                  value={totalPayable}
                  disabled={true}
                  readOnly={true}
                  size={6}
                />
                <FeeField
                  label="Amount Paid *"
                  id="amountPaid"
                  value={feeData.amountPaid}
                  onChange={(e) => handleFeeChange('amountPaid', e.target.value)}
                  error={feeErrors.amountPaid}
                  size={6}
                />
                <FeeField
                  label="Remaining Amount (Calculated)"
                  id="remainingAmount"
                  value={remainingAmount}
                  disabled={true}
                  readOnly={true}
                  size={6}
                />
                <div className="col-span-12 sm:col-span-6">
                  <SelectField
                    label="Payment Status"
                    id="paymentStatus"
                    value={feeData.paymentStatus}
                    onChange={handlePaymentStatusChange}
                    searchable={false}
                  >
                    <Option value="Paid" label="Paid" />
                    <Option value="Unpaid" label="Unpaid" />
                  </SelectField>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <SelectField
                    label="Payment Mode *"
                    id="paymentMode"
                    value={feeData.paymentMode}
                    onChange={(e) => {
                      updateCurrentStudentFeeData(prev => ({ ...prev, paymentMode: e.target.value, transactionId: '', chequeNumber: '', ddNumber: '' }));
                      if (feeErrors.paymentMode) setFeeErrors(prev => ({ ...prev, paymentMode: '' }));
                    }}
                    searchable={false}
                  >
                    <Option value="" label="Select Payment Mode" />
                    <Option value="Cash" label="Cash" />
                    <Option value="UPI" label="UPI" />
                    <Option value="Card" label="Card" />
                    <Option value="Bank Transfer" label="Bank Transfer" />
                    <Option value="Cheque" label="Cheque" />
                    <Option value="Demand Draft" label="Demand Draft" />
                  </SelectField>
                </div>

                {/* Conditional fields */}
                {(feeData.paymentMode === 'UPI' || feeData.paymentMode === 'Card' || feeData.paymentMode === 'Bank Transfer') && (
                  <div className="col-span-12 sm:col-span-6">
                    <DataField
                      label="Transaction ID *"
                      id="transactionId"
                      value={feeData.transactionId}
                      onChange={(e) => {
                        updateCurrentStudentFeeData(prev => ({ ...prev, transactionId: e.target.value }));
                        if (feeErrors.transactionId) setFeeErrors(prev => ({ ...prev, transactionId: '' }));
                      }}
                      error={feeErrors.transactionId}
                    />
                  </div>
                )}
                {feeData.paymentMode === 'Cheque' && (
                  <div className="col-span-12 sm:col-span-6">
                    <DataField
                      label="Cheque Number *"
                      id="chequeNumber"
                      value={feeData.chequeNumber}
                      onChange={(e) => {
                        updateCurrentStudentFeeData(prev => ({ ...prev, chequeNumber: e.target.value }));
                        if (feeErrors.chequeNumber) setFeeErrors(prev => ({ ...prev, chequeNumber: '' }));
                      }}
                      error={feeErrors.chequeNumber}
                    />
                  </div>
                )}
                {feeData.paymentMode === 'Demand Draft' && (
                  <div className="col-span-12 sm:col-span-6">
                    <DataField
                      label="DD Number *"
                      id="ddNumber"
                      value={feeData.ddNumber}
                      onChange={(e) => {
                        updateCurrentStudentFeeData(prev => ({ ...prev, ddNumber: e.target.value }));
                        if (feeErrors.ddNumber) setFeeErrors(prev => ({ ...prev, ddNumber: '' }));
                      }}
                      error={feeErrors.ddNumber}
                    />
                  </div>
                )}

                <div className="col-span-12 sm:col-span-6">
                  <DataField
                    label="Receipt Number"
                    id="receiptNumber"
                    value={feeData.receiptNumber}
                    disabled={true}
                    readOnly={true}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <DatePicker
                    label="Payment Date"
                    id="paymentDate"
                    value={feeData.paymentDate}
                    onChange={(val) => updateCurrentStudentFeeData(prev => ({ ...prev, paymentDate: val }))}
                  />
                </div>
                <div className="col-span-12">
                  <DataField
                    label="Remarks"
                    id="remarks"
                    type="textarea"
                    value={feeData.remarks}
                    onChange={(e) => updateCurrentStudentFeeData(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={2}
                  />
                </div>
              </Grid>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                <Button text="Cancel" variant="secondary" onClick={() => setIsFeeModalOpen(false)} />
                <Button text="Next" variant="primary" onClick={handleNextStep} />
              </div>
            </div>
          ) : (
            /* Step 2: Review & Confirm */
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider font-sans">Review Details</h3>
                <p className="text-xs text-gray-500 font-medium">Please review student, parent, and fee summaries before confirming admission.</p>
                <div className="border-b border-[#E2E8F0] mt-3" />
              </div>

              {/* Student Switcher for multi-student applications */}
              {currentApprovalRequest.rawStudents && currentApprovalRequest.rawStudents.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 text-left">
                  <span className="text-xs font-black text-[#223F74] uppercase mr-1">Switch Student:</span>
                  {currentApprovalRequest.rawStudents.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedStudentIndex(idx);
                        setIsStatusOverridden(false);
                        setFeeErrors({});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        selectedStudentIndex === idx
                          ? "bg-[#223F74] text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {s.fullName || `Student ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {/* Student Details */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                  <h4 className="text-xs font-black uppercase text-[#223F74] mb-1">Student Details</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p><span className="font-bold">Name:</span> {currentApprovalRequest?.rawStudents?.[selectedStudentIndex]?.fullName || currentApprovalRequest?.student?.fullName || "Unnamed"}</p>
                    <p><span className="font-bold">Gender:</span> {currentApprovalRequest?.rawStudents?.[selectedStudentIndex]?.gender || "—"}</p>
                    <p><span className="font-bold">DOB:</span> {currentApprovalRequest?.rawStudents?.[selectedStudentIndex]?.dob ? new Date(currentApprovalRequest.rawStudents[selectedStudentIndex].dob).toLocaleDateString('en-IN') : "—"}</p>
                    <p><span className="font-bold">Class:</span> {formatClassName(currentApprovalRequest?.rawStudents?.[selectedStudentIndex]?.class?.name || currentApprovalRequest?.rawStudents?.[selectedStudentIndex]?.class)}</p>
                  </div>
                </div>

                {/* Parent Details */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                  <h4 className="text-xs font-black uppercase text-[#223F74] mb-1">Parent Details</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p><span className="font-bold">Parent Name:</span> {currentApprovalRequest?.parent?.fullName || "—"}</p>
                    <p><span className="font-bold">Relation:</span> {currentApprovalRequest?.parent?.relation || "—"}</p>
                    <p><span className="font-bold">Email:</span> {currentApprovalRequest?.parent?.email || "—"}</p>
                    <p><span className="font-bold">Phone:</span> {currentApprovalRequest?.parent?.primaryContact || "—"}</p>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200 col-span-1 md:col-span-2">
                  <h4 className="text-xs font-black uppercase text-[#223F74] mb-1">Fee Collection Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs text-slate-600">
                    <p><span className="font-bold">Admission Fee:</span> INR {Number(feeData.admissionFee || 0).toFixed(2)}</p>
                    {feeData.tuitionFee && <p><span className="font-bold">Tuition Fee:</span> INR {Number(feeData.tuitionFee || 0).toFixed(2)}</p>}
                    <p><span className="font-bold">Discount (-):</span> INR {Number(feeData.discount || 0).toFixed(2)}</p>
                    <p><span className="font-bold">Scholarship (-):</span> INR {Number(feeData.scholarship || 0).toFixed(2)}</p>
                    <p><span className="font-bold">Late Fee (+):</span> INR {Number(feeData.lateFee || 0).toFixed(2)}</p>
                    <p><span className="font-bold">Other Charges (+):</span> INR {Number(feeData.otherCharges || 0).toFixed(2)}</p>
                    <div className="col-span-full border-t border-dashed border-slate-300 my-1"></div>
                    <p className="text-[#223F74] font-black"><span className="font-bold">Total Payable:</span> INR {Number(totalPayable).toFixed(2)}</p>
                    <p className="text-emerald-600 font-black"><span className="font-bold">Amount Paid:</span> INR {Number(feeData.amountPaid).toFixed(2)}</p>
                    <p className="text-rose-600 font-black"><span className="font-bold">Remaining Amount:</span> INR {Number(remainingAmount).toFixed(2)}</p>
                    <p><span className="font-bold">Payment Mode:</span> {feeData.paymentMode}</p>
                    <p><span className="font-bold">Payment Status:</span> {feeData.paymentStatus}</p>
                    <p><span className="font-bold">Receipt No:</span> {feeData.receiptNumber}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-gray-150">
                <Button text="Back" variant="secondary" onClick={() => setApprovalStep(1)} />
                <div className="flex gap-2">
                  <Button text="Cancel" variant="secondary" onClick={() => setIsFeeModalOpen(false)} />
                  <Button 
                    text="Confirm & Approve" 
                    variant="primary" 
                    onClick={handleConfirmApprove} 
                    loading={actionLoadingId === currentApprovalRequest?._id}
                  />
                </div>
              </div>
            </div>
          )}
        </PanelModal>
      )}
    </div>
  );
};

export default AdmissionRequests;
