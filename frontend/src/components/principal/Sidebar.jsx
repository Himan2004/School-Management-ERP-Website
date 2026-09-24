import React, { useState, memo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  UserCheck,
  MessageSquare,
  BarChart3,
  User,
  LogOut,
  ChevronDown,
  Settings,
  CreditCard,
  GraduationCap,
  Menu,
  X,
  Home,
  LifeBuoyIcon,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { principalLogout } from '../../features/auth/principalAuthSlice.js';
import logoFull from '../../assets/Graphura_Logo.webp';
import logoSm from '../../assets/Graphura_Logo_Sm.png';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#223F74",
  activeBg: "#F59B87",
  hoverBg: "rgba(255,255,255,0.08)",
  childBg: "rgba(0,0,0,0.12)",
  childActiveBg: "rgba(245,155,135,0.20)",
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.50)",
  border: "rgba(255,255,255,0.10)",
  radius: "14px",
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
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <LogOut size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">
            Confirm Logout
          </p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to sign out? You will be redirected to the
            login page.
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
            {isLoggingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const PrincipalSidebar = memo(function PrincipalSidebar({
  expanded,
  onExpand,
  onNavClick,
  onCollapse,
}) {
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
      await dispatch(principalLogout()).unwrap();
    } catch (_) {
      /* intentional */
    }
    navigate("/login", { replace: true });
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  }, [dispatch, navigate]);

  const toggleSection = useCallback(
    (label) => setOpenSections((prev) => ({ ...prev, [label]: !prev[label] })),
    [],
  );

  const menuItems = [
    { label: "Dashboard", path: "/principal/dashboard", icon: LayoutDashboard },
    {
      label: "Students",
      icon: Users,
      children: [
        { label: 'All Students', path: '/principal/students', icon: Users },
        { label: 'Student Attendance', path: '/principal/students/attendance', icon: ClipboardList },
        { label: 'ID Card Generation', path: '/principal/admissions/id-cards', icon: CreditCard },
      ],
    },
    {
      label: "Admissions",
      icon: GraduationCap,
      children: [
        {
          label: "Admission List",
          path: "/principal/admissions/list",
          icon: ClipboardList,
        },
        {
          label: "Cancel Admission",
          path: "/principal/admissions/cancel",
          icon: ClipboardList,
        },
        {
          label: "Transfer / TC",
          path: "/principal/admissions/transfer",
          icon: FileText,
        },
      ],
    },
    {
      label: "Academic",
      icon: BookOpen,
      children: [
        {
          label: "Classes & Sections",
          path: "/principal/academic/classes",
          icon: BookOpen,
        },
        {
          label: "Subjects",
          path: "/principal/academic/subjects",
          icon: BookOpen,
        },
        {
          label: "Timetable",
          path: "/principal/academic/timetable",
          icon: ClipboardList,
        },
        {
          label: "Class Comparison",
          path: "/principal/academic/class-comparison",
          icon: BarChart3,
        },
      ],
    },
    {
      label: "HRM",
      icon: UserCheck,
      children: [
        { label: 'All Staff', path: '/principal/teachers/all', icon: Users },
        { label: 'Staff Attendance', path: '/principal/attendance/mark', icon: UserCheck },
        { label: 'Assign Subjects', path: '/principal/teachers/assign-subjects', icon: BookOpen },
        { label: 'Staff Resignation', path: '/principal/hrm/staff-resignation', icon: FileText },
        { label: 'Payroll Summary', path: '/principal/hrm/payroll-summary', icon: CreditCard },
        { label: 'Promotions/Demotions', path: '/principal/hrm/promotions', icon: BarChart3 },
      ],
    },
    {
      label: "Examinations",
      icon: FileText,
      children: [
        {
          label: "Create Exam",
          path: "/principal/examinations/create",
          icon: FileText,
        },
        {
          label: "Marks Entry",
          path: "/principal/examinations/marks-entry",
          icon: ClipboardList,
        },
        {
          label: "Results",
          path: "/principal/examinations/results",
          icon: BarChart3,
        },
        {
          label: "Marksheet Generation",
          path: "/principal/examinations/marksheet",
          icon: FileText,
        },
        {
          label: "Admit Card",
          path: "/principal/examinations/admit-card",
          icon: CreditCard,
        },
      ],
    },
    {
      label: "Fees",
      icon: CreditCard,
      children: [
        {
          label: "Fee Structure",
          path: "/principal/fees/structure",
          icon: CreditCard,
        },
        {
          label: "Fee Collection",
          path: "/principal/fees/collection",
          icon: CreditCard,
        },
        {
          label: "Due Reports",
          path: "/principal/fees/due-reports",
          icon: BarChart3,
        },
        {
          label: "Transactions",
          path: "/principal/fees/transactions",
          icon: FileText,
        },
      ],
    },
    {
      label: "Support Tickets",
      path: "/principal/support/tickets",
      icon: LifeBuoyIcon,
    },
    {
      label: "Communication",
      icon: MessageSquare,
      children: [
        {
          label: "Notices",
          path: "/principal/communication/notices",
          icon: MessageSquare,
        },
        {
          label: "Events",
          path: "/principal/communication/events",
          icon: MessageSquare,
        },
        {
          label: "Meeting Schedule",
          path: "/principal/communication/meetings",
          icon: ClipboardList,
        },
        {
          label: "PTM Feedback",
          path: "/principal/communication/ptm-feedback",
          icon: FileText,
        },
      ],
    },
    {
      label: "Reports",
      icon: BarChart3,
      children: [
        { label: 'Academic Reports', path: '/principal/reports/academic', icon: GraduationCap },
        { label: 'Financial Reports', path: '/principal/reports/financial', icon: CreditCard },
        { label: 'Staff Performance', path: '/principal/reports/staff-performance', icon: BarChart3 },
        { label: 'Attendance Reports', path: '/principal/reports/attendance', icon: BarChart3 },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      children: [
        {
          label: "Academic Year",
          path: "/principal/settings/academic-year",
          icon: Settings,
        },
        {
          label: "Policy Approvals",
          path: "/principal/settings/policy-approvals",
          icon: Settings,
        },
      ],
    },
    { label: "Profile", path: "/principal/profile", icon: User },
    { label: "Back to Home", path: "/", icon: Home },
  ];

  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) =>
    children?.some((c) => location.pathname === c.path);

  // ── Nav Item Renderer ─────────────────────────────────────────────────────
  const renderNavItem = (item) => {
    const Icon = item.icon;

    // Collapsible section
    if (item.children) {
      const secActive = isSectionActive(item.children);
      const secOpen = openSections[item.label];

      const content = (
        <div key={item.label}>
          <button
            type="button"
            onClick={() => {
              if (!expanded && stableOnExpand) {
                stableOnExpand();
                setOpenSections((prev) => ({ ...prev, [item.label]: true }));
              } else {
                toggleSection(item.label);
              }
            }}
            style={{
              borderRadius: C.radius,
              background: secActive ? C.childActiveBg : "transparent",
            }}
            className={`w-full flex items-center ${expanded ? "justify-between px-3" : "justify-center px-0"} py-2.5 transition-all duration-200`}
            onMouseEnter={(e) => {
              if (!secActive) e.currentTarget.style.background = C.hoverBg;
            }}
            onMouseLeave={(e) => {
              if (!secActive)
                e.currentTarget.style.background = secActive
                  ? C.childActiveBg
                  : "transparent";
            }}
          >
            <div
              className={`flex items-center min-w-0 ${!expanded ? "justify-center w-full" : ""}`}
            >
              <Icon
                size={20}
                style={{ color: secActive ? "#F59B87" : C.text, flexShrink: 0 }}
              />
              {expanded && (
                <span
                  className="ml-3 text-sm font-semibold truncate"
                  style={{ color: secActive ? "#fff" : C.text }}
                >
                  {item.label}
                </span>
              )}
            </div>
            {expanded && (
              <ChevronDown
                size={14}
                style={{ color: C.textMuted, flexShrink: 0 }}
                className={`transition-transform duration-200 ${secOpen ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {expanded && secOpen && (
            <div
              className="mt-1 mb-2 ml-3 rounded-xl overflow-hidden"
              style={{ background: C.childBg }}
            >
              {item.children.map((child) => {
                const ca = isActive(child.path);
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={stableOnNavClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "10px",
                      background: ca ? C.activeBg : "transparent",
                      color: ca ? "#fff" : C.textMuted,
                      margin: "2px 4px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!ca) e.currentTarget.style.background = C.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      if (!ca) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <ChildIcon
                      size={13}
                      style={{
                        flexShrink: 0,
                        marginRight: 8,
                        color: ca ? "#fff" : C.textMuted,
                      }}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {child.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );

      return expanded ? (
        content
      ) : (
        <Tooltip key={item.label} label={item.label}>
          {content}
        </Tooltip>
      );
    }

    // Regular item
    const active = isActive(item.path);
    const link = (
      <Link
        key={item.path}
        to={item.path}
        onClick={stableOnNavClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          borderRadius: C.radius,
          background: active ? C.activeBg : "transparent",
          color: active ? "#fff" : C.text,
          padding: expanded ? "10px 12px" : "10px 0",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = C.hoverBg;
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon
          size={20}
          style={{ flexShrink: 0, color: active ? "#fff" : C.text }}
        />
        {expanded && (
          <span
            style={{
              marginLeft: 12,
              fontSize: 14,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </span>
        )}
      </Link>
    );

    return expanded ? (
      link
    ) : (
      <Tooltip key={item.path} label={item.label}>
        {link}
      </Tooltip>
    );
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ background: C.bg, boxShadow: "4px 0 24px rgba(0,0,0,0.20)" }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center border-b ${expanded ? "px-3 py-1.5 gap-2" : "justify-center py-3.5"}`}
        style={{ borderColor: C.border }}
      >
        {expanded ? (
          <>
            <div className="bg-white rounded-lg flex-1 h-16 flex items-center justify-center p-1 overflow-hidden shadow-md">
              <img
                src={logoFull}
                alt="Graphura"
                className="h-full w-auto object-contain"
              />
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
            <img
              src={logoSm}
              alt="Graphura"
              className="h-full w-full object-contain"
            />
          </button>
        )}
      </div>

      {/* ── Separator ────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: C.border, margin: "0 16px 12px" }} />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4 space-y-0.5">
        {menuItems.map((item) => renderNavItem(item))}
      </nav>

      {/* ── Footer / Logout ───────────────────────────────────────────────── */}
      <div style={{ height: 1, background: C.border, margin: "0 16px" }} />
      <div
        className={`mt-auto ${expanded ? "px-3 pt-3 pb-4" : "px-2 pt-3 pb-4 flex justify-center"}`}
      >
        {expanded ? (
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-rose-500/10 transition-colors duration-150 cursor-pointer group"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white shadow-sm">
              PR
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: C.text }}
              >
                Principal
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: C.textMuted }}
              >
                Active session
              </p>
            </div>
            <LogOut
              size={14}
              className="text-slate-500 group-hover:text-rose-400 transition-colors flex-shrink-0"
            />
          </button>
        ) : (
          <Tooltip label="Logout">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white shadow-sm cursor-pointer hover:from-rose-400 hover:to-rose-600 transition-all duration-200"
            >
              PR
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

export default PrincipalSidebar;
