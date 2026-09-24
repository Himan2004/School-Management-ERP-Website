import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  getAdmissionById,
  approveAdmission,
  rejectAdmission,
  uploadAdmissionDocuments
} from '../../../services/api/principalAdmissionApi';
import { 
  getStudentById, 
  updateStudentProfile, 
  getClassesAndSections,
  uploadStudentDocuments
} from '../../../services/api/adminStudentApi';
import api from '../../../services/api';
import StudentAdmissionDetailsModal from '../../../components/principal/StudentAdmissionDetailsModal';
import { 
  Loader2, ArrowLeft, X, User, GraduationCap, MapPin, Phone, FileText, Bus, Edit, School, Users, Calendar, AlertCircle, CheckCircle, Camera 
} from 'lucide-react';
import { 
  Grid, Button, InputField, SelectField, Option, DataField, PanelModal 
} from '../../../components/shared/Common_Components';
import DatePicker from '../../../components/shared/DatePicker';
import toast from 'react-hot-toast';
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

// ── Reject Reason Modal ───────────────────────────────────────────────────────
const RejectModal = ({ onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 text-left">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Reject Admission</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Please provide a reason for rejection. This will be sent to the parent via email.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Rejecting..." : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const isPdfFile = (url) => {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return str.startsWith("data:application/pdf") || str.endsWith(".pdf") || str.includes(".pdf?");
};

const detectFileType = (url, mimeType) => {
    if (mimeType) {
        const mimeLower = String(mimeType).toLowerCase();
        if (mimeLower.startsWith("image/") || mimeLower.includes("jpeg") || mimeLower.includes("png") || mimeLower.includes("webp") || mimeLower.includes("gif")) {
            return "image";
        }
        if (mimeLower === "application/pdf" || mimeLower.includes("pdf")) {
            return "pdf";
        }
    }
    if (url) {
        if (String(url).startsWith("data:")) {
            const match = String(url).match(/^data:([^;]+);/);
            if (match && match[1]) {
                const baseMime = match[1].toLowerCase();
                if (baseMime.startsWith("image/")) return "image";
                if (baseMime === "application/pdf") return "pdf";
            }
        }
        const urlLower = String(url).toLowerCase();
        const extension = urlLower.split('.').pop().split(/[?#]/)[0];
        if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
            return "image";
        }
        if (extension === "pdf") {
            return "pdf";
        }
        if (urlLower.includes("/image/upload/")) {
            return "image";
        }
    }
    return "unknown";
};

// ── Document Upload Component for Edit Mode ─────────────────────────────────
// DocUploadField removed - rendered inline via renderDocCard for unified behavior

const AdmissionDetails = () => {
    const { id, studentId } = useParams();
    const parts = String(id || "").split("_");
    const admissionId = parts[0];
    const routeStudentIndex = parts[1] ? parseInt(parts[1], 10) : 0;
    const navigate = useNavigate();

    const getSafeDateValue = (dateVal) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split('T')[0];
    };
    const location = useLocation();

    const userRole = useSelector(
        (state) => state.adminAuth.authUser?.role || state.principalAuth.authUser?.role
    );
    const basePath = userRole === "admin" ? "/admin" : "/principal";

    // Determine context: Student profile vs. Admission Request
    const isStudentProfile = window.location.pathname.includes("/students/manage/");
    const isViewOnlyMode = !!location.state?.hideApprovalActions;

    const [request, setRequest] = useState(null);
    const [studentRaw, setStudentRaw] = useState(null);
    const [classesList, setClassesList] = useState([]);

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
        
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(clsId);
        if (isObjectId) {
            return "";
        }
        return clsId;
    };

    const resolveSectionName = (secValue, classIdOrName) => {
        if (!secValue) return "";
        if (typeof secValue === 'object') {
            if (secValue.name) return secValue.name;
            if (secValue.sectionName) return secValue.sectionName;
        }
        const secId = String(secValue);
        const cls = Array.isArray(classesList)
            ? classesList.find(c => (c.id || c._id) === classIdOrName || c.name === classIdOrName)
            : null;
        if (cls && Array.isArray(cls.sections)) {
            const matchedSec = cls.sections.find(s => (s.id || s._id || s) === secId || s.name === secId || s === secId);
            if (matchedSec) {
                return typeof matchedSec === 'object' ? matchedSec.name : matchedSec;
            }
        }
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(secId);
        if (isObjectId) {
            return "";
        }
        return secId;
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

    const isStatusReadOnly = (status) => {
        if (!status) return false;
        const s = String(status).toLowerCase();
        return s === "cancelled" || s === "tc_issued" || s === "tc issued";
    };
    
    // Edit state
    const [editMode, setEditMode] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editTab, setEditTab] = useState("profile"); // profile, family, academics, documents
    const [viewTab, setViewTab] = useState("profile"); // profile, family, academics, documents
    const [errors, setErrors] = useState({});
    
    const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
    const photoInputRef = useRef(null);
    
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(null);
    const [viewingPdf, setViewingPdf] = useState(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [rawRequestData, setRawRequestData] = useState(null);
    const [currentStudentIndex, setCurrentStudentIndex] = useState(routeStudentIndex);

    // States for approval fee collection modal
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [currentApprovalRequest, setCurrentApprovalRequest] = useState(null);
    const [approvalStep, setApprovalStep] = useState(1);
    const [feeData, setFeeData] = useState({
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
      receiptNumber: '',
      paymentDate: '',
      remarks: ''
    });
    const [isStatusOverridden, setIsStatusOverridden] = useState(false);
    const [feeErrors, setFeeErrors] = useState({});

    // Fee calculations for modal
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
        if (!isStatusOverridden) {
            let status = 'Unpaid';
            if (amountPaidVal > 0 && amountPaidVal >= totalPayable) {
                status = 'Paid';
            } else {
                status = 'Unpaid';
            }
            setFeeData(prev => ({ ...prev, paymentStatus: status }));
        }
    }, [feeData.amountPaid, totalPayable, isStatusOverridden]);

    const handleFeeChange = (field, value) => {
        setFeeData(prev => {
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
        setFeeData(prev => {
            const updated = { ...prev, paymentStatus: newStatus };
            if (newStatus === 'Paid') {
                updated.amountPaid = totalPayable.toString();
            } else if (newStatus === 'Unpaid') {
                updated.amountPaid = '0';
            }
            return updated;
        });
    };

    const openApprovalFlow = (reqObj) => {
        setCurrentApprovalRequest(reqObj);
        setFeeData({
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
        });
        setIsStatusOverridden(false);
        setApprovalStep(1);
        setFeeErrors({});
        setIsFeeModalOpen(true);
    };

    const handleNextStep = () => {
        const newErrors = {};

        if (!feeData.admissionFee || Number(feeData.admissionFee) <= 0) {
            newErrors.admissionFee = 'Admission Fee is required and must be greater than 0';
        }
        if (feeData.amountPaid === '' || Number(feeData.amountPaid) < 0) {
            newErrors.amountPaid = 'Amount Paid is required';
        } else if (Number(feeData.amountPaid) > totalPayable) {
            newErrors.amountPaid = `Amount Paid cannot exceed Total Payable (INR ${totalPayable.toFixed(2)})`;
        }

        if (feeData.paymentStatus === 'Paid') {
            if (!feeData.paymentMode) {
                newErrors.paymentMode = 'Payment Mode is required for Paid status';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setFeeErrors(newErrors);
            return;
        }

        setApprovalStep(2);
    };

    const handlePrevStep = () => {
        setApprovalStep(1);
    };

    const refreshDetails = async () => {
        try {
            if (isStudentProfile) {
                if (studentId && studentId !== "undefined") {
                    const res = await getStudentById(studentId);
                    if (res.success) {
                        setStudentRaw(res.data);
                        setRequest(normalizeStudentToAdmissionStyle(res.data));
                        setEditingStudent(JSON.parse(JSON.stringify(res.data)));
                    }
                }
            } else {
                if (admissionId && admissionId !== "undefined") {
                    const res = await getAdmissionById(admissionId);
                    if (res.success) {
                        setRawRequestData(res.data);
                        setRequest(normalizeAdmissionRequest(res.data, currentStudentIndex));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to refresh details after approval:", err);
        }
    };

    const handleConfirmApprove = async () => {
        if (userRole !== "admin") return;
        const reqId = currentApprovalRequest._id;
        setActionLoadingId(reqId);
        try {
            const payload = {
                feeDetails: {
                    admissionFee: Number(feeData.admissionFee) || 0,
                    tuitionFee: Number(feeData.tuitionFee) || 0,
                    discount: Number(feeData.discount) || 0,
                    scholarship: Number(feeData.scholarship) || 0,
                    lateFee: Number(feeData.lateFee) || 0,
                    otherCharges: Number(feeData.otherCharges) || 0,
                    totalPayable: totalPayable,
                    amountPaid: Number(feeData.amountPaid) || 0,
                    remainingAmount: remainingAmount,
                    paymentStatus: feeData.paymentStatus,
                    paymentMode: feeData.paymentMode,
                    transactionId: feeData.transactionId || null,
                    chequeNumber: feeData.chequeNumber || null,
                    ddNumber: feeData.ddNumber || null,
                    receiptNumber: feeData.receiptNumber,
                    paymentDate: feeData.paymentDate,
                    remarks: feeData.remarks || null
                }
            };

            const approveResponse = await approveAdmission(reqId, payload);
            if (approveResponse.success) {
                toast.success(feeData.paymentStatus === 'Paid' ? "Admission approved successfully!" : "Admission processed successfully (Pending Payment).");
                setIsFeeModalOpen(false);
                
                if (feeData.paymentStatus === 'Paid') {
                    // Trigger PDF Receipt Download automatically
                    try {
                        const finalStudentId = approveResponse.studentId || approveResponse.data?.studentId || approveResponse.data?.student?._id;
                        const finalRollNo = (approveResponse.rollNumber && approveResponse.rollNumber !== 'Auto-Generated') 
                            ? approveResponse.rollNumber 
                            : 'NA';
                        
                        handleDownloadReceipt(payload.feeDetails);
                    } catch (receiptErr) {
                        console.error("Failed to generate/download receipt:", receiptErr);
                    }
                }
                
                refreshDetails();
            } else {
                toast.error(approveResponse.message || "Failed to approve admission.");
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.message || "Unable to approve admission.");
        } finally {
            setActionLoadingId("");
        }
    };

    const feeDetails = request?.admissionRequest?.feeDetails || request?.feeDetails;

    const handleDownloadReceipt = (customFeeDetails) => {
        const activeFeeDetails = (customFeeDetails && typeof customFeeDetails === 'object' && !customFeeDetails.preventDefault) 
            ? customFeeDetails 
            : feeDetails;
        if (!activeFeeDetails) return;
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
        doc.text(activeFeeDetails.receiptNumber || 'N/A', 165, 55);

        doc.setFont("helvetica", "bold");
        doc.text("Date:", 140, 61);
        doc.setFont("helvetica", "normal");
        doc.text(activeFeeDetails.paymentDate || 'N/A', 165, 61);

        // Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, 66, 195, 66);

        // Student Info
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(primaryColor);
        doc.text("STUDENT & ADMISSION DETAILS", 15, 75);

        doc.setTextColor(darkColor);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Student Name:", 15, 83);
        doc.setFont("helvetica", "normal");
        doc.text(request?.student?.fullName || 'N/A', 45, 83);

        doc.setFont("helvetica", "bold");
        doc.text("Admission No:", 15, 89);
        doc.setFont("helvetica", "normal");
        doc.text(request?.applicationNo || 'N/A', 45, 89);

        doc.setFont("helvetica", "bold");
        doc.text("Class / Section:", 120, 83);
        doc.setFont("helvetica", "normal");
        doc.text(`${formatClassName(request?.academic?.appliedClass)} / Section ${request?.academic?.preferredSection || 'N/A'}`, 155, 83);

        doc.setFont("helvetica", "bold");
        doc.text("Roll Number:", 120, 89);
        doc.setFont("helvetica", "normal");
        doc.text(request?.academic?.rollNumber || 'NA', 155, 89);

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
            { label: "Admission Fee", value: `INR ${Number(activeFeeDetails.admissionFee || 0).toFixed(2)}` },
            { label: "Admission Discount (-)", value: `INR ${Number(activeFeeDetails.discount || 0).toFixed(2)}` },
            { label: "Scholarship Amount (-)", value: `INR ${Number(activeFeeDetails.scholarship || 0).toFixed(2)}` },
            { label: "Late Fee (+)", value: `INR ${Number(activeFeeDetails.lateFee || 0).toFixed(2)}` },
            { label: "Other Charges (+)", value: `INR ${Number(activeFeeDetails.otherCharges || 0).toFixed(2)}` }
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
        doc.text(`INR ${Number(activeFeeDetails.totalPayable || 0).toFixed(2)}`, 160, currentY);
        doc.line(15, currentY + 3, 195, currentY + 3);

        currentY += 9;
        doc.setTextColor("#10B981");
        doc.text("Amount Paid", 20, currentY);
        doc.text(`INR ${Number(activeFeeDetails.amountPaid || 0).toFixed(2)}`, 160, currentY);
        doc.line(15, currentY + 3, 195, currentY + 3);

        currentY += 9;
        doc.setTextColor("#EF4444");
        doc.text("Remaining Balance", 20, currentY);
        doc.text(`INR ${Number(activeFeeDetails.remainingAmount || 0).toFixed(2)}`, 160, currentY);
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
        doc.text(activeFeeDetails.paymentMode || 'N/A', 50, currentY + 6);

        doc.setFont("helvetica", "bold");
        doc.text("Payment Status:", 20, currentY + 12);
        doc.setFont("helvetica", "normal");
        doc.text(activeFeeDetails.paymentStatus || 'N/A', 50, currentY + 12);

        doc.setFont("helvetica", "bold");
        doc.text("Receipt Issued By:", 20, currentY + 18);
        doc.setFont("helvetica", "normal");
        doc.text(activeFeeDetails.remarks ? activeFeeDetails.remarks.split(" - ")[0] : "Admin", 50, currentY + 18);

        if (activeFeeDetails.paymentMode === 'Cheque') {
            doc.setFont("helvetica", "bold");
            doc.text("Cheque Number:", 110, currentY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(activeFeeDetails.chequeNumber || 'N/A', 140, currentY + 6);
        } else if (activeFeeDetails.paymentMode === 'Demand Draft') {
            doc.setFont("helvetica", "bold");
            doc.text("DD Number:", 110, currentY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(activeFeeDetails.ddNumber || 'N/A', 140, currentY + 6);
        } else if (activeFeeDetails.transactionId) {
            doc.setFont("helvetica", "bold");
            doc.text("Transaction ID:", 110, currentY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(activeFeeDetails.transactionId || 'N/A', 140, currentY + 6);
        }

        if (activeFeeDetails.remarks) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", 110, currentY + 12);
            doc.setFont("helvetica", "normal");
            doc.text(activeFeeDetails.remarks, 140, currentY + 12);
        }

        // Footer note
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.text("This is a system generated receipt and does not require a physical signature.", 15, currentY + 32);

        doc.save(`Receipt_${activeFeeDetails.receiptNumber || 'unpaid'}.pdf`);
    };

    // Dynamic section options based on edited student's class
    const editSections = useMemo(() => {
        const classId = editingStudent?.class?._id || editingStudent?.class;
        if (!classId) return [];
        const cls = Array.isArray(classesList) ? classesList.find(c => (c.id || c._id) === classId) : null;
        return cls?.sections || [];
    }, [editingStudent?.class, classesList]);

    // Load data
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                if (isStudentProfile) {
                    if (!studentId || studentId === "undefined") {
                        console.warn("[AdmissionDetails] Guard triggered: studentId is undefined or null");
                        setLoading(false);
                        return;
                    }
                    // 1. Fetch metadata for edit dropdowns
                    const metaRes = await getClassesAndSections();
                    if (metaRes.success && metaRes.data) {
                        const uniqueClasses = [];
                        const seenIds = new Set();
                        const seenNames = new Set();

                        metaRes.data.forEach((cls) => {
                            if (!cls || (!cls._id && !cls.id) || !cls.name) return;
                            const clsId = cls.id || cls._id;
                            const normalizedName = cls.name.trim().toLowerCase().replace(/\s+/g, ' ');
                            if (!seenIds.has(clsId) && !seenNames.has(normalizedName)) {
                                seenIds.add(clsId);
                                seenNames.add(normalizedName);
                                uniqueClasses.push(cls);
                            }
                        });

                        // Natural sorting with non-numeric classes at the top
                        uniqueClasses.sort((a, b) => {
                            const hasNumA = /\d/.test(a.name);
                            const hasNumB = /\d/.test(b.name);

                            if (!hasNumA && !hasNumB) {
                                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                            }
                            if (!hasNumA && hasNumB) {
                                return -1;
                            }
                            if (hasNumA && !hasNumB) {
                                return 1;
                            }

                            const numA = a.numericLevel !== undefined ? a.numericLevel : parseInt(a.name.replace(/\D/g, ""), 10);
                            const numB = b.numericLevel !== undefined ? b.numericLevel : parseInt(b.name.replace(/\D/g, ""), 10);
                            
                            if (!isNaN(numA) && !isNaN(numB)) {
                                if (numA !== numB) {
                                    return numA - numB;
                                }
                            }
                            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                        });

                        setClassesList(uniqueClasses);
                    } else {
                        setClassesList([]);
                    }
                    
                    // 2. Fetch student details
                    console.log("[AdmissionDetails] Fetching student profile details.");
                    console.log("[AdmissionDetails] studentId:", studentId);
                    console.log("[AdmissionDetails] API endpoint being called: GET /api/admin/students/" + studentId);
                    const res = await getStudentById(studentId);
                    if (res.success) {
                        setStudentRaw(res.data);
                        setRequest(normalizeStudentToAdmissionStyle(res.data));
                        // Pre-populate edit state
                        setEditingStudent(JSON.parse(JSON.stringify(res.data)));
                        
                        // Check if opened directly in edit mode
                        if (location.state?.editMode || location.search.includes("edit=true")) {
                            setEditMode(true);
                        }
                    } else {
                        toast.error(res.message || "Failed to load student profile");
                        navigate(`${basePath}/students/manage`);
                    }
                } else {
                    if (!admissionId || admissionId === "undefined") {
                        console.warn("[AdmissionDetails] Guard triggered: admissionId is undefined or null");
                        setLoading(false);
                        return;
                    }
                    // Fetch admission request details
                    console.log("[AdmissionDetails] Fetching admission details.");
                    console.log("[AdmissionDetails] admissionId:", admissionId);
                    console.log("[AdmissionDetails] API endpoint being called: GET /api/principal/admissions/" + admissionId);
                    const res = await getAdmissionById(admissionId);
                    if (res.success) {
                        setRawRequestData(res.data);
                        setRequest(normalizeAdmissionRequest(res.data, 0));
                    } else {
                        toast.error("Failed to load admission details");
                        navigate(`${basePath}/admissions/list`);
                    }
                }
            } catch (err) {
                toast.error("An error occurred while loading details");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, admissionId, studentId, navigate, basePath, isStudentProfile, location.search]);

    useEffect(() => {
        if (rawRequestData) {
            setRequest(normalizeAdmissionRequest(rawRequestData, currentStudentIndex));
        }
    }, [currentStudentIndex, rawRequestData]);

    const handleApprove = async (targetId) => {
        if (userRole !== "admin") return;
        if (!targetId || targetId === "undefined") {
            console.warn("[AdmissionDetails] targetId is undefined inside handleApprove");
            return;
        }
        openApprovalFlow(request);
    };

    const handleRejectConfirm = async (reason) => {
        if (userRole !== "admin") return;
        if (!rejectTarget || rejectTarget === "undefined") {
            console.warn("[AdmissionDetails] rejectTarget is undefined inside handleRejectConfirm");
            return;
        }
        setActionLoadingId(rejectTarget);
        try {
            await rejectAdmission(rejectTarget, reason);
            toast.success("Admission rejected.");
            setRejectTarget(null);
            // Refresh detail data
            if (!admissionId || admissionId === "undefined") {
                console.warn("[AdmissionDetails] admissionId is undefined inside handleRejectConfirm");
                return;
            }
            console.log("[AdmissionDetails] Refreshing details. API endpoint called: GET /api/principal/admissions/" + admissionId);
            const res = await getAdmissionById(admissionId);
            if (res.success) {
                setRequest(normalizeAdmissionRequest(res.data));
            }
        } catch (error) {
            toast.error(error?.message || "Unable to reject admission.");
        } finally {
            setActionLoadingId("");
        }
    };

    // Form validation for editing student details
    const validateEditForm = () => {
        const errs = {};
        if (!editingStudent.user?.name?.trim()) errs.name = "Student name is required";
        if (editingStudent.user?.email && !/\S+@\S+\.\S+/.test(editingStudent.user.email)) {
            errs.email = "Student email must be valid";
        }
        
        const classId = editingStudent.class?._id || editingStudent.class;
        if (!classId) errs.class = "Class is required";
        
        const secId = editingStudent.section?._id || editingStudent.section;
        if (!secId) errs.section = "Section is required";

        if (!editingStudent.academicYear?.trim()) errs.academicYear = "Academic year is required";

        // Parent validations
        if (!editingStudent.parent?.fatherName?.trim() && !editingStudent.parent?.motherName?.trim()) {
            errs.parentName = "At least father or mother name is required";
        }
        if (!editingStudent.parent?.primaryContact?.trim()) {
            errs.primaryContact = "Primary contact phone is required";
        } else if (!/^\d{10}$/.test(editingStudent.parent.primaryContact.trim())) {
            errs.primaryContact = "Primary contact must be a 10-digit number";
        }

        // Document validations
        if (!editingStudent.documents?.birthCertificate) {
            errs.birthCertificate = "Birth Certificate is required";
        }
        if (!editingStudent.documents?.studentAadhaar && !editingStudent.documents?.studentAadharCard && !editingStudent.documents?.aadharCard) {
            errs.studentAadharCard = "Student Aadhaar Card is required";
        }
        if (!editingStudent.documents?.parentAadhaar && !editingStudent.documents?.parentAadharCard) {
            errs.parentAadharCard = "Parent Aadhaar Card is required";
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.error("File is too large. Max size allowed is 10MB.");
            return;
        }

        setPendingPhotoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setEditingStudent(prev => ({
            ...prev,
            photo: previewUrl
        }));
        toast.success("Photo preview updated. Click Save Changes to save.");
    };

    const handleCancelEdit = () => {
        setPendingPhotoFile(null);
        setEditMode(false);
    };

    // Save Student profile edits
    const handleSaveEdit = async () => {
        if (!validateEditForm()) {
            toast.error("Please fix validation errors before saving");
            return;
        }

        setSaveLoading(true);
        try {
            if (pendingPhotoFile) {
                try {
                    const uploadRes = await uploadStudentDocuments(studentId, { photo: pendingPhotoFile });
                    if (!uploadRes.success) {
                        toast.error(uploadRes.message || "Failed to upload profile photo");
                        setSaveLoading(false);
                        return;
                    }
                    toast.success("Profile photo uploaded successfully");
                    setPendingPhotoFile(null);
                } catch (uploadErr) {
                    console.error("Profile photo upload failed:", uploadErr);
                    toast.error("Upload failed: Profile photo could not be uploaded");
                    setSaveLoading(false);
                    return;
                }
            }

            const classId = editingStudent.class?._id || editingStudent.class;
            const sectionId = editingStudent.section?._id || editingStudent.section;

            const payload = {
                name: editingStudent.user?.name,
                email: editingStudent.user?.email,
                rollNo: editingStudent.rollNo,
                enrollmentNo: editingStudent.enrollmentNo || editingStudent.admissionNo,
                admissionNo: editingStudent.admissionNo || editingStudent.enrollmentNo,
                class: classId,
                section: sectionId,
                academicYear: editingStudent.academicYear,
                dateOfBirth: editingStudent.dateOfBirth,
                gender: editingStudent.gender,
                bloodGroup: editingStudent.bloodGroup,
                phone: editingStudent.phone,
                alternatePhone: editingStudent.alternatePhone,
                address: editingStudent.address,
                status: editingStudent.status,
                
                // Parent Details
                parentName: editingStudent.parent?.fatherName || editingStudent.parent?.motherName,
                fatherName: editingStudent.parent?.fatherName,
                motherName: editingStudent.parent?.motherName,
                primaryContact: editingStudent.parent?.primaryContact,
                alternateContact: editingStudent.parent?.alternateContact,
                parentRelation: editingStudent.parent?.relation || "father",
                addressStreet: editingStudent.parent?.address?.street,
                addressCity: editingStudent.parent?.address?.city,
                addressState: editingStudent.parent?.address?.state,
                addressPincode: editingStudent.parent?.address?.pincode,
                profileExtras: editingStudent.parent?.profileExtras,

                // Previous school TC info
                previousSchool: editingStudent.previousSchool,

                // Transport
                transport: editingStudent.transport,

                // Documents
                documents: (() => {
                    const currentDocs = editingStudent.documents || {};
                    const studentAadhaarVal = currentDocs.studentAadhaar !== undefined ? currentDocs.studentAadhaar :
                                              (currentDocs.studentAadharCard !== undefined ? currentDocs.studentAadharCard : currentDocs.aadharCard);
                    const parentAadhaarVal = currentDocs.parentAadhaar !== undefined ? currentDocs.parentAadhaar : currentDocs.parentAadharCard;
                    const previousYearMarksheetVal = currentDocs.previousYearMarksheet !== undefined ? currentDocs.previousYearMarksheet : currentDocs.previousMarksheet;
                    const transferCertificateVal = currentDocs.transferCertificate !== undefined ? currentDocs.transferCertificate : currentDocs.previousTC;

                    return {
                        birthCertificate: currentDocs.birthCertificate || null,
                        studentAadhaar: studentAadhaarVal || null,
                        parentAadhaar: parentAadhaarVal || null,
                        previousYearMarksheet: previousYearMarksheetVal || null,
                        transferCertificate: transferCertificateVal || null
                    };
                })()
            };

            if (!studentId || studentId === "undefined") {
                console.warn("[AdmissionDetails] studentId is undefined or null inside saveProfile");
                return;
            }
            const res = await updateStudentProfile(studentId, payload);
            if (res.success) {
                toast.success("Student profile updated successfully");
                
                // Reload profile data
                if (!studentId || studentId === "undefined") return;
                console.log("[AdmissionDetails] Reloading student profile. API endpoint called: GET /api/admin/students/" + studentId);
                const profileRes = await getStudentById(studentId);
                if (profileRes.success) {
                    setStudentRaw(profileRes.data);
                    setRequest(normalizeStudentToAdmissionStyle(profileRes.data));
                    setEditingStudent(JSON.parse(JSON.stringify(profileRes.data)));
                }
                setEditMode(false);
            } else {
                toast.error(res.message || "Failed to update profile");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile details");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleStatusToggle = async () => {
        if (statusLoading || isStatusReadOnly(editingStudent?.status)) return;
        
        const currentStatus = editingStudent?.status || "active";
        const newStatus = (currentStatus === "Active" || currentStatus?.toLowerCase() === "active") ? "inactive" : "active";
        const originalStatus = currentStatus;
        
        // Update state locally first
        setEditingStudent(prev => ({ ...prev, status: newStatus }));
        
        setStatusLoading(true);
        try {
            const classId = editingStudent.class?._id || editingStudent.class;
            const sectionId = editingStudent.section?._id || editingStudent.section;

            const payload = {
                name: editingStudent.user?.name,
                email: editingStudent.user?.email,
                rollNo: editingStudent.rollNo,
                enrollmentNo: editingStudent.enrollmentNo || editingStudent.admissionNo,
                admissionNo: editingStudent.admissionNo || editingStudent.enrollmentNo,
                class: classId,
                section: sectionId,
                academicYear: editingStudent.academicYear,
                dateOfBirth: editingStudent.dateOfBirth,
                gender: editingStudent.gender,
                bloodGroup: editingStudent.bloodGroup,
                phone: editingStudent.phone,
                alternatePhone: editingStudent.alternatePhone,
                address: editingStudent.address,
                status: newStatus,
                
                // Parent Details
                parentName: editingStudent.parent?.fatherName || editingStudent.parent?.motherName,
                fatherName: editingStudent.parent?.fatherName,
                motherName: editingStudent.parent?.motherName,
                primaryContact: editingStudent.parent?.primaryContact,
                alternateContact: editingStudent.parent?.alternateContact,
                parentRelation: editingStudent.parent?.relation || "father",
                addressStreet: editingStudent.parent?.address?.street,
                addressCity: editingStudent.parent?.address?.city,
                addressState: editingStudent.parent?.address?.state,
                addressPincode: editingStudent.parent?.address?.pincode,
                profileExtras: editingStudent.parent?.profileExtras,

                // Previous school TC info
                previousSchool: editingStudent.previousSchool,

                // Transport
                transport: editingStudent.transport,

                // Documents
                documents: editingStudent.documents
            };

            const res = await updateStudentProfile(studentId, payload);
            if (res.success) {
                toast.success("Student status updated successfully");
                // Sync main page state
                setStudentRaw(prev => ({ ...prev, status: newStatus }));
                setRequest(prev => ({
                    ...prev,
                    status: newStatus,
                    student: {
                        ...prev.student,
                        status: newStatus
                    }
                }));
            } else {
                toast.error(res.message || "Failed to update status");
                // Restore original status
                setEditingStudent(prev => ({ ...prev, status: originalStatus }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
            // Restore original status
            setEditingStudent(prev => ({ ...prev, status: originalStatus }));
        } finally {
            setStatusLoading(false);
        }
    };

    const executeDocumentRemoval = async (docType) => {
        if (!editMode) {
            setEditTab(viewTab);
            setEditMode(true);
            setEditingStudent(JSON.parse(JSON.stringify(studentRaw)));
        }
        
        setEditingStudent(prev => {
            const currentStudent = prev || JSON.parse(JSON.stringify(studentRaw));
            const newDocs = { ...(currentStudent.documents || {}) };
            if (docType === 'studentAadharCard' || docType === 'studentAadhaar' || docType === 'aadharCard') {
                delete newDocs.studentAadharCard;
                delete newDocs.studentAadhaar;
                delete newDocs.aadharCard;
            } else if (docType === 'parentAadharCard' || docType === 'parentAadhaar') {
                delete newDocs.parentAadharCard;
                delete newDocs.parentAadhaar;
            } else if (docType === 'previousYearMarksheet' || docType === 'previousMarksheet') {
                delete newDocs.previousYearMarksheet;
                delete newDocs.previousMarksheet;
            } else if (docType === 'transferCertificate' || docType === 'previousTC') {
                delete newDocs.transferCertificate;
                delete newDocs.previousTC;
            } else {
                delete newDocs[docType];
            }
            return { ...currentStudent, documents: newDocs };
        });
    };

    // Document normalizer
    const normalizeDocuments = (docs) => {
        if (!docs || typeof docs !== "object") return [];
        const keyMap = {
            birthCertificate: "Birth Certificate",
            studentAadhaar: "Student Aadhaar Card",
            studentAadharCard: "Student Aadhaar Card",
            aadhar: "Student Aadhaar Card",
            aadharCard: "Student Aadhaar Card",
            parentAadhaar: "Parent Aadhaar Card",
            parentAadharCard: "Parent Aadhaar Card",
            previousYearMarksheet: "Previous Year Marksheet",
            marksheet: "Previous Year Marksheet",
            previousMarksheet: "Previous Year Marksheet",
            transferCertificate: "Transfer Certificate",
            tc: "Transfer Certificate",
        };
        return Object.entries(docs)
            .filter(([, val]) => val && (typeof val === 'string' ? val : val.url))
            .map(([key, val]) => {
                const name = keyMap[key] || (key.charAt(0).toUpperCase() + key.slice(1));
                const url = typeof val === 'string' ? val : val.url;
                return {
                    name,
                    fileName: url.split("/").pop() || `${key}.pdf`,
                    status: typeof val === 'string' ? 'submitted' : (val.status || 'submitted'),
                    remarks: typeof val === 'string' ? '' : (val.remarks || ''),
                    url,
                    mimeType: typeof val === 'string' ? undefined : val.mimeType,
                };
            });
    };

    // Admission request normalizer
    const normalizeAdmissionRequest = (item, studentIndex = 0) => {
        if (!item) return null;
        const students = Array.isArray(item.students) ? item.students : [];
        const student = students[studentIndex] || {};
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
                preferredSection: student.section || "",
                academicYear: student.academicYear || "",
                rollNumber: (student.rollNumber && student.rollNumber !== 'null' && student.rollNumber !== 'undefined') ? student.rollNumber : "NA",
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
            },
            documents: normalizeDocuments(student.documents),
            remarks: item.remarks || "",
            feeDetails: item.feeDetails || null,
            rawStudents: students,
        };
    };

    // Mapper for Student Model -> Admission details format (for read-only view)
    const normalizeStudentToAdmissionStyle = (student) => {
        if (!student) return null;
        const parent = student.parent || {};
        const parentUser = parent.user || {};
        const address = parent.address || {};
        const rawDocs = student.documents || {};
        
        const getDocObject = (docVal, defaultName, docType) => {
            if (!docVal) return null;
            const url = typeof docVal === 'object' ? docVal.url : docVal;
            if (!url) return null;
            
            let fileName = "";
            if (typeof docVal === 'object' && docVal.fileName) {
                fileName = docVal.fileName;
            } else {
                fileName = url.split("/").pop() || `${docType}.pdf`;
            }
            
            return {
                name: defaultName,
                fileName,
                url,
                status: typeof docVal === 'object' ? (docVal.status || "submitted") : "submitted",
                mimeType: typeof docVal === 'object' ? docVal.mimeType : undefined
            };
        };

        const docList = [
            getDocObject(rawDocs.birthCertificate, "Birth Certificate", "birthCertificate"),
            getDocObject(rawDocs.studentAadhaar || rawDocs.studentAadharCard || rawDocs.aadharCard, "Student Aadhaar Card", "studentAadhaar"),
            getDocObject(rawDocs.parentAadhaar || rawDocs.parentAadharCard, "Parent Aadhaar Card", "parentAadhaar"),
            getDocObject(rawDocs.previousYearMarksheet || rawDocs.previousMarksheet, "Previous Year Marksheet", "previousYearMarksheet"),
            getDocObject(rawDocs.transferCertificate || rawDocs.previousTC, "Transfer Certificate", "transferCertificate")
        ].filter(Boolean);

        return {
            _id: student._id,
            admissionRequest: student.admissionRequest || null,
            feeDetails: student.admissionRequest?.feeDetails || student.feeDetails || null,
            applicationNo: student.enrollmentNo || student.admissionNo || "—",
            submittedAt: student.createdAt || new Date().toISOString(),
            status: student.status || "active",
            organizationName: "",
            branchName: "",
            student: {
                fullName: student.user?.name || student.name || "Unnamed",
                dob: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : "",
                gender: student.gender || "",
                bloodGroup: student.bloodGroup || "",
                aadhaar: parent.aadharCard || "",
                previousSchool: student.previousSchool?.name || "",
                photo: student.photo || student.user?.photo || null,
            },
            academic: {
                appliedClass: student.class?.name || student.class?.className || student.class || "",
                preferredSection: student.section?.name || student.section?.sectionName || student.section || "",
                academicYear: student.academicYear || "",
                rollNumber: (student.rollNo && student.rollNo !== 'null' && student.rollNo !== 'undefined') ? student.rollNo : "NA",
                transportRequired: student.transport?.enrolled ? "Yes" : "No",
                busRoute: student.transport?.routeId || "",
                healthNotes: student.health?.notes || "",
            },
            contact: {
                email: student.admissionRequest?.parent?.email || parentUser.email || student.user?.email || "",
                phone: student.phone || parent.primaryContact || "",
                alternatePhone: student.alternatePhone || parent.alternateContact || "",
                city: address.city || "",
                address: typeof address === "string" ? address : [address.street, address.city, address.state, address.pincode].filter(Boolean).join(", ") || student.address || "",
            },
            parent: {
                fullName: parentUser.name || parent.fatherName || parent.motherName || "",
                relation: parent.relation || "father",
                fatherName: parent.fatherName || "",
                motherName: parent.motherName || "",
                guardianPhone: parent.alternateContact || parent.primaryContact || "",
                notifications: parent.notifications || {},
            },
            documents: docList,
            remarks: student.bio || "",
        };
    };

    const handleImmediateUpload = async (docType, base64Val, file) => {
        const docKeyMap = {
            birthCertificate: 'birthCertificate',
            studentAadhaar: 'studentAadhaar',
            studentAadharCard: 'studentAadhaar',
            aadhar: 'studentAadhaar',
            aadharCard: 'studentAadhaar',
            parentAadhaar: 'parentAadhaar',
            parentAadharCard: 'parentAadhaar',
            previousYearMarksheet: 'previousYearMarksheet',
            marksheet: 'previousYearMarksheet',
            previousMarksheet: 'previousYearMarksheet',
            transferCertificate: 'transferCertificate',
            tc: 'transferCertificate'
        };
        const docKey = docKeyMap[docType] || docType;
        const docFiles = { [docKey]: file };

        if (isStudentProfile) {
            try {
                setLoading(true);
                const res = await uploadStudentDocuments(studentId, docFiles);
                if (res.success) {
                    toast.success("Document uploaded successfully");
                    const profileRes = await getStudentById(studentId);
                    if (profileRes.success) {
                        setStudentRaw(profileRes.data);
                        setRequest(normalizeStudentToAdmissionStyle(profileRes.data));
                        setEditingStudent(JSON.parse(JSON.stringify(profileRes.data)));
                    }
                } else {
                    toast.error(res.message || "Failed to upload document");
                }
            } catch (err) {
                toast.error("Failed to upload document");
            } finally {
                setLoading(false);
            }
        } else {
            try {
                setLoading(true);
                const firstStudent = Array.isArray(studentRaw?.students) ? studentRaw.students[0] || {} : {};
                const studentIdStr = firstStudent._id || studentRaw?._id || studentId;

                const res = await uploadAdmissionDocuments(admissionId, studentIdStr, docFiles);
                if (res.success) {
                    toast.success("Document uploaded successfully");
                    const reqRes = await getAdmissionById(admissionId);
                    if (reqRes.success) {
                        setRequest(normalizeAdmissionRequest(reqRes.data));
                    }
                } else {
                    toast.error(res.message || "Failed to upload document");
                }
            } catch (err) {
                toast.error("Failed to upload document");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleImmediateRemove = async (docType) => {
        const docKeyMap = {
            birthCertificate: 'birthCertificate',
            studentAadhaar: 'studentAadhaar',
            studentAadharCard: 'studentAadhaar',
            aadhar: 'studentAadhaar',
            aadharCard: 'studentAadhaar',
            parentAadhaar: 'parentAadhaar',
            parentAadharCard: 'parentAadhaar',
            previousYearMarksheet: 'previousYearMarksheet',
            marksheet: 'previousYearMarksheet',
            previousMarksheet: 'previousYearMarksheet',
            transferCertificate: 'transferCertificate',
            tc: 'transferCertificate'
        };
        const docKey = docKeyMap[docType] || docType;

        if (isStudentProfile) {
            try {
                setLoading(true);
                const res = await api.delete(`/admin/students/${studentId}/documents/${docKey}`);
                if (res.success || res.status === 200 || res.data?.success) {
                    toast.success("Document removed successfully");
                    const profileRes = await getStudentById(studentId);
                    if (profileRes.success) {
                        setStudentRaw(profileRes.data);
                        setRequest(normalizeStudentToAdmissionStyle(profileRes.data));
                        setEditingStudent(JSON.parse(JSON.stringify(profileRes.data)));
                    }
                } else {
                    toast.error("Failed to remove document");
                }
            } catch (err) {
                toast.error("Failed to remove document");
            } finally {
                setLoading(false);
            }
        } else {
            try {
                setLoading(true);
                const res = await api.delete(`/principal/admissions/${admissionId}/documents/${docKey}`);
                if (res.success || res.data?.success || res.status === 200) {
                    toast.success("Document removed successfully");
                    const reqRes = await getAdmissionById(admissionId);
                    if (reqRes.success) {
                        setRequest(normalizeAdmissionRequest(reqRes.data));
                    }
                } else {
                    toast.error("Failed to remove document");
                }
            } catch (err) {
                toast.error("Failed to remove document");
            } finally {
                setLoading(false);
            }
        }
    };

    const renderDocCard = (label, docType, isMandatory = false) => {
        let doc = null;

        if (editMode) {
            const rawDocs = editingStudent?.documents || {};
            let urlOrObj = "";
            if (docType === 'birthCertificate') {
                urlOrObj = rawDocs.birthCertificate;
            } else if (docType === 'studentAadhaar' || docType === 'studentAadharCard' || docType === 'aadharCard') {
                urlOrObj = rawDocs.studentAadhaar !== undefined ? rawDocs.studentAadhaar :
                           (rawDocs.studentAadharCard !== undefined ? rawDocs.studentAadharCard : rawDocs.aadharCard);
            } else if (docType === 'parentAadhaar' || docType === 'parentAadharCard') {
                urlOrObj = rawDocs.parentAadhaar !== undefined ? rawDocs.parentAadhaar : rawDocs.parentAadharCard;
            } else if (docType === 'previousYearMarksheet' || docType === 'previousMarksheet') {
                urlOrObj = rawDocs.previousYearMarksheet !== undefined ? rawDocs.previousYearMarksheet : rawDocs.previousMarksheet;
            } else if (docType === 'transferCertificate' || docType === 'previousTC') {
                urlOrObj = rawDocs.transferCertificate !== undefined ? rawDocs.transferCertificate : rawDocs.previousTC;
            }

            if (urlOrObj) {
                const url = typeof urlOrObj === 'object' ? urlOrObj.url : urlOrObj;
                if (url) {
                    const origFileName = typeof urlOrObj === 'object' ? urlOrObj.fileName : "";
                    const fileName = origFileName || (url.startsWith("data:") ? "Selected File" : (url.split("/").pop() || `${docType}.pdf`));
                    const status = typeof urlOrObj === 'object' ? (urlOrObj.status || "submitted") : "submitted";
                    const remarks = typeof urlOrObj === 'object' ? (urlOrObj.remarks || "") : "";
                    doc = { name: label, url, fileName, status, remarks, mimeType: typeof urlOrObj === 'object' ? urlOrObj.mimeType : undefined };
                }
            }
        } else {
            const documents = request?.documents || [];
            const keyMap = {
                birthCertificate: ["Birth Certificate"],
                studentAadhaar: ["Student Aadhaar Card"],
                studentAadharCard: ["Student Aadhaar Card"],
                parentAadhaar: ["Parent Aadhaar Card"],
                parentAadharCard: ["Parent Aadhaar Card"],
                previousYearMarksheet: ["Previous Year Marksheet"],
                transferCertificate: ["Transfer Certificate"]
            };

            const searchNames = keyMap[docType] || [label];
            doc = documents.find(d => 
                searchNames.some(name => d.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, ''))
            );

            if (!doc) {
                const rawDocs = isStudentProfile ? (studentRaw?.documents || {}) : (request?.documents || {});
                let url = "";
                let status = "submitted";
                let remarks = "";
                
                if (docType === 'birthCertificate') {
                    url = rawDocs.birthCertificate?.url || rawDocs.birthCertificate || "";
                } else if (docType === 'studentAadharCard') {
                    url = rawDocs.studentAadharCard?.url || rawDocs.studentAadharCard || rawDocs.aadharCard?.url || rawDocs.aadharCard || "";
                } else if (docType === 'parentAadharCard') {
                    url = rawDocs.parentAadharCard?.url || rawDocs.parentAadharCard || "";
                } else if (docType === 'previousYearMarksheet') {
                    url = rawDocs.previousYearMarksheet?.url || rawDocs.previousYearMarksheet || rawDocs.previousMarksheet?.url || rawDocs.previousMarksheet || "";
                } else if (docType === 'transferCertificate') {
                    url = rawDocs.transferCertificate?.url || rawDocs.transferCertificate || "";
                }

                if (url) {
                    const fileName = url.startsWith("data:") ? "Selected File" : (url.split("/").pop() || `${docType}.pdf`);
                    doc = { name: label, url, fileName, status, remarks };
                }
            }
        }

        const value = doc?.url || "";
        const fileName = doc?.fileName || "";
        const fileType = detectFileType(value, doc?.mimeType);
        const isImage = fileType === 'image';
        const isPdf = fileType === 'pdf';

        const fileInputRef = React.createRef();

        const handleFileChange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Invalid file type. Only PDF, JPG, JPEG, PNG, WEBP are accepted.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Val = reader.result;
                if (editMode) {
                    setEditingStudent(prev => ({
                        ...prev,
                        documents: {
                            ...(prev.documents || {}),
                            [docType === 'studentAadharCard' ? 'studentAadharCard' : 
                             docType === 'previousYearMarksheet' ? 'previousYearMarksheet' : docType]: base64Val
                        }
                    }));
                } else {
                    handleImmediateUpload(docType, base64Val, file);
                }
            };
            reader.readAsDataURL(file);
        };

        const handleRemove = () => {
            setConfirmRemoveDoc({ docType, label });
        };

        return (
            <div key={docType} className="flex flex-col gap-2 p-4 rounded-[16px] bg-gray-50 border border-gray-100 hover:shadow-md transition text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {label} {isMandatory ? "*" : ""}
                </span>
                
                {value ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {isImage ? (
                                <img 
                                    src={value} 
                                    alt={label} 
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-white shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#223F74] shrink-0">
                                    <FileText size={24} />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                    {fileName || "Selected File"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {isImage ? "Image Document" : isPdf ? "PDF Document" : "Uploaded File"}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    const fileType = detectFileType(value, doc?.mimeType);
                                    if (fileType === 'unknown') {
                                        window.open(value, '_blank');
                                    } else {
                                        setViewingPdf({ name: label, url: value, type: fileType });
                                    }
                                }}
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-[#223F74] hover:bg-gray-50 transition cursor-pointer"
                            >
                                View
                            </button>
                            
                            {editMode && !isViewOnlyMode && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-[#e8612c] hover:bg-gray-50 transition"
                                >
                                    Replace
                                </button>
                            )}
                            
                            {editMode && !isViewOnlyMode && (
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-slate-400 font-medium italic">No document uploaded. (PDF, JPG, JPEG, PNG, WEBP)</p>
                        {editMode && !isViewOnlyMode && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-[#223F74] text-white rounded-lg text-xs font-bold hover:bg-[#1a3058] transition shrink-0"
                            >
                                Upload Document
                            </button>
                        )}
                    </div>
                )}
                
                <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf, .jpg, .jpeg, .png, .webp"
                    className="hidden"
                />
                
                {errors[docType] && (
                    <span className="text-xs font-semibold text-rose-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={14} /> {errors[docType]}
                    </span>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#223F74]" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Fetching Detailed Profile...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 text-left pb-10">
            <main className="text-left">

                {/* Helper component for detailed cards */}
                {(() => {
                    const getInitials = (name) => {
                        if (!name) return "";
                        const parts = name.trim().split(" ");
                        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                    };

                    const DetailField = ({ label, value }) => {
                        const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                        return (
                            <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                {displayVal ? (
                                    <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                ) : (
                                    <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                )}
                            </div>
                        );
                    };

                    return null;
                })()}

                {/* Main Content Area (Redesigned Read-Only View) */}
                {request && !editMode && (
                    <div className="space-y-6">
                        {/* Student Selector for Multi-Student Applications */}
                        {!isStudentProfile && rawRequestData?.students?.length > 1 && (
                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-[20px] flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider">Multi-Student Application</h4>
                                    <p className="text-xs text-gray-500 font-medium">This application contains multiple students. Select a student to view details.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {rawRequestData.students.map((stu, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => setCurrentStudentIndex(sIdx)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                                                currentStudentIndex === sIdx
                                                    ? "bg-[#223F74] text-white shadow-md"
                                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            {stu.fullName || `Student ${sIdx + 1}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hero Profile Banner */}
                        <div className="relative overflow-hidden p-6 md:p-8 rounded-[24px] text-white bg-[#223F74] shadow-md border border-[#1a3360] flex flex-col md:flex-row items-center justify-between gap-6">
                            {/* Floating decorative elements */}
                            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                                <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-gradient-to-br from-white to-transparent opacity-10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)', animation: "halfSquareMove 12s ease-in-out infinite" }} />
                                <div className="absolute top-[10%] left-[5%] w-40 h-40 bg-gradient-to-br from-[#223F74] to-transparent blur-[40px] opacity-30" style={{ animation: "dropRipple1 8s ease-in-out infinite" }} />
                                <div className="absolute top-[40%] left-[50%] w-56 h-56 bg-gradient-to-tr from-[#223F74] to-[#223F74] blur-[50px] opacity-20" style={{ animation: "dropRipple2 10s ease-in-out infinite" }} />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left w-full">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Student Avatar */}
                                    {request.student.photo ? (
                                        <img
                                            src={request.student.photo}
                                            alt={request.student.fullName}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-[#e8612c] text-white flex items-center justify-center font-black text-3xl border-4 border-white/20 shadow-lg flex-shrink-0">
                                            {((name) => {
                                                if (!name) return "";
                                                const parts = name.trim().split(" ");
                                                if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                                                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                            })(request.student.fullName)}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <span className="text-xs uppercase tracking-[0.2em] text-cyan-200 block font-bold">Student Profile Details</span>
                                        <h2 className="text-3xl font-black tracking-tight leading-none text-white">{request.student.fullName}</h2>
                                        {request.organizationName && (
                                            <p className="text-sm text-cyan-100">{request.organizationName} — {request.branchName}</p>
                                        )}
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                                            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 font-bold">Adm No: {request.applicationNo}</span>
                                            {formatClassName(request.academic.appliedClass) && (
                                                <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1">
                                                    Class: {formatClassName(request.academic.appliedClass)}
                                                    {resolveSectionName(request.academic.preferredSection, request.academic.appliedClass) && ` - ${resolveSectionName(request.academic.preferredSection, request.academic.appliedClass)}`}
                                                </span>
                                            )}
                                            <span className={`rounded-full px-3 py-1 font-bold capitalize text-xs ${
                                                request.status === 'active' || request.status === 'approved'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : request.status === 'pending'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            }`}>
                                                {request.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isStudentProfile && !isViewOnlyMode && (
                                    <div className="w-44 shrink-0">
                                        <Button 
                                            text="Edit Profile"
                                            icon={<Edit size={16} />}
                                            variant="primary"
                                            onClick={() => {
                                                setErrors({});
                                                setEditMode(true);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Common Tabs */}
                        <div className="flex border-b border-gray-200 mt-6 gap-2 text-left">
                            {["profile", "family", "academics", "documents"].map((tab) => {
                                const isActive = viewTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setViewTab(tab)}
                                        className={`px-6 py-3 text-sm font-bold capitalize relative transition-all duration-200 border-b-2 -mb-[2px] ${
                                            isActive 
                                                ? "border-[#e8612c] text-[#223F74]" 
                                                : "border-transparent text-gray-500 hover:text-[#223F74]"
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Cards */}
                        <div className="min-h-[300px]">
                            {/* Tab: Profile */}
                            {viewTab === "profile" && (
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Personal Details Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col h-full text-left">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <User size={18} className="text-[#e8612c]" />
                                            Personal Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                            {((DetailField) => (
                                                <>
                                                    <DetailField label="Full Name" value={request.student.fullName} />
                                                    <DetailField label="Gender" value={request.student.gender} />
                                                    <DetailField label="Date of Birth" value={request.student.dob} />
                                                    <DetailField label="Blood Group" value={request.student.bloodGroup} />
                                                    <DetailField label="Aadhaar" value={request.student.aadhaar} />
                                                    <DetailField label="Previous School" value={request.student.previousSchool} />
                                                </>
                                            ))(({ label, value }) => {
                                                const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                                return (
                                                    <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                        {displayVal ? (
                                                            <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Contact Details Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col h-full text-left">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <MapPin size={18} className="text-[#e8612c]" />
                                            Contact Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                            {((DetailField) => (
                                                <>
                                                    <div className="sm:col-span-2">
                                                        <DetailField label="Email" value={request.contact.email} />
                                                    </div>
                                                    <div>
                                                        <DetailField label="Phone" value={request.contact.phone} />
                                                    </div>
                                                    <div>
                                                        <DetailField label="Alternate Phone" value={request.contact.alternatePhone} />
                                                    </div>
                                                    <div>
                                                        <DetailField label="City" value={request.contact.city} />
                                                    </div>
                                                    <div>
                                                        <DetailField label="State" value={studentRaw?.parent?.address?.state || ""} />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <DetailField label="Address" value={request.contact.address} />
                                                    </div>
                                                </>
                                            ))(({ label, value }) => {
                                                const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                                return (
                                                    <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                        {displayVal ? (
                                                            <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                    
                                    {/* Admission Fee Details Card */}
                                    {feeDetails ? (
                                        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col text-left">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                                                <h3 className="text-base font-bold text-[#223F74] flex items-center gap-2">
                                                    <FileText size={18} className="text-[#e8612c]" />
                                                    Admission Fee Details
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    {feeDetails.paymentStatus === "Paid" ? (
                                                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                                            🟢 Paid
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                                                            🟡 Unpaid
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => setIsReceiptModalOpen(true)}
                                                        className="px-4 py-1.5 text-xs font-bold bg-[#223F74] hover:bg-[#1a3058] text-white rounded-xl transition flex items-center gap-1.5"
                                                    >
                                                        View Receipt
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {((DetailField) => (
                                                    <>
                                                        <DetailField label="Admission Fee" value={feeDetails.admissionFee !== undefined ? `INR ${feeDetails.admissionFee}` : "—"} />
                                                        <DetailField label="Admission Discount" value={feeDetails.discount !== undefined ? `INR ${feeDetails.discount}` : "—"} />
                                                        <DetailField label="Scholarship Amount" value={feeDetails.scholarship !== undefined ? `INR ${feeDetails.scholarship}` : "—"} />
                                                        <DetailField label="Late Fee" value={feeDetails.lateFee !== undefined ? `INR ${feeDetails.lateFee}` : "—"} />
                                                        <DetailField label="Other Charges" value={feeDetails.otherCharges !== undefined ? `INR ${feeDetails.otherCharges}` : "—"} />
                                                        <DetailField label="Total Payable" value={feeDetails.totalPayable !== undefined ? `INR ${feeDetails.totalPayable}` : "—"} />
                                                        <DetailField label="Amount Paid" value={feeDetails.amountPaid !== undefined ? `INR ${feeDetails.amountPaid}` : "—"} />
                                                        <DetailField label="Remaining Amount" value={feeDetails.remainingAmount !== undefined ? `INR ${feeDetails.remainingAmount}` : "—"} />
                                                        <DetailField label="Payment Date" value={feeDetails.paymentDate || "—"} />
                                                        <DetailField label="Payment Mode" value={feeDetails.paymentMode || "—"} />
                                                        <DetailField label="Receipt Number" value={feeDetails.receiptNumber || "—"} />
                                                        <DetailField label="Collected By" value={feeDetails.remarks ? feeDetails.remarks.split(" - ")[0] : "Admin"} />
                                                        <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                                                            <DetailField label="Remarks" value={feeDetails.remarks || "—"} />
                                                        </div>
                                                    </>
                                                ))(({ label, value }) => {
                                                    const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                                    return (
                                                        <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                            {displayVal ? (
                                                                <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                            ) : (
                                                                <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-center">
                                            <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                                            <p className="text-sm font-semibold text-gray-500">No Admission Fee Details found for this student.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Family */}
                            {viewTab === "family" && (
                                <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left">
                                    <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Users size={18} className="text-[#e8612c]" />
                                        Parent / Guardian Details
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {((DetailField) => (
                                            <>
                                                <DetailField label="Guardian Full Name" value={request.parent.fullName} />
                                                <DetailField label="Relation" value={request.parent.relation} />
                                                <DetailField label="Father Name" value={request.parent.fatherName} />
                                                <DetailField label="Mother Name" value={request.parent.motherName} />
                                                <DetailField label="Primary Phone" value={request.contact.phone} />
                                                <DetailField label="Alternate Phone" value={request.parent.guardianPhone} />
                                            </>
                                        ))(({ label, value }) => {
                                            const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                            return (
                                                <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                    {displayVal ? (
                                                        <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-6 border-t border-gray-100 pt-4">
                                        <p className="text-xs font-black uppercase text-slate-400 mb-3">Notification Preferences</p>
                                        <div className="flex gap-3">
                                            {["sms", "email", "push"].map((type) => {
                                                const isEnrolled = request.parent.notifications?.[type];
                                                return (
                                                    <div key={type} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                                                        isEnrolled 
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                            : "bg-gray-50 text-gray-400 border-gray-200"
                                                    }`}>
                                                        {type.toUpperCase()}: {isEnrolled ? "Enabled ✓" : "Disabled ✗"}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Academics */}
                            {viewTab === "academics" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Academic Details Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col h-full text-left">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <GraduationCap size={18} className="text-[#e8612c]" />
                                            Academic Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                            {((DetailField) => (
                                                <>
                                                    <DetailField label="Applied Class" value={request.academic.appliedClass ? formatClassName(request.academic.appliedClass) : null} />
                                                    <DetailField label="Section" value={resolveSectionName(request.academic.preferredSection, request.academic.appliedClass)} />
                                                    <DetailField label="Roll Number" value={request.academic.rollNumber} />
                                                    <DetailField label="Admission Number" value={request.applicationNo} />
                                                    <DetailField label="Academic Year" value={request.academic.academicYear} />
                                                </>
                                            ))(({ label, value }) => {
                                                const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                                return (
                                                    <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                        {displayVal ? (
                                                            <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Transport & Health Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col h-full text-left">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <Bus size={18} className="text-[#e8612c]" />
                                            Transport & Health
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                            {((DetailField) => (
                                                <>
                                                    <DetailField label="Transport Enrolled" value={request.academic.transportRequired} />
                                                    <DetailField label="Bus Stop / Route ID" value={request.academic.busRoute} />
                                                    <div className="sm:col-span-2">
                                                        <DetailField label="Health Notes" value={request.academic.healthNotes} />
                                                    </div>
                                                </>
                                            ))(({ label, value }) => {
                                                const displayVal = value && String(value).trim() !== "" && String(value).trim() !== "—" && String(value).trim() !== "N/A" ? String(value) : null;
                                                return (
                                                    <div className="flex flex-col gap-1 text-left p-4 rounded-[16px] bg-gray-50/50 hover:bg-gray-50 transition border border-gray-100">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                                                        {displayVal ? (
                                                            <span className="text-sm font-bold text-slate-700">{displayVal}</span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-400 italic">Not Available</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {request.remarks && (
                                        <div className="col-span-1 lg:col-span-2 bg-amber-50/50 p-5 rounded-[24px] border border-amber-200 shadow-sm text-left">
                                            <h4 className="text-xs font-black uppercase text-amber-800 mb-2">Remarks</h4>
                                            <p className="text-sm font-semibold text-amber-950">{request.remarks}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Documents */}
                            {viewTab === "documents" && (
                                <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left">
                                    <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <FileText size={18} className="text-[#e8612c]" />
                                        Uploaded Documents
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderDocCard("Birth Certificate", "birthCertificate", true)}
                                        {renderDocCard("Student Aadhaar Card", "studentAadharCard", true)}
                                        {renderDocCard("Parent Aadhaar Card", "parentAadharCard", true)}
                                        {renderDocCard("Previous Year Marksheet", "previousYearMarksheet", false)}
                                        {renderDocCard("Transfer Certificate", "transferCertificate", false)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Action Footer Row */}
                        <div className="flex justify-end gap-3 mt-8 border-t border-gray-200 pt-6">
                            <Button 
                                text="Close"
                                variant="secondary"
                                onClick={() => navigate(-1)}
                                size={12}
                            />
                            {isStudentProfile && !isViewOnlyMode && (
                                <Button 
                                    text="Edit Student"
                                    icon={<Edit size={16} />}
                                    variant="primary"
                                    onClick={() => {
                                        setErrors({});
                                        setEditMode(true);
                                    }}
                                    size={12}
                                />
                            )}
                            {!isStudentProfile && request.status === "pending" && !isViewOnlyMode && (
                                <>
                                    <Button 
                                        text="Approve Admission"
                                        variant="primary"
                                        onClick={() => handleApprove(request._id)}
                                        disabled={actionLoadingId === request._id}
                                        size={12}
                                    />
                                    <Button 
                                        text="Reject Admission"
                                        variant="danger"
                                        onClick={() => setRejectTarget(request._id)}
                                        disabled={actionLoadingId === request._id}
                                        size={12}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabbed Edit Interface inside layout content flow */}
                {editMode && editingStudent && (
                    <div className="space-y-6">
                        {/* Improved Edit Header Banner */}
                        <div className="relative overflow-hidden p-6 md:p-8 rounded-[24px] text-white bg-[#223F74] shadow-md border border-[#1a3360] flex flex-col md:flex-row items-center justify-between gap-6">
                            {/* Floating decorative elements */}
                            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                                <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-gradient-to-br from-white to-transparent opacity-10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)', animation: "halfSquareMove 12s ease-in-out infinite" }} />
                                <div className="absolute top-[10%] left-[5%] w-40 h-40 bg-gradient-to-br from-[#223F74] to-transparent blur-[40px] opacity-30" style={{ animation: "dropRipple1 8s ease-in-out infinite" }} />
                                <div className="absolute top-[40%] left-[50%] w-56 h-56 bg-gradient-to-tr from-[#223F74] to-[#223F74] blur-[50px] opacity-20" style={{ animation: "dropRipple2 10s ease-in-out infinite" }} />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full justify-between">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Interactive Student Avatar */}
                                    <div 
                                        onClick={() => photoInputRef.current?.click()}
                                        className="relative w-24 h-24 rounded-full border-4 border-white/20 shadow-lg flex-shrink-0 cursor-pointer overflow-hidden group transition duration-300"
                                        title="Click to change profile picture"
                                    >
                                        {editingStudent.photo ? (
                                            <img
                                                src={editingStudent.photo}
                                                alt={editingStudent.user?.name}
                                                className="w-full h-full object-cover transition duration-300 group-hover:scale-110 group-hover:blur-[1px]"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-[#e8612c] text-white flex items-center justify-center font-black text-3xl transition duration-300 group-hover:blur-[1px]">
                                                {(() => {
                                                    const name = editingStudent.user?.name || editingStudent.fullName;
                                                    if (!name) return "";
                                                    const parts = name.trim().split(" ");
                                                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                                                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                                })()}
                                            </div>
                                        )}
                                        
                                        {/* Camera Icon Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Camera size={20} className="text-white mb-0.5" />
                                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
                                        </div>
                                    </div>
                                    
                                    {/* Hidden File Input */}
                                    <input 
                                        type="file" 
                                        ref={photoInputRef}
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />

                                    <div className="space-y-2">
                                        <span className="text-xs uppercase tracking-[0.2em] text-cyan-200 block font-bold">Edit Student Profile</span>
                                        <h2 className="text-3xl font-black tracking-tight leading-none text-white">{editingStudent.user?.name || editingStudent.fullName}</h2>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                                            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 font-bold">
                                                Adm No: {editingStudent.admissionNo || editingStudent.enrollmentNo || "—"}
                                            </span>
                                            {formatClassName(editingStudent.class) && (
                                                <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1">
                                                    Class: {formatClassName(editingStudent.class)}
                                                    {resolveSectionName(editingStudent.section, editingStudent.class) && ` - ${resolveSectionName(editingStudent.section, editingStudent.class)}`}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={(editingStudent?.status || "active").toLowerCase() === "active"}
                                                aria-label="Change student status"
                                                disabled={statusLoading || isStatusReadOnly(editingStudent?.status)}
                                                onClick={handleStatusToggle}
                                                onKeyDown={(e) => {
                                                    if (e.key === ' ' || e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleStatusToggle();
                                                    }
                                                }}
                                                className={`relative inline-flex h-6 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                                                    (editingStudent?.status || "active").toLowerCase() === "active" ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                                                }`}
                                            >
                                                <span className="sr-only">Change student status</span>
                                                <span
                                                    className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                                        (editingStudent?.status || "active").toLowerCase() === "active" ? 'translate-x-14' : 'translate-x-0'
                                                    }`}
                                                >
                                                    {statusLoading && (
                                                        <svg className="animate-spin h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span
                                                    className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-black uppercase pointer-events-none select-none tracking-tight ${
                                                        (editingStudent?.status || "active").toLowerCase() === "active" ? 'left-2.5 text-white' : 'right-2.5 text-white'
                                                    }`}
                                                >
                                                    {(editingStudent?.status || "active").toLowerCase() === "active" ? 'Active' : 'Inactive'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white shadow-sm transition flex-shrink-0 flex items-center gap-2"
                                >
                                    <ArrowLeft size={14} />
                                    Back to View
                                </button>
                            </div>
                        </div>

                        {/* Common Tabs */}
                        <div className="flex border-b border-gray-200 mt-6 gap-2 text-left">
                            {[
                                { id: "profile", label: "Profile" },
                                { id: "family", label: "Family" },
                                { id: "academics", label: "Academics" },
                                { id: "documents", label: "Documents" }
                            ].map((tab) => {
                                const isActive = editTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setEditTab(tab.id)}
                                        className={`px-6 py-3 text-sm font-bold capitalize relative transition-all duration-200 border-b-2 -mb-[2px] ${
                                            isActive 
                                                ? "border-[#e8612c] text-[#223F74]" 
                                                : "border-transparent text-gray-500 hover:text-[#223F74]"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Edit Forms Tab Content */}
                        <div className="min-h-[350px]">
                            
                            {/* Tab: Profile */}
                            {editTab === "profile" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Personal Information Section Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left flex flex-col h-full">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <User size={18} className="text-[#e8612c]" />
                                            Personal Information
                                        </h3>
                                        <Grid cols={12} gap={4}>
                                            <div className="col-span-12">
                                                <DataField 
                                                  label="Student Full Name"
                                                  id="name"
                                                  placeholder="Student's name"
                                                  value={editingStudent.user?.name || ""}
                                                  onChange={(e) => setEditingStudent({
                                                    ...editingStudent,
                                                    user: { ...editingStudent.user, name: e.target.value }
                                                  })}
                                                  error={errors.name}
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-6">
                                                <DatePicker 
                                                  label="Date of Birth"
                                                  id="dateOfBirth"
                                                  value={getSafeDateValue(editingStudent.dateOfBirth)}
                                                  onChange={(val) => setEditingStudent({ ...editingStudent, dateOfBirth: val })}
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-6">
                                                <SelectField 
                                                  label="Gender"
                                                  id="gender"
                                                  value={editingStudent.gender || ""}
                                                  onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                                                >
                                                  <Option value="" label="Select Gender" />
                                                  <Option value="male" label="Male" />
                                                  <Option value="female" label="Female" />
                                                  <Option value="other" label="Other" />
                                                </SelectField>
                                            </div>
                                            <div className="col-span-12 sm:col-span-6">
                                                <DataField 
                                                  label="Blood Group"
                                                  id="bloodGroup"
                                                  placeholder="e.g. O+"
                                                  value={editingStudent.bloodGroup || ""}
                                                  onChange={(e) => setEditingStudent({ ...editingStudent, bloodGroup: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-12">
                                                <DataField 
                                                  label="Photo URL"
                                                  id="photo"
                                                  placeholder="Photo URL link"
                                                  value={editingStudent.photo || ""}
                                                  onChange={(e) => setEditingStudent({ ...editingStudent, photo: e.target.value })}
                                                />
                                            </div>
                                        </Grid>
                                    </div>

                                    {/* Contact Information Section Card */}
                                    <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left flex flex-col h-full">
                                        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <MapPin size={18} className="text-[#e8612c]" />
                                            Contact Information
                                        </h3>
                                        <Grid cols={12} gap={4}>
                                            <div className="col-span-12">
                                                <DataField 
                                                  label="Email Address"
                                                  id="email"
                                                  type="email"
                                                  placeholder="student@example.com"
                                                  value={editingStudent.user?.email || ""}
                                                  onChange={(e) => setEditingStudent({
                                                    ...editingStudent,
                                                    user: { ...editingStudent.user, email: e.target.value }
                                                  })}
                                                  error={errors.email}
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-6">
                                                <DataField 
                                                  label="Phone Number"
                                                  id="phone"
                                                  placeholder="Student's Direct Phone"
                                                  value={editingStudent.phone || ""}
                                                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-6">
                                                <DataField 
                                                  label="Alternate Phone"
                                                  id="alternatePhone"
                                                  placeholder="Alternate Contact No"
                                                  value={editingStudent.alternatePhone || ""}
                                                  onChange={(e) => setEditingStudent({ ...editingStudent, alternatePhone: e.target.value })}
                                                />
                                            </div>
                                        </Grid>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Family */}
                            {editTab === "family" && (
                                <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left flex flex-col">
                                    <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Users size={18} className="text-[#e8612c]" />
                                        Parent / Guardian Information
                                    </h3>
                                    
                                    <Grid cols={12} gap={4}>
                                      <div className="col-span-12 sm:col-span-6">
                                        <DataField 
                                          label="Father's Name"
                                          id="fatherName"
                                          placeholder="Father's Name"
                                          value={editingStudent.parent?.fatherName || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: { ...editingStudent.parent, fatherName: e.target.value }
                                          })}
                                          error={errors.parentName}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-6">
                                        <DataField 
                                          label="Mother's Name"
                                          id="motherName"
                                          placeholder="Mother's Name"
                                          value={editingStudent.parent?.motherName || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: { ...editingStudent.parent, motherName: e.target.value }
                                          })}
                                          error={errors.parentName}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-4">
                                        <SelectField 
                                          label="Relation to Student"
                                          id="relation"
                                          value={editingStudent.parent?.relation || "father"}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: { ...editingStudent.parent, relation: e.target.value }
                                          })}
                                        >
                                          <Option value="father" label="Father" />
                                          <Option value="mother" label="Mother" />
                                          <Option value="guardian" label="Guardian" />
                                        </SelectField>
                                      </div>
                                      <div className="col-span-12 sm:col-span-4">
                                        <DataField 
                                          label="Primary Contact No"
                                          id="primaryContact"
                                          placeholder="Parent Contact No"
                                          value={editingStudent.parent?.primaryContact || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: { ...editingStudent.parent, primaryContact: e.target.value }
                                          })}
                                          error={errors.primaryContact}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-4">
                                        <DataField 
                                          label="Alternate Contact No"
                                          id="alternateContact"
                                          placeholder="Alt Parent No"
                                          value={editingStudent.parent?.alternateContact || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: { ...editingStudent.parent, alternateContact: e.target.value }
                                          })}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-6">
                                        <DataField 
                                          label="Parent Login Email"
                                          id="parentEmail"
                                          placeholder="parent@example.com"
                                          value={editingStudent.parent?.user?.email || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: {
                                              ...editingStudent.parent,
                                              user: { ...editingStudent.parent?.user, email: e.target.value }
                                            }
                                          })}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-6">
                                        <DataField 
                                          label="Emergency Phone No"
                                          id="emergencyPhone"
                                          placeholder="Emergency Contact"
                                          value={editingStudent.parent?.profileExtras?.guardianPhone || ""}
                                          onChange={(e) => setEditingStudent({
                                            ...editingStudent,
                                            parent: {
                                              ...editingStudent.parent,
                                              profileExtras: { ...editingStudent.parent?.profileExtras, guardianPhone: e.target.value }
                                            }
                                          })}
                                        />
                                      </div>
                                    </Grid>

                                    {/* Address Info */}
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin size={16} className="text-[#e8612c]" /> Home Address
                                        </h4>
                                        <Grid cols={12} gap={4}>
                                          <div className="col-span-12">
                                            <DataField 
                                              label="Street Address"
                                              id="street"
                                              placeholder="Street Name, House No, P.O. Box..."
                                              value={editingStudent.parent?.address?.street || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                parent: {
                                                  ...editingStudent.parent,
                                                  address: { ...editingStudent.parent?.address, street: e.target.value }
                                                }
                                              })}
                                            />
                                          </div>
                                          <div className="col-span-12 sm:col-span-4">
                                            <DataField 
                                              label="City"
                                              id="city"
                                              placeholder="City"
                                              value={editingStudent.parent?.address?.city || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                parent: {
                                                  ...editingStudent.parent,
                                                  address: { ...editingStudent.parent?.address, city: e.target.value }
                                                }
                                              })}
                                            />
                                          </div>
                                          <div className="col-span-12 sm:col-span-4">
                                            <DataField 
                                              label="State"
                                              id="state"
                                              placeholder="State"
                                              value={editingStudent.parent?.address?.state || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                parent: {
                                                  ...editingStudent.parent,
                                                  address: { ...editingStudent.parent?.address, state: e.target.value }
                                                }
                                              })}
                                            />
                                          </div>
                                          <div className="col-span-12 sm:col-span-4">
                                            <DataField 
                                              label="Pincode"
                                              id="pincode"
                                              placeholder="Postal Code"
                                              value={editingStudent.parent?.address?.pincode || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                parent: {
                                                  ...editingStudent.parent,
                                                  address: { ...editingStudent.parent?.address, pincode: e.target.value }
                                                }
                                              })}
                                            />
                                          </div>
                                        </Grid>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Academics */}
                            {editTab === "academics" && (
                                <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left flex flex-col">
                                    <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <GraduationCap size={18} className="text-[#e8612c]" />
                                        Academic Information
                                    </h3>
                                    
                                    <Grid cols={12} gap={4}>
                                      <div className="col-span-12 sm:col-span-4">
                                        <DataField 
                                          label="Roll Number"
                                          id="rollNo"
                                          placeholder="Student Roll No"
                                          value={editingStudent.rollNo || ""}
                                          onChange={(e) => setEditingStudent({ ...editingStudent, rollNo: e.target.value })}
                                          error={errors.rollNo}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-4">
                                        <DataField 
                                          label="Admission Number"
                                          id="admissionNo"
                                          placeholder="Admission Number"
                                          value={editingStudent.admissionNo || editingStudent.enrollmentNo || ""}
                                          disabled={true}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-4">
                                        <DataField 
                                          label="Academic Session (Year)"
                                          id="academicYear"
                                          placeholder="e.g. 2024-2025"
                                          value={editingStudent.academicYear || ""}
                                          onChange={(e) => setEditingStudent({ ...editingStudent, academicYear: e.target.value })}
                                          error={errors.academicYear}
                                        />
                                      </div>
                                      <div className="col-span-12 sm:col-span-6">
                                        <SelectField 
                                          label="Class"
                                          id="class"
                                          value={editingStudent.class?._id || editingStudent.class || ""}
                                          onChange={(e) => {
                                            const newClass = e.target.value;
                                            setEditingStudent({ 
                                              ...editingStudent, 
                                              class: newClass,
                                              section: "" // Reset section
                                            });
                                          }}
                                          error={errors.class}
                                        >
                                          <Option value="" label="Select Class" />
                                          {Array.isArray(classesList) && classesList.map(cls => (
                                            <Option key={cls.id || cls._id} value={cls.id || cls._id} label={cls.name} />
                                          ))}
                                        </SelectField>
                                      </div>
                                      <div className="col-span-12 sm:col-span-6">
                                        <SelectField 
                                          label="Section"
                                          id="section"
                                          value={editingStudent.section?._id || editingStudent.section || ""}
                                          onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                                          disabled={!(editingStudent.class?._id || editingStudent.class)}
                                          error={errors.section}
                                        >
                                          <Option value="" label="Select Section" />
                                          {Array.isArray(editSections) && editSections.map((sec) => (
                                            <Option key={sec.id || sec._id || sec} value={sec.id || sec._id || sec} label={sec.name || sec} />
                                          ))}
                                        </SelectField>
                                      </div>
                                    </Grid>

                                    {/* Transport Enrollment */}
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <Bus size={16} className="text-[#e8612c]" /> Transport Settings
                                        </h4>
                                        <div className="flex items-center gap-2.5">
                                          <input 
                                            type="checkbox"
                                            id="transportEnrolled"
                                            checked={editingStudent.transport?.enrolled || false}
                                            onChange={(e) => setEditingStudent({
                                              ...editingStudent,
                                              transport: { ...(editingStudent.transport || {}), enrolled: e.target.checked }
                                            })}
                                            className="w-5 h-5 accent-[#223F74] cursor-pointer"
                                          />
                                          <label htmlFor="transportEnrolled" className="text-sm font-bold text-gray-700 cursor-pointer">Enrolled in School Bus Service</label>
                                        </div>
                                    </div>

                                    {/* Previous School TC info */}
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <School size={16} className="text-[#e8612c]" /> Previous School Info
                                        </h4>
                                        <Grid cols={12} gap={4}>
                                          <div className="col-span-12 sm:col-span-6">
                                            <DataField 
                                              label="Previous School Name"
                                              id="prevSchoolName"
                                              placeholder="School Name"
                                              value={editingStudent.previousSchool?.name || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                previousSchool: { ...(editingStudent.previousSchool || {}), name: e.target.value }
                                              })}
                                            />
                                          </div>
                                          <div className="col-span-12 sm:col-span-3">
                                            <DataField 
                                              label="Transfer Certificate (TC) No"
                                              id="prevSchoolTcNo"
                                              placeholder="TC number"
                                              value={editingStudent.previousSchool?.tcNumber || ""}
                                              onChange={(e) => setEditingStudent({
                                                ...editingStudent,
                                                previousSchool: { ...(editingStudent.previousSchool || {}), tcNumber: e.target.value }
                                              })}
                                            />
                                          </div>
                                          <div className="col-span-12 sm:col-span-3">
                                            <DatePicker 
                                              label="TC Issue Date"
                                              id="prevSchoolTcDate"
                                              value={getSafeDateValue(editingStudent.previousSchool?.tcDate)}
                                              onChange={(val) => setEditingStudent({
                                                ...editingStudent,
                                                previousSchool: { ...(editingStudent.previousSchool || {}), tcDate: val }
                                              })}
                                            />
                                          </div>
                                        </Grid>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Documents */}
                            {editTab === "documents" && (
                                <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left flex flex-col">
                                    <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <FileText size={18} className="text-[#e8612c]" />
                                        Documents
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mb-6">Upload or manage the student's academic and legal documents below. Accepted formats: PDF, JPG, JPEG, PNG, WEBP.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderDocCard("Birth Certificate", "birthCertificate", true)}
                                        {renderDocCard("Student Aadhaar Card", "studentAadharCard", true)}
                                        {renderDocCard("Parent Aadhaar Card", "parentAadharCard", true)}
                                        {renderDocCard("Previous Year Marksheet", "previousYearMarksheet", false)}
                                        {renderDocCard("Transfer Certificate", "transferCertificate", false)}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Save / Cancel buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                          <div className="w-36">
                            <Button
                              text="Cancel"
                              variant="secondary"
                              onClick={handleCancelEdit}
                            />
                          </div>
                          <div className="w-52">
                            <Button
                              text="Save Changes"
                              variant="primary"
                              onClick={handleSaveEdit}
                              loading={saveLoading}
                            />
                          </div>
                        </div>
                    </div>
                )}
            </main>

            {rejectTarget && (
                <RejectModal
                  onConfirm={handleRejectConfirm}
                  onCancel={() => setRejectTarget(null)}
                  loading={actionLoadingId === rejectTarget}
                />
            )}

            {/* PDF Viewer Modal */}
            {/* Document Viewer Modal */}
            {viewingPdf && viewingPdf.type === 'image' ? (
                <PanelModal
                    isVisible={!!viewingPdf}
                    onClose={() => setViewingPdf(null)}
                    title={viewingPdf.name || "Image Preview"}
                    size="2xl"
                >
                    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex items-center justify-center p-4 min-h-[50vh] max-h-[75vh]">
                        <img
                            src={viewingPdf.url}
                            alt={viewingPdf.name}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </PanelModal>
            ) : viewingPdf ? (
                <PanelModal
                    isVisible={!!viewingPdf}
                    onClose={() => setViewingPdf(null)}
                    title={viewingPdf.name || "Document Viewer"}
                    size="2xl"
                >
                    <div className="w-full bg-slate-100 h-[75vh] rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                        <iframe
                            src={viewingPdf.url}
                            className="w-full h-full border-none"
                            title={viewingPdf.name}
                        />
                    </div>
                </PanelModal>
            ) : null}

            {confirmRemoveDoc && (
                <PanelModal
                    id="doc-remove-confirm-modal"
                    isVisible={!!confirmRemoveDoc}
                    onClose={() => setConfirmRemoveDoc(null)}
                    title="Remove Document"
                    size="sm"
                >
                    <div className="flex flex-col gap-4 text-left p-2">
                        <p className="text-sm text-gray-600 font-medium">
                            Are you sure you want to remove this document?
                        </p>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                            <div className="w-24">
                                <Button
                                    text="Cancel"
                                    variant="secondary"
                                    onClick={() => setConfirmRemoveDoc(null)}
                                />
                            </div>
                            <div className="w-28">
                                <Button
                                    text="Remove"
                                    variant="danger"
                                    onClick={async () => {
                                        const docType = confirmRemoveDoc.docType;
                                        setConfirmRemoveDoc(null);
                                        await executeDocumentRemoval(docType);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </PanelModal>
            )}

            {/* Fee Details & Review Approval Flow Modal */}
            {isFeeModalOpen && currentApprovalRequest && (
                <PanelModal
                    isVisible={isFeeModalOpen}
                    onClose={() => setIsFeeModalOpen(false)}
                    title={`Approve Admission - ${(currentApprovalRequest.student?.fullName || currentApprovalRequest.student?.name || 'Student')}`}
                    size="3xl"
                >
                    {approvalStep === 1 ? (
                        /* Step 1: Fee Details */
                        <div className="space-y-6 text-left">
                            <div>
                                <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider font-sans">Collect Fees</h3>
                                <p className="text-xs text-gray-500 font-medium">Please enter fee details for this student's admission.</p>
                                <div className="border-b border-[#E2E8F0] mt-3" />
                            </div>

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
                                            setFeeData(prev => ({ ...prev, paymentMode: e.target.value, transactionId: '', chequeNumber: '', ddNumber: '' }));
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
                                                setFeeData(prev => ({ ...prev, transactionId: e.target.value }));
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
                                                setFeeData(prev => ({ ...prev, chequeNumber: e.target.value }));
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
                                                setFeeData(prev => ({ ...prev, ddNumber: e.target.value }));
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
                                        onChange={(val) => setFeeData(prev => ({ ...prev, paymentDate: val }))}
                                    />
                                </div>
                                <div className="col-span-12">
                                    <DataField
                                        label="Remarks"
                                        id="remarks"
                                        type="textarea"
                                        value={feeData.remarks}
                                        onChange={(e) => setFeeData(prev => ({ ...prev, remarks: e.target.value }))}
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
                        <div className="space-y-6 text-left">
                            <div>
                                <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider font-sans">Review Details</h3>
                                <p className="text-xs text-gray-500 font-medium">Please review student, parent, and fee summaries before confirming admission.</p>
                                <div className="border-b border-[#E2E8F0] mt-3" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                {/* Student Details */}
                                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                                    <h4 className="text-xs font-black uppercase text-[#223F74] mb-1">Student Details</h4>
                                    <div className="text-xs text-slate-600 space-y-1">
                                        <p><span className="font-bold">Name:</span> {currentApprovalRequest?.student?.fullName || currentApprovalRequest?.student?.name || "Unnamed"}</p>
                                        <p><span className="font-bold">Gender:</span> {currentApprovalRequest?.student?.gender || "—"}</p>
                                        <p><span className="font-bold">DOB:</span> {currentApprovalRequest?.student?.dob || "—"}</p>
                                        <p><span className="font-bold">Class:</span> {formatClassName(currentApprovalRequest?.academic?.appliedClass || currentApprovalRequest?.class)}</p>
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

            {/* ── Fee Receipt Modal ── */}
            {isReceiptModalOpen && feeDetails && (
                <PanelModal
                    isVisible={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    title="Admission Fee Receipt"
                    size="xl"
                >
                    <div className="flex flex-col gap-6 text-left p-2">
                        {/* Receipt Container */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-gray-200 shadow-inner flex flex-col gap-4 text-slate-800">
                            {/* Receipt Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-4 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#223F74] text-white flex items-center justify-center rounded-xl font-black text-xl shadow-md">
                                        G
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#223F74] text-base">GRAPHURA SCHOOL MANAGEMENT ERP</h4>
                                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Official Student Fee Collection Receipt</p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${feeDetails.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {feeDetails.paymentStatus === 'Paid' ? '🟢 Paid' : '🟡 Unpaid'}
                                    </span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-gray-200 pb-4">
                                <div className="flex flex-col gap-2">
                                    <p><span className="font-bold text-slate-500">Student Name:</span> <span className="font-semibold text-slate-800">{request?.student?.fullName}</span></p>
                                    <p><span className="font-bold text-slate-500">Admission No:</span> <span className="font-semibold text-slate-800">{request?.applicationNo}</span></p>
                                    <p><span className="font-bold text-slate-500">Class / Section:</span> <span className="font-semibold text-slate-800">{formatClassName(request?.academic?.appliedClass)} / Section {request?.academic?.preferredSection || 'N/A'}</span></p>
                                    <p><span className="font-bold text-slate-500">Roll Number:</span> <span className="font-semibold text-slate-800">{request?.academic?.rollNumber || 'NA'}</span></p>
                                </div>
                                <div className="flex flex-col gap-2 sm:items-end sm:text-right">
                                    <p><span className="font-bold text-slate-500">Receipt No:</span> <span className="font-semibold text-slate-800">{feeDetails.receiptNumber || 'N/A'}</span></p>
                                    <p><span className="font-bold text-slate-500">Payment Date:</span> <span className="font-semibold text-slate-800">{feeDetails.paymentDate || '—'}</span></p>
                                    <p><span className="font-bold text-slate-500">Payment Mode:</span> <span className="font-semibold text-slate-800">{feeDetails.paymentMode || '—'}</span></p>
                                    <p><span className="font-bold text-slate-500">Collected By:</span> <span className="font-semibold text-slate-800">{feeDetails.remarks ? feeDetails.remarks.split(" - ")[0] : "Admin"}</span></p>
                                </div>
                            </div>

                            {/* Fee Breakdown Table */}
                            <div className="flex flex-col gap-2">
                                <h5 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Fee Structure & Payments</h5>
                                <div className="w-full border border-gray-200 rounded-xl overflow-hidden text-xs bg-white">
                                    <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 font-bold p-3 text-slate-600">
                                        <div className="col-span-8">Description</div>
                                        <div className="col-span-4 text-right">Amount (INR)</div>
                                    </div>
                                    <div className="flex flex-col divide-y divide-gray-100">
                                        <div className="grid grid-cols-12 p-3"><div className="col-span-8 text-slate-600">Admission Fee</div><div className="col-span-4 text-right font-semibold text-slate-700">INR {Number(feeDetails.admissionFee || 0).toFixed(2)}</div></div>
                                        <div className="grid grid-cols-12 p-3"><div className="col-span-8 text-slate-600">Admission Discount (-)</div><div className="col-span-4 text-right font-semibold text-slate-700">INR {Number(feeDetails.discount || 0).toFixed(2)}</div></div>
                                        <div className="grid grid-cols-12 p-3"><div className="col-span-8 text-slate-600">Scholarship Amount (-)</div><div className="col-span-4 text-right font-semibold text-slate-700">INR {Number(feeDetails.scholarship || 0).toFixed(2)}</div></div>
                                        <div className="grid grid-cols-12 p-3"><div className="col-span-8 text-slate-600">Late Fee (+)</div><div className="col-span-4 text-right font-semibold text-slate-700">INR {Number(feeDetails.lateFee || 0).toFixed(2)}</div></div>
                                        <div className="grid grid-cols-12 p-3"><div className="col-span-8 text-slate-600">Other Charges (+)</div><div className="col-span-4 text-right font-semibold text-slate-700">INR {Number(feeDetails.otherCharges || 0).toFixed(2)}</div></div>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Box */}
                            <div className="w-full bg-slate-100/50 p-4 border border-gray-200 rounded-xl flex flex-col gap-2 text-xs font-semibold">
                                <div className="flex justify-between text-slate-600"><span>Total Payable</span><span className="font-bold text-slate-800">INR {Number(feeDetails.totalPayable || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-emerald-600"><span>Amount Paid</span><span className="font-bold text-emerald-700">INR {Number(feeDetails.amountPaid || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-rose-600 border-t border-dashed border-gray-300 pt-2 font-bold text-sm"><span>Remaining Balance</span><span className="font-black text-rose-700">INR {Number(feeDetails.remainingAmount || 0).toFixed(2)}</span></div>
                            </div>

                            {/* Remarks */}
                            {feeDetails.remarks && (
                                <div className="text-xs text-slate-600 border-t border-gray-200 pt-3">
                                    <span className="font-bold text-slate-500 block mb-1">Remarks</span>
                                    <p className="bg-white p-3 rounded-lg border border-gray-100 italic">{feeDetails.remarks}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-2">
                            <button
                                onClick={() => setIsReceiptModalOpen(false)}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-slate-700 font-semibold text-sm transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleDownloadReceipt()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition flex items-center gap-1.5"
                            >
                                <CheckCircle size={16} />
                                Download Receipt
                            </button>
                        </div>
                    </div>
                </PanelModal>
            )}
        </div>
    );
};

export default AdmissionDetails;
