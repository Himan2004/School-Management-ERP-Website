import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';

const AdminInput = ({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  as = 'input',
  children,
}) => {
  const darkMode = useSelector(selectIsDarkMode);
  const baseClass = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100
    ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder:text-slate-500' : 'border-gray-200 bg-white text-gray-850 placeholder:text-gray-400'}`;

  return (
    <div className={className}>
      {label ? <label className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{label}</label> : null}
      <div className="relative">
        {Icon ? <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> : null}
        {as === 'select' ? (
          <select value={value} onChange={onChange} className={`${baseClass} ${Icon ? 'pl-9' : ''}`}>
            {children}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${baseClass} ${Icon ? 'pl-9' : ''}`}
          />
        )}
      </div>
    </div>
  );
};

export default AdminInput;
