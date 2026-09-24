import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Monitor, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import BackgroundDoodles from '../components/BackgroundDoodles';
import Hero from '../components/Hero';
import FeatureBar from '../components/FeatureBar';

// Lazily loaded components (Below the fold)
const Operations = lazy(() => import('../components/Operations'));
const ComprehensiveModules = lazy(() => import('../components/ComprehensiveModules'));
const Stakeholders = lazy(() => import('../components/Stakeholders'));
const Testimonials = lazy(() => import('../components/Testimonials'));
const Footer = lazy(() => import('../components/Footer'));
const SchoolGroups = lazy(() => import('../components/SchoolGroups'));
const CommandCenter = lazy(() => import('../components/CommandCenter'));
const AiIntelligence = lazy(() => import('../components/AiIntelligence'));

export default function LandingPage({ onNavigateRegister, onNavigateLogin }) {
  const [showNotice, setShowNotice] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let targetId = '';
    if (location.state && location.state.scrollTo) {
      targetId = location.state.scrollTo;
    } else if (location.hash) {
      targetId = location.hash.replace('#', '');
    }

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location]);

  useEffect(() => {
    // Proportional desktop scaling listener for mobile viewports
    const handleScale = () => {
      const targetWidth = 1200;
      if (window.innerWidth < targetWidth) {
        const factor = window.innerWidth / targetWidth;
        document.documentElement.style.setProperty('--landing-scale', factor.toString());
      } else {
        document.documentElement.style.setProperty('--landing-scale', '1');
      }
    };

    handleScale();
    window.addEventListener('resize', handleScale);
    return () => window.removeEventListener('resize', handleScale);
  }, []);

  useEffect(() => {
    const hasSeenLocal = localStorage.getItem('hasSeenDesktopNotice') === 'true';
    if (hasSeenLocal) return;

    let timer = null;

    const checkMobileAndShow = () => {
      const isMobile = window.innerWidth < 768;
      const alreadyShownSession = sessionStorage.getItem('hasShownDesktopNoticeSession') === 'true';

      if (isMobile && !alreadyShownSession) {
        if (!timer) {
          timer = setTimeout(() => {
            setShowNotice(true);
            sessionStorage.setItem('hasShownDesktopNoticeSession', 'true');
          }, 1000);
        }
      } else {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    };

    // Run initial check
    checkMobileAndShow();

    // Check again dynamically if viewport is resized or rotated
    window.addEventListener('resize', checkMobileAndShow);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', checkMobileAndShow);
    };
  }, []);

  const handleDismissNotice = () => {
    setShowNotice(false);
    localStorage.setItem('hasSeenDesktopNotice', 'true');
  };

  return (
    <div className="app-root" style={{ position: 'relative', overflow: 'hidden' }}>
      <Navbar onNavigateRegister={onNavigateRegister} onNavigateLogin={onNavigateLogin} />
      <BackgroundDoodles />
      
      {/* Hero rendered outside scaling wrapper so it is 100% naturally responsive */}
      <Hero onNavigateRegister={onNavigateRegister} />

      {/* Desktop Scaled Viewport Container for Below-Hero Sections */}
      <div className="desktop-scale-wrapper">
        <main className="desktop-scale-content">
          <FeatureBar />
          <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="loader">Loading...</div></div>}>
            <Operations />
            <ComprehensiveModules />
            <Stakeholders />
            <AiIntelligence />
            <SchoolGroups />
            <CommandCenter />
            <Testimonials />
            <Footer />
          </Suspense>
        </main>
      </div>

      {/* First-Time Mobile Popup Notice (Only shown once on LandingPage) */}
      {showNotice && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-4 z-[999] transition-all animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Monitor size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Best Viewed on Desktop</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                For the best experience, we recommend viewing Graphura on a desktop or laptop.
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismissNotice}
            className="w-8 h-8 min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close message"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
