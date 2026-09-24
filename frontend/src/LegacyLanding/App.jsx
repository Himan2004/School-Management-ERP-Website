import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  if (currentPage === 'register') {
    return <Register onNavigateHome={() => setCurrentPage('landing')} onNavigateLogin={() => setCurrentPage('login')} />;
  }
  
  if (currentPage === 'login') {
    return <Login onNavigateHome={() => setCurrentPage('landing')} onNavigateRegister={() => setCurrentPage('register')} />;
  }

  return <LandingPage onNavigateRegister={() => setCurrentPage('register')} onNavigateLogin={() => setCurrentPage('login')} />;
}

export default App;
