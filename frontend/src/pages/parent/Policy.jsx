import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Database, Mail, AlertCircle, FileText, Download, LoaderCircle
} from 'lucide-react';
import { selectParent } from '../../features/auth/parentAuthSlice';

const PrivacyPolicy = () => {
  const parent = useSelector(selectParent);
  const [activeSection, setActiveSection] = useState('collection');
  const [policyData, setPolicyData] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v1/privacy-policy');
        if (response.data) {
          setPolicyData(response.data);
        }
      } catch (error) {
        console.error("Backend connectivity error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrivacyPolicy();
  }, []);

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

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      const sectionIds = ['collection', 'usage', 'security', 'sharing', 'ownership', 'cookies', 'students', 'corrections', 'contact'];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContactSupport = () => {
    const schoolEmail = parent?.school?.officialEmail;
    if (!schoolEmail) {
      toast.error("No contact details found");
      return;
    }
    const mailtoUrl = `mailto:${schoolEmail}?subject=${encodeURIComponent("Privacy Support Request")}`;
    try {
      window.open(mailtoUrl, "_self");
    } catch {
      navigator.clipboard.writeText(schoolEmail);
      toast.success(`Support email copied: ${schoolEmail}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-3 font-semibold text-slate-500">Loading privacy policy...</span>
      </div>
    );
  }

  const navItems = [
    { id: 'collection', label: '1. Collection' },
    { id: 'usage', label: '2. Usage' },
    { id: 'security', label: '3. Security' },
    { id: 'sharing', label: '4. Sharing' },
    { id: 'ownership', label: '5. Ownership' },
    { id: 'cookies', label: '6. Cookies' },
    { id: 'students', label: '7. Consent' },
    { id: 'corrections', label: '8. Accuracy' },
    { id: 'contact', label: '9. Support' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#223F74] py-8 rounded-[2rem] px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-white/70 text-sm">How we collect, protect, and manage your institutional data.</p>
          <div className="mt-4 inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10">
            Last Updated: {policyData?.lastUpdated || currentFormattedDate}
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="rounded-[2rem] border border-[#E7E2DB] bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm border-b border-[#E7E2DB] pb-2">
          <ShieldCheck size={16} className="text-[#223F74]" /> Quick Navigation
        </h3>
        <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`px-3 py-2.5 rounded-xl text-[10px] md:text-xs font-bold text-center transition-all duration-200 border ${
                activeSection === item.id
                  ? 'bg-[#223F74] text-white border-[#223F74]'
                  : 'text-slate-500 bg-[#F8EEE9] border-[#E7E2DB] hover:text-[#223F74] hover:border-[#223F74]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Main Content */}
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
            {policyData?.usageText || <>The collected information is used exclusively to <strong>operate, maintain, and improve</strong> the school management platform, ensuring high performance and relevant feature updates for your institution.</>}
          </div>
        </section>

        <section id="security" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">3. Data Security & Storage</h2>
          <div className="bg-white border border-[#E7E2DB] shadow-sm rounded-2xl p-6">
            <div className="space-y-3 text-sm text-slate-600">
              <p className="text-slate-700">{policyData?.securityText || <><strong>Secure Storage:</strong> All school data is stored securely using enterprise-grade encryption and is strictly protected from unauthorized access.</>}</p>
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
            {policyData?.sharingText || <>We <strong>do not sell or share</strong> school data with third parties without explicit permission, except when legally required by law enforcement or regulatory authorities.</>}
          </div>
        </section>

        <section id="ownership" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">5. Data Ownership</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Database className="text-[#223F74]" size={18} />
              <span className="text-sm font-bold text-slate-800">Institutions Retain Ownership</span>
            </div>
            <p className="text-sm text-slate-600">{policyData?.ownershipText || "Schools retain full ownership of all their data stored on the platform at all times."}</p>
          </div>
        </section>

        <section id="cookies" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">6. Cookies & Technology</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600">
            {policyData?.cookiesText || "The platform may use cookies or similar tracking technologies to improve user experience, remember preferences, and analyze system performance."}
          </div>
        </section>

        <section id="students" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">7. Student Data & Consent</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-[#F59B87]" size={16} /> Special Handling Protocol:
            </p>
            {policyData?.consentText ? (
              <p>{policyData.consentText}</p>
            ) : (
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Student data is handled with extra layers of privacy and care.</li>
                <li>Schools are responsible for ensuring proper consent from parents/guardians where required by law.</li>
              </ul>
            )}
          </div>
        </section>

        <section id="corrections" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">8. Data Accuracy</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600">
            {policyData?.accuracyText || <>Transparency is key. Users can request <strong>corrections</strong> to their information at any time if they find any stored details to be incorrect or outdated.</>}
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 pb-6">
          <h2 className="text-xl font-bold mb-3 text-slate-800">9. Privacy Support</h2>
          <div className="bg-white border border-[#E7E2DB] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Have questions?</h4>
              <p className="text-slate-500 text-xs">{policyData?.supportText || "Our privacy team is here to help with your concerns."}</p>
            </div>
            <button
              onClick={handleContactSupport}
              className="px-6 py-3 bg-[#223F74] hover:bg-[#1a3360] text-white rounded-2xl font-bold transition-all flex items-center gap-2 text-sm"
            >
              <Mail size={16} /> Contact Support
            </button>
          </div>
        </section>

        {/* ── HQ Admin & Principal Policy Documents ── */}
        <div className="border-t border-[#E7E2DB] pt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-[#F59B87] rounded-full" />
            <h2 className="text-xl font-black text-slate-800">Official Policy Documents</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Policies uploaded by HQ Admin & School Management</p>

          {policies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <div key={policy._id} className="rounded-2xl border border-[#E7E2DB] bg-white p-4 flex items-center justify-between hover:shadow-md transition-all">
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
                      onClick={() => window.open(policy.pdfFile, "_blank")}
                      className="bg-[#223F74] text-white p-2.5 rounded-xl hover:bg-[#1a3360] transition-all"
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
      </div>
    </div>
  );
};

export default PrivacyPolicy;
