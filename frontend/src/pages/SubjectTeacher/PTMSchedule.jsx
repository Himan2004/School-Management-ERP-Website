// PTMSchedule.jsx - Updated with Working Functionalities and Table Filters
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    Calendar, Clock, Users, BookOpen, CheckCircle, XCircle, AlertCircle, Loader2,
    RefreshCw, FileText, Download, Search,
    Eye, Star, Crown, Award, TrendingUp, TrendingDown,
    BarChart, PieChart, Activity, CalendarDays,
    User, GraduationCap, Target, Zap, Sparkles,
    ChevronDown, ChevronUp, Settings, Grid3x3,
    AlertTriangle, UserCheck, UserX, Mail, Phone,
    MapPin, Building2, Clock as ClockIcon,
    Video, Users as UsersIcon, MessageCircle,
    Bell, BellOff, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, List, LayoutGrid,
    Sun, Moon, Cloud, CloudRain, Thermometer,
    ExternalLink, Share2, Copy, Check,
    UserCircle, Briefcase, Award as AwardIcon,
    Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { getTeacherPtmClassesSectionsApi } from '../../services/api/teacherApi';
import {
    Grid,
    Heading,
    Button,
    DataTable,
    DashCard,
    Modal,
    openModal,
    closeModal,
    PanelModal,
    DataField,
    Label,
    Select,
    Option,
    P,
    ModalProfile,
    ToggleButton,
} from '../../components/shared/Common_Components';

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
});
const formatDateFull = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
});
const formatTime = (time) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};
const isToday = (date) => {
    const today = new Date();
    const d = new Date(date);
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
};
const isUpcoming = (date) => {
    const today = new Date();
    const d = new Date(date);
    return d > today;
};

// ── Constants ─────────────────────────────────────────────────
const PTM_STATUS = {
    scheduled: 'Scheduled',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rescheduled: 'Rescheduled',
};

const PTM_TYPES = {
    parent_teacher: 'Parent-Teacher Meeting',
    open_house: 'Open House',
    annual_day: 'Annual Day',
    sports_day: 'Sports Day',
    orientation: 'Orientation Program',
    workshop: 'Workshop',
    seminar: 'Seminar',
    exhibition: 'Exhibition',
    cultural: 'Cultural Event',
    academic: 'Academic Review',
};


// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
        ongoing: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        completed: 'bg-slate-100 text-slate-700 border-slate-200',
        cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
        rescheduled: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    const icons = {
        scheduled: <CalendarIcon size={10} />,
        ongoing: <Activity size={10} />,
        completed: <CheckCircle size={10} />,
        cancelled: <XCircle size={10} />,
        rescheduled: <ClockIcon size={10} />,
    };
    const labels = {
        scheduled: 'Scheduled',
        ongoing: 'Ongoing',
        completed: 'Completed',
        cancelled: 'Cancelled',
        rescheduled: 'Rescheduled',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.scheduled}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// Global module-level cache for PTM schedule page
let ptmListCache = null;
let statsCache = null;
let cachedUserId = null;
let cachedSchoolId = null;
let cachedOrganizationId = null;
let classesCache = null;
let ptmTypesCache = null;
let viewModeCache = 'list';

// ── Main Component ────────────────────────────────────────────
const PTMSchedule = () => {
    const authUser = useSelector((state) => state.teacherAuth?.teacher || state.auth?.user);
    const userId = authUser?._id || authUser?.id;
    const schoolId = authUser?.school?._id || authUser?.school;
    const orgId = authUser?.school?.organization?._id || authUser?.school?.organization || authUser?.organization;

    // Detect context changes (User, School, Org) to clear cache
    const contextChanged = 
        userId !== cachedUserId ||
        schoolId !== cachedSchoolId ||
        orgId !== cachedOrganizationId;

    if (contextChanged) {
        ptmListCache = null;
        statsCache = null;
        classesCache = null;
        ptmTypesCache = null;
        cachedUserId = userId;
        cachedSchoolId = schoolId;
        cachedOrganizationId = orgId;
    }

    const [loading, setLoading] = useState(!ptmListCache);
    const [error, setError] = useState(null);
    const [selectedPTM, setSelectedPTM] = useState(null);
    const [viewMode, setViewMode] = useState(viewModeCache);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [classFilter, setClassFilter] = useState('All');
    const [sectionFilter, setSectionFilter] = useState('All');

    // Metadata states
    const [classesList, setClassesList] = useState(classesCache || []);

    // Sync viewMode back to cache
    useEffect(() => {
        viewModeCache = viewMode;
    }, [viewMode]);

    // Load classes & sections metadata dynamically
    useEffect(() => {
        const loadClasses = async () => {
            if (classesCache && !contextChanged) {
                setClassesList(classesCache);
                return;
            }
            try {
                const res = await getTeacherPtmClassesSectionsApi();
                if (res.success && res.data) {
                    setClassesList(res.data);
                    classesCache = res.data;
                }
            } catch (err) {
                console.error("Failed to load classes", err);
            }
        };
        loadClasses();
    }, [contextChanged]);

    // Get sections for the selected class
    const availableSections = useMemo(() => {
        if (!classFilter || classFilter === 'All' || classFilter === 'all') return [];
        const selectedClass = classesList.find(c => c.name === classFilter);
        return selectedClass?.sections || [];
    }, [classFilter, classesList]);

    // Reset section filter when class filter changes
    useEffect(() => {
        setSectionFilter('All');
    }, [classFilter]);

    // ── Stats ──────────────────────────────────────────────────
    const [stats, setStats] = useState(statsCache || {
        total: 0,
        scheduled: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        rescheduled: 0,
        upcoming: 0,
        today: 0,
    });

    // ── PTM Data ──────────────────────────────────────────────
    const [ptmList, setPtmList] = useState(ptmListCache || []);

    // ── Fetch Data ─────────────────────────────────────────────
    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            const response = await api.get('/subject-teacher/ptms');
            if (response.data && response.data.success) {
                const list = response.data.data || [];
                setPtmList(list);
                ptmListCache = list;
                updateStats(list);
            } else {
                setError(response.data?.message || 'Failed to fetch PTM schedule');
                if (!isSilent) toast.error(response.data?.message || 'Failed to fetch PTM schedule');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'Failed to fetch PTM schedule';
            setError(errMsg);
            if (!isSilent) toast.error(errMsg);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    const updateStats = (ptmData) => {
        const total = ptmData.length;
        const scheduled = ptmData.filter(p => p.status === 'scheduled').length;
        const ongoing = ptmData.filter(p => p.status === 'ongoing').length;
        const completed = ptmData.filter(p => p.status === 'completed').length;
        const cancelled = ptmData.filter(p => p.status === 'cancelled').length;
        const rescheduled = ptmData.filter(p => p.status === 'rescheduled').length;
        const upcoming = ptmData.filter(p => p.status === 'scheduled' && isUpcoming(p.date)).length;
        const today = ptmData.filter(p => isToday(p.date)).length;

        const newStats = {
            total,
            scheduled,
            ongoing,
            completed,
            cancelled,
            rescheduled,
            upcoming,
            today,
        };
        setStats(newStats);
        statsCache = newStats;
    };

    useEffect(() => {
        if (!ptmListCache || contextChanged) {
            fetchData(false);
        } else {
            fetchData(true);
        }
    }, [fetchData, contextChanged]);

    // ── Working Functions ──────────────────────────────────────
    const handleViewPTM = (ptm) => {
        setSelectedPTM(ptm);
        openModal('view-ptm-modal');
    };

    const handleAddToCalendar = (ptm) => {
        try {
            // Create Google Calendar URL
            const startDateTime = `${ptm.date}T${ptm.startTime}:00`;
            const endDateTime = `${ptm.date}T${ptm.endTime}:00`;
            const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ptm.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(ptm.description)}&location=${encodeURIComponent(ptm.venue)}`;
            
            // Open in new window
            window.open(calendarUrl, '_blank');
            toast.success('Opening calendar to add event...');
        } catch (error) {
            toast.error('Failed to add to calendar');
        }
    };

    const handleDownloadDetails = (ptm) => {
        try {
            const content = `
                <div class="header">
                    <h1>PTM Details</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <h2>Event Information</h2>
                    <table>
                        <tr><th>Title</th><td>${ptm.title}</td></tr>
                        <tr><th>Type</th><td>${PTM_TYPES[ptm.type] || ptm.type}</td></tr>
                        <tr><th>Date</th><td>${formatDateFull(ptm.date)}</td></tr>
                        <tr><th>Time</th><td>${formatTime(ptm.startTime)} - ${formatTime(ptm.endTime)}</td></tr>
                        <tr><th>Venue</th><td>${ptm.venue}</td></tr>
                        <tr><th>Class/Section</th><td>${ptm.class === 'all' ? 'All Classes' : `${ptm.class} - ${ptm.section === 'all' ? 'All Sections' : ptm.section}`}</td></tr>
                        <tr><th>Status</th><td>${PTM_STATUS[ptm.status] || ptm.status}</td></tr>
                        <tr><th>Participants</th><td>${ptm.participants || 0} / ${ptm.maxParticipants || 0}</td></tr>
                        <tr><th>Created By</th><td>${ptm.createdBy}</td></tr>
                    </table>
                </div>
                <div style="margin-bottom: 20px;">
                    <h2>Description</h2>
                    <p>${ptm.description}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <h2>Agenda</h2>
                    <ul>
                        ${ptm.agenda.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                <div style="margin-bottom: 20px;">
                    <h2>Teachers</h2>
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Subject</th><th>Role</th></tr>
                        </thead>
                        <tbody>
                            ${ptm.teachers.map(teacher => `
                                <tr>
                                    <td>${teacher.name}</td>
                                    <td>${teacher.subject}</td>
                                    <td>${teacher.role}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>This is a system-generated document. For any queries, please contact the school administration.</p>
                </div>
            `;

            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                    <head>
                        <title>PTM Details - ${ptm.title}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 24px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                            th { background: #223F74; color: white; }
                            tr:nth-child(even) { background: #f9f9f9; }
                            h2 { color: #223F74; }
                            .header { text-align: center; margin-bottom: 24px; }
                            .header h1 { color: #223F74; margin: 0; }
                            .header p { color: #666; margin: 4px 0; }
                            ul { padding-left: 20px; }
                            li { margin-bottom: 4px; }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() { window.print(); }
                        <\/script>
                    </body>
                </html>
            `);
            win.document.close();
            toast.success('Opening PTM details for download...');
        } catch (error) {
            toast.error('Failed to download details');
        }
    };

    const handlePreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // ── Table Columns ──────────────────────────────────────────
    const ptmColumns = [
        {
            key: 'title',
            label: 'Event',
            render: (val, row) => (
                <div>
                    <p className="font-bold text-[#1D1D1F]">{val}</p>
                    <p className="text-xs text-[#6B7280]">{PTM_TYPES[row.type]}</p>
                </div>
            )
        },
        {
            key: 'date',
            label: 'Date & Time',
            render: (val, row) => (
                <div>
                    <p className="font-semibold text-[#1D1D1F]">{formatDate(val)}</p>
                    <p className="text-xs text-[#6B7280]">{formatTime(row.startTime)} - {formatTime(row.endTime)}</p>
                </div>
            )
        },
        {
            key: 'venue',
            label: 'Venue',
            render: (val) => (
                <span className="text-sm text-[#1D1D1F]">{val}</span>
            )
        },
        {
            key: 'class',
            label: 'Class/Section',
            render: (val, row) => (
                <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
                    {val === 'all' ? 'All Classes' : `${val} - ${row.section === 'all' ? 'All Sections' : row.section}`}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
        {
            key: 'participants',
            label: 'Participants',
            render: (val, row) => (
                <span className="text-sm font-semibold text-[#223F74]">
                    {val || 0} / {row.maxParticipants || 0}
                </span>
            )
        },
    ];

    const ptmActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewPTM(row),
        },
        {
            icon: <CalendarIcon size={14} />,
            tooltip: 'Add to Calendar',
            variant: 'success',
            onClick: (row) => handleAddToCalendar(row),
        },
        {
            icon: <Download size={14} />,
            tooltip: 'Download Details',
            variant: 'primary',
            onClick: (row) => handleDownloadDetails(row),
        },
    ];

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        {
            title: 'Total PTMs',
            value: stats.total,
            icon: <Calendar size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Scheduled',
            value: stats.scheduled,
            icon: <ClockIcon size={20} />,
            accentColor: '#7A8FC6',
        },
        {
            title: 'Today',
            value: stats.today,
            icon: <CalendarDays size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Upcoming',
            value: stats.upcoming,
            icon: <TrendingUp size={20} />,
            accentColor: '#E0A04B',
        },
    ];

    // Filter PTMs based on user selections
    const filteredPtms = useMemo(() => {
        return ptmList.filter(p => {
            const matchSearch = !searchTerm
                || p.title.toLowerCase().includes(searchTerm.toLowerCase())
                || (p.class && p.class.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchStatus = statusFilter === 'All' || statusFilter === 'all'
                || p.status.toLowerCase() === statusFilter.toLowerCase();
            
            const matchClass = classFilter === 'All' || classFilter === 'all'
                || p.class === classFilter;
            
            const matchSection = sectionFilter === 'All' || sectionFilter === 'all'
                || p.section === sectionFilter;

            return matchSearch && matchStatus && matchClass && matchSection;
        });
    }, [ptmList, searchTerm, statusFilter, classFilter, sectionFilter]);

    return (
        <div className="w-full space-y-8 pb-10 text-left font-sans">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="PTM"
                        secondaryText="Schedule"
                        size={12}
                    />
                </div>
            </Grid>

            {/* ── Stats Cards ── */}
            <div className='mt-6'>
                <Grid cols={12} gap={4}>
                    {statCards.map((card, i) => (
                        <DashCard
                            key={i}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            accentColor={card.accentColor}
                            size={3}
                        />
                    ))}
                </Grid>
            </div>

            {/* ── Quick Stats Row ── */}
            <div className='mt-6'>
                <Grid cols={12} gap={4}>
                    <div className="col-span-12">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Completed</p>
                                <p className="text-2xl font-black">{stats.completed}</p>
                                <p className="text-xs opacity-70 mt-1">Past PTMs</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Ongoing</p>
                                <p className="text-2xl font-black">{stats.ongoing}</p>
                                <p className="text-xs opacity-70 mt-1">Currently active</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Rescheduled</p>
                                <p className="text-2xl font-black">{stats.rescheduled || 0}</p>
                                <p className="text-xs opacity-70 mt-1">Changed dates</p>
                            </div>
                            <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Cancelled</p>
                                <p className="text-2xl font-black">{stats.cancelled}</p>
                                <p className="text-xs opacity-70 mt-1">Cancelled events</p>
                            </div>
                        </div>
                    </div>
                </Grid>
            </div>

            {/* ── Dynamic Filters Row ── */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 mt-6">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search title or class..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/10 w-full sm:w-48"
                    />

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none w-full sm:w-40"
                    >
                        <option value="All">All Statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rescheduled">Rescheduled</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none w-full sm:w-44"
                    >
                        <option value="All">All Classes</option>
                        {classesList.map(c => (
                            <option key={c._id || c.id} value={c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    {/* Section Filter */}
                    <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        disabled={classFilter === 'All'}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none disabled:opacity-50 w-full sm:w-40"
                    >
                        <option value="All">All Sections</option>
                        {availableSections.map(s => (
                            <option key={s.id || s._id} value={s.name}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── PTM Content Section ── */}
            {loading && !ptmListCache ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                    <Loader2 className="animate-spin text-[#223F74]" size={36} />
                    <p className="text-sm font-bold text-[#223F74] tracking-widest uppercase animate-pulse">Loading PTMs...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                    <AlertCircle className="text-rose-500" size={36} />
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">Failed to load PTMs</p>
                    <p className="text-xs text-slate-500 font-semibold">{error}</p>
                    <div className="mt-2">
                        <Button text="Retry" variant="primary" icon={<RefreshCw size={14} />} onClick={() => fetchData(false)} />
                    </div>
                </div>
            ) : ptmList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                    <CalendarDays className="text-[#9CA3AF]" size={48} />
                    <p className="text-base font-bold text-[#223F74] uppercase tracking-wider">No PTM Available</p>
                    <p className="text-xs text-slate-500 font-semibold">There are no parent-teacher meetings scheduled at the moment.</p>
                </div>
            ) : filteredPtms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                    <CalendarDays className="text-[#9CA3AF]" size={48} />
                    <p className="text-base font-bold text-[#223F74] uppercase tracking-wider">No Matching PTMs Found</p>
                    <p className="text-xs text-slate-500 font-semibold">No PTMs match your search or filter choices.</p>
                </div>
            ) : (
                <>
                    {/* ── PTM List View with DataTable ── */}
                    {viewMode === 'list' && (
                        <div className='mt-6'>
                            <Grid cols={12} gap={4}>
                                <div className="col-span-12">
                                    <DataTable
                                        columns={ptmColumns}
                                        rows={filteredPtms}
                                        actions={ptmActions}
                                        title={`PTM Schedule (${filteredPtms.length})`}
                                        pageSize={10}
                                        pageSizeOptions={[5, 10, 20, 50]}
                                        searchable={false}
                                        exportable={true}
                                        exportFileName="ptm_schedule"
                                        loading={loading}
                                        date={true}
                                        defaultSortKey="date"
                                        defaultSortDir="asc"
                                        headerAction={
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#9CA3AF]">
                                                    {stats.scheduled} Scheduled • {stats.ongoing} Ongoing • {stats.completed} Completed
                                                </span>
                                            </div>
                                        }
                                    />
                                </div>
                            </Grid>
                        </div>
                    )}

                    {/* ── PTM Grid View ── */}
                    {viewMode === 'grid' && (
                        <div className='mt-6'>
                            <Grid cols={12} gap={4}>
                                {filteredPtms.map((ptm) => (
                                    <div key={ptm.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 hover:shadow-md transition-shadow">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-2 rounded-xl ${
                                                        ptm.type === 'parent_teacher' ? 'bg-blue-50 text-blue-600' :
                                                        ptm.type === 'open_house' ? 'bg-emerald-50 text-emerald-600' :
                                                        ptm.type === 'sports_day' ? 'bg-amber-50 text-amber-600' :
                                                        ptm.type === 'orientation' ? 'bg-purple-50 text-purple-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                        <CalendarIcon size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#1D1D1F] text-sm truncate max-w-[150px]">
                                                            {ptm.title}
                                                        </p>
                                                        <p className="text-xs text-[#6B7280]">{PTM_TYPES[ptm.type]}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={ptm.status} />
                                            </div>

                                            {/* Date & Time */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar size={14} className="text-[#6B7280]" />
                                                <span className="text-sm font-semibold text-[#1D1D1F]">{formatDate(ptm.date)}</span>
                                                <span className="text-xs text-[#6B7280]">•</span>
                                                <ClockIcon size={14} className="text-[#6B7280]" />
                                                <span className="text-sm text-[#1D1D1F]">{formatTime(ptm.startTime)} - {formatTime(ptm.endTime)}</span>
                                            </div>

                                            {/* Venue */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin size={14} className="text-[#6B7280]" />
                                                <span className="text-sm text-[#1D1D1F]">{ptm.venue}</span>
                                            </div>

                                            {/* Class & Section */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <UsersIcon size={14} className="text-[#6B7280]" />
                                                <span className="text-sm text-[#1D1D1F]">
                                                    {ptm.class === 'all' ? 'All Classes' : `Class ${ptm.class}`}
                                                    {ptm.section !== 'all' && ` - Section ${ptm.section}`}
                                                </span>
                                            </div>

                                            {/* Participants */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <User size={14} className="text-[#6B7280]" />
                                                <span className="text-sm text-[#1D1D1F]">
                                                    {ptm.participants || 0} / {ptm.maxParticipants || 0} participants
                                                </span>
                                            </div>

                                            {/* Teachers */}
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {ptm.teachers.slice(0, 3).map((teacher, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-[#F4F7FB] rounded-full text-xs text-[#223F74]">
                                                        {teacher.name}
                                                    </span>
                                                ))}
                                                {ptm.teachers.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-[#F4F7FB] rounded-full text-xs text-[#223F74]">
                                                        +{ptm.teachers.length - 3} more
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                                                <Button
                                                    text="View"
                                                    variant="primary"
                                                    size={0}
                                                    icon={<Eye size={14} />}
                                                    onClick={() => handleViewPTM(ptm)}
                                                />
                                                <Button
                                                    text="Calendar"
                                                    variant="secondary"
                                                    size={0}
                                                    icon={<CalendarIcon size={14} />}
                                                    onClick={() => handleAddToCalendar(ptm)}
                                                />
                                                <Button
                                                    text="Download"
                                                    variant="secondary"
                                                    size={0}
                                                    icon={<Download size={14} />}
                                                    onClick={() => handleDownloadDetails(ptm)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Grid>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODAL - View PTM Details                             */}
            {/* ══════════════════════════════════════════════════════ */}
            <Modal id="view-ptm-modal" title="PTM Details" size="2xl">
                {selectedPTM && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82]">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                                <CalendarIcon size={28} />
                            </div>
                            <div className="flex-1 text-white">
                                <p className="text-xl font-bold">{selectedPTM.title}</p>
                                <p className="text-sm text-slate-300">{PTM_TYPES[selectedPTM.type]}</p>
                                <div className="flex flex-wrap gap-3 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <Calendar size={12} /> {formatDateFull(selectedPTM.date)}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <ClockIcon size={12} /> {formatTime(selectedPTM.startTime)} - {formatTime(selectedPTM.endTime)}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <MapPin size={12} /> {selectedPTM.venue}
                                    </span>
                                </div>
                            </div>
                            <StatusBadge status={selectedPTM.status} />
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Class/Section</p>
                                <p className="text-lg font-black text-[#223F74]">
                                    {selectedPTM.class === 'all' ? 'All Classes' : `${selectedPTM.class}`}
                                    {selectedPTM.section !== 'all' && ` - ${selectedPTM.section}`}
                                </p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Participants</p>
                                <p className="text-lg font-black text-[#223F74]">
                                    {selectedPTM.participants || 0} / {selectedPTM.maxParticipants || 0}
                                </p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Created By</p>
                                <p className="text-lg font-black text-[#223F74]">{selectedPTM.createdBy}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description</p>
                            <div className="p-4 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-sm text-[#1D1D1F] leading-relaxed">
                                {selectedPTM.description}
                            </div>
                        </div>

                        {/* Agenda */}
                        <div>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Agenda</p>
                            <ul className="space-y-2">
                                {selectedPTM.agenda.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                        <span className="w-6 h-6 rounded-full bg-[#223F74]/10 flex items-center justify-center text-[#223F74] font-bold text-xs flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-[#1D1D1F]">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Teachers */}
                        <div>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Teachers</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedPTM.teachers.map((teacher, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-sm">
                                            {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-[#1D1D1F]">{teacher.name}</p>
                                            <p className="text-xs text-[#6B7280]">{teacher.subject} • {teacher.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Additional Information</p>
                            <div className="grid grid-cols-2 gap-4 p-4 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl">
                                <div>
                                    <p className="text-xs text-[#6B7280] font-medium">Created By</p>
                                    <p className="text-sm font-semibold text-[#1D1D1F] mt-0.5">{selectedPTM.createdBy}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#6B7280] font-medium">Created At</p>
                                    <p className="text-sm font-semibold text-[#1D1D1F] mt-0.5">{formatDateFull(selectedPTM.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#6B7280] font-medium">Last Updated</p>
                                    <p className="text-sm font-semibold text-[#1D1D1F] mt-0.5">{formatDateFull(selectedPTM.updatedAt)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#6B7280] font-medium">Event Type</p>
                                    <p className="text-sm font-semibold text-[#1D1D1F] mt-0.5">{PTM_TYPES[selectedPTM.type]}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="flex gap-2">
                                <Button
                                    text="Add to Calendar"
                                    variant="secondary"
                                    size={0}
                                    icon={<CalendarIcon size={14} />}
                                    onClick={() => handleAddToCalendar(selectedPTM)}
                                />
                                <Button
                                    text="Download Details"
                                    variant="secondary"
                                    size={0}
                                    icon={<Download size={14} />}
                                    onClick={() => handleDownloadDetails(selectedPTM)}
                                />
                            </div>
                            <Button
                                text="Close"
                                variant="ghost"
                                size={0}
                                onClick={() => closeModal('view-ptm-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default PTMSchedule;