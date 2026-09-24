import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  Check,
  CheckCircle,
  Clock3,
  Eye,
  FileText,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  assignTeacher,
  deleteTeacher,
  getAllTeachers,
  selectAdminError,
  selectAdminLoading,
  selectTeachers,
  createTeacher,
  selectDashboardStats,
  getDashboardStats,
} from '../../../features/admin/adminSlice';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import {
  fetchPrincipalResignations,
  approvePrincipalResignation,
  rejectPrincipalResignation,
} from '../../../services/api/principalApi.js';
import AssignTeacherModal from '../../../components/admin/modals/AssignTeacher.jsx';
import DeleteTeacherModal from '../../../components/admin/modals/DeleteTeacher.jsx';
import AddTeacherModal, { ADD_TEACHER_MODAL_ID, openAddTeacherModal } from '../../../components/admin/modals/AddTeacher.jsx';
import AddAccountantModal from '../../../components/admin/modals/AddAccountant.jsx';
import { addAccountant } from '../../../services/api/adminApi';
import {
  Button,
  DashGrid,
  DataField,
  DataTable,
  EnhancedDashCard,
  Grid,
  Heading,
  Modal,
  ModalData,
  ModalGrid,
  ModalProfile,
  Option,
  SelectField,
  closeModal,
  openModal,
} from '../../../components/shared/Common_Components.jsx';

const RESIGN_VIEW_MODAL   = 'resign-view-modal';
const RESIGN_REJECT_MODAL = 'resign-reject-modal';
const STAFF_VIEW_MODAL    = 'staff-view-modal';

const ManageTeachers = () => {
  const navigate = useNavigate();
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

  const [activeTab, setActiveTab] = useState('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [resignationSearch, setResignationSearch] = useState('');
  const [resignationStatus, setResignationStatus] = useState('all');
  const [resignationRole, setResignationRole] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignSaving, setAssignSaving] = useState(false);

  // Add staff modal loading/success states
  const [mailSending, setMailSending] = useState(false);
  const [mailSent, setMailSent] = useState(false);

  // Add accountant modal loading/success states
  const [showAccountantForm, setShowAccountantForm] = useState(false);
  const [accountantLoading, setAccountantLoading] = useState(false);
  const [accountantSuccess, setAccountantSuccess] = useState(false);

  // Resignation live state
  const [resignationRequests, setResignationRequests] = useState([]);
  const [loadingResignations, setLoadingResignations] = useState(false);
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingResign, setSubmittingResign] = useState(false);

  const loadResignations = async () => {
    try {
      setLoadingResignations(true);
      const res = await fetchPrincipalResignations();
      setResignationRequests(res?.data || []);
    } catch (err) {
      console.error('Failed to load resignation requests:', err);
    } finally {
      setLoadingResignations(false);
    }
  };

  useEffect(() => {
    dispatch(getAllTeachers());
    dispatch(getDashboardStats());
    loadResignations();
  }, [dispatch]);

  const filteredStaff = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const userRole = (teacher.role || '').toLowerCase();
      // Ensure only Teachers and Accountants are displayed
      const isStaffType = userRole === 'teacher' || userRole === 'accountant';
      if (!isStaffType) return false;

      const matchesSearch = !query || [
        teacher.name,
        teacher.teacherId,
        teacher.empId,
        teacher.staffId,
        teacher.email,
        teacher.phone,
        teacher.contactNumber,
        teacher.assignedClass,
        teacher.designation,
        teacher.role,
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter;
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [teachers, searchTerm, statusFilter, roleFilter]);

  const filteredResignations = useMemo(() => {
    const query = resignationSearch.trim().toLowerCase();

    return resignationRequests.filter((request) => {
      const matchesSearch = !query || [
        request.staffName,
        request.staffId,
        request.role,
        request.phone,
        request.email,
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = resignationStatus === 'all' || request.status === resignationStatus;
      const matchesRole = resignationRole === 'all' || request.role === resignationRole;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [resignationSearch, resignationStatus, resignationRole, resignationRequests]);

  const stats = useMemo(() => {
    // Filter to only teachers/accountants for correct stats card totals
    const schoolStaff = teachers.filter((teacher) => {
      const userRole = (teacher.role || '').toLowerCase();
      return userRole === 'teacher' || userRole === 'accountant';
    });

    return {
      total: schoolStaff.length,
      active: schoolStaff.filter((teacher) => teacher.status === 'active').length,
      assigned: schoolStaff.filter((teacher) => teacher.assignedClass || teacher.classes?.length || teacher.assignedClasses?.length).length,
      resignations: resignationRequests.filter(r => (r.status || 'Pending').toLowerCase() === 'pending').length,
    };
  }, [teachers, resignationRequests]);

  const handleOpenAssign = (teacher) => {
    setSelectedTeacher(teacher);
    setShowAssignModal(true);
  };

  const handleSaveAssign = ({ assignedClass, subjects }) => {
    const teacherId = selectedTeacher?._id || selectedTeacher?.id;
    if (!teacherId) return;

    setAssignSaving(true);
    dispatch(assignTeacher({ id: teacherId, assignedClass, subjects }))
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

  const handleConfirmDelete = () => {
    const teacherId = selectedTeacher?._id || selectedTeacher?.id;
    if (!teacherId) return;

    dispatch(deleteTeacher(teacherId))
      .unwrap()
      .then(() => {
        toast.success(`${selectedTeacher.name} has been deleted`);
        setShowDeleteModal(false);
        setSelectedTeacher(null);
        dispatch(getAllTeachers());
      })
      .catch((err) => toast.error(err?.message || 'Delete failed'));
  };

  const resetStaffFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
  };

  const resetResignationFilters = () => {
    setResignationSearch('');
    setResignationStatus('all');
    setResignationRole('all');
  };

  // Add staff submit handler
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

  // Add accountant submit handler
  const handleAddAccountant = async (formData) => {
    setAccountantLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("email", formData.email.trim());
      payload.append("phone", formData.phone.trim());
      if (formData.gender) payload.append("gender", formData.gender);
      if (formData.dob) payload.append("dob", formData.dob);
      if (formData.address) payload.append("address", formData.address.trim());
      if (formData.qualification) payload.append("qualification", formData.qualification);
      if (formData.experience) payload.append("experience", formData.experience);
      if (formData.joiningDate) payload.append("joiningDate", formData.joiningDate);
      if (formData.salary) payload.append("salary", formData.salary);
      if (formData.photo) payload.append("photo", formData.photo);

      await addAccountant(payload);
      setAccountantSuccess(true);
      toast.success("Accountant added! Credentials sent to their email.");
      dispatch(getAllTeachers());
      setTimeout(() => {
        setShowAccountantForm(false);
        setAccountantSuccess(false);
      }, 1500);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add accountant.");
    } finally {
      setAccountantLoading(false);
    }
  };

  // View staff handler
  const handleViewStaff = (teacher) => {
    setSelectedTeacher(teacher);
    openModal(STAFF_VIEW_MODAL);
  };

  // ── Resignation handlers ──────────────────────────────────────────────────
  const handleViewResignation = (row) => {
    setSelectedResignation(row._original);
    openModal(RESIGN_VIEW_MODAL);
  };

  const handleApproveResignation = async (row) => {
    try {
      setSubmittingResign(true);
      await approvePrincipalResignation(row._original._id || row._original.id);
      toast.success('Resignation approved');
      setResignationRequests(prev =>
        prev.map(r => (r._id === (row._original._id || row._original.id) ? { ...r, status: 'approved' } : r))
      );
    } catch {
      toast.error('Failed to approve resignation');
    } finally {
      setSubmittingResign(false);
    }
  };

  const openRejectModal = (row) => {
    setSelectedResignation(row._original);
    setRejectReason('');
    openModal(RESIGN_REJECT_MODAL);
  };

  const handleRejectResignation = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    try {
      setSubmittingResign(true);
      await rejectPrincipalResignation(
        selectedResignation._id || selectedResignation.id,
        { reason: rejectReason }
      );
      toast.success('Resignation rejected');
      setResignationRequests(prev =>
        prev.map(r => (r._id === (selectedResignation._id || selectedResignation.id) ? { ...r, status: 'rejected' } : r))
      );
      closeModal(RESIGN_REJECT_MODAL);
    } catch {
      toast.error('Failed to reject resignation');
    } finally {
      setSubmittingResign(false);
    }
  };

  const renderBadgesWithMore = (items, isSubject) => {
    if (!items || items.length === 0) {
      return <span className="text-xs italic text-slate-400">Not Assigned</span>;
    }

    const maxBadges = 2;
    const displayedItems = items.slice(0, maxBadges);
    const remainingItems = items.slice(maxBadges);

    const badgeClass = isSubject
      ? "rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 whitespace-nowrap"
      : "rounded-lg bg-[#223F74]/10 px-2 py-1 text-xs font-semibold text-[#223F74] whitespace-nowrap";

    const moreBadgeClass = isSubject
      ? "rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
      : "rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap";

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {displayedItems.map((item, idx) => (
          <span key={idx} className={badgeClass}>
            {item}
          </span>
        ))}
        {remainingItems.length > 0 && (
          <span className={moreBadgeClass}>
            +{remainingItems.length} more
          </span>
        )}
      </div>
    );
  };

  const staffColumns = [
    { key: 'staffName', label: 'Staff Name', searchValue: (row) => row.searchText },
    { key: 'staffId', label: 'Staff ID', searchValue: (row) => row.staffIdText },
    { key: 'contactDetails', label: 'Contact Details', searchValue: (row) => row.contactText },
    { key: 'subjects', label: 'Subject(s)' },
    { key: 'classes', label: 'Class' },
    { key: 'status', label: 'Status' },
  ];

  const staffRows = useMemo(() => filteredStaff.map((teacher) => {
    const teacherId = teacher.teacherId || teacher.empId || teacher.staffId || '—';
    const subjectLabels = Array.isArray(teacher.subjects) ? teacher.subjects : [];
    const classLabels = Array.isArray(teacher.classes) ? teacher.classes : [];
    const isPrincipal = teacher.role === 'Principal' || teacher.designation === 'Principal';

    return {
      _original: teacher,
      id: teacher._id || teacher.id,
      searchText: `${teacher.name || ''} ${teacher.email || ''} ${teacher.phone || ''} ${teacherId}`,
      staffIdText: teacherId,
      contactText: `${teacher.phone || teacher.contactNumber || ''} ${teacher.email || ''}`,
      staffName: (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#223F74]/10 text-[#223F74]">
            <User size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{teacher.name || '—'}</p>
            <p className="text-xs font-medium text-slate-400">{teacher.designation || teacher.role || 'Staff'}</p>
          </div>
        </div>
      ),
      staffId: (
        <span className="font-mono text-xs font-bold text-[#223F74]">
          {teacherId}
        </span>
      ),
      contactDetails: (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Phone size={14} className="text-slate-400" />
            {teacher.phone || teacher.contactNumber || '—'}
          </p>
          <p className="flex items-center gap-2 break-all text-sm font-medium text-slate-700">
            <Mail size={14} className="flex-shrink-0 text-slate-400" />
            {teacher.email || '—'}
          </p>
        </div>
      ),
      subjects: isPrincipal ? (
        <span className="text-xs font-semibold text-slate-400">N/A</span>
      ) : (
        renderBadgesWithMore(subjectLabels, true)
      ),
      classes: isPrincipal ? (
        <span className="text-xs font-semibold text-slate-400">N/A</span>
      ) : (
        renderBadgesWithMore(classLabels, false)
      ),
      status: teacher.status === 'active' ? 'Active' : 'Inactive',
    };
  }), [filteredStaff]);

  const resignationColumns = [
    { key: 'staffName', label: 'Staff Name' },
    { key: 'staffId', label: 'Staff ID' },
    { key: 'role', label: 'Role' },
    { key: 'contactDetails', label: 'Contact Details' },
    { key: 'resignationDate', label: 'Resignation Date' },
    { key: 'noticePeriod', label: 'Notice Period' },
    { key: 'status', label: 'Status' },
  ];

  const resignationRows = useMemo(() => filteredResignations.map((request) => ({
    _original: request,
    id: request.id,
    staffName: request.staffName || '—',
    staffId: request.staffId || '—',
    role: request.role || '—',
    contactDetails: (
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">{request.phone || '—'}</p>
        <p className="break-all text-sm font-medium text-slate-700">{request.email || '—'}</p>
      </div>
    ),
    resignationDate: request.resignationDate || '—',
    noticePeriod: request.noticePeriod || '—',
    status: request.status || 'Pending',
  })), [filteredResignations]);

  const isTeachingStaff = (role, designation) => {
    const r = (role || '').toLowerCase().trim();
    const d = (designation || '').toLowerCase().trim();

    if (r === 'teacher') return true;

    const nonTeachingKeywords = [
      'accountant', 'admin', 'principal', 'vice principal', 'hr', 
      'librarian', 'receptionist', 'clerk', 'office', 'driver', 
      'peon', 'security', 'guard', 'support', 'transport'
    ];

    if (nonTeachingKeywords.some(keyword => r.includes(keyword) || d.includes(keyword))) {
      return false;
    }

    const teachingKeywords = [
      'teacher', 'faculty', 'lecturer', 'pgt', 'tgt', 'prt', 'instructor'
    ];

    return teachingKeywords.some(keyword => r.includes(keyword) || d.includes(keyword));
  };

  const staffActions = [
    {
      icon: <Eye size={16} />,
      tooltip: 'View Details',
      variant: 'ghost',
      onClick: (row) => handleViewStaff(row._original),
    },
    {
      icon: <BookMarked size={16} />,
      tooltip: 'Assign Classes & Subjects',
      variant: 'ghost',
      show: (row) => {
        const role = row._original?.role || '';
        const designation = row._original?.designation || '';
        return isTeachingStaff(role, designation);
      },
      onClick: (row) => handleOpenAssign(row._original),
    },
    {
      icon: <Trash2 size={16} />,
      tooltip: 'Delete Staff',
      variant: 'danger',
      onClick: (row) => {
        setSelectedTeacher(row._original);
        setShowDeleteModal(true);
      },
    },
  ];

  const resignationActions = [
    {
      icon: <Eye size={16} />, tooltip: 'View Details', variant: 'ghost',
      onClick: (row) => handleViewResignation(row),
    },
    {
      icon: <Check size={16} />, tooltip: 'Approve', variant: 'success',
      show: (row) => row.status === 'pending' || row.status === 'Pending',
      onClick: (row) => handleApproveResignation(row),
    },
    {
      icon: <X size={16} />, tooltip: 'Reject', variant: 'danger',
      show: (row) => row.status === 'pending' || row.status === 'Pending',
      onClick: (row) => openRejectModal(row),
    },
  ];

  return (
    <div className={`w-full space-y-8 pb-10 text-left transition-colors duration-200 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      <Heading
        primaryText="Manage"
        secondaryText="Staff"
        showAnimations={true}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              text="Add Teacher"
              icon={<Plus size={16} />}
              variant="primary"
              onClick={openAddTeacherModal}
              size={12}
            />
            <Button
              text="Add Accountant"
              icon={<Plus size={16} />}
              variant="primary"
              onClick={() => setShowAccountantForm(true)}
              size={12}
            />
          </div>
        }
      />

      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Staff" value={stats.total} icon={<UserPlus size={24} />} accentColor="#223F74" size={3} />
        <EnhancedDashCard title="Active Staff" value={stats.active} icon={<CheckCircle size={24} />} accentColor="#5B9A6A" size={3} />
        <EnhancedDashCard title="Assigned Staff" value={stats.assigned} icon={<BookMarked size={24} />} accentColor="#E0A04B" size={3} />
        <EnhancedDashCard title="Resignations" value={stats.resignations} icon={<FileText size={24} />} accentColor="#D66B5F" size={3} />
      </DashGrid>

      {error?.getAllTeachers && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertCircle size={16} />
          <span>{error.getAllTeachers}</span>
          <button onClick={() => dispatch(getAllTeachers())} className="ml-auto text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="flex w-fit rounded-[24px] border border-[#E7E2DB] bg-white p-1.5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="flex gap-2">
          {[
            { key: 'staff', label: 'Staff Directory', count: filteredStaff.length },
            { key: 'resignations', label: 'Resignation Requests', count: filteredResignations.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[18px] px-6 py-2.5 text-sm font-black transition-all ${
                activeTab === tab.key
                  ? 'bg-[#223F74] text-white shadow-md shadow-[#223F74]/20'
                  : 'text-[#223F74] hover:bg-[#F4F7FB]'
              }`}
            >
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-[#223F74]/10 text-[#223F74]'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'staff' ? (
        <>
          <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <Grid cols={12} gap={4}>
              <DataField
                label="Search"
                id="staffSearch"
                placeholder="Search name, ID, contact, or class..."
                icon={Search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                size={6}
              />
              <SelectField
                label="Role"
                id="staffRole"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                searchable={false}
                size={2}
              >
                <Option value="all" label="All Roles" />
                <Option value="teacher" label="Teacher" />
                <Option value="accountant" label="Accountant" />
              </SelectField>
              <SelectField
                label="Status"
                id="staffStatus"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                searchable={false}
                size={2}
              >
                <Option value="all" label="All Statuses" />
                <Option value="active" label="Active" />
                <Option value="inactive" label="Inactive" />
              </SelectField>
              <div className="col-span-12 mt-6 flex items-center justify-end sm:col-span-2">
                <Button text="Reset" variant="ghost" onClick={resetStaffFilters} size={12} />
              </div>
            </Grid>
          </div>

          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
            <div className="p-6 pb-2 border-b border-gray-100">
              <h2 className="text-xl font-black text-[#1D1D1F]">Staff Registry</h2>
            </div>
            <div className="p-6 pt-4 relative min-h-[300px]">
              {loading?.getAllTeachers ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
                </div>
              ) : (
                <DataTable
                  columns={staffColumns}
                  rows={staffRows}
                  actions={staffActions}
                  searchable={false}
                  pageSize={10}
                  hidePagination={false}
                  hideRecordSummary={false}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <Grid cols={12} gap={4}>
              <DataField
                id="resignationSearch"
                placeholder="Search staff name, ID, role, phone, or email..."
                icon={Search}
                value={resignationSearch}
                onChange={(event) => setResignationSearch(event.target.value)}
                size={5}
              />
              <SelectField
                id="resignationStatus"
                value={resignationStatus}
                onChange={(event) => setResignationStatus(event.target.value)}
                searchable={false}
                size={3}
              >
                <Option value="all" label="All Statuses" />
                <Option value="Pending" label="Pending" />
                <Option value="Approved" label="Approved" />
                <Option value="Rejected" label="Rejected" />
              </SelectField>
              <SelectField
                id="resignationRole"
                value={resignationRole}
                onChange={(event) => setResignationRole(event.target.value)}
                searchable={false}
                size={2}
              >
                <Option value="all" label="All Roles" />
                <Option value="Teacher" label="Teacher" />
                <Option value="Accountant" label="Accountant" />
                <Option value="Staff" label="Staff" />
              </SelectField>
              <div className="col-span-12 mt-1 flex items-center justify-end sm:col-span-2">
                <Button text="Reset" variant="ghost" onClick={resetResignationFilters} size={12} />
              </div>
            </Grid>
          </div>

          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
            <div className="p-6 pb-2 border-b border-gray-100">
              <h2 className="text-xl font-black text-[#1D1D1F]">Resignation Requests</h2>
            </div>
            <div className="p-6 pt-4 relative min-h-[300px]">
              {loadingResignations ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
                </div>
              ) : (
                <DataTable
                  columns={resignationColumns}
                  rows={resignationRows}
                  actions={resignationActions}
                  searchable={false}
                  pageSize={10}
                  hidePagination={false}
                  hideRecordSummary={false}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Inline Add Staff Modal */}
      <AddTeacherModal
        onSubmit={handleAddSubmit}
        loading={mailSending}
        success={mailSent}
        currentStaff={currentStaffCount}
        maxStaff={maxStaffLimit}
      />

      {/* Add Accountant Modal */}
      {showAccountantForm && (
        <AddAccountantModal
          isOpen={showAccountantForm}
          onClose={() => setShowAccountantForm(false)}
          onSubmit={handleAddAccountant}
          loading={accountantLoading}
          success={accountantSuccess}
          currentStaff={currentStaffCount}
          maxStaff={maxStaffLimit}
        />
      )}

      {showAssignModal && selectedTeacher && (
        <AssignTeacherModal
          teacher={selectedTeacher}
          onClose={() => { setShowAssignModal(false); setSelectedTeacher(null); }}
          onSave={handleSaveAssign}
          assignSaving={assignSaving}
          availableSubjects={availableSubjects}
        />
      )}

      {showDeleteModal && selectedTeacher && (
        <DeleteTeacherModal
          teacher={selectedTeacher}
          onClose={() => { setShowDeleteModal(false); setSelectedTeacher(null); }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* ── View Staff Details Modal ── */}
      <Modal id={STAFF_VIEW_MODAL} title="Staff Details" size="lg">
        {selectedTeacher && (
          <div className="flex flex-col gap-5">
            <ModalProfile
              name={selectedTeacher.name || '—'}
              subtitle={`${selectedTeacher.designation || selectedTeacher.role || 'Staff'} · ${selectedTeacher.department || '—'}`}
              meta={`Employee ID: ${selectedTeacher.teacherId || selectedTeacher.empId || selectedTeacher.staffId || '—'}`}
              photoUrl={selectedTeacher.photo}
            />

            <ModalGrid title="Contact Information" cols={2}>
              <ModalData label="Email Address" value={selectedTeacher.email || '—'} />
              <ModalData label="Phone Number" value={selectedTeacher.phone || selectedTeacher.contactNumber || '—'} />
              <ModalData
                label="Address"
                value={
                  selectedTeacher.address
                    ? `${selectedTeacher.address.street || ''}, ${selectedTeacher.address.city || ''}, ${selectedTeacher.address.state || ''} ${selectedTeacher.address.pincode || ''}`.trim() || '—'
                    : '—'
                }
              />
            </ModalGrid>

            <ModalGrid title="Employment Information" cols={2}>
              <ModalData
                label="Joining Date"
                value={selectedTeacher.joiningDate ? new Date(selectedTeacher.joiningDate).toLocaleDateString() : '—'}
              />
              <ModalData
                label="Employment Status"
                value={
                  selectedTeacher.status
                    ? selectedTeacher.status.charAt(0).toUpperCase() + selectedTeacher.status.slice(1)
                    : 'Active'
                }
              />
              <ModalData
                label="Monthly Salary"
                value={selectedTeacher.salary ? `₹${Number(selectedTeacher.salary).toLocaleString()}` : '—'}
              />
            </ModalGrid>

            {!(selectedTeacher.role === 'Principal' || selectedTeacher.designation === 'Principal') && (
              <ModalGrid title="Class & Subject Assignments" cols={2}>
                <ModalData
                  label="Assigned Class"
                  value={
                    Array.isArray(selectedTeacher.classes) && selectedTeacher.classes.length > 0
                      ? selectedTeacher.classes.map(c => typeof c === 'string' ? c : c.name).join(', ')
                      : selectedTeacher.assignedClass || 'Not assigned'
                  }
                />
                <ModalData
                  label="Assigned Subject(s)"
                  value={
                    Array.isArray(selectedTeacher.subjects) && selectedTeacher.subjects.length > 0
                      ? selectedTeacher.subjects.map(s => typeof s === 'string' ? s : s.name).join(', ')
                      : 'Not assigned'
                  }
                />
              </ModalGrid>
            )}

            <ModalGrid title="Attendance Summary" cols={2}>
              <ModalData
                label="Days Break Down"
                value={`Present: ${selectedTeacher.attendanceSummary?.present || 192} Days | Absent: ${selectedTeacher.attendanceSummary?.absent || 8} Days | Leave Taken: ${selectedTeacher.attendanceSummary?.leave || 10} Days`}
              />
              <ModalData
                label="Attendance Percentage"
                value={`${selectedTeacher.attendance || 95}%`}
              />
            </ModalGrid>

            <ModalGrid title="Leave Summary" cols={2}>
              <ModalData
                label="Leave Details"
                value={`Casual Leave: ${selectedTeacher.leaveSummary?.casual || 4} | Sick Leave: ${selectedTeacher.leaveSummary?.sick || 3}`}
              />
              <ModalData
                label="Remaining Leaves"
                value={`${selectedTeacher.leaveSummary?.remaining || 11} Days`}
              />
            </ModalGrid>

            <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#223F74] border-b border-[#223F74]">
                <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                <p className="text-xs font-black text-white uppercase tracking-[0.18em]">
                  Documents
                </p>
              </div>
              <div className="p-4 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-rose-50 text-rose-500 rounded-xl flex-shrink-0">
                      <FileText size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Appointment Letter.pdf</p>
                      <p className="text-[11px] text-slate-400 font-semibold">245 KB · PDF Document</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial">
                      <Button
                        text="View"
                        variant="secondary"
                        onClick={() => window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                        size={12}
                      />
                    </div>
                    <div className="flex-1 sm:flex-initial">
                      <Button
                        text="Download"
                        variant="ghost"
                        onClick={() => window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                        size={12}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button text="Close" variant="secondary" size={3} onClick={() => closeModal(STAFF_VIEW_MODAL)} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Resignation Modal ── */}
      <Modal id={RESIGN_VIEW_MODAL} title="Resignation Details" size="md">
        {selectedResignation && (
          <div className="flex flex-col gap-4">
            <ModalProfile
              name={selectedResignation.staffName || selectedResignation.name || '—'}
              subtitle={`${selectedResignation.role || selectedResignation.designation || 'Staff'} · ${selectedResignation.staffId || '—'}`}
              meta={`Submitted: ${selectedResignation.resignationDate ? new Date(selectedResignation.resignationDate).toLocaleDateString() : '—'}`}
            />
            <ModalGrid title="Resignation Info" cols={2}>
              <ModalData label="Status"        value={selectedResignation.status || '—'} />
              <ModalData label="Notice Period"  value={selectedResignation.noticePeriod || '—'} />
              <ModalData label="Last Work Date" value={selectedResignation.lastWorkingDate ? new Date(selectedResignation.lastWorkingDate).toLocaleDateString() : '—'} />
              <ModalData label="Applied On"     value={selectedResignation.createdAt ? new Date(selectedResignation.createdAt).toLocaleDateString() : '—'} />
            </ModalGrid>
            <ModalGrid title="Contact" cols={2}>
              <ModalData label="Phone" value={selectedResignation.phone || selectedResignation.contact || '—'} />
              <ModalData label="Email" value={selectedResignation.email || '—'} />
            </ModalGrid>
            {selectedResignation.reason && (
              <ModalGrid title="Reason" cols={1}>
                <ModalData label="Reason for Resignation" value={selectedResignation.reason} />
              </ModalGrid>
            )}
            <div className="flex justify-end pt-1 border-t border-slate-100">
              <Button text="Close" variant="secondary" size={3} onClick={() => closeModal(RESIGN_VIEW_MODAL)} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reject Resignation Modal ── */}
      <Modal id={RESIGN_REJECT_MODAL} title="Reject Resignation" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 font-medium">
            Please provide a reason for rejecting this resignation request. This will be visible to the staff member.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Incomplete notice period, pending handover..."
            rows={4}
            className="w-full rounded-2xl border border-[#E2E8F0] px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] resize-none transition"
          />
          <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
            <Button text="Cancel" variant="secondary" size={3} onClick={() => closeModal(RESIGN_REJECT_MODAL)} />
            <Button
              text={submittingResign ? 'Rejecting…' : 'Reject'}
              variant="danger"
              size={3}
              loading={submittingResign}
              disabled={submittingResign || !rejectReason.trim()}
              onClick={handleRejectResignation}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageTeachers;
