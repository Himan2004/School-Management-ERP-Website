import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useNavigate } from "react-router-dom"

const getDynamicAcademicYear = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-indexed: 0 = Jan, 5 = Jun
  const currentYear = currentDate.getFullYear();
  let startYear = currentYear;
  if (currentMonth < 5) { // Jan to May
    startYear = currentYear - 1;
  }
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
};

const AdmissionPortal = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [orgData, setOrgData] = useState({
    organizationId: "",   // ← add this
    organizationName: "",
    branchId: "",         // ← add this
    branchName: "",
  });

  const fetchClasses = async (orgId) => {
    setLoadingClasses(true);
    setClasses([]);
    try {
      const response = await getClassesByOrganization(orgId);
      setClasses(response?.data || []);
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
      documents: {
        aadhar: null,
        marksheet: null,
        tc: null,
        character: null,
      },
    },
  ]);

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
      showToast("Please fill all required fields in Organization section", "error");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!parentData.fullName) newErrors.fullName = "Parent full name is required";
    if (!parentData.email) newErrors.email = "Email is required";
    else if (!validateEmail(parentData.email)) newErrors.email = "Invalid email format";
    if (!parentData.primaryContact) newErrors.primaryContact = "Primary contact is required";
    else if (!validatePhone(parentData.primaryContact)) newErrors.primaryContact = "Invalid phone number (10 digits)";
    if (!parentData.relation) newErrors.relation = "Relation is required";
    if (!parentData.address.city) newErrors.city = "City is required";
    if (!parentData.address.state) newErrors.state = "State is required";
    if (!parentData.address.pincode) newErrors.pincode = "Pincode is required";
    else if (!validatePincode(parentData.address.pincode)) newErrors.pincode = "Invalid pincode (6 digits)";
    if (parentData.aadharNumber && !validateAadhar(parentData.aadharNumber)) newErrors.aadharNumber = "Invalid Aadhar (12 digits)";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all required fields in Parent Information section", "error");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const newErrors = {};
    let hasError = false;

    students.forEach((student, idx) => {
      if (!student.fullName) {
        newErrors[`student_${idx}_name`] = `Student ${idx + 1} name is required`;
        hasError = true;
      }
      if (!student.dob) {
        newErrors[`student_${idx}_dob`] = `Student ${idx + 1} DOB is required`;
        hasError = true;
      }
      if (!student.classId) {
        newErrors[`student_${idx}_class`] = `Student ${idx + 1} class is required`;
        hasError = true;
      }
      if (!student.rollNumber) {
        newErrors[`student_${idx}_roll`] = `Student ${idx + 1} roll number is required`;
        hasError = true;
      }

      if (!student.photoFile && !student.photoPreview) {
        newErrors[`student_${idx}_photo`] = `Student ${idx + 1} photo is required`;
        hasError = true;
      }

      const requiredDocs = ["aadhar", "marksheet", "tc", "character"];
      requiredDocs.forEach(doc => {
        if (!student.documents[doc]) {
          newErrors[`student_${idx}_doc_${doc}`] = `${doc.charAt(0).toUpperCase() + doc.slice(1)} document is required`;
          hasError = true;
        }
      });
    });

    setErrors(newErrors);

    if (hasError) {
      showToast("Please fill all student details and upload all required documents including photo", "error");
      return false;
    }
    return true;
  };

  const handleParentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
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
        [obj]: { ...prev[obj], [key]: value },
      }));
    } else {
      setParentData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const updateStudent = (id, field, value) => {
    setStudents((prev) => {
      const idx = prev.findIndex(s => s.id === id);
      const errorKey = `student_${idx}_${field}`;
      if (errors[errorKey]) {
        setErrors(p => ({ ...p, [errorKey]: "" }));
      }
      return prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
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

  const addStudent = () => {
    setStudents([
      ...students,
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
        documents: {
          aadhar: null,
          marksheet: null,
          tc: null,
          character: null,
        },
      },
    ]);
  };

  const removeStudent = (id) => {
    if (students.length > 1) setStudents(students.filter((s) => s.id !== id));
  };

  const handleNext = () => {
    let isValid = false;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();

    if (isValid) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    console.log("[Admission] Form submission start");

    if (!isAgreed) {
      console.warn("[Admission] Validation failure: declaration not accepted");
      showToast("Please accept the admission declaration", "error");
      return;
    }

    const isStep1Valid = validateStep1();
    const isStep2Valid = validateStep2();
    const isStep3Valid = validateStep3();

    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) {
      console.warn("[Admission] Validation failure details:", {
        organizationAndBranch: isStep1Valid,
        parentInformation: isStep2Valid,
        studentProfiles: isStep3Valid,
        errors
      });
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

      if (student.documents.aadhar) {
        formData.append(`students[${index}][documents][aadhar]`, student.documents.aadhar);
      }
      if (student.documents.marksheet) {
        formData.append(`students[${index}][documents][marksheet]`, student.documents.marksheet);
      }
      if (student.documents.tc) {
        formData.append(`students[${index}][documents][tc]`, student.documents.tc);
      }
      if (student.documents.character) {
        formData.append(`students[${index}][documents][character]`, student.documents.character);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/10 via-transparent to-indigo-100/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-6 lg:p-10">
        {/* HOME BUTTON */}
        <div className="mb-6">
          <button
            onClick={() => (window.location.href = "/")}
            className="group flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
          >
            <Home size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
        </div>

        {/* Header Section */}
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

        {/* PROGRESS STEPPER */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: "Organization", icon: Building2 },
              { num: 2, title: "Parent Details", icon: User },
              { num: 3, title: "Student Details", icon: Users },
              { num: 4, title: "Review & Submit", icon: ClipboardList },
            ].map((item) => (
              <React.Fragment key={item.num}>
                <div className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 cursor-pointer ${step >= item.num
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 border-transparent text-white shadow-lg shadow-indigo-200"
                      : "bg-white border-gray-300 text-gray-400"
                      }`}
                    onClick={() => {
                      if (item.num < step) setStep(item.num);
                    }}
                  >
                    {step > item.num ? <Check size={22} /> : <item.icon size={20} />}
                  </div>
                  <span
                    className={`text-xs font-bold mt-2 uppercase tracking-wider ${step >= item.num ? "text-indigo-600" : "text-gray-400"
                      }`}
                  >
                    {item.title}
                  </span>
                </div>
                {item.num < 4 && (
                  <div
                    className={`h-[2px] flex-1 mx-2 transition-all duration-500 ${step > item.num ? "bg-gradient-to-r from-indigo-500 to-blue-500" : "bg-gray-200"
                      }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* STEP 1: SCHOOL SELECTION */}
        {step === 1 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-2">
              <Building2 className="text-indigo-600" /> Institution Selection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Organization Dropdown */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Organization <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.organizationName && touched.organizationName ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
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

                    if (selectedOrg?._id) {
                      await fetchBranches(selectedOrg._id);
                      await fetchClasses(selectedOrg._id);
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.branchName && touched.branchName ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
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

                    if (selectedBranch?._id && orgData.organizationId) {
                      await fetchAddress(orgData.organizationId, selectedBranch._id);  // ← IDs only
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

              {/* Address Display */}
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 flex gap-3 items-start">
                <MapPin size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-1">Institution Address</p>
                  <p className="text-sm text-gray-700">
                    {derivedAddress || (orgData.organizationName && orgData.branchName
                      ? "Loading address..."
                      : "Select organization and branch to view address")}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: PARENT INFORMATION */}
        {step === 2 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 space-y-8 animate-fadeIn">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-600 pl-4 mb-6 flex items-center gap-2">
                <User className="text-indigo-600" size={18} /> Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Parent Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={parentData.fullName}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.fullName && touched.fullName ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                    placeholder="Enter parent's full name"
                  />
                  {errors.fullName && touched.fullName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={parentData.email}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.email && touched.email ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                    placeholder="parent@example.com"
                  />
                  {errors.email && touched.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Mail size={12} /> {errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Primary Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="primaryContact"
                    value={parentData.primaryContact}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, primaryContact: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.primaryContact && touched.primaryContact ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                    placeholder="10-digit mobile number"
                  />
                  {errors.primaryContact && touched.primaryContact && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Phone size={12} /> {errors.primaryContact}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Alternate Contact
                  </label>
                  <input
                    type="tel"
                    name="alternateContact"
                    value={parentData.alternateContact}
                    onChange={handleParentChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Relation <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="relation"
                    value={parentData.relation}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, relation: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.relation && touched.relation ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                  {errors.relation && touched.relation && (
                    <p className="text-xs text-red-500 mt-1"><AlertCircle size={12} /> {errors.relation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address & Identity */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-600 pl-4 mb-6 flex items-center gap-2">
                <MapPin className="text-indigo-600" size={18} /> Address & Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <input
                    placeholder="Street Address"
                    name="address.street"
                    value={parentData.address.street}
                    onChange={handleParentChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <input
                    placeholder="City *"
                    name="address.city"
                    value={parentData.address.city}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${errors.city && touched.city ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                  />
                  {errors.city && touched.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <input
                    placeholder="State *"
                    name="address.state"
                    value={parentData.address.state}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, state: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${errors.state && touched.state ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                  />
                  {errors.state && touched.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                </div>
                <div>
                  <input
                    placeholder="Pincode *"
                    name="address.pincode"
                    value={parentData.address.pincode}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, pincode: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${errors.pincode && touched.pincode ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                  />
                  {errors.pincode && touched.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                </div>
                <div>
                  <input
                    placeholder="Aadhar Card Number"
                    name="aadharNumber"
                    value={parentData.aadharNumber}
                    onChange={handleParentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, aadharNumber: true }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${errors.aadharNumber && touched.aadharNumber ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                  />
                  {errors.aadharNumber && touched.aadharNumber && <p className="text-xs text-red-500 mt-1">{errors.aadharNumber}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: STUDENT DETAILS */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {students.map((student, idx) => (
              <div key={student.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-white">
                    <Users size={20} />
                    <span className="font-bold tracking-wide uppercase">Student Profile #{idx + 1}</span>
                  </div>
                  {students.length > 1 && (
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="bg-white/20 hover:bg-red-500 p-2 rounded-full transition-all duration-300"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-8">
                  {/* Student Basic & Photo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center">
                      <div className={`w-32 h-40 bg-gray-100 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative group transition-all cursor-pointer ${errors[`student_${idx}_photo`] ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-indigo-400"
                        }`}>
                        {student.photoPreview ? (
                          <img src={student.photoPreview} className="w-full h-full object-cover" alt="Student" />
                        ) : (
                          <Upload className="text-gray-400 group-hover:text-indigo-500 transition" size={32} />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileUpload(student.id, "photo", e.target.files[0])}
                        />
                      </div>
                      <p className="text-[10px] font-bold mt-2 uppercase text-center">
                        <span className={errors[`student_${idx}_photo`] ? "text-red-500" : "text-gray-400"}>
                          Passport Photo {!student.photoFile && !student.photoPreview && <span className="text-red-500">*</span>}
                        </span>
                      </p>
                      {errors[`student_${idx}_photo`] && (
                        <p className="text-xs text-red-500 mt-1 text-center">{errors[`student_${idx}_photo`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Student Full Name <span className="text-red-500">*</span></label>
                        <input
                          value={student.fullName}
                          onChange={(e) => updateStudent(student.id, "fullName", e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors[`student_${idx}_name`] ? "border-red-500 bg-red-50" : "border-gray-200"
                            }`}
                        />
                        {errors[`student_${idx}_name`] && <p className="text-xs text-red-500 mt-1">{errors[`student_${idx}_name`]}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Date of Birth <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={student.dob}
                          onChange={(e) => updateStudent(student.id, "dob", e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors[`student_${idx}_dob`] ? "border-red-500 bg-red-50" : "border-gray-200"
                            }`}
                        />
                        {errors[`student_${idx}_dob`] && <p className="text-xs text-red-500 mt-1">{errors[`student_${idx}_dob`]}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
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
                          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors[`student_${idx}_gender`]
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200"
                            }`}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors[`student_${idx}_gender`] && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors[`student_${idx}_gender`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={student.classId || ""}
                            onChange={(e) => {
                              const selectedClass = classes.find(c => c._id === e.target.value);
                              updateStudent(student.id, "class", selectedClass?.name || "");
                              updateStudent(student.id, "classId", selectedClass?._id || "");
                            }}
                            className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors[`student_${idx}_class`] ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                            disabled={loadingClasses || classes.length === 0}
                          >
                            <option value="">
                              {loadingClasses
                                ? "Loading classes..."
                                : classes.length === 0
                                  ? "No classes — fetch first"
                                  : "Select Class"}
                            </option>
                            {classes.map((cls) => (
                              <option key={cls._id} value={cls._id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              if (orgData.organizationId) {
                                fetchClasses(orgData.organizationId);
                              } else {
                                showToast("Please select an organization first", "error");
                              }
                            }}
                            disabled={loadingClasses || !orgData.organizationId}
                            className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
                          >
                            {loadingClasses ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                            {loadingClasses ? "Loading..." : "Fetch"}
                          </button>
                        </div>

                        {errors[`student_${idx}_class`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`student_${idx}_class`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Blood Group</label>
                        <input
                          value={student.bloodGroup}
                          onChange={(e) => updateStudent(student.id, "bloodGroup", e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g. O+ve"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic & Transport */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                        <School size={16} /> Academic Context
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            placeholder="Roll Number *"
                            value={student.rollNumber}
                            onChange={(e) => updateStudent(student.id, "rollNumber", e.target.value)}
                            className={`w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors[`student_${idx}_roll`] ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                          />
                          {errors[`student_${idx}_roll`] && <p className="text-xs text-red-500 mt-1">{errors[`student_${idx}_roll`]}</p>}
                        </div>
                        <div>
                          <input
                            placeholder="Academic Year"
                            value={student.academicYear}
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>
                      <input
                        placeholder="Previous School Name"
                        value={student.previousSchool}
                        onChange={(e) => updateStudent(student.id, "previousSchool", e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                        <Bus size={16} /> Transport & Health
                      </h4>
                      <select
                        value={student.transportRequired}
                        onChange={(e) => updateStudent(student.id, "transportRequired", e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="No">Transport Required: No</option>
                        <option value="Yes">Transport Required: Yes</option>
                      </select>
                      {student.transportRequired === "Yes" && (
                        <input
                          placeholder="Specify Bus Route"
                          value={student.busRoute}
                          onChange={(e) => updateStudent(student.id, "busRoute", e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                      <textarea
                        placeholder="Medical Conditions / Health Notes"
                        value={student.healthNotes}
                        onChange={(e) => updateStudent(student.id, "healthNotes", e.target.value)}
                        rows="2"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <FileText size={16} /> Official Documents <span className="text-red-500 text-xs">(All documents are required)</span>
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Aadhar Card", key: "aadhar", required: true },
                        { label: "Marksheet", key: "marksheet", required: true },
                        { label: "TC", key: "tc", required: true },
                        { label: "Character Cert", key: "character", required: true },
                      ].map((doc) => {
                        const isUploaded = !!student.documents[doc.key];
                        const hasError = errors[`student_${idx}_doc_${doc.key}`];
                        return (
                          <label
                            key={doc.key}
                            className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 group ${isUploaded
                              ? "border-green-500 bg-green-50 hover:bg-green-100"
                              : hasError
                                ? "border-red-500 bg-red-50 hover:bg-red-100"
                                : "border-gray-200 hover:border-indigo-400 hover:bg-indigo-50"
                              }`}
                          >
                            <Upload
                              size={20}
                              className={`mx-auto mb-2 transition-all group-hover:scale-110 ${isUploaded ? "text-green-600" : hasError ? "text-red-500" : "text-gray-400 group-hover:text-indigo-500"
                                }`}
                            />
                            <p className="text-[10px] font-bold uppercase truncate">
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
                        );
                      })}
                    </div>
                    {Object.keys(errors).some(key => key.includes(`student_${idx}_doc_`)) && (
                      <p className="text-xs text-red-500 mt-2 text-center">Please upload all required documents</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addStudent}
              className="w-full py-5 border-2 border-dashed border-indigo-400 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              Add Another Student Profile
            </button>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Review Application</h2>
                  <p className="text-sm text-gray-500 mt-1">Confirm all details before submitting</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Target Organization</p>
                  <p className="text-lg font-bold text-indigo-600">{orgData.organizationName || "Not Selected"}</p>
                  <p className="text-xs text-gray-500">{orgData.branchName || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Parent Summary */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                    <User size={16} className="text-indigo-600" /> Parent / Guardian Summary
                  </h3>
                  <button onClick={() => setStep(2)} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-xs font-medium transition">
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Full Name</p>
                    <p className="font-semibold text-gray-800">{parentData.fullName || "Not Provided"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Email</p>
                    <p className="font-semibold text-gray-800">{parentData.email || "Not Provided"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Phone</p>
                    <p className="font-semibold text-gray-800">{parentData.primaryContact || "Not Provided"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Relation</p>
                    <p className="font-semibold text-gray-800">{parentData.relation || "Not Provided"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Address</p>
                    <p className="font-semibold text-gray-800">
                      {`${parentData.address.street}, ${parentData.address.city}, ${parentData.address.state} - ${parentData.address.pincode}` || "Not Provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Students Summary */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" /> Student Profiles ({students.length})
                  </h3>
                  <button onClick={() => setStep(3)} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-xs font-medium transition">
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
                <div className="space-y-4">
                  {students.map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-5 flex flex-col md:flex-row gap-5">
                      <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {s.photoPreview ? (
                          <img src={s.photoPreview} className="w-full h-full object-cover" alt="Student" />
                        ) : (
                          <User className="w-full h-full p-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="md:col-span-2">
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Name</p>
                          <p className="font-semibold text-gray-800">{s.fullName || "Not Provided"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Class</p>
                          <p className="font-semibold text-gray-800">
                            {s.class
                              ? s.class
                              : s.classId
                                ? classes.find(c => c._id === s.classId)?.name || "N/A"
                                : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Roll No</p>
                          <p className="font-semibold text-gray-800">{s.rollNumber || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase">DOB</p>
                          <p className="font-semibold text-gray-800">{s.dob || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Transport</p>
                          <p className="font-semibold text-gray-800">{s.transportRequired} {s.busRoute && `(${s.busRoute})`}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Documents</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {["aadhar", "marksheet", "tc", "character"].map((key) => (
                              <div key={key} className={`px-1.5 py-0.5 rounded text-[8px] ${s.documents[key] ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {key.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Declaration */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 m-6 rounded-xl">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="admission-consent"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer mt-0.5"
                />
                <label htmlFor="admission-consent" className="cursor-pointer">
                  <p className="text-sm font-bold text-indigo-900">Admission Declaration & Consent <span className="text-red-500">*</span></p>
                  <p className="text-xs text-indigo-700 leading-relaxed mt-1">
                    I hereby declare that all information and documentation provided are true and authentic to the best of my knowledge.
                    I confirm that I am the legal parent or guardian of the student(s) listed and authorize the institution to verify these details.
                    I understand that false information may lead to the immediate cancellation of the admission.
                  </p>
                </label>
              </div>
              {!isAgreed && (
                <p className="text-xs text-red-500 mt-2 ml-9">You must accept the declaration to submit</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-10">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className={`px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all duration-300 ${step === 1
              ? "opacity-0 invisible"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Back
          </button>

          <button
            onClick={() => {
              if (step < 4) {
                handleNext();
              } else {
                handleSubmit();
              }
            }}
            disabled={isLoading}
            className="px-10 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 flex items-center gap-3 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : step !== 4 ? (
              "Save and Continue"
            ) : (
              "Submit Application"
            )}
          </button>
        </div>
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