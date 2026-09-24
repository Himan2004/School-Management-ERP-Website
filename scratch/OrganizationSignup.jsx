import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaSchool,
  FaChartLine,
  FaUserShield,
  FaMapPin,
  FaTimesCircle,
  FaFilePdf,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  registerSuperAdmin,
  clearError,
  clearMessage,
  selectSuperLoading,
  selectSuperError,
  selectSuperMessage,
} from "../../features/auth/superAuthSlice";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-hot-toast";

const SuperAdminSignup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectSuperLoading);
  const error = useSelector(selectSuperError);
  const message = useSelector(selectSuperMessage);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationType: "",
    numberOfBranches: "",
    yearEstablished: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    officialEmail: "",
    contactNumber: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    otp: "",
    registrationNumber: "",
    panNumber: "",
    gstNumber: "",
    subscriptionPlan: "Premium", 
  });

  const [files, setFiles] = useState({
    registrationCertificate: null,
    adminIdProof: null,
    addressProof: null,
    affiliationCertificate: null,
  });

  const {
    organizationName,
    organizationType,
    numberOfBranches,
    yearEstablished,
    address,
    city,
    state,
    country,
    pincode,
    officialEmail,
    contactNumber,
    adminName,
    adminEmail,
    adminPhone,
    otp,
    registrationNumber,
    panNumber,
    gstNumber,
    subscriptionPlan,
  } = formData;

  const [fieldErrors, setFieldErrors] = useState({});

  const [filePreviews, setFilePreviews] = useState({
    registrationCertificate: null,
    adminIdProof: null,
    addressProof: null,
    affiliationCertificate: null,
  });
  
  const [yearMode, setYearMode] = useState("single"); 
  const [selectedSingleYear, setSelectedSingleYear] = useState("");
  const [selectedStartYear, setSelectedStartYear] = useState("");
  const [selectedEndYear, setSelectedEndYear] = useState("");

  const yearsList = Array.from(
    { length: new Date().getFullYear() - 1800 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    if (yearMode === "single") {
      setFormData((prev) => ({ ...prev, yearEstablished: selectedSingleYear }));
    } else {
      const rangeVal =
        selectedStartYear && selectedEndYear
          ? `${selectedStartYear} - ${selectedEndYear}`
          : "";
      setFormData((prev) => ({ ...prev, yearEstablished: rangeVal }));
    }
    setFieldErrors((prev) => ({ ...prev, yearEstablished: undefined }));
  }, [yearMode, selectedSingleYear, selectedStartYear, selectedEndYear]);


  const onChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // 🔥 STRICT NUMBER ENFORCEMENT
    // If it's a phone number or pincode field, strip out anything that isn't a digit
    if (["pincode", "contactNumber", "adminPhone"].includes(name)) {
      newValue = value.replace(/\D/g, "");
    }

    let updatedData = { ...formData, [name]: newValue };

    if (name === "organizationType" && newValue === "Single School") {
      updatedData.numberOfBranches = "1";
    }

    if (name === "adminEmail") {
      setIsOtpVerified(false);
      setOtpSent(false);
      setOtpCooldown(0);
      updatedData.otp = "";
    }

    setFormData(updatedData);
    if (fieldErrors[name])
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    dispatch(clearError());
    dispatch(clearMessage());
  };

  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <p className="text-xs text-red-500 mt-1 ml-1 font-medium">
        {fieldErrors[name]}
      </p>
    ) : null;

  const validators = {
    phone: (val) => /^[0-9]{10}$/.test(val),
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    pincode: (val) => /^[0-9]{6}$/.test(val),
    pan: (val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.toUpperCase()),
    gst: (val) =>
      !val ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        val.toUpperCase(),
      ),
    year: (val) =>
      !val ||
      (/^\d{4}$/.test(val) && +val >= 1800 && +val <= new Date().getFullYear()),
  };

  const validateStep = () => {
    const errors = {};

    if (step === 1) {
      if (!organizationName || organizationName.trim().length < 5)
        errors.organizationName = "Min 5 characters required";
      if (!organizationType) errors.organizationType = "Please select a type";
      if (!numberOfBranches)
        errors.numberOfBranches = "Please select number of branches";
      
      if (yearMode === "single") {
        if (selectedSingleYear) {
          const y = parseInt(selectedSingleYear, 10);
          if (isNaN(y) || y < 1800 || y > new Date().getFullYear()) {
            errors.yearEstablished = `Enter a valid year (1800–${new Date().getFullYear()})`;
          }
        }
      } else {
        if (selectedStartYear || selectedEndYear) {
          if (!selectedStartYear || !selectedEndYear) {
            errors.yearEstablished = "Both start and end years are required for a range";
          } else {
            const start = parseInt(selectedStartYear, 10);
            const end = parseInt(selectedEndYear, 10);
            if (start < 1800 || start > new Date().getFullYear() || end < 1800 || end > new Date().getFullYear()) {
              errors.yearEstablished = `Enter a valid year (1800–${new Date().getFullYear()})`;
            } else if (end < start) {
              errors.yearEstablished = "End year cannot be before start year";
            }
          }
        }
      }
    }

    if (step === 2) {
      if (!address.trim()) errors.address = "Address is required";
      if (!city.trim()) errors.city = "City is required";
      if (!state.trim()) errors.state = "State is required";
      if (!pincode || !validators.pincode(pincode))
        errors.pincode = "Enter a valid 6-digit pincode";
      if (!officialEmail || !validators.email(officialEmail))
        errors.officialEmail = "Enter a valid email address";
      if (!contactNumber || !validators.phone(contactNumber))
        errors.contactNumber = "Enter a valid 10-digit contact number";
    }

    if (step === 3) {
      if (!adminName.trim()) errors.adminName = "Admin name is required";
      if (!adminEmail || !validators.email(adminEmail))
        errors.adminEmail = "Enter a valid email address";
      if (!adminPhone || !validators.phone(adminPhone))
        errors.adminPhone = "Enter a valid 10-digit phone number";
      if (!isOtpVerified) errors.otp = "Please verify your email with OTP";
      else if (!otp || otp.length !== 6) errors.otp = "Enter the 6-digit OTP";
    }

    if (step === 4) {
      if (!registrationNumber.trim())
        errors.registrationNumber = "Registration number is required";
      if (!panNumber || !validators.pan(panNumber))
        errors.panNumber = "Enter valid PAN (e.g. ABCDE1234F)";
      if (!validators.gst(gstNumber))
        errors.gstNumber = "Enter valid GSTIN format";
      if (!files.registrationCertificate)
        errors.registrationCertificate = "Required";
      if (!files.adminIdProof) errors.adminIdProof = "Required";
      if (!files.addressProof) errors.addressProof = "Required";
      if (!files.affiliationCertificate)
        errors.affiliationCertificate = "Required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    setFiles({ ...files, [e.target.name]: file });
    
    if (filePreviews.hasOwnProperty(e.target.name)) {
      if (filePreviews[e.target.name]) {
        URL.revokeObjectURL(filePreviews[e.target.name]);
      }
      if (file) {
        setFilePreviews((prev) => ({
          ...prev,
          [e.target.name]: URL.createObjectURL(file),
        }));
      } else {
        setFilePreviews((prev) => ({
          ...prev,
          [e.target.name]: null,
        }));
      }
    }
  };

  useEffect(() => {
    if (message) {
      toast.success(message);
    }
    if (error.register) toast.error(error.register);
  }, [message, error.register]);

  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const handleSendOTP = async () => {
    if (!adminEmail) {
      toast.error("Please enter admin email first");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post("/auth/super-admin/send-signup-otp", {
        email: adminEmail,
      });
      if (res.data.success) {
        toast.success("OTP sent to your email");
        setOtpSent(true);
        setOtpCooldown(120);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post("/auth/super-admin/verify-signup-otp", {
        email: adminEmail,
        otp,
      });
      if (res.data.success) {
        toast.success("Email verified successfully");
        setIsOtpVerified(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const nextStep = () => {
    if (!validateStep()) {
      toast.error("Please fix the errors below");
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const initiatePaymentAndSubmit = async (e) => {
    e.preventDefault();

    if (step < 4) {
      nextStep();
      return;
    }

    if (!validateStep()) {
      toast.error("Please fix the errors below");
      return;
    }

    executeFinalRegistration();
  };

  const executeFinalRegistration = () => {
    const data = new FormData();

    Object.keys(formData).forEach((key) => {
      if (formData[key]) data.append(key, formData[key]);
    });
    Object.keys(files).forEach((key) => {
      if (files[key]) data.append(key, files[key]);
    });

    dispatch(registerSuperAdmin(data));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-10 w-full max-w-4xl mx-auto overflow-x-auto px-2">
      {[
        { id: 1, name: "Org Info" },
        { id: 2, name: "HQ Details" },
        { id: 3, name: "Admin Info" },
        { id: 4, name: "Verification" },
      ].map((s, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center relative z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step >= s.id
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-200"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s.id ? <FaCheckCircle /> : s.id}
            </div>
            <span
              className={`absolute -bottom-7 text-xs font-semibold whitespace-nowrap ${
                step >= s.id ? "text-sky-700" : "text-gray-400"
              }`}
            >
              {s.name}
            </span>
          </div>
          {idx < 3 && (
            <div
              className={`flex-grow h-1.5 min-w-[2rem] mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                step > s.id ? "bg-sky-600" : "bg-gray-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative flex flex-col">
      <div
        className="fixed inset-0"
        style={{
          background:
            "linear-gradient(112deg, #ffffff 0%, #ffffff 25%, #edfbfd 40%, #c8f0f5 54%, #6dd8e8 70%, #1ec8de 84%, #00b8d4 100%)",
          zIndex: 0,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,160,210,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,160,210,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "linear-gradient(to right, transparent 10%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 10%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,1) 100%)",
          zIndex: 1,
        }}
      />

      <header className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50">
        <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate("/")}
            >
              <MdDashboard className="text-3xl text-slate-700" />
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-sky-700 bg-clip-text text-transparent">
                EduAI
              </span>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-slate-700 font-medium"
            >
              <FaArrowLeft /> Back to Home
            </motion.button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block lg:col-span-4 space-y-6 sticky top-32"
            >
              <div className="inline-flex items-center gap-2 bg-white/80 text-slate-700 px-5 py-3 rounded-full border border-slate-300 backdrop-blur-sm shadow-sm">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2.5 h-2.5 bg-slate-800 rounded-full"
                />
                <span className="text-sm font-semibold uppercase tracking-widest">
                  Organization Registration
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                <span className="block text-gray-900">Join the</span>
                <span className="block bg-gradient-to-r from-slate-800 via-sky-700 to-slate-800 bg-clip-text text-transparent">
                  Future of Education
                </span>
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed">
                Connect your organization to the most advanced AI-powered school
                management ecosystem.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    icon: FaSchool,
                    title: "Network Hub",
                    desc: "Centralized control for all branches",
                  },
                  {
                    icon: FaUserShield,
                    title: "Identity Verification",
                    desc: "Secure approval process for all institutions",
                  },
                  {
                    icon: FaChartLine,
                    title: "Smart Analytics",
                    desc: "AI-driven growth insights for schools",
                  },
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-sky-600 flex-shrink-0">
                      <feature.icon className="text-lg" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-500 leading-snug">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="col-span-12 lg:col-span-8 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10 transition-all duration-500"
            >
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-slate-900">
                  Register Your Organization
                </h2>
                <p className="text-gray-500 mt-2">
                  Complete the process to apply for access
                </p>
              </div>

              {renderStepIndicator()}

              {message ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 px-6"
                >
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-8 shadow-inner">
                    <FaCheckCircle className="text-5xl" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">
                    Request Sent!
                  </h3>
                  <p className="text-lg text-gray-600 mb-10 max-w-md mx-auto">
                    {message}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/")}
                    className="bg-slate-800 text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-slate-200"
                  >
                    Back to Homepage
                  </motion.button>
                </motion.div>
              ) : (
                <form
                  onSubmit={initiatePaymentAndSubmit}
                  className="min-h-[450px] flex flex-col justify-between"
                >
                  <div>
                    {/* Step 1: Organization Info */}
                    {step === 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm">
                            <FaSchool />
                          </span>
                          Basic Organization Details
                        </h3>

                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              Organization Name *
                            </label>
                            <input
                              type="text"
                              name="organizationName"
                              value={organizationName}
                              minLength={5}
                              maxLength={60}
                              onChange={onChange}
                              placeholder="e.g. Delhi Public School Group"
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                              required
                            />
                            <FieldError name="organizationName" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Organization Type *
                              </label>
                              <select
                                name="organizationType"
                                value={organizationType}
                                onChange={onChange}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              >
                                <option value="">Select Type</option>
                                <option value="Single School">
                                  Single School
                                </option>
                                <option value="Multi-Branch">
                                  Multi-Branch
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Number of Branches *
                              </label>
                              <select
                                name="numberOfBranches"
                                value={numberOfBranches}
                                onChange={onChange}
                                disabled={organizationType === "Single School"}
                                className={`w-full ${organizationType === "Single School" && "bg-gray-500/10 cursor-not-allowed"} px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none`}
                                required
                              >
                                <option value="">Select Range</option>
                                <option value="1">1</option>
                                <option value="2-5">2-5</option>
                                <option value="5-10">5-10</option>
                                <option value="10+">10+</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Year Established (Optional)
                              </label>
                              <div className="flex gap-2 p-1 bg-gray-100/80 border border-gray-200/50 rounded-xl w-fit mb-3">
                                <button
                                  type="button"
                                  onClick={() => setYearMode("single")}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    yearMode === "single"
                                      ? "bg-white text-sky-700 shadow-sm"
                                      : "text-gray-500 hover:text-gray-900"
                                  }`}
                                >
                                  Single Year
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setYearMode("range")}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    yearMode === "range"
                                      ? "bg-white text-sky-700 shadow-sm"
                                      : "text-gray-500 hover:text-gray-900"
                                  }`}
                                >
                                  Year Range
                                </button>
                              </div>
                              {yearMode === "single" ? (
                                <div className="relative">
                                  <select
                                    name="singleYear"
                                    value={selectedSingleYear}
                                    onChange={(e) => setSelectedSingleYear(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none text-slate-700 text-sm font-medium"
                                  >
                                    <option value="">Select Year</option>
                                    {yearsList.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  <select
                                    name="startYear"
                                    value={selectedStartYear}
                                    onChange={(e) => setSelectedStartYear(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none text-slate-700 text-sm font-medium"
                                  >
                                    <option value="">Start Year</option>
                                    {yearsList.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="endYear"
                                    value={selectedEndYear}
                                    onChange={(e) => setSelectedEndYear(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none text-slate-700 text-sm font-medium"
                                  >
                                    <option value="">End Year</option>
                                    {yearsList.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <FieldError name="yearEstablished" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: HQ Details */}
                    {step === 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm">
                            <FaMapPin />
                          </span>
                          Head Office (HQ) Details
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              HQ Address *
                            </label>
                            <textarea
                              name="address"
                              value={address}
                              onChange={onChange}
                              rows="2"
                              placeholder="Full address of the head office"
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none resize-none"
                              required
                            />
                            <FieldError name="address" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                City *
                              </label>
                              <input
                                type="text"
                                name="city"
                                value={city}
                                onChange={onChange}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="city" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                State *
                              </label>
                              <input
                                type="text"
                                name="state"
                                value={state}
                                onChange={onChange}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="state" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Country *
                              </label>
                              <input
                                type="text"
                                name="country"
                                value={country}
                                onChange={onChange}
                                className="w-full px-5 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl font-bold text-slate-500 outline-none"
                                readOnly
                              />
                              <FieldError name="country" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Pincode *
                              </label>
                              {/* 🔥 ADDED: maxLength={6} and regex validation applied in onChange */}
                              <input
                                type="text"
                                name="pincode"
                                value={pincode}
                                onChange={onChange}
                                maxLength={6}
                                className={`w-full px-5 py-3.5 rounded-2xl focus:ring-2 transition-all outline-none ${
                                  (pincode.length > 0 && pincode.length !== 6) || !!fieldErrors.pincode
                                    ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                    : "bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                }`}
                                required
                              />
                              <FieldError name="pincode" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Official Email *
                              </label>
                              <input
                                type="email"
                                name="officialEmail"
                                value={officialEmail}
                                onChange={onChange}
                                placeholder="hr@organization.com"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="officialEmail" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Contact Number *
                              </label>
                              {/* 🔥 ADDED: maxLength={10} and regex validation applied in onChange */}
                              <input
                                type="text"
                                name="contactNumber"
                                value={contactNumber}
                                onChange={onChange}
                                placeholder="Enter 10-digit number"
                                maxLength={10}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="contactNumber" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Super Admin Info */}
                    {step === 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm">
                            <FaUserShield />
                          </span>
                          Super Admin Details
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              Admin Name *
                            </label>
                            <input
                              type="text"
                              name="adminName"
                              value={adminName}
                              onChange={onChange}
                              placeholder="Full Name of the Owner/Admin"
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                              required
                            />
                            <FieldError name="adminName" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Admin Email *
                              </label>
                              <input
                                type="email"
                                name="adminEmail"
                                value={adminEmail}
                                onChange={onChange}
                                placeholder="admin@organization.com"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="adminEmail" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Phone Number *
                              </label>
                              {/* 🔥 ADDED: maxLength={10} and regex validation applied in onChange */}
                              <input
                                type="text"
                                name="adminPhone"
                                value={adminPhone}
                                onChange={onChange}
                                maxLength={10}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                                required
                              />
                              <FieldError name="adminPhone" />
                            </div>
                          </div>
                          {formData.adminEmail &&
                            validators.email(adminEmail) && (
                              <div className="relative">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                  Verify OTP *
                                </label>
                                <div className="flex gap-3">
                                  <input
                                    type="text"
                                    name="otp"
                                    value={otp}
                                    onChange={onChange}
                                    placeholder="Enter 6-digit OTP"
                                    maxLength="6"
                                    disabled={isOtpVerified}
                                    className={`flex-grow px-5 py-3.5 border rounded-2xl transition-all text-center font-bold tracking-widest outline-none ${
                                      isOtpVerified
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : "bg-gray-50 border-gray-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                    }`}
                                    required
                                  />
                                  {!isOtpVerified ? (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={handleSendOTP}
                                        disabled={otpLoading || otpCooldown > 0}
                                        className={`px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap text-sm disabled:opacity-50 ${
                                          !otpSent
                                            ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                                            : otpCooldown > 0
                                              ? "bg-sky-100 text-sky-700 cursor-not-allowed"
                                              : "bg-red-100 text-red-600 hover:bg-red-200"
                                        }`}
                                      >
                                        {otpCooldown > 0
                                          ? `Resend in ${otpCooldown}s`
                                          : otpSent
                                            ? "Resend OTP"
                                            : "Send OTP"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleVerifyOTP}
                                        disabled={otpLoading || !otpSent}
                                        className="px-6 py-3.5 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all whitespace-nowrap text-sm disabled:opacity-50"
                                      >
                                        {otpLoading ? "Verifying..." : "Verify"}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="px-6 py-3.5 bg-green-100 text-green-700 rounded-2xl font-bold flex items-center gap-2 text-sm whitespace-nowrap">
                                      <FaCheckCircle /> Verified
                                    </div>
                                  )}
                                </div>
                                <FieldError name="otp" />
                                <p className="text-[10px] text-gray-500 mt-2 ml-1">
                                  A verification code will be sent to the admin
                                  email above
                                </p>
                              </div>
                            )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Verification & Documents */}
                    {step === 4 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm">
                            <FaCheckCircle />
                          </span>
                          Identity & Verification
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              Registration # *
                            </label>
                            <input
                              type="text"
                              name="registrationNumber"
                              value={registrationNumber}
                              onChange={onChange}
                              placeholder="Govt ID"
                              className={`w-full px-4 py-3 rounded-xl focus:ring-2 outline-none text-sm transition-all ${
                                (registrationNumber.length > 50) || (registrationNumber.length > 0 && registrationNumber.trim() === "") || !!fieldErrors.registrationNumber
                                  ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                  : "bg-gray-50 border border-gray-200 focus:ring-sky-500/20"
                              }`}
                              required
                            />
                            <FieldError name="registrationNumber" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              PAN Number *
                            </label>
                            <input
                              type="text"
                              name="panNumber"
                              value={panNumber}
                              onChange={onChange}
                              placeholder="Organization PAN"
                              className={`w-full px-4 py-3 rounded-xl focus:ring-2 outline-none text-sm uppercase transition-all ${
                                (panNumber.length > 0 && (/[^a-zA-Z0-9]/.test(panNumber) || panNumber.length > 10 || (panNumber.length === 10 && !validators.pan(panNumber)))) || !!fieldErrors.panNumber
                                  ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                  : "bg-gray-50 border border-gray-200 focus:ring-sky-500/20"
                              }`}
                              required
                            />
                            <FieldError name="panNumber" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                              GST Number (Opt)
                            </label>
                            <input
                              type="text"
                              name="gstNumber"
                              value={gstNumber}
                              onChange={onChange}
                              placeholder="GSTIN"
                              className={`w-full px-4 py-3 rounded-xl focus:ring-2 outline-none text-sm uppercase transition-all ${
                                (gstNumber.length > 0 && (/[^a-zA-Z0-9]/.test(gstNumber) || gstNumber.length > 15 || (gstNumber.length === 15 && !validators.gst(gstNumber)))) || !!fieldErrors.gstNumber
                                  ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                  : "bg-gray-50 border border-gray-200 focus:ring-sky-500/20"
                              }`}
                            />
                            <FieldError name="gstNumber" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                          {[
                            {
                              label: "Registration Certificate *",
                              name: "registrationCertificate",
                              sub: "School/Org proof",
                            },
                            {
                              label: "Admin (Owner) ID *",
                              name: "adminIdProof",
                              sub: "Aadhar / PAN Card",
                            },
                            {
                              label: "Address Proof *",
                              name: "addressProof",
                              sub: "HQ Property Tax / Utility",
                            },
                            {
                              label: "Affiliation Certificate *",
                              name: "affiliationCertificate",
                              sub: "CBSE / ICSE / Board",
                            },
                          ].map((doc, idx) => (
                            <div key={idx} className="relative group">
                              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                {doc.label}
                              </label>
                              <div
                                className={`relative border-2 border-dashed rounded-2xl p-4 transition-all ${
                                  files[doc.name]
                                    ? "border-sky-500 bg-sky-50"
                                    : "border-gray-200 bg-gray-50 group-hover:border-sky-300"
                                }`}
                              >
                                <input
                                  type="file"
                                  name={doc.name}
                                  onChange={onFileChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  required
                                />
                                <div className="flex flex-col items-center justify-center text-center py-2">
                                  {files[doc.name] ? (
                                    <>
                                      {files[doc.name].type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(files[doc.name].name) ? (
                                        <div className="w-16 h-16 rounded-xl border border-sky-100 overflow-hidden mb-2 shadow-sm flex items-center justify-center bg-white">
                                          <img
                                            src={filePreviews[doc.name]}
                                            alt={`${doc.label} Preview`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : files[doc.name].type === "application/pdf" || /\.pdf$/i.test(files[doc.name].name) ? (
                                        <FaFilePdf className="text-3xl text-red-500 mb-2" />
                                      ) : (
                                        <FaCheckCircle className="text-2xl text-sky-500 mb-2" />
                                      )}
                                      <span className="text-xs font-bold text-sky-600 truncate max-w-[150px]">
                                        {files[doc.name].name}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs font-bold text-slate-600 mb-1">
                                        Click to Upload
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {doc.sub}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-[10px] leading-relaxed">
                          <strong>Note:</strong> Allowed formats are PDF, JPG,
                          PNG, and WebP. Max file size is 10MB per document.
                        </div>
                      </motion.div>
                    )}


                  </div>

                  <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-100">
                    {step === 1 ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-gray-500 ml-1">
                          Already registered?
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => navigate("/organization/login")}
                          className="flex items-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm border border-slate-200 shadow-sm"
                        >
                          Login to Organization{" "}
                          <FaArrowRight className="text-xs" />
                        </motion.button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={prevStep}
                        disabled={loading.register}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all text-slate-600 hover:bg-slate-50 active:scale-95"
                      >
                        <FaArrowLeft /> Back
                      </button>
                    )}

                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-sky-200 active:scale-95 transition-all"
                      >
                        Next <FaArrowRight />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading.register}
                        className="bg-gradient-to-r from-slate-800 to-sky-700 hover:from-slate-900 hover:to-sky-800 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-slate-300 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {loading.register ? (
                          <>
                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            Uploading Application...
                          </>
                        ) : (
                          <>
                            Submit Application <FaCheckCircle />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} EduAI - Graphura School Management
        System. All rights reserved.
      </footer>
    </div>
  );
};

export default SuperAdminSignup;