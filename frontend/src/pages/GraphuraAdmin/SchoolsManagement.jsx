import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  School,
  Search,
  Filter,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  BookOpen,
  Award,
  Download,
  Mail,
  Phone,
  MapPin,
  Building2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as graphuraApi from "../../services/api/graphuraApi";
import { Modal, openModal, closeModal } from "../../components/shared/Common_Components";


const SchoolsManagement = () => {
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBoard, setFilterBoard] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  const fetchSchoolsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);
    try {
      const response = await graphuraApi.fetchAllOrganizations({});
      // The API returns { data: { organizations: [...] } }
      const orgs = response.data?.data?.organizations || [];

      const mappedSchools = orgs.map((org) => ({
        id: org._id,
        schoolName: org.organizationName || "Unknown",
        registrationNumber: org.organizationId || "N/A",
        email: org.officialEmail || "N/A",
        phone: org.contactNumber || "N/A",
        city: org.address?.city || "N/A",
        state: org.address?.state || "N/A",
        board: org.organizationAcademic?.organizationBoard || "N/A",
        status: org.status || "active",
        joinedDate: org.createdAt || new Date().toISOString(),
        studentCount: org.studentCount || 0,
        teacherCount: org.teacherCount || 0,
        expiryDate: org.billing?.expiryDate || null, // Fetched expiry date
        address: org.address
          ? `${org.address.line1 || ""}, ${org.address.city || ""}`
          : "N/A",
        currentSchools: org.usage?.schools || 0,
        maxSchools: org.quotas?.maxSchools || 0,
        currentStaffs:
          (org.usage?.teachers || 0) + (org.usage?.nonTeachers || 0),
        maxStaffs:
          (org.quotas?.maxTeachingStaff || 0) +
          (org.quotas?.maxNonTeachingStaff || 0),
        currentStudents: org.usage?.students || 0,
        maxStudents: org.quotas?.maxStudents || 0,
      }));

      setSchools(mappedSchools);
    } catch (err) {
      console.error("Fetch schools failed:", err);
      setError("Failed to load schools list.");
      toast.error("Network error: Could not fetch latest schools");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Calculate remaining days
  const calculateDaysLeft = (expiryDate) => {
    if (!expiryDate) return "N/A";
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const exportData = filteredSchools.map((school) => ({
        "Organization Name": school.schoolName,
        "Registration Number": school.registrationNumber,
        Email: school.email,
        Phone: school.phone,
        City: school.city,
        State: school.state,
        Board: school.board,
        Students: school.studentCount,
        Status: school.status,
        "Joined Date": format(new Date(school.joinedDate), "PPP"),
        "Days Left": calculateDaysLeft(school.expiryDate),
        currentSchools: school.currentSchools || 0,
        maxSchools: school.maxSchools || 0,
        currentStaffs: school.currentStaffs || 0,
        maxStaffs: school.maxStaffs || 0,
        currentStudents: school.currentStudents || 0,
        maxStudents: school.maxStudents || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Schools");
      XLSX.writeFile(
        workbook,
        `schools_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchSchoolsData();
  }, [fetchSchoolsData]);

  const handleStatusChange = async () => {
    try {
      const response = await graphuraApi.updateOrganizationStatus(
        selectedSchool.id,
        newStatus,
      );

      if (response.data.success) {
        toast.success(`Organization status updated to ${newStatus}`);
        // Locally update the UI
        setSchools((prev) =>
          prev.map((s) =>
            s.id === selectedSchool.id ? { ...s, status: newStatus } : s,
          ),
        );
        closeModal("change-status-modal");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update organization status",
      );
    }
  };

  const data = schools || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case "inactive":
      case "deactivated":
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        );
      case "suspended":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Suspended
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  // New badge formatter for Days Left
  const getDaysLeftBadge = (days) => {
    if (days === "N/A") {
      return (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider">
          N/A
        </span>
      );
    }
    if (days < 0) {
      return (
        <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider">
          Expired
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold uppercase tracking-wider">
          {days} Days
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold uppercase tracking-wider">
        {days} Days
      </span>
    );
  };

  const filteredSchools = data.filter((school) => {
    const matchesSearch =
      school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.registrationNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      school.state.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || school.status === filterStatus;
    const matchesBoard = filterBoard === "all" || school.board === filterBoard;

    return matchesSearch && matchesStatus && matchesBoard;
  });

  const boards = [
    ...new Set(data.map((s) => s.board).filter((b) => b && b !== "N/A")),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Organization Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all registered organizations on the platform
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Organizations</span>
            <School className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Active Organizations</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {data.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {data
              .filter((s) => s.status === "active")
              .reduce((sum, s) => sum + (s.studentCount || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by school name, city, registration no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="deactivated">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Boards</option>
            {boards.map((board) => (
              <option key={board} value={board}>
                {board}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Organizations
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Location
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Students
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Days Left
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Joined
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSchools.map((school) => {
                const daysLeft = calculateDaysLeft(school.expiryDate);

                return (
                  <tr
                    key={school.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-800">
                          {school.schoolName}
                        </p>
                        <p className="text-xs text-gray-500">{school.board}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {school.city}, {school.state}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {school.studentCount?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-3">{getDaysLeftBadge(daysLeft)}</td>
                    <td className="px-5 py-3">
                      {getStatusBadge(school.status)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {format(new Date(school.joinedDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/graphura-admin/school-details/${school.id} `,
                            )
                          }
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSchool(school);
                            setNewStatus(school.status);
                            openModal("change-status-modal");
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="Change Status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <School className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No schools found</p>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      <Modal
        id="change-status-modal"
        title="Change School Status"
        size="md"
        onClose={() => setSelectedSchool(null)}
      >
        {selectedSchool && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Update status for <span className="font-semibold text-gray-800">{selectedSchool.schoolName}</span>
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
            >
              <option value="active">Active</option>
              <option value="deactivated">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => closeModal("change-status-modal")}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SchoolsManagement;
