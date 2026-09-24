import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { School, BookOpen, UserCheck, AlertCircle, CheckCircle2, ChevronDown, Building2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { selectSuperAdmin } from "../../features/auth/superAuthSlice";
import { getAllSchools } from "../../features/superAdmin/superAdminSlice";
import toast from "react-hot-toast";
import api from "../../services/api";
import { getOrganizationClasses } from "../../services/api/organizationApi";
import { sortGrades } from "../../utils/gradeSorter";

const steps = ["School Info", "Academics & Capacity", "Principal Details"];

// Dynamic data generators for dropdowns
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => currentYear - i);

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
        className={`border rounded-xl px-5 py-4 w-full bg-white focus:outline-none cursor-pointer flex justify-between items-center transition-colors ${
          isOpen ? "ring-2 ring-[#2524D1]/20 border-[#2524D1]" : errorMsg ? "border-red-400 bg-red-50" : "border-slate-300"
        }`}
      >
        <span className={value ? "text-slate-800 font-semibold" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <span className="text-gray-500 text-xs"><ChevronDown size={14} /></span>
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

function AddSchoolPage({ isEmbedded }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [organizations, setOrganizations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [officialPhoneCode, setOfficialPhoneCode] = useState("+91");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");
  const [principalPhoneCode, setPrincipalPhoneCode] = useState("+91");
  const [principalPhoneNumber, setPrincipalPhoneNumber] = useState("");
  const [orgClasses, setOrgClasses] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [classesLoaded, setClassesLoaded] = useState(false);

  // Sync selectedGrades with form.gradesOffered (for draft loading / external changes)
  useEffect(() => {
    const parsed = form.gradesOffered ? form.gradesOffered.split(", ").filter(Boolean) : [];
    if (parsed.join(", ") !== (selectedGrades || []).join(", ")) {
      setSelectedGrades(parsed);
    }
  }, [form.gradesOffered]);

  // Fetch classes when organizationId changes - exactly as in SchoolRegistrationForm.jsx
  useEffect(() => {
    const fetchClasses = async () => {
      if (!form.organizationId) {
        setOrgClasses([]);
        setClassesLoaded(false);
        return;
      }
      try {
        setFetchingClasses(true);
        const res = await api.get(`/school/organizations/${form.organizationId}/classes`);
        if (res.data && res.data.success) {
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

  // handleGradeToggle - exactly as in SchoolRegistrationForm.jsx
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
  const [fetchingOrg, setFetchingOrg] = useState(!isEmbedded);
  const [capacityLoaded, setCapacityLoaded] = useState(false);

  const fetchOrgCapacity = async () => {
    if (isEmbedded) return;
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
      setCapacityLoaded(true);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setFetchingOrg(true);
        const promises = [];

        // Fetch organizations list
        promises.push(
          api.get("/school/organizations").then((res) => {
            if (res.data.success) {
              setOrganizations(res.data.data.organizations);
            }
          }).catch((err) => {
            console.error("Failed to fetch organizations:", err);
          })
        );

        // Fetch capacity details if not embedded
        if (!isEmbedded) {
          promises.push(
            api.get("/organization/my-subscription").then((res) => {
              if (res.data && res.data.success) {
                setOrgDetails(res.data.data);
              }
            }).catch((err) => {
              console.error("Failed to fetch organization capacity:", err);
            })
          );
        }

        await Promise.all(promises);
      } finally {
        setFetchingOrg(false);
        setCapacityLoaded(true);
      }
    };
    loadInitialData();
  }, [isEmbedded]);

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
  const validateForm = () => {
    const errs = {};

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

    if (orgClasses.length === 0) {
      errs.gradesOffered = "No classes created yet. Please create classes first from Organization Classes.";
    } else if (!form.gradesOffered || form.gradesOffered.trim() === "") {
      errs.gradesOffered = "At least one grade must be selected";
    } else {
      const availableClassNames = (Array.isArray(orgClasses) ? orgClasses : []).map((c) => c?.name).filter(Boolean);
      const invalidGrades = (selectedGrades || []).filter(g => !availableClassNames.includes(g));
      if (invalidGrades.length > 0) {
        errs.gradesOffered = `The following selected grades no longer exist: ${invalidGrades.join(", ")}. Please update your selection.`;
      }
    }

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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }
    setLoading(true);

    const payload = {
      ...form,
      gradesOffered: form.gradesOffered,
    };

    // Dynamic State Board Formatting
    if (payload.board === "State Board" && payload.state.trim()) {
      payload.board = `${payload.state.trim()} State Board`;
    }

    try {
      await api.post("/super-admin/schools", payload);
      await fetchOrgCapacity();
      if (autoOrganizationId) {
        dispatch(getAllSchools({ status: "all", organizationId: autoOrganizationId }));
      }
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Submission failed. Try again.";
      const authErrors = ["not logged in", "unauthorized", "invalid token"];
      if (authErrors.includes(msg.toLowerCase()) || err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        return;
      }
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field, isReadOnly = false) =>
    `w-full px-5 py-4 border rounded-xl focus:outline-none transition-all text-sm font-semibold text-slate-800 ${
      isReadOnly
        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-100"
        : "bg-white placeholder-slate-500 focus:ring-2 focus:ring-[#2524D1]/20 focus:border-[#2524D1]"
    } ${!isReadOnly && errors[field] ? "border-red-400 bg-red-50" : "border-slate-300"}`;

  const ErrMsg = ({ field }) =>
    errors[field] ? (
      <p className="text-red-500 text-xs mt-1 font-semibold">{errors[field]}</p>
    ) : null;

  // ── Success State ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-8 sm:p-12 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="flex justify-center mb-6"
          >
            <CheckCircle2 size={72} className="text-green-500 drop-shadow-sm" />
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            School Provisioned!
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium mb-10 leading-relaxed px-4">
            <span className="text-slate-800 font-bold">{form.schoolName}</span>{" "}
            has been successfully created and linked to your organization.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <button
              onClick={() => navigate("/superadmin")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] text-sm shrink-0"
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
                setSubmitted(false);
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-white bg-[#F59B87] hover:bg-[#e28a76] hover:shadow-lg hover:shadow-orange-500/10 active:scale-[0.98] transition-all duration-200 text-sm"
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
    <div className={isEmbedded ? "w-full flex flex-col" : "w-full flex justify-center py-6"}>
      <motion.div
        initial={isEmbedded ? false : { opacity: 0, y: 20 }}
        animate={isEmbedded ? false : { opacity: 1, y: 0 }}
        className={isEmbedded ? "w-full flex flex-col flex-1" : "w-full max-w-4xl bg-slate-50 border border-slate-100 rounded-3xl shadow-xl overflow-hidden flex flex-col"}
      >
        {!isEmbedded && (
          <div className="bg-[#223F74] p-8 text-left text-white shrink-0 relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <School size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Add New School</h2>
                <p className="text-slate-100 mt-1 text-sm font-medium">Provision and configure a new school branch under your organization</p>
              </div>
            </div>
          </div>
        )}
        
        <div className={isEmbedded ? "w-full space-y-8" : "p-6 sm:p-8 space-y-8 flex-1 overflow-y-auto"}>
          {isEmbedded && (
            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <School className="text-[#2524D1]" /> Register Your School
                </h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">
                  Add a new school to your organization
                </p>
              </div>
            </div>
          )}

          {/* Capacity alerts at the top */}
          {capacityLoaded && (remainingBranches <= 0 || remainingStudents <= 0 || remainingStaff <= 0) && (
            <div className="space-y-3">
              {remainingBranches <= 0 && (
                <div className="flex gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-semibold animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-bold text-slate-900">Maximum Branch Allocation Reached</p>
                    <p className="text-xs text-rose-600/90 font-medium mt-0.5">You have reached the maximum branch allocation assigned by Graphura Admin.</p>
                  </div>
                </div>
              )}
              {remainingStudents <= 0 && (
                <div className="flex gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-semibold animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-bold text-slate-900">Maximum Student Allocation Reached</p>
                    <p className="text-xs text-rose-600/90 font-medium mt-0.5">You have reached the maximum student allocation assigned by Graphura Admin.</p>
                  </div>
                </div>
              )}
              {remainingStaff <= 0 && (
                <div className="flex gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-semibold animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-bold text-slate-900">Maximum Staff Allocation Reached</p>
                    <p className="text-xs text-rose-600/90 font-medium mt-0.5">You have reached the maximum staff allocation assigned by Graphura Admin.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: School Info Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-[#2524D1] flex items-center justify-center shadow-sm">
                <Building2 size={18} />
              </span>
              School Information
            </h3>
            <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">School Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Graphura International School"
                    value={form.schoolName}
                    onChange={update("schoolName")}
                    className={inputCls("schoolName")}
                  />
                  <ErrMsg field="schoolName" />
                </div>

                <div className="relative md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Organization *</label>
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

                  <ErrMsg field="organizationId" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Year Established</label>
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
                  
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Board *</label>
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">School Ranking</label>
                  <input
                    type="text"
                    placeholder="e.g. Top 10 in City"
                    value={form.schoolRanking}
                    onChange={update("schoolRanking")}
                    className={inputCls("schoolRanking")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Country</label>
                  <input
                    type="text"
                    placeholder="Country"
                    value={form.country}
                    onChange={handleCountryChange}
                    className={inputCls("country")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">State *</label>
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={update("city")}
                    className={inputCls("city")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">PIN / ZIP Code *</label>
                  <input
                    type="text"
                    placeholder="6-digit PIN"
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Address *</label>
                  <input
                    type="text"
                    placeholder="Full address of the school"
                    value={form.address}
                    onChange={update("address")}
                    className={inputCls("address")}
                  />
                  <ErrMsg field="address" />
                </div>
                <div className="relative md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Official Phone *</label>
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
                        className="border rounded-xl px-5 py-4 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#2524D1]/20 focus:border-[#2524D1] border-slate-300 transition-colors appearance-none text-sm font-semibold text-slate-800"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        placeholder="Enter phone number"
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="school@example.com"
                    value={form.officialEmail}
                    onChange={update("officialEmail")}
                    className={inputCls("officialEmail")}
                  />
                  <ErrMsg field="officialEmail" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.website}
                    onChange={update("website")}
                    className={inputCls("website")}
                  />
                  <ErrMsg field="website" />
                </div>
              </div>
            </motion.div>

          {/* ── STEP 2: Academics & Capacity ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-[#2524D1] flex items-center justify-center shadow-sm">
                <BookOpen size={18} />
              </span>
              Academics & Capacity
            </h3>

              {/* Capacity Summary Card hidden */}

              <div className="grid md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">
                    Max Students *
                  </label>
                  <input
                    type="number"
                    placeholder={`Max Students (Max ${remainingStudents} seats)`}
                    value={form.enrollmentCapacity}
                    onChange={update("enrollmentCapacity")}
                    className={inputCls("enrollmentCapacity")}
                    min="0"
                  />
                  {/* Remaining seats indicator hidden */}
                  <ErrMsg field="enrollmentCapacity" />
                </div>

                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">
                    Max Staff *
                  </label>
                  <input
                    type="number"
                    placeholder={`Max Staff (Max ${remainingStaff})`}
                    value={form.totalStaff}
                    onChange={update("totalStaff")}
                    className={inputCls("totalStaff")}
                    min="0"
                  />
                  {/* Remaining staff indicator hidden */}
                  <ErrMsg field="totalStaff" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">School Type</label>
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
                  
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Medium of Instruction</label>
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
                  
                </div>

                {/* Checkbox Grade Selector */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-2 block">
                    Grades Offered *
                  </label>
                  {!form.organizationId ? (
                    <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-5 py-4 text-sm font-medium text-center">
                      Please select an organization in Step 1 to load grades.
                    </div>
                  ) : fetchingClasses ? (
                    <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
                      Loading classes...
                    </div>
                  ) : classesLoaded && orgClasses.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-4 text-sm font-medium">
                      No classes have been created by this organization yet.
                    </div>
                  ) : classesLoaded ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/50 max-h-60 overflow-y-auto">
                      {orgClasses.map((cls) => (
                        <label
                          key={cls._id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border select-none transition-all ${
                            selectedGrades.includes(cls.name)
                              ? "bg-indigo-50 border-indigo-200 text-[#2524D1]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGrades.includes(cls.name)}
                            onChange={() => handleGradeToggle(cls.name)}
                            className="rounded text-[#2524D1] focus:ring-[#2524D1]"
                          />
                          <span className="text-sm font-semibold">{cls.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-5 py-4 text-sm font-medium text-center">
                      Please select an organization in Step 1 to load grades.
                    </div>
                  )}
                  <ErrMsg field="gradesOffered" />
                </div>
              </div>
            </motion.div>

          {/* ── STEP 3: Principal Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-[#2524D1] flex items-center justify-center shadow-sm">
                <UserCheck size={18} />
              </span>
              Principal Details
            </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Principal Name *</label>
                  <input
                    type="text"
                    placeholder="Enter Principal Name"
                    value={form.principalName}
                    onChange={update("principalName")}
                    className={inputCls("principalName")}
                  />
                  <ErrMsg field="principalName" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Principal Email *</label>
                  <input
                    type="email"
                    placeholder="Enter Principal Email"
                    value={form.principalEmail}
                    onChange={update("principalEmail")}
                    className={inputCls("principalEmail")}
                  />
                  <ErrMsg field="principalEmail" />
                </div>
                <div className="relative md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Principal Phone</label>
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
                        className="border rounded-xl px-5 py-4 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#2524D1]/20 focus:border-[#2524D1] border-slate-300 transition-colors appearance-none text-sm font-semibold text-slate-800"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        placeholder="Enter phone number"
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

          {errors.submit && (
            <div className="flex gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-semibold mt-6 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold text-slate-900">Submission Error</p>
                <p className="text-xs text-rose-600/90 font-medium mt-0.5">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-100 w-full">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto bg-[#F59B87] hover:bg-[#e28a76] text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  Submit Application <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AddSchoolPage;
