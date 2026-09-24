import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    Calendar,
    Users,
    Ticket,
    CheckCircle2,
    Clock,
    UserPlus,
    X,
    Trash2,
    MessageCircle,
    Send,
    ChevronDown,
    Flag,
    MoreVertical,
    ChevronRight,
    Upload,
    LayoutGrid,
    List
} from 'lucide-react';
import {
    getAllTasks,
    createTaskThunk,
    updateTaskThunk,
    deleteTaskThunk,
    selectTasks,
    selectAdminLoading,
    selectAdminError
} from '../../../features/admin/adminSlice.js';
import { selectIsDarkMode } from '../../../features/theme/themeSlice.js';
import toast from 'react-hot-toast';
import api from '../../../services/api.js';

const statusMap = {
    'todo': 'pending',
    'progress': 'in-progress',
    'review': 'in-progress',
    'done': 'completed'
};

const reverseStatusMap = {
    'pending': 'todo',
    'in-progress': 'progress',
    'completed': 'done'
};

const TaskPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const tasks = useSelector(selectTasks);
    const loading = useSelector(selectAdminLoading);
    const error = useSelector(selectAdminError);
    const darkMode = useSelector(selectIsDarkMode);

    const [activeTab, setActiveTab] = useState('kanban');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // DB Driven State
    const [classesList, setClassesList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [adminTickets, setAdminTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [highlightedTicketId, setHighlightedTicketId] = useState(null);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState([]);

    const [isOpen, setIsOpen] = useState(false);
    const [taskData, setTaskData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedClass: '',
        assignedSection: '',
        assignedSubject: ''
    });

    const [customClassName, setCustomClassName] = useState('');
    const [customSectionName, setCustomSectionName] = useState('');
    const [customSubjectName, setCustomSubjectName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // Sync tab and ticket selection from URL query parameters / state
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tabParam = queryParams.get('tab') || location.state?.activeTab;
        const ticketIdParam = queryParams.get('ticketId') || location.state?.highlightTicketId;

        if (tabParam) {
            setActiveTab(tabParam);
        }
        if (ticketIdParam) {
            setHighlightedTicketId(ticketIdParam);
        }
    }, [location]);

    const handleTicketClick = (ticketId) => {
        setHighlightedTicketId(ticketId);
        navigate(`/admin/tasks?tab=tickets&ticketId=${ticketId}`, { replace: true });
    };

    // Load tasks, classes, subjects, tickets on mount
    useEffect(() => {
        dispatch(getAllTasks());
        
        // Fetch classes
        api.get('/admin/academic/classes-sections')
            .then(res => {
                setClassesList(res.data?.data || []);
            })
            .catch(err => console.error('Error fetching classes:', err));

        // Fetch subjects
        api.get('/admin/academic/subjects')
            .then(res => {
                setSubjectsList(res.data?.data || []);
            })
            .catch(err => console.error('Error fetching subjects:', err));

        // Fetch tickets
        setTicketsLoading(true);
        api.get('/admin/tickets')
            .then(res => {
                setAdminTickets(res.data?.data || []);
            })
            .catch(err => console.error('Error fetching tickets:', err))
            .finally(() => setTicketsLoading(false));
    }, [dispatch]);

    const handleAssignment = (e) => {
        e.preventDefault();
        if (!taskData.title) {
            toast.error('Task title is required');
            return;
        }
        if (!taskData.dueDate) {
            toast.error('Due date is required');
            return;
        }

        const finalClass = taskData.assignedClass === 'Custom' ? customClassName : taskData.assignedClass;
        const finalSection = taskData.assignedSection === 'Custom' ? customSectionName : taskData.assignedSection;
        const finalSubject = taskData.assignedSubject === 'Custom' ? customSubjectName : taskData.assignedSubject;

        if (!finalClass) {
            toast.error('Class selection is required');
            return;
        }

        // Prepare FormData for multipart upload
        const formData = new FormData();
        formData.append('title', taskData.title);
        formData.append('description', taskData.description);
        formData.append('priority', taskData.priority);
        formData.append('dueDate', taskData.dueDate);
        formData.append('status', 'pending');
        formData.append('assignedClass', finalClass);
        formData.append('assignedSection', finalSection || '');
        formData.append('assignedSubject', finalSubject || '');
        if (selectedFile) {
            formData.append('file', selectedFile);
        }

        dispatch(createTaskThunk(formData))
            .unwrap()
            .then(() => {
                toast.success('Task created successfully');
                setIsOpen(false);
                setTaskData({
                    title: '',
                    description: '',
                    priority: 'medium',
                    dueDate: '',
                    assignedClass: '',
                    assignedSection: '',
                    assignedSubject: ''
                });
                setCustomClassName('');
                setCustomSectionName('');
                setCustomSubjectName('');
                setSelectedFile(null);
                dispatch(getAllTasks());
                setActiveTab('kanban');
            })
            .catch(err => toast.error(err?.message || 'Failed to create task'));
    };

    // Convert backend status to frontend display status
    const displayTasks = tasks.map(t => ({
        ...t,
        status: reverseStatusMap[t.status] || t.status
    }));

    const filteredTasks = displayTasks.filter(task => {
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesPriority;
    });

    const todoTasks = filteredTasks.filter(t => t.status === 'todo');
    const progressTasks = filteredTasks.filter(t => t.status === 'progress');
    const reviewTasks = filteredTasks.filter(t => t.status === 'review');
    const doneTasks = filteredTasks.filter(t => t.status === 'done');

    // Open task detail modal
    const openTaskDetail = (task) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    // Update task status from modal
    const updateTaskStatus = (newStatus) => {
        if (!selectedTask) return;
        
        const backendStatus = statusMap[newStatus] || newStatus;
        dispatch(updateTaskThunk({
            id: selectedTask.id || selectedTask._id,
            status: backendStatus
        }))
            .unwrap()
            .then(() => {
                toast.success('Task updated successfully');
                setSelectedTask({ ...selectedTask, status: newStatus });
                dispatch(getAllTasks());
            })
            .catch(err => toast.error(err?.message || 'Failed to update task'));
    };

    // Delete task
    const deleteTask = () => {
        if (!selectedTask) return;
        
        if (window.confirm("Delete this task permanently?")) {
            dispatch(deleteTaskThunk(selectedTask.id || selectedTask._id))
                .unwrap()
                .then(() => {
                    toast.success('Task deleted successfully');
                    setShowTaskModal(false);
                    setSelectedTask(null);
                    dispatch(getAllTasks());
                })
                .catch(err => toast.error(err?.message || 'Failed to delete task'));
        }
    };

    // Add comment
    const addComment = () => {
        if (!newComment.trim()) return;
        setComments([...comments, {
            id: Date.now(),
            user: "You (Dept Admin)",
            text: newComment,
            time: "Just now"
        }]);
        setNewComment('');
    };

    // Update ticket status
    const handleUpdateTicketStatus = async (ticketId, newStatus) => {
        try {
            const res = await api.patch(`/admin/tickets/${ticketId}/status`, { status: newStatus });
            if (res.data?.success) {
                toast.success('Ticket status updated');
                // Refresh tickets list
                const ticketsRes = await api.get('/admin/tickets');
                setAdminTickets(ticketsRes.data?.data || []);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update ticket status');
        }
    };

    // HTML5 Drag & Drop Handlers
    const onDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const onDrop = (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        const backendStatus = statusMap[newStatus] || newStatus;
        
        dispatch(updateTaskThunk({
            id: taskId,
            status: backendStatus
        }))
            .unwrap()
            .then(() => {
                toast.success('Task status updated');
                dispatch(getAllTasks());
            })
            .catch(err => toast.error(err?.message || 'Failed to move task'));
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    // Animation helper class
    const cardAnimation = "transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-95";

    return (
        <div className={`min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-200 
            ${darkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800'}`}>
            
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">

                {/* LEFT */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-inner">📋</div>
                    <div>
                        <h1 className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tighter transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Task Center
                        </h1>
                        <p className={`flex items-center gap-2 text-sm sm:text-base transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Department Admin • Branch 1
                        </p>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">

                    {/* Filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className={`border rounded-3xl px-4 py-3 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20
                            ${darkMode ? 'bg-slate-800 border-[#334155] text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-750 focus:border-blue-500'}`}
                    >
                        <option value="all">All</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    {/* Button */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white px-5 py-3 rounded-3xl text-sm font-semibold shadow-md shadow-blue-600/10"
                    >
                        <Plus className="w-4 h-4" />
                        New
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className={`flex text-sm overflow-x-auto no-scrollbar rounded-3xl p-1 shadow-inner mb-10 border transition-all 
                ${darkMode ? 'bg-slate-800/40 border-[#334155]' : 'bg-white border-slate-100'}`}>
                <button
                    onClick={() => setActiveTab('kanban')}
                    className={`px-8 py-4 font-semibold rounded-3xl flex items-center gap-3 transition-all 
                        ${activeTab === 'kanban' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : (darkMode ? 'text-slate-350 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                    <LayoutGrid className="w-5 h-5" />
                    Kanban
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-8 py-4 font-semibold rounded-3xl flex items-center gap-3 transition-all 
                        ${activeTab === 'list' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : (darkMode ? 'text-slate-355 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                    <List className="w-5 h-5" />
                    List
                </button>
                <button
                    onClick={() => setActiveTab('student')}
                    className={`px-8 py-4 font-semibold rounded-3xl flex items-center gap-3 transition-all 
                        ${activeTab === 'student' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : (darkMode ? 'text-slate-355 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                    <Users className="w-5 h-5" />
                    Student
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`px-8 py-4 font-semibold rounded-3xl flex items-center gap-3 transition-all 
                        ${activeTab === 'tickets' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : (darkMode ? 'text-slate-355 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                    <Ticket className="w-5 h-5" />
                    Tickets
                </button>
            </div>

            {/* KANBAN VIEW */}
            {activeTab === 'kanban' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* TO DO */}
                    <div onDrop={(e) => onDrop(e, 'todo')} onDragOver={onDragOver} 
                        className={`rounded-3xl p-6 shadow-sm min-h-[620px] border transition-all 
                            ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white border-slate-100'}`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                <span className={`font-bold text-sm transition-colors ${darkMode ? 'text-white' : 'text-slate-850'}`}>To Do</span>
                            </div>
                            <span className={`px-5 py-1 rounded-3xl text-sm font-semibold transition-colors 
                                ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                {todoTasks.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {todoTasks.map(task => (
                                <div
                                    key={task.id || task._id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id || task._id)}
                                    onClick={() => openTaskDetail(task)}
                                    className={`border p-6 rounded-3xl cursor-grab active:cursor-grabbing ${cardAnimation} 
                                        ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-[#334155] text-white shadow-slate-950/20' : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 text-slate-800'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-lg leading-tight">{task.title}</div>
                                        <Flag className={`w-5 h-5 flex-shrink-0 ${task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <span className={`text-xs uppercase font-medium px-4 py-2 shadow-sm rounded-3xl transition-colors ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}`}>{task.category || 'general'}</span>
                                        <span className={`text-xs ml-auto transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* IN PROGRESS */}
                    <div onDrop={(e) => onDrop(e, 'progress')} onDragOver={onDragOver} 
                        className={`rounded-3xl p-6 shadow-sm min-h-[620px] border transition-all 
                            ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white border-slate-100'}`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                                <span className={`font-bold text-sm transition-colors ${darkMode ? 'text-white' : 'text-slate-850'}`}>In Progress</span>
                            </div>
                            <span className={`px-5 py-1 rounded-3xl text-sm font-semibold transition-colors 
                                ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                {progressTasks.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {progressTasks.map(task => (
                                <div
                                    key={task.id || task._id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id || task._id)}
                                    onClick={() => openTaskDetail(task)}
                                    className={`border p-6 rounded-3xl cursor-grab active:cursor-grabbing ${cardAnimation} 
                                        ${darkMode ? 'bg-gradient-to-br from-slate-850 to-slate-900 border-[#334155] text-white shadow-slate-950/20' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-100 text-slate-800'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-lg leading-tight">{task.title}</div>
                                        <Flag className={`w-5 h-5 flex-shrink-0 ${task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <span className={`text-xs uppercase font-medium px-4 py-2 shadow-sm rounded-3xl transition-colors ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}`}>{task.category || 'general'}</span>
                                        <span className={`text-xs ml-auto transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* REVIEW */}
                    <div onDrop={(e) => onDrop(e, 'review')} onDragOver={onDragOver} 
                        className={`rounded-3xl p-6 shadow-sm min-h-[620px] border transition-all 
                            ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white border-slate-100'}`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                                <span className={`font-bold text-sm transition-colors ${darkMode ? 'text-white' : 'text-slate-850'}`}>Review</span>
                            </div>
                            <span className={`px-5 py-1 rounded-3xl text-sm font-semibold transition-colors 
                                ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                                {reviewTasks.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {reviewTasks.map(task => (
                                <div
                                    key={task.id || task._id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id || task._id)}
                                    onClick={() => openTaskDetail(task)}
                                    className={`border p-6 rounded-3xl cursor-grab active:cursor-grabbing ${cardAnimation} 
                                        ${darkMode ? 'bg-gradient-to-br from-slate-850 to-slate-900 border-[#334155] text-white shadow-slate-950/20' : 'bg-gradient-to-br from-purple-50/40 to-white border-purple-100 text-slate-800'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-lg leading-tight">{task.title}</div>
                                        <Flag className={`w-5 h-5 flex-shrink-0 ${task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <span className={`text-xs uppercase font-medium px-4 py-2 shadow-sm rounded-3xl transition-colors ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}`}>{task.category || 'general'}</span>
                                        <span className={`text-xs ml-auto transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DONE */}
                    <div onDrop={(e) => onDrop(e, 'done')} onDragOver={onDragOver} 
                        className={`rounded-3xl p-6 shadow-sm min-h-[620px] border transition-all 
                            ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white border-slate-100'}`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                                <span className={`font-bold text-sm transition-colors ${darkMode ? 'text-white' : 'text-slate-850'}`}>Done</span>
                            </div>
                            <span className={`px-5 py-1 rounded-3xl text-sm font-semibold transition-colors 
                                ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                {doneTasks.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {doneTasks.map(task => (
                                <div
                                    key={task.id || task._id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id || task._id)}
                                    onClick={() => openTaskDetail(task)}
                                    className={`border p-6 rounded-3xl cursor-grab active:cursor-grabbing ${cardAnimation} opacity-80 
                                        ${darkMode ? 'bg-gradient-to-br from-slate-850 to-slate-900 border-[#334155] text-white shadow-slate-950/20' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-100 text-slate-800'}`}
                                >
                                    <div className="font-semibold text-lg line-through">{task.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {activeTab === 'list' && (
                <div className={`rounded-3xl shadow-xl overflow-hidden animate-in border transition-all 
                    ${darkMode ? 'bg-[#1e293b] border-[#334155] shadow-slate-950/30' : 'bg-white border-slate-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className={`border-b transition-colors ${darkMode ? 'border-[#334155] bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                                    <th className={`text-left py-7 px-8 font-semibold transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Task</th>
                                    <th className={`text-left py-7 px-8 font-semibold transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</th>
                                    <th className={`text-left py-7 px-8 font-semibold transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Priority</th>
                                    <th className={`text-left py-7 px-8 font-semibold transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due Date</th>
                                    <th className="w-32"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map(task => (
                                    <tr 
                                        key={task.id || task._id} 
                                        className={`border-b transition-all cursor-pointer ${darkMode ? 'border-[#334155] hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`} 
                                        onClick={() => openTaskDetail(task)}
                                    >
                                        <td className="py-7 px-8 font-medium">{task.title}</td>
                                        <td className="py-7 px-8">
                                            <span className={`capitalize text-xs px-6 py-2 rounded-3xl transition-colors ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                {task.category || 'general'}
                                            </span>
                                        </td>
                                        <td className="py-7 px-8">
                                            <span className={`px-6 py-2 text-xs font-medium rounded-3xl transition-colors 
                                                ${task.priority === 'high' 
                                                    ? (darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') 
                                                    : task.priority === 'medium' 
                                                    ? (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') 
                                                    : (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className={`py-7 px-8 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</td>
                                        <td className="py-7 px-8">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); deleteTask(); }} className="text-red-450 hover:text-red-650 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STUDENT VIEW */}
            {activeTab === 'student' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in">
                    {displayTasks.filter(t => t.assignedClass).map(task => (
                        <div 
                            key={task.id || task._id} 
                            className={`p-6 rounded-[2rem] border shadow-sm transition-all ${cardAnimation} 
                                ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-colors
                                    ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    {(task.assignedSubject || "Task").charAt(0).toUpperCase()}
                                </div>
                                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors 
                                    ${task.priority === 'high' ? (darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') : (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')}`}>
                                    {task.priority}
                                </span>
                            </div>
                            <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{task.title}</h3>
                            <p className={`text-sm mb-2 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Class: {task.assignedClass} {task.assignedSection ? `- ${task.assignedSection}` : ''}
                            </p>
                            <p className={`text-sm mb-4 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Subject: {task.assignedSubject || "General"}
                            </p>
                            <div className={`p-4 rounded-2xl mb-4 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`font-medium flex items-center gap-2 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <Clock className="w-4 h-4 text-blue-500" /> {task.description}
                                </p>
                            </div>
                            <div className={`flex justify-between items-center text-sm transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors 
                                    ${task.status === 'completed' || task.status === 'done'
                                        ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') 
                                        : (darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700')}`}>
                                    {task.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="w-full max-w-2xl">
                        {!isOpen ? (
                            <div
                                onClick={() => setIsOpen(true)}
                                className={`border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-8 transition-all cursor-pointer h-full min-h-[220px]
                                    ${darkMode ? 'border-[#334155] hover:border-blue-500 text-slate-400 hover:text-blue-450 bg-slate-800/40' : 'border-slate-200 hover:border-blue-300 hover:text-blue-400 bg-white'}`}
                            >
                                <UserPlus className="w-10 h-10 mb-2" />
                                <span className="font-semibold text-lg">Assign Student Task</span>
                                <p className="text-sm opacity-60">Homework, Class Projects, or Assignments</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* TICKETS VIEW */}
            {activeTab === 'tickets' && (
                <div className="space-y-4 animate-in">
                    {ticketsLoading ? (
                        <div className="text-center py-8">
                            <Clock className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                            <p className="text-sm text-gray-500">Loading tickets...</p>
                        </div>
                    ) : adminTickets.length === 0 ? (
                        <div className="text-center py-8">
                            <Ticket className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No support tickets found</p>
                        </div>
                    ) : (
                        adminTickets.map(ticket => {
                            const isHighlighted = highlightedTicketId === (ticket.id || ticket._id);
                            return (
                                <div 
                                    key={ticket.id || ticket._id} 
                                    onClick={() => handleTicketClick(ticket.id || ticket._id)}
                                    className={`p-6 rounded-3xl border shadow-sm flex items-center gap-6 transition-all ${cardAnimation} cursor-pointer
                                        ${isHighlighted 
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' 
                                            : (darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800')
                                        }`}
                                >
                                    <div className={`w-3 h-12 rounded-full ${ticket.priority === 'high' || ticket.priority === 'critical' ? 'bg-red-500' : ticket.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Ticket #{ticket.ticketNo || (ticket.id || ticket._id)?.toString().substring(18).toUpperCase()}</span>
                                            <span className={`text-xs transition-colors ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
                                            <span className={`text-xs transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{ticket.time || (ticket.createdDate ? new Date(ticket.createdDate).toLocaleDateString() : '')}</span>
                                            {isHighlighted && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white animate-pulse">
                                                    Active Ticket
                                                </span>
                                            )}
                                        </div>
                                        <h3 className={`text-lg font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ticket.title}</h3>
                                        <p className={`text-sm mb-2 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ticket.description}</p>
                                        <p className={`flex items-center gap-1.5 text-xs font-semibold capitalize transition-colors ${darkMode ? 'text-slate-450' : 'text-slate-660'}`}>
                                            Category: <span className="text-blue-500 font-bold">{ticket.category}</span>
                                        </p>
                                        <p className={`flex items-center gap-1 text-sm mt-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <Users className="w-4 h-4" /> Raised by: <span className="font-semibold">{ticket.sender}</span> ({ticket.senderRole})
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <select
                                            value={ticket.status}
                                            onChange={(e) => handleUpdateTicketStatus(ticket.id || ticket._id, e.target.value)}
                                            className={`border rounded-xl px-3 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer focus:outline-none 
                                                ${ticket.status === 'open' 
                                                    ? (darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-250') 
                                                    : ticket.status === 'in_progress' 
                                                    ? (darkMode ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-600 border-purple-250') 
                                                    : (darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-250')}`}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TASK DETAIL MODAL */}
            {showTaskModal && selectedTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999]">
                    <div className={`w-full max-w-2xl mx-4 rounded-3xl p-10 shadow-2xl border transition-all 
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-900/50' : 'bg-white border-slate-100 text-slate-800'}`}>
                        <div className="flex justify-between items-start">
                            <h2 className="text-3xl font-bold leading-tight">{selectedTask.title}</h2>
                            <button onClick={() => setShowTaskModal(false)} className={`transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-450 hover:text-slate-650'}`}><X className="w-7 h-7" /></button>
                        </div>

                        {/* Status selector */}
                        <div className="mt-8 flex gap-3">
                            {['todo', 'progress', 'review', 'done'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateTaskStatus(status)}
                                    className={`flex-1 py-3 rounded-3xl text-sm font-semibold capitalize transition-all 
                                        ${selectedTask.status === status 
                                            ? 'bg-blue-600 text-white shadow-lg' 
                                            : (darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* Comments section */}
                        <div className="mt-10">
                            <h4 className="font-semibold flex items-center gap-2 mb-4"><MessageCircle className="w-5 h-5" /> Comments</h4>
                            <div className="max-h-80 overflow-auto space-y-6 pr-4">
                                {comments.map(c => (
                                    <div key={c.id} className="flex gap-4">
                                        <div className={`text-xs font-medium px-4 py-2 rounded-3xl self-start transition-colors ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{c.user}</div>
                                        <div className="flex-1">
                                            <p className={`transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{c.text}</p>
                                            <p className={`text-xs mt-1 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{c.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add comment */}
                            <div className="mt-8 flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className={`flex-1 border rounded-3xl px-6 py-4 focus:outline-none transition-all 
                                        ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-450 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500'}`}
                                />
                                <button onClick={addComment} className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-8 rounded-3xl transition-all"><Send className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-12">
                            <button onClick={deleteTask} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold transition-colors"><Trash2 className="w-5 h-5" /> Delete Task</button>
                            <button onClick={() => setShowTaskModal(false)} className={`px-12 py-4 rounded-3xl transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border border-[#334155]' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TASK CREATION MODAL */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9998] p-4">
                    <div className={`rounded-[2rem] border p-6 sm:p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all 
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-900/50' : 'bg-white border-slate-200 text-slate-800'}`}>
                        
                        {/* Header (fixed) */}
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h3 className="text-xl font-bold">New Task Assignment</h3>
                            <button onClick={() => setIsOpen(false)} className={`text-2xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-450 hover:text-red-500'}`}>✕</button>
                        </div>

                        {/* Form (flex layout) */}
                        <form onSubmit={handleAssignment} className="flex flex-col flex-1 overflow-hidden min-h-0">
                            
                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 min-h-0 pb-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Task Title (e.g., Algebra Quiz)"
                                        className={`col-span-2 p-3 rounded-xl border focus:outline-blue-500 transition-all 
                                            ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}
                                        value={taskData.title}
                                        onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                                        required
                                    />
                                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                                        <select
                                            className={`p-3 rounded-xl border transition-colors cursor-pointer focus:outline-none ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                            value={taskData.assignedClass}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTaskData(prev => ({
                                                    ...prev,
                                                    assignedClass: val,
                                                    assignedSection: ''
                                                }));
                                            }}
                                            required
                                        >
                                            <option value="">Select Class</option>
                                            {classesList.map(c => (
                                                <option key={c.id || c._id} value={c.name}>{c.name}</option>
                                            ))}
                                            <option value="Custom">Custom Class</option>
                                        </select>
                                        {taskData.assignedClass === 'Custom' && (
                                            <input
                                                type="text"
                                                placeholder="Enter Custom Class Name"
                                                className={`p-3 rounded-xl border focus:outline-blue-500 transition-all 
                                                    ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}
                                                value={customClassName}
                                                onChange={(e) => setCustomClassName(e.target.value)}
                                                required
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                                        <select
                                            className={`p-3 rounded-xl border transition-colors cursor-pointer focus:outline-none ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                            value={taskData.assignedSection}
                                            onChange={(e) => setTaskData(prev => ({ ...prev, assignedSection: e.target.value }))}
                                            disabled={!taskData.assignedClass || taskData.assignedClass === 'Custom'}
                                        >
                                            <option value="">Select Section (All)</option>
                                            {classesList.find(c => c.name === taskData.assignedClass)?.sections?.map(s => (
                                                <option key={s.id || s._id || s.name} value={s.name}>{s.name}</option>
                                            ))}
                                            {taskData.assignedClass && taskData.assignedClass !== 'Custom' && (
                                                <option value="Custom">Custom Section</option>
                                            )}
                                        </select>
                                        {taskData.assignedSection === 'Custom' && (
                                            <input
                                                type="text"
                                                placeholder="Enter Custom Section Name"
                                                className={`p-3 rounded-xl border focus:outline-blue-500 transition-all 
                                                    ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}
                                                value={customSectionName}
                                                onChange={(e) => setCustomSectionName(e.target.value)}
                                                required
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-2 flex flex-col gap-2">
                                        <select
                                            className={`p-3 rounded-xl border transition-colors cursor-pointer focus:outline-none ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                            value={taskData.assignedSubject}
                                            onChange={(e) => setTaskData(prev => ({ ...prev, assignedSubject: e.target.value }))}
                                            required
                                        >
                                            <option value="">Select Subject</option>
                                            {subjectsList.map(s => (
                                                <option key={s._id} value={s.subjectName || s.name}>{s.subjectName || s.name}</option>
                                            ))}
                                            <option value="Custom">Custom Subject</option>
                                        </select>
                                        {taskData.assignedSubject === 'Custom' && (
                                            <input
                                                type="text"
                                                placeholder="Enter Custom Subject Name"
                                                className={`p-3 rounded-xl border focus:outline-blue-500 transition-all 
                                                    ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}
                                                value={customSubjectName}
                                                onChange={(e) => setCustomSubjectName(e.target.value)}
                                                required
                                            />
                                        )}
                                    </div>
                                </div>

                                <textarea
                                    placeholder="Instructions for students..."
                                    className={`w-full p-3 h-28 sm:h-32 rounded-xl border focus:outline-blue-500 transition-all 
                                        ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}
                                    value={taskData.description}
                                    onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                                />

                                <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${darkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                                    <Calendar className="text-blue-500" size={20} />
                                    <label className={`text-sm font-medium transition-colors ${darkMode ? 'text-slate-350' : 'text-slate-650'}`}>Deadline:</label>
                                    <input
                                        type="datetime-local"
                                        className={`bg-transparent focus:outline-none transition-colors cursor-pointer text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
                                        value={taskData.dueDate}
                                        onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-dashed border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-600 transition-all">
                                        <Upload size={20} className="text-blue-500" />
                                        <span className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedFile ? selectedFile.name : 'Attach Study Material'}
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className={`flex-shrink-0 flex items-center justify-between pt-4 border-t transition-all 
                                ${darkMode ? 'border-[#334155]' : 'border-slate-100'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border 
                                        ${darkMode ? 'border-[#334155] text-slate-350 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }}
                                    className="active:scale-95 px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:opacity-95 shadow-md shadow-indigo-650/10 cursor-pointer"
                                >
                                    <Send size={18} />
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .animate-in { animation: fadeInUp 0.4s ease forwards; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

        </div>
    );
};

export default TaskPage;