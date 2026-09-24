import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, UserX, Eye, CalendarCheck, Clock, FileText, CheckCircle, XCircle, Download, Search, Loader2
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option, PanelModal, GColumnChart, GDoughnutChart
} from '../../components/shared/Common_Components';

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

import { parentAttendanceApi } from '../../services/api/parentAttendanceApi';

export default function ParentAttendance() {
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('attendance');

  // --- FILTERS STATE (from DataTable onApplyFilters) ---
  const [activeFilters, setActiveFilters] = useState({});

  // --- DYNAMIC DATA STATE ---
  const [attendanceData, setAttendanceData] = useState([]);
  const [leavesData, setLeavesData] = useState([]);
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    leaveDays: 0,
    percentage: 0,
    isLowAttendance: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const studentId = localStorage.getItem("studentId");
        const schoolId = localStorage.getItem("schoolId");

        if (!studentId || !schoolId) {
          setError("Student or School ID missing. Please return to dashboard.");
          setLoading(false);
          return;
        }

        const [summaryRes, listRes, leavesRes] = await Promise.all([
          parentAttendanceApi.getSummary(studentId, schoolId),
          parentAttendanceApi.getList(studentId, schoolId),
          parentAttendanceApi.getLeaves(studentId, schoolId)
        ]);

        if (summaryRes?.success) setSummary(summaryRes.data);
        if (listRes?.success) setAttendanceData(listRes.data || []);
        if (leavesRes?.success) setLeavesData(leavesRes.data || []);
        setError("");
      } catch (err) {
        console.error("Failed to load attendance", err);
        setError("Could not load attendance data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // --- DERIVED STATS FOR CARDS & CHARTS ---
  const filteredAttendance = useMemo(() => {
    let result = attendanceData;
    if (activeFilters.startDate && activeFilters.endDate) {
      const start = new Date(activeFilters.startDate);
      const end = new Date(activeFilters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(d => {
        const dDate = new Date(d.date);
        return dDate >= start && dDate <= end;
      });
    }
    
    const attStatus = activeFilters["Attendance Status"];
    if (attStatus && attStatus.length > 0) {
      result = result.filter(d => attStatus.includes(d.status));
    }
    
    return result;
  }, [attendanceData, activeFilters]);

  const filteredLeaves = useMemo(() => {
    let result = leavesData;
    const leaveStatus = activeFilters["Leave Status"];
    if (leaveStatus && leaveStatus.length > 0) {
      result = result.filter(d => leaveStatus.includes(d.status));
    }
    return result;
  }, [leavesData, activeFilters]);

  // Attendance KPIs
  const presentCount = filteredAttendance.filter(d => d.status === "Present" || d.status === "Half Day").length;
  const lateCount = filteredAttendance.filter(d => d.status === "Late").length;
  const absentCount = filteredAttendance.filter(d => d.status === "Absent").length;
  const presentDays = presentCount + lateCount;
  const absentDays = absentCount;
  const totalWorkingDays = presentDays + absentDays;
  const attendancePercentage = summary.percentage || (totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0);
  
  let badgeText = "Defaulter";
  let badgeColor = "bg-rose-100 text-rose-700";
  if (attendancePercentage >= 95) { badgeText = "Excellent"; badgeColor = "bg-emerald-100 text-emerald-700"; }
  else if (attendancePercentage >= 85) { badgeText = "Good"; badgeColor = "bg-blue-100 text-blue-700"; }
  else if (attendancePercentage >= 75) { badgeText = "Average"; badgeColor = "bg-amber-100 text-amber-700"; }
  else if (attendancePercentage >= 60) { badgeText = "Less"; badgeColor = "bg-orange-100 text-orange-700"; }

  // Leave KPIs
  const leaveApproved = filteredLeaves.filter(l => l.status === "Approved").length;
  const leavePending = filteredLeaves.filter(l => l.status === "Pending").length;
  const leaveRejected = filteredLeaves.filter(l => l.status === "Rejected").length;
  const totalLeaves = filteredLeaves.length;
  const leaveDaysCount = filteredLeaves.reduce((acc, curr) => acc + (curr.days || curr.totalDays || 0), 0);

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const agg = {};
    monthNames.forEach(m => agg[m] = { month: m, present: 0, absent: 0, leave: 0 });
    
    filteredAttendance.forEach(d => {
      const dateStr = d.date;
      if (!dateStr) return;
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return;
      const m = monthNames[parsedDate.getMonth()];
      if (agg[m]) {
        if (d.status === "Present" || d.status === "Late") agg[m].present++;
        if (d.status === "Absent") agg[m].absent++;
      }
    });
    filteredLeaves.forEach(d => {
      const dateStr = d.startDate || d.fromDate;
      if (!dateStr) return;
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return;
      const m = monthNames[parsedDate.getMonth()];
      if (agg[m]) {
        agg[m].leave += (d.days || d.totalDays || 0); 
      }
    });
    
    const res = monthNames.map(m => agg[m]).filter(a => a.present > 0 || a.absent > 0 || a.leave > 0);
    return res.length > 0 ? res : [{ month: "-", present: 0, absent: 0, leave: 0 }];
  }, [filteredAttendance, filteredLeaves]);

  const chartDataKey = JSON.stringify(chartData);

  const handleView = (row, type) => {
    setSelectedRecord(row);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
  };

  // --- TABLE CONFIG ---
  const attendanceColumns = [
    { key: "date", label: "Date", align: "left" },
    { key: "day", label: "Day", align: "left", render: (val) => <span className="font-semibold text-slate-700">{val}</span> },
    { key: "checkIn", label: "Check In Time", align: "left" },
    { key: "checkOut", label: "Check Out Time", align: "left" },
    { key: "status", label: "Attendance Status", align: "center", render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Present' ? 'bg-emerald-50 text-emerald-700' :
        val === 'Late' ? 'bg-amber-50 text-amber-700' :
        val === 'Half Day' ? 'bg-purple-50 text-purple-700' :
        'bg-rose-50 text-rose-700'
      }`}>{val}</span>
    )},
    { key: "type", label: "Attendance Type", align: "center", render: (val) => <span className="font-semibold text-slate-700">{val}</span> },
    { key: "remarks", label: "Remarks", align: "center" },
    { key: 'actions', label: 'Actions', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => handleView(row, 'attendance')} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const leaveColumns = [
    { key: "id", label: "Leave ID", align: "left", render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: "type", label: "Leave Type", align: "left", render: (val) => <span className="font-medium text-slate-700">{val}</span> },
    { key: "startDate", label: "From Date", align: "left", render: (val) => <span className="whitespace-nowrap">{val}</span> },
    { key: "endDate", label: "To Date", align: "left", render: (val) => <span className="whitespace-nowrap">{val}</span> },
    { key: "days", label: "Total Days", align: "center", render: (val) => <span className="font-bold">{val}</span> },
    { key: "status", label: "Status", align: "center", render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
      }`}>{val}</span>
    )},
    { key: 'actions', label: 'Actions', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => handleView(row, 'leave')} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[#223F74]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-slate-500">Loading attendance details...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl m-8">{error}</div>;
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left min-h-screen">
      
      {/* 2. PROPER PAGE HEADING */}
      <Heading primaryText="Student" secondaryText="Attendance" size={12} showAnimations={true} />

      {/* 3. SUMMARY CARDS */}
      <style>{`
        .attendance-cards h3.truncate, .attendance-cards span.truncate {
          white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
        }
      `}</style>
      <div className="attendance-cards">
        <DashGrid cols={12} gap={4}>
          {activeTab === 'attendance' ? (
            <>
              <EnhancedDashCard 
                title="Attendance Percentage" 
                value={
                  <div className="flex items-center gap-2">
                    <span>{attendancePercentage}%</span>
                    <span className={`text-[11px] px-2.5 py-1 tracking-normal font-bold rounded-full ${badgeColor}`}>{badgeText}</span>
                  </div>
                } 
                icon={<Clock size={22} />} 
                size={3} 
                accentColor="#3B82F6" 
              />
              <EnhancedDashCard title="Present Days" value={String(presentDays)} icon={<UserCheck size={22} />} size={3} accentColor="#10B981" />
              <EnhancedDashCard title="Absent Days" value={String(absentDays)} icon={<UserX size={22} />} size={3} accentColor="#F43F5E" />
              <EnhancedDashCard title="Total Leaves" value={String(totalLeaves)} icon={<CalendarCheck size={22} />} size={3} accentColor="#F59E0B" />
            </>
          ) : (
            <>
              <EnhancedDashCard title="Total Leave Requests" value={String(totalLeaves)} icon={<FileText size={22} />} size={3} accentColor="#3B82F6" />
              <EnhancedDashCard title="Pending Leaves" value={String(leavePending)} icon={<Clock size={22} />} size={3} accentColor="#F59E0B" />
              <EnhancedDashCard title="Approved Leaves" value={String(leaveApproved)} icon={<CheckCircle size={22} />} size={3} accentColor="#10B981" />
              <EnhancedDashCard title="Rejected Leaves" value={String(leaveRejected)} icon={<XCircle size={22} />} size={3} accentColor="#F43F5E" />
            </>
          )}
        </DashGrid>
      </div>


      {/* 5. TABS */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => { setActiveTab('attendance'); setActiveFilters({}); }} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Student Attendance</button>
        <button onClick={() => { setActiveTab('leaves'); setActiveFilters({}); }} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leaves' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Student Leaves</button>
      </div>

      {/* 7. ATTENDANCE ANALYTICS */}
      {activeTab === 'attendance' && (
        <DashGrid cols={12} gap={4}>
           <GColumnChart 
             title="Monthly Attendance Overview" 
             subtitle="Present vs Absent vs Leave"
             data={chartData.map(d => ({ ...d, name: d.month }))} 
             bars={[
               { key: 'present', label: 'Present', color: '#10B981' }, 
               { key: 'absent', label: 'Absent', color: '#F43F5E' }, 
               { key: 'leave', label: 'Leave', color: '#3B82F6' }
             ]} 
             size={6} 
             height={340}
           />
           <GDoughnutChart
             title="Attendance Distribution"
             subtitle="Overall Breakdown"
             data={[
                { name: 'Present', value: presentCount },
                { name: 'Absent', value: absentCount },
                { name: 'Leave', value: leaveDaysCount },
                { name: 'Late', value: lateCount }
             ]}
             colors={['#10B981', '#F43F5E', '#3B82F6', '#F59E0B']}
             size={6}
             height={340}
           />
        </DashGrid>
      )}

      {/* 6 & 8. ATTENDANCE/LEAVES TABLE */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden mt-6">
        <div className="p-6 relative min-h-[300px]">
          <DataTable 
            title={activeTab === 'attendance' ? 'Attendance Register' : 'Leave Tracking'}
            rows={activeTab === 'attendance' ? filteredAttendance : filteredLeaves} 
            columns={activeTab === 'attendance' ? attendanceColumns : leaveColumns} 
            searchable={true} 
            exportable={true}
            exportFileName={activeTab === 'attendance' ? 'Attendance_Report' : 'Leave_Report'}
            onApplyFilters={handleApplyFilters}
            date={activeTab === 'attendance'}
            filters={activeTab === 'attendance' ? [
              { title: "Attendance Status", type: "toggle", key: "status", options: ["Present", "Absent", "Late", "Half Day"] }
            ] : [
              { title: "Leave Status", type: "toggle", key: "status", options: ["Approved", "Pending", "Rejected"] }
            ]}
          />
        </div>
      </div>

      {/* LEAVE/ATTENDANCE DETAILS MODAL */}
      <PanelModal 
        id="leave-details-modal" 
        title={modalType === 'attendance' ? 'Attendance Details' : 'Leave Details'} 
        size="lg"
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {selectedRecord && modalType === 'attendance' ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Attendance Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-500 font-medium">Date</p><p className="font-bold text-slate-900">{selectedRecord.date}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Day</p><p className="font-bold text-slate-900">{selectedRecord.day}</p></div>
                <div><p className="text-xs text-slate-500 font-medium mb-1.5">Status</p><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${selectedRecord.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : selectedRecord.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{selectedRecord.status}</span></div>
                <div><p className="text-xs text-slate-500 font-medium">Attendance Type</p><p className="font-bold text-slate-900">{selectedRecord.type}</p></div>
                <div className="col-span-2 md:col-span-1"><p className="text-xs text-slate-500 font-medium">Remarks</p><p className="font-bold text-slate-900">{selectedRecord.remarks}</p></div>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Time Info</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div><p className="text-xs text-slate-500 font-medium">Check In</p><p className="font-bold text-slate-900">{selectedRecord.checkIn}</p></div>
                 <div><p className="text-xs text-slate-500 font-medium">Check Out</p><p className="font-bold text-slate-900">{selectedRecord.checkOut}</p></div>
               </div>
            </div>
          </div>
        ) : selectedRecord && modalType === 'leave' ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Leave Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="min-w-0"><p className="text-xs text-slate-500 font-medium">Leave ID</p><p className="font-bold text-[#223F74] break-words">{selectedRecord.id}</p></div>
                <div><p className="text-xs text-slate-500 font-medium mb-1.5">Status</p><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${selectedRecord.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : selectedRecord.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{selectedRecord.status}</span></div>
                <div><p className="text-xs text-slate-500 font-medium">Leave Type</p><p className="font-bold text-slate-900">{selectedRecord.type}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">From Date</p><p className="font-bold text-slate-900 whitespace-nowrap">{selectedRecord.startDate || selectedRecord.fromDate || "—"}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">To Date</p><p className="font-bold text-slate-900 whitespace-nowrap">{selectedRecord.endDate || selectedRecord.toDate || "—"}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Total Days</p><p className="font-bold text-slate-900">{selectedRecord.days || selectedRecord.totalDays || 0}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Applied Date</p><p className="font-bold text-slate-900">{selectedRecord.appliedDate || "—"}</p></div>
                <div className="col-span-1 sm:col-span-2 md:col-span-3"><p className="text-xs text-slate-500 font-medium">Reason</p><p className="font-medium text-slate-800">{selectedRecord.reason || "—"}</p></div>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Approval Info</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-500 font-medium">Approved By</p><p className="font-bold text-slate-900">{selectedRecord.approvedBy || "—"}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Approval Date</p><p className="font-bold text-slate-900">{selectedRecord.approvalDate || "—"}</p></div>
                  <div className="col-span-1 sm:col-span-2"><p className="text-xs text-slate-500 font-medium">Remarks</p><p className="font-medium text-slate-800">{selectedRecord.remarks || "—"}</p></div>
               </div>
            </div>
          </div>
        ) : null}
      </PanelModal>
    </div>
  );
}
