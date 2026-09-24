import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import { setUnreadNotificationsCount } from "../../features/auth/graphuraAuthSlice";

const MotionDiv = motion.div;
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  Mail,
  Calendar,
  School,
  Users,
  CreditCard,
  Settings,
  Download,
  RefreshCw,
  Trash2,
  CheckCheck,
  Eye,
  Clock,
  Filter,
  Search,
  Star,
  Award,
  MessageSquare,
  FileText,
} from "lucide-react";
import { format, isValid } from "date-fns";
import toast from "react-hot-toast";
import * as api from "../../services/api/graphuraApi";

const Notifications = () => {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const data = notifications || [];

  const fetchNotifications = async () => {
    setLoading(true);

    try {
      const response = await api.fetchSystemNotifications();
      const notifs = response.data?.data || [];
      setNotifications(notifs);
      const unreadCount = notifs.filter((n) => !n.read).length;
      dispatch(setUnreadNotificationsCount(unreadCount));
    } catch (error) {
      console.error("Fetch notifications error:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);

    if (!notification.read) {
      handleMarkRead(notification._id, true);
    }
  };

  useEffect(() => {
    if (showDetailsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailsModal]);

  const handleMarkRead = async (id, silent = false) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n._id === id ? { ...n, read: true } : n));
        const unreadCount = updated.filter((n) => !n.read).length;
        dispatch(setUnreadNotificationsCount(unreadCount));
        return updated;
      });
      if (!silent) toast.success("Notification marked as read");
    } catch {
      if (!silent) toast.error("Failed to mark as read");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) return;
    
    try {
      await Promise.all(data.map((n) => api.deleteNotification(n._id)));
      setNotifications([]);
      dispatch(setUnreadNotificationsCount(0));
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear some notifications");
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = data.filter((n) => !n.read).map((n) => n._id);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map((id) => api.markNotificationRead(id)));
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        const unreadCount = updated.filter((n) => !n.read).length;
        dispatch(setUnreadNotificationsCount(unreadCount));
        return updated;
      });
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => {
        const updated = prev
          .map((n) => (n._id === id ? { ...n, deleted: true } : n))
          .filter((n) => !n.deleted);
        const unreadCount = updated.filter((n) => !n.read).length;
        dispatch(setUnreadNotificationsCount(unreadCount));
        return updated;
      });
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(
        selectedNotifications.map((id) => api.deleteNotification(id)),
      );
      setNotifications((prev) => {
        const updated = prev.filter((n) => !selectedNotifications.includes(n._id));
        const unreadCount = updated.filter((n) => !n.read).length;
        dispatch(setUnreadNotificationsCount(unreadCount));
        return updated;
      });
      toast.success(`${selectedNotifications.length} notifications deleted`);
      setSelectedNotifications([]);
      setSelectAll(false);
    } catch {
      toast.error("Failed to delete some notifications");
    }
  };

  const getNotificationIcon = (type, category) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        if (category === "school")
          return <School className="w-5 h-5 text-blue-500" />;
        if (category === "subscription")
          return <CreditCard className="w-5 h-5 text-purple-500" />;
        if (category === "user")
          return <Users className="w-5 h-5 text-green-500" />;
        return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "critical":
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs animate-pulse">
            Critical
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
            High
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            Low
          </span>
        );
    }
  };

  const filteredNotifications = data.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || notification.type === filterType;
    const matchesRead =
      filterRead === "all" ||
      (filterRead === "read" && notification.read) ||
      (filterRead === "unread" && !notification.read);
    return matchesSearch && matchesType && matchesRead;
  });

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n) => n._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectNotification = (id) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter((i) => i !== id));
    } else {
      setSelectedNotifications([...selectedNotifications, id]);
    }
  };

  const stats = {
    total: data.length,
    unread: data.filter((n) => !n.read).length,
    read: data.filter((n) => n.read).length,
    critical: data.filter((n) => n.priority === "critical").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with platform activities and alerts
          </p>
        </div>
        <div className="flex gap-2">
          {selectedNotifications.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedNotifications.length})
            </button>
          )}
          <button
            onClick={handleMarkAllRead}
            disabled={stats.unread === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>

        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Notifications</span>
            <Bell className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Unread</span>
            <Bell className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.unread}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting attention</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Read</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.read}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Critical Alerts</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="info">Information</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Select All Bar */}
      {filteredNotifications.length > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
            <span className="text-xs text-gray-400">
              {filteredNotifications.length} notifications
            </span>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredNotifications.map((notification) => (
            <MotionDiv
              key={notification._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                !notification.read
                  ? "border-indigo-200 shadow-md"
                  : "border-gray-100"
              } hover:shadow-md`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification._id)}
                    onChange={() => handleSelectNotification(notification._id)}
                    className="mt-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />

                  {/* Icon */}
                  <div
                    className={`p-2 rounded-xl ${
                      !notification.read ? "bg-indigo-50" : "bg-gray-50"
                    }`}
                  >
                    {getNotificationIcon(
                      notification.type,
                      notification.category,
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3
                        className={`font-semibold ${!notification.read ? "text-gray-900" : "text-gray-700"}`}
                      >
                        {notification.title}
                      </h3>
                      {getPriorityBadge(notification.priority)}
                      {!notification.read && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const dateVal = notification.createdAt || notification.timestamp;
                          const date = dateVal ? new Date(dateVal) : null;
                          return date && isValid(date)
                            ? format(date, "PPP p")
                            : "Date unavailable";
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {notification.sender}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkRead(notification._id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleViewDetails(notification)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </MotionDiv>
          ))}
        </AnimatePresence>

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              No notifications available
            </h3>
            <p className="text-sm text-gray-500">You're all caught up!</p>
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      {createPortal(
        <AnimatePresence>
          {showDetailsModal && selectedNotification && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDetailsModal(false)}
            >
              <MotionDiv
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-xl">
                        {getNotificationIcon(
                          selectedNotification.type,
                          selectedNotification.category,
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          {selectedNotification.title}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const dateVal = selectedNotification.createdAt || selectedNotification.timestamp;
                            const date = dateVal ? new Date(dateVal) : null;
                            return date && isValid(date)
                              ? format(date, "PPP p")
                              : "Date unavailable";
                          })()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        Message
                      </h3>
                      <p className="text-gray-600">
                        {selectedNotification.message}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Type
                        </h3>
                        <p className="text-gray-600 capitalize">
                          {selectedNotification.type}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </h3>
                        <p className="text-gray-600 capitalize">
                          {selectedNotification.priority}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Category
                        </h3>
                        <p className="text-gray-600 capitalize">
                          {selectedNotification.category}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Sender
                        </h3>
                        <p className="text-gray-600">
                          {selectedNotification.sender}
                        </p>
                      </div>
                    </div>

                    {selectedNotification.actionUrl && (
                      <button
                        onClick={() => {
                          window.location.href = selectedNotification.actionUrl;
                        }}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-600">Syncing...</span>
        </div>
      )}
    </div>
  );
};

export default Notifications;
