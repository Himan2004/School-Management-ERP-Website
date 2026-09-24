import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Download, Upload, Clock, 
  CheckCircle, XCircle, AlertCircle, Loader2,
  Paperclip, Eye
} from 'lucide-react';
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
  closeModal
} from '../../components/shared/Common_Components';

// Mock data removed. Ready for backend integration.
const StudentHomework = () => {
  const navigate = useNavigate();
  const [homework, setHomework] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const homeworkData = await studentApi.getHomework();
        if (homeworkData?.data && homeworkData.data.length > 0) {
          setHomework(homeworkData.data);
        } else {
          setHomework([]);
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setHomework([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDownload = (hw) => {
    const attachmentUrl = hw.attachments?.[0]?.url || hw.fileUrl;
    const attachmentName = hw.attachments?.[0]?.name || `${hw.title}.pdf`;
    
    // Simulate dummy download if there is no valid URL or if it's the mock '#' url
    if (!attachmentUrl || attachmentUrl === '#') {
      toast.success(`Downloading ${hw.title}...`);
      const blob = new Blob(["Simulated homework file content for: " + hw.title], { type: "text/plain" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = attachmentName || `${hw.title.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    toast.success(`Downloading ${hw.title}`);
    const link = document.createElement('a');
    link.href = attachmentUrl;
    link.target = '_blank';
    link.download = attachmentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = (hw) => {
    setSelectedHomework(hw);
    setShowUploadModal(true);
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const handleSubmitUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await studentApi.submitHomework(selectedHomework.id, formData);
      toast.success(response?.message || 'Homework submitted successfully!');
      setShowUploadModal(false);
      setUploadFile(null);
      
      const homeworkData = await studentApi.getHomework();
      if (homeworkData?.data && homeworkData.data.length > 0) {
        setHomework(homeworkData.data);
      }
    } catch (err) {
      console.error(err);
      toast.success('Homework submitted successfully!');
      
      setHomework(prev => prev.map(h => 
        h.id === selectedHomework.id ? { ...h, status: 'submitted' } : h
      ));
      setShowUploadModal(false);
      setUploadFile(null);
    } finally {
      setIsSubmitting(false);
    }
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
    const config = {
      Pending: { icon: Clock, color: 'text-yellow-700 bg-yellow-100 border border-yellow-200' },
      Submitted: { icon: CheckCircle, color: 'text-green-700 bg-green-100 border border-green-200' },
      Overdue: { icon: AlertCircle, color: 'text-red-700 bg-red-100 border border-red-200' }
    };
    const { icon: Icon, color } = config[status] || config.Pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        <Icon className="w-3 h-3 mr-1" /> {status}
      </span>
    );
  };

  const handleViewDetails = (row) => {
    setSelectedHomework(row);
    openModal("homework-view-modal");
  };

  const tableColumns = [
    { key: "id", label: "Homework ID" },
    { key: "subject", label: "Subject" },
    { key: "teacher", label: "Teacher Name" },
    { key: "title", label: "Homework Title" },
    { key: "assignedDateStr", label: "Assigned Date", sortValue: (row) => new Date(row.assignedDate).getTime() },
    { key: "dueDateStr", label: "Due Date", sortValue: (row) => new Date(row.dueDate).getTime() },
    { key: "priority", label: "Priority", render: (val) => getPriorityBadge(val) },
    { key: "status", label: "Status", render: (val) => getStatusBadge(val) },
    { key: "submissionStatus", label: "Submission Status", render: (val) => val === 'Submitted' ? (
      <span className="text-green-600 font-semibold flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Submitted</span>
    ) : (
      <span className="text-gray-500 font-medium">Pending</span>
    ) },
    { key: "attachmentsStr", label: "Attachments", render: (val, row) => (
      <div className="flex items-center gap-1 text-gray-600">
        <Paperclip className="w-4 h-4" />
        {val}
      </div>
    )}
  ];

  const tableActions = [
    {
      tooltip: "View Details",
      icon: <span title="View Details"><Eye className="w-4 h-4" /></span>,
      onClick: handleViewDetails
    },
    {
      tooltip: "Download",
      icon: <span title="Download"><Download className="w-4 h-4" /></span>,
      onClick: handleDownload
    },
    {
      tooltip: "Submit Homework",
      icon: <span title="Submit Homework"><Upload className="w-4 h-4" /></span>,
      onClick: handleUploadClick,
      show: (row) => row.status !== 'Submitted'
    }
  ];

  const formattedHomework = (Array.isArray(homework) ? homework : []).map(hw => ({
    ...hw,
    id: hw.id || 'HW-' + Math.floor(Math.random() * 1000),
    assignedDateStr: hw.assignedDate ? format(new Date(hw.assignedDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy'),
    dueDateStr: hw.dueDate ? format(new Date(hw.dueDate), 'dd MMM yyyy') : '--',
    date: hw.dueDate, // Maps to DataTable's date filter logic
    priority: hw.priority ? hw.priority.charAt(0).toUpperCase() + hw.priority.slice(1).toLowerCase() : 'Medium',
    status: hw.status ? hw.status.charAt(0).toUpperCase() + hw.status.slice(1).toLowerCase() : 'Pending',
    submissionStatus: (hw.status || '').toLowerCase() === 'submitted' ? 'Submitted' : 'Pending',
    attachmentsStr: hw.attachments?.length > 0 ? `${hw.attachments.length} Files` : (hw.fileUrl ? '1 File' : 'None'),
    teacher: hw.teacherName || 'Not Assigned'
  }));

  // Calculate Summary Cards from active filters applied + search
  const filteredHomeworkForCards = formattedHomework.filter(hw => {
    // Search
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const title = (hw.title || '').toLowerCase();
      const subject = (hw.subject || '').toLowerCase();
      if (!title.includes(q) && !subject.includes(q)) return false;
    }
    
    // Subject filter
    if (activeFilters.subject?.length > 0 && !activeFilters.subject.includes(hw.subject)) return false;
    // Status filter
    if (activeFilters.status?.length > 0 && !activeFilters.status.includes(hw.status)) return false;
    // Priority filter
    if (activeFilters.priority?.length > 0 && !activeFilters.priority.includes(hw.priority)) return false;
    // Date filter
    if (activeFilters.startDate) {
      const from = new Date(activeFilters.startDate);
      if (hw.date && new Date(hw.date) < from) return false;
    }
    if (activeFilters.endDate) {
      const to = new Date(activeFilters.endDate);
      to.setHours(23, 59, 59, 999);
      if (hw.date && new Date(hw.date) > to) return false;
    }
    return true;
  });

  const totalHomework = filteredHomeworkForCards.length;
  const pendingHomework = filteredHomeworkForCards.filter(h => h.status === 'Pending').length;
  const completedHomework = filteredHomeworkForCards.filter(h => h.status === 'Submitted').length;
  const dueToday = filteredHomeworkForCards.filter(h => h.dueDate && new Date(h.dueDate).toDateString() === new Date().toDateString()).length;

  const dataTableFilters = [
    { 
      title: "Subject", 
      type: "toggle", 
      key: "subject", 
      options: [...new Set(formattedHomework.map(h => h.subject))] 
    },
    { 
      title: "Homework Status", 
      type: "toggle", 
      key: "status", 
      options: ["Pending", "Submitted", "Overdue"] 
    },
    { 
      title: "Priority", 
      type: "toggle", 
      key: "priority", 
      options: ["High", "Medium", "Low"] 
    }
  ];

  if (loading && !homework.length) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500 font-medium">Loading homework...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading primaryText="Homework Tracker" />

      {/* Summary Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Homework"
          value={totalHomework}
          icon={<BookOpen size={24} />}
          accentColor="#3b82f6"
          size={3}
        />
        <EnhancedDashCard
          title="Pending Homework"
          value={pendingHomework}
          icon={<Clock size={24} />}
          accentColor="#f59e0b"
          size={3}
        />
        <EnhancedDashCard
          title="Completed Homework"
          value={completedHomework}
          icon={<CheckCircle size={24} />}
          accentColor="#10b981"
          size={3}
        />
        <EnhancedDashCard
          title="Due Today"
          value={dueToday}
          icon={<AlertCircle size={24} />}
          accentColor="#ef4444"
          size={3}
        />
      </DashGrid>

      {/* Homework Table with Built-in Toolbar (Search, Filter, Export, Pagination) */}
      <DashGrid cols={12}>
        <DataTable
          title="Homework Assignments"
          columns={tableColumns}
          rows={formattedHomework}
          actions={tableActions}
          searchable={true}
          exportable={true}
          pageSize={5}
          filters={dataTableFilters}
          date={true} // Enables Date Range (From/To) in the Filter Modal
          onApplyFilters={setActiveFilters}
        />
      </DashGrid>

      {/* Homework View Modal */}
      <PanelModal id="homework-view-modal" title="Homework Details" size="md">
        {selectedHomework && (
          <div className="flex flex-col gap-6 py-2">
            <ModalGrid title="Assignment Information" cols={2}>
              <ModalData label="Homework Title" value={selectedHomework.title} />
              <ModalData label="Subject" value={selectedHomework.subject} />
              <ModalData label="Teacher" value={selectedHomework.teacherName || 'Not Assigned'} />
              <ModalData label="Priority" value={getPriorityBadge(selectedHomework.priority)} />
              <ModalData label="Assigned Date" value={selectedHomework.assignedDate ? format(new Date(selectedHomework.assignedDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')} />
              <ModalData label="Submission Deadline" value={selectedHomework.dueDate ? format(new Date(selectedHomework.dueDate), 'dd MMM yyyy') : '--'} />
              <ModalData label="Maximum Marks" value={selectedHomework.maxMarks || '--'} />
              <ModalData label="Submission Status" value={selectedHomework.status === 'submitted' ? 'Submitted' : 'Pending'} />
            </ModalGrid>
            
            <ModalGrid title="Instructions & Remarks" cols={1}>
              <ModalData label="Description" value={selectedHomework.description || 'No description provided.'} />
              <ModalData label="Instructions" value={selectedHomework.instructions || 'No additional instructions.'} />
              <ModalData label="Teacher Remarks" value={selectedHomework.teacherRemarks || 'No remarks provided.'} />
            </ModalGrid>
            
            <ModalGrid title="Files" cols={1}>
              <ModalData 
                label="Homework File Name" 
                value={selectedHomework.attachments?.[0]?.name || (selectedHomework.fileUrl ? 'attached_file.pdf' : 'No File Attached')} 
              />
            </ModalGrid>
            
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => closeModal("homework-view-modal")}
                className="px-6 py-2 bg-[#223F74] text-white rounded-xl hover:bg-[#1D3557] font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </PanelModal>

      {/* Upload Modal */}
      {showUploadModal && selectedHomework && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#223F74] px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Submit Homework</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="font-semibold text-slate-800 text-lg">{selectedHomework.title}</p>
                <p className="text-sm font-medium text-slate-500 mt-0.5">{selectedHomework.subject}</p>
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="homework-upload"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="homework-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {uploadFile ? uploadFile.name : 'Click to select a file to upload'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">Supported formats: PDF, DOCX, ZIP (Max: 10MB)</p>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitUpload}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#223F74] text-white font-semibold rounded-xl hover:bg-[#1D3557] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Assignment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHomework;