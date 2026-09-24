import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  BookOpen,
  Eye,
  UserCheck,
  FileText,
  Search,
  ArrowUpDown,
  Grid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/teacher/Card';
import { getTeacherClassesApi } from '../../services/api/teacherApi';

// ─── Backend shape returned by getMyClasses (GET /teacher/classes) ─────────
// data: [{
//   id,                // SubjectAssignment._id  → used as :id param in ClassDetails route
//   classId,           // Class._id
//   className,         // e.g. "Grade 10"
//   section,           // e.g. "A" or ""
//   subject,           // subjectName
//   subjectId,
//   students,          // count (number)
//   nextClass,         // "Today 09:00 AM" | "Tomorrow 11:00 AM" | "N/A"
//   pendingAssignments,// number
//   averageGrade,      // always "N/A" (no exam model wired yet)
// }]
// ────────────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-green-500 to-emerald-500',
  'from-yellow-500 to-orange-500',
  'from-indigo-500 to-purple-500',
];

const TeacherClasses = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'students'

  // ── Fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getTeacherClassesApi();
        
        if (response?.success) {
          setClasses(response.data || []);
        }
      } catch (err) {
        const msg = err?.message || 'Failed to load classes';
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  // Build display label: "Grade 10 - A" or "Grade 10" when section is empty
  const getDisplayName = (cls) =>
    [cls.className, cls.section].filter(Boolean).join(' - ');

  const filteredClasses = classes
    .filter(
      (cls) =>
        getDisplayName(cls).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return getDisplayName(a).localeCompare(getDisplayName(b));
      if (sortBy === 'students') return (b.students || 0) - (a.students || 0);
      return 0;
    });

  const toggleSort = () => {
    setSortBy(prev => prev === 'name' ? 'students' : 'name');
    toast.success(`Sorted by ${sortBy === 'name' ? 'Total Students' : 'Class Name'}`);
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 ">My Classes</h1>
          <p className="mt-1 text-gray-500 ">
            Manage your assigned classes and track progress
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="animate-pulse text-sm text-gray-400">Loading classes…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 ">My Classes</h1>
          <p className="mt-1 text-gray-500 ">
            Manage your assigned classes and track progress
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900  transition-colors">My Classes</h1>
          <p className="mt-1 text-gray-500 ">
            Manage your assigned classes and track progress
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100  p-1.5 rounded-xl border border-gray-200  transition-colors">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                : 'text-gray-600  hover:bg-white '
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                : 'text-gray-600  hover:bg-white '
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors" />
          <input
            type="text"
            placeholder="Search classes or subjects…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200  bg-white  py-2.5 pl-10 pr-4 text-gray-700 
              focus:outline-none focus:ring-2 focus:ring-blue-500/40  focus:border-blue-500 transition-all"
          />
        </div>
        <button 
          onClick={toggleSort}
          className="flex items-center rounded-xl border border-gray-200  px-4 py-2.5 bg-white  text-gray-700  hover:bg-gray-50  transition-all font-medium"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          {sortBy === 'name' ? 'Sort by Students' : 'Sort by Name'}
        </button>
      </div>

      {/* Empty state */}
      {filteredClasses.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50  rounded-3xl border border-dashed border-gray-200 ">
          <BookOpen className="w-12 h-12 text-gray-300  mb-3" />
          <p className="text-gray-500 font-medium">
            {searchTerm
              ? 'No classes match your search.'
              : 'No classes assigned yet.'}
          </p>
        </div>
      )}

      {/* ── GRID VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && filteredClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classItem, index) => {
            const gradient = GRADIENTS[index % GRADIENTS.length];
            const displayName = getDisplayName(classItem);

            return (
              <Card key={String(classItem.id)} hover={true} className="group">
                {/* Coloured header */}
                <div
                  className={`h-24 bg-gradient-to-r ${gradient} p-4 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mt-8 -mr-8" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -mb-8 -ml-8" />
                  {classItem.source && (
                    <span className="absolute top-4 right-4 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/20 shadow-sm">
                      {classItem.source}
                    </span>
                  )}
                  <h3 className="text-white text-xl font-bold relative z-10 truncate">
                    {displayName}
                  </h3>
                  <p className="text-white/80 relative z-10 font-medium">
                    {classItem.subject}
                  </p>
                </div>

                {/* Card body */}
                <div className="p-6">
                  {/* Students count  |  Pending assignments */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="rounded-xl bg-gray-50  p-3 text-center transition-colors">
                      <Users className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                      <span className="text-sm font-bold text-gray-900">
                        {classItem.students}
                      </span>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Students</p>
                    </div>
                    <div className="rounded-xl bg-gray-50  p-3 text-center transition-colors">
                      <FileText className="mx-auto mb-1 h-4 w-4 text-purple-500" />
                      <span className="text-sm font-bold text-gray-900 ">
                        {classItem.pendingAssignments}
                      </span>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pending</p>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center text-sm text-gray-600 ">
                      <div className="p-1.5 rounded-lg bg-blue-50  mr-3">
                        <Clock className="w-4 h-4 text-blue-600 " />
                      </div>
                      <span>Next: <span className="font-semibold text-gray-900 ">{classItem.nextClass || 'N/A'}</span></span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 ">
                      <div className="p-1.5 rounded-lg bg-emerald-50  mr-3">
                        <UserCheck className="w-4 h-4 text-emerald-600 " />
                      </div>
                      <span>Avg. Grade: <span className="font-semibold text-gray-900 ">{classItem.averageGrade || 'N/A'}</span></span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 ">
                    <Link
                      to={`/teacher/class/${classItem.id}`}
                      className="col-span-1"
                    >
                      <button className="flex w-full items-center justify-center rounded-xl bg-gray-50  p-2.5 hover:bg-blue-50  text-gray-500  hover:text-blue-600  transition-all">
                        <Eye className="w-5 h-5" />
                      </button>
                    </Link>
                    <button 
                      onClick={() => navigate('/teacher/attendance', { state: { classId: classItem.classId, section: classItem.section } })}
                      className="flex w-full items-center justify-center rounded-xl bg-gray-50  p-2.5 hover:bg-emerald-50  text-gray-500  hover:text-emerald-600  transition-all"
                    >
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => navigate('/teacher/assignments', { state: { classFilter: getDisplayName(classItem) } })}
                      className="flex w-full items-center justify-center rounded-xl bg-gray-50  p-2.5 hover:bg-purple-50  text-gray-500  hover:text-purple-600  transition-all"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' && filteredClasses.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50  border-b border-gray-200 ">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 ">Class</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 ">Subject</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500  text-center">Students</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500  text-center">Assignments</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 ">Next Class</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500  text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 ">
                {filteredClasses.map((classItem) => {
                  const displayName = getDisplayName(classItem);
                  return (
                    <tr
                      key={String(classItem.id)}
                      className="transition-colors hover:bg-gray-50 "
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 ">{displayName}</span>
                          {classItem.source && (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-md border border-blue-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              {classItem.source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700  font-medium">
                        {classItem.subject}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100  text-blue-800 ">
                          {classItem.students}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100  text-purple-800 ">
                          {classItem.pendingAssignments}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600  text-sm">
                        {classItem.nextClass || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Link to={`/teacher/class/${classItem.id}`}>
                            <button className="p-2 rounded-lg bg-gray-100  text-gray-500  hover:text-blue-500 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => navigate('/teacher/attendance', { state: { classId: classItem.classId, section: classItem.section } })}
                            className="p-2 rounded-lg bg-gray-100  text-gray-500  hover:text-emerald-500 transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => navigate('/teacher/assignments', { state: { classFilter: getDisplayName(classItem) } })}
                            className="p-2 rounded-lg bg-gray-100  text-gray-500  hover:text-purple-500 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherClasses;
