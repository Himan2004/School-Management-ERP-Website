import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { selectParent, parentLogout } from '../../features/auth/parentAuthSlice';
import { fetchParentNotices, fetchParentNotifications, fetchParentProfile } from '../../services/parentDashboardApi';

const ParentNavbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const parent = useSelector(selectParent);
  const dropdownRef = useRef(null);

  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false); // Added for dropdown
  const [notifications, setNotifications] = useState([]); // Real notifications state (empty for now)
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Expanded and Comprehensive Search Dictionary (Mapped to Sidebar Routes)
  const searchTargets = [
    { keyword: "dashboard", path: "/parent/dashboard", label: "Overview & Dashboard" },
    { keyword: "attendance", path: "/parent/attendance", label: "Student Attendance & Leaves" },
    { keyword: "homework", path: "/parent/homework", label: "Assignments & Homework" },
    { keyword: "exam", path: "/parent/exam", label: "Exam & Results" },
    { keyword: "results", path: "/parent/exam", label: "Exam & Results" },
    { keyword: "fee status", path: "/parent/fee-status", label: "Fee Status & Dues" },
    { keyword: "pay fee", path: "/parent/pay-fee", label: "Pay Fee Online" },
    { keyword: "notices", path: "/parent/notices", label: "School Notices & Announcements" },
    { keyword: "meetings", path: "/parent/meetings", label: "Parent Teacher Meetings (PTM)" },
    { keyword: "ptm", path: "/parent/meetings", label: "Parent Teacher Meetings (PTM)" },
    { keyword: "id card", path: "/parent/id-card", label: "Student ID Card" },
    { keyword: "profile", path: "/parent/profile", label: "Student Profile Overview" },
    { keyword: "terms", path: "/parent/term", label: "Terms & Conditions" },
    { keyword: "policy", path: "/parent/policy", label: "Privacy & Policy" },
    { keyword: "settings", path: "/parent/settings", label: "Account Settings" }
  ];

  // Fetch Profile & Notifications on Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [notifRes] = await Promise.all([
          fetchParentNotifications().catch(() => ({ data: [] })) // catch error if backend not ready
        ]);

        if (notifRes && notifRes.data) {
          setNotifications(notifRes.data);
        }
      } catch (error) {
        console.error("Error loading parent data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await fetchParentNotices();
        if (response && response.success) {
          const list = response.data || [];
          const count = list.filter(notice => notice.unread).length;
          setUnreadCount(count);
        } else if (Array.isArray(response)) {
          const count = response.filter(notice => notice.unread).length;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Failed to load notifications for navbar:", err);
      }
    };
    loadUnreadCount();
  }, []);

  // Click outside suggestions close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = searchTargets.filter(
      item =>
        item.keyword.toLowerCase().includes(value.toLowerCase()) ||
        item.label.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (path) => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    navigate(path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Fixed logic: Use 'includes' instead of strict equality so partial typing works on Enter
    const match = searchTargets.find(
      item =>
        item.keyword.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query)
    );

    if (match) {
      setSearchQuery("");
      setShowSuggestions(false);
      navigate(match.path);
    } else {
      toast.error(`No matching page found for "${searchQuery}". Try searching for "attendance", "homework", etc.`);
    }
  };

  const handleLogoutClick = () => {
    dispatch(parentLogout())
      .then(() => {
        localStorage.removeItem("studentId");
        localStorage.removeItem("schoolId");
        toast.success("Logged out successfully");
        navigate("/login");
      })
      .catch((err) => {
        toast.error("Logout failed");
      });
  };

  const parentProfile = {
    name: parent?.name || "Parent User",
    email: parent?.email || parent?.loginId || "parent@school.edu",
    photo: parent?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(parent?.name || "Parent")}&background=0D8ABC&color=fff`
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
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}, {parent?.name || 'Parent'}
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
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
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
                    {notifications.filter(n => !n.read).length} New
                  </span>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length === 0 ? (
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
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
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
                                  {new Date(notification.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-800 mt-1">{notification.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => { setShowNotifications(false); navigate("/parent/notifications"); }}
                    className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 h-10 px-1.5 sm:px-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-200 overflow-hidden">
                <img
                  src={parentProfile.photo}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="font-semibold text-gray-800 truncate">{parentProfile.name}</p>
                    <p className="text-xs text-gray-500 truncate">Parent Account</p>
                  </div>
                  <div className="py-2">
                    <Link to="/parent/profile" onClick={() => setShowProfile(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="w-4 h-4 mr-2" /> Student Profile
                    </Link>
                    <Link to="/parent/settings" onClick={() => setShowProfile(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogoutClick} className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50">
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

export default ParentNavbar;