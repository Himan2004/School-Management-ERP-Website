import React, { useEffect, useState } from 'react';

import {
  Settings, Globe, Bell, Database, Users, CreditCard,
  Save, RefreshCw, Download, Server, BellRing,
  Smartphone as SmartphoneIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../../services/api/graphuraApi';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);




  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await api.fetchSystemSettings();
        // Defensive check for nested data property
        const fetchedData = res.data?.data;
        if (fetchedData && typeof fetchedData === 'object' && Object.keys(fetchedData).length > 0) {
          setSettings(fetchedData);
        }
      } catch (err) {
        console.error("Fetch Settings error", err);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Initializing System Settings...</p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...settings };
      if (payload.notifications) {
        payload.notifications = { ...payload.notifications };
        delete payload.notifications.smsNotifications;
        delete payload.notifications.pushNotifications;
      }
      const res = await api.updateSystemSettings(payload);
      setSettings(res.data.data || settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    const backupToast = toast.loading('Generating full database backup...');
    try {
      const res = await api.exportDatabaseBackup();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = res.headers['content-disposition'];
      let filename = 'Graphura_Backup.json';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Backup downloaded successfully', { id: backupToast });
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to generate database backup', { id: backupToast });
    } finally {
      setIsBackingUp(false);
    }
  };





  const tabs = [
    { id: 'general', name: 'General', icon: Settings, description: 'Basic platform settings' },
    { id: 'school', name: 'School Settings', icon: Users, description: 'School registration & limits' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Email & SMS alerts' },
    { id: 'integrations', name: 'Integrations', icon: Database, description: 'Third-party services' },
    { id: 'logs', name: 'Logs & Backup', icon: Server, description: 'System logs & backups' }
  ];

  const renderSettingSection = (title, icon, children) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">{icon}</div>
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const renderSwitch = (checked, onChange, label, description) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure platform settings, security, and preferences</p>

        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-t-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {renderSettingSection('Basic Information', <Settings className="w-5 h-5 text-indigo-600" />,
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label><input type="text" value={settings.general?.siteName || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, siteName: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Email</label><input type="email" value={settings.general?.siteEmail || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, siteEmail: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Phone</label><input type="text" value={settings.general?.sitePhone || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, sitePhone: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label><input type="text" value={settings.general?.siteAddress || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, siteAddress: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label><select value={settings.general?.timezone || 'Asia/Kolkata'} onChange={(e) => setSettings({...settings, general: {...settings.general, timezone: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="America/New_York">America/New_York (EST)</option><option value="Europe/London">Europe/London (GMT)</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={settings.general?.currency || 'INR'} onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="INR">Indian Rupee (₹)</option><option value="USD">US Dollar ($)</option><option value="EUR">Euro (€)</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label><select value={settings.general?.dateFormat || 'DD/MM/YYYY'} onChange={(e) => setSettings({...settings, general: {...settings.general, dateFormat: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Language</label><select value={settings.general?.language || 'en'} onChange={(e) => setSettings({...settings, general: {...settings.general, language: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option></select></div>
            </div>
          )}

          {renderSettingSection('Footer & Social Links', <Globe className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label><input type="text" value={settings.general?.footerText || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, footerText: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label><input type="url" value={settings.general?.socialLinks?.facebook || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, socialLinks: {...settings.general?.socialLinks, facebook: e.target.value}}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label><input type="url" value={settings.general?.socialLinks?.twitter || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, socialLinks: {...settings.general?.socialLinks, twitter: e.target.value}}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label><input type="url" value={settings.general?.socialLinks?.linkedin || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, socialLinks: {...settings.general?.socialLinks, linkedin: e.target.value}}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label><input type="url" value={settings.general?.socialLinks?.instagram || ''} onChange={(e) => setSettings({...settings, general: {...settings.general, socialLinks: {...settings.general?.socialLinks, instagram: e.target.value}}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* School Settings */}
      {activeTab === 'school' && (
        <div className="space-y-6">
          {renderSettingSection('Registration Settings', <Users className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              {renderSwitch(settings.school?.allowSchoolRegistration || false, (e) => setSettings({...settings, school: {...settings.school, allowSchoolRegistration: e.target.checked}}), 'Allow School Registration', 'Enable new schools to register on the platform')}
              {renderSwitch(settings.school?.requireDocumentVerification || false, (e) => setSettings({...settings, school: {...settings.school, requireDocumentVerification: e.target.checked}}), 'Document Verification Required', 'Require document verification for school registration')}
              {renderSwitch(settings.school?.autoApproveSchools || false, (e) => setSettings({...settings, school: {...settings.school, autoApproveSchools: e.target.checked}}), 'Auto-approve Schools', 'Automatically approve school registrations without manual review')}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Students per School</label><input type="number" value={settings.school?.maxStudentsPerSchool || 150} onChange={(e) => setSettings({...settings, school: {...settings.school, maxStudentsPerSchool: parseInt(e.target.value)}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Teachers per School</label><input type="number" value={settings.school?.maxTeachersPerSchool || 10} onChange={(e) => setSettings({...settings, school: {...settings.school, maxTeachersPerSchool: parseInt(e.target.value)}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                {/* <div><label className="block text-sm font-medium text-gray-700 mb-1">Default Subscription Plan</label><select value={settings.school?.defaultSubscriptionPlan || 'Basic'} onChange={(e) => setSettings({...settings, school: {...settings.school, defaultSubscriptionPlan: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option>Basic</option><option>Standard</option><option>Premium</option></select></div> */}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Trial Period (Days)</label><input type="number" value={settings.school?.trialPeriodDays || 1} onChange={(e) => setSettings({...settings, school: {...settings.school, trialPeriodDays: parseInt(e.target.value)}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
            </div>
          )}

          {renderSettingSection('Portal Access', <SmartphoneIcon className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              {renderSwitch(settings.school?.enableStudentPortal || false, (e) => setSettings({...settings, school: {...settings.school, enableStudentPortal: e.target.checked}}), 'Student Portal', 'Allow students to access their dashboard')}
              {renderSwitch(settings.school?.enableParentPortal || false, (e) => setSettings({...settings, school: {...settings.school, enableParentPortal: e.target.checked}}), 'Parent Portal', 'Allow parents to access their dashboard')}
              {renderSwitch(settings.school?.enableTeacherPortal || false, (e) => setSettings({...settings, school: {...settings.school, enableTeacherPortal: e.target.checked}}), 'Teacher Portal', 'Allow teachers to access their dashboard')}
              <div className="mt-4"><label className="block text-sm font-medium text-gray-700 mb-1">School Domain Prefix</label><input type="text" value={settings.school?.schoolDomainPrefix || ''} onChange={(e) => setSettings({...settings, school: {...settings.school, schoolDomainPrefix: e.target.value}})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
          )}
        </div>
      )}



      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {renderSettingSection('Notification Channels', <Bell className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              {renderSwitch(settings.notifications?.emailNotifications || false, (e) => setSettings({...settings, notifications: {...settings.notifications, emailNotifications: e.target.checked}}), 'Email Notifications', 'Send email notifications for important events')}
            </div>
          )}

          {renderSettingSection('Alert Preferences', <BellRing className="w-5 h-5 text-indigo-600" />,
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSwitch(settings.notifications?.adminAlerts || false, (e) => setSettings({...settings, notifications: {...settings.notifications, adminAlerts: e.target.checked}}), 'Admin Alerts', 'Notify admins about system events')}
              {renderSwitch(settings.notifications?.schoolAlerts || false, (e) => setSettings({...settings, notifications: {...settings.notifications, schoolAlerts: e.target.checked}}), 'School Alerts', 'Notify schools about important updates')}
              {renderSwitch(settings.notifications?.userAlerts || false, (e) => setSettings({...settings, notifications: {...settings.notifications, userAlerts: e.target.checked}}), 'User Alerts', 'Notify users about account activities')}
              {renderSwitch(settings.notifications?.paymentAlerts || false, (e) => setSettings({...settings, notifications: {...settings.notifications, paymentAlerts: e.target.checked}}), 'Payment Alerts', 'Notify about payment transactions')}
              {renderSwitch(settings.notifications?.systemAlerts || false, (e) => setSettings({...settings, notifications: {...settings.notifications, systemAlerts: e.target.checked}}), 'System Alerts', 'Notify about system maintenance')}
            </div>
          )}
        </div>
      )}

      {/* Appearance Settings */}
      
          {/* Integrations Settings */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
       
          {renderSettingSection('Email & Payment Gateways', <CreditCard className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              {renderSwitch(settings.integrations?.smtpEnabled || false, (e) => setSettings({...settings, integrations: {...settings.integrations, smtpEnabled: e.target.checked}}), 'SMTP Email', 'Configure custom SMTP for sending emails')}
              {settings.integrations?.smtpEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label>SMTP Host</label><input type="text" value={settings.integrations?.smtpHost || ''} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, smtpHost: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label>SMTP Port</label><input type="number" value={settings.integrations?.smtpPort || 587} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, smtpPort: parseInt(e.target.value)}})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label>SMTP User</label><input type="text" value={settings.integrations?.smtpUser || ''} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, smtpUser: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label>SMTP Password</label><input type="password" value={settings.integrations?.smtpPassword || ''} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, smtpPassword: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" /></div>
                </div>
              )}
              <div><label className="block text-sm font-medium mb-1">Payment Gateway</label><select value={settings.integrations?.paymentGateway || 'Razorpay'} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, paymentGateway: e.target.value}})} className="w-full px-3 py-2 border rounded-lg"><option>Razorpay</option><option>Stripe</option><option>PayPal</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Payment API Key</label><input type="text" value={settings.integrations?.paymentKey || ''} onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, paymentKey: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
          )}
        </div>
      )}

      {/* Logs & Backup Settings */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {renderSettingSection('Logging Preferences', <Server className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Log Retention (days)</label><input type="number" value={settings.logs?.logRetention || 90} onChange={(e) => setSettings({...settings, logs: {...settings.logs, logRetention: parseInt(e.target.value)}})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Log Level</label><select value={settings.logs?.logLevel || 'info'} onChange={(e) => setSettings({...settings, logs: {...settings.logs, logLevel: e.target.value}})} className="w-full px-3 py-2 border rounded-lg"><option>debug</option><option>info</option><option>warning</option><option>error</option></select></div>
              </div>
              {renderSwitch(settings.logs?.errorLogging || false, (e) => setSettings({...settings, logs: {...settings.logs, errorLogging: e.target.checked}}), 'Error Logging', 'Log all system errors')}
              {renderSwitch(settings.logs?.auditLogging || false, (e) => setSettings({...settings, logs: {...settings.logs, auditLogging: e.target.checked}}), 'Audit Logging', 'Track all admin actions')}
              {renderSwitch(settings.logs?.userActivityLogging || false, (e) => setSettings({...settings, logs: {...settings.logs, userActivityLogging: e.target.checked}}), 'User Activity Logging', 'Track user activities')}
            </div>
          )}

          {renderSettingSection('Backup Settings', <Database className="w-5 h-5 text-indigo-600" />,
            <div className="space-y-4">
              {renderSwitch(settings.security?.backupEnabled || false, (e) => setSettings({...settings, security: {...settings.security, backupEnabled: e.target.checked}}), 'Auto Backup', 'Automatically backup system data')}
              {settings.security?.backupEnabled && (<><div><label className="block text-sm font-medium mb-1">Backup Frequency</label><select value={settings.security?.backupFrequency || 'daily'} onChange={(e) => setSettings({...settings, security: {...settings.security, backupFrequency: e.target.value}})} className="w-full px-3 py-2 border rounded-lg"><option>daily</option><option>weekly</option><option>monthly</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Backup Time (UTC)</label><input type="time" value={settings.security?.backupTime || '02:00'} onChange={(e) => setSettings({...settings, security: {...settings.security, backupTime: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Retention Days</label><input type="number" value={settings.security?.retentionDays || 30} onChange={(e) => setSettings({...settings, security: {...settings.security, retentionDays: parseInt(e.target.value)}})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <button 
                onClick={handleCreateBackup} 
                disabled={isBackingUp}
                className={`mt-2 px-4 py-2 ${isBackingUp ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors`}
              >
                {isBackingUp ? <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" /> : <Download className="w-4 h-4 inline mr-2" />}
                {isBackingUp ? 'Generating Backup...' : 'Create Backup Now'}
              </button></>)}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-600">Loading settings...</span>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;