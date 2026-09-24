import { AnimatePresence, motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';

const AdminModal = ({ open, onClose, children, widthClass = 'max-w-lg' }) => {
  const darkMode = useSelector(selectIsDarkMode);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full ${widthClass} rounded-2xl border p-6 shadow-xl transition-all duration-200
              ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/40' : 'border-gray-100 bg-white'}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default AdminModal;
