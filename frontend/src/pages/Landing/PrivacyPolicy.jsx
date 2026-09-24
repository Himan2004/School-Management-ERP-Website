import React, { useState, useEffect } from 'react';
import { 
  ChevronUp, ShieldCheck, Eye, Database, Lock, 
  Share2, UserCircle, Mail, Info, CheckCircle2, AlertCircle, Cookie, Edit3
} from 'lucide-react';

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState('collection');

  // Dynamic Date Function
  const currentFormattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      const sectionIds = ['collection', 'usage', 'security', 'sharing', 'ownership', 'cookies', 'students', 'breach', 'corrections', 'contact'];
      
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
    { id: 'collection', title: 'Data Collection', icon: <Database size={18} /> },
    { id: 'usage', title: 'Purpose of Use', icon: <Eye size={18} /> },
    { id: 'security', title: 'Data Protection', icon: <Lock size={18} /> },
    { id: 'sharing', title: 'Third-Party Policy', icon: <Share2 size={18} /> },
    { id: 'ownership', title: 'Data Ownership', icon: <ShieldCheck size={18} /> },
    { id: 'cookies', title: 'Cookies & Tech', icon: <Cookie size={18} /> },
    { id: 'students', title: 'Student Privacy', icon: <UserCircle size={18} /> },
    { id: 'corrections', title: 'Corrections', icon: <Edit3 size={18} /> },
    { id: 'contact', title: 'Support', icon: <Mail size={18} /> },
  ];

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100">
      {/* Premium Header - Emerald/Teal Theme */}
      <header className="relative bg-gradient-to-r from-slate-800 to-sky-700 py-20 px-6 overflow-hidden text-center">
        
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-sky-700 opacity-90" />
        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-100 text-lg leading-relaxed">How we collect, protect, and manage your institutional data.</p>
          
          <div className="mt-6 inline-block bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-slate-200 text-sm font-medium border border-white/10 transition-all hover:bg-white/20">
            Last Updated: {currentFormattedDate}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-12">
        {/* Sticky Sidebar */}
        <aside className="lg:w-1/4">
          <div className="sticky top-12 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Privacy Manual</p>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeSection === section.id 
                  ? 'bg-white shadow-md border border-slate-200 translate-x-1 ' 
                  : 'text-slate-500  hover:bg-slate-100'
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
          
          {/* 1. Collection */}
          <section id="collection" className="scroll-mt-12 group">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">1. Information Collection</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-slate-600 leading-relaxed">
              We collect information essential for school operations, including <strong>school details, administrator information, student data, teacher records,</strong> and system usage data to ensure a seamless experience.
            </div>
          </section>

          {/* 2. Usage */}
          <section id="usage" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">2. Use of Information</h2>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl text-slate-600 shadow-sm">
              The collected information is used exclusively to <strong>operate, maintain, and improve</strong> the school management platform, ensuring high performance and relevant feature updates for your institution.
            </div>
          </section>

          {/* 3. Data Protection (White Border Card Style) */}
          <section id="security" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">3. Data Security & Storage</h2>
            <div className="bg-white border-2 border-white shadow-sm rounded-[2.5rem] p-8 md:p-10">
              <div className="space-y-4 text-slate-600">
                <p className="text-black leading-relaxed">
                  <strong>Secure Storage:</strong> All school data is stored securely using enterprise-grade encryption and is strictly protected from unauthorized access.
                </p>
                <div className="h-px bg-slate-100 w-full my-4" />
                <p className="flex items-center gap-2 text-sm italic">
                  <ShieldCheck size={16} className="text-emerald-500" /> 
                  We implement reasonable security measures to safeguard against data breaches.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Sharing */}
          <section id="sharing" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">4. Third-Party Sharing</h2>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl text-slate-600 shadow-sm leading-relaxed">
              We <strong>do not sell or share</strong> school data with third parties without explicit permission, except when legally required by law enforcement or regulatory authorities.
            </div>
          </section>

          {/* 5. Ownership */}
          <section id="ownership" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">5. Data Ownership</h2>
            <div className="bg-white p-8 rounded-3xl border border-white text-slate-900 font-medium">
              <div className="flex items-center gap-3 mb-2">
               
                <span className="text-lg font-bold">Institutions Retain Ownership</span>
              </div>
              Schools retain full ownership of all their data stored on the platform at all times.
            </div>
          </section>

          {/* 6. Cookies */}
          <section id="cookies" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">6. Cookies & Technology</h2>
            <div className="bg-white p-7 rounded-3xl border border-slate-100 text-slate-600 leading-relaxed">
              The platform may use cookies or similar tracking technologies to improve user experience, remember preferences, and analyze system performance.
            </div>
          </section>

          {/* 7. Student Data */}
          <section id="students" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">7. Student Data & Consent</h2>
            <div className="space-y-4 text-slate-600 bg-white p-8 rounded-3xl border border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={20} /> Special Handling Protocol:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Student data is handled with extra layers of privacy and care.</li>
                <li>Schools are responsible for ensuring proper consent from parents/guardians where required by law.</li>
              </ul>
            </div>
          </section>

          {/* 8. Corrections */}
          <section id="corrections" className="scroll-mt-12">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">8. Data Accuracy</h2>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-slate-600">
              Transparency is key. Users can request <strong>corrections</strong> to their information at any time if they find any stored details to be incorrect or outdated.
            </div>
          </section>

          {/* 9. Contact */}
          <section id="contact" className="scroll-mt-12 pb-20">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">9. Privacy Support</h2>
            <div className="bg-white p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h4 className="text-xl font-bold mb-2 text-slate-600">Have questions?</h4>
                <p className="text-slate-600">Our privacy team is here to help with your concerns.</p>
              </div>
              <button className="px-8 py-4 bg-gradient-to-r from-slate-800 to-sky-700 hover:bg-emerald-500 rounded-2xl font-bold transition-all flex items-center gap-2">
                <Mail size={18} /> Contact Support
              </button>
            </div>
          </section>

        </main>
      </div>

      {/* Scroll to Top */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 p-4 bg-gradient-to-r from-slate-800 to-sky-700 text-white rounded-full shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all z-50 active:scale-95 group"
      >
        <ChevronUp size={24} className="group-hover:animate-bounce" />
      </button>
    </div>
  );
};

export default PrivacyPolicy;