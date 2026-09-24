import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import axiosInstance from "axios";
import { useSelector, useDispatch } from "react-redux";
import { selectSuperAdmin } from "../../features/auth/superAuthSlice";
import { getAllSchools } from "../../features/superAdmin/superAdminSlice";
import toast from "react-hot-toast";
import api from "../../services/api";

const steps = ["School Info", "Academics & Capacity", "Principal Details"];

// Dynamic data generators for dropdowns
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const GRADE_OPTIONS = [
  "Nursery",
  "Junior KG",
  "Senior KG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

// Regex Patterns
const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{9,14}$/, // 10-15 digits, optional +
  pinCode: /^[1-9][0-9]{5}$/, // 6 digit PIN (Indian standard)
  website: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
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

const parsePhone = (phoneStr) => {
  if (!phoneStr) return { code: "+91", number: "" };
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sortedCodes) {
    if (phoneStr.startsWith(c.code)) {
      return { code: c.code, number: phoneStr.substring(c.code.length).trim() };
    }
  }
  if (phoneStr.startsWith("+")) {
    const match = phoneStr.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return { code: match[1], number: match[2].trim() };
    }
  }
  return { code: "+91", number: phoneStr.replace(/\D/g, "") };
};

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

function SearchableSelect({ value, onChange, options, placeholder, errorMsg }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`border rounded-lg px-4 py-3 w-full bg-white focus:outline-none cursor-pointer flex justify-between items-center transition-colors ${
          isOpen ? "ring-2 ring-blue-400 border-blue-400" : errorMsg ? "border-red-400 bg-red-50" : "border-gray-200"
        }`}
      >
        <span className={value ? "text-slate-800 font-semibold" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <span className="text-gray-500 text-xs">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            type="text"
            placeholder="Search board..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                  }}
                  className={`px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-blue-50 transition-colors ${
                    opt === value ? "bg-blue-100 text-blue-800 font-semibold" : "text-slate-700"
                  }`}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No boards found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const fetchPincodeDetails = async (pin) => {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await response.json();
    if (data && data[0] && data[0].Status === "Success") {
      const postOffice = data[0].PostOffice[0];
      return {
        city: postOffice.District || postOffice.Division || "",
        state: postOffice.State || "",
        country: "India"
      };
    }
  } catch (err) {
    console.error("Failed to fetch pincode details:", err);
  }
  return null;
};



const INITIAL_FORM = {
  // Step 1
  schoolName: "",
  yearOfEstablishment: "",
  board: "",
  schoolRanking: "",
  country: "",
  state: "",
  city: "",
  pinCode: "",
  address: "",
  officialPhone: "",
  officialEmail: "",
  website: "",
  organizationId: "",
  // Step 2
  enrollmentCapacity: "",
  gradesOffered: "",
  mediumOfInstruction: "",
  schoolType: "",
  // Step 3
  principalName: "",
  principalEmail: "",
  principalPhone: "",
  totalStaff: "",
};

function AddSchoolPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [organizations, setOrganizations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [officialPhoneCode, setOfficialPhoneCode] = useState("+91");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");
  const [principalPhoneCode, setPrincipalPhoneCode] = useState("+91");
  const [principalPhoneNumber, setPrincipalPhoneNumber] = useState("");

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


  const dispatch = useDispatch();
  const authUser = useSelector(selectSuperAdmin);
  const autoOrganizationId =
    authUser?.organization?._id || authUser?.organizationId || "";

  useEffect(() => {
    if (autoOrganizationId) {
      dispatch(getAllSchools({ status: "all", organizationId: autoOrganizationId }));
    }
  }, [dispatch, autoOrganizationId]);

  const schools = useSelector((state) => state.superAdmin.schools) || [];

  const [orgDetails, setOrgDetails] = useState(null);
  const [fetchingOrg, setFetchingOrg] = useState(true);

  const fetchOrgCapacity = async () => {
    try {
      setFetchingOrg(true);
      const res = await api.get("/organization/my-subscription");
      if (res.data && res.data.success) {
        setOrgDetails(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch organization capacity:", err);
    } finally {
      setFetchingOrg(false);
    }
  };

  useEffect(() => {
    fetchOrgCapacity();
  }, []);

  const quotas = orgDetails?.quotas || authUser?.organization?.quotas || {
    maxSchools: 1,
    maxStudents: 500,
    maxStaff: 70,
  };

  const maxBranches = quotas.maxSchools || 1;
  const usedBranches = schools.length;
  const remainingBranches = Math.max(0, maxBranches - usedBranches);

  const maxStudents = quotas.maxStudents || 500;

  const usage = React.useMemo(() => {
    return schools.reduce(
      (acc, s) => {
        acc.students += Number(s.enrollmentCapacity) || 0;
        if (s.totalStaff !== undefined && s.totalStaff !== null && s.totalStaff !== "") {
          acc.staff += Number(s.totalStaff) || 0;
        } else {
          acc.staff += (Number(s.totalTeachingStaff) || 0) + (Number(s.totalNonTeachingStaff) || 0);
        }
        return acc;
      },
      { students: 0, staff: 0 }
    );
  }, [schools]);

  const maxStaffQuota = quotas.maxStaff !== undefined
    ? quotas.maxStaff
    : (quotas.maxTeachingStaff || 0) + (quotas.maxNonTeachingStaff || 0) || 70;

  const usedStudents = usage.students;
  const usedStaff = usage.staff;

  const remainingStudents = Math.max(0, maxStudents - usedStudents);
  const remainingStaff = Math.max(0, maxStaffQuota - usedStaff);

  useEffect(() => {
    if (autoOrganizationId) {
      setForm((prev) => ({
        ...prev,
        organizationId: autoOrganizationId || prev.organizationId,
      }));
    }
  }, [autoOrganizationId]);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await axiosInstance.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/school/organizations`,
        );
        if (res.data.success) {
          setOrganizations(res.data.data.organizations);
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
      }
    };
    fetchOrgs();
  }, []);

  const update = (field) => (e) => {
    const valStr = e.target.value;
    setForm((f) => ({ ...f, [field]: valStr }));

    // Real-time validation for enrollmentCapacity (Max Students)
    if (field === "enrollmentCapacity") {
      const val = Number(valStr);
      setErrors((prev) => {
        const next = { ...prev };
        if (valStr.trim() === "") {
          next.enrollmentCapacity = "Required";
        } else if (val < 0) {
          next.enrollmentCapacity = "Capacity cannot be negative";
        } else if (val > remainingStudents) {
          next.enrollmentCapacity = "Cannot allocate more than remaining organization quota.";
        } else {
          delete next.enrollmentCapacity;
        }
        return next;
      });
    }

    // Real-time validation for totalStaff (Max Staff)
    else if (field === "totalStaff") {
      const val = Number(valStr);
      setErrors((prev) => {
        const next = { ...prev };
        if (valStr.trim() === "") {
          next.totalStaff = "Required";
        } else if (val < 0) {
          next.totalStaff = "Cannot be negative";
        } else if (val > remainingStaff) {
          next.totalStaff = "Cannot allocate more staff than remaining organization quota.";
        } else {
          delete next.totalStaff;
        }
        return next;
      });
    }

    else {
      if (errors[field])
        setErrors((prev) => {
          const n = { ...prev };
          delete n[field];
          return n;
        });
    }
  };


  const handleCountryChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, country: val }));
    if (errors.country) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs.country;
        return newErrs;
      });
    }

    const matched = COUNTRY_CODES.find(
      (c) => c.country.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setOfficialPhoneCode(matched.code);
      setPrincipalPhoneCode(matched.code);
    }
  };


  // ── Strict Validation ────────────────────────────────────────────────────
  const validateStep = () => {
    const errs = {};

    if (step === 0) {
      if (!form.schoolName.trim()) errs.schoolName = "Required";
      if (!form.address.trim()) errs.address = "Required";
      if (!form.organizationId) errs.organizationId = "Required";

      // If State Board is selected, State MUST be filled
      if (form.board === "State Board" && !form.state.trim()) {
        errs.state = "State is required when selecting State Board";
      }

      if (!officialPhoneNumber.trim()) {
        errs.officialPhone = "Required";
      } else if (officialPhoneCode === "+91" && officialPhoneNumber.trim().length !== 10) {
        errs.officialPhone = "Indian phone numbers must be exactly 10 digits";
      } else if (officialPhoneNumber.trim().length < 7 || officialPhoneNumber.trim().length > 15) {
        errs.officialPhone = "Invalid phone number length (7 to 15 digits)";
      }


      if (!form.officialEmail.trim()) {
        errs.officialEmail = "Required";
      } else if (!REGEX.email.test(form.officialEmail)) {
        errs.officialEmail = "Invalid email format";
      }

      if (form.pinCode && !REGEX.pinCode.test(form.pinCode)) {
        errs.pinCode = "Invalid PIN (6 digits required)";
      }
      if (form.website && !REGEX.website.test(form.website)) {
        errs.website = "Invalid URL format";
      }
    }

    if (step === 1) {
      if (!form.enrollmentCapacity || String(form.enrollmentCapacity).trim() === "") {
        errs.enrollmentCapacity = "Required";
      } else {
        const val = Number(form.enrollmentCapacity);
        if (val < 0) {
          errs.enrollmentCapacity = "Capacity cannot be negative";
        } else if (val > remainingStudents) {
          errs.enrollmentCapacity = "Cannot allocate more than remaining organization quota.";
        }
      }

      if (!form.totalStaff || String(form.totalStaff).trim() === "") {
        errs.totalStaff = "Required";
      } else {
        const val = Number(form.totalStaff);
        if (val < 0) {
          errs.totalStaff = "Cannot be negative";
        } else if (val > remainingStaff) {
          errs.totalStaff = "Cannot allocate more staff than remaining organization quota.";
        }
      }

      if (!form.gradesOffered || form.gradesOffered.trim() === "") {
        errs.gradesOffered = "At least one grade must be selected";
      }
    }

    if (step === 2) {
      if (!form.principalName.trim()) errs.principalName = "Required";

      if (!form.principalEmail.trim()) {
        errs.principalEmail = "Required";
      } else if (!REGEX.email.test(form.principalEmail)) {
        errs.principalEmail = "Invalid email format";
      }

      if (principalPhoneNumber.trim()) {
        if (principalPhoneCode === "+91" && principalPhoneNumber.trim().length !== 10) {
          errs.principalPhone = "Indian phone numbers must be exactly 10 digits";
        } else if (principalPhoneNumber.trim().length < 7 || principalPhoneNumber.trim().length > 15) {
          errs.principalPhone = "Invalid phone number length (7 to 15 digits)";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    const currentSchools = schools.length;

    if (currentSchools >= maxBranches) {
      toast.error(
        <div className="text-left">
          <strong className="block font-black text-sm">School Limit Reached</strong>
          <span className="text-xs">
            You have already used all allocated school slots ({currentSchools}/{maxBranches}).
            Please increase capacity before creating a new school.
          </span>
        </div>,
        { id: "school-limit-toast", duration: 5000 }
      );
      setErrors((prev) => ({
        ...prev,
        submit: `You have already used all allocated school slots (${currentSchools}/${maxBranches}). Please increase capacity before creating a new school.`,
      }));
      return;
    }

    if (!validateStep()) return;
    setLoading(true);

    const payload = { ...form };

    // Dynamic State Board Formatting
    if (payload.board === "State Board" && payload.state.trim()) {
      payload.board = `${payload.state.trim()} State Board`;
    }

    try {
      await axiosInstance.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/school/register`,
        payload,
      );
      await fetchOrgCapacity();
      if (autoOrganizationId) {
        dispatch(getAllSchools({ status: "all", organizationId: autoOrganizationId }));
      }
      setSubmitted(true);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Submission failed. Try again.";
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field, isReadOnly = false) =>
    `border rounded-lg px-4 py-3 w-full focus:outline-none transition-colors appearance-none ${
      isReadOnly
        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-100"
        : "bg-white focus:ring-2 focus:ring-blue-400"
    } ${!isReadOnly && errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  const ErrMsg = ({ field }) =>
    errors[field] ? (
      <p className="text-red-500 text-xs mt-1 font-semibold">{errors[field]}</p>
    ) : null;

  // ── Loading Capacity State ──────────────────────────────────────────────
  if (fetchingOrg) {
    return (
      <div className="w-full flex justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></span>
          <p className="text-slate-500 font-semibold text-sm">Fetching capacity limits...</p>
        </div>
      </div>
    );
  }

  // ── Success State ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="w-full h-full flex flex-col items-center p-2 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.1,
            }}
            className="flex justify-center mb-6"
          >
            <FaCheckCircle className="text-green-500 text-7xl drop-shadow-md" />
          </motion.div>

          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
            School Provisioned!
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
            <span className="text-slate-800 font-bold">{form.schoolName}</span>{" "}
            has been successfully created and linked to your organization.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/superadmin")} // Update this path to match your dashboard route
              className="px-6 py-3 rounded-xl font-semibold border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setForm(INITIAL_FORM);
                setOfficialPhoneCode("+91");
                setOfficialPhoneNumber("");
                setPrincipalPhoneCode("+91");
                setPrincipalPhoneNumber("");
                setStep(0);
                setSubmitted(false);
              }}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Add Another School
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Standard Form ────────────────────────────────────────────────────────
  return (
    <div className="w-full flex justify-center py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b bg-white/50 shadow-sm rounded-t-2xl">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Register New Branch
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Instantly provision a new school under your organization
          </p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between px-8 pt-8 pb-4 bg-white/30">
          {steps.map((label, index) => (
            <div key={index} className="flex-1 text-center relative">
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${step > index ? "bg-blue-500" : "bg-gray-200"}`}
                />
              )}
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold relative z-10 transition-colors duration-300
                ${step > index ? "bg-green-500 text-white shadow-md shadow-green-500/30" : step === index ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-gray-200 text-gray-500"}`}
              >
                {step > index ? "✓" : index + 1}
              </div>
              <p
                className={`text-sm mt-3 font-semibold transition-colors duration-300 ${step === index ? "text-blue-600" : "text-gray-400"}`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6 flex-1 bg-white/60">
          {/* ── STEP 1: School Info ── */}
          {step === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="font-bold text-xl mb-6 text-slate-800 border-b pb-2">
                School Information
              </h3>
              {remainingBranches <= 0 && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm font-semibold mb-6">
                  ⚠️ You have reached the maximum branch allocation assigned by Graphura Admin.
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="School Name *"
                    value={form.schoolName}
                    onChange={update("schoolName")}
                    className={inputCls("schoolName")}
                  />
                  <ErrMsg field="schoolName" />
                </div>

                <div className="relative md:col-span-2">
                  <select
                    value={form.organizationId}
                    onChange={update("organizationId")}
                    disabled={!!autoOrganizationId}
                    className={inputCls("organizationId", !!autoOrganizationId)}
                  >
                    <option value="">Select Organization *</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.organizationName} ({org.organizationId})
                      </option>
                    ))}
                  </select>
                  {!autoOrganizationId && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      ▼
                    </div>
                  )}
                  <ErrMsg field="organizationId" />
                </div>

                <div className="relative">
                  <select
                    value={form.yearOfEstablishment}
                    onChange={update("yearOfEstablishment")}
                    className={inputCls("yearOfEstablishment")}
                  >
                    <option value="">Year of Establishment</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    ▼
                  </div>
                </div>

                <div className="relative">
                  <SearchableSelect
                    value={form.board}
                    onChange={(val) => {
                      setForm((prev) => ({ ...prev, board: val }));
                      if (errors.board) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.board;
                          return n;
                        });
                      }
                    }}
                    options={INDIAN_BOARDS}
                    placeholder="Select Board *"
                    errorMsg={errors.board}
                  />
                  <ErrMsg field="board" />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="School Ranking (optional)"
                    value={form.schoolRanking}
                    onChange={update("schoolRanking")}
                    className={inputCls("schoolRanking")}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Country"
                    value={form.country}
                    onChange={handleCountryChange}
                    className={inputCls("country")}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={update("state")}
                    className={inputCls("state")}
                  />
                  <ErrMsg field="state" />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={update("city")}
                    className={inputCls("city")}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="PIN / ZIP Code"
                    value={form.pinCode}
                    onChange={async (e) => {
                      const numericVal = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({ ...f, pinCode: numericVal }));
                      if (errors.pinCode) {
                        setErrors((prev) => {
                          const newErrs = { ...prev };
                          delete newErrs.pinCode;
                          return newErrs;
                        });
                      }
                      if (numericVal.length === 6) {
                        const details = await fetchPincodeDetails(numericVal);
                        if (details) {
                          setForm((prev) => ({
                            ...prev,
                            city: details.city,
                            state: details.state,
                            country: details.country,
                          }));
                          setOfficialPhoneCode("+91");
                          setPrincipalPhoneCode("+91");
                        }
                      }
                    }}
                    className={inputCls("pinCode")}
                    maxLength={6}
                  />
                  <ErrMsg field="pinCode" />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Full Address *"
                    value={form.address}
                    onChange={update("address")}
                    className={inputCls("address")}
                  />
                  <ErrMsg field="address" />
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative w-36 shrink-0">
                      <select
                        value={officialPhoneCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setOfficialPhoneCode(code);
                          const matched = COUNTRY_CODES.find(c => c.code === code);
                          if (matched && (!form.country || form.country.trim() === "")) {
                            setForm(prev => ({ ...prev, country: matched.country }));
                          }
                          if (errors.officialPhone) {
                            setErrors((prev) => {
                              const newErrs = { ...prev };
                              delete newErrs.officialPhone;
                              return newErrs;
                            });
                          }
                        }}
                        className="border rounded-lg px-3 py-3 w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 border-gray-200 transition-colors appearance-none"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        ▼
                      </div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        placeholder="Official Phone *"
                        value={officialPhoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const limit = officialPhoneCode === "+91" ? 10 : 15;
                          if (val.length <= limit) {
                            setOfficialPhoneNumber(val);
                          }
                          if (errors.officialPhone) {
                            setErrors((prev) => {
                              const newErrs = { ...prev };
                              delete newErrs.officialPhone;
                              return newErrs;
                            });
                          }
                        }}
                        className={inputCls("officialPhone")}
                      />
                    </div>
                  </div>
                  <ErrMsg field="officialPhone" />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Official Email Address *"
                    value={form.officialEmail}
                    onChange={update("officialEmail")}
                    className={inputCls("officialEmail")}
                  />
                  <ErrMsg field="officialEmail" />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="url"
                    placeholder="Website URL (https://...)"
                    value={form.website}
                    onChange={update("website")}
                    className={inputCls("website")}
                  />
                  <ErrMsg field="website" />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Academics & Capacity ── */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="font-bold text-xl mb-6 text-slate-800 border-b pb-2">
                Academics &amp; Capacity
              </h3>

              {/* Capacity Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4">
                  Organization Capacity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Branches */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase">Branches</span>
                    <div className="text-lg font-black text-slate-800 mt-1">
                      {usedBranches} / {maxBranches} Used
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Remaining : {remainingBranches}
                    </div>
                  </div>
                  {/* Students */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase">Students</span>
                    <div className="text-lg font-black text-slate-800 mt-1">
                      {usedStudents} / {maxStudents} Used
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Remaining : {remainingStudents}
                    </div>
                  </div>
                  {/* Staff */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase">Staff</span>
                    <div className="text-lg font-black text-slate-800 mt-1">
                      {usedStaff} / {maxStaffQuota} Used
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Remaining : {remainingStaff}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block flex justify-between">
                    <span>Max Students *</span>
                    <span className="text-blue-600 font-semibold text-right">
                      Remaining Quota:<br />{remainingStudents} of {maxStudents} seats
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder={`Max Students (Max ${remainingStudents} seats)`}
                    value={form.enrollmentCapacity}
                    onChange={update("enrollmentCapacity")}
                    className={inputCls("enrollmentCapacity")}
                    min="0"
                  />
                  {form.enrollmentCapacity && Number(form.enrollmentCapacity) >= 0 && Number(form.enrollmentCapacity) <= remainingStudents && (
                    <p className="text-green-600 text-xs mt-1 font-semibold">
                      Remaining After Allocation: {remainingStudents - Number(form.enrollmentCapacity)} Seats
                    </p>
                  )}
                  <ErrMsg field="enrollmentCapacity" />
                </div>

                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block flex justify-between">
                    <span>Max Staff *</span>
                    <span className="text-blue-600 font-semibold text-right">
                      Remaining Quota:<br />{remainingStaff} of {maxStaffQuota} staff
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder={`Max Staff (Max ${remainingStaff})`}
                    value={form.totalStaff}
                    onChange={update("totalStaff")}
                    className={inputCls("totalStaff")}
                    min="0"
                  />
                  {form.totalStaff && Number(form.totalStaff) >= 0 && Number(form.totalStaff) <= remainingStaff && (
                    <p className="text-green-600 text-xs mt-1 font-semibold">
                      Remaining After Allocation: {remainingStaff - Number(form.totalStaff)} Staff
                    </p>
                  )}
                  <ErrMsg field="totalStaff" />
                </div>

                <div className="relative">
                  <select
                    value={form.schoolType}
                    onChange={update("schoolType")}
                    className={inputCls("schoolType")}
                  >
                    <option value="">School Type</option>
                    <option>Co-ed</option>
                    <option>Boys Only</option>
                    <option>Girls Only</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    ▼
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={form.mediumOfInstruction}
                    onChange={update("mediumOfInstruction")}
                    className={inputCls("mediumOfInstruction")}
                  >
                    <option value="">Medium of Instruction</option>
                    <option>English</option>
                    <option>Hindi</option>
                    <option>English + Hindi</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    ▼
                  </div>
                </div>

                {/* Checkbox Grade Selector */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-2 block">
                    Grades Offered *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {GRADE_OPTIONS.map((grade) => {
                      const selectedGrades = form.gradesOffered ? form.gradesOffered.split(", ").filter(Boolean) : [];
                      const isChecked = selectedGrades.includes(grade);
                      return (
                        <label
                          key={grade}
                          className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${
                            isChecked
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => {
                              let nextGrades;
                              if (isChecked) {
                                nextGrades = selectedGrades.filter((g) => g !== grade);
                              } else {
                                nextGrades = [...selectedGrades, grade];
                              }
                              nextGrades.sort((a, b) => GRADE_OPTIONS.indexOf(a) - GRADE_OPTIONS.indexOf(b));
                              setForm((prev) => ({ ...prev, gradesOffered: nextGrades.join(", ") }));
                              if (errors.gradesOffered) {
                                setErrors((prev) => {
                                  const newErrs = { ...prev };
                                  delete newErrs.gradesOffered;
                                  return newErrs;
                                });
                              }
                            }}
                          />
                          {grade}
                        </label>
                      );
                    })}
                  </div>
                  <ErrMsg field="gradesOffered" />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Principal Details ── */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="font-bold text-xl mb-6 text-slate-800 border-b pb-2">
                Principal Details
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <input
                    type="text"
                    placeholder="Principal Name *"
                    value={form.principalName}
                    onChange={update("principalName")}
                    className={inputCls("principalName")}
                  />
                  <ErrMsg field="principalName" />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Principal Email *"
                    value={form.principalEmail}
                    onChange={update("principalEmail")}
                    className={inputCls("principalEmail")}
                  />
                  <ErrMsg field="principalEmail" />
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative w-36 shrink-0">
                      <select
                        value={principalPhoneCode}
                        onChange={(e) => {
                          setPrincipalPhoneCode(e.target.value);
                          if (errors.principalPhone) {
                            setErrors((prev) => {
                              const newErrs = { ...prev };
                              delete newErrs.principalPhone;
                              return newErrs;
                            });
                          }
                        }}
                        className="border rounded-lg px-3 py-3 w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 border-gray-200 transition-colors appearance-none"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        ▼
                      </div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        placeholder="Principal Phone"
                        value={principalPhoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const limit = principalPhoneCode === "+91" ? 10 : 15;
                          if (val.length <= limit) {
                            setPrincipalPhoneNumber(val);
                          }
                          if (errors.principalPhone) {
                            setErrors((prev) => {
                              const newErrs = { ...prev };
                              delete newErrs.principalPhone;
                              return newErrs;
                            });
                          }
                        }}
                        className={inputCls("principalPhone")}
                      />
                    </div>
                  </div>
                  <ErrMsg field="principalPhone" />
                </div>
              </div>
            </motion.div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm mt-4 font-semibold">
              ⚠️ {errors.submit}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between pt-8 mt-4 border-t border-gray-100">
            <button
              onClick={back}
              disabled={step === 0}
              className="px-6 py-3 rounded-xl font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={next}
                disabled={remainingBranches <= 0 || !!errors.enrollmentCapacity || !!errors.totalStaff}
                className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || remainingBranches <= 0 || !!errors.enrollmentCapacity || !!errors.totalStaff}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-slate-800 to-sky-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-lg transition-opacity hover:opacity-90 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Provisioning...
                  </>
                ) : (
                  "Create School ✓"
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AddSchoolPage;
