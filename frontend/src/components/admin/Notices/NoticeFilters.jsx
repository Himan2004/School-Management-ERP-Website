import React from 'react';
import { Filter, Calendar, Users, AlertTriangle } from 'lucide-react';

const NoticeFilters = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'pinned', label: 'Pinned', icon: null },
    { id: 'recent', label: 'Recent', icon: null },
    { id: 'expired', label: 'Expired', icon: null }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="date"
            placeholder="Filter by date"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option>All Audiences</option>
            <option>Students</option>
            <option>Teachers</option>
            <option>Parents</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option>All Status</option>
            <option>Active</option>
            <option>Expired</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default NoticeFilters;