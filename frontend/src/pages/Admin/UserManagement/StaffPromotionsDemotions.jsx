import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, TrendingUp, TrendingDown, Clock, Star, Award,
  Eye, ArrowUpCircle, ArrowDownCircle, BarChart3, History,
  CheckCircle, AlertCircle, UserCheck
} from 'lucide-react';
import {
  Heading, Button, DataTable,
  DashGrid, EnhancedDashCard, PanelModal, Grid, DataField, Select, Option,
  GLineChart, GColumnChart, GDoughnutChart
} from '../../../components/shared/Common_Components';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const defaultAvatarSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100%" height="100%" fill="#223F74"/>
    <circle cx="50" cy="35" r="20" fill="#ffffff"/>
    <path d="M 20 80 C 20 55, 80 55, 80 80 Z" fill="#ffffff"/>
  </svg>`
)}`;

// ── Static look‑up data ──────────────────────────────────────────────────────
const GRADES      = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const DESIGNATIONS = [
  'Junior Teacher', 'Senior Teacher', 'Lead Teacher', 'Head of Department',
  'Junior Administrator', 'Senior Administrator', 'Admin Officer', 'Admin Manager',
  'Junior Accountant', 'Senior Accountant', 'Finance Manager',
  'Junior Librarian', 'Senior Librarian',
  'IT Support Officer', 'IT Manager',
  'Vice Principal', 'Principal'
];

// ── Utility helpers ──────────────────────────────────────────────────────────
const statusColor = (status) => {
  if (status === 'Active')       return 'bg-emerald-100 text-emerald-700';
  if (status === 'Probation')    return 'bg-amber-100 text-amber-700';
  if (status === 'Suspended')    return 'bg-rose-100 text-rose-700';
  if (status === 'Inactive')     return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
};

const promotionStatusColor = (ps) => {
  if (ps === 'Eligible')        return 'bg-blue-100 text-blue-700';
  if (ps === 'Pending Review')  return 'bg-amber-100 text-amber-700';
  if (ps === 'Promoted')        return 'bg-emerald-100 text-emerald-700';
  if (ps === 'Demoted')         return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-500';
};

const ratingStars = (rating) => {
  const filled = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
      <span className="ml-1 text-xs font-bold text-slate-700">{rating.toFixed(1)}</span>
    </span>
  );
};

// Module-level cache
let promotionsCache = {
  staffList: null,
  promotionsList: null,
  schoolCreatedYear: 2026
};

// ── Component ────────────────────────────────────────────────────────────────
const AdminStaffPromotionsDemotions = () => {
  const [staffList, setStaffList] = useState(promotionsCache.staffList || []);
  const [promotionsList, setPromotionsList] = useState(promotionsCache.promotionsList || []);
  const [schoolCreatedYear, setSchoolCreatedYear] = useState(promotionsCache.schoolCreatedYear || 2026);
  const [loading, setLoading] = useState(!promotionsCache.staffList);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters
  const [deptFilter,      setDeptFilter]      = useState('all');
  const [roleFilter,      setRoleFilter]      = useState('all');
  const [yearFilter,      setYearFilter]      = useState('all');
  const [empStatusFilter, setEmpStatusFilter] = useState('all');
  const [promoStatusFilter, setPromoStatusFilter] = useState('all');

  // Dynamic Departments list based on backend data
  const departments = useMemo(() => {
    const set = new Set();
    staffList.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [staffList]);

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff/promotions/all');
      setPromotionsList(res.data?.data || []);
      setSchoolCreatedYear(res.data?.schoolCreatedYear || 2026);
    } catch (err) {
      console.error('Failed to fetch promotions history:', err);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    promotionsList.forEach(p => {
      if (p.effectiveDate) {
        yearsSet.add(new Date(p.effectiveDate).getFullYear());
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [promotionsList]);

  // Modal controls
  const [viewStaff,    setViewStaff]    = useState(null);
  const [promoteStaff, setPromoteStaff] = useState(null);
  const [demoteStaff,  setDemoteStaff]  = useState(null);
  const [perfStaff,    setPerfStaff]    = useState(null);
  const [histStaff,    setHistStaff]    = useState(null);

  // Promotion form
  const [promoForm, setPromoForm] = useState({
    newDesignation: '', newGrade: '', effectiveDate: '',
    salaryIncrement: '', reason: '', remarks: ''
  });
  // Demotion form
  const [demoteForm, setDemoteForm] = useState({
    newDesignation: '', newGrade: '', effectiveDate: '',
    reason: '', remarks: ''
  });
  // Performance form
  const [perfForm, setPerfForm] = useState({
    performanceRating: '', attendance: '', discipline: '',
    achievements: '', training: '', managerRemarks: '', recommendation: ''
  });

  const fetchStaff = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.get('/admin/staff');
      const formatted = (res.data?.data || []).map(s => {
        const p = s.profileId || {};
        
        let displayRole = 'Staff';
        if (s.role === 'teacher') displayRole = 'Teacher';
        else if (s.role === 'accountant') displayRole = 'Accountant';
        else if (s.role === 'support_staff') displayRole = 'Support Staff';

        const status = s.status === 'active' ? 'Active' : 'Inactive';
        const promotionStatus = status === 'Inactive' ? 'Not Eligible' : (p.promotionStatus || 'Eligible');

        return {
          id: s._id,
          name: s.name || 'N/A',
          photo: p.photo || s.photo || '',
          employeeId: p.staffId || s.loginId || s._id,
          designation: p.designation || (s.role === 'teacher' ? 'Subject Teacher' : displayRole),
          department: p.department || (s.role === 'teacher' ? 'Academics' : 'Administration'),
          grade: p.grade || 'Grade 1',
          joiningDate: p.joiningDate ? new Date(p.joiningDate).toISOString().split('T')[0] : '—',
          experience: p.experience || 0,
          performanceRating: p.performanceRating || 4.5,
          promotionStatus,
          lastPromotionDate: p.lastPromotionDate ? new Date(p.lastPromotionDate).toISOString().split('T')[0] : '—',
          status,
          history: [],
          role: displayRole,
          school: s.school?.schoolName || 'High School',
          salary: p.salary || 0
        };
      });
      setStaffList(formatted);
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
      if (!isSilent) toast.error('Failed to load staff list');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isSilent = !!promotionsCache.staffList;
    fetchStaff(isSilent);
  }, [fetchStaff]);

  useEffect(() => {
    if (staffList && staffList.length > 0) {
      promotionsCache.staffList = staffList;
    }
  }, [staffList]);

  useEffect(() => {
    if (promotionsList && promotionsList.length > 0) {
      promotionsCache.promotionsList = promotionsList;
    }
  }, [promotionsList]);

  useEffect(() => {
    promotionsCache.schoolCreatedYear = schoolCreatedYear;
  }, [schoolCreatedYear]);

  useEffect(() => {
    if (!histStaff) {
      setHistoryList([]);
      return;
    }
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await api.get(`/admin/staff/history/${histStaff.id}`);
        setHistoryList(res.data?.data?.promotions || []);
      } catch (err) {
        console.error('Failed to fetch staff history:', err);
        toast.error('Failed to load history');
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [histStaff]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return staffList.filter(s => {
      if (deptFilter      !== 'all' && s.department    !== deptFilter)          return false;
      if (roleFilter      !== 'all' && s.role          !== roleFilter)          return false;
      if (empStatusFilter !== 'all' && s.status        !== empStatusFilter)     return false;
      if (promoStatusFilter !== 'all' && s.promotionStatus !== promoStatusFilter) return false;
      if (yearFilter !== 'all') {
        const promoYear = s.lastPromotionDate ? new Date(s.lastPromotionDate).getFullYear() : null;
        if (String(promoYear) !== yearFilter) return false;
      }
      return true;
    });
  }, [staffList, deptFilter, roleFilter, empStatusFilter, promoStatusFilter, yearFilter]);

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      total:       staffList.length,
      eligible:    staffList.filter(s => s.status === 'Active' && s.promotionStatus === 'Eligible').length,
      promoted:    promotionsList.filter(p => p.actionType === 'promotion').length,
      demoted:     promotionsList.filter(p => p.actionType === 'demotion').length,
      pending:     staffList.filter(s => s.status === 'Active' && s.promotionStatus === 'Pending Review').length,
      requests:    staffList.filter(s => s.status === 'Active' && (s.promotionStatus === 'Eligible' || s.promotionStatus === 'Pending Review')).length,
    };
  }, [staffList, promotionsList]);

  // ── Analytics data ─────────────────────────────────────────────────────────
  const promotionTrendData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const data = [];
    for (let yr = schoolCreatedYear; yr <= currentYear; yr++) {
      const yearPromotions = promotionsList.filter(p => p.actionType === 'promotion' && new Date(p.effectiveDate).getFullYear() === yr).length;
      const yearDemotions = promotionsList.filter(p => p.actionType === 'demotion' && new Date(p.effectiveDate).getFullYear() === yr).length;
      data.push({
        name: String(yr),
        promotions: yearPromotions,
        demotions: yearDemotions
      });
    }
    return data;
  }, [promotionsList, schoolCreatedYear]);

  const deptPromotionData = useMemo(() => {
    const map = {};
    staffList.filter(s => s.promotionStatus === 'Promoted').forEach(s => {
      if (!map[s.department]) map[s.department] = 0;
      map[s.department] += 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [staffList]);

  const topRatedStaff = useMemo(() => {
    return [...staffList].sort((a, b) => b.performanceRating - a.performanceRating).slice(0, 5);
  }, [staffList]);

  const recentlyPromoted = useMemo(() => {
    return staffList
      .filter(s => s.promotionStatus === 'Promoted')
      .slice(0, 5);
  }, [staffList]);

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleConfirmPromotion = async () => {
    if (!promoteStaff) return;
    if (!promoForm.newDesignation || !promoForm.effectiveDate || !promoForm.reason) {
      toast.error('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const currentSalary = Number(promoteStaff.salary) || 0;
      const revisedSalary = currentSalary + (Number(promoForm.salaryIncrement) || 0);

      await api.post('/admin/staff/promote', {
        staffId: promoteStaff.id,
        newDesignation: promoForm.newDesignation,
        newGrade: promoForm.newGrade,
        revisedSalary,
        reason: promoForm.reason,
        remarks: promoForm.remarks,
        effectiveDate: promoForm.effectiveDate,
        actionType: 'promotion'
      });
      toast.success(`${promoteStaff.name} promoted successfully!`);
      setPromoteStaff(null);
      setPromoForm({ newDesignation: '', newGrade: '', effectiveDate: '', salaryIncrement: '', reason: '', remarks: '' });
      fetchStaff();
      fetchPromotions();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to promote staff');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDemotion = async () => {
    if (!demoteStaff) return;
    if (!demoteForm.newDesignation || !demoteForm.effectiveDate || !demoteForm.reason) {
      toast.error('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const currentSalary = Number(demoteStaff.salary) || 0;

      await api.post('/admin/staff/promote', {
        staffId: demoteStaff.id,
        newDesignation: demoteForm.newDesignation,
        newGrade: demoteForm.newGrade,
        revisedSalary: currentSalary,
        reason: demoteForm.reason,
        remarks: demoteForm.remarks,
        effectiveDate: demoteForm.effectiveDate,
        actionType: 'demotion'
      });
      toast.success(`Demotion recorded for ${demoteStaff.name}.`);
      setDemoteStaff(null);
      setDemoteForm({ newDesignation: '', newGrade: '', effectiveDate: '', reason: '', remarks: '' });
      fetchStaff();
      fetchPromotions();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record demotion');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePerformance = async () => {
    if (!perfStaff) return;
    if (!perfForm.performanceRating) {
      toast.error('Performance rating is required.');
      return;
    }
    const rating = parseFloat(perfForm.performanceRating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      toast.error('Rating must be between 1 and 5.');
      return;
    }
    setLoading(true);

    // Determine promotion status based on recommendation / rating
    let status = 'Eligible';
    if (perfForm.recommendation.includes('Promotion')) {
      status = 'Eligible';
    } else if (perfForm.recommendation === 'Hold' || perfForm.recommendation === 'Needs Improvement') {
      status = 'Not Eligible';
    } else {
      status = 'Pending Review';
    }

    try {
      await api.put(`/admin/staff/${perfStaff.id}`, {
        performanceRating: rating,
        attendance: perfForm.attendance,
        discipline: perfForm.discipline,
        achievements: perfForm.achievements,
        training: perfForm.training,
        managerRemarks: perfForm.managerRemarks,
        recommendation: perfForm.recommendation,
        promotionStatus: status
      });
      toast.success(`Performance review saved for ${perfStaff.name}.`);
      setPerfStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save performance review');
    } finally {
      setLoading(false);
    }
  };

  // ── Table configuration ────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'photo', label: 'Photo',
      render: (val) => (
        <img
          src={val || defaultAvatarSvg}
          alt="Staff"
          className="w-8 h-8 rounded-full object-cover border border-[#E7E2DB]"
        />
      )
    },
    {
      key: 'employeeId', label: 'Employee ID',
      render: val => <span className="font-bold text-[#223F74]">{val}</span>
    },
    {
      key: 'staffName', label: 'Staff Name',
      render: val => <span className="font-bold text-gray-800">{val}</span>,
      searchValue: row => `${row.staffName} ${row.employeeId}`
    },
    { key: 'designation', label: 'Current Designation' },
    { key: 'department',  label: 'Department' },
    { key: 'grade',       label: 'Grade' },
    { key: 'joiningDate', label: 'Joining Date' },
    {
      key: 'experience', label: 'Experience',
      render: val => <span className="font-semibold">{val} yr{val !== 1 ? 's' : ''}</span>
    },
    {
      key: 'performanceRating', label: 'Rating',
      render: val => ratingStars(val)
    },
    {
      key: 'promotionStatus', label: 'Eligibility',
      render: val => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${promotionStatusColor(val)}`}>{val}</span>
      )
    },
    {
      key: 'lastPromotion', label: 'Last Promotion',
      render: val => <span className="text-slate-500 text-xs">{val || '—'}</span>
    },
    {
      key: 'status', label: 'Status',
      render: val => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColor(val)}`}>{val}</span>
      )
    }
  ];

  const tableRows = useMemo(() => filtered.map(s => ({
    _original: s,
    id: s.id,
    photo: s.photo,
    employeeId: s.employeeId,
    staffName: s.name,
    designation: s.designation,
    department: s.department,
    grade: s.grade,
    joiningDate: s.joiningDate,
    experience: s.experience,
    performanceRating: s.performanceRating,
    promotionStatus: s.promotionStatus,
    lastPromotion: s.lastPromotionDate,
    status: s.status
  })), [filtered]);

  const tableActions = useMemo(() => [
    {
      icon: <Eye size={16} />,
      tooltip: 'View Details',
      variant: 'ghost',
      onClick: row => setViewStaff(row._original)
    },
    {
      icon: <ArrowUpCircle size={16} />,
      tooltip: 'Promote',
      variant: 'ghost',
      // Only show for Eligible or Pending Review + Active
      show: row => (row.promotionStatus === 'Eligible' || row.promotionStatus === 'Pending Review') && row.status === 'Active',
      onClick: row => {
        const orig = row._original;
        setPromoteStaff(orig);
        setPromoForm({ newDesignation: '', newGrade: orig.grade, effectiveDate: '', salaryIncrement: '', reason: '', remarks: '' });
      }
    },
    {
      icon: <ArrowDownCircle size={16} />,
      tooltip: 'Demote',
      variant: 'ghost',
      // Only show for Active staff (not Inactive/Suspended)
      show: row => row.status === 'Active',
      onClick: row => {
        const orig = row._original;
        setDemoteStaff(orig);
        setDemoteForm({ newDesignation: '', newGrade: orig.grade, effectiveDate: '', reason: '', remarks: '' });
      }
    },
    {
      icon: <Star size={16} />,
      tooltip: 'Update Performance',
      variant: 'ghost',
      onClick: row => {
        const orig = row._original;
        setPerfStaff(orig);
        setPerfForm({
          performanceRating: String(orig.performanceRating),
          attendance: String(orig.attendance),
          discipline: orig.discipline,
          achievements: orig.achievements,
          training: orig.training,
          managerRemarks: orig.managerRemarks,
          recommendation: orig.recommendation
        });
      }
    },
    {
      icon: <History size={16} />,
      tooltip: 'Review History',
      variant: 'ghost',
      show: row => (row._original?.history?.length || 0) > 0,
      onClick: row => setHistStaff(row._original)
    }
  ], []);

  const exportCols = [
    { key: 'employeeId',       label: 'Employee ID' },
    { key: 'staffName',        label: 'Staff Name' },
    { key: 'designation',      label: 'Designation' },
    { key: 'department',       label: 'Department' },
    { key: 'grade',            label: 'Grade' },
    { key: 'joiningDate',      label: 'Joining Date' },
    { key: 'experience',       label: 'Experience (Yrs)' },
    { key: 'performanceRating',label: 'Rating' },
    { key: 'promotionStatus',  label: 'Promotion Status' },
    { key: 'status',           label: 'Employment Status' }
  ];

  // ── Section label style ────────────────────────────────────────────────────
  const sectionLabel = 'text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-8 pb-10 text-left">

      {/* ── 1. Page Heading ─────────────────────────────────────────────────── */}
      <Heading
        primaryText="Staff"
        secondaryText="Promotions & Demotions"
        size={12}
        showAnimations={true}
      />

      {/* ── 2. KPI Cards ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row */}
        <DashGrid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Total Staff"          value={stats.total}    icon={<Users size={22}/>}       accentColor="#3B82F6" size={12}/>
          </div>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Eligible for Promotion" value={stats.eligible} icon={<TrendingUp size={22}/>}  accentColor="#6366F1" size={12}/>
          </div>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Promoted"             value={stats.promoted} icon={<Award size={22}/>}       accentColor="#10B981" size={12}/>
          </div>
        </DashGrid>

        {/* Bottom Row */}
        <DashGrid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Demoted"              value={stats.demoted}  icon={<TrendingDown size={22}/>} accentColor="#F43F5E" size={12}/>
          </div>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Pending Review"       value={stats.pending}  icon={<Clock size={22}/>}       accentColor="#F59E0B" size={12}/>
          </div>
          <div className="col-span-12 md:col-span-4">
            <EnhancedDashCard title="Promotion Requests"   value={stats.requests} icon={<BarChart3 size={22}/>}   accentColor="#8B5CF6" size={12}/>
          </div>
        </DashGrid>
      </div>

      {/* ── 3. Global Filters ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <div className="flex flex-col md:flex-row gap-4 w-full justify-between items-stretch">
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Department</label>
            <Select id="f-dept" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} searchable={false}>
              <Option value="all" label="All Departments"/>
              {departments.map(d => <Option key={d} value={d} label={d}/>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Staff Role</label>
            <Select id="f-role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} searchable={false}>
              <Option value="all" label="All Roles"/>
              <Option value="Teacher" label="Teacher"/>
              <Option value="Accountant" label="Accountant"/>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Review Year</label>
            <Select id="f-year" value={yearFilter} onChange={e => setYearFilter(e.target.value)} searchable={false}>
              <Option value="all"  label="All Years"/>
              {availableYears.map(yr => (
                <Option key={yr} value={String(yr)} label={String(yr)}/>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Emp. Status</label>
            <Select id="f-empstatus" value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)} searchable={false}>
              <Option value="all"       label="All Statuses"/>
              <Option value="Active"    label="Active"/>
              <Option value="Inactive"  label="Inactive"/>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Promo. Status</label>
            <Select id="f-promostatus" value={promoStatusFilter} onChange={e => setPromoStatusFilter(e.target.value)} searchable={false}>
              <Option value="all"           label="All"/>
              <Option value="Eligible"      label="Eligible"/>
              <Option value="Pending Review"label="Pending Review"/>
              <Option value="Promoted"      label="Promoted"/>
              <Option value="Demoted"       label="Demoted"/>
              <Option value="Not Eligible"  label="Not Eligible"/>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 4. Main Staff Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="p-6 pb-2 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#1D1D1F]">Staff Promotion Registry</h2>
        </div>
        <div className="p-6 pt-4 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin"/>
            </div>
          )}
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            actions={tableActions}
            searchable={true}
            searchPlaceholder="Search staff by name or ID…"
            pageSize={10}
            exportable={true}
            exportFileName="Staff_Promotions_Demotions"
            exportColumns={exportCols}
          />
        </div>
      </div>

      {/* ── 5. Analytics ──────────────────────────────────────────────────── */}
      <DashGrid cols={12} gap={4}>
        <GLineChart
          title="Promotion Trend"
          subtitle="Annual promotions vs demotions"
          data={promotionTrendData}
          lines={[
            { key: 'promotions', color: '#10B981', label: 'Promotions' },
            { key: 'demotions',  color: '#F43F5E', label: 'Demotions'  }
          ]}
          size={6}
          height={260}
        />
        <GColumnChart
          title="Promotions vs Demotions"
          subtitle="By year"
          data={promotionTrendData}
          bars={[
            { key: 'promotions', color: '#6366F1', label: 'Promotions' },
            { key: 'demotions',  color: '#F59E0B', label: 'Demotions'  }
          ]}
          size={6}
          height={260}
        />
        {deptPromotionData.length > 0 ? (
          <GDoughnutChart
            title="Promotions by Department"
            subtitle="All time"
            data={deptPromotionData}
            colors={['#3B82F6','#10B981','#F59E0B','#8B5CF6','#F43F5E']}
            size={4}
            height={280}
          />
        ) : (
          <div className="col-span-12 md:col-span-4 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 flex flex-col justify-center items-center h-[340px]">
            <h3 className="text-base font-black text-[#1D1D1F] mb-4 w-full text-left">Promotions by Department</h3>
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
              <BarChart3 size={32} className="mb-2 text-slate-300"/>
              <p className="font-bold text-sm">No promotion data available</p>
            </div>
          </div>
        )}

        {/* Highest Rated Staff */}
        <div className="col-span-12 md:col-span-4 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 h-[340px] flex flex-col">
          <h3 className="text-base font-black text-[#1D1D1F] mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-400 fill-amber-400"/> Highest Rated Staff
          </h3>
          {topRatedStaff.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-auto">
              {topRatedStaff.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-black text-slate-400">{i + 1}.</span>
                  <img src={s.photo || defaultAvatarSvg} alt={s.name} className="w-8 h-8 rounded-full object-cover"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{s.designation}</p>
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 shrink-0">
                    <Star size={11} className="fill-amber-400 text-amber-400"/> {s.performanceRating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
              <Users size={32} className="mb-2 text-slate-300"/>
              <p className="font-bold text-sm">No staff records available</p>
            </div>
          )}
        </div>

        {/* Recently Promoted Staff */}
        <div className="col-span-12 md:col-span-4 bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6 h-[340px] flex flex-col">
          <h3 className="text-base font-black text-[#1D1D1F] mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500"/> Recently Promoted
          </h3>
          {recentlyPromoted.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-auto">
              {recentlyPromoted.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <img src={s.photo || defaultAvatarSvg} alt={s.name} className="w-8 h-8 rounded-full object-cover"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{s.designation}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 whitespace-nowrap">
                    {s.lastPromotionDate || '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
              <Award size={32} className="mb-2 text-slate-300"/>
              <p className="font-bold text-sm">No recently promoted staff</p>
            </div>
          )}
        </div>
      </DashGrid>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── View Details ───────────────────────────────────────────────────── */}
      <PanelModal
        id="pd-view"
        title="Staff Details"
        size="md"
        isVisible={!!viewStaff}
        onClose={() => setViewStaff(null)}
      >
        {viewStaff && (
          <div className="space-y-6 pb-6">
            {/* Profile banner */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <img src={viewStaff.photo || defaultAvatarSvg} alt={viewStaff.name} className="w-16 h-16 rounded-xl object-cover"/>
              <div>
                <h4 className="font-black text-[#223F74] text-lg">{viewStaff.name}</h4>
                <p className="text-xs font-semibold text-slate-500">{viewStaff.designation} · {viewStaff.department}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${promotionStatusColor(viewStaff.promotionStatus)}`}>
                  {viewStaff.promotionStatus}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Employment Information</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text" label="Employee ID"      size={6} value={viewStaff.employeeId}     readOnly/>
                <DataField type="text" label="Staff Name"       size={6} value={viewStaff.name}           readOnly/>
                <DataField type="text" label="Department"       size={6} value={viewStaff.department}     readOnly/>
                <DataField type="text" label="Designation"      size={6} value={viewStaff.designation}    readOnly/>
                <DataField type="text" label="Grade"            size={6} value={viewStaff.grade}          readOnly/>
                <DataField type="text" label="Employment Type"  size={6} value={viewStaff.employmentType} readOnly/>
                <DataField type="text" label="Joining Date"     size={6} value={viewStaff.joiningDate}    readOnly/>
                <DataField type="text" label="Experience"       size={6} value={`${viewStaff.experience} year(s)`} readOnly/>
              </Grid>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Contact Details</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text" label="Email" size={6} value={viewStaff.email} readOnly/>
                <DataField type="text" label="Phone" size={6} value={viewStaff.phone} readOnly/>
              </Grid>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Performance & Promotion</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text" label="Current Salary"        size={6} value={viewStaff.currentSalary}                                   readOnly/>
                <DataField type="text" label="Performance Rating"    size={6} value={`${viewStaff.performanceRating} / 5`}                       readOnly/>
                <DataField type="text" label="Attendance %"          size={6} value={`${viewStaff.attendance}%`}                                 readOnly/>
                <DataField type="text" label="Promotion Status"      size={6} value={viewStaff.promotionStatus}                                  readOnly/>
                <DataField type="text" label="Last Promotion Date"   size={6} value={viewStaff.lastPromotionDate || 'No promotion yet'}          readOnly/>
                <DataField type="text" label="Recommendation"        size={6} value={viewStaff.recommendation}                                   readOnly/>
              </Grid>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button text="Close" variant="secondary" onClick={() => setViewStaff(null)}/>
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── Promotion Modal ────────────────────────────────────────────────── */}
      <PanelModal
        id="pd-promote"
        title="Confirm Promotion"
        size="md"
        isVisible={!!promoteStaff}
        onClose={() => setPromoteStaff(null)}
      >
        {promoteStaff && (
          <div className="space-y-6 pb-6">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
              <ArrowUpCircle size={20} className="text-emerald-600 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-emerald-800">Promoting: {promoteStaff.name}</p>
                <p className="text-xs text-emerald-600">{promoteStaff.designation} → New Role</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Current Information (Read Only)</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text" label="Current Designation" size={6} value={promoteStaff.designation} readOnly/>
                <DataField type="text" label="Current Grade"       size={6} value={promoteStaff.grade}       readOnly/>
              </Grid>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Promotion Details</h5>
              <Grid cols={12} gap={4}>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Designation *</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                    value={promoForm.newDesignation}
                    onChange={e => setPromoForm(p => ({...p, newDesignation: e.target.value}))}
                  >
                    <option value="">Select designation…</option>
                    {DESIGNATIONS
                      .filter(d => d !== promoteStaff.designation)
                      .filter(d => {
                        const r = promoteStaff.role?.toLowerCase();
                        if (r === 'teacher') {
                          return d.includes('Teacher') || d.includes('Department');
                        } else if (r === 'accountant') {
                          return d.includes('Accountant') || d.includes('Finance');
                        }
                        return true;
                      })
                      .map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Grade</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                    value={promoForm.newGrade}
                    onChange={e => setPromoForm(p => ({...p, newGrade: e.target.value}))}
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <DataField type="date"   label="Effective Date *"    size={6}  value={promoForm.effectiveDate}    onChange={e => setPromoForm(p => ({...p, effectiveDate: e.target.value}))}/>
                <DataField type="text"   label="Salary Increment (₹)"size={6}  value={promoForm.salaryIncrement}  onChange={e => setPromoForm(p => ({...p, salaryIncrement: e.target.value}))}/>
                <DataField type="text"   label="Promotion Reason *"  size={12} value={promoForm.reason}           onChange={e => setPromoForm(p => ({...p, reason: e.target.value}))}/>
                <DataField type="textarea" label="Remarks"           size={12} rows={2} value={promoForm.remarks} onChange={e => setPromoForm(p => ({...p, remarks: e.target.value}))}/>
              </Grid>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button text="Cancel"           variant="secondary" onClick={() => setPromoteStaff(null)}/>
              <Button text="Confirm Promotion" icon={<ArrowUpCircle size={16}/>} variant="primary" onClick={handleConfirmPromotion}/>
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── Demotion Modal ─────────────────────────────────────────────────── */}
      <PanelModal
        id="pd-demote"
        title="Record Demotion"
        size="md"
        isVisible={!!demoteStaff}
        onClose={() => setDemoteStaff(null)}
      >
        {demoteStaff && (
          <div className="space-y-6 pb-6">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-600 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-rose-800">Demoting: {demoteStaff.name}</p>
                <p className="text-xs text-rose-600">This action will be recorded in the staff history.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Current Information</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text" label="Current Designation" size={6} value={demoteStaff.designation} readOnly/>
                <DataField type="text" label="Current Grade"       size={6} value={demoteStaff.grade}       readOnly/>
              </Grid>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Demotion Details</h5>
              <Grid cols={12} gap={4}>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Designation *</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                    value={demoteForm.newDesignation}
                    onChange={e => setDemoteForm(p => ({...p, newDesignation: e.target.value}))}
                  >
                    <option value="">Select designation…</option>
                    {DESIGNATIONS
                      .filter(d => d !== demoteStaff.designation)
                      .filter(d => {
                        const r = demoteStaff.role?.toLowerCase();
                        if (r === 'teacher') {
                          return d.includes('Teacher') || d.includes('Department');
                        } else if (r === 'accountant') {
                          return d.includes('Accountant') || d.includes('Finance');
                        }
                        return true;
                      })
                      .map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Grade</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                    value={demoteForm.newGrade}
                    onChange={e => setDemoteForm(p => ({...p, newGrade: e.target.value}))}
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <DataField type="date"     label="Effective Date *"  size={6}  value={demoteForm.effectiveDate} onChange={e => setDemoteForm(p => ({...p, effectiveDate: e.target.value}))}/>
                <DataField type="text"     label="Demotion Reason *" size={12} value={demoteForm.reason}        onChange={e => setDemoteForm(p => ({...p, reason: e.target.value}))}/>
                <DataField type="textarea" label="Remarks"           size={12} rows={2} value={demoteForm.remarks} onChange={e => setDemoteForm(p => ({...p, remarks: e.target.value}))}/>
              </Grid>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button text="Cancel"          variant="secondary" onClick={() => setDemoteStaff(null)}/>
              <Button text="Confirm Demotion" icon={<ArrowDownCircle size={16}/>} variant="danger" onClick={handleConfirmDemotion}/>
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── Performance Review Modal ───────────────────────────────────────── */}
      <PanelModal
        id="pd-perf"
        title="Update Performance Review"
        size="md"
        isVisible={!!perfStaff}
        onClose={() => setPerfStaff(null)}
      >
        {perfStaff && (
          <div className="space-y-6 pb-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
              <UserCheck size={18} className="text-blue-600 shrink-0"/>
              <p className="text-xs text-blue-700 font-semibold">
                Performance review for: <span className="font-black">{perfStaff.name}</span> — {perfStaff.designation}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h5 className={sectionLabel}>Performance Metrics</h5>
              <Grid cols={12} gap={4}>
                <DataField type="text"     label="Performance Rating (1–5) *" size={6}  value={perfForm.performanceRating} onChange={e => setPerfForm(p => ({...p, performanceRating: e.target.value}))}/>
                <DataField type="text"     label="Attendance (%)"              size={6}  value={perfForm.attendance}        onChange={e => setPerfForm(p => ({...p, attendance: e.target.value}))}/>
                <DataField type="text"     label="Discipline"                  size={6}  value={perfForm.discipline}        onChange={e => setPerfForm(p => ({...p, discipline: e.target.value}))}/>
                <DataField type="text"     label="Training Completed"          size={6}  value={perfForm.training}          onChange={e => setPerfForm(p => ({...p, training: e.target.value}))}/>
                <DataField type="textarea" label="Achievements"                size={12} rows={2} value={perfForm.achievements}   onChange={e => setPerfForm(p => ({...p, achievements: e.target.value}))}/>
                <DataField type="textarea" label="Manager Remarks"             size={12} rows={2} value={perfForm.managerRemarks} onChange={e => setPerfForm(p => ({...p, managerRemarks: e.target.value}))}/>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommendation</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                    value={perfForm.recommendation}
                    onChange={e => setPerfForm(p => ({...p, recommendation: e.target.value}))}
                  >
                    <option value="">Select…</option>
                    <option value="Strongly Recommended for Promotion">Strongly Recommended for Promotion</option>
                    <option value="Recommended for Promotion">Recommended for Promotion</option>
                    <option value="Recommended">Recommended</option>
                    <option value="Hold">Hold</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
              </Grid>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button text="Cancel"      variant="secondary" onClick={() => setPerfStaff(null)}/>
              <Button text="Save Review" icon={<Star size={16}/>} variant="primary" onClick={handleSavePerformance}/>
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── Promotion History Modal ────────────────────────────────────────── */}
      <PanelModal
        id="pd-history"
        title="Promotion History"
        size="lg"
        isVisible={!!histStaff}
        onClose={() => setHistStaff(null)}
      >
        {histStaff && (
          <div className="space-y-4 pb-6">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <History size={18} className="text-slate-400"/>
              <div>
                <p className="text-xs font-bold text-slate-700">{histStaff.name}</p>
                <p className="text-[10px] text-slate-500">{histStaff.designation} · {histStaff.department}</p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin mx-auto" />
              </div>
            ) : historyList.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'12%'}}>Date</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'20%'}}>Previous Designation</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'20%'}}>New Designation</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'13%'}}>Salary Change</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'15%'}}>Approved By</th>
                      <th className="py-2 px-3 border-b border-slate-200" style={{width:'20%'}}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-3 text-[11px] font-semibold text-slate-600">
                          {h.effectiveDate ? new Date(h.effectiveDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 truncate" title={h.previousDesignation}>{h.previousDesignation || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.actionType === 'demotion' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {h.newDesignation}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs font-bold text-slate-700">
                          {h.revisedSalary && h.previousSalary ? `₹${(h.revisedSalary - h.previousSalary).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 truncate" title="Admin">Admin</td>
                        <td className="py-3 px-3 text-[11px] text-slate-500 truncate" title={h.reason}>{h.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">
                <History size={32} className="mx-auto mb-2 text-slate-300"/>
                <p className="font-bold text-sm">No promotion history found</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button text="Close" variant="secondary" onClick={() => setHistStaff(null)}/>
            </div>
          </div>
        )}
      </PanelModal>

    </div>
  );
};

export default AdminStaffPromotionsDemotions;
