import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Scale, ShieldCheck, AlertCircle, Download, FileText,
  Database, Mail, LoaderCircle
} from 'lucide-react';

// ─── Loading State ──────────────────────────────────────────────────────────
const PageLoader = ({ label }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <LoaderCircle className="w-8 h-8 animate-spin text-[#223F74]" />
    <span className="ml-3 font-semibold text-slate-500">{label}</span>
  </div>
);

// ─── Section Nav ────────────────────────────────────────────────────────────
const SectionNav = ({ items, active, icon: Icon, title }) => (
  <div className="rounded-[2rem] border border-[#E7E2DB] bg-white p-5 shadow-sm">
    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm border-b border-[#E7E2DB] pb-2">
      <Icon size={16} className="text-[#223F74]" /> {title}
    </h3>
    <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`px-3 py-2.5 rounded-xl text-[10px] md:text-xs font-bold text-center transition-all duration-200 border ${
            active === item.id
              ? 'bg-[#223F74] text-white border-[#223F74]'
              : 'text-slate-500 bg-[#F8EEE9] border-[#E7E2DB] hover:text-[#223F74] hover:border-[#223F74]'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  </div>
);

// ─── Policy Documents Block ─────────────────────────────────────────────────
const PolicyDocuments = ({ policies }) => (
  <div className="border-t border-[#E7E2DB] pt-8">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-6 bg-[#F59B87] rounded-full" />
      <h2 className="text-xl font-black text-slate-800">Official Policy Documents</h2>
    </div>
    <p className="text-slate-400 text-sm mb-4">Policies uploaded by HQ Admin &amp; School Management</p>

    {policies.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <div
            key={policy._id}
            className="rounded-2xl border border-[#E7E2DB] bg-white p-4 flex items-center justify-between hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#223F74] text-white p-2.5 rounded-xl">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{policy.policyName}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Uploaded {new Date(policy.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {policy.pdfFile && (
              <button
                onClick={() => window.open(policy.pdfFile, '_blank')}
                className="bg-[#223F74] text-white p-2.5 rounded-xl hover:bg-[#1a3360] transition-all"
                title="Download Policy"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-[#E7E2DB] bg-[#F8EEE9] p-8 text-center">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No official policy documents uploaded yet.</p>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TERMS & CONDITIONS TAB
// ═══════════════════════════════════════════════════════════════════════════
const TermsTab = ({ policies }) => {
  const [termsData, setTermsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('acceptance');

  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v1/terms-and-conditions');
        if (response.data) setTermsData(response.data);
      } catch (err) {
        console.error('Failed to load terms:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      const ids = ['acceptance', 'services', 'security', 'responsibility', 'usage', 'termination', 'liability'];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPosition) setActiveSection(id);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return <PageLoader label="Loading terms & conditions..." />;

  const navItems = [
    { id: 'acceptance', label: '1. Acceptance' },
    { id: 'services', label: '2. Services' },
    { id: 'security', label: '3. Security' },
    { id: 'responsibility', label: '4. Responsibility' },
    { id: 'usage', label: '5. Usage' },
    { id: 'termination', label: '6. Termination' },
    { id: 'liability', label: '7. Liability' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#223F74] py-8 rounded-[2rem] px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Terms &amp; Conditions</h2>
          <p className="text-white/70 text-sm">Guidelines and Legal Agreement for our School ERP Platform.</p>
          <div className="mt-4 inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10">
            Last Updated: {termsData?.lastUpdated || currentFormattedDate}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <SectionNav items={navItems} active={activeSection} icon={Scale} title="Table of Contents" />

      {/* Sections */}
      <div className="max-w-5xl mx-auto space-y-8">
        <section id="acceptance" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">1. Acceptance of Terms</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E7E2DB] text-slate-600 leading-relaxed text-sm">
            {termsData?.acceptanceText ||
              'By accessing the platform, you agree to follow all terms and policies mentioned here. The terms may be updated from time to time, and continued use means acceptance of any changes.'}
          </div>
        </section>

        <section id="services" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">2. Description of Services</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <div className="p-5 bg-[#F8EEE9] border border-[#E7E2DB] rounded-2xl">
              <p className="text-slate-700 font-medium text-sm">
                The platform helps schools manage students, teachers, attendance, and communication.
              </p>
            </div>
            <div className="p-5 bg-[#F8EEE9] border border-[#E7E2DB] rounded-2xl">
              <p className="text-slate-700 font-medium text-sm">
                Automation of academic records and administrative workflows.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic flex items-center gap-2">
            <AlertCircle size={14} className="text-[#F59B87]" />
            Note: Platform may be unavailable during updates or maintenance.
          </p>
        </section>

        <section id="security" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">3. Account Security</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            <p className="text-slate-700">
              <strong>Credential Privacy:</strong> Each user is responsible for maintaining the confidentiality of their login credentials.
            </p>
            <p>Users must not attempt to access data belonging to other accounts or interfere with system security protocols.</p>
          </div>
        </section>

        <section id="responsibility" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">4. User Responsibility</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-slate-600 text-sm">
            Users are responsible for providing accurate information. Any legal or academic discrepancy arising from incorrect data entry is the user&apos;s responsibility.
          </div>
        </section>

        <section id="usage" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">5. Prohibited Usage</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-slate-600 text-sm">
            The platform should not be used for any illegal, harmful, or unauthorized activities. Misuse includes any attempt to bypass system limits or access administrative features without authorization.
          </div>
        </section>

        <section id="termination" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">6. Termination of Access</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Access may be suspended or terminated for accounts that:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Violate these terms or misuse the system.</li>
              <li>Engage in unauthorized access of platform features.</li>
              <li>Use the platform for illegal purposes.</li>
            </ul>
          </div>
        </section>

        <section id="liability" className="scroll-mt-24 pb-6">
          <h2 className="text-xl font-bold mb-3 text-slate-800">7. Limitation of Liability</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600 space-y-3">
            <p>The platform owners are not responsible for data loss caused by incorrect use, server outages, or unauthorized access resulting from compromised credentials.</p>
            <p>In no event shall our team be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.</p>
          </div>
        </section>

        <PolicyDocuments policies={policies} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRIVACY POLICY TAB
// ═══════════════════════════════════════════════════════════════════════════
const PrivacyTab = ({ policies }) => {
  const [policyData, setPolicyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('collection');

  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v1/privacy-policy');
        if (response.data) setPolicyData(response.data);
      } catch (err) {
        console.error('Failed to load privacy policy:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      const ids = ['collection', 'usage', 'security', 'sharing', 'ownership', 'cookies', 'students', 'corrections', 'contact'];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPosition) setActiveSection(id);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return <PageLoader label="Loading privacy policy..." />;

  const navItems = [
    { id: 'collection', label: '1. Collection' },
    { id: 'usage', label: '2. Usage' },
    { id: 'security', label: '3. Security' },
    { id: 'sharing', label: '4. Sharing' },
    { id: 'ownership', label: '5. Ownership' },
    { id: 'cookies', label: '6. Cookies' },
    { id: 'students', label: '7. Consent' },
    { id: 'corrections', label: '8. Accuracy' },
    { id: 'contact', label: '9. Support' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#223F74] py-8 rounded-[2rem] px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Privacy Policy</h2>
          <p className="text-white/70 text-sm">How we collect, protect, and manage your data.</p>
          <div className="mt-4 inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10">
            Last Updated: {policyData?.lastUpdated || currentFormattedDate}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <SectionNav items={navItems} active={activeSection} icon={ShieldCheck} title="Quick Navigation" />

      {/* Sections */}
      <div className="max-w-5xl mx-auto space-y-8">
        <section id="collection" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">1. Information Collection</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E7E2DB] text-slate-600 leading-relaxed text-sm">
            {policyData?.collectionText || (
              <>We collect information essential for school operations, including <strong>school details, administrator information, student data, teacher records,</strong> and system usage data to ensure a seamless experience.</>
            )}
          </div>
        </section>

        <section id="usage" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">2. Use of Information</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600">
            The collected information is used exclusively to <strong>operate, maintain, and improve</strong> the school management platform, ensuring high performance and relevant feature updates.
          </div>
        </section>

        <section id="security" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">3. Data Security &amp; Storage</h2>
          <div className="bg-white border border-[#E7E2DB] shadow-sm rounded-2xl p-6">
            <div className="space-y-3 text-sm text-slate-600">
              <p className="text-slate-700">
                <strong>Secure Storage:</strong> All data is stored securely using enterprise-grade encryption and strictly protected from unauthorized access.
              </p>
              <div className="h-px bg-[#E7E2DB]" />
              <p className="flex items-center gap-2 text-xs text-[#223F74] italic font-medium">
                <ShieldCheck size={14} className="text-[#F59B87]" />
                We implement reasonable security measures to safeguard against data breaches.
              </p>
            </div>
          </div>
        </section>

        <section id="sharing" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">4. Third-Party Sharing</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600 leading-relaxed">
            We <strong>do not sell or share</strong> your data with third parties without explicit permission, except when legally required by law enforcement or regulatory authorities.
          </div>
        </section>

        <section id="ownership" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">5. Data Ownership</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Database className="text-[#223F74]" size={18} />
              <span className="text-sm font-bold text-slate-800">Institutions Retain Ownership</span>
            </div>
            <p className="text-sm text-slate-600">Schools retain full ownership of all their data stored on the platform at all times.</p>
          </div>
        </section>

        <section id="cookies" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">6. Cookies &amp; Technology</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600">
            The platform may use cookies or similar tracking technologies to improve user experience, remember preferences, and analyze system performance.
          </div>
        </section>

        <section id="students" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">7. Student Data &amp; Consent</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-[#F59B87]" size={16} /> Special Handling Protocol:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Student data is handled with extra layers of privacy and care.</li>
              <li>Schools are responsible for ensuring proper consent from parents/guardians where required by law.</li>
            </ul>
          </div>
        </section>

        <section id="corrections" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">8. Data Accuracy</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600">
            Transparency is key. You can request <strong>corrections</strong> to your information at any time if any stored details are incorrect or outdated.
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 pb-6">
          <h2 className="text-xl font-bold mb-3 text-slate-800">9. Privacy Support</h2>
          <div className="bg-white border border-[#E7E2DB] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Have questions about your data?</h4>
              <p className="text-slate-500 text-xs">Reach out to your school administration for privacy-related concerns.</p>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 bg-[#F8EEE9] rounded-2xl border border-[#E7E2DB]">
              <Mail size={16} className="text-[#223F74]" />
              <span className="text-sm font-bold text-[#223F74]">Contact School Admin</span>
            </div>
          </div>
        </section>

        <PolicyDocuments policies={policies} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const StudentTermsAndPrivacy = () => {
  const [activeTab, setActiveTab] = useState('terms');
  const [policies, setPolicies] = useState([]);

  // Fetch shared policy documents once — used by both tabs
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await api.get('/v1/policies');
        if (response.data?.success) {
          setPolicies(response.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch official policies:", error);
      }
    };
    fetchPolicies();
  }, []);

  const tabs = [
    { id: 'terms', label: 'Terms & Conditions', icon: Scale },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Legal &amp; Policies</h1>
        <p className="text-sm text-gray-500 mt-1">Review the terms of use and privacy guidelines for this platform.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === id
                ? 'bg-[#223F74] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'terms' && <TermsTab policies={policies} />}
      {activeTab === 'privacy' && <PrivacyTab policies={policies} />}
    </div>
  );
};

export default StudentTermsAndPrivacy;
