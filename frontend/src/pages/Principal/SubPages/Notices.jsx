import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, Pin, AlertTriangle, X, FileText, CheckCircle, Activity, AlertCircle } from 'lucide-react';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataField,
  SelectField,
  Option,
  Button,
  DataTable,
  PanelModal
} from '../../../components/shared/Common_Components';
import {
  getPrincipalNoticesApi,
  getPrincipalNoticeStatsApi,
  createPrincipalNoticeApi,
  updatePrincipalNoticeApi,
  deletePrincipalNoticeApi,
  togglePinPrincipalNoticeApi,
  uploadNoticeAttachmentsApi
} from '../../../services/api/principalCommunicationApi';

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalNotices: 0,
    publishedToday: 0,
    activeNotices: 0,
    expiredNotices: 0
  });
  const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Academic',
    audience: [],
    content: '',
    expiryDate: '',
    pinned: false,
    status: 'Draft'
  });

  const normalizeNotice = (notice) => ({
    id: notice.id || notice._id,
    title: notice.title || '',
    category: notice.category || 'General',
    audience: notice.audience || ['Everyone'],
    content: notice.content || '',
    description: notice.description || `${notice.content || ''}`.slice(0, 90),
    publishedDate: notice.publishedDate || new Date().toISOString().split('T')[0],
    expiryDate: notice.expiryDate || '',
    status: notice.status || 'Draft',
    viewCount: notice.viewCount || 0,
    pinned: !!notice.pinned,
    publishedBy: notice.publishedBy || 'Principal',
    attachments: Array.isArray(notice.attachments)
      ? notice.attachments.map((attachment, index) => {
        if (typeof attachment === 'string') {
          return {
            name: `Attachment ${index + 1}`,
            url: attachment,
            type: ''
          };
        }
        return {
          name: attachment?.name || `Attachment ${index + 1}`,
          url: attachment?.url || '',
          type: attachment?.type || ''
        };
      })
      : []
  });

  const buildNoticePayload = (payload) => ({
    title: payload.title,
    content: payload.content,
    category: payload.category,
    audience: payload.audience,
    status: payload.status,
    pinned: payload.pinned,
    expiryDate: payload.expiryDate || null
  });

  const fetchNoticeData = async () => {
    setLoading(true);
    setError('');
    try {
      const [noticesRes, statsRes] = await Promise.all([
        getPrincipalNoticesApi(),
        getPrincipalNoticeStatsApi()
      ]);
      const noticesList = Array.isArray(noticesRes?.data) ? noticesRes.data : [];
      setNotices(noticesList.map(normalizeNotice));
      setStats(statsRes?.data || {
        totalNotices: 0,
        publishedToday: 0,
        activeNotices: 0,
        expiredNotices: 0
      });
    } catch (err) {
      setError(err?.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticeData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, categoryFilter, audienceFilter, statusFilter, dateFrom, dateTo, notices]);

  const applyFilters = () => {
    let filtered = [...notices]; // Create a new array to avoid mutating state directly

    // 1. Search Filter
    if (searchTerm) {
      filtered = filtered.filter(n => (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Category Filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }

    // 3. Audience Filter
    if (audienceFilter !== 'All') {
      filtered = filtered.filter(n => {
        const aud = n.audience || [];
        return aud.includes(audienceFilter) || aud.includes('Everyone');
      });
    }

    // 4. Status Filter (The tricky one)
    if (statusFilter !== 'All') {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison

      filtered = filtered.filter(n => {
        // Parse the expiry date safely
        const expiryDate = n.expiryDate ? new Date(n.expiryDate) : null;
        if (expiryDate) expiryDate.setHours(0, 0, 0, 0);

        // Define what constitutes "Expired"
        const isActuallyExpired = n.status === 'Archived' || n.status === 'Expired' || (expiryDate && expiryDate < today);

        if (statusFilter === 'Expired') {
          return isActuallyExpired;
        } 
        
        if (statusFilter === 'Published') {
          // It must be published AND not expired
          return n.status === 'Published' && !isActuallyExpired;
        }

        if (statusFilter === 'Draft') {
          return n.status === 'Draft';
        }

        return n.status === statusFilter;
      });
    }

    // 5. Date Range Filters
    if (dateFrom) {
      filtered = filtered.filter(n => new Date(n.publishedDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(n => new Date(n.publishedDate) <= new Date(dateTo));
    }

    setFilteredNotices(filtered);
  };

  const categoryColors = {
    Academic: 'bg-blue-100 text-blue-800 border-blue-300',
    Administrative: 'bg-grey-100 text-grey-800 border-grey-300',
    Exam: 'bg-purple-100 text-purple-800 border-purple-300',
    Holiday: 'bg-green-100 text-green-800 border-green-300',
    General: 'bg-teal-100 text-teal-800 border-teal-300',
    Urgent: 'bg-red-100 text-red-800 border-red-300'
  };

  const statusColors = {
    Published: 'bg-green-100 text-green-800',
    Draft: 'bg-grey-100 text-grey-800',
    Expired: 'bg-red-100 text-red-800'
  };

  const handleCreateClick = () => {
    setEditingId(null);
    setFormData({
      title: '',
      category: 'Academic',
      audience: [],
      content: '',
      expiryDate: '',
      pinned: false,
      status: 'Draft'
    });
    setSelectedAttachmentFiles([]);
    setShowCreateModal(true);
  };

  const handleEdit = (notice) => {
    setEditingId(notice.id);
    setFormData({
      title: notice.title,
      category: notice.category,
      audience: notice.audience,
      content: notice.content,
      expiryDate: notice.expiryDate,
      pinned: notice.pinned,
      status: notice.status
    });
    setSelectedAttachmentFiles([]);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await updatePrincipalNoticeApi(editingId, buildNoticePayload(formData));
        alert('Notice updated successfully');
      } else {
        const response = await createPrincipalNoticeApi(buildNoticePayload(formData));
        const createdNoticeId = response?.data?.id || response?.data?._id;
        if (createdNoticeId && selectedAttachmentFiles.length > 0) {
          await uploadNoticeAttachmentsApi(createdNoticeId, selectedAttachmentFiles);
        }
        alert(`Notice ${formData.status === 'Draft' ? 'saved as draft' : 'published'} successfully`);
      }
      await fetchNoticeData();
      setSelectedAttachmentFiles([]);
      setShowCreateModal(false);
    } catch (err) {
      alert(err?.message || 'Failed to save notice');
    }
  };

  const handleView = (notice) => {
    setSelectedNotice(notice);
    setShowViewModal(true);
  };

  const handleDelete = (notice) => {
    setSelectedNotice(notice);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deletePrincipalNoticeApi(selectedNotice.id);
      await fetchNoticeData();
      setShowDeleteConfirm(false);
      alert('Notice deleted successfully');
    } catch (err) {
      alert(err?.message || 'Failed to delete notice');
    }
  };

  const togglePin = async (notice) => {
    try {
      await togglePinPrincipalNoticeApi(notice.id);
      await fetchNoticeData();
    } catch (err) {
      alert(err?.message || 'Failed to toggle pin');
    }
  };

  const pinnedNotices = filteredNotices.filter(n => n.pinned).slice(0, 2);
  const unpinnedNotices = filteredNotices.filter(n => !n.pinned);

  const totalNotices = stats.totalNotices || 0;
  const publishedToday = stats.publishedToday || 0;
  const activeNotices = stats.activeNotices || 0;
  const expiredNotices = stats.expiredNotices || 0;

  const getEffectiveStatus = (n) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = n.expiryDate ? new Date(n.expiryDate) : null;
    if (expiryDate) expiryDate.setHours(0, 0, 0, 0);
    if (n.status === 'Archived' || n.status === 'Expired' || (expiryDate && expiryDate < today)) return 'Expired';
    return n.status;
  };

  const uniqueCategories = ['All', ...new Set(notices.map(n => n.category).filter(Boolean))].map(c => ({ value: c, label: c === 'All' ? 'All Categories' : c }));
  const uniqueAudiences = ['All', ...new Set(notices.flatMap(n => n.audience || []).filter(Boolean))].map(a => ({ value: a, label: a === 'All' ? 'All Audience' : a }));
  const uniqueStatuses = ['All', ...new Set(notices.map(getEffectiveStatus).filter(Boolean))].map(s => ({ value: s, label: s === 'All' ? 'All Status' : s }));

  const tableColumns = [
    { key: 'title', label: 'Notice Title' },
    { key: 'category', label: 'Category' },
    { 
      key: 'audience', 
      label: 'Audience',
      render: (val) => Array.isArray(val) ? val.join(', ') : val
    },
    { 
      key: 'publishedDate', 
      label: 'Publish Date',
      render: (val) => val ? new Date(val).toLocaleDateString() : '—'
    },
    { 
      key: 'expiryDate', 
      label: 'Expiry Date',
      render: (val) => val ? new Date(val).toLocaleDateString() : '—'
    },
    { key: 'status', label: 'Status' },
  ];

  const tableActions = [
    {
      icon: <Eye size={16} />,
      tooltip: 'View',
      variant: 'ghost',
      onClick: (row) => handleView(row),
    },
    {
      icon: <Edit2 size={16} />,
      tooltip: 'Edit',
      variant: 'ghost',
      onClick: (row) => handleEdit(row),
    },
    {
      icon: <Pin size={16} />,
      tooltip: 'Toggle Pin',
      variant: 'ghost',
      onClick: (row) => togglePin(row),
    },
    {
      icon: <Trash2 size={16} />,
      tooltip: 'Delete',
      variant: 'danger',
      onClick: (row) => handleDelete(row),
    },
  ];

  return (
    <div className="min-h-screen bg-grey-50">
      <main className="text-left">
        {loading && (
          <div className="mb-6 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Page Header */}
        <div className="mb-8">
          <Heading
            primaryText="Notices"
            secondaryText="Publish and manage school notices"
            action={<Button text="Create Notice" icon={<Plus size={16} />} variant="primary" onClick={handleCreateClick} />}
          />
        </div>

        {/* Summary Cards */}
        <div className="mb-8">
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard
              title="Total Notices"
              value={totalNotices}
              icon={<FileText size={24} />}
              accentColor="#3b82f6"
              size={3}
            />
            <EnhancedDashCard
              title="Published Today"
              value={publishedToday}
              icon={<CheckCircle size={24} />}
              accentColor="#22c55e"
              size={3}
            />
            <EnhancedDashCard
              title="Active Notices"
              value={activeNotices}
              icon={<Activity size={24} />}
              accentColor="#a855f7"
              size={3}
            />
            <EnhancedDashCard
              title="Expired Notices"
              value={expiredNotices}
              icon={<AlertCircle size={24} />}
              accentColor="#ef4444"
              size={3}
            />
          </DashGrid>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] mb-8">
          <Grid cols={12} gap={4}>
            <SelectField
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              size={3}
            >
              {uniqueCategories.map(c => <Option key={c.value} value={c.value} label={c.label} />)}
            </SelectField>
            <SelectField
              label="Audience"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              size={3}
            >
              {uniqueAudiences.map(c => <Option key={c.value} value={c.value} label={c.label} />)}
            </SelectField>
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size={3}
            >
              {uniqueStatuses.map(c => <Option key={c.value} value={c.value} label={c.label} />)}
            </SelectField>
            <DataField
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size={3}
            />
          </Grid>
        </div>

        {/* Pinned Notices Section */}
        {pinnedNotices.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#223F74] mb-4 flex items-center gap-2">
              <Pin size={20} className="text-amber-500" />
              Pinned Notices
            </h2>
            <DataTable 
              columns={tableColumns}
              rows={pinnedNotices}
              actions={tableActions.filter(a => a.tooltip !== 'Toggle Pin')}
              searchable={true}
              exportable={true}
              exportFileName="pinned_notices"
              pageSize={5}
            />
          </div>
        )}

        {/* Notices List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#223F74] mb-4 flex items-center gap-2">
            <FileText size={20} className="text-[#223F74]" />
            Notices List
          </h2>
          <DataTable 
            columns={tableColumns}
            rows={unpinnedNotices}
            actions={tableActions}
            searchable={true}
            exportable={true}
            exportFileName="unpinned_notices"
            pageSize={10}
            noRecordsMessage="No notices found."
          />
        </div>
      </main>

      {/* View Notice Modal */}
      <PanelModal
        isVisible={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={selectedNotice?.title || "Notice Details"}
        size="lg"
      >
        {selectedNotice && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[selectedNotice.category]}`}>
                {selectedNotice.category}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedNotice.status]}`}>
                {selectedNotice.status}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-grey-600 text-sm">Published by</p>
                <p className="text-grey-900 font-semibold">{selectedNotice.publishedBy}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-grey-600 text-sm">Published Date</p>
                  <p className="text-grey-900 font-semibold">{new Date(selectedNotice.publishedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-grey-600 text-sm">Expiry Date</p>
                  <p className="text-grey-900 font-semibold">{new Date(selectedNotice.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-grey-600 text-sm">Audience</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedNotice.audience.map(aud => (
                    <span key={aud} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded">
                      {aud}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-grey-600 text-sm mb-2">Content</p>
              <div className="bg-grey-50 p-4 rounded-lg text-grey-800 whitespace-pre-wrap">
                {selectedNotice.content}
              </div>
            </div>

            <div className="bg-grey-50 p-4 rounded-lg">
              <p className="text-grey-600 text-sm">Attachments</p>
              {selectedNotice.attachments && selectedNotice.attachments.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {selectedNotice.attachments.map((attachment, index) => (
                    <div key={`${attachment.url}-${index}`} className="flex items-center justify-between gap-3">
                      <span className="text-grey-700 text-sm truncate">
                        {attachment.name || `Attachment ${index + 1}`}
                      </span>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 text-sm hover:underline shrink-0"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-grey-700 mt-2">No attachments</p>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button text="Close" variant="ghost" onClick={() => setShowViewModal(false)} />
            </div>
          </div>
        )}
      </PanelModal>

      {/* Create/Edit Notice Modal */}
      <PanelModal
        isVisible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedAttachmentFiles([]);
        }}
        title={editingId ? 'Edit Notice' : 'Create Notice'}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-grey-300 rounded-lg px-4 py-2 text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notice title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-grey-300 rounded-lg px-4 py-2 text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Academic</option>
              <option>Administrative</option>
              <option>Exam</option>
              <option>Holiday</option>
              <option>General</option>
              <option>Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Audience <span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              {['Teachers', 'Parents', 'Students'].map(aud => (
                <label key={aud} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.audience.includes(aud)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, audience: [...formData.audience, aud] });
                      } else {
                        setFormData({ ...formData, audience: formData.audience.filter(a => a !== aud) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-grey-700">{aud}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Notice Content <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border border-grey-300 rounded-lg px-4 py-2 text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              placeholder="Full notice content"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full border border-grey-300 rounded-lg px-4 py-2 text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Attachments
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 5);
                setSelectedAttachmentFiles(files);
              }}
              className="w-full border border-grey-300 rounded-lg px-4 py-2 text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedAttachmentFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedAttachmentFiles.map((file, index) => (
                  <p key={`${file.name}-${index}`} className="text-xs text-grey-600 truncate">
                    {file.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.pinned}
              onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
              className="rounded"
              id="pinned"
            />
            <label htmlFor="pinned" className="text-grey-700">Pin this notice</label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-grey-900 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {['Draft', 'Published'].map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={formData.status === status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="rounded"
                  />
                  <span className="text-grey-700">{status}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              text="Cancel"
              onClick={() => {
                setShowCreateModal(false);
                setSelectedAttachmentFiles([]);
              }}
            />
            <Button
              variant="primary"
              text={editingId ? 'Update Notice' : (formData.status === 'Draft' ? 'Save Draft' : 'Publish Notice')}
              onClick={handleSave}
            />
          </div>
        </div>
      </PanelModal>

      {/* Delete Confirmation Modal */}
      <PanelModal
        isVisible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Notice"
        size="md"
      >
        {selectedNotice && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <p className="text-grey-700">
                Are you sure you want to delete <strong>"{selectedNotice.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button text="Cancel" variant="ghost" onClick={() => setShowDeleteConfirm(false)} />
              <Button text="Delete" variant="danger" onClick={confirmDelete} />
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default Notices;