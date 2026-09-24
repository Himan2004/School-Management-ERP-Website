import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  CalendarDays, Clock3, CheckCircle2, XCircle, 
  Eye, Check, X
} from 'lucide-react';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  PanelModal,
  GColumnChart,
  GDoughnutChart
} from '../../components/shared/Common_Components';
import api from '../../services/api';

const Leave = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // DataTable filter state
  const [activeFilters, setActiveFilters] = useState({});

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/teacher/leave');
      if (response.data && response.data.data) {
        setRequests(response.data.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // 1. Computed Filtered Data
  const filteredData = useMemo(() => {
    return requests.filter(req => {
      // Status Filter
      if (activeFilters.status?.length > 0) {
        if (!activeFilters.status.map(s => s.toLowerCase()).includes(req.status.toLowerCase())) {
          return false;
        }
      }
      // Leave Type Filter
      if (activeFilters.leaveType?.length > 0) {
        if (!activeFilters.leaveType.map(t => t.toLowerCase()).includes(req.leaveType.toLowerCase())) {
          return false;
        }
      }
      // Date Filter
      if (activeFilters.startDate && req.appliedOn && new Date(req.appliedOn) < new Date(activeFilters.startDate)) return false;
      if (activeFilters.endDate && req.appliedOn && new Date(req.appliedOn) > new Date(activeFilters.endDate)) return false;
      
      // Global Search
      if (activeFilters.search) {
        const search = activeFilters.search.toLowerCase();
        const match = (req.studentName?.toLowerCase().includes(search)) || 
                      (req.id?.toLowerCase().includes(search)) || 
                      (req.rollNo?.toLowerCase().includes(search));
        if (!match) return false;
      }
      
      return true;
    });
  }, [requests, activeFilters]);

  // 2. Dynamic Stats from Filtered Data
  const totalRequests = filteredData.length;
  const pendingRequests = filteredData.filter(r => r.status.toLowerCase() === 'pending').length;
  const approvedRequests = filteredData.filter(r => r.status.toLowerCase() === 'approved').length;
  const rejectedRequests = filteredData.filter(r => r.status.toLowerCase() === 'rejected').length;
  const cancelledRequests = filteredData.filter(r => r.status.toLowerCase() === 'cancelled').length;

  // 3. Chart Data Generation
  const doughnutData = [
    { name: 'Pending', value: pendingRequests },
    { name: 'Approved', value: approvedRequests },
    { name: 'Rejected', value: rejectedRequests },
    { name: 'Cancelled', value: cancelledRequests }
  ];
  const doughnutColors = ['#F59E0B', '#10B981', '#EF4444', '#64748B'];

  const generateTrendData = () => {
    let viewType = "Daily";
    if (Array.isArray(activeFilters.viewType) && activeFilters.viewType.length > 0) {
      viewType = activeFilters.viewType[0];
    } else if (typeof activeFilters.viewType === 'string') {
      viewType = activeFilters.viewType;
    }

    const map = {};
    filteredData.forEach(req => {
        let key = req.appliedOn;
        if (viewType === 'Monthly') {
           const d = new Date(req.appliedOn);
           key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
        
        if (!map[key]) map[key] = { name: key, Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0 };
        if (req.status === 'Pending') map[key].Pending++;
        if (req.status === 'Approved') map[key].Approved++;
        if (req.status === 'Rejected') map[key].Rejected++;
        if (req.status === 'Cancelled') map[key].Cancelled++;
    });
    let arr = Object.values(map);
    if (viewType !== 'Monthly') {
       arr.sort((a,b) => new Date(a.name) - new Date(b.name));
    }
    if (arr.length === 0) arr = [{ name: 'No Data', Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0 }];
    return arr;
  };
  const columnBars = [
    { key: 'Pending', color: '#F59E0B' },
    { key: 'Approved', color: '#10B981' },
    { key: 'Rejected', color: '#EF4444' },
    { key: 'Cancelled', color: '#64748B' }
  ];

  // 4. Action Handlers
  const handleApprove = async (rawId) => {
    if (window.confirm('Are you sure you want to approve this leave request?')) {
      try {
        setIsProcessing(true);
        await api.patch(`/teacher/leave/${rawId}`, { status: 'approved' });
        toast.success('Request approved successfully');
        fetchLeaveRequests();
      } catch (error) {
        toast.error(error.message || 'Failed to approve request');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Reason for rejection is mandatory');
      return;
    }
    try {
      setIsProcessing(true);
      await api.patch(`/teacher/leave/${selectedRequest.rawId}`, { 
        status: 'rejected', 
        rejectionReason: rejectReason 
      });
      toast.success('Request rejected successfully');
      setShowRejectModal(false);
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200 border';
    if (s === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200 border';
    if (s === 'cancelled') return 'bg-slate-100 text-slate-600 border-slate-200 border';
    return 'bg-amber-50 text-amber-700 border-amber-200 border';
  };

  // 5. Table Configuration
  const columns = [
    { key: 'id', label: 'Request ID' },
    { 
      key: 'student', 
      label: 'Student Name',
      render: (_, item) => (
        <div className="flex items-center space-x-3 min-w-[150px]">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {item.studentName ? item.studentName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-semibold text-[#1D1D1F] truncate">{item.studentName}</span>
        </div>
      )
    },
    { key: 'rollNo', label: 'Roll No.', render: (_, item) => item.rollNo || '-' },
    { 
      key: 'leaveType', 
      label: 'Leave Type',
      render: (_, item) => <span className="font-bold text-slate-700">{item.leaveType}</span>
    },
    { 
      key: 'leaveDates', 
      label: 'Leave Dates',
      render: (_, item) => <span className="font-bold text-slate-700 text-sm">{item.range}</span>
    },
    { 
      key: 'duration', 
      label: 'Duration',
      render: (_, item) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.days} {item.days === 1 ? 'Day' : 'Days'}</span>
    },
    { key: 'appliedOn', label: 'Applied Date', render: (_, item) => <span className="text-slate-600 font-medium">{item.appliedOn}</span> },
    { 
      key: 'status', 
      label: 'Status',
      render: (_, item) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(item.status)}`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => {
        const isPending = item.status.toLowerCase() === 'pending';
        return (
          <div className="flex items-center gap-3">
            <span 
              title="View" 
              onClick={() => { setSelectedRequest(item); setShowViewModal(true); }} 
              className="cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-500 hover:text-[#223F74]" />
            </span>
            {isPending && (
              <>
                <span 
                  title="Approve" 
                  onClick={() => handleApprove(item.rawId)} 
                  className="cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-500 hover:text-emerald-700" />
                </span>
                <span 
                  title="Reject" 
                  onClick={() => { 
                    setSelectedRequest(item); 
                    setRejectReason('');
                    setShowRejectModal(true); 
                  }} 
                  className="cursor-pointer"
                >
                  <X className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                </span>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const dataTableFilters = [
    { title: "Status", type: "toggle", key: "status", options: ["Pending", "Approved", "Rejected", "Cancelled"] },
    { title: "Leave Type", type: "toggle", key: "leaveType", options: ["Sick Leave", "Emergency Leave", "Casual Leave", "Medical Leave", "Family Function", "Personal Leave", "Sports Event", "Competition", "Religious Holiday", "Other"] },
    { title: "View Type", type: "toggle", key: "viewType", options: ["Daily", "Monthly", "Custom Date Range"], fn: () => true }
  ];

  return (
    <div className="space-y-6">
      <Heading primaryText="Student Leave" />

      {/* Summary Cards */}
      <DashGrid cols={12}>
        <EnhancedDashCard title="Total Requests" description="Across all records" value={totalRequests} icon={<CalendarDays size={24} />} accentColor="#4f46e5" size={3} />
        <EnhancedDashCard title="Pending Requests" description="Awaiting review" value={pendingRequests} icon={<Clock3 size={24} />} accentColor="#F59E0B" size={3} />
        <EnhancedDashCard title="Approved Requests" description="Successfully processed" value={approvedRequests} icon={<CheckCircle2 size={24} />} accentColor="#10B981" size={3} />
        <EnhancedDashCard title="Rejected Requests" description="With valid reasons" value={rejectedRequests} icon={<XCircle size={24} />} accentColor="#EF4444" size={3} />
      </DashGrid>

      {/* Dynamic Charts */}
      <DashGrid cols={12}>
        <GColumnChart title="Leave Trend" data={generateTrendData()} bars={columnBars} size={6} />
        <GDoughnutChart title="Leave Status Distribution" data={doughnutData} colors={doughnutColors} size={6} />
      </DashGrid>

      {/* Table */}
      <DashGrid cols={12}>
        {isLoading ? (
          <div className="col-span-12 flex justify-center items-center py-12 bg-white border border-slate-200 rounded-[2rem] w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
          </div>
        ) : (
          <DataTable
            title="Student Leave Requests"
            columns={columns}
            rows={filteredData} 
            searchable={true}
            exportable={true} 
            pageSize={10}
            filters={dataTableFilters}
            onApplyFilters={setActiveFilters}
            date={true} 
          />
        )}
      </DashGrid>

      {/* Footer Summary */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">Leave Summary</h3>
        </div>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingRequests}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{approvedRequests}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejected</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{rejectedRequests}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Requests</p>
            <p className="text-2xl font-black text-[#223F74] mt-1">{totalRequests}</p>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <PanelModal id="viewLeaveModal" title="Leave Request Details" isVisible={true} onClose={() => setShowViewModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-slate-500 mb-1">Request ID</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.id}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Last Updated</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.lastUpdated}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Student Name</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.studentName}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Roll No.</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.rollNo || '-'}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Leave Type</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.leaveType}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Leave Dates</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.range}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Total Days</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.days}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">Applied Date</p><p className="font-semibold text-[#1D1D1F]">{selectedRequest.appliedOn}</p></div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${getStatusBadge(selectedRequest.status)}`}>{selectedRequest.status}</span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Leave Reason</p>
                <p className="font-semibold text-[#1D1D1F] whitespace-pre-wrap">{selectedRequest.reason || 'None provided'}</p>
              </div>
              {selectedRequest.status.toLowerCase() === 'rejected' && (
                <div className="col-span-2">
                  <p className="text-sm text-rose-500 font-bold mb-1">Rejection Reason</p>
                  <p className="font-semibold text-[#1D1D1F] whitespace-pre-wrap">{selectedRequest.rejectionReason || 'No specific reason logged'}</p>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setShowViewModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Close</button>
              {selectedRequest.status.toLowerCase() === 'pending' && (
                <>
                  <button onClick={() => { setShowViewModal(false); setRejectReason(''); setShowRejectModal(true); }} className="px-5 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors">Reject</button>
                  <button onClick={() => { setShowViewModal(false); handleApprove(selectedRequest.rawId); }} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm">Approve</button>
                </>
              )}
            </div>
          </div>
        </PanelModal>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <PanelModal id="rejectLeaveModal" title="Reject Leave Request" isVisible={true} onClose={() => setShowRejectModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">You are about to reject the leave request for <strong>{selectedRequest.studentName}</strong>.</p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Rejection <span className="text-rose-500">*</span></label>
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] outline-none" 
                rows={3} 
                placeholder="Please provide a mandatory reason for rejection..." 
              />
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setShowRejectModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors" disabled={isProcessing}>Cancel</button>
              <button 
                onClick={handleRejectConfirm} 
                disabled={isProcessing}
                className="px-5 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50 flex items-center"
              >
                {isProcessing ? 'Processing...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default Leave;