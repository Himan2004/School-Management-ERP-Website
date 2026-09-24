import { studentApi } from '../../services/api/studentApi';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Calendar, GraduationCap, 
  BookOpen, Award, Heart, Settings, Edit2, Save, X,
  Camera, Globe, Linkedin, Twitter, Facebook, Instagram,
  Star, Trophy, Users, Clock, CheckCircle, AlertCircle,
  Download, Printer, Share2, RefreshCw, Loader2,
  School, Bus, CreditCard, FileText, HeartPulse, IdCard
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentsProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    // Personal Information
    name: 'Alex Johnson',
    email: 'alex.johnson@school.com',
    phone: '+91 98765 43210',
    alternatePhone: '+91 98765 43211',
    dateOfBirth: '2010-05-15',
    gender: 'Male',
    bloodGroup: 'O+',
    address: 'Sector 15, Gurgaon, Haryana - 122001',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122001',
    country: 'India',
    
    // Academic Information
    admissionNo: '2024-001',
    rollNo: '2024001',
    class: 'Class 10',
    section: 'A',
    academicYear: '2024-25',
    enrollmentDate: '2024-01-15',
    previousSchool: 'Sunrise Public School',
    studentId: 'STU2024001',
    
    // Parent/Guardian Information
    fatherName: 'Michael Johnson',
    fatherOccupation: 'Software Engineer',
    fatherPhone: '+91 98765 43212',
    fatherEmail: 'michael.johnson@email.com',
    motherName: 'Sarah Johnson',
    motherOccupation: 'Teacher',
    motherPhone: '+91 98765 43213',
    motherEmail: 'sarah.johnson@email.com',
    guardianName: 'Michael Johnson',
    guardianRelation: 'Father',
    guardianPhone: '+91 98765 43212',
    
    // Emergency Contact
    emergencyName: 'Robert Johnson',
    emergencyRelation: 'Uncle',
    emergencyPhone: '+91 98765 43214',
    emergencyAddress: 'Sector 12, Gurgaon, Haryana',
    
    // Health Information
    height: '165 cm',
    weight: '52 kg',
    bmi: '19.1',
    vision: '20/20',
    dental: 'Good',
    allergies: 'None',
    medicalConditions: 'None',
    
    // Social Links
    linkedin: 'https://linkedin.com/in/alexjohnson',
    twitter: 'https://twitter.com/alexjohnson',
    instagram: 'https://instagram.com/alexjohnson',
    
    // Profile
    bio: 'A dedicated student passionate about mathematics and computer science. Aspiring to become a software engineer. Active participant in science fairs and coding competitions.',
    achievements: [
      'First Prize in Science Fair 2024',
      'Top Performer in Mathematics',
      'Perfect Attendance Award',
      'School Debate Competition Winner'
    ],
    interests: ['Mathematics', 'Computer Science', 'Chess', 'Reading'],
    languages: ['English', 'Hindi', 'French']
  });

  const [tempData, setTempData] = useState(profileData);
  const [activeTab, setActiveTab] = useState('personal');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const profileRes = await studentApi.getProfile();
        const data = profileRes?.data || profileRes;
        if (data) {
          setProfileData(prev => ({
            ...prev,
            ...data
          }));
        }
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEdit = () => {
    setTempData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempData(profileData);
    toast.info('Edit cancelled');
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const profilePayload = {
        fullName: tempData.name,
        email: tempData.email,
        phone: tempData.phone,
        alternatePhone: tempData.alternatePhone,
        dateOfBirth: tempData.dateOfBirth,
        gender: tempData.gender,
        bloodGroup: tempData.bloodGroup,
        address: tempData.address,
        bio: tempData.bio
      };
      
      const response = await studentApi.updateProfile(profilePayload);
      if (response?.success) {
        const updatedProfile = response?.data?.profile || response?.data;
        setProfileData(prev => ({
          ...prev,
          ...tempData,
          name: updatedProfile.fullName || tempData.name,
          email: updatedProfile.email || tempData.email,
          phone: updatedProfile.phone || tempData.phone,
          alternatePhone: updatedProfile.alternatePhone || tempData.alternatePhone,
          dateOfBirth: updatedProfile.dateOfBirth || tempData.dateOfBirth,
          gender: updatedProfile.gender || tempData.gender,
          bloodGroup: updatedProfile.bloodGroup || tempData.bloodGroup,
          address: updatedProfile.address || tempData.address,
          bio: updatedProfile.bio || tempData.bio
        }));
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        toast.success('Profile picture updated!');
      };
      reader.readAsDataURL(file);
    }
    setShowImageUpload(false);
  };

  const handleDownloadProfile = () => {
    toast.success('Profile downloaded as PDF');
  };

  const handlePrintProfile = () => {
    window.print();
    toast.success('Profile sent to printer');
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'parents', label: 'Parents', icon: Users },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'achievements', label: 'Achievements', icon: Trophy }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your personal information</p>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                    {profileData.name.charAt(0)}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowImageUpload(true)}
                className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-all"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-white">
              <h2 className="text-2xl font-bold">{profileData.name}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/80">
                <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {profileData.class} - Section {profileData.section}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> Roll No: {profileData.rollNo}</span>
                <span className="flex items-center gap-1"><IdCard className="w-4 h-4" /> Admission No: {profileData.admissionNo}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={handleDownloadProfile} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                <Download className="w-5 h-5 text-white" />
              </button>
              <button onClick={handlePrintProfile} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                <Printer className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex overflow-x-auto px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={tempData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={tempData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.email}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={tempData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.phone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Alternate Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={tempData.alternatePhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.alternatePhone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={tempData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{new Date(profileData.dateOfBirth).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  {isEditing ? (
                    <select
                      name="gender"
                      value={tempData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.gender}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Blood Group</label>
                  {isEditing ? (
                    <select
                      name="bloodGroup"
                      value={tempData.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.bloodGroup}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Street Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={tempData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.address}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="city"
                        value={tempData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.city}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">State</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="state"
                        value={tempData.state}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.state}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Pincode</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="pincode"
                        value={tempData.pincode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.pincode}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Country</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="country"
                        value={tempData.country}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.country}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">About Me</h3>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={tempData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-600 leading-relaxed">{profileData.bio}</p>
                )}
              </div>

              {/* Interests & Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.interests.map((interest, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">Languages Known</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.languages.map((lang, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Academic Information Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Admission Number</label>
                  <p className="text-gray-800 font-medium">{profileData.admissionNo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Roll Number</label>
                  <p className="text-gray-800 font-medium">{profileData.rollNo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Class</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="class"
                      value={tempData.class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.class}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Section</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="section"
                      value={tempData.section}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.section}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Academic Year</label>
                  <p className="text-gray-800 font-medium">{profileData.academicYear}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Enrollment Date</label>
                  <p className="text-gray-800 font-medium">{new Date(profileData.enrollmentDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Previous School</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="previousSchool"
                      value={tempData.previousSchool}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.previousSchool}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parents Information Tab */}
          {activeTab === 'parents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Father's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Father's Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="fatherName"
                      value={tempData.fatherName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.fatherName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Occupation</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="fatherOccupation"
                      value={tempData.fatherOccupation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.fatherOccupation}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="fatherPhone"
                      value={tempData.fatherPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.fatherPhone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="fatherEmail"
                      value={tempData.fatherEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.fatherEmail}</p>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6">Mother's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Mother's Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="motherName"
                      value={tempData.motherName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.motherName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Occupation</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="motherOccupation"
                      value={tempData.motherOccupation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.motherOccupation}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="motherPhone"
                      value={tempData.motherPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.motherPhone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="motherEmail"
                      value={tempData.motherEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.motherEmail}</p>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="emergencyName"
                      value={tempData.emergencyName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.emergencyName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Relationship</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="emergencyRelation"
                      value={tempData.emergencyRelation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.emergencyRelation}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={tempData.emergencyPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.emergencyPhone}</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="emergencyAddress"
                      value={tempData.emergencyAddress}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.emergencyAddress}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Health Information Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Height</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="height"
                      value={tempData.height}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.height}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Weight</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="weight"
                      value={tempData.weight}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.weight}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">BMI</label>
                  <p className="text-gray-800">{profileData.bmi}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Vision</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="vision"
                      value={tempData.vision}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.vision}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Dental</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="dental"
                      value={tempData.dental}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-800">{profileData.dental}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Blood Group</label>
                  <p className="text-gray-800">{profileData.bloodGroup}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Allergies</label>
                {isEditing ? (
                  <textarea
                    name="allergies"
                    value={tempData.allergies}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.allergies}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Medical Conditions</label>
                {isEditing ? (
                  <textarea
                    name="medicalConditions"
                    value={tempData.medicalConditions}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.medicalConditions}</p>
                )}
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.achievements.map((achievement, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <Trophy className="w-8 h-8 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-800">{achievement}</p>
                      <p className="text-xs text-gray-500">Achievement {idx + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Upload Profile Picture</h3>
              <button onClick={() => setShowImageUpload(false)} className="text-white hover:bg-white/20 rounded-lg p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-all">
                <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <span className="text-gray-600">Click to upload profile picture</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <p className="text-xs text-gray-500 text-center mt-4">Recommended: Square image, max 2MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsProfile;