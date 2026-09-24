import React, { useState } from 'react';
import { Upload, X, Eye, EyeOff, AlertCircle, CheckCircle2, LogOut, Download, FileDown } from 'lucide-react';

const PrincipalProfile = () => {
  // Profile data
  const [profileData, setProfileData] = useState({
    name: 'Dr. Rajesh Kumar',
    designation: 'Principal',
    employeeId: 'EMP-001',
    school: 'Delhi Public School, East Delhi',
    status: 'Active',
    yearsExperience: 18,
    classesManaged: 12,
    staffManaged: 35,
    dateJoining: '2006-06-15',
    photo: null
  });

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'Dr. Rajesh Kumar',
    dob: '1975-08-15',
    gender: 'Male',
    bloodGroup: 'O+',
    contactNumber: '8765432109',
    alternateNumber: '9876543210',
    email: 'rajesh.kumar@dpsschool.edu.in',
    address: '45, Teachers Colony, East Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pin: '110091',
    emergencyContactName: 'Mrs. Priya Kumar',
    emergencyContactNumber: '9999999999'
  });

  // Professional Info State
  const [professionalInfo, setProfessionalInfo] = useState({
    qualification: 'M.A. in Education, B.Ed',
    specialization: 'Educational Administration',
    totalExperience: 18,
    previousSchool: 'St. Xavier\'s School, Delhi',
    certifications: 'National Board Certification, School Leadership Program'
  });

  // Leave Balance
  const [leaveBalance] = useState({
    casual: { remaining: 8, total: 12 },
    sick: { remaining: 5, total: 10 },
    earned: { remaining: 15, total: 20 }
  });

  // Salary Info
  const [salaryHistory] = useState([
    { month: 'February 2025', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' },
    { month: 'January 2025', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' },
    { month: 'December 2024', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' },
    { month: 'November 2024', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' },
    { month: 'October 2024', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' },
    { month: 'September 2024', basic: '45,000', allowances: '7,500', deductions: '2,000', net: '50,500', status: 'Paid' }
  ]);

  // Security State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [activeSessions] = useState([
    { device: 'Chrome', os: 'Windows 11', ip: '192.168.1.1', lastActive: 'Active now' },
    { device: 'Safari', os: 'iPhone 14', ip: '192.168.1.2', lastActive: '2 hours ago' }
  ]);

  // Activity Log
  const [activityLogs] = useState([
    { id: 1, action: 'Approved results for Class 6 - Half Yearly', timestamp: '2025-03-19 14:30', ip: '192.168.1.1', module: 'Examinations' },
    { id: 2, action: 'Updated fee structure for 2025-26', timestamp: '2025-03-19 10:15', ip: '192.168.1.1', module: 'Fees' },
    { id: 3, action: 'Generated academic report for 2024-25', timestamp: '2025-03-18 16:45', ip: '192.168.1.1', module: 'Reports' },
    { id: 4, action: 'Logged in to system', timestamp: '2025-03-18 08:00', ip: '192.168.1.1', module: 'Login' },
    { id: 5, action: 'Approved new admission request', timestamp: '2025-03-17 13:20', ip: '192.168.1.1', module: 'Admissions' },
    { id: 6, action: 'Locked academic year 2023-24', timestamp: '2025-03-17 11:00', ip: '192.168.1.1', module: 'Settings' },
    { id: 7, action: 'Generated promotion report', timestamp: '2025-03-16 15:30', ip: '192.168.1.1', module: 'Promotion' },
    { id: 8, action: 'Updated school contact information', timestamp: '2025-03-16 09:45', ip: '192.168.1.1', module: 'Settings' },
    { id: 9, action: 'Review staff attendance records', timestamp: '2025-03-15 14:00', ip: '192.168.1.1', module: 'Attendance' },
    { id: 10, action: 'Approved leave request from teacher', timestamp: '2025-03-15 11:15', ip: '192.168.1.1', module: 'Leaves' },
    { id: 11, action: 'Generated financial report', timestamp: '2025-03-14 16:20', ip: '192.168.1.1', module: 'Finance' },
    { id: 12, action: 'Created new exam schedule', timestamp: '2025-03-14 10:30', ip: '192.168.1.1', module: 'Examinations' },
    { id: 13, action: 'Updated student fee records', timestamp: '2025-03-13 13:45', ip: '192.168.1.1', module: 'Fees' },
    { id: 14, action: 'Reviewed class performance metrics', timestamp: '2025-03-13 09:00', ip: '192.168.1.1', module: 'Analytics' },
    { id: 15, action: 'Logged out from system', timestamp: '2025-03-12 18:30', ip: '192.168.1.1', module: 'Logout' }
  ]);

  // State management
  const [activeTab, setActiveTab] = useState('personal');
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [applyLeaveForm, setApplyLeaveForm] = useState({
    leaveType: 'Casual',
    fromDate: '',
    toDate: '',
    reason: '',
    certificate: null
  });
  const [activityFilterDateFrom, setActivityFilterDateFrom] = useState('');
  const [activityFilterDateTo, setActivityFilterDateTo] = useState('');
  const [activityFilterType, setActivityFilterType] = useState('All');

  // Password strength calculator
  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(passwords.new);
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-300';
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const passwordRequirements = [
    { text: 'Minimum 8 characters', met: passwords.new.length >= 8 },
    { text: 'At least one uppercase letter', met: /[A-Z]/.test(passwords.new) },
    { text: 'At least one number', met: /[0-9]/.test(passwords.new) },
    { text: 'At least one special character', met: /[^A-Za-z0-9]/.test(passwords.new) }
  ];

  const handleSavePersonalInfo = () => {
    alert('Personal information updated successfully');
  };

  const handleSaveProfessionalInfo = () => {
    alert('Professional information updated successfully');
  };

  const handleUpdatePassword = () => {
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match');
      return;
    }
    if (passwordStrength < 3) {
      alert('Password is too weak');
      return;
    }
    alert('Password updated successfully');
    setPasswords({ current: '', new: '', confirm: '' });
    setShowPasswordModal(false);
  };

  const handleApplyLeave = () => {
    if (!applyLeaveForm.reason || !applyLeaveForm.fromDate || !applyLeaveForm.toDate) {
      alert('Please fill in all required fields');
      return;
    }
    alert('Leave application submitted');
    setShowApplyLeaveModal(false);
    setApplyLeaveForm({ leaveType: 'Casual', fromDate: '', toDate: '', reason: '', certificate: null });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredActivityLogs = activityLogs.filter(log => {
    const matchType = activityFilterType === 'All' || log.module === activityFilterType;
    return matchType;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="text-left">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal and professional information</p>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Photo and Basic Info */}
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-blue-500">
                  {profileData.photo ? (
                    <img src={profileData.photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-400">RK</div>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition shadow-lg">
                  <Upload size={18} />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 text-center">{profileData.name}</h2>
              <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-sm mt-2">
                {profileData.designation}
              </span>
              <p className="text-gray-600 text-center mt-3 text-sm">{profileData.school}</p>
              <p className="text-gray-700 font-medium mt-3">ID: {profileData.employeeId}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-700 font-medium text-sm">{profileData.status}</span>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Years of Experience</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{profileData.yearsExperience}</p>
                <p className="text-xs text-gray-600 mt-1">years</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Classes Managed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{profileData.classesManaged}</p>
                <p className="text-xs text-gray-600 mt-1">classes</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Staff Managed</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{profileData.staffManaged}</p>
                <p className="text-xs text-gray-600 mt-1">members</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Date of Joining</p>
                <p className="text-lg font-bold text-orange-600 mt-2">{new Date(profileData.dateJoining).toLocaleDateString()}</p>
                <p className="text-xs text-gray-600 mt-1">DOJ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'personal', label: 'Personal Info' },
              { id: 'professional', label: 'Professional Info' },
              { id: 'security', label: 'Security' },
              { id: 'activity', label: 'Activity Log' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={personalInfo.dob}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={personalInfo.gender}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                    <select
                      value={personalInfo.bloodGroup}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, bloodGroup: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>O+</option>
                      <option>O-</option>
                      <option>A+</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B-</option>
                      <option>AB+</option>
                      <option>AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <input
                      type="tel"
                      value={personalInfo.contactNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, contactNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Number (Optional)</label>
                    <input
                      type="tel"
                      value={personalInfo.alternateNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, alternateNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Home Address</label>
                    <textarea
                      rows={3}
                      value={personalInfo.address}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={personalInfo.city}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={personalInfo.state}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                    <input
                      type="text"
                      value={personalInfo.pin}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, pin: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={personalInfo.emergencyContactName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Number</label>
                    <input
                      type="tel"
                      value={personalInfo.emergencyContactNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContactNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSavePersonalInfo}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Save Personal Info
                  </button>
                </div>
              </div>
            )}

            {/* Professional Info Tab */}
            {activeTab === 'professional' && (
              <div className="space-y-8">
                {/* Professional Details Form */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Professional Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                      <input
                        type="text"
                        value={profileData.employeeId}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                      <input
                        type="date"
                        value={profileData.dateJoining}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                      <input
                        type="text"
                        value={profileData.designation}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value="Administration"
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                      <input
                        type="text"
                        value={professionalInfo.qualification}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, qualification: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={professionalInfo.specialization}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, specialization: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Experience (years)</label>
                      <input
                        type="number"
                        value={professionalInfo.totalExperience}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, totalExperience: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Previous School</label>
                      <input
                        type="text"
                        value={professionalInfo.previousSchool}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, previousSchool: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                      <textarea
                        rows={3}
                        value={professionalInfo.certifications}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, certifications: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Leave Balance */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Leave Balance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {[
                      { label: 'Casual Leave', remaining: leaveBalance.casual.remaining, total: leaveBalance.casual.total },
                      { label: 'Sick Leave', remaining: leaveBalance.sick.remaining, total: leaveBalance.sick.total },
                      { label: 'Earned Leave', remaining: leaveBalance.earned.remaining, total: leaveBalance.earned.total }
                    ].map((leave, index) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                        <p className="text-gray-600 text-sm font-medium">{leave.label}</p>
                        <div className="mt-4">
                          <p className="text-3xl font-bold text-blue-600">{leave.remaining}</p>
                          <p className="text-gray-600 text-sm mt-1">of {leave.total} days remaining</p>
                        </div>
                        <div className="mt-4 bg-blue-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full"
                            style={{ width: `${(leave.remaining / leave.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowApplyLeaveModal(true)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
                  >
                    Apply Leave
                  </button>
                </div>

                {/* Salary Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Salary Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                      <p className="text-gray-600 text-sm">Basic Salary</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">₹45,000</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                      <p className="text-gray-600 text-sm">Last Month Salary (with allowances)</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">₹52,000</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                      <p className="text-gray-600 text-sm">Next Payout</p>
                      <p className="text-2xl font-bold text-purple-600 mt-2">1st April</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                      <Download size={20} />
                      Download Salary Slip
                    </button>
                  </div>

                  {/* Salary History Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Month</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Basic</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Allowances</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Deductions</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Net Salary</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistory.map((record, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-4 px-4">{record.month}</td>
                            <td className="py-4 px-4">₹{record.basic}</td>
                            <td className="py-4 px-4">₹{record.allowances}</td>
                            <td className="py-4 px-4">₹{record.deductions}</td>
                            <td className="py-4 px-4 font-bold">₹{record.net}</td>
                            <td className="py-4 px-4">
                              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium text-xs">
                                {record.status}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfessionalInfo}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Save Professional Info
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Change Password */}
                <div className="border-b border-gray-200 pb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? 'text' : 'password'}
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                          className="absolute right-3 top-3 text-gray-600"
                        >
                          {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? 'text' : 'password'}
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                          className="absolute right-3 top-3 text-gray-600"
                        >
                          {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>

                      {/* Strength Indicator */}
                      {passwords.new && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-700">Password Strength</span>
                            <span className="text-xs font-bold text-gray-700">
                              {passwordStrength === 0 ? 'None' : passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition ${getPasswordStrengthColor()}`}
                              style={{ width: `${(passwordStrength / 4) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Requirements */}
                      {passwords.new && (
                        <div className="mt-4 space-y-2">
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                                req.met ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {req.met ? '✓' : '○'}
                              </div>
                              <span className={`text-sm ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                          className="absolute right-3 top-3 text-gray-600"
                        >
                          {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Two Factor Authentication */}
                <div className="border-b border-gray-200 pb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Two Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-700 font-medium">Status: <span className={twoFAEnabled ? 'text-green-600' : 'text-red-600'}>
                        {twoFAEnabled ? 'Enabled' : 'Disabled'}
                      </span></p>
                      <p className="text-gray-600 text-sm mt-1">Secure your account with 2FA using Google Authenticator</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoFAEnabled}
                        onChange={(e) => setTwoFAEnabled(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable 2FA</span>
                    </label>
                  </div>

                  {twoFAEnabled && (
                    <div className="mt-6 p-6 bg-gray-50 rounded-lg max-w-sm">
                      <div className="bg-gray-200 rounded-lg w-40 h-40 flex items-center justify-center mx-auto mb-4">
                        <div className="text-center">
                          <div className="text-gray-600 font-bold text-2xl">QR</div>
                          <p className="text-gray-600 text-xs mt-2">QR Code Placeholder</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 text-center mb-4">
                        Scan this QR code with Google Authenticator to enable 2FA
                      </p>
                      <button className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm">
                        Enable 2FA
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Active Sessions</h3>
                  <div className="space-y-4 mb-6">
                    {activeSessions.map((session, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{session.device} on {session.os}</p>
                          <p className="text-sm text-gray-600 mt-1">IP: {session.ip} • {session.lastActive}</p>
                        </div>
                        <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition text-sm">
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">
                    Revoke All Other Sessions
                  </button>
                </div>
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                {/* Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={activityFilterDateFrom}
                      onChange={(e) => setActivityFilterDateFrom(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={activityFilterDateTo}
                      onChange={(e) => setActivityFilterDateTo(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Action Type</label>
                    <select
                      value={activityFilterType}
                      onChange={(e) => setActivityFilterType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>All</option>
                      <option>Login</option>
                      <option>Logout</option>
                      <option>Data Edit</option>
                      <option>Approval</option>
                      <option>Report Generated</option>
                      <option>Settings</option>
                    </select>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                  {filteredActivityLogs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                      </div>
                      <div className="flex-1 py-2">
                        <p className="font-medium text-gray-900">{log.action}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{log.timestamp}</span>
                          <span>IP: {log.ip}</span>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {log.module}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                    <FileDown size={20} />
                    Export Activity Log
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Apply Leave Modal */}
        {showApplyLeaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Apply Leave</h2>
                <button
                  onClick={() => setShowApplyLeaveModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={applyLeaveForm.leaveType}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, leaveType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Casual</option>
                    <option>Sick</option>
                    <option>Earned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={applyLeaveForm.fromDate}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, fromDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={applyLeaveForm.toDate}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, toDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for leave"
                    value={applyLeaveForm.reason}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, reason: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {applyLeaveForm.leaveType === 'Sick' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attach Medical Certificate
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, certificate: e.target.files[0] })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowApplyLeaveModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyLeave}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Apply Leave
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PrincipalProfile;
