import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import CommonSidebar from '../components/common/CommonSidebar';

export default function MainLayout({
  isLoading,
  isAuthenticated,
  menuItems,
  roleName,
  roleInitials,
  badgeColors = 'from-blue-400 to-indigo-600',
  onLogout,
  navbarRender,
  children
}) {
  // Desktop: expanded / collapsed
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(`${roleName.toLowerCase()}-sidebar-expanded`);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Mobile: drawer open / closed
  const [isMobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(`${roleName.toLowerCase()}-sidebar-expanded`, JSON.stringify(isExpanded));
  }, [isExpanded, roleName]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // Dark mode logic if the role uses it
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleExpand = useCallback(() => setIsExpanded(true), []);
  const handleCollapse = useCallback(() => setIsExpanded(false), []);
  const handleNavClick = useCallback(() => setMobileOpen(false), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#F7F5F2' }}>
        <div className="w-10 h-10 border-4 border-[#E7E2DB] border-t-[#F59B87] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Sidebar widths
  const EXPANDED_W = 280;
  const COLLAPSED_W = 80;
  const desktopW = isExpanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <div
      className="flex h-screen overflow-hidden dark:bg-slate-950 transition-colors duration-300"
      style={{
        background: document.documentElement.classList.contains('dark') ? '' : 'radial-gradient(circle at top, #fff7ed 0%, #f7f8f0 40%, #eef4f7 100%)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── Mobile overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-screen transition-all duration-300 overflow-hidden"
        style={{ width: desktopW }}
      >
        <CommonSidebar
          expanded={isExpanded}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          onNavClick={handleNavClick}
          menuItems={menuItems}
          roleName={roleName}
          roleInitials={roleInitials}
          badgeColors={badgeColors}
          onLogout={onLogout}
        />
      </aside>

      {/* ── Mobile Drawer ── */}
      <aside
        className="fixed top-0 left-0 h-screen w-[280px] z-50 flex flex-col lg:hidden transition-transform duration-300"
        style={{ transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <CommonSidebar
          expanded={true}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          onNavClick={handleNavClick}
          menuItems={menuItems}
          roleName={roleName}
          roleInitials={roleInitials}
          badgeColors={badgeColors}
          onLogout={onLogout}
        />
      </aside>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* ── Sticky Navbar ── */}
        <div className="flex-shrink-0 border-b border-white/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-sm backdrop-blur-xl" style={{ position: 'relative', zIndex: 50 }}>
          {navbarRender && navbarRender(setMobileOpen)}
        </div>

        {/* ── Scrollable content area ── */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 dark:bg-slate-950">
          <div className="min-h-full rounded-[28px] border border-white/70 dark:border-slate-800 bg-[linear-gradient(180deg,_rgba(255,255,255,0.88)_0%,_rgba(250,252,253,0.96)_100%)] dark:bg-slate-900/50 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-6">
            <Outlet />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
