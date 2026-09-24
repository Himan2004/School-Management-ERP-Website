import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, CreditCard, Eye, RefreshCw, 
  CheckCircle, Clock, Printer, Shield, Pencil, History,
  Save, FileText, QrCode, GraduationCap
} from 'lucide-react';
import { 
  Heading, Button, DataTable, 
  DashGrid, EnhancedDashCard, PanelModal, Grid, DataField, Select, Option
} from '../../../components/shared/Common_Components';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { QRCodeSVG } from 'qrcode.react';

// ── Formatting Helpers ───────────────────────────────────────────────────────
const formatRollNo = (id) => id || 'N/A';

const defaultAvatarSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100%" height="100%" fill="#223F74"/>
    <circle cx="50" cy="35" r="20" fill="#ffffff"/>
    <path d="M 20 80 C 20 55, 80 55, 80 80 Z" fill="#ffffff"/>
  </svg>`
)}`;

const getImageUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const cleanBase = backendUrl.replace(/\/api\/?$/, '');
  return `${cleanBase}${photo.startsWith('/') ? '' : '/'}${photo}`;
};

const StaffCard = ({ staff }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  if (!staff) return null;
  return (
    <div className="w-[300px] bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center relative text-left">
      {/* School Header */}
      <div className="w-full bg-[#223F74] text-white py-5 px-4 text-center flex flex-col items-center justify-center space-y-1">
        <div className="flex items-center gap-2">
          {staff.schoolLogo && !logoFailed ? (
            <img 
              src={getImageUrl(staff.schoolLogo)} 
              alt="Logo" 
              className="w-6 h-6 object-contain rounded bg-white/20 p-0.5" 
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <GraduationCap size={16} className="text-white" />
          )}
          <span className="font-extrabold text-xs tracking-wider uppercase truncate max-w-[220px]">
            {staff.school || 'Graphura ERP Academy'}
          </span>
        </div>
        <span className="text-[9px] text-slate-300 font-semibold uppercase tracking-widest">Official Staff ID Card</span>
      </div>

      {/* Accent line */}
      <div className="w-full h-1 bg-[#F59B87]" />

      {/* Photo & Main Body */}
      <div className="flex flex-col items-center py-6 px-4 space-y-4 w-full bg-slate-50/50">
        <div className="relative">
          <img 
            src={getImageUrl(staff.photo) || defaultAvatarSvg} 
            alt="Staff Avatar" 
            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
          />
        </div>

        <div className="text-center">
          <h3 className="font-black text-[#223F74] text-lg leading-tight">{staff.name}</h3>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wide">{staff.designation}</p>
        </div>
      </div>

      {/* Card Fields */}
      <div className="w-full px-6 py-4 border-t border-b border-slate-100 grid grid-cols-2 gap-y-3 gap-x-2 text-left bg-white">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Employee ID</span>
          <span className="text-xs font-bold text-slate-800">{staff.employeeId || staff.id}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
          <span className="text-xs font-bold text-slate-800">{staff.department}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
          <span className="text-xs font-bold text-slate-800">{staff.bloodGroup || 'N/A'}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Join Date</span>
          <span className="text-xs font-bold text-slate-800">{staff.joiningDate}</span>
        </div>
      </div>

      {/* QR Code and Footer */}
      <div className="w-full py-4 px-6 flex items-center justify-between bg-slate-50/50">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Emergency Contact</span>
          <span className="text-[11px] font-bold text-slate-700">{staff.emergencyContact || 'N/A'}</span>
        </div>
        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 shadow-sm">
          <QRCodeSVG value={staff.employeeId || staff.id} size={32} />
        </div>
      </div>

      {/* Accent bottom border */}
      <div className="w-full h-2.5 bg-[#223F74]" />
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Staff ID Card Generation Crash:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl m-6">
          <h2 className="text-xl font-bold text-red-700 mb-4">Component Crashed!</h2>
          <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono mb-4">
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono overflow-auto max-h-96">
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Module-level cache to keep data when switching between tabs/pages
let idCardCache = {
  staffList: null
};

const AdminStaffIDCardGeneration = () => {
  const [staffList, setStaffList] = useState(idCardCache.staffList || []);
  const [loading, setLoading] = useState(!idCardCache.staffList);

  // Global Filters
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection for printing
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [editForm, setEditForm] = useState({ bloodGroup: '', emergencyContact: '', address: '' });

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewStaff, setPreviewStaff] = useState(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditStaff, setAuditStaff] = useState(null);

  // Action Pending States
  const [generatingIds, setGeneratingIds] = useState(new Set());
  const [printingIds, setPrintingIds] = useState(new Set());
  const [staffToPrint, setStaffToPrint] = useState([]);

  const fetchStaff = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.get('/admin/id-cards/staff');
      const data = res.data?.data || [];
      setStaffList(data);
      idCardCache.staffList = data;
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
      if (!isSilent) toast.error('Failed to load staff list');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isSilent = !!idCardCache.staffList;
    fetchStaff(isSilent);
  }, [fetchStaff]);

  useEffect(() => {
    if (staffList && staffList.length > 0) {
      idCardCache.staffList = staffList;
    }
  }, [staffList]);

  // Global Filtering (Applies to both tables)
  const filteredStaffList = useMemo(() => {
    let result = [...staffList];

    if (departmentFilter !== "all") {
      result = result.filter(s => s.department === departmentFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter(s => s.role === roleFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter(s => s.status === statusFilter);
    }

    return result;
  }, [staffList, departmentFilter, roleFilter, statusFilter]);

  // Table 1 (Registry) filtered
  const registryRowsData = filteredStaffList;

  // Table 2 (Printing) filtered (only Generated / Printed)
  const printFilteredStaff = useMemo(() => {
    return filteredStaffList.filter(s => s.cardStatus === 'Generated' || s.cardStatus === 'Printed');
  }, [filteredStaffList]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredStaffList.length;
    const generated = filteredStaffList.filter(s => s.cardStatus === 'Generated' || s.cardStatus === 'Printed').length;
    const pending = filteredStaffList.filter(s => s.cardStatus === 'Pending' || !s.cardStatus).length;
    const printed = filteredStaffList.filter(s => s.cardStatus === 'Printed').length;
    return { total, generated, pending, printed };
  }, [filteredStaffList]);

  // Actions
  const handleGenerate = async (id) => {
    setGeneratingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await api.post('/admin/id-cards/staff/generate', { staffId: id });
      toast.success("Staff ID Card generated successfully");
      await fetchStaff();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate ID card');
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const triggerPrintFlow = useCallback(async (targetStaff) => {
    if (!targetStaff || targetStaff.length === 0) return;

    setStaffToPrint(targetStaff);

    // Give React time to render print DOM before opening print dialog
    setTimeout(async () => {
      window.print();

      try {
        const staffIds = targetStaff.map(s => s.id);

        if (staffIds.length === 1) {
          const staffId = staffIds[0];
          await api.patch('/admin/id-cards/staff/print', { staffId });
        } else {
          await api.patch('/admin/id-cards/staff/bulk-print', { staffIds });
          setSelectedStaffIds(new Set());
        }
        toast.success(staffIds.length === 1 ? 'ID Card print logged' : 'ID Cards print logged');
        await fetchStaff(true);
      } catch (err) {
        console.error('Failed to log print records in backend:', err);
      } finally {
        setStaffToPrint([]);
      }
    }, 400);
  }, [fetchStaff]);

  const handlePrint = useCallback((staff) => {
    if (!staff) return;
    triggerPrintFlow([staff]);
  }, [triggerPrintFlow]);

  const handleBulkPrint = useCallback(() => {
    if (selectedStaffIds.size === 0) {
      return toast.error('Select at least one staff member to print');
    }
    const selectedStaff = staffList.filter(s => selectedStaffIds.has(s.id));
    triggerPrintFlow(selectedStaff);
  }, [staffList, selectedStaffIds, triggerPrintFlow]);

  const handleSaveEdit = async () => {
    if (!editStaff) return;
    try {
      const payload = {
        bloodGroup: editForm.bloodGroup,
        emergencyContact: editForm.emergencyContact,
      };

      if (editStaff.role === 'Teacher') {
        payload.address = { street: editForm.address };
      } else {
        payload.address = editForm.address;
      }

      await api.put(`/admin/staff/${editStaff.id}`, payload);
      toast.success("ID Card details updated successfully");
      setIsEditModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update details');
    }
  };

  const handleSelectAllPrintTable = (e) => {
    if (e.target.checked) {
      setSelectedStaffIds(new Set(printFilteredStaff.map(s => s.id)));
    } else {
      setSelectedStaffIds(new Set());
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedStaffIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStaffIds(newSet);
  };

  // ── DataTable column definitions ──────────────────────────────────────────
  const registryColumns = [
    {
      key: "photo",
      label: "Photo",
      render: (val, row) => (
        <img
          src={getImageUrl(row._original.photo) || defaultAvatarSvg}
          alt="Staff"
          className="w-8 h-8 rounded-full object-cover border border-[#E7E2DB]"
        />
      )
    },
    {
      key: "employeeId",
      label: "Staff ID",
      render: (val) => <span className="font-bold text-[#223F74]">{val}</span>
    },
    {
      key: "staffName",
      label: "Staff Name",
      render: (val) => <span className="font-bold text-gray-800">{val}</span>,
      searchValue: (row) => `${row.staffName} ${row.employeeId} ${row.department} ${row.designation}`
    },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "phone", label: "Phone Number" },
    { key: "email", label: "Email" },
    { key: "joiningDate", label: "Joining Date" },
    {
      key: "cardStatus",
      label: "Card Status",
      render: (val) => {
        let color = "bg-gray-100 text-gray-600";
        if (val === 'Generated') color = "bg-blue-100 text-blue-600";
        if (val === 'Printed') color = "bg-emerald-100 text-emerald-600";
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>{val || 'Pending'}</span>;
      }
    }
  ];

  const registryRows = useMemo(() => {
    return registryRowsData.map((s) => ({
      _original: s,
      id: s.id,
      photo: s.photo,
      employeeId: s.employeeId || s.id,
      staffName: s.name,
      department: s.department,
      designation: s.designation,
      phone: s.phone,
      email: s.email,
      joiningDate: s.joiningDate,
      cardStatus: s.cardStatus
    }));
  }, [registryRowsData]);

  const registryActions = useMemo(() => [
    {
      icon: <Eye size={16} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => {
        setViewStaff(row._original);
        setIsViewModalOpen(true);
      }
    },
    {
      icon: <RefreshCw size={16} />,
      tooltip: "Generate ID Card",
      variant: "ghost",
      show: (row) => row.cardStatus === 'Pending',
      loading: (row) => generatingIds.has(row.id),
      onClick: (row) => handleGenerate(row.id)
    },
    {
      icon: <CreditCard size={16} />,
      tooltip: "Preview ID Card",
      variant: "ghost",
      show: (row) => row.cardStatus === 'Generated' || row.cardStatus === 'Printed',
      onClick: (row) => {
        setPreviewStaff(row._original);
        setIsPreviewModalOpen(true);
      }
    },
    {
      icon: <Pencil size={16} />,
      tooltip: "Edit Card Details",
      variant: "ghost",
      show: (row) => row.cardStatus === 'Generated' || row.cardStatus === 'Printed',
      onClick: (row) => {
        setEditStaff(row._original);
        setEditForm({
          bloodGroup: row._original.bloodGroup || '',
          emergencyContact: row._original.emergencyContact || '',
          address: row._original.address || ''
        });
        setIsEditModalOpen(true);
      }
    }
  ], [generatingIds]);

  const registryExportColumns = [
    { key: "employeeId", label: "Staff ID" },
    { key: "staffName", label: "Staff Name" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "phone", label: "Phone Number" },
    { key: "email", label: "Email" },
    { key: "joiningDate", label: "Joining Date" },
    { key: "cardStatus", label: "Card Status" }
  ];

  // Print Table
  const printColumns = [
    {
      key: "checkbox",
      label: (
        <input 
          type="checkbox" 
          onChange={handleSelectAllPrintTable} 
          checked={printFilteredStaff.length > 0 && selectedStaffIds.size === printFilteredStaff.length}
          className="rounded border-gray-300 text-[#223F74] focus:ring-[#223F74]"
        />
      ),
      render: (val, row) => (
        <input 
          type="checkbox"
          checked={selectedStaffIds.has(row.id)}
          onChange={() => toggleSelection(row.id)}
          className="rounded border-gray-300 text-[#223F74] focus:ring-[#223F74]"
        />
      ),
      width: "40px",
      align: "center"
    },
    {
      key: "employeeId",
      label: "Staff ID",
      render: (val) => <span className="font-bold text-[#223F74]">{val}</span>
    },
    {
      key: "staffName",
      label: "Staff Name",
      render: (val) => <span className="font-bold text-gray-800">{val}</span>,
      searchValue: (row) => `${row.staffName} ${row.employeeId}`
    },
    {
      key: "lastPrintedDate",
      label: "Last Printed Date",
      render: (val) => <span className="text-gray-600">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    { key: "printCount", label: "Print Count", render: (val) => <span className="font-semibold text-gray-700">{val}</span> },
    {
      key: "cardStatus",
      label: "Card Status",
      render: (val) => {
        let color = "bg-blue-100 text-blue-600";
        if (val === 'Printed') color = "bg-emerald-100 text-emerald-600";
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>{val}</span>;
      }
    }
  ];

  const printRows = useMemo(() => {
    return printFilteredStaff.map((s) => ({
      _original: s,
      id: s.id,
      employeeId: s.employeeId || s.id,
      staffName: s.name,
      lastPrintedDate: s.lastPrintedDate,
      printCount: s.printCount || 0,
      cardStatus: s.cardStatus
    }));
  }, [printFilteredStaff]);

  const printActions = useMemo(() => [
    {
      icon: <Printer size={16} />,
      tooltip: "Print / Reprint",
      variant: "ghost",
      loading: (row) => printingIds.has(row.id),
      onClick: (row) => handlePrint(row._original)
    },
    {
      icon: <History size={16} />,
      tooltip: "Printing History",
      variant: "ghost",
      show: (row) => row.cardStatus === 'Printed',
      onClick: (row) => {
        setAuditStaff(row._original);
        setIsAuditModalOpen(true);
      }
    }
  ], [printingIds]);

  const printExportColumns = [
    { key: "employeeId", label: "Staff ID" },
    { key: "staffName", label: "Staff Name" },
    { key: "lastPrintedDate", label: "Last Printed Date", render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A' },
    { key: "printCount", label: "Print Count" },
    { key: "cardStatus", label: "Card Status" }
  ];

  return (
    <ErrorBoundary>
      <div className="w-full space-y-8 pb-10 text-left">
        
        {/* Header */}
        <Heading
          primaryText="Staff ID Card"
          secondaryText="Generation"
          size={12}
          showAnimations={true}
        />

        {/* Dashboard Cards */}
        <div>
          <DashGrid cols={12} gap={4}>
            <div title="Total staff matching current filters" className="col-span-12 md:col-span-3">
              <EnhancedDashCard title="School Staff" value={stats.total} icon={<Users size={22} />} accentColor="#3B82F6" size={12} />
            </div>
            <div title="Staff whose cards have been generated" className="col-span-12 md:col-span-3">
              <EnhancedDashCard title="Cards Generated" value={stats.generated} icon={<Shield size={22} />} accentColor="#6366F1" size={12} />
            </div>
            <div title="Staff waiting for card generation" className="col-span-12 md:col-span-3">
              <EnhancedDashCard title="Pending Cards" value={stats.pending} icon={<Clock size={22} />} accentColor="#F59E0B" size={12} />
            </div>
            <div title="Staff whose cards have been physically printed" className="col-span-12 md:col-span-3">
              <EnhancedDashCard title="Cards Printed" value={stats.printed} icon={<CheckCircle size={22} />} accentColor="#10B981" size={12} />
            </div>
          </DashGrid>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
          <Grid cols={12} gap={4}>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Department</label>
              <Select id="filter-department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} searchable={false}>
                <Option value="all" label="All Departments" />
                <Option value="Academics" label="Academics" />
                <Option value="Administration" label="Administration" />
                <Option value="Finance" label="Finance" />
                <Option value="IT Support" label="IT Support" />
                <Option value="Operations" label="Operations" />
              </Select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Staff Role</label>
              <Select id="filter-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} searchable={false}>
                <Option value="all" label="All Roles" />
                <Option value="Teacher" label="Teacher" />
                <Option value="Administrator" label="Administrator" />
                <Option value="Principal" label="Principal" />
                <Option value="Accountant" label="Accountant" />
              </Select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-1.5">Employment Status</label>
              <Select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} searchable={false}>
                <Option value="all" label="All Statuses" />
                <Option value="Active" label="Active" />
                <Option value="Inactive" label="Inactive" />
              </Select>
            </div>
          </Grid>
        </div>

        {/* Main Staff Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#1D1D1F]">
              Staff ID Card Registry
            </h2>
          </div>
          
          <div className="p-6 pt-4 relative min-h-[300px]">
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm gap-3">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
              </div>
            )}
            <DataTable
              columns={registryColumns}
              rows={registryRows}
              actions={registryActions}
              searchable={true}
              searchPlaceholder="Search Staff..."
              pageSize={10}
              exportable={true}
              exportFileName="Staff_ID_Cards_Registry"
              exportColumns={registryExportColumns}
            />
          </div>
        </div>

        {/* Printing & Bulk Operations Table */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#1D1D1F]">
              Printing & Audit Records
            </h2>
            <Button 
              text={`Bulk Print (${selectedStaffIds.size})`} 
              icon={<Printer size={16} />} 
              variant="primary"
              onClick={handleBulkPrint}
              disabled={selectedStaffIds.size === 0}
            />
          </div>
          
          <div className="p-6 pt-4 relative min-h-[300px]">
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm gap-3">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#223F74] rounded-full animate-spin" />
              </div>
            )}
            <DataTable
              columns={printColumns}
              rows={printRows}
              actions={printActions}
              searchable={true}
              searchPlaceholder="Search Print Records..."
              pageSize={10}
              exportable={true}
              exportFileName="Staff_ID_Cards_Printing_Logs"
              exportColumns={printExportColumns}
            />
          </div>
        </div>

        {/* View Details Modal */}
        <PanelModal 
          id="staff-view-modal" 
          title="Staff Details" 
          size="md"
          isVisible={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
        >
          {viewStaff ? (
            <div className="space-y-6 pb-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <img 
                  src={getImageUrl(viewStaff.photo) || defaultAvatarSvg} 
                  alt="Staff" 
                  className="w-16 h-16 rounded-xl object-cover" 
                />
                <div>
                  <h4 className="font-bold text-[#223F74] text-lg">{viewStaff.name}</h4>
                  <p className="text-sm font-medium text-slate-500">
                    <span className="font-semibold text-slate-600">ID:</span> {viewStaff.employeeId || viewStaff.id}
                  </p>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Employment Info</h5>
                <Grid cols={12} gap={4}>
                  <DataField type="text" label="Employee ID" size={6} value={viewStaff.employeeId || viewStaff.id} readOnly />
                  <DataField type="text" label="Staff Name" size={6} value={viewStaff.name} readOnly />
                  <DataField type="text" label="Department" size={6} value={viewStaff.department} readOnly />
                  <DataField type="text" label="Designation" size={6} value={viewStaff.designation} readOnly />
                  <DataField type="text" label="Joining Date" size={6} value={viewStaff.joiningDate} readOnly />
                  <DataField type="text" label="Employment Type" size={6} value={viewStaff.employmentType} readOnly />
                </Grid>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Personal & Contact Info</h5>
                <Grid cols={12} gap={4}>
                  <DataField type="text" label="Email" size={6} value={viewStaff.email} readOnly />
                  <DataField type="text" label="Phone" size={6} value={viewStaff.phone} readOnly />
                  <DataField type="text" label="Gender" size={6} value={viewStaff.gender} readOnly />
                  <DataField type="text" label="Blood Group" size={6} value={viewStaff.bloodGroup} readOnly />
                  <DataField type="text" label="Emergency Contact" size={6} value={viewStaff.emergencyContact} readOnly />
                  <DataField type="textarea" rows={2} label="Address" size={12} value={viewStaff.address} readOnly />
                </Grid>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Card Generation Metadata</h5>
                <Grid cols={12} gap={4}>
                  <DataField type="text" label="Card Status" size={6} value={viewStaff.cardStatus || 'Pending'} readOnly />
                  <DataField type="text" label="Print Count" size={6} value={viewStaff.printCount || 0} readOnly />
                  <DataField type="text" label="Generated Date" size={6} value={viewStaff.generatedDate ? new Date(viewStaff.generatedDate).toLocaleDateString() : 'N/A'} readOnly />
                  <DataField type="text" label="Last Printed Date" size={6} value={viewStaff.lastPrintedDate ? new Date(viewStaff.lastPrintedDate).toLocaleDateString() : 'N/A'} readOnly />
                </Grid>
              </div>
              
              <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                <Button text="Close" variant="secondary" onClick={() => setIsViewModalOpen(false)} />
              </div>
            </div>
          ) : null}
        </PanelModal>

        {/* Edit Details Modal */}
        <PanelModal 
          id="staff-edit-modal" 
          title="Edit ID Card Details" 
          size="md"
          isVisible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        >
          {editStaff ? (
            <div className="space-y-6 pb-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                <p className="text-xs text-blue-700 font-semibold">
                  Editing details for: {editStaff.name} ({editStaff.employeeId || editStaff.id})
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Staff Info (Read Only)</h5>
                <Grid cols={12} gap={4}>
                  <DataField type="text" label="Employee ID" size={6} value={editStaff.employeeId || editStaff.id} readOnly />
                  <DataField type="text" label="Staff Name" size={6} value={editStaff.name} readOnly />
                  <DataField type="text" label="Department" size={6} value={editStaff.department} readOnly />
                  <DataField type="text" label="Designation" size={6} value={editStaff.designation} readOnly />
                </Grid>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Editable Fields</h5>
                <Grid cols={12} gap={4}>
                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Group</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:border-[#223F74]"
                      value={editForm.bloodGroup}
                      onChange={(e) => setEditForm(prev => ({...prev, bloodGroup: e.target.value}))}
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  
                  <DataField 
                    type="text" 
                    label="Emergency Contact" 
                    size={6} 
                    value={editForm.emergencyContact} 
                    onChange={(e) => setEditForm(prev => ({...prev, emergencyContact: e.target.value}))}
                  />

                  <DataField 
                    type="textarea" 
                    label="Address" 
                    size={12} 
                    value={editForm.address} 
                    onChange={(e) => setEditForm(prev => ({...prev, address: e.target.value}))}
                    rows={2}
                  />
                </Grid>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <Button text="Cancel" variant="secondary" onClick={() => setIsEditModalOpen(false)} />
                <Button text="Save Changes" icon={<Save size={16} />} variant="primary" onClick={handleSaveEdit} />
              </div>
            </div>
          ) : null}
        </PanelModal>

        {/* Preview Modal */}
        <PanelModal
          id="staff-preview-modal"
          title="ID Card Preview"
          size="md"
          isVisible={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
        >
          {previewStaff ? (
            <div className="flex flex-col items-center justify-center p-6 space-y-6">
              
              {/* Card visual wrapper */}
              <StaffCard staff={previewStaff} />

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 w-full pt-4 border-t border-slate-100">
                <Button text="Close" variant="secondary" onClick={() => setIsPreviewModalOpen(false)} />
                <Button 
                  text="Print ID Card"
                  icon={<Printer size={16} />}
                  variant="primary"
                  onClick={() => {
                    handlePrint(previewStaff);
                    setIsPreviewModalOpen(false);
                  }}
                />
              </div>

            </div>
          ) : null}
        </PanelModal>

        {/* Audit / Print History Modal */}
        <PanelModal 
          id="staff-audit-modal" 
          title="Printing History" 
          size="md"
          isVisible={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        >
          {auditStaff ? (
            <div className="space-y-4 pb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-2 border border-slate-200">
                <History size={18} className="text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Audit Trail: {auditStaff.name}</p>
                  <p className="text-[10px] text-slate-500">Employee ID: {auditStaff.employeeId || auditStaff.id}</p>
                </div>
              </div>

              {auditStaff.auditTrail && auditStaff.auditTrail.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3 border-b border-slate-200" style={{ width: '28%' }}>Date & Time</th>
                        <th className="py-2 px-3 border-b border-slate-200" style={{ width: '22%' }}>Action</th>
                        <th className="py-2 px-3 border-b border-slate-200" style={{ width: '20%' }}>User</th>
                        <th className="py-2 px-3 border-b border-slate-200" style={{ width: '20%' }}>Device</th>
                        <th className="py-2 px-3 border-b border-slate-200 text-center" style={{ width: '10%' }}>Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditStaff.auditTrail.map((log, index) => (
                        <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-700 text-[11px] truncate" title={new Date(log.date).toLocaleString()}>
                            {new Date(log.date).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 truncate">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              log.action.includes('Printed') ? 'bg-emerald-100 text-emerald-700' : 
                              log.action.includes('Generated') ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`} title={log.action}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs font-semibold truncate" title={log.user}>{log.user}</td>
                          <td className="py-3 px-3 text-slate-500 text-[10px] truncate" title={log.device || 'System'}>{log.device || 'System'}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs font-bold text-center">{log.copies || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <History size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No printing history found</p>
                  <p className="text-xs mt-1">This ID card has not been printed yet.</p>
                </div>
              )}

              <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                <Button text="Close" variant="secondary" onClick={() => setIsAuditModalOpen(false)} />
              </div>
            </div>
          ) : null}
        </PanelModal>

        {/* Hidden Print Container */}
        <div id="print-section" className="hidden print:block">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-section, #print-section * {
                visibility: visible !important;
              }
              #print-section {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .id-card-page {
                page-break-after: always !important;
                break-after: page !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                height: 100vh !important;
                box-sizing: border-box !important;
              }
              .id-card-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: portrait;
                margin: 0;
              }
            }
          `}} />
          {staffToPrint && staffToPrint.map((staff, idx) => (
            <div key={staff.id || idx} className="id-card-page">
              <StaffCard staff={staff} />
            </div>
          ))}
        </div>

      </div>
    </ErrorBoundary>
  );
};

export default AdminStaffIDCardGeneration;
