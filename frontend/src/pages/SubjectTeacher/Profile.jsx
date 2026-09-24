import React, { useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { 
  Building2, Mail, Phone, UserCircle2, ShieldCheck, 
  Calendar, Clock, Lock, Settings as SettingsIcon, Pencil, UploadCloud,
  GraduationCap, Users, HeartHandshake, Eye, EyeOff, CheckCircle, Loader2
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Heading, Button, PanelModal, DataField, Grid
} from '../../components/shared/Common_Components';
import {
  getTeacherProfile,
  updateTeacherProfile,
  uploadProfileImage,
  changeTeacherPassword
} from '../../services/api/subjectTeacherProfileApi';

// Module-level cache to prevent unnecessary loading states and duplicate fetches on navigation
let cachedProfile = null;
let lastFetchedTime = 0;

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ST';

const SubjectTeacherProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    phone: cachedProfile?.phone || '',
    alternativePhone: cachedProfile?.alternativePhone || '',
    address: cachedProfile?.address || { street: '', city: '', state: '', pincode: '' },
    emergencyContactName: cachedProfile?.emergencyContactName || '',
    emergencyContactRelation: cachedProfile?.emergencyContactRelation || '',
    emergencyContactPhone: cachedProfile?.emergencyContactPhone || '',
    gender: cachedProfile?.gender || 'Male',
    dateOfBirth: cachedProfile?.dateOfBirth ? new Date(cachedProfile.dateOfBirth).toISOString().split('T')[0] : '',
    qualification: cachedProfile?.qualification || '',
    maritalStatus: cachedProfile?.maritalStatus || '',
    nationality: cachedProfile?.nationality || '',
    bloodGroup: cachedProfile?.bloodGroup || '',
    experience: cachedProfile?.experience || 0
  });

  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(cachedProfile?.photo || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Scroll to top immediately on mount
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainContainer = document.querySelector('main') || document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [location.pathname]);

  // Sync tab with URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'password') {
      setActiveTab('password');
    } else {
      setActiveTab('profile');
    }
  }, [location.search]);

  // Fetch teacher profile on mount
  const fetchProfile = async () => {
    const now = Date.now();
    // Cache for 30 seconds to prevent unnecessary API calls during sidebar navigation
    if (cachedProfile && (now - lastFetchedTime < 30000)) {
      setLoading(false);
      return;
    }

    try {
      if (!cachedProfile) {
        setLoading(true);
      }
      const res = await getTeacherProfile();
      if (res.success) {
        setProfile(res.data);
        cachedProfile = res.data;
        lastFetchedTime = Date.now();
        setAvatarPreview(res.data.photo);
        
        // Populate edit form
        setEditForm({
          phone: res.data.phone || '',
          alternativePhone: res.data.alternativePhone || '',
          address: res.data.address || { street: '', city: '', state: '', pincode: '' },
          emergencyContactName: res.data.emergencyContactName || '',
          emergencyContactRelation: res.data.emergencyContactRelation || '',
          emergencyContactPhone: res.data.emergencyContactPhone || '',
          gender: res.data.gender || 'Male',
          dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : '',
          qualification: res.data.qualification || '',
          maritalStatus: res.data.maritalStatus || '',
          nationality: res.data.nationality || '',
          bloodGroup: res.data.bloodGroup || '',
          experience: res.data.experience || 0
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to fetch teacher profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Initials for avatar fallback
  const initials = useMemo(() => getInitials(profile?.name || ''), [profile]);

  // Calculate profile completion percentage
  const completionPercentage = useMemo(() => {
    if (!profile) return 0;
    let filledFields = 0;
    const fieldsToTrack = [
      profile.name,
      profile.email,
      profile.phone,
      profile.photo,
      profile.qualification,
      profile.address?.street,
      profile.emergencyContactName,
      profile.joiningDate,
      profile.bloodGroup
    ];
    fieldsToTrack.forEach(field => {
      if (field && String(field).trim() !== "") filledFields++;
    });
    return Math.round((filledFields / fieldsToTrack.length) * 100);
  }, [profile]);

  // Handle image upload and preview
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ''));
    };
    reader.readAsDataURL(file);

    // Proactively upload image immediately
    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await uploadProfileImage(formData);
      if (res.success) {
        toast.success("Profile image updated successfully");
        setProfile(prev => {
          const updated = { ...prev, photo: res.data.photo };
          cachedProfile = updated;
          lastFetchedTime = Date.now();
          return updated;
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Edit profile save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await updateTeacherProfile(editForm);
      if (res.success) {
        setProfile(res.data);
        cachedProfile = res.data;
        lastFetchedTime = Date.now();
        setIsEditing(false);
        toast.success("Profile updated successfully");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setInlineError('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setInlineError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setInlineError('Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setInlineError('Confirm password does not match new password.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setInlineError('New password must be different from current password.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await changeTeacherPassword(passwordForm);
      if (res.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password strength checker
  const newPasswordStrength = useMemo(() => {
    const val = passwordForm.newPassword;
    if (!val) return { label: 'Weak', score: 0, color: 'bg-gray-200' };
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
    if (/\d/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
    if (score === 2) return { label: 'Medium', score: 2, color: 'bg-amber-500' };
    return { label: 'Strong', score: 3, color: 'bg-emerald-500' };
  }, [passwordForm.newPassword]);

  // Loading Screen
  if (loading || !profile) {
    return (
      <div className="w-full py-20 flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#223F74]" size={32} />
        <p className="text-[#223F74] font-bold tracking-widest uppercase text-xs">
          Loading Profile details...
        </p>
      </div>
    );
  }

  const joinDate = profile.joiningDate 
    ? new Date(profile.joiningDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' })
    : 'N/A';

  return (
    <div className="w-full space-y-8 pb-10 text-left font-sans">
      
      {/* Page Header */}
      <Heading
        primaryText="Subject Teacher"
        secondaryText="Profile"
        showAnimations={true}
        size={12}
      />
      <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide">
        View and manage your profile details.
      </p>

      {/* Hero Header Card */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Teacher avatar"
                  className="h-28 w-28 rounded-2xl border-4 border-slate-50 object-cover shadow-sm"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-2xl border-4 border-slate-50 bg-[#223F74]/10 text-4xl font-bold text-[#223F74]">
                  {initials}
                </div>
              )}
              <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <UploadCloud className="text-white w-6 h-6" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploadingImage} />
              </label>
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                  <Loader2 className="animate-spin text-white w-6 h-6" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black tracking-tight text-[#223F74]">{profile.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" /> Subject Teacher
                </span>
              </div>
              <p className="text-sm font-bold text-slate-500 capitalize">
                {profile.designation} — {profile.department || "Academics"} Department
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {profile.school?.schoolName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined {joinDate}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-auto flex flex-col items-stretch lg:items-end gap-3 self-stretch justify-between">
            <Button
              text="Edit Profile"
              onClick={() => setIsEditing(true)}
              icon={<Pencil size={14} />}
              variant="primary"
              className="self-end"
            />
            <div className="w-full lg:w-64">
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

      {/* Tabs */}
      <div className="flex w-full border-b border-gray-200 flex-wrap">
        <button
          onClick={() => { setActiveTab("profile"); navigate('/subject-teacher/profile'); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "profile" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <UserCircle2 size={18} />
          My Profile Details
        </button>
        <button
          onClick={() => { setActiveTab("password"); navigate('/subject-teacher/profile?tab=password'); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "password" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Lock size={18} />
          Change Password
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Personal Information */}
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <UserCircle2 size={18} className="text-[#223F74]" />
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Full Name</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.name}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gender</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.gender}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Date of Birth</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Blood Group</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.bloodGroup || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Marital Status</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.maritalStatus || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Nationality</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.nationality || '-'}</span>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <GraduationCap size={18} className="text-[#223F74]" />
                Professional Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Employee ID</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.staffId || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Designation</span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">{profile.designation}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Role</span>
                  <span className="text-sm font-semibold text-slate-700 uppercase">{profile.role}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Department</span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">{profile.department || 'Academics'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Qualification</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.qualification || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Experience (Years)</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.experience} years</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Subjects Assigned</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {(profile.subjects || []).map((s, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2.5 text-left transition hover:border-[#223F74]/20">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#223F74]">{s.name}</span>
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Code: {s.code || '-'}</span>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 uppercase">
                            {s.status || 'Active'}
                          </span>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSelectedSubject(s)}
                            className="px-3 py-1 text-xs font-bold text-[#223F74] bg-[#223F74]/5 hover:bg-[#223F74]/10 rounded-lg transition"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                    {(profile.subjects || []).length === 0 && (
                      <div className="col-span-2 py-4 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold text-sm">
                        No Subjects Assigned
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Mail size={18} className="text-[#223F74]" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                    <span className="text-sm font-semibold text-slate-700">{profile.email}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
                    <span className="text-sm font-semibold text-slate-700">{profile.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Alternative Phone</span>
                    <span className="text-sm font-semibold text-slate-700">{profile.alternativePhone || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Address</span>
                  <span className="text-sm font-semibold text-slate-700 block">
                    {profile.address?.street || '-'}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {profile.address?.city && `${profile.address.city}, `}
                    {profile.address?.state && `${profile.address.state} — `}
                    {profile.address?.pincode}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <HeartHandshake size={18} className="text-[#223F74]" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Guardian Name</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.emergencyContactName || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Relationship</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.emergencyContactRelation || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.emergencyContactPhone || '-'}</span>
                </div>
              </div>
            </div>

            {/* School Information */}
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 text-left md:col-span-2">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Building2 size={18} className="text-[#223F74]" />
                School Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">School Name</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.school?.schoolName || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">School Code</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.school?.branchId || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Campus Location</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.school?.city || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Reporting Admin</span>
                  <span className="text-sm font-semibold text-slate-700">{profile.school?.principalName || 'Principal Admin'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Change Password View */}
        {activeTab === 'password' && (
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6 md:p-8 text-left max-w-xl mx-auto">
            <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Lock size={18} className="text-[#223F74]" />
              Change Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <DataField
                label="Current Password *"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                disabled={passwordLoading}
                required
              />

              <div>
                <DataField
                  label="New Password *"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={passwordLoading}
                  required
                />
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${newPasswordStrength.color} transition-all duration-200`}
                      style={{ width: `${(newPasswordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Password strength: {newPasswordStrength.label}
                  </p>
                </div>
              </div>

              <DataField
                label="Confirm New Password *"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                disabled={passwordLoading}
                required
              />

              {inlineError ? <p className="text-sm font-semibold text-red-500">{inlineError}</p> : null}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 mt-6">
                <Button
                  text="Save Changes"
                  type="submit"
                  loading={passwordLoading}
                  disabled={passwordLoading}
                  variant="primary"
                />
                <Button
                  text="Cancel"
                  onClick={() => {
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setInlineError('');
                  }}
                  variant="secondary"
                  disabled={passwordLoading}
                />
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <PanelModal
          id="edit-profile-modal"
          title="Edit Profile Details"
          size="lg"
          isVisible={isEditing}
          onClose={() => setIsEditing(false)}
        >
          <form onSubmit={handleSaveProfile} className="space-y-4 pb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5">Contact details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DataField
                label="Phone Number"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter contact number"
              />
              <DataField
                label="Alternative Phone"
                value={editForm.alternativePhone}
                onChange={(e) => setEditForm(prev => ({ ...prev, alternativePhone: e.target.value }))}
                placeholder="Enter alternative number"
              />
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 pt-2">Address details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <DataField
                  label="Street / Address"
                  value={editForm.address.street}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, street: e.target.value } 
                  }))}
                  placeholder="Enter street address"
                />
              </div>
              <DataField
                label="City"
                value={editForm.address.city}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value } 
                }))}
                placeholder="Enter city"
              />
              <DataField
                label="State"
                value={editForm.address.state}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value } 
                }))}
                placeholder="Enter state"
              />
              <DataField
                label="Pincode"
                value={editForm.address.pincode}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, pincode: e.target.value } 
                }))}
                placeholder="Enter pincode"
              />
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 pt-2">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DataField
                label="Guardian Name"
                value={editForm.emergencyContactName}
                onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                placeholder="Guardian full name"
              />
              <DataField
                label="Relationship"
                value={editForm.emergencyContactRelation}
                onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContactRelation: e.target.value }))}
                placeholder="e.g. Spouse, Father"
              />
              <div className="sm:col-span-2">
                <DataField
                  label="Contact Phone"
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  placeholder="Guardian contact phone"
                />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 pt-2">Additional Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Blood Group</label>
                <select
                  value={editForm.bloodGroup}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 bg-white"
                >
                  <option value="">-- Select --</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Marital Status</label>
                <select
                  value={editForm.maritalStatus}
                  onChange={(e) => setEditForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 bg-white"
                >
                  <option value="">-- Select --</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <DataField
                label="Nationality"
                value={editForm.nationality}
                onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))}
                placeholder="e.g. Indian"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                text="Cancel"
                onClick={() => setIsEditing(false)}
                variant="secondary"
              />
              <Button
                text={isSubmitting ? "Saving..." : "Save Changes"}
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
              />
            </div>
          </form>
        </PanelModal>
      )}

      {/* Subject Details Modal */}
      {selectedSubject && (
        <PanelModal
          id="subject-details-modal"
          title="Subject Assignment Details"
          size="md"
          isVisible={!!selectedSubject}
          onClose={() => setSelectedSubject(null)}
        >
          <div className="space-y-6 pb-4 text-left">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-lg font-bold text-[#223F74]">{selectedSubject.name}</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Code: {selectedSubject.code || '-'}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 border border-emerald-100 uppercase">
                {selectedSubject.status || 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Department</span>
                <span className="text-sm font-semibold text-slate-700">{selectedSubject.department || 'Academics'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Subject Type</span>
                <span className="text-sm font-semibold text-slate-700">{selectedSubject.type || 'Theory'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Theory Marks</span>
                <span className="text-sm font-bold text-[#223F74]">{selectedSubject.theoryMarks !== undefined ? selectedSubject.theoryMarks : '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Practical Marks</span>
                <span className="text-sm font-bold text-[#223F74]">{selectedSubject.practicalMarks !== undefined ? selectedSubject.practicalMarks : '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Passing Marks</span>
                <span className="text-sm font-bold text-[#223F74]">{selectedSubject.passMarks !== undefined ? selectedSubject.passMarks : '-'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Assigned Classes & Sections</span>
              <div className="flex flex-wrap gap-2">
                {(selectedSubject.classesAssigned || []).map((cl, idx) => (
                  <span key={idx} className="px-3 py-1.5 text-xs font-bold bg-[#223F74]/10 text-[#223F74] rounded-xl border border-[#223F74]/10">
                    {cl.name} {cl.section && `(Section: ${cl.section})`}
                  </span>
                ))}
                {(selectedSubject.classesAssigned || []).length === 0 && (
                  <span className="text-sm font-semibold text-slate-500 italic">No classes assigned for this subject</span>
                )}
              </div>
            </div>
          </div>
        </PanelModal>
      )}

    </div>
  );
};

export default SubjectTeacherProfile;
