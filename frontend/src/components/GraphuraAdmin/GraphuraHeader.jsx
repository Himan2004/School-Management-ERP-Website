import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, User, Settings, LogOut, ChevronDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectGraphuraAdmin,
  setUnreadNotificationsCount,
  selectUnreadNotificationsCount,
} from '../../features/auth/graphuraAuthSlice';
import { fetchSystemNotifications } from '../../services/api/graphuraApi';

const SEARCHABLE_ITEMS = [
  { name: 'Dashboard', path: '/graphura-admin/dashboard' },
  { name: 'School Management - Registration Requests', path: '/graphura-admin/organization-requests' },
  { name: 'School Management - All Organizations', path: '/graphura-admin/schools' },
  { name: 'User Management', path: '/graphura-admin/users' },
  { name: 'Analytics', path: '/graphura-admin/analytics' },
  { name: 'Settings', path: '/graphura-admin/settings/general' },
  { name: 'Notifications', path: '/graphura-admin/notifications' },
  { name: 'Profile', path: '/graphura-admin/profile' },
  { name: 'Help & Support', path: '/graphura-admin/support' }
];

const GraphuraHeader = ({ onMenuClick, handleLogout }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = useSelector(selectUnreadNotificationsCount);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchSystemNotifications();
      if (res.data?.success) {
        const count = res.data.data.filter(n => !n.read).length;
        dispatch(setUnreadNotificationsCount(count));
      }
    } catch (err) {
      console.error("Failed to load notifications count:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const profile = useSelector(selectGraphuraAdmin);
  const adminProfile = {
    name: profile?.fullName || profile?.name || 'Graphura Super Admin',
    role: profile?.role?.replace('_', ' ') || 'Super Admin',
    avatar: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'G')}&background=4F46E5&color=fff`,
    email: profile?.email || 'support@graphura.com'
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-[160px] sm:max-w-xs md:max-w-md mx-2 sm:mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                {suggestions.length > 0 ? (
                  <div className="py-1">
                    {suggestions.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSearchQuery('');
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-all"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-[10px] opacity-75 uppercase tracking-wider">{item.path.split('/').pop()}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No matching pages found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <button
            onClick={() => navigate('/graphura-admin/notifications')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-medium">
                  {adminProfile.name.charAt(0)}
                </span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                  {adminProfile.name}
                </p>
                <p className="text-xs text-gray-500">{adminProfile.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block group-hover:text-indigo-600 transition-colors" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {adminProfile.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{adminProfile.name}</p>
                      <p className="text-xs text-gray-500">{adminProfile.email}</p>
                      <span className="inline-block px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full mt-1">
                        {adminProfile.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/graphura-admin/profile');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/graphura-admin/settings/general');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GraphuraHeader;