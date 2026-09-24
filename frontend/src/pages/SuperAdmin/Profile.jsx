import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSuperAdminProfile, clearMessage, clearError } from '../../features/superAdmin/superAdminSlice.js';
import {
  User, Mail, Calendar, ShieldCheck, BadgeCheck,
  Save, X, Lock, Settings, Building2,
} from 'lucide-react';
import ProfileAvatarUpload from '../../components/superAdmin/ProfileAvatarUpload.jsx';
import ChangePasswordForm from '../../components/superAdmin/ChangePasswordForm.jsx';
import toast from 'react-hot-toast';
import {
  Heading,
  ModalGrid,
  ModalData,
  Button,
  DataField,
} from '../../components/shared/Common_Components';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';


// ─────────────────────────────────────────────────────────────────────────────
const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Auth state — use only for authentication, not for fresh profile data
  const { authUser } = useSelector((state) => state.superAuth);
  const { loading, message, error } = useSelector((state) => state.superAdmin);

  // Fresh profile data fetched directly from the real API
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState('');
  const [editName, setEditName] = useState('');

  // Fetch fresh profile data from the real API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const res = await api.get('/super-admin/profile');
        if (res.data?.success) {
          setProfileData(res.data.data);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        // Fall back to Redux auth data if API fails
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (message) {
      toast.success(message);
      setEditing(false);
      setSelectedFile(null);
      dispatch(clearMessage());
    }
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [message, error, dispatch]);

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', editName);
    if (selectedFile) formData.append('photo', selectedFile);
    dispatch(updateSuperAdminProfile(formData))
      .unwrap()
      .then(async () => {
        toast.success('Profile updated!');
        setEditing(false);
        setSelectedFile(null);
        // Re-fetch fresh profile data from the real API
        try {
          const res = await api.get('/super-admin/profile');
          if (res.data?.success) setProfileData(res.data.data);
        } catch (e) {}
      })
      .catch((err) => toast.error(err?.message || 'Update failed'));
  };

  // Use fresh data from real API, fall back to Redux auth data
  const superAdmin = profileData?.superAdmin || authUser?.superAdmin;
  const organization = profileData?.organization || authUser?.organization;

  // Sync edit state when fresh data arrives
  useEffect(() => {
    if (superAdmin?.photo) setPreviewPhoto(superAdmin.photo);
    if (superAdmin?.name) setEditName(superAdmin.name);
  }, [profileData]);

  const joinDate = superAdmin?.createdAt
    ? new Date(superAdmin.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' })
    : '—';

  const initials = (superAdmin?.name || 'SA')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      {/* ── Heading ── */}
      <Heading
        primaryText="Profile"
        secondaryText="Settings"
        size={12}
        showAnimations
      />

      {/* ── Main 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ── LEFT COLUMN: Sidebar ── */}
        <div className="lg:col-span-4 space-y-6">
          {!editing ? (
            <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-[#F59B87] to-[#EC856D] opacity-20" />
              <div className="relative w-32 h-32 rounded-[24px] shadow-xl bg-gradient-to-br from-[#223F74] to-[#2B4A7A] flex items-center justify-center text-white text-3xl font-black overflow-hidden mb-6 mt-4 border-4 border-white">
                {previewPhoto
                  ? <img src={previewPhoto} alt="avatar" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex items-center gap-2 mb-1 relative">
                <h2 className="text-2xl font-black text-slate-800">{superAdmin?.name || 'Super Admin'}</h2>
                <BadgeCheck size={20} className="text-blue-500" />
              </div>
              <p className="text-sm font-bold text-[#223F74] uppercase tracking-widest mb-8 relative">
                {superAdmin?.role || 'Super Administrator'}
              </p>

              <div className="w-full relative">
                <Button
                  onClick={() => setEditing(true)}
                  variant="primary"
                  icon={<User size={18} />}
                  text="Edit Profile"
                  size={12}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-[#F59B87] flex items-center justify-center text-white shadow-lg shadow-[#F59B87]/30">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-800">Edit Profile</p>
                  <p className="text-sm text-slate-400 font-semibold">Update your details</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <ProfileAvatarUpload
                    photo={previewPhoto}
                    onFileSelect={(file) => {
                      setSelectedFile(file);
                      setPreviewPhoto(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-xs font-bold text-[#223F74] uppercase tracking-widest">Update Avatar</p>
                </div>

                <DataField
                  label="Full Name"
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your full name"
                  size={12}
                />

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setPreviewPhoto(superAdmin?.photo || '');
                      setEditName(superAdmin?.name || '');
                      setSelectedFile(null);
                    }}
                    variant="secondary"
                    icon={<X size={18} />}
                    text="Cancel"
                    size={12}
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    variant="primary"
                    icon={<Save size={18} />}
                    text={loading ? 'Saving…' : 'Save Changes'}
                    size={12}
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Main Content ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Personal Info */}
            <div className="rounded-[32px] border border-slate-100 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74]">
                  <User size={18} />
                </div>
                <p className="text-base font-black text-slate-800">Personal Info</p>
              </div>
              <div className="space-y-5 flex-1">
                <ModalData label="Full Name" value={superAdmin?.name || '—'} />
                <ModalData label="Role" value={superAdmin?.role || '—'} />
                <ModalData label="Member Since" value={joinDate} />
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-[32px] border border-slate-100 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74]">
                  <Mail size={18} />
                </div>
                <p className="text-base font-black text-slate-800">Contact Details</p>
              </div>
              <div className="space-y-5 flex-1">
                <ModalData label="Email Address" value={superAdmin?.email || '—'} />
                <ModalData label="Phone" value={superAdmin?.phoneNumber || 'Not set'} />
                <div className="flex flex-col gap-1.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">Status</span>
                  <div className="flex items-center gap-2 text-[#223F74] font-medium bg-white px-3 py-2.5 rounded-xl border border-[#E2E8F0]">
                    <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-emerald-600">Verified Account</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="md:col-span-2 rounded-[32px] border border-slate-100 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-[#223F74]/10 flex items-center justify-center text-[#223F74]">
                  <Building2 size={18} />
                </div>
                <p className="text-base font-black text-slate-800">Organization</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ModalData label="Organization Name" value={organization?.organizationName || organization?.name || '—'} />
                <ModalData label="Branch ID" value={organization?.branchCreationId || '—'} />
                <ModalData label="Plan" value={organization?.billing?.cycle || 'Enterprise'} />
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="rounded-[32px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mt-6">
            <div className="flex items-center gap-3 px-7 py-6 border-b border-slate-50 bg-[#fafafa]">
              <div className="w-12 h-12 rounded-2xl bg-[#D66B5F] flex items-center justify-center text-white shadow-lg shadow-[#D66B5F]/30">
                <Lock size={20} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">Security & Password</p>
                <p className="text-sm text-slate-400 font-semibold">Manage your login credentials securely</p>
              </div>
            </div>
            <div className="p-7">
              <ChangePasswordForm />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
