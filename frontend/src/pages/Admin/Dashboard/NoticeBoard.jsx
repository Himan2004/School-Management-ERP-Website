import React, { useState, useEffect } from 'react';
import { 
  Megaphone, FileText, Bell, AlertTriangle, Eye, Pencil, CheckCircle, XCircle, Trash2, ShieldAlert, Plus
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option, PanelModal, DataField, Button
} from '../../../components/shared/Common_Components';

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

// RICH MOCK DATA FOR NOTICES
const INITIAL_NOTICES = [
  { id: 101, title: 'Annual Sports Meet 2025', type: 'General Notice', roles: ['Teacher', 'Student', 'Parent'], class: 'All Classes', section: 'All Sections', publishDate: '2025-02-15', expiryDate: '2025-04-10', status: 'Published', priority: 'High', description: 'The annual sports meet is scheduled for April. Registrations are open for track and field events.', attachment: 'sports_meet_2025.pdf', academicYear: '2025-2026' },
  { id: 102, title: 'Emergency School Closure due to Weather', type: 'Emergency Announcement', roles: ['Teacher', 'Parent', 'Principal'], class: 'All Classes', section: 'All Sections', publishDate: '2025-03-01', expiryDate: '2025-03-03', status: 'Expired', priority: 'Emergency', description: 'School will remain closed tomorrow due to the severe weather warning issued by the meteorological department.', attachment: '', academicYear: '2025-2026' },
  { id: 103, title: 'Class 10 Board Exam Prep Session', type: 'General Notice', roles: ['Teacher', 'Student'], class: 'Class 10', section: 'A', publishDate: '2025-03-10', expiryDate: '2025-03-25', status: 'Published', priority: 'High', description: 'Special preparatory sessions for Mathematics will be held every Saturday for Class 10 Section A.', attachment: 'math_prep_schedule.pdf', academicYear: '2025-2026' },
  { id: 104, title: 'Fee Payment Reminder - Q1', type: 'General Notice', roles: ['Parent', 'Accountant'], class: 'All Classes', section: 'All Sections', publishDate: '2025-04-01', expiryDate: '2025-04-15', status: 'Published', priority: 'Medium', description: 'This is a gentle reminder that the Q1 school fees are due by April 15th. Please ignore if already paid.', attachment: '', academicYear: '2025-2026' },
  { id: 105, title: 'Science Fair Project Submissions', type: 'General Notice', roles: ['Teacher', 'Student'], class: 'Class 8', section: 'C', publishDate: '2025-03-05', expiryDate: '2025-03-20', status: 'Expired', priority: 'Low', description: 'Class 8 Section C students must submit their Science Fair project proposals by next week.', attachment: 'science_fair_guidelines.pdf', academicYear: '2025-2026' },
  { id: 106, title: 'New Staff Onboarding Meeting', type: 'General Notice', roles: ['Teacher', 'Principal'], class: 'All Classes', section: 'All Sections', publishDate: '2025-05-01', expiryDate: '2025-05-05', status: 'Unpublished', priority: 'Medium', description: 'All newly joined teachers are requested to attend the orientation program in the main auditorium.', attachment: 'orientation_agenda.pdf', academicYear: '2025-2026' },
  { id: 107, title: 'Class 12 Farewell Party Updates', type: 'General Notice', roles: ['Teacher', 'Student'], class: 'Class 12', section: 'B', publishDate: '2025-02-20', expiryDate: '2025-03-01', status: 'Expired', priority: 'High', description: 'The farewell party theme for Class 12 Section B has been decided. Please check the attached document.', attachment: 'farewell_theme.pdf', academicYear: '2024-2025' }
];

// RICH MOCK DATA FOR POLICIES
const INITIAL_POLICIES = [
  { id: 201, title: 'Revised Student Attendance Policy', description: 'A minimum of 75% attendance is now mandatory across all subjects for a student to be eligible for final examinations. Exceptions will only be made for severe medical emergencies with proper documentation.', effectiveDate: '2025-04-01', attachment: 'attendance_policy_revised.pdf', audience: 'Parents', status: 'Published', academicYear: '2025-2026' },
  { id: 202, title: 'School Uniform Guidelines Update', description: 'The school uniform guidelines have been updated for the winter season. The navy blue blazer is now mandatory for students of Class 8 and above.', effectiveDate: '2025-10-15', attachment: 'uniform_guidelines_2025.pdf', audience: 'Parents', status: 'Published', academicYear: '2025-2026' },
  { id: 203, title: 'Anti-Bullying and Discipline Policy', description: 'We have updated our zero-tolerance anti-bullying policy to include cyberbullying. Any student found violating this policy will face strict disciplinary action including potential suspension.', effectiveDate: '2025-05-01', attachment: 'anti_bullying_policy.pdf', audience: 'Parents', status: 'Published', academicYear: '2025-2026' },
  { id: 204, title: 'Library Book Issuance Rules', description: 'Students can now borrow up to 3 books at a time for a maximum duration of 14 days. Late returns will incur a fine of $1 per day.', effectiveDate: '2025-06-01', attachment: 'library_rules.pdf', audience: 'Parents', status: 'Archived', academicYear: '2024-2025' },
  { id: 205, title: 'Campus Security and Gate Pass Policy', description: 'Parents visiting the school during academic hours must secure a digital gate pass via the Parent Portal 24 hours prior to the visit.', effectiveDate: '2025-03-15', attachment: 'security_gatepass_policy.pdf', audience: 'Parents', status: 'Published', academicYear: '2025-2026' }
];

const ROLES = ['Teacher', 'Parent', 'Student', 'Principal', 'Accountant'];
const CLASSES = ['Class 1', 'Class 2', 'Class 5', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const SECTIONS = ['A', 'B', 'C', 'D'];

export default function DepartmentNoticeBoard() {
  const darkMode = useSelector(selectIsDarkMode);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('notices');

  // Global Filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  // Data States
  const [allNotices, setAllNotices] = useState(INITIAL_NOTICES);
  const [allPolicies, setAllPolicies] = useState(INITIAL_POLICIES);

  const [filteredNotices, setFilteredNotices] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, policies: 0, emergency: 0 });

  // Modal States
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [viewType, setViewType] = useState('notice'); // 'notice' or 'policy'

  // Forms
  const initNoticeForm = { id: null, title: '', description: '', type: 'General Notice', priority: 'Medium', publishDate: '', expiryDate: '', attachment: '', roles: [], class: 'All Classes', section: 'All Sections' };
  const [noticeForm, setNoticeForm] = useState(initNoticeForm);
  
  const initPolicyForm = { id: null, title: '', description: '', effectiveDate: '', attachment: '', audience: 'Parents', status: 'Published' };
  const [policyForm, setPolicyForm] = useState(initPolicyForm);

  // Initialize Data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Auto-Update expired status for notices based on expiry date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setAllNotices(prev => prev.map(n => {
      if (n.status === 'Published' && n.expiryDate && n.expiryDate < today) {
        return { ...n, status: 'Expired' };
      }
      return n;
    }));
  }, []); 

  // Filter Logic & KPIs
  useEffect(() => {
    const timer = setTimeout(() => {
      let filteredN = allNotices.filter(item => {
        const matchYear = item.academicYear === academicYear || !item.academicYear;
        const matchClass = classFilter === 'All Classes' || item.class === 'All Classes' || item.class === classFilter;
        // Fix for Section Filter: Ensure "All Sections" from both UI and Data works correctly.
        const matchSection = sectionFilter === 'All Sections' || item.section === 'All Sections' || item.section === sectionFilter;
        return matchYear && matchClass && matchSection;
      });

      let filteredP = allPolicies.filter(item => {
        const matchYear = item.academicYear === academicYear || !item.academicYear;
        return matchYear;
      });

      setFilteredNotices(filteredN);
      setFilteredPolicies(filteredP);

      const activeCount = filteredN.filter(n => n.status === 'Published').length;
      const emergencyCount = filteredN.filter(n => n.type === 'Emergency Announcement' && n.status === 'Published').length;

      setKpis({
        total: filteredN.length,
        active: activeCount,
        policies: filteredP.length,
        emergency: emergencyCount
      });

    }, 50); // fast response
    return () => clearTimeout(timer);
  }, [allNotices, allPolicies, academicYear, classFilter, sectionFilter]);

  // Actions
  const handleView = (row, type) => {
    setViewRecord(row);
    setViewType(type);
    setIsViewModalOpen(true);
  };

  const handleDeleteNotice = (id) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      setAllNotices(prev => prev.filter(n => n.id !== id));
      toast.success("Notice deleted successfully");
    }
  };

  const handleDeletePolicy = (id) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      setAllPolicies(prev => prev.filter(p => p.id !== id));
      toast.success("Policy deleted successfully");
    }
  };

  const handleTogglePublishNotice = (row) => {
    setAllNotices(prev => prev.map(n => {
      if (n.id === row.id) {
        return { ...n, status: n.status === 'Published' ? 'Unpublished' : 'Published' };
      }
      return n;
    }));
    toast.success(`Notice ${row.status === 'Published' ? 'Unpublished' : 'Published'}`);
  };

  const handleTogglePublishPolicy = (row) => {
    setAllPolicies(prev => prev.map(p => {
      if (p.id === row.id) {
        return { ...p, status: p.status === 'Published' ? 'Archived' : 'Published' };
      }
      return p;
    }));
    toast.success(`Policy ${row.status === 'Published' ? 'Archived' : 'Published'}`);
  };

  const handleEditNotice = (row) => {
    setNoticeForm({ ...row });
    setIsNoticeModalOpen(true);
  };

  const handleEditPolicy = (row) => {
    setPolicyForm({ ...row });
    setIsPolicyModalOpen(true);
  };

  const handleSaveNotice = () => {
    if (!noticeForm.title || !noticeForm.publishDate || !noticeForm.expiryDate) {
      toast.error('Please fill out all required fields.');
      return;
    }
    
    if (noticeForm.id) {
      setAllNotices(prev => prev.map(n => n.id === noticeForm.id ? { ...noticeForm, academicYear } : n));
      toast.success("Notice updated successfully");
    } else {
      setAllNotices(prev => [{ ...noticeForm, id: Date.now(), status: 'Published', academicYear }, ...prev]);
      toast.success("Notice created successfully!");
    }
    setIsNoticeModalOpen(false);
    setNoticeForm(initNoticeForm);
  };

  const handleSavePolicy = () => {
    if (!policyForm.title || !policyForm.effectiveDate) {
      toast.error('Please fill out all required fields.');
      return;
    }
    if (policyForm.id) {
      setAllPolicies(prev => prev.map(p => p.id === policyForm.id ? { ...policyForm, academicYear } : p));
      toast.success("Policy updated successfully");
    } else {
      setAllPolicies(prev => [{ ...policyForm, id: Date.now(), status: 'Published', academicYear }, ...prev]);
      toast.success("Policy created successfully");
    }
    setIsPolicyModalOpen(false);
    setPolicyForm(initPolicyForm);
  };

  // Columns for DataTable
  const noticeColumns = [
    { key: 'title', label: 'Title', align: 'left', render: (val) => <span className="font-bold text-gray-800 truncate block max-w-[200px]" title={val}>{val}</span> },
    { key: 'type', label: 'Type', align: 'center', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
        val === 'Emergency Announcement' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700'
      }`}>{val}</span>
    )},
    { key: 'priority', label: 'Priority', align: 'center', render: (val) => {
        let color = 'text-slate-500';
        if (val === 'High') color = 'text-orange-500 font-bold';
        if (val === 'Emergency') color = 'text-rose-600 font-bold';
        return <span className={color}>{val}</span>;
    }},
    { key: 'roles', label: 'Target Role(s)', align: 'center', render: (val) => <span className="text-xs font-medium text-slate-600">{val.join(', ') || 'None'}</span> },
    { key: 'class', label: 'Target Class', align: 'center', render: (val) => <span className="text-xs font-medium text-slate-700">{val}</span> },
    { key: 'section', label: 'Section', align: 'center', render: (val) => <span className="text-xs font-medium text-slate-700">{val}</span> },
    { key: 'publishDate', label: 'Publish Date', align: 'center', render: (val) => <span className="whitespace-nowrap text-xs">{val}</span> },
    { key: 'expiryDate', label: 'Expiry Date', align: 'center', render: (val) => <span className="whitespace-nowrap text-xs">{val}</span> },
    { key: 'status', label: 'Status', align: 'center', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
        val === 'Published' ? 'bg-emerald-50 text-emerald-700' : 
        val === 'Expired' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
      }`}>{val}</span>
    )},
    { key: 'actions', label: 'Actions', align: 'center', render: (_, row) => (
      <div className="flex justify-center gap-1">
        <ActionTooltip label="View">
          <button onClick={() => handleView(row, 'notice')} className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"><Eye size={16} /></button>
        </ActionTooltip>
        <ActionTooltip label="Edit">
          <button onClick={() => handleEditNotice(row)} className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={16} /></button>
        </ActionTooltip>
        <ActionTooltip label={row.status === 'Published' ? 'Unpublish' : 'Publish'}>
          <button onClick={() => handleTogglePublishNotice(row)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            {row.status === 'Published' ? <XCircle size={16} /> : <CheckCircle size={16} />}
          </button>
        </ActionTooltip>
        <ActionTooltip label="Delete">
          <button onClick={() => handleDeleteNotice(row.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </ActionTooltip>
      </div>
    )}
  ];

  const policyColumns = [
    { key: 'title', label: 'Policy Title', align: 'left', render: (val) => <span className="font-bold text-gray-800 truncate block max-w-[250px]" title={val}>{val}</span> },
    { key: 'effectiveDate', label: 'Effective Date', align: 'center', render: (val) => <span className="whitespace-nowrap text-xs font-semibold">{val}</span> },
    { key: 'audience', label: 'Audience', align: 'center', render: (val) => <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{val}</span> },
    { key: 'status', label: 'Status', align: 'center', render: (val) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
        val === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}>{val}</span>
    )},
    { key: 'actions', label: 'Actions', align: 'center', render: (_, row) => (
      <div className="flex justify-center gap-1">
        <ActionTooltip label="View">
          <button onClick={() => handleView(row, 'policy')} className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"><Eye size={16} /></button>
        </ActionTooltip>
        <ActionTooltip label="Edit">
          <button onClick={() => handleEditPolicy(row)} className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={16} /></button>
        </ActionTooltip>
        <ActionTooltip label={row.status === 'Published' ? 'Archive' : 'Publish'}>
          <button onClick={() => handleTogglePublishPolicy(row)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            {row.status === 'Published' ? <XCircle size={16} /> : <CheckCircle size={16} />}
          </button>
        </ActionTooltip>
        <ActionTooltip label="Delete">
          <button onClick={() => handleDeletePolicy(row.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </ActionTooltip>
      </div>
    )}
  ];

  return (
    <div className={`w-full space-y-8 pb-10 text-left animate-fade-in ${darkMode ? 'bg-[#0f172a] text-white p-6' : 'bg-slate-50 text-slate-800 p-6'}`}>
      <Toaster position="top-right" />
      {/* 1. Page Heading */}
      <Heading
        primaryText="Notice"
        secondaryText="Management"
        size={12}
        showAnimations={true}
      />

      <style>{`
        .notice-cards h3.truncate,
        .notice-cards span.truncate {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
      `}</style>

      {/* 2. Summary Cards */}
      <div className="notice-cards">
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Notices" value={loading ? "-" : kpis.total} icon={<FileText size={22} />} size={3} accentColor="#3B82F6" />
          <EnhancedDashCard title="Active Notices" value={loading ? "-" : kpis.active} icon={<Megaphone size={22} />} size={3} accentColor="#10B981" />
          <EnhancedDashCard title="Policy Updates" value={loading ? "-" : kpis.policies} icon={<ShieldAlert size={22} />} size={3} accentColor="#F59E0B" />
          <EnhancedDashCard title="Emergency Announcements" value={loading ? "-" : kpis.emergency} icon={<AlertTriangle size={22} />} size={3} accentColor="#F43F5E" />
        </DashGrid>
      </div>

      {/* 3. Global Filters */}
      <div className={`rounded-[24px] border shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-[#E7E2DB]'}`}>
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Academic Year</label>
            <Select id="filter-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} searchable={false}>
              <Option value="2024-2025" label="2024-2025" />
              <Option value="2025-2026" label="2025-2026" />
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Class</label>
            <Select id="filter-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} searchable={false}>
              <Option value="All Classes" label="All Classes" />
              {CLASSES.map(cls => <Option key={cls} value={cls} label={cls} />)}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Section</label>
            <Select id="filter-section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} searchable={false}>
              <Option value="All Sections" label="All Sections" />
              {SECTIONS.map(sec => <Option key={sec} value={sec} label={sec} />)}
            </Select>
          </div>
        </Grid>
      </div>

      {/* 4. Tab System */}
      <div className={`flex p-1 rounded-xl w-fit ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <button 
          onClick={() => setActiveTab('notices')} 
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'notices' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-[#223F74] shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
        >
          Notices
        </button>
        <button 
          onClick={() => setActiveTab('policies')} 
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'policies' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-[#223F74] shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
        >
          Policy Updates
        </button>
      </div>

      {/* 5 & 6. Data Table */}
      <div className={`rounded-[24px] border shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden ${darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-[#E7E2DB]'}`}>
        <div className={`p-6 pb-2 border-b flex justify-between items-center flex-wrap gap-4 ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-[#1D1D1F]'}`}>
            {activeTab === 'notices' ? 'Notice Board' : 'School Policies'}
          </h2>
          <Button 
            text={activeTab === 'notices' ? 'Create Notice' : 'Create Policy'} 
            icon={<Plus size={16} />} 
            variant="primary" 
            size={3}
            className="w-auto px-5"
            onClick={() => {
              if (activeTab === 'notices') {
                setNoticeForm(initNoticeForm);
                setIsNoticeModalOpen(true);
              } else {
                setPolicyForm(initPolicyForm);
                setIsPolicyModalOpen(true);
              }
            }}
          />
        </div>
        <div className="p-6 pt-4 relative min-h-[300px]">
          {loading && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm gap-3">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
             </div>
          )}
          <DataTable 
            rows={activeTab === 'notices' ? filteredNotices : filteredPolicies} 
            columns={activeTab === 'notices' ? noticeColumns : policyColumns} 
            searchable={true} 
            exportable={true} 
            exportFileName={activeTab === 'notices' ? `Notices_${academicYear}` : `Policies_${academicYear}`} 
          />
        </div>
      </div>

      {/* Modals */}
      
      {/* Create/Edit Notice Modal */}
      <PanelModal 
        id="notice-form-modal" 
        title={noticeForm.id ? 'Edit Notice' : 'Create Notice'} 
        size="xl"
        isVisible={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
      >
        <div className="space-y-6 pb-6 text-left">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Notice Details</h3>
            <Grid cols={12} gap={4}>
              <DataField label="Notice Title" id="n-title" type="text" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} size={12} />
              <DataField label="Description" id="n-desc" type="textarea" rows={3} value={noticeForm.description} onChange={e => setNoticeForm({...noticeForm, description: e.target.value})} size={12} />
              
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Notice Type</label>
                <Select id="n-type" value={noticeForm.type} onChange={(e) => setNoticeForm({...noticeForm, type: e.target.value})} searchable={false}>
                  <Option value="General Notice" label="General Notice" />
                  <Option value="Emergency Announcement" label="Emergency Announcement" />
                </Select>
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Priority</label>
                <Select id="n-priority" value={noticeForm.priority} onChange={(e) => setNoticeForm({...noticeForm, priority: e.target.value})} searchable={false}>
                  <Option value="Low" label="Low" />
                  <Option value="Medium" label="Medium" />
                  <Option value="High" label="High" />
                  <Option value="Emergency" label="Emergency" />
                </Select>
              </div>

              <DataField label="Publish Date" id="n-pub" type="date" value={noticeForm.publishDate} onChange={e => setNoticeForm({...noticeForm, publishDate: e.target.value})} size={6} />
              <DataField label="Expiry Date" id="n-exp" type="date" value={noticeForm.expiryDate} onChange={e => setNoticeForm({...noticeForm, expiryDate: e.target.value})} size={6} />
              <DataField label="Attachment URL (Optional)" id="n-att" type="text" value={noticeForm.attachment} onChange={e => setNoticeForm({...noticeForm, attachment: e.target.value})} size={12} />
            </Grid>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Target Audience</h3>
            <Grid cols={12} gap={4}>
              <div className="col-span-12">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-3">Target Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => (
                    <button 
                      key={role} 
                      type="button"
                      onClick={() => {
                        setNoticeForm(prev => {
                          const roles = prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
                          return { ...prev, roles };
                        });
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        noticeForm.roles.includes(role) 
                          ? 'bg-[#223F74] text-white border-[#223F74]' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Target Class</label>
                <Select id="n-class" value={noticeForm.class} onChange={(e) => setNoticeForm({...noticeForm, class: e.target.value, section: 'All Sections'})} searchable={false}>
                  <Option value="All Classes" label="All Classes" />
                  {CLASSES.map(cls => <Option key={cls} value={cls} label={cls} />)}
                </Select>
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Target Section</label>
                <Select id="n-section" value={noticeForm.section} onChange={(e) => setNoticeForm({...noticeForm, section: e.target.value})} searchable={false}>
                  <Option value="All Sections" label="All Sections" />
                  {SECTIONS.map(sec => <Option key={sec} value={sec} label={sec} />)}
                </Select>
              </div>
            </Grid>
          </div>
          
          <div className="flex justify-end pt-4">
            <div className="w-32">
              <Button text="Save Notice" variant="primary" onClick={handleSaveNotice} />
            </div>
          </div>
        </div>
      </PanelModal>

      {/* Create/Edit Policy Modal */}
      <PanelModal 
        id="policy-form-modal" 
        title={policyForm.id ? 'Edit Policy' : 'Create Policy'} 
        size="lg"
        isVisible={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      >
        <div className="space-y-6 pb-6 text-left">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Policy Details</h3>
            <Grid cols={12} gap={4}>
              <DataField label="Policy Title" id="p-title" type="text" value={policyForm.title} onChange={e => setPolicyForm({...policyForm, title: e.target.value})} size={12} />
              <DataField label="Description" id="p-desc" type="textarea" rows={4} value={policyForm.description} onChange={e => setPolicyForm({...policyForm, description: e.target.value})} size={12} />
              <DataField label="Effective Date" id="p-date" type="date" value={policyForm.effectiveDate} onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})} size={6} />
              <DataField label="Attachment URL (Optional)" id="p-att" type="text" value={policyForm.attachment} onChange={e => setPolicyForm({...policyForm, attachment: e.target.value})} size={6} />
              
              <div className="col-span-12 mt-2">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                  <ShieldAlert className="text-blue-600 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Audience Setting: {policyForm.audience}</h4>
                    <p className="text-xs text-blue-700 mt-1">This policy will be automatically visible in the Parent Panel and authorized Principal views once published. No manual duplication required.</p>
                  </div>
                </div>
              </div>
            </Grid>
          </div>
          
          <div className="flex justify-end pt-4">
            <div className="w-32">
              <Button text="Save Policy" variant="primary" onClick={handleSavePolicy} />
            </div>
          </div>
        </div>
      </PanelModal>

      {/* View Modal */}
      <PanelModal 
        id="view-detail-modal" 
        title={viewType === 'notice' ? 'Notice Details' : 'Policy Details'} 
        size="lg"
        isVisible={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
      >
        {viewRecord && viewType === 'notice' ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-slate-800">{viewRecord.title}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  viewRecord.type === 'Emergency Announcement' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700'
                }`}>{viewRecord.type}</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">{viewRecord.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Priority</p>
                <p className={`font-bold ${viewRecord.priority === 'Emergency' ? 'text-rose-600' : viewRecord.priority === 'High' ? 'text-orange-500' : 'text-slate-800'}`}>{viewRecord.priority}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                <p className="font-bold text-slate-800">{viewRecord.status}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Publish Date</p>
                <p className="font-bold text-slate-800">{viewRecord.publishDate}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Expiry Date</p>
                <p className="font-bold text-slate-800">{viewRecord.expiryDate}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Target Audience</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {viewRecord.roles.length > 0 ? viewRecord.roles.map(r => (
                      <span key={r} className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{r}</span>
                    )) : <span className="text-slate-400 text-sm">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Class</p>
                  <p className="font-bold text-slate-900">{viewRecord.class}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Section</p>
                  <p className="font-bold text-slate-900">{viewRecord.section}</p>
                </div>
              </div>
            </div>
            
            {viewRecord.attachment && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Attachment Available</p>
                    <p className="text-xs text-blue-700">{viewRecord.attachment}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white text-blue-700 text-sm font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                  Download
                </button>
              </div>
            )}
          </div>
        ) : viewRecord && viewType === 'policy' ? (
          <div className="space-y-6 pb-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-slate-800">{viewRecord.title}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  viewRecord.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>{viewRecord.status}</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">{viewRecord.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Effective Date</p>
                <p className="font-bold text-slate-800">{viewRecord.effectiveDate}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Audience</p>
                <p className="font-bold text-slate-800">{viewRecord.audience}</p>
              </div>
            </div>
            
            {viewRecord.attachment && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Policy Document</p>
                    <p className="text-xs text-blue-700">{viewRecord.attachment}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white text-blue-700 text-sm font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                  View Document
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <h3 className="text-sm font-bold text-slate-500">No details available.</h3>
          </div>
        )}
      </PanelModal>
    </div>
  );
}
