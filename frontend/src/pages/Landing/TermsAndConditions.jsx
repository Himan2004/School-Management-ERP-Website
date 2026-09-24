import React, { useState, useEffect } from 'react';
import { 
  ChevronUp, Scale, ShieldCheck, CreditCard, UserCheck, 
  AlertCircle, FileText, Lock, CheckCircle2, Ban, Trash2
} from 'lucide-react';

const TermsAndConditions = () => {
  const [activeSection, setActiveSection] = useState('acceptance');

  // Dynamic Date Function
  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
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

  const sections = [
    { id: 'acceptance', title: 'Acceptance', icon: <UserCheck size={18} /> },
    { id: 'services', title: 'Scope of Service', icon: <Scale size={18} /> },
    { id: 'security', title: 'Account Security', icon: <Lock size={18} /> },
    { id: 'responsibility', title: 'School Duty', icon: <FileText size={18} /> },
    { id: 'usage', title: 'Usage Policy', icon: <Ban size={18} /> },
    { id: 'termination', title: 'Termination', icon: <Trash2 size={18} /> },
    { id: 'liability', title: 'Liability', icon: <ShieldCheck size={18} /> },
  ];

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      {/* Premium Header */}
      <header className="relative bg-gradient-to-r from-slate-800 to-sky-700 py-20 px-6 overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-sky-700" />
        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Terms & Conditions</h1>
          <p className="text-slate-400 text-lg leading-relaxed">Guidelines and Legal Agreement for our School ERP SaaS Platform.</p>
          
          {/* Dynamic Date Badge */}
          <div className="mt-6 inline-block bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-indigo-300 text-sm font-medium border border-white/10 transition-all hover:bg-white/20">
            Last Updated: {currentFormattedDate}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-12">
        {/* Sticky Sidebar */}
        <aside className="lg:w-1/4">
          <div className="sticky top-12 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Navigation</p>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeSection === section.id 
                  ? 'bg-white  shadow-md border border-slate-200 translate-x-1' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {section.icon}
                <span className="font-semibold text-sm">{section.title}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:w-3/4 space-y-16">
          
          {/* 1. Acceptance */}
          <section id="acceptance" className="scroll-mt-12 group">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 transition-colors">1. Acceptance of Terms</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-slate-600 leading-relaxed">
              By registering on the platform, the school agrees to follow all the terms and policies mentioned. 
              The terms and conditions may be updated from time to time, and continued use of the platform means 
              acceptance of the updated terms.
            </div>
          </section>

          {/* 2. Services */}
          <section id="services" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 ">2. Description of Services</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
              
                <p className="text-slate-700 font-medium leading-snug">Platform helps schools manage students, teachers, attendance, and communication.</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
             
                <p className="text-slate-700 font-medium leading-snug">Automation of academic records and administrative workflows.</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 italic flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" /> Note: Platform may be unavailable during updates or maintenance.
            </p>
          </section>

          {/* 3. Account Security */}
          <section id="security" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">3. Account Security</h2>
            <div className="space-y-4 text-slate-600  ">
      
                <p className="text-black leading-relaxed">
                  <strong>Credential Privacy:</strong> Each administrator is responsible for maintaining the confidentiality of their login credentials.
                </p>
              </div>
              <br />
              <p className="pl-2">Users must not attempt to access data belonging to other schools or interfere with system security protocols.</p>
         
          </section>

          {/* 4. Responsibility */}
          <section id="responsibility" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">4. School Responsibility</h2>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl text-slate-600 shadow-sm">
              Schools are solely responsible for the accuracy of the information they upload. Any legal or academic 
              discrepancy arising from incorrect data entry is the school's responsibility.
            </div>
          </section>

          {/* 5. Usage Policy */}
          <section id="usage" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">5. Prohibited Usage</h2>
            <div className="bg-white p-7 rounded-3xl border border-slate-100 text-slate-600 leading-relaxed">
              <p className="flex items-start gap-2">
                The platform should not be used for any illegal, harmful, or unauthorized activities. Misuse 
                includes any attempt to bypass system limits or hack administrative features.
              </p>
            </div>
          </section>

          {/* 6. Termination */}
          <section id="termination" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">6. Termination of Service</h2>
            <div className="space-y-4 text-slate-600 bg-white p-8 rounded-3xl border border-slate-200">
              <p className="font-semibold text-slate-800">We reserve the right to suspend or terminate accounts that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate these terms or misuse the system.</li>
                <li>Fail to pay subscription fees within the billing cycle.</li>
                <li>Engage in illegal usage of platform features.</li>
              </ul>
            </div>
          </section>

          {/* 7. Liability */}
          <section id="liability" className="scroll-mt-12 pb-20">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 text-slate-800">7. Limitation of Liability</h2>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm leading-relaxed text-slate-600 space-y-4">
              <p className="flex items-start gap-3">
            
                The platform owners are not responsible for data loss caused by incorrect use, 
                server outages, or unauthorized access resulting from the school's compromised credentials.
              </p>
              <p >
                In no event shall our team be liable for any indirect, incidental, or consequential damages 
                arising out of your use of the platform.
              </p>
            </div>
          </section>

        </main>
      </div>

      {/* Scroll to Top */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 p-4 bg-gradient-to-r from-slate-800 to-sky-700 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all z-50 active:scale-95 group"
      >
        <ChevronUp size={24} className="group-hover:animate-bounce" />
      </button>
    </div>
  );
};

export default TermsAndConditions;