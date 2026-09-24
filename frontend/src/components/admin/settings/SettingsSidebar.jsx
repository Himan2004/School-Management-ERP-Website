import { Bell, KeyRound, School } from 'lucide-react';

const items = [
  { key: 'password', label: 'Password', icon: KeyRound },
  { key: 'school', label: 'School Settings', icon: School },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

const SettingsSidebar = ({ activeTab, onChange }) => {
  return (
    <div className="rounded-xl border p-3 shadow-md transition-all duration-200 border-gray-100 bg-white">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`group inline-flex min-w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsSidebar;
