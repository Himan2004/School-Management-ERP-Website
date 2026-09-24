import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, UserMinus, UserCheck, 
  BarChart3, Eye
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

const AcademicReports = () => {
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  
  // Filter Options from real API
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [classOptions, setClassOptions]     = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [allSections, setAllSections]       = useState([]); // full list for filtering by class

  // Selected Filters
  const [academicYear, setAcademicYear]     = useState('');
  const [selectedClass, setSelectedClass]   = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');

  // Report Data States
  const [kpiData, setKpiData]                     = useState({});
  const [studentStrengthData, setStudentStrengthData] = useState([]);
  const [admissionData, setAdmissionData]         = useState([]);
  const [attendanceData, setAttendanceData]       = useState([]);
  const [complaintData, setComplaintData]         = useState([]);

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // ── Load real filter options once on mount ─────────────────────────────────
  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const res = await api.get('/admin/reports/academic-reports/filters');
        if (res.data?.success && res.data?.data) {
          const { classes, sections, academicYears } = res.data.data;
          setAcademicYearOptions(academicYears || []);
          setClassOptions(classes || []);
          setAllSections(sections || []);
          setSectionOptions(sections || []);
          // Default to the first/most recent academic year
          if (academicYears?.length > 0) {
            setAcademicYear(academicYears[0].value);
          }
        }
      } catch (err) {
        console.error('Failed to fetch report filters:', err);
        // Fallback defaults so the page still works
        const currentYear = new Date().getFullYear();
        const fallback = [
          { value: `${currentYear}-${currentYear + 1}`, label: `${currentYear}-${currentYear + 1}` },
          { value: `${currentYear - 1}-${currentYear}`, label: `${currentYear - 1}-${currentYear}` },
        ];
        setAcademicYearOptions(fallback);
        setAcademicYear(fallback[0].value);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // ── When class selection changes, filter sections ──────────────────────────
  useEffect(() => {
    if (selectedClass === 'All') {
      setSectionOptions(allSections);
    } else {
      const filtered = allSections.filter(s => !s.classId || s.classId === selectedClass);
      setSectionOptions(filtered);
    }
    setSelectedSection('All'); // reset section when class changes
  }, [selectedClass, allSections]);

  // ── Fetch report data whenever filters change ──────────────────────────────
  useEffect(() => {
    if (!academicYear) return; // wait until filters are loaded
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/reports/academic-reports', {
          params: { academicYear, classId: selectedClass, sectionId: selectedSection }
        });
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setKpiData(d.kpiData || { totalStudents: 0, newAdmissions: 0, dropouts: 0, avgAttendance: 0 });
          setStudentStrengthData(d.studentStrengthData || []);
          setAdmissionData(d.admissionData || []);
          setAttendanceData(d.attendanceData || []);
          setComplaintData(d.complaintData || []);
        } else {
          setKpiData({ totalStudents: 0, newAdmissions: 0, dropouts: 0, avgAttendance: 0 });
          setStudentStrengthData([]);
          setAdmissionData([]);
          setAttendanceData([]);
          setComplaintData([]);
        }
      } catch (err) {
        console.error("Failed to fetch academic reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear, selectedClass, selectedSection]);


  const strengthColumns = [
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'boys', label: 'Boys' },
    { key: 'girls', label: 'Girls' },
    { key: 'total', label: 'Total Students', render: (val) => <span className="font-bold">{val}</span> },
  ];

  const attendanceColumns = [
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'total', label: 'Total Students', render: (val) => <span className="font-bold">{val}</span> },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'leave', label: 'Leave' },
    { key: 'percentage', label: 'Attendance %', render: (val) => <span className="font-bold text-blue-600">{val}%</span> },
  ];

  const complaintColumns = [
    { key: 'id', label: 'Complaint ID', render: (val) => <span className="font-mono text-xs text-slate-500">{val}</span> },
    { key: 'student', label: 'Student Name', render: (val) => <span className="font-bold text-gray-800">{val}</span> },
    { key: 'type', label: 'Complaint Type' },
    { key: 'raisedBy', label: 'Raised By' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'Open' ? 'bg-rose-50 text-rose-700' :
        val === 'Closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>{val}</span>
    )},
    { key: 'actions', label: 'View', align: 'center', render: (_, row) => (
      <ActionTooltip label="View Details">
        <button onClick={() => { setSelectedComplaint(row); setIsComplaintModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors mx-auto block">
          <Eye size={18} />
        </button>
      </ActionTooltip>
    )}
  ];

  if (filtersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading report filters...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left">
      
      {/* 1. Heading */}
      <Heading
        primaryText="Academic"
        secondaryText="Reports"
        size={12}
        showAnimations={true}
      />

      {/* 2. KPI Cards (4 Cards) */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Students" value={kpiData.totalStudents ?? 0} icon={<Users size={22} />} size={3} accentColor="#223F74" />
        <EnhancedDashCard title="New Admissions" value={kpiData.newAdmissions ?? 0} icon={<TrendingUp size={22} />} size={3} accentColor="#10B981" />
        <EnhancedDashCard title="Dropouts" value={kpiData.dropouts ?? 0} icon={<UserMinus size={22} />} size={3} accentColor="#EF4444" />
        <EnhancedDashCard title="Average Attendance" value={`${kpiData.avgAttendance ?? 0}%`} icon={<UserCheck size={22} />} size={3} accentColor="#8B5CF6" />
      </DashGrid>

      {/* 3. Global Filters — all data from real API */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <Grid cols={12} gap={4}>
          {/* Academic Year */}
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
              {academicYearOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>

          {/* Class */}
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
            <Select id="filter-class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} searchable={false}>
              <Option value="All" label="All Classes" />
              {classOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>

          {/* Section */}
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Section</label>
            <Select id="filter-section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} searchable={false}>
              <Option value="All" label="All Sections" />
              {sectionOptions.map(opt => (
                <Option key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </Select>
          </div>
        </Grid>
      </div>

      {/* 4. Two Charts (Student Strength & Admission Trends) */}
      <DashGrid cols={12} gap={4}>
         <GColumnChart 
            title="Student Strength" 
            data={studentStrengthData.map(d => ({ ...d, name: d.class }))} 
            bars={[{key: 'total', color: '#3B82F6'}]} 
            size={6} 
         />
         <GLineChart 
            title="Admission Trends" 
            data={admissionData.map(d => ({ ...d, name: d.month }))} 
            lines={[{key: 'admissions', color: '#10B981'}]} 
            size={6} 
         />
      </DashGrid>

      {/* Tables sequence */}
      <div className="space-y-6">
        
        {/* 5. Student Strength Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Student Strength</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable rows={studentStrengthData} columns={strengthColumns} searchable={true} exportable={true} exportFileName="Student_Strength_Report" />
          </div>
        </div>

        {/* 6. Attendance Summary Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Attendance Summary</h2>
          </div>
          <div className="p-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
                <span className="ml-3 text-sm text-slate-500 font-medium">Loading attendance data...</span>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <BarChart3 size={40} className="mb-3 opacity-40" />
                <p className="text-sm font-semibold">No attendance records found</p>
                <p className="text-xs mt-1">Try adjusting the filters above or marking attendance for this period.</p>
              </div>
            ) : (
              <DataTable rows={attendanceData} columns={attendanceColumns} searchable={true} exportable={true} exportFileName="Attendance_Summary_Report" />
            )}
          </div>
        </div>

        {/* 7. Complaint Reports Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">Complaint Reports</h2>
          </div>
          <div className="p-6 pt-4">
            <DataTable rows={complaintData} columns={complaintColumns} searchable={true} exportable={true} exportFileName="Complaint_Reports" />
          </div>
        </div>
      </div>



      {/* View Complaint Modal */}
      <PanelModal 
        id="complaint-details-modal" 
        title="Complaint Details" 
        size="md"
        isVisible={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
      >
        {selectedComplaint && (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Complaint Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Complaint ID</p>
                  <p className="font-bold font-mono text-slate-900">{selectedComplaint.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Complaint Type</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Raised By</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.raisedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Date</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.date}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Student Name</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.student}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Class</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.class}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Section</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.section}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Complaint Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Description</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedComplaint.details}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Current Status</p>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                    selectedComplaint.status === 'Open' ? 'bg-rose-100 text-rose-700' :
                    selectedComplaint.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedComplaint.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Action Taken</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Assigned To</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.assignedTo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Closed By</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.closedBy}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Resolution</p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{selectedComplaint.resolution}</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default AcademicReports;
