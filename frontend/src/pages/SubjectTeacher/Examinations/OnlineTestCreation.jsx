// OnlineTestCreation.jsx - Fully wired to real backend
import React, { useState, useEffect, useCallback } from 'react';
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
    Award as AwardIcon, Medal, Star as StarIcon
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
} from '../../../components/shared/Common_Components';

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
});
const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
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

const QUESTION_TYPES = {
    mcq: 'Multiple Choice (MCQ)',
    true_false: 'True / False',
    fill_blank: 'Fill in the Blank',
    matching: 'Matching',
    descriptive: 'Descriptive / Essay',
    numeric: 'Numeric / Calculation',
    paragraph: 'Paragraph / Comprehension',
    assertion_reason: 'Assertion & Reason',
    case_study: 'Case Study / Passage',
    image_based: 'Image Based',
    audio_based: 'Audio Based',
    video_based: 'Video Based',
};

const DIFFICULTY_LEVELS = {
    very_easy: 'Very Easy',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    very_hard: 'Very Hard',
    expert: 'Expert',
};

const TEST_STATUS = {
    draft: 'Draft',
    published: 'Published',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

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

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        draft: 'bg-slate-100 text-slate-700 border-slate-200',
        published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
        completed: 'bg-blue-100 text-blue-700 border-blue-200',
        cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
        active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        inactive: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const icons = {
        draft: <FileText size={10} />,
        published: <CheckCircle size={10} />,
        scheduled: <Clock size={10} />,
        completed: <CheckCircle size={10} />,
        cancelled: <XCircle size={10} />,
        active: <CheckCircle size={10} />,
        inactive: <XCircle size={10} />,
    };
    const labels = {
        draft: 'Draft',
        published: 'Published',
        scheduled: 'Scheduled',
        completed: 'Completed',
        cancelled: 'Cancelled',
        active: 'Active',
        inactive: 'Inactive',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.draft}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────
const OnlineTestCreation = () => {
    const [activeTab, setActiveTab] = useState('tests');
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    // ── Test Stats ─────────────────────────────────────────────
    const [testStats, setTestStats] = useState({
        total: 0,
        published: 0,
        draft: 0,
        scheduled: 0,
        completed: 0,
        active: 0,
    });

    // ── Test Form State ────────────────────────────────────────
    const [testForm, setTestForm] = useState({
        title: '',
        description: '',
        examType: '',
        subject: '',
        class: '',
        section: '',
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        startDate: today(),
        startTime: '09:00',
        endDate: today(),
        endTime: '17:00',
        status: 'draft',
        instructions: '',
        randomizeQuestions: false,
        showResults: true,
        allowReview: true,
        allowRetake: false,
        maxAttempts: 1,
        questions: [],
    });

    // ── Question Form State ────────────────────────────────────
    const [questionForm, setQuestionForm] = useState({
        type: 'mcq',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        difficulty: 'medium',
        explanation: '',
        imageUrl: '',
    });
    const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

    // ── Metadata States ────────────────────────────────────────
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [assignedSubjects, setAssignedSubjects] = useState([]);

    const fetchMetadata = useCallback(async () => {
        try {
            const [ptmRes, filtersRes] = await Promise.all([
                api.get('/subject-teacher/ptms/classes-sections'),
                api.get('/subject-teacher/online-tests/filters')
            ]);
            
            if (ptmRes.data?.success) {
                setAssignedClasses(ptmRes.data.data || []);
            }
            if (filtersRes.data?.success) {
                setAssignedSubjects(filtersRes.data.data?.subjects || []);
            }
        } catch (error) {
            console.error('fetchMetadata error:', error);
        }
    }, []);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    // ── Analytics State ────────────────────────────────────────
    const [analyticsData, setAnalyticsData] = useState({
        subjectBreakdown: [],
        statusBreakdown: [],
        monthlyTrend: [],
        topPerformers: [],
        recentActivity: [],
    });

    // ── Fetch Tests + Stats from backend ──────────────────────
    const fetchTests = useCallback(async () => {
        setLoading(true);
        try {
            const [testsRes, statsRes] = await Promise.all([
                api.get('/subject-teacher/online-tests'),
                api.get('/subject-teacher/online-tests/stats'),
            ]);

            const testsData = testsRes.data?.data || [];
            setTests(testsData);

            const stats = statsRes.data?.data?.stats || {};
            setTestStats({
                total:     stats.total     || 0,
                published: stats.published || 0,
                draft:     stats.draft     || 0,
                scheduled: stats.scheduled || 0,
                completed: stats.completed || 0,
                active:    stats.active    || 0,
            });

            const analytics = statsRes.data?.data?.analytics || {};
            setAnalyticsData({
                subjectBreakdown: analytics.subjectBreakdown || [],
                statusBreakdown:  analytics.statusBreakdown  || [],
                recentActivity:   analytics.recentActivity   || [],
                topPerformers:    analytics.topPerformers    || [],
                monthlyTrend:     analytics.monthlyTrend     || [],
                totalAttempts:    analytics.totalAttempts    || 0,
                averageScore:     analytics.averageScore     || 0,
                passingRate:      analytics.passingRate      || 0,
            });
        } catch (error) {
            console.error('fetchTests error:', error);
            toast.error('Failed to fetch tests');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    // ── Test CRUD Operations ──────────────────────────────────
    const handleCreateTest = () => {
        setTestForm({
            title: '',
            description: '',
            examType: '',
            subject: '',
            class: '',
            section: '',
            duration: 60,
            totalMarks: 100,
            passingMarks: 40,
            startDate: today(),
            startTime: '09:00',
            endDate: today(),
            endTime: '17:00',
            status: 'draft',
            instructions: '',
            randomizeQuestions: false,
            showResults: true,
            allowReview: true,
            allowRetake: false,
            maxAttempts: 1,
            questions: [],
        });
        setEditingQuestionIndex(null);
        openModal('create-test-modal');
    };

    const handleSaveTest = async (e) => {
        e.preventDefault();
        if (!testForm.title.trim()) {
            toast.error('Please enter a test title');
            return;
        }
        if (!testForm.examType) {
            toast.error('Please select an exam type');
            return;
        }
        if (!testForm.subject) {
            toast.error('Please select a subject');
            return;
        }
        if (!testForm.class) {
            toast.error('Please select a class');
            return;
        }
        if (!testForm.section) {
            toast.error('Please select a section');
            return;
        }
        if (testForm.questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        try {
            // Strip 'id' from questions to prevent Mongoose from mapping it to '_id' and throwing a CastError
            const payload = {
                ...testForm,
                questions: testForm.questions.map(q => {
                    const { id, ...rest } = q;
                    return rest;
                })
            };

            if (selectedTest && selectedTest._id) {
                // UPDATE existing test
                await api.put(`/subject-teacher/online-tests/${selectedTest._id}`, payload);
                toast.success('Test updated successfully!');
            } else {
                // CREATE new test
                await api.post('/subject-teacher/online-tests', payload);
                toast.success('Test created successfully!');
            }
            closeModal('create-test-modal');
            fetchTests();
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to save test';
            toast.error(msg);
        }
    };

    const handleEditTest = (test) => {
        setSelectedTest(test);
        setTestForm(test);
        openModal('create-test-modal');
    };

    const handleDeleteTest = async (id) => {
        try {
            await api.delete(`/subject-teacher/online-tests/${id}`);
            toast.success('Test deleted successfully');
            closeModal('delete-test-modal');
            fetchTests();
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to delete test';
            toast.error(msg);
        }
    };

    const handleViewTest = (test) => {
        setSelectedTest(test);
        openModal('view-test-modal');
    };

    const handleViewAllAnalytics = () => {
        openModal('analytics-details-modal');
    };

    // ── Question Management ──────────────────────────────────
    const handleAddQuestion = () => {
        if (!questionForm.question.trim()) {
            toast.error('Please enter a question');
            return;
        }
        if (questionForm.type === 'mcq') {
            const filledOptions = questionForm.options.filter(opt => opt.trim());
            if (filledOptions.length < 2) {
                toast.error('Please add at least 2 options');
                return;
            }
            if (!questionForm.correctAnswer) {
                toast.error('Please select the correct answer');
                return;
            }
        }
        if (questionForm.type === 'true_false' && !questionForm.correctAnswer) {
            toast.error('Please select the correct answer');
            return;
        }

        const newQuestion = {
            id: Date.now(),
            ...questionForm,
            options: questionForm.type === 'mcq' ? questionForm.options : [],
        };

        if (editingQuestionIndex !== null) {
            const updatedQuestions = [...testForm.questions];
            updatedQuestions[editingQuestionIndex] = newQuestion;
            setTestForm(prev => ({ ...prev, questions: updatedQuestions }));
            setEditingQuestionIndex(null);
            toast.success('Question updated!');
        } else {
            setTestForm(prev => ({
                ...prev,
                questions: [...prev.questions, newQuestion],
            }));
            toast.success('Question added!');
        }

        // Reset question form
        setQuestionForm({
            type: 'mcq',
            question: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            marks: 1,
            difficulty: 'medium',
            explanation: '',
            imageUrl: '',
        });
        closeModal('add-question-modal');
    };

    const handleEditQuestion = (index) => {
        const question = testForm.questions[index];
        setQuestionForm(question);
        setEditingQuestionIndex(index);
        openModal('add-question-modal');
    };

    const handleRemoveQuestion = (index) => {
        const updatedQuestions = testForm.questions.filter((_, i) => i !== index);
        setTestForm(prev => ({ ...prev, questions: updatedQuestions }));
        toast.success('Question removed');
    };

    const handleDuplicateTest = async (test) => {
        try {
            await api.post(`/subject-teacher/online-tests/${test._id}/duplicate`);
            toast.success('Test duplicated successfully');
            fetchTests();
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to duplicate test';
            toast.error(msg);
        }
    };

    // ── Table Columns ──────────────────────────────────────────
    const testColumns = [
        { 
            key: 'title', 
            label: 'Test Title',
            render: (val, row) => (
                <div>
                    <div className="font-bold text-[#1D1D1F]">{val}</div>
                    <div className="text-xs text-[#6B7280]">{row.description}</div>
                </div>
            )
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
            key: 'duration', 
            label: 'Duration',
            render: (val) => `${val} mins`
        },
        { 
            key: 'totalMarks', 
            label: 'Total Marks',
            render: (val) => `${val} marks`
        },
        { 
            key: 'status', 
            label: 'Status',
            render: (val) => <StatusBadge status={val} />
        },
        { 
            key: 'attempts', 
            label: 'Attempts',
            render: (val) => val || 0
        },
        { 
            key: 'averageScore', 
            label: 'Avg Score',
            render: (val) => val > 0 ? `${val}%` : '—'
        },
    ];

    const testActions = [
        {
            icon: <Eye size={14} />,
            tooltip: 'View Details',
            variant: 'primary',
            onClick: (row) => handleViewTest(row),
        },
        {
            icon: <Edit size={14} />,
            tooltip: 'Edit Test',
            variant: 'success',
            show: (row) => row.status === 'draft',
            onClick: (row) => handleEditTest(row),
        },
        {
            icon: <Copy size={14} />,
            tooltip: 'Duplicate',
            variant: 'primary',
            onClick: (row) => handleDuplicateTest(row),
        },
        {
            icon: <Trash2 size={14} />,
            tooltip: 'Delete',
            variant: 'danger',
            show: (row) => row.status === 'draft' || row.status === 'completed',
            onClick: (row) => {
                setSelectedTest(row);
                openModal('delete-test-modal');
            },
        },
    ];

    // ── Question Table Columns ──────────────────────────────
    const questionColumns = [
        { 
            key: 'question', 
            label: 'Question',
            render: (val, row) => (
                <div className="max-w-md">
                    <div className="font-semibold text-[#1D1D1F]">{val}</div>
                    {row.explanation && (
                        <div className="text-xs text-[#6B7280] mt-1">
                            <HelpCircle size={12} className="inline mr-1" />
                            {row.explanation}
                        </div>
                    )}
                </div>
            )
        },
        { 
            key: 'type', 
            label: 'Type',
            render: (val) => (
                <span className="px-2 py-1 rounded-lg bg-[#223F74]/10 text-[#223F74] text-xs font-semibold">
                    {QUESTION_TYPES[val] || val}
                </span>
            )
        },
        { 
            key: 'difficulty', 
            label: 'Difficulty',
            render: (val) => {
                const colors = {
                    very_easy: 'text-emerald-600 bg-emerald-50',
                    easy: 'text-emerald-600 bg-emerald-50',
                    medium: 'text-amber-600 bg-amber-50',
                    hard: 'text-rose-600 bg-rose-50',
                    very_hard: 'text-rose-700 bg-rose-50',
                    expert: 'text-purple-600 bg-purple-50',
                };
                return (
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[val] || colors.easy}`}>
                        {DIFFICULTY_LEVELS[val] || val}
                    </span>
                );
            }
        },
        { 
            key: 'marks', 
            label: 'Marks',
            render: (val) => `${val} mark${val > 1 ? 's' : ''}`
        },
    ];

    const questionActions = [
        {
            icon: <Edit size={14} />,
            tooltip: 'Edit Question',
            variant: 'success',
            onClick: (row, index) => handleEditQuestion(index),
        },
        {
            icon: <Trash2 size={14} />,
            tooltip: 'Remove Question',
            variant: 'danger',
            onClick: (_, index) => handleRemoveQuestion(index),
        },
    ];

    // ── Statistics Cards ──────────────────────────────────────
    const statCards = [
        { 
            title: 'Total Tests', 
            value: testStats.total,
            icon: <FileText size={20} />,
            accentColor: '#223F74',
        },
        { 
            title: 'Active Tests', 
            value: testStats.active,
            icon: <PlayCircle size={20} />,
            accentColor: '#5B9A6A',
        },
        { 
            title: 'Scheduled', 
            value: testStats.scheduled,
            icon: <Calendar size={20} />,
            accentColor: '#E0A04B',
        },
        { 
            title: 'Draft', 
            value: testStats.draft,
            icon: <FileText size={20} />,
            accentColor: '#6B7280',
        },
    ];

    const activeClassObj = assignedClasses.find(c => c.name === testForm.class);
    const activeClassSections = activeClassObj?.sections || [];

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">

            {/* ── Header ── */}
            <Grid cols={12} gap={4}>
                <div className="col-span-12">
                    <Heading
                        primaryText="Online Test Creation"
                        // secondaryText="Create and manage online tests for your students"
                        size={12}
                        action={
                            <div className="flex gap-2">
                                <Button
                                    text="Refresh"
                                    variant="ghost"
                                    size={0}
                                    icon={<RefreshCw size={14} />}
                                    onClick={fetchTests}
                                />
                               
                            </div>
                        }
                    />
                </div>
            </Grid>

            {/* ── Tab Navigation ── */}
            <Grid cols={12} gap={3}>
                <div className="col-span-12 mt-6">
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5">
                        {[
                            { key: 'tests', label: 'My Tests', icon: FileText },
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

            {/* ══════════════════════════════════════════════════════ */}
            {/* TAB 1 — TESTS LIST                                     */}
            {/* ══════════════════════════════════════════════════════ */}
            {activeTab === 'tests' && (
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

                    {/* Quick Create Card */}
                    <div className="col-span-12">
                        <div className="bg-gradient-to-r from-[#223F74]/5 via-[#223F74]/10 to-[#223F74]/5 rounded-2xl border border-[#223F74]/10 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#223F74] rounded-xl text-white">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[#223F74]">Quick Test Creation</p>
                                    <p className="text-sm text-[#6B7280]">Create a new test in just a few clicks</p>
                                </div>
                            </div>
                            <Button
                                text="Create New Test"
                                variant="primary"
                                size={0}
                                icon={<Plus size={14} />}
                                onClick={handleCreateTest}
                            />
                        </div>
                    </div>

                    {/* Tests Table */}
                    <div className="col-span-12">
                        <DataTable
                            columns={testColumns}
                            rows={tests}
                            actions={testActions}
                            title="All Tests"
                            pageSize={10}
                            pageSizeOptions={[5, 10, 20, 50]}
                            searchable={true}
                            exportable={true}
                            exportFileName="online_tests"
                            filters={[
                                { 
                                    title: 'Status', 
                                    type: 'toggle', 
                                    key: 'status', 
                                    options: ['draft', 'published', 'scheduled', 'completed', 'cancelled'] 
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
                                    options: assignedSubjects.map(s => s.name)
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
                                    <h3 className="text-lg font-black text-[#223F74]">Test Analytics</h3>
                                    <P text="Overview of all your tests' performance" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-6 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Average Score</p>
                                    <p className="text-3xl font-black mt-2">
                                        {analyticsData.averageScore || 0}%
                                    </p>
                                    <p className="text-xs opacity-70 mt-1">Across all tests</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Attempts</p>
                                    <p className="text-3xl font-black mt-2">
                                        {analyticsData.totalAttempts || 0}
                                    </p>
                                    <p className="text-xs opacity-70 mt-1">Student submissions</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 text-white">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Passing Rate</p>
                                    <p className="text-3xl font-black mt-2">
                                        {analyticsData.passingRate || 0}%
                                    </p>
                                    <p className="text-xs opacity-70 mt-1">Students who passed</p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-[#1D1D1F]">Recent Test Performance</p>
                                        <P text="Last 5 tests" />
                                    </div>
                                    <Button
                                        text="View All Analytics"
                                        variant="secondary"
                                        size={0}
                                        icon={<BarChart size={14} />}
                                        onClick={handleViewAllAnalytics}
                                    />
                                </div>
                                <div className="mt-4 space-y-2">
                                    {analyticsData.recentActivity.length > 0 ? (
                                        analyticsData.recentActivity.map((test, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#E2E8F0]">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1D1D1F]">{test.title}</p>
                                                    <p className="text-xs text-[#6B7280]">{test.subject} • {test.class}-{test.section}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#223F74]">
                                                        {test.averageScore > 0 ? `${test.averageScore}%` : '—'}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]">{test.attempts || 0} attempts</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-[#6B7280]">
                                            <P text="No recent test activity" />
                                        </div>
                                    )}
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

            {/* Analytics Details Modal */}
            <Modal id="analytics-details-modal" title="Complete Analytics Dashboard" size="2xl">
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                            <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Tests</p>
                            <p className="text-2xl font-black text-[#223F74]">{testStats.total}</p>
                        </div>
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                            <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Avg Score</p>
                            <p className="text-2xl font-black text-[#223F74]">
                                {tests.length > 0 
                                    ? Math.round(tests.reduce((acc, t) => acc + t.averageScore, 0) / tests.filter(t => t.averageScore > 0).length) 
                                    : 0}%
                            </p>
                        </div>
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                            <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Attempts</p>
                            <p className="text-2xl font-black text-[#223F74]">
                                {tests.reduce((acc, t) => acc + (t.attempts || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0] text-center">
                            <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Passing Rate</p>
                            <p className="text-2xl font-black text-[#223F74]">
                                {tests.length > 0 
                                    ? Math.round((tests.filter(t => t.averageScore >= t.passingMarks).length / tests.length) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Subject Performance */}
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0]">
                            <div className="flex items-center gap-2 mb-3">
                                <BookOpen size={16} className="text-[#223F74]" />
                                <h4 className="font-bold text-sm text-[#1D1D1F]">Subject Performance</h4>
                            </div>
                            <div className="space-y-2">
                                {analyticsData.subjectBreakdown.map((subject, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#6B7280]">{subject.name}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                    style={{ width: `${subject.avgScore}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-[#223F74]">{subject.avgScore}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Distribution */}
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0]">
                            <div className="flex items-center gap-2 mb-3">
                                <PieChart size={16} className="text-[#223F74]" />
                                <h4 className="font-bold text-sm text-[#1D1D1F]">Status Distribution</h4>
                            </div>
                            <div className="space-y-2">
                                {analyticsData.statusBreakdown.map((status, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={status.status} />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#223F74] rounded-full transition-all duration-500"
                                                    style={{ width: `${(status.value / testStats.total) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-[#223F74]">{status.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Performing Subjects */}
                    <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0]">
                        <div className="flex items-center gap-2 mb-3">
                            <AwardIcon size={16} className="text-[#223F74]" />
                            <h4 className="font-bold text-sm text-[#1D1D1F]">Top Performing Subjects</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {analyticsData.topPerformers.map((subject, i) => (
                                <div key={i} className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[#1D1D1F]">{subject.name}</span>
                                        <span className="text-lg font-black text-[#223F74]">{subject.score}%</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-[#6B7280]">{subject.attempts} attempts</span>
                                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                            <TrendingUp size={12} /> +{subject.growth}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Trend */}
                    {analyticsData.monthlyTrend.length > 0 && (
                        <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2E8F0]">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={16} className="text-[#223F74]" />
                                <h4 className="font-bold text-sm text-[#1D1D1F]">Monthly Trend</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {analyticsData.monthlyTrend.map((month, i) => (
                                    <div key={i} className="bg-white rounded-lg p-3 border border-[#E2E8F0] text-center">
                                        <p className="text-xs font-bold text-[#6B7280]">{month.name}</p>
                                        <p className="text-lg font-black text-[#223F74]">{month.tests}</p>
                                        <p className="text-xs text-[#6B7280]">{month.avgScore}% avg</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
                        <Button
                            text="Close"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('analytics-details-modal')}
                        />
                        
                    </div>
                </div>
            </Modal>

            {/* Create/Edit Test Modal */}
            <Modal id="create-test-modal" title={testForm.id ? 'Edit Test' : 'Create New Test'} size="2xl">
                <form onSubmit={handleSaveTest} className="space-y-6">
                    {/* Basic Information */}
                    <ModalGrid title="Basic Information" cols={2}>
                        <DataField
                            label="Test Title *"
                            id="test-title"
                            placeholder="Enter test title"
                            value={testForm.title}
                            onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                            required
                        />
                        <Select
                            label="Exam Type *"
                            id="examType"
                            value={testForm.examType}
                            onChange={e => setTestForm({ ...testForm, examType: e.target.value })}
                        >
                            <Option value="" label="Select Exam Type" disabled />
                            {Object.entries(EXAM_TYPES).map(([key, label]) => (
                                <Option key={key} value={key} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Subject *"
                            id="subject"
                            value={testForm.subject}
                            onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
                        >
                            <Option value="" label="Select Subject" disabled />
                            {assignedSubjects.map((sub) => (
                                <Option key={sub._id || sub.name} value={sub.name} label={sub.name} />
                            ))}
                        </Select>
                        <Select
                            label="Class *"
                            id="class"
                            value={testForm.class}
                            onChange={e => setTestForm({ ...testForm, class: e.target.value, section: '' })}
                        >
                            <Option value="" label="Select Class" disabled />
                            {assignedClasses.map((cls) => (
                                <Option key={cls._id || cls.name} value={cls.name} label={cls.name} />
                            ))}
                        </Select>
                        <Select
                            label="Section *"
                            id="section"
                            value={testForm.section}
                            onChange={e => setTestForm({ ...testForm, section: e.target.value })}
                        >
                            <Option value="" label="Select Section" disabled />
                            {activeClassSections.map((sec) => (
                                <Option key={sec._id || sec.name} value={sec.name} label={`Section ${sec.name}`} />
                            ))}
                        </Select>
                        <DataField
                            label="Description"
                            id="description"
                            type="textarea"
                            placeholder="Enter test description"
                            rows={2}
                            value={testForm.description}
                            onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                        />
                        <DataField
                            label="Instructions"
                            id="instructions"
                            type="textarea"
                            placeholder="Enter test instructions"
                            rows={2}
                            value={testForm.instructions}
                            onChange={e => setTestForm({ ...testForm, instructions: e.target.value })}
                        />
                    </ModalGrid>

                    {/* Test Settings */}
                    <ModalGrid title="Test Settings" cols={3}>
                        <DataField
                            label="Duration (minutes)"
                            id="duration"
                            type="number"
                            value={testForm.duration}
                            onChange={e => setTestForm({ ...testForm, duration: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={180}
                        />
                        <DataField
                            label="Total Marks"
                            id="totalMarks"
                            type="number"
                            value={testForm.totalMarks}
                            onChange={e => setTestForm({ ...testForm, totalMarks: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={500}
                        />
                        <DataField
                            label="Passing Marks"
                            id="passingMarks"
                            type="number"
                            value={testForm.passingMarks}
                            onChange={e => setTestForm({ ...testForm, passingMarks: parseInt(e.target.value) || 0 })}
                            min={0}
                            max={testForm.totalMarks}
                        />
                    </ModalGrid>

                    {/* Schedule */}
                    <ModalGrid title="Schedule" cols={2}>
                        <DataField
                            label="Start Date"
                            id="startDate"
                            type="date"
                            value={testForm.startDate}
                            onChange={e => setTestForm({ ...testForm, startDate: e.target.value })}
                        />
                        <DataField
                            label="Start Time"
                            id="startTime"
                            type="time"
                            value={testForm.startTime}
                            onChange={e => setTestForm({ ...testForm, startTime: e.target.value })}
                        />
                        <DataField
                            label="End Date"
                            id="endDate"
                            type="date"
                            value={testForm.endDate}
                            onChange={e => setTestForm({ ...testForm, endDate: e.target.value })}
                        />
                        <DataField
                            label="End Time"
                            id="endTime"
                            type="time"
                            value={testForm.endTime}
                            onChange={e => setTestForm({ ...testForm, endTime: e.target.value })}
                        />
                    </ModalGrid>

                    {/* Options */}
                    <ModalGrid title="Test Options" cols={4}>
                        <div className="flex items-center gap-3">
                            <Label text="Randomize Questions" />
                            <ToggleButton
                                checked={testForm.randomizeQuestions}
                                onChange={checked => setTestForm({ ...testForm, randomizeQuestions: checked })}
                                label="Yes"
                                labelOff="No"
                                size="sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Label text="Show Results" />
                            <ToggleButton
                                checked={testForm.showResults}
                                onChange={checked => setTestForm({ ...testForm, showResults: checked })}
                                label="Yes"
                                labelOff="No"
                                size="sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Label text="Allow Review" />
                            <ToggleButton
                                checked={testForm.allowReview}
                                onChange={checked => setTestForm({ ...testForm, allowReview: checked })}
                                label="Yes"
                                labelOff="No"
                                size="sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Label text="Allow Retake" />
                            <ToggleButton
                                checked={testForm.allowRetake}
                                onChange={checked => setTestForm({ ...testForm, allowRetake: checked })}
                                label="Yes"
                                labelOff="No"
                                size="sm"
                            />
                        </div>
                    </ModalGrid>

                    {/* Questions Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-[#1D1D1F] text-sm">Questions</h4>
                                <P text={`${testForm.questions.length} questions added`} />
                            </div>
                            <Button
                                text="Add Question"
                                variant="primary"
                                size={0}
                                icon={<Plus size={14} />}
                                onClick={() => {
                                    setQuestionForm({
                                        type: 'mcq',
                                        question: '',
                                        options: ['', '', '', ''],
                                        correctAnswer: '',
                                        marks: 1,
                                        difficulty: 'medium',
                                        explanation: '',
                                        imageUrl: '',
                                    });
                                    setEditingQuestionIndex(null);
                                    openModal('add-question-modal');
                                }}
                            />
                        </div>

                        {testForm.questions.length === 0 ? (
                            <div className="text-center py-8 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E2E8F0]">
                                <HelpCircle size={32} className="mx-auto text-[#C4CAD4]" />
                                <p className="text-sm font-semibold text-[#6B7280] mt-2">No questions added yet</p>
                                <P text="Click the Add Question button to start building your test" />
                            </div>
                        ) : (
                            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                                <DataTable
                                    columns={questionColumns}
                                    rows={testForm.questions.map((q, index) => ({ ...q, index }))}
                                    actions={questionActions}
                                    hideRecordSummary={true}
                                    hidePagination={true}
                                    searchable={false}
                                />
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-4">
                        <Label text="Status" />
                        <Select
                            value={testForm.status}
                            onChange={e => setTestForm({ ...testForm, status: e.target.value })}
                            searchable={false}
                        >
                            <Option value="draft" label="Draft" />
                            <Option value="published" label="Published" />
                            <Option value="scheduled" label="Scheduled" />
                            <Option value="cancelled" label="Cancelled" />
                        </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                        <Button
                            text={testForm.id ? 'Update Test' : 'Create Test'}
                            variant="primary"
                            type="submit"
                            size={0}
                            icon={testForm.id ? <Edit size={15} /> : <Plus size={15} />}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('create-test-modal')}
                        />
                    </div>
                </form>
            </Modal>

            {/* Add/Edit Question Modal */}
            <PanelModal id="add-question-modal" title={editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'} size="lg">
                <form onSubmit={(e) => { e.preventDefault(); handleAddQuestion(); }} className="space-y-5">
                    <ModalGrid title="Question Details" cols={2}>
                        <Select
                            label="Question Type *"
                            id="question-type"
                            value={questionForm.type}
                            onChange={e => setQuestionForm({ ...questionForm, type: e.target.value })}
                        >
                            {Object.entries(QUESTION_TYPES).map(([key, label]) => (
                                <Option key={key} value={key} label={label} />
                            ))}
                        </Select>
                        <Select
                            label="Difficulty Level"
                            id="difficulty"
                            value={questionForm.difficulty}
                            onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                        >
                            {Object.entries(DIFFICULTY_LEVELS).map(([key, label]) => (
                                <Option key={key} value={key} label={label} />
                            ))}
                        </Select>
                        <DataField
                            label="Question *"
                            id="question"
                            type="textarea"
                            placeholder="Enter the question"
                            rows={3}
                            value={questionForm.question}
                            onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                        />
                        <DataField
                            label="Marks *"
                            id="marks"
                            type="number"
                            placeholder="Marks for this question"
                            value={questionForm.marks}
                            onChange={e => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={10}
                        />
                        <DataField
                            label="Image URL (Optional)"
                            id="imageUrl"
                            placeholder="Enter image URL for the question"
                            value={questionForm.imageUrl}
                            onChange={e => setQuestionForm({ ...questionForm, imageUrl: e.target.value })}
                        />
                    </ModalGrid>

                    {/* Options for MCQ */}
                    {questionForm.type === 'mcq' && (
                        <div className="space-y-3">
                            <Label text="Options" />
                            <div className="grid grid-cols-2 gap-3">
                                {['A', 'B', 'C', 'D'].map((letter, index) => (
                                    <DataField
                                        key={letter}
                                        label={`Option ${letter}`}
                                        id={`option-${index}`}
                                        placeholder={`Enter option ${letter}`}
                                        value={questionForm.options[index] || ''}
                                        onChange={e => {
                                            const newOptions = [...questionForm.options];
                                            newOptions[index] = e.target.value;
                                            setQuestionForm({ ...questionForm, options: newOptions });
                                        }}
                                        className="mb-2"
                                    />
                                ))}
                            </div>
                            <Select
                                label="Correct Answer *"
                                id="correct-answer"
                                value={questionForm.correctAnswer}
                                onChange={e => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                            >
                                <Option value="" label="Select correct answer" disabled />
                                {questionForm.options.map((opt, i) => (
                                    opt.trim() && <Option key={i} value={opt} label={`${['A', 'B', 'C', 'D'][i]}: ${opt}`} />
                                ))}
                            </Select>
                        </div>
                    )}

                    {/* Options for True/False */}
                    {questionForm.type === 'true_false' && (
                        <div className="space-y-3">
                            <Label text="Correct Answer *" />
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setQuestionForm({ ...questionForm, correctAnswer: 'True' })}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                        questionForm.correctAnswer === 'True'
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                                            : 'bg-[#F8F9FA] text-[#6B7280] border border-[#E2E8F0] hover:bg-[#F4F7FB]'
                                    }`}
                                >
                                    True
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuestionForm({ ...questionForm, correctAnswer: 'False' })}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                        questionForm.correctAnswer === 'False'
                                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                                            : 'bg-[#F8F9FA] text-[#6B7280] border border-[#E2E8F0] hover:bg-[#F4F7FB]'
                                    }`}
                                >
                                    False
                                </button>
                            </div>
                        </div>
                    )}

                    <DataField
                        label="Explanation (Optional)"
                        id="explanation"
                        type="textarea"
                        placeholder="Add explanation or notes for this question"
                        rows={2}
                        value={questionForm.explanation}
                        onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    />

                    <div className="flex gap-3 pt-2">
                        <Button
                            text={editingQuestionIndex !== null ? 'Update Question' : 'Add Question'}
                            variant="primary"
                            type="submit"
                            size={0}
                            icon={editingQuestionIndex !== null ? <Edit size={15} /> : <Plus size={15} />}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('add-question-modal')}
                        />
                    </div>
                </form>
            </PanelModal>

            {/* View Test Modal */}
            <Modal id="view-test-modal" title="Test Details" size="2xl">
                {selectedTest && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74]">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                <FileText size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">{selectedTest.title}</p>
                                <p className="text-sm text-slate-300">
                                    {selectedTest.subject} • {EXAM_TYPES[selectedTest.examType] || selectedTest.examType} • Class {selectedTest.class}-{selectedTest.section}
                                </p>
                            </div>
                            <StatusBadge status={selectedTest.status} />
                        </div>

                        <ModalGrid title="Test Information" cols={3}>
                            <ModalData label="Exam Type" value={EXAM_TYPES[selectedTest.examType] || selectedTest.examType} />
                            <ModalData label="Subject" value={selectedTest.subject} />
                            <ModalData label="Class/Section" value={`${selectedTest.class} - ${selectedTest.section}`} />
                            <ModalData label="Duration" value={`${selectedTest.duration} minutes`} />
                            <ModalData label="Total Marks" value={`${selectedTest.totalMarks} marks`} />
                            <ModalData label="Passing Marks" value={`${selectedTest.passingMarks} marks`} />
                            <ModalData label="Start Date" value={formatDate(selectedTest.startDate)} />
                            <ModalData label="Start Time" value={formatTime(`2000-01-01T${selectedTest.startTime}`)} />
                            <ModalData label="End Date" value={formatDate(selectedTest.endDate)} />
                            <ModalData label="End Time" value={formatTime(`2000-01-01T${selectedTest.endTime}`)} />
                            <ModalData label="Questions" value={`${selectedTest.questions?.length || 0}`} />
                            <ModalData label="Attempts" value={selectedTest.attempts || 0} />
                        </ModalGrid>

                        {selectedTest.description && (
                            <ModalGrid title="Description" cols={1}>
                                <ModalData label="Description" value={selectedTest.description} />
                            </ModalGrid>
                        )}

                        {selectedTest.instructions && (
                            <ModalGrid title="Instructions" cols={1}>
                                <ModalData label="Instructions" value={selectedTest.instructions} />
                            </ModalGrid>
                        )}

                        {selectedTest.questions && selectedTest.questions.length > 0 && (
                            <ModalGrid title={`Questions (${selectedTest.questions.length})`} cols={1}>
                                <div className="space-y-3">
                                    {selectedTest.questions.map((q, index) => (
                                        <div key={index} className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1D1D1F]">
                                                        Q{index + 1}. {q.question}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        <span className="text-xs text-[#6B7280]">Type: {QUESTION_TYPES[q.type]}</span>
                                                        <span className="text-xs text-[#6B7280]">Marks: {q.marks}</span>
                                                        <span className="text-xs text-[#6B7280]">Difficulty: {DIFFICULTY_LEVELS[q.difficulty]}</span>
                                                        {q.correctAnswer && (
                                                            <span className="text-xs text-emerald-600 font-semibold">✓ {q.correctAnswer}</span>
                                                        )}
                                                    </div>
                                                    {q.options && q.options.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {q.options.map((opt, i) => (
                                                                <span key={i} className="text-xs px-2 py-0.5 bg-white rounded border border-[#E2E8F0]">
                                                                    {['A', 'B', 'C', 'D'][i]}: {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {q.explanation && (
                                                        <p className="text-xs text-[#6B7280] mt-2 italic">💡 {q.explanation}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalGrid>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                text="Close"
                                variant="secondary"
                                size={0}
                                onClick={() => closeModal('view-test-modal')}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Test Modal */}
            <PanelModal id="delete-test-modal" title="Delete Test" size="sm">
                <div className="flex flex-col items-center text-center py-4">
                    <div className="p-4 bg-rose-100 rounded-2xl mb-4">
                        <Trash2 className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-black text-[#223F74] text-lg">Delete Test</h3>
                    <P text="This action cannot be undone" size="xs" />
                    <P text="Are you sure you want to delete this test?" size="sm" />
                    {selectedTest && (
                        <div className="mt-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] w-full">
                            <p className="text-sm font-semibold text-[#1D1D1F]">{selectedTest.title}</p>
                            <p className="text-xs text-[#6B7280]">{selectedTest.subject} • {selectedTest.class}-{selectedTest.section}</p>
                        </div>
                    )}
                    <div className="flex gap-3 w-full mt-6">
                        <Button
                            text="Delete"
                            icon={<Trash2 size={14} />}
                            variant="danger"
                            size={0}
                            onClick={() => handleDeleteTest(selectedTest?._id)}
                        />
                        <Button
                            text="Cancel"
                            variant="secondary"
                            size={0}
                            onClick={() => closeModal('delete-test-modal')}
                        />
                    </div>
                </div>
            </PanelModal>

        </div>
    );
};

export default OnlineTestCreation;