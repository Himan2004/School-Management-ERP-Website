import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Upload,
  X,
  Check,
  Edit2,
  User,
  Users,
  FileText,
  Plus,
  Trash2,
  MapPin,
  Smartphone,
  ShieldCheck,
  Bus,
  HeartPulse,
  School,
  Bell,
  ClipboardList,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { getOrganizationAddress, getAllOrganizations, getBranchesByOrganization, submitAdmissionApplication, getClassesByOrganization } from "../../services/api/schoolApi";
import { useNavigate } from "react-router-dom";
import { ADMISSION_DOCUMENTS } from "../../config/documentConfig";
import { getDynamicAcademicYear } from "../../utils/academicYear";
import { sortGrades } from "../../utils/gradeSorter";
import { FaCheckCircle, FaArrowLeft, FaArrowRight } from "react-icons/fa";

const steps = ["Institution", "Student", "Parent", "Address & Docs", "Review"];

const AdmissionPortal = ({ isEmbedded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  const labelCls = "block text-sm font-bold text-slate-700 mb-1.5 ml-1";
  const inputCls = (hasError) => 
    `w-full pl-5 pr-10 py-4 bg-white border rounded-xl focus:outline-none transition-all text-sm leading-normal font-semibold text-slate-800 disabled:opacity-100 disabled:bg-slate-50 disabled:text-slate-500 ${
      hasError ? "border-red-400 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] placeholder-slate-500"
    }`;

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [orgData, setOrgData] = useState({
    organizationId: "",   // ← add this
    organizationName: "",
    branchId: "",         // ← add this
    branchName: "",
  });

  const fetchClasses = async (orgId, selectedBranch) => {
    if (!selectedBranch) {
      setClasses([]);
      return;
    }
    setLoadingClasses(true);
    setClasses([]);
    try {
      const response = await getClassesByOrganization(orgId);
      const rawClasses = response?.data || [];
      const gradesString = selectedBranch?.gradesOffered || "";
      const allocatedGrades = gradesString.split(",").map(g => g.trim().toLowerCase()).filter(Boolean);
      
      const filtered = rawClasses.filter(c => {
        const className = (c.name || "").trim().toLowerCase();
        if (allocatedGrades.includes(className)) return true;
        const classNum = className.replace(/\D/g, "");
        if (classNum && allocatedGrades.includes(classNum)) return true;
        return false;
      });

      const sorted = sortGrades(filtered, (c) => c.name);
      setClasses(sorted);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const [organizations, setOrganizations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [derivedAddress, setDerivedAddress] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [parentData, setParentData] = useState({
    fullName: "",
    email: "",
    primaryContact: "",
    alternateContact: "",
    fatherName: "",
    motherName: "",
    relation: "",
    gender: null,
    address: { street: "", city: "", state: "", pincode: "" },
    aadharNumber: "",
    notifications: { sms: false, email: false, push: false },
  });

  const [students, setStudents] = useState([
    {
      id: Date.now().toString(),
      fullName: "",
      gender: null,
      dob: "",
      bloodGroup: "",
      class: "",
      classId: "",
      section: "",
      academicYear: getDynamicAcademicYear(),
      rollNumber: "",
      enrollmentNumber: "PENDING",
      admissionDate: new Date().toISOString().split("T")[0],
      transportRequired: "No",
      busRoute: "",
      healthNotes: "",
      previousSchool: "",
      tcNumber: "",
      tcDate: "",
      photoPreview: null,
      photoFile: null,
      documents: ADMISSION_DOCUMENTS.reduce((acc, doc) => {
        acc[doc.key] = null;
        return acc;
      }, {}),
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isAgreed, setIsAgreed] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Show toast notification
  const showToast = (message, type = "error") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch organizations on component mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await getAllOrganizations();
      const orgs = response?.data?.organizations;
      setOrganizations(orgs);

    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchBranches = async (orgName) => {
    setLoadingBranches(true);
    setBranches([]);
    setDerivedAddress('');
    try {
      const response = await getBranchesByOrganization(orgName);
      setBranches(response?.data?.branches || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
      showToast("Unable to fetch branches. Please try again.", "error");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchAddress = async (orgId, branchId) => {
    try {
      const response = await getOrganizationAddress(orgId, branchId);
      setDerivedAddress(response.data?.address || 'Address not available');
    } catch (error) {
      console.error('Error fetching address:', error);
      setDerivedAddress('Address not available');
    }
  };

  // Validation Functions
  const validateEmail = (email) => {
    const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
  };

  const validateAadhar = (aadhar) => {
    if (!aadhar) return true;
    const re = /^[0-9]{12}$/;
    return re.test(aadhar);
  };

  const validatePincode = (pincode) => {
    const re = /^[0-9]{6}$/;
    return re.test(pincode);
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!orgData.organizationName) newErrors.organizationName = "Organization is required";
    if (!orgData.branchName) newErrors.branchName = "Branch is required";
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const validateStudentInfo = () => {
    const newErrors = {};
    let hasError = false;
    students.forEach((student, idx) => {
      if (!student.fullName || !student.fullName.trim()) {
        newErrors[`student_${idx}_name`] = "Full Name is required";
        hasError = true;
      }
      if (!student.dob) {
        newErrors[`student_${idx}_dob`] = "Date of Birth is required";
        hasError = true;
      }
      if (!student.gender) {
        newErrors[`student_${idx}_gender`] = "Gender is required";
        hasError = true;
      }
      if (!student.classId) {
        newErrors[`student_${idx}_class`] = "Class is required";
        hasError = true;
      }
    });
    setErrors(newErrors);
    if (hasError) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const validateParentInfo = () => {
    const newErrors = {};
    if (!parentData.fullName || !parentData.fullName.trim()) {
      newErrors.fullName = "Parent Full Name is required";
    }
    if (!parentData.email || !parentData.email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentData.email)) {
      newErrors.email = "Enter a valid email";
    }
    if (!parentData.primaryContact || !parentData.primaryContact.trim()) {
      newErrors.primaryContact = "Contact Number is required";
    } else if (!/^\d{10}$/.test(parentData.primaryContact)) {
      newErrors.primaryContact = "Must be 10 digits";
    }
    if (parentData.alternateContact && !/^\d{10}$/.test(parentData.alternateContact)) {
      newErrors.alternateContact = "Must be 10 digits";
    }
    if (!parentData.relation) {
      newErrors.relation = "Relation is required";
    }
    if (parentData.aadharNumber) {
      if (!/^\d{12}$/.test(parentData.aadharNumber)) {
        newErrors.aadharNumber = "Aadhaar Number must be exactly 12 digits.";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const validateAddressAndDocs = () => {
    const newErrors = {};
    let hasError = false;
    if (!parentData.address.city || !parentData.address.city.trim()) {
      newErrors.city = "City is required";
      hasError = true;
    }
    if (!parentData.address.state || !parentData.address.state.trim()) {
      newErrors.state = "State is required";
      hasError = true;
    }
    if (!parentData.address.pincode || !parentData.address.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
      hasError = true;
    } else if (!/^\d{6}$/.test(parentData.address.pincode.trim())) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
      hasError = true;
    }
    students.forEach((student, idx) => {
      if (!student.photoFile && !student.photoPreview) {
        newErrors[`student_${idx}_photo`] = "Passport Photo is required";
        hasError = true;
      }
      ADMISSION_DOCUMENTS.forEach(doc => {
        if (doc.required && !student.documents[doc.key]) {
          newErrors[`student_${idx}_doc_${doc.key}`] = `${doc.label} is required`;
          hasError = true;
        }
      });
    });
    setErrors(newErrors);
    if (hasError) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) return validateStep1();
    if (stepIndex === 1) return validateStudentInfo();
    if (stepIndex === 2) return validateParentInfo();
    if (stepIndex === 3) return validateAddressAndDocs();
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setTouched({});
      setCurrentStep((s) => s + 1);
      const scrollable = document.querySelector(".register-content") || document.querySelector(".w-full.flex-grow");
      if (scrollable) scrollable.scrollTop = 0;
    }
  };

  const handlePrev = () => {
    setErrors({});
    setTouched({});
    setCurrentStep((s) => s - 1);
    const scrollable = document.querySelector(".register-content") || document.querySelector(".w-full.flex-grow");
    if (scrollable) scrollable.scrollTop = 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!parentData.fullName || !parentData.fullName.trim()) {
      newErrors.fullName = "Parent Full Name is required";
    }
    
    if (!parentData.email || !parentData.email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentData.email)) {
      newErrors.email = "Enter a valid email";
    }
    
    if (!parentData.primaryContact || !parentData.primaryContact.trim()) {
      newErrors.primaryContact = "Contact Number is required";
    } else if (!/^\d{10}$/.test(parentData.primaryContact)) {
      newErrors.primaryContact = "Must be 10 digits";
    }
    
    if (parentData.alternateContact && !/^\d{10}$/.test(parentData.alternateContact)) {
      newErrors.alternateContact = "Must be 10 digits";
    }
    
    if (!parentData.relation) {
      newErrors.relation = "Relation is required";
    }
    if (!parentData.address.city || !parentData.address.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!parentData.address.state || !parentData.address.state.trim()) {
      newErrors.state = "State is required";
    }
    
    if (!parentData.address.pincode || !parentData.address.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(parentData.address.pincode.trim())) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
    }
    
    if (parentData.aadharNumber) {
      if (!/^\d{12}$/.test(parentData.aadharNumber)) {
        newErrors.aadharNumber = "Aadhaar Number must be exactly 12 digits.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const newErrors = {};
    let hasError = false;

    students.forEach((student, idx) => {
      if (!student.fullName || !student.fullName.trim()) {
        newErrors[`student_${idx}_name`] = "Full Name is required";
        hasError = true;
      }
      if (!student.dob) {
        newErrors[`student_${idx}_dob`] = "Date of Birth is required";
        hasError = true;
      }
      if (!student.gender) {
        newErrors[`student_${idx}_gender`] = "Gender is required";
        hasError = true;
      }
      if (!student.classId) {
        newErrors[`student_${idx}_class`] = "Class is required";
        hasError = true;
      }

      if (!student.photoFile && !student.photoPreview) {
        newErrors[`student_${idx}_photo`] = "Passport Photo is required";
        hasError = true;
      }

      ADMISSION_DOCUMENTS.forEach(doc => {
        if (doc.required && !student.documents[doc.key]) {
          newErrors[`student_${idx}_doc_${doc.key}`] = `${doc.label} is required`;
          hasError = true;
        }
      });
    });

    setErrors(newErrors);

    if (hasError) {
      showToast("Please fill all the inputs correctly", "error");
      return false;
    }
    return true;
  };

  const handleParentChange = (e) => {
    const { name, value, checked } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    let finalValue = value;
    if (name === 'aadharNumber') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 12);
    } else if (name === 'address.pincode') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 6);
    } else if (name === 'primaryContact' || name === 'alternateContact') {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      finalValue = digitsOnly.slice(0, 10);
    }

    if (name.startsWith("notifications.")) {
      const key = name.split(".")[1];
      setParentData((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: checked },
      }));
    } else if (name.includes(".")) {
      const [obj, key] = name.split(".");
      setParentData((prev) => ({
        ...prev,
        [obj]: { ...prev[obj], [key]: finalValue },
      }));
    } else {
      setParentData((prev) => ({ ...prev, [name]: finalValue }));
    }

    const errKey = name === 'address.pincode' ? 'pincode' : name;
    if (errors[errKey]) {
      setErrors(prev => ({ ...prev, [errKey]: "" }));
    }
  };

  const updateStudent = (id, field, value) => {
    setStudents((prev) => {
      const idx = prev.findIndex(s => s.id === id);
      
      let finalValue = value;
      if (field === 'rollNumber') {
        finalValue = value.replace(/[^0-9]/g, "");
      }
      
      let errField = field;
      if (field === 'fullName') errField = 'name';
      else if (field === 'classId') errField = 'class';
      
      const errorKey = `student_${idx}_${errField}`;
      if (errors[errorKey]) {
        setErrors(p => ({ ...p, [errorKey]: "" }));
      }
      return prev.map((s) => (s.id === id ? { ...s, [field]: finalValue } : s));
    });
  };

  const handleFileUpload = (studentId, docType, file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      showToast("Invalid file type. Please upload JPEG, PNG, or PDF files only.", "error");
      return;
    }

    if (file.size > maxSize) {
      showToast("File size too large. Maximum size is 5MB.", "error");
      return;
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          if (docType === "photo") {
            return { ...s, photoPreview: URL.createObjectURL(file), photoFile: file };
          }
          return { ...s, documents: { ...s.documents, [docType]: file } };
        }
        return s;
      }),
    );

    const studentIndex = students.findIndex(s => s.id === studentId);
    const errorKey = `student_${studentIndex}_doc_${docType}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: "" }));
    }

    showToast(`${docType === "photo" ? "Photo" : docType} uploaded successfully!`, "success");
  };

  const addStudent = (e) => {
    if (e) e.preventDefault();
    setStudents(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        fullName: "",
        gender: null,
        dob: "",
        bloodGroup: "",
        class: "",
        classId: "",
        section: "",
        academicYear: getDynamicAcademicYear(),
        rollNumber: "",
        enrollmentNumber: "PENDING",
        admissionDate: new Date().toISOString().split("T")[0],
        transportRequired: "No",
        busRoute: "",
        healthNotes: "",
        previousSchool: "",
        tcNumber: "",
        tcDate: "",
        photoPreview: null,
        photoFile: null,
        documents: ADMISSION_DOCUMENTS.reduce((acc, doc) => {
          acc[doc.key] = null;
          return acc;
        }, {}),
      },
    ]);
  };

  const removeStudent = (id) => {
    if (students.length > 1) setStudents(students.filter((s) => s.id !== id));
  };



  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    console.log("[Admission] Form submission start");

    if (!isAgreed) {
      console.warn("[Admission] Validation failure: declaration not accepted");
      showToast("Please accept the admission declaration", "error");
      return;
    }

    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
      showToast("Please complete all sections correctly before submitting", "error");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();

    formData.append('organizationId', orgData.organizationId);   // ← _id
    formData.append('branchId', orgData.branchId);               // ← _id
    formData.append('declarationAccepted', isAgreed);
    formData.append('organizationAddress', derivedAddress);

    formData.append('parentFullName', parentData.fullName);
    formData.append('parentEmail', parentData.email);
    formData.append('parentPhone', parentData.primaryContact);
    formData.append('parentAlternatePhone', parentData.alternateContact || '');
    formData.append('parentRelation', parentData.relation);
    formData.append('parentAddress', JSON.stringify(parentData.address));
    formData.append('parentAadhar', parentData.aadharNumber || '');
    formData.append('parentNotifications', JSON.stringify(parentData.notifications));

    formData.append('totalStudents', students.length);

    students.forEach((student, index) => {
      formData.append(`students[${index}][fullName]`, student.fullName);
      formData.append(`students[${index}][dob]`, student.dob);
      formData.append(`students[${index}][bloodGroup]`, student.bloodGroup);
      formData.append(`students[${index}][rollNumber]`, student.rollNumber);
      formData.append(`students[${index}][academicYear]`, student.academicYear);
      formData.append(`students[${index}][transportRequired]`, student.transportRequired);
      formData.append(`students[${index}][busRoute]`, student.busRoute);
      formData.append(`students[${index}][healthNotes]`, student.healthNotes);
      formData.append(`students[${index}][previousSchool]`, student.previousSchool);
      formData.append(`students[${index}][gender]`, student.gender ?? "");
      formData.append(`students[${index}][classId]`, student.classId || "");  // ← add

      if (student.photoFile) {
        formData.append(`students[${index}][photo]`, student.photoFile);
      }

      ADMISSION_DOCUMENTS.forEach(doc => {
        if (student.documents[doc.key]) {
          formData.append(`students[${index}][documents][${doc.uploadKey}]`, student.documents[doc.key]);
        }
      });
    });

    const payloadSummary = {
      organizationId: orgData.organizationId,
      branchId: orgData.branchId,
      parentFullName: parentData.fullName,
      parentEmail: parentData.email,
      totalStudents: students.length,
      students: students.map(s => ({
        fullName: s.fullName,
        classId: s.classId,
        academicYear: s.academicYear
      }))
    };
    console.log("[Admission] Payload being submitted:", payloadSummary);
    console.log("[Admission] API request start: /school/submit-admission");

    try {
      const response = await submitAdmissionApplication(formData);
      console.log("[Admission] API response success:", response);
      setIsLoading(false);
      setShowSuccessModal(true);
      setSuccessMessage(`Admission Application Successfully Processed! Application ID: ${response.applicationId}`);
    } catch (error) {
      console.error("[Admission] API response failure:", error);
      setIsLoading(false);
      showToast(error.message || "Error submitting application. Please try again.", "error");
    }
  };

  return (
    <div className={isEmbedded ? "w-full flex-grow flex flex-col" : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg animate-slideIn ${toastMessage.type === "error" ? "bg-red-500 text-white" : toastMessage.type === "success" ? "bg-green-500 text-white" : "bg-blue-500 text-white"
          }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Decorative Background */}
      {!isEmbedded && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/10 via-transparent to-indigo-100/10 rounded-full blur-3xl"></div>
        </div>
      )}

      <div className={isEmbedded ? "w-full flex-grow flex flex-col" : "relative z-10 max-w-5xl mx-auto p-4 md:p-6 lg:p-10 space-y-10"}>


        {/* Header Section */}
        {!isEmbedded && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full mb-4">
              <Sparkles size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Welcome to Graphura</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Student Admission Portal
            </h1>
            <p className="text-gray-500 mt-2">Complete the form to enroll your ward</p>
          </div>
        )}
        
        {isEmbedded && (
          <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Student Admission
              </h2>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                Enroll your ward into Graphura
              </p>
            </div>
          </div>
        )}

        {/* STEPPERS */}
        <div className="flex items-center justify-between mb-[40px] relative px-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#ffece8] -translate-y-1/2 z-0"></div>
          {steps.map((stepName, idx) => (
            <div key={idx} className="flex flex-col items-center z-10">
              <div
                onClick={() => {
                  if (idx < currentStep) {
                    setCurrentStep(idx);
                  }
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2 ${
                  idx === currentStep
                    ? "bg-[#fc9d8b] text-white border-[#fc9d8b] shadow-lg shadow-orange-500/20"
                    : idx < currentStep
                    ? "bg-[#fc9d8b] text-white border-[#fc9d8b] cursor-pointer"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {idx < currentStep ? <FaCheckCircle size={14} /> : idx + 1}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider mt-2 hidden sm:block ${idx <= currentStep ? "text-[#fc9d8b]" : "text-slate-400"}`}>
                {stepName}
              </span>
            </div>
          ))}
        </div>



      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Step 1: Institution Selection */}
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <Building2 size={16} />
              </span>
              Institution Selection
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Dropdown */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Organization <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputCls(errors.organizationName && touched.organizationName)}
                    value={orgData.organizationName}
                    onChange={async (e) => {
                      const selectedName = e.target.value;
                      const selectedOrg = organizations.find(o => o.organizationName === selectedName);

                      setOrgData({
                        organizationName: selectedName,
                        organizationId: selectedOrg?._id || "",
                        branchName: "",
                        branchId: ""
                      });
                      setTouched(prev => ({ ...prev, organizationName: true }));
                      if (errors.organizationName) setErrors(prev => ({ ...prev, organizationName: "" }));
                      setBranches([]);
                      setDerivedAddress("");
                      setClasses([]);
                      setStudents(prev => prev.map(s => ({ ...s, class: "", classId: "" })));

                      if (selectedOrg?._id) {
                        await fetchBranches(selectedOrg._id);
                      }
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, organizationName: true }))}
                    disabled={loadingOrgs}
                  >
                    <option value="">{loadingOrgs ? "Loading organizations..." : "Select Organization"}</option>
                    {organizations?.map((org) => (
                      <option key={org._id} value={org.organizationName}>
                        {org.organizationName}
                      </option>
                    ))}
                  </select>
                  {errors.organizationName && touched.organizationName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.organizationName}
                    </p>
                  )}
                </div>

                {/* Branch Dropdown */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputCls(errors.branchName && touched.branchName)}
                    value={orgData.branchName}
                    onChange={async (e) => {
                      const selectedName = e.target.value;
                      const selectedBranch = branches.find(b => b.schoolName === selectedName);

                      setOrgData(prev => ({
                        ...prev,
                        branchName: selectedName,
                        branchId: selectedBranch?._id || ""
                      }));
                      setTouched(prev => ({ ...prev, branchName: true }));
                      if (errors.branchName) setErrors(prev => ({ ...prev, branchName: "" }));

                      setClasses([]);
                      setStudents(prev => prev.map(s => ({ ...s, class: "", classId: "" })));

                      if (selectedBranch?._id && orgData.organizationId) {
                        await fetchAddress(orgData.organizationId, selectedBranch._id);
                        await fetchClasses(orgData.organizationId, selectedBranch);
                      }
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, branchName: true }))}
                    disabled={!orgData.organizationName || loadingBranches}
                  >
                    <option value="">
                      {!orgData.organizationName
                        ? "Select organization first"
                        : loadingBranches
                          ? "Loading branches..."
                          : "Select Branch"}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch.schoolName}>
                        {branch.schoolName}
                      </option>
                    ))}
                  </select>
                  {errors.branchName && touched.branchName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.branchName}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Display */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl border border-orange-100 flex gap-3 items-start shadow-sm">
                <MapPin size={18} className="text-[#fc9d8b] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">Institution Address</p>
                  <p className="text-sm text-slate-700">
                    {derivedAddress || (orgData.organizationName && orgData.branchName
                      ? "Loading address..."
                      : "Select organization and branch to view address")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Student Information */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-left animate-in fade-in duration-200"
          >
            <div className="space-y-12">
              {students.map((student, idx) => (
                <div key={student.id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/20 relative">
                  <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                        <Users size={16} />
                      </span>
                      Student Profile #{idx + 1}
                    </h3>
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStudent(student.id)}
                        className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-full transition-all duration-300 flex items-center justify-center border border-transparent hover:border-red-600"
                        title="Remove Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Student Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={student.fullName}
                        onChange={(e) => updateStudent(student.id, "fullName", e.target.value)}
                        className={inputCls(errors[`student_${idx}_name`])}
                        placeholder="Enter student's full name"
                      />
                      {errors[`student_${idx}_name`] && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors[`student_${idx}_name`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={student.dob}
                        onChange={(e) => updateStudent(student.id, "dob", e.target.value)}
                        className={inputCls(errors[`student_${idx}_dob`])}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {errors[`student_${idx}_dob`] && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors[`student_${idx}_dob`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={student.gender || ""}
                        onChange={(e) =>
                          updateStudent(
                            student.id,
                            "gender",
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                        className={inputCls(errors[`student_${idx}_gender`])}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors[`student_${idx}_gender`] && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors[`student_${idx}_gender`]}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Admission Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={student.classId || ""}
                        onChange={(e) => {
                          const selectedClass = classes.find(c => c._id === e.target.value);
                          updateStudent(student.id, "class", selectedClass?.name || "");
                          updateStudent(student.id, "classId", selectedClass?._id || "");
                        }}
                        className={inputCls(errors[`student_${idx}_class`])}
                        disabled={!orgData.branchName || loadingClasses}
                      >
                        <option value="">
                          {!orgData.branchName
                            ? "First select a school"
                            : loadingClasses
                              ? "Loading classes..."
                              : classes.length === 0
                                ? "No classes available"
                                : "Select Class"}
                        </option>
                        {classes.map((cls) => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      {errors[`student_${idx}_class`] && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors[`student_${idx}_class`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Blood Group</label>
                      <input
                        value={student.bloodGroup}
                        onChange={(e) => updateStudent(student.id, "bloodGroup", e.target.value)}
                        className={inputCls(false)}
                        placeholder="e.g. O+ve"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Roll Number (Optional)</label>
                      <input
                        placeholder="e.g. 42"
                        value={student.rollNumber}
                        onChange={(e) => updateStudent(student.id, "rollNumber", e.target.value)}
                        className={inputCls(false)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Previous School Name</label>
                      <input
                        placeholder="e.g. Global International School"
                        value={student.previousSchool}
                        onChange={(e) => updateStudent(student.id, "previousSchool", e.target.value)}
                        className={inputCls(false)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Transport Required</label>
                      <select
                        value={student.transportRequired}
                        onChange={(e) => updateStudent(student.id, "transportRequired", e.target.value)}
                        className={inputCls(false)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {student.transportRequired === "Yes" && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Specify Bus Route</label>
                        <input
                          placeholder="e.g. Route 4A - Downtown"
                          value={student.busRoute}
                          onChange={(e) => updateStudent(student.id, "busRoute", e.target.value)}
                          className={inputCls(false)}
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Medical Conditions / Health Notes</label>
                      <textarea
                        placeholder="e.g. Asthma, Peanut Allergy"
                        value={student.healthNotes}
                        onChange={(e) => updateStudent(student.id, "healthNotes", e.target.value)}
                        rows="2"
                        className={inputCls(false)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addStudent}
                className="w-full py-5 border-2 border-dashed border-orange-300 text-[#fc9d8b] font-bold rounded-xl hover:bg-orange-50/50 transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm"
              >
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                Add Another Student Profile
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Parent / Guardian Information */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <User size={16} />
              </span>
              Parent Basic Information
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Parent Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={parentData.fullName}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                    className={inputCls(errors.fullName && touched.fullName)}
                    placeholder="Enter parent's full name"
                  />
                  {errors.fullName && touched.fullName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={parentData.email}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    className={inputCls(errors.email && touched.email)}
                    placeholder="parent@example.com"
                  />
                  {errors.email && touched.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <Mail size={12} /> {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Primary Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="primaryContact"
                    value={parentData.primaryContact}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, primaryContact: true }))}
                    className={inputCls(errors.primaryContact && touched.primaryContact)}
                    placeholder="10-digit mobile number"
                  />
                  {errors.primaryContact && touched.primaryContact && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <Phone size={12} /> {errors.primaryContact}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Alternate Contact
                  </label>
                  <input
                    type="tel"
                    name="alternateContact"
                    value={parentData.alternateContact}
                    onChange={handleParentChange}
                    className="w-full p-4 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] text-sm font-semibold text-slate-800"
                    placeholder="Optional alternate number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Relation <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="relation"
                    value={parentData.relation}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, relation: true }))}
                    className={inputCls(errors.relation && touched.relation)}
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                  {errors.relation && touched.relation && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.relation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Aadhar Card Number</label>
                  <input
                    placeholder="e.g. 1234 5678 9012"
                    name="aadharNumber"
                    value={parentData.aadharNumber}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, aadharNumber: true }))}
                    className={inputCls(errors.aadharNumber && touched.aadharNumber)}
                  />
                  {errors.aadharNumber && touched.aadharNumber && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.aadharNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Address & Documents */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-left animate-in fade-in duration-200"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                  <MapPin size={16} />
                </span>
                Address Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Street Address</label>
                  <input
                    placeholder="e.g. 123 Main St, Apt 4B"
                    name="address.street"
                    value={parentData.address.street}
                    onChange={handleParentChange}
                    className="w-full p-4 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] text-sm font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">City <span className="text-red-500">*</span></label>
                  <input
                    placeholder="e.g. Mumbai"
                    name="address.city"
                    value={parentData.address.city}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                    className={inputCls(errors.city && touched.city)}
                  />
                  {errors.city && touched.city && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">State <span className="text-red-500">*</span></label>
                  <input
                    placeholder="e.g. Maharashtra"
                    name="address.state"
                    value={parentData.address.state}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, state: true }))}
                    className={inputCls(errors.state && touched.state)}
                  />
                  {errors.state && touched.state && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.state}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Pincode <span className="text-red-500">*</span></label>
                  <input
                    placeholder="e.g. 400001"
                    name="address.pincode"
                    value={parentData.address.pincode}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, pincode: true }))}
                    className={inputCls(errors.pincode && touched.pincode)}
                  />
                  {errors.pincode && touched.pincode && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.pincode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                  <FileText size={16} />
                </span>
                Document Uploads
              </h3>

              <div className="space-y-12">
                {students.map((student, idx) => (
                  <div key={student.id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/20">
                    <h4 className="font-bold text-slate-700 mb-6 text-sm uppercase tracking-wider">
                      Uploads for {student.fullName || `Student #${idx + 1}`}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Photo Upload */}
                      <div className="md:col-span-1 flex flex-col items-center">
                        <div className={`w-32 h-40 bg-white border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative group transition-all cursor-pointer ${
                          errors[`student_${idx}_photo`] ? "border-red-500 bg-red-50" : "border-slate-300 hover:border-orange-400"
                        }`}>
                          {student.photoPreview ? (
                            <img src={student.photoPreview} className="w-full h-full object-cover" alt="Student" />
                          ) : (
                            <Upload className="text-gray-400 group-hover:text-[#fc9d8b] transition" size={32} />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(student.id, "photo", e.target.files[0])}
                          />
                        </div>
                        <p className="text-[10px] font-bold mt-2 uppercase text-center">
                          <span className={errors[`student_${idx}_photo`] ? "text-red-500" : "text-gray-450"}>
                            Passport Photo {!student.photoFile && !student.photoPreview && <span className="text-red-500">*</span>}
                          </span>
                        </p>
                        {errors[`student_${idx}_photo`] && (
                          <p className="text-xs text-red-500 mt-1 text-center font-semibold">{errors[`student_${idx}_photo`]}</p>
                        )}
                      </div>

                      {/* Documents Grid */}
                      <div className="md:col-span-3">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {ADMISSION_DOCUMENTS.map((doc) => {
                            const isUploaded = !!student.documents[doc.key];
                            const hasError = errors[`student_${idx}_doc_${doc.key}`];
                            return (
                              <div key={doc.key} className="relative group">
                                <label
                                  className={`block p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 h-full ${
                                    isUploaded
                                      ? "border-green-500 bg-green-50/50 hover:bg-green-100/50"
                                      : hasError
                                        ? "border-red-500 bg-red-50 hover:bg-red-100"
                                        : "border-slate-300 hover:border-orange-400 hover:bg-orange-50/20"
                                  }`}
                                >
                                  <Upload
                                    size={20}
                                    className={`mx-auto mb-2 transition-all group-hover:scale-110 ${
                                      isUploaded ? "text-green-600" : hasError ? "text-red-500" : "text-gray-400 group-hover:text-[#fc9d8b]"
                                    }`}
                                  />
                                  <p className="text-[10px] font-bold uppercase truncate text-slate-700">
                                    {isUploaded ? student.documents[doc.key]?.name || doc.label : doc.label}
                                  </p>
                                  {doc.required && !isUploaded && <span className="text-red-500 text-[8px] block">* Required</span>}
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(student.id, doc.key, e.target.files[0])}
                                  />
                                </label>
                                {isUploaded && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setStudents((prev) =>
                                        prev.map((s) => {
                                          if (s.id === student.id) {
                                            return { ...s, documents: { ...s.documents, [doc.key]: null } };
                                          }
                                          return s;
                                        })
                                      );
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-md z-10"
                                    title="Remove document"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {Object.keys(errors).some(key => key.includes(`student_${idx}_doc_`)) && (
                          <p className="text-xs text-red-500 mt-2 text-center font-semibold">Please upload all required documents</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 5: Review & Confirm */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <Check size={16} />
              </span>
              Review & Confirm Admission Application
            </h3>

            <div className="space-y-6">
              {/* Institution Selection Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Institution Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 font-medium">Organization:</span> <span className="font-bold text-slate-800">{orgData.organizationName}</span></div>
                  <div><span className="text-slate-500 font-medium">Branch Name:</span> <span className="font-bold text-slate-800">{orgData.branchName}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 font-medium">Address:</span> <span className="font-bold text-slate-800">{derivedAddress || "N/A"}</span></div>
                </div>
              </div>

              {/* Parent Information Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Parent / Guardian Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 font-medium">Full Name:</span> <span className="font-bold text-slate-800">{parentData.fullName}</span></div>
                  <div><span className="text-slate-500 font-medium">Email Address:</span> <span className="font-bold text-slate-800">{parentData.email}</span></div>
                  <div><span className="text-slate-500 font-medium">Primary Contact:</span> <span className="font-bold text-slate-800">{parentData.primaryContact}</span></div>
                  <div><span className="text-slate-500 font-medium">Alternate Contact:</span> <span className="font-bold text-slate-800">{parentData.alternateContact || "N/A"}</span></div>
                  <div><span className="text-slate-500 font-medium">Relation:</span> <span className="font-bold text-slate-800">{parentData.relation}</span></div>
                  <div><span className="text-slate-500 font-medium">Aadhar Card:</span> <span className="font-bold text-slate-800">{parentData.aadharNumber || "N/A"}</span></div>
                </div>
              </div>

              {/* Address Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Permanent / Guardian Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="md:col-span-2"><span className="text-slate-500 font-medium">Street Address:</span> <span className="font-bold text-slate-800">{parentData.address.street || "N/A"}</span></div>
                  <div><span className="text-slate-500 font-medium">City:</span> <span className="font-bold text-slate-800">{parentData.address.city}</span></div>
                  <div><span className="text-slate-500 font-medium">State:</span> <span className="font-bold text-slate-800">{parentData.address.state}</span></div>
                  <div><span className="text-slate-500 font-medium">Pincode:</span> <span className="font-bold text-slate-800">{parentData.address.pincode}</span></div>
                </div>
              </div>

              {/* Student Profiles Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-8">
                <h4 className="font-bold text-slate-800 border-b pb-2 text-sm uppercase tracking-wide">Student Profiles</h4>
                {students.map((student, idx) => (
                  <div key={student.id} className="border-b border-slate-200 last:border-0 pb-6 last:pb-0">
                    <div className="flex gap-6 items-start">
                      {student.photoPreview && (
                        <img src={student.photoPreview} className="w-20 h-24 object-cover rounded-xl shadow-sm border border-slate-200" alt="Student Preview" />
                      )}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="md:col-span-2 font-bold text-[#fc9d8b]">Student #{idx + 1}: {student.fullName || "Unnamed"}</div>
                        <div><span className="text-slate-500 font-medium">Date of Birth:</span> <span className="font-bold text-slate-800">{student.dob}</span></div>
                        <div><span className="text-slate-500 font-medium">Gender:</span> <span className="font-bold text-slate-800">{student.gender || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Admission Class:</span> <span className="font-bold text-slate-800">{student.class || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Blood Group:</span> <span className="font-bold text-slate-800">{student.bloodGroup || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Roll Number:</span> <span className="font-bold text-slate-800">{student.rollNumber || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Academic Session:</span> <span className="font-bold text-slate-800">{student.academicYear || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Previous School:</span> <span className="font-bold text-slate-800">{student.previousSchool || "N/A"}</span></div>
                        <div><span className="text-slate-500 font-medium">Transport Required:</span> <span className="font-bold text-slate-800">{student.transportRequired} {student.transportRequired === "Yes" && `(${student.busRoute})`}</span></div>
                        <div className="md:col-span-2"><span className="text-slate-500 font-medium">Health Notes:</span> <span className="font-bold text-slate-800">{student.healthNotes || "None"}</span></div>
                        
                        <div className="md:col-span-2 mt-2">
                          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-1">Attached Documents</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {ADMISSION_DOCUMENTS.map(doc => (
                              <div key={doc.key}>
                                <span className="text-slate-500 font-medium">{doc.label}:</span>{" "}
                                <span className={student.documents[doc.key] ? "font-bold text-green-600" : "font-bold text-slate-400"}>
                                  {student.documents[doc.key] ? "Uploaded ✓" : doc.required ? "Missing *" : "Not Provided"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consent Box */}
              <div className="flex items-start gap-4 p-4 bg-orange-50/40 border border-orange-100 rounded-2xl">
                <input
                  type="checkbox"
                  id="admission-consent"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 text-orange-600 border-gray-300 rounded focus:ring-[#fc9d8b] cursor-pointer mt-0.5"
                />
                <label htmlFor="admission-consent" className="cursor-pointer select-none">
                  <p className="text-sm font-bold text-slate-800">Admission Declaration & Consent <span className="text-red-500">*</span></p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    I hereby declare that all information and documentation provided are true and authentic to the best of my knowledge.
                    I confirm that I am the legal parent or guardian of the student(s) listed and authorize the institution to verify these details.
                    I understand that false information may lead to the immediate cancellation of the admission.
                  </p>
                </label>
              </div>
              {!isAgreed && (
                <p className="text-xs text-red-500 ml-9 font-semibold">You must accept the declaration to submit</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-slate-100">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-full font-semibold hover:bg-slate-200 active:scale-95 transition-all text-sm flex items-center gap-2 border border-slate-200"
            >
              <FaArrowLeft /> Previous
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-gradient-to-r from-[#ffb0a0] to-[#fc9d8b] hover:from-[#f98a75] hover:to-[#eb816c] active:scale-95 text-white px-8 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm"
            >
              Next <FaArrowRight />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !isAgreed}
              className="bg-gradient-to-r from-[#ffb0a0] to-[#fc9d8b] hover:from-[#f98a75] hover:to-[#eb816c] active:scale-95 disabled:bg-slate-100 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></span>
                  Processing Admission...
                </>
              ) : (
                <>
                  Submit Application <Check size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </form>


      </div>

            {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl transform animate-scaleIn">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-6">{successMessage}</p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg hover:shadow-xl transition-all"
            >
              Go To Home
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdmissionPortal;