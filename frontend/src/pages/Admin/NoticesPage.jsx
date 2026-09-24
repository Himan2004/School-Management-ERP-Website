import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Megaphone, FileText, Bell, AlertTriangle, Eye, Pencil, CheckCircle, XCircle, Trash2, ShieldAlert, Plus, History
} from 'lucide-react';
import {
  Heading, DashGrid, EnhancedDashCard, Grid, DataTable, Select, Option, PanelModal, DataField, Button
} from '../../components/shared/Common_Components';
import api from '../../services/api';
import toast from 'react-hot-toast';

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

const ROLES = ['Teacher', 'Parent', 'Student', 'Principal', 'Accountant'];

const getCurrentAcademicYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  return today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

const classOrder = ["nursery", "junior kg", "senior kg", "lkg", "ukg"];

const sortClasses = (classesList) => {
  return [...classesList].sort((a, b) => {
    const nameA = (a.name || '').trim().toLowerCase();
    const nameB = (b.name || '').trim().toLowerCase();

    const idxA = classOrder.indexOf(nameA);
    const idxB = classOrder.indexOf(nameB);

    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const matchA = nameA.match(/(?:class|grade)\s*(\d+)/i);
    const matchB = nameB.match(/(?:class|grade)\s*(\d+)/i);

    if (matchA && matchB) {
      return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
    }
    if (matchA) return -1;
    if (matchB) return 1;

    return nameA.localeCompare(nameB);
  });
};

let cachedAcademicYearsOptions = null;
let cachedClassesList = null;
let cachedAllNotices = null;
let cachedAllPolicies = null;

const NoticesPage = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState('notices');

  const [loading, setLoading] = useState(activeTab === 'notices' ? !cachedAllNotices : !cachedAllPolicies);
  
  // Global Filters
  const [academicYearsOptions, setAcademicYearsOptions] = useState(cachedAcademicYearsOptions || []);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [classFilter, setClassFilter] = useState('All Classes');
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  // Dynamic Data States
  const [classesList, setClassesList] = useState(cachedClassesList || []);
  const [allNotices, setAllNotices] = useState(cachedAllNotices || []);
  const [allPolicies, setAllPolicies] = useState(cachedAllPolicies || []);

  // Modal States
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [viewType, setViewType] = useState('notice'); // 'notice' or 'policy'

  // Forms
  const initNoticeForm = { id: null, title: '', description: '', type: 'general', priority: 'Medium', publishDate: '', expiryDate: '', attachment: '', roles: [], class: 'All Classes', section: 'All Sections' };
  const [noticeForm, setNoticeForm] = useState(initNoticeForm);
  const [noticeFormError, setNoticeFormError] = useState('');
  
  const initPolicyForm = { id: null, title: '', description: '', effectiveDate: '', attachment: '', audience: 'Parents', status: 'Published' };
  const [policyForm, setPolicyForm] = useState(initPolicyForm);
  const [policyFormError, setPolicyFormError] = useState('');
  
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Available sections driven by selected class (Dropdowns in Form)
  const classSections = useMemo(() => {
    if (noticeForm.class === 'All Classes' || classFilter === 'All Classes') {
      const all = new Map();
      classesList.forEach(c => {
        (c.sections || []).forEach(s => {
          const name = s.name || s;
          if (name) all.set(String(name).toUpperCase(), name);
        });
      });
      return Array.from(all.keys()).sort();
    }
    // Match form class or filter class depending on context
    const targetClass = noticeForm.class !== 'All Classes' ? noticeForm.class : classFilter;
    const cls = classesList.find(c => String(c.id || c._id) === targetClass || String(c.name) === targetClass);
    return (cls?.sections || []).map(s => s.name || s);
  }, [noticeForm.class, classFilter, classesList]);

  // Fetch Academic Configs
  const fetchAcademicConfigs = useCallback(async () => {
    try {
      const res = await api.get('/admin/academic-configurations');
      const configs = res.data?.data || [];
      
      let activeYear = null;
      const yearsSet = new Set();
      
      configs.forEach(c => {
        if (c.academicYear) {
          yearsSet.add(c.academicYear);
          if (c.isCurrent) {
            activeYear = c.academicYear;
          }
        }
      });
      
      if (activeYear) {
        setAcademicYear(activeYear);
      } else {
        const defaultCurrent = getCurrentAcademicYear();
        setAcademicYear(defaultCurrent);
        yearsSet.add(defaultCurrent);
      }
      
      const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
      setAcademicYearsOptions(sortedYears);
      cachedAcademicYearsOptions = sortedYears;
    } catch (err) {
      console.error("Failed to fetch academic configs:", err);
      const defaultCurrent = getCurrentAcademicYear();
      setAcademicYear(defaultCurrent);
      setAcademicYearsOptions([defaultCurrent]);
      cachedAcademicYearsOptions = [defaultCurrent];
    }
  }, []);

  // Fetch Classes & Sections
  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/admin/academic/classes-sections');
      const sorted = sortClasses(res.data?.data || []);
      setClassesList(sorted);
      cachedClassesList = sorted;
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  }, []);

  // Fetch Notices
  const fetchNotices = useCallback(async (isSilent = false) => {
    if (!cachedAllNotices && !isSilent) setLoading(true);
    try {
      const params = { limit: 500 };
      if (classFilter !== 'All Classes') params.targetClass = classFilter;
      if (sectionFilter !== 'All Sections') params.targetSection = sectionFilter;
      
      const res = await api.get('/admin/notice', { params });
      const noticesData = res.data?.data || [];
      setAllNotices(noticesData);
      cachedAllNotices = noticesData;
    } catch (err) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  }, [classFilter, sectionFilter]);

  // Fetch Policies
  const fetchPolicies = useCallback(async (isSilent = false) => {
    if (!cachedAllPolicies && !isSilent) setLoading(true);
    try {
      const params = { limit: 500 };
      const res = await api.get('/admin/policies', { params });
      const policiesData = res.data?.data || [];
      setAllPolicies(policiesData);
      cachedAllPolicies = policiesData;
    } catch (err) {
      console.error('Failed to load policies (endpoint may not exist)', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicConfigs();
    fetchClasses();
  }, [fetchAcademicConfigs, fetchClasses]);

  useEffect(() => {
    if (activeTab === 'notices') {
      fetchNotices(Boolean(cachedAllNotices));
    } else {
      fetchPolicies(Boolean(cachedAllPolicies));
    }
  }, [activeTab, fetchNotices, fetchPolicies]);

  // Filter Notices & Policies in-memory based on global filters
  const filteredNotices = useMemo(() => {
    let result = allNotices;
    
    // Academic Year filter
    if (academicYear && academicYear !== 'All Academic Years' && academicYear !== 'All Sessions') {
      const match = academicYear.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        const endYear = parseInt(match[2], 10);
        const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
        const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);
        result = result.filter(n => {
          const date = new Date(n.createdAt);
          return date >= startDate && date <= endDate;
        });
      }
    }
    
    // Target Class filter
    if (classFilter && classFilter !== 'All Classes') {
      result = result.filter(n => n.targetClass === 'All Classes' || n.targetClass === classFilter);
    }
    
    // Target Section filter
    if (sectionFilter && sectionFilter !== 'All Sections') {
      result = result.filter(n => n.targetSection === 'All Sections' || n.targetSection === sectionFilter);
    }
    
    return result;
  }, [allNotices, academicYear, classFilter, sectionFilter]);

  const filteredPolicies = useMemo(() => {
    let result = allPolicies;
    
    // Academic Year filter
    if (academicYear && academicYear !== 'All Academic Years' && academicYear !== 'All Sessions') {
      const match = academicYear.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        const endYear = parseInt(match[2], 10);
        const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
        const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);
        result = result.filter(p => {
          const date = new Date(p.createdAt || p.effectiveDate);
          return date >= startDate && date <= endDate;
        });
      }
    }
    
    return result;
  }, [allPolicies, academicYear]);

  // Compute notice stats from in-memory filtered notices list
  const noticeStats = useMemo(() => {
    const total = filteredNotices.length;
    const published = filteredNotices.filter(n => n.status === 'published' || n.status === 'Published').length;
    const draft = filteredNotices.filter(n => n.status === 'draft' || n.status === 'Draft').length;
    const emergency = filteredNotices.filter(n => n.priority === 'Emergency' || n.priority === 'emergency').length;
    return { total, published, draft, emergency };
  }, [filteredNotices]);

  // Compute policy stats from in-memory filtered policies list
  const policyStats = useMemo(() => {
    const total = filteredPolicies.length;
    const active = filteredPolicies.filter(p => p.status === 'Published' || p.status === 'published').length;
    const draft = filteredPolicies.filter(p => p.status === 'Draft' || p.status === 'draft').length;
    const archived = filteredPolicies.filter(p => p.status === 'Archived' || p.status === 'archived').length;
    return { total, active, draft, archived };
  }, [filteredPolicies]);

  // Formatting for Tables
  const formatNoticesForTable = useMemo(() => filteredNotices.map(n => ({
    _original: n,
    id: n._id,
    title: n.title,
    description: n.content,
    type: n.category || 'General Notice',
    priority: n.priority || 'Medium',
    roles: n.targetAudience.includes('all') ? ['All'] : n.targetAudience.map(r => r.charAt(0).toUpperCase() + r.slice(1)),
    class: n.targetClass || 'All Classes',
    section: n.targetSection || 'All Sections',
    publishDate: n.scheduledPublishAt ? new Date(n.scheduledPublishAt).toLocaleDateString() : new Date(n.createdAt).toLocaleDateString(),
    expiryDate: n.expiryDate ? new Date(n.expiryDate).toLocaleDateString() : 'N/A',
    status: n.status === 'published' ? 'Published' : n.status === 'draft' ? 'Draft' : n.status === 'scheduled' ? 'Scheduled' : 'Expired',
    createdBy: n.createdBy?.name || 'Admin',
    lastUpdated: new Date(n.updatedAt).toLocaleDateString(),
    attachment: n.attachments && n.attachments[0] ? n.attachments[0].name : ''
  })), [filteredNotices]);

  const formatPoliciesForTable = useMemo(() => filteredPolicies.map(p => ({
    _original: p,
    id: p._id,
    title: p.title,
    description: p.description,
    effectiveDate: new Date(p.effectiveDate).toLocaleDateString(),
    audience: p.audience,
    status: p.status,
    createdBy: p.createdBy?.name || 'Admin',
    lastUpdated: new Date(p.updatedAt).toLocaleDateString(),
    attachment: p.attachment || ''
  })), [filteredPolicies]);

  // Actions
  const handleDownload = (filename) => {
    if (!filename) return;
    const mockContent = "Mock attachment content for: " + filename;
    const blob = new Blob([mockContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleView = (row, type) => {
    setViewRecord(row);
    setViewType(type);
    setIsViewModalOpen(true);
    // Track view dynamically via API
    if (type === 'notice') {
        api.post(`/admin/notice/${row.id}/view`).catch(err => console.error("View tracking failed", err));
    }
  };

  const handleDeleteNotice = async (id) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      try {
        await api.delete(`/admin/notice/${id}`);
        toast.success("Notice deleted successfully");
        fetchNotices();
      } catch (err) {
        toast.error("Failed to delete notice");
      }
    }
  };

  const handleDeletePolicy = async (id) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      try {
        await api.delete(`/admin/policies/${id}`);
        toast.success("Policy deleted successfully");
        fetchPolicies();
      } catch (err) {
        toast.error("Failed to delete policy");
      }
    }
  };

  const handleTogglePublishNotice = async (row) => {
    const newStatus = row.status === 'Published' ? 'draft' : 'published';
    try {
      await api.put(`/admin/notice/${row.id}`, { status: newStatus });
      toast.success(`Notice ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      fetchNotices();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleTogglePublishPolicy = async (row) => {
    const newStatus = row.status === 'Published' ? 'Archived' : 'Published';
    try {
      await api.put(`/admin/policies/${row.id}`, { status: newStatus });
      toast.success(`Policy ${newStatus === 'Published' ? 'published' : 'archived'}`);
      fetchPolicies();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleEditNotice = (row) => {
    setNoticeFormError('');
    const orig = row._original;
    setNoticeForm({
      id: row.id,
      title: orig.title,
      description: orig.content,
      type: orig.category || 'general',
      priority: orig.priority || 'Medium',
      publishDate: orig.scheduledPublishAt ? new Date(orig.scheduledPublishAt).toISOString().split('T')[0] : '',
      expiryDate: orig.expiryDate ? new Date(orig.expiryDate).toISOString().split('T')[0] : '',
      roles: orig.targetAudience.includes('all') ? ROLES : orig.targetAudience.map(r => r.charAt(0).toUpperCase() + r.slice(1).replace(/s$/, '')),
      class: orig.targetClass || 'All Classes',
      section: orig.targetSection || 'All Sections',
      attachment: orig.attachments && orig.attachments[0] ? orig.attachments[0].name : '',
      createdBy: orig.createdBy?.name || 'Admin',
      lastUpdated: new Date(orig.updatedAt).toLocaleDateString()
    });
    setIsNoticeModalOpen(true);
  };

  const handleEditPolicy = (row) => {
    setPolicyFormError('');
    const orig = row._original;
    setPolicyForm({
      id: row.id,
      title: orig.title,
      description: orig.description,
      effectiveDate: new Date(orig.effectiveDate).toISOString().split('T')[0],
      audience: orig.audience,
      status: orig.status,
      attachment: orig.attachment || '',
      createdBy: orig.createdBy?.name || 'Admin',
      lastUpdated: new Date(orig.updatedAt).toLocaleDateString()
    });
    setIsPolicyModalOpen(true);
  };

  const handleSaveNotice = async () => {
    if (isSavingNotice) return;
    setNoticeFormError('');
    if (!noticeForm.title) {
      setNoticeFormError('Notice title is required.');
      return toast.error('Notice title is required.');
    }
    setIsSavingNotice(true);
    try {
      const payload = {
        title: noticeForm.title,
        content: noticeForm.description,
        category: noticeForm.type,
        // Backend expects lowercase audience names
        targetAudience: (noticeForm.roles.length === ROLES.length || noticeForm.roles.length === 0) ? ['all'] : noticeForm.roles.map(r => r.toLowerCase()),
        targetClass: noticeForm.class,
        targetSection: noticeForm.section,
        priority: noticeForm.priority,
        expiryDate: noticeForm.expiryDate || null,
        scheduledPublishAt: noticeForm.publishDate || null,
        attachments: noticeForm.attachment ? [{ name: noticeForm.attachment, url: '#', type: 'file' }] : [],
      };

      if (noticeForm.id) {
        await api.put(`/admin/notice/${noticeForm.id}`, payload);
        toast.success("Notice updated successfully");
      } else {
        await api.post('/admin/notice', payload);
        toast.success("Notice created successfully");
      }
      setIsNoticeModalOpen(false);
      setNoticeForm(initNoticeForm);
      setNoticeFormError('');
      fetchNotices();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save notice";
      setNoticeFormError(msg);
      toast.error(msg);
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleSavePolicy = async () => {
    if (isSavingPolicy) return;
    setPolicyFormError('');
    if (!policyForm.title || !policyForm.effectiveDate) {
      setPolicyFormError('Policy title and effective date are required.');
      return toast.error('Policy title and effective date are required.');
    }
    setIsSavingPolicy(true);
    try {
      const payload = {
        title: policyForm.title,
        description: policyForm.description,
        effectiveDate: policyForm.effectiveDate,
        audience: policyForm.audience,
        status: policyForm.status,
        attachment: policyForm.attachment
      };

      if (policyForm.id) {
        await api.put(`/admin/policies/${policyForm.id}`, payload);
        toast.success("Policy updated successfully");
      } else {
        await api.post('/admin/policies', payload);
        toast.success("Policy created successfully");
      }
      setIsPolicyModalOpen(false);
      setPolicyForm(initPolicyForm);
      setPolicyFormError('');
      fetchPolicies();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save policy";
      setPolicyFormError(msg);
      toast.error(msg);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleExportCSV = (rows, type) => {
    if (rows.length === 0) return toast.error("No records to export");
    let headers = [];
    let csvRows = [];
    
    if (type === 'notices') {
      headers = ['Title', 'Type', 'Priority', 'Target Roles', 'Class', 'Section', 'Status'];
      csvRows = rows.map(r => [
        `"${r.title}"`, `"${r.type}"`, `"${r.priority}"`, `"${r.roles.join(', ')}"`, `"${r.class}"`, `"${r.section}"`, `"${r.status}"`
      ]);
    } else {
      headers = ['Title', 'Effective Date', 'Visible To', 'Status'];
      csvRows = rows.map(r => [
        `"${r.title}"`, `"${r.effectiveDate}"`, `"${r.audience}"`, `"${r.status}"`
      ]);
    }

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `${type}_export_${new Date().getTime()}.csv`;
    a.click();
  };

  // Columns for DataTable
  const noticeColumns = [
    { key: 'title', label: 'Notice Title', align: 'left', render: (val) => <span className="font-bold text-gray-800 truncate block max-w-[200px]" title={val}>{val}</span> },
    { key: 'type', label: 'Notice Type', align: 'center', render: (val) => (
      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{val}</span>
    )},
    { key: 'priority', label: 'Priority', align: 'center', render: (val) => {
        let color = 'text-slate-500 font-bold';
        if (val === 'Medium') color = 'text-blue-500 font-bold';
        if (val === 'High') color = 'text-orange-500 font-bold';
        if (val === 'Emergency') color = 'text-rose-600 font-bold';
        return <span className={color}>{val}</span>;
    }},
    { key: 'roles', label: 'Target Role(s)', align: 'center', render: (val) => <span className="text-xs font-medium text-slate-600 truncate max-w-[150px] block" title={val.join(', ')}>{val.join(', ') || 'None'}</span> },
    { key: 'class', label: 'Target Class', align: 'center', render: (val) => <span className="text-xs text-slate-600">{val}</span> },
    { key: 'section', label: 'Target Section', align: 'center', render: (val) => <span className="text-xs text-slate-600">{val}</span> },
    { key: 'publishDate', label: 'Publish Date', align: 'center', render: (val) => <span className="whitespace-nowrap text-xs text-slate-600">{val}</span> },
    { key: 'expiryDate', label: 'Expiry Date', align: 'center', render: (val) => <span className="whitespace-nowrap text-xs text-slate-600">{val}</span> },
    { key: 'status', label: 'Status', align: 'center', render: (val) => {
        let styles = 'bg-slate-100 text-slate-500';
        if (val === 'Published') styles = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        if (val === 'Draft') styles = 'bg-amber-50 text-amber-700 border border-amber-200';
        if (val === 'Scheduled') styles = 'bg-blue-50 text-blue-700 border border-blue-200';
        if (val === 'Expired') styles = 'bg-slate-100 text-slate-500 border border-slate-200';
        return <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${styles}`}>{val}</span>;
    }},
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
    { key: 'audience', label: 'Visible To', align: 'center', render: (val) => <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{val}</span> },
    { key: 'status', label: 'Status', align: 'center', render: (val) => {
        let styles = 'bg-slate-100 text-slate-500';
        if (val === 'Published') styles = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        if (val === 'Draft') styles = 'bg-amber-50 text-amber-700 border border-amber-200';
        if (val === 'Archived') styles = 'bg-slate-100 text-slate-500 border border-slate-200';
        return <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${styles}`}>{val}</span>;
    }},
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
    <div className="w-full space-y-8 pb-10 text-left animate-fade-in">
      
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
          <EnhancedDashCard title="Total Notices" value={loading ? "-" : noticeStats.total} icon={<FileText size={22} />} size={3} accentColor="#3B82F6" />
          <EnhancedDashCard title="Active Notices" value={loading ? "-" : noticeStats.published} icon={<Megaphone size={22} />} size={3} accentColor="#10B981" />
          <EnhancedDashCard title="Policy Updates" value={loading ? "-" : policyStats.total} icon={<ShieldAlert size={22} />} size={3} accentColor="#8B5CF6" />
          <EnhancedDashCard title="Emergency Announcements" value={loading ? "-" : noticeStats.emergency} icon={<AlertTriangle size={22} />} size={3} accentColor="#F43F5E" />
        </DashGrid>
      </div>

      {/* 4. Tab System */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('notices')} 
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'notices' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Notices
        </button>
        <button 
          onClick={() => setActiveTab('policies')} 
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'policies' ? 'bg-white text-[#223F74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Policy Updates
        </button>
      </div>

      {/* Header and Create Action */}
      <div className="flex justify-between items-center mb-2 mt-6">
        <h2 className="text-xl font-black text-[#1D1D1F]">
          {activeTab === 'notices' ? 'Notice Board' : 'School Policies'}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExportCSV(activeTab === 'notices' ? formatNoticesForTable : formatPoliciesForTable, activeTab)}
            className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-4 py-2 rounded-lg text-[#223F74] font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            Export
          </button>
          <Button 
            text={activeTab === 'notices' ? 'Create Notice' : 'Create Policy'} 
            icon={<Plus size={16} />} 
            variant="primary" 
            className="w-auto px-5"
            onClick={() => {
              if (activeTab === 'notices') {
                setNoticeForm(initNoticeForm);
                setNoticeFormError('');
                setIsNoticeModalOpen(true);
              } else {
                setPolicyForm(initPolicyForm);
                setPolicyFormError('');
                setIsPolicyModalOpen(true);
              }
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="relative min-h-[300px] pb-6 pt-4 px-6">
          {loading && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm gap-3">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
             </div>
          )}
          <DataTable 
            key={activeTab}
            filters={[
              {
                title: "Academic Year",
                type: "toggle",
                options: ["All Academic Years", ...academicYearsOptions]
              },
              {
                title: "Class",
                type: "toggle",
                options: ["All Classes", ...classesList.map(c => c.name)]
              },
              {
                title: "Section",
                type: "toggle",
                options: ["All Sections", ...classSections]
              }
            ]}
            onApplyFilters={(applied) => {
              setAcademicYear(applied["Academic Year"]?.[0] || 'All Academic Years');
              setClassFilter(applied["Class"]?.[0] || 'All Classes');
              setSectionFilter(applied["Section"]?.[0] || 'All Sections');
            }}
            rows={activeTab === 'notices' ? formatNoticesForTable : formatPoliciesForTable} 
            columns={activeTab === 'notices' ? noticeColumns : policyColumns} 
            searchable={true} 
            exportable={false} 
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
                  <Option value="general" label="General Notice" />
                  <Option value="events" label="Event" />
                  <Option value="exam" label="Examination" />
                  <Option value="academic" label="Academic" />
                  <Option value="holiday" label="Holiday" />
                  <Option value="finance" label="Finance" />
                  <Option value="urgent" label="Alert" />
                  <Option value="emergency" label="Emergency" />
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

              <DataField label="Publish Date" id="n-pub" type="date" value={noticeForm.publishDate} onChange={e => setNoticeForm({...noticeForm, publishDate: e.target.value})} size={4} />
              <DataField label="Expiry Date" id="n-exp" type="date" value={noticeForm.expiryDate} onChange={e => setNoticeForm({...noticeForm, expiryDate: e.target.value})} size={4} />
              
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Attachment</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer hover:bg-slate-50 text-center transition-colors">
                    <span>{noticeForm.attachment ? 'Replace File' : 'Upload File'}</span>
                    <input type="file" className="hidden" onChange={(e) => setNoticeForm({...noticeForm, attachment: e.target.files[0]?.name || ''})} />
                  </label>
                  {noticeForm.attachment && (
                    <span className="text-xs text-emerald-600 font-semibold truncate max-w-[100px]" title={noticeForm.attachment}>{noticeForm.attachment}</span>
                  )}
                </div>
              </div>
              
              {noticeForm.id && (
                <div className="col-span-12 mt-2 pt-4 border-t border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">System Information (Read-Only)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Notice ID</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{noticeForm.id}</p>
                    </div>
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Created By</p>
                      <p className="text-xs font-bold text-slate-700">{noticeForm.createdBy}</p>
                    </div>
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Last Updated</p>
                      <p className="text-xs font-bold text-slate-700">{noticeForm.lastUpdated}</p>
                    </div>
                  </div>
                </div>
              )}
            </Grid>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Target Audience</h3>
            <Grid cols={12} gap={4}>
              <div className="col-span-12">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-3">Target Roles</label>
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
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
                  {classesList.map(cls => <Option key={cls._id || cls.name} value={cls.name} label={cls.name} />)}
                </Select>
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Target Section</label>
                <Select id="n-section" value={noticeForm.section} onChange={(e) => setNoticeForm({...noticeForm, section: e.target.value})} searchable={false}>
                  <Option value="All Sections" label="All Sections" />
                  {classSections.map(sec => <Option key={sec} value={sec} label={sec} />)}
                </Select>
              </div>
            </Grid>
          </div>
          
          <div className="flex justify-end pt-4 items-center">
            {noticeFormError && (
              <span className="text-red-500 text-sm font-bold mr-4">{noticeFormError}</span>
            )}
            <div className="w-32">
              <Button text="Save Notice" variant="primary" onClick={handleSaveNotice} loading={isSavingNotice} disabled={isSavingNotice} />
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
        <div className="space-y-6 text-left">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Policy Details</h3>
            <Grid cols={12} gap={4}>
              <DataField label="Policy Title" id="p-title" type="text" value={policyForm.title} onChange={e => setPolicyForm({...policyForm, title: e.target.value})} size={12} />
              <DataField label="Description" id="p-desc" type="textarea" rows={4} value={policyForm.description} onChange={e => setPolicyForm({...policyForm, description: e.target.value})} size={12} />
              <DataField label="Effective Date" id="p-date" type="date" value={policyForm.effectiveDate} onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})} size={6} className="flex items-center justify-between" />
              
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Visible To</label>
                <Select id="p-aud" value={policyForm.audience} onChange={e => setPolicyForm({...policyForm, audience: e.target.value})} searchable={false}>
                  <Option value="All Users" label="All Users" />
                  <Option value="Parents" label="Parents" />
                  <Option value="Students" label="Students" />
                  <Option value="Teachers" label="Teachers" />
                  <Option value="Principal" label="Principal" />
                  <Option value="Accountant" label="Accountant" />
                </Select>
              </div>

              <div className="col-span-12">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Policy Document</label>
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <span>{policyForm.attachment ? 'Replace Policy Document' : 'Upload Policy Document'}</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setPolicyForm({...policyForm, attachment: e.target.files[0]?.name || ''})} />
                  </label>
                  <span className="text-xs text-slate-600 font-semibold truncate">
                    {policyForm.attachment || 'No file selected'}
                  </span>
                </div>
              </div>
              
              <div className="col-span-12 mt-2">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                  <ShieldAlert className="text-blue-600 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Audience Setting: {policyForm.audience}</h4>
                    <p className="text-xs text-blue-700 mt-1">This policy will be automatically visible to selected roles on their dashboards once published. No manual duplication required.</p>
                  </div>
                </div>
              </div>

              {policyForm.id && (
                <div className="col-span-12 mt-2 pt-4 border-t border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">System Information (Read-Only)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Policy ID</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{policyForm.id}</p>
                    </div>
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Created By</p>
                      <p className="text-xs font-bold text-slate-700">{policyForm.createdBy || 'Admin'}</p>
                    </div>
                    <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">Last Updated</p>
                      <p className="text-xs font-bold text-slate-700">{policyForm.lastUpdated || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </Grid>
          </div>
          
          <div className="flex justify-end pt-4 items-center">
            {policyFormError && (
              <span className="text-red-500 text-sm font-bold mr-4">{policyFormError}</span>
            )}
            <div className="w-32">
              <Button text="Save Policy" variant="primary" onClick={handleSavePolicy} loading={isSavingPolicy} disabled={isSavingPolicy} />
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
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Notice Details</h3>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 mb-1">ID: {viewRecord.id}</p>
                  <h2 className="text-xl font-bold text-slate-800">{viewRecord.title}</h2>
                </div>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap mt-2">{viewRecord.description}</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Notice Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Notice Type</p>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700`}>{viewRecord.type}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Priority</p>
                  <p className={`font-bold ${viewRecord.priority === 'Emergency' ? 'text-rose-600' : viewRecord.priority === 'High' ? 'text-orange-500' : 'text-slate-800'}`}>{viewRecord.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                  <p className="font-bold text-slate-800">{viewRecord.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Created By</p>
                  <p className="font-bold text-slate-800">{viewRecord.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Publish Date</p>
                  <p className="font-bold text-slate-800 whitespace-nowrap">{viewRecord.publishDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Expiry Date</p>
                  <p className="font-bold text-slate-800 whitespace-nowrap">{viewRecord.expiryDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="font-bold text-slate-800">{viewRecord.lastUpdated}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Target Audience</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {viewRecord.roles && viewRecord.roles.length > 0 ? (
                      <span className="text-slate-800 font-bold">{viewRecord.roles.join(', ')}</span>
                    ) : <span className="text-slate-400 text-sm">None</span>}
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
                  <FileText className="text-blue-600" size={32} />
                  <div>
                    <p className="text-sm font-bold text-blue-900 truncate max-w-[200px]" title={viewRecord.attachment}>{viewRecord.attachment}</p>
                    <p className="text-xs text-blue-700 font-medium">
                      {viewRecord.attachment.split('.').pop().toUpperCase()} • {Math.floor(Math.random() * 500) + 100} KB
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDownload(viewRecord.attachment)} className="px-4 py-2 bg-white text-blue-700 text-sm font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                  Download
                </button>
              </div>
            )}
          </div>
        ) : viewRecord && viewType === 'policy' ? (
          <div className="space-y-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Policy Details</h3>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 mb-1">ID: {viewRecord.id}</p>
                  <h2 className="text-xl font-bold text-slate-800">{viewRecord.title}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  viewRecord.status === 'Published' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                  viewRecord.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>{viewRecord.status}</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">{viewRecord.description}</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Policy Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Effective Date</p>
                  <p className="font-bold text-slate-800 whitespace-nowrap">{viewRecord.effectiveDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Visible To</p>
                  <p className="font-bold text-slate-800">{viewRecord.audience}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Created By</p>
                  <p className="font-bold text-slate-800">{viewRecord.createdBy || 'Admin'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="font-bold text-slate-800">{viewRecord.lastUpdated || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            {viewRecord.attachment && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={32} />
                  <div>
                    <p className="text-sm font-bold text-blue-900 truncate max-w-[200px]" title={viewRecord.attachment}>{viewRecord.attachment}</p>
                    <p className="text-xs text-blue-700 font-medium">
                      {viewRecord.attachment.split('.').pop().toUpperCase()} • {Math.floor(Math.random() * 500) + 100} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(viewRecord.attachment)} className="px-4 py-2 bg-white text-blue-700 text-sm font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    View Document
                  </button>
                  <button onClick={() => handleDownload(viewRecord.attachment)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    Download
                  </button>
                </div>
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
};

export default NoticesPage;