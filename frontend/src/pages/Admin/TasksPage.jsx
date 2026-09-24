import React, { useState, useMemo } from 'react';
import { Plus, List, Kanban, Search, Filter, ArrowUpDown } from 'lucide-react';
import TaskStats from '../../components/admin/Tasks/TaskStats';
import TaskCard from '../../components/admin/Tasks/TaskCard';
import TaskModal from '../../components/admin/Tasks/TaskModal';
import KanbanColumn from '../../components/admin/Tasks/KanbanColumn';
import Toast from '../../components/common/Toast';
import { TaskSkeleton } from '../../components/common/LoadingSkeleton';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const initialTasks = [
  {
    id: '1',
    title: 'Prepare quarterly exam schedule',
    description: 'Create timetable and notify all teachers about exam dates and room allocations.',
    assignedUser: { name: 'Emily Clark', avatar: 'EC', color: 'bg-indigo-500' },
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
  }
];

const TasksPage = () => {
  const [tasks, setTasks] = useLocalStorage('tasks', initialTasks);
  const [viewMode, setViewMode] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    return { total, completed, pending, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, filterStatus, filterPriority]);

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === taskData.id ? taskData : t));
      showToast('Task updated successfully!', 'success');
    } else {
      setTasks(prev => [taskData, ...prev]);
      showToast('Task created successfully!', 'success');
    }
    setShowModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    showToast('Task deleted successfully!', 'info');
  };

  const handleCompleteTask = (taskId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t
    ));
    showToast('Task marked as completed!', 'success');
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
          Task Management
        </h1>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={18} />
          Create Task
        </button>
      </div>

      <TaskStats stats={stats} />

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              <Kanban size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Task Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <TaskSkeleton key={i} />)}
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
            />
          ))}
          {filteredTasks.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 dark:text-gray-500">
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
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onComplete={handleCompleteTask}
            onAddTask={() => {
              setEditingTask(null);
              setShowModal(true);
            }}
          />
          <KanbanColumn
            title="In Progress"
            tasks={filteredTasks.filter(t => t.status === 'in-progress')}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onComplete={handleCompleteTask}
          />
          <KanbanColumn
            title="Completed"
            tasks={filteredTasks.filter(t => t.status === 'completed')}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onComplete={handleCompleteTask}
          />
        </div>
      )}

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
};

export default TasksPage;