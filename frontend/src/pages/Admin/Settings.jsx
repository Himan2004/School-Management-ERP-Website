import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { Lock, School, Bell, Phone, MapPin, UploadCloud } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getAdminSettings, 
  updateAdminSettings, 
  changeAdminPassword, 
  selectAdminLoading, 
  selectAdminSettings 
} from '../../features/admin/adminSlice';
import toast from 'react-hot-toast';
import { 
  Heading, Button, DataField, ToggleButton 
} from '../../components/shared/Common_Components';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const settings = useSelector(selectAdminSettings);
  const loading = useSelector(selectAdminLoading);

  const [activeTab, setActiveTab] = useState('password');
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [initialSettings, setInitialSettings] = useState(null);

  // Section-specific loading states
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [schoolSettingsLoading, setSchoolSettingsLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [schoolForm, setSchoolForm] = useState({
    schoolName: '',
    address: '',
    contactNumber: '',
    logoUrl: '',
  });

  const [notificationsForm, setNotificationsForm] = useState({
    emailNotifications: true,
    appNotifications: true,
  });

  const logoPreview = useMemo(() => schoolForm.logoUrl, [schoolForm.logoUrl]);

  // Scroll to top immediately on mount & disable scroll restoration
  useLayoutEffect(() => {
    let originalScrollRestoration;
    if ("scrollRestoration" in window.history) {
      originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainContainer = document.querySelector('main') || document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }

    return () => {
      if ("scrollRestoration" in window.history && originalScrollRestoration) {
        window.history.scrollRestoration = originalScrollRestoration;
      }
    };
  }, []);

  // Fetch settings on mount only if missing
  useEffect(() => {
    if (!settings) {
      dispatch(getAdminSettings());
    }
  }, [dispatch, settings]);

  // Sync settings fetched from API
  useEffect(() => {
    if (!settings) return;
    const normalized = {
      school: {
        schoolName: settings.school?.schoolName || '',
        address: settings.school?.address || '',
        contactNumber: settings.school?.contactNumber || '',
        logoUrl: settings.school?.logoUrl || '',
      },
      notifications: {
        emailNotifications: settings.notifications?.emailNotifications ?? true,
        appNotifications: settings.notifications?.appNotifications ?? true,
      },
    };

    setSchoolForm(normalized.school);
    setNotificationsForm(normalized.notifications);
    setInitialSettings(normalized);
  }, [settings]);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSchoolForm((prev) => ({
        ...prev,
        logoUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (event) => {
    event.preventDefault();
    setLogoDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSchoolForm((prev) => ({
        ...prev,
        logoUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = () => {
    setInlineError('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setInlineError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setInlineError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setInlineError('Confirm password does not match new password.');
      return;
    }
    setPasswordLoading(true);
    dispatch(changeAdminPassword(passwordForm))
      .unwrap()
      .then(() => {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully');
      })
      .catch((err) => toast.error(err?.message || 'Failed to change password'))
      .finally(() => setPasswordLoading(false));
  };

  const handleSaveSchoolSettings = () => {
    if (!schoolForm.schoolName.trim()) {
      toast.error('School Name is required');
      return;
    }
    setSchoolSettingsLoading(true);
    dispatch(updateAdminSettings({ school: schoolForm }))
      .unwrap()
      .then(() => toast.success('School settings updated successfully'))
      .catch((err) => toast.error(err?.message || 'Failed to update school settings'))
      .finally(() => setSchoolSettingsLoading(false));
  };

  const handleSaveNotifications = () => {
    setNotificationLoading(true);
    dispatch(updateAdminSettings({ notifications: notificationsForm }))
      .unwrap()
      .then(() => toast.success('Notification settings updated successfully'))
      .catch((err) => toast.error(err?.message || 'Failed to update notification settings'))
      .finally(() => setNotificationLoading(false));
  };

  const handleCancelSection = () => {
    if (!initialSettings) return;
    if (activeTab === 'school') {
      setSchoolForm(initialSettings.school);
    } else if (activeTab === 'notifications') {
      setNotificationsForm(initialSettings.notifications);
    }
    setInlineError('');
  };

  const hasSchoolChanges = useMemo(() => {
    if (!initialSettings) return false;
    return (
      schoolForm.schoolName !== initialSettings.school.schoolName ||
      schoolForm.address !== initialSettings.school.address ||
      schoolForm.contactNumber !== initialSettings.school.contactNumber ||
      schoolForm.logoUrl !== initialSettings.school.logoUrl
    );
  }, [schoolForm, initialSettings]);

  const hasNotificationChanges = useMemo(() => {
    if (!initialSettings) return false;
    return (
      notificationsForm.emailNotifications !== initialSettings.notifications.emailNotifications ||
      notificationsForm.appNotifications !== initialSettings.notifications.appNotifications
    );
  }, [notificationsForm, initialSettings]);

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

  // Only show the skeleton if we don't have any settings data loaded yet
  if (loading.settings && !settings) {
    return (
      <div className="w-full space-y-6 text-left pb-10">
        <div className="animate-pulse space-y-6">
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-72 rounded-[28px] bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <Heading
          primaryText="System"
          secondaryText="Settings"
          showAnimations={true}
          size={12}
        />
        <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide mt-2">
          Manage password, school details, and notifications.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex w-full border-b border-gray-200 flex-wrap">
        <button
          onClick={() => setActiveTab("password")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "password" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Lock size={18} />
          Change Password
        </button>
        <button
          onClick={() => setActiveTab("school")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "school" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <School size={18} />
          School Settings
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === "notifications" 
              ? "border-[#223F74] text-[#223F74]" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Bell size={18} />
          Notifications
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'password' && (
          <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 md:p-8 text-left">
            <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Lock size={18} className="text-[#e8612c]" />
              Change Password
            </h3>
            <div className="max-w-xl space-y-4">
              <DataField
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                disabled={passwordLoading}
              />
              <div>
                <DataField
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  disabled={passwordLoading}
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
                label="Confirm Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                disabled={passwordLoading}
              />
              {inlineError ? <p className="text-sm font-semibold text-red-500">{inlineError}</p> : null}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <Button
                  text="Save Changes"
                  onClick={handlePasswordChange}
                  loading={passwordLoading}
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
            </div>
          </div>
        )}

        {activeTab === 'school' && (
          <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 md:p-8 text-left">
            <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <School size={18} className="text-[#e8612c]" />
              School Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField
                label="School Name"
                icon={School}
                value={schoolForm.schoolName}
                onChange={(e) =>
                  setSchoolForm((prev) => ({
                    ...prev,
                    schoolName: e.target.value,
                  }))
                }
                placeholder="Enter school name"
                disabled={schoolSettingsLoading}
              />

              <DataField
                label="Contact Number"
                icon={Phone}
                value={schoolForm.contactNumber}
                onChange={(e) =>
                  setSchoolForm((prev) => ({
                    ...prev,
                    contactNumber: e.target.value,
                  }))
                }
                placeholder="Enter contact number"
                disabled={schoolSettingsLoading}
              />

              <div className="md:col-span-2">
                <DataField
                  label="Address"
                  icon={MapPin}
                  type="textarea"
                  value={schoolForm.address}
                  onChange={(e) =>
                    setSchoolForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Enter school address"
                  rows={3}
                  disabled={schoolSettingsLoading}
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Logo Upload
                </label>
                <label
                  onDragOver={(e) => {
                    if (schoolSettingsLoading) return;
                    e.preventDefault();
                    setLogoDragActive(true);
                  }}
                  onDragLeave={() => setLogoDragActive(false)}
                  onDrop={(e) => {
                    if (schoolSettingsLoading) return;
                    handleLogoDrop(e);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center transition-all duration-200 ${
                    schoolSettingsLoading ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50/50' : 'cursor-pointer border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-white'
                  }`}
                >
                  <UploadCloud className="h-6 w-6 text-blue-500" />
                  <p className="text-sm font-semibold">Drag and drop logo here, or click to upload</p>
                  <p className="text-xs text-slate-400 font-medium">PNG, JPG up to 2MB</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={schoolSettingsLoading} />
                </label>

                <DataField
                  label="Or Paste Logo URL"
                  value={schoolForm.logoUrl}
                  onChange={(e) =>
                    setSchoolForm((prev) => ({
                      ...prev,
                      logoUrl: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  disabled={schoolSettingsLoading}
                />

                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="School logo"
                    className="h-20 w-20 rounded-2xl border border-slate-100 object-cover shadow-sm"
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
              <Button
                text="Save Changes"
                onClick={handleSaveSchoolSettings}
                loading={schoolSettingsLoading}
                disabled={!hasSchoolChanges || schoolSettingsLoading}
                variant="primary"
              />
              <Button
                text="Cancel"
                onClick={handleCancelSection}
                variant="secondary"
                disabled={schoolSettingsLoading}
              />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm p-6 md:p-8 text-left">
            <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Bell size={18} className="text-[#e8612c]" />
              Notification Settings
            </h3>
            <div className="space-y-4">
              <div className={`flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#223F74]/5 p-4 hover:bg-white transition duration-200 ${notificationLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#223F74]">Email Notifications</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Receive system notices and updates via email.</p>
                </div>
                <ToggleButton
                  checked={Boolean(notificationsForm.emailNotifications)}
                  onChange={(value) =>
                    setNotificationsForm((prev) => ({
                      ...prev,
                      emailNotifications: value,
                    }))
                  }
                  disabled={notificationLoading}
                />
              </div>

              <div className={`flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#223F74]/5 p-4 hover:bg-white transition duration-200 ${notificationLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#223F74]">App Notifications</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Display in-app real-time updates and reminders.</p>
                </div>
                <ToggleButton
                  checked={Boolean(notificationsForm.appNotifications)}
                  onChange={(value) =>
                    setNotificationsForm((prev) => ({
                      ...prev,
                      appNotifications: value,
                    }))
                  }
                  disabled={notificationLoading}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
              <Button
                text="Save Changes"
                onClick={handleSaveNotifications}
                loading={notificationLoading}
                disabled={!hasNotificationChanges || notificationLoading}
                variant="primary"
              />
              <Button
                text="Cancel"
                onClick={handleCancelSection}
                variant="secondary"
                disabled={notificationLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
