import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Percent,
  Eye,
  FileText
} from 'lucide-react';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataTable,
  Button,
  Select,
  Option,
  DataField,
  SelectField,
  GColumnChart,
  GPieChart,
  PanelModal
} from '../../components/shared/Common_Components';

const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// Tooltip wrapper for Headings and Icons
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

const MyAttendance = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leave'
  
  // Global Filters
  // Default to October 2025 to match dummy dataset
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal States
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Apply Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    totalDays: 0,
    reason: ''
  });

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];
  const years = [2024, 2025, 2026, 2027, 2028];

  // Dummy Logged-In Admin Data (Easily replaceable with real backend data in the future)
  const dummyCurrentAdmin = {
    name: "Vikram Sharma",
    employeeId: "ADM-9021",
    department: "Administration",
    designation: "Senior Administrator"
  };

  // Dummy Data for Attendance History
  const [rawAttendanceHistory, setRawAttendanceHistory] = useState([]);

  // Dummy Data for Leave History
  const [leaveHistory, setLeaveHistory] = useState([]);

  // Filter Attendance History dynamically based on all global filters
  const filteredAttendance = rawAttendanceHistory.filter(record => {
    const recordDate = new Date(record.date);
    const matchesYear = recordDate.getFullYear() === Number(selectedYear);
    const matchesMonth = (recordDate.getMonth() + 1) === Number(selectedMonth);

    let matchesStatus = true;
    if (selectedStatus !== 'All') {
       if (selectedStatus === 'Half Day') {
         matchesStatus = record.type === 'Half Day';
       } else {
         matchesStatus = record.attendance === selectedStatus;
       }
    }
    
    return matchesYear && matchesMonth && matchesStatus;
  });

  // Filter Leave History dynamically based on all global filters
  const filteredLeaveHistory = leaveHistory.filter(record => {
    const recordDate = new Date(record.fromDate);
    const matchesYear = recordDate.getFullYear() === Number(selectedYear);
    const matchesMonth = (recordDate.getMonth() + 1) === Number(selectedMonth);
    
    let matchesStatus = true;
    if (selectedStatus !== 'All' && selectedStatus !== 'Leave') {
       matchesStatus = false; 
    }
    
    return matchesYear && matchesMonth && matchesStatus;
  });

  // Calculate KPI values
  const totalDaysInPeriod = filteredAttendance.length;
  const presentDays = filteredAttendance.filter(r => r.attendance === 'Present').length;
  const absentDays = filteredAttendance.filter(r => r.attendance === 'Absent').length;
  const leaveDays = filteredAttendance.filter(r => r.attendance === 'Leave').length;
  const halfDays = filteredAttendance.filter(r => r.type === 'Half Day').length;
  const presentFullDays = filteredAttendance.filter(r => r.attendance === 'Present' && r.type !== 'Half Day').length;
  const attendancePercentage = totalDaysInPeriod > 0 ? Math.round(((presentDays) / totalDaysInPeriod) * 100) : 0;

  // Chart Data calculated dynamically from filteredAttendance
  const chartData = [1, 2, 3, 4, 5].map(week => {
    const weekRecords = filteredAttendance.filter(r => {
      const day = new Date(r.date).getDate();
      return Math.ceil(day / 7) === week;
    });
    return {
      name: `Week ${week}`,
      Present: weekRecords.filter(r => r.attendance === 'Present' && r.type !== 'Half Day').length,
      "Half Day": weekRecords.filter(r => r.type === 'Half Day').length,
      Leave: weekRecords.filter(r => r.attendance === 'Leave').length,
      Absent: weekRecords.filter(r => r.attendance === 'Absent').length
    };
  }).filter(weekData => weekData.name === 'Week 1' || weekData.Present > 0 || weekData["Half Day"] > 0 || weekData.Leave > 0 || weekData.Absent > 0);

  const pieData = [
    { name: "Present", value: presentFullDays },
    { name: "Absent", value: absentDays },
    { name: "Leave", value: leaveDays },
    { name: "Half Day", value: halfDays }
  ];

  const handleLeaveFormChange = (field, value) => {
    setLeaveForm(prev => {
      const next = { ...prev, [field]: value };
      if (next.fromDate && next.toDate) {
        const start = new Date(next.fromDate);
        const end = new Date(next.toDate);
        if (end >= start) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          next.totalDays = diffDays;
        } else {
          next.totalDays = 0;
        }
      }
      return next;
    });
  };

  const handleResetForm = () => {
    setLeaveForm({ leaveType: '', fromDate: '', toDate: '', totalDays: 0, reason: '' });
  };

  // Columns for Attendance Table
  const attendanceColumns = [
    { key: "date", label: "Date", render: (val) => <span className="font-bold text-gray-900 whitespace-nowrap block min-w-max">{val}</span> },
    { key: "day", label: "Day", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "attendance", label: "Attendance", render: (val) => {
        let color = "text-emerald-600";
        if (val === 'Absent') color = "text-rose-600";
        else if (val === 'Leave') color = "text-amber-600";
        return <span className={`font-bold ${color}`}>{val}</span>;
    }},
    { key: "type", label: "Attendance Type", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "hours", label: "Working Hours", align: "center", render: (val) => <span className="text-gray-800 font-medium">{val}</span> },
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <ActionTooltip label="View Details">
        <button 
          onClick={() => { setSelectedRecord(row); setIsAttendanceModalOpen(true); }}
          className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block"
        >
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  // Columns for Leave Table
  const leaveColumns = [
    { key: "appliedDate", label: "Applied Date", render: (val) => <span className="font-bold text-gray-900">{val}</span> },
    { key: "leaveType", label: "Leave Type", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "fromDate", label: "From Date", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "toDate", label: "To Date", render: (val) => <span className="text-gray-600 font-medium">{val}</span> },
    { key: "totalDays", label: "Total Days", align: "center", render: (val) => <span className="font-bold text-[#223F74]">{val}</span> },
    { key: "status", label: "Status", align: "center", render: (val) => {
        let bg = 'bg-amber-100 text-amber-700';
        if (val === 'Approved') bg = 'bg-emerald-100 text-emerald-700';
        else if (val === 'Rejected') bg = 'bg-rose-100 text-rose-700';
        return <span className={`px-3 py-1 rounded-full text-xs font-bold ${bg}`}>{val}</span>;
    }},
    { key: "actions", label: "View", align: "center", render: (_, row) => (
      <ActionTooltip label="View Details">
        <button 
          onClick={() => { setSelectedRecord(row); setIsLeaveModalOpen(true); }}
          className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block"
        >
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  return (
    <div className="w-full space-y-8 pb-10 text-left font-sans max-w-[1600px] mx-auto">
      {/* 1. Header */}
      <div className="mb-6 relative z-30">
        <Heading
          primaryText="My Attendance"
          size={12}
          showAnimations={true}
        />
        
        {/* CSS override to prevent truncation in EnhancedDashCard on this page only without making cards too tall */}
        <style>{`
          .attendance-cards h3.truncate,
          .attendance-cards span.truncate {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          
          /* Reduce card padding slightly (default was p-5 / 20px) */
          .attendance-cards > div > div {
            padding: 14px 16px !important;
          }

          /* Reduce icon container size slightly to leave more space for text */
          .attendance-cards .w-14.h-14 {
            width: 44px !important;
            height: 44px !important;
          }

          /* Slightly smaller gap between icon and text */
          .attendance-cards .gap-4 {
            gap: 12px !important;
          }

          /* Tighter line heights for wrapping text */
          .attendance-cards h3 {
            margin-bottom: 4px !important;
            line-height: 1.2 !important;
          }
          
          /* Force attendance table to fit without horizontal scrollbar */
          .attendance-table-container .data-table-scroll {
            overflow-x: hidden !important;
          }
          .attendance-table-container table th,
          .attendance-table-container table td {
            white-space: normal !important;
          }
        `}</style>
      </div>

      {/* 2. Summary Cards */}
      <div className="attendance-cards">
        <DashGrid cols={12} gap={3}>
        <EnhancedDashCard 
          title="Present Days" 
          value={loading ? "-" : presentDays} 
          icon={<CheckCircle2 size={22} />} 
          size={3} 
          accentColor="#10B981" 
        />
        <EnhancedDashCard 
          title="Absent Days" 
          value={loading ? "-" : absentDays} 
          icon={<AlertCircle size={22} />} 
          size={3} 
          accentColor="#EF4444" 
        />
        <EnhancedDashCard 
          title="Leave Taken" 
          value={loading ? "-" : leaveDays} 
          icon={<Calendar size={22} />} 
          size={3} 
          accentColor="#F59E0B" 
        />
        <EnhancedDashCard 
          title="Attendance Percentage" 
          value={loading ? "-" : `${attendancePercentage}%`} 
          icon={<Percent size={22} />} 
          size={3} 
          accentColor="#223F74" 
        />
        </DashGrid>
      </div>


      {/* 3. Global Filters */}
      <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <Grid cols={12} gap={4}>
          <SelectField
            label="Academic Year"
            size={4}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(y => <Option key={y} value={y} label={String(y)} />)}
          </SelectField>
          
          <SelectField
            label="Month"
            size={4}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map(m => <Option key={m.value} value={m.value} label={m.label} />)}
          </SelectField>

          <SelectField
            label="Attendance Status"
            size={4}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <Option value="All" label="All" />
            <Option value="Present" label="Present" />
            <Option value="Absent" label="Absent" />
            <Option value="Leave" label="Leave" />
            <Option value="Half Day" label="Half Day" />
          </SelectField>
        </Grid>
      </div>

      {/* 4. Charts */}
      {loading ? (
        <div className="h-[300px] flex items-center justify-center bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <div className="animate-spin w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full"></div>
        </div>
      ) : chartData.length > 0 || pieData.some(d => d.value > 0) ? (
        <DashGrid cols={12} gap={4}>
          <GColumnChart 
            title="Monthly Attendance Overview"
            data={chartData} 
            bars={[
              { key: "Present", label: "Present", color: "#10B981" },
              { key: "Half Day", label: "Half Day", color: "#3B82F6" },
              { key: "Leave", label: "Leave Taken", color: "#F59E0B" },
              { key: "Absent", label: "Absent", color: "#EF4444" }
            ]}
            size={8}
            height={300}
          />
          <GPieChart 
            title="Attendance Distribution"
            data={pieData} 
            colors={["#10B981", "#EF4444", "#F59E0B", "#3B82F6"]}
            size={4}
            height={300} 
          />
        </DashGrid>
      ) : (
        <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <Calendar size={48} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No attendance data available.</h3>
          <p className="text-sm text-slate-500">There is no data to display for the selected period.</p>
        </div>
      )}

      {/* 5. Tabs and Tab Content */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        {/* Tabs Header */}
        <div className="flex bg-slate-50/80 p-4 border-b border-gray-100 gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'attendance'
                ? "bg-white text-[#223F74] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            My Attendance
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'leave'
                ? "bg-white text-[#223F74] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Apply Leave
          </button>
        </div>

        {/* Tab 1: Attendance */}
        {activeTab === 'attendance' && (
          <div className="p-6 attendance-table-container">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full"></div>
              </div>
            ) : filteredAttendance.length > 0 ? (
              <DataTable 
                title="Attendance History"
                rows={filteredAttendance}
                columns={attendanceColumns}
                searchable={true}
                exportable={true}
                searchPlaceholder="Search attendance..."
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-slate-200 rounded-2xl bg-white">
                <FileText size={48} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">No attendance records found.</h3>
                <p className="text-sm text-slate-500">There are no attendance logs for the selected filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Leave */}
        {activeTab === 'leave' && (
          <div className="p-6 space-y-10">
            {/* Apply Leave Form */}
            <div>
              <h3 className="text-lg font-black text-[#1D1D1F] mb-6">Apply Leave</h3>
              <Grid cols={12} gap={4}>
                <SelectField
                  label="Leave Type"
                  size={6}
                  value={leaveForm.leaveType}
                  onChange={(e) => handleLeaveFormChange('leaveType', e.target.value)}
                >
                  <Option value="" label="Select Leave Type" disabled hidden />
                  <Option value="Casual Leave (CL)" label="Casual Leave (CL)" />
                  <Option value="Sick Leave (SL)" label="Sick Leave (SL)" />
                  <Option value="Earned Leave (EL)" label="Earned Leave (EL)" />
                  <Option value="Half Day Leave" label="Half Day Leave" />
                  <Option value="Emergency Leave" label="Emergency Leave" />
                  <Option value="Maternity Leave" label="Maternity Leave" />
                  <Option value="Paternity Leave" label="Paternity Leave" />
                  <Option value="Compensatory Off" label="Compensatory Off" />
                </SelectField>
                
                <DataField
                  type="file"
                  label="Attachment (Optional)"
                  size={6}
                />

                <DataField
                  type="date"
                  label="From Date"
                  size={4}
                  value={leaveForm.fromDate}
                  onChange={(e) => handleLeaveFormChange('fromDate', e.target.value)}
                />
                
                <DataField
                  type="date"
                  label="To Date"
                  size={4}
                  value={leaveForm.toDate}
                  onChange={(e) => handleLeaveFormChange('toDate', e.target.value)}
                />
                
                <DataField
                  type="number"
                  label="Total Days"
                  size={4}
                  value={leaveForm.totalDays}
                  readOnly={true}
                />
                
                <DataField
                  type="textarea"
                  label="Reason"
                  size={12}
                  value={leaveForm.reason}
                  onChange={(e) => handleLeaveFormChange('reason', e.target.value)}
                  placeholder="Enter reason for leave..."
                  rows={3}
                />
              </Grid>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button text="Reset" variant="secondary" size={2} onClick={handleResetForm} />
                <Button text="Apply Leave" variant="primary" size={2} />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Leave History Table */}
            <div>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center border border-slate-200 rounded-2xl bg-white">
                  <div className="animate-spin w-8 h-8 border-4 border-[#223F74] border-t-transparent rounded-full"></div>
                </div>
              ) : filteredLeaveHistory.length > 0 ? (
                <DataTable 
                  title="Leave History"
                  rows={filteredLeaveHistory}
                  columns={leaveColumns}
                  searchable={true}
                  exportable={true}
                  searchPlaceholder="Search leave history..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-slate-200 rounded-2xl bg-white">
                  <Calendar size={48} className="text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No leave history found.</h3>
                  <p className="text-sm text-slate-500">You have no leave records for the selected period.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attendance Details Modal */}
      <PanelModal 
        id="attendance-details-modal" 
        title="Attendance Details" 
        size="md"
        isVisible={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
      >
        {selectedRecord ? (
          <div className="space-y-6 pb-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Employee Name</p>
                  <p className="font-bold text-slate-900">{dummyCurrentAdmin.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Employee ID</p>
                  <p className="font-mono font-bold text-slate-600">{dummyCurrentAdmin.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="font-bold text-slate-900">{dummyCurrentAdmin.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Designation</p>
                  <p className="font-bold text-slate-900">{dummyCurrentAdmin.designation}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Attendance Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Date</p>
                  <p className="font-bold text-slate-900">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Day</p>
                  <p className="font-bold text-slate-900">{selectedRecord.day}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Attendance</p>
                  <p className={`font-bold ${selectedRecord.attendance === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedRecord.attendance}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Attendance Type</p>
                  <p className="font-bold text-slate-900">{selectedRecord.type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Working Hours</p>
                  <p className="font-bold text-slate-900">{selectedRecord.hours}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {selectedRecord.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedRecord.reason && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider">Remarks</h3>
                <p className="text-sm text-slate-700">{selectedRecord.reason}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <h3 className="text-sm font-bold text-slate-500">No data available</h3>
          </div>
        )}
      </PanelModal>

      {/* Leave Details Modal */}
      <PanelModal 
        id="leave-details-modal" 
        title="Leave Details" 
        size="md"
        isVisible={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      >
        {selectedRecord ? (
          <div className="space-y-6 pb-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Leave Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Leave Type</p>
                  <p className="font-bold text-slate-900">{selectedRecord.leaveType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Applied Date</p>
                  <p className="font-bold text-slate-900">{selectedRecord.appliedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">From Date</p>
                  <p className="font-bold text-slate-900">{selectedRecord.fromDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">To Date</p>
                  <p className="font-bold text-slate-900">{selectedRecord.toDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Days</p>
                  <p className="font-bold text-[#223F74]">{selectedRecord.totalDays}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Approval Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${selectedRecord.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedRecord.status}
                  </span>
                </div>
                {selectedRecord.status === 'Approved' && (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Approved By</p>
                      <p className="font-bold text-slate-900">Super Admin</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Approval Date</p>
                      <p className="font-bold text-slate-900">01 Oct 2025</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider">Reason</h3>
              <p className="text-sm text-slate-700">{selectedRecord.reason}</p>
            </div>

            {selectedRecord.remarks && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider">Admin Remarks</h3>
                <p className="text-sm text-slate-700">{selectedRecord.remarks}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <h3 className="text-sm font-bold text-slate-500">No data available</h3>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default MyAttendance;
