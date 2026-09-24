import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Building2, Mail, Phone, UserCircle2, ShieldCheck, 
  Calendar, Lock, Pencil, UploadCloud, Eye, EyeOff, Check, Copy
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAccountant,
  selectAccountantLoading,
  getAccountantProfile,
  changeAccountantPassword,
  uploadAccountantAvatarAction
} from '../../features/auth/accountantAuthSlice';
import toast from 'react-hot-toast';
import { 
  Heading, Button, PanelModal, DataField 
} from '../../components/shared/Common_Components';

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AC';

const Profile = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  const accountant = useSelector(selectAccountant);
  const loadingState = useSelector(selectAccountantLoading);
  const profileLoading = loadingState?.profile;
  const avatarLoading = loadingState?.avatar;

  const [copied, setCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: '',
    profileImageFile: null,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!accountant) {
      dispatch(getAccountantProfile());
    }
  }, [accountant, dispatch]);

  useEffect(() => {
    if (accountant) {
      setForm({
        name: accountant.name || '',
        email: accountant.email || '',
        phone: accountant.phone || '',
        profileImage: accountant.photo || '',
        profileImageFile: null,
      });
    }
  }, [accountant]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainContainer = document.querySelector('main') || document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [location.pathname]);

  const initials = useMemo(() => getInitials(accountant?.name), [accountant]);

  const schoolDisplay = useMemo(() => {
    return accountant?.school
      ? (typeof accountant.school === 'object'
          ? (accountant.school.schoolName || accountant.school.name || "Unknown School")
          : (accountant.school.toString().match(/^[0-9a-fA-F]{24}$/) ? "Unknown School" : accountant.school))
      : 'Unknown School';
  }, [accountant]);

  const completionPercentage = useMemo(() => {
    let filledFields = 0;
    const totalFields = 6;
    const currentName = accountant?.name;
    const currentEmail = accountant?.email;
    const currentPhone = accountant?.phone;
    const currentSchool = schoolDisplay !== 'Unknown School' ? schoolDisplay : null;
    const currentAvatar = accountant?.photo;
    const currentRole = accountant?.role;

    if (currentName?.trim()) filledFields++;
    if (currentEmail?.trim()) filledFields++;
    if (currentPhone?.trim()) filledFields++;
    if (currentSchool?.trim()) filledFields++;
    if (currentAvatar) filledFields++;
    if (currentRole?.trim()) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  }, [accountant, schoolDisplay]);

  const handleUpdate = async () => {
    toast.error("Profile update backend API is currently missing.");
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file format. Only JPG, JPEG, PNG, and WEBP are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 10MB.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const uploadToast = toast.loading("Uploading avatar...");
    try {
      await dispatch(uploadAccountantAvatarAction(formData)).unwrap();
      toast.success("Profile picture updated successfully!", { id: uploadToast });
    } catch (err) {
      toast.error(err || "Failed to upload avatar.", { id: uploadToast });
    } finally {
      event.target.value = "";
    }
  };

  const handleCopyLoginId = async () => {
    if (!accountant?.loginId) return;
    try {
      await navigator.clipboard.writeText(accountant.loginId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      toast.error("Failed to copy login ID");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordStrength = useMemo(() => {
    const password = passwordData.newPassword;
    if (!password) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (score <= 3) return { label: "Medium", color: "bg-yellow-500", width: "w-2/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  }, [passwordData.newPassword]);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Please fill all fields!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long!");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await dispatch(changeAccountantPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })).unwrap();

      if (res.success) {
        setPasswordSuccess(res.message || "Password changed successfully");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(res.message || "Failed to update password");
      }
    } catch (err) {
      setPasswordError(err || "Failed to change password. Please check your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const imageUrl = accountant?.photo;
  const joinDate = accountant?.createdAt 
    ? new Date(accountant.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'change_password', label: 'Change Password' }
  ];

  if (profileLoading && !accountant) {
    return (
      <div className="w-full space-y-6 text-left pb-10">
        <div>
          <Heading
            primaryText="Accountant"
            secondaryText="Profile"
            showAnimations={true}
            size={12}
          />
          <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide mt-2">
            View and manage accountant profile details.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#223F74]" />
        </div>
      </div>
    );
  }

  if (!accountant) {
    return (
      <div className="text-left w-full">
        <div className="bg-white rounded-[28px] border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-red-600 font-medium">Failed to fetch profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <Heading
          primaryText="Accountant"
          secondaryText="Profile"
          showAnimations={true}
          size={12}
        />
        <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide mt-2">
          View and manage accountant profile details.
        </p>
      </div>

      {/* Hero Profile Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <button
              onClick={handleAvatarClick}
              disabled={avatarLoading}
              className="relative group focus:outline-none"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Accountant avatar"
                  className={`h-28 w-28 rounded-2xl border-4 border-slate-50 object-cover shadow-sm transition-transform duration-200 ${avatarLoading ? 'opacity-50' : 'hover:scale-105'}`}
                />
              ) : (
                <div className={`grid h-28 w-28 place-items-center rounded-2xl border-4 border-slate-50 bg-[#e8612c]/10 text-4xl font-bold text-[#e8612c] transition-transform duration-200 ${avatarLoading ? 'opacity-50' : 'hover:scale-105'}`}>
                  {initials}
                </div>
              )}
              {avatarLoading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <UploadCloud className="text-white" size={24} />
                </div>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black tracking-tight text-[#223F74]">{accountant?.name || 'Accountant'}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" /> Accountant
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                Role: School Accountant
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {accountant?.email || '-'}
                </span>
                {accountant?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {accountant?.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {schoolDisplay}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined {joinDate}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-3 self-stretch justify-between">
            <Button
              text="Edit Profile"
              onClick={() => setIsEditing(true)}
              icon={<Pencil size={14} />}
              variant="primary"
              className="self-end"
            />
            <div className="w-full md:w-64">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span className="uppercase tracking-wider">Profile Completion</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab system */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
        <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] py-4 px-6 text-sm font-bold capitalize transition-colors border-b-2 whitespace-nowrap outline-none ${
                activeTab === tab.id 
                  ? 'border-[#223F74] text-[#223F74] bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-50/30 min-h-[400px] flex flex-col gap-6">
          {activeTab === 'overview' && (
            <>
              {/* Responsive Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
                  <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <UserCircle2 size={18} className="text-[#e8612c]" />
                    Personal Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Full Name</span>
                      <span className="text-sm font-semibold text-slate-700">{accountant?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Designation</span>
                      <span className="text-sm font-semibold text-slate-700">{accountant?.role || 'Accountant'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
                  <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Mail size={18} className="text-[#e8612c]" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                      <span className="text-sm font-semibold text-slate-700">{accountant?.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
                      <span className="text-sm font-semibold text-slate-700">{accountant?.phone || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* School Information */}
                <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
                  <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Building2 size={18} className="text-[#e8612c]" />
                    School Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">School Name</span>
                      <span className="text-sm font-semibold text-slate-700">{schoolDisplay}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">School Branch</span>
                      <span className="text-sm font-semibold text-slate-700">{accountant?.school?.branchName || 'Main Branch'}</span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
                  <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <ShieldCheck size={18} className="text-[#e8612c]" />
                    Account Information
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Login ID</span>
                          <span className="text-sm font-semibold text-slate-700 block">{accountant?.loginId || "-"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyLoginId}
                          className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                          title="Copy Login ID"
                        >
                          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Account Status</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-100">
                          Active
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Created At</span>
                        <span className="text-sm font-semibold text-slate-700">
                          {accountant?.createdAt ? new Date(accountant.createdAt).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Last Login</span>
                        <span className="text-sm font-semibold text-slate-700">
                          {accountant?.lastLoginAt ? new Date(accountant.lastLoginAt).toLocaleString() : 'Active Now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}

          {activeTab === 'change_password' && (
            <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Lock size={18} className="text-[#e8612c]" />
                Change Password
              </h3>

              {passwordError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "currentPassword", label: "Current Password" },
                  { key: "newPassword", label: "New Password" },
                  { key: "confirmPassword", label: "Confirm New Password" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400 block mb-1">{field.label}</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPasswords[field.key] ? "text" : "password"}
                        value={passwordData[field.key]}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-slate-800 placeholder-gray-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(field.key)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Password Strength: {passwordStrength.label}</p>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all`} />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <Button
                    text={passwordLoading ? "Updating..." : "Update Password"}
                    type="submit"
                    variant="primary"
                    disabled={passwordLoading}
                    className="px-6 py-2.5 font-bold"
                  />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <PanelModal
          id="edit-profile-modal"
          title="Edit Profile"
          size="md"
          isVisible={isEditing}
          onClose={() => setIsEditing(false)}
        >
          <div className="space-y-4 pb-4">
            <DataField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
            />
            <DataField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="accountant@school.edu"
            />
            <DataField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter contact number"
            />
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Profile Image</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-sm transition-colors duration-200 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold">
                  <UploadCloud className="w-4 h-4 text-blue-500" />
                  Upload File
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                <input
                  value={form.profileImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, profileImage: e.target.value }))}
                  placeholder="Or paste image URL"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-slate-800 placeholder-gray-400 font-medium"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                text="Cancel"
                onClick={() => setIsEditing(false)}
                variant="secondary"
              />
              <Button
                text="Save Changes"
                onClick={handleUpdate}
                variant="primary"
              />
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default Profile;
