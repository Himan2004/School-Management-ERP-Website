import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { selectDashboardStats, getDashboardStats } from '../../../features/admin/adminSlice';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  submitAdmission, 
  generateReferenceId, 
  uploadAdmissionDocuments, 
  getAvailableClasses,
  approveAdmission
} from '../../../services/api/principalAdmissionApi';
import { ADMISSION_DOCUMENTS } from '../../../config/documentConfig';
import { Heading, DataField, SelectField, Option, Button } from '../../../components/shared/Common_Components';
import { adjustFeeValues, handleFeeKeyDown, handleFeePaste } from '../../../utils/feeValidation';
import { getDynamicAcademicYear } from '../../../utils/academicYear';

const getCurrentAdminName = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.fullName || user.name || user.username || "Current Admin";
    }
  } catch (error) {
    console.error("Failed to get current admin user name", error);
  }
  return "Current Admin";
};

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

const NewAdmission = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const dashboardStats = useSelector(selectDashboardStats);
  const { authUser } = useSelector((state) => state.adminAuth);

  useEffect(() => {
    if (!dashboardStats) {
      dispatch(getDashboardStats());
    }
  }, [dispatch, dashboardStats]);

  const currentStudents = dashboardStats?.students?.total ?? 0;
  const maxStudents = authUser?.school?.enrollmentCapacity !== undefined && authUser?.school?.enrollmentCapacity !== ""
    ? Number(authUser?.school?.enrollmentCapacity) || 0
    : 0;
  const seatsRemaining = Math.max(0, maxStudents - currentStudents);
  const limitReached = maxStudents > 0 && currentStudents >= maxStudents;

  const [step, setStep] = useState(1);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [step]);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    religion: '',
    category: 'General',
    aadharNumber: '',
    admissionNumber: 'ADM-2024-001',
    admissionDate: new Date().toISOString().split('T')[0],
    academicYear: getDynamicAcademicYear(),
    class: '',
    section: '',
    rollNumber: '',
    previousSchool: '',
    fatherName: '',
    motherName: '',
    guardianContact: '',
    alternateContact: '',
    email: '',
    occupation: '',
    annualIncome: '',
    homeAddress: '',
    houseNo: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [files, setFiles] = useState({
    ...ADMISSION_DOCUMENTS.reduce((acc, doc) => {
      acc[doc.key] = null;
      return acc;
    }, {}),
    passportPhoto: null,
  });

  // Step 2 Fee Details State
  const [feeData, setFeeData] = useState({
    admissionFee: '',
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

  const [isStatusOverridden, setIsStatusOverridden] = useState(false);

  // Success Confirmation State
  const [successDetails, setSuccessDetails] = useState({
    studentId: '',
    studentName: '',
    admissionNumber: '',
    rollNumber: '',
    parentEmail: '',
    paymentStatus: '',
    receiptNumber: '',
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Class & Section State
  const [classesList, setClassesList] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classesRes = await getAvailableClasses();
        
        // BULLETPROOF ARRAY EXTRACTION
        let extractedClasses = [];
        if (Array.isArray(classesRes)) extractedClasses = classesRes;
        else if (Array.isArray(classesRes?.data)) extractedClasses = classesRes.data;
        else if (Array.isArray(classesRes?.data?.data)) extractedClasses = classesRes.data.data;
        
        if (extractedClasses.length > 0) {
          setClassesList(extractedClasses);
        } else {
          console.warn("No classes found or incorrect data structure:", classesRes);
          setClassesList([]);
        }

        const refRes = await generateReferenceId();
        if (refRes?.success || refRes?.ref) {
          setFormData(prev => ({ ...prev, admissionNumber: refRes.ref || refRes.data?.ref }));
        }
      } catch (error) {
        console.error("Failed to load admission prerequisites:", error);
        setClassesList([]);
      }
    };
    fetchData();
  }, []);

  // Fee calculations
  const admissionFeeVal = Number(feeData.admissionFee) || 0;
  const discountVal = Number(feeData.discount) || 0;
  const scholarshipVal = Number(feeData.scholarship) || 0;
  const lateFeeVal = Number(feeData.lateFee) || 0;
  const otherChargesVal = Number(feeData.otherCharges) || 0;

  const totalPayable = Math.max(0, admissionFeeVal - discountVal - scholarshipVal + lateFeeVal + otherChargesVal);
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

  const sortedAndFilteredClasses = useMemo(() => {
    const gradesString = authUser?.school?.gradesOffered || "";
    const allocatedGrades = gradesString.split(",").map(g => g.trim().toLowerCase()).filter(Boolean);

    let list = classesList;
    if (gradesString) {
      list = classesList.filter(c => {
        const className = (c.name || "").trim().toLowerCase();
        if (allocatedGrades.includes(className)) return true;
        const classNum = className.replace(/\D/g, "");
        if (classNum && allocatedGrades.includes(classNum)) return true;
        return false;
      });
    }

    return [...list].sort((a, b) => {
      const aName = (a.name || '').trim();
      const bName = (b.name || '').trim();
      
      const getPriority = (name) => {
        const n = name.toLowerCase();
        if (n.includes('nursery')) return 0;
        if (n.includes('junior kg') || n.includes('jr. kg') || n.includes('jr kg')) return 1;
        if (n.includes('senior kg') || n.includes('sr. kg') || n.includes('sr kg')) return 2;
        return null;
      };

      const aPri = getPriority(aName);
      const bPri = getPriority(bName);

      if (aPri !== null && bPri !== null) {
        return aPri - bPri;
      }
      if (aPri !== null) return -1;
      if (bPri !== null) return 1;

      const aNum = parseInt(aName.replace(/\D/g, ''), 10);
      const bNum = parseInt(bName.replace(/\D/g, ''), 10);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      if (!isNaN(aNum)) return 1;
      if (!isNaN(bNum)) return -1;

      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [classesList, authUser?.school?.gradesOffered]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'aadharNumber') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 12);
    } else if (name === 'pincode') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 6);
    } else if (name === 'guardianContact' || name === 'alternateContact') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 10);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: finalValue };
      updated.homeAddress = `${updated.houseNo || ''}, ${updated.street || ''}, ${updated.city || ''}, ${updated.state || ''} - ${updated.pincode || ''}`;
      return updated;
    });
    
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError(''); 
  };

  const handleClassChange = (e) => {
    const selectedClassId = e.target.value;
    setFormData(prev => ({ ...prev, class: selectedClassId, section: '' }));
    
    const classObj = sortedAndFilteredClasses.find(c => c._id === selectedClassId);
    if (classObj && classObj.sections && classObj.sections.length > 0) {
        setAvailableSections(classObj.sections);
    } else {
        setAvailableSections([]);
    }
  };

  const renderLandingStyleDocCard = (label, key, isMandatory = false) => {
    const isUploaded = !!files[key];
    const hasError = errors[key];

    const handleFileChangeLocal = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPEG, PNG, or PDF files only.");
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size too large. Maximum size is 5MB.");
        return;
      }

      setFiles(prev => ({ ...prev, [key]: file }));
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: "" }));
      }
      toast.success(`${label} uploaded successfully!`);
    };

    return (
      <div key={key} className="col-span-12 md:col-span-4 flex flex-col">
        <div className="relative group">
          <label
            className={`p-5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[160px] ${isUploaded
              ? "border-green-500 bg-green-50/50 hover:bg-green-50"
              : hasError
                ? "border-red-500 bg-red-50 hover:bg-red-100"
                : "border-gray-200 hover:border-[#223F74] hover:bg-slate-50"
              }`}
          >
            <Upload
              size={24}
              className={`mb-2 transition-all group-hover:scale-110 ${isUploaded ? "text-green-600" : hasError ? "text-red-500" : "text-gray-400 group-hover:text-[#223F74]"
                }`}
            />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isUploaded ? files[key]?.name : label}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {isUploaded ? "Click to replace" : "PDF, PNG, JPG up to 5MB"}
            </p>
            {isMandatory && !isUploaded && <span className="text-red-500 text-[8px] font-bold block mt-1">* REQUIRED</span>}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChangeLocal}
            />
          </label>

          {isUploaded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFiles(prev => ({ ...prev, [key]: null }));
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-all shadow-md z-10"
              title="Remove document"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {hasError && (
          <span className="text-xs font-semibold text-rose-500 mt-2 ml-1 flex items-center gap-1">
            <AlertCircle size={14} /> {hasError}
          </span>
        )}
      </div>
    );
  };

  const handleFeeChange = (field, value) => {
    setFeeData(prev => {
      const updated = adjustFeeValues(field, value, prev);
      if (errors[field]) {
        setErrors(errs => ({ ...errs, [field]: '' }));
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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.fatherName.trim()) newErrors.fatherName = 'Father/Guardian Name is required';
    if (!formData.guardianContact.trim()) newErrors.guardianContact = 'Contact Number is required';
    
    if (!formData.houseNo || !formData.houseNo.trim()) newErrors.houseNo = 'House No / Flat No is required';
    if (!formData.street || !formData.street.trim()) newErrors.street = 'Street / Area / Locality is required';
    if (!formData.city || !formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state || !formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode || !formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }
    
    if (formData.guardianContact && !/^\d{10}$/.test(formData.guardianContact)) newErrors.guardianContact = 'Must be 10 digits';
    if (formData.alternateContact && !/^\d{10}$/.test(formData.alternateContact)) newErrors.alternateContact = 'Must be 10 digits';
    
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }
    
    if (!formData.aadharNumber || !formData.aadharNumber.trim()) {
      newErrors.aadharNumber = 'Aadhaar Number is required.';
    } else if (formData.aadharNumber.length !== 12) {
      newErrors.aadharNumber = 'Aadhaar Number must be exactly 12 digits.';
    }

    if (!files.passportPhoto) {
      newErrors.passportPhoto = 'Passport Photo is required';
    }

    // Document validation
    ADMISSION_DOCUMENTS.forEach(doc => {
      if (doc.required && !files[doc.key]) {
        newErrors[doc.key] = `${doc.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (validateForm()) {
      setStep(2);
      setSubmitted(false);
      setErrors({});
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStep2Submit = (e) => {
    if (e) e.preventDefault();
    const newErrors = {};

    if (!feeData.admissionFee || Number(feeData.admissionFee) <= 0) {
      newErrors.admissionFee = 'Admission Fee is required and must be greater than 0';
    }
    if (feeData.amountPaid === '' || Number(feeData.amountPaid) < 0) {
      newErrors.amountPaid = 'Amount Paid is required';
    } else if (Number(feeData.amountPaid) > totalPayable) {
      newErrors.amountPaid = 'Amount Paid cannot be greater than Total Payable';
    }
    if (!feeData.paymentMode) {
      newErrors.paymentMode = 'Payment Mode is required';
    }

    if (feeData.paymentMode === 'UPI' || feeData.paymentMode === 'Card' || feeData.paymentMode === 'Bank Transfer') {
      if (!feeData.transactionId || !feeData.transactionId.trim()) {
        newErrors.transactionId = 'Transaction ID is required for online payments';
      }
    }
    if (feeData.paymentMode === 'Cheque') {
      if (!feeData.chequeNumber || !feeData.chequeNumber.trim()) {
        newErrors.chequeNumber = 'Cheque Number is required';
      }
    }
    if (feeData.paymentMode === 'Demand Draft') {
      if (!feeData.ddNumber || !feeData.ddNumber.trim()) {
        newErrors.ddNumber = 'DD Number is required';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setStep(3);
      setSubmitted(false);
    } else {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitted(true);
    setApiError('');
    setSuccessMessage('');
    console.log("[Admission] Final form submission start (Confirm Admission)");

    setIsLoading(true);

    const payload = {
      parent: {
        fullName: formData.fatherName || formData.motherName || 'Unknown',
        email: formData.email || `parent${Date.now()}@example.com`,
        primaryContact: formData.guardianContact,
        alternateContact: formData.alternateContact || null,
        fatherName: formData.fatherName || null,
        motherName: formData.motherName || null,
        relation: 'Father', 
        address: {
          city: formData.city || 'Unknown', 
          state: formData.state || 'Unknown',
          pincode: formData.pincode || '000000',
          street: `${formData.houseNo || ''}, ${formData.street || ''}`
        },
        aadharNumber: formData.aadharNumber || null
      },
      students: [
        {
          fullName: formData.fullName,
          gender: formData.gender,
          dob: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup || null,
          class: formData.class || null, 
          section: formData.section || null,
          rollNumber: (formData.rollNumber && formData.rollNumber.trim()) ? formData.rollNumber.trim() : "NA",
          previousSchool: formData.previousSchool || null,
          academicYear: formData.academicYear
        }
      ],
      declarationAccepted: true,
      admissionSource: 'ADMIN',
      feeDetails: {
        admissionFee: Number(feeData.admissionFee) || 0,
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

    console.log("[Admission] Payload being submitted:", payload);

    try {
      const response = await submitAdmission(payload);
      console.log("[Admission] API response success:", response);
      if (response.success) {
        const admissionId = response.data._id;
        const createdStudentId = response.data.students?.[0]?._id;

        const hasFiles = Object.values(files).some(f => f !== null);
        if (hasFiles && admissionId && createdStudentId) {
          try {
            const docFiles = {};
            ADMISSION_DOCUMENTS.forEach(doc => {
              docFiles[doc.uploadKey] = files[doc.key];
            });
            docFiles.photo = files.passportPhoto;
            console.log("[Admission] Initiating document upload for IDs:", { admissionId, createdStudentId });
            await uploadAdmissionDocuments(admissionId, createdStudentId, docFiles);
          } catch (docErr) {
            console.error("[Admission] Document upload failed:", docErr);
            const rawErrMsg = docErr.response?.data?.message || docErr.message || "Upload failed";
            setApiError(`Document upload failed: ${rawErrMsg}. Admission request created but not approved.`);
            toast.error(`Upload failed: ${rawErrMsg}`);
            setIsLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return; // Halt approval
          }
        }

        if (feeData.paymentStatus === 'Unpaid') {
          setSuccessDetails({
            studentId: '',
            studentName: formData.fullName,
            admissionNumber: formData.admissionNumber,
            rollNumber: (formData.rollNumber && formData.rollNumber.trim()) ? formData.rollNumber.trim() : 'NA',
            parentEmail: formData.email,
            paymentStatus: feeData.paymentStatus,
            receiptNumber: feeData.receiptNumber,
          });

          setSuccessMessage("Admission request submitted successfully (Pending Payment). Parent credentials login has NOT been generated/sent.");
          toast.success("Admission request submitted (Pending Payment)!");
          setStep(4);
        } else {
          // Approve the admission request immediately for direct admin registration
          const approveResponse = await approveAdmission(admissionId);
          console.log("[Admission] Confirm Admission API Response:", approveResponse);
          console.log("[Admission] Admission ID:", admissionId);
          
          if (approveResponse.success) {
            const finalStudentId = approveResponse.studentId || approveResponse.data?.studentId || approveResponse.data?.student?._id;
            console.log("[Admission] Extracted Student ID:", finalStudentId);

            const finalRollNumber = (approveResponse.rollNumber && approveResponse.rollNumber !== 'Auto-Generated') ? approveResponse.rollNumber : ((formData.rollNumber && formData.rollNumber.trim()) ? formData.rollNumber.trim() : 'NA');

            setSuccessDetails({
              studentId: finalStudentId || '',
              studentName: formData.fullName,
              admissionNumber: formData.admissionNumber,
              rollNumber: finalRollNumber,
              parentEmail: formData.email,
              paymentStatus: feeData.paymentStatus,
              receiptNumber: feeData.receiptNumber,
            });

            setSuccessMessage("Admission Confirmed Successfully. Credentials have been sent to Parent.");
            toast.success("Admission Confirmed Successfully!");
            setStep(4);
          } else {
            setApiError(approveResponse.message || "Failed to auto-approve student admission.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    } catch (error) {
      console.error("[Admission] API response failure:", error);
      setApiError(error.response?.data?.message || 'Failed to submit admission. Database validation failed.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '', dateOfBirth: '', gender: '', bloodGroup: '', religion: '', category: 'General', aadharNumber: '',
      admissionNumber: 'ADM-2024-001', admissionDate: new Date().toISOString().split('T')[0], academicYear: getDynamicAcademicYear(), class: '', section: '', rollNumber: '',
      previousSchool: '', fatherName: '', motherName: '', guardianContact: '', alternateContact: '', email: '', occupation: '', annualIncome: '', homeAddress: '',
      houseNo: '', street: '', city: '', state: '', pincode: '',
    });
    setFiles({
      ...ADMISSION_DOCUMENTS.reduce((acc, doc) => {
        acc[doc.key] = null;
        return acc;
      }, {}),
      passportPhoto: null
    });
    setPhotoPreview(null);
    setErrors({});
    setSubmitted(false);
    setApiError('');
    setSuccessMessage('');
  };

  const resetFormToStep1 = () => {
    resetForm();
    setFeeData({
      admissionFee: '',
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
    setStep(1);
    setIsStatusOverridden(false);
  };

  // jsPDF Receipt Generation
  const handleDownloadReceipt = () => {
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
    doc.text(feeData.receiptNumber || 'N/A', 165, 55);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 140, 61);
    doc.setFont("helvetica", "normal");
    doc.text(feeData.paymentDate || 'N/A', 165, 61);

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
    doc.text(formData.fullName || 'N/A', 45, 83);

    doc.setFont("helvetica", "bold");
    doc.text("Admission No:", 15, 89);
    doc.setFont("helvetica", "normal");
    doc.text(formData.admissionNumber || 'N/A', 45, 89);

    const selectedClassObj = sortedAndFilteredClasses.find(c => c._id === formData.class);
    const classNameStr = selectedClassObj ? selectedClassObj.name : formData.class;
    
    doc.setFont("helvetica", "bold");
    doc.text("Class / Section:", 120, 83);
    doc.setFont("helvetica", "normal");
    doc.text(`${classNameStr} / Section ${formData.section || 'N/A'}`, 155, 83);

    doc.setFont("helvetica", "bold");
    doc.text("Roll Number:", 120, 89);
    doc.setFont("helvetica", "normal");
    doc.text(successDetails.rollNumber || formData.rollNumber || 'NA', 155, 89);

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
      { label: "Admission Fee", value: `INR ${Number(feeData.admissionFee || 0).toFixed(2)}` },
      { label: "Admission Discount (-)", value: `INR ${Number(feeData.discount || 0).toFixed(2)}` },
      { label: "Scholarship Amount (-)", value: `INR ${Number(feeData.scholarship || 0).toFixed(2)}` },
      { label: "Late Fee (+)", value: `INR ${Number(feeData.lateFee || 0).toFixed(2)}` },
      { label: "Other Charges (+)", value: `INR ${Number(feeData.otherCharges || 0).toFixed(2)}` }
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
    doc.text(`INR ${Number(totalPayable).toFixed(2)}`, 160, currentY);
    doc.line(15, currentY + 3, 195, currentY + 3);

    currentY += 9;
    doc.setTextColor("#10B981");
    doc.text("Amount Paid", 20, currentY);
    doc.text(`INR ${Number(feeData.amountPaid).toFixed(2)}`, 160, currentY);
    doc.line(15, currentY + 3, 195, currentY + 3);

    currentY += 9;
    doc.setTextColor("#EF4444");
    doc.text("Remaining Balance", 20, currentY);
    doc.text(`INR ${Number(remainingAmount).toFixed(2)}`, 160, currentY);
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
    doc.text(feeData.paymentMode || 'N/A', 50, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Payment Status:", 20, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(feeData.paymentStatus || 'N/A', 50, currentY + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Receipt Issued By:", 20, currentY + 18);
    doc.setFont("helvetica", "normal");
    doc.text(getCurrentAdminName(), 50, currentY + 18);

    if (feeData.paymentMode === 'Cheque') {
      doc.setFont("helvetica", "bold");
      doc.text("Cheque Number:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(feeData.chequeNumber || 'N/A', 140, currentY + 6);
    } else if (feeData.paymentMode === 'Demand Draft') {
      doc.setFont("helvetica", "bold");
      doc.text("DD Number:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(feeData.ddNumber || 'N/A', 140, currentY + 6);
    } else if (feeData.transactionId) {
      doc.setFont("helvetica", "bold");
      doc.text("Transaction ID:", 110, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(feeData.transactionId || 'N/A', 140, currentY + 6);
    }

    // Signatures
    doc.setFontSize(8);
    doc.setTextColor(darkColor);
    doc.text("Authorized Signature", 150, currentY + 45);
    doc.line(140, currentY + 40, 190, currentY + 40);

    doc.save(`receipt-${feeData.receiptNumber}.pdf`);
  };

  // Step indicator component
  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: 'Student Information' },
      { id: 2, label: 'Fee Details' },
      { id: 3, label: 'Review & Confirm' }
    ];

    return (
      <div className="w-full bg-white p-5 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
          {steps.map((s, idx) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            
            let colorClass = 'text-slate-400 bg-slate-100 border-slate-200';
            
            if (isCompleted) {
              colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-300';
            } else if (isCurrent) {
              colorClass = 'text-blue-700 bg-blue-50 border-blue-300 ring-2 ring-blue-100';
            }

            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${colorClass}`}>
                    {s.id}
                  </div>
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-900 font-bold' : isCompleted ? 'text-emerald-800' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`hidden sm:block flex-1 h-[2px] mx-4 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 1 Render
  const renderStep1 = () => {
    return (
      <form onSubmit={handleStep1Submit} className="space-y-8">

        {maxStudents > 0 && (
          <div className="bg-white p-5 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Allocation</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  Current Students: <span className="font-bold text-[#223F74]">{currentStudents}</span> / <span className="font-bold text-slate-500">{maxStudents}</span>
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Seats</p>
                <p className={`text-sm font-bold mt-1 ${limitReached ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {seatsRemaining}
                </p>
              </div>
            </div>
          </div>
        )}

        {limitReached && (
          <div className="flex items-start gap-2.5 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Maximum student capacity reached.</p>
              <p className="text-xs text-rose-600 mt-0.5">Admission cannot be created until seats become available.</p>
            </div>
          </div>
        )}
        
        {/* Student Basic Information Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Student Basic Information</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Student Photo */}
            <div className="col-span-12 flex flex-col items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-2">
              <div className={`w-32 h-40 bg-white border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative group transition-all cursor-pointer ${errors.passportPhoto ? "border-red-500 bg-red-50" : "border-slate-300 hover:border-[#223F74]"}`}>
                {photoPreview ? (
                  <>
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Student Preview" />
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoPreview(null);
                        setFiles(prev => ({ ...prev, passportPhoto: null }));
                      }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 p-1.5 rounded-full transition-all duration-300 z-10"
                      title="Remove image"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </>
                ) : (
                  <Upload className="text-gray-400 group-hover:text-[#223F74] transition" size={32} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                      const maxSize = 5 * 1024 * 1024;
                      if (!allowedTypes.includes(file.type)) {
                        toast.error("Invalid file type. Please upload JPEG or PNG images only.");
                        return;
                      }
                      if (file.size > maxSize) {
                        toast.error("File size too large. Maximum size is 5MB.");
                        return;
                      }
                      setFiles(prev => ({ ...prev, passportPhoto: file }));
                      setPhotoPreview(URL.createObjectURL(file));
                      if (errors.passportPhoto) {
                        setErrors(prev => ({ ...prev, passportPhoto: "" }));
                      }
                    }
                  }}
                />
              </div>
              <p className="text-[10px] font-bold mt-2 uppercase text-center">
                <span className={errors.passportPhoto ? "text-red-500" : "text-gray-400"}>
                  Passport Photo {!files.passportPhoto && <span className="text-red-500">*</span>}
                </span>
              </p>
              {errors.passportPhoto && (
                <p className="text-xs text-red-500 mt-1 text-center flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.passportPhoto}
                </p>
              )}
            </div>

            <DataField
              label="Full Name *"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleChange({ target: { name: 'fullName', value: e.target.value } })}
              error={errors.fullName}
              size={6}
            />

            <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
              <label htmlFor="dateOfBirth" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                Date of Birth *
              </label>
              <input
                type="date"
                id="dateOfBirth"
                max={new Date().toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={(e) => handleChange({ target: { name: 'dateOfBirth', value: e.target.value } })}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
              />
              {errors.dateOfBirth && (
                <span className="text-xs font-semibold text-rose-500 mt-1 ml-1 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.dateOfBirth}
                </span>
              )}
            </div>

            <SelectField
              label="Gender *"
              id="gender"
              value={formData.gender}
              onChange={(e) => handleChange({ target: { name: 'gender', value: e.target.value } })}
              size={6}
            >
              <Option value="" label="Select Gender" />
              <Option value="Male" label="Male" />
              <Option value="Female" label="Female" />
              <Option value="Other" label="Other" />
            </SelectField>

            <SelectField
              label="Blood Group"
              id="bloodGroup"
              value={formData.bloodGroup}
              onChange={(e) => handleChange({ target: { name: 'bloodGroup', value: e.target.value } })}
              size={6}
            >
              <Option value="" label="Select Blood Group" />
              <Option value="A+" label="A+" />
              <Option value="A-" label="A-" />
              <Option value="B+" label="B+" />
              <Option value="B-" label="B-" />
              <Option value="O+" label="O+" />
              <Option value="O-" label="O-" />
              <Option value="AB+" label="AB+" />
              <Option value="AB-" label="AB-" />
            </SelectField>

            <DataField
              label="Religion"
              id="religion"
              value={formData.religion}
              onChange={(e) => handleChange({ target: { name: 'religion', value: e.target.value } })}
              size={6}
            />

            <SelectField
              label="Category *"
              id="category"
              value={formData.category}
              onChange={(e) => handleChange({ target: { name: 'category', value: e.target.value } })}
              size={6}
            >
              <Option value="General" label="General" />
              <Option value="OBC" label="OBC" />
              <Option value="SC" label="SC" />
              <Option value="ST" label="ST" />
            </SelectField>

            <DataField
              label="Aadhar Number *"
              id="aadharNumber"
              type="number"
              max={12}
              value={formData.aadharNumber}
              onChange={(e) => handleChange({ target: { name: 'aadharNumber', value: e.target.value } })}
              error={errors.aadharNumber}
              size={6}
            />
          </div>
        </div>

        {/* Parent Information Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Parent Information</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <DataField
              label="Father Name *"
              id="fatherName"
              value={formData.fatherName}
              onChange={(e) => handleChange({ target: { name: 'fatherName', value: e.target.value } })}
              error={errors.fatherName}
              size={6}
            />

            <DataField
              label="Mother Name *"
              id="motherName"
              value={formData.motherName}
              onChange={(e) => handleChange({ target: { name: 'motherName', value: e.target.value } })}
              size={6}
            />

            <DataField
              label="Email Address *"
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange({ target: { name: 'email', value: e.target.value } })}
              error={errors.email}
              size={6}
            />

            <DataField
              label="Occupation"
              id="occupation"
              value={formData.occupation}
              onChange={(e) => handleChange({ target: { name: 'occupation', value: e.target.value } })}
              size={6}
            />

            <DataField
              label="Annual Income"
              id="annualIncome"
              type="number"
              value={formData.annualIncome}
              onChange={(e) => handleChange({ target: { name: 'annualIncome', value: e.target.value } })}
              size={6}
            />
          </div>
        </div>

        {/* Academic Information Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Academic Information</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <DataField
              label="Admission Number"
              id="admissionNumber"
              value={formData.admissionNumber}
              disabled={true}
              size={6}
            />

            <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
              <label htmlFor="admissionDate" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                Admission Date
              </label>
              <input
                type="date"
                id="admissionDate"
                value={formData.admissionDate}
                onChange={(e) => handleChange({ target: { name: 'admissionDate', value: e.target.value } })}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
              />
            </div>

            <DataField
              label="Academic Session (Year)"
              id="academicYear"
              value={formData.academicYear}
              disabled={true}
              readOnly={true}
              size={6}
            />

            <SelectField
              label="Class *"
              id="class"
              value={formData.class}
              onChange={handleClassChange}
              size={6}
            >
              <Option value="" label="Select Class" />
              {sortedAndFilteredClasses.map(cls => (
                <Option key={cls._id} value={cls._id} label={cls.name} />
              ))}
            </SelectField>

            <SelectField
              label="Section *"
              id="section"
              value={formData.section}
              onChange={(e) => handleChange({ target: { name: 'section', value: e.target.value } })}
              disabled={!formData.class}
              size={6}
            >
              <Option value="" label="Select Section" />
              {availableSections.map(sec => (
                <Option key={sec} value={sec} label={`Section ${sec}`} />
              ))}
            </SelectField>

            <DataField
              label="Roll Number"
              id="rollNumber"
              type="number"
              value={formData.rollNumber}
              onChange={(e) => handleChange({ target: { name: 'rollNumber', value: e.target.value } })}
              size={6}
            />

            <DataField
              label="Previous School Name"
              id="previousSchool"
              value={formData.previousSchool}
              onChange={(e) => handleChange({ target: { name: 'previousSchool', value: e.target.value } })}
              size={6}
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Address</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <DataField
              label="House No / Flat No *"
              id="houseNo"
              value={formData.houseNo}
              onChange={(e) => handleChange({ target: { name: 'houseNo', value: e.target.value } })}
              error={errors.houseNo}
              size={6}
              placeholder="e.g. Flat 101, building name"
            />
            <DataField
              label="Street / Area / Locality *"
              id="street"
              value={formData.street}
              onChange={(e) => handleChange({ target: { name: 'street', value: e.target.value } })}
              error={errors.street}
              size={6}
              placeholder="e.g. MG Road, Near Central Park"
            />
            <DataField
              label="City *"
              id="city"
              value={formData.city}
              onChange={(e) => handleChange({ target: { name: 'city', value: e.target.value } })}
              error={errors.city}
              size={4}
              placeholder="City"
            />
            <DataField
              label="State *"
              id="state"
              value={formData.state}
              onChange={(e) => handleChange({ target: { name: 'state', value: e.target.value } })}
              error={errors.state}
              size={4}
              placeholder="State"
            />
            <DataField
              label="Pincode *"
              id="pincode"
              type="number"
              max={6}
              value={formData.pincode}
              onChange={(e) => handleChange({ target: { name: 'pincode', value: e.target.value } })}
              error={errors.pincode}
              size={4}
              placeholder="6-digit Pincode"
            />
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Emergency Contact</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <DataField
              label="Guardian Contact *"
              id="guardianContact"
              type="number"
              max={10}
              value={formData.guardianContact}
              onChange={(e) => handleChange({ target: { name: 'guardianContact', value: e.target.value } })}
              error={errors.guardianContact}
              size={6}
            />

            <DataField
              label="Alternate Contact Number"
              id="alternateContact"
              type="number"
              max={10}
              value={formData.alternateContact}
              onChange={(e) => handleChange({ target: { name: 'alternateContact', value: e.target.value } })}
              error={errors.alternateContact}
              size={6}
            />
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider">Document Upload</h3>
            <div className="border-b border-[#E2E8F0] mt-3" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {ADMISSION_DOCUMENTS.map((doc) =>
              renderLandingStyleDocCard(doc.label, doc.key, doc.required)
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-12 gap-6 pb-8">
          <div className="col-span-12 sm:col-span-6">
            <Button
              text="Cancel"
              onClick={() => navigate('/admin/students/manage')}
              variant="secondary"
              size={12}
            />
          </div>
          <div className="col-span-12 sm:col-span-6">
            <Button
              text="Save & Next"
              type="submit"
              variant="primary"
              size={12}
              disabled={limitReached}
            />
          </div>
        </div>
      </form>
    );
  };

  // Step 2 Render
  const renderStep2 = () => {
    return (
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-6">
        <div>
          <h3 className="text-base font-bold text-[#223F74] uppercase tracking-wider font-sans">Admission Fee Details</h3>
          <div className="border-b border-[#E2E8F0] mt-3" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <FeeField
            label="Admission Fee *"
            id="admissionFee"
            value={feeData.admissionFee}
            onChange={(e) => handleFeeChange('admissionFee', e.target.value)}
            error={errors.admissionFee}
            size={6}
          />

          <FeeField
            label="Admission Discount"
            id="discount"
            value={feeData.discount}
            onChange={(e) => handleFeeChange('discount', e.target.value)}
            error={errors.discount}
            size={6}
          />

          <FeeField
            label="Scholarship Amount"
            id="scholarship"
            value={feeData.scholarship}
            onChange={(e) => handleFeeChange('scholarship', e.target.value)}
            error={errors.scholarship}
            size={6}
          />

          <FeeField
            label="Late Fee"
            id="lateFee"
            value={feeData.lateFee}
            onChange={(e) => handleFeeChange('lateFee', e.target.value)}
            error={errors.lateFee}
            size={6}
          />

          <FeeField
            label="Other Charges"
            id="otherCharges"
            value={feeData.otherCharges}
            onChange={(e) => handleFeeChange('otherCharges', e.target.value)}
            error={errors.otherCharges}
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
            label="Amount to be Pay *"
            id="amountPaid"
            value={feeData.amountPaid}
            onChange={(e) => handleFeeChange('amountPaid', e.target.value)}
            error={errors.amountPaid}
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

          <SelectField
            label="Payment Status"
            id="paymentStatus"
            value={feeData.paymentStatus}
            onChange={handlePaymentStatusChange}
            size={6}
            searchable={false}
          >
            <Option value="Paid" label="Paid" />
            <Option value="Unpaid" label="Unpaid" />
          </SelectField>

          <SelectField
            label="Payment Mode *"
            id="paymentMode"
            value={feeData.paymentMode}
            onChange={(e) => {
              setFeeData(prev => ({ ...prev, paymentMode: e.target.value, transactionId: '', chequeNumber: '', ddNumber: '' }));
              if (errors.paymentMode) setErrors(prev => ({ ...prev, paymentMode: '' }));
            }}
            size={6}
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

          {/* Conditional inputs */}
          {(feeData.paymentMode === 'UPI' || feeData.paymentMode === 'Card' || feeData.paymentMode === 'Bank Transfer') && (
            <DataField
              label="Transaction ID *"
              id="transactionId"
              value={feeData.transactionId}
              onChange={(e) => {
                setFeeData(prev => ({ ...prev, transactionId: e.target.value }));
                if (errors.transactionId) setErrors(prev => ({ ...prev, transactionId: '' }));
              }}
              error={errors.transactionId}
              size={6}
            />
          )}

          {feeData.paymentMode === 'Cheque' && (
            <DataField
              label="Cheque Number *"
              id="chequeNumber"
              value={feeData.chequeNumber}
              onChange={(e) => {
                setFeeData(prev => ({ ...prev, chequeNumber: e.target.value }));
                if (errors.chequeNumber) setErrors(prev => ({ ...prev, chequeNumber: '' }));
              }}
              error={errors.chequeNumber}
              size={6}
            />
          )}

          {feeData.paymentMode === 'Demand Draft' && (
            <DataField
              label="DD Number *"
              id="ddNumber"
              value={feeData.ddNumber}
              onChange={(e) => {
                setFeeData(prev => ({ ...prev, ddNumber: e.target.value }));
                if (errors.ddNumber) setErrors(prev => ({ ...prev, ddNumber: '' }));
              }}
              error={errors.ddNumber}
              size={6}
            />
          )}

          <DataField
            label="Receipt Number (Auto Generated)"
            id="receiptNumber"
            value={feeData.receiptNumber}
            disabled={true}
            readOnly={true}
            size={6}
          />

          <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
            <label htmlFor="paymentDate" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
              Payment Date
            </label>
            <input
              type="date"
              id="paymentDate"
              value={feeData.paymentDate}
              onChange={(e) => setFeeData(prev => ({ ...prev, paymentDate: e.target.value }))}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
            />
          </div>

          <DataField
            label="Collected By"
            id="collectedBy"
            value={getCurrentAdminName()}
            disabled={true}
            readOnly={true}
            size={6}
          />

          <DataField
            label="Remarks"
            id="remarks"
            type="textarea"
            value={feeData.remarks}
            onChange={(e) => setFeeData(prev => ({ ...prev, remarks: e.target.value }))}
            size={12}
            rows={2}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-6 pt-4">
          <div className="w-1/2">
            <Button
              text="Back"
              onClick={() => {
                setErrors({});
                setStep(1);
              }}
              variant="secondary"
              size={12}
            />
          </div>
          <div className="w-1/2">
            <Button
              text="Save & Next"
              onClick={handleStep2Submit}
              variant="primary"
              size={12}
              disabled={limitReached}
            />
          </div>
        </div>
      </div>
    );
  };

  // Step 3 Render
  const renderStep3 = () => {
    const selectedClassObj = sortedAndFilteredClasses.find(c => c._id === formData.class);
    const classNameStr = selectedClassObj ? selectedClassObj.name : formData.class;

    return (
      <div className="space-y-6">
        <div className="bg-[#F8FAFC] border border-blue-100 rounded-[24px] p-5 flex gap-3 items-center">
          <CheckCircle className="text-blue-600" size={24} />
          <div>
            <p className="text-blue-900 font-semibold">Please review the details below carefully before confirming the admission.</p>
          </div>
        </div>

        {/* 1. Student Information Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Student Information</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Full Name</p>
              <p className="font-semibold text-slate-800">{formData.fullName}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Date of Birth</p>
              <p className="font-semibold text-slate-800">{formData.dateOfBirth}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Gender</p>
              <p className="font-semibold text-slate-800">{formData.gender}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Blood Group</p>
              <p className="font-semibold text-slate-800">{formData.bloodGroup || 'N/A'}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Religion</p>
              <p className="font-semibold text-slate-800">{formData.religion || 'N/A'}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Category</p>
              <p className="font-semibold text-slate-800">{formData.category}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Student Aadhaar Number</p>
              <p className="font-semibold text-slate-800">{formData.aadharNumber}</p>
            </div>
          </div>
        </div>

        {/* 2. Parent Information Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Parent Information</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Father Name</p>
              <p className="font-semibold text-slate-800">{formData.fatherName}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Mother Name</p>
              <p className="font-semibold text-slate-800">{formData.motherName}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Parent Email</p>
              <p className="font-semibold text-slate-800">{formData.email}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Occupation</p>
              <p className="font-semibold text-slate-800">{formData.occupation || 'N/A'}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Annual Income</p>
              <p className="font-semibold text-slate-800">{formData.annualIncome || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* 3. Academic Information Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Academic Information</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Class & Section</p>
              <p className="font-semibold text-slate-800">{classNameStr} - Section {formData.section}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Admission Number</p>
              <p className="font-semibold text-slate-800">{formData.admissionNumber}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Admission Date</p>
              <p className="font-semibold text-slate-800">{formData.admissionDate}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Academic Year</p>
              <p className="font-semibold text-slate-800">{formData.academicYear}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Roll Number</p>
              <p className="font-semibold text-slate-800">{formData.rollNumber || 'NA'}</p>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Previous School</p>
              <p className="font-semibold text-slate-800">{formData.previousSchool || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* 4. Address & Emergency Contacts */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Address & Emergency Contact</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-12">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Home Address</p>
              <p className="font-semibold text-slate-800">{formData.homeAddress}</p>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Guardian Contact</p>
              <p className="font-semibold text-slate-800">{formData.guardianContact}</p>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Alternate Contact</p>
              <p className="font-semibold text-slate-800">{formData.alternateContact || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* 5. Documents Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Uploaded Documents</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            {ADMISSION_DOCUMENTS.map((doc) => {
              const file = files[doc.key];
              if (!file && !doc.required) return null;
              return (
                <div key={doc.key} className="col-span-12 sm:col-span-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">{doc.label}</p>
                  <p className="font-semibold text-emerald-600 truncate flex items-center gap-1.5">
                    <CheckCircle size={14} /> {file?.name || 'Uploaded'}
                  </p>
                </div>
              );
            })}
            {files.passportPhoto && (
              <div className="col-span-12 sm:col-span-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Passport Photo</p>
                <p className="font-semibold text-emerald-600 truncate flex items-center gap-1.5">
                  <CheckCircle size={14} /> {files.passportPhoto.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 6. Fee Details Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] space-y-4">
          <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider font-sans">Fee & Payment Summary</h4>
          <div className="border-b border-[#E2E8F0]" />
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Admission Fee</p>
              <p className="font-semibold text-slate-800">₹ {feeData.admissionFee}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Discount</p>
              <p className="font-semibold text-slate-800">₹ {feeData.discount || '0'}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Scholarship</p>
              <p className="font-semibold text-slate-800">₹ {feeData.scholarship || '0'}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Late Fee</p>
              <p className="font-semibold text-slate-800">₹ {feeData.lateFee || '0'}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Other Charges</p>
              <p className="font-semibold text-slate-800">₹ {feeData.otherCharges || '0'}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-[#223F74] text-xs font-bold uppercase tracking-wider">Total Payable</p>
              <p className="text-lg font-bold text-[#223F74]">₹ {totalPayable}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Amount Paid</p>
              <p className="text-lg font-bold text-emerald-700">₹ {feeData.amountPaid}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-rose-700 text-xs font-bold uppercase tracking-wider">Remaining Amount</p>
              <p className="text-lg font-bold text-rose-700">₹ {remainingAmount}</p>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Payment Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                feeData.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                feeData.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {feeData.paymentStatus}
              </span>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Payment Mode</p>
              <p className="font-semibold text-slate-800">{feeData.paymentMode}</p>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-sans">
                {feeData.paymentMode === 'Cheque' ? 'Cheque Number' :
                 feeData.paymentMode === 'Demand Draft' ? 'DD Number' : 'Transaction ID'}
              </p>
              <p className="font-semibold text-slate-800">
                {feeData.paymentMode === 'Cheque' ? feeData.chequeNumber :
                 feeData.paymentMode === 'Demand Draft' ? feeData.ddNumber :
                 feeData.transactionId || 'N/A'}
              </p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Receipt Number</p>
              <p className="font-semibold text-slate-800">{feeData.receiptNumber}</p>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Payment Date</p>
              <p className="font-semibold text-slate-800">{feeData.paymentDate}</p>
            </div>
            <div className="col-span-12">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Remarks</p>
              <p className="font-semibold text-slate-800">{feeData.remarks || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 pt-4">
          <div className="w-1/2">
            <Button
              text="Back"
              onClick={() => setStep(2)}
              variant="secondary"
              size={12}
            />
          </div>
          <div className="w-1/2">
            <Button
              text="Confirm Admission"
              onClick={handleSubmit}
              loading={isLoading}
              variant="primary"
              size={12}
              disabled={isLoading || limitReached}
            />
          </div>
        </div>
      </div>
    );
  };

  // Step 4 Render - Success Page
  const renderSuccessScreen = () => {
    return (
      <div className="bg-white p-8 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-center space-y-8 max-w-2xl mx-auto my-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={36} />
          </div>
          <h3 className="text-xl font-bold text-[#223F74] uppercase tracking-wider font-sans">Admission Completed Successfully</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Credentials and receipt details have been sent to the Parent.</p>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[24px] p-6 text-left space-y-4">
          <h4 className="text-xs font-bold text-[#223F74] uppercase tracking-wider font-sans">Confirmation Details</h4>
          <div className="grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Student Name</span>
              <span className="font-bold text-slate-800">{successDetails.studentName}</span>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Admission Number</span>
              <span className="font-bold text-slate-800">{successDetails.admissionNumber}</span>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Roll Number</span>
              <span className="font-bold text-slate-800">{successDetails.rollNumber}</span>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Parent Email</span>
              <span className="font-bold text-slate-800">{successDetails.parentEmail}</span>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Payment Status</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                successDetails.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                successDetails.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {successDetails.paymentStatus}
              </span>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <span className="text-slate-400 text-xs block">Receipt Number</span>
              <span className="font-bold text-slate-800">{successDetails.receiptNumber}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-4">
            <Button
              text="View Student"
              onClick={() => navigate(`/admin/students/manage/${successDetails.studentId}`)}
              variant="secondary"
              size={12}
            />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Button
              text="Download Receipt"
              onClick={handleDownloadReceipt}
              variant="primary"
              size={12}
            />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Button
              text="New Admission"
              onClick={resetFormToStep1}
              variant="ghost"
              size={12}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderSuccessScreen();
      default:
        return renderStep1();
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div ref={containerRef} className="w-full space-y-6 text-left pb-10">
      {/* Common Page Header */}
      <Heading 
        primaryText="New"
        secondaryText="Admission"
        showAnimations={true}
      />
      <p className="text-sm text-slate-500 font-medium -mt-2">
        Fill in the details below to register a new student directly.
      </p>

      {/* Stepper Wizard Indicator */}
      {step < 4 && renderStepIndicator()}

      {submitted && errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[24px] p-5 flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold mb-1">Please fix {errorCount} error{errorCount !== 1 ? 's' : ''} before proceeding:</p>
            <ul className="list-disc list-inside text-red-700 text-sm">
              {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        </div>
      )}

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-[24px] p-5 flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 font-semibold">{apiError}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-[24px] p-5 flex gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 font-semibold">{successMessage}</p>
        </div>
      )}

      {renderStepContent()}
    </div>
  );
};

export default NewAdmission;