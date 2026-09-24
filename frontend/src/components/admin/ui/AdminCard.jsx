import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';

const AdminCard = ({ children, className = '', hover = true, glass = false }) => {
  const darkMode = useSelector(selectIsDarkMode);
  return (
    <div
      className={[
        'rounded-xl border p-5 transition-all duration-200',
        darkMode
          ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/20'
          : (glass
              ? 'bg-white/80 backdrop-blur-md border-white/50 shadow-[0_10px_25px_rgba(15,23,42,0.08)] text-slate-800'
              : 'bg-white border-gray-100 shadow-sm text-slate-800'),
        hover ? 'hover:-translate-y-0.5 hover:shadow-lg' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

export default AdminCard;
