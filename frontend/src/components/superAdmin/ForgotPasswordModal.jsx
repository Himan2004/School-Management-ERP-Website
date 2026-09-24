import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaEnvelope, FaKey, FaLock, FaTimes, FaArrowLeft,
  FaCheckCircle, FaExclamationTriangle, FaArrowRight,
  FaShieldAlt, FaEye, FaEyeSlash, FaCheck,
  FaClock, FaMobile, FaLockOpen, FaSpinner,
  FaHourglassHalf, FaEnvelopeOpenText
} from 'react-icons/fa';
import { MdMarkEmailRead, MdSecurity, MdVerified } from 'react-icons/md';
import { RiShieldStarLine } from 'react-icons/ri';
import { useDispatch, useSelector } from "react-redux";
import {
  forgotPassword,
  resendOTP,
  verifyOTPAndResetPassword,
  clearError,
  clearMessage,
  resetFlags
} from "../../features/auth/superAuthSlice.js";

const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    superAdminKey: '',
    otp: ['', '', '', '', '', ''],
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [focusedInput, setFocusedInput] = useState(null);
  const [emailValid, setEmailValid] = useState(false);
  const [keyValid, setKeyValid] = useState(false);

  const { email, superAdminKey, otp, newPassword, confirmNewPassword } = formData;
  const otpString = otp.join('');

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (/[a-z]/.test(newPassword)) strength += 25;
    if (/[A-Z]/.test(newPassword)) strength += 25;
    if (/[0-9!@#$%^&*]/.test(newPassword)) strength += 25;
    setPasswordStrength(strength);
  }, [newPassword]);

  // Resend timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  useEffect(() => {
    setKeyValid(superAdminKey.length >= 4);
  }, [superAdminKey]);

  const dispatch = useDispatch();
  const { loading, error, message, otpSent, passwordResetSuccess } = useSelector((state) => state.superAuth);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    dispatch(clearError());
    dispatch(clearMessage());
  };

  useEffect(() => {
    if (otpSent) {
      setStep(2);
      setResendTimer(60);
    }
  }, [otpSent]);
  
  useEffect(() => {
    dispatch(clearMessage());
  }, [step]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setFormData({ ...formData, otp: newOtp });

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((value, index) => {
      if (index < 6) newOtp[index] = value;
    });
    setFormData({ ...formData, otp: newOtp });
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  const requestOTP = (e) => {
    e.preventDefault();

    if (!email || !superAdminKey) {
      toast.error("Email and key required");
      return;
    }

    dispatch(forgotPassword({ email, superAdminKey }));
  };

  const handleResendOTP = () => {
    dispatch(resendOTP({ email, superAdminKey }));
  };

  const verifyAndReset = () => {
    if (otpString.length !== 6) {
      toast.error("Enter 6 digit OTP");
      return;
    }

    if (!newPassword || newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    dispatch(
      verifyOTPAndResetPassword({
        email,
        otp: otpString,
        superAdminKey,
        newPassword,
        confirmNewPassword
      })
    );
  };

  useEffect(() => {
    if (passwordResetSuccess) {
      toast.success("Password reset successful");

      setTimeout(() => {
        onBackToLogin();
        dispatch(resetFlags());
      }, 1500);
    }
  }, [passwordResetSuccess]);

  useEffect(() => {
    if (error) toast.error(error);
    if (message) toast.success(message);
  }, [error, message]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Homepage Background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(112deg, #ffffff 0%, #ffffff 25%, #edfbfd 40%, #c8f0f5 54%, #6dd8e8 70%, #1ec8de 84%, #00b8d4 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,160,210,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,160,210,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to right, transparent 10%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,1) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 10%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,1) 100%)',
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute pointer-events-none hidden lg:block"
          style={{
            bottom: '-120px',
            right: '-80px',
            width: '800px',
            height: '700px',
            background: 'radial-gradient(ellipse at 50% 55%, rgba(0,235,255,0.55) 0%, rgba(0,195,220,0.30) 32%, transparent 62%)',
            filter: 'blur(55px)',
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -45, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute pointer-events-none hidden lg:block"
          style={{
            top: '-60px',
            right: '-40px',
            width: '600px',
            height: '550px',
            background: 'radial-gradient(ellipse at 58% 28%, rgba(80,230,255,0.38) 0%, transparent 58%)',
            filter: 'blur(45px)',
          }}
        />

        {/* Modal Container */}
        <div className="relative z-10 w-full max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Header with animated icon */}
            <div className="bg-gradient-to-r from-slate-800 to-sky-700 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: step === 1 ? [0, 10, -10, 0] : 0,
                      scale: step === 2 ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"
                  >
                    {step === 1 ? (
                      <FaEnvelopeOpenText className="text-2xl text-white" />
                    ) : (
                      <FaLockOpen className="text-2xl text-white" />
                    )}
                  </motion.div>
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-bold text-white"
                    >
                      {step === 1 ? 'Reset Password' : 'Create New Password'}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm text-sky-200"
                    >
                      {step === 1 ? 'Enter your details to continue' : 'Secure your account with a new password'}
                    </motion.p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                >
                  <FaTimes />
                </motion.button>
              </div>

              {/* Animated Progress Steps */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2].map((s) => (
                  <motion.div
                    key={s}
                    animate={{
                      scale: step === s ? 1.05 : 1,
                      backgroundColor: step >= s ? '#ffffff' : 'rgba(255,255,255,0.2)'
                    }}
                    className="flex-1 h-2 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Animated Error/Success Messages */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, x: -10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-center gap-2 text-sm shadow-sm"
                  >
                    <FaExclamationTriangle className="text-red-500 flex-shrink-0 animate-pulse" />
                    {error}
                  </motion.div>
                )}

                {message && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, x: 10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-r-lg flex items-center gap-2 text-sm shadow-sm"
                  >
                    <FaCheckCircle className="text-green-500 flex-shrink-0 animate-bounce" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 1: Request OTP */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={requestOTP} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${emailValid ? 'text-green-500' : 'text-gray-400'
                          }`} />
                        <input
                          type="email"
                          name="email"
                          value={email}
                          onChange={onChange}
                          placeholder="admin@school.com"
                          className={`w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${emailValid
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                            }`}
                          required
                        />
                        {emailValid && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <FaCheckCircle className="text-green-500" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Super Admin Key
                      </label>
                      <div className="relative">
                        <RiShieldStarLine className={`absolute left-3 top-1/2 -translate-y-1/2 ${keyValid ? 'text-green-500' : 'text-gray-400'
                          }`} />
                        <input
                          type="password"
                          name="superAdminKey"
                          value={superAdminKey}
                          onChange={onChange}
                          placeholder="Enter secret key"
                          className={`w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${keyValid
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                            }`}
                          required
                        />
                        {keyValid && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <FaCheckCircle className="text-green-500" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || !emailValid || !keyValid}
                      className="w-full bg-gradient-to-r from-slate-800 to-sky-700 hover:from-slate-900 hover:to-sky-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send OTP <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Enter OTP and New Password */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block p-3 bg-sky-100 rounded-full mb-3"
                    >
                      <MdMarkEmailRead className="text-2xl text-sky-600" />
                    </motion.div>
                    <p className="text-sm text-gray-600">
                      We've sent a 6-digit code to
                    </p>
                    <p className="font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full inline-block mt-1">
                      {email}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* OTP Input Grid */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                        Enter Verification Code
                      </label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, index) => (
                          <motion.input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={index === 0 ? handleOtpPaste : undefined}
                            onFocus={() => setFocusedInput(index)}
                            onBlur={() => setFocusedInput(null)}
                            maxLength="1"
                            className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${focusedInput === index
                              ? 'border-sky-500 scale-110 shadow-lg'
                              : digit
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300'
                              }`}
                            autoFocus={index === 0}
                          />
                        ))}
                      </div>

                      {/* Resend OTP with timer */}
                      <div className="flex justify-center mt-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resendTimer > 0}
                          className="text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-sky-50 transition-all"
                        >
                          {resendTimer > 0 ? (
                            <>
                              <FaHourglassHalf className="animate-pulse" />
                              Resend in {resendTimer}s
                            </>
                          ) : (
                            <>
                              <FaClock />
                              Resend OTP
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Password Fields */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="border-t pt-6"
                    >
                      <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <FaLock className="text-sky-600" />
                        Create New Password
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="newPassword"
                              value={newPassword}
                              onChange={onChange}
                              placeholder="Create strong password"
                              className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>

                          {/* Password Strength Indicator */}
                          {newPassword && (
                            <div className="mt-2">
                              <div className="flex gap-1 h-1.5 mb-1">
                                {[1, 2, 3, 4].map((level) => (
                                  <motion.div
                                    key={level}
                                    initial={{ width: 0 }}
                                    animate={{ width: '25%' }}
                                    className={`h-full rounded-full transition-all ${passwordStrength >= level * 25
                                      ? getPasswordStrengthColor()
                                      : 'bg-gray-200'
                                      }`}
                                  />
                                ))}
                              </div>
                              <p className={`text-xs ${passwordStrength < 50 ? 'text-red-500' : 'text-green-600'
                                }`}>
                                {getPasswordStrengthText()} password
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              name="confirmNewPassword"
                              value={confirmNewPassword}
                              onChange={onChange}
                              placeholder="Confirm new password"
                              className={`w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${confirmNewPassword && newPassword === confirmNewPassword
                                ? 'border-green-500 focus:ring-green-500'
                                : confirmNewPassword && newPassword !== confirmNewPassword
                                  ? 'border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:ring-sky-500'
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                          {confirmNewPassword && newPassword !== confirmNewPassword && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-red-500 mt-1"
                            >
                              Passwords do not match
                            </motion.p>
                          )}
                          {confirmNewPassword && newPassword === confirmNewPassword && newPassword && (
                            <motion.p
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-xs text-green-600 mt-1 flex items-center gap-1"
                            >
                              <FaCheckCircle /> Passwords match
                            </motion.p>
                          )}
                        </div>

                        {/* Reset Password Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={verifyAndReset}
                          disabled={loading || otpString.length !== 6 || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                          className="w-full bg-gradient-to-r from-slate-800 to-sky-700 hover:from-slate-900 hover:to-sky-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                          {loading ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <MdVerified className="text-xl" />
                              Verify & Reset Password
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Back to Login Link */}
              <motion.button
                whileHover={{ x: -5 }}
                onClick={onBackToLogin}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto transition-colors"
              >
                <FaArrowLeft className="text-xs" /> Back to Login
              </motion.button>

              {/* Security Note with animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <FaShieldAlt className="text-sky-600" />
                  </motion.div>
                  Protected by enterprise-grade 256-bit encryption
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;