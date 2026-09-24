import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';

const ToggleSwitch = ({ checked, onChange, label, description }) => {
  const darkMode = useSelector(selectIsDarkMode);
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors duration-200 ${
        darkMode
          ? 'bg-slate-850 border-slate-700 text-white'
          : 'border-gray-100 bg-gray-50 text-gray-800'
      }`}
    >
      <div>
        <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>{label}</span>
        {description && (
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-blue-600' : darkMode ? 'bg-slate-600' : 'bg-gray-300'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
