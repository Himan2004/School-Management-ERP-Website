import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, ShieldAlert, Paperclip, Eye, Download, Bell, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  PanelModal,
  ModalGrid,
  ModalData,
  openModal,
  closeModal,
  Button
} from '../../components/shared/Common_Components';



const StudentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const res = await studentApi.getNotices();
        if (res?.data) {
          setNotices(res.data);
        } else if (Array.isArray(res)) {
          setNotices(res);
        } else {
          setNotices([]);
        }
      } catch (err) {
        console.error("Failed to load notices:", err);
        toast.error(err?.response?.data?.message || err?.message || "Failed to load notices");
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const handleDownload = (notice) => {
    if (!notice.attachmentUrl || notice.attachmentUrl === 'No Attachment') {
      toast.error('No attachment available');
      return;
    }
    toast.success(`Downloading ${notice.attachmentUrl}...`);
    const link = document.createElement('a');
    link.href = notice.attachmentUrl;
    link.download = notice.attachmentUrl.split('/').pop() || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (row) => {
    setSelectedNotice(row);
    openModal("notice-view-modal");
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      High: 'bg-red-100 text-red-800 border-red-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Low: 'bg-green-100 text-green-800 border-green-200'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[priority] || styles.Medium}`}>{priority}</span>;
  };

  const getStatusBadge = (status) => {
    const isUnread = status === 'Unread';
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${isUnread ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const tableColumns = [
    { key: "id", label: "Notice ID", searchValue: () => "" },
    { key: "title", label: "Notice Title" },
    { key: "category", label: "Category" },
    { key: "publishedBy", label: "Published By" },
    { key: "dateStr", label: "Published Date", sortValue: (row) => new Date(row.date).getTime(), searchValue: () => "" },
    { key: "expiryDateStr", label: "Expiry Date", sortValue: (row) => new Date(row.expiryDate).getTime(), searchValue: () => "" },
    { key: "priority", label: "Priority", render: (val) => getPriorityBadge(val), searchValue: () => "" },
    { key: "status", label: "Status", render: (val) => getStatusBadge(val), searchValue: () => "" },
    { key: "attachmentStr", label: "Attachment", render: (val) => (
      <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap">
        {val !== 'No Attachment' && <Paperclip className="w-4 h-4" />}
        {val}
      </div>
    ), searchValue: () => "" }
  ];

  const tableActions = [
    {
      tooltip: "View Notice",
      icon: <span title="View Notice"><Eye className="w-4 h-4" /></span>,
      onClick: handleViewDetails
    },
    {
      tooltip: "Download Attachment",
      icon: <span title="Download Attachment"><Download className="w-4 h-4" /></span>,
      onClick: handleDownload,
      show: (row) => row.attachmentUrl && row.attachmentUrl !== 'No Attachment'
    }
  ];

  const formattedNotices = notices.map(n => ({
    ...n,
    id: n.id,
    dateStr: n.date ? format(new Date(n.date), 'dd MMM yyyy') : '—',
    expiryDateStr: n.expiryDate ? format(new Date(n.expiryDate), 'dd MMM yyyy') : '—',
    priority: n.priority ? n.priority.charAt(0).toUpperCase() + n.priority.slice(1).toLowerCase() : '—',
    category: n.category || '—',
    publishedBy: n.publishedBy || '—',
    status: n.status || '—',
    attachmentStr: n.attachmentUrl ? n.attachmentUrl : 'No Attachment'
  }));

  const filteredNotices = formattedNotices.filter(n => {
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const title = (n.title || '').toLowerCase();
      const cat = (n.category || '').toLowerCase();
      const pubBy = (n.publishedBy || '').toLowerCase();
      if (!title.includes(q) && !cat.includes(q) && !pubBy.includes(q)) return false;
    }
    
    if (activeFilters.category && activeFilters.category.length > 0) {
      const selectedCats = Array.isArray(activeFilters.category) ? activeFilters.category : [activeFilters.category];
      if (!selectedCats.includes(n.category)) return false;
    }
    
    if (activeFilters.priority && activeFilters.priority.length > 0) {
      const selectedPriorities = Array.isArray(activeFilters.priority) ? activeFilters.priority : [activeFilters.priority];
      if (!selectedPriorities.includes(n.priority)) return false;
    }
    
    if (activeFilters.status && activeFilters.status.length > 0) {
      const selectedStatuses = Array.isArray(activeFilters.status) ? activeFilters.status : [activeFilters.status];
      if (!selectedStatuses.includes(n.status)) return false;
    }
    
    if (activeFilters.startDate) {
      if (n.date && new Date(n.date) < new Date(activeFilters.startDate)) return false;
    }
    if (activeFilters.endDate) {
      const to = new Date(activeFilters.endDate);
      to.setHours(23, 59, 59, 999);
      if (n.date && new Date(n.date) > to) return false;
    }
    
    return true;
  });

  const totalNotices = filteredNotices.length;
  const highPriority = filteredNotices.filter(n => n.priority === 'High').length;
  const recentNotices = filteredNotices.filter(n => {
    if (!n.date) return false;
    const noticeDate = new Date(n.date);
    const today = new Date();
    const diffTime = Math.abs(today - noticeDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  }).length;
  const unreadNotices = filteredNotices.filter(n => n.status === 'Unread').length;

  const dataTableFilters = [
    { 
      title: "Category", 
      type: "toggle", 
      key: "category", 
      options: [...new Set(formattedNotices.map(n => n.category))] 
    },
    { 
      title: "Priority", 
      type: "toggle", 
      key: "priority", 
      options: ["High", "Medium", "Low"] 
    },
    {
      title: "Status",
      type: "toggle",
      key: "status",
      options: ["Read", "Unread"]
    }
  ];

  if (loading && !notices.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading primaryText="Notice Board" />

      {/* Summary Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Notices"
          value={totalNotices}
          icon={<Megaphone size={24} />}
          accentColor="#3b82f6"
          size={3}
        />
        <EnhancedDashCard
          title="High Priority Notices"
          value={highPriority}
          icon={<ShieldAlert size={24} />}
          accentColor="#ef4444"
          size={3}
        />
        <EnhancedDashCard
          title="Recent Notices (Last 7 Days)"
          value={recentNotices}
          icon={<Bell size={24} />}
          accentColor="#10b981"
          size={3}
        />
        <EnhancedDashCard
          title="Unread Notices"
          value={unreadNotices}
          icon={<FileText size={24} />}
          accentColor="#a855f7"
          size={3}
        />
      </DashGrid>

      {/* DataTable */}
      <DashGrid cols={12}>
        <DataTable
          title="Official Notices"
          columns={tableColumns}
          rows={filteredNotices}
          actions={tableActions}
          searchable={true}
          exportable={true}
          pageSize={10}
          filters={dataTableFilters}
          date={true}
          onApplyFilters={setActiveFilters}
        />
      </DashGrid>

      {/* View Modal */}
      <PanelModal id="notice-view-modal" title="Notice Details" size="lg">
        {selectedNotice && (
          <div className="flex flex-col gap-6 py-2">
            <ModalGrid title="General Information" cols={2}>
              <ModalData label="Notice ID" value={selectedNotice.id} />
              <ModalData label="Notice Title" value={selectedNotice.title} />
              <ModalData label="Category" value={selectedNotice.category} />
              <ModalData label="Published By" value={selectedNotice.publishedBy} />
              <ModalData label="Published Date" value={selectedNotice.dateStr} />
              <ModalData label="Expiry Date" value={selectedNotice.expiryDateStr} />
              <ModalData label="Priority" value={getPriorityBadge(selectedNotice.priority)} />
              <ModalData label="Status" value={getStatusBadge(selectedNotice.status)} />
            </ModalGrid>

            <ModalGrid title="Complete Notice Message" cols={1}>
              <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                {selectedNotice.description || selectedNotice.content || 'No details provided.'}
              </div>
            </ModalGrid>

            {selectedNotice.attachmentUrl && selectedNotice.attachmentUrl !== 'No Attachment' && (
              <ModalGrid title="Attachment" cols={1}>
                <div className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Paperclip className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedNotice.attachmentUrl}</p>
                      <p className="text-xs text-gray-500">Document</p>
                    </div>
                  </div>
                  <Button 
                    text="Download" 
                    icon={<Download className="w-4 h-4" />} 
                    variant="secondary" 
                    size={3}
                    onClick={() => handleDownload(selectedNotice)} 
                  />
                </div>
              </ModalGrid>
            )}

            <div className="flex justify-end pt-4">
              <Button text="Close" variant="primary" onClick={() => closeModal("notice-view-modal")} />
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default StudentNotices;