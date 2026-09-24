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
import AddSchoolPage from "./SchoolRegistrationForm";
import AdmissionPortal from "../../pages/Landing/StudentAdmissionForm";
import GraphuraLogo from "../../assets/Graphura_Logo.webp";
import GraphuraIcon from "../../assets/Graphura_Logo_Sm.png";

const SuperAdminSignup = ({ isEmbedded = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectSuperLoading);
  const error = useSelector(selectSuperError);
  const message = useSelector(selectSuperMessage);

  const [activeForm, setActiveForm] = useState("headquarter");
    const [formData, setFormData] = useState({
    organizationName: "",
    organizationType: "Single School",
    numberOfBranches: "1",
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const steps = ["Organization", "Contact", "Address", "Additional", "Review"];

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

  const validateForm = () => {
    const errors = {};

    if (!organizationName || organizationName.trim().length < 5)
      errors.organizationName = "Min 5 characters required";
    
    if (!organizationType)
      errors.organizationType = "Organization Type is required";

    if (!numberOfBranches)
      errors.numberOfBranches = "Number of branches is required";
    
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

    if (!address.trim()) errors.address = "Address is required";
    if (!city.trim()) errors.city = "City is required";
    if (!state.trim()) errors.state = "State is required";
    if (!pincode || !validators.pincode(pincode))
      errors.pincode = "Enter a valid 6-digit pincode";
    if (!officialEmail || !validators.email(officialEmail))
      errors.officialEmail = "Enter a valid email address";
    if (!contactNumber || !validators.phone(contactNumber))
      errors.contactNumber = "Enter a valid 10-digit contact number";

    if (!adminName.trim()) errors.adminName = "Admin name is required";
    if (!adminEmail || !validators.email(adminEmail))
      errors.adminEmail = "Enter a valid email address";
    if (!adminPhone || !validators.phone(adminPhone))
      errors.adminPhone = "Enter a valid 10-digit phone number";
    if (!isOtpVerified) errors.otp = "Please verify your email with OTP";
    else if (!otp || otp.length !== 6) errors.otp = "Enter the 6-digit OTP";

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

  const validateStep = (stepIndex) => {
    const errors = {};

    if (stepIndex === 0) {
      if (!organizationName || organizationName.trim().length < 5)
        errors.organizationName = "Min 5 characters required";
      if (!organizationType)
        errors.organizationType = "Organization Type is required";
      if (!numberOfBranches)
        errors.numberOfBranches = "Number of branches is required";
      
      if (yearMode === "single") {
        if (selectedSingleYear) {
          const y = parseInt(selectedSingleYear, 10);
          if (isNaN(y) || y < 1800 || y > new Date().getFullYear()) {
            errors.yearEstablished = `Enter a valid year (1800–${new Date().getFullYear()})`;
          }
        } else {
          errors.yearEstablished = "Year established is required";
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
        } else {
          errors.yearEstablished = "Year established is required";
        }
      }

      if (!registrationNumber.trim())
        errors.registrationNumber = "Registration number is required";
    }

    if (stepIndex === 1) {
      if (!officialEmail || !validators.email(officialEmail))
        errors.officialEmail = "Enter a valid email address";
      if (!contactNumber || !validators.phone(contactNumber))
        errors.contactNumber = "Enter a valid 10-digit contact number";
      if (!adminName.trim()) errors.adminName = "Admin name is required";
      if (!adminEmail || !validators.email(adminEmail))
        errors.adminEmail = "Enter a valid email address";
      if (!adminPhone || !validators.phone(adminPhone))
        errors.adminPhone = "Enter a valid 10-digit phone number";
      if (!isOtpVerified) errors.otp = "Please verify your email with OTP";
      else if (!otp || otp.length !== 6) errors.otp = "Enter the 6-digit OTP";
    }

    if (stepIndex === 2) {
      if (!address.trim()) errors.address = "Address is required";
      if (!city.trim()) errors.city = "City is required";
      if (!state.trim()) errors.state = "State is required";
      if (!pincode || !validators.pincode(pincode))
        errors.pincode = "Enter a valid 6-digit pincode";
    }

    if (stepIndex === 3) {
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      const scrollable = document.querySelector(".w-full.flex-grow");
      if (scrollable) scrollable.scrollTop = 0;
    } else {
      toast.error("Please resolve any errors before continuing.");
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
    const scrollable = document.querySelector(".w-full.flex-grow");
    if (scrollable) scrollable.scrollTop = 0;
  };

  const initiatePaymentAndSubmit = async (e) => {
    e.preventDefault();

    if (!isConfirmed) {
      toast.error("Please confirm that all details are correct.");
      return;
    }

    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error("Form has errors. Please review all steps.");
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


  return (
    <div className={isEmbedded ? "w-full flex-grow flex flex-col" : "flex flex-col h-screen overflow-hidden bg-slate-100 font-sans"}>
      {/* Top Navbar */}
      {!isEmbedded && (
        <nav className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-10 shrink-0 z-30 shadow-sm">
          <img src={GraphuraLogo} alt="Graphura" className="w-[140px] h-auto object-contain" />
          <button onClick={() => navigate('/login')} className="text-sm font-bold text-[#fc9d8b] hover:text-[#e88876] transition-colors">
            Log In
          </button>
        </nav>
      )}

      {/* Main Content Area */}
      <div className={isEmbedded ? "w-full flex-grow flex flex-col" : "flex-1 flex justify-center items-center p-6 md:p-8 overflow-hidden"}>
        {/* Registration Card (Form Container) */}
        <div className={isEmbedded ? "w-full flex-grow flex flex-col" : "bg-white w-full max-w-[1100px] h-full max-h-[850px] rounded-[32px] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] flex overflow-hidden border border-slate-200"}>
          
          {/* LEFT PANEL */}
          {!isEmbedded && (
            <div className="w-[400px] bg-slate-50/50 p-12 flex flex-col shrink-0 border-r border-slate-100 justify-center">
            <div className="mb-12">
               <div className="w-12 h-12 mb-6 flex items-center justify-center">
                  <img src={GraphuraIcon} alt="G" className="w-full h-full object-contain" />
               </div>
               <h2 className="text-2xl font-black text-slate-900 mb-2">Join Graphura</h2>
               <p className="text-sm text-slate-500 leading-relaxed">Select your primary role to begin setting up your account profile.</p>
            </div>
            
            <div className="flex flex-col gap-6">
               <div 
                 onClick={() => setActiveForm("headquarter")} 
                 className={`px-6 py-5 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between border min-h-[84px] ${
                   activeForm === "headquarter" 
                     ? "border-[#fecdc4] bg-[#ffece8]/40 shadow-sm shadow-orange-100/50" 
                     : "border-gray-200 bg-white hover:border-[#fecdc4] hover:shadow-sm hover:-translate-y-0.5 hover:bg-slate-50"
                 }`}
               >
                 <div className="flex items-center gap-5">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeForm === "headquarter" ? "bg-white text-[#fc9d8b] shadow-sm" : "bg-gray-50 text-slate-500"}`}>
                     <FaSchool size={20} />
                   </div>
                   <span className={`font-bold text-[15px] ${activeForm === "headquarter" ? "text-[#fc9d8b]" : "text-slate-700"}`}>Headquarter</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${activeForm === "headquarter" ? "border-[#fc9d8b]" : "border-gray-300"}`}>
                   {activeForm === "headquarter" && <div className="w-2.5 h-2.5 bg-[#fc9d8b] rounded-full"></div>}
                 </div>
               </div>

               <div 
                 onClick={() => setActiveForm("school")} 
                 className={`px-6 py-5 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between border min-h-[84px] ${
                   activeForm === "school" 
                     ? "border-[#fecdc4] bg-[#ffece8]/40 shadow-sm shadow-orange-100/50" 
                     : "border-gray-200 bg-white hover:border-[#fecdc4] hover:shadow-sm hover:-translate-y-0.5 hover:bg-slate-50"
                 }`}
               >
                 <div className="flex items-center gap-5">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeForm === "school" ? "bg-white text-[#fc9d8b] shadow-sm" : "bg-gray-50 text-slate-500"}`}>
                     <MdDashboard size={20} />
                   </div>
                   <span className={`font-bold text-[15px] ${activeForm === "school" ? "text-[#fc9d8b]" : "text-slate-700"}`}>School</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${activeForm === "school" ? "border-[#fc9d8b]" : "border-gray-300"}`}>
                   {activeForm === "school" && <div className="w-2.5 h-2.5 bg-[#fc9d8b] rounded-full"></div>}
                 </div>
               </div>

               <div 
                 onClick={() => setActiveForm("student")} 
                 className={`px-6 py-5 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between border min-h-[84px] ${
                   activeForm === "student" 
                     ? "border-[#fecdc4] bg-[#ffece8]/40 shadow-sm shadow-orange-100/50" 
                     : "border-gray-200 bg-white hover:border-[#fecdc4] hover:shadow-sm hover:-translate-y-0.5 hover:bg-slate-50"
                 }`}
               >
                 <div className="flex items-center gap-5">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeForm === "student" ? "bg-white text-[#fc9d8b] shadow-sm" : "bg-gray-50 text-slate-500"}`}>
                     <FaUserShield size={20} />
                   </div>
                   <span className={`font-bold text-[15px] ${activeForm === "student" ? "text-[#fc9d8b]" : "text-slate-700"}`}>Student</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${activeForm === "student" ? "border-[#fc9d8b]" : "border-gray-300"}`}>
                   {activeForm === "student" && <div className="w-2.5 h-2.5 bg-[#fc9d8b] rounded-full"></div>}
                 </div>
               </div>
            </div>

            <div className="mt-auto pt-8 flex">
               <button
                 type="button"
                 onClick={() => navigate("/")}
                 className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm border border-slate-200 hover:shadow-sm shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
               >
                 <FaArrowLeft className="text-xs" /> Back to Home
               </button>
            </div>
          </div>
          )}

          {/* RIGHT PANEL */}
          <div className={isEmbedded ? "w-full flex-grow" : "flex-1 bg-white relative flex flex-col"}>
             {activeForm === "headquarter" && (
                <div className="w-full flex-1 overflow-y-auto pb-10">
                   <div className={isEmbedded ? "w-full" : "max-w-[650px] mx-auto w-full px-6 py-8 md:px-[56px] md:pt-[48px] md:pb-[48px]"}>
                      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-center md:text-left">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            Register Your Headquarter
                          </h2>
                          <p className="text-slate-500 mt-3 text-sm font-medium">
                            Enter your details to create your headquarter account.
                          </p>
                        </div>
                      </div>


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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && currentStep < 4) {
                      e.preventDefault();
                    }
                  }}
                  className="min-h-[450px] flex flex-col justify-between"
                >
                  {/* Step Indicator */}
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

                  <div className="space-y-10 flex-grow">
                     {/* Step 1: Basic details */}
                     {currentStep === 0 && (
                       <motion.div
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="space-y-8"
                       >
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-6 first:mt-0 pb-3 border-b border-slate-100">
                           <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                             <FaSchool />
                           </span>
                           Basic Headquarter Details
                         </h3>

                         <div className="space-y-8">
                           <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                               Headquarter Name *
                             </label>
                             <input
                               type="text"
                               name="organizationName"
                               value={organizationName}
                               minLength={5}
                               maxLength={60}
                               onChange={onChange}
                               placeholder="e.g. Graphura Central Headquarters"
                               className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                               required
                             />
                             <FieldError name="organizationName" />
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
                                     className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none text-slate-800 text-sm font-semibold"
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
                                     className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none text-slate-800 text-sm font-semibold"
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
                                     className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none text-slate-800 text-sm font-semibold"
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
                                 className={`w-full px-5 py-4 rounded-xl focus:ring-2 outline-none text-sm font-semibold placeholder-slate-500 transition-all ${
                                   (registrationNumber.length > 50) || (registrationNumber.length > 0 && registrationNumber.trim() === "") || !!fieldErrors.registrationNumber
                                     ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                     : "bg-white border border-slate-300 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
                                 }`}
                                 required
                               />
                               <FieldError name="registrationNumber" />
                             </div>
                           </div>
                         </div>
                       </motion.div>
                     )}

                     {/* Step 2: Contact Info */}
                     {currentStep === 1 && (
                       <motion.div
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="space-y-8"
                       >
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                           <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                             <FaUserShield />
                           </span>
                           Contact & Admin Details
                         </h3>

                         <div className="space-y-8">
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
                                 placeholder="hr@headquarter.com"
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                                 required
                               />
                               <FieldError name="officialEmail" />
                             </div>
                             <div>
                               <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                 Contact Number *
                               </label>
                               <input
                                 type="text"
                                 name="contactNumber"
                                 value={contactNumber}
                                 onChange={onChange}
                                 placeholder="Enter 10-digit number"
                                 maxLength={10}
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                                 required
                               />
                               <FieldError name="contactNumber" />
                             </div>
                           </div>

                           <div className="border-t border-slate-100 pt-6">
                             <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                               Head Quarter Admin Name *
                             </label>
                             <input
                               type="text"
                               name="adminName"
                               value={adminName}
                               onChange={onChange}
                               placeholder="Full Name of the Owner/Head Quarter Admin"
                               className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                               required
                             />
                             <FieldError name="adminName" />
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                               <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                 Head Quarter Admin Email *
                               </label>
                               <input
                                 type="email"
                                 name="adminEmail"
                                 value={adminEmail}
                                 onChange={onChange}
                                 placeholder="admin@headquarter.com"
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                                 required
                               />
                               <FieldError name="adminEmail" />
                             </div>
                             <div>
                               <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                 Phone Number *
                               </label>
                               <input
                                 type="text"
                                 name="adminPhone"
                                 value={adminPhone}
                                 onChange={onChange}
                                 maxLength={10}
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
                                 required
                               />
                               <FieldError name="adminPhone" />
                             </div>
                           </div>

                           {formData.adminEmail && validators.email(adminEmail) && (
                             <div className="relative border-t border-slate-100 pt-6">
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
                                   className={`flex-grow px-4 py-3.5 border rounded-xl transition-all text-center font-bold tracking-widest outline-none text-sm placeholder-slate-400 ${
                                     isOtpVerified
                                       ? "bg-green-50 border-green-200 text-green-700"
                                       : "bg-white border-gray-200 focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
                                   }`}
                                   required
                                 />
                                 {!isOtpVerified ? (
                                   <div className="flex gap-2">
                                     <button
                                       type="button"
                                       onClick={handleSendOTP}
                                       disabled={otpLoading || otpCooldown > 0}
                                       className={`px-6 py-3.5 rounded-xl font-bold transition-all whitespace-nowrap text-sm disabled:opacity-50 ${
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
                                       className="px-6 py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all whitespace-nowrap text-sm disabled:opacity-50"
                                     >
                                       {otpLoading ? "Verifying..." : "Verify"}
                                     </button>
                                   </div>
                                 ) : (
                                   <div className="px-6 py-3.5 bg-green-100 text-green-700 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap">
                                     <FaCheckCircle /> Verified
                                   </div>
                                 )}
                               </div>
                               <FieldError name="otp" />
                               <p className="text-[10px] text-gray-500 mt-2 ml-1">
                                 A verification code will be sent to the admin email above
                               </p>
                             </div>
                           )}
                         </div>
                       </motion.div>
                     )}

                     {/* Step 3: Address details */}
                     {currentStep === 2 && (
                       <motion.div
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="space-y-8"
                       >
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                           <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                             <FaMapPin />
                           </span>
                           Head Office (HQ) Address Details
                         </h3>

                         <div className="space-y-8">
                           <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                               HQ Address *
                             </label>
                             <textarea
                               name="address"
                               value={address}
                               onChange={onChange}
                               rows="3"
                               placeholder="Full address of the head office"
                               className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none resize-none placeholder-slate-500 text-sm font-semibold text-slate-800"
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
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
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
                                 className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b] transition-all outline-none placeholder-slate-500 text-sm font-semibold text-slate-800"
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
                               className="w-full px-4 py-3.5 bg-slate-100 border border-gray-200 rounded-xl font-bold text-slate-500 outline-none text-sm"
                               readOnly
                             />
                             <FieldError name="country" />
                           </div>
                           <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                               Pincode *
                             </label>
                             <input
                               type="text"
                               name="pincode"
                               value={pincode}
                               onChange={onChange}
                               placeholder="e.g. 400001"
                               maxLength={6}
                               className={`w-full px-5 py-4 rounded-xl focus:ring-2 transition-all outline-none text-sm font-semibold placeholder-slate-500 text-slate-800 ${
                                 (pincode.length > 0 && pincode.length !== 6) || !!fieldErrors.pincode
                                   ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                   : "bg-white border border-slate-300 focus:ring-2 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
                               }`}
                               required
                             />
                             <FieldError name="pincode" />
                           </div>
                         </div>
                       </div>
                     </motion.div>
                   )}

                   {/* Step 4: Additional Information & files */}
                   {currentStep === 3 && (
                     <motion.div
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="space-y-8"
                     >
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                         <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                           <FaCheckCircle />
                         </span>
                         Identity & Verification Documents
                       </h3>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                             PAN Number *
                           </label>
                           <input
                             type="text"
                             name="panNumber"
                             value={panNumber}
                             onChange={onChange}
                             placeholder="Headquarter PAN"
                             className={`w-full px-4 py-3.5 rounded-xl focus:ring-2 outline-none text-sm font-semibold uppercase placeholder-slate-400 transition-all ${
                               (panNumber.length > 0 && (/[^a-zA-Z0-9]/.test(panNumber) || panNumber.length > 10 || (panNumber.length === 10 && !validators.pan(panNumber)))) || !!fieldErrors.panNumber
                                 ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                 : "bg-white border border-gray-200 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
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
                             className={`w-full px-4 py-3.5 rounded-xl focus:ring-2 outline-none text-sm font-semibold uppercase placeholder-slate-400 transition-all ${
                               (gstNumber.length > 0 && (/[^a-zA-Z0-9]/.test(gstNumber) || gstNumber.length > 15 || (gstNumber.length === 15 && !validators.gst(gstNumber)))) || !!fieldErrors.gstNumber
                                 ? "bg-red-50/30 border border-red-500 text-red-600 focus:ring-red-500/20 focus:border-red-500"
                                 : "bg-white border border-gray-200 focus:ring-[#fc9d8b]/20 focus:border-[#fc9d8b]"
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
                             label: "Head Quarter Admin (Owner) ID *",
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
                               className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
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
                         <strong>Note:</strong> Allowed formats are PDF, JPG, PNG, and WebP. Max file size is 10MB per document.
                       </div>
                     </motion.div>
                   )}

                   {/* Step 5: Review & Confirm */}
                   {currentStep === 4 && (
                     <motion.div
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="space-y-6 text-left"
                     >
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6 mt-8 first:mt-0 pb-3 border-b border-slate-100">
                         <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#fc9d8b] flex items-center justify-center text-sm shadow-sm">
                           <FaCheckCircle />
                         </span>
                         Review & Confirm Details
                       </h3>

                       <div className="space-y-8">
                         {/* Org card */}
                         <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                           <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Organization Details</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                             <div><span className="text-slate-500 font-medium">Headquarter Name:</span> <span className="font-bold text-slate-800">{organizationName}</span></div>
                             <div><span className="text-slate-500 font-medium">Organization Type:</span> <span className="font-bold text-slate-800">{organizationType}</span></div>
                             <div><span className="text-slate-500 font-medium">Established Year:</span> <span className="font-bold text-slate-800">{yearEstablished || "N/A"}</span></div>
                             <div><span className="text-slate-500 font-medium">Registration Number:</span> <span className="font-bold text-slate-800">{registrationNumber}</span></div>
                           </div>
                         </div>

                         {/* Contact Card */}
                         <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                           <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Contact Details</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                             <div><span className="text-slate-500 font-medium">Official Email:</span> <span className="font-bold text-slate-800">{officialEmail}</span></div>
                             <div><span className="text-slate-500 font-medium">Contact Number:</span> <span className="font-bold text-slate-800">{contactNumber}</span></div>
                             <div><span className="text-slate-500 font-medium">Admin Name:</span> <span className="font-bold text-slate-800">{adminName}</span></div>
                             <div><span className="text-slate-500 font-medium">Admin Email:</span> <span className="font-bold text-slate-800">{adminEmail}</span></div>
                             <div><span className="text-slate-500 font-medium">Admin Phone:</span> <span className="font-bold text-slate-800">{adminPhone}</span></div>
                           </div>
                         </div>

                         {/* Address Card */}
                         <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                           <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Address Details</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                             <div className="md:col-span-2"><span className="text-slate-500 font-medium">Address:</span> <span className="font-bold text-slate-800">{address}</span></div>
                             <div><span className="text-slate-500 font-medium">City:</span> <span className="font-bold text-slate-800">{city}</span></div>
                             <div><span className="text-slate-500 font-medium">State:</span> <span className="font-bold text-slate-800">{state}</span></div>
                             <div><span className="text-slate-500 font-medium">Country:</span> <span className="font-bold text-slate-800">{country}</span></div>
                             <div><span className="text-slate-500 font-medium">Pincode:</span> <span className="font-bold text-slate-800">{pincode}</span></div>
                           </div>
                         </div>

                         {/* Docs Card */}
                         <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                           <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wide">Identity & Documents</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                             <div><span className="text-slate-500 font-medium">PAN Number:</span> <span className="font-bold text-slate-800">{panNumber}</span></div>
                             <div><span className="text-slate-500 font-medium">GST Number:</span> <span className="font-bold text-slate-800">{gstNumber || "N/A"}</span></div>
                           </div>
                           
                           <div className="border-t border-slate-200/60 pt-4">
                             <span className="text-slate-500 font-medium block mb-2 text-xs uppercase tracking-wide">Uploaded Documents:</span>
                             <div className="space-y-1.5 text-xs font-bold text-slate-700">
                               <div>✓ Registration Certificate: <span className="text-sky-600">{files.registrationCertificate?.name}</span></div>
                               <div>✓ Admin ID Proof: <span className="text-sky-600">{files.adminIdProof?.name}</span></div>
                               <div>✓ Address Proof: <span className="text-sky-600">{files.addressProof?.name}</span></div>
                               <div>✓ Affiliation Certificate: <span className="text-sky-600">{files.affiliationCertificate?.name}</span></div>
                             </div>
                           </div>
                         </div>

                         {/* Conf checkbox */}
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
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-100">
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
                        disabled={loading.register}
                        className={`bg-gradient-to-r from-[#ffb0a0] to-[#fc9d8b] text-white px-8 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
                          !isConfirmed
                            ? "opacity-50 cursor-not-allowed saturate-50 shadow-none"
                            : "hover:from-[#f98a75] hover:to-[#eb816c] active:scale-95 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                        }`}
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
                   </div>
                </div>
             )}
             {!isEmbedded && activeForm === "school" && (
                <div className="w-full flex-1 overflow-y-auto pb-10">
                   <div className="max-w-[650px] mx-auto w-full p-12 pt-10">
                      <AddSchoolPage isEmbedded={true} />
                   </div>
                </div>
             )}
             {!isEmbedded && activeForm === "student" && (
                <div className="w-full flex-1 overflow-y-auto pb-10">
                   <div className="max-w-[650px] mx-auto w-full p-12 pt-10">
                      <AdmissionPortal isEmbedded={true} />
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {!isEmbedded && (
        <footer className="h-14 border-t border-gray-200 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0 bg-white">
           <p>© {new Date().getFullYear()} Graphura. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
};

export default SuperAdminSignup;
