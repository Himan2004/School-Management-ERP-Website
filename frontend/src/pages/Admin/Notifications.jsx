import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  UserPlus, 
  CheckSquare, 
  RefreshCw, 
  Plane, 
  MessageSquare, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { 
  Heading, 
  Button, 
  DashGrid, 
  DataField, 
  SelectField, 
  Option 
} from '../../components/shared/Common_Components';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CARD = 'rounded-[28px] border border-slate-100 bg-white shadow-sm';

const CATEGORY_MAP = {
  admissions: {
    label: 'Admissions',
    icon: UserPlus,
    bg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    iconColor: 'text-indigo-500'
  },
  notice: {
    label: 'Notices',
    icon: Bell,
    bg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    iconColor: 'text-indigo-500'
  },
  event: {
    label: 'Events',
    icon: Calendar,
    bg: 'bg-teal-50 border-teal-100 text-teal-700',
    iconColor: 'text-teal-500'
  },
  leave: {
    label: 'Leaves',
    icon: Plane,
    bg: 'bg-amber-50 border-amber-100 text-amber-700',
    iconColor: 'text-amber-500'
  },
  attendance: {
    label: 'Attendance',
    icon: CheckSquare,
    bg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-500'
  },
  fee: {
    label: 'Fees',
    icon: ClipboardList,
    bg: 'bg-rose-50 border-rose-100 text-rose-700',
    iconColor: 'text-rose-500'
  },
  ticket: {
    label: 'Support Tickets',
    icon: MessageSquare,
    bg: 'bg-orange-50 border-orange-100 text-orange-700',
    iconColor: 'text-orange-500'
  },
  system: {
    label: 'System Alerts',
    icon: AlertCircle,
    bg: 'bg-slate-50 border-slate-100 text-slate-700',
    iconColor: 'text-slate-500'
  },
  message: {
    label: 'Messages',
    icon: MessageSquare,
    bg: 'bg-blue-50 border-blue-100 text-blue-700',
    iconColor: 'text-blue-500'
  }
};

let cachedNotifications = null;

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(cachedNotifications || []);
  const [loading, setLoading] = useState(!cachedNotifications);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | any dynamic category
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!cachedNotifications && !isSilent) setLoading(true);
    try {
      const res = await api.get('/admin/notifications');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const filtered = list.filter(n => {
        const titleLower = (n.title || '').toLowerCase();
        return !(titleLower.includes('approved') || titleLower.includes('rejected') || titleLower.includes('cancelled'));
      });
      setNotifications(filtered);
      cachedNotifications = filtered;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      if (!isSilent) {
        toast.error('Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(Boolean(cachedNotifications));
  }, [fetchNotifications]);

  // Periodic polling for notifications (SSE fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, sortOrder, dateFrom, dateTo]);

  // Dynamic category tabs derived from actual records
  const availableCategories = useMemo(() => {
    const types = new Set(notifications.map(n => n.type || 'system'));
    return Array.from(types).map(type => ({
      id: type,
      label: CATEGORY_MAP[type]?.label || (type.charAt(0).toUpperCase() + type.slice(1))
    }));
  }, [notifications]);

  const handleMarkRead = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, read: true } : n));
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await api.post('/admin/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    } finally {
      setActionLoading(false);
    }
  };

  const getModuleLink = (type) => {
    switch (type) {
      case 'notice': return '/admin/notice';
      case 'event': return '/admin/events';
      case 'leave': return '/admin/hrm';
      case 'ticket': return '/admin/support?tab=helpdesk';
      case 'admissions': return '/admin/admissions/request';
      case 'fee': return '/admin/finance/analytics';
      case 'attendance': return '/admin/report/attendance-reports';
      case 'exam':
      case 'result': return '/admin/exam';
      default: return '/admin/dashboard';
    }
  };

  const handleViewModule = async (n) => {
    if (!n.read) {
      try {
        await api.patch(`/admin/notifications/${n._id || n.id}/read`);
        setNotifications(prev => prev.map(item => item._id === n._id || item.id === n.id ? { ...item, read: true } : item));
      } catch (err) {
        console.error('Failed to mark read on navigate:', err);
      }
    }
    
    const sourceLower = (n.source || '').toLowerCase();
    const titleLower = (n.title || '').toLowerCase();
    const typeLower = (n.type || '').toLowerCase();
    const messageLower = (n.message || '').toLowerCase();

    const isTicket = typeLower === 'ticket' || 
                     sourceLower.includes('ticket') || 
                     sourceLower.includes('complaint') || 
                     sourceLower.includes('query') || 
                     sourceLower.includes('support') || 
                     sourceLower.includes('id card') ||
                     titleLower.includes('complaint') || 
                     titleLower.includes('query') || 
                     messageLower.includes('ticket');

    if (isTicket) {
      const ticketId = n.metadata?.ticketId || (n.metadata?.link && n.metadata.link.includes("ticketId=") ? n.metadata.link.split("ticketId=")[1] : null);
      if (ticketId) {
        navigate(`/admin/support?tab=helpdesk&ticketId=${ticketId}`);
      } else {
        navigate('/admin/support?tab=helpdesk');
      }
    } else {
      navigate(getModuleLink(n.type));
    }
  };

  const getRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDate = (isoStr) => {
    const date = new Date(isoStr);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtered Notifications List
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // 1. Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(n => 
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q) ||
        (n.source || '').toLowerCase().includes(q) ||
        (n.senderName || '').toLowerCase().includes(q) ||
        (n.senderRole || '').toLowerCase().includes(q) ||
        (n.type || '').toLowerCase().includes(q)
      );
    }

    // 2. Status
    if (statusFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (statusFilter === 'read') {
      list = list.filter(n => n.read);
    }

    // 3. Category
    if (categoryFilter !== 'all') {
      list = list.filter(n => n.type === categoryFilter);
    }

    // 4. Date filters
    if (dateFrom) {
      list = list.filter(n => new Date(n.createdAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      list = list.filter(n => new Date(n.createdAt) <= new Date(dateTo));
    }

    // 5. Sort Order
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [notifications, searchTerm, statusFilter, categoryFilter, sortOrder, dateFrom, dateTo]);

  // Paginated List
  const paginatedNotifications = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage));
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  return (
    <div className="max-w-7xl mx-auto font-sans relative text-left pb-10">
      
      {/* Page Header */}
      <div className="mb-6">
        <Heading
          primaryText="Notification"
          secondaryText="Center"
          showAnimations={true}
          size={12}
          action={<div />}
        />
        <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide mt-2">
          Stay updated on student admissions, staff leaves, and support desk tickets.
        </p>
        <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
          <div className="text-xs text-slate-400 font-bold uppercase">
            {unreadCount > 0 ? `${unreadCount} unread alerts` : 'No unread alerts'}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => fetchNotifications()}
              className="flex items-center gap-2"
              variant="secondary"
              size={2}
              text="Refresh"
              icon={<RefreshCw className="w-4 h-4" />}
            />
            {unreadCount > 0 && (
              <Button 
                onClick={handleMarkAllRead}
                disabled={actionLoading}
                className="flex items-center gap-2"
                variant="primary"
                size={2}
                text="Mark All Read"
                icon={<CheckSquare className="w-4 h-4" />}
              />
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`${CARD} p-4 mb-6`}>
        <DashGrid cols={12} gap={4}>
          <DataField
            label="Search"
            id="admin_notif_search"
            placeholder="Search title, description, module, sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size={4}
          />
          <SelectField
            label="Status"
            id="admin_notif_status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            searchable={false}
            size={2}
          >
            <Option value="all" label="All Alerts" />
            <Option value="unread" label={`Unread Only (${unreadCount})`} />
            <Option value="read" label="Read Only" />
          </SelectField>
          <SelectField
            label="Category"
            id="admin_notif_category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            searchable={false}
            size={3}
          >
            <Option value="all" label="All Categories" />
            {availableCategories.map(cat => (
              <Option key={cat.id} value={cat.id} label={cat.label} />
            ))}
          </SelectField>
          <SelectField
            label="Sort"
            id="admin_notif_sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            searchable={false}
            size={3}
          >
            <Option value="newest" label="Newest First" />
            <Option value="oldest" label="Oldest First" />
          </SelectField>
        </DashGrid>

        <DashGrid cols={12} gap={4} className="mt-2">
          <DataField
            label="From Date"
            id="admin_notif_date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size={6}
          />
          <DataField
            label="To Date"
            id="admin_notif_date_to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size={6}
          />
        </DashGrid>
      </div>

      {/* Main panel */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden min-h-[300px] relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Retrieving alerts...</p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {paginatedNotifications.length > 0 ? (
            paginatedNotifications.map(n => {
              const CategoryIcon = CATEGORY_MAP[n.type]?.icon || Bell;
              const details = CATEGORY_MAP[n.type] || {
                label: n.type ? (n.type.charAt(0).toUpperCase() + n.type.slice(1)) : 'Alert',
                bg: 'bg-slate-50 border-slate-100 text-slate-700',
                iconColor: 'text-slate-500'
              };

              return (
                <div 
                  key={n._id || n.id} 
                  className={`p-6 flex items-start gap-4 transition-all duration-200 border-b border-slate-100 hover:bg-slate-50/50 ${
                    !n.read 
                      ? 'bg-blue-50/30 border-l-4 border-l-[#223F74] font-bold' 
                      : 'bg-white border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Left category icon */}
                  <div className={`p-3 rounded-2xl border shrink-0 ${details.bg}`}>
                    <CategoryIcon className={`w-5 h-5 ${details.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-sm font-bold text-slate-900 ${!n.read ? 'font-black' : ''}`}>{n.title}</h3>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#223F74]" />
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${details.bg}`}>
                        {details.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed max-w-4xl">{n.message}</p>
                    
                    {/* Footer metadata */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase" title={formatDate(n.createdAt)}>
                        {getRelativeTime(n.createdAt)}
                      </span>
                      <span className="text-slate-200 text-xs">|</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        By: {n.senderName ? `${n.senderName} (${n.senderRole || 'User'})` : (n.source || 'System')}
                      </span>
                      <span className="text-slate-200 text-xs">|</span>
                      <button 
                        onClick={() => handleViewModule(n)}
                        className="text-[10px] text-[#223F74] hover:underline font-bold uppercase inline-flex items-center gap-0.5"
                      >
                        {n.type === 'admissions' ? 'View Admission' : 'View Module'} <ArrowUpRight size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <button 
                        onClick={() => handleMarkRead(n._id || n.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl transition-all flex items-center gap-1 text-xs font-bold shrink-0"
                        title="Mark as Read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Bell className="w-12 h-12 text-slate-200 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-slate-800">No alerts found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">There are no notifications matching your active filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-4">
          <p className="text-xs text-slate-500 font-bold">
            Showing Page {currentPage} of {totalPages} ({filteredNotifications.length} total alerts)
          </p>
          <div className="flex gap-2">
            <Button
              text="Previous"
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              size={3}
            />
            <Button
              text="Next"
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              size={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
