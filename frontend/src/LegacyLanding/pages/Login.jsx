import React, { useState, useEffect } from 'react';
import './Login.css';
import './Register.css';
import api from "../../services/api";
import { Shield, Building2, Presentation, Calculator, UserCog, Eye, EyeOff, ArrowRight, Info, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import BackgroundDoodles from '../components/BackgroundDoodles';
// import logoMain from '../../assets/logos/logo_main.png';
import logoMain from "../../assets/Graphura_Logo.webp";
import MobileLogin from './MobileLogin';
// Redux Integration
import { useDispatch } from "react-redux";
import { loginSuperAdmin } from "../../features/auth/superAuthSlice.js";
import { principalLogin } from "../../features/auth/principalAuthSlice.js";
import { loginAdmin } from "../../features/auth/adminAuthSlice.js";
import { accountantLogin } from "../../features/auth/accountantAuthSlice.js";
import { teacherLogin } from "../../features/auth/teacherAuthSlice.js";
import { parentLogin } from "../../features/auth/parentAuthSlice.js";
import { studentLogin } from "../../features/auth/studentAuthSlice.js";
import { toast } from "react-hot-toast";

export default function Login({ onNavigateHome, onNavigateRegister }) {
  const dispatch = useDispatch();

  const [orgId, setOrgId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!orgId || !password) {
      toast.error("Login ID and Password are required!");
      return;
    }

    setIsLoggingIn(true);
    let result;
    let redirectUrl = "";
    let isSuperAdmin = false;

    try {
      if (orgId.startsWith("ORG-")) {
        result = await dispatch(loginSuperAdmin({ organizationId: orgId, password }));
        redirectUrl = "/superadmin/dashboard";
        isSuperAdmin = true;
      } else if (orgId.startsWith("PRL-")) {
        result = await dispatch(principalLogin({ loginId: orgId, password }));
        redirectUrl = "/principal/dashboard";
      } else if (orgId.startsWith("ADM-")) {
        result = await dispatch(loginAdmin({ loginId: orgId, password }));
        redirectUrl = "/admin/dashboard";
      } else if (orgId.startsWith("ACC-")) {
        result = await dispatch(accountantLogin({ loginId: orgId, password }));
        redirectUrl = "/accountant/dashboard";
      } else if (orgId.startsWith("PAR-")) {
        result = await dispatch(parentLogin({ loginId: orgId, password }));
        redirectUrl = "/parent/dashboard";
      } else if (orgId.startsWith("STU-")) {
        result = await dispatch(studentLogin({ loginId: orgId, password }));
        redirectUrl = "/student/dashboard";
      } else {
        // Assume Teacher or default
        result = await dispatch(teacherLogin({ loginId: orgId, password }));
        redirectUrl = "/teacher/dashboard";
      }

      // Check if the specific action was fulfilled
      if (result.meta.requestStatus === 'fulfilled') {
        const data = result.payload.data;
        if (isSuperAdmin) {
            localStorage.removeItem("organizationId");
            localStorage.setItem("organizationId", data.organizationId);
            localStorage.setItem("organizationMongoId", data.id);
        } else if (data) {
            // Some slices might return different data structures. 
            // The token is usually handled inside the slice or axios interceptors.
            if (data.id) {
               localStorage.setItem("userId", data.id);
            }
        }
        
        toast.success("Logged in successfully!");
        window.location.href = redirectUrl;
      } else {
        toast.error(result.payload?.message || result.payload || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoggingIn(false);
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

  if (isMobile) {
    return (
      <MobileLogin
        orgId={orgId}
        setOrgId={setOrgId}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoggingIn={isLoggingIn}
        handleLogin={handleLogin}
        onNavigateHome={onNavigateHome}
        onNavigateRegister={onNavigateRegister}
        
        // Forgot Password States & Handlers
        view={view}
        setView={setView}
        forgotInput={forgotInput}
        setForgotInput={setForgotInput}
        otp={otp}
        setOtp={setOtp}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        forgotLoading={forgotLoading}
        maskedEmail={maskedEmail}
        handleForgotRequest={handleForgotRequest}
        handleVerifyOtp={handleVerifyOtp}
        handleResetPassword={handleResetPassword}
      />
    );
  }

  return (
    <div className="register-page legacy-root">
      <BackgroundDoodles />
      
      {/* Header */}
      <header className="register-header p-4 sm:p-6 lg:px-12 lg:py-6">
        <div className="register-logo-wrap flex items-center cursor-pointer" onClick={onNavigateHome}>
          <img src={logoMain} alt="Graphura" className="h-10 md:h-12 object-contain" />
        </div>
        <div className="register-header-actions">
          <span className="register-login-prompt">New to Graphura?</span>
          <button className="register-login-btn" onClick={onNavigateRegister}>Register</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="register-main">
        <div className="register-container-wrapper">
          <div className="register-card mobile-form-active">
            
            {/* Left Sidebar (Onboarding Panel) */}
            <div className="register-sidebar">
              <div className="sidebar-gradient-bg"></div>
              
              {/* Decorative brand light circles */}
              <div className="decor-circle circle-1"></div>
              <div className="decor-circle circle-2"></div>

              {/* CSS Grid Pattern (Low Opacity) */}
              <div className="glass-grid-overlay"></div>

              {/* Glowing Radial Gradients (Low Opacity) */}
              <div className="radial-glow glow-1"></div>
              <div className="radial-glow glow-2"></div>

              {/* Floating Geometric Shapes (Low Opacity) */}
              <div className="floating-shape circle-shape"></div>
              <div className="floating-shape square-shape"></div>
              <div className="floating-shape plus-shape">+</div>
              <div className="floating-shape dot-shape"></div>

              {/* Animated Light Beam */}
              <div className="light-beam"></div>

              {/* Sidebar Content */}
              <div className="sidebar-inner-content">
                <div className="sidebar-header">
                  <h1 className="sidebar-title" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fc9d8b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome Back</h1>
                  <p className="sidebar-desc">
                    Secure login for every school role. Clean enterprise style with focused access to your School ERP workspace.
                  </p>
                </div>

                {/* Centered Premium Security Section */}
                <div className="sidebar-security-section">
                  <div className="premium-sidebar-visual flex justify-center mb-6">
                    <div className="floating-hero-icon animate-float">
                      <div className="icon-glow-bg"></div>
                      <ShieldCheck size={100} strokeWidth={1} className="hero-shield-svg" />
                    </div>
                  </div>
                </div>

                <div className="sidebar-footer">
                  <button className="back-btn" onClick={onNavigateHome}>
                    <ArrowLeft size={16} /> Back to Home
                  </button>
                </div>
              </div>
            </div>

            {/* Right Content Area (Form / Recovery Views) */}
            <div className="register-content">
              <div className="form-inner-wrapper">
                <div className="form-wrapper py-8" style={{ margin: '0 auto', width: '100%', maxWidth: '440px' }}>
                  
                  {view === "login" && (
                    <>
                      <div className="form-header">
                        <h2>Sign in to your account</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter your Login Id and password to continue.</p>
                      </div>

                      <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                          <label>Login ID</label>
                          <input 
                            type="text" 
                            placeholder="Enter your Login ID" 
                            value={orgId}
                            onChange={(e) => setOrgId(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-group">
                          <label>Password</label>
                          <div className="password-input-wrap">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Enter your password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required 
                            />
                            <button 
                              type="button" 
                              className="eye-btn"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="form-actions space-between">
                          <button type="submit" className="submit-btn login-btn" disabled={isLoggingIn}>
                            {isLoggingIn ? "Logging in..." : "Login"} {!isLoggingIn && <ArrowRight size={18} />}
                          </button>
                        </div>
                      </form>

                      <div className="security-info-box">
                        <div className="sec-icon">
                          <Info size={16} />
                        </div>
                        <div className="sec-text">
                          <h4>Security Information</h4>
                          <p>Your session is protected with end-to-end encryption. Always remember to log out when using shared devices to prevent unauthorized access.</p>
                        </div>
                      </div>

                      <div className="login-footer-links">
                        <button 
                          type="button" 
                          onClick={() => setView("forgot_request")}
                          className="forgot-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Forgot password?
                        </button>
                        <button className="back-link" onClick={onNavigateHome}>
                          Back to Home
                        </button>
                      </div>
                    </>
                  )}

                  {view === "forgot_request" && (
                    <>
                      <div className="form-header">
                        <h2>Forgot Password</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter your registered Login ID below to send an OTP.</p>
                      </div>

                      <form onSubmit={handleForgotRequest} className="login-form">
                        <div className="form-group">
                          <label>Login ID</label>
                          <input 
                            type="text" 
                            placeholder="e.g. ADM-101" 
                            value={forgotInput}
                            onChange={(e) => setForgotInput(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-actions space-between">
                          <button type="submit" className="submit-btn login-btn" disabled={forgotLoading}>
                            {forgotLoading ? "Sending OTP..." : "Send OTP"} {!forgotLoading && <ArrowRight size={18} />}
                          </button>
                        </div>
                      </form>

                      <div className="security-info-box">
                        <div className="sec-icon">
                          <Info size={16} />
                        </div>
                        <div className="sec-text">
                          <h4>Verification Hint</h4>
                          <p>We'll lookup your Login ID and send a 6-digit OTP code to the verified contact email address in our database.</p>
                        </div>
                      </div>

                      <div className="login-footer-links">
                        <button 
                          type="button" 
                          onClick={() => setView("login")}
                          className="forgot-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Back to Login
                        </button>
                        <button className="back-link" onClick={onNavigateHome}>
                          Back to Home
                        </button>
                      </div>
                    </>
                  )}

                  {view === "forgot_verify" && (
                    <>
                      <div className="form-header">
                        <h2>Verify OTP</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter the 6-digit OTP code sent to your registered email <strong>{maskedEmail}</strong>.</p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="login-form">
                        <div className="form-group">
                          <label>OTP Code</label>
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="Enter 6-digit OTP" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            required 
                            style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 'bold' }}
                          />
                        </div>

                        <div className="form-actions space-between">
                          <button type="submit" className="submit-btn login-btn" disabled={forgotLoading}>
                            {forgotLoading ? "Verifying OTP..." : "Verify OTP"} {!forgotLoading && <ArrowRight size={18} />}
                          </button>
                        </div>
                      </form>

                      <div className="security-info-box">
                        <div className="sec-icon">
                          <Info size={16} />
                        </div>
                        <div className="sec-text">
                          <h4>Email Delivery</h4>
                          <p>OTP emails usually arrive within 30 seconds. If you don't see it, please check your Spam/Junk folder before requesting a new one.</p>
                        </div>
                      </div>

                      <div className="login-footer-links">
                        <button 
                          type="button" 
                          onClick={() => setView("forgot_request")}
                          className="forgot-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Change Login ID
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setView("login")}
                          className="back-link"
                        >
                          Back to Login
                        </button>
                      </div>
                    </>
                  )}

                  {view === "forgot_reset" && (
                    <>
                      <div className="form-header">
                        <h2>Create New Password</h2>
                        <p className="text-sm text-slate-500 mb-6">Please specify your new login credentials below.</p>
                      </div>

                      <form onSubmit={handleResetPassword} className="login-form">
                        <div className="form-group">
                          <label>New Password</label>
                          <input 
                            type="password" 
                            placeholder="Enter new password (min 6 chars)" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-group">
                          <label>Confirm New Password</label>
                          <input 
                            type="password" 
                            placeholder="Verify new password" 
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-actions space-between">
                          <button type="submit" className="submit-btn login-btn" disabled={forgotLoading}>
                            {forgotLoading ? "Resetting Password..." : "Reset Password"} {!forgotLoading && <ArrowRight size={18} />}
                          </button>
                        </div>
                      </form>

                      <div className="security-info-box">
                        <div className="sec-icon">
                          <CheckCircle2 size={16} />
                        </div>
                        <div className="sec-text">
                          <h4>Password Policy</h4>
                          <p>Choose a password with at least 6 characters. Make it strong by incorporating digits, symbols, and mixing uppercase and lowercase letters.</p>
                        </div>
                      </div>

                      <div className="login-footer-links">
                        <button 
                          type="button" 
                          onClick={() => setView("forgot_request")}
                          className="forgot-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Request New OTP
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setView("login")}
                          className="back-link"
                        >
                          Back to Login
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
