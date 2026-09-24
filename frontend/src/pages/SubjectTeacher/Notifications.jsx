// Notifications.jsx - Updated with Performance Caching, Clean UI, and Subject Teacher Scoping
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    Bell, BellRing, CheckCircle, Circle, Archive, Trash2, Search, Filter, Eye, Calendar, Clock as ClockIcon, User, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    Grid,
    Heading,
    Button,
    DataTable,
    DashCard,
    Modal,
    openModal,
    closeModal,
    ModalData,
    ModalGrid,
} from '../../components/shared/Common_Components';

import {
    getSubjectTeacherNotificationsApi,
    markSubjectTeacherNotificationReadApi,
    markAllSubjectTeacherNotificationsReadApi
} from '../../services/api/subjectTeacherNotificationApi';

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
});
const formatDateFull = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
});
const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
});
const timeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const map = {
        read: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        unread: 'bg-blue-100 text-blue-700 border-blue-200',
        archived: 'bg-slate-100 text-slate-700 border-slate-200',
        deleted: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const icons = {
        read: <CheckCircle size={10} />,
        unread: <Circle size={10} />,
        archived: <Archive size={10} />,
        deleted: <Trash2 size={10} />,
    };
    const labels = {
        read: 'Read',
        unread: 'Unread',
        archived: 'Archived',
        deleted: 'Deleted',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.unread}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// Notification Category/Type Icon Helper
const TypeIcon = ({ type }) => {
    const colorMap = {
        info: 'text-blue-500',
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        error: 'text-rose-500',
        event: 'text-purple-500',
        leave: 'text-amber-500',
        ticket: 'text-rose-500'
    };
    const color = colorMap[type] || 'text-slate-500';
    return <Bell size={16} className={color} />;
};

// Global module-level cache for instant page switching
let notificationsCache = null;
let statsCache = null;
let cachedUserId = "";
let cachedSchoolId = "";
let cachedOrgId = "";
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache duration

// ── Main Component ────────────────────────────────────────────
const Notifications = () => {
    const authUser = useSelector((state) => state.teacherAuth?.teacher || state.auth?.user);
    const userId = authUser?._id || authUser?.id || "";
    const schoolId = authUser?.school?._id || authUser?.school || "";
    const orgId = authUser?.school?.organization?._id || authUser?.school?.organization || authUser?.organization || "";

    const contextChanged = userId !== cachedUserId || schoolId !== cachedSchoolId || orgId !== cachedOrgId;

    if (contextChanged) {
        notificationsCache = null;
        statsCache = null;
        cachedUserId = userId;
        cachedSchoolId = schoolId;
        cachedOrgId = orgId;
    }

    if (!notificationsCache) {
        try {
            const stored = sessionStorage.getItem('teacher_notifications');
            if (stored) {
                notificationsCache = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to parse cached notifications:', e);
        }
    }

    const [loading, setLoading] = useState(!notificationsCache);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // list | grid
    const [activeFilter, setActiveFilter] = useState('all'); // all | unread | read | archived

    // ── Mapper function for DB notification ──
    const mapDbNotificationToFrontend = useCallback((n) => {
        return {
            id: n._id?.toString() || n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'info',
            status: n.read ? 'read' : 'unread',
            date: n.createdAt || new Date(),
            sender: n.senderName || 'System',
            category: n.source || 'General',
            actions: n.metadata?.link ? [{ label: 'View Details', link: n.metadata.link }] : [],
        };
    }, []);

    // ── Notification Data ─────────────────────────────────────
    const [notifications, setNotifications] = useState(notificationsCache || []);

    // Derive stats dynamically (Single Source of Truth)
    const stats = useMemo(() => {
        const total = notifications.length;
        const unread = notifications.filter(n => n.status === 'unread').length;
        const read = notifications.filter(n => n.status === 'read').length;
        const archived = notifications.filter(n => n.status === 'archived').length;
        const todayCount = notifications.filter(n => {
            const notifDate = new Date(n.date);
            const todayDate = new Date();
            return notifDate.getDate() === todayDate.getDate() &&
                   notifDate.getMonth() === todayDate.getMonth() &&
                   notifDate.getFullYear() === todayDate.getFullYear();
        }).length;
        const thisWeekCount = notifications.filter(n => {
            const notifDate = new Date(n.date);
            const todayDate = new Date();
            const weekAgo = new Date(todayDate);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return notifDate >= weekAgo;
        }).length;

        const newStats = {
            total,
            unread,
            read,
            archived,
            today: todayCount,
            thisWeek: thisWeekCount,
        };
        statsCache = newStats;
        return newStats;
    }, [notifications]);

    // ── Fetch Data ─────────────────────────────────────────────
    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        const isFirstLoad = !notificationsCache;
        if (!force && !isFirstLoad && (now - lastFetchTime < CACHE_DURATION)) {
            return;
        }
        if (isFirstLoad) {
            setLoading(true);
        }
        try {
            const response = await getSubjectTeacherNotificationsApi();
            const rawNotifications = response?.data || response || [];
            const mapped = rawNotifications.map(mapDbNotificationToFrontend);
            setNotifications(mapped);
            notificationsCache = mapped;
            sessionStorage.setItem('teacher_notifications', JSON.stringify(mapped));
            sessionStorage.setItem('teacher_notifications_last_fetch', now.toString());
            lastFetchTime = now;
        } catch (error) {
            toast.error('Failed to fetch notifications');
        } finally {
            if (isFirstLoad) {
                setLoading(false);
            }
        }
    }, [mapDbNotificationToFrontend]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Notification Actions ──────────────────────────────────
    const handleMarkAsRead = useCallback(async (id) => {
        try {
            await markSubjectTeacherNotificationReadApi(id);
            setNotifications(prev => {
                const updated = prev.map(n => n.id === id ? { ...n, status: 'read' } : n);
                notificationsCache = updated;
                sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
                return updated;
            });
            toast.success('Notification marked as read');
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    }, []);

    const handleMarkAsUnread = useCallback((id) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, status: 'unread' } : n);
            notificationsCache = updated;
            sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
            return updated;
        });
        toast.success('Notification marked as unread');
    }, []);

    const handleArchive = useCallback((id) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, status: 'archived' } : n);
            notificationsCache = updated;
            sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
            return updated;
        });
        toast.success('Notification archived');
    }, []);

    const handleDelete = useCallback((id) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            notificationsCache = updated;
            sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
            return updated;
        });
        toast.success('Notification deleted');
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllSubjectTeacherNotificationsReadApi();
            setNotifications(prev => {
                const updated = prev.map(n => n.status === 'unread' ? { ...n, status: 'read' } : n);
                notificationsCache = updated;
                sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
                return updated;
            });
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all notifications as read');
        }
    }, []);

    const handleViewNotification = useCallback(async (notification) => {
        setSelectedNotification(notification);
        if (notification.status === 'unread') {
            try {
                await markSubjectTeacherNotificationReadApi(notification.id);
                setNotifications(prev => {
                    const updated = prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n);
                    notificationsCache = updated;
                    sessionStorage.setItem('teacher_notifications', JSON.stringify(updated));
                    return updated;
                });
            } catch (err) {
                console.error(err);
            }
        }
        openModal('view-notification-modal');
    }, []);

    const handleActionClick = useCallback((action) => {
        if (action.link === '#') {
            toast.info(`Action: ${action.label}`);
        } else {
            toast.success(`Navigating to ${action.label}`);
        }
    }, []);

    // ── Filter Functions ──────────────────────────────────────
    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'unread') return n.status === 'unread';
            if (activeFilter === 'read') return n.status === 'read';
            if (activeFilter === 'archived') return n.status === 'archived';
            return true;
        });
    }, [notifications, activeFilter]);

    // ── Table Columns ──────────────────────────────────────────
    const notificationColumns = useMemo(() => [
        {
            key: 'title',
            label: 'Notification',
            render: (val, row) => (
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        <TypeIcon type={row.type} />
                    </div>
                    <div>
                        <p className={`font-bold text-[#1D1D1F] ${row.status === 'unread' ? 'text-[#223F74]' : ''}`}>
                            {val}
                            {row.status === 'unread' && (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </p>
                        <p className="text-xs text-[#6B7280] line-clamp-2">{row.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#6B7280]">{timeAgo(row.date)}</span>
                            <span className="text-[10px] text-[#6B7280]">•</span>
                            <span className="text-[10px] text-[#6B7280]">{row.sender}</span>
                            <span className="text-[10px] text-[#6B7280]">•</span>
                            <span className="text-[10px] text-[#6B7280]">{row.category || 'System'}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ], []);

    const notificationActions = useMemo(() => [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewNotification(row),
        },
        {
            icon: <CheckCircle size={14} />,
            tooltip: 'Mark as Read',
            variant: 'success',
            show: (row) => row.status === 'unread',
            onClick: (row) => handleMarkAsRead(row.id),
        },
        {
            icon: <Circle size={14} />,
            tooltip: 'Mark as Unread',
            variant: 'primary',
            show: (row) => row.status === 'read',
            onClick: (row) => handleMarkAsUnread(row.id),
        },
        {
            icon: <Archive size={14} />,
            tooltip: 'Archive',
            variant: 'primary',
            show: (row) => row.status !== 'archived',
            onClick: (row) => handleArchive(row.id),
        },
        {
            icon: <Trash2 size={14} />,
            tooltip: 'Delete',
            variant: 'danger',
            onClick: (row) => handleDelete(row.id),
        },
    ], [handleViewNotification, handleMarkAsRead, handleMarkAsUnread, handleArchive, handleDelete]);

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = useMemo(() => [
        {
            title: 'Total',
            value: stats.total,
            icon: <Bell size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Unread',
            value: stats.unread,
            icon: <BellRing size={20} />,
            accentColor: '#7A8FC6',
        },
        {
            title: 'Read',
            value: stats.read,
            icon: <CheckCircle size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Archived',
            value: stats.archived,
            icon: <Archive size={20} />,
            accentColor: '#E0A04B',
        },
    ], [stats]);

    return (
        <div className="w-full space-y-8 pb-10 text-left font-sans">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="Notifications"
                        size={12}
                        action={
                            stats.unread > 0 ? (
                                <Button
                                    text="Mark All Read"
                                    variant="success"
                                    size={0}
                                    icon={<CheckCircle size={14} />}
                                    onClick={handleMarkAllAsRead}
                                />
                            ) : null
                        }
                    />
                </div>
            </Grid>

            {/* ── Stats Cards & Notifications Area (Loaded together) ── */}
            {loading && !notifications.length ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6 font-sans">
                    <Loader2 className="animate-spin text-[#223F74]" size={36} />
                    <p className="text-sm font-bold text-[#223F74] tracking-widest uppercase animate-pulse">Loading Notifications...</p>
                </div>
            ) : (
                <>
                    {/* ── Stats Cards ── */}
                    <div className='mt-6'>
                        <Grid cols={12} gap={4}>
                            {statCards.map((card, i) => (
                                <DashCard
                                    key={i}
                                    title={card.title}
                                    value={card.value}
                                    icon={card.icon}
                                    accentColor={card.accentColor}
                                    size={3}
                                />
                            ))}
                        </Grid>
                    </div>

                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                            <Bell className="text-[#9CA3AF]" size={48} />
                            <p className="text-base font-bold text-[#223F74] uppercase tracking-wider">No Notifications Found</p>
                            <p className="text-xs text-slate-500 font-semibold">There are no notifications matching your filters.</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'list' && (
                                <div className='mt-6'>
                                    <Grid cols={12} gap={4}>
                                        <div className="col-span-12">
                                            <DataTable
                                                columns={notificationColumns}
                                                rows={filteredNotifications}
                                                actions={notificationActions}
                                                title={`Notifications (${filteredNotifications.length})`}
                                                pageSize={10}
                                                pageSizeOptions={[5, 10, 20, 50]}
                                                searchable={true}
                                                exportable={true}
                                                exportFileName="notifications"
                                                loading={false}
                                                filters={[
                                                    {
                                                        title: 'Status',
                                                        type: 'toggle',
                                                        key: 'status',
                                                        options: ['unread', 'read', 'archived']
                                                    },
                                                ]}
                                                date={true}
                                                defaultSortKey="date"
                                                defaultSortDir="desc"
                                                headerAction={
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-blue-600">
                                                            {stats.unread} Unread
                                                        </span>
                                                        <span className="text-xs font-bold text-emerald-600">
                                                            {stats.read} Read
                                                        </span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </Grid>
                                </div>
                            )}

                            {viewMode === 'grid' && (
                                <div className='mt-6'>
                                    <Grid cols={12} gap={4}>
                                        {filteredNotifications.map((notification) => (
                                            <div 
                                                key={notification.id} 
                                                className={`col-span-12 md:col-span-6 lg:col-span-4 cursor-pointer ${
                                                    notification.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''
                                                }`}
                                                onClick={() => handleViewNotification(notification)}
                                            >
                                                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 hover:shadow-md transition-shadow">
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
                                                                <TypeIcon type={notification.type} />
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold text-sm text-[#1D1D1F] ${notification.status === 'unread' ? 'text-[#223F74]' : ''}`}>
                                                                    {notification.title}
                                                                    {notification.status === 'unread' && (
                                                                        <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-[#6B7280]">{timeAgo(notification.date)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Message */}
                                                    <p className="text-sm text-[#1D1D1F] line-clamp-2 mb-3">
                                                        {notification.message}
                                                    </p>

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-[#6B7280]">{notification.sender}</span>
                                                            <span className="text-xs text-[#6B7280]">•</span>
                                                            <span className="text-xs text-[#6B7280]">{notification.category || 'System'}</span>
                                                        </div>
                                                        <StatusBadge status={notification.status} />
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="flex gap-1 mt-2 pt-2 border-t border-[#E2E8F0]">
                                                        <Button
                                                            text="View"
                                                            variant="ghost"
                                                            size={0}
                                                            icon={<Eye size={12} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewNotification(notification);
                                                            }}
                                                        />
                                                        {notification.status === 'unread' && (
                                                            <Button
                                                                text="Read"
                                                                variant="ghost"
                                                                size={0}
                                                                icon={<CheckCircle size={12} />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsRead(notification.id);
                                                                }}
                                                            />
                                                        )}
                                                        {notification.status === 'read' && (
                                                            <Button
                                                                text="Unread"
                                                                variant="ghost"
                                                                size={0}
                                                                icon={<Circle size={12} />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsUnread(notification.id);
                                                                }}
                                                            />
                                                        )}
                                                        <Button
                                                            text="Archive"
                                                            variant="ghost"
                                                            size={0}
                                                            icon={<Archive size={12} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleArchive(notification.id);
                                                            }}
                                                        />
                                                        <Button
                                                            text="Delete"
                                                            variant="ghost"
                                                            size={0}
                                                            icon={<Trash2 size={12} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(notification.id);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </Grid>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODAL - View Notification Details                    */}
            {/* ══════════════════════════════════════════════════════ */}
            <Modal id="view-notification-modal" title="Notification Details" size="lg">
                {selectedNotification && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82]">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                                <TypeIcon type={selectedNotification.type} />
                            </div>
                            <div className="flex-1 text-white">
                                <p className="text-xl font-bold">{selectedNotification.title}</p>
                                <div className="flex flex-wrap gap-3 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <ClockIcon size={12} /> {formatDateFull(selectedNotification.date)} at {formatTime(selectedNotification.date)}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <User size={12} /> {selectedNotification.sender}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <StatusBadge status={selectedNotification.status} />
                            </div>
                        </div>

                        {/* Message */}
                        <ModalGrid title="Message" cols={1}>
                            <p className="text-sm text-[#1D1D1F] leading-relaxed">{selectedNotification.message}</p>
                        </ModalGrid>

                        {/* Details */}
                        <ModalGrid title="Details" cols={2}>
                            <ModalData label="Category" value={selectedNotification.category || '—'} />
                            <ModalData label="Sender" value={selectedNotification.sender} />
                            <ModalData label="Date" value={formatDateFull(selectedNotification.date)} />
                            <ModalData label="Time" value={formatTime(selectedNotification.date)} />
                        </ModalGrid>

                        {/* Actions */}
                        {selectedNotification.actions && selectedNotification.actions.length > 0 && (
                            <ModalGrid title="Quick Actions" cols={1}>
                                <div className="flex flex-wrap gap-2">
                                    {selectedNotification.actions.map((action, i) => (
                                        <Button
                                            key={i}
                                            text={action.label}
                                            variant="primary"
                                            size={0}
                                            onClick={() => handleActionClick(action)}
                                        />
                                    ))}
                                </div>
                            </ModalGrid>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="flex gap-2">
                                {selectedNotification.status === 'unread' && (
                                    <Button
                                        text="Mark as Read"
                                        variant="success"
                                        size={0}
                                        icon={<CheckCircle size={14} />}
                                        onClick={() => {
                                            handleMarkAsRead(selectedNotification.id);
                                            setSelectedNotification({ ...selectedNotification, status: 'read' });
                                        }}
                                    />
                                )}
                                {selectedNotification.status === 'read' && (
                                    <Button
                                        text="Mark as Unread"
                                        variant="primary"
                                        size={0}
                                        icon={<Circle size={14} />}
                                        onClick={() => {
                                            handleMarkAsUnread(selectedNotification.id);
                                            setSelectedNotification({ ...selectedNotification, status: 'unread' });
                                        }}
                                    />
                                )}
                                {selectedNotification.status !== 'archived' && (
                                    <Button
                                        text="Archive"
                                        variant="primary"
                                        size={0}
                                        icon={<Archive size={14} />}
                                        onClick={() => {
                                            handleArchive(selectedNotification.id);
                                            closeModal('view-notification-modal');
                                        }}
                                    />
                                )}
                                <Button
                                    text="Delete"
                                    variant="danger"
                                    size={0}
                                    icon={<Trash2 size={14} />}
                                    onClick={() => {
                                        handleDelete(selectedNotification.id);
                                        closeModal('view-notification-modal');
                                    }}
                                />
                            </div>
                            <Button
                                text="Close"
                                variant="ghost"
                                size={0}
                                onClick={() => closeModal('view-notification-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default Notifications;