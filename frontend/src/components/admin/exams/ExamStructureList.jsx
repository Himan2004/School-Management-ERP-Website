import { GraduationCap, Pencil, Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import AdminCard from '../ui/AdminCard';
import LoadingButton from '../ui/LoadingButton';

const TERM_LABELS = { term1: 'Term 1', term2: 'Term 2', annual: 'Annual' };

const ExamStructureList = ({ structures = [], onEdit, onDelete }) => {
  const darkMode = useSelector(selectIsDarkMode);
  const [expanded, setExpanded] = useState(null);

  if (!structures.length) {
    return (
      <AdminCard
        hover={false}
        className="p-10 text-center"
      >
        <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
        <p className="text-sm font-medium text-slate-400">No exam structures yet</p>
        <p className="text-xs mt-1 text-slate-500 opacity-70">Click "Create Structure" to define your first exam blueprint</p>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-3">
      {structures.map((s) => {
        const isOpen = expanded === s._id;
        const totalMax = (s.subjectMarkings || []).reduce((acc, sm) => acc + (sm.totalMaxMarks || 0), 0);

        return (
          <AdminCard
            key={s._id}
            hover={false}
            className="!p-0"
          >
            {/* Row header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {s.examName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium
                      ${darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      {s.examType}
                    </span>
                    {s.term && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium
                        ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                        {TERM_LABELS[s.term] || s.term}
                      </span>
                    )}
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {s.academicYear}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      · {(s.subjectMarkings || []).length} subjects · {totalMax} marks
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <LoadingButton
                  onClick={() => onEdit(s)}
                  title="Edit structure"
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150
                    ${darkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </LoadingButton>
                <LoadingButton
                  onClick={() => onDelete(s)}
                  title="Delete structure"
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150
                    ${darkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </LoadingButton>
                <LoadingButton
                  onClick={() => setExpanded(isOpen ? null : s._id)}
                  title={isOpen ? 'Collapse' : 'Expand'}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150
                    ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </LoadingButton>
              </div>
            </div>

            {/* Expanded: subject breakdown */}
            {isOpen && (
              <div className={`px-5 pb-4 border-t transition-colors duration-200
                ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={darkMode ? 'text-slate-400' : 'text-gray-500'}>
                        <th className="text-left py-1.5 pr-4 font-medium">Subject</th>
                        <th className="text-center py-1.5 px-2 font-medium">Theory</th>
                        <th className="text-center py-1.5 px-2 font-medium">Practical</th>
                        <th className="text-center py-1.5 px-2 font-medium">Internal</th>
                        <th className="text-center py-1.5 px-2 font-medium">Total</th>
                        <th className="text-center py-1.5 px-2 font-medium text-amber-500">Passing</th>
                        <th className="text-center py-1.5 pl-2 font-medium">Optional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.subjectMarkings || []).map((sm, i) => (
                        <tr
                          key={i}
                          className={`border-t transition-colors duration-150
                            ${darkMode ? 'border-slate-700/50 text-slate-200' : 'border-gray-50 text-gray-800'}
                            ${i % 2 === 0 ? '' : darkMode ? 'bg-slate-800/30' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-2 pr-4 font-medium">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className={`w-3 h-3 flex-shrink-0 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                              {sm.subject?.subjectName || sm.subject?.name || sm.subject || 'Unknown'}
                            </div>
                          </td>
                          <td className="text-center py-2 px-2">{sm.theoryMaxMarks ?? 0}</td>
                          <td className="text-center py-2 px-2">{sm.practicalMaxMarks ?? 0}</td>
                          <td className="text-center py-2 px-2">{sm.internalMaxMarks ?? 0}</td>
                          <td className={`text-center py-2 px-2 font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {sm.totalMaxMarks ?? 0}
                          </td>
                          <td className={`text-center py-2 px-2 font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {sm.passingMarks ?? 0}
                          </td>
                          <td className="text-center py-2 pl-2">
                            {sm.isOptional ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extra info pills */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium
                    ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                    Weightage: {s.weightagePercentage ?? 100}%
                  </span>
                  {s.allowGraceMarks && (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium
                      ${darkMode ? 'bg-green-500/15 text-greenald-400' : 'bg-green-50 text-green-700'}`}>
                      Grace Marks: {s.graceMarksLimit ?? 0}
                    </span>
                  )}
                  {(s.applicableClasses || []).length > 0 && (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium
                      ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                      {s.applicableClasses.length} class{s.applicableClasses.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              </div>
            )}
          </AdminCard>
        );
      })}
    </div>
  );
};

export default ExamStructureList;
