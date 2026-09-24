import React from 'react';
import { Edit, Trash2, Check, Calendar, User, Flag } from 'lucide-react';
import { format } from 'date-fns';

const TaskCard = ({ task, onEdit, onDelete, onComplete }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  };

  const statusBadges = {
    completed: { label: 'Completed', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    'in-progress': { label: 'In Progress', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    pending: { label: 'Pending', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  };

  const status = statusBadges[task.status];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg dark:text-white">{task.title}</h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit size={16} className="text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Trash2 size={16} className="text-gray-500" />
          </button>
          {task.status !== 'completed' && (
            <button
              onClick={() => onComplete(task.id)}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Check size={16} className="text-green-600" />
            </button>
          )}
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>

      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-full ${task.assignedUser.color} flex items-center justify-center text-white text-xs font-medium`}>
          {task.assignedUser.avatar}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{task.assignedUser.name}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
          <Flag size={12} className="inline mr-1" />
          {task.priority}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {format(new Date(task.dueDate), 'MMM dd, yyyy')}
        </span>
      </div>

      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>{task.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${task.progress}%` }}
          ></div>
        </div>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 mt-3">
          {task.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-400">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCard;