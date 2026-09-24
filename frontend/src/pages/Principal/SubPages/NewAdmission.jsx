import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { submitAdmission, generateReferenceId, uploadAdmissionDocuments, getAvailableClasses } from '../../../services/api/principalAdmissionApi';

const NewAdmission = () => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    religion: '',
    category: 'General',
    aadharNumber: '',
    admissionNumber: 'ADM-2024-001',
    admissionDate: new Date().toISOString().split('T')[0],
    class: '',
    section: '',
    rollNumber: '',
    previousSchool: '',
    fatherName: '',
    motherName: '',
    guardianContact: '',
    alternateContact: '',
    email: '',
    occupation: '',
    annualIncome: '',
    homeAddress: '',
  });

  const [files, setFiles] = useState({
    birthCertificate: null,
    aadharCard: null,
    previousTC: null,
    passportPhoto: null,
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false); 

  // Dynamic Class & Section State
  const [classesList, setClassesList] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classesRes = await getAvailableClasses();
        
        // BULLETPROOF ARRAY EXTRACTION
        let extractedClasses = [];
        if (Array.isArray(classesRes)) extractedClasses = classesRes;
        else if (Array.isArray(classesRes?.data)) extractedClasses = classesRes.data;
        else if (Array.isArray(classesRes?.data?.data)) extractedClasses = classesRes.data.data;
        
        if (extractedClasses.length > 0) {
          setClassesList(extractedClasses);
        } else {
          console.warn("No classes found or incorrect data structure:", classesRes);
          setClassesList([]);
        }

        const refRes = await generateReferenceId();
        if (refRes?.success || refRes?.ref) {
          setFormData(prev => ({ ...prev, admissionNumber: refRes.ref || refRes.data?.ref }));
        }
      } catch (error) {
        console.error("Failed to load admission prerequisites:", error);
        setClassesList([]);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError(''); 
  };

  const handleClassChange = (e) => {
    const selectedClassId = e.target.value;
    setFormData(prev => ({ ...prev, class: selectedClassId, section: '' }));
    
    const classObj = classesList.find(c => c._id === selectedClassId);
    if (classObj && classObj.sections && classObj.sections.length > 0) {
        setAvailableSections(classObj.sections);
    } else {
        setAvailableSections([]);
    }
  };

  const handleFileUpload = (e, fileType) => {
    const file = e.target.files[0];
    if (file) setFiles(prev => ({ ...prev, [fileType]: file }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, passportPhoto: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.fatherName.trim()) newErrors.fatherName = 'Father/Guardian Name is required';
    if (!formData.guardianContact.trim()) newErrors.guardianContact = 'Contact Number is required';
    if (!formData.homeAddress.trim()) newErrors.homeAddress = 'Home Address is required';
    
    if (formData.guardianContact && !/^\d{10}$/.test(formData.guardianContact)) newErrors.guardianContact = 'Must be 10 digits';
    if (formData.alternateContact && !/^\d{10}$/.test(formData.alternateContact)) newErrors.alternateContact = 'Must be 10 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) newErrors.aadharNumber = 'Must be 12 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError('');
    setSuccessMessage('');
    console.log("[Admission] Form submission start (Principal New Admission)");

    if (!validateForm()) {
      console.warn("[Admission] Validation failure: invalid form data", errors);
      return;
    }
    setIsLoading(true);

    const payload = {
      parent: {
        fullName: formData.fatherName || formData.motherName || 'Unknown',
        email: formData.email || `parent${Date.now()}@example.com`,
        primaryContact: formData.guardianContact,
        alternateContact: formData.alternateContact || null,
        fatherName: formData.fatherName || null,
        motherName: formData.motherName || null,
        relation: 'Father', 
        address: {
          city: 'Unknown', 
          state: 'Unknown',
          pincode: '000000',
          street: formData.homeAddress
        },
        aadharNumber: null
      },
      students: [
        {
          fullName: formData.fullName,
          gender: formData.gender,
          dob: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup || null,
          class: formData.class || null, 
          section: formData.section || null,
          rollNumber: formData.rollNumber || null,
          previousSchool: formData.previousSchool || null
        }
      ],
      declarationAccepted: true
    };

    console.log("[Admission] Payload being submitted:", payload);
    console.log("[Admission] API request start: /principal/admissions");

    try {
      const response = await submitAdmission(payload);
      console.log("[Admission] API response success:", response);
      if (response.success) {
        const admissionId = response.data._id;
        const createdStudentId = response.data.students?.[0]?._id;

        const hasFiles = Object.values(files).some(f => f !== null);
        if (hasFiles && admissionId && createdStudentId) {
          try {
            const docFiles = {
              aadhar: files.aadharCard,
              birthCertificate: files.birthCertificate,
              tc: files.previousTC,
              photo: files.passportPhoto,
            };
            console.log("[Admission] Initiating document upload for IDs:", { admissionId, createdStudentId });
            const docResponse = await uploadAdmissionDocuments(admissionId, createdStudentId, docFiles);
            console.log("[Admission] Document upload response:", docResponse);
          } catch (docErr) {
            console.error("[Admission] Document upload failed partially:", docErr);
          }
        }

        setSuccessMessage(`Admission submitted successfully! Ref No: ${response.data.applicationNumber || formData.admissionNumber}`);
        setTimeout(() => {
          resetForm();
          generateReferenceId().then(res => {
            if (res.success) setFormData(prev => ({ ...prev, admissionNumber: res.ref }));
          });
        }, 3000);
      }
    } catch (error) {
      console.error("[Admission] API response failure:", error);
      setApiError(error.response?.data?.message || 'Failed to submit admission. Database validation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
      setApiError("Drafts feature requires explicit connection to Drafts collection. Please submit fully for now.");
  };

  const resetForm = () => {
    setFormData({
      fullName: '', dateOfBirth: '', gender: '', bloodGroup: '', religion: '', category: 'General', aadharNumber: '',
      admissionNumber: 'ADM-2024-001', admissionDate: new Date().toISOString().split('T')[0], class: '', section: '', rollNumber: '',
      previousSchool: '', fatherName: '', motherName: '', guardianContact: '', alternateContact: '', email: '', occupation: '', annualIncome: '', homeAddress: '',
    });
    setFiles({ birthCertificate: null, aadharCard: null, previousTC: null, passportPhoto: null });
    setPhotoPreview(null);
    setErrors({});
    setSubmitted(false);
    setApiError('');
    setSuccessMessage('');
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="text-left">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Admission</h1>
          <p className="text-gray-600 mt-2">Fill in the details below to register a new student</p>
        </div>

        {submitted && errorCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold mb-1">Please fix {errorCount} error{errorCount !== 1 ? 's' : ''} before submitting:</p>
              <ul className="list-disc list-inside text-red-700 text-sm">
                {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          </div>
        )}

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-semibold">{apiError}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 font-semibold">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Student Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-600">*</span></label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter full name" />
                {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth <span className="text-red-600">*</span></label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.dateOfBirth && <p className="text-red-600 text-sm mt-1">{errors.dateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-600">*</span></label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.gender ? 'border-red-500' : 'border-gray-200'}`}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="text-red-600 text-sm mt-1">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                <input type="text" name="religion" value={formData.religion} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter religion" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-600">*</span></label>
                <select name="category" value={formData.category} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.category ? 'border-red-500' : 'border-gray-200'}`}>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number</label>
                <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} placeholder="12 digits" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.aadharNumber ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.aadharNumber && <p className="text-red-600 text-sm mt-1">{errors.aadharNumber}</p>}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Student Photo</label>
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition block">
                    <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload student photo</p>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {files.passportPhoto && !photoPreview && <p className="text-sm text-green-600 mt-2 text-center">✓ Image selected</p>}
                </div>
                {photoPreview && (
                  <div className="flex-shrink-0 relative group">
                    <img src={photoPreview} alt="Preview" className="w-32 h-40 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => { setPhotoPreview(null); setFiles(prev => ({ ...prev, passportPhoto: null })); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Admission Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admission Number</label>
                <input type="text" value={formData.admissionNumber} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admission Date</label>
                <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class <span className="text-red-600">*</span></label>
                <select name="class" value={formData.class} onChange={handleClassChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.class ? 'border-red-500' : 'border-gray-200'}`}>
                  <option value="">Select Class</option>
                  {classesList.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))}
                </select>
                {errors.class && <p className="text-red-600 text-sm mt-1">{errors.class}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section <span className="text-red-600">*</span></label>
                <select name="section" value={formData.section} onChange={handleChange} disabled={!formData.class} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.section ? 'border-red-500' : 'border-gray-200'} ${!formData.class ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                  <option value="">Select Section</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
                {errors.section && <p className="text-red-600 text-sm mt-1">{errors.section}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                <input type="number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Previous School Name</label>
                <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Parent / Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Father Name <span className="text-red-600">*</span></label>
                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.fatherName ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.fatherName && <p className="text-red-600 text-sm mt-1">{errors.fatherName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mother Name <span className="text-red-600">*</span></label>
                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.motherName ? 'border-red-500' : 'border-gray-200'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Contact <span className="text-red-600">*</span></label>
                <input type="tel" name="guardianContact" value={formData.guardianContact} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.guardianContact ? 'border-red-500' : 'border-gray-200'}`} placeholder="10 digits" />
                {errors.guardianContact && <p className="text-red-600 text-sm mt-1">{errors.guardianContact}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Contact Number</label>
                <input type="tel" name="alternateContact" value={formData.alternateContact} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.alternateContact ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter 10 digit contact number (optional)" />
                {errors.alternateContact && <p className="text-red-600 text-sm mt-1">{errors.alternateContact}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter occupation (optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
                <input type="number" name="annualIncome" value={formData.annualIncome} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter annual income (optional)" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Home Address <span className="text-red-600">*</span></label>
                <textarea name="homeAddress" value={formData.homeAddress} onChange={handleChange} rows="3" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.homeAddress ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.homeAddress && <p className="text-red-600 text-sm mt-1">{errors.homeAddress}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Document Upload</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birth Certificate</label>
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 block">
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-600">PDF or Image</p>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'birthCertificate')} className="hidden" />
                </label>
                {files.birthCertificate && <p className="text-sm text-green-600 mt-2 flex justify-between"><span>✓ {files.birthCertificate.name}</span><X size={16} className="cursor-pointer text-red-500" onClick={() => setFiles(prev => ({...prev, birthCertificate: null}))}/></p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card</label>
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 block">
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-600">PDF or Image</p>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'aadharCard')} className="hidden" />
                </label>
                {files.aadharCard && <p className="text-sm text-green-600 mt-2 flex justify-between"><span>✓ {files.aadharCard.name}</span><X size={16} className="cursor-pointer text-red-500" onClick={() => setFiles(prev => ({...prev, aadharCard: null}))}/></p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Previous School TC (Transfer Certificate)</label>
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 block">
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-600">PDF or Image</p>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'previousTC')} className="hidden" />
                </label>
                {files.previousTC && <p className="text-sm text-green-600 mt-2 flex justify-between"><span>✓ {files.previousTC.name}</span><X size={16} className="cursor-pointer text-red-500" onClick={() => setFiles(prev => ({...prev, previousTC: null}))}/></p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pb-8">
            <button type="button" onClick={handleSaveDraft} disabled={isDrafting || isLoading} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg">
              {isDrafting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="submit" disabled={isLoading || isDrafting} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2">
              {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>}
              {isLoading ? 'Submitting...' : 'Submit Admission'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NewAdmission;