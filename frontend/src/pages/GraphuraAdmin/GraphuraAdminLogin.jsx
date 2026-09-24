import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaEye, FaEyeSlash, FaShieldAlt, FaCrown, FaLock, FaKey,
    FaHome, FaArrowLeft, FaUsers, FaSchool, FaGlobe,
    FaFingerprint, FaShieldVirus, FaMicrochip, FaGraduationCap, FaEnvelope
} from 'react-icons/fa';
import {
    graphuraAdminLogin,
    forgotGraphuraPassword,
    resetGraphuraPassword,
    selectGraphuraLoginLoading,
    clearErrors,
    selectGraphuraLoginError
} from '../../features/auth/graphuraAuthSlice';

const GraphuraAdminLogin = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const loading = useSelector(selectGraphuraLoginLoading);
    const error = useSelector(selectGraphuraLoginError);

    // Form States
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [graphuraKey, setGraphuraKey] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const formRef = useRef(null);

    useEffect(() => {
        if (submitAttempted) dispatch(clearErrors());
    }, [email, password, graphuraKey, otp, newPassword, submitAttempted, dispatch]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setSubmitAttempted(true);
        setIsSubmitting(true);
        dispatch(clearErrors());

        if (!email.trim() || !password.trim() || !graphuraKey.trim()) {
            toast.error('All three credentials are required.');
            setIsSubmitting(false);
            return;
        }

        try {
            await dispatch(graphuraAdminLogin({ email, password, graphuraKey })).unwrap();
            toast.success('Access granted. Welcome, Graphura.');
            navigate('/graphura-admin/dashboard');
        } catch (err) {
            toast.error(err || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        if (!email.trim()) {
            toast.error('Please enter your admin email.');
            setIsSubmitting(false);
            return;
        }

        try {
            await dispatch(forgotGraphuraPassword(email)).unwrap();
            toast.success('OTP sent to your email.');
            setView('reset');
        } catch (err) {
            toast.error(err || 'Failed to send OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        if (!otp.trim() || !newPassword.trim()) {
            toast.error('OTP and new password are required.');
            setIsSubmitting(false);
            return;
        }

        try {
            await dispatch(resetGraphuraPassword({ email, otp, newPassword })).unwrap();
            toast.success('Password reset successfully. Please log in.');
            setView('login');
            setPassword('');
            setGraphuraKey('');
            setOtp('');
        } catch (err) {
            toast.error(err || 'Failed to reset password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToHome = () => navigate('/');

    // Animation variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
    const formVariants = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">

            {/* Premium Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl animate-pulse-slow delay-1500"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-50/60 via-transparent to-purple-50/60 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-20 py-4 px-6 md:py-5 md:px-8 flex items-center justify-between border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <motion.button onClick={handleBackToHome} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:shadow-md transition-all">
                            <FaArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">Back to Home</span>
                            <FaHome className="w-4 h-4 sm:hidden" />
                        </motion.button>

                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur-sm animate-pulse"></div>
                                <FaShieldAlt className="w-6 h-6 text-indigo-600 relative z-10" />
                            </div>
                            <div>
                                <span className="text-gray-800 font-bold text-xl tracking-tight">Graphura</span>
                                <p className="text-[10px] md:text-xs text-gray-400 -mt-1">Sovereign Infrastructure</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center py-8 md:py-12">
                    <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

                        {/* Left Side - Brand Story */}
                        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
                            <motion.div variants={itemVariants}>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full mb-6 border border-indigo-100">
                                    <FaCrown className="w-4 h-4 text-indigo-500" />
                                    <span className="text-sm font-bold text-indigo-600 tracking-wider">ULTIMATE AUTHORITY • ROOT ACCESS</span>
                                </div>
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-4">
                                    <span className="block text-gray-800">The Root of</span>
                                    <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">Every School.</span>
                                </h1>
                                <p className="text-gray-500 text-base lg:text-lg leading-relaxed">
                                    Sovereign terminal with unrestricted authority across the entire Graphura ecosystem. Fortified with advanced safeguards.
                                </p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: FaSchool, label: 'Schools', value: '500+', color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-50' },
                                    { icon: FaGraduationCap, label: 'Students', value: '50K+', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50' },
                                    { icon: FaUsers, label: 'Teachers', value: '5K+', color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50' },
                                    { icon: FaGlobe, label: 'Countries', value: '25+', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50' }
                                ].map((stat, idx) => (
                                    <div key={idx} className={`${stat.bgColor} backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-lg transition-all group`}>
                                        <stat.icon className={`w-6 h-6 mx-auto mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent group-hover:scale-110 transition-transform`} />
                                        <p className="text-xl md:text-2xl font-bold text-gray-800">{stat.value}</p>
                                        <p className="text-xs text-gray-500">{stat.label}</p>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Right Side - Dynamic Auth Forms */}
                        <div className="lg:sticky lg:top-18">
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                                <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>

                                <div className="p-6 md:p-10">
                                    <AnimatePresence mode="wait">
                                        
                                        {/* LOGIN VIEW */}
                                        {view === 'login' && (
                                            <motion.div key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                                <div className="mb-6 text-center">
                                                    <h2 className="text-2xl font-bold text-gray-800">Command Access</h2>
                                                    <p className="text-sm text-gray-500 mt-1">Enter your credentials to access sovereign infrastructure</p>
                                                </div>

                                                <form onSubmit={handleLoginSubmit} className="space-y-5">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Admin Email</label>
                                                        <input
                                                            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                                            placeholder="admin@graphura.com"
                                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="block text-xs font-semibold text-gray-600 uppercase">Password</label>
                                                            <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Forgot?</button>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                                                                placeholder="••••••••••••"
                                                                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                            />
                                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Sovereign Key</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showKey ? 'text' : 'password'} value={graphuraKey} onChange={(e) => setGraphuraKey(e.target.value)} required
                                                                placeholder="••••••••••••••••"
                                                                className="w-full px-4 py-3 pr-12 rounded-xl bg-indigo-50/50 border border-indigo-200 text-indigo-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                            />
                                                            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                                                                {showKey ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                                                        {isSubmitting ? "Verifying..." : "Verification"}
                                                    </button>
                                                </form>
                                            </motion.div>
                                        )}

                                        {/* FORGOT PASSWORD VIEW */}
                                        {view === 'forgot' && (
                                            <motion.div key="forgot" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                                <div className="mb-6 text-center">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-indigo-50 rounded-full">
                                                        <FaEnvelope className="w-6 h-6 text-indigo-500" />
                                                    </div>
                                                    <h2 className="text-2xl font-bold text-gray-800">Reset Authority</h2>
                                                    <p className="text-sm text-gray-500 mt-1">Enter your admin email to receive a recovery token.</p>
                                                </div>

                                                <form onSubmit={handleForgotSubmit} className="space-y-5">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Admin Email</label>
                                                        <input
                                                            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                                            placeholder="admin@graphura.com"
                                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    </div>
                                                    
                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                                                        {isSubmitting ? "Sending..." : "Send Reset Token"}
                                                    </button>
                                                    <button type="button" onClick={() => setView('login')} className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                                                        Return to Login
                                                    </button>
                                                </form>
                                            </motion.div>
                                        )}

                                        {/* RESET PASSWORD VIEW */}
                                        {view === 'reset' && (
                                            <motion.div key="reset" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                                                <div className="mb-6 text-center">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-purple-50 rounded-full">
                                                        <FaLock className="w-6 h-6 text-purple-500" />
                                                    </div>
                                                    <h2 className="text-2xl font-bold text-gray-800">Secure Override</h2>
                                                    <p className="text-sm text-gray-500 mt-1">Enter the 6-digit token sent to your email.</p>
                                                </div>

                                                <form onSubmit={handleResetSubmit} className="space-y-5">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Recovery Token (OTP)</label>
                                                        <input
                                                            type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} required
                                                            placeholder="123456"
                                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono tracking-widest text-center text-lg outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">New Password</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                                                                placeholder="Enter new password"
                                                                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                                            />
                                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase bg-purple-600 text-white shadow-md hover:bg-purple-700 transition-all disabled:opacity-50">
                                                        {isSubmitting ? "Updating..." : "Update Password"}
                                                    </button>
                                                    <button type="button" onClick={() => setView('login')} className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                                                        Cancel Override
                                                    </button>
                                                </form>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default GraphuraAdminLogin;