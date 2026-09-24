import React, { useState } from 'react';
import './Register.css';
import { Building2, GraduationCap, School, ArrowLeft } from 'lucide-react';
import BackgroundDoodles from '../components/BackgroundDoodles';
// import logoMain from '../../assets/logos/logo_main.png';
import logoMain from "../../assets/Graphura_Logo.webp";

import OrganizationSignup from '../../components/superAdmin/OrganizationSignup';
import SchoolRegistrationForm from '../../components/superAdmin/SchoolRegistrationForm';
import StudentAdmissionForm from '../../pages/Landing/StudentAdmissionForm';

export default function Register({ onNavigateHome, onNavigateLogin }) {
  const [role, setRole] = useState('headquarter'); // 'headquarter', 'school', 'student'
  const [formVisible, setFormVisible] = useState(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setFormVisible(true);
  };

  return (
    <div className="register-page legacy-root">
      <BackgroundDoodles />
      
      {/* Header */}
      <header className="register-header p-4 sm:p-6 lg:px-12 lg:py-6">
        <div className="register-logo-wrap flex items-center cursor-pointer" onClick={onNavigateHome}>
          <img src={logoMain} alt="Graphura" className="h-10 md:h-12 object-contain" />
        </div>
        <div className="register-header-actions">
          <span className="register-login-prompt">Already have an account?</span>
          <button className="register-login-btn" onClick={onNavigateLogin}>Log In</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="register-main">
        <div className="register-container-wrapper">
          <div className={`register-card ${formVisible ? 'mobile-form-active' : 'mobile-sidebar-active'}`}>
            
            {/* Left Sidebar (Registration Type Selector) */}
            <div className="register-sidebar">
              <div className="sidebar-gradient-bg"></div>
              
              {/* Decorative brand light circles */}
              <div className="decor-circle circle-1"></div>
              <div className="decor-circle circle-2"></div>

              {/* CSS Grid Pattern (Low Opacity) */}
              <div className="glass-grid-overlay"></div>

              {/* Glowing Radial Gradients (Low Opacity) */}
              <div className="radial-glow glow-1"></div>
              <div className="radial-glow glow-2"></div>

              {/* Floating Geometric Shapes (Low Opacity) */}
              <div className="floating-shape circle-shape"></div>
              <div className="floating-shape square-shape"></div>
              <div className="floating-shape plus-shape">+</div>
              <div className="floating-shape dot-shape"></div>

              {/* Animated Light Beam */}
              <div className="light-beam"></div>
              
              <div className="sidebar-inner-content">
                <div className="sidebar-header">
                  <h1 className="sidebar-title" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fc9d8b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Join Graphura</h1>
                  <p className="sidebar-desc">
                    Access our School Management & ERP workspace. Select your portal to continue.
                  </p>
                </div>

                {/* Onboarding Selector options */}
                <div className="role-options">
                  <div 
                    className={`role-option ${role === 'headquarter' ? 'active' : ''}`}
                    onClick={() => handleRoleSelect('headquarter')}
                  >
                    <div className="role-option-icon-wrap">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="role-option-text-wrap">
                      <span className="role-name">Headquarter</span>
                      <span className="role-subname">Central organization portal</span>
                    </div>
                    <div className="role-radio-dot">
                      <div className="radio-inner"></div>
                    </div>
                  </div>

                  <div 
                    className={`role-option ${role === 'school' ? 'active' : ''}`}
                    onClick={() => handleRoleSelect('school')}
                  >
                    <div className="role-option-icon-wrap">
                      <School className="w-5 h-5" />
                    </div>
                    <div className="role-option-text-wrap">
                      <span className="role-name">School Branch</span>
                      <span className="role-subname">Add external branch</span>
                    </div>
                    <div className="role-radio-dot">
                      <div className="radio-inner"></div>
                    </div>
                  </div>

                  <div 
                    className={`role-option ${role === 'student' ? 'active' : ''}`}
                    onClick={() => handleRoleSelect('student')}
                  >
                    <div className="role-option-icon-wrap">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="role-option-text-wrap">
                      <span className="role-name">Student Admission</span>
                      <span className="role-subname">Apply for active seat</span>
                    </div>
                    <div className="role-radio-dot">
                      <div className="radio-inner"></div>
                    </div>
                  </div>
                </div>

                <div className="sidebar-footer">
                  <button className="back-btn" onClick={onNavigateHome}>
                    <ArrowLeft size={16} /> Back to Home
                  </button>
                </div>
              </div>
            </div>

            {/* Right Content Area (Forms Container) */}
            <div className="register-content">
              <div className="mobile-back-header">
                <button className="mobile-back-btn" onClick={() => setFormVisible(false)}>
                  <ArrowLeft size={16} /> Back to Portal Selection
                </button>
              </div>
              <div className="form-inner-wrapper">
                {role === 'headquarter' && <OrganizationSignup isEmbedded={true} />}
                {role === 'school' && <SchoolRegistrationForm isEmbedded={true} />}
                {role === 'student' && <StudentAdmissionForm isEmbedded={true} />}
              </div>
            </div>

          </div>
        </div>
      </main>
      
    </div>
  );
}
