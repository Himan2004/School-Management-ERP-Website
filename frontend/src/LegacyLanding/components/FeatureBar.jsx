import React, { memo } from 'react';
import { Square, CheckCircle2, Laptop, LayoutGrid, Shield, LineChart, Cloud, Headset, Award, Zap } from 'lucide-react';
import './FeatureBar.css';

const FeatureBar = memo(function FeatureBar() {
  const features = [
    {
      id: 1,
      title: 'Smart Attendance',
      icon: <Square size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 2,
      title: 'Gradebook & Exams',
      icon: <CheckCircle2 size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 3,
      title: 'Fee Management',
      icon: <Laptop size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 4,
      title: 'Parent Portal',
      icon: <LayoutGrid size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 5,
      title: 'Data Security',
      icon: <Shield size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 6,
      title: 'AI Analytics',
      icon: <LineChart size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 7,
      title: 'Cloud Backups',
      icon: <Cloud size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 8,
      title: '24/7 Support',
      icon: <Headset size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 9,
      title: 'Report Cards',
      icon: <Award size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
    {
      id: 10,
      title: 'Fast Performance',
      icon: <Zap size={32} strokeWidth={1.5} stroke="url(#icon-gradient)" />,
    },
  ];

  return (
    <div className="feature-bar-section" id="features">
      {/* SVG Definitions for Icon Gradient */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#8b5cf6" offset="0%" />
            <stop stopColor="#f59e0b" offset="100%" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wave Background SVG */}
      <div className="wave-container">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="wave-svg">
          <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" fill="#1e3a5f" />
          <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32" stroke="#e2e8f0" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
      </div>

      <div className="feature-bar-container">
        <div className="marquee-wrapper w-full">
          <div className="horizontal-line"></div>
          <div className="marquee-track">
            {features.map((feat) => (
              <div key={feat.id} className="feature-card glass-card">
                <div className="feature-icon-box">
                  {feat.icon}
                </div>
                <h3 className="feature-card-title">{feat.title}</h3>
              </div>
            ))}
            {/* Duplicated set for infinite loop */}
            {features.map((feat) => (
              <div key={`${feat.id}-dup`} className="feature-card glass-card">
                <div className="feature-icon-box">
                  {feat.icon}
                </div>
                <h3 className="feature-card-title">{feat.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default FeatureBar;
