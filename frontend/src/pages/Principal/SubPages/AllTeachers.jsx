import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Edit2, Eye, Plus, Trash2, UserCheck, UserX, UserPlus } from "lucide-react";
import {
  Button,
  DashGrid,
  DataField,
  DataTable,
  EnhancedDashCard,
  Heading,
  Modal,
  ModalData,
  ModalGrid,
  ModalProfile,
  Option,
  SelectField,
  closeModal,
  openModal,
} from "../../../components/shared/Common_Components.jsx";
import {
  createPrincipalTeacher,
  deletePrincipalTeacher,
  getPrincipalTeacherById,
  getPrincipalTeachers,
  updatePrincipalTeacher,
  updatePrincipalTeacherStatus,
} from "../../../services/api/principalTeachersApi";
import AddAdminModal, { ADD_ADMIN_MODAL_ID } from "../../../components/principal/AddAdminModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_MODAL_ID = "add-edit-teacher-modal";
const PROFILE_MODAL_ID = "teacher-profile-modal";

const DESIGNATIONS = ["Subject Teacher", "Class Teacher", "Head of Department", "Senior Teacher", "Junior Teacher", "Lecturer"];
const QUALIFICATIONS = ["B.Ed", "M.Ed", "B.Sc B.Ed", "M.Sc", "M.A", "B.A", "PhD", "Other"];
const GENDERS = ["Male", "Female", "Other"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  designation: "Subject Teacher",
  qualification: "B.Ed",
  experience: "",
  gender: "Male",
};

const emptyErrors = { name: "", email: "", phone: "", experience: "" };

// ─── SectionHeader — local only, no shared equivalent ────────────────────────

const SectionHeader = ({ title }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
    <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
  </div>
);

// ─── AllTeachers ──────────────────────────────────────────────────────────────

const AllTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPrincipalTeachers();
      setTeachers(res?.data || []);
      setStats(res?.stats || { totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0 });
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (emptyErrors[key] !== undefined) setFormErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs = { name: "", email: "", phone: "", experience: "" };
    let ok = true;
    if (!form.name.trim()) {
      errs.name = "Full name is required";
      ok = false;
    } else if (form.name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters";
      ok = false;
    }

    if (!form.email.trim()) {
      errs.email = "Email is required";
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address";
      ok = false;
    }

    if (!form.phone.trim()) {
      errs.phone = "Phone number is required";
      ok = false;
    } else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) {
      errs.phone = "Enter a valid 10-digit number";
      ok = false;
    }

    if (form.experience === "" || form.experience === null || form.experience === undefined) {
      errs.experience = "Experience is required";
      ok = false;
    } else {
      const expNum = Number(form.experience);
      if (isNaN(expNum) || expNum < 0) {
        errs.experience = "Experience cannot be negative";
        ok = false;
      } else if (expNum > 50) {
        errs.experience = "Experience cannot exceed 50 years";
        ok = false;
      }
    }

    setFormErrors(errs);
    return ok;
  };

  // ── Modal actions ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setCreatedCredentials(null);
    setForm(emptyForm);
    setFormErrors(emptyErrors);
    openModal(FORM_MODAL_ID);
  };

  const openEdit = async (id) => {
    try {
      const t = (await getPrincipalTeacherById(id))?.data;
      setEditing(id);
      setForm({
        name: t?.name || "",
        email: t?.email || "",
        phone: t?.contact || "",
        designation: DESIGNATIONS.includes(t?.designation) ? t.designation : "Subject Teacher",
        qualification: QUALIFICATIONS.includes(t?.qualification) ? t.qualification : "B.Ed",
        experience: String(t?.experience || ""),
        gender: GENDERS.includes(t?.gender) ? t.gender : "Male",
      });
      setFormErrors(emptyErrors);
      openModal(FORM_MODAL_ID);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load teacher");
    }
  };

  const submitForm = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = { ...form, experience: Number(form.experience) || 0 };
      if (editing) {
        await updatePrincipalTeacher(editing, payload);
        closeModal(FORM_MODAL_ID);
      } else {
        const res = await createPrincipalTeacher(payload);
        if (res.success && res.data) {
          setCreatedCredentials({
            ...res.data,
            name: form.name
          });
        } else {
          closeModal(FORM_MODAL_ID);
        }
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const viewProfile = async (id) => {
    try {
      setSelectedTeacher((await getPrincipalTeacherById(id))?.data || null);
      openModal(PROFILE_MODAL_ID);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load profile");
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updatePrincipalTeacherStatus(row.id, row.status === "Active" ? "inactive" : "active");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update status");
    }
  };

  const removeTeacher = async (id) => {
    if (!window.confirm("Archive this teacher?")) return;
    try {
      await deletePrincipalTeacher(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to archive teacher");
    }
  };

  // ── Table config ───────────────────────────────────────────────────────────
  const columns = [
    { key: "empId", label: "Emp ID" },
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Phone" },
    { key: "experience", label: "Exp (yrs)" },
    { key: "status", label: "Status" },
  ];

  const tableActions = [
    { icon: <Eye size={14} />, tooltip: "View Profile", variant: "ghost", onClick: (r) => viewProfile(r.id) },
    { icon: <Edit2 size={14} />, tooltip: "Edit", variant: "ghost", onClick: (r) => openEdit(r.id) },
    { icon: <UserX size={14} />, tooltip: "Toggle Status", variant: "ghost", onClick: (r) => toggleStatus(r) },
    { icon: <Trash2 size={14} />, tooltip: "Archive", variant: "danger", onClick: (r) => removeTeacher(r.id) },
  ];

  const statCards = useMemo(() => [
    { title: "Total Teachers", value: String(stats.totalTeachers), accentColor: "#223F74" },
    { title: "Active Teachers", value: String(stats.activeTeachers), accentColor: "#5B9A6A" },
    { title: "Inactive Teachers", value: String(stats.inactiveTeachers), accentColor: "#D66B5F" },
  ], [stats]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6 text-left pb-10">

      {/* Page Header */}
      <Heading
        primaryText="All"
        secondaryText="Staff"
        showAnimations={true}
      />

      {/* Error banner */}
      {!!error && (
        <div className="mb-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <DashGrid cols={12} gap={4}>
        {statCards.map((c) => (
          <EnhancedDashCard key={c.title} title={c.title} value={c.value} accentColor={c.accentColor} size={4} />
        ))}
      </DashGrid>

      {/* Actions */}
      <div className="flex justify-end mt-4 gap-3">
        <div className="w-48">
          <Button
            text="Add Admin"
            icon={<UserPlus size={16} />}
            onClick={() => openModal(ADD_ADMIN_MODAL_ID)}
            size={12}
            variant="secondary"
          />
        </div>
        <div className="w-48">
          <Button
            text="Add Teacher"
            icon={<Plus size={16} />}
            onClick={openCreate}
            size={12}
          />
        </div>
      </div>

      {/* Teachers table */}
      <div className="mt-6">
        {loading ? (
          <div className="min-h-[200px] flex items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <p className="text-sm font-bold text-slate-400">Loading teachers…</p>
          </div>
        ) : (
          <DataTable
            title="Teachers"
            columns={columns}
            rows={teachers}
            actions={tableActions}
            pageSize={10}
            searchable
            exportable
            exportFileName="teachers"
            userProfile="name"
            onRefresh={load}
            size={12}
            filters={[
              { title: "Status", key: "status", type: "toggle", options: ["Active", "Inactive"] },
              { title: "Designation", key: "designation", type: "select", options: DESIGNATIONS },
            ]}
          />
        )}
      </div>

      {/* ── Add / Edit Teacher Modal ── */}
      <Modal id={FORM_MODAL_ID} title={createdCredentials ? "Account Created" : (editing ? "Edit Teacher" : "Add Teacher")} size="lg">
        {createdCredentials ? (
          <div className="flex flex-col items-center justify-center p-6 text-center gap-4 bg-emerald-50 border border-emerald-200 rounded-3xl">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Teacher Account Created!</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Here are the login credentials for <strong>{createdCredentials.name}</strong>. Please share these details with the teacher.
            </p>

            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login ID</label>
                <p className="text-lg font-mono font-bold text-slate-800 bg-slate-50 p-2 rounded-lg mt-1 select-all">{createdCredentials.loginId}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temporary Password</label>
                <p className="text-lg font-mono font-bold text-slate-800 bg-slate-50 p-2 rounded-lg mt-1 select-all">{createdCredentials.password}</p>
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-md mt-2">
              <Button
                text="Copy Credentials"
                variant="success"
                onClick={() => {
                  const text = `Teacher: ${createdCredentials.name}\nLogin ID: ${createdCredentials.loginId}\nPassword: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  toast.success("Credentials copied!");
                }}
                size={6}
              />
              <Button
                text="Close"
                variant="secondary"
                onClick={() => {
                  setCreatedCredentials(null);
                  closeModal(FORM_MODAL_ID);
                }}
                size={6}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Personal Information */}
            <div className="rounded-2xl border border-[#E2E8F0]">
              <SectionHeader title="Personal Information" />
              <div className="p-4">
                <DashGrid cols={12} gap={4}>
                  <DataField
                    label="Full Name *"
                    id="t_name"
                    placeholder="e.g. Priya Sharma"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    error={formErrors.name}
                    size={7}
                  />
                  <SelectField
                    label="Gender"
                    id="t_gender"
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                    searchable={false}
                    size={5}
                  >
                    {GENDERS.map((g) => <Option key={g} value={g} label={g} />)}
                  </SelectField>
                </DashGrid>
              </div>
            </div>

            {/* Contact Details */}
            <div className="rounded-2xl border border-[#E2E8F0]">
              <SectionHeader title="Contact Details" />
              <div className="p-4">
                <DashGrid cols={12} gap={4}>
                  <DataField
                    label="Email Address *"
                    id="t_email"
                    type="email"
                    placeholder="teacher@school.edu.in"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    error={formErrors.email}
                    size={6}
                  />
                  <DataField
                    label="Phone Number *"
                    id="t_phone"
                    type="number"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    error={formErrors.phone}
                    min={10}
                    max={10}
                    size={6}
                  />
                </DashGrid>
              </div>
            </div>

            {/* Professional Details */}
            <div className="rounded-2xl border border-[#E2E8F0]">
              <SectionHeader title="Professional Details" />
              <div className="p-4">
                <DashGrid cols={12} gap={4}>
                  <SelectField
                    label="Designation"
                    id="t_designation"
                    value={form.designation}
                    onChange={(e) => setField("designation", e.target.value)}
                    searchable={false}
                    size={6}
                  >
                    {DESIGNATIONS.map((d) => <Option key={d} value={d} label={d} />)}
                  </SelectField>
                  <SelectField
                    label="Qualification"
                    id="t_qualification"
                    value={form.qualification}
                    onChange={(e) => setField("qualification", e.target.value)}
                    searchable={false}
                    size={6}
                  >
                    {QUALIFICATIONS.map((q) => <Option key={q} value={q} label={q} />)}
                  </SelectField>
                  <DataField
                    label="Experience (years) *"
                    id="t_experience"
                    type="number"
                    placeholder="0"
                    value={form.experience}
                    onChange={(e) => setField("experience", e.target.value)}
                    error={formErrors.experience}
                    min={1}
                    max={2}
                    size={6}
                  />
                </DashGrid>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal(FORM_MODAL_ID)} size={3} />
              <Button
                text={submitting ? "Saving…" : editing ? "Save Changes" : "Add Teacher"}
                loading={submitting}
                disabled={submitting}
                onClick={submitForm}
                size={3}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Teacher Profile Modal ── */}
      <Modal id={PROFILE_MODAL_ID} title="Teacher Profile" size="md">
        {selectedTeacher && (
          <div className="flex flex-col gap-4">
            <ModalProfile
              name={selectedTeacher.name || ""}
              subtitle={`${selectedTeacher.designation || ""}${selectedTeacher.gender ? ` · ${selectedTeacher.gender}` : ""}`}
              meta={`Emp ID: ${selectedTeacher.empId || "—"} · ${selectedTeacher.experience || 0} yrs experience`}
            />
            <ModalGrid title="Contact" cols={2}>
              <ModalData label="Email" value={selectedTeacher.email || "—"} />
              <ModalData label="Phone" value={selectedTeacher.contact || "—"} />
            </ModalGrid>
            <ModalGrid title="Professional" cols={2}>
              <ModalData label="Designation" value={selectedTeacher.designation || "—"} />
              <ModalData label="Qualification" value={selectedTeacher.qualification || "—"} />
              <ModalData label="Experience" value={`${selectedTeacher.experience || 0} years`} />
              <ModalData label="Status" value={selectedTeacher.status || "—"} />
            </ModalGrid>
            {selectedTeacher.subjects?.length > 0 && (
              <ModalGrid title="Subjects" cols={1}>
                <ModalData label="Assigned Subjects" value={selectedTeacher.subjects.join(", ")} />
              </ModalGrid>
            )}
            {selectedTeacher.classes?.length > 0 && (
              <ModalGrid title="Classes" cols={1}>
                <ModalData label="Assigned Classes" value={selectedTeacher.classes.join(", ")} />
              </ModalGrid>
            )}
            <div className="flex justify-end pt-1 border-t border-slate-100">
              <Button text="Close" variant="secondary" onClick={() => closeModal(PROFILE_MODAL_ID)} size={3} />
            </div>
          </div>
        )}
      </Modal>

      <AddAdminModal />
    </div>
  );
};

export default AllTeachers;
