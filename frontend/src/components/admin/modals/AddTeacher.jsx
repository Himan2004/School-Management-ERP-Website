import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectDashboardStats } from '../../../features/admin/adminSlice.js';
import {
    AlertCircle,
    BriefcaseBusiness,
    CheckCircle,
    Info,
    Mail,
    Phone,
    Send,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import {
    Button,
    DashGrid,
    DataField,
    Modal,
    Option,
    PanelModal,
    SelectField,
    closeModal,
    openModal,
} from '../../shared/Common_Components.jsx';

// ─── Modal ID (exported so consumers can call openModal/closeModal directly) ──

export const ADD_TEACHER_MODAL_ID = 'admin-add-teacher-modal';

// ─── Option lists ─────────────────────────────────────────────────────────────

const GENDERS          = ['Male', 'Female', 'Other'];
const QUALIFICATIONS   = ['B.Ed', 'M.Ed', 'BA B.Ed', 'BSc B.Ed', 'MA', 'MSc', 'PhD', 'Diploma', 'Certificate', 'Other'];
const DEPARTMENTS      = ['Primary', 'Secondary', 'Senior Secondary', 'Science', 'Mathematics', 'English', 'Social Studies', 'Computer Science', 'Physical Education', 'Arts', 'Administration'];
const DESIGNATIONS     = ['Subject Teacher', 'Class Teacher'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
const STATUSES         = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];
const REQUIRED_FIELDS  = ['name', 'email', 'phone', 'gender', 'department', 'designation', 'qualification', 'status'];

const TODAY = new Date().toISOString().split('T')[0];

const EMPTY = {
    name: '', email: '', phone: '', alternatePhone: '',
    gender: 'Male', department: 'Primary', designation: 'Subject Teacher',
    qualification: 'B.Ed', experience: '', dateOfBirth: '', joiningDate: '',
    salary: '', status: 'active', staffId: '', employmentType: 'Full-time',
    address: { street: '', city: '', state: '', pincode: '' },
    photo: '',
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({ title, description, icon: Icon, children }) => (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-5 py-4 bg-slate-50/60 rounded-t-2xl">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#223F74]/10 text-[#223F74]">
                <Icon size={16} />
            </span>
            <div>
                <p className="text-xs font-black text-[#223F74] uppercase tracking-[0.18em]">{title}</p>
                {description && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{description}</p>}
            </div>
        </div>
        {/* Body */}
        <div className="p-5">
            <DashGrid cols={12} gap={4}>{children}</DashGrid>
        </div>
    </div>
);

const r = (label) => `${label} *`;

// ─── Component ────────────────────────────────────────────────────────────────

const AddTeacherModal = ({ isOpen, onClose, onSubmit, loading = false, success = false, currentStaff = 0, maxStaff = 0 }) => {
    const [form, setForm]     = useState(EMPTY);
    const [errors, setErrors] = useState({});

    const { authUser } = useSelector((state) => state.adminAuth);
    const dashboardStats = useSelector(selectDashboardStats);

    const statistics = dashboardStats || {
        students: { total: 0, active: 0, inactive: 0, trend: '+0%' },
        teachers: { total: 0, active: 0, inactive: 0, trend: '+0%' },
        staff: { total: 0, active: 0, inactive: 0, trend: '+0%' },
        staffCombined: { total: 0, active: 0, inactive: 0, trend: '+0%' },
        classes: { total: 0, active: 0, inactive: 0, trend: '+0%' },
        subjects: { total: 0, active: 0, inactive: 0, trend: '+0%' },
    };

    const reduxCurrentStaff = statistics?.staffCombined?.total ?? statistics?.staff?.total ?? 0;
    const reduxMaxStaff = authUser?.school?.totalStaff !== undefined && authUser?.school?.totalStaff !== ""
        ? Number(authUser?.school?.totalStaff) || 0
        : (Number(authUser?.school?.totalTeachingStaff) || 0) + (Number(authUser?.school?.totalNonTeachingStaff) || 0);

    const finalCurrentStaff = currentStaff > 0 ? currentStaff : reduxCurrentStaff;
    const finalMaxStaff = maxStaff > 0 ? maxStaff : reduxMaxStaff;

    const staffRemaining = Math.max(0, finalMaxStaff - finalCurrentStaff);
    const limitReached = finalMaxStaff > 0 && finalCurrentStaff >= finalMaxStaff;

    const set = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '', submit: '' }));
    };

    const bind    = field => e     => set(field, e.target.value);
    const bindDate= field => value => set(field, value);
    const bindAddr= field => e     => {
        const v = e.target.value;
        setForm(f => ({ ...f, address: { ...f.address, [field]: v } }));
        setErrors(e => ({ ...e, [`address.${field}`]: '', submit: '' }));
    };

    const handlePhoneChange = field => e => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
        set(field, val);
    };

    const handleExperienceChange = e => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 3);
        set('experience', val);
        if (val !== "" && Number(val) > 100) {
            setErrors(errs => ({ ...errs, experience: 'Experience cannot exceed 100 years.' }));
        } else {
            setErrors(errs => ({ ...errs, experience: '' }));
        }
    };

    const handleSalaryChange = e => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 7);
        set('salary', val);
        if (val !== "" && Number(val) > 1000000) {
            setErrors(errs => ({ ...errs, salary: 'Salary cannot exceed ₹10,00,000.' }));
        } else {
            setErrors(errs => ({ ...errs, salary: '' }));
        }
    };

    const validate = (errsRef) => {
        const errs = {};
        REQUIRED_FIELDS.forEach(f => {
            if (!String(form[f] ?? '').trim()) errs[f] = 'Required';
        });
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errs.email = 'Enter a valid email address';
        
        if (!form.phone || !String(form.phone).trim()) {
            errs.phone = 'Required';
        } else if (form.phone.replace(/\D/g, '').length !== 10) {
            errs.phone = 'Phone number must be exactly 10 digits.';
        }

        if (form.alternatePhone && form.alternatePhone.replace(/\D/g, '').length !== 10) {
            errs.alternatePhone = 'Alternate phone number must be exactly 10 digits.';
        }

        if (form.experience !== '') {
            const expNum = Number(form.experience);
            if (isNaN(expNum) || expNum < 0 || expNum > 100 || !/^\d+$/.test(String(form.experience))) {
                errs.experience = 'Experience cannot exceed 100 years.';
            }
        }

        if (form.salary !== '') {
            const salNum = Number(form.salary);
            if (isNaN(salNum) || salNum < 0 || salNum > 1000000 || !/^\d+$/.test(String(form.salary))) {
                errs.salary = 'Salary cannot exceed ₹10,00,000.';
            }
        }

        setErrors(errs);
        if (errsRef) {
            Object.assign(errsRef, errs);
        }
        return Object.keys(errs).length === 0;
    };

    const handleClose = () => {
        if (!loading) {
            if (typeof onClose === 'function') {
                onClose();
            } else {
                closeModal(ADD_TEACHER_MODAL_ID);
            }
        }
    };

    const handleSubmit = e => {
        e.preventDefault();
        if (limitReached) {
            setErrors(curr => ({ ...curr, submit: 'No staff seats available.' }));
            return;
        }
        
        const errs = {};
        if (!validate(errs)) {
            const idMap = {
                name: 't-name',
                gender: 't-gender',
                phone: 't-phone',
                alternatePhone: 't-alt-phone',
                email: 't-email',
                designation: 't-designation',
                department: 't-department',
                qualification: 't-qualification',
                experience: 't-experience',
                salary: 't-salary',
                status: 't-status'
            };
            const firstErrKey = Object.keys(idMap).find(k => errs[k]);
            if (firstErrKey) {
                const element = document.getElementById(idMap[firstErrKey]);
                if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        const submitData = {
            ...form,
            name:       form.name.trim(),
            email:      form.email.trim(),
            phone:      form.phone.trim(),
            experience: form.experience === '' ? 0 : Number(form.experience),
            salary:     form.salary     === '' ? 0 : Number(form.salary),
            staffId:    form.staffId.trim() || undefined,
        };

        // Clean up empty strings that cause cast errors on the backend
        if (submitData.joiningDate === '') delete submitData.joiningDate;
        if (submitData.dateOfBirth === '') delete submitData.dateOfBirth;
        if (submitData.alternatePhone === '') delete submitData.alternatePhone;
        if (submitData.photo === '') delete submitData.photo;

        onSubmit(submitData);
    };

    // Reset form when modal is closed or successfully submitted
    useEffect(() => {
        if (!isOpen || success) {
            setForm(EMPTY);
            setErrors({});
        }
    }, [isOpen, success]);

    return (
        <PanelModal
            id={ADD_TEACHER_MODAL_ID}
            title="Add New Teacher"
            isVisible={isOpen}
            onClose={handleClose}
            size="4xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-sm font-medium text-slate-500 -mt-1">
                    Create a teacher account and profile for your school.
                </p>

                {finalMaxStaff > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Allocation</p>
                                <p className="text-sm font-semibold text-slate-700 mt-1">
                                    Current Staff: <span className="font-bold text-[#223F74]">{finalCurrentStaff}</span> / <span className="font-bold text-slate-500">{finalMaxStaff}</span>
                                </p>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Seats</p>
                                <p className={`text-sm font-bold mt-1 ${limitReached ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {staffRemaining}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {limitReached && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Maximum staff limit reached.</p>
                            <p className="text-xs text-rose-600 mt-0.5">Upgrade allocation or remove an existing staff member.</p>
                        </div>
                    </div>
                )}

                {errors.submit && (
                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {errors.submit}
                    </div>
                )}

                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Fields marked <span className="text-[#223F74] font-black">*</span> are required
                </p>

                {/* ── 1. Personal ── */}
                <Section title="Personal Information" icon={UserRound} description="Basic identity details">
                    <DataField
                        label={r('Full Name')} id="t-name" placeholder="e.g. Priya Sharma"
                        icon={UserRound} autoFocus
                        value={form.name} onChange={bind('name')} error={errors.name} size={6}
                    />
                    <SelectField
                        label={r('Gender')} id="t-gender"
                        value={form.gender} onChange={bind('gender')} searchable={false} size={6}
                    >
                        {GENDERS.map(g => <Option key={g} value={g} label={g} />)}
                    </SelectField>

                    <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
                        <label htmlFor="t-dob" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            id="t-dob"
                            max={TODAY}
                            value={form.dateOfBirth || ''}
                            onChange={(e) => bindDate('dateOfBirth')(e.target.value)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
                        />
                    </div>

                    {/* Photo */}
                    <div className="col-span-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-slate-100 mt-2">
                        <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {form.photo
                                ? <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                                : <UserRound className="w-7 h-7 text-slate-400" />
                            }
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-black text-[#223F74] uppercase tracking-[0.18em]">Profile Photo</p>
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer rounded-xl border border-[#E7E2DB] bg-white px-3 py-2 text-xs font-bold text-[#223F74] hover:bg-[#F4F7FB] transition">
                                    Upload Photo
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onloadend = () => set('photo', reader.result);
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </label>
                                {form.photo && (
                                    <button type="button" onClick={() => set('photo', '')}
                                        className="text-rose-500 hover:text-rose-600 text-xs font-bold transition">
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ── 2. Contact ── */}
                <Section title="Contact Information" icon={Mail} description="Phone, email & address">
                    <DataField
                        label={r('Phone Number')} id="t-phone" type="tel" icon={Phone}
                        placeholder="10-digit mobile number"
                        value={form.phone} onChange={handlePhoneChange('phone')} error={errors.phone} size={6}
                        inputMode="numeric" maxLength={10}
                    />
                    <DataField
                        label="Alternate Phone" id="t-alt-phone" type="tel" icon={Phone}
                        placeholder="Optional alternate number"
                        value={form.alternatePhone} onChange={handlePhoneChange('alternatePhone')}
                        error={errors.alternatePhone} size={6}
                        inputMode="numeric" maxLength={10}
                    />
                    <DataField
                        label={r('Email Address')} id="t-email" type="email" icon={Mail}
                        placeholder="teacher@school.com"
                        value={form.email} onChange={bind('email')} error={errors.email} size={12}
                    />

                    {/* Address sub-section */}
                    <div className="col-span-12 pt-4 border-t border-slate-100 mt-1">
                        <p className="text-xs font-black text-[#223F74] uppercase tracking-[0.18em] mb-4">Address</p>
                        <div className="grid grid-cols-12 gap-4">
                            <DataField label="Street" id="t-street" placeholder="Street address"
                                value={form.address.street} onChange={bindAddr('street')} size={12} />
                            <DataField label="City"    id="t-city"    placeholder="City"
                                value={form.address.city}    onChange={bindAddr('city')}    size={4} />
                            <DataField label="State"   id="t-state"   placeholder="State"
                                value={form.address.state}   onChange={bindAddr('state')}   size={4} />
                            <DataField label="Pincode" id="t-pincode" placeholder="Pincode"
                                value={form.address.pincode} onChange={bindAddr('pincode')} size={4} />
                        </div>
                    </div>
                </Section>

                {/* ── 3. Professional ── */}
                <Section title="Professional Information" icon={BriefcaseBusiness} description="Role, qualifications & employment">
                    <DataField
                        label="Staff ID" id="t-staff-id" icon={BriefcaseBusiness}
                        placeholder="Auto-generated if empty"
                        value={form.staffId} onChange={bind('staffId')} size={6}
                    />
                    <SelectField
                        label={r('Designation')} id="t-designation"
                        value={form.designation} onChange={bind('designation')} searchable={false} size={6}
                    >
                        {DESIGNATIONS.map(d => <Option key={d} value={d} label={d} />)}
                    </SelectField>

                    <SelectField
                        label={r('Department')} id="t-department"
                        value={form.department} onChange={bind('department')} searchable size={6}
                    >
                        {DEPARTMENTS.map(d => <Option key={d} value={d} label={d} />)}
                    </SelectField>
                    <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
                        <label htmlFor="t-joining" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                            Joining Date
                        </label>
                        <input
                            type="date"
                            id="t-joining"
                            value={form.joiningDate || ''}
                            onChange={(e) => bindDate('joiningDate')(e.target.value)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
                        />
                    </div>

                    <SelectField
                        label="Employment Type" id="t-emp-type"
                        value={form.employmentType} onChange={bind('employmentType')} searchable={false} size={6}
                    >
                        {EMPLOYMENT_TYPES.map(t => <Option key={t} value={t} label={t} />)}
                    </SelectField>
                    <SelectField
                        label={r('Qualification')} id="t-qualification"
                        value={form.qualification} onChange={bind('qualification')} searchable={false} size={6}
                    >
                        {QUALIFICATIONS.map(q => <Option key={q} value={q} label={q} />)}
                    </SelectField>

                    <DataField
                        label="Experience (years)" id="t-experience" type="text" placeholder="0"
                        value={form.experience} onChange={handleExperienceChange} error={errors.experience} size={6}
                        inputMode="numeric" maxLength={3}
                    />
                    <DataField
                        label="Salary / month (₹)" id="t-salary" type="text" placeholder="50000"
                        value={form.salary} onChange={handleSalaryChange} error={errors.salary} size={6}
                        inputMode="numeric" maxLength={7}
                    />
                </Section>

                {/* ── 4. Account ── */}
                <Section title="Account Information" icon={ShieldCheck} description="Access status & login">
                    <SelectField
                        label={r('Status')} id="t-status"
                        value={form.status} onChange={bind('status')} searchable={false} size={6}
                    >
                        {STATUSES.map(s => <Option key={s.value} value={s.value} label={s.label} />)}
                    </SelectField>

                    <div className="col-span-12 sm:col-span-6 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] mb-2">
                            Login Email
                        </label>
                        <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 break-all min-h-[48px]">
                            {form.email || <span className="text-slate-300">Enter email above…</span>}
                        </div>
                    </div>

                    <div className="col-span-12 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">Credentials will be emailed</p>
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                A secure password will be auto-generated and sent to the staff member's email on save.
                            </p>
                        </div>
                    </div>
                </Section>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-2xl border border-[#E7E2DB] bg-white px-5 py-3 text-sm font-bold text-[#223F74] hover:bg-[#F8EEE9] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || success || limitReached}
                        className="flex items-center gap-2 rounded-full bg-[#F59B87] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#F59B87]/30 hover:bg-[#EC856D] transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {loading ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : success ? (
                            <CheckCircle size={16} />
                        ) : (
                            <Send size={16} />
                        )}
                        {loading ? 'Saving…' : success ? 'Added!' : 'Add Staff'}
                    </button>
                </div>

            </form>
        </PanelModal>
    );
};

export default AddTeacherModal;

// Convenience re-export so consumers can open/close without importing Common_Components
export const openAddTeacherModal  = () => openModal(ADD_TEACHER_MODAL_ID);
export const closeAddTeacherModal = () => closeModal(ADD_TEACHER_MODAL_ID);
