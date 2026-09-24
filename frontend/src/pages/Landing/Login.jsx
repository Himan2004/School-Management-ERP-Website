import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaUserGraduate,
  FaUsers,
  FaMoneyBillWave,
  FaCheckCircle,
  FaLock,
  FaInfoCircle
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { useDispatch } from 'react-redux';
import toast from "react-hot-toast";
import api from "../../services/api";

import { setAdminAuth } from '../../features/auth/adminAuthSlice';
import { setTeacherAuth } from "../../features/auth/teacherAuthSlice";
import { setPrincipalAuth } from "../../features/auth/principalAuthSlice";
import { setAccountantAuth } from "../../features/auth/accountantAuthSlice";
import { setParentAuth } from "../../features/auth/parentAuthSlice";
import { setStudentAuth } from "../../features/auth/studentAuthSlice";
import { setSuperAdminAuth } from "../../features/auth/superAuthSlice";

const roleOptions = [
  {
    value: "Principal",
    subtitle: "Oversee school operations, staff, and academic policies",
    icon: FaShieldAlt,
    accent: "from-rose-400 to-pink-300",
    soft: "from-rose-50 to-pink-50 border-rose-100",
  },
  {
    value: "Admin",
    subtitle: "Manage users, analytics, and school-level controls",
    icon: FaShieldAlt,
    accent: "from-orange-400 to-yellow-400",
    soft: "from-orange-50 to-yellow-50 border-orange-100",
  },
  {
    value: "Teacher",
    subtitle: "Handle classes, attendance, assignments, and grading",
    icon: FaUserGraduate,
    accent: "from-green-400 to-blue-300",
    soft: "from-emerald-50 to-sky-50 border-emerald-100",
  },
  {
    value: "Accountant",
    subtitle: "Manage fees, payments, invoices, and financial records",
    icon: FaMoneyBillWave,
    accent: "from-yellow-400 to-amber-400",
    soft: "from-yellow-50 to-amber-50 border-yellow-100",
  },
  {
    value: "Parent",
    subtitle: "Track student progress, fees, and school notices",
    icon: FaUsers,
    accent: "from-purple-400 to-blue-300",
    soft: "from-indigo-50 to-sky-50 border-sky-100",
  },
  {
    value: "Student",
    subtitle: "View timetable, assignments, results, and announcements",
    icon: FaUserGraduate,
    accent: "from-cyan-400 to-teal-300",
    soft: "from-cyan-50 to-teal-50 border-cyan-100",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    loginId: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errors, setErrors] = useState({ loginId: "", password: "" });

  // Unified multi-step forgot password states
  const [view, setView] = useState("login"); // login | forgot_request | forgot_verify | forgot_reset
  const [forgotInput, setForgotInput] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [verifiedLoginId, setVerifiedLoginId] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({ loginId: "", password: "" });
    if (!formData.loginId || !formData.password) {
      if (!formData.loginId) setErrors(prev => ({ ...prev, loginId: "Login ID is required." }));
      if (!formData.password) setErrors(prev => ({ ...prev, password: "Password is required." }));
      return;
    }

    try {
      setLoginLoading(true);
      const response = await api.post("/auth/login", {
        loginId: formData.loginId,
        password: formData.password
      });

      const data = response.data;
      if (data.success) {
        const { token, role, user, data: superAdminData } = data;

        // Save token to localStorage for the API interceptor
        if (token) {
          localStorage.setItem("token", token);
        }

        toast.success("Login successful!");

        // Dispatch authentication state and navigate based on the returned role
        if (role === "admin") {
          dispatch(setAdminAuth(user));
          navigate("/admin/dashboard");
        } else if (role === "teacher") {
          dispatch(setTeacherAuth(user));
          const designation = user?.profileId?.designation;
          if (designation === "Subject Teacher") {
            navigate("/subject-teacher/dashboard");
          } else {
            navigate("/teacher/dashboard");
          }
        } else if (role === "principal") {
          dispatch(setPrincipalAuth(user));
          navigate("/principal/dashboard");
        } else if (role === "accountant") {
          dispatch(setAccountantAuth(user));
          navigate("/accountant/dashboard");
        } else if (role === "parent") {
          dispatch(setParentAuth(user));
          navigate("/parent/dashboard");
        } else if (role === "student") {
          dispatch(setStudentAuth(user));
          navigate("/student/dashboard");
        } else if (role === "superadmin") {
          localStorage.removeItem("organizationId");
          localStorage.setItem("organizationId", superAdminData.organizationId);
          localStorage.setItem("organizationMongoId", superAdminData.id);
          dispatch(setSuperAdminAuth(superAdminData));
          window.location.href = "/superadmin/dashboard";
        } else {
          toast.error("Invalid role configuration: " + role);
        }
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      const resData = error.response?.data;
      if (resData && resData.field) {
        setErrors((prev) => ({ ...prev, [resData.field]: resData.message }));
      } else {
        toast.error(error.response?.data?.message || "Invalid Login ID or password. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotInput) {
      toast.error("Please enter your Login ID.");
      return;
    }

    try {
      setForgotLoading(true);
      const response = await api.post("/auth/forgot-password", {
        loginId: forgotInput
      });

      const data = response.data;
      if (data.success) {
        toast.success(data.message || "OTP sent successfully!");
        setMaskedEmail(data.data.maskedEmail);
        setVerifiedLoginId(data.data.loginId);
        setView("forgot_verify");
      } else {
        toast.error(data.message || "Failed to process request");
      }
    } catch (error) {
      console.error("Forgot password request error:", error);
      toast.error(error.response?.data?.message || "Failed to find account. Please verify your Login ID.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP.");
      return;
    }

    try {
      setForgotLoading(true);
      const response = await api.post("/auth/verify-otp", {
        loginId: verifiedLoginId,
        otp
      });

      const data = response.data;
      if (data.success) {
        toast.success("OTP verified! Create your new password.");
        setResetToken(data.resetToken);
        setView("forgot_reset");
      } else {
        toast.error(data.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(error.response?.data?.message || "Invalid OTP. Please check the code and try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setForgotLoading(true);
      const response = await api.post("/auth/reset-password", {
        resetToken,
        newPassword,
        confirmNewPassword
      });

      const data = response.data;
      if (data.success) {
        toast.success("Password reset successfully! You can now log in.");
        // Clear forgot states and return to login
        setView("login");
        setForgotInput("");
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResetToken("");
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error.response?.data?.message || "Reset failed. Please request a new OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-white to-sky-50 flex items-center justify-center">
      {/* Background blobs */}
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-orange-200/45 blur-3xl pointer-events-none" />
      <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-sky-200/55 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-emerald-100/45 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative grid w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.10)] backdrop-blur-sm lg:grid-cols-[0.9fr_1.1fr]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-sky-400 to-emerald-400" />

          {/* Left panel - Keeps previous theme and layout exactly */}
          <aside className="hidden border-r border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-8 lg:flex lg:flex-col justify-between max-h-[640px]">
            <div>
              <Link to="/" className="inline-flex items-center gap-2">
                <MdDashboard className="text-3xl text-slate-700" />
                <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-sky-700 bg-clip-text text-transparent">
                  School Management ERP
                </span>
              </Link>

              <div className="mt-6 space-y-2">
                <p className="inline-flex rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Professional Access
                </p>
                <h2 className="text-[26px] font-semibold leading-tight text-slate-900">
                  Secure login for
                  <br />
                  every school role.
                </h2>
                <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                  Clean enterprise style with focused access to your School ERP workspace.
                </p>
              </div>

              {/* Scrollable role list from original UI */}
              <div className="h-full max-h-[220px] mt-6 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                {roleOptions.map((option) => {
                  const RoleIcon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={`rounded-xl border bg-gradient-to-r p-2.5 ${option.soft}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6.5 w-6.5 items-center justify-center rounded-md bg-gradient-to-br ${option.accent} text-xs text-white shadow-sm`}
                        >
                          <RoleIcon className="text-xs" />
                        </span>
                        <p className="text-xs font-semibold text-slate-900">
                          {option.value}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {option.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-[11px] text-slate-600 shadow-sm">
              Use your assigned Login Id and password to continue.
            </div>
          </aside>

          {/* Right panel - Responsive form section without vertical scroll */}
          <section className="bg-white/85 p-6 sm:p-8 lg:p-10 flex flex-col justify-center max-h-[640px]">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 lg:hidden"
            >
              <MdDashboard className="text-3xl text-slate-700" />
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-sky-700 bg-clip-text text-transparent">
                School Management ERP
              </span>
            </Link>

            {/* Stepper display for forgot password flow */}
            {view !== "login" && (
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                {[
                  { id: 1, label: "Request OTP", activeViews: ["forgot_request"] },
                  { id: 2, label: "Verify Code", activeViews: ["forgot_verify"] },
                  { id: 3, label: "New Password", activeViews: ["forgot_reset"] }
                ].map((s, index) => {
                  const isActive = s.activeViews.includes(view);
                  const isCompleted =
                    (view === "forgot_verify" && s.id < 2) ||
                    (view === "forgot_reset" && s.id < 3);
                  return (
                    <React.Fragment key={s.id}>
                      <div className="flex items-center gap-1.5">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                          isActive ? "bg-sky-600 text-white font-bold ring-4 ring-sky-100" :
                          isCompleted ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {isCompleted ? "✓" : s.id}
                        </span>
                        <span className={`text-[11px] font-semibold transition-all duration-300 ${
                          isActive ? "text-slate-800 font-bold" : "text-slate-400"
                        }`}>
                          {s.label}
                        </span>
                      </div>
                      {index < 2 && (
                        <div className={`h-0.5 w-6 transition-all duration-300 ${
                          isCompleted ? "bg-emerald-500" : "bg-slate-200"
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* View 1: Login Form */}
            {view === "login" && (
              <>
                <p className="inline-flex self-start rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Welcome Back
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight text-slate-900">
                  Sign in to your account
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Enter your Login Id and password to continue.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="loginId"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Login ID
                    </label>
                    <input
                      id="loginId"
                      name="loginId"
                      type="text"
                      value={formData.loginId}
                      onChange={handleInputChange}
                      placeholder="Enter your Login ID"
                      autoComplete="username"
                      required
                      className={`w-full rounded-xl border bg-white px-5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-wide focus:ring-2 ${
                        errors.loginId ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
                      }`}
                    />
                    {errors.loginId && (
                      <div className="mt-2 rounded-xl bg-rose-50 border border-rose-100 p-3 flex items-start gap-2.5 text-rose-800 text-xs shadow-sm">
                        <span className="text-rose-500 font-bold">⚠️</span>
                        <span className="font-semibold">{errors.loginId}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        className={`w-full rounded-xl border bg-white px-5 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-wide focus:ring-2 ${
                          errors.password ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="mt-2 rounded-xl bg-rose-50 border border-rose-100 p-3 flex items-start gap-2.5 text-rose-800 text-xs shadow-sm">
                        <span className="text-rose-500 font-bold">⚠️</span>
                        <span className="font-semibold">{errors.password}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-slate-900 hover:via-sky-800 hover:to-cyan-700 disabled:opacity-60"
                  >
                    {loginLoading ? "Logging in..." : "Login"}
                    <FaArrowRight className="text-xs transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                {/* Secure & Info alert that fills the blank space beautifully */}
                <div className="mt-6 p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 flex gap-3 text-sky-800 transition-all duration-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm">
                    <FaInfoCircle />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-sky-950">Security Information</h4>
                    <p className="mt-0.5 text-[10px] text-sky-800/90 leading-relaxed">
                      Your session is protected with end-to-end encryption. Always remember to log out when using shared devices to prevent unauthorized access.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setView("forgot_request")}
                    className="font-medium text-slate-500 transition hover:text-sky-700"
                  >
                    Forgot password?
                  </button>
                  <Link
                    to="/"
                    className="font-semibold text-slate-900 transition hover:text-sky-700"
                  >
                    Back to Home
                  </Link>
                </div>
              </>
            )}

            {/* View 2: Forgot Password - Request OTP */}
            {view === "forgot_request" && (
              <>
                <p className="inline-flex self-start rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Recovery
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight text-slate-900">
                  Forgot Password
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Enter your registered Login ID below to send an OTP.
                </p>

                <form onSubmit={handleForgotRequest} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="forgotInput"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Login ID
                    </label>
                    <input
                      id="forgotInput"
                      type="text"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      placeholder="e.g. ADM-101"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-wide focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-slate-900 hover:via-sky-800 hover:to-cyan-700 disabled:opacity-60"
                  >
                    {forgotLoading ? "Sending OTP..." : "Send OTP"}
                    <FaArrowRight className="text-xs transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                {/* Security hint for forgot password view */}
                <div className="mt-6 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3 text-slate-600">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-xs">
                    🔒
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Verification Hint</h4>
                    <p className="mt-0.5 text-[10px] text-slate-500 leading-relaxed">
                      We'll lookup your Login ID and send a 6-digit OTP code to the verified contact email address in our database via Brevo.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="font-semibold text-slate-900 transition hover:text-sky-700"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}

            {/* View 3: Forgot Password - Verify OTP */}
            {view === "forgot_verify" && (
              <>
                <p className="inline-flex self-start rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Verification
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight text-slate-900">
                  Verify OTP
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Enter the 6-digit OTP code sent to your registered email **{maskedEmail}**.
                </p>

                <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="otp"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      OTP Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit OTP"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold tracking-[0.2em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:font-normal focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-slate-900 hover:via-sky-800 hover:to-cyan-700 disabled:opacity-60"
                  >
                    {forgotLoading ? "Verifying OTP..." : "Verify OTP"}
                    <FaArrowRight className="text-xs transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                {/* Email Delivery hint */}
                <div className="mt-6 p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 flex gap-3 text-amber-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm">
                    ✉️
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Email Delivery</h4>
                    <p className="mt-0.5 text-[10px] text-amber-800/90 leading-relaxed">
                      OTP emails usually arrive within 30 seconds. If you don't see it, please check your Spam/Junk folder before requesting a new one.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setView("forgot_request")}
                    className="font-semibold text-slate-500 transition hover:text-sky-700"
                  >
                    Change Login ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="font-semibold text-slate-900 transition hover:text-sky-700"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}

            {/* View 4: Forgot Password - Reset Password */}
            {view === "forgot_reset" && (
              <>
                <p className="inline-flex self-start rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  New Password
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight text-slate-900">
                  Create New Password
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Please specify your new login credentials below.
                </p>

                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-wide focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmNewPassword"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Verify new password"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-wide focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-slate-900 hover:via-sky-800 hover:to-cyan-700 disabled:opacity-60"
                  >
                    {forgotLoading ? "Resetting Password..." : "Reset Password"}
                    <FaArrowRight className="text-xs transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                {/* Password strength hint */}
                <div className="mt-6 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex gap-3 text-emerald-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xs">
                    <FaCheckCircle />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Password Policy</h4>
                    <p className="mt-0.5 text-[10px] text-emerald-800/90 leading-relaxed">
                      Choose a password with at least 6 characters. Make it strong by incorporating digits, symbols, and mixing uppercase and lowercase letters.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="font-semibold text-slate-900 transition hover:text-sky-700"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}