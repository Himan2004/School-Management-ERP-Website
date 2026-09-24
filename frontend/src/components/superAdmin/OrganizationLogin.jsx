import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FaLock,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaBuilding,
  FaShieldAlt,
  FaUserShield,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import {
  loginSuperAdmin,
  selectSuperLoading,
  selectSuperError,
  clearError,
} from "../../features/auth/superAuthSlice.js";

const OrganizationLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const loading = useSelector(selectSuperLoading);
  const error = useSelector(selectSuperError);

  const [orgId, setOrgId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!orgId || !password) {
      toast.error("Organization ID and Password are required!");
      return;
    }

    dispatch(clearError());

    const result = await dispatch(
      loginSuperAdmin({
        organizationId: orgId,
        password,
      }),
    );

    if (loginSuperAdmin.fulfilled.match(result)) {
      const data = result.payload.data;

      // ✅ Clear old
      localStorage.removeItem("organizationId");

      // ✅ Store ONLY organizationId
      localStorage.setItem("organizationId", data.organizationId);
      localStorage.setItem("organizationMongoId", data.id);

      window.location.href = "/superadmin/dashboard";
    } else {
      toast.error(result.payload?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white relative overflow-hidden flex flex-col">
      {/* Background Pattern */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(112deg, #ffffff 0%, #ffffff 25%, #edfbfd 40%, #c8f0f5 54%, #6dd8e8 70%, #1ec8de 84%, #00b8d4 100%)",
          zIndex: 0,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
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

      {/* Header */}
      <header className="relative z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50">
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

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Side Info */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-white/80 text-slate-700 px-5 py-3 rounded-full border border-slate-300 backdrop-blur-sm shadow-sm">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2.5 h-2.5 bg-slate-800 rounded-full"
                />
                <span className="text-sm font-semibold uppercase tracking-widest">
                  Organization Portal
                </span>
              </div>

              <h1 className="text-5xl font-bold leading-tight">
                <span className="block text-gray-900">Manage Your</span>
                <span className="block bg-gradient-to-r from-slate-800 via-sky-700 to-slate-800 bg-clip-text text-transparent">
                  Institution with Ease
                </span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Enter your unique Organization ID and password assigned after
                the registration approval process.
              </p>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all">
                  <FaShieldAlt className="text-sky-600 text-2xl mb-3" />
                  <h4 className="font-bold text-slate-800">Secure Access</h4>
                  <p className="text-sm text-gray-500">
                    Enterprise-grade cloud protection
                  </p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all">
                  <FaUserShield className="text-sky-600 text-2xl mb-3" />
                  <h4 className="font-bold text-slate-800">
                    Verified Presence
                  </h4>
                  <p className="text-sm text-gray-500">
                    Authenticated governance tools
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="col-span-12 lg:col-span-6 flex justify-center lg:justify-end"
            >
              <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 p-10">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-slate-900">
                    Organization Login
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Access your school management board
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      Organization ID
                    </label>
                    <div className="relative group">
                      <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                      <input
                        type="text"
                        value={orgId}
                        onChange={(e) => {
                          setOrgId(e.target.value);
                          if (error.login) dispatch(clearError());
                        }}
                        placeholder="e.g. ORG-ABC1234"
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      Password
                    </label>
                    <div className="relative group">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error.login) dispatch(clearError());
                        }}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <FaEyeSlash size={18} />
                        ) : (
                          <FaEye size={18} />
                        )}
                      </button>
                    </div>
                    {/* Inline error under password field */}
                    {error.login && (
                      <p className="text-red-500 text-xs font-medium mt-2 ml-1">
                        {error.login}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/organization/forgot-password")}
                      className="text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading.login}
                    className="w-full bg-gradient-to-r from-slate-800 to-sky-700 hover:from-slate-900 hover:to-sky-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-300 disabled:opacity-70 transition-all"
                  >
                    {loading.login ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Sign In <FaArrowRight />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                  <p className="text-gray-500 font-medium">
                    New institution?{" "}
                    <button
                      onClick={() => navigate("/organization/signup")}
                      className="text-sky-600 hover:text-sky-700 font-black hover:underline underline-offset-4 transition-all"
                    >
                      Register Your Organization
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 py-8 text-center text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} EduAI - Powered by Graphura. All
        rights reserved.
      </footer>
    </div>
  );
};

export default OrganizationLogin;
