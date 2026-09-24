import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../../services/api/studentApi';
import toast from 'react-hot-toast';
import { Grid, Heading, DataTable, Button } from '../../components/shared/Common_Components';
import { Eye, X, Check, CheckSquare } from 'lucide-react';

const StudentNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getNotifications();
      const rawNotifications = res?.data || res || [];

      const uniqueNotifications = [];
      const seenKeys = new Set();
      rawNotifications.forEach(n => {
        const key = `${n.title || ''}::${n.message || ''}::${n.type || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueNotifications.push(n);
        }
      });

      uniqueNotifications.sort((a, b) => {
        if (a.read === b.read) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return a.read ? 1 : -1;
      });
      setNotifications(uniqueNotifications);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await studentApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      toast.success('Notification marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await studentApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark all read');
    }
  };

  const handleViewDetails = (notification) => {
    if (!notification.read) {
      handleMarkRead(notification._id);
    }
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const columns = [
    { key: "type", label: "Type", render: (val) => <span className="capitalize font-semibold">{val}</span> },
    { key: "title", label: "Subject", render: (val, row) => <span className={!row.read ? "font-bold text-[#223F74]" : ""}>{val}</span> },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" }
  ];

  const rows = notifications.map(n => ({
    ...n,
    date: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: n.read ? "Read" : "Unread",
    type: n.type ? (n.type.charAt(0).toUpperCase() + n.type.slice(1)) : "Notice",
  }));

  const actions = [
    {
      icon: <Check size={14} />,
      tooltip: "Mark as Read",
      variant: "success",
      show: (row) => !row.read,
      onClick: (row) => handleMarkRead(row._id),
    },
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "primary",
      onClick: (row) => handleViewDetails(row),
    }
  ];

  return (
    <div className="pr-4 sm:pr-6 pb-24">
      <Grid cols={12} gap={6}>
        <Heading
          primaryText="Notifications"
          secondaryText="& Updates"
          size={12}
          />

        {loading ? (
          <div className="col-span-12 flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
          </div>
        ) : (
          <DataTable
            title='All Notifications'
            columns={columns}
            rows={rows}
            actions={actions}
            headerAction={
              <div className="w-[170px] h-[40px] pl-5 mb-4">
                <Button 
                  text="Mark All Read" 
                  variant="primary" 
                  onClick={handleMarkAllRead} 
                  disabled={!notifications.some(n => !n.read)}
                />
              </div>
            }
            size={12}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
            searchable={true}
            date={true}
            filters={[
              { title: "Status", type: "toggle", key: "status", options: ["Read", "Unread"] },
              { title: "Type", type: "select", key: "type", options: ["Notice", "Homework", "Attendance", "Result", "Event", "Message"] }
            ]}
          />
        )}
      </Grid>

      {/* Modal for Details */}
      {isModalOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[#223F74]">
                  {selectedNotification.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(selectedNotification.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {selectedNotification.type || 'Notice'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedNotification.message}
              </p>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              {!selectedNotification.read && (
                <Button
                  text="Mark as Read"
                  variant="success"
                  icon={<Check size={16} />}
                  onClick={() => {
                    handleMarkRead(selectedNotification._id);
                    setSelectedNotification(prev => ({...prev, read: true}));
                  }}
                />
              )}
              <Button
                text="Close"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentNotifications;
