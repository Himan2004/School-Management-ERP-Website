// components/accountant/AccountantHeader.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Settings, LogOut, FileText, Calendar, ChevronDown } from 'lucide-react';
import { selectAccountant } from '../../features/auth/accountantAuthSlice';
import { getAccountantCommunications, markAccountantNoticeRead } from '../../services/AccountantDashboard';
import NotificationCenter from './NotificationCenter';

const AccountantHeader = ({ onMenuOpen, onLogout }) => {
  const accountant = useSelector(selectAccountant);
  const navigate = useNavigate();

  // Dropdown open states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Notifications data states
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local set of notification IDs marked read in the current session
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());

  // Notification Center Modal state
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Refs for click outside
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const initials = accountant?.name
    ? accountant.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'A';

  // Helper to evaluate if a notification item is read
  const isItemRead = (item) => item.isRead || readNotificationIds.has(item.id);

  // Badge count calculated dynamically based on raw items and local read set
  const unreadCount = notifications.filter(n => !isItemRead(n)).length;

  // Fetch notices, meetings, and events
  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const res = await getAccountantCommunications();
      if (res.data?.success) {
        setNotifications(res.data.data.communications || []);
      }
    } catch (error) {
      console.error('Error fetching communications in header:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
    // Poll every 30 seconds to keep badge and listing in sync
    const interval = setInterval(fetchCommunications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toggle notification dropdown & mark all unread as read immediately
  const handleToggleNotifications = () => {
    const nextState = !isNotificationOpen;
    setIsNotificationOpen(nextState);
    setIsProfileOpen(false);

    if (nextState) {
      const unreadItems = notifications.filter(n => !isItemRead(n));
      if (unreadItems.length > 0) {
        // Add all unread notification IDs to local session read set
        setReadNotificationIds(prev => {
          const newSet = new Set(prev);
          unreadItems.forEach(item => newSet.add(item.id));
          return newSet;
        });

        // Call backend read API for notices in the background
        unreadItems.forEach(async (item) => {
          if (item.type === 'notice') {
            try {
              await markAccountantNoticeRead(item.id);
            } catch (err) {
              console.error('Failed to mark notice read on backend:', err);
            }
          }
        });
      }
    }
  };

  // Handle notice click -> mark notice read
  const handleNotificationClick = async (item) => {
    if (!isItemRead(item)) {
      // Instantly mark as read locally
      setReadNotificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(item.id);
        return newSet;
      });

      if (item.type === 'notice') {
        try {
          await markAccountantNoticeRead(item.id);
        } catch (error) {
          console.error('Error marking notice as read:', error);
        }
      }
    }

    // Handle custom navigation or viewing details if needed
    if (item.type === 'meeting' && item.meetingLink && item.isOnline) {
      window.open(item.meetingLink, '_blank');
    }
  };

  // Click outside and ESC close listeners
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {/* Left Section - Menu Button & Greeting */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-[#223F74] hidden md:block whitespace-nowrap">
            {getGreeting()}, {accountant?.name || 'Accountant'}
          </h2>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleToggleNotifications}
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
            {isNotificationOpen && (
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
                  {loading && notifications.length === 0 ? (
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
                      {notifications.map((item) => {
                        const read = isItemRead(item);
                        return (
                          <div
                            key={item.id}
                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!read ? 'bg-blue-50/30' : ''}`}
                            onClick={() => handleNotificationClick(item)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                {item.type === 'notice' && <FileText className="w-5 h-5" />}
                                {(item.type === 'meeting' || item.type === 'event') && <Calendar className="w-5 h-5" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded ${item.source === 'PRINCIPAL' ? 'bg-purple-100' : 'bg-slate-100'}`}>
                                    {item.type || 'Notification'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(item.date || Date.now()).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 mt-1">{item.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate('/accountant/notifications');
                    }}
                    className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationOpen(false);
              }}
              className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200">
                {initials}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="font-semibold text-gray-800 truncate">{accountant?.name || 'Accountant'}</p>
                    <p className="text-xs text-indigo-600 mt-1">{accountant?.role || 'Accountant'}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/accountant/profile');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/accountant/notifications');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" /> Notifications
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (onLogout) onLogout();
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

      {/* Shared Notification Center Modal */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        isItemRead={isItemRead}
        onNotificationClick={handleNotificationClick}
        loading={loading}
      />
    </header>
  );
};

export default AccountantHeader;