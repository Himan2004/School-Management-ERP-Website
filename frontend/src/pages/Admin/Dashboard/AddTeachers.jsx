import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Trash2, Mail, CheckCircle, Search,
  User, BookMarked, UserPlus, School, AlertCircle
} from 'lucide-react';
import {
  getAllTeachers, createTeacher, assignTeacher, deleteTeacher,
  selectTeachers, selectAdminLoading, selectAdminError,
  selectDashboardStats, getDashboardStats
} from '../../../features/admin/adminSlice.js';
import { selectIsDarkMode } from '../../../features/theme/themeSlice.js';
import toast from 'react-hot-toast';

// ── Shared Components ──────────────────────────────────────────────────────
import {
  Grid,
  DashGrid,
  EnhancedDashCard,
  Heading,
  Button,
  DataField,
  SelectField,
  Option,
  DataTable
} from '../../../components/shared/Common_Components.jsx';

// ── Modals ─────────────────────────────────────────────────────────────────
import AddTeacherModal, { ADD_TEACHER_MODAL_ID, openAddTeacherModal } from '../../../components/admin/modals/AddTeacher.jsx';
import DeleteTeacherModal from '../../../components/admin/modals/DeleteTeacher.jsx';
import AssignTeacherModal from '../../../components/admin/modals/AssignTeacher.jsx';
import { closeModal } from '../../../components/shared/Common_Components.jsx';

const AddTeachers = () => {
  const dispatch = useDispatch();

  const teachers = useSelector(selectTeachers);
  const loading = useSelector(selectAdminLoading);
  const error = useSelector(selectAdminError);
  const darkMode = useSelector(selectIsDarkMode);

  const { authUser } = useSelector((state) => state.adminAuth);
  const statistics = useSelector(selectDashboardStats);

  const currentStaffCount = statistics?.staffCombined?.total ?? statistics?.staff?.total ?? 0;
  const maxStaffLimit = authUser?.school?.totalStaff !== undefined && authUser?.school?.totalStaff !== ""
    ? Number(authUser?.school?.totalStaff) || 0
    : (Number(authUser?.school?.totalTeachingStaff) || 0) + (Number(authUser?.school?.totalNonTeachingStaff) || 0);

  const [availableSubjects] = useState(() => {
    const saved = localStorage.getItem('subjects');
    return saved ? JSON.parse(saved) : [];
  });
  const [availableClasses] = useState(() => {
    const saved = localStorage.getItem('classes');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal Visibility
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Add-modal submit state
  const [mailSending, setMailSending] = useState(false);
  const [mailSent, setMailSent] = useState(false);

  // Assign-modal state
  const [assignSaving, setAssignSaving] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load teachers on mount
  useEffect(() => {
    dispatch(getAllTeachers());
    dispatch(getDashboardStats());
  }, [dispatch]);

  // Handlers
  const handleAddSubmit = (formData) => {
    setMailSending(true);
    dispatch(createTeacher(formData))
      .unwrap()
      .then((res) => {
        setMailSent(true);
        const designation = formData?.designation || res?.teacher?.designation;
        if (designation === "Class Teacher") {
          toast.success("Class Teacher added successfully. Login credentials have been sent to the registered email.");
        } else if (designation === "Subject Teacher") {
          toast.success("Subject Teacher added successfully. Login credentials have been sent to the registered email.");
        } else {
          toast.success("Teacher added successfully. Login credentials have been sent to the registered email.");
        }
        dispatch(getAllTeachers());
        setTimeout(() => {
          setMailSent(false);
          closeModal(ADD_TEACHER_MODAL_ID);
        }, 2000);
      })
      .catch((err) => toast.error(err?.message || 'Failed to add staff'))
      .finally(() => setMailSending(false));
  };

  const handleOpenAssign = (teacher) => {
    setSelectedTeacher(teacher);
    setShowAssignModal(true);
  };

  const handleSaveAssign = ({ assignedClass, subjects }) => {
    setAssignSaving(true);
    dispatch(assignTeacher({ id: selectedTeacher._id, assignedClass, subjects }))
      .unwrap()
      .then(() => {
        toast.success('Assignment saved successfully');
        setShowAssignModal(false);
        setSelectedTeacher(null);
        dispatch(getAllTeachers());
      })
      .catch((err) => toast.error(err?.message || 'Could not save assignment'))
      .finally(() => setAssignSaving(false));
  };

  const handleOpenDelete = (teacher) => {
    setSelectedTeacher(teacher);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    dispatch(deleteTeacher(selectedTeacher._id))
      .unwrap()
      .then(() => {
        toast.success(`${selectedTeacher.name} has been deleted`);
        setShowDeleteModal(false);
        setSelectedTeacher(null);
        dispatch(getAllTeachers());
      })
      .catch((err) => toast.error(err?.message || 'Delete failed'));
  };

  // Client-side Filtering & Sorting
  const filtered = useMemo(() => {
    return teachers
      .filter(t => {
        const q = searchTerm.toLowerCase();
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q) ||
          (t.teacherId || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
        return 0;
      });
  }, [teachers, searchTerm, sortBy]);

  const stats = useMemo(() => {
    return {
      total: teachers.length,
      active: teachers.filter(t => t.status === 'active').length,
      assigned: teachers.filter(t => t.assignedClass || (t.assignedClasses && t.assignedClasses.length > 0)).length,
    };
  }, [teachers]);

  // Map Data for DataTable
  const tableColumns = [
    { key: "staffId", label: "Staff ID" },
    { key: "name", label: "Staff Name" },
    { key: "gender", label: "Gender" },
    { key: "joiningDate", label: "Joining Date" },
    { key: "email", label: "Email" },
    { key: "qualification", label: "Qualification" },
    { key: "experience", label: "Experience" },
    { key: "status", label: "Status" },
  ];

  const tableRows = useMemo(() => {
    return filtered.map((teacher) => {
      const formattedDate = teacher.joiningDate
        ? new Date(teacher.joiningDate).toLocaleDateString()
        : '—';

      return {
        _original: teacher,
        id: teacher._id,
        staffId: (
          <span className="font-mono font-bold text-[#223F74] dark:text-violet-400">
            {teacher.teacherId || '—'}
          </span>
        ),
        name: (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#223F74]/10 to-indigo-100 dark:bg-slate-800 flex-shrink-0">
              <User className="w-4 h-4 text-[#223F74] dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{teacher.name || "—"}</p>
              <p className="text-xs text-gray-400 dark:text-slate-400">{teacher.phone || "—"}</p>
            </div>
          </div>
        ),
        gender: teacher.gender || '—',
        joiningDate: formattedDate,
        email: (
          <div className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            {teacher.email}
          </div>
        ),
        qualification: teacher.qualification ? (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-violet-50 text-[#223F74] border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30">
            {teacher.qualification}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
        experience: teacher.experience ? `${teacher.experience} yrs` : '—',
        status: teacher.status === 'active' ? 'Active' : 'Inactive',
      };
    });
  }, [filtered]);

  const tableActions = [
    {
      icon: <BookMarked size={16} />,
      tooltip: "Assign Classes & Subjects",
      variant: "ghost",
      onClick: (row) => handleOpenAssign(row._original),
    },
    {
      icon: <Trash2 size={16} />,
      tooltip: "Delete Staff",
      variant: "danger",
      onClick: (row) => handleOpenDelete(row._original),
    },
  ];

  return (
    <div className={`w-full space-y-6 text-left pb-10 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      
      {/* ── Page Header ── */}
      <Heading
        primaryText="Add"
        secondaryText="Teacher"
        action={
          <Button
            text="Add Teacher"
            icon={<Plus size={16} />}
            variant="primary"
            onClick={openAddTeacherModal}
            size={12}
          />
        }
      />

      {/* ── Summary Stats Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Staff"
          value={stats.total}
          icon={<UserPlus size={24} />}
          accentColor="#3b82f6"
          size={4}
        />
        <EnhancedDashCard
          title="Active Staff"
          value={stats.active}
          icon={<CheckCircle size={24} />}
          accentColor="#22c55e"
          size={4}
        />
        <EnhancedDashCard
          title="Classes Assigned"
          value={stats.assigned}
          icon={<School size={24} />}
          accentColor="#a855f7"
          size={4}
        />
      </DashGrid>

      {/* ── Error Banner ── */}
      {error?.getAllTeachers && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error.getAllTeachers}</span>
          <button onClick={() => dispatch(getAllTeachers())} className="ml-auto underline text-xs font-semibold hover:text-rose-800">Retry</button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white p-5 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,.06)] border border-[#E7E2DB] dark:bg-[#1e293b] dark:border-[#334155]">
        <Grid cols={12} gap={4}>
          <DataField
            id="searchTerm"
            placeholder="Search by name, email, or ID..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size={6}
          />
          <SelectField
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            searchable={false}
            size={4}
          >
            <Option value="newest" label="Newest First" />
            <Option value="oldest" label="Oldest First" />
            <Option value="name-asc" label="Name (A–Z)" />
            <Option value="name-desc" label="Name (Z–A)" />
          </SelectField>
          <div className="col-span-12 sm:col-span-2 flex items-center justify-end mt-1">
             <Button
                text="Reset"
                variant="ghost"
                onClick={() => { setSearchTerm(''); setSortBy('newest'); }}
                size={12}
              />
          </div>
        </Grid>
      </div>

      {/* ── Data Table ── */}
      <div>
        {loading?.getAllTeachers ? (
          <div className="bg-white dark:bg-[#1e293b] dark:border-[#334155] rounded-2xl border border-[#E7E2DB] h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#223F74] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Loading staff list...</p>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            actions={tableActions}
            searchable={false}
            pageSize={10}
            hidePagination={false}
            hideRecordSummary={false}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <AddTeacherModal
        onSubmit={handleAddSubmit}
        loading={mailSending}
        success={mailSent}
        currentStaff={currentStaffCount}
        maxStaff={maxStaffLimit}
      />

      {showAssignModal && selectedTeacher && (
        <AssignTeacherModal
          teacher={selectedTeacher}
          onClose={() => { setShowAssignModal(false); setSelectedTeacher(null); }}
          onSave={handleSaveAssign}
          assignSaving={assignSaving}
          availableSubjects={availableSubjects}
          availableClasses={availableClasses}
        />
      )}

      {showDeleteModal && selectedTeacher && (
        <DeleteTeacherModal
          teacher={selectedTeacher}
          onClose={() => { setShowDeleteModal(false); setSelectedTeacher(null); }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default AddTeachers;
