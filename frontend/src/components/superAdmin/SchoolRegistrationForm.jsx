import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheckCircle, FaSchool, FaBook, FaUserTie, FaChevronDown, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import { sortGrades } from "../../utils/gradeSorter";

const steps = ["School", "Contact", "Address", "Additional", "Review"];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{9,14}$/,
  pinCode: /^[1-9][0-9]{5}$/,
  url: /^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*\.)+[a-z]{2,}(\/.*)?$/
};

const COUNTRY_CODES = [
  { code: "+91", country: "India", label: "🇮🇳 +91 (India)" },
  { code: "+1", country: "United States", label: "🇺🇸 +1 (US)" },
  { code: "+44", country: "United Kingdom", label: "🇬🇧 +44 (UK)" },
  { code: "+61", country: "Australia", label: "🇦🇺 +61 (AUS)" },
  { code: "+971", country: "UAE", label: "🇦🇪 +971 (UAE)" },
  { code: "+966", country: "Saudi Arabia", label: "🇸🇦 +966 (KSA)" },
  { code: "+65", country: "Singapore", label: "🇸🇬 +65 (SGP)" },
  { code: "+49", country: "Germany", label: "🇩🇪 +49 (GER)" },
  { code: "+33", country: "France", label: "🇫🇷 +33 (FRA)" },
  { code: "+81", country: "Japan", label: "🇯🇵 +81 (JPN)" },
  { code: "+64", country: "New Zealand", label: "🇳🇿 +64 (NZ)" },
  { code: "+92", country: "Pakistan", label: "🇵🇰 +92 (PAK)" },
  { code: "+880", country: "Bangladesh", label: "🇧🇩 +880 (BGD)" },
  { code: "+977", country: "Nepal", label: "🇳🇵 +977 (NPL)" },
  { code: "+94", country: "Sri Lanka", label: "🇱🇰 +94 (LKA)" },
];

const INDIAN_BOARDS = [
  "CBSE (Central Board of Secondary Education)",
  "ICSE / ISC (Council for the Indian School Certificate Examinations)",
  "NIOS (National Institute of Open Schooling)",
  "UPMSP (Uttar Pradesh Board of High School and Intermediate Education)",
  "MSBSHSE (Maharashtra State Board of Secondary and Higher Secondary Education)",
  "BSEB (Bihar School Examination Board)",
  "WBBSE (West Bengal Board of Secondary Education)",
  "GSEB (Gujarat Secondary and Higher Secondary Education Board)",
  "MPBSE (Madhya Pradesh Board of Secondary Education)",
  "RBSE (Rajasthan Board of Secondary Education)",
  "KSEEB (Karnataka Secondary Education Examination Board)",
  "TNDGE (Tamil Nadu Directorate of Government Examinations)",
  "BSEAP (Andhra Pradesh Board of Secondary Education)",
  "TSBIE (Telangana State Board of Intermediate Education)",
  "PSEB (Punjab School Education Board)",
  "HBSE (Haryana Board of School Education)",
  "AHSEC (Assam Higher Secondary Education Council)",
  "CGBSE (Chhattisgarh Board of Secondary Education)",
  "JAC (Jharkhand Academic Council)",
  "JKBOSE (Jammu and Kashmir State Board of School Education)",
  "KBPE (Kerala Board of Public Examinations)",
  "HPBOSE (Himachal Pradesh Board of School Education)",
  "UBSE (Uttarakhand Board of School Education)",
  "GBSHSE (Goa Board of Secondary and Higher Secondary Education)",
  "TBSE (Tripura Board of Secondary Education)",
  "MBOSE (Meghalaya Board of School Education)",
  "BSEM (Manipur Board of Secondary Education)",
  "MBSE (Mizoram Board of School Education)",
  "NBSE (Nagaland Board of School Education)",
  "CHSE (Council of Higher Secondary Education, Odisha)",
  "SBSE (Sikkim Board of Secondary Education)",
  "IB (International Baccalaureate)",
  "Cambridge (IGCSE / GCE A Levels)",
];

function SearchableSelect({ value, onChange, options, placeholder, errorMsg, onBlur }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [onBlur]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`border rounded-xl px-5 py-4 w-full bg-white focus:outline-none cursor-pointer flex justify-between items-center transition-colors ${
          isOpen ? "ring-2 ring-[#fc9d8b]/20 border-[#fc9d8b]" : errorMsg ? "border-red-400 bg-red-50" : "border-slate-300"
        }`}
      >
        <span className={value ? "text-slate-800 font-semibold" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <span className="text-gray-500 text-xs"><FaChevronDown /></span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            type="text"
            placeholder="Search board..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                    if (onBlur) onBlur();
                  }}
                  className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                    value === opt ? "bg-[#fc9d8b] text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 p-2 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const INITIAL_FORM = {
  schoolName: "",
  yearOfEstablishment: "",
  board: "",
  schoolRanking: "",
  country: "India",
  state: "",
  city: "",
  pinCode: "",
  address: "",
  officialPhone: "",
  officialEmail: "",
  website: "",
  organizationId: "",
  branchCreationId: "",
  enrollmentCapacity: "",
  gradesOffered: "",
  mediumOfInstruction: "",
  schoolType: "",
  principalName: "",
  principalEmail: "",
  principalPhone: "",
  totalStaff: "",
};

export default function SchoolRegistrationForm({ isEmbedded = false }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [organizations, setOrganizations] = useState([]);
  const [orgClasses, setOrgClasses] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  
  const [fetchingOrgs, setFetchingOrgs] = useState(true);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [classesLoaded, setClassesLoaded] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  const schoolInfoRef = useRef(null);
  const academicsRef = useRef(null);
  const principalRef = useRef(null);

  const stepRefs = [schoolInfoRef, academicsRef, principalRef];

  const scrollToSection = (idx) => {
    const ref = stepRefs[idx];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentStep(idx);
    }
  };



    const getStepFields = (stepIndex) => {
    if (stepIndex === 0) {
      return ["schoolName", "organizationId", "branchCreationId"];
    }
    if (stepIndex === 1) {
      return ["officialEmail", "officialPhone", "website"];
    }
    if (stepIndex === 2) {
      return ["address", "city", "state", "pinCode"];
    }
    if (stepIndex === 3) {
      return ["enrollmentCapacity", "gradesOffered", "schoolType", "board", "mediumOfInstruction", "totalStaff", "principalName", "principalEmail", "principalPhone"];
    }
    return [];
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [officialPhoneCode, setOfficialPhoneCode] = useState("+91");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");
  const [principalPhoneCode, setPrincipalPhoneCode] = useState("+91");
  const [principalPhoneNumber, setPrincipalPhoneNumber] = useState("");

  // Fetch Organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setFetchingOrgs(true);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
        const res = await axios.get(`${apiUrl}/api/school/organizations?status=active`);
        if (res.data.success) {
          setOrganizations(res.data.data.organizations || []);
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
        toast.error("Failed to load organizations.");
      } finally {
        setFetchingOrgs(false);
      }
    };
    fetchOrgs();
  }, []);

  // Fetch classes when organizationId changes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!form.organizationId) {
        setOrgClasses([]);
        setClassesLoaded(false);
        return;
      }
      try {
        setFetchingClasses(true);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
        const res = await axios.get(`${apiUrl}/api/school/organizations/${form.organizationId}/classes`);
        if (res.data.success) {
          const sorted = sortGrades(res.data.data || [], (c) => c.name);
          setOrgClasses(sorted);
          setClassesLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        toast.error("Failed to load organization classes.");
      } finally {
        setFetchingClasses(false);
      }
    };
    fetchClasses();
  }, [form.organizationId]);

  // Sync phone numbers
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      officialPhone: officialPhoneNumber ? `${officialPhoneCode} ${officialPhoneNumber}` : "",
    }));
  }, [officialPhoneCode, officialPhoneNumber]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      principalPhone: principalPhoneNumber ? `${principalPhoneCode} ${principalPhoneNumber}` : "",
    }));
  }, [principalPhoneCode, principalPhoneNumber]);

  const update = (field) => (e) => {
    let value = e.target.value;

    // Numeric inputs sanitization/capping
    if (field === "enrollmentCapacity" || field === "totalStaff") {
      value = value.replace(/[^0-9]/g, "");
      if (field === "enrollmentCapacity" && Number(value) > 15000) {
        value = "15000";
      }
      if (field === "totalStaff" && Number(value) > 1000) {
        value = "1000";
      }
    }
    
    setForm((f) => ({ ...f, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNumericKeyDown = (e) => {
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleNumericPaste = (e) => {
    const paste = e.clipboardData.getData("text");
    if (/[^0-9]/.test(paste)) {
      e.preventDefault();
    }
  };

  const handleGradeToggle = (gradeName) => {
    let nextGrades;
    if (selectedGrades.includes(gradeName)) {
      nextGrades = selectedGrades.filter((g) => g !== gradeName);
    } else {
      nextGrades = [...selectedGrades, gradeName];
    }
    setSelectedGrades(nextGrades);
    
    // Sort selected grades before saving
    const sortedSelected = sortGrades(
      nextGrades.map((name) => ({ name })),
      (g) => g.name
    ).map((g) => g.name);

    setForm((prev) => ({
      ...prev,
      gradesOffered: sortedSelected.join(", "),
    }));

    if (errors.gradesOffered) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.gradesOffered;
        return next;
      });
    }
  };

    const validateStep = (stepIndex) => {
    const err = {};
    if (stepIndex === 0) {
      if (!form.schoolName.trim()) err.schoolName = "School Name is required";
      if (!form.organizationId) err.organizationId = "Organization is required";
      if (!form.branchCreationId.trim()) err.branchCreationId = "Branch Creation ID is required";
    } else if (stepIndex === 1) {
      if (!form.officialEmail.trim()) {
        err.officialEmail = "Official Email is required";
      } else if (!REGEX.email.test(form.officialEmail)) {
        err.officialEmail = "Invalid Email address";
      }
      if (!officialPhoneNumber.trim()) {
        err.officialPhone = "Phone number is required";
      } else if (officialPhoneNumber.trim().length !== 10) {
        err.officialPhone = "Phone number must be exactly 10 digits";
      }
      if (form.website?.trim()) {
        if (!REGEX.url.test(form.website.trim())) {
          err.website = "Invalid Website URL format";
        }
      }
    } else if (stepIndex === 2) {
      if (!form.address.trim()) err.address = "Address is required";
      if (!form.city.trim()) err.city = "City is required";
      if (!form.state.trim()) err.state = "State is required";
      if (!form.pinCode.trim()) {
        err.pinCode = "Pincode is required";
      } else if (!REGEX.pinCode.test(form.pinCode)) {
        err.pinCode = "Pincode must be 6 digits";
      }
    } else if (stepIndex === 3) {
      if (!form.enrollmentCapacity) {
        err.enrollmentCapacity = "Student capacity is required";
      } else {
        const val = Number(form.enrollmentCapacity);
        if (isNaN(val) || val <= 0) {
          err.enrollmentCapacity = "Student capacity must be a positive whole number";
        } else if (val > 15000) {
          err.enrollmentCapacity = "Student capacity cannot exceed 15000";
        }
      }
      if (!form.gradesOffered) err.gradesOffered = "Please select at least one grade";
      if (!form.schoolType) err.schoolType = "School type is required";
      if (!form.board) err.board = "School Board is required";
      if (!form.mediumOfInstruction) err.mediumOfInstruction = "Medium of Instruction is required";
      if (!form.totalStaff) {
        err.totalStaff = "Total staff is required";
      } else {
        const val = Number(form.totalStaff);
        if (isNaN(val) || val < 1) {
          err.totalStaff = "Must be a positive whole number (minimum 1)";
        } else if (val > 1000) {
          err.totalStaff = "Total staff cannot exceed 1000";
        }
      }
      if (!form.principalName.trim()) err.principalName = "Principal Name is required";
      if (!form.principalEmail.trim()) {
        err.principalEmail = "Principal Email is required";
      } else if (!REGEX.email.test(form.principalEmail)) {
        err.principalEmail = "Invalid email format";
      }
      if (!principalPhoneNumber.trim()) {
        err.principalPhone = "Principal phone is required";
      } else if (principalPhoneNumber.trim().length !== 10) {
        err.principalPhone = "Principal phone must be exactly 10 digits";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    const fieldsToTouch = getStepFields(currentStep);
    setTouched((prev) => {
      const next = { ...prev };
      fieldsToTouch.forEach((f) => {
        next[f] = true;
      });
      return next;
    });

    if (validateStep(currentStep)) {
      setErrors({});
      setTouched({});
      setFormSubmitted(false);
      setCurrentStep((s) => s + 1);
      const scrollable = document.querySelector(".register-content");
      if (scrollable) scrollable.scrollTop = 0;
    } else {
      toast.error("Please resolve any errors before continuing.");
    }
  };

  const handlePrev = () => {
    setErrors({});
    setTouched({});
    setFormSubmitted(false);
    setCurrentStep((s) => s - 1);
    const scrollable = document.querySelector(".register-content");
    if (scrollable) scrollable.scrollTop = 0;
  };

  const validateAllSteps = () => {
    const err = {};
    
    // Step 0 validations
    if (!form.schoolName.trim()) err.schoolName = "School Name is required";
    if (!form.organizationId) err.organizationId = "Organization is required";
    if (!form.branchCreationId.trim()) err.branchCreationId = "Branch Creation ID is required";
    if (!form.officialEmail.trim()) {
      err.officialEmail = "Official Email is required";
    } else if (!REGEX.email.test(form.officialEmail)) {
      err.officialEmail = "Invalid Email address";
    }
    if (!officialPhoneNumber.trim()) {
      err.officialPhone = "Phone number is required";
    } else if (officialPhoneNumber.trim().length !== 10) {
      err.officialPhone = "Phone number must be exactly 10 digits";
    }
    if (!form.address.trim()) err.address = "Address is required";
    if (!form.city.trim()) err.city = "City is required";
    if (!form.state.trim()) err.state = "State is required";
    if (!form.pinCode.trim()) {
      err.pinCode = "Pincode is required";
    } else if (!REGEX.pinCode.test(form.pinCode)) {
      err.pinCode = "Pincode must be 6 digits";
    }

    // Step 1 validations
    if (!form.enrollmentCapacity) {
      err.enrollmentCapacity = "Student capacity is required";
    } else {
      const val = Number(form.enrollmentCapacity);
      if (isNaN(val) || val <= 0) {
        err.enrollmentCapacity = "Student capacity must be a positive whole number";
      } else if (val > 15000) {
        err.enrollmentCapacity = "Student capacity cannot exceed 15000";
      }
    }
    if (!form.gradesOffered) err.gradesOffered = "Please select at least one grade";
    if (!form.schoolType) err.schoolType = "School type is required";
    if (!form.board) err.board = "School Board is required";
    if (!form.mediumOfInstruction) err.mediumOfInstruction = "Medium of Instruction is required";
    if (!form.totalStaff) {
      err.totalStaff = "Total staff is required";
    } else {
      const val = Number(form.totalStaff);
      if (isNaN(val) || val < 1) {
        err.totalStaff = "Must be a positive whole number (minimum 1)";
      } else if (val > 1000) {
        err.totalStaff = "Total staff cannot exceed 1000";
      }
    }

    // Step 2 validations
    if (!form.principalName.trim()) err.principalName = "Principal Name is required";
    if (!form.principalEmail.trim()) {
      err.principalEmail = "Principal Email is required";
    } else if (!REGEX.email.test(form.principalEmail)) {
      err.principalEmail = "Invalid email format";
    }
    if (!principalPhoneNumber.trim()) {
      err.principalPhone = "Principal phone is required";
    } else if (principalPhoneNumber.trim().length !== 10) {
      err.principalPhone = "Principal phone must be exactly 10 digits";
    }

    if (form.website?.trim()) {
      if (!REGEX.url.test(form.website.trim())) {
        err.website = "Invalid Website URL format";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error("Please fill all required inputs correctly before submitting.");
      return;
    }

    if (currentStep === 4 && !isConfirmed) {
      toast.error("Please confirm that all details are correct.");
      return;
    }

    setLoading(true);
    const payload = {
      ...form,
      totalStaff: String(form.totalStaff),
    };

    if (payload.board === "State Board" && payload.state.trim()) {
      payload.board = `${payload.state.trim()} State Board`;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      await axios.post(`${apiUrl}/api/school/register`, payload);
      setSubmitted(true);
      toast.success("Registration request submitted successfully!");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to submit request. Please try again.";
      setErrors((prev) => ({ ...prev, submit: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field, isReadOnly = false) => {
    const hasError = !isReadOnly && errors[field] && (formSubmitted || touched[field]);
    return `w-full px-5 py-4 border rounded-xl focus:outline-none transition-all text-sm font-semibold text-slate-800 ${
      isReadOnly
        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-100"
        : "bg-white placeholder-slate-500 focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
    } ${hasError ? "border-red-400 bg-red-50" : "border-slate-300"}`;
  };

  const ErrMsg = ({ field }) => {
    const shouldShow = errors[field] && (formSubmitted || touched[field]);
    return shouldShow ? (
      <p className="text-red-500 text-xs mt-1 font-semibold">{errors[field]}</p>
    ) : null;
  };



  if (submitted) {
    return (
      <div className="w-full py-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-10 text-center"
        >
          <div className="flex justify-center mb-6">
            <FaCheckCircle className="text-green-500 text-7xl drop-shadow-md animate-bounce" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Request Submitted!</h2>
          <p className="text-slate-500 font-medium mb-6 leading-relaxed">
            Your registration request for <span className="text-[#fc9d8b] font-bold">{form.schoolName}</span> has been submitted to the selected organization.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left space-y-3">
            <div className="text-sm text-slate-600"><span className="font-bold text-slate-800">School Name:</span> {form.schoolName}</div>
            <div className="text-sm text-slate-600"><span className="font-bold text-slate-800">Principal Name:</span> {form.principalName}</div>
            <div className="text-sm text-slate-600"><span className="font-bold text-slate-800">Principal Email:</span> {form.principalEmail}</div>
            <div className="text-sm text-slate-600"><span className="font-bold text-slate-800">Status:</span> <span className="text-amber-500 font-black uppercase tracking-wider">Pending Review</span></div>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm(INITIAL_FORM);
              setSelectedGrades([]);
              setOfficialPhoneNumber("");
              setPrincipalPhoneNumber("");
              setErrors({});
              setTouched({});
              setFormSubmitted(false);
              setCurrentStep(0);
              setIsConfirmed(false);
            }}
            className="w-full py-4 bg-[#fc9d8b] text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
          >
            Submit Another Request
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "w-full relative" : "w-full max-w-2xl mx-auto bg-white border border-slate-100 shadow-xl rounded-3xl p-6 sm:p-10 relative"}>
      {/* HEADER */}
      {isEmbedded ? (
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Register Your School
            </h2>
            <p className="text-slate-500 mt-1.5 text-sm font-medium">
              Join an organization as an external school branch.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-[#2524D1] rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
            <FaSchool size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Register School</h2>
            <p className="text-xs text-slate-500 font-medium">Join an organization as an external school branch</p>
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
        {/* Step 1: School Details */}
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 scroll-mt-28 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <FaSchool />
              </span>
              School Details
            </h3>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                  School Name *
                </label>
                <input
                  type="text"
                  placeholder="School Name *"
                  value={form.schoolName}
                  onChange={update("schoolName")}
                  onBlur={handleBlur("schoolName")}
                  className={inputCls("schoolName")}
                />
                <ErrMsg field="schoolName" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Select Organization *
                  </label>
                  <select
                    value={form.organizationId}
                    onChange={update("organizationId")}
                    onBlur={handleBlur("organizationId")}
                    className={inputCls("organizationId")}
                    disabled={fetchingOrgs}
                  >
                    <option value="">{fetchingOrgs ? "Loading organizations..." : "Select Organization *"}</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.organizationName}
                      </option>
                    ))}
                  </select>
                  <ErrMsg field="organizationId" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Branch Creation ID *
                  </label>
                  <input
                    type="text"
                    placeholder="Branch Creation ID (from Organization) *"
                    value={form.branchCreationId}
                    onChange={update("branchCreationId")}
                    onBlur={handleBlur("branchCreationId")}
                    className={inputCls("branchCreationId")}
                  />
                  <ErrMsg field="branchCreationId" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Year of Establishment
                  </label>
                  <select
                    value={form.yearOfEstablishment}
                    onChange={update("yearOfEstablishment")}
                    className={inputCls("yearOfEstablishment")}
                  >
                    <option value="">Year of Establishment</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    School Ranking
                  </label>
                  <input
                    type="text"
                    placeholder="School Ranking (e.g. 5th state-wide)"
                    value={form.schoolRanking}
                    onChange={update("schoolRanking")}
                    className={inputCls("schoolRanking")}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Contact Information */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 scroll-mt-28 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <FaUserTie />
              </span>
              Official Contact
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Official Email *
                  </label>
                  <input
                    type="text"
                    placeholder="Official Email *"
                    value={form.officialEmail}
                    onChange={update("officialEmail")}
                    onBlur={handleBlur("officialEmail")}
                    className={inputCls("officialEmail")}
                  />
                  <ErrMsg field="officialEmail" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Official Phone *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={officialPhoneCode}
                      onChange={(e) => setOfficialPhoneCode(e.target.value)}
                      className="w-24 px-2 py-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder="Official Phone *"
                      value={officialPhoneNumber}
                      onChange={(e) => setOfficialPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={handleNumericPaste}
                      onBlur={handleBlur("officialPhone")}
                      className={inputCls("officialPhone")}
                    />
                  </div>
                  <ErrMsg field="officialPhone" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="Website (e.g. www.school.com)"
                  value={form.website}
                  onChange={update("website")}
                  onBlur={handleBlur("website")}
                  className={inputCls("website")}
                />
                <ErrMsg field="website" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Address & Location */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 scroll-mt-28 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <FaSchool />
              </span>
              Address & Location
            </h3>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                  Full Street Address *
                </label>
                <textarea
                  placeholder="Full Street Address *"
                  value={form.address}
                  onChange={update("address")}
                  onBlur={handleBlur("address")}
                  rows={3}
                  className={inputCls("address")}
                />
                <ErrMsg field="address" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="City *"
                    value={form.city}
                    onChange={update("city")}
                    onBlur={handleBlur("city")}
                    className={inputCls("city")}
                  />
                  <ErrMsg field="city" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    State *
                  </label>
                  <input
                    type="text"
                    placeholder="State *"
                    value={form.state}
                    onChange={update("state")}
                    onBlur={handleBlur("state")}
                    className={inputCls("state")}
                  />
                  <ErrMsg field="state" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    placeholder="Pincode *"
                    value={form.pinCode}
                    onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, "") })}
                    onBlur={handleBlur("pinCode")}
                    className={inputCls("pinCode")}
                  />
                  <ErrMsg field="pinCode" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                  Country
                </label>
                <input
                  type="text"
                  value="India"
                  readOnly
                  className={inputCls("country", true)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Academic & Additional Information */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 scroll-mt-28 text-left animate-in fade-in duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-[32px] mt-8 first:mt-0 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                <FaBook />
              </span>
              Additional Information
            </h3>

            <div className="space-y-8">
              {fetchingClasses ? (
                <div className="w-full flex justify-center py-6">
                  <span className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></span>
                  <span className="text-sm font-semibold text-slate-500 ml-2">Fetching organization classes...</span>
                </div>
              ) : classesLoaded && orgClasses.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-4 text-sm font-medium">
                  No classes have been created by this organization yet.
                </div>
              ) : classesLoaded ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Grades Offered *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/50 max-h-60 overflow-y-auto">
                    {orgClasses.map((cls) => (
                      <label
                        key={cls._id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border select-none transition-all ${
                          selectedGrades.includes(cls.name)
                            ? "bg-orange-50 border-orange-200 text-[#fc9d8b]"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGrades.includes(cls.name)}
                          onChange={() => {
                            handleGradeToggle(cls.name);
                            handleBlur("gradesOffered")();
                          }}
                          className="rounded text-[#fc9d8b] focus:ring-[#fc9d8b]"
                        />
                        <span className="text-sm font-semibold">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                  <ErrMsg field="gradesOffered" />
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-5 py-4 text-sm font-medium text-center">
                  Please select an organization to load grades.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Student Enrollment Capacity *
                  </label>
                  <input
                    type="number"
                    placeholder="Student Enrollment Capacity *"
                    value={form.enrollmentCapacity}
                    onChange={update("enrollmentCapacity")}
                    onKeyDown={handleNumericKeyDown}
                    onPaste={handleNumericPaste}
                    onWheel={(e) => e.target.blur()}
                    onBlur={handleBlur("enrollmentCapacity")}
                    className={inputCls("enrollmentCapacity")}
                  />
                  <ErrMsg field="enrollmentCapacity" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    School Type *
                  </label>
                  <select
                    value={form.schoolType}
                    onChange={update("schoolType")}
                    onBlur={handleBlur("schoolType")}
                    className={inputCls("schoolType")}
                  >
                    <option value="">School Type *</option>
                    <option value="Co-ed">Co-ed</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                  <ErrMsg field="schoolType" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Select Board *
                  </label>
                  <SearchableSelect
                    value={form.board}
                    onChange={(val) => setForm({ ...form, board: val })}
                    options={INDIAN_BOARDS}
                    placeholder="Select Board *"
                    errorMsg={(formSubmitted || touched.board) ? errors.board : undefined}
                    onBlur={handleBlur("board")}
                  />
                  <ErrMsg field="board" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Medium of Instruction *
                  </label>
                  <select
                    value={form.mediumOfInstruction}
                    onChange={update("mediumOfInstruction")}
                    onBlur={handleBlur("mediumOfInstruction")}
                    className={inputCls("mediumOfInstruction")}
                  >
                    <option value="">Select Medium of Instruction *</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English + Hindi">English + Hindi</option>
                  </select>
                  <ErrMsg field="mediumOfInstruction" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                    Total Staff *
                  </label>
                  <input
                    type="number"
                    placeholder="Total Staff *"
                    value={form.totalStaff}
                    onChange={update("totalStaff")}
                    onKeyDown={handleNumericKeyDown}
                    onPaste={handleNumericPaste}
                    onWheel={(e) => e.target.blur()}
                    onBlur={handleBlur("totalStaff")}
                    className={inputCls("totalStaff")}
                  />
                  <ErrMsg field="totalStaff" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="font-bold text-slate-750 mb-4 text-sm uppercase tracking-wider">Principal Profile</h4>
                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                      Principal Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Principal Full Name *"
                      value={form.principalName}
                      onChange={update("principalName")}
                      onBlur={handleBlur("principalName")}
                      className={inputCls("principalName")}
                    />
                    <ErrMsg field="principalName" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Principal Email *
                      </label>
                      <input
                        type="email"
                        placeholder="Principal Email *"
                        value={form.principalEmail}
                        onChange={update("principalEmail")}
                        onBlur={handleBlur("principalEmail")}
                        className={inputCls("principalEmail")}
                      />
                      <ErrMsg field="principalEmail" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                        Principal Phone *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={principalPhoneCode}
                          onChange={(e) => setPrincipalPhoneCode(e.target.value)}
                          className="w-24 px-2 py-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>{c.code}</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          placeholder="Principal Phone *"
                          value={principalPhoneNumber}
                          onChange={(e) => setPrincipalPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={handleNumericPaste}
                          onBlur={handleBlur("principalPhone")}
                          className={inputCls("principalPhone")}
                        />
                      </div>
                      <ErrMsg field="principalPhone" />
                    </div>
                  </div>
                </div>
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
                <FaCheckCircle />
              </span>
              Review & Confirm Details
            </h3>

            <div className="space-y-6">
              {/* School Details Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">School Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 font-medium">School Name:</span> <span className="font-bold text-slate-800">{form.schoolName}</span></div>
                  <div>
                    <span className="text-slate-500 font-medium">Organization:</span>{" "}
                    <span className="font-bold text-slate-800">
                      {organizations.find(o => o._id === form.organizationId)?.organizationName || form.organizationId}
                    </span>
                  </div>
                  <div><span className="text-slate-500 font-medium">Branch Creation ID:</span> <span className="font-bold text-slate-800">{form.branchCreationId}</span></div>
                  <div><span className="text-slate-500 font-medium">Established Year:</span> <span className="font-bold text-slate-800">{form.yearOfEstablishment || "N/A"}</span></div>
                  <div><span className="text-slate-500 font-medium">School Ranking:</span> <span className="font-bold text-slate-800">{form.schoolRanking || "N/A"}</span></div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 font-medium">Official Email:</span> <span className="font-bold text-slate-800">{form.officialEmail}</span></div>
                  <div><span className="text-slate-500 font-medium">Official Phone:</span> <span className="font-bold text-slate-800">{form.officialPhone}</span></div>
                  <div><span className="text-slate-500 font-medium">Website URL:</span> <span className="font-bold text-slate-800">{form.website || "N/A"}</span></div>
                </div>
              </div>

              {/* Address Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Address & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="md:col-span-2"><span className="text-slate-500 font-medium">Address:</span> <span className="font-bold text-slate-800">{form.address}</span></div>
                  <div><span className="text-slate-500 font-medium">City:</span> <span className="font-bold text-slate-800">{form.city}</span></div>
                  <div><span className="text-slate-500 font-medium">State:</span> <span className="font-bold text-slate-800">{form.state}</span></div>
                  <div><span className="text-slate-500 font-medium">Country:</span> <span className="font-bold text-slate-800">{form.country}</span></div>
                  <div><span className="text-slate-500 font-medium">Pincode:</span> <span className="font-bold text-slate-800">{form.pinCode}</span></div>
                </div>
              </div>

              {/* Academics & Principal Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Additional & Academic Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 font-medium">Board:</span> <span className="font-bold text-slate-800">{form.board}</span></div>
                  <div><span className="text-slate-500 font-medium">Medium:</span> <span className="font-bold text-slate-800">{form.mediumOfInstruction}</span></div>
                  <div><span className="text-slate-500 font-medium">School Type:</span> <span className="font-bold text-slate-800">{form.schoolType}</span></div>
                  <div><span className="text-slate-500 font-medium">Total Staff:</span> <span className="font-bold text-slate-800">{form.totalStaff}</span></div>
                  <div><span className="text-slate-500 font-medium">Enrollment Capacity:</span> <span className="font-bold text-slate-800">{form.enrollmentCapacity}</span></div>
                  <div><span className="text-slate-500 font-medium">Grades Offered:</span> <span className="font-bold text-slate-800">{form.gradesOffered}</span></div>
                  <div className="md:col-span-2 border-t border-slate-200/60 pt-3 mt-1"></div>
                  <div><span className="text-slate-500 font-medium">Principal Name:</span> <span className="font-bold text-slate-800">{form.principalName}</span></div>
                  <div><span className="text-slate-500 font-medium">Principal Email:</span> <span className="font-bold text-slate-800">{form.principalEmail}</span></div>
                  <div><span className="text-slate-500 font-medium">Principal Phone:</span> <span className="font-bold text-slate-800">{form.principalPhone}</span></div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-blue-50/40 border border-blue-100 rounded-2xl">
                <input
                  type="checkbox"
                  id="isConfirmed"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="isConfirmed" className="text-xs sm:text-sm font-bold text-slate-700 cursor-pointer select-none">
                  I confirm that all information entered above is correct.
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-xs font-semibold mt-4 text-left">
            ⚠️ {errors.submit}
          </div>
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
              disabled={fetchingClasses || (currentStep === 3 && classesLoaded && orgClasses.length === 0)}
              className="bg-gradient-to-r from-[#ffb0a0] to-[#fc9d8b] hover:from-[#f98a75] hover:to-[#eb816c] active:scale-95 text-white px-8 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <FaArrowRight />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !isConfirmed}
              className={`bg-gradient-to-r from-[#ffb0a0] to-[#fc9d8b] text-white px-8 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
                loading || !isConfirmed
                  ? "opacity-50 cursor-not-allowed saturate-50 shadow-none"
                  : "hover:from-[#f98a75] hover:to-[#eb816c] active:scale-95 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></span>
                  Submitting Request...
                </>
              ) : (
                <>
                  Submit Registration <FaCheckCircle />
                </>
              )}
            </button>
          )}
        </div>
      </form>


    </div>
  );
}
