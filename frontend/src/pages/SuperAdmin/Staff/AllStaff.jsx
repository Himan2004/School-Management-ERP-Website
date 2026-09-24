import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserCheck,
  Briefcase,
  UserRound,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  // PanelModal,
} from "lucide-react";
import { useSelector } from "react-redux";
import * as staffApi from "../../../services/staffApi";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Modal,
  ModalProfile,
  ModalGrid,
  ModalData,
  DataField,
  SelectField,
  Option,
  Button,
  openModal,
  closeModal,
  PanelModal,
} from "../../../components/shared/Common_Components";

const ROLE_OPTIONS = [
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "principal", label: "Principal" },
];

const ADD_MODAL_ID = "all-staff-add-modal";
const EDIT_MODAL_ID = "all-staff-edit-modal";
const VIEW_MODAL_ID = "all-staff-view-modal";

const StaffFormSection = ({ title, description, icon: Icon, children }) => (
  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-5 py-4 bg-slate-50/60 rounded-t-2xl">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#223F74]/10 text-[#223F74]">
        {React.createElement(Icon, { size: 16 })}
      </span>
      <div>
        <p className="text-xs font-black text-[#223F74] uppercase tracking-[0.18em] leading-tight">{title}</p>
        {description && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="p-5">
      <DashGrid cols={12} gap={4}>{children}</DashGrid>
    </div>
  </div>
);

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "teacher",
  status: "active",
  school: "",
};

const AllStaff = () => {
  const authUser = useSelector(selectSuperAdmin);
  const organizationId = authUser?.organization?._id;

  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

  const [addForm, setAddForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Load staff (all branches) ──
  const loadStaff = useCallback(async () => {
    try {
      setError(null);
      const response = await staffApi.fetchAllStaff();
      console.log(response);
      setStaffList(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load staff members");
      console.error("Error loading staff:", err);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ── Cross-branch school list, derived from the fetched staff ──
  const schoolOptions = useMemo(() => {
    const map = new Map();
    staffList.forEach((staff) => {
      const schoolId = staff?.school?._id;
      const schoolName = staff?.school?.schoolName || staff?.school?.name;
      if (schoolId && !map.has(schoolId)) {
        map.set(schoolId, { id: schoolId, name: schoolName || schoolId });
      }
    });
    return Array.from(map.values());
  }, [staffList]);

  useEffect(() => {
    if (!addForm.school && schoolOptions.length > 0) {
      setAddForm((prev) => ({ ...prev, school: schoolOptions[0].id }));
    }
  }, [addForm.school, schoolOptions]);

  // ── Client-side stats ──
  const stats = useMemo(
    () => [
      {
        title: "Total Staff",
        value: staffList.length.toString(),
        icon: <Users size={22} />,
        accentColor: "#7A8FC6",
      },
      {
        title: "Active",
        value: staffList.filter((s) => s.status === "active").length.toString(),
        icon: <UserCheck size={22} />,
        accentColor: "#5B9A6A",
      },
      {
        title: "Teachers",
        value: staffList.filter((s) => s.role === "teacher").length.toString(),
        icon: <Briefcase size={22} />,
        accentColor: "#E0A04B",
      },
      {
        title: "Non-Teacher",
        value: staffList
          .filter((s) => ["admin", "accountant", "principal"].includes(s.role))
          .length.toString(),
        icon: <UserRound size={22} />,
        accentColor: "#7A8FC6",
      },
    ],
    [staffList],
  );

  // ── Add staff ──
  const openAddModal = () => {
    setAddForm({
      ...emptyForm,
      school: schoolOptions[0]?.id || "",
    });
    openModal(ADD_MODAL_ID);
  };

  const handleAddStaff = useCallback(
    async (e) => {
      e.preventDefault();
      if (
        !addForm.name ||
        !addForm.email ||
        !addForm.school ||
        !addForm.phone
      ) {
        setError("Name, email, phone, and school are required");
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);
        const response = await staffApi.createStaffMember({
          name: addForm.name,
          email: addForm.email,
          phone: addForm.phone,
          role: addForm.role,
          school: addForm.school,
          organization: organizationId,
          status: addForm.status,
        });

        setStaffList((prev) => [response.data.user || response.data, ...prev]);
        closeModal(ADD_MODAL_ID);
        setAddForm(emptyForm);

        setSuccessMessage(
          response.message || "Staff member added and credentials emailed!",
        );
      } catch (err) {
        setError(err.message || "Failed to add staff member");
      } finally {
        setIsSubmitting(false);
      }
    },
    [addForm, organizationId],
  );

  // ── Edit staff ──
  const openEditModal = (staff) => {
    setEditingStaff(staff);

    // ✅ FIX: Safely fallback to nested .user properties if top level doesn't exist
    setEditForm({
      name: staff.name || staff.user?.name || "",
      email: staff.email || staff.user?.email || "",
      phone: staff.phone || staff.user?.phone || "",
      role: staff.role || "teacher",
      status: staff.status || "active",
      school: staff?.school?._id || staff.school || "",
    });

    openModal(EDIT_MODAL_ID);
  };

  const handleEditStaff = useCallback(
    async (e) => {
      e.preventDefault();
      if (!editingStaff) return;

      // Optional: Trim the strings to ensure they aren't just spaces.
      // If you don't want to force users to enter a phone number on every edit,
      // you can safely remove the `phone` check here entirely.
      const currentName = editForm.name?.toString().trim();
      const currentPhone = editForm.phone?.toString().trim();

      if (!currentName) {
        setError("Name is required");
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);

        // 🔥 Send ONLY the allowed fields to the backend
        const response = await staffApi.updateStaffMember(editingStaff._id, {
          name: currentName,
          phone: currentPhone,
          status: editForm.status,
          school: editForm.school,
        });

        const updated = response.data?.user ||
          response.data || {
            ...editingStaff,
            ...editForm,
          };

        setStaffList((prev) =>
          prev.map((s) =>
            s._id === editingStaff._id ? { ...s, ...updated } : s,
          ),
        );
        closeModal(EDIT_MODAL_ID);
        setEditingStaff(null);
        setSuccessMessage("Staff member updated successfully");
      } catch (err) {
        setError(err.message || "Failed to update staff member");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editForm, editingStaff],
  );

  // ── Delete (deactivate) staff ──
  const handleDelete = useCallback(async (staff) => {
    const staffName = staff.name || staff.user?.name || "this staff member";
    if (!window.confirm(`Are you sure you want to deactivate ${staffName}?`))
      return;

    try {
      await staffApi.deleteStaffMember(staff._id);
      setStaffList((prev) => prev.filter((s) => s._id !== staff._id));
      setSuccessMessage("Staff member deactivated successfully");
    } catch (err) {
      setError(err.message || "Failed to delete staff member");
    }
  }, []);

  // ── DataTable column + action config ──
  const columns = [
    {
      key: "name",
      label: "Name",
      // ✅ FIX: Extract nested names for Search and Render
      searchValue: (row) =>
        `${row.name || row.user?.name || ""} ${row.email || row.user?.email || ""}`,
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">
            {row.name || row.user?.name || "Unknown"}
          </span>
          <span className="text-xs text-slate-500">
            {row.email || row.user?.email || ""}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact Details",
      sortValue: (row) => row.email || "",
      searchValue: (row) => `${row.email || ""} ${row.phone || ""}`,
      render: (_val, row) => (
        <div className="flex flex-col gap-1 py-0.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <Mail size={12} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[180px]">{row.email || "—"}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Phone size={12} className="text-slate-400 shrink-0" />
            {row.phone || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "school",
      label: "School / Branch",
      sortValue: (row) => row?.school?.schoolName || row?.school?.name || "",
      render: (_val, row) =>
        row?.school?.schoolName || row?.school?.name || "—",
    },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
  ];

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View",
      variant: "ghost",
      onClick: (row) => {
        setSelectedStaff(row);
        openModal(VIEW_MODAL_ID);
      },
    },
    {
      icon: <Pencil size={14} />,
      tooltip: "Edit",
      variant: "primary",
      onClick: (row) => openEditModal(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Deactivate",
      variant: "danger",
      onClick: (row) => handleDelete(row),
    },
  ];

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 lg:px-6 flex flex-col gap-6">
      {/* Inline error / success banners */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <span className="text-rose-700 font-semibold text-sm flex-1">
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <span className="text-emerald-700 font-semibold text-sm flex-1">
            {successMessage}
          </span>
        </div>
      )}

      {/* Banner */}
      <Heading primaryText="Staff" secondaryText="Directory" size={12} />

      {/* Action row */}
      <div className="flex justify-end">
        <Button
          text="Add New Staff"
          icon={<Plus size={18} />}
          variant="primary"
          size={4}
          onClick={openAddModal}
        />
      </div>

      {/* Stats */}
      <DashGrid cols={12} gap={4}>
        {stats.map((s) => (
          <EnhancedDashCard
            key={s.title}
            title={s.title}
            value={s.value}
            icon={s.icon}
            accentColor={s.accentColor}
            size={3}
          />
        ))}
      </DashGrid>

      {/* Staff table */}
      <DataTable
        title="All Staff"
        columns={columns}
        rows={staffList}
        actions={actions}
        searchable
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        onRefresh={loadStaff}
        filters={[
          {
            title: "Role",
            type: "toggle",
            key: "role",
            options: ["teacher", "admin", "accountant", "principal"],
          },
          {
            title: "Status",
            type: "toggle",
            key: "status",
            options: ["active", "inactive"],
          },
          {
            title: "School",
            type: "select",
            options: schoolOptions.map((s) => s.name),
            fn: (row, value) =>
              !value ||
              (row?.school?.schoolName || row?.school?.name) === value,
          },
        ]}
      />

      {/* ── Add Staff ── */}
      <Modal id={ADD_MODAL_ID} title="Add New Staff" size="lg">
        <form onSubmit={handleAddStaff} className="flex flex-col gap-5">

          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Fields marked <span className="text-[#223F74] font-black">*</span> are required
          </p>

          <StaffFormSection title="Personal Information" description="Basic identity details" icon={UserRound}>
            <DataField
              label="Full Name *" id="add-name" size={12}
              icon={UserRound} placeholder="e.g. Priya Sharma"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
          </StaffFormSection>

          <StaffFormSection title="Contact Details" description="Used for login credentials & communication" icon={Mail}>
            <DataField
              label="Email *" id="add-email" type="email" icon={Mail} size={6}
              placeholder="email@school.com"
              value={addForm.email}
              onChange={(e) =>
                setAddForm({ ...addForm, email: e.target.value })
              }
            />
            <DataField
              label="Phone *" id="add-phone" type="tel" icon={Phone} size={6}
              placeholder="10-digit mobile number"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </StaffFormSection>

          <StaffFormSection title="Professional Information" description="Role, branch & employment assignment" icon={Briefcase}>
            <div className="col-span-12 sm:col-span-6">
              {schoolOptions.length > 0 ? (
                <SelectField
                  label="School / Branch *" id="add-school" size={12}
                  value={addForm.school}
                  onChange={(e) =>
                    setAddForm({ ...addForm, school: e.target.value })
                  }
                  placeholder="Select school"
                >
                  {schoolOptions.map((school) => (
                    <Option
                      key={school.id}
                      value={school.id}
                      label={school.name}
                    />
                  ))}
                </SelectField>
              ) : (
                <DataField
                  label="School ID *" id="add-school-text" size={12}
                  icon={Building2} placeholder="Enter school Mongo ID"
                  value={addForm.school}
                  onChange={(e) =>
                    setAddForm({ ...addForm, school: e.target.value })
                  }
                />
              )}
            </div>
            <SelectField
              label="Role *" id="add-role" size={6}
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              searchable={false}
            >
              {ROLE_OPTIONS.map((r) => (
                <Option key={r.value} value={r.value} label={r.label} />
              ))}
            </SelectField>
          </StaffFormSection>

          <StaffFormSection title="Account Information" description="Controls system access" icon={ShieldCheck}>
            <SelectField
              label="Status" id="add-status" size={6}
              value={addForm.status}
              onChange={(e) =>
                setAddForm({ ...addForm, status: e.target.value })
              }
              searchable={false}
            >
              <Option value="active" label="Active" />
              <Option value="inactive" label="Inactive" />
            </SelectField>
          </StaffFormSection>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => closeModal(ADD_MODAL_ID)}
              className="rounded-2xl border border-[#E7E2DB] bg-white px-5 py-3 text-sm font-bold text-[#223F74] hover:bg-[#F8EEE9] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-[#F59B87] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#F59B87]/30 hover:bg-[#EC856D] transition disabled:opacity-50 active:scale-95"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? 'Saving…' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Staff ── */}
      <PanelModal id={EDIT_MODAL_ID} title="Edit Staff Member" size="lg">
        <form onSubmit={handleEditStaff} className="flex flex-col gap-5">
          <StaffFormSection title="Personal Information" description="Update basic identity details" icon={UserRound}>
            <DataField
              label="Full Name *"
              id="edit-name"
              size={12}
              icon={UserRound}
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </StaffFormSection>

          <StaffFormSection title="Contact Details" description="Used for login credentials & communication" icon={Mail}>
            <DataField
              label="Email (Cannot be changed)"
              id="edit-email"
              type="email"
              icon={Mail}
              size={6}
              value={editForm.email}
              disabled // 🔥 Lock this field
              className="bg-slate-50 opacity-70 cursor-not-allowed"
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
            />
            <DataField
              label="Phone *"
              id="edit-phone"
              type="tel"
              icon={Phone}
              size={6}
              maxLength={10}
              value={editForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setEditForm({ ...editForm, phone: val });
              }}
            />
          </StaffFormSection>

          <StaffFormSection title="Professional Information" description="Role, branch & employment assignment" icon={Briefcase}>
            <div className="col-span-12 sm:col-span-6">
              {schoolOptions.length > 0 ? (
                <SelectField
                  label="School / Branch"
                  id="edit-school"
                  size={12}
                  value={editForm.school}
                  onChange={(e) =>
                    setEditForm({ ...editForm, school: e.target.value })
                  }
                  placeholder="Select school"
                >
                  {schoolOptions.map((school) => (
                    <Option
                      key={school.id}
                      value={school.id}
                      label={school.name}
                    />
                  ))}
                </SelectField>
              ) : (
                <DataField
                  label="School (Mongo ID)"
                  id="edit-school-text"
                  size={12}
                  icon={Building2}
                  value={editForm.school}
                  onChange={(e) =>
                    setEditForm({ ...editForm, school: e.target.value })
                  }
                />
              )}
            </div>

            <SelectField
              label="Role (Cannot be changed)"
              id="edit-role"
              size={6}
              value={editForm.role}
              disabled // 🔥 Lock this field
              className="bg-slate-50 opacity-70 cursor-not-allowed"
              onChange={(e) =>
                setEditForm({ ...editForm, role: e.target.value })
              }
              searchable={false}
            >
              {ROLE_OPTIONS.map((r) => (
                <Option key={r.value} value={r.value} label={r.label} />
              ))}
            </SelectField>
          </StaffFormSection>

          <StaffFormSection title="Account Information" description="Controls system access" icon={ShieldCheck}>
            <SelectField
              label="Status"
              id="edit-status"
              size={6}
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value })
              }
              searchable={false}
            >
              <Option value="active" label="Active" />
              <Option value="inactive" label="Inactive" />
            </SelectField>
          </StaffFormSection>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => closeModal(EDIT_MODAL_ID)}
              className="rounded-2xl border border-[#E7E2DB] bg-white px-5 py-3 text-sm font-bold text-[#223F74] hover:bg-[#F8EEE9] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-[#F59B87] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#F59B87]/30 hover:bg-[#EC856D] transition disabled:opacity-50 active:scale-95"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </PanelModal>

      {/* ── View Staff ── */}
      <Modal id={VIEW_MODAL_ID} title="Staff Details" size="md">
        {selectedStaff && (
          <div className="flex flex-col gap-4">
            <ModalProfile
              // ✅ FIX: View Modal safe extracts
              name={selectedStaff.name || selectedStaff.user?.name}
              subtitle={(selectedStaff.role || "Staff").replace(/^\w/, (c) =>
                c.toUpperCase(),
              )}
              meta={selectedStaff.email || selectedStaff.user?.email}
            />
            <ModalGrid title="Role & Status" cols={2}>
              <ModalData label="Role" value={selectedStaff.role || "-"} />
              <ModalData label="Status" value={selectedStaff.status || "-"} />
              <ModalData
                label="School / Branch"
                value={
                  selectedStaff?.school?.schoolName ||
                  selectedStaff?.school?.name ||
                  "-"
                }
              />
              <ModalData
                label="Onboarded On"
                value={
                  selectedStaff.joiningDate ||
                  selectedStaff.createdAt?.split("T")[0] ||
                  "-"
                }
              />
            </ModalGrid>
            <ModalGrid title="Contact" cols={2}>
              <ModalData
                label="Email"
                value={selectedStaff.email || selectedStaff.user?.email || "-"}
              />
              <ModalData
                label="Phone"
                value={selectedStaff.phone || selectedStaff.user?.phone || "-"}
              />
            </ModalGrid>
            <div className="flex justify-end pt-2">
              <Button
                text="Close"
                variant="ghost"
                size={3}
                onClick={() => closeModal(VIEW_MODAL_ID)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AllStaff;
