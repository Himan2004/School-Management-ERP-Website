// ClassStudentData.jsx - Updated with working functionalities and table filters
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../../services/api';
import {
    Plus, Edit, Trash2, Eye, Copy, Calendar, Clock, 
    Users, BookOpen, CheckCircle, XCircle, AlertCircle,
    RefreshCw, FileText, Download, Search, Filter,
    ChevronDown, ChevronUp, Settings, BarChart,
    PlayCircle, PauseCircle, Send, HelpCircle,
    Upload, Link, Hash, List, Grid3x3, Menu,
    Zap, Award, Target, Sparkles, Crown, Star,
    TrendingUp, TrendingDown, PieChart, Activity,
    Award as AwardIcon, Medal, Star as StarIcon,
    User, GraduationCap, Clipboard, PenTool,
    Save, Printer, Mail, ExternalLink, Maximize2,
    Minimize2, Check, X, AlertTriangle, UserPlus,
    UserCheck as UserCheckIcon, UserX as UserXIcon,
    ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
    FileCheck, FileSpreadsheet, FileBarChart, FileOutput,
    Trophy, Medal as MedalIcon, Crown as CrownIcon,
    Phone, Mail as MailIcon, MapPin, Briefcase, CalendarDays,
    Activity as ActivityIcon, Award as AwardTrophy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
    ModalData,
    ModalGrid,
    ModalProfile,
    ToggleButton,
    GColumnChart,
    GDoughnutChart,
    GLineChart,
    GBarChart,
} from '../../../components/shared/Common_Components';

import { getTeacherStudentsApi, getTeacherStudentByIdApi } from '../../../services/api/teacherApi';

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

// ── Constants ─────────────────────────────────────────────────
const CLASSES = [
    { value: 'Nursery', label: 'Nursery' },
    { value: 'LKG', label: 'LKG' },
    { value: 'UKG', label: 'UKG' },
    { value: '1', label: 'Class 1' },
    { value: '2', label: 'Class 2' },
    { value: '3', label: 'Class 3' },
    { value: '4', label: 'Class 4' },
    { value: '5', label: 'Class 5' },
    { value: '6', label: 'Class 6' },
    { value: '7', label: 'Class 7' },
    { value: '8', label: 'Class 8' },
    { value: '9', label: 'Class 9' },
    { value: '10', label: 'Class 10' },
    { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' },
];

const SECTIONS = [
    { value: 'A', label: 'Section A' },
    { value: 'B', label: 'Section B' },
    { value: 'C', label: 'Section C' },
    { value: 'D', label: 'Section D' },
    { value: 'E', label: 'Section E' },
];

const SUBJECTS = [
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'Physics', label: 'Physics' },
    { value: 'Chemistry', label: 'Chemistry' },
    { value: 'Biology', label: 'Biology' },
    { value: 'Science', label: 'Science' },
    { value: 'English', label: 'English' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Sanskrit', label: 'Sanskrit' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'History', label: 'History' },
    { value: 'Geography', label: 'Geography' },
    { value: 'Civics', label: 'Civics' },
    { value: 'Economics', label: 'Economics' },
    { value: 'Business Studies', label: 'Business Studies' },
    { value: 'Accountancy', label: 'Accountancy' },
    { value: 'Physical Education', label: 'Physical Education' },
    { value: 'Art', label: 'Art' },
    { value: 'Music', label: 'Music' },
    { value: 'Moral Science', label: 'Moral Science' },
    { value: 'General Knowledge', label: 'General Knowledge' },
];

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        inactive: 'bg-rose-100 text-rose-700 border-rose-200',
        suspended: 'bg-amber-100 text-amber-700 border-amber-200',
        graduated: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const icons = {
        active: <CheckCircle size={10} />,
        inactive: <XCircle size={10} />,
        suspended: <AlertCircle size={10} />,
        graduated: <AwardIcon size={10} />,
    };
    const labels = {
        active: 'Active',
        inactive: 'Inactive',
        suspended: 'Suspended',
        graduated: 'Graduated',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.active}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// ── Grade Badge ──────────────────────────────────────────────
const GradeBadge = ({ grade }) => {
    const gradeColors = {
        'A+': 'text-emerald-600 bg-emerald-50',
        'A': 'text-emerald-600 bg-emerald-50',
        'B+': 'text-blue-600 bg-blue-50',
        'B': 'text-blue-600 bg-blue-50',
        'C+': 'text-amber-600 bg-amber-50',
        'C': 'text-amber-600 bg-amber-50',
        'D': 'text-orange-600 bg-orange-50',
        'E': 'text-rose-600 bg-rose-50',
        '—': 'bg-slate-100 text-slate-600',
    };
    return (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${gradeColors[grade] || gradeColors['—']}`}>
            {grade || '—'}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────
const ClassStudentData = () => {
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // ── Stats ──────────────────────────────────────────────────
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        totalClasses: 0,
        totalSections: 0,
        averageAttendance: 0,
        averagePerformance: 0,
        topPerformers: 0,
        pendingTasks: 0,
    });

    // ── Data ──────────────────────────────────────────────────
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    // ── Student View Data ─────────────────────────────────────
    const [studentViewData, setStudentViewData] = useState({
        profile: null,
        attendance: {},
        performance: {},
        subjects: [],
        recentActivity: [],
        homework: {},
    });

    // ── Message Modal State ───────────────────────────────────
    const [selectedStudentForMessage, setSelectedStudentForMessage] = useState(null);
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const authUser = useSelector((state) => state.teacherAuth?.teacher || state.auth?.user);

    // ── Fetch Data ─────────────────────────────────────────────
    // ── Mapper function for DB Student ──
    const mapDbStudentToFrontend = (s) => {
        return {
            id: s.id || s._id,
            userId: s.userId || "",
            parentUserId: s.parentUserId || "",
            name: s.name,
            rollNo: s.rollNo || 'N/A',
            class: s.class,
            section: s.section,
            email: s.email,
            phone: s.phone || '',
            address: s.address || '',
            status: s.status || 'active',
            admissionDate: s.admissionDate || '',
            parentName: s.parentName || 'Parent',
            parentPhone: s.parentPhone || s.parentContact || '',
            parentEmail: s.parentEmail || '',
            photoUrl: s.photo || null,
            attendance: s.attendance || 0,
            performance: s.performanceScore || 0,
            grade: s.performance || 'N/A',
        };
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getTeacherStudentsApi();
            const rawStudents = response?.data?.students || response?.students || [];
            const mappedStudents = rawStudents.map(mapDbStudentToFrontend);
            
            const classNames = [...new Set(mappedStudents.map(s => s.class))];
            const mappedClasses = classNames.map((name, i) => ({
                id: i + 1,
                name: name,
            }));

            setStudents(mappedStudents);
            setClasses(mappedClasses);
            updateStats(mappedStudents);
        } catch (error) {
            toast.error('Failed to fetch students data');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStats = (studentsData) => {
        const total = studentsData.length;
        const active = studentsData.filter(s => s.status === 'active').length;
        const uniqueClasses = [...new Set(studentsData.map(s => s.class))];
        const uniqueSections = [...new Set(studentsData.map(s => `${s.class}-${s.section}`))];
        
        let totalAttendance = 0;
        let totalPerformance = 0;
        let topPerformers = 0;

        studentsData.forEach(s => {
            totalAttendance += (s.attendance || 0);
            totalPerformance += (s.performance || 0);
            if (s.grade === 'A+' || s.grade === 'A') {
                topPerformers++;
            }
        });

        const avgAttendance = total > 0 ? Math.round(totalAttendance / total) : 0;
        const avgPerformance = total > 0 ? Math.round(totalPerformance / total) : 0;

        setStats({
            totalStudents: total,
            activeStudents: active,
            totalClasses: uniqueClasses.length,
            totalSections: uniqueSections.length,
            averageAttendance: avgAttendance,
            averagePerformance: avgPerformance,
            topPerformers: topPerformers,
            pendingTasks: Math.floor(Math.random() * 10) + 1,
        });
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Student View Functions ───────────────────────────────
    const handleViewStudent = async (student) => {
        setSelectedStudent(student);
        try {
            toast.loading("Fetching details...", { id: "view-student" });
            const res = await getTeacherStudentByIdApi(student.id);
            const data = res?.data || {};

            const viewData = {
                profile: student,
                attendance: data.attendance || {},
                performance: data.performance || { overallPercentage: 0, latestGrade: '—', subjectWise: [] },
                subjects: data.subjects || [],
                recentActivity: data.notifications?.slice(0, 5) || [],
                homework: data.homework || {},
            };
            setStudentViewData(viewData);
            toast.dismiss("view-student");
            openModal('view-student-modal');
        } catch (error) {
            toast.error(error.message || "Failed to fetch student details", { id: "view-student" });
        }
    };

    // ── Working Action Functions ──────────────────────────────
    const handleViewReport = (student) => {
        const reportDate = new Date().toLocaleString();
        
        const content = `
            <div class="header">
                <h1>Student Performance Report</h1>
                <p>Generated on: ${reportDate}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Student Information</h2>
                <table>
                    <tr><th>Name</th><td>${student.name}</td></tr>
                    <tr><th>Roll No</th><td>${student.rollNo}</td></tr>
                    <tr><th>Class</th><td>${student.class}-${student.section}</td></tr>
                    <tr><th>Status</th><td>${student.status}</td></tr>
                </table>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Performance Summary</h2>
                <table>
                    <tr><th>Average Score</th><td>${student.performance || 0}%</td></tr>
                    <tr><th>Grade</th><td>${student.grade || '—'}</td></tr>
                    <tr><th>Attendance</th><td>${student.attendance || 0}%</td></tr>
                </table>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>This is a system-generated report. For any queries, please contact the school administration.</p>
            </div>
        `;

        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head>
                    <title>Report - ${student.name}</title>
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
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        win.document.close();
        setTimeout(() => {
            win.print();
        }, 500);
        
        toast.success(`Report generated for ${student.name}`);
    };

    const handleSendMessage = (student) => {

        setSelectedStudentForMessage(student);
        setMessageSubject(`Performance Update: ${student.name}`);
        
        const avgScore = performanceData[student.id]?.averageScore || 0;
        const letterGrade = performanceData[student.id]?.grade || '—';
        const attendance = attendanceData[student.id] || [];
        const present = attendance.filter(a => a.status === 'present').length;
        const percentage = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

        const bodyText = `Dear Parent/Guardian,\n\nThis is to update you regarding ${student.name}'s academic progress.\n\nCurrent Performance:\n- Average Score: ${avgScore}%\n- Grade: ${letterGrade}\n- Attendance: ${percentage}%\n\nPlease feel free to contact the school for any queries.\n\nRegards,\n${authUser?.name || 'Subject Teacher'}`;
        
        setMessageBody(bodyText);
        openModal('send-message-modal');
    };

    const submitSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageBody.trim()) {
            toast.error('Message content cannot be empty');
            return;
        }

        setSendingMessage(true);
        try {
            let portalMessageSent = false;
            let emailTriggered = false;

            const recipientUserId = selectedStudentForMessage.parentUserId || selectedStudentForMessage.userId;
            if (recipientUserId) {
                await api.post(`/messages/${recipientUserId}`, {
                    text: `${messageSubject}\n\n${messageBody}`
                });
                portalMessageSent = true;
            }

            const recipientEmail = selectedStudentForMessage.parentEmail || selectedStudentForMessage.email;
            if (recipientEmail) {
                const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(messageSubject)}&body=${encodeURIComponent(messageBody)}`;
                window.open(mailtoUrl, '_blank');
                emailTriggered = true;
            }

            if (portalMessageSent && emailTriggered) {
                toast.success('Portal message sent and mail client launched!');
            } else if (portalMessageSent) {
                toast.success('Portal message sent successfully!');
            } else if (emailTriggered) {
                toast.success('Email client launched!');
            } else {
                toast.error('No contact channels available.');
            }

            closeModal('send-message-modal');
            setSelectedStudentForMessage(null);
            setMessageSubject('');
            setMessageBody('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error(error.message || 'Failed to send message on portal.');
        } finally {
            setSendingMessage(false);

        }
    };

    const handleDownloadStudentData = (student) => {
        // Prepare CSV data
        const headers = ['Name', 'Roll No', 'Class', 'Section', 'Email', 'Phone', 'Status', 'Parent Name', 'Parent Phone', 'Parent Email'];
        const data = [{
            'Name': student.name,
            'Roll No': student.rollNo,
            'Class': student.class,
            'Section': student.section,
            'Email': student.email || '',
            'Phone': student.phone || '',
            'Status': student.status,
            'Parent Name': student.parentName || '',
            'Parent Phone': student.parentPhone || '',
            'Parent Email': student.parentEmail || '',
        }];
        
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${student.name}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`Data downloaded for ${student.name}`);
    };

    // ── Table Columns ──────────────────────────────────────────
    const studentColumns = [
        {
            key: 'name',
            label: 'Student',
            searchValue: (row) => `${row.name} ${row.rollNo}`,
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-sm">
                        {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-[#1D1D1F]">{row.name}</p>
                        <p className="text-xs text-[#6B7280]">#{row.rollNo}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'class',
            label: 'Class/Section',
            searchValue: (row) => `${row.class} ${row.section}`,
            render: (val, row) => (
                <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
                    {val} - {row.section}
                </span>
            )
        },
        {
            key: 'attendance',
            label: 'Attendance',
            searchValue: (row) => `${row.attendance}%`,
            render: (val, row) => {
                const percentage = row.attendance || 0;
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold ${percentage >= 75 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {percentage}%
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'performance',
            label: 'Performance',
            searchValue: (row) => `${row.performance}% ${row.grade}`,
            render: (val, row) => {
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#223F74]">{row.performance || 0}%</span>
                        <GradeBadge grade={row.grade || '—'} />
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ];

    const studentActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewStudent(row),
        },
        {
            icon: <FileText size={14} />,
            tooltip: 'View Report',
            variant: 'success',
            onClick: (row) => handleViewReport(row),
        },
        {
            icon: <Download size={14} />,
            tooltip: 'Download Data',
            variant: 'success',
            onClick: (row) => handleDownloadStudentData(row),
        },
    ];

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: <Users size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Active Students',
            value: stats.activeStudents,
            icon: <UserCheckIcon size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Avg Attendance',
            value: `${stats.averageAttendance}%`,
            icon: <CalendarDays size={20} />,
            accentColor: '#7A8FC6',
        },
        {
            title: 'Avg Performance',
            value: `${stats.averagePerformance}%`,
            icon: <AwardTrophy size={20} />,
            accentColor: '#E0A04B',
        },
    ];

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="Class Student Data"
                        // secondaryText="View and manage students assigned to your classes"
                        size={12}
                        action={
                            <div className="flex gap-2">
                            </div>
                        }
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
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Classes</p>
                                <p className="text-2xl font-black">{stats.totalClasses}</p>
                                <p className="text-xs opacity-70 mt-1">Assigned to you</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Sections</p>
                                <p className="text-2xl font-black">{stats.totalSections}</p>
                                <p className="text-xs opacity-70 mt-1">Across all classes</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Top Performers</p>
                                <p className="text-2xl font-black">{stats.topPerformers}</p>
                                <p className="text-xs opacity-70 mt-1">Students with A+ or A</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Pending Tasks</p>
                                <p className="text-2xl font-black">{stats.pendingTasks}</p>
                                <p className="text-xs opacity-70 mt-1">Need your attention</p>
                            </div>
                        </div>
                    </div>
                </Grid>
            </div>

            {/* ── Students Table with Built-in Filters ── */}
            <div className='mt-6'>
                <Grid cols={12} gap={4}>
                    <div className="col-span-12">
                        <DataTable
                            columns={studentColumns}
                            rows={students}
                            actions={studentActions}
                            title={`Students (${students.length})`}
                            pageSize={10}
                            pageSizeOptions={[5, 10, 20, 50]}
                            searchable={true}
                            exportable={true}
                            exportFileName="class_students"
                            loading={loading}
                            filters={[
                                {
                                    title: 'Status',
                                    type: 'toggle',
                                    key: 'status',
                                    options: ['active', 'inactive', 'suspended', 'graduated']
                                },
                                {
                                    title: 'Class',
                                    type: 'select',
                                    key: 'class',
                                    options: CLASSES.map(c => c.value)
                                },
                                {
                                    title: 'Section',
                                    type: 'select',
                                    key: 'section',
                                    options: SECTIONS.map(s => s.value)
                                },
                                {
                                    title: 'Performance Grade',
                                    type: 'select',
                                    key: 'grade',
                                    fn: (row, value) => row.grade === value,
                                    options: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']
                                },
                            ]}
                            date={false}
                            defaultSortKey="name"
                            defaultSortDir="asc"
                            headerAction={
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#9CA3AF]">
                                        {students.filter(s => s.status === 'active').length} Active
                                    </span>
                                    <span className="text-xs font-bold text-[#9CA3AF]">
                                        {students.filter(s => s.status === 'inactive').length} Inactive
                                    </span>
                                    <Button
                                        text="Export All"
                                        variant="ghost"
                                        size={0}
                                        icon={<Download size={14} />}
                                        onClick={() => {
                                            const headers = ['Name', 'Roll No', 'Class', 'Section', 'Email', 'Phone', 'Status'];
                                            const data = students.map(s => ({
                                                'Name': s.name,
                                                'Roll No': s.rollNo,
                                                'Class': s.class,
                                                'Section': s.section,
                                                'Email': s.email || '',
                                                'Phone': s.phone || '',
                                                'Status': s.status,
                                            }));
                                            const csvContent = [
                                                headers.join(','),
                                                ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
                                            ].join('\n');
                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                            const link = document.createElement('a');
                                            const url = URL.createObjectURL(blob);
                                            link.setAttribute('href', url);
                                            link.setAttribute('download', 'all_students_data.csv');
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                            toast.success('All student data exported successfully!');
                                        }}
                                    />
                                </div>
                            }
                        />
                    </div>
                </Grid>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODALS                                                */}
            {/* ══════════════════════════════════════════════════════ */}

            {/* View Student Modal */}
            <Modal id="view-student-modal" title="Student Details" size="2xl">
                {studentViewData.profile && (
                    <div className="space-y-4">
                        {/* Student Profile Header */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82]">
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold">
                                {studentViewData.profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 text-white">
                                <p className="text-2xl font-bold">{studentViewData.profile.name}</p>
                                <p className="text-sm text-slate-300">
                                    Class {studentViewData.profile.class}-{studentViewData.profile.section} • Roll No: {studentViewData.profile.rollNo}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <MailIcon size={12} /> {studentViewData.profile.email}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-300">
                                        <Phone size={12} /> {studentViewData.profile.phone}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <StatusBadge status={studentViewData.profile.status} />
                                <div className="mt-2">
                                    <p className="text-xs text-slate-300">Performance</p>
                                    <p className="text-lg font-bold text-white">
                                        {studentViewData.performance?.overallPercentage || 0}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Attendance</p>
                                <p className="text-lg font-black text-[#223F74]">{studentViewData.attendance?.percentage || 0}%</p>
                                <p className="text-xs text-[#6B7280]">{studentViewData.attendance?.thisMonth?.present || 0} days this month</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Grade</p>
                                <p className="text-lg font-black text-[#223F74]">{studentViewData.performance?.latestGrade || '—'}</p>
                                <p className="text-xs text-[#6B7280]">Overall grade</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Subjects</p>
                                <p className="text-lg font-black text-[#223F74]">{studentViewData.subjects?.length || 0}</p>
                                <p className="text-xs text-[#6B7280]">Enrolled subjects</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Homework</p>
                                <p className="text-lg font-black text-emerald-600">{studentViewData.homework?.submitted || 0}/{studentViewData.homework?.total || 0}</p>
                                <p className="text-xs text-[#6B7280]">Submitted</p>
                            </div>
                        </div>

                        {/* Performance by Subject */}
                        {studentViewData.performance?.subjectWise && studentViewData.performance.subjectWise.length > 0 && (
                            <ModalGrid title="Subject-wise Performance" cols={1}>
                                <div className="space-y-2">
                                    {studentViewData.performance.subjectWise.map((subject, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-[#1D1D1F]">{subject.subject}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden hidden sm:block">
                                                    <div
                                                        className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                        style={{ width: `${subject.score}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-bold text-[#223F74]">{subject.score}%</span>
                                                <GradeBadge grade={subject.grade} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalGrid>
                        )}

                        {/* Recent Activity */}
                        <ModalGrid title="Recent Notifications & Activities" cols={1}>
                            <div className="space-y-2">
                                {studentViewData.recentActivity.length > 0 ? studentViewData.recentActivity.map((activity, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                                <AlertCircle size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1D1D1F]">{activity.title}</p>
                                                <p className="text-xs text-[#6B7280]">{activity.message || formatDate(activity.date)}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50">
                                            {activity.source || "Notice"}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-xs text-[#6B7280]">No recent activities or notifications.</p>
                                )}
                            </div>
                        </ModalGrid>

                        {/* Parent Information */}
                        <ModalGrid title="Parent/Guardian Information" cols={2}>
                            <ModalData label="Parent Name" value={studentViewData.profile.parentName} />
                            <ModalData label="Contact" value={studentViewData.profile.parentPhone} />
                            <ModalData label="Email" value={studentViewData.profile.parentEmail} />
                            <ModalData label="Admission Date" value={formatDateFull(studentViewData.profile.admissionDate)} />
                        </ModalGrid>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="flex gap-2">
                                <Button
                                    text="View Report"
                                    variant="secondary"
                                    size={0}
                                    icon={<FileText size={14} />}
                                    onClick={() => handleViewReport(studentViewData.profile)}
                                />
                                <Button
                                    text="Download Data"
                                    variant="secondary"
                                    size={0}
                                    icon={<Download size={14} />}
                                    onClick={() => handleDownloadStudentData(studentViewData.profile)}
                                />
                            </div>
                            <Button
                                text="Close"
                                variant="ghost"
                                size={0}
                                onClick={() => closeModal('view-student-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Send Message Modal */}
            <Modal id="send-message-modal" title="Send Message to Student/Parent" size="lg">
                {selectedStudentForMessage && (
                    <form onSubmit={submitSendMessage} className="space-y-4">
                        <div className="bg-[#F8F9FA] p-3 rounded-lg border border-[#E2E8F0] space-y-1 text-xs">
                            <p className="font-bold text-[#1D1D1F]">Recipient: {selectedStudentForMessage.name}</p>
                            <p className="text-[#6B7280]">Parent Name: {selectedStudentForMessage.parentName || 'Parent'}</p>
                            <p className="text-[#6B7280]">Email: {selectedStudentForMessage.parentEmail || selectedStudentForMessage.email || 'N/A'}</p>
                            {(!selectedStudentForMessage.parentUserId && !selectedStudentForMessage.userId) && (
                                <p className="text-amber-600 font-medium">⚠️ No portal user account linked. Sending via Email client only.</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                                Subject
                            </label>
                            <input
                                type="text"
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                                required
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                                Message
                            </label>
                            <textarea
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                required
                                rows={6}
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 transition resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                            <Button
                                text="Cancel"
                                variant="ghost"
                                size={0}
                                type="button"
                                onClick={() => closeModal('send-message-modal')}
                            />
                            <Button
                                text={sendingMessage ? 'Sending...' : 'Send Message'}
                                variant="primary"
                                size={0}
                                type="submit"
                                disabled={sendingMessage}
                                icon={<Send size={14} />}
                            />
                        </div>
                    </form>
                )}
            </Modal>

        </div>
    );
};

export default ClassStudentData;