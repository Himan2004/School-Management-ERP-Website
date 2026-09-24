import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  User,
  GraduationCap,
  Users,
  HeartPulse,
  Award,
  Download,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Heading,
  ModalProfile,
  ModalGrid,
  ModalData,
  Button,
} from '../../components/shared/Common_Components';

import { getParentStudentProfileApi } from '../../services/api/parentProfileApi';

// Helper to map flat backend structure to structured nested format expected by UI
const mapBackendProfileToFrontend = (data) => {
  if (!data) return null;

  const parseStringToArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  return {
    personal: {
      fullName: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      alternatePhone: data.alternatePhone || "",
      dob: data.dateOfBirth || null,
      gender: data.gender || "",
      bloodGroup: data.bloodGroup || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      country: data.country || "India",
      bio: data.bio || "",
      interests: Array.isArray(data.interests) ? data.interests : [],
      languages: Array.isArray(data.languages) ? data.languages : [],
    },
    class: data.class || "",
    section: data.section || "",
    rollNo: data.rollNo || "",
    admissionNo: data.admissionNo || "",
    photoUrl: data.profileImage || data.photo || "",
    academic: {
      admissionNo: data.admissionNo || "",
      rollNo: data.rollNo || "",
      class: data.class || "",
      section: data.section || "",
      academicYear: data.academicYear || "",
      enrollmentDate: data.enrollmentDate || null,
      previousSchool: data.previousSchool || "",
    },
    father: {
      name: data.fatherName || "",
      occupation: data.fatherOccupation || "",
      phone: data.fatherPhone || "",
      email: data.fatherEmail || "",
    },
    mother: {
      name: data.motherName || "",
      occupation: data.motherOccupation || "",
      phone: data.motherPhone || "",
      email: data.motherEmail || "",
    },
    emergencyContact: {
      name: data.emergencyName || "",
      relationship: data.emergencyRelation || "",
      phone: data.emergencyPhone || "",
      address: data.emergencyAddress || "",
    },

    achievements: (data.achievements || []).map(ach =>
      typeof ach === 'string' ? { title: ach } : ach
    ),
  };
};

const fetchStudentProfile = async () => {
  const res = await getParentStudentProfileApi();
  if (!res?.success) {
    throw new Error(res?.message || 'Failed to load student profile');
  }
  return mapBackendProfileToFrontend(res.data);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (val) =>
  val
    ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

const listOrDash = (arr) => (arr && arr.length > 0 ? arr.join(', ') : '—');

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'personal', label: 'Personal Information', icon: User },
  { key: 'academic', label: 'Academic Information', icon: GraduationCap },
  { key: 'parent', label: 'Parent Information', icon: Users },
  { key: 'achievements', label: 'Achievements', icon: Award },
];

const ParentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchStudentProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Something went wrong while loading the profile');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // ── PDF export ───────────────────────────────────────────────────────────
  const handleDownloadPdf = () => {
    if (!profile) return;

    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 7;
    const pageBottom = 280;

    const checkPageBreak = () => {
      if (y > pageBottom) {
        doc.addPage();
        y = 20;
      }
    };

    const addSectionTitle = (text) => {
      checkPageBreak();
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 63, 116);
      doc.text(text, 14, y);
      y += lineHeight;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      y += lineHeight - 2;
    };

    const addLine = (label, value) => {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text(`${label}:`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(29, 29, 31);
      doc.text(String(value ?? '—'), 65, y);
      y += lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 63, 116);
    doc.text('Student Profile', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Graphura School Management ERP', 14, y);
    y += 12;

    // Student Information
    addSectionTitle('Student Information');
    addLine('Full Name', profile.personal?.fullName);
    addLine('Class & Section', `${profile.class ?? '—'} - ${profile.section ?? '—'}`);
    addLine('Roll Number', profile.rollNo);
    addLine('Admission Number', profile.admissionNo);
    addLine('Date of Birth', formatDate(profile.personal?.dob));
    addLine('Gender', profile.personal?.gender);
    addLine('Blood Group', profile.personal?.bloodGroup);
    addLine('Email', profile.personal?.email);
    addLine('Phone', profile.personal?.phone);
    addLine(
      'Address',
      `${profile.personal?.address ?? '—'}, ${profile.personal?.city ?? '—'}, ${profile.personal?.state ?? '—'} - ${profile.personal?.pincode ?? '—'}`
    );
    y += 4;

    // Academic Information
    addSectionTitle('Academic Information');
    addLine('Academic Year', profile.academic?.academicYear);
    addLine('Enrollment Date', formatDate(profile.academic?.enrollmentDate));
    addLine('Previous School', profile.academic?.previousSchool);
    y += 4;

    // Parent Information
    addSectionTitle('Parent Information');
    addLine("Father's Name", profile.father?.name);
    addLine("Father's Occupation", profile.father?.occupation);
    addLine("Father's Phone", profile.father?.phone);
    addLine("Mother's Name", profile.mother?.name);
    addLine("Mother's Occupation", profile.mother?.occupation);
    addLine("Mother's Phone", profile.mother?.phone);
    addLine(
      'Emergency Contact',
      `${profile.emergencyContact?.name ?? '—'} (${profile.emergencyContact?.relationship ?? '—'}) - ${profile.emergencyContact?.phone ?? '—'}`
    );
    y += 4;

    // Health Information
    addSectionTitle('Health Information');
    addLine('Height', profile.health?.height);
    addLine('Weight', profile.health?.weight);
    addLine('BMI', profile.health?.bmi);
    addLine('Vision', profile.health?.vision);
    addLine('Blood Group', profile.health?.bloodGroup);
    addLine('Allergies', listOrDash(profile.health?.allergies));
    addLine('Medical Conditions', listOrDash(profile.health?.medicalConditions));

    const fileName = `${(profile.personal?.fullName || 'student').replace(/\s+/g, '')}-profile.pdf`;
    doc.save(fileName);
    toast.success('Profile downloaded successfully');
  };



  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center">
          <Loader2 className="animate-spin text-[#223F74] mb-4" size={48} />
          <p className="font-black text-xs uppercase tracking-widest text-gray-500">
            Loading Student Profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-[1.75rem] p-10 shadow-sm border border-[#E7E2DB] text-center">
        <p className="text-sm font-bold text-red-500 uppercase tracking-widest">
          {error || 'No profile data found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">

      {/* Header */}
      <Heading primaryText="Student " secondaryText="Profile" size={12} />

      {/* Profile Summary Card */}
      <div className="bg-white rounded-[1.75rem] p-6 shadow-sm border border-[#E7E2DB] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex-1 min-w-0">
          <ModalProfile
            name={profile.personal?.fullName}
            subtitle={`${profile.class ?? '—'} - ${profile.section ?? '—'}`}
            meta={`Roll No: ${profile.rollNo ?? '—'}  ·  Admission No: ${profile.admissionNo ?? '—'}`}
            photoUrl={profile.photoUrl}
          />
        </div>
        <div className="flex-shrink-0">
          <Button
            text="Download Profile PDF"
            variant="secondary"
            icon={<Download size={16} />}
            onClick={handleDownloadPdf}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-[1.75rem] p-2 shadow-sm border border-[#E7E2DB] overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-150 ${isActive
                  ? 'bg-[#223F74] text-white shadow-sm'
                  : 'bg-transparent text-[#6B7280] hover:bg-[#F4F7FB] hover:text-[#223F74]'
                  }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">

        {/* PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <>
            <ModalGrid title="Contact Details" cols={2}>
              <ModalData label="Full Name" value={profile.personal?.fullName} />
              <ModalData label="Email" value={profile.personal?.email} />
              <ModalData label="Phone" value={profile.personal?.phone} />
              <ModalData label="Alternate Phone" value={profile.personal?.alternatePhone} />
            </ModalGrid>

            <ModalGrid title="Personal Details" cols={3}>
              <ModalData label="Date of Birth" value={formatDate(profile.personal?.dob)} />
              <ModalData label="Gender" value={profile.personal?.gender} />
              <ModalData label="Blood Group" value={profile.personal?.bloodGroup} />
            </ModalGrid>

            <ModalGrid title="Address" cols={2}>
              <ModalData label="Address" value={profile.personal?.address} />
              <ModalData label="City" value={profile.personal?.city} />
              <ModalData label="State" value={profile.personal?.state} />
              <ModalData label="Pincode" value={profile.personal?.pincode} />
              <ModalData label="Country" value={profile.personal?.country} />
            </ModalGrid>

            <ModalGrid title="About" cols={1}>
              <ModalData label="Bio" value={profile.personal?.bio} />
            </ModalGrid>

            <ModalGrid title="Interests & Languages" cols={2}>
              <ModalData label="Interests" value={listOrDash(profile.personal?.interests)} />
              <ModalData label="Languages Known" value={listOrDash(profile.personal?.languages)} />
            </ModalGrid>
          </>
        )}

        {/* ACADEMIC INFORMATION */}
        {activeTab === 'academic' && (
          <ModalGrid title="Academic Details" cols={2}>
            <ModalData label="Admission Number" value={profile.academic?.admissionNo} />
            <ModalData label="Roll Number" value={profile.academic?.rollNo} />
            <ModalData label="Class" value={profile.academic?.class} />
            <ModalData label="Section" value={profile.academic?.section} />
            <ModalData label="Academic Year" value={profile.academic?.academicYear} />
            <ModalData label="Enrollment Date" value={formatDate(profile.academic?.enrollmentDate)} />
            <ModalData label="Previous School" value={profile.academic?.previousSchool} />
          </ModalGrid>
        )}

        {/* PARENT INFORMATION */}
        {activeTab === 'parent' && (
          <>
            <ModalGrid title="Father" cols={2}>
              <ModalData label="Name" value={profile.father?.name} />
              <ModalData label="Occupation" value={profile.father?.occupation} />
              <ModalData
                label="Phone"
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="flex-shrink-0" />
                    {profile.father?.phone}
                  </span>
                }
              />
              <ModalData
                label="Email"
                value={
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="flex-shrink-0" />
                    {profile.father?.email}
                  </span>
                }
              />
            </ModalGrid>

            <ModalGrid title="Mother" cols={2}>
              <ModalData label="Name" value={profile.mother?.name} />
              <ModalData label="Occupation" value={profile.mother?.occupation} />
              <ModalData
                label="Phone"
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="flex-shrink-0" />
                    {profile.mother?.phone}
                  </span>
                }
              />
              <ModalData
                label="Email"
                value={
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="flex-shrink-0" />
                    {profile.mother?.email}
                  </span>
                }
              />
            </ModalGrid>

            <ModalGrid title="Emergency Contact" cols={2}>
              <ModalData label="Name" value={profile.emergencyContact?.name} />
              <ModalData label="Relationship" value={profile.emergencyContact?.relationship} />
              <ModalData label="Phone" value={profile.emergencyContact?.phone} />
              <ModalData label="Address" value={profile.emergencyContact?.address} />
            </ModalGrid>
          </>
        )}

        {/* HEALTH INFORMATION */}
        {activeTab === 'health' && (
          <>
            <ModalGrid title="Vitals" cols={3}>
              <ModalData label="Height" value={profile.health?.height} />
              <ModalData label="Weight" value={profile.health?.weight} />
              <ModalData label="BMI" value={profile.health?.bmi} />
            </ModalGrid>

            <ModalGrid title="Examinations" cols={2}>
              <ModalData label="Vision" value={profile.health?.vision} />
              <ModalData label="Dental Information" value={profile.health?.dental} />
              <ModalData label="Blood Group" value={profile.health?.bloodGroup} />
            </ModalGrid>

            <ModalGrid title="Medical Notes" cols={2}>
              <ModalData label="Allergies" value={listOrDash(profile.health?.allergies)} />
              <ModalData label="Medical Conditions" value={listOrDash(profile.health?.medicalConditions)} />
            </ModalGrid>
          </>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="bg-white rounded-[1.75rem] p-6 shadow-sm border border-[#E7E2DB]">
            {profile.achievements && profile.achievements.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {profile.achievements.map((ach, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#F59B87]/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F8EEE9] text-[#F59B87] flex items-center justify-center">
                      <Award size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#223F74] leading-snug">{ach.title}</p>
                      {ach.date && (
                        <p className="text-xs font-semibold text-[#6B7280] mt-1">{formatDate(ach.date)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Award size={56} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-black text-gray-300 uppercase tracking-tighter">
                  No Achievements Yet
                </h3>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">
                  Achievements will appear here once recorded by the school
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentProfile;