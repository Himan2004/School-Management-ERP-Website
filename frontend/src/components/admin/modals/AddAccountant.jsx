import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Send, Camera, User, X } from 'lucide-react';
import {
    Button,
    DashGrid,
    DataField,
    Option,
    PanelModal,
    SelectField,
} from '../../shared/Common_Components.jsx';

const GENDERS = ['Male', 'Female', 'Other'];
const QUALIFICATIONS = [
    'B.Com',
    'M.Com',
    'BBA',
    'MBA',
    'CA',
    'CMA',
    'CS',
    'ICWA',
    'B.Sc (Accounting)',
    'Diploma in Accounting'
];

const INITIAL = {
    name: '',
    email: '',
    phone: '',
    gender: '',
    qualification: '',
    experience: '',
    joiningDate: '',
    salary: '',
    dob: '',
    address: '',
    photo: null,
    photoPreview: null,
};

const REQUIRED_FIELDS = ['name', 'email', 'phone'];

const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
        <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
    </div>
);

const FormSection = ({ title, children }) => (
    <div className="rounded-2xl border border-[#E2E8F0]">
        <SectionHeader title={title} />
        <div className="p-4">
            <DashGrid cols={12} gap={4}>{children}</DashGrid>
        </div>
    </div>
);

const requiredLabel = (label) => `${label} *`;

const AddAccountantModal = ({ isOpen, onClose, onSubmit, loading, success, currentStaff = 0, maxStaff = 0 }) => {
    const [form, setForm] = useState(INITIAL);
    const [errors, setErrors] = useState({});

    const staffRemaining = Math.max(0, maxStaff - currentStaff);
    const limitReached = maxStaff > 0 && currentStaff >= maxStaff;

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: '', submit: '' }));
    };

    const update = (field) => (event) => setField(field, event.target.value);
    const updateDate = (field) => (value) => setField(field, value);

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
        setField('phone', val);
    };

    const handleExperienceChange = (e) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 3);
        setField('experience', val);
        if (val !== "" && Number(val) > 100) {
            setErrors((errs) => ({ ...errs, experience: 'Experience cannot exceed 100 years.' }));
        } else {
            setErrors((errs) => ({ ...errs, experience: '' }));
        }
    };

    const handleSalaryChange = (e) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 7);
        setField('salary', val);
        if (val !== "" && Number(val) > 1000000) {
            setErrors((errs) => ({ ...errs, salary: 'Salary cannot exceed ₹10,00,000.' }));
        } else {
            setErrors((errs) => ({ ...errs, salary: '' }));
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setForm((f) => ({
            ...f,
            photo: file,
            photoPreview: URL.createObjectURL(file),
        }));
    };

    const validate = (errsRef) => {
        const nextErrors = {};

        REQUIRED_FIELDS.forEach((field) => {
            if (!String(form[field] || '').trim()) nextErrors[field] = 'This field is required';
        });

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            nextErrors.email = 'Enter a valid email address';
        }

        if (!form.phone || !String(form.phone).trim()) {
            nextErrors.phone = 'This field is required';
        } else if (form.phone.replace(/\D/g, '').length !== 10) {
            nextErrors.phone = 'Phone number must be exactly 10 digits.';
        }

        if (form.experience !== '') {
            const expNum = Number(form.experience);
            if (isNaN(expNum) || expNum < 0 || expNum > 100 || !/^\d+$/.test(String(form.experience))) {
                nextErrors.experience = 'Experience cannot exceed 100 years.';
            }
        }

        if (form.salary !== '') {
            const salNum = Number(form.salary);
            if (isNaN(salNum) || salNum < 0 || salNum > 1000000 || !/^\d+$/.test(String(form.salary))) {
                nextErrors.salary = 'Salary cannot exceed ₹10,0,000.';
            }
        }

        setErrors(nextErrors);
        if (errsRef) {
            Object.assign(errsRef, nextErrors);
        }
        return Object.keys(nextErrors).length === 0;
    };

    const handleClose = () => {
        if (loading) return;
        onClose();
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const errs = {};
        if (!validate(errs)) {
            const idMap = {
                name: 'accountant-name',
                gender: 'accountant-gender',
                email: 'accountant-email',
                phone: 'accountant-phone',
                dob: 'accountant-dob',
                address: 'accountant-address',
                qualification: 'accountant-qualification',
                experience: 'accountant-experience',
                joiningDate: 'accountant-joining-date',
                salary: 'accountant-salary'
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

        onSubmit(form);
    };

    useEffect(() => {
        if (!isOpen || success) {
            setForm(INITIAL);
            setErrors({});
        }
    }, [isOpen, success]);

    return (
        <PanelModal
            id="admin-add-accountant-modal"
            title="Add New Accountant"
            isVisible={isOpen}
            onClose={handleClose}
            size="4xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-sm font-medium text-slate-500 -mt-1">
                    Create an accountant account and profile for your school.
                </p>

                {maxStaff > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Allocation</p>
                                <p className="text-sm font-semibold text-slate-700 mt-1">
                                    Current Staff: <span className="font-bold text-[#223F74]">{currentStaff}</span> / <span className="font-bold text-slate-500">{maxStaff}</span>
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
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {errors.submit}
                    </div>
                )}

                <FormSection title="Personal Details">
                    <div className="col-span-12 flex items-center gap-5 pb-2 border-b border-slate-100">
                        <div className="relative group flex-shrink-0">
                            <div className="w-20 h-20 rounded-2xl border border-dashed border-[#E2E8F0] bg-slate-50/50 overflow-hidden flex items-center justify-center transition-all group-hover:border-[#F59B87]">
                                {form.photoPreview ? (
                                    <img src={form.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-slate-300" />
                                )}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                                    <Camera className="w-6 h-6 text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                </label>
                            </div>
                            {form.photoPreview && (
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, photo: null, photoPreview: null }))}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#D66B5F] text-white rounded-full flex items-center justify-center hover:bg-[#c05d52] active:scale-95 transition-all shadow-sm"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.2em]">Profile Photo</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG or WEBP · Used on ID card</p>
                            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E7E2DB] bg-white text-xs font-bold text-[#223F74] cursor-pointer hover:bg-[#F8EEE9] hover:-translate-y-0.5 active:scale-95 transition duration-200">
                                <Camera className="w-3.5 h-3.5 text-[#223F74]" />
                                {form.photoPreview ? 'Change photo' : 'Upload photo'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </label>
                        </div>
                    </div>

                    <DataField
                        label={requiredLabel('Full Name')}
                        id="accountant-name"
                        placeholder="e.g. Ramesh Gupta"
                        autoFocus
                        value={form.name}
                        onChange={update('name')}
                        error={errors.name}
                        size={6}
                    />
                    <SelectField
                        label="Gender"
                        id="accountant-gender"
                        value={form.gender}
                        onChange={update('gender')}
                        searchable={false}
                        size={6}
                        placeholder="Select Gender"
                    >
                        {GENDERS.map((gender) => <Option key={gender} value={gender} label={gender} />)}
                    </SelectField>
                    <DataField
                        label={requiredLabel('Email Address')}
                        id="accountant-email"
                        type="email"
                        placeholder="accountant@school.com"
                        value={form.email}
                        onChange={update('email')}
                        error={errors.email}
                        size={6}
                    />
                    <DataField
                        label={requiredLabel('Phone Number')}
                        id="accountant-phone"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={form.phone}
                        onChange={handlePhoneChange}
                        error={errors.phone}
                        size={6}
                        inputMode="numeric"
                        maxLength={10}
                    />
                    <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
                        <label htmlFor="accountant-dob" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            id="accountant-dob"
                            max={new Date().toISOString().split('T')[0]}
                            value={form.dob || ''}
                            onChange={(e) => updateDate('dob')(e.target.value)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
                        />
                    </div>
                    <DataField
                        label="Residential Address"
                        id="accountant-address"
                        placeholder="Enter address"
                        value={form.address}
                        onChange={update('address')}
                        size={6}
                    />
                </FormSection>

                <FormSection title="Professional Details">
                    <SelectField
                        label="Qualification"
                        id="accountant-qualification"
                        value={form.qualification}
                        onChange={update('qualification')}
                        searchable={false}
                        size={6}
                        placeholder="Select qualification"
                    >
                        {QUALIFICATIONS.map((qualification) => (
                            <Option key={qualification} value={qualification} label={qualification} />
                        ))}
                    </SelectField>
                    <DataField
                        label="Experience (years)"
                        id="accountant-experience"
                        type="text"
                        placeholder="0"
                        value={form.experience}
                        onChange={handleExperienceChange}
                        error={errors.experience}
                        size={6}
                        inputMode="numeric"
                        maxLength={3}
                    />
                    <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5 w-full">
                        <label htmlFor="accountant-joining-date" className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] select-none">
                            Joining Date
                        </label>
                        <input
                            type="date"
                            id="accountant-joining-date"
                            value={form.joiningDate || ''}
                            onChange={(e) => updateDate('joiningDate')(e.target.value)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm font-medium text-[#2a465a] hover:border-[#2a465a]/30 hover:bg-white focus:outline-none focus:border-[#2a465a]/40 focus:ring-2 focus:ring-[#2a465a]/20 transition duration-200"
                        />
                    </div>
                    <DataField
                        label="Salary / month"
                        id="accountant-salary"
                        type="text"
                        placeholder="45000"
                        value={form.salary}
                        onChange={handleSalaryChange}
                        error={errors.salary}
                        size={6}
                        inputMode="numeric"
                        maxLength={7}
                    />
                </FormSection>

                <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
                    <Button
                        text="Cancel"
                        variant="secondary"
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        size={3}
                    />
                    <Button
                        text={success ? 'Added!' : 'Add Accountant'}
                        type="submit"
                        loading={loading}
                        disabled={loading || success || limitReached}
                        icon={success ? <CheckCircle size={16} /> : <Send size={16} />}
                        size={3}
                    />
                </div>
            </form>
        </PanelModal>
    );
};

export default AddAccountantModal;