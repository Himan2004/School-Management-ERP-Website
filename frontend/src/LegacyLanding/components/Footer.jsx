import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import './Footer.css';

const Footer = memo(function Footer() {
  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
  };

  return (
    <footer className="footer" id="contact">
      <div className="container mx-auto footer-grid grid-cols-[1.5fr_0.8fr_0.8fr_1.4fr] gap-[50px] pb-[60px]">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <div className="footer-logo-wrap">
            <div className="footer-logo-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="footer-logo-text">Graphura.</span>
          </div>
          <p className="footer-desc">
            We are dedicated to providing premium school management experiences, empowering
            educational institutions with intelligent analytics, and accelerating
            administrative transformations.
          </p>
          <div className="footer-socials">
            <a href="#fb" aria-label="Facebook" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="#tw" aria-label="Twitter" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a href="#li" aria-label="LinkedIn" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a href="#yt" aria-label="YouTube" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                <path d="m10 15 5-3-5-3z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Links Column 1 */}
        <div className="footer-links-col">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links-list">
            <li><a href="#features">Features</a></li>
            <li><a href="#modules">Modules</a></li>
            <li><a href="#ai-engine">AI Engine</a></li>
            <li><Link to="/contact-us">Contact Us</Link></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div className="footer-links-col">
          <h4 className="footer-heading">Capabilities</h4>
          <ul className="footer-links-list">
            <li><a href="#admissions">Admissions</a></li>
            <li><a href="#academics">Academics</a></li>
            <li><a href="#analytics">Analytics</a></li>
            <li><a href="#portals">Portals</a></li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div className="footer-news-col">
          <h4 className="footer-heading">Contact us.</h4>
          <p className="footer-news-desc">
            Stay updated with our latest releases, AI updates, feature announcements, and educational webinars!
          </p>
          <form className="footer-news-form" onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="footer-news-input" 
              required
            />
            <button type="submit" aria-label="Subscribe" className="footer-news-btn">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container mx-auto footer-bottom-flex flex-row justify-between">
          <span className="footer-copy">
            &copy; {new Date().getFullYear()} Graphura ERP. All rights reserved.
          </span>
          <div className="footer-policy-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
