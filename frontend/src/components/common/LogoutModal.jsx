// components/common/LogoutModal.jsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, X, ShieldAlert } from 'lucide-react';
import { toast } from "react-hot-toast"

/**
 * LogoutModal — Universal logout confirmation popup.
 *
 * Props:
 *  - isOpen   {boolean}   Whether the modal is visible
 *  - onClose  {function}  Called when user dismisses without logging out
 */
const LogoutModal = ({ isOpen, onClose, logout, isLoggingOut }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape' && !isLoggingOut) onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, isLoggingOut, onClose]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();

            toast.success("Logout successful!");
            navigate('/login');

        } catch (error) {
            alert(error || "Logout failed ❌");
        }
    };

    if (!isOpen) return null;

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => { if (!isLoggingOut) onClose(); }}
        >
            {/* Modal card */}
            <div
                className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl
          animate-[modalIn_0.2s_ease-out]"
                onClick={(e) => e.stopPropagation()}
                style={{
                    animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
            >
                {/* Close button — hidden while logging out */}
                {!isLoggingOut && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400
              hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className="p-8">
                    {/* Icon */}
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center
            rounded-full bg-red-50 ring-8 ring-red-50/60">
                        {isLoggingOut ? (
                            // Spinner
                            <svg
                                className="h-8 w-8 animate-spin text-red-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="3"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                            </svg>
                        ) : (
                            <ShieldAlert className="h-8 w-8 text-red-500" />
                        )}
                    </div>

                    {/* Text */}
                    <div className="text-center mb-7">
                        <h2 className="text-lg font-semibold text-slate-800 mb-1.5">
                            {isLoggingOut ? 'Signing you out…' : 'Sign out of Teacher Portal?'}
                        </h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {isLoggingOut
                                ? 'Please wait while we securely end your session.'
                                : "You'll need to sign in again to access your dashboard and classes."}
                        </p>
                    </div>

                    {/* Actions */}
                    {!isLoggingOut && (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5
                  text-sm font-medium text-slate-700 transition-all
                  hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
                            >
                                Stay signed in
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl
                  bg-red-500 px-4 py-2.5 text-sm font-medium text-white
                  transition-all hover:bg-red-600 active:scale-[0.98] shadow-sm
                  hover:shadow-red-200 hover:shadow-md"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom accent bar */}
                <div className="h-1 w-full rounded-b-2xl bg-gradient-to-r from-red-400 via-rose-400 to-red-500" />
            </div>

            {/* Keyframe for modal pop-in */}
            <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default LogoutModal;