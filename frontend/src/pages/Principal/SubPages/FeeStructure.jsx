import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Search, Filter, Calendar, Clock, AlertCircle, Users, DollarSign, Loader2, CheckCircle } from "lucide-react";
import {
  createPrincipalFeeStructure,
  deletePrincipalFeeStructure,
  getPrincipalFeeStructures,
  updatePrincipalFeeStructure,
} from "../../../services/api/principalFinanceApi";
import { getClasses } from "../../../services/api/principalStudentApi";
import {
  DataTable,
  Button,
  DataField,
  Heading,
  Grid,
  DashGrid,
  EnhancedDashCard,
  PanelModal,
  openModal,
  closeModal,
  Select,
  Option,
  SelectField,
} from "../../../components/shared/Common_Components";

// Simple Avatar component
const UserAvatar = ({ name, size = 32, className = "" }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  };

  const getColor = (name) => {
    const colors = [
      "bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-emerald-500",
      "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-pink-500",
      "bg-cyan-500", "bg-orange-500", "bg-lime-600", "bg-sky-500",
      "bg-purple-500", "bg-fuchsia-500", "bg-red-500", "bg-green-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-bold ${getColor(name)} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  );
};

const FeeStructure = () => {
  const [feeStructures, setFeeStructures] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filteredStructures, setFilteredStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Monthly",
    classes: [],
    amount: "",
    dueDate: "10th",
    lateFee: "",
    gst: false,
    gstPercent: "",
    description: "",
    status: "Active",
  });

  const getSchoolId = () => {
    const directId = localStorage.getItem("schoolId") || "backend_handles_this";
    if (directId && directId !== "undefined" && directId !== "null") return directId;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj?.school || userObj?.school?._id || null;
      }
    } catch (e) { console.error("Error parsing"); }
    return null;
  };

  const schoolId = getSchoolId();
  const academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const feeTypes = ["Monthly", "Quarterly", "Annually", "One Time"];
  const dueDates = Array.from(
    { length: 28 },
    (_, i) =>
      `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}`,
  );

  const loadClasses = async () => {
    try {
      const response = await getClasses();
      if (response?.success && response?.data?.classes) {
        const classNames = response.data.classes.map((c) => c.name);
        setAllClasses(classNames);
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    }
  };

  const loadFeeStructures = async () => {
    if (!schoolId) {
      setLoading(false);
      setError("School ID not found. Please sign in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getPrincipalFeeStructures(schoolId, {
        academicYear,
      });
      const data = response?.data || [];
      setFeeStructures(data);
      setFilteredStructures(data);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
        loadError.message ||
        "Failed to load fee structures",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadFeeStructures(), loadClasses()]);
  };

  useEffect(() => {
    if (schoolId) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    let filtered = [...feeStructures];

    if (typeFilter !== "All") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStructures(filtered);
  }, [typeFilter, statusFilter, feeStructures]);

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      name: "",
      type: "Monthly",
      classes: [],
      amount: "",
      dueDate: "10th",
      lateFee: "",
      gst: false,
      gstPercent: "",
      description: "",
      status: "Active",
    });
    setShowModal(true);
  };

  const handleEdit = (structure) => {
    setEditingId(structure.id);
    setFormData({
      name: structure.name || "",
      type: structure.type || "Monthly",
      classes: Array.isArray(structure.classes) ? structure.classes : [],
      amount: structure.amount ?? "",
      dueDate: structure.dueDate || "10th",
      lateFee: structure.lateFee ?? "",
      gst: Boolean(structure.gst),
      gstPercent: structure.gstPercent ?? "",
      description: structure.description || "",
      status: structure.status || "Active",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount || formData.classes.length === 0) {
      alert("Please fill all required fields");
      return;
    }

    if (!schoolId) {
      alert("School ID not found");
      return;
    }

    setSaving(true);

    const payload = {
      ...formData,
      academicYear,
      amount: Number(formData.amount),
      lateFee: formData.lateFee === "" ? 0 : Number(formData.lateFee),
      gstPercent: formData.gst ? Number(formData.gstPercent || 0) : 0,
    };

    try {
      if (editingId) {
        await updatePrincipalFeeStructure(schoolId, editingId, payload);
        alert("Fee structure updated successfully");
      } else {
        await createPrincipalFeeStructure(schoolId, payload);
        alert("Fee structure added successfully");
      }

      setShowModal(false);
      await loadFeeStructures();
    } catch (saveError) {
      alert(
        saveError.response?.data?.message ||
        saveError.message ||
        "Failed to save fee structure",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!schoolId) {
      alert("School ID not found");
      return;
    }

    try {
      await deletePrincipalFeeStructure(schoolId, id);
      setDeleteConfirm(null);
      alert("Fee structure deleted successfully");
      await loadFeeStructures();
    } catch (deleteError) {
      alert(
        deleteError.response?.data?.message ||
        deleteError.message ||
        "Failed to delete fee structure",
      );
    }
  };

  const toggleClass = (className) => {
    setFormData((prev) => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter((c) => c !== className)
        : [...prev.classes, className],
    }));
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Table columns configuration
  const columns = [
    {
      key: "name",
      label: "Fee Name",
      width: "180px",
    },
    {
      key: "type",
      label: "Type",
      width: "120px",
    },
    {
      key: "classes",
      label: "Classes",
      width: "200px",
    },
    {
      key: "amount",
      label: "Amount",
      width: "120px",
    },
    {
      key: "dueDate",
      label: "Due Date",
      width: "120px",
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
    },
  ];

  // Transform data for DataTable
  const tableRows = filteredStructures.map(structure => ({
    id: structure.id,
    name: structure.name || 'N/A',
    type: structure.type || 'Monthly',
    classes: structure.classes || [],
    amount: structure.amount || 0,
    dueDate: structure.dueDate || '10th',
    status: structure.status || 'Active',
    gst: structure.gst || false,
    gstPercent: structure.gstPercent || 0,
    lateFee: structure.lateFee || 0,
    description: structure.description || '',
    amountFormatted: formatAmount(structure.amount || 0),
  }));

  // Actions for DataTable
  const actions = [
    {
      icon: <Edit2 size={14} />,
      tooltip: "Edit",
      variant: "primary",
      onClick: (row) => handleEdit(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Delete",
      variant: "danger",
      onClick: (row) => setDeleteConfirm(row.id),
    },
  ];

  // Stats for EnhancedDashCard
  const activeStructures = feeStructures.filter(s => s.status === "Active").length;
  const stats = [
    {
      title: "Total Fee Structures",
      value: String(feeStructures.length),
      icon: <Users size={22} />,
      accentColor: "#3b82f6",
      size: 3,
    },
    {
      title: "Active Structures",
      value: String(activeStructures),
      icon: <CheckCircle size={22} />,
      accentColor: "#16a34a",
      size: 3,
    },
    {
      title: "Fee Types",
      value: String(feeTypes.length),
      icon: <Filter size={22} />,
      accentColor: "#8b5cf6",
      size: 3,
    },
    {
      title: "Total Classes",
      value: String(allClasses.length),
      icon: <Users size={22} />,
      accentColor: "#f59e0b",
      size: 3,
    },
  ];

  return (
    <>
      <style>{`
        /* Hide the native border of Select inside our premium wrapper */
        .premium-select-wrapper select {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding-left: 0.5rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
        }
        .premium-select-wrapper select:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <div className="w-full space-y-6 pb-12 font-sans text-left">
      {/* Page Header */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="Fee"
          secondaryText="Structure"
          size={12}
          showAnimations={true}
        />
      </Grid>

      {error && (
        <div className="p-5 rounded-2xl border border-rose-100 bg-rose-50/50 text-[#9E2E25] font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <DashGrid cols={12} gap={4}>
        {stats.map((stat, idx) => (
          <EnhancedDashCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            accentColor={stat.accentColor}
            size={stat.size}
            showAnimations={true}
          />
        ))}
      </DashGrid>

      {/* Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-5 mb-6">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-6">
            <SelectField
              label="Fee Type"
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All" label="All Types" />
              {feeTypes.map((type) => (
                <Option key={type} value={type} label={type} />
              ))}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-6">
            <SelectField
              label="Status"
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All" label="All Status" />
              <Option value="Active" label="Active" />
              <Option value="Inactive" label="Inactive" />
            </SelectField>
          </div>
        </Grid>
      </div>

      {/* Data Table with Add Button */}
      <div>
        <DataTable
          columns={columns}
          rows={tableRows}
          actions={actions}
          size={12}
          pageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
          searchable={true}
          bulkAction={false}
          exportable={true}
          title="Fee Structure Records"
          onRefresh={handleRefresh}
        />
        
        {/* Add Fee Structure Button */}
        <div className="flex justify-end mt-4">
          <Button
            variant="primary"
            onClick={handleAddClick}
            icon={<Plus className="w-5 h-5" />}
          >
            Add Fee Structure
          </Button>
        </div>
      </div>

      {/* Add/Edit Modal using PanelModal */}
      {showModal && (
        <PanelModal
          id="fee-structure-modal"
          title={editingId ? "Edit Fee Structure" : "Add Fee Structure"}
          isVisible={showModal}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <div className="space-y-6">
            <Grid cols={12} gap={4}>
              <div className="col-span-12">
                <DataField
                  label="Fee Category Name *"
                  id="feeName"
                  placeholder="e.g., Tuition Fee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  size={12}
                />
              </div>

              <div className="col-span-6">
                <SelectField
                  label="Fee Type *"
                  id="feeType"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  size={12}
                >
                  {feeTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </SelectField>
              </div>

              <div className="col-span-6">
                <DataField
                  label="Amount (₹) *"
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  size={12}
                />
              </div>

              <div className="col-span-12">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
                    Applicable Classes *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {allClasses.map((cls) => (
                      <label key={cls} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.classes.includes(cls)}
                          onChange={() => toggleClass(cls)}
                          className="rounded border-slate-300 accent-[#223F74]"
                        />
                        <span className="text-sm text-slate-700 font-medium">{cls}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <SelectField
                  label="Due Date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  size={12}
                >
                  {dueDates.map((date) => (
                    <option key={date} value={date}>{date} of month</option>
                  ))}
                </SelectField>
              </div>

              <div className="col-span-6">
                <DataField
                  label="Late Fee Penalty (₹/day)"
                  id="lateFee"
                  type="number"
                  placeholder="0"
                  value={formData.lateFee}
                  onChange={(e) => setFormData({ ...formData, lateFee: e.target.value })}
                  size={12}
                />
              </div>

              <div className="col-span-12">
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.gst}
                      onChange={(e) => setFormData({
                        ...formData,
                        gst: e.target.checked,
                        gstPercent: e.target.checked ? 5 : "",
                      })}
                      className="rounded border-slate-300 accent-[#223F74]"
                    />
                    <span className="text-sm font-semibold text-[#1D1D1F]">
                      GST Applicable
                    </span>
                  </label>
                  {formData.gst && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">%</span>
                      <input
                        type="number"
                        value={formData.gstPercent}
                        onChange={(e) => setFormData({ ...formData, gstPercent: e.target.value })}
                        className="w-20 rounded-xl border border-[#E2E8F0] bg-white py-2 px-3 text-[#1D1D1F] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition duration-200"
                        placeholder="5"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12">
                <DataField
                  label="Description"
                  id="description"
                  type="textarea"
                  placeholder="Add any additional notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  size={12}
                />
              </div>

              <div className="col-span-12">
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-sm font-semibold text-[#1D1D1F]">
                    Status:
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === "Active"}
                      onChange={() => setFormData({ ...formData, status: "Active" })}
                      className="accent-[#223F74]"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === "Inactive"}
                      onChange={() => setFormData({ ...formData, status: "Inactive" })}
                      className="accent-[#223F74]"
                    />
                    <span className="text-sm text-slate-700">Inactive</span>
                  </label>
                </div>
              </div>
            </Grid>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <div className="flex-1">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                  icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                >
                  {saving ? "Saving..." : editingId ? "Update Fee Structure" : "Add Fee Structure"}
                </Button>
              </div>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </PanelModal>
      )}

      {/* Delete Confirmation Modal using PanelModal */}
      {deleteConfirm && (
        <PanelModal
          id="delete-confirm-modal"
          title="Delete Fee Structure?"
          isVisible={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
              <div className="p-2 rounded-xl bg-rose-100">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Deleting this will affect all pending fee records. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <Button
                  variant="danger"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="w-full"
                >
                  Delete
                </Button>
              </div>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </PanelModal>
      )}
    </div>
    </>
  );
};

export default FeeStructure;