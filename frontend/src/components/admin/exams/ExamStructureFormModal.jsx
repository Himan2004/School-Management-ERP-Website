import { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Plus,
  Trash2,
  X,
  CalendarDays,
  Layers,
  FileText,
  Settings2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../../features/theme/themeSlice';
import {
  PanelModal,
  DataField,
  SelectField,
  Option,
  Button,
  ToggleButton,
  DashGrid,
} from '../../shared/Common_Components.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXAM_TYPES = ['Unit Test', 'Mid Term', 'Final Term', 'Pre Board', 'Board', 'Class Test', 'Term Exam', 'Term'];
const TERM_OPTIONS = [
  { value: 'term1', label: 'Term 1' },
  { value: 'term2', label: 'Term 2' },
  { value: 'annual', label: 'Annual' },
];

const defaultSubjectRow = () => ({
  _tempId: Math.random().toString(36).slice(2),
  subjectName: '',
  subjectId: '',
  theoryMaxMarks: '',
  practicalMaxMarks: '',
  internalMaxMarks: '',
  totalMaxMarks: '',
  passingMarks: '',
  isOptional: false,
});

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'subjects', label: 'Subjects & Marks', icon: BookOpen },
  { id: 'rules', label: 'Rules', icon: Settings2 },
];

// ─── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ steps, currentStep, darkMode }) => (
  <div className="flex items-center gap-2 mb-6">
    {steps.map((step, idx) => {
      const Icon = step.icon;
      const isActive = step.id === currentStep;
      const isDone = steps.findIndex((s) => s.id === currentStep) > idx;
      return (
        <div key={step.id} className="flex items-center gap-2 flex-1">
          <Button
            text={step.label}
            icon={isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            variant={isActive ? 'primary' : isDone ? 'success' : 'secondary'}
            size="sm"
            className="flex-1 justify-center"
            disabled={!isActive && !isDone}
          />
          {idx < steps.length - 1 && (
            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Subject Row ───────────────────────────────────────────────────────────────
const SubjectRow = ({ row, idx, onChange, onRemove, subjectOptions, darkMode }) => {
  const inputBase = `w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100
    ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder:text-slate-500' : 'border-gray-200 bg-white text-gray-800 placeholder:text-gray-400'}`;

  // Filter subjectOptions to only include valid ObjectIds
  const validSubjectOptions = subjectOptions.filter(s => s._id && /^[0-9a-fA-F]{24}$/.test(s._id));

  const handleField = (field, val) => {
    const updated = { ...row, [field]: val };
    if (['theoryMaxMarks', 'practicalMaxMarks', 'internalMaxMarks'].includes(field)) {
      const th = parseFloat(field === 'theoryMaxMarks' ? val : updated.theoryMaxMarks) || 0;
      const pr = parseFloat(field === 'practicalMaxMarks' ? val : updated.practicalMaxMarks) || 0;
      const int = parseFloat(field === 'internalMaxMarks' ? val : updated.internalMaxMarks) || 0;
      updated.totalMaxMarks = th + pr + int || '';
    }
    onChange(updated);
  };

  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-200 group
        ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          Subject {idx + 1}
        </span>
        <div className="flex items-center gap-3">
          <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <input
              type="checkbox"
              checked={row.isOptional}
              onChange={(e) => handleField('isOptional', e.target.checked)}
              className="w-3 h-3 accent-blue-600"
            />
            Optional
          </label>
          <button
            onClick={() => onRemove(row._tempId)}
            title="Remove subject"
            className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150
              ${darkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="col-span-2 sm:col-span-3">
          {validSubjectOptions && validSubjectOptions.length > 0 ? (
            <select
              value={row.subjectId || ''}
              onChange={(e) => {
                const found = validSubjectOptions.find((s) => s._id === e.target.value);
                const updated = { ...row, subjectId: e.target.value };
                if (found) {
                  updated.subjectName = found.subjectName || found.name || '';
                } else {
                  updated.subjectName = '';
                }
                onChange(updated);
              }}
              className={inputBase}
            >
              <option value="">Select subject…</option>
              {validSubjectOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectName || s.name}
                </option>
              ))}
            </select>
          ) : (
            <select className={inputBase} disabled>
              <option>No subjects found. Please create subjects from Academics.</option>
            </select>
          )}
        </div>

        <div>
          <p className={`text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Theory</p>
          <input type="number" min="0" placeholder="0" value={row.theoryMaxMarks}
            onChange={(e) => handleField('theoryMaxMarks', e.target.value)} className={inputBase} />
        </div>
        <div>
          <p className={`text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Practical</p>
          <input type="number" min="0" placeholder="0" value={row.practicalMaxMarks}
            onChange={(e) => handleField('practicalMaxMarks', e.target.value)} className={inputBase} />
        </div>
        <div>
          <p className={`text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Internal</p>
          <input type="number" min="0" placeholder="0" value={row.internalMaxMarks}
            onChange={(e) => handleField('internalMaxMarks', e.target.value)} className={inputBase} />
        </div>
        <div>
          <p className={`text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total (auto)</p>
          <input type="number" min="0" placeholder="0"
            value={row.totalMaxMarks !== '' ? row.totalMaxMarks : ''}
            onChange={(e) => handleField('totalMaxMarks', e.target.value)}
            className={`${inputBase} ${darkMode ? 'bg-slate-700' : 'bg-blue-50/60'} font-semibold`} />
        </div>
        <div>
          <p className={`text-[10px] font-medium mb-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Passing *</p>
          <input type="number" min="0" placeholder="0" value={row.passingMarks}
            onChange={(e) => handleField('passingMarks', e.target.value)}
            className={`${inputBase} border-amber-300 focus:border-amber-500 focus:ring-amber-100`} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ExamStructureFormModal = ({
  mode = 'create',
  initialData = null,
  open = true,
  onClose,
  onSubmit,
  submitting = false,
  classOptions = [],
  subjectOptions = [],
}) => {
  const darkMode = useSelector(selectIsDarkMode);
  const [step, setStep] = useState('basic');

  const currentYear = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;

  const [basic, setBasic] = useState({
    examName: initialData?.examName || '',
    examType: initialData?.examType || 'Mid Term',
    academicYear: initialData?.academicYear || currentYear,
    term: initialData?.term || 'term1',
    applicableClasses: initialData?.applicableClasses?.map((c) => (typeof c === 'string' ? c : c._id)) || [],
  });

  const [subjectRows, setSubjectRows] = useState(
    initialData?.subjectMarkings?.length
      ? initialData.subjectMarkings.map((sm) => {
          const subjectIdValue = sm.subject?._id || sm.subject || '';
          const isValidObjectId = subjectIdValue && /^[0-9a-fA-F]{24}$/.test(subjectIdValue);
          
          return {
            _tempId: Math.random().toString(36).slice(2),
            subjectId: isValidObjectId ? subjectIdValue : '',
            subjectName: sm.subject?.subjectName || (isValidObjectId ? '' : subjectIdValue),
            theoryMaxMarks: sm.theoryMaxMarks ?? '',
            practicalMaxMarks: sm.practicalMaxMarks ?? '',
            internalMaxMarks: sm.internalMaxMarks ?? '',
            totalMaxMarks: sm.totalMaxMarks ?? '',
            passingMarks: sm.passingMarks ?? '',
            isOptional: sm.isOptional ?? false,
          };
        })
      : [defaultSubjectRow()]
  );

  // Clear invalid subjectIds when subjectOptions change
  useEffect(() => {
    setSubjectRows(prev => prev.map(row => {
      const isValidObjectId = row.subjectId && /^[0-9a-fA-F]{24}$/.test(row.subjectId);
      if (!isValidObjectId && row.subjectId) {
        console.log('Clearing invalid subjectId:', row.subjectId);
        return { ...row, subjectId: '' };
      }
      return row;
    }));
  }, [subjectOptions]);

  const [rules, setRules] = useState({
    weightagePercentage: initialData?.weightagePercentage ?? 100,
    allowGraceMarks: initialData?.allowGraceMarks ?? false,
    graceMarksLimit: initialData?.graceMarksLimit ?? 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setStep('basic');
      setErrors({});
      setBasic({
        examName: initialData?.examName || '',
        examType: initialData?.examType || 'Mid Term',
        academicYear: initialData?.academicYear || currentYear,
        term: initialData?.term || 'term1',
        applicableClasses: initialData?.applicableClasses?.map((c) => (typeof c === 'string' ? c : c._id)) || [],
      });
      setSubjectRows(
        initialData?.subjectMarkings?.length
          ? initialData.subjectMarkings.map((sm) => {
              const subjectIdValue = sm.subject?._id || sm.subject || '';
              const isValidObjectId = subjectIdValue && /^[0-9a-fA-F]{24}$/.test(subjectIdValue);
              
              return {
                _tempId: Math.random().toString(36).slice(2),
                subjectId: isValidObjectId ? subjectIdValue : '',
                subjectName: sm.subject?.subjectName || (isValidObjectId ? '' : subjectIdValue),
                theoryMaxMarks: sm.theoryMaxMarks ?? '',
                practicalMaxMarks: sm.practicalMaxMarks ?? '',
                internalMaxMarks: sm.internalMaxMarks ?? '',
                totalMaxMarks: sm.totalMaxMarks ?? '',
                passingMarks: sm.passingMarks ?? '',
                isOptional: sm.isOptional ?? false,
              };
            })
          : [defaultSubjectRow()]
      );
      setRules({
        weightagePercentage: initialData?.weightagePercentage ?? 100,
        allowGraceMarks: initialData?.allowGraceMarks ?? false,
        graceMarksLimit: initialData?.graceMarksLimit ?? 0,
      });
    }
  }, [open, initialData, currentYear]);

  const toggleClass = (id) => {
    setBasic((prev) => ({
      ...prev,
      applicableClasses: prev.applicableClasses.includes(id)
        ? prev.applicableClasses.filter((c) => c !== id)
        : [...prev.applicableClasses, id],
    }));
  };

  const addSubject = () => setSubjectRows((prev) => [...prev, defaultSubjectRow()]);
  const removeSubject = (tempId) =>
    setSubjectRows((prev) => prev.length > 1 ? prev.filter((r) => r._tempId !== tempId) : prev);
  const updateSubject = (updated) =>
    setSubjectRows((prev) => prev.map((r) => (r._tempId === updated._tempId ? updated : r)));

  const validateBasic = () => {
    const errs = {};
    if (!basic.examName.trim()) errs.examName = 'Exam name is required';
    if (!basic.academicYear.trim()) errs.academicYear = 'Academic year is required';
    if (!basic.examType) errs.examType = 'Exam type is required';
    return errs;
  };

  const validateSubjects = () => {
    const errs = {};
    // Filter subjectOptions to only include valid ObjectIds
    const validSubjectOptions = subjectOptions.filter(s => s._id && /^[0-9a-fA-F]{24}$/.test(s._id));
    
    subjectRows.forEach((row, i) => {
      // Check if we have a valid subject selection
      const hasValidSubjectId = row.subjectId && /^[0-9a-fA-F]{24}$/.test(row.subjectId);
      
      // If there are valid subject options available, user MUST select one
      if (validSubjectOptions.length > 0) {
        if (!hasValidSubjectId) {
          errs[`subject_${i}`] = 'Please select a subject from the dropdown';
        }
      } else {
        // If no valid subjects available, show error
        errs[`subject_${i}`] = 'No valid subjects available. Please create subjects first';
      }
      
      if (row.passingMarks === '' || row.passingMarks === undefined || row.passingMarks === null) errs[`passing_${i}`] = 'Passing marks required';
      if (row.totalMaxMarks === '' || row.totalMaxMarks === undefined || row.totalMaxMarks === null) errs[`total_${i}`] = 'Total marks required';
    });
    return errs;
  };

  const goNext = () => {
    if (step === 'basic') {
      const errs = validateBasic();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
      setStep('subjects');
    } else if (step === 'subjects') {
      const errs = validateSubjects();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
      setStep('rules');
    }
  };

  const goPrev = () => {
    if (step === 'subjects') setStep('basic');
    else if (step === 'rules') setStep('subjects');
  };

  const handleSubmit = () => {
    const errs = validateSubjects();
    if (Object.keys(errs).length) { setErrors(errs); setStep('subjects'); return; }

    // Filter subjectOptions to only include valid ObjectIds
    const validSubjectOptions = subjectOptions.filter(s => s._id && /^[0-9a-fA-F]{24}$/.test(s._id));

    const subjectMarkings = subjectRows.map((row) => {
      // Check if subjectId is a valid MongoDB ObjectId (24 hex characters)
      const isValidObjectId = row.subjectId && /^[0-9a-fA-F]{24}$/.test(row.subjectId);
      
      // Use subjectId only if it's a valid ObjectId
      // Backend requires ObjectId, so we MUST send a valid one
      let subjectValue;
      if (isValidObjectId) {
        subjectValue = row.subjectId;
      } else {
        // If no valid ObjectId, we cannot proceed - this should be caught by validation
        subjectValue = null;
      }
      
      return {
        subject: subjectValue,
        theoryMaxMarks: parseFloat(row.theoryMaxMarks) || 0,
        practicalMaxMarks: parseFloat(row.practicalMaxMarks) || 0,
        internalMaxMarks: parseFloat(row.internalMaxMarks) || 0,
        totalMaxMarks: parseFloat(row.totalMaxMarks) || 0,
        passingMarks: parseFloat(row.passingMarks) || 0,
        isOptional: row.isOptional,
      };
    });

    // Double-check that all subjects are valid ObjectIds before submitting
    const hasInvalidSubject = subjectMarkings.some(sm => !sm.subject);
    if (hasInvalidSubject) {
      setErrors({ general: 'Please select valid subjects for all rows' });
      setStep('subjects');
      return;
    }

    const payload = {
      ...basic,
      subjectMarkings,
      weightagePercentage: parseFloat(rules.weightagePercentage) || 100,
      allowGraceMarks: rules.allowGraceMarks,
      graceMarksLimit: parseFloat(rules.graceMarksLimit) || 0,
      gradingConfigRef: null,
    };

    onSubmit(payload);
  };

  const labelClass = `mb-1.5 block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-gray-500'}`;

  return (
    <PanelModal
      id="exam-structure-modal"
      title={mode === 'edit' ? 'Edit Exam Structure' : 'Create Exam Structure'}
      isVisible={open}
      onClose={onClose}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStep={step} darkMode={darkMode} />

        {/* STEP 1 — Basic Info */}
        {step === 'basic' && (
          <div className="space-y-4">
            <DashGrid cols={12} gap={4}>
              <DataField
                label="Exam Name *"
                icon={FileText}
                value={basic.examName}
                onChange={(e) => setBasic((p) => ({ ...p, examName: e.target.value }))}
                placeholder="e.g. Mid Term Examination"
                size={6}
              />
              {errors.examName && <p className="mt-1 text-xs text-red-500 col-span-12">{errors.examName}</p>}

              <SelectField
                label="Exam Type *"
                icon={Layers}
                value={basic.examType}
                onChange={(e) => setBasic((p) => ({ ...p, examType: e.target.value }))}
                size={6}
              >
                {EXAM_TYPES.map((t) => (
                  <Option key={t} value={t}>{t}</Option>
                ))}
              </SelectField>
              {errors.examType && <p className="mt-1 text-xs text-red-500 col-span-12">{errors.examType}</p>}

              <DataField
                label="Academic Year *"
                icon={CalendarDays}
                value={basic.academicYear}
                onChange={(e) => setBasic((p) => ({ ...p, academicYear: e.target.value }))}
                placeholder="e.g. 2025-26"
                size={6}
              />
              {errors.academicYear && <p className="mt-1 text-xs text-red-500 col-span-12">{errors.academicYear}</p>}

              <SelectField
                label="Term"
                icon={CalendarDays}
                value={basic.term}
                onChange={(e) => setBasic((p) => ({ ...p, term: e.target.value }))}
                size={6}
              >
                {TERM_OPTIONS.map((t) => (
                  <Option key={t.value} value={t.value}>{t.label}</Option>
                ))}
              </SelectField>
            </DashGrid>

            {/* Applicable Classes multi-select */}
            <div>
              <label className={labelClass}>
                Applicable Classes
              </label>
              {classOptions.length === 0 ? (
                <p className={`text-sm py-3 text-center rounded-xl border ${darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
                  No classes available
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {classOptions.map((cls) => {
                    const selected = basic.applicableClasses.includes(cls._id);
                    return (
                      <button
                        key={cls._id}
                        type="button"
                        onClick={() => toggleClass(cls._id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150
                          ${selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300 border-slate-600 hover:border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                          }`}
                      >
                        {cls.className}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 — Subjects & Marks */}
        {step === 'subjects' && (
          <div className="space-y-3">
            {/* Warning if no valid subjects available */}
            {(() => {
              const validSubjectOptions = subjectOptions.filter(s => s._id && /^[0-9a-fA-F]{24}$/.test(s._id));
              if (validSubjectOptions.length === 0) {
                return (
                  <div className={`rounded-xl border px-4 py-3 text-xs ${darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <p className="font-semibold">No valid subjects available</p>
                    <p className="mt-1">Please create subjects in the Academic section before creating exam structures.</p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex items-center justify-between">
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {subjectRows.length} subject{subjectRows.length !== 1 ? 's' : ''} added
              </p>
              <Button
                onClick={addSubject}
                variant="primary"
                text="Add Subject"
                icon={<Plus className="w-3.5 h-3.5" />}
                size="sm"
              />
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {subjectRows.map((row, idx) => (
                <SubjectRow
                  key={row._tempId}
                  row={row}
                  idx={idx}
                  onChange={updateSubject}
                  onRemove={removeSubject}
                  subjectOptions={subjectOptions}
                  darkMode={darkMode}
                />
              ))}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className={`rounded-xl border px-4 py-3 text-xs ${darkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {Object.values(errors).join(', ')}
              </div>
            )}

            {/* Totals summary bar */}
            <div className={`flex items-center gap-4 px-4 py-2.5 rounded-xl text-xs font-semibold
              ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-700'}`}>
              <span>Total Max Marks: {subjectRows.reduce((s, r) => s + (parseFloat(r.totalMaxMarks) || 0), 0)}</span>
              <span className={darkMode ? 'text-slate-600' : 'text-blue-300'}>|</span>
              <span>Total Passing Marks: {subjectRows.reduce((s, r) => s + (parseFloat(r.passingMarks) || 0), 0)}</span>
            </div>
          </div>
        )}

        {/* STEP 3 — Rules & Summary */}
        {step === 'rules' && (
          <div className="space-y-5">
            <DataField
              label="Weightage Percentage (%)"
              icon={Settings2}
              type="number"
              value={rules.weightagePercentage}
              onChange={(e) => setRules((p) => ({ ...p, weightagePercentage: e.target.value }))}
              placeholder="100"
            />

            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Allow Grace Marks</p>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Grant grace marks to borderline students</p>
              </div>
              <ToggleButton
                checked={rules.allowGraceMarks}
                onChange={(checked) => setRules((p) => ({ ...p, allowGraceMarks: checked }))}
              />
            </div>

            {rules.allowGraceMarks && (
              <DataField
                label="Grace Marks Limit"
                icon={Settings2}
                type="number"
                value={rules.graceMarksLimit}
                onChange={(e) => setRules((p) => ({ ...p, graceMarksLimit: e.target.value }))}
                placeholder="5"
              />
            )}

            {/* Summary card */}
            <div className={`rounded-xl border p-4 space-y-3 text-xs transition-colors duration-200
              ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'}`}>
              <p className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>📋 Review Summary</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ['Exam Name', basic.examName || '—'],
                  ['Type', basic.examType],
                  ['Academic Year', basic.academicYear || '—'],
                  ['Term', TERM_OPTIONS.find((t) => t.value === basic.term)?.label || '—'],
                  ['Classes', basic.applicableClasses.length ? `${basic.applicableClasses.length} selected` : 'All'],
                  ['Subjects', subjectRows.length],
                  ['Total Max Marks', subjectRows.reduce((s, r) => s + (parseFloat(r.totalMaxMarks) || 0), 0)],
                  ['Weightage', `${rules.weightagePercentage}%`],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className={`block ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>{label}</span>
                    <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div
          className="mt-6 flex items-center justify-between gap-3 pt-4 border-t"
          style={{ borderColor: darkMode ? '#334155' : '#f3f4f6' }}
        >
          <div>
            {step !== 'basic' && (
              <Button
                onClick={goPrev}
                variant="secondary"
                text="Back"
                icon={<ChevronLeft className="w-4 h-4" />}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="secondary"
              text="Cancel"
            />

            {step !== 'rules' ? (
              <Button
                onClick={goNext}
                variant="primary"
                text="Next"
                icon={<ChevronRight className="w-4 h-4" />}
              />
            ) : (
              <Button
                onClick={handleSubmit}
                variant="primary"
                text={mode === 'edit' ? 'Update Structure' : 'Create Structure'}
                icon={<CheckCircle2 className="w-4 h-4" />}
                loading={submitting}
              />
            )}
          </div>
        </div>
      </div>
    </PanelModal>
  );
};

export default ExamStructureFormModal;
