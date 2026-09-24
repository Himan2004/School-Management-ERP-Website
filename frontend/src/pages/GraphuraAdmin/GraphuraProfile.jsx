import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  User, Mail, Clock, RefreshCw, LogOut, Activity, Calendar, 
  ShieldCheck, Edit, Save, Camera, AlertCircle, X, Key
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  selectGraphuraAdmin, 
  selectGraphuraLoading, 
  graphuraAdminLogout,
  updateGraphuraProfile,
  updateGraphuraPassword,
  selectGraphuraUpdateLoading
} from '../../features/auth/graphuraAuthSlice';
import { useNavigate } from 'react-router-dom';

const GraphuraProfile = ({ tab = 'profile' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const profile = useSelector(selectGraphuraAdmin);
  const loading = useSelector(selectGraphuraLoading);
  const updateLoading = useSelector(selectGraphuraUpdateLoading);
  
  const [activeTab, setActiveTab] = useState(tab);
  const [isEditing, setIsEditing] = useState(false);

  // Profile Edit State
  const [editData, setEditData] = useState({
    fullName: '',
    email: '',
    avatar: null,
    avatarPreview: null
  });

  // Password Update State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        avatar: null,
        avatarPreview: profile.avatarUrl || null
      });
    }
  }, [profile]);



  const handleLogout = async () => {
    try {
      await dispatch(graphuraAdminLogout()).unwrap();
      toast.success('Logged out successfully');
      navigate('/graphura-admin/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('fullName', editData.fullName);
    formData.append('email', editData.email);
    if (editData.avatar) {
      formData.append('avatar', editData.avatar);
    }

    try {
      await dispatch(updateGraphuraProfile(formData)).unwrap();
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error || 'Failed to update profile');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    try {
      await dispatch(updateGraphuraPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })).unwrap();
      
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error || 'Failed to update password');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditData(prev => ({
        ...prev,
        avatar: file,
        avatarPreview: URL.createObjectURL(file)
      }));
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Personal information' },
    { id: 'security', name: 'Security', icon: ShieldCheck, description: 'Password & Security' },
    { id: 'activity', name: 'Activity', icon: Clock, description: 'Recent actions' }
  ];

  // Helper for safe date formatting
  const formatSafe = (date, formatStr) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return format(d, formatStr);
    } catch {
      return 'Invalid Date';
    }
  };

  if (!profile && loading?.profile) {
     return <div className="flex h-64 items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const adminName = profile?.fullName || profile?.name || "Graphura Super Admin";
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=4F46E5&color=fff&size=128`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>
        <div className="flex gap-2">
          {!isEditing && activeTab === 'profile' && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
          )}

          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-2">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => {
                setActiveTab(tabItem.id);
                setIsEditing(false);
              }}
              className={`px-4 py-3 rounded-t-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tabItem.id
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tabItem.icon className="w-4 h-4" />
              <span>{tabItem.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center sticky top-6">
                <div className="relative inline-block group">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto border-4 border-indigo-100 shadow-lg relative bg-gray-50">
                    <img 
                      src={editData.avatarPreview || avatarFallback} 
                      alt={adminName} 
                      className="w-full h-full object-cover" 
                    />
                    {isEditing && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>
                {!isEditing ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-800 mt-4">{adminName}</h2>
                    <p className="text-sm text-indigo-600 mt-1 capitalize">{profile?.role?.replace('_', ' ') || 'Super Admin'}</p>
                  </>
                ) : (
                  <div className="mt-4">
                    <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block font-medium">Changing Avatar...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details / Edit Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-500" /> 
                    {isEditing ? 'Edit Profile Details' : 'Personal Information'}
                  </h3>
                  {isEditing && (
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem label="Full Name" value={adminName} />
                    <DetailItem label="Email Address" value={profile?.email} />
                    <DetailItem label="Role" value={profile?.role?.replace('_', ' ') || 'Super Admin'} isCapitalize />
                    <DetailItem label="Last Login" value={formatSafe(profile?.lastLoginAt, 'PPP p')} />
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputItem 
                        label="Full Name" 
                        value={editData.fullName} 
                        onChange={(v) => setEditData(p => ({ ...p, fullName: v }))} 
                      />
                      <InputItem 
                        label="Email Address" 
                        value={editData.email} 
                        type="email"
                        onChange={(v) => setEditData(p => ({ ...p, email: v }))} 
                      />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                      >
                        {updateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Account Security</h3>
                <p className="text-sm text-gray-500 mt-2">Manage your password and security settings to keep your account safe.</p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" /> Update Password
                </h3>
                
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                  <InputItem 
                    label="Current Password" 
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))}
                  />
                  <div className="h-px bg-gray-100 my-4"></div>
                  <InputItem 
                    label="New Password" 
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))}
                  />
                  <InputItem 
                    label="Confirm New Password" 
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))}
                  />
                  
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 mt-6">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Make sure your new password is at least 8 characters long and contains a mix of letters, numbers, and symbols.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={updateLoading || !passwordData.newPassword}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                    >
                      {updateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Account Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-600 text-sm">Last Active</span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {formatSafe(profile?.lastLoginAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Recent Activity</h3>
              <div className="space-y-4">
                {profile?.recentActions && profile.recentActions.length > 0 ? [...profile.recentActions].reverse().map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                    <div className="p-2.5 rounded-xl bg-indigo-50">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">{activity.action?.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">{formatSafe(activity.performedAt, 'p')}</p>
                      </div>
                      {activity.description && <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>}
                      <p className="text-xs text-gray-400 mt-2 font-medium">{formatSafe(activity.performedAt, 'PPP')}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">No recent activity found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

const DetailItem = ({ label, value, isCapitalize }) => (
  <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    <p className={`text-gray-800 font-medium ${isCapitalize ? 'capitalize' : ''}`}>{value || 'N/A'}</p>
  </div>
);

const InputItem = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

export default GraphuraProfile;