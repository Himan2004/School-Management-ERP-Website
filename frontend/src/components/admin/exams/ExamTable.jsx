import { Pencil, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import AdminCard from '../ui/AdminCard';
import LoadingButton from '../ui/LoadingButton';

const ExamTable = ({ rows, onEdit, onDelete }) => {
  const darkMode = useSelector(selectIsDarkMode);

  if (!rows.length) {
    return (
      <AdminCard hover={false} className="p-10 text-center text-slate-400">
        No exam schedules found.
      </AdminCard>
    );
  }

  return (
    <AdminCard
      hover={false}
      className="overflow-x-auto max-h-[560px] !p-0"
    >
      <table className="w-full">
        <thead className={`sticky top-0 z-10 text-left text-sm shadow-sm transition-colors duration-200
          ${darkMode ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}
        >
          <tr>
            <th className="px-4 py-3 font-semibold">Exam Name</th>
            <th className="px-4 py-3 font-semibold">Class</th>
            <th className="px-4 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((exam, index) => (
            <tr
              key={exam._id}
              className={`border-b last:border-b-0 transition-colors duration-150
                ${darkMode
                  ? 'border-[#334155] hover:bg-slate-850 ' + (index % 2 === 0 ? 'bg-[#1e293b]' : 'bg-slate-900/20')
                  : 'border-gray-100 hover:bg-blue-50/50 ' + (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70')
                }`}
            >
              <td className={`px-4 py-3 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{exam.examName}</td>
              <td className={`px-4 py-3 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{exam.className}</td>
              <td className={`px-4 py-3 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{exam.subject}</td>
              <td className={`px-4 py-3 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{new Date(exam.examDate).toLocaleDateString()}</td>
              <td className={`px-4 py-3 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{exam.startTime} - {exam.endTime}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <LoadingButton
                    title="Edit exam"
                    onClick={() => onEdit(exam)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150
                      ${darkMode
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </LoadingButton>
                  <LoadingButton
                    title="Delete exam"
                    onClick={() => onDelete(exam)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150
                      ${darkMode
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </LoadingButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminCard>
  );
};

export default ExamTable;
