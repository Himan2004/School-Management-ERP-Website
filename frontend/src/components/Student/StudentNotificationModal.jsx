import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckSquare, ShieldAlert, Award, Calendar, BookOpen, Volume2, ExternalLink } from 'lucide-react';

const StudentNotificationModal = ({
  isOpen,
  onClose,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  navigate
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'attendance': return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      case 'result': return <Award className="w-4 h-4 text-green-500" />;
      case 'leave': return <Calendar className="w-4 h-4 text-teal-500" />;
      case 'notice': return <BookOpen className="w-4 h-4 text-blue-500" />;
      default: return <Volume2 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryBg = (type) => {
    switch (type) {
      case 'attendance': return 'bg-orange-50';
      case 'result': return 'bg-green-50';
      case 'leave': return 'bg-teal-50';
      case 'notice': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
          
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="pointer-events-auto w-screen max-w-md"
            >
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl animate-slide-in-right">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 sm:px-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                      <Bell className="w-5 h-5" /> Notifications ({unreadCount} unread)
                    </h2>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        className="rounded-md text-white/80 hover:text-white focus:outline-none"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close panel</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-indigo-100 hover:text-white font-medium flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 py-6 px-4 sm:px-6">
                  <div className="space-y-4">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-xl border border-gray-100 transition-all cursor-pointer hover:bg-gray-50/50 ${
                            !notification.read ? 'bg-indigo-50/20 border-l-4 border-indigo-600' : ''
                          }`}
                          onClick={() => {
                            markNotificationRead(notification.id);
                            if (notification.link) {
                              navigate(notification.link);
                              onClose();
                            }
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={`p-2 rounded-xl h-fit ${getCategoryBg(notification.type)}`}>
                              {getCategoryIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-800 truncate">{notification.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                              <div className="flex items-center justify-between mt-3 text-[10px] text-gray-400">
                                <span>
                                  {new Date(notification.timestamp).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-700">
                                  View details <ExternalLink className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium text-sm">No notifications available</p>
                        <p className="text-xs text-gray-400 mt-1">You are all caught up!</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 p-4 bg-gray-50 text-center">
                  <button
                    onClick={() => {
                      navigate('/student/notifications');
                      onClose();
                    }}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-md transition-all"
                  >
                    See All Notifications
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default StudentNotificationModal;