import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Import legacy styles
import './LegacyLanding/index.css';
import './LegacyLanding/App.css';

// Import legacy pages
import LandingPage from './LegacyLanding/pages/LandingPage';
import Register from './LegacyLanding/pages/Register';
import Login from './LegacyLanding/pages/Login';

export default function LegacyLandingWrapper({ initialPage = 'landing' }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Ensure responsive mobile meta viewport tag across all legacy landing pages
  useEffect(() => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
  }, []);

  // Handle URL updates when state changes internally (if any child component calls it)
  const navigateTo = (page, path) => {
    setCurrentPage(page);
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  if (currentPage === 'register') {
    return (
      <div className="legacy-root">
        <Register 
          onNavigateHome={() => navigateTo('landing', '/')} 
          onNavigateLogin={() => navigateTo('login', '/organization/login')} 
        />
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <div className="legacy-root">
        <Login 
          onNavigateHome={() => navigateTo('landing', '/')} 
          onNavigateRegister={() => navigateTo('register', '/organization/signup')}
        />
      </div>
    );
  }

  return (
    <div className="legacy-root">
      <LandingPage 
        onNavigateRegister={() => navigateTo('register', '/organization/signup')} 
        onNavigateLogin={() => navigateTo('login', '/organization/login')} 
      />
    </div>
  );
}
