import React from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ title, tasks, onEdit, onDelete, onComplete, onAddTask }) => {
  const columnColors = {
    'Pending': 'border-t-amber-500',
    'In Progress': 'border-t-blue-500',
    'Completed': 'border-t-green-500'
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
      <div className={`flex justify-between items-center mb-4 pb-2 border-t-4 ${columnColors[title]} pt-2`}>
        <h3 className="font-semibold text-gray-700 dark:text-gray-300">
          {title} <span className="text-sm text-gray-500">({tasks.length})</span>
        </h3>
        {title === 'Pending' && (
          <button
            onClick={onAddTask}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No tasks in {title.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;