const tabs = [
  { key: 'password', label: 'Change Password' },
  { key: 'school', label: 'School Settings' },
  { key: 'notifications', label: 'Notification Settings' },
  { key: 'ui', label: 'UI Preferences' },
];

const SettingsTabs = ({ activeTab, onChange }) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === tab.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
      </div>
    </div>
  );
};

export default SettingsTabs;
