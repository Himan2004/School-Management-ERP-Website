import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, Bell, User, Settings, LogOut, X, Search, Loader2, Calendar, ShieldAlert, AlertTriangle, MessageSquare, BookOpen, Award, Volume2, CheckSquare, ExternalLink, UserPlus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { selectIsDarkMode } from '../../features/theme/themeSlice.js';
import { logoutAdmin } from '../../features/auth/adminAuthSlice.js';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { DataField } from '../shared/Common_Components.jsx';
import { adminMenuItems } from '../../config/adminMenu.js';

const pathMap = {
    '/admin/dashboard': 'Admin Dashboard',
    '/admin/classes': 'Add Lectures',
    '/admin/teachers': 'Add Teachers',
    '/admin/teachers/manage': 'Manage Staff',
    '/admin/tasks': 'Tasks',
    '/admin/exam': 'Exam Schedule',
    '/admin/leaves': 'Leave Requests',
    '/admin/notice': 'Notice Board',
    '/admin/finance': 'Finance',
    '/admin/settings': 'Settings',
    '/admin/profile': 'Profile',
    '/admin/students/manage': 'Students Manage',
    '/admin/admissions': 'Admission Details',
    '/admin/report/academic-reports': 'Academic Reports',
    '/admin/report/staff-performance': 'Staff Performance',
    '/admin/report/attendance-reports': 'Student Attendance',
    '/admin/report/exam-reports': 'Exam Reports',
};

const searchableRoutes = adminMenuItems.reduce((acc, item) => {
    if (item.children) {
        item.children.forEach(child => {
            if (child.path) {
                acc.push({
                    name: child.label,
                    path: child.path,
                    keywords: child.keywords || []
                });
            }
        });
    } else if (item.path) {
        acc.push({
            name: item.label,
            path: item.path,
            keywords: item.keywords || []
        });
    }
    return acc;
}, []);

const getPageTitle = (pathname) => {
    // Remove MongoDB hex ID (24-character hex string) from pathname segments to avoid displaying it in UI
    const cleanedPathname = '/' + pathname
        .split('/')
        .filter(part => !/^[0-9a-fA-F]{24}$/.test(part))
        .filter(Boolean)
        .join('/');

    if (pathMap[cleanedPathname]) return pathMap[cleanedPathname];
    
    // fallback dynamic parsing, e.g. /admin/classes/detail -> "Classes Detail"
    const parts = cleanedPathname.split('/').filter(Boolean);
    if (parts.length > 1) {
        return parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    return 'Admin Panel';
};

export default function Header({ setMobileSidebarOpen, mobileSidebarOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const darkMode = useSelector(selectIsDarkMode);
    const authUser = useSelector((state) => state.adminAuth.authUser);

    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const profileRef = useRef(null);
    const notificationRef = useRef(null);

    // Search Component States & Refs
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const searchContainerRef = useRef(null);

    const openMobileSearch = () => {
        setIsMobileSearchOpen(true);
        setTimeout(() => {
            const searchInput = searchContainerRef.current?.querySelector('input');
            if (searchInput) {
                searchInput.focus();
                setSearchQuery('');
                setSelectedIndex(-1);
            }
        }, 100);
    };

    const closeMobileSearch = () => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
    };

    const getSuggestions = (query) => {
        if (!query || query.trim() === '') return [];
        const cleanQuery = query.toLowerCase().trim();
        return searchableRoutes.filter(route => {
            if (route.name.toLowerCase().includes(cleanQuery)) return true;
            return route.keywords.some(keyword => keyword.toLowerCase().includes(cleanQuery));
        });
    };

    const suggestions = getSuggestions(searchQuery);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setSearchQuery('');
                setSelectedIndex(-1);
                setIsMobileSearchOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setSearchQuery('');
                setSelectedIndex(-1);
                setIsMobileSearchOpen(false);
                searchContainerRef.current?.querySelector('input')?.blur();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, []);

    // Keyboard navigation handlers
    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prevIndex) => 
                prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prevIndex) => 
                prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = suggestions[selectedIndex >= 0 ? selectedIndex : 0];
            if (selected) {
                handleSuggestionClick(selected);
            }
        }
    };

    const handleSuggestionClick = (route) => {
        setSearchQuery('');
        setSelectedIndex(-1);
        navigate(route.path);
    };

    // Handle global keyboard shortcuts (e.g. '/' or 'Ctrl+K' to focus search)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (
                (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) ||
                ((e.ctrlKey || e.metaKey) && e.key === 'k')
            ) {
                e.preventDefault();
                setIsMobileSearchOpen(true);
                setTimeout(() => {
                    const searchInput = searchContainerRef.current?.querySelector('input');
                    if (searchInput) {
                        searchInput.focus();
                        setSearchQuery('');
                        setSelectedIndex(-1);
                    }
                }, 100);
            }
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Admin Notifications Logic
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    const getNotificationStyle = (notification) => {
        const sourceLower = (notification.source || '').toLowerCase();
        const titleLower = (notification.title || '').toLowerCase();
        const typeLower = (notification.type || '').toLowerCase();

        if (sourceLower.includes('admission') || typeLower === 'admissions') {
            return {
                icon: <UserPlus className="w-4 h-4 text-indigo-500" />,
                bg: darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
                badgeBg: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30'
            };
        }

        if (sourceLower.includes('leave')) {
            return {
                icon: <Calendar className="w-4 h-4 text-amber-500" />,
                bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50',
                badgeBg: 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
            };
        }
        if (sourceLower.includes('ticket') || sourceLower.includes('complaint') || sourceLower.includes('support')) {
            if (sourceLower.includes('student')) {
                return {
                    icon: <ShieldAlert className="w-4 h-4 text-orange-500" />,
                    bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50',
                    badgeBg: 'bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30'
                };
            } else if (sourceLower.includes('parent')) {
                return {
                    icon: <ShieldAlert className="w-4 h-4 text-teal-500" />,
                    bg: darkMode ? 'bg-teal-500/10' : 'bg-teal-50',
                    badgeBg: 'bg-teal-100 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/30'
                };
            } else if (sourceLower.includes('transport') || sourceLower.includes('bus') || sourceLower.includes('driver') || sourceLower.includes('route')) {
                return {
                    icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
                    bg: darkMode ? 'bg-rose-500/10' : 'bg-rose-50',
                    badgeBg: 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                };
            }
            return {
                icon: <ShieldAlert className="w-4 h-4 text-indigo-500" />,
                bg: darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
                badgeBg: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30'
            };
        }
        if (sourceLower.includes('query') || sourceLower.includes('request')) {
            return {
                icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
                bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                badgeBg: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
            };
        }
        if (sourceLower.includes('notice') || sourceLower.includes('announcement') || sourceLower.includes('directive') || sourceLower.includes('principal') || sourceLower.includes('super admin')) {
            return {
                icon: <BookOpen className="w-4 h-4 text-violet-500" />,
                bg: darkMode ? 'bg-violet-500/10' : 'bg-violet-50',
                badgeBg: 'bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/30'
            };
        }
        if (titleLower.includes('exam') || typeLower === 'result' || typeLower === 'event') {
            return {
                icon: <Award className="w-4 h-4 text-emerald-500" />,
                bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
                badgeBg: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
            };
        }
        return {
            icon: <Volume2 className="w-4 h-4 text-slate-500" />,
            bg: darkMode ? 'bg-slate-500/10' : 'bg-slate-50',
            badgeBg: 'bg-slate-100 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-900/30'
        };
    };

    const fetchNotifications = async () => {
        try {
            setNotificationsLoading(true);
            const response = await api.get('/admin/notifications');
            if (response.data?.success) {
                const rawList = response.data.data || [];
                const filtered = rawList.filter(n => {
                    const titleLower = (n.title || '').toLowerCase();
                    return !(titleLower.includes('approved') || titleLower.includes('rejected') || titleLower.includes('cancelled'));
                });
                setNotifications(filtered);
            }
        } catch (err) {
            console.error('Failed to fetch admin notifications:', err);
        } finally {
            setNotificationsLoading(false);
        }
    };

    const handleMarkRead = async (id, link, highlightId) => {
        try {
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            await api.patch(`/admin/notifications/${id}/read`);
            if (link) {
                navigate(link, { state: { highlightId } });
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            await api.post('/admin/notifications/mark-all-read');
            toast.success('All notifications marked as read');
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
            toast.error('Failed to update notifications');
        }
    };

    const getNotificationLink = (notification) => {
        const sourceLower = (notification.source || '').toLowerCase();
        const titleLower = (notification.title || '').toLowerCase();
        const typeLower = (notification.type || '').toLowerCase();
        
        if (sourceLower.includes('admission') || typeLower === 'admissions') {
            return '/admin/admissions/request';
        }
        if (sourceLower.includes('leave')) return '/admin/leaves';
        if (sourceLower.includes('ticket') || sourceLower.includes('complaint') || sourceLower.includes('query') || sourceLower.includes('request') || sourceLower.includes('support') || typeLower === 'ticket') {
            return '/admin/notifications';
        }
        if (sourceLower.includes('notice') || sourceLower.includes('announcement') || sourceLower.includes('directive')) {
            return '/admin/notice';
        }
        if (titleLower.includes('exam') || sourceLower.includes('exam') || sourceLower.includes('principal')) {
            return '/admin/exam';
        }
        return '/admin/dashboard';
    };

    useEffect(() => {
        fetchNotifications();
        // Poll notifications every 10 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Dynamic initials
    const initials = authUser?.name 
        ? authUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
        : 'AD';

    const pageTitle = getPageTitle(location.pathname);

    const [currentTime, setCurrentTime] = useState(new Date());

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

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        dispatch(logoutAdmin()).unwrap().then(() => {
            toast.success("Logged out successfully");
            navigate("/login");
        }).catch((err) => {
            console.error("Logout failed:", err);
            // fallback
            localStorage.removeItem('token');
            navigate("/login");
        });
    };

    return (
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative">
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
                        {getGreeting()}, {authUser?.name || "Admin"}
                    </h2>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => {
                                setNotificationsOpen(!notificationsOpen);
                                setProfileOpen(false);
                            }}
                            className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {notifications.filter(n => !n.read).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                    {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {notificationsOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-center gap-2 text-slate-800">
                                        <Bell className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-sm">Recent Notifications</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                        {notifications.filter(n => !n.read).length} New
                                    </span>
                                </div>
                                
                                <div className="max-h-[350px] overflow-y-auto">
                                    {notificationsLoading && notifications.length === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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
                                            {notifications.slice(0, 10).map((n) => (
                                                <div 
                                                    key={n._id} 
                                                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                                                    onClick={() => {
                                                        setNotificationsOpen(false);
                                                        handleMarkRead(n._id, getNotificationLink(n), n.metadata?.messageId);
                                                    }}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                            <Bell className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                                                    {n.source || 'Notification'}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(n.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-slate-800 mt-1">{n.title}</h4>
                                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-2 border-t border-slate-100 bg-slate-50 flex gap-2">
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="w-1/2 py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                    >
                                        Mark All Read
                                    </button>
                                    <button 
                                        onClick={() => { setNotificationsOpen(false); navigate("/admin/notifications"); }}
                                        className="w-1/2 py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                    >
                                        View All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div> 

                    {/* User Profile */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => {
                                setProfileOpen(!profileOpen);
                                setNotificationsOpen(false);
                            }}
                            className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200">
                                {initials}
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                        </button>

                        {profileOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                        <p className="font-semibold text-gray-800 truncate">{authUser?.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{authUser?.email}</p>
                                    </div>
                                    <div className="py-2">
                                        <button
                                            onClick={() => {
                                                setProfileOpen(false);
                                                navigate('/admin/profile');
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <User className="w-4 h-4" /> My Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                setProfileOpen(false);
                                                navigate('/admin/settings');
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" /> Settings
                                        </button>
                                        <hr className="my-1" />
                                        <button
                                            onClick={() => {
                                                setProfileOpen(false);
                                                handleLogout();
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
}
