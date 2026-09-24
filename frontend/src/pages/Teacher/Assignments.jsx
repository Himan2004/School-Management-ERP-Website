import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, Plus, Search, Filter, Edit, Trash2, Eye, Download, 
  Calendar, Clock, CheckCircle, Award, Paperclip, X, SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/teacher/Card';
import Table from '../../components/teacher/Table';
import api from '../../services/api';

const Assignments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, graded: 0 });
  const [classes, setClasses] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateSort, setDateSort] = useState('latest');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [classId, setClassId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Check if we should auto-open the create modal (coming from navbar)
  useEffect(() => {
    const shouldOpenModal = location.state?.openCreateModal === true;
    if (shouldOpenModal) {
      openCreateModal();
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const formatDateForUI = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().split('T')[0];
  };

  const fetchAssignments = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const res = await api.get('/teacher/assignments', {
        params: { search: searchTerm, page: currentPage, limit: 10, status: statusFilter, priority: priorityFilter, targetClass: classFilter, sortDate: dateSort }
      });
      setAssignments(res.data?.data?.assignments || []);
      setStats(res.data?.data?.stats || { total: 0, active: 0, pending: 0, graded: 0 });
      setTotalPages(res.data?.data?.pagination?.totalPages || 1);
      setShowFilterMenu(false); 
      if (showToast) toast.success('Data refreshed');
    } catch (err) {
      toast.error("Failed to fetch assignments");
      console.error("Failed to fetch assignments", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage, statusFilter, priorityFilter, classFilter, dateSort]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/teacher/assignments/classes');
      setClasses(res.data?.data || []);
      if (res.data?.data?.length > 0) setClassId(res.data.data[0]._id);
    } catch (err) {
      console.error("Failed to fetch classes", err);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { fetchAssignments(); }, [fetchAssignments, currentPage]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const formattedFiles = files.map(file => ({ name: file.name, url: URL.createObjectURL(file) }));
    setSelectedFiles(prev => [...prev, ...formattedFiles]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const openCreateModal = () => {
    setEditingId(null); 
    setTitle(''); 
    setDesc(''); 
    setDueDate(''); 
    setPriority('Medium'); 
    setSelectedFiles([]);
    if (classes.length > 0) setClassId(classes[0]._id);
    setShowCreateModal(true);
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setTitle(row.title);
    setDesc(row.description || '');
    setClassId(row.classId || (classes.length > 0 ? classes[0]._id : ''));
    setDueDate(formatDateForInput(row.dueDate));
    setPriority(row.priority ? row.priority.charAt(0).toUpperCase() + row.priority.slice(1) : 'Medium');
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        title, 
        description: desc, 
        classId, 
        dueDate, 
        priority: priority.toLowerCase(), 
        attachments: selectedFiles 
      };
      
      if (editingId) {
        await api.put(`/teacher/assignments/${editingId}`, payload);
      } else {
        await api.post('/teacher/assignments', payload);
      }
      
      toast.success(editingId ? 'Updated successfully' : 'Created successfully');
      setShowCreateModal(false);
      fetchAssignments();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save assignment";
      toast.error(msg);
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this assignment?")) {
      try {
        await api.delete(`/teacher/assignments/${id}`);
        toast.success('Deleted successfully');
        fetchAssignments();
      } catch (err) {
        toast.error("Failed to delete.");
      }
    }
  };

  const handleDownload = (assignment) => {
    const dataStr = JSON.stringify(assignment, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${assignment.title.replace(/\s+/g, '_')}_Details.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Metadata exported');
  };

  const columns = [
    {
      header: 'Assignment',
      cell: (row) => (
        <div className="py-2">
          <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{row.title}</p>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{row.class}</p>
        </div>
      )
    },
    {
      header: 'Due Date',
      cell: (row) => (
        <div className="flex items-center">
          <div className="p-1.5 bg-gray-50 rounded-lg mr-3">
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">{formatDateForUI(row.dueDate)}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Deadline</p>
          </div>
        </div>
      )
    },
    {
      header: 'Submissions',
      cell: (row) => {
        const percentage = row.totalStudents > 0 ? (row.submissions / row.totalStudents) * 100 : 0;
        return (
        <div className="w-full max-w-[120px]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-black text-gray-900">{row.submissions}/{row.totalStudents}</span>
            <span className="text-[10px] font-bold text-gray-400">{Math.round(percentage)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-emerald-500' : percentage > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }} />
          </div>
        </div>
      )}
    },
    {
      header: 'Status',
      cell: (row) => (
        <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Priority',
      cell: (row) => {
        const pri = row.priority?.toLowerCase() || 'medium';
        return (
          <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${pri === 'high' ? 'bg-rose-100 text-rose-700' : pri === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
            {pri}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-1 justify-end">
          <button onClick={() => navigate(`/teacher/assignments/${row.id}/submissions`)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="View Submissions"><Eye className="w-4 h-4" /></button>
          <button onClick={() => handleEditClick(row)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit"><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => handleDownload(row)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all" title="Export JSON"><Download className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Assignments</h1>
          <p className="mt-1 text-gray-500 font-medium">Create coursework and monitor student submissions.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => fetchAssignments(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button onClick={openCreateModal} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transform hover:-translate-y-0.5 transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" /> Create Assignment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText className="w-6 h-6" /></div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Assignments</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Award className="w-6 h-6" /></div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Graded</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{stats.graded}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Review</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="!overflow-visible relative z-20 border-none shadow-md">
        <div className="p-6 flex flex-col lg:flex-row justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <input type="text" placeholder="Search by assignment title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-100 bg-gray-50/50 py-3 pl-11 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative min-w-[180px]">
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-full rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer">
                <option value="All Classes">All Classes</option>
                {classes.map((cls) => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`flex items-center rounded-xl border px-4 py-3 text-sm font-bold transition-all shadow-sm ${showFilterMenu ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                <SlidersHorizontal className="w-4 h-4 mr-2" /> Advanced
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-extrabold text-gray-900 tracking-tight">Refine Results</h4>
                    <button onClick={() => setShowFilterMenu(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sort by Due Date</label>
                      <select value={dateSort} onChange={(e) => setDateSort(e.target.value)} className="w-full text-sm font-bold rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="latest">Newest to Oldest</option>
                        <option value="earliest">Oldest to Newest</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Filter by Status</label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full text-sm font-bold rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="completed">Completed Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Priority Level</label>
                      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full text-sm font-bold rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Priorities</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={() => { setDateSort('latest'); setStatusFilter('all'); setPriorityFilter('all'); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">Reset</button>
                      <button onClick={() => fetchAssignments(true)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Apply</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Fetching assignments list...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText className="w-16 h-16 text-gray-100 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No assignments found</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto font-medium">Try adjusting your filters or search term to see results.</p>
          </div>
        ) : (
          <Table columns={columns} data={assignments} pagination={true} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>

      {/* Create / Edit Modal - Made Smaller */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl p-5 animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">{editingId ? 'Edit Assignment' : 'New Assignment'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  required 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" 
                  placeholder="Assignment title" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  rows={3} 
                  required 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" 
                  placeholder="Instructions for students..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Class</label>
                  <select 
                    required 
                    value={classId} 
                    onChange={(e) => setClassId(e.target.value)} 
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Select</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input 
                      type="date" 
                      required 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 pl-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button 
                      key={level} 
                      type="button" 
                      onClick={() => setPriority(level)} 
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${priority === level ? (level === 'High' ? 'bg-rose-50 border-rose-200 text-rose-600' : level === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-sky-50 border-sky-200 text-sky-600') : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Attachments</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center relative hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer">
                  <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Paperclip className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">Click to upload files</p>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedFiles.map((file, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[9px] font-medium">
                        <FileText className="w-3 h-3" />
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button type="button" onClick={() => removeFile(index)} className="hover:bg-blue-100 rounded-full p-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;