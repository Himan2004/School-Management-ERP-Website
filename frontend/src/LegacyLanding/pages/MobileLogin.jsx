import React from 'react';
import { Eye, EyeOff, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import logoMain from "../../assets/Graphura_Logo.webp";
import './Register.css';
import './Login.css';

export default function MobileLogin({
  orgId,
  setOrgId,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoggingIn,
  handleLogin,
  onNavigateHome,
  onNavigateRegister,
  
  // Forgot Password States & Handlers
  view,
  setView,
  forgotInput,
  setForgotInput,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  forgotLoading,
  maskedEmail,
  handleForgotRequest,
  handleVerifyOtp,
  handleResetPassword
}) {
  return (
    <div className="register-page legacy-root" style={{ height: 'auto', minHeight: '100vh', overflowY: 'auto' }}>
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
            <div className="register-content">
              <div className="form-inner-wrapper">
                <div className="form-wrapper py-6 mx-auto w-full" style={{ maxWidth: '440px' }}>
                  
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
