import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Star, Activity, 
  BarChart3, Eye, FileText
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option,
  GColumnChart, GLineChart, PanelModal
} from '../../../components/shared/Common_Components';
import api from '../../../services/api';

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

const StaffPerformance = () => {
  const [loading, setLoading] = useState(true);
  
  // Global Filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [department, setDepartment] = useState('All');
  const [staffType, setStaffType] = useState('All Staff');

  // Dummy Data States
  const [kpiData, setKpiData] = useState({});
  const [performanceChartData, setPerformanceChartData] = useState([]);
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  
  const [availabilityData, setAvailabilityData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  // Modal States
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/reports/staff-performance', {
          params: { academicYear, department, staffType }
        });
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setKpiData(d.kpiData || { totalStaff: 0, activeStaff: 0, avgPerformance: 0, attendancePct: 0 });
          setPerformanceChartData(d.performanceChartData || []);
          setAttendanceChartData(d.attendanceChartData || []);
          setAvailabilityData(d.availabilityData || []);
          setAttendanceData(d.attendanceData || []);
          setPerformanceData(d.performanceData || []);
        } else {
          setKpiData({ totalStaff: 0, activeStaff: 0, avgPerformance: 0, attendancePct: 0 });
          setPerformanceChartData([]);
          setAttendanceChartData([]);
          setAvailabilityData([]);
          setAttendanceData([]);
          setPerformanceData([]);
        }
      } catch (err) {
        console.error("Failed to fetch staff performance:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear, department, staffType]);

  const availabilityColumns = [
    { key: 'name', label: 'Teacher Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'department', label: 'Department' },
    { key: 'availability', label: 'Availability', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Available' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Half Day' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
      }`}>{val}</span>
    )},
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedAvailability(row); setIsAvailabilityModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const attendanceColumns = [
    { key: 'name', label: 'Employee Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'department', label: 'Department' },
    { key: 'attendance', label: 'Attendance', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Present' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Absent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
      }`}>{val}</span>
    )},
    { key: 'attendanceType', label: 'Attendance Type', render: (_, row) => {
      const isPresent = row.attendance === 'Present';
      const val = isPresent ? (row.attendanceType === 'Half Day' ? 'Half Day' : 'Full Day') : '-';
      return <span className="font-semibold text-slate-700">{val}</span>;
    }},
    { key: 'status', label: 'Status', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Leave Approved' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
      }`}>{val}</span>
    )},
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedAttendance(row); setIsAttendanceModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  const performanceColumns = [
    { key: 'name', label: 'Employee Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'department', label: 'Department' },
    { key: 'rating', label: 'Rating', render: (val) => (
      <span className="flex items-center gap-1 font-bold text-amber-500">
        <Star size={14} className="fill-amber-500" /> {val}
      </span>
    )},
    { key: 'attendancePct', label: 'Attendance %', render: (val) => <span className="font-bold text-[#223F74]">{val}%</span> },
    { key: 'classesAssigned', label: 'Classes Assigned' },
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedPerformance(row); setIsPerformanceModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <Heading 
          title="Staff Performance" 
          tooltipText="Analyze staff availability, attendance, and overall performance."
        /><p className="text-sm font-semibold text-slate-500 animate-pulse">Loading staff performance...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      
      {/* 1. Header */}
      <Heading
        primaryText="Staff"
        secondaryText="Performance"
        size={12}
        showAnimations={true}
      />

      {/* 2. KPI Cards (4 Cards) */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Staff" value={kpiData.totalStaff} icon={<Users size={22} />} size={3} accentColor="#223F74" />
        <EnhancedDashCard title="Active Staff" value={kpiData.activeStaff} icon={<UserCheck size={22} />} size={3} accentColor="#10B981" />
        <EnhancedDashCard title="Average Performance Rating" value={kpiData.avgPerformance} icon={<Star size={22} />} size={3} accentColor="#F59E0B" />
        <EnhancedDashCard title="Attendance Percentage" value={`${kpiData.attendancePct}%`} icon={<BarChart3 size={22} />} size={3} accentColor="#8B5CF6" />
      </DashGrid>

      {/* 3. Global Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
              <Option value="2026-2027" label="2026-2027" />
              <Option value="2025-2026" label="2025-2026" />
              <Option value="2024-2025" label="2024-2025" />
              <Option value="2023-2024" label="2023-2024" />
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Department</label>
            <Select id="filter-dept" value={department} onChange={(e) => setDepartment(e.target.value)} searchable={false}>
              <Option value="All" label="All Departments" />
              <Option value="Academic" label="Academic" />
              <Option value="Administration" label="Administration" />
              <Option value="Accounts" label="Accounts" />
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Staff Type</label>
            <Select id="filter-type" value={staffType} onChange={(e) => setStaffType(e.target.value)} searchable={false}>
              <Option value="All Staff" label="All Staff" />
              <Option value="Teaching Staff" label="Teaching Staff" />
              <Option value="Non-Teaching Staff" label="Non-Teaching Staff" />
            </Select>
          </div>
        </Grid>
      </div>

      {/* 5. Charts */}
      <DashGrid cols={12} gap={4}>
         <GColumnChart 
            title="Staff Performance" 
            data={performanceChartData} 
            bars={[{key: 'rating', color: '#3B82F6'}]} 
            size={6} 
         />
         <GLineChart 
            title="Staff Attendance Trend" 
            data={attendanceChartData.map(d => ({ ...d, name: d.month }))} 
            lines={[{key: 'attendance', color: '#10B981'}]} 
            size={6} 
         />
      </DashGrid>

      {/* Tables sequence */}
      <div className="space-y-6">
        
        {/* 6. Teacher Availability Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Teacher Availability</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable rows={availabilityData} columns={availabilityColumns} searchable={true} exportable={true} exportFileName="Teacher_Availability_Report" />
          </div>
        </div>

        {/* 8. Staff Attendance Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Staff Attendance</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable rows={attendanceData} columns={attendanceColumns} searchable={true} exportable={true} exportFileName="Staff_Attendance_Report" />
          </div>
        </div>

        {/* 10. Performance Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Performance</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable rows={performanceData} columns={performanceColumns} searchable={true} exportable={true} exportFileName="Performance_Report" />
          </div>
        </div>
      </div>

      {/* 7. Teacher Availability Modal */}
      <PanelModal 
        id="availability-modal" 
        title="Availability Details" 
        size="md"
        isVisible={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
      >
        {selectedAvailability && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Teacher Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Teacher Name</p>
                  <p className="font-bold text-slate-900">{selectedAvailability.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="font-bold text-slate-900">{selectedAvailability.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Designation</p>
                  <p className="font-bold text-slate-900">{selectedAvailability.designation}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Contact Number</p>
                  <p className="font-bold text-slate-900">{selectedAvailability.contact}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Availability Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Current Availability</p>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                    selectedAvailability.availability === 'Available' ? 'bg-emerald-100 text-emerald-700' : 
                    selectedAvailability.availability === 'Half Day' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {selectedAvailability.availability}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Date</p>
                  <p className="font-bold text-slate-900">{selectedAvailability.date}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Remarks</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedAvailability.remarks}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>

      {/* 9. Attendance Modal */}
      <PanelModal 
        id="attendance-modal" 
        title="Attendance Details" 
        size="md"
        isVisible={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
      >
        {selectedAttendance && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Employee Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium">Employee Name</p>
                  <p className="font-bold text-slate-900">{selectedAttendance.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="font-bold text-slate-900">{selectedAttendance.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Designation</p>
                  <p className="font-bold text-slate-900">{selectedAttendance.designation}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Attendance Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Date</p>
                  <p className="font-bold text-slate-900">{selectedAttendance.date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Attendance Status</p>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                    selectedAttendance.attendance === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                    selectedAttendance.attendance === 'Absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedAttendance.attendance}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Attendance Type</p>
                  <p className="font-bold text-slate-900">
                    {selectedAttendance.attendance === 'Present' 
                      ? (selectedAttendance.attendanceType === 'Half Day' ? 'Half Day' : 'Full Day') 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Working Hours</p>
                  <p className="font-bold text-slate-900">{selectedAttendance.workingHours}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Remarks</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedAttendance.remarks}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>

      {/* 11. Staff Performance Modal */}
      <PanelModal 
        id="performance-modal" 
        title="Performance Details" 
        size="md"
        isVisible={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
      >
        {selectedPerformance && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium">Employee Name</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Designation</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.designation}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Experience</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.experience}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Performance Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Performance Rating</p>
                  <span className="flex items-center gap-1 font-bold text-amber-500 text-lg">
                    <Star size={16} className="fill-amber-500" /> {selectedPerformance.rating}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Attendance Percentage</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.attendancePct}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Classes Assigned</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.classesAssigned}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Subject</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Joining Date</p>
                  <p className="font-bold text-slate-900">{selectedPerformance.joinDate}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Remarks</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedPerformance.remarks}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default StaffPerformance;
