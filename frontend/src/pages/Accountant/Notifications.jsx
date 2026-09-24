import React, { useState, useEffect } from 'react';
import { getAccountantCommunications, markAccountantNoticeRead } from '../../services/AccountantDashboard';
import { Heading, DashCard, DashGrid, EnhancedDashCard } from '../../components/shared/Common_Components';
import { Bell, FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [readNotificationIds, setReadNotificationIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('all'); // all, unread, read

    useEffect(() => {
        fetchCommunications();
    }, []);

    const fetchCommunications = async () => {
        try {
            setLoading(true);
            const res = await getAccountantCommunications();
            if (res.data?.success) {
                setNotifications(res.data.data.communications || []);
            }
        } catch (error) {
            console.error('Error fetching communications:', error);
            toast.error("Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    };

    const isItemRead = (item) => item.isRead || readNotificationIds.has(item.id);

    const handleNotificationClick = async (item) => {
        if (!isItemRead(item)) {
            setReadNotificationIds(prev => new Set(prev).add(item.id));
            if (item.type === 'notice') {
                try {
                    await markAccountantNoticeRead(item.id);
                } catch (error) {
                    console.error('Error marking notice as read:', error);
                }
            }
        }

        if (item.type === 'meeting' && item.meetingLink && item.isOnline) {
            window.open(item.meetingLink, '_blank');
        }
    };

    const filteredNotifications = notifications.filter(item => {
        const read = isItemRead(item);
        if (activeTab === 'unread') return !read;
        if (activeTab === 'read') return read;
        return true;
    });

    const unreadCount = notifications.filter(n => !isItemRead(n)).length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <Heading
                    primaryText="Notification"
                    secondaryText="Center"
                />
            </div>

            <DashGrid>
                <EnhancedDashCard
                    title="Total Notifications"
                    value={notifications.length}
                    icon={<Bell size={22} />}
                    accentColor="#3b82f6"
                    size={4}
                />
                <EnhancedDashCard
                    title="Unread"
                    value={unreadCount}
                    icon={<FileText size={22} />}
                    accentColor="#ef4444"
                    size={4}
                />
                <EnhancedDashCard
                    title="Read"
                    value={notifications.length - unreadCount}
                    icon={<CheckCircle2 size={22} />}
                    accentColor="#10b981"
                    size={4}
                />
            </DashGrid>


            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    {['all', 'unread', 'read'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 text-sm font-bold capitalize transition-colors border-b-2 ${
                                activeTab === tab 
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-6 min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                            <CheckCircle2 size={56} className="mb-4 opacity-40" />
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">You're all caught up!</h3>
                            <p className="text-sm mt-2">No {activeTab !== 'all' ? activeTab : ''} notifications found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredNotifications.map((item) => {
                                const read = isItemRead(item);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleNotificationClick(item)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 md:gap-6 ${
                                            !read 
                                                ? 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30 hover:border-blue-200 hover:shadow-md'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="shrink-0 mt-1">
                                            {item.type === 'notice' && (
                                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                    <FileText size={24} />
                                                </div>
                                            )}
                                            {item.type === 'meeting' && (
                                                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                                    <Calendar size={24} />
                                                </div>
                                            )}
                                            {item.type === 'event' && (
                                                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                                    <Calendar size={24} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                    item.source === 'PRINCIPAL' 
                                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
                                                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                                                    }`}>
                                                    {item.source}
                                                </span>
                                                <span className="capitalize text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-md">
                                                    {item.type}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold ml-auto bg-transparent">
                                                    {new Date(item.date).toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </span>
                                            </div>

                                            <h4 className={`text-base font-bold ${!read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {item.title}
                                            </h4>

                                            <p className={`text-sm mt-2 leading-relaxed ${!read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {item.content}
                                            </p>

                                            {item.type === 'meeting' && (
                                                <div className="mt-4 p-4 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm space-y-3">
                                                    {item.venue && (
                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                            <span className="w-5 text-center opacity-70">📍</span>
                                                            <span className="font-semibold">Venue:</span> {item.venue}
                                                        </div>
                                                    )}
                                                    {item.duration && (
                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                            <span className="w-5 text-center opacity-70">⏱️</span>
                                                            <span className="font-semibold">Duration:</span> {item.duration} mins
                                                        </div>
                                                    )}
                                                    {item.isOnline && item.meetingLink && (
                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2">
                                                            <span className="w-5 text-center opacity-70">💻</span>
                                                            <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">
                                                                Join Online Meeting
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {!read && (
                                            <div className="shrink-0 flex items-start">
                                                <div className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full mt-2 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
