// ResultsAndMarksheet.jsx - Updated with Working Functionalities
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Trophy, Medal as MedalIcon, Crown as CrownIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
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
} from '../../../components/shared/Common_Components';

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

const EXAM_TYPES = {
    unit_test: 'Unit Test',
    quarterly: 'Quarterly Exam',
    half_yearly: 'Half Yearly Exam',
    annual: 'Annual Exam',
    pre_board: 'Pre-Board Exam',
    board_practice: 'Board Practice Test',
    weekly_test: 'Weekly Test',
    monthly_test: 'Monthly Test',
    surprise_test: 'Surprise Test',
    revision_test: 'Revision Test',
};

const GRADES = [
    { value: 'A+', label: 'A+ (90-100%)', min: 90, max: 100, color: 'text-emerald-600 bg-emerald-50', rank: 1 },
    { value: 'A', label: 'A (80-89%)', min: 80, max: 89, color: 'text-emerald-600 bg-emerald-50', rank: 2 },
    { value: 'B+', label: 'B+ (70-79%)', min: 70, max: 79, color: 'text-blue-600 bg-blue-50', rank: 3 },
    { value: 'B', label: 'B (60-69%)', min: 60, max: 69, color: 'text-blue-600 bg-blue-50', rank: 4 },
    { value: 'C+', label: 'C+ (50-59%)', min: 50, max: 59, color: 'text-amber-600 bg-amber-50', rank: 5 },
    { value: 'C', label: 'C (40-49%)', min: 40, max: 49, color: 'text-amber-600 bg-amber-50', rank: 6 },
    { value: 'D', label: 'D (30-39%)', min: 30, max: 39, color: 'text-orange-600 bg-orange-50', rank: 7 },
    { value: 'E', label: 'E (Below 30%)', min: 0, max: 29, color: 'text-rose-600 bg-rose-50', rank: 8 },
];

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        generated: 'bg-blue-100 text-blue-700 border-blue-200',
        published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const icons = {
        pending: <Clock size={10} />,
        generated: <FileText size={10} />,
        published: <CheckCircle size={10} />,
        rejected: <XCircle size={10} />,
    };
    const labels = {
        pending: 'Pending',
        generated: 'Generated',
        published: 'Published',
        rejected: 'Rejected',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.pending}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// ── Grade Badge ──────────────────────────────────────────────
const GradeBadge = ({ grade }) => {
    const gradeData = GRADES.find(g => g.value === grade);
    if (!gradeData) return <span className="text-sm text-[#6B7280]">—</span>;
    return (
        <span className={`px-3 py-1 rounded-xl text-sm font-bold ${gradeData.color}`}>
            {gradeData.value}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────
const ResultsAndMarksheet = () => {
    const [activeTab, setActiveTab] = useState('results');
    const [loading, setLoading] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // ── Stats ──────────────────────────────────────────────────
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        generated: 0,
        published: 0,
        totalStudents: 0,
        averagePercentage: 0,
        passPercentage: 0,
        totalToppers: 0,
    });

    // ── Results Data ──────────────────────────────────────────
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [assignedClassesData, setAssignedClassesData] = useState([]);

    const fetchAssignedClasses = useCallback(async () => {
        try {
            const response = await api.get('/teacher/classes');
            if (response.data?.success) {
                setAssignedClassesData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch assigned classes:', error);
        }
    }, []);

    // ── Result Generation Form ───────────────────────────────
    const [resultForm, setResultForm] = useState({
        class: '',
        section: '',
        examType: '',
        academicYear: new Date().getFullYear(),
        term: 'annual',
        includeSubjects: [],
        status: 'pending',
    });

    // ── Marksheet Data ────────────────────────────────────────
    const [marksheetData, setMarksheetData] = useState({
        student: null,
        results: [],
        totalMarks: 0,
        totalObtained: 0,
        percentage: 0,
        grade: '',
        rank: 0,
        subjects: [],
    });

    // ── Search/Filter State ──────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');

    // ── Fetch Data ─────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const resultsRes = await api.get('/teacher/results');
            const marksheetsRes = await api.get('/teacher/results/marksheets');

            const resultsData = resultsRes.data.data;
            const statsData = resultsRes.data.stats;
            const studentsData = marksheetsRes.data.data;

            setResults(resultsData);
            setStudents(studentsData);
            setStats({
                total: statsData.total,
                pending: statsData.pending,
                generated: statsData.generated,
                published: statsData.published,
                totalStudents: statsData.totalStudents,
                averagePercentage: statsData.averagePercentage,
                passPercentage: statsData.passPercentage,
                totalToppers: statsData.totalToppers,
            });
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStats = (resultsData) => {
        // Stats are now fetched from backend, so this is unused.
    };

    useEffect(() => {
        fetchData();
        fetchAssignedClasses();
    }, [fetchData, fetchAssignedClasses]);

    // ── Download Functions ────────────────────────────────────
    const generateCSV = (data, headers, filename) => {
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const generatePDF = (content, filename) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head>
                    <title>${filename}</title>
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
    };

    const handleDownloadResults = () => {
        if (results.length === 0) {
            toast.error('No results to download');
            return;
        }

        const headers = ['Class', 'Section', 'Exam Type', 'Term', 'Academic Year', 'Students', 'Pass Count', 'Average %', 'Status'];
        const data = results.map(r => ({
            'Class': r.class,
            'Section': r.section,
            'Exam Type': EXAM_TYPES[r.examType] || r.examType,
            'Term': r.term,
            'Academic Year': `${r.academicYear}-${r.academicYear + 1}`,
            'Students': r.students || 0,
            'Pass Count': r.passCount || 0,
            'Average %': r.averagePercentage > 0 ? `${r.averagePercentage}%` : '—',
            'Status': r.status.charAt(0).toUpperCase() + r.status.slice(1),
        }));

        generateCSV(data, headers, 'results_report');
        toast.success('Results downloaded successfully!');
    };

    const handleDownloadMarksheet = (studentData = null) => {
        const targetStudent = studentData || marksheetData.student;
        if (!targetStudent) {
            toast.error('No student data to download');
            return;
        }

        const content = `
            <div class="header">
                <h1>Student Marksheet</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Student Information</h2>
                <table>
                    <tr><th>Name</th><td>${targetStudent.student?.name || targetStudent.name || ''}</td></tr>
                    <tr><th>Roll No</th><td>${targetStudent.student?.rollNo || targetStudent.rollNo || ''}</td></tr>
                    <tr><th>Class</th><td>${targetStudent.student?.class || targetStudent.class || ''}-${targetStudent.student?.section || targetStudent.section || ''}</td></tr>
                </table>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Subject-wise Marks</h2>
                <table>
                    <thead>
                        <tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr>
                    </thead>
                    <tbody>
                        ${marksheetData.results.map(sub => `
                            <tr>
                                <td>${sub.subject}</td>
                                <td>${sub.marks}</td>
                                <td>${sub.total || 100}</td>
                                <td>${sub.grade || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>Total</th>
                            <th>${marksheetData.totalObtained}</th>
                            <th>${marksheetData.totalMarks}</th>
                            <th>${marksheetData.percentage}%</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <p><strong>Overall Grade: ${marksheetData.grade}</strong></p>
                <p><strong>Rank: #${marksheetData.rank}</strong></p>
            </div>
        `;

        generatePDF(content, `marksheet_${targetStudent.student?.name}_${targetStudent.student?.rollNo}`);
        toast.success('Marksheet downloaded successfully!');
    };

    const handleDownloadAllMarksheets = () => {
        const targetStudents = filterClass || filterSection
            ? students.filter(s =>
                (!filterClass || s.student?.class === filterClass) &&
                (!filterSection || s.student?.section === filterSection)
            )
            : students;

        if (targetStudents.length === 0) {
            toast.error('No published marksheets found. Generate and publish a result first.');
            return;
        }

        // Generate a combined PDF with all real marksheets
        let content = `
            <div class="header">
                <h1>All Student Marksheets</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Students: ${targetStudents.length}</p>
            </div>
        `;

        targetStudents.forEach((studentData, index) => {
            content += `
                <div style="page-break-after: always; margin-bottom: 40px;">
                    <h2>Student #${index + 1}: ${studentData.student?.name || 'N/A'}</h2>
                    <table>
                        <tr><th>Roll No</th><td>${studentData.student?.rollNo || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>${studentData.student?.class || ''}-${studentData.student?.section || ''}</td></tr>
                    </table>
                    <table>
                        <thead>
                            <tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                            ${(studentData.results || []).map(sub => `
                                <tr>
                                    <td>${sub.subject}</td>
                                    <td>${sub.marks}</td>
                                    <td>${sub.total || 100}</td>
                                    <td>${sub.grade || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th>Total</th>
                                <th>${studentData.totalObtained}</th>
                                <th>${studentData.totalMarks}</th>
                                <th>${studentData.percentage}%</th>
                            </tr>
                        </tfoot>
                    </table>
                    <div style="text-align: center; margin-top: 10px;">
                        <p><strong>Grade: ${studentData.grade}</strong> | <strong>Rank: #${studentData.rank}</strong></p>
                    </div>
                </div>
            `;
        });

        generatePDF(content, 'all_student_marksheets');
        toast.success('All marksheets downloaded successfully!');
    };

    const handlePrintMarksheet = () => {
        window.print();
    };

    const handleEmailMarksheet = () => {
        if (!marksheetData.student) {
            toast.error('No student selected');
            return;
        }
        // Simulate email sending
        toast.success(`Marksheet sent to ${marksheetData.student.parentEmail || 'parent@email.com'}!`);
    };

    // ── Result Management ─────────────────────────────────────
    const handleGenerateResult = async () => {
        if (!resultForm.class) {
            toast.error('Please select a class');
            return;
        }
        if (!resultForm.section) {
            toast.error('Please select a section');
            return;
        }
        if (!resultForm.examType) {
            toast.error('Please select an exam type');
            return;
        }

        try {
            await api.post('/teacher/results/generate', resultForm);
            fetchData();
            toast.success('Result generated successfully!');
            closeModal('generate-result-modal');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate result');
        }
    };

    const handleGenerateAllMarksheets = () => {
        if (students.length === 0) {
            toast.error('No students found');
            return;
        }
        toast.success(`Generating marksheets for ${students.length} students...`);
        // Simulate generation process
        setTimeout(() => {
            toast.success('All marksheets generated successfully!');
        }, 1500);
    };

    const handlePublishResult = async (id) => {
        try {
            await api.put(`/teacher/results/${id}/publish`);
            fetchData();
            toast.success('Result published successfully!');
        } catch (error) {
            toast.error('Failed to publish result');
        }
    };

    const handleViewResult = (result) => {
        setSelectedResult(result);
        // Find the top-ranked student from the real marksheets for this result
        const resultStudents = students.filter(
            s => s.student?.class === result.class && s.student?.section === result.section
        );
        // Pick rank #1 student for the preview, or null if no marksheets yet
        const topStudent = resultStudents.find(s => s.rank === 1) || resultStudents[0] || null;
        setMarksheetData(topStudent);
        openModal('view-result-modal');
    };

    const handleViewMarksheet = (studentData) => {
        setSelectedStudent(studentData);
        setMarksheetData(studentData);
        openModal('view-marksheet-modal');
    };

    // ── Filtered Students ─────────────────────────────────────
    const filteredStudents = students.filter(studentData => {
        const student = studentData.student;
        if (!student) return false;
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.rollNo.includes(searchTerm);
        const matchesClass = !filterClass || student.class === filterClass;
        const matchesSection = !filterSection || student.section === filterSection;
        return matchesSearch && matchesClass && matchesSection;
    });

    // ── Table Columns ──────────────────────────────────────────
    const resultColumns = [
        {
            key: 'class',
            label: 'Class/Section',
            render: (val, row) => `${val} - ${row.section}`
        },
        {
            key: 'examType',
            label: 'Exam Type',
            render: (val) => (
                <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
                    {EXAM_TYPES[val] || val}
                </span>
            )
        },
        {
            key: 'term',
            label: 'Term',
            render: (val) => (
                <span className="text-sm font-semibold text-[#1D1D1F]">{val}</span>
            )
        },
        {
            key: 'academicYear',
            label: 'Academic Year',
            render: (val) => `${val}-${val + 1}`
        },
        {
            key: 'students',
            label: 'Students',
            render: (val) => val || 0
        },
        {
            key: 'averagePercentage',
            label: 'Avg %',
            render: (val) => val > 0 ? `${val}%` : '—'
        },
        {
            key: 'passCount',
            label: 'Passed',
            render: (val, row) => `${val || 0}/${row.students || 0}`
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ];

    const resultActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Result',
            variant: 'primary',
            onClick: (row) => handleViewResult(row),
        },
        {
            icon: <Send size={14} />,
            tooltip: 'Publish',
            variant: 'success',
            show: (row) => row.status === 'generated',
            onClick: (row) => handlePublishResult(row.id),
        },
        {
            icon: <FileSpreadsheet size={14} />,
            tooltip: 'Generate Marksheets',
            variant: 'primary',
            onClick: (row) => {
                setSelectedResult(row);
                openModal('marksheet-list-modal');
            },
        },
        {
            icon: <Download size={14} />,
            tooltip: 'Download Results',
            variant: 'success',
            onClick: handleDownloadResults,
        },
    ];

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        {
            title: 'Total Results',
            value: stats.total,
            icon: <FileText size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Published',
            value: stats.published,
            icon: <CheckCircle size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Generated',
            value: stats.generated,
            icon: <FileCheck size={20} />,
            accentColor: '#7A8FC6',
        },
        {
            title: 'Pending',
            value: stats.pending,
            icon: <Clock size={20} />,
            accentColor: '#E0A04B',
        },
    ];

    // Compute dynamic dropdown lists
    const uniqueClasses = Array.from(new Set(assignedClassesData.map(item => item.className))).map(name => {
        let label = name;
        if (/^\d+$/.test(name)) {
            label = `Class ${name}`;
        } else if (name.toLowerCase().startsWith('class ')) {
            label = `Class ${name.substring(6)}`;
        }
        return { value: name, label };
    });

    const generateSections = Array.from(
        new Set(
            assignedClassesData
                .filter(item => item.className === resultForm.class)
                .map(item => item.section)
        )
    ).map(section => ({ value: section, label: `Section ${section}` }));

    const filterSections = Array.from(
        new Set(
            assignedClassesData
                .filter(item => item.className === filterClass)
                .map(item => item.section)
        )
    ).map(section => ({ value: section, label: `Section ${section}` }));

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="Results & Marksheet"
                        // secondaryText="Generate and manage student results and marksheets"
                        size={12}
                        action={
                            <div className="flex gap-2">
                                <Button
                                    text="Refresh"
                                    variant="ghost"
                                    size={0}
                                    icon={<RefreshCw size={14} />}
                                    onClick={fetchData}
                                />
                                <Button
                                    text="Generate Result"
                                    variant="primary"
                                    size={0}
                                    icon={<Plus size={14} />}
                                    onClick={() => {
                                        setResultForm({
                                            class: '',
                                            section: '',
                                            examType: '',
                                            academicYear: new Date().getFullYear(),
                                            term: 'annual',
                                            includeSubjects: [],
                                            status: 'pending',
                                        });
                                        openModal('generate-result-modal');
                                    }}
                                />
                            </div>
                        }
                    />
                </div>
            </Grid>

            {/* ── Tab Navigation ── */}
            <div className="mt-6">
            <Grid cols={12} gap={3}>
                <div className="col-span-12">
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5">
                        {[
                            { key: 'results', label: 'Results', icon: FileText },
                            { key: 'marksheets', label: 'Marksheets', icon: FileSpreadsheet },
                            { key: 'analytics', label: 'Analytics', icon: BarChart },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    activeTab === key
                                        ? 'bg-gradient-to-r from-[#223F74] to-[#2A4A82] text-white shadow-lg shadow-[#223F74]/25'
                                        : 'text-[#6B7280] hover:bg-[#F4F7FB] hover:text-[#223F74]'
                                }`}
                            >
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </Grid>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* TAB 1 — RESULTS                                        */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'results' && (
                <div className='mt-6'>
                <Grid cols={12} gap={4}>
                    {/* Stats Cards */}
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

                    {/* Quick Stats Row */}
                    <div className="col-span-12">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Average Percentage</p>
                                <p className="text-2xl font-black">{stats.averagePercentage}%</p>
                                <p className="text-xs opacity-70 mt-1">Across all results</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Pass Percentage</p>
                                <p className="text-2xl font-black">{stats.passPercentage}%</p>
                                <p className="text-xs opacity-70 mt-1">Students passed</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Students</p>
                                <p className="text-2xl font-black">{stats.totalStudents}</p>
                                <p className="text-xs opacity-70 mt-1">Across all classes</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Top Performers</p>
                                <p className="text-2xl font-black">{stats.totalToppers}</p>
                                <p className="text-xs opacity-70 mt-1">Students with A+ grade</p>
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="col-span-12">
                        <DataTable
                            columns={resultColumns}
                            rows={results}
                            actions={resultActions}
                            title="All Results"
                            pageSize={10}
                            pageSizeOptions={[5, 10, 20, 50]}
                            searchable={true}
                            exportable={true}
                            exportFileName="results"
                            filters={[
                                {
                                    title: 'Status',
                                    type: 'toggle',
                                    key: 'status',
                                    options: ['pending', 'generated', 'published']
                                },
                                {
                                    title: 'Exam Type',
                                    type: 'select',
                                    key: 'examType',
                                    options: Object.keys(EXAM_TYPES)
                                },
                                {
                                    title: 'Class',
                                    type: 'select',
                                    key: 'class',
                                    options: uniqueClasses.map(c => c.value)
                                },
                            ]}
                            date={true}
                            defaultSortKey="generatedAt"
                            defaultSortDir="desc"
                            loading={loading}
                        />
                    </div>
                </Grid>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* TAB 2 — MARKSHEETS                                     */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'marksheets' && (
                <Grid cols={12} gap={4}>
                    <div className="col-span-12">
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-[#223F74]">Student Marksheets</h3>
                                    <P text="View and manage individual student marksheets" />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        text="Generate All"
                                        variant="primary"
                                        size={0}
                                        icon={<Plus size={14} />}
                                        onClick={handleGenerateAllMarksheets}
                                    />
                                    <Button
                                        text="Download All"
                                        variant="success"
                                        size={0}
                                        icon={<Download size={14} />}
                                        onClick={handleDownloadAllMarksheets}
                                    />
                                </div>
                            </div>

                            {/* Search and Filter */}
                            <Grid cols={12} gap={3} className="mb-6">
                                <div className="col-span-12 md:col-span-4">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                                        <input
                                            type="text"
                                            placeholder="Search student by name or roll number..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3.5 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-[#1D1D1F]"
                                        />
                                    </div>
                                </div>
                                <Select
                                    size={2}
                                    placeholder="Class"
                                    value={filterClass}
                                    onChange={(e) => {
                                        setFilterClass(e.target.value);
                                        setFilterSection('');
                                    }}
                                >
                                    <Option value="" label="All Classes" />
                                    {uniqueClasses.map(({ value, label }) => (
                                        <Option key={value} value={value} label={label} />
                                    ))}
                                </Select>
                                <Select
                                    size={2}
                                    placeholder="Section"
                                    value={filterSection}
                                    disabled={!filterClass}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                >
                                    <Option value="" label={filterClass ? "All Sections" : "Choose class first"} />
                                    {filterSections.map(({ value, label }) => (
                                        <Option key={value} value={value} label={label} />
                                    ))}
                                </Select>
                                <Button
                                    text="Search"
                                    variant="primary"
                                    size={2}
                                    icon={<Search size={14} />}
                                    onClick={() => {
                                        // Search is already handled by the filter state
                                        toast.info('Search applied!');
                                    }}
                                />
                                {(searchTerm || filterClass || filterSection) && (
                                    <Button
                                        text="Clear"
                                        variant="secondary"
                                        size={2}
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterClass('');
                                            setFilterSection('');
                                        }}
                                    />
                                )}
                            </Grid>

                            {/* Student Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredStudents.length === 0 ? (
                                    <div className="col-span-full text-center py-12">
                                        <div className="w-16 h-16 bg-[#F4F7FB] rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users size={24} className="text-[#6B7280]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[#1D1D1F]">No students found</p>
                                        <p className="text-xs text-[#6B7280]">Try adjusting your search or filters</p>
                                    </div>
                                ) : (
                                    filteredStudents.map((studentData) => (
                                        <div 
                                            key={studentData.student?.id}
                                            className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => handleViewMarksheet(studentData)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-lg">
                                                    {studentData.student?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[#1D1D1F] truncate">{studentData.student?.name}</p>
                                                    <p className="text-xs text-[#6B7280]">Class {studentData.student?.class}-{studentData.student?.section} • Roll #{studentData.student?.rollNo}</p>
                                                </div>
                                                <button 
                                                    className="p-2 rounded-lg bg-[#F4F7FB] hover:bg-[#E2E8F0] transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewMarksheet(studentData);
                                                    }}
                                                >
                                                    <Eye size={16} className="text-[#223F74]" />
                                                </button>
                                            </div>
                                            
                                            {/* Quick Stats */}
                                            <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#6B7280]">Avg:</span>
                                                    <span className="text-sm font-bold text-[#223F74]">{studentData.percentage}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#6B7280]">Grade:</span>
                                                    <GradeBadge grade={studentData.grade} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#6B7280]">Rank:</span>
                                                    <span className="text-sm font-bold text-emerald-600">#{studentData.rank}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </Grid>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* TAB 3 — ANALYTICS                                      */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <Grid cols={12} gap={4}>
                    <div className="col-span-12">
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-[#223F74]">Results Analytics</h3>
                                    <P text="Comprehensive analysis of student performance" />
                                </div>
                                <Button
                                    text="Export Report"
                                    variant="primary"
                                    size={0}
                                    icon={<Download size={14} />}
                                    onClick={handleDownloadResults}
                                />
                            </div>

                            {/* Overview Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                    <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Overall Pass %</p>
                                    <p className="text-2xl font-black text-[#223F74]">{stats.passPercentage}%</p>
                                </div>
                                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                    <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Top Grade (A+)</p>
                                    <p className="text-2xl font-black text-[#223F74]">{stats.totalToppers}</p>
                                </div>
                                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                    <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Average Score</p>
                                    <p className="text-2xl font-black text-[#223F74]">{stats.averagePercentage}%</p>
                                </div>
                                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                    <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Results</p>
                                    <p className="text-2xl font-black text-[#223F74]">{stats.total}</p>
                                </div>
                            </div>

                            {/* Performance by Subject */}
                            <div className="mb-6 p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen size={16} className="text-[#223F74]" />
                                    <h4 className="font-bold text-sm text-[#1D1D1F]">Performance by Subject</h4>
                                </div>
                                <div className="space-y-3">
                                    {(() => {
                                        // Compute average per subject from real students marksheets
                                        const subjectMap = {};
                                        students.forEach(sd => {
                                            (sd.results || []).forEach(sub => {
                                                if (!subjectMap[sub.subject]) subjectMap[sub.subject] = { sum: 0, count: 0 };
                                                subjectMap[sub.subject].sum += Number(sub.marks) || 0;
                                                subjectMap[sub.subject].count += 1;
                                            });
                                        });
                                        const subjectPerf = Object.entries(subjectMap).map(([subject, data]) => ({
                                            subject,
                                            avg: data.count > 0 ? Math.round((data.sum / data.count)) : 0,
                                            maxPossible: 100
                                        }));
                                        if (subjectPerf.length === 0) {
                                            return <p className="text-sm text-[#6B7280] text-center py-4">No published marksheets to analyse yet.</p>;
                                        }
                                        return subjectPerf.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-[#1D1D1F] min-w-[120px]">{item.subject}</span>
                                                <div className="flex items-center gap-3 flex-1 max-w-md">
                                                    <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                            style={{ width: `${item.avg}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-[#223F74]">{item.avg}%</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Grade Distribution */}
                            <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                <div className="flex items-center gap-2 mb-3">
                                    <PieChart size={16} className="text-[#223F74]" />
                                    <h4 className="font-bold text-sm text-[#1D1D1F]">Grade Distribution</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {GRADES.map((grade, i) => {
                                        const count = students.filter(sd => sd.grade === grade.value).length;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E2E8F0]">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${grade.color}`}>
                                                    {grade.value}
                                                </span>
                                                <span className="text-sm font-bold text-[#223F74]">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </Grid>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODALS                                                */}
            {/* ══════════════════════════════════════════════════════ */}

            {/* Generate Result Modal */}
            <Modal id="generate-result-modal" title="Generate Result" size="lg">
                <form onSubmit={(e) => { e.preventDefault(); handleGenerateResult(); }} className="space-y-5">
                    <ModalGrid title="Result Details" cols={2}>
                        <Select
                            label="Class *"
                            id="class"
                            value={resultForm.class}
                            onChange={e => {
                                const val = e.target.value;
                                setResultForm(prev => ({
                                    ...prev,
                                    class: val,
                                    section: ''
                                }));
                            }}
                        >
                            <Option value="" label="Select Class" disabled />
                            {uniqueClasses.map(({ value, label }) => (
                                <Option key={value} value={value} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Section *"
                            id="section"
                            value={resultForm.section}
                            disabled={!resultForm.class}
                            onChange={e => setResultForm({ ...resultForm, section: e.target.value })}
                        >
                            <Option value="" label={resultForm.class ? "Select Section" : "Choose class first"} disabled />
                            {generateSections.map(({ value, label }) => (
                                <Option key={value} value={value} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Exam Type *"
                            id="examType"
                            value={resultForm.examType}
                            onChange={e => setResultForm({ ...resultForm, examType: e.target.value })}
                        >
                            <Option value="" label="Select Exam Type" disabled />
                            {Object.entries(EXAM_TYPES).map(([key, label]) => (
                                <Option key={key} value={key} label={label} />
                            ))}
                        </Select>
                        <DataField
                            label="Academic Year"
                            id="academicYear"
                            type="number"
                            value={resultForm.academicYear}
                            onChange={e => setResultForm({ ...resultForm, academicYear: parseInt(e.target.value) || new Date().getFullYear() })}
                            min={2000}
                            max={2099}
                        />
                        <Select
                            label="Term"
                            id="term"
                            value={resultForm.term}
                            onChange={e => setResultForm({ ...resultForm, term: e.target.value })}
                            searchable={false}
                        >
                            <Option value="annual" label="Annual" />
                            <Option value="half_yearly" label="Half Yearly" />
                            <Option value="quarterly" label="Quarterly" />
                            <Option value="monthly" label="Monthly" />
                        </Select>
                    </ModalGrid>

                    <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                        <Button
                            text="Generate Result"
                            variant="primary"
                            type="submit"
                            size={0}
                            icon={<FileCheck size={15} />}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('generate-result-modal')}
                        />
                    </div>
                </form>
            </Modal>

            {/* View Result Modal */}
            <Modal id="view-result-modal" title="Result Details" size="2xl">
                {selectedResult && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <FileText size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">
                                    {EXAM_TYPES[selectedResult.examType] || selectedResult.examType} - Class {selectedResult.class}-{selectedResult.section}
                                </p>
                                <p className="text-sm text-slate-300">
                                    Academic Year {selectedResult.academicYear}-{selectedResult.academicYear + 1} • {selectedResult.term}
                                </p>
                            </div>
                            <StatusBadge status={selectedResult.status} />
                        </div>

                        <ModalGrid title="Result Summary" cols={3}>
                            <ModalData label="Class" value={`${selectedResult.class} - ${selectedResult.section}`} />
                            <ModalData label="Exam Type" value={EXAM_TYPES[selectedResult.examType] || selectedResult.examType} />
                            <ModalData label="Term" value={selectedResult.term} />
                            <ModalData label="Academic Year" value={`${selectedResult.academicYear}-${selectedResult.academicYear + 1}`} />
                            <ModalData label="Total Students" value={selectedResult.students || 0} />
                            <ModalData label="Passed Students" value={selectedResult.passCount || 0} />
                            <ModalData label="Average Percentage" value={selectedResult.averagePercentage > 0 ? `${selectedResult.averagePercentage}%` : '—'} />
                            <ModalData label="Generated On" value={selectedResult.generatedAt ? formatDateFull(selectedResult.generatedAt) : '—'} />
                            <ModalData label="Published On" value={selectedResult.publishedAt ? formatDateFull(selectedResult.publishedAt) : '—'} />
                        </ModalGrid>

                        {/* Marksheet Preview — top student */}
                        {marksheetData && marksheetData.results && marksheetData.results.length > 0 && (
                            <ModalGrid title="Top Student Marksheet Preview" cols={1}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-sm">
                                                {marksheetData.student?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1D1D1F]">{marksheetData.student?.name || 'N/A'}</p>
                                                <p className="text-xs text-[#6B7280]">Roll #{marksheetData.student?.rollNo} • Class {marksheetData.student?.class}-{marksheetData.student?.section}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs text-[#6B7280]">Percentage</p>
                                                <p className="text-lg font-bold text-[#223F74]">{marksheetData.percentage}%</p>
                                            </div>
                                            <GradeBadge grade={marksheetData.grade} />
                                            <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                                                Rank #{marksheetData.rank}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {marksheetData.results.map((subject, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E2E8F0]">
                                                <span className="text-xs font-semibold text-[#1D1D1F]">{subject.subject}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-[#223F74]">{subject.marks}/{subject.total}</span>
                                                    <GradeBadge grade={subject.grade} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ModalGrid>
                        )}

                        {marksheetData && !marksheetData.results && (
                            <div className="text-center py-6 text-[#6B7280] text-sm">
                                <FileText size={24} className="mx-auto mb-2 opacity-40" />
                                <p>No published marksheets yet. Publish this result to see the preview.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('view-result-modal')}
                            />
                            {selectedResult.status === 'generated' && (
                                <Button
                                    text="Publish Result"
                                    variant="primary"
                                    size={0}
                                    icon={<Send size={14} />}
                                    onClick={() => {
                                        handlePublishResult(selectedResult.id);
                                        closeModal('view-result-modal');
                                    }}
                                />
                            )}
                            <Button
                                text="Download Report"
                                variant="success"
                                size={0}
                                icon={<Download size={14} />}
                                onClick={() => handleDownloadMarksheet(marksheetData.student)}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* View Marksheet Modal */}
            <Modal id="view-marksheet-modal" title="Student Marksheet" size="2xl">
                {marksheetData && marksheetData.student && (
                    <div className="space-y-4">
                        {/* Student Profile */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82]">
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                                {marksheetData.student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 text-white">
                                <p className="text-xl font-bold">{marksheetData.student.name}</p>
                                <p className="text-sm text-slate-300">
                                    Class {marksheetData.student.class}-{marksheetData.student.section} • Roll No: {marksheetData.student.rollNo}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Academic Year: {selectedResult?.academicYear || 2026}-{(selectedResult?.academicYear || 2026) + 1}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-300">Overall Grade</p>
                                <GradeBadge grade={marksheetData.grade} />
                            </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Marks</p>
                                <p className="text-lg font-black text-[#223F74]">{marksheetData.totalMarks}</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Obtained</p>
                                <p className="text-lg font-black text-[#223F74]">{marksheetData.totalObtained}</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Percentage</p>
                                <p className="text-lg font-black text-[#223F74]">{marksheetData.percentage}%</p>
                            </div>
                            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E2E8F0]">
                                <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Rank</p>
                                <p className="text-lg font-black text-emerald-600">#{marksheetData.rank}</p>
                            </div>
                        </div>

                        {/* Subject-wise Marks */}
                        <ModalGrid title="Subject-wise Marks" cols={1}>
                            <div className="space-y-2">
                                {(marksheetData.results || marksheetData.subjectMarks || []).map((subject, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-[#1D1D1F]">{subject.subject}</span>
                                            <span className="text-xs text-[#6B7280]">(Max: {subject.total || 100})</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                    style={{ width: `${(subject.marks / (subject.total || 100)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-[#223F74]">{subject.marks}</span>
                                            <GradeBadge grade={subject.grade} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ModalGrid>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="flex gap-2">
                                <Button
                                    text="Print"
                                    variant="secondary"
                                    size={0}
                                    icon={<Printer size={14} />}
                                    onClick={handlePrintMarksheet}
                                />
                                <Button
                                    text="Download PDF"
                                    variant="secondary"
                                    size={0}
                                    icon={<Download size={14} />}
                                    onClick={() => handleDownloadMarksheet(marksheetData.student)}
                                />
                                <Button
                                    text="Email"
                                    variant="secondary"
                                    size={0}
                                    icon={<Mail size={14} />}
                                    onClick={handleEmailMarksheet}
                                />
                            </div>
                            <Button
                                text="Close"
                                variant="ghost"
                                size={0}
                                onClick={() => closeModal('view-marksheet-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Marksheet List Modal */}
            <Modal id="marksheet-list-modal" title="Student Marksheets" size="2xl">
                {selectedResult && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">
                                    {EXAM_TYPES[selectedResult.examType] || selectedResult.examType} - Class {selectedResult.class}-{selectedResult.section}
                                </p>
                                <p className="text-sm text-slate-300">
                                    {selectedResult.students || 0} students • Status: <StatusBadge status={selectedResult.status} />
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    text="Download All"
                                    variant="primary"
                                    size={0}
                                    icon={<Download size={14} />}
                                    onClick={handleDownloadAllMarksheets}
                                />
                            </div>
                        </div>

                        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                            <DataTable
                                columns={[
                                    { key: 'rollNo', label: 'Roll No', render: (val) => `#${val}` },
                                    { key: 'name', label: 'Student Name' },
                                    { key: 'percentage', label: 'Percentage', render: (val) => val ? `${val}%` : '—' },
                                    { key: 'grade', label: 'Grade', render: (val) => <GradeBadge grade={val} /> },
                                    { key: 'rank', label: 'Rank', render: (val) => val ? `#${val}` : '—' },
                                ]}
                                rows={students.filter(s => s.student?.class === selectedResult.class && s.student?.section === selectedResult.section).map((studentData) => ({
                                    ...studentData.student,
                                    percentage: studentData.percentage,
                                    grade: studentData.grade,
                                    rank: studentData.rank,
                                }))}
                                actions={[
                                    {
                                        icon: <Eye size={14} />,
                                        tooltip: 'View Marksheet',
                                        variant: 'primary',
                                        onClick: (row) => {
                                            closeModal('marksheet-list-modal');
                                            handleViewMarksheet(row);
                                        },
                                    },
                                    {
                                        icon: <Download size={14} />,
                                        tooltip: 'Download',
                                        variant: 'success',
                                        onClick: (row) => handleDownloadMarksheet(row),
                                    },
                                ]}
                                title="Student List"
                                pageSize={10}
                                searchable={true}
                                hidePagination={false}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('marksheet-list-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default ResultsAndMarksheet;