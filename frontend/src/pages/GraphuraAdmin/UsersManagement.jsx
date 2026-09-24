import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUsersList,
  selectUsersStats,
  setUsersList,
  setUsersStats,
} from '../../features/auth/graphuraAuthSlice';
import {
  Users, Search, Filter, Eye, Edit, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Calendar,
  Mail, Phone, User, GraduationCap, BookOpen,
  Download, UserCheck, UserX,
  ChevronDown, ChevronUp, Clock, Shield, AlertTriangle,
  X, School
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import * as graphuraApi from '../../services/api/graphuraApi';
import { Modal, Button, openModal, closeModal } from '../../components/shared/Common_Components';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Section = ({ icon: Icon, title, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-words">{value || <span className="text-gray-300 font-normal">—</span>}</p>
  </div>
);

const getRoleHeaderBadge = (role) => {
  switch(role) {
    case 'student':
      return <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-full text-xs flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Student</span>;
    case 'teacher':
      return <span className="px-2.5 py-0.5 bg-green-500/20 border border-green-500/30 text-green-200 rounded-full text-xs flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Teacher</span>;
    case 'admin':
      return <span className="px-2.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-full text-xs flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Admin</span>;
    default:
      return <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-white rounded-full text-xs">{role}</span>;
  }
};

const getStatusHeaderBadge = (status) => {
  switch(status) {
    case 'active':
      return <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-full text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active</span>;
    case 'inactive':
      return <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-gray-200 rounded-full text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive</span>;
    case 'suspended':
      return <span className="px-2.5 py-0.5 bg-red-500/20 border border-red-500/30 text-red-200 rounded-full text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Suspended</span>;
    default:
      return <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-white rounded-full text-xs">{status}</span>;
  }
};


const UsersManagement = ({ type = 'all' }) => {
  const dispatch = useDispatch();
  const cachedUsers = useSelector(selectUsersList);
  const cachedStats = useSelector(selectUsersStats);

  const [users, setUsers] = useState(cachedUsers || []);
  const [isLoading, setIsLoading] = useState(!cachedUsers);
  const [error, setError] = useState(null);
  const [apiStats, setApiStats] = useState(cachedStats || { total: 0, active: 0, students: 0, teachers: 0, admins: 0 });
  
  const fetchUsersData = useCallback(async () => {
    if (!cachedUsers) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await graphuraApi.fetchAllUsers({});
      // The API returns { data: { users: [...] } }
      const usersData = response.data?.data?.users || [];
      const statsData = response.data?.data?.stats;
      
      const mappedUsers = usersData.map((user) => {
        const parentName = user.profileId?.parent?.fatherName || user.profileId?.parent?.motherName || user.profileId?.parent?.user?.name || "N/A";
        const parentEmail = user.profileId?.parent?.profileExtras?.fatherEmail || user.profileId?.parent?.profileExtras?.motherEmail || user.profileId?.parent?.user?.email || "N/A";
        const parentPhone = user.profileId?.parent?.primaryContact || user.profileId?.parent?.user?.loginId || "N/A";
        const className = user.profileId?.class?.name || "N/A";
        const sectionName = user.profileId?.section?.name || "N/A";
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.loginId || "N/A",
          role: user.role,
          school: user.school?.schoolName || "N/A",
          schoolId: user.school?._id || null,
          principalName: user.school?.principalName || "N/A",
          class: className,
          section: sectionName,
          rollNumber: user.profileId?.rollNo || "N/A",
          parentName: parentName,
          parentEmail: parentEmail,
          parentPhone: parentPhone,
          subject: user.profileId?.subjects ? "Multiple" : (user.profileId?.subject || "N/A"),
          qualification: user.profileId?.qualification || "N/A",
          designation: user.profileId?.designation || "N/A",
          status: user.status,
          joinedDate: user.createdAt,
          lastActive: user.updatedAt,
        };
      });

      setUsers(mappedUsers);
      dispatch(setUsersList(mappedUsers));
      
      let finalStats = statsData;
      if (!finalStats) {
        finalStats = {
          total: mappedUsers.length,
          active: mappedUsers.filter(u => u.status === 'active').length,
          students: mappedUsers.filter(u => u.role === 'student').length,
          teachers: mappedUsers.filter(u => u.role === 'teacher').length,
          admins: mappedUsers.filter(u => u.role === 'admin').length
        };
      }
      setApiStats(finalStats);
      dispatch(setUsersStats(finalStats));
    } catch (err) {
      console.error("Fetch users failed:", err);
      setError("Failed to load users list.");
      toast.error("Network error: Could not fetch latest users");
    } finally {
      setIsLoading(false);
    }
  }, [cachedUsers, dispatch]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  useEffect(() => {
    if (type !== 'all') {
      setFilterRole(type);
    }
  }, [type]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState(type);
  const [filterSchool, setFilterSchool] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const data = users || [];

  const handleExport = async () => {
    if (filteredUsers.length === 0) {
      toast.error('No user data available to export');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      
      let exportData = [];
      if (filterRole === 'student') {
        exportData = filteredUsers.map(user => ({
          'Student Name': user.name,
          'Email': user.email,
          'Phone/Login ID': user.phone,
          'School Name': user.school,
          'Principal Name': user.principalName,
          'Parent Name': user.parentName,
          'Parent Email': user.parentEmail,
          'Parent Mobile Number': user.parentPhone,
          'Class': user.class,
          'Section': user.section,
          'Roll Number': user.rollNumber,
          'Status': user.status,
          'Joined Date': (user.joinedDate && !isNaN(new Date(user.joinedDate).getTime())) ? format(new Date(user.joinedDate), 'PPP') : 'N/A'
        }));
      } else if (filterRole === 'teacher') {
        exportData = filteredUsers.map(user => ({
          'Staff Name': user.name,
          'Email': user.email,
          'Phone/Login ID': user.phone,
          'Role': user.role,
          'School Name': user.school,
          'Principal Name': user.principalName,
          'Department': user.department || 'N/A',
          'Designation': user.designation || 'N/A',
          'Subject': user.subject || 'N/A',
          'Qualification': user.qualification || 'N/A',
          'Status': user.status,
          'Joined Date': (user.joinedDate && !isNaN(new Date(user.joinedDate).getTime())) ? format(new Date(user.joinedDate), 'PPP') : 'N/A'
        }));
      } else {
        exportData = filteredUsers.map(user => ({
          'Name': user.name,
          'Email': user.email,
          'Phone/Login ID': user.phone,
          'Role': user.role,
          'School Name': user.school,
          'Principal Name': user.principalName,
          'Details': user.role === 'student' ? `${user.class} - ${user.section}` : (user.designation || user.subject || 'N/A'),
          'Status': user.status,
          'Joined Date': (user.joinedDate && !isNaN(new Date(user.joinedDate).getTime())) ? format(new Date(user.joinedDate), 'PPP') : 'N/A'
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
      XLSX.writeFile(workbook, `${filterRole === 'all' ? 'users' : filterRole}_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedUser || newStatus === selectedUser.status) {
      toast.error("No changes detected.");
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await graphuraApi.updateUserStatus(selectedUser.id, newStatus);
      toast.success(`User status updated to ${newStatus}`);
      closeModal("status-change-modal");
      await fetchUsersData();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update user status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'student':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Student</span>;
      case 'teacher':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" /> Teacher</span>;
      case 'admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{role}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'inactive':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>;
      case 'suspended':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Suspended</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
    }
  };

  const uniqueSchools = [];
  const schoolMap = {};
  data.forEach(u => {
    if (u.schoolId && !schoolMap[u.schoolId]) {
      schoolMap[u.schoolId] = u.school;
      uniqueSchools.push({ id: u.schoolId, name: u.school });
    }
  });

  const filteredUsers = data.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.school || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSchool = filterSchool === 'all' || user.schoolId === filterSchool;
    return matchesSearch && matchesStatus && matchesRole && matchesSchool;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {type === 'student' ? 'Students Management' : 
             type === 'teacher' ? 'Teachers Management' : 
             type === 'admin' ? 'School Admins Management' : 'Users Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all users across the platform</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{apiStats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Active Users</span>
            <UserCheck className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{apiStats.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Students</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{apiStats.students}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Teachers</span>
            <BookOpen className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{apiStats.teachers}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">School Admins</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{apiStats.admins}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Schools</option>
            {uniqueSchools.map(school => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {type === 'all' && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">School Admins</option>
            </select>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        {(!isLoading || filteredUsers.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">School</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Details</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{user.school}</p>
                        <p className="text-xs text-gray-500">Principal: {user.principalName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {user.role === 'student' && (
                        <div className="space-y-0.5">
                          <p className="text-gray-700 font-medium">{user.class} - {user.section} <span className="text-xs text-gray-400 font-normal">(Roll: {user.rollNumber})</span></p>
                          <p className="text-xs text-gray-500">Parent: <span className="font-semibold text-gray-600">{user.parentName}</span></p>
                        </div>
                      )}
                      {user.role === 'teacher' && (
                        <div className="space-y-0.5">
                          <p className="text-gray-700 font-medium">Subject: {user.subject || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Qual: <span className="font-semibold text-gray-600">{user.qualification}</span></p>
                        </div>
                      )}
                      {user.role === 'admin' && (
                        <div className="space-y-0.5">
                          <p className="text-gray-700 font-medium">{user.designation || 'School Admin'}</p>
                        </div>
                      )}
                      {user.role !== 'student' && user.role !== 'teacher' && user.role !== 'admin' && (
                        <span>N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{getStatusBadge(user.status)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{(user.joinedDate && !isNaN(new Date(user.joinedDate).getTime())) ? format(new Date(user.joinedDate), 'dd MMM yyyy') : 'N/A'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Full Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewStatus(user.status);
                            openModal("status-change-modal");
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="Change Status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isLoading && filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 w-full">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500">Loading users...</p>
          </div>
        ) : (!isLoading && filteredUsers.length === 0) ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : null}
      </div>

      {/* Status Change Modal */}
      <Modal
        id="status-change-modal"
        title="Change User Status"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Update status for <strong>{selectedUser.name}</strong></p>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                Select Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {newStatus === selectedUser.status && (
              <p className="text-xs text-amber-600 font-medium">No changes detected</p>
            )}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => closeModal("status-change-modal")}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <Button
                text="Update Status"
                onClick={handleStatusChange}
                disabled={newStatus === selectedUser.status || isUpdatingStatus}
                variant="primary"
                loading={isUpdatingStatus}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* View Details Modal */}
      {createPortal(
        <AnimatePresence>
          {showDetailsModal && selectedUser && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDetailsModal(false)}
            >
              <motion.div
                layout
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut', layout: { duration: 0.25, ease: 'easeInOut' } }}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-6 py-5 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">{selectedUser.name}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                          {getRoleHeaderBadge(selectedUser.role)}
                          {getStatusHeaderBadge(selectedUser.status)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Account Details */}
                    <Section icon={User} title="Account Information">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <Field label="Email Address" value={selectedUser.email} className="col-span-2" />
                        <Field label="Login ID / Phone" value={selectedUser.phone} />
                        <Field label="Joined Date" value={selectedUser.joinedDate && !isNaN(new Date(selectedUser.joinedDate).getTime()) ? format(new Date(selectedUser.joinedDate), 'dd MMM yyyy') : 'N/A'} />
                      </div>
                    </Section>

                    {/* School Details */}
                    <Section icon={School} title="School Information">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <Field label="School / Branch" value={selectedUser.school} className="col-span-2" />
                        <Field label="Principal Name" value={selectedUser.principalName} className="col-span-2" />
                      </div>
                    </Section>

                    {/* Role Specific Details */}
                    {selectedUser.role === 'student' && (
                      <div className="md:col-span-2">
                        <Section icon={GraduationCap} title="Student Profile">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Class & Section" value={`${selectedUser.class} - ${selectedUser.section}`} />
                            <Field label="Roll Number" value={selectedUser.rollNumber} />
                            <Field label="Parent / Guardian" value={selectedUser.parentName} />
                          </div>
                        </Section>
                      </div>
                    )}

                    {selectedUser.role === 'teacher' && (
                      <div className="md:col-span-2">
                        <Section icon={BookOpen} title="Teacher Profile">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Subject / Specialty" value={selectedUser.subject} />
                            <Field label="Qualification" value={selectedUser.qualification} />
                          </div>
                        </Section>
                      </div>
                    )}

                    {selectedUser.role === 'admin' && (
                      <div className="md:col-span-2">
                        <Section icon={Shield} title="Admin Profile">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Designation" value={selectedUser.designation || 'School Admin'} />
                          </div>
                        </Section>
                      </div>
                    )}

                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default UsersManagement;