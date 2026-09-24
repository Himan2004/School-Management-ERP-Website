import React, { useState, useEffect } from "react";
import {
  getOrganizationSubjects,
  createOrganizationSubject,
  updateOrganizationSubject,
  deleteOrganizationSubject,
  getOrganizationSubjectStatistics,
  getOrganizationClasses,
} from "../../../services/api/organizationApi";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  GraduationCap,
  Layers,
  AlertCircle,
  Save,
  FolderOpen,
  LayoutGrid,
  List,
  FlaskConical,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";
import {
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Heading,
  Grid,
  DataField,
  Button,
  Select,
  Option,
  ToggleButton,
  PanelModal,
  openModal,
  closeModal,
  Label,
} from "../../../components/shared/Common_Components";

// ── Delete Confirm Portal ─────────────────────────────────────────────────────
function DeleteConfirm({ subject, loading, onConfirm, onCancel }) {
  if (!subject) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertCircle size={26} className="text-rose-500" />
          </div>
          <p className="text-base font-black text-[#2a465a] text-center">Delete Subject?</p>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-700">{subject.name}</span>? This
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

// ── Type Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    core:      { bg: "bg-blue-100 text-blue-700",    label: "Core" },
    optional:  { bg: "bg-purple-100 text-purple-700", label: "Optional" },
    practical: { bg: "bg-orange-100 text-orange-700", label: "Practical" },
  };
  const cfg = map[type] ?? { bg: "bg-slate-100 text-slate-600", label: type };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const OrganizationSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassFilter, setSelectedClassFilter] = useState("");

  const [organizationId, setOrganizationId] = useState("");

  const [statistics, setStatistics] = useState({
    total: 0, active: 0, inactive: 0, core: 0, optional: 0, practical: 0,
  });

  // Modal / form state
  const [modalMode, setModalMode] = useState("add");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", code: "", type: "core", classId: "", isActive: true,
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const orgId =
      localStorage.getItem("organizationMongoId") ||
      localStorage.getItem("organizationId");
    if (orgId) {
      setOrganizationId(orgId);
    } else {
      toast.error("Organization not found. Please login again.");
    }
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchClasses();
      fetchSubjects();
      fetchStatistics();
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) fetchSubjects();
  }, [selectedClassFilter]);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const orgId = localStorage.getItem("organizationMongoId") || organizationId;
      if (!orgId) { setLoading(false); return; }
      const res = await getOrganizationSubjects(orgId, selectedClassFilter || null);
      if (res.success) {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.subjects || res.data?.data || [];
        setSubjects(data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const orgId = localStorage.getItem("organizationMongoId") || organizationId;
      if (!orgId) return;
      const res = await getOrganizationClasses(orgId);
      if (res.success) setClasses(res.data);
    } catch (_) {}
  };

  const fetchStatistics = async () => {
    try {
      const orgId = localStorage.getItem("organizationMongoId") || organizationId;
      if (!orgId) return;
      const res = await getOrganizationSubjectStatistics(orgId);
      if (res.success) setStatistics(res.data);
    } catch (_) {}
  };

  const resetForm = () =>
    setFormData({ name: "", code: "", type: "core", classId: "", isActive: true });

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAddModal = () => {
    setModalMode("add");
    resetForm();
    setSelectedSubject(null);
    openModal("subject-form-modal");
  };

  const openEditModal = (subject) => {
    setModalMode("edit");
    setSelectedSubject(subject);
    setFormData({
      name: subject.name || "",
      code: subject.code || "",
      type: subject.type || "core",
      classId: subject.classRef?._id || "",
      isActive: subject.isActive !== undefined ? subject.isActive : true,
    });
    openModal("subject-form-modal");
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.classId) {
      toast.error("Please fill in all required fields (Name and Class)");
      return;
    }
    setFormSaving(true);
    try {
      if (modalMode === "add") {
        const res = await createOrganizationSubject({
          organizationId,
          classId: formData.classId,
          name: formData.name.trim(),
          code: formData.code,
          type: formData.type,
          isActive: formData.isActive,
        });
        if (res.success) {
          toast.success("Subject added successfully");
          fetchSubjects();
          fetchStatistics();
          resetForm();
          closeModal("subject-form-modal");
        }
      } else {
        const res = await updateOrganizationSubject(selectedSubject._id, {
          organizationId,
          classId: formData.classId,
          name: formData.name.trim(),
          code: formData.code,
          type: formData.type,
          isActive: formData.isActive,
        });
        if (res.success) {
          toast.success("Subject updated successfully");
          fetchSubjects();
          fetchStatistics();
          resetForm();
          closeModal("subject-form-modal");
          setSelectedSubject(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save subject");
    } finally {
      setFormSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteOrganizationSubject({
        id: selectedSubject._id,
        organizationId,
      });
      if (res.success) {
        setSubjects((prev) => prev.filter((s) => s._id !== selectedSubject._id));
        toast.success("Subject deleted successfully");
        setShowDeleteConfirm(false);
        setSelectedSubject(null);
        fetchStatistics();
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete subject");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Helper: class info ────────────────────────────────────────────────────
  const getClassLabel = (subject) => {
    if (subject.classRef?.name) return subject.classRef.name;
    return "—";
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: "name",
      label: "Subject Name",
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F59B87]/15 border border-[#F59B87]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#F59B87] font-black text-xs uppercase">
              {val?.charAt(0)}
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#1D1D1F] block">{val}</span>
            {row.code && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {row.code}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (val) => <TypeBadge type={val} />,
    },
    {
      key: "className",
      label: "Class",
      render: (val) => (
        <span className="text-sm font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => (row.isActive !== false ? "Active" : "Inactive"),
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

  const tableRows = subjects.map((s) => ({
    ...s,
    className: getClassLabel(s),
    status: s.isActive !== false ? "Active" : "Inactive",
  }));

  const tableActions = [
    {
      icon: <Edit2 size={14} />,
      tooltip: "Edit Subject",
      variant: "ghost",
      onClick: (row) => openEditModal(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Delete Subject",
      variant: "danger",
      onClick: (row) => {
        setSelectedSubject(row);
        setShowDeleteConfirm(true);
      },
    },
  ];

  // ── Grid card view ─────────────────────────────────────────────────────────
  const renderGridView = () => {
    if (subjects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <FolderOpen size={48} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-1">No subjects yet</h3>
          <p className="text-sm text-slate-400 mb-6">Add subjects to get started</p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#223F74] text-white text-sm font-bold rounded-full hover:bg-[#1a3059] transition active:scale-95 shadow-md"
          >
            <Plus size={16} /> Add Subject
          </button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subjects.map((subject) => (
          <div
            key={subject._id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#F59B87]/30 transition-all duration-200 overflow-hidden flex flex-col"
          >
            <div
              className={`p-4 border-b ${
                subject.isActive !== false
                  ? "bg-gradient-to-r from-[#F59B87]/5 to-[#223F74]/5"
                  : "bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1D1D1F] truncate">{subject.name}</h3>
                  {subject.code && (
                    <p className="text-[11px] font-mono text-slate-400 bg-white/60 inline-block px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                      {subject.code}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(subject)}
                    className="p-1.5 text-slate-400 hover:text-[#223F74] hover:bg-[#223F74]/10 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => { setSelectedSubject(subject); setShowDeleteConfirm(true); }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 flex-1 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Type</span>
                <TypeBadge type={subject.type} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Class</span>
                <span className="text-slate-700 font-semibold bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-xs truncate max-w-[60%] text-right">
                  {getClassLabel(subject)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    subject.isActive !== false
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {subject.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50 flex justify-between">
                <span>Created</span>
                <span>{new Date(subject.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
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
          primaryText="Subjects"
          secondaryText="Management"
          size={12}
          fontSize="2xl"
        />
      </Grid>


      {/* ── Stat Cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Subjects"    value={String(statistics.total    || subjects.length)} icon={<BookOpen size={22} />}         accentColor="#F59B87" size={4} />
        <EnhancedDashCard title="Active"            value={String(statistics.active   || subjects.filter(s => s.isActive !== false).length)} icon={<CheckCircle size={22} />}     accentColor="#4ade80" size={2} />
        <EnhancedDashCard title="Inactive"          value={String(statistics.inactive || subjects.filter(s => s.isActive === false).length)} icon={<XCircle size={22} />}         accentColor="#f87171" size={2} />
        <EnhancedDashCard title="Core"              value={String(statistics.core     || subjects.filter(s => s.type === "core").length)}    icon={<GraduationCap size={22} />}   accentColor="#60a5fa" size={2} />
        <EnhancedDashCard title="Optional"          value={String(statistics.optional || subjects.filter(s => s.type === "optional").length)} icon={<Layers size={22} />}          accentColor="#c084fc" size={2} />
      </DashGrid>

      {/* ── Actions Row ── */}
      <div className="flex items-center justify-end">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F59B87] hover:bg-[#EC856D] text-white text-sm font-bold rounded-full shadow-lg shadow-[#F59B87]/30 transition hover:-translate-y-0.5 active:scale-95"
        >
          <Plus size={16} /> Add Subject
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
            title="All Subjects"
            size={12}
            pageSize={10}
            pageSizeOptions={[5, 10, 20]}
            searchable={true}
            filters={[
              {
                title: "Type",
                type: "toggle",
                key: "type",
                options: ["core", "optional", "practical"],
              },
              {
                title: "Status",
                type: "toggle",
                key: "status",
                options: ["Active", "Inactive"],
              },
              {
                title: "Class",
                type: "select",
                key: "className",
                options: classes.map((c) => c.name),
              },
            ]}
            exportable={true}
            exportFileName="subjects-export"
          />
        </Grid>
      )}

      {/* ── Add / Edit Modal ── */}
      <PanelModal
        id="subject-form-modal"
        title={modalMode === "add" ? "Add New Subject" : "Edit Subject"}
        size="lg"
        onClose={() => { resetForm(); setSelectedSubject(null); }}
      >
        <Grid cols={12} gap={4}>
          {/* Name */}
          <DataField
            label="Subject Name *"
            id="subject-name"
            placeholder="e.g., Mathematics"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            size={7}
            autoFocus
          />
          {/* Code */}
          <DataField
            label="Subject Code"
            id="subject-code"
            placeholder="e.g., MATH101"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            size={5}
          />

          {/* Class select */}
          <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
              Select Class *
            </label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full rounded-2xl border border-[#E7E2DB] bg-white py-3.5 px-4 text-sm font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#F59B87]/15 focus:border-[#F59B87] transition duration-200"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Type select */}
          <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
              Subject Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-2xl border border-[#E7E2DB] bg-white py-3.5 px-4 text-sm font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#F59B87]/15 focus:border-[#F59B87] transition duration-200"
            >
              <option value="core">Core Subject</option>
              <option value="optional">Optional Subject</option>
              <option value="practical">Practical Subject</option>
            </select>
          </div>

          {/* Active toggle */}
          <div className="col-span-12 flex items-center justify-between p-3.5 rounded-2xl border border-[#E7E2DB] bg-[#F4F7FB]">
            <div>
              <p className="text-sm font-bold text-[#1D1D1F]">Subject is Active</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Active subjects are visible to teachers and students
              </p>
            </div>
            <ToggleButton
              checked={formData.isActive}
              onChange={(val) => setFormData({ ...formData, isActive: val })}
              label="Active"
              labelOff="Inactive"
            />
          </div>

          {/* Actions */}
          <Button
            text={formSaving ? "Saving…" : modalMode === "add" ? "Add Subject" : "Save Changes"}
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
            onClick={() => closeModal("subject-form-modal")}
          />
        </Grid>
      </PanelModal>

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <DeleteConfirm
          subject={selectedSubject}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setShowDeleteConfirm(false); setSelectedSubject(null); }}
        />
      )}
    </div>
  );
};

export default OrganizationSubjects;