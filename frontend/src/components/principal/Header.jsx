import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Settings,
  Search,
  ChevronDown,
  UserPlus,
  Check,
  CheckCircle2,
  LogOut
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { selectPrincipal } from "../../features/auth/principalAuthSlice";
import UserAvatar from "../common/UserAvatar";

// ─── Assumed API Imports (Update path as needed) ───────────────────────────
import {
  fetchPrincipalNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/api/notificationsApi.js";

const timeAgo = (dateInput) => {
  const date = new Date(dateInput);
  const seconds = Math.round((new Date() - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

const PrincipalHeader = ({ handleLogout }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const principal = useSelector(selectPrincipal);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [showProfile, setShowProfile] = useState(false);

  // ─── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // ─── Fetch Notifications ───────────────────────────────────────────────────
  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetchPrincipalNotifications();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Optional: Poll for new notifications every 2 minutes
    const poll = setInterval(loadNotifications, 120000);
    return () => clearInterval(poll);
  }, []);

  // ─── Notification Actions ──────────────────────────────────────────────────
  const handleNotificationClick = async (notif) => {
    // 1. Optimistic UI update
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // 2. Background API call
      try {
        await markNotificationAsRead(notif._id);
      } catch (err) {
        console.error("Failed to mark as read");
      }
    }

    // 3. Optional Routing based on notification metadata/type
    setShowNotifications(false);
    if (notif.type === "leave") navigate("/principal/leaves");
    else if (notif.type === "attendance") navigate("/principal/attendance");
    // Add other routings as required...
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
      toast.success("All caught up!");
    } catch (err) {
      toast.error("Failed to update notifications");
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/principal/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {/* Left Section - Menu Button & Greeting */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Add a placeholder menu button if needed, or leave out if principal doesn't have mobile sidebar prop */}
          <h2 className="text-xl font-bold text-[#223F74] hidden md:block whitespace-nowrap">
            {getGreeting()}, {principal?.name || "Principal"}
          </h2>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0" ref={dropdownRef}>
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-sm">Recent Notifications</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {unreadCount} New
                  </span>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">No new notifications</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">You're all caught up! When there are important updates, they will appear here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {notifications.map((notification, idx) => (
                        <div
                          key={notification._id || idx}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                              <Bell className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                  {notification.type || 'Notification'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {timeAgo(notification.createdAt || Date.now())}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-800 mt-1">{notification.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Mark All as Read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu - Only Profile, Settings, Logout */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200">
                {principal?.name ? principal.name.charAt(0).toUpperCase() : "P"}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="font-semibold text-gray-800 truncate">{principal?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{principal?.email}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate('/principal/profile');
                        setShowProfile(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> My Profile
                    </button>

                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        if (handleLogout) handleLogout();
                        setShowProfile(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PrincipalHeader;
