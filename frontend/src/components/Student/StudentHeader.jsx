import React, { useState, useEffect, useRef } from 'react';
import {motion , AnimatePresence } from 'framer-motion';
import { 
  Bell, ChevronDown, User, Settings, LogOut, HelpCircle, Menu, X,
  Clock, Calendar, Sparkles, Coffee, Star, Search, Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const searchableRoutes = [
  {
    name: 'Dashboard',
    path: '/student/dashboard',
    keywords: ['dashboard', 'home', 'index', 'overview', 'main', 'notices', 'announcements']
  },
  {
    name: 'Attendance',
    path: '/student/attendance',
    keywords: ['attendance', 'present', 'absent', 'class attendance', 'records', 'att', 'history']
  },
  {
    name: 'Results',
    path: '/student/results',
    keywords: ['results', 'grades', 'scores', 'performance', 'rank', 'report', 'card']
  },
  {
    name: 'Homework',
    path: '/student/homework',
    keywords: ['homework', 'assignments', 'tasks', 'due', 'work', 'ho']
  },
  {
    name: 'Timetable',
    path: '/student/timetable',
    keywords: ['timetable', 'schedule', 'classes', 'calendar', 'time', 'routine']
  },
  {
    name: 'Exams',
    path: '/student/exams',
    keywords: ['exams', 'test', 'schedule', 'routine', 'dates', 'examination']
  },
  {
    name: 'Marksheet',
    path: '/student/marksheet',
    keywords: ['marksheet', 'report', 'card', 'marks', 'academic', 'scores', 'mar']
  },
  {
    name: 'Bus Info',
    path: '/student/bus-timing',
    keywords: ['bus info', 'transport', 'timing', 'route', 'bus', 'pick', 'drop']
  },
  {
    name: 'Study Material',
    path: '/student/study-material',
    keywords: ['study material', 'notes', 'syllabus', 'books', 'pdf', 'resources']
  },
  {
    name: 'Leave',
    path: '/student/leave',
    keywords: ['leave', 'apply', 'sick', 'holiday', 'request', 'leave application']
  },
  {
    name: 'Performance',
    path: '/student/performance',
    keywords: ['performance', 'analytics', 'progress', 'rank', 'chart', 'graphs']
  },
  {
    name: 'Events',
    path: '/student/events',
    keywords: ['events', 'activities', 'sports', 'cultural', 'programs', 'calendar']
  },
  {
    name: 'ID Card',
    path: '/student/id-card',
    keywords: ['id card', 'profile', 'card', 'identity', 'id', 'student id']
  },
  {
    name: 'Notifications',
    path: '/student/notifications',
    keywords: ['notifications', 'alerts', 'announcements', 'notices', 'updates', 'unread', 'inbox', 'notice', 'homework due'],
    action: 'notifications'
  }
];

const StudentHeader = ({ 
  studentData, 
  currentTime, 
  notifications,
  showNotifications,
  setShowNotifications,
  handleLogout,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  setMobileSidebarOpen
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();

      const handleClickOutside = (event) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
          setShowSearch(false);
          setSearchQuery('');
        }
      };

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          setShowSearch(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showSearch]);

  const getSuggestions = (query) => {
    if (!query || query.trim() === '') return [];
    const cleanQuery = query.toLowerCase().trim();
    return searchableRoutes.filter(route => {
      if (route.name.toLowerCase().includes(cleanQuery)) return true;
      return route.keywords.some(keyword => keyword.toLowerCase().includes(cleanQuery));
    });
  };

  const suggestions = getSuggestions(searchQuery);

  const handleSuggestionClick = (route) => {
    setShowSearch(false);
    setSearchQuery('');
    if (route.action === 'notifications') {
      setShowNotifications(true);
    } else {
      navigate(route.path);
    }
  };

  const getGreetingData = () => {
    try {
      const hour = new Date().getHours();
      if (hour < 12) {
        return { greeting: 'Good Morning', icon: <Coffee className="w-4 h-4 text-yellow-500" /> };
      } else if (hour < 17) {
        return { greeting: 'Good Afternoon', icon: <Sun className="w-4 h-4 text-orange-500" /> };
      } else {
        return { greeting: 'Good Evening', icon: <Star className="w-4 h-4 text-purple-500" /> };
      }
    } catch (err) {
      console.error('Failed to generate greeting:', err);
      return { greeting: 'Welcome', icon: <Coffee className="w-4 h-4 text-yellow-500" /> };
    }
  };

  const { greeting, icon: greetingIcon } = getGreetingData() || { greeting: 'Welcome', icon: <Coffee className="w-4 h-4 text-yellow-500" /> };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'warning': return <Bell className="w-4 h-4 text-orange-500" />;
      case 'success': return <Star className="w-4 h-4 text-green-500" />;
      case 'info': return <Bell className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationBg = (type) => {
    switch(type) {
      case 'warning': return 'bg-orange-50 border-orange-100';
      case 'success': return 'bg-green-50 border-green-100';
      case 'info': return 'bg-blue-50 border-blue-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    // <header 
    //   className={`fixed top-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm transition-all duration-300 ease-in-out`}
    //   style={{
    //     left: sidebarOpen ? '256px' : '80px',
    //   }}
    // >
    <header 
      className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative"
    >


      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {/* Left Section - Menu Button & Greeting */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-[#223F74] hidden md:block whitespace-nowrap">
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}, {studentData?.name?.split(' ')[0] || 'Student'}
          </h2>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">




          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
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
                  {notifications?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">No new notifications</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">You're all caught up! When there are important updates, they will appear here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {notifications?.map((notification, idx) => (
                        <div 
                          key={notification.id || idx} 
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => {
                            markNotificationRead(notification.id);
                            if (notification.link) {
                              navigate(notification.link);
                              setShowNotifications(false);
                            }
                          }}
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
                                  {new Date(notification.timestamp || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-800 mt-1">{notification.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button 
                    onClick={() => { setShowNotifications(false); navigate("/student/notifications"); }}
                    className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div> 

          {/* User Menu - Only Profile, Settings, Logout */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200">
                {studentData?.name?.charAt(0) || 'S'}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="font-semibold text-gray-800">{studentData?.name}</p>
                    <p className="text-xs text-gray-500">{studentData?.email}</p>
                    <p className="text-xs text-indigo-600 mt-1">{studentData?.class}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate('/student/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate('/student/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
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

      {/* Mobile Greeting */}
      {/* <div className="md:hidden px-6 pb-3">
        <div className="flex items-center gap-2">
          {greetingIcon}
          <div>
            <p className="text-sm font-medium text-gray-700">{greeting}, {studentData?.name?.split(' ')[0] || 'Student'}</p>
            <p className="text-xs text-gray-500">{studentData?.class} • Roll: {studentData?.rollNo}</p>
          </div>
        </div>
      </div> */}
    </header>
  );
};

export default StudentHeader;
