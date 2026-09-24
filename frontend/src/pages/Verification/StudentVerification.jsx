import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  ShieldCheck, AlertTriangle, School, User, Calendar, IdCard, Info
} from "lucide-react";
import api from "../../services/api";

export default function StudentVerification() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    const verifyCard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/id-card/verify/${token}`);
        if (response.data?.success) {
          setVerificationData(response.data.data);
        } else {
          setError(response.data?.message || "Verification failed");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Invalid QR Code or student record not found.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyCard();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center shadow-sm">
            <IdCard className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-extrabold text-sm text-slate-400 tracking-wider uppercase">Validating Credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-left">
        <div className="w-full max-w-md bg-white border border-red-100 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-rose-700 tracking-tight mb-2">Invalid ID Card</h1>
          <p className="text-sm text-slate-500 mb-6">{error || "This identity card has expired, been revoked, or does not exist in the school system."}</p>
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verification Status</span>
            <span className="text-xs text-rose-600 font-extrabold bg-rose-50 border border-rose-100 px-3 py-1 rounded-full w-fit mx-auto">
              Verification Failed
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { student, school, card } = verificationData;

  const getStatusColor = (status) => {
    const s = status ? status.toLowerCase() : "";
    if (s === "printed" || s === "distributed" || s === "active" || s === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "rejected" || s === "inactive" || s === "expired") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const studentPhoto = student.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=223F74&color=fff`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F7FB] to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 text-left font-sans">
      <div className="w-full max-w-xl bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Verification Success Banner - Matched to primary blue + orange theme */}
        <div className="bg-gradient-to-br from-[#223F74] to-[#1A3058] text-white p-6 text-center flex flex-col items-center justify-center gap-2 border-b border-slate-750">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <ShieldCheck className="w-7 h-7 text-[#EC856D]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight uppercase">Verified Student ID</h2>
            <p className="text-[10px] text-white/80 font-bold tracking-widest uppercase mt-0.5">Official Verification Successful</p>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="p-6 space-y-6">
          {/* School Block */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            {school.schoolLogo ? (
              <img src={school.schoolLogo} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-sm border border-slate-150" />
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shadow-inner text-slate-400">
                <School className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-sm text-[#223F74] uppercase tracking-wider">{school.schoolName}</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">{school.schoolAddress || "Official Address"}</p>
            </div>
          </div>

          {/* Student Profile Block */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Student Photo */}
            <div className="w-28 h-36 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm flex-shrink-0">
              <img src={studentPhoto} alt={student.name} className="w-full h-full object-cover animate-fade-in" />
            </div>

            {/* Info Grid */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Student Name</span>
                <span className="text-slate-800 text-base font-black uppercase tracking-tight">{student.name}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Admission Number</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.admissionNo}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Roll Number</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.rollNo}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Class & Section</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.class} — {student.section}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Academic Session</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.academicYear}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Blood Group</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.bloodGroup}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Parent / Guardian</span>
                <span className="text-slate-800 font-extrabold text-sm uppercase">{student.parentName}</span>
              </div>
            </div>
          </div>

          {/* Card Registry Block */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Card Number</span>
              <span className="text-slate-700 font-extrabold text-xs">
                {(card.cardNumber && card.cardNumber !== "N/A") 
                  ? card.cardNumber 
                  : ((card.serialNumber && card.serialNumber !== "N/A") 
                    ? card.serialNumber 
                    : (token || "N/A"))}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Card Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border w-fit inline-block mt-1 ${getStatusColor(card.status)}`}>
                {card.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Issue Date</span>
              <span className="text-slate-700 font-extrabold text-xs">
                {card.issueDate ? new Date(card.issueDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Valid Until</span>
              <span className="text-slate-700 font-extrabold text-xs uppercase">{card.validUntil}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 py-4 px-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          © {new Date().getFullYear()} {school.schoolName}. All rights reserved.
        </div>

      </div>
    </div>
  );
}