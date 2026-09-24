import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  User, Bell, Lock, Shield, Mail, Eye, EyeOff, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentSettings, updateStudentSettings, changeStudentPassword } from '../../services/api/studentSettingsApi';
import { selectStudent } from '../../features/auth/studentAuthSlice';
import { Heading, Button, DataField } from '../../components/shared/Common_Components';

const StudentSettings = () => {
  const navigate = useNavigate();
  const studentData = useSelector(selectStudent);

  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    fullName: '',
    studentId: '',
    rollNumber: '',
    class: '',
    section: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    parentName: '',
    parentContact: '',
    address: '',
    admissionNumber: '',
    academicYear: '',
    bloodGroup: ''
  });

  const [tempProfile, setTempProfile] = useState(profileSettings);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    homeworkUpdates: true,
    attendanceAlerts: true,
    resultUpdates: true,
    examReminders: true,
    noticeNotifications: true,
    eventNotifications: true,
    leaveUpdates: true,
    supportTicketUpdates: true,
    parentMeetingNotifications: true,
    busNotifications: true,
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: true,
    showPhone: true,
    showAttendance: true,
    showResults: true,
    showProfilePhoto: true,
    allowParentNotifications: true,
    allowTeacherNotifications: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const res = await getStudentSettings();
        if (res.success && res.data) {
          const { profile, notifications, privacy } = res.data;
          if (profile) { 
            setProfileSettings(profile); 
            setTempProfile(profile); 
          }
          if (notifications) {
            setNotificationSettings(ns => ({ ...ns, ...notifications }));
          }
          if (privacy) {
            setPrivacySettings(ps => ({ ...ps, ...privacy }));
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load settings');
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      await updateStudentSettings({ profile: tempProfile });
      setProfileSettings(tempProfile);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCancel = () => {
    setTempProfile(profileSettings);
    setIsEditingProfile(false);
    toast('Changes discarded');
  };

  const handleNotificationToggle = async (key) => {
    const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newSettings);
    try {
      await updateStudentSettings({ notifications: newSettings });
      toast.success(`${key.replace(/([A-Z])/g, ' $1').trim()} ${newSettings[key] ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setNotificationSettings(notificationSettings);
      toast.error('Failed to update settings');
    }
  };

  const handlePrivacyChange = async (key, value) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    try {
      await updateStudentSettings({ privacy: newSettings });
      toast.success('Privacy settings updated');
    } catch (err) {
      setPrivacySettings(privacySettings);
      toast.error('Failed to update privacy settings');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await changeStudentPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Heading primaryText="Settings" />
      
      {/* Horizontal Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm border ${
              activeTab === tab.id
                ? 'bg-[#223F74] text-white border-[#223F74]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* 1. Profile Settings */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-800">Profile Information</h2>
                {!isEditingProfile ? (
                  <Button 
                    text="Edit Profile" 
                    icon={<Edit2 className="w-4 h-4" />} 
                    variant="secondary"
                    size={3}
                    onClick={() => setIsEditingProfile(true)}
                  />
                ) : (
                  <div className="flex gap-2">
                    <Button text="Cancel" variant="ghost" size={2} onClick={handleProfileCancel} />
                    <Button text={isLoading ? "Saving..." : "Save"} variant="primary" size={2} disabled={isLoading} onClick={handleProfileSave} />
                  </div>
                )}
              </div>
              
              <div className="space-y-8">
                {/* Avatar Display */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="shrink-0">
                    {studentData?.avatar || studentData?.photo ? (
                      <img 
                        src={studentData.avatar || studentData.photo} 
                        alt={profileSettings.fullName} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#223F74] to-[#1D3557] flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow-md">
                        {profileSettings.fullName?.charAt(0) || 'S'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{profileSettings.fullName || '—'}</h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
                      <span className="px-3 py-1 bg-[#223F74]/10 text-[#223F74] rounded-lg text-xs font-bold uppercase tracking-wider">Class {profileSettings.class || '—'} - {profileSettings.section || '—'}</span>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider">Roll No: {profileSettings.rollNumber || '—'}</span>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider">ID: {profileSettings.studentId || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Personal Information
                    </h3>
                    <div className="grid grid-cols-12 gap-4">
                      {isEditingProfile ? (
                        <>
                          <DataField label="Full Name" id="fullName" value={tempProfile.fullName} onChange={(e) => setTempProfile({ ...tempProfile, fullName: e.target.value })} size={12} />
                          <DataField label="Date of Birth" id="dob" type="date" value={tempProfile.dateOfBirth} onChange={(e) => setTempProfile({ ...tempProfile, dateOfBirth: e.target.value })} size={6} />
                          <div className="flex flex-col gap-1.5 col-span-12 sm:col-span-6">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Gender</label>
                            <select value={tempProfile.gender} onChange={(e) => setTempProfile({ ...tempProfile, gender: e.target.value })} className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-sm focus:outline-none bg-white">
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5 col-span-12 sm:col-span-12">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Blood Group</label>
                            <select value={tempProfile.bloodGroup} onChange={(e) => setTempProfile({ ...tempProfile, bloodGroup: e.target.value })} className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-sm focus:outline-none bg-white">
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <DataField label="Full Name" id="fullName_view" value={profileSettings.fullName || '—'} readOnly size={12} className="bg-white" />
                          <DataField label="Date of Birth" id="dob_view" value={profileSettings.dateOfBirth ? new Date(profileSettings.dateOfBirth).toLocaleDateString() : '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Gender" id="gender_view" value={profileSettings.gender || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Blood Group" id="blood_view" value={profileSettings.bloodGroup || '—'} readOnly size={12} className="bg-white" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Academic Information
                    </h3>
                    <div className="grid grid-cols-12 gap-4">
                      {isEditingProfile ? (
                        <>
                          <DataField label="Admission Number" id="admissionNumber" value={tempProfile.admissionNumber} onChange={(e) => setTempProfile({ ...tempProfile, admissionNumber: e.target.value })} size={6} />
                          <DataField label="Student ID" id="studentId" value={tempProfile.studentId} onChange={(e) => setTempProfile({ ...tempProfile, studentId: e.target.value })} size={6} />
                          <DataField label="Roll Number" id="rollNumber" value={tempProfile.rollNumber} onChange={(e) => setTempProfile({ ...tempProfile, rollNumber: e.target.value })} size={6} />
                          <DataField label="Academic Year" id="academicYear" value={tempProfile.academicYear} onChange={(e) => setTempProfile({ ...tempProfile, academicYear: e.target.value })} size={6} />
                          <DataField label="Class" id="class" value={tempProfile.class} onChange={(e) => setTempProfile({ ...tempProfile, class: e.target.value })} size={6} />
                          <DataField label="Section" id="section" value={tempProfile.section} onChange={(e) => setTempProfile({ ...tempProfile, section: e.target.value })} size={6} />
                        </>
                      ) : (
                        <>
                          <DataField label="Admission Number" id="admissionNumber_view" value={profileSettings.admissionNumber || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Student ID" id="studentId_view" value={profileSettings.studentId || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Roll Number" id="rollNumber_view" value={profileSettings.rollNumber || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Academic Year" id="academicYear_view" value={profileSettings.academicYear || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Class" id="class_view" value={profileSettings.class || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Section" id="section_view" value={profileSettings.section || '—'} readOnly size={6} className="bg-white" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 xl:col-span-2">
                    <h3 className="text-sm font-bold text-[#223F74] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Contact Information
                    </h3>
                    <div className="grid grid-cols-12 gap-4">
                      {isEditingProfile ? (
                        <>
                          <DataField label="Email Address" id="email" type="email" value={tempProfile.email} onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })} size={6} />
                          <DataField label="Phone Number" id="phone" type="tel" value={tempProfile.phone} onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })} size={6} />
                          <DataField label="Parent Name" id="parentName" value={tempProfile.parentName} onChange={(e) => setTempProfile({ ...tempProfile, parentName: e.target.value })} size={6} />
                          <DataField label="Parent Contact" id="parentContact" type="tel" value={tempProfile.parentContact} onChange={(e) => setTempProfile({ ...tempProfile, parentContact: e.target.value })} size={6} />
                          <DataField label="Address" id="address" type="textarea" rows={2} value={tempProfile.address} onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })} size={12} />
                        </>
                      ) : (
                        <>
                          <DataField label="Email Address" id="email_view" value={profileSettings.email || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Phone Number" id="phone_view" value={profileSettings.phone || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Parent Name" id="parentName_view" value={profileSettings.parentName || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Parent Contact" id="parentContact_view" value={profileSettings.parentContact || '—'} readOnly size={6} className="bg-white" />
                          <DataField label="Address" id="address_view" type="textarea" rows={2} value={profileSettings.address || '—'} readOnly size={12} className="bg-white" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 2. Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="p-6 space-y-8">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-800">Notification Preferences</h2>
                <p className="text-sm text-gray-500 mt-1">Manage how and when you receive updates from the school.</p>
              </div>

              {[
                { 
                  title: 'Academic Alerts', 
                  desc: 'Updates regarding your academic progress.', 
                  keys: ['homeworkUpdates', 'attendanceAlerts', 'resultUpdates', 'examReminders'] 
                },
                { 
                  title: 'General Updates', 
                  desc: 'Stay in the loop with school activities.', 
                  keys: ['noticeNotifications', 'eventNotifications', 'leaveUpdates', 'parentMeetingNotifications'] 
                },
                { 
                  title: 'Support & Transport', 
                  desc: 'Updates regarding your requests and transport.', 
                  keys: ['supportTicketUpdates', 'busNotifications'] 
                }
              ].map((group) => (
                <div key={group.title} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{group.title}</h3>
                    <p className="text-xs text-gray-500">{group.desc}</p>
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-2">
                    {group.keys.map((key, idx) => (
                      <div key={key} className={`flex items-center justify-between p-3 ${idx !== group.keys.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Receive {key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} notifications
                          </p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle(key)}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 ${
                            notificationSettings[key] ? 'bg-[#223F74]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              notificationSettings[key] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="p-6 space-y-8">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-800">Privacy Preferences</h2>
                <p className="text-sm text-gray-500 mt-1">Control who can see your information and contact you.</p>
              </div>

              {[
                { 
                  title: 'Profile Visibility', 
                  desc: 'What contact info should be public?', 
                  keys: [
                    { key: 'showEmail', label: 'Show Email Address', desc: 'Display your email address on your public profile' },
                    { key: 'showPhone', label: 'Show Phone Number', desc: 'Display your phone number on your public profile' },
                    { key: 'showProfilePhoto', label: 'Show Profile Photo', desc: 'Allow others to see your profile picture' }
                  ] 
                },
                { 
                  title: 'Academic Visibility', 
                  desc: 'Who can view your performance?', 
                  keys: [
                    { key: 'showAttendance', label: 'Show Attendance Records', desc: 'Allow other students and staff to view your attendance stats' },
                    { key: 'showResults', label: 'Show Academic Results', desc: 'Allow school members to view your grades and report sheets' }
                  ] 
                },
                { 
                  title: 'Notifications & Access', 
                  desc: 'Manage who can send you notifications.', 
                  keys: [
                    { key: 'allowParentNotifications', label: 'Allow Parent Notifications', desc: 'Receive notifications sent directly to parents' },
                    { key: 'allowTeacherNotifications', label: 'Allow Teacher Notifications', desc: 'Receive direct updates from your class teachers' }
                  ] 
                }
              ].map((group) => (
                <div key={group.title} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{group.title}</h3>
                    <p className="text-xs text-gray-500">{group.desc}</p>
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-2">
                    {group.keys.map(({ key, label, desc }, idx) => (
                      <div key={key} className={`flex items-center justify-between p-3 ${idx !== group.keys.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <button
                          onClick={() => handlePrivacyChange(key, !privacySettings[key])}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 ${
                            privacySettings[key] ? 'bg-[#223F74]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              privacySettings[key] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 4. Security Settings */}
          {activeTab === 'security' && (
            <div className="p-6 space-y-8">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-800">Security Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your password and secure your account.</p>
              </div>
              
              <div className="max-w-xl">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Change Password</h3>
                
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <DataField 
                      label="Current Password" 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Enter current password" 
                      value={passwordData.currentPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                      size={12} 
                    />
                    <DataField 
                      label="New Password" 
                      id="newPassword" 
                      type="password" 
                      placeholder="Minimum 6 characters" 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      size={12} 
                    />
                    <DataField 
                      label="Confirm New Password" 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm new password" 
                      value={passwordData.confirmPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                      size={12} 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      text={isLoading ? "Updating Password..." : "Update Password"} 
                      type="submit" 
                      variant="primary" 
                      size={4}
                      disabled={isLoading}
                    />
                  </div>
                </form>
              </div>

              {/* Read-Only Security Information */}
              <div className="pt-8 mt-8 border-t border-slate-100 max-w-xl">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Login Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Last Login</h4>
                      <p className="text-xs text-gray-500 mt-1">{studentData?.lastLogin ? new Date(studentData.lastLogin).toLocaleString() : '—'}</p>
                      <p className="text-xs text-slate-400">IP: {studentData?.lastLoginIp || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" ry="2"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Current Device</h4>
                      <p className="text-xs text-gray-500 mt-1">{studentData?.currentDevice || '—'}</p>
                      <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Now
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
      </div>
    </div>
  );
};

export default StudentSettings;