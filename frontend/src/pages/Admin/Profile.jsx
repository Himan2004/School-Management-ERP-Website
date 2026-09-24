import React, { useMemo, useState, useEffect } from 'react';
import { 
  Building2, Mail, Phone, UserCircle2, ShieldCheck, 
  Calendar, Clock, Lock, Settings as SettingsIcon, Pencil, UploadCloud 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateAdminProfile, selectAdminLoading } from '../../features/admin/adminSlice';
import toast from 'react-hot-toast';
import { updateAuthProfile } from '../../features/auth/adminAuthSlice';
import { 
  Heading, Button, PanelModal, DataField 
} from '../../components/shared/Common_Components';

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AD';

const AdminProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { authUser } = useSelector((state) => state.adminAuth);
  const loading = useSelector(selectAdminLoading);

  const profile = authUser?.adminProfile;
  const adminSettings = useSelector((state) => state.admin.settings);
  
  const schoolName = adminSettings?.school?.schoolName 
    || profile?.schoolName 
    || authUser?.school?.schoolName 
    || 'School Name Not Set';

  const [isEditing, setIsEditing] = useState(false);
  
  const [form, setForm] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    profileImage: profile?.profileImage || profile?.avatarUrl || '',
    profileImageFile: null,
  });

  const initials = useMemo(() => getInitials(profile?.name || authUser?.name), [profile, authUser]);

  const completionPercentage = useMemo(() => {
    let filledFields = 0;
    const totalFields = 6;
    const currentName = profile?.name || authUser?.name;
    const currentEmail = profile?.email || authUser?.email;
    const currentPhone = profile?.phone || authUser?.phone;
    const currentSchool = schoolName !== 'School Name Not Set' ? schoolName : null;
    const currentAvatar = profile?.profileImage || profile?.avatarUrl;
    const currentAddress = profile?.address;

    if (currentName?.trim()) filledFields++;
    if (currentEmail?.trim()) filledFields++;
    if (currentPhone?.trim()) filledFields++;
    if (currentSchool?.trim()) filledFields++;
    if (currentAvatar) filledFields++;
    if (currentAddress?.trim()) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  }, [profile, authUser, schoolName]);

  const handleUpdate = () => {
    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);

    if (form.profileImageFile) {
      formData.append("avatar", form.profileImageFile);
    }

    dispatch(updateAdminProfile(formData))
      .unwrap()
      .then((res) => {
        dispatch(updateAuthProfile(res.data));
        setIsEditing(false);
        toast.success("Profile updated successfully");
      })
      .catch((err) => {
        toast.error(err?.message || "Unable to update profile");
      });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainContainer = document.querySelector('main') || document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        profileImage: profile?.profileImage || profile?.avatarUrl || '',
        profileImageFile: null,
      });
    }
  }, [profile]);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ 
        ...prev, 
        profileImageFile: file,
        profileImage: String(reader.result || '') 
      }));
    };
    reader.readAsDataURL(file);
  };

  const imageUrl = profile?.profileImage || profile?.avatarUrl;
  const joinDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : authUser?.createdAt 
      ? new Date(authUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'N/A';

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <Heading
          primaryText="Admin"
          secondaryText="Profile"
          showAnimations={true}
          size={12}
        />
        <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide mt-2">
          View and manage school administrator profile details.
        </p>
      </div>

      {/* Hero Profile Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Admin avatar"
                className="h-28 w-28 rounded-2xl border-4 border-slate-50 object-cover shadow-sm"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl border-4 border-slate-50 bg-[#e8612c]/10 text-4xl font-bold text-[#e8612c]">
                {initials}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black tracking-tight text-[#223F74]">{profile?.name || authUser?.name || 'Administrator'}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                Role: School Administrator
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile?.email || authUser?.email || '-'}
                </span>
                {(profile?.phone || authUser?.phone) && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {profile?.phone || authUser?.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {schoolName}
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
              <span className="text-sm font-semibold text-slate-700">{profile?.name || authUser?.name || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Designation</span>
              <span className="text-sm font-semibold text-slate-700">Administrator</span>
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
              <span className="text-sm font-semibold text-slate-700">{profile?.email || authUser?.email || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
              <span className="text-sm font-semibold text-slate-700">{profile?.phone || authUser?.phone || '-'}</span>
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
              <span className="text-sm font-semibold text-slate-700">{schoolName}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">School Branch</span>
              <span className="text-sm font-semibold text-slate-700">{authUser?.school?.branchName || 'Main Branch'}</span>
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
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Account Role</span>
                <span className="text-sm font-semibold text-slate-700 uppercase">{profile?.role || authUser?.role || 'Admin'}</span>
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
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Last Login</span>
                <span className="text-sm font-semibold text-slate-700">
                  {authUser?.lastLoginAt ? new Date(authUser.lastLoginAt).toLocaleString() : 'Active Now'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 text-left">
        <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
          <SettingsIcon size={18} className="text-[#e8612c]" />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            text="Open Settings"
            onClick={() => navigate('/admin/settings')}
            icon={<SettingsIcon size={14} />}
            variant="secondary"
          />
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
              placeholder="admin@school.edu"
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
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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
                loading={loading.updateProfile}
              />
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default AdminProfile;