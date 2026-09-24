import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { 
  User, Lock, Shield, Key, Eye, EyeOff, Save, 
  Mail, Info, UserCheck, ShieldCheck, CheckCircle
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { selectParent, getParentProfile } from "../../features/auth/parentAuthSlice";
import { Heading } from "../../components/shared/Common_Components";

const CARD = "bg-white rounded-[28px] p-6 shadow-sm border border-[#E7E2DB]";

export default function Settings() {
  const dispatch = useDispatch();
  const parent = useSelector(selectParent);

  // Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!parent) {
      dispatch(getParentProfile());
    }
  }, [parent, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setUpdating(true);
    try {
      const response = await api.put("/auth/parent/change-password", {
        currentPassword,
        newPassword
      });

      if (response.data?.success) {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(response.data?.message || "Failed to update password");
      }
    } catch (err) {
      console.error("Change password error:", err);
      toast.error(err.response?.data?.message || "Error updating password");
    } finally {
      setUpdating(false);
    }
  };

  const accountStatus = parent?.status || "active";

  return (
    <div className="w-full space-y-6 pb-10 text-left min-h-screen">
      
      {/* Page Heading */}
      <Heading
        primaryText="Settings &"
        secondaryText="Security"
        size={12}
        showAnimations={true}
      />

      {/* Main Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Info Card */}
        <div className={`${CARD} lg:col-span-1 flex flex-col gap-6`}>
          <div className="flex items-center gap-3 border-b border-[#E7E2DB] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74]">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base leading-none">Profile Summary</h2>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-wider">Your personal details</p>
            </div>
          </div>

          {/* User Initial Avatar Banner */}
          <div className="bg-[#F8EEE9]/75 rounded-2xl p-5 border border-[#E7E2DB]/50 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#223F74] text-white flex items-center justify-center font-black text-xl shadow-inner select-none">
              {parent?.name ? parent.name.charAt(0) : "P"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Parent Account</p>
              <h4 className="text-base font-black text-[#223F74] leading-tight tracking-tight">{parent?.name || "Parent Name"}</h4>
              <p className="text-[11px] font-semibold text-slate-500 font-mono mt-1">{parent?.loginId || "Login ID"}</p>
            </div>
          </div>

          {/* Profile Details List */}
          <div className="space-y-4 text-xs font-semibold text-slate-600">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Registered Email</span>
              <span className="text-slate-700 font-bold">{parent?.email || "—"}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Portal Role</span>
              <span className="bg-[#223F74]/10 text-[#223F74] px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                {parent?.role || "parent"}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Account Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${
                accountStatus === "active" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${accountStatus === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                {accountStatus}
              </span>
            </div>
          </div>

          {/* Linked Students Section */}
          {parent?.students && parent.students.length > 0 && (
            <div className="border-t border-[#E7E2DB] pt-4 mt-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block mb-3">Linked Children Profiles</span>
              <div className="space-y-2">
                {parent.students.map((student, idx) => (
                  <div key={student._id || idx} className="bg-white border border-[#E7E2DB] p-3 rounded-2xl flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="w-8 h-8 rounded-xl bg-[#F8EEE9] flex items-center justify-center text-[#223F74]">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-xs leading-none">{student.name}</p>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wide mt-1">
                        Class {student.class || "—"} ({student.section || "—"})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Change Password Form Card */}
        <div className={`${CARD} lg:col-span-2 flex flex-col gap-6`}>
          <div className="flex items-center gap-3 border-b border-[#E7E2DB] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74]">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base leading-none">Security Settings</h2>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-wider">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key size={16} />
                </span>
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-[#E7E2DB] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all text-xs font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password (minimum 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-[#E7E2DB] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all text-xs font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck size={16} />
                </span>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-[#E7E2DB] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition-all text-xs font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E7E2DB] mt-6">
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-3 bg-[#223F74] hover:bg-[#1a3360] text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                <Save size={16} />
                {updating ? "Saving Changes..." : "Save Password"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
