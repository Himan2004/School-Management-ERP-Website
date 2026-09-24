import React from 'react';
import { CheckSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const TaskStats = ({ stats }) => {
  const statCards = [
    { title: 'Total Tasks', value: stats.total, icon: CheckSquare, color: 'from-blue-500 to-indigo-500' },
    { title: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
    { title: 'Pending', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { title: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'from-red-500 to-rose-500' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {statCards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold mt-2 dark:text-white">{card.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
              <card.icon size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskStats;