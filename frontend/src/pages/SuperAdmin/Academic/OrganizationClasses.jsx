import React, { useState, useEffect } from "react";
import {
  getOrganizationClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStatistics,
} from "../../../services/api/organizationApi";
import { useSelector } from "react-redux";
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  FolderOpen,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";
import {
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Heading,
  Grid,
  DataField,
  Button,
  ToggleButton,
  PanelModal,
  openModal,
  closeModal,
} from "../../../components/shared/Common_Components";

// ── Delete confirmation portal modal ─────────────────────────────────────────
import { createPortal } from "react-dom";
function DeleteConfirm({ cls, loading, onConfirm, onCancel }) {
  if (!cls) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertCircle size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">Delete Class?</p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-700">{cls.name}</span>? This
            action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition active:scale-95 shadow-md shadow-rose-500/20 disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const OrganizationClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [statistics, setStatistics] = useState({ total: 0, active: 0, inactive: 0 });

  const [formData, setFormData] = useState({ name: "", description: "", isActive: true });

  const organizationId = useSelector(selectSuperAdmin)?.superAdmin?.organization;

  useEffect(() => {
    fetchClasses();
    fetchStatistics();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await getOrganizationClasses();
      if (res.success) {
        setClasses(res.data);
        updateStats(res.data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await getClassStatistics();
      if (res.success) setStatistics(res.data);
    } catch (_) {}
  };

  const updateStats = (data) => {
    const safe = data || [];
    setStatistics({
      total: safe.length,
      active: safe.filter((c) => c?.isActive !== false).length,
      inactive: safe.filter((c) => c?.isActive === false).length,
    });
  };

  const resetForm = () => setFormData({ name: "", description: "", isActive: true });

  // ── Add ──────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setModalMode("add");
    resetForm();
    setSelectedClass(null);
    openModal("class-form-modal");
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEditModal = (cls) => {
    setModalMode("edit");
    setSelectedClass(cls);
    setFormData({
      name: cls.name || "",
      description: cls.description || "",
      isActive: cls.isActive !== undefined ? cls.isActive : true,
    });
    openModal("class-form-modal");
  };

  // ── Save (add or edit) ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please provide a class name");
      return;
    }
    const isDuplicate = classes.some(
      (c) =>
        c.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        (modalMode === "add" || c._id !== selectedClass?._id)
    );
    if (isDuplicate) {
      toast.error("A class with this name already exists");
      return;
    }

    setFormSaving(true);
    try {
      if (modalMode === "add") {
        const res = await createClass({
          organization: organizationId,
          name: formData.name.trim(),
          description: formData.description || "",
          isActive: formData.isActive,
        });
        if (res.success) {
          setClasses((prev) => [...prev, res.data]);
          updateStats([...classes, res.data]);
          toast.success("Class added successfully");
          closeModal("class-form-modal");
          resetForm();
          fetchStatistics();
        }
      } else {
        const res = await updateClass(selectedClass._id, {
          name: formData.name.trim(),
          description: formData.description || "",
          isActive: formData.isActive,
        });
        if (res.success) {
          const updated = classes.map((c) =>
            c._id === selectedClass._id ? res.data : c
          );
          setClasses(updated);
          updateStats(updated);
          toast.success("Class updated successfully");
          closeModal("class-form-modal");
          setSelectedClass(null);
          resetForm();
          fetchStatistics();
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save class");
    } finally {
      setFormSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClass(selectedClass._id);
      if (res.success) {
        const remaining = classes.filter((c) => c._id !== selectedClass._id);
        setClasses(remaining);
        updateStats(remaining);
        toast.success("Class deleted successfully");
        setShowDeleteConfirm(false);
        setSelectedClass(null);
        fetchStatistics();
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete class");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Table columns & rows ──────────────────────────────────────────────────
  const tableColumns = [
    {
      key: "name",
      label: "Class Name",
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#223F74]/10 border border-[#223F74]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#223F74] font-black text-xs uppercase">{val?.charAt(0)}</span>
          </div>
          <span className="font-semibold text-[#1D1D1F]">{val}</span>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (val) => (
        <span className="text-slate-500 text-sm">{val || <span className="italic text-slate-300">—</span>}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) =>
        row.isActive !== false ? "Active" : "Inactive",
    },
    {
      key: "createdAt",
      label: "Created",
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
  ];

  const tableRows = classes.map((c) => {
    const { 
      numericLevel,
      ...cleanRowData // <-- Keep everything else
    } = c;
    return {
      ...cleanRowData,
      status: c.isActive !== false ? "Active" : "Inactive",
    };
  });

  const tableActions = [
    {
      icon: <Edit2 size={14} />,
      tooltip: "Edit Class",
      variant: "ghost",
      onClick: (row) => openEditModal(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Delete Class",
      variant: "danger",
      onClick: (row) => {
        setSelectedClass(row);
        setShowDeleteConfirm(true);
      },
    },
  ];

  // ── Grid card view ────────────────────────────────────────────────────────
  const renderGridView = () => {
    if (classes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <FolderOpen size={48} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-1">No classes yet</h3>
          <p className="text-sm text-slate-400 mb-6">Create your first class to get started</p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#223F74] text-white text-sm font-bold rounded-full hover:bg-[#1a3059] transition active:scale-95 shadow-md"
          >
            <Plus size={16} /> Add Class
          </button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map((cls) => (
          <div
            key={cls._id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#223F74]/20 transition-all duration-200 overflow-hidden flex flex-col"
          >
            <div
              className={`p-4 border-b ${
                cls.isActive !== false
                  ? "bg-gradient-to-r from-[#223F74]/5 to-[#F59B87]/5"
                  : "bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg uppercase ${
                      cls.isActive !== false
                        ? "bg-[#223F74] text-white shadow-md shadow-[#223F74]/20"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {cls.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1D1D1F] truncate max-w-[120px]">{cls.name}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        cls.isActive !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {cls.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(cls)}
                    className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 flex-1">
              {cls.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                  {cls.description}
                </p>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-auto pt-2 border-t border-slate-50">
                Created{" "}
                {new Date(cls.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Heading ── */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="Classes"
          secondaryText="Management"
          size={12}
          fontSize="2xl"
        />
      </Grid>


      {/* ── Stat Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Classes"
          value={String(statistics.total)}
          icon={<GraduationCap size={22} />}
          accentColor="#F59B87"
          size={4}
        />
        <EnhancedDashCard
          title="Active Classes"
          value={String(statistics.active)}
          icon={<CheckCircle size={22} />}
          accentColor="#4ade80"
          size={4}
        />
        <EnhancedDashCard
          title="Inactive Classes"
          value={String(statistics.inactive)}
          icon={<XCircle size={22} />}
          accentColor="#f87171"
          size={4}
        />
      </DashGrid>

      {/* ── Actions Row ── */}
      <div className="flex items-center justify-end">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white text-sm font-bold rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
        >
          <Plus size={16} /> Add Class
        </button>
      </div>

      {/* ── Data ── */}
      {loading ? (
        <div className="flex items-center justify-center h-56 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 border-4 border-[#223F74]/20 border-t-[#223F74] rounded-full animate-spin" />
        </div>
      ) : (
        <Grid cols={12} gap={4}>
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            actions={tableActions}
            title="All Classes"
            size={12}
            pageSize={10}
            pageSizeOptions={[5, 10, 20]}
            searchable={true}
            filters={[
              {
                title: "Status",
                type: "toggle",
                key: "status",
                options: ["Active", "Inactive"],
              },
            ]}
            exportable={true}
            exportFileName="classes-export"
          />
        </Grid>
      )}

      {/* ── Add / Edit Modal ── */}
      <PanelModal
        id="class-form-modal"
        title={modalMode === "add" ? "Add New Class" : "Edit Class"}
        size="md"
        onClose={() => {
          resetForm();
          setSelectedClass(null);
        }}
      >
        <Grid cols={12} gap={4}>
          <DataField
            label="Class Name *"
            id="class-name"
            placeholder="e.g. Nursery"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            size={12}
            autoFocus
          />
          <DataField
            label="Description"
            id="class-desc"
            type="textarea"
            placeholder="Optional details about this class…"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            size={12}
          />

          {/* Active toggle */}
          <div className="col-span-12 flex items-center justify-between p-3.5 rounded-2xl border border-[#E7E2DB] bg-[#F4F7FB]">
            <div>
              <p className="text-sm font-bold text-[#1D1D1F]">Class is Active</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Allow students to be assigned to this class
              </p>
            </div>
            <ToggleButton
              checked={formData.isActive}
              onChange={(val) => setFormData({ ...formData, isActive: val })}
              label="Active"
              labelOff="Inactive"
            />
          </div>

          <Button
            text={formSaving ? "Saving…" : modalMode === "add" ? "Add Class" : "Save Changes"}
            variant="primary"
            size={8}
            icon={<Save size={15} />}
            loading={formSaving}
            onClick={handleSave}
          />
          <Button
            text="Cancel"
            variant="secondary"
            size={4}
            onClick={() => closeModal("class-form-modal")}
          />
        </Grid>
      </PanelModal>

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <DeleteConfirm
          cls={selectedClass}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
};

export default OrganizationClasses;
