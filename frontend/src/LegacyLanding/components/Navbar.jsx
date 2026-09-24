import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoMain from "../../assets/Graphura_Logo.webp";
import './Navbar.css';

export default function Navbar({ onNavigateRegister, onNavigateLogin }) {
  const [activeLink, setActiveLink] = useState('courses');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { id: 'features', label: 'Features', href: '#features' },
    { id: 'modules', label: 'Modules', href: '#modules' },
    { id: 'ai-engine', label: 'AI Engine', href: '#ai-engine' },
    { id: 'contact', label: 'Contact', href: '/contact-us' },
  ];

  const handleNavClick = (e, linkId) => {
    e.preventDefault();
    setActiveLink(linkId);
    setIsMobileMenuOpen(false);
    const element = document.getElementById(linkId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setActiveLink('contact');
    if (location.pathname === '/') {
      const element = document.getElementById('contact');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/', { state: { scrollTo: 'contact' } });
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Lock body scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="navbar" ref={mobileMenuRef}>
      <div className="navbar-container w-full flex items-center justify-between">
        {/* Left Logo */}
        <div className="navbar-logo-wrap flex items-center shrink-0 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src={logoMain} alt="Graphura" className="h-8 sm:h-9 md:h-12 object-contain" />
        </div>

        {/* Desktop Navigation Links */}
        <ul className="navbar-links hidden lg:flex">
          {navLinks.map((link) => (
            <li key={link.id}>
              {link.id === 'contact' ? (
                <a
                  href="#contact"
                  className={`navbar-link ${activeLink === 'contact' ? 'active' : ''}`}
                  onClick={handleContactClick}
                >
                  {link.label}
                </a>
              ) : (
                <a
                  href={link.href}
                  className={`navbar-link ${activeLink === link.id ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        {/* Auth Buttons & Mobile Navigation */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Register & Log In Buttons */}
          <div className="hidden lg:flex items-center gap-2 sm:gap-3">
            <button 
              className="text-xs sm:text-base font-semibold text-slate-800 hover:text-indigo-600 transition-colors px-1 sm:px-2 py-1 whitespace-nowrap"
              onClick={onNavigateRegister}
            >
              Register
            </button>
            <button 
              className="navbar-login-btn text-xs sm:text-base px-3.5 py-1.5 sm:px-8 sm:py-3 whitespace-nowrap"
              onClick={onNavigateLogin}
            >
              Log in
            </button>
          </div>

          {/* Mobile Hamburger Icon Trigger */}
          <button 
            className="lg:hidden flex items-center justify-center p-1.5 text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-0.5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-container">
          <ul className="mobile-menu-links">
            {navLinks.map((link) => (
              <li key={link.id} className="w-full text-center">
                {link.id === 'contact' ? (
                  <a
                    href="#contact"
                    className={`mobile-menu-link block ${activeLink === 'contact' ? 'active' : ''}`}
                    onClick={handleContactClick}
                  >
                    {link.label}
                  </a>
                ) : (
                  <a
                    href={link.href}
                    className={`mobile-menu-link block ${activeLink === link.id ? 'active' : ''}`}
                    onClick={(e) => handleNavClick(e, link.id)}
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="mobile-menu-auth">
            <button 
              className="mobile-menu-btn-register" 
              onClick={() => { setIsMobileMenuOpen(false); onNavigateRegister(); }}
            >
              Register
            </button>
            <button 
              className="mobile-menu-btn-login" 
              onClick={() => { setIsMobileMenuOpen(false); onNavigateLogin(); }}
            >
              Log in
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
