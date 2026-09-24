import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Scale, AlertCircle, Download, FileText, LoaderCircle
} from 'lucide-react';

const TermsAndConditions = () => {
  const [activeSection, setActiveSection] = useState('acceptance');
  const [termsData, setTermsData] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v1/terms-and-conditions');
        if (response.data) {
          setTermsData(response.data);
        }
      } catch (error) {
        console.error("Backend connection failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
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
      const sectionIds = ['acceptance', 'services', 'security', 'responsibility', 'usage', 'termination', 'liability'];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-3 font-semibold text-slate-500">Loading terms & conditions...</span>
      </div>
    );
  }

  const navItems = [
    { id: 'acceptance', label: '1. Acceptance' },
    { id: 'services', label: '2. Services' },
    { id: 'security', label: '3. Security' },
    { id: 'responsibility', label: '4. Responsibility' },
    { id: 'usage', label: '5. Usage' },
    { id: 'termination', label: '6. Termination' },
    { id: 'liability', label: '7. Liability' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#223F74] py-8 rounded-[2rem] px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Terms & Conditions</h1>
          <p className="text-white/70 text-sm">Guidelines and Legal Agreement for our School ERP Platform.</p>
          <div className="mt-4 inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10">
            Last Updated: {termsData?.lastUpdated || currentFormattedDate}
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="rounded-[2rem] border border-[#E7E2DB] bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm border-b border-[#E7E2DB] pb-2">
          <Scale size={16} className="text-[#223F74]" /> Table of Contents
        </h3>
        <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
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
        <section id="acceptance" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">1. Acceptance of Terms</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E7E2DB] text-slate-600 leading-relaxed text-sm">
            {termsData?.acceptanceText || "By registering on the platform, the school agrees to follow all the terms and policies mentioned. The terms and conditions may be updated from time to time, and continued use of the platform means acceptance of the updated terms."}
          </div>
        </section>

        <section id="services" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">2. Description of Services</h2>
          {termsData?.servicesText ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E7E2DB] text-slate-600 text-sm">
              {termsData.servicesText}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4 mb-3">
                <div className="p-5 bg-[#F8EEE9] border border-[#E7E2DB] rounded-2xl">
                  <p className="text-slate-700 font-medium text-sm">Platform helps schools manage students, teachers, attendance, and communication.</p>
                </div>
                <div className="p-5 bg-[#F8EEE9] border border-[#E7E2DB] rounded-2xl">
                  <p className="text-slate-700 font-medium text-sm">Automation of academic records and administrative workflows.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic flex items-center gap-2">
                <AlertCircle size={14} className="text-[#F59B87]" /> Note: Platform may be unavailable during updates or maintenance.
              </p>
            </>
          )}
        </section>

        <section id="security" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">3. Account Security</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            {termsData?.securityText ? (
              <p>{termsData.securityText}</p>
            ) : (
              <>
                <p className="text-slate-700"><strong>Credential Privacy:</strong> Each administrator is responsible for maintaining the confidentiality of their login credentials.</p>
                <p>Users must not attempt to access data belonging to other schools or interfere with system security protocols.</p>
              </>
            )}
          </div>
        </section>

        <section id="responsibility" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">4. School Responsibility</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-slate-600 text-sm">
            {termsData?.responsibilityText || "Schools are solely responsible for the accuracy of the information they upload. Any legal or academic discrepancy arising from incorrect data entry is the school's responsibility."}
          </div>
        </section>

        <section id="usage" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">5. Prohibited Usage</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-slate-600 text-sm">
            {termsData?.usageText || "The platform should not be used for any illegal, harmful, or unauthorized activities. Misuse includes any attempt to bypass system limits or hack administrative features."}
          </div>
        </section>

        <section id="termination" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3 text-slate-800">6. Termination of Service</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm space-y-3 text-sm text-slate-600">
            {termsData?.terminationText ? (
              <p>{termsData.terminationText}</p>
            ) : (
              <>
                <p className="font-semibold text-slate-800">We reserve the right to suspend or terminate accounts that:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>Violate these terms or misuse the system.</li>
                  <li>Fail to pay subscription fees within the billing cycle.</li>
                  <li>Engage in illegal usage of platform features.</li>
                </ul>
              </>
            )}
          </div>
        </section>

        <section id="liability" className="scroll-mt-24 pb-6">
          <h2 className="text-xl font-bold mb-3 text-slate-800">7. Limitation of Liability</h2>
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2DB] shadow-sm text-sm text-slate-600 space-y-3">
            {termsData?.liabilityText ? (
              <p>{termsData.liabilityText}</p>
            ) : (
              <>
                <p>The platform owners are not responsible for data loss caused by incorrect use, server outages, or unauthorized access resulting from the school&apos;s compromised credentials.</p>
                <p>In no event shall our team be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.</p>
              </>
            )}
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

export default TermsAndConditions;
