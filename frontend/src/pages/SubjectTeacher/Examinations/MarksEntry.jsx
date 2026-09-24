// MarksEntry.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
    ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight
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
} from '../../../components/shared/Common_Components';

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
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
    { value: 'A+', label: 'A+ (90-100%)', min: 90, max: 100, color: 'text-emerald-600 bg-emerald-50' },
    { value: 'A', label: 'A (80-89%)', min: 80, max: 89, color: 'text-emerald-600 bg-emerald-50' },
    { value: 'B+', label: 'B+ (70-79%)', min: 70, max: 79, color: 'text-blue-600 bg-blue-50' },
    { value: 'B', label: 'B (60-69%)', min: 60, max: 69, color: 'text-blue-600 bg-blue-50' },
    { value: 'C+', label: 'C+ (50-59%)', min: 50, max: 59, color: 'text-amber-600 bg-amber-50' },
    { value: 'C', label: 'C (40-49%)', min: 40, max: 49, color: 'text-amber-600 bg-amber-50' },
    { value: 'D', label: 'D (30-39%)', min: 30, max: 39, color: 'text-orange-600 bg-orange-50' },
    { value: 'E', label: 'E (Below 30%)', min: 0, max: 29, color: 'text-rose-600 bg-rose-50' },
];

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        submitted: 'bg-blue-100 text-blue-700 border-blue-200',
        verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        rejected: 'bg-rose-100 text-rose-700 border-rose-200',
        draft: 'bg-slate-100 text-slate-700 border-slate-200',
        completed: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const icons = {
        pending: <Clock size={10} />,
        submitted: <FileText size={10} />,
        verified: <CheckCircle size={10} />,
        published: <CheckCircle size={10} />,
        rejected: <XCircle size={10} />,
        draft: <FileText size={10} />,
        completed: <CheckCircle size={10} />,
    };
    const labels = {
        pending: 'Pending',
        submitted: 'Submitted',
        verified: 'Verified',
        published: 'Published',
        rejected: 'Rejected',
        draft: 'Draft',
        completed: 'Completed',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.pending}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// ── Individual Student Marks Card ─────────────────────────────
const StudentMarksCard = ({ student, marks, onMarksChange, totalMarks, passingMarks, index, total }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localMarks, setLocalMarks] = useState(marks || '');

    const getGrade = (val) => {
        if (!val || val === '') return '';
        const percentage = (Number(val) / totalMarks) * 100;
        for (const grade of GRADES) {
            if (percentage >= grade.min && percentage <= grade.max) {
                return grade;
            }
        }
        return null;
    };

    const handleMarksChange = (e) => {
        const val = e.target.value;
        setLocalMarks(val);
        const grade = getGrade(val);
        onMarksChange(student.id, val, grade?.value || '');
    };

    const grade = getGrade(localMarks);
    const isPass = localMarks && Number(localMarks) >= passingMarks;

    return (
        <div className={`p-4 rounded-xl border transition-all duration-200 ${localMarks ? 'bg-white border-[#223F74]/20 shadow-sm' : 'bg-[#F8F9FA] border-[#E2E8F0]'
            }`}>
            <div className="flex items-center gap-3">
                {/* Student Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1D1D1F] text-sm truncate">{student.name}</p>
                        <span className="text-xs text-[#6B7280] font-semibold">#{student.rollNo}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate">Class {student.class}-{student.section}</p>
                </div>

                {/* Marks Input */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="number"
                            value={localMarks}
                            onChange={handleMarksChange}
                            onFocus={() => setIsEditing(true)}
                            onBlur={() => setIsEditing(false)}
                            min="0"
                            max={totalMarks}
                            className={`w-20 rounded-lg border-2 py-2 px-3 text-sm font-bold text-center focus:outline-none focus:ring-2 transition-all ${localMarks
                                    ? isPass
                                        ? 'border-emerald-400 focus:ring-emerald-200 text-emerald-700'
                                        : 'border-rose-400 focus:ring-rose-200 text-rose-700'
                                    : 'border-[#E2E8F0] focus:ring-[#223F74]/20 text-[#1D1D1F]'
                                }`}
                            placeholder="—"
                        />
                        {localMarks && (
                            <span className="absolute -top-2 -right-2 text-[8px] font-black bg-white px-1 rounded">
                                /{totalMarks}
                            </span>
                        )}
                    </div>

                    {/* Grade Badge */}
                    {grade && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${grade.color}`}>
                            {grade.value}
                        </span>
                    )}

                    {/* Status Icon */}
                    {localMarks && (
                        <span className="flex-shrink-0">
                            {isPass ? (
                                <CheckCircle size={18} className="text-emerald-500" />
                            ) : (
                                <XCircle size={18} className="text-rose-500" />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {localMarks && (
                <div className="mt-2">
                    <div className="h-1 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isPass ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                            style={{ width: `${(Number(localMarks) / totalMarks) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-0.5">
                        <span className="text-[8px] text-[#6B7280] font-medium">
                            {((Number(localMarks) / totalMarks) * 100).toFixed(0)}%
                        </span>
                        <span className="text-[8px] text-[#6B7280] font-medium">
                            {isPass ? '✅ Pass' : '❌ Fail'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────
const SubjectMarksEntry = () => {
    const [activeTab, setActiveTab] = useState('entry');
    const [loading, setLoading] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // ── Stats ──────────────────────────────────────────────────
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        submitted: 0,
        verified: 0,
        published: 0,
        totalStudents: 0,
        averageScore: 0,
        passPercentage: 0,
    });

    // ── Marks Entry Data ──────────────────────────────────────
    const [marksEntries, setMarksEntries] = useState([]);
    const [students, setStudents] = useState([]);
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

    // ── Entry Form State ──────────────────────────────────────
    const [entryForm, setEntryForm] = useState({
        class: '',
        section: '',
        subject: '',
        examType: '',
        examDate: today(),
        totalMarks: 100,
        passingMarks: 40,
        status: 'draft',
        marks: [],
    });

    // ── Student Marks Form ────────────────────────────────────
    const [studentMarks, setStudentMarks] = useState({});
    const [searchStudent, setSearchStudent] = useState('');

    // ── Fetch Marks Data ──────────────────────────────────────
    const fetchMarksData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/teacher/marks-entry');
            const data = response.data.data;
            const fetchedStats = response.data.stats;

            setMarksEntries(data);
            setStats({
                ...stats,
                total: fetchedStats.total,
                pending: fetchedStats.pending,
                submitted: fetchedStats.submitted,
                verified: fetchedStats.verified,
                published: fetchedStats.published,
                totalStudents: fetchedStats.totalStudents,
                averageScore: fetchedStats.averageScore,
                passPercentage: fetchedStats.passPercentage
            });
        } catch (error) {
            toast.error('Failed to fetch marks data');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStats = (entries) => {
        const total = entries.length;
        const pending = entries.filter(e => e.status === 'pending').length;
        const submitted = entries.filter(e => e.status === 'submitted').length;
        const verified = entries.filter(e => e.status === 'verified').length;
        const published = entries.filter(e => e.status === 'published').length;
        const totalStudents = entries.reduce((acc, e) => acc + (e.students || 0), 0);
        const avgScore = entries.filter(e => e.averageScore > 0)
            .reduce((acc, e) => acc + e.averageScore, 0) / entries.filter(e => e.averageScore > 0).length || 0;
        const passCount = entries.reduce((acc, e) => acc + (e.passCount || 0), 0);
        const totalAttempts = entries.reduce((acc, e) => acc + (e.students || 0), 0);
        const passPercentage = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

        setStats({
            total,
            pending,
            submitted,
            verified,
            published,
            totalStudents,
            averageScore: Math.round(avgScore),
            passPercentage,
        });
    };

    useEffect(() => {
        fetchMarksData();
        fetchAssignedClasses();
    }, [fetchMarksData, fetchAssignedClasses]);

    // ── CRUD Operations ──────────────────────────────────────
    const handleCreateEntry = () => {
        setEntryForm({
            class: '',
            section: '',
            subject: '',
            examType: '',
            examDate: today(),
            totalMarks: 100,
            passingMarks: 40,
            status: 'draft',
            marks: [],
        });
        setStudentMarks({});
        openModal('create-entry-modal');
    };

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        if (!entryForm.class) {
            toast.error('Please select a class');
            return;
        }
        if (!entryForm.section) {
            toast.error('Please select a section');
            return;
        }
        if (!entryForm.subject) {
            toast.error('Please select a subject');
            return;
        }
        if (!entryForm.examType) {
            toast.error('Please select an exam type');
            return;
        }

        try {
            if (selectedEntry && selectedEntry.id) {
                await api.put(`/teacher/marks-entry/${selectedEntry.id}`, entryForm);
                toast.success('Marks entry updated successfully!');
            } else {
                await api.post('/teacher/marks-entry', entryForm);
                toast.success('Marks entry created successfully!');
            }
            fetchMarksData();
            closeModal('create-entry-modal');
        } catch (error) {
            toast.error('Failed to create marks entry');
        }
    };

    const handleEditEntry = (entry) => {
        setSelectedEntry(entry);
        setEntryForm(entry);
        openModal('create-entry-modal');
    };

    const handleDeleteEntry = async (id) => {
        try {
            await api.delete(`/teacher/marks-entry/${id}`);
            fetchMarksData();
            toast.success('Entry deleted successfully');
            closeModal('delete-entry-modal');
        } catch (error) {
            toast.error('Failed to delete entry');
        }
    };

    const handleViewEntry = (entry) => {
        setSelectedEntry(entry);
        openModal('view-entry-modal');
    };

    const handleEnterMarks = async (entry) => {
        setSelectedEntry(entry);
        setLoading(true);
        try {
            const response = await api.get(`/teacher/marks-entry/students?class=${entry.class}&section=${entry.section}`);
            const fetchedStudents = response.data.data;
            setStudents(fetchedStudents);

            const marksData = {};
            const existingMarks = entry.marksData || {};

            fetchedStudents.forEach(student => {
                const existing = existingMarks[student.id];
                marksData[student.id] = {
                    studentId: student.id,
                    name: student.name,
                    rollNo: student.rollNo,
                    marks: existing?.marks || '',
                    grade: existing?.grade || '',
                    status: existing?.status || 'pending',
                };
            });
            setStudentMarks(marksData);
            setSearchStudent('');
            openModal('enter-marks-modal');
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleIndividualStudentMarks = (entry, student) => {
        setSelectedEntry(entry);
        // Pre-fill with existing marks if any
        const marksData = {};
        const existingMarks = entry.marksData || {};
        marksData[student.id] = {
            studentId: student.id,
            name: student.name,
            rollNo: student.rollNo,
            marks: existingMarks[student.id]?.marks || '',
            grade: existingMarks[student.id]?.grade || '',
            status: existingMarks[student.id]?.status || 'pending',
        };
        setStudentMarks(marksData);
        setSearchStudent('');
        openModal('enter-student-marks-modal');
    };

    const handleStudentMarksChange = (studentId, marks, grade) => {
        setStudentMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                marks: marks,
                grade: grade,
                status: marks ? (Number(marks) >= selectedEntry?.passingMarks ? 'pass' : 'fail') : 'pending',
            }
        }));
    };

    const handleSaveMarks = async () => {
        const hasMarks = Object.values(studentMarks).some(s => s.marks && s.marks !== '');
        if (!hasMarks) {
            toast.error('Please enter marks for at least one student');
            return;
        }

        try {
            await api.post(`/teacher/marks-entry/${selectedEntry.id}/marks`, Object.values(studentMarks));
            fetchMarksData();
            toast.success('Marks saved successfully!');
            closeModal('enter-marks-modal');
            closeModal('enter-student-marks-modal');
        } catch (error) {
            toast.error('Failed to save marks');
        }
    };

    const handlePublishMarks = async (id) => {
        try {
            await api.put(`/teacher/marks-entry/${id}/publish`);
            fetchMarksData();
            toast.success('Marks published successfully!');
        } catch (error) {
            toast.error('Failed to publish marks');
        }
    };

    const handleVerifyMarks = async (id) => {
        try {
            await api.put(`/teacher/marks-entry/${id}/verify`);
            fetchMarksData();
            toast.success('Marks verified successfully!');
        } catch (error) {
            toast.error('Failed to verify marks');
        }
    };

    // ── Table Columns ──────────────────────────────────────────
    const entryColumns = [
        {
            key: 'examType',
            label: 'Exam',
            render: (val) => (
                <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
                    {EXAM_TYPES[val] || val}
                </span>
            )
        },
        {
            key: 'subject',
            label: 'Subject',
            render: (val) => (
                <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
                    {val}
                </span>
            )
        },
        {
            key: 'class',
            label: 'Class/Section',
            render: (val, row) => `${val} - ${row.section}`
        },
        {
            key: 'examDate',
            label: 'Exam Date',
            render: (val) => formatDate(val)
        },
        {
            key: 'totalMarks',
            label: 'Total Marks',
            render: (val) => `${val} marks`
        },
        {
            key: 'students',
            label: 'Students',
            render: (val) => val || 0
        },
        {
            key: 'averageScore',
            label: 'Avg Score',
            render: (val) => val > 0 ? `${val}%` : '—'
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
    ];

    const entryActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewEntry(row),
        },
        {
            icon: <Edit size={14} />,
            tooltip: 'Edit Entry',
            variant: 'success',
            show: (row) => row.status === 'draft' || row.status === 'pending',
            onClick: (row) => handleEditEntry(row),
        },
        {
            icon: <PenTool size={14} />,
            tooltip: 'Enter Marks',
            variant: 'primary',
            show: (row) => row.status === 'pending' || row.status === 'draft',
            onClick: (row) => handleEnterMarks(row),
        },
        {
            icon: <CheckCircle size={14} />,
            tooltip: 'Verify',
            variant: 'success',
            show: (row) => row.status === 'submitted',
            onClick: (row) => handleVerifyMarks(row.id),
        },
        {
            icon: <Send size={14} />,
            tooltip: 'Publish',
            variant: 'primary',
            show: (row) => row.status === 'verified',
            onClick: (row) => handlePublishMarks(row.id),
        },
        {
            icon: <Trash2 size={14} />,
            tooltip: 'Delete',
            variant: 'danger',
            show: (row) => row.status === 'draft' || row.status === 'pending',
            onClick: (row) => {
                setSelectedEntry(row);
                openModal('delete-entry-modal');
            },
        },
    ];

    // ── Helper Functions ──────────────────────────────────────
    const getGrade = (marks, totalMarks) => {
        if (!marks || marks === '') return null;
        const percentage = (Number(marks) / totalMarks) * 100;
        for (const grade of GRADES) {
            if (percentage >= grade.min && percentage <= grade.max) {
                return grade;
            }
        }
        return null;
    };

    const getStatsForEntry = (entry) => {
        if (!entry.marksData) return { total: 0, pass: 0, fail: 0, avg: 0, passRate: 0 };
        const marksList = Object.values(entry.marksData).filter(s => s.marks && s.marks !== '');
        const total = marksList.length;
        const pass = marksList.filter(s => Number(s.marks) >= entry.passingMarks).length;
        const fail = total - pass;
        const avg = total > 0 ? Math.round(marksList.reduce((acc, s) => acc + Number(s.marks), 0) / total) : 0;
        const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
        return { total, pass, fail, avg, passRate };
    };

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        {
            title: 'Total Entries',
            value: stats.total,
            icon: <Clipboard size={20} />,
            accentColor: '#223F74',
        },
        {
            title: 'Pending',
            value: stats.pending,
            icon: <Clock size={20} />,
            accentColor: '#E0A04B',
        },
        {
            title: 'Verified',
            value: stats.verified,
            icon: <CheckCircle size={20} />,
            accentColor: '#5B9A6A',
        },
        {
            title: 'Published',
            value: stats.published,
            icon: <Send size={20} />,
            accentColor: '#7A8FC6',
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

    const uniqueSections = Array.from(
        new Set(
            assignedClassesData
                .filter(item => item.className === entryForm.class)
                .map(item => item.section)
        )
    ).map(section => ({ value: section, label: `Section ${section}` }));

    const uniqueSubjects = [];
    assignedClassesData
        .filter(item => item.className === entryForm.class && item.section === entryForm.section)
        .forEach(item => {
            if (Array.isArray(item.subjects)) {
                item.subjects.forEach(sub => {
                    if (!uniqueSubjects.some(s => s.value === sub.name)) {
                        uniqueSubjects.push({ value: sub.name, label: sub.name });
                    }
                });
            } else if (item.subject) {
                item.subject.split(',').forEach(subName => {
                    const name = subName.trim();
                    if (name && !uniqueSubjects.some(s => s.value === name)) {
                        uniqueSubjects.push({ value: name, label: name });
                    }
                });
            }
        });

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="Marks Entry"
                        // secondaryText="Manage student marks and exam results"
                        size={12}
                        action={
                            <div className="flex gap-2">


                            </div>
                        }
                    />
                </div>
            </Grid>

            {/* ── Tab Navigation ── */}
            <div className='mt-6'>
                <Grid cols={12} gap={3}>
                    <div className="col-span-12">
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5">
                            {[
                                { key: 'entry', label: 'Marks Entry', icon: Clipboard },
                                { key: 'analytics', label: 'Analytics', icon: BarChart },
                            ].map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === key
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
            {/* TAB 1 — MARKS ENTRY                                     */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'entry' && (
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
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Average Score</p>
                                    <p className="text-2xl font-black">{stats.averageScore}%</p>
                                    <p className="text-xs opacity-70 mt-1">Across all subjects</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Pass Percentage</p>
                                    <p className="text-2xl font-black">{stats.passPercentage}%</p>
                                    <p className="text-xs opacity-70 mt-1">Students passed</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Students</p>
                                    <p className="text-2xl font-black">{stats.totalStudents}</p>
                                    <p className="text-xs opacity-70 mt-1">Across all entries</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Pending Entries</p>
                                    <p className="text-2xl font-black">{stats.pending}</p>
                                    <p className="text-xs opacity-70 mt-1">Awaiting marks</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Create Card */}
                        <div className="col-span-12">
                            <div className="bg-gradient-to-r from-[#223F74]/5 via-[#223F74]/10 to-[#223F74]/5 rounded-2xl border border-[#223F74]/10 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#223F74] rounded-xl text-white">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#223F74]">Quick Marks Entry</p>
                                        <p className="text-sm text-[#6B7280]">Create a new marks entry for any exam</p>
                                    </div>
                                </div>
                                <Button
                                    text="Create New Entry"
                                    variant="primary"
                                    size={0}
                                    icon={<Plus size={14} />}
                                    onClick={handleCreateEntry}
                                />
                            </div>
                        </div>

                        {/* Marks Entry Table */}
                        <div className="col-span-12">
                            <DataTable
                                columns={entryColumns}
                                rows={marksEntries}
                                actions={entryActions}
                                title="All Marks Entries"
                                pageSize={10}
                                pageSizeOptions={[5, 10, 20, 50]}
                                searchable={true}
                                exportable={true}
                                exportFileName="marks_entries"
                                filters={[
                                    {
                                        title: 'Status',
                                        type: 'toggle',
                                        key: 'status',
                                        options: ['draft', 'pending', 'submitted', 'verified', 'published']
                                    },
                                    {
                                        title: 'Exam Type',
                                        type: 'select',
                                        key: 'examType',
                                        options: Object.keys(EXAM_TYPES)
                                    },
                                    {
                                        title: 'Subject',
                                        type: 'select',
                                        key: 'subject',
                                        options: SUBJECTS.map(s => s.value)
                                    },
                                ]}
                                date={true}
                                defaultSortKey="createdAt"
                                defaultSortDir="desc"
                                loading={loading}
                            />
                        </div>
                    </Grid>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* TAB 2 — ANALYTICS                                      */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <div className='mt-6'>
                    <Grid cols={12} gap={4}>
                        <div className="col-span-12">
                            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-[#223F74]">Marks Analytics</h3>
                                        <P text="Overview of student performance across all exams" />
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                        <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Overall Average</p>
                                        <p className="text-2xl font-black text-[#223F74]">{stats.averageScore}%</p>
                                    </div>
                                    <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                        <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Pass Percentage</p>
                                        <p className="text-2xl font-black text-[#223F74]">{stats.passPercentage}%</p>
                                    </div>
                                    <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                                        <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Students</p>
                                        <p className="text-2xl font-black text-[#223F74]">{stats.totalStudents}</p>
                                    </div>
                                </div>

                                {/* Performance by Subject */}
                                <div className="mb-6 p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen size={16} className="text-[#223F74]" />
                                        <h4 className="font-bold text-sm text-[#1D1D1F]">Performance by Subject</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {marksEntries
                                            .filter(e => e.averageScore > 0)
                                            .reduce((acc, e) => {
                                                const existing = acc.find(item => item.subject === e.subject);
                                                if (existing) {
                                                    existing.scores.push(e.averageScore);
                                                    existing.count++;
                                                } else {
                                                    acc.push({ subject: e.subject, scores: [e.averageScore], count: 1 });
                                                }
                                                return acc;
                                            }, [])
                                            .map((item, i) => {
                                                const avg = Math.round(item.scores.reduce((a, b) => a + b, 0) / item.scores.length);
                                                return (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-[#1D1D1F]">{item.subject}</span>
                                                        <div className="flex items-center gap-3 flex-1 max-w-md">
                                                            <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                                    style={{ width: `${avg}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-bold text-[#223F74]">{avg}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Recent Entries */}
                                <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Activity size={16} className="text-[#223F74]" />
                                        <h4 className="font-bold text-sm text-[#1D1D1F]">Recent Marks Entries</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {marksEntries.slice(0, 5).map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#E2E8F0]">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1D1D1F]">
                                                        {entry.subject} - {EXAM_TYPES[entry.examType] || entry.examType}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]">Class {entry.class}-{entry.section}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#223F74]">
                                                        {entry.averageScore > 0 ? `${entry.averageScore}%` : '—'}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]}">{entry.students || 0} students</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Grid>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODALS                                                */}
            {/* ══════════════════════════════════════════════════════ */}

            {/* Create/Edit Entry Modal */}
            <Modal id="create-entry-modal" title={entryForm.id ? 'Edit Marks Entry' : 'Create New Marks Entry'} size="lg">
                <form onSubmit={handleSaveEntry} className="space-y-5">
                    <ModalGrid title="Entry Details" cols={2}>
                        <Select
                            label="Class *"
                            id="class"
                            value={entryForm.class}
                            onChange={e => {
                                const val = e.target.value;
                                setEntryForm(prev => ({
                                    ...prev,
                                    class: val,
                                    section: '',
                                    subject: ''
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
                            value={entryForm.section}
                            disabled={!entryForm.class}
                            onChange={e => {
                                const val = e.target.value;
                                setEntryForm(prev => ({
                                    ...prev,
                                    section: val,
                                    subject: ''
                                }));
                            }}
                        >
                            <Option value="" label={entryForm.class ? "Select Section" : "Choose class first"} disabled />
                            {uniqueSections.map(({ value, label }) => (
                                <Option key={value} value={value} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Subject *"
                            id="subject"
                            value={entryForm.subject}
                            disabled={!entryForm.section}
                            onChange={e => setEntryForm({ ...entryForm, subject: e.target.value })}
                        >
                            <Option value="" label={entryForm.section ? "Select Subject" : "Choose section first"} disabled />
                            {uniqueSubjects.map(({ value, label }) => (
                                <Option key={value} value={value} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Exam Type *"
                            id="examType"
                            value={entryForm.examType}
                            onChange={e => setEntryForm({ ...entryForm, examType: e.target.value })}
                        >
                            <Option value="" label="Select Exam Type" disabled />
                            {Object.entries(EXAM_TYPES).map(([key, label]) => (
                                <Option key={key} value={key} label={label} />
                            ))}
                        </Select>
                        <DataField
                            label="Exam Date"
                            id="examDate"
                            type="date"
                            value={entryForm.examDate}
                            onChange={e => setEntryForm({ ...entryForm, examDate: e.target.value })}
                        />
                        <DataField
                            label="Total Marks"
                            id="totalMarks"
                            type="number"
                            value={entryForm.totalMarks}
                            onChange={e => setEntryForm({ ...entryForm, totalMarks: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={500}
                        />
                        <DataField
                            label="Passing Marks"
                            id="passingMarks"
                            type="number"
                            value={entryForm.passingMarks}
                            onChange={e => setEntryForm({ ...entryForm, passingMarks: parseInt(e.target.value) || 0 })}
                            min={0}
                            max={entryForm.totalMarks}
                        />
                        <Select
                            label="Status"
                            id="status"
                            value={entryForm.status}
                            onChange={e => setEntryForm({ ...entryForm, status: e.target.value })}
                            searchable={false}
                        >
                            <Option value="draft" label="Draft" />
                            <Option value="pending" label="Pending" />
                            <Option value="submitted" label="Submitted" />
                        </Select>
                    </ModalGrid>

                    <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                        <Button
                            text={entryForm.id ? 'Update Entry' : 'Create Entry'}
                            variant="primary"
                            type="submit"
                            size={0}
                            icon={entryForm.id ? <Edit size={15} /> : <Plus size={15} />}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('create-entry-modal')}
                        />
                    </div>
                </form>
            </Modal>

            {/* Enter Marks Modal - Full Class */}
            <Modal id="enter-marks-modal" title={`Enter Marks - ${selectedEntry?.subject || ''}`} size="2xl">
                {selectedEntry && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <GraduationCap size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">
                                    {selectedEntry.subject} - {EXAM_TYPES[selectedEntry.examType] || selectedEntry.examType}
                                </p>
                                <p className="text-sm text-slate-300">
                                    Class {selectedEntry.class}-{selectedEntry.section} • Total Marks: {selectedEntry.totalMarks} • Passing: {selectedEntry.passingMarks}
                                </p>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-bold">
                                {students.length} Students
                            </span>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                            <input
                                type="text"
                                placeholder="Search student by name or roll number..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-[#1D1D1F]"
                            />
                        </div>

                        {/* Student Marks Cards */}
                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {Object.values(studentMarks)
                                .filter(s =>
                                    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
                                    s.rollNo.includes(searchStudent)
                                )
                                .map((student, index) => (
                                    <StudentMarksCard
                                        key={student.studentId}
                                        student={student}
                                        marks={student.marks}
                                        onMarksChange={handleStudentMarksChange}
                                        totalMarks={selectedEntry.totalMarks}
                                        passingMarks={selectedEntry.passingMarks}
                                        index={index}
                                        total={students.length}
                                    />
                                ))}
                        </div>

                        {/* Stats Summary */}
                        {(() => {
                            const marksList = Object.values(studentMarks).filter(s => s.marks && s.marks !== '');
                            const total = marksList.length;
                            const pass = marksList.filter(s => Number(s.marks) >= selectedEntry.passingMarks).length;
                            const fail = total - pass;
                            return total > 0 ? (
                                <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                    <div className="flex items-center gap-4 text-xs font-semibold">
                                        <span className="text-[#6B7280]">📊 {total} students marked</span>
                                        <span className="text-emerald-600">✅ {pass} passed</span>
                                        <span className="text-rose-600">❌ {fail} failed</span>
                                        <span className="text-[#223F74]">📈 Avg: {Math.round(marksList.reduce((acc, s) => acc + Number(s.marks), 0) / total)}%</span>
                                    </div>
                                </div>
                            ) : null
                        })()}

                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                                <AlertCircle size={14} />
                                <span>Enter marks for each student. Grades will be auto-calculated.</span>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    text="Cancel"
                                    variant="secondary"
                                    size={0}
                                    onClick={() => closeModal('enter-marks-modal')}
                                />
                                <Button
                                    text="Save Marks"
                                    variant="primary"
                                    size={0}
                                    icon={<Save size={14} />}
                                    onClick={handleSaveMarks}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Enter Individual Student Marks Modal */}
            <Modal id="enter-student-marks-modal" title={`Enter Marks - ${selectedEntry?.subject || ''}`} size="lg">
                {selectedEntry && Object.values(studentMarks).length === 1 && (
                    (() => {
                        const student = Object.values(studentMarks)[0];
                        return (
                            <div className="space-y-4">
                                {/* Student Profile */}
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82]">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-white">
                                        <p className="text-lg font-bold">{student.name}</p>
                                        <p className="text-sm text-slate-300">
                                            Roll No: #{student.rollNo} • Class {selectedEntry.class}-{selectedEntry.section}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {selectedEntry.subject} - {EXAM_TYPES[selectedEntry.examType] || selectedEntry.examType}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-300">Total Marks</p>
                                        <p className="text-xl font-bold text-white">{selectedEntry.totalMarks}</p>
                                    </div>
                                </div>

                                {/* Marks Input */}
                                <div className="p-6 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                    <div className="flex items-center gap-6">
                                        <Label text="Marks Obtained" />
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                value={student.marks || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const grade = getGrade(val, selectedEntry.totalMarks);
                                                    handleStudentMarksChange(student.studentId, val, grade?.value || '');
                                                }}
                                                min="0"
                                                max={selectedEntry.totalMarks}
                                                className="w-32 rounded-xl border-2 border-[#E2E8F0] bg-white py-3 px-4 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-[#1D1D1F]"
                                                placeholder="—"
                                                autoFocus
                                            />
                                            <span className="text-lg font-semibold text-[#6B7280]">/ {selectedEntry.totalMarks}</span>
                                        </div>
                                    </div>

                                    {/* Grade Display */}
                                    {student.marks && (
                                        <div className="mt-4 flex items-center gap-6">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-[#6B7280]">Grade:</span>
                                                {(() => {
                                                    const grade = getGrade(student.marks, selectedEntry.totalMarks);
                                                    return grade ? (
                                                        <span className={`px-4 py-2 rounded-xl text-lg font-bold ${grade.color}`}>
                                                            {grade.value}
                                                        </span>
                                                    ) : <span className="text-sm text-[#6B7280]">—</span>;
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-[#6B7280]">Status:</span>
                                                {student.marks ? (
                                                    Number(student.marks) >= selectedEntry.passingMarks ? (
                                                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                                            <CheckCircle size={18} /> Passed
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                                                            <XCircle size={18} /> Failed
                                                        </span>
                                                    )
                                                ) : <span className="text-sm text-[#6B7280]">—</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress */}
                                    {student.marks && (
                                        <div className="mt-4">
                                            <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${Number(student.marks) >= selectedEntry.passingMarks ? 'bg-emerald-500' : 'bg-rose-500'
                                                        }`}
                                                    style={{ width: `${(Number(student.marks) / selectedEntry.totalMarks) * 100}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-xs text-[#6B7280]">
                                                    Score: {((Number(student.marks) / selectedEntry.totalMarks) * 100).toFixed(0)}%
                                                </span>
                                                <span className="text-xs text-[#6B7280]">
                                                    Passing: {selectedEntry.passingMarks} marks
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                                        <AlertCircle size={14} />
                                        <span>Enter the marks for this student</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            text="Cancel"
                                            variant="secondary"
                                            size={0}
                                            onClick={() => closeModal('enter-student-marks-modal')}
                                        />
                                        <Button
                                            text="Save Marks"
                                            variant="primary"
                                            size={0}
                                            icon={<Save size={14} />}
                                            onClick={handleSaveMarks}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                )}
            </Modal>

            {/* View Entry Modal */}
            <Modal id="view-entry-modal" title="Marks Entry Details" size="lg">
                {selectedEntry && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <Clipboard size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">
                                    {selectedEntry.subject} - {EXAM_TYPES[selectedEntry.examType] || selectedEntry.examType}
                                </p>
                                <p className="text-sm text-slate-300">
                                    Class {selectedEntry.class}-{selectedEntry.section} • {formatDate(selectedEntry.examDate)}
                                </p>
                            </div>
                            <StatusBadge status={selectedEntry.status} />
                        </div>

                        <ModalGrid title="Entry Information" cols={3}>
                            <ModalData label="Class" value={`${selectedEntry.class} - ${selectedEntry.section}`} />
                            <ModalData label="Subject" value={selectedEntry.subject} />
                            <ModalData label="Exam Type" value={EXAM_TYPES[selectedEntry.examType] || selectedEntry.examType} />
                            <ModalData label="Exam Date" value={formatDate(selectedEntry.examDate)} />
                            <ModalData label="Total Marks" value={`${selectedEntry.totalMarks} marks`} />
                            <ModalData label="Passing Marks" value={`${selectedEntry.passingMarks} marks`} />
                            <ModalData label="Students" value={selectedEntry.students || 0} />
                            <ModalData label="Average Score" value={selectedEntry.averageScore > 0 ? `${selectedEntry.averageScore}%` : '—'} />
                            <ModalData label="Pass Count" value={selectedEntry.passCount || 0} />
                        </ModalGrid>

                        {/* Student Marks Summary (if available) */}
                        {selectedEntry.marksData && (
                            <ModalGrid title="Student Marks Summary" cols={1}>
                                <div className="space-y-2">
                                    {Object.values(selectedEntry.marksData).map((student, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-semibold text-[#6B7280]">#{student.rollNo}</span>
                                                <span className="text-sm font-semibold text-[#1D1D1F]">{student.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-[#223F74]">{student.marks || '—'}</span>
                                                {student.grade && (
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${GRADES.find(g => g.value === student.grade)?.color || 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {student.grade}
                                                    </span>
                                                )}
                                                {student.status === 'pass' ? (
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                ) : student.status === 'fail' ? (
                                                    <XCircle size={16} className="text-rose-500" />
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalGrid>
                        )}

                        <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('view-entry-modal')}
                            />
                            {(selectedEntry.status === 'pending' || selectedEntry.status === 'draft') && (
                                <Button
                                    text="Enter Marks"
                                    variant="primary"
                                    size={0}
                                    icon={<PenTool size={14} />}
                                    onClick={() => {
                                        closeModal('view-entry-modal');
                                        handleEnterMarks(selectedEntry);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Entry Modal */}
            <PanelModal id="delete-entry-modal" title="Delete Entry" size="sm">
                <div className="flex flex-col items-center text-center py-4">
                    <div className="p-4 bg-rose-100 rounded-2xl mb-4">
                        <Trash2 className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-black text-[#223F74] text-lg">Delete Entry</h3>
                    <P text="This action cannot be undone" size="xs" />
                    <P text="Are you sure you want to delete this marks entry?" size="sm" />
                    {selectedEntry && (
                        <div className="mt-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] w-full">
                            <p className="text-sm font-semibold text-[#1D1D1F]">
                                {selectedEntry.subject} - {EXAM_TYPES[selectedEntry.examType] || selectedEntry.examType}
                            </p>
                            <p className="text-xs text-[#6B7280]">Class {selectedEntry.class}-{selectedEntry.section}</p>
                        </div>
                    )}
                    <div className="flex gap-3 w-full mt-6">
                        <Button
                            text="Delete"
                            icon={<Trash2 size={14} />}
                            variant="danger"
                            size={0}
                            onClick={() => handleDeleteEntry(selectedEntry?.id)}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('delete-entry-modal')}
                        />
                    </div>
                </div>
            </PanelModal>

        </div>
    );
};

export default SubjectMarksEntry;