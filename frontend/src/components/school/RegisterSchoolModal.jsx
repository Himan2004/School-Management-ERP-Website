import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaCheckCircle } from "react-icons/fa";
import axios from "axios";

const steps = ["School Info", "Students", "Principal & Staff"];

const INITIAL_FORM = {
  // Step 1
  schoolName: "", yearOfEstablishment: "", board: "",
  schoolRanking: "", country: "", state: "", city: "",
  pinCode: "", address: "", officialPhone: "", officialEmail: "", website: "",
  // Step 1 additions
  organization: "", branchCreationId: "",
  // Step 2
  totalStudents: "", totalTeachers: "", gradesOffered: "",
  mediumOfInstruction: "", schoolType: "",
  // Step 3
  principalName: "", principalEmail: "", principalPhone: "",
  totalTeachingStaff: "", totalNonTeachingStaff: "",
};

function RegisterSchoolModal({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [organizations, setOrganizations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Fetch Organizations ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isOpen) {
      const fetchOrgs = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/school/organizations`);
          if (res.data.success) {
            setOrganizations(res.data.data.organizations);
          }
        } catch (err) {
          console.error("Failed to fetch organizations:", err);
        }
      };
      fetchOrgs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.schoolName.trim()) errs.schoolName = "Required";
      if (!form.address.trim()) errs.address = "Required";
      if (!form.officialPhone.trim()) errs.officialPhone = "Required";
      if (!form.officialEmail.trim()) errs.officialEmail = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.officialEmail)) errs.officialEmail = "Invalid email";
      if (!form.organization) errs.organization = "Required";
      if (!form.branchCreationId.trim()) errs.branchCreationId = "Required";
    }
    if (step === 2) {
      if (!form.principalName.trim()) errs.principalName = "Required";
      if (!form.principalEmail.trim()) errs.principalEmail = "Required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/school/register`,
        form
      );
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || "Submission failed. Try again.";
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-12 max-w-md w-full text-center shadow-2xl"
        >
          <div className="text-green-500 text-6xl mb-4 flex justify-center">
            <FaCheckCircle />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-500 leading-relaxed">
            Your registration for <strong>{form.schoolName}</strong> has been submitted.
            Our Super Admin team will review it and send credentials to{" "}
            <strong>{form.officialEmail}</strong> once approved.
          </p>
          <p className="text-sm text-gray-400 mt-3">⏱ Average review time: 1–2 business days</p>
          <button
            onClick={() => { setSubmitted(false); setStep(0); setForm(INITIAL_FORM); onClose(); }}
            className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-slate-800 to-sky-700 text-white font-semibold"
          >
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  const inputCls = (field) =>
    `border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;

  const ErrMsg = ({ field }) =>
    errors[field] ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(135deg,#dce8f5 0%,#e8eef7 30%,#f5f0e8 70%,#faf5e4 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm rounded-t-2xl">
          {/* Title + Subtitle */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-600">
              Register Your School
            </h2>
            <p className="text-sm font-semibold text-gray-400 mt-1">
              Get your Branch Creation ID from the Organization Dashboard
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full transition duration-200 hover:bg-red-50 hover:text-red-500 text-gray-500"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex justify-between px-8 pt-6 pb-2">
          {steps.map((label, index) => (
            <div key={index} className="flex-1 text-center relative">
              {index < steps.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${step > index ? "bg-blue-500" : "bg-gray-200"}`} />
              )}
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold relative z-10
                ${step > index ? "bg-green-500 text-white" : step === index ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                {step > index ? "✓" : index + 1}
              </div>
              <p className={`text-sm mt-2 font-medium ${step === index ? "text-blue-600" : "text-gray-400"}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1">

          {/* ── STEP 1: School Info ── */}
          {step === 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-slate-700">School Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input type="text" placeholder="School Name *" value={form.schoolName} onChange={update("schoolName")} className={inputCls("schoolName")} />
                  <ErrMsg field="schoolName" />
                </div>
                <div>
                  <select value={form.organization} onChange={update("organization")} className={inputCls("organization")}>
                    <option value="">Select Organization *</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>{org.organizationName} ({org.organizationId})</option>
                    ))}
                  </select>
                  <ErrMsg field="organization" />
                </div>
                <div>
                  <input type="text" placeholder="Branch Creation ID *" value={form.branchCreationId} onChange={update("branchCreationId")} className={inputCls("branchCreationId")} />
                  <ErrMsg field="branchCreationId" />
                </div>
                <div>
                  <input type="number" placeholder="Year of Establishment" value={form.yearOfEstablishment} onChange={update("yearOfEstablishment")} className={inputCls("yearOfEstablishment")} />
                </div>
                <div>
                  <select value={form.board} onChange={update("board")} className={inputCls("board")}>
                    <option value="">Board</option>
                    <option>CBSE</option><option>ICSE</option><option>State Board</option><option>IB</option>
                  </select>
                </div>
                <div>
                  <input type="text" placeholder="School Ranking (optional)" value={form.schoolRanking} onChange={update("schoolRanking")} className={inputCls("schoolRanking")} />
                </div>
                <div>
                  <input type="text" placeholder="Country" value={form.country} onChange={update("country")} className={inputCls("country")} />
                </div>
                <div>
                  <input type="text" placeholder="State" value={form.state} onChange={update("state")} className={inputCls("state")} />
                </div>
                <div>
                  <input type="text" placeholder="City" value={form.city} onChange={update("city")} className={inputCls("city")} />
                </div>
                <div>
                  <input type="text" placeholder="PIN / ZIP Code" value={form.pinCode} onChange={update("pinCode")} className={inputCls("pinCode")} />
                </div>
                <div className="md:col-span-2">
                  <input type="text" placeholder="Full Address *" value={form.address} onChange={update("address")} className={inputCls("address")} />
                  <ErrMsg field="address" />
                </div>
                <div>
                  <input type="tel" placeholder="Official Phone Number *" value={form.officialPhone} onChange={update("officialPhone")} className={inputCls("officialPhone")} />
                  <ErrMsg field="officialPhone" />
                </div>
                <div>
                  <input type="email" placeholder="Official Email Address *" value={form.officialEmail} onChange={update("officialEmail")} className={inputCls("officialEmail")} />
                  <ErrMsg field="officialEmail" />
                </div>
                <div className="md:col-span-2">
                  <input type="text" placeholder="Website URL (optional)" value={form.website} onChange={update("website")} className={inputCls("website")} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Students Info ── */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-slate-700">Students Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input type="number" placeholder="Total Number of Students (Approx)" value={form.totalStudents} onChange={update("totalStudents")} className={inputCls("totalStudents")} />
                <input type="number" placeholder="Total Teachers / Staff" value={form.totalTeachers} onChange={update("totalTeachers")} className={inputCls("totalTeachers")} />
                <input type="text" placeholder="Grades / Classes Offered (e.g., 1–12)" value={form.gradesOffered} onChange={update("gradesOffered")} className={`${inputCls("gradesOffered")} md:col-span-2`} />
                <select value={form.mediumOfInstruction} onChange={update("mediumOfInstruction")} className={inputCls("mediumOfInstruction")}>
                  <option value="">Medium of Instruction</option>
                  <option>English</option><option>Hindi</option><option>English + Hindi</option>
                </select>
                <select value={form.schoolType} onChange={update("schoolType")} className={inputCls("schoolType")}>
                  <option value="">School Type</option>
                  <option>Co-ed</option><option>Boys Only</option><option>Girls Only</option>
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 3: Principal & Staff ── */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-slate-700">Principal & Staff Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <input type="text" placeholder="Principal Name *" value={form.principalName} onChange={update("principalName")} className={inputCls("principalName")} />
                  <ErrMsg field="principalName" />
                </div>
                <input type="email" placeholder="Principal Email *" value={form.principalEmail} onChange={update("principalEmail")} className={inputCls("principalEmail")} />
                <input type="tel" placeholder="Principal Phone Number" value={form.principalPhone} onChange={update("principalPhone")} className={inputCls("principalPhone")} />
                <input type="number" placeholder="Total Teaching Staff" value={form.totalTeachingStaff} onChange={update("totalTeachingStaff")} className={inputCls("totalTeachingStaff")} />
                <input type="number" placeholder="Total Non-Teaching Staff" value={form.totalNonTeachingStaff} onChange={update("totalNonTeachingStaff")} className={inputCls("totalNonTeachingStaff")} />
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">
              ⚠️ {errors.submit}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between pt-4">
            <button onClick={back} disabled={step === 0}
              className="px-6 py-3 rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Back
            </button>
            {step < steps.length - 1 ? (
              <button onClick={next} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-slate-800 to-sky-700 text-white font-semibold disabled:opacity-60">
                {loading ? "Submitting..." : "Submit Application ✓"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterSchoolModal;