// components/accountant/NotificationCenter.jsx
import React, { useState } from 'react';
import { X, Bell, FileText, Calendar } from 'lucide-react';

const NotificationCenter = ({ isOpen, onClose, notifications = [], isItemRead, onNotificationClick, loading }) => {
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'read'

    if (!isOpen) return null;

    // Helper to check if an item is read
    const checkRead = (item) => {
        if (isItemRead) return isItemRead(item);
        return item.isRead;
    };

    // Filter items based on tab
    const filteredNotifications = notifications.filter(item => {
        const read = checkRead(item);
        if (activeTab === 'unread') return !read;
        if (activeTab === 'read') return read;
        return true;
    });

    const totalCount = notifications.length;

    const unreadCount = notifications.filter(n => !checkRead(n)).length;
    const readCount = notifications.filter(n => checkRead(n)).length;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 transition-all duration-300">
            {/* Modal Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Bell size={20} className="text-blue-600 animate-bounce" />
                            Notification Center
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-400 font-semibold mt-0.5">
                            Total Notifications: {totalCount}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-850">
                    {['all', 'unread', 'read'].map((tab) => {
                        const count = tab === 'all' 
                            ? totalCount 
                            : tab === 'unread' 
                                ? unreadCount 
                                : readCount;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-4 border-b-2 text-xs md:text-sm font-bold capitalize transition-all relative flex items-center gap-1.5 ${
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                            >
                                {tab}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    activeTab === tab 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-slate-100 text-slate-650 dark:bg-slate-700 dark:text-slate-350'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 max-h-[70vh] bg-slate-50/50 dark:bg-slate-900/10 space-y-4">
                    {loading && filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs text-slate-500 font-medium">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Bell size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-sm font-bold text-slate-750 dark:text-slate-300">
                                {activeTab === 'unread' ? 'No unread notifications' : activeTab === 'read' ? 'No read notifications' : 'No notifications available'}
                            </h3>
                            <p className="text-xs text-slate-450 mt-1 max-w-xs leading-relaxed">
                                When new communications are posted, they will appear here.
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((item) => {
                            const read = checkRead(item);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onNotificationClick && onNotificationClick(item)}
                                    className={`p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm transition-all duration-200 cursor-pointer relative hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 flex gap-4 ${
                                        !read ? 'border-l-4 border-l-blue-600' : 'border-l-4 border-l-slate-300'
                                    }`}
                                >
                                    {/* Icon Column */}
                                    <div className="mt-0.5 flex-shrink-0">
                                        {item.type === 'notice' && (
                                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                                <FileText size={18} />
                                            </div>
                                        )}
                                        {item.type === 'meeting' && (
                                            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                                                <Calendar size={18} />
                                            </div>
                                        )}
                                        {item.type === 'event' && (
                                            <div className="p-2 bg-orange-50 dark:bg-orange-950/40 text-orange-650 dark:text-orange-405 rounded-xl">
                                                <Calendar size={18} className="text-orange-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Column */}
                                    <div className="flex-1 min-w-0 font-sans">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                item.source === 'PRINCIPAL' 
                                                    ? 'bg-purple-100 text-purple-750 dark:bg-purple-950/50 dark:text-purple-450' 
                                                    : 'bg-blue-100 text-blue-750 dark:bg-blue-950/50 dark:text-blue-450'
                                            }`}>
                                                {item.source}
                                            </span>
                                            <span className={`capitalize text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                                item.type === 'notice' ? 'bg-slate-105 text-slate-600' :
                                                item.type === 'meeting' ? 'bg-indigo-50 text-indigo-650' : 'bg-amber-50 text-amber-650'
                                            }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-auto">
                                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        <h4 className={`text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 ${!read ? 'text-blue-900 dark:text-blue-400' : ''}`}>
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                            {item.content}
                                        </p>

                                        {item.type === 'meeting' && (
                                            <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg text-[11px] text-slate-650 dark:text-slate-400 space-y-1 border border-slate-100 dark:border-slate-700/50">
                                                {item.venue && <div>📍 <span className="font-bold">Venue:</span> {item.venue}</div>}
                                                {item.duration && <div>⏱️ <span className="font-bold">Duration:</span> {item.duration} mins</div>}
                                                {item.isOnline && item.meetingLink && (
                                                    <div className="text-blue-600 hover:underline">
                                                        💻 Join Meeting: <a href={item.meetingLink} target="_blank" rel="noopener noreferrer">{item.meetingLink}</a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
