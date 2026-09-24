/* eslint-disable */
// components/Layout/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  PlusCircle,
  User,
  Settings,
  LogOut,
  Menu,
  Users,
  BookOpen,
  FileText,
  Loader2,
  Compass,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTeacher } from '../../features/auth/teacherAuthSlice';
import UserAvatar from '../common/UserAvatar';
import { selectTeacherLoading } from '../../features/auth/teacherAuthSlice';
import { teacherLogout } from '../../features/auth/teacherAuthSlice';
import api from '../../services/api';

const navigationItems = [
  { label: 'Dashboard', path: '/teacher/dashboard' },
  { label: 'My Classes', path: '/teacher/my-classes' },
  { label: 'Students', path: '/teacher/students' },
  { label: 'Attendance', path: '/teacher/attendance' },
  { label: 'Student Leave', path: '/teacher/leave' },
  { label: 'Assignments', path: '/teacher/assignments' },
  { label: 'Exams & Grades', path: '/teacher/exams-grades' },
  { label: 'Announcements', path: '/teacher/announcements' },
  { label: 'Messages', path: '/teacher/messages' },
  { label: 'Calendar', path: '/teacher/calendar' },
  { label: 'Profile', path: '/teacher/profile' },
  { label: 'Settings', path: '/teacher/settings' },
];

const Navbar = ({ collapsed, onMenuClick }) => {
  const [showProfile, setShowProfile] = useState(false);
  const teacher = useSelector(selectTeacher);
  const isLoggingOut = useSelector(selectTeacherLoading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleLogout = async () => {
    try {
      await dispatch(teacherLogout()).unwrap();
      toast.success('Logout successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err || 'Logout failed');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ navigation: [], students: [], classes: [], assignments: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const notificationRef = useRef(null);

  const [showMessages, setShowMessages] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const messageDropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await api.get('/teacher/notifications');
      if (response.data?.success) {
        setNotifications(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      setConversationsLoading(true);
      const response = await api.get('/messages/conversations');
      if (response.data?.success) {
        setConversations(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchConversations();
    // Poll notifications & conversations every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchConversations();
    }, 10005);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleToggleMessages = () => {
    if (!showMessages) {
      fetchConversations();
    }
    setShowMessages(!showMessages);
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await api.post('/teacher/notifications/mark-all-read');
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('Failed to update notifications');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      await api.patch(`/teacher/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleLeaveAction = async (leaveId, action, notificationId) => {
    try {
      await api.patch(`/teacher/leave/${leaveId}`, { status: action });
      toast.success(`Leave request ${action} successfully`);
      if (notificationId) {
        handleMarkRead(notificationId);
      }
      fetchNotifications();
    } catch (err) {
      console.error('Failed to update leave status:', err);
      toast.error(err.response?.data?.message || 'Failed to update leave status');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'assignments') return n.source === 'Assignment Activity';
    if (activeTab === 'leave') return n.source === 'Leave Request';
    if (activeTab === 'notices') return n.source === 'Principal' || n.source === 'Super Admin';
    if (activeTab === 'messages') return n.source === 'Messages';
    return true;
  });

  const getFlatResults = () => {
    const flat = [];
    searchResults.navigation.forEach(item => flat.push({ type: 'nav', id: item.path, data: item }));
    searchResults.classes.forEach(item => flat.push({ type: 'class', id: item.id, data: item }));
    searchResults.students.forEach(item => flat.push({ type: 'student', id: item.id, data: item }));
    searchResults.assignments.forEach(item => flat.push({ type: 'assignment', id: item.id, data: item }));
    return flat;
  };

  useEffect(() => {
    setSelectedIndex(-1); // Reset selected keyboard index when search input changes

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults({ navigation: [], students: [], classes: [], assignments: [] });
      setIsSearching(false);
      return;
    }

    const query = searchQuery.trim();
    const lowered = query.toLowerCase();

    // Local navigation search for fast feedback
    const matchedNav = navigationItems.filter(item =>
      item.label.toLowerCase().includes(lowered)
    );

    setSearchResults(prev => ({
      ...prev,
      navigation: matchedNav
    }));

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const [studentsRes, classesRes, assignmentsRes] = await Promise.all([
          api.get('/teacher/students', { params: { search: query, limit: 5 } }).catch(() => null),
          api.get('/teacher/classes').catch(() => null),
          api.get('/teacher/assignments', { params: { search: query, limit: 5 } }).catch(() => null)
        ]);

        const students = studentsRes?.data?.success ? (studentsRes.data.data?.students || []) : [];
        const rawClasses = classesRes?.data?.success ? (classesRes.data.data || []) : [];
        const assignments = assignmentsRes?.data?.success ? (assignmentsRes.data.data?.assignments || []) : [];

        const classes = rawClasses.filter(c =>
          (c.className || '').toLowerCase().includes(lowered) ||
          (c.subject || '').toLowerCase().includes(lowered)
        );

        setSearchResults(prev => ({
          ...prev,
          students: students.slice(0, 5),
          classes: classes.slice(0, 5),
          assignments: assignments.slice(0, 5)
        }));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (messageDropdownRef.current && !messageDropdownRef.current.contains(event.target)) {
        setShowMessages(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (item) => {
    if (item.type === 'nav') {
      navigate(item.data.path);
    } else if (item.type === 'student') {
      navigate(`/teacher/student/${item.id}`);
    } else if (item.type === 'class') {
      navigate(`/teacher/class/${item.id}`);
    } else if (item.type === 'assignment') {
      navigate(`/teacher/assignments/${item.id}/submissions`);
    }
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (!showSearchDropdown || searchQuery.trim().length < 2) return;
    const flatResults = getFlatResults();
    if (flatResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIndex = selectedIndex >= 0 && selectedIndex < flatResults.length ? selectedIndex : 0;
      const targetItem = flatResults[targetIndex];
      if (targetItem) {
        handleSelectItem(targetItem);
      }
    } else if (e.key === "Escape") {
      setShowSearchDropdown(false);
      setSearchQuery('');
    }
  };

  const handleCreateAssignment = () => {
    navigate('/teacher/assignments', { state: { openCreateModal: true } });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">

        {/* Left Section - Menu Button & Greeting */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <h2 className="text-xl font-bold text-[#223F74] hidden md:block whitespace-nowrap">
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}, {teacher?.name || 'Teacher'}
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
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-[320px] sm:w-[420px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-sm">Recent Notifications</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {notifications.filter(n => !n.read).length} New
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 py-1.5 overflow-x-auto scrollbar-none gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'assignments', label: 'Assignments' },
                    { id: 'leave', label: 'Leave' },
                    { id: 'notices', label: 'Notices' },
                    { id: 'messages', label: 'Messages' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus:outline-none ${activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notifications List */}
                <div className="max-h-[350px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center p-8 gap-2">
                      <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                      <span className="text-sm text-slate-500">Loading...</span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">No new notifications</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">You're all caught up! When there are important updates, they will appear here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {filteredNotifications.map(n => {
                        const isLeave = n.source === 'Leave Request';
                        const isAssignment = n.source === 'Assignment Activity';
                        const isNotice = n.source === 'Principal' || n.source === 'Super Admin';
                        const isMsg = n.source === 'Messages';

                        return (
                          <div
                            key={n._id}
                            onClick={() => handleMarkRead(n._id)}
                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Notification icon */}
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                {isLeave && <Calendar className="w-5 h-5" />}
                                {isAssignment && <FileText className="w-5 h-5" />}
                                {isNotice && <Bell className="w-5 h-5" />}
                                {isMsg && <MessageSquare className="w-5 h-5" />}
                                {!isLeave && !isAssignment && !isNotice && !isMsg && <Bell className="w-5 h-5" />}
                              </div>

                              {/* Notification body */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                    {n.source || 'Notification'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 mt-1">{n.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>

                                {/* Inline action buttons */}
                                {isLeave && n.metadata?.leaveId && (
                                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                    {(n.title.toLowerCase().includes('pending') || (!n.title.toLowerCase().includes('approved') && !n.title.toLowerCase().includes('rejected'))) ? (
                                      <>
                                        <button
                                          onClick={() => handleLeaveAction(n.metadata.leaveId, 'approved', n._id)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleLeaveAction(n.metadata.leaveId, 'rejected', n._id)}
                                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    ) : null}
                                    <button
                                      onClick={() => {
                                        setShowNotifications(false);
                                        navigate('/teacher/leave');
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                                    >
                                      View
                                    </button>
                                  </div>
                                )}

                                {isAssignment && n.metadata?.homeworkId && (
                                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        setShowNotifications(false);
                                        navigate(`/teacher/assignments/${n.metadata.homeworkId}/submissions`);
                                      }}
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                    >
                                      View Submissions
                                    </button>
                                  </div>
                                )}

                                {isNotice && (
                                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        setShowNotifications(false);
                                        navigate('/teacher/announcements');
                                      }}
                                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                    >
                                      Open Notices
                                    </button>
                                  </div>
                                )}

                                {isMsg && (
                                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        setShowNotifications(false);
                                        navigate('/teacher/messages');
                                      }}
                                      className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                    >
                                      View Chat
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50 flex gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-1/2 py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Mark All as Read
                  </button>
                  <button
                    onClick={() => { setShowNotifications(false); navigate("/teacher/announcements"); }}
                    className="w-1/2 py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200">
                <UserAvatar name={teacher?.name} photo={teacher?.photo} size="sm" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="font-semibold text-gray-800 truncate">{teacher?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{teacher?.email}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      to="/teacher/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfile(false)}
                    >
                      <User className="w-4 h-4 mr-2" /> Profile
                    </Link>
                    <Link
                      to="/teacher/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfile(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Logout
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

export default Navbar;

