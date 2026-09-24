import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bell, CheckCircle, AlertTriangle, Calendar, Eye, 
  Mail, XCircle, RotateCcw, Trash2 
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, DataTable, 
  PanelModal, GColumnChart, GDoughnutChart
} from '../../components/shared/Common_Components';
import { 
  fetchParentNotifications, 
  markNotificationReadApi,
  markMultipleNotificationsReadApi, 
  clearReadNotificationsApi 
} from '../../services/parentDashboardApi';

const ActionTooltip = ({ label, children }) => (
  <div className="relative group/tip flex justify-center">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-2 z-[200] opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 transition-[opacity,transform] duration-150 whitespace-nowrap">
      <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
        {label}
      </div>
      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-[#1a2e3f]" />
    </div>
  </div>
);

export default function ParentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DATA FETCHING ---
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchParentNotifications();
      if (res && res.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // --- ACTIONS ---
  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter(n => n.status === 'Unread');
    if (unreadNotifications.length === 0) return;
    
    // Optimistically update local state.
    setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));

    try {
        const unreadIds = unreadNotifications.map(n => n.id);
        await markMultipleNotificationsReadApi(unreadIds);
    } catch (err) {
        console.error("Failed to mark all as read in backend", err);
    }
  };

  const handleRefresh = () => {
    loadNotifications();
  };

  const handleClearRead = async () => {
    const readIds = notifications.filter(n => n.status === 'Read').map(n => n.id);
    if (readIds.length === 0) return;
    
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.status !== 'Read'));
    
    try {
        await clearReadNotificationsApi(readIds);
    } catch (err) {
        console.error("Failed to clear notifications in backend", err);
        // Optionally revert state on failure
    }
  };

  const handleView = async (row) => {
    if(row.status === 'Unread') {
      setNotifications(prev => prev.map(n => n.id === row.id ? { ...n, status: 'Read' } : n));
      try {
          await markNotificationReadApi(row.id);
      } catch (err) {
          console.error("Failed to mark as read in backend", err);
      }
    }
    setSelectedRecord({ ...row, status: 'Read' });
    setIsModalOpen(true);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
  };

  // --- FILTERING LOGIC ---
  const filteredData = useMemo(() => {
    let result = notifications;

    const cat = activeFilters["Category"];
    if (cat && cat.length > 0) {
      result = result.filter(d => cat.includes(d.category));
    }

    const prio = activeFilters["Priority"];
    if (prio && prio.length > 0) {
      result = result.filter(d => prio.includes(d.priority));
    }

    const stat = activeFilters["Status"];
    if (stat && stat.length > 0) {
      result = result.filter(d => stat.includes(d.status));
    }

    const src = activeFilters["Received From"];
    if (src && src.length > 0) {
      result = result.filter(d => src.includes(d.receivedFrom));
    }

    return result;
  }, [notifications, activeFilters]);

  // --- KPIs FOR CARDS ---
  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const totalNotifications = filteredData.length;
  const unreadNotifications = filteredData.filter(n => n.status === "Unread").length;
  const highPriority = filteredData.filter(n => n.priority === "High").length;
  const todaysNotifications = filteredData.filter(n => String(n.date).includes(todayStr) || String(n.date).includes('Today')).length;

  // --- DYNAMIC CATEGORIES FOR CHARTS/FILTERS ---
  const uniqueCategories = useMemo(() => {
      return Array.from(new Set(notifications.map(n => n.category))).filter(Boolean);
  }, [notifications]);

  const uniqueSenders = useMemo(() => {
      return Array.from(new Set(notifications.map(n => n.receivedFrom))).filter(Boolean);
  }, [notifications]);

  // --- CHART DATA ---
  const barChartData = useMemo(() => {
    return uniqueCategories.map(cat => ({
      name: cat,
      count: filteredData.filter(n => n.category === cat).length
    })).filter(c => c.count > 0);
  }, [filteredData, uniqueCategories]);

  const doughnutChartData = useMemo(() => {
    const normalPriority = filteredData.filter(n => n.priority !== "High").length;
    return [
      { name: 'Read', value: filteredData.filter(n => n.status === "Read").length },
      { name: 'Unread', value: unreadNotifications },
      { name: 'High Priority', value: highPriority },
      { name: 'Normal Priority', value: normalPriority },
    ];
  }, [filteredData, unreadNotifications, highPriority]);

  // --- TABLE CONFIG ---
  const columns = [
    { key: "title", label: "Notification Title", align: "left", render: (val) => <span className="font-bold text-slate-800 max-w-xs truncate block" title={val}>{val}</span> },
    { key: "category", label: "Category", align: "center", render: (val) => <span className="text-slate-600 font-medium px-2 py-1 bg-slate-100 rounded-lg text-xs">{val}</span> },
    { key: "priority", label: "Priority", align: "center", render: (val) => (
      <span className={`px-2 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${
        val === 'High' ? 'bg-rose-100 text-rose-700' :
        val === 'Medium' ? 'bg-amber-100 text-amber-700' :
        'bg-emerald-100 text-emerald-700'
      }`}>{val}</span>
    )},
    { 
      key: "date", 
      label: "Date & Time", 
      align: "left", 
      render: (val) => <span className="text-sm text-slate-500 whitespace-nowrap font-medium">{val}</span>,
      sortValue: (row) => row.timestamp || 0
    },
    { key: "status", label: "Status", align: "center", render: (val) => (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit mx-auto ${
        val === 'Unread' ? 'bg-[#223F74] text-white' : 'bg-slate-100 text-slate-600'
      }`}>
        {val === 'Unread' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
        {val}
      </span>
    )},
    { key: "receivedFrom", label: "Received From", align: "left", render: (val) => <span className="text-slate-600 text-sm font-medium">{val}</span> },
    { key: 'actions', label: 'Actions', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => handleView(row)} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  return (
    <div className="w-full space-y-8 pb-10 text-left min-h-screen">
      {/* 1. HEADING */}
      <Heading primaryText="Notifications" size={12} showAnimations={true} />

      {/* 2. SUMMARY CARDS */}
      <style>{`
        .notification-cards h3.truncate, .notification-cards span.truncate {
          white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
        }
      `}</style>
      <div className="notification-cards">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Notifications" value={String(totalNotifications)} icon={<Bell size={22} />} size={3} accentColor="#3B82F6" />
          <EnhancedDashCard title="Unread Notifications" value={String(unreadNotifications)} icon={<Mail size={22} />} size={3} accentColor="#F59E0B" />
          <EnhancedDashCard title="High Priority Alerts" value={String(highPriority)} icon={<AlertTriangle size={22} />} size={3} accentColor="#F43F5E" />
          <EnhancedDashCard title="Today's Notifications" value={String(todaysNotifications)} icon={<Calendar size={22} />} size={3} accentColor="#10B981" />
        </DashGrid>
      </div>

      {/* 3. ANALYTICS CHARTS */}
      <DashGrid cols={12} gap={4}>
         <GColumnChart 
           title="Notification Categories" 
           subtitle="Volume by Type"
           data={barChartData} 
           bars={[
             { key: 'count', label: 'Count', color: '#3B82F6' }
           ]} 
           size={6} 
           height={340}
         />
         <GDoughnutChart
           title="Notification Distribution"
           subtitle="Status & Priority"
           data={doughnutChartData}
           colors={['#10B981', '#F59E0B', '#F43F5E', '#3B82F6']}
           size={6}
           height={340}
         />
      </DashGrid>

      {/* 4. QUICK ACTIONS & TABLE */}
      <style>{`
        /* Force Recharts X-axis labels to display cleanly and slightly smaller so they fit */
        .recharts-cartesian-axis-tick text {
          font-size: 11px !important;
          font-weight: 600 !important;
        }
      `}</style>
      
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-sm transition-colors shadow-sm">
          <CheckCircle size={16} /> Mark All as Read
        </button>
        <button onClick={handleClearRead} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-lg text-sm transition-colors shadow-sm">
          <Trash2 size={16} /> Clear Read Notifications
        </button>
        <button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-sm transition-colors shadow-sm ml-auto disabled:opacity-50">
          <RotateCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden relative min-h-[400px]">
        {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#223F74]/20 border-t-[#223F74] rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-semibold animate-pulse">Loading notifications...</p>
            </div>
        )}
        <div className="p-6">
          <DataTable 
            title="Recent Notifications"
            rows={filteredData} 
            columns={columns} 
            searchable={true} 
            exportable={true}
            exportFileName="Notifications_Report"
            onApplyFilters={handleApplyFilters}
            date={false}
            defaultSortKey="date"
            defaultSortDir="desc"
            filters={[
              { title: "Category", type: "toggle", key: "category", options: uniqueCategories.length > 0 ? uniqueCategories : ["Notice", "Event", "PTM", "Fee"] },
              { title: "Priority", type: "toggle", key: "priority", options: ["High", "Medium", "Low"] },
              { title: "Status", type: "toggle", key: "status", options: ["Read", "Unread"] },
              { title: "Received From", type: "toggle", key: "receivedFrom", options: ["Principal", "Administration", "Teacher", "Accountant"] }
            ]}
          />
        </div>
      </div>

      {/* 5. VIEW NOTIFICATION MODAL */}
      <PanelModal 
        id="notification-details-modal" 
        title="Notification Details" 
        size="lg"
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {selectedRecord && (
          <div className="space-y-6 pb-6 text-left">
            {/* Notification Information */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-500 font-medium">Category</p><p className="font-bold text-slate-900">{selectedRecord.category}</p></div>
                <div><p className="text-xs text-slate-500 font-medium mb-1.5">Priority</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                    selectedRecord.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                    selectedRecord.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{selectedRecord.priority}</span>
                </div>
                <div><p className="text-xs text-slate-500 font-medium mb-1.5">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                    selectedRecord.status === 'Unread' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                  }`}>{selectedRecord.status}</span>
                </div>
                <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-medium">Date & Time</p><p className="font-bold text-slate-900">{selectedRecord.date}</p></div>
                <div className="col-span-2 md:col-span-3"><p className="text-xs text-slate-500 font-medium">Title</p><p className="font-bold text-lg text-slate-900">{selectedRecord.title}</p></div>
              </div>
            </div>

            {/* Student & Sender Info (Conditionally Rendered if data exists) */}
            {(selectedRecord.studentName || selectedRecord.receivedFrom) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedRecord.studentName && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Context</h3>
                        <div className="grid grid-cols-1 gap-y-4 gap-x-2">
                        <div><p className="text-xs text-slate-500 font-medium">Student Name</p><p className="font-bold text-slate-900">{selectedRecord.studentName}</p></div>
                        </div>
                    </div>
                )}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Sender Information</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-2">
                    <div><p className="text-xs text-slate-500 font-medium">Sent By (Received From)</p><p className="font-bold text-slate-900">{selectedRecord.receivedFrom}</p></div>
                    </div>
                </div>
                </div>
            )}

            {/* Category Specific Details */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {(selectedRecord.category === 'Notice' || selectedRecord.category === 'System Alert') && (
                  <div className="col-span-1 md:col-span-2">
                      <p className="text-xs text-slate-500 font-medium mb-2">Message Content</p>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 font-medium min-h-[100px]" dangerouslySetInnerHTML={{ __html: selectedRecord.content || "No detailed message provided." }} />
                  </div>
                )}
                
                {selectedRecord.category === 'Event' && (
                  <>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Start Date</p>
                        <p className="font-bold text-slate-900">{selectedRecord.startDate ? new Date(selectedRecord.startDate).toLocaleDateString() : 'TBD'}</p>
                    </div>
                    {selectedRecord.endDate && (
                        <div>
                            <p className="text-xs text-slate-500 font-medium">End Date</p>
                            <p className="font-bold text-slate-900">{new Date(selectedRecord.endDate).toLocaleDateString()}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Venue</p>
                        <p className="font-bold text-slate-900">{selectedRecord.venue || 'N/A'}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2 mt-2">
                        <p className="text-xs text-slate-500 font-medium mb-2">Event Details</p>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 font-medium min-h-[100px]" dangerouslySetInnerHTML={{ __html: selectedRecord.content || "No further details available." }} />
                    </div>
                  </>
                )}

                {selectedRecord.category === 'PTM' && (
                  <>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Meeting Date</p>
                        <p className="font-bold text-slate-900">{selectedRecord.meetingDate ? new Date(selectedRecord.meetingDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Time</p>
                        <p className="font-bold text-slate-900">{selectedRecord.startTime || 'N/A'} - {selectedRecord.endTime || 'N/A'}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <p className="text-xs text-slate-500 font-medium">Venue / Link</p>
                        {String(selectedRecord.venue).startsWith('http') ? (
                             <a href={selectedRecord.venue} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline">{selectedRecord.venue}</a>
                        ) : (
                             <p className="font-bold text-slate-900">{selectedRecord.venue || 'N/A'}</p>
                        )}
                    </div>
                    <div className="col-span-1 md:col-span-2 mt-2">
                        <p className="text-xs text-slate-500 font-medium mb-2">Agenda</p>
                        <p className="font-medium text-slate-800 bg-white p-4 rounded-xl border border-slate-200">{selectedRecord.agenda || 'General discussion regarding student performance.'}</p>
                    </div>
                  </>
                )}

                {selectedRecord.category === 'Fee' && (
                  <>
                    <div><p className="text-xs text-slate-500 font-medium">Amount Paid</p><p className="font-bold text-emerald-600 text-lg">₹{selectedRecord.amount || '0'}</p></div>
                    <div><p className="text-xs text-slate-500 font-medium">Receipt Number</p><p className="font-bold text-slate-900">{selectedRecord.receiptNumber || 'N/A'}</p></div>
                    <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-medium">Payment Method</p><p className="font-bold text-slate-900">{selectedRecord.paymentMethod || 'N/A'}</p></div>
                  </>
                )}

                {/* Fallbacks for older mock categories if they somehow exist */}
                {['Weak Subjects', 'Attendance', 'Transport', 'Route Alerts', 'Leave', 'Online Classes'].includes(selectedRecord.category) && (
                    <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-medium text-center py-4">Legacy notification type - no details available</p></div>
                )}
              </div>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
}
