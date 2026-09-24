import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Pin, PinOff, Edit, Trash2, Paperclip, 
  AlertCircle, X, Upload, Megaphone, Calendar, Users,
  Filter, ChevronDown
} from 'lucide-react';

const NoticeManagement = () => {
  // Initial mock data
  const initialNotices = [
    {
      id: '1',
      title: 'School Holiday on 15th April',
      description: 'On account of Ambedkar Jayanti, school remains closed for all classes. Regular classes will resume on 16th April.',
      audience: ['Students', 'Teachers'],
      postedDate: '2025-04-01',
      expiryDate: '2025-04-15',
      pinned: true,
      urgent: false,
      attachments: ['notice.pdf'],
      isNew: false
    },
    {
      id: '2',
      title: 'Parent-Teacher Meeting Schedule',
      description: 'PTM for grades 1-5 on 20th April, 9am-12pm. Attendance is mandatory for all parents. Please bring your child\'s report card.',
      audience: ['Teachers', 'Parents'],
      postedDate: '2025-03-28',
      expiryDate: '2025-04-20',
      pinned: false,
      urgent: true,
      attachments: [],
      isNew: true
    },
    {
      id: '3',
      title: 'Sports Day Registrations',
      description: 'Last date to register for annual sports meet is 10th April. Interested students should contact their class teacher.',
      audience: ['Students'],
      postedDate: '2025-03-25',
      expiryDate: '2025-04-10',
      pinned: false,
      urgent: false,
      attachments: ['registration_form.pdf'],
      isNew: false
    },
    {
      id: '4',
      title: 'Exam Fee Deadline Extension',
      description: 'Fee submission for annual exams extended till 25th April. Late fee will be applicable after deadline.',
      audience: ['Students', 'Parents'],
      postedDate: '2025-03-20',
      expiryDate: '2025-04-25',
      pinned: true,
      urgent: true,
      attachments: [],
      isNew: false
    },
    {
      id: '5',
      title: 'New Library Hours',
      description: 'Library will now remain open until 5 PM on weekdays. Weekend hours remain unchanged.',
      audience: ['Students', 'Teachers'],
      postedDate: '2025-04-02',
      expiryDate: '2025-05-01',
      pinned: false,
      urgent: false,
      attachments: [],
      isNew: true
    },
    {
      id: '6',
      title: 'Science Exhibition 2025',
      description: 'Annual science exhibition scheduled for 5th May. All students are encouraged to participate.',
      audience: ['Students'],
      postedDate: '2025-04-01',
      expiryDate: '2025-05-05',
      pinned: false,
      urgent: false,
      attachments: ['guidelines.pdf'],
      isNew: true
    }
  ];

  const [notices, setNotices] = useState(() => {
    const saved = localStorage.getItem('schoolerp_notices');
    return saved ? JSON.parse(saved) : initialNotices;
  });
  
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAudience, setFilterAudience] = useState('all');
  const [toast, setToast] = useState(null);

  // Save to localStorage
  React.useEffect(() => {
    localStorage.setItem('schoolerp_notices', JSON.stringify(notices));
  }, [notices]);

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter notices based on tabs, search, and audience
  const filteredNotices = useMemo(() => {
    let filtered = [...notices];

    // Tab filtering
    if (activeTab === 'pinned') {
      filtered = filtered.filter(n => n.pinned);
    } else if (activeTab === 'recent') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(n => new Date(n.postedDate) > weekAgo);
    } else if (activeTab === 'expired') {
      filtered = filtered.filter(n => new Date(n.expiryDate) < new Date());
    }

    // Search filtering
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Audience filtering
    if (filterAudience !== 'all') {
      filtered = filtered.filter(n => n.audience.includes(filterAudience));
    }

    // Pinned notices come first, then by date (newest first)
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.postedDate) - new Date(a.postedDate);
    });
  }, [notices, activeTab, searchQuery, filterAudience]);

  // Notice CRUD operations
  const handleSaveNotice = (noticeData) => {
    if (editingNotice) {
      setNotices(prev => prev.map(n => n.id === noticeData.id ? noticeData : n));
      showToastMessage('Notice updated successfully!');
    } else {
      setNotices(prev => [noticeData, ...prev]);
      showToastMessage('Notice created successfully!');
    }
    setShowModal(false);
    setEditingNotice(null);
  };

  const handleDeleteNotice = (noticeId) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      setNotices(prev => prev.filter(n => n.id !== noticeId));
      showToastMessage('Notice deleted successfully!', 'info');
    }
  };

  const handlePinNotice = (noticeId) => {
    setNotices(prev => prev.map(n =>
      n.id === noticeId ? { ...n, pinned: !n.pinned } : n
    ));
    const notice = notices.find(n => n.id === noticeId);
    showToastMessage(notice?.pinned ? 'Notice unpinned' : 'Notice pinned', 'info');
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setShowModal(true);
  };

  // Helper function to check if notice is expired
  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  // Notice Card Component
  const NoticeCard = ({ notice }) => {
    const expired = isExpired(notice.expiryDate);
    const isUrgent = notice.urgent && !expired && !notice.pinned;

    return (
      <div className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200 group ${
        notice.pinned 
          ? 'border-blue-200' 
          : isUrgent
          ? 'border-red-200'
          : 'border-slate-200'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 flex-wrap">
            {notice.pinned && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                <Pin size={12} /> Pinned
              </span>
            )}
            {notice.isNew && !notice.pinned && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                New
              </span>
            )}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                <AlertCircle size={12} /> Urgent
              </span>
            )}
            {expired && !notice.pinned && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs">
                Expired
              </span>
            )}
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handlePinNotice(notice.id)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={notice.pinned ? 'Unpin' : 'Pin'}
              aria-label={notice.pinned ? `Unpin notice ${notice.title}` : `Pin notice ${notice.title}`}
            >
              {notice.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
            <button
              onClick={() => handleEditNotice(notice)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit notice ${notice.title}`}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDeleteNotice(notice.id)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Delete notice ${notice.title}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <h3 className={`font-bold text-lg mb-2 text-slate-900 ${isUrgent ? 'text-red-600' : ''}`}>
          {notice.title}
        </h3>
        <p className="text-slate-600 text-sm mb-4 line-clamp-3">{notice.description}</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {notice.audience.map(aud => (
            <span key={aud} className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              {aud}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            Posted: {new Date(notice.postedDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle size={14} />
            Expires: {new Date(notice.expiryDate).toLocaleDateString()}
          </span>
        </div>

        {notice.attachments && notice.attachments.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-slate-500">
            <Paperclip size={14} />
            <span className="text-xs">{notice.attachments.length} attachment(s)</span>
          </div>
        )}
      </div>
    );
  };

  // Notice Modal Component
  const NoticeModal = () => {
    const dialogTitleId = 'notice-modal-heading';
    const [formData, setFormData] = useState({
      title: editingNotice?.title || '',
      description: editingNotice?.description || '',
      audience: editingNotice?.audience || ['Students'],
      expiryDate: editingNotice?.expiryDate || '',
      pinned: editingNotice?.pinned || false,
      urgent: editingNotice?.urgent || false,
      attachments: editingNotice?.attachments || []
    });

    const audienceOptions = ['Students', 'Teachers', 'Parents', 'Staff'];

    React.useEffect(() => {
      const onEscape = (e) => {
        if (e.key === 'Escape') {
          setShowModal(false);
          setEditingNotice(null);
        }
      };

      window.addEventListener('keydown', onEscape);
      return () => window.removeEventListener('keydown', onEscape);
    }, []);

    const handleAudienceToggle = (audienceItem) => {
      setFormData(prev => ({
        ...prev,
        audience: prev.audience.includes(audienceItem)
          ? prev.audience.filter(a => a !== audienceItem)
          : [...prev.audience, audienceItem]
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      handleSaveNotice({
        ...formData,
        id: editingNotice?.id,
        postedDate: editingNotice?.postedDate || new Date().toISOString().split('T')[0],
        isNew: !editingNotice
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-200">
            <h2 id={dialogTitleId} className="text-xl font-bold text-slate-900">
              {editingNotice ? 'Edit Notice' : 'Create New Notice'}
            </h2>
            <button
              onClick={() => {
                setShowModal(false);
                setEditingNotice(null);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Notice Title *</label>
              <input
                type="text"
                required
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notice title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Description *</label>
              <textarea
                rows="4"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notice details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Audience (Select multiple)</label>
              <div className="flex flex-wrap gap-2">
                {audienceOptions.map(aud => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => handleAudienceToggle(aud)}
                    className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
                      formData.audience.includes(aud)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Pin this notice (stays at top)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.urgent}
                  onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-slate-700">Mark as Urgent</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Attachment</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50/50">
                <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                <p className="text-sm text-slate-500">Click to upload file (PDF, DOC, etc.)</p>
                <input type="file" className="hidden" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingNotice(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {editingNotice ? 'Update Notice' : 'Create Notice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Tabs Component
  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium transition-all relative ${
        activeTab === id
            ? 'text-blue-600'
            : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-100">
          {count}
        </span>
      )}
      {activeTab === id && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
      )}
    </button>
  );

  // Calculate tab counts
  const tabCounts = {
    all: notices.length,
    pinned: notices.filter(n => n.pinned).length,
    recent: notices.filter(n => new Date(n.postedDate) > new Date(Date.now() - 7 * 86400000)).length,
    expired: notices.filter(n => new Date(n.expiryDate) < new Date()).length
  };

  return (
    <div className="space-y-6 text-slate-800 max-w-[1400px] mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <span className="text-sm font-medium text-slate-700">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Notice Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage school announcements and important updates
          </p>
        </div>
        <button
          onClick={() => {
            setEditingNotice(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={18} />
          Create Notice
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <TabButton id="all" label="All" count={tabCounts.all} />
        <TabButton id="pinned" label="Pinned" count={tabCounts.pinned} />
        <TabButton id="recent" label="Recent" count={tabCounts.recent} />
        <TabButton id="expired" label="Expired" count={tabCounts.expired} />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search notices by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <Filter size={18} />
          Filters
          <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Filter by Audience</label>
              <select
                value={filterAudience}
                onChange={(e) => setFilterAudience(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="all">All Audiences</option>
                <option value="Students">Students</option>
                <option value="Teachers">Teachers</option>
                <option value="Parents">Parents</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Sort by</label>
              <select className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white">
                <option>Newest First</option>
                <option>Oldest First</option>
                <option>Expiring Soon</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notice Cards Grid */}
      {filteredNotices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Megaphone className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg font-medium text-slate-600">No notices found</p>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery || filterAudience !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Create your first notice to get started'}
          </p>
          {!searchQuery && filterAudience === 'all' && (
            <button
              onClick={() => {
                setEditingNotice(null);
                setShowModal(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Create Notice
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotices.map(notice => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}

      {/* Notice Modal */}
      {showModal && <NoticeModal />}
    </div>
  );
};

export default NoticeManagement;