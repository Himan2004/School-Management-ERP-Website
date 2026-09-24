import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell, Lock, Mail, FileText, MessageSquare, Save, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/teacher/Card';
import api from '../../services/api.js';
import { fetchTeacherSettings, updateTeacherSettings, clearSettingsMessages } from '../../features/teacher/teacherSettingsSlice';

const Settings = () => {
  const dispatch = useDispatch();
  
  const { 
    settings: dbSettings, 
    loading, 
    saveLoading, 
    successMessage,
    error 
  } = useSelector((state) => state.teacherSettings || {});

  // 1. Give the UI default values immediately
  const [settings, setSettings] = useState({
    emailNotifications: true,
    assignmentAlerts: true,
    messageAlerts: true,
    attendanceAlerts: false,
    twoFactorAuth: false,
    language: 'en',
    timezone: 'UTC'
  });

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2. Fetch from DB when the component mounts
  useEffect(() => {
    dispatch(fetchTeacherSettings());
  }, [dispatch]);

  // 3. Sync database data into state
  useEffect(() => {
    if (dbSettings && Object.keys(dbSettings).length > 0) {
      setSettings((prev) => ({
        ...prev,
        ...dbSettings
      }));
    }
  }, [dbSettings]);

  // 4. Auto-clear the success/error messages
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      const timer = setTimeout(() => dispatch(clearSettingsMessages()), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      const timer = setTimeout(() => dispatch(clearSettingsMessages()), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleToggle = (key) => {
    const updatedSettings = { ...settings, [key]: !settings[key] };
    setSettings(updatedSettings);
    dispatch(updateTeacherSettings(updatedSettings));
  };

  const handleSave = () => {
    dispatch(updateTeacherSettings(settings));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await api.put('/teacher/settings/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.data?.success) {
        toast.success(response.data?.message || 'Password updated successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        const errorMsg = response.data?.message || 'Failed to update password';
        setPasswordError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update password';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-outfit">Settings</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage your account preferences</p>
        </div>
        
        {/* Syncing Indicator */}
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200/50">
              Syncing settings...
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Notification Settings Card */}
        <Card className="w-full">
          <div className="p-6">
            <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <Bell className="w-5 h-5 mr-2 text-blue-600" />
              Notification Settings
            </h2>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-100 dark:border-slate-700/50 transition-colors hover:bg-gray-100/50 dark:hover:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-white dark:bg-slate-700 p-2 shadow-sm border border-gray-100 dark:border-slate-650">
                    <Mail className="h-5 w-5 text-gray-600 dark:text-slate-350" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Email Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-slate-405">
                      Receive updates via email
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                    className="sr-only peer"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-250 dark:bg-slate-700 peer-focus:outline-none 
                    peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                    after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                    after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                    peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Assignment Alerts */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-100 dark:border-slate-700/50 transition-colors hover:bg-gray-100/50 dark:hover:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-white dark:bg-slate-700 p-2 shadow-sm border border-gray-100 dark:border-slate-650">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-slate-350" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Assignment Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-slate-405">
                      Get notified about new assignments and submissions
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.assignmentAlerts}
                    onChange={() => handleToggle('assignmentAlerts')}
                    className="sr-only peer"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-250 dark:bg-slate-700 peer-focus:outline-none 
                    peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                    after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                    after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                    peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Message Alerts */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-100 dark:border-slate-700/50 transition-colors hover:bg-gray-100/50 dark:hover:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-white dark:bg-slate-700 p-2 shadow-sm border border-gray-100 dark:border-slate-650">
                    <MessageSquare className="h-5 w-5 text-gray-600 dark:text-slate-350" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Message Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-slate-405">
                      Get notified when you receive messages
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.messageAlerts}
                    onChange={() => handleToggle('messageAlerts')}
                    className="sr-only peer"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-250 dark:bg-slate-700 peer-focus:outline-none 
                    peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                    after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                    after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                    peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Save Button for Notification Settings */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/50">
              <button 
                onClick={handleSave}
                disabled={saveLoading}
                className={`w-full sm:w-auto justify-center flex items-center px-6 py-2.5 text-white rounded-xl shadow-sm hover:shadow-md 
                  transform transition-all duration-200 font-medium ${
                    saveLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 active:scale-[0.98]'
                  }`}
              >
                <Save className={`w-5 h-5 mr-2 ${saveLoading ? 'animate-spin' : ''}`} />
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Card>

        {/* Security Settings Card (Full width on Desktop, Stacked inputs on Mobile) */}
        <Card className="w-full">
          <div className="p-6">
            <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <Lock className="w-5 h-5 mr-2 text-emerald-600" />
              Security
            </h2>
            
            <div className="border-t border-gray-100 dark:border-slate-700/50 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
              
              {passwordError && (
                <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 p-4 text-sm font-medium text-red-700 dark:text-red-400">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-2xl">
                {/* Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => {
                        setPasswordError('');
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                      }}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-405 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none p-1 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => {
                        setPasswordError('');
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                      }}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-405 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none p-1 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => {
                        setPasswordError('');
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                      }}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none p-1 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={`w-full sm:w-auto px-6 py-2.5 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all duration-200 ${
                      passwordLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0'
                    }`}
                  >
                    {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;