// components/hero/AdmissionButton.jsx
import React from 'react';
import { motion as Motion } from 'framer-motion';
import { FaUserPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const AdmissionButton = ({ className = '' }) => {
    const navigate = useNavigate();

    return (
        <Motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -3, boxShadow: "0 12px 32px rgba(139,92,246,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/student-admission")}
            className={`relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-7 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-violet-300/40 transition-all w-full sm:w-auto ${className}`}
        >
            {/* Shimmer sweep */}
            <Motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
            />
            <FaUserPlus className="text-lg relative z-10" />
            <span className="relative z-10">Student Admission</span>
        </Motion.button>
    );
};

export default AdmissionButton;