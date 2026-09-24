import React, { useState, memo, useCallback } from 'react';
import { Link, useLocation, matchPath, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserCheck,
  Briefcase,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Calendar,
  User,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Home
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { teacherLogout } from '../../features/auth/teacherAuthSlice';
import logoFull from '../../assets/Graphura_Logo.webp';
import logoSm from '../../assets/Graphura_Logo_Sm.png';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#223F74',
  activeBg: '#F59B87',
  hoverBg: 'rgba(255,255,255,0.08)',
  childBg: 'rgba(0,0,0,0.12)',
  childActiveBg: 'rgba(245,155,135,0.20)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.50)',
  border: 'rgba(255,255,255,0.10)',
  radius: '14px',
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ label, children }) {
  return (
    <div className="relative group/tip w-full flex justify-center">
      {children}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]
                      opacity-0 translate-x-1
                      group-hover/tip:opacity-100 group-hover/tip:translate-x-0
                      transition-[opacity,transform] duration-150 whitespace-nowrap"
      >
        <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
          {label}
        </div>
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a2e3f]" />
      </div>
    </div>
  );
}

// ── Logout Confirmation Modal ─────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel, isLoggingOut }) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <LogOut size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">Confirm Logout</p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to sign out? You will be redirected to the login page.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition active:scale-95 shadow-md shadow-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = memo(function Sidebar({ expanded, onExpand, onNavClick, onCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [openSections, setOpenSections] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const stableOnNavClick = useCallback(() => onNavClick?.(), [onNavClick]);
  const stableOnExpand = useCallback(() => onExpand?.(), [onExpand]);

  const handleLogoutConfirm = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(teacherLogout()).unwrap();
    } catch (_) { /* intentional */ }
    navigate('/login', { replace: true });
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  }, [dispatch, navigate]);

  const toggleSection = useCallback((label) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] })),
    []);

  const menuItems = [
    {
      path: '/teacher/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      matches: ['/teacher/dashboard'],
      end: true,
    },
    {
      path: '/teacher/my-classes',
      icon: BookOpen,
      label: 'My Classes',
      matches: ['/teacher/my-classes', '/teacher/class/:id'],
    },
    {
      path: '/teacher/students',
      icon: Users,
      label: 'Students',
      matches: ['/teacher/students', '/teacher/student/:id'],
    },
    {
      path: '/teacher/complaints',
      icon: AlertTriangle,
      label: 'Complaints',
      matches: ['/teacher/complaints'],
    },
    {
      path: '/teacher/attendance',
      icon: UserCheck,
      label: 'Attendance',
      matches: ['/teacher/attendance'],
    },
    {
      path: '/teacher/leave',
      icon: Briefcase,
      label: 'Student Leave',
      matches: ['/teacher/leave'],
    },
    {
      path: '/teacher/assignments',
      icon: FileText,
      label: 'Assignments',
      matches: ['/teacher/assignments', '/teacher/assignments/:id/submissions'],
    },
    {
      path: '/teacher/exams-grades',
      icon: GraduationCap,
      label: 'Exams & Grades',
      matches: ['/teacher/exams-grades'],
    },
    {
      path: '/teacher/announcements',
      icon: Megaphone,
      label: 'Announcements',
      matches: ['/teacher/announcements'],
    },
    {
      path: '/teacher/messages',
      icon: MessageSquare,
      label: 'Messages',
      matches: ['/teacher/messages'],
    },
    {
      path: '/teacher/calendar',
      icon: Calendar,
      label: 'Calendar',
      matches: ['/teacher/calendar'],
    },
    {
      path: '/teacher/profile',
      icon: User,
      label: 'Profile',
      matches: ['/teacher/profile'],
    },
    {
      path: '/teacher/settings',
      icon: Settings,
      label: 'Settings',
      matches: ['/teacher/settings'],
    },
    {
      path: '/',
      icon: Home,
      label: 'Back to Home',
      matches: ['/'],
    },
  ];

  const isMenuItemActive = (item) =>
    item.matches.some((pattern) =>
      matchPath(
        { path: pattern, end: pattern === '/teacher/dashboard' || item.end === true },
        location.pathname
      )
    );

  const isSectionActive = (children) => false; // Using matches array for teacher

  // ── Nav Item Renderer ─────────────────────────────────────────────────────
  const renderNavItem = (item) => {
    const Icon = item.icon;

    // Regular item
    const active = isMenuItemActive(item);
    const link = (
      <Link
        key={item.path}
        to={item.path}
        onClick={stableOnNavClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: C.radius,
          background: active ? C.activeBg : 'transparent',
          color: active ? '#fff' : C.text,
          padding: expanded ? '10px 12px' : '10px 0',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.hoverBg; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon size={20} style={{ flexShrink: 0, color: active ? '#fff' : C.text }} />
        {expanded && (
          <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
      </Link>
    );

    return expanded ? link : <Tooltip key={item.path} label={item.label}>{link}</Tooltip>;
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ background: C.bg, boxShadow: '4px 0 24px rgba(0,0,0,0.20)' }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center border-b ${expanded ? 'px-3 py-1.5 gap-2' : 'justify-center py-3.5'}`}
        style={{ borderColor: C.border }}
      >
        {expanded ? (
          <>
            <div className="bg-white rounded-lg flex-1 h-16 flex items-center justify-center p-1 overflow-hidden shadow-md">
              <img src={logoFull} alt="Graphura" className="h-full w-auto object-contain" />
            </div>
            {/* Collapse button — visible only on desktop */}
            <button
              onClick={() => onCollapse?.()}
              className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0 hidden lg:block"
            >
              <Menu size={22} />
            </button>
            {/* Close button — visible only on mobile (inside drawer) */}
            <button
              onClick={stableOnNavClick}
              className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0 lg:hidden"
            >
              <X size={22} />
            </button>
          </>
        ) : (
          <button
            onClick={stableOnExpand}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md select-none flex-shrink-0 p-1 hover:opacity-90 transition-opacity"
          >
            <img src={logoSm} alt="Graphura" className="h-full w-full object-contain" />
          </button>
        )}
      </div>

      {/* ── Separator ────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: C.border, margin: '0 16px 12px' }} />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4 space-y-0.5">
        {menuItems.map((item) => renderNavItem(item))}
      </nav>

      {/* ── Footer / Logout ───────────────────────────────────────────────── */}
      <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
      <div className={`mt-auto ${expanded ? 'px-3 pt-3 pb-4' : 'px-2 pt-3 pb-4 flex justify-center'}`}>
        {expanded ? (
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-rose-500/10 transition-colors duration-150 cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white shadow-sm">
              TE
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold truncate" style={{ color: C.text }}>Teacher</p>
              <p className="text-[11px] truncate" style={{ color: C.textMuted }}>Active session</p>
            </div>
            <LogOut size={14} className="text-slate-500 group-hover:text-rose-400 transition-colors flex-shrink-0" />
          </button>
        ) : (
          <Tooltip label="Logout">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white shadow-sm cursor-pointer hover:from-rose-400 hover:to-rose-600 transition-all duration-200"
            >
              TE
            </button>
          </Tooltip>
        )}
      </div>

      {/* ── Logout Modal ─────────────────────────────────────────────────── */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
          isLoggingOut={isLoggingOut}
        />
      )}
    </div>
  );
});

export default Sidebar;