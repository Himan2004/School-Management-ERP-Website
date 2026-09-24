import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, List, Kanban, Edit, Trash2, Check, Calendar, 
  Flag, X, Upload, CheckSquare, CheckCircle2, Clock, AlertCircle,
  User, Filter, ArrowUpDown
} from 'lucide-react';

const TaskManagement = () => {
  // Initial mock data
  const initialTasks = [
    {
      id: '1',
      title: 'Prepare quarterly exam schedule',
      description: 'Create timetable and notify all teachers about exam dates and room allocations.',
      assignedUser: { name: 'Emily Clark', avatar: 'EC', color: 'bg-blue-500' },
      dueDate: '2025-04-10',
      priority: 'high',
      status: 'in-progress',
      progress: 65,
      tags: ['academics', 'exams'],
      createdAt: '2025-03-01'
    },
    {
      id: '2',
      title: 'Review parent feedback forms',
      description: 'Analyze survey results from last PTM and prepare summary report.',
      assignedUser: { name: 'James Miller', avatar: 'JM', color: 'bg-emerald-500' },
      dueDate: '2025-04-05',
      priority: 'medium',
      status: 'pending',
      progress: 20,
      tags: ['feedback', 'reports'],
      createdAt: '2025-03-10'
    },
    {
      id: '3',
      title: 'Update student records',
      description: 'Sync new admissions data and verify all documents.',
      assignedUser: { name: 'Sarah Lee', avatar: 'SL', color: 'bg-rose-500' },
      dueDate: '2025-03-30',
      priority: 'high',
      status: 'completed',
      progress: 100,
      tags: ['admin', 'records'],
      createdAt: '2025-02-20'
    },
    {
      id: '4',
      title: 'Staff meeting agenda',
      description: 'Prepare slides and discussion points for monthly staff meeting.',
      assignedUser: { name: 'Michael Brown', avatar: 'MB', color: 'bg-amber-500' },
      dueDate: '2025-04-12',
      priority: 'low',
      status: 'pending',
      progress: 10,
      tags: ['meeting'],
      createdAt: '2025-03-15'
    },
    {
      id: '5',
      title: 'Library inventory check',
      description: 'Verify book stock and overdue items for end of term.',
      assignedUser: { name: 'Olivia Davis', avatar: 'OD', color: 'bg-sky-500' },
      dueDate: '2025-04-18',
      priority: 'medium',
      status: 'in-progress',
      progress: 45,
      tags: ['library'],
      createdAt: '2025-03-05'
    },
    {
      id: '6',
      title: 'Science Fair Planning',
      description: 'Coordinate with science department for annual science fair.',
      assignedUser: { name: 'Dr. Robert Chen', avatar: 'RC', color: 'bg-purple-500' },
      dueDate: '2025-04-25',
      priority: 'high',
      status: 'pending',
      progress: 15,
      tags: ['events', 'science'],
      createdAt: '2025-03-18'
    }
  ];

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('schoolerp_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });
  
  const [viewMode, setViewMode] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [toast, setToast] = useState(null);

  // Save to localStorage whenever tasks change
  React.useEffect(() => {
    localStorage.setItem('schoolerp_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const overdue = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    return { total, completed, pending, inProgress, overdue };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, filterStatus, filterPriority]);

  // Task CRUD operations
  const handleSaveTask = (taskData) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === taskData.id ? taskData : t));
      showToastMessage('Task updated successfully!');
    } else {
      setTasks(prev => [{ ...taskData, id: Date.now().toString() }, ...prev]);
      showToastMessage('Task created successfully!');
    }
    setShowModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showToastMessage('Task deleted successfully!', 'info');
    }
  };

  const handleCompleteTask = (taskId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t
    ));
    showToastMessage('Task marked as completed!', 'success');
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  // Helper functions for styling
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-emerald-100 text-emerald-700'
    };
    return colors[priority];
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: 'Completed', class: 'bg-green-100 text-green-700' },
      'in-progress': { label: 'In Progress', class: 'bg-blue-100 text-blue-700' },
      pending: { label: 'Pending', class: 'bg-gray-100 text-gray-700' }
    };
    return badges[status];
  };

  // Stat Card Component
  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-slate-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  // Task Card Component
  const TaskCard = ({ task }) => {
    const statusBadge = getStatusBadge(task.status);
    const priorityColor = getPriorityColor(task.priority);

    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">{task.title}</h3>
          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEditTask(task)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit task ${task.title}`}
            >
              <Edit size={16} className="text-slate-500" />
            </button>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 size={16} className="text-slate-500" />
            </button>
            {task.status !== 'completed' && (
              <button
                onClick={() => handleCompleteTask(task.id)}
                className="p-1.5 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label={`Mark task ${task.title} as completed`}
              >
                <Check size={16} className="text-green-600" />
              </button>
            )}
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{task.description}</p>

        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded-full ${task.assignedUser.color} flex items-center justify-center text-white text-xs font-medium`}>
            {task.assignedUser.avatar}
          </div>
          <span className="text-sm text-slate-600">{task.assignedUser.name}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
            <Flag size={12} className="inline mr-1" />
            {task.priority}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {task.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Kanban Column Component
  const KanbanColumn = ({ title, tasks: columnTasks, onAddTask }) => {
    const columnColors = {
      'Pending': 'border-t-amber-500',
      'In Progress': 'border-t-blue-500',
      'Completed': 'border-t-green-500'
    };

    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <div className={`flex justify-between items-center mb-4 pb-2 border-t-4 ${columnColors[title]} pt-2`}>
          <h3 className="font-semibold text-slate-700">
            {title} <span className="text-sm text-gray-500">({columnTasks.length})</span>
          </h3>
          {title === 'Pending' && onAddTask && (
            <button
              onClick={onAddTask}
              className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No tasks in {title.toLowerCase()}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Task Modal Component
  const TaskModal = () => {
    const titleInputId = 'task-modal-title-input';
    const dialogTitleId = 'task-modal-heading';
    const [formData, setFormData] = useState({
      title: editingTask?.title || '',
      description: editingTask?.description || '',
      assignedUser: editingTask?.assignedUser || { name: 'Admin User', avatar: 'AU', color: 'bg-blue-500' },
      dueDate: editingTask?.dueDate || '',
      priority: editingTask?.priority || 'medium',
      status: editingTask?.status || 'pending',
      progress: editingTask?.progress || 0,
      tags: editingTask?.tags || []
    });
    const [tagInput, setTagInput] = useState('');

    React.useEffect(() => {
      const onEscape = (e) => {
        if (e.key === 'Escape') {
          setShowModal(false);
          setEditingTask(null);
        }
      };

      window.addEventListener('keydown', onEscape);
      return () => window.removeEventListener('keydown', onEscape);
    }, []);

    const handleAddTag = () => {
      if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
        setTagInput('');
      }
    };

    const handleRemoveTag = (tagToRemove) => {
      setFormData({
        ...formData,
        tags: formData.tags.filter(tag => tag !== tagToRemove)
      });
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      handleSaveTask({
        ...formData,
        id: editingTask?.id,
        createdAt: editingTask?.createdAt || new Date().toISOString()
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-200">
            <h2 id={dialogTitleId} className="text-xl font-bold text-slate-900">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button
              onClick={() => {
                setShowModal(false);
                setEditingTask(null);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Task Title *</label>
              <input
                id={titleInputId}
                type="text"
                required
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Description</label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white"
                  placeholder="Add tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Attachment</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50/50">
                <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                <p className="text-sm text-slate-500">Click or drag file to upload</p>
                <input type="file" className="hidden" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-800 max-w-[1400px] mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <span className="text-sm font-medium text-slate-700">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Task Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track team deliverables with a clean, light workspace.</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={18} />
          Create Task
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard title="Total Tasks" value={stats.total} icon={CheckSquare} color="from-blue-500 to-indigo-500" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="from-green-500 to-emerald-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Clock} color="from-blue-500 to-cyan-500" />
        <StatCard title="Pending" value={stats.pending} icon={AlertCircle} color="from-amber-500 to-orange-500" />
        <StatCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="from-red-500 to-rose-500" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100'}`}
            >
              <Kanban size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Task Display */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-400">
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm mt-1">Try adjusting your filters or create a new task</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KanbanColumn
            title="Pending"
            tasks={filteredTasks.filter(t => t.status === 'pending')}
            onAddTask={() => {
              setEditingTask(null);
              setShowModal(true);
            }}
          />
          <KanbanColumn
            title="In Progress"
            tasks={filteredTasks.filter(t => t.status === 'in-progress')}
          />
          <KanbanColumn
            title="Completed"
            tasks={filteredTasks.filter(t => t.status === 'completed')}
          />
        </div>
      )}

      {/* Task Modal */}
      {showModal && <TaskModal />}
    </div>
  );
};

export default TaskManagement;