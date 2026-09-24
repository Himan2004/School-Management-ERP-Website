import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  School,
  Users,
  FileText,
  Settings,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  X,
  ShieldAlert,
  LifeBuoy,
  FileSignature,
  Building2,
  Menu
} from "lucide-react";
import { BRAND_CONFIG } from "../../config/brandConfig";

// ── Correct API Imports ──
import {
  fetchOrganizationRequestStats,
  fetchSystemNotifications,
  getAllSupportTickets, // ✅ Now correctly imported
} from "../../services/api/graphuraApi";

import {
  selectUnreadNotificationsCount,
  setUnreadNotificationsCount,
} from "../../features/auth/graphuraAuthSlice";

// 🔥 IMPORT YOUR NEW LOGO HERE
import graphuraLogo from "../../assets/Graphura_Logo_Sm.png";

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
        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
          {label}
        </div>
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}

const GraphuraSidebar = ({ expanded = true, onExpand, onCollapse, onClose, handleLogout }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Badge States
  const [pendingOrganizationRequestsCount, setPendingOrganizationRequestsCount] = useState(0);
  const [pendingSchoolRequestsCount, setPendingSchoolRequestsCount] = useState(0);
  const unreadNotificationsCount = useSelector(selectUnreadNotificationsCount);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [statsRes, notificationsRes, supportRes] = await Promise.all([
          fetchOrganizationRequestStats(),
          fetchSystemNotifications(),
          getAllSupportTickets({ category: "" }), // ✅ Uses correct endpoint
        ]);

        if (statsRes.data?.success) {
          setPendingOrganizationRequestsCount(
            statsRes.data.data.pendingOrganizationRequests !== undefined
              ? statsRes.data.data.pendingOrganizationRequests
              : (statsRes.data.data.statusBreakdown?.pending || 0)
          );
          setPendingSchoolRequestsCount(
            statsRes.data.data.pendingSchoolRequests || 0
          );
        }
        if (notificationsRes.data?.success) {
          const unread = notificationsRes.data.data.filter(
            (n) => !n.read,
          ).length;
          dispatch(setUnreadNotificationsCount(unread));
        }
        if (supportRes?.success) {
          // Extracts the 'open' count from the nested stats object
          setOpenTicketsCount(supportRes.data?.stats?.open || 0);
        }
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    };
    fetchCounts();

    // Poll every 60 seconds
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/graphura-admin/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Organization Management",
      icon: School,
      submenus: [
        {
          name: "Registration Requests",
          path: "/graphura-admin/organization-requests",
          icon: FileSignature,
          badge: pendingOrganizationRequestsCount > 0 ? pendingOrganizationRequestsCount : null,
        },
        {
          name: "All Organizations",
          path: "/graphura-admin/schools",
          icon: Building2,
        },
      ],
    },
    {
      name: "User Management",
      path: "/graphura-admin/users",
      icon: Users,
    },
    {
      name: "Escalations",
      path: "/graphura-admin/escalations",
      icon: ShieldAlert,
    },
    {
      name: "Support Desk",
      path: "/graphura-admin/support",
      icon: LifeBuoy,
      badge: openTicketsCount > 0 ? openTicketsCount : null,
    },
    {
      name: "Settings",
      path: "/graphura-admin/settings/general",
      icon: Settings,
    },
    {
      name: "Notifications",
      path: "/graphura-admin/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
    },
  ];

  const bottomMenu = [
    {
      name: "Profile",
      path: "/graphura-admin/profile",
      icon: User,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Logo Section */}
      <div className={`flex items-center border-b border-gray-700 ${expanded ? 'justify-between p-5' : 'justify-center py-5'}`}>
        {expanded ? (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={graphuraLogo}
                  alt="Graphura Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-gray-600 shadow-lg bg-white"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">
                  {BRAND_CONFIG.name}
                </h1>
                <p className="text-xs text-gray-400 truncate">Super Admin Console</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Collapse button — visible only on desktop */}
              <button
                onClick={() => onCollapse?.()}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50 flex-shrink-0 hidden lg:block"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Close button — visible only on mobile */}
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onExpand?.()}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-600 shadow-lg select-none flex-shrink-0 hover:opacity-90 transition-opacity p-1"
          >
            <img src={graphuraLogo} alt="Graphura Logo" className="h-full w-full object-cover rounded-xl" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        <nav className="space-y-1 px-3">
          {menuItems.map((item, index) => {
            const hasSubmenus = !!item.submenus;
            const buttonOrLink = hasSubmenus ? (
              <button
                onClick={() => {
                  if (!expanded) {
                    onExpand?.();
                    setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
                  } else {
                    toggleMenu(item.name);
                  }
                }}
                className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-200 group ${
                  expanded && expandedMenus[item.name]
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span className="text-sm font-medium">{item.name}</span>}
                </div>
                {expanded && (
                  expandedMenus[item.name] ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )
                )}
              </button>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span className="text-sm font-medium">{item.name}</span>}
                </div>

                {expanded && item.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${
                      item.badge === "Premium"
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse"
                        : item.badge === "Live"
                          ? "bg-green-500 text-white animate-pulse"
                          : "bg-rose-500 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );

            const wrappedNode = expanded ? buttonOrLink : <Tooltip label={item.name}>{buttonOrLink}</Tooltip>;

            return (
              <div key={index}>
                {wrappedNode}
                {hasSubmenus && expanded && expandedMenus[item.name] && (
                  <motion.div
                    initial={false}
                    animate={{ height: expandedMenus[item.name] ? "auto" : 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mt-1 space-y-1">
                      {item.submenus.map((submenu, subIndex) => (
                        <NavLink
                          key={subIndex}
                          to={submenu.path}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
                              isActive
                                ? "bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-400"
                                : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <submenu.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{submenu.name}</span>
                          </div>
                          {submenu.badge && (
                            <span className="px-2 py-0.5 text-xs bg-rose-500 text-white rounded-full font-bold flex-shrink-0">
                              {submenu.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={`border-t border-gray-700 ${expanded ? 'p-4' : 'p-2 flex flex-col items-center'} space-y-2`}>
        {bottomMenu.map((item, index) => {
          const content = (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-200 w-full ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {expanded && <span className="text-sm font-medium">{item.name}</span>}
              </div>
            </NavLink>
          );
          return expanded ? content : <Tooltip key={index} label={item.name}>{content}</Tooltip>;
        })}

        {expanded ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        ) : (
          <Tooltip label="Logout">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default GraphuraSidebar;
